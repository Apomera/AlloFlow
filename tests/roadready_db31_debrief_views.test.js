import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 31, debrief lane (db31): the debrief and coaching views, mounted.
//  1. costly events are in the debrief; strengths need a real drive; no sentence printed twice
//  2. coaching cards: what happened, where, what the learner could see, one thing to do next time;
//     "Try this part again" restarts the same road about 100 m before the event
//  3. the student answers one question; the typed line is never saved
//  4. guess first: the answer is not on the page before the learner chooses
//  7. a drive that is too short is not a logbook session, and the debrief says so
// (pattern: tests/roadready_au30_instructor_voice.test.js, real tool mounted)

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');

let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];
async function mount(roadReady, extraCtx) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady }, writes: [] };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx(Object.assign({
      toolData,
      callTTS: vi.fn(() => new Promise(() => {})),
      update: (tool, key, value) => { state.writes.push({ [key]: value }); setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })); },
      updateMulti: (tool, values) => { state.writes.push(values); setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })); },
    }, extraCtx || {}));
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state, RR: window.__RR_TEST_EXPORTS__.roadReady };
  mounted.push(m);
  return m;
}
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  delete window.__testHooks;
});
const text = (m) => m.host.textContent;
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
};
const count = (hay, needle) => hay.split(needle).length - 1;

// The reviewer's 60 s residential drive, as exitDriving now seals it.
const R8_EVENTS = [
  { type: 'tailgate', t: 9.7, speedMph: 19, mu: 0.72, postedLimitMph: 25, severity: 2, leadDistanceFt: 42, safeFeet: 85, durationSec: 1.4, x: 48.4, y: 44, distM: 37, station: 44, dir: -1, cue: 'ADD FOLLOWING SPACE' },
  { type: 'hardBrake', t: 10.0, speedMph: 18, mu: 0.72, postedLimitMph: 25, severity: 3, x: 48.5, y: 42, distM: 39, station: 42, dir: -1 },
  { type: 'crash', t: 11.6, speedMph: 14, mu: 0.72, postedLimitMph: 25, severity: 3, points: 25, into: 'vehicle', closing: true, x: 48.9, y: 33, distM: 48, station: 33, dir: -1, cue: 'ADD FOLLOWING SPACE' },
  { type: 'rollingStop', t: 13.4, speedMph: 4, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 1, x: 49.1, y: 26, distM: 55, station: 26, dir: -1, cue: 'STOP AHEAD' },
  { type: 'hardBrake', t: 26.2, speedMph: 18, mu: 0.72, postedLimitMph: 25, severity: 3, x: 51.6, y: -46, distM: 127, station: -46, dir: -1 },
  { type: 'rollingStop', t: 29.5, speedMph: 3, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 2, x: 52.4, y: -69, distM: 150, station: -69, dir: -1, cue: 'STOP AHEAD' },
  { type: 'crash', t: 45.6, speedMph: 6, mu: 0.72, postedLimitMph: 25, severity: 2, points: 10, into: 'vehicle', x: 61.2, y: -160, distM: 243, station: -160, dir: -1 },
  { type: 'rollingStop', t: 46.9, speedMph: 4, mu: 0.72, postedLimitMph: 25, severity: 3, points: 20, n: 3, x: 62.1, y: -174, distM: 257, station: -174, dir: -1, cue: 'STOP AHEAD' },
  { type: 'crash', t: 51.3, speedMph: 5, mu: 0.72, postedLimitMph: 25, severity: 2, points: 10, into: 'vehicle', x: 64.0, y: -186, distM: 270, station: -186, dir: -1 },
];
const EVIDENCE = { durationSec: 60, distanceMeters: 332, meaningful: true, qualifying: true, fullSession: false, laneChangeOpportunities: 0, missionEvaluated: true, missionPassed: false, reason: 'Qualifying practice session' };
const r8Stats = (over) => Object.assign({
  scenario: 'Residential Street', vehicle: 'Compact Sedan', scenarioId: 'residential', time: '1:00', durationSec: 60,
  distanceMeters: 332, distance_mi: '0.21', maxSpeed: 22, avgMPG: '15.7', safetyScore: 0, efficiencyScore: 58,
  hardBrakes: 15, jackrabbits: 4, speedViolations: 0, secondsOverLimit: 0, closeFollows: 2, crashes: 3, aiCausedCrashes: 0, stops: 0,
  skidSeconds: 0, absSeconds: 2, hydroplaneSeconds: 0, cyclistClose: 0, laneChanges: 0, unsignaledLaneChanges: 0, emergencyYields: 0,
  busStopCompliance: 0, pedYields: 0, wrongSideViolations: 0, majorViolations: 3, childStrike: 0, qualifyingSession: true,
  evidence: EVIDENCE, lastCrashReplay: null, movingSeconds: 52, logbookAdded: true, gapSeconds: [18.4, 7.1, 3.2, 2.3],
  predict: { id: 'gap', answer: 0, seconds: [18, 7, 3, 2], total: 31 },
  drivePath: Array.from({ length: 120 }, (_, i) => ({ x: 47.5 + i * 0.14, y: 81 - i * 2.25, speed: 18 })),
  events: R8_EVENTS,
}, over || {});

