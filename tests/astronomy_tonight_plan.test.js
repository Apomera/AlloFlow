// Tonight used to describe the planets in general terms ("planning approximation") although the
// tool has a real ephemeris. It now lists what is actually up this evening for the chosen place,
// the next Moon phases and the next meteor shower, all computed (no network).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
const PORTLAND = { lat: 43.66, lon: -70.26, timeZone: 'America/New_York' };
const SYDNEY = { lat: -33.87, lon: 151.21, timeZone: 'Australia/Sydney' };
const TROMSO = { lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' };
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], ...state } }), 'text/html');
const hours = (a, b) => Math.abs(a - b) / 3600000;

describe('nextMoonPhases', () => {
  it('finds the published phase times for November-December 2026 to within half an hour', () => {
    const phases = P.nextMoonPhases(Date.UTC(2026, 10, 9, 20), 4);
    expect(phases.map(p => p.kind)).toEqual(['firstQuarter', 'full', 'lastQuarter', 'new']);
    // Almanac (UTC): First Quarter 17 Nov 11:48, Full 24 Nov 14:53, Last Quarter 1 Dec 06:09, New 9 Dec 00:52.
    const almanac = [Date.UTC(2026, 10, 17, 11, 48), Date.UTC(2026, 10, 24, 14, 53), Date.UTC(2026, 11, 1, 6, 9), Date.UTC(2026, 11, 9, 0, 52)];
    phases.forEach((phase, i) => expect(hours(phase.utcMs, almanac[i])).toBeLessThan(0.5));
  });
  it('agrees with the engine: illumination is 0, 50 or 100 percent at each returned instant', () => {
    for (const phase of P.nextMoonPhases(Date.UTC(2027, 2, 3), 8)) {
      const illum = P.moonPhaseAt(P.astroDayNumber(...ymdh(phase.utcMs))).illum;
      const expected = { new: 0, full: 1, firstQuarter: 0.5, lastQuarter: 0.5 }[phase.kind];
      expect(Math.abs(illum - expected)).toBeLessThan(0.01);
    }
  });
  it('returns nothing for a bad instant', () => { expect(P.nextMoonPhases(NaN, 4)).toEqual([]); });
});
function ymdh(ms) { const d = new Date(ms); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600]; }

describe('nextMeteorShower', () => {
  it('picks the next peak night by date, wrapping into the next year', () => {
    expect(P.nextMeteorShower(2026, 11, 9)).toMatchObject({ id: 'leonids', days: 8, year: 2026 });
    expect(P.nextMeteorShower(2026, 11, 17)).toMatchObject({ id: 'leonids', days: 0 });
    expect(P.nextMeteorShower(2026, 11, 18)).toMatchObject({ id: 'geminids', days: 25 });
    expect(P.nextMeteorShower(2026, 12, 23)).toMatchObject({ id: 'quadrantids', days: 11, year: 2027 });
    expect(P.nextMeteorShower(2026, 8, 12)).toMatchObject({ id: 'perseids', days: 0 });
  });
});

