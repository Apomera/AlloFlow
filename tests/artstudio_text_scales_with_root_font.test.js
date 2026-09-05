import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The host applies the reader's text-size setting as `html { font-size }`.
// rem-based Tailwind sizes follow it; pixel-locked ones (text-[11px]) do not,
// which is a WCAG 1.4.4 resize-text gap. Art Studio had 317 such tokens.
const files = [
  'stem_lab/stem_tool_artstudio.js',
  'desktop/web-app/public/stem_lab/stem_tool_artstudio.js',
];

describe('Art Studio text sizes scale with the root font size', () => {
  for (const file of files) {
    it(file + ' has no pixel-locked text size utilities', () => {
      const src = readFileSync(file, 'utf8');
      const px = src.match(/text-\[\d+px\]/g) || [];
      expect(px, 'pixel text tokens').toEqual([]);
      // The small-label sizes are still present, expressed in rem.
      expect(src).toContain('text-[0.6875rem]');
      expect(src).toContain('text-[0.625rem]');
    });
  }

  it('keeps the two copies identical', () => {
    expect(readFileSync(files[0], 'utf8')).toBe(readFileSync(files[1], 'utf8'));
  });
});
