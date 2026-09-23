#!/usr/bin/env node
'use strict';
// Repeatable local corpus trials. Production remediation remains in the packaged engine/MCP.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { fixtureDefinitions, materializeFixture } = require('./remediation_benchmark_corpus.cjs');
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'tests/fixtures/remediation_benchmark/manifest.json');
const ENGINE = 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py';
const SERVER = 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs';
const MCP_CALL = 'mcp-testing/tools/mcp_call.cjs';
const VERSION_FILES = [ENGINE, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs', SERVER,
  'desktop/mcp/remediation_headless_driver.cjs', 'desktop/mcp/remediation_verification.cjs',
  'doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'view_pdf_audit_source.jsx', 'view_pdf_audit_module.js', 'accessibility_evidence_module.js',
  'dev-tools/benchmark_document_remediation.cjs', 'dev-tools/remediation_benchmark_corpus.cjs'];
const BACKENDS = ['portable', 'mcp-selftest', 'mcp-headless'];
const SELFTEST_CHECKS = ['browserLaunched', 'modulesBooted', 'auditAccepted', 'remediationStarted', 'contentPreserved', 'auditorCoverage', 'taggedArtifact', 'taggedDelivery', 'originalLayout', 'verificationBinding', 'activeContentScan'];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = filename => sha(fs.readFileSync(filename));
const integer = (value, fallback, minimum, maximum, name) => {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new Error(name + ' must be an integer from ' + minimum + ' to ' + maximum);
  return number;
};
const numberOrNull = value => Number.isFinite(value) && value >= 0 ? value : null;
const countOrNull = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const parseJson = value => { try { return JSON.parse(value); } catch (_) { return null; } };
function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function fileInfo(filename) {
  const stat = fs.statSync(filename);
  if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES) throw new Error('Source/plan must be a file no larger than 25 MiB: ' + filename);
  return { sha256: fileHash(filename), bytes: stat.size };
}
function inputProblems(item) {
  const problems = [];
  for (const input of ['source', 'plan']) {
    const filename = item[input + 'Path'];
    if (!filename) continue;
    try {
      const info = fileInfo(filename);
      if (info.sha256 !== item[input].sha256) problems.push({ input, reason: 'changed' });
    } catch (error) {
      problems.push({ input, reason: 'unavailable', code: /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'INVALID_INPUT' });
    }
  }
  return problems;
}
function loadManifest(filename, selection) {
  const absolute = path.resolve(filename);
  const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(manifest.corpusId || '')
    || !Array.isArray(manifest.cases) || !manifest.cases.length || manifest.cases.length > 32) throw new Error('Invalid schema1 corpus manifest');
  const ids = new Set(), builtins = new Set(fixtureDefinitions().map(item => item.id));
  const cases = manifest.cases.map(item => {
    if (!item || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(item.id || '') || ids.has(item.id) || !BACKENDS.includes(item.backend)) throw new Error('Invalid or duplicate corpus case');
    ids.add(item.id);
    if (item.fixture && (!builtins.has(item.fixture) || item.backend !== 'portable' || item.sourcePath || item.planPath)) throw new Error('Invalid built-in fixture');
    if (item.backend !== 'mcp-selftest' && !item.fixture && !item.sourcePath) throw new Error('A document source is required for ' + item.id);
    if (item.backend === 'portable' && !item.fixture && !item.planPath) throw new Error('A portable repair plan is required for ' + item.id);
    if (item.backend === 'mcp-selftest' && (item.sourcePath || item.planPath || item.fixture)) throw new Error('The scripted MCP selftest uses only its built-in fixture');
    const resolveInput = value => value ? path.resolve(path.dirname(absolute), value) : null;
    const expected = item.expected || {};
    if (Object.keys(expected).some(key => !['exitCode', 'readiness', 'checksPassed'].includes(key))
      || (expected.exitCode !== undefined && ![0, 1, 2, 3].includes(expected.exitCode))
      || (expected.readiness !== undefined && !['review-required', 'complete-for-tested-scope', 'unavailable', 'blocked'].includes(expected.readiness))
      || (expected.checksPassed !== undefined && typeof expected.checksPassed !== 'boolean')) throw new Error('Invalid expected outcome for ' + item.id);
    const options = item.options || {};
    if (Object.keys(options).some(key => !['targetScore', 'fixPasses', 'taggedPdf', 'validateUa', 'pageRange'].includes(key))) throw new Error('Unknown remediation option');
    if (options.targetScore !== undefined) integer(options.targetScore, 95, 1, 100, 'targetScore');
    if (options.fixPasses !== undefined) integer(options.fixPasses, 1, 0, 2, 'fixPasses');
    for (const key of ['taggedPdf', 'validateUa']) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new Error(key + ' must be boolean');
    if (options.pageRange !== undefined && (!Array.isArray(options.pageRange) || options.pageRange.length !== 2
      || !options.pageRange.every(n => Number.isSafeInteger(n) && n > 0) || options.pageRange[1] < options.pageRange[0] || options.pageRange[1] - options.pageRange[0] >= 10)) throw new Error('pageRange must select at most 10 pages');
    const result = { id: item.id, documentKind: String(item.documentKind || 'unspecified').slice(0, 40), backend: item.backend,
      fixture: item.fixture || null, sourcePath: resolveInput(item.sourcePath), planPath: resolveInput(item.planPath),
      calibrationCaseId: item.calibrationCaseId || null, expected, options };
    if (result.sourcePath) result.source = fileInfo(result.sourcePath);
    if (result.planPath) result.plan = fileInfo(result.planPath);
    return result;
  });
  const selected = selection && selection.length ? cases.filter(item => selection.includes(item.id)) : cases;
  if (selection && selection.some(id => !ids.has(id))) throw new Error('Unknown selected corpus case');
  if (!selected.length || selected.length > 8) throw new Error('Select between 1 and 8 cases');
  return { schemaVersion: 1, corpusId: manifest.corpusId, manifestSha256: fileHash(absolute), cases: selected };
}
function validateRunOptions(options, corpus) {
  const mode = options.mode || 'plan';
  if (!['plan', 'local', 'live'].includes(mode)) throw new Error('mode must be plan, local, or live');
  const trials = integer(options.trials, 3, 1, 10, 'trials');
  const timeoutMs = integer(options.timeoutMs, 120000, 1000, 600000, 'timeoutMs');
  const budgetMs = integer(options.budgetMs, 600000, 1000, 3600000, 'budgetMs');
  if (corpus.cases.length * trials > 40) throw new Error('At most 40 trials per invocation');
  if (mode === 'local' && corpus.cases.some(item => item.backend === 'mcp-headless')) throw new Error('Live documents require explicit --mode live');
  if (mode === 'live' && (corpus.cases.some(item => item.backend !== 'mcp-headless') || trials * corpus.cases.length > 6)) throw new Error('Live mode permits only mcp-headless cases and at most 6 trials');
  return { mode, trials, timeoutMs, budgetMs };
}
// The report used to state `provider: 'Gemini via local MCP'` unconditionally, so a run against
// Ollama, LM Studio, Claude or OpenAI was FILED AS GEMINI. That is the one thing a per-provider
// benchmark exists to distinguish, and the mislabel would have survived into the evidence. Ask the
// driver what it would actually resolve, using the same resolver the driver itself uses, so the
// answer cannot drift from the transport.
function modelConfiguration(environment = process.env) {
  const note = 'Configured identifiers, not proof of which fallback served an individual call; per-call provider versions are not exposed.';
  let resolved = null;
  try {
    resolved = require(path.join(ROOT, 'desktop', 'mcp', 'remediation_headless_driver.cjs'))
      .resolveModelTransportConfig(environment);
  } catch (_) {
    resolved = null; // fail soft: an unreadable driver must not break a plan-mode run
  }
  const backend = (resolved && resolved.backend) || 'gemini';
  if (backend === 'gemini') {
    return { provider: 'Gemini via local MCP', backend: 'gemini',
      model: environment.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
      fallbackModel: environment.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
      visionModel: null, baseUrl: null, keySource: null, cloud: true, note };
  }
  return { provider: backend + ' via local MCP', backend,
    model: resolved.model || null, fallbackModel: null,
    visionModel: resolved.visionModel || null,
    baseUrl: resolved.baseUrl || null,
    // Never the key itself — only where it came from, which is what a reader needs to reproduce.
    keySource: resolved.keySource || 'none',
    cloud: Boolean(resolved.cloud), note };
}

