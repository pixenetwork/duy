$ErrorActionPreference = 'Stop'
$expectedHost = 'DESKTOP-7CM41S6'
$actualHost = [System.Net.Dns]::GetHostName()
if ($actualHost -ne $expectedHost) { throw "host mismatch: $actualHost" }

$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$commandsPath = Join-Path $dataDir 'commands.json'
$scriptsDir = Join-Path $dataDir 'scripts'
$windowsMcpScript = Join-Path $scriptsDir 'jarvis-windows-mcp.ps1'
$queueScript = Join-Path $scriptsDir 'jarvis-queue.ps1'

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
$listenerAddress = '127.0.0.1'
$listenerPort = 8000

function Send-Result {
  param([string]$Text)
  if (Test-Path -LiteralPath $sendResult) {
    & $sendResult $Text | Out-Null
  }
}

function Get-McpState {
  $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
  $taskState = if ($task) { [string]$task.State } else { 'Missing' }
  # Exact bounded identity: the single 127.0.0.1 listener and its owning PID.
  # No arbitrary process command-line enumeration.
  $listener = Get-NetTCPConnection -State Listen -LocalAddress $listenerAddress -LocalPort $listenerPort -ErrorAction SilentlyContinue | Select-Object -First 1
  $identity = $false
  if ($listener) {
    $ownerPid = 0
    if ([int]::TryParse([string]$listener.OwningProcess, [ref]$ownerPid)) {
      $identity = [bool](Get-Process -Id $ownerPid -ErrorAction SilentlyContinue)
    }
  }
  [pscustomobject]@{
    TaskState = $taskState
    Listen = [bool]$listener
    Identity = $identity
  }
}

$failCode = 'none'
try {
  if ($Action -eq 'recover') {
    $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
    if (-not $task) { $failCode = 'mcp-task-missing'; throw $failCode }
    try { Start-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction Stop | Out-Null }
    catch { $failCode = 'mcp-task-start-failed'; throw $failCode }
    $deadline = (Get-Date).AddSeconds(20)
    $listener = $null
    do {
      Start-Sleep -Milliseconds 500
      $listener = Get-NetTCPConnection -State Listen -LocalAddress $listenerAddress -LocalPort $listenerPort -ErrorAction SilentlyContinue | Select-Object -First 1
    } while (-not $listener -and (Get-Date) -lt $deadline)
    if (-not $listener) { $failCode = 'mcp-listener-not-ready'; throw $failCode }
  }
  $state = Get-McpState
  $ok = $state.Listen -and $state.Identity -and $state.TaskState -ne 'Missing'
  $text = "windows-mcp ok=$ok task=$($state.TaskState) listener=$($state.Listen) identity=$($state.Identity)"
  Send-Result $text
  Write-Output $text
  if (-not $ok) { exit 2 }
  exit 0
}
catch {
  if ($failCode -eq 'none') { $failCode = 'mcp-internal-error' }
  $text = "windows-mcp error=fail-closed:$failCode"
  Send-Result $text
  Write-Error $text
  exit 1
}
'@

$queueBody = @'
param(
  [ValidateSet('status','recover')]
  [string]$Action = 'status'
)
$ErrorActionPreference = 'Stop'
$expectedHost = 'DESKTOP-7CM41S6'
$queueTaskName = 'Pixel Network Jarvis Local Worker Queue'
$watchdogTaskName = 'Pixel Network Jarvis Local Worker Queue Watchdog'
$runtimeMarkerExpected = 'pixenetwork/ai-orchestrator local-worker-queue runtime v1'
$heartbeatRelativePath = 'reports\provider-worker-local-queue-heartbeat.json'
$sourceHeadRelativePath = '.jarvis-source-head'
$queuePort = 32148
$staleAfterSeconds = 120
$pollerMaxAgeSeconds = 180
$epoch = [datetime]'1970-01-01T00:00:00Z'
$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$sendResult = Join-Path $dataDir 'SendResult.bat'
$pollerAuditPath = Join-Path $env:ProgramData 'PixelNetwork\JarvisHostOps\remote-control-audit.jsonl'

