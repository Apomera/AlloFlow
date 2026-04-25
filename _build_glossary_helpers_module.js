#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'glossary_helpers_source.jsx');
const OUTPUT = path.join(ROOT, 'glossary_helpers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'glossary_helpers_module.js');

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.GlossaryHelpersModule) { console.log('[CDN] GlossaryHelpersModule already loaded, skipping'); return; }
${source}
window.AlloModules.GlossaryHelpersModule = true;
console.log('[GlossaryHelpers] 2 helpers registered (applyAIConfig + handleGenerateTermEtymology)');
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
  console.error('[GlossaryHelpers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[GlossaryHelpers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
