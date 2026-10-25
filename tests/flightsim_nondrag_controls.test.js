import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, root, host, latest, patch, frameCallback, wallTime, errors, apWrites;
const hooks = () => window.__testHooks.flightSim;
const controls = () => hooks().controlsRef.current;
const cockpit = () => host.querySelector('canvas[role="application"]');
const panel = () => host.querySelector('[data-flight-tap-controls]');
const range = axis => host.querySelector('#skyschool-control-' + axis);
const step = (axis, direction) => host.querySelector(`[data-flight-control-step="${axis}"][data-flight-control-direction="${direction}"]`);
const center = () => host.querySelector('[data-flight-control-center]');
const flightButton = label => host.querySelector(`button[aria-label="${label}"]`);
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const finger = (identifier, clientX, clientY) => ({ identifier, clientX, clientY });
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
const retainedClick = node => {
  const handler = props(node).onClick;
  return () => handler({ currentTarget: node, target: node, preventDefault() {}, stopPropagation() {} });
};
function loadFlightTool() {
  const source = process.env.SKYSCHOOL_NONDRAG_SOURCE;
  if (!source) return loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  // The shared helper derives geography's filename from the canonical tool
  // basename. Frozen snapshots use descriptive names, so load that dependency
  // explicitly rather than accidentally evaluating the tool twice.
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.cwd(), source), 'utf8'))();
  const loaded = window.StemLab?._registry?.flightSim;
  if (!loaded) throw new Error('Frozen Sky School source did not register flightSim: ' + source);
  return loaded;
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function openControls() {
  expect(panel()).toBeTruthy();
  await act(async () => {
    panel().open = true;
    panel().dispatchEvent(new Event('toggle'));
  });
}
async function setRange(axis, value) {
  const node = range(axis);
  expect(node).toBeTruthy();
  await act(async () => {
    node.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function touch(type, changedTouches, touches = changedTouches) {
  cockpit().dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
    changedTouches, touches, targetTouches: touches }));
}
function key(type, value) {
  cockpit().focus();
  cockpit().dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}
