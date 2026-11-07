import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Independent hunt of the Heat Lab engagement build (2026-11-04).
// Fail-first:
//   HEATLAB_SRC=C:/tmp/stem_engage_2026-11-04/heatlab/hunt/start_stem_tool_heatlab.js npx vitest run tests/heatlab_engage_hunt.test.js
const FILE = process.env.HEATLAB_SRC || 'stem_lab/stem_tool_heatlab.js';
const SRC = fs.readFileSync(FILE, 'utf8');
const MATERIALS = (() => {
  const mark = 'var MATERIALS = [';
  const a = SRC.indexOf(mark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + mark.length - 1, b) + '\n  ]')();
})();
let cfg, host, root, previousAct, reduce, frames, mqListeners, texts, ops;
vi.setConfig({ testTimeout: 120000 });

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  reduce = false;
  frames = [];
  mqListeners = new Set();
  texts = [];
  ops = [];
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) {
      const target = {
        canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
        fillText: (text, x, y) => { texts.push({ text: String(text), x, y, style: target.fillStyle }); ops.push({ op: 'text', text: String(text) }); },
        fill: () => { ops.push({ op: 'fill', style: target.fillStyle }); },
        stroke: () => { ops.push({ op: 'stroke', style: target.strokeStyle, dashed: !!(target.dash && target.dash.length) }); },
        setLineDash: (d) => { target.dash = d; },
        createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
      };
      contexts.set(this, new Proxy(target, { get: (t, key) => (key in t ? t[key] : () => {}) }));
    }
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => { frames.push(f); return frames.length; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.matchMedia = (q) => ({
    get matches() { return reduce && /reduce/.test(q); },
    media: q,
    addListener(fn) { mqListeners.add(fn); }, removeListener(fn) { mqListeners.delete(fn); },
    addEventListener(_, fn) { mqListeners.add(fn); }, removeEventListener(_, fn) { mqListeners.delete(fn); },
  });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  delete window.StemLab.audioContext;
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [], announced: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
      announceToSR: (msg) => box.announced.push(msg),
    }, overrides || {})));
  }
  React.act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Panel));
  });
  box.d = () => (box.data && box.data._heatLab) || {};
  return box;
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const press = (node) => { node.focus(); click(node); };
const sec = (id) => host.querySelector('#htsec-' + id);
const canvas = () => sec('conduction').querySelector('canvas[role="img"]');
const card = () => host.querySelector('[data-ht-first-race]');
const buttons = (scope) => [...(scope || host).querySelectorAll('button')];
const byLabel = (re) => buttons().find((b) => re.test(b.getAttribute('aria-label') || ''));
const mat = (id) => MATERIALS.find((m) => m.id === id);
function setRange(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  React.act(() => { set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
function lockGuess(pick) {
  click(host.querySelector('[data-ht-fr-opt="' + pick + '"] input'));
  click(host.querySelector('[data-ht-fr-start]'));
}
const stepOnce = () => React.act(() => canvas()._heatStep());
function stepUntilDone(box, max) {
  let n = 0;
  while (n < max && box.d().firstRace.stage !== 'done') { stepOnce(); n++; }
  return n;
}
function runFrame(ts) {
  const list = frames;
  frames = [];
  React.act(() => list.forEach((f) => f(ts)));
}

describe('the race verdict matches the model', () => {
  it('names the higher-diffusivity bar and the model times for every pair, stepped under reduced motion', () => {
    reduce = true;
    const box = mount({ _heatLab: { hotEnd: 90 } });
    const seen = [];
    for (let round = 0; round < 5; round++) {
      const { a, b } = box.d().firstRace || { a: 'copper', b: 'wood' };
      lockGuess('a');
      const presses = stepUntilDone(box, 40);
      const fr = box.d().firstRace;
      const pred = cfg.models.racePrediction(mat(fr.a), mat(fr.b));
      expect(presses, a + ' v ' + b).toBeLessThanOrEqual(20);
      expect(fr.winner === 'a' ? fr.a : fr.b).toBe(pred.fasterId);
      expect(Math.abs(fr.reachA - cfg.models.midReachTime(mat(fr.a), 90)) / fr.reachA).toBeLessThan(0.02);
      expect(Math.abs(fr.reachB - cfg.models.midReachTime(mat(fr.b), 90)) / fr.reachB).toBeLessThan(0.02);
      expect(fr.correct).toBe(fr.winner === 'a');
      seen.push(fr.a + '-' + fr.b);
      click(host.querySelector('[data-ht-fr-next]'));
    }
    expect(new Set(seen).size).toBe(5);
    expect(box.xp).toEqual([]);
  });

  it('gives no verdict on a run whose hot end moved, and asks for a fresh race', () => {
    reduce = true;
    const box = mount({});
    lockGuess('b');
    stepOnce();
    setRange(host.querySelector('#heat-hot-end'), 90);
    for (let i = 0; i < 60 && box.d().firstRace.stage !== 'done'; i++) stepOnce();
    expect(box.d().firstRace.stage).toBe('racing');
    expect(card().textContent).toMatch(/changed the hot end during the race/);
    click(card().querySelector('[data-ht-fr-again]'));
    stepUntilDone(box, 40);
    const fr = box.d().firstRace;
    expect(fr.stage).toBe('done');
    expect(Math.abs(fr.reachB - cfg.models.midReachTime(mat('wood'), 90)) / fr.reachB).toBeLessThan(0.02);
  });

  it('still catches a hot end moved away and back again', () => {
    reduce = true;
    const box = mount({});
    lockGuess('a');
    stepOnce();
    setRange(host.querySelector('#heat-hot-end'), 300);
    stepOnce();
    setRange(host.querySelector('#heat-hot-end'), 200);
    for (let i = 0; i < 60 && box.d().firstRace.stage !== 'done'; i++) stepOnce();
    expect(box.d().firstRace.stage).toBe('racing');
  });

  it('only promises "about 20 s" at the auto speed', () => {
    const box = mount({});
    lockGuess('a');
    expect(host.querySelector('[data-ht-fr-speed]').textContent).toMatch(/finishes in about 20 s/);
    click(byLabel(/^Run at 10 times real time$/));
    const line = host.querySelector('[data-ht-fr-speed]').textContent;
    expect(line).toContain('1 s here = 10 s of real time');
    expect(line).not.toMatch(/so the slower bar finishes in about 20 s/);
    expect(box.d().firstRace.stage).toBe('racing');
  });

  it('labels Advance with the step it really takes at a fractional auto speed', () => {
    reduce = true;
    mount({ _heatLab: { timeScale: 'auto', matId: 'copper' } });
    const s = cfg.models.autoTimeScale(cfg.models.midReachTime(mat('copper'), 200));
    expect(s % 1).not.toBe(0);
    const adv = buttons(sec('conduction')).find((b) => /^Advance /.test(b.textContent));
    expect(adv.textContent).toBe('Advance ' + s + ' s');
    expect(adv.getAttribute('aria-label')).toContain('by ' + s + ' simulated');
    const before = canvas()._heatSnapshot().clock;
    click(adv);
    expect(canvas()._heatSnapshot().clock - before).toBeCloseTo(s, 6);
  });

  it('states the true floor: a hot end between 80 and 90 °C would still cross', () => {
    mount({});
    const floor = sec('conduction').querySelector('[data-ht-hot-floor]').textContent;
    expect(cfg.models.midReachTime(mat('copper'), 85)).toBeLessThan(Infinity);
    expect(floor).not.toMatch(/a cooler hot end could never/);
    expect(floor).toMatch(/below 80 °C it could never/);
  });

  it('keeps the top race bar\'s result clear of the fullscreen button', () => {
    mount({ _heatLab: { raceOn: true, matId: 'copper', matBId: 'wood' } });
    texts.length = 0;
    React.act(() => canvas()._heatDraw());
    const w = canvas().width;
    const top = texts.filter((x) => /still climbing/.test(x.text)).sort((p, q) => p.y - q.y)[0];
    expect(top).toBeTruthy();
    // right-aligned at x; the 34 px button starts 42 px from the right edge
    expect(top.x).toBeLessThanOrEqual(w - 42);
  });
});

describe('canvas colours (measured from real pixels in probe_host.cjs)', () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  it('draws the race result at 4.5:1 on the light canvas', () => {
    reduce = true;
    const box = mount({}, { theme: 'light', isDark: false, isContrast: false });
    lockGuess('a');
    stepUntilDone(box, 40);
    texts.length = 0;
    React.act(() => canvas()._heatDraw());
    const hit = texts.filter((x) => /^middle hit/.test(x.text));
    expect(hit).toHaveLength(2);
    // #e4ecfb is the top of the light canvas gradient, where the label sits
    hit.forEach((x) => expect(ratio(x.style, '#e4ecfb')).toBeGreaterThanOrEqual(4.5));
  });

  it.each([['light'], ['dark'], ['contrast']])('gives the midpoint marker a dark halo and a light core in %s', (theme) => {
    mount({ _heatLab: { raceOn: true, matId: 'copper', matBId: 'wood' } }, { theme, isDark: theme !== 'light', isContrast: theme === 'contrast' });
    ops.length = 0;
    React.act(() => canvas()._heatDraw());
    const dashed = ops.filter((o) => o.op === 'stroke' && o.dashed).map((o) => o.style);
    expect(dashed.filter((st) => st === 'rgba(2,6,23,0.75)')).toHaveLength(2);
    expect(dashed.filter((st) => st === 'rgba(255,255,255,0.96)')).toHaveLength(2);
  });

  it.each([['light'], ['dark'], ['contrast']])('fills the drag arrows white, whatever P1\'s colour, in %s', (theme) => {
    mount({}, { theme, isDark: theme !== 'light', isContrast: theme === 'contrast' });
    ops.length = 0;
    React.act(() => canvas()._heatDraw());
    const at = ops.findIndex((o) => o.op === 'text' && o.text === 'drag');
    expect(at).toBeGreaterThan(1);
    const before = ops.slice(0, at).filter((o) => o.op === 'fill').slice(-2);
    expect(before.map((o) => o.style)).toEqual(['#ffffff', '#ffffff']);
  });
});

describe('the answer stays hidden until the guess', () => {
  it('shows no "Prediction" line for the pair still waiting for a guess, even from an old racing save', () => {
    mount({ _heatLab: { raceOn: true, matId: 'copper', matBId: 'wood' } });
    expect(card().getAttribute('data-ht-first-race')).toBe('predict');
    expect(sec('conduction').textContent).not.toMatch(/Prediction: /);
  });

  it('hides it with the bars swapped too, and shows it again for another pair and once locked', () => {
    mount({ _heatLab: { raceOn: true, matId: 'wood', matBId: 'copper' } });
    expect(sec('conduction').textContent).not.toMatch(/Prediction: /);
    click(byLabel(/^Use a Steel bar$/));
    expect(sec('conduction').textContent).toMatch(/Prediction: /);
    click(byLabel(/^Use a Copper bar$/));
    click(byLabel(/^Race against a Wood bar$/));
    expect(sec('conduction').textContent).not.toMatch(/Prediction: /);
    lockGuess('a');
    expect(sec('conduction').textContent).toMatch(/Prediction: /);
  });
});

describe('hostile saved first-race state', () => {
  it.each([
    [{ stage: 'done', correct: true, winner: 'a', reachA: 1, reachB: 2 }],
    [{ stage: 'racing' }],
    [{ stage: 'done', pick: 'nonsense', correct: true }],
  ])('never claims a guess nobody made: %j', (saved) => {
    mount({ _heatLab: { firstRace: saved } });
    expect(card().getAttribute('data-ht-first-race')).toBe('predict');
    expect(card().textContent).not.toMatch(/locked|You guessed/);
    expect(host.querySelector('[data-ht-fr-opt="a"]')).toBeTruthy();
  });
});

describe('hostile values for the new keys', () => {
  it.each([
    [{ htTopic: { x: 1 }, htAll: 'yes', firstRace: 'x', timeScale: 'auto', hotEnd: 'hot' }],
    [{ htTopic: 'nope', htAll: 1, firstRace: [1, 2], timeScale: { a: 1 }, hotEnd: -5 }],
    [{ htTopic: 5, firstRace: null, timeScale: 'auto', hotEnd: 1e9, matId: 'x', matBId: 'y', raceOn: 'yes' }],
    [{ firstRace: { a: 'wood', b: 'wood', pick: 'tie', stage: 'done', winner: 'tie', correct: true, reachA: 'x', reachB: null } }],
  ])('mounts to a usable first topic: %j', (saved) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    mount({ _heatLab: saved });
    expect(sec('conduction').hidden).toBe(false);
    expect(sec('conduction').textContent).not.toMatch(/undefined|NaN|\[object/);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('focus never falls to the page', () => {
  it('moves to the card when Lock, Race again and New race remove the pressed button', () => {
    const box = mount({});
    click(host.querySelector('[data-ht-fr-opt="a"] input'));
    press(host.querySelector('[data-ht-fr-start]'));
    expect(document.activeElement).toBe(card());
    click(byLabel(/^Use a Steel bar$/));
    press(card().querySelector('[data-ht-fr-again]'));
    expect(box.d().firstRace.stage).toBe('racing');
    expect(document.activeElement).toBe(card());
    stepUntilDone(box, 40);
    press(card().querySelector('[data-ht-fr-next]'));
    expect(card().getAttribute('data-ht-first-race')).toBe('predict');
    expect(document.activeElement).toBe(card());
  });

  it('returns to Topics when "Show every topic" closes the menu it sits in', () => {
    const box = mount({});
    const btn = host.querySelector('[data-ht-topics-btn]');
    click(btn);
    press(host.querySelector('[data-ht-all-topics]'));
    expect(box.d().htAll).toBe(true);
    expect(host.querySelector('#ht-topic-menu').hidden).toBe(true);
    expect(document.activeElement).toBe(btn);
  });
});

describe('nothing keeps sounding from a hidden topic', () => {
  function audioStub() {
    const node = () => new Proxy({}, {
      get(_, k) {
        if (k === 'frequency' || k === 'gain') return new Proxy({}, { get: () => () => {} });
        return () => {};
      },
    });
    window.StemLab.audioContext = () => ({ currentTime: 0, state: 'running', destination: {}, createOscillator: node, createGain: node, resume() {} });
  }

  it('stops the ticking thermometer when its topic is left, and says so', () => {
    audioStub();
    const box = mount({});
    const tick = () => host.querySelector('[data-ht-tick]');
    click(tick());
    expect(tick().getAttribute('aria-pressed')).toBe('true');
    box.announced.length = 0;
    click(byLabel(/^Jump to Insulation$/));
    expect(sec('conduction').hidden).toBe(true);
    expect(tick().getAttribute('aria-pressed')).toBe('false');
    expect(box.announced).toContain('Ticking thermometer off.');
  });

  it('keeps ticking while every topic shows, but not after leaving conduction mode', () => {
    audioStub();
    mount({ _heatLab: { htAll: true } });
    const tick = () => host.querySelector('[data-ht-tick]');
    click(tick());
    click(byLabel(/^Jump to Insulation$/));
    expect(tick().getAttribute('aria-pressed')).toBe('true');
    click(buttons(sec('conduction')).find((b) => b.textContent.trim() === 'Convection'));
    expect(tick()).toBeNull();
    click(buttons(sec('conduction')).find((b) => b.textContent.trim() === 'Conduction'));
    expect(tick().getAttribute('aria-pressed')).toBe('false');
  });

  it('stops a graph sound when its topic is left', () => {
    audioStub();
    mount({ _heatLab: { energyIn: 1900, htTopic: 'heatingcurve' } });
    const hear = () => sec('heatingcurve').querySelector('[data-ht-hear]');
    click(hear());
    expect(hear().getAttribute('aria-pressed')).toBe('true');
    click(byLabel(/^Jump to Insulation$/));
    expect(hear().getAttribute('aria-pressed')).toBe('false');
  });
});

describe('reduced motion read live', () => {
  it('offers Advance as soon as reduced motion freezes a running race', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    mount({});
    lockGuess('a');
    runFrame(16);
    expect(buttons(sec('conduction')).some((b) => /^Advance /.test(b.textContent))).toBe(false);
    reduce = true;
    runFrame(32);
    expect(buttons(sec('conduction')).some((b) => /^Advance /.test(b.textContent))).toBe(true);
    expect(host.querySelector('[data-ht-fr-speed]').textContent).toMatch(/Press “Advance”/);
  });

  it('restarts the frozen race when reduced motion is turned off again', () => {
    reduce = true;
    const box = mount({});
    lockGuess('a');
    frames = [];
    reduce = false;
    expect(mqListeners.size).toBeGreaterThan(0);
    React.act(() => [...mqListeners].forEach((fn) => fn({ matches: false })));
    expect(frames.length).toBeGreaterThan(0);
    expect(host.querySelector('[data-ht-fr-speed]').textContent).toMatch(/The race is on/);
    expect(box.d().firstRace.stage).toBe('racing');
  });

  it('removes its media-query listener on unmount', () => {
    mount({});
    expect(mqListeners.size).toBeGreaterThan(0);
    React.act(() => root.unmount());
    root = null;
    expect(mqListeners.size).toBe(0);
  });
});

describe('teacher-hidden topics', () => {
  const log = [{ kind: 'conduction-race', section: 'conduction', at: 1, hotC: 200 }];

  it('does not claim to jump to a hidden topic or park the student on it', () => {
    const box = mount({ _heatLab: { log, teacher: { hidden: ['notebook'] } } });
    box.announced.length = 0;
    click(byLabel(/^Open the lab notebook/));
    expect(box.d().htTopic).toBeUndefined();
    expect(box.announced.join(' ')).not.toMatch(/Jumped to/);
    expect(box.announced.join(' ')).toMatch(/hidden that topic/);
    expect(document.activeElement).not.toBe(sec('notebook'));
  });

  it('counts only the topics a student can open', () => {
    mount({ _heatLab: { teacher: { hidden: ['notebook', 'house'] } } });
    expect(host.querySelector('[data-ht-topics-btn]').textContent).toMatch(/Topics \(17\)/);
    expect(host.querySelector('#ht-topic-search').getAttribute('aria-label')).toMatch(/Search the 17 topics/);
    const practice = buttons(host.querySelector('#ht-topic-menu')).find((b) => /^Practice \(/.test(b.textContent));
    expect(practice.textContent).toMatch(/Practice \(3\)/);
  });
});
