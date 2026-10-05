#!/usr/bin/env node
'use strict';
// Report-local preparation by default. The coordinator alone invokes --apply.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createTwoFilesPatch } = require('diff');
const parser = require('@babel/parser'), babel = require('@babel/core');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'cache-coherence');
const MANIFEST = path.join(OUT, 'prepared.json');
const LOADERS = ['utils_pure_source.jsx', 'utils_pure_module.js', 'desktop/web-app/public/utils_pure_module.js',
  'view_persona_chat_source.jsx', 'view_persona_chat_module.js', 'desktop/web-app/public/view_persona_chat_module.js',
  'export_handlers_module.js', 'desktop/web-app/public/export_handlers_module.js'];
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const FILES = [...LOADERS, ...HOSTS];
const CONTEXT = ['_build_utils_pure_module.js', '_build_view_persona_chat_module.js', 'build.js'];
const OLD = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds5-partition-consent';
const NEW = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds6-media-removal-intent';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'],
  { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
const shape = source => ({ bom: source.charCodeAt(0) === 0xfeff,
  crlf: (source.match(/\r\n/g) || []).length,
  lf: (source.replace(/\r\n/g, '').match(/\n/g) || []).length,
  loneCR: (source.replace(/\r\n/g, '').match(/\r/g) || []).length,
  finalNewline: /(?:\r\n|\n|\r)$/.test(source) });
function once(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, 'Missing/ambiguous literal: ' + label);
  assert.equal(source.split(after).length - 1, 0, 'Replacement already present: ' + label);
  const next = source.replace(before, after);
  assert.equal(next.replace(after, before), source, 'Unowned byte change: ' + label);
  assert.deepEqual(shape(next), shape(source), 'EOL/BOM/final newline drift: ' + label);
  return next;
}
function initializer(builder, name) {
  const ast = parser.parse(builder, { sourceType: 'script' }), declarations = [];
  for (const statement of ast.program.body) if (statement.type === 'VariableDeclaration') {
    for (const declaration of statement.declarations) if (declaration.id.type === 'Identifier' && declaration.id.name === name) declarations.push(declaration);
  }
  assert.equal(declarations.length, 1, 'Builder initializer: ' + name);
  return declarations[0].init;
}
function wrapUtils(source, builder) {
  const node = initializer(builder, 'outputCode');
  assert.equal(node.type, 'TemplateLiteral');
  assert.equal(node.expressions.length, 1);
  assert(node.expressions[0].type === 'Identifier' && node.expressions[0].name === 'source');
  // Evaluate only the builder's guarded string template, never its file writes.
  return new Function('source', 'return (' + builder.slice(node.start, node.end) + ');')(source);
}
function validPersonaWrapper(node) {
  if (node.type === 'BinaryExpression' && node.operator === '+') return validPersonaWrapper(node.left) && validPersonaWrapper(node.right);
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier'
    && node.object.name === 'result' && node.property.type === 'Identifier' && node.property.name === 'code';
}
function wrapPersona(source, builder) {
  const node = initializer(builder, 'moduleSrc');
  assert(validPersonaWrapper(node), 'Persona wrapper contains more than literal strings and result.code');
  const result = babel.transformSync(source, {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } },
  });
  assert(result?.code, 'Persona in-memory compilation failed');
  return new Function('result', 'return (' + builder.slice(node.start, node.end) + ');')(result);
}
function syntax(file, source) {
  if (file.endsWith('.jsx') || file.endsWith('.txt')) parser.parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] });
  else new vm.Script(source, { filename: file });
}
function prepare() {
  assert.ok(!fs.existsSync(MANIFEST), 'Retain prior preparation; use a fresh report directory for a later revision.');
  const startHead = head(), context = CONTEXT.map(file => ({ file, bytes: read(file) }));
  const builderUtils = context[0].bytes.toString('utf8'), builderPersona = context[1].bytes.toString('utf8');
  const rows = LOADERS.map((file, index) => {
    const bytes = read(file), source = bytes.toString('utf8'), next = once(source, OLD, NEW, file);
    syntax(file, next);
    return { file, index, bytes, next, beforeSha256: hash(bytes), afterSha256: hash(next), replacements: [{ before: OLD, after: NEW }] };
  });
  for (const [rootIndex, publicIndex] of [[1, 2], [4, 5], [6, 7]]) {
    assert.equal(rows[rootIndex].beforeSha256, rows[publicIndex].beforeSha256, 'Pre-existing public pair drift');
    assert.equal(rows[rootIndex].afterSha256, rows[publicIndex].afterSha256, 'Candidate public pair drift');
  }
  assert.equal(wrapUtils(rows[0].bytes.toString('utf8'), builderUtils), rows[1].bytes.toString('utf8'), 'Pre-existing UtilsPure generation drift');
  assert.equal(wrapUtils(rows[0].next, builderUtils), rows[1].next, 'Candidate UtilsPure generation drift');
  assert.equal(wrapPersona(rows[3].bytes.toString('utf8'), builderPersona), rows[4].bytes.toString('utf8'), 'Pre-existing PersonaChat generation drift');
  assert.equal(wrapPersona(rows[3].next, builderPersona), rows[4].next, 'Candidate PersonaChat generation drift');
  const pins = { utils_pure_module: rows[1].afterSha256.slice(0, 8),
    view_persona_chat_module: rows[4].afterSha256.slice(0, 8), export_handlers_module: rows[6].afterSha256.slice(0, 8) };
  for (const file of HOSTS) {
    const bytes = read(file), source = bytes.toString('utf8'), replacements = [];
    let next = source;
    for (const [moduleName, pin] of Object.entries(pins)) {
      const pattern = new RegExp('https://alloflow-cdn\\.pages\\.dev/' + moduleName + '\\.js\\?v=[a-f0-9]+', 'g');
      const matches = [...next.matchAll(pattern)];
      assert.equal(matches.length, 1, 'Unique own module URL: ' + moduleName + ': ' + file);
      const before = matches[0][0], after = 'https://alloflow-cdn.pages.dev/' + moduleName + '.js?v=' + pin;
      next = once(next, before, after, file + ': ' + moduleName); replacements.push({ before, after });
    }
    let reverse = next;
    for (const replacement of [...replacements].reverse()) reverse = reverse.replace(replacement.after, replacement.before);
    assert.equal(reverse, source, 'Unowned host byte change: ' + file); syntax(file, next);
    rows.push({ file, index: rows.length, bytes, next, replacements, beforeSha256: hash(bytes), afterSha256: hash(next) });
  }
  assert.equal(rows[8].afterSha256, rows[9].afterSha256, 'Candidate source host drift');
  assert.equal(rows[8].afterSha256, rows[10].afterSha256, 'Candidate App host drift');
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent source edit: ' + row.file);
  for (const input of context) assert.equal(hash(read(input.file)), hash(input.bytes), 'Builder/context changed: ' + input.file);
  assert.equal(head(), startHead, 'HEAD changed during preparation');
  fs.mkdirSync(path.join(OUT, 'before'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'candidate'), { recursive: true });
  const files = rows.map(row => {
    const filename = row.index + '-' + path.basename(row.file), before = 'before/' + filename,
      candidate = 'candidate/' + filename, patch = row.index + '.patch';
    fs.writeFileSync(path.join(OUT, before), row.bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, candidate), row.next, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, patch), createTwoFilesPatch(row.file, row.file, row.bytes.toString('utf8'), row.next), { flag: 'wx' });
    return { file: row.file, before, candidate, patch, replacements: row.replacements,
      beforeSha256: row.beforeSha256, afterSha256: row.afterSha256, shape: shape(row.bytes.toString('utf8')) };
  });
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit while recording: ' + row.file);
  for (const input of context) assert.equal(hash(read(input.file)), hash(input.bytes), 'Context changed while recording: ' + input.file);
  assert.equal(head(), startHead, 'HEAD changed while recording');
  fs.writeFileSync(MANIFEST, JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), startHead, files, pins,
    contextInputs: context.map(input => ({ file: input.file, sha256: hash(input.bytes) })),
    scope: 'Eight exact shared device-loader literals plus three selective own module URLs in each source host; global/build tokens untouched.',
    generation: { UtilsPure: 'existing builder string-template equality', PersonaChat: 'existing builder wrapper plus matching Babel options in memory',
      ExportHandlers: 'canonical module maintained directly; root/public byte parity' },
    limits: ['UtilsPure and ExportHandlers are not persistent build.js content-pin entries; the next coordinated build selects fresh global URLs normally.',
      'No full build, test, global token restamp or deployment was run.'],
    testsRun: false, productionApplied: false, currentCI: 'unverified' }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: path.relative(ROOT, MANIFEST), files: files.map(row => row.file), pins, testsRun: false, productionApplied: false }));
}
function apply() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.schemaVersion, 1); assert.deepEqual(manifest.files.map(row => row.file), FILES);
  assert.equal(head(), manifest.startHead, 'HEAD changed since preparation');
  for (const input of manifest.contextInputs) assert.equal(hash(read(input.file)), input.sha256, 'Changed builder/context: ' + input.file);
  for (const row of manifest.files) {
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit: ' + row.file);
    const original = fs.readFileSync(path.join(OUT, row.before));
    assert.equal(hash(original), row.beforeSha256, 'Changed before snapshot');
    let expected = original.toString('utf8');
    for (const replacement of row.replacements) expected = once(expected, replacement.before, replacement.after, row.file);
    assert.equal(hash(expected), row.afterSha256, 'Changed expected candidate');
    assert.equal(hash(fs.readFileSync(path.join(OUT, row.candidate))), row.afterSha256, 'Changed prepared candidate');
  }
  for (const row of manifest.files) {
    const target = path.join(ROOT, row.file), temporary = target + '.classroom-cache-' + process.pid + '.tmp';
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before write: ' + row.file);
    fs.writeFileSync(temporary, fs.readFileSync(path.join(OUT, row.candidate)), { flag: 'wx' });
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent edit before replacement: ' + row.file);
    fs.renameSync(temporary, target); assert.equal(hash(read(row.file)), row.afterSha256, 'Replacement mismatch');
  }
  fs.writeFileSync(path.join(OUT, 'applied.json'), JSON.stringify({ ...manifest, appliedAt: new Date().toISOString(),
    productionApplied: true }, null, 2) + '\n', { flag: 'wx' });
  console.log('Applied only eight shared loader version literals and nine selective module URL pins.');
}
if (process.argv.length === 2) prepare();
else if (process.argv.length === 3 && process.argv[2] === '--apply') apply();
else throw Error('Usage: node prepare_cache_coherence.cjs [--apply]');
