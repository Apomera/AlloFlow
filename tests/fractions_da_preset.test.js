// Dynamic Assessment opens Fraction Lab with preset { numerator, denominator, tab }
// (dynamic_assessment_module.js sanitizeManipulativePreset and its teacher editor).
// misc_handlers_module.js merges that over toolData._fractions, so old `pieces` survive
// the merge and nothing writes navMode. The tool must show the preset's fraction on the
// preset's activity, once, and then leave the student's changes alone.
// FRACTIONS_DA_SRC points the suite at another copy for the fail-first proof.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.FRACTIONS_DA_SRC || 'stem_lab/stem_tool_fractions.js';
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : /create.*Gradient/.test(k) ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 20 }) : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'fractions');
  window.__fracTabTracked = true;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  if (window._fracKbHandler) { window.removeEventListener('keydown', window._fracKbHandler); window._fracKbHandler = null; }
  vi.restoreAllMocks();
});

// Same merge as misc_handlers_module.js for a 'manipulative-resource'.
function mergePreset(prev, preset) {
  return Object.assign({}, prev, { _fractions: Object.assign({}, (prev && prev._fractions) || {}, preset) });
}

async function mount(saved, overrides = {}) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  let latest, setter;
  function App() {
    const [state, setState] = React.useState({ _fractions: Object.assign({}, saved) });
    latest = state._fractions; setter = setState;
    return window.StemLab._registry.fractions.render(makeCtx({ toolData: state, setToolData: setState, addToast: () => {}, ...overrides }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return {
    state: () => latest,
    open: async (preset) => { await React.act(async () => { setter((prev) => mergePreset(prev, preset)); }); },
    poke: async () => { await React.act(async () => { setter((prev) => Object.assign({}, prev, { unrelated: Math.random() })); }); },
  };
}

const heading = () => document.getElementById('fraction-practice-title')?.textContent;
const activity = () => document.querySelector('#fraction-activity-list [aria-selected="true"]')?.id;
const focusMode = () => document.querySelector('.fraction-lab-goals [aria-selected="true"]')?.id;
const buttonLabelled = (label) => document.querySelector('[aria-label="' + label + '"]');
async function click(el) { expect(!!el).toBe(true); await React.act(async () => el.click()); }

describe('Fraction Lab Dynamic Assessment preset: the fraction', () => {
  it('the assessment module and host still send what this tool has to accept', () => {
    const da = readFileSync('dynamic_assessment_module.js', 'utf8');
    expect(da.includes('return { numerator: num, denominator: den, tab: fTab };')).toBe(true);
    expect(da.includes('var F_TABS = { practice: 1, compare: 1, wall: 1, operations: 1, equivalents: 1, converter: 1 };')).toBe(true);
    const host = readFileSync('misc_handlers_module.js', 'utf8');
    expect(host.includes('[presetKey]: Object.assign({}, (prev && prev[presetKey]) || {}, incomingPreset)')).toBe(true);
  });

  it('with no preset the default is still 3/8', async () => {
    await mount({});
    expect(heading()).toBe('3/8 of the whole');
  });

  it('a teacher\'s 3/4 opens showing 3/4 and is folded into pieces', async () => {
    const t = await mount({ numerator: 3, denominator: 4, tab: 'practice' });
    expect(heading()).toBe('3/4 of the whole');
    expect(t.state().pieces).toEqual({ numerator: 3, denominator: 4 });
    expect(t.state().numerator).toBeUndefined();
    expect(t.state().denominator).toBeUndefined();
  });

  it('beats pieces saved earlier, and a second assessment item opens on ITS fraction', async () => {
    const t = await mount({ pieces: { numerator: 2, denominator: 5 } });
    expect(heading()).toBe('2/5 of the whole');
    await t.open({ numerator: 3, denominator: 4, tab: 'practice' });
    expect(heading()).toBe('3/4 of the whole');
    await t.open({ numerator: 5, denominator: 6, tab: 'practice' });
    expect(heading()).toBe('5/6 of the whole');
    expect(t.state().pieces).toEqual({ numerator: 5, denominator: 6 });
  });

  it('the student can change it and it does not snap back, until the item is opened again', async () => {
    const t = await mount({ numerator: 3, denominator: 4, tab: 'practice' });
    await click(buttonLabelled('Set fraction to 1/2'));
    expect(heading()).toBe('1/2 of the whole');
    await t.poke();
    await t.poke();
    expect(heading()).toBe('1/2 of the whole');
    expect(t.state().pieces).toEqual({ numerator: 1, denominator: 2 });
    await t.open({ numerator: 3, denominator: 4, tab: 'practice' });
    expect(heading()).toBe('3/4 of the whole');
  });

  it('keeps an improper fraction, and the slider can reach it', async () => {
    await mount({ numerator: 5, denominator: 4, tab: 'practice' });
    expect(heading()).toBe('5/4 of the whole');
    expect(document.getElementById('root').textContent.includes('Mixed number: 1 1/4')).toBe(true);
    expect(document.getElementById('fraction-practice-numerator').getAttribute('max')).toBe('5');
  });

  it('drops a challenge left open, whose answer belonged to the old pieces', async () => {
    const t = await mount({ pieces: { numerator: 2, denominator: 5 }, challenge: { type: 'visual', question: 'How many pieces are filled?', answer: 2 }, answer: '2' });
    expect(document.getElementById('root').textContent.includes('How many pieces are filled?')).toBe(true);
    await t.open({ numerator: 3, denominator: 4, tab: 'practice' });
    expect(document.getElementById('root').textContent.includes('How many pieces are filled?')).toBe(false);
    expect(t.state().challenge).toBe(null);
  });

  // [numerator, denominator, expected pieces]; the tool's denominators run 2-20.
  it.each([
    ['3', '4', [3, 4]],
    [3.4, 4.2, [3, 4]],
    [0, 4, [0, 4]],
    [3, 25, [3, 20]],
    [3, 99, [3, 20]],
    [3, 1e9, [3, 20]],
    [999, 4, [20, 4]],
    [1, 1, [1, 2]],
  ])('a usable preset %s/%s is held inside the tool\'s bounds', async (numerator, denominator, [n, d]) => {
    const t = await mount({ numerator, denominator, tab: 'practice' });
    expect(t.state().pieces).toEqual({ numerator: n, denominator: d });
    expect(heading()).toBe(n + '/' + d + ' of the whole');
  });

  it.each([
    ['abc', 4], [3, 'abc'], ['', 4], [3, ''], [3, 0], [3, -4], [-3, 4],
    [NaN, 4], [3, NaN], [Infinity, 4], [3, Infinity], [3, null], [null, 4],
    [{}, 4], [3, []], [[3], 4], [true, 4], ['3/4', 4],
  ])('an unusable preset %s/%s keeps the saved fraction and does not linger', async (numerator, denominator) => {
    const t = await mount({ pieces: { numerator: 2, denominator: 5 }, numerator, denominator, tab: 'practice' });
    expect(heading()).toBe('2/5 of the whole');
    expect(t.state().pieces).toEqual({ numerator: 2, denominator: 5 });
    expect(t.state().numerator).toBeUndefined();
    expect(t.state().denominator).toBeUndefined();
  });

  it('an unusable preset with nothing saved falls back to the default', async () => {
    await mount({ numerator: 'x', denominator: 0 });
    expect(heading()).toBe('3/8 of the whole');
  });
});

describe('Fraction Lab Dynamic Assessment preset: the tab', () => {
  const TABS = [['practice', 'learn'], ['wall', 'learn'], ['compare', 'practice'], ['operations', 'practice'], ['equivalents', 'practice'], ['converter', 'practice']];

  it.each(TABS)('tab %s opens that activity under its own mode (%s) on a fresh start', async (tab, group) => {
    await mount({ numerator: 3, denominator: 4, tab });
    expect(activity()).toBe('fraction-section-tab-' + tab);
    expect(focusMode()).toBe('fraction-mode-tab-' + group);
    expect(document.querySelector('[data-fraction-guidance]').getAttribute('data-fraction-guidance')).toBe(tab);
  });

  it.each(TABS)('tab %s opens that activity from a student left elsewhere', async (tab, group) => {
    const t = await mount({ navMode: 'teacher', tab: 'myAccount' });
    await t.open({ numerator: 3, denominator: 4, tab });
    expect(activity()).toBe('fraction-section-tab-' + tab);
    expect(focusMode()).toBe('fraction-mode-tab-' + group);
  });

  it.each(['compare', 'operations', 'equivalents'])('%s starts with the preset as Fraction A and keeps Fraction B', async (tab) => {
    const t = await mount({ num1: 1, den1: 2, num2: 7, den2: 9, quiz: { answered: false, answer: 'x' }, opInputDraft: { key: 'old', values: { den2: '' } } });
    await t.open({ numerator: 3, denominator: 4, tab });
    expect(t.state()).toMatchObject({ num1: 3, den1: 4, num2: 7, den2: 9, quiz: null, opInputDraft: null });
    const a = document.querySelector('#fraction-section-panel input[aria-label$="numerator"]');
    expect(a.value).toBe('3');
  });

  it('a compare preset that names both fractions shows both', async () => {
    const t = await mount({ num1: 1, den1: 2, num2: 7, den2: 9 });
    await t.open({ numerator: 3, denominator: 4, num2: 5, den2: 8, tab: 'compare' });
    expect(t.state()).toMatchObject({ num1: 3, den1: 4, num2: 5, den2: 8 });
    const values = [...document.querySelectorAll('#fraction-section-panel input[aria-label$="numerator"], #fraction-section-panel input[aria-label$="denominator"]')].map((el) => el.value);
    expect(values.slice(0, 4)).toEqual(['3', '4', '5', '8']);
  });

  it('converter starts on the preset, in the direction that shows it', async () => {
    const t = await mount({ convNum: 9, convDen: 10, convDirection: 'decToFrac' });
    await t.open({ numerator: 5, denominator: 6, tab: 'converter' });
    expect(t.state()).toMatchObject({ convNum: 5, convDen: 6, convDirection: 'fracToDec' });
    expect(buttonLabelled('Converter numerator').value).toBe('5');
    expect(buttonLabelled('Converter denominator').value).toBe('6');
  });

  it('wall highlights the preset and drops a half-made comparison', async () => {
    const t = await mount({ wallCompareA: { n: 1, d: 2 } });
    await t.open({ numerator: 3, denominator: 4, tab: 'wall' });
    expect(t.state()).toMatchObject({ wallHighlight: { n: 3, d: 4 }, wallCompareA: null, wallCompareB: null });
    expect(document.getElementById('fraction-section-panel').textContent.includes('equivalent to 3/4')).toBe(true);
  });

  it('wall has no length for an improper fraction, so nothing is highlighted', async () => {
    const t = await mount({ numerator: 5, denominator: 4, tab: 'wall' });
    expect(t.state().wallHighlight).toBe(null);
  });

  it('leaving the preset\'s activity sticks', async () => {
    const t = await mount({ numerator: 3, denominator: 4, tab: 'compare' });
    await click(document.getElementById('fraction-mode-tab-apply'));
    await t.poke();
    expect(focusMode()).toBe('fraction-mode-tab-apply');
    expect(activity()).toBe('fraction-section-tab-wordproblems');
    await click(document.getElementById('fraction-mode-tab-practice'));
    await click(document.getElementById('fraction-section-tab-converter'));
    await t.poke();
    expect(activity()).toBe('fraction-section-tab-converter');
    expect(focusMode()).toBe('fraction-mode-tab-practice');
  });

  it('a mode saved without a tab still opens that mode', async () => {
    await mount({ navMode: 'teacher' }, { isTeacherMode: true });
    expect(focusMode()).toBe('fraction-mode-tab-teacher');
  });

  it.each(['constructor', '__proto__', 'toString', 'nonsense', 7, true])('an unknown saved tab %s opens the mode\'s first activity', async (bad) => {
    await mount({ tab: bad });
    expect(activity()).toBe('fraction-section-tab-practice');
    expect(focusMode()).toBe('fraction-mode-tab-learn');
    expect(heading()).toBe('3/8 of the whole');
  });

  it.each(['constructor', '__proto__', 'toString', 'nonsense', 7])('an unknown saved mode %s opens Learn instead of crashing', async (bad) => {
    await mount({ navMode: bad });
    expect(focusMode()).toBe('fraction-mode-tab-learn');
    expect(activity()).toBe('fraction-section-tab-practice');
  });
});
