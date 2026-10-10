// Register this panel's English fallbacks without rewriting other owners' sections.
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '../..');
const jsx = fs.readFileSync(path.join(root, 'view_misc_panels_source.jsx'), 'utf8');
const ast = parser.parse(jsx, { sourceType: 'script', plugins: ['jsx'] });
const delta = {};
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee?.name === 'sourceText') {
    const [key, fallback] = node.arguments;
    if (key?.type === 'StringLiteral' && key.value.startsWith('input.research_') && fallback?.type === 'StringLiteral') delta[key.value.slice(6)] = fallback.value;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(ast);
for (const name of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const target = path.join(root, name);
  const before = fs.readFileSync(target, 'utf8');
  const parsed = JSON.parse(before);
  const object = parser.parseExpression(before);
  const input = object.properties.find(property => property.key.value === 'input').value;
  const afterInput = { ...parsed.input, ...delta };
  const replacement = JSON.stringify(afterInput, null, 2).replace(/\n/g, '\n  ');
  const after = before.slice(0, input.start) + replacement + before.slice(input.end);
  if (before !== fs.readFileSync(target, 'utf8')) throw new Error('Strings changed during synchronization: ' + name);
  if (after !== before) fs.writeFileSync(target, after);
  const verified = parser.parseExpression(fs.readFileSync(target, 'utf8')).properties.find(property => property.key.value === 'input').value;
  const keys = verified.properties.map(property => property.key.value);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate input localization keys');
}
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify({ input: delta }, null, 2) + '\n');
console.log(JSON.stringify({ registered: Object.keys(delta).length }));
