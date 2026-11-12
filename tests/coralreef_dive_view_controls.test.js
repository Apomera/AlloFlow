// 2026-11-10 dive UX: steady nearby rows, controls on the view, full screen, touch swim stick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines;
const button = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label);
const ov = (host, key) => host.querySelector('[data-dive-ov="' + key + '"]');
const rows = host => [...host.querySelectorAll('[data-nearby-uid]')].map(r => r.getAttribute('data-nearby-uid'));
const organism = (uid, distanceM = 3) => ({ uid, speciesId: 'clownfish', distanceM, inView: true });
const DIVER = { x: 2, y: -8, z: 4, depthM: 8, headingDeg: 90 };
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function emit(ctl, update) { await act(async () => ctl.emit(update)); }
async function pointer(node, type, x, y) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: 7 }); Object.defineProperty(e, 'pointerType', { value: 'touch' });
  await act(async () => { node.dispatchEvent(e); });
}

beforeEach(() => {
  resetStemLab(); engines = [];
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DExplore = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: true, paused: false, reducedMotion: false, view: 'third', diver: DIVER, focused: null, navigation: null, nearby: [] };
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setInput: vi.fn(), lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(),
      focus: vi.fn(), swimTo: vi.fn(), cancelSwim: vi.fn(), focusNext: vi.fn(), clearFocus: vi.fn(), preview: vi.fn(() => true),
      getState: () => state,
      emit(update) { state = { ...state, ...update }; options.onState(state); },
      setView: vi.fn(value => ctl.emit({ view: value })), setPaused: vi.fn(value => ctl.emit({ paused: !!value })), setReducedMotion: vi.fn() };
    engines.push(ctl); options.onState(state); return ctl;
  } };
  loadTool(SOURCE, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
});

async function dive() {
  const outside = document.createElement('button'); outside.textContent = 'outside'; document.body.appendChild(outside);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), item = { host, root, outside };
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore' } });
    item.data = toolData.coralReef;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, reduceMotion: false });
  }
  mounted.push({ host, root }); await act(async () => root.render(React.createElement(Shell)));
  await click(button(host, 'Start the dive'));
  item.ctl = engines[0]; item.stage = host.querySelector('.cr-dive-stage');
  return item;
}

describe('nearby rows keep their places', () => {
  it('does not shuffle rows while the diver stays put, so Swim to reaches the row that was pressed', async () => {
    const t = await dive();
    await emit(t.ctl, { nearby: [organism('a', 1), organism('b', 2), organism('c', 3)] });
    expect(rows(t.host)).toEqual(['a', 'b', 'c']);
    // The dive re-sorts by distance on every report as fish drift.
    await emit(t.ctl, { nearby: [organism('c', 0.5), organism('b', 1), organism('a', 2)] });
    expect(rows(t.host)).toEqual(['a', 'b', 'c']);
    await click([...t.host.querySelector('[data-nearby-uid="a"]').querySelectorAll('button')].find(b => b.textContent.trim() === 'Swim to'));
    expect(t.ctl.swimTo).toHaveBeenCalledWith('a');
  });
  it('adds new arrivals at the end, drops ones that left, and re-sorts once the diver has swum on', async () => {
    const t = await dive();
    await emit(t.ctl, { nearby: [organism('a', 1), organism('b', 2), organism('c', 3)] });
    await emit(t.ctl, { nearby: [organism('d', 0.4), organism('c', 1), organism('a', 2)] });
    expect(rows(t.host)).toEqual(['a', 'c', 'd']);
    await emit(t.ctl, { diver: { ...DIVER, x: DIVER.x + 1 }, nearby: [organism('d', 0.4), organism('c', 1), organism('a', 2)] });
    expect(rows(t.host), 'a short drift is not a move').toEqual(['a', 'c', 'd']);
    await emit(t.ctl, { diver: { ...DIVER, x: DIVER.x + 3 }, nearby: [organism('d', 0.4), organism('c', 1), organism('a', 2)] });
    expect(rows(t.host)).toEqual(['d', 'c', 'a']);
    expect(t.host.textContent).toContain('Rows keep their places while you stay still');
  });
});

