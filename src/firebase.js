// mcp-charbela/src/firebase.js
// Conexión segura a Firestore para el MCP Server de Charbela CRM

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCty9VLw06dPnXZ7vtleOb_GWSsRq9ulNI",
  authDomain: "charbela-crm.firebaseapp.com",
  projectId: "charbela-crm",
  storageBucket: "charbela-crm.firebasestorage.app",
  messagingSenderId: "775456671841",
  appId: "1:775456671841:web:e97fa4e348ece9e9d6c220"
};

const app = initializeApp(firebaseConfig, "mcp-charbela-app");
export const db = getFirestore(app);
export const storage = getStorage(app);
