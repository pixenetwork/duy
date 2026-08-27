import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const overlayPath = path.resolve(here, '../ops/triggercmd/repair-windows-mcp-transport-overlay.ps1');
function loadWindowsMcpBody() {
  assert.equal(existsSync(overlayPath), true, 'missing transport-safe Windows MCP overlay');
  const parent = readFileSync(overlayPath, 'utf8');
  const match = parent.match(/\$windowsMcpBody\s*=\s*@'([\s\S]*?)'@/m);
  assert.ok(match, 'missing embedded $windowsMcpBody');
  return match[1];
}
test('streamable-http initialize advertises both MCP response media types', () => {
  const windowsMcp = loadWindowsMcpBody();
  assert.match(windowsMcp, /DefaultRequestHeaders\.Accept\.Clear\(\)/);
  assert.match(windowsMcp, /MediaTypeWithQualityHeaderValue[^\n]*'application\/json'/);
  assert.match(windowsMcp, /MediaTypeWithQualityHeaderValue[^\n]*'text\/event-stream'/);
});
test('streamable-http initialize accepts bounded JSON or SSE response framing', () => {
  const windowsMcp = loadWindowsMcpBody();
  assert.match(windowsMcp, /ContentType\.MediaType/);
  assert.match(windowsMcp, /application\/json/);
  assert.match(windowsMcp, /text\/event-stream/);
  assert.match(windowsMcp, /StartsWith\('data:'/);
  assert.match(windowsMcp, /Task\]::WhenAny/);
  assert.match(windowsMcp, /ConvertFrom-Json/);
  assert.match(windowsMcp, /262144/);
});
test('documented legacy SSE transport proves MCP identity through initialize', () => {
  const windowsMcp = loadWindowsMcpBody();
  assert.match(windowsMcp, /function Get-McpLegacySseServerName/);
  assert.match(windowsMcp, /'http:\/\/127\.0\.0\.1:8000\/sse'/);
  assert.match(windowsMcp, /ResponseHeadersRead/);
  assert.match(windowsMcp, /text\/event-stream/);
  assert.match(windowsMcp, /endpoint/i);
  assert.match(windowsMcp, /\/messages\/?/);
  assert.match(windowsMcp, /Get-McpServerNameFromJson/);
  assert.match(windowsMcp, /\$legacyName -eq 'windows-mcp'/);
  assert.doesNotMatch(windowsMcp, /return \(\$mediaType -eq 'text\/event-stream'\)/);
  assert.doesNotMatch(windowsMcp, /http:\/\/\$|https:\/\/\$/);
});
test('legacy SSE message endpoint is constrained to exact loopback host and fixed messages path', () => {
  const windowsMcp = loadWindowsMcpBody();
  assert.match(windowsMcp, /Host -ne '127\.0\.0\.1'/);
  assert.match(windowsMcp, /Port -ne 8000/);
  assert.match(windowsMcp, /AbsolutePath -notin @\('\/messages','\/messages\/'\)/);
});
test('health receipt exposes only a bounded transport classification', () => {
  const windowsMcp = loadWindowsMcpBody();
  assert.match(windowsMcp, /Transport\s*=\s*\$transport/);
  assert.match(windowsMcp, /transport=\$\(\$state\.Transport\)/);
  assert.match(windowsMcp, /streamable-http/);
  assert.match(windowsMcp, /'sse'/);
});
test('overlay preserves fixed-command retirement and does not add a generic shell', () => {
  assert.equal(existsSync(overlayPath), true, 'missing transport-safe Windows MCP overlay');
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.match(overlay, /repair-windows-mcp-fallback\.ps1/);
  assert.match(overlay, /Jarvis Windows MCP/);
  assert.match(overlay, /Jarvis Queue/);
  assert.match(overlay, /Jarvis Control/);
  assert.doesNotMatch(overlay, /Invoke-Command|WinRM|psexec/i);
  assert.doesNotMatch(overlay, /token\.tkn/i);
});
