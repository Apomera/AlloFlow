import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'), 'utf8');

function readPalettes() {
  const start = source.indexOf('  var PALETTE =');
  const end = source.indexOf('  function getPalette', start);
  if (start < 0 || end < 0) throw new Error('Typing Practice palette declarations not found');
  return Function(source.slice(start, end) + '\nreturn { PALETTE, HIGH_CONTRAST_PALETTE, THEMES, LIGHT_ACCENT_THEMES };')();
}

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function expectContrast(foreground, background, minimum, label) {
  expect(contrast(foreground, background), label).toBeGreaterThanOrEqual(minimum);
}

describe('Typing Practice WCAG and visual resilience', () => {
  const { THEMES, HIGH_CONTRAST_PALETTE, LIGHT_ACCENT_THEMES } = readPalettes();
  const palettes = { ...THEMES, highContrast: HIGH_CONTRAST_PALETTE };

  it('keeps text and semantic colors at 4.5:1 on every theme surface', () => {
    for (const [themeName, palette] of Object.entries(palettes)) {
      for (const foreground of ['text', 'textDim', 'textMute', 'accent', 'success', 'warn', 'danger']) {
        for (const background of ['bg', 'surface', 'surface2']) {
          expectContrast(palette[foreground], palette[background], 4.5, themeName + ': ' + foreground + ' on ' + background);
        }
      }
      expectContrast(palette.onAccent, palette.accent, 4.5, themeName + ': onAccent on accent');
      expectContrast(palette.onAccent, palette.danger, 4.5, themeName + ': onAccent on danger');
    }
  });

  it('keeps component boundaries at 3:1 against adjacent surfaces', () => {
    for (const [themeName, palette] of Object.entries(palettes)) {
      expectContrast(palette.border, palette.bg, 3, themeName + ': border on background');
      expectContrast(palette.border, palette.surface, 3, themeName + ': border on surface');
    }
  });

  it('keeps every optional Kawaii accent readable on its closest surface', () => {
    const kawaii = THEMES.kawaii;
    for (const [accentName, colors] of Object.entries(LIGHT_ACCENT_THEMES)) {
      expectContrast(colors.accent, kawaii.surface2, 4.5, accentName + ': accent on Kawaii surface2');
      expectContrast('#ffffff', colors.accent, 4.5, accentName + ': white on accent');
    }
    expect(source).toContain("if (accent && accentChoice !== 'blue')");
  });

  it('uses native controls and explicit drill-library relationships', () => {
    expect(source).toContain("toggleFavorite ? h('button', {");
    expect(source).toContain("className: 'tp-favorite-toggle'");
    expect(source).not.toContain("toggleFavorite ? h('span', {");
    expect(source).toContain("h('section', { id: 'tp-drill-library'");
    expect(source).toContain("id: 'tp-drill-results'");
    expect(source).toContain("role: 'list'");
    expect(source).toContain("'aria-controls': 'tp-drill-results'");
    expect(source).toContain("'aria-describedby': 'tp-drill-results-status'");
  });

  it('supports visible focus, forced colors, reduced motion, and narrow reflow', () => {
    expect(source).toContain("'.tp-root select:focus-visible,'");
    expect(source).toContain("'@media (forced-colors: active) {'");
    expect(source).toContain("'@media (max-width: 560px) {'");
    expect(source).toContain("className: 'tp-shortcut-row'");
    expect(source).toContain("className: 'tp-visual-keyboard'");
    expect(source).toContain("overflowX: 'auto'");
    expect(source).toContain('function scrollTypingPracticeIntoView(element, block)');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).not.toMatch(/\.scrollIntoView\(\{ behavior: 'smooth'/);
  });

  it('keeps source and deploy mirror identical', () => {
    expect(source).toBe(mirror);
  });
});
