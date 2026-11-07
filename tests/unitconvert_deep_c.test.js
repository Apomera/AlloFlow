// Unit Converter stage C (2026-11-03): the band-aware Start here path and tab
// order, one practice rule in every activity (commit, second try, reveal only
// on demand after two tries, no credit for a reveal), native-digit input for
// Arabic-script locales, and translated quest labels.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the stage-B
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
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  if (C && C.setNumberLocale) C.setNumberLocale('en');
  vi.restoreAllMocks();
});

async function mount(seed, overrides = {}) {
  const out = { latest: null, xp: [], said: [], errors: [] };
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
const byText = (text, sel = 'button') => $$(sel).find((el) => el.textContent.includes(text));
const byLabel = (label) => $$('[aria-label]').find((el) => el.getAttribute('aria-label') === label);
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(() => el.click()); }
async function typeInto(input, value) {
  expect(input, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function press(el, key) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); }
const tabIds = () => $$('[role="tab"]').map((b) => b.id.replace('stem-unitconvert-tab-', ''));
function extra(family, band, mode, pred, limit = 40000) {
  for (let s = 1; s < limit; s++) { const x = C.makeExtraItem(family, band, s, mode); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}
function practice(band, kind, pred = () => true) {
  for (let s = 1; s < 20000; s++) { const x = C.makePracticeItem(band, s, kind); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}
// Digits in another script, built from code points (no escapes in source).
const ARABIC = (s) => String(s).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
const PERSIAN = (s) => String(s).replace(/\d/g, (d) => String.fromCharCode(0x06F0 + Number(d)));
const AR_DECIMAL = String.fromCharCode(0x066B);
const AR_GROUP = String.fromCharCode(0x066C);
const LRM = String.fromCharCode(0x200E);

describe('Arabic-script locales: Latin digits shown, native digits accepted', () => {
  it('Intl shows these locales would use native digits and marks, so the choice is deliberate', () => {
    expect(new Intl.NumberFormat('ar-EG').format(2.5)).toBe(ARABIC('2') + AR_DECIMAL + ARABIC('5'));
    expect(new Intl.NumberFormat('fa').format(2.5)).toBe(PERSIAN('2') + AR_DECIMAL + PERSIAN('5'));
    for (const lang of ['Arabic', 'Farsi', 'Urdu']) {
      C.setNumberLocale(lang);
      const shown = C.formatUnitNumber(1234.5);
      expect(shown, lang).toBe('1,234.5');
      expect(/[٠-٩۰-۹]/.test(shown), lang).toBe(false);
    }
  });
  it('parses Arabic-Indic and Persian digits, the Arabic decimal and group marks, and the Persian slash', () => {
    for (const lang of ['Arabic', 'Farsi', 'Urdu']) {
      C.setNumberLocale(lang);
      const v = (s) => C.parseNumericDraft(s).value;
      expect(v(ARABIC('2') + AR_DECIMAL + ARABIC('5')), lang).toBe(2.5);
      expect(v(ARABIC('1') + AR_GROUP + ARABIC('234') + AR_DECIMAL + ARABIC('5')), lang).toBe(1234.5);
      expect(v(PERSIAN('2') + AR_DECIMAL + PERSIAN('5')), lang).toBe(2.5);
      expect(v(PERSIAN('2') + '/' + PERSIAN('5')), lang).toBe(2.5);
      expect(v(PERSIAN('123')), lang).toBe(123);
      expect(v(ARABIC('6') + AR_DECIMAL + ARABIC('02') + ' x ' + ARABIC('10') + '^' + ARABIC('23')), lang).toBe(6.02e23);
      expect(v(LRM + '-12,345.6'), lang).toBe(-12345.6);
      // Latin digits still work, and a Latin slash is not a decimal mark.
      expect(v('2.5'), lang).toBe(2.5);
      expect(C.parseNumericDraft('1/2').valid, lang).toBe(false);
    }
  });
  it('a decimal-comma locale maps the Arabic decimal mark to its own mark', () => {
    C.setNumberLocale('Pashto');
    expect(C.getNumberLocale().decimal).toBe(',');
    expect(C.parseNumericDraft(PERSIAN('1') + AR_GROUP + PERSIAN('234') + AR_DECIMAL + PERSIAN('5')).value).toBe(1234.5);
  });
  it('time answers and significant figures read native digits too', () => {
    C.setNumberLocale('Arabic');
    const x = extra('everyday', 'b35', 'time', (i) => i.kind === 'minToHours' && i.a === 150);
    expect(C.diagnosePracticeItem(x, { h: ARABIC('2'), m: ARABIC('30') }).correct).toBe(true);
    const sig = extra('chem', 'chem', 'sigfigs', (i) => i.params.mode === 'prefix' && i.params.given === '12.50' && i.params.from === 'g' && i.params.to === 'kg', 200000);
    expect(C.diagnosePracticeItem(sig, ARABIC('0') + AR_DECIMAL + ARABIC('01250')).correct).toBe(true);
    expect(C.diagnosePracticeItem(sig, ARABIC('0') + AR_DECIMAL + ARABIC('0125')).correct).toBe(false);
  });
  it('the mounted converter commits a value typed in Persian digits', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } }, { lang: 'Farsi' });
    await typeInto($('#unitconvert-value'), PERSIAN('2') + AR_DECIMAL + PERSIAN('5'));
    expect(app.latest.value).toBe(2.5);
    expect(app.latest.valueDraft).toBe(PERSIAN('2') + AR_DECIMAL + PERSIAN('5'));
    expect($('[aria-label="Converted result: 250 cm"]')).toBeTruthy();
  });
});

