#!/bin/bash
# instalar_mac.command
# Archivo para DOBLE CLIC en Finder. Un .sh se abriría en un editor de texto;
# un .command lo ejecuta la Terminal.

cd "$(dirname "$0")" || exit 1

# macOS marca como "en cuarentena" todo lo que llega por descarga, AirDrop o zip,
# y eso bloquea los scripts. Se limpia la marca de esta carpeta.
xattr -dr com.apple.quarantine . 2>/dev/null || true
chmod +x ./instalar_claude.sh 2>/dev/null || true

bash ./instalar_claude.sh
ESTADO=$?

echo
if [ $ESTADO -ne 0 ]; then
  echo "  ⚠️  La instalación no se completó. El detalle está más arriba."
fi
read -r -p "  Presiona Enter para cerrar esta ventana… " _
exit $ESTADO
