// Independent hunt of the Unit Converter engagement build (2026-11-04). Every
// test here failed on the hunt's start copy unless it is marked GUARD (those
// pin behaviour the hunt checked and found right).
// UNITCONVERT_DEEP_SRC points the suite at another copy to prove fail-first.
import fs from 'node:fs';
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
  const defer = extra.deferSet;
  function App() {
    const [state, setState] = React.useState(seed);
    out.latest = state.unitConvert || {};
    const set = defer ? (f) => { setTimeout(() => React.act(() => setState(f)), defer); } : setState;
    return window.StemLab._registry.unitConvert.render(makeCtx(Object.assign({ toolData: state }, extra, { setToolData: set })));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
async function unmount() {
  await React.act(() => root.unmount());
  root = null;
  document.body.innerHTML = '<div id="root"></div>';
}
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
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
const open = (category, value, fromUnit, toUnit, more = {}) => ({ unitConvert: Object.assign({ tab: 'convert', guessFirst: true, category, value, fromUnit, toUnit }, more) });
const lockAt = (category, value, fromUnit, toUnit, guess) => {
  const k = C.guessIndexNear(guess);
  return open(category, value, fromUnit, toUnit, { guess: { sig: JSON.stringify([category, value, fromUnit, toUnit]), k, locked: true } });
};

// What a progress-only reload restores, from the host's real list and rules
// (stem_lab_module.js: _MATH_PROGRESS_SAVED, _mpClean, _mpRecord).
const moduleSource = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const specText = moduleSource.match(/unitConvert: (\{ badges: 'flags'[^}]*\})/)[1];
const SPEC = Function('return ' + specText)();
function reloadBucket(saved) {
  const out = {};
  let any = false;
  const count = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e9;
  Object.keys(SPEC).forEach((f) => {
    if (!Object.prototype.hasOwnProperty.call(saved, f)) return;
    const v = saved[f];
    let c;
    if (SPEC[f] === 'count') c = count(v) ? v : undefined;
    else if (SPEC[f] === 'flag') c = v === true ? true : undefined;
    else c = v && typeof v === 'object' ? v : undefined;
    if (c !== undefined) { out[f] = c; any = true; }
  });
  return any ? { unitConvert: out } : {};
}

describe('the guess-first choice across a progress-only reload', () => {
  it('a student who turned it off, with nothing else saved, still has it off', async () => {
    const app = await mount({});
    expect($('#uc-guess-slider')).toBeTruthy();
    await click($('[data-guess-toggle]'));
    expect($('#uc-guess-slider')).toBeNull();
    const reloaded = reloadBucket(app.latest);
    await unmount();
    await mount(reloaded);
    expect($('#uc-guess-slider'), 'switched back on by the reload').toBeNull();
    expect($('[data-guess-toggle]').checked).toBe(false);
  });
  it('GUARD: a new student who only opened a tab, and one who turned it back on, stay on', async () => {
    const app = await mount({});
    await click($('[data-guess-toggle]'));
    await click($('[data-guess-toggle]'));
    expect($('#uc-guess-slider')).toBeTruthy();
    const reloaded = reloadBucket(app.latest);
    await unmount();
    await mount(reloaded);
    expect($('#uc-guess-slider')).toBeTruthy();
  });
  it('GUARD: guessCount keeps the tick, and a reload asks for a new guess (the lock is not saved)', async () => {
    const reloaded = reloadBucket({ guessCount: 2, guessFirst: true, guess: { locked: true, sig: 'x', k: 1 }, stack: { pair: 'cm|m', n: 5 } });
    expect(Object.keys(reloaded.unitConvert).sort()).toEqual(['guessCount', 'guessFirst']);
    await mount(reloaded);
    expect($('#uc-guess-slider')).toBeTruthy();
    expect($('[data-path-next]').getAttribute('data-path-next')).not.toBe('guess');
  });
});

