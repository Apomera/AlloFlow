// Independent hunt of the Angle Explorer engagement build (2026-11-04), through a
// live mount with the hub's hosted state. Each block failed on the hunt's start copy.
// ANGLES_DEEP_SRC points at another copy.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let live = null;
let xp = [];
let said = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; said = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete window.PointerEvent;
  delete window.matchMedia;
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(45);
    const [angleChallenge, setAngleChallenge] = React.useState(null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: {} });
    live = { d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      announceToSR: (m) => said.push(m),
      addToast: () => {},
      t: (k, fb) => fb || k,
    }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const key = async (el, k, opts) => React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts || {}))); });
async function setValue(input, value) {
  expect(input, 'input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function choose(select, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
class FakePointerEvent extends window.MouseEvent {
  constructor(type, init) { super(type, init); this.pointerId = init.pointerId; this.isPrimary = init.isPrimary !== false; this.pointerType = 'mouse'; }
}
const pe = (type, x, y) => new FakePointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 5, button: 0 });
const rig = (svg, w, h) => { svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h }); };
function stubPhone(matches) {
  const subs = new Set();
  const mq = { get matches() { return matches; }, media: '(max-width: 639px)', addEventListener: (_t, f) => subs.add(f), removeEventListener: (_t, f) => subs.delete(f) };
  window.matchMedia = vi.fn((q) => (/max-width:\s*639px/.test(q) ? mq : { matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  return { set: async (v) => { matches = v; await React.act(async () => { subs.forEach((f) => f({ matches: v })); await new Promise((r) => setTimeout(r, 20)); }); }, subs };
}

const comp = { kind: 'comp', a: 35, answer: 55, rot: 0, id: 'comp:35' };
const P = (extra) => ({ protractor: Object.assign({ activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 } }, extra || {}) });
const task = (base, open, m) => ({ base, open, m, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } });
const transPuzzle = { kind: 'trans', id: 'trans:x', alpha: 60, a: 60, answer: 120, rel: 'co', given: { i: 0, p: 0 }, ask: { i: 1, p: 1 } };

describe('1. the estimate verdict shows its own words once the keys are registered', () => {
  it('no key means two different things in the source', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const seen = {}, clash = [];
    const re = /\bt\('stem\.angles\.([A-Za-z0-9_]+)',\s*('(?:[^'\\]|\\.)*')\s*\)/g;
    let m;
    while ((m = re.exec(src))) { if (seen[m[1]] != null && seen[m[1]] !== m[2]) clash.push(m[1]); seen[m[1]] = m[2]; }
    expect(clash).toEqual([]);
  });
  it('with the registered strings, a close estimate prints no raw placeholders', async () => {
    const reg = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.angles;
    const c = await mount(P({ pzEst: { id: 'comp:35', deg: 50, locked: true }, pzAnswer: '55', pzTries: 1, pzResult: { code: 'ok', ok: true } }), { t: (k, fb) => reg[k.replace('stem.angles.', '')] || fb || k });
    const status = c.querySelector('[data-angles-est-status]').textContent;
    expect(status.match(/\{\w+\}/g), status).toBe(null);
    expect(status.includes('A sharp eye'), status).toBe(true);
  });
});

describe('2. a level change swaps the puzzle, so the attempt must not carry over', () => {
  it('a solved puzzle does not mark a never-tried one correct or show its answer', async () => {
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g8', pz: transPuzzle, pzKind: 'trans', pzAnswer: '120', pzTries: 3, pzResult: { code: 'ok', ok: true } } });
    await choose(c.querySelector('[data-angles-level-select]'), 'g4');
    expect(c.querySelector('[data-angles-pz-result]'), 'stale Correct verdict').toBe(null);
    expect(c.querySelector('[data-angles-est-true]'), 'true size drawn').toBe(null);
    expect(c.querySelector('[data-angles-puzzle-svg]').textContent.includes('x'), 'the unknown is still x').toBe(true);
    const input = c.querySelector('#stem-angles-pz-input');
    expect(input.value).toBe('');
    expect(input.disabled).toBe(false);
    expect(live.d.pzResult, 'the saved attempt is cleared, not only hidden').toBe(null);
    // The next keystroke saves the new puzzle: the old tries must not come back.
    await setValue(input, '5');
    expect(c.querySelector('[data-angles-pz-result]')).toBe(null);
    expect(live.d.pzTries).toBe(0);
  });
  it('wrong tries on the old puzzle do not close the new puzzle\'s estimate', async () => {
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g8', pz: transPuzzle, pzKind: 'trans', pzAnswer: '77', pzTries: 2, pzResult: { code: 'off' } } });
    await choose(c.querySelector('[data-angles-level-select]'), 'g4');
    expect(c.querySelector('[data-angles-est]').getAttribute('data-angles-est')).toBe('open');
    expect(c.querySelector('[data-angles-est-slider]').disabled).toBe(false);
    expect(c.querySelector('[data-angles-pz-result]')).toBe(null);
  });
  it('the same puzzle at a level that keeps it keeps its attempt', async () => {
    const c = await mount(P({ pzAnswer: '20', pzTries: 1, pzResult: { code: 'off', typed: '20' } }));
    expect(c.querySelector('[data-angles-pz-result]')).toBeTruthy();
    expect(live.d.pzTries).toBe(1);
  });
});

