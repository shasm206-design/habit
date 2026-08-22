import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_vYliSOjqocwmUmd1uckZsC5zpBBWwjM",
  authDomain: "habit-1affd.firebaseapp.com",
  projectId: "habit-1affd",
  storageBucket: "habit-1affd.firebasestorage.app",
  messagingSenderId: "986390418060",
  appId: "1:986390418060:web:8fc6a6a28287673ef661a9",
  measurementId: "G-6LF2HRJ4ES"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();