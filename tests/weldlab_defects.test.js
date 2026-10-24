import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const SIZES = [[900, 280], [690, 215], [320, 190]];

/**
 * Lane DH: Defect Hunt v2 (locate -> classify -> explain), Defect Diagnose v2
 * and the Defect Catalog mastery ladder. These pin the geometry that v1 got
 * wrong (defects drifting off the bead, an elliptical 40x12.6 px hit area), the
 * keyboard path that bypassed the catalog, the look-alikes staying out of the
 * six-type catalog, the Diagnose answers agreeing with _computeWeldDefects,
 * and untrusted saved state.
 */

beforeEach(() => {
  // A mounted test mirrors the catalog into this slot and localStorage; the
  // menu hydrates from them, so clear both or one test leaks into the next.
  window.__alloflowWeldLab = undefined;
  try { localStorage.clear(); } catch (e) {}
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

const core = () => window.__WeldLabCore;
const surfaceMarks = (g) => g.marks.filter((m) => m.surface !== false);

describe('Defect Hunt geometry: marks live in bead coordinates', () => {
  it('keeps every mark on its bead feature at three canvas sizes', () => {
    const { DH_SAMPLE_GEOM, dhFrame, dhToPx, dhHwAt, dhFromPx } = core();
    Object.keys(DH_SAMPLE_GEOM).forEach((sid) => {
      const g = DH_SAMPLE_GEOM[sid];
      SIZES.forEach(([W, H]) => {
        const f = dhFrame(g, W, H);
        g.marks.forEach((m) => {
          const p = dhToPx(f, m.u, m.v);
          const hw = dhHwAt(f, m.u);
          const dy = Math.abs(p.y - f.cy);
          const tag = sid + ' ' + m.id + ' @' + W + 'x' + H;
          expect(p.x, tag + ' x inside the bead run').toBeGreaterThanOrEqual(f.x0 - 1e-9);
          expect(p.x, tag).toBeLessThanOrEqual(f.x1 + 1e-9);
          if (Math.abs(m.v) <= 1) {
            // On the bead: the offset is the same FRACTION of the local
            // half-width at every size.
            expect(dy / hw, tag + ' on-bead fraction').toBeCloseTo(Math.abs(m.v), 6);
          } else if (m.type === 'undercut' || m.type === 'overlap') {
            // Toe defects sit just past the toe, never out on the plate.
            expect(dy, tag + ' past the toe').toBeGreaterThan(hw);
            expect(dy, tag + ' still at the toe').toBeLessThanOrEqual(hw + 0.3 * f.hw0 + 1e-9);
          }
          if (m.surface !== false) {
            const back = dhFromPx(f, p.x, p.y);
            expect(back.u, tag + ' round-trip u').toBeCloseTo(m.u, 6);
            expect(back.v, tag + ' round-trip v').toBeCloseTo(m.sym ? m.v : m.v, 6);
          }
        });
      });
    });
  });

  it('puts the v1 offender (undercut beside the top toe) on the toe, not 14 px above the bead', () => {
    const { DH_SAMPLE_GEOM, dhFrame, dhToPx, dhHwAt } = core();
    const g = DH_SAMPLE_GEOM.sampleA;
    const uc = g.marks.find((m) => m.type === 'undercut');
    SIZES.forEach(([W, H]) => {
      const f = dhFrame(g, W, H);
      const p = dhToPx(f, uc.u, uc.v);
      const toe = f.cy - dhHwAt(f, uc.u);
      expect(Math.abs(p.y - toe), 'undercut px from the toe @' + W + 'x' + H).toBeLessThan(0.15 * f.hw0 + 1e-9);
    });
  });
});

describe('Defect Hunt hit test is a pixel circle', () => {
  it('hits inside the radius and misses outside it in every direction', () => {
    const { DH_SAMPLE_GEOM, dhFrame, dhToPx, dhHitRadius, dhHitTest } = core();
    const g = DH_SAMPLE_GEOM.sampleA;
    const crater = g.marks.find((m) => m.type === 'craterCrack');
    SIZES.forEach(([W, H]) => {
      const f = dhFrame(g, W, H);
      const R = dhHitRadius(f);
      const c = dhToPx(f, crater.u, crater.v);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const inside = dhHitTest(f, [crater], c.x + Math.cos(a) * R * 0.97, c.y + Math.sin(a) * R * 0.97);
        const outside = dhHitTest(f, [crater], c.x + Math.cos(a) * R * 1.03, c.y + Math.sin(a) * R * 1.03);
        expect(inside && inside.mark.id, 'inside @' + W + 'x' + H + ' angle ' + k).toBe(crater.id);
        expect(outside, 'outside @' + W + 'x' + H + ' angle ' + k).toBeNull();
      }
      // >= 24 px target even on a phone.
      expect(2 * R).toBeGreaterThanOrEqual(24);
    });
  });

  it('draws the found ring at exactly the clickable radius', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const body = src.slice(src.indexOf('function dhPaintSurface('), src.indexOf('// ── Cut & etch cross-section ──'));
    expect(body).toContain('var R = dhHitRadius(f);');
    // Every ring round a mark (called, revealed, pending) and the reticle use
    // exactly the hit radius -- v1's found ring was bigger than its click area.
    const rings = [...body.matchAll(/dhRing\(c, \w+\.x, \w+\.y, ([^,]+),/g)].map((m) => m[1].trim());
    expect(rings.length).toBe(3);
    rings.forEach((r) => expect(r).toBe('R'));
    const reticle = [...body.matchAll(/arc\(rp\.x, rp\.y, ([^,]+),/g)].map((m) => m[1].trim());
    expect(reticle.length).toBe(2);
    reticle.forEach((r) => expect(r).toBe('R'));
  });

  it('gives every mark its own hit circle: probing a mark\'s centre selects that mark', () => {
    const { DH_SAMPLE_GEOM, dhFrame, dhToPx, dhHitTest } = core();
    Object.keys(DH_SAMPLE_GEOM).forEach((sid) => {
      const g = DH_SAMPLE_GEOM[sid];
      SIZES.forEach(([W, H]) => {
        const f = dhFrame(g, W, H);
        surfaceMarks(g).forEach((m) => {
          const p = dhToPx(f, m.u, m.sym ? -Math.abs(m.v) : m.v);
          const hit = dhHitTest(f, g.marks, p.x, p.y);
          expect(hit && hit.mark.id, sid + ' ' + m.id + ' @' + W + 'x' + H).toBe(m.id);
        });
      });
    });
  });
});

describe('Defect Hunt state machine: locate, classify, explain', () => {
  it('only SELECTS on a probe; the name comes from the student\'s classification', () => {
    const { DH_SAMPLE_GEOM, dhHuntInit, dhHuntReduce, dhFrame, dhToPx } = core();
    const g = DH_SAMPLE_GEOM.sampleA;
    const m = g.marks.find((x) => x.type === 'porosity');
    const f = dhFrame(g, 900, 280);
    const p = dhToPx(f, m.u, m.v);
    let r = dhHuntReduce(dhHuntInit('sampleA'), { type: 'probePx', x: p.x, y: p.y, W: 900, H: 280 }, g);
    expect(r.state.pending).toBe(m.id);
    expect(r.events).toEqual([]);
    expect(Object.keys(r.state.picks)).toEqual([]);
    r = dhHuntReduce(r.state, { type: 'classify', cls: 'undercut' }, g);
    expect(r.state.picks[m.id]).toEqual({ cls: 'undercut', ok: false });
    expect(r.events).toEqual([{ kind: 'found', type: 'porosity', ok: false, sampleId: 'sampleA' }]);
  });

  it('counts a click on plain metal as a false read, and a look-alike as a classification', () => {
    const { DH_SAMPLE_GEOM, dhHuntInit, dhHuntReduce, dhHuntScore, dhFrame, dhToPx } = core();
    const g = DH_SAMPLE_GEOM.sampleA;
    const f = dhFrame(g, 900, 280);
    let s = dhHuntInit('sampleA');
    s = dhHuntReduce(s, { type: 'probePx', x: 5, y: 5, W: 900, H: 280 }, g).state;
    expect(s.falseReads).toBe(1);
    const sp = g.marks.find((x) => x.look === 'spatter');
    const p = dhToPx(f, sp.u, sp.v);
    s = dhHuntReduce(s, { type: 'probePx', x: p.x, y: p.y, W: 900, H: 280 }, g).state;
    expect(s.pending).toBe(sp.id);
    const r = dhHuntReduce(s, { type: 'classify', cls: 'porosity' }, g);
    expect(r.events[0]).toMatchObject({ kind: 'lookalike', ok: false });
    const sc = dhHuntScore(r.state, g);
    expect(sc.falseCalls).toBe(1);
    expect(sc.found).toBe(0);
  });

  it('makes incomplete fusion findable ONLY through the cut-and-etch section', () => {
    const { DH_SAMPLE_GEOM, dhHuntInit, dhHuntReduce, dhFrame, dhToPx, dhSectionMarks } = core();
    const g = DH_SAMPLE_GEOM.sampleB;
    const lof = g.marks.find((x) => x.type === 'lackOfFusion');
    const f = dhFrame(g, 900, 280);
    const p = dhToPx(f, lof.u, lof.v);
    let s = dhHuntInit('sampleB');
    const r1 = dhHuntReduce(s, { type: 'probePx', x: p.x, y: p.y, W: 900, H: 280 }, g);
    expect(r1.state.note.kind).toBe('hint');
    expect(r1.state.pending).toBeNull();
    expect(r1.state.falseReads).toBe(0);
    s = dhHuntReduce(r1.state, { type: 'cut', u: lof.u }, g).state;
    expect(dhSectionMarks(g, s.cuts[0]).map((m) => m.id)).toContain(lof.id);
    s = dhHuntReduce(s, { type: 'probeFeature', id: lof.id }, g).state;
    expect(s.pending).toBe(lof.id);
    const r2 = dhHuntReduce(s, { type: 'classify', cls: 'lackOfFusion' }, g);
    expect(r2.events[0]).toMatchObject({ kind: 'found', type: 'lackOfFusion', ok: true });
  });

  it('limits a sample to three destructive cuts', () => {
    const { DH_SAMPLE_GEOM, dhHuntInit, dhHuntReduce } = core();
    const g = DH_SAMPLE_GEOM.sampleB;
    let s = dhHuntInit('sampleB');
    [0.2, 0.4, 0.6, 0.8].forEach((u) => { s = dhHuntReduce(s, { type: 'cut', u }, g).state; });
    expect(s.cuts).toEqual([0.2, 0.4, 0.6]);
    expect(s.note.kind).toBe('noCuts');
  });

  it('keeps the six catalog types and the look-alikes in separate tables', () => {
    const { DH_DEFECT_TYPES, DH_LOOK_KINDS, DH_EXTRA_KINDS, DH_SAMPLE_GEOM } = core();
    expect(DH_DEFECT_TYPES).toEqual(['porosity', 'undercut', 'lackOfFusion', 'coldLap', 'craterCrack', 'overlap']);
    DH_LOOK_KINDS.concat(DH_EXTRA_KINDS).forEach((k) => expect(DH_DEFECT_TYPES).not.toContain(k));
    let looks = 0;
    Object.values(DH_SAMPLE_GEOM).forEach((g) => g.marks.forEach((m) => {
      if (m.type === 'ok') { looks++; expect(DH_LOOK_KINDS).toContain(m.look); }
      else expect(DH_DEFECT_TYPES).toContain(m.type);
    }));
    expect(looks).toBeGreaterThanOrEqual(9);
    // Every requested look-alike appears on at least one sample.
    const used = new Set();
    Object.values(DH_SAMPLE_GEOM).forEach((g) => g.marks.forEach((m) => { if (m.look) used.add(m.look); }));
    ['spatter', 'ripple', 'heatTint', 'tack', 'millScale', 'soapstone', 'cleanBand'].forEach((k) => expect(used.has(k), k).toBe(true));
  });

  it('still counts six catalog types on the menu tile and in the catalog view', () => {
    const now = '2026-10-01T12:00:00.000Z';
    const full = {};
    ['porosity', 'undercut', 'lackOfFusion', 'coldLap', 'craterCrack', 'overlap'].forEach((k) => {
      full[k] = { firstFoundAt: now, lastFoundAt: now, foundCount: 1, firstSampleId: 'sampleA', sampleIds: ['sampleA'] };
    });
    expect(renderTool('weldLab', { weldLab: {} })).toContain('0 / 6');
    expect(renderTool('weldLab', { weldLab: { defectCatalog: full } })).toContain('6 / 6');
    // A catalog carrying look-alike keys still counts only the six.
    const withLooks = Object.assign({ spatter: full.porosity, haz: full.porosity, burnthrough: full.porosity }, { porosity: full.porosity });
    const html = renderTool('weldLab', { weldLab: { view: 'defectCatalog', defectCatalog: withLooks } });
    expect(html).toContain('1 / 6');
    expect(html).not.toContain('Light spatter');
  });
});

describe('Defect Hunt keyboard path has parity with the pointer', () => {
  it('reaches a defect with reticle moves, then logs it exactly as a click does (pure)', () => {
    const { DH_SAMPLE_GEOM, dhHuntInit, dhHuntReduce, dhFrame, dhToPx, dhCatalogLog } = core();
    const g = DH_SAMPLE_GEOM.sampleA;
    let s = dhHuntInit('sampleA');
    for (let i = 0; i < 14; i++) s = dhHuntReduce(s, { type: 'reticle', du: -0.02, dv: 0 }, g).state;
    expect(s.reticle.u).toBeCloseTo(0.22, 6);
    const f = dhFrame(g, 900, 280);
    const p = dhToPx(f, s.reticle.u, s.reticle.v);
    s = dhHuntReduce(s, { type: 'probePx', x: p.x, y: p.y, W: 900, H: 280 }, g).state;
    expect(s.pending).toBe('A1');
    const r = dhHuntReduce(s, { type: 'classify', cls: 'porosity' }, g);
    const out = dhCatalogLog({}, r.events[0], '2026-10-17T00:00:00.000Z');
    expect(out.isNew).toBe(true);
    expect(out.catalog.porosity).toMatchObject({ foundCount: 1, classifiedCount: 1, sampleIds: ['sampleA'] });
  });

  describe('mounted', () => {
    let root;
    let updates;
    beforeEach(() => {
      const grad = { addColorStop() {} };
      const drawing = new Proxy({}, {
        get: (t, k) => (k in t ? t[k]
          : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => grad
          : k === 'measureText' ? () => ({ width: 20 }) : () => {}),
      });
      vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
      vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
      document.body.innerHTML = '<div id="root"></div>';
      window.__alloflowWeldLab = undefined;
      try { localStorage.clear(); } catch (e) {}
    });
    afterEach(async () => {
      if (root) await React.act(() => root.unmount());
      root = null;
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });
    async function mount(state) {
      updates = [];
      let latest;
      function App() {
        const [s, setS] = React.useState({ weldLab: state });
        latest = s;
        return window.StemLab._registry.weldLab.render(makeCtx({
          toolData: s,
          setToolData: setS,
          update: (tool, key, val) => { updates.push([key, val]); setS((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: val } })); },
        }));
      }
      root = ReactDOMClient.createRoot(document.getElementById('root'));
      await React.act(() => root.render(React.createElement(App)));
      return { state: () => latest.weldLab };
    }
    const key = async (el, k, opts) => React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts || {}))); });
    const radio = (label) => [...document.querySelectorAll('[role="radio"]')].find((b) => b.textContent.includes(label));
    const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(label));

    it('moves the reticle with arrows, inspects with Enter, classifies, logs and celebrates', async () => {
      const app = await mount({ view: 'defectHunt' });
      const surface = document.querySelector('[role="application"]');
      expect(surface).toBeTruthy();
      // The keyboard path does not reveal anything on its own.
      expect(document.body.textContent).not.toContain('Identified zone');
      for (let i = 0; i < 14; i++) await key(surface, 'ArrowLeft');
      expect(document.getElementById('dh2-readout').textContent).toContain('22% along the bead');
      await key(surface, 'Enter');
      expect(document.body.textContent).toContain('Selected spot: what is it?');
      expect(app.state().defectCatalog).toBeUndefined();
      await React.act(() => radio('Porosity').click());
      await React.act(() => button('Confirm classification').click());
      const cat = app.state().defectCatalog;
      expect(cat && cat.porosity).toMatchObject({ foundCount: 1, classifiedCount: 1, firstSampleId: 'sampleA' });
      expect(document.body.textContent).toContain('New defect type logged');
      expect(document.body.textContent).toContain('Correct: Porosity');
    });

    it('logs a misnamed defect as found but not identified', async () => {
      const app = await mount({ view: 'defectHunt' });
      const surface = document.querySelector('[role="application"]');
      for (let i = 0; i < 14; i++) await key(surface, 'ArrowLeft');
      await key(surface, ' ');
      await React.act(() => radio('Undercut').click());
      await React.act(() => button('Confirm classification').click());
      expect(app.state().defectCatalog.porosity).toMatchObject({ foundCount: 1, classifiedCount: 0, missCount: 1 });
      expect(document.body.textContent).toContain('Not quite: this is Porosity');
    });
  });
});

