import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
new vm.Script(fs.readFileSync('dev-tools/skyschool-city-start.js', 'utf8')).runInContext(context);
const getFlightCityStart = context.getFlightCityStart;
const trainer = { ceiling: 14000, maxSpeed: 163, maxThrust: 400, wingArea: 174, weight: 2550,
  cl0: 0.3, clPerAoa: 0.1, cd0: 0.028, cdK: 0.042 };
const glider = { ceiling: 25000, maxSpeed: 151, maxThrust: 0, wingArea: 182, weight: 1100,
  cl0: 0.45, clPerAoa: 0.12, cd0: 0.012, cdK: 0.035, engine: 'none' };
const helicopter = { isHelicopter: true, ceiling: 10500, maxSpeed: 174, maxThrust: 13000, weight: 11000 };
const drone = { isDrone: true, ceiling: 400, maxSpeed: 41, maxThrust: 4, weight: 2 };
const target = { lat: 43.66, lon: -70.26 };
const distanceNm = (a, b) => {
  const toRad = Math.PI / 180, dLat = (a.lat - b.lat) * toRad, dLon = (a.lon - b.lon) * toRad;
  return 3440.065 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2));
};
const density = altitude => 0.002377 * (1 - 0.0000068756 * altitude) ** 4.2561;

describe('safe city flight starts', () => {
  it('places a trainer south of the city above both launch and approach terrain', () => {
    const probes = [];
    const result = getFlightCityStart(target, trainer, (lat, lon) => {
      probes.push({ lat, lon });
      return lat > target.lat - 0.006 ? 900 : 300;
    });
    expect(result).not.toBeNull();
    expect(result.heading).toBe(0);
    expect(result.lat).toBeLessThan(target.lat);
    expect(result.lon).toBe(target.lon);
    expect(distanceNm(result, target)).toBeCloseTo(2, 8);
    expect(result.altitude).toBe(2900);
    expect(result.fieldElev).toBe(300);
    expect(probes).toHaveLength(15);
    expect(probes.some(p => p.lat === target.lat && p.lon === target.lon)).toBe(true);
  });

  it('uses aircraft-specific TAS and trim that match the actual lift and thrust equations', () => {
    const fleet = [trainer,
      { ceiling: 41000, maxSpeed: 460, maxThrust: 54000, wingArea: 1341, weight: 144500, cl0: 0.35, clPerAoa: 0.11, cd0: 0.022, cdK: 0.038 },
      { ceiling: 58000, maxSpeed: 800, maxThrust: 28600, wingArea: 300, weight: 19700, cl0: 0.2, clPerAoa: 0.08, cd0: 0.015, cdK: 0.05 },
      { ceiling: 85000, maxSpeed: 1900, maxThrust: 68000, wingArea: 1800, weight: 152000, cl0: 0.15, clPerAoa: 0.06, cd0: 0.009, cdK: 0.06 }];
    for (const aircraft of fleet) {
      const result = getFlightCityStart(target, aircraft, () => 5300);
      expect(result).not.toBeNull();
      const rho = density(result.altitude), speed = result.speedKts / 0.5924838;
      const vs = Math.sqrt(2 * aircraft.weight / (rho * aircraft.wingArea * (aircraft.cl0 + 15 * aircraft.clPerAoa)));
      expect(speed).toBeGreaterThanOrEqual(vs * 1.49);
      expect(result.speedKts).toBeLessThan(aircraft.maxSpeed);
      const cl = aircraft.cl0 + aircraft.clPerAoa * result.pitch;
      const qS = 0.5 * rho * speed ** 2 * aircraft.wingArea;
      const thrust = aircraft.maxThrust * result.throttle, pitchRad = result.pitch * Math.PI / 180;
      const drag = qS * (aircraft.cd0 + aircraft.cdK * cl ** 2);
      expect(qS * cl + thrust * Math.sin(pitchRad)).toBeCloseTo(aircraft.weight, 2);
      expect(thrust * Math.cos(pitchRad)).toBeCloseTo(drag, 4);
      expect(Math.abs(result.pitch)).toBeLessThan(10);
      expect(result.throttle).toBeGreaterThan(0); expect(result.throttle).toBeLessThanOrEqual(0.95);
    }
    expect(getFlightCityStart(target, trainer, () => 5300).speedKts)
      .toBeGreaterThan(getFlightCityStart(target, trainer, () => 0).speedKts);
  });

  it('gives gliders release altitude and flying speed without engine thrust', () => {
    const result = getFlightCityStart(target, glider, () => 400);
    expect(result.altitude).toBe(3400);
    expect(result.speedKts).toBeGreaterThanOrEqual(55);
    expect(result.throttle).toBe(0);
    expect(distanceNm(result, target)).toBeCloseTo(2, 8);
  });

  it('starts rotorcraft in a balanced hover at their own clearance and approach distance', () => {
    for (const [aircraft, clearance, distance] of [[helicopter, 700, 0.3], [drone, 150, 0.15]]) {
      const result = getFlightCityStart(target, aircraft, () => 8000);
      expect(result).not.toBeNull(); expect(result.altitude).toBe(8000 + clearance);
      expect(result.speedKts).toBe(0); expect(result.pitch).toBe(0);
      expect(result.throttle * aircraft.maxThrust).toBeCloseTo(aircraft.weight, 8);
      expect(distanceNm(result, target)).toBeCloseTo(distance, 8);
    }
  });

  it('keeps drone limits relative to terrain and refuses a steep corridor the clamp cannot clear', () => {
    expect(getFlightCityStart(target, drone, () => 12000).altitude).toBe(12150);
    expect(getFlightCityStart(target, drone, lat => lat === target.lat ? 400 : 0)).toBeNull();
    expect(getFlightCityStart(target, { ...drone, ceiling: 100 }, () => 0)).toBeNull();
  });

  it('refuses unsuitable ceilings, inadequate speed or thrust, and incomplete airframe data', () => {
    expect(getFlightCityStart(target, trainer, () => 12500)).toBeNull();
    expect(getFlightCityStart(target, helicopter, () => 10000)).toBeNull();
    expect(getFlightCityStart(target, { ...trainer, maxSpeed: 30 }, () => 0)).toBeNull();
    expect(getFlightCityStart(target, { ...trainer, maxThrust: 1 }, () => 0)).toBeNull();
    expect(getFlightCityStart(target, { ...helicopter, maxThrust: 9000 }, () => 0)).toBeNull();
    expect(getFlightCityStart(target, { ...trainer, clPerAoa: undefined }, () => 0)).toBeNull();
  });

  it('preserves below-sea-level terrain and canonical longitude near the dateline', () => {
    const probes = [];
    const result = getFlightCityStart({ lat: 84.99, lon: 180 }, drone, (lat, lon) => {
      probes.push({ lat, lon }); return -1446;
    });
    expect(result.altitude).toBe(-1296); expect(result.lon).toBe(-180);
    for (const probe of probes) {
      expect(Math.abs(probe.lat)).toBeLessThanOrEqual(85);
      expect(probe.lon).toBeGreaterThanOrEqual(-180); expect(probe.lon).toBeLessThanOrEqual(180);
    }
    expect(getFlightCityStart({ lat: 85.01, lon: 0 }, trainer, () => 0)).toBeNull();
    expect(getFlightCityStart({ lat: -85, lon: 0 }, trainer, () => 0)).toBeNull();
  });

  it('fails closed on missing, throwing, or nonfinite terrain samples', () => {
    for (const callback of [undefined, () => NaN, () => Infinity, () => null, () => { throw new Error('missing'); }]) {
      expect(getFlightCityStart(target, trainer, callback)).toBeNull();
    }
    for (const bad of [null, { lat: NaN, lon: 0 }, { lat: 0, lon: 181 }]) {
      expect(getFlightCityStart(bad, trainer, () => 0)).toBeNull();
    }
    expect(getFlightCityStart(target, null, () => 0)).toBeNull();
  });
});
