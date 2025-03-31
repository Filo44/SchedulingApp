export default class TimeSlot{
    lesson : string;
    classroom : string | null;

    constructor(lesson : string, classroom : string | null){
        this.lesson = lesson;
        this.classroom = classroom;
    }
    
    toString(){
        return `{lesson: ${this.lesson}, classroom: ${this.classroom}}`
    }

    clone() {
        return new TimeSlot(this.lesson, this.classroom);
    }
}