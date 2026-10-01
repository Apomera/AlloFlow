#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'adventure_handlers_source.jsx');
const OUTPUT = path.join(ROOT, 'adventure_handlers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'desktop/web-app', 'public', 'adventure_handlers_module.js');

function writeIfChanged(file, contents) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === contents) return;
  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.writeFileSync(file, contents, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'UNKNOWN'].includes(error && error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 * (attempt + 1));
    }
  }
  throw lastError;
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AdventureHandlersModule) { console.log('[CDN] AdventureHandlersModule already loaded, skipping'); return; }
${source}
window.AlloModules.AdventureHandlersModule = true;
console.log('[AdventureHandlers] 7 handlers registered');
})();
`;

writeIfChanged(OUTPUT, outputCode);
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  writeIfChanged(DEPLOY_OUT, outputCode);
} catch (e) { console.warn('Sync failed:', e.message); }

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[AdventureHandlers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[AdventureHandlers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
