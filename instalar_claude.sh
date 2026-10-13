#!/bin/bash
# instalar_claude.sh — Instalador del MCP Charbela CRM para macOS
# Idempotente: se puede correr varias veces sin romper nada.

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1

ok()   { printf "  ✅ %s\n" "$1"; }
mal()  { printf "  ❌ %s\n" "$1"; }
nota() { printf "  •  %s\n" "$1"; }

echo "=============================================================="
echo "  🍰 MCP Charbela CRM — Instalador para macOS"
echo "=============================================================="
echo

# ─── 1. Node.js ──────────────────────────────────────────────────────────────
# Clave: Claude Desktop se abre desde Finder y NO hereda el PATH de la terminal.
# Por eso guardamos la RUTA ABSOLUTA de node; poner "node" falla con ENOENT.
echo "[1/5] Buscando Node.js…"
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for candidato in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node "$HOME/.nvm/versions/node"/*/bin/node; do
    if [ -x "$candidato" ]; then NODE_BIN="$candidato"; break; fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  mal "No encontré Node.js en esta Mac."
  echo
  echo "  Instálalo con UNA de estas dos opciones y vuelve a abrir el instalador:"
  echo "    a) Baja el instalador 'LTS' desde  https://nodejs.org   ← lo más simple"
  echo "    b) Si ya usas Homebrew:            brew install node"
  echo
  exit 1
fi

NODE_BIN="$(cd "$(dirname "$NODE_BIN")" && pwd)/$(basename "$NODE_BIN")"
NODE_VER="$("$NODE_BIN" -v 2>/dev/null || echo "?")"
MAJOR="$(printf "%s" "$NODE_VER" | sed -n 's/^v\([0-9]\{1,\}\).*/\1/p')"

if [ -z "$MAJOR" ] || [ "$MAJOR" -lt 18 ]; then
  mal "Node $NODE_VER es muy antiguo: se necesita la versión 18 o superior."
  echo "  Actualízalo desde https://nodejs.org y vuelve a correr el instalador."
  exit 1
fi

ok "Node $NODE_VER"
nota "Ruta que usará Claude: $NODE_BIN"
case "$NODE_BIN" in
  *"/.nvm/"*)
    nota "Ese node viene de nvm. Si algún día actualizas la versión de node,"
    nota "vuelve a correr este instalador para refrescar la ruta."
    ;;
esac

NPM_BIN="$(dirname "$NODE_BIN")/npm"
[ -x "$NPM_BIN" ] || NPM_BIN="$(command -v npm 2>/dev/null || true)"
if [ -z "$NPM_BIN" ]; then
  mal "Encontré node pero no npm. Reinstala Node.js desde https://nodejs.org"
  exit 1
fi
echo

# ─── 2. Dependencias ─────────────────────────────────────────────────────────
echo "[2/5] Instalando dependencias (tarda 1-2 minutos la primera vez)…"
if ! "$NPM_BIN" install --omit=dev --no-audit --no-fund; then
  echo
  mal "Falló la instalación de dependencias."
  echo "  Causas típicas: sin conexión a internet, o un firewall/proxy bloqueando npm."
  echo "  Revisa el internet y vuelve a intentar."
  exit 1
fi
if [ ! -d "node_modules/@modelcontextprotocol" ]; then
  mal "Las dependencias se instalaron incompletas (falta @modelcontextprotocol)."
  echo "  Intenta de nuevo; si persiste, mándale este mensaje a Fernando."
  exit 1
fi
ok "Dependencias listas"
echo

# ─── 3. Claude Desktop ───────────────────────────────────────────────────────
echo "[3/5] Revisando Claude Desktop…"
if pgrep -xq "Claude" 2>/dev/null; then
  nota "Claude está abierto ahora mismo: al terminar hay que cerrarlo con Cmd+Q"
  nota "y volver a abrirlo, si no seguirá usando la versión vieja."
else
  nota "Claude está cerrado. Perfecto."
fi
echo

# ─── 4. Configuración ────────────────────────────────────────────────────────
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

echo "[4/5] Registrando el servidor en Claude Desktop…"
if ! mkdir -p "$CONFIG_DIR"; then
  mal "No pude crear la carpeta de configuración: $CONFIG_DIR"
  exit 1
fi
if ! "$NODE_BIN" "$DIR/configurar_claude.mjs" "$CONFIG_FILE" "$NODE_BIN" "$DIR/src/bridge.js"; then
  mal "No pude escribir la configuración de Claude."
  exit 1
fi
ok "Configuración escrita"
echo

# ─── 5. Verificación real ────────────────────────────────────────────────────
echo "[5/5] Probando que el servidor arranque y responda…"
if "$NODE_BIN" "$DIR/verificar_mcp.mjs" "$NODE_BIN" "$DIR/src/bridge.js"; then
  ok "El servidor responde correctamente"
else
  echo
  mal "El servidor NO respondió."
  echo "  La configuración quedó escrita, pero algo falla."
  echo "  Copia todo el texto de esta ventana y mándaselo a Fernando."
  exit 1
fi

echo
echo "=============================================================="
echo "  🎉 Instalación completada"
echo "=============================================================="
echo
echo "  Último paso, importante:"
echo "    1. Cierra Claude por completo con  Cmd + Q"
echo "       (cerrar la ventana con la X no alcanza)"
echo "    2. Vuelve a abrir Claude"
echo "    3. Pregúntale algo como:  ¿qué pedidos tengo pendientes de cobro?"
echo
echo "  Si responde con pedidos del CRM, quedó funcionando."
echo
