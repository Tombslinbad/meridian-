import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-meridianchinaadv-493f2aa2-6e54-4be0-b78d-3ae62d97a09c");
