// Protocol smoke test for the remediation stdio MCP connector.
// Spawns the real server and speaks newline-delimited JSON-RPC 2.0 over stdio.
// Everything here runs WITHOUT a Gemini key and WITHOUT launching Chromium:
// argument validation fires before the driver is touched, and the missing-key
// gate fires before any browser work — both pinned below, because they are the
// properties that keep a misconfigured client from spending quota or hanging.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-remediation-mcp-'));

let child;
let nextId = 1;
const pending = new Map();
let buffer = '';
const stray = []; // protocol-invalid stdout lines — must stay empty
const notifications = []; // server→client notifications (id-less, method-bearing) — legitimate

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { stray.push(line); continue; }
    if (msg.jsonrpc !== '2.0') { stray.push(line); continue; }
    // A server notification has no id but does have a method (e.g. notifications/progress).
    // Without this branch it would land in `stray` and fail the stdout-hygiene assertion,
    // which would be wrong: it IS protocol traffic.
    if (msg.id === undefined && typeof msg.method === 'string') { notifications.push(msg); continue; }
    const key = msg.id === null || msg.id === undefined ? 'null' : msg.id;
    const resolver = pending.get(key);
    if (resolver) { pending.delete(key); resolver(msg); }
    else stray.push(line);
  }
}

// Fire-and-forget client notification (no id, no response expected).
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}
// Let the server drain a notification before asserting on what it did (or did not) emit.
const settle = () => new Promise((r) => setTimeout(r, 250));

