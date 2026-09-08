#!/usr/bin/env node
/**
 * Build doc_pipeline_module.js from doc_pipeline_source.jsx.
 * Uses the shared simple-IIFE builder (no JSX, just string-template HTML).
 */
require('./_build_simple_iife_module.js').build({
  name: 'doc_pipeline',
  footer: require('fs').readFileSync(require('path').join(__dirname, 'remediation_review_helpers.js'), 'utf8'),
  guardKey: 'DocPipelineModule',
  logTag: 'DocPipeline'
});
