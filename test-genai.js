import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_FIREBASE_API_KEY });
const session = await ai.clients.createLiveClient();

session.on('open', () => {
    console.log("SDK connected!");
    session.clientContent([{ text: "hello" }]);
});

session.on('content', (content) => {
    console.log("Content:", content);
});

session.on('close', (event) => {
    console.log("SDK closed", event);
});

session.connect({
    model: "gemini-2.0-flash",
    config: {
        responseModalities: ["TEXT"]
    }
});
