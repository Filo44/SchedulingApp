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

function recurse(timeTable : TimeTable, posLessonsDict : object, posClassrooms : string[], dayPos : number, periodPos : number, disallowedClassroomsPerTimeSlot : string[][][]) : TimeTable[]{
    if(timeTable.isFinished(dayPos, periodPos)){
        return [timeTable];
    }
    let solutions : TimeTable[] = [];
    let posLessons = Object.keys(posLessonsDict);
    let actualPosLessons = posLessons.filter(lesson=>!(disallowedClassroomsPerTimeSlot[dayPos][periodPos].includes(lesson)));

    actualPosLessons.forEach(chosenLesson=>{
        posClassrooms.forEach(chosenClassroom=>{
            if(timeTable.checkConstraints(chosenClassroom, chosenLesson, dayPos, periodPos)){
                //*Clones the >>
                let newDisallowedClassroomsPerTimeSlot = structuredClone(disallowedClassroomsPerTimeSlot);

                //*Disallowing the classroom chosen for the period chosen
                newDisallowedClassroomsPerTimeSlot[dayPos][periodPos].push(chosenClassroom)

                //*Clones the >>
                let newPosLessonsDict = structuredClone(posLessonsDict);
                
                //*Decrements the lesson
                newPosLessonsDict[chosenLesson] = newPosLessonsDict[chosenLesson] - 1;
                //*If there are no more periods to fill, the lesson is deleted from the object
                if(newPosLessonsDict[chosenLesson]<1){
                    delete newPosLessonsDict[chosenLesson];
                }

                //*Creates new timeslot with chosen params
                timeTable.days[dayPos].periods[periodPos] = new TimeSlot(chosenLesson, chosenClassroom)

                //TODO Figure out a way to move the next day and period calcs outside without breaking newTimeTable.days[daypos]...
                let newDayPos = dayPos;
                let newPeriodPos = periodPos;

                //*If we are on the last day
                if(periodPos + 1 >= timeTable.days[dayPos].amPeriods){
                    newDayPos++;
                    newPeriodPos = 0;
                }else{
                    newPeriodPos++;
                }

                let result = recurse(timeTable, newPosLessonsDict, posClassrooms, newDayPos, newPeriodPos, newDisallowedClassroomsPerTimeSlot);
                //* Results will always be an array, either of the timetable or the solutions. Could be empty though.
                solutions.push(...result);
            }
        })
    })
    return solutions;
}

function timeTablesRecurse(timeTables : TimeTable[], posLessonsDicts : object[], posClassrooms : string[], timeTablePos : number, disallowedClassroomsPerTimeSlot : string[][][]) : TimeTable[][]{

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
                newDisallowedClassroomsPerTimeSlot[day][period].push(classroom);
            }
        }
        
        let results = timeTablesRecurse(timeTables, posLessonsDicts, posClassrooms, newTimeTablePos, newDisallowedClassroomsPerTimeSlot);
        solutions.push(...results);
    })
    return solutions
}

async function getTables(days : number, periodsPerDay : number[], lessonsDicts : object[], possibleClassrooms : string[], paragraph : string, amTimetables : number) : Promise<TimeTable[][] | undefined>{
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
        let bannedClassrooms = generate2DArray(days, periodsPerDay);
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

async function entireProcess(days : number, periodsPerDay : number[], lessonsDicts : object[], possibleClassrooms : string[], constraintsParagraph : string, prioritiesParagraph : string){
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

function generate2DArray(amDays : number, amPeriods : number[]) {
    let res : string[][][] = [];
    for(let i=0; i<amDays; i++){
        let subArr : string[][] = []
        for(let j = 0; j<amPeriods[i]; j++){
            subArr.push([])
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