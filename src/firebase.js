// mcp-charbela/src/firebase.js
// Conexión segura a Firestore para el MCP Server de Charbela CRM

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * firestore.rules exige `request.auth != null` para escribir en casi todas
 * las colecciones (padres_v2, productos_v2, usuarios, gastos, etc.). Este
 * servidor usa el SDK cliente (no Admin SDK), así que sin iniciar sesión
 * aquí, CUALQUIER tool de escritura falla en silencio con PERMISSION_DENIED
 * — no solo las de catálogo nuevas, también crear_pedido, registrar_gasto,
 * etc. si nunca se inició sesión antes en este proceso.
 *
 * Se autentica con una cuenta de servicio dedicada (rol 'admin' en
 * usuarios/{uid}, creada para esto — ver tipo: "servicio / agente mcp"),
 * usando credenciales por variables de entorno, nunca hardcodeadas. Si no
 * están configuradas, el servidor sigue arrancando igual que antes (sin
 * romper el comportamiento actual) pero las escrituras seguirán fallando;
 * el log dice exactamente por qué.
 */
const MCP_FIREBASE_EMAIL = process.env.MCP_FIREBASE_EMAIL;
const MCP_FIREBASE_PASSWORD = process.env.MCP_FIREBASE_PASSWORD;

export const mcpAuthReady = (async () => {
  if (!MCP_FIREBASE_EMAIL || !MCP_FIREBASE_PASSWORD) {
    console.error(
      "⚠️  MCP_FIREBASE_EMAIL / MCP_FIREBASE_PASSWORD no están configuradas. " +
      "Las herramientas de escritura van a fallar con PERMISSION_DENIED contra Firestore " +
      "hasta que se configuren estas variables de entorno con la cuenta de servicio del agente."
    );
    return false;
  }
  try {
    await signInWithEmailAndPassword(auth, MCP_FIREBASE_EMAIL, MCP_FIREBASE_PASSWORD);
    console.error(`✅ MCP autenticado contra Firestore como ${MCP_FIREBASE_EMAIL}.`);
    return true;
  } catch (err) {
    console.error(`❌ Falló el inicio de sesión del MCP contra Firebase Auth: ${err.message}`);
    return false;
  }
})();
