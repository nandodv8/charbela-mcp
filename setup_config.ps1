# setup_config.ps1
# Configura automáticamente el archivo claude_desktop_config.json en cualquier máquina Windows

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $scriptDir "src\index.js"

$claudeDir = Join-Path $env:APPDATA "Claude"
$configFile = Join-Path $claudeDir "claude_desktop_config.json"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

$config = @{}
if (Test-Path $configFile) {
    try {
        $raw = Get-Content $configFile -Raw -Encoding UTF8
        if ($raw.Trim()) {
            $config = $raw | ConvertFrom-Json -AsHashtable
        }
    } catch {
        Write-Warning "El archivo de configuracion existente tenia un formato invalido. Se creara uno limpio respaldando el anterior."
        Copy-Item $configFile "$configFile.backup" -Force
        $config = @{}
    }
}

if (-not $config.ContainsKey("mcpServers")) {
    $config["mcpServers"] = @{}
}

$config["mcpServers"]["charbela-crm"] = @{
    command = "node"
    args = @($indexPath)
}

$newJson = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configFile, $newJson, [System.Text.Encoding]::UTF8)

Write-Host " -> Servidor registrado con exito en:" -ForegroundColor Green
Write-Host "    $configFile" -ForegroundColor Gray
Write-Host " -> Ruta del ejecutable:" -ForegroundColor Green
Write-Host "    $indexPath" -ForegroundColor Gray
