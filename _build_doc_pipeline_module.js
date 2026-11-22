#!/usr/bin/env node
/**
 * Build doc_pipeline_module.js from remediation_modules/pipeline/* (via
 * generated compatibility source doc_pipeline_source.jsx).
 * Uses the shared simple-IIFE builder (no JSX, just string-template HTML).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PIPELINE_MANIFEST = path.join(ROOT, 'remediation_modules', 'pipeline_manifest.cjs');
const IS_CHECK = process.argv.includes('--check');

if (fs.existsSync(PIPELINE_MANIFEST)) {
  const { checkDocPipelineSync, syncDocPipelineSource } = require(PIPELINE_MANIFEST);
  if (IS_CHECK) {
    const syncStatus = checkDocPipelineSync(ROOT);
    if (!syncStatus.ok) {
      console.error(
        '[DocPipeline] STALE SOURCE (rebuild with node _build_doc_pipeline_module.js): ' +
        'doc_pipeline_source.jsx does not match remediation_modules/pipeline/*'
      );
      process.exit(1);
    }
  } else {
    const syncResult = syncDocPipelineSource(ROOT);
    if (syncResult.changed) {
      console.log(
        '[DocPipeline] Synced doc_pipeline_source.jsx from ' +
        syncResult.partCount + ' modular parts (' + syncResult.bytes + ' bytes)'
      );
    }
  }
}

require('./_build_simple_iife_module.js').build({
  name: 'doc_pipeline',
  footer: fs.readFileSync(path.join(ROOT, 'remediation_review_helpers.js'), 'utf8'),
  guardKey: 'DocPipelineModule',
  logTag: 'DocPipeline'
});
