import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const overlayPath = path.resolve(here, '../ops/triggercmd/repair-queue-result-window-overlay.ps1');

function loadOverlay() {
  assert.equal(existsSync(overlayPath), true, 'missing queue result-window overlay');
  return readFileSync(overlayPath, 'utf8');
}

test('queue recovery overlay chains through the reviewed transport overlay', () => {
  const overlay = loadOverlay();
  assert.match(overlay, /repair-windows-mcp-transport-overlay\.ps1/);
  assert.doesNotMatch(overlay, /repair-windows-mcp-fallback\.ps1['\"]?\s*$/m);
});

test('queue recovery removes the 90-second synchronous result wait', () => {
  const overlay = loadOverlay();
  assert.match(overlay, /AddSeconds\\\(90\\\)/);
  assert.match(overlay, /Start-Sleep -Milliseconds 1000/);
  assert.match(overlay, /Start-Sleep -Milliseconds 200/);
  assert.match(overlay, /recovery-not-ready/);
  assert.match(overlay, /replacement count must equal 1/i);
});

test('queue timing patch is exact, bounded, and does not widen authority', () => {
  const overlay = loadOverlay();
  assert.match(overlay, /jarvis-queue\.ps1/);
  assert.match(overlay, /RegexOptions\]::Singleline/);
  assert.match(overlay, /Start-ScheduledTask -TaskName \$watchdogTaskName/);
  assert.doesNotMatch(overlay, /New-ScheduledTask|Register-ScheduledTask|Enable-ScheduledTask|Disable-ScheduledTask|Stop-Process|Invoke-Command|WinRM|psexec/i);
  assert.doesNotMatch(overlay, /token\.tkn/i);
});

test('patched recover uses one immediate canonical postcondition check', () => {
  const overlay = loadOverlay();
  assert.match(overlay, /Get-CanonicalRuntime/);
  assert.match(overlay, /Get-MonitoredQueue/);
  assert.match(overlay, /HeartbeatFresh/);
  assert.match(overlay, /HeadMatch/);
  assert.match(overlay, /PollerFresh/);
  assert.match(overlay, /heartbeatNewEnough/);
  assert.match(overlay, /\$d\.RuntimeIntegrity/);
  assert.match(overlay, /\$d\.AuditPathCanonical/);
});

test('queue status binds runtime integrity and poller diagnostics without new execution authority', () => {
  const overlay = loadOverlay();
  assert.match(overlay, /jarvis-local-always-on-activation-receipt\.json/);
  assert.match(overlay, /Get-FileHash -LiteralPath \$candidate -Algorithm SHA256/);
  assert.match(overlay, /receipt\.sourceHead/);
  assert.match(overlay, /provider-worker-queue-supervisor\.mjs/);
  assert.match(overlay, /provider-worker-remote-control-loop\.mjs/);
  assert.match(overlay, /jarvis-remote-control-poller\.mjs/);
  assert.match(overlay, /remote-control\\poll-cycle\.mjs/);
  assert.match(overlay, /watch-local-worker-queue\.ps1/);
  assert.match(overlay, /remote-control\.json/);
  assert.match(overlay, /AuditPathCanonical/);
  assert.match(overlay, /runtimeIntegrity=/);
  assert.match(overlay, /pollerReason=/);
  assert.match(overlay, /activation-manifest-invalid/);
  assert.match(overlay, /audit-path-mismatch/);
  assert.match(overlay, /no-accepted-audit/);
  assert.doesNotMatch(overlay, /Invoke-Expression|Invoke-Command|WinRM|psexec|cmd\.exe/i);
});
