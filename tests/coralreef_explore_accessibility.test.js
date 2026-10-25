import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const source = readFileSync(SOURCE, 'utf8');
let padNode;
function visit(n) { if (!n || typeof n !== 'object') return; if (n.type === 'FunctionDeclaration' && n.id.name === 'MovePad') padNode = n; for (const v of Object.values(n)) { if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v); } }
visit(parse(source, { ecmaVersion: 'latest' }));
const MovePad = new Function('btnStyle', 'return (' + source.slice(padNode.start, padNode.end) + ')')(() => ({}));
const mounted = [];
let engines, mountReady;
const zero = { forward: 0, turn: 0, rise: 0 }, forward = { forward: 1, turn: 0, rise: 0 };
const button = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label);
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function event(node, type, extras = {}) { await act(async () => { const e = new Event(type, { bubbles: true, cancelable: true }); for (const [k, v] of Object.entries(extras)) Object.defineProperty(e, k, { value: v }); node.dispatchEvent(e); }); }
async function tick(ms) { await act(async () => vi.advanceTimersByTime(ms)); }

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true }; window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; mountReady = true;
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: mountReady, paused: false, view: 'third', diver: { depthM: 8, headingDeg: 90 }, focused: null, nearby: [] };
    const ctl = { canvas, options, dispose: vi.fn(), setInput: vi.fn(), lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), resize: vi.fn(),
      getState: () => state, emit(p) { state = { ...state, ...p }; options.onState(state); },
      setView: vi.fn(v => ctl.emit({ view: v })), setPaused: vi.fn(p => ctl.emit({ paused: p })), focusNext: vi.fn(), clearFocus: vi.fn() };
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); if (!item.ended) await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.useRealTimers();
});
async function rootFor(Component) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), item = { host, root, ended: false };
  mounted.push(item); await act(async () => root.render(React.createElement(Component))); return item;
}
async function mountTool() {
  const cfg = window.StemLab._registry.coralReef;
  return rootFor(function Shell() { const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore' } }); return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, reduceMotion: true }); });
}
async function readyTool() { const t = await mountTool(); await click(button(t.host, 'Start the dive')); expect(engines).toHaveLength(1); return { ...t, ctl: engines[0] }; }
async function mountPad() {
  vi.useFakeTimers(); let ctl = { setInput: vi.fn() };
  const labels = { group: 'Swim controls', forward: 'Forward', back: 'Back', left: 'Left', right: 'Right', up: 'Up', down: 'Down' };
  const props = { React, h: React.createElement, P: {}, ctl: () => ctl, labels };
  const Shell = () => React.createElement(MovePad, props), t = await rootFor(Shell);
  return Object.assign(t, { getCtl: () => ctl, async replace(next) { ctl = next; await act(async () => t.root.render(React.createElement(Shell))); } });
}

describe('Explore accessible camera and focus', () => {
  it('moves Start focus to the stable title and skips an unready canvas', async () => {
    mountReady = false; const t = await mountTool(), start = button(t.host, 'Start the dive'); start.focus(); await click(start);
    const title = t.host.querySelector('#cr-dive-title'), canvas = engines[0].canvas;
    expect(document.activeElement).toBe(title); expect(canvas.tabIndex).toBe(-1); expect(canvas.getAttribute('aria-busy')).toBe('true');
    await act(async () => engines[0].emit({ ready: true }));
    expect(canvas.tabIndex).toBe(0); expect(canvas.getAttribute('aria-busy')).toBe('false'); expect(document.activeElement).toBe(title);
  });
  it('keeps one persistent ready/pause status even without a host announcer', async () => {
    const t = await readyTool(), region = t.host.querySelector('[data-dive-status]');
    expect(region.getAttribute('role')).toBe('status'); expect(region.textContent).toContain('Dive ready.');
    const changes = []; const observer = new MutationObserver(records => changes.push(...records)); observer.observe(region, { childList: true, characterData: true, subtree: true });
    await act(async () => { t.ctl.emit({ diver: { depthM: 9, headingDeg: 92 } }); t.ctl.emit({ diver: { depthM: 10, headingDeg: 93 } }); });
    expect(changes).toHaveLength(0);
    await click(button(t.host, 'Pause the reef')); expect(region.textContent).toContain('Reef paused.'); expect(changes).toHaveLength(1);
    await act(async () => t.ctl.emit({ paused: true })); expect(changes).toHaveLength(1);
    await click(button(t.host, 'Pause the reef')); expect(region.textContent).toContain('Dive ready.'); expect(changes).toHaveLength(2);
    expect(t.host.querySelector('[data-dive-status]')).toBe(region); observer.disconnect();
  });
  it('offers all camera operations as named buttons that retain focus and pause', async () => {
    const t = await readyTool(), disclosure = t.host.querySelector('[data-dive-camera-controls]');
    expect(disclosure.querySelector('summary').textContent).toBe('Camera controls'); disclosure.open = true;
    await click(button(t.host, 'Pause the reef'));
    for (const [label, dx, dy] of [['Look left', -40, 0], ['Look right', 40, 0], ['Look up', 0, -40], ['Look down', 0, 40]]) { const b = button(disclosure, label); b.focus(); await click(b); expect(t.ctl.lookCamera).toHaveBeenLastCalledWith(dx, dy); expect(document.activeElement).toBe(b); }
    await click(button(disclosure, 'Zoom in')); expect(t.ctl.zoomCamera).toHaveBeenLastCalledWith(-0.18, undefined);
    await click(button(disclosure, 'Zoom out')); expect(t.ctl.zoomCamera).toHaveBeenLastCalledWith(0.18, undefined);
    await click(button(disclosure, 'Reset camera')); expect(t.ctl.resetCamera).toHaveBeenCalledTimes(1);
    expect(t.ctl.getState().paused).toBe(true); expect(t.ctl.setPaused).toHaveBeenCalledTimes(1); expect(t.ctl.setInput).not.toHaveBeenCalled();
  });
  it('disables zoom with an associated explanation in Mask view while retaining look controls', async () => {
    const t = await readyTool(); await click(button(t.host, 'Mask view'));
    for (const label of ['Zoom in', 'Zoom out']) { const b = button(t.host, label); expect(b.disabled).toBe(true); expect(document.getElementById(b.getAttribute('aria-describedby')).textContent).toContain('Zoom is unavailable in Mask view'); }
    expect(button(t.host, 'Look left').disabled).toBe(false); await click(button(t.host, 'Look left')); expect(t.ctl.lookCamera).toHaveBeenCalled();
    await click(button(t.host, 'Mask view')); expect(button(t.host, 'Zoom in').disabled).toBe(false);
  });
  it.each(['canvas', 'control'])('recovers disappearing %s focus on graphics error and retains the title through retry', async target => {
    const t = await readyTool(), title = t.host.querySelector('#cr-dive-title'); t.ctl.canvas.focus();
    if (target === 'control') { t.host.querySelector('[data-dive-camera-controls]').open = true; button(t.host, 'Look left').focus(); }
    await act(async () => t.ctl.options.onError(new Error('context lost'))); expect(document.activeElement).toBe(title); expect(t.ctl.dispose).toHaveBeenCalledTimes(1);
    const retry = button(t.host, 'Try the 3D view again'); retry.focus(); await click(retry);
    expect(engines).toHaveLength(2); expect(document.activeElement).toBe(title); expect(button(t.host, 'Pause the reef')).toBeTruthy();
  });
  it('does not steal focus from persistent controls when a graphics error arrives', async () => {
    const t = await readyTool(), guide = button(t.host, 'Open the species guide'); guide.focus();
    await act(async () => t.ctl.options.onError(new Error('context lost'))); expect(document.activeElement).toBe(guide);
    expect(t.host.querySelector('[role="alert"]').textContent).toContain('species guide');
  });
});

describe('MovePad owned input lifecycle', () => {
  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])('stops its held input on %s', async type => {
    const t = await mountPad(), b = button(t.host, 'Forward'), ctl = t.getCtl(); await event(b, 'pointerdown', { pointerId: 4, button: 0 }); expect(ctl.setInput).toHaveBeenLastCalledWith(forward);
    await event(b, type, { pointerId: 4 }); expect(ctl.setInput).toHaveBeenLastCalledWith(zero); await event(b, 'lostpointercapture', { pointerId: 4 }); expect(ctl.setInput).toHaveBeenCalledTimes(2);
  });
  it('ignores release from an older pointer and stops when the active button loses focus', async () => {
    const t = await mountPad(), b = button(t.host, 'Forward'), ctl = t.getCtl(); b.focus(); await event(b, 'pointerdown', { pointerId: 5 });
    await event(b, 'lostpointercapture', { pointerId: 4 }); expect(ctl.setInput).toHaveBeenCalledTimes(1);
    await act(async () => b.blur()); expect(ctl.setInput).toHaveBeenLastCalledWith(zero);
  });
  it('replaces a keyboard burst timer so an earlier activation cannot end the new burst', async () => {
    const t = await mountPad(), ctl = t.getCtl(); await click(button(t.host, 'Forward')); await tick(500); await click(button(t.host, 'Up'));
    expect(ctl.setInput).toHaveBeenLastCalledWith({ forward: 0, turn: 0, rise: 1 }); await tick(200); expect(ctl.setInput).toHaveBeenCalledTimes(3);
    await tick(500); expect(ctl.setInput).toHaveBeenLastCalledWith(zero); expect(ctl.setInput).toHaveBeenCalledTimes(4);
  });
  it('clears inputs and timers when the window blurs or the document is hidden', async () => {
    const t = await mountPad(), ctl = t.getCtl(); await click(button(t.host, 'Forward')); await event(window, 'blur'); expect(ctl.setInput).toHaveBeenLastCalledWith(zero);
    await click(button(t.host, 'Up')); vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); await event(document, 'visibilitychange'); expect(ctl.setInput).toHaveBeenLastCalledWith(zero);
    await tick(1000); expect(ctl.setInput).toHaveBeenCalledTimes(4);
  });
  it('stops only the initiating controller on replacement and never lets its timer affect the new one', async () => {
    const t = await mountPad(), first = t.getCtl(); await click(button(t.host, 'Forward')); await tick(300);
    const next = { setInput: vi.fn() }; await t.replace(next); expect(first.setInput).toHaveBeenLastCalledWith(zero); expect(next.setInput).not.toHaveBeenCalled();
    await click(button(t.host, 'Up')); await tick(400); expect(next.setInput).toHaveBeenCalledTimes(1); await tick(300); expect(next.setInput).toHaveBeenLastCalledWith(zero);
    expect(first.setInput).toHaveBeenCalledTimes(2);
  });
  it('releases owned input and removes global handlers and timers when unmounted', async () => {
    const t = await mountPad(), ctl = t.getCtl(); await click(button(t.host, 'Forward')); await act(async () => t.root.unmount()); t.ended = true;
    expect(ctl.setInput).toHaveBeenLastCalledWith(zero); expect(vi.getTimerCount()).toBe(0);
    await event(window, 'blur'); await event(document, 'visibilitychange'); await tick(1000); expect(ctl.setInput).toHaveBeenCalledTimes(2);
  });
});
