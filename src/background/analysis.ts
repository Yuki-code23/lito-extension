/**
 * ページ内容の画像とユーザープロファイルに基づいて解析を実行する
 */
export async function analyzePage(screenshotUrl: string, profile: { targetRate: number; category: string; skills: string[]; geminiApiKey?: string }) {
    console.log("Analyzing page with Gemini Vision API...");

    const apiKey = profile.geminiApiKey?.trim();
    if (!apiKey) {
        throw new Error("Gemini APIキーが設定されていません。");
    }

    const base64Data = screenshotUrl.split(',')[1];
    const prompt = `あなたはフリーランスエンジニアの強力なエージェント「Lito」です。提供されたスクリーンショットの案件詳細を解析し、ユーザーのプロフィール（目標：${profile.targetRate}、職種：${profile.category}、スキル：${profile.skills.join(', ')}）に合わせたアドバイスを3つ簡潔に回答してください。`;

    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/png", data: base64Data } }
            ]
        }]
    };

    /**
     * 指定されたモデルでGemini APIにPOSTする
     */
    async function postToGemini(modelName: string) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
    }

    /**
     * 利用可能なモデルをリストアップしてログに出力する（デバッグ用）
     */
    async function listAvailableModels() {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            console.log("Available models for this key:", data.models?.map((m: any) => m.name));
            return data.models || [];
        } catch (e) {
            console.error("Failed to list models:", e);
            return [];
        }
    }

    try {
        // 利用可能なモデルを優先順位順に試行
        const modelsToTry = [
            "gemini-2.0-flash", // ユーザーのログで確認された最新モデル
            "gemini-flash-latest", // エイリアス
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ];
        let lastResponse: Response | null = null;

        for (const model of modelsToTry) {
            console.log(`Attempting analysis with ${model}...`);
            const response = await postToGemini(model);

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const suggestions = text.split('\n')
                    .map((s: string) => s.replace(/^[*-]\s*/, '').trim())
                    .filter((s: string) => s.length > 0)
                    .slice(0, 3);

                return {
                    timestamp: new Date().toISOString(),
                    suggestions: suggestions.length > 0 ? suggestions : ["解析結果が得られませんでした。"]
                };
            }

            lastResponse = response;
            if (response.status !== 404) break;
        }

        if (lastResponse && !lastResponse.ok) {
            const errorData = await lastResponse.json().catch(() => ({}));
            console.error("Gemini API Final Error Detail:", errorData);

            if (lastResponse.status === 404) {
                await listAvailableModels();
                throw new Error("利用可能なGeminiモデルが見つかりません(404)。Google Cloud Consoleで『Generative Language API』を有効にしてから数分待つか、AI Studioで新しいプロジェクトを作成して新しいキーを取得してみてください。");
            }
            throw new Error(`APIエラー (${lastResponse.status}): ${errorData.error?.message || '不明なエラー'}`);
        }

        throw new Error("解析リクエストに失敗しました。");

    } catch (error: any) {
        console.error("Analysis execution failed:", error);
        throw error;
    }
}