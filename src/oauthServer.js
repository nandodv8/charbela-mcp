// crm-charbela/mcp-server/src/oauthServer.js
// Servidor de Autorización OAuth 2.0 / 2.1 con PKCE (S256) y Login con Google
// Diseñado para conexión nativa y sin fricción con Claude Web / Cowork / Desktop

import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db, firebaseConfig } from "./firebase.js";
import { collection, doc, getDoc, setDoc, updateDoc, runTransaction } from "firebase/firestore";

export const RESOURCE_URL = process.env.CHARBELA_MCP_URL || "https://charbela-mcp-775456671841.us-central1.run.app";
export const CODES_COLLECTION = "oauth_codes";
export const TOKENS_COLLECTION = "oauth_tokens";
export const ROLES_COLLECTION = "oauth_user_roles";

// Lista canónica de respaldo para el equipo clave de Charbela
export const CANONICAL_ROLES = {
  "charbelita314@gmail.com": { role: "admin", name: "Charbela Pizarro" },
  "gladysaltospizarro@gmail.com": { role: "admin", name: "Gladys Saltos Pizarro" },
  "fcolombo87@gmail.com": { role: "admin", name: "Fernando Colombo" },
  "gracesantoszamora@hotmail.com": { role: "contador", name: "Grace Santos" },
  "july.villafuerte.p@gmail.com": { role: "decoradora", name: "Juli Villafuerte" },
  "zambucha.ec@gmail.com": { role: "operador", name: "Zambu" }
};

export function getOAuthClientId() {
  return (process.env.CHARBELA_OAUTH_CLIENT_ID || "charbela_oauth_client_prod_2026").trim();
}

export function getOAuthSigningKey() {
  const secret = (process.env.CHARBELA_OAUTH_SIGNING_KEY || "charbela_super_secret_jwt_signing_key_32_chars_min").trim();
  return new TextEncoder().encode(secret);
}

export function getAllowedRedirectUris() {
  const raw = process.env.CHARBELA_OAUTH_REDIRECT_URIS || "";
  const list = raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const defaults = [
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.ai/api/mcp/oauth/callback",
    "https://claude.ai/oauth/callback",
    "http://localhost:3000/callback",
    "http://127.0.0.1:3000/callback"
  ];
  return Array.from(new Set([...list, ...defaults]));
}

/**
 * Valida si un correo electrónico pertenece a un usuario autorizado de Charbela CRM.
 * Consulta primero la colección 'usuarios' de Firestore, luego 'oauth_user_roles', y finalmente el fallback canónico.
 */
export async function getAuthorizedUser(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  // 1. Verificar en colección oficial 'usuarios' de Charbela CRM
  try {
    const { getDocs, query, where } = await import("firebase/firestore");
    const q = query(collection(db, "usuarios"), where("email", "==", cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const uData = snap.docs[0].data();
      return {
        role: uData.rol || "operador",
        name: uData.nombre || cleanEmail,
        uid: snap.docs[0].id
      };
    }
  } catch (err) {
    console.warn(`[OAuth] No se pudo consultar colección 'usuarios' para ${cleanEmail}:`, err.message);
  }

  // 2. Verificar en roles específicos de OAuth en Firestore si existen
  try {
    const docId = encodeURIComponent(cleanEmail);
    const snap = await getDoc(doc(db, ROLES_COLLECTION, docId));
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.role) {
        return {
          role: data.role,
          name: data.name || cleanEmail,
          uid: data.uid || `oauth-${cleanEmail}`
        };
      }
    }
  } catch (err) {
    console.warn(`[OAuth] Error leyendo ${ROLES_COLLECTION}:`, err.message);
  }

  // 3. Fallback canónico directo
  const canonical = CANONICAL_ROLES[cleanEmail];
  if (canonical) {
    return {
      role: canonical.role,
      name: canonical.name,
      uid: `canonical-${cleanEmail}`
    };
  }

  return null;
}

/**
 * Valida un token ID de Google (emitido por Firebase Auth en el popup del navegador)
 * usando el endpoint seguro de Google Identity Toolkit.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error("Token de autenticación faltante");

  const apiKey = firebaseConfig.apiKey;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  const data = await res.json();
  if (!res.ok || !data.users || data.users.length === 0) {
    throw new Error(data.error?.message || "Token de Google inválido o expirado");
  }

  const user = data.users[0];
  return {
    uid: user.localId,
    email: (user.email || "").toLowerCase().trim(),
    name: user.displayName || user.email,
    photoUrl: user.photoUrl
  };
}

/**
 * Valida un code_verifier contra un code_challenge (S256).
 */
export function verifyCodeChallenge(verifier, challenge) {
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return computed === challenge;
}

/**
 * Crea un código de autorización temporal con PKCE (vida útil: 60s)
 */
