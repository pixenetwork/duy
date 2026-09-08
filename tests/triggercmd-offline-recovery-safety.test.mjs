import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const installer = readFileSync(path.resolve(here, '../ops/triggercmd/add-offline-recovery-command.ps1'), 'utf8');

function extractHere(name) {
  const re = new RegExp(`\\$${name}\\s*=\\s*@'([\\s\\S]*?)'@`, 'm');
  const match = installer.match(re);
  assert.ok(match, `missing embedded here-string $${name}`);
  return match[1];
}

const recovery = extractHere('recoveryBody');

test('offline recovery accepts exactly one lowercase 40-hex source head', () => {
  assert.match(recovery, /ValidatePattern\('\^\[0-9a-f\]\{40\}\$'\)/);
  assert.match(recovery, /\$ExpectedHead -cnotmatch '\^\[0-9a-f\]\{40\}\$'/);
  assert.doesNotMatch(recovery, /ValidateSet\([^)]*shell/i);
});

test('offline recovery is sealed to DESKTOP and the canonical governed recovery script', () => {
  assert.match(recovery, /DESKTOP-7CM41S6/);
  assert.match(recovery, /C:\\Users\\Administrator\\ai-orchestrator/);
  assert.match(recovery, /scripts\\windows\\complete-jarvis-offline-recovery\.ps1/);
  assert.match(recovery, /-ExpectedHead\s+\$ExpectedHead/);
});

test('wrapper does not implement git mutation or arbitrary command authority', () => {
  for (const forbidden of [
    /Invoke-Expression/i,
    /Invoke-Command/i,
    /cmd\.exe/i,
    /WinRM/i,
    /psexec/i,
    /git\s+(?:reset|checkout|switch|clean|merge|rebase)/i,
    /Start-Process/i,
    /Register-ScheduledTask/i,
    /New-ScheduledTask/i,
  ]) assert.doesNotMatch(recovery, forbidden);
  assert.doesNotMatch(recovery, /token\.tkn/i);
});

test('same-head reinstall is rejected so normal poller repair stays on Jarvis Queue recover', () => {
  assert.match(recovery, /\.jarvis-source-head/);
  assert.match(recovery, /already-current-use-jarvis-queue-recover/);
  assert.match(recovery, /Get-ScheduledTask -TaskName \$queueTaskName/);
  assert.match(recovery, /WorkingDirectory/);
});

test('recovery output is sanitized and receipt proof remains authoritative', () => {
  assert.doesNotMatch(recovery, /Exception\.Message/i);
  assert.doesNotMatch(recovery, /\$_\s*\.\s*Exception/i);
  assert.match(recovery, /receipt-required=true/);
  assert.match(recovery, /fail-closed/);
  assert.match(recovery, /Send-Result/);
});

test('installer adds only the bounded third command and preserves the two existing recovery commands', () => {
  assert.match(installer, /C:\\Users\\Administrator\\\.TRIGGERcmdData/);
  assert.match(installer, /Jarvis Windows MCP/);
  assert.match(installer, /Jarvis Queue/);
  assert.match(installer, /Jarvis Offline Recovery/);
  assert.match(installer, /Where-Object\s*\{\s*\$_\.trigger\s*-ne\s*'Jarvis Offline Recovery'\s*\}/);
  assert.match(installer, /allowParams\s*=\s*'true'/);
  assert.doesNotMatch(installer, /Jarvis Control/);
});

test('queue task action is snapshotted once before runtime derivation', () => {
  assert.match(recovery, /\$actions\s*=\s*@\(\$queue\.Actions\)/);
  assert.match(recovery, /if \(\$actions\.Count -ne 1\)/);
  assert.match(recovery, /\$action\s*=\s*\$actions\[0\]/);
  assert.match(recovery, /queue-task-action-working-directory-unverified/);
  assert.match(recovery, /\$action\.WorkingDirectory/);
  assert.doesNotMatch(recovery, /@\(\$queue\.Actions\)\[0\]\.WorkingDirectory/);
});

test('installed source-head read failures are classified fail closed', () => {
  assert.match(recovery, /Get-Content -LiteralPath \$headPath -Raw -ErrorAction Stop/);
  assert.match(recovery, /installed-head-read-failed/);
});

test('installer binds the registered command to the exact canonical recovery script path', () => {
  assert.match(installer, /\$canonicalRecoveryCommandScript\s*=\s*\[IO\.Path\]::GetFullPath\(\$recoveryCommandScript\)/);
  assert.match(installer, /\$expectedRecoveryCommandScript\s*=\s*'C:\\Users\\Administrator\\\.TRIGGERcmdData\\scripts\\jarvis-offline-recovery\.ps1'/);
  assert.match(installer, /recovery command script path mismatch/);
  assert.match(installer, /OrdinalIgnoreCase/);
  assert.match(installer, /-File `"\$canonicalRecoveryCommandScript`"/);
});

test('installer uses collision-free verified backup before mutating commands json', () => {
  assert.match(installer, /pre-offline-recovery-\$\(\[guid\]::NewGuid\(\)\.ToString\('N'\)\)\.bak/);
  assert.match(installer, /if \(Test-Path -LiteralPath \$backup\)/);
  assert.match(installer, /Copy-Item -LiteralPath \$commandsPath -Destination \$backup -ErrorAction Stop/);
  assert.doesNotMatch(installer, /Copy-Item -LiteralPath \$commandsPath -Destination \$backup -Force/);
  assert.match(installer, /Get-FileHash -LiteralPath \$commandsPath -Algorithm SHA256/);
  assert.match(installer, /Get-FileHash -LiteralPath \$backup -Algorithm SHA256/);
  assert.match(installer, /commands backup hash mismatch/);
});

test('installer writes recovery script and commands json atomically and restores commands on update failure', () => {
  assert.match(installer, /function Write-AtomicText/);
  assert.match(installer, /Write-AtomicText -Path \$recoveryCommandScript -Text \$recoveryBody/);
  assert.match(installer, /Write-AtomicText -Path \$commandsPath -Text \$json/);
  assert.match(installer, /function Restore-CommandsBackup/);
  assert.match(installer, /Restore-CommandsBackup -BackupPath \$backup -DestinationPath \$commandsPath/);
  assert.match(installer, /commands-update-failed/);
  assert.match(installer, /Move-Item -LiteralPath \$temp -Destination \$Path -Force -ErrorAction Stop/);
});