describe('controls on the dive view', () => {
  it('names what is selected and swims to exactly that organism', async () => {
    const t = await dive();
    expect(t.host.querySelector('.cro-sel')).toBeNull();
    await emit(t.ctl, { nearby: [organism('near', 1), organism('far', 9)], focused: { uid: 'far', speciesId: 'clownfish', distanceM: 9 } });
    const bar = t.host.querySelector('.cro-sel');
    expect(bar.getAttribute('data-dive-selected')).toBe('far');
    expect(bar.textContent).toContain('Selected: Not identified yet, 9 m');
    await click(ov(t.host, 'swim'));
    expect(t.ctl.swimTo).toHaveBeenCalledTimes(1);
    expect(t.ctl.swimTo).toHaveBeenCalledWith('far');
    await emit(t.ctl, { navigation: { uid: 'far' } });
    expect(t.host.querySelector('.cro-sel').textContent).toContain('Swimming to: Not identified yet');
    await click(ov(t.host, 'stop'));
    expect(t.ctl.cancelSwim).toHaveBeenCalledTimes(1);
    await emit(t.ctl, { navigation: null });
    await click(ov(t.host, 'clear'));
    expect(t.ctl.clearFocus).toHaveBeenCalled();
  });
  it('pauses, switches to mask view, and has a name on every icon button', async () => {
    const t = await dive();
    for (const key of ['full', 'pause', 'mask', 'stick']) expect(ov(t.host, key).getAttribute('aria-label'), key).toBeTruthy();
    await click(ov(t.host, 'pause'));
    expect(t.ctl.setPaused).toHaveBeenLastCalledWith(true);
    expect(ov(t.host, 'pause').getAttribute('aria-pressed')).toBe('true');
    await click(ov(t.host, 'mask'));
    expect(t.data.diveView).toBe('first');
  });
  it('the swim stick sends forward and turn, and lets go when the finger lifts', async () => {
    const t = await dive();
    expect(t.host.querySelector('[data-dive-stick-pad]'), 'hidden for a mouse until asked for').toBeNull();
    await click(ov(t.host, 'stick'));
    expect(t.data.diveStick).toBe('on');
    expect(t.stage.getAttribute('data-dive-stick')).toBe('true');
    const pad = t.host.querySelector('[data-dive-stick-pad]');
    t.ctl.setInput.mockClear();
    await pointer(pad, 'pointerdown', 0, 0);
    await pointer(pad, 'pointermove', 0, -20);
    expect(t.ctl.setInput).toHaveBeenLastCalledWith({ forward: 1, turn: 0 });
    await pointer(pad, 'pointermove', 20, 0);
    expect(t.ctl.setInput).toHaveBeenLastCalledWith({ forward: 0, turn: 1 });
    await pointer(pad, 'pointerup', 20, 0);
    expect(t.ctl.setInput).toHaveBeenLastCalledWith({ forward: 0, turn: 0 });
    await pointer(ov(t.host, 'rise'), 'pointerdown', 0, 0);
    expect(t.ctl.setInput).toHaveBeenLastCalledWith({ rise: 1 });
    await pointer(ov(t.host, 'rise'), 'pointerup', 0, 0);
    expect(t.ctl.setInput).toHaveBeenLastCalledWith({ rise: 0 });
    await click(ov(t.host, 'stick'));
    expect(t.data.diveStick).toBe('off');
    expect(t.host.querySelector('[data-dive-stick-pad]')).toBeNull();
  });
});

