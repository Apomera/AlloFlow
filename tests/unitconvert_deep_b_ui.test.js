// Unit Converter stage B (2026-11-03): the mounted tool. Locale input and
// output, the interactive prefix ladder, Time & money, Chemistry, the
// estimation second try, teacher locks and the dark surface. Real clicks,
// typing and key presses through React.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the stage-A
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
  const out = { latest: null, xp: [], said: [], toasts: [] };
  const extra = Object.assign({
    awardXP: (id, pts, reason) => out.xp.push({ id, pts, reason }),
    announceToSR: (m) => out.said.push(m),
    addToast: (m) => out.toasts.push(m)
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
function find(family, band, mode, pred, limit = 40000) {
  for (let s = 1; s < limit; s++) { const x = C.makeExtraItem(family, band, s, mode); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}

describe('numbers follow the student language', () => {
  it('German: the result reads 1.234,5 and a typed decimal comma is committed', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 12.345, fromUnit: 'm', toUnit: 'cm' } }, { lang: 'German' });
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 1.234,5 cm');
    await typeInto($('#unitconvert-value'), '2,5');
    expect(app.latest.value).toBe(2.5);
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 250 cm');
    expect($('[role="alert"]')).toBeNull();
  });
  it('English stays as before: 1,234.5, and "2,5" is refused', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 12.345, fromUnit: 'm', toUnit: 'cm' } });
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 1,234.5 cm');
    await typeInto($('#unitconvert-value'), '2,5');
    expect(app.latest.value).toBe(12.345);
    expect($('[role="alert"]').textContent).toContain('valid number');
  });
});

describe('prefix ladder', () => {
  it('is a roving radio group: arrow keys step rungs, announce the ×10 move and update the readout', async () => {
    const app = await mount({ unitConvert: { tab: 'ladder', ladder: { base: 'm', start: 'base', at: 'base', draft: '2.5' } } });
    const radios = $$('[data-prefix-ladder] [role="radio"]');
    expect(radios).toHaveLength(7);
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
    const current = radios.find((r) => r.getAttribute('aria-checked') === 'true');
    expect(current.getAttribute('data-rung')).toBe('base');
    await press(current, 'ArrowDown');
    expect(app.latest.ladder.at).toBe('deci');
    // Stage D: one place is singular (was "moves 1 places").
    expect(app.said.pop()).toBe('Down to dm: the decimal point moves 1 place to the right. 2.5 m = 25 dm.');
    await press($('[data-rung="deci"]'), 'End');
    expect(app.latest.ladder.at).toBe('milli');
    expect($('[data-ladder-readout]').textContent).toContain('2,500 mm');
    expect($('[data-ladder-readout]').textContent).toContain('3 places to the right');
    await press($('[data-rung="milli"]'), 'Home');
    expect(app.latest.ladder.at).toBe('kilo');
    expect($('[data-ladder-readout]').textContent).toContain('0.0025 km');
    expect(document.activeElement.getAttribute('data-rung')).toBe('kilo');
  });
  it('adds micro and mega for grade 8+, with the 1,000 gap shown', async () => {
    await mount({ unitConvert: { tab: 'ladder' } }, { gradeBand: 'g912' });
    expect($$('[data-prefix-ladder] [role="radio"]')).toHaveLength(9);
    expect(byText('Up one rung', 'button')).toBeTruthy();
    expect($('[data-prefix-ladder]').textContent).toContain('× 1,000');
  });
  it('ladder practice names the decimal point moved the wrong way, then pays once on the fix', async () => {
    const x = find('ladder', 'b45', null, (i) => i.params.dir === 'down' && i.params.places === 3);
    const app = await mount({ unitConvert: { tab: 'ladder', ladderItem: Object.assign({}, x, { predict: 'bigger' }) } });
    await typeInto(byLabel('Your answer'), String(C.shiftDecimal(x.inputValue, -3)));
    await click(byText('Check answer'));
    expect($('[data-misconception="ladderWrongWay"]').textContent).toContain('Moved the decimal point the wrong way');
    await typeInto(byLabel('Your answer'), String(x.a));
    await click(byText('Check answer'));
    expect(app.latest.ladderItem).toMatchObject({ answered: true, correct: true });
    expect(app.xp.filter((x) => x.reason !== 'badge')).toEqual([{ id: 'unitConvert', pts: 1, reason: 'ladder practice correct' }]);
    expect(app.latest.misTally.ladderWrongWay).toBe(1);
  });
});

