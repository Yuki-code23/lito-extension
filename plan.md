# 要件定義書：Lito - Real-time Vision AI Assistant (v2.0)

## 1. プロジェクト概要
ユーザーのブラウザ画面をAIがリアルタイムで視覚解析し、サイドバーを通じて「ユーザーのスキルレベルに最適化されたアドバイス」を提供するブラウザ拡張機能。

## 2. アップデートの核心（今回の変更点）
1. **クラウド連携 (Firebase Spark Plan)**:
   - プロジェクト停止リスクのないFirebaseを採用。
   - ユーザーのスキル、時給目標、経験値をクラウド保存し、PCを跨いでも「自分の相棒」を維持。
2. **パーソナライズ・エンジンの搭載**:
   - AIに「ユーザーの能力」を事前知識として注入。
   - 案件の「マッチング率」や「挑戦すべきか否か」の判断精度を向上。

## 3. 主要機能 (Core Features)
- **リアルタイム解析**: Gemini 3 Flash / 2.0 Flash による超低遅延ストリーミング解析。
- **スキルプロフィール管理**:
  - 職種（エンジニア、ライター等）、スキルタグ（Python, React等）、レベル（初級〜上級）の登録・編集。
- **インテリジェント・サイドバー**:
  - 案件表示時に「あなたのスキルなら時給換算◯円相当、難易度はBです」と即座に回答。
- **セキュア認証**: Googleログイン（Offscreen Documents経由）による安全なデータアクセス。

## 4. 技術スタック (2026/02/21 更新版)
| 分類 | 選定技術 | 理由 |
| :--- | :--- | :--- |
| **Backend** | Firebase (Auth / Firestore) | **無料で永続運用可能。** アカウント管理とスキル保存に最適。 |
| **Manifest** | Manifest V3 | Offscreen Documents API を活用し、セキュアな認証を実現。 |
| **AI API** | Multimodal Live API (WebSocket) | 映像と音声をリアルタイムで双方向通信するため。 |
| **Frontend** | React 19 / Tailwind CSS | サイドバー内の複雑なUI（スキル管理画面）を高速開発。 |

## 5. データ構造案 (Cloud Firestore)
- **users/{uid}/profile**:
  - `skills`: `[{ name: "Python", level: "Expert" }, ...]`
  - `preferences`: `{ targetRate: 3500, category: "Development" }`
  - `history`: 過去にAIが「Good」と判定し、ユーザーがチェックした案件。

## 6. 実装ロードマップ
1. **[Auth]**: Firebase初期設定とGoogleログインの実装。
2. **[UI]**: サイドバー内での「スキル編集・削除」機能の実装。
3. **[Brain]**: 取得したスキル情報をGeminiのSystem Promptに動的に埋め込むロジックの開発。
4. **[Live]**: 画面キャプチャとスキル情報をセットでAIへ送信。

---
**作成日**: 2026/02/21
**作成者**: Gemini 3 Flash (AI開発エージェント)