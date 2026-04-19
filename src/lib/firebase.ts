import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function assertConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Missing Firebase config: ${missing.join(
        ', ',
      )}. Add EXPO_PUBLIC_FIREBASE_* env vars.`,
    );
  }
}

export const firebaseApp = (() => {
  if (!getApps().length) {
    assertConfig();
    return initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
})();

export const auth = getAuth(firebaseApp);

