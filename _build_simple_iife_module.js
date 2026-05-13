#!/usr/bin/env node
/**
 * Shared helper for building "simple IIFE" modules from source.jsx files
 * that contain pure JS (no JSX) and just need an IIFE wrapper + duplicate-load
 * guard.
 *
 * Used by per-module build scripts: _build_doc_pipeline_module.js,
 * _build_content_engine_module.js, etc.
 *
 * Usage from a per-module build script:
 *
 *   require('./_build_simple_iife_module.js').build({
 *     name: 'doc_pipeline',                  // base filename (no _source/_module)
 *     guardKey: 'DocPipelineModule',         // window.AlloModules.X used as duplicate-load guard
 *     footer: '',                            // optional code appended after source body, before closing IIFE
 *     logTag: 'DocPipeline'                  // prefix for console output
 *   });
 *
 * The build:
 *   1. Reads <name>_source.jsx
 *   2. Wraps in IIFE with duplicate-load guard
 *   3. Appends optional footer
 *   4. Writes <name>_module.js + syncs to prismflow-deploy/public/
 *   5. Syntax-checks the output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function build({ name, guardKey, footer = '', logTag }) {
  const ROOT = __dirname;
  const SOURCE = path.join(ROOT, name + '_source.jsx');
  const OUTPUT = path.join(ROOT, name + '_module.js');
  const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', name + '_module.js');
  const tag = logTag || name;

  if (!fs.existsSync(SOURCE)) {
    console.error('[' + tag + '] Source not found:', SOURCE);
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE, 'utf-8');

  const outputCode =
`(function(){"use strict";
if(window.AlloModules&&window.AlloModules.${guardKey}){console.log("[CDN] ${guardKey} already loaded, skipping"); return;}
${source.trim()}
${footer ? footer.trim() + '\n' : ''}})();
`;

  fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
  try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
      fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
  } catch (e) {
    console.warn('[' + tag + '] Could not sync to prismflow-deploy/public/:', e.message);
  }

  // Syntax check — catches unbalanced template literals / stray syntax
  try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
  } catch (e) {
    console.error('[' + tag + '] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
  }

  const lineCount = outputCode.split('\n').length;
  console.log('[' + tag + '] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
  console.log('[' + tag + '] Synced to ' + DEPLOY_OUT);
}

module.exports = { build };
