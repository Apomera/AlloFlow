#!/usr/bin/env node
'use strict';

// Read-only publication gate for the specifically reviewed loader boundaries.
// This checks hardening markers in real callable ASTs and byte parity; it does
// not claim that every unrelated source edit has been compiled.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const parser = require('@babel/parser');
const acorn = require('acorn');
const ROOT = path.resolve(__dirname, '..');
const DISPATCHER = '__alloConfigureTrustedScript';
const COMPILED = Object.freeze([
  { source: 'allo_commands_source.jsx', compiled: 'allo_commands_module.js', loaders: [['_deviceStorage', 1]], whisper: true },
  { source: 'utils_pure_source.jsx', compiled: 'utils_pure_module.js', loaders: [['_dsBridge', 1]] },
  { source: 'text_utility_helpers_source.jsx', compiled: 'text_utility_helpers_module.js', loaders: [['openDeviceStorageProbe', 1]] },
  { source: 'view_persona_chat_source.jsx', compiled: 'view_persona_chat_module.js', loaders: [['_ensureDeviceStorage', 1]] },
  { source: 'teacher_source.jsx', compiled: 'teacher_module.js', loaders: [['ConceptQuestTeacherControlsLoader', 2]] },
  { source: 'view_educator_hub_modal_source.jsx', compiled: 'view_educator_hub_modal_module.js', loaders: [['_loadEducatorAlloSheetBridge', 1]] },
  { source: 'doc_pipeline_source.jsx', compiled: 'doc_pipeline_module.js', loaders: [['_configureTrustedDocumentScript', 1]], document: true },
  { source: 'view_pdf_audit_source.jsx', compiled: 'view_pdf_audit_module.js', loaders: [], comparePdf: true },
]);
const STEM = Object.freeze([
  { source: 'stem_lab/stem_tool_birdlab.js', loaders: [['loadBirdlab3D', 1]] },
  { source: 'stem_lab/stem_tool_coralreef.js', loaders: [['loadCompanion', 1]] },
  { source: 'stem_lab/stem_tool_raptorhunt.js', loaders: [['ensureRaptorFeatherArt', 1], ['ensureRaptorWoodlandBirds', 1], ['setupBloom', 1]] },
  { source: 'stem_lab/stem_tool_universe.js', loaders: [['loadUniverseFlight', 1]] },
  { source: 'stem_lab/stem_tool_coding.js', loaders: [['loadCodingBlocklyRuntime', 1]] },
  { source: 'stem_lab/stem_tool_freeforms.js', loaders: [['_loadScript', 1]] },
  { source: 'stem_lab/stem_tool_lumen.js', loaders: [['lazyLoadPdfJs', 1]], lumenPdf: true },
]);
const RUNTIME = Object.freeze([
  { source: 'piper_tts_loader.js', markers: ['__alloLoadVerifiedRuntime'], graphs: ['piper'] },
  { source: 'kokoro_tts_loader.js', markers: ['__alloCreateVerifiedWorker'], graphs: ['kokoro'] },
  { source: 'sd_turbo_loader.js', markers: ['__alloLoadVerifiedRuntime'], graphs: ['ort121', 'transformers331'] },
  { source: 'data_kernel_loader.js', markers: ['__alloLoadVerifiedRuntime', '__alloGetVerifiedRuntimeAsset'], graphs: ['duckdb'] },
]);

