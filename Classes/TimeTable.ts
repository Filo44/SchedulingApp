import DayTable from "./DayTable";
import TimeSlot from "./TimeSlot";
import util from "util"; // Only needed in Node.js

export type ConstraintData = {
    function : CallableFunction,
    usesClassroom : boolean,
    usesLesson : boolean
}

export default class TimeTable{
    days : DayTable[];
    constraints : ConstraintData[];
    lessonOnlyConstraints : ConstraintData[] = [];
    otherConstraints : ConstraintData[] = [];
    dividedConstraints : boolean = false;

    constructor(constraints : ConstraintData[], days : DayTable[] = []){
        this.constraints = constraints;
        this.days = days;
    }

    divideConstraints(){
        if(!this.dividedConstraints){
            this.constraints.forEach(constraint => {
                if(constraint.usesLesson && !constraint.usesClassroom){
                    this.lessonOnlyConstraints.push(constraint)
                }else{
                    this.otherConstraints.push(constraint)
                }
            })
            this.dividedConstraints = true;
        }
    }

    checkLessonOnlyConstraints(chosenLesson : string, dayPos : number, periodPos : number){
        this.divideConstraints();
        return this.checkConstraints("", chosenLesson, dayPos, periodPos, this.lessonOnlyConstraints)
    }

    checkOtherConstraints(chosenClassroom : string, chosenLesson : string, dayPos : number, periodPos : number){
        this.divideConstraints();
        return this.checkConstraints(chosenClassroom, chosenLesson, dayPos, periodPos, this.otherConstraints)
    }

    checkConstraints(chosenClassroom : string, chosenLesson : string, dayPos : number, periodPos : number, constraints : ConstraintData[]){
        let matrix = this.turnIntoMatrix();
        for(let i = 0; i<constraints.length; i++){
            let constraint = constraints[i]
            try{
                let result = constraint.function(matrix, chosenClassroom, chosenLesson, dayPos, periodPos);
                if(result==false){
                    return false;
                }
            }
            catch(e){
                console.log(`Unable to run condition, error: ${e}`)
            }
        }
        return true;
    }

    turnIntoMatrix(){
        let arr : TimeSlot[][] = []
        this.days.forEach(day=>{
            arr.push(structuredClone(day.periods));
        })
        return arr;
    }

    isFinished(dayPos : number, periodPos : number){
        return (dayPos >= this.days.length)
    }

    [util.inspect.custom](){
        return JSON.stringify(this.turnIntoMatrix());
    }

    toString(){
        return JSON.stringify(this.turnIntoMatrix())
    }

    clone() {
        return new TimeTable(
            [...this.constraints], // Copy constraints (shallow copy)
            this.days.map(day => day.clone()) // Deep copy days
        );
    }
}