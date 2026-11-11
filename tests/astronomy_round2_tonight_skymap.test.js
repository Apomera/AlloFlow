// Round 2 of the Night Sky pass. A class meets in daylight, so "now" is the wrong sky to open on:
// the Tonight list, the Sky Map and the meteor simulator now agree on THIS EVENING at the chosen
// place, the card title matches what it lists, later risings are computed, and a predict-then-check
// card asks which way the sky turns and answers from the engine.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
const PORTLAND = { lat: 43.66, lon: -70.26, timeZone: 'America/New_York' };
const SYDNEY = { lat: -33.87, lon: 151.21, timeZone: 'Australia/Sydney' };
const TROMSO = { lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' };
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], ...state } }), 'text/html');
const NOV9 = { obsSite: 'portland', obsLive: false, obsDate: '2026-11-09', obsTime: '21:00' };
const altOf = (id, ms, place) => { const sky = P.observatoryBodies(ms, place.lat, place.lon); return (id === 'moon' ? sky.moon : sky.planets.find(p => p.id === id)).alt; };

describe('later tonight', () => {
  it('lists only bodies that are not up at dusk, at the first ten minutes the engine puts them 10 degrees up', () => {
    for (const [place, when] of [[PORTLAND, Date.UTC(2026, 10, 9, 20)], [SYDNEY, Date.UTC(2027, 0, 15, 3)], [PORTLAND, Date.UTC(2026, 5, 21, 20)]]) {
      const plan = P.tonightPlan(when, place);
      expect(plan.later.length).toBeGreaterThan(0);
      for (const item of plan.later) {
        expect(plan.planets.map(p => p.id)).not.toContain(item.id);
        // Geometric altitude here; the engine adds refraction (under 0.1 degree at this height).
        expect(altOf(item.id, item.utcMs, place)).toBeGreaterThanOrEqual(9.9);
        expect(altOf(item.id, item.utcMs - 600000, place)).toBeLessThan(10.1);
        expect(item.utcMs).toBeGreaterThan(plan.evening.utcMs);
        expect(P.observatoryBodies(item.utcMs, place.lat, place.lon).sun.alt).toBeLessThan(-8);
      }
    }
  });
  it('matches the known sky: Mars and Jupiter rise together around midnight in November 2026', () => {
    const later = P.tonightPlan(Date.UTC(2026, 10, 9, 20), PORTLAND).later;
    expect(later.map(l => l.id)).toEqual(['mars', 'jupiter', 'venus']);
    const hour = id => Number(later.find(l => l.id === id).timeText.slice(0, 2));
    expect([23, 0]).toContain(hour('jupiter'));
    expect(hour('venus')).toBeGreaterThanOrEqual(4);
    expect(later.find(l => l.id === 'jupiter').dir).toMatch(/^E/);
  });
  it('is empty when the night never gets dark', () => {
    expect(P.tonightPlan(Date.UTC(2026, 5, 21, 20), TROMSO).later).toEqual([]);
  });
});

describe('the Tonight card', () => {
  it('titles itself by what it lists', () => {
    const two = doc({ tab: 'tonight', ...NOV9 }).querySelector('#astronomy-tonight-plan');
    expect(two.querySelector('#astronomy-tonight-things').getAttribute('data-tonight-count')).toBe('2');
    expect(two.textContent).toContain('Two things to see tonight');
    const three = doc({ tab: 'tonight', ...NOV9, obsDate: '2026-12-21' }).querySelector('#astronomy-tonight-plan');
    expect(three.querySelectorAll('#astronomy-tonight-things li').length).toBe(3);
    expect(three.textContent).toContain('Three things to see tonight');
    const none = doc({ tab: 'tonight', obsSite: 'custom', obsLat: TROMSO.lat, obsLon: TROMSO.lon, obsTz: TROMSO.timeZone, obsLive: false, obsDate: '2026-06-21', obsTime: '21:00' }).querySelector('#astronomy-tonight-plan');
    expect(none.querySelector('#astronomy-tonight-things')).toBeNull();
    expect(none.textContent).toContain('Tonight’s sky');
    expect(none.textContent).not.toMatch(/(One|Two|Three) things? to see/);
  });
  it('says what rises later, from the plan', () => {
    const d = doc({ tab: 'tonight', ...NOV9 });
    const plan = P.tonightPlan(P.observingWallInstant('2026-11-09', '21:00', 'America/New_York'), PORTLAND);
    const later = d.querySelector('#astronomy-tonight-later');
    expect(later.getAttribute('data-tonight-later')).toBe(plan.later.map(l => l.id + '@' + l.timeText).join(','));
    expect(later.textContent).toContain('Later tonight: Mars climbs above 10° in the ' + plan.later[0].dir + ' at about ' + plan.later[0].timeText);
  });
  it('comes before the simulator shortcuts and offers a copy of the plan', () => {
    const d = doc({ tab: 'tonight', ...NOV9 });
    const plan = d.querySelector('#astronomy-tonight-plan'), sims = d.querySelector('#astronomy-simulator-starts');
    expect(plan.compareDocumentPosition(sims) & 4).toBe(4);   // 4 = sims FOLLOWS the plan
    expect(d.querySelector('#astronomy-tonight-copy').textContent).toContain('Copy this plan');
    expect(d.querySelector('#astronomy-tonight-open-map')).not.toBeNull();
  });
});

