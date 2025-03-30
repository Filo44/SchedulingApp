import TimeSlot from "./Classes/TimeSlot";
import DayTable from "./Classes/DayTable";
import TimeTable from "./Classes/TimeTable";
import getEval from "./Utils/getEvals";
import {getFuncConstraints, getScoringFunctions} from "./Utils/getConstraints"

let nextTimeTableTT : Record<string, TimeTable[]>;

function setUpTable(amDays : number, constraints : CallableFunction[], periodsPerDay : number[]){
    let days : DayTable[] = [];

    //*Creates all days
    for(let i = 0; i<amDays; i++){
        days.push(new DayTable(periodsPerDay[i]))
    }
    //*Create timetable with all days
    let currTimetable = new TimeTable(constraints, days)
    return currTimetable;
}

function setUpTimeTables(amTimeTables : number, amDays : number, constraints : CallableFunction[], periodsPerDay : number[]){
    let timeTables : TimeTable[] = [];
    for(let i = 0; i<amTimeTables; i++){
        timeTables.push(setUpTable(amDays, constraints, periodsPerDay));
    }
    return timeTables;
}

function recurse(
    timeTable: TimeTable,
    posLessonsDict: Record<string, number>,
    posClassrooms: string[],
    dayPos: number,
    periodPos: number,
    disallowedClassroomsPerTimeSlot: Set<string>[][]
): TimeTable[] {
    const solutions: TimeTable[] = [];
    const stack: {
        timeTable: TimeTable;
        posLessonsDict: Record<string, number>;
        posClassrooms: string[];
        dayPos: number;
        periodPos: number;
        disallowedClassroomsPerTimeSlot: Set<string>[][];
    }[] = [{ timeTable, posLessonsDict, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot }]; // Initial state

    const secondStack : {
        timeTable: TimeTable;
        posLessonsDict: Record<string, number>;
        posClassrooms: string[];
        dayPos: number;
        periodPos: number;
        disallowedClassroomsPerTimeSlot: Set<string>[][];
    }[] = [];

    //*Calculating lessons
    while (stack.length > 0) {
        const currentState = stack.pop()!; // '!' because we know stack.length > 0
        const {
            timeTable,
            posLessonsDict,
            posClassrooms,
            dayPos,
            periodPos,
            disallowedClassroomsPerTimeSlot,
        } = currentState;

        if (timeTable.isFinished(dayPos, periodPos)) {
            secondStack.push(currentState);
            continue; // Go to the next iteration of the while loop
        }

        const actualPosLessons = Object.keys(posLessonsDict).filter(
            (lesson) => !disallowedClassroomsPerTimeSlot[dayPos][periodPos].has(lesson)
        );

        for (const chosenLesson of actualPosLessons) {
            if (timeTable.checkLessonOnlyConstraints(chosenLesson, dayPos, periodPos)) {
                processState(timeTable, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot, posLessonsDict, chosenLesson, null, stack)
            }
        }
    }

    //*Calculating classrooms
    while (secondStack.length > 0) {
        console.log("hello")
        const currentState = secondStack.pop()!; // '!' because we know stack.length > 0
        let {
            timeTable,
            posLessonsDict,
            posClassrooms,
            dayPos,
            periodPos,
            disallowedClassroomsPerTimeSlot,
        } = currentState;
        dayPos = 0;
        periodPos = 0;

        if (timeTable.isFinished(dayPos, periodPos)) {
            solutions.push(timeTable);
            console.log("finished")
            continue; // Go to the next iteration of the while loop
        }

        const lesson : string = timeTable[dayPos][periodPos].lesson;

        for (const chosenClassroom of posClassrooms) {
            if (timeTable.checkOtherConstraints(chosenClassroom, lesson, dayPos, periodPos)) {
                processState(timeTable, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot, posLessonsDict, lesson, chosenClassroom, secondStack)
            }
        }
    }
    return solutions;
}

