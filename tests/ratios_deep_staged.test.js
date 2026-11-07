// Ratios Lab stage D (2026-11-04): independent bug hunt. Each block is a
// regression for a defect reproduced on the stage C file.
// RATIOS_DEEP_FILE points the suite at another copy (e.g. the stage C file).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let tool;
let root = null;
beforeEach(() => { resetStemLab(); tool = loadTool(FILE, 'ratioLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; vi.restoreAllMocks(); });

const P = () => window.RatioLabPure;
const build = (kind, params) => P().buildKindProblem(kind, params, null, { id: 'stage-d' });

async function mount(initial, overrides) {
  // 2026-11-04: missions sit behind the Missions tab; a test that seeds mission state opens it.
  const seeded = initial && initial._ratioLab;
  if (seeded && seeded.labView === undefined && (seeded.missionTab !== undefined || seeded.missions !== undefined)) initial = Object.assign({}, initial, { _ratioLab: Object.assign({ labView: 'missions' }, seeded) });
  const out = { latest: null, xp: [], toasts: [], errors: [] };
  vi.spyOn(console, 'error').mockImplementation((...a) => out.errors.push(a.map(String).join(' ').slice(0, 300)));
  function App() {
    const [state, setState] = React.useState(initial);
    out.latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (...a) => out.xp.push(a), addToast: (...a) => out.toasts.push(a) }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  out.state = () => out.latest._ratioLab || {};
  return out;
}
const $ = (sel) => document.querySelector(sel);
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function pick(name, value) { await click($('input[name="' + name + '"][value="' + value + '"]')); }
const fb = (step) => ($('[data-ratio-mission-feedback="' + step + '"]') || {}).textContent || '';
async function answerLesson(value) {
  await type($('.ratio-challenge-answer'), value);
  await click([...document.querySelectorAll('button')].find((b) => /^Check/.test(b.textContent)));
}

describe('trap detector: rounding to a whole number must stay close to the trap', () => {
  it('does not name "inverted" for 1 when the inverted value is 0.75, but still names real roundings', () => {
    // 1 cup of orange juice : 4 cups of water; 3 cups of juice -> 12 cups of water.
    const pr = build('missingValue', { a: 1, b: 4, k: 3, ctx: 'juice', askSecond: true });
    expect(pr.answer).toBe(12);
    expect(pr.traps.find((t) => t.kind === 'inverted').value).toBeCloseTo(0.75, 9);
    const one = P().diagnoseRatioAnswer(pr, '1');
    expect(one && one.kind).not.toBe('inverted');
    expect(P().diagnoseRatioAnswer(pr, '0.75').kind).toBe('inverted');
    // 4 : 7, 12 cups of juice -> inverted value 48/7 = 6.857...
    const pr2 = build('missingValue', { a: 4, b: 7, k: 3, ctx: 'juice', askSecond: true });
    expect(P().diagnoseRatioAnswer(pr2, '6.86').kind).toBe('inverted');
    expect(P().diagnoseRatioAnswer(pr2, '6.9').kind).toBe('inverted');
    expect(P().diagnoseRatioAnswer(pr2, '7').kind).toBe('inverted');
  });

  it('across generated practice, a whole-number rounding more than 5% off a trap is never named as that trap', () => {
    let checked = 0;
    for (const kind of P().kinds) {
      for (let seed = 1; seed <= 120; seed++) {
        for (const band of P().bands) {
          const pr = build(kind, P().makeKindParams(kind, seed * 31 + 7, band));
          for (const trap of pr.traps || []) {
            if (Number.isInteger(trap.value)) continue;
            const r0 = Math.round(trap.value);
            if (r0 === 0 || Math.abs(r0 - trap.value) <= 0.05 * Math.abs(trap.value) || Math.abs(r0 - pr.answer) < 1e-9) continue;
            if ((pr.traps || []).some((t) => Math.abs(t.value - r0) < 1e-9)) continue;
            const d = P().diagnoseRatioAnswer(pr, String(r0));
            checked++;
            expect(!!(d && d.kind === trap.kind && d.message === trap.message), kind + ' ' + trap.kind + ' ' + trap.value + ' typed ' + r0).toBe(false);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('answer parsing on real and hostile input', () => {
  it('reads "25 %", "$ 24" and the unit word the box asks for', () => {
    const pc = build('percentRate', { P: 45, W: 180, ctx: 'plain' });
    expect(P().challengeIsCorrect(pc, '25 %', { strictUnits: true })).toBe(true);
    const tickets = build('lineMissing', { ctx: 'tickets', a: 5, rate: 3, c: 8 });
    expect(P().challengeIsCorrect(tickets, '$ 24', { strictUnits: true })).toBe(true);
    const cups = build('missingValue', { a: 3, b: 5, k: 4, ctx: 'paint', askSecond: false });
    expect(P().challengeIsCorrect(cups, '12 cups', { strictUnits: true })).toBe(true);
    expect(P().challengeIsCorrect(cups, '12 Cups')).toBe(true);
    // Only the unit the box asks for: another word is not the answer.
    expect(P().challengeIsCorrect(cups, '12 stickers')).toBe(false);
    const recipe = build('recipeScale', { ing: 'flour', S: 4, T: 6, q: 0.75 });
    expect(P().challengeIsCorrect(recipe, '1 1/8 cups', { strictUnits: true })).toBe(true);
    // A trap typed with its unit is still named.
    expect(P().diagnoseRatioAnswer(cups, '18 cups').kind).toBe('additive');
  });

  it('never turns an overflowing fraction into 0 or NaN', () => {
    const nines = '9'.repeat(400);
    expect(P().parseNumberWithFraction('1/' + nines)).toBeNull();
    expect(P().parseNumberWithFraction(nines + '/' + nines)).toBeNull();
    expect(P().parseNumberWithFraction('1 1/' + nines)).toBeNull();
    expect(P().parseNumberWithFraction('1 1/2')).toBe(1.5);
  });
});

describe('percent change: a minus sign on the right size is named', () => {
  it('says to drop the minus sign for a percent decrease, and checks the sign for an increase', () => {
    const down = build('percentChange', { o: 80, pct: 25, up: false, ctx: 'price' });
    for (const typed of ['-25', '-25%']) {
      expect(P().challengeIsCorrect(down, typed, { strictUnits: true })).toBe(false);
      const d = P().diagnoseRatioAnswer(down, typed);
      expect(d && d.kind).toBe('signOnly');
      expect(d.message).toContain('without a minus sign');
    }
    const up = build('percentChange', { o: 80, pct: 25, up: true, ctx: 'club' });
    const d2 = P().diagnoseRatioAnswer(up, '-25');
    expect(d2 && d2.kind).toBe('signOnly');
    expect(d2.message).toContain('sign');
    expect(P().misconceptionLabel('signOnly')).not.toBe(P().misconceptionLabel('other'));
  });
});

describe('simplify feedback matches what was typed', () => {
  it('names decimal terms, and does not call an unsimplified reversal "the right size"', () => {
    const pr = build('simplify', { a: 3, b: 4, g: 6 });
    const dec = P().diagnoseRatioAnswer(pr, '1.5:2');
    expect(dec.kind).toBe('decimalTerms');
    expect(dec.message).toContain('whole numbers');
    expect(P().diagnoseRatioAnswer(pr, '0.75:1').kind).toBe('decimalTerms');
    expect(P().diagnoseRatioAnswer(pr, '9:12').kind).toBe('partlySimplified');
    const swappedBig = P().diagnoseRatioAnswer(pr, '24:18');
    expect(swappedBig.kind).toBe('reversedRatio');
    expect(swappedBig.message).not.toContain('right size');
    expect(P().diagnoseRatioAnswer(pr, '4:3').message).toContain('right size');
    expect(P().misconceptionLabel('decimalTerms')).not.toBe(P().misconceptionLabel('other'));
  });
});

describe('XP is not earned by elimination', () => {
  it('a lesson A/B item answered after a wrong pick is solved, without the 15 XP', async () => {
    const app = await mount({ _ratioLab: { mode: 'unitRates', challengeCursorByMode: { unitRates: 'unit-snacks' } } }, { gradeLevel: '6th Grade' });
    await answerLesson('A');
    await answerLesson('B');
    expect(app.state().solvedChallenges['unit-snacks']).toBe(true);
    expect(app.xp).toEqual([]);
    expect(app.state().challengeFeedback.message).toContain('XP is for a right first try');
    expect(document.body.textContent).toContain('XP is for a right first try');
    expect(app.toasts.some((t) => /\+15 XP/.test(String(t[0])))).toBe(false);
    expect(app.errors).toEqual([]);
  });

  it('a lesson A/B item right on the first try still earns 15 XP once', async () => {
    const app = await mount({ _ratioLab: { mode: 'unitRates', challengeCursorByMode: { unitRates: 'unit-snacks' } } }, { gradeLevel: '6th Grade' });
    await answerLesson('B');
    expect(app.xp).toEqual([['ratioLab', 15, 'Ratio Lab challenge']]);
  });

  it('mixture mission: the comparison opens only after both fractions, so it cannot leak them', async () => {
    let seed = 1; let ms;
    for (; seed < 200; seed++) { ms = P().buildMission('mixture', seed); if (ms.steps[2].problem.answers[0] !== 'same') break; }
    const app = await mount({ _ratioLab: { missionTab: 'mixture', missions: { mixture: { seed } } } }, { gradeLevel: '7th Grade' });
    await pick('ratio-ms-predict-mixture', ms.predict.correct);
    const fracA = ms.steps[0].problem.answerText, fracB = ms.steps[1].problem.answerText;
    // Right comparison first: refused, no try counted, nothing revealed.
    await pick('ratio-ms-mixture-compare-choice', P().normalizeChoice(ms.steps[2].problem.answers[0]));
    await click($('[data-ratio-mission-check="compare"]'));
    expect(fb('compare')).toContain('steps 1 and 2 first');
    expect(fb('compare')).not.toContain(fracA);
    expect($('[data-ratio-mix-tapes] desc').textContent).not.toContain('of the whole');
    expect(app.state().missions.mixture.solved || {}).toEqual({});
    expect((app.state().missions.mixture.tries || {}).compare).toBeUndefined();
    // A wrong comparison first: same refusal, so its feedback cannot show the fractions.
    const wrong = ['a', 'b', 'same'].find((c) => c !== P().normalizeChoice(ms.steps[2].problem.answers[0]));
    await pick('ratio-ms-mixture-compare-choice', wrong);
    await click($('[data-ratio-mission-check="compare"]'));
    expect(fb('compare')).not.toContain(fracB);
    // In order, first try each: the mission counts once.
    await type(document.getElementById('ratio-ms-mixture-fracA-input'), fracA);
    await click($('[data-ratio-mission-check="fracA"]'));
    await type(document.getElementById('ratio-ms-mixture-fracB-input'), fracB);
    await click($('[data-ratio-mission-check="fracB"]'));
    await pick('ratio-ms-mixture-compare-choice', P().normalizeChoice(ms.steps[2].problem.answers[0]));
    await click($('[data-ratio-mission-check="compare"]'));
    expect(fb('compare')).toContain('Correct!');
    expect($('[data-ratio-mission-complete="mixture"]')).toBeTruthy();
    expect(app.xp).toEqual([['ratioLab', 10, 'Ratio Lab mission complete']]);
    expect(app.errors).toEqual([]);
  });

  it('detective mission: a verdict flipped after a wrong pick does not finish the mission for XP', async () => {
    const ms = P().buildMission('detective', 4);
    const app = await mount({ _ratioLab: { missionTab: 'detective', missions: { detective: { seed: 4 } } } }, { gradeLevel: '7th Grade' });
    const [first, ...rest] = ms.cases;
    // The wrong verdict's feedback settles the yes/no question.
    await pick('ratio-ms-detective-' + first.id + '-v', first.proportional ? 'no' : 'yes');
    await pick('ratio-ms-detective-' + first.id + '-e', first.evidence);
    await click($('[data-ratio-mission-check="' + first.id + '"]'));
    await pick('ratio-ms-detective-' + first.id + '-v', first.proportional ? 'yes' : 'no');
    await click($('[data-ratio-mission-check="' + first.id + '"]'));
    expect(fb(first.id)).toContain('Correct!');
    expect(fb(first.id)).toContain('does not count');
    // 2026-11-04: one detective case at a time; each case is opened from its dot.
    for (const c of rest) {
      await click($('[data-ratio-case-dot="' + c.id + '"]'));
      await pick('ratio-ms-detective-' + c.id + '-v', c.proportional ? 'yes' : 'no');
      await pick('ratio-ms-detective-' + c.id + '-e', c.evidence);
      await click($('[data-ratio-mission-check="' + c.id + '"]'));
    }
    expect($('[data-ratio-mission-progress="detective"]').textContent).toContain(ms.cases.length + ' of ' + ms.cases.length);
    expect($('[data-ratio-mission-complete="detective"]')).toBeNull();
    expect($('[data-ratio-mission-guessed="detective"]')).toBeTruthy();
    expect(app.xp).toEqual([]);
    expect(app.state().missionsDone).toBeUndefined();
    // A new detective mission solved first try on every case counts.
    await click($('[data-ratio-new-mission="detective"]'));
    const seed2 = Number($('[data-ratio-mission="detective"]').getAttribute('data-mission-seed'));
    for (const c of P().buildMission('detective', seed2).cases) {
      await click($('[data-ratio-case-dot="' + c.id + '"]'));
      await pick('ratio-ms-detective-' + c.id + '-v', c.proportional ? 'yes' : 'no');
      await pick('ratio-ms-detective-' + c.id + '-e', c.evidence);
      await click($('[data-ratio-mission-check="' + c.id + '"]'));
    }
    expect($('[data-ratio-mission-complete="detective"]')).toBeTruthy();
    expect(app.xp).toEqual([['ratioLab', 10, 'Ratio Lab mission complete']]);
    expect(app.state().missionsDone['detective:' + seed2]).toBe(true);
    expect(app.errors).toEqual([]);
  }, 20000);
});
