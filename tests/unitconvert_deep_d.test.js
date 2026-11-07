// Unit Converter stage D (2026-11-04): an independent tester's bug hunt.
// Each block is a defect reproduced on the stage-C file and fixed:
//  * German/Spanish/Italian ... students could not type back a number the
//    tool shows ("1.500" read as 1.5 and was named a prefix slip);
//  * partial worked examples, the elapsed-time number line and one hint
//    showed the answer before any attempt;
//  * "write as an ordinary number" accepted the question retyped;
//  * the full worked example could be the student's own problem;
//  * a problem whose answer was shown paid full XP when drawn again;
//  * an estimate explanation called a rounded value "exactly";
//  * focus fell to the page body after predicting or answering.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the stage-C
// file) to confirm each gate fails on the old behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.UNITCONVERT_DEEP_SRC || 'stem_lab/stem_tool_unitconvert.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let C;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  loadTool(FILE, 'unitConvert');
  C = window.__UnitConvertCore;
  C.setNumberLocale('en');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  if (C && C.setNumberLocale) C.setNumberLocale('en');
  vi.restoreAllMocks();
});

async function mount(seed, overrides = {}) {
  const out = { latest: null, xp: [], said: [] };
  const extra = Object.assign({
    awardXP: (id, pts, reason) => out.xp.push({ id, pts, reason }),
    announceToSR: (m) => out.said.push(m),
    addToast: () => {}
  }, overrides);
  function App() {
    const [state, setState] = React.useState(seed);
    out.latest = state.unitConvert || {};
    out.set = setState;
    return window.StemLab._registry.unitConvert.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, extra)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(() => el.click()); }
async function typeInto(input, value) {
  expect(input, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function enter(input) { await React.act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }); }
const tick = () => React.act(() => new Promise((r) => setTimeout(r, 5)));
function extra(family, band, mode, pred, limit = 60000) {
  for (let s = 1; s < limit; s++) { const x = C.makeExtraItem(family, band, s, mode); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}
function practice(band, kind, pred = () => true) {
  for (let s = 1; s < 20000; s++) { const x = C.makePracticeItem(band, s, kind); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}
const cardText = () => $('[data-practice-slot]').textContent;

describe('decimal-comma locales read back the numbers the tool shows', () => {
  it('German: "1.500" is 1500 and "12.345" is 12345, as displayed', () => {
    C.setNumberLocale('German');
    for (const v of [1234, 1500, 12345, 999000, 1234567]) {
      const shown = C.formatUnitNumber(v, 'auto');
      expect(C.parseNumericDraft(shown).value, shown).toBe(v);
    }
    expect(C.parseNumericDraft('1.500')).toMatchObject({ valid: true, value: 1500 });
    // Not a group: a leading zero, one or two decimals, or a mantissa.
    expect(C.parseNumericDraft('0.125').value).toBe(0.125);
    expect(C.parseNumericDraft('2.5').value).toBe(2.5);
    expect(C.parseNumericDraft('2.54').value).toBe(2.54);
    expect(C.parseNumericDraft('6.022 × 10^23').value).toBeCloseTo(6.022e23, -19);
    expect(C.parseNumericDraft('6.022e23').value).toBeCloseTo(6.022e23, -19);
    C.setNumberLocale('Spanish');
    expect(C.parseNumericDraft(C.formatUnitNumber(4000, 'auto')).value).toBe(4000);
    C.setNumberLocale('English');
    expect(C.parseNumericDraft('1.500').value).toBe(1.5);
  });
  it('Swiss German: the apostrophe group mark it shows is read back', () => {
    C.setNumberLocale('de-CH');
    const shown = C.formatUnitNumber(12345.5, 'auto');
    expect(C.parseNumericDraft(shown).value).toBe(12345.5);
  });
  it('a German student typing 4.000 for 4 kg = ? g is right, not "a prefix slip"', async () => {
    const item = practice('b45', 'bigToSmall', (x) => x.fromUnit === 'kg' && x.a === 4000);
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, item, { predict: item.direction }), fadeByKind: { bigToSmall: 2 } } }, { lang: 'German' });
    await typeInto($('#uc-practice-answer'), '4.000');
    await enter($('#uc-practice-answer'));
    expect(app.latest.quiz.lastMis).toBeUndefined();
    expect(app.latest.quiz.correct).toBe(true);
  });
  it('a German factor chain with 1.000 m / 1 km works', () => {
    C.setNumberLocale('German');
    expect(C.checkFactorChain('km', 'm', [{ topN: '1.000', topU: 'm', botN: '1', botU: 'km', pow: 1 }])).toMatchObject({ ok: true });
    // Machine numbers keep their value in any locale.
    expect(C.checkFactorChain('nmi/hr', 'km/hr', [{ topN: 1.852, topU: 'km', botN: 1, botU: 'nmi', pow: 1 }])).toMatchObject({ ok: true });
  });
  it('Ratios Lab handoff "1.125" (machine form) still converts 1.125 cups in German', async () => {
    await mount({ unitConvert: { tab: 'convert', category: 'volume', value: 1.125, valueDraft: '1.125', fromUnit: 'cup', toUnit: 'mL' } }, { lang: 'German' });
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 266,1618 mL');
    expect($('#unitconvert-value').value).toBe('1,125');
  });
  it('a revealed chain reads back as true equalities in German', async () => {
    const app = await mount({ unitConvert: { tab: 'chain', chain: { from: 'mph', to: 'm/s', steps: [{ topN: '1', topU: 'm', botN: '1', botU: 'mi', pow: 1 }], valueDraft: '1', tries: { 'chain|mph|m/s': 2 }, revealed: {} } } }, { lang: 'German' });
    await click($('[data-reveal-button]'));
    const steps = app.latest.chain.steps;
    expect(C.checkFactorChain('mph', 'm/s', steps)).toMatchObject({ ok: true });
    expect(steps.some((s) => /,/.test(s.topN + s.botN))).toBe(true);
  });
});