describe('the meteor simulator starts from Your sky', () => {
  it('uses the chosen darkness until the slider is moved', () => {
    const value = state => /id="astr-sim-bortle"[^>]*aria-valuetext="([^"]+)"|aria-valuetext="(Bortle \d)" aria-describedby="astronomy-meteor-rate-status"/.exec(renderTool('astronomy', { astronomy: { observingList: [], tab: 'meteors', ...state } })).slice(1).find(Boolean);
    expect(value({ bortleClass: 6 })).toBe('Bortle 6');
    expect(value({ obsBortle: 2 })).toBe('Bortle 2');
    expect(value({ bortleClass: 6, simBortleSim: 8 })).toBe('Bortle 8');
  });
});

describe('skyTurnChallenge', () => {
  it('asks only about bodies that clearly climb or sink, and answers from the engine', () => {
    let east = 0, west = 0;
    for (const place of [PORTLAND, SYDNEY]) for (let step = 0; step < 40; step++) {
      const when = Date.UTC(2026, 10, 10, 22) + step * 7 * 3600000 * 5;
      for (const item of P.skyTurnChallenge(when, place)) {
        const now = P.observatoryBodies(when, place.lat, place.lon), later = P.observatoryBodies(when + 3 * 3600000, place.lat, place.lon);
        const find = sky => item.key === 'moon' ? sky.moon : item.key.startsWith('planet:') ? sky.planets.find(p => 'planet:' + p.id === item.key) : sky.stars.find(st => 'star:' + st.name === item.key);
        const a = find(now), b = find(later);
        // Only after dark, and only stars the map labels then, so the student can find what is asked about.
        expect(now.sun.alt).toBeLessThanOrEqual(-6);
        if (item.kind === 'star') expect(a.mag).toBeLessThan(0.9);
        expect(a.alt).toBeGreaterThanOrEqual(12);
        expect(Math.abs(b.alt - a.alt)).toBeGreaterThanOrEqual(8);
        expect(item.answer).toBe(b.alt < 0 ? 'set' : b.alt > a.alt ? 'higher' : 'lower');
        expect(item.alt).toBe(Math.round(a.alt));
        expect(item.altLater).toBe(Math.round(b.alt));
        const az = ((a.az % 360) + 360) % 360;
        if (az < 180) { east++; expect(item.answer).toBe('higher'); } else { west++; expect(item.answer).not.toBe('higher'); }
      }
    }
    expect(east).toBeGreaterThan(10);
    expect(west).toBeGreaterThan(10);
  });
  it('is not asked in daylight, when the map cannot show the stars it would ask about', () => {
    expect(P.skyTurnChallenge(Date.UTC(2026, 10, 10, 17, 0), PORTLAND)).toEqual([]);   // local noon
    expect(doc({ tab: 'skymap', skyLoc: 'portland', skyAnchorUtc: Date.UTC(2026, 10, 10, 17, 0) }).querySelector('#astronomy-sky-turn')).toBeNull();
    expect(P.skyTurnChallenge(Date.UTC(2026, 10, 10, 22, 5), PORTLAND).length).toBeGreaterThan(0);
  });
  it('returns nothing for bad input', () => {
    expect(P.skyTurnChallenge(NaN, PORTLAND)).toEqual([]);
    expect(P.skyTurnChallenge(Date.now(), null)).toEqual([]);
    expect(P.skyTurnChallenge(Date.now(), { lat: 'x', lon: 2 })).toEqual([]);
  });
});

