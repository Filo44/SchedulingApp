import TimeSlot from "./Classes/TimeSlot";
import DayTable from "./Classes/DayTable";
import TimeTable from "./Classes/TimeTable";
import getEval from "./Utils/getEvals";
import {getFuncConstraints, getScoringFunctions} from "./Utils/getConstraints"

const elitismCount = 3;
const mutationsPerSet = 10;

function setUpTable(amDays : number, constraints : CallableFunction[], periodsPerDay : number[]){
    let days : DayTable[] = [];

    //*Creates all days
    for(let i = 0; i<amDays; i++){
        days.push(new DayTable(periodsPerDay[i]))
        console.log("Day genned:", days[i])
    }
    //*Create timetable with all days
    let currTimetable = new TimeTable(constraints, days)
    return currTimetable;
}

function setUpTimeTables(amTimeTables : number, amDays : number, constraints : CallableFunction[], periodsPerDay : number[]){
    let timeTables : TimeTable[] = [];
    for(let i = 0; i<amTimeTables; i++){
        timeTables.push(setUpTable(amDays, constraints, periodsPerDay));
        console.log("Table genned:", setUpTable(amDays, constraints, periodsPerDay))
    }
    return timeTables;
}

function generate2DSet(amDays : number, amPeriods : number[]) {
    let res : Set<string>[][] = [];
    for(let i=0; i<amDays; i++){
        let subArr : Set<string>[] = []
        for(let j = 0; j<amPeriods[i]; j++){
            let emptySet : Set<string> = new Set<string>();
            subArr.push(emptySet)
        }
        res.push(subArr);
    }
    return res
}

function getAllKeys(arrayOfObjects : object[]){
    let keys : Record<string, boolean> = {};
    arrayOfObjects.forEach(object=>{
        Object.keys(object).forEach(key=>{
            keys[key] = true;
        })
    })
    return Object.keys(keys)
}

function checkCanFinish(periodsPerDay : number[], lessonsDicts : object[]){
    let periodsPerTimeTable = periodsPerDay.reduce((partialSum, a) => partialSum + a, 0);
    let amountOfTimeTables = lessonsDicts.length;

    for(let i = 0; i < amountOfTimeTables; i++){
        let lessonsDictThisDay = lessonsDicts[i];
        
        let values = Object.values(lessonsDictThisDay)
        let sum = values.reduce((partialSum, a) => partialSum + a, 0);

        if(sum<periodsPerTimeTable){
            return false;
        }
    }
    return true;
}

function genOneRandTimeTable(
    timeTable: TimeTable,
    posLessonsDict: Record<string, number>,
    posClassrooms: string[],
    dayPos: number,
    periodPos: number,
    disallowedClassroomsPerTimeSlot: Set<string>[][]
) : TimeTable{
    let solution : TimeTable;
    let state: {
        timeTable: TimeTable;
        posLessonsDict: Record<string, number>;
        posClassrooms: string[];
        dayPos: number;
        periodPos: number;
        disallowedClassroomsPerTimeSlot: Set<string>[][];
    }= { timeTable, posLessonsDict, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot }; // Initial state

    let attempts = 0;
    const MAX_ATTEMPTS = 10000; // Prevent infinite loops

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        
        const {
            timeTable,
            posLessonsDict,
            posClassrooms,
            dayPos,
            periodPos,
            disallowedClassroomsPerTimeSlot,
        } = state;

        // console.log(`state: ${JSON.stringify(state)}`)

        if (timeTable.isFinished(dayPos, periodPos)) {
            solution = timeTable;
            break;
        }

        const actualPosLessons = Object.keys(posLessonsDict).filter(
            (lesson) => posLessonsDict[lesson] > 0 && !disallowedClassroomsPerTimeSlot[dayPos][periodPos].has(lesson)
        );
        // console.log(`actualPosLessons: ${JSON.stringify(actualPosLessons)}`)

        const chosenLesson = actualPosLessons[Math.floor(Math.random() * actualPosLessons.length)];
        const chosenClassroom = posClassrooms[Math.floor(Math.random() * posClassrooms.length)];
        // console.log(`chosenLesson: ${chosenLesson}`)
        // console.log(`chosenClassroom: ${chosenClassroom}`)

        console.log("--------------------------------")
        console.log("timeTable: ", timeTable.turnIntoMatrix())
        if (timeTable.checkConstraints(chosenClassroom, chosenLesson, dayPos, periodPos)) {
            state = processState(timeTable, posClassrooms, dayPos, periodPos, disallowedClassroomsPerTimeSlot, posLessonsDict, chosenLesson, chosenClassroom)
        }
    }
    
    if (attempts >= MAX_ATTEMPTS) {
        throw new Error("Maximum attempts reached in genOneRandTimeTable. Returning the best solution found so far.");
    }
    
    return solution!;
}

