import { afterAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const DRIVER_PATH = resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs');
const Driver = requireCjs(DRIVER_PATH);
const source = readFileSync(SERVER, 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'alloflow-durable-jobs-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, `missing source marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing source marker after ${start}: ${end}`).toBeGreaterThan(from);
  return source.slice(from, to);
}

function expectInOrder(text, markers) {
  let prior = -1;
  for (const marker of markers) {
    const current = text.indexOf(marker);
    expect(current, `missing or out-of-order marker: ${marker}`).toBeGreaterThan(prior);
    prior = current;
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function jsonSha256(value) {
  return sha256(Buffer.from(JSON.stringify(value), 'utf8'));
}

function currentEngineDigest(env) {
  const hash = createHash('sha256');
  hash.update('alloflow-desktop-checkpoint-engine-abi:1\n');
  const vendorBesideServer = join(dirname(SERVER), 'vendor', 'manifest.json');
  const vendorManifest = existsSync(vendorBesideServer)
    ? vendorBesideServer
    : join(Driver.ASSETS_ROOT, 'vendor', 'manifest.json');
  const files = [
    SERVER,
    DRIVER_PATH,
    ...Driver.MODULE_FILES.map((name) => join(Driver.ASSETS_ROOT, name)),
    vendorManifest,
  ];
  for (const file of files) {
    const bytes = readFileSync(file);
    hash.update(`${basename(file)}\u0000${bytes.length}\u0000`);
    hash.update(sha256(bytes));
    hash.update('\n');
  }
  let normalizedBase = env.ALLOFLOW_MCP_GEMINI_BASE;
  try { normalizedBase = new URL(normalizedBase).toString(); } catch (_) {}
  hash.update(jsonSha256({
    geminiBase: normalizedBase,
    geminiModel: env.ALLOFLOW_MCP_GEMINI_MODEL,
    geminiFallbackModel: env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL,
  }));
  return hash.digest('hex');
}

const remediationOptions = Object.freeze({
  targetScore: 95,
  fixPasses: 2,
  polishPasses: 0,
  taggedPdf: true,
  autoContinue: false,
  autoContinueRounds: 3,
  validateUa: false,
  ocrLanguage: '',
  maxRunMinutes: 30,
});

function remediationOptionsDigest(options = remediationOptions) {
  return jsonSha256({
    targetScore: options.targetScore,
    fixPasses: options.fixPasses,
    polishPasses: options.polishPasses,
    taggedPdf: options.taggedPdf,
    autoContinue: options.autoContinue,
    autoContinueRounds: options.autoContinueRounds,
    validateUa: options.validateUa,
    ocrLanguage: options.ocrLanguage,
    maxRunMinutes: options.maxRunMinutes,
  });
}

function inputIdentityDigest(file) {
  const stat = statSync(file);
  return jsonSha256([{ file, sizeBytes: stat.size, modifiedMs: Math.trunc(stat.mtimeMs) }]);
}

function makePdf(root, label) {
  const file = join(root, `${label}.pdf`);
  writeFileSync(file, `%PDF-1.4\n${label}\n%%EOF\n`);
  return file;
}

function baseRecord({
  jobId,
  kind = 'pdf_remediate',
  file,
  outDir,
  engineSha256,
  createdAt,
  attemptNumber = 7,
  options = remediationOptions,
  skipExisting = false,
  meta = null,
  fileRows = [],
}) {
  const optionsSha256 = kind === 'pdf_batch_audit'
    ? jsonSha256({ kind, ocrLanguage: options.ocrLanguage || '', maxRunMinutes: options.maxRunMinutes })
    : remediationOptionsDigest(options);
  const identity = inputIdentityDigest(file);
  const execution = {
    schema: 1,
    kind,
    files: [file],
    outDir,
    options: { ...options },
    skipExisting,
    meta,
    inputIdentitySha256: identity,
    optionsSha256,
    engineSha256,
  };
  const oldAttemptId = `old-${jobId}`;
  const startedAt = new Date(Date.parse(createdAt) + 1000).toISOString();
  return {
    schema: 3,
    jobId,
    kind,
    input: kind === 'pdf_remediate'
      ? { file, outputDir: outDir }
      : { dir: meta.dir, files: 1, outputDir: outDir },
    status: 'running',
    createdAt,
    startedAt,
    finishedAt: null,
    logLines: ['00:00:00 persisted before simulated restart'],
    progress: null,
    result: null,
    error: null,
    cancelRequested: false,
    execution,
    inputIdentitySha256: identity,
    inputSha256: null,
    optionsSha256,
    engineSha256,
    attemptId: oldAttemptId,
    attemptNumber,
    attemptStartedAt: startedAt,
    runStage: 'working',
    checkpoint: null,
    currentFile: {
      file,
      inputSha256: sha256(readFileSync(file)),
      optionsSha256,
      engineSha256,
    },
    fileRows,
    persistedAt: startedAt,
  };
}

function writeRecord(stateDir, record) {
  writeFileSync(join(stateDir, `${record.jobId}.json`), JSON.stringify(record, null, 2));
}

function writeCompletionProof(record, variant = 'valid') {
  const { files: [file], outDir } = record.execution;
  mkdirSync(outDir, { recursive: true });
  const stem = basename(file, '.pdf');
  const reportPath = join(outDir, `${stem}-remediation-report.json`);
  const manifestPath = join(outDir, `${stem}-remediation-completion.json`);
  const summary = {
    input: file,
    verdict: 'PASS',
    afterScore: 99,
    files: { report: reportPath, completionManifest: manifestPath },
  };
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  const reportBytes = readFileSync(reportPath);
  const sourceBytes = readFileSync(file);
  const artifact = {
    role: 'report',
    relativePath: basename(reportPath),
    sizeBytes: reportBytes.length,
    sha256: sha256(reportBytes),
  };
  const manifest = {
    schema: 1,
    kind: 'alloflow-remediation-completion',
    source: { path: file, sizeBytes: sourceBytes.length, sha256: sha256(sourceBytes) },
    compatibility: {
      optionsSha256: record.optionsSha256,
      engineSha256: record.engineSha256,
    },
    attempt: { jobId: record.jobId, attemptId: record.attemptId, attemptNumber: record.attemptNumber },
    completedAt: new Date().toISOString(),
    artifacts: [artifact],
  };
  if (variant === 'artifact-hash') manifest.artifacts[0].sha256 = 'd'.repeat(64);
  if (variant === 'traversal') manifest.artifacts[0].relativePath = '../outside-report.json';
  if (variant === 'source-hash') manifest.source.sha256 = 'e'.repeat(64);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { reportPath, manifestPath, summary };
}

function protocolClient(env) {
  const child = spawn(process.execPath, [SERVER], {
    cwd: process.cwd(),
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let nextId = 1;
  let stdout = '';
  let stderr = '';
  const pending = new Map();
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    let newline;
    while ((newline = stdout.indexOf('\n')) !== -1) {
      const line = stdout.slice(0, newline);
      stdout = stdout.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch (_) { continue; }
      if (message.id === undefined) continue;
      const resolver = pending.get(message.id);
      if (resolver) {
        pending.delete(message.id);
        resolver.resolve(message);
      }
    }
  });
  child.on('exit', (code) => {
    for (const entry of pending.values()) {
      entry.reject(new Error(`desktop MCP exited with ${code}: ${stderr}`));
    }
    pending.clear();
  });
  return {
    child,
    stderr: () => stderr,
    request(method, params) {
      const id = nextId++;
      return new Promise((resolveRequest, rejectRequest) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          rejectRequest(new Error(`timeout waiting for ${method}: ${stderr}`));
        }, 20000);
        pending.set(id, {
          resolve(message) { clearTimeout(timer); resolveRequest(message); },
          reject(error) { clearTimeout(timer); rejectRequest(error); },
        });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    async close() {
      if (child.exitCode === null) child.kill();
    },
  };
}

async function tool(client, name, args) {
  const reply = await client.request('tools/call', { name, arguments: args });
  if (reply.error) throw new Error(reply.error.message);
  return reply.result.structuredContent;
}

async function waitForTerminal(client, jobId) {
  const terminal = new Set(['completed', 'failed', 'cancelled', 'interrupted']);
  for (let attempt = 0; attempt < 200; attempt++) {
    const status = await tool(client, 'remediation_job_status', { job_id: jobId });
    if (terminal.has(status.status)) return status;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`job ${jobId} did not reach a terminal state`);
}

describe('desktop MCP durable-job source contracts', () => {
  it('captures an immutable execution capsule in all four background start handlers', () => {
    const handlers = [
      ['pdf_remediate_start(args)', 'pdf_batch_audit_start(args)', 'pdf_remediate'],
      ['pdf_batch_audit_start(args)', 'pdf_batch_remediate_start(args)', 'pdf_batch_audit'],
      ['pdf_batch_remediate_start(args)', 'pdf_remediate_from_scoreboard_start(args)', 'pdf_batch_remediate'],
      ['pdf_remediate_from_scoreboard_start(args)', 'remediation_job_status(args)', 'pdf_remediate_from_scoreboard'],
    ];
    for (const [start, end, kind] of handlers) {
      const handler = section(start, end);
      expect(handler).toContain('const execution = storedExecution(');
      expect(handler).toContain(`'${kind}'`);
      expect(handler).toMatch(/const job = newJob\([\s\S]*?execution[\s\S]*?\);/);
      expect(handler).toContain('enqueueJob(job, runnerForStoredJob);');
    }
  });

  it('requeues restored jobs FIFO and fences every run with a newly persisted attempt', () => {
    const enqueue = section('function enqueueJob(job, runner)', 'const JOB_NOT_FOUND');
    expectInOrder(enqueue, [
      "job.status = 'running';",
      'job.startedAt = job.startedAt || attemptStartedAt;',
      'job.attemptNumber = Math.max(0, Number(job.attemptNumber) || 0) + 1;',
      'job.attemptId = crypto.randomUUID();',
      'job.attemptStartedAt = attemptStartedAt;',
      "job.runStage = 'starting';",
      'persistJob(job, { required: true });',
      'job.result = await withSingleFlight(job.kind, () => runner(job));',
    ]);
    const bootstrap = source.slice(source.lastIndexOf('restoreJobs();'));
    expectInOrder(bootstrap, [
      'restoreJobs();',
      'RESTORED_TO_REQUEUE.sort(',
      'Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0)',
      'RESTORED_TO_REQUEUE.splice(0)',
      'enqueueJob(restoredJob, runnerForStoredJob);',
    ]);
  });

  it('validates stored input, options, and engine identities before resuming work', () => {
    const validator = section('function storedExecutionIsValid(', 'function recordCanResume(');
    expect(validator).toContain('execution.schema !== JOB_EXECUTION_SCHEMA');
    expect(validator).toContain('execution.kind !== kind');
    expect(validator).toContain('execution.files.every((file) => typeof file === \'string\' && path.isAbsolute(file))');
    expect(validator).toContain("typeof execution.outDir !== 'string' || !path.isAbsolute(execution.outDir)");
    const prepare = section('async function prepareStoredExecution(job)', 'function resolveOutputDir(');
    expect(prepare).toContain('expectedOptionsSha256 !== job.optionsSha256');
    expect(prepare).toContain('expectedOptionsSha256 !== execution.optionsSha256');
    expect(prepare).toContain('currentInputIdentitySha256 !== job.inputIdentitySha256');
    expect(prepare).toContain('currentInputIdentitySha256 !== execution.inputIdentitySha256');
    expect(prepare).toContain('const currentEngineSha256 = checkpointEngineDigest();');
    expect(prepare).toContain("job.restoredFromStatus === 'queued'");
    expect(prepare).toContain('job.inputSha256 && job.inputSha256 !== inputSha256');
  });

  it('binds completion proofs to the source, compatibility digests, artifact hashes, and output root', () => {
    const validate = section('async function validateCompletionManifest(', 'async function findValidCompletionManifest(');
    expect(validate).toContain("hasExactKeys(manifest.source, ['path', 'sizeBytes', 'sha256'])");
    expect(validate).toContain('path.resolve(manifest.source.path) !== filePath');
    expect(validate).toContain('manifest.source.sha256 !== compatibility.inputSha256');
    expect(validate).toContain('sourceStat.size !== manifest.source.sizeBytes');
    expect(validate).toContain('manifest.compatibility.optionsSha256 !== compatibility.optionsSha256');
    expect(validate).toContain('manifest.compatibility.engineSha256 !== compatibility.engineSha256');
    expect(validate).toContain("relative.startsWith('..' + path.sep)");
    expect(validate).toContain('await sha256File(resolved) !== artifact.sha256');
    expect(validate).toContain("path.resolve(summary.files.completionManifest || '') !== path.resolve(manifestPath)");
  });

  it('checks verified manifests and journals before consulting the Gemini key', () => {
    const single = section('async function runnerForStoredJob(job)', '\nconst TOOLS = [');
    expectInOrder(single, [
      'await findValidCompletionManifest(',
      'if (proof) return proof.summary;',
      'requireGeminiKey();',
    ]);
    const batch = section('async function runRemediateBatch(', '// Output path for the HTML-in/HTML-out tools.');
    expectInOrder(batch, [
      "committedFileRow(j, 'remediation'",
      'if (committed)',
      'await findValidCompletionManifest(',
      'if (proof)',
      'requireGeminiKey();',
    ]);
    const audit = section('async function runAuditBatch(', 'async function remediateOneFile(');
    expectInOrder(audit, [
      "committedFileRow(j, 'audit'",
      'if (committed)',
      'const priorRow = prior.get(file);',
      'requireGeminiKey();',
    ]);
  });

  it('marks compatibility-unsafe work interrupted rather than silently restarting it', () => {
    const restore = section('function restoreJobs()', 'function newJob(');
    expect(restore).toContain("rec.status = 'interrupted';");
    expect(restore).toContain('if (!resumable) removeLocalCheckpointFiles(rec.jobId);');
    const enqueue = section('function enqueueJob(job, runner)', 'const JOB_NOT_FOUND');
    expect(enqueue).toContain('else if (e && e.interrupted)');
    expect(enqueue).toContain("job.status = 'interrupted';");
    const runner = section('async function runnerForStoredJob(job)', '\nconst TOOLS = [');
    expect(runner).toContain("throw unsafeResume('checkpoint_engine_changed_since_job_started')");
    expect(runner).toContain("throw unsafeResume('running_file_has_no_valid_checkpoint_or_completion_manifest')");
  });
});

describe('desktop MCP durable-job restart behavior', () => {
  it('recovers verified work keylessly, preserves FIFO, and rejects tampered or incompatible state', async () => {
    const root = join(scratch, 'restart');
    const stateDir = join(root, 'state');
    const inputs = join(root, 'inputs');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(inputs, { recursive: true });
    const env = {
      ...process.env,
      ALLOFLOW_MCP_STATE_DIR: stateDir,
      ALLOFLOW_MCP_ALLOWED_ROOTS: root,
      ALLOFLOW_MCP_NO_KEY_FILES: '1',
      ALLOFLOW_MCP_MAX_RUN_MINUTES: '30',
      ALLOFLOW_MCP_GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
      ALLOFLOW_MCP_GEMINI_MODEL: 'gemini-3-flash-preview',
      ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: 'gemini-2.5-flash-lite',
    };
    delete env.GEMINI_API_KEY;
    const engineSha256 = currentEngineDigest(env);
    const now = Date.now();
    const records = [];
    const add = (jobId, label, ageMs, overrides = {}) => {
      const file = makePdf(inputs, label);
      const outDir = join(root, 'outputs', label);
      mkdirSync(outDir, { recursive: true });
      const record = baseRecord({
        jobId,
        file,
        outDir,
        engineSha256,
        createdAt: new Date(now - ageMs).toISOString(),
        ...overrides,
      });
      records.push(record);
      return record;
    };

    // Reverse lexical ids make directory enumeration the opposite of the required creation FIFO.
    const first = add('rjob-ffffffff-1111-4111-8111-111111111111', 'fifo-first', 120000);
    const second = add('rjob-00000000-2222-4222-8222-222222222222', 'fifo-second', 110000);
    writeCompletionProof(first);
    writeCompletionProof(second);

    const auditFile = makePdf(inputs, 'audit-journal');
    const auditOut = join(root, 'outputs', 'audit-journal');
    mkdirSync(auditOut, { recursive: true });
    const auditOptions = { ocrLanguage: '', maxRunMinutes: 30 };
    const audit = baseRecord({
      jobId: 'rjob-33333333-3333-4333-8333-333333333333',
      kind: 'pdf_batch_audit',
      file: auditFile,
      outDir: auditOut,
      engineSha256,
      createdAt: new Date(now - 100000).toISOString(),
      options: auditOptions,
      skipExisting: false,
      meta: { dir: inputs },
    });
    audit.fileRows = [{
      kind: 'audit',
      file: auditFile,
      inputSha256: sha256(readFileSync(auditFile)),
      optionsSha256: audit.optionsSha256,
      engineSha256,
      committedAt: new Date().toISOString(),
      result: {
        file: auditFile,
        ok: true,
        inputSha256: sha256(readFileSync(auditFile)),
        optionsSha256: audit.optionsSha256,
        engineSha256,
        score: 96,
        issueCounts: {},
      },
    }];
    records.push(audit);

    const badHash = add('rjob-44444444-4444-4444-8444-444444444444', 'bad-artifact-hash', 90000);
    writeCompletionProof(badHash, 'artifact-hash');
    const traversal = add('rjob-55555555-5555-4555-8555-555555555555', 'traversal', 80000);
    writeCompletionProof(traversal, 'traversal');
    const badSource = add('rjob-66666666-6666-4666-8666-666666666666', 'bad-source', 70000);
    writeCompletionProof(badSource, 'source-hash');
    const badOptions = add('rjob-77777777-7777-4777-8777-777777777777', 'bad-options', 60000);
    badOptions.optionsSha256 = 'a'.repeat(64);
    const badIdentity = add('rjob-88888888-8888-4888-8888-888888888888', 'bad-identity', 50000);
    badIdentity.inputIdentitySha256 = 'b'.repeat(64);
    badIdentity.execution.inputIdentitySha256 = 'b'.repeat(64);
    const badEngine = add('rjob-99999999-9999-4999-8999-999999999999', 'bad-engine', 40000);
    badEngine.engineSha256 = 'c'.repeat(64);
    badEngine.execution.engineSha256 = 'c'.repeat(64);

    for (const record of records) writeRecord(stateDir, record);

    const client = protocolClient(env);
    try {
      const initialized = await client.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'durable-restart-test', version: '1' },
      });
      expect(initialized.result.serverInfo.name).toBe('alloflow-remediation');

      const statuses = new Map();
      for (const record of records) {
        statuses.set(record.jobId, await waitForTerminal(client, record.jobId));
      }
      expect(statuses.get(first.jobId).status).toBe('completed');
      expect(statuses.get(second.jobId).status).toBe('completed');
      expect(statuses.get(audit.jobId).status).toBe('completed');

      const firstResult = await tool(client, 'remediation_job_result', { job_id: first.jobId });
      expect(firstResult.result).toMatchObject({ input: first.execution.files[0], afterScore: 99 });
      const auditResult = await tool(client, 'remediation_job_result', { job_id: audit.jobId });
      expect(auditResult.result).toMatchObject({ requested: 1, audited: 0, skipped: 1 });

      for (const record of [badHash, traversal, badSource]) {
        const status = statuses.get(record.jobId);
        expect(status.status).toBe('interrupted');
        expect(status.error).toBe('running_file_has_no_valid_checkpoint_or_completion_manifest');
      }
      expect(statuses.get(badOptions.jobId)).toMatchObject({
        status: 'interrupted', error: 'stored_options_digest_mismatch',
      });
      expect(statuses.get(badIdentity.jobId)).toMatchObject({
        status: 'interrupted', error: 'stored_input_identity_mismatch',
      });
      expect(statuses.get(badEngine.jobId)).toMatchObject({
        status: 'interrupted', error: 'checkpoint_engine_changed_since_job_started',
      });

      const savedFirst = JSON.parse(readFileSync(join(stateDir, `${first.jobId}.json`), 'utf8'));
      const savedSecond = JSON.parse(readFileSync(join(stateDir, `${second.jobId}.json`), 'utf8'));
      expect(savedFirst.startedAt).toBe(first.startedAt);
      expect(savedSecond.startedAt).toBe(second.startedAt);
      expect(savedFirst.attemptNumber).toBe(first.attemptNumber + 1);
      expect(savedSecond.attemptNumber).toBe(second.attemptNumber + 1);
      expect(savedFirst.attemptId).not.toBe(first.attemptId);
      expect(savedSecond.attemptId).not.toBe(second.attemptId);
      expect(savedFirst.finishedAt <= savedSecond.attemptStartedAt).toBe(true);
      expect(client.stderr()).not.toContain('GEMINI_API_KEY is not set');
    } finally {
      await client.close();
    }
  }, 60000);
});
