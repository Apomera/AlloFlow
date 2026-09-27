#!/usr/bin/env node
// Canonical reader builder. --check compiles in memory and never writes files.
// Requiring this entry point still builds for build_adapted_reader.cjs callers.
const fs = require('node:fs');
const path = require('node:path');
const { INPUTS, OUTPUTS, renderReaderModule } = require('./dev-tools/lib/reader_compiler.cjs');
const root = __dirname;
const args = require.main === module ? process.argv.slice(2) : [];
if (args.length && !(args.length === 1 && (args[0] === '--check' || args[0] === '--help'))) throw new Error('Usage: node _build_view_simplified_module.js [--check|--help]');
if (args[0] === '--help') {
  console.log('Builds the reader module pair. --check compares both to an in-memory build without writes. Host pins: node dev-tools/check_reader_release.cjs.');
} else {
  const moduleSrc = renderReaderModule(INPUTS.map(file => fs.readFileSync(path.join(root, file), 'utf8')));
  if (args[0] === '--check') {
    const stale = OUTPUTS.filter(file => !fs.existsSync(path.join(root, file)) || fs.readFileSync(path.join(root, file), 'utf8') !== moduleSrc);
    if (stale.length) { console.error('Reader build differs from canonical source: ' + stale.join(', ')); process.exitCode = 1; }
    else console.log('Both reader outputs match canonical source; no files written.');
  } else {
    for (const file of OUTPUTS) writeReaderBuildFile(file, moduleSrc);
    console.log('Wrote view_simplified_module.js (' + moduleSrc.length + ' bytes)');
  }
}
function writeReaderBuildFile(file, contents) {
  const target = path.resolve(root, file);
  if (!target.startsWith(root + path.sep)) throw new Error('Build target outside workspace');
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === contents) return;
  const temporary = target + '.reader-build-' + process.pid + '.tmp';
  try { fs.writeFileSync(temporary, contents); fs.renameSync(temporary, target); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
