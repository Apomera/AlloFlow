import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane G1: the Dive light toggle (aria-pressed, announcements, the first-time
// tip, the L key reported by the dive) and the direction cues in the Nearby
// list, the identification card and the HUD, driven against a stub engine.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const TIP = 'Where did the red go? Water soaks up red light first, so red fish look brown by about 10 m. A dive light brings the true colours back.';
const mounted = [];
let engines, X, TX, withLight, withCues;

const NEAR = [
  { uid: 'o1', speciesId: 'clownfish', distanceM: 2, inView: true, bearingDeg: 0, riseM: 0.2 },
  { uid: 'o2', speciesId: 'green_turtle', distanceM: 3, inView: true, bearingDeg: 90, riseM: 0.4 },
  { uid: 'o3', speciesId: 'brain_coral', distanceM: 3, inView: false, bearingDeg: -90, riseM: -1.6 },
  { uid: 'o4', speciesId: 'giant_clam', distanceM: 5, inView: false, bearingDeg: 180, riseM: -0.5 },
  { uid: 'o5', speciesId: 'parrotfish', distanceM: 6, inView: true, bearingDeg: 30, riseM: 2.1 },
  { uid: 'o6', speciesId: 'sea_fan', distanceM: 7, inView: false, bearingDeg: -150, riseM: -2.4 }
];
const WORDS = ['ahead', 'to your right', 'to your left and below you', 'behind you', 'ahead and above you', 'behind and below you'];

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; withLight = true; withCues = true;
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      const nearby = NEAR.map((n) => { const c = { ...n }; if (!withCues) { delete c.bearingDeg; delete c.riseM; } return c; });
      let state = { ready: true, paused: false, view: 'third', diver: { depthM: 8, headingDeg: 90 }, focused: null, nearby };
      if (withLight) state.light = false;
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        focus: vi.fn((uid) => { const found = state.nearby.find((n) => n.uid === uid); if (found) controller.emit({ focused: found }); }),
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })), setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      // The real dive reports a change only when the light really changes.
      if (withLight) controller.setLight = vi.fn((on) => { if (!!on !== state.light) controller.emit({ light: !!on }); });
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
});

afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m), ...extra });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const buttons = (el, label) => [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); }); }
async function startDive(t) { await click(buttons(t.host, 'Start the dive')[0]); expect(engines).toHaveLength(1); return engines[0]; }
const lightButton = (t) => t.host.querySelector('.cr-dive-controls button[data-dive-light]');
function rowSurface(li) {
  const parts = [li.textContent];
  for (const el of [li, ...li.querySelectorAll('*')]) for (const a of el.attributes) parts.push(a.value);
  return parts.join(' | ');
}

