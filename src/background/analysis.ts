export interface Skill {
    id: string;
    name: string;
    years: number;
    isProfessional: boolean;
    level: number;
}

export interface Profile {
    targetRate: number;
    category: string;
    skills: Skill[];
    geminiApiKey?: string;
}

/**
 * ページ内容の画像とユーザープロファイルに基づいて解析を実行する
 */
export async function analyzePage(screenshotUrl: string, profile: Profile) {
    console.log("Analyzing page with Gemini Vision API...");

    const apiKey = profile.geminiApiKey?.trim();
    if (!apiKey) {
        throw new Error("Gemini APIキーが設定されていません。");
    }

    const skillsText = profile.skills.map(s => `- ${s.name}: ${s.years}年 (Lv.${s.level}${s.isProfessional ? ', 実務あり' : ''})`).join('\n');
    const base64Data = screenshotUrl.split(',')[1];
    const prompt = `
あなたはフリーランスエンジニアの強力なエージェント「Lito」です。提供されたスクリーンショットの案件詳細を解析してください。

ユーザープロフィール：
- 希望単価：月${profile.targetRate.toLocaleString()}円
- 職種：${profile.category}
- スキル：
${skillsText}

上記プロフィールに合わせたアドバイスを3つ、具体的かつ簡潔に回答してください。
回答形式：3つの箇条書き（改行区切り）
`;

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

/**
 * 案件に基づいた応募文（提案文）を生成する
 */
export async function generateProposal(profile: Profile, analysisResults: any) {
    const apiKey = profile.geminiApiKey?.trim();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const skillsText = profile.skills.map(s => `- ${s.name}: ${s.years}年`).join(', ');
    const prompt = `
あなたはユーザーの代理人エンジニアです。以下の案件解析結果とスキルに基づき、クライアントに送る「応募文（提案文）」を作成してください。
文体は丁寧ですが、プロフェッショナルな自信を感じさせるものにしてください。

ユーザーのスキル：${skillsText}
案件解析のポイント：${analysisResults.suggestions.join(' / ')}

構成：
1. 挨拶
2. 案件への関心と適合する理由
3. 具体的な貢献内容
4. 結びの言葉

返信は「応募文の本文のみ」を出力してください。
`;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
        try {
            console.log(`Attempting proposal generation with ${model}...`);
            const response = await postToGeminiForNewFunctions(model, apiKey, requestBody);
            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "応募文を生成できませんでした。";
            }
            const errorBody = await response.json().catch(() => ({}));
            lastError = new Error(`APIエラー (${response.status}): ${errorBody.error?.message || '不明なエラー'}`);
            if (response.status !== 404) break;
        } catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error("応募文の生成に失敗しました。");
}

/**
 * ユーザーの「独り言」に対する対話を行う
 */
export async function soliloquyChat(profile: Profile, message: string, context: any) {
    const apiKey = profile.geminiApiKey?.trim();
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const history = context.history?.slice(-5).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    })) || [];

    const systemPrompt = `
あなたはフリーランスエンジニアのエージェント「Lito」です。
ユーザーは案件ページを見ながら、あなたに「独り言」のように不安や質問を投げかけています。
前回の解析結果（${context.analysisResults?.suggestions.join('、')}）を踏まえ、
ユーザーを励ましつつ、エンジニアとしての客観的な視点でアドバイスを返してください。
回答は親しみやすく、かつ短く（150文字以内）まとめてください。
`;

    const requestBody = {
        contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "了解しました。エージェントLitoとして、解析結果に基づきアドバイスします。" }] },
            ...history,
            { role: 'user', parts: [{ text: message }] }
        ]
    };

    const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
        try {
            console.log(`Attempting chat with ${model}...`);
            const response = await postToGeminiForNewFunctions(model, apiKey, requestBody);
            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "お答えできませんでした。";
            }
            const errorBody = await response.json().catch(() => ({}));
            lastError = new Error(`APIエラー (${response.status}): ${errorBody.error?.message || '不明なエラー'}`);
            if (response.status !== 404) break;
        } catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error("チャット回答の取得に失敗しました。");
}

/**
 * Gemini APIにPOSTするための汎用ヘルパー関数
 * analyzePage内のpostToGeminiとは異なり、apiKeyとbodyを引数で受け取る
 */
async function postToGeminiForNewFunctions(modelName: string, apiKey: string, body: any) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}