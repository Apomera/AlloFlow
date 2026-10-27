// Bridge Lab design challenges: a fixed site and load, the learner designs, the tool's own analysis grades.
// The pinned pars are re-derived here from bridgeGoverningAnalysis, so a model change cannot leave a stale
// "three stars at $X" on screen.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 120000, hookTimeout: 120000 });

// BRIDGELAB_SOURCE lets a mutation check run against a copy instead of the shared live file.
const SOURCE_PATH = process.env.BRIDGELAB_SOURCE || 'stem_lab/stem_tool_bridgelab.js';
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(SOURCE.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.bridgeModel = { bridgeGoverningAnalysis, MATERIALS, BRIDGE_CHALLENGES, BRIDGE_CHALLENGE_MATERIALS, BRIDGE_STAR_MARGINS,
    bridgeChallengeScore, bridgeNormalizeChallengeRecords, bridgeChallengeRecord, BRIDGE_CHALLENGE_XP_PER_STAR,
    bridgeChallengeExample, bridgeChallengeMaterialOptions };
  window.StemLab.registerTool('bridgeLab', {`), sandbox);
const M = sandbox.window.bridgeModel;
const STYLES = ['warren', 'pratt', 'howe', 'ktruss'];
const HEIGHTS = Array.from({ length: 27 }, (_, i) => 2 + i * 0.5);
const SECTIONS = Array.from({ length: 59 }, (_, i) => 1000 + i * 500);

// Member forces and buckling lengths depend on geometry and bracing only, so one real analysis per geometry
// gives everything needed to size each material exactly; the winner is then re-checked with the real function.
function cheapestDesign(ch) {
  const mats = M.MATERIALS.filter(m => M.BRIDGE_CHALLENGE_MATERIALS.includes(m.id));
  let best = null;
  for (const trussStyle of STYLES) for (const height of HEIGHTS) for (let brace = 1; brace <= ch.nBays; brace++) {
    const base = { span: ch.span, nBays: ch.nBays, loadPerJoint: ch.loadPerJoint, loadMode: 'uniform', trussStyle, height, lateralBraceEvery: brace };
    const gov = M.bridgeGoverningAnalysis({ ...base, materialId: 'steel', crossSectionMm2: 5000 }, mats.find(m => m.id === 'steel'));
    const force = gov.analysis.maxForce, cases = gov.compressionCases, totalLen = gov.analysis.totalLen;
    for (const mat of mats) {
      const sfAt = area => {
        const yieldSF = mat.yieldMPa / (force * 1000 / area);
        let buck = Infinity;
        for (const c of cases) buck = Math.min(buck, (Math.PI ** 2 * mat.modulusGPa * 1000 * (area * area / 12)) / (c.lengthMm ** 2) / 1000 / c.forceKN);
        return Math.min(yieldSF, buck);
      };
      const area = SECTIONS.find(a => sfAt(a) >= ch.minSF);
      if (!area) continue;
      const volume = totalLen * area / 1e6, value = ch.objective === 'mass' ? volume * mat.densityKgM3 : volume * mat.costPerM3;
      if (!best || value < best.value - 1e-9) best = { value, design: { ...base, materialId: mat.id, crossSectionMm2: area } };
    }
  }
  return best;
}

describe('pinned pars are the best this model allows', () => {
  const results = {};
  beforeAll(() => { for (const ch of M.BRIDGE_CHALLENGES) results[ch.id] = cheapestDesign(ch); });

  it('every challenge has a feasible design and the par matches the search to the cent (or gram)', () => {
    for (const ch of M.BRIDGE_CHALLENGES) {
      const best = results[ch.id];
      expect(best, ch.id + ' has no design that meets its safety factor').toBeTruthy();
      expect(Math.abs(best.value - ch.par), ch.id + ' par ' + ch.par + ' vs search ' + best.value.toFixed(2)).toBeLessThan(0.1);
    }
  });

  it('the par design really passes with three stars in the real scoring path', () => {
    for (const ch of M.BRIDGE_CHALLENGES) {
      const score = M.bridgeChallengeScore(ch, results[ch.id].design);
      expect(score.passes, ch.id).toBe(true);
      expect(score.sf, ch.id).toBeGreaterThanOrEqual(ch.minSF);
      expect(score.stars, ch.id).toBe(3);
      expect(Math.abs(score.value - ch.par), ch.id).toBeLessThan(0.1);
    }
  });

  it('the shortcut sizing agrees with the real analysis (so the search above cannot drift from the tool)', () => {
    const ch = M.BRIDGE_CHALLENGES[1];
    for (const [style, height, brace, matId, area] of [['warren', 4, 1, 'wood', 9000], ['howe', 7.5, 2, 'steel', 12000], ['ktruss', 10, 3, 'composite', 20000], ['pratt', 2.5, 6, 'steel', 30000]]) {
      const mat = M.MATERIALS.find(m => m.id === matId);
      const design = { span: ch.span, nBays: ch.nBays, loadPerJoint: ch.loadPerJoint, loadMode: 'uniform', trussStyle: style, height, lateralBraceEvery: brace, materialId: matId, crossSectionMm2: area };
      const real = M.bridgeGoverningAnalysis(design, mat).governingSF;
      const gov = M.bridgeGoverningAnalysis({ ...design, materialId: 'steel', crossSectionMm2: 5000 }, M.MATERIALS.find(m => m.id === 'steel'));
      let buck = Infinity;
      for (const c of gov.compressionCases) buck = Math.min(buck, (Math.PI ** 2 * mat.modulusGPa * 1000 * (area * area / 12)) / (c.lengthMm ** 2) / 1000 / c.forceKN);
      expect(Math.min(mat.yieldMPa / (gov.analysis.maxForce * 1000 / area), buck)).toBeCloseTo(real, 9);
    }
  });

  it('the challenges teach different lessons (not one material or style wins everything)', () => {
    expect(new Set(Object.values(results).map(r => r.design.materialId)).size).toBeGreaterThan(1);
    expect(new Set(Object.values(results).map(r => r.design.trussStyle)).size).toBeGreaterThan(1);
  });
});

describe('scoring', () => {
  const ch = () => M.BRIDGE_CHALLENGES[0];
  const site = c => ({ span: c.span, nBays: c.nBays, loadPerJoint: c.loadPerJoint, loadMode: 'uniform' });

  it('awards stars only when every requirement is met, then by distance from par', () => {
    const c = ch();
    const strong = M.bridgeChallengeScore(c, { ...site(c), trussStyle: 'warren', height: 4, materialId: 'steel', crossSectionMm2: 30000, lateralBraceEvery: 1 });
    expect(strong.passes).toBe(true);
    expect(strong.value).toBeGreaterThan(c.par * M.BRIDGE_STAR_MARGINS.two);
    expect(strong.stars).toBe(1);
    const weak = M.bridgeChallengeScore(c, { ...site(c), trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 1000, lateralBraceEvery: 1 });
    expect(weak.safe).toBe(false);
    expect(weak.stars).toBe(0);
  });

  it('a design off the challenge site earns nothing, however good it is', () => {
    const c = ch();
    for (const change of [{ span: c.span + 5 }, { nBays: c.nBays + 1 }, { loadPerJoint: c.loadPerJoint - 10 }, { loadMode: 'vehicle' }]) {
      const s = M.bridgeChallengeScore(c, { ...site(c), trussStyle: 'warren', height: 4, materialId: 'steel', crossSectionMm2: 30000, ...change });
      expect(s.onSite, JSON.stringify(change)).toBe(false);
      expect(s.stars).toBe(0);
    }
  });

  it('materials the axial model cannot represent do not count', () => {
    const c = ch();
    for (const materialId of ['stone', 'iron', 'concrete']) {
      const s = M.bridgeChallengeScore(c, { ...site(c), trussStyle: 'warren', height: 4, materialId, crossSectionMm2: 30000 });
      expect(s.materialOk, materialId).toBe(false);
      expect(s.passes).toBe(false);
    }
  });

  it('star thresholds come from the par, and the star pinned at each edge is the stated one', () => {
    for (const c of M.BRIDGE_CHALLENGES) {
      const s = M.bridgeChallengeScore(c, { ...site(c) });
      expect(s.thresholds.two).toBeCloseTo(c.par * 1.25, 6);
      expect(s.thresholds.three).toBeCloseTo(c.par * 1.05, 6);
    }
  });

  it('XP is capped well inside the host 100-per-activity limit', () => {
    expect(M.BRIDGE_CHALLENGES.length * 3 * M.BRIDGE_CHALLENGE_XP_PER_STAR).toBeLessThanOrEqual(100);
  });
});

describe('saved records are untrusted', () => {
  it('keeps only valid records', () => {
    const good = { stars: 2, value: 1000, design: { trussStyle: 'pratt', height: 5, materialId: 'wood', crossSectionMm2: 12000, lateralBraceEvery: 1 } };
    const out = M.bridgeNormalizeChallengeRecords({
      footbridge: good,
      county_road: { ...good, stars: 9 },
      featherweight: { ...good, design: { ...good.design, materialId: 'concrete' } },
      long_span: { ...good, design: { ...good.design, lateralBraceEvery: 99 } },
      unknown: good
    });
    expect(Object.keys(out)).toEqual(['footbridge']);
    for (const raw of [null, 'x', [], 7]) expect(M.bridgeNormalizeChallengeRecords(raw)).toEqual({});
  });

  it('records only an improvement: more stars, or the same stars for less', () => {
    const c = M.BRIDGE_CHALLENGES[0];
    const mk = (stars, value) => ({ passes: true, stars, value, design: { trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 } });
    let r = M.bridgeChallengeRecord({}, c, mk(1, 2000));
    expect(r.improved).toBe(true); expect(r.newStars).toBe(1);
    r = M.bridgeChallengeRecord(r.records, c, mk(1, 2500));
    expect(r.improved).toBe(false);
    r = M.bridgeChallengeRecord({ footbridge: { stars: 1, value: 2000, design: mk(1, 0).design } }, c, mk(3, 950));
    expect(r.improved).toBe(true); expect(r.newStars).toBe(2);
    expect(M.bridgeChallengeRecord({}, c, { ...mk(3, 900), passes: false }).improved).toBe(false);
  });
});

describe('playing a challenge in the Stress Test', () => {
  const mounts = [];
  const prevAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  let awardXP, addToast;
  beforeAll(() => { resetStemLab(); loadTool(SOURCE_PATH, 'bridgeLab'); });
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; awardXP = vi.fn(); addToast = vi.fn(); });
  afterEach(() => { mounts.splice(0).forEach(v => v.unmount()); globalThis.IS_REACT_ACT_ENVIRONMENT = prevAct; });
  function mount(patch) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let state;
    function App() {
      const [data, setData] = React.useState({ bridgeLab: { tab: 'build', bridgeView: '2d', introDismissed: true, ...patch } });
      state = data.bridgeLab;
      return window.StemLab._registry.bridgeLab.render(makeCtx({ toolData: data, setToolData: setData, awardXP, addToast }));
    }
    act(() => root.render(React.createElement(App)));
    const view = { host, get state() { return state; }, unmount() { act(() => root.unmount()); host.remove(); } };
    mounts.push(view); return view;
  }
  const click = el => act(() => { el.click(); });
  const button = (v, name) => [...v.host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent).trim() === name);

  it('lists the challenges, then sets up the site when one starts', () => {
    const v = mount({ span: 55, nBays: 7, loadPerJoint: 120, materialId: 'concrete' });
    expect(v.host.querySelectorAll('[data-bridge-challenge]').length).toBe(M.BRIDGE_CHALLENGES.length);
    click(button(v, 'Start: Village footbridge'));
    expect(v.state.challengeId).toBe('footbridge');
    expect([v.state.span, v.state.nBays, v.state.loadPerJoint, v.state.loadMode]).toEqual([20, 4, 20, 'uniform']);
    expect(v.state.materialId).toBe('steel'); // concrete is outside the challenge's materials
    expect(v.host.querySelector('[data-bridge-challenge-active="footbridge"]')).toBeTruthy();
  });

  it('records a passing design once, with XP per newly earned star, and says why a non-passing one is not saved', () => {
    const c = M.BRIDGE_CHALLENGES[0];
    const v = mount({ challengeId: 'footbridge', span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform', trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 1000 });
    click(button(v, 'Record this design'));
    expect(v.host.querySelector('[data-challenge-note]').textContent).toContain('every requirement must be met');
    expect(awardXP).not.toHaveBeenCalled();
    // The par design from the search: three stars.
    act(() => { v.host.querySelector('[data-bridge-challenge-active]'); });
    const best = (() => { const s = M.bridgeChallengeScore(c, { span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform', trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 }); return s; })();
    expect(best.stars).toBe(3);
    const v2 = mount({ challengeId: 'footbridge', span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform', trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 });
    expect(v2.host.querySelector('[data-challenge-stars-now]').getAttribute('data-challenge-stars-now')).toBe('3');
    click(button(v2, 'Record this design'));
    expect(v2.state.challengeRecords.footbridge.stars).toBe(3);
    expect(awardXP).toHaveBeenCalledWith('bridgeLabChallenges', 15, 'Bridge design challenge');
    click(button(v2, 'Record this design'));
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(v2.host.querySelector('[data-challenge-note]').getAttribute('role')).toBe('status');
  });

  it('states every requirement in words, not colour alone, and offers to restore a changed site', () => {
    const v = mount({ challengeId: 'county_road', span: 45, nBays: 6, loadPerJoint: 80, loadMode: 'uniform', materialId: 'steel' });
    const checks = [...v.host.querySelectorAll('[data-challenge-check]')];
    expect(checks.length).toBe(3);
    expect(checks[0].getAttribute('data-challenge-check')).toBe('unmet');
    expect(checks[0].textContent).toContain('Not yet');
    click(button(v, 'Restore the challenge site'));
    expect(v.state.span).toBe(40);
    expect(v.host.querySelectorAll('[data-challenge-check]')[0].textContent).toContain('Met');
  });

  it('gives hints one at a time and can leave the challenge', () => {
    const v = mount({ challengeId: 'long_span', span: 70, nBays: 8, loadPerJoint: 60, loadMode: 'uniform' });
    click(button(v, 'Show a hint'));
    expect(v.host.querySelectorAll('[data-challenge-hints] li').length).toBe(1);
    click(button(v, 'Another hint'));
    click(button(v, 'Another hint'));
    expect(v.host.querySelectorAll('[data-challenge-hints] li').length).toBe(3);
    expect(button(v, 'Another hint')).toBeUndefined();
    click(button(v, 'Leave challenge'));
    expect(v.state.challengeId).toBe(null);
    expect(v.host.querySelector('[data-bridge-challenges]')).toBeTruthy();
  });

  it('a forged saved record cannot crash the card or show junk', () => {
    const v = mount({ challengeRecords: { footbridge: { stars: 'lots', value: -1 }, county_road: 'x' }, challengeId: 'nonsense' });
    expect(v.host.querySelector('[data-bridge-challenges]')).toBeTruthy();
    expect(v.host.querySelector('[data-bridge-challenge="footbridge"]').textContent).toContain('Not attempted yet');
  });
});

describe('worked example', () => {
  it('each pinned par design scores its par with three stars', () => {
    for (const ch of M.BRIDGE_CHALLENGES) {
      const ex = M.bridgeChallengeExample(ch);
      expect(ex.score.passes, ch.id).toBe(true);
      expect(ex.score.stars, ch.id).toBe(3);
      expect(Math.abs(ex.score.value - ch.par), ch.id).toBeLessThan(0.1);
    }
  });

  it('names the check that really governs, from the same analysis', () => {
    for (const ch of M.BRIDGE_CHALLENGES) {
      const ex = M.bridgeChallengeExample(ch);
      expect(ex.governs, ch.id).toBe(ex.bucklingSF < ex.yieldSF ? 'buckling' : 'yield');
      expect(Math.min(ex.yieldSF, ex.bucklingSF)).toBeCloseTo(ex.score.sf, 9);
    }
  });

  it('the material comparison sizes each material to its smallest safe step, and none beats par', () => {
    for (const ch of M.BRIDGE_CHALLENGES) {
      const ex = M.bridgeChallengeExample(ch);
      const options = M.bridgeChallengeMaterialOptions(ch, ex.design);
      expect(options.map(o => o.materialId)).toEqual(M.BRIDGE_CHALLENGE_MATERIALS);
      const own = options.find(o => o.materialId === ex.design.materialId);
      expect(Math.abs(own.value - ch.par), ch.id).toBeLessThan(0.1);
      for (const o of options) {
        if (o.value === null) continue;
        expect(o.value, ch.id + ' ' + o.materialId).toBeGreaterThanOrEqual(ch.par - 0.1);
        // smallest step: one step smaller fails
        if (o.crossSectionMm2 > 1000) expect(M.bridgeChallengeScore(ch, { ...ex.design, materialId: o.materialId, crossSectionMm2: o.crossSectionMm2 - 500 }).passes).toBe(false);
      }
    }
  });

  it('a record saved after the example is flagged, and the flag survives normalisation', () => {
    const c = M.BRIDGE_CHALLENGES[0];
    const score = M.bridgeChallengeScore(c, M.bridgeChallengeExample(c).design);
    const r = M.bridgeChallengeRecord({}, c, score, true);
    expect(r.records.footbridge.afterExample).toBe(true);
    expect(M.bridgeNormalizeChallengeRecords(r.records).footbridge.afterExample).toBe(true);
    expect(M.bridgeNormalizeChallengeRecords({ footbridge: { ...r.records.footbridge, afterExample: 'yes' } }).footbridge.afterExample).toBe(false);
  });
});

describe('worked example and print on the client', () => {
  const mounts = [];
  const prevAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  let awardXP, addToast;
  beforeAll(() => { resetStemLab(); loadTool(SOURCE_PATH, 'bridgeLab'); });
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; awardXP = vi.fn(); addToast = vi.fn(); });
  afterEach(() => { mounts.splice(0).forEach(v => v.unmount()); globalThis.IS_REACT_ACT_ENVIRONMENT = prevAct; });
  function mount(patch) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let state;
    function App() {
      const [data, setData] = React.useState({ bridgeLab: { tab: 'build', bridgeView: '2d', introDismissed: true, ...patch } });
      state = data.bridgeLab;
      return window.StemLab._registry.bridgeLab.render(makeCtx({ toolData: data, setToolData: setData, awardXP, addToast }));
    }
    act(() => root.render(React.createElement(App)));
    const view = { host, get state() { return state; }, unmount() { act(() => root.unmount()); host.remove(); } };
    mounts.push(view); return view;
  }
  const click = el => act(() => { el.click(); });
  const button = (v, name) => [...v.host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent).trim() === name);
  const site = { span: 20, nBays: 4, loadPerJoint: 20, loadMode: 'uniform' };

  it('stays locked until a star or all three hints, then opens with a material table', () => {
    const v = mount({ challengeId: 'footbridge', ...site, materialId: 'wood', crossSectionMm2: 1000 });
    expect(v.host.querySelector('[data-challenge-example]').getAttribute('data-challenge-example')).toBe('locked');
    click(button(v, 'Show a hint')); click(button(v, 'Another hint')); click(button(v, 'Another hint'));
    expect(v.host.querySelector('[data-challenge-example]').getAttribute('data-challenge-example')).toBe('available');
    click(button(v, 'Show the best design this model allows'));
    const panel = v.host.querySelector('[data-challenge-example="open"]');
    expect(panel.getAttribute('aria-labelledby')).toBe('bridge-challenge-example-title');
    expect(panel.querySelectorAll('[data-challenge-option]').length).toBe(3);
    expect(panel.querySelector('th[scope="row"]')).toBeTruthy();
    expect(['yield', 'buckling']).toContain(panel.querySelector('[data-challenge-example-governs]').getAttribute('data-challenge-example-governs'));
    expect(v.state.challengeRevealed).toEqual({ footbridge: true });
  });

  it('a design recorded after the example is saved but earns no XP', () => {
    const v = mount({ challengeId: 'footbridge', challengeRevealed: { footbridge: true }, challengeHint: 3, ...site, trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 16000, lateralBraceEvery: 1 });
    click(button(v, 'Record this design'));
    expect(v.state.challengeRecords.footbridge.stars).toBe(3);
    expect(v.state.challengeRecords.footbridge.afterExample).toBe(true);
    expect(awardXP).not.toHaveBeenCalled();
    expect(v.host.querySelector('[data-challenge-note]').textContent).toContain('earns no XP');
  });

  it('the print portfolio lists challenge results against par, and says which came after the example', () => {
    const records = {
      footbridge: { stars: 2, value: 1100, design: { trussStyle: 'warren', height: 4, materialId: 'wood', crossSectionMm2: 18000, lateralBraceEvery: 1 } },
      long_span: { stars: 3, value: 290000, afterExample: true, design: { trussStyle: 'howe', height: 7, materialId: 'steel', crossSectionMm2: 23500, lateralBraceEvery: 1 } }
    };
    const v = mount({ tab: 'print', challengeRecords: records });
    const section = v.host.querySelector('[data-bridge-print-challenges]');
    expect(section).toBeTruthy();
    expect(section.querySelectorAll('[data-bridge-print-challenge]').length).toBe(2);
    expect(section.querySelector('[data-bridge-print-challenge="footbridge"]').textContent).toContain('2 of 3 stars');
    expect(section.querySelector('[data-bridge-print-challenge="footbridge"]').textContent).toContain('par of $931');
    expect(section.querySelector('[data-bridge-print-challenge="long_span"]').textContent).toContain('after viewing the worked example');
    expect(section.querySelector('button,input')).toBeNull();
    const none = mount({ tab: 'print' });
    expect(none.host.querySelector('[data-bridge-print-challenges]')).toBeNull();
  });
});

describe('registration', () => {
  it('every challenge string is registered with the English the code falls back to', () => {
    const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.bridgelab;
    const re = /__alloT\('stem\.bridgelab\.(challenges?_[A-Za-z0-9_]+)', '((?:[^'\\]|\\.)*)'\)/g;
    let n = 0;
    for (const m of SOURCE.matchAll(re)) { n++; expect(ui[m[1]], m[1]).toBe(m[2].replace(/\\'/g, "'")); }
    expect(n).toBeGreaterThan(40);
  });
  it('both live copies are identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8')).toBe(SOURCE);
  });
});
