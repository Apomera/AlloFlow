#!/usr/bin/env node
/**
 * Build gemini_api_module.js from gemini_api_source.jsx.
 * Source already includes window.AlloModules registration; this script just
 * wraps with the IIFE + duplicate-load guard.
 */
require('./_build_simple_iife_module.js').build({
  name: 'gemini_api',
  guardKey: 'GeminiAPI',
  logTag: 'GeminiAPI'
});
