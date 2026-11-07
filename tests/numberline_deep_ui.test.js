// Number Line deep rebuild (2026-11-03): live React mounts of the review bugs
// and the new Place it / integer lab / teacher features.
// NUMBERLINE_DEEP_SRC points the suite at another copy (the pre-fix copy must
// turn the regression tests red).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null, latest = null, xp = [], errors = [], sr = [];

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; errors = []; sr = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; document.body.innerHTML = ''; vi.restoreAllMocks(); });

async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (id, amt, why) => xp.push([id, amt, why]),
      announceToSR: (m) => sr.push(m), addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
}
const txt = () => document.body.textContent.replace(/\s+/g, ' ');
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k, extra) { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); }); }
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const slider = () => document.querySelector('[data-place-practice] svg[role="slider"]');
const placeItem = (o) => Object.assign({ v: 2, id: 'test-item-1', type: 'placeWhole', band: 'b23', answer: 'position', tries: 0, target: 7, text: '7', snap: 1, tol: 0.49, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } }, o);
const ppState = (item, extra) => ({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9, readScale: 9, placeFraction: 9, readFraction: 9 }, pp: Object.assign({ item, pos: null, text: '', tries: 0, hints: 0, status: 'open', fb: null, exampleOpen: false }, extra || {}) });

describe('review bug regressions', () => {
  it('N5: a typed number cannot pass a placement; the marker position is graded (review #2)', async () => {
    // A legacy saved "place" question with only a typed answer.
    await mount({ tab: 'challenges', range: { min: 0, max: 10 }, answer: '7', challenge: { type: 'place', targetValue: 7, answer: 7, question: 'Click the number line to place a marker at 7.' } });
    expect(xp).toEqual([]);
    expect(latest.challenge).toBeNull();
    expect(latest.pp.item.target).toBe(7);
    expect(document.querySelector('input[aria-label="Placement value"]')).toBeNull();
    await click(btn('Check my placement'));
    expect(xp).toEqual([]);
    expect(latest.pp.status).toBe('open');
  });

  it('keyboard placement graded by position pays XP once (review #2)', async () => {
    await mount(ppState(placeItem()));
    const s = slider();
    expect(s.getAttribute('aria-valuetext')).toMatch(/^No marker placed yet/);
    await key(s, 'ArrowRight'); // first key drops the marker mid-line
    expect(latest.pp.pos).toBe(5);
    await key(slider(), 'ArrowRight'); await key(slider(), 'ArrowRight');
    expect(latest.pp.pos).toBe(7);
    expect(slider().getAttribute('aria-valuetext')).toBe('Your marker is on the tick 2 spaces right of the labelled tick 5.');
    await click(btn('Check my placement'));
    expect(latest.pp.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 5, 'Number line placement']]);
    expect(btn('Check my placement')).toBeUndefined();
    expect(latest.score).toEqual({ correct: 1, total: 1 });
  });

  it('N4: landmark XP is paid once per distinct landmark, not per sweep (review #1)', async () => {
    await mount({ tab: 'fracdec', fdValue: 0, fdDen: 4, fdMin: 0, fdMax: 1 });
    const s = () => document.querySelector('svg[role="slider"]');
    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < 4; i++) await key(s(), 'ArrowRight');
      for (let i = 0; i < 4; i++) await key(s(), 'ArrowLeft');
    }
    const lm = xp.filter((x) => x[0] === 'numberlineLandmark');
    expect(lm.length).toBeLessThanOrEqual(5);
    expect(Object.keys(latest.fdLandmarksFound || {}).sort()).toEqual(['0', '1', '1/2', '1/4', '3/4']);
  });

  it('N6: the Quick-question arrow is described to a screen reader (review #3)', async () => {
    await mount({ tab: 'challenges', range: { min: -20, max: 20 }, challenge: { type: 'identify', _arrowValue: 7, answer: 7, question: 'What number does the arrow point to?' } });
    const svg = [...document.querySelectorAll('svg')].find((x) => x.getAttribute('viewBox') === '0 0 700 120');
    expect(svg.getAttribute('aria-label')).toMatch(/arrow points to the tick 2 spaces right of the labelled tick 5/);
  });

  it('N7: plotting 1/97 + 1/98 never draws a 9,506-part line (review #4)', async () => {
    await mount({ tab: 'fracdec', fdCDN1: 1, fdCDD1: 97, fdCDN2: 1, fdCDD2: 98 });
    const t0 = performance.now();
    await click(btn('→ Plot the sum on the line'));
    expect(latest.fdDen).toBeLessThanOrEqual(100);
    expect(document.querySelectorAll('svg *').length).toBeLessThan(6000);
    expect(performance.now() - t0).toBeLessThan(3000);
  });

  it('N8: typed denominators of 2.5 or -4 are rejected (review #4)', async () => {
    for (const d of ['2.5', '-4']) {
      await mount({ tab: 'fracdec' });
      await type(document.getElementById('fdNum'), '1');
      await type(document.getElementById('fdDenInput'), d);
      await click(btn('Plot fraction'));
      expect(latest.fdDen === undefined || latest.fdDen === 4, d).toBe(true);
      expect(latest.fdValue === undefined || latest.fdValue === 0.5, d).toBe(true);
      await React.act(async () => root.unmount()); root = null;
    }
  });

  it('N2: 0..2 in fourths ticks every quarter (review #5)', async () => {
    await mount({ tab: 'fracdec', fdValue: 1.25, fdDen: 4, fdMin: 0, fdMax: 2 });
    const svg = document.querySelector('svg[role="slider"]');
    const fr = [...svg.querySelectorAll('text')].filter((x) => x.getAttribute('fill') === '#155e75').map((x) => x.textContent);
    expect(fr).toEqual(['0', '1/4', '2/4', '3/4', '1', '5/4', '6/4', '7/4', '2']);
  });

  it('N10b: models above one whole draw extra wholes (review #6)', async () => {
    await mount({ tab: 'fracdec', fdValue: 1.5, fdDen: 4, fdMin: 0, fdMax: 2 });
    const labels = [...document.querySelectorAll('svg[role="img"]')].map((x) => x.getAttribute('aria-label') || '');
    const pie = labels.find((l) => /wedges/.test(l));
    expect(pie).toContain('1 full whole and 2 of 4 parts of the next whole are filled');
    expect(labels.some((l) => /3 of 2|of 100 squares filled, which is 150/.test(l))).toBe(false);
    const pieSvg = [...document.querySelectorAll('svg[role="img"]')].find((x) => /wedges/.test(x.getAttribute('aria-label') || ''));
    expect(pieSvg.getAttribute('viewBox')).toBe('0 0 360 180');
  });

  it('N1: Explore lines under 20 units get real ticks (review #7)', async () => {
    const labelsFor = async (min, max) => {
      await mount({ tab: 'explore', range: { min, max } });
      const svg = [...document.querySelectorAll('svg')].find((x) => x.getAttribute('viewBox') === '0 0 700 120');
      const out = [...svg.querySelectorAll('text')].map((x) => x.textContent);
      await React.act(async () => root.unmount()); root = null;
      return out;
    };
    expect(await labelsFor(0, 1)).toEqual(['0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']);
    const l37 = await labelsFor(0, 37);
    expect(l37).toContain('35');
    expect(l37).not.toContain('3.7');
  });

  it('N3: six sixths make exactly 1 and the caption agrees (review #8)', async () => {
    await mount({ tab: 'fracdec', fdValue: 0, fdDen: 6, fdMin: 0, fdMax: 1 });
    const s = () => document.querySelector('svg[role="slider"]');
    for (let i = 0; i < 6; i++) await key(s(), 'ArrowRight');
    expect(latest.fdValue).toBe(1);
    expect(document.querySelector('[data-fd-model-caption]').textContent).toBe('6 of 6 equal parts are filled.');
  });

  it('N3c: arrow keys snap a free value onto the fraction grid (review #9)', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.37, fdDen: 4, fdMin: 0, fdMax: 1 });
    await key(document.querySelector('svg[role="slider"]'), 'ArrowRight');
    expect(latest.fdValue).toBe(0.5);
    await key(document.querySelector('svg[role="slider"]'), 'ArrowLeft');
    expect(latest.fdValue).toBe(0.25);
  });

  it('review #10: the looping canvas is gone; |0| is not called positive', async () => {
    await mount({ showIntegerLab: true });
    expect(document.querySelector('canvas')).toBeNull();
    expect(txt()).not.toMatch(/always positive/);
    const stage = document.querySelector('[data-allo-fs-stage]');
    expect(stage.querySelector('svg')).toBeTruthy();
  });
});

