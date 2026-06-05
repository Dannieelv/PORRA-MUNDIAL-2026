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

// Las claves "apiKey/appId" de una app WEB de Firebase son públicas por diseño
// (van al navegador de cada usuario). La seguridad la dan las reglas de Firestore.
export const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'porramundial2026-11161.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'porramundial2026-11161',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'porramundial2026-11161.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| '1078017485521',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '1:1078017485521:web:27fa9b21f4c65fbcdbf3f0',
};

export const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '4444';

export const isFirebaseConfigured = () =>
  !Object.values(firebaseConfig).some(v => v === 'PEGA_AQUI');
