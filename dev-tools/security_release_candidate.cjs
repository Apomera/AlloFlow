#!/usr/bin/env node
'use strict';

// Read-only verifier plus CI packaging. This module never publishes, commits, or
// pushes. A locally authored "passed" receipt is not release evidence.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const REPOSITORY = 'Apomera/AlloFlow';
const PRODUCER = 'release-candidate.yml';
const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const HOSTING = Object.freeze({ provider: 'cloudflare-pages', project: 'alloflow-cdn', branch: 'main', public: 'site' });
const REQUIRED = Object.freeze({
  'verify.yml': [
    'Documentation + promotion integrity', 'Remediation preservation (source + browser + export)',
    'Static gate (crash + load classes)', 'Adventure journey (choice + free response + debate)',
    'Native Node regressions', ...Array.from({ length: 8 }, (_, i) => `Unit tests (shard ${i + 1}/8)`),
    'Research integration contracts + accessibility', 'STEM plugin failure recovery (BLOCKING)',
    'Tagged-PDF goldens (BLOCKING)', 'veraPDF ISO 14289-1 ground-truth gate (independent validator)',
  ],
  'security-safeguards.yml': ['Security safeguards', 'Root and Firebase dependency compatibility (Node 22)'],
  [PRODUCER]: ['Build and test exact candidate', 'Attest exact candidate'],
});
const fail = message => { throw new Error('Release candidate blocked: ' + message); };
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const positive = value => Number.isSafeInteger(value) && value > 0;
const sourceSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const sourceRef = value => typeof value === 'string' && /^refs\/heads\/[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(value)
  && !value.includes('..') && !value.endsWith('/');
function execute(command, args, root) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  // Do not echo provider/tool stderr: it can contain private configuration.
  if (result.error || result.signal || result.status !== 0) fail(command + ' verification did not complete successfully');
  return String(result.stdout || '');
}
function context(options = {}, dependencies = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  return { root, run: dependencies.run || ((command, args) => execute(command, args, root)),
    now: dependencies.now || Date.now };
}
function json(text, label) { try { return JSON.parse(text); } catch (_) { fail(label + ' is not valid JSON'); } }
function api(ctx, endpoint) {
  return json(ctx.run('gh', ['api', '--hostname', 'github.com', 'repos/' + REPOSITORY + '/' + endpoint]), 'GitHub response');
}
function checkFresh(value, now, label) {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now + 300000 || now - time > MAX_AGE_MS) fail(label + ' is stale or has an invalid timestamp');
}
function latestRun(ctx, workflow, sha) {
  const result = api(ctx, 'actions/workflows/' + workflow + '/runs?head_sha=' + sha + '&per_page=100');
  if (!Number.isSafeInteger(result.total_count) || result.total_count < 1 || result.total_count > 100
      || !Array.isArray(result.workflow_runs) || result.workflow_runs.length !== result.total_count) fail(workflow + ' has missing or incomplete run evidence');
  const runs = result.workflow_runs.slice().sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt);
  const run = runs[0];
  if (!positive(run.id) || !positive(run.run_number) || !positive(run.run_attempt)
      || run.head_sha !== sha || run.head_repository?.full_name !== REPOSITORY
      || run.path !== '.github/workflows/' + workflow
      || run.status !== 'completed' || run.conclusion !== 'success') fail(workflow + ' latest exact-SHA run is absent, pending, skipped or red');
  checkFresh(run.updated_at, ctx.now(), workflow);
  const jobs = api(ctx, 'actions/runs/' + run.id + '/attempts/' + run.run_attempt + '/jobs?per_page=100');
  if (!Number.isSafeInteger(jobs.total_count) || jobs.total_count > 100 || !Array.isArray(jobs.jobs)
      || jobs.jobs.length !== jobs.total_count) fail(workflow + ' job evidence is incomplete');
  for (const name of REQUIRED[workflow]) {
    const matches = jobs.jobs.filter(job => job.name === name);
    if (matches.length !== 1 || matches[0].run_id !== run.id || matches[0].run_attempt !== run.run_attempt
        || matches[0].head_sha !== sha || matches[0].status !== 'completed' || matches[0].conclusion !== 'success') fail(workflow + ' required job did not pass: ' + name);
  }
  return { workflow, runId: run.id, runAttempt: run.run_attempt, sourceRef: 'refs/heads/' + run.head_branch };
}
function checkSource(ctx, expectedSha, clean = true) {
  noSymlinkAncestors(ctx.root);
  const actual = ctx.run('git', ['rev-parse', 'HEAD']).trim();
  if (!sourceSha(expectedSha) || actual !== expectedSha) fail('source SHA differs from the reviewed checkout');
  if (clean && ctx.run('git', ['status', '--porcelain=v1', '--untracked-files=no']).trim()) fail('tracked source/index changed after verification');
  return actual;
}
function safeRelative(name) {
  return typeof name === 'string' && name.length <= 500 && !/[\x00-\x1f\x7f\\:<>"|?*#%]/.test(name)
    && name.split('/').every(part => part && part !== '.' && part !== '..' && !part.endsWith('.') && !part.endsWith(' ')
      && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
    && name.startsWith('site/');
}
function deploymentControl(name) {
  return name.split('/').some(part => {
    const lower = part.toLowerCase();
    return ['_worker.js', '_worker.bundle', '_routes.json', 'functions', 'functions-filepath-routing-config.json',
      'wrangler.toml', 'wrangler.json', 'wrangler.jsonc', '.wrangler', '.assetsignore', '.cfignore', '.gitignore',
      '.ignore', '.git', '.hg', '.svn', 'node_modules', '.ds_store', 'firebase.json', '.firebaserc'].includes(lower)
      || /^\.env(?:\.|$)|^\.dev\.vars(?:\.|$)/.test(lower);
  });
}
function noSymlinkAncestors(target, allowMissing = false) {
  const absolute = path.resolve(target), root = path.parse(absolute).root;
  let current = root;
  for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (allowMissing && error.code === 'ENOENT') return absolute; throw error; }
    if (stat.isSymbolicLink()) fail('artifact or source path contains a symbolic-link ancestor');
  }
  return absolute;
}
function withinDirectory(target, directory) {
  const relative = path.relative(directory, target);
  return !relative || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}
