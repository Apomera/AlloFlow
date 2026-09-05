#!/usr/bin/env node
'use strict';
// Generates a compact Canvas source plus a minified CDN overlay. Never edits
// canonical sources, generated public mirrors, or the active deployment build.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const esbuild = require('esbuild');
const { parse } = require('@babel/parser');
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'scratch', 'performance-release');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');

function minify(source, { canvas = false } = {}) {
  const ast = parse(source, { sourceType: 'unambiguous', plugins: canvas ? ['jsx'] : [] });
  // Many project notices are ordinary comments rather than /*! comments.
  // Preserve those explicitly as well as third-party copyright/license notices.
  const notices = ast.comments.filter(comment => /copyright|licen[cs]e|@preserve|@license|\bAGPL\b|GNU Affero/i.test(comment.value))
    .map(comment => source.slice(comment.start, comment.end));
  const banner = (canvas ? '// @mode react\n' : '')
    + Array.from(new Set(notices)).join('\n') + '\n';
  // JSX is compiled later by Canvas. Keep import bindings verbatim: esbuild
  // otherwise drops a React binding used only by the later JSX transform.
  const imports = canvas ? ast.program.body.filter(node => node.type === 'ImportDeclaration') : [];
  let input = source;
  for (const node of [...imports].reverse()) input = input.slice(0, node.start) + input.slice(node.end);
  const importText = imports.map(node => source.slice(node.start, node.end)).join('\n');
  const result = esbuild.transformSync(input, {
    loader: canvas ? 'jsx' : 'js', jsx: 'preserve', target: 'es2020',
    minify: true, keepNames: true, legalComments: 'none', charset: 'utf8',
  }).code;
  const output = banner + (importText ? importText + '\n' : '') + result;
  parse(output, { sourceType: 'unambiguous', plugins: canvas ? ['jsx'] : [] });
  return output;
}

function modulePaths(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const files = new Set();
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.name === 'loadModule') {
      const url = node.arguments[1]?.value;
      if (typeof url === 'string') {
        const file = url.startsWith('https://alloflow-cdn.pages.dev/')
          ? new URL(url).pathname.slice(1) : url.startsWith('./') ? url.slice(2).split('?')[0] : null;
        if (file && /^[a-zA-Z0-9_./-]+\.js$/.test(file) && !file.split('/').includes('..')) files.add(file);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast.program);
  return [...files].sort();
}
function metrics(source, output) {
  return {
    sourceSha256: sha(source), outputSha256: sha(output),
    sourceBytes: Buffer.byteLength(source), outputBytes: Buffer.byteLength(output),
    sourceGzipBytes: zlib.gzipSync(source).length, outputGzipBytes: zlib.gzipSync(output).length,
  };
}
function build({ check = false } = {}) {
  const source = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const canvas = minify(source, { canvas: true });
  const outputs = new Map([['AlloFlowANTI.compact.txt', canvas]]);
  const manifest = { formatVersion: 1, canvas: metrics(source, canvas), modules: [], totals: {} };
  for (const file of modulePaths(source)) {
    const original = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const compact = minify(original);
    outputs.set('cdn/' + file, compact);
    manifest.modules.push({ file, ...metrics(original, compact) });
  }
  for (const key of ['sourceBytes', 'outputBytes', 'sourceGzipBytes', 'outputGzipBytes']) {
    manifest.totals[key] = manifest.modules.reduce((total, item) => total + item[key], 0);
  }
  outputs.set('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  outputs.set('README.txt', 'Generated from the source hashes in manifest.json.\n'
    + 'AlloFlowANTI.compact.txt preserves JSX, imports, the Canvas mode directive, and license notices.\n'
    + 'cdn/ is a PARTIAL overlay with original relative module paths, not a complete site.\n'
    + 'Use it only in a separately prepared deployment after normal module/companion-asset generation.\n'
    + 'Canvas URLs remain canonical; newly extracted modules must be published before the Canvas file is distributed.\n'
    + 'Do not deploy this directory as a standalone site or apply immutable caching to mutable filenames.\n'
    + 'Canonical sources, desktop public mirrors, and the active build were not rewritten.\n');
  for (const [relative, content] of outputs) {
    const file = path.join(OUTPUT, relative);
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) throw new Error('Stale/missing performance artifact: ' + relative);
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) fs.writeFileSync(file, content);
    }
  }
  console.log(JSON.stringify({ output: OUTPUT, canvas: manifest.canvas, modules: manifest.modules.length, totals: manifest.totals }, null, 2));
  return manifest;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) { console.error('Usage: node dev-tools/build_performance_release.cjs [--check]'); process.exitCode = 1; }
  else { try { build({ check: args.includes('--check') }); } catch (error) { console.error(error.message); process.exitCode = 1; } }
}
module.exports = { minify, modulePaths, metrics, build };
