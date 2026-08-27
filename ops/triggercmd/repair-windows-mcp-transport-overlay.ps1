$ErrorActionPreference = 'Stop'
$expectedHost = 'DESKTOP-7CM41S6'
$actualHost = [System.Net.Dns]::GetHostName()
if ($actualHost -ne $expectedHost) { throw 'host mismatch' }

$baseRepair = Join-Path $PSScriptRoot 'repair-windows-mcp-fallback.ps1'
if (-not (Test-Path -LiteralPath $baseRepair -PathType Leaf)) { throw 'base repair missing' }

# Reuse the already-reviewed fixed-command installer for command retirement,
# Jarvis Queue provisioning, backups, and idempotent command registration.
& $baseRepair | Out-Null

$dataDir = Join-Path $env:USERPROFILE '.TRIGGERcmdData'
$commandsPath = Join-Path $dataDir 'commands.json'
$windowsMcpScript = Join-Path $dataDir 'scripts\jarvis-windows-mcp.ps1'

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
$maxResponseBytes = 262144

function Send-Result {
  param([string]$Text)
  if (Test-Path -LiteralPath $sendResult) {
    & $sendResult $Text | Out-Null
  }
}

function Get-McpServerNameFromJson {
  param([string]$Json)
  if ([string]::IsNullOrWhiteSpace($Json)) { return $null }
  if ([System.Text.Encoding]::UTF8.GetByteCount($Json) -gt $maxResponseBytes) { return $null }
  try { $data = $Json | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
  if ([string]$data.jsonrpc -ne '2.0') { return $null }
  if ([string]$data.id -ne '1') { return $null }
  if (-not $data.result -or -not $data.result.serverInfo) { return $null }
  return [string]$data.result.serverInfo.name
}

function Read-McpSseServerName {
  param(
    [System.IO.StreamReader]$Reader,
    [datetime]$Deadline
  )
  $bytesRead = 0
  while ((Get-Date) -lt $Deadline) {
    $remainingMs = [int][math]::Max(1, [math]::Ceiling(($Deadline - (Get-Date)).TotalMilliseconds))
    $readTask = $Reader.ReadLineAsync()
    $delayTask = [System.Threading.Tasks.Task]::Delay($remainingMs)
    $waitTasks = [System.Threading.Tasks.Task[]]@($readTask, $delayTask)
    $winner = [System.Threading.Tasks.Task]::WhenAny($waitTasks).GetAwaiter().GetResult()
    if ($winner.Id -ne $readTask.Id) { return $null }
    $line = $readTask.GetAwaiter().GetResult()
    if ($null -eq $line) { return $null }
    $bytesRead += [System.Text.Encoding]::UTF8.GetByteCount($line) + 1
    if ($bytesRead -gt $maxResponseBytes) { return $null }
    if (-not $line.StartsWith('data:', [System.StringComparison]::OrdinalIgnoreCase)) { continue }
    $json = $line.Substring(5).Trim()
    if ([string]::IsNullOrWhiteSpace($json) -or $json -eq '[DONE]') { continue }
    $name = Get-McpServerNameFromJson -Json $json
    if ($name) { return $name }
  }
  return $null
}

function Get-McpServerName {
  $payload = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"jarvis-ops","version":"1"}}}'
  $client = $null
  $request = $null
  $resp = $null
  $reader = $null
  try {
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(6)
    $client.DefaultRequestHeaders.Accept.Clear()
    $client.DefaultRequestHeaders.Accept.Add([System.Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new('application/json'))
    $client.DefaultRequestHeaders.Accept.Add([System.Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new('text/event-stream'))

    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, 'http://127.0.0.1:8000/mcp/')
    $request.Content = [System.Net.Http.StringContent]::new($payload, [System.Text.Encoding]::UTF8, 'application/json')
    $resp = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    if (-not $resp.IsSuccessStatusCode) { return $null }

    $mediaType = if ($resp.Content.Headers.ContentType) { [string]$resp.Content.Headers.ContentType.MediaType } else { '' }
    if ($mediaType -eq 'application/json') {
      $bytesTask = $resp.Content.ReadAsByteArrayAsync()
      $delayTask = [System.Threading.Tasks.Task]::Delay(5000)
      $waitTasks = [System.Threading.Tasks.Task[]]@($bytesTask, $delayTask)
      $winner = [System.Threading.Tasks.Task]::WhenAny($waitTasks).GetAwaiter().GetResult()
      if ($winner.Id -ne $bytesTask.Id) { return $null }
      $bytes = $bytesTask.GetAwaiter().GetResult()
      if ($bytes.Length -gt $maxResponseBytes) { return $null }
      return Get-McpServerNameFromJson -Json ([System.Text.Encoding]::UTF8.GetString($bytes))
    }

    if ($mediaType -eq 'text/event-stream') {
      $streamTask = $resp.Content.ReadAsStreamAsync()
      $stream = $streamTask.GetAwaiter().GetResult()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8, $true, 1024, $false)
      return Read-McpSseServerName -Reader $reader -Deadline (Get-Date).AddSeconds(5)
    }

    return $null
  } catch {
    return $null
  } finally {
    if ($reader) { $reader.Dispose() }
    if ($resp) { $resp.Dispose() }
    if ($request) { $request.Dispose() }
    if ($client) { $client.Dispose() }
  }
}

