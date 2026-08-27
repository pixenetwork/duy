import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const parent = readFileSync(path.resolve(here, '../ops/triggercmd/repair-windows-mcp-fallback.ps1'), 'utf8');
const match = parent.match(/\$windowsMcpBody\s*=\s*@'([\s\S]*?)'@/m);
assert.ok(match, 'missing embedded $windowsMcpBody');
const windowsMcp = match[1];

test('streamable-http initialize advertises both MCP response media types', () => {
  assert.match(windowsMcp, /DefaultRequestHeaders\.Accept\.Clear\(\)/);
  assert.match(windowsMcp, /MediaTypeWithQualityHeaderValue[^\n]*'application\/json'/);
  assert.match(windowsMcp, /MediaTypeWithQualityHeaderValue[^\n]*'text\/event-stream'/);
});

test('streamable-http initialize accepts bounded JSON or SSE response framing', () => {
  assert.match(windowsMcp, /ContentType\.MediaType/);
  assert.match(windowsMcp, /application\/json/);
  assert.match(windowsMcp, /text\/event-stream/);
  assert.match(windowsMcp, /StartsWith\('data:'/);
  assert.match(windowsMcp, /ConvertFrom-Json/);
  assert.match(windowsMcp, /262144/);
});

test('documented SSE transport is detected only through the fixed loopback endpoint', () => {
  assert.match(windowsMcp, /function Test-McpSseEndpoint/);
  assert.match(windowsMcp, /'http:\/\/127\.0\.0\.1:8000\/sse'/);
  assert.match(windowsMcp, /ResponseHeadersRead/);
  assert.match(windowsMcp, /text\/event-stream/);
  assert.doesNotMatch(windowsMcp, /http:\/\/\$|https:\/\/\$/);
});

test('health receipt exposes only a bounded transport classification', () => {
  assert.match(windowsMcp, /Transport\s*=\s*\$transport/);
  assert.match(windowsMcp, /transport=\$\(\$state\.Transport\)/);
  assert.match(windowsMcp, /streamable-http/);
  assert.match(windowsMcp, /'sse'/);
});
