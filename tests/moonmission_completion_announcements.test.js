import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

let P, frames;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.spyOn(Math, 'random').mockReturnValue(.999);
});
afterEach(() => {
  document.body.replaceChildren();
  // Let each real canvas closure observe removal and release its visibility listener.
  for (const frame of frames.splice(0)) frame(0);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function find(node, attribute) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, attribute); if (match) return match; }
    return null;
  }
  return node.props?.[attribute] ? node : find(node.props?.children, attribute);
}
function insertion() {
  const p = P.loiProfile();
  return { loiPlan: p.controls, loiRun: { version: 1, time: p.summary.duration, recorded: true }, loiResult: { version: 1, ...p.summary } };
}

const cases = [
  { name: 'Earth injection', phase: 2, seed: () => ({ tliStarted: true }), canvas: 'data-tli-canvas', action: '_tliAction', end: 'end', result: 'tliResult', message: /Injection cutoff reviewed/ },
  { name: 'lunar orbit environment', phase: 4, seed: () => ({ ...insertion(), lunarEnvironmentOpen: true }), canvas: 'data-environment-canvas', action: '_environmentAction', end: 'end', result: 'lunarEnvironmentResult', message: /orbit reviewed/i },
  { name: 'powered lunar approach', phase: 5, seed: () => ({}), canvas: 'data-approach-canvas', action: '_approachAction', end: 'end', result: 'approachResult', message: /Powered approach reviewed/ },
  { name: 'lunar departure', phase: 8, seed: () => ({ ...insertion(), departureOpen: true }), canvas: 'data-departure-canvas', action: '_departureAction', end: 'review', result: 'departureResult', message: /Lunar escape/ },
];

describe('simulation completion announcements', () => {
  it.each(cases)('$name announces its measured completion once across rewind and review', item => {
    const announceToSR = vi.fn();
    const store = newStore({ moonMission: { missionPhase: item.phase, missionXP: 0, missionLog: [], animPaused: true, soundOff: true, ...item.seed() } });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData, announceToSR }, store));
    const node = find(tree, item.canvas);
    expect(node).toBeTruthy();
    const canvas = document.createElement('canvas');
    // The test exercises persisted completion actions; it never advances or draws frames.
    canvas.getContext = () => ({ setTransform() {} });
    document.body.append(canvas);
    node.ref(canvas);
    expect(announceToSR).not.toHaveBeenCalled();
    canvas[item.action](item.end);
    expect(store.toolData.moonMission[item.result]).toBeTruthy();
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toMatch(item.message);
    canvas[item.action]('seek', 0);
    canvas[item.action](item.end);
    expect(announceToSR).toHaveBeenCalledTimes(1);
  });
});
