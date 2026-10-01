import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('EPPP memory-aid Wave 08 compatibility entry', () => {
  it('uses the final modular 149-item artifact', () => {
    const wave = JSON.parse(fs.readFileSync('test_prep/eppp_memory_aid_review_wave_08.json', 'utf8'));
    expect(wave.summary.items).toBe(149);
    expect(wave.summary.domains).toBe(8);
    expect(wave.items.every((item) => item.reviewMode === 'claim-level-source-and-editorial-correction')).toBe(true);
  });
});