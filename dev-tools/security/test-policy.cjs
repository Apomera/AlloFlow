'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
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
  assert.deepEqual(auditPlan(['desktop/web-app/package-lock.json']), [{ directory: 'desktop/web-app', level: 'critical' }]);
  assert.deepEqual(auditPlan(['desktop/package.json']), [{ directory: 'desktop', level: 'high' }]);
  assert.equal(auditPlan([], true).length, 3);
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
    assert.equal(auditPlan([], auditsAllScopes(event)).length, 3);
  }
  assert.deepEqual(auditPlan([], auditsAllScopes('push')), []);
  assert.deepEqual(auditPlan(['desktop/mcp/runtime/package-lock.json'], auditsAllScopes('pull_request')), []);
});
