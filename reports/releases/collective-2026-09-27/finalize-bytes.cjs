// One-time, explicit release preparation. Run only after the aggregate input freeze.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const changed = [];
function writeChecked(file, before, after, reason) {
  if (before.equals(after)) return;
  if (!fs.readFileSync(file).equals(before)) throw new Error('Concurrent change: ' + file);
  const temp = file + '.collective-prep.tmp';
  fs.writeFileSync(temp, after);
  fs.renameSync(temp, file);
  changed.push({ file, reason, before: sha(before), after: sha(after) });
}
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'staging-plan.json'), 'utf8'));
const paths = plan.selected;
const attributes = cp.execFileSync('git', ['check-attr', '-z', '--stdin', 'text', 'eol'], {
  input: Buffer.from(paths.join('\0') + '\0'), maxBuffer: 8 * 1024 * 1024
}).toString().split('\0');
const attrs = new Map();
for (let i = 0; i + 2 < attributes.length; i += 3) {
  if (!attrs.has(attributes[i])) attrs.set(attributes[i], {});
  attrs.get(attributes[i])[attributes[i + 1]] = attributes[i + 2];
}
for (const file of paths) {
  const attr = attrs.get(file);
  if (!attr || attr.text === 'unset' || attr.eol !== 'lf') continue;
  const before = fs.readFileSync(file);
  if (before.includes(0)) continue;
  const str = before.toString('utf8');
  if (!Buffer.from(str).equals(before)) throw new Error('Non-UTF8 text: ' + file);
  if (!str.includes('\r\n')) continue;
  writeChecked(file, before, Buffer.from(str.replace(/\r\n/g, '\n')), 'Git LF policy');
}

const catalogPath = 'ui_strings.js';
const catalog = fs.readFileSync(catalogPath);
let fixedValues = 0;
const repaired = catalog.toString('utf8').replace(/"([A-Za-z0-9_.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g, (full, key, value) => {
  if (!/\\\\u[0-9a-fA-F]{4}|\\\\n|\\\\t/.test(value)) return full;
  fixedValues++;
  return full.replace(value, () => value.replace(/\\\\(u[0-9a-fA-F]{4}|n|t)/g, (_, escape) => '\\' + escape));
});
if (fixedValues !== 80) throw new Error('Unexpected catalog repair count: ' + fixedValues);
JSON.parse(repaired);
writeChecked(catalogPath, catalog, Buffer.from(repaired), 'Repair 80 literal escape values');
writeChecked('desktop/web-app/public/ui_strings.js', fs.readFileSync('desktop/web-app/public/ui_strings.js'), Buffer.from(repaired), 'Canonical catalog mirror');

writeChecked('desktop/web-app/public/stem_lab_module.js', fs.readFileSync('desktop/web-app/public/stem_lab_module.js'), fs.readFileSync('stem_lab/stem_lab_module.js'), 'Restore canonical circuit snapshot bridge');

const oldPins = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrated-pins.json'), 'utf8')).pins;
const pins = {};
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'];
for (const file of Object.keys(oldPins)) {
  const bytes = fs.readFileSync(file);
  if (!bytes.equals(fs.readFileSync('desktop/web-app/public/' + file))) throw new Error('Module mirror drift: ' + file);
  pins[file] = sha(bytes);
}
const host = fs.readFileSync(hosts[0]);
let nextHost = host.toString('utf8');
for (const [file, hash] of Object.entries(pins)) {
  if (hash === oldPins[file]) continue;
  const oldUrl = file + '?v=' + oldPins[file].slice(0, 8);
  const newUrl = file + '?v=' + hash.slice(0, 8);
  const count = nextHost.split(oldUrl).length - 1;
  if (count !== 1) throw new Error('Expected one scoped pin for ' + file + ', saw ' + count);
  nextHost = nextHost.replace(oldUrl, newUrl);
}
for (const file of hosts) {
  const before = fs.readFileSync(file);
  if (!before.equals(host)) throw new Error('Host mirror mismatch: ' + file);
  writeChecked(file, before, Buffer.from(nextHost), 'Refresh normalized content pins');
}
fs.writeFileSync(path.join(__dirname, 'normalized-pins.json'), JSON.stringify({ at: new Date().toISOString(), pins }, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'byte-preparation.json'), JSON.stringify({ at: new Date().toISOString(), fixedValues, changed }, null, 2) + '\n');
console.log(JSON.stringify({ fixedValues, changed: changed.length, pins }, null, 2));
