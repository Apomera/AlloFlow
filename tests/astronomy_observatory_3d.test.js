import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ASSET = 'stem_lab/assets/astronomy/hyg-v41-naked-eye.json';
const MIRROR = 'desktop/web-app/public/stem_lab/assets/astronomy/hyg-v41-naked-eye.json';
// The 1.3 MB tool source lives on OneDrive; first reads can exceed vitest's 5 s defaults.
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let sky;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});
function render(state, overrides) {
  return renderTool('astronomy', { astronomy: { tab: 'observatory', observingList: [], ...state } }, overrides);
}

// --- contrast probe --------------------------------------------------------
function luminance(hex) {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrastRatio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const HEX = /(?:^|;)\s*background:\s*(#[0-9a-fA-F]{6})/;
const INK = /(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/;
// Every inline-styled text node in the observatory, measured against the nearest
// ancestor that actually paints a colour. Returns the worst offenders.
function probeContrast(html, rootId) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.getElementById(rootId) || doc.body;
  const findings = [];
  for (const el of root.querySelectorAll('*')) {
    const style = el.getAttribute('style') || '';
    const ink = style.match(INK);
    if (!ink) continue;
    if (!(el.textContent || '').trim()) continue;
    let ground = null;
    for (let node = el; node && node !== doc.body; node = node.parentElement) {
      const bg = (node.getAttribute('style') || '').match(HEX);
      if (bg) { ground = bg[1]; break; }
    }
    if (!ground) continue;
    const ratio = contrastRatio(ink[1], ground);
    if (ratio < 4.5) findings.push({ fg: ink[1], bg: ground, ratio: Number(ratio.toFixed(2)), text: el.textContent.trim().slice(0, 40) });
  }
  return findings;
}
const MOOSEHEAD = { lat: 45.58, lon: -69.72 };

describe('Observatory time and place semantics', () => {
  it('converts wall-clock time in an IANA zone to UTC across daylight saving', () => {
    expect(sky.wallTimeToUtcMs(2026, 7, 4, 21, 0, 'America/New_York')).toBe(Date.UTC(2026, 6, 5, 1, 0));
    expect(sky.wallTimeToUtcMs(2026, 1, 15, 21, 0, 'America/New_York')).toBe(Date.UTC(2026, 0, 16, 2, 0));
    const wall = sky.utcMsToWallTime(Date.UTC(2026, 6, 5, 1, 0), 'America/New_York');
    expect([wall.dateText, wall.timeText, wall.offsetText]).toEqual(['2026-07-04', '21:00', 'UTC-04:00']);
    expect(sky.zoneOffsetMinutes(Date.UTC(2026, 6, 5), 'Australia/Sydney')).toBe(600);
    expect(sky.zoneOffsetMinutes(Date.UTC(2026, 6, 5), 'Not/AZone')).toBe(0);
  });

  it('resolves defaults, a fixed instant, custom coordinates and malformed state', () => {
    const now = Date.UTC(2026, 8, 4, 12, 0);
    const live = sky.observatoryResolve({}, now);
    expect(live.site.id).toBe('moosehead');
    expect(live.live).toBe(true);
    expect(live.utcMs).toBe(now);
    expect(live.env).toBe('lake');
    expect(live.timeZone).toBe('America/New_York');
    const fixed = sky.observatoryResolve({ obsLive: false, obsDate: '2026-07-04', obsTime: '21:00' }, now);
    expect(fixed.live).toBe(false);
    expect(fixed.utcMs).toBe(Date.UTC(2026, 6, 5, 1, 0));
    const custom = sky.observatoryResolve({ obsSite: 'custom', obsLat: '95', obsLon: '-200', obsTz: 'Mars/Olympus', obsEnv: 'lava', obsAurora: 99, obsShower: 'nope', obsHighlight: '__proto__', obsLayers: [], obsRate: 'warp' }, now);
    expect(custom.custom).toBe(true);
    expect(custom.lat).toBe(89.9);
    expect(custom.lon).toBe(-180);
    expect(typeof custom.timeZone).toBe('string');
    expect(custom.env).toBe('forest');
    expect(custom.aurora).toBe(9);
    expect(custom.shower).toBe('');
    expect(custom.highlight).toBe('');
    expect(custom.layers.stars).toBe(true);
    expect(custom.rate).toBe('10m');
    const outOfRange = sky.observatoryResolve({ obsLive: false, obsDate: '1850-01-01', obsTime: '21:00' }, now);
    expect(outOfRange.live).toBe(true);
    expect(outOfRange.utcMs).toBe(now);
  });

  it('places the Sun below the horizon at a Maine summer evening and high at midday', () => {
    const evening = sky.observatoryBodies(Date.UTC(2026, 6, 5, 1, 0), MOOSEHEAD.lat, MOOSEHEAD.lon);
    expect(evening.sun.alt).toBeLessThan(0);
    expect(evening.sun.alt).toBeGreaterThan(-15);
    const midday = sky.observatoryBodies(Date.UTC(2026, 6, 4, 17, 0), MOOSEHEAD.lat, MOOSEHEAD.lon);
    expect(midday.sun.alt).toBeGreaterThan(55);
  });
});

describe('Catalog positions and precession', () => {
  it('precesses J2000 coordinates to the date with the expected drift', () => {
    const d2026 = sky.astroDayNumber(2026, 1, 1, 0);
    const polaris = sky.precessJ2000(37.946, 89.264, d2026);
    expect(polaris.dec).toBeGreaterThan(89.33);
    expect(polaris.dec).toBeLessThan(89.40);
    expect(polaris.ra).toBeGreaterThan(43);
    expect(polaris.ra).toBeLessThan(47);
    const equator = sky.precessJ2000(0, 0, d2026);
    expect(equator.ra).toBeGreaterThan(0.30);
    expect(equator.ra).toBeLessThan(0.37);
    expect(equator.dec).toBeGreaterThan(0.12);
    expect(equator.dec).toBeLessThan(0.17);
    const same = sky.precessJ2000(101.287, -16.716, 1.5);
    expect(same.ra).toBeCloseTo(101.287, 5);
    expect(same.dec).toBeCloseTo(-16.716, 5);
  });

  it('bundles a licensed HYG subset that is byte-identical in both served copies and resolves every pattern star', () => {
    const raw = readFileSync(ASSET, 'utf8');
    expect(readFileSync(MIRROR, 'utf8')).toBe(raw);
    const json = JSON.parse(raw);
    expect(json.license).toBe('CC BY-SA 4.0');
    expect(json.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(json.epoch).toBe('J2000');
    expect(json.magnitudeLimit).toBe(6.5);
    const catalog = sky.normalizeCatalog(json);
    expect(catalog.count).toBe(json.stars.length);
    expect(catalog.count).toBeGreaterThan(8000);
    expect(catalog.count).toBeLessThan(10000);
    const sirius = catalog.byHip[32349];
    expect(catalog.mag[sirius]).toBeCloseTo(-1.44, 2);
    expect(catalog.names[32349]).toBe('Sirius');
    for (const pattern of Object.values(sky.constellationPatterns)) {
      for (const star of pattern.stars) expect(catalog.byHip[star[0]]).toBeDefined();
    }
    expect(catalog.fallback).toBeUndefined();
  });

  it('keeps Polaris near the observer latitude and roughly half the catalog above the horizon', () => {
    const catalog = sky.normalizeCatalog(JSON.parse(readFileSync(ASSET, 'utf8')));
    for (const utc of [Date.UTC(2026, 0, 15, 2), Date.UTC(2026, 6, 5, 1), Date.UTC(2026, 9, 1, 8)]) {
      const bodies = sky.observatoryBodies(utc, MOOSEHEAD.lat, MOOSEHEAD.lon);
      const horizon = sky.catalogHorizon(catalog, bodies.lst, MOOSEHEAD.lat, bodies.d, 600);
      const polaris = catalog.byHip[11767];
      expect(Math.abs(horizon.alts[polaris] - MOOSEHEAD.lat)).toBeLessThan(1);
      expect(horizon.up / catalog.count).toBeGreaterThan(0.35);
      expect(horizon.up / catalog.count).toBeLessThan(0.65);
      const r = Math.hypot(horizon.positions[polaris * 3], horizon.positions[polaris * 3 + 1], horizon.positions[polaris * 3 + 2]);
      expect(r).toBeCloseTo(600, 3);
    }
    const sydney = sky.observatoryBodies(Date.UTC(2026, 6, 5, 12), -33.87, 151.21);
    const south = sky.catalogHorizon(catalog, sydney.lst, -33.87, sydney.d, 600);
    expect(south.alts[catalog.byHip[11767]]).toBeLessThan(0);
    expect(south.alts[catalog.byHip[60718]]).toBeGreaterThan(0);
  });

  it('falls back to the built-in bright stars without breaking geometry', () => {
    const fallback = sky.fallbackCatalog();
    expect(fallback.fallback).toBe(true);
    expect(fallback.count).toBe(sky.BRIGHT_STARS.length);
    expect(fallback.names[11767]).toBe('Polaris');
    const bodies = sky.observatoryBodies(Date.UTC(2026, 0, 15, 2), MOOSEHEAD.lat, MOOSEHEAD.lon);
    const horizon = sky.catalogHorizon(fallback, bodies.lst, MOOSEHEAD.lat, bodies.d, 600);
    expect(Math.abs(horizon.alts[fallback.byHip[11767]] - MOOSEHEAD.lat)).toBeLessThan(1);
    const point = sky.horizonPoint(37.946, 89.264, bodies.lst, MOOSEHEAD.lat, bodies.d, 1);
    expect(Math.abs(point.alt - MOOSEHEAD.lat)).toBeLessThan(1);
    expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(1, 6);
  });

  it('maps colour index to plausible star colours', () => {
    const blue = sky.bvToRgb(-0.3), white = sky.bvToRgb(0.6), red = sky.bvToRgb(1.9);
    expect(blue[2]).toBeGreaterThan(blue[0]);
    expect(red[0]).toBeGreaterThan(red[2]);
    expect(white.every(v => v > 0.9)).toBe(true);
  });
});

describe('Sky brightness, meteors and aurora models', () => {
  it('estimates limiting magnitude from Bortle, twilight and moonlight', () => {
    expect(sky.limitingMagnitude(3, -30, -10, 0)).toBe(6.0);
    expect(sky.limitingMagnitude(1, -30, -10, 0)).toBe(6.8);
    expect(sky.limitingMagnitude(3, 10, -10, 0)).toBeLessThanOrEqual(0);
    expect(sky.limitingMagnitude(3, -30, 45, 1)).toBeLessThan(4.5);
    expect(sky.limitingMagnitude(3, -10, -10, 0)).toBeLessThan(6.0);
  });

  it('scales shower rates by radiant altitude and sky quality', () => {
    expect(sky.observatoryShowerRate(100, 90, 6.5)).toBe(100);
    expect(sky.observatoryShowerRate(100, 30, 6.5)).toBe(50);
    expect(sky.observatoryShowerRate(100, -5, 6.5)).toBe(0);
    expect(sky.observatoryShowerRate(100, 90, 4.5)).toBeLessThan(30);
    expect(Object.keys(sky.METEOR_RADIANTS)).toHaveLength(8);
  });

  it('positions the simulated auroral oval by geomagnetic latitude and activity', () => {
    expect(sky.auroraGeometry(69.65, 18.96, 0).visible).toBe(false);
    const tromso = sky.auroraGeometry(69.65, 18.96, 2);
    expect(tromso.overhead || tromso.elevationDeg > 20).toBe(true);
    expect(tromso.visible).toBe(true);
    const quietMaine = sky.auroraGeometry(43.66, -70.26, 1);
    expect(quietMaine.visible).toBe(false);
    const stormMaine = sky.auroraGeometry(43.66, -70.26, 8);
    expect(stormMaine.visible).toBe(true);
    expect(stormMaine.overhead || stormMaine.topElevationDeg > 25).toBe(true);
    expect(stormMaine.bearingDeg > 320 || stormMaine.bearingDeg < 40).toBe(true);
    expect(sky.auroraGeometry(-0.18, -78.47, 9).visible).toBe(false);
    const sydney = sky.auroraGeometry(-33.87, 151.21, 9);
    expect(sydney.magneticLatitude).toBeLessThan(0);
    expect(sydney.bearingDeg).toBeGreaterThan(140);
    expect(sydney.bearingDeg).toBeLessThan(250);
  });

  it('summarizes a NOAA OVATION grid and turns it into curtain geometry', () => {
    const coordinates = [];
    for (let lon = 0; lon < 360; lon += 1) for (let lat = -90; lat <= 90; lat += 1) {
      let value = 0;
      if (lon === 290) { if (lat === 44) value = 3; if (lat === 62) value = 40; if (lat === 30) value = 90; }
      if (lon === 291 && lat === 70) value = 99;
      coordinates.push([lon, lat, value]);
    }
    const grid = { 'Observation Time': '2026-09-04T12:00:00Z', 'Forecast Time': '2026-09-04T12:45:00Z', coordinates };
    const summary = sky.summarizeOvation(grid, 44.2, -70.3);
    expect(summary.siteProb).toBe(3);
    expect(summary.ovalProb).toBe(40);
    expect(summary.ovalLat).toBe(62);
    expect(summary.forecastTime).toBe('2026-09-04T12:45:00Z');
    const far = sky.auroraFromForecast(44, -70, summary);
    expect(far.level).toBe(4);
    expect(far.forecast).toBe(true);
    expect(far.visible).toBe(false);
    const near = sky.auroraFromForecast(44, -70, { ovalProb: 60, ovalLat: 52, siteProb: 10 });
    expect(near.visible).toBe(true);
    expect(near.bearingDeg).toBe(0);
    expect(sky.auroraFromForecast(44, -70, { ovalProb: 2, ovalLat: 44 }).visible).toBe(false);
  });
});

describe('Refraction, deep sky, day events and identification', () => {
  it('applies standard refraction that is largest at the horizon and vanishes overhead', () => {
    expect(sky.refractionDeg(0)).toBeGreaterThan(0.45);
    expect(sky.refractionDeg(0)).toBeLessThan(0.5);
    expect(sky.refractionDeg(45)).toBeGreaterThan(0.01);
    expect(sky.refractionDeg(45)).toBeLessThan(0.02);
    expect(sky.refractionDeg(90)).toBeLessThan(0.001);
    expect(sky.refractionDeg(-5)).toBe(0);
    const bodies = sky.observatoryBodies(Date.UTC(2026, 6, 5, 0, 20), MOOSEHEAD.lat, MOOSEHEAD.lon);
    expect(bodies.sun.trueAlt).toBeDefined();
    expect(bodies.sun.alt).toBeGreaterThanOrEqual(bodies.sun.trueAlt);
  });

  it('ships a sane deep-sky table and full constellation names for every catalog code', () => {
    expect(sky.DEEP_SKY).toHaveLength(14);
    expect(new Set(sky.DEEP_SKY.map(o => o.id)).size).toBe(14);
    for (const o of sky.DEEP_SKY) {
      expect(o.ra).toBeGreaterThanOrEqual(0); expect(o.ra).toBeLessThan(360);
      expect(Math.abs(o.dec)).toBeLessThanOrEqual(90);
      expect(o.size).toBeGreaterThan(0);
    }
    expect(sky.DEEP_SKY.find(o => o.id === 'lmc').dec).toBeLessThan(-60);
    expect(Object.keys(sky.CONSTELLATION_NAMES)).toHaveLength(88);
    expect(sky.CONSTELLATION_NAMES.UMa).toBe('Ursa Major');
    const codes = JSON.parse(readFileSync(ASSET, 'utf8')).constellationCodes;
    for (const code of codes) expect(sky.CONSTELLATION_NAMES[code], code).toBeDefined();
    expect(sky.starColorClass(-0.2)).toBe('blue-white');
    expect(sky.starColorClass(0.65)).toBe('yellow');
    expect(sky.starColorClass(1.8)).toBe('red');
  });

  it('finds sunset, dark sky, dawn and sunrise for the local day, and reports polar day and night', () => {
    const maine = sky.skyEvents(Date.UTC(2026, 6, 5, 3, 30), MOOSEHEAD.lat, MOOSEHEAD.lon, 'America/New_York');
    expect(maine.polar).toBe('');
    expect(maine.sunset).toBeGreaterThan(Date.UTC(2026, 6, 5, 0, 0));
    expect(maine.sunset).toBeLessThan(Date.UTC(2026, 6, 5, 0, 50));
    expect(maine.sunrise).toBeGreaterThan(Date.UTC(2026, 6, 4, 8, 40));
    expect(maine.sunrise).toBeLessThan(Date.UTC(2026, 6, 4, 9, 30));
    expect(maine.darkStart).toBeGreaterThan(maine.sunset);
    expect(maine.darkEnd).toBeLessThan(maine.sunrise);
    const midsummer = sky.skyEvents(Date.UTC(2026, 5, 21, 12), 69.65, 18.96, 'Europe/Oslo');
    expect(midsummer.polar).toBe('day');
    expect(midsummer.sunset).toBeNull();
    const midwinter = sky.skyEvents(Date.UTC(2026, 11, 21, 12), 69.65, 18.96, 'Europe/Oslo');
    expect(midwinter.polar).toBe('night');
    expect(midwinter.sunrise).toBeNull();
    const quito = sky.skyEvents(Date.UTC(2026, 2, 20, 12), -0.18, -78.47, 'America/Guayaquil');
    expect((quito.darkStart - quito.sunset) / 60000).toBeGreaterThan(60);
    expect((quito.darkStart - quito.sunset) / 60000).toBeLessThan(90);
  });

  it('identifies the brightest object inside the cone and nothing outside it', () => {
    const dir = { x: 0, y: 0, z: -1 };
    const off = deg => ({ x: Math.sin(deg * Math.PI / 180), y: 0, z: -Math.cos(deg * Math.PI / 180) });
    const sirius = Object.assign({ name: 'Sirius', mag: -1.44 }, off(0.6));
    const faint = Object.assign({ name: 'faint', mag: 5.5 }, off(0.2));
    expect(sky.identifyNearest(dir, [faint, sirius], 2.5).name).toBe('Sirius');
    expect(sky.identifyNearest(dir, [Object.assign({ name: 'far', mag: 0 }, off(5))], 2.5)).toBeNull();
    const moon = Object.assign({ name: 'Moon', mag: -12, priority: 0.6 }, off(1.5));
    expect(sky.identifyNearest(dir, [faint, moon], 2.5).name).toBe('Moon');
  });
});

describe('Space motion and deep time', () => {
  const catalog = () => sky.normalizeCatalog(JSON.parse(readFileSync(ASSET, 'utf8')));

  it('carries distance and velocity for stars with a parallax, and none for those without', () => {
    const json = JSON.parse(readFileSync(ASSET, 'utf8'));
    expect(json.velocityScale).toBe(1e9);
    expect(json.fields).toEqual(['hip', 'raDeg', 'decDeg', 'mag', 'ci', 'conIndex', 'distPc', 'vx', 'vy', 'vz']);
    expect(json.adaptation).toContain('space velocity');
    const cat = catalog();
    expect(cat.withMotion).toBe(json.withMotion);
    expect(cat.withMotion).toBeGreaterThan(8000);
    expect(cat.withMotion).toBeLessThan(cat.count);
    expect(cat.dist[cat.byHip[32349]]).toBeGreaterThan(2.5);
    expect(cat.dist[cat.byHip[32349]]).toBeLessThan(2.8);
    // A star with no usable parallax is stored at distance zero and never drifts.
    let still = -1;
    for (let i = 0; i < cat.count; i++) if (cat.dist[i] === 0) { still = i; break; }
    expect(still).toBeGreaterThanOrEqual(0);
    const frozen = sky.starMotionAt(cat, still, 50000);
    expect(frozen.ra).toBe(cat.ra[still]);
    expect(frozen.dec).toBe(cat.dec[still]);
    expect(frozen.dmag).toBe(0);
  });

  it('reproduces published proper motions from the stored 3D velocities', () => {
    const cat = catalog();
    // arcsec per year, from a 1000-year baseline.
    const rate = hip => {
      const i = cat.byHip[hip];
      const a = sky.starMotionAt(cat, i, 0), b = sky.starMotionAt(cat, i, 1000);
      return sky.angularSep(a.ra, a.dec, b.ra, b.dec) * 3600 / 1000;
    };
    expect(rate(69673)).toBeCloseTo(2.279, 2);   // Arcturus
    expect(rate(32349)).toBeCloseTo(1.343, 2);   // Sirius
    expect(rate(91262)).toBeCloseTo(0.351, 2);   // Vega
    expect(rate(11767)).toBeCloseTo(0.046, 2);   // Polaris
  });

  it('leaves the epoch untouched at zero years and brightens stars that come closer', () => {
    const cat = catalog();
    const i = cat.byHip[69673];
    const now = sky.starMotionAt(cat, i, 0);
    expect(now.ra).toBe(cat.ra[i]);
    expect(now.dec).toBe(cat.dec[i]);
    expect(now.dmag).toBe(0);
    const later = sky.starMotionAt(cat, i, 20000);
    expect(later.dmag).toBeCloseTo(5 * Math.log10(later.dist / cat.dist[i]), 9);
    // Arcturus is approaching, so it brightens (magnitude falls) before it recedes.
    expect(sky.starMotionAt(cat, i, 1000).dmag).toBeLessThan(0);
  });

  it('warps the Big Dipper over deep time while a nearby star crosses the sky', () => {
    const cat = catalog();
    const dipper = [54061, 53910, 58001, 59774, 62956, 65378, 67301];
    const widest = years => {
      const pts = dipper.map(hip => sky.starMotionAt(cat, cat.byHip[hip], years));
      let max = 0;
      for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) max = Math.max(max, sky.angularSep(pts[a].ra, pts[a].dec, pts[b].ra, pts[b].dec));
      return max;
    };
    const today = widest(0), past = widest(-100000), future = widest(100000);
    expect(today).toBeGreaterThan(25); expect(today).toBeLessThan(26.5);
    expect(past - today).toBeGreaterThan(3);        // the figure was distinctly wider
    expect(future - today).toBeGreaterThan(1);
    // 61 Cygni is the fastest bright star in the subset: it travels right across the sky.
    const c61 = cat.byHip[104214];
    const a = sky.starMotionAt(cat, c61, 0), b = sky.starMotionAt(cat, c61, 100000);
    expect(sky.angularSep(a.ra, a.dec, b.ra, b.dec)).toBeGreaterThan(90);
  });

  it('applies proper motion to the present epoch and exposes drifted magnitudes only when drifting', () => {
    const cat = catalog();
    const bodies = sky.observatoryBodies(Date.UTC(2026, 6, 5, 3, 30), MOOSEHEAD.lat, MOOSEHEAD.lon);
    const live = sky.catalogHorizon(cat, bodies.lst, MOOSEHEAD.lat, bodies.d, 600);
    expect(live.mags).toBeNull();
    const drifted = sky.catalogHorizon(cat, bodies.lst, MOOSEHEAD.lat, bodies.d, 600, 50000);
    expect(drifted.mags).not.toBeNull();
    expect(drifted.mags.length).toBe(cat.count);
    const i = cat.byHip[69673];
    expect(Math.abs(drifted.alts[i] - live.alts[i]) + Math.abs(drifted.azs[i] - live.azs[i])).toBeGreaterThan(1);
    // Alpha Centauri has moved about 1.6 arcmin since J2000; the epoch correction is applied.
    const toliman = cat.byHip[71681];
    const j2000 = sky.starMotionAt(cat, toliman, 0), epoch = sky.starMotionAt(cat, toliman, bodies.d / 365.25);
    const shift = sky.angularSep(j2000.ra, j2000.dec, epoch.ra, epoch.dec) * 60;
    expect(shift).toBeGreaterThan(1.4);
    expect(shift).toBeLessThan(1.9);
  });

  it('normalizes the drift control and turns the tour into a single deep-time card', () => {
    expect(sky.observatoryResolve({ obsDrift: 51234 }, Date.now()).drift).toBe(50000);
    expect(sky.observatoryResolve({ obsDrift: 999999 }, Date.now()).drift).toBe(100000);
    expect(sky.observatoryResolve({ obsDrift: 'soon' }, Date.now()).drift).toBe(0);
    const bodies = sky.observatoryBodies(Date.UTC(2026, 6, 5, 3, 30), MOOSEHEAD.lat, MOOSEHEAD.lon);
    const tour = sky.observatoryTour({ driftYears: 50000, bodies, dark: 1, limit: 6, catalog: null, lst: bodies.lst, lat: MOOSEHEAD.lat, d: bodies.d, deepUp: [], radiant: null, rate: 0, aurora: { visible: false } });
    expect(tour).toHaveLength(1);
    expect(tour[0].kind).toBe('drift');
    expect(tour[0].title).toContain('50,000 years');
    expect(tour[0].note).toContain('61 Cygni');
  });
});

describe('Star trails', () => {
  it('traces a tight circle around the pole and a full sweep at the equator', () => {
    // Polaris sits 0.74 degrees from the pole, so from Portland its altitude
    // stays pinned near the observer's latitude all night while it circles.
    const path = sky.diurnalPath(37.946, 89.264, 0, 43.66, 24, 97);
    const alts = path.map(p => p.alt), azs = path.map(p => p.az);
    expect(Math.min(...alts)).toBeGreaterThan(42.8);
    expect(Math.max(...alts)).toBeLessThan(44.5);
    expect(Math.max(...azs) - Math.min(...azs)).toBeGreaterThan(300);
    // A star on the celestial equator seen from the equator passes through the
    // zenith and reaches the horizon a quarter turn later.
    const equator = sky.diurnalPath(0, 0, 0, 0, 6, 25);
    expect(equator[0].alt).toBeCloseTo(90, 1);
    expect(Math.abs(equator[equator.length - 1].alt)).toBeLessThan(1);
    for (let i = 1; i < equator.length; i++) expect(equator[i].alt).toBeLessThan(equator[i - 1].alt);
  });

  it('advances on the sidereal clock, so a day later the star sits about a degree along', () => {
    const start = sky.diurnalPath(90, 20, 3, 43.66, 0, 2)[0];
    const dayLater = sky.diurnalPath(90, 20, 3, 43.66, 24, 2)[1];
    const drift = sky.angularSep(0, start.alt, 0, dayLater.alt) + Math.abs(start.az - dayLater.az);
    expect(drift).toBeGreaterThan(0.5);
    expect(drift).toBeLessThan(1.6);
    expect(sky.SIDEREAL_RATE).toBeCloseTo(1.00274, 4);
  });

  it('reports fractions across the span, honours the step count and lifts the horizon by refraction', () => {
    const path = sky.diurnalPath(0, 0, 0, 0, 6, 13);
    expect(path).toHaveLength(13);
    expect(path[0].f).toBe(0);
    expect(path[path.length - 1].f).toBe(1);
    // Six hours of hour angle puts this star exactly on the geometric horizon;
    // refraction still lifts it into view.
    const setting = sky.diurnalPath(0, 0, 6, 0, 0, 2)[0];
    expect(setting.alt).toBeCloseTo(sky.refractionDeg(0), 3);
    expect(setting.alt).toBeGreaterThan(0.4);
    expect(setting.alt).toBeLessThan(0.55);
  });

  it('normalizes the trail span and offers sensible choices', () => {
    expect(sky.OBSERVATORY_TRAIL_HOURS).toEqual([1, 2, 4, 8]);
    expect(sky.observatoryResolve({}, Date.now()).trailHours).toBe(4);
    expect(sky.observatoryResolve({ obsTrailHours: '8' }, Date.now()).trailHours).toBe(8);
    expect(sky.observatoryResolve({ obsTrailHours: 99 }, Date.now()).trailHours).toBe(4);
    expect(sky.observatoryResolve({}, Date.now()).layers.trails).toBe(false);
    expect(sky.observatoryResolve({ obsLayers: { trails: true } }, Date.now()).layers.trails).toBe(true);
  });

  it('orders the catalog by brightness so the trail layer never sorts per frame', () => {
    const cat = sky.normalizeCatalog(JSON.parse(readFileSync(ASSET, 'utf8')));
    expect(cat.byMag).toHaveLength(cat.count);
    expect(cat.hip[cat.byMag[0]]).toBe(32349);            // Sirius leads
    for (let i = 1; i < 400; i++) expect(cat.mag[cat.byMag[i]]).toBeGreaterThanOrEqual(cat.mag[cat.byMag[i - 1]]);
  });
});

describe('Theme surfaces and contrast', () => {
  const busy = { obsLive: false, obsDate: '2026-07-04', obsTime: '23:30', obsShower: 'perseids', obsAurora: 4, obsLayers: { trails: true, guides: true }, obsPicked: { kind: 'star', name: 'Vega', hip: 91262, mag: 0.03, ci: 0, colorClass: 'white', constellation: 'Lyra', pattern: 'lyra', alt: 60, az: 90 }, obsNoaa: { fetchedAt: Date.now(), siteProb: 12, ovalProb: 40, ovalLat: 60, forecastTime: '2026-07-05T03:45:00Z' } };

  it('keeps every measured text pair above 4.5 to 1 in the night theme', () => {
    const findings = probeContrast(render(busy), 'astronomy-observatory-tour')
      .concat(probeContrast(render(busy), 'astronomy-observatory-summary'))
      .concat(probeContrast(render(busy), 'astronomy-observatory-picked'));
    expect(findings).toEqual([]);
  });

  it('collapses observatory panels onto the host contrast surface instead of staying navy', () => {
    const night = new DOMParser().parseFromString(render(busy), 'text/html');
    const hc = new DOMParser().parseFromString(render(busy, { isContrast: true }), 'text/html');
    const panels = ['astronomy-observatory-summary', 'astronomy-observatory-tour', 'astronomy-observatory-picked'];
    for (const id of panels) {
      const nightStyle = night.getElementById(id).getAttribute('style');
      const hcStyle = hc.getElementById(id).getAttribute('style');
      expect(nightStyle, id + ' night').toMatch(/background:#(0f172a|111a2e|1a2238)/);
      expect(hcStyle, id + ' contrast').toContain('background:#000000');
      expect(hcStyle, id + ' contrast border').toContain('#fbbf24');
    }
    // No observatory panel may keep a night navy once contrast is on.
    const strays = [];
    for (const id of panels) {
      const root = hc.getElementById(id);
      for (const el of [root, ...root.querySelectorAll('*')]) {
        const bg = (el.getAttribute('style') || '').match(HEX);
        if (bg && bg[1].toLowerCase() !== '#000000') strays.push(id + ' -> ' + bg[1]);
      }
    }
    expect(strays).toEqual([]);
  });

  it('keeps every measured text pair above 4.5 to 1 in the contrast theme too', () => {
    const findings = probeContrast(render(busy, { isContrast: true }), 'astronomy-observatory-tour')
      .concat(probeContrast(render(busy, { isContrast: true }), 'astronomy-observatory-summary'))
      .concat(probeContrast(render(busy, { isContrast: true }), 'astronomy-observatory-picked'));
    expect(findings).toEqual([]);
  });

  it('proves the probe can fail, so a clean run is not vacuous', () => {
    const bad = '<div id="probe" style="background:#0f172a"><span style="color:#1e293b">barely there</span></div>';
    const findings = probeContrast(bad, 'probe');
    expect(findings).toHaveLength(1);
    expect(findings[0].ratio).toBeLessThan(2);
    // And a genuinely readable pair is not reported.
    expect(probeContrast('<div id="probe" style="background:#0f172a"><span style="color:#e2e8f0">clear</span></div>', 'probe')).toEqual([]);
  });
});

describe('When to look tonight', () => {
  // A fixed star, positioned the same way the tool does but without refraction,
  // so the expected altitudes are exactly 90 - |latitude - declination|.
  const starAt = (ra, dec, lat, lon) => t => {
    const d = new Date(t);
    const UTh = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    const lst = sky.siderealTime(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), UTh, lon);
    return sky.equToHorizon(ra, dec, lst, lat);
  };
  const PORTLAND = { lat: 43.66, lon: -70.26, tz: 'America/New_York' };
  const NIGHT = Date.UTC(2026, 11, 22, 3, 0);   // 2026-12-21 22:00 local

  it('calls Polaris circumpolar and a far southern star one that never rises', () => {
    const polaris = sky.objectVisibility(starAt(37.946, 89.264, PORTLAND.lat, PORTLAND.lon), NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 10);
    expect(polaris.circumpolar).toBe(true);
    expect(polaris.neverRises).toBe(false);
    expect(polaris.rise).toBeNull();
    expect(polaris.set).toBeNull();
    expect(polaris.minAlt).toBeGreaterThan(42.5);
    expect(polaris.transitAlt).toBeLessThan(44.8);
    // Acrux sits far enough south that Portland never sees it.
    const acrux = sky.objectVisibility(starAt(186.65, -63.099, PORTLAND.lat, PORTLAND.lon), NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 10);
    expect(acrux.neverRises).toBe(true);
    expect(acrux.circumpolar).toBe(false);
    expect(acrux.transitAlt).toBeLessThan(-15);
    expect(acrux.best).toBeNull();
  });

  it('puts a rising star at the altitude its declination allows, from two latitudes', () => {
    // Sirius transits at 90 - |lat - dec|: 29.6 degrees from Portland.
    const sirius = sky.objectVisibility(starAt(101.287, -16.716, PORTLAND.lat, PORTLAND.lon), NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 5);
    expect(sirius.circumpolar).toBe(false);
    expect(sirius.neverRises).toBe(false);
    expect(sirius.transitAlt).toBeCloseTo(29.62, 0);
    expect(sirius.rise).toBeLessThan(sirius.transit);
    expect(sirius.set).toBeGreaterThan(sirius.transit);
    // The same star barely clears the horizon from Tromso: 90 - (69.65 + 16.716).
    const arctic = sky.objectVisibility(starAt(101.287, -16.716, 69.65, 18.96), NIGHT, 69.65, 18.96, 'Europe/Oslo', 5);
    expect(arctic.neverRises).toBe(false);
    expect(arctic.transitAlt).toBeCloseTo(3.63, 0);
  });

  it('reports the darkest moment the object is well placed, and none for the Sun', () => {
    const sirius = sky.objectVisibility(starAt(101.287, -16.716, PORTLAND.lat, PORTLAND.lon), NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 10);
    expect(sirius.best).not.toBeNull();
    expect(sirius.best.alt).toBeGreaterThan(0);
    expect(sirius.best.alt).toBeLessThanOrEqual(sirius.transitAlt + 0.001);
    // The Sun is never up in full darkness, so there is no such moment for it.
    const sunAt = t => {
      const d = new Date(t);
      const UTh = d.getUTCHours() + d.getUTCMinutes() / 60;
      const day = sky.astroDayNumber(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), UTh);
      const eq = sky.sunRaDec(day);
      return sky.equToHorizon(eq.ra, eq.dec, sky.siderealTime(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), UTh, PORTLAND.lon), PORTLAND.lat);
    };
    const sun = sky.objectVisibility(sunAt, NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 10);
    expect(sun.best).toBeNull();
    expect(sun.neverRises).toBe(false);
    expect(sun.circumpolar).toBe(false);
  });

  it('anchors the window on local noon so a night is never split in half', () => {
    const evening = sky.objectVisibility(starAt(101.287, -16.716, PORTLAND.lat, PORTLAND.lon), NIGHT, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 30);
    // 03:00 UTC is 22:00 the previous local day, so the window opens that noon.
    expect(sky.utcMsToWallTime(evening.windowStart, PORTLAND.tz).timeText).toBe('12:00');
    expect(sky.utcMsToWallTime(evening.windowStart, PORTLAND.tz).dateText).toBe('2026-12-21');
    // An early-morning instant belongs to the night that began the day before.
    const beforeDawn = Date.UTC(2026, 11, 22, 9, 0);   // 04:00 local on the 22nd
    const morning = sky.objectVisibility(starAt(101.287, -16.716, PORTLAND.lat, PORTLAND.lon), beforeDawn, PORTLAND.lat, PORTLAND.lon, PORTLAND.tz, 30);
    expect(sky.utcMsToWallTime(morning.windowStart, PORTLAND.tz).dateText).toBe('2026-12-21');
    expect(morning.windowStart).toBe(evening.windowStart);
  });
});

