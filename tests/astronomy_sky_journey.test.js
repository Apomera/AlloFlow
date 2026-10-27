import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
// The 1.9 MB tool source lives on OneDrive; first reads can exceed vitest's 5 s default.
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });

const SOURCE = readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
const SIRIUS = { kind: 'star', name: 'Sirius', hip: 32349, ra: 101.287, dec: -16.716 };
const SITES = [
  { id: 'moosehead', lat: 45.58, lon: -69.72, timeZone: 'America/New_York' },
  { id: 'quito', lat: -0.18, lon: -78.47, timeZone: 'America/Guayaquil' },
  { id: 'sydney', lat: -33.87, lon: 151.21, timeZone: 'Australia/Sydney' },
  { id: 'tromso', lat: 69.65, lon: 18.96, timeZone: 'Europe/Oslo' }
];
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });

const ymd = n => { const d = new Date(Date.UTC(2026, 0, 1) + n * 86400000); return d.toISOString().slice(0, 10); };
const emptyAdvance = (patch, prior = {}, next = {}) => P.journeyAdvance(prior, { ...prior, ...next, ...patch }, patch, '2026-10-25');

describe('Journey state is untrusted input', () => {
  it('drops everything it cannot verify and bounds what it keeps', () => {
    const j = P.normalizeJourney({
      seen: { observatory: true, 'not-a-tab': true, moon: 'yes' },
      found: ['star:1', 'star:1', 'weird kind:2', 5, 'x'.repeat(200), ...Array.from({ length: 500 }, (_, i) => 'star:' + (1000 + i))],
      sites: ['moosehead', 'atlantis'], traditions: ['wabanaki', '<script>'], patterns: 9999,
      flags: { drift: true, hacked: true, daily: 1 },
      done: { first_look: '2026-10-25', name_it: '2026-13-45', nonsense: '2026-10-25' },
      paid: { first_look: true, name_it: true, five_lights: true },
      days: ['2026-10-25', '2026-10-25', 'yesterday', ...Array.from({ length: 200 }, (_, i) => ymd(i))],
      daily: { day: '2026-10-25', sig: 'ab12', pick: 99, correct: true }
    });
    expect(Object.keys(j.seen)).toEqual(['observatory']);
    expect(j.found.length).toBeLessThanOrEqual(200);
    expect(j.found.every(k => /^star:\d+$/.test(k))).toBe(true);
    expect(new Set(j.found).size).toBe(j.found.length);
    expect(j.sites).toEqual(['moosehead']);
    expect(j.traditions).toEqual(['wabanaki']);
    expect(j.patterns).toBe(0);
    expect(j.flags).toEqual({ drift: true });
    expect(j.done).toEqual({ first_look: '2026-10-25' });
    expect(j.paid).toEqual({ first_look: true });
    expect(j.days.length).toBeLessThanOrEqual(90);
    expect([...j.days].sort()).toEqual(j.days);
    expect(j.daily).toBeNull();
  });

  it('survives non-object saved state', () => {
    for (const raw of [null, undefined, 7, 'text', [], [1, 2], true]) {
      const j = P.normalizeJourney(raw);
      expect(j.found).toEqual([]);
      expect(j.done).toEqual({});
    }
  });

  it('a payout flag cannot exist without the mission it pays for', () => {
    expect(P.normalizeJourney({ paid: { first_look: true } }).paid).toEqual({});
  });
});

