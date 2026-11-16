#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'symbol_runner_core.js');
const TARGET = path.join(ROOT, 'math_fluency_module.js');
const MIRRORS = [
  path.join(ROOT, 'desktop', 'web-app', 'public', 'math_fluency_module.js'),
  path.join(ROOT, 'desktop', 'app-build', 'math_fluency_module.js'),
  path.join(ROOT, 'desktop', 'web-app', 'build', 'math_fluency_module.js'),
];
const BEGIN = '// BEGIN EMBEDDED SYMBOL_RUNNER_CORE';
const END = '// END EMBEDDED SYMBOL_RUNNER_CORE';

function writeAtomic(file, content) {
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
}

function syncSymbolRunner(check) {
  const core = fs.readFileSync(SOURCE, 'utf8').trimEnd();
  const host = fs.readFileSync(TARGET, 'utf8');
  const newline = host.includes('\r\n') ? '\r\n' : '\n';
  const start = host.indexOf(BEGIN);
  const end = host.indexOf(END);
  if (start < 0 || end <= start) {
    throw new Error('Missing EMBEDDED SYMBOL_RUNNER_CORE markers in math_fluency_module.js');
  }
  const block = [
    BEGIN,
    '  if (typeof window !== \'undefined\' && !window.AlloSymbolRunnerCore) {',
    ...core.split(/\r?\n/).map(line => line ? '    ' + line : ''),
    '  }',
    '  ' + END,
  ].join(newline);
  const updated = host.slice(0, start) + block + host.slice(end + END.length);
  new vm.Script(updated, { filename: 'math_fluency_module.js' });

  if (check) {
    if (host !== updated) {
      throw new Error('math_fluency_module.js embedded SymbolRunnerCore is stale. Run node dev-tools/sync_symbol_runner_in_math_fluency.cjs.');
    }
    for (const mirror of MIRRORS) {
      if (fs.existsSync(mirror) && fs.readFileSync(mirror, 'utf8') !== updated) {
        throw new Error(path.relative(ROOT, mirror) + ' differs from math_fluency_module.js.');
      }
    }
    console.log('math_fluency_module.js embedded SymbolRunnerCore is current.');
    return;
  }

  if (host !== updated) writeAtomic(TARGET, updated);
  for (const mirror of MIRRORS) {
    if (fs.existsSync(path.dirname(mirror))) {
      // Only mirror into app-build / web-app/build if the file already exists there, always mirror desktop/web-app/public
      if (mirror.includes('public') || fs.existsSync(mirror)) {
        writeAtomic(mirror, updated);
      }
    }
  }
  console.log('Synced symbol_runner_core.js into math_fluency_module.js and Desktop mirrors.');
}

if (require.main === module) syncSymbolRunner(process.argv.includes('--check'));
module.exports = { syncSymbolRunner };