function Test-McpSseEndpoint {
  $client = $null
  $request = $null
  $resp = $null
  try {
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, 'http://127.0.0.1:8000/sse')
    $request.Headers.Accept.Add([System.Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new('text/event-stream'))
    $resp = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    if (-not $resp.IsSuccessStatusCode) { return $false }
    $mediaType = if ($resp.Content.Headers.ContentType) { [string]$resp.Content.Headers.ContentType.MediaType } else { '' }
    return ($mediaType -eq 'text/event-stream')
  } catch {
    return $false
  } finally {
    if ($resp) { $resp.Dispose() }
    if ($request) { $request.Dispose() }
    if ($client) { $client.Dispose() }
  }
}

function Get-McpState {
  $task = Get-ScheduledTask -TaskName 'windows-mcp-server' -ErrorAction SilentlyContinue
  $taskState = if ($task) { [string]$task.State } else { 'Missing' }
  $listener = Get-NetTCPConnection -State Listen -LocalAddress $listenerAddress -LocalPort $listenerPort -ErrorAction SilentlyContinue | Select-Object -First 1
  $identity = $false
  $transport = 'none'

  if ($listener -and $taskState -eq 'Running') {
    $name = Get-McpServerName
    if ($name -eq 'windows-mcp') {
      $identity = $true
      $transport = 'streamable-http'
    } elseif (Test-McpSseEndpoint) {
      $identity = $true
      $transport = 'sse'
    }
  }

  [pscustomobject]@{
    TaskState = $taskState
    Listen = [bool]$listener
    Identity = $identity
    Transport = $transport
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
    $ready = $false
    do {
      Start-Sleep -Milliseconds 500
      $state = Get-McpState
      $ready = ($state.Listen -and $state.Identity -and $state.TaskState -eq 'Running')
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) { $failCode = 'mcp-health-not-ready'; throw $failCode }
  }

  $state = Get-McpState
  $ok = $state.Listen -and $state.Identity -and $state.TaskState -eq 'Running'
  $text = "windows-mcp ok=$ok task=$($state.TaskState) listener=$($state.Listen) identity=$($state.Identity) transport=$($state.Transport)"
  Send-Result $text
  Write-Output $text
  if (-not $ok) { exit 2 }
  exit 0
} catch {
  if ($failCode -eq 'none') { $failCode = 'mcp-internal-error' }
  $text = "windows-mcp error=fail-closed:$failCode"
  Send-Result $text
  Write-Error $text
  exit 1
}
'@

$tempScript = "$windowsMcpScript.transport-new"
[System.IO.File]::WriteAllText($tempScript, $windowsMcpBody, [System.Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $tempScript -Destination $windowsMcpScript -Force

$verified = @(Get-Content -LiteralPath $commandsPath -Raw | ConvertFrom-Json)
if (@($verified | Where-Object trigger -eq 'Jarvis Control').Count -ne 0) { throw 'retired command still present' }
if (@($verified | Where-Object trigger -eq 'Jarvis Windows MCP').Count -ne 1) { throw 'Jarvis Windows MCP command missing or duplicated' }
if (@($verified | Where-Object trigger -eq 'Jarvis Queue').Count -ne 1) { throw 'Jarvis Queue command missing or duplicated' }

Write-Output 'TRIGGERCMD_TRANSPORT_OVERLAY_OK commands=Jarvis Windows MCP,Jarvis Queue'