describe('hostile saved state reaching the new code', () => {
  it('GUARD: damaged guess, stack and count values mount, and the result stays hidden', async () => {
    const sig = JSON.stringify(['length', 1, 'm', 'cm']);
    const seeds = [
      { guess: 'x', stack: 5, guessCount: -3 },
      { guess: { sig, k: 'NaN', locked: 'yes' }, stack: { pair: 5, n: 'abc' }, guessCount: 'many' },
      { guess: { sig, k: Infinity }, stack: { pair: 'cm|m', n: 1e9 }, guessCount: null, pathCollapsed: 'x' },
      { guess: null, stack: null, guessFirst: true }
    ];
    for (const more of seeds) {
      await mount(open('length', 1, 'm', 'cm', more));
      expect($('#uc-guess-slider'), JSON.stringify(more)).toBeTruthy();
      expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Result hidden while you predict');
      await unmount();
    }
  });
  it('GUARD: guess-first set to anything but true on a saved record is off, without a crash', async () => {
    await mount(open('length', 1, 'm', 'cm', { guessFirst: 'yes' }));
    expect($('#uc-guess-slider')).toBeNull();
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 100 cm');
  });
});

describe('the first thing a new student does keeps the pair on screen', () => {
  it('choosing a To unit first does not change From (1 m stays 1 m)', async () => {
    const app = await mount({});
    expect($('#unitconvert-from').value).toBe('m');
    await choose($('#unitconvert-to'), 'mm');
    expect($('#unitconvert-from').value, 'From jumped').toBe('m');
    expect(app.latest.fromUnit).toBe('m');
  });
  it('turning guess-first off first still shows 1 m in cm', async () => {
    await mount({});
    await click($('[data-guess-toggle]'));
    expect($('[data-unit-result]').getAttribute('aria-label')).toBe('Converted result: 100 cm');
  });
});

describe('nothing announces or shows the result before the lock', () => {
  it('a new unit after a lock is not announced before its new guess', async () => {
    const app = await mount(lockAt('length', 1, 'm', 'cm', 100));
    expect($('[data-guess-result]')).toBeTruthy();
    await choose($('#unitconvert-to'), 'mm');
    expect($('#uc-guess-slider')).toBeTruthy();
    expect(app.said.join(' | '), 'To unit').not.toContain('1,000');
    await click($('[aria-label="Swap units"]'));
    expect($('#uc-guess-slider')).toBeTruthy();
    expect(app.said.join(' | '), 'Swap').not.toContain('0.001');
    await choose($('#unitconvert-from'), 'km');
    expect(app.said.join(' | '), 'From unit').not.toContain('Converted result');
  });
  it('GUARD: with guess-first off, a unit change is still announced', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    await choose($('#unitconvert-to'), 'mm');
    expect(app.said[app.said.length - 1]).toBe('Converted result: 1 m is 1,000 mm.');
  });
  it('the ton and tonne option labels do not print the factor while a guess is open', async () => {
    await mount(open('weight', 1, 'ton', 'lb'));
    expect($('#unitconvert-from').textContent.includes('2,000'), 'ton to lb').toBe(false);
    await click($('[data-guess-lock]'));
    expect($('#unitconvert-from').textContent.includes('2,000'), 'label back after the lock').toBe(true);
    await unmount();
    await mount(open('weight', 1, 't', 'kg'));
    expect($('#unitconvert-from').textContent.includes('1,000'), 't to kg').toBe(false);
  });
  it('typing 0 on the way to 0.5 does not flash the factor', async () => {
    await mount(open('length', 1, 'm', 'cm'));
    await typeInto($('#unitconvert-value'), '0');
    expect($('#uc-guess-slider')).toBeNull();
    const text = document.body.textContent;
    expect(text.includes('Dimensional Analysis'), 'factor card').toBe(false);
    expect(text.includes('× 100'), 'equation').toBe(false);
    expect($('[data-unit-size-model]')).toBeNull();
    expect($('[data-guess-panel]').textContent).toContain('Type a number above 0');
    await typeInto($('#unitconvert-value'), '0.5');
    expect($('#uc-guess-slider')).toBeTruthy();
  });
  it('the pico-to-tera scale (kilo 10 cubed, each step 1,000) waits for the lock', async () => {
    await mount(open('length', 1, 'km', 'm'), { gradeBand: 'g68' });
    expect($('canvas'), 'shown with the guess open').toBeNull();
    await click($('[data-guess-lock]'));
    expect($('canvas')).toBeTruthy();
  });
  it('the AI tutor is not handed the result while a guess is open', async () => {
    const prompts = [];
    const callGemini = (p) => { prompts.push(p); return Promise.resolve('tip'); };
    await mount(open('length', 3, 'm', 'cm'), { callGemini, aiHintsEnabled: true });
    await click($('[aria-label="Ask AI Tutor"]'));
    await tick();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].includes('300'), prompts[0]).toBe(false);
    expect(prompts[0]).toContain('do NOT state');
    await click($('[data-guess-lock]'));
    await click($('[aria-label="Ask Again"]'));
    await tick();
    expect(prompts[1]).toContain('300');
  });
  it('the First Convert badge waits for a real conversion', async () => {
    const app = await mount(open('length', 1, 'm', 'cm'));
    await typeInto($('#unitconvert-value'), '2');
    expect(app.latest.badges && app.latest.badges.firstConvert, 'before the lock').toBeFalsy();
    await click($('[data-guess-lock]'));
    expect(app.latest.badges.firstConvert).toBe(true);
    expect(app.xp).toEqual([]);
  });
  it('GUARD: no number in the guess panel or slider depends on the pair before the lock', async () => {
    const seen = [];
    for (const to of ['mm', 'cm', 'km', 'mi']) {
      await mount(open('length', 3, 'm', to));
      const s = $('#uc-guess-slider');
      seen.push([s.min, s.max, s.value].join());
      await unmount();
    }
    expect(new Set(seen).size).toBe(1);
  });
  it('GUARD: every stacker bar holds the count the factor table gives, for all 14 pairs', () => {
    expect(C.stackPairs).toHaveLength(14);
    for (const p of C.stackPairs) {
      const f = C.factors[p.cat];
      expect(Math.abs(C.stackCount(p) - f[p.big] / f[p.small]), p.id).toBeLessThan(1e-9);
    }
  });
});