describe('Start here path and band-aware tab order', () => {
  it('each band has 3 to 6 steps, and every activity stays reachable exactly once', () => {
    const all = C.tabShortcutOrder().slice().sort();
    for (const band of ['b45', 'b67', 'b8']) {
      const path = C.learningPathFor(band);
      expect(path.length).toBeGreaterThanOrEqual(3);
      expect(path.length).toBeLessThanOrEqual(6);
      const order = C.tabOrderFor(band);
      expect(order.slice().sort()).toEqual(all);
      expect(order[0]).toBe('convert');
      // Path tabs come straight after Convert. (Engagement build 2026-11-04:
      // step 1 of every band is Convert itself, so it is left out here.)
      expect(path[0]).toMatchObject({ id: 'guess', tab: 'convert' });
      const pathTabs = [...new Set(path.map((s) => s.tab))].filter((tab) => tab !== 'convert');
      expect(order.slice(1, 1 + pathTabs.length)).toEqual(pathTabs);
    }
    expect(C.tabOrderFor('b45').slice(0, 4)).toEqual(['convert', 'everyday', 'quiz', 'estimate']);
    expect(C.tabOrderFor('b67').slice(0, 5)).toEqual(['convert', 'quiz', 'ladder', 'chain', 'wordproblem']);
    expect(C.tabOrderFor('b8').slice(0, 4)).toEqual(['convert', 'quiz', 'chain', 'chem']);
  });
  it('ticks come only from saved progress of a verified solve', () => {
    const step = (band, id) => C.learningPathFor(band).find((s) => s.id === id);
    expect(C.pathStepDone(step('b45', 'money'), {})).toBe(false);
    expect(C.pathStepDone(step('b45', 'money'), { xpCredited: { 'centsToDollars|125': true } })).toBe(true);
    expect(C.pathStepDone(step('b45', 'money'), { xpCredited: { 'hoursToMin|2|5': true } })).toBe(false);
    expect(C.pathStepDone(step('b8', 'areavol'), { fadeByKind: { area: 1 } })).toBe(true);
    expect(C.pathStepDone(step('b8', 'areavol'), { fadeByKind: { density: 3 } })).toBe(false);
    expect(C.pathStepDone(step('b45', 'bench'), { estimateCorrect: 1 })).toBe(true);
    expect(C.pathStepDone(step('b67', 'chain'), { badges: { chainBuilder: true } })).toBe(true);
    expect(C.pathStepDone(step('b67', 'wordproblem'), { xpCredited: { 'wp|km|m|2|2000': true } })).toBe(true);
    // Corrupt saves never crash.
    expect(C.pathStepDone(step('b67', 'rates'), { xpCredited: 'x', fadeByKind: null, badges: 3 })).toBe(false);
  });
  it('grades 3 to 5: the path leads, a step opens its activity with a fitting problem, and ticks show', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', xpCredited: { 'centsToDollars|125': true } } });
    const section = $('[data-start-here]');
    expect(section.getAttribute('data-start-here')).toBe('b45');
    expect(section.textContent).toContain('Start here: Grades 3–5');
    // Engagement build: step 1 is "Guess, then check" on Convert (5 steps),
    // and the list opens from the one-line Next strip.
    expect(section.textContent).toContain('1 of 5 done');
    await click(byText('Show steps'));
    expect(tabIds().slice(0, 4)).toEqual(['convert', 'everyday', 'quiz', 'estimate']);
    expect($('[data-path-step="money"]').getAttribute('data-path-done')).toBe('true');
    expect($('[data-path-step="guess"]').getAttribute('aria-current')).toBe('step');
    await click($('[data-path-step="within"]'));
    expect(app.latest.tab).toBe('quiz');
    expect(['mixedToSmall', 'bigToSmall', 'smallToBig', 'metricDecimal']).toContain(app.latest.quiz.kind);
    await click($('[data-path-step="time"]'));
    expect(app.latest.tab).toBe('everyday');
    expect(['hoursToMin', 'minToHours', 'elapsed', 'elapsedEnd']).toContain(app.latest.dayItem.kind);
    // An open problem that fits is kept, not replaced.
    const kept = app.latest.dayItem.id;
    await click($('[data-path-step="time"]'));
    expect(app.latest.dayItem.id).toBe(kept);
    // Path tabs are marked for assistive tech too.
    expect($('#stem-unitconvert-tab-everyday').getAttribute('aria-describedby')).toBe('uc-path-tab-note');
    expect($('#uc-path-tab-note').textContent).toBe('Part of your Start here path.');
  });
  it('grade 8+: the order changes, arrows follow it, and digit shortcuts stay the same', async () => {
    const app = await mount({ unitConvert: { tab: 'convert' } }, { gradeBand: 'g912' });
    expect(tabIds().slice(0, 4)).toEqual(['convert', 'quiz', 'chain', 'chem']);
    await press($('#stem-unitconvert-tab-convert'), 'ArrowRight');
    expect(app.latest.tab).toBe('quiz');
    expect(document.activeElement.id).toBe('stem-unitconvert-tab-quiz');
    await press($('#stem-unitconvert-tab-quiz'), 'End');
    expect(document.activeElement.id).toBe('stem-unitconvert-tab-' + tabIds()[tabIds().length - 1]);
    // Digit 0 is always Chemistry, wherever its tab sits.
    await press(document.activeElement, '0');
    expect(app.latest.tab).toBe('chem');
    expect($('#stem-unitconvert-tab-chem').getAttribute('title')).toBe('Shortcut: 0 (while the tab strip has focus)');
    expect($('#stem-unitconvert-tab-ladder').getAttribute('title')).toBe('Shortcut: 8 (while the tab strip has focus)');
  });
  it('the path follows a teacher lock, not the student level picker; it respects problem-type locks', async () => {
    const app = await mount({ unitConvert: { tab: 'quiz', practiceBand: 'b8' } });
    expect($('[data-start-here]').getAttribute('data-start-here')).toBe('b45');
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, teacher: { lockBand: 'b67', lockChemMode: 'density' } } })));
    expect($('[data-start-here]').getAttribute('data-start-here')).toBe('b67');
    expect(tabIds().slice(0, 5)).toEqual(['convert', 'quiz', 'ladder', 'chain', 'wordproblem']);
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, teacher: { lockBand: 'b8', lockChemMode: 'density' } } })));
    await click(byText('Show steps'));
    await click($('[data-path-step="sigfigs"]'));
    expect(app.latest.tab).toBe('chem');
    expect(app.latest.chemItem.kind).toBe('densityChain');
  });
  it('the steps can be hidden and shown again', async () => {
    // Engagement build: the steps start folded into the one-line Next strip.
    const app = await mount({ unitConvert: { tab: 'convert' } });
    expect($('#uc-path-list')).toBeNull();
    expect(byText('Show steps').getAttribute('aria-expanded')).toBe('false');
    await click(byText('Show steps'));
    expect(app.latest.pathCollapsed).toBe(false);
    expect($('#uc-path-list')).toBeTruthy();
    const toggle = byText('Hide steps');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await click(toggle);
    expect(app.latest.pathCollapsed).toBe(true);
    expect($('#uc-path-list')).toBeNull();
    expect(byText('Show steps').getAttribute('aria-expanded')).toBe('false');
  });
});

