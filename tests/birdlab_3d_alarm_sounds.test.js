// BirdLab woodland sounds and the hawk: when a resident freezes, the sound
// layer voices its alarm exactly once from where it is, captions it as an
// alarm, and cues the bird's visible call. Silent freezers stay silent.
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const { act } = React;
const toolSource = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const componentSource = sliceBetween(toolSource, '  function BirdlabResidentStudio(', '  // ── Reduced motion CSS', { file: 'stem_tool_birdlab.js' });
const lightNames = sliceBetween(toolSource, '  var BIRDLAB_LIGHT_NAMES', '  function birdLabCallLevel(', { file: 'stem_tool_birdlab.js' });
// The real sound helpers, from the loaded module, bound under their source names.
const soundHelpers = 'var P = window.__alloBirdLabPure, WOODLAND_CALLS = P.WOODLAND_CALLS, birdLabSoundBearing = P.soundBearing, birdLabPlaySpatialCall = P.playSpatialCall, birdLabSongCues = P.songCues, birdLabCallInterval = P.callInterval, birdLabAlarmCall = P.alarmCall;\n';
const state = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };
let root, host, previousMedia, started;
function uiController() {
  return Object.fromEntries(['pinResidentShape', 'clearResidentShape', 'setResidentFrozenSurface', 'setResidentFrozenOpacity', 'setResidentPart', 'setResidentView', 'setStudyOverlay', 'setPaused', 'setSpeed', 'setCamera', 'setLighting', 'setRepeatFlights', 'setMode', 'setBinoculars', 'setCrouching', 'recordSighting', 'lockPointer', 'setMove', 'stepMove', 'seek', 'resetView', 'restart', 'dispose', 'getState'].map(name => [name, vi.fn()]));
}
function uiButton(label) { return [...host.querySelectorAll('button')].find(el => el.textContent === label); }
async function mount(load, props = {}) {
  const View = new Function('loadBirdlab3D', lightNames + soundHelpers + componentSource + '\nreturn Birdlab3DObservatory;')(load);
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), ...props })));
  return View;
}



beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); });
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  started = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (extra = {}) => Object.assign({ connect(n) { return n; }, disconnect() {} }, extra);
  window.AudioContext = class { constructor() { this.state = 'running'; this.destination = node(); this.currentTime = 0; }
    resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
    createGain() { return node({ gain: param() }); } createBiquadFilter() { return node({ frequency: { value: 0 } }); }
    createOscillator() { return node({ frequency: param(), start() { started++; }, stop() {} }); } createStereoPanner() { return node({ pan: { value: 0 } }); } };
  vi.useFakeTimers();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  vi.useRealTimers(); host.remove(); window.matchMedia = previousMedia; delete window.BirdLab3D; delete window.AudioContext; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BirdLab alarm calls in the woodland', () => {
  it('voices each freeze once, as an alarm, and leaves silent freezers silent', async () => {
    let publish; const scene = { ...uiController(), cueSong: vi.fn(() => true) };
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return scene; }) };
    await mount(() => Promise.resolve());
    const view = { mode: 'free', cameraPosition: [0, 1.6, 0], cameraTarget: [0, 1.6, -4] };
    const row = (id, name, alarm) => ({ id, name, position: [1, 0, -3], behavior: alarm ? 'Freezing as the hawk passes' : 'Scanning', alarm });
    await act(async () => publish({ ...view, wildlife: [row('chickadee', 'Black-capped chickadee'), row('mourningDove', 'Mourning dove')] }));
    await act(async () => host.querySelector('[data-birdlab-sounds-toggle]').click());
    const caption = () => host.querySelector('[data-birdlab-heard]');
    await act(async () => publish({ ...view, wildlife: [row('chickadee', 'Black-capped chickadee', { at: 3, danger: 1 }), row('mourningDove', 'Mourning dove', { at: 3, danger: 1 })] }));
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(caption().getAttribute('data-birdlab-heard')).toBe('chickadee');
    expect(caption().getAttribute('data-birdlab-heard-alarm')).toBe('true');
    expect(caption().textContent).toMatch(/Alarm: chick-a-dee(-dee){7}, 8 dee notes\.$/);
    expect(scene.cueSong).toHaveBeenCalledTimes(1);
    expect(scene.cueSong.mock.calls[0][0]).toBe('chickadee');
    expect(scene.cueSong.mock.calls[0][1]).toHaveLength(10);
    const tones = started;
    expect(tones).toBe(10);
    // The same freeze is not voiced again; the dove's freeze is never voiced.
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(scene.cueSong).toHaveBeenCalledTimes(1);
    expect(scene.cueSong.mock.calls.some(call => call[0] === 'mourningDove')).toBe(false);
    // A new freeze is a new alarm.
    await act(async () => publish({ ...view, wildlife: [row('chickadee', 'Black-capped chickadee', { at: 20, danger: 0 })] }));
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(scene.cueSong).toHaveBeenCalledTimes(2);
    expect(scene.cueSong.mock.calls[1][1]).toHaveLength(4);
    // Mobbing a perched hawk is voiced as scolding, not as the overhead seet.
    await act(async () => publish({ ...view, wildlife: [row('tuftedTitmouse', 'Tufted titmouse', { at: 40, danger: .15, mob: true })] }));
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(caption().getAttribute('data-birdlab-heard')).toBe('tuftedTitmouse');
    expect(caption().textContent).toMatch(/Mobbing call: harsh scolding chatter, easy to locate\.$/);
    expect(scene.cueSong.mock.calls[2][1]).toHaveLength(6);
  });
});
