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
  'amber-50': '#fffbeb', 'amber-600': '#d97706', 'amber-700': '#b45309',
  'amber-800': '#92400e', 'amber-900': '#78350f',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-600': '#059669',
  'emerald-800': '#065f46', 'emerald-900': '#064e3b',
  'sky-50': '#f0f9ff', 'sky-800': '#075985', 'sky-900': '#0c4a6e',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-600': '#dc2626',
  'red-700': '#b91c1c', 'red-800': '#991b1b', 'red-900': '#7f1d1d',
  'blue-50': '#eff6ff', 'blue-500': '#3b82f6', 'blue-800': '#1e40af',
  'green-50': '#f0fdf4', 'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534',
  'violet-50': '#f5f3ff', 'violet-600': '#7c3aed', 'violet-700': '#6d28d9',
  'violet-800': '#5b21b6', 'violet-900': '#4c1d95',
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

  // ── Blind spot this suite used to have ──
  // Everything above scans Tailwind `text-*` CLASSES. The rockCycle family panel
  // colours its heading and property values from the DATA via inline
  // style={{ color: ... }}, so those were invisible here — and all three were
  // failing: igneous #ef4444 3.76:1, metamorphic #8b5cf6 4.23:1, and
  // sedimentary #eab308 at 1.92:1, effectively illegible. The bright `color` is
  // correct for the canvas (dark navy substrate) and for borders/glows, so the
  // fix was a separate `ink` for text rather than changing `color`.
  it('family colours used as TEXT clear AA on the light panel', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const rc = src.slice(src.indexOf("registerTool('rockCycle'"));
      // Scope to the ROCKS family table — the only place an ink is read from.
      const rocksTable = rc.slice(rc.indexOf('const ROCKS = ['), rc.indexOf('const PROCESSES = ['));
      const inks = [...rocksTable.matchAll(/ink:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1]);
      expect(inks, 'every rockCycle family needs a text-safe ink').toHaveLength(3);
      inks.forEach((hex) => {
        const r = contrast(hex, TW.white);
        expect(r, `ink ${hex} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('never renders text in the decorative family colour', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      // `color` stays for the canvas, borders, gradients and glows. Text takes
      // `ink`. A `style: { color: sel.color }` is the regression to catch.
      expect(src).not.toMatch(/style:\s*\{\s*color:\s*sel\.color\s*\}/);
      expect(src).not.toMatch(/style:\s*\{\s*color:\s*rock\.color\s*\}/);
    });
  });

  // The mirror of the data-driven-TEXT blind spot above. A panel that takes its
  // background from the data is just as invisible to a class-scanning audit —
  // and worse here: the mineral property cards used
  // style={{ background: selMineral.color }} behind slate-800 text, so every
  // dark mineral was unreadable. Magnetite was 1.00:1 — its text colour and its
  // background were the same colour.
  it('never paints a panel background from mineral data', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).not.toMatch(/style:\s*\{\s*background:\s*selMineral\.color\s*\}/);
      expect(src).not.toMatch(/style:\s*\{\s*background:\s*mineral\.color\s*\}/);
    });
  });

  it('keeps mineral colour free to mean the specimen colour', () => {
    // With the panel neutral, `color` is read only as the specimen's own colour
    // (swatch, cross-section, 3D base, and the streak lab's "looks like" chip).
    // It had been pale UI tints to survive as a background — pyrite showed as
    // cream when the streak lesson depends on it looking brassy.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const minerals = src.slice(src.indexOf('const MINERALS = ['), src.indexOf('const QUIZ_BANK'));
      const pyrite = minerals.slice(minerals.indexOf("{ id: 'pyrite'"));
      const hex = /color:\s*'(#[0-9a-fA-F]{6})'/.exec(pyrite);
      expect(hex, 'pyrite needs a colour').toBeTruthy();
      // Brass is a mid-tone; the old #fef3c7 was near-white.
      const lum = luminance(hex[1]);
      expect(lum, `pyrite ${hex[1]} should read as brass, not cream`).toBeLessThan(0.55);
      expect(lum).toBeGreaterThan(0.15);
    });
  });

  // ── The whole data-driven-colour class, in one place ──
  // Three separate rounds each found the same shape: a data field doing double
  // duty as both a decorative paint (canvas node, border, pale tint) and a text
  // or background colour. The convention that came out of it is `color` for the
  // decorative role, `ink` for text. These assertions pin every table that has
  // an ink so the split cannot quietly collapse back.
  it('every family/type ink clears AA as text on white', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const inks = [...src.matchAll(/ink:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1]);
      // rockCycle ROCKS (3) + rocks ROCK_TYPES (3)
      expect(inks.length).toBeGreaterThanOrEqual(6);
      inks.forEach((hex) => {
        const r = contrast(hex, TW.white);
        expect(r, `ink ${hex} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('never uses a bright family colour as text', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      // `color` stays for canvas nodes, borders and tints. Text takes `ink`.
      expect(src).not.toMatch(/color:\s*rt\.color\s*\}/);
      expect(src).not.toMatch(/color:\s*ROCK_TYPES\[[^\]]+\]\.color\s*\}/);
      expect(src).not.toMatch(/:\s*'white'\s*:\s*rock\.color\s*\}/);
    });
  });

  it('every mode banner accent clears AA — it doubles as the title colour', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const block = src.slice(src.indexOf('var MODE_META = {'), src.indexOf('var meta = MODE_META[mode]'));
      const accents = [...block.matchAll(/accent:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1]);
      expect(accents.length).toBe(6); // landscape, rocks, minerals, mystery, quiz, weathHunt
      accents.forEach((hex) => {
        const r = contrast(hex, TW.white);
        expect(r, `banner accent ${hex} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('lets the mode tabs wrap instead of overflowing a phone', () => {
    // Six mode tabs on one non-wrapping row measured 441px, so a 390px phone
    // scrolled the whole tool sideways and the last tabs sat off-screen.
    // Measured in a real browser; pinned here so it cannot regress silently.
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('flex flex-wrap gap-1 sm:ml-auto');
      expect(src).not.toContain('className: "flex gap-1 ml-auto"');
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

  it('every text colour in the rocks/minerals tool clears AA too', () => {
    // Same floor for the sibling `rocks` tool, which owns the specimen grids,
    // the mineral detail panels and the identification activities.
    const SURFACES_ROCKS = SURFACES.concat(['emerald-50', 'blue-50', 'green-50', 'red-50']);
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const body = src.slice(src.indexOf("registerTool('rocks'"), src.indexOf("registerTool('rockCycle'"));
      const used = new Set();
      classNamesIn(body).forEach((cn) => {
        [...cn.matchAll(/(?:^|\s)text-((?:slate|orange|amber|emerald|sky|red|blue|green|violet)-\d{2,3})/g)]
          .forEach((m) => used.add(m[1]));
      });

      expect(used.size).toBeGreaterThan(5);

      const failures = [];
      used.forEach((tc) => {
        expect(TW[tc], `unknown colour text-${tc} — add it to the table`).toBeTruthy();
        SURFACES_ROCKS.forEach((bg) => {
          const r = contrast(TW[tc], TW[bg]);
          if (r < 4.5) failures.push(`text-${tc} on ${bg} = ${r.toFixed(2)}:1`);
        });
      });

      expect(failures, `${p}\n  ${failures.join('\n  ')}`).toEqual([]);
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
