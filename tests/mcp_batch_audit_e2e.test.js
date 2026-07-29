// Behavioral e2e for pdf_batch_audit_start — a REAL folder triage driven through the REAL stdio
// server, in headless Chromium, against a SCRIPTED loopback Gemini (no key, no quota, no live
// model). The protocol smoke next door proves the tool validates and key-gates before minting a
// job; this proves the thing it actually produces: a scoreboard a coordinator can open.
//
// Why it exists: the connector's only end-to-end safety net was a single test, and when that test
// went red it was quarantined rather than diagnosed, which is how a bug that made remediation
// impossible survived. A NEW capability ships with its own coverage.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 420000, hookTimeout: 60000 });

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const FIXTURE = resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf');

// Contract-shaped audit reply: issues need ruleId/claimKind/count, the reply needs confidence and
// the document-metadata booleans, or the pipeline's strict parse discards it as "no evidence".
// Same contract the driver e2e and the shipped self-test canary encode.
const AUDIT_PDF = JSON.stringify({
  score: 60, summary: 'scripted triage audit', confidence: 'high', documentLanguage: 'en',
  pageCount: 1, hasSearchableText: true, hasImages: false, hasTables: false, hasForms: false,
  critical: [],
  serious: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1, location: 'document' }],
  moderate: [], minor: [], passes: ['document has a language'],
});
// The output-audit contract is a DIFFERENT shape from the initial audit (flat `issues`, optional
// severity) and is strict-parsed separately, so the loop-closing test needs it too.
const AUDIT_HTML = JSON.stringify({
  score: 80, summary: 'scripted output audit',
  issues: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1 }],
  passes: ['document has a language'],
});

// Mirrors the shipped self-test's dispatcher: specific prompts first, HTML-expecting prompts
// claimed before the generic JSON rules (several of them contain the word "JSON" only to say
// "do NOT wrap in JSON"), and well-formed empty JSON for the optional enrichment passes so their
// parse failures cannot masquerade as our own stub noise.
function scriptedReply(prompt) {
  if (/Reply with exactly: OK/.test(prompt)) return 'OK';
  if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return AUDIT_PDF;
  if (/Audit this HTML/i.test(prompt)) return AUDIT_HTML;
  if (/Return ONLY a JSON array/i.test(prompt)) return JSON.stringify([{ type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis' }]);
  if (/Extract ALL text content/i.test(prompt)) return '# Photosynthesis Study Guide';
  if (/raw HTML only|do NOT wrap in JSON|Return the COMPLETE fixed HTML|Return ONLY the fixed fragment/i.test(prompt)) return '<p>Plants convert light energy into glucose.</p>';
  if (/JSON array/i.test(prompt)) return '[]';
  if (/\bJSON\b/i.test(prompt)) return '{}';
  return '<p>Plants convert light energy into glucose.</p>';
}

let server = null;
let child = null;
let tmp = null;
let docsDir = null;
let nextId = 1;
const pending = new Map();
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
    if (msg.id === undefined) continue; // notification
    const r = pending.get(msg.id);
    if (r) { pending.delete(msg.id); r(msg); }
  }
}

function request(method, params) {
  const id = nextId++;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(id); rejectP(new Error('timeout waiting for ' + method)); }, 60000);
    pending.set(id, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

async function runTriageToCompletion(args) {
  const start = (await callTool('pdf_batch_audit_start', args)).structuredContent;
  expect(start.jobId).toBeTruthy();
  const deadline = Date.now() + 360000;
  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = (await callTool('remediation_job_status', { job_id: start.jobId })).structuredContent;
    if (st.status === 'completed') break;
    if (st.status === 'failed' || st.status === 'cancelled') throw new Error('triage ' + st.status + ': ' + st.error);
    if (Date.now() > deadline) throw new Error('triage did not finish; last log: ' + JSON.stringify(st.recentLog));
  }
  const res = (await callTool('remediation_job_result', { job_id: start.jobId })).structuredContent;
  expect(res.ok).toBe(true);
  return res.result;
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let prompt = '';
      try {
        const j = JSON.parse(body);
        prompt = (((j.contents || [])[0] || {}).parts || []).map((p) => p.text || '').join('\n');
      } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: scriptedReply(String(prompt)) }] }, finishReason: 'STOP' }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  tmp = mkdtempSync(join(tmpdir(), 'alloflow-triage-'));
  docsDir = join(tmp, 'queue');
  mkdirSync(docsDir, { recursive: true });
  copyFileSync(FIXTURE, join(docsDir, 'handbook.pdf'));
  copyFileSync(FIXTURE, join(docsDir, 'syllabus.pdf'));
  copyFileSync(FIXTURE, join(docsDir, 'already-tagged.pdf'.replace('already-', 'prior-'))); // prior-tagged.pdf: our own output, must be ignored

  child = spawn(process.execPath, [SERVER], {
    cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GEMINI_API_KEY: 'scripted-loopback-key',
      ALLOFLOW_MCP_GEMINI_BASE: 'http://127.0.0.1:' + server.address().port + '/v1beta/models',
      // Job records now persist. Without its own state dir this suite would write into the
      // developer's real ~/.alloflow-mcp/jobs and its jobs would be restored by every later run.
      ALLOFLOW_MCP_STATE_DIR: join(tmp, 'job-state'),
    },
  });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'triage-e2e', version: '0' } });
});