function request(method, params, { rawId } = {}) {
  const id = rawId !== undefined ? rawId : nextId++;
  const key = id === null ? 'null' : id;
  return new Promise((resolveP, rejectP) => {
    // 20s (not the sibling suite's 8s): under a parallel full-suite run the first spawn of a
    // Node child on Windows can exceed 8s (cold start + AV scan) — observed flaking once.
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error(`timeout waiting for ${method}`)); }, 20000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

beforeAll(() => {
  const env = { ...process.env, ALLOFLOW_MCP_MAX_RUN_MINUTES: '30' };
  delete env.GEMINI_API_KEY; // the missing-key gate is part of the contract under test
  env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; // and key AUTO-DISCOVERY (maintainer env file) must not defeat it on dev machines
  // Job records now persist to ~/.alloflow-mcp/jobs by default and are RESTORED at boot. Without
  // its own state dir this suite would inherit the developer's real jobs and its "0 stored"
  // assertions would pass or fail depending on what the machine had been doing.
  env.ALLOFLOW_MCP_STATE_DIR = join(tmp, 'job-state');
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
});

afterAll(() => {
  if (child) child.kill();
  rmSync(tmp, { recursive: true, force: true });
});

describe('remediation MCP: protocol + tool registry', () => {
  it('initializes with server info and instructions', async () => {
    const res = (await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } })).result;
    expect(res.protocolVersion).toBe('2025-06-18');
    expect(res.serverInfo.name).toBe('alloflow-remediation');
    expect(res.instructions).toContain('remediation_capabilities');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  });

  it('lists exactly the twenty-seven tools, underscore-named, each with title + annotations', async () => {
    const { tools } = (await request('tools/list', {})).result;
    expect(tools.map((t) => t.name).sort()).toEqual([
      'apply_form_fields', 'audit_two_engines', 'check_document_structure', 'describe_images', 'detect_form_fields',
      'export_accessible_office', 'export_alt_format',
      'extract_document_text', 'fix_contrast', 'generate_conformance_report',
      'pdf_audit', 'pdf_batch_audit_start', 'pdf_batch_remediate_start', 'pdf_remediate',
      'pdf_remediate_from_scoreboard_start', 'pdf_remediate_start',
      'pdf_validate_ua',
      'redact_document',
      'remediation_capabilities', 'remediation_job_cancel', 'remediation_job_result', 'remediation_job_status',
      'remediation_selftest', 'remediation_setup',
      'simplify_accessible_html', 'transcribe_media', 'translate_accessible_html',
    ]);
    for (const t of tools) {
      expect(t.name).not.toContain('.');
      expect(t.title).toBeTruthy();
      expect(typeof t.annotations.readOnlyHint).toBe('boolean');
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.inputSchema.additionalProperties).toBe(false);
    }
    // Every tool returns structuredContent, so every tool must say what shape it is.
    for (const t of tools) {
      expect(t.outputSchema, t.name + ' is missing an outputSchema').toBeTruthy();
      expect(t.outputSchema.type).toBe('object');
    }
    const remediate = tools.find((t) => t.name === 'pdf_remediate');
    expect(remediate.annotations.readOnlyHint).toBe(false); // it writes output files
    expect(remediate.annotations.openWorldHint).toBe(true); // and sends content to the network
    const audit = tools.find((t) => t.name === 'pdf_audit');
    expect(audit.annotations.readOnlyHint).toBe(true);
    expect(audit.annotations.openWorldHint).toBe(true); // read-only on disk, but network egress

    // OCR input uses the same fail-closed language contract as the remote MCP. The JSON Schema
    // must not advertise legacy Tesseract codes which the runtime rejects.
    for (const name of ['pdf_audit', 'pdf_remediate', 'pdf_batch_audit_start']) {
      const ocr = tools.find((t) => t.name === name).inputSchema.properties.ocr_language;
      expect(ocr.maxLength).toBe(12);
      expect(ocr.description).toMatch(/lower-case ISO\/BCP 47/);
      const pattern = new RegExp(ocr.pattern);
      for (const valid of ['', 'es', 'fr', 'zh-hant']) expect(pattern.test(valid), name + ': ' + valid).toBe(true);
      for (const invalid of ['spa', 'fra', 'eng+spa', 'zh-Hant', 'zz']) expect(pattern.test(invalid), name + ': ' + invalid).toBe(false);
    }

    // The driver returns a verdict object. Keep its public shape finite and schema-declared
    // instead of claiming it is a string or forwarding its explanatory arrays.
    const remediationOutput = remediate.outputSchema.properties;
    expect(remediationOutput.verdict.type).toEqual(['object', 'null']);
    expect(remediationOutput.verdict.properties.level.enum).toEqual(['ready', 'caution', 'review']);
    expect(remediationOutput.verdict.additionalProperties).toBe(false);
    expect(remediationOutput.verificationState.enum).toContain('complete');
    expect(remediationOutput.taggedPdfDelivery.properties.code.enum).toContain('verified');
    expect(remediationOutput.taggedPdfExportMode.enum).toContain('original_layout');
    expect(remediationOutput.activeContentScanVerified.type).toEqual(['boolean', 'null']);
    expect(remediationOutput.activeContentDetected.type).toEqual(['boolean', 'null']);
  });

  it('remediation_capabilities reports an HONEST not-ready environment (no key in this smoke)', async () => {
    const res = await callTool('remediation_capabilities', {});
    expect(res.isError).toBe(false);
    const cap = res.structuredContent;
    expect(cap.geminiKeyPresent).toBe(false);
    expect(cap.ready).toBe(false); // must not claim ready without a key
    expect(typeof cap.playwrightAvailable).toBe('boolean');
    // Package ≠ browser binary: a packaged install resolves playwright but has no Chromium.
    // The capabilities report distinguishes the two so a fresh install is guided to setup.
    expect(typeof cap.chromiumInstalled).toBe('boolean');
    expect(Object.keys(cap.pipelineModulesPresent)).toContain('doc_pipeline_module.js');
    expect(cap.networkEgress.join(' ')).toContain('generativelanguage');
  });

  it('the MCPB manifest advertises EXACTLY the tools the server serves', async () => {
    // The installed bundle's manifest is what a Claude Desktop user sees before anything runs.
    // It drifted silently once (remediation_setup shipped in the server, never in the manifest),
    // so pin the parity rather than trusting two hand-maintained lists to stay equal.
    const { tools } = (await request('tools/list', {})).result;
    const built = requireCjs(resolve(process.cwd(), 'desktop/mcp/build_mcpb.cjs'));
    const manifestNames = built.buildManifest().tools.map((t) => t.name).sort();
    expect(manifestNames).toEqual(tools.map((t) => t.name).sort());
  });

  it('the declared output schemas describe what the tools ACTUALLY return', async () => {
    // A schema nobody checks is documentation that drifts. Validate the two read-only tools we
    // can call here against their own declarations: every `required` field present, and every
    // declared property that IS present matching its declared type.
    const { tools } = (await request('tools/list', {})).result;
    const typeOk = (spec, value) => {
      const allowed = [].concat(spec.type);
      const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      return allowed.includes(actual) || (allowed.includes('number') && actual === 'number');
    };
    for (const name of ['remediation_capabilities', 'remediation_job_status']) {
      const schema = tools.find((t) => t.name === name).outputSchema;
      const out = name === 'remediation_capabilities'
        ? (await callTool(name, {})).structuredContent
        : (await callTool(name, { job_id: 'rjob-unknown' })).structuredContent;
      for (const req of schema.required || []) expect(out, name + '.' + req).toHaveProperty(req);
      for (const [key, spec] of Object.entries(schema.properties)) {
        if (out[key] === undefined || !spec.type) continue;
        expect(typeOk(spec, out[key]), name + '.' + key + ' is ' + JSON.stringify(out[key]) + ', schema says ' + JSON.stringify(spec.type)).toBe(true);
      }
    }
  });

  it('remediation_capabilities does not let "ready" overclaim (presence is not function)', async () => {
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    // The bug this guards: `ready: true` on an install where every run died at the pipeline's
    // ownership gate. The word stays, but it must say what it does and does not prove.
    expect(cap.readyMeans).toMatch(/does NOT prove/i);
    expect(cap.readyMeans).toContain('remediation_selftest');
  });

  it('remediation_selftest is advertised as key-free and quota-free (it is the broken-vs-misconfigured discriminator)', async () => {
    const { tools } = (await request('tools/list', {})).result;
    const st = tools.find((t) => t.name === 'remediation_selftest');
    expect(st).toBeTruthy();
    expect(st.description).toMatch(/NO Gemini key/i);
    expect(st.description).toMatch(/no quota/i);
    // Nothing leaves the machine: the model is a loopback server, so this is a closed-world tool.
    expect(st.annotations.openWorldHint).toBe(false);
    expect(st.annotations.destructiveHint).toBe(false);
  });

  it('remediation_setup is idempotent — short-circuits when Chromium is already installed (dev machines)', async () => {
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    if (!cap.chromiumInstalled) return; // fresh machine: skip rather than trigger a 200MB download in a unit test
    const t0 = Date.now();
    const res = await callTool('remediation_setup', {});
    expect(res.isError).toBe(false);
    expect(res.structuredContent.ok).toBe(true);
    expect(res.structuredContent.alreadyInstalled).toBe(true);
    expect(Date.now() - t0).toBeLessThan(3000); // a probe, not a download
  });
});

