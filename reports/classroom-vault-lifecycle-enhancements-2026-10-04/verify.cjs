'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), vm = require('node:vm');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '../..'), label = process.argv[2] || 'candidate';
assert.ok(['candidate', 'final'].includes(label));
const base = label === 'candidate' ? path.join(__dirname, 'candidate') : root;
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate.json'))), initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'initial.json'))), operations = JSON.parse(fs.readFileSync(path.join(__dirname, 'operations.json')));
const sha = b => crypto.createHash('sha256').update(b).digest('hex'), norm = s => s.replace(/\r\n/g, '\n'), read = f => fs.readFileSync(path.join(base, f));
for (const file of receipt.files) assert.equal(sha(read(file.file)), file.candidateSha256, file.file);
for (const input of initial.inputs) assert.equal(sha(fs.readFileSync(path.join(root, input.file))), input.sha256, input.file);
const host = read('AlloFlowANTI.txt'), source = read('host_handlers_source.jsx'), runtime = read('host_handlers_module.js'), vault = read('allo_device_vault_module.js');
assert.ok(host.equals(read('desktop/web-app/src/AlloFlowANTI.txt')) && host.equals(read('desktop/web-app/src/App.jsx')));
assert.ok(runtime.equals(read('desktop/web-app/public/host_handlers_module.js')));
assert.ok(vault.equals(read('desktop/web-app/public/allo_device_vault_module.js')));
parser.parse(host.toString(), { sourceType: 'module', plugins: ['jsx'] });
for (const bytes of [source, runtime, vault]) new vm.Script(bytes.toString());
const { buildFirstWaveModule } = require(path.join(root, '_build_first_wave_view_modules.js'));
assert.equal(buildFirstWaveModule('HostHandlers', source.toString()), runtime.toString());
assert.ok(host.toString().includes('host_handlers_module.js?v=' + receipt.handlerPin));
assert.ok(host.toString().includes("securityModuleUrl('allo_device_vault_module.js', '" + receipt.vaultPin + "')"));
assert.ok(host.toString().includes('api.SESSION_OWNERSHIP_VERSION === 1'));
const getterStart = host.toString().indexOf('  const __alloHostDeps = {'), getterEnd = host.toString().indexOf('\n  };\n', getterStart);
const getters = [...new Set([...host.toString().slice(getterStart, getterEnd).matchAll(/get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/g)].map(x => x[1]))].sort();
const deps = [...new Set([...source.toString().replace(/^\s*\/\/.*$/gm, '').matchAll(/__d\.([A-Za-z_$][\w$]*)/g)].map(x => x[1]))].sort();
assert.deepEqual(getters, deps); assert.deepEqual(JSON.parse(read('dev-tools/host_handlers_wave3_manifest.json')).deps.sort(), deps);
const reversed = {};
for (const file of ['AlloFlowANTI.txt', 'host_handlers_source.jsx', 'allo_device_vault_module.js']) {
  let text = norm(read(file).toString());
  for (const op of operations.filter(x => x.file === file).reverse()) {
    assert.equal(text.split(op.after).length - 1, 1, op.scope); text = text.replace(op.after, op.before);
  }
  const original = fs.readFileSync(path.join(__dirname, 'before', file));
  const raw = Buffer.from(initial.files.find(x => x.file === file).crlf ? text.replace(/\n/g, '\r\n') : text);
  assert.ok(raw.equals(original), 'Exact reverse: ' + file); reversed[file] = sha(raw);
}
const result = { label, completedAt: new Date().toISOString(), passed: true, files: receipt.files, operations: operations.length, handlerPin: receipt.handlerPin, vaultPin: receipt.vaultPin, mirrorParity: true, generatedParity: true, manifestAndGettersExact: true, reversedRawPreimages: reversed };
fs.writeFileSync(path.join(__dirname, label + '-consistency.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ label, passed: true, changedFiles: receipt.files.filter(x => x.changed).length, operations: operations.length }));
