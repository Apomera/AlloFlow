import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines, mountReady;
const button = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const row = (host, uid) => host.querySelector('[data-nearby-uid="' + uid + '"]');
const summary = host => host.querySelector('[data-nearby-summary]');
const organism = (uid, distanceM = 3) => ({ uid, speciesId: 'clownfish', distanceM, inView: true });
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
async function emit(ctl, update) { await act(async () => ctl.emit(update)); }

beforeEach(() => {
  resetStemLab(); engines = []; mountReady = true;
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: mountReady, paused: false, reducedMotion: !!options.reducedMotion, view: 'third',
      diver: { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 }, focused: null, nearby: [] };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(), lookCamera: vi.fn(),
      zoomCamera: vi.fn(), resetCamera: vi.fn(), focus: vi.fn(), swimTo: vi.fn(), focusNext: vi.fn(), clearFocus: vi.fn(),
      getState: () => state,
      emit(update) { state = { ...state, ...update }; options.onState(state); },
      setView: vi.fn(value => ctl.emit({ view: value })),
      setPaused: vi.fn(value => ctl.emit({ paused: !!value })),
      setReducedMotion: vi.fn(value => {
        const next = !!value;
        if (next === state.reducedMotion) return;
        ctl.emit({ reducedMotion: next, paused: next ? true : state.paused });
      }) };
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    if (!item.ended) await act(async () => item.root.unmount());
    item.host.remove();
  }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
});

async function mountTool(initialMotion = false) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), item = { host, root, ended: false };
  const cfg = window.StemLab._registry.coralReef;
  let updateMotion;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore' } });
    const [reduceMotion, setReduceMotion] = React.useState(initialMotion); updateMotion = setReduceMotion;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, reduceMotion });
  }
  mounted.push(item); await act(async () => root.render(React.createElement(Shell)));
  item.setMotion = async value => { await act(async () => updateMotion(value)); };
  item.unmount = async () => { await act(async () => root.unmount()); item.ended = true; };
  return item;
}
async function readyTool(initialMotion = false) {
  const item = await mountTool(initialMotion); await click(button(item.host, 'Start the dive'));
  expect(engines).toHaveLength(1); return Object.assign(item, { ctl: engines[0] });
}
async function withNearby(list = [organism('a'), organism('b', 5)]) {
  const item = await readyTool(); await emit(item.ctl, { nearby: list }); return item;
}
function deferThree() {
  delete window.THREE;
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  window.StemLab.ensureThree = vi.fn(() => promise);
  return async () => { await act(async () => { window.THREE = { stub: true }; resolve(window.THREE); await promise; }); };
}

describe('Nearby live-list focus continuity', () => {
  it.each(['Look', 'Swim to'])('recovers a removed focused %s action to the stable named summary', async label => {
    const t = await withNearby(), before = summary(t.host), action = button(row(t.host, 'a'), label);
    await focus(action); await emit(t.ctl, { nearby: [organism('b', 4)] });
    expect(action.isConnected).toBe(false); expect(document.activeElement).toBe(before);
    expect(summary(t.host)).toBe(before); expect(before.getAttribute('role')).toBe('group'); expect(before.tabIndex).toBe(-1);
    expect(document.getElementById(before.getAttribute('aria-labelledby')).textContent).toContain('1 nearby');
    expect(document.getElementById(before.getAttribute('aria-describedby')).textContent).toContain('Pause the reef');
    expect(t.ctl.focus).not.toHaveBeenCalled(); expect(t.ctl.swimTo).not.toHaveBeenCalled();
  });
  it('preserves the recovery target when the last row disappears and the list fills again', async () => {
    const t = await withNearby([organism('a')]), before = summary(t.host);
    await focus(button(row(t.host, 'a'), 'Look')); await emit(t.ctl, { nearby: [] });
    expect(document.activeElement).toBe(before); expect(before.textContent).toContain('Nothing close by');
    expect(t.host.querySelectorAll('[data-nearby-uid]')).toHaveLength(0);
    await emit(t.ctl, { nearby: [organism('c')] });
    expect(document.activeElement).toBe(before); expect(summary(t.host)).toBe(before); expect(row(t.host, 'c')).toBeTruthy();
  });
  it('retains the same focused action when rows reorder and distance labels change', async () => {
    const t = await withNearby(), action = button(row(t.host, 'a'), 'Swim to'); await focus(action);
    await emit(t.ctl, { nearby: [organism('b', 2), organism('a', 7)] });
    expect(row(t.host, 'a').querySelectorAll('button')[1]).toBe(action); expect(document.activeElement).toBe(action);
    expect(action.getAttribute('aria-label')).toContain('organism 2'); expect(action.getAttribute('aria-label')).toContain('7 m');
  });
  it.each(['outside', 'another row'])('does not reclaim focus after the user moves to %s', async destination => {
    const t = await withNearby(); await focus(button(row(t.host, 'a'), 'Look'));
    const target = destination === 'outside' ? button(t.host, 'Open the species guide') : button(row(t.host, 'b'), 'Swim to');
    await focus(target); await emit(t.ctl, { nearby: [organism('b', 4)] });
    expect(document.activeElement).toBe(target);
  });
  it('does not reclaim focus after an intentional blur', async () => {
    const t = await withNearby(), action = button(row(t.host, 'a'), 'Look'); await focus(action);
    await act(async () => action.blur()); expect(document.activeElement).toBe(document.body);
    await emit(t.ctl, { nearby: [organism('b')] }); expect(document.activeElement).toBe(document.body);
  });
  it.each(['window blur', 'hidden document'])('releases focus ownership on %s before a row disappears', async reason => {
    const t = await withNearby(); await focus(button(row(t.host, 'a'), 'Look'));
    if (reason === 'hidden document') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await act(async () => {
      if (reason === 'window blur') window.dispatchEvent(new Event('blur'));
      else document.dispatchEvent(new Event('visibilitychange'));
    });
    await emit(t.ctl, { nearby: [organism('b')] }); expect(document.activeElement).toBe(document.body);
  });
  it('does not refocus a removed list during unmount and releases its controller', async () => {
    const t = await withNearby(); await focus(button(row(t.host, 'a'), 'Look'));
    const focusSummary = vi.spyOn(summary(t.host), 'focus'); await t.unmount();
    expect(focusSummary).not.toHaveBeenCalled(); expect(document.activeElement).toBe(document.body);
    expect(t.ctl.dispose).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(focusSummary).not.toHaveBeenCalled();
  });
});

