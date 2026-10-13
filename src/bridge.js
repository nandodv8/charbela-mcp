// crm-charbela/mcp-server/src/bridge.js
// Puente ligero de Stdio (Claude Desktop) hacia Google Cloud Run (SSE)
// Garantiza máxima compatibilidad en Windows, Mac y Linux sin requerir CLI externos

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const CLOUD_RUN_URL = process.env.CHARBELA_MCP_URL || "https://charbela-mcp-775456671841.us-central1.run.app/sse";
const API_KEY = process.env.MCP_API_KEY || "charbela_crm_mcp_2026_sec_key";

async function main() {
  const localTransport = new StdioServerTransport();
  const remoteTransport = new SSEClientTransport(new URL(CLOUD_RUN_URL), {
    eventSourceInit: {
      headers: { "X-Charbela-Key": API_KEY }
    },
    requestInit: {
      headers: { "X-Charbela-Key": API_KEY }
    }
  });

  // Reenvío bidireccional de mensajes JSON-RPC
  localTransport.onmessage = async (msg) => {
    try {
      await remoteTransport.send(msg);
    } catch (err) {
      console.error("[Bridge Send Error]", err.message);
    }
  };

  remoteTransport.onmessage = async (msg) => {
    try {
      await localTransport.send(msg);
    } catch (err) {
      console.error("[Bridge Recv Error]", err.message);
    }
  };

  localTransport.onclose = () => remoteTransport.close().catch(() => {});
  remoteTransport.onclose = () => localTransport.close().catch(() => {});
  localTransport.onerror = (err) => console.error("[Local Error]", err);
  remoteTransport.onerror = (err) => console.error("[Remote Error]", err);

  await remoteTransport.start();
  await localTransport.start();
  console.error("🍰 Puente Claude <-> Cloud Run MCP conectado exitosamente.");
}

main().catch((err) => {
  console.error("❌ Error iniciando el puente Cloud Run:", err.message);
  process.exit(1);
});