describe('how close: the words match the numbers', () => {
  it('a far guess names the factor it is really off by', async () => {
    for (const [guess, times, word] of [[2000, '20', 'big'], [5000, '50', 'big'], [10000, '100', 'big'], [5, '20', 'small'], [2, '50', 'small']]) {
      await mount(lockAt('length', 1, 'm', 'cm', guess));
      expect($('[data-guess-result]').textContent, String(guess)).toContain('about ' + times + ' times too ' + word);
      await unmount();
    }
  });
  it('a guess exactly 2 times off is not called less than 2 times off', async () => {
    await mount(lockAt('length', 1, 'm', 'cm', 200));
    expect(C.guessCloseness(200, 100).factor).toBe(2);
    expect($('[data-guess-result]').textContent.includes('less than 2 times'), 'wording').toBe(false);
    expect($('[data-guess-result]').textContent).toContain('within 2 times');
  });
  it('a huge number cannot build an endless scale (the slider stops short of Infinity)', () => {
    for (const v of [1e305, 1e308, 1e300]) {
      const s = C.guessScale('length', v);
      expect(Number.isFinite(C.guessValueAt(s.max)), String(v)).toBe(true);
      expect(s.start >= s.min && s.start <= s.max).toBe(true);
    }
    const tiny = C.guessScale('length', 1e-299);
    expect(C.guessValueAt(tiny.min) > 0).toBe(true);
    expect(C.guessValueAt(tiny.min) >= 1e-300).toBe(true);
  });
  it('a wide comparison keeps its tick labels few enough to read', async () => {
    await mount(lockAt('area', 1, 'mm²', 'km²', 5e12));
    expect($('[data-guess-result]').textContent).toContain('times too big');
    const labels = $$('[data-guess-compare] [aria-hidden="true"] span');
    expect(labels.length).toBeGreaterThan(1);
    expect(labels.length, labels.map((n) => n.textContent).join(' ')).toBeLessThanOrEqual(5);
    for (const n of labels) expect(n.textContent.length, n.textContent).toBeLessThanOrEqual(6);
  });
  it('GUARD: comma locales and es-419 round-trip through the box, the slider and the stacker', async () => {
    const es = await mount({ unitConvert: { tab: 'convert', guessFirst: true, category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } }, { lang: 'Spanish' });
    await typeInto($('#unitconvert-value'), '1,500');
    expect(es.latest.value).toBe(1500);
    expect($('#uc-guess-title').textContent).toContain('1,500 m');
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(100000)));
    expect($('#uc-guess-slider').getAttribute('aria-valuetext')).toBe('about 100,000 cm');
    await click($('[data-guess-lock]'));
    expect($('[data-guess-result]').textContent).toContain('150,000 cm');
    await choose($('#uc-stack-pair'), 'in|yd');
    await click($('[data-stack-add="10"]'));
    expect($('[data-stack-count]').textContent).toBe('Count: 10 in');
    await unmount();
    const de = await mount({ unitConvert: { tab: 'convert', guessFirst: true, category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } }, { lang: 'German' });
    await typeInto($('#unitconvert-value'), '1,5');
    expect(de.latest.value).toBe(1.5);
    expect($('#uc-guess-title').textContent).toContain('1,5 m');
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
    expect($('#uc-guess-slider').getAttribute('aria-valuetext')).toBe('about 1.000 cm');
    await click($('[data-guess-lock]'));
    expect($('[data-guess-result]').textContent).toContain('150 cm');
  });
});

