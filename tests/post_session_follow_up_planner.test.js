import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const teacherSource = fs.readFileSync(path.join(ROOT, 'teacher_source.jsx'), 'utf8');
const teacherModule = fs.readFileSync(path.join(ROOT, 'teacher_module.js'), 'utf8');
const teacherPublic = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/teacher_module.js'), 'utf8');
const sharedActivitySource = fs.readFileSync(path.join(ROOT, 'shared_activity_source.jsx'), 'utf8');
const shells = [
  fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/App.jsx'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8'),
];

function makeSavedFollowUpSender({ followResult = true, sessionStillCurrent = true } = {}) {
  const app = shells[0];
  const start = app.indexOf('const sendSavedFollowUpPlanToLiveSession = async');
  const end = app.indexOf('// without yanking their view', start);
  if (start < 0 || end < 0) throw new Error('Saved follow-up sender markers missing');
  let releaseFollow;
  const closeRoster = vi.fn();
  const restore = vi.fn();
  const delivery = {
    ok: true,
    audience: 'class',
    audienceLabel: 'Whole class',
    connectedCount: 2,
    sessionCode: 'LIVE-1',
    sessionAppId: 'host-app',
    sessionMode: 'sync',
    transportKind: 'firebase',
    planSignature: 'plan',
    resourceFingerprint: 'fp',
    targetSignature: '["uid-1","uid-2"]',
    resource: { id: 'resource-1', type: 'quiz', title: 'Check' },
  };
  const deps = {
    savedFollowUpLiveSendLockRef: { current: false },
    resolveSavedFollowUpLiveDeliverySnapshot: vi.fn(() => delivery),
    describeSavedFollowUpLiveFailure: vi.fn(reason => reason),
    setConfirmDialog: vi.fn(dialog => dialog.onConfirm()),
    handleSetStudentsResource: vi.fn(),
    _alloFollowResourceLive: vi.fn(() => new Promise(resolve => { releaseFollow = () => resolve(followResult); })),
    isSavedFollowUpLiveSessionCurrent: vi.fn(() => sessionStillCurrent),
    setIsRosterKeyOpen: closeRoster,
    handleRestoreView: restore,
    warnLog: vi.fn(),
  };
  // eslint-disable-next-line no-new-func
  const send = new Function(...Object.keys(deps), app.slice(start, end) + '\nreturn sendSavedFollowUpPlanToLiveSession;')(...Object.values(deps));
  return { send, releaseFollow: () => releaseFollow(), closeRoster, restore, deps };
}

function loadHelpers() {
  const start = teacherSource.indexOf('const ROSTER_SESSION_FOLLOW_UP_FILTERS');
  const end = teacherSource.indexOf('const RosterKeyPanel', start);
  if (start < 0 || end < 0) throw new Error('Post-session planner helpers missing');
  // eslint-disable-next-line no-new-func
  return new Function(teacherSource.slice(start, end) + `
    return {
      note: normalizeRosterSessionTeacherNote,
      plan: normalizeRosterSessionFollowUpPlan,
      planningFields: normalizeRosterSessionPlanningFields,
      update: updateRosterSessionFollowUp,
      filter: filterRosterSessionHistory,
    };
  `)();
}

