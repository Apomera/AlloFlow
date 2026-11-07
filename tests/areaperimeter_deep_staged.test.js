// Area & Perimeter Lab stage D (2026-11-04): regression tests for the defects
// an independent bug hunt found after stages A-C.
// 1. Irregular Shapes: a careful count by the taught rule was judged "more than
//    10% off" on many small grade-3 shapes, and a finished shape could be
//    re-marked for points after its exact area was shown (toggle the level).
// 2. Same Fence Lab and Circles: the "first claim" reward could be earned by
//    switching the claim after the evidence was on screen.
// 3. Circle ruler: a pointer on a letterboxed (wide) ruler landed in the wrong place.
// 4. Story problems: contexts with units that do not fit (a classroom floor 3 cm long).
// AP_FILE lets the gates run against the stage-C file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';
let root = null;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  delete window.matchMedia;
});

async function mount(initial, overrides = {}) {
  const tool = loadTool(FILE, ID);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => latest._areaPerimeter || {};
}
function button(label) {
  return [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
}
async function click(label) {
  const el = button(label);
  expect(el, label).toBeTruthy();
  await React.act(async () => { el.click(); });
}
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function slide(id, value) {
  const el = document.getElementById(id);
  expect(el, id).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
function reducedMotion() {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
function pure() { return window.AreaPerimeterPure; }
function carefulMarks(blob) {
  const marks = {};
  for (const c of blob.cells) if (c.cover >= 0.97) marks[c.key] = 'full'; else if (c.cover >= 0.03) marks[c.key] = 'half';
  return marks;
}

describe('Irregular Shapes: fair verdicts and no credit after the exact area is shown', () => {
  it('credits a careful count by the taught rule on every shape, at every level', () => {
    loadTool(FILE, ID);
    const P = pure();
    const missed = [];
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 400; seed += 1) {
      const b = P.generateBlob(level, seed);
      const res = P.assessBlob(b, carefulMarks(b), b.modelEstimate);
      expect(res.arithmetic).toBe('ok');
      if (!res.close) missed.push(b.sig + ' ' + res.pct.toFixed(1) + '%');
    }
    // Stage C judged these careful counts "more than 10% off" (about 1 in 8 grade-3 shapes).
    expect(missed).toEqual([]);
  });

  it('still refuses a sloppy count that is more than 10% off', () => {
    loadTool(FILE, ID);
    const P = pure();
    let checked = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const b = P.generateBlob(1, seed);
      const greedy = {};
      for (const c of b.cells) if (c.cover >= 0.03) greedy[c.key] = 'full';
      const own = P.blobMarkCounts(b, greedy);
      const res = P.assessBlob(b, greedy, own.estimate);
      if (Math.abs(res.pct) > 10) { checked += 1; expect(res.close, b.sig).toBe(false); }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('shows a careful count that is over 10% off as the best the grid allows, and awards it', async () => {
    loadTool(FILE, ID);
    const P = pure();
    let seed = 1;
    let blob;
    for (; seed < 2000; seed += 1) { blob = P.generateBlob(1, seed); if (Math.abs(blob.modelEstimate - blob.exact) / blob.exact > 0.1) break; }
    const marks = carefulMarks(blob);
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'irregular', blobLevel: 1, blobSeed: seed, blobMarks: { sig: blob.sig, marks } } }, { awardXP });
    await type(document.getElementById('ap-blob-estimate'), String(blob.modelEstimate));
    await click('Check my estimate');
    const fb = document.querySelector('[data-ap-blob-feedback]');
    expect(fb.getAttribute('data-ap-blob-feedback')).toBe('close');
    expect(fb.textContent).not.toContain('more than 10% off');
    expect(fb.textContent).toContain('a careful count');
    expect(state().blobSolved[blob.sig]).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
  });

  it('gives no points for re-marking a finished shape after a level switch cleared it', async () => {
    loadTool(FILE, ID);
    const P = pure();
    const seed = 31;
    const blob = P.generateBlob(1, seed);
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'irregular', blobLevel: 1, blobSeed: seed } }, { awardXP });
    // An honest but empty attempt: 0 squares, 0 square units. Sound adding, far off.
    await type(document.getElementById('ap-blob-estimate'), '0');
    await click('Check my estimate');
    expect(document.querySelector('[data-ap-blob-feedback]').getAttribute('data-ap-blob-feedback')).toBe('far');
    expect(document.body.textContent).toContain(blob.exactText); // the exact area is now known
    // Level 2 and back: any interaction there replaces the single saved check.
    await click('Level 2: on level');
    await type(document.getElementById('ap-blob-estimate'), '1');
    await click('Level 1: getting started');
    expect(button('Check my estimate').disabled).toBe(false);
    // Re-mark with the careful count: still sound, but this shape earns nothing now.
    const marks = carefulMarks(blob);
    for (const c of blob.cells) {
      const times = marks[c.key] === 'full' ? 1 : marks[c.key] === 'half' ? 2 : 0;
      for (let i = 0; i < times; i += 1) await React.act(async () => { document.querySelector('[data-ap-blob-cell="' + c.key + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    await type(document.getElementById('ap-blob-estimate'), String(blob.modelEstimate));
    await click('Check my estimate');
    expect(document.querySelector('[data-ap-blob-feedback]').getAttribute('data-ap-blob-feedback')).toBe('close');
    expect(awardXP).not.toHaveBeenCalled();
    expect((state().blobSolved || {})[blob.sig]).toBeFalsy();
  });
});

describe('claim rewards count the first claim, made before the evidence', () => {
  it('Same Fence Lab: switching to the right claim after seeing the areas earns nothing', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'fence', fenceP: 20, fenceW: 1 } }, { awardXP });
    await click('Long and thin holds the most');
    // The area of each garden is on screen as soon as a claim is made.
    expect(document.body.textContent).toContain('9 square units');
    for (const w of [1, 3, 5]) { await slide('ap-garden-width', w); await click('Record this rectangle'); }
    expect(state().fenceRecords[20]).toEqual([1, 3, 5]);
    await click('Closest to a square holds the most');
    await click('Check my claim');
    expect(document.querySelector('[data-ap-claim-result]').getAttribute('data-ap-claim-result')).toBe('supported');
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('Same Fence Lab: a right first claim is still rewarded once', async () => {
    const awardXP = vi.fn();
    await mount({ _areaPerimeter: { mode: 'fence', fenceP: 20, fenceW: 1 } }, { awardXP });
    await click('Closest to a square holds the most');
    for (const w of [1, 3, 5]) { await slide('ap-garden-width', w); await click('Record this rectangle'); }
    await click('Check my claim');
    await click('Check my claim');
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Same Fence Lab claim');
  });

  async function measureThree(P) {
    for (const [label, id, d] of [['Coin (3 cm across)', 'coin', 3], ['Jar lid (7 cm across)', 'lid', 7], ['Plate (22 cm across)', 'plate', 22]]) {
      await click(label);
      await click('Roll it one full turn');
      const ruler = P.rulerFor(id);
      const reading = P.snapReading(ruler, ruler.c);
      await type(document.getElementById('ap-circle-reading'), String(reading));
      await click('Check my reading');
      await type(document.getElementById('ap-circle-ratio'), (reading / d).toFixed(2));
      await click('Check and record');
    }
  }

  it('Circles: switching to "the same for every circle" after measuring earns nothing', async () => {
    reducedMotion();
    loadTool(FILE, ID);
    const P = pure();
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'circles' } }, { awardXP });
    await click('C ÷ d is bigger for bigger circles');
    await measureThree(P);
    expect(Object.keys(state().circleRecords).sort()).toEqual(['coin', 'lid', 'plate']);
    await click('C ÷ d is the same for every circle');
    await click('Check my claim');
    expect(document.querySelector('[data-ap-circle-claim]').getAttribute('data-ap-circle-claim')).toBe('supported');
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('Circles: a right first claim is still rewarded once', async () => {
    reducedMotion();
    loadTool(FILE, ID);
    const P = pure();
    const awardXP = vi.fn();
    await mount({ _areaPerimeter: { mode: 'circles' } }, { awardXP });
    await click('C ÷ d is the same for every circle');
    await measureThree(P);
    await click('Check my claim');
    await click('Check my claim');
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Circle ratio claim');
  });
});

