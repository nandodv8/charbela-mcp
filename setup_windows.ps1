# setup_windows.ps1 — Instalador Automático en 1 Línea para Windows
# Descarga/actualiza charbela-mcp en Documentos y configura Claude Desktop / Cowork
$ErrorActionPreference = "Stop"

Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  🍰 Asistente Charbela CRM — Instalador para Windows" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Comprobar Node.js
Write-Host "🔍 [1/3] Verificando Node.js..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ❌ Node.js no está instalado en tu computadora." -ForegroundColor Red
    Write-Host "  1. Entra a: https://nodejs.org" -ForegroundColor White
    Write-Host "  2. Descarga e instala la versión LTS (botón verde)." -ForegroundColor White
    Write-Host "  3. Vuelve a ejecutar este comando." -ForegroundColor White
    exit 1
}
Write-Host "  ✅ Node.js detectado: $(node -v)" -ForegroundColor Green
Write-Host ""

# 2. Descargar o actualizar repositorio en Documentos
$docsPath = [Environment]::GetFolderPath("MyDocuments")
$destPath = Join-Path $docsPath "charbela-mcp"

Write-Host "📥 [2/3] Descargando asistente en Documentos ($destPath)..." -ForegroundColor Cyan
if (Test-Path (Join-Path $destPath ".git")) {
    Push-Location $destPath
    try { git pull --quiet } catch {}
    Pop-Location
} else {
    if (Test-Path $destPath) { Remove-Item -Path $destPath -Recurse -Force }
    git clone --quiet https://github.com/nandodv8/charbela-mcp.git $destPath
}

Push-Location $destPath
Write-Host "  📦 Instalando dependencias necesarias..." -ForegroundColor Cyan
npm install --omit=dev --silent
Pop-Location

# 3. Configurar Claude Desktop
Write-Host "⚙️ [3/3] Registrando servidor en Claude Desktop..." -ForegroundColor Cyan
$bridgePath = Join-Path $destPath "src\bridge.js"
$claudeDir = Join-Path $env:APPDATA "Claude"
$configFile = Join-Path $claudeDir "claude_desktop_config.json"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

$config = @{}
if (Test-Path $configFile) {
    try {
        $raw = Get-Content $configFile -Raw -Encoding UTF8
        if ($raw.Trim()) { $config = $raw | ConvertFrom-Json -AsHashtable }
    } catch {
        $config = @{}
    }
}

if (-not $config.ContainsKey("mcpServers")) { $config["mcpServers"] = @{} }
$config["mcpServers"]["charbela-crm"] = @{
    command = "node"
    args = @($bridgePath)
}

$newJson = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configFile, $newJson, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "  🎉 ¡LISTO! Asistente MCP configurado con Cloud Run" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "  PASO FINAL OBLIGATORIO:" -ForegroundColor Yellow
Write-Host "    1. Cierra Claude Desktop por completo (incluso desde los iconos junto al reloj)." -ForegroundColor White
Write-Host "    2. Vuelve a abrir Claude Desktop." -ForegroundColor White
Write-Host "    3. En Cowork o en el chat, pregúntale: ¿Cuáles son las ventas de este mes?" -ForegroundColor White
Write-Host ""
