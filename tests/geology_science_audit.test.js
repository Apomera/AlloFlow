// Geology Explorer science audit (2026-09-28). Four subject reviewers read every learner-facing string
// next to the numbers the model shows; these tests pin what they found wrong, so the fixes stay fixed.
// Each group names the old, wrong behaviour it guards against.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const sourcePath = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');
let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });
const DETAILS = ['low', 'standard', 'high'];
const cells = (gen) => { const g = P.grid(), out = []; for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) for (let z = 0; z < g.NZ; z++) out.push([x, y, z, gen(x, y, z)]); return out; };
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

describe('the crust tells one relative-dating story', () => {
  // was: the rim was chosen by DEPTH band, so "marble" sat in granite basement and "hornfels" beside
  // limestone and the magma chamber; a core could read baked shale BELOW baked limestone.
  it('the contact rim alters the layer it touches: marble beside limestone, hornfels beside shale', () => {
    for (const d of DETAILS) {
      P.setGrid(d);
      const g = P.grid();
      const layerOfRow = (y) => { const Y = Math.min(11, Math.floor(y * 12 / g.NY)); return Y === 0 ? 'soil' : Y <= 2 ? 'sandstone' : Y <= 4 ? 'shale' : Y <= 6 ? 'limestone' : Y <= 9 ? 'basement' : 'magma'; };
      let marble = 0, hornfels = 0;
      for (const [, y, , k] of cells(P.rockKeyAt)) {
        if (k === 'marble') { marble++; expect(layerOfRow(y), d + ' marble row ' + y).toBe('limestone'); }
        if (k === 'hornfels') { hornfels++; expect(layerOfRow(y), d + ' hornfels row ' + y).toBe('shale'); }
      }
      expect(marble, d).toBeGreaterThan(0);
      expect(hornfels, d).toBeGreaterThan(0);
    }
  });

  // was: the graded order put "The surface weathers" BEFORE the pluton, while the soil card says
  // "forming today"; play-history built the soil before the pluton too.
  it('the soil forming today is the youngest step, in the challenge, the history and the staging', () => {
    const items = P.sequenceChallenges().crust.items.map((i) => i.key);
    expect(items[items.length - 1]).toBe('soil');
    expect(items.indexOf('pluton')).toBeLessThan(items.indexOf('rim'));
    const fa = P.formedAt();
    expect(fa.soil).toBe(Math.max(...Object.values(fa)));
    expect(fa.intrusion).toBeGreaterThan(fa.sandstone);
    expect(fa.marble).toBeGreaterThan(fa.intrusion);
    const steps = P.historySteps();
    expect(steps[steps.length - 1].fb).toMatch(/SOIL/);
    expect(steps.map((s) => s.fb).join(' ')).not.toMatch(/through every layer/);   // the pluton stops below the sandstone
  });

  it('the rock cycle sends no granite to hornfels (heat and pressure turn granite into gneiss)', () => {
    const cycle = P.rockCycle();
    for (const k of ['basement', 'intrusion']) expect(cycle[k].map((p) => p.to), k).not.toContain('hornfels');
    expect(cycle.shale.map((p) => p.to)).toContain('hornfels');
  });

  it('no line says one magma makes both basalt and granite, or that magma is "above ~1000 °C"', () => {
    expect(source).not.toMatch(/Same magma, (opposite cooling|two fates)/);
    expect(source).not.toMatch(/above ~1000 °C/);
    expect(P.crustGeotherm(10, 'magma').tempC).toBe('≈ 700–1200');
  });
});

describe('the dating clock stays inside the age of the Earth', () => {
  // was: the parent slider went down to 5%: granite "19,319 million years", basalt "5,402" — older than Earth.
  it('the slider minimum keeps every clock at or under 4,540 million years', () => {
    expect(source).toContain('var minParent = Math.ceil(100 * Math.pow(2, -4540 / DT.hl));');
    expect(source).toContain("h('input', { type: 'range', min: minParent, max: 100, value: pPct,");
    for (const [rock, d] of Object.entries(P.datingTable())) {
      const minParent = Math.ceil(100 * Math.pow(2, -4540 / d.hl));
      const oldest = d.hl * Math.log(100 / minParent) / Math.log(2);
      expect(oldest, rock).toBeLessThanOrEqual(4540);
      expect(oldest, rock).toBeGreaterThan(4000);
    }
  });
  // was: every decayed potassium-40 atom was shown as argon-40; only about 1 in 9 is.
  it('potassium-40 shows only its argon share as argon-40', () => {
    expect(P.datingTable().basalt.share).toBeCloseTo(0.107, 3);
    expect(source).toContain("DT.daughter + ' ' + Math.round(dPct * (DT.share || 1)) + '% ◻️'");
  });
});

