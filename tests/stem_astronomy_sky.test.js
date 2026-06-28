// Pure positional-astronomy tests for the astronomy tool's sky engine (the "Sky Map"
// enhancement). The SVG dome is Canvas-smoke-only, but the ephemerides underneath are
// checkable against real almanac facts: the day-number epoch, the Sun's ±23.44°
// declination (hit at the solstices), Polaris sitting at altitude ≈ your latitude,
// circumpolar vs never-rising stars, the Moon cycling 0→full illumination, and the
// hard orbital ceiling on how far Venus/Mercury can ever wander from the Sun.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let A;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; }, getRegisteredTools: function () { return []; } };
  delete window.__alloAstroPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_astronomy.js'), 'utf8'))();
  A = window.__alloAstroPure;
  if (!A) throw new Error('astronomy sky hook not exposed (window.__alloAstroPure)');
});

describe('Astronomy — sky engine (real ephemerides, checked against almanac facts)', () => {
  it('day-number epoch: 2000 Jan 1.0 UT is day 1 (2000.0 = day 0)', () => {
    expect(A.astroDayNumber(2000, 1, 1, 0)).toBe(1);
    expect(A.astroDayNumber(1999, 12, 31, 0)).toBe(0);
  });

  it('Greenwich sidereal time matches the known J2000 GMST (pins the UT rate)', () => {
    // GMST(2000-01-01 12h UT = J2000.0) ≈ 18.697 h; (2000-01-01 0h UT) ≈ 6.664 h
    expect(Math.abs(A.siderealTime(2000, 1, 1, 12, 0) - 18.697)).toBeLessThan(0.02);
    expect(Math.abs(A.siderealTime(2000, 1, 1, 0, 0) - 6.664)).toBeLessThan(0.02);
  });

  it('the Sun’s declination stays within ±23.44° and reaches it at the solstices', () => {
    const decAt = (Y, M, D) => A.sunRaDec(A.astroDayNumber(Y, M, D, 12)).dec;
    expect(decAt(2000, 6, 21)).toBeGreaterThan(23.0);   // June solstice ≈ +23.44°
    expect(decAt(2000, 6, 21)).toBeLessThan(23.5);
    expect(decAt(2000, 12, 21)).toBeLessThan(-23.0);    // December solstice ≈ −23.44°
    expect(decAt(2000, 3, 20)).toBeCloseTo(0, 0);       // March equinox ≈ 0° (within ~1°)
    for (let day = 0; day < 366; day += 5) {            // never exceeds the obliquity all year
      expect(Math.abs(A.sunRaDec(day).dec)).toBeLessThanOrEqual(23.45);
    }
  });

  it('Polaris sits at altitude ≈ your latitude, all night (the navigator’s fact)', () => {
    const polaris = A.BRIGHT_STARS.find((s) => s.name === 'Polaris');
    [0, 6, 12, 18].forEach((lst) => {
      const h = A.equToHorizon(polaris.ra * 15, polaris.dec, lst, 45);
      expect(h.alt).toBeGreaterThan(44);                // within ~0.74° of latitude (Polaris isn’t exactly at the pole)
      expect(h.alt).toBeLessThan(46);
    });
  });

  it('circumpolar vs never-rising depends on declination and latitude', () => {
    const polaris = A.BRIGHT_STARS.find((s) => s.name === 'Polaris');
    const canopus = A.BRIGHT_STARS.find((s) => s.name === 'Canopus'); // dec ≈ −52.7°
    [0, 5, 10, 15, 20].forEach((lst) => {
      expect(A.equToHorizon(polaris.ra * 15, polaris.dec, lst, 45).alt).toBeGreaterThan(0);  // circumpolar from 45°N
      expect(A.equToHorizon(canopus.ra * 15, canopus.dec, lst, 45).alt).toBeLessThan(0);     // never rises from 45°N
    });
  });

  it('the Moon cycles from new (~0%) to full (~100%) over a synodic month; illum always in [0,1]', () => {
    let min = 1, max = 0;
    for (let day = 100; day < 130; day += 0.5) {
      const p = A.moonPhaseAt(day);
      expect(p.illum).toBeGreaterThanOrEqual(0);
      expect(p.illum).toBeLessThanOrEqual(1);
      if (p.illum < min) min = p.illum;
      if (p.illum > max) max = p.illum;
    }
    expect(min).toBeLessThan(0.05);                     // reaches new
    expect(max).toBeGreaterThan(0.95);                  // reaches full
  });

  it('the Moon stays near the ecliptic: |dec| never exceeds ~28.6° (23.44 + 5.14)', () => {
    for (let day = 0; day < 60; day += 1) {
      expect(Math.abs(A.moonRaDec(day).dec)).toBeLessThan(29);
    }
  });

  it('Venus and Mercury can NEVER stray far from the Sun (the inferior-planet ceiling)', () => {
    let maxVenus = 0, maxMercury = 0;
    for (let day = 0; day < 3650; day += 7) {           // a decade, weekly
      const sun = A.sunRaDec(day);
      const v = A.planetRaDec('venus', day), me = A.planetRaDec('mercury', day);
      maxVenus = Math.max(maxVenus, A.angularSep(v.ra, v.dec, sun.ra, sun.dec));
      maxMercury = Math.max(maxMercury, A.angularSep(me.ra, me.dec, sun.ra, sun.dec));
    }
    expect(maxVenus).toBeGreaterThan(40);               // it does get far enough to be the bright "evening/morning star"
    expect(maxVenus).toBeLessThan(48.5);                // but never past its ~47° max elongation
    expect(maxMercury).toBeLessThan(28.5);              // Mercury hugs the Sun even tighter (~28°)
  });

  it('skyNow assembles a full, sane sky for a place and instant', () => {
    const sky = A.skyNow(2000, 6, 21, 4, 43.66, -70.26);   // ~midnight local in Portland, Maine
    expect(sky.lst).toBeGreaterThanOrEqual(0);
    expect(sky.lst).toBeLessThan(24);
    expect(sky.planets.length).toBe(5);
    expect(sky.stars.length).toBe(A.BRIGHT_STARS.length);
    [sky.sun, sky.moon].concat(sky.planets).forEach((b) => {
      expect(b.alt).toBeGreaterThanOrEqual(-90); expect(b.alt).toBeLessThanOrEqual(90);
      expect(b.az).toBeGreaterThanOrEqual(0); expect(b.az).toBeLessThan(360.0001);
      expect(typeof b.up).toBe('boolean');
    });
    expect(sky.moon.phase.illum).toBeGreaterThanOrEqual(0);
    expect(typeof sky.daytime).toBe('boolean');
  });

  it('the Sun really rises and sets over a day (high in summer, below the horizon at night)', () => {
    let maxAlt = -90, minAlt = 90;
    for (let ut = 0; ut < 24; ut += 1) {
      const sky = A.skyNow(2000, 6, 21, ut, 43.66, -70.26);
      maxAlt = Math.max(maxAlt, sky.sun.alt);
      minAlt = Math.min(minAlt, sky.sun.alt);
    }
    expect(maxAlt).toBeGreaterThan(60);                 // high midsummer Sun at 43.7°N (≈ 90−43.66+23.44 ≈ 69.8°)
    expect(minAlt).toBeLessThan(-10);                   // well below the horizon at night
  });
});
