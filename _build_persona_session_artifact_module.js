#!/usr/bin/env node
/** Build and synchronize the private Persona session artifact runtime. */
require('./_build_simple_iife_module.js').build({
  name: 'persona_session_artifact',
  guardKey: 'PersonaSessionArtifactModule',
  logTag: 'PersonaSessionArtifact'
});
