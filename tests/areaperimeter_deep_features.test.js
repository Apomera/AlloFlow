// Area & Perimeter Lab deep pass (2026-11-03): named mistakes with a second
// try, predict-then-check, generated grade-banded practice, the fixed-fence
// explorer with corner and middle notches, fading worked examples, teacher
// controls, whole-sentence i18n and single announcements.
// AP_FILE lets the gate checks run against the original file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

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
async function answerWith(value) {
  await type(document.getElementById('ap-answer'), String(value));
  await click('Check answer');
}
function pure() { return window.AreaPerimeterPure; }

// Independent recomputation of every generated answer.
function expectedAnswer(p) {
  const v = (q) => q.n / q.d;
  switch (p.type) {
    case 'tile_area': return p.w * p.h;
    case 'rect_area': return p.l * p.w;
    case 'rect_perimeter': return 2 * p.l + 2 * p.w;
    case 'same_perimeter': return Math.abs(p.a * p.b - p.c * p.d);
    case 'missing_side_perimeter': return (p.P - 2 * p.l) / 2;
    case 'missing_side_area': return p.A / p.w;
    case 'square_side': return p.P / 4;
    case 'l_shape_area': return p.W * p.H - p.cw * p.ch;
    case 'frac_area': case 'mixed_area': return v(p.lq) * v(p.wq);
    case 'frac_perimeter': return 2 * (v(p.lq) + v(p.wq));
    case 'triangle_area': return 0.5 * p.b * p.h;
    case 'parallelogram_area': return p.b * p.h;
    case 'trapezoid_area': return 0.5 * (p.b1 + p.b2) * p.h;
    default: throw new Error('unknown type ' + p.type);
  }
}

