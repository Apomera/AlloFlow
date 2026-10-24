'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('./node_modules/yaml');
const { inspectWorkflow, auditPlan, selectWorkflows, auditsAllScopes } = require('../check_security_safeguards.cjs');
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
  const draft = valid.replace('  check:', '  draft-release:\n    permissions:\n      contents: write');
  assert.deepEqual(inspectWorkflow(draft, 'desktop-release.yml'), []);
  assert.ok(inspectWorkflow(draft, 'verify.yml').some((x) => x.includes('write permission')));
  assert.ok(inspectWorkflow(draft.replace('  draft-release:', '  windows:'), 'desktop-release.yml').some((x) => x.includes('write permission')));
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

test('new non-MCP workflows are automatically checked while MCP remains independently maintained', () => {
  assert.deepEqual(selectWorkflows(['verify.yml', 'new-release.yaml', 'security-safeguards.yml', 'README.md',
    'remote-mcp-verify.yml', 'mcp-registry-publish.yml', 'mcpb-release.yml', 'new-mcp-check.yaml']),
  ['new-release.yaml', 'security-safeguards.yml', 'verify.yml']);
  const future = selectWorkflows(['future-deploy.yml']);
  assert.ok(inspectWorkflow(valid.replace(/@[a-f0-9]{40}/, '@main'), future[0]).length);
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
