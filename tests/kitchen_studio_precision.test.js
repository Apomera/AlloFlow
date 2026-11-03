import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Keyboard = require('../stem_lab/kitchen_studio/kitchen_studio_keyboard.js');
const Measure = require('../stem_lab/kitchen_studio/kitchen_studio_measure_view.js');
const THREE = require('../vendor/three-r128/three.min.js');
const cleanups = [];

function fixture({ height = 420, width = 600, checkbox = true, checked = false, onPrecisionChange, keydownCheckpoints = false } = {}) {
  document.body.innerHTML = `<canvas id="canvas"></canvas><div id="studioToolFinder"></div>
    <details id="studioKeyboard"><summary>Keyboard tools</summary>
      <select id="studioKeyboardTool"></select>
      ${checkbox ? `<label><input id="studioKeyboardFine" type="checkbox" ${checked ? 'checked' : ''}>Fine movement</label>` : ''}
      <button id="studioKeyboardGrab">Pick up</button><button id="studioKeyboardCancel">Cancel</button>
      <p id="studioKeyboardStatus" role="status"></p></details>
    <div id="studioKeyboardPad" tabindex="-1" hidden><span id="studioKeyboardCursor"></span><span id="studioKeyboardLabel"></span></div>
    <button id="outside">Other control</button>`;
  const $ = id => document.getElementById(id), canvas = $('canvas');
  const rect = { left: 100, top: 100, width, height };
  canvas.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height });
  canvas.scrollIntoView = vi.fn();
  let tools = [{ id: 'probe', name: 'thermometer', enabled: true, hint: 'Move the sensing tip.' }, { id: 'jug', name: 'jug', enabled: true, hint: 'Adjust the amount.' }], held = null;
  const listeners = new Set(), emit = () => listeners.forEach(listener => listener(held));
  const adapter = {
    keyboardTools: vi.fn(() => tools), keyboardState: vi.fn(() => held),
    keyboardBegin: vi.fn(id => {
      const tool = tools.find(item => item.id === id); if (!tool?.enabled) return false;
      held = { id, name: tool.name, hint: 'Preview only. Release to place.', point: { x: 140, y: 150 }, phase: 'held' }; emit(); return true;
    }),
    keyboardMove: vi.fn((dx, dy) => { if (!held) return false; held = { ...held, point: { x: held.point.x + dx, y: held.point.y + dy } }; emit(); return true; }),
    keyboardAimNext: vi.fn(() => { if (!held) return false; held = { ...held, phase: 'ready', hint: 'Release at this target.' }; emit(); return true; }),
    keyboardRelease: vi.fn(() => { if (!held) return false; held = null; emit(); return true; }),
    cancel: vi.fn(() => { held = null; emit(); }),
    subscribeKeyboard: vi.fn(listener => { listeners.add(listener); listener(held); return () => listeners.delete(listener); })
  };
  const keydownHandlers = { pad: [], document: [] };
  if (keydownCheckpoints) {
    for (const [name, target] of [['pad', $('studioKeyboardPad')], ['document', document]]) {
      const add = target.addEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => { if (type === 'keydown') keydownHandlers[name].push(listener); add(type, listener, options); });
    }
  }
  const touchEscape = event => { if (event.key === 'Escape' && held) { event.preventDefault(); adapter.cancel(); } };
  document.addEventListener('keydown', touchEscape);
  const view = Keyboard.mount({ canvas, adapter, onPrecisionChange });
  const f = { view, adapter, rect, canvas, keydownHandlers, fine: $('studioKeyboardFine'), pad: $('studioKeyboardPad'), label: $('studioKeyboardLabel'), status: $('studioKeyboardStatus'), grab: $('studioKeyboardGrab'), select: $('studioKeyboardTool'), outside: $('outside'), held: () => held, setTools(next) { tools = next; emit(); }, emit };
  cleanups.push(() => { view.dispose(); document.removeEventListener('keydown', touchEscape); }); return f;
}
function start(f) { f.grab.click(); expect(f.held()).not.toBeNull(); expect(document.activeElement).toBe(f.pad); }
function key(f, name, options = {}, target = f.pad) { const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options }); target.dispatchEvent(event); return event; }
function fine(f, value) { f.fine.checked = value; f.fine.dispatchEvent(new Event('change', { bubbles: true })); }

afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('Optional fine keyboard movement', () => {
  it('starts off even when a browser restores a checked checkbox', () => {
    const f = fixture({ checked: true }); expect(f.fine.checked).toBe(false); expect(f.fine.disabled).toBe(false);
    start(f); key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(8, 0);
  });
  it('lets an idle checkbox select fine movement without touching the tool', () => {
    const f = fixture(); fine(f, true); expect(f.fine.checked).toBe(true); expect(f.adapter.keyboardBegin).not.toHaveBeenCalled(); expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.cancel).not.toHaveBeenCalled();
    start(f); key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(2, 0);
  });
  it.each([['ArrowLeft', -2, 0], ['ArrowRight', 2, 0], ['ArrowUp', 0, -2], ['ArrowDown', 0, 2]])('uses small steps for %s', (name, dx, dy) => {
    const f = fixture(); fine(f, true); start(f); expect(key(f, name).defaultPrevented).toBe(true); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(dx, dy);
  });
  it.each([[105, 1], [420, 2], [840, 4], [1680, 4], [0, 2]])('retains proportional movement at height %s', (height, expected) => {
    const f = fixture({ height }); fine(f, true); start(f); key(f, 'ArrowDown'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(0, expected);
  });
  it('retains the larger Shift step and repeated fine arrows', () => {
    const f = fixture(); fine(f, true); start(f); key(f, 'ArrowUp', { shiftKey: true }); key(f, 'ArrowUp', { repeat: true });
    expect(f.adapter.keyboardMove.mock.calls).toEqual([[0, -24], [0, -2]]);
  });
  it('can toggle fine mode during a held preview without moving or releasing it', () => {
    const f = fixture(); start(f); const before = structuredClone(f.held());
    expect(key(f, 'f').defaultPrevented).toBe(true); expect(f.fine.checked).toBe(true); expect(f.fine.disabled).toBe(true);
    expect(f.held()).toEqual(before); expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(f.adapter.cancel).not.toHaveBeenCalled();
    expect(f.label.textContent).toBe('thermometer · fine'); expect(f.status.textContent).toContain('Fine movement on.');
    key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(2, 0);
    key(f, 'F'); expect(f.fine.checked).toBe(false); expect(f.label.textContent).toBe('thermometer'); expect(f.status.textContent).not.toContain('Fine movement on.');
    key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(8, 0);
  });
  it('suppresses F repeat so a held key cannot chatter the movement setting', () => {
    const f = fixture(); start(f); key(f, 'f'); expect(key(f, 'F', { repeat: true }).defaultPrevented).toBe(true); expect(f.fine.checked).toBe(true);
    key(f, 'ArrowDown'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(0, 2);
  });
  it('notifies an optional render hook only after real precision changes and updated visuals', () => {
    const states = [], callback = vi.fn(value => states.push({ value, checked: document.getElementById('studioKeyboardFine').checked, label: document.getElementById('studioKeyboardLabel').textContent }));
    const f = fixture({ onPrecisionChange: callback }); expect(callback).not.toHaveBeenCalled();
    fine(f, true); expect(callback).toHaveBeenCalledTimes(1); expect(states[0]).toMatchObject({ value: true, checked: true });
    fine(f, true); expect(callback).toHaveBeenCalledTimes(1); start(f); f.emit(); expect(callback).toHaveBeenCalledTimes(1);
    key(f, 'f'); expect(states.at(-1)).toEqual({ value: false, checked: false, label: 'thermometer' });
    key(f, 'f'); expect(states.at(-1)).toEqual({ value: true, checked: true, label: 'thermometer · fine' });
    key(f, 'f', { repeat: true }); fine(f, false); expect(callback).toHaveBeenCalledTimes(3); expect(f.fine.checked).toBe(true);
    expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled();
  });
  it('keeps movement usable if an optional precision render hook fails', () => {
    const f = fixture({ onPrecisionChange: () => { throw new Error('Optional render unavailable'); } }); start(f); expect(() => key(f, 'f')).not.toThrow();
    key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(2, 0); expect(f.held()).not.toBeNull();
  });
  it.each([{ altKey: true }, { ctrlKey: true }, { metaKey: true }])('preserves modified F shortcuts: %j', options => {
    const f = fixture(); start(f); expect(key(f, 'f', options).defaultPrevented).toBe(false); expect(f.fine.checked).toBe(false);
    expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled();
  });
  it('does not use F while idle or when focus belongs to another control', () => {
    const f = fixture(); expect(key(f, 'f').defaultPrevented).toBe(false); expect(f.fine.checked).toBe(false);
    start(f); f.outside.focus(); expect(key(f, 'f', {}, f.outside).defaultPrevented).toBe(false); expect(f.fine.checked).toBe(false);
  });
  it('disables the held checkbox and rejects a programmatic change until release', () => {
    const f = fixture(); start(f); expect(f.fine.disabled).toBe(true); fine(f, true); expect(f.fine.checked).toBe(false);
    expect(f.adapter.cancel).not.toHaveBeenCalled(); key(f, 'Enter'); expect(f.fine.disabled).toBe(false); fine(f, true); expect(f.fine.checked).toBe(true);
  });
  it('keeps fine mode across source updates and after release without adding an action', () => {
    const f = fixture(); fine(f, true); start(f); key(f, 'ArrowDown'); key(f, 't'); expect(f.held().phase).toBe('ready'); key(f, 'Enter');
    expect(f.adapter.keyboardRelease).toHaveBeenCalledTimes(1); expect(f.fine.checked).toBe(true); expect(document.activeElement).toBe(f.grab);
    f.setTools([{ id: 'knife', name: 'knife', enabled: true, hint: 'Move down and lift back.' }]); start(f); key(f, 'ArrowUp'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(0, -2);
  });
  it('lets the existing Escape cancel and restore focus while retaining fine preference', async () => {
    const f = fixture(); start(f); key(f, 'f'); key(f, 'Escape'); await Promise.resolve();
    expect(f.held()).toBeNull(); expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(document.activeElement).toBe(f.grab); expect(f.fine.checked).toBe(true);
  });
  it('restores focus after Touch cancellation with a microtask checkpoint between each native listener', async () => {
    const f = fixture({ keydownCheckpoints: true }); start(f); const focus = vi.spyOn(f.grab, 'focus');
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    // Native dispatch can finish one JS listener and flush its microtasks before
    // continuing propagation. jsdom dispatchEvent alone does not model that.
    for (const listener of f.keydownHandlers.pad) { listener(event); await Promise.resolve(); }
    expect(f.held()).not.toBeNull(); expect(focus).not.toHaveBeenCalled();
    for (const listener of f.keydownHandlers.document) { listener(event); await Promise.resolve(); }
    expect(event.defaultPrevented).toBe(true); expect(f.held()).toBeNull(); expect(f.adapter.cancel).toHaveBeenCalledTimes(1);
    expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(f.grab);
  });
  it('only restores focus for the pending Escape event, once', async () => {
    const f = fixture({ keydownCheckpoints: true }); start(f); const focus = vi.spyOn(f.grab, 'focus');
    const pending = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }); f.keydownHandlers.pad.forEach(listener => listener(pending)); await Promise.resolve();
    f.adapter.cancel(); const unrelated = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    f.keydownHandlers.document.forEach(listener => listener(unrelated)); expect(focus).not.toHaveBeenCalled();
    f.keydownHandlers.document.forEach(listener => listener(pending)); expect(focus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(f.grab);
    f.keydownHandlers.document.forEach(listener => listener(pending)); expect(focus).toHaveBeenCalledTimes(1);
  });
  it('clears a pending Escape handoff when controls are disposed', () => {
    const f = fixture({ keydownCheckpoints: true }); start(f); const focus = vi.spyOn(f.grab, 'focus');
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }); f.keydownHandlers.pad.forEach(listener => listener(event)); f.view.dispose();
    f.keydownHandlers.document.forEach(listener => listener(event)); expect(focus).not.toHaveBeenCalled(); expect(f.held()).toBeNull(); expect(f.adapter.cancel).toHaveBeenCalledTimes(1);
  });
  it('disables fine selection with no tools and re-enables it when tools return', () => {
    const f = fixture(); fine(f, true); f.setTools([]); expect(f.fine.disabled).toBe(true); expect(f.fine.checked).toBe(true);
    f.setTools([{ id: 'probe', name: 'thermometer', enabled: true }]); expect(f.fine.disabled).toBe(false); expect(f.fine.checked).toBe(true);
  });
  it('uses optional controls safely with an older fixture', () => {
    const f = fixture({ checkbox: false }); start(f); key(f, 'f'); key(f, 'ArrowUp'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(0, -2); expect(f.status.textContent).toContain('Fine movement on.');
  });
  it('does not reannounce unchanged fine hints on each arrow', () => {
    const f = fixture(); fine(f, true); start(f); const observer = new MutationObserver(() => {}); observer.observe(f.status, { childList: true, subtree: true, characterData: true });
    key(f, 'ArrowDown'); key(f, 'ArrowDown'); expect(observer.takeRecords()).toEqual([]); observer.disconnect();
  });
  it('cleans up its optional control and restores the default on a new mount', () => {
    const f = fixture(); fine(f, true); start(f); f.view.dispose(); expect(f.fine.checked).toBe(false); expect(f.fine.disabled).toBe(true); expect(f.held()).toBeNull();
    const next = fixture({ checked: true }); expect(next.fine.checked).toBe(false); start(next); key(next, 'ArrowRight'); expect(next.adapter.keyboardMove).toHaveBeenLastCalledWith(8, 0);
  });
});

