// Educator Evaluation theme support (2026-09-02): dark and high-contrast.
//
// The app's theme is an explicit setting applied as theme-dark / theme-contrast
// on a wrapper above every module (see dev-tools/scan_dark_mode_contrast.cjs
// for why Tailwind's OS-driven dark: variant cannot see it). The panel's
// stylesheet therefore scopes its overrides to those ancestor classes, and the
// standalone page mirrors the OS preference into data-ae-theme on <html>.
// These tests pin the mechanism and the palette's contrast, since jsdom does
// not cascade <style> rules; the rendered result is screenshot-verified.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'educator_evaluation_source.jsx'), 'utf8');
const module_ = readFileSync(resolve(root, 'educator_evaluation_module.js'), 'utf8');
const standalone = readFileSync(resolve(root, 'educator-evaluation.html'), 'utf8');
const styles = source.slice(source.indexOf('const AE_STYLES = `'), source.indexOf('`;', source.indexOf('const AE_STYLES = `')));

const luminance = (hex) => {
  const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const full = hex.length === 4 ? '#' + hex.slice(1).split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (a, b) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

describe('theme mechanism', () => {
  it('scopes dark and contrast overrides to the app wrapper classes and the standalone attribute', () => {
    expect(styles).toContain('.theme-dark .ae-shell,[data-ae-theme=dark] .ae-shell{--ae-ink:#e6ebf5');
    expect(styles).toContain('.theme-contrast .ae-shell,[data-ae-theme=contrast] .ae-shell{--ae-ink:#fff');
    // Never the OS media query for colour: that would fight the app toggle.
    expect(styles).not.toContain('prefers-color-scheme');
    // Windows forced-colours keeps borders and the selected tab visible.
    expect(styles).toContain('@media(forced-colors:active)');
    // Overrides ship in the built module and the standalone bundle.
    expect(module_).toContain('.theme-contrast .ae-shell,[data-ae-theme=contrast] .ae-shell');
    expect(readFileSync(resolve(root, 'educator_evaluation_standalone.js'), 'utf8')).toContain('[data-ae-theme=dark] .ae-shell');
  });

  it('the standalone page mirrors the OS preference, contrast winning over dark, in both copies', () => {
    expect(standalone).toContain("m('(prefers-contrast: more)').matches?'contrast'");
    expect(standalone).toContain("document.documentElement.setAttribute('data-ae-theme',theme)");
    expect(standalone.indexOf('data-ae-theme')).toBeLessThan(standalone.indexOf('educator_evaluation_standalone.js'));
    expect(readFileSync(resolve(root, 'desktop/web-app/public/educator-evaluation.html'), 'utf8')).toBe(standalone);
  });

  it('every hard-coded light surface the panel paints has a dark and a contrast override', () => {
    const dark = styles.slice(styles.indexOf('.theme-dark .ae-shell,'), styles.indexOf('.theme-contrast .ae-shell,'));
    const contrast = styles.slice(styles.indexOf('.theme-contrast .ae-shell,'), styles.indexOf('@media(forced-colors:active)'));
    for (const cls of ['.ae-card', '.ae-table', '.ae-record', '.ae-input', '.ae-btn', '.ae-btn-primary', '.ae-tab', '.ae-tabs', '.ae-note', '.ae-warn', '.ae-danger', '.ae-ok', '.ae-chip', '.ae-onboarding-card', '.ae-onboarding-option', '.ae-footer', '.ae-donut:after', '.ae-evidence', '.ae-comment', '.ae-step:before', '.ae-local-banner', '.ae-remote-banner', '.ae-setup-next']) {
      expect(dark, 'dark override for ' + cls).toContain(cls);
      expect(contrast, 'contrast override for ' + cls).toContain(cls);
    }
  });
});

describe('theme palettes clear WCAG AA', () => {
  it('dark text-on-surface pairs', () => {
    const pairs = [
      ['#e6ebf5', '#162032'], ['#aab6c8', '#162032'], ['#c7d0e0', '#162032'], ['#8ab4ff', '#162032'], ['#e6ebf5', '#0f172a'],
      ['#b9c4d8', '#111a2b'], ['#c7d0e0', '#111a2b'], ['#e6ebf5', '#1b2740'], ['#fff', '#2f6fe4'], ['#fff', '#c81e4a'],
      ['#cfe0ff', '#14233d'], ['#ffe9b8', '#3a2c08'], ['#ffd98a', '#3a2c08'], ['#a8ecc0', '#052e1c'], ['#ffb3c0', '#3d1520'],
      ['#d6d3ff', '#1e1b4b'], ['#dcd2ff', '#2a1f4d'], ['#a5f3fc', '#082f36'], ['#12305a', '#e6ebf5'], ['#e6ebf5', '#12305a'],
    ];
    for (const [fg, bg] of pairs) expect(ratio(fg, bg), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
  });

  it('contrast theme pairs clear AAA', () => {
    for (const [fg, bg] of [['#fff', '#000'], ['#fbbf24', '#000'], ['#000', '#fbbf24'], ['#fff', '#1a1a1a']]) {
      expect(ratio(fg, bg), fg + ' on ' + bg).toBeGreaterThanOrEqual(7);
    }
  });
});