describe('Road Ready db31 item 4: guess first, and the answer is not on the page before the choice', () => {
  it('asks one question and shows nothing else from the drive; the choice reveals the real figure beside the guess', async () => {
    const m = await mount({ view: 'debrief', scenario: 'residential', vehicle: 'sedan', drivingStats: r8Stats() });
    const ask = m.host.querySelector('[data-rr-predict="ask"]');
    expect(ask, 'the guess-first card').toBeTruthy();
    expect(text(m)).toContain('How many seconds behind the car ahead were you most of the time?');
    const choices = [...m.host.querySelectorAll('[data-rr-predict-choice]')];
    expect(choices.map((b) => b.textContent)).toEqual(['Less than 2 seconds', '2 to 3 seconds', '3 to 4 seconds', '4 seconds or more']);
    // no leak: none of the drive's numbers, the grade, the focus or the coaching count are rendered,
    // and no attribute or hidden node carries the answer
    const page = text(m);
    for (const leak of ['Strength', 'Next focus', 'Safety Score', 'Coaching (', '0.21 mi', 'Stop all the way', 'What the drive recorded', 'for 18 of', '31 seconds']) {
      expect(page, leak).not.toContain(leak);
    }
    expect(m.host.querySelector('[data-rr-predict-answer]')).toBeNull();
    expect(m.host.innerHTML).not.toMatch(/data-rr-predict-answer|aria-pressed="true"|"answer"/);
    // every choice looks the same (no style gives the answer away)
    expect(new Set(choices.map((b) => b.getAttribute('style'))).size).toBe(1);

    await click(choices[3]);
    expect(m.host.querySelector('[data-rr-predict="ask"]')).toBeNull();
    const result = m.host.querySelector('[data-rr-predict="result"]');
    expect(result.textContent).toContain('Your guess: 4 seconds or more');
    expect(result.textContent).toContain('What the drive recorded: Less than 2 seconds');
    expect(result.textContent).toContain('You had a car ahead for 31 seconds. For 18 of them the gap was in this range.');
    expect(result.textContent).toContain('Your guess was different from the drive.');
    expect(text(m)).toContain('Next focus');
    // keyboard and screen-reader focus lands on the result (the pressed button is gone)
    expect(document.activeElement).toBe(result);
    expect(result.getAttribute('role')).toBe('status');
    // the guess is session memory: nothing was written to the tool's saved state
    expect(JSON.stringify(m.state.writes)).not.toContain('guess');
    expect(Object.keys(m.state.toolData.roadReady)).not.toContain('guess');
  });

  it('a matching guess says so; "Skip the guess" shows the figure without a guess line', async () => {
    const a = await mount({ view: 'debrief', drivingStats: r8Stats() });
    await click(a.host.querySelector('[data-rr-predict-choice="0"]'));
    expect(a.host.querySelector('[data-rr-predict="result"]').textContent).toContain('Your guess matched the drive.');
    const b = await mount({ view: 'debrief', drivingStats: r8Stats() });
    await click(b.host.querySelector('[data-rr-predict-skip]'));
    const result = b.host.querySelector('[data-rr-predict="result"]').textContent;
    expect(result).toContain('What the drive recorded: Less than 2 seconds');
    expect(result).not.toContain('Your guess');
  });

  it('with no car ahead for 10 s the question is about hard brakes; with too short a drive there is none', async () => {
    const RR = (await mount({ view: 'menu', tourCompleted: true })).RR;
    expect(RR.rrPredictQuestionFor({ gapSeconds: [3, 2, 1, 0], hardBrakes: 4 }, EVIDENCE)).toEqual({ id: 'hardBrakes', answer: 2, count: 4 });
    expect(RR.rrPredictQuestionFor({ gapSeconds: [18.4, 7.1, 3.2, 2.3] }, EVIDENCE)).toEqual({ id: 'gap', answer: 0, seconds: [18, 7, 3, 2], total: 31 });
    expect(RR.rrPredictQuestionFor({ gapSeconds: [50, 0, 0, 0], hardBrakes: 9 }, Object.assign({}, EVIDENCE, { meaningful: false }))).toBeNull();
    const m = await mount({ view: 'debrief', drivingStats: r8Stats({ predict: { id: 'hardBrakes', answer: 3, count: 15 } }) });
    expect(text(m)).toContain('How many times did you brake hard on this drive?');
    expect(text(m)).not.toContain('15');
    await click(m.host.querySelector('[data-rr-predict-choice="1"]'));
    expect(m.host.querySelector('[data-rr-predict="result"]').textContent).toContain('The drive recorded 15 hard brakes.');
    expect(RR.rrPredictTextFor({ id: 'hardBrakes', answer: 1, count: 1 }).detail).toBe('The drive recorded 1 hard brake.');
    // an older or imported drive without the question goes straight to the debrief
    const old = await mount({ view: 'debrief', drivingStats: r8Stats({ predict: undefined }) });
    expect(old.host.querySelector('[data-rr-predict]')).toBeNull();
    expect(text(old)).toContain('Next focus');
  });
});

