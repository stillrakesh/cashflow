import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCCrZKm0Vv3Ye262psyjxaM6vzndbAJ-fk",
  authDomain: "tyde-eef98.firebaseapp.com",
  projectId: "tyde-eef98",
  storageBucket: "tyde-eef98.firebasestorage.app",
  messagingSenderId: "338397798562",
  appId: "1:338397798562:web:703c692915d9580ed1f7fb",
  measurementId: "G-55R9J4S6BY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
