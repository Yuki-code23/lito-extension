# Lito - Real-time Vision AI Assistant for Freelancers

Lito は、エンジニアのブラウジングをリアルタイムでサポートする AI アシスタント（Chrome/Brave 拡張機能）です。
案件詳細ページを解析し、あなたのスキルに基づいた最適なアドバイスや提案文の作成、さらには音声での対話が可能です。

![Lito Screenshot](public/icons/icon128.png)

## 🚀 主な機能

- **🧠 案件自動解析**: 画面内の案件情報を Gemini Vision API で解析。あなたのスキルとの適合性を即座に評価。
- **📝 提案文生成**: 解析結果を元に、クライアントの心に刺さるプロフェッショナルな応募文を自動作成。
- **🎙️ 音声インタラクション (STT/TTS)**: 案件を見ながら「独り言」で質問。AI が音声で答えてくれる双方向コミュニケーション。
- **🌍 クロスブラウザ対応**: Chrome はもちろん、Brave ブラウザでも Google ログインがスムーズに行えます。

## 🛠️ 技術スタック

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **AI**: Google Gemini (Flash 1.5/2.0)
- **Backend/Auth**: Firebase (Authentication, Firestore)
- **Browser API**: Chrome Extensions Manifest V3, Web Speech API

## 📦 セットアップ方法

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/lito-extension.git
cd lito-extension
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.example` をコピーして `.env` を作成し、ご自身の Firebase 情報を入力してください。
```bash
cp .env.example .env
```

### 4. ビルド
```bash
npm run build
```

### 5. 拡張機能の読み込み
1. Chrome または Brave で `chrome://extensions/` を開く。
2. 「デベロッパーモード」をオンにする。
3. 「パッケージ化されていない拡張機能を読み込む」を選択し、このプロジェクト内の `dist` フォルダを選択。

## 🔑 必要な API キー
- **Gemini API Key**: 拡張機能内の設定画面から入力してください。
- **Firebase Config**: `.env` に設定した Firebase プロジェクト。

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。