function Test-ExpectedHost {
  return ([string]$env:COMPUTERNAME -eq $expectedHost)
}

function Send-Result {
  param([string]$Text)
  if (Test-Path -LiteralPath $sendResult) {
    & $sendResult $Text | Out-Null
  }
}

# Canonical, bounded identity for the managed queue runtime: derived only from
# the verified scheduled task's WorkingDirectory, never from arbitrary command-line scans.
function Get-CanonicalRuntime {
  if (-not (Test-ExpectedHost)) { $script:fail = 'host-mismatch'; throw $script:fail }
  $task = Get-ScheduledTask -TaskName $queueTaskName -ErrorAction SilentlyContinue
  if (-not $task) { $script:fail = 'queue-task-missing'; throw $script:fail }
  if (@($task.Actions).Count -ne 1) { $script:fail = 'queue-task-actions-unverified'; throw $script:fail }
  if ([string]$task.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { $script:fail = 'queue-task-principal-unverified'; throw $script:fail }
  $action = @($task.Actions)[0]
  $runtime = [IO.Path]::GetFullPath(([string]$action.WorkingDirectory).Trim()).TrimEnd('\')
  if (-not $runtime.EndsWith('\_jarvis-local-queue-runtime', [StringComparison]::OrdinalIgnoreCase)) { $script:fail = 'runtime-location-unverified'; throw $script:fail }
  $marker = Join-Path $runtime '.jarvis-local-queue-runtime'
  if (-not (Test-Path -LiteralPath $marker -PathType Leaf) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne $runtimeMarkerExpected) { $script:fail = 'runtime-marker-unverified'; throw $script:fail }
  return $runtime
}

function Test-WatchdogVerified($watchdog) {
  if (-not $watchdog) { return $false }
  if (@($watchdog.Actions).Count -ne 1) { return $false }
  if ([string]$watchdog.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { return $false }
  $action = @($watchdog.Actions)[0]
  $exe = [IO.Path]::GetFullPath(([string]$action.Execute).Trim())
  $expectedPowershell = [IO.Path]::GetFullPath((Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'))
  if (-not $exe.Equals($expectedPowershell, [StringComparison]::OrdinalIgnoreCase)) { return $false }
  if (([string]$action.Arguments) -notmatch 'watch-local-worker-queue\.ps1') { return $false }
  return $true
}

function Get-MonitoredQueue([string]$runtime) {
  $queue = Get-ScheduledTask -TaskName $queueTaskName -ErrorAction SilentlyContinue
  $watchdog = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue
  $queueTaskState = if ($queue) { [string]$queue.State } else { 'Missing' }
  $watchdogTaskState = if ($watchdog) { [string]$watchdog.State } else { 'Missing' }
  $watchdogVerified = Test-WatchdogVerified $watchdog

  $ill = Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort $queuePort -ErrorAction SilentlyContinue | Select-Object -First 1
  $listening = [bool]$ill

  $hbPath = Join-Path $runtime $heartbeatRelativePath
  $heartbeatPresent = $false
  $heartbeatFresh = $false
  $heartbeatState = ''
  $heartbeatHead = ''
  $heartbeatAge = -1
  if (Test-Path -LiteralPath $hbPath -PathType Leaf) {
    try { $hb = Get-Content -LiteralPath $hbPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $hb = $null }
    $stamp = $epoch
    if ($hb) {
      $heartbeatPresent = $true
      $heartbeatState = [string]$hb.state
      $heartbeatHead = [string]$hb.sourceHead
      if ([datetime]::TryParse([string]$hb.heartbeatAt, [ref]$stamp)) {
        $stamp = $stamp.ToUniversalTime()
        $age = ((Get-Date).ToUniversalTime() - $stamp).TotalSeconds
        $heartbeatAge = [math]::Round($age, 0)
        $heartbeatFresh = ($age -ge -30 -and $age -le $staleAfterSeconds)
      }
    }
  }

  $auditPresent = $false
  $auditFresh = $false
  $auditAge = -1
  if (Test-Path -LiteralPath $pollerAuditPath -PathType Leaf) {
    $tail = @(Get-Content -LiteralPath $pollerAuditPath -Tail 200 -ErrorAction SilentlyContinue)
    if ($tail.Count -gt 0) {
      try { $row = $tail[$tail.Count - 1] | ConvertFrom-Json -ErrorAction Stop } catch { $row = $null }
      if ($row) {
        # audit-log.mjs stores 'at' as Date.now() numeric Unix milliseconds
        # (stored = { ...redacted, at: now, sequence }). Parse bounded numeric
        # milliseconds and convert from the Unix epoch; malformed/future/stale
        # values fail closed (auditFresh stays false).
        $atMs = [long]0
        if ([long]::TryParse(([string]$row.at).Trim(), [ref]$atMs)) {
          # Bound to the Unix epoch between year 2000 and year 9999 inclusive;
          # values outside that window are malformed/future and fail closed.
          if ($atMs -ge 946684800000 -and $atMs -le 253402300799999) {
            try {
              $atStamp = $epoch.AddMilliseconds([double]$atMs)
              $pollerAge = ((Get-Date).ToUniversalTime() - $atStamp.ToUniversalTime()).TotalSeconds
              $auditAge = [math]::Round($pollerAge, 0)
              $auditPresent = $true
              $auditFresh = ($pollerAge -ge -30 -and $pollerAge -le $pollerMaxAgeSeconds)
            } catch {
              $auditPresent = $false
            }
          }
        }
      }
    }
  }

  # Exact source-head match: heartbeat sourceHead must equal the .jarvis-source-head
  # runtime marker verbatim. Recovery and status fail closed unless they match.
  $headMatch = $false
  $headPath = Join-Path $runtime $sourceHeadRelativePath
  if (Test-Path -LiteralPath $headPath -PathType Leaf) {
    try {
      $markerHead = (Get-Content -LiteralPath $headPath -Raw).Trim()
      $headMatch = ($heartbeatPresent -and -not [string]::IsNullOrEmpty($markerHead) -and $heartbeatHead -eq $markerHead)
    } catch {
      $headMatch = $false
    }
  }

  [pscustomobject]@{
    QueueTask = $queueTaskState
    WatchdogTask = $watchdogTaskState
    WatchdogVerified = $watchdogVerified
    Listening = $listening
    HeartbeatPresent = $heartbeatPresent
    HeartbeatFresh = $heartbeatFresh
    HeartbeatState = $heartbeatState
    HeartbeatHead = $heartbeatHead
    HeartbeatAge = $heartbeatAge
    HeadMatch = $headMatch
    PollerPresent = $auditPresent
    PollerFresh = $auditFresh
    PollerAge = $auditAge
  }
}

$fail = 'none'
try {
  if (-not (Test-ExpectedHost)) { $fail = 'host-mismatch'; throw $fail }
  if ($Action -eq 'recover') {
    # Fail closed on the canonical watchdog task before doing anything.
    $watchdog = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue
    if (-not $watchdog) { $fail = 'watchdog-task-missing'; throw $fail }
    if (-not (Test-WatchdogVerified $watchdog)) { $fail = 'watchdog-task-unverified'; throw $fail }
    if ([string]$watchdog.State -eq 'Disabled') { $fail = 'watchdog-task-disabled'; throw $fail }
    try { Start-ScheduledTask -TaskName $watchdogTaskName -ErrorAction Stop | Out-Null }
    catch { $fail = 'watchdog-start-failed'; throw $fail }

    # Bounded wait; require canonical identity AND a fresh managed-queue heartbeat
    # (with heartbeat sourceHead exactly matching the runtime marker) AND a fresh
    # poller postcondition before declaring recovery.
    $recovered = $false
    $startUtc = (Get-Date).ToUniversalTime().AddSeconds(-5)
    $deadline = (Get-Date).AddSeconds(90)
    do {
      try {
        $runtime = Get-CanonicalRuntime
        $s = Get-MonitoredQueue -runtime $runtime
        $heartbeatNewEnough = $false
        if ($s.HeartbeatFresh) {
          $hbPath = Join-Path $runtime $heartbeatRelativePath
          try { $hb = Get-Content -LiteralPath $hbPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $hb = $null }
          $stamp = $epoch
          if ($hb -and [datetime]::TryParse([string]$hb.heartbeatAt, [ref]$stamp)) {
            $heartbeatNewEnough = $stamp.ToUniversalTime() -ge $startUtc
          }
        }
        if ($s.HeadMatch -and $heartbeatNewEnough -and $s.PollerFresh) {
          $recovered = $true
          break
        }
      } catch {
        # keep waiting; fail closed below if the bounded window expires
      }
      Start-Sleep -Milliseconds 1000
    } while ((Get-Date) -lt $deadline)

    if (-not $recovered) { $fail = 'recovery-timeout'; throw $fail }
  }

  $runtime = Get-CanonicalRuntime
  $state = Get-MonitoredQueue -runtime $runtime
  # ok is derived, never unconditional: it requires canonical identity
  # (queue/watchdog task verified by Get-CanonicalRuntime + watchdog check),
  # the queue listener present, a fresh heartbeat, heartbeat sourceHead exact
  # match with the runtime marker, and a fresh poller postcondition.
  $ok = ($state.WatchdogVerified -and
    $state.QueueTask -notin @('Missing','Disabled') -and
    $state.WatchdogTask -notin @('Missing','Disabled') -and
    $state.Listening -and
    $state.HeartbeatFresh -and
    $state.HeadMatch -and
    $state.PollerFresh)
  $text = "jarvis-queue ok=$ok queueTask=$($state.QueueTask) watchdogTask=$($state.WatchdogTask) watchdogVerified=$($state.WatchdogVerified) listener=$($state.Listening) heartbeat=$($state.HeartbeatFresh) hbState=$($state.HeartbeatState) hbAge=$($state.HeartbeatAge)s headMatch=$($state.HeadMatch) poller=$($state.PollerFresh) pollerAge=$($state.PollerAge)s"
  Send-Result $text
  Write-Output $text
  if (-not $ok) { exit 2 }
  exit 0
}
catch {
  if ($fail -eq 'none') { $fail = 'queue-internal-error' }
  $text = "jarvis-queue $($Action) fail-closed=$fail"
  Send-Result $text
  Write-Error $text
  if ($Action -eq 'recover') { exit 1 } else { exit 2 }
}
'@

[System.IO.File]::WriteAllText($windowsMcpScript, $windowsMcpBody, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($queueScript, $queueBody, [System.Text.UTF8Encoding]::new($false))

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$backup = "$commandsPath.pre-rdc-retirement-$stamp.bak"
Copy-Item -LiteralPath $commandsPath -Destination $backup -Force

$commands = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
$commands = @($commands | Where-Object { $_.trigger -notin @('Jarvis Control','Jarvis Windows MCP','Jarvis Queue') })

$commands += [pscustomobject]@{
  trigger = 'Jarvis Windows MCP'
  command = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%USERPROFILE%\.TRIGGERcmdData\scripts\jarvis-windows-mcp.ps1"'
  ground = 'background'
  voice = 'jarvis windows mcp'
  voiceReply = '{{result}}'
  allowParams = $true
  description = 'Check or recover Windows MCP. Parameter: status or recover.'
}

$commands += [pscustomobject]@{
  trigger = 'Jarvis Queue'
  command = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%USERPROFILE%\.TRIGGERcmdData\scripts\jarvis-queue.ps1"'
  ground = 'background'
  voice = 'jarvis queue'
  voiceReply = '{{result}}'
  allowParams = $true
  description = 'Check or recover the managed Jarvis local worker queue via its canonical watchdog. Parameter: status or recover.'
}

$json = $commands | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($commandsPath, $json, [System.Text.UTF8Encoding]::new($false))

$verified = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
if (@($verified | Where-Object trigger -eq 'Jarvis Control').Count -ne 0) { throw 'obsolete Jarvis Control still present' }
if (@($verified | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'Jarvis Windows MCP command not installed exactly once' }
if (@($verified | Where-Object trigger -eq 'Jarvis Queue').Count -ne 1) { throw 'Jarvis Queue command not installed exactly once' }

Write-Output "TRIGGERCMD_REPAIR_OK backup=$backup commands=Jarvis Windows MCP,Jarvis Queue"
