import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import clientConfig from '../firebase-applet-config.json';

// Public Firebase web configuration is not an Admin credential.
// Production uses Application Default Credentials (workload identity preferred).
export const projectId = process.env.GOOGLE_CLOUD_PROJECT || clientConfig.projectId;
export const databaseId = process.env.FIRESTORE_DATABASE_ID || clientConfig.firestoreDatabaseId;
const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (emulated && (!projectId.startsWith('demo-') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST!))) {
  throw new Error('Emulator execution requires a demo-* project and loopback emulator address');
}
const appName = 'thariktha-server';
export const adminApp = getApps().find(app => app.name === appName) || initializeApp({
  projectId, ...(!emulated ? { credential: applicationDefault() } : {}),
}, appName);
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, databaseId);
adminDb.settings({ ignoreUndefinedProperties: false });
