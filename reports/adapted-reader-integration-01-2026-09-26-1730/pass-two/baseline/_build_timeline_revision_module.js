#!/usr/bin/env node
/**
 * Build timeline_revision_module.js from timeline_revision_source.jsx.
 * Source already includes window.AlloModules registration.
 */
require('./_build_simple_iife_module.js').build({
  name: 'timeline_revision',
  guardKey: 'TimelineRevisionModule',
  logTag: 'TimelineRevision'
});
