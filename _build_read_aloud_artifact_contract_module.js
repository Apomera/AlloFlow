#!/usr/bin/env node
/**
 * Build the pure read-aloud artifact contract and synchronize its deployment
 * mirror. The source owns registration; the shared builder supplies the IIFE
 * and duplicate-load guard.
 */
require('./_build_simple_iife_module.js').build({
  name: 'read_aloud_artifact_contract',
  guardKey: 'ReadAloudArtifactContractModule',
  logTag: 'ReadAloudArtifactContract'
});
