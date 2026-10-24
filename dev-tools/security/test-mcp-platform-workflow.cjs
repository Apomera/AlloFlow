'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const YAML = require('yaml');
const source = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/mcp-platform-validation.yml'), 'utf8');
const workflow = YAML.parse(source);
const steps = job => workflow.jobs[job].steps;
const commands = job => steps(job).filter(step => typeof step.run === 'string').map(step => step.run).join('\n');

test('platform validation has read-only permissions and no publishing path', () => {
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(workflow.jobs).sort(), ['candidate', 'validate']);
  assert.deepEqual(workflow.on.push.branches, ['codex/mcp-platform-validation-*']);
  assert.ok(Object.hasOwn(workflow.on, 'workflow_dispatch'));
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job.permissions, undefined);
    for (const step of job.steps) {
      assert.ok(!/attest|release|deploy|sign/i.test(step.uses || ''));
      assert.ok(!/\b(?:gh\s+release|wrangler\s+deploy|firebase\s+deploy|git\s+push)\b/.test(step.run || ''));
      assert.ok(!JSON.stringify(step).includes('${{ secrets.'));
    }
  }
});

test('Linux and both Mac architectures validate the same Windows-built artifact', () => {
  assert.equal(workflow.jobs.candidate['runs-on'], 'windows-latest');
  assert.equal(workflow.jobs.validate.needs, 'candidate');
  assert.equal(workflow.jobs.validate.strategy['fail-fast'], false);
  assert.deepEqual(workflow.jobs.validate.strategy.matrix.include, [
    { os: 'ubuntu-22.04', label: 'linux-x64' },
    { os: 'macos-15', label: 'macos-arm64' },
    { os: 'macos-15-intel', label: 'macos-x64' },
  ]);
  const upload = steps('candidate').find(step => step.uses === 'actions/upload-artifact@v4' && step.with.name.startsWith('mcp-platform-candidate-'));
  const download = steps('validate').find(step => step.uses === 'actions/download-artifact@v4');
  assert.equal(upload.with.name, download.with.name);
  assert.match(upload.with.path, /alloflow-remediation\.mcpb/);
  assert.match(upload.with.path, /SHA256SUMS\.txt/);
  assert.match(commands('validate'), /expected !== hash/);
  assert.match(commands('validate'), /verify_mcpb_artifact\.cjs candidate\/alloflow-remediation\.mcpb --require-playwright/);
  assert.doesNotMatch(commands('validate'), /build_mcpb\.cjs/);
});

test('runtime and browser setup preserves locked dependencies and Chromium sandboxing', () => {
  for (const job of ['candidate', 'validate']) {
    const node = steps(job).find(step => step.uses === 'actions/setup-node@v4');
    const java = steps(job).find(step => step.uses === 'actions/setup-java@v4');
    assert.equal(node.with['node-version'], '24');
    assert.equal(java.with.distribution, 'temurin');
    assert.equal(java.with['java-version'], '17');
    assert.match(commands(job), /npm ci --ignore-scripts --no-audit --no-fund/);
    assert.match(commands(job), /npm ci --prefix desktop\/mcp\/runtime --ignore-scripts --install-links/);
    assert.match(commands(job), /desktop\/mcp\/runtime\/node_modules\/playwright\/cli\.js install/);
    assert.match(commands(job), /fetch_epubcheck\.cjs/);
    assert.doesNotMatch(commands(job), /--no-sandbox|--disable-setuid-sandbox|--allow-source-drift|--allow-unvalidated/);
  }
  assert.match(commands('validate'), /install --with-deps chromium/);
});

test('both jobs shallow-check out only the validation source closure', () => {
  const required = [
    '/*.js', '/*.json', '/.npmrc', '/.gitattributes', '/LICENSE', '/.github/',
    '/desktop/mcp/', '/verapdf/', '/agent_skills/alloflow-pdf-remediation/',
    '/dev-tools/security/', '/dev-tools/check_secrets.cjs', '/tests/mcp_*',
    '/services/alloflow-remote-mcp/scripts/staging-paths.cjs',
    '/services/alloflow-remote-mcp/scripts/test/staging-paths.test.cjs',
  ].sort();
  for (const job of ['candidate', 'validate']) {
    const checkout = steps(job).find(step => step.uses === 'actions/checkout@v4');
    assert.equal(checkout.with['fetch-depth'], 1);
    assert.equal(checkout.with['persist-credentials'], false);
    assert.equal(checkout.with['sparse-checkout-cone-mode'], false);
    // checkout supplies blob filtering for sparse checkout; an explicit filter
    // input would override that mode. Keep large unrelated corpora out entirely.
    assert.equal(checkout.with.filter, undefined);
    const patterns = checkout.with['sparse-checkout'].trim().split(/\r?\n/).map(line => line.trim()).sort();
    assert.deepEqual(patterns, required);
    assert.ok(!patterns.includes('/*') && !patterns.includes('/**'));
  }
});

test('required symlink cases and real browser probes cannot silently skip', () => {
  assert.equal(workflow.jobs.validate.env.ALLOFLOW_REQUIRE_SYMLINK_TESTS, '1');
  assert.equal(workflow.jobs.validate.env.ALLOFLOW_TEST_ACE_BROWSER, '1');
  for (const file of ['tests/mcp_bundle_audit_security.test.cjs', 'tests/mcp_artifact_source_bytes.test.cjs',
    'tests/mcp_ace_browser_security.test.cjs', 'services/alloflow-remote-mcp/scripts/test/staging-paths.test.cjs']) {
    assert.ok(commands('validate').includes(file));
  }
  assert.match(commands('validate'), /--test-reporter=tap/);
  assert.match(commands('validate'), /Number\(match\[1\]\) !== 0/);
  assert.match(commands('validate'), /set -euo pipefail/);
  for (const job of ['candidate', 'validate']) {
    assert.ok(steps(job).some(step => step.uses === 'actions/upload-artifact@v4' && step.if === 'always()'));
  }
});
