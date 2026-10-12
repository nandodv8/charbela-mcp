#!/usr/bin/env node
// verificar_mcp.mjs
// Prueba real del servidor: lo levanta por stdio, hace el handshake MCP y pide
// la lista de herramientas. Sale 0 si responde, 1 si no.
// Uso: node verificar_mcp.mjs <rutaNode> <rutaIndexJs>

import { spawn } from "node:child_process";

const [nodeBin, indexPath] = process.argv.slice(2);
const TIMEOUT_MS = 45000;
const MINIMO_TOOLS = 1;

if (!nodeBin || !indexPath) {
  console.error("Uso: node verificar_mcp.mjs <rutaNode> <rutaIndexJs>");
  process.exit(2);
}

const servidor = spawn(nodeBin, [indexPath], { stdio: ["pipe", "pipe", "pipe"] });

let buffer = "";
let stderr = "";
let id = 0;
const pendientes = new Map();

let listo = false;

servidor.on("error", (e) => {
  console.error(`   No se pudo iniciar el servidor: ${e.message}`);
  process.exit(1);
});

// Si el proceso muere antes del handshake, fallar de inmediato en vez de
// esperar los 45s del timeout.
servidor.on("exit", (codigo, senal) => {
  if (listo) return;
  console.error(
    `   El servidor se cerró antes de responder (código ${codigo ?? "?"}${senal ? `, señal ${senal}` : ""}).`
  );
  mostrarStderr();
  process.exit(1);
});

servidor.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let corte;
  while ((corte = buffer.indexOf("\n")) >= 0) {
    const linea = buffer.slice(0, corte).trim();
    buffer = buffer.slice(corte + 1);
    if (!linea) continue;
    let msg;
    try {
      msg = JSON.parse(linea);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pendientes.has(msg.id)) {
      pendientes.get(msg.id)(msg);
      pendientes.delete(msg.id);
    }
  }
});

servidor.stderr.on("data", (c) => {
  stderr += c.toString();
});

function enviar(method, params) {
  const miId = ++id;
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`el servidor no respondió a "${method}" en ${TIMEOUT_MS / 1000}s`)),
      TIMEOUT_MS
    );
    pendientes.set(miId, (m) => {
      clearTimeout(t);
      if (m.error) reject(new Error(`${method}: ${m.error.message || JSON.stringify(m.error)}`));
      else resolve(m.result);
    });
    servidor.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: miId, method, params }) + "\n");
  });
}

function mostrarStderr() {
  if (!stderr.trim()) return;
  const lineas = stderr.trim().split("\n");
  console.error("   Mensaje del servidor:");
  // Las primeras líneas traen el error real; el resto es stack trace.
  for (const l of lineas.slice(0, 10)) console.error(`     ${l}`);
  if (lineas.length > 10) console.error(`     … (${lineas.length - 10} líneas más)`);
}

function terminar(codigo) {
  try {
    servidor.kill();
  } catch {}
  process.exit(codigo);
}

try {
  const init = await enviar("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "instalador-charbela", version: "1.0.0" }
  });
  servidor.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const nombre = init?.serverInfo?.name || "(sin nombre)";
  const version = init?.serverInfo?.version || "?";

  const lista = await enviar("tools/list", {});
  const tools = lista?.tools || [];

  if (tools.length < MINIMO_TOOLS) {
    console.error(`   El servidor arrancó pero no expone herramientas.`);
    terminar(1);
  }

  listo = true;
  console.log(`   Servidor "${nombre}" v${version} respondió con ${tools.length} herramientas.`);
  terminar(0);
} catch (e) {
  console.error(`   ${e.message}`);
  mostrarStderr();
  terminar(1);
}
