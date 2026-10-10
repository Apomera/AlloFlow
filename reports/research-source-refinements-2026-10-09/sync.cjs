const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const check = process.argv.includes('--check');
const read = name => fs.readFileSync(path.join(root, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const write = (name, bytes) => {
  bytes = Buffer.from(bytes);
  if (read(name).equals(bytes)) return;
  if (check) throw new Error('Stale research artifact: ' + name);
  fs.writeFileSync(path.join(root, name), bytes);
};
const artifacts = {};
for (const family of ['content_engine', 'text_pipeline_helpers', 'view_misc_panels']) {
  const name = family + '_module.js', bytes = read(name);
  const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name).filter(name => fs.existsSync(path.join(root, name)));
  mirrors.forEach(name => write(name, bytes));
  const source = family + '_source.jsx', sourceMirror = 'desktop/web-app/src/' + source;
  if (fs.existsSync(path.join(root, sourceMirror))) write(sourceMirror, read(source));
  artifacts[name] = { sha256: hash(bytes), pin: hash(bytes).slice(0, 8), mirrors };
}
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const host of hosts) {
  let source = read(host).toString();
  for (const [name, info] of Object.entries(artifacts)) {
    const pattern = new RegExp(name.replace(/\./g, '\\.') + '\\?v=[a-z0-9]+', 'g');
    if (!pattern.test(source)) throw new Error('Missing module pin: ' + name);
    source = source.replace(pattern, name + '?v=' + info.pin);
  }
  write(host, source);
}
const result = { artifacts, hosts: Object.fromEntries(hosts.map(name => [name, hash(read(name))])) };
if (!check) fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ check, ...result }));
