// Unit Converter deep pass (2026-11-03): the mounted tool. Drives real clicks,
// typing and key presses through React and checks state, XP calls,
// announcements and the accessibility tree.
// UNITCONVERT_DEEP_SRC points the suite at another copy (e.g. the pre-pass
// original) to confirm each gate fails on the old behaviour.
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
  vi.restoreAllMocks();
});

async function mount(seed, overrides = {}) {
  const out = { latest: null, xp: [], said: [], toasts: [], opened: [] };
  const extra = Object.assign({
    awardXP: (id, pts, reason) => out.xp.push({ id, pts, reason }),
    announceToSR: (m) => out.said.push(m),
    addToast: (m) => out.toasts.push(m),
    setStemLabTool: (id) => out.opened.push(id)
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
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function blur(el) { await React.act(async () => { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }); }
async function press(el, key) { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); }
function item(band, kind, pred = () => true) {
  for (let s = 1; s < 20000; s++) { const x = C.makePracticeItem(band, s, kind); if (pred(x)) { x.seed = s; return x; } }
  throw new Error('no item');
}

describe('structure and accessibility', () => {
  it('the tab panel wraps the activity itself, for every tab', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'm', toUnit: 'cm' } });
    expect($('[role="tabpanel"]').contains($('#unitconvert-value'))).toBe(true);
    const expectations = { table: 'table', quiz: '[aria-label="Practice level"], fieldset', wordproblem: 'button', magHunt: '#mh-sourceExp', chain: '#uc-chain-preset', estimate: 'button' };
    for (const tab of Object.keys(expectations)) {
      await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, tab } })));
      const panel = $('[role="tabpanel"]');
      expect(panel.id).toBe('stem-unitconvert-panel-' + tab);
      expect(panel.querySelector(expectations[tab]), tab).toBeTruthy();
    }
  });

  it('the result line is not remounted per keystroke and is announced once, on commit', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'm', toUnit: 'cm' } });
    const resultNode = $('[aria-label="Converted result: 300 cm"]');
    expect(resultNode).toBeTruthy();
    expect(resultNode.getAttribute('role')).not.toBe('status');
    expect(resultNode.hasAttribute('aria-live')).toBe(false);
    const input = $('#unitconvert-value');
    await typeInto(input, '4');
    await typeInto(input, '45');
    const after = $('[aria-label="Converted result: 4,500 cm"]');
    expect(after).toBe(resultNode);
    expect(app.said.filter((m) => /Converted result/.test(m))).toHaveLength(0);
    await blur(input);
    expect(app.said.filter((m) => /Converted result/.test(m))).toEqual(['Converted result: 45 m is 4,500 cm.']);
  });

  it('a negative length is refused and never committed', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'm', toUnit: 'cm' } });
    await typeInto($('#unitconvert-value'), '-5');
    expect(app.latest.value).toBe(3);
    expect($('[role="alert"]').textContent).toContain('A length cannot be negative');
    expect($('[data-equal-quantity-bar]')).toBeNull();
  });

  it('pins are removable by keyboard with a named button', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'ft', toUnit: 'in', pinnedConversions: [{ key: 'length_ft_in', from: 'ft', to: 'in', category: 'length', label: 'ft → in' }] } });
    const remove = byLabel('Remove pinned conversion ft → in');
    expect(remove.tagName).toBe('BUTTON');
    expect(remove.closest('button') === remove && !remove.parentElement.closest('button')).toBe(true);
    expect(byLabel('Open pinned conversion ft → in').tagName).toBe('BUTTON');
    await click(remove);
    expect(app.latest.pinnedConversions).toEqual([]);
  });

  it('names the badge close button and lists no speed badge', async () => {
    await mount({ unitConvert: { showBadges: true, badges: { firstConvert: true, speedster: true } } });
    expect(byLabel('Close badges').tagName).toBe('BUTTON');
    expect(document.body.textContent).not.toContain('Speedster');
  });

  it('labels the US short ton, the metric tonne and the US vs imperial gallon', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'weight', value: 1, fromUnit: 'ton', toUnit: 'kg' } });
    const weightOptions = $$('#unitconvert-from option').map((o) => o.textContent).join(' | ');
    expect(weightOptions).toContain('US short ton');
    expect(weightOptions).toContain('metric tonne');
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, category: 'volume', fromUnit: 'gal', toUnit: 'L' } })));
    const volumeOptions = $$('#unitconvert-from option').map((o) => o.textContent).join(' | ');
    expect(volumeOptions).toContain('US gallon');
    expect(volumeOptions).toContain('imperial');
  });

  it('keeps non-English letters in the table heading and gives the table a real caption', async () => {
    const t = (key, fallback) => ({ 'stem.unitconvert.pressure': '💨 Presión', 'stem.unitconvert.catname_pressure': 'Presión' }[key] || fallback);
    await mount({ unitConvert: { tab: 'table', category: 'pressure', value: 1, fromUnit: 'atm', toUnit: 'Pa' } }, { t });
    expect(document.body.textContent).toContain('All Presión conversions for:');
    const caption = $('table caption').textContent;
    expect(caption).toContain('Presión');
    expect(caption).not.toContain('Change');
  });

  it('digit shortcuts never fire from a focused button, and letter shortcuts are gone', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    const swap = byLabel('Swap units');
    await press(swap, '3');
    await press(swap, 'b');
    await press(swap, 'n');
    expect(app.latest.tab || 'convert').toBe('convert');
    expect(app.latest.showBadges).toBeFalsy();
    await press($('#stem-unitconvert-tab-convert'), '6');
    expect(app.latest.tab).toBe('chain');
  });
});

