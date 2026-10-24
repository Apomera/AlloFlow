'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { inspectImages, inspectRequirements } = require('./dependency-pins.cjs');
const YAML = require('yaml');
const root = path.resolve(__dirname, '../..');
const digest = 'a'.repeat(64);

test('mutable image tags and missing base-image digests are rejected', () => {
  assert.ok(inspectImages('services: {api: {image: "example:latest"}}', {}).length);
  assert.ok(inspectImages('services: {}', { Dockerfile: 'FROM python:3.11-slim' }).length);
  assert.deepEqual(inspectImages(`services: {api: {image: "example:latest@sha256:${digest}"}}`,
    { Dockerfile: `FROM python:3.11-slim@sha256:${digest} AS runtime` }), []);
});

test('Python locks reject unpinned, unhashed, remote, and truncated hash entries', () => {
  for (const source of ['', 'flask', 'flask>=3.1', 'flask==3.1.3', '-r other.txt',
    `flask @ https://example.test/package.whl --hash=sha256:${digest}`, 'flask==3.1.3 --hash=sha256:abc']) {
    assert.ok(inspectRequirements(source).length, source);
  }
  assert.deepEqual(inspectRequirements(`# Comment\nflask==3.1.3 \\\n    --hash=sha256:${digest}\n`), []);
});

test('all maintained School Box container references have verified digest pins', () => {
  const dockerfiles = Object.fromEntries(['docker/Dockerfile', 'docker/edge-tts-server/Dockerfile', 'docker/flux-server/Dockerfile']
    .map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  assert.deepEqual(inspectImages(fs.readFileSync(path.join(root, 'docker/docker-compose.yml'), 'utf8'), dockerfiles), []);
});

test('speech and security-tool dependencies are fully pinned and hashed', () => {
  for (const file of ['docker/edge-tts-server/requirements.txt', 'dev-tools/security/requirements.txt']) {
    assert.deepEqual(inspectRequirements(fs.readFileSync(path.join(root, file), 'utf8')), [], file);
  }
  const dockerfile = fs.readFileSync(path.join(root, 'docker/edge-tts-server/Dockerfile'), 'utf8');
  assert.match(dockerfile, /pip install[^\n]*--only-binary=:all:[^\n]*--require-hashes/);
});

test('direct Python requirements agree with the resolved locks', () => {
  for (const directory of ['docker/edge-tts-server', 'dev-tools/security']) {
    const direct = fs.readFileSync(path.join(root, directory, 'requirements.in'), 'utf8').trim().split(/\r?\n/);
    const locked = fs.readFileSync(path.join(root, directory, 'requirements.txt'), 'utf8').toLowerCase();
    for (const requirement of direct) assert.ok(locked.includes('\n' + requirement.toLowerCase() + ' \\'), requirement);
  }
});

test('dependency updates cover Python and containers and preserve the MCP hold', () => {
  const config = YAML.parse(fs.readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8'));
  for (const ecosystem of ['pip', 'docker', 'docker-compose']) {
    assert.ok(config.updates.some((entry) => entry['package-ecosystem'] === ecosystem));
  }
  const hold = config.updates.find((entry) => entry.directories?.includes('/desktop/mcp/runtime'));
  assert.equal(hold['open-pull-requests-limit'], 0);
  assert.deepEqual(hold.ignore, [{ 'dependency-name': '*' }]);
  const actions = config.updates.find((entry) => entry['package-ecosystem'] === 'github-actions');
  assert.ok(actions['exclude-paths'].includes('.github/workflows/remote-mcp-verify.yml'));
});