describe('3. a baseline lined up at the far end faces away from the opening', () => {
  const thirdItem = (c) => c.querySelectorAll('[data-angles-snap] li')[2].textContent;
  it('both ticks are true, so the third line says why nothing can be read', async () => {
    const wrongEnd = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 } } });
    expect(wrongEnd.querySelector('[data-angles-snap]').getAttribute('data-angles-snap')).toBe('vb');
    expect(thirdItem(wrongEnd)).toMatch(/misses the scale/);
    expect(/inner|outer|blue|red/i.test(thirdItem(wrongEnd))).toBe(false);
    const rightEnd = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 40 } } });
    expect(thirdItem(rightEnd)).toMatch(/count from the 0/);
    const clockwise = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, -1, 62), mPlace: { x: 210, y: 175, rot: 220 } } });
    expect(thirdItem(clockwise), 'an opening to the right is read from the far end').toMatch(/count from the 0/);
    const draw = await mount({ protractor: { activeTab: 'protractor', mMode: 'draw', dTask: Object.assign(task(40, 1, 62), { drawStart: 200 }), dPlace: { x: 210, y: 175, rot: 220 } } });
    expect(thirdItem(draw), 'a drawing may open either way').toMatch(/count from the 0/);
  });
  it('a drag and a key turn both say it aloud', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 150, y: 200, rot: 222 }, soundEnabled: false } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    const prot = c.querySelector('[data-angles-protractor]');
    prot.setPointerCapture = () => {};
    await React.act(async () => { prot.dispatchEvent(pe('pointerdown', 150, 200)); });
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 212, 173)); });
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 212, 173)); });
    expect(said.slice(-1)[0]).toMatch(/misses the scale/);
    said.length = 0;
    const k = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 221 }, soundEnabled: false } });
    await key(k.querySelector('[data-angles-protractor]'), 'PageDown');
    expect(said.slice(-1)[0]).toMatch(/misses the scale/);
  });
});

describe('4. focus is never lost', () => {
  it('locking the estimate moves focus to the answer box', async () => {
    const c = await mount(P({ pzEst: { id: 'comp:35', deg: 50, locked: false } }));
    const lock = c.querySelector('[data-angles-est-lock]');
    lock.focus();
    await click(lock);
    expect(c.querySelector('[data-angles-est-lock]')).toBe(null);
    expect(document.activeElement.id).toBe('stem-angles-pz-input');
  });
  it('"Show the steps again" moves focus to the steps it opened', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mSolved: 2, mMode: 'read', mTask: task(40, 1, 62) } });
    const b = Array.from(c.querySelectorAll('button')).find((x) => x.textContent.includes('Show the steps again'));
    b.focus();
    await click(b);
    expect(Array.from(c.querySelectorAll('button')).some((x) => x.textContent.includes('Show the steps again'))).toBe(false);
    expect(document.activeElement.tagName).toBe('SUMMARY');
    expect(document.activeElement.closest('[data-angles-steps]').hasAttribute('open')).toBe(true);
  });
  it('a phone turning across the breakpoint keeps focus in the tabs', async () => {
    const phone = stubPhone(true);
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62) } }, { gradeBand: 'g35' });
    c.querySelector('#stem-angles-tab-protractor').focus();
    await phone.set(false);
    expect(document.activeElement.id).toBe('stem-angles-tab-protractor');
    await phone.set(true);
    c.querySelector('[data-angles-tabs-more]').focus();
    await phone.set(false);
    expect(document.activeElement.id, 'More is gone on a wide screen').toBe('stem-angles-tab-protractor');
  });
});

