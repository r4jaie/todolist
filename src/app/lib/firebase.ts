import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi
const firebaseConfig = {
  apiKey: "AIzaSyB83SH-1lA8JYR6Htm229DuaEksb5IAzJ4",
  authDomain: "to-do-list-ea930.firebaseapp.com",
  projectId: "to-do-list-ea930",
  storageBucket: "to-do-list-ea930.firebasestorage.app",
  messagingSenderId: "263789095964",
  appId: "1:263789095964:web:6d578e4f926e83f5f843d9",
  measurementId: "G-JWF4G0D4QW",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
