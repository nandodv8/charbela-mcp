// crm-charbela/mcp-server/test/test_http_endpoints.js
// Prueba de integración HTTP para los endpoints de Streamable HTTP y OAuth 2.0

import { spawn } from "node:child_process";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("🌐 Iniciando prueba de endpoints HTTP en servidor MCP...");

  const TEST_PORT = 8089;
  const env = { ...process.env, PORT: TEST_PORT.toString() };

  const proc = spawn("node", ["src/server.js"], { env, stdio: "pipe" });

  proc.stdout.on("data", (d) => process.stdout.write(`[SERVER] ${d}`));
  proc.stderr.on("data", (d) => process.stderr.write(`[SERVER ERR] ${d}`));

  await wait(2500);

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  try {
    // 1. Health
    const resHealth = await fetch(`${baseUrl}/health`);
    const healthJson = await resHealth.json();
    console.log("1. /health ->", resHealth.status, healthJson.status);
    if (resHealth.status !== 200 || healthJson.status !== "healthy") throw new Error("Fallo en /health");

    // 2. OAuth Protected Resource Metadata
    const resMeta1 = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    const meta1Json = await resMeta1.json();
    console.log("2. /.well-known/oauth-protected-resource ->", resMeta1.status, meta1Json.authorization_servers);
    if (resMeta1.status !== 200 || !meta1Json.authorization_servers) throw new Error("Fallo en protected-resource");

    // 3. OAuth Authorization Server Metadata
    const resMeta2 = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
    const meta2Json = await resMeta2.json();
    console.log("3. /.well-known/oauth-authorization-server ->", resMeta2.status, meta2Json.authorization_endpoint);
    if (resMeta2.status !== 200 || !meta2Json.authorization_endpoint) throw new Error("Fallo en authorization-server");

    // 4. GET /authorize
    const authUrl = `${baseUrl}/authorize?client_id=charbela_oauth_client_prod_2026&redirect_uri=https://claude.ai/api/mcp/auth_callback&response_type=code&code_challenge_method=S256&code_challenge=test_challenge`;
    const resAuth = await fetch(authUrl);
    const authHtml = await resAuth.text();
    console.log("4. GET /authorize ->", resAuth.status, "HTML length:", authHtml.length, "Contiene Google:", authHtml.includes("Continuar con Google"));
    if (resAuth.status !== 200 || !authHtml.includes("Continuar con Google")) throw new Error("Fallo en HTML de /authorize");

    // 5. POST /mcp sin autenticación (debe dar 401 con cabecera WWW-Authenticate)
    const resMcp401 = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 })
    });
    const wwwAuth = resMcp401.headers.get("www-authenticate");
    console.log("5. POST /mcp (sin auth) ->", resMcp401.status, "WWW-Authenticate:", wwwAuth);
    if (resMcp401.status !== 401 || !wwwAuth || !wwwAuth.includes("resource_metadata")) {
      throw new Error("Fallo en 401 WWW-Authenticate de /mcp");
    }

    // 6. POST /mcp con API Key (initialize handshake)
    const resMcpInit = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "X-Charbela-Key": "charbela_crm_mcp_2026_sec_key"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" }
        }
      })
    });
    const initText = await resMcpInit.text();
    console.log("6. POST /mcp con Key ->", resMcpInit.status, initText.slice(0, 150));
    if (resMcpInit.status !== 200 && resMcpInit.status !== 202) {
      throw new Error(`Fallo handshake initialize: status ${resMcpInit.status}`);
    }

    console.log("\n🎉 ¡TODOS LOS ENDPOINTS HTTP, OAUTH Y STREAMABLE MCP FUNCIONAN PERFECTAMENTE!");
  } finally {
    proc.kill("SIGTERM");
  }
}

run().catch((e) => {
  console.error("Error en prueba HTTP:", e);
  process.exit(1);
});
