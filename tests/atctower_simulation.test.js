import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The browser tool keeps its model private inside its registration closure.
// Evaluate that source in isolation so these regressions exercise the shipped
// physics without needing a canvas, React, or copied model implementations.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const modelSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const model = new Function(modelSource + '\nreturn { advanceAircraft, aircraftCanLand, aircraftSeparation, aircraftDistanceNm, aircraftEtaMinutes, runwayGeometry, runwayLabel, runwayAvailable, reserveRunway };')();
const airportSource = source.slice(source.indexOf('  var AIRPORTS ='), source.indexOf('  // ── AIRCRAFT TYPES ──'));
const airports = new Function(airportSource + '\nreturn AIRPORTS;')();
const runway = { hdg: 270, x: 150, y: 200, len: 40 };
const type = { speed: 140, cat: 'Medium' };

function aircraft(extra = {}) {
  return { x: 330, y: 200, heading: 270, speed: 140, altitude: 8000, fuel: 120, type, state: 'inbound', targetHeading: null, targetSpeed: null, targetAltitude: null, assignedRunway: null, ...extra };
}

function simulate(ac, seconds, fps = 60) {
  for (let i = 0; i < Math.round(seconds * fps) && !ac.touchdownReady; i++) model.advanceAircraft(ac, 1 / fps);
  return ac;
}

