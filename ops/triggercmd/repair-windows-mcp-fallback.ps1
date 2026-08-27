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

# Bounded Windows-MCP identity proof via the MCP initialize handshake. The
# official CursorTouch Windows-MCP install registers the `windows-mcp-server`
# task whose action launches a wrapper (~/.windows-mcp/start-server.cmd) that
# re-execs `python -m windows_mcp serve`, so the process owning the loopback
# LISTENER is a python child, NOT the task action path. Comparing process paths
# would therefore reject a healthy official install. Instead we bind the
# 127.0.0.1 listener to the exact canonical FastMCP server name ("windows-mcp")
# by running a single bounded MCP `initialize` exchange; an unrelated listener
# that does not speak the MCP protocol with that exact server identity fails.
# The probe endpoint is a FIXED absolute loopback HTTP URI (never caller-controlled):
# a bare "127.0.0.1:8000/mcp/" has no scheme and no BaseAddress, so .NET treats it
# as non-absolute and the catch would return $null, leaving Identity false even
# against a healthy Windows-MCP server.
function Get-McpServerName {
  $payload = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"jarvis-ops","version":"1"}}}'
  try {
    $client = [System.Net.Http.HttpClient]::new()
    try {
      $client.Timeout = [TimeSpan]::FromSeconds(5)
      $content = [System.Net.Http.StringContent]::new($payload, [System.Text.Encoding]::UTF8, 'application/json')
      $resp = $client.PostAsync('http://127.0.0.1:8000/mcp/', $content).GetAwaiter().GetResult()
      if (-not $resp.IsSuccessStatusCode) { return $null }
      $bytes = $resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
      if ($bytes.Length -gt 262144) { return $null }
      $json = [System.Text.Encoding]::UTF8.GetString($bytes)
      $data = $json | ConvertFrom-Json -ErrorAction Stop
      if (-not $data.result -or -not $data.result.serverInfo) { return $null }
      return [string]$data.result.serverInfo.name
    } finally {
      $client.Dispose()
    }
  } catch {
    return $null
  }
}

