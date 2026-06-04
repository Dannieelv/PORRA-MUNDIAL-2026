// ============================================================
//  CONFIGURACIÓN DE FIREBASE — RELLENA ESTOS DATOS
// ------------------------------------------------------------
//  1. https://console.firebase.google.com → nuevo proyecto (gratis)
//  2. Añade una App Web (icono </>) → copia el firebaseConfig
//  3. Pega los valores abajo (sustituyendo los "PEGA_AQUI")
//  4. Build > Firestore Database > Crear BD (modo producción, región eur3)
//  5. Reglas de Firestore: allow read, write: if true;
//  Mientras no se rellene, la app funciona en modo LOCAL (localStorage)
// ============================================================

export const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'PEGA_AQUI',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'PEGA_AQUI',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'PEGA_AQUI',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'PEGA_AQUI',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| 'PEGA_AQUI',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || 'PEGA_AQUI',
};

export const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '4444';

export const isFirebaseConfigured = () =>
  !Object.values(firebaseConfig).some(v => v === 'PEGA_AQUI');
