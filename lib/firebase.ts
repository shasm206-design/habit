import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "ضع_هنا_API_KEY",
  authDomain: "habit-1affd.firebaseapp.com",
  projectId: "habit-1affd",
  storageBucket: "habit-1affd.appspot.com",
  messagingSenderId: "ضع_هنا_المعرف",
  appId: "ضع_هنا_APP_ID",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();