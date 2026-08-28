#requires -Version 5.1
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedHost = 'DESKTOP-7CM41S6'
$CanonicalRepo = 'C:\Users\Administrator\ai-orchestrator'
$ExpectedMainHead = 'fb50bec64a0452fd0b70655eead4468a90f18fa5'
$ExpectedHostOpsHead = 'b392533affb06f6fc1c98b531b1cb84ca6bea0ce'
$ExpectedArchiveSha256 = 'aee1e1c4ce53e17748e381bded9e404105ececec5aebf45ce1e65485b7ebc5e4'
$ExpectedContentDigest = 'a0b84dea3e2ca4a06eb31aaf4eabc2be6581543f0c30241028ce3c59a3efba48'
$ReleaseBranch = 'gpt/hostops-v3-portable-executor-1186'
$ControlBranch = 'jarvis-remote-control-v2'
$ReceiptIssue = 1035
$FirstPendingHead = '159eb154daf93299b7274c09b3bb40315f971316'
$ControlChain = @(
  '159eb154daf93299b7274c09b3bb40315f971316',
  '35c9107024760ddfcbf7c2c409c53badfc46e823',
  '59ac743a521c7185c344f96f48484d340a2a526c',
  '0691c3ca8f8e9ac17308d34b801c7d6f70209363',
  '1ae2d33477335b9cf43c4dde3675448837135323'
)
$RecoveryRoot = 'C:\ProgramData\PixelNetwork\JarvisRecovery\hostops-v3-pc-b392533'
$LocalReceipt = Join-Path $RecoveryRoot 'pc-cutover-receipt.json'
$LedgerPath = 'C:\ProgramData\PixelNetwork\JarvisHostOps\remote-control-ledger.json'
$RemoteConfigPath = 'C:\ProgramData\PixelNetwork\JarvisHostOps\remote-control.json'
$BootstrapRelative = 'scripts\windows\bootstrap-jarvis-remote-control-local.ps1'
$ReleaseWorktree = 'C:\ProgramData\PixelNetwork\JarvisWorktrees\hostops-v3-pc-release-b392533'
$PackageOutput = 'C:\ProgramData\PixelNetwork\JarvisHostOps\staging\pc-b392533'
$InstallRoot = 'C:\Program Files\PixelNetwork\HostOpsV3'
$HostOpsTasks = @(
  'Pixel Network Jarvis Host Ops Adapter',
  'Pixel Network Jarvis Host Ops Executor',
  'Pixel Network Jarvis Host Ops Executor Watchdog'
)

function Write-Utf8JsonNoBom([string]$Path, $Value, [int]$Depth = 12) {
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $json = $Value | ConvertTo-Json -Depth $Depth
  [IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

function Write-CutoverReceipt($Data) {
  $Data['completedAtUtc'] = [DateTime]::UtcNow.ToString('o')
  $Data['machine'] = $ExpectedHost
  $Data['sourceHead'] = $ExpectedHostOpsHead
  $Data['packageSha256'] = $ExpectedArchiveSha256
  $Data['contentDigest'] = $ExpectedContentDigest
  Write-Utf8JsonNoBom $LocalReceipt $Data 15
}

function Fail-Closed([string]$Code, [hashtable]$Extra = @{}) {
  $receipt = @{ status='HOSTOPS_V3_PC_CUTOVER_FAILED_CLOSED'; failCode=$Code }
  foreach ($key in $Extra.Keys) { $receipt[$key] = $Extra[$key] }
  Write-CutoverReceipt $receipt
  throw "HOSTOPS_V3_PC_CUTOVER_FAILED_CLOSED=$Code"
}

function Invoke-NativeCapture([string]$FilePath, [string[]]$Arguments, [int]$TimeoutSeconds = 300) {
  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $FilePath
  $psi.Arguments = (($Arguments | ForEach-Object {
    $value = [string]$_
    if ($value.Contains('"')) { throw 'native-argument-quote-unsupported' }
    if ($value -match '\s') { '"' + $value + '"' } else { $value }
  }) -join ' ')
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $p = [Diagnostics.Process]::new(); $p.StartInfo = $psi
  try {
    [void]$p.Start(); $outTask=$p.StandardOutput.ReadToEndAsync(); $errTask=$p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit([Math]::Max(30,$TimeoutSeconds)*1000)) { try{$p.Kill()}catch{}; throw 'native-timeout' }
    [void]$p.WaitForExit()
    return [pscustomobject]@{ ExitCode=[int]$p.ExitCode; Stdout=[string]$outTask.Result; Stderr=[string]$errTask.Result }
  } finally { try{$p.Dispose()}catch{} }
}

function Get-Application([string]$Name) {
  $cmd = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $cmd) { return $null }
  return [string]$cmd.Source
}

