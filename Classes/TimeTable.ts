import DayTable from "./DayTable";
import TimeSlot from "./TimeSlot";
import util from "util"; // Only needed in Node.js

export default class TimeTable{
    days : DayTable[];
    constraints : CallableFunction[];

    constructor(constraints : CallableFunction[], days : DayTable[] = []){
        this.constraints = constraints;
        this.days = days;
    }

    checkConstraints(chosenClassroom : string, chosenLesson : string, dayPos : number, periodPos : number){
        //NOTE: No changes to the matrix affect the original timetable as the matrix has NO reference to the original timetable. 

        let matrix = this.turnIntoMatrix();
        matrix[dayPos][periodPos] = new TimeSlot(chosenLesson, chosenClassroom);
        for(let i = 0; i<this.constraints.length; i++){
            let constraint = this.constraints[i]
            try{
                let result = constraint(matrix, chosenClassroom, chosenLesson, dayPos, periodPos);
                if(result==false){
                    return false;
                }
            }
            catch(e){
                throw new Error(`Unable to run condition, error: ${e}`)
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