describe('XP is paid once per verified item, never for speed or generation', () => {
  it('generating an AI word problem pays nothing; solving it pays once', async () => {
    const response = ['CONTEXT: A team plans a hike.', 'INPUT_VALUE: 2', 'FROM_UNIT: km', 'TO_UNIT: m', 'ANSWER_VALUE: 2000', 'ANSWER_UNIT: m'].join('\n');
    const app = await mount({ unitConvert: { tab: 'wordproblem', category: 'length', value: 1, fromUnit: 'km', toUnit: 'm' } }, { callGemini: () => Promise.resolve(response) });
    await click(byText('Generate Problem'));
    await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(app.latest.wordProblem && app.latest.wordProblem.source).toBe('ai');
    expect(app.xp).toEqual([]);
    await typeInto($('#unitconvert-word-problem-attempt'), '2000');
    await click(byText('Check attempt'));
    expect(app.xp.filter((x) => x.reason === 'word problem solved')).toEqual([{ id: 'unitConvert', pts: 2, reason: 'word problem solved' }]);
    // The same problem again: no second payment.
    await click(byText('New Problem'));
    await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await typeInto($('#unitconvert-word-problem-attempt'), '2000');
    await click(byText('Check attempt'));
    expect(app.latest.wordProblemSolved).toBe(true);
    expect(app.xp.filter((x) => x.reason === 'word problem solved')).toHaveLength(1);
  });

  it('offline problems change on every request, and a revealed answer closes the answer box', async () => {
    const app = await mount({ unitConvert: { tab: 'wordproblem', category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft' } });
    const seen = new Set();
    for (let i = 0; i < 5; i++) {
      await click(byText(i === 0 ? 'Generate Problem' : 'New Problem'));
      seen.add(C.wordProblemSignature(app.latest.wordProblem));
    }
    expect(seen.size).toBe(5);
    // Stage C (2026-11-03): Reveal Answer is offered only after two tries.
    expect(byText('Reveal Answer')).toBeUndefined();
    for (let i = 0; i < 2; i++) {
      await typeInto($('#unitconvert-word-problem-attempt'), String(app.latest.wordProblem.answer * 7 + 1));
      await click(byText('Check attempt'));
    }
    await click(byText('Reveal Answer'));
    expect($('#unitconvert-word-problem-attempt')).toBeNull();
    expect(app.xp).toEqual([]);
  });

  it('practice pays 2 XP for a first-try answer however fast or slow, and never twice for one item', async () => {
    const it2 = item('b45', 'bigToSmall');
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, it2, { predict: 'bigger' }) } });
    await typeInto(byLabel('Quiz answer'), String(it2.a));
    await click(byText('Check answer'));
    expect(app.xp.filter((x) => x.reason === 'unit practice correct')).toEqual([{ id: 'unitConvert', pts: 2, reason: 'unit practice correct' }]);
    // Same item served again (as a repeat would be): nothing more.
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, quiz: Object.assign({}, it2, { predict: 'bigger' }) } })));
    await typeInto(byLabel('Quiz answer'), String(it2.a));
    await click(byText('Check answer'));
    expect(app.xp.filter((x) => x.reason === 'unit practice correct')).toHaveLength(1);
    expect(app.xp.every((x) => x.pts !== 3)).toBe(true);
  });
});

