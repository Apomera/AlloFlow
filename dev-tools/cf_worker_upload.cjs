'use strict';

// Build the existing REST upload entirely locally, before authentication.
// Each ESM file is a separate multipart part; relative imports stay unchanged.
// https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/
// https://developers.cloudflare.com/workers/platform/infrastructure-as-code/
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('acorn');

function createWorkerUpload(entryPath, metadata) {
  const entry = path.resolve(entryPath);
  const root = path.dirname(entry);
  const realRoot = fs.realpathSync(root);
  const modules = new Map();
  const moduleName = filename => path.relative(root, filename).split(path.sep).join('/');
  const inside = (directory, filename) => {
    const relative = path.relative(directory, filename);
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  };

  function visit(filename) {
    if (modules.has(filename)) return; // Includes modules currently visiting a cycle.
    const name = moduleName(filename);
    if (!inside(root, filename)) throw new Error('Worker module leaves the entry directory: ' + name);
    if (!/\.(?:js|mjs)$/.test(filename)) throw new Error('Unsupported Worker module type: ' + name + ' (use local .js/.mjs ESM files)');
    let source;
    try {
      if (!inside(realRoot, fs.realpathSync(filename))) throw new Error('outside entry directory');
      source = fs.readFileSync(filename);
    } catch (_) {
      throw new Error('Cannot read Worker module: ' + name + ' (missing, unreadable, or outside entry directory)');
    }
    let ast;
    try {
      ast = parse(source.toString('utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
    } catch (error) {
      throw new Error('Cannot parse Worker ESM module ' + name + ': ' + error.message);
    }
    modules.set(filename, { name, source });

    function dependency(node) {
      if (node.type !== 'Literal' || typeof node.value !== 'string') {
        throw new Error('Unsupported computed Worker import in ' + name + '; use a literal relative .js/.mjs path');
      }
      const specifier = node.value;
      if (!/^(?:\.\/|\.\.\/)/.test(specifier) || /[\\?#%\x00-\x1f]/.test(specifier)) {
        throw new Error('Unsupported Worker import ' + JSON.stringify(specifier) + ' in ' + name + '; use local relative .js/.mjs ESM files');
      }
      visit(path.resolve(path.dirname(filename), specifier));
    }

    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration' && node.source) dependency(node.source);
      if (node.type === 'ImportExpression') dependency(node.source);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') walk(value);
      }
    }
    walk(ast);
  }

  visit(entry);
  if (!metadata || metadata.main_module !== moduleName(entry)) {
    throw new Error('Worker metadata.main_module must match the entry filename: ' + moduleName(entry));
  }
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  const ordered = [...modules.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  // Keep the existing entry part first and other filenames in deterministic order.
  ordered.unshift(ordered.splice(ordered.findIndex(module => module.name === metadata.main_module), 1)[0]);
  for (const module of ordered) {
    form.append(module.name, new Blob([module.source], { type: 'application/javascript+module' }), module.name);
  }
  return form;
}

module.exports = { createWorkerUpload };
