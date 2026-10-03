param([string]$NodePath = 'node.exe')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskScript = Join-Path $PSScriptRoot 'market-agent.cjs'
$taskStateDir = Join-Path $env:LOCALAPPDATA 'RadarFantasy'
[IO.Directory]::CreateDirectory($taskStateDir) | Out-Null
$taskPidFile = Join-Path $taskStateDir 'market-agent.pid'
$taskOutputFile = Join-Path $taskStateDir 'market-agent.stdout.log'
$taskErrorFile = Join-Path $taskStateDir 'market-agent.stderr.log'
$taskLockFile = Join-Path $taskStateDir 'market-agent-launch.lock'
$taskLaunchLock = [IO.File]::Open($taskLockFile, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
if (Test-Path -LiteralPath $taskPidFile) {
  $taskExistingPid = 0
  if ([int]::TryParse([IO.File]::ReadAllText($taskPidFile).Trim(), [ref]$taskExistingPid)) {
    $taskExistingProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskExistingPid" -ErrorAction SilentlyContinue
    if ($taskExistingProcess -and $taskExistingProcess.CommandLine -and $taskExistingProcess.CommandLine.Contains($taskScript)) { Write-Output 'El agente ya esta iniciado.'; return }
  }
}
if (-not $env:FMS_CODEX_BINARY) { $taskCodexCommand = Get-Command codex.exe -ErrorAction Stop; $env:FMS_CODEX_BINARY = $taskCodexCommand.Source }
$taskNodeCommand = Get-Command $NodePath -ErrorAction Stop
$taskProcess = Start-Process -FilePath $taskNodeCommand.Source -ArgumentList @('--use-system-ca', ('"' + $taskScript + '"'), 'run') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput $taskOutputFile -RedirectStandardError $taskErrorFile -PassThru
[IO.File]::WriteAllText($taskPidFile, [string]$taskProcess.Id)
Start-Sleep -Milliseconds 900
$taskProcess.Refresh()
if ($taskProcess.HasExited) { [IO.File]::WriteAllText($taskPidFile, ''); throw "El agente termino al arrancar (codigo $($taskProcess.ExitCode)). Consulta $taskErrorFile y $taskOutputFile; los registros contienen codigos operativos, sin credenciales." }
Write-Output "Agente iniciado. PID $($taskProcess.Id). Registros locales en $taskStateDir."
} finally { $taskLaunchLock.Dispose() }