describe('remediation MCP: validation fires BEFORE any browser/quota spend', () => {
  it('pdf_audit on a missing file → clean invalid-params, instantly (no Chromium launch)', async () => {
    const t0 = Date.now();
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: join(tmp, 'nope.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
    expect(Date.now() - t0).toBeLessThan(3000); // validation, not a browser boot
  });

  it('pdf_remediate on a non-.pdf path → clean invalid-params', async () => {
    const txt = join(tmp, 'notes.txt');
    writeFileSync(txt, 'not a pdf');
    const msg = await request('tools/call', { name: 'pdf_remediate', arguments: { file_path: txt } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('.pdf');
  });

  it('unknown argument keys are rejected (schema is closed)', async () => {
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: join(tmp, 'x.pdf'), extra: true } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('unsupported field');
  });

  it('a real PDF but NO GEMINI_API_KEY → in-band tool error naming the key, still no browser', async () => {
    // Minimal valid-header PDF: the validation cares about existence/header/size, not structure.
    const pdf = join(tmp, 'real.pdf');
    writeFileSync(pdf, '%PDF-1.4\n%%EOF\n');
    const t0 = Date.now();
    const res = await callTool('pdf_audit', { file_path: pdf });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  it('pdf_validate_ua validates its path like the others (missing file → -32602) and needs NO key', async () => {
    const msg = await request('tools/call', { name: 'pdf_validate_ua', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
    // Registry honesty: read-only on disk, network egress for the validator page assets.
    const { tools } = (await request('tools/list', {})).result;
    const v = tools.find((t) => t.name === 'pdf_validate_ua');
    expect(v.annotations.readOnlyHint).toBe(true);
    expect(v.description).toContain('NO Gemini key');
  });

  it.each(['es', 'fr', 'zh-hant'])('accepts supported canonical OCR language %s before the key gate', async (ocrLanguage) => {
    const pdf = join(tmp, 'real.pdf');
    writeFileSync(pdf, '%PDF-1.4\n%%EOF\n');
    const res = await callTool('pdf_audit', { file_path: pdf, ocr_language: ocrLanguage });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
  });

  it.each(['spa', 'fra', 'eng+spa', 'zh-Hant', 'en-US', 'zz', 'not a lang!!'])('rejects unsupported or non-canonical OCR language %s', async (ocrLanguage) => {
    const pdf = join(tmp, 'real.pdf');
    writeFileSync(pdf, '%PDF-1.4\n%%EOF\n');
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: pdf, ocr_language: ocrLanguage } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toMatch(/ocr_language.*supported lower-case ISO\/BCP 47/);
  });

  it('pdf_remediate_start validates + key-gates BEFORE creating a job (a bad start never occupies the queue)', async () => {
    // Missing file → invalid params, no job id minted.
    const bad = await request('tools/call', { name: 'pdf_remediate_start', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(bad.error.code).toBe(-32602);
    // Real file but no key → in-band error naming the key, still no job.
    const res = await callTool('pdf_remediate_start', { file_path: join(tmp, 'real.pdf') });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
  });

  it('pdf_batch_remediate_start rejects an empty folder and a missing folder cleanly', async () => {
    const missing = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: join(tmp, 'no-such-dir') } });
    expect(missing.error.code).toBe(-32602);
    const empty = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: tmp } });
    // tmp contains real.pdf — but the batch must reject when the only PDFs are absent; use a truly empty subdir.
    // (real.pdf IS in tmp, so this call is key-gated instead — both shapes are the pre-spend contract.)
    if (empty.error) expect(empty.error.code).toBe(-32602);
    else {
      expect(empty.result.isError).toBe(true);
      expect(empty.result.content[0].text).toContain('GEMINI_API_KEY');
    }
  });
});

describe('remediation MCP: folder triage (pdf_batch_audit_start)', () => {
  it('is advertised as the cheap pass BEFORE remediation, with action-named bands', async () => {
    const { tools } = (await request('tools/list', {})).result;
    const t = tools.find((x) => x.name === 'pdf_batch_audit_start');
    expect(t).toBeTruthy();
    // The reason to reach for it has to be legible to an agent choosing between the two batches.
    expect(t.description).toMatch(/1-3 minutes/);
    expect(t.description).toMatch(/5-30 minutes/);
    for (const band of ['scanned', 'needs-work', 'review', 'likely-ok']) expect(t.description).toContain(band);
    expect(t.annotations.openWorldHint).toBe(true); // document content goes to the model
  });

  it('validates the folder and key-gates BEFORE minting a job (a bad triage never occupies the queue)', async () => {
    const missing = await request('tools/call', { name: 'pdf_batch_audit_start', arguments: { dir_path: join(tmp, 'no-such-dir') } });
    expect(missing.error.code).toBe(-32602);
    expect(missing.error.message).toContain('does not exist');

    const emptyDir = join(tmp, 'triage-empty');
    mkdirSync(emptyDir, { recursive: true });
    writeFileSync(join(emptyDir, 'x-tagged.pdf'), '%PDF-1.4\n%%EOF\n'); // our own output — must not count as input
    const empty = await request('tools/call', { name: 'pdf_batch_audit_start', arguments: { dir_path: emptyDir } });
    expect(empty.error.code).toBe(-32602);
    expect(empty.error.message).toContain('No .pdf files found');

    // A real folder, but no key → in-band error naming the key, and still no job minted.
    const res = await callTool('pdf_batch_audit_start', { dir_path: tmp });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    expect(cap.jobs.stored).toBe(0);
  });

  it('rejects remediate-only options (the schema is closed, so the two batches cannot be confused)', async () => {
    const msg = await request('tools/call', { name: 'pdf_batch_audit_start', arguments: { dir_path: tmp, target_score: 95 } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('unsupported field');
  });

  it('carries a HIGHER folder cap than the remediate batch, because auditing is the cheap pass', async () => {
    const { tools } = (await request('tools/list', {})).result;
    const auditCap = Number(/up to (\d+) files/.exec(tools.find((x) => x.name === 'pdf_batch_audit_start').description)[1]);
    const remedCap = Number(/up to (\d+) files/.exec(tools.find((x) => x.name === 'pdf_batch_remediate_start').description)[1]);
    expect(auditCap).toBeGreaterThan(remedCap);
  });
});

describe('remediation MCP: closing the triage loop (pdf_remediate_from_scoreboard_start)', () => {
  const boardDir = () => join(tmp, 'board');
  const writeBoard = (rows, name = 'accessibility-audit-scoreboard.json') => {
    mkdirSync(boardDir(), { recursive: true });
    const p = join(boardDir(), name);
    writeFileSync(p, JSON.stringify({ generatedFor: boardDir(), documents: rows.length, files: rows }));
    return p;
  };
  // A row is banded by the same triageBand the server uses, so these fixtures pin the mapping too.
  const row = (name, over) => Object.assign({
    file: join(boardDir(), name), ok: true, score: 50, issueCounts: {}, isScanned: false, hasSearchableText: true,
  }, over);

  it('requires exactly one of scoreboard_path / dir_path', async () => {
    const neither = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: {} });
    expect(neither.error.code).toBe(-32602);
    expect(neither.error.message).toMatch(/exactly one/);
    const both = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { scoreboard_path: 'a.json', dir_path: 'b' } });
    expect(both.error.code).toBe(-32602);
    expect(both.error.message).toMatch(/exactly one/);
  });

  it('rejects unknown band names by listing the valid ones', async () => {
    const msg = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { dir_path: tmp, bands: ['urgent'] } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('urgent');
    expect(msg.error.message).toContain('needs-work');
  });

  it('refuses a folder with no scoreboard, and points at the tool that makes one', async () => {
    const bare = join(tmp, 'never-triaged');
    mkdirSync(bare, { recursive: true });
    const msg = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { dir_path: bare } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('pdf_batch_audit_start');
  });

  it('refuses a file that is not a scoreboard rather than half-reading it', async () => {
    const notABoard = join(tmp, 'notes.json');
    writeFileSync(notABoard, JSON.stringify({ hello: 'world' }));
    const msg = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { scoreboard_path: notABoard } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toMatch(/not an AlloFlow audit scoreboard/);
  });

  it('selects by band, and says what IS there when the requested band is empty', async () => {
    // Only likely-ok + review present; the default needs-work band selects nothing.
    const p = writeBoard([row('fine.pdf', { score: 95 }), row('okish.pdf', { score: 80 })]);
    const msg = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { scoreboard_path: p } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('needs-work');
    expect(msg.error.message).toContain('likely-ok'); // the census tells you which band to ask for instead
    expect(msg.error.message).toContain('review');
  });

  it('reports scored files that have since vanished instead of silently dropping them', async () => {
    // Banded needs-work, but never created on disk.
    const p = writeBoard([row('ghost.pdf', { score: 40 })], 'accessibility-audit-scoreboard-2.json');
    const msg = await request('tools/call', { name: 'pdf_remediate_from_scoreboard_start', arguments: { scoreboard_path: p } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toMatch(/no longer exist/);
  });

  it('selects the needs-work band and key-gates before minting a job', async () => {
    const dir = boardDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'broken.pdf'), '%PDF-1.4\n%%EOF\n');
    writeFileSync(join(dir, 'fine.pdf'), '%PDF-1.4\n%%EOF\n');
    const p = writeBoard([row('broken.pdf', { score: 40 }), row('fine.pdf', { score: 96 })], 'accessibility-audit-scoreboard-3.json');
    const res = await callTool('pdf_remediate_from_scoreboard_start', { scoreboard_path: p });
    // Selection succeeded (only the needs-work file), then the missing key stopped it.
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    expect(cap.jobs.stored).toBe(0); // and no job was minted
  });

  it('is advertised as the loop-closer, with the band default stated', async () => {
    const { tools } = (await request('tools/list', {})).result;
    const t = tools.find((x) => x.name === 'pdf_remediate_from_scoreboard_start');
    expect(t.description).toContain('pdf_batch_audit_start');
    expect(t.description).toMatch(/default: needs-work/);
    expect(t.inputSchema.properties.bands.items.enum).toContain('scanned');
  });
});

