// The sibling suite (mcp_artifact_resources.test.js) proves the publishing and
// access-control layer from synthesised job records. This one proves the wiring
// that feeds it: that a REAL remediation, driven through the stdio server's own
// pdf_remediate tool, publishes its artifacts as it finishes — returns their
// URIs in the tool result, tells the client the list changed, and serves the
// bytes back over the protocol.
//
// Without this, the feature could be silently inert in the only scenario that
// matters: publishRunArtifacts swallows its own failures by design (artifacts
// are already safe on disk), so a broken live path degrades to doing nothing
// rather than to a red test.
//
// No Gemini key and no quota: the model is a scripted loopback HTTP server, the
// same technique as tests/mcp_driver_scripted_e2e.test.js. Real Chromium, real
// pipeline, real files on disk.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 900000, hookTimeout: 120000 });

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const FIXTURE = resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf');

const tmp = mkdtempSync(join(tmpdir(), 'alloflow-artifact-live-'));
const stateDir = join(tmp, 'job-state');
const outDir = join(tmp, 'out');

// Replies must satisfy the pipeline's strict parsers; contract mirrored from
// tests/mcp_driver_scripted_e2e.test.js.
const AUDIT_PDF = JSON.stringify({
  score: 55, summary: 'scripted PDF audit', confidence: 'high', documentLanguage: 'en',
  pageCount: 1, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false,
  critical: [],
  serious: [{ ruleId: 'image-alt', claimKind: 'absence', issue: 'Images without alternative text', wcag: '1.1.1', count: 1, location: 'page 1' }],
  moderate: [], minor: [], passes: ['document has a title'],
});
const AUDIT_HTML_WEAK = JSON.stringify({
  score: 70, summary: 'scripted weak audit',
  issues: [{ ruleId: 'heading-order', claimKind: 'structure', issue: 'Heading structure is unclear', wcag: '1.3.1', count: 1 }],
  passes: ['lang present'],
});

function dispatch(prompt) {
  if (/Reply with exactly: OK/.test(prompt)) return 'OK';
  if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return AUDIT_PDF;
  if (/Audit this HTML/i.test(prompt)) return AUDIT_HTML_WEAK;
  if (/Return ONLY a JSON array/i.test(prompt)) {
    return JSON.stringify([
      { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
      { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
    ]);
  }
  if (/Extract ALL text content/i.test(prompt)) return '# Photosynthesis Study Guide\nPlants convert light energy into chemical energy stored as glucose.';
  return '<p>Plants convert light energy into chemical energy stored as glucose.</p>';
}

let loopback;
let child;
let publishedUris = null;
let nextId = 1;
const pending = new Map();
const notifications = [];
let buffer = '';

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id === undefined && typeof msg.method === 'string') { notifications.push(msg); continue; }
    const resolver = pending.get(msg.id);
    if (resolver) { pending.delete(msg.id); resolver(msg); }
  }
}

function request(method, params, timeoutMs = 60000) {
  const id = nextId++;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(id); rejectP(new Error(`timeout waiting for ${method}`)); }, timeoutMs);
    pending.set(id, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

// A second, independent JSON-RPC client — the restart test must not share the
// first server's buffer or id space.
function secondServerClient(proc) {
  let buf = '';
  let id = 1;
  const waiting = new Map();
  proc.stdout.setEncoding('utf-8');
  proc.stdout.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (_) { continue; }
      const resolver = waiting.get(msg.id);
      if (resolver) { waiting.delete(msg.id); resolver(msg); }
    }
  });
  return (method, params) => new Promise((resolveP, rejectP) => {
    const thisId = id++;
    const timer = setTimeout(() => { waiting.delete(thisId); rejectP(new Error(`timeout waiting for ${method}`)); }, 30000);
    waiting.set(thisId, (msg) => { clearTimeout(timer); resolveP(msg); });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: thisId, method, params }) + '\n');
  });
}

beforeAll(async () => {
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  loopback = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let prompt = '';
      try {
        const j = JSON.parse(body);
        prompt = (((j.contents || [])[0] || {}).parts || []).map((p) => p.text || '').join('\n');
      } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: dispatch(String(prompt)) }] }, finishReason: 'STOP' }] }));
    });
  });
  await new Promise((r) => loopback.listen(0, '127.0.0.1', r));

  const env = {
    ...process.env,
    GEMINI_API_KEY: 'scripted-loopback-key',
    ALLOFLOW_MCP_GEMINI_BASE: 'http://127.0.0.1:' + loopback.address().port + '/v1beta/models',
    ALLOFLOW_MCP_STATE_DIR: stateDir,
    ALLOFLOW_MCP_MAX_RUN_MINUTES: '30',
  };
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'live', version: '0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
});