describe('post-session follow-up planner', () => {
  it('allowlists bounded private notes and plan metadata without copying cohort members or response content', () => {
    const api = loadHelpers();
    const plan = api.plan({
      resourceId: 'resource-1', resourceTitle: 'Sentence frames', resourceType: 'sentence-frames',
      audience: 'cohort', cohortCode: 'revision-growth', cohortLabel: 'Revision opportunity', cohortCount: 300,
      status: 'completed', plannedAt: '2026-08-02T12:00:00.000Z',
      codenames: ['DO_NOT_COPY_NAME'], response: 'DO_NOT_COPY_RESPONSE', prompt: 'DO_NOT_COPY_PROMPT', secret: 'DO_NOT_COPY_SECRET',
    });
    expect(plan).toEqual({
      schemaVersion: 1,
      resourceId: 'resource-1', resourceTitle: 'Sentence frames', resourceType: 'sentence-frames',
      audience: 'cohort', cohortCode: 'revision-growth', cohortLabel: 'Revision opportunity', cohortCount: 250,
      status: 'completed', plannedAt: '2026-08-02T12:00:00.000Z',
    });
    expect(JSON.stringify(plan)).not.toMatch(/DO_NOT_COPY|codenames|response|prompt|secret/);
    expect(api.note('  reteach\u0000 with a visual  ')).toBe('reteach with a visual');
    expect(api.plan({ resourceId: '__proto__' })).toBeNull();
    expect(api.plan({ resourceId: 'r2', audience: 'cohort', cohortCode: '' })).toMatchObject({ audience: 'class', cohortCode: '', cohortLabel: 'Whole class' });
  });

  it('updates the existing saved-session record immutably and normalizes imported planner fields', () => {
    const api = loadHelpers();
    const roster = { className: 'Science', sessionHistory: [{ id: 's1', teacherNote: 'old' }, { id: 's2' }] };
    const updated = api.update(roster, 's1', {
      teacherNote: '  use diagram  ',
      followUpPlan: { resourceId: 'r1', resourceTitle: 'Diagram', audience: 'class', status: 'planned' },
    });
    expect(updated).not.toBe(roster);
    expect(updated.sessionHistory[0]).toMatchObject({ teacherNote: 'use diagram', followUpPlan: { resourceId: 'r1', cohortLabel: 'Whole class' } });
    expect(roster.sessionHistory[0]).toEqual({ id: 's1', teacherNote: 'old' });
    const imported = api.planningFields({ id: 's3', teacherNote: ' note\u0000 ', followUpPlan: { resourceId: 'r2', extra: 'drop' } });
    expect(imported.teacherNote).toBe('note');
    expect(imported.followUpPlan).not.toHaveProperty('extra');
    expect(api.update(updated, 'missing', { teacherNote: 'x' })).toBe(updated);
  });

  it('derives follow-up, revision, celebration, plan, and activity filters from the retained summary', () => {
    const api = loadHelpers();
    const sessions = [
      { id: 'support', liveActivities: [{ kind: 'word_cloud' }], insightBrief: { evidenceCohorts: [{ intent: 'support' }], nextMoves: [] } },
      { id: 'revision', liveActivities: [{ kind: 'feedback_response' }], insightBrief: { evidenceCohorts: [], nextMoves: [{ code: 'revision-opportunity' }] } },
      { id: 'celebrate', liveActivities: [{ kind: 'quiz' }], insightBrief: { evidenceCohorts: [{ intent: 'celebrate' }], nextMoves: [] } },
      { id: 'planned', liveActivities: [{ kind: 'quiz' }], followUpPlan: { resourceId: 'r1' }, insightBrief: {} },
    ];
    expect(api.filter(sessions, 'follow_up').map(item => item.id)).toEqual(['support', 'revision']);
    expect(api.filter(sessions, 'revision').map(item => item.id)).toEqual(['revision']);
    expect(api.filter(sessions, 'celebrate').map(item => item.id)).toEqual(['celebrate']);
    expect(api.filter(sessions, 'planned').map(item => item.id)).toEqual(['planned']);
    expect(api.filter(sessions, 'all', 'quiz').map(item => item.id)).toEqual(['celebrate', 'planned']);
  });

  it('does not close or navigate until an acknowledged class command succeeds', async () => {
    const failed = makeSavedFollowUpSender({ followResult: false });
    const failedPending = failed.send('saved-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(failed.closeRoster).not.toHaveBeenCalled();
    expect(failed.restore).not.toHaveBeenCalled();
    failed.releaseFollow();
    await expect(failedPending).resolves.toMatchObject({ status: 'failed' });
    expect(failed.closeRoster).not.toHaveBeenCalled();
    expect(failed.restore).not.toHaveBeenCalled();

    const succeeded = makeSavedFollowUpSender({ followResult: true });
    const successPending = succeeded.send('saved-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(succeeded.closeRoster).not.toHaveBeenCalled();
    expect(succeeded.restore).not.toHaveBeenCalled();
    succeeded.releaseFollow();
    await expect(successPending).resolves.toMatchObject({ status: 'presenting' });
    expect(succeeded.closeRoster).toHaveBeenCalledWith(false);
    expect(succeeded.restore).toHaveBeenCalledWith(expect.objectContaining({ id: 'resource-1' }), { suppressLiveFollow: true });
  });

  it('keeps the roster open when the live session changes after an acknowledged command', async () => {
    const changed = makeSavedFollowUpSender({ followResult: true, sessionStillCurrent: false });
    const pending = changed.send('saved-1');
    await Promise.resolve();
    await Promise.resolve();
    changed.releaseFollow();
    await expect(pending).resolves.toMatchObject({ status: 'session-changed' });
    expect(changed.closeRoster).not.toHaveBeenCalled();
    expect(changed.restore).not.toHaveBeenCalled();
  });

  it('ships one planner owner and selected-resource assignment path in every maintained surface', () => {
    [teacherSource, teacherModule, teacherPublic].forEach(source => {
      expect(source).toContain('Post-session follow-up');
      expect(source).toContain('Prepare assignment');
      expect(source).toContain('Saved session history filters');
      expect(source).toContain('followUpPlan');
      expect(source).toContain('No student-safe resources in History');
      expect(source).toContain('const planDirty = !!savedPlan');
      expect(source).toContain('Prepared links are shareable, not recipient-restricted');
      expect(source).toContain('Assign to current live cohort');
      expect(source).toContain('Present to current live class');
      expect(source).toContain('onSendFollowUpToLiveSession(sessionId)');
      expect(source).toContain('savedPlan.status');
      expect(source).toContain('completed');
      expect(source).toContain('liveSending');
      expect(source).toContain('liveActionInFlight');
      expect(source).toContain('setSessionPlanDrafts({});');
    });
    expect(teacherSource).toContain('disabled={safeFollowUpResources.length === 0 || liveSending}');
    expect(teacherSource).toContain('const liveActionInFlight = Boolean(sessionLiveSendingId);');
    expect(teacherSource).toContain('disabled={liveActionInFlight}');
    expect(sharedActivitySource).toContain('None of the selected resources can be shared with students.');
    shells.forEach(source => {
      expect(source).toContain('followUpResources={_alloStudentSafeResources(history)}');
      expect(source).toContain('createHomeworkAssignmentLink([resource.id])');
      expect(source).toContain('handleRestoreView(resource, { suppressLiveFollow: true })');
      expect(source).toContain('const resolveAssignmentResources = useCallback((resourceIds = null) =>');
      expect(source).toContain('return resourceCandidates.filter(item => requestedIds.has(String(item.id || \'\')));');
      expect(source).toContain('hostPackOnMailboxRef.current(selectedResourceIds)');
      expect(source).toContain('onSendFollowUpToLiveSession={sendSavedFollowUpPlanToLiveSession}');
      expect(source).toContain('savedFollowUpLiveSendLockRef.current');
      expect(source).toContain('resolveSavedFollowUpLiveDeliverySnapshot(cleanSessionId)');
      expect(source).toContain('before.targetSignature === after.targetSignature');
      expect(source).toContain('isSavedFollowUpLiveSessionCurrent(after)');
      expect(source).toContain('const result = await handleSetStudentsResource(after.uids, after.resource.id);');
      expect(source).toContain('const followed = await _alloFollowResourceLive(after.resource, { awaitDelivery: true });');
      expect(source).toContain("cancelText: 'Cancel'");
      expect(source).toContain("activeSessionAppId || appId");
      const handoffStart = source.indexOf('const sendSavedFollowUpPlanToLiveSession');
      const handoffEnd = source.indexOf('// without yanking their view', handoffStart);
      expect(handoffStart).toBeGreaterThan(-1);
      expect(source.slice(handoffStart, handoffEnd)).not.toContain('window.confirm');
    });
    expect(teacherSource).toContain('onSendFollowUpToLiveSession(sessionId)');
    expect(teacherSource).not.toContain('onSendFollowUpToLiveSession(savedPlan');
    expect(teacherSource).toContain('window.AlloModules.normalizeRosterSessionFollowUpPlan = normalizeRosterSessionFollowUpPlan');
  });
});
