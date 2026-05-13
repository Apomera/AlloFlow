#!/usr/bin/env node
/**
 * Build adventure_session_handlers_module.js from adventure_session_handlers_source.jsx.
 * Source ends with the AdventureSessionHandlers export bag; this script adds
 * the IIFE wrapper + duplicate-load guard + module registration footer.
 */
require('./_build_simple_iife_module.js').build({
  name: 'adventure_session_handlers',
  guardKey: 'AdventureSessionHandlersModule',
  footer: `
window.AlloModules.AdventureSessionHandlersModule = true;
console.log("[AdventureSessionHandlers] 3 helpers registered");`,
  logTag: 'AdventureSessionHandlers'
});
