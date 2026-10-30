// In the high-contrast app theme the color overlay used its own tints, and two of
// them did not match their names: "Peach" showed magenta and "Yellow" showed green
// (fixed 2026-10-29). Each tint's hue must fall in the family its label names.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const app = readFileSync(process.env.ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const contrast = sliceBetween(app, "backgroundColor: theme === 'contrast'", 'mixBlendMode:', { file: 'AlloFlowANTI.txt' });

function hue([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return null;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function tint(name) {
  const pattern = name === 'yellow'
    ? /'(rgba\([^']+\))'\)\s*$/m
    : new RegExp("colorOverlay === '" + name + "' \\? '(rgba\\([^']+\\))'");
  const m = contrast.match(pattern);
  if (!m) throw new Error('no high-contrast tint for ' + name);
  return m[1].match(/[\d.]+/g).slice(0, 3).map(Number);
}

describe('high-contrast color overlay tints match their names', () => {
  it.each([
    ['blue', 190, 240],
    ['peach', 10, 40],
    ['yellow', 45, 65],
  ])('%s sits in its hue family', (name, low, high) => {
    const h = hue(tint(name));
    expect(h, name + ' hue ' + h).toBeGreaterThanOrEqual(low);
    expect(h, name + ' hue ' + h).toBeLessThanOrEqual(high);
  });
});
