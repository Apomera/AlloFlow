import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
const require = createRequire(import.meta.url);
const benchmark = require('../dev-tools/benchmark_document_remediation.cjs');
const PDFLib = require('../desktop/mcp/vendor/pdf-lib.min.js');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let scratch;
function temporary() { return scratch ||= mkdtempSync(join(tmpdir(), 'alloflow-real-corpus-test-')); }
afterEach(() => {
  if (scratch) {
    if (!resolve(scratch).startsWith(resolve(tmpdir()) + sep + 'alloflow-real-corpus-test-')) throw new Error('Unsafe fixture cleanup');
    rmSync(scratch, { recursive: true, force: true }); scratch = null;
  }
});
const doc = (id, extra = {}) => ({ id, category: 'worksheet', language: 'en', url: 'https://example.org/' + id + '.pdf', sha256: 'a'.repeat(64),
  retrieved: '2026-09-22', publicStatus: 'Public test fixture', file: id + '.pdf', ...extra });
function writeManifest(documents, name = 'manifest.json') {
  const file = join(temporary(), name);
  writeFileSync(file, JSON.stringify({ schemaVersion: 2, kind: 'real-corpus', corpusId: 'unit-corpus', documents }));
  return file;
}
const ok = (summary = {}) => ({ status: 'ok', code: null, summary });
const intakeOk = { status: 'ok', outcome: null, reason: null };
const engineOn = { available: true, engine: 'gemini' }, engineOff = { available: false, engine: 'none' };
const record = (docId, outcome, extra = {}) => ({ docId, trial: 1, category: 'worksheet', outcome, modelFreeOutcome: 'completed', failingStage: null, code: null,
  taggedPdfWithheldReason: null, remediation: null, stages: {}, evidence: 'trials/' + docId + '/', ...extra });

