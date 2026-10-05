const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_atctower.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_atctower.js'), 'utf8');
new vm.Script(source, { filename: 'stem_tool_atctower.js' });
assert.equal(source, mirror, 'ATC source and desktop public mirror must match');
function namespace(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const start = text.indexOf('    "atctower": {');
  const end = text.indexOf(',\n    "autorepair":', start);
  assert.ok(start !== -1 && end > start, 'ATC namespace boundaries must exist');
  return JSON.parse('{' + text.slice(start, end).trim() + '}').atctower;
}
const english = namespace(path.join(root, 'ui_strings.js'));
assert.deepEqual(english, namespace(path.join(root, 'desktop/web-app/public/ui_strings.js')));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'dev-tools/i18n/stem_atctower_en.json'), 'utf8'));
assert.deepEqual(english, catalog.stem?.atctower || catalog.atctower || catalog);
const result = {
  syntaxValid: true, toolMirrorsEqual: true, englishNamespacesEqual: true,
  developmentEnglishCatalogEqual: true, englishKeyCount: Object.keys(english).length,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex')
};
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
console.log(fs.readdirSync(__dirname).filter(name => /\.png$|results\.json$/.test(name)).join('\n'));
