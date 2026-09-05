// Conformance check: the official MCP TypeScript SDK client over Streamable HTTP against the
// AlloFlow remediation connector. This is the client stack HTTP-only hosts build on.
//
// The SDK is deliberately NOT a repo dependency. Run from a scratch project that has it:
//   mkdir /tmp/mcp-sdk && cd /tmp/mcp-sdk && npm init -y && npm i @modelcontextprotocol/sdk
//   MCP_SDK_DIR=/tmp/mcp-sdk node /abs/path/dev-tools/mcp_http_sdk_client_check.mjs   (server path defaults to this checkout)
// Prints SDK_STDIO_CHECK PASS for the reference stdio client, then SDK_HTTP_CHECK PASS when bearer auth, path-token auth, session ids, tools, prompts,
// resources and a rejected bad token all behave. Evidence of the 2026-09-05 run:
// scratch/mcp-v010-hosts/EVIDENCE.md.
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
// ESM resolves imports relative to THIS file, so the SDK is loaded from MCP_SDK_DIR (default: cwd).
const SDK_DIR = resolve(process.env.MCP_SDK_DIR || process.cwd(), 'node_modules', '@modelcontextprotocol', 'sdk');
const { Client } = await import(pathToFileURL(resolve(SDK_DIR, 'dist', 'esm', 'client', 'index.js')).href);
const { StreamableHTTPClientTransport } = await import(pathToFileURL(resolve(SDK_DIR, 'dist', 'esm', 'client', 'streamableHttp.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(resolve(SDK_DIR, 'dist', 'esm', 'client', 'stdio.js')).href);
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVER = process.env.ALLOFLOW_MCP_SERVER || fileURLToPath(new URL('../desktop/mcp/alloflow-remediation-mcp-stdio.cjs', import.meta.url));
const TOKEN = 'sdk-check-' + Math.random().toString(16).slice(2);
const dir = mkdtempSync(join(tmpdir(), 'alloflow-sdk-http-'));
// 0. stdio through the SDK's reference client (Claude Desktop, Claude Code, Codex, Cursor, VS Code, Gemini CLI path)
{
  const stdioEnv = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: join(dir, 'stdio-state') };
  delete stdioEnv.GEMINI_API_KEY;
  const t0 = new StdioClientTransport({ command: process.execPath, args: [SERVER], env: stdioEnv, stderr: 'pipe' });
  const c0 = new Client({ name: 'sdk-stdio-check', version: '1' });
  const started = Date.now();
  await c0.connect(t0);
  const tools0 = await c0.listTools();
  const caps0 = await c0.callTool({ name: 'remediation_capabilities', arguments: {} });
  const firstCallMs = Date.now() - started;
  console.log(JSON.stringify({ stdio: { serverInfo: c0.getServerVersion(), toolCount: tools0.tools.length, vendorHashVerified: caps0.structuredContent?.vendorAssets?.hashVerified, vendorFiles: caps0.structuredContent?.vendorAssets?.files, connectPlusFirstCallMs: firstCallMs } }, null, 1));
  await c0.close();
  if (tools0.tools.length < 30 || !caps0.structuredContent?.vendorAssets?.hashVerified) { console.log('SDK_STDIO_CHECK FAIL'); process.exit(1); }
  console.log('SDK_STDIO_CHECK PASS');
}
const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: join(dir, 'state'), ALLOFLOW_MCP_HTTP_PORT: '0', ALLOFLOW_MCP_HTTP_TOKEN: TOKEN };
delete env.GEMINI_API_KEY;
const child = spawn(process.execPath, [SERVER], { env, stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
const port = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('no listen line: ' + stderr)), 90000);
  child.stderr.on('data', (d) => { stderr += d; const m = /listening on http:\/\/127\.0\.0\.1:(\d+)\/mcp/.exec(stderr); if (m) { clearTimeout(t); resolve(Number(m[1])); } });
});
child.stdin.end(); // service-style: stdin closed, HTTP must keep it alive
const results = {};
try {
  // 1. Bearer header (Codex --bearer-token-env-var style)
  const t1 = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp'), { requestInit: { headers: { Authorization: 'Bearer ' + TOKEN } } });
  const c1 = new Client({ name: 'sdk-http-check', version: '1' });
  await c1.connect(t1);
  results.serverInfo = c1.getServerVersion();
  results.protocolCapabilities = Object.keys(c1.getServerCapabilities() || {});
  const tools = await c1.listTools();
  results.toolCount = tools.tools.length;
  const caps = await c1.callTool({ name: 'remediation_capabilities', arguments: {} });
  results.transports = caps.structuredContent?.transports;
  results.geminiOptional = caps.structuredContent?.geminiOptionalToolNames;
  const voices = await c1.callTool({ name: 'document_narration_voices', arguments: { language: 'es-MX' } });
  results.voice = voices.structuredContent?.voices?.[0]?.voiceId;
  const prompts = await c1.listPrompts();
  results.prompts = prompts.prompts.map((p) => p.name);
  const resources = await c1.listResources();
  results.resourceCount = resources.resources.length;
  results.sessionId = t1.sessionId || null;
  await c1.close();
  // 2. Path token, no headers (ChatGPT-style connector URL)
  const t2 = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp/' + TOKEN));
  const c2 = new Client({ name: 'sdk-http-check-path', version: '1' });
  await c2.connect(t2);
  results.pathTokenPing = await c2.ping();
  await c2.close();
  // 3. Wrong token must be rejected by the SDK transport
  const t3 = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp'), { requestInit: { headers: { Authorization: 'Bearer nope' } } });
  const c3 = new Client({ name: 'sdk-http-check-bad', version: '1' });
  try { await c3.connect(t3); results.wrongToken = 'ACCEPTED (BAD)'; } catch (e) { results.wrongToken = 'rejected: ' + String(e.message).slice(0, 80); }
  console.log(JSON.stringify(results, null, 1));
  console.log('SDK_HTTP_CHECK', results.toolCount > 30 && results.transports?.http?.listening && results.voice === 'es_MX-ald-medium' && /rejected/.test(results.wrongToken) ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('SDK_HTTP_CHECK FAIL', e && e.stack || e, '\nserver stderr tail:', stderr.slice(-600));
  process.exitCode = 1;
} finally { child.kill(); }
