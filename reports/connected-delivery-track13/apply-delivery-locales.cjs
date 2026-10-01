// Scoped merge: preserve all unrelated catalog and translation keys.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const payload = require('./delivery-locales.json');
const apply = process.argv.includes('--apply');
let changed = 0;
for (const [relative, values] of [
  ['ui_strings.js', payload.english], ['desktop/web-app/public/ui_strings.js', payload.english],
  ...Object.entries(payload.locales).flatMap(([slug, values]) => [[ 'lang/' + slug + '.js', values ], [ 'desktop/web-app/public/lang/' + slug + '.js', values ]])
]) {
  const file = path.join(root, relative), before = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(before.replace(/^\uFEFF/, ''));
  if (!doc.share_collect) throw Error('Missing share_collect in ' + relative);
  const missing = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string' || !value) throw Error('Empty translation: ' + key);
    const placeholders = text => (text.match(/\{\w+\}/g) || []).sort().join('|');
    if (placeholders(value) !== placeholders(payload.english[key])) throw Error('Placeholder mismatch: ' + key);
    if (doc.share_collect[key] !== undefined && doc.share_collect[key] !== value) throw Error('Conflicting existing translation: ' + relative + ':' + key);
    if (doc.share_collect[key] === undefined) missing[key] = value;
  }
  if (!Object.keys(missing).length) continue;
  changed++;
  if (!apply) continue;
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const anchor = '  "share_collect": {';
  if (before.split(anchor).length !== 2) throw Error('Ambiguous catalog anchor: ' + relative);
  const additions = Object.entries(missing).map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',').join(eol);
  const after = before.replace(anchor, anchor + eol + additions);
  JSON.parse(after.replace(/^\uFEFF/, ''));
  if (fs.readFileSync(file, 'utf8') !== before) throw Error('Concurrent edit: ' + relative);
  fs.writeFileSync(file + '.track13-next', after);
  fs.renameSync(file + '.track13-next', file);
}
console.log((apply ? 'Updated ' : 'Pending ') + changed + ' scoped catalogs.');
if (!apply && changed) process.exitCode = 1;
