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
function render(state) {
  return renderTool('astronomy', { astronomy: { tab: 'observatory', observingList: [], ...state } });
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
    expect(doc.querySelectorAll('[aria-label="Sky layers"] button')).toHaveLength(9);
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
    expect(doc.querySelectorAll('[aria-label="Sky layers"] button')).toHaveLength(9);
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
