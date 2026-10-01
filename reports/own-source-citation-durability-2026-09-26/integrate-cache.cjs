const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'own_sources_module.js');
const before = fs.readFileSync(target, 'utf8');
const section = before.indexOf('// Bundled with own_sources_module.js');
const start = before.indexOf('  function remember(items) {', section);
const end = before.indexOf('  function cite(text, items) {', start);
if (section < 0 || start < section || end < start || before.includes('function normaliseSnapshot(value)')) throw new Error('Unexpected or already-integrated evidence runtime');
const fragment = fs.readFileSync(path.join(__dirname, 'cache-fragment.js'), 'utf8')
  .replace('Normal generation supplies at most eight passages.', 'Normal generation supplies at most six passages.');
const next = (before.slice(0, start) + fragment.trimEnd() + '\n' + before.slice(end))
  .replace('  var memory = Object.create(null);\r\n', '').replace('  var memory = Object.create(null);\n', '');
fs.writeFileSync(path.join(__dirname, 'helper-before-cache.js.txt'), before);
if (fs.readFileSync(target, 'utf8') !== before) throw new Error('Source changed during integration');
fs.writeFileSync(target, next);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
fs.writeFileSync(path.join(__dirname, 'cache-integration.json'), JSON.stringify({ before: sha(before), after: sha(next) }, null, 2) + '\n');
console.log('Integrated citation cache only; first library IIFE and inspector retained.');
