#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'misc_handlers_source.jsx');
const OUTPUT = path.join(ROOT, 'misc_handlers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'misc_handlers_module.js');

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.MiscHandlersModule) { console.log('[CDN] MiscHandlersModule already loaded, skipping'); return; }
${source}
window.AlloModules.MiscHandlersModule = true;
console.log('[MiscHandlers] 3 handlers registered (handleFileUpload + handleLoadProject + detectClimaxArchetype)');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('Sync failed:', e.message); }

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[MiscHandlers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[MiscHandlers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
