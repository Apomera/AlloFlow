import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_dna.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_dna.js';

describe('DNA Lab reduced-motion status indicators', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('gates visible pulse indicators for reduced-motion users', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var prefersReducedMotion =');
    expect(source).toContain('var reducedMotion = prefersReducedMotion;');
    expect((source.match(/reducedMotion \? '' : ' animate-pulse'/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