function processState(timeTable: TimeTable, posClassrooms: string[], dayPos: number, periodPos: number, disallowedClassroomsPerTimeSlot: Set<string>[][], posLessonsDict : Record<string, number>, chosenLesson : string, chosenClassroom: string){
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
    return {
        timeTable: newTimeTable,
        posLessonsDict: newPosLessonsDict,
        posClassrooms: posClassrooms,
        dayPos: newDayPos,
        periodPos: newPeriodPos,
        disallowedClassroomsPerTimeSlot: newDisallowedClassroomsPerTimeSlot,
    };
}


function generateNRanTableSets(
    n : number,
    amDays : number, 
    periodsPerDay : number[], 
    timeTablesPerSet : number, 
    constraints : CallableFunction[], 
    posLessonsDicts : Record<string, number>[], 
    posClassrooms : string[],
    disallowedClassroomsPerTimeSlot : Set<string>[][]
) : TimeTable[][]{
    let res : TimeTable[][] = []
    for(let i = 0; i<n; i++){
        let blankTimeTables = setUpTimeTables(timeTablesPerSet, amDays, constraints, periodsPerDay)
        console.log("blankTimeTables: ", blankTimeTables)
        res.push(genOneRandSetOfTimeTables(blankTimeTables, posLessonsDicts, posClassrooms, 0, disallowedClassroomsPerTimeSlot))
    }
    // console.log(`random sets of timeTables: ${JSON.stringify(res)}`)
    return res
}

//Note: Doesn't really make sense as a recursive function...
function genOneRandSetOfTimeTables(
    timeTables : TimeTable[],
    posLessonsDicts : Record<string, number>[],
    posClassrooms : string[],
    timeTablePos : number,
     disallowedClassroomsPerTimeSlot : Set<string>[][]
) : TimeTable[]{
    
    if(timeTablePos >= timeTables.length){
        return timeTables;
    }

    let nextPosTimeTable = genOneRandTimeTable(timeTables[timeTablePos], posLessonsDicts[timeTablePos], posClassrooms, 0, 0, disallowedClassroomsPerTimeSlot);
    timeTables[timeTablePos] = nextPosTimeTable;

    //*We calculate the NOW disallowed classroomsPerTimeSlot
    let timeTableMatrix = nextPosTimeTable.turnIntoMatrix();
    let newDisallowedClassroomsPerTimeSlot = structuredClone(disallowedClassroomsPerTimeSlot);

    for(let day = 0; day<timeTableMatrix.length; day++){
        for(let period = 0; period<timeTableMatrix[day].length; period++){
            let classroom = timeTableMatrix[day][period].classroom;
            newDisallowedClassroomsPerTimeSlot[day][period].add(classroom);
        }
    }

    return genOneRandSetOfTimeTables(timeTables, posLessonsDicts, posClassrooms, timeTablePos + 1, newDisallowedClassroomsPerTimeSlot);
}

function getScores(callableFunctions : CallableFunction[], timeTables : TimeTable[][]) : number[]{
    let scores : number[] = timeTables.map((timeTableSet : TimeTable[])=>{
        let score = 0;
        let timeTableMatricies = timeTableSet.map(timetable => timetable.turnIntoMatrix())
        
        callableFunctions.forEach((callableFunction : CallableFunction) => {
            score += callableFunction(timeTableMatricies)
        })

        return score;
    })
    
    return scores;
}