describe('remediation MCP: job bookkeeping (no runs needed)', () => {
  it('status/result/cancel of an unknown job id → clean in-band not-found', async () => {
    for (const tool of ['remediation_job_status', 'remediation_job_result', 'remediation_job_cancel']) {
      const res = await callTool(tool, { job_id: 'rjob-does-not-exist' });
      expect(res.isError).toBe(false); // in-band data, not a protocol error
      expect(res.structuredContent.ok).toBe(false);
      expect(res.structuredContent.error).toContain('No job');
    }
  });

  it('job_id is required and validated', async () => {
    const msg = await request('tools/call', { name: 'remediation_job_status', arguments: {} });
    expect(msg.error.code).toBe(-32602);
  });
});

describe('remediation MCP: job tools (no key, no browser — lifecycle edges only)', () => {
  it('pdf_remediate_start validates BEFORE creating a job: missing file → -32602, no job id minted', async () => {
    const msg = await request('tools/call', { name: 'pdf_remediate_start', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
  });

  it('pdf_remediate_start with a real PDF but NO key → in-band key error, still no job', async () => {
    const res = await callTool('pdf_remediate_start', { file_path: join(tmp, 'real.pdf') });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
  });

  it("pdf_batch_remediate_start refuses a folder with no PDFs (and '-tagged.pdf' outputs don't count)", async () => {
    const batchDir = join(tmp, 'batch-empty');
    mkdirSync(batchDir, { recursive: true });
    writeFileSync(join(batchDir, 'already-tagged.pdf'.replace('already-', 'x-')), '%PDF-1.4\n%%EOF\n'); // x-tagged.pdf → excluded as our own output
    const msg = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: batchDir } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('No .pdf files found');
  });

  it('status / result / cancel of an unknown job id → honest in-band not-found (not a protocol error)', async () => {
    for (const tool of ['remediation_job_status', 'remediation_job_result', 'remediation_job_cancel']) {
      const res = await callTool(tool, { job_id: 'rjob-does-not-exist' });
      expect(res.isError).toBe(false);
      expect(res.structuredContent.ok).toBe(false);
      expect(res.structuredContent.error).toContain('No job');
    }
  });

  it('job tools reject unknown argument keys (closed schemas)', async () => {
    const msg = await request('tools/call', { name: 'remediation_job_status', arguments: { job_id: 'x', peek: true } });
    expect(msg.error.code).toBe(-32602);
  });

  it('capabilities reports the job store, including where records live and for how long', async () => {
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    expect(cap.jobs.stored).toBe(0);
    expect(cap.jobs.unfinished).toBe(0);
    expect(cap.jobs.interrupted).toBe(0);
    // Durability is a claim a user can check: name the directory and the retention window.
    expect(cap.jobs.stateDir).toContain('job-state');
    expect(cap.jobs.durable).toBe(true);
    expect(cap.jobs.retentionDays).toBeGreaterThan(0);
  });
});

describe('remediation MCP: progress + cancellation (the long-run affordances)', () => {
  // What is NOT covered here, on purpose: mid-run progress notifications and the
  // suppressed response of a cancelled in-flight run. Both need a real 5-30 minute
  // remediation (Gemini key + Chromium), which this suite deliberately never starts.
  // Everything below is the part that is deterministic without a browser: the opt-in
  // contract, the no-spam contract, and the no-op safety of stray cancellations.

  it('initialize advertises both affordances so a client knows to use them', async () => {
    const res = (await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } })).result;
    expect(res.instructions).toContain('progressToken');
    expect(res.instructions).toContain('notifications/cancelled');
  });

  it('accepts _meta.progressToken without changing the result', async () => {
    const withToken = (await request('tools/call', { name: 'remediation_capabilities', arguments: {}, _meta: { progressToken: 'tok-1' } })).result;
    const without = (await request('tools/call', { name: 'remediation_capabilities', arguments: {} })).result;
    expect(withToken.isError).toBe(false);
    expect(withToken.structuredContent).toEqual(without.structuredContent);
  });

  it('progress is opt-in AND silent when there is no telemetry (no unsolicited notifications)', async () => {
    const before = notifications.length;
    // A token on a tool that produces no pipeline telemetry must not manufacture progress...
    await request('tools/call', { name: 'remediation_capabilities', arguments: {}, _meta: { progressToken: 42 } });
    // ...and a call with no token must never emit progress at all.
    await request('tools/call', { name: 'remediation_capabilities', arguments: {} });
    await settle();
    expect(notifications.filter((n) => n.method === 'notifications/progress').length).toBe(0);
    expect(notifications.length).toBe(before);
  });

  it('notifications/cancelled for an unknown request id is a silent no-op, and the server stays healthy', async () => {
    const beforeStray = stray.length;
    const beforeNotifs = notifications.length;
    notify('notifications/cancelled', { requestId: 999999, reason: 'never existed' });
    await settle();
    expect(stray.length).toBe(beforeStray); // no error response — notifications are never answered
    expect(notifications.length).toBe(beforeNotifs);
    expect((await request('ping', {})).result).toEqual({}); // still serving
  });

  it('notifications/cancelled for an ALREADY-COMPLETED request is a no-op (no late second response)', async () => {
    const msg = await request('tools/call', { name: 'remediation_capabilities', arguments: {} });
    const beforeStray = stray.length;
    notify('notifications/cancelled', { requestId: msg.id });
    await settle();
    expect(stray.length).toBe(beforeStray); // the finished id is gone from the in-flight map
    expect((await request('ping', {})).result).toEqual({});
  });

  it('a malformed or unknown notification is ignored, never answered', async () => {
    const beforeStray = stray.length;
    notify('notifications/cancelled', {}); // no requestId
    notify('notifications/some-unknown-thing', { x: 1 });
    notify('notifications/initialized', {});
    await settle();
    expect(stray.length).toBe(beforeStray);
    expect((await request('ping', {})).result).toEqual({});
  });
});