describe('generated grade-banded practice', () => {
  it('generates valid, reproducible problems for every grade band and topic', () => {
    loadTool(FILE, ID);
    const P = pure();
    expect(typeof P.generateProblem).toBe('function');
    for (const grade of [3, 4, 5, 6]) {
      for (const type of P.gradeTopics[grade]) {
        const sigs = new Set();
        for (let seed = 1; seed <= 150; seed += 1) {
          const p = P.generateProblem(grade, type, seed * 7919);
          expect(p.type).toBe(type);
          expect(Number.isFinite(p.answer) && p.answer > 0, p.sig).toBe(true);
          expect(Math.abs(p.answer - expectedAnswer(p)) < 1e-9, p.sig).toBe(true);
          for (const trap of p.traps) expect(P.valuesMatch(trap.value, p.answer), p.sig + ' ' + trap.id).toBe(false);
          expect(P.normalizeChallengeProgress({ [p.sig]: true })[p.sig], p.sig).toBe(true);
          expect(P.generateProblem(grade, type, seed * 7919).sig).toBe(p.sig);
          if (p.type === 'parallelogram_area' || (p.type === 'triangle_area' && !p.right)) {
            expect(p.s * p.s).toBe(p.h * p.h + p.off * p.off);
            expect(p.off).toBeLessThan(p.b);
          }
          if (p.type === 'l_shape_area') { expect(p.cw).toBeLessThan(p.W); expect(p.ch).toBeLessThan(p.H); }
          sigs.add(p.sig);
        }
        expect(sigs.size, grade + ' ' + type).toBeGreaterThan(8); // practice never runs out
      }
    }
    // Mixed picks a topic from the band, and regenerating by that topic matches.
    const mixed = P.generateProblem(6, 'mixed', 4242);
    expect(P.gradeTopics[6]).toContain(mixed.type);
    expect(P.generateProblem(6, mixed.type, 4242).sig).toBe(mixed.sig);
    // 5.NF.4b uses fractions, 6.G.1 uses triangles/parallelograms/trapezoids.
    expect(P.gradeTopics[5]).toEqual(expect.arrayContaining(['frac_area', 'mixed_area']));
    expect(P.gradeTopics[6]).toEqual(expect.arrayContaining(['triangle_area', 'parallelogram_area', 'trapezoid_area']));
    expect(P.gradeTopics[3]).toEqual(expect.arrayContaining(['tile_area', 'same_perimeter']));
  });

  it('names the core mistakes instead of a generic "not yet"', () => {
    loadTool(FILE, ID);
    const P = pure();
    const rect = P.generateProblem(4, 'rect_area', 11);
    expect(P.diagnoseAnswer(rect, 2 * (rect.l + rect.w))).toBe('gave_perimeter');
    expect(P.diagnoseAnswer(rect, rect.l + rect.w)).toBe('two_sides');
    expect(P.diagnoseAnswer(rect, rect.l * rect.w)).toBe('correct');
    const L = P.generateProblem(4, 'l_shape_area', 3);
    expect(P.diagnoseAnswer(L, L.W * L.H + L.cw * L.ch)).toBe('added_cutout');
    expect(P.diagnoseAnswer(L, L.W * L.H)).toBe('forgot_cutout');
    let side;
    for (let s = 1; s < 50; s += 1) { side = P.generateProblem(4, 'missing_side_area', s); if (side.w !== 2) break; }
    expect(P.diagnoseAnswer(side, side.A / 2)).toBe('halved_area');
    const per = P.generateProblem(4, 'rect_perimeter', 9);
    expect(P.diagnoseAnswer(per, per.l * per.w)).toBe('gave_area');
    expect(P.diagnoseAnswer(per, per.l + per.w)).toBe('half_perimeter');
    const tri = P.generateProblem(6, 'triangle_area', 5);
    expect(P.diagnoseAnswer(tri, tri.b * tri.h)).toBe('triangle_no_half');
    const par = P.generateProblem(6, 'parallelogram_area', 5);
    expect(P.diagnoseAnswer(par, par.b * par.s)).toBe('used_slant');
    const trap = P.generateProblem(6, 'trapezoid_area', 5);
    expect(P.diagnoseAnswer(trap, (trap.b1 + trap.b2) * trap.h)).toBe('trapezoid_no_half');
    const same = P.generateProblem(3, 'same_perimeter', 5);
    expect(P.diagnoseAnswer(same, 0)).toBe('same_perimeter_same_area');
    expect(P.parseAnswer('3/4')).toBe(0.75);
    expect(P.parseAnswer('2 1/2')).toBe(2.5);
    expect(P.parseAnswer('1,5')).toBe(1.5);
    expect(Number.isNaN(P.parseAnswer('3/0'))).toBe(true);
  });

  it('never gives a worked example with the same answer, and keys problems by their numbers only', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const grade of [3, 4, 5, 6]) for (const type of P.gradeTopics[grade]) for (let seed = 1; seed <= 120; seed += 1) {
      const p = P.generateProblem(grade, type, seed);
      const ex = P.exampleFor(p);
      expect(ex.type).toBe(p.type);
      expect(P.valuesMatch(ex.answer, p.answer), p.sig + ' vs ' + ex.sig).toBe(false);
      expect(p.sig, p.sig).toMatch(/^g:[a-z_]+:[\d_-]+$/); // no unit or story in the identity
    }
  });

  it('shows the level controls of the problem on screen, not of the host grade', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'challenge', genGrade: 6, genType: 'trapezoid_area', genSeed: 8 } }, { gradeLevel: '5th Grade' });
    expect(document.body.textContent).toContain('(6.G.1)');
    expect(document.body.textContent).not.toContain('(5.NF.4b)');
    const pressed = [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.textContent);
    expect(pressed).toContain('Grade 6');
    expect([...document.querySelectorAll('#ap-topic option')].map((o) => o.value)).toContain('trapezoid_area');
  });

  it('uses the host grade and the teacher range to choose the band', () => {
    loadTool(FILE, ID);
    let html = renderTool(ID, { _areaPerimeter: { mode: 'challenge' } }, { gradeLevel: '3rd Grade' });
    document.body.innerHTML = html;
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('3');
    html = renderTool(ID, { _areaPerimeter: { mode: 'challenge', teacherRange: { min: 6, max: 6 } } }, { gradeLevel: '3rd Grade' });
    document.body.innerHTML = html;
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('6');
    const gradeButtons = [...document.querySelectorAll('[role="group"] button')].map((b) => b.textContent).filter((s) => /^Grade \d$/.test(s));
    expect(gradeButtons).toEqual(['Grade 6']);
    html = renderTool(ID, { _areaPerimeter: { mode: 'challenge' } }, { gradeLevel: '', gradeBand: 'g68' });
    document.body.innerHTML = html;
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('6');
  });
});

