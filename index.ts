import TimeSlot from "./Classes/TimeSlot";
import DayTable from "./Classes/DayTable";
import TimeTable from "./Classes/TimeTable";
import getFuncConstraints from "./Utils/getConstraints"



// let constraints : CallableFunction[] = [(lessonMatrix : TimeSlot[][])=>{

//     for(let i = 0; i<lessonMatrix.length; i++){
//         let day = lessonMatrix[i];
//         for(let j = 0; j<day.length; j++){
//             let timeslot = day[j];

//             // console.log("Lesson: ", timeslot.lesson)
//             // console.log("Classroom: ", timeslot.classroom)

//             if(timeslot.lesson == "maths" && timeslot.classroom == "s11"){
//                 return false;
//             }
//         }
//     }
//     return true;
// }]

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

function recurse(timeTable : TimeTable, posLessons : string[], posClassrooms : string[], dayPos : number, periodPos : number) : TimeTable[]{
    if(timeTable.isFinished(dayPos, periodPos)){
        return [timeTable];
    }
    let solutions : TimeTable[] = [];

    posLessons.forEach(chosenLesson=>{
        posClassrooms.forEach(chosenClassroom=>{
            //*Clones the timetable
            let newTimeTable = timeTable.clone();

            //*Creates new timeslot with chosen params
            newTimeTable.days[dayPos].periods[periodPos] = new TimeSlot(chosenLesson, chosenClassroom)

            if(newTimeTable.checkConstraints()){
                let newDayPos = dayPos;
                let newPeriodPos = periodPos;

                //*If we are on the last day
                if( newTimeTable.days[dayPos].amPeriods == periodPos-1){
                    newDayPos++;
                    newPeriodPos = 0;
                }else{
                    newPeriodPos++;
                }

                let result = recurse(newTimeTable, posLessons, posClassrooms, newDayPos, newPeriodPos);
                //* Results will always be an array, either of the timetable or the solutions. Could be empty though.
                solutions.push(...result);
            }
        })
    })
    return solutions;
}

async function getTables(days : number, periodsPerDay : number[], possibleLessons : string[], possibleClassrooms : string[], paragraph : string) : Promise<TimeTable[] | undefined>{
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
        let result = recurse(testTimeTable, possibleLessons, possibleClassrooms, 0, 0);
        console.log(result.map(solution=> solution.turnIntoMatrix()))
        return result;
    }
}

let results = await getTables(2, [2,2], ["maths", "english", "physics"], ["s10","s11"], "The maths lesson must never be in s11");
if(results && results[0]){
    console.log(results[0].turnIntoMatrix())
}