describe('no answer before the attempt', () => {
  it('the partial example for minutes to hours hides the quotient and remainder', async () => {
    const x = extra('everyday', 'b35', 'time', (i) => i.kind === 'minToHours' && i.a === 150);
    await mount({ unitConvert: { tab: 'everyday', dayItem: x, fadeByKind: { minToHours: 1 } } });
    const text = $('[data-worked-example="partial"]').textContent;
    expect(text).toContain('150 ÷ 60');
    expect(text).not.toContain('2 remainder 30');
  });
  it('the partial example for an end time hides the end time', async () => {
    const x = extra('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsedEnd' && i.jumps.length >= 2);
    const endClock = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, x.ah, x.am)));
    await mount({ unitConvert: { tab: 'everyday', dayItem: x, fadeByKind: { elapsedEnd: 1 } } });
    expect($('[data-worked-example="partial"]').textContent).not.toContain(endClock);
    expect(cardText()).not.toContain(endClock);
  });
  it('the number-line hint for an end time shows ? until the problem is answered', async () => {
    const x = extra('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsedEnd' && i.jumps.length >= 2);
    const endClock = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, x.ah, x.am)));
    const app = await mount({ unitConvert: { tab: 'everyday', dayItem: Object.assign({}, x, { hintLevel: 2 }), fadeByKind: { elapsedEnd: 2 } } });
    const line = $('[data-elapsed-number-line]');
    expect(line).toBeTruthy();
    expect(line.textContent).not.toContain(endClock);
    expect(line.querySelector('desc').textContent).not.toContain(endClock);
    await typeInto($('#uc-day-answer-h'), String(x.ah));
    await typeInto($('#uc-day-answer-m'), String(x.am));
    await enter($('#uc-day-answer-m'));
    expect(app.latest.dayItem.correct).toBe(true);
    expect($('[data-elapsed-number-line]').textContent).toContain(endClock);
  });
  it('the partial example for "write as an ordinary number" hides the ordinary number', async () => {
    const x = extra('chem', 'chem', 'sci', (i) => i.params.mode === 'fromSci' && i.a > 1000);
    const plain = x.a.toLocaleString('en-US');
    await mount({ unitConvert: { tab: 'chem', chemItem: x, fadeByKind: { sciNotation: 1 } } });
    expect($('[data-worked-example="partial"]').textContent).not.toContain(plain);
  });
  it('the last hint for "write in scientific notation" is not the answer itself', async () => {
    const x = extra('chem', 'chem', 'sci', (i) => i.params.mode === 'toSci');
    await mount({ unitConvert: { tab: 'chem', chemItem: Object.assign({}, x, { hintLevel: 3 }), fadeByKind: { sciNotation: 2 } } });
    expect(cardText()).not.toContain(C.sciText(x.a, x.sf));
  });
  it('the full worked example is never the student\'s own problem', async () => {
    // Olive-oil volumes come from 11 values; this seed drew the same one twice.
    const item = Object.assign(C.makeExtraItem('chem', 'chem', 576, null), { seed: 576 });
    expect(item.kind + '|' + item.params.mode).toBe('densityChain|LtoG');
    await mount({ unitConvert: { tab: 'chem', chemItem: item } });
    const full = $('[data-worked-example="full"]');
    const own = $('#uc-chem-q').textContent;
    expect(full, 'a worked example is still shown').toBeTruthy();
    expect(full.textContent).not.toContain(own);
  });
});

