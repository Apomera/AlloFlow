import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Engagement pass (2026-11-04): the first minute (guess, then race two
// different bars at an auto speed read off the heat-equation model), Simple
// band hygiene, the "drag me" / arrow-key hints, and one topic at a time
// behind a Topics menu with the detail level in a popover. Fail-first:
//   HEATLAB_SRC=<copy of the start file> npx vitest run tests/heatlab_engage_first_minute.test.js
const FILE = process.env.HEATLAB_SRC || 'stem_lab/stem_tool_heatlab.js';
const SRC = fs.readFileSync(FILE, 'utf8');
const MATERIALS = (() => {
  const mark = 'var MATERIALS = [';
  const a = SRC.indexOf(mark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + mark.length - 1, b) + '\n  ]')();
})();
let cfg, host, root, previousAct, drawn, reduce;
// A full Heat Lab mount takes several seconds in jsdom under load.
vi.setConfig({ testTimeout: 90000 });

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  drawn = [];
  reduce = false;
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
      fillText: (text) => { drawn.push(String(text)); },
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({ matches: reduce && /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
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
const buttons = (scope) => [...(scope || host).querySelectorAll('button')];
const byLabel = (re) => buttons().find((b) => re.test(b.getAttribute('aria-label') || ''));
const sec = (id) => host.querySelector('#htsec-' + id);
const canvas = () => sec('conduction').querySelector('canvas[role="img"]');
const isShown = (el) => { for (let p = el; p && p !== host; p = p.parentElement) if (p.hidden) return false; return true; };
function setRange(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  React.act(() => { set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
const M = () => cfg.models;
const mat = (id) => MATERIALS.find((m) => m.id === id);
// One press of the step = one second of wall time at the current speed.
function stepUntilDone(box, max) {
  let n = 0;
  while (n < max && box.d().firstRace && box.d().firstRace.stage !== 'done') {
    React.act(() => canvas()._heatStep());
    n++;
  }
  return n;
}

describe('auto race speed from the model', () => {
  it('fits copper against wood into about 20 s of wall time, rounded up to two figures', () => {
    const cu = M().midReachTime(mat('copper'), 200), wood = M().midReachTime(mat('wood'), 200);
    const s = M().autoTimeScale(Math.max(cu, wood));
    expect(wood / s).toBeLessThanOrEqual(20);
    expect(wood / s).toBeGreaterThan(14);
    expect(Number(s.toPrecision(2))).toBe(s);
    expect(M().autoTimeScale(10)).toBe(1);
    expect(M().autoTimeScale(Infinity)).toBe(10);
  });
});

describe('first minute: guess, then race two different bars', () => {
  it('asks Copper or Wood first, reveals nothing, and keeps the race off until the guess is locked', () => {
    const box = mount({}, { gradeBand: 'g68' });
    const card = host.querySelector('[data-ht-first-race]');
    expect(card.getAttribute('data-ht-first-race')).toBe('predict');
    expect(card.textContent).toMatch(/Copper or Wood: whose middle reaches 50 °C first\?/);
    expect(card.textContent).not.toMatch(/\d+(\.\d+)? (s|min|h)\b/);
    const start = card.querySelector('[data-ht-fr-start]');
    expect(start.disabled).toBe(true);
    expect(box.d().raceOn).toBeFalsy();
    expect(sec('conduction').textContent).not.toMatch(/Prediction: /);
  });

  it('locks the guess with the start, races at the auto speed and judges from the race itself', () => {
    const box = mount({}, { gradeBand: 'g68' });
    click(host.querySelector('[data-ht-fr-opt="a"] input'));
    click(host.querySelector('[data-ht-fr-start]'));
    const fr = box.d().firstRace;
    expect(fr).toMatchObject({ a: 'copper', b: 'wood', pick: 'a', stage: 'racing' });
    expect(box.d()).toMatchObject({ raceOn: true, matId: 'copper', matBId: 'wood', timeScale: 'auto' });
    // the guess can no longer change
    expect(host.querySelector('[data-ht-fr-opt]')).toBeNull();
    expect(host.querySelector('[data-ht-fr-guess]').textContent).toMatch(/Your guess: Copper \(locked\)/);
    const cu = M().midReachTime(mat('copper'), 200), wood = M().midReachTime(mat('wood'), 200);
    const s = M().autoTimeScale(Math.max(cu, wood));
    expect(Number(host.querySelector('[data-ht-fr-speed]').getAttribute('data-ht-fr-speed'))).toBe(s);
    expect(host.querySelector('[data-ht-fr-speed]').textContent).toContain('1 s here = ' + M().timeLabel(s) + ' of real time');
    expect(canvas().dataset.timeScale).toBe(String(s));
    const presses = stepUntilDone(box, 40);
    // both middles crossed inside about 20 s of wall time
    expect(presses).toBeLessThanOrEqual(20);
    const done = box.d().firstRace;
    expect(done.stage).toBe('done');
    expect(done.winner).toBe('a');
    expect(done.correct).toBe(true);
    expect(Math.abs(done.reachA - cu)).toBeLessThan(0.2);
    expect(Math.abs(done.reachB - wood) / wood).toBeLessThan(0.01);
    const result = host.querySelector('[data-ht-fr-result]');
    expect(result.getAttribute('data-ht-fr-result')).toBe('right');
    expect(result.textContent).toContain('Copper after ' + M().timeLabel(done.reachA));
    expect(result.textContent).toContain('Wood after ' + M().timeLabel(done.reachB));
    expect(box.announced.some((m) => /You guessed Copper: right!/.test(m))).toBe(true);
    // no XP for watching a race
    expect(box.xp).toEqual([]);
  });

  it('marks a wrong guess as wrong and offers a new pair with a fresh guess', () => {
    const box = mount({});
    click(host.querySelector('[data-ht-fr-opt="tie"] input'));
    click(host.querySelector('[data-ht-fr-start]'));
    stepUntilDone(box, 40);
    expect(box.d().firstRace).toMatchObject({ stage: 'done', winner: 'a', correct: false });
    expect(host.querySelector('[data-ht-fr-result]').getAttribute('data-ht-fr-result')).toBe('wrong');
    click(host.querySelector('[data-ht-fr-next]'));
    expect(box.d().firstRace).toMatchObject({ a: 'aluminium', b: 'steel', stage: 'predict', pick: null });
    expect(box.d().raceOn).toBe(false);
    expect(host.querySelector('[data-ht-first-race]').textContent).toMatch(/Aluminium or Steel/);
  });

  it('has an Auto speed pill whose "1 s here" note comes from the slower bar', () => {
    mount({ _heatLab: { raceOn: true, matId: 'copper', matBId: 'aerogel', timeScale: 'auto' } });
    const auto = byLabel(/^Auto speed/);
    expect(auto.getAttribute('aria-pressed')).toBe('true');
    expect(byLabel(/^Run at 10 times real time$/).getAttribute('aria-pressed')).toBe('false');
    const s = M().autoTimeScale(M().midReachTime(mat('aerogel'), 200));
    expect(host.querySelector('[data-ht-speed-note]').textContent).toBe('1 s here = ' + M().timeLabel(s) + ' of real time');
  });
});

describe('Simple band hygiene', () => {
  it('puts k, c and diffusivity behind "Show the maths" at Simple and rewords the floor note', () => {
    mount({}, { gradeBand: 'g68' });
    const s1 = sec('conduction');
    expect(s1.textContent).not.toContain('k = 401 W/m·K');
    expect(s1.querySelector('[data-ht-diffusivity-note]')).toBeNull();
    click(s1.querySelector('[data-ht-maths="race-props"] button'));
    expect(s1.textContent).toContain('k = 401 W/m·K');
    expect(s1.querySelector('[data-ht-diffusivity-note]')).toBeTruthy();
    const floor = s1.querySelector('[data-ht-hot-floor]').textContent;
    expect(floor).toMatch(/lowest hot end is 90 °C/);
    expect(floor).not.toMatch(/starts at 90/);
  });

  it('keeps the numbers in view at Standard', () => {
    mount({});
    expect(sec('conduction').textContent).toContain('k = 401 W/m·K');
    expect(sec('conduction').querySelector('[data-ht-diffusivity-note]')).toBeTruthy();
  });
});

describe('drag and arrow-key hints', () => {
  it('draws "drag" by P1 until a thermometer moves, and shows the arrow-key hint while the bar has focus', () => {
    mount({});
    expect(canvas().dataset.dragHint).toBe('on');
    expect(drawn).toContain('drag');
    setRange(host.querySelector('#heat-probe-0'), 7);
    expect(canvas().dataset.dragHint).toBe('off');
    drawn.length = 0;
    React.act(() => canvas()._heatDraw());
    expect(drawn).not.toContain('drag');
    expect(host.querySelector('[data-ht-key-hint]')).toBeNull();
    React.act(() => canvas().focus());
    expect(host.querySelector('[data-ht-key-hint]').textContent).toMatch(/Arrow keys change the hot end/);
    React.act(() => canvas().blur());
    expect(host.querySelector('[data-ht-key-hint]')).toBeNull();
  });
});

describe('one topic at a time', () => {
  it('shows only the current topic, keeps every section in the DOM, and has no sticky bar inline', () => {
    mount({}, { gradeBand: 'g68' });
    const all = [...host.querySelectorAll('section[data-ht-sec]')].map((s) => s.getAttribute('data-ht-sec'));
    expect(all.filter((id) => id !== 'next')).toHaveLength(19);
    const shown = all.filter((id) => !sec(id).hidden);
    expect(shown).toEqual(['conduction', 'next']);
    const nav = host.querySelector('nav[aria-label="Heat lab topics"]');
    expect(nav.style.position).toBe('');
    expect(host.querySelector('style').textContent).toContain('@media (min-width:640px) and (min-height:501px){[data-heat-lab] [data-ht-topicbar]{position:sticky');
    // the level bar lives in a closed popover
    expect(host.querySelector('#ht-settings').hidden).toBe(true);
    expect(host.querySelector('#ht-topic-menu').hidden).toBe(true);
  });

  it('opens the Topics menu, jumps to a topic, moves focus there, and closes with Escape', () => {
    const box = mount({});
    const btn = host.querySelector('[data-ht-topics-btn]');
    expect(btn.textContent).toMatch(/Topics \(19\)/);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#ht-topic-menu').hidden).toBe(false);
    expect(buttons(host.querySelector('#ht-topic-menu')).filter((b) => /^Jump to /.test(b.getAttribute('aria-label') || ''))).toHaveLength(19);
    click(byLabel(/^Jump to Insulation$/));
    expect(box.d().htTopic).toBe('insulation');
    expect(sec('insulation').hidden).toBe(false);
    expect(sec('conduction').hidden).toBe(true);
    expect(host.querySelector('#ht-topic-menu').hidden).toBe(true);
    expect(document.activeElement).toBe(sec('insulation'));
    // Escape closes an open menu and hands focus back to its button
    click(btn);
    React.act(() => host.querySelector('#ht-topic-search').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('#ht-topic-menu').hidden).toBe(true);
    expect(document.activeElement).toBe(btn);
  });

  it('pages to the next topic, offers every topic on one page, and skips topics the teacher hid', () => {
    const box = mount({});
    click(sec('conduction').querySelector('[data-ht-pager-next="insulation"]'));
    expect(box.d().htTopic).toBe('insulation');
    expect(sec('insulation').querySelector('[data-ht-pager-prev="conduction"]')).toBeTruthy();
    click(host.querySelector('[data-ht-all-topics]'));
    expect(box.d().htAll).toBe(true);
    expect([...host.querySelectorAll('section[data-ht-sec]')].filter((s) => s.hidden)).toHaveLength(0);
    React.act(() => root.unmount()); root = null;
    mount({ _heatLab: { teacher: { hidden: ['conduction'] } } });
    expect(sec('conduction')).toBeNull();
    expect(sec('insulation').hidden).toBe(false);
  });

  it('puts the detail level in a settings popover that still changes the level', () => {
    const box = mount({}, { gradeBand: 'g68' });
    const btn = host.querySelector('[data-ht-settings-btn]');
    expect(btn.getAttribute('aria-label')).toBe('Detail level: Simple. Change it');
    click(btn);
    expect(host.querySelector('#ht-settings').hidden).toBe(false);
    click(host.querySelector('[data-ht-level-btn="standard"]'));
    expect(box.d().level).toBe('standard');
    expect(btn.getAttribute('aria-label')).toBe('Detail level: Standard. Change it');
  });

  it('puts the bar within 15 tab stops of the top', () => {
    mount({}, { gradeBand: 'g68' });
    const focusables = [...host.querySelectorAll('button, input, select, textarea, a[href], [tabindex], canvas')]
      .filter((el) => el.tabIndex >= 0 && !el.disabled && isShown(el))
      // one stop per radio group
      .filter((el, i, list) => !(el.type === 'radio' && list.slice(0, i).some((p) => p.type === 'radio' && p.name === el.name)));
    const at = focusables.indexOf(canvas());
    expect(at).toBeGreaterThan(-1);
    expect(at + 1).toBeLessThan(15);
  });
});
