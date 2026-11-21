import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('StemLabModal AI-off callGemini binding regression (2026-11-19)', () => {
  it('declares callGemini as a mutable binding before nulling it when AI is unusable', () => {
    const src = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(src).toContain('callGemini: _propCallGemini,');
    expect(src).toContain('var callGemini = _propCallGemini;');
    expect(src).toContain('if (!_stemAiText) callGemini = null;');
    expect(src.indexOf('var callGemini = _propCallGemini;')).toBeLessThan(
      src.lastIndexOf('if (!_stemAiText) callGemini = null;')
    );
  });

  it('maintains byte-for-byte mirror parity for stem_lab/stem_lab_module.js', () => {
    const rootBuf = readFileSync('stem_lab/stem_lab_module.js');
    for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
      const dest = `${dir}/stem_lab/stem_lab_module.js`;
      if (existsSync(dest)) {
        expect(readFileSync(dest).equals(rootBuf), `mirror parity ${dest}`).toBe(true);
      }
    }
  });
});
