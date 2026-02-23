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
        if (data.serverContent && data.serverContent.modelTurn) {
            setIsThinking(false);
            const parts = data.serverContent.modelTurn.parts;
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
            model: "models/gemini-2.0-flash",
            systemInstruction,
            onDisconnect: (reason) => {
                console.warn("Live API Disconnected:", reason);
                stopLive();
            }
        }, onMessage);

        try {
            await client.connect();
            clientRef.current = client;
            setIsActive(true);

            let captureCount = 0;
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

                            captureCount++;
                            // 最初のキャプチャ時と、その後は15秒(5回)ごとにAIに応答を促す
                            if (captureCount === 1) {
                                clientRef.current.sendText("画面の共有を開始しました。今見えている画面について、私のスキルや目標単価を踏まえたパッと見の印象やアドバイスを短く教えてください。");
                            } else if (captureCount % 5 === 0) {
                                clientRef.current.sendText("画面に変化はありましたか？もし新しい気づきや、追記すべきアドバイスがあれば短く教えてください。特に重要な変化がなければ「特になし」とだけ答えてください。");
                            }
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
            model: "models/gemini-2.0-flash",
            systemInstruction
        }, onMessage);

        try {
            await client.connect();
            clientRef.current = client;
            setIsActive(true);
            setIsScanning(true);
            setScanProgress(0);
            setResponses([]); // 古い結果をクリア

            chrome.runtime.sendMessage({ type: "START_AUTO_SCAN" }, (response) => {
                setIsScanning(false);
                setScanProgress(100);
                setIsThinking(true);
                // スキャン完了時に全体総括を要求する
                if (clientRef.current) {
                    clientRef.current.sendText("ページ全体のスクロールとキャプチャが完了しました。これらのすべての画面情報を踏まえて、この案件の「総合的なマッチ度」「魅力やメリット」「懸念点や交渉の余地」をプロフェッショナルな視点でまとめて教えてください。");
                }
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
