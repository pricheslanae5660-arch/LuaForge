import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAiIo7zRoKh683bKA8ih_D6CX7YKgULnZo",
  authDomain: "luaforge-b89c5.firebaseapp.com",
  projectId: "luaforge-b89c5",
  storageBucket: "luaforge-b89c5.firebasestorage.app",
  messagingSenderId: "56901994452",
  appId: "1:56901994452:web:d7a05198c7d09272c1f841",
  measurementId: "G-BQHRT6BK95"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;


