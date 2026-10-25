#!/usr/bin/env node
'use strict';

// Isolated, explicitly invoked acquisition/build. Never installs npm packages,
// runs lifecycle scripts, downloads models, or copies files into public assets.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const acorn = require('acorn');
const esbuild = require('esbuild');
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STAGE = path.join(ROOT, 'tmp/private-loader-security-20261024/runtime-staging');
const PINS_FILE = path.join(__dirname, 'browser_runtime_graph_pins.json');
const ENTRIES = Object.freeze({
  piper: 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/+esm',
  kokoro: 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm',
  transformers: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/+esm',
  ort: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs',
});
const RESOURCES = Object.freeze({
  'piper-ort-simd.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort-wasm-simd.wasm',
  'piper-ort.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort-wasm.wasm',
  'transformers-3.3.1.wasm': 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/ort-wasm-simd-threaded.jsep.wasm',
  'kokoro-transformers-3.5.1.wasm': 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/ort-wasm-simd-threaded.jsep.wasm',
  'ort-1.21.0.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort-wasm-simd-threaded.jsep.wasm',
  'piper-phonemizer.wasm': 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
  'piper-phonemizer.data': 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
});
const sha384 = bytes => crypto.createHash('sha384').update(bytes).digest('hex');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function assertPinnedCodeUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\/cdn\.jsdelivr\.net\/npm\/(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+@[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?\/(?:[A-Za-z0-9_./+~-]+)$/.test(value)
      || new URL(value).href !== value || /(?:^|\/)\.{1,2}(?:\/|$)/.test(new URL(value).pathname)
      || /\.(?:onnx|safetensors|bin|gguf|pt)(?:$|\/)/i.test(value)) throw new Error('Only exact-version runtime code URLs are allowed: ' + value);
  return value;
}

function download(url, maximum = 64 * 1024 * 1024) {
  assertPinnedCodeUrl(url);
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'AlloFlow-isolated-runtime-review' } }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error('HTTP ' + response.statusCode + ': ' + url)); return; }
      let size = 0; const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > maximum) { response.destroy(new Error('Runtime code exceeded bounded download')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    request.setTimeout(60000, () => request.destroy(new Error('Runtime download timed out')));
    request.on('error', reject);
  });
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function inspectCode(source) {
  const tree = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const result = { imports: [], dynamic: [], workers: [], importScripts: [], importMetaUrls: [] };
  walk(tree, node => {
    if (node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source) result.imports.push(node.source.value);
    if (node.type === 'ImportExpression') result.dynamic.push({ start: node.start, end: node.end,
      literal: node.source.type === 'Literal' ? node.source.value : null, source: source.slice(node.source.start, node.source.end) });
    const named = (value, name) => value.type === 'Identifier' ? value.name === name
      : value.type === 'MemberExpression' && !value.computed && value.property.type === 'Identifier' && value.property.name === name;
    if (node.type === 'NewExpression' && (named(node.callee, 'Worker') || named(node.callee, 'SharedWorker'))) result.workers.push({ start: node.start, end: node.end });
    if (node.type === 'CallExpression' && named(node.callee, 'importScripts')) result.importScripts.push({ start: node.start, end: node.end });
    if (node.type === 'MemberExpression' && node.object.type === 'MetaProperty' && node.object.meta.name === 'import'
        && node.property.type === 'Identifier' && node.property.name === 'url') result.importMetaUrls.push({ start: node.start, end: node.end });
  });
  return result;
}

function assertSourcePin(bytes, expected) {
  if (!expected || !Number.isSafeInteger(expected.bytes) || expected.bytes < 0 || !/^[a-f0-9]{96}$/.test(expected.sha384)
      || bytes.length !== expected.bytes || sha384(bytes) !== expected.sha384) throw new Error('Pinned runtime source bytes changed');
}

function assertClosedCode(source) {
  const graph = inspectCode(source);
  if (graph.imports.length || graph.dynamic.length || graph.workers.length || graph.importScripts.length) throw new Error('Executable runtime graph still contains imports or worker construction');
  return { closed: true };
}

