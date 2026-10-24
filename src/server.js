// crm-charbela/mcp-server/src/server.js
// Servidor MCP Oficial de Charbela Pastelería para Google Cloud Run y Claude Cowork
// Soporta Streamable HTTP (/mcp) moderno, SSE (/sse) y OAuth 2.0 con Login Google

import http from "node:http";
import { URL } from "node:url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createCharbelaMcpServer } from "./createMcpServer.js";
import { firebaseConfig, mcpAuthReady } from "./firebase.js";
import {
  RESOURCE_URL,
  getOAuthClientId,
  getAllowedRedirectUris,
  getAuthorizedUser,
  verifyGoogleIdToken,
  createAuthorizationCode,
  consumeAuthorizationCode,
  issueTokens,
  rotateRefreshToken,
  verifyOAuthAccessToken
} from "./oauthServer.js";

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.MCP_API_KEY || "charbela_crm_mcp_2026_sec_key";
const transports = {};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Charbela-Key, X-Api-Key, X-Operator-Email, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate"
  );
}

async function parseBody(req) {
  let bodyText = "";
  for await (const chunk of req) {
    bodyText += chunk;
  }
  return bodyText;
}

/**
 * Resuelve el actor / usuario autenticado por Bearer Token o API Key
 */
async function resolveActorContext(headers, query = {}) {
  const authHeader = headers["authorization"] || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    // 1. Verificar si es JWT emitido por OAuth
    const oauthActor = await verifyOAuthAccessToken(token);
    if (oauthActor) return oauthActor;

    // 2. O si es la API Key enviada como Bearer
    if (token === API_KEY) {
      return { uid: "admin-key", email: "admin@charbela.com", role: "admin", name: "Charbela Admin", source: "api-key" };
    }
  }

  // Verificar headers de API Key
  const keyHeader = headers["x-charbela-key"] || headers["x-api-key"] || query.apiKey || query.key;
  if (keyHeader && keyHeader === API_KEY) {
    return { uid: "admin-key", email: "admin@charbela.com", role: "admin", name: "Charbela Admin", source: "api-key" };
  }

  return null;
}