describe('Place it: misconceptions, second try, reveal, teacher hooks', () => {
  it('first wrong try names the misconception; second wrong try logs a miss and offers a reveal; no XP', async () => {
    await mount(ppState(placeItem()));
    for (let i = 0; i < 2; i++) await key(slider(), 'ArrowRight'); // 5 then 6
    expect(latest.pp.pos).toBe(6);
    await click(btn('Check my placement'));
    expect(document.querySelector('[data-pp-mis]').getAttribute('data-pp-mis')).toBe('ticks_not_spaces');
    expect(txt()).toContain('Counting tick marks, not spaces');
    expect(btn('Show the answer')).toBeUndefined();
    expect(latest.ppMissed || []).toEqual([]);
    await click(btn('Check my placement'));
    expect(latest.pp.tries).toBe(2);
    expect(latest.ppMissed).toHaveLength(1);
    expect(latest.ppMissed[0]).toMatchObject({ type: 'placeWhole', mis: 'ticks_not_spaces', answer: '6', correct: '7' });
    await click(btn('Show the answer'));
    expect(latest.pp.status).toBe('revealed');
    expect(txt()).toContain('The answer is 7.');
    expect(xp).toEqual([]);
    // After the reveal the line cannot be moved and nothing more can be checked.
    expect(slider().getAttribute('aria-disabled')).toBe('true');
    expect(btn('Check my placement')).toBeUndefined();
  });

  it('finding the spot after two misses earns nothing and stays on the review list', async () => {
    await mount(ppState(placeItem(), { pos: 6, tries: 2, missed: true }));
    await key(slider(), 'ArrowRight');
    await click(btn('Check my placement'));
    expect(latest.pp.status).toBe('correct');
    expect(xp).toEqual([]);
    expect(txt()).toContain('stays on your review list');
  });

  it('a teacher can turn the reveal off', async () => {
    await mount(Object.assign(ppState(placeItem(), { pos: 6, tries: 2, missed: true }), { teacher: { allowReveal: false } }));
    expect(btn('Show the answer')).toBeUndefined();
    expect(btn('Skip to the next item')).toBeTruthy();
  });

  it('hint ladder: each hint is announced and marks the success as supported (2 XP)', async () => {
    await mount(ppState(placeItem()));
    await click(btn('Hint 1 of 3'));
    expect(sr[sr.length - 1]).toMatch(/labelled ticks/);
    for (let i = 0; i < 3; i++) await key(slider(), 'ArrowRight');
    await click(btn('Check my placement'));
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 2, 'Number line placement']]);
  });

  it('typed items: Name the fraction catches ticks-vs-spaces and accepts an equivalent fraction', async () => {
    const it = { v: 2, id: 'rf-1', type: 'readFraction', band: 'b45', answer: 'fraction', tries: 0, target: 0.75, p: 3, q: 4, arrow: 0.75, tol: 1e-6, text: '3/4', line: { min: 0, max: 1, step: 0.25, labels: [0, 1] } };
    await mount(ppState(it));
    const input = document.querySelector('input[aria-label="Your answer"]');
    await type(input, '3/5');
    await click(btn('Check my answer'));
    expect(document.querySelector('[data-pp-mis]').getAttribute('data-pp-mis')).toBe('ticks_not_spaces');
    await type(document.querySelector('input[aria-label="Your answer"]'), '6/8');
    await click(btn('Check my answer'));
    expect(latest.pp.status).toBe('correct');
    expect(xp.filter((x) => x[0] === 'numberline')).toEqual([['numberline', 2, 'Number line placement']]);
  });

  it('worked examples fade: full example on new types uses different numbers', async () => {
    const it = placeItem({ id: 'fresh' });
    await mount(Object.assign(ppState(it), { ppSolvedByType: {} }));
    const worked = document.querySelector('[data-pp-worked="0"]');
    expect(worked).toBeTruthy();
    expect(worked.textContent).not.toMatch(/Place a marker at 7 on/);
    await React.act(async () => root.unmount()); root = null;
    await mount(Object.assign(ppState(it), { ppSolvedByType: { placeWhole: 2 } }));
    expect(document.querySelector('[data-pp-worked="1"]')).toBeTruthy();
    await React.act(async () => root.unmount()); root = null;
    await mount(Object.assign(ppState(it), { ppSolvedByType: { placeWhole: 4 } }));
    expect(document.querySelector('[data-pp-worked]')).toBeNull();
    expect(btn('Show me an example')).toBeTruthy();
  });

  it('grade band drives the generated items', async () => {
    for (const [gradeBand, gradeLevel, band] of [['k2', '2nd Grade', 'b23'], ['g35', '5th Grade', 'b45'], ['g68', '7th Grade', 'b6']]) {
      for (let i = 0; i < 8; i++) {
        await mount({ tab: 'challenges', challengeMode: 'place' }, { gradeBand, gradeLevel });
        await click(btn('Start practice'));
        expect(latest.pp.item.band).toBe(band);
        expect(window.StemLab._registry.numberline._engine.BAND_TYPES[band]).toContain(latest.pp.item.type);
        await React.act(async () => root.unmount()); root = null;
      }
    }
  });

  it('teacher panel: hidden from students; level lock and missed summary for teachers', async () => {
    const missed = [{ type: 'placeFraction', prompt: 'Place a marker at 2/3 on the number line.', answer: '2', correct: '2/3', mis: 'whole_number_bias', source: 'place', ts: 1 }];
    await mount({ tab: 'challenges', challengeMode: 'place', ppMissed: missed });
    expect(document.querySelector('[data-numberline-teacher]')).toBeNull();
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'challenges', challengeMode: 'place', ppMissed: missed }, { isTeacherMode: true });
    const panel = document.querySelector('[data-numberline-teacher]');
    expect(panel.textContent).toContain('Reading a fraction as whole numbers');
    expect(panel.textContent).toContain('2/3');
    await click([...panel.querySelectorAll('button')].find((b) => b.textContent === 'Grade 6 and up: integers and rational numbers'));
    expect(latest.teacher.lockBand).toBe('b6');
    const levelBtns = [...document.querySelectorAll('[data-place-practice] [aria-label="Practice level"] button')];
    expect(levelBtns.every((b) => b.disabled)).toBe(true);
    await click(btn('Clear the log'));
    await click(btn('Yes, clear it'));
    expect(latest.ppMissed).toEqual([]);
  });
});

