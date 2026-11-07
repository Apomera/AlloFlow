// Arithmetic Strategy Studio stage C (2026-11-03): one reveal rule in every
// tab, speech cancelled on unmount, a band-aware "Start here" path with ticks
// from saved progress, band tab order, translated quest labels and id -> true
// progress maps. Everything is checked by running the tool.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// ARITH_STAGEC_FILE lets the gates run against an older copy to prove they fail on it.
const FILE = process.env.ARITH_STAGEC_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [], tool };
  function App() {
    const [state, setState] = React.useState(initial);
    view.state = state;
    view.set = setState;
    return tool.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (...args) => view.awards.push(args),
      announceToSR: (m) => view.announcements.push(m),
    }, overrides || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  view.d = () => view.state._arithmeticStudio || {};
  return view;
}
async function unmount() { await React.act(async () => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; }
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
function button(label) {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
  expect(el, label).toBeTruthy();
  return el;
}
const maybeButton = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label) || null;
async function click(el) { await React.act(async () => { el.click(); }); }
const numberInputs = () => [...document.querySelectorAll('input[type="number"]')];
const allTrue = (map) => map && typeof map === 'object' && !Array.isArray(map) && Object.values(map).every((v) => v === true);

describe('one reveal rule: on demand after two tries, never automatic', () => {
  it('Practice shows the answer only when asked, after two tries, and never for credit', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'subtract', level: 1 } });
    await type(numberInputs()[0], '40');
    await click(document.querySelector('[data-lock-estimate]'));
    await type(numberInputs()[1], '55');
    await click(button('Check answer'));
    expect(maybeButton('Show the answer')).toBeNull();
    await type(numberInputs()[1], '35');
    await click(button('Check answer'));
    expect(view.d().feedback).toBe('try');
    expect(document.body.textContent).not.toContain('The answer is 45');
    expect(button('Show the answer')).toBeTruthy();
    // Typing a third answer keeps the button; a third try still earns credit before any reveal.
    await type(numberInputs()[1], '4');
    expect(button('Show the answer')).toBeTruthy();
    await type(numberInputs()[1], '45');
    await click(button('Check answer'));
    expect(view.d().practiceSolved.s1).toBe(true);
    expect(view.awards).toHaveLength(1);
  });

  it('Practice hides the button when the teacher turns reveals off', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'practice', operation: 'subtract', level: 1, teacher: { reveals: false } } });
    await type(numberInputs()[0], '40');
    await click(document.querySelector('[data-lock-estimate]'));
    for (const g of ['55', '35', '25']) { await type(numberInputs()[1], g); await click(button('Check answer')); }
    expect(view.d().feedback).toBe('try');
    expect(maybeButton('Show the answer')).toBeNull();
  });

  it('Error Detective: ruling out every other choice earns nothing and counts as shown', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'errors', errorIndex: 0 } });
    await click(document.querySelector('[data-error-choice="place"]'));
    expect(maybeButton('Show the answer')).toBeNull();
    // Clicking a ruled-out choice again does nothing.
    expect(document.querySelector('[data-error-choice="place"]').disabled).toBe(true);
    await click(document.querySelector('[data-error-choice="operation"]'));
    expect(button('Show the answer')).toBeTruthy();
    await click(document.querySelector('[data-error-choice="regroup"]'));
    expect(view.d().errorFeedback).toBe('eliminated');
    expect(document.querySelector('[data-error-done]').getAttribute('data-error-done')).toBe('eliminated');
    expect(view.awards).toEqual([]);
    expect(view.d().errorSolvedCases || {}).not.toHaveProperty('e1');
    expect(view.d().errorRevealed.e1).toBe(true);
    expect(view.d().errorMissedCases.e1).toBe(true);
    // A first-try diagnosis still earns the points.
    await click(button('Next mistake'));
    await click(document.querySelector('[data-error-choice="direction"]'));
    expect(view.awards).toEqual([['arithmeticStudio', 2, expect.any(String)]]);
  });

  it('"Which strategy is efficient?" treats elimination like a shown answer', async () => {
    const P = pure();
    const item = P.genMentalItem('ef', 'g4', 1);
    const view = await mount({ _arithmeticStudio: { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 1 } });
    for (const id of item.order.filter((x) => x !== item.key)) await click(document.querySelector(`[data-ef-choice="${id}"]`));
    expect(view.d().efFeedback).toBe('try');
    await click(document.querySelector(`[data-ef-choice="${item.key}"]`));
    expect(view.d().efFeedback).toBe('eliminated');
    expect(view.awards).toEqual([]);
    expect(view.d().efRevealed[item.id]).toBe(true);
    expect(view.d().efSolved || {}).not.toHaveProperty(item.id);
  });

  it('Word problems gain the same on-demand reveal, with no credit afterwards', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'apply', wordProblemId: 'w1' } });
    const answer = () => document.querySelector('[data-word-problem-id]').parentElement.querySelector('input[type="number"]');
    await click(document.querySelector('[data-word-operation="subtract"]'));
    await type(answer(), '73');
    await click(button('Check response'));
    expect(maybeButton('Show the answer')).toBeNull();
    await click(document.querySelector('[data-word-operation="add"]'));
    await type(answer(), '400');
    await click(button('Check response'));
    expect(document.body.textContent).not.toContain('423');
    await click(button('Show the answer'));
    expect(document.querySelector('[data-word-revealed]').textContent).toContain('423 graphic novels');
    expect(view.d().wordRevealed.w1).toBe(true);
    expect(button('Check response').disabled).toBe(true);
    // Coming back to it later: solving it now earns no points.
    await click(button('Next scenario'));
    await click(button('Retry missed (1)'));
    await click(document.querySelector('[data-word-operation="add"]'));
    await type(answer(), '423');
    await click(button('Check response'));
    expect(view.d().wordSolvedCases.w1).toBe(true);
    expect(view.awards).toEqual([]);
    expect(document.body.textContent).toContain('earns no points');
  });

  it('no tab offers "Show the answer" after a single try', async () => {
    const P = pure();
    const states = [
      { tab: 'practice', operation: 'subtract', level: 1, practiceProblemId: 's1', practiceIndex: 0, practiceSource: 'set', estimateLocked: true, estimateStatus: 'ok', estimateInput: '40', answerInput: '55', feedback: 'try', practiceTry: 1, practiceErrorKind: 'smaller_from_larger' },
      { tab: 'errors', errorIndex: 0, errorTriesFor: 'e1', errorTries: 1, errorWrong: ['place'], errorFeedback: 'try', errorChoice: 'place' },
      { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 1, efFor: 'ef-g4-1', efTry: 1, efFeedback: 'try', efChoice: P.genMentalItem('ef', 'g4', 1).order.find((x) => x !== P.genMentalItem('ef', 'g4', 1).key) },
      { tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0, ntFor: 'nt-g4-0', ntPick: 'compensation', ntAnswer: '1', ntTry: 1, ntFeedback: 'try' },
      { tab: 'decimals', genBand: 'g5', decMode: 'addsub', decIndex: 0, decFor: 'dc-addsub-g5-0', decAnswer: '1', decTry: 1, decFeedback: 'try' },
      { tab: 'apply', wordProblemId: 'w1', wordOperation: 'add', wordAnswer: '1', wordFeedback: 'try', wordTry: 1, wordTryFor: 'w1' },
    ];
    loadTool(FILE, ID);
    for (const s of states) {
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: s });
      expect(maybeButton('Show the answer'), s.tab).toBeNull();
      document.body.innerHTML = renderTool(ID, { _arithmeticStudio: Object.assign({}, s, { practiceTry: 2, errorTries: 2, errorWrong: ['place', 'operation'], efTry: 2, ntTry: 2, decTry: 2, wordTry: 2 }) });
      expect(maybeButton('Show the answer'), s.tab + ' after two').toBeTruthy();
    }
  });
});