describe('time and money', () => {
  it('hours-and-minutes answers: the 100-minute hour is named, then the fix pays 1 XP', async () => {
    const x = find('everyday', 'b35', 'time', (i) => i.kind === 'minToHours' && i.a === 150);
    const app = await mount({ unitConvert: { tab: 'everyday', dayItem: x } });
    // No bigger/smaller prediction for a two-part answer.
    expect($('[data-practice-predict]')).toBeNull();
    await typeInto($('#uc-day-answer-h'), '1');
    await typeInto($('#uc-day-answer-m'), '50');
    await click(byText('Check answer'));
    expect($('[data-misconception="hundredMinutes"]').textContent).toContain('Used 100 minutes in an hour');
    await typeInto($('#uc-day-answer-h'), '2');
    await typeInto($('#uc-day-answer-m'), '30');
    await click(byText('Check answer'));
    expect(document.body.textContent).toContain('Correct! 2 h 30 min.');
    expect(app.xp.filter((x) => x.reason !== 'badge')).toEqual([{ id: 'unitConvert', pts: 1, reason: 'everyday practice correct' }]);
  });
  it('elapsed time shows a labelled number line with a text list of jumps from hint 2', async () => {
    const x = find('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsed' && i.jumps.length === 3);
    await mount({ unitConvert: { tab: 'everyday', dayItem: x } });
    expect($('[data-elapsed-number-line]')).toBeNull();
    await click(byText('Hint 1 of 3'));
    await click(byText('Hint 2 of 3'));
    const fig = $('[data-elapsed-number-line]');
    expect(fig).toBeTruthy();
    expect(fig.querySelector('svg').getAttribute('role')).toBe('img');
    expect(fig.querySelector('desc').textContent).toContain('From ');
    expect(fig.querySelectorAll('[aria-label="Jumps on the number line"] li')).toHaveLength(3);
  });
  it('a teacher lock fixes the problem type', async () => {
    const app = await mount({ unitConvert: { tab: 'everyday', teacher: { lockDayMode: 'money' } } });
    expect(byText('Hours and minutes').disabled).toBe(true);
    await click(byText('Start time and money practice'));
    expect(['centsToDollars', 'dollarsToCents', 'moneyMixed']).toContain(app.latest.dayItem.kind);
  });
});

describe('chemistry', () => {
  it('grades significant figures: a dropped trailing zero is named, the right count pays', async () => {
    const x = find('chem', 'chem', 'sigfigs', (i) => i.params.mode === 'prefix' && i.params.given === '12.50' && i.params.from === 'g' && i.params.to === 'kg', 200000);
    const app = await mount({ unitConvert: { tab: 'chem', chemItem: Object.assign({}, x, { predict: 'smaller' }) } });
    expect(document.body.textContent).toContain('A measurement reads 12.50 g. Write it in kg with the correct number of significant figures.');
    await typeInto(byLabel('Your answer'), '0.0125');
    await click(byText('Check answer'));
    expect($('[data-misconception="sigTooFew"]')).toBeTruthy();
    await typeInto(byLabel('Your answer'), '1.250 × 10^-2');
    await click(byText('Check answer'));
    expect(document.body.textContent).toContain('Correct! 0.01250 kg.');
    expect(app.xp.filter((x) => x.reason !== 'badge')).toEqual([{ id: 'unitConvert', pts: 1, reason: 'chemistry practice correct' }]);
  });
  it('mole answers take scientific notation and show the cited data', async () => {
    const x = find('chem', 'chem', 'mole', (i) => i.params.mode === 'molToParticles');
    const app = await mount({ unitConvert: { tab: 'chem', chemItem: Object.assign({}, x, { predict: 'bigger' }) } });
    await typeInto(byLabel('Your answer'), (x.a).toExponential(3).replace('e+', ' × 10^'));
    await click(byText('Check answer'));
    expect(app.latest.chemItem.correct).toBe(true);
    const data = $('[data-chem-data]');
    expect(data.textContent).toContain('CIAAW');
    expect(data.textContent).toContain('6.02214076 × 10²³');
    expect(data.querySelectorAll('tbody tr')).toHaveLength(16);
  });
  it('a teacher can lock the chemistry problem type', async () => {
    const app = await mount({ unitConvert: { tab: 'chem' } }, { isTeacherMode: true });
    await choose($('#uc-teacher-chem'), 'mole');
    expect(app.latest.teacher.lockChemMode).toBe('mole');
    expect(byText('Significant figures', 'button').disabled).toBe(true);
    await click(byText('Start chemistry practice'));
    expect(app.latest.chemItem.kind).toBe('mole');
  });
});