function jugFixture({ consumed = true } = {}) {
  document.body.innerHTML = `<canvas id="jugCanvas"></canvas><section id="studioMeasureView"><button id="studioMeasureOpen">Inspect jug</button><div id="studioMeasurePanel"><input id="studioMeasureHeight" type="range" min="0" max="100"><button id="studioMeasureAlign">Align</button><button id="studioMeasureCheck">Check</button><button id="studioMeasureClose">Return</button><p id="studioMeasureReadout"></p><output id="studioMeasureAngle"></output></div></section>`;
  const $ = id => document.getElementById(id), canvas = $('jugCanvas'), camera = new THREE.PerspectiveCamera(45, 1.4, .1, 100);
  camera.position.set(5, 7, 9); camera.zoom = 1.2; camera.updateProjectionMatrix();
  const controls = { target: new THREE.Vector3(.4, 1.2, -.3), enableRotate: true, enableZoom: true, maxPolarAngle: 1.3, update() { camera.lookAt(this.target); camera.updateMatrixWorld(); } }; controls.update();
  const original = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), zoom: camera.zoom, target: controls.target.clone() };
  let held = true, view;
  const host = { canvas, camera, controls, origin: { x: 2.4, z: 1.05 }, guide: { visible: false, position: new THREE.Vector3() }, getAmount: () => 300, getLocked: () => false, cancel: vi.fn(), draw: vi.fn(), onViewChange: vi.fn(), check: vi.fn() };
  const touchEscape = event => { if (event.key === 'Escape' && held && consumed) { event.preventDefault(); held = false; host.cancel(); view.preview(null); } };
  document.addEventListener('keydown', touchEscape); view = Measure.mount(host); view.update({ active: true, visible: true }); view.open();
  const f = { view, host, canvas, camera, controls, original, opener: $('studioMeasureOpen'), height: $('studioMeasureHeight'), readout: $('studioMeasureReadout'), setHeld(value) { held = value; } };
  cleanups.push(() => { view.dispose(); document.removeEventListener('keydown', touchEscape); }); return f;
}
function escape() { const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.dispatchEvent(event); return event; }

