import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Regression tests for the eleven confirmed Heat Lab bugs and the two suspected
// ones in the 2026-11-03 depth review (heatlab_report.md, section 5). Each test
// drives the behaviour the review measured, so it FAILS on the pre-fix file:
//   HEATLAB_SRC=<copy of the original> npx vitest run tests/heatlab_stage_a_bugs.test.js
const FILE = process.env.HEATLAB_SRC || 'stem_lab/stem_tool_heatlab.js';
const SRC = fs.readFileSync(FILE, 'utf8');

function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}
const MATERIALS = table('var MATERIALS = [');
const EVERYDAY = table('var EVERYDAY = [');

let cfg;
let host;
let root;
let previousAct;
let reduceMotion = false;

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  reduceMotion = false;
  resetStemLab();
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
  window.matchMedia = (q) => ({
    matches: reduceMotion && /reduce/.test(q), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
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
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
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
const byLabel = (label, scope) => buttons(scope).find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
function typeInto(input, value) {
  const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
  React.act(() => { set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const hook = (id) => cfg.questHooks.find((q) => q.id === id);

// Independent analytic midpoint of a 20 cm slab (ends at hot and 20 C).
function analyticMidReach(m, hot) {
  const L = 0.20, a = m.k / (m.rho * m.c);
  const mid = (t) => {
    let T = (hot + 20) / 2;
    for (let n = 1; n < 800; n++) T += 2 * (20 - hot) / (n * Math.PI) * Math.sin(n * Math.PI / 2) * Math.exp(-a * n * n * Math.PI * Math.PI * t / (L * L));
    return T;
  };
  let lo = 0, hi = 1;
  while (mid(hi) < 50) hi *= 2;
  for (let i = 0; i < 200; i++) { const m2 = (lo + hi) / 2; if (mid(m2) >= 50) hi = m2; else lo = m2; }
  return hi;
}

describe('Heat Lab stage A bug regressions', () => {
  it('Bug 1: the insulation badge is not won on mount without any learner action', () => {
    const box = mount({});
    expect(box.d().insulationWin).toBeFalsy();
    expect(hook('heat_insulation').check(box.d())).toBe(false);
  });

  it('Bug 2: opening everyday cards or engine rows does not pass their quests', () => {
    const box = mount({});
    const spot = host.querySelector('#htsec-spot');
    EVERYDAY.slice(0, 3).forEach((ev) => {
      const header = buttons(spot).find((b) => b.textContent.includes(ev.name));
      click(header);
    });
    const engines = host.querySelector('#htsec-engines');
    for (let i = 0; i < 3; i++) {
      const rows = buttons(engines).filter((b) => /details for/.test(b.getAttribute('aria-label') || ''));
      click(rows[i]);
    }
    expect(hook('heat_everyday').check(box.d())).toBe(false);
    expect(hook('heat_engine').check(box.d())).toBe(false);
  });

  it('Bug 3: Spot the mechanism hides each answer until the learner chooses', () => {
    const html = renderTool('heatLab', {});
    EVERYDAY.forEach((ev) => expect(html, ev.name).not.toContain(ev.mech));
  });

  it('Bug 4: reduced-motion steps report interpolated finish times, not a false tie', () => {
    reduceMotion = true;
    mount({ _heatLab: { raceOn: true, matId: 'copper', matBId: 'aluminium', hotEnd: 200 } });
    const advance = buttons().find((b) => b.textContent.trim() === 'Advance 10 s');
    expect(advance).toBeTruthy();
    for (let i = 0; i < 3; i++) click(advance);
    const status = host.querySelector('#heat-race-status').textContent;
    const times = [...status.matchAll(/reached the finish in ([\d.,]+) simulated seconds/g)].map((m) => Number(m[1].replace(/,/g, '')));
    expect(times).toHaveLength(2);
    const cu = analyticMidReach(MATERIALS.find((m) => m.id === 'copper'), 200);
    const al = analyticMidReach(MATERIALS.find((m) => m.id === 'aluminium'), 200);
    expect(Math.abs(times[0] - cu)).toBeLessThan(0.15);
    expect(Math.abs(times[1] - al)).toBeLessThan(0.15);
    expect(times[0]).not.toBe(times[1]);
  });

  it('Bug 5: no hot-end setting leaves the 50 C finish line unreachable', () => {
    const html = renderTool('heatLab', { _heatLab: { hotEnd: 30 } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const slider = doc.querySelector('#heat-hot-end');
    const min = Number(slider.getAttribute('min'));
    // The steady midpoint is (hot + 20) / 2, so the finish needs hot > 80 C.
    expect((min + 20) / 2).toBeGreaterThan(50);
    // An old save holding 30 C is clamped into the reachable range.
    expect(Number(slider.getAttribute('value'))).toBeGreaterThanOrEqual(min);
  });

  it('Bug 6: the 3D model snapshot sits in the convection 3D section', () => {
    const doc = new DOMParser().parseFromString(renderTool('heatLab', {}), 'text/html');
    const snap = doc.querySelector('[data-heat-3d-snapshot]');
    expect(snap.closest('[data-ht-sec]').getAttribute('data-ht-sec')).toBe('convection3d');
  });

  it('Bug 7: the bar grid spans the full 20 cm, so the race matches the slab solution', () => {
    const copper = MATERIALS.find((m) => m.id === 'copper');
    const T = new Float64Array(91).fill(20);
    let t = 0, reach = null;
    while (reach === null && t < 60) {
      cfg.models.advanceBar(T, copper, 200, 0.05, 0.20);
      t += 0.05;
      if (T[45] >= 50) reach = t;
    }
    // Old grid (dx = L/N) simulated a 0.1978 m bar and finished about 2% early.
    expect(Math.abs(reach / analyticMidReach(copper, 200) - 1)).toBeLessThan(0.005);
  });

  it('Bug 8: the heating-curve table shows the model figures, not hand-typed ones', () => {
    mount({});
    const toggle = buttons(host.querySelector('#htsec-heatingcurve')).find((b) => /Show the numbers/.test(b.textContent));
    click(toggle);
    const text = host.querySelector('#ht-table-heating').textContent;
    expect(text).toContain('794.4 kJ');
    expect(text).toContain('3,054.4 kJ');
    expect(text).not.toContain('795 kJ');
    expect(text).not.toContain('3,055 kJ');
  });

  it('Bug 9: calorimetry credit cannot be replayed on the same mix', () => {
    const box = mount({});
    const compare = () => byLabel('Compare your temperature estimate with the calorimetry model');
    typeInto(host.querySelector('#heat-predict'), '10');
    click(compare());
    const answer = box.d().mixEstimateResult.actual;
    for (let i = 0; i < 3; i++) {
      click(byLabel('Try another estimate'));
      typeInto(host.querySelector('#heat-predict'), answer.toFixed(1));
      click(compare());
      React.act(() => host.querySelector('input[name="heat-estimation-revision"][value="supported"]').click());
      typeInto(host.querySelector('#heat-estimation-reflection'), 'The model result matched my estimate.');
      const save = buttons().find((b) => b.textContent === 'Save evidence reflection');
      if (save && !save.disabled) click(save);
    }
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_estimate')).toHaveLength(0);
    expect(box.xp.filter((x) => x[0] === 'heatlab_mix_reflection').length).toBeLessThanOrEqual(1);
    expect(box.d().mixWins || 0).toBe(0);
  });

  it('Bug 10: the starting conduction mode counts once the learner moves on', () => {
    const box = mount({});
    click(byLabel('Show Convection'));
    click(byLabel('Show Radiation'));
    expect(hook('heat_transfer_run').check(box.d())).toBe(true);
  });

  it('Bug 11: the race says it measures diffusivity, not conductivity', () => {
    const html = renderTool('heatLab', { _heatLab: { raceOn: true, matId: 'fibre', matBId: 'glass' } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const note = doc.querySelector('[data-ht-diffusivity-note]');
    expect(note).toBeTruthy();
    expect(note.textContent).toMatch(/diffusivity/i);
    expect(note.textContent).toMatch(/conductivity/i);
  });

  it('Suspected: high contrast gets its own treatment, not the dark palette', () => {
    const dark = renderTool('heatLab', {}, { theme: 'dark' });
    const hc = renderTool('heatLab', {}, { theme: 'contrast', isContrast: true });
    expect(dark.includes('data-ht-hc="true"'), 'dark theme must not take the contrast treatment').toBe(false);
    expect(hc).toContain('data-ht-hc="true"');
    // 3D parts: distinct colours and at least two surface treatments in contrast.
    const m = SRC.match(/var HEAT_3D_CONTRAST = (\{[\s\S]*?\n  \});/);
    expect(m).toBeTruthy();
    const parts = new Function('return ' + m[1])();
    const colours = new Set(Object.keys(parts).filter((k) => k !== 'tank').map((k) => parts[k].color));
    expect(colours.size).toBe(4);
    expect(parts.heater.color).not.toBe(parts.ceiling.color);
    expect(new Set(Object.values(parts).map((p) => p.wire)).size).toBe(2);
  });

  it('Suspected: conduction-only water is labelled as still water', () => {
    const water = MATERIALS.find((m) => m.id === 'water');
    expect(water.name).not.toBe('Water');
    expect(water.name + ' ' + water.note).toMatch(/still|gelled/i);
  });
});