describe('Road Ready db31 item 1: the debrief shows the costly events', () => {
  it('the 60 s mission: focus is the rolling stops, the replay has 9 events, the strength is true', async () => {
    const m = await mount({ view: 'debrief', scenario: 'residential', vehicle: 'sedan', drivingStats: r8Stats({ predict: null }), lastJournal: { entries: [], durationSec: 60 } });
    const page = text(m);
    expect(page).toContain('Stop all the way');
    expect(page).toContain('Stop before the white line at every stop sign and red light.');
    expect(page).not.toContain('Brake earlier');
    expect(page).toContain('No speeding was recorded on this drive');
    expect(page).not.toContain('Stopped and opened the debrief');
    expect(page).not.toContain('Collision-free');
    expect(page).toContain('9 events');
    expect(m.host.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain('9 logged events');
    expect(page).toContain('Coaching (9)');
    expect(page).not.toContain('Zero crashes');
  });

  it('a car that covered 0.00 mi gets no strength and no "Zero crashes!", and no sentence twice', async () => {
    const evidence = { durationSec: 2, distanceMeters: 0, meaningful: false, qualifying: false, fullSession: false, laneChangeOpportunities: 0, missionEvaluated: true, missionPassed: false,
      reason: 'Drive for at least 60 seconds and 0.19 mi before this attempt counts toward mastery.' };
    const m = await mount({ view: 'debrief', drivingStats: r8Stats({ time: '0:02', durationSec: 2, distanceMeters: 0, distance_mi: '0.00', maxSpeed: 0, safetyScore: 100, efficiencyScore: 100,
      hardBrakes: 0, jackrabbits: 0, closeFollows: 0, crashes: 0, majorViolations: 0, absSeconds: 0, evidence, events: [], drivePath: [], predict: null, movingSeconds: 0, logbookAdded: false, gapSeconds: null }) });
    const page = text(m);
    expect(page).not.toContain('Collision-free');
    expect(page).not.toContain('Zero crashes');
    expect(page).toContain('This drive was too short to show a strength. Drive for at least 30 seconds.');
    expect(count(page, 'Drive for at least 60 seconds and 0.19 mi before this attempt counts toward mastery.')).toBe(1);
    // and the next focus fits a drive that has not happened yet
    expect(page).toContain('Finish a longer drive');
    expect(page).not.toContain('Repeat the good habits');
    // nothing to reflect on yet
    expect(m.host.querySelector('[data-rr-reflect]')).toBeNull();
    // item 7: said on screen
    expect(m.host.querySelector('[data-rr-logbook-note]').textContent).toBe('Too short to add to the logbook. A drive is logged after the car has moved for 30 seconds.');
  });

  it('a clean, real drive keeps its strength and "Zero crashes!"; safety never shows below 0', async () => {
    const clean = await mount({ view: 'debrief', drivingStats: r8Stats({ safetyScore: 96, crashes: 0, majorViolations: 0, hardBrakes: 0, jackrabbits: 0, closeFollows: 0, events: [], predict: null,
      evidence: Object.assign({}, EVIDENCE, { missionPassed: true }) }) });
    expect(text(clean)).toContain('Collision-free, speed-disciplined control');
    expect(text(clean)).toContain('Zero crashes');
    expect(clean.host.querySelector('[data-rr-logbook-note]')).toBeNull();
    const RR = clean.RR;
    expect(RR.rrDebriefStrengthFor({ crashes: 2, majorViolations: 1, stops: 2, speedViolations: 1 }, EVIDENCE)).toBe('Made 2 complete stops');
    expect(RR.rrDebriefStrengthFor({ crashes: 1, pedYields: 1, stops: 3 }, EVIDENCE)).toBe('Yielded to 1 pedestrian at a crosswalk');
    expect(RR.rrDebriefStrengthFor({ crashes: 1, speedViolations: 2, closeFollows: 4 }, EVIDENCE)).toBe('Finished the drive and opened the debrief to review it');
    expect(RR.rrDebriefStrengthFor({ crashes: 0 }, Object.assign({}, EVIDENCE, { meaningful: false }))).toBeNull();
    expect(RR.rrDriveOutcome({ safetyScore: -0.6, efficiencyScore: 58, crashes: 3 }, EVIDENCE).score).toBeGreaterThanOrEqual(0);
  });
});

describe('Road Ready db31 item 3: the student answers; the typed line is session memory only', () => {
  it('one question, choices drawn from this drive, an optional line that is never written anywhere', async () => {
    const m = await mount({ view: 'debrief', scenario: 'residential', vehicle: 'sedan', drivingStats: r8Stats({ predict: null }) });
    const box = m.host.querySelector('[data-rr-reflect]');
    expect(box.textContent).toContain('What will you do differently next time?');
    const choices = [...box.querySelectorAll('[data-rr-reflect-choice]')];
    expect(choices.map((b) => b.textContent)).toEqual([
      'I will stop all the way at every stop sign and red light.',
      'I will leave more space and slow down sooner.',
      'I will stay 4 seconds behind the car ahead.',
      'I will slow down and give myself more time.',
    ]);
    expect(choices.length).toBeGreaterThanOrEqual(3);
    expect(choices.length).toBeLessThanOrEqual(4);
    expect(box.textContent).toContain('Only you see this. It is not saved and not exported.');
    await click(choices[0]);
    const pressed = [...m.host.querySelectorAll('[data-rr-reflect-choice][aria-pressed="true"]')];
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute('data-rr-reflect-choice')).toBe('stop');
    const input = m.host.querySelector('#rr-reflect-note');
    expect(input.getAttribute('aria-describedby')).toBe('rr-reflect-privacy');
    await typeInto(input, 'zq brake sooner 7731');
    expect(m.host.querySelector('#rr-reflect-note').value).toBe('zq brake sooner 7731');
    // nothing reached the saved state, the window mirror or device storage
    expect(JSON.stringify(m.state.writes)).not.toContain('7731');
    expect(JSON.stringify(m.state.toolData)).not.toContain('7731');
    expect(JSON.stringify(m.state.writes)).not.toMatch(/"plan"|"note"/);
    expect(JSON.stringify(window.__alloflowRoadReady || null)).not.toContain('7731');
    let stored = '';
    for (let i = 0; i < localStorage.length; i++) stored += localStorage.getItem(localStorage.key(i));
    expect(stored).not.toContain('7731');
    // it survives a look at the coaching view and back (same session)...
    await click([...m.host.querySelectorAll('button')].find((b) => /Coaching \(/.test(b.textContent)));
    await click([...m.host.querySelectorAll('button')].find((b) => /Drive Debrief/.test(b.textContent)));
    expect(m.host.querySelector('#rr-reflect-note').value).toBe('zq brake sooner 7731');
    // ...and the Save Progress file is built from toolData, which never held it
    expect(src).toContain('var debriefSessionTuple = useState({});');
    expect(src).not.toMatch(/upd(Multi)?\([^)]*debriefSession/);
  });

  it('a drive with no events still offers three plans', async () => {
    const m = await mount({ view: 'debrief', drivingStats: r8Stats({ events: [], predict: null, crashes: 0, majorViolations: 0, safetyScore: 95 }) });
    const choices = [...m.host.querySelectorAll('[data-rr-reflect-choice]')].map((b) => b.textContent);
    expect(choices).toEqual(['I will keep doing what worked on this drive.', 'I will look 20 to 30 seconds down the road.', 'I will check my mirrors more often.']);
  });
});

describe('Road Ready db31 item 2: coaching cards say what, where, what you could see and one next step', () => {
  it('a card for every recorded event, in plain words, with the place and the cue', async () => {
    const m = await mount({ view: 'driveDebrief', scenario: 'residential', vehicle: 'sedan', drivingStats: r8Stats() });
    const cards = [...m.host.querySelectorAll('[data-rr-coach-card]')];
    expect(cards.map((c) => c.getAttribute('data-rr-coach-card'))).toEqual(R8_EVENTS.map((e) => e.type));
    const second = cards[5].textContent; // the second rolling stop
    expect(second).toContain('Rolling stop');
    expect(second).toContain('-20 safety · 0:29');
    expect(second).toContain('What happened: The car was still moving when it passed the stop sign.');
    expect(second).toContain('Where: At the second stop sign, 0:29 into the drive.');
    expect(second).toContain('What you could see: A red STOP sign and a white stop line were ahead. Just before this, the dashboard said: STOP AHEAD.');
    expect(second).toContain('Next time: Brake early. Stop all the way before the white line.');
    const crash = cards[2].textContent;
    expect(crash).toContain('Hit another vehicle');
    expect(crash).toContain('-25 safety · 0:11');
    expect(crash).toContain('Where: 0.03 miles from the start, 0:11 into the drive.');
    expect(crash).toContain('The speed difference was about 14 mph.');
    expect(crash).toContain('Stay 4 seconds behind the car ahead. Look 20 to 30 seconds down the road');
    const tail = cards[0].textContent;
    expect(tail).toContain('At 19 mph the car was 42 feet behind the car ahead. A safe gap at that speed is about 85 feet.');
    expect(tail).toContain('You should reach it 4 seconds later');
    // one "Next time" per card, and the summary chips use the same names
    for (const c of cards) expect(count(c.textContent, 'Next time:')).toBe(1);
    expect(text(m)).toContain('3 × Rolling stop');
    expect(text(m)).toContain('3 × Hit another vehicle');
    expect(text(m)).not.toContain('× hardBrake');
    // the focus list starts with what cost the most
    const focus = m.host.querySelector('[aria-labelledby="rr-practice-focus-title"]').textContent;
    expect(focus.indexOf('Stop all the way')).toBeGreaterThan(-1);
    expect(focus.indexOf('Stop all the way')).toBeLessThan(focus.indexOf('Brake earlier') === -1 ? Infinity : focus.indexOf('Brake earlier'));
    expect(focus).toContain('Start with number 1. It cost the most safety points');
  });

  it('every event type the drive loop records has its own plain-language card (no raw type names)', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const types = new Set(['crash', 'hardBrake', 'tailgate', 'speedViolation', 'work_zone_cone']);
    const rx = /rrScoredEvent\(statsRef, (?:[^;]*?\? )?'(\w+)'(?: : '(\w+)')?/g;
    let hit;
    while ((hit = rx.exec(src))) { types.add(hit[1]); if (hit[2]) types.add(hit[2]); }
    for (const kind of ['unsafe_entry', 'wrong_way', 'stopped_inside', 'missing_exit_signal']) types.add('roundabout_' + kind);
    types.add('highway_missing_merge_signal'); types.add('highway_merged_too_slow');
    expect(types.size).toBeGreaterThanOrEqual(30);
    for (const type of types) {
      const card = m.RR.rrCoachCardFor({ type, t: 75, speedMph: 20, postedLimitMph: 25, severity: 2, distM: 400 }, { scenarioId: 'residential' });
      expect(card.title, type).not.toBe('Driving moment');
      expect(card.title, type).not.toContain(type);
      expect(card.what.length, type).toBeGreaterThan(15);
      expect(card.next.length, type).toBeGreaterThan(15);
      expect(card.where, type).toBe('0.25 miles from the start, 1:15 into the drive.');
      for (const part of [card.title, card.what, card.cue, card.next, card.where]) expect(part, type).not.toMatch(/\{[a-z]+\}|undefined|NaN/);
      // short sentences for teen readers and English learners
      for (const sentence of (card.what + ' ' + card.next).split(/[.!?]\s/)) expect(sentence.split(/\s+/).length, type + ': ' + sentence).toBeLessThanOrEqual(24);
    }
    // the corrected facts from wave 1
    const all = [...types].map((type) => { const c = m.RR.rrCoachCardFor({ type, speedMph: 20, postedLimitMph: 25 }); return c.what + ' ' + c.cue + ' ' + c.next; }).join(' ');
    expect(all).not.toMatch(/3[- ]second|12[-–]15|15 seconds/);
    expect(all).toContain('4 seconds');
    expect(all).toContain('20 to 30 seconds');
    // school-zone and work-zone speeding name the zone
    expect(m.RR.rrCoachCardFor({ type: 'speedViolation', speedMph: 24, postedLimitMph: 15, durationSec: 6, peakMph: 26 }, { scenarioId: 'school_zone' }))
      .toMatchObject({ what: 'The car went up to 26 mph where the limit is 15 mph. It stayed over the limit for 6 seconds.', cue: 'This is a school zone. The signs show 15 mph.' });
    expect(m.RR.rrCoachCardFor({ type: 'speedViolation', speedMph: 44, postedLimitMph: 35 }, { scenarioId: 'construction' }).cue).toBe('This is a work zone. The signs show 35 mph.');
  });

  it('"Try this part again" restarts the same scenario a short way before the event, with no other intersection in between', async () => {
    const m = await mount({ view: 'driveDebrief', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, drivingStats: r8Stats() });
    const button = m.host.querySelector('[data-rr-coach-card="rollingStop"] [data-rr-retry]');
    expect(button.textContent).toBe('Try this part again');
    expect(Number(button.getAttribute('data-rr-retry'))).toBe(26); // the event's own road station
    expect(m.RR.RR_RETRY_LEAD_METERS).toBe(100);
    const world = m.RR.createScenarioWorld(m.RR.SCENARIOS.find((s) => s.id === 'residential'));
    const defaultStart = m.RR.drivingStartPose(world, 'residential', Math.floor(96 * 0.85));
    // where the intersections are on this road (from the world itself)
    const crossings = [];
    for (let index = -12; index <= 12; index++) { const chunk = world.getChunk(index); if (chunk.hasIntersection) crossings.push(index * 32 + chunk.intersectionY); }
    expect(crossings.length).toBeGreaterThan(4);
    const startStation = m.RR.rrRetryStartStation(world, 26);
    expect(startStation - 26).toBeGreaterThanOrEqual(30);
    expect(startStation - 26).toBeLessThanOrEqual(100);
    await click(button);
    expect(m.state.toolData.roadReady.view).toBe('driving');
    expect(m.state.toolData.roadReady.scenario).toBe('residential');
    expect(m.state.toolData.roadReady.rrRetryStation).toBeNull(); // used once
    const car = window.__testHooks.roadReady.carRef.current;
    const expected = m.RR.drivingStartPose(world, 'residential', Math.round(startStation));
    expect(car.x).toBeCloseTo(expected.x, 3);
    expect(car.y).toBeCloseTo(expected.y, 3);
    expect(car.heading).toBeCloseTo(expected.heading, 5);
    // before the event along the road (travel is toward a smaller station), and not the normal start
    expect(expected.station).toBeGreaterThan(26 + 29);
    expect(expected.station).toBeLessThan(26 + 130);
    expect(Math.abs(expected.station - defaultStart.station)).toBeGreaterThan(5);
    // no intersection between the start and the event: the first control the learner meets is the event's own
    expect(crossings.filter((c) => c > 26 + 1 && c < expected.station)).toEqual([]);
    expect(window.__testHooks.roadReady.eventToastRef.current.msg).toBe('Practice run. You start a short way before the spot. Watch for it.');
    // the same holds for every recorded event of this drive
    for (const ev of R8_EVENTS) {
      const st = m.RR.drivingStartPose(world, 'residential', Math.round(m.RR.rrRetryStartStation(world, ev.station))).station;
      expect(st - ev.station, ev.type + '@' + ev.station).toBeGreaterThanOrEqual(30);
      expect(crossings.filter((c) => c > ev.station + 20 && c < st), ev.type + '@' + ev.station).toEqual([]);
    }
  });

  it('no retry for an event without a place, on the highway ramp, against the travel direction or in Free Explore', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const ev = { type: 'rollingStop', t: 10, station: 26, dir: -1, n: 1 };
    expect(m.RR.rrCoachCardFor(ev, { scenarioId: 'residential' }).retryStation).toBe(26);
    expect(m.RR.rrCoachCardFor(Object.assign({}, ev, { station: undefined }), { scenarioId: 'residential' }).retryStation).toBeNull();
    expect(m.RR.rrCoachCardFor(Object.assign({}, ev, { dir: 1 }), { scenarioId: 'residential' }).retryStation).toBeNull();
    expect(m.RR.rrCoachCardFor(ev, { scenarioId: 'highway' }).retryStation).toBeNull();
    expect(m.RR.rrCoachCardFor(ev, { scenarioId: 'roundabout' }).retryStation).toBeNull();
    const fe = await mount({ view: 'driveDebrief', freeExplore: true, drivingStats: r8Stats() });
    expect(fe.host.querySelector('[data-rr-retry]')).toBeNull();
  });
});

