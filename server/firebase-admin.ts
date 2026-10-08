import type { ServiceAccount } from 'firebase-admin/app';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK for server-side auth verification
let adminApp: any = null;
let adminDb: any = null;
let adminAuth: any = null;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
    });
  } else {
    console.warn('[SERVER] No Firebase Admin credentials found. Auth middleware will reject all requests.');
    console.warn('[SERVER] Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY env var.');
  }

  if (adminApp) {
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  }
} catch (error: any) {
  console.error('[SERVER] Firebase Admin initialization error:', error.message);
}

export { adminApp, adminDb, adminAuth };
