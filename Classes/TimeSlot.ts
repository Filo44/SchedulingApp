export default class TimeSlot{
    lesson : string;
    classroom : string;

    constructor(lesson : string, classroom : string){
        this.lesson = lesson;
        this.classroom = classroom;
    }

    clone() {
        return new TimeSlot(this.lesson, this.classroom);
    }
}