afterAll(() => {
  if (child) child.kill();
  if (server) server.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('pdf_batch_audit_start — folder triage e2e (scripted loopback Gemini)', () => {
  it('audits the folder, bands every document, and writes an openable scoreboard', async () => {
    const out = await runTriageToCompletion({ dir_path: docsDir });

    // '-tagged.pdf' is one of our own outputs and must never be re-ingested as an input.
    expect(out.requested).toBe(2);
    expect(out.audited).toBe(2);
    expect(out.failed).toBe(0);
    expect(out.files.map((f) => f.file).some((f) => /prior-tagged\.pdf$/.test(f))).toBe(false);

    // Every row carries the triage facts, and the score is the pipeline's deduction-grounded
    // number (NOT the 60 the scripted model claimed — that is the honesty redesign).
    for (const row of out.files) {
      expect(row.ok).toBe(true);
      expect(typeof row.score).toBe('number');
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
      expect(row.issueCounts).toBeTruthy();
      expect(typeof row.hasSearchableText).toBe('boolean');
    }
    expect(Object.values(out.bands).reduce((a, b) => a + b, 0)).toBe(2);
    expect(typeof out.medianScore).toBe('number');

    // The artifacts exist and the CSV is the thing a coordinator actually opens.
    expect(existsSync(out.scoreboardJson)).toBe(true);
    expect(existsSync(out.scoreboardCsv)).toBe(true);
    const board = JSON.parse(readFileSync(out.scoreboardJson, 'utf8'));
    expect(board.documents).toBe(2);
    expect(board.files).toHaveLength(2);
    expect(board.triage).toMatch(/next action/i);
    const csv = readFileSync(out.scoreboardCsv, 'utf8').trim().split('\r\n');
    expect(csv[0]).toBe('name,file,band,score,critical,serious,moderate,minor,pages,scanned,searchableText,language,error');
    expect(csv).toHaveLength(3); // header + 2 rows
    // Leading column is the bare filename so the sheet is scannable; the band is the action.
    for (const line of csv.slice(1)) {
      const cells = line.split(',');
      expect(cells[0]).toMatch(/\.pdf$/);
      expect(cells[0]).not.toContain('\\'); // basename, not a path
      expect(['scanned', 'needs-work', 'review', 'likely-ok', 'failed']).toContain(cells[2]);
    }
  }, 400000);

  it('resumes without re-spending quota, and the new scoreboard is still COMPLETE', async () => {
    // The point of resumability is not just "skip" — a resumed triage whose scoreboard had holes
    // where the skips were would be worse than useless, so prior rows are carried forward.
    const before = readdirSync(join(docsDir)).filter((n) => n.startsWith('accessibility-audit-scoreboard')).length;
    expect(before).toBeGreaterThan(0);

    const out = await runTriageToCompletion({ dir_path: docsDir });
    expect(out.audited).toBe(0);
    expect(out.skipped).toBe(2);
    expect(out.files).toHaveLength(2);
    expect(out.files.every((f) => f.resumedFromPriorRun === true)).toBe(true);
    expect(out.files.every((f) => typeof f.score === 'number')).toBe(true);

    // Never overwrites: the resumed run wrote a NEW collision-safe pair beside the first.
    const after = readdirSync(join(docsDir)).filter((n) => n.startsWith('accessibility-audit-scoreboard')).length;
    expect(after).toBeGreaterThan(before);
    expect(JSON.parse(readFileSync(out.scoreboardJson, 'utf8')).files).toHaveLength(2);
  }, 200000);

  it('skip_existing:false re-audits the same folder (the resume is an opt-out, not a trap)', async () => {
    const out = await runTriageToCompletion({ dir_path: docsDir, skip_existing: false });
    expect(out.audited).toBe(2);
    expect(out.skipped).toBe(0);
  }, 400000);

  it('closes the loop: the scoreboard feeds pdf_remediate_from_scoreboard_start', async () => {
    // The whole point of triage is that this step handles FEWER documents than the folder holds.
    // The scripted audit scores both files identically, so pick whichever band they landed in and
    // prove the selection is driven by the scoreboard rather than by re-listing the directory.
    const boards = readdirSync(docsDir).filter((n) => n.startsWith('accessibility-audit-scoreboard') && n.endsWith('.json'));
    expect(boards.length).toBeGreaterThan(0);
    const board = JSON.parse(readFileSync(join(docsDir, boards[boards.length - 1]), 'utf8'));
    const bandOf = (r) => (r.isScanned ? 'scanned' : r.score < 70 ? 'needs-work' : r.score < 90 ? 'review' : 'likely-ok');
    const band = bandOf(board.files[0]);

    const start = (await callTool('pdf_remediate_from_scoreboard_start', {
      dir_path: docsDir, bands: [band],
      // Keep the run short: this test proves the SELECTION and the wiring, not the fix loop —
      // that is what the driver e2e covers.
      fix_passes: 0, polish_passes: 0, tagged_pdf: false,
    })).structuredContent;

    expect(start.jobId).toBeTruthy();
    expect(start.bands).toEqual([band]);
    expect(start.scoreboard).toContain('accessibility-audit-scoreboard');
    expect(start.selectedFrom).toBe(2);   // it read the scoreboard's census...
    expect(start.files).toBe(2);          // ...and both scored files are in this band

    // It really remediates: poll to completion and check the per-file outputs exist.
    const deadline = Date.now() + 360000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 2000));
      const st = (await callTool('remediation_job_status', { job_id: start.jobId })).structuredContent;
      // The ETA only appears once a file has finished, and must never claim to know sooner.
      if (st.progress && st.progress.filesDone === 0) expect(st.progress.estimatedMinutesRemaining).toBeUndefined();
      if (st.status === 'completed') { expect(st.progress.filesTotal).toBe(2); break; }
      if (st.status === 'failed' || st.status === 'cancelled') throw new Error('scoreboard remediation ' + st.status + ': ' + st.error);
      if (Date.now() > deadline) throw new Error('did not finish; last log: ' + JSON.stringify(st.recentLog));
    }
    const res = (await callTool('remediation_job_result', { job_id: start.jobId })).structuredContent.result;
    expect(res.scoredDocuments).toBe(2);
    expect(res.selected).toBe(2);
    expect(res.bands).toEqual([band]);
    expect(res.succeeded).toBe(2);
    for (const r of res.perFile) {
      expect(r.ok).toBe(true);
      expect(existsSync(r.files.accessibleHtml)).toBe(true);
      expect(existsSync(r.files.report)).toBe(true);
    }
  }, 500000);
});
