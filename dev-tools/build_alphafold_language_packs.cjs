#!/usr/bin/env node
// Backward-compatible entry point. The maintained sync logic preserves
// reviewed translations while adding newly extracted AlphaFold fallbacks.
require('./extend_alphafold_language_packs.cjs');