describe('one rule everywhere: second try, reveal on demand after two tries, no credit', () => {
  const wrongNumber = (x) => String(Math.abs(x.a) * 7 + 3);
  const cases = [
    { slot: 'quiz', tab: 'quiz', key: 'quiz', item: () => Object.assign(practice('b45', 'bigToSmall'), { predict: 'bigger' }), label: 'Quiz answer' },
    { slot: 'ladder', tab: 'ladder', key: 'ladderItem', item: () => Object.assign(extra('ladder', 'b45', null, () => true), { predict: 'bigger' }), label: 'Your answer' },
    { slot: 'chem', tab: 'chem', key: 'chemItem', item: () => Object.assign(extra('chem', 'chem', 'mole', (i) => i.params.mode === 'massToMol'), { predict: 'smaller' }), label: 'Your answer' },
    { slot: 'everyday', tab: 'everyday', key: 'dayItem', item: () => Object.assign(extra('everyday', 'b35', 'money', (i) => i.kind === 'dollarsToCents'), { predict: 'bigger' }), label: 'Your answer' }
  ];
  for (const c of cases) {
    it(c.slot + ': two wrong tries stay open; the answer shows only when chosen and pays nothing', async () => {
      const x = c.item();
      const app = await mount({ unitConvert: { tab: c.tab, [c.key]: x } });
      for (let i = 1; i <= 2; i++) {
        expect(byText('Show the answer'), 'before try ' + i).toBeUndefined();
        expect(byLabel(c.label).disabled, 'answer box open').toBe(false);
        await typeInto(byLabel(c.label), wrongNumber(x));
        await click(byText('Check answer'));
        expect(app.latest[c.key].tries, 'after try ' + i).toBe(i);
        expect(app.latest[c.key].answered, 'after try ' + i).toBeFalsy();
        expect(document.body.textContent).not.toContain('The answer is');
      }
      expect($('[data-tries-note="2"]').textContent).toContain('Show the answer');
      await click(byText('Show the answer'));
      expect(app.latest[c.key]).toMatchObject({ answered: true, correct: false, revealed: true, xp: 0 });
      expect(document.body.textContent).toContain('The answer is');
      expect(app.xp.filter((r) => r.reason !== 'badge')).toEqual([]);
    });
  }
  it('with reveals off, a third try is still open and a fix pays 1 XP', async () => {
    const x = Object.assign(practice('b45', 'bigToSmall'), { predict: 'bigger' });
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: x, teacher: { noReveal: true } } });
    for (let i = 0; i < 2; i++) { await typeInto(byLabel('Quiz answer'), wrongNumber(x)); await click(byText('Check answer')); }
    expect(byText('Show the answer')).toBeUndefined();
    await typeInto(byLabel('Quiz answer'), String(x.a));
    await click(byText('Check answer'));
    expect(app.xp).toEqual([{ id: 'unitConvert', pts: 1, reason: 'unit practice correct' }]);
  });
  it('word problems: an unreadable entry is not a try; Reveal Answer comes after two tries and pays nothing', async () => {
    const wp = C.makeOfflineWordProblem('length', 'm', 'cm', 4);
    const app = await mount({ unitConvert: { tab: 'wordproblem', category: 'length', fromUnit: 'm', toUnit: 'cm', wordProblem: wp } });
    await typeInto($('#unitconvert-word-problem-attempt'), 'abc');
    await click(byText('Check attempt'));
    expect($('[role="alert"]').textContent).toContain('Enter a valid number');
    expect(app.latest.wordProblemTries || 0).toBe(0);
    for (let i = 1; i <= 2; i++) {
      expect(byText('Reveal Answer')).toBeUndefined();
      await typeInto($('#unitconvert-word-problem-attempt'), String(wp.answer * 7 + 1));
      await click(byText('Check attempt'));
      expect($('[data-wp-feedback] [data-misconception="wordProblem"]').textContent).toContain('Not yet.');
    }
    expect(app.latest.wordProblemTries).toBe(2);
    await click(byText('Reveal Answer'));
    expect(app.latest.wordProblemRevealed).toBe(true);
    expect($('#unitconvert-word-problem-attempt')).toBeNull();
    expect(app.xp).toEqual([]);
    // A new problem starts the count again.
    await click(byText('New Problem'));
    expect(app.latest.wordProblemTries).toBe(0);
    expect(byText('Reveal Answer')).toBeUndefined();
  });
  it('word problems use the same hint button and hint list as practice', async () => {
    const wp = C.makeOfflineWordProblem('length', 'm', 'cm', 4);
    await mount({ unitConvert: { tab: 'wordproblem', category: 'length', fromUnit: 'm', toUnit: 'cm', wordProblem: wp } });
    const hint = $('[data-hint-button]');
    expect(hint.textContent).toBe('💡 Hint 1 of 2');
    await click(hint);
    expect($$('[aria-label="Revealed hints"] li')).toHaveLength(1);
    expect($('[aria-label="Revealed hints"]').tagName).toBe('OL');
  });
  it('factor chain: an unfinished chain is not a try; Show a correct chain comes after two wrong checks', async () => {
    const app = await mount({ unitConvert: { tab: 'chain', category: 'length', fromUnit: 'm', toUnit: 'cm' } });
    await choose($('#uc-chain-preset'), 'ft→cm');
    await click(byText('Check my chain'));
    expect($('[data-chain-error]').getAttribute('data-chain-error')).toBe('incomplete');
    expect(byText('Show a correct chain')).toBeUndefined();
    await typeInto(byLabel('Factor 1 top number'), '1');
    await choose(byLabel('Factor 1 top unit'), 'ft');
    await typeInto(byLabel('Factor 1 bottom number'), '30.48');
    await choose(byLabel('Factor 1 bottom unit'), 'cm');
    await click(byText('Check my chain'));
    expect($('[data-chain-error]').getAttribute('data-chain-error')).toBe('upsideDown');
    expect(byText('Show a correct chain')).toBeUndefined();
    await click(byText('Check my chain'));
    expect($('[data-chain-error] [data-tries-note="2"]')).toBeTruthy();
    await click(byText('Show a correct chain'));
    expect($('[data-chain-ok]')).toBeTruthy();
    expect(app.xp).toEqual([]);
    expect(byText('Show a correct chain')).toBeUndefined();
  });
  it('estimate: two wrong picks stay open, the answer shows only when chosen, and nothing counts', async () => {
    const est = C.makeEstimateItem('b67', 7);
    const app = await mount({ unitConvert: { tab: 'estimate', estimate: { item: est, choice: null, wrong: [], done: false } } });
    const wrongs = est.options.filter((o) => o !== est.correct);
    const btn = (o) => $$('[aria-labelledby="uc-est-q"] button').find((b) => b.textContent.replace(/^[✓✗] /, '').startsWith(C.formatUnitNumber(o, 'auto') + ' '));
    await click(btn(wrongs[0]));
    expect(byText('Show the answer')).toBeUndefined();
    await click(btn(wrongs[1]));
    expect(app.latest.estimate.done).toBe(false);
    expect(document.body.textContent).not.toContain('is closer');
    await click(byText('Show the answer'));
    expect(app.latest.estimate).toMatchObject({ done: true, right: false, revealed: true });
    expect(document.body.textContent).toContain('is closer');
    expect(app.xp).toEqual([]);
    expect(app.latest.estimateCorrect || 0).toBe(0);
  });
  it('a two-way comparison gets a named second try instead of ending at once', async () => {
    const app = await mount({ unitConvert: { tab: 'estimate', estimateSeq: 2 } });
    await click(byText('Start estimating'));
    const item = app.latest.estimate.item;
    const buttons = () => $$('[aria-labelledby="uc-est-q"] button');
    await click(buttons()[1 - item.correctIndex]);
    expect(app.latest.estimate.done).toBe(false);
    expect($('[data-misconception="' + item.alt.mis + '"]').textContent).toContain('Pick again');
    expect(buttons()[1 - item.correctIndex].disabled).toBe(true);
    await click(buttons()[item.correctIndex]);
    expect(app.latest.estimate).toMatchObject({ done: true, right: true });
    expect(app.xp).toEqual([]);
  });
});

