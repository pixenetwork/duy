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
      $heartbeatNewEnough = $false
      if ($s.HeartbeatFresh) {
        $hbPath = Join-Path $runtime $heartbeatRelativePath
        try { $hb = Get-Content -LiteralPath $hbPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $hb = $null }
        $stamp = $epoch
        if ($hb -and [datetime]::TryParse([string]$hb.heartbeatAt, [ref]$stamp)) {
          $heartbeatNewEnough = $stamp.ToUniversalTime() -ge $startUtc
        }
      }
      $recovered = ($s.HeadMatch -and $heartbeatNewEnough -and $s.PollerFresh)
    } catch {
      $recovered = $false
    }

    if (-not $recovered) { $fail = 'recovery-not-ready'; throw $fail }
'@

$regex = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$matches = $regex.Matches($body)
if ($matches.Count -ne 1) { throw 'queue result-window replacement count must equal 1' }
$patched = $regex.Replace($body, $replacement, 1)

if ($patched -match 'AddSeconds\(90\)' -or $patched -match 'Start-Sleep -Milliseconds 1000') {
  throw 'queue result-window patch incomplete'
}
if ($patched -notmatch 'recovery-not-ready' -or $patched -notmatch 'Start-Sleep -Milliseconds 200') {
  throw 'queue result-window patch verification failed'
}

$tempScript = "$queueScript.result-window-new"
[System.IO.File]::WriteAllText($tempScript, $patched, [System.Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $tempScript -Destination $queueScript -Force

Write-Output 'TRIGGERCMD_QUEUE_RESULT_WINDOW_OVERLAY_OK command=Jarvis Queue'
