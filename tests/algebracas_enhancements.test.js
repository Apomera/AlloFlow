// Algebra CAS depth review (2026-11-03), approved enhancements:
// E1 engine checks every AI answer; E2 named linear-equation slips; E3 exact worked examples
// that fade; E4/E7 algebra-tile mat, tilting beam and predict-then-check; E8/E9 offline
// honesty and accessibility. ALGEBRACAS_FILE points the suite at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ALGEBRACAS_FILE || 'stem_lab/stem_tool_algebracas.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let drawCalls = [];
beforeEach(() => {
  drawCalls = [];
  const drawing = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 20 }) : (...args) => { drawCalls.push([k, args]); } });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  resetStemLab(); loadTool(FILE, 'algebraCAS'); document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const cas = () => window.__alloCASPure;

async function mount(state, extra = {}) {
  let latest;
  const awardXP = vi.fn();
  function App() {
    const [data, setData] = React.useState({ algebraCAS: state });
    latest = data;
    return window.StemLab._registry.algebraCAS.render(makeCtx({ toolData: data, setToolData: setData, awardXP, ...extra }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest.algebraCAS, awardXP };
}
const visible = (el) => { const c = el.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove()); return c.textContent.trim(); };
const button = (label) => [...document.querySelectorAll('button')].find((b) => visible(b) === label || b.getAttribute('aria-label') === label);
async function click(label) { const el = button(label); expect(el, label).toBeTruthy(); await React.act(async () => { el.click(); await Promise.resolve(); }); }
async function type(selector, value) {
  const el = document.querySelector(selector);
  expect(el, selector).toBeTruthy();
  await React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function enter(selector) { const el = document.querySelector(selector); await React.act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); }
async function choose(selector) { const el = document.querySelector(selector); expect(el, selector).toBeTruthy(); await React.act(() => el.click()); }
const html = (state, extra) => { const host = document.createElement('div'); host.innerHTML = renderTool('algebraCAS', { algebraCAS: state }, extra); return host; };
const solved = (eq) => { const s = cas().solveLinear(eq); return { tab: 'solve', expression: eq, result: s.text, verify: s.verify }; };

describe('E1: the engine checks AI answers against the problem', () => {
  it('grades from the problem and reports the key honestly', () => {
    const g = (p, k, s) => cas().gradeFromProblem(p, k, s);
    expect(g('Solve for x: 2x + 3 = 11', 'x = 5', '4')).toMatchObject({ decidable: true, correct: true, key: 'wrong' });
    expect(g('Solve 2x + 3 = 11.', 'x = 4', '5')).toMatchObject({ decidable: true, correct: false, key: 'ok' });
    expect(g('x^2 - 5x + 6 = 0', 'x = 2', 'x = 2, x = 3')).toMatchObject({ correct: true, key: 'incomplete' });
    expect(g('x^2 - 5x + 6 = 0', 'x = 2, x = 3', 'x = 2')).toMatchObject({ decidable: true, correct: false, code: 'missing_roots' });
    expect(g('x^2 - 5x + 6 = 0', 'x = 1, x = 6', 'x = 3, x = 2')).toMatchObject({ decidable: true, correct: true, key: 'wrong', code: 'roots_complete' });
    // One root of two, with a wrong key: the engine cannot prove completeness, so it does not decide.
    expect(g('x^2 - 5x + 6 = 0', 'x = 1, x = 6', 'x = 3')).toMatchObject({ decidable: false, satisfies: true });
  });
  it('uses sample-point equivalence for factor, expand and simplify, with a form check where it is clear', () => {
    const g = (p, k, s) => cas().gradeFromProblem(p, k, s);
    expect(g('Factor x^2 + 5x + 6', '(x+2)(x+4)', '(x+3)(x+2)')).toMatchObject({ correct: true, key: 'wrong', code: 'equivalent' });
    expect(g('Factor x^2 + 5x + 6', '(x+2)(x+3)', 'x^2+5x+6')).toMatchObject({ correct: false, code: 'unchanged' });
    expect(g('Factor x^2 + 5x + 6', '(x+2)(x+3)', 'x^2+5x+7')).toMatchObject({ correct: false, code: 'not_equivalent' });
    expect(g('Expand (x+1)(x+2)', 'x^2+3x+2', 'x(x+2)+(x+2)')).toMatchObject({ correct: false, code: 'not_expanded' });
    expect(g('Simplify 2(x+3) - (x-1)', 'x + 7', 'x+7')).toMatchObject({ correct: true, code: 'equivalent' });
    expect(g('A train goes 60 miles in 2 hours. How fast?', '30', '30').decidable).toBe(false);
  });
  it('checks the Solve tab AI result for factor/expand and says plainly when it is wrong', () => {
    expect(cas().checkAiResult('x^2-9', 'factor', '(x-3)(x+3)')).toMatchObject({ decidable: true, verified: true, method: 'sample' });
    const wrong = cas().checkAiResult('(x+1)^2', 'expand', 'x^2+1');
    expect(wrong).toMatchObject({ decidable: true, verified: false });
    const host = html({ tab: 'solve', mode: 'expand', expression: '(x+1)^2', result: 'STEP 1: square\nANSWER: x^2+1', verify: wrong });
    expect(host.textContent).toContain('NOT equal to your expression');
  });
  it('checks a generated key before the student answers and says so', async () => {
    const gemini = vi.fn(() => Promise.resolve('PROBLEM: 2x + 3 = 11\nANSWER: x = 5\nHINT: subtract first'));
    const app = await mount({ tab: 'practice' }, { callGemini: gemini });
    await click('🎲 Generate Problem');
    await React.act(async () => { await Promise.resolve(); });
    expect(app.state().practiceQ).toMatchObject({ problem: '2x + 3 = 11', keyStatus: 'wrong' });
    expect(document.querySelector('[data-ai-key-status="wrong"]')).not.toBeNull();
  });
  it('a key it cannot check is labelled as the AI key, not "checked by the math engine"', async () => {
    const gemini = vi.fn(() => Promise.resolve('CORRECT: yes\nFEEDBACK: ok\nSOLUTION:\nANSWER: x = 3, y = 2'));
    const app = await mount({ tab: 'practice', practiceQ: { problem: 'x + y = 5 and x - y = 1', answer: 'x = 3, y = 2', hint: '' }, practiceAnswer: 'x = 3, y = 2' }, { callGemini: gemini });
    await click('✅ Check');
    await React.act(async () => { await Promise.resolve(); });
    expect(app.state().practiceFeedback).toMatchObject({ correct: true, gradeSource: 'key' });
    expect(document.body.textContent).toContain('Compared with the AI\'s answer key');
    expect(document.body.textContent).not.toContain('Checked by the math engine');
  });
});

describe('E8/E9: offline honesty and accessibility', () => {
  it('problem types with no local items are hidden offline (2026-11-03 AI-off sweep); Multi-Step gives local multi-step items', async () => {
    const app = await mount({ tab: 'practice' });
    for (const name of ['📈 Quadratic', '📖 Word Problem', '⚖ Systems']) expect(button(name), name).toBeUndefined();
    expect(button('🔣 Multi-Step').disabled).toBe(false);
    expect(document.body.textContent).not.toContain('Quadratic, Word Problem and Systems need the AI provider');
    await click('🔣 Multi-Step');
    await click('🎲 Generate Problem');
    expect(app.state().practiceQ.source).toBe('local-linear');
    expect(app.state().practiceQ.problem).toMatch(/\(x/); // a bracket: the middle-level template
  });
  it('badges have names, and the AI-only ones say so offline', () => {
    const host = html({ tab: 'solve' });
    const imgs = [...host.querySelectorAll('[role="list"] [role="img"]')];
    expect(imgs).toHaveLength(12);
    expect(imgs.every((i) => i.getAttribute('aria-label').length > 10)).toBe(true);
    expect(imgs.filter((i) => /Needs the AI provider/.test(i.getAttribute('aria-label'))).length).toBe(4);
    const online = html({ tab: 'solve' }, { callGemini: () => Promise.resolve('') });
    expect(online.textContent).not.toContain('Badges marked AI');
  });
  it('quests that need AI say so', () => {
    const hooks = window.StemLab._registry.algebraCAS.questHooks;
    expect(hooks.find((q) => q.id === 'factor_3').label).toContain('needs the AI provider');
    expect(hooks.find((q) => q.id === 'all_modes').label).toContain('needs the AI provider');
  });
  it('announces a local solve and a practice verdict, and the verdict is a status', async () => {
    const announceToSR = vi.fn();
    await mount({ tab: 'solve', mode: 'solve', expression: '3(x - 2) = 15' }, { announceToSR });
    await click('▶ Solve');
    expect(announceToSR).toHaveBeenCalledWith(expect.stringContaining('x = 7'));
    const host = html({ tab: 'practice', practiceQ: { problem: '2x = 4', answer: '2', hint: '' }, practiceFeedback: { correct: true, text: 'FEEDBACK: ok', gradeSource: 'verified' } });
    expect(host.querySelector('[data-practice-verdict="correct"]').getAttribute('role')).toBe('status');
  });
  it('the balance canvas is not a keyboard stop', () => {
    expect(html({ tab: 'scale', scaleEq: 'x + 1 = 2' }).querySelector('canvas').hasAttribute('tabindex')).toBe(false);
  });
  it('worked steps can be read aloud through the speech helper', async () => {
    const callTTS = vi.fn(() => Promise.resolve(null));
    await mount(solved('3(x - 2) = 15'), { callTTS });
    await click('🔊 Read the steps aloud');
    expect(callTTS).toHaveBeenCalledTimes(1);
    const spoken = callTTS.mock.calls[0][0];
    expect(spoken).toContain('Distribute');
    expect(spoken).toContain('3x minus 6 equals 15');
  });
});

describe('E3: exact multi-step worked examples that fade', () => {
  it('shows distribute, combine, isolate and divide exactly', () => {
    const w = cas().linearSteps('2(x + 3) + x = 4x - 1');
    expect(w.steps.map((s) => s.rule)).toEqual(['distribute', 'combine', 'subtract', 'add', 'swap']);
    expect(w.steps.map((s) => s.equation)).toEqual(['2x + 6 + x = 4x - 1', '3x + 6 = 4x - 1', '6 = x - 1', '7 = x', 'x = 7']);
    expect(cas().linearSteps('3(x - 2) = x + 4').steps.map((s) => cas().ruleText(s))).toEqual(['Distribute', 'Subtract x from both sides', 'Add 6 to both sides', 'Divide both sides by 2']);
    expect(cas().linearSteps('(2/3)x = 4').steps[0]).toMatchObject({ rule: 'multiply', value: '3/2', equation: 'x = 6' });
  });
  it('the full example lists every step with its rule and the answer', () => {
    const host = html(solved('3(x - 2) = 15'));
    const panel = host.querySelector('[data-worked-example="full"]');
    expect(panel.textContent).toContain('Step 1: 3x - 6 = 15');
    expect(panel.textContent).toContain('Add 6 to both sides');
    expect(panel.textContent).toContain('Answer: x = 7');
  });
  it('partly blank: the later steps are typed and checked by the step checker', async () => {
    const app = await mount(solved('3(x - 2) = 15'));
    await click('Some steps blank');
    expect(document.querySelector('[data-worked-example="faded"]')).not.toBeNull();
    expect(document.querySelector('#cas-worked-0')).toBeNull(); // step 1 still shown
    expect(document.querySelector('#cas-worked-2')).not.toBeNull();
    expect(document.querySelector('[data-worked-example="faded"]').textContent).not.toContain('Answer: x = 7');
    await type('#cas-worked-1', '3x = 9');
    await enter('#cas-worked-1');
    expect(app.state().workedChecks[1]).toMatchObject({ status: 'wrong' });
    await type('#cas-worked-1', '3x = 21');
    await enter('#cas-worked-1');
    expect(app.state().workedChecks[1].status).toBe('match');
    await type('#cas-worked-2', 'x = 18');
    await enter('#cas-worked-2');
    expect(app.state().workedChecks[2]).toMatchObject({ status: 'wrong', error: 'coefficient_addend' });
    expect(document.body.textContent).toContain('subtracted instead of divided');
    await type('#cas-worked-2', '7 = x');
    await enter('#cas-worked-2');
    expect(app.state().workedChecks[2].status).toBe('match');
    expect(document.querySelector('[data-worked-example="faded"]').textContent).toContain('Answer: x = 7');
    expect(app.awardXP.mock.calls.filter((c) => c[2] === 'Faded worked example')).toHaveLength(1);
  });
  it('your turn: the student writes every line; equivalent lines are kept, the finish is credited once', async () => {
    const app = await mount(solved('3(x - 2) = 15'));
    await click('Your turn: write each line');
    await click('Hint: next step');
    expect(document.body.textContent).toContain('Next step: Distribute');
    await type('#cas-own-line', '3x - 2 = 15');
    await click('Check line');
    expect(app.state().workedLineFeedback).toMatchObject({ kind: 'wrong', code: 'distribute_first' });
    expect(app.state().workedLines).toEqual([]);
    for (const line of ['3x - 6 = 15', '3x = 21', 'x = 7']) { await type('#cas-own-line', line); await click('Check line'); }
    expect(app.state().workedLines).toEqual(['3x - 6 = 15', '3x = 21', 'x = 7']);
    expect(app.state().workedLineFeedback.kind).toBe('solved');
    expect(document.querySelector('#cas-own-line')).toBeNull();
    expect(app.awardXP.mock.calls.filter((c) => c[2] === 'Solved a worked example on your own')).toHaveLength(1);
  });
});

describe('E2: common linear-equation slips are named only on a unique match', () => {
  it.each([
    ['3(x + 2) = 21', '3x + 2 = 21', 'distribute_first'],
    ['-3(x - 2) = 12', '-3x - 6 = 12', 'distribute_sign'],
    ['-(x - 3) = 7', '-x - 3 = 7', 'distribute_sign'],
    ['3x + 5 = 14', '3x = 19', 'move_sign'],
    ['2x + 3 = x + 7', '3x + 3 = 7', 'move_sign'],
    ['2x + 4 = 10', 'x + 4 = 5', 'divide_one'],
    ['2x + 3 = 11', '5x = 11', 'combine_unlike'],
    ['3x = 12', 'x = 9', 'coefficient_addend'],
    ['3x + 2 = 14', 'x + 2 = 11', 'coefficient_addend']
  ])('%s -> %s is %s', (before, after, code) => {
    expect(cas().checkLinearStep(before, after)).toMatchObject({ ok: true, equivalent: false, error: code });
  });
  it('an unexplained wrong line, or a right one, gets no name', () => {
    expect(cas().checkLinearStep('3x + 5 = 14', '3x = 7').error).toBeNull();
    expect(cas().checkLinearStep('3x + 5 = 14', '3x = 9')).toMatchObject({ equivalent: true, error: null });
  });
  it('a line that two different slips both produce gets the generic message', () => {
    // 2x + 1 = 4 -> x + 1 = 2 is "divided only some terms by 2" AND "subtracted the coefficient 2".
    expect(cas().diagnoseStep('2x + 1 = 4', 'x + 1 = 2')).toBeNull();
    expect(cas().checkLinearStep('2x + 1 = 4', 'x + 1 = 2')).toMatchObject({ equivalent: false, error: null });
    // A "slip" that happens to give the right equation is not a slip.
    expect(cas().diagnoseStep('2x = 4', 'x = 2')).toBeNull();
  });
  it('the Solve tab step checker shows the named slip', async () => {
    const app = await mount({ tab: 'solve', expression: '3x + 5 = 14', nextEquation: '3x = 19' });
    document.querySelector('[data-linear-step-checker]').open = true;
    await click('Check this step');
    expect(app.state().stepCheck.error).toBe('move_sign');
    expect(document.body.textContent).toContain('moved to the other side without changing its sign');
  });
});

describe('E4/E7: algebra-tile mat, tilting beam, predict-then-check', () => {
  it('counts tiles for each pan from the exact equation, and zero pairs for add/subtract', () => {
    expect(cas().tileCounts('3x + 5 = 14')).toMatchObject({ ok: true, whole: true, left: { x: 3, one: 5 }, right: { x: 0, one: 14 } });
    expect(cas().tileCounts('(1/3)x = 1').whole).toBe(false);
    expect(cas().tileStep('3x + 5 = 14', 'Subtract', '5')).toMatchObject({ kind: 'addsub', added: { x: 0, one: -5 }, pairs: { left: { x: 0, one: 5 }, right: { x: 0, one: 5 } } });
    expect(cas().tileStep('-2x + 3 = x', 'Add', '2x')).toMatchObject({ pairs: { left: { x: 2, one: 0 }, right: { x: 0, one: 0 } } });
  });
  it('draws the tiles, animates the zero pairs and describes it all in text', async () => {
    await mount({ tab: 'scale', scaleEq: '3x + 5 = 14', scaleOpVal: '5' });
    expect(document.querySelectorAll('[data-tile-pan="left"] [data-tile="+x"]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-tile-pan="left"] [data-tile="+one"]')).toHaveLength(5);
    await click('Subtract the entered value on both sides');
    expect(document.querySelectorAll('[data-tile-pan="left"] > div:nth-child(2) [data-tile="+one"]')).toHaveLength(0);
    expect(document.querySelector('[data-zero-pairs="left"]')).not.toBeNull();
    const readout = document.querySelector('[data-tile-readout]').textContent;
    expect(readout).toContain('x-tiles 3, one-tiles 0, which is 3x');
    expect(readout).toContain('5 negative one-tiles');
    expect(readout).toContain('5 zero pairs came off the left pan');
  });
  it('with reduced motion the zero-pair animation is not drawn (checked when the step happens)', async () => {
    let reduce = false;
    vi.stubGlobal('matchMedia', () => ({ matches: reduce, addListener() {}, removeListener() {} }));
    await mount({ tab: 'scale', scaleEq: '3x + 5 = 14', scaleOpVal: '5' });
    reduce = true; // switched on after load
    await click('Subtract the entered value on both sides');
    expect(document.querySelector('[data-zero-pairs]')).toBeNull();
    expect(document.querySelector('[data-tile-readout]').textContent).toContain('zero pairs came off');
  });
  it('the beam tips toward the greater side during a trial, easing per frame and honouring reduced motion each frame', async () => {
    let reduce = false, mmCalls = 0;
    const frames = [];
    vi.stubGlobal('matchMedia', () => { mmCalls++; return { matches: reduce, addListener() {}, removeListener() {} }; });
    vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    await mount({ tab: 'scale', scaleEq: '3x + 5 = 14', scaleTrialOpen: true, scaleTrialValue: '4', scaleTrialChecked: '4' });
    const run = async (n) => { for (let i = 0; i < n && frames.length; i++) { const cb = frames.shift(); await React.act(() => cb()); } };
    await run(3);
    const rotations = () => drawCalls.filter((c) => c[0] === 'rotate').map((c) => c[1][0]);
    const r = rotations();
    expect(r.length).toBeGreaterThan(1);
    expect(r[r.length - 1]).toBeLessThan(0);            // left (17) > right (14): tips left
    expect(r[r.length - 1]).toBeGreaterThan(-0.16);     // still easing
    const before = mmCalls;
    reduce = true;
    await run(1);
    expect(mmCalls).toBeGreaterThan(before);
    expect(rotations().pop()).toBeCloseTo(-0.16, 6);    // jumped to the end
    expect(document.querySelector('[data-tile-trial=">"]').textContent).toContain('tips down on the left');
  });
  it('predict-then-check hides a trial result until a prediction is made, then compares', async () => {
    const app = await mount({ tab: 'scale', scaleEq: '3x + 5 = 14', scaleTrialOpen: true, scaleTrialValue: '4' });
    await choose('[data-scale-predict-toggle]');
    expect(button('Check value').disabled).toBe(true);
    await choose('input[name="balance-trial-predict"][value="equal"]');
    await click('Check value');
    expect(document.querySelector('[data-balance-trial-result]').dataset.balanceTrialResult).toBe('>');
    expect(document.querySelector('[data-balance-trial-status]').textContent).toContain('did not match');
    await click('Test x − 1');
    expect(app.state().scaleTrialValue).toBe('3');
    expect(document.querySelector('[data-balance-trial-result]')).toBeNull(); // waits for a new prediction
    await choose('input[name="balance-trial-predict"][value="equal"]');
    await click('Check value');
    expect(document.querySelector('[data-balance-trial-status]').textContent).toContain('Your prediction matched');
  });
  it('predict-then-check asks "stays level or tips" before an operation', async () => {
    const app = await mount({ tab: 'scale', scaleEq: '3x + 5 = 14', scaleOpVal: '5', scalePredictOn: true });
    expect(button('Subtract the entered value on both sides').disabled).toBe(true);
    await choose('input[name="balance-op-predict"][value="tips"]');
    await click('Subtract the entered value on both sides');
    expect(app.state().scaleEq).toBe('3x = 9');
    expect(document.querySelector('[data-op-predict-result="missed"]').textContent).toContain('stayed level');
    expect(button('Divide the entered value on both sides').disabled).toBe(true); // predict again
  });
  it('works at 320 px and in dark and high-contrast themes without leftovers', () => {
    for (const extra of [{}, { isDark: true }, { isContrast: true }]) {
      const host = html({ tab: 'scale', scaleEq: '-2x + 3 = x - 4', scaleTrialOpen: true, scaleTrialValue: '1', scaleTrialChecked: '1' }, extra);
      expect(host.querySelector('[data-tile-mat]')).not.toBeNull();
      expect(host.textContent).not.toMatch(/undefined|NaN|\[object Object\]|\{[a-z]+\}/);
      // The pans sit in an auto-fit grid with a 130 px minimum, so two fit side by side at 320 px or stack below it.
      expect(host.querySelector('[data-tile-pan]').parentElement.getAttribute('style')).toContain('minmax(130px, 1fr)');
    }
  });
});
