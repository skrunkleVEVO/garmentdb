// Firebase web app config (Firebase console → Project settings → General →
// Your apps → Web app → SDK setup and configuration → Config).
// These values are not secrets: who can read or write data is enforced by
// firestore.rules. Leave apiKey empty to run the app without cloud sync.
export const firebaseConfig = {
  apiKey: 'AIzaSyB8GPMttC1nVKLxlYlQAGxx_tSik59Alv4',
  authDomain: 'garmentdb.firebaseapp.com',
  projectId: 'garmentdb',
  storageBucket: 'garmentdb.firebasestorage.app',
  messagingSenderId: '25003811936',
  appId: '1:25003811936:web:16b47fe4572eb7ae630f05',
};

export const isCloudConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
