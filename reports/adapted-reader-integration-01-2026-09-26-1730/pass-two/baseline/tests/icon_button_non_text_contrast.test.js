import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// WCAG 2.2 SC 1.4.11 Non-text Contrast: the visual boundary of a control must
// reach 3:1 against what is behind it. An icon-only button IS that control, so
// its glyph is held to 3:1 — not the 4.5:1 that body text needs, and not
// nothing at all. `text-slate-400` is 2.56:1 on white before a hover even
// happens, which is why these four buttons were the real defects in a list of
// 39 flagged pairs: everything else was already at or above 3:1.
const TW = {
  'slate-400': [148, 163, 184],
  'slate-500': [100, 116, 139],
  'slate-100': [241, 245, 249],
  'amber-600': [217, 119, 6],
  'amber-700': [180, 83, 9],
  'amber-100': [254, 243, 199],
  'rose-50': [255, 241, 242],
  'red-50': [254, 242, 242],
  white: [255, 255, 255],
};

function relLum([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// The four icon buttons that failed, with the ground each sits on at rest and
// on hover. Named individually so a rename fails loudly instead of silently
// dropping a case.
const ICON_BUTTONS = [
  {
    file: 'view_analysis_source.jsx',
    what: 'dismiss-grammar-note X',
    needle: 'rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    grounds: ['white', 'slate-100'],
  },
  {
    file: 'view_history_panel_source.jsx',
    what: 'resource drag handle',
    needle: "'text-slate-500 hover:bg-slate-100 hover:text-slate-700'",
    grounds: ['white', 'slate-100'],
  },
  {
    file: 'sped_timelines_source.jsx',
    what: 'delete-timeline trash',
    needle: "'text-slate-500 hover:text-rose-700 hover:bg-rose-50'",
    grounds: ['white', 'rose-50'],
  },
  {
    file: 'reading_library_module.js',
    what: 'remove-word x',
    needle: 'text-[12px] text-slate-500 hover:text-red-600 hover:bg-red-50',
    grounds: ['white', 'red-50'],
  },
  {
    file: 'word_sounds_module.js',
    what: 'expand-anchor arrow',
    needle: 'hover:bg-amber-100 text-amber-700 text-xs',
    grounds: ['white', 'amber-100'],
  },
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

describe('Icon-only buttons meet WCAG 1.4.11 (3:1 non-text contrast)', () => {
  for (const b of ICON_BUTTONS) {
    it(`${b.what} in ${b.file} keeps its darkened ink`, () => {
      const src = read(b.file);
      expect(src.includes(b.needle),
        `${b.what} lost its fix — the class string changed or reverted`).toBe(true);

      // Derive the ink from the class that actually ships, so this cannot
      // pass by asserting a colour the file no longer uses.
      const ink = /text-slate-500/.test(b.needle) ? TW['slate-500'] : TW['amber-700'];
      for (const g of b.grounds) {
        const r = ratio(ink, TW[g]);
        expect(r, `${b.what} is ${r.toFixed(2)}:1 on ${g}`).toBeGreaterThanOrEqual(3);
      }
    });
  }

  it('none of the five files reintroduces a 400-weight grey icon', () => {
    // 2.56:1 on white. The whole point of the pass.
    const offenders = [];
    for (const b of ICON_BUTTONS) {
      const src = read(b.file);
      const hits = src.match(/text-(?:slate|gray|zinc|neutral)-400 hover:/g) || [];
      if (hits.length) offenders.push(`${b.file}: ${hits.join(', ')}`);
    }
    expect(offenders, 'a 400-weight grey icon button is back').toEqual([]);
  });

  // The built _module.js twins ship; editing only the .jsx leaves them stale.
  it('keeps each built module in step with its source', () => {
    const pairs = [
      ['view_analysis_source.jsx', 'view_analysis_module.js'],
      ['view_history_panel_source.jsx', 'view_history_panel_module.js'],
      ['sped_timelines_source.jsx', 'sped_timelines_module.js'],
    ];
    for (const [src, mod] of pairs) {
      if (!fs.existsSync(path.join(ROOT, mod))) continue;
      const s = (read(src).match(/text-slate-400 hover:/g) || []).length;
      const m = (read(mod).match(/text-slate-400 hover:/g) || []).length;
      expect(m, `${mod} still carries a 400-weight grey the source dropped`).toBe(0);
      expect(s, `${src} carries a 400-weight grey`).toBe(0);
    }
  });

  // Guards the reasoning itself: if these constants were wrong, every
  // assertion above would be measuring the wrong thing.
  it('uses the real Tailwind values', () => {
    expect(ratio(TW['slate-400'], TW.white)).toBeCloseTo(2.56, 1);
    expect(ratio(TW['slate-500'], TW.white)).toBeCloseTo(4.76, 1);
    expect(ratio(TW['amber-600'], TW['amber-100'])).toBeCloseTo(2.86, 1);
    expect(ratio(TW['amber-700'], TW['amber-100'])).toBeCloseTo(4.51, 1);
  });
});
