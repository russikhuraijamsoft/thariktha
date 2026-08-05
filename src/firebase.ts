import { app, db, auth, firebaseConfig } from './services/firebaseConfig';

export { app, db, auth, firebaseConfig };
export const isCloudConnected = !!(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PlaceholderJustForLocalCompiles"));
export const rawConfig = firebaseConfig;

