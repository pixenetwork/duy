import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const parent = readFileSync(path.resolve(here, '../ops/triggercmd/repair-windows-mcp-fallback.ps1'), 'utf8');

// Extract the embedded command scripts (single-quoted here-strings).
function extractHere(name) {
  const re = new RegExp(`\\$${name}\\s*=\\s*@'([\\s\\S]*?)'@`, 'm');
  const m = parent.match(re);
  assert.ok(m, `missing embedded here-string $${name}`);
  return m[1];
}
const windowsMcp = extractHere('windowsMcpBody');
const queue = extractHere('queueBody');

const ALLOWED_ACTIONS = /\[ValidateSet\('status','recover'\)\]/;

test('both embedded scripts accept only status|recover', () => {
  assert.match(windowsMcp, ALLOWED_ACTIONS);
  assert.match(queue, ALLOWED_ACTIONS);
});

test('no arbitrary process command-line enumeration in either script', () => {
  for (const [label, body] of [['windowsMcp', windowsMcp], ['queue', queue]]) {
    assert.doesNotMatch(body, /Get-CimInstance/i, `${label} must not use Get-CimInstance`);
    assert.doesNotMatch(body, /Win32_Process/i, `${label} must not enumerate Win32_Process`);
    assert.doesNotMatch(body, /\.CommandLine/i, `${label} must not match on CommandLine`);
  }
});

test('queue identity is derived from the scheduled task, never arbitrary processes', () => {
  // The managed runtime path must come from the verified queue task action.
  assert.match(queue, /Get-CanonicalRuntime/);
  assert.match(queue, /WorkingDirectory/);
  assert.match(queue, /queue-task-missing/);
  assert.match(queue, /queue-task-principal-unverified/);
});

test('no secret/token reads or raw exception text leaves the scripts', () => {
  for (const [label, body] of [['windowsMcp', windowsMcp], ['queue', queue]]) {
    assert.doesNotMatch(body, /token\.tkn/i, `${label} must never read token.tkn`);
    assert.doesNotMatch(body, /\$_\s*\.\s*Exception/i, `${label} must never forward Exception objects`);
    assert.doesNotMatch(body, /Exception\.Message/i, `${label} must never forward raw Exception.Message`);
    // Failures are small fixed sanitized codes, never verbatim error content.
    assert.match(body, /fail-closed/);
  }
});

test('recover paths are bounded and never create/enable/replace arbitrary tasks', () => {
  // Queue recovery: only start the existing canonical watchdog.
  assert.match(queue, /Start-ScheduledTask -TaskName \$watchdogTaskName/);
  assert.doesNotMatch(queue, /New-ScheduledTask/i);
  assert.doesNotMatch(queue, /Register-ScheduledTask/i);
  assert.doesNotMatch(queue, /Enable-ScheduledTask/i);
  assert.doesNotMatch(queue, /Disable-ScheduledTask/i);
  assert.doesNotMatch(queue, /Stop-ScheduledTask/i);
  assert.doesNotMatch(queue, /Stop-Process/i);
  // Windows MCP recovery only starts its existing scheduled task.
  assert.match(windowsMcp, /Start-ScheduledTask -TaskName 'windows-mcp-server'/);
});

test('canonical queue and watchdog identities are present', () => {
  assert.match(queue, /Pixel Network Jarvis Local Worker Queue/);
  assert.match(queue, /Pixel Network Jarvis Local Worker Queue Watchdog/);
  assert.match(queue, /local-worker-queue runtime v1/);
  assert.match(queue, /provider-worker-local-queue-heartbeat\.json/);
  assert.match(queue, /\.jarvis-source-head/);
  assert.match(queue, /watch-local-worker-queue(\\)?\.ps1/);
});

test('no generic PowerShell fallback or retired desktop-control transport', () => {
  for (const body of [windowsMcp, queue]) {
    assert.doesNotMatch(body, /Invoke-Command/i);
    assert.doesNotMatch(body, /WinRM/i);
    assert.doesNotMatch(body, /psexec/i);
  }
  assert.doesNotMatch(parent, /Get-Content.*token\.tkn/i);
});

