import { auth, db } from "./src/firebase/config.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

/**
 * Offscreen Document を作成または取得する
 */
async function setupOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
    });

    if (existingContexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["DOM_SCRAPING"], // Firebase Auth用に必要
        justification: "Firebase Authentication handles the Google login flow.",
    });
}

/**
 * ログイン処理を開始する
 */
async function startLogin() {
    await setupOffscreenDocument();
    chrome.runtime.sendMessage({ type: "AUTHENTICATE" });
}

/**
 * 認証結果のハンドリング
 */
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === "AUTH_SUCCESS") {
        const { uid, email, displayName } = message.user;

        // Firestoreにユーザー情報を初期保存/更新
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email,
                displayName,
                createdAt: serverTimestamp(),
                skills: [],
                preferences: {
                    targetRate: 3000,
                    category: "General"
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

        // Offscreen Document を閉じる
        await chrome.offscreen.closeDocument();
    }

    if (message.type === "AUTH_ERROR") {
        console.error("Authentication failed:", message.error);
        await chrome.offscreen.closeDocument();
    }
});

/**
 * 拡張機能アイコンクリック時にログインを開始（暫定的なトリガー）
 */
chrome.action.onClicked.addListener(() => {
    startLogin();
});

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
