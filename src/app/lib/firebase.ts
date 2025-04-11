import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
  apiKey: "AIzaSyACCeZOQy2X5zPwxu2P1AmRy4HZb1s4RbI",
  authDomain: "to-do-list-f65d5.firebaseapp.com",
  projectId: "to-do-list-f65d5",
  storageBucket: "to-do-list-f65d5.firebasestorage.app",
  messagingSenderId: "921081749662",
  appId: "1:921081749662:web:1e4db4a3eccf551675db8f",
  measurementId: "G-BZTTTD515S",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };