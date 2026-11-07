// Unit Converter engagement build (2026-11-04): the converter on the first
// screen (one-line hero, Next strip, intro closed), guess first by default
// for a new student (log-scale estimate locked before the result, then the
// true-value bar grows to the real value), the unit stacker, one grade label
// with the band's step 1 opening, and plain Grades 3-5 subtitles.
// UNITCONVERT_DEEP_SRC points the suite at another copy (the build start
// copy) to confirm each gate fails on the old behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.UNITCONVERT_DEEP_SRC || 'stem_lab/stem_tool_unitconvert.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let C;
const savedMatchMedia = window.matchMedia;

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
  window.matchMedia = savedMatchMedia;
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
const byText = (text, sel = 'button') => $$(sel).find((el) => el.textContent.includes(text));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(() => el.click()); }
async function tick(ms = 30) { await React.act(async () => { await new Promise((r) => setTimeout(r, ms)); }); }
async function typeInto(input, value) {
  expect(input, 'input').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function pointer(el, type, x, y) {
  await React.act(async () => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })); });
}
function setReducedMotion(on) {
  window.matchMedia = (q) => ({ matches: on && /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
// Keyboard tab stops before an element, in document order (closed <details>
// content and roving tabindex=-1 tabs do not count).
function tabStopsBefore(target) {
  const all = $$('#root button, #root select, #root input, #root textarea, #root a[href], #root [tabindex], #root summary');
  const stops = all.filter((n) => {
    if (n.disabled || n.type === 'hidden') return false;
    const ti = n.hasAttribute('tabindex') ? Number(n.getAttribute('tabindex')) : 0;
    if (ti < 0) return false;
    const closed = n.closest('details:not([open])');
    if (closed && !(n.tagName === 'SUMMARY' && n.parentElement === closed)) return false;
    return true;
  });
  return stops.indexOf(target);
}
const FRESH = () => ({});

describe('the converter is on the first screen', () => {
  it('a new Grades 3-5 student reaches the value box in 4 tab stops; the hero is one line', async () => {
    await mount(FRESH());
    const value = $('#unitconvert-value');
    expect(value).toBeTruthy();
    const before = tabStopsBefore(value);
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThanOrEqual(4);
    const hero = $('[data-unitconvert-command]');
    expect(hero.textContent).not.toContain('Learning steps');
    expect(hero.textContent).not.toContain('Preserve the quantity');
    expect(hero.querySelectorAll('[data-hero-chip]')).toHaveLength(3);
    // The convert panel is not an extra stop; the intro sits closed below it.
    expect($('[role="tabpanel"]').getAttribute('tabindex')).toBe('-1');
    const intro = $('[data-unitconvert-hero="convert"]');
    expect(intro.tagName).toBe('DETAILS');
    expect(intro.open).toBe(false);
    expect(intro.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
  it('the path is a one-line Next strip; Start takes focus to the activity', async () => {
    const app = await mount(FRESH());
    expect($('#uc-path-list')).toBeNull();
    expect($('[data-path-next]').textContent).toBe('Next: Guess, then check a conversion');
    await click($('[data-path-go]'));
    await tick();
    expect(document.activeElement.id).toBe('unitconvert-value');
    // Once the guess step is done, Start opens the next step's tab and focuses its panel.
    await React.act(() => app.set((s) => ({ ...s, unitConvert: { ...s.unitConvert, guessCount: 1 } })));
    expect($('[data-path-next]').getAttribute('data-path-next')).toBe('time');
    await click($('[data-path-go]'));
    await tick();
    expect(app.latest.tab).toBe('everyday');
    expect(document.activeElement.id).toBe('stem-unitconvert-panel-everyday');
  });
});

describe('guess first, then see it', () => {
  it('the slider estimate is locked before anything shows the result; the lock pays no XP', async () => {
    const app = await mount(FRESH());
    const slider = $('#uc-guess-slider');
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('about 1 cm');
    // Nothing gives the answer away before the lock.
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Result hidden while you predict');
    expect($('[data-equal-quantity-bar]')).toBeNull();
    expect($('[data-unit-size-model]')).toBeNull();
    expect(document.body.textContent).not.toContain('Dimensional Analysis');
    expect(document.body.textContent).toContain('The equation will appear after you lock your guess.');
    expect($('[data-stack-blocked]')).toBeTruthy();
    // Move the guess to 100 cm.
    await typeInto(slider, String(C.guessIndexNear(100)));
    expect($('#uc-guess-slider').getAttribute('aria-valuetext')).toBe('about 100 cm');
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Result hidden while you predict');
    expect(app.latest.guessFirst).toBe(true);
    expect(app.latest.fromUnit).toBe('m');
    await click($('[data-guess-lock]'));
    expect(app.latest.guess.locked).toBe(true);
    expect(app.latest.guessCount).toBe(1);
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 100 cm');
    expect($('[data-guess-result]').getAttribute('data-guess-result')).toBe('exact');
    expect($('[data-equal-quantity-bar]')).toBeTruthy();
    expect($('[data-stack-blocked]')).toBeNull();
    expect(app.said).toContain('Guess locked: about 100 cm. The true value is 100 cm. Exactly right!');
    expect(app.xp).toEqual([]);
    await tick();
    expect(document.activeElement.id).toBe('uc-guess-result');
    // A new number asks for a new guess.
    await typeInto($('#unitconvert-value'), '3');
    expect($('#uc-guess-slider')).toBeTruthy();
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Result hidden while you predict');
  });
  it('a far guess is named, never paid', async () => {
    const app = await mount(FRESH());
    const s = C.guessScale('length', 1);
    await typeInto($('#uc-guess-slider'), String(s.max));
    await click($('[data-guess-lock]'));
    expect($('[data-guess-result]').getAttribute('data-guess-result')).toBe('far');
    expect($('[data-guess-result]').textContent).toContain('times too big');
    expect(app.xp).toEqual([]);
  });
  it('the scale depends only on the category and the typed number, and always reaches the true value', () => {
    for (const cat of Object.keys(C.factors)) {
      if (cat === 'temperature') { expect(C.guessScale(cat, 1)).toBeNull(); continue; }
      const units = Object.keys(C.factors[cat]);
      for (const v of [0.5, 1, 3, 250, 12345]) {
        const s = C.guessScale(cat, v);
        expect(s.start).toBe(C.guessIndexNear(v));
        for (const from of units) for (const to of units) {
          const truth = C.convertUnitValue(v, from, to, cat);
          const k = C.guessIndexNear(truth);
          expect(k >= s.min && k <= s.max, [cat, v, from, to].join(' ')).toBe(true);
        }
      }
    }
    expect(C.guessCloseness(150, 100).level).toBe('close');
    expect(C.guessCloseness(500, 100).level).toBe('size');
    expect(C.guessCloseness(10000, 100)).toMatchObject({ level: 'far', powers: 2, high: true });
  });
  it('numbers on the slider follow the student language (comma locales, es-419)', async () => {
    await mount(FRESH(), { lang: 'German' });
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
    expect($('#uc-guess-slider').getAttribute('aria-valuetext')).toBe('about 1.000 cm');
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    const app = await mount(FRESH(), { lang: 'Spanish' });
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
    expect($('#uc-guess-slider').getAttribute('aria-valuetext')).toBe('about 1,000 cm');
    await click($('[data-guess-lock]'));
    expect(app.latest.guess.locked).toBe(true);
  });
  it('no slider where a guess cannot work: temperature and zero show the result and say why', async () => {
    await mount({ unitConvert: { tab: 'convert', guessFirst: true, category: 'temperature', value: 20, fromUnit: '°C', toUnit: 'K' } });
    expect($('#uc-guess-slider')).toBeNull();
    expect($('[data-guess-panel]').textContent).toContain('no guess slider');
    expect($('[data-unit-result]').getAttribute('aria-label')).toContain('293.15');
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ unitConvert: { tab: 'convert', guessFirst: true, category: 'length', value: 0, fromUnit: 'm', toUnit: 'cm' } });
    expect($('#uc-guess-slider')).toBeNull();
    expect($('[data-guess-panel]').textContent).toContain('Type a number above 0');
  });
  it('a fun fact that names both units waits until the guess is locked', async () => {
    const leak = '4,184 J';
    const seed = { unitConvert: { tab: 'convert', guessFirst: true, category: 'energy', value: 1, fromUnit: 'kcal', toUnit: 'J', factIdx: 2 } };
    await mount(seed);
    expect($('#uc-guess-slider')).toBeTruthy();
    expect(document.body.textContent.includes(leak), 'leaked before the lock').toBe(false);
    await click($('[data-guess-lock]'));
    expect(document.body.textContent.includes(leak), 'shown after the lock').toBe(true);
  });
  it('a returning student keeps the old screen; the toggle turns guessing on', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'm', toUnit: 'cm' } });
    expect($('#uc-guess-slider')).toBeNull();
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 300 cm');
    const toggle = $('[data-guess-toggle]');
    expect(toggle.checked).toBe(false);
    await click(toggle);
    expect(app.latest.guessFirst).toBe(true);
    expect($('#uc-guess-slider')).toBeTruthy();
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Result hidden while you predict');
  });
  it('the true-value bar grows from the guess, and reduced motion is read when it starts', async () => {
    setReducedMotion(false);
    await mount(FRESH());
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
    await click($('[data-guess-lock]'));
    const bar = $('[data-guess-bar="true"]');
    const guessBar = $('[data-guess-bar="guess"]');
    expect(bar.getAttribute('data-anim')).toBe('start');
    expect(bar.style.width).toBe(guessBar.style.width);
    await tick(60);
    expect(bar.getAttribute('data-anim')).toBe('run');
    expect(parseFloat(bar.style.width)).toBeCloseTo(parseFloat(bar.getAttribute('data-target-pct')), 1);
    expect(parseFloat(bar.style.width)).toBeLessThan(parseFloat(guessBar.style.width));
    await React.act(() => root.unmount());
    root = null;
    // Reduced motion switched on: the next reveal jumps straight to the value.
    setReducedMotion(true);
    document.body.innerHTML = '<div id="root"></div>';
    await mount(FRESH());
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
    await click($('[data-guess-lock]'));
    const still = $('[data-guess-bar="true"]');
    expect(still.getAttribute('data-anim')).toBe('none');
    expect(still.style.transition).toBe('none');
    expect(parseFloat(still.style.width)).toBeCloseTo(parseFloat(still.getAttribute('data-target-pct')), 1);
  });
});

