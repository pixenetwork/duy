$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$expectedHost = 'DESKTOP-7CM41S6'
$actualHost = [System.Net.Dns]::GetHostName()
if ($actualHost -ne $expectedHost) { throw 'host mismatch' }

$ownerDataDir = 'C:\Users\Administrator\.TRIGGERcmdData'
$commandsPath = Join-Path $ownerDataDir 'commands.json'
$scriptsDir = Join-Path $ownerDataDir 'scripts'
$recoveryCommandScript = Join-Path $scriptsDir 'jarvis-offline-recovery.ps1'
$canonicalRecoveryCommandScript = [IO.Path]::GetFullPath($recoveryCommandScript)
$expectedRecoveryCommandScript = 'C:\Users\Administrator\.TRIGGERcmdData\scripts\jarvis-offline-recovery.ps1'
if (-not $canonicalRecoveryCommandScript.Equals($expectedRecoveryCommandScript, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'recovery command script path mismatch'
}

function Write-AtomicText {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Text
  )
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  $temp = "$Path.$PID.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    [IO.File]::WriteAllText($temp, $Text, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temp -Destination $Path -Force -ErrorAction Stop
  }
  finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

function Restore-CommandsBackup {
  param(
    [Parameter(Mandatory = $true)][string]$BackupPath,
    [Parameter(Mandatory = $true)][string]$DestinationPath
  )
  if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) { throw 'commands rollback backup missing' }
  $temp = "$DestinationPath.rollback.$PID.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    Copy-Item -LiteralPath $BackupPath -Destination $temp -ErrorAction Stop
    $backupHash = (Get-FileHash -LiteralPath $BackupPath -Algorithm SHA256 -ErrorAction Stop).Hash
    $tempHash = (Get-FileHash -LiteralPath $temp -Algorithm SHA256 -ErrorAction Stop).Hash
    if ($backupHash -ne $tempHash) { throw 'commands rollback staging hash mismatch' }
    Move-Item -LiteralPath $temp -Destination $DestinationPath -Force -ErrorAction Stop
  }
  finally {
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

if (-not (Test-Path -LiteralPath $commandsPath -PathType Leaf)) { throw 'commands.json missing' }
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null

$recoveryBody = @'
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedHead
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$expectedHost = 'DESKTOP-7CM41S6'
$canonicalRepo = 'C:\Users\Administrator\ai-orchestrator'
$queueTaskName = 'Pixel Network Jarvis Local Worker Queue'
$recoveryScript = Join-Path $canonicalRepo 'scripts\windows\complete-jarvis-offline-recovery.ps1'
$ownerDataDir = 'C:\Users\Administrator\.TRIGGERcmdData'
$sendResult = Join-Path $ownerDataDir 'SendResult.bat'

function Send-Result {
  param([string]$Text)
  if (Test-Path -LiteralPath $sendResult -PathType Leaf) {
    & $sendResult $Text | Out-Null
  }
}

$fail = 'none'
try {
  if ([System.Net.Dns]::GetHostName() -ne $expectedHost) { $fail = 'host-mismatch'; throw $fail }
  if ($ExpectedHead -cnotmatch '^[0-9a-f]{40}$') { $fail = 'source-head-invalid'; throw $fail }

  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $fail = 'administrator-required'
    throw $fail
  }

  if (-not (Test-Path -LiteralPath $canonicalRepo -PathType Container)) { $fail = 'canonical-repo-missing'; throw $fail }
  if (-not (Test-Path -LiteralPath $recoveryScript -PathType Leaf)) { $fail = 'recovery-script-missing'; throw $fail }

  $queue = Get-ScheduledTask -TaskName $queueTaskName -ErrorAction SilentlyContinue
  if (-not $queue) { $fail = 'queue-task-missing'; throw $fail }
  $actions = @($queue.Actions)
  if ($actions.Count -ne 1) { $fail = 'queue-task-actions-unverified'; throw $fail }
  $action = $actions[0]
  if ($null -eq $action -or [string]::IsNullOrWhiteSpace([string]$action.WorkingDirectory)) {
    $fail = 'queue-task-action-working-directory-unverified'
    throw $fail
  }
  if ([string]$queue.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { $fail = 'queue-task-principal-unverified'; throw $fail }
  $runtime = [IO.Path]::GetFullPath(([string]$action.WorkingDirectory).Trim()).TrimEnd('\')
  if (-not $runtime.EndsWith('\_jarvis-local-queue-runtime', [StringComparison]::OrdinalIgnoreCase)) {
    $fail = 'runtime-location-unverified'
    throw $fail
  }

  $headPath = Join-Path $runtime '.jarvis-source-head'
  if (Test-Path -LiteralPath $headPath -PathType Leaf) {
    try {
      $installedHead = (Get-Content -LiteralPath $headPath -Raw -ErrorAction Stop).Trim()
    }
    catch {
      $fail = 'installed-head-read-failed'
      throw $fail
    }
    if ($installedHead -ceq $ExpectedHead) {
      $fail = 'already-current-use-jarvis-queue-recover'
      throw $fail
    }
  }

  $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $powershell -PathType Leaf)) { $fail = 'powershell-missing'; throw $fail }

  Push-Location -LiteralPath $canonicalRepo
  try {
    # The governed recovery script's exit status plus durable recovery receipts are
    # authoritative. Child streams are suppressed so TRIGGERcmd never leaks raw
    # warnings/errors or mistakes advisory text for completion evidence.
    & $powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $recoveryScript -ExpectedHead $ExpectedHead *> $null
    $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  }
  finally {
    Pop-Location
  }
  if ($code -ne 0) { $fail = 'recovery-script-failed'; throw $fail }

  $shortHead = $ExpectedHead.Substring(0, 12)
  $text = "jarvis-offline-recovery advisory=finished head=$shortHead receipt-required=true"
  Send-Result $text
  Write-Output $text
  exit 0
}
catch {
  if ($fail -eq 'none') { $fail = 'offline-recovery-internal-error' }
  $text = "jarvis-offline-recovery fail-closed=$fail receipt-required=true"
  Send-Result $text
  Write-Error $text
  exit 1
}
'@

