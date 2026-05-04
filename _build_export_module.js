#!/usr/bin/env node
/**
 * Build export_module.js from export_source.jsx.
 * Source already includes window.AlloModules registration; this script just
 * wraps with the IIFE + duplicate-load guard.
 */
require('./_build_simple_iife_module.js').build({
  name: 'export',
  guardKey: 'Export',
  logTag: 'Export'
});
