'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { assertPinnedCodeUrl, assertSourcePin, assertClosedCode, runtimeAssetPath, publishGraphs, DEFAULT_STAGE, PINS_FILE } = require('../build_browser_runtime_graphs.cjs');

test('runtime acquisition accepts only canonical exact-version code paths, never model weights', () => {
  assert.doesNotThrow(() => assertPinnedCodeUrl('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/+esm'));
  assert.doesNotThrow(() => assertPinnedCodeUrl('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0-dev.20250409-89f8206ba4/dist/ort-wasm-simd-threaded.jsep.wasm'));
  for (const url of ['https://evil.example/npm/pkg@1.0.0/index.js', 'https://cdn.jsdelivr.net/npm/pkg@latest/index.js',
    'https://cdn.jsdelivr.net/npm/pkg/index.js', 'http://cdn.jsdelivr.net/npm/pkg@1.0.0/index.js',
    'https://cdn.jsdelivr.net/npm/pkg@1.0.0/../index.js', 'https://cdn.jsdelivr.net/npm/pkg@1.0.0/..',
    'https://cdn.jsdelivr.net/npm/pkg@1.0.0/model.onnx', 'https://cdn.jsdelivr.net/npm/pkg@1.0.0/model.safetensors']) {
    assert.throws(() => assertPinnedCodeUrl(url));
  }
});

test('publication verifies all destinations first and uses exclusive content-addressed copies', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-runtime-publication-'));
  try {
    const stage = path.join(fixture, 'stage'), one = path.join(fixture, 'one'), two = path.join(fixture, 'two');
    fs.mkdirSync(stage); fs.mkdirSync(one); fs.mkdirSync(two);
    const bytes = Buffer.from('export const actualRuntime=42;'), output = { file: 'fixture.closed.mjs', bytes: bytes.length, sha384: crypto.createHash('sha384').update(bytes).digest('hex') };
    const asset = { ...output, kind: 'module', path: runtimeAssetPath(output), closed: true };
    fs.writeFileSync(path.join(stage, output.file), bytes);
    fs.writeFileSync(path.join(stage, 'runtime-code-provenance.json'), JSON.stringify({ outputs: [output] }));
    fs.writeFileSync(path.join(stage, 'engine_runtime_integrity.json'), JSON.stringify({ assets: { fixture: asset } }));
    fs.mkdirSync(path.dirname(path.join(two, asset.path)), { recursive: true });
    fs.writeFileSync(path.join(two, asset.path), 'other agent content');
    assert.throws(() => publishGraphs({ stage, destinationRoots: [one, two] }), /source bytes changed/);
    assert.equal(fs.existsSync(path.join(one, asset.path)), false, 'A later conflict must prevent earlier copies');
    assert.equal(fs.readFileSync(path.join(two, asset.path), 'utf8'), 'other agent content');
    fs.writeFileSync(path.join(two, asset.path), bytes);
    assert.deepEqual(publishGraphs({ stage, destinationRoots: [one, two] }), { assets: 1, created: 1, verifiedExisting: 1 });
    assert.deepEqual(publishGraphs({ stage, destinationRoots: [one, two] }), { assets: 1, created: 0, verifiedExisting: 2 });
    fs.writeFileSync(path.join(stage, output.file), 'altered source');
    assert.throws(() => publishGraphs({ stage, destinationRoots: [one, two] }), /source bytes changed/);
    assert.deepEqual(fs.readFileSync(path.join(one, asset.path)), bytes);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test('closed-module gates reject remaining static/dynamic imports and worker creation', () => {
  assert.doesNotThrow(() => assertClosedCode('export function inference(value){return value+1;}'));
  for (const source of ['import x from "./child.js";', 'export * from "./child.js";', 'import("./child.js");',
    'import(supplied);', 'new Worker(url);', 'new self.Worker(url);', 'new SharedWorker(url);',
    'importScripts(url);', 'self.importScripts(url);']) assert.throws(() => assertClosedCode(source));
});

test('reviewed source pins reject changed contents and malformed expected evidence', () => {
  const bytes = Buffer.from('original runtime code'), expected = { bytes: bytes.length, sha384: crypto.createHash('sha384').update(bytes).digest('hex') };
  assert.doesNotThrow(() => assertSourcePin(bytes, expected));
  for (const pin of [null, {}, { ...expected, bytes: 0 }, { ...expected, sha384: '0'.repeat(96) }]) assert.throws(() => assertSourcePin(bytes, pin));
  assert.throws(() => assertSourcePin(Buffer.from('altered runtime code!'), expected));
});

test('published engine code and adjuncts match their reviewed graph records and acquisition pins', () => {
  const root = path.resolve(__dirname, '../..');
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'engine_runtime_integrity.json'), 'utf8'));
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'engine_runtime_provenance.json'), 'utf8'));
  const outputs = Object.fromEntries(provenance.outputs.map(output => [output.sha384, output]));
  const selected = new Set(['kokoro', 'ort121', 'piper', 'transformers331'].flatMap(graph => metadata.graphs[graph].assets));
  for (const id of selected) {
    const asset = metadata.assets[id];
    assert.match(asset.path, /^runtime_assets\/engine\/[a-z0-9.-]+\.[a-f0-9]{24}\.(?:mjs|wasm|data)$/);
    const bytes = fs.readFileSync(path.join(root, asset.path));
    assertSourcePin(bytes, asset);
    assertSourcePin(bytes, outputs[asset.sha384]);
    assert.deepEqual(fs.readFileSync(path.join(root, 'desktop/web-app/public', asset.path)), bytes);
    if (asset.kind === 'module') { assert.equal(asset.closed, true); assertClosedCode(bytes.toString('utf8')); }
  }
  const pins = JSON.parse(fs.readFileSync(PINS_FILE, 'utf8'));
  assert.equal(provenance.modelsDownloaded, false);
  for (const source of provenance.sources) {
    assertPinnedCodeUrl(source.url);
    assert.deepEqual({ bytes: source.bytes, sha384: source.sha384 }, pins.sources[source.url]);
    // Acquisition cache is useful additional local evidence, never a CI input.
    const cache = path.join(DEFAULT_STAGE, 'sources', crypto.createHash('sha256').update(source.url).digest('hex'));
    if (fs.existsSync(cache)) assertSourcePin(fs.readFileSync(cache), source);
  }
});
