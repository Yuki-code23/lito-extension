/**
 * Gemini 2.0 Multimodal Live API (WebSocket) Handler
 */

export interface LiveConfig {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
    onDisconnect?: (reason: string) => void;
}

export class MultimodalLiveClient {
    private ws: WebSocket | null = null;
    private config: LiveConfig;
    private onMessageCallback: (msg: any) => void;

    constructor(config: LiveConfig, onMessage: (msg: any) => void) {
        this.config = config;
        this.config.model = this.config.model || "models/gemini-2.0-flash";
        this.onMessageCallback = onMessage;
    }

    public async connect() {
        if (this.ws) {
            this.ws.close();
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;

        return new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("WebSocket connected to Multimodal Live API");
                this.sendSetup();
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessageCallback(data);
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            this.ws.onerror = (error) => {
                console.error("Live API WebSocket Error:", error);
                if (this.config.onDisconnect) this.config.onDisconnect("WebSocket Error");
            };

            this.ws.onclose = (event) => {
                console.log(`Live API WebSocket Connection Closed: Code=${event.code}, Reason=${event.reason || 'Unknown'}`);
                if (this.config.onDisconnect) this.config.onDisconnect(`Code: ${event.code}, Reason: ${event.reason}`);
            };
        });
    }

    private sendSetup() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const setupMsg: any = {
            setup: {
                model: this.config.model,
                generationConfig: {
                    responseModalities: ["TEXT"]
                }
            }
        };

        if (this.config.systemInstruction) {
            setupMsg.setup.systemInstruction = {
                parts: [{ text: this.config.systemInstruction }]
            };
        }

        this.ws.send(JSON.stringify(setupMsg));
    }

    public sendImage(base64Data: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg = {
            realtimeInput: {
                mediaChunks: [{
                    mimeType: "image/jpeg",
                    data: base64Data
                }]
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    public sendAudio(base64Audio: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg = {
            realtimeInput: {
                mediaChunks: [{
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Audio
                }]
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    public sendText(text: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text }]
                }],
                turnComplete: true
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
