#!/usr/bin/env node
/** Build the explicit-save read-aloud artifact audio helper. */
require('./_build_simple_iife_module.js').build({
  name: 'read_aloud_artifact_audio',
  guardKey: 'ReadAloudArtifactAudioModule',
  logTag: 'ReadAloudArtifactAudio'
});