describe('dive light toggle', () => {
  it('sits with the dive controls as a real toggle, switches the light, and announces it; the tip comes the first time only', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    const btn = lightButton(t);
    expect(btn, 'a Dive light button in the controls bar').toBeTruthy();
    expect(btn.textContent.trim()).toBe('Dive light');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(t.host.querySelector('[data-light-tip]')).toBeNull();
    await click(btn);
    expect(engine.setLight).toHaveBeenLastCalledWith(true);
    expect(lightButton(t).getAttribute('aria-pressed')).toBe('true');
    expect(t.data.coralReef.diveLight).toBe(true);
    expect(t.announcements.at(-1)).toBe('Dive light on. ' + TIP);
    const tip = t.host.querySelector('[data-light-tip]');
    expect(tip, 'the first time, the tip about the missing red').toBeTruthy();
    expect(tip.textContent).toContain(TIP);
    await click(lightButton(t));
    expect(engine.setLight).toHaveBeenLastCalledWith(false);
    expect(lightButton(t).getAttribute('aria-pressed')).toBe('false');
    expect(t.announcements.at(-1)).toBe('Dive light off.');
    expect(t.host.querySelector('[data-light-tip]')).toBeNull();
    await click(lightButton(t));
    expect(t.announcements.at(-1)).toBe('Dive light on.');
    expect(t.host.querySelector('[data-light-tip]'), 'not again').toBeNull();
    expect(t.announcements.filter((m) => m.startsWith('Dive light')).length, 'one announcement per change').toBe(3);
  });

  it('follows the dive when its L key switches the light, and hiding the tip returns focus to the toggle', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await act(async () => engine.emit({ light: true }));
    expect(lightButton(t).getAttribute('aria-pressed')).toBe('true');
    expect(t.data.coralReef.diveLight).toBe(true);
    expect(t.announcements.at(-1)).toBe('Dive light on. ' + TIP);
    const hide = buttons(t.host.querySelector('[data-light-tip]'), 'Hide this tip')[0];
    await click(hide);
    expect(t.host.querySelector('[data-light-tip]')).toBeNull();
    expect(document.activeElement).toBe(lightButton(t));
    await act(async () => engine.emit({ light: false }));
    expect(lightButton(t).getAttribute('aria-pressed')).toBe('false');
    expect(t.data.coralReef.diveLight).toBe(false);
    expect(t.announcements.at(-1)).toBe('Dive light off.');
    expect(t.host.querySelector('canvas').getAttribute('aria-label')).toContain('L switches the dive light on or off');
  });

  it('keeps the choice: a new dive starts with the light the student left on', async () => {
    const t = await mountTool({ diveLight: true, diveLightTipSeen: true });
    const engine = await startDive(t);
    expect(engine.setLight).toHaveBeenCalledWith(true);
    expect(lightButton(t).getAttribute('aria-pressed')).toBe('true');
    expect(t.data.coralReef.diveLight).toBe(true);
    expect(t.host.querySelector('[data-light-tip]')).toBeNull();
  });

  it('is not offered by a dive that has no light', async () => {
    withLight = false;
    const t = await mountTool();
    await startDive(t);
    expect(lightButton(t)).toBeNull();
    expect(t.host.querySelector('.cr-dive-controls').textContent).toContain('Mask view');
  });

  it('reads well in every theme: the pressed toggle uses the accent pair', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const P = X.palette(theme);
      const t = await mountTool({}, { theme });
      await startDive(t);
      await click(lightButton(t));
      const st = lightButton(t).style;
      const rgb = (hex) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
      expect(st.background || st.backgroundColor, theme).toBe(rgb(P.accent));
      expect(st.color, theme).toBe(rgb(P.accentInk));
      const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); engines = [];
    }
  });
});