describe('tonightPlan', () => {
  it('uses an evening instant when the Sun is 9 degrees down', () => {
    const plan = P.tonightPlan(Date.UTC(2026, 10, 9, 20), PORTLAND);
    expect(plan.date).toBe('2026-11-09');
    expect(plan.evening).toMatchObject({ sunAlt: -9, bright: false, daylight: false });
    const sun = P.observatoryBodies(plan.evening.utcMs, PORTLAND.lat, PORTLAND.lon).sun;
    expect(sun.alt).toBeLessThanOrEqual(-8.9);
    expect(sun.alt).toBeGreaterThan(-10.5);
  });
  it('lists exactly the planets the engine puts at least 10 degrees up at that instant, with their real direction', () => {
    for (const [place, when] of [[PORTLAND, Date.UTC(2026, 10, 9, 20)], [SYDNEY, Date.UTC(2026, 5, 21, 20)], [PORTLAND, Date.UTC(2026, 11, 21, 20)], [SYDNEY, Date.UTC(2027, 2, 1, 3)]]) {
      const plan = P.tonightPlan(when, place);
      const sky = P.observatoryBodies(plan.evening.utcMs, place.lat, place.lon);
      const expected = sky.planets.filter(p => p.alt >= 10).map(p => p.id).sort();
      expect(plan.planets.map(p => p.id).sort()).toEqual(expected);
      for (const listed of plan.planets) {
        const body = sky.planets.find(p => p.id === listed.id);
        expect(listed.alt).toBe(Math.round(body.alt));
        expect(listed.dir).toBe(P.compassPoint(body.az));
      }
    }
  });
  it('matches the known sky: Saturn is the evening planet in November 2026; Venus, Jupiter and Mercury share the June 2026 dusk', () => {
    expect(P.tonightPlan(Date.UTC(2026, 10, 9, 20), PORTLAND).planets.map(p => p.id)).toEqual(['saturn']);
    expect(P.tonightPlan(Date.UTC(2026, 5, 21, 20), SYDNEY).planets.map(p => p.id)).toEqual(['venus', 'jupiter', 'mercury']);
  });
  it('leaves a New Moon out and includes a lit Moon that is up', () => {
    const newMoon = P.tonightPlan(Date.UTC(2026, 10, 9, 20), PORTLAND);
    expect(newMoon.moon.up).toBe(false);
    expect(newMoon.things.map(t => t.kind)).toEqual(['planet', 'star']);
    const gibbous = P.tonightPlan(Date.UTC(2026, 11, 21, 20), PORTLAND);
    expect(gibbous.moon).toMatchObject({ up: true, phase: 'Waxing Gibbous' });
    expect(gibbous.things[0].kind).toBe('moon');
    expect(gibbous.things.length).toBeLessThanOrEqual(3);
  });
  it('reports a pairing only when two bodies are within 3 degrees, and measures it with the engine', () => {
    let seen = 0;
    for (let day = 0; day < 400; day += 3) {
      const plan = P.tonightPlan(Date.UTC(2026, 0, 1, 20) + day * 86400000, PORTLAND);
      for (const pair of plan.pairings) {
        seen++;
        const sky = P.observatoryBodies(plan.evening.utcMs, PORTLAND.lat, PORTLAND.lon);
        const body = id => id === 'moon' ? sky.moon : sky.planets.find(p => p.id === id);
        const sep = P.angularSep(body(pair.a).ra, body(pair.a).dec, body(pair.b).ra, body(pair.b).dec);
        expect(sep).toBeLessThanOrEqual(3);
        expect(pair.sep).toBeCloseTo(sep, 1);
        expect(Math.min(body(pair.a).alt, body(pair.b).alt)).toBeGreaterThanOrEqual(5);
      }
    }
    expect(seen).toBeGreaterThan(0);
  }, 120000);
  it('handles the midnight sun and the polar night without inventing a dark sky', () => {
    const midsummer = P.tonightPlan(Date.UTC(2026, 5, 21, 20), TROMSO);
    expect(midsummer.evening).toMatchObject({ bright: true, daylight: true });
    expect(midsummer.things.every(t => t.kind === 'moon' || (t.kind === 'planet' && ['venus', 'jupiter'].includes(t.planet.id)))).toBe(true);
    const polarNight = P.tonightPlan(Date.UTC(2026, 11, 21, 20), TROMSO);
    expect(polarNight.evening.bright).toBe(false);
    expect(polarNight.evening.sunAlt).toBeLessThanOrEqual(-9);
  });
  it('rejects bad input', () => {
    expect(P.tonightPlan(NaN, PORTLAND)).toBeNull();
    expect(P.tonightPlan(Date.now(), { lat: 1, lon: 2, timeZone: 'Not/AZone' })).toBeNull();
    expect(P.tonightPlan(Date.now(), null)).toBeNull();
  });
});

