param([string]$NodePath = 'node.exe')
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskScript = Join-Path $PSScriptRoot 'market-agent.cjs'
if (-not $env:FMS_CODEX_BINARY) { $taskCodexCommand = Get-Command codex.exe -ErrorAction Stop; $env:FMS_CODEX_BINARY = $taskCodexCommand.Source }
Start-Process -FilePath $NodePath -ArgumentList @('--use-system-ca', '"' + $taskScript + '"', 'run') -WorkingDirectory $taskRoot -WindowStyle Hidden
