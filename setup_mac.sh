#!/bin/bash
# setup_mac.sh — Instalador Automático en 1 Línea para Mac
# Clonación, configuración y verificación de Charbela MCP para Claude Desktop

set -e

echo "=============================================================="
echo "  🍰 Asistente Charbela CRM — Instalador para Mac"
echo "=============================================================="
echo

# 1. Comprobar Node.js
echo "🔍 [1/4] Verificando Node.js..."
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for c in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node "$HOME/.nvm/versions/node"/*/bin/node; do
    if [ -x "$c" ]; then NODE_BIN="$c"; break; fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo
  echo "  ❌ Node.js no está instalado en tu Mac."
  echo "  1. Entra a: https://nodejs.org"
  echo "  2. Descarga el botón verde 'LTS' e instálalo."
  echo "  3. Vuelve a ejecutar este comando."
  echo
  exit 1
fi

echo "  ✅ Node.js detectado: $("$NODE_BIN" -v)"
echo

# 2. Descargar o actualizar repositorio en Documentos
DEST="$HOME/Documents/charbela-mcp"
echo "📥 [2/4] Descargando/Actualizando asistente en Documentos..."
if [ -d "$DEST/.git" ]; then
  cd "$DEST"
  git pull --quiet || true
else
  mkdir -p "$HOME/Documents"
  rm -rf "$DEST"
  git clone --quiet https://github.com/nandodv8/charbela-mcp.git "$DEST"
  cd "$DEST"
fi

echo "  ✅ Archivos listos en $DEST"
echo

# 3. Permisos y Ejecución del Instalador
echo "⚙️ [3/4] Configurando Claude Desktop..."
chmod +x ./instalar_claude.sh 2>/dev/null || true
bash ./instalar_claude.sh

echo
echo "=============================================================="
echo "  🎉 ¡LISTO CHARBELA! Asistente instalado exitosamente"
echo "=============================================================="
echo "  PASO FINAL OBLIGATORIO:"
echo "    1. En tu teclado presiona: Cmd + Q  para cerrar Claude por completo."
echo "    2. Vuelve a abrir la aplicación Claude."
echo "    3. ¡Listo! Ya puedes hablarle y registrar gastos."
echo "=============================================================="
echo
