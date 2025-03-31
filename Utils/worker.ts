import TimeSlot from "../Classes/TimeSlot";
import DayTable from "../Classes/DayTable";
import TimeTable, { ConstraintData } from "../Classes/TimeTable";
import {parentPort, workerData} from "worker_threads";

import {processState} from "../index";

let {currentStateString} = workerData;
let currentState = JSON.parse(currentStateString);

function calculateClassrooms(currentState : {
    timeTable: TimeTable;
    posLessonsDict: Record<string, number>;
    posClassrooms: string[];
    dayPos: number;
    periodPos: number;
    disallowedClassroomsPerTimeSlot: Set<string>[][];
}){
    const {
        timeTable,
        posLessonsDict,
        posClassrooms,
        dayPos,
        periodPos,
        disallowedClassroomsPerTimeSlot,
    } = currentState;

    if (timeTable.isFinished(dayPos, periodPos)) {
        parentPort?.postMessage({message: "addToSolutions", data: timeTable});
        return;
    }

    const lesson : string = timeTable.days[dayPos].periods[periodPos].lesson;

    for (const chosenClassroom of posClassrooms) {
        if (timeTable.checkOtherConstraints(chosenClassroom, lesson, dayPos, periodPos)) {
            processState(timeTable, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot, posLessonsDict, lesson, chosenClassroom, {push: (currentState)=>{
                parentPort?.postMessage({message: "spawnNewWorker", data: currentState});
            }})
        }
    }
}

calculateClassrooms(currentState);