function versions(environment = process.env) {
  const files = Object.fromEntries(VERSION_FILES.filter(filename => fs.existsSync(path.join(ROOT, filename))).map(filename => [filename, fileHash(path.join(ROOT, filename))]));
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return { node: process.version, platform: process.platform, architecture: process.arch,
    gitCommit: git.status === 0 ? git.stdout.trim() : null, files,
    promptBundleSha256: files['doc_pipeline_source.jsx'] || null,
    implementationSha256: sha(stableStringify(files)),
    modelConfiguration: modelConfiguration(environment) };
}
function childEnvironment(mode, stateDirectory, timeoutMs, base = process.env) {
  const env = { ...base, PYTHONIOENCODING: 'utf-8', ALLOFLOW_MCP_STATE_DIR: stateDirectory,
    ALLOFLOW_MCP_MAX_RUN_MINUTES: String(Math.max(1, Math.ceil(timeoutMs / 60000))), ALLOFLOW_MCP_HEADFUL: '0' };
  if (mode !== 'live') {
    for (const name of Object.keys(env)) if (/API_KEY$|API_TOKEN$/.test(name)) delete env[name];
    for (const name of ['ALLOFLOW_MCP_ENV_PATH', 'ALLOFLOW_MCP_GEMINI_BASE', 'ALLOFLOW_MCP_VERAPDF_URL']) delete env[name];
    env.ALLOFLOW_MCP_NO_KEY_FILES = '1';
  }
  return env;
}
function runBounded(command, args, { env, timeoutMs, signal, cwd = ROOT, outputLimitBytes = 4 * 1024 * 1024 }) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn(command, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error = null, timedOut = false, stopped = false, finished = false, cleanupTimer;
    const finish = (exitCode, exitSignal) => {
      if (finished) return; finished = true;
      clearTimeout(timer); clearTimeout(cleanupTimer); signal?.removeEventListener('abort', abort);
      resolve({ exitCode, signal: exitSignal || null, timedOut, error, durationMs: Math.round((performance.now() - started) * 1000) / 1000, stdout, stderr });
    };
    const stop = () => {
      if (stopped || finished) return; stopped = true;
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => child.kill('SIGKILL'));
        cleanupTimer = setTimeout(() => { killer.kill(); child.kill('SIGKILL'); finish(null, 'SIGKILL'); }, 5000);
      } else {
        try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch (_) { child.kill('SIGKILL'); }
        cleanupTimer = setTimeout(() => finish(null, 'SIGKILL'), 5000);
      }
    };
    const abort = () => { error = 'cancelled'; stop(); };
    const timer = setTimeout(() => { timedOut = true; error = 'trial_deadline_exceeded'; stop(); }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const collect = (name, chunk) => {
      if (stopped) return;
      if (name === 'stdout') stdout += chunk; else stderr += chunk;
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > outputLimitBytes) { error = 'output_limit_exceeded'; stop(); }
    };
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => collect('stdout', chunk)); child.stderr.on('data', chunk => collect('stderr', chunk));
    child.on('error', value => { error = value.message; finish(null, null); });
    child.on('close', finish);
  });
}
function timing(values) {
  const sorted = values.filter(value => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, medianMs: null, p95Ms: null, minMs: null, maxMs: null };
  const middle = Math.floor(sorted.length / 2);
  return { count: sorted.length, medianMs: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], minMs: sorted[0], maxMs: sorted.at(-1) };
}
function aggregate(trials) {
  const groups = new Map();
  for (const trial of trials) {
    const key = trial.caseId + ':' + (trial.versions?.implementationSha256 || 'unversioned') + ':' + stableStringify(trial.model || null);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(trial);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([groupId, rows]) => {
    const caseId = rows[0].caseId;
    const sum = key => { const known = rows.map(row => row.metrics[key]).filter(value => value !== null); return { total: known.length ? known.reduce((a, b) => a + b, 0) : null, observedTrials: known.length, missingTrials: rows.length - known.length }; };
    const outcomes = key => Object.fromEntries([...new Set(rows.map(row => row.quality[key]))].sort().map(value => [value, rows.filter(row => row.quality[key] === value).length]));
    return { caseId, groupId, implementationSha256: rows[0].versions?.implementationSha256 || null, model: rows[0].model || null, trials: rows.length, passed: rows.filter(row => row.passed).length, failed: rows.filter(row => !row.passed).length,
      allTiming: timing(rows.map(row => row.durationMs)), completedTiming: timing(rows.filter(row => row.status === 'completed').map(row => row.durationMs)),
      readiness: outcomes('readiness'), preservation: outcomes('preservation'), calls: sum('calls'), retries: sum('retries'), rejections: sum('rejections') };
  });
}
function summarizeTrial(item, execution, raw, artifactReport, html = null) {
  let readiness = 'unavailable', preservation = 'unavailable', checksPassed = false, scope;
  const metrics = { calls: null, retries: null, rejections: null, planInternalTokenRecall: null };
  if (item.backend === 'portable') {
    scope = 'Portable plan-internal fidelity and static HTML checks; no independent source-PDF fidelity proof.';
    metrics.calls = 0; metrics.retries = 0;
    if (execution.exitCode === 3 && /blocked for forms/i.test(raw?.error || '')) readiness = 'blocked';
    else if (raw?.ok === true) {
      readiness = raw.humanReviewRequired === true ? 'review-required' : 'unavailable';
      const checks = artifactReport?.checks;
      metrics.planInternalTokenRecall = numberOrNull(checks?.repairPlan?.metrics?.plan_internal_token_recall);
      const structural = (!item.definition || html !== null)
        && (item.definition?.htmlIncludes || []).every(value => html.includes(value))
        && (item.definition?.htmlExcludes || []).every(value => !html.includes(value));
      checksPassed = checks?.staticHtmlAudit?.ok === true && metrics.planInternalTokenRecall !== null && metrics.planInternalTokenRecall >= 0.95 && structural;
      preservation = checksPassed ? 'passed-for-tested-scope' : 'review-required';
    }
  } else if (item.backend === 'mcp-selftest') {
    scope = 'Scripted built-in integration fixture; no human-quality calibration or live-model accuracy measurement.';
    const checks = raw?.checks;
    checksPassed = raw?.ok === true && checks && SELFTEST_CHECKS.every(key => checks[key] === true) && Object.values(checks).every(value => value === true);
    preservation = raw?.checks?.contentPreserved === true ? 'passed-for-tested-scope' : 'unavailable';
    metrics.calls = countOrNull(raw?.modelCalls);
    // Selftest proves bounded integration checks, not independently validated distribution readiness.
  } else {
    scope = 'Canonical MCP reported evidence; human source comparison remains separate.';
    readiness = raw?.reviewRequired === true ? 'review-required'
      : raw?.deliveryStatus === 'complete-for-tested-scope' && raw?.reviewRequired === false && raw?.verificationHtmlBound === true ? 'complete-for-tested-scope' : 'unavailable';
    preservation = raw?.contentCoverage?.reviewRequired === false ? 'passed-for-tested-scope'
      : raw?.contentCoverage?.reviewRequired === true ? 'review-required' : 'unavailable';
    metrics.calls = countOrNull(raw?.stats?.apiCalls); metrics.retries = countOrNull(raw?.stats?.retries);
    metrics.rejections = countOrNull(raw?.candidateRejectionCount);
    checksPassed = !!raw && !raw.error && raw.ok !== false && raw.verificationHtmlBound === true;
  }
  const expected = item.expected || {};
  const blocked = readiness === 'blocked';
  const expectedMatched = execution.exitCode === (expected.exitCode ?? 0)
    && (expected.readiness === undefined || readiness === expected.readiness)
    && (expected.checksPassed === undefined || checksPassed === expected.checksPassed);
  const passed = !execution.error && !execution.timedOut && expectedMatched && (blocked || checksPassed);
  return { passed, quality: { readiness, preservation, checksPassed: !!checksPassed, evidenceScope: scope,
    beforeScore: numberOrNull(raw?.beforeScore), afterScore: numberOrNull(raw?.afterScore) }, metrics };
}
function buildReport(plan, trials, completedAt, interruption = null, interruptionDetails = null) {
  return { schemaVersion: 1, benchmark: 'document-remediation-quality-performance', corpusId: plan.corpus.corpusId,
    mode: plan.mode, startedAt: plan.startedAt, completedAt, interruption, interruptionDetails, configuration: plan.configuration, versions: plan.versions,
    manifestSha256: plan.corpus.manifestSha256, cases: plan.corpus.cases.map(item => ({ id: item.id, documentKind: item.documentKind, backend: item.backend, calibrationCaseId: item.calibrationCaseId })),
    summary: { plannedTrials: plan.corpus.cases.length * plan.configuration.trials, completedTrials: trials.length,
      passed: trials.filter(item => item.passed).length, failed: trials.filter(item => !item.passed).length },
    aggregates: aggregate(trials), trials,
    limitations: ['Trials are serial and cold-process; OS caches and load are not controlled.',
      'Median is the middle value (mean of middle pair); p95 is nearest rank. Small samples are smoke evidence, not performance guarantees.',
      'Failed and timeout durations remain in allTiming; completedTiming excludes transport failures and timeouts.',
      'Absent model/retry/rejection metrics are null and counted as missing, never inferred as zero.',
      'Portable token recall is plan-internal; scripted checks do not establish real-model quality. No independent human labels are supplied.',
      'Configured model identifiers and prompt/source hashes are recorded; providers may revise a model behind the same identifier.',
      'Raw local evidence and artifacts can contain document content. Live mode sends selected source documents through the existing configured provider.'] };
}
function markdownReport(report) {
  const rows = report.aggregates.map(item => '| ' + item.caseId + ' | ' + item.passed + '/' + item.trials + ' | ' + (item.allTiming.medianMs ?? 'n/a') + ' | ' + (item.allTiming.p95Ms ?? 'n/a') + ' | ' + Object.keys(item.readiness).join(', ') + ' |');
  // Name the provider in the prose. Comparing two of these reports IS the per-provider
  // benchmark, and a reader cannot tell them apart from the table alone.
  const mc = report.versions && report.versions.modelConfiguration;
  const providerLine = mc
    ? 'Provider: ' + mc.provider + (mc.model ? ' (' + mc.model + ')' : '')
      + (mc.visionModel && mc.visionModel !== mc.model ? ', vision ' + mc.visionModel : '')
      + (mc.cloud === false ? ' — local, no external request' : '') + '.\n\n'
    : '';
  return '# Document remediation benchmark\n\n' + report.mode + ' mode; ' + report.summary.completedTrials + '/' + report.summary.plannedTrials + ' trials; ' + report.summary.passed + ' passed.\n\n'
    + providerLine
    + (report.interruption ? 'Interrupted: ' + report.interruption + (report.interruptionDetails ? ' (' + report.interruptionDetails.caseId + ', trial ' + report.interruptionDetails.trial + ')' : '') + '\n\n' : '')
    + '| Case | Passed | Median ms | p95 ms | Readiness |\n| --- | ---: | ---: | ---: | --- |\n' + rows.join('\n')
    + '\n\nRaw evidence:\n\n' + report.trials.map(item => '- ' + item.caseId + ' trial ' + item.trial + ': [result](' + item.evidence.result + '), [execution](' + item.evidence.execution + '), [log](' + item.evidence.stderr + ')').join('\n')
    + '\n\n' + report.limitations.map(value => '- ' + value).join('\n') + '\n';
}
async function runBenchmark(options = {}, dependencies = {}) {
  const corpus = loadManifest(options.manifest || DEFAULT_MANIFEST, options.cases);
  const configuration = validateRunOptions(options, corpus);
  const plan = { schemaVersion: 1, mode: configuration.mode, startedAt: new Date().toISOString(), configuration, corpus, versions: versions() };
  if (!options.outDir) {
    if (configuration.mode !== 'plan') throw new Error('--out-dir is required for executed trials');
    return plan;
  }
  const out = path.resolve(options.outDir);
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error('Output directory must be empty; previous evidence is never overwritten');
  fs.mkdirSync(out, { recursive: true });
  const writeJson = (filename, value) => fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n');
  writeJson(path.join(out, 'benchmark-plan.json'), plan);
  if (configuration.mode === 'plan') return plan;
  const prepared = corpus.cases.map(item => {
    const input = item.fixture ? { ...item, ...materializeFixture(item.fixture, path.join(out, 'inputs', item.id)) } : { ...item };
    return { ...input, source: input.sourcePath ? fileInfo(input.sourcePath) : null, plan: input.planPath ? fileInfo(input.planPath) : null };
  });
  const trials = [], started = performance.now(), controller = new AbortController();
  const abort = () => controller.abort(); process.once('SIGINT', abort); process.once('SIGTERM', abort);
  let interruption = null, interruptionDetails = null;
  const execute = dependencies.execute || runBounded;
  try {
    outer: for (let trial = 1; trial <= configuration.trials; trial++) {
      for (const item of prepared) {
        const remaining = configuration.budgetMs - (performance.now() - started);
        if (controller.signal.aborted || remaining < 1000) { interruption = controller.signal.aborted ? 'cancelled' : 'run_budget_exhausted'; break outer; }
        const timeoutMs = Math.min(configuration.timeoutMs, Math.floor(remaining));
        const relative = 'trials/' + item.id + '/trial-' + String(trial).padStart(2, '0');
        const directory = path.join(out, relative), output = path.join(directory, 'artifacts');
        fs.mkdirSync(directory, { recursive: true });
        const state = path.join(directory, 'state');
        const env = childEnvironment(configuration.mode, state, timeoutMs);
        let command, args, raw, artifactReport = null, html = null;
        const before = versions(env);
        const initialInputProblems = inputProblems(item);
        if (initialInputProblems.length) {
          interruption = initialInputProblems.some(problem => problem.reason === 'unavailable') ? 'source_or_plan_unavailable' : 'source_or_plan_changed';
          interruptionDetails = { caseId: item.id, trial, inputProblems: initialInputProblems };
          break outer;
        }
        if (item.backend === 'portable') {
          command = env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
          args = [ENGINE, 'remediate', '--source', item.sourcePath, '--plan', item.planPath, '--out-dir', output, '--pdf', 'never', '--verapdf', 'never'];
        } else {
          command = process.execPath;
          const tool = item.backend === 'mcp-selftest' ? 'remediation_selftest' : 'pdf_remediate';
          const toolArgs = item.backend === 'mcp-selftest' ? {} : { file_path: item.sourcePath, output_dir: output,
            target_score: item.options.targetScore ?? 95, fix_passes: item.options.fixPasses ?? 1,
            polish_passes: 0, auto_continue: false, tagged_pdf: item.options.taggedPdf ?? true,
            validate_ua: item.options.validateUa ?? true, ...(item.options.pageRange ? { page_range: item.options.pageRange } : {}) };
          const argsFile = path.join(directory, 'tool-args.json'); writeJson(argsFile, toolArgs);
          args = [MCP_CALL, 'call', SERVER, tool, argsFile, '--timeout', String(timeoutMs + 2000), '--stderr'];
        }
        process.stderr.write(item.id + ' trial ' + trial + '/' + configuration.trials + ' (' + item.backend + ')\n');
        const execution = await execute(command, args, { env, timeoutMs, signal: controller.signal });
        fs.writeFileSync(path.join(directory, 'stdout.log'), execution.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), execution.stderr || '');
        raw = parseJson(execution.stdout) || null; writeJson(path.join(directory, 'result.json'), raw);
        writeJson(path.join(directory, 'execution.json'), { exitCode: execution.exitCode, signal: execution.signal, error: execution.error, timedOut: execution.timedOut, durationMs: execution.durationMs });
        if (item.backend === 'portable' && item.sourcePath) {
          const stem = path.parse(item.sourcePath).name;
          const reportFile = path.join(output, stem + '-accessibility-report.json'), htmlFile = path.join(output, stem + '-accessible.html');
          if (fs.existsSync(reportFile)) artifactReport = parseJson(fs.readFileSync(reportFile, 'utf8'));
          if (fs.existsSync(htmlFile)) html = fs.readFileSync(htmlFile, 'utf8');
        }
        const after = versions(env);
        const versionDrift = before.implementationSha256 !== after.implementationSha256;
        const finalInputProblems = inputProblems(item);
        const sourceDrift = finalInputProblems.length > 0;
        const inputUnavailable = finalInputProblems.some(problem => problem.reason === 'unavailable');
        const outcome = summarizeTrial(item, execution, raw, artifactReport, html);
        if (versionDrift || sourceDrift) outcome.passed = false;
        const record = { caseId: item.id, documentKind: item.documentKind, backend: item.backend, trial,
          status: inputUnavailable ? 'input-unavailable' : versionDrift || sourceDrift ? 'version-drift' : execution.timedOut ? 'timeout' : execution.error ? 'error' : 'completed',
          durationMs: execution.durationMs, exitCode: execution.exitCode, ...outcome,
          versions: { source: item.source, plan: item.plan, fixtureDefinitionSha256: item.definition ? sha(stableStringify(item.definition)) : null,
            implementationSha256: before.implementationSha256, implementationAfterSha256: after.implementationSha256,
            promptBundleSha256: before.promptBundleSha256, sourceDrift, inputProblems: finalInputProblems },
          model: item.backend === 'portable' ? { provider: 'none', model: null } : item.backend === 'mcp-selftest' ? { provider: 'scripted', model: 'built-in-selftest' } : before.modelConfiguration,
          evidence: { result: relative + '/result.json', execution: relative + '/execution.json', stdout: relative + '/stdout.log', stderr: relative + '/stderr.log', artifacts: fs.existsSync(output) ? relative + '/artifacts/' : null } };
        trials.push(record);
        if (sourceDrift) {
          interruption = inputUnavailable ? 'source_or_plan_unavailable' : 'source_or_plan_changed';
          interruptionDetails = { caseId: item.id, trial, inputProblems: finalInputProblems };
        }
        // Save after each bounded trial so an interrupted run retains completed evidence.
        const report = buildReport(plan, trials, new Date().toISOString(), interruption, interruptionDetails);
        writeJson(path.join(out, 'benchmark-report.json'), report); fs.writeFileSync(path.join(out, 'benchmark-report.md'), markdownReport(report));
        if (sourceDrift) break outer;
      }
    }
  } finally { process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort); }
  const report = buildReport(plan, trials, new Date().toISOString(), interruption, interruptionDetails);
  writeJson(path.join(out, 'benchmark-report.json'), report); fs.writeFileSync(path.join(out, 'benchmark-report.md'), markdownReport(report));
  return report;
}
// ── Real-document corpus mode (2026-09-22) ──────────────────────────────────────────────────
// Schema-1 cases are synthetic fixtures plus at most six live trials, and scripted models do not
// establish live-model quality. "Does it work on documents like ours?" needs every document of a
// public corpus through the SAME connector tools a client calls, one fresh server process and
// state directory per stage, and outcomes that keep a fail-closed withhold apart from both a
// crash and a success. Model-free stages always run. The model stage runs only when an engine is
// configured; otherwise every document is recorded as blocked, never silently skipped.
const REAL_CORPUS_DEFAULT_MANIFEST = path.join(ROOT, 'mcp-testing/corpus/real-corpus-2026-09-22.json');
const REAL_CORPUS_DEFAULT_DIR = process.env.ALLOFLOW_REAL_CORPUS_DIR || path.join(process.platform === 'win32' ? 'C:\\tmp' : '/tmp', 'remediation_corpus');
const REAL_CORPUS_MAX_DOCS = 60, REAL_CORPUS_MAX_TRIALS = 3;
// The connector's own limits: the benchmark must not refuse what the product accepts, and must not
// stop a model run sooner than the product itself would (alloflow-remediation-mcp-stdio.cjs
// MAX_PDF_BYTES and ALLOFLOW_MCP_MAX_RUN_MINUTES, default 30).
const CONNECTOR_MAX_SOURCE_BYTES = 200 * 1024 * 1024;
const REMEDIATE_GRACE_MS = 5 * 60 * 1000;
const MODEL_FREE_TIMEOUTS = { extract: 10 * 60 * 1000, safety: 5 * 60 * 1000, sourcePdfUa: 20 * 60 * 1000 };
const DELIVERABLE_OUTCOMES = ['delivered', 'delivered-html'];
const CRASH_OUTCOMES = ['errored', 'timed-out'];
// Stage-level: 'failed' is a clean tool-reported error; 'crashed' is a dead process or overflow.
const STAGE_CRASH = ['crashed', 'timed-out'];
const INPUT_OUTCOMES = ['input-unavailable', 'input-changed'];
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const GEMINI_SETUP = 'Get a free Gemini key at https://aistudio.google.com/app/apikey, set it for this shell only (PowerShell: $env:GEMINI_API_KEY = "<key>"), then run the same command again.';
const productRunCapMs = (environment = process.env) => Math.max(1, Number(environment.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30) * 60 * 1000;
// Outcome for a failed pdf_remediate call, from its message. Order matters: the first match wins,
// and anything unrecognised is an error (it breaks the streak) rather than a guessed withhold.
const REMEDIATE_MESSAGE_CLASSES = [
  ['blocked', 'no-model-key', /GEMINI_API_KEY is not set/i, 'GEMINI_API_KEY is not set'],
  ['refused', 'over-size-limit', /exceeds the \d+\s*MB limit/i, 'File exceeds the'],
  ['refused', 'unsupported-input', /must point to a|is not a file|does not exist or is unreadable|File is empty/i, 'must point to a'],
  ['refused', 'encrypted-input', /encrypted|password/i, 'encrypt'],
  ['withheld', 'baseline-audit-required', /BASELINE_AUDIT_REQUIRED|BaselineAuditRequiredError|baseline accessibility audit/i, 'BaselineAuditRequiredError'],
  ['withheld', 'content-coverage', /content_coverage_requires_review/, 'content_coverage_requires_review'],
  ['withheld', 'active-content', /active_content_requires_review/, 'active_content_requires_review'],
  ['throttled', 'provider-quota', /RESOURCE_EXHAUSTED|quota|\b429\b|rate[- ]limit/i, 'RESOURCE_EXHAUSTED'],
  // Named from the first real-corpus run (2026-09-22). veraPDF finished but the connector rejected
  // its report (a pdfCount() cap of 1,000,000 checks throws on long documents); and a cold JVM that
  // misses the 15 s `java -version` probe on a busy machine is reported as Java not installed.
  ['errored', 'verapdf-evidence-rejected', /incomplete or contradictory (?:PDF\/UA )?validation evidence/i, 'Incomplete or contradictory PDF/UA validation evidence'],
  ['errored', 'java-probe-timeout', /Java runtime not found[\s\S]*ETIMEDOUT/i, "spawnSync(java,['-version']"],
  ['errored', 'model-transport-unreachable', /Network error calling|fetch failed|ECONNREFUSED|ENOTFOUND/i, 'Network error calling'],
  ['timed-out', 'client-deadline', /Timed out after \d+ms/, null],
  ['errored', 'run-cap-exceeded', /maxRunMinutes|max_run_minutes|run exceeded|wall[- ]clock/i, 'maxRunMinutes'],
  ['errored', 'browser', /Target (?:page|closed)|browser has been closed|Protocol error|net::ERR_/i, 'Target page'],
  ['errored', 'server-exited', /Server exited early/i, null],
  ['errored', 'server-busy', /\bbusy\b/i, 'busy'],
];
function classifyRemediateMessage(message) {
  const text = String(message || '');
  for (const [outcome, code, pattern] of REMEDIATE_MESSAGE_CLASSES) if (pattern.test(text)) return { outcome, code };
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return { outcome: 'errored', code: 'unclassified' + (slug ? ':' + slug : '') };
}
const safeRelative = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]/).includes('..');
function loadRealCorpus(filename, { corpusDir, selection } = {}) {
  const absolute = path.resolve(filename);
  const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  if (manifest.schemaVersion !== 2 || manifest.kind !== 'real-corpus' || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(manifest.corpusId || '')
    || !Array.isArray(manifest.documents) || !manifest.documents.length || manifest.documents.length > REAL_CORPUS_MAX_DOCS) throw new Error('Invalid schema2 real-corpus manifest');
  const root = path.resolve(corpusDir || REAL_CORPUS_DEFAULT_DIR);
  const ids = new Set();
  const documents = manifest.documents.map(item => {
    if (!item || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(item.id || '') || ids.has(item.id)) throw new Error('Invalid or duplicate real-corpus document id');
    ids.add(item.id);
    if (!/^[a-z][a-z0-9-]{1,39}$/.test(item.category || '')) throw new Error('Invalid category for ' + item.id);
    if (!/^[a-f0-9]{64}$/.test(item.sha256 || '')) throw new Error('Invalid sha256 for ' + item.id);
    if (!/^https:\/\/[^\s]+$/.test(item.url || '')) throw new Error('A public https URL is required for ' + item.id);
    if (typeof item.publicStatus !== 'string' || !item.publicStatus.trim()) throw new Error('publicStatus is required for ' + item.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.retrieved || '')) throw new Error('A retrieved date (YYYY-MM-DD) is required for ' + item.id);
    if (!safeRelative(item.file) || !/\.pdf$/i.test(item.file)) throw new Error('file must be a relative .pdf path inside the corpus directory for ' + item.id);
    if (item.repoCopy !== undefined && !safeRelative(item.repoCopy)) throw new Error('repoCopy must be a repository-relative path for ' + item.id);
    if (item.mirrors !== undefined && (!Array.isArray(item.mirrors) || item.mirrors.length > 3 || !item.mirrors.every(url => /^https:\/\/[^\s]+$/.test(url)))) throw new Error('mirrors must be at most 3 https URLs for ' + item.id);
    return { id: item.id, category: item.category, language: String(item.language || 'und').slice(0, 12), title: String(item.title || '').slice(0, 160),
      publisher: String(item.publisher || '').slice(0, 120), url: item.url, sha256: item.sha256, bytes: countOrNull(item.bytes), pages: countOrNull(item.pages),
      retrieved: item.retrieved, publicStatus: item.publicStatus.slice(0, 300), file: item.file, repoCopy: item.repoCopy || null, mirrors: item.mirrors || [],
      origin: String(item.origin || '').slice(0, 80), sourcePath: path.join(root, item.file) };
  });
  if (selection && selection.some(id => !ids.has(id))) throw new Error('Unknown selected corpus document');
  const selected = selection && selection.length ? documents.filter(item => selection.includes(item.id)) : documents;
  return { schemaVersion: 2, corpusId: manifest.corpusId, manifestPath: absolute, manifestSha256: fileHash(absolute), corpusDir: root, documents: selected };
}
function validateCorpusOptions(options, corpus, environment = process.env) {
  const trials = integer(options.trials, 1, 1, REAL_CORPUS_MAX_TRIALS, 'trials');
  const floor = productRunCapMs(environment) + REMEDIATE_GRACE_MS;
  const remediateTimeoutMs = integer(options.timeoutMs, floor, 1000, 4 * 60 * 60 * 1000, 'timeoutMs');
  // Never shorter than the product's own run cap: a benchmark that kills slow runs early would
  // report hangs the product does not have.
  if (remediateTimeoutMs < floor) throw new Error('timeoutMs may not be shorter than the connector run cap plus grace (' + floor + ' ms)');
  const budgetMs = integer(options.budgetMs, 24 * 60 * 60 * 1000, 60000, 48 * 60 * 60 * 1000, 'budgetMs');
  const pauseMs = integer(options.pauseMs, 5000, 0, 10 * 60 * 1000, 'pauseMs');
  if (!['auto', 'none'].includes(options.engine || 'auto')) throw new Error('engine must be auto or none');
  if (!corpus.documents.length) throw new Error('No documents selected');
  return { trials, remediateTimeoutMs, budgetMs, pauseMs, engine: options.engine || 'auto', modelFreeTimeouts: MODEL_FREE_TIMEOUTS };
}
function defaultResolveGeminiKey() {
  try { return require(path.join(ROOT, 'desktop', 'mcp', 'remediation_headless_driver.cjs')).resolveGeminiApiKey(); } catch (_) { return { key: null, source: 'none' }; }
}
// Which engine will answer the model stage. Records only where a key came from, never the key.
function corpusEngine(requested = 'auto', environment = process.env, dependencies = {}) {
  const configuration = modelConfiguration(environment);
  if (requested === 'none') return { engine: 'none', available: false, reason: 'Model stages disabled with --engine none.', setup: null, keySource: null, modelConfiguration: configuration };
  if (configuration.backend === 'gemini') {
    const resolved = (dependencies.resolveGeminiKey || defaultResolveGeminiKey)(environment) || {};
    if (resolved.key) return { engine: 'gemini', available: true, reason: null, setup: null, keySource: String(resolved.source || 'unknown'), modelConfiguration: configuration };
    return { engine: 'none', available: false, reason: 'No Gemini key (GEMINI_API_KEY or an ALLOFLOW_MCP_ENV_PATH key file) and no ALLOFLOW_MCP_MODEL_BACKEND is configured on this machine.',
      setup: GEMINI_SETUP, keySource: null, modelConfiguration: configuration };
  }
  return { engine: configuration.backend, available: true, reason: null, setup: null, keySource: configuration.keySource || null, modelConfiguration: configuration };
}
function corpusChildEnvironment(stateDirectory, base = process.env, { modelFree = true } = {}) {
  const env = { ...base, PYTHONIOENCODING: 'utf-8', ALLOFLOW_MCP_STATE_DIR: stateDirectory, ALLOFLOW_MCP_HEADFUL: '0' };
  if (modelFree) {
    // A model-free stage must not be able to reach a model, whatever the parent shell holds.
    for (const name of Object.keys(env)) if (/API_KEY$|API_TOKEN$/.test(name)) delete env[name];
    for (const name of ['ALLOFLOW_MCP_ENV_PATH', 'ALLOFLOW_MCP_GEMINI_BASE', 'ALLOFLOW_MCP_VERAPDF_URL', 'ALLOFLOW_MCP_MODEL_KEY', 'ALLOFLOW_MCP_MODEL_BACKEND', 'ALLOFLOW_MCP_MODEL_BASE']) delete env[name];
    env.ALLOFLOW_MCP_NO_KEY_FILES = '1';
  }
  return env;
}
// The Document Safety scanner, lifted from the SAME built module the headless driver loads and
// run on a pdf-lib document loaded with the pipeline's own options (doc_pipeline_module.js, the
// `_alloScanActiveContent(_sdoc, _NSs)` call site). Returns null when the anchors are gone.
function loadSafetyScanner(moduleText) {
  const begin = moduleText.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
  const end = begin < 0 ? -1 : moduleText.indexOf('// \u2500\u2500 S7', begin);
  if (begin < 0 || end < 0) return null;
  return new Function(moduleText.slice(begin, end) + '\nreturn _alloScanActiveContent;')();
}
function summarizeSafetyScan(scan) {
  if (!scan || typeof scan !== 'object') return null;
  const findings = (Array.isArray(scan.findings) ? scan.findings : []).map(item => String(item && item.type || 'unknown') + (Number.isFinite(item && item.count) ? ' x' + item.count : ''));
  const gate = scan.complete === true && scan.any !== true ? 'passes' : scan.any === true ? 'withholds: active content' : 'withholds: scan incomplete';
  return { complete: scan.complete === true, activeContent: scan.any === true, unexaminedStructures: countOrNull(scan.unexaminedStructures),
    pageScanFailures: countOrNull(scan.pageScanFailures), externalLinks: countOrNull(scan.externalLinks), findings, taggedPdfSafetyGate: gate };
}
async function safetyScanFile(filename, moduleFile = path.join(ROOT, 'doc_pipeline_module.js')) {
  const moduleText = fs.readFileSync(moduleFile, 'utf8');
  const scanner = loadSafetyScanner(moduleText);
  const moduleSha256 = sha(moduleText);
  if (!scanner) return { ok: false, error: 'scanner_not_found_in_module', moduleSha256 };
  const PDFLib = require(path.join(ROOT, 'desktop/mcp/vendor/pdf-lib.min.js'));
  let document;
  // A plain Uint8Array: under a jsdom test realm pdf-lib does not accept a Node Buffer.
  try { document = await PDFLib.PDFDocument.load(new Uint8Array(fs.readFileSync(filename)), { ignoreEncryption: true, updateMetadata: false }); }
  catch (error) { return { ok: false, error: 'pdf_lib_load_failed: ' + String(error && error.message || error).slice(0, 200), moduleSha256 }; }
  const started = performance.now();
  const scan = scanner(document, PDFLib);
  // The pipeline treats a null scan as "no scan" and withholds the tagged PDF; report it the same way.
  return scan ? { ok: true, scan: summarizeSafetyScan(scan), scanMs: Math.round(performance.now() - started), moduleSha256 }
    : { ok: false, error: 'scanner_returned_null', moduleSha256 };
}
function summarizeExtraction(result) {
  if (!result || typeof result !== 'object') return null;
  const glyphs = numberOrNull(result.unmappedGlyphRatio);
  const layer = result.method === 'failed' ? 'extraction failed' : result.isScanned === true || !countOrNull(result.characters) ? 'image-only (no usable text layer)'
    : glyphs !== null && glyphs >= 0.2 ? 'unreadable glyphs (no ToUnicode map)' : 'text';
  return { method: typeof result.method === 'string' ? result.method : null, characters: countOrNull(result.characters), pageCount: countOrNull(result.pageCount),
    isScanned: result.isScanned === true, textLayerUsable: result.textLayerUsable === true, unmappedGlyphRatio: glyphs, pageErrors: countOrNull(result.pageErrors),
    mediaImages: countOrNull(result.mediaImages), textLayer: layer };
}
function summarizePdfUa(result) {
  if (!result || typeof result !== 'object') return null;
  const clauses = (Array.isArray(result.failedRules) ? result.failedRules : []).slice(0, 8).map(rule => String(rule.clause || '?') + ' (' + (countOrNull(rule.failedChecks) ?? '?') + ')');
  const status = typeof result.status === 'string' ? result.status : result.compliant === true ? 'compliant' : result.compliant === false ? 'not-compliant'
    : result.error ? 'validator-error' : result.skipped ? 'skipped' : 'unknown';
  return { status, compliant: typeof result.compliant === 'boolean' ? result.compliant : null, failedRuleCount: countOrNull(result.failedRuleCount),
    failedChecks: countOrNull(result.failedChecks), passedChecks: countOrNull(result.passedChecks), validatorVersion: typeof result.validatorVersion === 'string' ? result.validatorVersion : null,
    failedClauses: clauses, detail: typeof result.reason === 'string' ? result.reason.slice(0, 160) : typeof result.error === 'string' ? result.error.slice(0, 160) : typeof result.skipped === 'string' ? result.skipped.slice(0, 160) : null };
}
function summarizeRemediation(result) {
  if (!result || typeof result !== 'object') return null;
  const verification = result.verification && typeof result.verification === 'object' ? result.verification : {};
  const coverage = result.contentCoverage && typeof result.contentCoverage === 'object' ? result.contentCoverage : {};
  const files = result.files && typeof result.files === 'object' ? result.files : {};
  const stats = result.stats && typeof result.stats === 'object' ? result.stats : {};
  return { deliveryStatus: typeof result.deliveryStatus === 'string' ? result.deliveryStatus : null,
    reviewRequired: typeof result.reviewRequired === 'boolean' ? result.reviewRequired : null,
    verdict: result.verdict && typeof result.verdict.level === 'string' ? result.verdict.level : null,
    scores: { before: numberOrNull(result.beforeScore), after: numberOrNull(result.afterScore), ai: numberOrNull(verification.ai?.score),
      axe: numberOrNull(verification.axe?.score), equalAccess: numberOrNull(verification.equalAccess?.score),
      scoreSource: typeof result.scoreSource === 'string' ? result.scoreSource : null, aiVerificationIncomplete: result.aiVerificationIncomplete === true },
    tokenRecall: numberOrNull(coverage.tokenRecall), contentCoverageReview: typeof coverage.reviewRequired === 'boolean' ? coverage.reviewRequired : null,
    taggedPdfWithheldReason: typeof result.taggedPdfError === 'string' ? result.taggedPdfError.slice(0, 120) : null,
    outputPdfUa: summarizePdfUa(result.pdfUa),
    left: { axeViolations: countOrNull(result.remainingAxeViolations), equalAccessFailures: countOrNull(result.remainingEqualAccessFailures),
      equalAccessReviewFindings: countOrNull(verification.equalAccess?.reviewFindingCount), aiIssues: countOrNull(verification.ai?.issueCount),
      verdictReviewItems: countOrNull(result.verdict?.reviewCount), verdictCautions: countOrNull(result.verdict?.cautionCount),
      deliveryReviewReasons: Array.isArray(result.deliveryReviewReasons) ? result.deliveryReviewReasons.length : null, missingTokens: countOrNull(coverage.missingTokens) },
    modelCalls: { api: countOrNull(stats.apiCalls), vision: countOrNull(stats.visionCalls), retries: countOrNull(stats.retries),
      throttles: countOrNull(stats.authThrottles), terminalFailures: countOrNull(stats.terminalFailures) },
    files: { accessibleHtml: typeof files.accessibleHtml === 'string' ? files.accessibleHtml : null, taggedPdf: typeof files.taggedPdf === 'string' ? files.taggedPdf : null,
      report: typeof files.report === 'string' ? files.report : null } };
}
function intakeCheck(document) {
  let bytes;
  try { bytes = fs.readFileSync(document.sourcePath); }
  catch (error) { return { status: 'failed', outcome: 'input-unavailable', reason: /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'unreadable' }; }
  const digest = sha(bytes);
  if (digest !== document.sha256) return { status: 'failed', outcome: 'input-changed', reason: 'sha256-mismatch', sha256: digest, bytes: bytes.length };
  if (bytes.length > CONNECTOR_MAX_SOURCE_BYTES) return { status: 'failed', outcome: 'refused', reason: 'over-connector-size-limit', sha256: digest, bytes: bytes.length };
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return { status: 'failed', outcome: 'input-changed', reason: 'not-a-pdf', sha256: digest, bytes: bytes.length };
  return { status: 'ok', outcome: null, reason: null, sha256: digest, bytes: bytes.length };
}
// Pure: the doc-level outcome from its stage results. A fail-closed withhold is its own outcome,
// never a crash and never a delivery; an unknown failure is an error, never a guessed withhold.
function classifyCorpusRecord({ intake, extract = null, safety = null, sourcePdfUa = null, remediate = null, engine, remediation = null, htmlExists = false, pdfExists = false }) {
  const modelFree = [extract, safety, sourcePdfUa].filter(Boolean);
  const modelFreeOutcome = !modelFree.length ? 'not-run' : modelFree.some(stage => stage.status === 'timed-out') ? 'timed-out'
    : modelFree.some(stage => stage.status === 'crashed') ? 'crashed' : modelFree.some(stage => stage.status !== 'ok') ? 'failed' : 'completed';
  const base = { modelFreeOutcome, failingStage: null, code: null, taggedPdfWithheldReason: null };
  if (!intake || intake.status !== 'ok') return { ...base, outcome: intake?.outcome || 'input-unavailable', failingStage: 'intake', code: intake?.reason || 'unknown' };
  if (!engine || !engine.available) return { ...base, outcome: 'blocked', failingStage: 'remediate', code: 'no-model-engine' };
  if (!remediate) return { ...base, outcome: 'errored', failingStage: 'remediate', code: 'stage-not-run' };
  if (remediate.status === 'timed-out') return { ...base, outcome: 'timed-out', failingStage: 'remediate', code: 'benchmark-deadline' };
  if (remediate.status !== 'ok') { const found = classifyRemediateMessage(remediate.message); return { ...base, outcome: found.outcome, failingStage: 'remediate', code: found.code }; }
  if (!htmlExists) return { ...base, outcome: /withh|block|refus/i.test(remediation?.deliveryStatus || '') ? 'withheld' : 'errored', failingStage: 'remediate', code: 'no-accessible-html-written' };
  if (pdfExists) return { ...base, outcome: 'delivered' };
  return { ...base, outcome: 'delivered-html', taggedPdfWithheldReason: remediation?.taggedPdfWithheldReason || 'tagged-pdf-not-written' };
}
// Pure: longest runs in RUN ORDER within one trial set. Documents whose input was unavailable or
// changed are excluded (not the tool's doing) and reported separately. The deliverable streak is
// null, "not measured", when no document reached the model stage.
function corpusStreaks(records) {
  const rows = records.filter(record => !INPUT_OUTCOMES.includes(record.outcome));
  const longest = predicate => {
    let best = { length: 0, from: null, to: null }, current = 0, from = null;
    for (const record of rows) {
      if (predicate(record)) { if (!current) from = record.docId; current++; if (current > best.length) best = { length: current, from, to: record.docId }; }
      else current = 0;
    }
    return { ...best, of: rows.length };
  };
  const modelRan = rows.some(record => record.outcome !== 'blocked' && record.failingStage !== 'intake');
  return { deliverable: modelRan ? longest(record => DELIVERABLE_OUTCOMES.includes(record.outcome)) : null,
    noCrashOrHang: longest(record => !CRASH_OUTCOMES.includes(record.outcome) && !STAGE_CRASH.includes(record.modelFreeOutcome)),
    modelFreeCompleted: longest(record => record.modelFreeOutcome === 'completed'), excludedInputs: records.length - rows.length, modelStageRan: modelRan };
}
const SEVERITY = { 'timed-out': 5, errored: 5, 'model-free-crash': 5, withheld: 4, throttled: 4, 'model-free-timeout': 4, refused: 3, 'model-free-failed': 3, 'pdf-withheld': 2, 'safety-incomplete': 2, review: 1, 'safety-active': 1 };
function excerptOf(stage) {
  if (!stage) return '';
  const lines = String(stage.stderrTail || '').split(/\r?\n/).filter(line => /error|fail|refus|withh|throttl|timed out|exceed|busy|unavailable/i.test(line));
  return String(stage.message || lines.at(-1) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
}
// Pure: every way a record falls short of "delivered, complete for the tested scope", as issues.
function issuesOf(record) {
  const issues = [], stages = record.stages || {};
  const push = (key, kind, stage, excerpt) => issues.push({ key, kind, severity: SEVERITY[kind], stage, excerpt: String(excerpt || '').slice(0, 300) });
  for (const [name, stageKey] of [['extract', 'extract'], ['safety-scan', 'safety'], ['source-pdf-ua', 'sourcePdfUa']]) {
    const stage = stages[stageKey];
    if (!stage || stage.status === 'ok') continue;
    push(name + ':' + stage.status + (stage.code ? ':' + stage.code : ''), stage.status === 'timed-out' ? 'model-free-timeout' : stage.status === 'crashed' ? 'model-free-crash' : 'model-free-failed', name, excerptOf(stage));
  }
  const safety = stages.safety?.summary;
  if (safety && !safety.complete && !safety.activeContent) push('safety-scan:incomplete', 'safety-incomplete', 'safety-scan', 'unexamined structures ' + safety.unexaminedStructures + ', page scan failures ' + safety.pageScanFailures);
  if (safety && safety.activeContent) push('safety-scan:active-content', 'safety-active', 'safety-scan', safety.findings.join(', '));
  if (['errored', 'timed-out', 'withheld', 'throttled', 'refused'].includes(record.outcome)) push(record.failingStage + ':' + record.outcome + ':' + record.code, record.outcome, record.failingStage, excerptOf(stages[record.failingStage === 'intake' ? 'intake' : 'remediate']) || record.code);
  if (record.outcome === 'delivered-html') push('tagged-pdf-withheld:' + record.taggedPdfWithheldReason, 'pdf-withheld', 'remediate', record.taggedPdfWithheldReason);
  const r = record.remediation;
  if (r && DELIVERABLE_OUTCOMES.includes(record.outcome) && r.reviewRequired !== false) {
    const reasons = [];
    if (r.contentCoverageReview === true) reasons.push('content-coverage');
    if (r.left.equalAccessFailures) reasons.push('equal-access-failures');
    if (r.left.axeViolations) reasons.push('axe-violations');
    if (r.scores.aiVerificationIncomplete) reasons.push('ai-verification-incomplete');
    for (const reason of reasons.length ? reasons : ['verdict']) push('review-required:' + reason, 'review', 'remediate', 'deliveryStatus ' + r.deliveryStatus + ', verdict ' + r.verdict + ', token recall ' + r.tokenRecall);
  }
  return issues;
}
// Pure: classes ranked by frequency x severity. The missing-engine blocker is an environment fact,
// listed apart so it cannot crowd product failures out of the ranking.
function failureTaxonomy(records, reproCommand = id => '--cases ' + id) {
  const classes = new Map(), blockers = new Map();
  for (const record of records) {
    if (record.outcome === 'blocked') {
      const entry = blockers.get(record.code) || { key: 'engine:' + record.code, count: 0, docs: [] };
      entry.count++; if (!entry.docs.includes(record.docId)) entry.docs.push(record.docId); blockers.set(record.code, entry);
    }
    for (const issue of issuesOf(record)) {
      const entry = classes.get(issue.key) || { key: issue.key, kind: issue.kind, severity: issue.severity, count: 0, docs: [], example: null };
      entry.count++; if (!entry.docs.includes(record.docId)) entry.docs.push(record.docId);
      if (!entry.example) entry.example = { docId: record.docId, trial: record.trial, stage: issue.stage, excerpt: issue.excerpt, repro: reproCommand(record.docId), evidence: record.evidence };
      classes.set(issue.key, entry);
    }
  }
  const ranked = [...classes.values()].map(entry => ({ ...entry, weight: entry.count * entry.severity }))
    .sort((a, b) => b.weight - a.weight || b.severity - a.severity || a.key.localeCompare(b.key));
  return { ranked, blockers: [...blockers.values()] };
}
// Where a failure code is raised, found by searching the code for its literal (line numbers drift).
const LOCATE_FILES = ['desktop/mcp/remediation_headless_driver.cjs', 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs', 'desktop/mcp/remediation_verification.cjs', 'desktop/mcp/remediation_epub_validation.cjs', 'doc_pipeline_source.jsx'];
const LOCATE_TERMS = { 'active_content_scan_unavailable': 'active_content_scan_unavailable', 'active_content_requires_review': 'active_content_requires_review',
  'content_coverage_requires_review': 'content_coverage_requires_review', 'safety-scan:incomplete': 'function _alloScanActiveContent', 'safety-scan:active-content': 'function _alloScanActiveContent',
  // Records written before the named classes above existed carry the unclassified slug of the message.
  'verapdf-cli-returned-incomplete': 'Incomplete or contradictory PDF/UA validation evidence', 'java-runtime-not-found': "spawnSync(java,['-version']" };
function locateFailure(key, root = ROOT) {
  let term = Object.keys(LOCATE_TERMS).find(name => key.includes(name));
  term = term ? LOCATE_TERMS[term] : (REMEDIATE_MESSAGE_CLASSES.find(([, code]) => key.endsWith(':' + code)) || [])[3] || null;
  if (!term) return null;
  for (const relative of LOCATE_FILES) {
    let text; try { text = fs.readFileSync(path.join(root, relative), 'utf8'); } catch (_) { continue; }
    const index = text.indexOf(term);
    if (index >= 0) return relative + ':' + (text.slice(0, index).split('\n').length);
  }
  return null;
}
const rate = (part, whole) => whole ? Math.round((part / whole) * 1000) / 10 : null;
function categoryRates(records) {
  const groups = new Map();
  for (const record of records) { if (!groups.has(record.category)) groups.set(record.category, []); groups.get(record.category).push(record); }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => {
    const counted = rows.filter(row => !INPUT_OUTCOMES.includes(row.outcome));
    const outcomes = Object.fromEntries([...new Set(rows.map(row => row.outcome))].sort().map(value => [value, rows.filter(row => row.outcome === value).length]));
    const modelRan = counted.filter(row => row.outcome !== 'blocked' && row.failingStage !== 'intake');
    return { category, documents: new Set(rows.map(row => row.docId)).size, trials: rows.length, outcomes,
      deliverableRate: modelRan.length ? rate(modelRan.filter(row => DELIVERABLE_OUTCOMES.includes(row.outcome)).length, modelRan.length) : null,
      noCrashRate: rate(counted.filter(row => !CRASH_OUTCOMES.includes(row.outcome) && !STAGE_CRASH.includes(row.modelFreeOutcome)).length, counted.length),
      modelFreeCompletedRate: rate(counted.filter(row => row.modelFreeOutcome === 'completed').length, counted.length),
      sourcePdfUaCompliant: counted.filter(row => row.stages?.sourcePdfUa?.summary?.compliant === true).length,
      safetyGatePasses: counted.filter(row => row.stages?.safety?.summary?.taggedPdfSafetyGate === 'passes').length,
      imageOnly: counted.filter(row => /image-only/.test(row.stages?.extract?.summary?.textLayer || '')).length };
  });
}
const NOT_CLAIMED = [
  'AlloFlow does not make a document "WCAG compliant" and this scoreboard does not certify conformance with WCAG, Section 508, the ADA or PDF/UA.',
  'AlloFlow does not remediate on its own. It drafts an accessible version and an audit report of what is left; a person reviews and decides before anything is handed out.',
  'Scores come from automated checks (axe-core, IBM Equal Access and an AI rubric). Automated checks cover only part of WCAG; many success criteria need human judgment.',
  'Token recall is a word-level comparison with the source. It cannot prove that meaning, reading order, table structure or OCR are correct.',
  'veraPDF checks the machine-verifiable PDF/UA rules only. A clean veraPDF result is not a usability test with assistive technology.',
  'A withheld tagged PDF is a safety decision (active content, an incomplete scan, or text that may be missing), not a failure to process the document.',
  'This corpus is small, public and mostly English. Results describe these documents with this engine on this date; they do not predict every document.',
  'No independent person has reviewed these outputs yet.'];
function buildScoreboard({ plan, records, complete, interruption = null, locate = locateFailure }) {
  const trialSets = [...new Set(records.map(record => record.trial))].sort((a, b) => a - b);
  const taxonomy = failureTaxonomy(records, id => plan.reproCommand.replace('{id}', id));
  const ranked = taxonomy.ranked.map(entry => ({ ...entry, suspectedLocation: locate(entry.key) }));
  const counts = Object.fromEntries([...new Set(records.map(record => record.outcome))].sort().map(value => [value, records.filter(record => record.outcome === value).length]));
  const drifted = records.filter(record => record.implementation && record.implementation.drift);
  const implementationDrift = { docTrials: drifted.length, rows: drifted.map(record => record.docId + ' trial ' + record.trial),
    files: [...new Set(drifted.flatMap(record => record.implementation.changedFiles || []))].sort(),
    implementationsSeen: [...new Set(records.flatMap(record => record.implementation ? [record.implementation.before, record.implementation.after] : []).filter(Boolean))].length,
    safetyScannerModulesSeen: [...new Set(records.map(record => record.implementation?.safetyScannerModuleSha256).filter(Boolean))] };
  return { schemaVersion: 1, kind: 'real-corpus-scoreboard', generatedAt: new Date().toISOString(), complete, interruption,
    atAGlance: atAGlance({ plan, records, taxonomy: ranked, implementationDrift }), implementationDrift, consistency: trialConsistency(records),
    command: plan.command, engine: plan.engine, corpus: plan.corpus, configuration: plan.configuration, versions: plan.versions,
    plannedDocTrials: plan.corpus.documents.length * plan.configuration.trials, completedDocTrials: records.length, outcomeCounts: counts,
    streaks: trialSets.map(trial => ({ trial, ...corpusStreaks(records.filter(record => record.trial === trial)) })),
    perCategory: categoryRates(records), taxonomy: ranked, blockers: taxonomy.blockers,
    timing: { wallMs: timing(records.map(record => record.wallMs)), remediateMs: timing(records.map(record => record.stages?.remediate?.durationMs)),
      sourcePdfUaMs: timing(records.map(record => record.stages?.sourcePdfUa?.durationMs)), extractMs: timing(records.map(record => record.stages?.extract?.durationMs)) },
    notClaimed: NOT_CLAIMED, records };
}
// Pure: does each document give the SAME answer on every trial? Compares the facts a reader acts
// on (never durations). For the model-free stages a difference means non-determinism or a tool
// that failed on one trial; for the model stage it measures run-to-run consistency.
const CONSISTENCY_FIELDS = {
  outcome: record => record.outcome, modelFreeOutcome: record => record.modelFreeOutcome,
  textLayer: record => { const x = record.stages?.extract?.summary; return x ? [x.textLayer, x.characters, x.pageCount] : null; },
  safetyScan: record => { const x = record.stages?.safety?.summary; return x ? [x.taggedPdfSafetyGate, x.findings, x.unexaminedStructures] : null; },
  sourcePdfUa: record => { const x = record.stages?.sourcePdfUa?.summary; return x ? [x.compliant, x.failedRuleCount, x.failedChecks] : null; },
  remediation: record => { const x = record.remediation; return x ? [x.deliveryStatus, x.verdict, x.taggedPdfWithheldReason] : null; },
};
function trialConsistency(records) {
  const byDoc = new Map();
  for (const record of records) { if (!byDoc.has(record.docId)) byDoc.set(record.docId, []); byDoc.get(record.docId).push(record); }
  const compared = [...byDoc].filter(([, rows]) => rows.length > 1);
  const differing = compared.map(([docId, rows]) => ({ docId, trials: rows.map(row => row.trial),
    fields: Object.keys(CONSISTENCY_FIELDS).filter(field => new Set(rows.map(row => JSON.stringify(CONSISTENCY_FIELDS[field](row)))).size > 1) }))
    .filter(item => item.fields.length);
  return { docsCompared: compared.length, consistent: compared.length - differing.length, differing };
}
// Plain-language headline for a reader who will not open the tables. Source facts count each
// document once (its first trial); outcomes count document trials.
function atAGlance({ plan, records, taxonomy, implementationDrift }) {
  const firstByDoc = new Map(); for (const record of records) if (!firstByDoc.has(record.docId)) firstByDoc.set(record.docId, record);
  const docs = [...firstByDoc.values()], planned = plan.corpus.documents.length * plan.configuration.trials;
  const kinds = new Set(plan.corpus.documents.map(item => item.category)).size;
  const counted = records.filter(record => !INPUT_OUTCOMES.includes(record.outcome));
  const modelRan = counted.filter(record => record.outcome !== 'blocked' && record.failingStage !== 'intake');
  const crashes = counted.filter(record => CRASH_OUTCOMES.includes(record.outcome) || STAGE_CRASH.includes(record.modelFreeOutcome)).length;
  const summaryOf = (record, stage) => record.stages?.[stage]?.summary || null;
  const uaKnown = docs.filter(record => typeof summaryOf(record, 'sourcePdfUa')?.compliant === 'boolean');
  const uaPass = uaKnown.filter(record => summaryOf(record, 'sourcePdfUa').compliant === true).length;
  const imageOnly = docs.filter(record => /image-only/.test(summaryOf(record, 'extract')?.textLayer || '')).length;
  const glyphs = docs.filter(record => /unreadable glyphs/.test(summaryOf(record, 'extract')?.textLayer || '')).length;
  const safetyKnown = docs.filter(record => summaryOf(record, 'safety'));
  const active = safetyKnown.filter(record => summaryOf(record, 'safety').activeContent).length;
  const incomplete = safetyKnown.filter(record => !summaryOf(record, 'safety').activeContent && !summaryOf(record, 'safety').complete).length;
  const lines = [plan.corpus.documents.length + ' public documents (' + kinds + ' kinds), ' + plan.configuration.trials + ' trial(s) each: ' + records.length + ' of ' + planned + ' document trials completed.'];
  lines.push(plan.engine.available
    ? 'Model stage ran with ' + plan.engine.engine + '. ' + modelRan.filter(record => DELIVERABLE_OUTCOMES.includes(record.outcome)).length + ' of ' + modelRan.length + ' document trials produced a deliverable output (accessible HTML plus the audit report); '
      + modelRan.filter(record => record.outcome === 'delivered').length + ' also got a tagged PDF.'
    : 'Model stage BLOCKED on this machine (no model key or backend), so no document was remediated in this run. Everything below comes from the model-free stages, which ran on every document.');
  lines.push('Model-free stages completed on ' + counted.filter(record => record.modelFreeOutcome === 'completed').length + ' of ' + counted.length + ' document trials. Crashes or hangs: ' + crashes + '.');
  lines.push('Source files: ' + uaPass + ' of ' + uaKnown.length + ' already pass the veraPDF PDF/UA-1 checks; ' + imageOnly + ' are image-only (no text to check until OCR); ' + glyphs + ' have a text layer that decodes to unreadable glyphs.');
  lines.push('Document Safety scan: the tagged PDF would be withheld for ' + (active + incomplete) + ' of ' + safetyKnown.length + ' documents (' + active + ' carry active content such as scripts; ' + incomplete + ' could not be fully examined). This gate withholds only the tagged PDF, never the accessible HTML.');
  const product = taxonomy.filter(entry => entry.severity >= 3);
  lines.push(product.length ? 'Most serious product finding: ' + product[0].key + ' (' + product[0].count + ' document trials).' : 'No model-free stage crashed, hung or failed on any document.');
  const consistency = trialConsistency(records);
  if (consistency.docsCompared) lines.push('Repeat trials: ' + consistency.consistent + ' of ' + consistency.docsCompared + ' documents gave the same answer on every trial'
    + (consistency.differing.length ? '; ' + consistency.differing.length + ' differed (listed under Consistency).' : '.'));
  if (implementationDrift.docTrials) lines.push('The code under test changed during ' + implementationDrift.docTrials + ' document trial(s) (another session edited ' + implementationDrift.files.join(', ') + '); those rows are marked.');
  return lines;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const show = (value, suffix = '') => value === null || value === undefined ? 'n/a' : value + suffix;
function streakSentence(streak) {
  if (!streak.deliverable) return 'Trial ' + streak.trial + ': deliverable streak not measured, because no document reached the model stage. Model-free stages completed on '
    + streak.modelFreeCompleted.length + ' documents in a row (of ' + streak.modelFreeCompleted.of + '); no crash or hang on ' + streak.noCrashOrHang.length + ' in a row.';
  return 'Trial ' + streak.trial + ': ' + streak.deliverable.length + ' documents in a row produced a deliverable output with no crash or hang (of '
    + streak.deliverable.of + (streak.deliverable.length ? ', ' + streak.deliverable.from + ' through ' + streak.deliverable.to : '') + '). No crash or hang: ' + streak.noCrashOrHang.length + ' in a row.';
}
function recordRow(record) {
  const s = record.stages || {}, r = record.remediation;
  return { doc: record.docId, trial: record.trial, category: record.category, language: record.language, pages: show(s.extract?.summary?.pageCount ?? record.pages),
    textLayer: s.extract?.summary?.textLayer || (s.extract ? s.extract.status : 'n/a'),
    sourcePdfUa: s.sourcePdfUa?.summary ? (s.sourcePdfUa.summary.compliant === true ? 'passes' : s.sourcePdfUa.summary.compliant === false ? 'fails ' + s.sourcePdfUa.summary.failedRuleCount + ' rules' : s.sourcePdfUa.summary.status) : (s.sourcePdfUa ? s.sourcePdfUa.status : 'n/a'),
    safety: s.safety?.summary ? s.safety.summary.taggedPdfSafetyGate : (s.safety ? s.safety.status : 'n/a'),
    outcome: (record.implementation?.drift ? '[code changed during this document] ' : '') + record.outcome + (record.taggedPdfWithheldReason ? ' (tagged PDF withheld: ' + record.taggedPdfWithheldReason + ')' : record.code && !DELIVERABLE_OUTCOMES.includes(record.outcome) ? ' (' + record.code + ')' : ''),
    readiness: r ? show(r.deliveryStatus) : 'n/a', scores: r ? show(r.scores.before) + ' to ' + show(r.scores.after) : 'n/a',
    engines: r ? 'AI ' + show(r.scores.ai) + ', axe ' + show(r.scores.axe) + ', EA ' + show(r.scores.equalAccess) : 'n/a',
    recall: r ? show(r.tokenRecall) : 'n/a', left: r ? 'axe ' + show(r.left.axeViolations) + ', EA ' + show(r.left.equalAccessFailures) + ', review items ' + show(r.left.verdictReviewItems) : 'n/a',
    outputPdfUa: r && r.outputPdfUa ? r.outputPdfUa.status : 'n/a', calls: r ? show(r.modelCalls.api) : 'n/a', seconds: show(record.wallMs === null ? null : Math.round(record.wallMs / 1000)) };
}
const ROW_COLUMNS = [['doc', 'Document'], ['trial', 'Trial'], ['category', 'Category'], ['language', 'Language'], ['pages', 'Pages'], ['textLayer', 'Text layer'],
  ['sourcePdfUa', 'Source PDF/UA (veraPDF)'], ['safety', 'Safety scan'], ['outcome', 'Outcome'], ['readiness', 'Readiness'], ['scores', 'Score before to after'],
  ['engines', 'After, per engine'], ['recall', 'Token recall'], ['left', 'Left for a person'], ['outputPdfUa', 'Output PDF/UA'], ['calls', 'Model calls'], ['seconds', 'Wall seconds']];
function scoreboardMarkdown(board) {
  const engine = board.engine;
  const lines = ['# Real-document remediation scoreboard', '',
    'Generated ' + board.generatedAt + '. ' + (board.complete ? 'The run finished.' : 'The run is INCOMPLETE' + (board.interruption ? ' (' + board.interruption + ')' : '') + '.'), '',
    '## At a glance', '', ...(board.atAGlance || []).map(value => '- ' + value), '',
    '## How to reproduce', '', '```', board.command, '```', '',
    'Fetch or check the documents first with the same command and `--mode fetch`. The PDFs are public and are not stored in the repository.', '',
    '## Engine', '', engine.available ? 'Model stage engine: ' + engine.engine + (engine.modelConfiguration?.model ? ' (' + engine.modelConfiguration.model + ')' : '') + (engine.keySource ? ', key from ' + engine.keySource : '') + '.'
      : '**Model stage BLOCKED.** ' + engine.reason + (engine.setup ? ' To unblock: ' + engine.setup : ''), '',
    'Model-free stages (text extraction, the Document Safety scan, veraPDF on the source) ran on every document with no model and no network request for document content.', '',
    '## Streak', '', ...board.streaks.map(streakSentence), '',
    '## Corpus', '', board.corpus.documents.length + ' public documents, ' + board.configuration.trials + ' trial(s) each, ' + board.completedDocTrials + ' of ' + board.plannedDocTrials + ' document trials completed.', '',
    '| Document | Category | Language | Publisher | Public status | Source |', '| --- | --- | --- | --- | --- | --- |',
    ...board.corpus.documents.map(d => '| ' + d.id + ' | ' + d.category + ' | ' + d.language + ' | ' + (d.publisher || 'n/a') + ' | ' + d.publicStatus.replace(/\|/g, '/') + ' | ' + d.url + ' |'), '',
    '## Outcomes', '', ...Object.entries(board.outcomeCounts).map(([key, value]) => '- ' + key + ': ' + value), '',
    'Outcome meanings: delivered = accessible HTML and a tagged PDF were written; delivered-html = accessible HTML written, tagged PDF withheld by a safety or honesty gate; withheld = a gate refused to deliver anything (fail-closed, not a crash); refused = the input was not accepted; throttled = the model provider refused calls; errored = a crash or unexpected failure; timed-out = a hang; blocked = no model engine configured.', '',
    '## Rates per category', '', '| Category | Docs | Trials | Deliverable rate | No crash or hang | Model-free stages completed | Source passes PDF/UA | Safety scan passes | Image-only |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...board.perCategory.map(c => '| ' + c.category + ' | ' + c.documents + ' | ' + c.trials + ' | ' + show(c.deliverableRate, '%') + ' | ' + show(c.noCrashRate, '%') + ' | ' + show(c.modelFreeCompletedRate, '%') + ' | ' + c.sourcePdfUaCompliant + ' | ' + c.safetyGatePasses + ' | ' + c.imageOnly + ' |'), '',
    '## Failure taxonomy (frequency x severity)', '', 'Severity: 5 crash or hang, 4 nothing delivered (withheld or throttled), 3 input refused or a model-free stage failed, 2 tagged PDF withheld or safety scan incomplete, 1 review required or active content found (correct behavior, listed so it is visible).', '',
    ...(board.blockers.length ? ['Run blockers (environment, not product failures): ' + board.blockers.map(b => b.key + ' on ' + b.count + ' document trials').join('; ') + '.', ''] : []),
    '| Rank | Class | Severity | Count | Docs | Minimal repro | Suspected location | Log excerpt |', '| ---: | --- | ---: | ---: | --- | --- | --- | --- |',
    ...board.taxonomy.map((t, i) => '| ' + (i + 1) + ' | ' + t.key + ' | ' + t.severity + ' | ' + t.count + ' | ' + t.docs.slice(0, 6).join(', ') + (t.docs.length > 6 ? ' +' + (t.docs.length - 6) : '') + ' | `' + t.example.repro + '` (stage ' + t.example.stage + ') | ' + (t.suspectedLocation || 'n/a') + ' | ' + t.example.excerpt.replace(/\|/g, '/').slice(0, 160) + ' |'), '',
    '## Consistency across trials', '', board.consistency && board.consistency.docsCompared
      ? board.consistency.consistent + ' of ' + board.consistency.docsCompared + ' documents gave the same answer on every trial (outcome, text layer, safety scan, source PDF/UA'
        + (board.engine.available ? ', remediation verdict' : '') + '; durations excluded).' : 'Only one trial per document, so consistency was not measured.', '',
    ...(board.consistency && board.consistency.differing.length ? ['| Document | Trials | Fields that differed |', '| --- | --- | --- |',
      ...board.consistency.differing.map(item => '| ' + item.docId + ' | ' + item.trials.join(', ') + ' | ' + item.fields.join(', ') + ' |'), ''] : []),
    '## Per document (trial ' + (board.records[0]?.trial ?? 1) + '; every trial is in scoreboard.json)', '', '| ' + ROW_COLUMNS.map(([, label]) => label).join(' | ') + ' |', '| ' + ROW_COLUMNS.map(() => '---').join(' | ') + ' |',
    ...board.records.filter(record => record.trial === (board.records[0]?.trial ?? 1)).map(recordRow).map(row => '| ' + ROW_COLUMNS.map(([key]) => String(row[key]).replace(/\|/g, '/')).join(' | ') + ' |'), '',
    '## What this does NOT claim', '', ...board.notClaimed.map(value => '- ' + value), ''];
  return lines.join('\n');
}
function scoreboardHtml(board) {
  const engine = board.engine;
  const table = (caption, head, rows) => '<div class="wrap" tabindex="0" role="region" aria-label="' + esc(caption) + '"><table><caption>' + esc(caption) + '</caption><thead><tr>' + head.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>'
    + rows.map(row => '<tr>' + row.map((cell, i) => i === 0 ? '<th scope="row">' + esc(cell) + '</th>' : '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Real-document remediation scoreboard</title>'
    + '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px;color:#1a1a1a;background:#fff}h1,h2{line-height:1.25}'
    + '.wrap{overflow-x:auto}.wrap:focus{outline:3px solid #1a4f8b;outline-offset:2px}table{border-collapse:collapse;margin:8px 0 24px;font-size:14px}caption{text-align:left;font-weight:600;padding:4px 0}'
    + 'th,td{border:1px solid #767676;padding:4px 8px;text-align:left;vertical-align:top}thead th{background:#e8e8e8}code,pre{background:#f2f2f2;padding:2px 4px;white-space:pre-wrap;word-break:break-all}'
    + '.blocked{border:2px solid #8a1c1c;padding:8px 12px;background:#fdf0f0}</style></head><body><main>'
    + '<h1>Real-document remediation scoreboard</h1><p>Generated ' + esc(board.generatedAt) + '. ' + (board.complete ? 'The run finished.' : 'The run is incomplete' + (board.interruption ? ' (' + esc(board.interruption) + ')' : '') + '.') + '</p>'
    + '<h2>At a glance</h2><ul>' + (board.atAGlance || []).map(value => '<li>' + esc(value) + '</li>').join('') + '</ul>'
    + '<h2>How to reproduce</h2><pre><code>' + esc(board.command) + '</code></pre><p>Fetch or check the documents first with the same command and <code>--mode fetch</code>. The PDFs are public and are not stored in the repository.</p>'
    + '<h2>Engine</h2>' + (engine.available ? '<p>Model stage engine: ' + esc(engine.engine) + (engine.modelConfiguration?.model ? ' (' + esc(engine.modelConfiguration.model) + ')' : '') + '.</p>'
      : '<p class="blocked"><strong>Model stage blocked.</strong> ' + esc(engine.reason) + (engine.setup ? ' To unblock: ' + esc(engine.setup) : '') + '</p>')
    + '<p>Model-free stages (text extraction, the Document Safety scan, veraPDF on the source) ran on every document with no model and no network request for document content.</p>'
    + '<h2>Streak</h2><ul>' + board.streaks.map(s => '<li>' + esc(streakSentence(s)) + '</li>').join('') + '</ul>'
    + '<h2>Outcomes</h2><ul>' + Object.entries(board.outcomeCounts).map(([k, v]) => '<li>' + esc(k) + ': ' + v + '</li>').join('') + '</ul>'
    + table('Rates per category', ['Category', 'Docs', 'Trials', 'Deliverable rate', 'No crash or hang', 'Model-free stages completed', 'Source passes PDF/UA', 'Safety scan passes', 'Image-only'],
      board.perCategory.map(c => [c.category, c.documents, c.trials, show(c.deliverableRate, '%'), show(c.noCrashRate, '%'), show(c.modelFreeCompletedRate, '%'), c.sourcePdfUaCompliant, c.safetyGatePasses, c.imageOnly]))
    + '<h2>Failure taxonomy</h2><p>Ranked by frequency times severity. Severity: 5 crash or hang, 4 nothing delivered, 3 input refused or a model-free stage failed, 2 tagged PDF withheld or safety scan incomplete, 1 review required or active content found (correct behavior, listed so it is visible).</p>'
    + (board.blockers.length ? '<p>Run blockers (environment, not product failures): ' + esc(board.blockers.map(b => b.key + ' on ' + b.count + ' document trials').join('; ')) + '.</p>' : '')
    + table('Failure classes', ['Class', 'Severity', 'Count', 'Documents', 'Minimal repro', 'Suspected location', 'Log excerpt'],
      board.taxonomy.map(t => [t.key, t.severity, t.count, t.docs.join(', '), t.example.repro + ' (stage ' + t.example.stage + ')', t.suspectedLocation || 'n/a', t.example.excerpt]))
    + '<h2>Consistency across trials</h2><p>' + esc(board.consistency && board.consistency.docsCompared
      ? board.consistency.consistent + ' of ' + board.consistency.docsCompared + ' documents gave the same answer on every trial (durations excluded).' : 'Only one trial per document, so consistency was not measured.') + '</p>'
    + (board.consistency && board.consistency.differing.length ? table('Documents whose trials differed', ['Document', 'Trials', 'Fields that differed'],
      board.consistency.differing.map(item => [item.docId, item.trials.join(', '), item.fields.join(', ')])) : '')
    + table('Per document results, trial ' + (board.records[0]?.trial ?? 1) + ' (every trial is in scoreboard.json)', ROW_COLUMNS.map(([, label]) => label),
      board.records.filter(record => record.trial === (board.records[0]?.trial ?? 1)).map(recordRow).map(row => ROW_COLUMNS.map(([key]) => row[key])))
    + table('Corpus', ['Document', 'Category', 'Language', 'Publisher', 'Public status', 'Source URL', 'SHA-256'],
      board.corpus.documents.map(d => [d.id, d.category, d.language, d.publisher || 'n/a', d.publicStatus, d.url, d.sha256]))
    + '<h2>What this does not claim</h2><ul>' + board.notClaimed.map(v => '<li>' + esc(v) + '</li>').join('') + '</ul></main></body></html>\n';
}
function corpusCommand(options, corpus) {
  const rel = value => { const relative = path.relative(ROOT, path.resolve(value)); return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.split(path.sep).join('/') : path.resolve(value); };
  return ['node dev-tools/benchmark_document_remediation.cjs --mode corpus', '--manifest ' + rel(corpus.manifestPath), '--corpus-dir ' + corpus.corpusDir,
    '--trials ' + (options.trials || 1), ...(options.engine && options.engine !== 'auto' ? ['--engine ' + options.engine] : []), '--out-dir ' + rel(options.outDir || '<empty-directory>')].join(' ');
}
async function runToolStage(name, tool, toolArgs, { directory, execute, env, modelFree, timeoutMs, signal, outputLimitBytes, summarize }) {
  const stageDir = path.join(directory, name); fs.mkdirSync(stageDir, { recursive: true });
  const argsFile = path.join(stageDir, 'tool-args.json'); fs.writeFileSync(argsFile, JSON.stringify(toolArgs, null, 2) + '\n');
  const execution = await execute(process.execPath, [MCP_CALL, 'call', SERVER, tool, argsFile, '--timeout', String(timeoutMs), '--stderr'],
    { env: corpusChildEnvironment(path.join(stageDir, 'state'), env, { modelFree }), timeoutMs: timeoutMs + 15000, signal, outputLimitBytes });
  return finishStage(stageDir, execution, summarize);
}
function finishStage(stageDir, execution, summarize) {
  fs.writeFileSync(path.join(stageDir, 'stdout.log'), execution.stdout || ''); fs.writeFileSync(path.join(stageDir, 'stderr.log'), execution.stderr || '');
  fs.writeFileSync(path.join(stageDir, 'execution.json'), JSON.stringify({ exitCode: execution.exitCode, signal: execution.signal, error: execution.error, timedOut: execution.timedOut, durationMs: execution.durationMs }, null, 2) + '\n');
  const result = parseJson(execution.stdout);
  const stderrTail = String(execution.stderr || '').split(/\r?\n/).slice(-40).join('\n');
  const clientTimedOut = execution.exitCode !== 0 && /Timed out after \d+ms/.test(execution.stderr || '');
  const message = execution.exitCode === 0 ? (result && typeof result.error === 'string' ? result.error : null)
    : (result && (result.message || result.error)) || String(execution.stdout || '').trim().slice(0, 400) || execution.error || ('exit ' + execution.exitCode);
  let status = execution.timedOut || clientTimedOut ? 'timed-out' : execution.error || /Server exited early/i.test(execution.stderr || '') ? 'crashed'
    : execution.exitCode === 0 && result && !(typeof result.error === 'string') ? 'ok' : 'failed';
  const summary = result ? summarize(result) : null;
  let code = null;
  if (status === 'ok' && summary && summary.method === 'failed') { status = 'failed'; code = 'extraction-method-failed'; }
  if (status !== 'ok' && !code) code = execution.error && !execution.timedOut ? execution.error : classifyRemediateMessage(message).code;
  return { status, code, durationMs: numberOrNull(execution.durationMs), exitCode: execution.exitCode, message: status === 'ok' ? null : String(message || '').slice(0, 400), stderrTail, summary, result };
}
async function runSafetyStage(filename, { directory, execute, env, signal }) {
  const stageDir = path.join(directory, 'safety-scan'); fs.mkdirSync(stageDir, { recursive: true });
  const execution = await execute(process.execPath, [__filename, '--internal-safety-scan', filename],
    { env: corpusChildEnvironment(path.join(stageDir, 'state'), env), timeoutMs: MODEL_FREE_TIMEOUTS.safety, signal });
  const stage = finishStage(stageDir, execution, result => result.ok ? result.scan : null);
  if (stage.result && stage.result.ok === false) { stage.status = 'failed'; stage.code = String(stage.result.error || 'scan-failed').split(':')[0]; stage.message = String(stage.result.error || '').slice(0, 300); }
  return stage;
}
const compactStage = stage => stage ? { status: stage.status, code: stage.code, durationMs: stage.durationMs, exitCode: stage.exitCode, message: stage.message, stderrTail: stage.stderrTail ? stage.stderrTail.slice(-1200) : '', summary: stage.summary } : null;
async function runCorpus(options = {}, dependencies = {}) {
  const env = dependencies.env || process.env;
  const corpus = loadRealCorpus(options.manifest || REAL_CORPUS_DEFAULT_MANIFEST, { corpusDir: options.corpusDir, selection: options.cases });
  const configuration = validateCorpusOptions(options, corpus, env);
  const engine = corpusEngine(configuration.engine, env, dependencies);
  const command = corpusCommand(options, corpus);
  const publicEngine = { engine: engine.engine, available: engine.available, reason: engine.reason, setup: engine.setup, keySource: engine.keySource, modelConfiguration: engine.modelConfiguration };
  const plan = { schemaVersion: 2, kind: 'real-corpus-plan', startedAt: new Date().toISOString(), command, reproCommand: command.replace(/--manifest /, '--cases {id} --manifest ').replace(/--trials \d+/, '--trials 1').replace(/--out-dir \S+$/, '--out-dir <empty-directory>'),
    configuration, engine: publicEngine, versions: dependencies.versions ? dependencies.versions() : versions(env),
    corpus: { corpusId: corpus.corpusId, manifestSha256: corpus.manifestSha256, corpusDir: corpus.corpusDir,
      documents: corpus.documents.map(({ sourcePath, ...rest }) => rest) } };
  if (!options.outDir) throw new Error('--out-dir is required for a corpus run');
  const out = path.resolve(options.outDir);
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error('Output directory must be empty; previous evidence is never overwritten');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, '.gitignore'), '# Raw per-stage evidence (document text, logs, outputs) stays local.\ntrials/\n');
  fs.writeFileSync(path.join(out, 'benchmark-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  const execute = dependencies.execute || runBounded;
  const sleep = dependencies.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const log = dependencies.log || (line => process.stderr.write(line + '\n'));
  const records = [], started = performance.now(), controller = new AbortController();
  const abort = () => controller.abort(); process.once('SIGINT', abort); process.once('SIGTERM', abort);
  let interruption = null;
  const save = complete => {
    const board = buildScoreboard({ plan, records, complete, interruption, locate: dependencies.locate || locateFailure });
    fs.writeFileSync(path.join(out, 'scoreboard.json'), JSON.stringify(board, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'scoreboard.md'), scoreboardMarkdown(board));
    fs.writeFileSync(path.join(out, 'scoreboard.html'), scoreboardHtml(board));
    return board;
  };
  try {
    outer: for (let trial = 1; trial <= configuration.trials; trial++) {
      for (const [order, document] of corpus.documents.entries()) {
        if (controller.signal.aborted) { interruption = 'cancelled'; break outer; }
        if (configuration.budgetMs - (performance.now() - started) < 60000) { interruption = 'run_budget_exhausted'; break outer; }
        const relative = 'trials/' + document.id + '/trial-' + String(trial).padStart(2, '0');
        const directory = path.join(out, relative); fs.mkdirSync(directory, { recursive: true });
        const docStarted = performance.now();
        // ~15 sessions edit this tree: stamp the code under test around every document so a
        // mid-run edit is disclosed on the rows it touched instead of silently mixing versions.
        const stamp = dependencies.versions || versions;
        const versionBefore = stamp(env) || {};
        log(document.id + ' trial ' + trial + '/' + configuration.trials + ' (' + (order + 1) + '/' + corpus.documents.length + ', engine ' + engine.engine + ')');
        const intake = intakeCheck(document);
        const context = { directory, execute, env, signal: controller.signal };
        const stages = { intake: { status: intake.status, code: intake.reason, summary: { sha256: intake.sha256 || null, bytes: intake.bytes ?? null } } };
        let remediation = null, htmlExists = false, pdfExists = false, outputs = null;
        if (intake.status === 'ok') {
          stages.extract = await runToolStage('extract', 'extract_document_text', { file_path: document.sourcePath }, { ...context, modelFree: true, timeoutMs: MODEL_FREE_TIMEOUTS.extract, outputLimitBytes: 96 * 1024 * 1024, summarize: summarizeExtraction });
          stages.safety = await (dependencies.safetyStage || runSafetyStage)(document.sourcePath, context);
          stages.sourcePdfUa = await runToolStage('source-pdf-ua', 'pdf_validate_ua', { file_path: document.sourcePath }, { ...context, modelFree: true, timeoutMs: MODEL_FREE_TIMEOUTS.sourcePdfUa, summarize: summarizePdfUa });
          if (engine.available) {
            const outputDir = path.join(directory, 'remediate', 'output'); fs.mkdirSync(outputDir, { recursive: true });
            stages.remediate = await runToolStage('remediate', 'pdf_remediate', { file_path: document.sourcePath, output_dir: outputDir, validate_ua: true },
              { ...context, modelFree: false, timeoutMs: configuration.remediateTimeoutMs, summarize: summarizeRemediation });
            remediation = stages.remediate.summary;
            const exists = file => typeof file === 'string' && fs.existsSync(file) && fs.statSync(file).size > 0;
            htmlExists = exists(remediation?.files.accessibleHtml); pdfExists = exists(remediation?.files.taggedPdf);
            outputs = { accessibleHtmlSha256: htmlExists ? fileHash(remediation.files.accessibleHtml) : null, taggedPdfSha256: pdfExists ? fileHash(remediation.files.taggedPdf) : null };
          }
        }
        const classified = classifyCorpusRecord({ intake, extract: stages.extract, safety: stages.safety, sourcePdfUa: stages.sourcePdfUa, remediate: stages.remediate, engine, remediation, htmlExists, pdfExists });
        const after = intake.status === 'ok' ? intakeCheck(document) : intake;
        const versionAfter = stamp(env) || {};
        const beforeFiles = versionBefore.files || {}, afterFiles = versionAfter.files || {};
        const implementation = { before: versionBefore.implementationSha256 || null, after: versionAfter.implementationSha256 || null,
          drift: (versionBefore.implementationSha256 || null) !== (versionAfter.implementationSha256 || null),
          changedFiles: [...new Set([...Object.keys(beforeFiles), ...Object.keys(afterFiles)])].filter(name => beforeFiles[name] !== afterFiles[name]).sort(),
          safetyScannerModuleSha256: stages.safety?.result?.moduleSha256 || null };
        const record = { docId: document.id, category: document.category, language: document.language, pages: document.pages, trial, order: order + 1, engine: engine.engine,
          ...classified, remediation, outputs, implementation, sourceUnchanged: after.status === 'ok' || intake.status !== 'ok', wallMs: Math.round(performance.now() - docStarted),
          stages: Object.fromEntries(Object.entries(stages).map(([key, stage]) => [key, key === 'intake' ? stage : compactStage(stage)])), evidence: relative + '/' };
        if (intake.status === 'ok' && after.status !== 'ok') { record.outcome = 'input-changed'; record.failingStage = 'intake'; record.code = 'source-changed-during-trial'; }
        records.push(record);
        fs.writeFileSync(path.join(directory, 'record.json'), JSON.stringify(record, null, 2) + '\n');
        save(false);
        log('  -> ' + record.outcome + (record.code ? ' (' + record.code + ')' : '') + ', model-free ' + record.modelFreeOutcome + ', ' + Math.round(record.wallMs / 1000) + ' s');
        const last = trial === configuration.trials && order === corpus.documents.length - 1;
        if (!last && engine.available && configuration.pauseMs) await sleep(configuration.pauseMs);
      }
    }
  } finally { process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort); }
  return save(!interruption && records.length === corpus.documents.length * configuration.trials);
}
// Rebuild scoreboard.md/.json/.html from a run's saved per-document records, e.g. after an
// interruption or a renderer fix. The evidence is the records; the renderer is stamped separately.
function renderCorpus(options = {}) {
  if (!options.outDir) throw new Error('--out-dir (a finished or interrupted corpus run) is required');
  const out = path.resolve(options.outDir);
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'benchmark-plan.json'), 'utf8'));
  if (plan.kind !== 'real-corpus-plan') throw new Error('Not a corpus run directory');
  const records = [];
  const trialsRoot = path.join(out, 'trials');
  for (const docId of fs.existsSync(trialsRoot) ? fs.readdirSync(trialsRoot) : []) {
    for (const trialDir of fs.readdirSync(path.join(trialsRoot, docId))) {
      const file = path.join(trialsRoot, docId, trialDir, 'record.json');
      if (fs.existsSync(file)) records.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }
  records.sort((a, b) => a.trial - b.trial || a.order - b.order);
  const planned = plan.corpus.documents.length * plan.configuration.trials;
  const board = buildScoreboard({ plan, records, complete: records.length === planned, interruption: records.length === planned ? null : 'incomplete: ' + records.length + ' of ' + planned + ' document trials recorded' });
  board.renderedBy = { benchmarkSha256: fileHash(__filename), renderedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(out, 'scoreboard.json'), JSON.stringify(board, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'scoreboard.md'), scoreboardMarkdown(board));
  fs.writeFileSync(path.join(out, 'scoreboard.html'), scoreboardHtml(board));
  return board;
}
// Fetch by URL and verify every recorded sha256. When the URL does not serve the recorded bytes
// (ed.gov answers 403 to scripted clients), each listed mirror is tried under the same hash check,
// then a checked-out repository copy, again only when its sha256 matches.
async function fetchRealCorpus(options = {}, dependencies = {}) {
  const corpus = loadRealCorpus(options.manifest || REAL_CORPUS_DEFAULT_MANIFEST, { corpusDir: options.corpusDir, selection: options.cases });
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  const hashOrNull = filename => { try { return fileHash(filename); } catch (_) { return null; } };
  const rows = [];
  for (const document of corpus.documents) {
    const row = { id: document.id, url: document.url, file: document.sourcePath, status: null };
    if (hashOrNull(document.sourcePath) === document.sha256) { rows.push({ ...row, status: 'present' }); continue; }
    fs.mkdirSync(path.dirname(document.sourcePath), { recursive: true });
    row.attempts = [];
    for (const [index, url] of [document.url, ...document.mirrors].entries()) {
      const attempt = { url, status: null };
      try {
        const response = await fetchImpl(url, { redirect: 'follow', headers: { 'user-agent': BROWSER_UA, accept: 'application/pdf,*/*;q=0.8' }, signal: AbortSignal.timeout(300000) });
        attempt.http = response.status;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const bytes = Buffer.from(await response.arrayBuffer());
        attempt.sha256 = sha(bytes);
        if (attempt.sha256 === document.sha256) { const temporary = document.sourcePath + '.part'; fs.writeFileSync(temporary, bytes); fs.renameSync(temporary, document.sourcePath); attempt.status = index ? 'mirror' : 'downloaded'; }
        else attempt.status = 'sha256-mismatch';
      } catch (error) { attempt.status = attempt.status || 'download-failed'; attempt.error = String(error && error.message || error).slice(0, 200); }
      row.attempts.push(attempt);
      if (['downloaded', 'mirror'].includes(attempt.status)) { row.status = attempt.status; row.source = url; break; }
    }
    if (!row.status) row.status = row.attempts[0].status;
    if (!['downloaded', 'mirror'].includes(row.status) && document.repoCopy && hashOrNull(path.join(ROOT, document.repoCopy)) === document.sha256) {
      fs.copyFileSync(path.join(ROOT, document.repoCopy), document.sourcePath);
      row.fallbackFrom = row.status; row.status = 'repo-copy';
    }
    rows.push(row);
  }
  return { kind: 'real-corpus-fetch', corpusId: corpus.corpusId, corpusDir: corpus.corpusDir, ok: rows.every(row => ['present', 'downloaded', 'mirror', 'repo-copy'].includes(row.status)), rows };
}
function parseArguments(argv) {
  const result = {};
  const flags = { '--mode': 'mode', '--manifest': 'manifest', '--cases': 'cases', '--trials': 'trials', '--timeout-ms': 'timeoutMs', '--budget-ms': 'budgetMs', '--out-dir': 'outDir',
    '--corpus-dir': 'corpusDir', '--engine': 'engine', '--pause-ms': 'pauseMs' };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--help') { result.help = true; continue; }
    const field = flags[argv[index]], value = argv[++index];
    if (!field || !value || value.startsWith('--')) throw new Error('Unknown option or missing value');
    if (result[field] !== undefined) throw new Error('Duplicate option: ' + field);
    result[field] = field === 'cases' ? value.split(',').filter(Boolean) : value;
  }
  return result;
}
if (require.main === module) {
  Promise.resolve().then(() => {
    // Child entry for the bounded, model-free Document Safety stage of --mode corpus.
    if (process.argv[2] === '--internal-safety-scan') return safetyScanFile(process.argv[3]).then(result => { process.stdout.write(JSON.stringify(result) + '\n'); if (!result.ok) process.exitCode = 1; });
    const options = parseArguments(process.argv.slice(2));
    if (options.help) { process.stdout.write('node dev-tools/benchmark_document_remediation.cjs [--mode plan|local|live] [--manifest path] [--cases id,id] [--trials 3] [--timeout-ms 120000] [--budget-ms 600000] [--out-dir empty-directory]\nDefault: plan only; local executes portable/scripted cases; live explicitly sends selected documents through existing MCP provider configuration.\n'
      + 'Real documents: --mode fetch [--manifest mcp-testing/corpus/real-corpus-2026-09-22.json] [--corpus-dir C:\\tmp\\remediation_corpus] downloads and sha256-checks the corpus;\n'
      + '--mode corpus [--manifest ...] [--corpus-dir ...] [--trials 1-3] [--engine auto|none] [--pause-ms 5000] --out-dir empty-directory runs every document through the connector\n'
      + '(model-free stages always; pdf_remediate when a model engine is configured, otherwise recorded as blocked) and writes scoreboard.md/.json/.html.\n'); return; }
    if (options.mode === 'render') { const board = renderCorpus(options); process.stdout.write(JSON.stringify({ kind: board.kind, complete: board.complete, completedDocTrials: board.completedDocTrials, atAGlance: board.atAGlance }, null, 2) + '\n'); return; }
    if (options.mode === 'fetch') return fetchRealCorpus(options).then(report => { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); if (!report.ok) process.exitCode = 1; });
    if (options.mode === 'corpus') return runCorpus(options).then(board => {
      process.stdout.write(JSON.stringify({ kind: board.kind, complete: board.complete, interruption: board.interruption, engine: board.engine.engine, engineAvailable: board.engine.available,
        completedDocTrials: board.completedDocTrials, plannedDocTrials: board.plannedDocTrials, outcomeCounts: board.outcomeCounts, streaks: board.streaks,
        topFailures: board.taxonomy.slice(0, 5).map(item => ({ key: item.key, count: item.count, severity: item.severity, suspectedLocation: item.suspectedLocation })) }, null, 2) + '\n');
      if (!board.complete) process.exitCode = 1;
    });
    return runBenchmark(options).then(report => { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); if (report.summary && (report.summary.failed || report.interruption || report.summary.completedTrials !== report.summary.plannedTrials)) process.exitCode = 1; });
  }).catch(error => { process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1; });
}
module.exports = { loadManifest, validateRunOptions, childEnvironment, modelConfiguration, timing, aggregate, summarizeTrial, buildReport, markdownReport, stableStringify, runBounded, runBenchmark, parseArguments,
  loadRealCorpus, validateCorpusOptions, corpusEngine, corpusChildEnvironment, loadSafetyScanner, safetyScanFile, summarizeSafetyScan, summarizeExtraction, summarizePdfUa, summarizeRemediation,
  classifyRemediateMessage, classifyCorpusRecord, corpusStreaks, trialConsistency, issuesOf, failureTaxonomy, locateFailure, categoryRates, buildScoreboard, scoreboardMarkdown, scoreboardHtml, runCorpus, fetchRealCorpus, renderCorpus,
  intakeCheck, NOT_CLAIMED, REMEDIATE_MESSAGE_CLASSES };