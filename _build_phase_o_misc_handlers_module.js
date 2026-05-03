#!/usr/bin/env node
/**
 * Build phase_o_misc_handlers_module.js from phase_o_misc_handlers_source.jsx.
 * Source ends with the PhaseOHandlers export bag; this script adds the IIFE
 * wrapper + duplicate-load guard + module registration footer.
 */
require('./_build_simple_iife_module.js').build({
  name: 'phase_o_misc_handlers',
  guardKey: 'PhaseOHandlersModule',
  footer: `
window.AlloModules.PhaseOHandlersModule = true;
console.log("[PhaseOHandlers] 6 handlers registered");`,
  logTag: 'PhaseOHandlers'
});
