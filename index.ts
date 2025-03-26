import TimeSlot from "./Classes/TimeSlot";
import DayTable from "./Classes/DayTable";
import TimeTable from "./Classes/TimeTable";
import {getFuncConstraints, getScoringFunctions} from "./Utils/getConstraints"


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

function setUpAllTables(amTables : number, amDays : number, constraints : CallableFunction[], periodsPerDay : number[]){
    let tables : TimeTable[] = [];
    for(let i = 0; i<amTables; i++){
        tables.push(setUpTable(amDays, constraints, periodsPerDay))
    }
    return tables;
}

function recurse(timeTables : TimeTable[], posLessonsDict : object, posClassrooms : string[], timeTablePos : number, dayPos : number, periodPos : number) : TimeTable[][]{
    if(timeTablePos>=timeTables.length){
        return [timeTables]
    }
    let timeTable = timeTables[timeTablePos];
    if(timeTable.isFinished(dayPos, periodPos)){
        return [timeTables];
    }
    let solutions : TimeTable[][] = [];
    let posLessons = Object.keys(posLessonsDict);
    // console.log(posLessonsDict)

    posLessons.forEach(chosenLesson=>{
        posClassrooms.forEach(chosenClassroom=>{
            //*Clones the >>
            let newPosLessonsDict = structuredClone(posLessonsDict);
            
            //*Decrements the lesson
            newPosLessonsDict[chosenLesson] = newPosLessonsDict[chosenLesson] - 1;
            //*If there are no more periods to fill, the lesson is deleted from the object
            if(newPosLessonsDict[chosenLesson]<1){
                delete newPosLessonsDict[chosenLesson];
            }

            //*Clones the timetables
            let newTimeTables = timeTables.map(currTimeTable=>currTimeTable.clone());

            //*Sets the newTimeTable
            let newTimeTable = newTimeTables[timeTablePos];

            //*Creates new timeslot with chosen params
            newTimeTable.days[dayPos].periods[periodPos] = new TimeSlot(chosenLesson, chosenClassroom)

            if(newTimeTable.checkConstraints()){
                //TODO Figure out a way to move the next day and period calcs outside without breaking newTimeTable.days[daypos]...
                let newDayPos = dayPos;
                let newPeriodPos = periodPos;
                let newTimeTablePos = timeTablePos;

                //*If we are on the last period
                if(periodPos + 1 >= newTimeTable.days[dayPos].amPeriods){
                    //*If we are on the last day
                    if(dayPos + 1 >= newTimeTable.days.length){
                        newTimeTablePos++;
                        newDayPos = 0;
                    }else{
                        newDayPos++;
                    }
                    newPeriodPos = 0;
                }else{
                    newPeriodPos++;
                }

                let result = recurse(newTimeTables, newPosLessonsDict, posClassrooms, newTimeTablePos, newDayPos, newPeriodPos);
                //* Results will always be an array, either of the timetable or the solutions. Could be empty though.
                solutions.push(...result);
            }
        })
    })
    return solutions;
}

async function getTables(timetables : number, days : number, periodsPerDay : number[], lessonsDict : object, possibleClassrooms : string[], paragraph : string) : Promise<TimeTable[][] | undefined>{

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
    
        let testTimeTables : TimeTable[] = setUpAllTables(timetables, days, constraints, periodsPerDay);
        let result = recurse(testTimeTables, lessonsDict, possibleClassrooms, 0, 0, 0);
        // console.log(result.map(solution=> solution.turnIntoMatrix()))
        return result;
    }
}

async function orderTables(possibleLessons : string[], possibleClassrooms : string[], paragraph : string, timeTables : TimeTable[][]) : Promise<TimeTable[] | undefined>{
    let prioritiesTexts = await getScoringFunctions(possibleLessons, possibleClassrooms, paragraph);

    if(prioritiesTexts){
        let prioritiesText = JSON.parse(prioritiesTexts)[0]
        console.log(`priority: ${prioritiesText}`)
        let callableFunction : CallableFunction = eval(`(${prioritiesText})`);
        let newTimeTables = timeTables.map(oneSettimeTables => timeTable.clone());
        newTimeTables.sort((a, b)=>{
            return callableFunction(b.turnIntoMatrix()) - callableFunction(a.turnIntoMatrix())
        })
        
        return newTimeTables;
    }
}

async function entireProcess(timetables : number, days : number, periodsPerDay : number[], lessonsDict : object, possibleClassrooms : string[], constraintsParagraph : string, prioritiesParagraph : string){
    let results = await getTables(timetables, days, periodsPerDay, lessonsDict, possibleClassrooms, constraintsParagraph);
    if(results){
        let newResults = await orderTables(Object.keys(lessonsDict), possibleClassrooms, prioritiesParagraph, results);
        return newResults;
    }
}

let results = await entireProcess(1, 2, [3,3], {"maths":4, "english":3, "physics":1}, ["s11","s10"], "Maths cannot be in s11",
     "Minimize travelling between different classrooms")
if(results){
    console.log(results[0].turnIntoMatrix())
}