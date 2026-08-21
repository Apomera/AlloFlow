import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
const modal = readFileSync(resolve(process.cwd(), 'view_session_modal_source.jsx'), 'utf8');
const endSessionPreviewSource = readFileSync(resolve(process.cwd(), 'view_end_session_preview_source.jsx'), 'utf8');
const helperStart = app.indexOf('const normalizeRosterSessionCodename');
const helperEnd = app.indexOf('const generateSessionCode', helperStart);
const helperSource = app.slice(helperStart, helperEnd);
const helpers = new Function(helperSource + '\nreturn { buildRosterSessionInsightBrief, buildRosterSessionSummary, saveRosterSessionSummary };')();

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

  it('derives a bounded insight brief from existing participation evidence without claiming misconceptions', () => {
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'INSIGHT', mode: 'firebase', endedAt: '2026-07-12T10:30:00.000Z',
      rosterKey: { students: { 'Brave Otter': 'blue', 'Calm Fox': 'blue' } },
      sessionData: {
        createdAt: '2026-07-12T10:00:00.000Z',
        roster: {
          privateUidA: { name: 'Brave Otter', groupId: 'blue' },
          privateUidB: { name: 'Calm Fox', groupId: 'blue' },
        },
        quizState: { allResponses: { privateUidA: { 0: { answer: 'raw answer' } } } },
      },
      activitySnapshots: [
        {
          kind: 'rating', phase: 'closed', audienceUids: ['privateUidA', 'privateUidB'],
          participantStatus: { privateUidA: 'submitted', privateUidB: 'waiting' },
          counts: {}, prompt: 'private prompt',
        },
        {
          kind: 'feedback_response', phase: 'closed', audienceUids: ['privateUidA', 'privateUidB'],
          participantStatus: { privateUidA: 'revised', privateUidB: 'submitted' },
          counts: { feedbackSent: 2 }, feedback: 'private feedback',
        },
        {
          kind: 'session_qa', phase: 'paused', audienceUids: ['privateUidA'],
          participantStatus: { privateUidA: 'submitted' },
          counts: { approved: 1, hidden: 1, votesCast: 2 }, question: 'private question',
        },
      ],
    });

    expect(summary.insightBrief).toMatchObject({
      schemaVersion: 2,
      activityCount: 3,
      submissions: 4,
      revisions: 1,
      feedbackSent: 2,
      participantsWithRecordedResponse: 2,
      followUpCodenames: ['Calm Fox'],
    });
    expect(summary.insightBrief.groups).toEqual([{
      groupId: 'blue',
      participantCount: 2,
      activityOpportunities: 5,
      submissions: 4,
      revisions: 1,
      followUpCount: 1,
    }]);
    expect(summary.insightBrief.byKind).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'session_qa', activityCount: 1, submitted: 1 }),
    ]));
    expect(summary.insightBrief.votesCast).toBe(2);
    expect(summary.insightBrief.nextMoves.map(move => move.code)).toEqual(['activity-follow-up', 'revision-opportunity']);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('privateUid');
    expect(serialized).not.toContain('raw answer');
    expect(serialized).not.toContain('private prompt');
    expect(serialized.toLowerCase()).not.toContain('misconception');
  });

  it('preserves privacy-limited visual organizer outcomes in the saved session summary', () => {
    const activityId = 'organizer:private-resource:tchart:run';
    const receipt = (status, extra = {}) => ({
      activityId, type: 'tchart', status, at: 100, score: 0, correct: 0, total: 0, attempts: 0, ...extra,
    });
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'ORG123', mode: 'firebase', endedAt: '2026-07-12T10:30:00.000Z',
      rosterKey: { students: { 'Brave Otter': 'blue', 'Calm Fox': 'green', 'Quiet Owl': 'green' } },
      sessionData: {
        createdAt: '2026-07-12T10:00:00.000Z',
        interactiveOrganizer: { activityId, type: 'tchart', resourceId: 'private-resource' },
        roster: {
          privateUidA: { name: 'Brave Otter', organizerProgress: receipt('complete', { score: 80, correct: 4, total: 5, attempts: 1 }) },
          privateUidB: { name: 'Calm Fox', organizerProgress: receipt('failed') },
          privateUidC: { name: 'Quiet Owl' },
        },
      },
    });
    expect(summary.organizerActivity).toEqual({
      type: 'tchart', wasLiveAtEnd: true, participantCount: 3,
      statusCounts: { waiting: 1, loading: 0, ready: 0, failed: 1, working: 0, attempted: 0, complete: 1 },
      followUpCodenames: ['Calm Fox', 'Quiet Owl'],
    });
    expect(summary.participants['Brave Otter'].organizer).toEqual({ type: 'tchart', status: 'complete', score: 80, correct: 4, total: 5, attempts: 1 });
    expect(summary.participants['Quiet Owl'].organizer.status).toBe('waiting');
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('privateUid');
    expect(serialized).not.toContain('private-resource');
    expect(serialized).not.toContain(activityId);
  });

  it('handles reserved group identifiers without prototype collisions', () => {
    const brief = helpers.buildRosterSessionInsightBrief({
      participants: {
        'Brave Otter': {
          groupId: '__proto__',
          liveActivityCount: 1,
          liveSubmissionCount: 1,
          liveRevisionCount: 0,
        },
      },
      liveActivities: [],
      absentCodenames: [],
      unmatchedCodenames: [],
    });
    expect(brief.groups).toEqual([{
      groupId: '__proto__',
      participantCount: 1,
      activityOpportunities: 1,
      submissions: 1,
      revisions: 0,
      followUpCount: 0,
    }]);
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
    expect(endSessionPreviewSource).toContain('Insight brief');
    expect(endSessionPreviewSource).toContain('Visual organizer evidence');
    expect(endSessionPreviewSource).toContain('organizer card text');
    expect(endSessionPreviewSource).toContain('Connections remain active during this review.');
  });

  it('keeps history portable and removes deleted students from saved summaries', () => {
    expect(teacher).toContain('sessionHistory: Array.isArray(data.sessionHistory) ? data.sessionHistory.slice(-30).map(normalizeRosterSessionPlanningFields) : []');
    expect(teacher).toContain('delete participants[name]');
    expect(teacher).toContain('Saved session history ({rosterKey.sessionHistory.length})');
    expect(teacher).toContain('session.insightBrief.activityCount');
    expect(teacher).toContain('session.insightBrief.nextMoves');
  });
});
