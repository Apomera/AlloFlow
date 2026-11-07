// Independent hunt of the Number Line engagement build (2026-11-04).
// NUMBERLINE_HUNT_SRC points the suite at another copy: the hunt's start copy must turn these red.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_HUNT_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null, latest = null, xp = [], sr = [], forceSet = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; sr = [];
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = ''; vi.restoreAllMocks();
  delete window.matchMedia; delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
  delete window.Element.prototype.scrollIntoView;
});

async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline; forceSet = setState;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (id, amt, why) => xp.push([id, amt, why]),
      announceToSR: (m) => sr.push(m), addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => {});
}
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
function ptr(type, x, pointerType) {
  const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 60, button: 0 });
  if (pointerType) Object.defineProperty(ev, 'pointerType', { value: pointerType });
  return ev;
}
async function fire(target, ev) { await React.act(async () => { target.dispatchEvent(ev); }); }
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const landmarkXp = () => xp.filter((x) => x[0] === 'numberlineLandmark');
const box = (el, w, h) => { el.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h }); };
const K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' }, B45 = { gradeBand: 'g35', gradeLevel: '5th Grade' }, B6 = { gradeBand: 'g68', gradeLevel: '6th Grade' };
const narrowScreen = () => { window.matchMedia = (q) => ({ matches: /max-width/.test(q), media: q, addEventListener() {}, removeEventListener() {} }); };
const placeItem = (o) => Object.assign({ v: 2, id: 'hunt-1', type: 'placeWhole', band: 'b23', answer: 'position', tries: 0, target: 7, text: '7', snap: 1, tol: 0.49, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } }, o);
const openPp = (item, extra) => Object.assign({ item, pos: null, text: '', tries: 0, hints: 0, status: 'open', fb: null, exampleOpen: false }, extra);

describe('landmark credit: a stale move never pays', () => {
  it('an arrow key that changed nothing does not arm Reset to pay', async () => {
    // The student set max to 1/2; End moves nothing; Reset then puts the marker on 1/2 again.
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4, fdMin: 0, fdMax: 0.5, fdLastLandmark: '1/2', fdMoreOpen: true }, B45);
    await key(document.querySelector('svg[role="slider"]'), 'End');
    expect(landmarkXp()).toEqual([]);
    await click(btn('Reset Frac Dec tab to defaults'));
    expect(latest.fdValue).toBe(0.5);
    expect(landmarkXp()).toEqual([]);
    expect(Object.keys(latest.fdLandmarksFound || {})).toEqual([]);
  });
  it('a chip right after an arrow key, a tab switch and Reset pay nothing; the arrow key still pays once', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4, fdMoreOpen: true }, B45);
    await key(document.querySelector('svg[role="slider"]'), 'ArrowRight');
    expect(landmarkXp().map((x) => x[2])).toEqual(['landmark 3/4']);
    await click(btn('1 over 4 equals 0.25'));
    await click(document.getElementById('numberline-tab-explore'));
    await click(document.getElementById('numberline-tab-fracdec'));
    await click(btn('Reset Frac Dec tab to defaults'));
    expect(landmarkXp().map((x) => x[2])).toEqual(['landmark 3/4']);
  });
});

