import TimeSlot from "../Classes/TimeSlot";
import DayTable from "../Classes/DayTable";
import TimeTable, { ConstraintData } from "../Classes/TimeTable";
import {parentPort, workerData} from "worker_threads";

import {processState} from "../index";

let {currentStateString, stringConstraints, stringableTimeTable} = workerData;
// console.log(currentStateString)
let currentState = JSON.parse(currentStateString);
let lessonOnlyConstraints : ConstraintData[] = [];
let otherConstraints : ConstraintData[] = [];
let dividedConstraints : boolean = false;

function calculateClassrooms(currentState : {
    timeTable: TimeTable;
    posLessonsDict: Record<string, number>;
    posClassrooms: string[];
    dayPos: number;
    periodPos: number;
    disallowedClassroomsPerTimeSlot: Set<string>[][];
}){
    const {
        posLessonsDict,
        posClassrooms,
        dayPos,
        periodPos,
        disallowedClassroomsPerTimeSlot,
    } = currentState;
    
    // console.log("HELLOO1!")
    let constraints = stringConstraints.map(constraint=>{
        let callableFunction = eval(`(${constraint.function})`);
        return {
            function: callableFunction,
            usesClassroom: constraint.usesClassroom,
            usesLesson: constraint.usesLesson
        }
    })
    let timeTable = stringableTimeTable;
    timeTable.constraints = constraints;

    console.log(timeTable)
    // console.log("HELLOO!")

    if (isFinished(dayPos, periodPos, timeTable)) {
        parentPort?.postMessage({message: "addToSolutions", data: timeTable});
        return;
    }

    const lesson : string = timeTable.days[dayPos].periods[periodPos].lesson;

    if(!dividedConstraints){
        divideConstraints(timeTable.constraints);
    }
    for (const chosenClassroom of posClassrooms) {
        if (checkOtherConstraints(chosenClassroom, lesson, dayPos, periodPos)) {
            processState(timeTable, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot, posLessonsDict, lesson, chosenClassroom, {push: (currentState)=>{
                parentPort?.postMessage({message: "spawnNewWorker", data: currentState});
            }})
        }
    }
}

function isFinished(dayPos : number, periodPos : number, timeTable : TimeTable){
    return (dayPos >= timeTable.days.length)
}

function divideConstraints(constraints : ConstraintData[]){
    constraints.forEach(constraint => {
        if(constraint.usesClassroom){
            otherConstraints.push(constraint)
        }
    })
    dividedConstraints = true;
}

function checkOtherConstraints(chosenClassroom : string, chosenLesson : string, dayPos : number, periodPos : number){
    return otherConstraints.every(constraint => constraint.function(chosenClassroom, chosenLesson, dayPos, periodPos))
}

function processState(timeTable: TimeTable, posClassrooms: string[], dayPos: number, periodPos: number, disallowedClassroomsPerTimeSlot: Set<string>[][], posLessonsDict : Record<string, number>, chosenLesson : string, chosenClassroom: string | null, stack){
    const newTimeTable = timeTable.clone(); // Important: Clone *before* modifying
    newTimeTable.days[dayPos].periods[periodPos] = new TimeSlot(
        chosenLesson,
        chosenClassroom
    );
    
    let newDisallowedClassroomsPerTimeSlot = disallowedClassroomsPerTimeSlot.map((day, dayIndex) => {
        if (dayIndex === dayPos) {
            return day.map((period, periodIndex) => {
                if (periodIndex === periodPos) {
                    return new Set(period); // Only clone the set we'll modify
                }
                return period; // Reuse other periods in this day
            });
        }
        return day; // Reuse other days completely
    });


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


calculateClassrooms(currentState);