describe('integer lab', () => {
  it('hops: predict by keyboard, then the hops and the rule are revealed', async () => {
    await mount({ showIntegerLab: true, intLab: { mode: 'hops', a: 3, op: '+', b: -5 } });
    const s = () => document.querySelector('[data-int-mode="hops"] svg[role="slider"]');
    await key(s(), 'ArrowRight'); // 0
    await key(s(), 'End');
    expect(latest.intLab.pred).toBe(20);
    await key(s(), 'Home');
    for (let i = 0; i < 18; i++) await key(s(), 'ArrowRight');
    expect(latest.intLab.pred).toBe(-2);
    await click(btn('Check my prediction'));
    expect(txt()).toContain('Yes: 3 + (−5) = −2.');
    expect(txt()).toContain('Adding -5 means moving 5 to the left.');
  });
  it('hops: a wrong-direction prediction is named', async () => {
    await mount({ showIntegerLab: true, intLab: { mode: 'hops', a: 3, op: '+', b: -5, pred: 8 } });
    await click(btn('Check my prediction'));
    expect(txt()).toContain('Hopped the wrong way');
  });
  it('mirror: the opposite of -4 is 4; picking -4 itself is called out', async () => {
    await mount({ showIntegerLab: true, intLab: { mode: 'mirror', x: -4, opp: -4 } });
    await click(btn('Check the opposite'));
    expect(txt()).toContain('That is the number itself');
    // Stage C (intended): a wrong check no longer reveals the answer; the marker stays
    // editable for a second try (the reveal is offered on request after two tries).
    expect(txt()).not.toContain('are opposites');
    expect(btn('Predict again')).toBeUndefined();
    const s = document.querySelector('[data-int-mode="mirror"] svg[role="slider"]');
    await key(s, 'End');
    for (let i = 0; i < 6; i++) await key(document.querySelector('[data-int-mode="mirror"] svg[role="slider"]'), 'ArrowLeft');
    expect(latest.intLab.opp).toBe(4);
    await click(btn('Check the opposite'));
    expect(txt()).toContain('−4 and 4 are opposites: each is 4 units from 0');
  });
  it('absolute value: a negative answer is named; distance is never negative', async () => {
    await mount({ showIntegerLab: true, intLab: { mode: 'abs', ax: -6 } });
    await type(document.querySelector('input[aria-label="Your answer for the absolute value"]'), '-6');
    await click(btn('Check'));
    expect(txt()).toContain('a distance cannot be negative');
    await type(document.querySelector('input[aria-label="Your answer for the absolute value"]'), '6');
    await click(btn('Check'));
    expect(txt()).toContain('|−6| = 6');
  });
});

