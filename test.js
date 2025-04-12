function(timetableMatrix, chosenClassroom, chosenLesson, dayPos, periodPos) {
    if (periodPos > 1 && timetableMatrix[dayPos].length > periodPos && timetableMatrix[dayPos][periodPos - 1] && timetableMatrix[dayPos][periodPos - 1].classroom === chosenClassroom && timetableMatrix[dayPos][periodPos - 2] && timetableMatrix[dayPos][periodPos - 2].classroom === chosenClassroom) {
        return false;
    }
    if (periodPos < timetableMatrix[dayPos].length - 2 && timetableMatrix[dayPos][periodPos + 1] && timetableMatrix[dayPos][periodPos + 1].classroom === chosenClassroom && timetableMatrix[dayPos][periodPos + 2] && timetableMatrix[dayPos][periodPos + 2].classroom === chosenClassroom) {
        return false;
    }
    if (periodPos > 0 && periodPos < timetableMatrix[dayPos].length - 1 && timetableMatrix[dayPos][periodPos - 1] && timetableMatrix[dayPos][periodPos - 1].classroom === chosenClassroom && timetableMatrix[dayPos][periodPos + 1] && timetableMatrix[dayPos][periodPos + 1].classroom === chosenClassroom) {
        return false;
    }
    return true;
}