describe('unit stacker', () => {
  it('the count that fills the bar is the factor from the tool table', () => {
    const expected = { 'cm|m': 100, 'mm|cm': 10, 'in|ft': 12, 'ft|yd': 3, 'in|yd': 36, 'cup|qt': 4, 'pt|qt': 2, 'cup|pt': 2, 'qt|gal': 4, 'oz|lb': 16, 'sec|min': 60, 'min|hr': 60, 'hr|day': 24, 'day|week': 7 };
    for (const p of C.stackPairs) {
      const f = C.factors[p.cat];
      expect(C.stackCount(p), p.id).toBe(Math.round(f[p.big] / f[p.small]));
      expect(C.stackCount(p), p.id).toBe(expected[p.id]);
    }
    expect(C.stackPairFor('length', 'm', 'cm').id).toBe('cm|m');
    expect(C.stackPairFor('volume', 'qt', 'cup').id).toBe('cup|qt');
    expect(C.stackPairFor('energy', 'J', 'kJ').id).toBe('cm|m');
  });
  it('Add one / Add ten fill 1 m with 100 cm blocks, with a live count and no XP', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    expect($('[data-unit-stacker]').getAttribute('data-unit-stacker')).toBe('cm|m');
    for (let i = 0; i < 9; i++) await click($('[data-stack-add="10"]'));
    expect($('[data-stack-count]').textContent).toBe('Count: 90 cm');
    expect($('[data-stack-bar]').getAttribute('aria-label')).toBe('A 1 m bar with 90 cm blocks in it.');
    expect($$('[data-stack-block]')).toHaveLength(90);
    expect(app.said[app.said.length - 1]).toBe('90 cm blocks in the bar.');
    for (let i = 0; i < 9; i++) await click($('[data-stack-add="1"]'));
    expect($('[data-stack-full]').getAttribute('data-stack-full')).toBe('false');
    await click($('[data-stack-add="10"]'));
    expect($('[data-stack-full]').getAttribute('data-stack-full')).toBe('true');
    expect($('[data-stack-count]').textContent).toBe('Full! 100 cm make 1 m.');
    expect(app.said[app.said.length - 1]).toBe('Full! 100 cm make 1 m.');
    expect($('[data-stack-add="10"]').disabled).toBe(true);
    await click($('[data-stack-add="-1"]'));
    expect(app.latest.stack).toEqual({ pair: 'cm|m', n: 99 });
    expect(app.xp).toEqual([]);
  });
  it('a block dragged into the bar counts once; a tap counts once; cups fill a quart at 4', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    const src = $('[data-stack-source]');
    await pointer(src, 'pointerdown', 300, 300);
    await pointer(src, 'pointermove', 200, 200);
    expect($('[data-stack-ghost]')).toBeTruthy();
    // jsdom lays out nothing: the bar's box is 0,0,0,0, so (0, 0) is over it.
    await pointer(src, 'pointerup', 0, 0);
    await click(src); // the click that ends a drag is not a second block
    expect(app.latest.stack.n).toBe(1);
    expect($('[data-stack-ghost]')).toBeNull();
    await click(src);
    expect(app.latest.stack.n).toBe(2);
    await choose($('#uc-stack-pair'), 'cup|qt');
    expect(app.latest.stack).toEqual({ pair: 'cup|qt', n: 0 });
    await click($('[data-stack-add="10"]'));
    expect($('[data-stack-count]').textContent).toBe('Full! 4 US cups make 1 US qt.');
  });
});