describe('Explore live reduced-motion continuity', () => {
  it('keeps the initial calm preference without forcing an initial pause', async () => {
    const t = await readyTool(true);
    expect(t.ctl.options.reducedMotion).toBe(true); expect(t.ctl.getState().paused).toBe(false);
    expect(t.ctl.setPaused).not.toHaveBeenCalled();
  });
  it('pauses when enabled, keeps that pause when disabled, and preserves the same dive and position', async () => {
    const t = await readyTool(), diver = t.ctl.getState().diver, canvas = t.ctl.canvas;
    await t.setMotion(true);
    expect(t.ctl.getState()).toMatchObject({ reducedMotion: true, paused: true, diver });
    expect(t.host.querySelector('[data-dive-status]').textContent).toContain('Reef paused');
    await t.setMotion(false);
    expect(t.ctl.getState()).toMatchObject({ reducedMotion: false, paused: true, diver });
    expect(engines).toHaveLength(1); expect(t.ctl.canvas).toBe(canvas); expect(t.ctl.dispose).not.toHaveBeenCalled();
    expect(t.ctl.setInput).not.toHaveBeenCalled();
  });
  it('preserves an explicit resume until a fresh enabled preference transition', async () => {
    const t = await readyTool(); await t.setMotion(true); await click(button(t.host, 'Pause the reef'));
    expect(t.ctl.getState().paused).toBe(false);
    await emit(t.ctl, { nearby: [organism('a')], diver: { ...t.ctl.getState().diver, headingDeg: 91 } });
    await t.setMotion(true); expect(t.ctl.getState().paused).toBe(false);
    await t.setMotion(false); expect(t.ctl.getState().paused).toBe(false);
    await t.setMotion(true); expect(t.ctl.getState().paused).toBe(true); expect(engines).toHaveLength(1);
  });
  it('keeps a deliberate user pause when the motion preference changes', async () => {
    const t = await readyTool(); await click(button(t.host, 'Pause the reef')); expect(t.ctl.getState().paused).toBe(true);
    await t.setMotion(true); await t.setMotion(false);
    expect(t.ctl.getState().paused).toBe(true); expect(t.ctl.dispose).not.toHaveBeenCalled();
  });
  it('uses the latest preference and carries an enable request across deferred Three loading', async () => {
    const resolveThree = deferThree(), t = await mountTool(false); await click(button(t.host, 'Start the dive'));
    expect(engines).toHaveLength(0); await t.setMotion(true); await resolveThree();
    expect(engines).toHaveLength(1); const ctl = engines[0];
    expect(ctl.options.reducedMotion).toBe(true); expect(ctl.getState().paused).toBe(true);
    expect(ctl.setPaused).toHaveBeenCalledWith(true); expect(ctl.dispose).not.toHaveBeenCalled();
  });
  it('does not apply an obsolete enable request that was withdrawn before loading finishes', async () => {
    const resolveThree = deferThree(), t = await mountTool(false); await click(button(t.host, 'Start the dive'));
    await t.setMotion(true); await t.setMotion(false); await resolveThree();
    expect(engines).toHaveLength(1); expect(engines[0].options.reducedMotion).toBe(false);
    expect(engines[0].getState().paused).toBe(false); expect(engines[0].setPaused).not.toHaveBeenCalled();
  });
  it('applies a preference change while staged loading is unready and keeps it through ready', async () => {
    mountReady = false; const t = await readyTool(false); expect(t.ctl.getState().ready).toBe(false);
    await t.setMotion(true); expect(t.ctl.getState()).toMatchObject({ ready: false, paused: true, reducedMotion: true });
    await emit(t.ctl, { ready: true }); expect(t.ctl.getState().paused).toBe(true);
    expect(t.host.querySelector('[data-dive-status]').textContent).toContain('Reef paused');
    expect(engines).toHaveLength(1); expect(t.ctl.dispose).not.toHaveBeenCalled();
  });
});
