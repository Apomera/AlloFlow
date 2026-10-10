import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
let engine, config, host, root, latest, replaceState, changeProfile, writes, frames, frameId;
const query = selector => host.querySelector(selector);
const current = () => query('#perception-stage-current');
const reference = () => query('#perception-stage-reference');
const opener = () => query('[data-perception-inspect-drawing]');
const panel = () => query('[data-perception-inspector]');
const zoomControl = () => query('[data-perception-camera-zoom]');
const pan = () => query('[data-perception-camera-pan]');
const fit = () => query('[data-perception-camera-fit]');
const move = direction => query('[data-perception-camera-move="' + direction + '"]');
const viewports = () => [...host.querySelectorAll('[data-perception-camera-viewport]')];
function camera() {
  const nodes = viewports(); expect(nodes.length).toBeGreaterThan(0);
  const read = node => ({ zoom: node.dataset.cameraZoom, x: node.dataset.cameraX, y: node.dataset.cameraY });
  const value = read(nodes[0]); for (const node of nodes) expect(read(node)).toEqual(value);
  for (const coordinate of Object.values(value)) expect(Number.isFinite(Number(coordinate))).toBe(true);
  const edge = .5 / Number(value.zoom);
  for (const axis of ['x', 'y']) {
    expect(Number(value[axis])).toBeGreaterThanOrEqual(edge - 1e-8);
    expect(Number(value[axis])).toBeLessThanOrEqual(1 - edge + 1e-8);
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
  const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function inspect() { if (!panel() || panel().hidden) await click(opener()); expect(panel()).toBeTruthy(); expect(panel().hidden).toBe(false); }
async function zoom(percent) {
  await inspect(); const option = [...zoomControl().options].find(item => item.textContent.includes(percent + '%'));
  expect(option, 'Zoom option ' + percent).toBeTruthy(); await input(zoomControl(), option.value);
}
async function key(node, value, modifiers = {}) { await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers }))); }
async function tick(time) {
  const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]);
  await act(async () => scheduled[1](time));
}
async function pointer(node, type, id, x, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [name, value] of Object.entries({ pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true })) Object.defineProperty(event, name, { value });
  await act(async () => node.dispatchEvent(event));
}
function viewportRect({ left = 0, top = 0, width = 800, height = 480 } = {}) {
  return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height };
}
function seed(experiment = 'brightness') {
  return engine.normalize({ experiment, models: { [experiment]: { note: 'Keep my current note', prediction: engine.experiments.find(item => item.id === experiment).choices[0], cue: 'front' } },
    comparison: { experiment, model: { context: false, cue: 'back', note: 'Keep my pin' } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-07T12:00:00.000Z', model: { note: 'Keep my notebook' } }],
  });
}
async function mount(value = seed(), strict = false) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { untouched: 37 } });
    const [profile, setProfile] = React.useState('inspector-learner');
    latest = data; changeProfile = setProfile;
    replaceState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, setToolData: update => { writes++; setData(update); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
async function beginInquiry() {
  const card = query('[data-perception-inquiry]');
  await act(async () => { card.open = true; card.dispatchEvent(new Event('toggle')); });
  const capture = query('[data-perception-inquiry-start]'); await act(async () => capture.focus()); await click(capture);
  expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
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

describe('Local drawing inspector', () => {
  it.each(IDS)('magnifies and pans %s without altering either original SVG or persisted state', async id => {
    await mount(seed(id)); const before = structuredClone(latest), drawing = current().innerHTML, pinnedDrawing = reference().innerHTML;
    await inspect(); expect(zoomControl().tagName).toBe('SELECT'); expect(zoomControl().options).toHaveLength(4);
    const initial = camera();
    for (const percent of [150, 200, 300]) {
      await zoom(percent); expect(camera().zoom).toBe(String(percent / 100));
      await click(move('left')); await click(move('up')); camera();
      expect(current().getAttribute('viewBox')).toBe('0 0 800 480'); expect(reference().getAttribute('viewBox')).toBe('0 0 800 480');
      expect(current().innerHTML).toBe(drawing); expect(reference().innerHTML).toBe(pinnedDrawing);
      expect(current().closest('[data-perception-camera-layer]').dataset.perceptionCameraLayer).toBe('current');
      expect(reference().closest('[data-perception-camera-layer]').dataset.perceptionCameraLayer).toBe('reference');
    }
    await click(fit()); expect(camera()).toEqual(initial);
    expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('keeps one camera at equal scale across side-by-side, stacked, switch, and slide layouts', async () => {
    await mount(); await zoom(200); await click(move('left')); await click(move('up')); const before = camera(), persisted = structuredClone(latest);
    for (const value of ['stacked', 'switch', 'slide', 'auto']) {
      await input(query('[data-perception-comparison-layout]'), value); expect(camera()).toEqual(before);
      if (value === 'switch') { await click(query('[data-perception-show-pinned]')); expect(camera()).toEqual(before); }
      if (value === 'slide') {
        await input(query('[data-perception-slide-position]'), 31); expect(camera()).toEqual(before);
        expect(viewports().map(node => node.dataset.perceptionCameraViewport)).toEqual(['combined']);
      }
      expect(host.querySelectorAll('[data-perception-camera-zoom]')).toHaveLength(1);
    }
    expect(latest).toEqual(persisted); expect(writes).toBe(0);
  });

  it('bounds repeated directional moves and makes Fit restore the complete drawing', async () => {
    await mount(); await inspect(); const initial = camera(); await zoom(300);
    for (const direction of ['left', 'right', 'up', 'down']) {
      for (let step = 0; step < 40; step++) await click(move(direction));
      const edge = camera(); await click(move(direction)); expect(camera()).toEqual(edge);
    }
    await click(move('center')); expect(camera().zoom).not.toBe(initial.zoom);
    await click(fit()); expect(camera()).toEqual(initial); expect(writes).toBe(0);
  });

  it('provides focused-frame arrow movement, Home to fit, and Escape to exit explicit Pan mode', async () => {
    await mount(); await inspect(); const initial = camera(); await zoom(200); await click(pan());
    const viewport = viewports()[0]; await act(async () => viewport.focus()); expect(document.activeElement).toBe(viewport);
    expect(viewport.dataset.panMode).toBe('true'); const magnified = camera();
    await key(viewport, 'ArrowRight', { ctrlKey: true }); expect(camera()).toEqual(magnified);
    await key(viewport, 'ArrowRight'); expect(camera()).not.toEqual(magnified);
    const moved = camera(); await key(viewport, 'Escape'); expect(viewport.dataset.panMode).toBe('false'); expect(camera()).toEqual(moved);
    await key(viewport, 'Home'); expect(camera()).toEqual(initial); expect(writes).toBe(0);
  });

  it('ignores another pointer and canceled drags while keeping camera motion separate from the slide divider', async () => {
    await mount(); await input(query('[data-perception-comparison-layout]'), 'slide'); await zoom(200); await click(pan());
    const viewport = viewports()[0], divider = query('[data-perception-slide-position]');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 480, width: 800, height: 480 });
    const initial = camera(), initialDivider = divider.value;
    await pointer(viewport, 'pointerdown', 51, 400, 240); await pointer(viewport, 'pointermove', 52, 480, 280); expect(camera()).toEqual(initial);
    await pointer(viewport, 'pointermove', 51, 450, 260); expect(camera()).not.toEqual(initial); expect(divider.value).toBe(initialDivider);
    await pointer(viewport, 'pointercancel', 51, 450, 260); const canceled = camera();
    await pointer(viewport, 'pointermove', 51, 550, 300); expect(camera()).toEqual(canceled);
    await input(divider, 72); expect(camera()).toEqual(canceled); expect(divider.value).toBe('72');
    await pointer(viewport, 'pointerdown', 51, 400, 240);
    await act(async () => replaceState(previous => ({ ...previous, comparison: { experiment: 'brightness', model: { context: true, contrast: 11 } } })));
    await zoom(200); const replacementCamera = camera();
    await pointer(viewport, 'pointermove', 51, 550, 300); expect(camera()).toEqual(replacementCamera);
    expect(writes).toBe(0);
  });

  it.each([['width', 400], ['height', 240], ['left', 80], ['top', 80]])('cancels a pan when viewport %s changes', async (property, value) => {
    await mount(); await zoom(200); await click(pan());
    const viewport = viewports()[0], persisted = structuredClone(latest);
    const bounds = vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(viewportRect());
    await pointer(viewport, 'pointerdown', 61, 400, 240);
    await pointer(viewport, 'pointermove', 61, 480, 260);
    const moved = camera(); expect(Number(moved.x)).toBeCloseTo(.45);
    bounds.mockReturnValue(viewportRect({ [property]: value }));
    await pointer(viewport, 'pointermove', 61, 560, 280); expect(camera()).toEqual(moved);
    bounds.mockReturnValue(viewportRect());
    await pointer(viewport, 'pointermove', 61, 600, 300); expect(camera()).toEqual(moved);
    await pointer(viewport, 'pointerup', 61, 600, 300); expect(camera()).toEqual(moved);
    await pointer(viewport, 'pointerdown', 62, 400, 240);
    await pointer(viewport, 'pointermove', 62, 480, 260); expect(camera()).not.toEqual(moved);
    expect(viewport.dataset.panMode).toBe('true'); expect(latest).toEqual(persisted); expect(writes).toBe(0);
  });

  it.each([['width', 400], ['top', 80]])('does not apply a final pan movement when viewport %s changes before release', async (property, value) => {
    await mount(); await zoom(200); await click(pan());
    const viewport = viewports()[0];
    const bounds = vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(viewportRect());
    await pointer(viewport, 'pointerdown', 71, 400, 240);
    await pointer(viewport, 'pointermove', 71, 480, 260);
    const moved = camera(); expect(Number(moved.x)).toBeCloseTo(.45);
    bounds.mockReturnValue(viewportRect({ [property]: value }));
    await pointer(viewport, 'pointerup', 71, 560, 280); expect(camera()).toEqual(moved);
    bounds.mockReturnValue(viewportRect());
    await pointer(viewport, 'pointermove', 71, 600, 300); expect(camera()).toEqual(moved);
    expect(writes).toBe(0);
  });

  it('releases an active pan when expanding or compacting while retaining the camera', async () => {
    await mount(); await zoom(200); await click(pan());
    const viewport = viewports()[0], persisted = structuredClone(latest);
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(viewportRect());
    let captured = null;
    Object.assign(viewport, {
      setPointerCapture: vi.fn(id => { captured = id; }),
      hasPointerCapture: vi.fn(id => captured === id),
      releasePointerCapture: vi.fn(id => { if (captured === id) captured = null; }),
    });
    for (const label of ['Expand viewing area', 'Compact viewing area']) {
      await pointer(viewport, 'pointerdown', 81, 400, 240);
      await pointer(viewport, 'pointermove', 81, 480, 260);
      const moved = camera(); expect(captured).toBe(81);
      await click(label); expect(camera()).toEqual(moved); expect(captured).toBeNull();
      await pointer(viewport, 'pointermove', 81, 560, 280); expect(camera()).toEqual(moved);
      await pointer(viewport, 'pointerup', 81, 560, 280); expect(camera()).toEqual(moved);
    }
    expect(viewport.releasePointerCapture).toHaveBeenCalledTimes(2);
    expect(viewport.dataset.panMode).toBe('true'); expect(latest).toEqual(persisted); expect(writes).toBe(2);
  });

  it('retains the camera through current setting, note, prediction, and reveal edits', async () => {
    await mount(); await zoom(200); await click(move('left')); const beforeCamera = camera(), before = structuredClone(latest);
    await input(query('#perception-contrast'), 45); await input(query('#perception-note'), 'Updated current note'); await click('Same'); await click('Reveal measurements');
    expect(camera()).toEqual(beforeCamera); expect(latest.perceptionLab.comparison).toEqual(before.perceptionLab.comparison);
    expect(latest.perceptionLab.studies).toEqual(before.perceptionLab.studies); expect(latest.otherTool).toEqual(before.otherTool);
  });

  it('resets for a new reference and when returning to an old pair', async () => {
    await mount(); const initial = camera(), oldReference = structuredClone(latest.perceptionLab.comparison); await zoom(200); await click(move('left'));
    await act(async () => replaceState(previous => ({ ...previous, comparison: { experiment: 'brightness', model: { contrast: 11, context: true } } }))); expect(camera()).toEqual(initial);
    await zoom(300); await act(async () => replaceState(previous => ({ ...previous, comparison: oldReference }))); expect(camera()).toEqual(initial);
    await zoom(200); await click(query('[data-perception-experiment="necker"]')); expect(camera()).toEqual(initial);
    await click(query('[data-perception-experiment="brightness"]')); expect(camera()).toEqual(initial);
  });

  it('resets between pinned, surroundings, and inquiry modes while retaining live surroundings edits', async () => {
    await mount(seed('cafeWall')); const initial = camera(); await zoom(200);
    await click(query('[data-perception-compare-context]')); expect(camera()).toEqual(initial);
    await zoom(300); await click(move('left')); const contextCamera = camera(); await input(query('#perception-offset'), 72); expect(camera()).toEqual(contextCamera);
    await click(query('[data-perception-close-context]')); expect(camera()).toEqual(initial);
    await zoom(200); await beginInquiry(); expect(camera()).toEqual(initial);
    await zoom(300); await input(query('#perception-offset'), 21); const inquiryCamera = camera();
    await input(query('#perception-note'), 'Inquiry note'); expect(camera()).toEqual(inquiryCamera);
    await click(query('[data-perception-inquiry-start]')); expect(camera()).toEqual(initial);
  });

  it('resets local camera preferences for a new learner', async () => {
    await mount(); const initial = camera(); await zoom(200); await click(pan()); const before = structuredClone(latest);
    await act(async () => changeProfile('another-learner')); expect(camera()).toEqual(initial);
    expect(viewports().every(node => node.dataset.panMode === 'false')).toBe(true); expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('retains the camera through expanded and focused viewing with a single active inspector', async () => {
    await mount(seed('ponzo'), true); await zoom(200); await click(move('up')); const before = camera();
    await click('Expand viewing area'); expect(camera()).toEqual(before);
    await click('Focus experiment'); expect(query('[data-perception-focus-dialog]').contains(viewports()[0])).toBe(true); expect(camera()).toEqual(before);
    await click('Back to workspace'); expect(camera()).toEqual(before); expect(document.activeElement).toBe(button('Focus experiment'));
    expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1); expect(host.querySelectorAll('[data-perception-camera-zoom]')).toHaveLength(1);
  });

  it('keeps rotation running and the camera stable without committing a moiré animation frame', async () => {
    await mount(seed('moire')); await click('Play slow rotation'); await tick(0); await tick(1000);
    const before = structuredClone(latest); await zoom(200); await click(move('left')); const beforeCamera = camera(); await tick(2000);
    expect(camera()).toEqual(beforeCamera); expect(button('Pause rotation').getAttribute('aria-pressed')).toBe('true');
    await click(fit()); expect(button('Pause rotation').getAttribute('aria-pressed')).toBe('true'); expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('keeps SVG and notebook downloads complete and unchanged after zooming and panning', async () => {
    const blobs = []; vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:inspector-' + blobs.length; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); const before = structuredClone(latest); await click('Export SVG'); await click('Export notebook');
    await zoom(300); await click(move('left')); await click(move('down')); await click('Export SVG'); await click('Export notebook');
    expect(blobs).toHaveLength(4); expect(await blobText(blobs[2])).toBe(await blobText(blobs[0])); expect(await blobText(blobs[3])).toBe(await blobText(blobs[1]));
    const exported = new DOMParser().parseFromString(await blobText(blobs[2]), 'image/svg+xml');
    expect(exported.querySelector('parsererror')).toBeNull(); expect(exported.documentElement.getAttribute('viewBox')).toBe('0 0 800 480');
    expect(exported.querySelector('[data-perception-context]')).toBeTruthy(); expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('preserves hidden measurements and resets/disables inspection during repeated matching', async () => {
    const value = seed(); value.models.brightness.matching = true; value.models.brightness.matchValue = 153;
    await mount(value); const initial = camera(); await zoom(200); await click(pan());
    for (const svg of [current(), reference()]) { expect(svg.querySelector('[data-perception-guide]')).toBeNull(); expect(svg.querySelectorAll('text')).toHaveLength(0); }
    await click('Start three matches'); expect(camera()).toEqual(initial); expect(opener().disabled).toBe(true);
    expect(viewports().every(node => node.dataset.panMode === 'false')).toBe(true); expect(query('[data-perception-result]')).toBeNull();
    expect(current().querySelector('[data-perception-guide]')).toBeNull(); await click('End repeated study'); expect(opener().disabled).toBe(false);
    await zoom(200); expect(camera().zoom).not.toBe(initial.zoom);
  });
});
