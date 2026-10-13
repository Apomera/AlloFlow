import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
let snapshot;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  snapshot = { ...FS.Physics };
});
afterEach(() => Object.assign(FS.Physics, snapshot));

const state = patch => ({
  speed: 100, altitude: 1000, vsi: -5, heading: 270,
  lat: 43.646, lon: -70.309, fieldElev: 5431, onGround: false,
  stalling: false, lowAirspeed: false, ...patch,
});
const controls = { throttle: 0, pitch: 0, bank: 0, flaps: 0, brake: 0 };

describe('local ground datum', () => {
  it('keeps the two-mile airport training surface at the actual field elevation', () => {
    for (const airport of FS.WAYPOINTS) {
      for (const distance of [0, 0.5, 1, 2]) {
        expect(FS.airportTrainingGround(9000, airport.alt, distance)).toBe(airport.alt);
      }
    }
  });

  it('joins the airport surface and outer terrain continuously', () => {
    expect(FS.airportTrainingGround(1000, 77, 2.0001)).toBeCloseTo(77, 4);
    expect(FS.airportTrainingGround(1000, 77, 4)).toBeCloseTo(538.5, 4);
    expect(FS.airportTrainingGround(1000, 77, 5.9999)).toBeCloseTo(1000, 4);
    expect(FS.airportTrainingGround(1000, 77, 6)).toBe(1000);
    expect(FS.airportTrainingGround(1000, null, Infinity)).toBe(1000);
  });

  it('allows a flight from each departure to contact every destination elevation', () => {
    FS.Physics.IS_HELICOPTER = false;
    FS.Physics.IS_DRONE = false;
    for (const departure of FS.WAYPOINTS) {
      for (const destination of FS.WAYPOINTS) {
        const before = state({
          altitude: destination.alt + 2, fieldElev: departure.alt,
          lat: destination.lat, lon: destination.lon,
        });
        const localInput = { ...before, fieldElev: FS.airportTrainingGround(9000, destination.alt, 0) };
        const stepped = FS.Physics.step(localInput, 1, controls);
        const contact = FS.reconcileGroundContact(stepped, destination.alt);
        expect(contact.altitude).toBe(destination.alt);
        expect(contact.onGround).toBe(true);
        expect(contact.fieldElev).toBe(destination.alt);
        expect(before.fieldElev).toBe(departure.alt);
      }
    }
  });

  it('does not treat departure elevation as a collision floor over lower ground', () => {
    const original = state({ altitude: 300, fieldElev: 5431 });
    const next = FS.reconcileGroundContact(original, 77);
    expect(next).toMatchObject({ altitude: 300, fieldElev: 77, onGround: false, vsi: -5 });
    expect(original.fieldElev).toBe(5431);
  });

  it('resolves movement into higher terrain and clears airborne warnings at contact', () => {
    const next = FS.reconcileGroundContact(state({ altitude: 600, stalling: true, lowAirspeed: true }), 650);
    expect(next).toMatchObject({ altitude: 650, fieldElev: 650, onGround: true, vsi: 0, stalling: false, lowAirspeed: false });
  });

  it('uses destination ground in helicopter physics without changing standalone stepping', () => {
    const aircraft = FS.AIRCRAFT.find(item => item.isHelicopter);
    Object.assign(FS.Physics, { IS_HELICOPTER: true, IS_DRONE: false, WEIGHT: aircraft.weight, MAX_THRUST: aircraft.maxThrust });
    const stepped = FS.Physics.step(state({ altitude: 79, fieldElev: 77 }), 1, controls);
    const next = FS.reconcileGroundContact(stepped, 77);
    expect(next).toMatchObject({ altitude: 77, fieldElev: 77, onGround: true });
    expect(next.vsi).toBeGreaterThanOrEqual(0);
  });

  it('moves the drone practice ceiling with the terrain under its new position', () => {
    const aircraft = FS.AIRCRAFT.find(item => item.isDrone);
    Object.assign(FS.Physics, { IS_HELICOPTER: false, IS_DRONE: true, WEIGHT: aircraft.weight, MAX_THRUST: aircraft.maxThrust, AGL_CEILING: 400 });
    const stepped = FS.Physics.step(state({ altitude: 1300, vsi: 0, fieldElev: 1000 }), 1 / 30, { ...controls, throttle: 0.5 });
    const downhill = FS.reconcileGroundContact(stepped, 800, 400);
    expect(downhill).toMatchObject({ altitude: 1200, fieldElev: 800, onGround: false, hitCeiling: true });
    expect(downhill.altitude - downhill.fieldElev).toBe(400);
    expect(downhill.vsi).toBeLessThanOrEqual(0);
    const uphill = FS.reconcileGroundContact(stepped, 1100, 400);
    expect(uphill.altitude - uphill.fieldElev).toBeLessThan(400);
    expect(uphill.hitCeiling).toBe(false);
  });

  it('locates the airport from the touchdown coordinates rather than a later taxi position', () => {
    const portland = FS.WAYPOINTS.find(item => item.id === 'kpwm');
    const denver = FS.WAYPOINTS.find(item => item.id === 'kden');
    const touchdown = FS.nearestFlightAirport(portland.lat, portland.lon);
    const later = FS.nearestFlightAirport(denver.lat, denver.lon);
    expect(touchdown.airport.id).toBe('kpwm');
    expect(touchdown.distanceNm).toBe(0);
    expect(later.airport.id).toBe('kden');
    expect(FS.nearestFlightAirport(NaN, 0).airport).toBe(null);
  });
});

describe('takeoff coaching', () => {
  it('does not announce a fabricated V1 decision speed or apply fixed-wing cues to rotorcraft', () => {
    const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
    const coaching = source.slice(source.indexOf('// ── Takeoff coaching callouts'), source.indexOf('// ── Flare assist indicator'));
    expect(coaching).not.toContain('committed to takeoff');
    expect(coaching).not.toContain('announce_v1');
    expect(coaching).toContain('!heliMode && !droneMode && Physics.MAX_THRUST > 0');
    expect(coaching).toContain('Math.round(stallTasKts * 1.1)');
    expect(coaching).toContain('AIRSPEED BUILDING');
  });
});
