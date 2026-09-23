// Behavior Lens "incidents per observed hour".
//
// WHY: until 2026-09-23 the rate divided EVERY logged ABC note by the minutes of timed
// observation sessions. An ABC log records incidents whenever they happen, so a week
// of notes over one 10-minute session read "120 per observed hour", and the printed
// progress report called that an exposure-adjusted rate. Now only incidents that
// happened during observed time (inside a session's window, or linked to it) are
// counted, the rest are reported as outside observation, and a session with no valid
// time neither holds incidents nor adds hours. Expected values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let rt;
beforeAll(() => {
  new Function(readFileSync('behavior_lens_workspace_module.js', 'utf8'))();
  rt = window.AlloModules.BehaviorLensWorkspace;
});

const DAY = 86400000;
const START = Date.parse('2026-09-14T13:00:00.000Z');
const note = (ms, extra = {}) => ({ id: 'n' + ms, occurredAt: new Date(ms).toISOString(), antecedent: 'A', behavior: 'Calls out', consequence: 'C', ...extra });
// A 10-minute session saved at 14:10Z: it covered 14:00-14:10.
const session = { id: 'obs-1', timestamp: '2026-09-14T14:10:00.000Z', duration: 600 };

describe('calculateIncidentRate', () => {
  it('a week of notes over one 10-minute session: only the note inside it counts (was 120/hour)', () => {
    const notes = [];
    for (let d = 0; d < 5; d += 1) for (let k = 0; k < 4; k += 1) notes.push(note(START + d * DAY + k * 3600e3));
    // One of those 20 notes (Mon 14:00Z) is inside the session window.
    const r = rt.calculateIncidentRate(notes, [session]);
    expect(r).toMatchObject({ loggedIncidents: 20, observedIncidents: 1, outsideObservation: 19, rateAvailable: true });
    expect(r.perObservedHour).toBeCloseTo(6, 10);    // 1 incident in 1/6 hour
  });
  it('a note linked to the session counts even if its clock was off', () => {
    const r = rt.calculateIncidentRate([note(START + 3 * DAY, { observationSessionId: 'obs-1' })], [session]);
    expect(r.observedIncidents).toBe(1);
  });
  it('an observed session with no incident inside it is an observed zero', () => {
    const r = rt.calculateIncidentRate([note(START + 2 * DAY)], [session]);
    expect(r).toMatchObject({ perObservedHour: 0, observedIncidents: 0, outsideObservation: 1, rateAvailable: true });
  });
  it('a session with no valid time adds no hours and holds no incidents', () => {
    const r = rt.calculateIncidentRate([note(START + 3600e3)], [{ duration: 3600 }]);
    expect(r).toMatchObject({ denominatorAvailable: false, perObservedHour: null, untimedSessions: 1, loggedIncidents: 1 });
  });
});

describe('what the screens say', () => {
  it('the overview, trend dashboard and progress report read rateAvailable and say what was left out', () => {
    const src = readFileSync('behavior_lens_module.js', 'utf8');
    expect(src).toContain('logged incidents happened during ${hours} observed hours.');
    expect(src).toContain('were logged outside observed time and are not in this rate.');
    expect(src).toContain("renderMetric('Per observed hour', selectedRate.rateAvailable ?");
    expect(src).toContain('Incidents during observed time: ${observedRateText(analytics.rate)}');
    expect(src).not.toContain("'Logged context notes per observed hour: '");
  });
});