function Assert-HostAndAdmin {
  if ([Environment]::MachineName -cne $ExpectedHost) { Fail-Closed 'wrong-host' @{ observedHost=[Environment]::MachineName } }
  $id=[Security.Principal.WindowsIdentity]::GetCurrent()
  $p=[Security.Principal.WindowsPrincipal]::new($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail-Closed 'administrator-required' @{ observedIdentity=[string]$id.Name }
  }
}

function Invoke-Git([string[]]$Args, [int]$TimeoutSeconds = 180) {
  $git = Get-Application 'git.exe'; if (-not $git) { $git=Get-Application 'git' }
  if (-not $git) { Fail-Closed 'git-missing' }
  $r=Invoke-NativeCapture $git $Args $TimeoutSeconds
  if ($r.ExitCode -ne 0) { Fail-Closed 'git-command-failed' @{ operation=[string]$Args[0]; exitCode=$r.ExitCode } }
  return $r.Stdout.Trim()
}

function Get-Json([string]$Path, [string]$Code) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Fail-Closed $Code }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop }
  catch { Fail-Closed ($Code + '-malformed') }
}

function Prepare-CanonicalRepo {
  if (-not (Test-Path -LiteralPath $CanonicalRepo -PathType Container)) { Fail-Closed 'canonical-repo-missing' }
  $origin=Invoke-Git @('-C',$CanonicalRepo,'remote','get-url','origin')
  if ($origin -notmatch '(?i)pixenetwork[/:]ai-orchestrator(?:\.git)?$') { Fail-Closed 'origin-unverified' }
  $dirty=Invoke-Git @('-C',$CanonicalRepo,'status','--porcelain','--untracked-files=all')
  if (-not [string]::IsNullOrWhiteSpace($dirty)) { Fail-Closed 'canonical-repo-dirty' }
  [void](Invoke-Git @('-C',$CanonicalRepo,'fetch','origin','main:refs/remotes/origin/main','--prune') 240)
  [void](Invoke-Git @('-C',$CanonicalRepo,'fetch','origin',($ReleaseBranch + ':refs/remotes/origin/' + $ReleaseBranch)) 240)
  $main=(Invoke-Git @('-C',$CanonicalRepo,'rev-parse','refs/remotes/origin/main')).ToLowerInvariant()
  if ($main -cne $ExpectedMainHead) { Fail-Closed 'origin-main-moved' @{ observedMain=$main } }
  $release=(Invoke-Git @('-C',$CanonicalRepo,'rev-parse',('refs/remotes/origin/' + $ReleaseBranch))).ToLowerInvariant()
  if ($release -cne $ExpectedHostOpsHead) { Fail-Closed 'release-head-moved' @{ observedRelease=$release } }
  $current=(Invoke-Git @('-C',$CanonicalRepo,'rev-parse','HEAD')).ToLowerInvariant()
  if ($current -cne $ExpectedMainHead) {
    $safety='safety/hostops-v3-pc-v6-' + $current.Substring(0,12)
    $git=Get-Application 'git.exe'; if (-not $git) { $git=Get-Application 'git' }
    if (-not $git) { Fail-Closed 'git-missing' }
    $probe=Invoke-NativeCapture $git @('-C',$CanonicalRepo,'rev-parse','--verify',('refs/heads/' + $safety)) 30
    $existing=if($probe.ExitCode -eq 0){$probe.Stdout.Trim()}else{''}
    if ($existing -and $existing.ToLowerInvariant() -cne $current) { Fail-Closed 'safety-branch-collision' }
    if (-not $existing) { [void](Invoke-Git @('-C',$CanonicalRepo,'branch',$safety,$current)) }
  }
  [void](Invoke-Git @('-C',$CanonicalRepo,'checkout','-B','main','refs/remotes/origin/main'))
  $aligned=(Invoke-Git @('-C',$CanonicalRepo,'rev-parse','HEAD')).ToLowerInvariant()
  if ($aligned -cne $ExpectedMainHead) { Fail-Closed 'canonical-main-align-failed' }
}