describe('challenge flow: second try, reveal without credit', () => {
  function rectState(extra) {
    return Object.assign({ mode: 'challenge', genGrade: 4, genType: 'rect_area', genSeed: 11 }, extra || {});
  }

  it('names "perimeter instead of area", gives a second try, and keeps the answer hidden', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: rectState() }, { awardXP });
    const p = pure().generateProblem(4, 'rect_area', 11);
    await answerWith(2 * (p.l + p.w));
    const fb = document.querySelector('[data-ap-feedback]');
    expect(fb.getAttribute('data-ap-mistake')).toBe('gave_perimeter');
    expect(fb.textContent).toContain('That number is the perimeter');
    expect(fb.textContent).toContain('second try');
    expect(document.querySelector('[data-ap-solution]')).toBeNull();
    expect(button('Show the worked solution')).toBeUndefined();
    expect(document.getElementById('ap-answer').disabled).toBe(false);
    expect(state().mistakeCounts).toEqual({ gave_perimeter: 1 });
    await answerWith(p.l + p.w);
    expect(document.querySelector('[data-ap-feedback]').getAttribute('data-ap-mistake')).toBe('two_sides');
    expect(button('Show the worked solution')).toBeTruthy();
    // The answer is not on screen before the reveal.
    expect(document.querySelector('[data-ap-solution]')).toBeNull();
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('credits a correct answer once, even under rapid double activation', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: rectState() }, { awardXP });
    const p = pure().generateProblem(4, 'rect_area', 11);
    await type(document.getElementById('ap-answer'), String(p.answer));
    const check = button('Check answer');
    await React.act(async () => { check.click(); check.click(); });
    expect(state().solvedChallenges[p.sig]).toBe(true);
    expect(state().score).toEqual({ correct: 1, attempts: 1 });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Area & Perimeter challenge');
    expect(document.querySelector('[data-ap-solution]')).toBeTruthy();
    expect(button('Solved').disabled).toBe(true);
    const tool = window.StemLab._registry[ID];
    expect(tool.questHooks.find((q) => q.id === 'challenge_five').progress({ _areaPerimeter: state() })).toBe('1/5 solved');
  });

  it('gives no credit for copying a revealed answer, even when the problem returns', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: rectState() }, { awardXP });
    const p = pure().generateProblem(4, 'rect_area', 11);
    await answerWith(1);
    await answerWith(2);
    await click('Show the worked solution');
    expect(state().revealed).toBe(true);
    expect(state().revealedSigs[p.sig]).toBe(true);
    expect(document.querySelector('[data-ap-solution]').textContent).toContain(String(p.answer));
    expect(document.getElementById('ap-answer').disabled).toBe(true);
    await click('New problem');
    expect(state().itemSig).not.toBe(p.sig);
    await click('Practise missed problems (1)');
    expect(state().itemSig).toBe(p.sig);
    await answerWith(p.answer);
    expect(document.querySelector('[data-ap-feedback]').textContent).toContain('earns no new points');
    expect(state().solvedChallenges || {}).not.toHaveProperty(p.sig);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('offers the host AI hint only after two tries and only when hints are on', async () => {
    const getHint = vi.fn((tool, question, wrong, correct, attempts, display) => display('AI says: check the units.'));
    const speak = vi.fn();
    await mount({ _areaPerimeter: rectState() }, { getHint, aiHintsEnabled: true, announceToSR: speak });
    await answerWith(1);
    expect(button('Ask for an AI hint')).toBeUndefined();
    await answerWith(2);
    await click('Ask for an AI hint');
    const p = pure().generateProblem(4, 'rect_area', 11);
    expect(getHint).toHaveBeenCalledWith('areaPerimeter', expect.stringContaining(String(p.l)), '2', p.answerText, 2, expect.any(Function));
    expect(document.body.textContent).toContain('AI says: check the units.');
    // Revealing is announced once, by the feedback status region, not also by announceToSR.
    speak.mockClear();
    await click('Show the worked solution');
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('[role="status"] [data-ap-feedback="revealed"]')).toBeTruthy();
    await React.act(async () => { root.unmount(); });
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ _areaPerimeter: rectState({ itemSig: p.sig, attempts: 2 }) }, { getHint, aiHintsEnabled: false });
    expect(button('Ask for an AI hint')).toBeUndefined();
  });

  it('hides the reveal when the teacher turns reveals off', async () => {
    await mount({ _areaPerimeter: rectState({ teacherNoReveal: true }) });
    await answerWith(1);
    await answerWith(2);
    expect(button('Show the worked solution')).toBeUndefined();
    expect(document.querySelector('[data-ap-feedback]').textContent).toContain('Try again or use a hint');
  });

  it('climbs a hint ladder without stating the answer', async () => {
    const state = await mount({ _areaPerimeter: rectState() });
    const p = pure().generateProblem(4, 'rect_area', 11);
    for (let i = 0; i < 3; i += 1) await click('Show hint');
    expect(state().hintStep).toBe(3);
    const hints = document.getElementById('ap-challenge-hint').textContent;
    expect(hints).not.toContain(String(p.answer));
    expect(button('No more hints').disabled).toBe(true);
  });

  it('accepts equivalent fraction answers for 5.NF.4b', async () => {
    const p = pure().generateProblem(5, 'frac_area', 77);
    const state = await mount({ _areaPerimeter: { mode: 'challenge', genGrade: 5, genType: 'frac_area', genSeed: 77 } });
    const unsimplified = `${p.answerQ.n * 2}/${p.answerQ.d * 2}`;
    await answerWith(unsimplified);
    expect(state().solvedChallenges[p.sig]).toBe(true);
  });

  it('shows the 6.G.1 rearranging idea with a text alternative', async () => {
    await mount({ _areaPerimeter: { mode: 'challenge', genGrade: 6, genType: 'parallelogram_area', genSeed: 21 } });
    expect(document.querySelector('[data-ap-ghost]')).toBeNull();
    await click('Show how to rearrange it');
    expect(document.querySelectorAll('[data-ap-ghost]').length).toBe(1);
    expect(document.getElementById('ap-challenge-desc').textContent).toContain('slid to the right end, making a rectangle');
  });
});

