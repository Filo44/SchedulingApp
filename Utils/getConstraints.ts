import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

export default async function getFuncConstraints(possibleLessons : string[], possibleClassrooms : string[], paragraph : string) {
  dotenv.config();
  const apiKey = process.env.API_KEY;

  const gemini = new GoogleGenAI({ apiKey: apiKey });
  const generationConfig = {
      systemInstruction:`Your job is to create an array of strings which contain in them callable function in Javascript which take in one parameter called "timetableMatrix" which is a 2d array. timetableMatrix represents a time table. The time slots can be accessed by accessing the parameter "timetableMatrix" like this : timetableMatrix[dayIndex][periodIndex]. Each element has two properties: "classroom" and "lesson" which can be accessed like this:  "timetableMatrix[dayIndex][periodIndex].classroom" and  "timetableMatrix[dayIndex][periodIndex].lesson" respectively. You will recieve a paragraph following this with a list, textual, of different constraints this time table must have. Your job is to create a javascript function for each of these constraints which, as described before, takes in a parameter timetableMatrix. This will be presented in an array of strings (these strings are the javascript functions).`,
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 65536,
      responseModalities: [
      ],
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