function readSafeFile(file, maximum = MAX_FILE_BYTES) {
  noSymlinkAncestors(file);
  const before = fs.lstatSync(file);
  if (!before.isFile() || before.size > maximum) fail('artifact file exceeds the supported review bounds');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let bytes;
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) fail('artifact changed while opening');
    bytes = Buffer.allocUnsafe(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!read) fail('artifact changed while reading');
      offset += read;
    }
    if (fs.readSync(fd, Buffer.alloc(1), 0, 1, offset)) fail('artifact changed while reading');
  } finally { fs.closeSync(fd); }
  noSymlinkAncestors(file);
  const after = fs.lstatSync(file);
  if (!after.isFile() || after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs || bytes.length !== before.size) fail('artifact changed while reading');
  return bytes;
}
function inventoryTree(directory, initialPrefix) {
  const root = noSymlinkAncestors(directory), records = [], seen = new Set();
  const walk = (dir, prefix) => {
    if (fs.lstatSync(dir).isSymbolicLink()) fail('artifact contains a symbolic link');
    for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const relative = prefix + item.name, file = path.join(dir, item.name), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) fail('artifact contains a symbolic link');
      if (deploymentControl(relative)) fail('artifact contains an executable Pages or deployment-control path');
      if (prefix === '' && (item.name !== 'site' || !stat.isDirectory())) fail('artifact must contain only the site directory');
      if (stat.isDirectory()) {
        if ((prefix && !safeRelative(relative + '/_directory')) || seen.has(relative.toLowerCase())) fail('artifact contains an unsupported or ambiguous path');
        seen.add(relative.toLowerCase()); walk(file, relative + '/'); continue;
      }
      if (!stat.isFile() || !safeRelative(relative) || seen.has(relative.toLowerCase())) fail('artifact contains an unsupported or ambiguous path');
      seen.add(relative.toLowerCase());
      if (records.length >= MAX_FILES || stat.size > MAX_FILE_BYTES) fail('artifact exceeds the supported Cloudflare Pages review bounds');
      const bytes = readSafeFile(file);
      records.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
    }
  };
  walk(root, initialPrefix);
  return records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function inventory(directory) { return inventoryTree(directory, ''); }
