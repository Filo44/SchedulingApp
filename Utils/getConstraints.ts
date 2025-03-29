import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const apiKey = process.env.API_KEY;
const gemini = new GoogleGenAI({ apiKey: apiKey });
const modelName = "gemini-2.0-flash";

const generationConfigGeneral = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 65536,
  responseModalities: [
  ],
};

export async function getFuncConstraints(possibleLessons : string[], possibleClassrooms : string[], paragraph : string) {
  const generationConfig = {
    ...generationConfigGeneral,
    systemInstruction:`Your job is to create an array of strings which contain in them callable functions in Javascript which takes the following parameters: "timetableMatrix"  which is a 2d array, "chosenClassroom" which is a string containing the name of a classroom, "chosenLesson" which is a string containing the name of a lesson, "dayPos" which is the index of the day of the first empty time slot in timetableMatrix (explained further) and "periodPos" which is the index of the period in the day (at index "dayPos") of the first empty time slot. timetableMatrix represents a time table. The time slots can be accessed by accessing the parameter "timetableMatrix" like this : timetableMatrix[dayIndex][periodIndex]. Each element has two properties: "classroom" and "lesson" which can be accessed like this:  "timetableMatrix[dayIndex][periodIndex].classroom" and  "timetableMatrix[dayIndex][periodIndex].lesson" respectively. You will receive three things after this, a list of the lessons, a list of the classrooms and a paragraph which details/lists different constraints this time table must have. Your job is to create a javascript function for each of these constraints which, as described before, takes in: "timetableMatrix", "chosenClassroom", "chosenLesson", "dayPos" and "periodPos" and returns whether the addition of a new timeslot at position timetableMatrix[dayPos][periodPos] in the timetable "timetableMatrix" would still abide the constraint. These functions will be presented in an array of strings (these strings are the javascript functions).`,
    responseMimeType: "application/json",
    responseSchema: {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        }
    },
  };
  const prompt = `The possible lesson strings are the following: "${JSON.stringify(possibleLessons)}", the possible classrooms are: "${JSON.stringify(possibleClassrooms)}" and the paragraph describing the constraints is: "${paragraph}" .`
  const response = await gemini.models.generateContent({
    model: modelName,
    config: generationConfig,
    contents: prompt,
  });
  return response.text;
}

export async function getScoringFunctions(possibleLessons : string[], possibleClassrooms: string[], paragraph : string){
  const generationConfig = {
    ...generationConfigGeneral,
    systemInstruction:  `Your job is to create an array with one string which contains an anonymous function in Javascript which takes in one parameter called "timetableMatrices" which is an array of 2d array. Each of the elements of timetableMatrices represents a time table.  The time slots can be accessed by accessing the parameter "timetableMatrices" like this : timetableMatrices[timeTableIndex][dayIndex][periodIndex]. Each element has two properties: "classroom" and "lesson" which can be accessed like this:  "timetableMatrices[timeTableIndex][dayIndex][periodIndex].classroom" and  "timetableMatrices[timeTableIndex][dayIndex][periodIndex].lesson" respectively. You will receive three things after this, a list of the lessons, a list of the classrooms and a paragraph which details/lists different what the timetable must prioritise for **in order of importance**. Your job is to create an anynoymous javascript function which returns an integer which is a score of how "good" the timetable is according to the prioritise detailed previously which, as described before, takes in a parameter timetableMatrices. The better the timetable, the higher the score. `,
    responseMimeType: "application/json",
    responseSchema: {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        }
    },
  };
  const prompt = `The possible lesson strings are the following: "${JSON.stringify(possibleLessons)}", the possible classrooms are: "${JSON.stringify(possibleClassrooms)}" and the paragraph describing the prioritise **in order of importance** is: "${paragraph}" .`
  const response = await gemini.models.generateContent({
    model: modelName,
    config: generationConfig,
    contents: prompt,
  });
  return response.text;
}