function tournamentSelection(population: TimeTable[][], fitnessScores: number[], tournamentSize: number): TimeTable[] {
    // Select random candidates for the tournament
    let candidateIndices: number[] = [];
    for (let i = 0; i < tournamentSize; i++) {
        candidateIndices.push(Math.floor(Math.random() * population.length));
    }
    
    // Find the best candidate
    let bestIndex = candidateIndices[0];
    for (let i = 1; i < candidateIndices.length; i++) {
        if (fitnessScores[candidateIndices[i]] > fitnessScores[bestIndex]) {
            bestIndex = candidateIndices[i];
        }
    }
    
    return population[bestIndex];
}

function selectParents(population: TimeTable[][], fitnessScores: number[], elitismCount: number): TimeTable[][] {
    const populationSize = population.length;
    const parents: TimeTable[][] = [];
    
    // 1. Elitism: Keep the best solutions
    const indices = Array.from({ length: populationSize }, (_, i) => i);
    indices.sort((a, b) => fitnessScores[b] - fitnessScores[a]);
    
    for (let i = 0; i < elitismCount; i++) {
        parents.push(population[indices[i]]);
    }
    
    // 2. Tournament selection for the rest
    while (parents.length < populationSize) {
        parents.push(tournamentSelection(population, fitnessScores, 3));
    }
    
    return parents;
}

