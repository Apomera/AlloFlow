import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.ALLOFLOW_CANDIDATE_ROOT || path.resolve('.');
const gate = require(path.join(ROOT, 'dev-tools/security_release_candidate.cjs'));
// yaml is an exact direct web-app dependency installed by the existing unit CI.
// Security-policy tests run separately where their nested dependencies exist.
const YAML = require(path.resolve('desktop/web-app/node_modules/yaml'));
const SHA = 'a'.repeat(40), NOW = Date.parse('2026-11-01T12:00:00Z');
const roots = [];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
afterEach(() => {
  while (roots.length) {
    const root = roots.pop();
    if (!root.startsWith(path.resolve(os.tmpdir()) + path.sep) || !/^alloflow-(?:candidate-test|verified-release)-/.test(path.basename(root))) throw new Error('Unsafe fixture cleanup');
    fs.rmSync(root, { recursive: true, force: true });
  }
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-candidate-test-')); roots.push(root);
  const payload = path.join(root, 'payload'), manifestPath = path.join(root, 'manifest.json');
  fs.mkdirSync(path.join(payload, 'site/app'), { recursive: true });
  fs.writeFileSync(path.join(payload, 'site/index.html'), '<!doctype html><title>Synthetic candidate</title>');
  fs.writeFileSync(path.join(payload, 'site/app.js'), '// inert synthetic fixture');
  fs.writeFileSync(path.join(payload, 'site/app/index.html'), '<!doctype html><title>Synthetic student shell</title>');
  fs.writeFileSync(path.join(payload, 'site/app/sw.js'), '// inert synthetic student worker');
  fs.writeFileSync(path.join(payload, 'site/fixture_module.js'), '// inert root public module');
  const workflows = Object.keys(gate.REQUIRED), runs = {}, jobs = {};
  workflows.forEach((workflow, index) => {
    const id = index + 100;
    runs[workflow] = { total_count: 1, workflow_runs: [{ id, run_number: 40, run_attempt: 2, head_sha: SHA,
      head_repository: { full_name: gate.REPOSITORY }, path: '.github/workflows/' + workflow,
      head_branch: 'candidate', status: 'completed', conclusion: 'success', updated_at: new Date(NOW).toISOString() }] };
    jobs[id] = { total_count: gate.REQUIRED[workflow].length, jobs: gate.REQUIRED[workflow].map(name => ({ name, run_id: id,
      run_attempt: 2, head_sha: SHA, status: 'completed', conclusion: 'success' })) };
  });
  const manifest = { schemaVersion: 2, repository: gate.REPOSITORY, sourceSha: SHA, sourceRef: 'refs/heads/candidate',
    hosting: { provider: 'cloudflare-pages', project: 'alloflow-cdn', branch: 'main', public: 'site' },
    producer: { runId: 102, runAttempt: 2 }, createdAt: new Date(NOW).toISOString(),
    checks: workflows.filter(name => name !== gate.PRODUCER).map((workflow, i) => ({ workflow, runId: 100 + i, runAttempt: 2 })),
    files: gate.inventory(payload) };
  const save = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest)); save();
  const calls = [], state = { head: SHA, dirty: '', signature: true, invocation: 'https://github.com/Apomera/AlloFlow/actions/runs/102/attempts/2' };
  // No subprocess implementation is reachable in this harness. Every command is
  // an exact read-only git/gh stub; any publisher/commit/push would throw.
  const run = (command, args) => {
    calls.push({ command, args });
    if (command === 'git' && args.join(' ') === 'rev-parse HEAD') return state.head;
    if (command === 'git' && args[0] === 'status') return state.dirty;
    if (command === 'gh' && args[0] === 'attestation') {
      if (!state.signature) throw new Error('Synthetic invalid signature');
      return JSON.stringify([{ verificationResult: { signature: { certificate: { runInvocationURI: state.invocation } },
        statement: { subject: [{ digest: { sha256: hash(fs.readFileSync(args[2])) } }] } } }]);
    }
    if (command === 'gh' && args[0] === 'api') {
      const endpoint = args[3];
      const workflow = /workflows\/([^/]+)\/runs\?/.exec(endpoint);
      if (workflow) return JSON.stringify(runs[workflow[1]]);
      const attempt = /runs\/(\d+)\/attempts\/(\d+)\/jobs/.exec(endpoint);
      if (attempt) return JSON.stringify(jobs[attempt[1]]);
    }
    throw new Error('Unapproved subprocess in isolated harness: ' + command + ' ' + args.join(' '));
  };
  return { root, payload, manifestPath, manifest, runs, jobs, save, calls, state,
    options: { root, manifest: manifestPath, payload }, deps: { run, now: () => NOW } };
}
describe('exact source, artifact and independently verified release evidence', () => {
  it('accepts the exact attested artifact only with complete latest successful workflow attempts', () => {
    const f = fixture(); const result = gate.verifyCandidate(f.options, f.deps);
    expect(result.files).toBe(5); expect(result.sourceSha).toBe(SHA);
    const args = f.calls.find(call => call.args[0] === 'attestation').args;
    expect(args).toEqual(expect.arrayContaining(['--repo', 'Apomera/AlloFlow', '--signer-digest', SHA, '--source-digest', SHA,
      '--source-ref', 'refs/heads/candidate', '--deny-self-hosted-runners', '--hostname', 'github.com', '--signer-workflow',
      'Apomera/AlloFlow/.github/workflows/release-candidate.yml']));
  });
  it.each(['queued', 'in_progress', 'failure', 'skipped', 'cancelled', 'neutral', 'timed_out'])('blocks a %s latest check', value => {
    const f = fixture(), run = f.runs['verify.yml'].workflow_runs[0];
    if (['queued', 'in_progress'].includes(value)) run.status = value; else run.conclusion = value;
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/absent, pending, skipped or red/);
  });
  it('does not select an older green run over a newer pending run', () => {
    const f = fixture(), data = f.runs['verify.yml'];
    data.workflow_runs.push({ ...data.workflow_runs[0], id: 999, run_number: 41, status: 'queued', conclusion: null }); data.total_count++;
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/pending/);
  });
  it.each(['missing', 'skipped', 'wrong-attempt', 'wrong-sha'])('rejects %s required-job evidence', kind => {
    const f = fixture(), jobs = f.jobs[100];
    if (kind === 'missing') { jobs.jobs.pop(); jobs.total_count--; }
    if (kind === 'skipped') jobs.jobs[0].conclusion = 'skipped';
    if (kind === 'wrong-attempt') jobs.jobs[0].run_attempt++;
    if (kind === 'wrong-sha') jobs.jobs[0].head_sha = 'b'.repeat(40);
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/required job/);
  });
  it('rejects missing checks and unavailable GitHub evidence instead of accepting a local receipt', () => {
    const f = fixture(); f.manifest.checks = []; f.save();
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/identity|provenance/);
    const g = fixture(); g.runs['verify.yml'] = { total_count: 0, workflow_runs: [] };
    expect(() => gate.verifyCandidate(g.options, g.deps)).toThrow(/missing/);
    const h = fixture(); expect(() => gate.verifyCandidate(h.options, { ...h.deps, run: () => { throw new Error('API unavailable'); } })).toThrow(/unavailable/);
  });
  it('rejects a fabricated receipt even when its local hashes and status declarations agree', () => {
    const f = fixture(); f.state.signature = false;
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/signature/);
  });
  it.each(['source', 'dirty', 'producer', 'signed-attempt', 'stale', 'restarted'])('blocks %s drift', kind => {
    const f = fixture();
    if (kind === 'source') f.state.head = 'b'.repeat(40);
    if (kind === 'dirty') f.state.dirty = ' M source.js';
    if (kind === 'producer') f.runs[gate.PRODUCER].workflow_runs[0].head_repository.full_name = 'other/fork';
    if (kind === 'signed-attempt') f.state.invocation = f.state.invocation.replace('/2', '/1');
    if (kind === 'stale') { f.manifest.createdAt = new Date(NOW - gate.MAX_AGE_MS - 1).toISOString(); f.save(); }
    if (kind === 'restarted') { f.manifest.checks[0].runAttempt = 1; f.save(); }
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow();
  });
  it.each(['changed', 'extra', 'missing', 'worker-config'])('rejects %s publishable bytes', kind => {
    const f = fixture();
    if (kind === 'changed') fs.appendFileSync(path.join(f.payload, 'site/app.js'), 'changed');
    if (kind === 'extra') fs.writeFileSync(path.join(f.payload, 'site/extra.js'), 'unreviewed');
    if (kind === 'missing') fs.unlinkSync(path.join(f.payload, 'site/app.js'));
    if (kind === 'worker-config') fs.writeFileSync(path.join(f.payload, 'site/wrangler.toml'), 'name="unreviewed-worker"');
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/artifact/);
  });
  it.each(['site/_worker.js', 'site/wrangler.toml'])('rejects signed executable/control file %s without invoking anything', forbidden => {
    const f = fixture(), bytes = Buffer.from('// signed but outside the static Pages boundary');
    fs.writeFileSync(path.join(f.payload, forbidden), bytes);
    // The producer inventory intentionally cannot manufacture this unsafe list.
    // Supply the matching attested record explicitly to prove the signed static
    // boundary rejects it even when paths, bytes and hashes otherwise agree.
    f.manifest.files.push({ path: forbidden, bytes: bytes.length, sha256: hash(bytes) });
    f.manifest.files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0); f.save();
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/artifact contains an executable Pages or deployment-control path/);
    expect(f.calls.every(call => ['git', 'gh'].includes(call.command))).toBe(true);
  });
  it('rejects attested path traversal without invoking anything', () => {
    const g = fixture(); g.manifest.files[0].path = '../outside'; g.save();
    expect(() => gate.verifyCandidate(g.options, g.deps)).toThrow(/artifact/);
  });
  it.each(['provider', 'project', 'branch', 'public'])('rejects a signed wrong Cloudflare %s target', field => {
    const f = fixture(); f.manifest.hosting[field] = 'another-target'; f.save();
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/hosting|target|identity/i);
  });
  it('rejects the retired Firebase schema even with otherwise matching signed evidence', () => {
    const f = fixture(); f.manifest.schemaVersion = 1; delete f.manifest.hosting; f.save();
    expect(() => gate.verifyCandidate(f.options, f.deps)).toThrow(/identity|schema|hosting/i);
  });
  it('stages a private verified copy so later input edits do not change publication bytes', () => {
    const f = fixture(), stage = gate.stageCandidate(f.options, f.deps); roots.push(stage);
    fs.appendFileSync(path.join(f.payload, 'site/app.js'), 'later edit');
    expect(gate.verifyCandidate({ root: f.root, manifest: path.join(stage, 'manifest.json'), payload: path.join(stage, 'payload') }, f.deps).files).toBe(5);
  });
  it('creates an exhaustive CI candidate but cannot manufacture an attestation', () => {
    const f = fixture(), publicTree = path.join(f.root, 'desktop/web-app/public');
    fs.cpSync(path.join(f.payload, 'site'), publicTree, { recursive: true });
    const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: gate.REPOSITORY, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/candidate',
      GITHUB_SHA: SHA, GITHUB_RUN_ID: '102', GITHUB_RUN_ATTEMPT: '2', GITHUB_WORKFLOW_REF: gate.REPOSITORY + '/.github/workflows/release-candidate.yml@refs/heads/candidate' };
    const output = path.join(f.root, 'output'); const result = gate.createCandidate({ root: f.root, output }, { ...f.deps, env });
    expect(result.schemaVersion).toBe(2);
    expect(result.hosting).toEqual({ provider: 'cloudflare-pages', project: 'alloflow-cdn', branch: 'main', public: 'site' });
    expect(result.files.map(file => file.path)).toEqual(['site/app.js', 'site/app/index.html', 'site/app/sw.js', 'site/fixture_module.js', 'site/index.html']);
    for (const record of result.files) {
      const source = fs.readFileSync(path.join(publicTree, record.path.slice('site/'.length)));
      expect(record.bytes).toBe(source.length); expect(record.sha256).toBe(hash(source));
      expect(fs.readFileSync(path.join(output, 'payload', record.path))).toEqual(source);
    }
    expect(f.calls.some(call => call.args[0] === 'attestation')).toBe(false);
    expect(() => gate.createCandidate({ root: f.root, output: path.join(f.root, 'local') }, { ...f.deps, env: {} })).toThrow(/reviewed CI/);
  });
});
describe('producer and publication integration, inspected without running deploy.sh', () => {
  it('admits only a no-source sign-only job following successful final-byte checks', () => {
    const text = fs.readFileSync(path.join(ROOT, '.github/workflows/release-candidate.yml'), 'utf8'), workflow = YAML.parse(text);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.attest.needs).toBe('build');
    expect(workflow.jobs.attest.steps.every(step => !step.run && !step.uses.includes('checkout'))).toBe(true);
    expect(workflow.jobs.build.permissions).toEqual({ contents: 'read', actions: 'read' });
    const runs = workflow.jobs.build.steps.map(step => step.run || '').join('\n');
    expect(runs.indexOf('npm run build')).toBeLessThan(runs.indexOf('npm run test:native'));
    expect(runs.indexOf('run_unit_shard.cjs')).toBeLessThan(runs.indexOf('security_release_candidate.cjs create'));
    expect(runs.indexOf('playwright install chromium')).toBeLessThan(runs.indexOf('run_unit_shard.cjs'));
    expect(runs.indexOf('fetch_epubcheck.cjs')).toBeLessThan(runs.indexOf('run_unit_shard.cjs'));
    expect(runs.indexOf('make_remediation_e2e_fixture.cjs')).toBeLessThan(runs.indexOf('run_unit_shard.cjs'));
    expect(text).not.toMatch(/continue-on-error|firebase deploy|wrangler pages deploy|git push|contents: write/);
    // Each native invocation is a separate Actions step. On Windows a later
    // native success in the same pwsh block must never mask an earlier failure.
    for (const step of workflow.jobs.build.steps.filter(step => step.run)) {
      expect(step.run.split('\n').filter(line => /^\s*(?:node|npm|npx|git)\s/.test(line)).length).toBeLessThanOrEqual(1);
      expect(step.if).toBeUndefined();
      expect(step['continue-on-error']).toBeUndefined();
    }
  });
  it('retires legacy publishing and validates the private copy immediately before the sole publisher', () => {
    const source = fs.readFileSync(path.join(ROOT, 'deploy.sh'), 'utf8');
    expect(source).toContain('"${1:-}" != "--verified-candidate"');
    expect(source).not.toMatch(/git (?:commit|push)|node build\.js|npm run build|npx/);
    expect(source).not.toMatch(/firebase deploy|ALLOFLOW_FIREBASE_PROJECT/);
    expect(source.match(/wrangler pages deploy/g)).toHaveLength(1);
    const publisher = source.indexOf('  wrangler pages deploy'), verify = source.indexOf('"$RELEASE_GATE" verified-source');
    expect(verify).toBeGreaterThan(source.indexOf('"$RELEASE_GATE" stage'));
    expect(verify).toBeGreaterThan(source.indexOf('cd "$VERIFIED_STAGE/payload/site"'));
    expect(publisher).toBeGreaterThan(verify);
    expect(source.slice(verify, publisher)).not.toMatch(/\b(?:cp|mv|rm|npm|build)\b/);
    expect(source).toContain('--project-name alloflow-cdn --branch main --commit-hash "$SOURCE_SHA" --commit-dirty=false');
    expect(source).toContain('"--root=$SCRIPT_DIR"');
    expect(source).toContain('^[a-fA-F0-9]{32}$');
    expect(source).toContain('WRANGLER_VERSION="$(wrangler --version)"');
  });
});
