import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, makeUpdater;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('        var updatePeds = function(dt) {');
  const end = source.indexOf('        // scanSpatialHazards:', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate live pedestrian updater');
  makeUpdater = new Function('scope', 'with (scope) { ' + source.slice(start, end) + '\nreturn updatePeds; }');
});

function crossing(curved, walk = false, kind = 'adult') {
  const pedestrian = { x: -4.5, y: 40, homeX: -4.5, homeY: 40, vx: kind === 'kid' ? 0.9 : 0.6, vy: 0,
    kind, crossing: true, waitingAtCrosswalk: true, crosswalkY: 40, _chunk: 0,
    crossDirection: -1, sidewalkLeft: -4.5, sidewalkRight: 4.5,
    _curvedRoadFrame: curved, _roadStation: 40, _sidewalkLateral: -4.5,
    _crossTargetLateral: 4.5, _sidewalkOffset: 4.5, _crossSpeed: kind === 'kid' ? 0.9 : 0.6 };
  const scope = { ...RR, currentScenario: { id: 'residential' }, currentVehicle: { id: 'sedan' },
    signalsRef: { current: [{ type: 'light', y: 40, _chunk: 0 }] }, trafficRef: { current: [] },
    cyclistsRef: { current: [] }, carRef: { current: { x: 80, y: 80, heading: 0, speed: 0 } },
    pedsRef: { current: [pedestrian] }, infiniteWorldRef: { current: curved ? { spline: {} } : null },
    timeRef: { current: 0 }, addToast: () => {},
    pedestrianSignalState: () => ({ walk }),
    mainRoadWorldPoint: (_world, station, lateral) => ({ x: lateral, y: station }) };
  return { pedestrian, scope, update: makeUpdater(scope) };
}

describe('live pedestrian crossing speed and curb arrival', () => {
  it.each([30, 60, 144])('keeps a bounded hurry speed after the signal changes at %i Hz', hz => {
    for (const curved of [false, true]) {
      const { pedestrian, update } = crossing(curved);
      for (let frame = 0; frame < hz * 2; frame++) {
        const before = pedestrian.x;
        update(1 / hz);
        expect(Math.abs(pedestrian.x - before) * hz).toBeLessThanOrEqual(1.56 + 1e-8);
      }
      expect(pedestrian.x).toBeCloseTo(-4.5 + 1.56 * 2, 8);
    }
  });

  it.each([10, 30, 144])('lands exactly at the far curb without overshooting at %i Hz', hz => {
    for (const curved of [false, true]) {
      const { pedestrian, update } = crossing(curved);
      for (let frame = 0; frame < hz * 8 && pedestrian.crossing; frame++) update(1 / hz);
      expect(pedestrian.crossing).toBe(false);
      expect(pedestrian.x).toBeCloseTo(4.5, 10);
      expect(pedestrian.homeX).toBeCloseTo(4.5, 10);
      expect(pedestrian.crossDirection).toBe(1);
      expect(pedestrian.crossDwell).toBeGreaterThan(0);
      update(1 / hz);
      expect(pedestrian.x).toBeCloseTo(4.5, 10);
    }
  });

  it('uses normal walking speed with WALK and bounded faster steps for a child', () => {
    const adult = crossing(false, true), child = crossing(false, false, 'kid');
    adult.update(0.25); child.update(0.25);
    expect(adult.pedestrian.x).toBeCloseTo(-4.5 + 1.2 * 0.25, 10);
    expect(child.pedestrian.x).toBeCloseTo(-4.5 + 2.34 * 0.25, 10);
  });

  it('walks the final distance to the curb rather than snapping the last half metre', () => {
    for (const curved of [false, true]) {
      const { pedestrian, update } = crossing(curved, true);
      pedestrian.x = pedestrian._sidewalkLateral = 4.2;
      update(0.01);
      expect(pedestrian.x).toBeCloseTo(4.212, 10);
      expect(pedestrian.crossing).toBe(true);
    }
  });

  it('does not finish inside a stopped vehicle occupying the far curb', () => {
    for (const curved of [false, true]) {
      const { pedestrian, update, scope } = crossing(curved, true);
      pedestrian.x = pedestrian._sidewalkLateral = 3.9;
      scope.carRef.current = { x: 6.9, y: 40, heading: 0, speed: 0 };
      update(1);
      expect(pedestrian.x).toBe(3.9);
      expect(pedestrian.crossing).toBe(true);
      expect(pedestrian.crossDirection).toBe(-1);
      expect(pedestrian.crossDwell || 0).toBe(0);
      scope.carRef.current.x = 80;
      update(1);
      expect(pedestrian.x).toBe(4.5);
      expect(pedestrian.crossing).toBe(false);
    }
  });
});
