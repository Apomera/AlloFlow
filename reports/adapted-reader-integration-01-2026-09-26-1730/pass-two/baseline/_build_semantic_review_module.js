#!/usr/bin/env node
/** Build the shared semantic-review tree and mutation module. */
require('./_build_simple_iife_module.js').build({
  name: 'semantic_review',
  guardKey: 'SemanticReviewModule',
  logTag: 'SemanticReview'
});