describe('circle ruler: a pointer lands where it points on a wide, letterboxed ruler', () => {
  it('maps the click through the SVG\'s centred "meet" scaling', async () => {
    reducedMotion();
    loadTool(FILE, ID);
    const P = pure();
    const state = await mount({ _areaPerimeter: { mode: 'circles', circleClaim: 'same', circleObject: 'lid' } });
    await click('Roll it one full turn');
    const r = P.rulerFor('lid');
    const svg = document.querySelector('[data-ap-roll]');
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    // A 1100 px wide panel: the SVG box is 1100 x 300 (max-height), so the
    // 640-wide drawing is scaled by 300 / height and centred.
    const W = 1100, H = 300, k = Math.min(W / vb[2], H / vb[3]), offset = (W - vb[2] * k) / 2;
    svg.getBoundingClientRect = () => ({ left: 20, top: 0, width: W, height: H, right: 20 + W, bottom: H });
    const clientX = 20 + offset + (r.x0 + r.c * r.scale) * k;
    await React.act(async () => { document.querySelector('[data-ap-ruler-hit]').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX })); });
    expect(state().circleRead.lid.marker).toBeCloseTo(P.snapReading(r, r.c), 9);
  });
});

describe('Design Missions read a cost typed with its $ sign', () => {
  it('accepts "$54" for a cost, and calls "abc" unreadable rather than empty', async () => {
    loadTool(FILE, ID);
    const P = pure();
    const m = P.generateFloorMission(1, 43 + 11);
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'missions', missionKind: 'floor', missionLevel: 1 } }, { awardXP });
    expect(document.querySelector('[data-ap-mission-brief]').getAttribute('data-ap-mission-brief')).toBe(m.sig);
    await type(document.getElementById('ap-mission-area'), String(m.area));
    await type(document.getElementById('ap-mission-count'), 'abc');
    await type(document.getElementById('ap-mission-cost'), '$' + m.cost);
    await click('Check my design');
    const item = (id) => document.querySelector('[data-ap-mission-item="' + id + '"]');
    expect(item('count').getAttribute('data-ap-status')).toBe('unreadable');
    expect(item('count').textContent).not.toContain('Fill this in');
    expect(item('count').textContent).toContain('could not read');
    expect(item('cost').getAttribute('data-ap-status')).toBe('ok');
    await type(document.getElementById('ap-mission-count'), String(m.count));
    await click('Check my design');
    expect(document.querySelector('[data-ap-mission-result]').getAttribute('data-ap-mission-result')).toBe('solved');
    expect(state().missionSolved[m.sig]).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
  });
});

