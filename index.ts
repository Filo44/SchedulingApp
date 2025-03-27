import TimeSlot from "./Classes/TimeSlot";
import DayTable from "./Classes/DayTable";
import TimeTable from "./Classes/TimeTable";
import {getFuncConstraints, getScoringFunctions} from "./Utils/getConstraints"

function setUpTable(amDays : number, constraints : CallableFunction[], periodsPerDay : any){
    let days : DayTable[] = [];

    //*Creates all days
    for(let i = 0; i<amDays; i++){
        days.push(new DayTable(periodsPerDay[i]))
    }
    //*Create timetable with all days
    let currTimetable = new TimeTable(constraints, days)
    return currTimetable;
}

function recurse(timeTable : TimeTable, posLessonsDict : object, posClassrooms : string[], dayPos : number, periodPos : number, disallowedClassroomsPerTimeSlot : string[][][]) : TimeTable[]{
    if(timeTable.isFinished(dayPos, periodPos)){
        return [timeTable];
    }
    let solutions : TimeTable[] = [];
    let posLessons = Object.keys(posLessonsDict);
    let actualPosLessons = posLessons.filter(lesson=>!(disallowedClassroomsPerTimeSlot[dayPos][periodPos].includes(lesson)));
    // console.log(posLessonsDict)

    actualPosLessons.forEach(chosenLesson=>{
        posClassrooms.forEach(chosenClassroom=>{
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

            //*Clones the timetable
            let newTimeTable = timeTable.clone();

            //*Creates new timeslot with chosen params
            newTimeTable.days[dayPos].periods[periodPos] = new TimeSlot(chosenLesson, chosenClassroom)

            if(newTimeTable.checkConstraints()){
                //TODO Figure out a way to move the next day and period calcs outside without breaking newTimeTable.days[daypos]...
                let newDayPos = dayPos;
                let newPeriodPos = periodPos;

                //*If we are on the last day
                if(periodPos + 1 >= newTimeTable.days[dayPos].amPeriods){
                    newDayPos++;
                    newPeriodPos = 0;
                }else{
                    newPeriodPos++;
                }

                let result = recurse(newTimeTable, newPosLessonsDict, posClassrooms, newDayPos, newPeriodPos, newDisallowedClassroomsPerTimeSlot);
                //* Results will always be an array, either of the timetable or the solutions. Could be empty though.
                solutions.push(...result);
            }
        })
    })
    return solutions;
}

async function getTables(days : number, periodsPerDay : number[], lessonsDict : object, possibleClassrooms : string[], paragraph : string, amTimetables : number) : Promise<TimeTable[] | undefined>{

    let possibleLessons = Object.keys(lessonsDict)
    let constraintsText = await getFuncConstraints(possibleLessons, possibleClassrooms, paragraph);

    if(constraintsText){
        let constraintsArr = JSON.parse(constraintsText);
        let constraints : CallableFunction[] = []
        for(let i=0; i<constraintsArr.length; i++){
            let constraint = constraintsArr[i];
            console.log(`constraint: ${constraint}`)
            let callableFunction : CallableFunction = eval(`(${constraint})`);
            constraints.push(callableFunction);
        }
    
        let testTimeTable = setUpTable(days, constraints, periodsPerDay);
        let bannedClassrooms = generate2DArray(days, periodsPerDay);
        let result = recurse(testTimeTable, lessonsDict, possibleClassrooms, 0, 0, bannedClassrooms);
        // console.log(result.map(solution=> solution.turnIntoMatrix()))
        return result;
    }
}

async function orderTables(possibleLessons : string[], possibleClassrooms : string[], paragraph : string, timeTables : TimeTable[]) : Promise<TimeTable[] | undefined>{
    let prioritiesTexts = await getScoringFunctions(possibleLessons, possibleClassrooms, paragraph);

    if(prioritiesTexts){
        let prioritiesText = JSON.parse(prioritiesTexts)[0]
        console.log(`priority: ${prioritiesText}`)
        let callableFunction : CallableFunction = eval(`(${prioritiesText})`);
        let newTimeTables = timeTables.map(timeTable => timeTable.clone());
        newTimeTables.sort((a, b)=>{
            return callableFunction(b.turnIntoMatrix()) - callableFunction(a.turnIntoMatrix())
        })
        
        return newTimeTables;
    }
}

async function entireProcess(days : number, periodsPerDay : number[], lessonsDict : object, possibleClassrooms : string[], constraintsParagraph : string, prioritiesParagraph : string){
    let results = await getTables(days, periodsPerDay, lessonsDict, possibleClassrooms, constraintsParagraph);
    if(results){
        let newResults = await orderTables(Object.keys(lessonsDict), possibleClassrooms, prioritiesParagraph, results);
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

// let results = await entireProcess(2, [3,3], {"maths":4, "english":3, "physics":1}, ["s11","s10"], "Maths cannot be in s11",
//      "Minimize travelling between different classrooms")
// if(results){
//     console.log(results[0].turnIntoMatrix())
// }