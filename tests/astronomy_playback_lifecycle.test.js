import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const cases = [
  { name: 'Transit', tab: 'exoplanets', playing: 'transitPlaying', value: 'transitTime', start: 0.3, next: 0.308, changed: 0.4, delay: 80 },
  { name: 'Moon', tab: 'moon', playing: 'moonPlaying', value: 'moonAgeDays', start: 3, next: 3.035, delay: 80 },
  { name: 'Eclipse', tab: 'eclipses', playing: 'eclipsePlaying', value: 'eclipsePhase', start: 30, next: 32, delay: 100 },
  { name: 'Meteor', tab: 'meteors', playing: 'simMeteorPlaying', value: 'simMeteorFrame', start: 4, next: 5, delay: 800 },
  { name: 'Events default meteor view', tab: 'eclipses', playing: 'simMeteorPlaying', value: 'simMeteorFrame', start: 4, next: 5, delay: 800, defaultView: true }
];
const mounts = [];
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  for (const mounted of mounts.splice(0)) mounted.unmount();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
});

function initialState(testCase) {
  const state = { tab: testCase.tab, observingList: [], [testCase.playing]: true, [testCase.value]: testCase.start };
  if (!testCase.defaultView) state.simMeteorView = '2d';
  return state;
}
function mount(testCase) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let snapshot, change, live = true;
  function App() {
    const [data, setData] = React.useState({ astronomy: initialState(testCase) });
    snapshot = data.astronomy;
    change = patch => setData(prev => ({ ...prev, astronomy: { ...prev.astronomy, ...patch } }));
    return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  act(() => root.render(React.createElement(App)));
  const api = {
    get state() { return snapshot; },
    patch(patch) { change(patch); },
    unmount() { if (live) { act(() => root.unmount()); host.remove(); live = false; } }
  };
  mounts.push(api);
  return api;
}

describe.each(cases)('$name playback ownership', testCase => {
  const changed = testCase.changed ?? 10;
  it('does not schedule animation work during server rendering', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    renderTool('astronomy', { astronomy: initialState(testCase) });
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
  });

  it('keeps one clock through rerenders and advances from the latest phase', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const view = mount(testCase);
    expect(interval).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(testCase.delay));
    expect(view.state[testCase.value]).toBeCloseTo(testCase.next, 8);
    act(() => view.patch({ [testCase.value]: changed, askInput: 'An unrelated control changed' }));
    act(() => vi.advanceTimersByTime(testCase.delay));
    expect(view.state[testCase.value]).toBeCloseTo(changed + testCase.next - testCase.start, 8);
    expect(interval).toHaveBeenCalledTimes(1);
  });

  it('ignores a queued tick when playback has just been paused, then resumes normally', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const view = mount(testCase);
    const queuedTick = interval.mock.calls[0][0];
    act(() => {
      view.patch({ [testCase.playing]: false, [testCase.value]: changed });
      queuedTick();
    });
    act(() => vi.advanceTimersByTime(testCase.delay * 3));
    expect(view.state[testCase.playing]).toBe(false);
    expect(view.state[testCase.value]).toBe(changed);
    act(() => view.patch({ [testCase.playing]: true }));
    act(() => vi.advanceTimersByTime(testCase.delay));
    expect(view.state[testCase.value]).toBeCloseTo(changed + testCase.next - testCase.start, 8);
  });

  it('cannot write a late frame after a tab change and releases its clock on unmount', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const view = mount(testCase);
    const queuedTick = interval.mock.calls[0][0];
    act(() => {
      view.patch({ tab: 'tonight', [testCase.playing]: false });
      queuedTick();
    });
    act(() => vi.advanceTimersByTime(testCase.delay * 3));
    expect(view.state.tab).toBe('tonight');
    expect(view.state[testCase.playing]).toBe(false);
    expect(view.state[testCase.value]).toBe(testCase.start);
    expect(vi.getTimerCount()).toBe(0);
    act(() => view.patch({ tab: testCase.tab, [testCase.playing]: true }));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('holds its phase while the document is hidden and continues when visible', () => {
    const view = mount(testCase);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => vi.advanceTimersByTime(testCase.delay * 3));
    expect(view.state[testCase.value]).toBe(testCase.start);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => vi.advanceTimersByTime(testCase.delay));
    expect(view.state[testCase.value]).toBeCloseTo(testCase.next, 8);
  });
});
