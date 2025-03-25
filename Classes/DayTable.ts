import TimeSlot from "./TimeSlot";

export default class DayTable{
    amPeriods : number;
    periods : TimeSlot[];

    constructor(amPeriods : number, periods : TimeSlot[] = []){
        this.amPeriods = amPeriods;
        this.periods = periods;
    }

    clone() {
        return new DayTable(
            this.amPeriods,
            this.periods.map(p => p.clone()) // Deep copy periods
        );
    }
}

