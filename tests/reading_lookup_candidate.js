import { loadAlloModule } from './setup.js';

// Production output is the default. Keep an explicit override for reproducing
// a frozen candidate/baseline without silently patching the source under test.
export function loadReadingLookupCandidate() {
  return loadAlloModule(process.env.ALLO_ENGINE_CANDIDATE || 'content_engine_module.js');
}