function Get-McpState {
  $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
  $taskState = if ($task) { [string]$task.State } else { 'Missing' }
  $listener = Get-NetTCPConnection -State Listen -LocalAddress $listenerAddress -LocalPort $listenerPort -ErrorAction SilentlyContinue | Select-Object -First 1
  # Identity is proven only by the MCP initialize handshake naming the canonical
  # windows-mcp server; an unrelated listener can never satisfy it.
  $identity = $false
  if ($listener) {
    $name = Get-McpServerName
    $identity = ($name -eq 'windows-mcp')
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
  # ok requires the single canonical listener to pass the bounded MCP initialize
  # identity proof AND that task report Running. A merely-existing task or an
  # unrelated listener is not sufficient.
  $ok = $state.Listen -and $state.Identity -and $state.TaskState -eq 'Running'
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

function Test-WatchdogVerified($watchdog, [string]$runtime) {
  if (-not $watchdog) { return $false }
  if (@($watchdog.Actions).Count -ne 1) { return $false }
  if ([string]$watchdog.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { return $false }
  $action = @($watchdog.Actions)[0]
  $exe = [IO.Path]::GetFullPath(([string]$action.Execute).Trim())
  $expectedPowershell = [IO.Path]::GetFullPath((Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'))
  if (-not $exe.Equals($expectedPowershell, [StringComparison]::OrdinalIgnoreCase)) { return $false }
  # Canonical WorkingDirectory must equal the verified queue runtime exactly.
  $workingDirectory = [IO.Path]::GetFullPath(([string]$action.WorkingDirectory).Trim()).TrimEnd('\')
  if (-not $workingDirectory.Equals($runtime, [StringComparison]::OrdinalIgnoreCase)) { return $false }
  # Exact checked-in watchdog script path, bound to the verified queue runtime.
  # A same-name/spoofed script path anywhere else must fail.
  $expectedScript = [IO.Path]::GetFullPath((Join-Path $runtime 'scripts\windows\watch-local-worker-queue.ps1'))
  $arguments = ([string]$action.Arguments).Trim()
  if (-not $arguments) { return $false }

  # Tokenize the action arguments, preserving double-quoted values.
  $tokens = [System.Collections.Generic.List[string]]::new()
  $i = 0
  while ($i -lt $arguments.Length) {
    while ($i -lt $arguments.Length -and [string]::IsNullOrWhiteSpace($arguments[$i])) { $i++ }
    if ($i -ge $arguments.Length) { break }
    $sb = [System.Text.StringBuilder]::new()
    $inQuote = $false
    while ($i -lt $arguments.Length) {
      $ch = $arguments[$i]
      if ($ch -eq '"') { $inQuote = -not $inQuote; $i++; continue }
      if (-not $inQuote -and [string]::IsNullOrWhiteSpace($ch)) { break }
      [void]$sb.Append($ch); $i++
    }
    $tokens.Add($sb.ToString())
  }

  # Locate -File and its single script argument.
  $fileIdx = -1
  for ($k = 0; $k -lt $tokens.Count; $k++) {
    if ($tokens[$k] -ieq '-File') { $fileIdx = $k; break }
  }
  if ($fileIdx -lt 0 -or $fileIdx + 1 -ge $tokens.Count) { return $false }
  $fileRaw = $tokens[$fileIdx + 1].Trim().Trim('"')

  # A relative -File resolves against the already-verified canonical runtime (the
  # watchdog's own WorkingDirectory), NOT the Trigger process current directory.
  # An absolute -File is acceptable only if it resolves exactly to the same path.
  if ([IO.Path]::IsPathRooted($fileRaw)) {
    $candidate = [IO.Path]::GetFullPath($fileRaw)
  } else {
    $candidate = [IO.Path]::GetFullPath((Join-Path $workingDirectory $fileRaw))
  }
  if (-not $candidate.Equals($expectedScript, [StringComparison]::OrdinalIgnoreCase)) { return $false }

  # Pin the exact canonical pre-File vector: -NoLogo -NoProfile -NonInteractive
  # -ExecutionPolicy Bypass, in that order, before -File. No other switches.
  $canonicalPre = @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass')
  if ($fileIdx -ne $canonicalPre.Count) { return $false }
  for ($j = 0; $j -lt $canonicalPre.Count; $j++) {
    if (-not $tokens[$j].Equals($canonicalPre[$j], [StringComparison]::OrdinalIgnoreCase)) { return $false }
  }

  # After the script only a single bounded -ForceRecycle switch is permitted; any
  # arbitrary extra argument fails closed.
  $forceCount = 0
  for ($p = $fileIdx + 2; $p -lt $tokens.Count; $p++) {
    if ($tokens[$p] -ieq '-ForceRecycle') { $forceCount++; continue }
    return $false
  }
  if ($forceCount -gt 1) { return $false }

  return $true
}

function Get-MonitoredQueue([string]$runtime) {
  $queue = Get-ScheduledTask -TaskName $queueTaskName -ErrorAction SilentlyContinue
  $watchdog = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue
  $queueTaskState = if ($queue) { [string]$queue.State } else { 'Missing' }
  $watchdogTaskState = if ($watchdog) { [string]$watchdog.State } else { 'Missing' }
  $watchdogVerified = Test-WatchdogVerified $watchdog -runtime $runtime

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

  # Canonical remote-control audit schema (ai-orchestrator src/remote-control/
  # audit-log.mjs): each JSONL row is { ...redacted, at: <Date.now() ms>, sequence }
  # with a canonical kind: branch-check, commit-check, schema-check, source-check,
  # replay-check, acceptance, phase-denial, claim, terminal, receipt.
  #
  # A managed poll-cycle postcondition requires a bounded-tail row that is a
  # recognized canonical record with an allowed healthy decision and (where
  # present) well-formed correlation/source context. Any fresh unrelated row that
  # is not a recognized postcondition fails closed (PollerFresh stays false).
  $allowedAuditKinds = @('branch-check','commit-check','schema-check','source-check','replay-check','acceptance','phase-denial','claim','terminal','receipt')
  $allowedAuditDecisions = @('ACCEPTED','CLAIMED','PUBLISHED','COMPLETED')
  $auditPresent = $false
  $auditFresh = $false
  $auditAge = -1
  if (Test-Path -LiteralPath $pollerAuditPath -PathType Leaf) {
    # Scan only a bounded tail (last 200 lines); never read the whole file.
    $tail = @(Get-Content -LiteralPath $pollerAuditPath -Tail 200 -ErrorAction SilentlyContinue)
    if ($tail.Count -gt 0) {
      foreach ($line in $tail) {
        try { $row = $line | ConvertFrom-Json -ErrorAction Stop } catch { $row = $null }
        if (-not $row) { continue }
        # Recognized canonical kind plus an allowed healthy decision.
        if (@($allowedAuditKinds) -notcontains [string]$row.kind) { continue }
        if (@($allowedAuditDecisions) -notcontains ([string]$row.decision).ToUpperInvariant()) { continue }
        # Correlation/source context where available: an audit headSha, when
        # present, must be a well-formed 40-hex SHA; a commandId, when present,
        # must be non-empty. Malformed context fails closed.
        if ($null -ne $row.headSha -and [string]$row.headSha -and ([string]$row.headSha -notmatch '^[0-9a-fA-F]{40}$')) { continue }
        if ($null -ne $row.commandId -and [string]$row.commandId -and ([string]::IsNullOrWhiteSpace([string]$row.commandId))) { continue }
        # audit-log.mjs stores 'at' as Date.now() numeric Unix milliseconds
        # (stored = { ...redacted, at: now, sequence }). Parse bounded numeric
        # milliseconds and convert from the Unix epoch; malformed/future/stale
        # values fail closed.
        $atMs = [long]0
        if (-not [long]::TryParse(([string]$row.at).Trim(), [ref]$atMs)) { continue }
        # Bound to the Unix epoch between year 2000 and year 9999 inclusive;
        # values outside that window are malformed/future and fail closed.
        if ($atMs -lt 946684800000 -or $atMs -gt 253402300799999) { continue }
        try {
          $atStamp = $epoch.AddMilliseconds([double]$atMs)
          $pollerAge = ((Get-Date).ToUniversalTime() - $atStamp.ToUniversalTime()).TotalSeconds
        } catch {
          continue
        }
        $auditPresent = $true
        if ($pollerAge -ge -30 -and $pollerAge -le $pollerMaxAgeSeconds) {
          $auditFresh = $true
          $auditAge = [math]::Round($pollerAge, 0)
          break
        }
        if ($pollerAge -ge 0 -and ($auditAge -lt 0 -or $pollerAge -lt $auditAge)) { $auditAge = [math]::Round($pollerAge, 0) }
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
    # Fail closed on the canonical watchdog task before doing anything. The
    # verified runtime is resolved once up front so the watchdog's WorkingDirectory
    # and exact script path can be bound to it.
    $runtime = Get-CanonicalRuntime
    $watchdog = Get-ScheduledTask -TaskName $watchdogTaskName -ErrorAction SilentlyContinue
    if (-not $watchdog) { $fail = 'watchdog-task-missing'; throw $fail }
    if (-not (Test-WatchdogVerified $watchdog -runtime $runtime)) { $fail = 'watchdog-task-unverified'; throw $fail }
    if ([string]$watchdog.State -eq 'Disabled') { $fail = 'watchdog-task-disabled'; throw $fail }
    try { Start-ScheduledTask -TaskName $watchdogTaskName -ErrorAction Stop | Out-Null }
    catch { $fail = 'watchdog-start-failed'; throw $fail }

    # Bounded wait — require canonical identity (with watchdog bound to the queue
    # runtime) AND a fresh managed-queue heartbeat (with heartbeat sourceHead
    # exactly matching the runtime marker) AND a fresh poller postcondition before
    # declaring recovery.
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
  allowParams = 'true'
  description = 'Check or recover Windows MCP. Parameter: status or recover.'
}

$commands += [pscustomobject]@{
  trigger = 'Jarvis Queue'
  command = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%USERPROFILE%\.TRIGGERcmdData\scripts\jarvis-queue.ps1"'
  ground = 'background'
  voice = 'jarvis queue'
  voiceReply = '{{result}}'
  allowParams = 'true'
  description = 'Check or recover the managed Jarvis local worker queue via its canonical watchdog. Parameter: status or recover.'
}

$json = $commands | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($commandsPath, $json, [System.Text.UTF8Encoding]::new($false))

$verified = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
if (@($verified | Where-Object trigger -eq 'Jarvis Control').Count -ne 0) { throw 'obsolete Jarvis Control still present' }
if (@($verified | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'Jarvis Windows MCP command not installed exactly once' }
if (@($verified | Where-Object trigger -eq 'Jarvis Queue').Count -ne 1) { throw 'Jarvis Queue command not installed exactly once' }

Write-Output "TRIGGERCMD_REPAIR_OK backup=$backup commands=Jarvis Windows MCP,Jarvis Queue"
