'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const source = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
const quiet = { log() {}, warn() {}, error() {} };
function world(extra = {}) {
  const window = { location: { href: 'http://localhost/', hostname: 'localhost' }, ...extra };
  const context = vm.createContext({ window, navigator: { userAgent: 'Synthetic desktop', gpu: { requestAdapter: async () => ({}) } }, console: quiet,
    AbortController, DOMException, Blob, URL, setTimeout, clearTimeout, queueMicrotask, Float32Array, ArrayBuffer, ...extra.globals });
  return { window, context, load: file => vm.runInContext(source(file), context, { filename: file }) };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

test('Piper loads only its verified graph and preserves voice selection/download', async () => {
  const graphs = [], downloaded = [], lib = { download: async id => downloaded.push(id) };
  const w = world({ __alloLoadVerifiedRuntime: async name => { graphs.push(name); return lib; } }); w.load('piper_tts_loader.js');
  assert.equal(await w.window._piperTTS.init('es'), true);
  assert.deepEqual(graphs, ['piper']); assert.deepEqual(downloaded, ['es_MX-ald-medium']);
  w.window._piperTTS.dispose();
});

test('Piper fails closed without delivery and can retry after graph integrity failure', async () => {
  let attempts = 0; const w = world(); w.load('piper_tts_loader.js');
  assert.equal(await w.window._piperTTS.init('en'), false);
  w.window.__alloLoadVerifiedRuntime = async () => { if (++attempts === 1) throw Error('graph integrity failure'); return { download: async () => {} }; };
  assert.equal(await w.window._piperTTS.init('en'), false);
  assert.equal(await w.window._piperTTS.init('en'), true); assert.equal(attempts, 2);
  w.window._piperTTS.dispose();
});

test('SDTurbo preserves verified WASM configuration and its model/tokenizer pipeline', async () => {
  const graphs = [], models = [], sessions = [], tokenizer = [], wasmPaths = Object.freeze({ wasm: 'blob:verified' });
  const ort = { env: { wasm: { wasmPaths } }, InferenceSession: { create: async (_, options) => { sessions.push(options); return {}; } } };
  const w = world({ __alloLoadVerifiedRuntime: async name => { graphs.push(name); return name === 'ort121' ? ort : { AutoTokenizer: { from_pretrained: async id => { tokenizer.push(id); return {}; } } }; }, globals: {
    caches: { open: async () => ({ match: async () => null, put: async () => {} }) },
    fetch: async url => { models.push(url); return new Response(new Uint8Array(8), { headers: { 'Content-Length': '8' } }); },
  } });
  w.load('sd_turbo_loader.js'); assert.equal(await w.window._sdTurbo.init(), true);
  assert.deepEqual(graphs, ['ort121', 'transformers331']); assert.equal(ort.env.wasm.wasmPaths, wasmPaths);
  assert.deepEqual(tokenizer, ['Xenova/clip-vit-base-patch16']); assert.equal(models.length, 3); assert.equal(sessions.length, 3);
  for (const options of sessions) assert.deepEqual([...options.executionProviders], ['webgpu']);
  assert(models.every(url => url.startsWith('https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main/')));
});

class WorkerFixture {
  constructor() { this.terminated = false; this.messages = []; }
  terminate() { this.terminated = true; }
  postMessage(message) { this.messages.push(message); queueMicrotask(() => {
    if (message.type === 'init') this.onmessage?.({ data: { type: 'ready' } });
    if (message.type === 'generate') this.onmessage?.({ data: { type: 'audio', id: message.id, buffer: new ArrayBuffer(8) } });
  }); }
}

test('Kokoro uses verified module-worker creation and keeps model protocol/lifecycle', async () => {
  const created = [], worker = new WorkerFixture();
  const w = world({ __alloCreateVerifiedWorker: async (graph, body, options) => { created.push({ graph, body, options }); return worker; } });
  w.load('kokoro_tts_loader.js'); assert.equal(await w.window._kokoroTTS.init(), true);
  assert.equal(created.length, 1); assert.equal(created[0].graph, 'kokoro'); assert.equal(created[0].options.type, 'module');
  assert.match(created[0].body, /__alloRuntimeImport\('kokoro\.module'\)/); assert.doesNotMatch(created[0].body, /import\(data\.cdn\)/);
  const init = worker.messages.find(message => message.type === 'init'); assert.equal(init.modelId, 'onnx-community/Kokoro-82M-v1.0-ONNX'); assert.equal(init.dtype, 'q8'); assert.equal('cdn' in init, false);
  w.window._kokoroTTS.dispose(); assert.equal(worker.terminated, true);
});

test('Kokoro configures the actual worker namespace before requesting its model', async () => {
  let body; const w = world({ __alloCreateVerifiedWorker: async (_, source) => { body = source; return new WorkerFixture(); } });
  w.load('kokoro_tts_loader.js'); await w.window._kokoroTTS.init(); w.window._kokoroTTS.dispose();
  const calls = [], assets = Object.freeze({ 'kokoro.ort.wasm': 'blob:approved' }), self = { fetch: async () => { throw Error('unexpected data fetch'); }, addEventListener() {}, postMessage(message) { calls.push(message.type); } };
  const context = vm.createContext({ self, console: quiet, setTimeout, clearTimeout, URL, Map, Blob, performance,
    __alloRuntimeAssets: assets, __alloRuntimeImport: async id => {
      calls.push(id); return { __alloflowConfigureRuntime: map => { assert.equal(map, assets); calls.push('configured'); }, KokoroTTS: { from_pretrained: async (id, options) => { calls.push('model'); assert.equal(id, 'synthetic-model'); assert.equal(options.dtype, 'q8'); return {}; } } };
    } });
  vm.runInContext(body, context);
  await self.onmessage({ data: { type: 'init', modelId: 'synthetic-model', dtype: 'q8' } });
  assert(calls.indexOf('configured') < calls.indexOf('model')); assert(calls.includes('ready')); assert(calls.includes('kokoro.module'));
});

test('Kokoro dispose during graph preparation cannot revive or terminate a later init', async () => {
  const waiting = deferred(), oldWorker = new WorkerFixture(), newWorker = new WorkerFixture(); let attempts = 0;
  const w = world({ __alloCreateVerifiedWorker: () => ++attempts === 1 ? waiting.promise : Promise.resolve(newWorker) }); w.load('kokoro_tts_loader.js');
  const cancelled = w.window._kokoroTTS.init(); cancelled.catch(() => {}); w.window._kokoroTTS.dispose();
  assert.equal(await w.window._kokoroTTS.init(), true); waiting.resolve(oldWorker);
  await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal(oldWorker.terminated, true); assert.equal(newWorker.terminated, false); assert.equal(w.window._kokoroTTS.ready, true);
  w.window._kokoroTTS.dispose();
});

test('Whisper verifies its Transformers graph before installing cache and preserves retry/model identity', async () => {
  const module = source('allo_commands_source.jsx'), start = module.indexOf('function _getWhisperPipeline('), node = acorn.parseExpressionAt(module, start, { ecmaVersion: 'latest' });
  const calls = [], environment = { backends: { onnx: { wasm: { wasmPaths: { wasm: 'blob:verified' } } } } }; let fail = true;
  const context = vm.createContext({ Promise, Error, window: { __alloLoadVerifiedRuntime: async graph => { calls.push(graph); if (fail) { fail = false; throw Error('integrity failure'); } return { env: environment, pipeline: async (...args) => { calls.push(args); return 'synthetic-pipeline'; } }; } },
    modelCache: { installTransformersCache: env => { assert.equal(env, environment); calls.push('cache'); } }, isIosCanvasVoiceSurface: () => false, _coerceWhisperProfile: profile => profile });
  vm.runInContext('var _whisperPipelinePromise=null,_whisperPipelineModelId=null;\n' + module.slice(start, node.end), context);
  const profile = { supported: true, modelId: 'Xenova/whisper-tiny.en', requestedLanguage: 'en-US' };
  await assert.rejects(context._getWhisperPipeline(profile), /integrity failure/);
  assert.equal(await context._getWhisperPipeline(profile), 'synthetic-pipeline'); assert.equal(await context._getWhisperPipeline(profile), 'synthetic-pipeline');
  assert.equal(calls.filter(value => value === 'transformers331').length, 2); assert.equal(calls.filter(value => value === 'cache').length, 1);
  const pipeline = calls.find(Array.isArray); assert.equal(pipeline[0], 'automatic-speech-recognition'); assert.equal(pipeline[1], profile.modelId); assert.equal(pipeline[2].device, 'wasm'); assert.equal(pipeline[2].dtype, 'q8');
});
