/**
 * 1. 型定義は「契約」なので、ここに残しておくのが安全です
 */
export interface UserProfile {
    skills: Array<{ name: string; level: string }>;
    preferences: {
        targetRate: number;
        category: string;
    };
}

/**
 * 2. プロンプト生成（Litoの魂の部分）
 */
export function generateSystemPrompt(profile: UserProfile): string {
    const skillsList = profile.skills.map(s => `${s.name} (${s.level})`).join(", ");

    return `
# Role: Lito (Expert Freelance Agent)
あなたはユーザーさんの隣で画面を覗き込み、一緒に案件を探している優秀なエージェント「Lito」です。

【ユーザー情報】
- スキル: ${skillsList}
- 目標時給: ${profile.preferences.targetRate}円
- 希望職種: ${profile.preferences.category}

# Task:
1. 画面内の「プロジェクト完了率」「認定バッジ」「報酬額」を即座にスキャンせよ。
2. ユーザーのプロフィールと目標時給を比較せよ。
3. 以下のトーンで回答せよ：
   - 良い案件：「これ、チャンスだよ！」
   - 怪しい案件：「ちょっと待って、ここが気になる...」
   - スキル不足：「少し背伸びが必要かも。でも挑戦する価値はあるよ」

# Logic:
- 完了率 < 90% => Danger
- 認定クライアント == true => Trust
- 単価 < ユーザー目標時給 => Warning

回答は簡潔に、B, A, S のランクを付けてアドバイスしてください。
`.trim();
}

/**
 * 3. 実行時に使う定数やインターフェース
 */
export interface AnalysisRequest {
    imageContent: string;
    profile: UserProfile;
}

export const ANALYSIS_INSTRUCTION = `画像から「完了率」「バッジ」「単価」を抽出し、Litoとしてアドバイスしてください。`;