async function frames(count = 1) {
  for (let index = 0; index < count; index++) {
    expect(frameCallback).toBeTypeOf('function');
    await act(async () => { wallTime += 34; vi.advanceTimersByTime(34); frameCallback(); });
    expect(errors).not.toHaveBeenCalled();
  }
}
async function mount(aircraft = 'cessna172') {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft, railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    patch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, name, value) => {
        if (name === 'autopilot') apWrites.push(value);
        setData(old => ({ ...old, [id]: { ...old[id], [name]: value } }));
      },
      updateMulti: (id, values) => setData(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await click(flightButton('Free Flight from Portland, ME'));
  vi.spyOn(cockpit(), 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 1000, height: 600,
    right: 1100, bottom: 650 });
  Object.assign(hooks().flightRef.current, { speed: 100 / 0.5924838, altitude: 3000, fieldElev: 72,
    vsi: 0, heading: 180, onGround: false, stalling: false, lowAirspeed: false, aoa: 0 });
  Object.assign(controls(), { pitch: 0, bank: 0, throttle: 0.5, yawRate: 0 });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  // Aerodynamics have their own suites. Keep the actual RAF, control handover,
  // native React events and UI lifecycle while preventing a test flight landing.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: 2550, thrust: 200, drag: 200, weight: 2550, normal: 0 } }));
  await frames(8);
  await openControls();
  apWrites.length = 0;
}
async function enableAssistance() {
  await act(async () => patch({ autopilot: { hdg: true, alt: true, spd: true,
    tgtHdg: 180, tgtAlt: 3000, tgtSpd: 100 } }));
  apWrites.length = 0;
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadFlightTool();
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null; apWrites = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); delete document.hidden;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('single-pointer flight controls', () => {
  it('provides labelled native ranges and buttons without claiming assisted flight while reading', async () => {
    await mount(); await enableAssistance();
    const before = { ...controls() };
    expect(panel().tagName).toBe('DETAILS');
    expect(panel().querySelector('summary').textContent).toContain('Tap flight controls');
    for (const axis of ['pitch', 'bank', 'power']) {
      const input = range(axis);
      expect(input.type).toBe('range');
      expect(input.labels.length).toBe(1);
      expect(input.labels[0].textContent.toLowerCase()).toContain(axis);
      expect(input.hasAttribute('aria-label')).toBe(false);
      expect(step(axis, -1).tagName).toBe('BUTTON');
      expect(step(axis, 1).tagName).toBe('BUTTON');
      input.focus();
    }
    expect(panel().querySelector('[data-flight-control-feedback]')?.textContent || '').toBe('');
    expect(controls()).toEqual(before);
    expect(apWrites).toEqual([]);
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
  });

  it('changes pitch, bank and power with individual clicks and centers attitude without changing power', async () => {
    await mount();
    await click(step('pitch', 1)); await click(step('bank', -1)); await click(step('power', 1));
    expect(controls()).toMatchObject({ pitch: 1, bank: -5, throttle: 0.55 });
    await frames(12);
    expect(controls()).toMatchObject({ pitch: 1, bank: -5, throttle: 0.55 });
    await click(center());
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.55 });
  });

  it('announces discrete button results in one persistent region while slider and touch values stay quiet', async () => {
    await mount();
    const feedback = panel().querySelector('[data-flight-control-feedback]');
    expect(feedback).toBeTruthy(); expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.getAttribute('aria-live')).toBe('polite'); expect(feedback.getAttribute('aria-atomic')).toBe('true');
    expect(feedback.textContent).toBe('');
    const pitchDown = step('pitch', -1);
    await click(pitchDown);
    expect(panel().querySelector('[data-flight-control-feedback]') === feedback).toBe(true);
    expect(feedback.textContent).toContain('Pitch'); expect(feedback.textContent).toContain('-1');
    expect(range('pitch').getAttribute('aria-valuetext')).toBe('-1 degrees');
    expect(range('power').getAttribute('aria-valuetext')).toBe('50 percent');
    expect(document.activeElement === pitchDown).toBe(true);
    const announced = feedback.textContent;
    await setRange('pitch', -2.3); await frames(8);
    expect(range('pitch').getAttribute('aria-valuetext')).toBe('-2.3 degrees');
    expect(document.activeElement === range('pitch')).toBe(true);
    expect(feedback.textContent).toBe(announced);
    const point = finger(3, 300, 350);
    touch('touchstart', [point]); touch('touchmove', [finger(3, 340, 310)]); await frames(8);
    expect(range('pitch').getAttribute('aria-valuetext')).toBe('7.5 degrees');
    expect(range('bank').getAttribute('aria-valuetext')).toBe('22.5 degrees');
    expect(feedback.textContent).toBe(announced);
    const centerButton = center(); await click(centerButton);
    expect(panel().querySelector('[data-flight-control-feedback]') === feedback).toBe(true);
    expect(feedback.textContent).toContain('centered');
    expect(document.activeElement === centerButton).toBe(true);
    await click(flightButton('Collapse the flight deck controls'));
    await click(flightButton('Expand the flight deck controls')); await openControls();
    expect(panel().querySelector('[data-flight-control-feedback]').textContent).toBe('');
    await click(step('pitch', 1));
    expect(panel().querySelector('[data-flight-control-feedback]').textContent).toContain('Pitch');
    await click(button('✕ Exit')); await click(button('🏠 Back to Menu'));
    await click(flightButton('Free Flight from Portland, ME')); await openControls();
    expect(panel().querySelector('[data-flight-control-feedback]').textContent).toBe('');
    expect(Number(range('pitch').value)).toBe(0);
    expect(Number(range('bank').value)).toBe(0);
    expect(Number(range('power').value)).toBe(0);
  });

  it.each([
    ['cessna172', 15, 45], ['rescue_heli', 20, 30], ['drone', 25, 25],
  ])('offers precise decimal positions and clamps clicks for %s', async (aircraft, pitchMax, bankMax) => {
    await mount(aircraft);
    expect(range('pitch').min).toBe(String(-pitchMax)); expect(range('pitch').max).toBe(String(pitchMax));
    expect(range('bank').min).toBe(String(-bankMax)); expect(range('bank').max).toBe(String(bankMax));
    await setRange('pitch', 2.3); await setRange('bank', -4.7); await setRange('power', 37);
    await frames(8);
    expect(controls().pitch).toBeCloseTo(2.3, 8); expect(controls().bank).toBeCloseTo(-4.7, 8);
    expect(controls().throttle).toBeCloseTo(0.37, 8);
    for (const [axis, max] of [['pitch', pitchMax], ['bank', bankMax], ['power', 100]]) {
      await setRange(axis, max);
      // Invoke the retained callback too: a disabled native button must also
      // remain bounded if an already-dispatched activation reaches the handler.
      const increase = retainedClick(step(axis, 1));
      await act(async () => increase());
      expect(axis === 'power' ? controls().throttle * 100 : controls()[axis]).toBeCloseTo(max, 8);
      await setRange(axis, axis === 'power' ? 0 : -max);
      const decrease = retainedClick(step(axis, -1));
      await act(async () => decrease());
      expect(axis === 'power' ? controls().throttle * 100 : controls()[axis]).toBeCloseTo(axis === 'power' ? 0 : -max, 8);
    }
  });

  it('disengages assistance once for a deliberate input and keeps that axis stable', async () => {
    await mount(); await enableAssistance();
    await click(step('pitch', 1)); await click(step('bank', 1)); await click(step('power', -1));
    await frames(10);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(apWrites).toEqual([{ hdg: false, alt: false, spd: false }]);
    expect(controls()).toMatchObject({ pitch: 1, bank: 5, throttle: 0.45 });
  });

  it('lets keyboard pitch take over without dropping the independently chosen bank', async () => {
    await mount(); await setRange('pitch', 5); await setRange('bank', 10);
    key('keydown', 'w'); await frames(); key('keyup', 'w');
    const commanded = controls().pitch;
    expect(commanded).toBeGreaterThan(5);
    await frames(6);
    expect(controls().pitch).toBeLessThan(commanded);
    expect(controls().bank).toBe(10);
  });

  it('lets keyboard bank take over without dropping the independently chosen pitch', async () => {
    await mount(); await setRange('pitch', 5); await setRange('bank', 10);
    key('keydown', 'd'); await frames(); key('keyup', 'd');
    const commanded = controls().bank;
    expect(commanded).toBeGreaterThan(10);
    await frames(6);
    expect(controls().bank).toBeLessThan(commanded);
    expect(controls().pitch).toBe(5);
  });

  it('keeps a resting touch neutral, then hands both attitude axes to a deliberate stick drag', async () => {
    await mount(); await setRange('pitch', 5); await setRange('bank', 10);
    const point = finger(3, 300, 350);
    touch('touchstart', [point]); await frames(4);
    expect(controls()).toMatchObject({ pitch: 5, bank: 10 });
    touch('touchmove', [finger(3, 340, 310)]);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5 });
    touch('touchend', [finger(3, 340, 310)], []);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0 });
  });

  it('prevents an old stick finger moving or releasing a newer tap selection', async () => {
    await mount(); const point = finger(3, 300, 350);
    touch('touchstart', [point]); touch('touchmove', [finger(3, 340, 310)]);
    await setRange('pitch', 4.2); await setRange('bank', -8.1);
    touch('touchmove', [finger(3, 380, 270)]);
    touch('touchend', [finger(3, 380, 270)], []);
    await frames(6);
    expect(controls().pitch).toBeCloseTo(4.2, 8); expect(controls().bank).toBeCloseTo(-8.1, 8);
  });

  it('prevents an old power finger moving a newer tap power setting', async () => {
    await mount(); const point = finger(8, 1030, 450);
    touch('touchstart', [point]); touch('touchmove', [finger(8, 1030, 410)]);
    expect(controls().throttle).toBeCloseTo(0.7, 8);
    await setRange('power', 33);
    touch('touchmove', [finger(8, 1030, 350)]); touch('touchend', [finger(8, 1030, 350)], []);
    expect(controls().throttle).toBeCloseTo(0.33, 8);
  });

  it.each(['pause', 'help', 'blur', 'hidden'])(
    'releases owned attitude on %s, preserves power, and rejects delayed input until resumed', async lifecycle => {
      await mount(); await setRange('pitch', 5); await setRange('bank', 10); await setRange('power', 40);
      const retained = retainedClick(step('pitch', 1));
      if (lifecycle === 'pause') await click(flightButton('Pause flight'));
      else if (lifecycle === 'help') await click(button('Controls and help'));
      else if (lifecycle === 'blur') await act(async () => window.dispatchEvent(new Event('blur')));
      else await act(async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(hooks().pausedRef.current).toBe(true);
      expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
      for (const axis of ['pitch', 'bank', 'power']) {
        // Help replaces the cockpit tree; ordinary pause retains it with
        // disabled controls. Neither surface leaves a usable manual command.
        if (lifecycle === 'help') expect(range(axis)).toBeNull();
        else { expect(range(axis).disabled).toBe(true); expect(step(axis, 1).disabled).toBe(true); }
      }
      await act(async () => retained());
      expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
      if (lifecycle === 'hidden') await act(async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await click(lifecycle === 'help' ? host.querySelector('#skyschool-close-help') : flightButton('Resume flight'));
      await openControls();
      await frames(8);
      expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
      await click(step('pitch', 1));
      expect(controls().pitch).toBe(1);
    });

  it.each(['panel', 'rail'])(
    'releases attitude when the %s is folded and does not resurrect it on reopen', async surface => {
      await mount(); await setRange('pitch', 5); await setRange('bank', 10); await setRange('power', 40);
      if (surface === 'panel') await act(async () => {
        panel().open = false; panel().dispatchEvent(new Event('toggle'));
      });
      else await click(flightButton('Collapse the flight deck controls'));
      expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
      if (surface === 'rail') await click(flightButton('Expand the flight deck controls'));
      await openControls(); await frames(6);
      expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
    });

  it('leaves unowned manual trim unchanged when an unused panel closes', async () => {
    await mount(); Object.assign(controls(), { pitch: 3, bank: -7, throttle: 0.6 });
    await act(async () => { panel().open = false; panel().dispatchEvent(new Event('toggle')); });
    expect(controls()).toMatchObject({ pitch: 3, bank: -7, throttle: 0.6 });
  });

  it('hands control to flight assistance without snapping the chosen trim to zero', async () => {
    await mount(); await setRange('pitch', 3); await setRange('bank', 10); await setRange('power', 40);
    const before = { ...controls() };
    await click(host.querySelector('[data-flight-assistance]'));
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
    expect(controls()).toEqual(before);
    await frames(3);
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true });
    expect(apWrites.filter(item => !item.hdg && !item.alt && !item.spd)).toEqual([]);
    await click(host.querySelector('[data-flight-assistance]'));
    const unassistedBank = controls().bank;
    await frames(6);
    expect(Math.abs(controls().bank)).toBeLessThan(Math.abs(unassistedBank));
  });

  it('retires previous tap ownership when external assistance is engaged and retaken before the next frame', async () => {
    await mount(); await setRange('pitch', 3); await setRange('bank', 10);
    await enableAssistance();
    // No RAF has run since this external engagement. A new pitch command
    // owns pitch, but the old bank selection must not return with it.
    await click(step('pitch', 1));
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(controls()).toMatchObject({ pitch: 4, bank: 10 });
    await frames(6);
    expect(controls().pitch).toBe(4);
    expect(Math.abs(controls().bank)).toBeLessThan(10);
    expect(apWrites).toEqual([{ hdg: false, alt: false, spd: false }]);
  });

  it('disengages active assistance when explicitly centering already neutral attitude', async () => {
    await mount(); await enableAssistance();
    await act(async () => patch({ autopilot: { ...latest.autopilot, tgtHdg: 270 } }));
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.5 });
    await click(center());
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
    expect(apWrites).toEqual([{ hdg: false, alt: false, spd: false }]);
    await frames(6);
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0.5 });
  });

  it('preserves assisted trim when pause follows external assistance before the next frame', async () => {
    await mount(); await setRange('pitch', 2); await setRange('bank', 10);
    await enableAssistance(); const assisted = { ...latest.autopilot };
    // The lifecycle action arrives before RAF can observe the AP handover.
    await click(flightButton('Pause flight'));
    expect(hooks().pausedRef.current).toBe(true);
    expect(controls()).toMatchObject({ pitch: 2, bank: 10, throttle: 0.5 });
    expect(latest.autopilot).toEqual(assisted);
    await click(flightButton('Resume flight')); await frames();
    expect(hooks().pausedRef.current).toBe(false);
    expect(latest.autopilot).toEqual(assisted);
    expect(apWrites).toEqual([]);
  });

  it('preserves assisted trim when closing tap controls immediately after external assistance', async () => {
    await mount(); await setRange('pitch', 2); await setRange('bank', 10);
    await enableAssistance(); const assisted = { ...latest.autopilot };
    await act(async () => { panel().open = false; panel().dispatchEvent(new Event('toggle')); });
    expect(controls()).toMatchObject({ pitch: 2, bank: 10, throttle: 0.5 });
    expect(latest.autopilot).toEqual(assisted);
    expect(apWrites).toEqual([]);
    // Closing also retires the old tap holds. Switching AP off before RAF
    // should therefore allow ordinary manual auto-centering to take over.
    await openControls(); await click(host.querySelector('[data-flight-assistance]'));
    await frames(3);
    expect(controls().pitch).toBeLessThan(2);
    expect(controls().bank).toBeLessThan(10);
  });

  it.each(['active', 'result'])(
    'disables manual controls and rejects retained callbacks during sprint %s', async phase => {
      await mount(); const retained = retainedClick(step('pitch', 1));
      Object.assign(hooks().getSprintRef().current, { active: phase === 'active', phase: phase === 'active' ? 'question' : 'result', places: [] });
      await act(async () => patch({ flightDetails: !latest.flightDetails }));
      const before = { ...controls() };
      for (const axis of ['pitch', 'bank', 'power']) {
        expect(range(axis).disabled).toBe(true); expect(step(axis, 1).disabled).toBe(true);
      }
      await act(async () => retained());
      expect(controls()).toEqual(before);
    });

  it('updates the native range readouts from live touch controls without continuous status announcements', async () => {
    await mount();
    const stick = finger(3, 300, 350), power = finger(8, 1030, 450);
    touch('touchstart', [stick, power]);
    touch('touchmove', [finger(3, 340, 310), finger(8, 1030, 430)]);
    await frames(8);
    expect(controls()).toMatchObject({ pitch: 7.5, bank: 22.5, throttle: 0.6 });
    expect(Number(range('pitch').value)).toBe(7.5);
    expect(Number(range('bank').value)).toBe(22.5);
    expect(Number(range('power').value)).toBe(60);
    expect(panel().querySelector('[data-flight-control-feedback]')?.textContent || '').toBe('');
  });

  it('retains native range keyboard ownership without arming cockpit commands', async () => {
    await mount(); const input = range('pitch'); input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(hooks().keysRef.current.arrowup).toBeFalsy();
    await setRange('pitch', 1.1); await frames(6);
    expect(document.activeElement === input).toBe(true);
    expect(controls().pitch).toBeCloseTo(1.1, 8);
  });

  it('retires controls on exit and rejects handlers retained from the previous flight after a fresh departure', async () => {
    await mount(); await setRange('pitch', 5); await setRange('bank', 10);
    const oldControls = controls(), retained = retainedClick(step('pitch', 1));
    await click(button('✕ Exit'));
    expect(latest.view).toBe('debrief');
    expect(oldControls).toMatchObject({ pitch: 0, bank: 0, throttle: 0.5 });
    await act(async () => retained());
    expect(oldControls).toMatchObject({ pitch: 0, bank: 0, throttle: 0.5 });
    await click(button('🏠 Back to Menu'));
    await click(flightButton('Free Flight from Portland, ME'));
    expect(controls() === oldControls).toBe(false);
    await act(async () => retained());
    expect(controls()).toMatchObject({ pitch: 0, bank: 0, throttle: 0 });
    await openControls(); await click(step('pitch', 1));
    expect(controls().pitch).toBe(1);
  });

  it('rejects a retained command when the live control object is replaced without leaving flying', async () => {
    await mount(); const retained = retainedClick(step('pitch', 1));
    const replacement = { ...controls(), pitch: 7, bank: -8, throttle: 0.3 };
    hooks().controlsRef.current = replacement;
    await act(async () => retained());
    expect(controls()).toEqual(replacement);
    expect(controls().pitch).toBe(7);
  });

  it('releases owned attitude on unmount and rejects a retained command from that retired tool instance', async () => {
    await mount(); await setRange('pitch', 5); await setRange('bank', 10); await setRange('power', 40);
    const oldControls = controls(), retained = retainedClick(step('pitch', 1));
    await act(async () => root.unmount()); root = null;
    expect(oldControls).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
    await act(async () => retained());
    expect(oldControls).toMatchObject({ pitch: 0, bank: 0, throttle: 0.4 });
  });
});