describe('fading worked examples', () => {
  it('fades the last steps as the learner solves more of a type, then hides the example', async () => {
    const P = pure();
    loadTool(FILE, ID);
    const sigsOf = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [P.generateProblem(4, 'l_shape_area', 900 + i).sig, true]));
    const base = { mode: 'challenge', genGrade: 4, genType: 'l_shape_area', genSeed: 5 };
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: base });
    expect(document.querySelector('[data-ap-example]').getAttribute('data-ap-example')).toBe('0');
    expect(document.querySelectorAll('[data-ap-faded-step]').length).toBe(0);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { ...base, solvedChallenges: sigsOf(1) } });
    expect(document.querySelectorAll('[data-ap-faded-step]').length).toBe(1);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { ...base, solvedChallenges: sigsOf(2) } });
    expect(document.querySelectorAll('[data-ap-faded-step]').length).toBe(2);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { ...base, solvedChallenges: sigsOf(3) } });
    expect(document.querySelector('[data-ap-example]')).toBeNull();
    expect(document.body.textContent).toContain('Show a worked example');
  });

  it('lets the learner complete a faded step', async () => {
    const P = pure();
    const solved = { [P.generateProblem(4, 'l_shape_area', 900).sig]: true };
    await mount({ _areaPerimeter: { mode: 'challenge', genGrade: 4, genType: 'l_shape_area', genSeed: 5, solvedChallenges: solved } });
    const faded = document.querySelector('[data-ap-faded-step]');
    const index = Number(faded.getAttribute('data-ap-faded-step'));
    const example = P.generateProblem(4, 'l_shape_area', ((5 * 7) + 7919) >>> 0);
    await type(faded.querySelector('input'), '1');
    await click(`Check step ${index + 1}`);
    expect(document.body.textContent).toContain('Not quite');
    await type(document.querySelector('[data-ap-faded-step] input'), String(example.answer));
    await click(`Check step ${index + 1}`);
    expect(document.querySelectorAll('[data-ap-faded-step]').length).toBe(0);
  });
});