describe('Defect Diagnose agrees with the defect model', () => {
  const vignette = (idx, extra) => renderTool('weldLab', { weldLab: Object.assign({ view: 'defectDiagnose', dd2Idx: idx, dd2Ans: true, dd2Shown: [idx] }, extra) });

  it('needs BOTH high amps and fast travel for undercut, so both are main causes', () => {
    const { computeWeldDefects, heatInputNet } = core();
    const at = (A, TS) => computeWeldDefects(heatInputNet(28, A, TS, 'mig'), 0.25, 28, A, TS, 'mig');
    expect(at(280, 20).undercut).toBeGreaterThan(0);
    expect(at(220, 20).undercut).toBe(0); // amps down alone clears it
    expect(at(280, 14).undercut).toBe(0); // travel down alone clears it
    expect(vignette(1, { dd2Pick: 'heatHigh', dh2_ddSec: 'travelFast' })).toContain('Full credit');
    expect(vignette(1, { dd2Pick: 'travelFast', dh2_ddSec: 'heatHigh' })).toContain('Full credit');
    expect(vignette(1, { dd2Pick: 'heatHigh' })).toContain('Partial credit: 0.75 of 1');
    expect(vignette(1, { dd2Pick: 'heatLow' })).toContain('No credit');
  });

  it('accepts heat OR slow travel for burn-through, both of which raise heat per inch', () => {
    const { computeWeldDefects, heatInputNet } = core();
    const at = (A, TS) => computeWeldDefects(heatInputNet(20, A, TS, 'mig'), 0.075, 20, A, TS, 'mig');
    expect(at(150, 10).burnthrough).toBeGreaterThan(0);
    expect(at(150, 10).burnthrough).toBeGreaterThan(at(110, 10).burnthrough);
    expect(at(150, 6).burnthrough).toBeGreaterThanOrEqual(at(150, 10).burnthrough);
    expect(vignette(3, { dd2Pick: 'heatHigh', dh2_ddSec: 'travelSlow' })).toContain('Full credit');
    expect(vignette(3, { dd2Pick: 'travelSlow' })).toContain('Partial credit: 0.75 of 1');
    expect(vignette(3, { dd2Pick: 'travelFast' })).toContain('No credit');
  });

  it('no longer scores spatter as simply "heat too high"', () => {
    expect(vignette(7, { dd2Pick: 'arcBalance', dh2_ddSec: 'contamination' })).toContain('Full credit');
    expect(vignette(7, { dd2Pick: 'heatHigh' })).toContain('Partial credit: 0.5 of 1');
  });

  it('starts every "now fix it" step at settings that produce ONLY its target defect', () => {
    const { dhFixState } = core();
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const fixes = [...src.matchAll(/fix: \{ target: '(\w+)', P: '(\w+)', TH: ([\d.]+), V: ([\d.]+), A: ([\d.]+), TS: ([\d.]+) \}/g)];
    expect(fixes.length).toBe(5);
    fixes.forEach((m) => {
      const fix = { target: m[1], P: m[2], TH: +m[3] };
      const st = dhFixState(fix, +m[4], +m[5], +m[6]);
      expect(st.target, m[1] + ' present at the bad settings').toBeGreaterThan(0);
      expect(st.others, m[1] + ' alone').toEqual([]);
      expect(st.cleared).toBe(false);
    });
    // And a fix exists: undercut clears by turning the amps down.
    expect(dhFixState({ target: 'undercut', P: 'mig', TH: 0.25 }, 28, 220, 20).cleared).toBe(true);
  });

  it('stops the cause cards from naming the defects they cause', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const defs = src.slice(src.indexOf('var CAUSE_DEF = {'), src.indexOf('function causeById('));
    expect(defs.length).toBeGreaterThan(200);
    ['undercut', 'burn', 'spatter', 'porosity', 'overlap', 'lack of fusion', 'cold lap', 'distortion', 'oxidation', 'brittle']
      .forEach((w) => expect(defs.toLowerCase(), w).not.toContain(w));
  });

  it('shows a picture and section for the vignette', () => {
    const html = vignette(1, { dd2Pick: 'heatHigh' });
    expect((html.match(/<canvas/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Now fix it');
  });

  it('scores primary + optional secondary with partial credit', () => {
    const { dhDiagScore } = core();
    const two = { heatHigh: 'p', travelFast: 'p', technique: 's' };
    expect(dhDiagScore(two, 'heatHigh', 'travelFast')).toBe(1);
    expect(dhDiagScore(two, 'heatHigh', null)).toBe(0.75);
    // Both model conditions beat one condition plus a side cause.
    expect(dhDiagScore(two, 'heatHigh', 'technique')).toBe(0.9);
    expect(dhDiagScore(two, 'technique', 'heatHigh')).toBe(0.75);
    const spatter = { arcBalance: 'p', contamination: 's', heatHigh: 's' };
    expect(dhDiagScore(spatter, 'arcBalance', 'contamination')).toBe(1);
    expect(dhDiagScore(two, 'heatHigh', 'heatLow')).toBe(0.5);
    expect(dhDiagScore(two, 'heatLow', 'travelFast')).toBe(0.25);
    const one = { technique: 'p' };
    expect(dhDiagScore(one, 'technique', null)).toBe(1);
    expect(dhDiagScore(one, 'technique', 'heatHigh')).toBe(0.75);
    expect(dhDiagScore(one, 'heatHigh', 'technique')).toBe(0.25);
    expect(dhDiagScore(one, 'heatHigh', null)).toBe(0);
  });
});

describe('Saved state is untrusted input', () => {
  it('loads a v1 catalog entry and keeps its history when logging onto it', () => {
    const { dhNormCatalog, dhCatalogLog } = core();
    const v1 = { undercut: { firstFoundAt: '2026-01-02T03:04:05.000Z', lastFoundAt: '2026-02-02T03:04:05.000Z', foundCount: 3, firstSampleId: 'sampleB', sampleIds: ['sampleB', 'sampleA'] } };
    const n = dhNormCatalog(v1);
    expect(n.undercut).toMatchObject({ firstFoundAt: v1.undercut.firstFoundAt, foundCount: 3, firstSampleId: 'sampleB', sampleIds: ['sampleB', 'sampleA'], classifiedCount: 0, missCount: 0 });
    const out = dhCatalogLog(v1, { type: 'undercut', ok: true, sampleId: 'sampleC' }, '2026-10-17T00:00:00.000Z');
    expect(out.isNew).toBe(false);
    expect(out.catalog.undercut).toMatchObject({ firstFoundAt: v1.undercut.firstFoundAt, foundCount: 4, classifiedCount: 1, sampleIds: ['sampleB', 'sampleA', 'sampleC'] });
    const html = renderTool('weldLab', { weldLab: { view: 'defectCatalog', defectCatalog: v1 } });
    expect(html).toContain('Sample B — Butt weld, 3/8&quot; plate');
    expect(html).not.toContain('🔥 sampleB');
    expect(html).toContain('Found (1)');
  });

  it('drops junk catalog entries instead of crashing', () => {
    const { dhNormCatalog } = core();
    const junk = JSON.parse('{"porosity":null,"undercut":"x","overlap":[1],"coldLap":{"foundCount":"lots","sampleIds":"abc","firstFoundAt":12},"__proto__":{"polluted":1},"spatter":{"foundCount":2}}');
    const n = dhNormCatalog(junk);
    expect(Object.keys(n)).toEqual(['coldLap']);
    expect(n.coldLap).toMatchObject({ foundCount: 1, sampleIds: [], firstFoundAt: null });
    expect({}.polluted).toBeUndefined();
    ['nope', 7, [], null].forEach((x) => expect(dhNormCatalog(x)).toEqual({}));
  });

  it('survives hostile dh_sampleIdx values', () => {
    [1.5, 'abc', -3, 99, null, {}, [], '2'].forEach((bad) => {
      const html = renderTool('weldLab', { weldLab: { view: 'defectHunt', dh_sampleIdx: bad, dh2_light: 'dark', dh2_best: 'x', defectCatalog: { porosity: 'x' } } });
      expect(html, String(bad)).toContain('Defect Hunt Lab');
      expect(html, String(bad)).toContain('How an inspector reads a weld');
    });
  });

  it('survives hostile dd2* values', () => {
    const states = [
      { dd2Idx: 'x', dd2Shown: {}, dd2Score: 'abc', dd2Seed: -5 },
      { dd2Idx: 99, dd2Shown: 'abc', dd2Rounds: -2 },
      { dd2Idx: 2.5, dd2Ans: 'true', dd2Pick: '__proto__', dh2_ddSec: {} },
      { dd2Idx: 4, dd2Ans: true, dd2Pick: 'constructor', dd2Shown: [99, -1, 'x', 4, 4], dd2Score: Infinity, dh2_diag: 'junk' },
      { dd2Idx: 10, dd2Ans: true, dd2Pick: 'heatLow', dh2_ddSec: 'heatLow', dd2Streak: 'x', dd2Best: {}, dh2_diag: { 11: { best: 'x', fixed: 'yes' } } },
    ];
    states.forEach((st) => {
      const html = renderTool('weldLab', { weldLab: Object.assign({ view: 'defectDiagnose' }, st) });
      expect(html, JSON.stringify(st)).toContain('Defect Diagnose');
    });
  });

  it('survives hostile review / diagnosis collections in the catalog view', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'defectCatalog', defectCatalog: [], dh2_diag: [1, 2], dh2_review: 'x', dh2_reviewRound: 'abc' } });
    expect(html).toContain('0 / 6');
  });
});

