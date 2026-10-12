#!/usr/bin/env node
// configurar_claude.mjs
// Registra el servidor MCP en claude_desktop_config.json preservando lo que ya exista.
// Uso: node configurar_claude.mjs <rutaConfig> <rutaNode> <rutaIndexJs>
//
// Las rutas llegan por argv y NUNCA interpoladas en el código: un apóstrofo o un
// espacio en el nombre de la carpeta (".../Charbela's CRM/") rompería un script inline.

import fs from "node:fs";
import path from "node:path";

const [configPath, nodeBin, indexPath] = process.argv.slice(2);

if (!configPath || !nodeBin || !indexPath) {
  console.error("Uso: node configurar_claude.mjs <rutaConfig> <rutaNode> <rutaIndexJs>");
  process.exit(2);
}
if (!fs.existsSync(indexPath)) {
  console.error(`   No existe el servidor en: ${indexPath}`);
  process.exit(1);
}

let config = {};

if (fs.existsSync(configPath)) {
  const raw = fs.readFileSync(configPath, "utf8");

  // Respaldo SIEMPRE, no solo cuando el JSON está roto.
  const sello = new Date().toISOString().replace(/[:.]/g, "-");
  const respaldo = `${configPath}.backup-${sello}`;
  fs.copyFileSync(configPath, respaldo);
  console.log(`   Respaldo del config anterior: ${path.basename(respaldo)}`);

  // Poda: conservar solo los 5 respaldos más recientes para no llenar la carpeta.
  try {
    const dir = path.dirname(configPath);
    const base = path.basename(configPath) + ".backup-";
    const viejos = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(base))
      .sort()
      .reverse()
      .slice(5);
    for (const f of viejos) fs.unlinkSync(path.join(dir, f));
    if (viejos.length) console.log(`   Se eliminaron ${viejos.length} respaldo(s) antiguo(s).`);
  } catch {
    // La poda es opcional: si falla, no se interrumpe la instalación.
  }

  if (raw.trim()) {
    try {
      config = JSON.parse(raw);
    } catch (e) {
      console.log(`   El config existente tenía JSON inválido (${e.message}).`);
      console.log(`   Se parte de uno limpio; el original está en el respaldo.`);
      config = {};
    }
  }
}

if (typeof config !== "object" || config === null || Array.isArray(config)) config = {};
if (typeof config.mcpServers !== "object" || config.mcpServers === null) config.mcpServers = {};

const otros = Object.keys(config.mcpServers).filter((k) => k !== "charbela-crm");

// Ruta absoluta de node a propósito: Claude Desktop se abre desde Finder y no
// hereda el PATH de la terminal, así que "command": "node" falla con ENOENT.
config.mcpServers["charbela-crm"] = {
  command: nodeBin,
  args: [indexPath]
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

console.log(`   Servidor 'charbela-crm' registrado.`);
if (otros.length) {
  console.log(`   Se conservaron los otros servidores: ${otros.join(", ")}`);
}
