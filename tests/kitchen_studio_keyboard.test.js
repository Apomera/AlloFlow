import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Keyboard = require('../stem_lab/kitchen_studio/kitchen_studio_keyboard.js');
const mounted = [];

function fixture({ height = 420, width = 600 } = {}) {
  document.body.innerHTML = `<div id="studioToolFinder"><button data-studio-tool="soap">Find soap</button><button data-studio-tool="pan">Find pan</button><button data-studio-tool="mat" disabled>Find mat</button></div>
    <canvas id="keyboardCanvas"></canvas>
    <details id="studioKeyboard"><summary>Use tools with keyboard</summary>
      <label for="studioKeyboardTool">Tool</label><select id="studioKeyboardTool"></select>
      <button id="studioKeyboardGrab" type="button">Pick up selected tool</button>
      <button id="studioKeyboardCancel" type="button">Cancel</button>
      <p id="studioKeyboardHelp">Arrow keys move. Shift moves farther. T aims. Enter releases. Escape cancels.</p>
      <p id="studioKeyboardStatus" role="status"></p>
    </details>
    <div id="studioKeyboardPad" tabindex="-1" role="group" hidden aria-describedby="studioKeyboardHelp"><span id="studioKeyboardCursor" aria-hidden="true"></span><span id="studioKeyboardLabel" aria-hidden="true"></span></div>
    <button id="outside">Other controls</button>`;
  const canvas = document.getElementById('keyboardCanvas');
  const rect = { left: 100, top: 200, width, height };
  canvas.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height });
  canvas.scrollIntoView = vi.fn();
  let tools = [
    { id: 'soap', name: 'soap', hint: 'Tap to use soap.', enabled: true },
    { id: 'pan', name: 'pan handle', hint: 'Carry the pan to a plate.', enabled: true },
    { id: 'mat', name: 'nonslip mat', hint: 'Slide the mat under the board.', enabled: false }
  ];
  let held = null;
  const subscribers = new Set();
  const emit = () => subscribers.forEach(fn => fn(held));
  const adapter = {
    keyboardTools: vi.fn(() => tools), keyboardState: vi.fn(() => held),
    keyboardBegin: vi.fn(id => {
      const tool = tools.find(item => item.id === id);
      if (!tool?.enabled) return false;
      held = { id, name: tool.name, point: { x: rect.left + 10, y: rect.top + 20 }, phase: 'held', hint: 'Move the tool, then release.' };
      emit(); return true;
    }),
    keyboardMove: vi.fn((dx, dy) => { if (!held) return false; held = { ...held, point: { x: held.point.x + dx, y: held.point.y + dy } }; emit(); return true; }),
    keyboardAimNext: vi.fn(() => { if (!held) return false; held = { ...held, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, phase: 'ready', hint: 'Release to place at this target.' }; emit(); return true; }),
    keyboardRelease: vi.fn(() => { if (!held) return false; held = null; emit(); return true; }),
    cancel: vi.fn(() => { held = null; emit(); }),
    subscribeKeyboard: vi.fn(fn => { subscribers.add(fn); fn(held); return () => subscribers.delete(fn); })
  };
  const legacyEscape = event => { if (event.key === 'Escape' && held) { event.preventDefault(); adapter.cancel('Existing touch cancellation.'); } };
  document.addEventListener('keydown', legacyEscape);
  const view = Keyboard.mount({ canvas, adapter });
  const f = {
    view, canvas, adapter, rect, section: document.getElementById('studioKeyboard'), select: document.getElementById('studioKeyboardTool'),
    grab: document.getElementById('studioKeyboardGrab'), cancel: document.getElementById('studioKeyboardCancel'), pad: document.getElementById('studioKeyboardPad'),
    cursor: document.getElementById('studioKeyboardCursor'), label: document.getElementById('studioKeyboardLabel'), status: document.getElementById('studioKeyboardStatus'), outside: document.getElementById('outside'),
    tools: () => tools, setTools(value) { tools = value; emit(); }, held: () => held,
    setHeld(value) { held = value; emit(); }, subscribers,
    cleanup() { view.dispose(); document.removeEventListener('keydown', legacyEscape); }
  };
  mounted.push(f); return f;
}
function choose(f, id) { f.select.value = id; f.select.dispatchEvent(new Event('change', { bubbles: true })); }
function start(f, id) { if (id) choose(f, id); f.grab.click(); expect(f.held()).not.toBeNull(); expect(document.activeElement).toBe(f.pad); }
function key(f, name, options = {}, target = f.pad) {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options }); target.dispatchEvent(event); return event;
}
afterEach(() => { mounted.splice(0).forEach(f => f.cleanup()); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('Kitchen direct keyboard controls', () => {
  it('lists tools, disables unavailable choices, and keeps the disclosure closed', () => {
    const f = fixture();
    expect([...f.select.options].map(o => [o.value, o.textContent, o.disabled])).toEqual([['soap', 'soap', false], ['pan', 'pan handle', false], ['mat', 'nonslip mat', true]]);
    expect(f.section.hidden).toBe(false); expect(f.section.open).toBe(false); expect(f.select.value).toBe('soap'); expect(f.grab.disabled).toBe(false); expect(f.cancel.disabled).toBe(true);
    expect(f.pad.hidden).toBe(true); expect(f.pad.tabIndex).toBe(-1); expect(f.adapter.keyboardBegin).not.toHaveBeenCalled();
  });

  it('preserves an existing selection and option nodes across movement-only updates', () => {
    const f = fixture(); choose(f, 'pan'); const option = f.select.options[1]; const tools = structuredClone(f.tools());
    f.setTools(tools); expect(f.select.value).toBe('pan'); expect(f.select.options[1]).toBe(option); expect(f.adapter.keyboardBegin).not.toHaveBeenCalled();
  });

  it('preserves a now-unavailable selected tool and requires choosing an enabled one', () => {
    const f = fixture(); choose(f, 'pan'); f.setTools(f.tools().map(t => t.id === 'pan' ? { ...t, enabled: false } : t));
    expect(f.select.value).toBe('pan'); expect(f.grab.disabled).toBe(true); expect(f.status.textContent).toContain('pan handle is unavailable'); choose(f, 'soap'); expect(f.grab.disabled).toBe(false);
  });

  it('chooses an enabled replacement only when the old selection disappears', () => {
    const f = fixture(); choose(f, 'pan'); f.setTools([{ id: 'empty', name: 'Empty tool', enabled: false }, { id: 'door', name: 'refrigerator', enabled: true }]);
    expect(f.select.value).toBe('door'); expect(f.grab.disabled).toBe(false);
  });

  it('disables pickup when every tool is unavailable', () => {
    const f = fixture(); f.setTools(f.tools().map(t => ({ ...t, enabled: false })));
    expect(f.grab.disabled).toBe(true); f.grab.click(); expect(f.adapter.keyboardBegin).not.toHaveBeenCalled();
  });

  it('hides the disclosure when no 3D tools are available', () => {
    const f = fixture(); f.setTools([]); expect(f.section.hidden).toBe(true); expect(f.grab.disabled).toBe(true); expect(f.select.disabled).toBe(true); expect(f.pad.hidden).toBe(true);
  });

  it('selects a Find tool result without automatically grabbing it', () => {
    const f = fixture(); document.querySelector('[data-studio-tool="pan"]').click();
    expect(f.select.value).toBe('pan'); expect(f.adapter.keyboardBegin).not.toHaveBeenCalled(); expect(f.section.open).toBe(false);
    document.querySelector('[data-studio-tool="mat"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); expect(f.select.value).toBe('pan');
  });

  it('scrolls before pickup and focuses the absolute interaction pad without scrolling', () => {
    const f = fixture(), focus = vi.spyOn(f.pad, 'focus'); start(f, 'pan');
    expect(f.canvas.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(f.canvas.scrollIntoView.mock.invocationCallOrder[0]).toBeLessThan(f.adapter.keyboardBegin.mock.invocationCallOrder[0]);
    expect(f.adapter.keyboardBegin).toHaveBeenCalledWith('pan'); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(f.pad.hidden).toBe(false); expect(f.pad.tabIndex).toBe(0); expect(f.grab.disabled).toBe(true); expect(f.select.disabled).toBe(true); expect(f.cancel.disabled).toBe(false);
  });

  it('does not focus the pad when the adapter declines pickup', () => {
    const f = fixture(), focus = vi.spyOn(f.pad, 'focus'); f.adapter.keyboardBegin.mockReturnValue(false); f.grab.click();
    expect(focus).not.toHaveBeenCalled(); expect(f.pad.hidden).toBe(true);
  });

  it.each([['ArrowLeft', -8, 0], ['ArrowRight', 8, 0], ['ArrowUp', 0, -8], ['ArrowDown', 0, 8]])('moves %s through the adapter', (name, dx, dy) => {
    const f = fixture(); start(f); const event = key(f, name); expect(event.defaultPrevented).toBe(true); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(dx, dy);
  });

  it.each([[105, 4], [420, 8], [840, 16], [1680, 16]])('normalizes arrow movement for canvas height %s', (height, expected) => {
    const f = fixture({ height }); start(f); key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).toHaveBeenLastCalledWith(expected, 0);
  });

  it('uses a larger Shift step and permits repeated arrow movement', () => {
    const f = fixture(); start(f); key(f, 'ArrowDown', { shiftKey: true }); key(f, 'ArrowDown', { repeat: true });
    expect(f.adapter.keyboardMove.mock.calls).toEqual([[0, 24], [0, 8]]);
  });

  it.each([{ altKey: true }, { ctrlKey: true }, { metaKey: true }])('leaves modifier shortcuts alone: %j', modifiers => {
    const f = fixture(); start(f); expect(key(f, 'ArrowRight', modifiers).defaultPrevented).toBe(false); key(f, 'Enter', modifiers); key(f, 't', modifiers);
    expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(f.adapter.keyboardAimNext).not.toHaveBeenCalled();
  });

  it('only moves tools while the pad has focus', () => {
    const f = fixture(); f.setHeld({ id: 'soap', name: 'soap', point: { x: 110, y: 220 }, phase: 'held', hint: 'Move.' }); f.outside.focus();
    key(f, 'ArrowRight'); expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(key(f, 'Tab').defaultPrevented).toBe(false);
  });

  it('aims once for T and suppresses repeated target cycling', () => {
    const f = fixture(); start(f); expect(key(f, 't').defaultPrevented).toBe(true); expect(key(f, 'T', { repeat: true }).defaultPrevented).toBe(true);
    expect(f.adapter.keyboardAimNext).toHaveBeenCalledTimes(1); expect(f.status.textContent).toContain('Release to place at this target.');
  });

  it.each(['Enter', ' ', 'Spacebar'])('releases exactly once with %j and restores pickup focus', name => {
    const f = fixture(); start(f); const focus = vi.spyOn(f.grab, 'focus'); expect(key(f, name).defaultPrevented).toBe(true);
    expect(f.adapter.keyboardRelease).toHaveBeenCalledTimes(1); expect(f.held()).toBeNull(); expect(f.pad.hidden).toBe(true); expect(f.pad.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(f.grab); expect(focus).toHaveBeenCalledWith({ preventScroll: true }); key(f, name, { repeat: true }); expect(f.adapter.keyboardRelease).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the tool chooser when completing an action makes pickup unavailable', () => {
    const f = fixture(); start(f, 'pan'); const release = f.adapter.keyboardRelease.getMockImplementation();
    f.adapter.keyboardRelease.mockImplementation(() => { f.setTools(f.tools().map(tool => ({ ...tool, enabled: false }))); return release(); });
    const focus = vi.spyOn(f.select, 'focus'); key(f, 'Enter');
    expect(f.adapter.keyboardRelease).toHaveBeenCalledTimes(1); expect(f.adapter.cancel).not.toHaveBeenCalled(); expect(f.grab.disabled).toBe(true); expect(document.activeElement).toBe(f.select); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it.each(['Enter', ' ', 'Spacebar'])('suppresses repeated activation %j on both the held pad and native Grab', name => {
    const f = fixture(); start(f); expect(key(f, name, { repeat: true }).defaultPrevented).toBe(true); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled();
    key(f, 'Enter'); expect(key(f, name, { repeat: true }, f.grab).defaultPrevented).toBe(true); expect(f.adapter.keyboardBegin).toHaveBeenCalledTimes(1);
  });

  it('lets the existing adapter consume first Escape, then returns focus without consuming second Escape', async () => {
    const f = fixture(); start(f); const cameraEscape = vi.fn(event => { if (event.key === 'Escape' && !event.defaultPrevented) cameraEscape.closed = true; });
    document.addEventListener('keydown', cameraEscape);
    try {
      const first = key(f, 'Escape'); await Promise.resolve(); expect(first.defaultPrevented).toBe(true); expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(cameraEscape.closed).not.toBe(true); expect(document.activeElement).toBe(f.grab);
      const second = key(f, 'Escape', {}, f.grab); expect(second.defaultPrevented).toBe(false); expect(cameraEscape.closed).toBe(true);
    } finally { document.removeEventListener('keydown', cameraEscape); }
  });

  it('shows the live client point relative to the canvas and clamps labels inside it', () => {
    const f = fixture({ width: 320, height: 270 }); start(f, 'pan');
    expect(f.cursor.style.left).toBe('10px'); expect(f.cursor.style.top).toBe('20px'); expect(f.label.textContent).toBe('pan handle');
    f.setHeld({ ...f.held(), point: { x: 1000, y: -100 }, hint: 'Ready to release.', phase: 'ready' });
    expect(f.cursor.style.left).toBe('320px'); expect(f.cursor.style.top).toBe('0px'); expect(f.cursor.dataset.phase).toBe('ready');
    expect(parseFloat(f.label.style.left)).toBeGreaterThanOrEqual(8); expect(parseFloat(f.label.style.left) + parseFloat(f.label.style.maxWidth)).toBeLessThanOrEqual(312); expect(parseFloat(f.label.style.top)).toBeGreaterThanOrEqual(8);
  });

  it('does not reannounce an unchanged hint or replace options for each movement', () => {
    const f = fixture(); start(f); const option = f.select.options[0], observer = new MutationObserver(() => {}); observer.observe(f.status, { childList: true, subtree: true, characterData: true }); const padObserver = new MutationObserver(() => {}); padObserver.observe(f.pad, { attributes: true, attributeFilter: ['aria-label'] });
    key(f, 'ArrowRight'); key(f, 'ArrowRight'); expect(observer.takeRecords()).toEqual([]); expect(padObserver.takeRecords()).toEqual([]); observer.disconnect(); padObserver.disconnect(); expect(f.select.options[0]).toBe(option);
  });

  it('ignores the delayed startup scroll notification when the captured rect has not changed', () => {
    const f = fixture(); f.canvas.scrollIntoView.mockImplementation(() => { f.rect.top = 120; }); start(f); window.dispatchEvent(new Event('scroll'));
    expect(f.adapter.cancel).not.toHaveBeenCalled(); expect(f.held()).not.toBeNull();
  });

  it('cancels a keyboard hold when a real page scroll changes its client rectangle', () => {
    const f = fixture(); start(f); f.rect.top -= 30; window.dispatchEvent(new Event('scroll'));
    expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(f.pad.hidden).toBe(true);
  });

  it('cancels keyboard movement on blur without moving focus back to the controls', () => {
    const f = fixture(); start(f); const focus = vi.spyOn(f.grab, 'focus'); window.dispatchEvent(new Event('blur'));
    expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(focus).not.toHaveBeenCalled(); expect(f.pad.hidden).toBe(true);
  });

  it('keeps movement when focus moves within the pad, and cancels when focus leaves it', () => {
    const f = fixture(); const child = document.createElement('button'); child.textContent = 'Inside'; f.pad.append(child); start(f); child.focus(); expect(f.adapter.cancel).not.toHaveBeenCalled();
    f.outside.focus(); expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled();
  });

  it('does not interfere with native pointer gestures when no keyboard hold exists', () => {
    const f = fixture(); window.dispatchEvent(new Event('blur')); f.rect.top -= 20; window.dispatchEvent(new Event('scroll')); f.pad.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: f.outside }));
    expect(f.adapter.cancel).not.toHaveBeenCalled(); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled();
  });

  it('supports an explicit Cancel control without committing a decision', () => {
    const f = fixture(); start(f); f.cancel.click(); expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.adapter.keyboardRelease).not.toHaveBeenCalled(); expect(document.activeElement).toBe(f.grab);
  });

  it('updates the overlay after adapter-owned cancellation without taking focus', () => {
    const f = fixture(); start(f); const focus = vi.spyOn(f.grab, 'focus'); f.setHeld(null);
    expect(f.pad.hidden).toBe(true); expect(f.cancel.disabled).toBe(true); expect(f.grab.disabled).toBe(false); expect(focus).not.toHaveBeenCalled(); expect(f.adapter.cancel).not.toHaveBeenCalled();
  });

  it('disposes subscriptions and listeners, cancels only its keyboard hold, and clears its overlay', () => {
    const f = fixture(); start(f); f.view.dispose(); expect(f.subscribers.size).toBe(0); expect(f.adapter.cancel).toHaveBeenCalledTimes(1); expect(f.section.hidden).toBe(true); expect(f.pad.hidden).toBe(true);
    f.view.dispose(); key(f, 'ArrowRight'); f.grab.disabled = false; f.grab.click(); expect(f.adapter.keyboardMove).not.toHaveBeenCalled(); expect(f.adapter.keyboardBegin).toHaveBeenCalledTimes(1); expect(f.adapter.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel an unrelated pointer interaction during disposal', () => {
    const f = fixture(); f.view.dispose(); expect(f.adapter.cancel).not.toHaveBeenCalled();
  });
});
