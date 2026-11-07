// Independent hunt of the Arithmetic engagement build (2026-11-04).
// ARITH_HUNT_FILE points the suite at the start copy to prove each gate fails there.
// "(guard)" tests pass on both copies: they pin behaviour the hunt checked and found right.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.ARITH_HUNT_FILE || 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';
let root = null;

beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; });

function pure() { loadTool(FILE, ID); return window.ArithmeticStrategyPure; }

async function mount(initial, overrides) {
  const tool = loadTool(FILE, ID);
  const view = { awards: [], announcements: [] };
  function App() {
    const [state, setState] = React.useState({ _arithmeticStudio: initial });
    view.state = state;
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
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(el) { await React.act(async () => { el.click(); }); }
const wait = (ms) => React.act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const findButton = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
const K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' };
const talkK2 = (extra) => Object.assign({ tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0 }, extra || {});
const answerBox = () => document.querySelector('[data-nt-answer]');
const practiceInputs = () => [...document.querySelectorAll('input[type="number"]')];

// Set practice item a1 is 27 + 35; 52 is a named miss.
async function missSetA1() {
  const view = await mount({ tab: 'practice', practiceSource: 'set', operation: 'add', level: 1 });
  await type(practiceInputs()[0], '60');
  await click(document.querySelector('[data-lock-estimate]'));
  await type(practiceInputs()[1], '52');
  await click(findButton('Check answer'));
  return view;
}

// A generated + problem with no trade, plus a wrong answer the tool names.
function noTradeProblem(P) {
  for (let seed = 1; seed < 400; seed++) {
    const p = P.generateProblem('add100', seed);
    if (P.placeValueStages('add', p.a, p.b).stages.length !== 1) continue;
    const wrong = [p.answer + 10, p.answer - 10].find((g) => { const k = P.diagnoseAnswer('add', p.a, p.b, g); return k && k !== 'unknown'; });
    if (wrong != null) return { seed, p, wrong };
  }
  throw new Error('no no-trade problem');
}

describe('See it with disks', () => {
  it('is not offered when there is nothing to trade: the first screen would spell the answer for no work', async () => {
    const P = pure();
    const { seed, p, wrong } = noTradeProblem(P);
    await mount({ tab: 'practice', practiceSource: 'generated', genBand: 'k2', operation: 'add', genSkill: 'add100', genSeed: seed, practiceProblemId: p.id, answerInput: String(wrong), estimateInput: String(p.answer), estimateLocked: true, estimateStatus: 'ok' }, K2);
    expect(document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id')).toBe(p.id);
    await click(findButton('Check answer'));
    expect(document.querySelector('[data-named-error]').getAttribute('data-named-error')).not.toBe('unknown');
    expect(document.querySelector('[data-see-disks]')).toBeNull();
  });

  it('a hostile saved state cannot open the disks on a no-trade problem', async () => {
    const P = pure();
    const { seed, p } = noTradeProblem(P);
    await mount({ tab: 'practice', practiceSource: 'generated', genBand: 'k2', operation: 'add', genSkill: 'add100', genSeed: seed, practiceProblemId: p.id, practiceDisksFor: p.id }, K2);
    expect(document.querySelector('[data-practice-problem-id]').getAttribute('data-practice-problem-id')).toBe(p.id);
    expect(document.querySelector('[data-place-value-model="practice"]')).toBeNull();
  });

  it('with a trade it is still offered, and Hide keeps the button and focus after the answer was retyped', async () => {
    await missSetA1();
    await click(document.querySelector('[data-see-disks]'));
    await type(practiceInputs()[1], '53');
    const see = document.querySelector('[data-see-disks]');
    see.focus();
    await click(see);
    expect(document.querySelector('[data-place-value-model="practice"]')).toBeNull();
    const after = document.querySelector('[data-see-disks]');
    expect(after).toBe(see);
    expect(document.activeElement).toBe(see);
    expect(after.textContent).toBe('See it with disks');
  });

  it('Hide keeps the button after a second miss the tool cannot name', async () => {
    await missSetA1();
    await click(document.querySelector('[data-see-disks]'));
    await type(practiceInputs()[1], '4');
    await click(findButton('Check answer'));
    const see = document.querySelector('[data-see-disks]');
    await click(see);
    expect(document.querySelector('[data-see-disks]')).toBe(see);
  });

  it('the hidden total is not in data-model-total, and it opens with the solve', async () => {
    await missSetA1();
    await click(document.querySelector('[data-see-disks]'));
    const total = () => document.querySelector('[data-place-value-model="practice"] [data-model-total]');
    expect(total().getAttribute('data-model-total')).toBe('?');
    await click(document.querySelector('[data-walk-next]'));
    expect(total().getAttribute('data-model-total')).toBe('?');
    await type(practiceInputs()[1], '62');
    await click(findButton('Check answer'));
    expect(total().getAttribute('data-model-total')).toBe('62');
  });

  it('(guard) XP stays once per problem after disks, a solve, and coming back', async () => {
    const view = await missSetA1();
    await click(document.querySelector('[data-see-disks]'));
    await click(document.querySelector('[data-walk-next]'));
    expect(view.awards).toEqual([]);
    await type(practiceInputs()[1], '62');
    await click(findButton('Check answer'));
    expect(view.awards).toEqual([[ID, 4, expect.any(String)]]);
    await click(findButton('Next problem'));
    expect(view.d().practiceProblemId).not.toBe('a1');
    for (let i = 0; i < 6 && view.d().practiceProblemId !== 'a1'; i++) await click(findButton('Next problem'));
    expect(view.d().practiceProblemId).toBe('a1');
    expect(practiceInputs()[1].disabled).toBe(true);
    expect(findButton('Solved').disabled).toBe(true);
    expect(view.awards).toHaveLength(1);
  });

  it('(guard) never opens on multiply or divide', async () => {
    for (const [operation, prefix] of [['multiply', 'm'], ['divide', 'd']]) {
      const P = pure();
      const item = P.practice.find((p) => p.op === operation);
      const view = await mount({ tab: 'practice', practiceSource: 'set', operation, level: item.level, practiceProblemId: item.id, practiceDisksFor: item.id, answerInput: '1', estimateInput: '1', estimateLocked: true, estimateStatus: 'shown', remainderInput: '0', feedback: 'try', practiceTry: 1, practiceErrorKind: 'count_slip' });
      expect(view.d().tab).toBe('practice');
      expect(document.querySelector('[data-see-disks]'), prefix).toBeNull();
      expect(document.querySelector('[data-place-value-model]'), prefix).toBeNull();
      await React.act(async () => root.unmount());
      root = null;
      resetStemLab();
      document.body.innerHTML = '<div id="root"></div>';
    }
  });
});

describe('Learn: the total before the prediction', () => {
  it('data-model-total holds "?" until the prediction is right', async () => {
    await mount({ tab: 'learn', operation: 'add', a: 58, b: 27 });
    const el = () => document.querySelector('[data-model-total]');
    expect(el().getAttribute('data-model-total')).toBe('?');
    await type(document.querySelector('[data-learn-predict] input'), '85');
    await click(findButton('Check my prediction'));
    expect(el().getAttribute('data-model-total')).toBe('85');
  });

  it('(guard) an intermediate value of a subtraction walk stays in data-model-total', async () => {
    await mount({ tab: 'learn', operation: 'subtract', a: 102, b: 38, exchangeSignature: 'subtract:102:38', exchangeStep: 3 });
    expect(document.querySelector('[data-model-total]').getAttribute('data-model-total')).toBe('94');
  });

  it('the bridge does not state a one-step quotient and remainder before the prediction', async () => {
    await mount({ tab: 'learn', operation: 'divide', a: 17, b: 5 });
    const bridge = () => document.querySelector('[data-algorithm-bridge]').textContent;
    expect(bridge()).toContain('How many times does 5 fit');
    expect(bridge()).not.toContain('3 × 5');
    expect(bridge()).not.toContain('17 − 15');
    await type(document.querySelector('[data-learn-predict] input'), '3');
    await type(document.querySelectorAll('[data-learn-predict] input')[1], '2');
    await click(findButton('Check my prediction'));
    expect(bridge()).toContain('3 × 5 = 15');
  });
});

describe('K-2 number talk', () => {
  it('a strategy picked after a miss keeps the group usable, the focus, the feedback and Show the answer', async () => {
    const view = await mount(talkK2(), K2);
    await type(answerBox(), '99');
    await click(findButton('Check answer'));
    await type(answerBox(), '98');
    await click(findButton('Check answer'));
    expect(findButton('Show the answer')).toBeTruthy();
    const pick = document.querySelector('[data-nt-pick="makeTen"]');
    pick.focus();
    await click(pick);
    expect(view.d().ntPick).toBe('makeTen');
    expect(pick.disabled).toBe(false);
    expect(document.activeElement).toBe(pick);
    expect(document.querySelector('[data-named-error]')).toBeTruthy();
    expect(findButton('Show the answer')).toBeTruthy();
  });

  it('(guard) grade 4 keeps its lock after a try', async () => {
    const P = pure();
    const item = P.genMentalItem('nt', 'g4', 0);
    await mount({ tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0, ntFor: item.id, ntPick: 'own', ntTry: 1, ntFeedback: 'try', ntAnswer: '1' });
    expect(document.querySelector('[data-nt-pick="own"]').disabled).toBe(true);
  });

  it('(guard) the optional strategy does not change credit: same XP with a pick, without one, and with the frame', async () => {
    const P = pure();
    const answer = P.genMentalItem('nt', 'k2', 0).answer;
    for (const how of ['skip', 'pick', 'frame']) {
      const view = await mount(talkK2(), K2);
      if (how === 'pick') await click(document.querySelector('[data-nt-pick="breakApart"]'));
      if (how === 'frame') await click(document.querySelector('[data-ten-frame-counter][tabindex="0"]'));
      await type(answerBox(), String(answer));
      await click(findButton('Check answer'));
      expect(view.awards, how).toEqual([[ID, 2, expect.any(String)]]);
      await React.act(async () => root.unmount());
      root = null;
      resetStemLab();
      document.body.innerHTML = '<div id="root"></div>';
    }
  });

  it('a held Enter is one try, not many', async () => {
    const view = await mount(talkK2(), K2);
    await type(answerBox(), '99');
    const key = (repeat) => React.act(async () => { answerBox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat })); });
    await key(false);
    expect(view.d().ntTry).toBe(1);
    await key(true);
    await key(true);
    expect(view.d().ntTry).toBe(1);
    expect(findButton('Show the answer')).toBeUndefined();
  });

  it('focus goes to Next problem when a solve disables the answer box and the Check button', async () => {
    const P = pure();
    await mount(talkK2(), K2);
    const box = answerBox();
    await type(box, String(P.genMentalItem('nt', 'k2', 0).answer));
    box.focus();
    await React.act(async () => { box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(box.disabled).toBe(true);
    await wait(70);
    expect(document.activeElement).toBe(findButton('Next problem'));
  });

  it('focus goes to Next problem after Show the answer removes the button', async () => {
    await mount(talkK2({ ntFor: 'nt-k2-0', ntAnswer: '99', ntTry: 2, ntFeedback: 'try' }), K2);
    const show = findButton('Show the answer');
    show.focus();
    await click(show);
    document.body.focus();
    await wait(70);
    expect(document.activeElement).toBe(findButton('Next problem'));
  });

  it('Practice: focus goes to Next problem after a solve', async () => {
    await missSetA1();
    await type(practiceInputs()[1], '62');
    const check = findButton('Check answer');
    check.focus();
    await click(check);
    await wait(70);
    expect(document.activeElement).toBe(findButton('Next problem'));
  });

  it('a solved problem restored from progress does not tell the student to move counters', async () => {
    await mount(talkK2({ ntSolved: { 'nt-k2-0': true } }), K2);
    const frame = document.querySelector('[data-ten-frame]');
    expect(frame).toBeTruthy();
    expect(frame.querySelectorAll('[data-ten-frame-counter]')).toHaveLength(0);
    expect(frame.textContent).not.toContain('Move counters');
  });

  it('a shown answer does not say "type your answer"', async () => {
    await mount(talkK2({ ntFor: 'nt-k2-0', ntFeedback: 'revealed', ntTry: 2, ntRevealed: { 'nt-k2-0': true }, tfFor: 'nt-k2-0', tfMoved: 9 }), K2);
    expect(document.querySelector('[data-ten-frame]').textContent).not.toContain('type your answer');
  });

  it('skipping the strategy: the feedback does not talk about "your strategy"', async () => {
    const view = await mount(talkK2(), K2);
    await type(answerBox(), '99');
    await click(findButton('Check answer'));
    const panel = document.querySelector('[data-number-talk]').textContent;
    expect(panel).not.toContain('same strategy');
    expect(panel).toContain('Try again, one step at a time.');
    const P = pure();
    await type(answerBox(), String(P.genMentalItem('nt', 'k2', 0).answer));
    await click(findButton('Check answer'));
    expect(view.announcements.join(' | ')).not.toContain('Your strategy is now shown');
    expect(view.announcements.join(' | ')).toContain('A strategy for these numbers is now shown as a model.');
  });

  it('(guard) the same text stays for a student who did use the frame or a strategy', async () => {
    const view = await mount(talkK2(), K2);
    await click(document.querySelector('[data-ten-frame-counter][tabindex="0"]'));
    await type(answerBox(), '99');
    await click(findButton('Check answer'));
    expect(document.querySelector('[data-number-talk]').textContent).toContain('same strategy');
    const P = pure();
    await type(answerBox(), String(P.genMentalItem('nt', 'k2', 0).answer));
    await click(findButton('Check answer'));
    expect(view.announcements.join(' | ')).toContain('Your strategy is now shown as a model.');
  });

  it('(guard) the ten-frame numbers: y up to 9, x of 10 or more, x = 0, and rest never 0', () => {
    const P = pure();
    let framed = 0;
    for (let a = 0; a <= 130; a++) {
      for (let b = 0; b <= 130; b++) {
        const f = P.mentalFit('makeTen', 'add', a, b);
        if (!f.applies || f.vals.y > 9) continue;
        framed++;
        const v = f.vals;
        expect(v.x % 10 + v.gap).toBe(10);
        expect(v.gap + v.rest).toBe(v.y);
        expect(v.ten + v.rest).toBe(a + b);
        expect(v.rest, `${a}+${b}`).toBeGreaterThan(0);
        expect(v.x).toBeGreaterThan(0);
      }
    }
    expect(framed).toBeGreaterThan(100);
  });

  it('(guard) a tens-and-ones frame: 2-digit x, moving every counter stops at a full frame, the sentence never states the total', async () => {
    const P = pure();
    let index = -1;
    for (let i = 0; i < 400 && index < 0; i++) {
      const it = P.genMentalItem('nt', 'k2', i);
      if (it.op !== 'add' || it.key !== 'makeTen') continue;
      const f = P.mentalFit('makeTen', 'add', it.a, it.b);
      if (f.applies && f.vals.y <= 9 && f.vals.x >= 10) index = i;
    }
    expect(index).toBeGreaterThanOrEqual(0);
    const item = P.genMentalItem('nt', 'k2', index);
    const v = P.mentalFit('makeTen', 'add', item.a, item.b).vals;
    const view = await mount(talkK2({ ntIndex: index }), K2);
    const frame = () => document.querySelector('[data-ten-frame]');
    expect(frame().querySelector('[data-ten-frame-tens]').getAttribute('data-ten-frame-tens')).toBe(String(Math.floor(v.x / 10)));
    for (let i = 0; i < v.gap; i++) await click(frame().querySelector('[data-ten-frame-counter][tabindex="0"]'));
    expect(frame().querySelectorAll('[data-ten-frame-counter]')).toHaveLength(0);
    expect(frame().querySelectorAll('[data-ten-frame-left]')).toHaveLength(v.rest);
    expect(view.d().tfMoved).toBe(v.gap);
    const said = frame().querySelector('[data-ten-frame-status]').textContent;
    expect(said).toContain(`${v.x} + ${v.gap} = ${v.ten}`);
    expect(new RegExp('(^|[^0-9])' + item.answer + '([^0-9]|$)').test(said)).toBe(false);
  });
});
