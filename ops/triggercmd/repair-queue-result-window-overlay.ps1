$ErrorActionPreference = 'Stop'
$expectedHost = 'DESKTOP-7CM41S6'
$actualHost = [System.Net.Dns]::GetHostName()
if ($actualHost -ne $expectedHost) { throw 'host mismatch' }

$transportOverlay = Join-Path $PSScriptRoot 'repair-windows-mcp-transport-overlay.ps1'
if (-not (Test-Path -LiteralPath $transportOverlay -PathType Leaf)) { throw 'transport overlay missing' }

# Apply the already-reviewed base + Windows-MCP transport repair first. This
# preserves command retirement, command registration, queue identity checks,
# sanitized SendResult behavior, and the Windows-MCP result-window fix.
& $transportOverlay | Out-Null

$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$queueScript = Join-Path $dataDir 'scripts\jarvis-queue.ps1'
if (-not (Test-Path -LiteralPath $queueScript -PathType Leaf)) { throw 'queue script missing' }

$body = Get-Content -LiteralPath $queueScript -Raw
if ($body -notmatch [regex]::Escape('Start-ScheduledTask -TaskName $watchdogTaskName')) { throw 'queue watchdog recovery authority mismatch' }

# Replace exactly the known 90-second synchronous polling block. TRIGGERcmd's
# MCP result channel waits only a few seconds for SendResult; the prior loop
# guaranteed dispatch-only behavior whenever recovery was not already complete.
$pattern = @'
    \$recovered = \$false\r?\n    \$startUtc = \(Get-Date\)\.ToUniversalTime\(\)\.AddSeconds\(-5\)\r?\n    \$deadline = \(Get-Date\)\.AddSeconds\(90\)\r?\n    do \{.*?      Start-Sleep -Milliseconds 1000\r?\n    \} while \(\(Get-Date\) -lt \$deadline\)\r?\n\r?\n    if \(-not \$recovered\) \{ \$fail = 'recovery-timeout'; throw \$fail \}
'@

$replacement = @'
    $recovered = $false
    $startUtc = (Get-Date).ToUniversalTime().AddSeconds(-5)
    Start-Sleep -Milliseconds 200
    try {
      $runtime = Get-CanonicalRuntime
      $s = Get-MonitoredQueue -runtime $runtime
      $d = Get-QueueDiagnostics -runtime $runtime -state $s
      $heartbeatNewEnough = $false
      if ($s.HeartbeatFresh) {
        $hbPath = Join-Path $runtime $heartbeatRelativePath
        try { $hb = Get-Content -LiteralPath $hbPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $hb = $null }
        $stamp = $epoch
        if ($hb -and [datetime]::TryParse([string]$hb.heartbeatAt, [ref]$stamp)) {
          $heartbeatNewEnough = $stamp.ToUniversalTime() -ge $startUtc
        }
      }
      $recovered = ($s.HeadMatch -and $heartbeatNewEnough -and $s.PollerFresh -and $d.RuntimeIntegrity -and $d.AuditPathCanonical)
    } catch {
      $recovered = $false
    }

    if (-not $recovered) { $fail = 'recovery-not-ready'; throw $fail }
'@

$regex = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$matches = $regex.Matches($body)
if ($matches.Count -ne 1) { throw 'queue result-window replacement count must equal 1' }
$patched = $regex.Replace($body, $replacement, 1)

