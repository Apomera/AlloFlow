import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
const modal = readFileSync(resolve(process.cwd(), 'view_session_modal_source.jsx'), 'utf8');
const helperStart = app.indexOf('const normalizeRosterSessionCodename');
const helperEnd = app.indexOf('const generateSessionCode', helperStart);
const helperSource = app.slice(helperStart, helperEnd);
const helpers = new Function(helperSource + '\nreturn { buildRosterSessionSummary, saveRosterSessionSummary };')();

describe('privacy-safe roster session summaries', () => {
  it('matches normalized codenames and omits transient IDs and raw answers', () => {
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'AB123', mode: 'mailbox', endedAt: '2026-07-12T10:30:00.000Z',
      rosterKey: { students: { 'Brave Otter': 'blue', 'Calm Fox': 'green' } },
      sessionData: {
        createdAt: '2026-07-12T10:00:00.000Z',
        roster: { secretUid: { name: ' brave-OTTER ', groupId: 'blue', joinedAt: '2026-07-12T10:02:00.000Z', viewingResourceId: 'resource-private-id' }, otherUid: { name: 'Unknown Yak' } },
        quizState: { allResponses: { secretUid: { 0: { answer: 'private answer' }, 1: { answer: 2 } } } },
        resources: [{ title: 'Fractions Review' }],
        mailboxToken: 'do-not-save'
      }
    });
    expect(summary.mode).toBe('mailbox');
    expect(summary.durationMinutes).toBe(30);
    expect(summary.participants['Brave Otter'].responseCount).toBe(2);
    expect(summary.absentCodenames).toEqual(['Calm Fox']);
    expect(summary.unmatchedCodenames).toEqual(['Unknown Yak']);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('secretUid');
    expect(serialized).not.toContain('private answer');
    expect(serialized).not.toContain('resource-private-id');
    expect(serialized).not.toContain('do-not-save');
  });

  it('deduplicates session IDs and caps retained class and student history', () => {
    let roster = { students: { 'Brave Otter': 'blue' }, sessionHistory: [], progressHistory: {} };
    for (let i = 0; i < 35; i++) {
      roster = helpers.saveRosterSessionSummary(roster, { id: 's' + i, endedAt: '2026-07-12T10:00:00.000Z', participants: { 'Brave Otter': { groupId: 'blue', responseCount: i, resourcesOpened: 1 } } }, '', 30);
    }
    roster = helpers.saveRosterSessionSummary(roster, { id: 's34', endedAt: '2026-07-12T11:00:00.000Z', participants: { 'Brave Otter': { responseCount: 99 } } }, ' reteach ', 30);
    expect(roster.sessionHistory).toHaveLength(30);
    expect(roster.progressHistory['Brave Otter']).toHaveLength(30);
    expect(roster.sessionHistory.filter(s => s.id === 's34')).toHaveLength(1);
    expect(roster.sessionHistory.at(-1).teacherNote).toBe('reteach');
  });

  it('routes every teacher end surface through the shared preview', () => {
    expect(app).toContain('<button onClick={requestEndLiveSession} className="w-full text-xs font-bold text-rose-600');
    expect(app).toContain('const handleEndLiveSession = () => requestEndLiveSession()');
    expect(app).toContain('onRequestEndSession={requestEndLiveSession}');
    expect(modal).toContain("typeof onRequestEndSession === 'function'");
  });

  it('keeps history portable and removes deleted students from saved summaries', () => {
    expect(teacher).toContain('sessionHistory: Array.isArray(data.sessionHistory) ? data.sessionHistory.slice(-30) : []');
    expect(teacher).toContain('delete participants[name]');
    expect(teacher).toContain('Saved session history ({rosterKey.sessionHistory.length})');
  });
});