export async function createAuthorizationCode(params) {
  const code = "charbela_code_" + crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 60 * 1000;

  await setDoc(doc(db, CODES_COLLECTION, code), {
    codeChallenge: params.codeChallenge,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    uid: params.uid,
    email: params.email,
    role: params.role,
    resource: params.resource || RESOURCE_URL,
    expiresAt,
    used: false,
    createdAt: Date.now()
  });

  return code;
}

/**
 * Consume atómicamente un código de autorización comprobando que no esté usado ni vencido
 */
export async function consumeAuthorizationCode(code, clientId, redirectUri, codeVerifier) {
  const codeRef = doc(db, CODES_COLLECTION, code);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(codeRef);
    if (!snap.exists()) {
      throw new Error("invalid_grant: El código de autorización no existe");
    }

    const data = snap.data();
    if (data.used) {
      throw new Error("invalid_grant: El código de autorización ya fue utilizado");
    }

    if (Date.now() > data.expiresAt) {
      throw new Error("invalid_grant: El código de autorización ha expirado");
    }

    if (data.clientId !== clientId) {
      throw new Error("invalid_grant: El client_id no coincide");
    }

    if (data.redirectUri !== redirectUri) {
      throw new Error("invalid_grant: El redirect_uri no coincide");
    }

    if (!verifyCodeChallenge(codeVerifier, data.codeChallenge)) {
      throw new Error("invalid_grant: PKCE code_verifier inválido");
    }

    tx.update(codeRef, {
      used: true,
      usedAt: Date.now()
    });

    return {
      uid: data.uid,
      email: data.email,
      role: data.role,
      resource: data.resource || RESOURCE_URL
    };
  });
}

/**
 * Emite Access Token (JWT firmado, 1 hora) y Refresh Token (30 días en Firestore)
 */
export async function issueTokens(params) {
  const signingKey = getOAuthSigningKey();
  const expiresIn = 3600; // 1 hora

  const accessToken = await new SignJWT({
    email: params.email,
    role: params.role,
    name: params.name || params.email
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(params.uid)
    .setIssuer(RESOURCE_URL)
    .setAudience(params.resource || RESOURCE_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(signingKey);

  const refreshToken = "charbela_rt_" + crypto.randomBytes(32).toString("base64url");
  await setDoc(doc(db, TOKENS_COLLECTION, refreshToken), {
    uid: params.uid,
    email: params.email,
    role: params.role,
    resource: params.resource || RESOURCE_URL,
    clientId: params.clientId,
    revoked: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 3600 * 1000 // 30 días
  });

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
}

/**
 * Rota un refresh token: invalida el anterior y genera un nuevo par de tokens
 */
export async function rotateRefreshToken(refreshToken, clientId) {
  const tokenRef = doc(db, TOKENS_COLLECTION, refreshToken);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(tokenRef);
    if (!snap.exists()) {
      throw new Error("invalid_grant: Refresh token no válido");
    }

    const data = snap.data();
    if (data.revoked) {
      throw new Error("invalid_grant: Refresh token revocado");
    }

    if (Date.now() > data.expiresAt) {
      throw new Error("invalid_grant: Refresh token expirado");
    }

    if (data.clientId !== clientId) {
      throw new Error("invalid_grant: Client id no coincide");
    }

    tx.update(tokenRef, { revoked: true, revokedAt: Date.now() });

    const newRefreshToken = "charbela_rt_" + crypto.randomBytes(32).toString("base64url");
    const newRef = doc(db, TOKENS_COLLECTION, newRefreshToken);

    tx.set(newRef, {
      uid: data.uid,
      email: data.email,
      role: data.role,
      resource: data.resource,
      clientId: data.clientId,
      revoked: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000
    });

    const signingKey = getOAuthSigningKey();
    const expiresIn = 3600;

    const accessToken = await new SignJWT({
      email: data.email,
      role: data.role,
      name: data.name || data.email
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(data.uid)
      .setIssuer(RESOURCE_URL)
      .setAudience(data.resource || RESOURCE_URL)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(signingKey);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn
    };
  });
}

/**
 * Verifica un Bearer JWT emitido por Charbela OAuth
 */
export async function verifyOAuthAccessToken(token, expectedResource = RESOURCE_URL) {
  try {
    const signingKey = getOAuthSigningKey();
    const { payload } = await jwtVerify(token, signingKey, {
      issuer: RESOURCE_URL,
      audience: expectedResource
    });

    const email = (payload.email || "").toLowerCase().trim();
    const role = payload.role || "operador";
    const name = payload.name || email;
    const uid = payload.sub || "oauth-user";

    return {
      uid,
      email,
      name,
      role,
      source: "oauth"
    };
  } catch (err) {
    return null;
  }
}