function Assert-ControlChain {
  $api='https://api.github.com/repos/pixenetwork/jarvis-control-transport'
  try { $branch=Invoke-RestMethod -UseBasicParsing -Headers @{'User-Agent'='Jarvis-HostOps-V3-PC-V6'} -Uri ($api + '/branches/' + $ControlBranch) }
  catch { Fail-Closed 'control-branch-read-failed' }
  $final=$ControlChain[$ControlChain.Count-1]
  if ([string]$branch.commit.sha -cne $final) { Fail-Closed 'control-head-moved' @{ observedControlHead=[string]$branch.commit.sha } }
  $parent='efa5ecabaff9ec26965916f27f9960346de6bc3f'
  foreach ($head in $ControlChain) {
    try { $commit=Invoke-RestMethod -UseBasicParsing -Headers @{'User-Agent'='Jarvis-HostOps-V3-PC-V6'} -Uri ($api + '/commits/' + $head) }
    catch { Fail-Closed 'control-commit-read-failed' @{ controlHead=$head } }
    if ($commit.parents.Count -ne 1 -or [string]$commit.parents[0].sha -cne $parent) { Fail-Closed 'control-chain-not-linear' @{ controlHead=$head } }
    if ($commit.commit.verification.verified -ne $true -or [string]$commit.author.login -cne 'pixenetwork') { Fail-Closed 'control-commit-untrusted' @{ controlHead=$head } }
    $parent=$head
  }
}

function Test-ExpiredRow($Ledger,[string]$Head) {
  $row=@($Ledger.commands.PSObject.Properties | ForEach-Object { $_.Value } | Where-Object { ([string]$_.controlCommitSha).ToLowerInvariant() -eq $Head }) | Select-Object -First 1
  if (-not $row) { return $false }
  return ([string]$row.state -eq 'DENIED' -and [string]$row.errorCode -eq 'command-expired' -and
    [string]$row.receipt.state -eq 'PUBLISHED' -and [string]$row.receipt.payload.status -eq 'DENIED' -and
    [string]$row.receipt.payload.hostOpsDecision -eq 'not-submitted-expired')
}

