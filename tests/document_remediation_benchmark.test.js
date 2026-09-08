import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
const require = createRequire(import.meta.url);
const benchmark = require('../dev-tools/benchmark_document_remediation.cjs');
const corpus = require('../dev-tools/remediation_benchmark_corpus.cjs');
let scratch;
function temporary() { return scratch ||= mkdtempSync(join(tmpdir(), 'alloflow-benchmark-test-')); }
afterEach(() => {
  if (scratch) {
    if (!resolve(scratch).startsWith(resolve(tmpdir()) + sep + 'alloflow-benchmark-test-')) throw new Error('Unsafe fixture cleanup');
    rmSync(scratch, { recursive: true, force: true }); scratch = null;
  }
});
const execution = (exitCode = 0) => ({ exitCode, durationMs: 20, error: null, timedOut: false });
const row = (durationMs, extra = {}) => ({ caseId: 'reading', durationMs, status: 'completed', passed: true,
  quality: { readiness: 'review-required', preservation: 'passed-for-tested-scope' },
  metrics: { calls: 3, retries: null, rejections: 0 }, ...extra });

describe('repeatable document remediation benchmark', () => {
  it('defaults to plan mode and rejects live execution through local mode or oversized budgets', () => {
    const source = { cases: [{ backend: 'mcp-headless' }] };
    expect(benchmark.validateRunOptions({}, source).mode).toBe('plan');
    expect(() => benchmark.validateRunOptions({ mode: 'local' }, source)).toThrow(/explicit --mode live/);
    expect(() => benchmark.validateRunOptions({ mode: 'live', trials: 7 }, source)).toThrow(/at most 6/);
    expect(() => benchmark.validateRunOptions({ trials: 11 }, source)).toThrow(/trials/);
    expect(() => benchmark.validateRunOptions({ timeoutMs: Infinity }, source)).toThrow(/timeoutMs/);
    expect(() => benchmark.validateRunOptions({ trials: 10 }, { cases: Array(5).fill({ backend: 'portable' }) })).toThrow(/40 trials/);
    expect(benchmark.parseArguments([])).toEqual({});
    expect(() => benchmark.parseArguments(['--mode', 'local', '--mode', 'live'])).toThrow(/Duplicate/);
  });
  it('strips credentials and network overrides only for local children', () => {
    const env = { GEMINI_API_KEY: 'secret', OPENAI_API_KEY: 'secret', CLOUDFLARE_API_TOKEN: 'secret',
      ALLOFLOW_MCP_ENV_PATH: 'private.env', ALLOFLOW_MCP_GEMINI_BASE: 'https://example.test',
      ALLOFLOW_MCP_VERAPDF_URL: 'https://example.test/validate', PATH: 'tools', ALLOFLOW_MCP_GEMINI_MODEL: 'configured-model' };
    const local = benchmark.childEnvironment('local', 'isolated-state', 5000, env);
    expect(local.GEMINI_API_KEY).toBeUndefined(); expect(local.OPENAI_API_KEY).toBeUndefined();
    expect(local.CLOUDFLARE_API_TOKEN).toBeUndefined(); expect(local.ALLOFLOW_MCP_ENV_PATH).toBeUndefined();
    expect(local.ALLOFLOW_MCP_GEMINI_BASE).toBeUndefined(); expect(local.ALLOFLOW_MCP_VERAPDF_URL).toBeUndefined();
    expect(local).toMatchObject({ ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: 'isolated-state', PATH: 'tools' });
    expect(benchmark.childEnvironment('live', 'state', 5000, env)).toMatchObject({ GEMINI_API_KEY: 'secret', ALLOFLOW_MCP_GEMINI_MODEL: 'configured-model' });
  });
  it('selects the mixed education corpus and rejects unknown/duplicate case identifiers', () => {
    const source = resolve('tests/fixtures/remediation_benchmark/manifest.json');
    const loaded = benchmark.loadManifest(source);
    expect(loaded.cases.filter(item => item.backend === 'portable').map(item => item.documentKind).sort()).toEqual(['figure', 'form', 'reading', 'scan', 'table', 'worksheet']);
    expect(benchmark.loadManifest(source, ['education-reading']).cases.map(item => item.id)).toEqual(['education-reading']);
    expect(() => benchmark.loadManifest(source, ['missing'])).toThrow(/Unknown selected/);
    const manifest = JSON.parse(readFileSync(source, 'utf8')); manifest.cases[1].id = manifest.cases[0].id;
    const invalid = join(temporary(), 'invalid.json'); writeFileSync(invalid, JSON.stringify(manifest));
    expect(() => benchmark.loadManifest(invalid)).toThrow(/duplicate/);
  });
  it('materializes deterministic source bytes and source-bound repair plans', () => {
    const first = corpus.materializeFixture('worksheet', join(temporary(), 'first'));
    const second = corpus.materializeFixture('worksheet', join(temporary(), 'second'));
    expect(readFileSync(first.sourcePath)).toEqual(readFileSync(second.sourcePath));
    expect(readFileSync(first.planPath, 'utf8')).toBe(readFileSync(second.planPath, 'utf8'));
    const plan = JSON.parse(readFileSync(first.planPath, 'utf8'));
    expect(plan.document.source_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => corpus.materializeFixture('../outside', temporary())).toThrow(/Unknown/);
  });
  it('keeps timeouts and missing metrics visible and never merges different source implementations', () => {
    const rows = [row(10), row(20), row(30), row(100, { status: 'timeout', passed: false, metrics: { calls: null, retries: null, rejections: null } }),
      row(999, { versions: { implementationSha256: 'another-version' } })];
    const groups = benchmark.aggregate(rows);
    const main = groups.find(item => item.trials === 4);
    expect(main).toMatchObject({ passed: 3, failed: 1,
      allTiming: { count: 4, medianMs: 25, p95Ms: 100 }, completedTiming: { count: 3, medianMs: 20, p95Ms: 30 },
      calls: { total: 9, observedTrials: 3, missingTrials: 1 }, retries: { total: null, observedTrials: 0, missingTrials: 4 } });
    expect(groups).toHaveLength(2);
    expect(benchmark.timing([])).toEqual({ count: 0, medianMs: null, p95Ms: null, minMs: null, maxMs: null });
    expect(benchmark.timing(Array.from({ length: 20 }, (_, i) => i + 1))).toMatchObject({ medianMs: 10.5, p95Ms: 19 });
  });
  it('does not mistake plan-internal recall or scripted checks for distribution readiness', () => {
    const portable = { backend: 'portable', expected: { readiness: 'review-required' } };
    const raw = { ok: true, humanReviewRequired: true };
    const report = { checks: { staticHtmlAudit: { ok: true }, repairPlan: { metrics: { plan_internal_token_recall: 1 } } } };
    expect(benchmark.summarizeTrial(portable, execution(), raw, report)).toMatchObject({ passed: true,
      quality: { readiness: 'review-required', preservation: 'passed-for-tested-scope' }, metrics: { calls: 0, retries: 0, rejections: null } });
    expect(benchmark.summarizeTrial(portable, execution(), raw, null).passed).toBe(false);
    const partial = { ok: true, modelCalls: 11, checks: { contentPreserved: true } };
    expect(benchmark.summarizeTrial({ backend: 'mcp-selftest' }, execution(), partial)).toMatchObject({ passed: false, quality: { readiness: 'unavailable' } });
    expect(benchmark.summarizeTrial({ backend: 'mcp-headless' }, execution(), { deliveryStatus: 'complete-for-tested-scope', reviewRequired: false, verificationHtmlBound: false })).toMatchObject({ passed: false, quality: { readiness: 'unavailable' } });
  });
  it('counts an expected safety block as a completed passing trial without marking content preserved', () => {
    const result = benchmark.summarizeTrial({ backend: 'portable', expected: { exitCode: 3, readiness: 'blocked' } }, execution(3), { error: 'Rebuild is blocked for forms' });
    expect(result).toMatchObject({ passed: true, quality: { readiness: 'blocked', preservation: 'unavailable' } });
    expect(benchmark.summarizeTrial({ backend: 'portable' }, execution(3), { error: 'other failure' }).passed).toBe(false);
  });
  it('renders deterministic reports with raw evidence links and explicit calibration limits', () => {
    const plan = { mode: 'local', startedAt: '2026-01-01T00:00:00.000Z', configuration: { trials: 1 }, versions: { implementationSha256: 'hash' },
      corpus: { corpusId: 'sample', manifestSha256: 'manifest', cases: [{ id: 'reading', backend: 'portable', documentKind: 'reading' }] } };
    const trial = row(20, { trial: 1, evidence: { result: 'trials/reading/1/result.json', execution: 'trials/reading/1/execution.json', stderr: 'trials/reading/1/stderr.log' } });
    const first = benchmark.buildReport(plan, [trial], '2026-01-01T00:00:01.000Z');
    const second = benchmark.buildReport(plan, [trial], '2026-01-01T00:00:01.000Z');
    expect(first).toEqual(second);
    expect(benchmark.markdownReport(first)).toContain('[result](trials/reading/1/result.json)');
    expect(first.limitations.join(' ')).toMatch(/No independent human labels/);
  });
  it.each(['source', 'plan', 'changed-source'])('retains raw evidence and a failed report when %s changes during a trial', async condition => {
    const folder = temporary(), source = join(folder, 'source.pdf'), plan = join(folder, 'plan.json');
    writeFileSync(source, '%PDF-1.4 synthetic unit fixture'); writeFileSync(plan, '{}');
    const manifest = join(folder, 'manifest.json'), outDir = join(folder, 'output');
    writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, corpusId: 'input-fault', cases: [{ id: 'reading', backend: 'portable', sourcePath: 'source.pdf', planPath: 'plan.json' }] }));
    let calls = 0;
    const report = await benchmark.runBenchmark({ mode: 'local', manifest, trials: 2, outDir }, { execute: async (_command, args) => {
      calls++;
      const artifacts = args[args.indexOf('--out-dir') + 1]; mkdirSync(artifacts, { recursive: true });
      writeFileSync(join(artifacts, 'source-accessibility-report.json'), JSON.stringify({ checks: { staticHtmlAudit: { ok: true }, repairPlan: { metrics: { plan_internal_token_recall: 1 } } } }));
      if (condition === 'changed-source') writeFileSync(source, '%PDF-1.4 changed fixture');
      else unlinkSync(condition === 'source' ? source : plan);
      return { ...execution(), stdout: JSON.stringify({ ok: true, humanReviewRequired: true }), stderr: '' };
    } });
    const unavailable = condition !== 'changed-source';
    expect(calls).toBe(1);
    expect(report.summary).toMatchObject({ plannedTrials: 2, completedTrials: 1, failed: 1, passed: 0 });
    expect(report.interruption).toBe(unavailable ? 'source_or_plan_unavailable' : 'source_or_plan_changed');
    expect(report.trials[0]).toMatchObject({ status: unavailable ? 'input-unavailable' : 'version-drift', passed: false,
      quality: { checksPassed: true, readiness: 'review-required' }, versions: { sourceDrift: true, inputProblems: [{ input: condition === 'plan' ? 'plan' : 'source', reason: unavailable ? 'unavailable' : 'changed', ...(unavailable ? { code: 'ENOENT' } : {}) }] } });
    expect(report.interruptionDetails).toMatchObject({ caseId: 'reading', trial: 1 });
    expect(report.aggregates[0]).toMatchObject({ allTiming: { count: 1 }, completedTiming: { count: 0 } });
    expect(JSON.parse(readFileSync(join(outDir, 'benchmark-report.json'), 'utf8'))).toEqual(report);
    expect(existsSync(join(outDir, report.trials[0].evidence.result))).toBe(true);
  }, 20000);
  it('keeps earlier trial evidence when a later input disappears before execution', async () => {
    const folder = temporary(), source = join(folder, 'source.pdf'), plan = join(folder, 'plan.json');
    writeFileSync(source, '%PDF-1.4 synthetic fixture'); writeFileSync(plan, '{}');
    const manifest = join(folder, 'manifest.json'), outDir = join(folder, 'output');
    writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, corpusId: 'pretrial-fault', cases: [
      { id: 'first', backend: 'mcp-selftest' }, { id: 'second', backend: 'portable', sourcePath: 'source.pdf', planPath: 'plan.json' }
    ] }));
    let calls = 0;
    const report = await benchmark.runBenchmark({ mode: 'local', manifest, trials: 1, outDir }, { execute: async () => {
      calls++; unlinkSync(source); return { ...execution(), stdout: '{}', stderr: '' };
    } });
    expect(calls).toBe(1); expect(report.trials.map(item => item.caseId)).toEqual(['first']);
    expect(report.interruption).toBe('source_or_plan_unavailable');
    expect(report.interruptionDetails).toEqual({ caseId: 'second', trial: 1, inputProblems: [{ input: 'source', reason: 'unavailable', code: 'ENOENT' }] });
    expect(JSON.parse(readFileSync(join(outDir, 'benchmark-report.json'), 'utf8'))).toEqual(report);
    expect(readFileSync(join(outDir, 'benchmark-report.md'), 'utf8')).toContain('Interrupted: source_or_plan_unavailable (second, trial 1)');
    expect(existsSync(join(outDir, report.trials[0].evidence.result))).toBe(true);
  }, 20000);
  it('actually stops a stalled subprocess at its deadline', async () => {
    const result = await benchmark.runBounded(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { env: process.env, timeoutMs: 300 });
    expect(result.timedOut).toBe(true); expect(result.error).toBe('trial_deadline_exceeded');
    expect(result.exitCode).not.toBe(0); expect(result.durationMs).toBeLessThan(10000);
  }, 15000);
});