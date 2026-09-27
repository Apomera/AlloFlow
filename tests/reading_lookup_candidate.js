import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// These two focused suites exercise the staged engine, just as the popup suite
// exercises the staged reader. They are not a production-bundle parity check.
const require = createRequire(import.meta.url);
export function loadReadingLookupCandidate() {
  if (process.env.ALLO_ENGINE_CANDIDATE) return loadAlloModule(process.env.ALLO_ENGINE_CANDIDATE);
  const { applyEngineRecovery } = require('../dev-tools/prepare_reading_lookup_resilience.cjs');
  const { wrapSimpleIife } = require('../_build_simple_iife_module.js');
  const source = applyEngineRecovery(readFileSync('content_engine_source.jsx', 'utf8').replace(/\r\n/g, '\n'));
  new Function(wrapSimpleIife({ source, guardKey: 'ContentEngineModule' }))();
}
