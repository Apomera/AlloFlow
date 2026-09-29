import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let sky;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');
  sky = window.__alloAstroPure;
});
const POLARIS = { kind: 'star', hip: 11767, name: 'Polaris', ra: 37.946, dec: 89.264 };
const SIRIUS = { kind: 'star', hip: 32349, name: 'Sirius', ra: 101.287, dec: -16.716 };
const CANOPUS = { kind: 'star', hip: 30438, name: 'Canopus', ra: 95.988, dec: -52.696 };
const MOON = { kind: 'moon', name: 'Moon' };
const SUN = { kind: 'sun', name: 'Sun' };
const MAINE = { lat: 45.58, lon: -69.72, timeZone: 'America/New_York', utcMs: Date.UTC(2026, 0, 16, 2) };
function plan(targets, overrides = {}) {
  const r = { ...MAINE, ...overrides };
  return sky.observatoryNightPlan(targets, r.utcMs, r.lat, r.lon, r.timeZone);
}
function render(targets, extras = {}) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(sky.ObservatoryNightPlan, {
    React, t: (_key, fallback) => fallback, resolved: MAINE, targets, ...extras
  }));
}

describe('Selected observing night', () => {
  it('keeps an early morning in the preceding evening and starts a new night at noon', () => {
    const evening = sky.observingNightWindow(Date.UTC(2026, 0, 16, 2), MAINE.timeZone);
    const morning = sky.observingNightWindow(Date.UTC(2026, 0, 16, 11), MAINE.timeZone);
    expect(morning).toEqual(evening);
    expect(evening.dateText).toBe('2026-01-15');
    expect(sky.observingNightWindow(Date.UTC(2026, 0, 16, 17), MAINE.timeZone).dateText).toBe('2026-01-16');
  });

  it.each([
    [Date.UTC(2026, 2, 8, 4), 23, '2026-03-07'],
    [Date.UTC(2026, 10, 1, 3), 25, '2026-10-31']
  ])('uses actual local noons across a DST change', (utcMs, hours, dateText) => {
    const result = plan([POLARIS], { utcMs });
    expect(result.window.dateText).toBe(dateText);
    expect((result.window.end - result.window.start) / 3600000).toBe(hours);
    expect(sky.utcMsToWallTime(result.window.start, MAINE.timeZone).timeText).toBe('12:00');
    expect(sky.utcMsToWallTime(result.window.end, MAINE.timeZone).timeText).toBe('12:00');
    const visibility = result.rows[0].visibility;
    expect(visibility.samples.at(-1).t).toBe(result.window.end);
    expect(visibility.windowEnd).toBe(result.window.end);
    expect(visibility.samples).toHaveLength(hours * 6 + 1);
  });

  it('rejects invalid inputs and never lets a bad sampling interval create an unbounded loop', () => {
    expect(sky.observingNightWindow(NaN, 'UTC')).toBeNull();
    expect(sky.observingNightWindow(MAINE.utcMs, 'Bad/Zone')).toBeNull();
    expect(plan([POLARIS], { lat: NaN })).toBeNull();
    expect(plan([POLARIS], { lon: 181 })).toBeNull();
    const position = sky.observatoryPositionAt(POLARIS, MAINE.lat, MAINE.lon);
    const result = sky.objectVisibility(position, MAINE.utcMs, MAINE.lat, MAINE.lon, MAINE.timeZone, Infinity);
    expect(result.samples).toHaveLength(145);
    expect(sky.objectVisibility(() => ({ alt: NaN, az: 0 }), MAINE.utcMs, MAINE.lat, MAINE.lon, MAINE.timeZone)).toBeNull();
  });

  it.each([Date.UTC(1900, 0, 1, 7), Date.UTC(2100, 0, 1, 3)])('keeps jump recommendations inside the supported local calendar at a date boundary', utcMs => {
    const result = plan([POLARIS, SIRIUS, MOON, SUN], { utcMs });
    expect(result.partialSupport).toBe(true);
    for (const row of result.rows) {
      if (!row.best) continue;
      const year = sky.utcMsToWallTime(row.best.t, MAINE.timeZone).year;
      expect(year).toBeGreaterThanOrEqual(1900);
      expect(year).toBeLessThanOrEqual(2099);
    }
    expect(render([POLARIS], { resolved: { ...MAINE, utcMs } })).toContain('Jump buttons use times within 1900–2099');
  });
});

