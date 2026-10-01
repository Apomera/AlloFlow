import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  M = window.AlloModules.AlloHavenInternals;
  if (!M || !M.getThemeBase || !M.localDateKey) throw new Error('AlloHavenInternals seam missing theme/date helpers');
});

function hexToRgb(hex) {
  hex = String(hex || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = '#' + hex.slice(1).split('').map((ch) => ch + ch).join('');
  }
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error('Expected hex color, got ' + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

describe('AlloHaven local calendar helpers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses local dates for today and offsets', () => {
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0, 0));
    expect(M.localDateKey()).toBe('2026-01-02');
    expect(M.localDateKeyOffset(-1)).toBe('2026-01-01');
    expect(M.localDateKey(new Date(2026, 6, 2, 23, 30, 0))).toBe('2026-07-02');
  });
});

describe('AlloHaven theme contrast contract', () => {
  const pairs = [
    ['text', 'surface'],
    ['textDim', 'surface'],
    ['textMute', 'surface'],
    ['text', 'bg'],
    ['textDim', 'bg'],
    ['textMute', 'bg'],
    ['accent', 'surface'],
    ['accent', 'bg'],
    ['onAccent', 'accent'],
    ['success', 'surface'],
    ['warn', 'surface'],
  ];

  it('keeps all theme token pairs at WCAG AA normal-text contrast', () => {
    const themes = ['default', 'steampunk', 'cyberpunk', 'kawaii', 'neutral'];
    const failures = [];
    themes.forEach((name) => {
      const palette = M.getThemeBase(name, false);
      pairs.forEach(([fgKey, bgKey]) => {
        const ratio = contrast(palette[fgKey], palette[bgKey]);
        if (ratio < 4.5) failures.push(`${name} ${fgKey}/${bgKey} ${ratio.toFixed(2)}`);
      });
    });
    const highContrast = M.getThemeBase('default', true);
    pairs.forEach(([fgKey, bgKey]) => {
      const ratio = contrast(highContrast[fgKey], highContrast[bgKey]);
      if (ratio < 4.5) failures.push(`highContrast ${fgKey}/${bgKey} ${ratio.toFixed(2)}`);
    });
    expect(failures).toEqual([]);
  });
});
