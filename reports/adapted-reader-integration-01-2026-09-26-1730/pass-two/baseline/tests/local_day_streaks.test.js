// Student streaks count LOCAL calendar days (2026-09-24).
//
// Three streaks keyed days by toISOString(), the UTC date, and found
// "yesterday" as now - 24 h. In Portland the day rolled over at 5 pm, so
// practice at 4 pm Monday then 6 pm Tuesday read as two days apart and reset
// the streak; two sessions in one evening could count as two days; and after
// the 23-hour spring-forward day, now - 24 h lands two calendar days back.
//   Math Fluency maze daily streak, SEL Goals accountability streak,
//   AlloBot Sage daily claim (whose own comment promised "local time").

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
let savedTz;
let MF;

// Pull module-level functions out of a tool file (the sel_goals_weekly_review pattern).
function sliceFns(file, from, until, names) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const start = src.indexOf(from);
  const end = src.indexOf(until, start);
  if (start < 0 || end < 0) throw new Error(`${file}: helper block not found`);
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}; return { ${names.join(', ')} };`)();
}

beforeAll(() => {
  savedTz = process.env.TZ;
  const React = require2(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  global.React = window.React = React;
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8'))();
  MF = window.AlloModules.MathFluencyInternals;
});
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
afterAll(() => { if (savedTz === undefined) delete process.env.TZ; else process.env.TZ = savedTz; });

const at = (iso, tz = 'America/Los_Angeles') => {
  process.env.TZ = tz; vi.useFakeTimers(); vi.setSystemTime(new Date(iso));
  // The zone must really apply, or the test proves nothing.
  expect(tz === 'Asia/Tokyo' ? [-540] : [420, 480]).toContain(new Date().getTimezoneOffset());
};

describe('Math Fluency maze daily streak', () => {
  it('4 pm Monday then 6 pm Tuesday is a two-day streak, although the UTC dates are two apart', () => {
    at('2026-10-05T23:00:00Z'); // Mon 4 pm PDT
    expect(MF.dailyStreak().current).toBe(1);
    at('2026-10-07T01:00:00Z'); // Tue 6 pm PDT, already Wed in UTC
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-07');
    expect(MF.dailyStreak()).toMatchObject({ lastPlayedDate: '2026-10-06', current: 2, longest: 2 });
  });

  it('two sessions in one evening that straddle UTC midnight count as one day', () => {
    at('2026-10-05T20:00:00Z'); // Mon 1 pm
    MF.dailyStreak();
    at('2026-10-06T23:00:00Z'); // Tue 4 pm
    expect(MF.dailyStreak().current).toBe(2);
    at('2026-10-07T02:00:00Z'); // Tue 7 pm, Wed in UTC
    expect(MF.dailyStreak().current).toBe(2);
  });

  it('just after midnight following the 23-hour spring-forward day, yesterday is still yesterday', () => {
    at('2026-03-09T03:00:00Z'); // Sun Mar 8, 8 pm PDT
    MF.dailyStreak();
    at('2026-03-09T07:30:00Z'); // Mon Mar 9, 12:30 am PDT; now - 24 h is Sat Mar 7
    expect(new Date(Date.now() - 86400000).getDate()).toBe(7);
    expect(MF.dailyStreak()).toMatchObject({ lastPlayedDate: '2026-03-09', current: 2 });
  });
});

describe('SEL Goals accountability streak', () => {
  const G = () => sliceFns('sel_hub/sel_tool_goals.js', 'function goalLocalDate(', '// ── Weekly review record helpers ──', ['goalLocalDate', 'goalAccountabilityStreak']);

  it('an evening check-in is today, and the streak walks back local days', () => {
    at('2026-10-07T01:00:00Z'); // Tue Oct 6, 6 pm PDT
    const { goalLocalDate, goalAccountabilityStreak } = G();
    expect(goalLocalDate(new Date())).toBe('2026-10-06');
    expect(goalAccountabilityStreak({ '2026-10-05': true, '2026-10-06': true }, Date.now())).toBe(2);
    expect(goalAccountabilityStreak({ '2026-10-04': true, '2026-10-06': true }, Date.now())).toBe(1);
  });

  it('counts across the spring-forward day without skipping it', () => {
    at('2026-03-09T07:30:00Z'); // Mar 9, 12:30 am PDT
    const { goalAccountabilityStreak } = G();
    expect(goalAccountabilityStreak({ '2026-03-07': true, '2026-03-08': true, '2026-03-09': true }, Date.now())).toBe(3);
  });

  it('the tool uses the local helpers everywhere it keys a day', () => {
    const src = readFileSync(resolve(process.cwd(), 'sel_hub/sel_tool_goals.js'), 'utf8');
    expect(src).not.toMatch(/toISOString\(\)\.slice\(0, 10\)/);
    expect(src).toContain('var s = goalAccountabilityStreak(newLog, Date.now());');
  });
});

describe('AlloBot Sage daily claim', () => {
  const S = () => sliceFns('stem_lab/stem_tool_allobotsage.js', 'function sageLocalDate(', 'function announceSR(', ['sageLocalDate', 'sageIsYesterday']);

  it('the day does not roll over at 5 pm, and yesterday is the local yesterday', () => {
    at('2026-10-07T01:00:00Z'); // Tue Oct 6, 6 pm PDT
    const { sageLocalDate, sageIsYesterday } = S();
    expect(sageLocalDate(new Date())).toBe('2026-10-06');
    expect(sageIsYesterday('2026-10-05', Date.now())).toBe(true);
    expect(sageIsYesterday('2026-10-06', Date.now())).toBe(false);
    expect(sageIsYesterday(null, Date.now())).toBe(false);
  });

  it('keeps the streak across the spring-forward day', () => {
    at('2026-03-09T07:30:00Z');
    expect(S().sageIsYesterday('2026-03-08', Date.now())).toBe(true);
  });

  it('the claim uses the local helpers', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_allobotsage.js'), 'utf8');
    expect(src).toContain('var todayStr = sageLocalDate(new Date());');
    expect(src).toContain('function isYesterday(dateStr) { return sageIsYesterday(dateStr, Date.now()); }');
  });
});

// Auto Repair's service log refused "future" dates against the UTC day: a
// Portland evening accepted tomorrow, and a morning east of UTC refused today.
describe('Auto Repair service date', () => {
  const FILE = 'stem_lab/stem_tool_autorepair.js';
  const validate = () => {
    const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
    const start = src.indexOf('function arValidateServiceEntry(');
    const end = src.indexOf('\n  function ', start + 12);
    // eslint-disable-next-line no-new-func
    return new Function(src.slice(start, end) + '\nreturn arValidateServiceEntry;')();
  };
  const entry = (date) => ({ date, service: 'Oil change' });

  it('a Portland evening refuses tomorrow; a Tokyo morning accepts today', () => {
    at('2026-10-07T02:30:00Z'); // Tue Oct 6, 7:30 pm PDT
    expect(validate()(entry('2026-10-07'), []).errors.date).toMatch(/future/);
    expect(validate()(entry('2026-10-06'), []).errors.date).toBeUndefined();
    at('2026-10-06T23:00:00Z', 'Asia/Tokyo'); // Wed Oct 7, 8 am JST
    expect(validate()(entry('2026-10-07'), []).errors.date).toBeUndefined();
  });

  it('the date picker stops at the local today', async () => {
    const { loadTool, renderTool, resetStemLab } = await import('./helpers/stem_widgets_smoke_harness.js');
    resetStemLab();
    loadTool(FILE, 'autoRepair');
    at('2026-10-07T02:30:00Z');
    let html = renderTool('autoRepair', { autoRepair: { view: 'log' } });
    expect(html).toContain('max="2026-10-06"');
    expect(html).not.toContain('max="2026-10-07"');
    at('2026-10-06T23:00:00Z', 'Asia/Tokyo');
    html = renderTool('autoRepair', { autoRepair: { view: 'log' } });
    expect(html).toContain('max="2026-10-07"');
  }, 120000); // the 18k-line tool loads slowly
});
