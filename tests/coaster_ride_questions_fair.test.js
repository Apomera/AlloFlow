// Coaster Lab Ride & Solve: fair multiple choice and feedback a student can read.
// Runs the tool's own functions (slices of the shipped file), not string pins.
//
//  - The physics choice questions listed the right answer FIRST in 17 of 22
//    questions, and pauseForQuestion drew them in that order, so "always tap A"
//    scored well. In three questions the right answer was also the longest.
//  - A wrong tap showed the right answer's explanation only, never why the
//    tapped idea is wrong.
//  - The feedback card closed by itself after 1.3 s (right) or 2.6 s (wrong),
//    even with the timer turned off, so the "why" vanished before most students
//    could read it.
// COASTER_RQ_SRC points at another copy (mutation check against start.js).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.COASTER_RQ_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const constant = (name) => sliceBetween(SRC, `const ${name} = `, ';', { file: FILE, label: name, includeEnd: true });

function loadStops() {
  const body = [
    constant('G0'),
    constant('BRAKE_DECEL'),
    sliceBetween(SRC, 'const fmt = ', '\n', { file: FILE, label: 'fmt' }),
    sliceBetween(SRC, 'function buildRideStops(){', '\nfunction startRide(){', { file: FILE, label: 'buildRideStops' }),
  ].join('\n');
  return new Function('analysis', 'level', 'track', 'design', 'trackAt', 'brakeLen', 'STOP_AT',
    body + '\nreturn buildRideStops();');
}
const A = { s: 60, h: 29.4, v: 3.5 }, B = { s: 130, h: 4.6, r: 28 };
const C = { s: 200, h: 26.3, r: 6.5 };
const LAUNCH = { s: 20, a: 7.5, len: 40, h: 2 };
// D after B asks about the brakes; D before B asks about the drop
const D_LATE = { s: 300, h: 8.4, r: 19.4 }, D_EARLY = { s: 100, h: 8.4, r: 19.4 };
const DESIGNS = [
  { a: { A, B, D: D_LATE }, mode: 'chain' },
  { a: { A, B, D: D_EARLY }, mode: 'chain' },
  { a: { A, B, C, D: D_LATE }, mode: 'chain' },
  { a: { L: LAUNCH, A, B, D: D_LATE }, mode: 'launch' },
];

function allChoiceQuestions() {
  const seen = new Map();
  const build = loadStops();
  for (const d of DESIGNS) {
    for (const level of ['explore', 'engineer']) {
      const stops = build(d.a, level, { L: 420 }, { propulsion: { mode: d.mode } }, () => ({ y: 3.2 }), () => 50, 4);
      for (const st of stops) {
        for (const q of st.make({ v: 10, h: 12, s: st.s })) if (q.choices) seen.set(q.key, q);
      }
    }
  }
  return [...seen.values()];
}

describe('Coaster Lab Ride & Solve multiple choice is fair', () => {
  const qs = allChoiceQuestions();

  it('finds the whole explore pool', () => {
    expect(qs.length).toBeGreaterThanOrEqual(20);
  });

  it('every wrong option explains its misconception, and the right one has none', () => {
    for (const q of qs) {
      expect(q.why, q.key).toBeTruthy();
      for (const [v] of q.choices) {
        if (v === q.correct) expect(q.why[v], q.key + ' correct').toBeUndefined();
        else {
          expect(typeof q.why[v], q.key + ' / ' + v).toBe('string');
          expect(q.why[v].length, q.key + ' / ' + v).toBeGreaterThan(15);
        }
      }
    }
  });

  it('the right answer is never the one option that is clearly longest', () => {
    for (const q of qs) {
      const len = (v) => q.choices.find((c) => c[0] === v)[1].length;
      const right = len(q.correct);
      const longestWrong = Math.max(...q.choices.filter((c) => c[0] !== q.correct).map((c) => c[1].length));
      // a clear length cue: the right answer is 1.4x longer than every distractor
      expect(right <= longestWrong * 1.4, q.key + ` (${right} vs ${longestWrong})`).toBe(true);
    }
  });

  it('pauseForQuestion shows the options in a shuffled order, not the authored order', () => {
    const timerBlock = SRC.includes('/* @clab-ridetimer-start */')
      ? sliceBetween(SRC, '/* @clab-ridetimer-start */', '/* @clab-ridetimer-end */', { file: FILE })
      : '';
    const shuffleBlock = SRC.includes('function shuffleRideChoices(')
      ? sliceBetween(SRC, 'function shuffleRideChoices(', '\n}\n', { file: FILE, includeStart: true, includeEnd: true })
      : '';
    const pauseSrc = sliceBetween(SRC, 'function pauseForQuestion(){', 'function spawnAnswerBurst(', { file: FILE });
    const el = (tag) => document.createElement(tag || 'div');
    const firstPositions = new Map();
    const q = { key: 'k', text: 'Which?', choices: [['r', 'Right'], ['w1', 'Wrong one'], ['w2', 'Wrong two']], correct: 'r', explain: '' };
    for (let run = 0; run < 60; run++) {
      const rq = {
        box: el(), tag: el(), text: el(), choices: el(), viz: el(), feed: el(), viewport: el(),
        timer: el(), fill: el(), numRow: el(), score: el(), streak: el(), delta: el(),
        num: el('input'), go: el('button'), unit: el(), next: el('button'), read: el('button'),
      };
      const ride = { stops: [{ make: () => [], tag: 'Checkpoint' }], idx: 0, usedKeys: [], total: 0, score: 0, streak: 0, timerId: null };
      const api = new Function(
        'localStorage', 'ride', 'rq', 'sim', 'trackAt', 'pickRideQuestion', 'level', 'rideTopic', 'blip',
        'clearRideQuestionTimer', 'clearRideResumeTimer', 'clearRideBurstTimer', '__clabResources',
        'submitRideAnswer', 'performance', 'setInterval', 'setTimeout',
        timerBlock + '\n' + shuffleBlock + '\n' + pauseSrc + '\nreturn { pauseForQuestion };',
      )(
        { getItem: () => 'off', setItem() {} }, ride, rq, { paused: false, S: 0, v: 10 }, () => ({ y: 10 }),
        () => ({ ...q, choices: q.choices.map((c) => c.slice()) }), 'explore', 'physics', () => {},
        () => {}, () => {}, () => {}, {},
        () => {}, { now: () => 0 }, () => 1, () => 0,
      );
      api.pauseForQuestion();
      const order = [...rq.choices.querySelectorAll('button')].map((b) => b.dataset.v);
      expect(order.slice().sort()).toEqual(['r', 'w1', 'w2']);
      firstPositions.set(order.indexOf('r'), true);
      // the A/B/C badges stay in screen order
      expect([...rq.choices.querySelectorAll('button')].map((b) => b.dataset.key)).toEqual(['A', 'B', 'C']);
    }
    // over 60 rides the right answer has sat in every position
    expect([...firstPositions.keys()].sort()).toEqual([0, 1, 2]);
  });
});

