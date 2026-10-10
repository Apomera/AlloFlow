// Synchronize this change's generated families and exact loader pins only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const check = process.argv.includes('--check');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const write = (file, bytes) => {
  const target = path.join(root, file);
  if (check) {
    if (!fs.readFileSync(target).equals(Buffer.from(bytes))) throw new Error('Stale research artifact: ' + file);
  } else {
    const temporary = target + '.research-sync.tmp';
    fs.writeFileSync(temporary, bytes);
    fs.renameSync(temporary, target);
  }
};
const artifacts = {};
for (const name of ['content_engine_module.js', 'view_misc_panels_module.js', 'gemini_api_module.js', 'ai_backend_module.js']) {
  const bytes = read(name);
  const sha256 = hash(bytes);
  const mirrors = ['app/', 'desktop/web-app/public/', 'desktop/web-app/public/app/', 'desktop/app-build/', 'desktop/web-app/build/']
    .map(prefix => prefix + name).filter(file => fs.existsSync(path.join(root, file)));
  for (const mirror of mirrors) write(mirror, bytes);
  artifacts[name] = { sha256, pin: sha256.slice(0, 8), mirrors };
}
for (const name of ['content_engine_source.jsx', 'view_misc_panels_source.jsx', 'gemini_api_source.jsx']) {
  const mirror = 'desktop/web-app/src/' + name;
  if (fs.existsSync(path.join(root, mirror))) write(mirror, read(name));
}
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const file of ['app/index.html', 'desktop/web-app/public/app/index.html', 'desktop/app-build/index.html', 'desktop/web-app/build/index.html']) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const source = read(file).toString().replace(/ai_backend_module\.js\?v=[a-z0-9]+/g, 'ai_backend_module.js?v=' + artifacts['ai_backend_module.js'].pin);
  write(file, source);
}
for (const host of hosts) {
  let source = read(host).toString();
  for (const [name, artifact] of Object.entries(artifacts)) {
    const pattern = new RegExp(name.replace(/\./g, '\\.') + '\\?v=[a-z0-9]+', 'g');
    if (!pattern.test(source)) throw new Error('Missing loader pin in ' + host + ': ' + name);
    source = source.replace(pattern, name + '?v=' + artifact.pin);
  }
  write(host, source);
}
const output = { artifacts, hosts: Object.fromEntries(hosts.map(file => [file, hash(read(file))])) };
if (!check) fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ check, ...output }));
