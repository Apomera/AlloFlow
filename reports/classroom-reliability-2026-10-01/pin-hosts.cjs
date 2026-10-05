const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const modules = ['read_aloud_audio_service_module.js', 'view_simplified_module.js'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const moduleInputs = modules.map(file => {
  const value = fs.readFileSync(path.join(root, file));
  assert.equal(hash(value), hash(fs.readFileSync(path.join(root, 'desktop/web-app/public', file))), `Public mirror drift: ${file}`);
  return { file, sha256: hash(value) };
});
const prepared = hosts.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  let content = bytes.toString('utf8');
  const changes = [];
  for (const module of moduleInputs) {
    const expression = new RegExp('(https://alloflow-cdn\\.pages\\.dev/' + module.file.replace(/\./g, '\\.') + '\\?v=)([A-Za-z0-9]+)', 'g');
    let count = 0;
    content = content.replace(expression, (_, prefix, previous) => { count++; changes.push({ module: module.file, previous, next: module.sha256.slice(0, 8) }); return prefix + module.sha256.slice(0, 8); });
    assert.equal(count, 1, `Expected one loader: ${file} ${module.file}`);
  }
  return { file, bytes, content, beforeHash: hash(bytes), afterHash: hash(content), changes };
});
for (const entry of prepared) assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash, `Concurrent host edit: ${entry.file}`);
for (const module of moduleInputs) assert.equal(hash(fs.readFileSync(path.join(root, module.file))), module.sha256, `Concurrent module edit: ${module.file}`);
for (const entry of prepared) {
  assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash);
  fs.writeFileSync(path.join(root, entry.file), entry.content);
  assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.afterHash);
}
fs.writeFileSync(path.join(__dirname, 'loader-pins.json'), JSON.stringify({ modules: moduleInputs, hosts: prepared.map(({ file, beforeHash, afterHash, changes }) => ({ file, beforeHash, afterHash, changes })) }, null, 2) + '\n');
console.log('Updated only audio service and reader content pins in the three host sources.');
