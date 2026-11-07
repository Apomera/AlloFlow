// Embeds the take-home activity adapters (word_sounds_take_home/adapters/*.js)
// into word_sounds_take_home_loader.js between the GENERATED ADAPTERS markers,
// then copies the loader to its three desktop mirrors.
//
//   node dev-tools/build_word_sounds_take_home.cjs           build + mirror
//   node dev-tools/build_word_sounds_take_home.cjs --check   fail if stale
//
// Each adapter file is CommonJS (module.exports = { id, title, labels,
// prepare, render }) and is wrapped in its own function scope, so helpers it
// defines for prepare() stay private. render() must still use only its
// arguments: it is copied into the learner's file with toString().
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LOADER = path.join(ROOT, 'word_sounds_take_home_loader.js');
const DIR = path.join(ROOT, 'word_sounds_take_home', 'adapters');
const MIRRORS = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
const BEGIN = '  // BEGIN GENERATED ADAPTERS (dev-tools/build_word_sounds_take_home.cjs)';
const END = '  // END GENERATED ADAPTERS';

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /^[a-z_]+\.js$/.test(f)).sort() : [];
const ids = [];
const blocks = files.map(file => {
  const id = file.replace(/\.js$/, '');
  const source = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r\n/g, '\n').trim();
  if (/\brequire\s*\(/.test(source)) throw new Error(file + ': adapters may not require()');
  // Load it once here to prove it is a well-formed adapter for this id.
  const mod = { exports: {} };
  new Function('module', 'exports', source)(mod, mod.exports);
  const a = mod.exports;
  for (const key of ['id', 'title', 'labels', 'prepare', 'render']) if (a[key] == null) throw new Error(file + ': missing ' + key);
  if (a.id !== id) throw new Error(file + ': id ' + a.id + ' does not match its file name');
  Object.keys(a.labels).forEach(k => { if (!k.startsWith(id + '_')) throw new Error(file + ': label ' + k + ' must start with ' + id + '_'); });
  // render must stand alone: compile it with nothing in scope.
  new Function('return (' + a.render.toString() + ');')();
  ids.push(id);
  return '  ADAPTERS[' + JSON.stringify(id) + '] = (function () {\n    var module = { exports: {} };\n'
    + source.split('\n').map(line => (line ? '    ' + line : line)).join('\n')
    + '\n    return module.exports;\n  })();';
});
const generated = BEGIN + '\n' + blocks.join('\n') + '\n' + END;

const loader = fs.readFileSync(LOADER, 'utf8');
const pattern = /  \/\/ BEGIN GENERATED ADAPTERS[^\n]*\n[\s\S]*?  \/\/ END GENERATED ADAPTERS/;
if (!pattern.test(loader)) throw new Error('loader has no GENERATED ADAPTERS markers');
const next = loader.replace(pattern, () => generated);
if (process.argv.includes('--check')) {
  const stale = [next !== loader ? 'word_sounds_take_home_loader.js' : null]
    .concat(MIRRORS.map(m => path.join(ROOT, m, 'word_sounds_take_home_loader.js')).filter(p => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next).map(p => path.relative(ROOT, p)))
    .filter(Boolean);
  if (stale.length) { console.error('Stale take-home loader: ' + stale.join(', ')); process.exit(1); }
  console.log('take-home loader is current (' + ids.length + ' generated adapters)');
  process.exit(0);
}
const writeAtomic = (file, content) => { const tmp = file + '.th-' + process.pid + '.tmp'; fs.writeFileSync(tmp, content); fs.renameSync(tmp, file); };
if (next !== loader) writeAtomic(LOADER, next);
MIRRORS.forEach(m => { const p = path.join(ROOT, m, 'word_sounds_take_home_loader.js'); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next) writeAtomic(p, next); });
console.log('take-home loader: ' + ids.length + ' generated adapters (' + ids.join(', ') + ')');
