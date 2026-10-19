import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, FS, latest, frameCallback, wallTime, audioContexts, previousAudio;
const hooks = () => window.__testHooks.flightSim;
const hold = () => host.querySelector('[data-flight-assistance]');
const cockpit = () => host.querySelector('canvas[role="application"]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const audioParam = () => {
  const param = { value: 0, cancelScheduledValues: vi.fn() };
  param.setValueAtTime = vi.fn(value => { param.value = value; });
  param.setTargetAtTime = vi.fn(value => { param.value = value; });
  return param;
};
class FlightAudioContext {
  constructor() { this.currentTime = 1; this.sampleRate = 1000; this.state = 'running'; this.destination = {}; this.gains = []; this.oscillators = []; audioContexts.push(this); }
  node() { return { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  createOscillator() { const node = { ...this.node(), frequency: audioParam() }; this.oscillators.push(node); return node; }
  createGain() { const node = { ...this.node(), gain: audioParam() }; this.gains.push(node); return node; }
  createBiquadFilter() { return { ...this.node(), frequency: audioParam(), Q: audioParam() }; }
  createBuffer(_channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  createBufferSource() { return this.node(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
function key(type, value) {
  cockpit().dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }));
}
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => { wallTime += 1000 / 60; frameCallback(); });
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }

beforeEach(async () => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  audioContexts = []; previousAudio = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: FlightAudioContext });
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {}, set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await click(host.querySelector('button[aria-label="Free Flight from Portland, ME"]'));
  const altitude = 5032, factor = Math.sqrt(FS.Physics.airDensity(altitude) / FS.Physics.RHO_SL);
  Object.assign(hooks().flightRef.current, { altitude, fieldElev: 76, speed: 120 / 0.5924838 / factor,
    heading: 182.6, vsi: 0, onGround: false, stalling: false, lowAirspeed: false, aoa: 3 });
  Object.assign(hooks().controlsRef.current, { throttle: 0.6, pitch: 3, bank: 0 });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  // Exercise real input, RAF, UI and sound lifecycle; aerodynamic integration
  // is independently covered by the altitude and aircraft performance suites.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: 2550, thrust: 200, drag: 200, weight: 2550, normal: 2550 } }));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  if (previousAudio) Object.defineProperty(window, 'AudioContext', previousAudio); else delete window.AudioContext;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('accessible current-flight assistance', () => {
  it('shares IAS capture and toggling between the deck button and B without stealing focus', async () => {
    await click(hold());
    expect(document.activeElement).toBe(hold());
    expect(hold().getAttribute('aria-pressed')).toBe('true');
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtHdg: 183, tgtAlt: 5000, tgtSpd: 120 });
    const text = host.querySelector('#skyschool-assistance-targets').textContent;
    expect(text).toContain('183°'); expect(text).toContain('5,000 ft MSL'); expect(text).toContain('120 kt IAS');
    expect(hooks().pausedRef.current).toBe(false); // Focusing a deck control is not window departure.
    await act(async () => { cockpit().focus(); key('keydown', 'b'); key('keyup', 'b'); });
    await frame();
    expect(hold().getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('#skyschool-assistance-targets')).toBeNull();
    await act(async () => { key('keydown', 'b'); key('keyup', 'b'); }); await frame();
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtSpd: 120 });
    await click(hold()); expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
  });

  it('yields button-enabled assistance to keyboard steering and a deflected touch', async () => {
    await click(hold());
    await act(async () => { cockpit().focus(); key('keydown', 'ArrowUp'); }); await frame(); key('keyup', 'ArrowUp');
    expect(hold().getAttribute('aria-pressed')).toBe('false');
    await click(hold());
    vi.spyOn(cockpit(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 600 });
    await act(async () => {
      for (const [type, y] of [['touchstart', 300], ['touchmove', 260]]) {
        const point = { identifier: 1, clientX: 300, clientY: y };
        cockpit().dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true,
          changedTouches: [point], touches: [point], targetTouches: [point] }));
      }
    });
    expect(hold().getAttribute('aria-pressed')).toBe('false');
    expect(hooks().controlsRef.current.pitch).toBe(7.5);
  });
});

