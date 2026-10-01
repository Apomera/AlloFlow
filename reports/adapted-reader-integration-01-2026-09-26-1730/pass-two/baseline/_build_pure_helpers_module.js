#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'pure_helpers_source.jsx');
const OUTPUT = path.join(ROOT, 'pure_helpers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'desktop/web-app', 'public', 'pure_helpers_module.js');

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PureHelpersModule) { console.log('[CDN] PureHelpersModule already loaded, skipping'); return; }
${source}
window.AlloModules.PureHelpersModule = true;
console.log('[PureHelpers] 7 helpers registered');
})();
`;

writeReaderBuildFile(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  writeReaderBuildFile(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('Sync failed:', e.message); }

try {
  new (require('vm').Script)(outputCode, { filename: OUTPUT });
} catch (e) {
  console.error('[PureHelpers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[PureHelpers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');

function writeReaderBuildFile(file, contents, encoding) {
  const path = require('path');
  const root = path.resolve(__dirname);
  const target = path.resolve(file);
  if (!target.startsWith(root + path.sep)) throw new Error('Build target outside workspace');
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === contents) return;
  const temporary = target + '.reader-build-' + process.pid + '.tmp';
  try { fs.writeFileSync(temporary, contents, encoding); fs.renameSync(temporary, target); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