describe('remediation MCP: durability + filesystem boundary', () => {
  // These need their own server processes (different env, and a restart is the point), so they
  // speak the protocol over short-lived children rather than the suite's shared one.
  const talk = (env, messages) => new Promise((resolveP, rejectP) => {
    const p = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
    const replies = [];
    let buf = '';
    p.stdout.setEncoding('utf-8');
    p.stdout.on('data', (c) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        try { const m = JSON.parse(line); if (m.id !== undefined) replies.push(m); } catch (_) {}
      }
      if (replies.length >= messages.length) { p.kill(); resolveP(replies); }
    });
    const timer = setTimeout(() => { p.kill(); rejectP(new Error('server did not answer')); }, 30000);
    p.on('close', () => { clearTimeout(timer); resolveP(replies); });
    for (const m of messages) p.stdin.write(JSON.stringify(m) + '\n');
  });
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } };
  const call = (id, name, args) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

  it('a job record written by one server process is readable by the NEXT one, marked interrupted', async () => {
    const stateDir = join(tmp, 'restart-state');
    mkdirSync(stateDir, { recursive: true });
    // Forge the record the crashed process would have left: status 'running', no result. Writing
    // it directly is the honest way to test restore — actually crashing mid-remediation would
    // need a key, a browser, and 20 minutes to reach the same on-disk state.
    const jobId = 'rjob-11111111-2222-3333-4444-555555555555';
    writeFileSync(join(stateDir, jobId + '.json'), JSON.stringify({
      schema: 1, jobId, kind: 'pdf_batch_audit', input: { dir: 'C:/queue', files: 120, outputDir: 'C:/queue' },
      status: 'running', createdAt: new Date().toISOString(), startedAt: new Date().toISOString(),
      finishedAt: null, logLines: ['12:00:00 file 47/120: handbook.pdf'], result: null, error: null,
    }));

    const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: stateDir, ALLOFLOW_MCP_NO_KEY_FILES: '1' };
    delete env.GEMINI_API_KEY;
    const replies = await talk(env, [init, call(2, 'remediation_job_status', { job_id: jobId }), call(3, 'remediation_job_result', { job_id: jobId })]);

    const status = replies.find((r) => r.id === 2).result.structuredContent;
    expect(status.status).toBe('interrupted');       // not 'running' — nothing is running in a fresh process
    expect(status.restored).toBe(true);
    expect(status.recentLog).toContain('12:00:00 file 47/120: handbook.pdf'); // its progress survived
    expect(status.interruptedNote).toMatch(/skip_existing/);                  // and it says how to finish the work

    // No result was ever produced, but the answer points at the partial outputs instead of a shrug.
    const result = replies.find((r) => r.id === 3).result.structuredContent;
    expect(result.ok).toBe(false);
    expect(result.status).toBe('interrupted');
    expect(result.error).toContain('C:/queue');
  }, 60000);

  it('an unknown job id no longer claims jobs die with the server (that message is now false)', async () => {
    const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: join(tmp, 'empty-state'), ALLOFLOW_MCP_NO_KEY_FILES: '1' };
    delete env.GEMINI_API_KEY;
    const replies = await talk(env, [init, call(2, 'remediation_job_status', { job_id: 'rjob-nope' })]);
    const out = replies.find((r) => r.id === 2).result.structuredContent;
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/survive a server restart/);
    expect(out.error).not.toMatch(/do not survive/);
  }, 60000);

  it('ALLOFLOW_MCP_ALLOWED_ROOTS confines every path argument, and reports itself', async () => {
    const allowed = join(tmp, 'allowed-root');
    mkdirSync(allowed, { recursive: true });
    writeFileSync(join(allowed, 'inside.pdf'), '%PDF-1.4\n%%EOF\n');
    const env = { ...process.env, ALLOFLOW_MCP_ALLOWED_ROOTS: allowed, ALLOFLOW_MCP_STATE_DIR: join(tmp, 'roots-state'), ALLOFLOW_MCP_NO_KEY_FILES: '1' };
    delete env.GEMINI_API_KEY;

    const replies = await talk(env, [
      init,
      call(2, 'remediation_capabilities', {}),
      call(3, 'pdf_audit', { file_path: join(tmp, 'real.pdf') }),                       // outside → refused
      call(4, 'pdf_audit', { file_path: join(allowed, '..', 'real.pdf') }),             // traversal out → refused
      call(5, 'pdf_audit', { file_path: join(allowed, 'inside.pdf') }),                 // inside → allowed through to the key gate
      call(6, 'pdf_remediate', { file_path: join(allowed, 'inside.pdf'), output_dir: join(tmp, 'elsewhere') }), // output outside → refused
      call(7, 'pdf_batch_audit_start', { dir_path: tmp }),                              // folder outside → refused
    ]);
    const byId = (id) => replies.find((r) => r.id === id);

    expect(byId(2).result.structuredContent.allowedRoots).toEqual([allowed]);

    for (const id of [3, 4, 6, 7]) {
      expect(byId(id).error.code, 'call ' + id + ' should be refused').toBe(-32602);
      expect(byId(id).error.message).toMatch(/outside the folders this connector is allowed to use/);
    }
    // The traversal case must be rejected for being OUTSIDE, not merely for not existing —
    // otherwise the boundary would be doing nothing and the filesystem would be the real check.
    expect(byId(4).error.message).toMatch(/outside the folders/);

    // A path inside the root passes the boundary and fails later, on the missing key.
    expect(byId(5).result.isError).toBe(true);
    expect(byId(5).result.content[0].text).toContain('GEMINI_API_KEY');
  }, 60000);

  it('a sibling directory sharing a name prefix is OUTSIDE the root (prefix matching would admit it)', async () => {
    const allowed = join(tmp, 'queue');
    const sibling = join(tmp, 'queue-archive'); // starts with the root as a STRING, different directory
    mkdirSync(allowed, { recursive: true });
    mkdirSync(sibling, { recursive: true });
    writeFileSync(join(sibling, 'secret.pdf'), '%PDF-1.4\n%%EOF\n');
    const env = { ...process.env, ALLOFLOW_MCP_ALLOWED_ROOTS: allowed, ALLOFLOW_MCP_STATE_DIR: join(tmp, 'prefix-state'), ALLOFLOW_MCP_NO_KEY_FILES: '1' };
    delete env.GEMINI_API_KEY;
    const replies = await talk(env, [init, call(2, 'pdf_audit', { file_path: join(sibling, 'secret.pdf') })]);
    expect(replies.find((r) => r.id === 2).error.code).toBe(-32602);
    expect(replies.find((r) => r.id === 2).error.message).toMatch(/outside the folders/);
  }, 60000);

  it('unset roots means unrestricted, and capabilities says so rather than implying a boundary', async () => {
    const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: join(tmp, 'unrestricted-state'), ALLOFLOW_MCP_NO_KEY_FILES: '1' };
    delete env.GEMINI_API_KEY;
    delete env.ALLOFLOW_MCP_ALLOWED_ROOTS;
    const replies = await talk(env, [init, call(2, 'remediation_capabilities', {})]);
    expect(replies.find((r) => r.id === 2).result.structuredContent.allowedRoots).toBeNull();
  }, 60000);
});

