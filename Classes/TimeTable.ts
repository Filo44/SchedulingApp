import DayTable from "./DayTable";

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
        let arr = []
        this.days.forEach(day=>{
            arr.push(structuredClone(day.periods));
        })
        return arr;
    }

    isFinished(dayPos : number, periodPos : number){
        return (this.days.length - 1 == dayPos && this.days[dayPos].periods.length > this.days[dayPos].amPeriods)
    }

    clone() {
        return new TimeTable(
            [...this.constraints], // Copy constraints (shallow copy)
            this.days.map(day => day.clone()) // Deep copy days
        );
    }
}