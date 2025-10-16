import { entireGeneticProcess, checkNoClassroomConflicts } from "../index.js";

async function main() {
    const days = 5;
    const periodsPerDay = [7,7,7,7,7];
    const posLessonsDicts : Record<string, number>[] = [{"maths": 5, "english" : 5, "science" : 4, "french" : 4, "design" : 3, "phe": 4, "drama": 3, "i&s": 4, "misc": 3}, {"maths": 20, "english" : 15}];
    const possibleClassrooms = ["s11", "s10", "j2", "j1"];
    const constraintsParagraph = "No constraints";
    const prioritiesParagraph = "Minimize travelling between sites (The classrooms starting with s are in Spahn and the classrooms starting with j are in Jubilee therefore minimise walking between sites)";
    const iterations = 100;
    const populationSize = 10;

    let results = await entireGeneticProcess(days, periodsPerDay, posLessonsDicts, possibleClassrooms, constraintsParagraph, prioritiesParagraph, iterations, populationSize);
    if(results){
        console.log(results)
        console.log(checkNoClassroomConflicts(results.map(timeTable => timeTable.turnIntoMatrix())))
    }
}

main().catch(error => console.error(error));