function inventorySite(directory) { return inventoryTree(directory, 'site/'); }
function requireHostedFiles(actual) {
  if (!['site/index.html', 'site/app/index.html', 'site/app/sw.js'].every(name => actual.some(entry => entry.path === name))
      || !actual.some(entry => /^site\/[^/]*_module\.js$/.test(entry.path))) fail('Cloudflare hosting artifact is incomplete');
}
function checkPayload(payload, expected) {
  if (!Array.isArray(expected) || !expected.length || expected.length > MAX_FILES) fail('artifact manifest is missing or exceeds Cloudflare Pages bounds');
  const actual = inventory(payload);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('artifact bytes, paths or sizes differ from the attested manifest');
  requireHostedFiles(actual);
  return actual.length;
}
function validateManifest(manifest, now) {
  if (!manifest || manifest.schemaVersion !== 2 || manifest.repository !== REPOSITORY || !sourceSha(manifest.sourceSha)
      || !sourceRef(manifest.sourceRef) || !positive(manifest.producer?.runId) || !positive(manifest.producer?.runAttempt)
      || !Array.isArray(manifest.checks) || manifest.checks.length !== 2) fail('manifest identity is invalid');
  if (!manifest.hosting || Object.keys(manifest.hosting).sort().join() !== Object.keys(HOSTING).sort().join()
      || Object.keys(HOSTING).some(key => manifest.hosting[key] !== HOSTING[key])) fail('hosting identity differs from the reviewed Cloudflare Pages target');
  checkFresh(manifest.createdAt, now, 'candidate');
  for (const workflow of Object.keys(REQUIRED).filter(name => name !== PRODUCER)) {
    const checks = manifest.checks.filter(check => check.workflow === workflow);
    if (checks.length !== 1 || !positive(checks[0].runId) || !positive(checks[0].runAttempt)) fail('required check provenance is missing');
  }
}
function verifyCandidate(options, dependencies = {}) {
  const ctx = context(options, dependencies);
  if (!options.manifest || !options.payload) fail('provide the CI-signed manifest and downloaded payload; local test summaries are not sufficient');
  const manifestPath = path.resolve(options.manifest), raw = readSafeFile(manifestPath, 32 * 1024 * 1024);
  const manifest = json(raw.toString('utf8'), 'candidate manifest');
  validateManifest(manifest, ctx.now());
  checkSource(ctx, manifest.sourceSha);
  const verified = json(ctx.run('gh', ['attestation', 'verify', manifestPath, '--hostname', 'github.com', '--repo', REPOSITORY,
    '--signer-workflow', REPOSITORY + '/.github/workflows/' + PRODUCER, '--signer-digest', manifest.sourceSha,
    '--source-digest', manifest.sourceSha, '--source-ref', manifest.sourceRef, '--deny-self-hosted-runners', '--format', 'json']), 'attestation verification');
  const invocation = 'https://github.com/' + REPOSITORY + '/actions/runs/' + manifest.producer.runId + '/attempts/' + manifest.producer.runAttempt;
  if (!Array.isArray(verified) || !verified.some(result => {
    const proof = result.verificationResult;
    return proof?.signature?.certificate?.runInvocationURI === invocation
      && proof.statement?.subject?.some(subject => subject.digest?.sha256 === sha256(raw));
  })) fail('signed provenance does not bind this manifest to its exact producer attempt');
  for (const check of manifest.checks) {
    const current = latestRun(ctx, check.workflow, manifest.sourceSha);
    if (current.runId !== check.runId || current.runAttempt !== check.runAttempt) fail(check.workflow + ' evidence was superseded by another run or attempt');
  }
  const producer = latestRun(ctx, PRODUCER, manifest.sourceSha);
  if (producer.runId !== manifest.producer.runId || producer.runAttempt !== manifest.producer.runAttempt
      || producer.sourceRef !== manifest.sourceRef) fail('producer identity or attempt no longer matches');
  const files = checkPayload(options.payload, manifest.files);
  if (!readSafeFile(manifestPath, 32 * 1024 * 1024).equals(raw)) fail('manifest changed while verifying');
  checkSource(ctx, manifest.sourceSha);
  return { sourceSha: manifest.sourceSha, manifestSha256: sha256(raw), files, manifest };
}
function collectChecks(options, dependencies = {}) {
  const ctx = context(options, dependencies);
  checkSource(ctx, options.sha, false);
  return Object.keys(REQUIRED).filter(name => name !== PRODUCER).map(workflow => latestRun(ctx, workflow, options.sha));
}
function createCandidate(options, dependencies = {}) {
  const ctx = context(options, dependencies), env = dependencies.env || process.env;
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || env.GITHUB_WORKFLOW_REF !== REPOSITORY + '/.github/workflows/' + PRODUCER + '@' + env.GITHUB_REF
      || !sourceRef(env.GITHUB_REF) || !sourceSha(env.GITHUB_SHA) || !positive(Number(env.GITHUB_RUN_ID)) || !positive(Number(env.GITHUB_RUN_ATTEMPT))) fail('candidate packaging must run in the reviewed CI workflow');
  checkSource(ctx, env.GITHUB_SHA, false);
  const checks = collectChecks({ root: ctx.root, sha: env.GITHUB_SHA }, dependencies);
  const output = path.resolve(options.output || ''), build = noSymlinkAncestors(path.join(ctx.root, 'desktop/web-app/public'));
  if (!options.output || fs.existsSync(output) || output === ctx.root || withinDirectory(output, build)) fail('candidate output must be a new separate directory');
  noSymlinkAncestors(output, true);
  // Inventory the complete hosted tree before copying, using the same site/
  // contract without materialising a second input directory.
  const sourceFiles = inventorySite(build);
  requireHostedFiles(sourceFiles);
  fs.mkdirSync(path.join(output, 'payload'), { recursive: true });
  noSymlinkAncestors(build); noSymlinkAncestors(path.join(output, 'payload'));
  fs.cpSync(build, path.join(output, 'payload/site'), { recursive: true, dereference: false });
  const files = inventory(path.join(output, 'payload'));
  if (JSON.stringify(sourceFiles) !== JSON.stringify(files)) fail('complete hosted source changed while copying');
  if (JSON.stringify(inventorySite(build)) !== JSON.stringify(sourceFiles)) fail('complete hosted source changed during packaging');
  checkPayload(path.join(output, 'payload'), files);
  const manifest = { schemaVersion: 2, repository: REPOSITORY, sourceSha: env.GITHUB_SHA, sourceRef: env.GITHUB_REF, hosting: { ...HOSTING },
    producer: { runId: Number(env.GITHUB_RUN_ID), runAttempt: Number(env.GITHUB_RUN_ATTEMPT) },
    createdAt: new Date(ctx.now()).toISOString(), checks, files };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}
