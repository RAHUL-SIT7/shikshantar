import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDDA0B_PeZq9Qiie3NXcWy1Lrk5qt171bQ",
  authDomain: "school-c5948.firebaseapp.com",
  projectId: "school-c5948",
  storageBucket: "school-c5948.firebasestorage.app",
  messagingSenderId: "161209325093",
  appId: "1:161209325093:android:1f287c4b7ceeea3a24d1cc"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
