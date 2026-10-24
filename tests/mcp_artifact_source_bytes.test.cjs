'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { assertSourceBytes, assertSourceParity, assertRuntimeManifest } = require('../desktop/mcp/verify_mcpb_artifact.cjs');
const Builder = require('../desktop/mcp/build_mcpb.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-artifact-byte-parity-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('alloflow-artifact-byte-parity-'));
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  const extraction = path.join(root, 'artifact'), source = path.join(root, 'source.cjs');
  fs.mkdirSync(path.join(extraction, 'server'), { recursive: true });
  const artifact = path.join(extraction, 'server', 'policy.cjs');
  const bytes = Buffer.from('module.exports = "current security policy";\n');
  fs.writeFileSync(source, bytes); fs.writeFileSync(artifact, bytes);
  return { root, extraction, source, artifact, map: { 'server/policy.cjs': source } };
}

test('checks the extracted first-party bytes instead of relying on unchanged version and tool names', t => {
  const f = fixture(t);
  assert.deepEqual(assertSourceBytes(f.extraction, f.map), { checkedFiles: 1 });
  const changed = fs.readFileSync(f.artifact); changed[0] ^= 1;
  fs.writeFileSync(f.artifact, changed);
  assert.throws(() => assertSourceBytes(f.extraction, f.map), /source bytes differ.*server\/policy\.cjs/i);
});

test('also rejects stale first-party pipeline assets', t => {
  const f = fixture(t), asset = path.join(f.extraction, 'assets', 'pipeline.js');
  fs.mkdirSync(path.dirname(asset)); fs.copyFileSync(f.source, asset);
  const map = { ...f.map, 'assets/pipeline.js': f.source };
  assert.deepEqual(assertSourceBytes(f.extraction, map), { checkedFiles: 2 });
  fs.writeFileSync(asset, 'stale pipeline code');
  assert.throws(() => assertSourceBytes(f.extraction, map), /source bytes differ.*assets\/pipeline\.js/i);
});

test('rejects missing packaged files and invalid artifact-relative mappings', t => {
  const f = fixture(t);
  fs.unlinkSync(f.artifact);
  assert.throws(() => assertSourceBytes(f.extraction, f.map), /missing or unsafe.*server\/policy\.cjs/i);
  for (const key of ['../source.cjs', '/source.cjs', 'server/../policy.cjs', 'server\\policy.cjs']) {
    assert.throws(() => assertSourceBytes(f.extraction, { [key]: f.source }), /Invalid bundle source-file mapping/);
  }
  assert.throws(() => assertSourceBytes(f.extraction, {}), /map is missing or invalid/);
});

