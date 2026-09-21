import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Each lab's header renders its title in that lab's accent colour, as an <h3>
 * at 14px. Bold, but well under the 18.66px that would make it "large text",
 * so WCAG AA asks for 4.5:1 against the white card behind it.
 *
 * Six of the eighteen accents were lighter than that, measured in a real
 * browser on 2026-09-21: stereogram at 2.77:1, stringArt 3.19, gradient 3.53,
 * spirograph 3.68, contrast 3.74, tessellation 3.77. Each moved one step darker
 * in its own Tailwind family (stereogram needed two) so the labs keep their
 * identities.
 *
 * This computes the ratio rather than pinning hex values, so a future palette
 * change is free to pick different colours and still has to clear AA.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

// Against the white card the header sits on.
function contrastOnWhite(hex) {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

describe('Art Studio lab accent contrast', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');
  const accents = [...source.matchAll(/(\w+):\s*\{\s*accent: '(#[0-9a-fA-F]{6})'/g)]
    .map((m) => ({ tab: m[1], hex: m[2] }));

  it('finds every lab accent', () => {
    expect(accents.length, 'expected one accent per lab').toBeGreaterThanOrEqual(18);
  });

  it('every accent clears 4.5:1 on white', () => {
    const failing = accents
      .filter((a) => contrastOnWhite(a.hex) < 4.5)
      .map((a) => `${a.tab} ${a.hex} = ${contrastOnWhite(a.hex).toFixed(2)}:1`);
    expect(failing, 'lab accents below WCAG AA for 14px text').toEqual([]);
  });

  it('the ratio helper is calibrated against known values', () => {
    // Black on white is 21:1; white on white is 1:1. If these drift the check
    // above is meaningless.
    expect(contrastOnWhite('#000000')).toBeCloseTo(21, 1);
    expect(contrastOnWhite('#ffffff')).toBeCloseTo(1, 2);
    // A colour that genuinely failed before this pass.
    expect(contrastOnWhite('#0ea5e9')).toBeLessThan(4.5);
  });
});
