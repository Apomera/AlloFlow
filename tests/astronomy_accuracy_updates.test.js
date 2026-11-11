// Factual corrections and stale-claim removal in the Night Sky tool (2026-11 review).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let P;
const source = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
afterEach(() => { vi.useRealTimers(); });
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], ...state } }), 'text/html');

describe('tour notes', () => {
  it('does not put the Magellanic Clouds "millions of light-years" away', () => {
    for (const id of ['lmc', 'smc']) {
      const note = P.deepSkyTourNote({ id, type: 'galaxy' });
      expect(note).toContain('160,000 to 200,000 light-years');
      expect(note).not.toContain('millions of light-years');
    }
    expect(P.deepSkyTourNote({ id: 'm31', type: 'galaxy' })).toContain('millions of light-years');
    expect(P.deepSkyTourNote({ id: 'm13', type: 'globular' })).toContain('globular cluster');
    expect(P.deepSkyTourNote(null)).toBe('');
  });
  it('recommends a planet only when it is at least 10 degrees up, the same floor as the planet list', () => {
    const base = { dark: 1, limit: 6, bodies: { moon: { alt: -20, phase: { name: 'New Moon', illum: 0 } }, stars: [], planets: [] } };
    const tour = alt => P.observatoryTour({ ...base, bodies: { ...base.bodies, planets: [{ id: 'mars', name: 'Mars', alt, az: 70 }] } });
    expect(P.TOUR_MIN_ALT).toBe(10);
    expect(tour(4).some(step => step.kind === 'planet')).toBe(false);
    expect(tour(9.9).some(step => step.kind === 'planet')).toBe(false);
    expect(tour(10).find(step => step.kind === 'planet')).toMatchObject({ id: 'mars' });
    // A higher, fainter planet beats a brighter one that is still in the horizon haze.
    const mixed = P.observatoryTour({ ...base, bodies: { ...base.bodies, planets: [{ id: 'venus', name: 'Venus', alt: 4, az: 250 }, { id: 'saturn', name: 'Saturn', alt: 30, az: 150 }] } });
    expect(mixed.find(step => step.kind === 'planet').id).toBe('saturn');
  });
});

describe('teaching text', () => {
  it('states corrected facts', () => {
    expect(source).toContain('its Ingenuity helicopter flew 72 times before ending operations in January 2024');
    expect(source).not.toContain('Perseverance + Ingenuity (active 2021-now)');
    expect(source).toContain('hit the upper atmosphere at 11 to 72 km/s');
    expect(source).not.toContain('at ~70 km/s and burn up');
    expect(source).toContain('The Leonids (Nov 17-18) are usually modest but are famous for rare meteor storms.');
    expect(source).not.toContain('Leonids (Nov 17-18) are the strongest');
    expect(source).toContain('the comet 3I/ATLAS, was discovered in July 2025, so three are known as of 2025');
    expect(source).not.toContain('closing the question of whether interstellar visitors are rare');
    expect(source).toContain('first light planned for the late 2020s');
  });
  it('makes no dated "upcoming" comet claim and names no social-media accounts', () => {
    expect(source).not.toContain('Reliable upcoming events');
    expect(source).not.toContain('C/2025 G1 SWAN');
    expect(source).not.toMatch(/@JOhnsonOttawa|@astrofrog/);
    expect(source).not.toContain('Twitter accounts of comet experts');
    expect(source).toContain('Recent examples, as of 2025');
  });
  it('gives changed registered strings a new key, so an old translation is never shown for new English', () => {
    for (const key of ['in_october_2017_astronomers_detected_a', 'when_a_bright_comet_is_in_the_sky_obse', 'iau_minor_planet_center_minorplanetcen', 'seti_home_shut_down_in_2020_after_20_y', 'northern_interior_maine_aroostook_pisc', 'many_stars_look_the_same_night_after_n', 'reducing_real_astronomy_to_western_tra']) {
      expect(source).toContain("__alloT('stem.astronomy." + key + "_v2'");
      expect(source).not.toContain("__alloT('stem.astronomy." + key + "'");
    }
  });
});

describe('Tonight details', () => {
  it('says "1 day", not "1 days", into the lunar cycle', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 10, 8)));   // about one day after the 9 Nov 07:02 UTC new moon
    const text = doc({ tab: 'tonight', obsSite: 'portland' }).body.textContent;
    expect(text).toContain('lit (~1 day into the lunar cycle).');
    expect(text).not.toContain('1 days into');
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 14, 8)));
    expect(doc({ tab: 'tonight', obsSite: 'portland' }).body.textContent).toContain('lit (~5 days into the lunar cycle).');
  });
  it('asks the daily question about the date AT the chosen place, the same date the hero shows', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 9, 20)));   // still 9 Nov in the Americas, already 10 Nov in Sydney
    const d = doc({ tab: 'tonight', obsSite: 'sydney' });
    const daily = d.querySelector('[aria-labelledby="astronomy-daily-title"]').textContent;
    const hero = d.querySelector('figcaption').textContent;
    expect(hero).toContain('2026-11-10');
    expect(daily).toContain('2026-11-10');
    expect(daily).not.toContain('2026-11-09');
  });
});