function processState(timeTable: TimeTable, posClassrooms: string[], dayPos: number, periodPos: number, disallowedClassroomsPerTimeSlot: Set<string>[][], posLessonsDict : Record<string, number>, chosenLesson : string, chosenClassroom: string | null, stack){
    const newTimeTable = timeTable.clone(); // Important: Clone *before* modifying
    newTimeTable.days[dayPos].periods[periodPos] = new TimeSlot(
        chosenLesson,
        chosenClassroom
    );
    
    let newDisallowedClassroomsPerTimeSlot = disallowedClassroomsPerTimeSlot.map((day) =>
        day.map((period) => new Set(period))
    );

    let newPosLessonsDict = { ...posLessonsDict }; // Shallow copy is usually sufficient here
    
    if(chosenClassroom){
        newDisallowedClassroomsPerTimeSlot[dayPos][periodPos].add(chosenClassroom);
    }else{
        newPosLessonsDict[chosenLesson]--;
        if (newPosLessonsDict[chosenLesson] < 1) {
            delete newPosLessonsDict[chosenLesson];
        }
    }


    let newDayPos = dayPos;
    let newPeriodPos = periodPos;

    if (periodPos + 1 >= newTimeTable.days[dayPos].amPeriods) {
        newDayPos++;
        newPeriodPos = 0;
    } else {
        newPeriodPos++;
    }
    // Push the *new* state onto the stack
    stack.push({
        timeTable: newTimeTable,
        posLessonsDict: newPosLessonsDict,
        posClassrooms: posClassrooms,
        dayPos: newDayPos,
        periodPos: newPeriodPos,
        disallowedClassroomsPerTimeSlot: newDisallowedClassroomsPerTimeSlot,
    });
}

function timeTablesRecurse(timeTables : TimeTable[], posLessonsDicts : Record<string, number>[], posClassrooms : string[], timeTablePos : number, disallowedClassroomsPerTimeSlot : Set<string>[][]) : TimeTable[][]{

    //*Checks if on the last (As we then increment it later before calling recurse)
    if(timeTablePos >= timeTables.length){
        return [timeTables];
    }


    let posLessonsDict = posLessonsDicts[timeTablePos]

    //*This will be an array of the possible timeTable combinations (ie possible "timeTables" var)
    let solutions : TimeTable[][] = [];
    
    let posTimeTables : TimeTable[];
    let key = JSON.stringify(posLessonsDict) + JSON.stringify(disallowedClassroomsPerTimeSlot);
    let val = nextTimeTableTT[key];
    if(val){
        posTimeTables = val.map(tt=>tt.clone());
    }else{
        //*Get the next possible timeTable
        posTimeTables = recurse(timeTables[timeTablePos], posLessonsDict, posClassrooms, 0, 0, disallowedClassroomsPerTimeSlot)
        nextTimeTableTT[key] = posTimeTables;
    }

    //*Increment the timeTablePos
    let newTimeTablePos = timeTablePos + 1;

    //*For each possible table...
    posTimeTables.forEach(posTimeTable=>{
        
        //*We add it to the array of tables
        timeTables[timeTablePos] = posTimeTable;

        //*We calculate the NOW disallowed classroomsPerTimeSlot
        let timeTableMatrix = posTimeTable.turnIntoMatrix();
        let newDisallowedClassroomsPerTimeSlot = structuredClone(disallowedClassroomsPerTimeSlot);
        
        for(let day = 0; day<timeTableMatrix.length; day++){
            for(let period = 0; period<timeTableMatrix[day].length; period++){
                let classroom = timeTableMatrix[day][period].classroom;
                newDisallowedClassroomsPerTimeSlot[day][period].add(classroom);
            }
        }
        
        let results = timeTablesRecurse(timeTables, posLessonsDicts, posClassrooms, newTimeTablePos, newDisallowedClassroomsPerTimeSlot);
        solutions.push(...results);
    })
    return solutions
}