describe('speech the tool started stops when the tool unmounts', () => {
  let speak, cancel;
  beforeEach(() => {
    speak = vi.fn((u) => { speak.last = u; });
    cancel = vi.fn();
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.speechSynthesis = { speak, cancel };
  });
  afterEach(() => { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; });

  it('cancels its own utterance on unmount, and not on a re-render', async () => {
    const view = await mount({ _arithmeticStudio: { tab: 'learn' } });
    await click(button('Read the steps aloud'));
    expect(speak).toHaveBeenCalledTimes(1);
    const before = cancel.mock.calls.length;
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, showModel: false } })));
    expect(cancel.mock.calls.length).toBe(before);
    await unmount();
    expect(cancel.mock.calls.length).toBe(before + 1);
  });

  it('leaves other speech alone when it has nothing playing', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn' } });
    await click(button('Read the steps aloud'));
    speak.last.onend();
    const before = cancel.mock.calls.length;
    await unmount();
    expect(cancel.mock.calls.length).toBe(before);
    await mount({ _arithmeticStudio: { tab: 'learn' } });
    await unmount();
    expect(cancel.mock.calls.length).toBe(before);
  });

  it('stops when the page is hidden', async () => {
    await mount({ _arithmeticStudio: { tab: 'learn' } });
    await click(button('Read the steps aloud'));
    const before = cancel.mock.calls.length;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try { document.dispatchEvent(new Event('visibilitychange')); } finally { delete document.visibilityState; }
    expect(cancel.mock.calls.length).toBe(before + 1);
  });
});