function stageCandidate(options, dependencies = {}) {
  const result = verifyCandidate(options, dependencies);
  const tempRoot = fs.realpathSync(os.tmpdir()); noSymlinkAncestors(tempRoot);
  const stage = fs.mkdtempSync(path.join(tempRoot, 'alloflow-verified-release-'));
  const payload = path.join(stage, 'payload'), manifest = path.join(stage, 'manifest.json');
  noSymlinkAncestors(options.payload); noSymlinkAncestors(options.manifest); noSymlinkAncestors(stage);
  fs.cpSync(path.resolve(options.payload), payload, { recursive: true, dereference: false });
  fs.copyFileSync(path.resolve(options.manifest), manifest);
  if (sha256(fs.readFileSync(manifest)) !== result.manifestSha256) fail('manifest changed while staging');
  checkPayload(payload, result.manifest.files);
  return stage;
}
function selftest() {
  const assert = require('node:assert/strict');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-candidate-selftest-'));
  try {
    fs.mkdirSync(path.join(directory, 'site/app'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'site/index.html'), '<title>Inert selftest</title>');
    fs.writeFileSync(path.join(directory, 'site/app/index.html'), '<title>Inert app selftest</title>');
    fs.writeFileSync(path.join(directory, 'site/app/sw.js'), '// inert service-worker fixture');
    fs.writeFileSync(path.join(directory, 'site/fixture_module.js'), '// inert module fixture');
    const files = inventory(directory);
    assert.equal(checkPayload(directory, files), 4);
    fs.appendFileSync(path.join(directory, 'site/index.html'), 'changed');
    assert.throws(() => checkPayload(directory, files), /artifact bytes/);
    assert.throws(() => validateManifest({ schemaVersion: 1 }, Date.now()), /identity/);
    const sha = 'a'.repeat(40), run = { id: 1, run_number: 1, run_attempt: 1, head_sha: sha,
      head_repository: { full_name: REPOSITORY }, path: '.github/workflows/verify.yml', status: 'completed', conclusion: 'failure' };
    const ctx = { now: Date.now, run: () => JSON.stringify({ total_count: 1, workflow_runs: [run] }) };
    assert.throws(() => latestRun(ctx, 'verify.yml', sha), /red/);
    return { checks: 4, publicationAuthorized: false };
  } finally {
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('alloflow-candidate-selftest-')) fail('unexpected selftest cleanup target');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
function main(args = process.argv.slice(2)) {
  const [command, ...flags] = args, options = {};
  for (const flag of flags) {
    const match = /^--(manifest|payload|sha|output|root)=(.+)$/.exec(flag);
    if (!match || Object.hasOwn(options, match[1])) fail('invalid or duplicate argument');
    options[match[1]] = match[2];
  }
  if (command === '--selftest' && flags.length === 0) { selftest(); console.log('Release candidate selftest passed (synthetic only; no publication authority).'); }
  else if (command === 'verify') { const result = verifyCandidate(options); console.log('Verified exact source ' + result.sourceSha + ' and ' + result.files + ' artifact files.'); }
  else if (command === 'verified-source') console.log(verifyCandidate(options).sourceSha);
  else if (command === 'stage') console.log(stageCandidate(options));
  else if (command === 'check-ci') { collectChecks(options); console.log('Required exact-SHA CI checks passed.'); }
  else if (command === 'create') { createCandidate(options); console.log('Candidate manifest created; signing and final verification remain required.'); }
  else fail('use verify, verified-source, stage, check-ci, or create; legacy combined build/publish is disabled');
}
module.exports = { REPOSITORY, PRODUCER, REQUIRED, MAX_AGE_MS, MAX_FILES, MAX_FILE_BYTES, HOSTING,
  safeRelative, deploymentControl, noSymlinkAncestors, readSafeFile, inventory, inventorySite, checkPayload, latestRun, validateManifest,
  verifyCandidate, collectChecks, createCandidate, stageCandidate, selftest, main };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 2; } }
