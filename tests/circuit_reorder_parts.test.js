// Circuit Builder: parts can be reordered (2026-09-14). Move buttons and arrow
// keys on the drag handle are the keyboard path; pointer drag works in the parts
// list and on the schematic itself. Order changes the drawing only, and the tool
// says so, because "the bulb nearest the battery is brightest" is a live
// misconception. Every move goes through updMulti, so Undo restores the order.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(rootDir, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(rootDir, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function pointer(type, target, opts) {
  const init = Object.assign({ bubbles: true, cancelable: true, button: 0, clientX: 0, clientY: 0 }, opts || {});
  const event = new window.PointerEvent(type, init);
  if (init.pointerId != null && event.pointerId !== init.pointerId) Object.defineProperty(event, 'pointerId', { value: init.pointerId });
  if (init.pointerType && event.pointerType !== init.pointerType) Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  target.dispatchEvent(event);
}

describe('Circuit Builder part reordering', () => {
  let host, reactRoot, config, announcements, latest;

  beforeEach(() => {
    const canvasContext = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, {
      get(target, property) { if (!(property in target)) target[property] = () => {}; return target[property]; },
      set(target, property, value) { target[property] = value; return true; }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    announcements = [];
    latest = null;
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.restoreAllMocks();
    delete document.elementFromPoint;
  });

  async function mount(circuit) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ _circuit: Object.assign({ mode: 'series', voltage: 9 }, circuit) });
      latest = toolData._circuit;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: (message) => announcements.push(message) }));
    }
    await act(async () => { reactRoot.render(React.createElement(Harness)); await Promise.resolve(); });
  }
  const order = () => latest.components.map((c) => c.type);
  const rowTypes = () => Array.from(host.querySelectorAll('[data-circuit-row-index]')).map((row) => row.querySelector('[data-circuit-drag-handle]').getAttribute('aria-label').replace(/^Drag /, '').replace(/ \d+ to a new position.*$/, ''));
  const schematicIds = () => Array.from(host.querySelectorAll('[data-circuit-schematic-part]')).map((g) => Number(g.getAttribute('data-circuit-schematic-part')));
  const three = [{ type: 'resistor', value: 100, id: 1 }, { type: 'bulb', value: 50, id: 2 }, { type: 'switch', closed: true, id: 3 }];

  it('keeps the shipped mirror byte-identical to the source', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });

  it('moves a part with the row buttons, follows it with the selection, announces, and undoes', async () => {
    await mount({ components: three });
    expect(order()).toEqual(['resistor', 'bulb', 'switch']);
    expect(schematicIds()).toEqual([1, 2, 3]);
    expect(host.textContent).toContain('Position changes the drawing, not the readings');
    const back = host.querySelector('[data-circuit-move="back"][data-circuit-move-id="1"]');
    expect(back.disabled).toBe(true);
    const fwd = host.querySelector('[data-circuit-move="fwd"][data-circuit-move-id="1"]');
    expect(fwd.getAttribute('aria-label')).toBe('Move R 1 later in the loop');
    await act(async () => fwd.click());
    expect(order()).toEqual(['bulb', 'resistor', 'switch']);
    expect(schematicIds()).toEqual([2, 1, 3]);
    expect(latest.selectedPart).toBe(1);
    expect(announcements.pop()).toBe('R moved to position 2 of 3. Readings do not change with position.');
    await act(async () => host.querySelector('[data-circuit-move="fwd"][data-circuit-move-id="1"]').click());
    expect(order()).toEqual(['bulb', 'switch', 'resistor']);
    expect(host.querySelector('[data-circuit-move="fwd"][data-circuit-move-id="1"]').disabled).toBe(true);
    // Undo restores the previous order one step at a time
    const undo = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Undo');
    await act(async () => undo.click());
    expect(order()).toEqual(['bulb', 'resistor', 'switch']);
    await act(async () => undo.click());
    expect(order()).toEqual(['resistor', 'bulb', 'switch']);
  });

  it('moves with arrow keys, Home and End on the drag handle', async () => {
    await mount({ components: three });
    const handle = host.querySelector('[data-circuit-drag-handle="1"]');
    expect(handle.getAttribute('aria-label')).toBe('Drag R 1 to a new position, or press the arrow keys');
    await act(async () => { handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(order()).toEqual(['bulb', 'resistor', 'switch']);
    await act(async () => { host.querySelector('[data-circuit-drag-handle="1"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(order()).toEqual(['bulb', 'switch', 'resistor']);
    await act(async () => { host.querySelector('[data-circuit-drag-handle="1"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
    expect(order()).toEqual(['resistor', 'bulb', 'switch']);
    await act(async () => { host.querySelector('[data-circuit-drag-handle="1"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); });
    expect(order()).toEqual(['resistor', 'bulb', 'switch']);
    expect(rowTypes()).toEqual(['R', 'Bulb', 'ON']);
  });

  it('uses branch wording in parallel mode and offers the moves in Inspect part', async () => {
    await mount({ mode: 'parallel', components: three });
    expect(host.querySelector('[data-circuit-move="fwd"][data-circuit-move-id="2"]').getAttribute('aria-label')).toBe('Move Bulb 2 down a branch');
    const later = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Move down a branch');
    expect(later).toBeTruthy();
    await act(async () => later.click()); // selected part defaults to index 0
    expect(order()).toEqual(['bulb', 'resistor', 'switch']);
    expect(latest.selectedPart).toBe(1);
  });

  it('drags a row onto another slot with the pointer (mouse or touch), with a threshold below which nothing moves', async () => {
    await mount({ components: three });
    const rows = () => Array.from(host.querySelectorAll('[data-circuit-row-index]'));
    document.elementFromPoint = (x) => rows()[Math.min(2, Math.max(0, Math.floor(x / 100)))];
    let handle = host.querySelector('[data-circuit-drag-handle="1"]');
    await act(async () => { pointer('pointerdown', handle, { pointerId: 7, pointerType: 'touch', clientX: 10, clientY: 10 }); });
    await act(async () => { pointer('pointermove', handle, { pointerId: 7, pointerType: 'touch', clientX: 12, clientY: 11 }); });
    expect(host.querySelector('[data-circuit-dragging="true"]')).toBeNull();
    await act(async () => { pointer('pointerup', handle, { pointerId: 7, pointerType: 'touch', clientX: 12, clientY: 11 }); });
    expect(order()).toEqual(['resistor', 'bulb', 'switch']);
    handle = host.querySelector('[data-circuit-drag-handle="1"]');
    await act(async () => { pointer('pointerdown', handle, { pointerId: 8, pointerType: 'mouse', clientX: 10, clientY: 10 }); });
    await act(async () => { pointer('pointermove', handle, { pointerId: 8, pointerType: 'mouse', clientX: 250, clientY: 10 }); });
    expect(host.querySelector('[data-circuit-dragging="true"]').getAttribute('data-circuit-row-index')).toBe('0');
    expect(host.querySelector('[data-circuit-drop-target="true"]').getAttribute('data-circuit-row-index')).toBe('2');
    await act(async () => { pointer('pointerup', handle, { pointerId: 8, pointerType: 'mouse', clientX: 250, clientY: 10 }); });
    expect(order()).toEqual(['bulb', 'switch', 'resistor']);
    expect(host.querySelector('[data-circuit-dragging="true"]')).toBeNull();
    expect(announcements.pop()).toBe('R moved to position 3 of 3. Readings do not change with position.');
  });

  it('drags a part along the wire in the schematic, shows the drop slot, and selects on a plain click', async () => {
    await mount({ components: three });
    const svg = host.querySelector('svg[aria-label^="Interactive series circuit schematic"]');
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 440, height: 200, right: 440, bottom: 200 });
    // Series slots sit at x = 80 + i·70 in the 440-wide drawing.
    let part = host.querySelector('[data-circuit-schematic-part="1"]');
    await act(async () => { pointer('pointerdown', part, { pointerId: 9, pointerType: 'mouse', clientX: 80, clientY: 78 }); });
    await act(async () => { pointer('pointermove', part, { pointerId: 9, pointerType: 'mouse', clientX: 222, clientY: 78 }); });
    expect(host.querySelector('[data-circuit-drop-slot]').getAttribute('data-circuit-drop-slot')).toBe('2');
    expect(part.getAttribute('opacity')).toBe('0.5');
    await act(async () => { pointer('pointerup', part, { pointerId: 9, pointerType: 'mouse', clientX: 222, clientY: 78 }); });
    expect(order()).toEqual(['bulb', 'switch', 'resistor']);
    expect(host.querySelector('[data-circuit-drop-slot]')).toBeNull();
    expect(latest.selectedPart).toBe(2);
    // a plain click on a part only selects it
    part = host.querySelector('[data-circuit-schematic-part="2"]');
    await act(async () => { pointer('pointerdown', part, { pointerId: 10, pointerType: 'mouse', clientX: 80, clientY: 78 }); });
    await act(async () => { pointer('pointerup', part, { pointerId: 10, pointerType: 'mouse', clientX: 81, clientY: 78 }); });
    expect(order()).toEqual(['bulb', 'switch', 'resistor']);
    expect(latest.selectedPart).toBe(0);
  });

  it('shows no move controls for a single part and keeps readings identical after a move', async () => {
    await mount({ components: [{ type: 'bulb', value: 50, id: 1 }] });
    expect(host.querySelector('[data-circuit-drag-handle]')).toBeNull();
    expect(host.querySelector('[data-circuit-move]')).toBeNull();
    await act(async () => reactRoot.unmount());
    reactRoot = ReactDOMClient.createRoot(host);
    await mount({ components: three });
    const readings = () => host.querySelector('[role="status"][aria-live="polite"]').textContent;
    const before = readings();
    await act(async () => host.querySelector('[data-circuit-move="fwd"][data-circuit-move-id="1"]').click());
    expect(readings()).toBe(before);
  });
});
