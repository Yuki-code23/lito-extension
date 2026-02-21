import { auth } from "./src/firebase/config.js";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

// 背景スクリプトからのメッセージを待機
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "AUTHENTICATE") {
        try {
            const provider = new GoogleAuthProvider();
            // Chrome拡張機能では signInWithPopup が一般的ですが、環境により signInWithRedirect も検討
            const result = await signInWithPopup(auth, provider);

            // 認証成功を背景スクリプトに通知
            chrome.runtime.sendMessage({
                type: "AUTH_SUCCESS",
                user: {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName
                }
            });
        } catch (error) {
            console.error("Auth error:", error);
            chrome.runtime.sendMessage({
                type: "AUTH_ERROR",
                error: error.message
            });
        }
    }
});