describe('the Sky Map', () => {
  const DUSK = Date.UTC(2026, 10, 10, 22, 5);       // 17:05 in Portland, Maine
  const NOON = Date.UTC(2026, 10, 10, 17, 0);
  const map = state => doc({ tab: 'skymap', skyLoc: 'portland', ...state });
  it('offers this evening, computed for the map’s place, and says what moment is showing', () => {
    const d = map({});
    const wall = P.utcMsToWallTime(Date.now(), PORTLAND.timeZone);
    const evening = P.eveningInstant(wall.year, wall.month, wall.day, PORTLAND);
    const button = d.querySelector('#astronomy-sky-tonight');
    expect(button.textContent).toContain('Tonight (' + P.utcMsToWallTime(evening.utcMs, PORTLAND.timeZone).timeText + ')');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(d.querySelector('#astronomy-sky-shown-time').textContent).toMatch(/^Showing .+\(local time at this place\)$/);
  });
  it('explains a daytime map and points at Tonight; the hint goes once this evening is showing', () => {
    const day = map({ skyAnchorUtc: NOON });
    expect(day.querySelector('#astronomy-sky-daytime-hint').textContent).toContain('Press Tonight');
    const eve = map({ skyAnchorUtc: DUSK, skyAnchorSrc: 'tonight' });
    expect(eve.querySelector('#astronomy-sky-daytime-hint')).toBeNull();
    expect(eve.querySelector('#astronomy-sky-carried-place').textContent).toContain('Showing this evening, once the sky is dark.');
    expect(map({ skyAnchorUtc: DUSK }).querySelector('#astronomy-sky-carried-place').textContent).toContain('Time set in Observatory.');
  });
  it('asks the turning-sky question for the bodies the engine picked, and holds the answer back until checked', () => {
    const items = P.skyTurnChallenge(DUSK, PORTLAND);
    expect(items.map(i => i.key)).toEqual(['planet:saturn', 'star:Vega']);
    expect(items.map(i => i.answer)).toEqual(['higher', 'lower']);
    const fresh = map({ skyAnchorUtc: DUSK, skyAnchorSrc: 'tonight' });
    const card = fresh.querySelector('#astronomy-sky-turn');
    expect(card.getAttribute('data-turn-items')).toBe('planet:saturn,star:Vega');
    expect(card.querySelectorAll('fieldset').length).toBe(2);
    expect(card.querySelector('legend').textContent).toBe('Saturn is ' + items[0].alt + '° above the horizon in the ' + items[0].dir + '. Where will it be 3 hours later?');
    expect(card.querySelector('[data-turn-correct]')).toBeNull();
    expect(card.querySelector('#astronomy-sky-turn-feedback').textContent).toBe('');
    expect(card.querySelector('#astronomy-sky-turn-watch')).toBeNull();
    expect(card.textContent).not.toContain(items[0].altLater + '° in the ' + items[0].dirLater);
  });
  it('marks each prediction against the engine and offers to turn the map', () => {
    const sig = 'planet:saturn=higher|star:Vega=lower';
    const state = { skyAnchorUtc: DUSK, skyAnchorSrc: 'tonight', skyTurnSig: sig, skyTurnPicks: { 'planet:saturn': 'higher', 'star:Vega': 'set' } };
    const unchecked = map(state).querySelector('#astronomy-sky-turn');
    expect(unchecked.querySelector('[data-turn-correct]')).toBeNull();
    expect(unchecked.querySelectorAll('input[type="radio"]:checked, input[type="radio"][checked]').length).toBe(2);
    const card = map({ ...state, skyTurnChecked: sig }).querySelector('#astronomy-sky-turn');
    expect([...card.querySelectorAll('[data-turn-correct]')].map(p => p.getAttribute('data-turn-correct'))).toEqual(['true', 'false']);
    const items = P.skyTurnChallenge(DUSK, PORTLAND);
    expect(card.textContent).toContain('Right. Saturn moves from ' + items[0].alt + '° in the ' + items[0].dir + ' to ' + items[0].altLater + '° in the ' + items[0].dirLater + '.');
    expect(card.textContent).toContain('Not quite. Vega moves from ' + items[1].alt + '°');
    expect(card.querySelector('#astronomy-sky-turn-feedback').textContent).toContain('1 of 2 correct.');
    expect(card.querySelector('#astronomy-sky-turn-watch').textContent).toContain('3 hours ahead');
  });
  it('ignores answers saved for a different question, and hostile saved shapes', () => {
    const stale = map({ skyAnchorUtc: DUSK, skyTurnSig: 'star:Sirius=higher', skyTurnPicks: { 'planet:saturn': 'higher', 'star:Vega': 'lower' }, skyTurnChecked: 'star:Sirius=higher' }).querySelector('#astronomy-sky-turn');
    expect(stale.querySelector('[data-turn-correct]')).toBeNull();
    // Answers stamped for another question are not shown or marked, even when the check stamp matches this one.
    const current = 'planet:saturn=higher|star:Vega=lower';
    const moved = map({ skyAnchorUtc: DUSK, skyTurnSig: 'star:Sirius=higher', skyTurnPicks: { 'planet:saturn': 'higher', 'star:Vega': 'lower' }, skyTurnChecked: current }).querySelector('#astronomy-sky-turn');
    expect(moved.querySelector('[data-turn-correct]')).toBeNull();
    expect(moved.querySelectorAll('input[type="radio"][checked]').length).toBe(0);
    expect(map({ skyAnchorUtc: DUSK, skyTurnSig: current, skyTurnPicks: { 'planet:saturn': 'higher', 'star:Vega': 'lower' } }).querySelectorAll('#astronomy-sky-turn input[type="radio"][checked]').length).toBe(2);
    for (const picks of [null, 'x', [1, 2], { 'planet:saturn': { toString: null }, 'star:Vega': 7 }, JSON.parse('{"__proto__":{"planet:saturn":"higher"}}'), Object.create({ 'planet:saturn': 'higher', 'star:Vega': 'lower' })]) {
      const sig = 'planet:saturn=higher|star:Vega=lower';
      const card = map({ skyAnchorUtc: DUSK, skyTurnSig: sig, skyTurnPicks: picks, skyTurnChecked: sig }).querySelector('#astronomy-sky-turn');
      expect(card).not.toBeNull();
      expect(card.querySelector('[data-turn-correct]')).toBeNull();
    }
  });
  it('never lays a label over another body’s marker (the Sun label used to sit on Mercury)', () => {
    let labels = 0, crowded = 0;
    for (let step = 0; step < 36; step++) {
      const when = Date.UTC(2026, 10, 10, 11, 40) + step * 2 * 3600000;
      const d = map({ skyAnchorUtc: when, skyLoc: step % 2 ? 'sydney' : 'portland' });
      const markers = [...d.querySelectorAll('#astronomy-sky-map-diagram [data-sky-layer="planets"] circle[data-sky-object]')].map(c => ({ key: c.getAttribute('data-sky-object'), x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')) }));
      const sun = d.querySelector('#astronomy-sky-map-diagram [data-sky-layer="sun-moon"] circle[fill="#fde047"]');
      if (sun) markers.push({ key: 'sun', x: Number(sun.getAttribute('cx')), y: Number(sun.getAttribute('cy')) });
      for (let i = 0; i < markers.length; i++) for (let k = i + 1; k < markers.length; k++) if (Math.hypot(markers[i].x - markers[k].x, markers[i].y - markers[k].y) < 30) crowded++;
      for (const text of d.querySelectorAll('#astronomy-sky-map-diagram text[data-sky-label]')) {
        labels++;
        const size = Number(text.getAttribute('font-size')), width = Math.max(18, text.textContent.length * size * 0.56), anchor = text.getAttribute('text-anchor');
        const x = Number(text.getAttribute('x')), y = Number(text.getAttribute('y'));
        const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x, top = y - size - 1;
        for (const marker of markers) {
          if (marker.key === text.getAttribute('data-sky-label')) continue;
          const inside = marker.x > left && marker.x < left + width && marker.y > top && marker.y < top + size + 4;
          expect(inside, text.textContent + ' covers ' + marker.key + ' at step ' + step).toBe(false);
        }
      }
    }
    expect(labels).toBeGreaterThan(60);
    expect(crowded).toBeGreaterThan(5);   // the sample really contains close pairs
  }, 120000);
});
