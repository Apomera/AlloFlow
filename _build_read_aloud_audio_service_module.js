#!/usr/bin/env node
/**
 * Build read_aloud_audio_service_module.js from its pure-JS source.
 * The source owns factory registration; the shared builder supplies the IIFE
 * and duplicate-load guard, then synchronizes the public deployment mirror.
 */
require('./_build_simple_iife_module.js').build({
  name: 'read_aloud_audio_service',
  guardKey: 'ReadAloudAudioServiceModule',
  logTag: 'ReadAloudAudioService'
});