describe('touch: a swipe that starts on a line scrolls the page and changes nothing', () => {
  const svgFd = () => document.querySelector('#numberline-panel-fracdec svg[role="slider"]');
  it('every horizontal line lets the page scroll vertically (touch-action: pan-y)', async () => {
    await mount({ tab: 'fracdec' }, B45);
    expect(svgFd().style.touchAction).toBe('pan-y');
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'explore' }, B45);
    expect(document.querySelector('#numberline-panel-explore svg[role="slider"]').style.touchAction).toBe('pan-y');
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem()) }, K2);
    expect(document.querySelector('[data-place-practice] svg[role="slider"]').style.touchAction).toBe('pan-y');
  });
  it('Fractions: touch down then cancel moves nothing and pays nothing', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, B45);
    const s = svgFd(); box(s, 700, 170);
    await fire(s, ptr('pointerdown', 200, 'touch')); // 0.25: a landmark
    expect(latest.fdValue).toBe(0.5);
    await fire(window, ptr('pointercancel', 200, 'touch'));
    expect(latest.fdValue).toBe(0.5);
    expect(landmarkXp()).toEqual([]);
  });
  it('Fractions: the one vertical pointermove Chromium sends before it cancels for a scroll moves nothing', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, B45);
    const s = svgFd(); box(s, 700, 170);
    await fire(s, ptr('pointerdown', 200, 'touch'));
    const up = ptr('pointermove', 201, 'touch'); Object.defineProperty(up, 'clientY', { value: 20 });
    await fire(window, up);
    await fire(window, ptr('pointercancel', 201, 'touch'));
    expect(latest.fdValue).toBe(0.5);
    expect(landmarkXp()).toEqual([]);
  });
  it('Fractions: a tap places on release (once, and focuses the line); a mouse still places on press', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, B45);
    const s = svgFd(); box(s, 700, 170);
    await fire(s, ptr('pointerdown', 200, 'touch'));
    await fire(window, ptr('pointerup', 200, 'touch'));
    expect(latest.fdValue).toBeCloseTo(0.25, 6);
    expect(landmarkXp().map((x) => x[2])).toEqual(['landmark 1/4']);
    expect(document.activeElement).toBe(svgFd());
    await click(btn('2 parts'));
    await fire(svgFd(), ptr('pointerdown', 500, 'mouse'));
    expect(latest.fdValue).toBeCloseTo(0.75, 6);
    await fire(window, ptr('pointerup', 500, 'mouse'));
  });
  it('Place it: touch cancel leaves no marker; a tap places one; a sideways move drags', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem()) }, K2);
    const s = () => document.querySelector('[data-place-practice] svg[role="slider"]');
    box(s(), 700, 150);
    await fire(s(), ptr('pointerdown', 350, 'touch'));
    expect(latest.pp.pos).toBeNull();
    await fire(window, ptr('pointercancel', 350, 'touch'));
    expect(latest.pp.pos).toBeNull();
    await fire(s(), ptr('pointerdown', 350, 'touch'));
    await fire(window, ptr('pointerup', 350, 'touch'));
    expect(latest.pp.pos).toBe(5);
    await fire(s(), ptr('pointerdown', 350, 'touch'));
    await fire(window, ptr('pointermove', 420, 'touch'));
    await fire(window, ptr('pointermove', 490, 'touch'));
    await fire(window, ptr('pointerup', 490, 'touch'));
    expect(latest.pp.pos).toBeGreaterThan(5);
  });
});

describe('the Explore slider lands on what it shows', () => {
  const s = () => document.querySelector('#numberline-panel-explore svg[role="slider"]');
  it('tapping a labelled tick on a range that does not start on a tick value lands on that tick', async () => {
    await mount({ tab: 'explore', range: { min: 7, max: 1007 } });
    box(s(), 700, 120);
    const X = (v) => 40 + (v - 7) / 1000 * 620;
    await fire(s(), ptr('pointerdown', X(100)));
    await fire(window, ptr('pointerup', X(100)));
    expect(latest.exploreProbe).toBe(100);
    expect(s().getAttribute('aria-valuetext')).toBe('Marker at 100');
    await key(s(), 'ArrowRight');
    expect(latest.exploreProbe % 10).toBe(0); // the next small tick, still on the ruling
  });
  it('End and Home reach the true ends of the line', async () => {
    await mount({ tab: 'explore', range: { min: -13, max: 88 } });
    await key(s(), 'End');
    expect(latest.exploreProbe).toBe(88);
    expect(s().getAttribute('aria-valuetext')).toBe('Marker at 88');
    await key(s(), 'Home');
    expect(latest.exploreProbe).toBe(-13);
  });
  it('the slider always fits: no 600 px floor and no sideways-scroll region a touch-action line could trap', async () => {
    await mount({ tab: 'explore' });
    expect(s().style.minWidth === '' || s().style.minWidth === '0px' || s().style.minWidth === '0').toBe(true);
    expect(s().closest('[role="region"][aria-label^="Number line: scroll"]')).toBeNull();
  });
});

describe('the quiet auto-start is not a try', () => {
  it('opening does not tick a type, the 4-types quest or the served count; touching the item does', async () => {
    await mount({ ppSolvedByType: { placeWhole: 2 }, challengeTypesUsed: { placeWhole: true, readScale: true, estimateOpen: true } }, K2);
    expect(latest.pp.item.type).toBe('roundLine');
    const quest = window.StemLab._registry.numberline.questHooks.find((q) => q.id === 'try_4_types');
    expect(Object.keys(latest.challengeTypesUsed).sort()).toEqual(['estimateOpen', 'placeWhole', 'readScale']);
    expect(quest.check(latest)).toBe(false);
    expect(latest.ppStats || {}).toEqual({});
    const input = document.querySelector('[data-place-practice] input[type="text"]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '5');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    expect(latest.challengeTypesUsed.roundLine).toBe(true);
    expect(latest.ppStats.roundLine.served).toBe(1);
    expect(quest.check(latest)).toBe(true);
  });
  it('grade 6 too: reloading cannot collect the two kinds of the next step', async () => {
    await mount({ nlbSolved: { icPlace: 2 }, challengeTypesUsed: {} }, B6);
    expect(latest.tab).toBe('intctx');
    expect(latest.challengeTypesUsed).toEqual({});
  });
  it('a chosen item still counts at once', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: {} }, K2);
    await click(document.querySelector('[data-nl-path-step="roundLine"] button'));
    expect(latest.challengeTypesUsed.roundLine).toBe(true);
    expect(latest.ppStats.roundLine.served).toBe(1);
  });
});