async function createAcquirer(stage, allowFetch) {
  const cache = path.join(stage, 'sources'); fs.mkdirSync(cache, { recursive: true });
  const pins = fs.existsSync(PINS_FILE) ? JSON.parse(fs.readFileSync(PINS_FILE, 'utf8')) : null;
  const records = new Map();
  const read = async url => {
    assertPinnedCodeUrl(url);
    if (pins && !Object.hasOwn(pins.sources, url)) throw new Error('Runtime source is absent from reviewed pin file: ' + url);
    const file = path.join(cache, sha256(url));
    let bytes;
    if (fs.existsSync(file)) bytes = fs.readFileSync(file);
    else {
      if (!allowFetch) throw new Error('Uncached runtime source; explicit --fetch required: ' + url);
      bytes = await download(url); fs.writeFileSync(file, bytes);
    }
    const actual = { bytes: bytes.length, sha384: sha384(bytes) };
    if (pins) assertSourcePin(bytes, pins.sources[url]);
    records.set(url, { url, ...actual, cache: path.relative(stage, file).split(path.sep).join('/') });
    return bytes;
  };
  return { read, records };
}

function entrySource(name) {
  const lines = ['import * as runtime from ' + JSON.stringify(ENTRIES[name]) + ';', 'export * from ' + JSON.stringify(ENTRIES[name]) + ';'];
  const get = 'const asset=(id)=>{const url=assets[id];if(typeof url!=="string"||!url.startsWith("blob:"))throw Error("Verified runtime Blob URL required: "+id);return url;};';
  if (name === 'piper') {
    lines.push('import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/+esm";',
      'export {ort as __runtimeOrt};',
      'export {createPiperPhonemize as __alloflowCreatePhonemizer} from "https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/dist/piper-o91UDS6e.js/+esm";',
      'export function __alloflowConfigureRuntime(assets){' + get + 'ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;const map={"ort-wasm-simd.wasm":asset("piper.ort.simd"),"ort-wasm.wasm":asset("piper.ort.plain")};ort.env.wasm.wasmPaths=map;runtime.TtsSession.WASM_LOCATIONS.onnxWasm=map;runtime.TtsSession.WASM_LOCATIONS.piperWasm=asset("piper.phonemizer.wasm");runtime.TtsSession.WASM_LOCATIONS.piperData=asset("piper.phonemizer.data");return runtime;}');
  } else {
    if (name === 'kokoro') lines.push('import * as tf from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/+esm";',
      'export {__alloflowRuntimeBackend} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/+esm";');
    const environment = name === 'ort' ? 'runtime.env.wasm' : name === 'kokoro' ? 'tf.env.backends.onnx.wasm' : 'runtime.env.backends.onnx.wasm';
    const id = name === 'ort' ? 'ort121.wasm' : name === 'kokoro' ? 'kokoro.ort.wasm' : 'transformers331.ort.wasm';
    lines.push('export function __alloflowConfigureRuntime(assets){' + get + 'const env=' + environment + ';env.numThreads=1;env.proxy=false;env.wasmBinary=undefined;env.wasmPaths={wasm:asset(' + JSON.stringify(id) + ')};return runtime;}');
  }
  return lines.join('\n');
}

