// Bike Lab, leftovers round (2026-11-23, late).
// 1. High contrast on Gearing Lab, Bike Fit, Helmet Fit, Winter, Parts Inspector and the Safety Quiz: no pale panel
//    keeps its light fill under white text, dark inks turn yellow, the gear matrix keeps dark numbers on its pale
//    cells, the hand-signal riders and the parts diagram get a pale ground, and white labels sit on fills dark enough
//    to read (Bike Fit and Braking cards, every theme).
// 2. The Repair Simulator's work stand shows what is off the bike (front wheel, tube, pedal) once the step that took
//    it off is done, and never before: it shows the bike's state, not which tool the step needs.
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('anchors missing: ' + from); return src.slice(a, b); };
const h = (tag, props, ...kids) => ({ tag, props: props || {}, kids: kids.flat(Infinity).filter((k) => k != null && k !== false) });
const all = (nodes, pred, out = []) => { for (const n of [].concat(nodes)) if (n && n.tag) { if (pred(n)) out.push(n); all(n.kids, pred, out); } return out; };

// The tool's own contrast-theme CSS, and what the host (stem_lab_module.js) already turns black / white.
const css = cut("st.id = 'allo-stem-bikelab-refine-css';", '].join(');
const toolBlackened = (() => { const m = css.match(/\.theme-contrast \.bikelab-root :is\(([^)]*\.bg-slate-200[^)]*)\)\{background-color:#000000/); return m ? m[1].split(',').map((s) => s.trim().slice(1)) : []; })();
const toolYellowInk = (() => { const m = css.match(/\.theme-contrast \.bikelab-root :is\(([^)]*\.text-indigo-700[^)]*)\)\{color:#ffff00/); return m ? m[1].split(',').map((s) => s.trim().slice(1)) : []; })();
const HOST_BLACKENED = ['bg-white', 'bg-slate-50', 'bg-slate-100', 'bg-slate-800', 'bg-slate-900', 'bg-slate-950'];
const VIEWS = {
  GearingLab: ['      function GearingLab() {', '      function RepairSim() {'],
  BikeFit: ['      function BikeFit() {', '      function BrakingPhysics() {'],
  SafetyQuiz: ['      function SafetyQuiz() {', '      function NeighborhoodRide() {'],
  PartsInspector: ['      function PartsInspector() {', '      function bikeDiagramArt(o) {'],
  HelmetFit: ['      function HelmetFit() {', '      function WinterBike() {'],
  WinterBike: ['      function WinterBike() {', 'SIGNAL REACTION DRILL']
};
// Class tokens in a view, without hover:/focus: variants.
const tokens = (code, re) => { const out = new Set(); for (const m of code.matchAll(re)) { const before = code[m.index - 1]; if (before !== ':' && before !== '-') out.add(m[0]); } return [...out]; };

// WCAG contrast from hex.
const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const TW = { 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'red-600': '#dc2626', 'red-700': '#b91c1c', 'orange-500': '#f97316', 'orange-700': '#c2410c', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e', 'yellow-500': '#eab308', 'yellow-700': '#a16207', 'purple-500': '#a855f7', 'purple-600': '#9333ea', 'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf', 'emerald-600': '#059669', 'emerald-700': '#047857', 'teal-700': '#0f766e', 'teal-800': '#115e59', 'sky-600': '#0284c7', 'sky-700': '#0369a1', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af', 'violet-600': '#7c3aed', 'purple-700': '#7e22ce', 'pink-700': '#be185d', 'slate-600': '#475569', 'slate-800': '#1e293b', 'orange-700b': '#c2410c' };
const gradStops = (cls) => [...cls.matchAll(/(?:from|to)-([a-z]+-\d{3})/g)].map((m) => TW[m[1]]);

describe('High contrast on the six views round 2 did not reach', () => {
  it('every pale fill these views use is turned black by the host or by the tool (white text on it read 1.1:1)', () => {
    const covered = new Set(HOST_BLACKENED.concat(toolBlackened));
    const missing = [];
    for (const [name, [a, b]] of Object.entries(VIEWS)) {
      for (const t of tokens(cut(a, b), /\b(?:bg|from|to)-(?!slate)[a-z]+-(?:50|100)\b/g)) if (!covered.has(t)) missing.push(name + ': ' + t);
    }
    expect(missing).toEqual([]);
  });

  it('dark inks in these views turn yellow on black (sky-900 "New to riding?" read 2.2:1; violet-600 "85" 3.7:1)', () => {
    const yellow = new Set(toolYellowInk);
    // light enough on black already (at least 4.5:1)
    const fineOnBlack = new Set(['text-emerald-500', 'text-emerald-600', 'text-amber-500', 'text-amber-200', 'text-indigo-300', 'text-cyan-300']);
    const missing = [];
    for (const [name, [a, b]] of Object.entries(VIEWS)) {
      for (const t of tokens(cut(a, b), /\btext-(?!slate|white|black)[a-z]+-(?:600|700|800|900)\b/g)) if (!yellow.has(t) && !fineOnBlack.has(t)) missing.push(name + ': ' + t);
    }
    expect(missing).toEqual([]);
  });

  it('the gear matrix keeps dark numbers on its pale cells in the contrast theme, and rings the chosen cell', () => {
    const g = cut('      function GearingLab() {', '      function RepairSim() {');
    expect(g).toContain("style: isContrast ? { background: heat(gi), color: '#000000', boxShadow: isCur ? 'inset 0 0 0 3px #000000' : 'none' } : { background: heat(gi) }");
    // the host forces slate text white with !important, so the slate class must go in the contrast theme
    expect(g).toContain("(isContrast ? '' : 'text-slate-700 ')");
  });

  it('the "This Gear" card turns black with a white edge, its tire turns white, and faded labels go solid', () => {
    expect(css).toContain('.theme-contrast .bikelab-hc-panel{background:#000000!important');
    expect(css).toContain(':is(.opacity-70,.opacity-75,.opacity-80,.opacity-90,.opacity-95){opacity:1!important}');
    const g = cut('      function GearingLab() {', '      function RepairSim() {');
    expect(g).toContain("className: 'bikelab-hc-panel bg-gradient-to-br from-violet-600 to-purple-600");
    expect(g).toContain("stroke: isContrast ? '#ffffff' : '#1e1b4b', strokeWidth: 10");
  });

  it('the chosen bike carries a check mark, not only a border color', () => {
    const g = cut('      function GearingLab() {', '      function RepairSim() {');
    expect(g).toContain("'aria-pressed': bikeId === b.id ? 'true' : 'false'");
    expect(g).toContain("bikeId === b.id && h('span', { 'aria-hidden': 'true', 'data-gear-bike-check': 'true'");
  });

  it('borderless buttons the host fills black get an edge, and dark-filled buttons get a white ring', () => {
    expect(css).toContain("button:is(.bg-white,.bg-slate-100):not(.border):not(.border-2):not(:disabled){border:2px solid #ffff00!important}");
    expect(css).toContain('button:is(.bg-indigo-700,.bg-sky-800,.bg-fuchsia-700,.bg-violet-700){box-shadow:0 0 0 2px #ffffff!important}');
  });

  it('the hand-signal riders and the parts diagram sit on a pale ground (dark arms and tires vanished on black)', () => {
    const pose = cut('      function armPoseSvg(kind) {', '      function SignalDrill() {');
    const draw = new Function('h', pose + '\nreturn armPoseSvg;')(h);
    const svg = draw('left_up');
    expect(svg.kids[0].tag).toBe('rect');
    expect(svg.kids[0].props.fill).toBe('#f1f5f9');
    expect(ratio('#f1f5f9', '#0f172a')).toBeGreaterThan(4.5);     // the arms
    const parts = cut('      function PartsInspector() {', '      function bikeDiagramArt(o) {');
    expect(parts).toContain("h('rect', { x: 0, y: 0, width: 500, height: 300, rx: 14, fill: '#f8fafc', 'data-bikelab-parts-ground': 'true' })");
    // the selection outline reads on that ground (amber-500 was 2.1:1)
    expect(parts).toContain("partShape(selected, { key: 'sel', fill: 'none', stroke: '#b45309'");
    expect(ratio('#b45309', '#f8fafc')).toBeGreaterThan(3);
  });

  it('white labels on the Bike Fit and Braking cards reach 4.5:1 on every color stop', () => {
    const fit = cut('      function BikeFit() {', '      function BrakingPhysics() {');
    const brk = cut('      function BrakingPhysics() {', '      function SafetyQuiz() {');
    const colors = [...fit.matchAll(/color: '(from-[a-z]+-\d{3} to-[a-z]+-\d{3})'/g), ...brk.matchAll(/color: '(from-[a-z]+-\d{3} to-[a-z]+-\d{3})'/g)].map((m) => m[1]);
    expect(colors.length).toBe(10);
    const weak = [];
    for (const c of colors) for (const stop of gradStops(c)) { expect(stop, c).toBeTruthy(); if (ratio('#ffffff', stop) < 4.5) weak.push(c + ' ' + stop + ' ' + ratio('#ffffff', stop).toFixed(2)); }
    expect(weak).toEqual([]);
    expect(brk).not.toContain("className: 'text-xs opacity-80 uppercase tracking-wider font-bold' }, s.label)");
  });
});

describe('Repair work stand shows what is off the bike', () => {
  const P = () => new Function(cut('  var REPAIR_JOBS = [', '  // SECTION 4').replace(/\n[^\n]*$/, '') + '\nreturn { REPAIR_JOBS, repairBikeState, repairFocus };')();
  const art = () => new Function('h', cut('      function bikeDiagramArt(o) {', '      // ───') + '\nreturn bikeDiagramArt;')(h);

  it('a part is off only once the step that takes it off is done, and back once the step that refits it is done', () => {
    const { REPAIR_JOBS, repairBikeState } = P();
    const steps = REPAIR_JOBS.find((j) => j.id === 'patch_tube').steps.map((s) => s.id);
    const at = (id, done) => Object.keys(repairBikeState('patch_tube', steps.indexOf(id), done)).sort().join(' ');
    expect(at('remove_wheel', false)).toBe('');            // before the pick: the whole bike, so nothing hints at the tool
    expect(at('remove_wheel', true)).toBe('wheelOff');
    expect(at('lever_tire', false)).toBe('wheelOff');
    expect(at('lever_tire', true)).toBe('tubeOut wheelOff');
    expect(at('press_patch', false)).toBe('tubeOut wheelOff');
    expect(at('press_patch', true)).toBe('patched tubeOut wheelOff');
    expect(at('reseat', false)).toBe('patched tubeOut wheelOff');
    expect(at('reseat', true)).toBe('wheelOff');           // the tube (and its patch) are back inside the tire
    expect(at('inflate', true)).toBe('wheelOff');          // the job has no "put the wheel back" step
    const pedal = REPAIR_JOBS.find((j) => j.id === 'pedal_change').steps.map((s) => s.id);
    expect(Object.keys(repairBikeState('pedal_change', pedal.indexOf('loosen_right'), false))).toEqual([]);
    expect(Object.keys(repairBikeState('pedal_change', pedal.indexOf('loosen_right'), true))).toEqual(['pedalOff']);
    expect(Object.keys(repairBikeState('pedal_change', pedal.indexOf('thread_by_hand'), true))).toEqual([]);
    expect(repairBikeState('chain_clean', 3, true)).toEqual({});
    expect(repairBikeState('patch_tube', null, true)).toEqual({});
  });

  it('the drawing takes the wheel out of the fork and lays it, the tube and the patch on the floor; the pedal goes', () => {
    const draw = art();
    const whole = draw({ lifted: true });
    expect(all(whole, (n) => n.props['data-bikelab-wheel-at']).map((n) => n.props['data-bikelab-wheel-at'])).toEqual(['120,250', '425,250']);
    expect(all(whole, (n) => n.props['data-bikelab-tube-out'])).toHaveLength(0);
    expect(all(whole, (n) => n.props['data-bikelab-pedal'])).toHaveLength(1);
    const off = draw({ lifted: true, state: { wheelOff: true, tubeOut: true, patched: true, pedalOff: true } });
    expect(all(off, (n) => n.props['data-bikelab-wheel-at']).map((n) => n.props['data-bikelab-wheel-at'])).toEqual(['floor', '425,250']);
    expect(all(off, (n) => n.props['data-bikelab-tube-out'])).toHaveLength(1);
    expect(all(off, (n) => n.props['data-bikelab-tube-patch'])).toHaveLength(1);
    expect(all(off, (n) => n.props['data-bikelab-pedal'])).toHaveLength(0);
    // everything on the floor stays inside the 300-high picture once the stand lifts the bike 16 units
    for (const e of all(off, (n) => n.tag === 'ellipse')) expect(e.props.cy + e.props.ry - 16).toBeLessThanOrEqual(300);
  });

  it('the job view passes the state to the stand, says it in the label, and moves the wheel ring to the floor', () => {
    const r = cut('      function RepairSim() {', '      function BikeFit() {');
    expect(r).toContain('workStand(job.id, currStep.id, { state: repairBikeState(job.id, step, stepDone) })');
    expect(r).toContain("'aria-label': 'A bike on a work stand. Ringed: ' + f.where + '.' + (stateWords ? ' ' + stateWords : '')");
    expect(r).toContain("{ rect: [44, 286, 112, 30] }");
    // the job list thumbnails still show the whole bike
    expect(r).toContain('workStand(j.id, null, { thumb: true })');
  });

  it('with the tube out, the ring and the words point at the tube', () => {
    const { REPAIR_JOBS, repairFocus } = P();
    for (const id of ['locate_hole', 'rough_patch', 'apply_glue', 'press_patch']) {
      const f = repairFocus('patch_tube', id);
      expect(f.where, id).toMatch(/inner tube/);
      expect(f.outlines[0].rect, id).toEqual([162, 287, 96, 28]);
    }
    expect(REPAIR_JOBS.length).toBe(7);
  });
});
