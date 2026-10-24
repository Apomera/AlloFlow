import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, setData, cockpit, frameCallback, fullscreen, errors;
const hooks = () => window.__testHooks.flightSim;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
const help = () => host.querySelector('[data-flightsim-help]');
function press(target, key, options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...options }));
  return event;
}
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { vi.advanceTimersByTime(34); frameCallback(); });
  expect(errors).not.toHaveBeenCalled();
}
async function openHelp() {
  await act(async () => { button('Controls and help').click(); });
  expect(help()).toBeTruthy();
}

beforeEach(async () => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  fullscreen = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: vi.fn(() => {
    fullscreen = null;
    return Promise.resolve();
  }) });
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true } });
    latest = data.flightSim;
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click(); });
  cockpit = host.querySelector('canvas[role="application"]');
  cockpit.focus();
});

afterEach(async () => {
  fullscreen = null;
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = null;
  delete document.fullscreenElement;
  delete document.exitFullscreen;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Accessible flight controls reference', () => {
  it('provides readable controls and a focused close button without advancing flight', async () => {
    await frame();
    const initialTime = hooks().timeRef.current;
    const initialState = { ...hooks().flightRef.current };
    await openHelp();
    expect(help().getAttribute('role')).toBe('dialog');
    expect(help().getAttribute('aria-modal')).toBe('true');
    expect(help().getAttribute('aria-labelledby')).toBe('skyschool-help-title');
    expect(help().textContent).toContain('Touch controls');
    expect(help().textContent).toContain('far right edge');
    expect(help().textContent).toContain('critical angle of attack');
    expect(help().textContent).toContain('1–4');
    expect(document.activeElement).toBe(button('Close help'));
    expect(hooks().pausedRef.current).toBe(true);
    await frame();
    await frame();
    expect(hooks().timeRef.current).toBe(initialTime);
    expect(hooks().flightRef.current).toEqual(initialState);
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    await act(async () => { button('Close help').click(); });
    expect(help()).toBeNull();
    expect(hooks().pausedRef.current).toBe(false);
    expect(document.activeElement).toBe(cockpit);
    await frame();
    expect(hooks().timeRef.current).toBeGreaterThan(initialTime);
  });

  it('opens with a fast help-key tap even in a held paused frame and preserves the original pause', async () => {
    await act(async () => { host.querySelector('button[aria-label="Pause flight"]').click(); });
    await frame();
    await frame();
    cockpit.focus();
    press(cockpit, '?');
    await frame();
    expect(help()).toBeTruthy();
    expect(document.activeElement).toBe(button('Close help'));
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(help()).toBeNull();
    expect(latest.view).toBe('flying');
    expect(hooks().pausedRef.current).toBe(true);
    expect(document.activeElement).toBe(cockpit);
    press(cockpit, 'Escape');
    await frame();
    expect(latest.view).toBe('debrief');
  });

  it('Escape closes help before an active geography quiz or the flight', async () => {
    cockpit.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }));
    await frame();
    cockpit.dispatchEvent(new KeyboardEvent('keyup', { key: 'q', bubbles: true, cancelable: true }));
    await openHelp();
    let escape;
    await act(async () => { escape = press(button('Close help'), 'Escape'); });
    expect(escape.defaultPrevented).toBe(true);
    expect(help()).toBeNull();
    expect(latest.view).toBe('flying');
    expect(latest.lastDebrief).toBeUndefined();
    expect(document.activeElement).toBe(host.querySelector('#skyschool-geoq-question'));
    await act(async () => { press(document.activeElement, 'Escape'); });
    await frame();
    expect(latest.view).toBe('flying');
    press(cockpit, 'Escape');
    await frame();
    expect(latest.view).toBe('debrief');
  });

  it('leaves fullscreen first, then closes help, and returns to the cockpit', async () => {
    await openHelp();
    fullscreen = host;
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(help()).toBeTruthy();
    expect(latest.view).toBe('flying');
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(help()).toBeNull();
    expect(document.activeElement).toBe(cockpit);
    expect(latest.view).toBe('flying');
  });

  it('clears a stale open-help flag when a fresh challenge starts', async () => {
    await openHelp();
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, view: 'menu' } })); });
    await act(async () => { hooks().startFlightChallenge('first_flight'); });
    expect(latest.showHelp).toBe(false);
    expect(help()).toBeNull();
    expect(hooks().pausedRef.current).toBe(false);
    expect(host.querySelector('[data-flightsim-command-rail]')).toBeTruthy();
  });

  it('uses rotorcraft yaw instructions instead of the fixed-wing quiz shortcut', async () => {
    await act(async () => { setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, aircraft: 'rescue_heli' } })); });
    await openHelp();
    expect(help().textContent).toContain('Hold to turn the nose left or right');
    expect(help().textContent).not.toContain('Open a geography quiz');
    expect(help().textContent).not.toContain('critical angle of attack');
  });

  it('keeps help above an open quiz and returns to the still-paused question before flying', async () => {
    press(cockpit, 'q');
    await frame();
    const quiz = host.querySelector('[data-flight-geography-quiz]');
    expect(quiz).toBeTruthy();
    const question = quiz.querySelector('#skyschool-geoq-question').textContent;
    const quizHelp = quiz.querySelector('[data-geoq-help]');
    expect(quizHelp).toBeTruthy();
    expect(parseFloat(getComputedStyle(quizHelp).minHeight)).toBeGreaterThanOrEqual(44);
    await act(async () => { quizHelp.click(); });
    expect(help()).toBeTruthy();
    expect(help().textContent).toContain('Flight paused for this question.');
    expect(help().textContent).not.toContain('focuses the cockpit');
    expect(Number(getComputedStyle(help()).zIndex)).toBeGreaterThan(Number(getComputedStyle(quiz).zIndex));
    expect(document.activeElement).toBe(button('Close help'));
    const heldTime = hooks().timeRef.current;
    await act(async () => { press(button('Close help'), 'Escape'); });
    expect(help()).toBeNull();
    expect(quiz.querySelector('#skyschool-geoq-question').textContent).toBe(question);
    expect(document.activeElement).toBe(quiz.querySelector('#skyschool-geoq-question'));
    expect(hooks().pausedRef.current).toBe(true);
    expect(latest.view).toBe('flying');
    await frame();
    expect(hooks().timeRef.current).toBe(heldTime);
    await act(async () => { button('Close quiz').click(); });
    expect(host.querySelector('[data-flight-geography-quiz]')).toBeNull();
    expect(hooks().pausedRef.current).toBe(true);
    await act(async () => { host.querySelector('button[aria-label="Resume flight"]').click(); });
    await frame();
    expect(hooks().pausedRef.current).toBe(false);
    expect(hooks().timeRef.current).toBeGreaterThan(heldTime);
  });

  it('does not queue cockpit shortcuts behind help or change the restored pause state', async () => {
    await frame();
    await openHelp();
    const previousCamera = latest.thirdPerson;
    const previousForces = latest.showForces;
    // This was reachable by Shift+Tab from Close help. Even if a browser or
    // assistive tool focuses the covered canvas, the help panel owns input.
    cockpit.focus();
    for (const key of [' ', 'q', 'b', ']', 'v', 'f']) press(cockpit, key);
    await frame();
    expect(help()).toBeTruthy();
    expect(hooks().pausedRef.current).toBe(true);
    expect(hooks().getGeoQuizRef().current.active).toBe(false);
    expect(latest.thirdPerson).toBe(previousCamera);
    expect(latest.showForces).toBe(previousForces);
    await act(async () => { press(cockpit, 'Escape'); });
    expect(help()).toBeNull();
    await frame();
    await frame();
    expect(hooks().pausedRef.current).toBe(false);
    expect(hooks().getGeoQuizRef().current.active).toBe(false);
    expect(latest.autopilot?.hdg || latest.autopilot?.alt || latest.autopilot?.spd || false).toBe(false);
    expect(hooks().controlsRef.current.flaps).toBe(0);
    expect(latest.thirdPerson).toBe(previousCamera);
    expect(latest.showForces).toBe(previousForces);
    expect(latest.view).toBe('flying');
  });

  it('traps help navigation among visible controls as its sources reference opens', async () => {
    await openHelp();
    const close = button('Close help');
    const sources = help().querySelector('details');
    const summary = sources.querySelector('summary');
    expect(sources.open).toBe(false);
    const backward = press(close, 'Tab', { shiftKey: true });
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(press(summary, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    await act(async () => { summary.click(); });
    expect(sources.open).toBe(true);
    const links = sources.querySelectorAll('a[href]');
    const lastLink = links[links.length - 1];
    expect(press(close, 'Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastLink);
    expect(press(lastLink, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    expect(hooks().pausedRef.current).toBe(true);
  });

  it('opens the drone briefing at its heading and traps reverse Tab before returning to its launcher', async () => {
    // Finish the active flight before returning to the mission menu; replacing
    // its view directly now correctly triggers interrupted-flight recovery.
    await act(async () => { button('✕ Exit').click(); });
    await act(async () => { setData(previous => ({ ...previous, flightSim: {
      ...previous.flightSim, view: 'menu', menuSections: { challenges: true },
    } })); });
    const launch = host.querySelector('[data-flight-challenge-id="drone_survey"]');
    expect(launch).toBeTruthy();
    launch.focus();
    await act(async () => { launch.click(); });
    const title = host.querySelector('#drone-briefing-title');
    const dialog = host.querySelector('#skyschool-drone-briefing');
    expect(title).toBeTruthy();
    expect(title.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(title);
    expect(dialog.scrollTop).toBe(0);
    const begin = button('✓ I Understand — Begin Flight');
    const reverseTab = press(title, 'Tab', { shiftKey: true });
    expect(reverseTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(begin);
    const forwardTab = press(begin, 'Tab');
    expect(forwardTab.defaultPrevented).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await act(async () => { press(document.activeElement, 'Escape'); });
    expect(host.querySelector('#skyschool-drone-briefing')).toBeNull();
    expect(document.activeElement).toBe(launch);
    expect(latest.selectedChallenge).toBeNull();
    expect(latest.view).toBe('menu');
  });

  it('teaches how to release a Deck-latched brake before a challenge takeoff', async () => {
    await act(async () => { hooks().startFlightChallenge('first_flight'); });
    await act(async () => { host.querySelector('button[aria-label="Set wheel brakes"]').click(); });
    await frame();
    const cue = host.querySelector('[data-flight-challenge-cue]');
    expect(hooks().controlsRef.current.brake).toBe(1);
    expect(cue.textContent).toContain('Release X and turn off Wheel Brakes in Deck before adding power.');
    expect(cue.textContent).not.toContain('Press X to release');
    await act(async () => { host.querySelector('button[aria-label="Release wheel brakes"]').click(); });
    await frame();
    expect(hooks().controlsRef.current.brake).toBe(0);
    expect(host.querySelector('[data-flight-challenge-cue]').textContent).not.toContain('turn off Wheel Brakes');
  });
});