describe('the geode lining grows from the wall inward', () => {
  // was: chalcedony vs agate by the PARITY of the radius: at low detail every rind voxel on the basalt was agate.
  it('only chalcedony touches the host basalt, at every detail', () => {
    for (const d of DETAILS) {
      P.setGrid(d);
      const g = P.grid();
      let wall = 0;
      for (const [x, y, z, k] of cells(P.geodeKeyAt)) {
        if (k !== 'agate' && k !== 'chalcedony') continue;
        const touchesBasalt = N6.some(([a, b, c]) => { const nx = x + a, ny = y + b, nz = z + c; return nx >= 0 && ny >= 0 && nz >= 0 && nx < g.NX && ny < g.NY && nz < g.NZ && P.geodeKeyAt(nx, ny, nz) === 'hostBasalt'; });
        if (touchesBasalt) { wall++; expect(k, d + ' ' + [x, y, z]).toBe('chalcedony'); }
      }
      expect(wall, d).toBeGreaterThan(0);
    }
  });
});

describe('numbers the model shows agree with the text and with each other', () => {
  // was: molasse 20 °C at 2 km, folded strata 60 °C at 5 km, summit -8 °C, garnet schist at 400 °C.
  it('the mountain belt sits on one crustal geotherm, its summit is below freezing, and garnet schist is hot enough for garnet', () => {
    P.setScene('collision');
    for (const k of ['molasse', 'foldedStrata', 'suture', 'thrustZone', 'schist', 'gneiss']) {
      const f = P.rockFacts(k, 2), d = Number(f.depthKm), tc = Number(f.tempC);
      expect(tc, k).toBeGreaterThanOrEqual(15 + 20 * d);
      expect(tc, k).toBeLessThanOrEqual(15 + 40 * d);
    }
    expect(P.rockFacts('summitLimestone', 1).tempC).toBeLessThanOrEqual(-20);
    expect(P.rockFacts('schist', 2).tempC).toBeGreaterThanOrEqual(450);
  });
  it('the ocean over a hotspot chain is warm enough for the reef corals the scene finds there', () => {
    P.setScene('hotspot');
    expect(P.rockFacts('oceanWater', 0).tempC).toBeGreaterThanOrEqual(20);
  });
  // was: circles at 0.70 / 0.49 / 0.24 of the radius; the real 660 km, 2,891 km and 5,150 km boundaries are at 0.90 / 0.55 / 0.19.
  it('the Deep Earth 2D map draws the shells at their real proportions (the crust alone thickened)', () => {
    const r = (key) => Number(new RegExp("v\\.mark\\('circle', '" + key + "', \\{ key: '[a-z-]+', cx: 122, cy: 94, r: (\\d+)").exec(source)[1]);
    expect(r('lowerMantle') / 80).toBeCloseTo(5711 / 6371, 1);
    expect(r('outerCore') / 80).toBeCloseTo(3480 / 6371, 1);
    expect(r('innerCore') / 80).toBeCloseTo(1221 / 6371, 1);
    expect(r('upperMantle')).toBeGreaterThan(r('lowerMantle'));
  });
});

describe('statements the reviewers found false stay gone', () => {
  const dump = () => {
    const out = [];
    for (const id of P.scenes()) {
      P.setScene(id);
      for (const m of P.sceneMaterials(id)) { const f = P.rockFacts(m.key, 2), R = f.R || {}; out.push(R.name, R.formation, R.age, R.minerals, R.tells, ...(f.measurements || []).map((x) => x.value)); }
      const bank = P.quizBanks()[id];
      if (bank) bank.items.forEach((q, i) => { out.push(q.q, q.why, ...q.opts); const r = P.quizRemediation(id, i); out.push(r.misconception, r.remedy); });
      out.push(...(P.vocabulary()[id] || []).map((v) => v.definition), ...P.sequenceChallenges()[id].items.map((s) => s.detail));
    }
    for (const m of P.geoValueMaps()) out.push(...Object.values(m));
    out.push(...P.geoSpokenTexts());
    return out.filter(Boolean).join('\n');
  };
  it.each([
    ['the reversed stripe is OLDER basalt, not later', /Later basalt records the opposite/],
    ['stripes were predicted in 1963 and confirmed by 1966', /PROVEN in 1963|1963 proof/],
    ['a ridge melts about a tenth of the rising mantle', /melts? a few percent/],
    ['the plate sinks as a whole cold plate, not as "dense basalt"', /cold, dense basalt|heavy enough to sink/],
    ['continental crust resists subducting (some does go down)', /never subducts/],
    ['plume melt rises through the plate; the plume does not "burn through"', /burn through/],
    ['the lower mantle is over half of Earth\'s volume, not two-thirds', /two-thirds of Earth/],
    ['plumes are nearly fixed', /over a fixed plume|The plume stays put;|the plume below does not\./],
    ['foreland gravel was buried, shallowly', /Never buried/],
    ['a geode cavity is not a dissolved void', /dissolved void/],
    ['hornfels is not schist', /Hornfels \/ Schist|hornfels \/ schist/]
  ])('%s', (_, bad) => {
    expect(dump()).not.toMatch(bad);
  });
});
