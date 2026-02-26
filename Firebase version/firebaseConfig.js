// Firebase configuration for CRA deployment
// Replaces the Firebase Studio __firebase_config global

const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';

export { firebaseConfig, appId, geminiApiKey };