describe('quest labels', () => {
  it('are translated with the last render\'s translator', async () => {
    const hooks = window.StemLab._registry.unitConvert.questHooks;
    expect(hooks.map((q) => q.id)).toEqual(['explore_4_categories', 'quiz_10', 'streak_5']);
    expect(hooks[0].label).toBe('Convert in 4 different unit categories');
    const t = (key, fallback) => ({ 'stem.unitconvert.quest_explore': 'Convierte en 4 categorías', 'stem.unitconvert.quest_explore_progress': '{n}/4 categorías', 'stem.unitconvert.quest_streak_progress': 'Mejor racha: {n}/5' }[key] || fallback);
    await mount({ unitConvert: { tab: 'convert' } }, { t });
    expect(hooks[0].label).toBe('Convierte en 4 categorías');
    expect(hooks[0].progress({ catsUsed: { length: true, time: true } })).toBe('2/4 categorías');
    expect(hooks[2].progress({ bestStreak: 3 })).toBe('Mejor racha: 3/5');
    expect(hooks[1].check({ quizTotal: 10 })).toBe(true);
    expect(hooks[1].progress({})).toBe('0/10 answered');
  });
});

describe('every tab mounts cleanly in every mode', () => {
  it('no console errors', async () => {
    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    const modes = [{}, { isTeacherMode: true }, { isContrast: true }, { isDark: true, theme: 'dark' }, { gradeBand: 'g912' }, { gradeBand: 'g68', lang: 'Arabic' }];
    for (const m of modes) {
      for (const tab of C.tabShortcutOrder()) {
        document.body.innerHTML = '<div id="root"></div>';
        await mount({ unitConvert: { tab } }, m);
        expect($('[role="tabpanel"]').id).toBe('stem-unitconvert-panel-' + tab);
        await React.act(() => root.unmount());
        root = null;
      }
    }
    expect(errors).toEqual([]);
  });
});
