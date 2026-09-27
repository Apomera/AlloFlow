// Compile the affected production modules in memory; never rewrite runtime files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const { INPUTS, renderReaderModule } = require('./lib/reader_compiler.cjs');
const expected = {
  'content_engine_module.js': require('../_build_simple_iife_module.js').wrapSimpleIife({ source: read('content_engine_source.jsx'), guardKey: 'ContentEngineModule' }),
  'host_handlers_module.js': require('../_build_first_wave_view_modules.js').buildFirstWaveModule('HostHandlers', read('host_handlers_source.jsx')),
  'view_simplified_module.js': renderReaderModule(INPUTS.map(read))
};
const checks = {};
for (const [file, value] of Object.entries(expected)) {
  if (typeof value !== 'string') throw Error('Missing compiled output: ' + file);
  new vm.Script(value, { filename: file });
  checks[file] = { sourceMatchesRoot: value === read(file), sourceMatchesPublic: value === read('desktop/web-app/public/' + file), sha256: sha(value) };
}
const strings = JSON.parse(read('ui_strings.js'));
const copy = ['lookup_ai_available', 'lookup_ai_unavailable', 'lookup_picture_timeout', 'word_audio_timeout'];
const copyReady = copy.every(key => typeof strings.simplified[key] === 'string' && strings.simplified[key].length > 0);
const report = { checks, copyReady, passed: copyReady && Object.values(checks).every(row => row.sourceMatchesRoot && row.sourceMatchesPublic) };
fs.writeFileSync(path.join(root, 'reports/lookup-recovery/integration/parity.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exitCode = 1;