const serverInstance = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const reqUrl = new URL(req.url || "/", `${proto}://${host}`);
  const pathname = reqUrl.pathname;
  const query = Object.fromEntries(reqUrl.searchParams.entries());

  // =========================================================================
  // 1. DIAGNÓSTICO Y HEALTH CHECK
  // =========================================================================
  if (pathname === "/health") {
    const firestoreAuthenticated = await mcpAuthReady;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "charbela-crm-mcp",
        version: "2.1.0",
        uptimeSeconds: Math.floor(process.uptime()),
        activeSessions: Object.keys(transports).length,
        firestoreAuthenticated,
        firestoreAuthNote: firestoreAuthenticated
          ? "Autenticado — las herramientas de escritura pueden guardar en Firestore."
          : "SIN autenticar — las herramientas de escritura van a fallar con PERMISSION_DENIED. Configura MCP_FIREBASE_EMAIL / MCP_FIREBASE_PASSWORD.",
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "online",
        name: "Charbela Pastelería CRM MCP Cloud Server",
        version: "2.1.0",
        protocols: ["Streamable HTTP (/mcp)", "SSE (/sse)"],
        auth: "OAuth 2.0 (Google Login) / API Key",
        endpoints: {
          mcp: "/mcp",
          sse: "/sse",
          authorize: "/authorize",
          token: "/token",
          health: "/health"
        }
      })
    );
    return;
  }

  // =========================================================================
  // 2. METADATOS DE DESCUBRIMIENTO OAUTH (RFC 9728 y RFC 8414)
  // =========================================================================
  if (
    (pathname === "/.well-known/oauth-protected-resource" ||
      pathname === "/.well-known/oauth-protected-resource/mcp") &&
    req.method === "GET"
  ) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        resource: RESOURCE_URL,
        authorization_servers: [RESOURCE_URL],
        scopes_supported: ["mcp:read", "mcp:write"],
        bearer_methods_supported: ["header"]
      })
    );
    return;
  }

  if (pathname === "/.well-known/oauth-authorization-server" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        issuer: RESOURCE_URL,
        authorization_endpoint: `${RESOURCE_URL}/authorize`,
        token_endpoint: `${RESOURCE_URL}/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"]
      })
    );
    return;
  }

  // =========================================================================
  // 3. ENDPOINT /authorize (Login con Cuenta de Google + PKCE)
  // =========================================================================
  if (pathname === "/authorize") {
    const clientId = reqUrl.searchParams.get("client_id") || "";
    const redirectUri = reqUrl.searchParams.get("redirect_uri") || "";
    const codeChallenge = reqUrl.searchParams.get("code_challenge") || "";
    const codeChallengeMethod = reqUrl.searchParams.get("code_challenge_method") || "";
    const state = reqUrl.searchParams.get("state") || "";
    const resource = reqUrl.searchParams.get("resource") || RESOURCE_URL;

    const configuredClientId = getOAuthClientId();
    const effectiveClientId = clientId || configuredClientId;

    const allowedRedirects = getAllowedRedirectUris();
    if (!redirectUri || !allowedRedirects.includes(redirectUri)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_request", error_description: "redirect_uri no permitida" }));
      return;
    }

    if (codeChallengeMethod !== "S256" || !codeChallenge) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_request", error_description: "code_challenge_method=S256 y code_challenge son requeridos (PKCE)" }));
      return;
    }

    // POST /authorize: Recibe el ID Token de Google tras inicio de sesión en el navegador
    if (req.method === "POST") {
      try {
        const bodyText = await parseBody(req);
        const data = JSON.parse(bodyText);
        const idToken = data.idToken;

        if (!idToken) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_request", error_description: "Falta idToken de Google" }));
          return;
        }

        // Verificar token de Google con Firebase Identity Toolkit
        const user = await verifyGoogleIdToken(idToken);
        const email = user.email;

        // Comprobar si el usuario pertenece al equipo de Charbela CRM
        const authorizedUser = await getAuthorizedUser(email);
        if (!authorizedUser) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "access_denied",
              error_description: `Acceso denegado: el correo ${email} no está registrado en el equipo autorizado de Charbela CRM.`
            })
          );
          return;
        }

        // Crear código de autorización de un solo uso (60s)
        const code = await createAuthorizationCode({
          codeChallenge,
          clientId: clientId || configuredClientId,
          redirectUri,
          uid: user.uid,
          email,
          role: authorizedUser.role,
          resource
        });

        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set("code", code);
        if (state) targetUrl.searchParams.set("state", state);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ redirectUrl: targetUrl.toString() }));
      } catch (err) {
        console.error("[OAuth Authorize Error]:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "server_error", error_description: err.message }));
      }
      return;
    }

    // GET /authorize: Renderizar pantalla de autenticación con Google estilo Charbela
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar Charbela Pastelería CRM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Parkinsans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-cream: #FCFBF0;
      --choco: #5C3339;
      --card-bg: #FFFFFF;
      --border-color: #E6DCCD;
      --accent-pink: #F43F5E;
      --accent-pink-hover: #E11D48;
      --text-muted: #78716C;
    }
    body {
      font-family: 'Parkinsans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-cream);
      color: var(--choco);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: var(--card-bg);
      border: 2px solid var(--border-color);
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(92, 51, 57, 0.08);
      text-align: center;
      box-sizing: border-box;
    }
    .badge-logo {
      font-size: 42px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 10px 0;
      font-weight: 700;
      color: var(--choco);
    }
    p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 26px 0;
    }
    .btn-google {
      background: #FFFFFF;
      color: #3C4043;
      border: 1.5px solid #DADCE0;
      border-radius: 12px;
      padding: 13px 20px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(60,64,67, 0.08);
      box-sizing: border-box;
    }
    .btn-google:hover {
      background: #F8FAFC;
      border-color: #C2C7D0;
      box-shadow: 0 2px 6px rgba(60,64,67, 0.15);
    }
    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .loading {
      display: none;
      margin-top: 18px;
      color: var(--choco);
      font-size: 14px;
      font-weight: 600;
    }
    .error {
      margin-top: 18px;
      padding: 12px 14px;
      background: #FFF1F2;
      border: 1.5px solid #FECDD3;
      border-radius: 10px;
      color: #BE123C;
      font-size: 13px;
      display: none;
      text-align: left;
      line-height: 1.4;
    }
    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: #A8A29E;
    }
  </style>
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    const firebaseConfig = ${JSON.stringify(firebaseConfig)};

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    window.loginWithGoogle = async function() {
      const errBox = document.getElementById("error");
      const loading = document.getElementById("loading");
      const btn = document.getElementById("btn-login");
      errBox.style.display = "none";
      loading.style.display = "block";
      btn.disabled = true;

      try {
        const result = await signInWithPopup(auth, provider);
        const idToken = await result.user.getIdToken();

        const resp = await fetch(window.location.href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error_description || data.error || "Acceso denegado");
        }

        window.location.href = data.redirectUrl;
      } catch (err) {
        loading.style.display = "none";
        btn.disabled = false;
        errBox.textContent = err.message;
        errBox.style.display = "block";
      }
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="badge-logo">🍰</div>
    <h1>Conectar Charbela CRM</h1>
    <p>Autoriza a tu asistente de IA en Claude para acceder a pedidos, obrador, finanzas y nómina de Charbela Pastelería.</p>
    <button id="btn-login" class="btn-google" onclick="loginWithGoogle()">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continuar con Google
    </button>
    <div id="loading" class="loading">Verificando autorización en Charbela...</div>
    <div id="error" class="error"></div>
    <div class="footer-note">Acceso restringido exclusivamente al equipo de Charbela Pastelería.</div>
  </div>
</body>
</html>`);
    return;
  }

  // =========================================================================
  // 4. ENDPOINT /token (Intercambio de código por JWT Access Token)
  // =========================================================================
  if (pathname === "/token" && req.method === "POST") {
    try {
      const bodyText = await parseBody(req);
      let params = {};

      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const parsed = new URLSearchParams(bodyText);
        params = Object.fromEntries(parsed.entries());
      } else {
        try {
          params = JSON.parse(bodyText);
        } catch (_) {
          const parsed = new URLSearchParams(bodyText);
          params = Object.fromEntries(parsed.entries());
        }
      }

      const grantType = params.grant_type;
      const clientId = params.client_id;
      const configuredClientId = getOAuthClientId();
      const effectiveClientId = clientId || configuredClientId;

      if (grantType === "authorization_code") {
        const code = params.code;
        const redirectUri = params.redirect_uri;
        const codeVerifier = params.code_verifier;

        if (!code || !redirectUri || !codeVerifier) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_request", error_description: "Faltan parámetros code, redirect_uri o code_verifier" }));
          return;
        }

        const consumed = await consumeAuthorizationCode(code, clientId || configuredClientId, redirectUri, codeVerifier);
        const tokens = await issueTokens({
          uid: consumed.uid,
          email: consumed.email,
          role: consumed.role,
          resource: consumed.resource || RESOURCE_URL,
          clientId: clientId || configuredClientId
        });

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache"
        });
        res.end(
          JSON.stringify({
            access_token: tokens.accessToken,
            token_type: "Bearer",
            expires_in: tokens.expiresIn,
            refresh_token: tokens.refreshToken,
            scope: "mcp:read mcp:write"
          })
        );
        return;
      }

      if (grantType === "refresh_token") {
        const refreshToken = params.refresh_token;
        if (!refreshToken) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_request", error_description: "Falta refresh_token" }));
          return;
        }

        const rotated = await rotateRefreshToken(refreshToken, clientId || configuredClientId);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache"
        });
        res.end(
          JSON.stringify({
            access_token: rotated.accessToken,
            token_type: "Bearer",
            expires_in: rotated.expiresIn,
            refresh_token: rotated.refreshToken,
            scope: "mcp:read mcp:write"
          })
        );
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unsupported_grant_type", error_description: "Solo se admiten authorization_code y refresh_token" }));
    } catch (err) {
      console.error("[OAuth /token Error]:", err);
      const msg = err.message || "";
      if (msg.startsWith("invalid_grant")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: msg }));
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "server_error", error_description: msg }));
      }
    }
    return;
  }

  // =========================================================================
  // 5. ENDPOINT STREAMABLE HTTP (/mcp) - TRANSPORTE MODERNO SIN ESTADO
  // =========================================================================
  if (pathname === "/mcp") {
    try {
      const actor = await resolveActorContext(req.headers, query);
      if (!actor) {
        res.writeHead(401, {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource"`
        });
        res.end(
          JSON.stringify({
            error: "Acceso no autorizado",
            message: "Se requiere autorización OAuth con cuenta de Google autorizada o clave X-Charbela-Key."
          })
        );
        return;
      }

      // Modo sin estado para balanceo en Cloud Run
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
      });

      const server = createCharbelaMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("[Streamable HTTP Error]:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error en transporte Streamable HTTP" }));
      }
    }
    return;
  }

  // =========================================================================
  // 6. ENDPOINT SSE (/sse) - TRANSPORTE RETROCOMPATIBLE
  // =========================================================================
  if (pathname === "/sse" && req.method === "GET") {
    try {
      const actor = await resolveActorContext(req.headers, query);
      if (!actor) {
        res.writeHead(401, {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${RESOURCE_URL}/.well-known/oauth-protected-resource"`
        });
        res.end(
          JSON.stringify({
            error: "Acceso no autorizado",
            message: "Se requiere autenticación OAuth con Google o clave X-Charbela-Key."
          })
        );
        return;
      }

      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      transport.onclose = () => {
        delete transports[sessionId];
      };

      const server = createCharbelaMcpServer();
      await server.connect(transport);
    } catch (err) {
      console.error("[SSE Error]:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error al iniciar conexión SSE" }));
      }
    }
    return;
  }

  // =========================================================================
  // 7. ENDPOINT MESSAGES (/messages) - MENSAJES POST PARA SSE RETROCOMPATIBLE
  // =========================================================================
  if (pathname === "/messages" && req.method === "POST") {
    const sessionId = query.sessionId;
    if (!sessionId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Falta el parámetro sessionId en la URL" }));
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Sesión no encontrada o expirada" }));
      return;
    }

    try {
      const bodyText = await parseBody(req);
      const bodyJson = bodyText ? JSON.parse(bodyText) : {};
      await transport.handlePostMessage(req, res, bodyJson);
    } catch (err) {
      console.error("[Messages Error]:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error procesando mensaje" }));
      }
    }
    return;
  }

  // Ruta 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Ruta no encontrada", pathname }));
});

const serverInstanceActive = serverInstance.listen(PORT, "0.0.0.0", () => {
  console.log(`🍰 Servidor MCP Charbela escuchando en http://0.0.0.0:${PORT}`);
  console.log(`   Streamable HTTP: /mcp`);
  console.log(`   OAuth 2.0 Login Google: /authorize`);
  console.log(`   SSE Retrocompatible: /sse`);
  console.log(`   Health Check: /health`);
});

process.on("SIGTERM", async () => {
  console.log("Recibida señal SIGTERM. Cerrando...");
  for (const id in transports) {
    try {
      await transports[id].close();
    } catch (_) {}
  }
  serverInstanceActive.close(() => {
    process.exit(0);
  });
});