function breed(parents : TimeTable[][], targetPopulationSize : number, timeTablesPerSet : number, amDays : number, periodsPerDay : number[], lessonsDicts : Record<string, number>[]) : TimeTable[][]{
    let newPopulation : TimeTable[][] = [];
    
    //*Generate a combination for the amount specified by targetPopulationSize
    for(let i = 0; i < targetPopulationSize; i++){
        while(true){
            //*Generate a new chromosome
            let chromosome : TimeTable[] = setUpTimeTables(timeTablesPerSet, amDays, parents[0][0].constraints, periodsPerDay)
            for(let dayPos = 0; dayPos < parents[0][0].days.length; dayPos++){
                
                //*For each day, choose a random parent
                let ranIndex = Math.floor(Math.random() * parents.length);
                let chosenParent = parents[ranIndex];

                //*Go through each timeTable in the timeTableSet and...
                for(let timeTableSetPos = 0; timeTableSetPos < timeTablesPerSet; timeTableSetPos++){

                    //*Set the day of those timeTables in the set to the chosen parent's day
                    let chromosomeTimeTable = chromosome[timeTableSetPos]
                    let chosenParentTimeTable = chosenParent[timeTableSetPos]
                    chromosomeTimeTable.days[dayPos] = chosenParentTimeTable.days[dayPos].clone()

                    //*This should keep the constraints satisfied, as they are day specific (i.e. don't have access to the other days)
                    //* and the classrooms should not overlap as the days are copied over from a non-overlapping timetable 
                    //* However, this does not satisfy the lessonsDict (total lessons in a timetable set) 
                }
            }

            //* Just doing swap mutations for now
            for(let timeTableSetPos = 0; timeTableSetPos < timeTablesPerSet; timeTableSetPos++){
                for(let mutations = 0; mutations < mutationsPerSet; mutations++){
                    
                    while(true){
                        //Note: Do it this way, as references are annoying and just using buffers and swapping, at least selon l'IA, créer des problèmes
                        let dayPos1 = Math.floor(Math.random() * amDays);
                        let periodPos1 = Math.floor(Math.random() * periodsPerDay[dayPos1]);
                        
                        let classroom1 = chromosome[timeTableSetPos].days[dayPos1].periods[periodPos1].classroom;
                        let lesson1 = chromosome[timeTableSetPos].days[dayPos1].periods[periodPos1].lesson;
                        
                        let dayPos2 = Math.floor(Math.random() * amDays);
                        let periodPos2 = Math.floor(Math.random() * periodsPerDay[dayPos2]);
                        
                        let classroom2 = chromosome[timeTableSetPos].days[dayPos2].periods[periodPos2].classroom;
                        let lesson2 = chromosome[timeTableSetPos].days[dayPos2].periods[periodPos2].lesson;
                        
                        if(chromosome[timeTableSetPos].checkConstraints(classroom2, lesson2, dayPos1, periodPos1) && chromosome[timeTableSetPos].checkConstraints(classroom1, lesson1, dayPos2, periodPos2)){
                            chromosome[timeTableSetPos].days[dayPos1].periods[periodPos1].classroom = classroom2;
                            chromosome[timeTableSetPos].days[dayPos1].periods[periodPos1].lesson = lesson2;
                            
                            chromosome[timeTableSetPos].days[dayPos2].periods[periodPos2].classroom = classroom1;
                            chromosome[timeTableSetPos].days[dayPos2].periods[periodPos2].lesson = lesson1;                
                            break;
                        }
                    }
                }
            }

            //*Fix the lessonsDictchromosome
            //*Get the difference between the lessonsDict and the chromosome
            for(let timeTableSetPos = 0; timeTableSetPos < timeTablesPerSet; timeTableSetPos++){
                //Note: This is "inverted", i.e. if there is an excess of a lesson, it will be negative, and vice versa
                let lessonDictDiff = structuredClone(lessonsDicts[timeTableSetPos])
                chromosome[timeTableSetPos].days.forEach(day =>{
                    day.periods.forEach(period =>{
                        let lesson = period.lesson;
                        lessonDictDiff[lesson]--;
                    })
                })

                let dayPos = 0;
                chromosome[timeTableSetPos].days.forEach(day =>{
                    let periodPos = 0;
                    let breakOut = false;
                    day.periods.forEach(period =>{
                        let lessonsInShortage = Object.keys(lessonDictDiff).filter(key => lessonDictDiff[key] > 0);
                        lessonsInShortage = lessonsInShortage.filter(lesson => {
                            return chromosome[timeTableSetPos].checkConstraints(period.classroom, lesson, dayPos, periodPos)
                        });

                        if(lessonsInShortage.length == 0){
                            // console.log("No more shortage! Therefore no excess therefore fixed!")
                            breakOut = true;
                            return;
                        }

                        //*If there are too many
                        if(lessonDictDiff[period.lesson] < 0){
                            let randomLessonInShortage = lessonsInShortage[Math.floor(Math.random() * lessonsInShortage.length)];

                            // Update the lessonDictDiff counts before changing the period
                            lessonDictDiff[period.lesson]++; // Removing one instance of the current lesson
                            lessonDictDiff[randomLessonInShortage]--; // Adding one instance of the new lesson
                            
                            // Change the lesson
                            period.lesson = randomLessonInShortage;
                        }
                        periodPos++;
                    })
                    if(breakOut){
                        return;
                    }
                    dayPos++;
                })
            
            }

            let fixed = true;

            for(let timeTableSetPos = 0; timeTableSetPos < timeTablesPerSet; timeTableSetPos++){
                //Note: This is "inverted", i.e. if there is an excess of a lesson, it will be negative, and vice versa
                let lessonDictDiff = structuredClone(lessonsDicts[timeTableSetPos])
                chromosome[timeTableSetPos].days.forEach(day =>{
                    day.periods.forEach(period =>{
                        let lesson = period.lesson;
                        lessonDictDiff[lesson]--;
                    })
                })
                if(Object.values(lessonDictDiff).some(value => value != 0)){
                    fixed = false;
                }
            }

            if(fixed){
                newPopulation.push(chromosome)
                break;
            }
        }

    }

    return newPopulation;
}

function geneticLoop(
    initPopulation : TimeTable[][],
    prioritiesFunctions : CallableFunction[],
    iterations : number,
    amDays : number,
    periodsPerDay : number[],
    lessonsDicts : Record<string, number>[]
) : TimeTable[][]{
    const populationSize = initPopulation.length;
    const timeTablesPerSet = initPopulation[0].length;    
    //TODO: Check whether this cloning is necessary
    let population = initPopulation.map(chromosome => chromosome.map(timeTable => timeTable.clone()));

    for(let iterationNumber = 0; iterationNumber < iterations; iterationNumber++){
        let scores = getScores(prioritiesFunctions, population);
        let newParents = selectParents(population, scores, elitismCount);
        population = breed(newParents, populationSize, timeTablesPerSet, amDays, periodsPerDay, lessonsDicts);
    }
    return population;
}