describe('accessibility contracts', () => {
  it('single-key shortcuts never fire from a focused button, but do from the tool area', async () => {
    await mount({ tab: 'explore' });
    await key(document.body, '?');
    expect(!!latest.showAITutor).toBe(false);
    await key(document.querySelector('[role="tabpanel"]'), '?', { ctrlKey: true });
    expect(!!latest.showAITutor).toBe(false);
    await key(btn('Back'), '?');
    expect(!!latest.showAITutor).toBe(false);
    await key(btn('Back'), '2');
    expect(latest.tab).toBe('explore');
    const panel = document.querySelector('[role="tabpanel"]');
    await key(panel, '?');
    expect(latest.showAITutor).toBe(true);
    // Stage C: number keys follow the tabs as shown (band order), so read the 2nd tab.
    const second = document.querySelectorAll('[role="tab"]')[1].id.replace('numberline-tab-', '');
    await key(panel, '2');
    expect(latest.tab).toBe(second);
  });

  it('the tabpanel wraps the tab content, not only the header', async () => {
    await mount({ tab: 'fracdec' });
    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel.querySelector('svg[role="slider"]')).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe('numberline-tab-fracdec');
  });

  it('dark mode repaints every line SVG background', async () => {
    await mount(ppState(placeItem()), { isDark: true });
    const bgs = [...document.querySelectorAll('svg > rect:first-child')].map((r) => r.getAttribute('fill'));
    expect(bgs.length).toBeGreaterThan(0);
    for (const f of bgs) expect(['#0f172a', '#020617']).toContain(f);
  });

  it('every tab mounts without console errors in light, dark and teacher modes', async () => {
    for (const over of [{}, { isDark: true }, { isTeacherMode: true }]) {
      for (const tab of ['explore', 'challenges', 'skipcount', 'fracdec', 'magCompare']) {
        await mount({ tab, showIntegerLab: true, showAITutor: true, challengeMode: tab === 'challenges' ? 'place' : undefined }, over);
        if (tab === 'challenges') await click(btn('Start practice'));
        await React.act(async () => root.unmount()); root = null;
      }
      await mount({ tab: 'challenges', challengeMode: 'quick' }, over);
      await click(btn('Generate Challenge'));
      await React.act(async () => root.unmount()); root = null;
      for (const mode of ['hops', 'mirror', 'abs']) {
        await mount({ showIntegerLab: true, intLab: { mode } }, over);
        await React.act(async () => root.unmount()); root = null;
      }
    }
    expect(errors).toEqual([]);
  });

  it('palette contrast: text 4.5:1 and graphics 3:1 on each SVG background', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const pal = (name) => [...src.matchAll(new RegExp('var ' + name + ' = isDark\\s*\\?\\s*(\\{[^}]*\\})\\s*:\\s*(\\{[^}]*\\})', 'g'))][0];
    const parse = (s) => Object.fromEntries([...s.matchAll(/(\w+): '(#[0-9a-f]{6})'/g)].map((m) => [m[1], m[2]]));
    const P = pal('P'); const PF = pal('PF');
    for (const [dark, light] of [[parse(P[1]), parse(P[2])]]) {
      for (const pset of [dark, light]) {
        for (const k of ['ink', 'label', 'muted', 'student', 'correct', 'arrow', 'hop', 'hop2', 'bar', 'point']) expect(ratio(pset[k], pset.bg), k).toBeGreaterThanOrEqual(4.5);
        for (const k of ['axis', 'tick', 'minor', 'mid']) expect(ratio(pset[k], pset.bg), k).toBeGreaterThanOrEqual(3);
      }
    }
    for (const pset of [parse(PF[1]), parse(PF[2])]) {
      for (const k of ['frac', 'dec', 'cmpText']) expect(ratio(pset[k], pset.bg), 'PF ' + k).toBeGreaterThanOrEqual(4.5);
      for (const k of ['line', 'marker', 'cmp', 'edge']) expect(ratio(pset[k], pset.bg), 'PF ' + k).toBeGreaterThanOrEqual(3);
    }
  });
});