describe('the path and the grade band agree', () => {
  it('step 1 of every band is the converter, and it is the tab a new student opens on', async () => {
    for (const band of ['b45', 'b67', 'b8']) expect(C.learningPathFor(band)[0]).toMatchObject({ id: 'guess', tab: 'convert' });
    expect(C.pathStepDone({ id: 'guess', tab: 'convert' }, {})).toBe(false);
    expect(C.pathStepDone({ id: 'guess', tab: 'convert' }, { guessCount: 1 })).toBe(true);
    for (const gradeBand of ['g35', 'g68', 'g912']) {
      document.body.innerHTML = '<div id="root"></div>';
      await mount(FRESH(), { gradeBand });
      expect($('[role="tab"][aria-selected="true"]').id).toBe('stem-unitconvert-tab-convert');
      await React.act(() => root.unmount());
      root = null;
    }
  });
  it('one grade label: the hero chip and the path say the same band', async () => {
    for (const [gradeBand, label] of [['g35', 'Grades 3–5'], ['g68', 'Grades 6–7'], ['g912', 'Grade 8+']]) {
      document.body.innerHTML = '<div id="root"></div>';
      await mount(FRESH(), { gradeBand });
      expect($('[data-hero-chip="level"]').textContent).toBe('Grade: ' + label);
      expect($('#uc-path-title').textContent).toBe('Start here: ' + label);
      for (const other of ['Grades 3–5', 'Grades 4–5', 'Grades 6–7', 'Grade 8+'].filter((x) => x !== label)) {
        expect($('[data-unitconvert-command]').textContent, other).not.toContain(other);
        expect($('[data-start-here]').textContent, other).not.toContain(other);
      }
      await React.act(() => root.unmount());
      root = null;
    }
  });
  it('the pico-to-tera prefix canvas stays out of Grades 3-5', async () => {
    await mount(FRESH(), { gradeBand: 'g35' });
    expect($('canvas')).toBeNull();
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ unitConvert: { guessFirst: false } }, { gradeBand: 'g68' });
    expect($('canvas')).toBeTruthy();
  });
});

describe('plain Grades 3-5 subtitles', () => {
  it('Grades 3-5 read the plain version; Grades 6+ keep the original', async () => {
    await mount(FRESH(), { gradeBand: 'g35' });
    const intro = $('[data-unitconvert-hero="convert"]');
    expect(intro.textContent).toContain('Convert: same amount, new unit');
    expect(intro.textContent).toContain('Type a number and pick two units. Guess the answer first, then check it.');
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount({ unitConvert: { tab: 'everyday' } }, { gradeBand: 'g35' });
    expect($('[data-unitconvert-hero="everyday"]').textContent).toContain('Pick a kind of problem. Time problems show a number line to help.');
    await React.act(() => root.unmount());
    root = null;
    document.body.innerHTML = '<div id="root"></div>';
    await mount(FRESH(), { gradeBand: 'g68' });
    expect($('[data-unitconvert-hero="convert"]').textContent).toContain('Convert — the math behind units');
  });
});
