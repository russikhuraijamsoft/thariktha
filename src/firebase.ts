import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfigData from './firebase-applet-config.json';

// Determine if real or placeholder firebase credential exists
const isRealFirebase = !!(firebaseConfigData.apiKey && !firebaseConfigData.apiKey.includes("PlaceholderJustForLocalCompiles"));
const firebaseConfig = firebaseConfigData;

if (isRealFirebase) {
  console.log("Firebase initialized successfully using firebase-applet-config.json with offline cache");
} else {
  console.log("Using Local Secure Sandbox Auth mode with offline cache support");
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configure Firestore to support robust multi-tab IndexedDb offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const isCloudConnected = isRealFirebase;
export const rawConfig = firebaseConfig;