describe('"Start here" learning path for each grade band', () => {
  it('orders the band\'s core activities', () => {
    const P = pure();
    const ids = (band) => P.pathProgress(band, {}).steps.map((s) => s.skill || s.focus || s.mode || s.kind);
    expect(ids('k2')).toEqual(['makeTen', 'add20', 'sub20', 'add100', 'sub100']);
    expect(ids('g3')).toEqual(['add1000', 'sub1000', 'mul100', 'mulTens', 'div100']);
    expect(ids('g4')).toEqual(['addMulti', 'subMulti', 'mulMx1', 'mul2x2', 'divRem', 'bars']);
    expect(ids('g5')).toEqual(['addsub', 'mulwhole', 'divLong', 'divDec']);
    for (const band of P.bands) {
      const n = P.pathProgress(band, {}).steps.length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      for (const s of P.pathProgress(band, {}).steps.filter((x) => x.skill)) expect(P.skillsFor(band, P.skills[s.skill].op), s.skill).toContain(s.skill);
    }
  });

  it('ticks come only from saved progress, without revealed or junk entries', () => {
    const P = pure();
    const data = {
      genSolved: { 'add20-1': true, 'add20-2': true, 'add20-3': true, 'add20-4': 5, 'sub20-1': true, 'sub20-2': true, 'nope-1': true },
      practiceRevealedIds: { 'sub20-2': true },
      ntSolved: { 'nt-k2-0': true, 'nt-k2-1': true, 'nt-k2-5': true, 'nt-g4-0': true },
      ntRevealed: { 'nt-k2-5': true },
    };
    const k2 = P.pathProgress('k2', data);
    const by = Object.fromEntries(k2.steps.map((s) => [s.id, s]));
    expect(by.k2_add20).toMatchObject({ count: 3, done: true });
    expect(by.k2_sub20).toMatchObject({ count: 1, done: false });
    // Only make-ten number talks in this band count (index 0, 5, 10, … in K-2).
    expect(P.mentalKeyFor('nt', 'k2', 0)).toBe('makeTen');
    expect(P.genMentalItem('nt', 'k2', 5).key).toBe('makeTen');
    expect(P.genMentalItem('nt', 'k2', 1).key).not.toBe('makeTen');
    expect(by.k2_make_ten.count).toBe(1);
    expect(k2.next).toBe('k2_make_ten');
    const g5 = P.pathProgress('g5', { decSolved: { 'dc-addsub-g5-0': true, 'dc-addsub-g5-1': true, 'dc-addsub-g4-2': true, 'dc-mulwhole-g5-0': true }, decRevealed: { 'dc-addsub-g5-1': true } });
    expect(g5.steps.map((s) => s.count)).toEqual([1, 1, 0, 0]);
    const off = P.pathProgress('g5', {}, ['add', 'subtract']);
    expect(off.steps.map((s) => s.available)).toEqual([true, false, false, false]);
  });

  it('a K–2 student starts, solves three and sees the tick move on', async () => {
    const P = pure();
    const view = await mount({ _arithmeticStudio: {} }, { gradeBand: 'k2', gradeLevel: '1st Grade' });
    // 2026-11-04 engagement build: the path opens compact (one "Next" card); the full list is one click away.
    await click(button('Show all steps'));
    const path = document.querySelector('[data-arithmetic-path]');
    expect(path.getAttribute('data-arithmetic-path')).toBe('k2');
    expect([...path.querySelectorAll('[data-path-step]')].map((li) => li.getAttribute('data-path-step'))).toEqual(['k2_make_ten', 'k2_add20', 'k2_sub20', 'k2_add100', 'k2_sub100']);
    expect(path.querySelector('[data-path-step="k2_make_ten"]').getAttribute('data-path-state')).toBe('next');
    await click(path.querySelector('[data-path-go="k2_add20"]'));
    expect(view.d()).toMatchObject({ tab: 'practice', genSkill: 'add20', practiceSource: 'generated', operation: 'add' });
    for (let i = 0; i < 3; i++) {
      const id = document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id');
      expect(id).toMatch(/^add20-/);
      const p = P.generateProblem('add20', Number(id.split('-')[1]));
      await type(numberInputs()[0], String(p.answer));
      await click(button('Check answer'));
      await click(button('Next problem'));
    }
    const step = document.querySelector('[data-path-step="k2_add20"]');
    expect(step.getAttribute('data-path-state')).toBe('done');
    expect(step.textContent).toContain('Done.');
    expect(document.querySelector('[data-path-done]').textContent).toBe('1 of 5 done');
    // Make a ten opens number talks focused on make-ten problems.
    await click(document.querySelector('[data-path-go="k2_make_ten"]'));
    expect(view.d()).toMatchObject({ tab: 'mental', mmMode: 'talk', ntFocus: 'makeTen' });
    const firstTalk = document.querySelector('[data-number-talk]').getAttribute('data-number-talk');
    expect(P.genMentalItem('nt', 'k2', Number(firstTalk.split('-')[2])).key).toBe('makeTen');
    await click(button('Next problem'));
    const nextTalk = document.querySelector('[data-number-talk]').getAttribute('data-number-talk');
    expect(nextTalk).not.toBe(firstTalk);
    expect(P.genMentalItem('nt', 'k2', Number(nextTalk.split('-')[2])).key).toBe('makeTen');
  });

  it('grade 5 starts with decimals, and the tab order follows the band', async () => {
    loadTool(FILE, ID);
    const order = (overrides) => { document.body.innerHTML = renderTool(ID, { _arithmeticStudio: {} }, overrides); return [...document.querySelectorAll('[role="tab"]')].map((b) => b.id.replace('arithmetic-studio-tab-', '')); };
    expect(order({ gradeBand: 'k2', gradeLevel: '2nd Grade' })).toEqual(['learn', 'practice', 'mental', 'bars', 'errors', 'apply', 'decimals']);
    expect(order({ gradeBand: 'g35', gradeLevel: '4th Grade' })).toEqual(['learn', 'practice', 'bars', 'errors', 'mental', 'apply', 'decimals']);
    expect(order({ gradeLevel: '5th Grade' })[1]).toBe('decimals');
    document.body.innerHTML = '<div id="root"></div>';
    const view = await mount({ _arithmeticStudio: {} }, { gradeLevel: '5th Grade' });
    await click(document.querySelector('[data-path-go="g5_dec_addsub"]'));
    expect(view.d()).toMatchObject({ tab: 'decimals', decMode: 'addsub' });
    // Arrow keys follow the order on screen.
    const tabs = () => [...document.querySelectorAll('[role="tab"]')];
    await React.act(async () => { tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(view.d().tab).toBe('practice');
  });

  it('respects teacher operation and decimal locks, and a hide toggle', async () => {
    loadTool(FILE, ID);
    // 2026-11-04: the full list is shown when pathHidden is false (compact is the default).
    document.body.innerHTML = renderTool(ID, { _arithmeticStudio: { pathHidden: false, teacher: { ops: ['add', 'subtract'], decMode: 'addsub' } } });
    const states = [...document.querySelectorAll('[data-path-step]')].map((li) => li.getAttribute('data-path-state'));
    expect(states).toEqual(['next', 'off', 'off', 'off']);
    expect(document.querySelector('[data-path-go="g5_dec_mul"]')).toBeNull();
    document.body.innerHTML = '<div id="root"></div>';
    const view = await mount({ _arithmeticStudio: {} });
    await click(button('Show all steps'));
    expect(view.d().pathHidden).toBe(false);
    await click(button('Hide the steps'));
    expect(document.querySelector('[data-path-step]')).toBeNull();
    expect(view.d().pathHidden).toBe(true);
  });
});

describe('quest labels follow the language of the last render', () => {
  it('reads the translator at the time the host asks', () => {
    const tool = loadTool(FILE, ID);
    renderTool(ID, { _arithmeticStudio: {} }, { t: (k, f) => (k.indexOf('stem.arithmetic.quest_') === 0 ? '«' + f + '»' : f) });
    expect(tool.questHooks.map((q) => q.id)).toEqual(['practice_5', 'all_operations', 'error_detective']);
    expect(tool.questHooks[0].label).toBe('«Solve 5 arithmetic challenges»');
    expect(tool.questHooks[2].progress({ errorSolvedCases: { e1: true } })).toBe('«1/3 mistakes»');
    renderTool(ID, { _arithmeticStudio: {} });
    expect(tool.questHooks[1].label).toBe('Successfully use all four operations');
  });
});

describe('progress maps are saved as id -> true (the autosave "flags" shape)', () => {
  it('every whitelisted map holds only true values after real use', async () => {
    const P = pure();
    const view = await mount({ _arithmeticStudio: { tab: 'errors', errorIndex: 0, ntSolved: { junk: 5, 'nt-g4-9': 'yes' }, decSolved: [1, 2] } });
    await click(document.querySelector('[data-error-choice="regroup"]'));
    // Number talk solve, then a reveal on another item.
    const nt0 = P.genMentalItem('nt', 'g4', 0), nt1 = P.genMentalItem('nt', 'g4', 1);
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0 } })));
    await click(document.querySelector('[data-nt-pick="breakApart"]'));
    await type(numberInputs()[0], String(nt0.answer));
    await click(button('Check answer'));
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, ntIndex: 1, ntFor: null } })));
    await click(document.querySelector('[data-nt-pick]'));
    for (const g of [nt1.answer + 1, nt1.answer + 2]) { await type(numberInputs()[0], String(g)); await click(button('Check answer')); }
    await click(button('Show the answer'));
    // Efficient: solve one, eliminate another.
    const ef0 = P.genMentalItem('ef', 'g4', 0), ef1 = P.genMentalItem('ef', 'g4', 1);
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, mmMode: 'efficient', efIndex: 0 } })));
    await click(document.querySelector(`[data-ef-choice="${ef0.key}"]`));
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, efIndex: 1, efFor: null } })));
    for (const id of ef1.order.filter((x) => x !== ef1.key)) await click(document.querySelector(`[data-ef-choice="${id}"]`));
    await click(button('Show the answer'));
    // Decimals: solve one, reveal another.
    const dec0 = P.genDecimalItem('mulwhole', 'g5', 0);
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, tab: 'decimals', genBand: 'g5', decMode: 'mulwhole', decIndex: 0 } })));
    await type(numberInputs()[0], String(dec0.answer));
    await click(button('Check answer'));
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, decIndex: 1, decFor: null } })));
    for (const g of ['0.01', '0.02']) { await type(numberInputs()[0], g); await click(button('Check answer')); }
    await click(button('Show the answer'));
    // Bars: show the model after two tries, then solve.
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, tab: 'bars', genBand: 'g4', barIndex: 1, barFor: null } })));
    const bar = P.genBarProblem('g4', 1);
    const wrongModel = ['partWhole', 'compare', 'equalGroups'].find((m) => m !== bar.steps[0].model);
    for (let i = 0; i < 2; i++) {
      await click(document.querySelector(`[data-bar-model="${wrongModel}"]`));
      for (const sel of document.querySelectorAll('[data-bar-slot]')) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        await React.act(async () => { setter.call(sel, sel.options[1].value); sel.dispatchEvent(new Event('change', { bubbles: true })); });
      }
      await click(button('Check my model'));
    }
    await click(button('Show the model'));
    await click(document.querySelector(`[data-bar-op="${bar.steps[0].op}"]`));
    await type(document.querySelector('[data-bar-problem] input[type="number"]'), String(bar.steps[0].answer));
    await click(button('Check answer'));
    // Practice set and generated practice.
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, tab: 'practice', operation: 'multiply', level: 1, practiceSource: 'set' } })));
    const setId = document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id');
    const setP = P.practice.find((p) => p.id === setId);
    if (P.problemNeedsEstimate(setP)) { await type(numberInputs()[0], String(setP.answer)); await click(document.querySelector('[data-lock-estimate]')); }
    await type(numberInputs().at(P.problemNeedsEstimate(setP) ? 1 : 0), String(setP.answer));
    await click(button('Check answer'));
    await React.act(async () => view.set((s) => ({ ...s, _arithmeticStudio: { ...s._arithmeticStudio, practiceSource: 'generated', genBand: 'k2', genSkill: 'mulGroups', genSeed: 1, practiceProblemId: null } })));
    const gp = P.generateProblem('mulGroups', 1);
    await type(numberInputs()[0], String(gp.answer));
    await click(button('Check answer'));

    const d = view.d();
    const keys = ['practiceSolved', 'genSolved', 'errorSolvedCases', 'ntSolved', 'ntRevealed', 'efSolved', 'efRevealed', 'barSolved', 'barRevealed', 'decSolved', 'decRevealed'];
    for (const k of keys) {
      expect(Object.keys(d[k] || {}).length, k + ' written').toBeGreaterThan(0);
      expect(allTrue(d[k]), k + ' is id -> true').toBe(true);
    }
    expect(d.ntSolved).not.toHaveProperty('junk');
    expect(d.ntSolved[nt0.id]).toBe(true);
    expect(d.ntRevealed[nt1.id]).toBe(true);
    expect(d.efSolved[ef0.id]).toBe(true);
    expect(d.efRevealed[ef1.id]).toBe(true);
    expect(d.decSolved[dec0.id]).toBe(true);
    expect(d.barSolved[bar.id]).toBe(true);
    expect(d.barRevealed[bar.id]).toBe(true);
    expect(d.genSolved['mulGroups-1']).toBe(true);
    expect(d.practiceSolved[setId]).toBe(true);
    expect(d.errorSolvedCases.e1).toBe(true);
  });
});

describe('mounts every tab with the path in every theme with no console errors', () => {
  it('renders without errors, NaN or undefined', async () => {
    const errors = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => errors.push(args.join(' ')));
    try {
      for (const tab of ['learn', 'practice', 'errors', 'apply', 'mental', 'bars', 'decimals']) {
        for (const overrides of [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }, { gradeBand: 'k2', gradeLevel: 'Kindergarten' }]) {
          await mount({ _arithmeticStudio: { tab, pathHidden: false, errorFeedback: 'eliminated', errorTriesFor: 'e1', efFeedback: 'eliminated', wordFeedback: 'revealed' } }, overrides);
          expect(document.querySelector('[data-arithmetic-path]'), tab).toBeTruthy();
          expect(document.body.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
          await unmount();
        }
      }
    } finally { spy.mockRestore(); warn.mockRestore(); }
    expect(errors).toEqual([]);
  });
});