describe('5. the sense check speaks of the answer that was checked', () => {
  it('it is announced with the verdict, and goes when the answer is edited', async () => {
    const c = await mount(P({ pzEst: { id: 'comp:35', deg: 150, locked: true } }));
    await setValue(c.querySelector('#stem-angles-pz-input'), '20');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(c.querySelector('[data-angles-est-gap]').getAttribute('data-angles-est-gap')).toBe('below');
    expect(said.slice(-1)[0]).toMatch(/much smaller than your estimate/);
    await setValue(c.querySelector('#stem-angles-pz-input'), '2');
    expect(c.querySelector('[data-angles-est-gap]'), 'nothing was checked yet').toBe(null);
    await setValue(c.querySelector('#stem-angles-pz-input'), '55');
    expect(c.querySelector('[data-angles-est-gap]'), 'the right answer, unchecked').toBe(null);
  });
  it('it depends on the estimate only: the same answer gives the same line whatever x is', async () => {
    for (const pz of [comp, { kind: 'comp', a: 80, answer: 10, rot: 0, id: 'comp:80' }]) {
      const c = await mount(P({ pz, pzEst: { id: pz.id, deg: 150, locked: true } }));
      await setValue(c.querySelectorAll('#stem-angles-pz-input')[0], '20');
      await click(c.querySelector('button[aria-label="Check my answer"]'));
      expect(c.querySelector('[data-angles-est-gap]').getAttribute('data-angles-est-gap')).toBe('below');
    }
  });
});

describe('6. a wobbling finger at the edge of a snap', () => {
  it('announces once, not on every wobble', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 150, y: 200, rot: 0 }, soundEnabled: false } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    const prot = c.querySelector('[data-angles-protractor]');
    prot.setPointerCapture = () => {};
    await React.act(async () => { prot.dispatchEvent(pe('pointerdown', 150, 200)); });
    for (const dx of [7, 9, 7, 9, 7, 9, 7, 9]) await React.act(async () => { window.dispatchEvent(pe('pointermove', 210 + dx, 175)); });
    expect(said).toEqual(['The centre is on the vertex.']);
    // A real move away still lets go.
    await React.act(async () => { window.dispatchEvent(pe('pointermove', 240, 175)); });
    expect(live.d.mPlace.x).toBe(240);
    await React.act(async () => { window.dispatchEvent(pe('pointerup', 240, 175)); });
  });
  it('the turn snap holds too, and lets go past its edge', async () => {
    window.PointerEvent = FakePointerEvent;
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(0, 1, 62), mPlace: { x: 210, y: 175, rot: 20 }, soundEnabled: false } });
    rig(c.querySelector('[data-angles-measure-svg]'), 420, 350);
    const knob = c.querySelector('[data-angles-knob]') || c.querySelector('[data-angles-measure-svg] g g:last-of-type');
    knob.setPointerCapture = () => {};
    const at = (deg) => { const a = (deg + 90) * Math.PI / 180; return [210 + 147 * Math.cos(a), 175 - 147 * Math.sin(a)]; };
    await React.act(async () => { knob.dispatchEvent(pe('pointerdown', ...at(20))); });
    for (const deg of [3.4, 4.4, 3.4, 4.4, 3.4, 4.4]) await React.act(async () => { window.dispatchEvent(pe('pointermove', ...at(deg))); });
    expect(said.filter((m) => /baseline lies along/.test(m)).length).toBe(1);
    await React.act(async () => { window.dispatchEvent(pe('pointermove', ...at(30))); });
    expect(live.d.mPlace.rot).toBe(30);
    await React.act(async () => { window.dispatchEvent(pe('pointerup', ...at(30))); });
  });
});

describe('7. contrast theme: no pale box under the theme\'s white text', () => {
  it('the coach line and the reference heading drop their pale gradients', async () => {
    const c = await mount({ protractor: { activeTab: 'reference' } }, { isContrast: true });
    for (const box of Array.from(c.querySelectorAll('[class*="bg-gradient-to-r"]')).filter((n) => /from-(purple|rose)-50/.test(n.className))) {
      expect(box.style.backgroundImage, box.textContent.slice(0, 40)).toBe('none');
      expect(box.style.backgroundColor).toBe('rgb(0, 0, 0)');
    }
    expect(c.querySelector('[data-angles-coach]')).toBeTruthy();
    expect(c.querySelector('[data-angles-ref-head]')).toBeTruthy();
    const light = await mount({ protractor: { activeTab: 'protractor' } });
    expect(light.querySelector('[data-angles-coach]').style.backgroundImage).toBe('');
  });
});

