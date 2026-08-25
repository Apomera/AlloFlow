import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const MIRROR_ROOTS = [
  'stem_lab',
  'desktop/web-app/public/stem_lab',
  'desktop/app-build/stem_lab',
];

const LOADING_STATES = [
  ['astronomy', 'stem.astronomy.initializing_night_sky_lab'],
  ['funcgrapher', "return React.createElement('div', { className: 'p-8 text-center'"],
  ['magnetism', 'stem.magnetism.initializing'],
  ['physics', 'stem.physics.loading'],
  ['spacestation', 'stem.spacestation.initializing'],
  ['wave', 'stem.wave.loading'],
];

function luminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('transient STEM loading-state contrast', () => {
  it('uses a normal-text AA pair with comfortable margin', () => {
    expect(contrast('#475569', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(LOADING_STATES)('%s owns the same foreground and background in every mirror', (tool, marker) => {
    MIRROR_ROOTS.forEach((root) => {
      const filePath = `${root}/stem_tool_${tool}.js`;
      const source = readFileSync(filePath, 'utf8');
      const markerAt = source.indexOf(marker);
      expect(markerAt, `${marker} missing from ${filePath}`).toBeGreaterThanOrEqual(0);
      const loadingBranch = source.slice(Math.max(0, markerAt - 300), markerAt + 300);
      expect(loadingBranch, `loading state in ${filePath}`).toContain("color: '#475569', backgroundColor: '#ffffff'");
    });
  });
});
