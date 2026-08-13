#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'guided_mode_config_source.jsx');
const OUTPUT = path.join(ROOT, 'guided_mode_config_module.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/guided_mode_config_module.js');

function buildGuidedModeConfigModule(source) {
  return `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.GuidedModeConfig) { console.log('[CDN] GuidedModeConfig already loaded, skipping'); return; }\n${source.trimEnd()}\nconsole.log('[CDN] GuidedModeConfig loaded');\n})();\n`;
}

module.exports = { buildGuidedModeConfigModule };

if (require.main === module) {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source not found:', SOURCE);
    process.exit(1);
  }
  const output = buildGuidedModeConfigModule(fs.readFileSync(SOURCE, 'utf8'));
  fs.writeFileSync(OUTPUT, output, 'utf8');
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, output, 'utf8');
  console.log('Built guided_mode_config_module.js and public mirror (' + Buffer.byteLength(output) + ' bytes)');
}