# Add bounded diagnostics without adding any new mutation or execution action.
# RuntimeIntegrity is proven from the activation receipt's SHA-256 manifest, not
# merely from .jarvis-source-head. AuditPathCanonical binds the status scanner to
# the poller's configured audit path. PollerReason is a fixed sanitized enum.
$diagnosticsHelper = @'
function Get-QueueDiagnostics([string]$runtime, $state) {
  $runtimeIntegrity = $false
  $runtimeIntegrityReason = 'activation-receipt-missing'
  $receiptPath = Join-Path $runtime 'reports\jarvis-local-always-on-activation-receipt.json'
  if (Test-Path -LiteralPath $receiptPath -PathType Leaf) {
    try {
      $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json -ErrorAction Stop
      $runtimeFull = [IO.Path]::GetFullPath($runtime).TrimEnd('\')
      $receiptRuntime = [IO.Path]::GetFullPath(([string]$receipt.runtime).Trim()).TrimEnd('\')
      $receiptHead = ([string]$receipt.sourceHead).Trim().ToLowerInvariant()
      if ([string]$receipt.kind -ne 'jarvis-local-always-on-activation-receipt') { throw 'receipt-kind-invalid' }
      if ([string]$receipt.host -ine $expectedHost) { throw 'receipt-host-invalid' }
      if (-not $receiptRuntime.Equals($runtimeFull, [StringComparison]::OrdinalIgnoreCase)) { throw 'receipt-runtime-invalid' }
      if ($receiptHead -notmatch '^[0-9a-f]{40}$' -or $receiptHead -ne ([string]$state.HeartbeatHead).ToLowerInvariant()) { throw 'receipt-head-invalid' }

      $files = @($receipt.files)
      if ($files.Count -lt 1 -or $files.Count -gt 128) { throw 'receipt-manifest-count-invalid' }
      $required = @(
        'src\provider-worker-queue-supervisor.mjs',
        'src\provider-worker-remote-control-loop.mjs',
        'scripts\jarvis-remote-control-poller.mjs',
        'src\remote-control\poll-cycle.mjs',
        'scripts\windows\watch-local-worker-queue.ps1'
      )
      $seen = @{}
      foreach ($entry in $files) {
        $relative = ([string]$entry.path).Trim()
        $expectedHash = ([string]$entry.sha256).Trim().ToLowerInvariant()
        if (-not $relative -or [IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[\\/])\.\.([\\/]|$)') { throw 'receipt-path-invalid' }
        if ($expectedHash -notmatch '^[0-9a-f]{64}$') { throw 'receipt-hash-invalid' }
        $candidate = [IO.Path]::GetFullPath((Join-Path $runtimeFull $relative))
        if (-not $candidate.StartsWith($runtimeFull + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'receipt-path-escape' }
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { throw 'receipt-file-missing' }
        $actualHash = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) { throw 'receipt-file-hash-mismatch' }
        $seen[$relative.Replace('/','\').ToLowerInvariant()] = $true
      }
      foreach ($requiredPath in $required) {
        if (-not $seen.ContainsKey($requiredPath.ToLowerInvariant())) { throw 'receipt-required-file-missing' }
      }
      $runtimeIntegrity = $true
      $runtimeIntegrityReason = 'verified'
    } catch {
      $runtimeIntegrity = $false
      $runtimeIntegrityReason = 'activation-manifest-invalid'
    }
  }

  $auditPathCanonical = $false
  $auditPathReason = 'remote-control-config-missing'
  $configPath = Join-Path $env:ProgramData 'PixelNetwork\JarvisHostOps\remote-control.json'
  if (Test-Path -LiteralPath $configPath -PathType Leaf) {
    try {
      $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json -ErrorAction Stop
      $configuredAuditPath = [IO.Path]::GetFullPath(([string]$config.auditPath).Trim())
      $canonicalAuditPath = [IO.Path]::GetFullPath($pollerAuditPath)
      if ($configuredAuditPath.Equals($canonicalAuditPath, [StringComparison]::OrdinalIgnoreCase)) {
        $auditPathCanonical = $true
        $auditPathReason = 'canonical'
      } else {
        $auditPathReason = 'audit-path-mismatch'
      }
    } catch {
      $auditPathReason = 'remote-control-config-invalid'
    }
  }

  $pollerReason = if (-not $auditPathCanonical) {
    $auditPathReason
  } elseif ($state.PollerFresh) {
    'fresh'
  } elseif ($state.PollerPresent) {
    'audit-stale'
  } else {
    'no-accepted-audit'
  }

  [pscustomobject]@{
    RuntimeIntegrity = $runtimeIntegrity
    RuntimeIntegrityReason = $runtimeIntegrityReason
    AuditPathCanonical = $auditPathCanonical
    AuditPathReason = $auditPathReason
    PollerReason = $pollerReason
  }
}
'@

$helperAnchor = '$fail = ''none'''
$helperMatches = [regex]::Matches($patched, [regex]::Escape($helperAnchor))
if ($helperMatches.Count -ne 1) { throw 'queue diagnostics helper anchor count must equal 1' }
$patched = $patched.Replace($helperAnchor, ($diagnosticsHelper + "`r`n" + $helperAnchor))

$statusPattern = @'
  \$state = Get-MonitoredQueue -runtime \$runtime\r?\n  # ok is derived, never unconditional: it requires canonical identity\r?\n  # \(queue/watchdog task verified by Get-CanonicalRuntime \+ watchdog check\),\r?\n  # the queue listener present, a fresh heartbeat, heartbeat sourceHead exact\r?\n  # match with the runtime marker, and a fresh poller postcondition\.\r?\n  \$ok = \(\$state\.WatchdogVerified -and\r?\n    \$state\.QueueTask -notin @\('Missing','Disabled'\) -and\r?\n    \$state\.WatchdogTask -notin @\('Missing','Disabled'\) -and\r?\n    \$state\.Listening -and\r?\n    \$state\.HeartbeatFresh -and\r?\n    \$state\.HeadMatch -and\r?\n    \$state\.PollerFresh\)\r?\n  \$text = "jarvis-queue ok=\$ok queueTask=\$\(\$state\.QueueTask\) watchdogTask=\$\(\$state\.WatchdogTask\) watchdogVerified=\$\(\$state\.WatchdogVerified\) listener=\$\(\$state\.Listening\) heartbeat=\$\(\$state\.HeartbeatFresh\) hbState=\$\(\$state\.HeartbeatState\) hbAge=\$\(\$state\.HeartbeatAge\)s headMatch=\$\(\$state\.HeadMatch\) poller=\$\(\$state\.PollerFresh\) pollerAge=\$\(\$state\.PollerAge\)s"
'@
$statusReplacement = @'
  $state = Get-MonitoredQueue -runtime $runtime
  $diag = Get-QueueDiagnostics -runtime $runtime -state $state
  $ok = ($state.WatchdogVerified -and
    $state.QueueTask -notin @('Missing','Disabled') -and
    $state.WatchdogTask -notin @('Missing','Disabled') -and
    $state.Listening -and
    $state.HeartbeatFresh -and
    $state.HeadMatch -and
    $state.PollerFresh -and
    $diag.RuntimeIntegrity -and
    $diag.AuditPathCanonical)
  $text = "jarvis-queue ok=$ok queueTask=$($state.QueueTask) watchdogTask=$($state.WatchdogTask) watchdogVerified=$($state.WatchdogVerified) listener=$($state.Listening) heartbeat=$($state.HeartbeatFresh) hbState=$($state.HeartbeatState) hbAge=$($state.HeartbeatAge)s headMatch=$($state.HeadMatch) runtimeIntegrity=$($diag.RuntimeIntegrity) integrityReason=$($diag.RuntimeIntegrityReason) auditPathCanonical=$($diag.AuditPathCanonical) poller=$($state.PollerFresh) pollerReason=$($diag.PollerReason) pollerAge=$($state.PollerAge)s"
'@
$statusRegex = [regex]::new($statusPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$statusMatches = $statusRegex.Matches($patched)
if ($statusMatches.Count -ne 1) { throw 'queue status diagnostics replacement count must equal 1' }
$patched = $statusRegex.Replace($patched, $statusReplacement, 1)

if ($patched -match 'AddSeconds\(90\)' -or $patched -match 'Start-Sleep -Milliseconds 1000') {
  throw 'queue result-window patch incomplete'
}
if ($patched -notmatch 'recovery-not-ready' -or $patched -notmatch 'Start-Sleep -Milliseconds 200') {
  throw 'queue result-window patch verification failed'
}
if ($patched -notmatch 'Get-QueueDiagnostics' -or $patched -notmatch 'runtimeIntegrity=' -or $patched -notmatch 'auditPathCanonical=' -or $patched -notmatch 'pollerReason=') {
  throw 'queue diagnostics patch verification failed'
}

$tempScript = "$queueScript.result-window-new"
[System.IO.File]::WriteAllText($tempScript, $patched, [System.Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $tempScript -Destination $queueScript -Force

Write-Output 'TRIGGERCMD_QUEUE_RESULT_WINDOW_OVERLAY_OK command=Jarvis Queue diagnostics=runtime-integrity,audit-path,poller-reason'
