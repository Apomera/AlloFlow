import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Roundabout vulnerable road users follow authored routes', () => {
  it('lets a committed vehicle clear rather than trapping its body across a newly requested crossing', () => {
    const pedestrian = RR.spawnPedestrians({ id: 'roundabout' }).find(p => p._roundaboutArm === 1);
    pedestrian.crossDwell = 0;
    const car = { id: 'committed', type: 'car', x: 65, y: 49.75, heading: 0, speed: 2,
      _roundaboutState: 'exiting', _roundaboutExitAngle: 0, _roundaboutEntryIndex: 0 };
    expect(RR.roundaboutPedestrianControl(car, [pedestrian]).required).toBe(false);
    for (let tick = 0; tick < 60; tick++) RR.updateRoundaboutTrafficVehicle(car, 1 / 60, [car], null, null, [pedestrian]);
    expect(car.x).toBeGreaterThan(67.5);
  });

  it.each([30, 60, 144])('keeps riders, cars, and all four crossings moving without contact at %i Hz', hz => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      const scenario = { id: 'roundabout', traffic: 'medium', speedLimit: 25 };
      const actors = RR.spawnRoundaboutTraffic(scenario).concat(RR.spawnCyclists(scenario), RR.spawnMotorcycles(scenario));
      const pedestrians = RR.spawnPedestrians(scenario);
      const transitions = new Map(actors.map(actor => [actor.id, 0]));
      const crossings = new Map(pedestrians.map(p => [p._roundaboutArm, 0]));
      let contacts = 0, islandEntries = 0;
      for (let tick = 0; tick < hz * 120; tick++) {
        for (const actor of actors) {
          const before = actor._roundaboutState;
          RR.updateRoundaboutTrafficVehicle(actor, 1 / hz, actors, null, null, pedestrians);
          if (before !== actor._roundaboutState) transitions.set(actor.id, transitions.get(actor.id) + 1);
          if (Math.hypot(actor.x - 48, actor.y - 48) < 5.5) islandEntries++;
        }
        for (const pedestrian of pedestrians) {
          const crossing = pedestrian.crossing;
          RR.updateRoundaboutPedestrian(pedestrian, 1 / hz, actors, null);
          if (crossing && !pedestrian.crossing) crossings.set(pedestrian._roundaboutArm, crossings.get(pedestrian._roundaboutArm) + 1);
        }
        for (let a = 0; a < actors.length; a++) {
          for (let b = a + 1; b < actors.length; b++) {
            if (RR.vehicleRectsOverlap(actors[a], RR.roundaboutActorSize(actors[a]),
              actors[b], RR.roundaboutActorSize(actors[b]))) contacts++;
          }
          for (const pedestrian of pedestrians) {
            if (RR.pointOverlapsVehicle(actors[a], RR.roundaboutActorSize(actors[a]), pedestrian, 0.28)) contacts++;
          }
        }
      }
      expect(contacts).toBe(0); expect(islandEntries).toBe(0);
      for (const count of transitions.values()) expect(count).toBeGreaterThan(8);
      for (const count of crossings.values()) expect(count).toBeGreaterThanOrEqual(2);
    } finally { random.mockRestore(); }
  });

  it('spawns distinct riders on the approach lanes instead of inside the island', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      const scenario = { id: 'roundabout', speedLimit: 25, traffic: 'medium' };
      const riders = RR.spawnCyclists(scenario).concat(RR.spawnMotorcycles(scenario));
      const map = RR.buildMap('roundabout');
      expect(riders).toHaveLength(3);
      for (const rider of riders) {
        expect(rider._roundaboutState).toBe('approach');
        expect([0, 3]).toContain(map[Math.floor(rider.y)][Math.floor(rider.x)]);
        expect(Math.hypot(rider.x - 48, rider.y - 48)).toBeGreaterThan(30);
      }
      for (let a = 0; a < riders.length; a++) for (let b = a + 1; b < riders.length; b++) {
        expect(Math.hypot(riders[a].x - riders[b].x, riders[a].y - riders[b].y)).toBeGreaterThan(8);
      }
    } finally { random.mockRestore(); }
  });

  it('gives each arm a crossing outside the circulating roadway', () => {
    const pedestrians = RR.spawnPedestrians({ id: 'roundabout' });
    expect(pedestrians).toHaveLength(4);
    expect(new Set(pedestrians.map(p => p._roundaboutArm)).size).toBe(4);
    for (const pedestrian of pedestrians) {
      const crossing = RR.roundaboutCrosswalkPose(pedestrian._roundaboutArm);
      expect(crossing.distance).toBe(18);
      expect(Math.hypot(pedestrian.x - 48, pedestrian.y - 48)).toBeGreaterThan(17);
      expect(pedestrian.waitingAtCrosswalk).toBe(true);
    }
  });

  it.each([30, 60, 144])('walks at a stable speed on all four marked crossings at %i Hz', hz => {
    for (const pedestrian of RR.spawnPedestrians({ id: 'roundabout' })) {
      pedestrian.crossDwell = 0;
      const start = { x: pedestrian.x, y: pedestrian.y };
      for (let tick = 0; tick < hz; tick++) RR.updateRoundaboutPedestrian(pedestrian, 1 / hz, [], null);
      expect(Math.hypot(pedestrian.x - start.x, pedestrian.y - start.y)).toBeCloseTo(1.2, 5);
      expect(Math.hypot(pedestrian.x - 48, pedestrian.y - 48)).toBeGreaterThan(17);
    }
  });

  it.each(['approach', 'exiting'])('yields before a pedestrian crossing and resumes on %s', state => {
    const pedestrian = RR.spawnPedestrians({ id: 'roundabout' }).find(p => p._roundaboutArm === 1);
    pedestrian.crossDwell = 0;
    const approach = RR.roundaboutApproach(1);
    const car = { ...approach, id: 'car', type: 'car',
      x: state === 'approach' ? 78 : 60, y: state === 'approach' ? 46.25 : 49.75,
      heading: state === 'approach' ? Math.PI : 0, speed: state === 'approach' ? 6 : 3.5,
      _roundaboutState: state, _roundaboutEntryIndex: 1, _roundaboutEntryAngle: 0,
      _roundaboutExitAngle: 0, _roundaboutExitChoices: 2 };
    let sawStop = false, sawCrossing = false, finishedCrossing = false;
    for (let tick = 0; tick < 60 * 30 && !finishedCrossing; tick++) {
      RR.updateRoundaboutTrafficVehicle(car, 1 / 60, [car], null, null, [pedestrian]);
      RR.updateRoundaboutPedestrian(pedestrian, 1 / 60, [car], null);
      sawCrossing ||= pedestrian.crossing;
      sawStop ||= car.speed < 0.1;
      finishedCrossing = sawCrossing && !pedestrian.crossing;
      expect(RR.pointOverlapsVehicle(car, RR.vehicleFootprint(car.type), pedestrian, 0.28)).toBe(false);
    }
    expect(sawStop).toBe(true);
    expect(finishedCrossing).toBe(true);
    for (let tick = 0; tick < 120; tick++) RR.updateRoundaboutTrafficVehicle(car, 1 / 60, [car], null, null, [pedestrian]);
    expect(car.speed).toBeGreaterThan(0.5);
  });
});
