'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const { wrapSimpleIife } = require(path.join(root, '_build_simple_iife_module.js'));
const service = read('read_aloud_audio_service_module.js');
const compiled = wrapSimpleIife({ source: read('read_aloud_audio_service_source.jsx'), guardKey: 'ReadAloudAudioServiceModule' });
assert.equal(service, compiled, 'Audio module must equal canonical generation');
new vm.Script(service);
assert.equal(read('desktop/web-app/public/read_aloud_audio_service_module.js'), service);
const pins = { read_aloud_audio_service_module: hash(service).slice(0, 8), view_simplified_module: hash(read('view_simplified_module.js')).slice(0, 8) };
for (const name of ['utils_pure_module', 'view_persona_chat_module', 'export_handlers_module']) pins[name] = hash(read(name + '.js')).slice(0, 8);
const cache = JSON.parse(read('reports/classroom-reliability-followup-2026-10-03/cache-coherence/applied.json'));
for (const row of cache.files) assert.equal(hash(read(row.file)), row.afterSha256, 'Exact cache candidate: ' + row.file);
for (const file of ['allo_device_storage_module.js', 'utils_pure_module.js', 'view_persona_chat_module.js', 'export_handlers_module.js']) {
  new vm.Script(read(file), {filename: file});
  assert.equal(read(file), read('desktop/web-app/public/' + file), 'Runtime/public parity: ' + file);
}
for (const script of read('storage_bridge.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) new vm.Script(script[1]);
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const hosts = files.map(file => {
  const source = read(file);
  parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  for (const [name, pin] of Object.entries(pins)) {
    const matches = [...source.matchAll(new RegExp('https://alloflow-cdn\\.pages\\.dev/' + name + '\\.js\\?v=([a-f0-9]{8})', 'g'))];
    assert.equal(matches.length, 1, file + ': unique loader ' + name);
    assert.equal(matches[0][1], pin, file + ': exact loader pin ' + name);
  }
  assert(source.includes('canvasRecoveryRevision, isStorageDisabled, isCanvas]);'), file + ': policy effect dependencies');
  assert(source.includes('window.__alloReadAloudLiveHost'), file + ': live audio host');
  return { file, sha256: hash(source), syntax: 'pass', audioPins: pins, savePolicyDependencies: 'pass' };
});
const report = { passed: true, completedAt: new Date().toISOString(), scope: 'Three host syntax checks, exact audio generation/public parity, five module loader pins, exact applied cache candidate, four runtime/public pairs and native bridge script syntax; no full application build or CI claim.', hosts, cacheGeneration: cache.generation };
const output = path.join(__dirname, process.argv[2] || 'current-consistency-20261003.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