test('queue ok is derived, not hardcoded, and unproven status exits nonzero', () => {
  // ok must be an actual conjunction of bounded proofs, never a literal $true.
  const okLine = queue.split('\n').find((ln) => /\bok\s*=\s*\(/.test(ln));
  assert.ok(okLine, 'queue ok is computed from a condition');
  assert.doesNotMatch(okLine, /ok\s*=\s*\$true/);
  // status must fail closed (nonzero) when the derived ok is false.
  assert.match(queue, /if \(-not \$ok\)/);
  assert.match(queue, /exit 2/);
});

test('queue proof uses exact sourceHead match and bounded numeric-ms poller audit', () => {
  assert.match(queue, /HeadMatch/);
  assert.match(queue, /addMillis|\$epoch\.AddMilliseconds/);
  assert.match(queue, /sourceHead/);
  assert.match(queue, /exact source-head|\$heartbeatHead -eq \$markerHead/);
});

test('poller postcondition scans a bounded tail for recognized canonical audit rows only', () => {
  // Regression (review 5036088324, HIGH): PollerFresh must not be proven by an
  // arbitrary fresh audit row. It must (a) scan a bounded tail, (b) require a
  // recognized managed poll-cycle/postcondition record with an allowed canonical
  // kind + decision, and (c) fail closed on an unrelated fresh row.
  assert.match(queue, /Get-Content .* -Tail 200/);
  assert.match(queue, /foreach \(\$line in \$tail\)/);
  // Canonical kind + allowed decision allow-list (matches audit-log.mjs KINDS).
  assert.match(queue, /\$allowedAuditKinds = @\('branch-check'/);
  assert.match(queue, /'terminal','receipt'\)/);
  assert.match(queue, /allowedAuditDecisions = @\('ACCEPTED','CLAIMED','PUBLISHED','COMPLETED'\)/);
  assert.match(queue, /\$allowedAuditKinds\) -notcontains \[string\]\$row\.kind/);
  assert.match(queue, /allowedAuditDecisions\) -notcontains/);
  // Bounded numeric Unix-ms freshness parsing is preserved.
  assert.match(queue, /\[long\]::TryParse\(\(\[string\]\$row\.at\)\.Trim\(\)/);
  assert.match(queue, /946684800000/); // year-2000 bound
  assert.match(queue, /253402300799999/); // year-9999 bound
  // Correlation/source context where available must be well-formed.
  assert.match(queue, /headSha -notmatch '\^\[0-9a-fA-F\]\{40\}\$'/);
});

test('poller postcondition fails closed: fresh unrelated audit row must not prove PollerFresh', () => {
  // The scanner must never accept a row whose kind/decision is not a recognized
  // poll-cycle postcondition, and must only match rows passing the allowlist.
  const kindCheck = /if \(@\(\$allowedAuditKinds\) -notcontains \[string\]\$row\.kind\) \{ continue \}/;
  assert.match(queue, kindCheck);
  const decisionCheck = /if \(@\(\$allowedAuditDecisions\) -notcontains \(\[string\]\$row\.decision\)\.ToUpperInvariant\(\)\) \{ continue \}/;
  assert.match(queue, decisionCheck);
  // Only healthy decisions are allow-listed; DENIED/RETRY/FAILED are excluded.
  assert.match(queue, /\$allowedAuditDecisions = @\('ACCEPTED','CLAIMED','PUBLISHED','COMPLETED'\)/);
  assert.doesNotMatch(queue, /allowedAuditDecisions = @\([^)]*'RETRY'[^)]*\)/);
  assert.doesNotMatch(queue, /allowedAuditDecisions = @\([^)]*'DENIED'[^)]*\)/);
  assert.doesNotMatch(queue, /allowedAuditDecisions = @\([^)]*'FAILED'[^)]*\)/);
});

