import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import regression from '../dev-tools/word_sounds_rhyme_session_regression.cjs';

describe('Rhyme Time session exposure and item lifecycle', () => {
  it('passes the core and actual-runtime lifecycle scenarios', () => {
    const results = regression.runRhymeSessionRegressions(
      readFileSync(resolve(process.cwd(), 'word_sounds_core.js'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8'),
    );
    expect(results).toHaveLength(11);
  }, 30000);
});
