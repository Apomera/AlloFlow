const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const check = process.argv.includes('--check');
const read = name => fs.readFileSync(path.join(root, name));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, bytes) => {
  bytes = Buffer.from(bytes);
  if (read(name).equals(bytes)) return;
  if (check) throw new Error('Stale collection outcome artifact: ' + name);
  fs.writeFileSync(path.join(root, name), bytes);
};
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const artifacts = [];
for (const family of ['content_engine', 'view_misc_panels']) {
  const name = family + '_module.js', bytes = read(name), pin = hash(bytes).slice(0, 8);
  const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name).filter(name => fs.existsSync(path.join(root, name)));
  mirrors.forEach(name => write(name, bytes));
  const sourceMirror = 'desktop/web-app/src/' + family + '_source.jsx';
  if (fs.existsSync(path.join(root, sourceMirror))) write(sourceMirror, read(family + '_source.jsx'));
  for (const host of hosts) {
    const source = read(host).toString(), pattern = new RegExp(family + '_module\\.js\\?v=[a-z0-9]+', 'g');
    if (!pattern.test(source)) {
      const moduleName = family === 'content_engine' ? 'ContentEngineModule' : 'MiscPanels';
      const localReference = "loadModule('" + moduleName + "', './" + name + "');";
      // Desktop builds may localize URLs instead of retaining CDN version pins.
      if (host !== hosts[0] && source.includes(localReference)) continue;
      throw new Error('Missing module reference: ' + host);
    }
    write(host, source.replace(pattern, name + '?v=' + pin));
  }
  artifacts.push({ name, sha256: hash(bytes), pin, mirrors });
}
const result = { artifacts, hosts: Object.fromEntries(hosts.map(name => [name, hash(read(name))])) };
if (!check) fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ check, ...result }));
