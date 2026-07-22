import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hasLargeFixedWidth } = require('../dev-tools/stem_visual_overflow_heuristic.cjs');

describe('STEM visual overflow heuristic', () => {
  it('flags only large fixed width and min-width declarations', () => {
    expect(hasLargeFixedWidth('width: 900px')).toBe(true);
    expect(hasLargeFixedWidth('min-width:720px')).toBe(true);
    expect(hasLargeFixedWidth('width: 699px')).toBe(false);
    expect(hasLargeFixedWidth('width: 100%')).toBe(false);
    expect(hasLargeFixedWidth('width: 480px')).toBe(false);
    expect(hasLargeFixedWidth('width: 480px', '', 400)).toBe(true);
  });

  it('does not mistake radii or responsive maximums for overflow', () => {
    expect(hasLargeFixedWidth('border-radius:999px;max-width:1100px')).toBe(false);
    expect(hasLargeFixedWidth('width:900px;max-width:100%')).toBe(false);
    expect(hasLargeFixedWidth('width:900px;max-width:100vw')).toBe(false);
  });

  it('reviews large intrinsic widths unless inline styles make them fluid', () => {
    expect(hasLargeFixedWidth('', '840')).toBe(true);
    expect(hasLargeFixedWidth('width:100%', '840')).toBe(false);
    expect(hasLargeFixedWidth('max-width:100%', '840')).toBe(false);
    expect(hasLargeFixedWidth('', '640')).toBe(false);
    expect(hasLargeFixedWidth('', '640', 400, 700)).toBe(false);
    expect(hasLargeFixedWidth('', '840', 400, 700)).toBe(true);
  });
});