describe('Nearby list on the view, with a preview ring', () => {
  it('opens the list in a panel on the view; pointing or Tab at a row previews it, leaving clears it', async () => {
    const t = await dive();
    await emit(t.ctl, { nearby: [organism('a', 1), organism('b', 2)] });
    await click(ov(t.host, 'near'));
    const panel = t.host.querySelector('[data-dive-near-panel]');
    expect(panel, 'opens outside full screen too').toBeTruthy();
    expect(panel.querySelectorAll('[data-nearby-uid]').length).toBe(2);
    const rowB = panel.querySelector('[data-nearby-uid="b"]');
    await act(async () => { rowB.dispatchEvent(new MouseEvent('pointerover', { bubbles: true })); });
    expect(t.ctl.preview).toHaveBeenLastCalledWith('b');
    await act(async () => { rowB.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: t.outside })); });
    expect(t.ctl.preview).toHaveBeenLastCalledWith(null);
    await act(async () => { rowB.querySelector('button').focus(); });
    expect(t.ctl.preview).toHaveBeenLastCalledWith('b');
    await click([...rowB.querySelectorAll('button')].find(b => b.textContent.trim() === 'Swim to'));
    expect(t.ctl.swimTo).toHaveBeenLastCalledWith('b');
    await click(ov(t.host, 'near'));
    expect(t.host.querySelector('[data-dive-near-panel]')).toBeNull();
    expect(t.host.textContent).toContain('a pale blue ring shows which one it is');
    t.outside.remove();
  });
  it('folds the image save and radar navigator into More dive tools, and remembers it open', async () => {
    const t = await dive();
    const more = t.host.querySelector('[data-dive-more]');
    expect(more.tagName).toBe('DETAILS');
    expect(more.open).toBe(false);
    expect(more.querySelector('[data-dive-navigation]'), 'the radar is inside it').toBeTruthy();
    more.open = true;
    await act(async () => { more.dispatchEvent(new Event('toggle')); });
    expect(t.data.diveToolsOpen).toBe(true);
    t.outside.remove();
  });
});

describe('camera on the view', () => {
  function cameraReady(ctl) { Object.assign(ctl, { setPhotoMode: vi.fn(), checkFrame: vi.fn(() => ({ subject: null, checks: {}, stars: 0, hidden: false })), captureImage: vi.fn(() => null), setMagnification: vi.fn(m => ctl.emit({ magnification: m })), findSpecies: vi.fn(() => null) }); }
  it('starts from the view; in full screen the lens and shot list are on the view too; the bar keeps clear of the shutter', async () => {
    const t = await dive();
    cameraReady(t.ctl); await emit(t.ctl, { magnification: 1 });
    await click(ov(t.host, 'camera'));
    expect(t.host.querySelector('[data-reef-shutter]'), 'the viewfinder is up').toBeTruthy();
    expect(t.stage.getAttribute('data-dive-cam')).toBe('true');
    expect(t.host.querySelector('.cro-cam'), 'the lens row is for full screen only').toBeNull();
    await click(button(t.host, 'Full screen'));
    await click(ov(t.host, 'zoom-4'));
    expect(t.ctl.setMagnification).toHaveBeenLastCalledWith(4);
    expect(ov(t.host, 'zoom-4').getAttribute('aria-pressed')).toBe('true');
    await click(ov(t.host, 'shots'));
    const panel = t.host.querySelector('[data-dive-shots-panel]');
    expect(panel).toBeTruthy();
    expect(panel.querySelector('[data-reef-camera="on"]'), 'the full camera panel, with its shot list').toBeTruthy();
    expect(t.stage.getAttribute('data-dive-full')).toBe('fill');
    await click(ov(t.host, 'camera'));
    expect(t.host.querySelector('[data-reef-shutter]')).toBeNull();
    expect(t.host.querySelector('[data-dive-shots-panel]'), 'putting the camera away closes the shot list').toBeNull();
    const css = [...t.host.querySelectorAll('style')].map(s => s.textContent).join('');
    expect(css.includes('.cr-dive-stage[data-dive-cam] .cro-sel{bottom:166px}'), 'the selected bar moves above the shutter').toBe(true);
    t.outside.remove();
  });
});

