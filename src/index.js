// crm-charbela/mcp-server/src/index.js
// Servidor MCP Oficial de Charbela CRM para Claude Desktop (Transporte Stdio Local)

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCharbelaMcpServer } from "./createMcpServer.js";

async function main() {
  const server = createCharbelaMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP Charbela v2.0 conectado exitosamente mediante stdio.");
}

main().catch((err) => {
  console.error("❌ Error fatal al iniciar el servidor MCP:", err);
  process.exit(1);
});