describe('practice: predict, named mistake, second try, hints, fading examples', () => {
  it('locks the answer until a prediction is made', async () => {
    const it2 = item('b45', 'bigToSmall');
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: it2 } });
    expect(byLabel('Quiz answer').disabled).toBe(true);
    await click(byText('A bigger number'));
    expect(app.latest.quiz.predict).toBe('bigger');
    expect(byLabel('Quiz answer').disabled).toBe(false);
  });

  it('names the mistake, allows a second try, then reveals with worked steps', async () => {
    const it2 = item('b8', 'area', (x) => x.fromUnit === 'm²' && x.toUnit === 'cm²');
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, it2, { predict: 'bigger' }) } });
    await typeInto(byLabel('Quiz answer'), String(it2.inputValue * 100));
    await click(byText('Check answer'));
    expect(app.latest.quiz.answered).toBe(false);
    expect($('[data-misconception="linearForArea"]').textContent).toContain('Used the length factor for an area');
    expect(document.body.textContent).toContain('one more try');
    expect(document.body.textContent).not.toContain(C.formatUnitNumber(it2.a, 'auto') + ' cm².');
    expect(byText('Show the answer')).toBeUndefined();
    await typeInto(byLabel('Quiz answer'), '1');
    await click(byText('Check answer'));
    // Stage C (2026-11-03): no auto-reveal after the second try; the student
    // chooses "Show the answer".
    expect(app.latest.quiz).toMatchObject({ answered: false, tries: 2 });
    await click(byText('Show the answer'));
    expect(app.latest.quiz).toMatchObject({ answered: true, correct: false, revealed: true });
    expect(document.body.textContent).toContain('The answer is ' + C.formatUnitNumber(it2.a, 'auto'));
    expect($('[aria-label="Worked solution"]')).toBeTruthy();
    expect(app.latest.misTally).toMatchObject({ linearForArea: 1, generic: 1 });
    expect(app.latest.missed[0]).toMatchObject({ mis: 'linearForArea', outcome: 'revealed' });
    expect(app.xp.filter((x) => x.reason === 'unit practice correct')).toHaveLength(0);
  });

  it('fixing a named mistake on the second try pays 1 XP and earns Mistake Fixer', async () => {
    const it2 = item('b67', 'temperature', (x) => x.fromUnit === '°F' && x.inputValue === 212);
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, it2, { predict: 'smaller' }) } });
    await typeInto(byLabel('Quiz answer'), '180');
    await click(byText('Check answer'));
    expect($('[data-misconception="tempNoScale"]')).toBeTruthy();
    await typeInto(byLabel('Quiz answer'), '100');
    await click(byText('Check answer'));
    expect(app.xp.filter((x) => x.reason === 'unit practice correct')).toEqual([{ id: 'unitConvert', pts: 1, reason: 'unit practice correct' }]);
    expect(app.latest.badges.misconceptionFixer).toBe(true);
    expect(app.latest.streak).toBe(0);
  });

  it('gives a three-step hint ladder', async () => {
    const it2 = item('b45', 'bigToSmall', (x) => x.fromUnit === 'ft');
    await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, it2, { predict: 'bigger' }) } });
    for (let n = 1; n <= 3; n++) await click(byText('Hint ' + n + ' of 3'));
    const hints = $$('[aria-label="Revealed hints"] li').map((li) => li.textContent);
    expect(hints).toHaveLength(3);
    expect(hints[0]).toContain('smaller');
    expect(hints[1]).toContain('1 ft = 12 in');
    expect(hints[2]).toContain(it2.params.n + ' × 12');
    expect(byText('Hint 4')).toBeUndefined();
  });

  it('fades the worked example: full, then partial, then none', async () => {
    const it2 = item('b45', 'bigToSmall');
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: it2 } });
    expect($('[data-worked-example="full"]')).toBeTruthy();
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, fadeByKind: { bigToSmall: 1 } } })));
    expect($('[data-worked-example="full"]')).toBeNull();
    expect($('[data-worked-example="partial"]').textContent).toContain('= ?');
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, fadeByKind: { bigToSmall: 2 } } })));
    expect($('[data-worked-example]')).toBeNull();
  });

  it('starts at the host grade band and generates new items', async () => {
    const app = await mount({ unitConvert: { tab: 'quiz' } }, { gradeBand: 'g912' });
    expect(byText('Grade 8+ and chemistry', 'button').getAttribute('aria-pressed')).toBe('true');
    await click(byText('Start practice'));
    expect(['chainRate', 'area', 'volume', 'density', 'temperature', 'usImperial', 'prefix']).toContain(app.latest.quiz.kind);
    const first = app.latest.quiz.id;
    await click(byText('New problem'));
    expect(app.latest.quiz.id).not.toBe(first);
  });
});

