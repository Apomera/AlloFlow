import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import regression from '../dev-tools/word_sounds_host_persistence_regression.cjs';
it('preserves runtime Word Sounds repairs in the current preview and browser history roundtrip', () => {
  expect(regression.runHostPersistenceRegressions(readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8'))).toHaveLength(7);
}, 30000);
