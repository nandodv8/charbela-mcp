#!/bin/bash
# conectar_cloud_mac.sh — Conecta Claude Desktop / Cowork en Mac al MCP en Cloud Run con OAuth Google

set -e

echo "=============================================================="
echo "  🍰 Conectando Claude Desktop a Charbela Pastelería MCP"
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
    "https://charbela-mcp-775456671841.us-central1.run.app/mcp"
  ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
' "$CONFIG_FILE"

echo "  ✅ Archivo de configuración actualizado en:"
echo "     $CONFIG_FILE"
echo
echo "=============================================================="
echo "  🎉 ¡CONFIGURADO CON ÉXITO!"
echo "=============================================================="
echo "  Pasos finales:"
echo "    1. Cierra Claude Desktop por completo con: Cmd + Q"
echo "    2. Vuelve a abrir Claude."
echo "    3. Al iniciar, se abrirá la ventana de inicio de sesión con Google."
echo "    4. Haz clic en 'Continuar con Google' e ingresa con tu cuenta de Charbela."
echo "    5. ¡Listo! Tendrás acceso a todos los módulos: Obrador, Nómina, Recetas, Ventas y Finanzas."
echo "=============================================================="
echo
