// Tailwind text-contrast gate, measured against the REAL ancestor ground.
//
// dev-tools/scan_theme_contrast.cjs covers inline `color:` only, and says so in its own
// header: Tailwind utilities are out of scope, and it "reads one line at a time" so it
// "cannot walk the DOM". This tool is almost entirely Tailwind classes, and one of the
// failures found here is composed at RUNTIME ('bg-' + accent + '-600'), so no source grep
// finds it either. Mounting the tool makes both tractable: resolve the colour a node
// inherits, walk up for the nearest opaque background, measure.
//
// TWO PROBE BUGS surfaced before this found any tool bug, which is why the self-test below
// exists:
//   * ignoring `bg-gradient-to-*` walked straight past the dark hero header and reported its
//     white title as white-on-white, 1.00:1 — a fabricated defect;
//   * a literal grep for `bg-sky-600` found nothing and nearly dismissed a REAL failure,
//     because that class is assembled from a variable at runtime.
// A gate proves only the shape it matches, so this one is calibrated on known-bad pairs and
// asserts how much it actually measured.
import { describe, it, expect, beforeAll } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
if (typeof act !== 'function') throw new Error('React.act unavailable');

const P = {
  slate: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' },
  gray:  { 100:'#f3f4f6',200:'#e5e7eb',300:'#d1d5db',400:'#9ca3af',500:'#6b7280',600:'#4b5563',700:'#374151',800:'#1f2937',900:'#111827' },
  emerald:{50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b',950:'#022c22'},
  amber: {50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f',950:'#451a03'},
  rose:  {50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337',950:'#4c0519'},
  violet:{50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#4c1d95',950:'#2e1065'},
  cyan:  {50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490',800:'#155e75',900:'#164e63',950:'#083344'},
  sky:   {50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49'},
  teal:  {100:'#ccfbf1',300:'#5eead4',700:'#0f766e',800:'#115e59',900:'#134e4a'},
  indigo:{100:'#e0e7ff',300:'#a5b4fc',700:'#4338ca',800:'#3730a3',900:'#312e81'},
  fuchsia:{100:'#fae8ff',300:'#f0abfc',700:'#a21caf',800:'#86198f',900:'#701a75'},
  lime:  {100:'#ecfccb',300:'#bef264',700:'#4d7c0f',800:'#3f6212',900:'#365314'},
  orange:{100:'#ffedd5',300:'#fdba74',700:'#c2410c',800:'#9a3412',900:'#7c2d12'},
  stone: {100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',700:'#44403c',800:'#292524',900:'#1c1917',950:'#0c0a09'},
};
const named = { white: '#ffffff', black: '#000000' };
const hex = (name, shade) => (name in named ? named[name] : (P[name] && P[name][shade]));
const lum = (h) => {
  const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

const clsOf = (el) => (typeof el.className === 'string' ? el.className : '');
const TEXT = /(?:^|\s)text-(white|black|[a-z]+-\d{2,3})(?:\s|$)/;
const BG = /(?:^|\s)bg-(white|black|[a-z]+-\d{2,3})(\/\d+)?(?:\s|$)/;

function parse(token) {
  if (token in named) return { name: token, shade: null, hex: named[token] };
  const [name, shade] = token.split('-');
  return { name, shade: Number(shade), hex: hex(name, Number(shade)) };
}
// Nearest opaque ancestor ground. A translucent one (bg-white/10) cannot be resolved without
// compositing, so it returns null and the node is skipped rather than guessed at.
function groundOf(el, rootBg) {
  let node = el, depth = 0;
  while (node && node.nodeType === 1 && depth < 60) {
    const cls = clsOf(node);
    if (/(?:^|\s)bg-gradient-to-/.test(cls)) {
      // A gradient IS the ground. Approximate by its `from-` stop; without this the walk
      // skipped the dark hero header and inherited a far ancestor's white.
      const g = cls.match(/(?:^|\s)from-(white|black|[a-z]+-\d{2,3})(?:\s|$)/);
      return g ? parse(g[1]) : null;
    }
    const m = cls.match(BG);
    if (m) return m[2] ? null : parse(m[1]);
    node = node.parentElement; depth++;
  }
  return rootBg;
}
function inheritedText(el) {
  let node = el, depth = 0;
  while (node && node.nodeType === 1 && depth < 60) {
    const m = clsOf(node).match(TEXT);
    if (m) return parse(m[1]);
    node = node.parentElement; depth++;
  }
  return null;
}
const ownText = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

const SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
const MODES = ['explore', 'investigate', 'assess'];

let cfg;
let report = null;

beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
  const fails = new Map();
  const unknown = new Set();
  let measured = 0;
  for (const isDark of [false, true]) {
    // The host paints the substrate; the tool's dark branch assumes slate-900 (it sets that
    // background itself at the root, see the comment at ~line 10303).
    const rootBg = isDark ? parse('slate-900') : { name: 'white', shade: null, hex: '#ffffff' };
    for (const scene of SCENES) {
      for (const mode of MODES) {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const store = newStore({ geologyExplorer: { scene, mode } });
        const ctx = makeCtx({ toolData: store.toolData, isDark }, store);
        const root = ReactDOMClient.createRoot(container);
        act(() => root.render(React.createElement(() => cfg.render(ctx))));
        for (const el of container.querySelectorAll('*')) {
          if (!hasOwnText(el)) continue;
          const fg = inheritedText(el);
          if (!fg) continue;
          if (!fg.hex) { unknown.add('text-' + fg.name + '-' + fg.shade); continue; }
          const bg = groundOf(el, rootBg);
          if (!bg || !bg.hex) continue;
          measured++;
          const r = ratio(fg.hex, bg.hex);
          if (r < 4.5) {
            fails.set(`${isDark ? 'dark' : 'light'} ${scene}/${mode}: text-${fg.name}-${fg.shade || ''}`
              + ` on bg-${bg.name}-${bg.shade || ''} = ${r.toFixed(2)} :: "${ownText(el).slice(0, 40)}"`, true);
          }
        }
        act(() => root.unmount());
        container.remove();
      }
    }
  }
  report = { fails: [...fails.keys()], unknown: [...unknown], measured };
}, 300000);

describe('Geology Explorer — Tailwind text contrast on the real ground', () => {
  it('measures the checker itself against known-bad and known-good pairs', () => {
    // Without this the gate could silently stop measuring and still pass.
    expect(ratio('#f59e0b', '#ffffff')).toBeLessThan(2.5);        // amber-500 on white: the bug that started this
    expect(ratio('#10b981', '#f8fafc')).toBeLessThan(3);          // emerald-500 on slate-50
    expect(ratio('#ffffff', '#0284c7')).toBeLessThan(4.5);        // white on sky-600
    expect(ratio('#ffffff', '#0369a1')).toBeGreaterThan(4.5);     // white on sky-700: the fix
    expect(ratio('#92400e', '#ffffff')).toBeGreaterThan(4.5);     // amber-800 on white: the fix
    expect(ratio('#ffffff', '#020617')).toBeGreaterThan(15);      // white on the hero gradient
  });

  it('actually measured a substantial number of text nodes', () => {
    expect(report.measured, 'the walker resolved almost nothing — it is not really checking')
      .toBeGreaterThan(1200);
  });

  it('knows every colour token the tool uses', () => {
    // An unknown token is skipped, so an unnoticed one is a hole in the gate.
    expect(report.unknown, `palette is missing: ${report.unknown.join(', ')}`).toEqual([]);
  });

  it('has no text below 4.5:1 in any scene, mode or theme', () => {
    expect(report.fails, `contrast failures:\n  ${report.fails.join('\n  ')}`).toEqual([]);
  });
});