describe('direction cues', () => {
  it('each Nearby row says which way it is, with an arrow, and its buttons say it too, without naming what it is', async () => {
    const t = await mountTool();
    await startDive(t);
    const rows = [...t.host.querySelectorAll('li.crf-row')];
    expect(rows).toHaveLength(NEAR.length);
    const GN = ['Fish', 'Sea turtles', 'Invertebrates and sponges', 'Corals', 'Restoration structures'];
    for (const [i, li] of rows.entries()) {
      const n = NEAR[i], where = li.querySelector('[data-cue]');
      expect(where, n.uid).toBeTruthy();
      expect(where.textContent.trim(), n.uid).toBe(WORDS[i]);
      const arrow = where.querySelector('svg');
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      expect(arrow.querySelector('path').getAttribute('transform')).toBe('rotate(' + n.bearingDeg + ' 12 12)');
      const view = n.inView ? 'in view' : 'out of view';
      expect(li.textContent).toContain(n.distanceM + ' m, ' + view);
      for (const b of li.querySelectorAll('button')) expect(b.getAttribute('aria-label'), n.uid).toContain(n.distanceM + ' m, ' + view + ', ' + WORDS[i]);
      const surface = rowSurface(li), meta = X.SPECIES_META.find((m) => m.id === n.speciesId);
      for (const word of [TX[n.speciesId].name, n.speciesId, meta.scientific, ...GN].filter(Boolean)) expect(surface.includes(word), n.uid + ' leaks ' + word).toBe(false);
    }
  });

  it('words the boundaries the way the dive keys its updates: ahead below 45 degrees, behind from 135, above or below from 1.5 m', async () => {
    const cases = [[44, 0, 'ahead'], [45, 0, 'to your right'], [-44, 0, 'ahead'], [-45, 0, 'to your left'], [134, 0, 'to your right'], [135, 0, 'behind you'],
      [-135, 0, 'behind you'], [-180, 0, 'behind you'], [0, 1.4, 'ahead'], [0, 1.5, 'ahead and above you'], [0, -1.5, 'ahead and below you'], [-90, 3, 'to your left and above you'], [100, -2, 'to your right and below you'], [160, 2, 'behind and above you']];
    const t = await mountTool();
    const engine = await startDive(t);
    for (const [bearingDeg, riseM, words] of cases) {
      await act(async () => engine.emit({ nearby: [{ uid: 'o1', speciesId: 'clownfish', distanceM: 2, inView: true, bearingDeg, riseM }] }));
      expect(t.host.querySelector('li.crf-row [data-cue]').textContent.trim(), bearingDeg + ', ' + riseM).toBe(words);
    }
  });

  it('the identification card shows the direction of what is focused', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await act(async () => engine.focus('o3'));
    const chip = t.host.querySelector('.crf-look .crf-chips [data-cue]');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toBe('to your left and below you');
    expect(chip.querySelector('.crg-cap')).toBeTruthy();
    expect(chip.querySelector('svg path').getAttribute('transform')).toBe('rotate(-90 12 12)');
    expect(t.announcements.at(-1)).toBe('Looking at organism 3, 3 meters away, to your left and below you.');
    const css = [...t.host.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(css).toMatch(/\.crg-cap::first-letter\{text-transform:uppercase\}/);
  });

  it('the HUD points to the nearest organism not identified yet, by direction and distance only', async () => {
    const t = await mountTool({ speciesLog: { clownfish: {}, green_turtle: {} } });
    await startDive(t);
    const next = t.host.querySelector('[data-dive-hud] [data-hud-next]');
    expect(next).toBeTruthy();
    expect(next.querySelector('.crg-long').textContent).toBe('Nearest: 3 m to your left and below you');
    expect(next.querySelector('.crg-short').textContent, 'the phone form').toBe('3 m away');
    expect(next.querySelector('svg path').getAttribute('transform')).toBe('rotate(-90 12 12)');
    expect(next.textContent).not.toContain(TX.brain_coral.name);
    expect(t.host.querySelector('[data-dive-hud]').getAttribute('aria-hidden')).toBe('true');
  });

  it('with nothing left to identify the HUD has no pointer, and an engine without cues keeps the old wording', async () => {
    const all = Object.fromEntries(NEAR.map((n) => [n.speciesId, {}]));
    const done = await mountTool({ speciesLog: all });
    await startDive(done);
    expect(done.host.querySelector('[data-hud-next]')).toBeNull();
    expect(done.host.querySelector('[data-dive-hud]').textContent).toContain('All nearby identified');
    const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); engines = [];
    withCues = false;
    const t = await mountTool();
    const engine = await startDive(t);
    expect(t.host.querySelector('[data-cue]')).toBeNull();
    expect(t.host.querySelector('[data-hud-next]')).toBeNull();
    const look = t.host.querySelector('li.crf-row button');
    expect(look.getAttribute('aria-label')).toBe('Look: organism 1, Not identified yet, 2 m, in view');
    await act(async () => engine.focus('o2'));
    expect(t.announcements.at(-1)).toBe('Looking at organism 2, 3 meters away.');
  });

  it('the live dive interface, light on with its tip and a focus, passes axe', async () => {
    const t = await mountTool({ speciesLog: { clownfish: {} } });
    const engine = await startDive(t);
    await click(lightButton(t));
    await act(async () => engine.focus('o2'));
    expect(t.host.querySelector('[data-light-tip]')).toBeTruthy();
    const result = await runIsolatedAxe(t.host.innerHTML);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
  }, 60000);

  it('server-renders the explore page without a dive and without errors', () => {
    const html = renderTool('coralReef', { coralReef: { section: 'explore', diveLight: true } });
    expect(html).toContain('Start the dive');
    expect(html).not.toContain('data-dive-light');
  });
});