describe('scientific notation to an ordinary number', () => {
  it('retyping the question in scientific notation is named, not credited', () => {
    const x = extra('chem', 'chem', 'sci', (i) => i.params.mode === 'fromSci' && i.a === 72000);
    for (const typed of ['7.2e4', '7.2 × 10^4', '7.2x10^4']) {
      expect(C.diagnosePracticeItem(x, typed), typed).toMatchObject({ valid: true, correct: false, misconception: 'sciNotPlain' });
    }
    expect(C.diagnosePracticeItem(x, '72,000').correct).toBe(true);
    expect(C.diagnosePracticeItem(x, '72000').correct).toBe(true);
    expect(C.diagnosePracticeItem(x, '720000').misconception).toBe('sciExponentOff');
  });
});

describe('a shown answer earns nothing later', () => {
  async function answerWrongTwice(input) {
    for (const v of ['1', '2']) { await typeInto(input(), v); await enter(input()); }
  }
  it('practice: the same problem drawn again after "Show the answer" pays no XP', async () => {
    const item = practice('b45', 'bigToSmall', (x) => x.a > 20);
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, item, { predict: item.direction }), fadeByKind: { bigToSmall: 2 } } });
    await answerWrongTwice(() => $('#uc-practice-answer'));
    await click($('[data-reveal-button]'));
    expect(app.latest.quiz.revealed).toBe(true);
    await React.act(() => app.set((prev) => Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { quiz: Object.assign({}, item, { predict: item.direction }) }) })));
    await typeInto($('#uc-practice-answer'), String(item.a));
    await enter($('#uc-practice-answer'));
    expect(app.latest.quiz.correct).toBe(true);
    expect(app.xp).toEqual([]);
    // The marker never ticks a Start here step.
    expect(C.pathStepDone({ id: 'within', tab: 'quiz' }, { xpCredited: app.latest.xpCredited })).toBe(false);
  });
  it('estimate: a shown estimate drawn again pays no XP', async () => {
    let item = null;
    for (let s = 1; s < 5000 && !item; s++) { const x = C.makeEstimateItem('b45', s); if (x.type === 'convert') item = x; }
    const wrong = item.options.filter((o) => o !== item.correct);
    const fmt = (o) => C.formatUnitNumber(o, 'auto');
    const app = await mount({ unitConvert: { tab: 'estimate', estimate: { item, choice: null, wrong: [], done: false } } });
    const optionButton = (o) => $$('[aria-labelledby="uc-est-q"] button').find((b) => b.textContent.replace(/^[✓✗] /, '').startsWith(fmt(o) + ' '));
    await click(optionButton(wrong[0]));
    await click(optionButton(wrong[1]));
    await click($('[data-reveal-button]'));
    await React.act(() => app.set((prev) => Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { estimate: { item, choice: null, wrong: [], done: false } }) })));
    await click(optionButton(item.correct));
    expect(app.latest.estimate.right).toBe(true);
    expect(app.xp).toEqual([]);
  });
});

