import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDA0B_PeZq9Qiie3NXcWy1Lrk5qt171bQ",
  authDomain: "school-c5948.firebaseapp.com",
  projectId: "school-c5948",
  storageBucket: "school-c5948.firebasestorage.app",
  messagingSenderId: "161209325093",
  appId: "1:161209325093:android:1f287c4b7ceeea3a24d1cc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore database
export const db = getFirestore(app);

// Get a reference to the Firebase authentication service
export const auth = getAuth(app);