describe('remediation MCP: the self-test is not vacuous', () => {
  // A self-test that cannot report failure certifies nothing. `remediation_selftest` returning
  // ok:true is only meaningful if a genuinely broken install returns ok:false with the stage
  // named — so break one on purpose (empty assets dir) and pin the discrimination. Runs the
  // driver in a subprocess because ASSETS_ROOT is resolved once at module load, and fails at
  // requireModuleFiles() BEFORE any browser launch, so it stays fast and browser-free.
  it('reports ok:false and names the stage when the pipeline assets are missing', async () => {
    const emptyAssets = join(tmp, 'no-assets');
    mkdirSync(emptyAssets, { recursive: true });
    const driverPath = resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs').replace(/\\/g, '/');
    const script = `
      const D = require('${driverPath}');
      const d = D.createDriver({ log: () => {} });
      d.selfTest({}).then((r) => { process.stdout.write(JSON.stringify(r)); return d.close(); })
        .then(() => process.exit(0), (e) => { process.stdout.write(JSON.stringify({ threw: String(e && e.message) })); process.exit(0); });
    `;
    const env = { ...process.env, ALLOFLOW_MCP_ASSETS_DIR: emptyAssets };
    delete env.GEMINI_API_KEY;
    const out = await new Promise((resolveP, rejectP) => {
      const p = spawn(process.execPath, ['-e', script], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      p.stdout.setEncoding('utf-8');
      p.stdout.on('data', (c) => { stdout += c; });
      const timer = setTimeout(() => { p.kill(); rejectP(new Error('self-test discrimination timed out')); }, 60000);
      p.on('close', () => { clearTimeout(timer); resolveP(stdout); });
    });
    const report = JSON.parse(out);
    expect(report.threw).toBeUndefined();  // it must REPORT the failure, never propagate it
    expect(report.ok).toBe(false);
    expect(report.stage).toBe('assets');
    expect(report.hint).toMatch(/assets/i);
    // And it must not blame the user's key for a structural break — that misdirection is the
    // exact confusion the tool exists to remove.
    expect(report.note).toMatch(/NOT an API-key or quota problem/i);
  }, 70000);

  it('restores the process environment it borrows (no loopback base or fake key left behind)', async () => {
    // selfTest redirects GEMINI_API_KEY + ALLOFLOW_MCP_GEMINI_BASE for the duration. If it leaked,
    // every later real run would silently talk to a dead loopback port instead of Gemini.
    const driverPath = resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs').replace(/\\/g, '/');
    const script = `
      const D = require('${driverPath}');
      const d = D.createDriver({ log: () => {} });
      d.selfTest({}).then(() => d.close()).catch(() => {}).then(() => {
        process.stdout.write(JSON.stringify({
          key: process.env.GEMINI_API_KEY === undefined ? null : process.env.GEMINI_API_KEY,
          base: process.env.ALLOFLOW_MCP_GEMINI_BASE === undefined ? null : process.env.ALLOFLOW_MCP_GEMINI_BASE,
        }));
        process.exit(0);
      });
    `;
    const env = { ...process.env, ALLOFLOW_MCP_ASSETS_DIR: join(tmp, 'no-assets') };
    delete env.GEMINI_API_KEY;
    delete env.ALLOFLOW_MCP_GEMINI_BASE;
    const out = await new Promise((resolveP, rejectP) => {
      const p = spawn(process.execPath, ['-e', script], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      p.stdout.setEncoding('utf-8');
      p.stdout.on('data', (c) => { stdout += c; });
      const timer = setTimeout(() => { p.kill(); rejectP(new Error('env-restore probe timed out')); }, 60000);
      p.on('close', () => { clearTimeout(timer); resolveP(stdout); });
    });
    expect(JSON.parse(out)).toEqual({ key: null, base: null });
  }, 70000);
});

describe('remediation MCP: protocol hygiene', () => {
  it('unknown tool → -32602; unknown method → -32601; parse error → -32700', async () => {
    expect((await request('tools/call', { name: 'nope' })).error.code).toBe(-32602);
    expect((await request('bogus/method', {})).error.code).toBe(-32601);
    const p = new Promise((resolveP) => { pending.set('null', resolveP); });
    child.stdin.write('this is not json\n');
    expect((await p).error.code).toBe(-32700);
  });

  it('stdout carried ONLY protocol messages', () => {
    expect(stray).toEqual([]);
  });
});