describe('Missions and XP', () => {
  it('adds up to exactly the host 100 XP per-activity cap, so a toast promise can never be refused', () => {
    expect(P.JOURNEY_MISSIONS.reduce((n, m) => n + m.xp, 0)).toBe(100);
    expect(new Set(P.JOURNEY_MISSIONS.map(m => m.id)).size).toBe(P.JOURNEY_MISSIONS.length);
  });

  it('ranks rise with completed missions and the top rank needs all of them', () => {
    const mins = P.JOURNEY_RANKS.map(r => r.min);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
    expect(mins[0]).toBe(0);
    expect(mins[mins.length - 1]).toBe(P.JOURNEY_MISSIONS.length);
    expect(P.journeyRank(0).id).toBe('stargazer');
    expect(P.journeyRank(P.JOURNEY_MISSIONS.length).id).toBe('cosmic_explorer');
    expect(P.journeyRank(P.JOURNEY_MISSIONS.length - 1).id).not.toBe('cosmic_explorer');
  });

  it('writes nothing for edits that are not progress', () => {
    expect(emptyAdvance({ askInput: 'hello' })).toBeNull();
    expect(emptyAdvance({ moonPhaseIdx: 3 })).toBeNull();
    expect(emptyAdvance({ obsDrift: 0 })).toBeNull();
  });

  it('records section visits and completes the Observatory mission', () => {
    const j = emptyAdvance({ tab: 'observatory' });
    expect(j.seen.observatory).toBe(true);
    expect(j.done.first_look).toBe('2026-10-25');
    expect(emptyAdvance({ tab: 'forged' })).toBeNull();
  });

  it('counts the same star once and needs five different objects', () => {
    let prior = {};
    const keys = [{ kind: 'star', hip: 1, name: 'A' }, { kind: 'star', hip: 1, name: 'A' }, { kind: 'star', hip: 2, name: 'B' }, { kind: 'planet', id: 'venus', name: 'Venus' }, { kind: 'moon', id: 'moon', name: 'Moon' }];
    for (const pick of keys) { const j = emptyAdvance({ obsPicked: pick }, prior); if (j) prior = { journey: j }; }
    expect(prior.journey.found).toEqual(['star:1', 'star:2', 'planet:venus', 'moon:moon']);
    expect(prior.journey.done.name_it).toBeTruthy();
    expect(prior.journey.done.wanderer).toBeTruthy();
    expect(prior.journey.done.five_lights).toBeUndefined();
    const fifth = emptyAdvance({ obsPicked: { kind: 'deepsky', id: 'm31', name: 'Andromeda' } }, prior);
    expect(fifth.done.five_lights).toBeTruthy();
    expect(fifth.done.deep_sky).toBeTruthy();
  });

  it('plans, travels and visits through the same patch keys the Observatory writes', () => {
    expect(emptyAdvance({ obsTargets: [] })).toBeNull();
    expect(emptyAdvance({ obsTargets: [{ kind: 'star', name: 'Broken' }] })).toBeNull();
    expect(emptyAdvance({ obsTargets: [SIRIUS] }).done.plan_night).toBeTruthy();
    expect(emptyAdvance({ obsDrift: 25000 }).done.time_traveler).toBeTruthy();
    expect(emptyAdvance({ obsSite: 'moosehead' }).done.new_place).toBeUndefined();
    expect(emptyAdvance({ obsSite: 'sydney' }).done.new_place).toBeTruthy();
    expect(emptyAdvance({ obsSite: 'atlantis' })).toBeNull();
    expect(emptyAdvance({ obsLat: 12 }).done.new_place).toBeTruthy();
  });

  it('needs three real constellations, not three entries', () => {
    expect(emptyAdvance({ observingList: ['orion', 'orion', 'nonsense'] }).patterns).toBe(1);
    expect(emptyAdvance({ observingList: ['orion', 'ursa_major', 'cassiopeia'] }).done.pattern_finder).toBeTruthy();
  });

  it('counts the tradition already on screen and the ones the learner switches to', () => {
    const first = emptyAdvance({ tab: 'indigenous' });
    expect(first.traditions).toEqual(['wabanaki']);
    expect(first.done.sky_traditions).toBeUndefined();
    const second = emptyAdvance({ selectedTradition: 'maori' }, { journey: first });
    expect(second.done.sky_traditions).toBeTruthy();
  });

  it('needs three different simulators', () => {
    let prior = {};
    for (const tab of ['moon', 'moon', 'eclipses']) { const j = emptyAdvance({ tab }, prior); if (j) prior = { journey: j }; }
    expect(prior.journey.done.simulators).toBeUndefined();
    expect(emptyAdvance({ tab: 'hrDiagram' }, prior).done.simulators).toBeTruthy();
  });

  it('grades the quiz mission from the real answers, not from a score the state claims', () => {
    const Q = P.QUIZ_QUESTIONS;
    const right = Q.map(q => q.answer);
    const wrong = Q.map(q => (q.answer + 1) % q.choices.length);
    const twelve = right.map((a, i) => (i < 12 ? a : wrong[i]));
    const eleven = right.map((a, i) => (i < 11 ? a : wrong[i]));
    expect(P.quizCorrectCount(right)).toBe(Q.length);
    expect(P.quizCorrectCount(wrong)).toBe(0);
    expect(P.quizCorrectCount([null, null])).toBe(0);
    expect(emptyAdvance({ quizSubmitted: true, quizCorrect: 15 }, {}, { quizAnswers: eleven }).done?.quiz_ace).toBeUndefined();
    expect(emptyAdvance({ quizSubmitted: true, quizCorrect: 0 }, {}, { quizAnswers: twelve }).done.quiz_ace).toBeTruthy();
    expect(emptyAdvance({ quizSubmitted: true }, {}, { quizAnswers: right.map((a, i) => (i === 3 ? null : a)) })).toBeNull();
  });

  it('never rolls the day over at UTC midnight', () => {
    expect(P.journeyDayKey(new Date(2026, 0, 1, 23, 30))).toBe('2026-01-01');
    expect(P.journeyDayKey(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31');
  });

  it('counts days in a row without ever punishing a gap', () => {
    expect(P.journeyDaysInARow(['2026-10-23', '2026-10-24', '2026-10-25'], '2026-10-25')).toBe(3);
    expect(P.journeyDaysInARow(['2026-10-23', '2026-10-24'], '2026-10-25')).toBe(2);
    expect(P.journeyDaysInARow(['2026-10-20'], '2026-10-25')).toBe(0);
    // 2026 is not a leap year: Feb 28 and Mar 1 are consecutive days.
    expect(P.journeyDaysInARow(['2026-02-28', '2026-03-01'], '2026-03-01')).toBe(2);
    expect(P.journeyDaysInARow(['2026-02-27', '2026-02-28', '2026-03-01'], '2026-03-01')).toBe(3);
    expect(P.journeyDaysInARow(['2026-02-27', '2026-03-01'], '2026-03-01')).toBe(1);
    expect(P.journeyDaysInARow(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01')).toBe(3);
    expect(P.journeyDaysInARow(['bad'], '2026-10-25')).toBe(0);
  });
});

describe("Today's sky question is computed from the sky the Observatory draws", () => {
  const all = [];
  beforeAll(() => { for (let n = 0; n < 120; n++) for (const site of SITES) all.push({ n, site, q: P.dailySkyQuestion(ymd(n), site) }); });
  const instantParts = q => { const t = new Date(q.utcMs); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours() + t.getUTCMinutes() / 60]; };

  it('always produces a well-formed question, even at the poles of the schedule', () => {
    for (const { q } of all) {
      expect(q).toBeTruthy();
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).toBe(true);
      expect(q.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('is deterministic and gives a stable signature that does not leak the answer', () => {
    const a = P.dailySkyQuestion('2026-10-25', SITES[0]), b = P.dailySkyQuestion('2026-10-25', SITES[0]);
    expect(a).toEqual(b);
    expect(P.dailySignature(a)).toBe(P.dailySignature(b));
    expect(P.dailySignature(a)).toMatch(/^[a-z0-9]{1,12}$/);
    expect(P.dailySignature(P.dailySkyQuestion('2026-10-26', SITES[0]))).not.toBe(P.dailySignature(a));
  });

  it('rejects places and days it cannot compute', () => {
    expect(P.dailySkyQuestion('2026-02-30', SITES[0])).toBeNull();
    expect(P.dailySkyQuestion('2026-10-25', { lat: NaN, lon: 0, timeZone: 'UTC' })).toBeNull();
    expect(P.dailySkyQuestion('2026-10-25', { lat: 10, lon: 0, timeZone: 'Not/AZone' })).toBeNull();
    expect(P.dailySkyQuestion('2026-10-25', null)).toBeNull();
  });

  it('uses every kind of question, so none is dead code', () => {
    expect(new Set(all.map(x => x.q.id))).toEqual(new Set(['moon_direction', 'higher_in_sky', 'planet_up', 'dark_hours', 'star_direction', 'moon_phase']));
  });

  // A year, so each kind of question is sampled often enough for a slot count to mean something.
  let year = [];
  beforeAll(() => { for (let n = 0; n < 365; n++) for (const site of SITES) year.push(P.dailySkyQuestion(ymd(n), site)); });

  it('keeps the correct answer out of a predictable slot', () => {
    // Choosing the question from seed % 6 and shuffling from seed % 3 once pinned the answer of two kinds to one slot.
    for (const id of ['moon_direction', 'higher_in_sky', 'planet_up', 'moon_phase', 'dark_hours']) {
      const rows = year.filter(q => q.id === id);
      expect(rows.length, id).toBeGreaterThan(40);
      const counts = {};
      rows.forEach(q => { counts[q.answer] = (counts[q.answer] || 0) + 1; });
      const slots = rows[0].options.length;
      expect(Object.keys(counts).length, id).toBe(slots);
      expect(Math.max(...Object.values(counts)) / rows.length, id).toBeLessThan(slots === 2 ? 0.62 : 0.5);
    }
  });

  it('does not let the spacing of the three hour options give the answer away', () => {
    const rows = year.filter(q => q.id === 'dark_hours');
    expect(rows.length).toBeGreaterThan(40);
    rows.forEach(q => { expect([...q.options].sort((a, b) => a - b)).toEqual(q.options); expect(new Set(q.options).size).toBe(3); expect(q.options[0]).toBeGreaterThanOrEqual(0); expect(q.options[2]).toBeLessThanOrEqual(24); });
    const rank = [0, 0, 0];
    rows.forEach(q => { rank[q.answer]++; });
    expect(Math.min(...rank) / rows.length).toBeGreaterThan(0.2); // lowest, middle and highest are all common
  });

  it('draws moon-phase distractors from all over the cycle, so the odd one out is not the answer', () => {
    const rows = year.filter(q => q.id === 'moon_phase');
    expect(rows.length).toBeGreaterThan(40);
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const offsets = new Set();
    rows.forEach(q => { const at = names.indexOf(q.options[q.answer]); q.options.forEach((o, i) => { if (i !== q.answer) offsets.add(((names.indexOf(o) - at) + 8) % 8); }); });
    expect(offsets.size).toBeGreaterThanOrEqual(6);
  });

  it('answers moon direction and phase from the Moon model', () => {
    for (const { q } of all.filter(x => x.q.id === 'moon_direction' || x.q.id === 'moon_phase')) {
      const phase = P.moonPhaseAt(P.astroDayNumber(...instantParts(q)));
      if (q.id === 'moon_direction') expect(q.options[q.answer]).toBe(phase.waxing ? 'waxing' : 'waning');
      else expect(q.options[q.answer]).toBe(phase.name);
    }
  });

  it('answers height questions from planet and Moon altitudes with a clear margin', () => {
    const rows = all.filter(x => x.q.id === 'higher_in_sky');
    expect(rows.length).toBeGreaterThan(10);
    for (const { q, site } of rows) {
      const [Y, M, D, UTh] = instantParts(q);
      const sky = P.skyNow(Y, M, D, UTh, site.lat, site.lon);
      const alt = id => (id === 'moon' ? sky.moon.alt : sky.planets.find(p => p.id === id).alt);
      const [a, b] = [q.params.a, q.params.b];
      expect(Math.abs(alt(a) - alt(b))).toBeGreaterThan(4);
      expect(alt(q.options[q.answer])).toBe(Math.max(alt(a), alt(b)));
      expect(Math.min(alt(a), alt(b))).toBeGreaterThan(4);
    }
  });

  it('names the one planet that is up and two that are not', () => {
    const rows = all.filter(x => x.q.id === 'planet_up');
    expect(rows.length).toBeGreaterThan(10);
    for (const { q, site } of rows) {
      const [Y, M, D, UTh] = instantParts(q);
      const sky = P.skyNow(Y, M, D, UTh, site.lat, site.lon);
      const alt = id => sky.planets.find(p => p.id === id).alt;
      q.options.forEach((id, i) => { if (i === q.answer) expect(alt(id)).toBeGreaterThan(4); else expect(alt(id)).toBeLessThan(-2); });
    }
  });

  it('counts dark hours by scanning the Sun independently of the question code', () => {
    const rows = all.filter(x => x.q.id === 'dark_hours');
    expect(rows.length).toBeGreaterThan(10);
    for (const { q, site } of rows) {
      const [Y, M, D] = instantParts(q);
      const noonLocal = q.utcMs - 9 * 3600000; // 21:00 local - 9 h = 12:00 local
      let minutes = 0;
      for (let t = noonLocal; t < noonLocal + 86400000; t += 600000) {
        const x = new Date(t), d = P.astroDayNumber(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours() + x.getUTCMinutes() / 60);
        const sun = P.sunRaDec(d), lst = P.siderealTime(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours() + x.getUTCMinutes() / 60, site.lon);
        if (P.equToHorizon(sun.ra, sun.dec, lst, site.lat).alt < -18) minutes += 10;
      }
      expect(q.options[q.answer]).toBe(Math.round(minutes / 60));
      expect(Y).toBeGreaterThan(2000);
    }
  });

  it('answers compass questions only for stars well away from a boundary', () => {
    const rows = all.filter(x => x.q.id === 'star_direction');
    expect(rows.length).toBeGreaterThan(10);
    for (const { q, site } of rows) {
      const [Y, M, D, UTh] = instantParts(q);
      const star = P.skyNow(Y, M, D, UTh, site.lat, site.lon).stars.find(s => s.name === q.params.star);
      const center = [0, 90, 180, 270][q.answer];
      const off = Math.abs(star.az - center); expect(Math.min(off, 360 - off)).toBeLessThan(21);
      expect(star.alt).toBeGreaterThan(14);
    }
  });

  it('can name a polar place with no full darkness', () => {
    const june = Array.from({ length: 30 }, (_, i) => P.dailySkyQuestion('2026-06-' + String(i + 1).padStart(2, '0'), SITES[3])).filter(q => q.id === 'dark_hours');
    june.forEach(q => expect(q.options[q.answer]).toBe(0));
  });
});

describe('Tonight renders the two new cards', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0)); });
  afterEach(() => vi.useRealTimers());
  const doc = (patch, overrides) => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'tonight', observingList: [], ...patch } }, overrides), 'text/html');

  it('uses a labelled radio group, a real submit button and a progress meter', () => {
    const d = doc();
    const fieldset = d.querySelector('#astronomy-daily fieldset');
    expect(fieldset.querySelector('legend').textContent.length).toBeGreaterThan(20);
    const radios = fieldset.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThanOrEqual(2);
    expect(new Set([...radios].map(r => r.name)).size).toBe(1);
    expect([...radios].every(r => r.closest('label').textContent.trim().length > 0)).toBe(true);
    expect(d.querySelector('#astronomy-daily button[type="submit"]').textContent).toBe('Check my answer');
    const meter = d.querySelector('#astronomy-journey [role="progressbar"]');
    expect(meter.getAttribute('aria-valuenow')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe(String(P.JOURNEY_MISSIONS.length));
    expect(meter.getAttribute('aria-valuetext')).toBe('0 of 13 missions complete');
    expect(d.querySelector('#astronomy-journey-title').tagName).toBe('H2');
    expect(d.querySelector('#astronomy-daily-title').tagName).toBe('H2');
  });

  it('collapses the mission list by default and wires the disclosure', () => {
    const closed = doc();
    const toggle = [...closed.querySelectorAll('#astronomy-journey button')].find(b => b.getAttribute('aria-controls') === 'astronomy-journey-list');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(closed.getElementById('astronomy-journey-list')).toBeNull();
    const open = doc({ journeyOpen: true });
    expect(open.querySelectorAll('#astronomy-journey-list li').length).toBe(P.JOURNEY_MISSIONS.length);
    // status is words, not just colour
    expect(open.querySelector('#astronomy-journey-list li').textContent).toContain('Not started');
  });

  it('shows saved progress and the next suggestion from restored state', () => {
    const d = doc({ journey: { seen: { observatory: true }, done: { first_look: '2026-10-24' }, paid: { first_look: true }, days: ['2026-10-24'] } });
    expect(d.querySelector('#astronomy-journey').textContent).toContain('1 of 13 missions complete · 4 XP earned from missions');
    expect(d.querySelector('.astr-next-mission h3').textContent).toContain('Name what you see');
  });

  it('leaves no unfilled placeholder in any question on any day, place or theme', () => {
    for (const site of ['moosehead', 'quito', 'sydney', 'tromso']) {
      for (const day of [1, 40, 80, 120, 160, 200, 240, 280, 320, 360]) {
        vi.setSystemTime(new Date(2026, 0, day, 12, 0, 0));
        for (const contrast of [false, true]) {
          const d = doc({ obsSite: site }, contrast ? { isContrast: true } : undefined);
          const text = d.querySelector('.astr-journey-grid').textContent;
          expect(text).not.toMatch(/\{[a-zA-Z0-9]+\}/);
          expect(text).not.toMatch(/undefined|NaN|\[object/);
        }
      }
    }
  });

  it('shows a saved answer only for the exact question it answered', () => {
    const q = P.dailySkyQuestion('2026-10-25', SITES[0]);
    const sig = P.dailySignature(q);
    const answered = doc({ journey: { daily: { day: '2026-10-25', sig, pick: q.answer, correct: true } } });
    expect(answered.querySelector('#astronomy-daily form')).toBeNull();
    expect(answered.querySelector('#astronomy-daily .astr-answer-list')).toBeTruthy();
    expect(answered.querySelector('#astronomy-daily-open')).toBeTruthy();
    const staleSig = doc({ journey: { daily: { day: '2026-10-25', sig: 'zzzz', pick: 0, correct: true } } });
    expect(staleSig.querySelector('#astronomy-daily form')).toBeTruthy();
    const yesterday = doc({ journey: { daily: { day: '2026-10-24', sig, pick: 0, correct: true } } });
    expect(yesterday.querySelector('#astronomy-daily form')).toBeTruthy();
  });

  it('marks the right and chosen answers with words as well as colour', () => {
    const q = P.dailySkyQuestion('2026-10-25', SITES[0]);
    const wrongPick = (q.answer + 1) % q.options.length;
    const d = doc({ journey: { daily: { day: '2026-10-25', sig: P.dailySignature(q), pick: wrongPick, correct: false } } });
    const text = d.querySelector('#astronomy-daily .astr-answer-list').textContent;
    expect(text).toContain('Correct answer');
    expect(text).toContain('Your answer');
    expect(d.querySelector('#astronomy-daily').textContent).toContain('Not quite.');
  });
});