function Ensure-CanonicalQueueRunning {
  $queueName='Pixel Network Jarvis Local Worker Queue'; $watchName='Pixel Network Jarvis Local Worker Queue Watchdog'
  try { $queue=Get-ScheduledTask -TaskName $queueName -ErrorAction Stop; $watch=Get-ScheduledTask -TaskName $watchName -ErrorAction Stop }
  catch { Fail-Closed 'canonical-queue-task-missing' }
  if (@($queue.Actions).Count -ne 1 -or [string]$queue.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { Fail-Closed 'queue-task-identity-invalid' }
  if (@($watch.Actions).Count -ne 1 -or [string]$watch.Principal.UserId -notmatch '(?i)NETWORK SERVICE$') { Fail-Closed 'watchdog-task-identity-invalid' }
  $runtime=[IO.Path]::GetFullPath(([string]@($queue.Actions)[0].WorkingDirectory).Trim()).TrimEnd('\')
  if (-not $runtime.EndsWith('\_jarvis-local-queue-runtime',[StringComparison]::OrdinalIgnoreCase)) { Fail-Closed 'queue-runtime-invalid' }
  if ([string]$queue.State -ne 'Running') {
    try { Start-ScheduledTask -TaskName $queueName -ErrorAction Stop }
    catch { Fail-Closed 'queue-start-failed' }
    $deadline=(Get-Date).AddSeconds(30)
    do { Start-Sleep -Milliseconds 500; $queue=Get-ScheduledTask -TaskName $queueName -ErrorAction Stop } while ([string]$queue.State -ne 'Running' -and (Get-Date) -lt $deadline)
    if ([string]$queue.State -ne 'Running') { Fail-Closed 'queue-did-not-run' }
  }
  return $runtime
}

function Invoke-PhaseZeroBootstrapIfNeeded([string]$Runtime) {
  $config=Get-Json $RemoteConfigPath 'remote-control-config-missing'
  if ([string]$config.controlBranch -cne $ControlBranch -or [string]$config.targetHost -cne $ExpectedHost -or $config.enabled -ne $true) { Fail-Closed 'remote-control-config-boundary-invalid' }
  $ledger=$null; if (Test-Path -LiteralPath $LedgerPath -PathType Leaf) { $ledger=Get-Json $LedgerPath 'ledger-missing' }
  $firstDone=($ledger -and (Test-ExpiredRow $ledger $FirstPendingHead))
  $phase=[int]$config.phase
  if ($phase -eq 0) {
    $bootstrap=Join-Path $CanonicalRepo $BootstrapRelative
    if (-not (Test-Path -LiteralPath $bootstrap -PathType Leaf)) { Fail-Closed 'bootstrap-missing' }
    $ps="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $r=Invoke-NativeCapture $ps @('-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$bootstrap,'-ExpectedHead',$ExpectedMainHead,'-ExpectedExpiredControlHead',$FirstPendingHead,'-ReceiptTimeoutSeconds','300') 480
    if ($r.ExitCode -ne 0) { Fail-Closed 'phase-zero-bootstrap-failed' @{ exitCode=$r.ExitCode } }
  } elseif ($phase -ge 1 -and $phase -le 5) {
    if (-not $firstDone) { Fail-Closed 'phase-advanced-before-first-expired-proof' @{ phase=$phase } }
  } else { Fail-Closed 'remote-control-phase-invalid' @{ phase=$phase } }
}

function Wait-ExpiredControlChain([int]$Seconds = 360) {
  $deadline=(Get-Date).AddSeconds($Seconds)
  do {
    if (Test-Path -LiteralPath $LedgerPath -PathType Leaf) {
      $ledger=Get-Json $LedgerPath 'ledger-missing'
      $complete=$true
      foreach ($head in $ControlChain) {
        if (-not (Test-ExpiredRow $ledger $head)) { $complete=$false; break }
      }
      if ($complete -and [string]$ledger.lastAcceptedControlCommit -ceq $ControlChain[$ControlChain.Count-1]) { return $ledger }
    }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  $observed=''; if (Test-Path -LiteralPath $LedgerPath -PathType Leaf) { try{$observed=[string](Get-Content $LedgerPath -Raw|ConvertFrom-Json).lastAcceptedControlCommit}catch{} }
  Fail-Closed 'expired-control-chain-timeout' @{ observedLedgerHead=$observed }
}

function Prepare-ReleaseWorktree {
  if (Test-Path -LiteralPath $ReleaseWorktree -PathType Container) {
    $head=(Invoke-Git @('-C',$ReleaseWorktree,'rev-parse','HEAD')).ToLowerInvariant()
    $dirty=Invoke-Git @('-C',$ReleaseWorktree,'status','--porcelain','--untracked-files=all')
    if ($head -cne $ExpectedHostOpsHead -or -not [string]::IsNullOrWhiteSpace($dirty)) { Fail-Closed 'release-worktree-not-exact-clean' @{ observedHead=$head } }
  } else {
    New-Item -ItemType Directory -Path (Split-Path -Parent $ReleaseWorktree) -Force | Out-Null
    [void](Invoke-Git @('-C',$CanonicalRepo,'worktree','add','--detach',$ReleaseWorktree,$ExpectedHostOpsHead) 240)
  }
  $head=(Invoke-Git @('-C',$ReleaseWorktree,'rev-parse','HEAD')).ToLowerInvariant()
  if ($head -cne $ExpectedHostOpsHead) { Fail-Closed 'release-worktree-head-mismatch' }
}

function Build-ExactPackage {
  $node=Get-Application 'node.exe'; if (-not $node) { $node=Get-Application 'node' }
  if (-not $node) { Fail-Closed 'node-missing' }
  New-Item -ItemType Directory -Path $PackageOutput -Force | Out-Null
  $builder=Join-Path $ReleaseWorktree 'scripts\build-hostops-v3-portable.mjs'
  if (-not (Test-Path -LiteralPath $builder -PathType Leaf)) { Fail-Closed 'package-builder-missing' }
  $r=Invoke-NativeCapture $node @($builder,$PackageOutput) 300
  if ($r.ExitCode -ne 0) { Fail-Closed 'package-build-failed' @{ exitCode=$r.ExitCode } }
  try { $built=$r.Stdout | ConvertFrom-Json -ErrorAction Stop } catch { Fail-Closed 'package-build-output-invalid' }
  if ([string]$built.sourceHead -cne $ExpectedHostOpsHead -or [string]$built.archiveSha256 -cne $ExpectedArchiveSha256 -or [string]$built.contentDigest -cne $ExpectedContentDigest) {
    Fail-Closed 'package-identity-mismatch'
  }
  $archive=[string]$built.archivePath
  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { Fail-Closed 'package-archive-missing' }
  $actual=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -cne $ExpectedArchiveSha256) { Fail-Closed 'package-byte-hash-mismatch' @{ observedArchiveSha256=$actual } }
  return $archive
}

function Install-ExactPackage([string]$Archive) {
  $tar=Get-Application 'tar.exe'; if (-not $tar) { Fail-Closed 'tar-missing' }
  $temp=Join-Path $env:TEMP ('hostops-v3-pc-v6-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  $extract=Invoke-NativeCapture $tar @('-xzf',$Archive,'-C',$temp) 90
  if ($extract.ExitCode -ne 0) { Fail-Closed 'archive-extract-failed' @{ exitCode=$extract.ExitCode } }
  $manifest=Get-Json (Join-Path $temp 'manifest.json') 'manifest-missing'
  if ([string]$manifest.sourceHead -cne $ExpectedHostOpsHead -or [string]$manifest.contentDigest -cne $ExpectedContentDigest) { Fail-Closed 'manifest-identity-mismatch' }
  $installer=Join-Path $temp 'install\install-hostops-v3.ps1'
  if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { Fail-Closed 'installer-missing' }
  return [pscustomobject]@{ Temp=$temp; Installer=$installer }
}

function Invoke-ExactInstall($Prepared,[string]$Archive) {
  $ps="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $args=@('-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',[string]$Prepared.Installer,
    '-Mode','Install','-PackageRoot',[string]$Prepared.Temp,'-ArchivePath',$Archive,
    '-ExpectedArchiveSha256',$ExpectedArchiveSha256,'-WorkspaceRoot',$CanonicalRepo,'-Apply')
  $r=Invoke-NativeCapture $ps $args 480
  if ($r.ExitCode -ne 0) { Fail-Closed 'hostops-v3-install-failed' @{ exitCode=$r.ExitCode } }
  try { $result=$r.Stdout | ConvertFrom-Json -ErrorAction Stop } catch { Fail-Closed 'install-result-invalid-json' }
  if ([string]$result.status -cne 'success' -or [string]$result.sourceHead -cne $ExpectedHostOpsHead -or
      [string]$result.packageSha256 -cne $ExpectedArchiveSha256 -or [string]$result.contentDigest -cne $ExpectedContentDigest) {
    Fail-Closed 'install-result-identity-mismatch'
  }
  if ([string]::IsNullOrWhiteSpace([string]$result.receiptPath) -or -not (Test-Path -LiteralPath ([string]$result.receiptPath) -PathType Leaf)) {
    Fail-Closed 'install-receipt-missing'
  }
  return $result
}

function Invoke-AcceptanceSmoke {
  $node=Get-Application 'node.exe'; if (-not $node) { $node=Get-Application 'node' }
  if (-not $node) { Fail-Closed 'node-missing-after-install' }
  $smoke=Join-Path $InstallRoot 'runtime\hostops-v3-smoke.mjs'
  if (-not (Test-Path -LiteralPath $smoke -PathType Leaf)) { Fail-Closed 'installed-smoke-missing' }
  $r=Invoke-NativeCapture $node @($smoke,'--suite','acceptance','--workspace',$CanonicalRepo) 360
  if ($r.ExitCode -ne 0) { Fail-Closed 'acceptance-smoke-failed' @{ exitCode=$r.ExitCode } }
  try { $smokeResult=$r.Stdout | ConvertFrom-Json -ErrorAction Stop } catch { Fail-Closed 'acceptance-smoke-invalid-json' }
  if ([string]$smokeResult.status -cne 'success' -or [string]$smokeResult.suite -cne 'acceptance') { Fail-Closed 'acceptance-smoke-not-success' }
  if (@($smokeResult.receipts).Count -ne 9) { Fail-Closed 'acceptance-receipt-count-invalid' @{ count=@($smokeResult.receipts).Count } }
  return $smokeResult
}

function Assert-AcceptanceReceipts($Smoke) {
  $actions=@('host.system.health','host.process.list','host.file.write','host.file.read','host.service.status','host.task.status','host.powershell','host.ui.status','host.file.delete')
  $summary=@()
  for ($i=0; $i -lt $actions.Count; $i++) {
    $r=@($Smoke.receipts)[$i]
    if ([string]$r.action -cne $actions[$i] -or [string]$r.targetHost -cne $ExpectedHost -or
        [string]$r.sourceHead -cne $ExpectedHostOpsHead -or [string]$r.packageSha256 -cne $ExpectedArchiveSha256 -or
        [string]$r.status -cne 'success' -or [string]$r.signature.algorithm -cne 'HMAC-SHA256' -or
        [string]$r.signature.value -notmatch '^[0-9a-fA-F]{64}$') { Fail-Closed 'acceptance-receipt-invalid' @{ action=$actions[$i] } }
    $summary += [ordered]@{ action=$actions[$i]; status='success'; signed=$true; executionProfile=[string]$r.executionProfile }
  }
  return @($summary)
}

function Get-InstalledHealth {
  $tasks=@()
  foreach ($name in $HostOpsTasks) {
    $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if (-not $task -or [string]$task.State -ne 'Running') { Fail-Closed 'hostops-v3-task-not-running' @{ task=$name; state=if($task){[string]$task.State}else{'missing'} } }
    $tasks += [ordered]@{ name=$name; state='Running' }
  }
  $adapter=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object {
    [string]$_.CommandLine -match '(?i)hostops-v3-runtime\.mjs' -and [string]$_.CommandLine -match '(?i)(^|\s)adapter(\s|$)'
  }) | Select-Object -First 1
  if (-not $adapter) { Fail-Closed 'hostops-v3-adapter-process-missing' }
  $listener=Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 3847 -State Listen -ErrorAction SilentlyContinue | Where-Object { [int]$_.OwningProcess -eq [int]$adapter.ProcessId } | Select-Object -First 1
  if (-not $listener) { Fail-Closed 'hostops-v3-loopback-listener-missing' }
  return [ordered]@{ tasks=$tasks; listener=[ordered]@{address='127.0.0.1';port=3847;pid=[int]$listener.OwningProcess} }
}

function Assert-MetadataAndCleanup {
  $metadata='C:\ProgramData\PixelNetwork\JarvisHostOps\install-metadata.json'
  if (-not (Test-Path -LiteralPath $metadata -PathType Leaf)) { Fail-Closed 'install-metadata-missing' }
  [byte[]]$bytes=[IO.File]::ReadAllBytes($metadata)
  $hasBom=($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
  if ($hasBom) { Fail-Closed 'install-metadata-utf8-bom-present' }
  $m=Get-Json $metadata 'install-metadata-missing'
  if ([string]$m.sourceHead -cne $ExpectedHostOpsHead -or [string]$m.packageSha256 -cne $ExpectedArchiveSha256) { Fail-Closed 'install-metadata-identity-mismatch' }
  $smokeFile=Join-Path $CanonicalRepo '.hostops-v3-smoke.txt'
  if (Test-Path -LiteralPath $smokeFile) { Fail-Closed 'acceptance-smoke-file-left-behind' }
}

function Publish-TerminalReceipt($InstallResult,$Health,$AcceptanceSummary) {
  $receipt=[ordered]@{
    schema='hostops-v3-pc-cutover-receipt-v1'; status='HOSTOPS_V3_PC_CUTOVER_SUCCESS'; terminal=$true
    sameReleaseBytes=$true; controlChainFinal=$ControlChain[$ControlChain.Count-1]
    installReceipt=[string]$InstallResult.receiptPath; health=$Health; acceptance=$AcceptanceSummary
    authorityWidened=$false; newPublicListener=$false; publicListener=$false
  }
  Write-CutoverReceipt $receipt
  $safe=Get-Content -LiteralPath $LocalReceipt -Raw | ConvertFrom-Json
  $fence=([string][char]96)+([string][char]96)+([string][char]96)
  $body="HOSTOPS_V3_PC_CUTOVER_TERMINAL`n${fence}json`n" + ($safe | ConvertTo-Json -Depth 15) + "`n$fence"
  $payload=Join-Path $RecoveryRoot 'github-comment.json'
  Write-Utf8JsonNoBom $payload ([ordered]@{body=$body}) 16
  $gh=Get-Application 'gh.exe'; if (-not $gh) { $gh=Get-Application 'gh' }
  if (-not $gh) { Fail-Closed 'github-cli-missing-after-local-success' @{ localInstallReceipt=[string]$InstallResult.receiptPath } }
  $r=Invoke-NativeCapture $gh @('api','--method','POST','repos/pixenetwork/ai-orchestrator/issues/1035/comments','--input',$payload) 90
  if ($r.ExitCode -ne 0) { Fail-Closed 'github-terminal-receipt-publish-failed' @{ localInstallReceipt=[string]$InstallResult.receiptPath } }
  try { $published=$r.Stdout | ConvertFrom-Json -ErrorAction Stop } catch { Fail-Closed 'github-terminal-receipt-response-invalid' }
  $receipt['githubCommentId']=[int64]$published.id
  Write-CutoverReceipt $receipt
  return $receipt
}

try {
  New-Item -ItemType Directory -Path $RecoveryRoot -Force | Out-Null
  Assert-HostAndAdmin
  Prepare-CanonicalRepo
  Assert-ControlChain
  $runtime=Ensure-CanonicalQueueRunning
  Invoke-PhaseZeroBootstrapIfNeeded $runtime
  $ledger=Wait-ExpiredControlChain 360
  Prepare-ReleaseWorktree
  $archive=Build-ExactPackage
  $prepared=Install-ExactPackage $archive
  try {
    $install=Invoke-ExactInstall $prepared $archive
    $smoke=Invoke-AcceptanceSmoke
    $acceptance=Assert-AcceptanceReceipts $smoke
    $health=Get-InstalledHealth
    Assert-MetadataAndCleanup
    $terminal=Publish-TerminalReceipt $install $health $acceptance
    Write-Output ($terminal | ConvertTo-Json -Depth 15 -Compress)
  } finally {
    if ($prepared -and $prepared.Temp -and (Test-Path -LiteralPath ([string]$prepared.Temp) -PathType Container)) {
      Remove-Item -LiteralPath ([string]$prepared.Temp) -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
} catch {
  if (-not (Test-Path -LiteralPath $LocalReceipt -PathType Leaf)) {
    Write-CutoverReceipt @{ status='HOSTOPS_V3_PC_CUTOVER_FAILED_CLOSED'; failCode='unclassified-failure' }
  }
  throw
}