describe('Catalog review and links', () => {
  it('rotates the review answer through all four slots', () => {
    const { dhReviewOptions, DH_DEFECT_TYPES } = core();
    const slots = [0, 0, 0, 0];
    for (let round = 0; round < 4; round++) {
      DH_DEFECT_TYPES.forEach((t, i) => {
        const o = dhReviewOptions(t, i, round);
        expect(new Set(o.list).size).toBe(4);
        expect(o.list[o.answer]).toBe(t);
        expect(o.list.filter((x) => x === t).length).toBe(1);
        slots[o.answer]++;
      });
    }
    slots.forEach((c) => expect(c).toBe(6));
  });

  it('links the catalog to Defect Diagnose and tracks the mastery ladder', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const body = src.slice(src.indexOf('function DefectCatalogView('), src.indexOf('function defectCelebOverlay('));
    expect(body).not.toContain("goto('processCompare')");
    expect(body).toContain("goto('defectDiagnose')");
    const now = '2026-10-01T12:00:00.000Z';
    const html = renderTool('weldLab', { weldLab: { view: 'defectCatalog',
      defectCatalog: { undercut: { firstFoundAt: now, lastFoundAt: now, foundCount: 2, classifiedCount: 1, sampleIds: ['sampleA'] } },
      dh2_diag: { 2: { tries: 1, best: 1 } } } });
    expect(html).toContain('Found 1 · Identified 1 · Diagnosed 1 · Reviewed 0 (of 6)');
    expect(html).toContain('Start a 1-card review');
  });
});

describe('Translation keys', () => {
  it('uses one English fallback per new key, and keys.json matches the code', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const re = /__alloT\('(stem\.weldlab\.dh2_[a-z0-9_]+)',\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\)/g;
    const seen = {};
    let m;
    while ((m = re.exec(src))) {
      const val = Function('return ' + m[2])();
      if (seen[m[1]] !== undefined) expect(seen[m[1]], m[1] + ' has two fallbacks').toBe(val);
      seen[m[1]] = val;
    }
    expect(Object.keys(seen).length).toBeGreaterThan(200);
    const kp = resolve(HERE, 'keys.json');
    if (existsSync(kp)) {
      const keys = JSON.parse(readFileSync(kp, 'utf8'));
      Object.keys(seen).forEach((k) => expect(keys[k], k).toBe(seen[k]));
    }
  });
});