describe('estimation: second try and benchmark comparisons', () => {
  it('a wrong first estimate is named without giving the answer; the second try pays nothing', async () => {
    const est = C.makeEstimateItem('b67', 7);
    const app = await mount({ unitConvert: { tab: 'estimate', estimate: { item: est, choice: null, wrong: [], done: false } } });
    const wrongOpt = est.options.find((o) => o !== est.correct);
    const label = (o) => C.formatUnitNumber(o, 'auto') + ' ';
    await click($$('[aria-labelledby="uc-est-q"] button').find((b) => b.textContent.startsWith(label(wrongOpt))));
    expect(app.latest.estimate.done).toBe(false);
    const mis = wrongOpt > est.correct ? 'estTooBig' : 'estTooSmall';
    expect($('[data-misconception="' + mis + '"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('is closer');
    await click($$('[aria-labelledby="uc-est-q"] button').find((b) => b.textContent.startsWith(label(est.correct))));
    expect(app.latest.estimate).toMatchObject({ done: true, right: true });
    expect(app.xp).toEqual([]);
    expect(app.latest.estimateCorrect || 0).toBe(0);
  });
  it('every third question is a two-way benchmark comparison with a named mistake', async () => {
    const app = await mount({ unitConvert: { tab: 'estimate', estimateSeq: 2 } });
    await click(byText('Start estimating'));
    const item = app.latest.estimate.item;
    expect(item.type).toBe('compare');
    expect(document.body.textContent).toMatch(/ or /);
    const buttons = $$('[aria-labelledby="uc-est-q"] button');
    expect(buttons).toHaveLength(2);
    await click(buttons[1 - item.correctIndex]);
    expect($('[data-misconception="' + item.alt.mis + '"]')).toBeTruthy();
    expect(app.xp).toEqual([]);
  });
  it('an estimate saved before stage B still shows as answered', async () => {
    await mount({ unitConvert: { tab: 'estimate', estimate: { item: C.makeEstimateItem('b67', 7), choice: -1, right: false } } });
    expect(document.body.textContent).toContain('Not quite');
    expect($$('[aria-labelledby="uc-est-q"] button').every((b) => b.disabled)).toBe(true);
  });
});

describe('dark theme', () => {
  it('paints its own dark surface with a scoped remap; light mode is unchanged', async () => {
    await mount({ unitConvert: { tab: 'quiz' } }, { isDark: true, theme: 'dark' });
    const rootEl = $('[data-unitconvert-root]');
    expect(rootEl.getAttribute('data-uc-theme')).toBe('dark');
    expect(rootEl.style.background).toMatch(/15, 23, 42|#0f172a/);
    expect(rootEl.querySelector('style').textContent).toContain('[data-uc-theme="dark"] .bg-white{background-color:#1e293b!important}');
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ unitConvert: { tab: 'quiz' } });
    expect($('[data-unitconvert-root]').hasAttribute('data-uc-theme')).toBe(false);
    expect($('[data-unitconvert-root] style').textContent).not.toContain('data-uc-theme');
  });
  it('contrast theme keeps its own palette, not the dark remap', async () => {
    await mount({ unitConvert: { tab: 'quiz' } }, { isContrast: true, isDark: true });
    expect($('[data-unitconvert-root]').hasAttribute('data-uc-theme')).toBe(false);
  });
});

describe('navigation', () => {
  it('8, 9 and 0 jump to the new tabs from the tab strip', async () => {
    const app = await mount({ unitConvert: { tab: 'convert' } });
    await press($('#stem-unitconvert-tab-convert'), '8');
    expect(app.latest.tab).toBe('ladder');
    await press($('#stem-unitconvert-tab-ladder'), '0');
    expect(app.latest.tab).toBe('chem');
    await press($('#stem-unitconvert-tab-chem'), '9');
    expect(app.latest.tab).toBe('everyday');
    expect($('[role="tabpanel"]').id).toBe('stem-unitconvert-panel-everyday');
  });
});

describe('mount sweep (stage B)', () => {
  it('mounts the new tabs and every new item kind, answered and not, in every mode, with no console errors', async () => {
    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    vi.spyOn(console, 'warn').mockImplementation((...a) => errors.push(a.join(' ')));
    const modes = [{}, { isTeacherMode: true }, { isContrast: true }, { isDark: true, theme: 'dark' }, { gradeBand: 'g912' }, { lang: 'German' }];
    const states = [{ tab: 'ladder' }, { tab: 'everyday' }, { tab: 'chem' }, { tab: 'ladder', ladder: { draft: 'abc' } }, { tab: 'everyday', dayMode: 'bogus', dayItem: { kind: 'nope' } }];
    for (const mode of modes) {
      for (const st of states) {
        if (root) { await React.act(() => root.unmount()); root = null; }
        document.body.innerHTML = '<div id="root"></div>';
        await mount({ unitConvert: st }, mode);
        expect(document.querySelector('[role="tabpanel"]'), JSON.stringify([mode, st])).toBeTruthy();
        expect((document.body.innerHTML.match(/.{0,120}(?:NaN|undefined|\[object Object\]|e\+\d).{0,60}/) || [null])[0], JSON.stringify([mode, st])).toBeNull();
      }
    }
    const fams = { ladder: [['b8', null]], everyday: [['b35', 'time'], ['b35', 'elapsed'], ['b35', 'money']], chem: [['chem', 'sigfigs'], ['chem', 'sci'], ['chem', 'mole'], ['chem', 'density']] };
    const slotKey = { ladder: 'ladderItem', everyday: 'dayItem', chem: 'chemItem' };
    const tabOf = { ladder: 'ladder', everyday: 'everyday', chem: 'chem' };
    for (const fam of Object.keys(fams)) {
      for (const [band, mode] of fams[fam]) {
        for (let s = 1; s <= 6; s++) {
          const x = C.makeExtraItem(fam, band, s, mode);
          for (const answered of [false, true]) {
            if (root) { await React.act(() => root.unmount()); root = null; }
            document.body.innerHTML = '<div id="root"></div>';
            const shown = answered ? Object.assign({}, x, { predict: 'bigger', answered: true, correct: false, revealed: true, tries: 2, lastMis: x.traps[0] ? x.traps[0].id : 'generic', hintLevel: 3 }) : Object.assign({}, x, { hintLevel: 3, tries: 1, lastMis: 'generic' });
            await mount({ unitConvert: { tab: tabOf[fam], [slotKey[fam]]: shown } });
            if (answered) expect(document.body.textContent, x.id).toContain('Worked solution');
            expect((document.body.innerHTML.match(/.{0,120}(?:NaN|undefined|\[object Object\]|\{[a-zA-Z]+\}|e\+\d).{0,60}/) || [null])[0], x.id).toBeNull();
          }
        }
      }
    }
    expect(errors).toEqual([]);
  }, 180000);
});
