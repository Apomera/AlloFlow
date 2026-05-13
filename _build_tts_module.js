#!/usr/bin/env node
/**
 * Build tts_module.js from tts_source.jsx.
 * Source already includes the registration shim (factory + _upgradeTTS trigger).
 */
require('./_build_simple_iife_module.js').build({
  name: 'tts',
  guardKey: 'TTS',
  logTag: 'TTS'
});
