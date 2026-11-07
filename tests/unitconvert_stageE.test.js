// Unit Converter stage E (2026-11-04, approved by Aaron): plain "Spanish"
// writes numbers the Latin-American way (1,234.5), the style most US
// Spanish-speaking students learned. "Spanish (Castilian)" keeps the Spain
// style (1.234,5). UNITCONVERT_DEEP_SRC points the suite at another copy
// (e.g. the stage-E start file) to confirm each gate fails on the old file.
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
  const out = { latest: null };
  function App() {
    const [state, setState] = React.useState(seed);
    out.latest = state.unitConvert || {};
    return window.StemLab._registry.unitConvert.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: () => {}, announceToSR: () => {}, addToast: () => {} }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const $ = (sel) => document.querySelector(sel);
async function typeInto(input, value) {
  expect(input, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function enter(input) { await React.act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }); }
function practice(band, kind, pred) {
  for (let s = 1; s < 20000; s++) { const x = C.makePracticeItem(band, s, kind); if (pred(x)) return Object.assign(x, { seed: s }); }
  throw new Error('no item');
}

describe('plain "Spanish" uses the Latin-American number style', () => {
  it('Spanish formats 1,234.5 like Spanish (Latin America); Castilian keeps 1.234,5', () => {
    C.setNumberLocale('Spanish');
    expect(C.getNumberLocale()).toMatchObject({ group: ',', decimal: '.' });
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1,234.5');
    expect(C.formatUnitNumber(12345.25, 'auto')).toBe('12,345.25');
    C.setNumberLocale('Spanish (Latin America)');
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1,234.5');
    C.setNumberLocale('Spanish (Castilian)');
    expect(C.getNumberLocale()).toMatchObject({ group: '.', decimal: ',' });
    expect(C.formatUnitNumber(1234.5, 'auto')).toBe('1.234,5');
    // A raw Spain tag passed by a host still means Spain.
    expect(C.resolveNumberLocale('es-ES')).toBe('es-ES');
  });

  it('Spanish reads back every number it shows, and reads 1.5 / 1,500 the Latin-American way', () => {
    C.setNumberLocale('Spanish');
    for (const v of [1500, 1.5, 0.001, 1234.56, 12345, 1234567, 0.0125]) {
      const shown = C.formatUnitNumber(v, 'auto');
      expect(C.parseNumericDraft(shown).value, shown).toBe(v);
    }
    expect(C.parseNumericDraft('1.5')).toMatchObject({ valid: true, value: 1.5 });
    expect(C.parseNumericDraft('1.500')).toMatchObject({ valid: true, value: 1.5 });
    expect(C.parseNumericDraft('1,500')).toMatchObject({ valid: true, value: 1500 });
    expect(C.parseNumericDraft('1,234.56')).toMatchObject({ valid: true, value: 1234.56 });
    expect(C.parseNumericDraft('6.022 × 10^23').value).toBeCloseTo(6.022e23, -19);
    // Castilian keeps its own round trip.
    C.setNumberLocale('Spanish (Castilian)');
    for (const v of [1500, 1.5, 0.001, 1234.56]) {
      const shown = C.formatUnitNumber(v, 'auto');
      expect(C.parseNumericDraft(shown).value, shown).toBe(v);
    }
    expect(C.parseNumericDraft('1.500').value).toBe(1500);
  });

  it('the converter shows 266.1618 mL to a Spanish student', async () => {
    await mount({ unitConvert: { tab: 'convert', category: 'volume', value: 1.125, valueDraft: '1.125', fromUnit: 'cup', toUnit: 'mL' } }, { lang: 'Spanish' });
    expect($('[data-unit-result]').getAttribute('aria-label')).toContain('266.1618 mL');
    expect($('#unitconvert-value').value).toBe('1.125');
  });

  it('a Spanish student typing 4,000 for 4 kg = ? g is right', async () => {
    const item = practice('b45', 'bigToSmall', (x) => x.fromUnit === 'kg' && x.a === 4000);
    const app = await mount({ unitConvert: { tab: 'quiz', quiz: Object.assign({}, item, { predict: item.direction }), fadeByKind: { bigToSmall: 2 } } }, { lang: 'Spanish' });
    await typeInto($('#uc-practice-answer'), '4,000');
    await enter($('#uc-practice-answer'));
    expect(app.latest.quiz.correct).toBe(true);
  });
});
