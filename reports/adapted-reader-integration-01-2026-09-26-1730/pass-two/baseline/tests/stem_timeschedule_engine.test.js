import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Time & Schedule Lab: time parsing/formatting,
// the jump-decomposition engine, midnight-crossing schedule timelines, the
// derived schedule questions, and every Challenge Lab answer recomputed.

const src = fs.readFileSync('stem_lab/stem_tool_timeschedule.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_timeschedule.js', 'utf8');

const win = { StemLab: { registerTool() {} } };
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const Pure = win.TimeSchedulePure;

describe('time formatting', () => {
  it('formats the tricky hours: midnight, noon, and wraps', () => {
    expect(Pure.time12(0)).toBe('12:00 AM');
    expect(Pure.time12(720)).toBe('12:00 PM');
    expect(Pure.time12(1439)).toBe('11:59 PM');
    expect(Pure.time24(0)).toBe('00:00');
    expect(Pure.time24(1120)).toBe('18:40');
    expect(Pure.norm(1465)).toBe(25);
    expect(Pure.norm(-10)).toBe(1430);
  });

  it('durationText pluralizes and mixes hours with minutes', () => {
    expect(Pure.durationText(1)).toBe('1 minute');
    expect(Pure.durationText(60)).toBe('1 hour');
    expect(Pure.durationText(95)).toBe('1 hour 35 minutes');
    expect(Pure.durationText(61)).toBe('1 hour 1 minute');
  });
});

describe('time parsing', () => {
  it('accepts 12-hour, 24-hour, and dotted forms', () => {
    expect(Pure.parseTime('6:40 PM')).toBe(1120);
    expect(Pure.parseTime('6:40 p.m.')).toBe(1120);
    expect(Pure.parseTime('12 am')).toBe(0);
    expect(Pure.parseTime('12:15 AM')).toBe(15);
    expect(Pure.parseTime('12 pm')).toBe(720);
    expect(Pure.parseTime('13:25')).toBe(805);
    expect(Pure.parseTime('9')).toBe(540);
  });

  it('rejects impossible times', () => {
    expect(Pure.parseTime('13:25 pm')).toBeNull();
    expect(Pure.parseTime('0:30 am')).toBeNull();
    expect(Pure.parseTime('24:00')).toBeNull();
    expect(Pure.parseTime('7:65')).toBeNull();
    expect(Pure.parseTime('')).toBeNull();
  });

  it('parses durations in minutes, h/m compounds, and colon form', () => {
    expect(Pure.parseDuration('95')).toBe(95);
    expect(Pure.parseDuration('95 min')).toBe(95);
    expect(Pure.parseDuration('1 h 35 m')).toBe(95);
    expect(Pure.parseDuration('1:35')).toBe(95);
    expect(Pure.parseDuration('1.5 hours')).toBe(90);
    expect(Pure.parseDuration('2:75')).toBeNull();
    expect(Pure.parseDuration('soon')).toBeNull();
  });

  it('enforces the requested answer format without accepting wrong values', () => {
    expect(Pure.matchesTimeFormat('18:40', '24')).toBe(true);
    expect(Pure.matchesTimeFormat('6:40 pm', '24')).toBe(false);
    expect(Pure.matchesTimeFormat('6:40 pm', '12')).toBe(true);
    expect(Pure.matchesTimeFormat('18:40', '12')).toBe(false);
    const rightValueWrongFormat = Pure.checkAnswer('6:40 pm', 'time', 1120, '24');
    expect(rightValueWrongFormat.ok).toBe(false);
    expect(rightValueWrongFormat.formatOk).toBe(false);
    expect(Pure.checkAnswer('18:40', 'time', 1120, '24').ok).toBe(true);
    expect(Pure.checkAnswer('1 h 35 m', 'duration', 95).ok).toBe(true);
  });
});

describe('jump decomposition (makeJumps)', () => {
  it('breaks 9:45 + 90 minutes into hour-friendly jumps that land at 11:15', () => {
    const jumps = Pure.makeJumps(585, 90, 1);
    expect(jumps.map((j) => j.amount)).toEqual([15, 60, 15]);
    expect(jumps[jumps.length - 1].to).toBe(675);
    expect(jumps.reduce((s, j) => s + j.amount, 0)).toBe(90);
  });

  it('counts backward to the previous hour first', () => {
    const jumps = Pure.makeJumps(910, 55, -1);
    expect(jumps.map((j) => j.amount)).toEqual([10, 45]);
    expect(jumps[jumps.length - 1].to).toBe(855);
  });

  it('crosses midnight and handles the zero interval', () => {
    const jumps = Pure.makeJumps(1415, 50, 1);
    expect(jumps[jumps.length - 1].to).toBe(25);
    expect(Pure.makeJumps(600, 0, 1)).toEqual([]);
  });
});

