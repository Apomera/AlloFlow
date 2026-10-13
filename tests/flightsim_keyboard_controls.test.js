import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, deck, cockpit, latest, setData;
const keys = () => window.__testHooks.flightSim.keysRef.current;

function press(target, key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}
function release(target, key, options = {}) {
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...options }));
}
function addWidget(markup, parent = deck) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = markup;
  parent.appendChild(wrapper);
  return wrapper.firstElementChild;
}

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  // Keyboard dispatch and touch controls run normally; RAF rendering is not
  // needed to inspect the production input queue exposed by its test hook.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false } });
    latest = data;
    setData = updateData;
    return tool.render(makeCtx({
      toolData: data,
      setToolData: updateData,
      update: (toolId, key, value) => updateData(prev => ({ ...prev, [toolId]: { ...prev[toolId], [key]: value } })),
      updateMulti: (toolId, patch) => updateData(prev => ({ ...prev, [toolId]: { ...prev[toolId], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click(); });
  deck = host.querySelector('[data-flightsim-flight-deck]');
  cockpit = deck.querySelector('canvas[role="application"]');
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool keyboard input ownership', () => {
  it('focuses the cockpit on entry and captures flight keys only there', () => {
    expect(document.activeElement).toBe(cockpit);
    expect(press(cockpit, 'ArrowUp').defaultPrevented).toBe(true);
    expect(keys().arrowup).toBe(true);
    release(cockpit, 'ArrowUp');
    expect(keys().arrowup).toBe(false);
    expect(press(document.body, 'ArrowDown').defaultPrevented).toBe(false);
    expect(keys().arrowdown).toBeUndefined();
    expect(press(cockpit, 'Tab').defaultPrevented).toBe(false);
  });

  it('leaves Space on the focused Exit button available for native activation', async () => {
    const pause = deck.querySelector('button[aria-label="Pause flight"]');
    await act(async () => { pause.click(); });
    expect(window.__testHooks.flightSim.pausedRef.current).toBe(true);
    const exit = [...deck.querySelectorAll('button')].find(button => button.textContent.includes('Exit'));
    expect(exit).toBeTruthy();
    exit.focus();
    expect(press(exit, ' ').defaultPrevented).toBe(false);
    release(exit, ' ');
    expect(keys()[' ']).toBeUndefined();
    expect(window.__testHooks.flightSim.pausedRef.current).toBe(true);
    // jsdom does not synthesize native button activation from Space. The
    // unprevented event above preserves that browser behavior; click verifies
    // the same button's actual action and the input effect cleanup.
    await act(async () => { exit.click(); });
    expect(latest.flightSim.view).toBe('debrief');
    expect(keys()).toEqual({});
    expect(press(cockpit, 'w').defaultPrevented).toBe(false);
  });

  it.each([
    ['button descendants', '<button><span>Pause</span></button>'],
    ['links', '<a href="#lesson"><span>Lesson</span></a>'],
    ['disclosure summaries', '<details><summary><span>Help</span></summary></details>'],
    ['editable descendants', '<div contenteditable="true"><span>Notes</span></div>'],
    ['ARIA buttons', '<div role="button" tabindex="0"><span>Apply</span></div>'],
    ['ARIA sliders', '<div role="slider" tabindex="0"><span>Throttle</span></div>'],
    ['dialogs', '<div role="dialog"><span>Instructions</span></div>'],
    ['text fields', '<input aria-label="Search" />'],
    ['textareas', '<textarea></textarea>'],
    ['selects', '<select><option>Calm</option></select>'],
  ])('preserves flight-key behavior for %s', (_label, markup) => {
    const widget = addWidget(markup);
    const target = widget.querySelector('span') || widget;
    for (const key of [' ', 'ArrowUp', 'w', '1', 'b']) {
      expect(press(target, key).defaultPrevented).toBe(false);
      expect(keys()[key.toLowerCase()]).toBeUndefined();
    }
  });

  it.each([{ ctrlKey: true }, { altKey: true }, { metaKey: true }])('preserves modified browser and assistive shortcuts: %j', modifier => {
    for (const key of ['w', 'f', 'b', ' ', 'ArrowLeft']) {
      expect(press(cockpit, key, modifier).defaultPrevented).toBe(false);
      expect(keys()).toEqual({});
    }
  });

  it('keeps standalone throttle modifiers and cancels them when they become a shortcut', () => {
    expect(press(cockpit, 'Control', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(keys().control).toBe(true);
    expect(press(cockpit, 'f', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(keys()).toEqual({});
    expect(press(cockpit, 'Shift', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(keys().shift).toBe(true);
    release(cockpit, 'Shift');
    expect(keys().shift).toBe(false);
  });

  it('releases held keys when keyup arrives from a field or an outside surface', () => {
    const field = addWidget('<input />');
    for (const target of [field, document.body]) {
      press(cockpit, 'w');
      expect(keys().w).toBe(true);
      release(target, 'w');
      expect(keys().w).toBe(false);
    }
  });

  it('clears held inputs immediately when focus leaves the flight surface', () => {
    press(cockpit, 'ArrowUp');
    const button = addWidget('<button>Other action</button>');
    button.focus();
    expect(keys()).toEqual({});
    cockpit.focus();
    press(cockpit, 'Control', { ctrlKey: true });
    window.dispatchEvent(new Event('blur'));
    expect(keys()).toEqual({});
  });

  it('retains fast pause/autopilot/flap taps until a frame consumes them and ignores repeats', () => {
    for (const key of [' ', 'b', '[', ']', '1']) {
      press(cockpit, key);
      release(cockpit, key);
      expect(keys()[key]).toBe(true);
      keys()[key] = false; // The RAF consumer clears an edge after one action.
      press(cockpit, key, { repeat: true });
      expect(keys()[key]).toBe(false);
    }
    press(cockpit, 'q');
    release(cockpit, 'q');
    expect(keys().q).toBe(false); // Q remains a held rotorcraft yaw pedal.
  });

  it('ignores events already handled by a widget and composition events', () => {
    const handled = event => event.preventDefault();
    cockpit.addEventListener('keydown', handled);
    press(cockpit, 'w');
    expect(keys().w).toBeUndefined();
    cockpit.removeEventListener('keydown', handled);
    expect(press(cockpit, 'w', { isComposing: true }).defaultPrevented).toBe(false);
    expect(keys().w).toBeUndefined();
  });

  it('does not leave a held control armed when the flying view is removed', async () => {
    press(cockpit, 'w');
    await act(async () => { setData(prev => ({ ...prev, flightSim: { ...prev.flightSim, view: 'menu' } })); });
    expect(keys()).toEqual({});
    expect(press(document.body, 'w').defaultPrevented).toBe(false);
  });
});
