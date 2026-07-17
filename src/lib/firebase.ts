import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Web app's Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCEgjBl3Yvi3ooKPCr1CK1dmSqX5wEJEiE",
  authDomain: "dialog-gcrm.firebaseapp.com",
  projectId: "dialog-gcrm",
  storageBucket: "dialog-gcrm.firebasestorage.app",
  messagingSenderId: "197289154909",
  appId: "1:197289154909:web:6ff08f287b9203c88e30b4",
  measurementId: "G-7SGQCS7NY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore & Authentication as specified in guidelines
export const db = getFirestore(app);
export const auth = getAuth(app);

// Operational types for Firestore error formatting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global standardized error handler for Firestore permission errors
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: client appears to be offline.");
    } else {
      console.warn("Firestore connection check completed. Permission denied or collection empty (expected for sandbox initialization).");
    }
  }
}

// Run connection check immediately
testConnection();