describe('Tonight\'s target list', () => {
  const SIRIUS = { kind: 'star', name: 'Sirius', hip: 32349, ra: 101.287, dec: -16.716 };

  it('keeps only entries it could actually re-find, and drops the rest', () => {
    const kept = sky.normalizeObsTargets([
      SIRIUS,
      { kind: 'deepsky', id: 'm42', name: 'Orion Nebula (M42)', ra: 83.82, dec: -5.39 },
      { kind: 'planet', id: 'jupiter', name: 'Jupiter' },
      { kind: 'moon', id: 'moon', name: 'Moon' }
    ]);
    expect(kept.map(t => t.kind)).toEqual(['star', 'deepsky', 'planet', 'moon']);
    // Everything below is unusable and must not survive a reload.
    expect(sky.normalizeObsTargets([
      { kind: 'star', name: 'No coordinates' },
      { kind: 'star', name: 'Bad dec', ra: 10, dec: 400 },
      { kind: 'deepsky', id: 'not-a-real-object', name: 'Ghost', ra: 10, dec: 10 },
      { kind: 'planet', id: 'pluto', name: 'Pluto' },
      { kind: 'comet', id: 'x', name: 'Comet' },
      { kind: 'star', ra: 10, dec: 10 },
      null, 'nonsense', 42
    ])).toEqual([]);
    expect(sky.normalizeObsTargets('nope')).toEqual([]);
    expect(sky.normalizeObsTargets(null)).toEqual([]);
  });

  it('deduplicates, caps the list and normalizes right ascension', () => {
    expect(sky.normalizeObsTargets([SIRIUS, SIRIUS, Object.assign({}, SIRIUS)])).toHaveLength(1);
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: 'star', name: 'Star ' + i, hip: 1000 + i, ra: i, dec: 10 }));
    expect(sky.normalizeObsTargets(many)).toHaveLength(sky.MAX_OBS_TARGETS);
    expect(sky.normalizeObsTargets([Object.assign({}, SIRIUS, { ra: -20 })])[0].ra).toBeCloseTo(340, 6);
    expect(sky.obsTargetKey({ kind: 'star', hip: 32349 })).toBe('star:32349');
    expect(sky.obsTargetKey({ kind: 'planet', id: 'mars' })).toBe('planet:mars');
  });

  it('builds one position source for fixed and moving targets alike', () => {
    const star = sky.observatoryPositionAt(SIRIUS, 43.66, -70.26);
    const planet = sky.observatoryPositionAt({ kind: 'planet', id: 'jupiter', name: 'Jupiter' }, 43.66, -70.26);
    const t = Date.UTC(2026, 11, 22, 3, 0);
    expect(typeof star).toBe('function');
    expect(typeof planet).toBe('function');
    for (const at of [star, planet]) {
      const p = at(t);
      expect(Number.isFinite(p.alt)).toBe(true);
      expect(Number.isFinite(p.az)).toBe(true);
    }
    // A fixed star keeps its declination through the night; Jupiter's altitude
    // still changes, so both sources are actually being evaluated.
    expect(Math.abs(star(t).alt - star(t + 3600000).alt)).toBeGreaterThan(0.5);
    expect(sky.observatoryPositionAt({ kind: 'nonsense' }, 43.66, -70.26)).toBeNull();
    expect(sky.observatoryPositionAt(null, 43.66, -70.26)).toBeNull();
  });

  it('shows the list in the tab and marks the identified object as saved', () => {
    const state = { obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsTargets: [SIRIUS], obsPicked: Object.assign({ mag: -1.44, alt: 20, az: 150 }, SIRIUS) };
    const doc = new DOMParser().parseFromString(render(state), 'text/html');
    const list = doc.getElementById('astronomy-observatory-targets');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Sirius');
    expect(list.textContent).toContain('1/12');
    expect(list.querySelector('[aria-label="Remove from tonight\'s list: Sirius"]')).toBeTruthy();
    const saved = Array.from(doc.querySelectorAll('button')).find(b => /On tonight's list/.test(b.textContent));
    expect(saved).toBeTruthy();
    expect(saved.getAttribute('aria-pressed')).toBe('true');
    // An object that is not on the list offers to add instead.
    const other = new DOMParser().parseFromString(render(Object.assign({}, state, { obsTargets: [] })), 'text/html');
    expect(other.getElementById('astronomy-observatory-targets')).toBeNull();
    const add = Array.from(other.querySelectorAll('button')).find(b => /Add to tonight's list/.test(b.textContent));
    expect(add.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Printable plan for tonight', () => {
  const printed = state => new DOMParser().parseFromString(
    renderTool('astronomy', { astronomy: { tab: 'print', observingList: [], ...state } }), 'text/html');

  it('carries the Observatory site, the night and what is up onto paper', () => {
    const doc = printed({ obsSite: 'moosehead', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsBortle: 2 });
    const section = doc.getElementById('astro-tonight-plan-heading').parentElement;
    const text = section.textContent;
    expect(doc.getElementById('astro-tonight-plan-heading').textContent).toContain('Moosehead Lake, Maine');
    expect(doc.getElementById('astro-tonight-plan-heading').textContent).toContain('2026-12-21');
    expect(text).toContain('45.58°, -69.72°');
    expect(text).toContain('America/New_York');
    // The night's shape, in local clock time.
    const times = section.querySelector('table[aria-labelledby="astro-tonight-plan-heading"]');
    expect(times).toBeTruthy();
    expect(times.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    const rows = Array.from(times.querySelectorAll('tbody tr')).map(r => r.textContent);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.join(' ')).toMatch(/Sunset\s*\d\d:\d\d/);
    expect(rows.join(' ')).toMatch(/Darkest hour\s*\d\d:\d\d/);
    expect(text).toContain('Bortle 2');
    expect(text).toMatch(/Moon: .*(illuminated)/);
    expect(text).toMatch(/darkest hour/);
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });

  it('prints a timetable for the saved targets, including ones that never set or never rise', () => {
    const doc = printed({
      obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00',
      obsTargets: [
        { kind: 'star', name: 'Sirius', hip: 32349, ra: 101.287, dec: -16.716 },
        { kind: 'star', name: 'Polaris', hip: 11767, ra: 37.946, dec: 89.264 },
        { kind: 'star', name: 'Acrux', hip: 60718, ra: 186.65, dec: -63.099 }
      ]
    });
    const table = doc.querySelector('table[aria-label="My targets tonight"]');
    expect(table).toBeTruthy();
    expect(Array.from(table.querySelectorAll('th[scope="col"]')).map(th => th.textContent))
      .toEqual(['Target', 'Rises', 'Highest', 'Sets', 'Where to look']);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent));
    expect(rows).toHaveLength(3);
    const [sirius, polaris, acrux] = rows;
    expect(sirius[0]).toBe('Sirius');
    expect(sirius[1]).toMatch(/^\d\d:\d\d$/);
    expect(sirius[2]).toMatch(/^(29|30)° at \d\d:\d\d$/);
    expect(sirius[3]).toMatch(/^\d\d:\d\d$/);
    // Polaris circles the pole all night, so it is stated rather than timed.
    expect(polaris[1]).toBe('always up');
    expect(polaris[3]).toBe('never sets');
    // Acrux is below Portland's horizon at every hour.
    expect(acrux[2]).toBe('not visible tonight');
    expect(acrux[1]).toBe('—');
    expect(table.textContent).not.toContain('NaN');
  });

  it('does not claim nothing is saved while printing the learner\'s saved targets', () => {
    const withTargets = printed({ obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsTargets: [{ kind: 'star', name: 'Sirius', hip: 32349, ra: 101.287, dec: -16.716 }] });
    expect(withTargets.getElementById('astro-print-region').textContent).not.toContain('No observing targets saved yet');
    expect(withTargets.querySelector('table[aria-label="My targets tonight"]')).toBeTruthy();
    // With neither list populated the prompt is still there to guide a first-time user.
    const empty = printed({ obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
    expect(empty.getElementById('astro-print-region').textContent).toContain('No observing targets saved yet');
    expect(empty.querySelector('table[aria-label="My targets tonight"]')).toBeNull();
  });

  it('gives students a blank field log to fill in outside', () => {
    const doc = printed({ obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
    const log = doc.querySelector('table[aria-label="Field log"]');
    expect(log).toBeTruthy();
    const headers = Array.from(log.querySelectorAll('th[scope="col"]')).map(th => th.textContent);
    expect(headers).toEqual(['What I looked at', 'Time', 'What I actually saw']);
    const bodyRows = log.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(4);
    for (const row of bodyRows) {
      expect(row.querySelectorAll('td')).toHaveLength(3);
      expect(row.textContent.trim()).toBe('');
    }
  });

  it('states the midnight sun rather than printing times that do not exist', () => {
    const doc = printed({ obsSite: 'tromso', obsLive: false, obsDate: '2026-06-21', obsTime: '12:00' });
    const section = doc.getElementById('astro-tonight-plan-heading').parentElement;
    expect(section.textContent).toContain('Midnight sun');
    expect(section.textContent).not.toMatch(/Sunset\s*\d\d:\d\d/);
    expect(section.textContent).not.toContain('NaN');
  });

  it('survives a malformed observatory state without breaking the printed kit', () => {
    const doc = printed({ obsSite: '__proto__', obsDate: 42, obsTime: {}, obsBortle: 'dark', obsDrift: 'soon' });
    expect(doc.getElementById('astro-tonight-plan-heading')).toBeTruthy();
    expect(doc.getElementById('astro-print-region').textContent).not.toContain('NaN');
  });
});

describe('Tour planning and pattern lookup', () => {
  it('maps pattern stars to their figure and plans a prioritised tour for a dark sky', () => {
    expect(sky.HIP_TO_PATTERN[27989]).toBe('orion');
    expect(sky.HIP_TO_PATTERN[11767]).toBe('ursa_minor');
    expect(sky.HIP_TO_PATTERN[32349]).toBeUndefined();
    const catalog = sky.normalizeCatalog(JSON.parse(readFileSync(ASSET, 'utf8')));
    const utc = Date.UTC(2026, 6, 5, 3, 30);
    const bodies = sky.observatoryBodies(utc, MOOSEHEAD.lat, MOOSEHEAD.lon);
    const limit = sky.limitingMagnitude(3, bodies.sun.alt, bodies.moon.alt, bodies.moon.phase.illum);
    const deepUp = sky.DEEP_SKY.map(obj => { const p = sky.horizonPoint(obj.ra, obj.dec, bodies.lst, MOOSEHEAD.lat, bodies.d, 1); return { obj, alt: p.alt, az: p.az }; }).filter(x => x.alt > 5).sort((a, b) => a.obj.mag - b.obj.mag);
    const tour = sky.observatoryTour({ bodies, dark: 1, limit, catalog, lst: bodies.lst, lat: MOOSEHEAD.lat, d: bodies.d, deepUp, radiant: null, rate: 0, aurora: { visible: false } });
    expect(tour.length).toBeGreaterThanOrEqual(3);
    expect(tour.length).toBeLessThanOrEqual(6);
    const kinds = tour.map(s => s.kind);
    expect(kinds).toContain('constellation');
    expect(kinds).toContain('deepsky');
    expect(kinds).toContain('named');
    expect(kinds).not.toContain('daylight');
    const con = tour.find(s => s.kind === 'constellation');
    expect(con.note.length).toBeGreaterThan(20);
    expect(con.alt).toBeGreaterThan(20);
    for (const step of tour) { expect(step.title).toBeTruthy(); expect(Number.isFinite(step.az)).toBe(true); }
  });

  it('starts with the daylight step when the Sun is up and still offers the Moon or Venus', () => {
    const utc = Date.UTC(2026, 6, 4, 17, 0);
    const bodies = sky.observatoryBodies(utc, MOOSEHEAD.lat, MOOSEHEAD.lon);
    const tour = sky.observatoryTour({ bodies, dark: 0, limit: -3, catalog: null, lst: bodies.lst, lat: MOOSEHEAD.lat, d: bodies.d, deepUp: [], radiant: null, rate: 0, aurora: { visible: false } });
    expect(tour[0].kind).toBe('daylight');
    expect(tour.every(s => ['daylight', 'moon', 'planet'].includes(s.kind))).toBe(true);
    expect(tour.find(s => s.kind === 'planet')?.id ?? 'venus').toBe('venus');
  });
});

describe('Observatory tab rendering', () => {
  it('renders the tour, describe and copy controls, and highlights the figure of an identified pattern star', () => {
    const doc = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30', obsTourStep: 99, obsPicked: { kind: 'star', name: 'Betelgeuse', hip: 27989, mag: 0.45, ci: 1.5, colorClass: 'red', constellation: 'Orion', pattern: 'orion', alt: 30, az: 200 } }), 'text/html');
    const text = doc.body.textContent;
    expect(doc.getElementById('astronomy-observatory-tour')).toBeTruthy();
    expect(text).toMatch(/Tonight's tour · \d \/ \d/);
    expect(text).toContain('Part of Orion');
    expect(doc.querySelector('[aria-label="Tour steps"]')).toBeTruthy();
    expect(Array.from(doc.querySelectorAll('button')).some(b => /Describe this view/.test(b.textContent))).toBe(true);
    expect(Array.from(doc.querySelectorAll('button')).some(b => /Copy summary/.test(b.textContent))).toBe(true);
    expect(text).not.toContain('NaN');
  });

  it('renders guides, identification and day-event controls, and the Sky Map cross-link', () => {
    const doc = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '21:00', obsLayers: { guides: true }, obsPicked: { kind: 'star', name: 'Sirius', hip: 32349, mag: -1.44, ci: 0.01, colorClass: 'blue-white', constellation: 'Canis Major', alt: 20, az: 150 } }), 'text/html');
    const text = doc.body.textContent;
    expect(doc.querySelector('[aria-label="Sky layers"] button[aria-pressed="true"]')).toBeTruthy();
    expect(doc.querySelectorAll('[aria-label="Sky layers"] button')).toHaveLength(10);
    expect(text).toContain('◎ Sirius');
    expect(text).toContain('Canis Major');
    expect(text).toContain('HIP 32349');
    expect(text).toContain('blue-white star');
    expect(text).toContain('Deep-sky showpieces up');
    expect(doc.querySelectorAll('[aria-label="Jump to a moment of this day"] button').length).toBeGreaterThanOrEqual(4);
    expect(text).toMatch(/Sunset 20:\d\d/);
    expect(text).toContain('refraction');
    const skymap = new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'skymap', observingList: [] } }), 'text/html');
    expect(skymap.body.textContent).toContain('Open in 3D Observatory');
  });

  it('renders the deep-time control, its caveat and a solar-system-free summary when drifting', () => {
    const off = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30' }), 'text/html');
    expect(off.body.textContent).toContain('Deep time: star motion');
    expect(off.body.textContent).not.toContain('Deep-time view');
    expect(off.querySelector('input[type="range"][min="-100000"]').getAttribute('value')).toBe('0');

    const on = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30', obsDrift: 50000, obsShower: 'perseids', obsAurora: 6 }), 'text/html');
    const text = on.body.textContent;
    expect(text).toContain('Deep-time view');
    expect(text).toContain('+50,000 years');
    expect(text).toContain('about 52,000 CE');
    expect(text).toContain('Back to today');
    expect(text).toContain('The sky in 50,000 years');
    // Solar-system content is withheld rather than shown at a meaningless epoch.
    expect(text).not.toContain('Perseids Radiant');
    expect(text).toContain('Deep-sky showpieces up: None');
    expect(text).not.toContain('NaN');

    const past = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30', obsDrift: -100000 }), 'text/html');
    expect(past.body.textContent).toContain('−100,000 years');
    expect(past.body.textContent).toContain('BCE');
    expect(past.body.textContent).toContain('100,000 years ago');
  });

  it('reveals the trail span control only when trails are on', () => {
    const off = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30' }), 'text/html');
    expect(off.body.textContent).toContain('Star trails');
    expect(off.querySelector('[aria-label="Trail length"]')).toBeNull();
    const on = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '23:30', obsLayers: { trails: true }, obsTrailHours: 8 }), 'text/html');
    // A server-rendered select carries its choice on the option, not the select.
    const span = on.querySelector('[aria-label="Trail length"]');
    expect(span).toBeTruthy();
    const options = Array.from(on.querySelectorAll('[aria-label="Trail length"] option'));
    expect(options.map(o => o.getAttribute('value'))).toEqual(['1', '2', '4', '8']);
    expect(options.filter(o => o.hasAttribute('selected')).map(o => o.getAttribute('value'))).toEqual(['8']);
    expect(on.body.textContent).toContain('covering the next 8 hours');
    expect(on.body.textContent).toContain('celestial pole trace short circles');
    expect(on.body.textContent).not.toContain('NaN');
  });

  it('tells the observer when the identified object rises, peaks and sets', () => {
    const sirius = { kind: 'star', name: 'Sirius', hip: 32349, mag: -1.44, ci: 0.01, colorClass: 'blue-white', constellation: 'Canis Major', ra: 101.287, dec: -16.716, alt: 20, az: 150 };
    const doc = new DOMParser().parseFromString(render({ obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsPicked: sirius }), 'text/html');
    const panel = doc.getElementById('astronomy-observatory-picked').textContent;
    expect(panel).toContain('Tonight:');
    expect(panel).toMatch(/rises \d\d:\d\d/);
    expect(panel).toMatch(/Highest (29|30)°/);
    expect(panel).toMatch(/sets \d\d:\d\d/);
    expect(panel).toContain('Best in full darkness around');
    expect(panel).not.toContain('NaN');

    // Polaris never sets from Maine, and the panel says so instead of inventing times.
    const polaris = Object.assign({}, sirius, { name: 'Polaris', hip: 11767, ra: 37.946, dec: 89.264 });
    const circum = new DOMParser().parseFromString(render({ obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsPicked: polaris }), 'text/html');
    expect(circum.getElementById('astronomy-observatory-picked').textContent).toContain('never sets');

    // Deep time hides the solar system, so it withholds a night plan too.
    const drifted = new DOMParser().parseFromString(render({ obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsPicked: sirius, obsDrift: 50000 }), 'text/html');
    expect(drifted.getElementById('astronomy-observatory-picked').textContent).not.toContain('Tonight:');
  });

  it('shows the polar-day note instead of missing events, and ignores malformed picks', () => {
    const doc = new DOMParser().parseFromString(render({ obsSite: 'tromso', obsLive: false, obsDate: '2026-06-21', obsTime: '12:00', obsPicked: 'nonsense' }), 'text/html');
    expect(doc.body.textContent).toContain('Midnight sun');
    expect(doc.body.textContent).toContain('Click a star, planet');
    expect(doc.body.textContent).not.toContain('NaN');
  });

  it('renders place, time, layers, summary and attribution for a fixed instant', () => {
    const doc = new DOMParser().parseFromString(render({ obsLive: false, obsDate: '2026-07-04', obsTime: '21:00', obsShower: 'perseids', obsAurora: 3 }), 'text/html');
    const text = doc.body.textContent;
    expect(text).toContain('Moosehead Lake, Maine');
    expect(text).toContain('2026-07-04 21:00 (UTC-04:00)');
    expect(text).toContain('What this sky contains');
    expect(text).toContain('CC BY-SA 4.0');
    expect(text).toContain('Simulated activity level 3');
    expect(text).toContain('Perseids Radiant');
    expect(doc.getElementById('astronomy-observatory-3d').getAttribute('tabindex')).toBe('0');
    expect(doc.querySelectorAll('[aria-label="Sky layers"] button')).toHaveLength(10);
    expect(doc.querySelector('[aria-label="Sky camera controls"]')).toBeTruthy();
    expect(text).toContain('labelled simulations');
    expect(text).not.toContain('NaN');
  });

  it('shows coordinate inputs for a custom site and survives malformed state', () => {
    const doc = new DOMParser().parseFromString(render({ obsSite: 'custom', obsLat: 70, obsLon: 20, obsLayers: 'bad', obsAurora: 99, obsShower: 'nope', obsNoaa: 'garbage' }), 'text/html');
    expect(doc.querySelector('input[type="number"][min="-89.9"]')).toBeTruthy();
    expect(doc.body.textContent).toContain('Simulated activity level 9');
    expect(doc.body.textContent).toContain('70.00°, 20.00°');
    expect(doc.body.textContent).not.toContain('NaN');
    const html = render({ obsSite: '__proto__', obsDate: 42, obsTime: {} });
    expect(html).toContain('Moosehead Lake, Maine');
    expect(html).not.toContain('NaN');
  });

  it('does not create timers or network requests during server rendering', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const fetchSpy = typeof globalThis.fetch === 'function' ? vi.spyOn(globalThis, 'fetch') : null;
    render({ obsPlaying: true });
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    if (fetchSpy) { expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore(); }
    interval.mockRestore(); timeout.mockRestore();
  });

  it('lists the observatory tab once and keeps the meteor tab intact', () => {
    const doc = new DOMParser().parseFromString(render(), 'text/html');
    const tabs = Array.from(doc.querySelectorAll('[role="tab"]')).map(el => el.textContent.trim());
    expect(tabs.filter(label => /Observatory/.test(label))).toHaveLength(1);
    expect(tabs.some(label => /Meteors/.test(label))).toBe(true);
  });
});
