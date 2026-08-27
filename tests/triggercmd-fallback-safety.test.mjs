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