import { auth, db } from "./firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { analyzePage, generateProposal, soliloquyChat } from "./background/analysis";

/**
 * ログイン処理を開始する (Google Identity APIを使用)
 */
async function startLogin() {
    try {
        // Brave/Chrome共通で動作する launchWebAuthFlow を使用
        const CLIENT_ID = "351204538325-ptgb6kpq97ki2n43jl5gfmfresdefd9n.apps.googleusercontent.com";
        const REDIRECT_URI = chrome.identity.getRedirectURL(); // https://<extension-id>.chromiumapp.org/
        const SCOPES = ["openid", "email", "profile"].join(" ");

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${CLIENT_ID}&` +
            `response_type=token&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `scope=${encodeURIComponent(SCOPES)}`;

        console.log("Starting launchWebAuthFlow with Redirect URI:", REDIRECT_URI);

        const token = await new Promise<string>((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    console.error("launchWebAuthFlow error:", chrome.runtime.lastError.message);
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                if (!redirectUrl) {
                    return reject(new Error("No redirect URL received"));
                }

                // URLからaccess_tokenを抽出
                const url = new URL(redirectUrl.replace("#", "?")); // URLSearchParamsで扱いやすくするため # を ? に置換
                const params = new URLSearchParams(url.search);
                const accessToken = params.get("access_token");

                if (!accessToken) {
                    console.error("Access token not found in redirect URL:", redirectUrl);
                    return reject(new Error("Access token not found"));
                }

                resolve(accessToken);
            });
        });

        // FirebaseのCredentialを作成
        const credential = GoogleAuthProvider.credential(null, token);

        // Firebaseにサインイン
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        console.log("Logged in via Identity API:", user.uid);

        // Firestoreにユーザー情報を初期保存/更新
        await syncUserToFirestore(user);

    } catch (error) {
        console.error("Login failed:", error);
    }
}

/**
 * Firestoreにユーザー情報を同期する
 */
async function syncUserToFirestore(user: any) {
    const { uid, email, displayName } = user;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            email,
            displayName,
            createdAt: serverTimestamp(),
            skills: [],
            preferences: {
                targetRate: 0,
                category: ""
            }
        });
    } else {
        await setDoc(userRef, {
            email,
            displayName,
            lastLoginAt: serverTimestamp()
        }, { merge: true });
    }
    console.log("User synced to Firestore:", uid);
}

/**
 * 拡張機能設定: アイコンクリックでサイドパネルを開く
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

/**
 * 拡張機能アイコンクリック時にログインを確認/開始
 */
chrome.action.onClicked.addListener(() => {
    if (!auth.currentUser) {
        startLogin();
    }
});

/**
 * メッセージリスナー: サイドパネルからの解析リクエストを処理
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "START_ANALYSIS") {
        handleAnalysisRequest(message.profile).then(sendResponse);
        return true; // 非同期応答のために true を返す
    }
    if (message.type === "LOGIN") {
        console.log("LOGIN message received from sidepanel");
        startLogin().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (message.type === "GENERATE_PROPOSAL") {
        handleProposalRequest(message.profile, message.analysisResults).then(sendResponse);
        return true;
    }
    if (message.type === "SOLILOQUY_CHAT") {
        handleChatRequest(message.profile, message.message, message.context).then(sendResponse);
        return true;
    }
});

/**
 * 解析リクエストのハンドラ
 */
async function handleAnalysisRequest(profile: any) {
    try {
        console.log("Analysis request received with profile:", profile);

        // アクティブなタブをキャプチャ
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            throw new Error("No active tab found");
        }

        // スクリーンショット取得
        const screenshotUrl = await chrome.tabs.captureVisibleTab();
        console.log("Screenshot captured successfully");

        // 解析実行 (バックグラウンドロジック)
        const results = await analyzePage(screenshotUrl, profile);

        return { success: true, results };
    } catch (error: any) {
        console.error("Analysis handler failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * 応募文生成リクエストのハンドラ
 */
async function handleProposalRequest(profile: any, analysisResults: any) {
    try {
        const proposal = await generateProposal(profile, analysisResults);
        return { success: true, proposal };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 独り言チャットリクエストのハンドラ
 */
async function handleChatRequest(profile: any, message: string, context: any) {
    try {
        const reply = await soliloquyChat(profile, message, context);
        return { success: true, reply };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * ログイン状態の監視
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
    } else {
        console.log("User is logged out");
    }
});
