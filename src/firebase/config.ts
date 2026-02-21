import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyC3dc7VwrT_1D855o0FuGox68sNolUWxh4",
    authDomain: "lito-extension.firebaseapp.com",
    projectId: "lito-extension",
    storageBucket: "lito-extension.firebasestorage.app",
    messagingSenderId: "288510893885",
    appId: "1:288510893885:web:fc87f091092fe21399af54",
    measurementId: "G-XJPTBB08FY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
