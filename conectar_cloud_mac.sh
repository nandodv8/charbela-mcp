#!/bin/bash
# conectar_cloud_mac.sh — Conecta Claude Desktop en Mac al MCP en Cloud Run

set -e

echo "=============================================================="
echo "  🍰 Conectando Claude Desktop a Charbela MCP Cloud Run"
echo "=============================================================="
echo

CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

mkdir -p "$CONFIG_DIR"

# Script inline en Node para actualizar el JSON limpiamente
node -e '
const fs = require("fs");
const file = process.argv[1];
let data = {};
if (fs.existsSync(file)) {
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch(e) {
    data = {};
  }
}
if (typeof data !== "object" || data === null || Array.isArray(data)) data = {};
data.mcpServers = data.mcpServers || {};

data.mcpServers["charbela-crm"] = {
  command: "npx",
  args: [
    "-y",
    "mcp-remote",
    "https://charbela-mcp-775456671841.us-central1.run.app/sse",
    "--header",
    "X-Charbela-Key: charbela_crm_mcp_2026_sec_key"
  ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
' "$CONFIG_FILE"

echo "  ✅ Archivo de configuración actualizado en:"
echo "     $CONFIG_FILE"
echo
echo "=============================================================="
echo "  🎉 ¡CONECTADO CON ÉXITO A CLOUD RUN!"
echo "=============================================================="
echo "  Último paso:"
echo "    1. En tu Mac, cierra Claude por completo con: Cmd + Q"
echo "    2. Vuelve a abrir la aplicación Claude."
echo "    3. ¡Listo! Ya tienes todas las 18 herramientas conectadas."
echo "=============================================================="
echo