function regular(root, relative) {
  let file = path.resolve(root);
  for (const part of relative.split('/')) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part)) throw Error('Invalid gate path');
    file = path.join(file, part);
    if (fs.lstatSync(file).isSymbolicLink()) throw Error('Loader gate path is a symlink: ' + relative);
  }
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 32 * 1024 * 1024) throw Error('Loader gate input must be a bounded regular file: ' + relative);
  return fs.readFileSync(file);
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(value => walk(value, visit)); return; }
  if (typeof node.type !== 'string') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (!['loc', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens'].includes(key)) walk(value, visit);
  }
}
function parse(bytes, file) {
  try { return parser.parse(bytes.toString('utf8'), { sourceType: 'unambiguous', plugins: ['jsx'], allowReturnOutsideFunction: true, attachComment: false }); }
  catch (error) { throw Error('Cannot parse guarded loader ' + file + ': ' + error.message); }
}
function property(node, name) {
  return node && (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')
    && (node.computed ? node.property.type === 'StringLiteral' && node.property.value === name : node.property.name === name);
}
function dispatcher(node) { return property(node, DISPATCHER) && node.object.type === 'Identifier' && node.object.name === 'window'; }
function dispatcherValue(node) {
  return dispatcher(node) || node?.type === 'LogicalExpression' && node.operator === '&&' && dispatcherValue(node.right)
    || node?.type === 'ConditionalExpression' && dispatcherValue(node.consequent) && node.alternate.type === 'NullLiteral';
}
function callable(ast, name) {
  const matches = [];
  walk(ast, node => {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) matches.push(node);
    if (node.type === 'FunctionExpression' && node.id?.name === name) matches.push(node);
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || node.id.name !== name) return;
    const init = node.init;
    if (init && ['ArrowFunctionExpression', 'FunctionExpression'].includes(init.type)) matches.push(init);
    else if (init?.type === 'CallExpression') {
      const callback = init.arguments.find(value => ['ArrowFunctionExpression', 'FunctionExpression'].includes(value.type));
      if (callback) matches.push(callback);
    }
  });
  if (matches.length !== 1) throw Error('Expected one callable ' + name + '; found ' + matches.length);
  return matches[0];
}
function inspectGuard(ast, name, requiredCalls) {
  const scope = callable(ast, name), aliases = new Set();
  walk(scope, node => { if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && dispatcherValue(node.init)) aliases.add(node.id.name); });
  const selected = node => dispatcher(node) || node?.type === 'Identifier' && aliases.has(node.name);
  let references = 0, typeChecks = 0, calls = 0, rawWrites = 0, directImports = 0;
  walk(scope, node => {
    if (dispatcher(node)) references++;
    if (node.type === 'UnaryExpression' && node.operator === 'typeof' && selected(node.argument)) typeChecks++;
    if (node.type === 'CallExpression' && selected(node.callee)) calls++;
    if (node.type === 'AssignmentExpression' && property(node.left, 'src')) rawWrites++;
    if (node.type === 'CallExpression' && property(node.callee, 'setAttribute') && node.arguments[0]?.type === 'StringLiteral' && node.arguments[0].value.toLowerCase() === 'src') rawWrites++;
    if (node.type === 'ImportExpression' || node.type === 'CallExpression' && node.callee.type === 'Import') directImports++;
    if (node.type === 'CallExpression' && property(node.callee, 'assign') && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Object'
      && node.arguments.slice(1).some(argument => argument.type === 'ObjectExpression' && argument.properties.some(prop =>
        prop.type === 'ObjectProperty' && (prop.computed ? prop.key.value : prop.key.name || prop.key.value) === 'src'))) rawWrites++;
    if (node.type === 'CallExpression' && property(node.callee, 'set') && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Reflect'
      && node.arguments[1]?.type === 'StringLiteral' && node.arguments[1].value === 'src') rawWrites++;
  });
  if (!references || !typeChecks || calls < requiredCalls || rawWrites || directImports) throw Error(name + ' lacks guarded delivery (references=' + references + ', typeChecks=' + typeChecks + ', signedCalls=' + calls + ', rawSrcWrites=' + rawWrites + ', legacyImports=' + directImports + ')');
  return { name, calls, typeChecks };
}
function runtimeMarkers(ast, markers, graphs, label, forbidImports = true) {
  const found = new Set(), strings = new Set(); let directImports = 0;
  walk(ast, node => {
    if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'window') {
      const name = node.computed ? node.property.value : node.property.name; if (markers.includes(name)) found.add(name);
    }
    if (node.type === 'StringLiteral') strings.add(node.value);
    if (node.type === 'ImportExpression' || node.type === 'CallExpression' && node.callee.type === 'Import') directImports++;
    if (['NewExpression', 'CallExpression'].includes(node.type) && node.callee.type === 'Identifier' && node.callee.name === 'Function'
      && node.arguments.some(value => value.type === 'StringLiteral' && /\bimport\s*\(/.test(value.value))) directImports++;
  });
  const missing = markers.filter(marker => !found.has(marker)).concat(graphs.filter(graph => !strings.has(graph)));
  if (missing.length || forbidImports && directImports) throw Error(label + ' lacks verified graph delivery (missing=' + missing.join(',') + ', legacyImports=' + directImports + ')');
}
function inspectDocument(ast) {
  runtimeMarkers(ast, ['__alloGetVerifiedRuntimeAsset', '__alloCreateVerifiedWorker', '__alloFetchTrustedScriptText'], ['pdfjs', 'tesseract'], 'Document pipeline', false);
  let dispatches = 0, pdfCalls = 0, unsafePdf = 0, workerPaths = 0;
  const falseValue = node => node?.type === 'BooleanLiteral' && node.value === false
    || node?.type === 'UnaryExpression' && node.operator === '!' && node.argument.type === 'NumericLiteral' && node.argument.value !== 0;
  walk(ast, node => {
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === '_configureTrustedDocumentScript') dispatches++;
    if (node.type === 'ObjectProperty' && (node.computed ? node.key.value : node.key.name || node.key.value) === 'workerPath') workerPaths++;
    if (node.type === 'CallExpression' && property(node.callee, 'getDocument')) {
      pdfCalls++;
      const options = node.arguments[0], props = options?.type === 'ObjectExpression' ? options.properties : [];
      const position = props.findLastIndex(prop => prop.type === 'ObjectProperty' && (prop.computed ? prop.key.value : prop.key.name || prop.key.value) === 'isEvalSupported');
      if (position < 0 || !falseValue(props[position].value) || props.slice(position + 1).some(prop => prop.type === 'SpreadElement' || prop.computed)) unsafePdf++;
    }
    // The PDF raster worker is assembled from literal source lines. Check its
    // real code line as well as the nine ordinary AST getDocument calls.
    if (node.type === 'StringLiteral' && /\.getDocument\s*\(/.test(node.value)) {
      const calls = [...node.value.matchAll(/\.getDocument\s*\(/g)].length;
      const guarded = [...node.value.matchAll(/\.getDocument\s*\(\s*\{[^}]*\bisEvalSupported\s*:\s*false\b/g)].length;
      pdfCalls += calls; unsafePdf += calls - guarded;
    }
  });
  if (dispatches < 8 || pdfCalls < 10 || unsafePdf || !workerPaths) throw Error('Document pipeline hardening incomplete (signedCalls=' + dispatches + ', pdfCalls=' + pdfCalls + ', unsafePdf=' + unsafePdf + ', workerPaths=' + workerPaths + ')');
}

function embeddedCallable(ast, name) {
  const matches = [], pattern = new RegExp('\\bfunction\\s+' + name + '\\s*\\(', 'g');
  walk(ast, node => {
    const text = node.type === 'StringLiteral' ? node.value : node.type === 'TemplateElement' ? node.value.cooked : null;
    if (typeof text !== 'string') return;
    for (const match of text.matchAll(pattern)) {
      // Parse the literal popup program as code, without evaluating interpolation
      // or relying on brace matching inside strings, comments or regular expressions.
      const program = text.slice(match.index).replace(/<\/script\b[^>]*>/i, ';');
      const expression = acorn.parseExpressionAt(program, 0, { ecmaVersion: 'latest' });
      const parsed = parse(Buffer.from(program.slice(0, expression.end)), 'embedded ' + name);
      matches.push(callable(parsed, name));
    }
  });
  if (matches.length !== 1) throw Error('Expected one embedded callable ' + name + '; found ' + matches.length);
  return matches[0];
}
function pdfFloor(scope, label) {
  let calls = 0, unsafe = 0;
  walk(scope, node => {
    if (node.type !== 'CallExpression' || !property(node.callee, 'getDocument')) return;
    calls++;
    const props = node.arguments[0]?.type === 'ObjectExpression' ? node.arguments[0].properties : [];
    const position = props.findLastIndex(prop => prop.type === 'ObjectProperty' && (prop.computed ? prop.key.value : prop.key.name || prop.key.value) === 'isEvalSupported');
    const value = props[position]?.value;
    const disabled = value?.type === 'BooleanLiteral' && value.value === false
      || value?.type === 'UnaryExpression' && value.operator === '!' && value.argument.type === 'NumericLiteral' && value.argument.value !== 0;
    if (position < 0 || !disabled || props.slice(position + 1).some(prop => prop.type === 'SpreadElement' || prop.computed)) unsafe++;
  });
  if (!calls || unsafe) throw Error(label + ' PDF evaluation ceiling is missing (pdfCalls=' + calls + ', unsafePdf=' + unsafe + ')');
}
function pdfBroker(scope, { opener = false } = {}) {
  const brokers = new Set(), methods = new Map(), fetchMethod = '__alloFetchTrustedScriptText', assetMethod = '__alloGetVerifiedRuntimeAsset';
  const anchor = node => opener ? property(node, 'opener') && node.object.type === 'Identifier' && node.object.name === 'window'
    || node?.type === 'Identifier' && brokers.has(node.name) : node?.type === 'Identifier' && node.name === 'window';
  walk(scope, node => { if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && property(node.init, 'opener')
    && node.init.object.type === 'Identifier' && node.init.object.name === 'window') brokers.add(node.id.name); });
  walk(scope, node => { if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') for (const name of [fetchMethod, assetMethod]) {
    if (property(node.init, name) && anchor(node.init.object)) methods.set(node.id.name, name);
  } });
  const selected = (node, name) => property(node, name) && anchor(node.object) || node?.type === 'Identifier' && methods.get(node.name) === name;
  const call = (node, name) => node?.type === 'CallExpression' && selected(node.callee, name);
  const awaited = node => node?.type === 'AwaitExpression' ? node.argument : node;
  const codes = new Set(), assets = new Set(), blobs = new Set(); let fetches = 0, workers = 0, typeChecks = 0, srcWrites = 0, workerWrites = 0, unsafeWrites = 0;
  walk(scope, node => {
    if (node.type === 'UnaryExpression' && node.operator === 'typeof' && [fetchMethod, assetMethod].some(name => selected(node.argument, name))) typeChecks++;
    if (call(node, fetchMethod) && node.arguments[0]?.value === 'https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js' && node.arguments[1]?.value === 'pdfjs.main') fetches++;
    if (call(node, assetMethod) && node.arguments[0]?.value === 'pdfjs' && node.arguments[1]?.value === 'worker') workers++;
    const target = node.type === 'VariableDeclarator' ? node.id : node.type === 'AssignmentExpression' ? node.left : null;
    const value = awaited(node.type === 'VariableDeclarator' ? node.init : node.type === 'AssignmentExpression' ? node.right : null);
    if (target?.type === 'Identifier' && call(value, fetchMethod)) codes.add(target.name);
    if (target?.type === 'Identifier' && call(value, assetMethod)) assets.add(target.name);
  });
  walk(scope, node => {
    const target = node.type === 'VariableDeclarator' ? node.id : node.type === 'AssignmentExpression' ? node.left : null;
    const value = node.type === 'VariableDeclarator' ? node.init : node.type === 'AssignmentExpression' ? node.right : null;
    const blob = value?.type === 'CallExpression' && property(value.callee, 'createObjectURL') && value.callee.object.name === 'URL' ? value.arguments[0] : null;
    const contents = blob?.type === 'NewExpression' && blob.callee.name === 'Blob' ? blob.arguments[0] : null;
    if (target?.type === 'Identifier' && contents?.type === 'ArrayExpression' && contents.elements.length === 1 && codes.has(contents.elements[0]?.name)) blobs.add(target.name);
  });
  walk(scope, node => {
    if (node.type !== 'AssignmentExpression') return;
    if (property(node.left, 'src')) { srcWrites++; if (!blobs.has(node.right.name)) unsafeWrites++; }
    if (property(node.left, 'workerSrc')) { workerWrites++; if (!property(node.right, 'url') || !assets.has(node.right.object.name)) unsafeWrites++; }
  });
  if (!workers || !typeChecks || !workerWrites || unsafeWrites || opener && (!fetches || !srcWrites)) throw Error('Verified PDF broker incomplete (scriptFetches=' + fetches + ', workerAssets=' + workers + ', unsafeWrites=' + unsafeWrites + ')');
}
function inspectSecondaryPdf(ast, { comparePdf, lumenPdf }) {
  if (comparePdf) {
    pdfBroker(embeddedCallable(ast, '_ensurePdfjs'), { opener: true });
    pdfFloor(embeddedCallable(ast, '_renderPdfInto'), 'Compare popup');
  }
  if (lumenPdf) {
    pdfBroker(callable(ast, 'lazyLoadPdfJs'));
    pdfFloor(callable(ast, 'extractPdfText'), 'Lumen');
  }
}