describe('step buttons land on every step', () => {
  it.each([
    ['k2', K2, 'measure', 'measure', 'Start practice'],
    ['k2', K2, 'lineplot', 'measure', 'Get a data set'],
    ['g35', B45, 'dzPlace', 'decimals', 'Start practice'],
    ['g35', B45, 'order', 'order', 'Start practice'],
    ['g68', B6, 'dzCompare', 'decimals', 'Start practice'],
    ['g68', B6, 'order', 'order', 'Start practice'],
  ])('%s %s: focus and scroll reach the activity\'s first control', async (_b, over, step, tab, label) => {
    const scrolled = [];
    window.Element.prototype.scrollIntoView = function (o) { scrolled.push([this, o]); };
    await mount({ tab: 'explore' }, over);
    await click(document.querySelector('[data-nl-path-step="' + step + '"] button'));
    expect(latest.tab).toBe(tab);
    const a = document.activeElement;
    expect(a.textContent.trim()).toBe(label);
    expect(document.getElementById('numberline-panel-' + tab).contains(a)).toBe(true);
    expect(scrolled.some((x) => x[0] === a)).toBe(true);
  });
  it('a compare step lands on its first answer choice', async () => {
    window.Element.prototype.scrollIntoView = function () {};
    await mount({ tab: 'explore' }, B6);
    await click(document.querySelector('[data-nl-path-step="icCompare"] button'));
    const a = document.activeElement;
    expect(a.closest('[role="group"][aria-label="Choose your answer"]')).toBeTruthy();
  });
  it('no focus is stolen on a later render', async () => {
    window.Element.prototype.scrollIntoView = function () {};
    await mount({ tab: 'explore' }, B45);
    await click(document.querySelector('[data-nl-path-step="order"] button'));
    const other = document.querySelector('[role="tab"][aria-selected="true"]');
    other.focus();
    for (let i = 0; i < 10; i++) await React.act(async () => { forceSet((x) => Object.assign({}, x)); });
    expect(document.activeElement).toBe(other);
  });
});

describe('phone Fractions line', () => {
  const labels = () => [...document.querySelectorAll('#numberline-panel-fracdec svg[role="slider"] text')].map((x) => x.textContent);
  it('twelfths on a phone: every other tick is labelled, nothing is rotated, and the caption says so', async () => {
    narrowScreen();
    await mount({ tab: 'fracdec', fdDen: 12, fdValue: 0.5 }, B45);
    const fr = labels();
    expect(fr).toContain('2/12');
    expect(fr).not.toContain('1/12');
    expect(fr).toContain('1');
    expect(document.querySelectorAll('#numberline-panel-fracdec svg[role="slider"] text[transform]').length).toBe(0);
    expect(document.getElementById('numberline-panel-fracdec').textContent).toContain('Every 2 ticks get a label so they fit. Each small tick is 1/12.');
  });
  it('a denominator with no divisor that fits labels the whole numbers only', async () => {
    narrowScreen();
    await mount({ tab: 'fracdec', fdDen: 7, fdValue: 0.5 }, B45);
    expect(labels()).not.toContain('1/7');
    expect(labels()).toContain('0');
    expect(document.getElementById('numberline-panel-fracdec').textContent).toContain('only whole numbers are labelled');
  });
  it('wide screens keep every label', async () => {
    await mount({ tab: 'fracdec', fdDen: 12, fdValue: 0.5 }, B45);
    expect(labels()).toContain('1/12');
    expect(document.getElementById('numberline-panel-fracdec').textContent).not.toContain('get a label so they fit');
  });
});

