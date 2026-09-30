const fs = require('node:fs');
const acorn = require('acorn');
const sourceFile = 'stem_lab/stem_tool_microbiology.js';
const source = fs.readFileSync(sourceFile, 'utf8');
const strings = new Map();
// Existing-file handles avoid recreation failures in synchronized Windows folders.
function writeExisting(file, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, bytes); fs.ftruncateSync(fd, bytes.length); }
  finally { fs.closeSync(fd); }
}
function walk(node) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const name = node.callee.name;
    const [key, fallback] = node.arguments;
    if (key?.type === 'Literal' && typeof key.value === 'string' && fallback?.type === 'Literal' && typeof fallback.value === 'string') {
      if (name === 'gt') strings.set('stem.microbiology.investigation_' + key.value, fallback.value);
      if (name === 'mt') strings.set('stem.microbiology.mystery_' + key.value, fallback.value);
      if (name === 'qt') strings.set('stem.microbiology.quiz_' + key.value, fallback.value);
      if (name === 'pt') strings.set('stem.microbiology.print_' + key.value, fallback.value);
      if (name === 'ht') strings.set('stem.microbiology.workspace_' + key.value, fallback.value);
      if (name === 'glt') strings.set('stem.microbiology.gram_lab_' + key.value, fallback.value);
      if (name === 'ct') strings.set('stem.microbiology.resistance_comparison_' + key.value, fallback.value);
      if (['__alloT', '__alloMBT'].includes(name) && key.value.startsWith('stem.microbiology.')) strings.set(key.value, fallback.value);
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value.type === 'string') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 2022 }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  let text = fs.readFileSync(file, 'utf8');
  const value = JSON.parse(text);
  const missing = [...strings].filter(([key]) => typeof value.stem.microbiology[key.slice('stem.microbiology.'.length)] !== 'string');
  if (missing.length) {
    const marker = '    "microbiology": {';
    const start = text.indexOf(marker);
    if (start < 0 || text.indexOf(marker, start + 1) !== -1) throw new Error('Ambiguous Micro Lab namespace');
    const expression = acorn.parseExpressionAt(text, text.indexOf('{', start), { ecmaVersion: 2022 });
    const micro = expression.type === 'SequenceExpression' ? expression.expressions[0] : expression;
    if (micro.type !== 'ObjectExpression') throw new Error('Invalid Micro Lab namespace');
    const last = micro.properties.at(-1);
    const inserted = missing.map(([key, fallback]) => '      ' + JSON.stringify(key.slice('stem.microbiology.'.length)) + ': ' + JSON.stringify(fallback)).join(',\n');
    text = text.slice(0, last.end) + ',\n' + inserted + text.slice(last.end);
    JSON.parse(text);
    writeExisting(file, text);
  }
  console.log(file + ': registered ' + missing.length + ' new Micro Lab strings');
}
writeExisting('desktop/web-app/public/stem_lab/stem_tool_microbiology.js', fs.readFileSync(sourceFile));
console.log('Micro Lab runtime mirror synchronized.');
