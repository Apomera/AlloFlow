import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_singing.js';
const PUBLIC = 'desktop/web-app/public/stem_lab/stem_tool_singing.js';

describe('Singing resonance inquiry fields', () => {
  it('keeps the source and public bundles in sync', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('names the hypothesis and explanation textareas independently of placeholders', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("'aria-label': t('stem.singing.hypothesis_input', 'Resonance discovery hypothesis')");
    expect(source).toContain("'aria-label': t('stem.singing.explanation_input', 'Resonance discovery explanation')");
  });
});
