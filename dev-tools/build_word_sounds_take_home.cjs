// Embeds the take-home activity adapters (word_sounds_take_home/adapters/*.js)
// into word_sounds_take_home_loader.js between the GENERATED ADAPTERS markers,
// and the check adapters (word_sounds_take_home/check_adapters/*.js) between
// the GENERATED CHECK ADAPTERS markers, then copies the loader to its three
// desktop mirrors.
//
//   node dev-tools/build_word_sounds_take_home.cjs           build + mirror
//   node dev-tools/build_word_sounds_take_home.cjs --check   fail if stale
//
// Each adapter file is CommonJS (module.exports = { id, title, labels,
// prepare, render }) and is wrapped in its own function scope, so helpers it
// defines for prepare() stay private. render() must still use only its
// arguments: it is copied into the learner's file with toString(). A check
// adapter also has score(), copied the same way.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LOADER = path.join(ROOT, 'word_sounds_take_home_loader.js');
const MIRRORS = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
// Check adapters are not Word Sounds activities: they go into CHECK_ADAPTERS,
// which the app's take-home dialog never lists.
const GROUPS = [
  { dir: 'adapters', target: 'ADAPTERS', name: 'GENERATED ADAPTERS', copied: ['render'] },
  { dir: 'check_adapters', target: 'CHECK_ADAPTERS', name: 'GENERATED CHECK ADAPTERS', copied: ['render', 'score'] },
];

function generate(group) {
  const DIR = path.join(ROOT, 'word_sounds_take_home', group.dir);
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
    for (const key of ['id', 'title', 'labels', 'prepare'].concat(group.copied)) if (a[key] == null) throw new Error(file + ': missing ' + key);
    if (a.id !== id) throw new Error(file + ': id ' + a.id + ' does not match its file name');
    Object.keys(a.labels).forEach(k => { if (!k.startsWith(id + '_')) throw new Error(file + ': label ' + k + ' must start with ' + id + '_'); });
    // What is copied into the file must stand alone: compile it with nothing in scope.
    for (const key of group.copied) new Function('return (' + a[key].toString() + ');')();
    ids.push(id);
    return '  ' + group.target + '[' + JSON.stringify(id) + '] = (function () {\n    var module = { exports: {} };\n'
      + source.split('\n').map(line => (line ? '    ' + line : line)).join('\n')
      + '\n    return module.exports;\n  })();';
  });
  const begin = '  // BEGIN ' + group.name + ' (dev-tools/build_word_sounds_take_home.cjs)';
  const end = '  // END ' + group.name;
  return { ids, text: begin + '\n' + blocks.join('\n') + (blocks.length ? '\n' : '') + end,
    pattern: new RegExp('  // BEGIN ' + group.name + '[^\\n]*\\n[\\s\\S]*?  // END ' + group.name + '(?=\\n)') };
}

const loader = fs.readFileSync(LOADER, 'utf8');
let next = loader;
const ids = [];
const counts = [];
for (const group of GROUPS) {
  const made = generate(group);
  if (!made.pattern.test(next)) throw new Error('loader has no ' + group.name + ' markers');
  next = next.replace(made.pattern, () => made.text);
  ids.push(...made.ids);
  counts.push(made.ids.length + ' ' + group.dir.replace(/_/g, ' '));
}
if (process.argv.includes('--check')) {
  const stale = [next !== loader ? 'word_sounds_take_home_loader.js' : null]
    .concat(MIRRORS.map(m => path.join(ROOT, m, 'word_sounds_take_home_loader.js')).filter(p => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next).map(p => path.relative(ROOT, p)))
    .filter(Boolean);
  if (stale.length) { console.error('Stale take-home loader: ' + stale.join(', ')); process.exit(1); }
  console.log('take-home loader is current (' + counts.join(', ') + ')');
  process.exit(0);
}
// --no-mirrors: write the loader only (the mirrors are then stale until a full build).
const writeAtomic = (file, content) => { const tmp = file + '.th-' + process.pid + '.tmp'; fs.writeFileSync(tmp, content); fs.renameSync(tmp, file); };
if (next !== loader) writeAtomic(LOADER, next);
if (!process.argv.includes('--no-mirrors')) MIRRORS.forEach(m => { const p = path.join(ROOT, m, 'word_sounds_take_home_loader.js'); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next) writeAtomic(p, next); });
console.log('take-home loader: ' + counts.join(', ') + ' (' + ids.join(', ') + ')');