describe('schedule timelines', () => {
  it('keeps the overnight schedule monotonic across midnight', () => {
    const timeline = Pure.scheduleTimeline(Pure.schedules.overnight.events);
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].start).toBeGreaterThanOrEqual(timeline[i - 1].end);
    }
    expect(timeline.map((x) => x.duration)).toEqual([30, 45, 15, 45, 30]);
    expect(timeline[timeline.length - 1].end - timeline[0].start).toBe(210);
    expect(Pure.scheduleTimeLabel(timeline[2].start, false)).toContain('next day');
  });

  it('derived schedule questions are self-consistent for every schedule', () => {
    for (const key of Object.keys(Pure.schedules)) {
      const schedule = Pure.schedules[key];
      const timeline = Pure.scheduleTimeline(schedule.events);
      const qs = Pure.scheduleQuestions(schedule);
      const byId = Object.fromEntries(qs.map((q) => [q.id, q]));
      expect(byId['event-duration'].answer, key).toBe(timeline[1].duration);
      expect(byId['between-events-gap'].answer, key).toBe(timeline[2].start - timeline[1].end);
      expect(byId['event-start-24h'].answer, key).toBe(schedule.events[3][1]);
      expect(byId['full-schedule-span'].answer, key).toBe(timeline[timeline.length - 1].end - timeline[0].start);
      for (const q of qs) expect(q.explanation.length, key + ':' + q.id).toBeGreaterThan(0);
    }
  });
});

describe('challenge bank', () => {
  it('every answer is recomputable from its own prompt', () => {
    const byId = Object.fromEntries(Pure.challenges.map((c) => [c.id, c]));
    expect(byId['read-clock-0735'].answer).toBe(byId['read-clock-0735'].clock);
    expect(Pure.time12(byId['read-clock-0735'].answer)).toBe('7:35 AM');
    expect(byId['elapsed-workshop-end'].answer).toBe(9 * 60 + 45 + 90);
    expect(byId['interval-1320-1455'].answer).toBe((14 * 60 + 55) - (13 * 60 + 20));
    expect(Pure.time24(byId['convert-1840-24h'].answer)).toBe('18:40');
    expect(Pure.time12(byId['convert-1840-24h'].answer)).toBe('6:40 PM');
    expect(Pure.time12(byId['convert-0015-12h'].answer)).toBe('12:15 AM');
    expect(byId['schedule-bus-ride'].answer).toBe(Pure.forwardDuration(7 * 60 + 28, 8 * 60 + 6));
    expect(byId['elapsed-practice-start'].answer).toBe((15 * 60 + 10) - 55);
    expect(byId['overnight-movie-end'].answer).toBe(Pure.norm(23 * 60 + 35 + 50));
    expect(byId['interval-noon-bridge'].answer).toBe((13 * 60 + 5) - (10 * 60 + 50));
    expect(Pure.time12(byId['convert-2107-12h'].answer)).toBe('9:07 PM');
    expect(new Set(Pure.challenges.map((c) => c.id)).size).toBe(Pure.challenges.length);
  });

  it('difficulty filtering and legacy-index migration behave', () => {
    expect(Pure.challengesForDifficulty('all').length).toBe(Pure.challenges.length);
    const stretch = Pure.challengesForDifficulty('stretch');
    expect(stretch.length).toBeGreaterThan(0);
    for (const c of stretch) expect(c.difficulty).toBe('stretch');
    expect(Pure.challengesForDifficulty('bogus').length).toBe(Pure.challenges.length);

    const migrated = Pure.normalizeChallengeMap({ 0: true, 'convert-1840-24h': true, ghost: true });
    expect(migrated[Pure.challenges[0].id]).toBe(true);
    expect(migrated['convert-1840-24h']).toBe(true);
    expect(Object.keys(migrated).length).toBe(2);

    const scheduleMigrated = Pure.normalizeScheduleSolvedMap({ 'school:0': true, 'trip:event-duration': true, junk: true });
    expect(scheduleMigrated['school:event-duration']).toBe(true);
    expect(scheduleMigrated['trip:event-duration']).toBe(true);
    expect(Object.keys(scheduleMigrated).length).toBe(2);
  });

  it('missed-challenge queue excludes solved items and respects difficulty', () => {
    const data = {
      missedChallenges: { 'read-clock-0735': true, 'overnight-movie-end': true },
      solvedChallenges: { 'read-clock-0735': true }
    };
    expect(Pure.challengeMissedIds(data, 'all')).toEqual(['overnight-movie-end']);
    expect(Pure.challengeMissedIds(data, 'foundation')).toEqual([]);
  });
});

describe('elapsed model quest tracking', () => {
  it('signatures validate and malformed keys never count', () => {
    expect(Pure.elapsedModelSignature(495, 95, 1)).toBe('495|95|1');
    expect(Pure.elapsedModelSignature(495, 9999, -1)).toBe('495|720|-1');
  });
});

describe('source pins', () => {
  it('SVG path data is no longer wrapped in t() (regression pin)', () => {
    // A lang pack "translating" the path fragments would corrupt the d
    // attribute and silently hide the jump arcs.
    expect(src).not.toContain("t('stem.timeschedule.m'");
    expect(src).not.toContain("t('stem.timeschedule.n_91_q'");
    expect(src).toContain("d: 'M ' + priorX + ' 91 Q '");
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