describe('Night plan geometry and honest recommendations', () => {
  it('chooses the highest sampled target position while the Sun is below -18 degrees', () => {
    const result = plan([SIRIUS]);
    const row = result.rows[0];
    expect(row.status).toBe('dark');
    expect(row.best.alt).toBeGreaterThan(20);
    expect(row.best.sunAlt).toBeLessThanOrEqual(-18);
    const candidates = row.visibility.samples.filter(sample => sample.alt > 0 && sample.sunAlt <= -18);
    expect(row.best.alt).toBe(Math.max(...candidates.map(sample => sample.alt)));
    const actual = sky.observatoryPositionAt(SIRIUS, MAINE.lat, MAINE.lon)(row.best.t);
    expect(row.best.alt).toBeCloseTo(actual.alt, 10);
  });

  it('keeps recommendations inside the night and models the Moon at the observer', () => {
    const result = plan([MOON, POLARIS]);
    for (const row of result.rows) {
      if (row.best) {
        expect(row.best.t).toBeGreaterThanOrEqual(result.window.start);
        expect(row.best.t).toBeLessThanOrEqual(result.window.end);
      }
      if (row.target.kind === 'moon') {
        const sample = row.visibility.samples[37];
        const bodies = sky.observatoryBodies(sample.t, MAINE.lat, MAINE.lon);
        expect(sample.alt).toBeCloseTo(bodies.moon.alt, 8);
      }
    }
  });

  it('offers no viewing jump for a target that never rises at this site', () => {
    const row = plan([CANOPUS]).rows[0];
    expect(row.status).toBe('below');
    expect(row.visibility.neverRises).toBe(true);
    expect(row.best).toBeNull();
    const doc = new DOMParser().parseFromString(render([CANOPUS]), 'text/html');
    expect(doc.querySelector('button')).toBeNull();
    expect(doc.body.textContent).toContain('Below the horizon throughout this night');
  });

  it('does not present a midnight-sun night as dark or recommend stars in daylight', () => {
    const result = plan([POLARIS, SUN], { lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo', utcMs: Date.UTC(2026, 5, 21, 20) });
    expect(result.allDay).toBe(true);
    expect(result.hasDark).toBe(false);
    expect(result.rows[0].status).toBe('daylight');
    expect(result.rows[0].best).toBeNull();
    expect(result.rows[1].status).toBe('sun');
    expect(result.rows[1].best.alt).toBeGreaterThan(40);
  });

  it('distinguishes a summer twilight night from a fully dark night', () => {
    const result = plan([POLARIS], { lat: 51.51, lon: -0.13, timeZone: 'Europe/London', utcMs: Date.UTC(2026, 5, 21, 22) });
    expect(result.hasDark).toBe(false);
    expect(result.allDay).toBe(false);
    expect(result.rows[0].status).toBe('twilight');
    expect(result.rows[0].best.sunAlt).toBeLessThan(0);
    expect(result.rows[0].best.sunAlt).toBeGreaterThan(-18);
  });

  it('labels the selected-object recommendation as twilight during a bright northern summer night', () => {
    const html = renderTool('astronomy', { astronomy: {
      tab: 'observatory', observingList: [], obsSite: 'custom', obsLat: 51.51, obsLon: -0.13,
      obsTz: 'Europe/London', obsLive: false, obsDate: '2026-06-21', obsTime: '23:00',
      obsPicked: POLARIS, obsTargets: [POLARIS], obsPlanOpen: true
    } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const selected = doc.querySelector('#astronomy-observatory-picked').textContent;
    expect(selected).toContain('Twilight opportunity around');
    expect(selected).not.toContain('Best in a dark sky');
    expect(doc.querySelector('#astronomy-observatory-night-plan').textContent).toContain('The sky never becomes fully dark');
  });

  it('allows dark-sky planning in polar night without requiring a sunrise or sunset', () => {
    const result = plan([POLARIS], { lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo', utcMs: Date.UTC(2026, 11, 21, 20) });
    expect(result.noDay).toBe(true);
    expect(result.hasDark).toBe(true);
    expect(result.rows[0].status).toBe('dark');
    expect(result.bands.some(band => band.light === 'twilight')).toBe(true);
  });

  it('covers the whole night with contiguous sunlight bands', () => {
    const result = plan([SIRIUS]);
    expect(result.bands[0].start).toBe(result.window.start);
    expect(result.bands.at(-1).end).toBe(result.window.end);
    for (let i = 1; i < result.bands.length; i++) {
      expect(result.bands[i].start).toBe(result.bands[i - 1].end);
      expect(result.bands[i].light).not.toBe(result.bands[i - 1].light);
    }
    expect(new Set(result.bands.map(band => band.light)).size).toBe(3);
  });

  it('drops malformed saved positions, deduplicates targets, and caps work to the saved-list limit', () => {
    expect(plan(null).rows).toEqual([]);
    const malformed = [null, {}, { ...POLARIS, ra: null }, { ...POLARIS, ra: '' }, { ...POLARIS, dec: false }, { kind: 'planet', id: '__proto__', name: 'Invalid' }];
    expect(plan(malformed).rows).toEqual([]);
    expect(plan([POLARIS, POLARIS, { ...SIRIUS, ra: String(SIRIUS.ra) }]).rows).toHaveLength(2);
    expect(plan(Array.from({ length: 30 }, (_, index) => ({ ...POLARIS, hip: index + 1 }))).rows).toHaveLength(12);
  });
});

describe('Night plan interaction', () => {
  it('renders an accessible, static graph and explains the observing limits', () => {
    const doc = new DOMParser().parseFromString(render([SIRIUS]), 'text/html');
    expect(doc.querySelector('section').getAttribute('aria-label')).toBe('Plan your night');
    expect(doc.querySelector('svg').getAttribute('aria-label')).toContain('Sirius: Above the horizon in a dark sky');
    expect(doc.querySelector('animate')).toBeNull();
    expect(doc.body.textContent).toContain('sampled every 10 minutes');
    expect(doc.body.textContent).toContain('Clouds, moonlight and skyglow');
    expect(doc.body.textContent).toContain('Early-morning hours belong to the preceding night');
  });

  it('passes the recommended instant and target to the jump callback only on request', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host), onJump = vi.fn();
    try {
      act(() => root.render(React.createElement(sky.ObservatoryNightPlan, { React, t: (_key, fallback) => fallback, resolved: MAINE, targets: [SIRIUS], onJump })));
      expect(onJump).not.toHaveBeenCalled();
      act(() => host.querySelector('button').click());
      const expected = plan([SIRIUS]).rows[0];
      expect(onJump).toHaveBeenCalledWith(expected.best.t, expected.target);
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('withholds modern night recommendations in deep time and guides an empty list', () => {
    const deep = render([SIRIUS], { deepTime: true });
    expect(deep).toContain('Return to Today');
    expect(deep).not.toContain('<svg');
    expect(render([])).toContain('Add objects to tonight’s list');
  });
});
