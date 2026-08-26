$ErrorActionPreference = 'Stop'
$expectedHost = 'DESKTOP-7CM41S6'
$actualHost = [System.Net.Dns]::GetHostName()
if ($actualHost -ne $expectedHost) { throw "host mismatch: $actualHost" }

$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$commandsPath = Join-Path $dataDir 'commands.json'
$scriptsDir = Join-Path $dataDir 'scripts'
$windowsMcpScript = Join-Path $scriptsDir 'jarvis-windows-mcp.ps1'

if (-not (Test-Path -LiteralPath $commandsPath)) { throw "commands.json missing: $commandsPath" }
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null

$windowsMcpBody = @'
param(
  [ValidateSet('status','recover')]
  [string]$Action = 'status'
)
$ErrorActionPreference = 'Stop'
$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$sendResult = Join-Path $dataDir 'SendResult.bat'

function Send-Result {
  param([string]$Text)
  if (Test-Path -LiteralPath $sendResult) {
    & $sendResult $Text | Out-Null
  }
}

function Read-State {
  $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
  $taskState = if ($task) { [string]$task.State } else { 'Missing' }
  $listener = Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -First 1
  $proc = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'windows[_-]mcp' } |
    Select-Object -First 1
  [pscustomobject]@{
    TaskState = $taskState
    Listening = [bool]$listener
    Process = [bool]$proc
  }
}

try {
  if ($Action -eq 'recover') {
    $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
    if (-not $task) { throw 'windows-mcp-server scheduled task is missing' }
    Start-ScheduledTask -TaskName 'windows-mcp-server'
    Start-Sleep -Seconds 3
  }
  $state = Read-State
  $ok = $state.Listening -and $state.Process -and $state.TaskState -ne 'Missing'
  $text = "windows-mcp ok=$ok task=$($state.TaskState) listen=$($state.Listening) process=$($state.Process)"
  Send-Result $text
  Write-Output $text
  if (-not $ok) { exit 2 }
  exit 0
}
catch {
  $text = "windows-mcp error=$($_.Exception.Message)"
  Send-Result $text
  Write-Error $text
  exit 1
}
'@

[System.IO.File]::WriteAllText($windowsMcpScript, $windowsMcpBody, [System.Text.UTF8Encoding]::new($false))

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$backup = "$commandsPath.pre-rdc-retirement-$stamp.bak"
Copy-Item -LiteralPath $commandsPath -Destination $backup -Force

$commands = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
$commands = @($commands | Where-Object { $_.trigger -notin @('Jarvis Control','Jarvis Windows MCP') })

$commands += [pscustomobject]@{
  trigger = 'Jarvis Windows MCP'
  command = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%USERPROFILE%\.TRIGGERcmdData\scripts\jarvis-windows-mcp.ps1"'
  ground = 'background'
  voice = 'jarvis windows mcp'
  voiceReply = '{{result}}'
  allowParams = $true
  description = 'Check or recover Windows MCP. Parameter: status or recover.'
}

$json = $commands | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($commandsPath, $json, [System.Text.UTF8Encoding]::new($false))

$verified = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
if (@($verified | Where-Object trigger -eq 'Jarvis Control').Count -ne 0) { throw 'obsolete Jarvis Control still present' }
if (@($verified | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'Jarvis Windows MCP command not installed exactly once' }

Write-Output "TRIGGERCMD_REPAIR_OK backup=$backup command=Jarvis Windows MCP"
