// WCAG AA contrast floor for the Rock Cycle tool's text palette.
//
// The STEM tool shell resolves --allo-stem-canvas to #ffffff in the DEFAULT
// theme, and this tool paints its own light panels (white, orange-50/100,
// sky-50, slate-50) on top — so every text colour it uses must clear 4.5:1
// against the panel it actually sits on. All of this tool's text is small
// (text-[10px] through text-sm), so the 3:1 large-text allowance never applies.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

const TW = {
  white: '#ffffff',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569',
  'slate-700': '#334155', 'slate-800': '#1e293b', 'slate-900': '#0f172a',
  'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-600': '#ea580c',
  'orange-700': '#c2410c', 'orange-800': '#9a3412', 'orange-900': '#7c2d12',
  'amber-50': '#fffbeb', 'amber-700': '#b45309', 'amber-800': '#92400e',
  'emerald-600': '#059669', 'emerald-800': '#065f46',
  'sky-50': '#f0f9ff', 'sky-800': '#075985',
  'red-100': '#fee2e2',
};

function luminance(hex) {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rockCycleBody(src) {
  return src.slice(src.indexOf("registerTool('rockCycle'"));
}
function classNamesIn(body) {
  return [...body.matchAll(/className:\s*"([^"]*)"/g)].map((m) => m[1])
    .concat([...body.matchAll(/className:\s*'([^']*)'/g)].map((m) => m[1]));
}

// Backgrounds this tool actually paints text on.
const SURFACES = ['white', 'orange-50', 'orange-100', 'slate-50', 'sky-50', 'amber-50'];

describe('rock cycle colour contrast', () => {
  it('every text colour clears WCAG AA 4.5:1 on every surface the tool uses', () => {
    PATHS.forEach((p) => {
      const body = rockCycleBody(readFileSync(p, 'utf8'));
      const used = new Set();
      classNamesIn(body).forEach((cn) => {
        [...cn.matchAll(/(?:^|\s)text-((?:slate|orange|amber|emerald|sky)-\d{2,3})/g)]
          .forEach((m) => used.add(m[1]));
      });

      expect(used.size).toBeGreaterThan(3); // sanity: we actually parsed something

      const failures = [];
      used.forEach((tc) => {
        expect(TW[tc], `unknown colour text-${tc} — add it to the table`).toBeTruthy();
        SURFACES.forEach((bg) => {
          const r = contrast(TW[tc], TW[bg]);
          if (r < 4.5) failures.push(`text-${tc} on ${bg} = ${r.toFixed(2)}:1`);
        });
      });

      expect(failures, `${p}\n  ${failures.join('\n  ')}`).toEqual([]);
    });
  });

  it('does not ship an app-wide text-slate-600 override', () => {
    // A single tool file was repainting EVERY .text-slate-600 in AlloFlow down to
    // slate-500 with !important — 7.58:1 → 4.76:1 on white, 4.48:1 on orange-50.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).not.toContain('.text-slate-600 { color: #64748b !important; }');
    });
  });

  it('keeps the low-contrast oranges and emeralds out of the rock cycle', () => {
    PATHS.forEach((p) => {
      const body = rockCycleBody(readFileSync(p, 'utf8'));
      // 3.56:1 and 3.77:1 on white respectively — both below the AA floor.
      expect(body).not.toContain('text-orange-600');
      expect(body).not.toContain('text-emerald-600');
      expect(body).not.toContain('text-slate-400');
    });
  });
});
