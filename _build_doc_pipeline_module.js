#!/usr/bin/env node
/**
 * Build doc_pipeline_module.js from doc_pipeline_source.jsx.
 * Uses the shared simple-IIFE builder (no JSX, just string-template HTML).
 */
require('./_build_simple_iife_module.js').build({
  name: 'doc_pipeline',
  guardKey: 'DocPipelineModule',
  logTag: 'DocPipeline'
});