describe('predict-then-check in the tile explorer', () => {
  it('requires both predictions, compares them, names a swap, and asks for a reflection', async () => {
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 5, height: 3 } }, { announceToSR: speak });
    await click('Predict first');
    const areaInput = document.getElementById('ap-predict-area');
    const perimeterInput = document.getElementById('ap-predict-perimeter');
    expect(areaInput).toBeTruthy();
    expect(perimeterInput).toBeTruthy();
    expect(button('Check my prediction').disabled).toBe(true);
    expect(button('Reveal all')).toBeUndefined();
    // A tile announcement must not leak the total (the area) while predicting.
    speak.mockClear();
    await React.act(async () => { document.querySelector('[data-ap-tile="0-0"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(speak.mock.calls.at(-1)[0]).not.toContain('of 15');
    await type(areaInput, '16');
    await type(perimeterInput, '15');
    expect(button('Check my prediction').disabled).toBe(false);
    await click('Check my prediction');
    expect(state().measurementsShown).toBe(true);
    const result = document.querySelector('[data-ap-prediction-result]');
    expect(result.textContent).toContain('swapped');
    expect(result.textContent).toContain('Off by 1');
    await click('I mixed up area and perimeter');
    expect(state().predictReflection).toBe('mixed');
    expect(document.body.textContent).toContain('inside (area) or around the edge (perimeter)');
  });
});