test('rejects a symlink even when its target bytes match the current source', t => {
  const f = fixture(t);
  fs.unlinkSync(f.artifact);
  try { fs.symlinkSync(f.source, f.artifact, 'file'); }
  catch (error) {
    if (process.platform === 'win32' && process.env.ALLOFLOW_REQUIRE_SYMLINK_TESTS !== '1'
        && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('Host does not allow test file symlinks');
    throw error;
  }
  assert.throws(() => assertSourceBytes(f.extraction, f.map), /missing or unsafe.*symbolic link/i);
});

test('rejects symlinked parent directories instead of following them into outside source files', t => {
  const f = fixture(t);
  fs.rmSync(path.join(f.extraction, 'server'), { recursive: true });
  const outside = path.join(f.root, 'outside'); fs.mkdirSync(outside);
  fs.copyFileSync(f.source, path.join(outside, 'policy.cjs'));
  try { fs.symlinkSync(outside, path.join(f.extraction, 'server'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && process.env.ALLOFLOW_REQUIRE_SYMLINK_TESTS !== '1'
        && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('Host does not allow test directory symlinks');
    throw error;
  }
  assert.throws(() => assertSourceBytes(f.extraction, f.map), /missing or unsafe.*symbolic link/i);
});

test('requires the current manifest Node floor even when artifact identity and tool names match', () => {
  const manifest = Builder.buildManifest();
  assert.doesNotThrow(() => assertSourceParity(manifest));
  const staleFloor = { ...manifest, compatibility: { ...manifest.compatibility,
    runtimes: { ...manifest.compatibility.runtimes, node: '>=20' } } };
  assert.throws(() => assertSourceParity(staleFloor), /Node runtime requirement/);
});

test('does not execute an unverified entry point or changed launch configuration with otherwise matching identity', () => {
  const manifest = Builder.buildManifest();
  for (const server of [
    { ...manifest.server, entry_point: '../outside.cjs' },
    { ...manifest.server, entry_point: 'server/unverified-extra.cjs' },
    { ...manifest.server, mcp_config: { ...manifest.server.mcp_config, args: ['server/unverified-extra.cjs'] } },
  ]) {
    assert.throws(() => assertSourceParity({ ...manifest, server }), /server configuration does not match/);
  }
});

test('checks generated runtime manifest semantics without confusing its distinct name and version with the source manifest', t => {
  const f = fixture(t), file = path.join(f.extraction, 'package.json');
  const expected = { name: 'runtime-source', version: '1.0.0',
    dependencies: { playwright: '1.60.0', 'extract-zip': 'file:disabled-extract-zip' },
    overrides: { 'extract-zip': '$extract-zip', '@daisy/ace-config': { conf: '10.2.0' } },
    engines: { node: '>=22.12.0' } };
  const actual = { name: 'generated-artifact', version: '2.0.0',
    dependencies: { 'extract-zip': 'file:disabled-extract-zip', playwright: '1.60.0' },
    overrides: { '@daisy/ace-config': { conf: '10.2.0' }, 'extract-zip': '$extract-zip' },
    engines: expected.engines };
  fs.writeFileSync(file, JSON.stringify(actual));
  assert.deepEqual(assertRuntimeManifest(f.extraction, expected), { passed: true });
  for (const field of ['dependencies', 'overrides', 'engines']) {
    fs.writeFileSync(file, JSON.stringify({ ...actual, [field]: {} }));
    assert.throws(() => assertRuntimeManifest(f.extraction, expected), new RegExp('manifest differs.*' + field));
  }
});

test('requires a packaged runtime manifest for distribution checks while keeping lean diagnostics valid', t => {
  const f = fixture(t);
  assert.deepEqual(assertSourceBytes(f.extraction, f.map), { checkedFiles: 1 });
  assert.throws(() => assertSourceBytes(f.extraction, f.map, { requirePlaywright: true }), /runtime manifest is missing or unsafe/);
});

test('packaged EPUB cache identity changes with the shipped runtime dependency-lock bytes', t => {
  const f = fixture(t), server = path.join(f.extraction, 'server');
  for (const name of ['remediation_epub_validation.cjs', 'remediation_epub_archive.cjs']) {
    fs.copyFileSync(path.join(__dirname, '../desktop/mcp', name), path.join(server, name));
  }
  const evidence = path.join(f.extraction, 'runtime-dependencies.lock.json');
  fs.writeFileSync(evidence, '{"fixtureDependencyVersion":1}\n');
  // Match the official packer's layout: package-lock.json is excluded, while
  // runtime-dependencies.lock.json is shipped byte-exact beside server/.
  assert.equal(fs.existsSync(path.join(f.extraction, 'package-lock.json')), false);
  const priorJava = process.env.ALLOFLOW_MCP_JAVA_BIN;
  process.env.ALLOFLOW_MCP_JAVA_BIN = path.join(f.root, 'nonexistent-java');
  try {
    const validator = require(path.join(server, 'remediation_epub_validation.cjs'));
    const before = validator.fingerprint();
    assert.equal(validator.fingerprint(), before);
    fs.writeFileSync(evidence, '{"fixtureDependencyVersion":2}\n');
    assert.notEqual(validator.fingerprint(), before);
  } finally {
    if (priorJava === undefined) delete process.env.ALLOFLOW_MCP_JAVA_BIN;
    else process.env.ALLOFLOW_MCP_JAVA_BIN = priorJava;
  }
});