describe('Coaster Lab Ride & Solve feedback stays until the student moves on', () => {
  function setup(timerMode) {
    const s = SRC.indexOf('function submitRideAnswer(val, instant){');
    const e = SRC.indexOf('function cleanupRide', s);
    const scheduled = [];
    const ride = {
      active: true, idx: 0, current: { choices: [['a', 'Heat'], ['b', 'Height']], correct: 'a', explain: 'Brakes turn motion into heat.', why: { b: 'Brakes are on flat track, so nothing is lifted.' } },
      qStart: 0, timerLen: 30, times: [], score: 0, streak: 0, correct: 0, bestStreak: 0,
      results: [], resumeId: null, burstId: null,
    };
    const choices = document.createElement('div');
    choices.innerHTML = '<button data-v="a">Heat</button><button data-v="b">Height</button>';
    const mk = (t) => document.createElement(t || 'div');
    const rq = {
      choices, num: mk('input'), go: mk('button'), numRow: mk(), timer: mk('span'), feed: mk('p'),
      score: mk('span'), streak: mk('span'), delta: mk('span'), viewport: mk(), viz: null, box: mk(),
      next: mk('button'),
    };
    rq.next.hidden = true;
    const sim = { paused: true };
    const submit = new Function(
      'ride', 'rq', 'performance', 'clearRideQuestionTimer', 'clearRideResumeTimer', 'clearRideBurstTimer',
      'setTimeout', '__clabResources', 'fmt', 'blip', 'reducedMotion', 'sim', 'spawnAnswerBurst', 'rideTimerMode',
      SRC.slice(s, e) + '\nreturn submitRideAnswer;'
    )(
      ride, rq, { now: () => 1000 }, () => {}, () => {}, () => {},
      (fn, delay) => { scheduled.push({ fn, delay }); return scheduled.length; }, {},
      String, () => {}, () => false, sim, () => {}, timerMode,
    );
    return { submit, ride, rq, sim, scheduled };
  }

  it('a wrong answer explains the misconception and waits for Continue', () => {
    const t = setup('on');
    t.submit('b', false);
    expect(t.rq.feed.textContent).toContain('nothing is lifted');
    expect(t.rq.feed.textContent).toContain('Brakes turn motion into heat.');
    expect(t.scheduled).toEqual([]);
    expect(t.rq.next.hidden).toBe(false);
    expect(t.sim.paused).toBe(true);
    t.rq.next.click();
    expect(t.sim.paused).toBe(false);
    expect(t.ride.idx).toBe(1);
    expect(t.rq.box.hidden).toBe(true);
  });

  it('a right answer keeps the quick auto-continue while the clock is on', () => {
    const t = setup('on');
    t.submit('a', false);
    expect(t.scheduled.map((x) => x.delay)).toEqual([1300]);
  });

  it('with the timer relaxed or off, even a right answer waits for Continue', () => {
    for (const mode of ['relaxed', 'off']) {
      const t = setup(mode);
      t.submit('a', false);
      expect(t.scheduled, mode).toEqual([]);
      expect(t.rq.next.hidden, mode).toBe(false);
    }
  });

  it('the test hook (instant) still moves straight on', () => {
    const t = setup('on');
    t.submit('b', true);
    expect(t.ride.idx).toBe(1);
    expect(t.sim.paused).toBe(false);
  });
});
