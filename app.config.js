const path = require('path');
const { loadProjectEnv } = require('@expo/env');

// Local: values come from `.env` (gitignored). EAS Build: set the same `EXPO_PUBLIC_FIREBASE_*`
// variables in expo.dev → Project → Environment variables, or `eas env:create` — otherwise the APK has no Firebase config.
loadProjectEnv(path.resolve(__dirname), { silent: true });

const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      eas: {
        ...(appJson.expo.extra?.eas ?? {}),
        projectId: '6d48d4e9-0a96-4687-b734-a2ed2906502e',
      },
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      },
    },
  },
};
