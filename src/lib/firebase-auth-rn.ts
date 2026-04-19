import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

/**
 * `getReactNativePersistence` is not exported from the `firebase/auth` TypeScript entry
 * (web typings). It lives on the React Native build of `@firebase/auth`; we load that
 * bundle at runtime so sessions persist in AsyncStorage on iOS/Android.
 */
type ReactNativeAuthEntry = {
  initializeAuth: (app: FirebaseApp, opts: { persistence: unknown }) => Auth;
  getReactNativePersistence: (
    storage: typeof ReactNativeAsyncStorage,
  ) => unknown;
};

export function initializeNativeAuth(app: FirebaseApp): Auth {
  const rnAuth = require('@firebase/auth/dist/rn/index.js') as ReactNativeAuthEntry;
  return rnAuth.initializeAuth(app, {
    persistence: rnAuth.getReactNativePersistence(ReactNativeAsyncStorage),
  });
}