describe('ATC Tower simulation', () => {
  it('honors a requested speed on final approach', () => {
    const ac = aircraft({ x: 203, y: 200, altitude: 3300, state: 'approach', approachStage: 'final', assignedRunway: runway, targetSpeed: 180 });
    model.advanceAircraft(ac, 0.2);
    expect(ac.speed).toBeCloseTo(180, 8);
    expect(ac.targetSpeed).toBeNull();
  });
  it('converts knots and accelerated fuel minutes on a fixed world grid', () => {
    // 140 knots × 120 flight seconds = 4.6667 nm = 14 world units.
    const ac = simulate(aircraft(), 1);
    expect(ac.x).toBeCloseTo(316, 8);
    expect(ac.y).toBeCloseTo(200, 8);
    expect(ac.fuel).toBeCloseTo(118, 8);
  });

  it('preserves vector, speed, and altitude behavior at 30, 60, and 144 FPS', () => {
    const flights = [30, 60, 144].map(fps => simulate(aircraft({ heading: 30, targetHeading: 300, targetSpeed: 110, targetAltitude: 5000 }), 3, fps));
    for (const ac of flights.slice(1)) {
      expect(Math.hypot(ac.x - flights[0].x, ac.y - flights[0].y)).toBeLessThan(0.3);
      expect(ac.altitude).toBeCloseTo(flights[0].altitude, 6);
      expect(ac.speed).toBeCloseTo(flights[0].speed, 6);
      expect(ac.heading).toBeCloseTo(flights[0].heading, 6);
    }
  });

  it('climbs and descends progressively, stopping at the assigned altitude', () => {
    const descent = aircraft({ targetAltitude: 5000 });
    model.advanceAircraft(descent, 0.1);
    expect(descent.altitude).toBeCloseTo(7760, 6);
    expect(descent.altitude).toBeGreaterThan(5000);
    simulate(descent, 3);
    expect(descent.altitude).toBe(5000);

    const climb = aircraft({ targetAltitude: 9000 });
    model.advanceAircraft(climb, 0.1);
    expect(climb.altitude).toBeCloseTo(8240, 6);
    simulate(climb, 3);
    expect(climb.altitude).toBe(9000);
  });

  it('applies the horizontal and vertical separation boundaries in nautical miles', () => {
    const first = aircraft({ x: 0, y: 0, altitude: 5000 });
    expect(model.aircraftSeparation(first, aircraft({ x: 8.99, y: 0, altitude: 5999 })).conflict).toBe(true);
    expect(model.aircraftSeparation(first, aircraft({ x: 9, y: 0, altitude: 5000 })).conflict).toBe(false);
    expect(model.aircraftSeparation(first, aircraft({ x: 1, y: 0, altitude: 6000 })).conflict).toBe(false);
    expect(model.aircraftSeparation(first, aircraft({ x: 17, y: 0, altitude: 5000, type: { speed: 145, cat: 'Heavy' } })).conflict).toBe(true);
  });

  it('uses the approach threshold for distance and speed-derived arrival estimates', () => {
    expect(model.runwayGeometry(runway).threshold).toEqual({ x: 170, y: 200 });
    expect(model.aircraftDistanceNm(aircraft({ x: 200 }), runway)).toBe(10);
    expect(model.aircraftEtaMinutes(aircraft({ x: 200, speed: 120 }), runway)).toBe(5);
    expect(model.aircraftEtaMinutes(aircraft({ state: 'holding' }), runway)).toBeNull();
    expect(model.aircraftEtaMinutes(aircraft({ state: 'goAround' }), runway)).toBeNull();
  });

  it('distinguishes parallel runways and labels north as runway 36', () => {
    const parallel = { runways: [{ ...runway, y: 170 }, { ...runway, y: 230 }] };
    expect(model.runwayLabel(parallel.runways[0], parallel)).toBe('27R');
    expect(model.runwayLabel(parallel.runways[1], parallel)).toBe('27L');
    expect(model.runwayLabel({ ...runway, hdg: 0 })).toBe('36');
  });

  it('rejects touchdown at cruise altitude, on the wrong course, or before final capture', () => {
    const final = { x: 170, state: 'approach', assignedRunway: runway, approachStage: 'final' };
    expect(model.aircraftCanLand(aircraft({ ...final, altitude: 8000 }), runway)).toBe(false);
    expect(model.aircraftCanLand(aircraft({ ...final, heading: 90, altitude: 0 }), runway)).toBe(false);
    expect(model.aircraftCanLand(aircraft({ ...final, approachStage: 'entry', altitude: 0 }), runway)).toBe(false);
    expect(model.aircraftCanLand(aircraft({ ...final, altitude: 0 }), runway)).toBe(true);
  });

  it.each(airports.map(airport => [airport.id, airport]))('captures every %s runway from all corners at light and jet speeds', (_id, airport) => {
    const corners = [{ x: 10, y: 10, heading: 135 }, { x: 390, y: 10, heading: 225 }, { x: 10, y: 390, heading: 45 }, { x: 390, y: 390, heading: 315 }];
    for (const rwy of airport.runways) for (const speed of [90, 140, 145]) for (const start of corners) {
      const ac = simulate(aircraft({ ...start, speed, type: { speed, cat: 'Medium' }, state: 'approach', assignedRunway: rwy, approachStage: 'entry' }), 60);
      const context = airport.id + ', heading ' + rwy.hdg + ', ' + speed + ' kt, start ' + JSON.stringify(start);
      expect(ac.touchdownReady, context).toBe(true);
      expect(model.aircraftCanLand(ac, rwy), context).toBe(true);
      expect(ac.altitude, context).toBeLessThanOrEqual(350);
    }
  });

  it('flies a bounded hold while consuming fuel without going negative', () => {
    const ac = aircraft({ x: 210, y: 200, heading: 0, fuel: 45, state: 'holding' });
    for (let i = 0; i < 30 * 60; i++) {
      model.advanceAircraft(ac, 1 / 60);
      expect(ac.x).toBeGreaterThanOrEqual(0);
      expect(ac.x).toBeLessThanOrEqual(400);
      expect(ac.y).toBeGreaterThanOrEqual(0);
      expect(ac.y).toBeLessThanOrEqual(400);
    }
    expect(Math.hypot(ac.x - ac.holdCenter.x, ac.y - ac.holdCenter.y)).toBeLessThan(30);
    expect(ac.fuel).toBe(0);
  });

  it('protects the shared crossing-runway intersection until occupancy expires', () => {
    const airport = airports.find(candidate => candidate.id === 'crossing');
    expect(airport.runways[0].x).toBe(airport.runways[1].x);
    expect(airport.runways[0].y).toBe(airport.runways[1].y);
    const occupied = {};
    model.reserveRunway(airport.runways[0], airport, occupied, 10);
    expect(model.runwayAvailable(airport.runways[1], airport, occupied, 11.99)).toBe(false);
    expect(model.runwayAvailable(airport.runways[1], airport, occupied, 12)).toBe(true);
  });

  it('reserves one parallel runway while leaving the other available', () => {
    const airport = airports.find(candidate => candidate.id === 'parallel');
    const occupied = {};
    model.reserveRunway(airport.runways[0], airport, occupied, 10);
    expect(model.runwayAvailable(airport.runways[0], airport, occupied, 11)).toBe(false);
    expect(model.runwayAvailable(airport.runways[1], airport, occupied, 11)).toBe(true);
  });

  it('freezes flight, altitude, speed, and fuel when elapsed time is zero', () => {
    const ac = aircraft({ targetHeading: 90, targetSpeed: 100, targetAltitude: 3000 });
    const before = structuredClone(ac);
    model.advanceAircraft(ac, 0);
    expect(ac).toEqual(before);
  });
});