describe('Playing the journey on the client', () => {
  const mounts = [];
  const prevAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  let awardXP, addToast;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    awardXP = vi.fn(); addToast = vi.fn();
  });
  afterEach(() => {
    mounts.splice(0).forEach(v => v.unmount());
    vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = prevAct;
  });
  function mount(patch) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let state;
    function App() {
      const [data, setData] = React.useState({ astronomy: { tab: 'tonight', observingList: [], ...patch } });
      state = data.astronomy;
      return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData, awardXP, addToast }));
    }
    act(() => root.render(React.createElement(App)));
    const view = { host, get state() { return state; }, unmount() { act(() => root.unmount()); host.remove(); } };
    mounts.push(view); return view;
  }
  const flush = () => act(() => { vi.advanceTimersByTime(200); });
  const click = el => act(() => { el.click(); });

  it('pays each mission once, through the host signature (activity id, points, reason)', () => {
    const v = mount();
    for (const tab of ['eclipses', 'exoplanets']) click(v.host.querySelector('#astronomy-tab-' + tab));
    flush();
    expect(awardXP).not.toHaveBeenCalled();
    click(v.host.querySelector('#astronomy-tab-hrDiagram'));
    flush(); flush();
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('astronomyJourney', 10, 'Night Sky missions');
    expect(addToast).toHaveBeenCalledWith('Mission complete: Try three simulators.', 'success');
    expect(v.state.journey.paid.simulators).toBe(true);
    click(v.host.querySelector('#astronomy-tab-tonight'));
    click(v.host.querySelector('#astronomy-tab-eclipses'));
    flush(); flush();
    expect(awardXP).toHaveBeenCalledTimes(1);
  });

  it('does not pay again for a mission that was already paid in a saved session', () => {
    const v = mount({ journey: { seen: { hrDiagram: true, eclipses: true, exoplanets: true }, done: { simulators: '2026-10-24' }, paid: { simulators: true }, days: ['2026-10-24'] } });
    flush();
    expect(awardXP).not.toHaveBeenCalled();
    expect(v.state.journey.paid.simulators).toBe(true);
  });

  it('pays a saved-but-unpaid mission when the tool reopens, exactly once', () => {
    mount({ journey: { seen: { observatory: true }, done: { first_look: '2026-10-24' }, days: ['2026-10-24'] } });
    flush(); flush();
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('astronomyJourney', 4, 'Night Sky missions');
  });

  it('reports a rank change in the same toast', () => {
    const v = mount({ journey: { seen: { observatory: true, eclipses: true, exoplanets: true }, found: ['star:1'], done: { first_look: '2026-10-24', name_it: '2026-10-24' }, paid: { first_look: true, name_it: true }, days: ['2026-10-24'] } });
    flush();
    expect(addToast).not.toHaveBeenCalled();
    click(v.host.querySelector('#astronomy-tab-hrDiagram'));
    flush(); flush();
    expect(addToast).toHaveBeenCalledWith('Mission complete: Try three simulators. New rank: Sky Watcher.', 'success');
  });

  it('validates an empty answer, then grades the real one and moves focus to the next action', () => {
    const v = mount();
    const q = P.dailySkyQuestion('2026-10-25', SITES[0]);
    click(v.host.querySelector('#astronomy-daily button[type="submit"]'));
    expect(v.host.querySelector('#astronomy-daily-error').getAttribute('role')).toBe('alert');
    expect(v.state.journey).toBeUndefined();
    const radios = v.host.querySelectorAll('#astronomy-daily input[type="radio"]');
    act(() => { radios[q.answer].click(); });
    expect(v.host.querySelector('#astronomy-daily-error')).toBeNull();
    click(v.host.querySelector('#astronomy-daily button[type="submit"]'));
    flush(); flush();
    expect(v.state.journey.daily).toMatchObject({ day: '2026-10-25', correct: true, pick: q.answer });
    expect(v.state.journey.done.daily_question).toBe('2026-10-25');
    expect(v.state.dailyAnswer).toBeUndefined();
    expect(v.state.journeyPaid).toBeUndefined();
    expect(awardXP).toHaveBeenCalledWith('astronomyJourney', 4, 'Night Sky missions');
    expect(document.activeElement && document.activeElement.id).toBe('astronomy-daily-open');
    expect(v.host.querySelector('#astronomy-daily').textContent).toContain('Correct.');
  });

  it('grades a wrong answer without paying a correctness bonus or hiding the right one', () => {
    const v = mount();
    const q = P.dailySkyQuestion('2026-10-25', SITES[0]);
    const wrong = (q.answer + 1) % q.options.length;
    act(() => { v.host.querySelectorAll('#astronomy-daily input[type="radio"]')[wrong].click(); });
    click(v.host.querySelector('#astronomy-daily button[type="submit"]'));
    flush();
    expect(v.state.journey.daily.correct).toBe(false);
    expect(v.host.querySelector('#astronomy-daily').textContent).toContain('Not quite.');
    expect(v.host.querySelector('#astronomy-daily .astr-answer-right').textContent).toContain('Correct answer');
  });
});