describe('colours, measured', () => {
  const lum = (hex) => { const n = hex.replace('#', ''); const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rgbHex = (c) => (c.startsWith('#') ? c : '#' + c.match(/\d+/g).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join(''));
  const DARK = Object.assign({}, K2, { isDark: true, theme: 'dark' });
  it('dark theme: the Place-it boxes sit on the host\'s white card, so their ink and borders must read on white', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem(), { pos: 7, tries: 1, status: 'correct', fb: { kind: 'correct', independent: true, xp: 5 } }) }, DARK);
    const said = [...document.querySelectorAll('[data-place-practice] p')].find((p) => /Correct, on your own/.test(p.textContent));
    expect(ratio(rgbHex(said.style.color), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(rgbHex(said.parentElement.style.borderColor), '#ffffff')).toBeGreaterThanOrEqual(3);
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem(), { pos: 3, tries: 1, fb: { kind: 'wrong', close: false, dir: 'left' } }) }, DARK);
    expect(ratio(rgbHex(document.querySelector('[data-pp-mis]').style.borderColor), '#ffffff')).toBeGreaterThanOrEqual(3);
  });
  it('no status box paints a pale inline background that forced contrast-theme text would vanish on', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem(), { pos: 7, tries: 1, status: 'correct', fb: { kind: 'correct', independent: true, xp: 5 } }) }, Object.assign({}, K2, { isContrast: true, theme: 'contrast' }));
    const said = [...document.querySelectorAll('[data-place-practice] p')].find((p) => /Correct, on your own/.test(p.textContent));
    expect(said.parentElement.style.background).toBe('');
  });
  it('filled parts read against empty parts at 3:1 in light and dark', async () => {
    for (const over of [B45, Object.assign({}, B45, { isDark: true, theme: 'dark' })]) {
      await mount({ tab: 'fracdec', fdValue: 0.25, fdDen: 4, fdMoreOpen: true }, over);
      const fills = {};
      document.querySelectorAll('#numberline-panel-fracdec svg[role="img"] rect[stroke]').forEach((r) => { const f = r.getAttribute('fill'); fills[f] = (fills[f] || 0) + 1; });
      const used = Object.keys(fills).filter((f) => /^#/.test(f));
      expect(used.length).toBe(2); // the hundred grid: filled and empty
      expect(ratio(used[0], used[1])).toBeGreaterThanOrEqual(3);
      await React.act(async () => root.unmount()); root = null;
    }
  });
  it('recent positions stay readable: the number is not faded and the ring holds 3:1', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.75, fdDen: 4, fdTrail: [0.25, 0.5] }, B45);
    const svg = document.querySelector('#numberline-panel-fracdec svg[role="slider"]');
    const groups = [...svg.querySelectorAll('g')].filter((g) => g.querySelector('circle[stroke-dasharray]'));
    expect(groups.length).toBe(2);
    for (const g of groups) {
      expect(g.getAttribute('opacity')).toBeNull();
      expect(Number(g.querySelector('circle').getAttribute('opacity'))).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('K-2 practice', () => {
  it('never serves the same question twice in a row', async () => {
    window.Element.prototype.scrollIntoView = function () {};
    await mount({ tab: 'challenges', challengeMode: 'place', pp: openPp(placeItem()) }, K2);
    for (let i = 0; i < 120; i++) {
      const prev = latest.pp.item.target;
      latest.pp.status = 'correct'; // a finished item: the step button serves the next one
      await click(document.querySelector('[data-nl-path-step="placeWhole"] button'));
      expect(latest.pp.status).toBe('open');
      expect(latest.pp.item.target, 'repeat at round ' + i).not.toBe(prev);
    }
  }, 60000);
  it('the start line is true for typed items too', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp({ v: 2, id: 'r', type: 'roundLine', band: 'b23', answer: 'number', tries: 0, target: 60, N: 58, base: 10, lo: 50, hi: 60, binary: true, tol: 1e-9, text: '58', arrow: 58, line: { min: 50, max: 60, step: 1, labels: [50, 60], mid: 55 } }) }, K2);
    const hero = document.getElementById('numberline-panel-challenges').textContent;
    expect(hero).not.toContain('Put the marker where the number goes.');
    expect(hero).toContain('or type your answer');
  });
  it('a missing read-aloud is announced once, not twice', async () => {
    await mount({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: openPp(placeItem()) }, K2);
    await click(btn('Hear the question'));
    expect(sr.filter((m) => /Read-aloud is not available/.test(m)).length).toBe(1);
    const note = [...document.querySelectorAll('[data-place-practice] p')].find((p) => /Read-aloud is not available/.test(p.textContent));
    expect(note).toBeTruthy();
    expect(note.getAttribute('role')).toBeNull();
  });
  it('Hear the question speaks the question and never an answer, for every K-2 type', async () => {
    await mount({ tab: 'explore' }, K2);
    const E = window.StemLab._registry.numberline._engine;
    const t = (k, f) => f;
    for (const ty of E.BAND_TYPES.b23) for (let i = 0; i < 300; i++) {
      const it = E.genItem(ty, 'b23', Math.random, { young: true });
      const p = E.promptText(it, t);
      if (it.type === 'readScale') expect(p).not.toMatch(/\d/);
      if (it.type === 'roundLine') expect(p.replace('nearest ' + it.base, '').match(/\d+/g).every((n) => Number(n) === it.N)).toBe(true);
    }
  });
});
