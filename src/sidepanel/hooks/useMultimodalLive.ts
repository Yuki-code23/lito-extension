import { useState, useRef, useEffect, useCallback } from 'react';
import { MultimodalLiveClient } from '../../background/live_api';

export const useMultimodalLive = (apiKey: string | undefined, systemInstruction: string) => {
    const [isActive, setIsActive] = useState(false);
    const [responses, setResponses] = useState<string[]>([]);
    const clientRef = useRef<MultimodalLiveClient | null>(null);
    const intervalRef = useRef<any>(null);

    const onMessage = useCallback((data: any) => {
        console.log("WebSocket Message Received:", data);
        if (data.server_content && data.server_content.model_turn) {
            const parts = data.server_content.model_turn.parts;
            const text = parts.map((p: any) => p.text).join('');
            if (text) {
                setResponses(prev => [...prev, text]);
            }
        }
    }, [setResponses]);

    const startLive = useCallback(async () => {
        if (!apiKey) {
            alert("Gemini APIキーが設定されていません。設定画面で登録してください。");
            return;
        }

        const client = new MultimodalLiveClient({
            apiKey,
            systemInstruction
        }, onMessage);

        try {
            await client.connect();
            clientRef.current = client;
            setIsActive(true);

            // リアルタイム画面キャプチャのループ開始 (例: 2秒おき)
            intervalRef.current = setInterval(async () => {
                try {
                    // バックグラウンドにキャプチャを依頼
                    chrome.runtime.sendMessage({ type: "CAPTURE_FOR_LIVE" }, (response) => {
                        if (response && response.screenshotUrl && clientRef.current) {
                            const base64Data = response.screenshotUrl.split(',')[1];
                            clientRef.current.sendImage(base64Data);
                        }
                    });
                } catch (e) {
                    console.error("Live capture failed:", e);
                }
            }, 3000);

        } catch (e) {
            console.error("Failed to connect to Live API:", e);
            alert("Live APIへの接続に失敗しました。");
        }
    }, [apiKey, systemInstruction, onMessage]);

    const stopLive = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
        }
        setIsActive(false);
    }, []);

    useEffect(() => {
        return () => stopLive();
    }, [stopLive]);

    return {
        isActive,
        responses,
        startLive,
        stopLive,
        setResponses
    };
};