describe('the path tick and the Start button', () => {
  it('Lock with the slider never moved shows the result but earns no tick', async () => {
    const app = await mount(open('length', 1, 'm', 'cm'));
    await click($('[data-guess-lock]'));
    expect($('[data-guess-result]')).toBeTruthy();
    expect(app.latest.guessCount || 0).toBe(0);
    expect($('[data-path-next]').getAttribute('data-path-next')).toBe('guess');
    expect($('[data-guess-result]').textContent).toContain('move the slider');
  });
  it('the same unit on both sides earns no tick; a moved guess on two units does, once per guess', async () => {
    const app = await mount(open('length', 1, 'm', 'm'));
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(10)));
    await click($('[data-guess-lock]'));
    expect(app.latest.guessCount || 0).toBe(0);
    await choose($('#unitconvert-to'), 'cm');
    await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(100)));
    await click($('[data-guess-lock]'));
    expect(app.latest.guessCount).toBe(1);
    expect($('[data-path-next]').getAttribute('data-path-next')).not.toBe('guess');
    expect(app.xp).toEqual([]);
  });
  it('a returning student with guess-first off: Start on step 1 opens the guess', async () => {
    const app = await mount({ unitConvert: { tab: 'table', category: 'length', value: 3, fromUnit: 'm', toUnit: 'cm', badges: { firstConvert: true } } });
    expect($('[data-path-go]').getAttribute('data-path-go')).toBe('guess');
    await click($('[data-path-go]'));
    expect(app.latest.tab).toBe('convert');
    expect($('#uc-guess-slider'), 'step 1 is a dead end').toBeTruthy();
  });
  it('Start on step 1 from Temperature opens a measurement that can be guessed', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', guessFirst: true, category: 'temperature', value: -5, fromUnit: '°C', toUnit: 'K' } });
    expect($('#uc-guess-slider')).toBeNull();
    await click($('[data-path-go]'));
    expect(app.latest.category).toBe('length');
    expect($('#uc-guess-slider'), 'no slider after Start').toBeTruthy();
    expect($('[role="alert"]')).toBeNull();
  });
});