describe('real-document corpus benchmark', () => {
  it('loads a real-corpus manifest and rejects unsafe or incomplete entries', () => {
    const loaded = benchmark.loadRealCorpus(writeManifest([doc('first'), doc('second')]), { corpusDir: temporary() });
    expect(loaded.documents.map(item => item.id)).toEqual(['first', 'second']);
    expect(loaded.documents[0].sourcePath).toBe(join(temporary(), 'first.pdf'));
    expect(benchmark.loadRealCorpus(writeManifest([doc('first'), doc('second')]), { corpusDir: temporary(), selection: ['second'] }).documents.map(item => item.id)).toEqual(['second']);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first'), doc('first')]))).toThrow(/duplicate/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first', { file: '../outside.pdf' })]))).toThrow(/relative \.pdf path/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first', { url: 'http://example.org/a.pdf' })]))).toThrow(/https URL/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first', { publicStatus: ' ' })]))).toThrow(/publicStatus/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first', { sha256: 'abc' })]))).toThrow(/sha256/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first', { repoCopy: 'C:/elsewhere/x.pdf' })]))).toThrow(/repoCopy/);
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('first')]), { selection: ['missing'] })).toThrow(/Unknown selected/);
  });

  it('commits a corpus of at least 25 public documents that agrees with MANIFEST.json', () => {
    const corpus = benchmark.loadRealCorpus(resolve('mcp-testing/corpus/real-corpus-2026-09-22.json'), { corpusDir: temporary() });
    expect(corpus.documents.length).toBeGreaterThanOrEqual(25);
    const legacy = JSON.parse(readFileSync(resolve('mcp-testing/corpus/MANIFEST.json'), 'utf8')).documents;
    const byUrl = new Map(legacy.map(item => [item.url, item.sha256]));
    // One source of truth for bytes: every corpus document is listed in MANIFEST.json with the SAME hash.
    const missing = corpus.documents.filter(item => byUrl.get(item.url) !== item.sha256).map(item => item.id);
    expect(missing).toEqual([]);
    expect(new Set(corpus.documents.map(item => item.category)).size).toBeGreaterThanOrEqual(10);
  });

  it('keeps a fail-closed withhold apart from a crash and from a delivery', () => {
    const failed = message => ({ status: 'failed', message });
    const classify = input => benchmark.classifyCorpusRecord({ intake: intakeOk, extract: ok(), safety: ok(), sourcePdfUa: ok(), engine: engineOn, ...input });
    expect(classify({ intake: { status: 'failed', outcome: 'input-unavailable', reason: 'ENOENT' } })).toMatchObject({ outcome: 'input-unavailable', failingStage: 'intake' });
    expect(classify({ engine: engineOff })).toMatchObject({ outcome: 'blocked', code: 'no-model-engine' });
    expect(classify({ remediate: failed('BaselineAuditRequiredError: the audit produced no usable evidence') })).toMatchObject({ outcome: 'withheld', code: 'baseline-audit-required' });
    expect(classify({ remediate: failed('Error: content_coverage_requires_review') })).toMatchObject({ outcome: 'withheld', code: 'content-coverage' });
    expect(classify({ remediate: failed('TypeError: cannot read properties of undefined') })).toMatchObject({ outcome: 'errored' });
    expect(classify({ remediate: failed('TypeError: cannot read properties of undefined') }).code).toMatch(/^unclassified:/);
    expect(classify({ remediate: { status: 'timed-out' } })).toMatchObject({ outcome: 'timed-out' });
    expect(classify({ remediate: failed('Timed out after 2100000ms') })).toMatchObject({ outcome: 'timed-out' });
    expect(classify({ remediate: failed('429 RESOURCE_EXHAUSTED: quota exceeded') })).toMatchObject({ outcome: 'throttled' });
    expect(classify({ remediate: failed('File exceeds the 200MB limit (201MB)') })).toMatchObject({ outcome: 'refused' });
    expect(classify({ remediate: failed('GEMINI_API_KEY is not set (and no key file was found).') })).toMatchObject({ outcome: 'blocked' });
    const remediation = { taggedPdfWithheldReason: 'active_content_scan_unavailable', deliveryStatus: 'review-required' };
    expect(classify({ remediate: ok(), remediation, htmlExists: true, pdfExists: true })).toMatchObject({ outcome: 'delivered', taggedPdfWithheldReason: null });
    expect(classify({ remediate: ok(), remediation, htmlExists: true })).toMatchObject({ outcome: 'delivered-html', taggedPdfWithheldReason: 'active_content_scan_unavailable' });
    expect(classify({ remediate: ok(), remediation, htmlExists: false })).toMatchObject({ outcome: 'errored', code: 'no-accessible-html-written' });
    expect(classify({ remediate: ok(), extract: { status: 'timed-out' } }).modelFreeOutcome).toBe('timed-out');
    expect(classify({ remediate: ok(), sourcePdfUa: { status: 'failed' } }).modelFreeOutcome).toBe('failed');
    expect(classify({ remediate: ok(), sourcePdfUa: { status: 'failed' }, safety: { status: 'crashed' } }).modelFreeOutcome).toBe('crashed');
  });

  it('counts streaks in run order and reports "not measured" when no document reached the model', () => {
    const rows = [record('a', 'delivered'), record('b', 'delivered-html'), record('c', 'withheld'), record('gone', 'input-unavailable'),
      record('d', 'delivered'), record('e', 'delivered'), record('f', 'delivered'), record('g', 'errored')];
    const streaks = benchmark.corpusStreaks(rows);
    expect(streaks.deliverable).toEqual({ length: 3, from: 'd', to: 'f', of: 7 });
    // A withhold is fail-closed, not a crash: it does not break the no-crash streak.
    expect(streaks.noCrashOrHang).toMatchObject({ length: 6, from: 'a', to: 'f' });
    expect(streaks.excludedInputs).toBe(1);
    const blocked = benchmark.corpusStreaks([record('a', 'blocked'), record('b', 'blocked', { modelFreeOutcome: 'failed' }), record('c', 'blocked')]);
    expect(blocked.deliverable).toBeNull();
    expect(blocked.modelStageRan).toBe(false);
    expect(blocked.modelFreeCompleted).toMatchObject({ length: 1, of: 3 });
    // A model-free tool that REPORTED an error is not a crash; a dead process or a hang is.
    expect(blocked.noCrashOrHang).toMatchObject({ length: 3 });
    const crashed = benchmark.corpusStreaks([record('a', 'blocked'), record('b', 'blocked', { modelFreeOutcome: 'crashed' }), record('c', 'blocked', { modelFreeOutcome: 'timed-out' })]);
    expect(crashed.noCrashOrHang).toMatchObject({ length: 1, from: 'a', to: 'a' });
  });

  it('ranks failure classes by frequency x severity with a minimal repro and keeps the engine blocker apart', () => {
    const review = { reviewRequired: true, deliveryStatus: 'review-required', verdict: 'review', tokenRecall: 0.9, contentCoverageReview: true,
      scores: { aiVerificationIncomplete: false }, left: { equalAccessFailures: 0, axeViolations: 0 } };
    const rows = [
      ...['p1', 'p2', 'p3'].map(id => record(id, 'delivered-html', { taggedPdfWithheldReason: 'active_content_scan_unavailable' })),
      record('crash', 'errored', { failingStage: 'remediate', code: 'browser', stages: { remediate: { message: 'Target page, context or browser has been closed' } } }),
      record('r1', 'delivered', { remediation: review }), record('r2', 'delivered', { remediation: review }),
      record('x1', 'blocked', { failingStage: 'remediate', code: 'no-model-engine' }),
    ];
    const taxonomy = benchmark.failureTaxonomy(rows, id => 'repro --cases ' + id);
    expect(taxonomy.ranked.map(item => [item.key, item.weight])).toEqual([
      ['tagged-pdf-withheld:active_content_scan_unavailable', 6], ['remediate:errored:browser', 5], ['review-required:content-coverage', 2]]);
    expect(taxonomy.ranked[1].example).toMatchObject({ docId: 'crash', stage: 'remediate', repro: 'repro --cases crash' });
    expect(taxonomy.ranked[1].example.excerpt).toMatch(/browser has been closed/);
    expect(taxonomy.blockers).toEqual([{ key: 'engine:no-model-engine', count: 1, docs: ['x1'] }]);
    expect(taxonomy.ranked.some(item => item.key.startsWith('engine:'))).toBe(false);
    expect(benchmark.locateFailure('tagged-pdf-withheld:active_content_scan_unavailable')).toMatch(/^desktop\/mcp\/remediation_headless_driver\.cjs:\d+$/);
  });

  it('resolves the engine without recording a key and never cuts a model run shorter than the product does', () => {
    const none = benchmark.corpusEngine('auto', {}, { resolveGeminiKey: () => ({ key: null, source: 'none' }) });
    expect(none).toMatchObject({ engine: 'none', available: false });
    expect(none.setup).toMatch(/aistudio\.google\.com/);
    const gemini = benchmark.corpusEngine('auto', {}, { resolveGeminiKey: () => ({ key: 'AIza-do-not-record', source: 'env:GEMINI_API_KEY' }) });
    expect(gemini).toMatchObject({ engine: 'gemini', available: true, keySource: 'env:GEMINI_API_KEY' });
    expect(JSON.stringify(gemini)).not.toContain('AIza-do-not-record');
    expect(benchmark.corpusEngine('none', {}, { resolveGeminiKey: () => ({ key: 'k', source: 'x' }) }).available).toBe(false);
    const corpus = { documents: [{}] };
    expect(benchmark.validateCorpusOptions({}, corpus, {}).remediateTimeoutMs).toBe(35 * 60 * 1000);
    expect(benchmark.validateCorpusOptions({}, corpus, { ALLOFLOW_MCP_MAX_RUN_MINUTES: '60' }).remediateTimeoutMs).toBe(65 * 60 * 1000);
    expect(() => benchmark.validateCorpusOptions({ timeoutMs: 600000 }, corpus, {})).toThrow(/run cap/);
    expect(() => benchmark.validateCorpusOptions({ trials: 4 }, corpus, {})).toThrow(/trials/);
    expect(() => benchmark.validateCorpusOptions({ engine: 'scripted' }, corpus, {})).toThrow(/engine/);
    const env = { GEMINI_API_KEY: 'k', ALLOFLOW_MCP_MODEL_KEY: 'k', ALLOFLOW_MCP_ENV_PATH: 'x.env', ALLOFLOW_MCP_MODEL_BACKEND: 'claude', PATH: 'tools' };
    const free = benchmark.corpusChildEnvironment('state', env);
    expect(free.GEMINI_API_KEY).toBeUndefined(); expect(free.ALLOFLOW_MCP_MODEL_KEY).toBeUndefined();
    expect(free.ALLOFLOW_MCP_ENV_PATH).toBeUndefined(); expect(free.ALLOFLOW_MCP_MODEL_BACKEND).toBeUndefined();
    expect(free).toMatchObject({ ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: 'state', PATH: 'tools' });
    expect(benchmark.corpusChildEnvironment('state', env, { modelFree: false })).toMatchObject({ GEMINI_API_KEY: 'k', ALLOFLOW_MCP_MODEL_BACKEND: 'claude' });
  });

  it('runs the shipped Document Safety scanner on real pdf-lib documents', async () => {
    expect(benchmark.loadSafetyScanner('function somethingElse() {}')).toBeNull();
    const clean = await PDFLib.PDFDocument.create(); clean.addPage();
    const cleanFile = join(temporary(), 'clean.pdf'); writeFileSync(cleanFile, await clean.save());
    const active = await PDFLib.PDFDocument.create(); active.addPage();
    const action = active.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFLib.PDFString.of('app.alert(1)') });
    active.catalog.set(PDFLib.PDFName.of('OpenAction'), active.context.register(action));
    const activeFile = join(temporary(), 'active.pdf'); writeFileSync(activeFile, await active.save());
    const passes = await benchmark.safetyScanFile(cleanFile);
    expect(passes).toMatchObject({ ok: true, scan: { complete: true, activeContent: false, taggedPdfSafetyGate: 'passes' } });
    const withheld = await benchmark.safetyScanFile(activeFile);
    expect(withheld).toMatchObject({ ok: true, scan: { activeContent: true, taggedPdfSafetyGate: 'withholds: active content' } });
    expect(withheld.scan.findings.join(' ')).toMatch(/javascript/i);
    const notPdf = join(temporary(), 'not.pdf'); writeFileSync(notPdf, 'plain text');
    expect(await benchmark.safetyScanFile(notPdf)).toMatchObject({ ok: false });
  });

  it.each([['no engine', false], ['a configured engine', true]])('writes an honest scoreboard with %s', async (_label, withEngine) => {
    const folder = temporary(), corpusDir = join(folder, 'corpus'); mkdirSync(corpusDir, { recursive: true });
    const bytes = id => Buffer.from('%PDF-1.4 unit fixture ' + id);
    const documents = ['one', 'two', 'three'].map(id => { writeFileSync(join(corpusDir, id + '.pdf'), bytes(id)); return doc(id, { sha256: sha(bytes(id)), category: id === 'three' ? 'scanned-image-only' : 'worksheet' }); });
    const manifest = writeManifest(documents), outDir = join(folder, 'runs', 'real');
    const calls = [];
    const execute = async (_command, args, { env }) => {
      if (args[1] === '--internal-safety-scan') return { exitCode: 0, durationMs: 5, error: null, timedOut: false, stderr: '',
        stdout: JSON.stringify({ ok: true, scan: { complete: true, activeContent: false, findings: [], taggedPdfSafetyGate: 'passes' } }) };
      const tool = args[3], toolArgs = JSON.parse(readFileSync(args[4], 'utf8'));
      calls.push({ tool, hasKey: 'GEMINI_API_KEY' in env, noKeyFiles: env.ALLOFLOW_MCP_NO_KEY_FILES });
      let result;
      if (tool === 'extract_document_text') result = { method: 'text-layer', characters: 900, pageCount: 2, isScanned: false, textLayerUsable: true, unmappedGlyphRatio: 0, pageErrors: 0 };
      else if (tool === 'pdf_validate_ua') result = { compliant: false, failedRuleCount: 3, failedChecks: 9, passedChecks: 90, failedRules: [{ clause: '7.1', failedChecks: 4 }] };
      else if (tool === 'pdf_remediate') {
        if (toolArgs.file_path.endsWith('two.pdf')) return { exitCode: 1, durationMs: 9, error: null, timedOut: false, stdout: 'BaselineAuditRequiredError: no usable audit', stderr: '' };
        const html = join(toolArgs.output_dir, 'x-accessible.html'); writeFileSync(html, '<html lang="en"></html>');
        result = { files: { accessibleHtml: html }, deliveryStatus: 'review-required', reviewRequired: true, verdict: { level: 'review', reviewCount: 2, cautionCount: 1 },
          beforeScore: 40, afterScore: 88, verification: { ai: { score: 90 }, axe: { score: 100 }, equalAccess: { score: 88 } },
          contentCoverage: { tokenRecall: 0.97, reviewRequired: true, missingTokens: 12 }, taggedPdfError: 'content_coverage_requires_review',
          remainingAxeViolations: 0, remainingEqualAccessFailures: 1, stats: { apiCalls: 14, visionCalls: 3, retries: 0 }, pdfUa: { skipped: 'tagged PDF not written' } };
      }
      return { exitCode: 0, durationMs: 7, error: null, timedOut: false, stdout: JSON.stringify(result), stderr: '' };
    };
    const env = withEngine ? { GEMINI_API_KEY: 'unit-key-never-recorded', PATH: 'tools' } : { PATH: 'tools' };
    const board = await benchmark.runCorpus({ mode: 'corpus', manifest, corpusDir, outDir, trials: 1 }, {
      env, execute, sleep: async () => {}, log: () => {}, versions: () => ({ unit: true }),
      resolveGeminiKey: () => (withEngine ? { key: 'unit-key-never-recorded', source: 'env:GEMINI_API_KEY' } : { key: null, source: 'none' }) });
    expect(board).toMatchObject({ complete: true, completedDocTrials: 3, plannedDocTrials: 3 });
    const md = readFileSync(join(outDir, 'scoreboard.md'), 'utf8'), html = readFileSync(join(outDir, 'scoreboard.html'), 'utf8');
    const json = JSON.parse(readFileSync(join(outDir, 'scoreboard.json'), 'utf8'));
    expect(json.records).toHaveLength(3);
    expect(md).toContain('node dev-tools/benchmark_document_remediation.cjs --mode corpus');
    expect(md).toContain('## What this does NOT claim');
    expect(html).toMatch(/<html lang="en">/); expect(html).toContain('<caption>Rates per category</caption>');
    // No dashes the editorial rules forbid, and "WCAG compliant" only inside the sentence that disclaims it.
    for (const text of [md, html]) { expect(text).not.toMatch(/[\u2013\u2014]/); expect(text).not.toMatch(/(?<!does not make a document (?:"|&quot;))WCAG compliant/); }
    expect(md + html + JSON.stringify(json)).not.toContain('unit-key-never-recorded');
    expect(readFileSync(join(outDir, '.gitignore'), 'utf8')).toMatch(/^trials\/$/m);
    // Model-free stages never see a key, whatever the parent shell holds.
    expect(calls.filter(call => call.tool !== 'pdf_remediate').every(call => !call.hasKey && call.noKeyFiles === '1')).toBe(true);
    if (!withEngine) {
      expect(calls.some(call => call.tool === 'pdf_remediate')).toBe(false);
      expect(json.records.map(item => item.outcome)).toEqual(['blocked', 'blocked', 'blocked']);
      expect(md).toContain('**Model stage BLOCKED.**');
      expect(json.streaks[0].deliverable).toBeNull();
      expect(md).toMatch(/deliverable streak not measured/);
      expect(json.blockers).toEqual([{ key: 'engine:no-model-engine', count: 3, docs: ['one', 'two', 'three'] }]);
    } else {
      expect(calls.filter(call => call.tool === 'pdf_remediate').every(call => call.hasKey)).toBe(true);
      expect(json.records.map(item => item.outcome)).toEqual(['delivered-html', 'withheld', 'delivered-html']);
      expect(json.records[0]).toMatchObject({ taggedPdfWithheldReason: 'content_coverage_requires_review', remediation: { scores: { before: 40, after: 88, equalAccess: 88 }, tokenRecall: 0.97, modelCalls: { api: 14 } } });
      expect(json.streaks[0]).toMatchObject({ deliverable: { length: 1, of: 3 }, noCrashOrHang: { length: 3 } });
      expect(json.taxonomy.map(item => item.key)).toContain('remediate:withheld:baseline-audit-required');
      expect(json.outcomeCounts).toEqual({ 'delivered-html': 2, withheld: 1 });
    }
  }, 20000);

  it('measures whether each document gives the same answer on every trial', () => {
    const facts = (failedChecks, extra = {}) => ({ stages: { extract: { summary: { textLayer: 'text', characters: 10, pageCount: 1 } },
      safety: { summary: { taggedPdfSafetyGate: 'passes', findings: [], unexaminedStructures: 0 } },
      sourcePdfUa: { summary: { compliant: false, failedRuleCount: 2, failedChecks } } }, ...extra });
    const rows = [record('a', 'blocked', { trial: 1, ...facts(5) }), record('a', 'blocked', { trial: 2, ...facts(5), wallMs: 999 }),
      record('b', 'blocked', { trial: 1, ...facts(5) }), record('b', 'blocked', { trial: 2, ...facts(6) }),
      record('c', 'blocked', { trial: 1, ...facts(5) })];
    expect(benchmark.trialConsistency(rows)).toEqual({ docsCompared: 2, consistent: 1, differing: [{ docId: 'b', trials: [1, 2], fields: ['sourcePdfUa'] }] });
    const mixed = [record('d', 'delivered-html', { trial: 1, ...facts(1) }), record('d', 'errored', { trial: 2, ...facts(1), modelFreeOutcome: 'crashed' })];
    expect(benchmark.trialConsistency(mixed).differing[0].fields).toEqual(['outcome', 'modelFreeOutcome']);
    expect(benchmark.trialConsistency([record('e', 'blocked')])).toEqual({ docsCompared: 0, consistent: 0, differing: [] });
  });

  it('discloses code that changed under a document, and render rebuilds the same scoreboard from saved records', async () => {
    const folder = temporary(), corpusDir = join(folder, 'corpus'); mkdirSync(corpusDir, { recursive: true });
    const documents = ['one', 'two'].map(id => { const bytes = Buffer.from('%PDF-1.4 drift ' + id); writeFileSync(join(corpusDir, id + '.pdf'), bytes); return doc(id, { sha256: sha(bytes) }); });
    const manifest = writeManifest(documents), outDir = join(folder, 'run');
    // Plan and document one "before" see version A; everything after sees B, as if another session edited a file mid-run.
    let stamps = 0;
    const versions = () => { stamps++; return stamps <= 2 ? { implementationSha256: 'A', files: { 'doc_pipeline_module.js': 'a1', 'x.cjs': 'x' } } : { implementationSha256: 'B', files: { 'doc_pipeline_module.js': 'b2', 'x.cjs': 'x' } }; };
    const execute = async (_command, args) => args[1] === '--internal-safety-scan'
      ? { exitCode: 0, durationMs: 1, error: null, timedOut: false, stderr: '', stdout: JSON.stringify({ ok: true, scan: { complete: false, activeContent: false, findings: [], taggedPdfSafetyGate: 'withholds: scan incomplete' }, moduleSha256: 'm1' }) }
      : { exitCode: 0, durationMs: 1, error: null, timedOut: false, stderr: '', stdout: JSON.stringify(args[3] === 'pdf_validate_ua' ? { compliant: true, failedRuleCount: 0 } : { method: 'text-layer', characters: 0, isScanned: true, pageCount: 1 }) };
    const board = await benchmark.runCorpus({ mode: 'corpus', manifest, corpusDir, outDir }, { env: {}, execute, versions, sleep: async () => {}, log: () => {}, resolveGeminiKey: () => ({ key: null }) });
    expect(board.records.map(item => item.implementation.drift)).toEqual([true, false]);
    expect(board.records[0].implementation).toMatchObject({ before: 'A', after: 'B', changedFiles: ['doc_pipeline_module.js'], safetyScannerModuleSha256: 'm1' });
    expect(board.implementationDrift).toMatchObject({ docTrials: 1, rows: ['one trial 1'], files: ['doc_pipeline_module.js'] });
    const md = readFileSync(join(outDir, 'scoreboard.md'), 'utf8');
    expect(md).toContain('[code changed during this document]');
    expect(md).toContain('Only one trial per document, so consistency was not measured.');
    expect(md).toMatch(/## At a glance[\s\S]*Model stage BLOCKED on this machine[\s\S]*changed during 1 document trial/);
    expect(board.atAGlance.join(' ')).toMatch(/2 of 2 already pass the veraPDF PDF\/UA-1 checks; 2 are image-only/);
    expect(board.atAGlance.join(' ')).toMatch(/withheld for 2 of 2 documents \(0 carry active content such as scripts; 2 could not be fully examined\)/);
    const saved = JSON.parse(readFileSync(join(outDir, 'scoreboard.json'), 'utf8'));
    for (const name of ['scoreboard.json', 'scoreboard.md', 'scoreboard.html']) rmSync(join(outDir, name));
    const rendered = benchmark.renderCorpus({ outDir });
    expect(rendered).toMatchObject({ complete: true, completedDocTrials: 2, atAGlance: saved.atAGlance, implementationDrift: saved.implementationDrift, taxonomy: saved.taxonomy });
    expect(rendered.records).toEqual(saved.records);
    expect(rendered.renderedBy.benchmarkSha256).toMatch(/^[a-f0-9]{64}$/);
    rmSync(join(outDir, 'trials', 'two'), { recursive: true });
    expect(benchmark.renderCorpus({ outDir })).toMatchObject({ complete: false, completedDocTrials: 1, interruption: 'incomplete: 1 of 2 document trials recorded' });
  }, 20000);

  it('names the veraPDF-stage failures the first real-corpus run found, and locates them while their source still says so', () => {
    expect(benchmark.classifyRemediateMessage('Tool failed: veraPDF CLI returned incomplete or contradictory validation evidence (exit 1)')).toEqual({ outcome: 'errored', code: 'verapdf-evidence-rejected' });
    expect(benchmark.classifyRemediateMessage('Tool failed: Java runtime not found: `java -version` failed (spawnSync java ETIMEDOUT). PDF/UA validation runs the bundled veraPDF CLI')).toEqual({ outcome: 'errored', code: 'java-probe-timeout' });
    // A missing runtime that is really missing stays unclassified rather than blamed on a timeout.
    expect(benchmark.classifyRemediateMessage('Tool failed: Java runtime not found: `java -version` failed (spawn java ENOENT)').code).toMatch(/^unclassified:/);
    // The locator searches the owning file for a literal; when another lane fixes that code the
    // literal may go, so only require a hit while the literal is still there.
    const cases = [['desktop/mcp/remediation_verification.cjs', 'Incomplete or contradictory PDF/UA validation evidence',
      ['source-pdf-ua:failed:verapdf-evidence-rejected', 'source-pdf-ua:failed:unclassified:tool-failed-verapdf-cli-returned-incomplete-or-c']],
      ['desktop/mcp/remediation_epub_validation.cjs', "spawnSync(java,['-version']",
      ['source-pdf-ua:failed:java-probe-timeout', 'source-pdf-ua:failed:unclassified:tool-failed-java-runtime-not-found-java-version-']]];
    for (const [file, literal, keys] of cases) {
      const present = readFileSync(resolve(file), 'utf8').includes(literal);
      for (const key of keys) {
        const found = benchmark.locateFailure(key);
        if (present) expect(found).toMatch(new RegExp('^' + file.replace(/[.]/g, '\\.') + ':\\d+$')); else expect(found).toBeNull();
      }
    }
  });

  it('puts every wide table in a keyboard-reachable, labelled scroll region', () => {
    const plan = { command: 'c', reproCommand: 'r {id}', engine: { available: false, engine: 'none', reason: 'x', setup: null }, configuration: { trials: 1 }, versions: {},
      corpus: { corpusId: 'u', manifestSha256: 'm', corpusDir: 'd', documents: [doc('a')] } };
    const html = benchmark.scoreboardHtml(benchmark.buildScoreboard({ plan, records: [record('a', 'blocked', { failingStage: 'remediate', code: 'no-model-engine' })], complete: true, locate: () => null }));
    const tables = html.match(/<table>/g) || [];
    const regions = html.match(/<div class="wrap" tabindex="0" role="region" aria-label="[^"]+"><table>/g) || [];
    expect(tables.length).toBeGreaterThanOrEqual(4);
    expect(regions.length).toBe(tables.length);
    expect(html).toContain('.wrap:focus{outline');
  });

  it('fetches by URL, verifies sha256, and falls back only to a repository copy whose hash matches', async () => {
    const folder = temporary(), corpusDir = join(folder, 'corpus');
    const good = Buffer.from('%PDF-1.4 fetched bytes');
    const self = readFileSync(resolve('tests/document_remediation_real_corpus.test.js'));
    const manifest = writeManifest([
      doc('served', { sha256: sha(good) }),
      doc('changed', { sha256: sha(good), url: 'https://example.org/changed.pdf' }),
      doc('blocked', { sha256: sha(self), url: 'https://example.org/blocked.pdf', repoCopy: 'tests/document_remediation_real_corpus.test.js' }),
      doc('blocked-no-copy', { sha256: sha(good), url: 'https://example.org/blocked-no-copy.pdf', repoCopy: 'tests/document_remediation_real_corpus.test.js' }),
      doc('mirrored', { sha256: sha(good), url: 'https://example.org/blocked-mirrored.pdf', mirrors: ['https://mirror.example.org/changed-copy.pdf', 'https://mirror.example.org/good.pdf'] }),
    ]);
    const fetch = async url => /changed/.test(url) ? new Response(Buffer.from('%PDF-1.4 upstream edited'), { status: 200 })
      : /blocked/.test(url) ? new Response('forbidden', { status: 403 }) : new Response(good, { status: 200 });
    const report = await benchmark.fetchRealCorpus({ manifest, corpusDir }, { fetch });
    expect(report.rows.map(row => [row.id, row.status])).toEqual([['served', 'downloaded'], ['changed', 'sha256-mismatch'], ['blocked', 'repo-copy'], ['blocked-no-copy', 'download-failed'], ['mirrored', 'mirror']]);
    // A mirror is held to the same hash: the first mirror serves edited bytes and is skipped.
    expect(report.rows[4].attempts.map(item => item.status)).toEqual(['download-failed', 'sha256-mismatch', 'mirror']);
    expect(report.rows[4].source).toBe('https://mirror.example.org/good.pdf');
    expect(() => benchmark.loadRealCorpus(writeManifest([doc('x', { mirrors: ['http://insecure.example.org/x.pdf'] })], 'bad-mirror.json'))).toThrow(/mirrors/);
    expect(report.ok).toBe(false);
    expect(existsSync(join(corpusDir, 'changed.pdf'))).toBe(false);
    expect(readFileSync(join(corpusDir, 'served.pdf'))).toEqual(good);
    const again = await benchmark.fetchRealCorpus({ manifest, corpusDir, cases: ['served', 'blocked'] }, { fetch: async () => { throw new Error('must not refetch'); } });
    expect(again.rows.map(row => row.status)).toEqual(['present', 'present']);
  });
});