describe('the Tonight tab', () => {
  const state = { tab: 'tonight', obsSite: 'portland', obsLive: false, obsDate: '2026-11-09', obsTime: '21:00' };
  it('shows the computed list for the chosen place and date instead of the generic paragraph', () => {
    const d = doc(state);
    const card = d.querySelector('#astronomy-tonight-plan');
    const plan = P.tonightPlan(P.observingWallInstant('2026-11-09', '21:00', 'America/New_York'), PORTLAND);
    expect(card.getAttribute('data-astronomy-tonight')).toBe('2026-11-09@' + plan.evening.timeText);
    // Two things qualify on this night (Saturn and one star), and the title says so.
    expect(plan.things.length).toBe(2);
    expect(card.textContent).toContain('Two things to see tonight');
    expect(card.textContent).not.toContain('Three things');
    expect(card.textContent).toContain('Calculated for Portland, Maine on 2026-11-09 at about ' + plan.evening.timeText);
    const items = [...card.querySelectorAll('#astronomy-tonight-things li')];
    expect(items.map(li => li.getAttribute('data-tonight-kind'))).toEqual(plan.things.map(t => t.kind));
    expect(items[0].textContent).toContain('Saturn: look ' + plan.planets[0].dir + ', ' + plan.planets[0].alt + '° above the horizon.');
    expect(d.body.textContent).not.toContain('planning approximation');
    expect(d.body.textContent).not.toContain('can all be visible to the naked eye depending on the date');
  });
  it('lists the next Moon phases and the next meteor shower by date', () => {
    const coming = doc(state).querySelector('#astronomy-tonight-coming');
    // Dates read as "Tue, Nov 17" in the reader's own locale, on the place's calendar (New Moon is 9 Dec in UTC, 8 Dec in Maine).
    const day = (y, m, d) => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
    expect([...coming.querySelectorAll('[data-moon-phase]')].map(li => li.textContent)).toEqual([
      'First Quarter: ' + day(2026, 11, 17), 'Full Moon: ' + day(2026, 11, 24), 'Last Quarter: ' + day(2026, 12, 1), 'New Moon: ' + day(2026, 12, 8)]);
    expect(coming.querySelector('[data-next-shower]').getAttribute('data-next-shower')).toBe('leonids');
    expect(coming.textContent).toContain('Leonids meteor shower: peak night in 8 days.');
  });
  it('gives a different, correct list for another place on the same night', () => {
    const d = doc({ ...state, obsSite: 'sydney' });
    const plan = P.tonightPlan(P.observingWallInstant('2026-11-09', '21:00', 'Australia/Sydney'), SYDNEY);
    expect(d.querySelector('#astronomy-tonight-plan').textContent).toContain('Calculated for Sydney, Australia on 2026-11-09 at about ' + plan.evening.timeText);
    expect(d.querySelector('#astronomy-tonight-things').textContent).toContain('Saturn: look ' + plan.planets[0].dir + ', ' + plan.planets[0].alt + '°');
  });
});

describe('Meteors and Moon open somewhere useful', () => {
  it('Meteors opens on the next shower by date at the place, and keeps an explicit choice', () => {
    const fixed = { tab: 'meteors', obsSite: 'portland', obsLive: false, obsTime: '21:00' };
    const pressed = d => [...d.querySelectorAll('[aria-pressed="true"], [aria-selected="true"], [aria-checked="true"]')].map(el => el.textContent).join(' | ');
    expect(pressed(doc({ ...fixed, obsDate: '2026-11-09' }))).toContain('Leonids');
    expect(pressed(doc({ ...fixed, obsDate: '2026-11-09' }))).not.toContain('Perseids');
    expect(pressed(doc({ ...fixed, obsDate: '2026-07-20' }))).toContain('Perseids');
    expect(pressed(doc({ ...fixed, obsDate: '2026-11-09', selectedShower: 'geminids' }))).toContain('Geminids');
  });
  it('the Moon tab explains a New Moon instead of showing only a dark disc', () => {
    const fresh = doc({ tab: 'moon' });
    expect(fresh.querySelector('#astronomy-new-moon-prompt').textContent).toContain('This is a New Moon.');
    expect(fresh.querySelector('#astronomy-new-moon-prompt').textContent).toContain('Show today’s Moon');
    expect(doc({ tab: 'moon', moonAgeDays: 7.4 }).querySelector('#astronomy-new-moon-prompt')).toBeNull();
  });
});