describe('the toggle and the stacker in the hand', () => {
  it('keyboard focus stays on the guess toggle when it moves', async () => {
    await mount({});
    const toggle = $('[data-guess-toggle]');
    toggle.focus();
    await click(toggle);
    await tick();
    expect(document.activeElement.getAttribute('data-guess-toggle'), 'off').not.toBeNull();
    await click(document.activeElement);
    await tick();
    expect(document.activeElement.getAttribute('data-guess-toggle'), 'on').not.toBeNull();
  });
  it('focus also follows the toggle when the host re-renders late, and leaves other focus alone', async () => {
    await mount({}, { deferSet: 15 });
    const toggle = $('[data-guess-toggle]');
    toggle.focus();
    await click(toggle);
    await tick(60); // the nested act commits the late render when this one ends
    await tick(250);
    expect($('#uc-guess-slider')).toBeNull();
    expect(document.activeElement.getAttribute('data-guess-toggle'), 'late host').not.toBeNull();
    await click(document.activeElement);
    $('#unitconvert-value').focus();
    await tick(300);
    expect(document.activeElement.id, 'stole focus').toBe('unitconvert-value');
  });
  it('a finger that lands on the slider to scroll the page does not change the guess', async () => {
    const fire = async (el, type, x, y) => {
      await React.act(async () => {
        const ev = new Event(type, { bubbles: true, cancelable: true });
        ev.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
        el.dispatchEvent(ev);
      });
    };
    const app = await mount(open('length', 1, 'm', 'cm'));
    const slider = $('#uc-guess-slider');
    // No guess yet: Chromium sets the value on touchstart, then the page scrolls.
    await fire(slider, 'touchstart', 250, 300);
    await typeInto(slider, '15');
    expect(app.latest.guess.k).toBe(15);
    await fire(slider, 'touchmove', 251, 260);
    expect($('#uc-guess-slider').value, 'guess moved by a scroll').toBe('0');
    await typeInto(slider, '18');
    expect($('#uc-guess-slider').value, 'late slide during the scroll').toBe('0');
    await fire(slider, 'touchend', 251, 200);
    await click($('[data-guess-lock]'));
    expect(app.latest.guessCount || 0, 'a scroll is not a guess').toBe(0);
    await unmount();
    // A guess already made is kept; a sideways drag still moves it.
    const app2 = await mount(open('length', 1, 'm', 'cm'));
    const s2 = $('#uc-guess-slider');
    await typeInto(s2, '6');
    await fire(s2, 'touchstart', 100, 300);
    await typeInto(s2, '-15');
    await fire(s2, 'touchmove', 101, 260);
    expect(app2.latest.guess.k).toBe(6);
    await fire(s2, 'touchend', 101, 200);
    await fire(s2, 'touchstart', 100, 300);
    await typeInto(s2, '-15');
    await fire(s2, 'touchmove', 160, 302);
    await typeInto(s2, '-9');
    await fire(s2, 'touchend', 160, 302);
    expect(app2.latest.guess.k, 'sideways drag').toBe(-9);
  });
  it('reduced motion turned on in the middle of the bar stops it', async () => {
    const listeners = new Set();
    const mq = { matches: false, media: '', addListener() {}, removeListener() {}, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) };
    const saved = window.matchMedia;
    window.matchMedia = () => mq;
    try {
      await mount(open('length', 1, 'm', 'cm'));
      await typeInto($('#uc-guess-slider'), String(C.guessIndexNear(1000)));
      await click($('[data-guess-lock]'));
      await tick(60);
      const bar = $('[data-guess-bar="true"]');
      expect(bar.getAttribute('data-anim')).toBe('run');
      mq.matches = true;
      listeners.forEach((f) => f());
      expect(bar.getAttribute('data-anim'), 'kept running').toBe('none');
      expect(bar.style.transition).toBe('none');
      expect(listeners.size, 'listener left behind').toBe(0);
    } finally { window.matchMedia = saved; }
  });
  it('a touch drag fires no click: the next tap still adds a block', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    const src = $('[data-stack-source]');
    await pointer(src, 'pointerdown', 300, 300);
    await pointer(src, 'pointermove', 200, 200);
    await pointer(src, 'pointerup', 0, 0);
    expect(app.latest.stack.n).toBe(1);
    await tick(350);
    await click(src);
    expect(app.latest.stack.n, 'tap swallowed').toBe(2);
  });
  it('a cancelled drag does not swallow the next tap, even at once', async () => {
    const app = await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    const src = $('[data-stack-source]');
    await pointer(src, 'pointerdown', 300, 300);
    await pointer(src, 'pointermove', 200, 200);
    await pointer(src, 'pointercancel', 200, 200);
    await click(src);
    expect((app.latest.stack || {}).n).toBe(1);
  });
  it('a drag cut off by leaving the tool does not leave its ghost on the page', async () => {
    await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm' } });
    const src = $('[data-stack-source]');
    await pointer(src, 'pointerdown', 300, 300);
    await pointer(src, 'pointermove', 200, 200);
    expect($('[data-stack-ghost]')).toBeTruthy();
    await React.act(() => root.unmount());
    root = null;
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect($('[data-stack-ghost]')).toBeNull();
  });
  it('plural units read right in the count', async () => {
    await mount({ unitConvert: { tab: 'convert', category: 'time', value: 1, fromUnit: 'sec', toUnit: 'min', stack: { pair: 'day|week', n: 3 } } });
    expect($('[data-stack-count]').textContent).toBe('Count: 3 days');
    await click($('[data-stack-add="10"]'));
    expect($('[data-stack-count]').textContent).toBe('Full! 7 days make 1 week.');
    await unmount();
    await mount({ unitConvert: { tab: 'convert', category: 'volume', value: 1, fromUnit: 'mL', toUnit: 'L', stack: { pair: 'cup|qt', n: 1 } } });
    expect($('[data-stack-count]').textContent).toBe('Count: 1 US cup');
  });
  it('in prediction mode the stacker does not ask for a guess that is not there', async () => {
    await mount({ unitConvert: { tab: 'convert', category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm', predictBeforeConvert: true } });
    expect($('#uc-guess-slider')).toBeNull();
    expect($('[data-stack-blocked]').textContent.includes('guess'), $('[data-stack-blocked]').textContent).toBe(false);
    expect($('[data-stack-blocked]').textContent).toContain('prediction');
  });
});
