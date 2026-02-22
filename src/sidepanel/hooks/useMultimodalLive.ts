import { useState, useRef, useEffect, useCallback } from 'react';
import { MultimodalLiveClient } from '../../background/live_api';

export const useMultimodalLive = (apiKey: string | undefined, systemInstruction: string) => {
    const [isActive, setIsActive] = useState(false);
    const [responses, setResponses] = useState<string[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [lastCapturedAt, setLastCapturedAt] = useState<Date | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const clientRef = useRef<MultimodalLiveClient | null>(null);
    const intervalRef = useRef<any>(null);

    const onMessage = useCallback((data: any) => {
        console.log("WebSocket Message Received:", data);
        if (data.server_content && data.server_content.model_turn) {
            setIsThinking(false);
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

            // リアルタイム画面キャプチャのループ開始 (例: 3秒おき)
            intervalRef.current = setInterval(async () => {
                try {
                    setIsCapturing(true);
                    // バックグラウンドにキャプチャを依頼
                    chrome.runtime.sendMessage({ type: "CAPTURE_FOR_LIVE" }, (response) => {
                        setIsCapturing(false);
                        if (response && response.screenshotUrl && clientRef.current) {
                            const base64Data = response.screenshotUrl.split(',')[1];
                            clientRef.current.sendImage(base64Data);
                            setLastCapturedAt(new Date());
                            setIsThinking(true);
                        }
                    });
                } catch (e) {
                    setIsCapturing(false);
                    console.error("Live capture failed:", e);
                }
            }, 3000);

        } catch (e) {
            console.error("Failed to connect to Live API:", e);
            alert("Live APIへの接続に失敗しました。");
        }
    }, [apiKey, systemInstruction, onMessage]);

    const startScan = useCallback(async () => {
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
            setIsScanning(true);
            setScanProgress(0);

            chrome.runtime.sendMessage({ type: "START_AUTO_SCAN" }, (response) => {
                setIsScanning(false);
                setScanProgress(100);
            });
        } catch (e) {
            console.error("Failed to connect to Live API for scanning:", e);
            alert("Live APIへの接続に失敗しました。");
            setIsScanning(false);
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
        setIsScanning(false);
    }, []);

    useEffect(() => {
        const handleMessage = (msg: any) => {
            if (msg.type === "SCAN_FRAME") {
                if (clientRef.current && msg.screenshotUrl) {
                    const base64Data = msg.screenshotUrl.split(',')[1];
                    clientRef.current.sendImage(base64Data);
                    setIsThinking(true);
                    setLastCapturedAt(new Date());
                }
                if (typeof msg.progress === 'number') {
                    setScanProgress(msg.progress);
                }
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
            stopLive();
        };
    }, [stopLive]);

    return {
        isActive,
        isScanning,
        scanProgress,
        responses,
        isCapturing,
        isThinking,
        lastCapturedAt,
        startLive,
        startScan,
        stopLive,
        setResponses
    };
};
