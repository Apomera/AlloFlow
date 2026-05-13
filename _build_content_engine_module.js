#!/usr/bin/env node
/**
 * Build content_engine_module.js from content_engine_source.jsx.
 * Source already includes window.AlloModules registration; this script just
 * adds the IIFE wrapper + duplicate-load guard.
 */
require('./_build_simple_iife_module.js').build({
  name: 'content_engine',
  guardKey: 'ContentEngineModule',
  logTag: 'ContentEngine'
});
