const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const { INPUTS, renderReaderModule } = require(path.join(root, 'dev-tools/lib/reader_compiler.cjs'));
const reader = renderReaderModule(INPUTS.map(file => fs.readFileSync(path.join(root, file), 'utf8')));
fs.writeFileSync(path.join(__dirname, 'view_simplified_module.candidate.js'), reader);
// Run the canonical pure-helper wrapper builder with report-local output only.
const outputs = new Map();
const virtualFs = { ...fs, writeFileSync(file, contents) { outputs.set(path.basename(file), contents); } };
vm.runInNewContext(fs.readFileSync(path.join(root, '_build_text_pipeline_helpers_module.js'), 'utf8'), {
  __dirname: root, console, process,
  require(name) { if (name === 'fs') return virtualFs; if (name === 'child_process') return { execSync() {} }; return require(name); }
});
const helper = outputs.get('text_pipeline_helpers_module.js');
if (!helper) throw new Error('Canonical helper builder produced no output');
new vm.Script(helper);
fs.writeFileSync(path.join(__dirname, 'text_pipeline_helpers_module.candidate.js'), helper);
console.log('Report-local reader and helper candidates compiled from canonical sources.');
