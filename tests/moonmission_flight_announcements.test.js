import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
function findCanvas(node, attribute) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = findCanvas(child, attribute); if (hit) return hit; }
    return null;
  }
  return node.type === 'canvas' && node.props[attribute] ? node : findCanvas(node.props?.children, attribute);
}
function insertion() {
  const profile = P.loiProfile();
  return { loiPlan: profile.controls, loiRun: { version: 1, time: profile.summary.duration, recorded: true }, loiResult: { version: 1, ...profile.summary } };
}
const flights = [
  ['injection', 2, () => ({ tliStarted: true }), 'data-tli-canvas', '_tliAction', 'Injection cutoff reviewed.'],
  ['lunar environment', 4, () => ({ ...insertion(), lunarEnvironmentOpen: true }), 'data-environment-canvas', '_environmentAction', 'One orbit reviewed:'],
  ['powered approach', 5, () => ({}), 'data-approach-canvas', '_approachAction', 'Powered approach reviewed.'],
  ['lunar departure', 8, () => ({ ...insertion(), departureOpen: true }), 'data-departure-canvas', '_departureAction', '']
];

beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
  vi.spyOn(Math, 'random').mockReturnValue(.999);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      if (/^create.*Gradient$/.test(key)) return () => ({ addColorStop() {} });
      return target[key] ?? (() => {});
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('Moon Mission flight review announcements', () => {
  it.each(flights)('announces the completed %s review once through the host callback', (_name, phase, state, attribute, action, prefix) => {
    const announce = vi.fn();
    const store = newStore({ moonMission: { missionPhase: phase, soundOff: true, ...state() } });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData, announceToSR: announce }, store));
    document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(tree);
    const canvas = document.querySelector('[' + attribute + ']');
    expect(canvas).not.toBeNull();
    findCanvas(tree, attribute).ref(canvas);
    canvas[action](_name === 'lunar departure' ? 'review' : 'end');
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0][0]).toEqual(expect.any(String));
    expect(announce.mock.calls[0][0].length).toBeGreaterThan(30);
    if (prefix) expect(announce.mock.calls[0][0]).toContain(prefix);
    canvas[action](_name === 'lunar departure' ? 'review' : 'end');
    expect(announce).toHaveBeenCalledTimes(1);
  });
});
