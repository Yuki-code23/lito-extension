import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("API key not found in .env");
    process.exit(1);
}

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
console.log("Connecting to:", url.substring(0, 80) + "...");

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log("Connected!");
    const setupMsg = {
        setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
                responseModalities: ["TEXT"]
            }
        }
    };
    ws.send(JSON.stringify(setupMsg));
    console.log("Sent setup message");

    setTimeout(() => {
        const textMsg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: "こんにちは。何か返事をしてください。" }]
                }],
                turnComplete: true
            }
        };
        ws.send(JSON.stringify(textMsg));
        console.log("Sent text trigger message");
    }, 2000);
});

ws.on('message', (data) => {
    try {
        const parsed = JSON.parse(data.toString());
        console.log("Received parsed:", JSON.stringify(parsed, null, 2));
    } catch {
        // it might be binary
        console.log("Received binary or non-JSON data of length:", data.length);
    }
});

ws.on('error', (error) => {
    console.error("WebSocket Error:", error);
});

ws.on('close', (code, reason) => {
    console.log(`Connection closed: Code=${code} Reason=${reason.toString()}`);
});
