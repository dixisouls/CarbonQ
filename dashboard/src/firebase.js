import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDfZOIRHZ9a-boj2FrQQ_uIe2WiZ9IK9Ug",
  authDomain: "carbonq-1d456.firebaseapp.com",
  projectId: "carbonq-1d456",
  storageBucket: "carbonq-1d456.firebasestorage.app",
  messagingSenderId: "78491951586",
  appId: "1:678491951586:web:2691ce142351b9235c29bb",
  measurementId: "G-0DNJWLYKYC",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
};