describe('identifying inside full screen', () => {
  const choice = (host, re) => [...host.querySelectorAll('[data-dive-id-panel] .crf-choice')].find(b => re.test(b.textContent));
  it('opens the identify card on the view, records a right answer, and Escape returns to the dive', async () => {
    const t = await dive();
    await click(button(t.host, 'Full screen'));
    await emit(t.ctl, { nearby: [organism('fish', 2)], focused: { uid: 'fish', speciesId: 'clownfish', distanceM: 2 } });
    expect(t.host.querySelector('[data-dive-id-panel]')).toBeNull();
    await click(ov(t.host, 'identify'));
    const panel = t.host.querySelector('[data-dive-id-panel]');
    expect(panel, 'the card opens on the view').toBeTruthy();
    expect(t.stage.getAttribute('data-dive-full'), 'still in full screen').toBe('fill');
    expect(t.stage.getAttribute('data-dive-id')).toBe('true');
    expect(t.host.querySelector('.cro-sel'), 'the selected bar steps aside').toBeNull();
    expect(t.host.querySelector('[data-dive-stick-pad]'), 'so does the stick').toBeNull();
    expect(panel.contains(document.activeElement), 'focus moves into the card').toBe(true);
    expect(panel.querySelectorAll('.crf-choice').length).toBeGreaterThan(1);
    const ids = [...t.host.querySelectorAll('[id]')].map(n => n.id).filter(Boolean);
    expect(ids.length, 'the two copies of the card never share an id').toBe(new Set(ids).size);
    await click(choice(t.host, /anemonefish/i));
    expect(t.host.querySelector('[data-dive-id-panel] .crf-id').getAttribute('data-id-state')).toBe('right');
    expect(t.data.speciesLog && t.data.speciesLog.clownfish).toBeTruthy();
    expect(document.activeElement.id).toMatch(/-fs$/);
    await act(async () => { t.host.querySelector('[data-dive-id-panel]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(t.host.querySelector('[data-dive-id-panel]')).toBeNull();
    expect(t.stage.getAttribute('data-dive-full'), 'Escape on the card does not leave full screen').toBe('fill');
    expect(document.activeElement.tagName).toBe('CANVAS');
    t.outside.remove();
  });
  it('outside full screen, Identify goes to Look closer and opens no panel', async () => {
    const t = await dive();
    await emit(t.ctl, { nearby: [organism('fish', 2)], focused: { uid: 'fish', speciesId: 'clownfish', distanceM: 2 } });
    await click(ov(t.host, 'identify'));
    expect(t.host.querySelector('[data-dive-id-panel]')).toBeNull();
    t.outside.remove();
  });
  it('fits the view to a short screen and stacks the reveal inside the panel', async () => {
    const t = await dive();
    const css = [...t.host.querySelectorAll('style')].map(s => s.textContent).join('');
    expect(css.includes('@media (max-height:520px){[data-coralreef-root][data-coralreef-root] .cr-dive-stage:not([data-dive-full]) canvas[role=application]{height:calc(100vh - 16px)!important')).toBe(true);
    expect(css.includes('.cro-panel .crf-reveal{grid-template-columns:minmax(0,1fr)')).toBe(true);
    t.outside.remove();
  });
});

describe('full screen', () => {
  it('fills the window where the browser has no full screen, shows the swim stick, and Escape leaves it', async () => {
    const t = await dive();
    expect(t.stage.hasAttribute('data-dive-full')).toBe(false);
    await click(button(t.host, 'Full screen'));
    expect(t.stage.getAttribute('data-dive-full')).toBe('fill');
    expect(ov(t.host, 'full').getAttribute('aria-label')).toBe('Exit full screen');
    expect(t.host.querySelector('[data-dive-stick-pad]'), 'the stick comes with full screen').toBeTruthy();
    expect(t.outside.inert, 'the page behind leaves the tab order').toBe(true);
    expect(t.ctl.resize).toHaveBeenCalled();
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(t.stage.hasAttribute('data-dive-full')).toBe(false);
    expect(t.outside.inert).toBe(false);
    t.outside.remove();
  });
  it('uses the browser full screen when it is offered, and ends with the dive', async () => {
    const t = await dive();
    let current = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => current });
    t.stage.requestFullscreen = vi.fn(() => { current = t.stage; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); });
    document.exitFullscreen = vi.fn(() => { current = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); });
    await click(ov(t.host, 'full'));
    expect(t.stage.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(t.stage.getAttribute('data-dive-full')).toBe('native');
    await click(ov(t.host, 'full'));
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(t.stage.hasAttribute('data-dive-full')).toBe(false);
    delete document.fullscreenElement; delete document.exitFullscreen; t.outside.remove();
  });
});
