import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_timeschedule.js';
const ID = 'timeSchedule';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

async function enterText(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Time & Schedule Lab', () => {
  it('registers and exposes strict, midnight-safe time helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Time & Schedule Lab');
    expect(tool.category).toBe('math');

    const pure = window.TimeSchedulePure;
    expect(pure.norm(-1)).toBe(1439);
    expect(pure.norm(Infinity)).toBe(0);
    expect(pure.time12(0)).toBe('12:00 AM');
    expect(pure.time12(720)).toBe('12:00 PM');
    expect(pure.time24(1439)).toBe('23:59');
    expect(pure.forwardDuration(1410, 15)).toBe(45);
    expect(pure.timeWithDay(1410, 15, false)).toBe('12:15 AM next day');
    const overnightTimeline = pure.scheduleTimeline(pure.schedules.overnight.events);
    expect(overnightTimeline[1]).toMatchObject({ start: 1410, end: 1455, duration: 45 });
    expect(overnightTimeline[2]).toMatchObject({ start: 1470, end: 1485, duration: 15 });
    expect(pure.scheduleTimeLabel(1470, false)).toBe('12:30 AM next day');
    expect(pure.parseTime('9:07 p.m.')).toBe(1267);
    expect(pure.parseDuration('1 h 15 m')).toBe(75);
    expect(pure.parseDuration('1:15')).toBe(75);
    expect(pure.parseDuration('-30 minutes')).toBeNull();
    expect(pure.parseDuration('1 hour bananas')).toBeNull();
    expect(pure.parseDuration('1 hour 15')).toBeNull();
  });

  it('enforces the representation requested by conversion questions', () => {
    const tool = loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    expect(pure.checkAnswer('6:40 PM', 'time', 1120, '24')).toMatchObject({
      valid: false, formatOk: false, ok: false,
    });
    expect(pure.checkAnswer('18:40', 'time', 1120, '24')).toMatchObject({
      valid: true, formatOk: true, ok: true,
    });
    expect(pure.checkAnswer('00:15', 'time', 15, '12')).toMatchObject({
      valid: false, formatOk: false, ok: false,
    });
    expect(pure.checkAnswer('12:15 AM', 'time', 15, '12')).toMatchObject({
      valid: true, formatOk: true, ok: true,
    });
    expect(pure.scheduleQuestions(pure.schedules.school)[2]).toMatchObject({
      type: 'time', answerFormat: '24', answer: 685,
    });
    expect(pure.scheduleQuestions(pure.schedules.overnight)[0]).toMatchObject({
      type: 'duration', answer: 45,
    });
    expect(pure.scheduleQuestions(pure.schedules.overnight)[0].explanation).toContain('next day');
    const elapsedQuest = tool.questHooks.find((hook) => hook.id === 'elapsed_explorer');
    const scheduleQuest = tool.questHooks.find((hook) => hook.id === 'schedule_reasoner');
    const challengeQuest = tool.questHooks.find((hook) => hook.id === 'time_master');
    expect(elapsedQuest.progress({ elapsedModels: 3, elapsedModelSignatures: {} })).toBe('0/3 models');
    expect(scheduleQuest.progress({ scheduleSolved: 99, scheduleSolvedKeys: { bogus: true } })).toBe('0/3 solved');
    expect(challengeQuest.progress({ score: { correct: 99 }, solvedChallenges: { bogus: true } })).toBe('0/5 correct');
  });

  it('uses stable challenge IDs, migrates legacy saves, and exposes deterministic difficulty bands', () => {
    loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    const ids = pure.challenges.map((challenge) => challenge.id);
    expect(new Set(ids).size).toBe(pure.challenges.length);
    expect(pure.challenges.every((challenge) => ['foundation', 'practice', 'stretch'].includes(challenge.difficulty))).toBe(true);
    expect(pure.challengesForDifficulty('stretch').map((challenge) => challenge.id)).toEqual([
      'overnight-movie-end', 'interval-noon-bridge', 'convert-2107-12h',
    ]);
    expect(pure.normalizeChallengeMap({
      3: true, 9: true, 'convert-1840-24h': true, bogus: true,
    })).toEqual({
      'convert-1840-24h': true, 'convert-2107-12h': true,
    });
    expect(pure.challengeMissedIds({
      missedChallenges: { 3: true, 'interval-noon-bridge': true },
      solvedChallenges: { 'convert-1840-24h': true },
    }, 'all')).toEqual(['interval-noon-bridge']);

    const html = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengeDifficulty: 'stretch',
        challengeId: 'overnight-movie-end', challengeIndex: 0,
      },
    });
    expect(html).toContain('Challenge 1 of 3');
    expect(html).toContain('Stretch / stretch');
    expect(html).toContain('A movie starts at 11:35 PM');
  });

  it('uses semantic schedule-question IDs and normalizes legacy positional progress', () => {
    loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    const legacyIds = [
      'event-duration', 'between-events-gap', 'event-start-24h', 'full-schedule-span',
    ];
    expect(pure.scheduleQuestions(pure.schedules.school).map((question) => question.id)).toEqual(legacyIds);
    expect(pure.legacyScheduleQuestionIds).toEqual(legacyIds);
    expect(Object.isFrozen(pure.legacyScheduleQuestionIds)).toBe(true);
    expect(pure.normalizeScheduleSolvedMap({
      'school:0': true,
      'school:event-duration': true,
      'overnight:3': true,
      'school:99': true,
      bogus: true,
    })).toEqual({
      'school:event-duration': true,
      'overnight:full-schedule-span': true,
    });
  });

  it('falls back safely from stale retry persistence and restores solved challenge details', () => {
    loadTool(FILE, ID);
    const stale = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengePracticeMode: 'retry', challengeDifficulty: 'stretch',
        challengeId: 'removed-challenge', challengeAnswer: '12:25 AM',
        challengeFeedback: { ok: true, challengeId: 'removed-challenge', message: 'stale' },
        missedChallenges: { 'read-clock-0735': true },
      },
    });
    expect(stale).toContain('Challenge 1 of 3');
    expect(stale).toContain('A movie starts at 11:35 PM');
    expect(stale).not.toContain('undefined');
    document.body.innerHTML = stale;
    const allChallenges = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'All challenges');
    const retryMissed = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Retry missed (0)');
    expect(allChallenges.getAttribute('aria-pressed')).toBe('true');
    expect(retryMissed.getAttribute('aria-pressed')).toBe('false');
    expect(retryMissed.disabled).toBe(true);
    expect(document.getElementById('ts-challenge-answer').value).toBe('');

    const solved = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengeId: 'convert-1840-24h', challengeAnswer: 'stale',
        solvedChallenges: { 'convert-1840-24h': true },
      },
    });
    expect(solved).toContain('value="18:40"');
    expect(solved).toContain('disabled=""');
    expect(solved).toContain('Solved previously.');
    expect(solved).toContain('6 + 12 = 18');
  });

  it('trusts successful retry feedback only when normalized solved progress confirms it', () => {
    loadTool(FILE, ID);
    const unsolved = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengePracticeMode: 'retry', challengeDifficulty: 'stretch',
        challengeId: 'overnight-movie-end',
        challengeFeedback: {
          ok: true, challengeId: 'overnight-movie-end', message: 'Unconfirmed success.',
        },
      },
    });
    document.body.innerHTML = unsolved;
    let allChallenges = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'All challenges');
    let retryMissed = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Retry missed (0)');
    expect(allChallenges.getAttribute('aria-pressed')).toBe('true');
    expect(retryMissed.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById('ts-challenge-answer').disabled).toBe(false);
    expect(document.body.textContent).not.toContain('Unconfirmed success.');

    const legacySolved = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengePracticeMode: 'retry', challengeDifficulty: 'stretch',
        challengeId: 'overnight-movie-end', solvedChallenges: { 7: true },
        challengeFeedback: {
          ok: true, challengeId: 'overnight-movie-end', message: 'Confirmed legacy solve.',
        },
      },
    });
    document.body.innerHTML = legacySolved;
    allChallenges = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'All challenges');
    retryMissed = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Retry missed (0)');
    expect(allChallenges.getAttribute('aria-pressed')).toBe('false');
    expect(retryMissed.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('ts-challenge-answer').disabled).toBe(true);
    expect(document.body.textContent).toContain('Confirmed legacy solve.');
  });

  it('drops fully unscoped feedback while retaining legacy index-scoped feedback', () => {
    loadTool(FILE, ID);
    const unscopedSchedule = renderTool(ID, {
      _timeSchedule: {
        tab: 'schedule', scheduleFeedback: { ok: false, message: 'Unscoped schedule result.' },
      },
    });
    document.body.innerHTML = unscopedSchedule;
    let input = document.getElementById('ts-schedule-answer');
    expect(document.getElementById('ts-schedule-feedback')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBe('ts-schedule-prompt');
    expect(document.body.textContent).not.toContain('Unscoped schedule result.');

    const legacySchedule = renderTool(ID, {
      _timeSchedule: {
        tab: 'schedule', scheduleFeedback: {
          ok: false, schedule: 'school', index: 0, message: 'Legacy schedule result.',
        },
      },
    });
    document.body.innerHTML = legacySchedule;
    input = document.getElementById('ts-schedule-answer');
    expect(document.getElementById('ts-schedule-feedback')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.textContent).toContain('Legacy schedule result.');

    const unscopedChallenge = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengeIndex: 2,
        challengeFeedback: { ok: false, message: 'Unscoped challenge result.' },
      },
    });
    document.body.innerHTML = unscopedChallenge;
    input = document.getElementById('ts-challenge-answer');
    expect(document.getElementById('ts-challenge-feedback')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBe('ts-challenge-prompt');
    expect(document.body.textContent).not.toContain('Unscoped challenge result.');

    const legacyChallenge = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengeIndex: 2,
        challengeFeedback: { ok: false, index: 2, message: 'Legacy challenge result.' },
      },
    });
    document.body.innerHTML = legacyChallenge;
    input = document.getElementById('ts-challenge-answer');
    expect(document.getElementById('ts-challenge-feedback')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.textContent).toContain('Legacy challenge result.');
  });

  it('checks a blank derived answer after stale fallback and aligns identity on edit', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _timeSchedule: {
          tab: 'challenge', challengePracticeMode: 'retry', challengeDifficulty: 'stretch',
          challengeId: 'removed-challenge', challengeAnswer: '12:25 AM',
          challengeFeedback: { ok: true, challengeId: 'removed-challenge', message: 'stale' },
          missedChallenges: { 'read-clock-0735': true },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    document.body.innerHTML = '<div id="root"></div>';
    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let input = document.getElementById('ts-challenge-answer');
    expect(input.value).toBe('');
    let check = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.solvedChallenges).toEqual({});
    expect(latest._timeSchedule.challengeFeedback).toMatchObject({
      ok: false, challengeId: 'overnight-movie-end',
    });
    expect(awardXP).not.toHaveBeenCalled();

    input = document.getElementById('ts-challenge-answer');
    await enterText(input, '12:25 AM');
    expect(latest._timeSchedule.challengeId).toBe('overnight-movie-end');
    check = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.solvedChallenges['overnight-movie-end']).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('associates schedule and challenge inputs with their prompts and feedback', () => {
    loadTool(FILE, ID);
    const schedule = renderTool(ID, {
      _timeSchedule: {
        tab: 'schedule', scheduleKey: 'school', scheduleQuestionIndex: 0,
        scheduleAnswer: '49',
        scheduleFeedback: {
          ok: false, schedule: 'school', questionId: 'event-duration', message: 'Try the timeline.',
        },
      },
    });
    document.body.innerHTML = schedule;
    const scheduleInput = document.getElementById('ts-schedule-answer');
    expect(document.querySelector('label[for="ts-schedule-answer"]')).toBeTruthy();
    expect(document.getElementById('ts-schedule-prompt')).toBeTruthy();
    expect(document.getElementById('ts-schedule-feedback')).toBeTruthy();
    expect(scheduleInput.getAttribute('aria-invalid')).toBe('true');
    expect(scheduleInput.getAttribute('aria-describedby')).toBe(
      'ts-schedule-prompt ts-schedule-feedback',
    );

    const challenge = renderTool(ID, {
      _timeSchedule: {
        tab: 'challenge', challengeId: 'interval-1320-1455', challengeAnswer: '90',
        challengeFeedback: {
          ok: false, challengeId: 'interval-1320-1455', message: 'Try the timeline.',
        },
      },
    });
    document.body.innerHTML = challenge;
    const challengeInput = document.getElementById('ts-challenge-answer');
    expect(document.querySelector('label[for="ts-challenge-answer"]')).toBeTruthy();
    expect(document.getElementById('ts-challenge-prompt')).toBeTruthy();
    expect(document.getElementById('ts-challenge-feedback')).toBeTruthy();
    expect(challengeInput.getAttribute('aria-invalid')).toBe('true');
    expect(challengeInput.getAttribute('aria-describedby')).toBe(
      'ts-challenge-prompt ts-challenge-feedback',
    );
  });

  it('uses contrast-safe active direction and schedule action colors', () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, {
      _timeSchedule: { tab: 'elapsed', elapsedDirection: 1 },
    });
    let active = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Count forward');
    expect(active.classList.contains('bg-emerald-700')).toBe(true);
    expect(active.classList.contains('bg-emerald-600')).toBe(false);

    document.body.innerHTML = renderTool(ID, {
      _timeSchedule: { tab: 'elapsed', elapsedDirection: -1 },
    });
    active = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Count backward');
    expect(active.classList.contains('bg-amber-800')).toBe(true);
    expect(active.classList.contains('bg-amber-600')).toBe(false);

    document.body.innerHTML = renderTool(ID, {
      _timeSchedule: { tab: 'schedule' },
    });
    const check = [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Check answer');
    expect(check.classList.contains('bg-amber-800')).toBe(true);
    expect(check.classList.contains('hover:bg-amber-900')).toBe(true);
    const scheduleRegion = document.querySelector('[role="region"][aria-label$="scrollable event schedule"]');
    expect(scheduleRegion).toBeTruthy();
    expect(scheduleRegion.tabIndex).toBe(0);
    expect(scheduleRegion.classList.contains('focus:ring-violet-600')).toBe(true);
  });

  it('exposes scoped light, dark, and high-contrast theme states', () => {
    loadTool(FILE, ID);
    const light = renderTool(ID, { _timeSchedule: { tab: 'clock' } });
    const dark = renderTool(ID, { _timeSchedule: { tab: 'schedule' } }, { isDark: true });
    const contrast = renderTool(ID, { _timeSchedule: { tab: 'challenge' } }, { isDark: true, isContrast: true });
    expect(light).toContain('data-theme="light"');
    expect(dark).toContain('time-schedule-lab--dark');
    expect(dark).toContain('data-theme="dark"');
    expect(contrast).toContain('time-schedule-lab--contrast');
    expect(contrast).toContain('data-theme="contrast"');
    expect(contrast).toContain(':focus-visible{outline:3px solid #ff0');
  });
  it('builds friendly jumps across midnight in both directions', () => {
    loadTool(FILE, ID);
    const pure = window.TimeSchedulePure;
    expect(pure.makeJumps(1415, 50, 1)).toEqual([
      { from: 1415, to: 0, amount: 25 },
      { from: 0, to: 25, amount: 25 },
    ]);
    expect(pure.makeJumps(910, 55, -1)).toEqual([
      { from: 910, to: 900, amount: 10 },
      { from: 900, to: 855, amount: 45 },
    ]);
  });

  it('renders all four sections and complete ARIA tab semantics', () => {
    loadTool(FILE, ID);
    const expected = {
      clock: 'Set an exact time',
      elapsed: 'Text alternative: jump strategy',
      schedule: 'Schedule reasoning',
      challenge: 'Challenge 1 of',
    };
    for (const [tab, anchor] of Object.entries(expected)) {
      const html = renderTool(ID, { _timeSchedule: { tab } });
      expect(html).toContain('Time &amp; Schedule Lab');
      expect(html).toContain(anchor);
      expect(html).toContain('aria-controls="ts-tab-panel"');
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
      expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
  });

  it('plots backward elapsed time from right to left', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _timeSchedule: {
        tab: 'elapsed', elapsedStart: 910, elapsedDuration: 55,
        elapsedDirection: -1, use24: true,
      },
    });
    expect(html).toContain('Earlier starting time');
    expect(html).toContain('14:15');
    expect(html).toContain('cx="665"');
    expect(html).toContain('cx="55"');
  });

  it('renders overnight event lengths, gaps, spans, and next-day context', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _timeSchedule: { tab: 'schedule', scheduleKey: 'overnight', scheduleQuestionIndex: 0 },
    });
    expect(html).toContain('Overnight Observation');
    expect(html).toContain('Sky observation');
    expect(html).toContain('12:15 AM next day');
    expect(html).toContain('12:30 AM next day');
    expect(html).toContain('1:00 AM next day');
    expect(html).toContain('crosses midnight');
    expect(html).toContain('\uD83C\uDF19 Overnight Observation');
    expect(html).not.toContain('?? Overnight Observation');
    expect(html).toContain('45 minutes');
    expect(html).toContain('3 hours 30 minutes');
    expect(html).not.toContain('-45');
  });

  it('bases challenge progress on unique solves, not navigation position', () => {
    loadTool(FILE, ID);
    const untouched = renderTool(ID, {
      _timeSchedule: { tab: 'challenge', challengeIndex: 9, solvedChallenges: {} },
    });
    document.body.innerHTML = untouched;
    let progress = document.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuetext')).toContain('currently viewing challenge 10');
    expect(progress.firstElementChild.getAttribute('style')).toContain('width:0%');

    const partial = renderTool(ID, {
      _timeSchedule: { tab: 'challenge', challengeIndex: 9, solvedChallenges: { 0: true, 1: true, bogus: true } },
    });
    document.body.innerHTML = partial;
    progress = document.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.firstElementChild.getAttribute('style')).toContain('width:20%');
  });

  it('counts distinct elapsed-time models instead of repeated control events', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({ _timeSchedule: { tab: 'elapsed' } });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const forward = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Count forward');
    await React.act(async () => { forward.click(); forward.click(); });
    expect(latest._timeSchedule.elapsedModels).toBe(0);

    const backward = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Count backward');
    await React.act(async () => { backward.click(); backward.click(); });
    expect(latest._timeSchedule.elapsedModels).toBe(1);
    const numberInputs = [...document.querySelectorAll('input[type="number"]')];
    await enterText(numberInputs[0], '2');
    await enterText(numberInputs[1], '30');
    expect(latest._timeSchedule.elapsedModels).toBe(3);
    expect(Object.keys(latest._timeSchedule.elapsedModelSignatures)).toHaveLength(3);
    const quest = tool.questHooks.find((hook) => hook.id === 'elapsed_explorer');
    expect(quest.progress(latest._timeSchedule)).toBe('3/3 models');
    await React.act(async () => { root.unmount(); });
  });

  it('persists unique schedule solves and cannot farm XP after editing', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        outside: { keep: true },
        _timeSchedule: {
          tab: 'schedule', scheduleKey: 'school', scheduleQuestionIndex: 0,
          scheduleAnswer: '50',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.scheduleSolvedKeys['school:event-duration']).toBe(true);
    expect(latest._timeSchedule.scheduleSolvedKeys['school:0']).toBeUndefined();
    expect(latest._timeSchedule.scheduleSolved).toBe(1);
    expect(awardXP).toHaveBeenCalledWith('timeSchedule', 5, 'schedule reasoning');

    const input = document.querySelector('input[type="text"]');
    await enterText(input, '50 ');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.scheduleSolved).toBe(1);
    expect(latest.outside).toEqual({ keep: true });
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('migrates legacy schedule progress when another question is solved', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _timeSchedule: {
          tab: 'schedule', scheduleKey: 'school', scheduleQuestionIndex: 1,
          scheduleAnswer: '15', scheduleSolvedKeys: { 'school:0': true },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.scheduleSolvedKeys).toEqual({
      'school:event-duration': true,
      'school:between-events-gap': true,
    });
    expect(latest._timeSchedule.scheduleSolved).toBe(2);
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });

  it('rejects the wrong conversion form, then scores the strict answer once', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _timeSchedule: { tab: 'challenge', challengeIndex: 3, challengeAnswer: '6:40 PM' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); });
    expect(document.body.textContent).toContain('Use 24-hour form');
    expect(awardXP).not.toHaveBeenCalled();

    const input = document.querySelector('input[type="text"]');
    await enterText(input, '18:40');
    await React.act(async () => { check.click(); });
    expect(latest._timeSchedule.solvedChallenges['convert-1840-24h']).toBe(true);
    expect(latest._timeSchedule.solvedChallenges['3']).toBeUndefined();
    expect(latest._timeSchedule.missedChallenges['convert-1840-24h']).toBeUndefined();
    expect(latest._timeSchedule.challengeAttempts['convert-1840-24h']).toBe(2);
    expect(latest._timeSchedule.score).toEqual({ correct: 1, total: 1 });
    expect(awardXP).toHaveBeenCalledWith('timeSchedule', 5, 'time challenge');
    await React.act(async () => { root.unmount(); });
  });

  it('builds a stable retry-missed queue and awards XP only when the missed challenge is solved', async () => {
    const tool = loadTool(FILE, ID);
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _timeSchedule: {
          tab: 'challenge', challengeId: 'interval-1320-1455', challengeAnswer: '90',
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._timeSchedule.missedChallenges['interval-1320-1455']).toBe(true);
    expect(latest._timeSchedule.challengeAttempts['interval-1320-1455']).toBe(1);
    expect(latest._timeSchedule.score).toEqual({ correct: 0, total: 1 });
    expect(awardXP).not.toHaveBeenCalled();

    const next = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Next challenge');
    await React.act(async () => { next.click(); });
    expect(latest._timeSchedule.challengeId).not.toBe('interval-1320-1455');
    const retry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Retry missed (1)');
    await React.act(async () => { retry.click(); });
    expect(latest._timeSchedule.challengePracticeMode).toBe('retry');
    expect(latest._timeSchedule.challengeId).toBe('interval-1320-1455');

    const input = document.querySelector('input[type="text"]');
    await enterText(input, '95');
    check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._timeSchedule.solvedChallenges['interval-1320-1455']).toBe(true);
    expect(latest._timeSchedule.missedChallenges['interval-1320-1455']).toBeUndefined();
    expect(latest._timeSchedule.challengeAttempts['interval-1320-1455']).toBe(2);
    expect(latest._timeSchedule.score).toEqual({ correct: 1, total: 2 });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Retry missed (0)');

    const finishRetry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Next challenge');
    await React.act(async () => { finishRetry.click(); });
    expect(latest._timeSchedule.challengePracticeMode).toBe('all');
    expect(latest._timeSchedule.challengeId).toBe('convert-1840-24h');
    await React.act(async () => { root.unmount(); });
  });

  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'timeSchedule'");
    expect(host).toContain('timeSchedule: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_timeschedule.js'");
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_timeschedule.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
    expect(fs.readFileSync(FILE, 'utf8')).toContain("selected ? 'text-white' : 'text-slate-700'");
    expect(fs.readFileSync(FILE, 'utf8')).toContain("text-indigo-700 font-bold");
  });
});