describe('Jug precision cancellation', () => {
  it('keeps jug inspection open when the existing tool adapter consumes first Escape', () => {
    const f = jugFixture(); f.view.preview(350); const position = f.camera.position.clone(), zoom = f.camera.zoom;
    expect(escape().defaultPrevented).toBe(true); expect(f.canvas.dataset.measureInspection).toBe('true'); expect(f.camera.position.equals(position)).toBe(true); expect(f.camera.zoom).toBe(zoom);
    expect(f.readout.textContent).toContain('300 mL'); expect(f.readout.textContent).not.toContain('Preview'); expect(f.host.onViewChange.mock.calls).toEqual([[true]]); expect(f.host.check).not.toHaveBeenCalled();
  });
  it('uses the next idle Escape to restore the original camera once and focus the opener', () => {
    const f = jugFixture(); escape(); escape();
    expect(f.canvas.dataset.measureInspection).toBe('false'); expect(f.camera.position.equals(f.original.position)).toBe(true); expect(f.camera.quaternion.equals(f.original.quaternion)).toBe(true); expect(f.camera.zoom).toBe(f.original.zoom); expect(f.controls.target.equals(f.original.target)).toBe(true);
    expect(f.controls.enableRotate).toBe(true); expect(f.controls.enableZoom).toBe(true); expect(f.controls.maxPolarAngle).toBe(1.3); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]); expect(document.activeElement).toBe(f.opener);
    escape(); expect(f.host.onViewChange.mock.calls).toEqual([[true], [false]]);
  });
  it('still closes on the first idle Escape when no tool cancellation consumes it', () => {
    const f = jugFixture({ consumed: false }); expect(escape().defaultPrevented).toBe(true); expect(f.canvas.dataset.measureInspection).toBe('false'); expect(document.activeElement).toBe(f.opener);
  });
});
