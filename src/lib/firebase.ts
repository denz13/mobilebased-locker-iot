import Constants from 'expo-constants';
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { Platform } from 'react-native';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { initializeNativeAuth } from '@/lib/firebase-auth-rn';

type ExtraFirebase = Partial<FirebaseOptions>;

function readFirebaseOptions(): FirebaseOptions {
  const fromExtra = Constants.expoConfig?.extra?.firebase as
    | ExtraFirebase
    | undefined;

  const apiKey =
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? fromExtra?.apiKey;
  const authDomain =
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fromExtra?.authDomain;
  const projectId =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fromExtra?.projectId;
  const storageBucket =
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    fromExtra?.storageBucket;
  const messagingSenderId =
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fromExtra?.messagingSenderId;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? fromExtra?.appId;
  const measurementId =
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ??
    fromExtra?.measurementId;
  const databaseURL =
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? fromExtra?.databaseURL;

  const options: FirebaseOptions = {
    apiKey: apiKey ?? '',
    authDomain: authDomain ?? '',
    projectId: projectId ?? '',
    storageBucket: storageBucket ?? '',
    messagingSenderId: messagingSenderId ?? '',
    appId: appId ?? '',
  };

  if (measurementId) {
    options.measurementId = measurementId;
  }
  if (databaseURL?.trim()) {
    options.databaseURL = databaseURL.trim();
  }

  return options;
}

function assertConfig(config: FirebaseOptions) {
  const required: (keyof FirebaseOptions)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const missing = required.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(
      `Missing Firebase config (${missing.join(
        ', ',
      )}). Open the project root ".env" file and set every EXPO_PUBLIC_FIREBASE_* value to the non-empty strings from Firebase Console → Project settings → Your apps → Web app. Save the file, then stop Metro and run "npx expo start -c".`,
    );
  }
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let rtdbInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length) {
    return existing[0]!;
  }
  if (!appInstance) {
    const options = readFirebaseOptions();
    assertConfig(options);
    appInstance = initializeApp(options);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
    } else {
      try {
        authInstance = initializeNativeAuth(app);
      } catch {
        authInstance = getAuth(app);
      }
    }
  }
  return authInstance;
}

/** Realtime Database (requires `databaseURL` in `.env`). */
export function getFirebaseRTDB(): Database {
  const opts = readFirebaseOptions();
  if (!opts.databaseURL?.trim()) {
    throw new Error(
      'Missing EXPO_PUBLIC_FIREBASE_DATABASE_URL. Add it from Firebase Console → Realtime Database (your database URL), then restart Expo.',
    );
  }
  getFirebaseApp();
  if (!rtdbInstance) {
    rtdbInstance = getDatabase(getFirebaseApp());
  }
  return rtdbInstance;
}

/** Cloud Storage (default bucket from Firebase config). */
export function getFirebaseStorage(): FirebaseStorage {
  getFirebaseApp();
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}
