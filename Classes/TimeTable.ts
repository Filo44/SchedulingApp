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

    checkConstraints(){
        let matrix = this.turnIntoMatrix();
        for(let i = 0; i<this.constraints.length; i++){
            let constraint = this.constraints[i]
            try{
                let result = constraint(matrix);
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
        // console.log(`daypos: ${dayPos}`)
        // console.log(`periodpos: ${periodPos}`)
        // console.log(`this.days.length - 1 == dayPos: ${this.days.length - 1 == dayPos}`)
        // console.log(`periodPos > this.days[dayPos].amPeriods: ${periodPos > this.days[dayPos].amPeriods}`)
        // console.log(`days.length: ${this.days.length}`)
        // console.log(`(dayPos >= this.days.length): ${(dayPos >= this.days.length)}`)
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