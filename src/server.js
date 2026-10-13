// crm-charbela/mcp-server/src/server.js
// Servidor MCP Oficial de Charbela CRM para Google Cloud Run (Transporte HTTP SSE)

import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createCharbelaMcpServer } from "./createMcpServer.js";

const app = express();

// Configuración de CORS y parseo de JSON
app.use(cors());
app.use(express.json());

// Token de seguridad (configurable por variable de entorno)
const API_KEY = process.env.MCP_API_KEY || "charbela_crm_mcp_2026_sec_key";

/**
 * Middleware de seguridad por API Key
 */
function authMiddleware(req, res, next) {
  // Endpoints públicos de salud y diagnóstico
  if (req.path === "/" || req.path === "/health") {
    return next();
  }

  const keyHeader = req.headers["x-charbela-key"] || req.headers["x-api-key"];
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryKey = req.query.apiKey || req.query.key;

  const providedKey = keyHeader || bearerToken || queryKey;
  if (!providedKey || providedKey !== API_KEY) {
    console.warn(`[Auth Warning] Intento de acceso no autorizado desde ${req.ip} a ${req.path}`);
    return res.status(401).json({
      error: "Acceso no autorizado",
      message: "Se requiere la cabecera 'X-Charbela-Key' con la clave correcta."
    });
  }

  next();
}

app.use(authMiddleware);

// Almacén de transportes SSE por ID de sesión
const transports = {};

/**
 * 1. Health Check (Usado por Google Cloud Run y monitoreo)
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "charbela-crm-mcp",
    version: "2.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    activeSessions: Object.keys(transports).length,
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    name: "Charbela CRM MCP Cloud Server",
    version: "2.0.0",
    endpoints: {
      sse: "/sse",
      messages: "/messages",
      health: "/health"
    }
  });
});

/**
 * 2. Endpoint SSE (/sse) - Apertura del stream de eventos
 */
app.get("/sse", async (req, res) => {
  console.log(`[SSE] Nueva conexión entrante desde ${req.ip}`);
  try {
    // Inicializar transporte SSE indicando que las respuestas POST van a '/messages'
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    transport.onclose = () => {
      console.log(`[SSE] Conexión cerrada para sesión: ${sessionId}`);
      delete transports[sessionId];
    };

    // Crear y conectar servidor MCP
    const server = createCharbelaMcpServer();
    await server.connect(transport);
    console.log(`[SSE] Sesión MCP ${sessionId} conectada exitosamente.`);
  } catch (error) {
    console.error("[SSE Error] Fallo al establecer conexión SSE:", error);
    if (!res.headersSent) {
      res.status(500).send("Error al iniciar conexión SSE");
    }
  }
});

/**
 * 3. Endpoint Messages (/messages) - Envío de mensajes JSON-RPC del cliente
 */
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).send("Falta el parámetro sessionId en la URL");
  }

  const transport = transports[sessionId];
  if (!transport) {
    console.warn(`[Messages Warning] Sesión no encontrada: ${sessionId}`);
    return res.status(404).send("Sesión no encontrada o expirada");
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`[Messages Error] Error en sesión ${sessionId}:`, error);
    if (!res.headersSent) {
      res.status(500).send("Error procesando mensaje");
    }
  }
});

// Iniciar servidor en el puerto de Cloud Run
const PORT = process.env.PORT || 8080;
const serverInstance = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🍰 Servidor MCP Charbela Cloud escuchando en http://0.0.0.0:${PORT}`);
  console.log(`   Endpoint SSE: /sse`);
  console.log(`   Health Check: /health`);
});

// Cierre graceful ante señales de detención
process.on("SIGTERM", async () => {
  console.log("Recibida señal SIGTERM. Cerrando sesiones activas...");
  for (const id in transports) {
    try {
      await transports[id].close();
    } catch (_) {}
  }
  serverInstance.close(() => {
    console.log("Servidor cerrado ordenadamente.");
    process.exit(0);
  });
});
