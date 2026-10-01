// A remediation run's before/after documents and report are useless to an MCP
// client that only receives their filesystem paths — nothing in the protocol
// lets it open, render or offer them for download. This suite pins the fix:
// every artifact a run produced is published as an MCP resource, fetchable over
// the same stdio transport, and NOTHING else on disk is.
//
// The runs here are synthesised as persisted job records rather than driven end
// to end, because what is under test is the publishing and access-control
// layer, not the pipeline: a real run costs minutes and a browser, and would
// prove less about the boundary that matters.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const JOB_RECORD_SCHEMA = 3; // must track the constant in the server

const tmp = mkdtempSync(join(tmpdir(), 'alloflow-artifact-resources-'));
const stateDir = join(tmp, 'job-state');
const outDir = join(tmp, 'out');

const JOB_ID = 'rjob-11111111-2222-3333-4444-555555555555';
const SOURCE_PATH = join(outDir, 'lesson.pdf');
const HTML_PATH = join(outDir, 'lesson-accessible.html');
const REPORT_PATH = join(outDir, 'lesson-remediation-report.json');
const MANIFEST_PATH = join(outDir, 'lesson-remediation-completion.json');

const HTML_BODY = '<!doctype html><html lang="en"><body><h1>Lesson</h1></body></html>';
// A byte sequence that is NOT valid UTF-8, so a base64 round-trip is a real
// assertion: a text-encoded read would corrupt it.
const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.7\n', 'ascii'), Buffer.from([0xff, 0xfe, 0x00, 0x01]), Buffer.from('\n%%EOF\n', 'ascii')]);

let child;
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

function request(method, params) {
  const id = nextId++;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(id); rejectP(new Error(`timeout waiting for ${method}`)); }, 20000);
    pending.set(id, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const artifactUri = (role) => `alloflow-remediation://artifact/${JOB_ID}/${role}`;

beforeAll(async () => {
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(SOURCE_PATH, PDF_BYTES);
  writeFileSync(HTML_PATH, HTML_BODY, 'utf8');
  writeFileSync(REPORT_PATH, JSON.stringify({ verdict: { level: 'review' }, beforeScore: 13, afterScore: 96 }), 'utf8');
  writeFileSync(MANIFEST_PATH, JSON.stringify({ schema: 1, kind: 'alloflow-remediation-completion' }), 'utf8');

  writeFileSync(join(stateDir, `${JOB_ID}.json`), JSON.stringify({
    jobId: JOB_ID,
    kind: 'pdf_remediate',
    input: SOURCE_PATH,
    status: 'completed',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    logLines: [],
    progress: null,
    result: {
      input: SOURCE_PATH,
      files: { accessibleHtml: HTML_PATH, report: REPORT_PATH, completionManifest: MANIFEST_PATH },
      verdict: { level: 'review' },
      beforeScore: 13,
      afterScore: 96,
    },
    error: null,
    cancelRequested: false,
    execution: null,
    attemptNumber: 1,
    fileRows: [],
    persistedAt: new Date().toISOString(),
    schema: JOB_RECORD_SCHEMA,
  }), 'utf8');

  const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: stateDir, ALLOFLOW_MCP_NO_KEY_FILES: '1' };
  delete env.GEMINI_API_KEY;
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'artifacts', version: '0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
});

afterAll(() => {
  if (child) child.kill();
  rmSync(tmp, { recursive: true, force: true });
});

describe('remediation MCP: run artifacts are published as resources', () => {
  it('lists the before document, the after document and the report for a completed run', async () => {
    const { resources } = (await request('resources/list', {})).result;
    const byUri = new Map(resources.map((r) => [r.uri, r]));

    // The bundled skill still lists; artifacts are additive, not a replacement.
    expect(resources.some((r) => r.uri.startsWith('skill://'))).toBe(true);

    for (const role of ['source', 'accessibleHtml', 'report', 'completionManifest']) {
      expect(byUri.has(artifactUri(role)), `missing resource for role ${role}`).toBe(true);
    }
    // No tagged PDF was produced by this run, so none is advertised — the list
    // must describe what exists, not what the pipeline can sometimes emit.
    expect(byUri.has(artifactUri('taggedPdf'))).toBe(false);

    const before = byUri.get(artifactUri('source'));
    expect(before.mimeType).toBe('application/pdf');
    expect(before.size).toBe(PDF_BYTES.length);
    expect(before.description).toContain(SOURCE_PATH);
    expect(byUri.get(artifactUri('accessibleHtml')).mimeType).toBe('text/html');
    expect(byUri.get(artifactUri('report')).mimeType).toBe('application/json');
  });

  it('serves text artifacts as text and binary artifacts as base64, byte for byte', async () => {
    const html = (await request('resources/read', { uri: artifactUri('accessibleHtml') })).result;
    expect(html.contents).toHaveLength(1);
    expect(html.contents[0].text).toBe(HTML_BODY);
    expect(html.contents[0].mimeType).toBe('text/html');

    const report = (await request('resources/read', { uri: artifactUri('report') })).result;
    expect(JSON.parse(report.contents[0].text).afterScore).toBe(96);

    const pdf = (await request('resources/read', { uri: artifactUri('source') })).result;
    expect(pdf.contents[0].text).toBeUndefined();
    expect(Buffer.from(pdf.contents[0].blob, 'base64').equals(PDF_BYTES)).toBe(true);
  });

  // The whole point of routing through a registry of ids rather than paths: an
  // MCP client (or anything that can reach one) must not be able to turn this
  // connector into a general file reader.
  it('refuses every URI it did not itself publish', async () => {
    const forbidden = [
      artifactUri('notARole'),
      `alloflow-remediation://artifact/${JOB_ID}/../../../../etc/passwd`,
      'alloflow-remediation://artifact/rjob-does-not-exist/report',
      'alloflow-remediation://artifact//report',
      'file:///etc/passwd',
      `file://${SOURCE_PATH}`,
      SOURCE_PATH,
    ];
    for (const uri of forbidden) {
      const res = await request('resources/read', { uri });
      expect(res.error, `expected refusal for ${uri}`).toBeTruthy();
      expect(res.error.code, `wrong code for ${uri}`).toBe(-32602);
      expect(res.result).toBeUndefined();
    }
  });

  it('rejects unknown parameters instead of ignoring them', async () => {
    const res = await request('resources/read', { uri: artifactUri('report'), path: SOURCE_PATH });
    expect(res.error.code).toBe(-32602);
  });

  it('reports an artifact deleted after the run as gone rather than serving stale bytes', async () => {
    rmSync(MANIFEST_PATH, { force: true });
    const res = await request('resources/read', { uri: artifactUri('completionManifest') });
    expect(res.error).toBeTruthy();
    expect(res.error.message).toMatch(/no longer on disk/i);
    // The path is named so the operator can go look for it themselves.
    expect(res.error.message).toContain(MANIFEST_PATH);
  });
});
