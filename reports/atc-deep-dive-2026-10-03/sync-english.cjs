const fs = require('node:fs');
const parser = require('@babel/parser');
const source = fs.readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
const registryFile = 'ui_strings.js';
let text = fs.readFileSync(registryFile, 'utf8');
const originalText = text;
const registry = JSON.parse(text);
const namespace = registry.stem.atctower;
const added = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.arguments?.[0]?.type === 'StringLiteral' && node.arguments?.[1]?.type === 'StringLiteral') {
    const key = node.arguments[0].value;
    if (key.startsWith('stem.atctower.')) {
      const leaf = key.slice('stem.atctower.'.length);
      if (!Object.hasOwn(namespace, leaf)) { namespace[leaf] = node.arguments[1].value; added.push(leaf); }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'comments' || key === 'tokens') continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(parser.parse(source));
const start = text.indexOf('    "atctower": {') + '    "atctower": '.length;
const end = text.indexOf(',\n    "autorepair":', start);
if (start < 10 || end < start) throw new Error('English namespace markers not found');
text = text.slice(0, start) + JSON.stringify(namespace, null, 2).replace(/\n/g, '\n    ') + text.slice(end);
JSON.parse(text);
if (text !== originalText) fs.writeFileSync(registryFile, text);
const enFile = 'dev-tools/i18n/stem_atctower_en.json';
const originalEn = fs.readFileSync(enFile, 'utf8');
const en = JSON.parse(originalEn);
Object.assign(en, namespace);
const updatedEn = JSON.stringify(en, null, 2) + '\n';
if (updatedEn !== originalEn) fs.writeFileSync(enFile, updatedEn);
console.log(`Registered ${added.length} new ATC English keys; preserved other namespaces.`);
