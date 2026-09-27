import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/astronomy-lunar-horizons.json'), 'utf8'));
const samples = fixture.samples.flatMap(site => site.rows.map(row => ({ ...row, site: site.site, lat: site.lat, lon: site.lon })));
let sky;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_astronomy.js'), 'utf8'))();
  sky = window.__alloAstroPure;
});

function at(sample) {
  const date = new Date(sample.utc);
  const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
  const UT = date.getUTCHours() + date.getUTCMinutes() / 60;
  return { d: sky.astroDayNumber(Y, M, D, UT), snapshot: sky.skyNow(Y, M, D, UT, sample.lat, sample.lon) };
}

describe('Moon position at the observer', () => {
  it.each(samples)('matches NASA/JPL Horizons airless Moon position at $site on $utc', sample => {
    const { d, snapshot } = at(sample);
    // This independent fixture is more complete than our low-precision model.
    // Six arcminutes permits its omitted terms while rejecting lunar parallax
    // errors (~one degree at the horizon). Compare directions, since azimuth
    // alone becomes ill-conditioned near the zenith.
    const error = sky.angularSep(snapshot.moon.az, snapshot.moon.alt, sample.azDeg, sample.altDeg);
    expect(error).toBeLessThan(0.1);
    const eq = sky.moonTopocentricRaDec(d, snapshot.lst, sample.lat);
    expect(sky.angularSep(eq.ra, eq.dec, sample.raDeg, sample.decDeg)).toBeLessThan(0.1);
    // The two largest distance perturbations matter to the parallax correction.
    expect(Math.abs(eq.dist * 6378.137 - sample.distanceKm)).toBeLessThan(1000);
  });

  it('removes the roughly one-degree displacement in both near-horizon reference cases', () => {
    const nearHorizon = samples.filter(sample => sample.altDeg > 0 && sample.altDeg < 1);
    expect(nearHorizon).toHaveLength(2);
    for (const sample of nearHorizon) {
      const { d, snapshot } = at(sample);
      const geocentric = sky.moonRaDec(d);
      const oldPosition = sky.equToHorizon(geocentric.ra, geocentric.dec, snapshot.lst, sample.lat);
      expect(oldPosition.alt - sample.altDeg).toBeGreaterThan(0.85);
      expect(Math.abs(snapshot.moon.alt - sample.altDeg)).toBeLessThan(0.06);
    }
  });

  it('has the expected geometric correction at the horizon and none at the zenith', () => {
    const horizon = sky.topocentricRaDec({ ra: 90, dec: 0, dist: 60 }, 0, 0);
    const hz = sky.equToHorizon(horizon.ra, horizon.dec, 0, 0);
    expect(hz.alt).toBeCloseTo(-Math.atan(1 / 60) * 180 / Math.PI, 10);
    expect(hz.az).toBeCloseTo(90, 10);
    expect(horizon.dist).toBeCloseTo(Math.sqrt(3601), 10);
    const zenith = sky.topocentricRaDec({ ra: 0, dec: 0, dist: 60 }, 0, 0);
    expect(zenith.ra).toBe(0);
    expect(zenith.dec).toBe(0);
    expect(zenith.dist).toBe(59);
  });

  it('stays finite across both poles, the equator, and the right-ascension seam', () => {
    for (const latitude of [-90, -89.9, 0, 89.9, 90]) {
      for (const ra of [0, 0.001, 90, 180, 359.999]) {
        const eq = sky.topocentricRaDec({ ra, dec: 20, dist: 60 }, 0, latitude);
        expect(Object.values(eq).every(Number.isFinite)).toBe(true);
        expect(eq.ra).toBeGreaterThanOrEqual(0);
        expect(eq.ra).toBeLessThan(360);
        expect(Math.abs(eq.dec)).toBeLessThan(90);
        expect(eq.dist).toBeGreaterThanOrEqual(59);
        expect(eq.dist).toBeLessThanOrEqual(61);
      }
    }
  });

  it('uses the corrected center for both the 3D sky and saved Moon visibility tracks', () => {
    for (const sample of samples) {
      const utcMs = Date.parse(sample.utc);
      const bodies = sky.observatoryBodies(utcMs, sample.lat, sample.lon);
      const track = sky.observatoryPositionAt({ kind: 'moon', id: 'moon' }, sample.lat, sample.lon)(utcMs);
      expect(track.alt).toBeCloseTo(bodies.moon.alt, 10);
      expect(track.az).toBeCloseTo(bodies.moon.az, 10);
      expect(bodies.moon.trueAlt).toBeCloseTo(at(sample).snapshot.moon.alt, 10);
    }
  });
});

describe('Reference stars share the catalog coordinate epoch', () => {
  it('keeps reference-star sky positions aligned with the precessed fallback catalog', () => {
    const catalog = sky.fallbackCatalog();
    for (const utcMs of [Date.UTC(1900, 0, 1, 2), Date.UTC(2026, 8, 27, 4), Date.UTC(2099, 0, 1, 16)]) {
      const bodies = sky.observatoryBodies(utcMs, 43.66, -70.26);
      const horizon = sky.catalogHorizon(catalog, bodies.lst, 43.66, bodies.d, 1);
      bodies.stars.forEach((star, i) => {
        expect(star.alt).toBeCloseTo(horizon.alts[i], 4);
        expect(star.az).toBeCloseTo(horizon.azs[i], 4);
      });
    }
  });

  it('uses the bundled HYG J2000 Polaris coordinates in the built-in reference list', () => {
    const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'stem_lab/assets/astronomy/hyg-v41-naked-eye.json'), 'utf8'));
    const polaris = catalog.stars.find(row => row[0] === 11767);
    const reference = sky.BRIGHT_STARS.find(star => star.name === 'Polaris');
    expect(reference.ra * 15).toBeCloseTo(polaris[1], 8);
    expect(reference.dec).toBeCloseTo(polaris[2], 8);
  });
});
