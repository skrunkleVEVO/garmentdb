// Firebase web app config (Firebase console → Project settings → General →
// Your apps → Web app → SDK setup and configuration → Config).
// These values are not secrets: who can read or write data is enforced by
// firestore.rules. Leave apiKey empty to run the app without cloud sync.
export const firebaseConfig = {
  apiKey: 'AIzaSyAnrP7AYVpLiB7mERz4p6D7_Fd3dK15DXc',
  authDomain: 'test-1cb4c.firebaseapp.com',
  projectId: 'test-1cb4c',
  storageBucket: 'test-1cb4c.firebasestorage.app',
  messagingSenderId: '555433687506',
  appId: '1:555433687506:web:109a9f3a834427d01f300b',
};

export const isCloudConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