describe('flight pause lifecycle', () => {
  it('applies flap and force shortcuts during a held pause without queuing them for Resume', async () => {
    await frame();
    await click(host.querySelector('button[aria-label="Pause flight"]'));
    await frame(); await frame();
    const pausedTime = hooks().timeRef.current;
    const pausedFlight = JSON.stringify(hooks().flightRef.current);
    const pausedEvidence = JSON.stringify(hooks().getLogRef().current);
    await act(async () => {
      cockpit().focus();
      key('keydown', ']'); key('keyup', ']');
      key('keydown', 'f'); key('keyup', 'f');
    });
    await frame();
    expect(hooks().controlsRef.current.flaps).toBe(10);
    expect(latest.showForces).toBe(true);
    expect(hooks().keysRef.current[']']).toBe(false);
    expect(hooks().keysRef.current.f).toBe(false);
    await act(async () => { key('keydown', '['); key('keyup', '['); });
    await frame();
    expect(hooks().controlsRef.current.flaps).toBe(0);
    expect(hooks().timeRef.current).toBe(pausedTime);
    expect(JSON.stringify(hooks().flightRef.current)).toBe(pausedFlight);
    expect(JSON.stringify(hooks().getLogRef().current)).toBe(pausedEvidence);
    await click(host.querySelector('button[aria-label="Resume flight"]'));
    await frame();
    expect(hooks().controlsRef.current.flaps).toBe(0);
    expect(latest.showForces).toBe(true);
  });

  it('mutes engine, wind and stall horn immediately and throughout pause, then restores sound only on Resume', async () => {
    hooks().flightRef.current.stalling = true; await frame();
    const engine = audioContexts[0], horn = audioContexts.find(context => context.oscillators.some(node => node.type === 'square'));
    expect(engine.gains.slice(0, 2).every(node => node.gain.value > 0)).toBe(true);
    expect(horn).toBeTruthy();
    const before = hooks().timeRef.current;
    await click(host.querySelector('button[aria-label="Pause flight"]'));
    expect(engine.gains.slice(0, 2).every(node => node.gain.value === 0)).toBe(true);
    expect(horn.oscillators[0].stop).toHaveBeenCalledOnce();
    await frame(); await frame();
    expect(hooks().timeRef.current).toBe(before);
    expect(engine.gains.slice(0, 2).every(node => node.gain.value === 0)).toBe(true);
    expect(hold().disabled).toBe(true);
    await act(async () => { cockpit().focus(); key('keydown', 'b'); key('keyup', 'b'); }); await frame();
    await click(host.querySelector('button[aria-label="Resume flight"]')); await frame();
    expect(engine.gains.slice(0, 2).every(node => node.gain.value > 0)).toBe(true);
    expect(hooks().timeRef.current).toBeGreaterThan(before);
    expect(latest.autopilot).toEqual({ hdg: false, alt: false, spd: false });
  });

  it.each(['blur', 'hidden'])('pauses on %s and requires explicit Resume after returning', async reason => {
    await frame(); const before = hooks().timeRef.current;
    await act(async () => { cockpit().focus(); key('keydown', 'w'); });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(reason === 'hidden');
    await act(async () => {
      if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      else document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(hooks().pausedRef.current).toBe(true); expect(hooks().keysRef.current).toEqual({});
    hidden.mockReturnValue(false);
    await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await frame(); expect(hooks().timeRef.current).toBe(before);
    expect(hooks().pausedRef.current).toBe(true);
    await click(host.querySelector('button[aria-label="Resume flight"]')); await frame();
    expect(hooks().timeRef.current).toBeGreaterThan(before);
  });

  it('silences help immediately and does not resume on help close after window departure', async () => {
    await frame(); const engine = audioContexts[0];
    await click(button('Controls and help'));
    expect(engine.gains.slice(0, 2).every(node => node.gain.value === 0)).toBe(true);
    await act(async () => window.dispatchEvent(new Event('blur')));
    await click(button('Close help'));
    expect(hooks().pausedRef.current).toBe(true);
    await frame(); expect(engine.gains.slice(0, 2).every(node => node.gain.value === 0)).toBe(true);
  });
});