afterAll(() => {
  if (child) child.kill();
  if (loopback) loopback.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('remediation MCP: a real run publishes its own artifacts', () => {
  it('returns fetchable resource URIs, announces the change, and serves the bytes', async () => {
    const call = await request('tools/call', {
      name: 'pdf_remediate',
      arguments: { file_path: FIXTURE, output_dir: outDir, tagged_pdf: false, fix_passes: 1, polish_passes: 0 },
    }, 840000);
    expect(call.error, JSON.stringify(call.error)).toBeUndefined();

    const summary = call.result.structuredContent || JSON.parse(call.result.content[0].text);

    // 1. The result itself carries the URIs — a client does not have to know to
    //    go and correlate a separate resources/list against filesystem paths.
    expect(Array.isArray(summary.resources), 'result carried no resources array').toBe(true);
    const byRole = new Map(summary.resources.map((r) => [r.role, r]));
    expect([...byRole.keys()].sort()).toEqual(['accessibleHtml', 'completionManifest', 'report', 'source']);

    // The "before" is the untouched original, still at its own path.
    expect(byRole.get('source').path).toBe(FIXTURE);
    // The "after" and the report went where output_dir asked them to.
    expect(byRole.get('accessibleHtml').path.startsWith(outDir)).toBe(true);
    expect(byRole.get('report').path.startsWith(outDir)).toBe(true);

    // 2. The client was told its resource list grew, so a client that listed
    //    before the run finished refreshes instead of showing an empty shelf.
    expect(notifications.some((n) => n.method === 'notifications/resources/list_changed')).toBe(true);

    // 3. The published listing agrees with the result.
    const listed = (await request('resources/list', {})).result.resources;
    for (const role of byRole.keys()) {
      expect(listed.some((r) => r.uri === byRole.get(role).uri), `not listed: ${role}`).toBe(true);
    }

    // 4. The bytes actually come back, and match what is on disk.
    const html = (await request('resources/read', { uri: byRole.get('accessibleHtml').uri })).result;
    expect(html.contents[0].text).toBe(readFileSync(byRole.get('accessibleHtml').path, 'utf8'));
    expect(html.contents[0].text).toMatch(/Photosynthesis|light energy/i);

    const before = (await request('resources/read', { uri: byRole.get('source').uri })).result;
    expect(before.contents[0].mimeType).toBe('application/pdf');
    expect(Buffer.from(before.contents[0].blob, 'base64').equals(readFileSync(FIXTURE))).toBe(true);

    const report = (await request('resources/read', { uri: byRole.get('report').uri })).result;
    const parsed = JSON.parse(report.contents[0].text);
    expect(typeof parsed.afterScore).toBe('number');

    publishedUris = byRole;
  });

  // Rehydrating from persisted job records alone was not enough: the keyless
  // agent-bridge lane holds its run in memory and writes no rjob record, so its
  // artifacts disappeared from the resource list on every restart — in exactly
  // the lane someone without a Gemini key has to use. A standalone index makes
  // republishing independent of which lane produced the run.
  it('republishes the same artifacts to a freshly restarted server', async () => {
    expect(publishedUris, 'the run test must have populated this').toBeTruthy();

    // A genuinely new process, sharing only the state directory on disk.
    const second = spawn(process.execPath, [SERVER], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ALLOFLOW_MCP_STATE_DIR: stateDir, ALLOFLOW_MCP_NO_KEY_FILES: '1' },
    });
    try {
      const talk = secondServerClient(second);
      await talk('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'restart', version: '0' } });
      second.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

      const listed = (await talk('resources/list', {})).result.resources;
      for (const role of ['source', 'accessibleHtml', 'report']) {
        expect(listed.some((r) => r.uri === publishedUris.get(role).uri), `not republished: ${role}`).toBe(true);
      }

      // And it still serves the bytes, not just the names.
      const html = (await talk('resources/read', { uri: publishedUris.get('accessibleHtml').uri })).result;
      expect(html.contents[0].text).toBe(readFileSync(publishedUris.get('accessibleHtml').path, 'utf8'));
    } finally {
      second.kill();
    }
  });
});