async function buildGraphs({ stage = DEFAULT_STAGE, allowFetch = false, names = Object.keys(ENTRIES) } = {}) {
  stage = path.resolve(stage); fs.mkdirSync(stage, { recursive: true });
  const acquisition = await createAcquirer(stage, allowFetch), outputs = [], changes = [];
  const plugin = {
    name: 'exact-runtime-code', setup(build) {
      build.onResolve({ filter: /^(?:node:)?(?:fs|path|url|module|crypto|worker_threads)$/ }, args => ({ path: args.path, namespace: 'browser-node-stub' }));
      build.onLoad({ filter: /.*/, namespace: 'browser-node-stub' }, args => {
        changes.push({ nodeOnlyModule: args.path, browserOnly: true });
        return { contents: 'const unavailable=()=>{throw new Error("Node-only runtime branch is unavailable in this browser bundle")};'
          + 'export { unavailable as readFileSync,unavailable as readFile,unavailable as createRequire,unavailable as dirname,unavailable as resolve,unavailable as join };export default {readFileSync:unavailable,readFile:unavailable};', loader: 'js' };
      });
      build.onResolve({ filter: /^https:\/\/|^\/npm\// }, async args => {
        let url = new URL(args.path, 'https://cdn.jsdelivr.net').href;
        if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/[A-Za-z0-9_.-]+\//.test(url)) {
          const dependency = url.match(/\/npm\/([^/]+)\//)[1];
          const packageBase = args.importer.match(/^(https:\/\/cdn\.jsdelivr\.net\/npm\/(?:@[^/]+\/)?[^/@]+@[^/]+)\//)?.[1];
          if (!packageBase) throw new Error('Cannot pin unversioned transitive import: ' + url);
          const metadata = JSON.parse((await acquisition.read(packageBase + '/package.json')).toString('utf8'));
          let version = metadata.dependencies?.[dependency];
          if (!version && dependency === 'onnxruntime-common') {
            const ortVersion = metadata.dependencies?.['onnxruntime-web'];
            if (typeof ortVersion === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(ortVersion)) {
              const ortMetadata = JSON.parse((await acquisition.read('https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ortVersion + '/package.json')).toString('utf8'));
              version = ortMetadata.dependencies?.[dependency];
            }
          }
          if (typeof version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(version)) throw new Error('Transitive dependency must have an exact package version: ' + dependency);
          const original = url; url = url.replace('/npm/' + dependency + '/', '/npm/' + dependency + '@' + version + '/');
          changes.push({ importer: args.importer, unversionedImport: original, pinnedImport: url });
        }
        return { path: assertPinnedCodeUrl(url), namespace: 'pinned-runtime' };
      });
      build.onResolve({ filter: /^\./, namespace: 'pinned-runtime' }, args => ({ path: assertPinnedCodeUrl(new URL(args.path, args.importer).href), namespace: 'pinned-runtime' }));
      build.onLoad({ filter: /.*/, namespace: 'pinned-runtime' }, async args => {
        let source = (await acquisition.read(args.path)).toString('utf8');
        // Expose the actual backend already selected by Transformers, so a
        // synthetic ONNX acceptance test exercises this shipped graph rather
        // than importing a second, potentially incompatible ORT instance.
        if (/\/\@huggingface\/transformers@(3\.3\.1|3\.5\.1)\/\+esm$/.test(args.path)) {
          const anchor = args.path.includes('@3.3.1/') ? 'const B=y.InferenceSession;' : 'const D=i.InferenceSession;';
          const backend = args.path.includes('@3.3.1/') ? 'y' : 'i';
          if (source.split(anchor).length !== 2) throw new Error('Pinned Transformers backend export anchor drift');
          source = 'let __alloflowRuntimeBackend;\n' + source.replace(anchor, '__alloflowRuntimeBackend=' + backend + ';' + anchor)
            + '\nexport {__alloflowRuntimeBackend};\n';
          changes.push({ url: args.path, actualBackendExport: '__alloflowRuntimeBackend' });
        }
        const graph = inspectCode(source), edits = [];
        if (args.path === ENTRIES.piper) {
          const assignments = [...source.matchAll(/\.numThreads=navigator\.hardwareConcurrency/g)];
          if (assignments.length !== 1) throw new Error('Pinned Piper single-thread patch anchor drift');
          edits.push({ start: assignments[0].index, end: assignments[0].index + assignments[0][0].length, text: '.numThreads=1' });
          // This source has no computed imports or workers; offsets for its
          // literal imports are only consumed by esbuild after this patch.
          changes.push({ url: args.path, forcedSupportedSingleThread: true });
        }
        // The verified entry executes from a Blob URL. Preserve upstream's
        // original module identity for non-executing path calculations; all
        // selected executable resources are separately configured as blobs.
        for (const item of graph.importMetaUrls) edits.push({ ...item, text: JSON.stringify(args.path) });
        if (graph.importMetaUrls.length) changes.push({ url: args.path, anchoredImportMetaUrls: graph.importMetaUrls.length });
        // A reviewed single-thread build must not regain implicit proxy or
        // pthread workers. This trades parallel inference for graph closure.
        for (const worker of graph.workers) edits.push({ ...worker, text: '(()=>{throw new Error("This verified runtime supports the single-thread backend only")})()' });
        const dynamic = graph.dynamic.filter(item => item.literal === null);
        if (dynamic.length) {
          const version = args.path.match(/\/(?:@huggingface\/transformers|onnxruntime-web)@([^/]+)\//)?.[1];
          if (!version) throw new Error('Unreviewed computed runtime import in ' + args.path);
          const packageName = args.path.includes('/@huggingface/transformers@') ? '@huggingface/transformers' : 'onnxruntime-web';
          const factoryUrl = 'https://cdn.jsdelivr.net/npm/' + packageName + '@' + version + '/dist/ort-wasm-simd-threaded.jsep.mjs';
          for (const item of dynamic) edits.push({ ...item, text: 'Promise.resolve({default:__alloClosedWasmFactory})' });
          source = 'import __alloClosedWasmFactory from ' + JSON.stringify(factoryUrl) + ';\n' + applyEdits(source, edits);
        } else source = applyEdits(source, edits);
        if (edits.length) changes.push({ url: args.path, disabledWorkerSites: graph.workers.length, staticallyBoundWasmImports: dynamic.length });
        return { contents: source, loader: 'js' };
      });
    },
  };
  try {
    for (const name of names) {
      if (!Object.hasOwn(ENTRIES, name)) throw new Error('Unknown runtime graph: ' + name);
      const result = await esbuild.build({ stdin: { contents: entrySource(name), resolveDir: ROOT },
        bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
        define: { 'process': 'undefined' }, metafile: true, plugins: [plugin], logLevel: 'silent' });
      const code = result.outputFiles[0].text;
      assertClosedCode(code);
      for (const output of Object.values(result.metafile.outputs)) if (output.imports.length) throw new Error('Bundler left external imports: ' + JSON.stringify(output.imports));
      const file = name + '.closed.mjs'; fs.writeFileSync(path.join(stage, file), code);
      fs.writeFileSync(path.join(stage, name + '.metafile.json'), JSON.stringify(result.metafile, null, 2) + '\n');
      outputs.push({ name, file, bytes: Buffer.byteLength(code), sha384: sha384(code), closure: 'no imports/workers/importScripts', threadedWorkers: false });
    }
    for (const [file, url] of Object.entries(RESOURCES)) {
      const bytes = await acquisition.read(url); fs.writeFileSync(path.join(stage, file), bytes);
      outputs.push({ name: file, file, bytes: bytes.length, sha384: sha384(bytes), kind: file.endsWith('.data') ? 'data' : 'wasm' });
    }
    fs.writeFileSync(path.join(stage, 'engine_runtime_integrity.json'), JSON.stringify(graphMetadata(outputs), null, 2) + '\n');
  } finally {
    fs.writeFileSync(path.join(stage, 'runtime-code-provenance.json'), JSON.stringify({ schemaVersion: 1,
      generatedAt: new Date().toISOString(), entries: ENTRIES, sources: [...acquisition.records.values()].sort((a, b) => a.url.localeCompare(b.url)),
      transformations: changes, outputs, modelsDownloaded: false }, null, 2) + '\n');
  }
  return { stage, outputs };
}

function graphMetadata(outputs) {
  const files = Object.fromEntries(outputs.map(output => [output.file, output]));
  const assets = {}, graphs = {};
  const definitions = {
    piper: { module: 'piper.closed.mjs', aliases: [ENTRIES.piper], bindings: {
      'piper.ort.simd': 'piper-ort-simd.wasm', 'piper.ort.plain': 'piper-ort.wasm',
      'piper.phonemizer.wasm': 'piper-phonemizer.wasm', 'piper.phonemizer.data': 'piper-phonemizer.data' } },
    kokoro: { module: 'kokoro.closed.mjs', aliases: [ENTRIES.kokoro], bindings: { 'kokoro.ort.wasm': 'kokoro-transformers-3.5.1.wasm' } },
    transformers331: { module: 'transformers.closed.mjs', aliases: [ENTRIES.transformers, 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1'], bindings: { 'transformers331.ort.wasm': 'transformers-3.3.1.wasm' } },
    ort121: { module: 'ort.closed.mjs', aliases: [ENTRIES.ort], bindings: { 'ort121.wasm': 'ort-1.21.0.wasm' } },
  };
  for (const [name, graph] of Object.entries(definitions)) {
    if (!files[graph.module]) continue;
    const dependencies = Object.keys(graph.bindings), moduleId = name + '.module';
    for (const [id, file] of Object.entries(graph.bindings)) {
      const output = files[file];
      if (!output) throw new Error('Missing runtime resource: ' + file);
      assets[id] = { kind: output.kind, path: runtimeAssetPath(output), bytes: output.bytes, sha384: output.sha384,
        mirrors: [], aliases: [RESOURCES[file]] };
    }
    const output = files[graph.module];
    assets[moduleId] = { kind: 'module', path: runtimeAssetPath(output), bytes: output.bytes, sha384: output.sha384,
      mirrors: [], aliases: graph.aliases, dependencies, closed: true };
    graphs[name] = { assets: [...dependencies, moduleId], entry: moduleId, configureExport: '__alloflowConfigureRuntime',
      bindings: Object.fromEntries(dependencies.map(id => [id, id])) };
  }
  return { schemaVersion: 1, assets, graphs };
}

function runtimeAssetPath(output) {
  const extension = path.extname(output.file), stem = path.basename(output.file, extension);
  return 'runtime_assets/engine/' + stem + '.' + output.sha384.slice(0, 24) + extension;
}

// An explicit, separate publication step for reviewed graph outputs. Verify
// every source and every destination before creating any files; never replace
// an existing asset, even if another build is running in this workspace.
function publishGraphs({ stage = DEFAULT_STAGE, destinationRoots = [ROOT, path.join(ROOT, 'desktop/web-app/public')] } = {}) {
  const metadata = JSON.parse(fs.readFileSync(path.join(stage, 'engine_runtime_integrity.json'), 'utf8'));
  const provenance = JSON.parse(fs.readFileSync(path.join(stage, 'runtime-code-provenance.json'), 'utf8'));
  const files = Object.fromEntries(provenance.outputs.map(output => [output.sha384, output.file]));
  const copies = [];
  for (const asset of Object.values(metadata.assets)) {
    if (!/^runtime_assets\/engine\/[a-z0-9.-]+\.[a-f0-9]{24}\.(?:mjs|wasm|data)$/.test(asset.path)) throw new Error('Unexpected runtime asset destination');
    const file = files[asset.sha384];
    if (!file || path.basename(file) !== file) throw new Error('Runtime provenance source is not a local filename');
    const source = path.join(stage, file), sourceStat = fs.lstatSync(source);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error('Runtime source must be an ordinary file');
    const bytes = fs.readFileSync(source); assertSourcePin(bytes, asset);
    if (asset.kind === 'module') assertClosedCode(bytes.toString('utf8'));
    for (const destinationRoot of destinationRoots) {
      const root = path.resolve(destinationRoot), destination = path.resolve(root, asset.path);
      if (!destination.startsWith(root + path.sep)) throw new Error('Runtime asset escaped destination root');
      for (let current = destination; ; current = path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Runtime destination may not traverse symlinks');
        if (current === root) break;
      }
      const exists = fs.existsSync(destination);
      if (exists) assertSourcePin(fs.readFileSync(destination), asset);
      copies.push({ source, destination, exists, ...asset });
    }
  }
  for (const copy of copies) if (!copy.exists) {
    fs.mkdirSync(path.dirname(copy.destination), { recursive: true });
    fs.copyFileSync(copy.source, copy.destination, fs.constants.COPYFILE_EXCL);
    assertSourcePin(fs.readFileSync(copy.destination), copy);
  }
  return { assets: Object.keys(metadata.assets).length, created: copies.filter(copy => !copy.exists).length, verifiedExisting: copies.filter(copy => copy.exists).length };
}

function applyEdits(source, edits) {
  const selected = edits.filter(item => !edits.some(other => other !== item && other.start <= item.start && other.end >= item.end && (other.start < item.start || other.end > item.end)));
  for (const item of selected.sort((a, b) => b.start - a.start)) source = source.slice(0, item.start) + item.text + source.slice(item.end);
  return source;
}

if (require.main === module) {
  const names = process.argv.filter(arg => arg.startsWith('--graph=')).map(arg => arg.slice(8));
  buildGraphs({ allowFetch: process.argv.includes('--fetch'), ...(names.length ? { names } : {}) })
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { ENTRIES, RESOURCES, DEFAULT_STAGE, PINS_FILE, assertPinnedCodeUrl, assertSourcePin, inspectCode, assertClosedCode, download, graphMetadata, runtimeAssetPath, buildGraphs, publishGraphs };
