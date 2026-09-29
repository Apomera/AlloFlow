// Register only keys introduced by this change, preserving other catalog edits.
const fs = require('node:fs');
const cp = require('node:child_process');
const acorn = require('acorn');
function keys(source) {
  const out = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && ['__alloT', 'tr'].includes(node.callee.name)) {
      const [key, fallback] = node.arguments;
      if (typeof key?.value === 'string' && key.value.startsWith('stem.physics.') && typeof fallback?.value === 'string') out.set(key.value.slice(13), fallback.value);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(acorn.parse(source, { ecmaVersion: 'latest' }));
  return out;
}
const before = keys(cp.execFileSync('git', ['show', 'HEAD:stem_lab/stem_tool_physics.js'], { encoding: 'utf8', maxBuffer: 2e6 }));
const introduced = [...keys(fs.readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))].filter(([k]) => !before.has(k));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = acorn.parseExpressionAt(source, 0, { ecmaVersion: 'latest' });
  const branch = (node, key) => node.properties.find(p => (p.key.value || p.key.name) === key).value;
  const physics = branch(branch(ast, 'stem'), 'physics');
  const present = new Set(physics.properties.map(p => p.key.value || p.key.name));
  const additions = introduced.filter(([key]) => !present.has(key));
  if (additions.length) {
    const lines = additions.map(([key, value]) => '      ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',').join('\n');
    const result = source.slice(0, physics.start + 1) + '\n' + lines + source.slice(physics.start + 1);
    JSON.parse(result);
    const temporary = file + '.physics-strings.tmp';
    fs.writeFileSync(temporary, result);
    if (fs.readFileSync(file, 'utf8') !== source) throw new Error('Catalog changed during registration; rerun: ' + file);
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(temporary, file); break; }
      catch (error) {
        if (attempt === 7 || !['EPERM', 'EBUSY', 'UNKNOWN', 'EACCES'].includes(error.code)) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
        if (fs.readFileSync(file, 'utf8') !== source) throw new Error('Catalog changed during retry; rerun: ' + file);
      }
    }
  }
  console.log(file + ': ' + additions.length + ' keys registered');
}