describe('factor chain builder', () => {
  it('checks a student-built km/h -> m/s chain, pays once, and pays nothing after a reveal', async () => {
    const app = await mount({ unitConvert: { tab: 'chain', category: 'length', fromUnit: 'm', toUnit: 'cm' } });
    await choose($('#uc-chain-preset'), 'km/h→m/s');
    await typeInto(byLabel('Factor 1 top number'), '1000');
    await choose(byLabel('Factor 1 top unit'), 'm');
    await typeInto(byLabel('Factor 1 bottom number'), '1');
    await choose(byLabel('Factor 1 bottom unit'), 'km');
    await click(byText('Check my chain'));
    expect($('[data-chain-error]').getAttribute('data-chain-error')).toBe('leftover');
    await click(byText('+ Add a factor'));
    await typeInto(byLabel('Factor 2 top number'), '3600');
    await choose(byLabel('Factor 2 top unit'), 'sec');
    await typeInto(byLabel('Factor 2 bottom number'), '1');
    await choose(byLabel('Factor 2 bottom unit'), 'hr');
    await click(byText('Check my chain'));
    expect($('[data-chain-error]').getAttribute('data-chain-error')).toBe('upsideDown');
    await click(byLabel('Flip factor 2 upside down'));
    await click(byText('Check my chain'));
    expect($('[data-chain-ok]')).toBeTruthy();
    await click(byText('Check my chain'));
    expect(app.xp.filter((x) => x.reason === 'factor chain')).toHaveLength(1);
    expect(app.latest.badges.chainBuilder).toBe(true);
    await choose($('#uc-chain-preset'), 'ft→cm');
    // Stage C (2026-11-03): "Show a correct chain" appears after two wrong checks.
    expect(byText('Show a correct chain')).toBeUndefined();
    await typeInto(byLabel('Factor 1 top number'), '12');
    await choose(byLabel('Factor 1 top unit'), 'in');
    await typeInto(byLabel('Factor 1 bottom number'), '1');
    await choose(byLabel('Factor 1 bottom unit'), 'ft');
    await click(byText('Check my chain'));
    expect(byText('Show a correct chain')).toBeUndefined();
    await click(byText('Check my chain'));
    await click(byText('Show a correct chain'));
    expect($('[data-chain-ok]')).toBeTruthy();
    await click(byText('Check my chain'));
    expect(app.xp.filter((x) => x.reason === 'factor chain')).toHaveLength(1);
  });
});

describe('estimation', () => {
  it('pays 1 XP for a good estimate, once', async () => {
    const app = await mount({ unitConvert: { tab: 'estimate' } });
    await click(byText('Start estimating'));
    const est = app.latest.estimate.item;
    const right = $$('[role="group"] button').find((b) => b.textContent.startsWith(C.formatUnitNumber(est.correct, 'auto') + ' '));
    await click(right);
    expect(app.latest.estimate.right).toBe(true);
    expect(app.xp).toEqual([{ id: 'unitConvert', pts: 1, reason: 'estimate' }]);
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, estimate: { item: est, choice: null } } })));
    await click($$('[role="group"] button').find((b) => b.textContent.startsWith(C.formatUnitNumber(est.correct, 'auto') + ' ')));
    expect(app.xp).toHaveLength(1);
  });
});

