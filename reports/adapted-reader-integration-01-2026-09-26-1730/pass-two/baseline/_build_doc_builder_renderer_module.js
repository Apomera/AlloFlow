#!/usr/bin/env node
/** Build the deterministic document-block renderer module. */
require('./_build_simple_iife_module.js').build({
  name: 'doc_builder_renderer',
  guardKey: 'DocBuilderRendererModule',
  logTag: 'DocBuilderRenderer'
});
