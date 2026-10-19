import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});
const sample = () => ({ lat: 40.54, lon: -73.779, heading: 350, altitude: 3000,
  speed: 170, vsi: 0, onGround: false, stalling: false });
const record = id => FS.createFlightChallenge(id, sample());

describe('challenge airport guidance', () => {
  it.each([['first_flight', 'kpwm'], ['mountain_flying', 'kden']])('waits for climb and steady flight before routing %s home', (id, airport) => {
    const challenge = record(id);
    expect(FS.getFlightChallengeDestination(challenge)).toBeNull();
    challenge.objectives.climb = true;
    expect(FS.getFlightChallengeDestination(challenge)).toBeNull();
    challenge.objectives.steady = true;
    expect(FS.getFlightChallengeDestination(challenge).id).toBe(airport);
    challenge.objectives.landing = true;
    expect(FS.getFlightChallengeDestination(challenge)).toBeNull();
  });

  it('targets the required airport even while another airport is nearer', () => {
    const portland = FS.WAYPOINTS.find(w => w.id === 'kpwm');
    const nav = FS.getFlightChallengeNavigation(record('cross_country'), { ...sample(), ...portland });
    expect(nav.airport.id).toBe('kjfk');
    expect(nav.distanceNm).toBeGreaterThan(100);
    expect(nav.landingPhase).toBe(false);
    const challenge = record('cross_country');
    challenge.objectives.arrival = true;
    expect(FS.getFlightChallengeNavigation(challenge, sample()).landingPhase).toBe(false);
    challenge.objectives.heading = true;
    expect(FS.getFlightChallengeNavigation(challenge, sample()).landingPhase).toBe(true);
  });

  it('uses only the selected valid tour approach and does not invent routes for other activities', () => {
    expect(FS.getFlightChallengeDestination(record('world_tour'), 'kden').id).toBe('kden');
    expect(FS.getFlightChallengeDestination(record('world_tour'), 'unknown')).toBeNull();
    const continuedTour = record('world_tour');
    continuedTour.arrivals = ['kden'];
    expect(FS.getFlightChallengeDestination(continuedTour, 'kden').id).toBe('kden');
    continuedTour.legArrivalId = 'kden';
    expect(FS.getFlightChallengeDestination(continuedTour, 'kden')).toBeNull();
    expect(FS.getFlightChallengeDestination(continuedTour, 'kjfk').id).toBe('kjfk');
    expect(FS.getFlightChallengeDestination(record('energy_management'), 'kden')).toBeNull();
    expect(FS.getFlightChallengeDestination(null, 'kden')).toBeNull();
  });

  it.each([[350, 'right', 10], [10, 'left', -10], [360, 'aligned', 0], [-350, 'left', -10], [180, 'left', -180]])('uses the short turn across north from heading %s', (heading, turn, error) => {
    const nav = FS.getFlightChallengeNavigation(record('cross_country'), { ...sample(), heading });
    expect(nav.turn).toBe(turn);
    expect(nav.headingErrorDeg).toBeCloseTo(error, 6);
    expect(nav.runway.headingDeg).toBeGreaterThanOrEqual(0);
    expect(nav.runway.designator).toBeTruthy();
  });

  it.each([{ onGround: true }, { stalling: true }, { lowAirspeed: true }, { lat: 40.639 }])('suppresses airport-homing turns on the ground, in a stall, or close to the runway: %j', patch => {
    const nav = FS.getFlightChallengeNavigation(record('cross_country'), { ...sample(), ...patch });
    expect(nav.turn).toBeNull();
    expect(nav.airport.code).toBe('JFK');
  });

  it('rejects corrupt position or heading without displaying NaN guidance', () => {
    for (const key of ['lat', 'lon', 'heading']) for (const value of [NaN, Infinity, undefined]) {
      expect(FS.getFlightChallengeNavigation(record('cross_country'), { ...sample(), [key]: value })).toBeNull();
    }
    for (const invalid of [{ lat: 91 }, { lon: -181 }]) {
      expect(FS.getFlightChallengeNavigation(record('cross_country'), { ...sample(), ...invalid })).toBeNull();
    }
  });
});