describe('Same Fence Lab (3.MD.8, fixed perimeter) and notches', () => {
  it('computes corner cuts and middle notches correctly', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (let w = 3; w <= 12; w += 1) for (let h = 2; h <= 9; h += 1) for (let cw = 1; cw <= w - 2; cw += 1) for (let cd = 1; cd < h; cd += 1) {
      const corner = P.notchMetrics(w, h, cw, cd, 'corner');
      const middle = P.notchMetrics(w, h, cw, cd, 'middle');
      expect(corner.perimeter).toBe(2 * (w + h));
      expect(corner.edges.reduce((a, b) => a + b, 0)).toBe(corner.perimeter);
      expect(middle.perimeter).toBe(2 * (w + h) + 2 * cd);
      expect(middle.edges.reduce((a, b) => a + b, 0)).toBe(middle.perimeter);
      expect(corner.area).toBe(w * h - cw * cd);
      expect(middle.area).toBe(w * h - cw * cd);
    }
    expect(P.notchMetrics(2, 5, 1, 1, 'middle').valid).toBe(false);
    expect(P.fixedPerimeterRectangles(20).map((r) => r.area)).toEqual([9, 16, 21, 24, 25, 24, 21, 16, 9]);
  });

  it('asks for a claim before showing area, then checks it against recorded evidence', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'fence', fenceP: 20, fenceW: 1 } }, { awardXP });
    expect(document.body.textContent).toContain('Make a claim first');
    expect(button('Record this rectangle').disabled).toBe(true);
    await click('They all hold the same area');
    expect(document.body.textContent).toContain('9 square units');
    await click('Record this rectangle');
    const slider = document.getElementById('ap-garden-width');
    for (const w of [3, 5]) {
      await React.act(async () => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(slider, String(w)); slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await click('Record this rectangle');
    }
    expect(state().fenceRecords[20]).toEqual([1, 3, 5]);
    await click('Check my claim');
    expect(document.querySelector('[data-ap-claim-result]').getAttribute('data-ap-claim-result')).toBe('misconception');
    expect(document.body.textContent).toContain('The same perimeter does not mean the same area');
    expect(awardXP).not.toHaveBeenCalled();
    await click('Closest to a square holds the most');
    await click('Check my claim');
    expect(document.querySelector('[data-ap-claim-result]').getAttribute('data-ap-claim-result')).toBe('supported');
    expect(document.body.textContent).toContain('5 by 5');
    expect(awardXP).not.toHaveBeenCalled(); // first checked claim was wrong: no reward for switching
  });

  it('rewards a correct first claim once and announces the result once', async () => {
    const awardXP = vi.fn();
    const speak = vi.fn();
    await mount({ _areaPerimeter: { mode: 'fence', fenceP: 12, fenceW: 1, fenceClaims: { 12: 'square' }, fenceRecords: { 12: [1, 2, 3] } } }, { awardXP, announceToSR: speak });
    await click('Check my claim');
    expect(speak).not.toHaveBeenCalled();
    expect(document.querySelector('[role="status"] [data-ap-claim-result="supported"]')).toBeTruthy();
    await click('Check my claim');
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Same Fence Lab claim');
  });

  it('withholds the notch result until the learner predicts, then shows the growth', async () => {
    await mount({ _areaPerimeter: { mode: 'fence', fenceP: 20, fenceW: 6, fenceCut: 'middle', fenceCutW: 2, fenceCutD: 2 } });
    expect(document.querySelector('[data-ap-notch-result]')).toBeNull();
    expect(document.querySelector('[data-ap-new-edge]')).toBeNull();
    await click('The perimeter goes down');
    const result = document.querySelector('[data-ap-notch-result="middle"]');
    expect(result.textContent).toContain('Perimeter: 24 units, which is 4 more than before');
    expect(result.textContent).toContain('Taking away area does not have to shorten the boundary');
    expect(document.querySelectorAll('[data-ap-new-edge]').length).toBe(2);
    await click('Cut a corner');
    await click('The perimeter stays the same');
    expect(document.querySelector('[data-ap-notch-result="corner"]').textContent).toContain('the same as before');
  });
});