describe('Quiz', () => {
  const mounts = [];
  const prevAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  let awardXP, addToast;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    awardXP = vi.fn(); addToast = vi.fn();
  });
  afterEach(() => { mounts.splice(0).forEach(v => v.unmount()); vi.clearAllTimers(); vi.useRealTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = prevAct; });
  function mount(patch) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let state;
    function App() {
      const [data, setData] = React.useState({ astronomy: { tab: 'quiz', observingList: [], ...patch } });
      state = data.astronomy;
      return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData, awardXP, addToast }));
    }
    act(() => root.render(React.createElement(App)));
    const view = { host, get state() { return state; }, unmount() { act(() => root.unmount()); host.remove(); } };
    mounts.push(view); return view;
  }
  const click = el => act(() => { el.click(); });
  const flush = () => act(() => { vi.advanceTimersByTime(200); });
  const choice = (v, q, c) => v.host.querySelector('#astronomy-quiz-q-' + q + '-c-' + c);

  it('one answer marks one answer, not fifteen (null is not choice A)', () => {
    const v = mount();
    click(choice(v, 3, 1));
    expect(v.host.querySelectorAll('button[aria-pressed="true"]').length).toBe(1);
    expect(choice(v, 3, 1).getAttribute('aria-pressed')).toBe('true');
    expect(v.host.textContent).toContain('Answer all questions to submit (1/15)');
    expect(v.state.quizAnswers.filter(a => a === null).length).toBe(14);
  });

  it('restores saved nulls as unanswered', () => {
    const html = renderTool('astronomy', { astronomy: { tab: 'quiz', observingList: [], quizAnswers: [null, null, 2, null, null, null, null, null, null, null, null, null, null, null, null] } });
    expect((html.match(/aria-pressed="true"/g) || []).length).toBe(1);
    expect(html).toContain('(1/15)');
  });

  it('keeps the submit button focusable and says which question is open instead of going silently dead', () => {
    const v = mount();
    const submit = [...v.host.querySelectorAll('button')].find(b => /answer all questions/i.test(b.textContent));
    expect(submit.disabled).toBe(false);
    expect(submit.getAttribute('aria-disabled')).toBe('true');
    click(submit);
    flush();
    expect(v.host.querySelector('[role="alert"]').textContent).toContain('Question 1 needs an answer');
    expect(document.activeElement && document.activeElement.id).toBe('astronomy-quiz-q-0-c-0');
    expect(v.state.quizSubmitted).toBeUndefined();
  });

  it('practice mode shows feedback, locks the first answer and still counts it', () => {
    const q = P.QUIZ_QUESTIONS;
    const v = mount({ quizPractice: true });
    const wrong = (q[0].answer + 1) % q[0].choices.length;
    click(choice(v, 0, wrong));
    expect(v.host.querySelector('#astronomy-quiz-q-0').parentElement.textContent).toContain('Not quite');
    expect(v.host.querySelector('#astronomy-quiz-q-0').parentElement.textContent).toContain(q[0].explain.slice(0, 30));
    click(choice(v, 0, q[0].answer));
    expect(v.state.quizAnswers[0]).toBe(wrong);
    const text = v.host.querySelector('#astronomy-quiz-q-0').parentElement.textContent;
    expect(text).toContain('correct answer');
    expect(text).toContain('your answer');
  });

  it('without practice mode answers can be changed and no explanation leaks early', () => {
    const q = P.QUIZ_QUESTIONS;
    const v = mount();
    click(choice(v, 0, 0)); click(choice(v, 0, 1));
    expect(v.state.quizAnswers[0]).toBe(1);
    expect(v.host.textContent).not.toContain(q[0].explain.slice(0, 40));
  });

  it('submits a full set: credits XP under its own activity id and announces one concise result', () => {
    const q = P.QUIZ_QUESTIONS;
    const v = mount();
    q.forEach((item, i) => click(choice(v, i, item.answer)));
    const submit = [...v.host.querySelectorAll('button')].find(b => b.textContent === 'Submit quiz');
    click(submit);
    flush(); flush();
    expect(awardXP).toHaveBeenCalledWith('astronomyQuiz', 75, 'Night Sky quiz');
    expect(v.state.journey.flags.quiz80).toBe(true);
    expect(awardXP).toHaveBeenCalledWith('astronomyJourney', 10, 'Night Sky missions');
    const live = v.host.querySelector('[role="status"][aria-atomic="true"]');
    expect(live.textContent).toBe('Quiz results: 15 of 15 correct, 100 percent.');
    expect(document.activeElement && document.activeElement.id).toBe('astronomy-quiz-results-title');
    expect(v.host.querySelector('#astronomy-quiz-results-title').textContent).toBe('15 / 15');
    click([...v.host.querySelectorAll('button')].find(b => b.textContent === 'Retake quiz'));
    flush();
    expect(document.activeElement && document.activeElement.id).toBe('astronomy-quiz-intro');
    expect(v.state.quizSubmitted).toBe(false);
  });

  it('credits nothing for a score of zero rather than a malformed award', () => {
    const q = P.QUIZ_QUESTIONS;
    const v = mount();
    q.forEach((item, i) => click(choice(v, i, (item.answer + 1) % item.choices.length)));
    click([...v.host.querySelectorAll('button')].find(b => b.textContent === 'Submit quiz'));
    flush();
    expect(awardXP).not.toHaveBeenCalledWith('astronomyQuiz', expect.anything(), expect.anything());
    expect(v.host.textContent).toContain('0 / 15');
  });

  it('never calls awardXP with a bare score (the host reads the first argument as an activity id)', () => {
    expect(SOURCE).not.toMatch(/awardXP\(\s*correct\s*\*\s*5\s*\)/);
    expect(SOURCE).toContain("awardXP('astronomyQuiz', correct * 5,");
    expect(SOURCE).toContain("awardXP('astronomyJourney', total,");
  });
});

describe('Registration and mirrors', () => {
  const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.astronomy;
  const used = new Set();
  for (const m of SOURCE.matchAll(/__alloT\('stem\.astronomy\.((?:journey|dq|quiz)_[A-Za-z0-9_]+)', '((?:[^'\\]|\\.)*)'\)/g)) used.add(m[1] + '|||' + m[2].replace(/\\'/g, "'"));

  it('every journey, daily-question and quiz string is registered with the same English the code falls back to', () => {
    expect(used.size).toBeGreaterThan(80);
    for (const entry of used) {
      const [key, fallback] = entry.split('|||');
      expect(ui[key], key).toBe(fallback);
    }
  });

  it('keeps placeholders in the registered copy so a translation can place them', () => {
    expect(ui.dq_higher_q).toContain('{a}');
    expect(ui.journey_progress).toContain('{done}');
    expect(ui.journey_xp).toContain('{xp}');
  });

  it('serves the same source and strings from both live copies', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js', 'utf8')).toBe(SOURCE);
    expect(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).toBe(readFileSync('ui_strings.js', 'utf8'));
  });
});
