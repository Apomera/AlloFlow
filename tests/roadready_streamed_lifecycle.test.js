import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, updateActors;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('            for (var sci = currentChunk + loFromTravel;');
  const end = source.indexOf('\n          }\n\n          // Cloud drift animation', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live streamed actor lifecycle');
  updateActors = new Function('scope', 'with(scope) {' + source.slice(start, end) + '}');
});

function streaming(direction) {
  const world = RR.createScenarioWorld({ id: 'residential', speedLimit: 25 });
  const scope = { ...RR, iw: world, scn: { id: 'residential', speedLimit: 25 }, currentChunk: 3,
    loFromTravel: direction < 0 ? -RR.RR_STREAM_CHUNKS_AHEAD : -RR.RR_STREAM_CHUNKS_BEHIND,
    hiFromTravel: direction < 0 ? RR.RR_STREAM_CHUNKS_BEHIND : RR.RR_STREAM_CHUNKS_AHEAD,
    signalsRef: { current: [] }, trafficRef: { current: [] }, pedsRef: { current: [] },
    s3: { _loadedChunks: {}, scene: { remove() {} } } };
  const frame = (chunk = scope.currentChunk, travelDirection = direction, cleanup = false) => {
    scope.currentChunk = chunk;
    scope.loFromTravel = travelDirection < 0 ? -RR.RR_STREAM_CHUNKS_AHEAD : -RR.RR_STREAM_CHUNKS_BEHIND;
    scope.hiFromTravel = travelDirection < 0 ? RR.RR_STREAM_CHUNKS_BEHIND : RR.RR_STREAM_CHUNKS_AHEAD;
    if (cleanup) world.cleanup(chunk);
    // Geometry is expensive and irrelevant here; preserve the renderer's
    // real loaded-object lifetime while running its actual actor/unload block.
    for (let ci = chunk + scope.loFromTravel; ci <= chunk + scope.hiFromTravel; ci++) {
      if (!scope.s3._loadedChunks[ci]) {
        world.getChunk(ci);
        scope.s3._loadedChunks[ci] = { traverse() {} };
      }
    }
    updateActors(scope);
  };
  return { scope, world, frame };
}

describe('streamed road data and rendered actor lifetimes stay aligned', () => {
  it.each([-1, 1])('keeps live chunk identity and actor counts stable across stationary cleanups travelling %i', direction => {
    const run = streaming(direction);
    run.frame();
    const counts = [run.scope.signalsRef.current.length, run.scope.trafficRef.current.length, run.scope.pedsRef.current.length];
    const liveChunks = Object.keys(run.scope.s3._loadedChunks).map(Number);
    const originalChunks = liveChunks.map(index => run.world.getChunk(index));
    const originalSignal = run.scope.signalsRef.current.find(signal => Math.abs(signal._chunk - 3) > 4);
    expect(originalSignal).toBeDefined();
    originalSignal.timer = 4.25;
    for (let cycle = 0; cycle < 8; cycle++) run.frame(3, direction, true);
    expect([run.scope.signalsRef.current.length, run.scope.trafficRef.current.length, run.scope.pedsRef.current.length]).toEqual(counts);
    for (let i = 0; i < liveChunks.length; i++) expect(run.world.getChunk(liveChunks[i])).toBe(originalChunks[i]);
    expect(run.scope.signalsRef.current.filter(signal => signal._chunk === originalSignal._chunk)).toEqual([originalSignal]);
    expect(originalSignal.timer).toBe(4.25);
  });

  it('retires distant actors once and restores a single population on a revisit', () => {
    const run = streaming(-1); run.frame();
    const chunk = run.scope.signalsRef.current[0]._chunk;
    const initialVehicles = run.scope.trafficRef.current.filter(actor => actor._chunk === chunk);
    const initialPeds = run.scope.pedsRef.current.filter(actor => actor._chunk === chunk);
    run.frame(30, 1, true);
    expect(run.scope.signalsRef.current.some(signal => signal._chunk === chunk)).toBe(false);
    expect(run.scope.trafficRef.current.some(actor => actor._chunk === chunk)).toBe(false);
    expect(run.scope.pedsRef.current.some(actor => actor._chunk === chunk)).toBe(false);
    run.frame(3, -1, true);
    for (let cycle = 0; cycle < 3; cycle++) run.frame(3, -1, true);
    const vehicles = run.scope.trafficRef.current.filter(actor => actor._chunk === chunk);
    const peds = run.scope.pedsRef.current.filter(actor => actor._chunk === chunk);
    expect(vehicles).toHaveLength(initialVehicles.length);
    expect(peds).toHaveLength(initialPeds.length);
    expect(vehicles.every(actor => !initialVehicles.includes(actor))).toBe(true);
    expect(peds.every(actor => !initialPeds.includes(actor))).toBe(true);
  });

  it('bounds both actor population and retained data while travelling and reversing', () => {
    const run = streaming(-1);
    for (const [chunk, direction] of [[3, -1], [-20, -1], [-40, -1], [-40, 1], [-15, 1], [10, 1], [3, -1]]) {
      for (let cycle = 0; cycle < 5; cycle++) run.frame(chunk, direction, true);
      const ids = run.scope.trafficRef.current.map(actor => actor.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(run.scope.signalsRef.current.length).toBeLessThanOrEqual(8);
      expect(run.scope.trafficRef.current.length).toBeLessThanOrEqual(16);
      expect(run.scope.pedsRef.current.length).toBeLessThanOrEqual(16);
      expect(Object.keys(run.world.chunks).length).toBeLessThanOrEqual(2 * RR.RR_STREAM_DATA_RADIUS + 1);
      expect(Object.keys(run.scope.s3._loadedChunks).length).toBeLessThanOrEqual(14);
    }
  });
});
