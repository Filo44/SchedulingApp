import assert from "node:assert";
import { entireGeneticProcess, checkNoClassroomConflicts } from "../index.js";

async function test_success_simple_no_constraints() {
    const days = 2;
    const periodsPerDay = [2,2];
    const posLessonsDicts: Record<string, number>[] = [
        { a: 2, b: 2 },
        { a: 2, b: 2 }
    ];
    const possibleClassrooms = ["c1", "c2", "c3"]; // more than enough
    const constraintsParagraph = "No constraints";
    const prioritiesParagraph = "No priorities";
    const iterations = 10;
    const populationSize = 6;

    const results = await entireGeneticProcess(
        days,
        periodsPerDay,
        posLessonsDicts,
        possibleClassrooms,
        constraintsParagraph,
        prioritiesParagraph,
        iterations,
        populationSize
    );

    assert.ok(results && results.length === posLessonsDicts.length, "Should return one timetable per lessons dict");
    assert.ok(checkNoClassroomConflicts(results.map(t => t.turnIntoMatrix())), "No classroom conflicts expected");
}

async function test_invalid_lessons_distribution_rejected() {
    const days = 2;
    const periodsPerDay = [2,2]; // total 4 periods per timetable
    // Intentionally wrong: sums to 3
    const posLessonsDicts: Record<string, number>[] = [ { x: 2, y: 1 } ];
    const possibleClassrooms = ["r1", "r2"];
    const constraintsParagraph = "No constraints";
    const prioritiesParagraph = "No priorities";

    let threw = false;
    try {
        await entireGeneticProcess(
            days,
            periodsPerDay,
            posLessonsDicts,
            possibleClassrooms,
            constraintsParagraph,
            prioritiesParagraph,
            1,
            2
        );
    } catch (e) {
        threw = true;
    }
    assert.ok(threw, "Should throw when lessons do not sum to required periods");
}

function test_checkNoClassroomConflicts_true() {
    const matrix = [
        // timetable 1
        [
            [ { lesson: "a", classroom: "c1" }, { lesson: "b", classroom: "c2" } ],
            [ { lesson: "a", classroom: "c3" }, { lesson: "b", classroom: "c1" } ]
        ],
        // timetable 2
        [
            [ { lesson: "a", classroom: "c3" }, { lesson: "b", classroom: "c1" } ],
            [ { lesson: "a", classroom: "c2" }, { lesson: "b", classroom: "c3" } ]
        ]
    ];
    assert.ok(checkNoClassroomConflicts(matrix as any), "Should have no conflicts");
}

function test_checkNoClassroomConflicts_false() {
    const matrix = [
        // timetable 1
        [
            [ { lesson: "a", classroom: "c1" } ],
            [ { lesson: "a", classroom: "" } ]
        ],
        // timetable 2 (conflict same day/period 0/0 uses c1 again)
        [
            [ { lesson: "b", classroom: "c1" } ],
            [ { lesson: "b", classroom: "c2" } ]
        ]
    ];
    assert.ok(!checkNoClassroomConflicts(matrix as any), "Should detect a classroom conflict");
}

async function main() {
    await test_success_simple_no_constraints();
    await test_invalid_lessons_distribution_rejected();
    test_checkNoClassroomConflicts_true();
    test_checkNoClassroomConflicts_false();
    console.log("All tests passed.");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});