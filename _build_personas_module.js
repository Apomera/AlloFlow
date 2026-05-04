#!/usr/bin/env node
/**
 * Build personas_module.js from personas_source.jsx.
 * Source already includes the registration shim (factory + _upgradePersonas trigger).
 */
require('./_build_simple_iife_module.js').build({
  name: 'personas',
  guardKey: 'Personas',
  logTag: 'Personas'
});
