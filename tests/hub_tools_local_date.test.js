// Educator Hub tools date "today" by the LOCAL calendar (2026-09-23).
//
// Seven tools computed today as new Date().toISOString().slice(0, 10), the UTC
// date. In US time zones that is already tomorrow by late afternoon (5 pm in
// Portland in summer), so SpEd Timelines flagged a deadline due today as
// Overdue every evening, Meeting Docs dated an evening IEP meeting the next
// day, and UDL Walkthrough stamped late visits with tomorrow. East of UTC the
// error ran the other way in the morning. Each tool is loaded from its shipped
// module and asked for today at a moment when the two calendars disagree.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const require2 = createRequire(import.meta.url);
const TOOLS = [
  { key: 'SpedTimelines', file: 'sped_timelines_module.js', fn: 'spedToday' },
  { key: 'MtssTriage', file: 'mtss_triage_module.js', fn: 'mtssToday' },
  { key: 'MeetingDocs', file: 'meeting_docs_module.js', fn: 'meetdocsDateStamp' },
  { key: 'DisproAnalyzer', file: 'dispro_analyzer_module.js', fn: 'disproDateStamp' },
  { key: 'UdlWalkthrough', file: 'udl_walkthrough_module.js', fn: 'udlwalkDateStamp' },
  { key: 'FamilyAnnouncements', file: 'family_announcements_module.js', fn: 'famannToday' },
  { key: 'CommunicationsStudio', file: 'communications_studio_module.js', fn: 'csLocalDate' },
];
const helpers = {};
let savedTz;

beforeAll(() => {
  savedTz = process.env.TZ;
  const React = require2(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  global.React = window.React = React;
  window.AlloModules = window.AlloModules || {};
  for (const t of TOOLS) {
    delete window.AlloModules[t.key];
    // eslint-disable-next-line no-new-func
    new Function(readFileSync(resolve(process.cwd(), t.file), 'utf8'))();
    helpers[t.key] = window.AlloModules[t.key]._testing[t.fn];
  }
});
afterEach(() => { vi.useRealTimers(); });
afterAll(() => { if (savedTz === undefined) delete process.env.TZ; else process.env.TZ = savedTz; });

const at = (tz, iso) => { process.env.TZ = tz; vi.useFakeTimers(); vi.setSystemTime(new Date(iso)); };

describe('every hub tool dates today by the local calendar', () => {
  it('loaded a date helper from every shipped module', () => {
    for (const t of TOOLS) expect(typeof helpers[t.key], `${t.file} ${t.fn}`).toBe('function');
  });

  it('5:30 pm in Portland on Oct 1 is Oct 1, although UTC has reached Oct 2', () => {
    at('America/Los_Angeles', '2026-10-02T00:30:00Z');
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-02');
    for (const t of TOOLS) expect(helpers[t.key](), t.key).toBe('2026-10-01');
  });

  it('5 am in Tokyo on Oct 2 is Oct 2, although UTC is still on Oct 1', () => {
    at('Asia/Tokyo', '2026-10-01T20:00:00Z');
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-01');
    for (const t of TOOLS) expect(helpers[t.key](), t.key).toBe('2026-10-02');
  });

  it('in Portland on the evening a deadline falls, SpEd Timelines says Due, not Overdue', () => {
    at('America/Los_Angeles', '2026-10-02T02:00:00Z'); // 7 pm on Oct 1
    const S = window.AlloModules.SpedTimelines._testing;
    const today = helpers.SpedTimelines();
    expect(S.spedDaysUntil('2026-10-01', today)).toBe(0);
    expect(S.spedBand({ dueDate: '2026-10-01' }, today)).toBe('urgent');
    expect(S.spedBand({ dueDate: '2026-09-30' }, today)).toBe('overdue');
  });

  it('UDL Walkthrough stamps a visit with the local date of the Date it is given', () => {
    at('Pacific/Honolulu', '2026-10-02T03:00:00Z'); // 5 pm on Oct 1 in Hawaii
    expect(helpers.UdlWalkthrough(new Date())).toBe('2026-10-01');
    expect(helpers.UdlWalkthrough(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