describe('8. touch: only the handles hold a finger', () => {
  const grabbable = (el, label) => {
    expect(el, label).toBeTruthy();
    expect(el.style.display, label + ' display (Chromium ignores touch-action on inline SVG shapes)').toBe('block');
    expect(el.style.touchAction, label).toBe('none');
    expect(typeof el.onclick, label + ' counts as tappable for touch adjustment').toBe('function');
  };
  it('the protractor scene pans; its move and rotate handles do not', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62) } });
    expect(c.querySelector('[data-angles-measure-svg]').style.touchAction).toBe('pan-y');
    grabbable(c.querySelector('[data-angles-protractor]'), 'centre');
    grabbable(c.querySelector('[data-angles-prot-body]'), 'body');
    grabbable(c.querySelector('[data-angles-knob]'), 'knob');
    // 44 px at the 276 px a 320 px phone gives this 420-unit scene.
    expect(Number(c.querySelector('[data-angles-knob-hit]').getAttribute('r')) * 2 * 276 / 420).toBeGreaterThanOrEqual(44);
  });
  it('the draw handle holds a finger', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'draw', dTask: Object.assign(task(40, 1, 62), { drawStart: 200 }) } });
    grabbable(c.querySelector('[data-angles-measure-svg] circle[role="slider"]'), 'draw handle');
  });
  it('the dial pans; its arm handle holds a finger, 44 px across', async () => {
    const c = await mount(P());
    expect(c.querySelector('[data-angles-est-dial]').style.touchAction).toBe('pan-y');
    const hd = c.querySelector('[data-angles-est-handle]');
    grabbable(hd, 'dial arm');
    expect(Number(hd.getAttribute('r')) * 2).toBeGreaterThanOrEqual(44);
  });
});

describe('9. a closed estimate asks for nothing', () => {
  it('checked with no estimate: no dial drawing x with words for nothing', async () => {
    const c = await mount(P({ pzAnswer: '55', pzTries: 1, pzResult: { code: 'ok', ok: true } }));
    expect(c.querySelector('[data-angles-est]')).toBe(null);
    const done = await mount(P({ pzEst: { id: 'comp:35', deg: 50, locked: true }, pzAnswer: '55', pzTries: 1, pzResult: { code: 'ok', ok: true } }));
    expect(done.querySelector('[data-angles-est-true]')).toBeTruthy();
  });
  it('locked or closed: the "drag the arm" instruction goes, and the slider is not described by it', async () => {
    const c = await mount(P({ pzEst: { id: 'comp:35', deg: 50, locked: true } }));
    expect(c.querySelector('[data-angles-est]').textContent.includes('drag the pink arm')).toBe(false);
    expect(c.querySelector('[data-angles-est-slider]').hasAttribute('aria-describedby')).toBe(false);
    const open = await mount(P());
    expect(open.querySelector('[data-angles-est]').textContent.includes('drag the pink arm')).toBe(true);
  });
});

describe('10. the new code against every generated puzzle and hostile saves', () => {
  it('every generated puzzle counts as the saved puzzle, so its attempt is kept', async () => {
    const A = window.StemLab.anglesCore;
    let n = 0;
    for (const level of A.LEVELS) for (const kind of A.PUZZLE_KINDS[level]) for (let seed = 1; seed <= 4; seed++) {
      let v = seed * 7919;
      const rng = () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; };
      const pz = A.makePuzzle(kind, rng, level);
      const c = await mount({ protractor: { activeTab: 'puzzles', level, pz, pzKind: kind, pzAnswer: '7', pzTries: 1, pzResult: { code: 'off', typed: '7' } } });
      expect(live.d.pzTries, kind + ' ' + pz.id).toBe(1);
      expect(c.querySelectorAll('[data-angles-pz-result]').length, kind + ' ' + pz.id).toBe(1);
      n++;
      const { root, container } = mounted.pop();
      await React.act(async () => root.unmount());
      container.remove();
    }
    expect(n).toBeGreaterThan(30);
  });
  it('hostile estimate and placement values neither crash nor reach the screen', async () => {
    for (const pzEst of [{ id: 'comp:35', deg: 'x' }, { id: 'comp:35', deg: -9, locked: 'yes' }, { id: 'comp:35', deg: 1e9 }, { id: 7 }, 'junk', [1], null]) {
      const c = await mount(P({ pzEst, pzResult: { code: 'off', typed: 5 }, pzTries: 'many' }));
      expect(c.querySelector('[data-angles-puzzle-svg]'), JSON.stringify(pzEst)).toBeTruthy();
      expect(/NaN|undefined/.test(c.querySelector('[data-angles-est-dial]').outerHTML), JSON.stringify(pzEst)).toBe(false);
    }
    for (const mPlace of [{ x: 'a', y: 1, rot: 2 }, { x: 1e9, y: -1e9, rot: 1e9 }, 'junk', null]) {
      const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace } });
      expect(c.querySelector('[data-angles-snap]'), JSON.stringify(mPlace)).toBeTruthy();
    }
  });
  it('a finished task never asks for a turn it no longer allows', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, mAnswer: '62', mTries: 1, mResult: { code: 'ok', ok: true } } });
    expect(c.querySelectorAll('[data-angles-snap] li')[2].textContent).toMatch(/count from the 0/);
  });
});
