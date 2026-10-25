import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

// WCAG 2.2.1 Timing Adjustable: Coaster Lab "Ride & Solve" gives each checkpoint
// question an 18-34 s clock and marks it wrong at zero. The ride is the only
// place these questions are offered, so the clock must be adjustable or
// turn-off-able. The header now has "Timer: on / relaxed (3x) / off",
// persisted in localStorage 'coaster_lab_ride_timer'.
//
// The real pauseForQuestion() is eval-sliced from the tool and run against
// stub DOM nodes. COASTER_RIDE_TIMER_SRC points at another copy (mutation
// check: the pre-fix copy must turn the "off" and "relaxed" cases red).

const FILE = process.env.COASTER_RIDE_TIMER_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function setup(mode) {
  // The timer-mode block is absent from the pre-fix copy; run without it so the
  // mutation check fails on behaviour rather than on a missing anchor.
  const timerBlock = SRC.includes('/* @clab-ridetimer-start */')
    ? sliceBetween(SRC, '/* @clab-ridetimer-start */', '/* @clab-ridetimer-end */', { file: FILE })
    : '';
  const pauseSrc = sliceBetween(SRC, 'function pauseForQuestion(){', 'function spawnAnswerBurst(', { file: FILE });
  const el = (tag) => document.createElement(tag || 'div');
  const rq = {
    box: el(), tag: el(), text: el(), choices: el(), viz: el(), feed: el(), viewport: el(),
    timer: el(), fill: el(), numRow: el(), score: el(), streak: el(), delta: el(),
    num: el('input'), go: el('button'), unit: el(),
  };
  const clock = { now: 1000 };
  const intervals = [];
  const submitted = [];
  const ride = { stops: [{ make: () => [], tag: 'Checkpoint' }], idx: 0, usedKeys: [], total: 0, score: 0, streak: 0, timerId: null };
  const store = { coaster_lab_ride_timer: mode };
  const fakeStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const api = new Function(
    'localStorage', 'ride', 'rq', 'sim', 'trackAt', 'pickRideQuestion', 'level', 'rideTopic', 'blip',
    'clearRideQuestionTimer', 'clearRideResumeTimer', 'clearRideBurstTimer', '__clabResources',
    'submitRideAnswer', 'performance', 'setInterval', 'setTimeout',
    timerBlock + '\n' + pauseSrc + '\nreturn { pauseForQuestion };',
  )(
    fakeStorage, ride, rq, { paused: false, S: 0, v: 10 }, () => ({ y: 10 }),
    () => ({ text: 'How fast?', key: 'k1', unit: 'm/s', answer: 5, explain: '', timerLen: 20 }),
    'explore', 'physics', () => {},
    () => {}, () => {}, () => {}, {},
    (val, instant) => submitted.push(val),
    { now: () => clock.now },
    (fn) => { intervals.push(fn); return intervals.length; },
    () => 0,
  );
  return { api, ride, rq, clock, intervals, submitted };
}

function advance(t, seconds) {
  t.clock.now += seconds * 1000;
  t.intervals.forEach((fn) => fn());
}

describe('Coaster Lab Ride & Solve question timer (WCAG 2.2.1)', () => {
  it('"on" keeps the original clock: time runs out and the answer is submitted empty', () => {
    const t = setup('on');
    t.api.pauseForQuestion();
    expect(t.ride.timerLen).toBe(20);
    expect(t.intervals.length).toBe(1);
    advance(t, 21);
    expect(t.submitted).toEqual([null]);
  });

  it('"relaxed" gives three times as long before time runs out', () => {
    const t = setup('relaxed');
    t.api.pauseForQuestion();
    expect(t.ride.timerLen).toBe(60);
    advance(t, 21);
    expect(t.submitted).toEqual([]);
    advance(t, 40);
    expect(t.submitted).toEqual([null]);
  });

  it('"off" starts no countdown, hides the timer bar and never auto-submits', () => {
    const t = setup('off');
    t.api.pauseForQuestion();
    expect(t.intervals.length).toBe(0);
    expect(t.rq.timer.hidden).toBe(true);
    expect(t.rq.timer.getAttribute('aria-valuetext')).toBe('No time limit');
    advance(t, 3600);
    expect(t.submitted).toEqual([]);
    expect(t.rq.box.hidden).toBe(false);
  });

  it('the header offers the timer choice next to the topic and grade selects', () => {
    // includes() + toBe: a failing toContain would diff the whole 750 KB source.
    for (const needle of ['<select id=\\"clab-rideTimer\\"', '<option value=\\"off\\">', "__clabGet('clab-rideTimer')"]) {
      expect(SRC.includes(needle), 'missing in source: ' + needle).toBe(true);
    }
  });
});