test('windows mcp identity binds listener owner to the canonical task executable by exact PID', () => {
  // Regression (review 5036088324, HIGH): 127.0.0.1:8000 alone must not be
  // enough. Identity must be bound by exact-PID inspection to the expected
  // windows-mcp-server task executable, with no broad process enumeration.
  assert.match(windowsMcp, /Get-ScheduledTask -TaskName 'windows-mcp-server'/);
  assert.match(windowsMcp, /\$expectedExe = \[IO\.Path\]::GetFullPath/);
  assert.match(windowsMcp, /@\(\$task\.Actions\)\[0\]\.Execute/);
  assert.match(windowsMcp, /Get-Process -Id \$ownerPid/);
  assert.match(windowsMcp, /\$procPath\.Equals\(\$expectedExe, \[StringComparison\]::OrdinalIgnoreCase\)/);
  assert.doesNotMatch(windowsMcp, /Get-CimInstance/i);
  assert.doesNotMatch(windowsMcp, /Win32_Process/i);
  // ok requires the canonical task to be Running, not merely present.
  assert.match(windowsMcp, /\$state\.TaskState -eq 'Running'/);
});

test('watchdog task identity requires canonical WorkingDirectory, exact script path, and fixed args', () => {
  // Regression (review 5036088324, HIGH): a same-name/spoofed watchdog script
  // path must fail. Identity must bind canonical WorkingDirectory to the runtime,
  // the exact checked-in script path, and fixed expected arguments.
  assert.match(queue, /function Test-WatchdogVerified\(\$watchdog, \[string\]\$runtime\)/);
  // Canonical WorkingDirectory must equal the verified queue runtime.
  assert.match(queue, /\$workingDirectory\.Equals\(\$runtime, \[StringComparison\]::OrdinalIgnoreCase\)/);
  // Exact checked-in script path bound to the runtime.
  assert.match(queue, /scripts\\windows\\watch-local-worker-queue\.ps1/);
  assert.match(queue, /\$scriptPath\.Equals\(\$expectedScript, \[StringComparison\]::OrdinalIgnoreCase\)/);
  // Fixed expected args: only canonical PowerShell invocation flags and -ForceRecycle.
  assert.match(queue, /notin @\('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-ForceRecycle'\)\)/);
  // The runtime is resolved before watchdog verification in recover.
  assert.match(queue, /\$runtime = Get-CanonicalRuntime/);
  assert.match(queue, /Test-WatchdogVerified \$watchdog -runtime \$runtime/);
});

test('parent provisions exactly two commands and retires Jarvis Control idempotently', () => {
  // The retire filter lists all canonical/legacy triggers.
  assert.match(
    parent,
    /Where-Object\s*\{\s*\$_\s*\.\s*trigger\s*-notin\s*@\('Jarvis Control','Jarvis Windows MCP','Jarvis Queue'\)\s*\}/,
  );

  const installed = [...parent.matchAll(/trigger\s*=\s*'([^']+)'[\r\n]/g)].map((m) => m[1].trim());
  assert.deepEqual(installed, ['Jarvis Windows MCP', 'Jarvis Queue']);

  // Provisioning is idempotent: entries are re-added only after filtering, so a
  // repeated run replaces rather than duplicates.
  assert.ok((parent.match(/Where-Object trigger -eq 'Jarvis Windows MCP'/g) || []).length >= 1);
  assert.ok((parent.match(/Where-Object trigger -eq 'Jarvis Queue'/g) || []).length >= 1);
  assert.match(parent, /Jarvis Control/);
});

test('both installed command entries declare allowParams as string true, not boolean', () => {
  // TRIGGERcmd commands.json expects the STRING "true" (allowParams: "true"),
  // not a JSON boolean, so the agent does not silently disable/misparse status|recover params.
  const paramRe = /trigger\s*=\s*'([^']+)'[\r\n]*(?:[\s\S]*?)allowParams\s*=\s*([^\r\n]+)/g;
  const entries = new Map();
  for (const m of parent.matchAll(paramRe)) entries.set(m[1].trim(), m[2].trim());

  assert.equal(entries.size, 2, 'expected exactly two command entries');
  for (const [trigger, allow] of entries) {
    // Matched group includes the surrounding single quotes, e.g. 'true'.
    assert.equal(allow, "'true'", `${trigger} allowParams must be the string 'true'`);
  }
});