describe('teacher hooks', () => {
  it('shows no teacher panel to students', async () => {
    await mount({ unitConvert: { tab: 'quiz' } });
    expect($('[data-unitconvert-teacher]')).toBeNull();
  });

  it('locks the level, turns off reveals, and summarises missed items', async () => {
    const it2 = item('b45', 'bigToSmall');
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, it2, { predict: 'bigger' }) } }, { isTeacherMode: true });
    expect($('[data-unitconvert-teacher]')).toBeTruthy();
    await choose($('#uc-teacher-band'), 'b8');
    expect(app.latest.teacher.lockBand).toBe('b8');
    expect(byText('Grades 4–5: one system').disabled).toBe(true);
    await click(byText('Allow "Show the answer"', 'label').querySelector('input'));
    expect(app.latest.teacher.noReveal).toBe(true);
    await typeInto(byLabel('Quiz answer'), String(it2.a / 10 + 0.5));
    await click(byText('Check answer'));
    expect(byText('Show the answer')).toBeUndefined();
    await typeInto(byLabel('Quiz answer'), '0.5');
    await click(byText('Check answer'));
    expect(app.latest.quiz.answered).toBe(false);
    await typeInto(byLabel('Quiz answer'), String(it2.a));
    await click(byText('Check answer'));
    expect($('[data-unitconvert-teacher]').textContent).toContain('Fixed on 2nd try');
    await click(byText('Clear summary'));
    await click(byText('Yes, clear'));
    expect(app.latest.missed).toEqual([]);
  });
});

describe('cross-link to Ratios Lab', () => {
  it('offers Ratios Lab on rate items when the host can load it', async () => {
    window.StemLab.registerTool('ratioLab', { render: () => null });
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign(item('b67', 'unitRate'), { predict: 'smaller' }) } });
    await click(byText('Open Ratios Lab'));
    expect(app.opened).toEqual(['ratioLab']);
  });
});

describe('mount sweep', () => {
  it('mounts every tab, in every mode, with no console errors or warnings', async () => {
    const errors = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    vi.spyOn(console, 'warn').mockImplementation((...a) => errors.push(a.join(' ')));
    const modes = [{}, { isTeacherMode: true }, { isContrast: true }, { isDark: true }, { gradeBand: 'k2' }, { gradeBand: 'g912', callGemini: () => new Promise(() => {}) }];
    const states = [
      { tab: 'convert', category: 'temperature', value: 32, fromUnit: '°F', toUnit: 'K' },
      { tab: 'convert', category: 'area', value: 2, fromUnit: 'acre', toUnit: 'm²', predictBeforeConvert: true },
      { tab: 'table', category: 'volume', value: 3, fromUnit: 'imp gal', toUnit: 'gal' },
      { tab: 'quiz' }, { tab: 'quiz', quiz: { q: 'How many inches in 1 foot?', a: 12, unit: 'in', tol: 0.01, answered: true, correct: false, fb: 'x' } },
      { tab: 'wordproblem' }, { tab: 'magHunt', magHunt: { sourceExp: -3, targetExp: 9, log: [{ s: 0, t: 3, m: 'small' }] } },
      { tab: 'chain' }, { tab: 'estimate' }, { tab: 'not-a-tab', category: 'nonsense', fromUnit: 'zz', value: 'x', chain: { from: 'bogus', steps: 'no' }, estimate: { item: null } }
    ];
    for (const mode of modes) {
      for (const st of states) {
        if (root) { await React.act(() => root.unmount()); root = null; }
        document.body.innerHTML = '<div id="root"></div>';
        await mount({ unitConvert: st }, mode);
        expect(document.querySelector('[role="tabpanel"]'), JSON.stringify([mode, st])).toBeTruthy();
        expect(document.body.innerHTML).not.toMatch(/NaN|undefined|\[object Object\]|e\+\d/);
      }
    }
    // Generated items render for every band and kind.
    for (const band of ['b45', 'b67', 'b8']) {
      for (const kind of C.practiceKinds[band]) {
        if (root) { await React.act(() => root.unmount()); root = null; }
        document.body.innerHTML = '<div id="root"></div>';
        const x = item(band, kind);
        await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, x, { predict: 'bigger', answered: true, correct: false, revealed: true, lastMis: x.traps[0] ? x.traps[0].id : 'generic' }) } });
        expect(document.body.textContent, kind).toContain('Worked solution');
        expect(document.body.innerHTML, kind).not.toMatch(/NaN|undefined|\{[a-zA-Z]+\}/);
      }
    }
    expect(errors).toEqual([]);
  });
});
