import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
let engine, config, host, root, latest, replaceState, changeProfile, writes, frames, frameId;
const query = selector => host.querySelector(selector);
const current = () => query('#perception-stage-current');
const reference = () => query('#perception-stage-reference');
const opener = () => query('[data-perception-inspect-drawing]');
const overview = () => query('[data-perception-camera-overview]');
const preview = () => query('[data-perception-camera-overview-scene]');
const zoomControl = () => query('[data-perception-camera-zoom]');
const viewports = () => [...host.querySelectorAll('[data-perception-camera-viewport]')];
const move = direction => query('[data-perception-camera-move="' + direction + '"]');
function camera() {
  const read = node => ({ zoom: Number(node.dataset.cameraZoom), x: Number(node.dataset.cameraX), y: Number(node.dataset.cameraY) });
  const nodes = viewports(); expect(nodes.length).toBeGreaterThan(0);
  const value = read(nodes[0]); for (const node of nodes) expect(read(node)).toEqual(value);
  return value;
}
function expectWindow() {
  const value = camera(), window = query('[data-perception-camera-window]'); expect(window).toBeTruthy();
  for (const [name, expected] of Object.entries({ x: (value.x - .5 / value.zoom) * 800, y: (value.y - .5 / value.zoom) * 480, width: 800 / value.zoom, height: 480 / value.zoom })) {
    expect(Number(window.getAttribute(name)), name).toBeCloseTo(expected, 3);
  }
  return value;
}
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') || item.textContent).trim() === label);
  expect(node, label).toBeTruthy(); return node;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => (typeof node === 'string' ? button(node) : node).click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function zoom(value = 2) {
  if (query('[data-perception-inspector]').hidden) await click(opener());
  await input(zoomControl(), value);
}
async function key(node, value, modifiers = {}) { await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers }))); }
async function pointer(node, type, id, x, y, options = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries({ pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true, ...options })) Object.defineProperty(event, name, { value });
  await act(async () => node.dispatchEvent(event));
}
function rect({ left = 20, top = 30, width = 200, height = 120 } = {}) {
  return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height };
}
function geometry(node = overview()) { return vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(rect()); }
function capture(node) {
  let owner = null;
  Object.assign(node, {
    setPointerCapture: vi.fn(id => { owner = id; }),
    hasPointerCapture: vi.fn(id => owner === id),
    releasePointerCapture: vi.fn(id => { if (owner === id) owner = null; }),
  });
  return () => owner;
}
function sceneContents(svg) {
  const copy = svg.cloneNode(true); copy.querySelectorAll('title, desc').forEach(node => node.remove()); return copy.innerHTML;
}
function seed(experiment = 'brightness') {
  return engine.normalize({ experiment, models: { [experiment]: { note: 'Keep my drawing', prediction: engine.experiments.find(item => item.id === experiment).choices[0], cue: 'front' } },
    comparison: { experiment, model: { context: false, cue: 'back', note: 'Keep my pin' } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-07T12:00:00.000Z', model: { note: 'Keep my notebook' } }],
  });
}
async function mount(value = seed()) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { untouched: 37 } });
    const [profile, setProfile] = React.useState('overview-learner');
    latest = data; changeProfile = setProfile;
    replaceState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, setToolData: update => { writes++; setData(update); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function tick(time) {
  const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]); await act(async () => scheduled[1](time));
}
async function blobText(blob) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); }); }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  frames = new Map(); frameId = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Local drawing overview navigator', () => {
  it.each(IDS)('previews the complete current %s drawing only when inspection is open and magnified', async id => {
    await mount(seed(id)); const persisted = structuredClone(latest), drawing = current().outerHTML, pinned = reference().outerHTML;
    expect(overview()).toBeNull(); await click(opener()); expect(overview()).toBeNull();
    await zoom(); expect(overview().tagName).toBe('BUTTON'); expect(overview().getAttribute('aria-label')).toMatch(/current drawing/i);
    const previewSVG = query('[data-perception-camera-overview-svg]');
    expect(previewSVG.getAttribute('viewBox')).toBe('0 0 800 480'); expect(previewSVG.getAttribute('aria-hidden')).toBe('true');
    expect(previewSVG.contains(preview())).toBe(true); expect(preview().innerHTML).toBe(sceneContents(current())); expectWindow();
    expect(current().outerHTML).toBe(drawing); expect(reference().outerHTML).toBe(pinned);
    await click(opener()); expect(overview()).toBeNull(); expect(camera().zoom).toBe(2);
    await click(opener()); expectWindow(); expect(preview().innerHTML).toBe(sceneContents(current()));
    await click(query('[data-perception-camera-fit]')); expect(overview()).toBeNull();
    expect(latest).toEqual(persisted); expect(writes).toBe(0);
  });

  it.each([1.5, 2, 3])('tracks the crop in full-drawing coordinates at %sx across comparison layouts', async value => {
    await mount(); await zoom(value); await click(move('left')); await click(move('up')); const before = expectWindow();
    for (const layout of ['stacked', 'switch', 'slide', 'auto']) {
      await input(query('[data-perception-comparison-layout]'), layout); expect(expectWindow()).toEqual(before);
      if (layout === 'switch') { await click(query('[data-perception-show-pinned]')); expect(preview().innerHTML).toBe(sceneContents(current())); }
      expect(host.querySelectorAll('[data-perception-camera-overview]')).toHaveLength(1);
    }
    expect(writes).toBe(0);
  });

  it.each([[20, 30, .25, .25], [220, 30, .75, .25], [20, 150, .25, .75], [220, 150, .75, .75]])('repositions both drawings and clamps a selection at (%s, %s)', async (x, y, expectedX, expectedY) => {
    await mount(); await zoom(); const node = overview(); geometry();
    expect(viewports().every(view => view.dataset.panMode === 'false')).toBe(true);
    await pointer(node, 'pointerdown', 1, x, y); expect(expectWindow()).toEqual({ zoom: 2, x: expectedX, y: expectedY });
    await pointer(node, 'pointerup', 1, x, y); expect(camera()).toEqual({ zoom: 2, x: expectedX, y: expectedY }); expect(writes).toBe(0);
  });

  it('preserves the grab offset within the window and ignores another pointer', async () => {
    await mount(); await zoom(); const node = overview(); geometry(); const owner = capture(node), initial = camera();
    await pointer(node, 'pointerdown', 11, 140, 90); expect(camera()).toEqual(initial); expect(owner()).toBe(11);
    await pointer(node, 'pointermove', 12, 180, 102); expect(camera()).toEqual(initial);
    await pointer(node, 'pointermove', 11, 160, 102); const moved = expectWindow();
    expect(moved.x).toBeCloseTo(.6); expect(moved.y).toBeCloseTo(.6);
    await pointer(node, 'pointerup', 11, 160, 102); expect(owner()).toBeNull(); expect(camera()).toEqual(moved); expect(writes).toBe(0);
  });

  it.each([['width', 100], ['height', 60], ['left', 60], ['top', 70]])('cancels an overview drag when its %s changes', async (property, value) => {
    await mount(); await zoom(); const node = overview(), bounds = geometry(), owner = capture(node);
    await pointer(node, 'pointerdown', 21, 120, 90); await pointer(node, 'pointermove', 21, 140, 102); const moved = camera();
    bounds.mockReturnValue(rect({ [property]: value })); await pointer(node, 'pointermove', 21, 160, 114);
    expect(camera()).toEqual(moved); expect(owner()).toBeNull();
    bounds.mockReturnValue(rect()); await pointer(node, 'pointermove', 21, 180, 126); expect(camera()).toEqual(moved);
    await pointer(node, 'pointerdown', 22, 140, 102); await pointer(node, 'pointermove', 22, 160, 114); expect(camera()).not.toEqual(moved); expectWindow(); expect(writes).toBe(0);
  });

  it.each([['width', 100], ['top', 70]])('does not apply a final move when its %s changes before pointer release', async (property, value) => {
    await mount(); await zoom(); const node = overview(), bounds = geometry(), owner = capture(node);
    await pointer(node, 'pointerdown', 31, 120, 90); await pointer(node, 'pointermove', 31, 140, 102); const moved = camera();
    bounds.mockReturnValue(rect({ [property]: value })); await pointer(node, 'pointerup', 31, 160, 114);
    expect(camera()).toEqual(moved); expect(owner()).toBeNull();
    bounds.mockReturnValue(rect()); await pointer(node, 'pointermove', 31, 180, 126); expect(camera()).toEqual(moved); expect(writes).toBe(0);
  });

  it.each(['pointercancel', 'lostpointercapture'])('releases an overview drag on %s without a final move', async type => {
    await mount(); await zoom(); const node = overview(); geometry(); const owner = capture(node);
    await pointer(node, 'pointerdown', 41, 120, 90); await pointer(node, 'pointermove', 41, 140, 102); const moved = camera();
    await pointer(node, type, 42, 180, 126); expect(owner()).toBe(41);
    await pointer(node, type, 41, 180, 126); expect(owner()).toBeNull(); expect(camera()).toEqual(moved);
    await pointer(node, 'pointermove', 41, 180, 126); expect(camera()).toEqual(moved); expect(writes).toBe(0);
  });

  it('shares pointer ownership with the main drawing and slide divider', async () => {
    await mount(); await input(query('[data-perception-comparison-layout]'), 'slide'); await zoom(); await click(query('[data-perception-camera-pan]'));
    const node = overview(), viewport = viewports()[0], divider = query('[data-perception-slide-position]'), dividerDrag = query('[data-perception-slide-drag]'); geometry();
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(rect({ left: 0, top: 0, width: 800, height: 480 }));
    const overviewOwner = capture(node), viewportOwner = capture(viewport), dividerOwner = capture(dividerDrag), initial = camera();
    await pointer(viewport, 'pointerdown', 51, 400, 240); expect(viewportOwner()).toBe(51);
    await pointer(node, 'pointerdown', 52, 20, 30); expect(overviewOwner()).toBeNull(); expect(camera()).toEqual(initial);
    await pointer(viewport, 'pointercancel', 51, 400, 240);
    await pointer(node, 'pointerdown', 52, 120, 90); expect(overviewOwner()).toBe(52);
    await pointer(viewport, 'pointerdown', 51, 400, 240); await pointer(dividerDrag, 'pointerdown', 53, 400, 240);
    expect(viewportOwner()).toBeNull(); expect(dividerOwner()).toBeNull();
    await pointer(node, 'pointermove', 52, 140, 102); const moved = camera(); expect(moved).not.toEqual(initial);
    await pointer(node, 'pointerup', 52, 140, 102); expect(divider.value).toBe('50');
    await pointer(dividerDrag, 'pointerdown', 53, 400, 240); expect(dividerOwner()).toBe(53);
    await pointer(node, 'pointerdown', 54, 20, 30); expect(overviewOwner()).toBeNull(); expect(camera()).toEqual(moved);
    await pointer(dividerDrag, 'pointercancel', 53, 400, 240); expect(dividerOwner()).toBeNull(); expect(writes).toBe(0);
  });

  it('ignores non-primary and non-left-button starts and cancels when the inspector closes', async () => {
    await mount(); await zoom(); const node = overview(); geometry(); const owner = capture(node), initial = camera();
    await pointer(node, 'pointerdown', 61, 20, 30, { isPrimary: false });
    await pointer(node, 'pointerdown', 62, 20, 30, { button: 2 }); expect(camera()).toEqual(initial); expect(owner()).toBeNull();
    await pointer(node, 'pointerdown', 63, 120, 90); expect(owner()).toBe(63);
    await click(opener()); expect(overview()).toBeNull(); expect(owner()).toBeNull();
    await pointer(node, 'pointermove', 63, 160, 114); expect(camera()).toEqual(initial);
    await click(opener()); expectWindow(); expect(writes).toBe(0);
  });

  it('supports arrows, larger Shift steps, native keyboard activation, Escape, and Home', async () => {
    await mount(); await zoom(); const node = overview(); geometry(); const owner = capture(node), initial = camera();
    await act(async () => node.focus()); expect(document.activeElement).toBe(node);
    await key(node, 'ArrowRight', { ctrlKey: true }); expect(camera()).toEqual(initial);
    await key(node, 'ArrowRight'); const right = expectWindow(); expect(right.x - initial.x).toBeCloseTo(.05);
    await key(node, 'ArrowLeft', { shiftKey: true }); expect(initial.x - camera().x).toBeCloseTo(.1);
    await click(node); expect(camera()).toEqual(initial);
    await pointer(node, 'pointerdown', 71, 120, 90); expect(owner()).toBe(71);
    await key(node, 'ArrowDown'); expect(owner()).toBeNull(); const moved = camera();
    await pointer(node, 'pointermove', 71, 160, 114); expect(camera()).toEqual(moved);
    await pointer(node, 'pointerdown', 72, 120, 96); await key(node, 'Escape'); expect(owner()).toBeNull(); expect(camera()).toEqual(moved);
    await click(query('[data-perception-camera-pan]')); await key(node, 'Escape'); expect(viewports()[0].dataset.panMode).toBe('false');
    await key(node, 'Home'); expect(camera()).toEqual({ zoom: 1, x: .5, y: .5 }); expect(overview()).toBeNull(); expect(document.activeElement).toBe(zoomControl()); expect(writes).toBe(0);
  });

  it('refreshes current drawing changes while preserving the camera and pinned drawing', async () => {
    await mount(seed('necker')); await zoom(); await click(move('left')); const before = camera(), oldPreview = preview().innerHTML, pin = reference().outerHTML;
    await act(async () => replaceState(previous => ({ ...previous, models: { ...previous.models, necker: { ...previous.models.necker, cue: 'back' } } })));
    expect(preview().innerHTML).not.toBe(oldPreview); expect(preview().innerHTML).toBe(sceneContents(current())); expect(camera()).toEqual(before); expect(reference().outerHTML).toBe(pin);
    await input(query('#perception-note'), 'Changed observation'); expect(camera()).toEqual(before); expect(preview().innerHTML).toBe(sceneContents(current()));
  });

  it('resets overview navigation for a replaced reference, experiment, and learner', async () => {
    await mount(); await zoom(); const oldNode = overview(); geometry(); const owner = capture(oldNode);
    await pointer(oldNode, 'pointerdown', 81, 120, 90);
    await act(async () => replaceState(previous => ({ ...previous, comparison: { experiment: 'brightness', model: { context: true, contrast: 11 } } })));
    expect(overview()).toBeNull(); expect(owner()).toBeNull(); expect(camera()).toEqual({ zoom: 1, x: .5, y: .5 });
    await zoom(); await pointer(oldNode, 'pointermove', 81, 160, 114); expect(camera()).toEqual({ zoom: 2, x: .5, y: .5 });
    await click(query('[data-perception-experiment="ponzo"]')); expect(overview()).toBeNull(); expect(camera().zoom).toBe(1);
    await zoom(); await act(async () => changeProfile('another-learner')); expect(overview()).toBeNull(); expect(camera().zoom).toBe(1);
  });

  it('keeps the moiré preview live without saving the animation angle', async () => {
    await mount(seed('moire')); await click('Play slow rotation'); await tick(0); await tick(1000); const persisted = structuredClone(latest);
    await zoom(); const before = preview().innerHTML, position = camera(); await tick(2000);
    expect(preview().innerHTML).not.toBe(before); expect(preview().innerHTML).toBe(sceneContents(current())); expect(camera()).toEqual(position);
    await click(overview()); expect(button('Pause rotation').getAttribute('aria-pressed')).toBe('true'); expect(latest).toEqual(persisted); expect(writes).toBe(0);
  });

  it('keeps SVG and notebook downloads complete and unchanged after overview navigation', async () => {
    const blobs = []; vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:overview-' + blobs.length; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); const persisted = structuredClone(latest); await click('Export SVG'); await click('Export notebook');
    await zoom(3); const node = overview(); geometry(); await pointer(node, 'pointerdown', 91, 20, 30); await pointer(node, 'pointerup', 91, 20, 30);
    await click('Export SVG'); await click('Export notebook'); expect(blobs).toHaveLength(4);
    expect(await blobText(blobs[2])).toBe(await blobText(blobs[0])); expect(await blobText(blobs[3])).toBe(await blobText(blobs[1]));
    const exported = new DOMParser().parseFromString(await blobText(blobs[2]), 'image/svg+xml');
    expect(exported.querySelector('parsererror')).toBeNull(); expect(exported.documentElement.getAttribute('viewBox')).toBe('0 0 800 480');
    expect(exported.querySelector('[data-perception-camera-window]')).toBeNull(); expect(latest).toEqual(persisted); expect(writes).toBe(0);
  });

  it('never renders an overview during repeated matching or reveals hidden measurements', async () => {
    const value = seed(); value.models.brightness.matching = true; value.models.brightness.matchValue = 153;
    await mount(value); await zoom(); expect(preview().querySelector('[data-perception-guide]')).toBeNull(); expect(preview().querySelectorAll('text')).toHaveLength(0);
    const node = overview(); geometry(); const owner = capture(node); await pointer(node, 'pointerdown', 101, 120, 90);
    await click('Start three matches'); expect(owner()).toBeNull(); expect(overview()).toBeNull(); expect(query('[data-perception-camera-overview-svg]')).toBeNull(); expect(opener().disabled).toBe(true);
    expect(camera()).toEqual({ zoom: 1, x: .5, y: .5 }); expect(current().querySelector('[data-perception-guide]')).toBeNull(); expect(query('[data-perception-result]')).toBeNull();
    await pointer(node, 'pointermove', 101, 160, 114); expect(camera().zoom).toBe(1);
    await click('End repeated study'); expect(overview()).toBeNull(); await zoom(); expectWindow(); expect(preview().querySelector('[data-perception-guide]')).toBeNull();
  });
});
