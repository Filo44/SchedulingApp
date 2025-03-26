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
    systemInstruction:`Your job is to create an array of strings which contain in them callable functions in Javascript which take in one parameter called "timetableMatrices" which is an array of 2d array. Each of the elements of the timetableMatrices array represents a time table. The time slots can be accessed by accessing the parameter "timetableMatrices" like this : timetableMatrices[timeTableIndex][dayIndex][periodIndex]. Each element has two properties: "classroom" and "lesson" which can be accessed like this:  "timetableMatrices[timeTableIndex][dayIndex][periodIndex].classroom" and  "timetableMatrices[timeTableIndex][dayIndex][periodIndex].lesson" respectively. You will receive three things after this, a list of the lessons, a list of the classrooms and a paragraph which details/lists different constraints this time table must have. Your job is to create a javascript function for each of these constraints which, as described before, takes in a parameter timetableMatrices. This, i.e. the javasript functions, will be presented in an array of strings (these strings are the javascript functions).`,
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
    model: "gemini-2.0-flash",
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
    model: "gemini-2.0-flash",
    config: generationConfig,
    contents: prompt,
  });
  return response.text;
}