Write-AtomicText -Path $recoveryCommandScript -Text $recoveryBody

try {
  $commands = @(Get-Content -LiteralPath $commandsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop)
}
catch {
  throw 'commands-json-read-failed'
}
if (@($commands | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'Jarvis Windows MCP baseline command missing or duplicated' }
if (@($commands | Where-Object trigger -eq 'Jarvis Queue').Count -ne 1) { throw 'Jarvis Queue baseline command missing or duplicated' }

$backup = "$commandsPath.pre-offline-recovery-$([guid]::NewGuid().ToString('N')).bak"
if (Test-Path -LiteralPath $backup) { throw 'commands backup collision' }
Copy-Item -LiteralPath $commandsPath -Destination $backup -ErrorAction Stop
$commandsHash = (Get-FileHash -LiteralPath $commandsPath -Algorithm SHA256 -ErrorAction Stop).Hash
$backupHash = (Get-FileHash -LiteralPath $backup -Algorithm SHA256 -ErrorAction Stop).Hash
if ($commandsHash -ne $backupHash) { throw 'commands backup hash mismatch' }

$commands = @($commands | Where-Object { $_.trigger -ne 'Jarvis Offline Recovery' })
$commands += [pscustomobject]@{
  trigger = 'Jarvis Offline Recovery'
  command = "powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$canonicalRecoveryCommandScript`""
  ground = 'background'
  voice = 'jarvis offline recovery'
  voiceReply = '{{result}}'
  allowParams = 'true'
  description = 'Emergency exact-current-main Jarvis runtime recovery. Parameter: lowercase 40-character expected main SHA. Receipt proof remains required.'
}

$json = $commands | ConvertTo-Json -Depth 12
try {
  Write-AtomicText -Path $commandsPath -Text $json
  $verified = @(Get-Content -LiteralPath $commandsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop)
  if (@($verified | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'baseline-windows-mcp-changed' }
  if (@($verified | Where-Object trigger -eq 'Jarvis Queue').Count -ne 1) { throw 'baseline-queue-changed' }
  if (@($verified | Where-Object trigger -eq 'Jarvis Offline Recovery').Count -ne 1) { throw 'offline-recovery-command-count-invalid' }
}
catch {
  try {
    Restore-CommandsBackup -BackupPath $backup -DestinationPath $commandsPath
  }
  catch {
    throw 'commands-update-and-rollback-failed'
  }
  throw 'commands-update-failed'
}

Write-Output "TRIGGERCMD_OFFLINE_RECOVERY_COMMAND_READY=True backup=$backup"