describe('estimate explanations', () => {
  it('a rounded value is "about", only an exact one is "exactly"', async () => {
    let item = null;
    for (let s = 1; s < 5000 && !item; s++) { const x = C.makeEstimateItem('b67', s); if (x.type === 'convert' && x.from === 'km' && x.to === 'mi') item = x; }
    await mount({ unitConvert: { tab: 'estimate', estimate: { item, choice: item.correct, right: true, wrong: [], done: true } } });
    const text = $('[aria-labelledby="uc-est-q"]').parentNode.textContent;
    expect(text).not.toMatch(/is exactly/);
    expect(text).toMatch(/is about/);
  });
});

describe('focus stays on the card', () => {
  it('after predicting, focus moves to the answer box; after a correct answer, to Next', async () => {
    const item = practice('b45', 'bigToSmall', (x) => x.a > 20);
    await mount({ unitConvert: { tab: 'quiz', quiz: item, fadeByKind: { bigToSmall: 2 } } });
    const predict = $('[data-practice-predict] button');
    predict.focus();
    await click(predict);
    await tick();
    expect(document.activeElement && document.activeElement.id).toBe('uc-practice-answer');
    await typeInto($('#uc-practice-answer'), String(item.a));
    await enter($('#uc-practice-answer'));
    await tick();
    expect(document.activeElement && document.activeElement.id).toBe('uc-practice-next');
    await click($('#uc-practice-next'));
    await tick();
    expect(document.activeElement && document.activeElement.id).toBe('uc-practice-predict-first');
  });
});

describe('one place is singular', () => {
  it('the ladder says "1 place", in the readout, the announcement and a worked step', async () => {
    const app = await mount({ unitConvert: { tab: 'ladder', ladder: { base: 'm', start: 'base', at: 'base', draft: '2.5' } } });
    await click($('[data-rung="deci"]'));
    const readout = $('[data-ladder-readout]').textContent;
    expect(readout).toContain('moved 1 place to the right');
    expect(readout).not.toContain('1 places');
    expect(app.said.join(' ')).toContain('moves 1 place to the right');
    const x = extra('ladder', 'b67', null, (i) => i.params.places === 1);
    await React.act(() => app.set((prev) => Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { ladderItem: Object.assign({}, x, { answered: true, correct: false, revealed: true }) }) })));
    const card = $('[data-practice-slot="ladder"]').textContent;
    expect(card).toMatch(/moves 1 place to the (right|left)/);
    expect(card).not.toContain('1 places');
  });
});

describe('damaged saves do not crash the tool', () => {
  it('null entries in history, pins, the mistake log and chain steps, and an estimate without choices', async () => {
    const bad = { history: [null, 5, { from: '1 m', to: '100 cm' }], pinnedConversions: [null, { key: 'length_m_cm', from: 'm', to: 'cm', category: 'length' }], missed: [null, 7, { q: 'x', a: 1, outcome: 'fixed' }] };
    for (const tab of ['convert', 'chain', 'estimate']) {
      const state = Object.assign({ tab }, bad, tab === 'chain' ? { chain: { from: 'km/h', to: 'm/s', steps: [null, 5] } } : {}, tab === 'estimate' ? { estimate: { item: { type: 'convert' } } } : {});
      await mount({ unitConvert: state }, { isTeacherMode: true });
      expect($('[data-unitconvert-teacher]'), tab).toBeTruthy();
      await React.act(() => root.unmount());
      root = null;
      document.body.innerHTML = '<div id="root"></div>';
    }
  });
});