async function getTables(days : number, periodsPerDay : number[], lessonsDicts : Record<string, number>[], possibleClassrooms : string[], paragraph : string, amTimetables : number) : Promise<TimeTable[][] | undefined>{
    //*Reset the transposition table
    nextTimeTableTT = {}

    let possibleLessons = getAllKeys(lessonsDicts)
    let constraintsText = await getFuncConstraints(possibleLessons, possibleClassrooms, paragraph);

    if(constraintsText){
        let constraintsArr = JSON.parse(constraintsText);
        let constraints : CallableFunction[] = []
        for(let i=0; i<constraintsArr.length; i++){
            let constraint = constraintsArr[i];
            console.log(`constraint: ${constraint}`)
            let callableFunction : CallableFunction = getEval(`(${constraint})`);
            constraints.push(callableFunction);
        }

        let results : TimeTable[][] = []
        let bannedClassrooms = generate2DSet(days, periodsPerDay);
        let blankTimeTables = setUpTimeTables(amTimetables, days, constraints, periodsPerDay)
        results = timeTablesRecurse(blankTimeTables, lessonsDicts, possibleClassrooms, 0, bannedClassrooms)
        console.log(results)

        return results;
    }
}

async function orderTables(possibleLessons : string[], possibleClassrooms : string[], paragraph : string, timeTables : TimeTable[][]) : Promise<TimeTable[][] | undefined>{
    let prioritiesTexts = await getScoringFunctions(possibleLessons, possibleClassrooms, paragraph);

    if(prioritiesTexts){
        let prioritiesText = JSON.parse(prioritiesTexts)[0]
        console.log(`priority: ${prioritiesText}`)
        let callableFunction : CallableFunction = getEval(`(${prioritiesText})`);
        let newTimeTables = timeTables.map(timeTables => {
            return timeTables.map(timeTable => timeTable.clone())
        });
        newTimeTables.sort((a, b)=>{
            let scoreA = 0;
            let scoreB = 0;

            a.forEach(timeTable => {
                scoreA += callableFunction(timeTable.turnIntoMatrix())
            })
            b.forEach(timeTable => {
                scoreB += callableFunction(timeTable.turnIntoMatrix())
            })
            return scoreB - scoreA;
        })
        
        return newTimeTables;
    }
}

async function entireProcess(days : number, periodsPerDay : number[], lessonsDicts : Record<string, number>[], possibleClassrooms : string[], constraintsParagraph : string, prioritiesParagraph : string){
    if(!checkCanFinish(periodsPerDay, lessonsDicts)){
        throw new Error("lessonsDicts adds up to less than the mandated periods per day!")
    }
    let amTimeTables = lessonsDicts.length;
    let results = await getTables(days, periodsPerDay, lessonsDicts, possibleClassrooms, constraintsParagraph, amTimeTables);
    return results
    if(results){
        let newResults = await orderTables(getAllKeys(lessonsDicts), possibleClassrooms, prioritiesParagraph, results);
        return newResults;
    }
}

function generate2DSet(amDays : number, amPeriods : number[]) {
    let res : Set<string>[][] = [];
    for(let i=0; i<amDays; i++){
        let subArr : Set<string>[] = []
        for(let j = 0; j<amPeriods[i]; j++){
            let emptySet : Set<string> = new Set<string>();
            subArr.push(emptySet)
        }
        res.push(subArr);
    }
    return res
}

function getAllKeys(arrayOfObjects : object[]){
    let keys : Record<string, boolean> = {};
    arrayOfObjects.forEach(object=>{
        Object.keys(object).forEach(key=>{
            keys[key] = true;
        })
    })
    return Object.keys(keys)
}

function checkCanFinish(periodsPerDay : number[], lessonsDicts : object[]){
    let periodsPerTimeTable = periodsPerDay.reduce((partialSum, a) => partialSum + a, 0);
    for(let i = 0; i < periodsPerDay.length; i++){
        let lessonsDictThisDay = lessonsDicts[i];
        
        let values = Object.values(lessonsDictThisDay)
        let sum = values.reduce((partialSum, a) => partialSum + a, 0);

        if(sum<periodsPerTimeTable){
            return false;
        }
    }
    return true;
}

let results = await entireProcess(2, [3,3], [{"maths": 3, "english" : 3}, {"maths":2, "english": 2, "physics":2}], ["s11", "s10"], 
    "Maths can't be in s11",
     "Minimize travelling between different classrooms")
if(results){
    console.log(results[0])
}