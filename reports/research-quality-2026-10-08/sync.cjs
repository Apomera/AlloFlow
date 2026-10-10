// Sync only the two modules changed in this research-quality pass.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const check = process.argv.includes('--check');
const read = name => fs.readFileSync(path.join(root, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const write = (name, value) => {
  const target = path.join(root, name), bytes = Buffer.from(value);
  if (read(name).equals(bytes)) return;
  if (check) throw new Error('Stale research-quality artifact: ' + name);
  fs.writeFileSync(target + '.research-quality.tmp', bytes);
  fs.renameSync(target + '.research-quality.tmp', target);
};
const artifacts = {};
for (const name of ['content_engine_module.js', 'view_misc_panels_module.js']) {
  const bytes = read(name);
  const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name).filter(name => fs.existsSync(path.join(root, name)));
  mirrors.forEach(name => write(name, bytes));
  artifacts[name] = { sha256: hash(bytes), pin: hash(bytes).slice(0, 8), mirrors };
}
for (const name of ['content_engine_source.jsx', 'view_misc_panels_source.jsx']) {
  const target = 'desktop/web-app/src/' + name;
  if (fs.existsSync(path.join(root, target))) write(target, read(name));
}
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const host of hosts) {
  let source = read(host).toString();
  for (const [name, value] of Object.entries(artifacts)) {
    const pattern = new RegExp(name.replace(/\./g, '\\.') + '\\?v=[a-z0-9]+', 'g');
    if (!pattern.test(source)) throw new Error('Missing module pin: ' + name);
    source = source.replace(pattern, name + '?v=' + value.pin);
  }
  write(host, source);
}
const strings = JSON.parse(read('ui_strings.js'));
const publicStrings = JSON.parse(read('desktop/web-app/public/ui_strings.js'));
const keys = ['research_highlights', 'research_view_passage', 'research_ai_note_preview', 'research_matched_terms'];
const delta = Object.fromEntries(keys.map(key => {
  if (!strings.input[key] || strings.input[key] !== publicStrings.input[key]) throw new Error('Research string mismatch: ' + key);
  return [key, strings.input[key]];
}));
const result = { artifacts, hosts: Object.fromEntries(hosts.map(name => [name, hash(read(name))])) };
if (!check) {
  fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify({ input: delta }, null, 2) + '\n');
}
console.log(JSON.stringify({ check, ...result }));
