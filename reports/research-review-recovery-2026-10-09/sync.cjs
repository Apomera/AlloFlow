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
  if (check) throw new Error('Stale research review artifact: ' + name);
  fs.writeFileSync(path.join(root, name), bytes);
};
const name = 'view_misc_panels_module.js', bytes = read(name), pin = hash(bytes).slice(0, 8);
const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name).filter(name => fs.existsSync(path.join(root, name)));
mirrors.forEach(name => write(name, bytes));
const sourceMirror = 'desktop/web-app/src/view_misc_panels_source.jsx';
if (fs.existsSync(path.join(root, sourceMirror))) write(sourceMirror, read('view_misc_panels_source.jsx'));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const host of hosts) {
  const source = read(host).toString(), pattern = /view_misc_panels_module\.js\?v=[a-z0-9]+/g;
  if (!pattern.test(source)) throw new Error('Missing review module pin: ' + host);
  write(host, source.replace(pattern, name + '?v=' + pin));
}
const result = { artifact: { name, sha256: hash(bytes), pin, mirrors }, hosts: Object.fromEntries(hosts.map(name => [name, hash(read(name))])) };
if (!check) fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ check, ...result }));