describe('teacher controls', () => {
  it('shows controls and the missed-items summary only in teacher mode', () => {
    loadTool(FILE, ID);
    const data = { _areaPerimeter: { mode: 'challenge', mistakeCounts: { gave_perimeter: 3, added_cutout: 1 }, missedByType: { rect_area: 2 } } };
    document.body.innerHTML = renderTool(ID, data);
    expect(document.querySelector('[data-ap-teacher]')).toBeNull();
    document.body.innerHTML = renderTool(ID, data, { isTeacherMode: true });
    const panel = document.querySelector('[data-ap-teacher]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Gave the perimeter for an area');
    expect(panel.textContent).toContain('Added the cut-out instead of subtracting');
    expect(panel.querySelector('#ap-teacher-min')).toBeTruthy();
    expect(panel.querySelector('#ap-teacher-lock')).toBeTruthy();
  });

  it('locks students into one activity', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'explore', teacherLockMode: 'fence' } });
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe('ap-tab-fence');
    expect(document.body.textContent).toContain('Same fence, different gardens');
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'explore', teacherLockMode: 'fence' } }, { isTeacherMode: true });
    expect(document.querySelectorAll('[role="tab"]').length).toBe(10); // stage B added four modes
  });

  it('clears the summary through an inline confirm (no window.confirm)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const state = await mount({ _areaPerimeter: { mode: 'explore', mistakeCounts: { gave_area: 2 } } }, { isTeacherMode: true });
    await click('Clear the summary');
    expect(state().mistakeCounts).toEqual({ gave_area: 2 });
    await click('Yes, clear it');
    expect(state().mistakeCounts).toEqual({});
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe('whole-sentence i18n and announcements', () => {
  it('has no glued sentence fragments and only literal keys', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const calls = [...src.matchAll(/(?<![.\w])t\(\s*'(stem\.areaperimeter\.[a-z0-9_]+)'\s*,\s*(['"])((?:\\.|(?!\2).)*)\2/g)];
    expect(calls.length).toBeGreaterThan(300);
    const fragments = calls.filter((m) => /^\s|\s$/.test(m[3]) || /^[,.;:]/.test(m[3]));
    expect(fragments.map((m) => m[1] + ' -> "' + m[3] + '"')).toEqual([]);
    const dynamic = [...src.matchAll(/(?<![.\w])t\(\s*(?!['"])/g)];
    expect(dynamic.length).toBe(0);
  });

  it('builds each SVG description from one translated sentence', () => {
    loadTool(FILE, ID);
    const bracket = { t: (key, fallback) => '[' + fallback + ']' };
    const cases = [
      [{ mode: 'explore', width: 6, height: 4 }, '#ap-explore-desc'],
      [{ mode: 'compare' }, '#ap-compare-desc'],
      [{ mode: 'composite' }, '#ap-composite-desc'],
      [{ mode: 'investigate' }, '#ap-factors-title'],
    ];
    for (const [state, selector] of cases) {
      document.body.innerHTML = renderTool(ID, { _areaPerimeter: state }, bracket);
      const text = document.querySelector(selector).textContent;
      expect((text.match(/\[/g) || []).length, selector + ': ' + text).toBe(1);
    }
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'composite' } });
    expect(document.querySelector('#ap-composite-desc').textContent).toContain('with a 6 by 3 top-right corner removed');
  });

  it('translates the practice level label instead of showing a raw id', () => {
    loadTool(FILE, ID);
    // Every visible piece of the level line must come from t(): strip translated
    // segments and nothing readable may remain (the old line showed "foundations").
    const t = (key, fallback) => '«' + fallback + '»';
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'challenge', practiceGrade: 4 } }, { t, gradeLevel: '4th Grade' });
    const eyebrow = [...document.querySelectorAll('div')].find((el) => el.children.length === 0 && el.textContent.startsWith('«Practice'));
    expect(eyebrow).toBeTruthy();
    let rest = eyebrow.textContent;
    for (let i = 0; i < 5; i += 1) rest = rest.replace(/«[^«»]*»/g, '');
    expect(rest.replace(/[\s\d•:,]/g, '')).toBe('');
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'challenge', practiceGrade: 4 } }, { t: (k, f) => (k === 'stem.areaperimeter.grade_4' ? 'Grado 4' : f), gradeLevel: '4th Grade' });
    expect(document.querySelector('[data-challenge-id]').textContent).toContain('Grado 4');
  });

  it('announces a compare-mode change once, not through a second live region', async () => {
    const speak = vi.fn();
    await mount({ _areaPerimeter: { mode: 'compare', width: 6, height: 4, compareWidth: 8, compareHeight: 3 } }, { announceToSR: speak });
    const cardLabel = [...document.querySelectorAll('div')].find((el) => el.children.length === 0 && el.textContent === 'Area comparison');
    expect(cardLabel).toBeTruthy();
    expect(cardLabel.closest('[aria-live], [role="status"]')).toBeNull();
    const slider = document.getElementById('ap-b-width');
    await React.act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(slider, '5'); slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toContain('Rectangle B is 5 by 3, with area 15 and perimeter 16');
  });
});

describe('cross-links, compatibility and clean mounts', () => {
  it('links to the Area Model and the Coordinate Grid when they are available', async () => {
    const setStemLabTool = vi.fn();
    resetStemLab();
    window.StemLab.registerTool('areamodel', { label: 'Area Model', render: () => null });
    window.StemLab.registerTool('coordinate', { label: 'Coordinate Grid', render: () => null });
    const tool = loadTool(FILE, ID);
    function App({ data }) { return tool.render(makeCtx({ toolData: data, setToolData: () => {}, setStemLabTool })); }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App, { data: { _areaPerimeter: { mode: 'explore' } } })); });
    await click('See multiplication as area in the Area Model');
    expect(setStemLabTool).toHaveBeenCalledWith('areamodel');
    await React.act(async () => { root.render(React.createElement(App, { data: { _areaPerimeter: { mode: 'challenge', genGrade: 6, genType: 'triangle_area', genSeed: 3 } } })); });
    await click('Draw polygons on the Coordinate Grid');
    expect(setStemLabTool).toHaveBeenCalledWith('coordinate');
  });

  it('loads old saved state from the fixed-challenge version', () => {
    loadTool(FILE, ID);
    const old = {
      _areaPerimeter: {
        mode: 'challenge', challengeIndex: 4, challengeId: 'l-shape-area', challengeDifficulty: 'stretch', answer: '68',
        feedback: { correct: true, challengeId: 'l-shape-area', text: 'Old text' },
        solvedChallenges: { 'garden-area': true, 1: true }, missedChallenges: { 'rug-trim': true }, streak: 2, bestStreak: 3,
        buildFeedbackKey: '24:3:3', buildFeedback: 'Too few squares. Increase a side length and try again.',
      },
    };
    const html = renderTool(ID, old);
    expect(html).not.toContain('Old text');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
    expect(html).toContain('2 solved');
    const tool = window.StemLab._registry[ID];
    expect(tool.questHooks.find((q) => q.id === 'challenge_five').progress(old)).toBe('2/5 solved');
    const oldBuild = renderTool(ID, { _areaPerimeter: { ...old._areaPerimeter, mode: 'investigate', targetArea: 24, buildWidth: 3, buildHeight: 3 } });
    expect(oldBuild).toContain('Too few squares');
  });

  it('mounts every mode on the client and switches modes by keyboard without React warnings', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Stage C orders the tabs by grade band (5th grade here: core tabs first),
      // so the walk follows the tab order on screen.
      const state = await mount({ _areaPerimeter: { mode: 'challenge', predictMeasurements: true } }, { isTeacherMode: true });
      const order = [...document.querySelectorAll('[role="tab"]')].map((el) => el.id.replace('ap-tab-', ''));
      expect(order.slice(0, 3)).toEqual(['challenge', 'composite', 'units']);
      expect([...order].sort()).toEqual(['challenge', 'circles', 'compare', 'composite', 'explore', 'fence', 'investigate', 'irregular', 'missions', 'units']);
      for (let i = 1; i < order.length; i += 1) {
        const active = document.querySelector('[role="tab"][aria-selected="true"]');
        await React.act(async () => { active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
        expect(state().mode).toBe(order[i]);
        expect(document.activeElement.id).toBe('ap-tab-' + order[i]);
        expect(document.getElementById('ap-mode-panel').getAttribute('aria-labelledby')).toBe('ap-tab-' + order[i]);
        if (order[i] === 'fence') await click('Cut a notch in the middle of a side');
      }
      expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
      expect(warns.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    } finally {
      errors.mockRestore();
      warns.mockRestore();
    }
  });

  it('mounts every mode in light, dark, contrast and teacher views without console errors', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadTool(FILE, ID);
    const modes = ['explore', 'compare', 'composite', 'investigate', 'fence', 'challenge'];
    const looks = [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }];
    for (const mode of modes) for (const look of looks) {
      const html = renderTool(ID, { _areaPerimeter: { mode, predictMeasurements: true, fenceCut: 'middle' } }, look);
      expect(html, mode).toContain('Area &amp; Perimeter Lab');
      expect(html, mode).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    for (const grade of [3, 4, 5, 6]) for (const type of pure().gradeTopics[grade]) {
      const html = renderTool(ID, { _areaPerimeter: { mode: 'challenge', genGrade: grade, genType: type, genSeed: 99, showRearrange: true, itemSig: pure().generateProblem(grade, type, 99).sig } });
      expect(html, type).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    errors.mockRestore();
  });
});