describe('story problems use units that fit the story', () => {
  const FIT = {
    garden: ['m', 'ft', 'yd'], rug: ['ft'], poster: ['in', 'cm'], floor: ['m', 'yd'],
    fence: ['m', 'ft', 'yd'], ribbon: ['in', 'cm'], trim: ['ft', 'in'], border: ['m', 'yd']
  };
  it('never asks about a classroom floor in centimetres or a rug in yards', () => {
    loadTool(FILE, ID);
    const P = pure();
    const bad = [];
    const seen = {};
    for (const grade of [3, 4]) for (const type of ['rect_area', 'rect_perimeter']) for (let seed = 1; seed <= 1500; seed += 1) {
      const p = P.generateProblem(grade, type, seed);
      seen[p.context + ':' + p.unit] = true;
      if (FIT[p.context].indexOf(p.unit) < 0) bad.push(p.context + ' in ' + p.unit);
    }
    expect([...new Set(bad)]).toEqual([]);
    // Every fitting unit still turns up, so the variety is kept.
    for (const ctx of Object.keys(FIT)) for (const u of FIT[ctx]) expect(seen[ctx + ':' + u], ctx + ':' + u).toBe(true);
  });
  it('keeps the numbers of every problem unchanged (only the unit word moves)', () => {
    loadTool(FILE, ID);
    const P = pure();
    // Pinned from the stage-C generator: same seed, same sides and answer.
    expect([P.generateProblem(3, 'rect_area', 7).l, P.generateProblem(3, 'rect_area', 7).w, P.generateProblem(3, 'rect_area', 7).answer]).toEqual(PIN_RECT_AREA_3_7);
    expect([P.generateProblem(4, 'rect_perimeter', 11).l, P.generateProblem(4, 'rect_perimeter', 11).w, P.generateProblem(4, 'rect_perimeter', 11).answer]).toEqual(PIN_RECT_PERIM_4_11);
  });
});
describe('every mode mounts cleanly after the stage-D fixes', () => {
  const MODES = ['explore', 'compare', 'composite', 'investigate', 'fence', 'challenge', 'units', 'circles', 'irregular', 'missions'];
  for (const look of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }]) {
    it('mounts all 10 modes with no console errors ' + JSON.stringify(look), async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warns = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        for (const mode of MODES) {
          await mount({ _areaPerimeter: { mode, fenceClaimLocks: { 20: 'long' }, circleClaimLock: 'bigger', blobRevealed: { 'b:1:31': true } } }, look);
          expect(document.body.textContent).not.toMatch(/undefined|NaN|\[object Object\]/);
          await React.act(async () => { root.unmount(); });
          root = null;
          document.body.innerHTML = '<div id="root"></div>';
        }
        expect(errors).not.toHaveBeenCalled();
        expect(warns).not.toHaveBeenCalled();
      } finally { errors.mockRestore(); warns.mockRestore(); }
    });
  }
});

const PIN_RECT_AREA_3_7 = [3, 9, 27];
const PIN_RECT_PERIM_4_11 = [26, 14, 80];
