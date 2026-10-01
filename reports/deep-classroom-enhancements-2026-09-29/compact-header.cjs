const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..'), sha = text => crypto.createHash('sha256').update(text).digest('hex');
const names = ['view_header_source.jsx', 'view_header_module.js', 'desktop/web-app/public/view_header_module.js'];
const texts = Object.fromEntries(names.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
if (texts[names[1]] !== texts[names[2]]) throw Error('Inspect header destination-only differences');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
for (const file of names) {
  if (before[file]) throw Error('Header preimage already saved');
  before[file] = sha(texts[file]); fs.writeFileSync(path.join(__dirname, 'before', file.replaceAll('/', '__')), texts[file]);
}
const from = 'className={`hidden sm:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 transition-colors ${activeView === \'dashboard\'';
const to = 'className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 transition-colors ${activeView === \'dashboard\'';
if (texts[names[0]].split(from).length !== 2) throw Error('Compact dashboard control is not unique');
if (fs.readFileSync(path.join(root, names[0]), 'utf8') !== texts[names[0]]) throw Error('Concurrent header edit');
fs.writeFileSync(path.join(root, names[0]), texts[names[0]].replace(from, to));
const manifestPath = path.join(root, 'dev-tools/remediation_validation.json'), manifestText = fs.readFileSync(manifestPath, 'utf8'), manifest = JSON.parse(manifestText);
for (const file of names) if (!manifest.identityInputs.includes(file)) manifest.identityInputs.push(file);
if (fs.readFileSync(manifestPath, 'utf8') !== manifestText) throw Error('Concurrent manifest edit');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'before.json'), JSON.stringify(before, null, 2));
console.log('Made progress available in the compact phone header.');