function checkPrivateLoaderCoverage({ root = ROOT, buildDir } = {}) {
  root = path.resolve(root); if (buildDir !== undefined) buildDir = path.resolve(buildDir);
  const errors = [], checked = [];
  const check = (file, action) => { try { action(); } catch (error) { errors.push(file + ': ' + error.message); } };
  const inspect = (file, loaders, whisper, document, contracts = {}) => {
    const bytes = regular(root, file), ast = parse(bytes, file), guards = loaders.map(([name, count]) => inspectGuard(ast, name, count));
    if (whisper) runtimeMarkers(callable(ast, '_getWhisperPipeline'), ['__alloLoadVerifiedRuntime'], ['transformers331'], 'Whisper');
    if (document) inspectDocument(ast);
    inspectSecondaryPdf(ast, contracts);
    checked.push({ file, sha256: createHash('sha256').update(bytes).digest('hex'), guards }); return bytes;
  };
  const parity = (reference, target, targetRoot = root) => {
    const expected = regular(root, reference), actual = regular(targetRoot, target);
    if (!actual.equals(expected)) throw Error('bytes differ from ' + reference);
    checked.push({ file: targetRoot === root ? target : path.join(targetRoot, target), sha256: createHash('sha256').update(actual).digest('hex') });
  };
  for (const item of COMPILED) {
    check(item.source, () => inspect(item.source, item.loaders, item.whisper, item.document, item));
    check(item.compiled, () => inspect(item.compiled, item.loaders, item.whisper, item.document, item));
    const mirror = 'desktop/web-app/public/' + item.compiled;
    check(mirror, () => parity(item.compiled, mirror));
    if (buildDir) check(path.join(buildDir, item.compiled), () => parity(item.compiled, item.compiled, buildDir));
  }
  for (const item of STEM) {
    check(item.source, () => inspect(item.source, item.loaders, false, false, item));
    const mirror = 'desktop/web-app/public/' + item.source;
    check(mirror, () => parity(item.source, mirror));
    if (buildDir) check(path.join(buildDir, item.source), () => parity(item.source, item.source, buildDir));
  }
  for (const item of RUNTIME) {
    check(item.source, () => { const bytes = regular(root, item.source); runtimeMarkers(parse(bytes, item.source), item.markers, item.graphs, item.source); checked.push({ file: item.source, sha256: createHash('sha256').update(bytes).digest('hex') }); });
    const mirror = 'desktop/web-app/public/' + item.source;
    check(mirror, () => parity(item.source, mirror));
    if (buildDir) check(path.join(buildDir, item.source), () => parity(item.source, item.source, buildDir));
  }
  return { ok: errors.length === 0, checked, errors };
}
function assertPrivateLoaderCoverage(options) {
  const report = checkPrivateLoaderCoverage(options);
  if (!report.ok) throw Error('Private loader publication is blocked (' + report.errors.length + '):\n' + report.errors.join('\n'));
  return report;
}
function run(args = process.argv.slice(2)) {
  let root = ROOT, buildDir, json = false;
  for (const arg of args) {
    if (arg === '--check') continue;
    if (arg === '--json') json = true;
    else if (arg.startsWith('--root=')) root = path.resolve(arg.slice(7));
    else if (arg.startsWith('--build-dir=')) buildDir = path.resolve(arg.slice(12));
    else throw Error('Only read-only --check, --json, --root and --build-dir are supported');
  }
  const report = checkPrivateLoaderCoverage({ root, buildDir });
  if (json) console.log(JSON.stringify(report));
  else if (report.ok) console.log('Private loader publication checks passed (' + report.checked.length + ' source/artifact checks).');
  else console.error('Private loader publication is blocked:\n' + report.errors.join('\n'));
  if (!report.ok) process.exitCode = 1;
  return report;
}
if (require.main === module) { try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { ROOT, COMPILED, STEM, RUNTIME, checkPrivateLoaderCoverage, assertPrivateLoaderCoverage, run };
