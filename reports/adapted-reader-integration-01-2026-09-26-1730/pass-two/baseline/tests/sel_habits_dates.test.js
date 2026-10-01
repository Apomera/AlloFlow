import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const source = readFileSync('sel_hub/sel_tool_goals.js', 'utf8');
const helper = source.slice(source.indexOf('  function goalHabitWeekDates('), source.indexOf('  // ── Weekly review record helpers'));
const datesInZone = (zone, now) => JSON.parse(execFileSync(process.execPath, ['-e', helper + ';process.stdout.write(JSON.stringify(goalHabitWeekDates(Date.parse(' + JSON.stringify(now) + '))));'], { env: { ...process.env, TZ: zone }, encoding: 'utf8' }));
describe('Goal habit local dates', () => {
  it('uses the local evening date even when UTC is tomorrow', () => {
    expect(datesInZone('America/New_York', '2026-09-09T23:30:00-04:00').at(-1)).toBe('2026-09-09');
  });
  it('uses the local morning date even when UTC is yesterday', () => {
    expect(datesInZone('Asia/Tokyo', '2026-09-10T00:30:00+09:00').at(-1)).toBe('2026-09-10');
  });
  it('returns seven distinct calendar dates across the spring DST change', () => {
    expect(datesInZone('America/New_York', '2026-03-10T00:30:00-04:00')).toEqual(['2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08','2026-03-09','2026-03-10']);
  });
  it('returns seven distinct calendar dates across the fall DST change', () => {
    expect(datesInZone('America/New_York', '2026-11-03T23:30:00-05:00')).toEqual(['2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03']);
  });
  it('handles a year boundary without changing the date key format', () => {
    expect(datesInZone('Pacific/Auckland', '2027-01-02T01:00:00+13:00')).toEqual(['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
  });
});