describe('Road Ready db31 items 1 and 7: what exitDriving seals (real drive lifecycle)', () => {
  const endDrive = (host) => [...host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'End drive and open debrief');
  async function driveAndEnd(setup) {
    const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, instructorVoice: false });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(50); });
    const H = window.__testHooks.roadReady;
    setup(H);
    await click(endDrive(m.host));
    return m;
  }

  it('a drive ended after 2 seconds is not a logbook session, and the debrief says so', async () => {
    const m = await driveAndEnd((H) => { H.timeRef.current = 2; H.statsRef.current.simTime = 2; H.statsRef.current.movingSeconds = 0; });
    const d = m.state.toolData.roadReady;
    expect(d.view).toBe('debrief');
    expect(d.logbook || []).toHaveLength(0);
    expect(d.drivingStats.logbookAdded).toBe(false);
    expect(d.drivingStats.predict).toBeNull(); // nothing to guess about
    expect(m.host.querySelector('[data-rr-predict]')).toBeNull();
    expect(m.host.querySelector('[data-rr-logbook-note]').textContent).toContain('Too short to add to the logbook.');
    expect(text(m)).not.toContain('Collision-free');
  });

  it('35 s of moving is a session; 29 s is not (the car must really move)', async () => {
    const yes = await driveAndEnd((H) => { H.timeRef.current = 48; Object.assign(H.statsRef.current, { simTime: 48, movingSeconds: 35, distance: 240 }); });
    expect(yes.state.toolData.roadReady.logbook).toHaveLength(1);
    expect(yes.state.toolData.roadReady.drivingStats.logbookAdded).toBe(true);
    expect(yes.state.toolData.roadReady.drivingStats.movingSeconds).toBe(35);
    const no = await driveAndEnd((H) => { H.timeRef.current = 300; Object.assign(H.statsRef.current, { simTime: 300, movingSeconds: 29, distance: 180 }); });
    expect(no.state.toolData.roadReady.logbook || []).toHaveLength(0);
    expect(yes.RR.RR_LOGBOOK_MIN_MOVING_SECONDS).toBe(30);
    expect(yes.RR.rrLogbookEligible({ movingSeconds: 30 }, 31)).toBe(true);
    expect(yes.RR.rrLogbookEligible({ movingSeconds: 29.9 }, 500)).toBe(false);
  });

  it('safety is sealed at 0 (it was stored as -0.6), the events and the guess-first data are in the debrief', async () => {
    const m = await driveAndEnd((H) => {
      H.timeRef.current = 60;
      const s = H.statsRef.current;
      Object.assign(s, { simTime: 60, movingSeconds: 52, distance: 332, safetyScore: -0.6, crashes: 3, majorViolations: 3, hardBrakes: 15, gapSeconds: [18.4, 7.1, 3.2, 2.3] });
      s.driveEvents = R8_EVENTS.map((e) => Object.assign({}, e));
    });
    const H = window.__testHooks.roadReady;
    expect(H.statsRef.current.safetyScore).toBe(0);
    const ds = m.state.toolData.roadReady.drivingStats;
    expect(ds.safetyScore).toBe(0);
    expect(ds.events).toHaveLength(9);
    expect(ds.gapSeconds).toEqual([18.4, 7.1, 3.2, 2.3]);
    expect(ds.predict).toEqual({ id: 'gap', answer: 0, seconds: [18, 7, 3, 2], total: 31 });
    // the debrief opens on the question, not on the numbers
    expect(m.host.querySelector('[data-rr-predict="ask"]')).toBeTruthy();
    expect(text(m)).not.toContain('Next focus');
    await click(m.host.querySelector('[data-rr-predict-choice="2"]'));
    expect(text(m)).toContain('Stop all the way');
    // a new drive starts with a clean slate: no guess, no plan, no typed line
    await typeInto(m.host.querySelector('#rr-reflect-note'), 'zq 5512');
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(50); });
    const H2 = window.__testHooks.roadReady;
    H2.timeRef.current = 60;
    Object.assign(H2.statsRef.current, { simTime: 60, movingSeconds: 52, distance: 332, gapSeconds: [1, 2, 20, 3] });
    await click(endDrive(m.host));
    expect(m.host.querySelector('[data-rr-predict="ask"]')).toBeTruthy(); // asked again for the new drive
    await click(m.host.querySelector('[data-rr-predict-skip]'));
    expect(m.host.querySelector('#rr-reflect-note').value).toBe('');
    expect(m.host.querySelectorAll('[data-rr-reflect-choice][aria-pressed="true"]')).toHaveLength(0);
  });
});