async function parseScoringFunctions(possibleLessons : string[], possibleClassrooms : string[], paragraph : string) : Promise<CallableFunction[]>{
    let callableFunctions : CallableFunction[] = [];
    let prioritiesTexts = await getScoringFunctions(possibleLessons, possibleClassrooms, paragraph);

    if(prioritiesTexts){
        let prioritiesText = JSON.parse(prioritiesTexts)
        prioritiesText.forEach((priorityText : string) => {
            console.log(`priority: ${priorityText}`)
            let callableFunction : CallableFunction = getEval(`(${priorityText})`);
            callableFunctions.push(callableFunction);
        })
    }else{
        console.log("No priorities returned??")
    }

    return callableFunctions;
}

async function parseConstraintsFunctions(possibleLessons : string[], possibleClassrooms : string[], paragraph : string) : Promise<CallableFunction[]>{
    let constraints : CallableFunction[] = []
    let constraintsText = await getFuncConstraints(possibleLessons, possibleClassrooms, paragraph);

    if(constraintsText){
        let constraintsArr = JSON.parse(constraintsText);

        for(let i=0; i<constraintsArr.length; i++){
            let constraint = constraintsArr[i];
            console.log(`constraint: ${constraint}`)
            let callableFunction : CallableFunction = getEval(`(${constraint})`);
            constraints.push(callableFunction);
        }
    }

    return constraints;
}

function getBestTable(timeTables : TimeTable[][], prioritiesFunctions : CallableFunction[]) : TimeTable[]{
    
    let scores = getScores(prioritiesFunctions, timeTables);
    console.log("Scores: ", scores)
    
    let maxScore = -Infinity;
    let maxIndex = -1;
    scores.forEach((score, index) => {
        if(score > maxScore){
            maxScore = score;
            maxIndex = index;
        }
    })

    return timeTables[maxIndex];
}

async function entireGeneticProcess(
    days : number, 
    periodsPerDay : number[],
    posLessonsDicts : Record<string, number>[], 
    possibleClassrooms : string[], 
    constraintsParagraph : string, 
    prioritiesParagraph : string,
    iterations : number,
    populationSize : number
){
    if(!checkCanFinish(periodsPerDay, posLessonsDicts)){
        throw new Error("lessonsDicts adds up to less than the mandated periods per day!")
    }

    let timeTablesPerSet = posLessonsDicts.length;
    let possibleLessons = getAllKeys(posLessonsDicts)
    let bannedClassrooms = generate2DSet(days, periodsPerDay);

    let prioritiesFunctions = await parseScoringFunctions(possibleLessons, possibleClassrooms, prioritiesParagraph);
    let constraintsFunctions = await parseConstraintsFunctions(possibleLessons, possibleClassrooms, constraintsParagraph);

    let initPopulation = generateNRanTableSets(populationSize, days, periodsPerDay, timeTablesPerSet, constraintsFunctions, posLessonsDicts, possibleClassrooms, bannedClassrooms);
    let results = geneticLoop(initPopulation, prioritiesFunctions, iterations, days, periodsPerDay, posLessonsDicts);
    let bestTable = getBestTable(results, prioritiesFunctions);

    return bestTable;
}

async function main() {
    let results = await entireGeneticProcess(5, [7,7,7,7,7], [{"maths": 5, "english" : 5, "science" : 4, "french" : 4, "design" : 3, "phe": 4, "drama": 3, "i&s": 4, "misc": 3}], ["s11", "j1" ],
        "You can't have more than 3 consecutive periods in the same classroom",
        "Minimize travelling between sites (The classrooms starting with s are in Spahn and the classrooms starting with j are in Jubilee therefore minimise walking between sites)", 100, 10);
    if(results){
        console.log(results)
    }
}

main().catch(error => console.error(error));