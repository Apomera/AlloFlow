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
function versions(environment = process.env) {
  const files = Object.fromEntries(VERSION_FILES.filter(filename => fs.existsSync(path.join(ROOT, filename))).map(filename => [filename, fileHash(path.join(ROOT, filename))]));
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return { node: process.version, platform: process.platform, architecture: process.arch,
    gitCommit: git.status === 0 ? git.stdout.trim() : null, files,
    promptBundleSha256: files['doc_pipeline_source.jsx'] || null,
    implementationSha256: sha(stableStringify(files)),
    modelConfiguration: { provider: 'Gemini via local MCP', model: environment.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
      fallbackModel: environment.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
      note: 'Configured identifiers, not proof of which fallback served an individual call; per-call provider versions are not exposed.' } };
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
function runBounded(command, args, { env, timeoutMs, signal, cwd = ROOT }) {
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
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 4 * 1024 * 1024) { error = 'output_limit_exceeded'; stop(); }
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
  return '# Document remediation benchmark\n\n' + report.mode + ' mode; ' + report.summary.completedTrials + '/' + report.summary.plannedTrials + ' trials; ' + report.summary.passed + ' passed.\n\n'
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
function parseArguments(argv) {
  const result = {};
  const flags = { '--mode': 'mode', '--manifest': 'manifest', '--cases': 'cases', '--trials': 'trials', '--timeout-ms': 'timeoutMs', '--budget-ms': 'budgetMs', '--out-dir': 'outDir' };
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
    const options = parseArguments(process.argv.slice(2));
    if (options.help) { process.stdout.write('node dev-tools/benchmark_document_remediation.cjs [--mode plan|local|live] [--manifest path] [--cases id,id] [--trials 3] [--timeout-ms 120000] [--budget-ms 600000] [--out-dir empty-directory]\nDefault: plan only; local executes portable/scripted cases; live explicitly sends selected documents through existing MCP provider configuration.\n'); return; }
    return runBenchmark(options).then(report => { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); if (report.summary && (report.summary.failed || report.interruption || report.summary.completedTrials !== report.summary.plannedTrials)) process.exitCode = 1; });
  }).catch(error => { process.stderr.write(String(error.stack || error) + '\n'); process.exitCode = 1; });
}
module.exports = { loadManifest, validateRunOptions, childEnvironment, timing, aggregate, summarizeTrial, buildReport, markdownReport, stableStringify, runBounded, runBenchmark, parseArguments };