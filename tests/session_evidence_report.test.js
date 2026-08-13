import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const sharedActivitySource = readFileSync(resolve(process.cwd(), 'shared_activity_source.jsx'), 'utf8');
const endSessionPreviewSource = readFileSync(resolve(process.cwd(), 'view_end_session_preview_source.jsx'), 'utf8');
const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
const mailbox = readFileSync(resolve(process.cwd(), 'apps_script/session_mailbox/Code.gs'), 'utf8');

const helperStart = app.indexOf('const normalizeRosterSessionCodename');
const helperEnd = app.indexOf('const generateSessionCode', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('Roster session helper markers are missing');
const helpers = new Function(
  app.slice(helperStart, helperEnd)
    + '\nreturn { normalizeRosterSessionCodename, buildStudentResourcePatchBatches, resolveLiveStudentResourceTarget, summarizeLiveSessionResourceDelivery, mergeLiveQuizEvidenceResponse, buildLiveQuizResponseCounts, countValidRosterQuizResponses, normalizeQuizReceiptQuestionIndexes, buildRosterSessionInsightBrief, buildRosterSessionSummary, classifyLiveRosterPresence, buildPublishedResourceFingerprintMap, enqueueLiveSessionResourcePublish, resolveRosterCodenamesToLiveUids, resolveSavedFollowUpLivePlanTarget };'
)();

const csvHelperStart = teacher.indexOf('const rosterSessionCsvCell');
const csvHelperEnd = teacher.indexOf('const downloadRosterSessionEvidenceCsv', csvHelperStart);
if (csvHelperStart < 0 || csvHelperEnd < 0) throw new Error('Roster evidence CSV helper markers are missing');
const csvHelpers = new Function(
  teacher.slice(csvHelperStart, csvHelperEnd)
    + '\nreturn { buildRosterSessionEvidenceCsv };'
)();

const cohortResolverStart = app.indexOf('const resolveEndSessionCohortUids');
const cohortResolverEnd = app.indexOf('const sendEndSessionEvidenceCohort', cohortResolverStart);
if (cohortResolverStart < 0 || cohortResolverEnd < 0) throw new Error('Evidence cohort resolver markers are missing');
const makeCohortResolver = (sessionData, rosterKey) => new Function(
  'sessionData',
  'rosterKey',
  'normalizeRosterSessionCodename',
  'resolveRosterCodenamesToLiveUids',
  app.slice(cohortResolverStart, cohortResolverEnd) + '\nreturn resolveEndSessionCohortUids;'
)(sessionData, rosterKey, helpers.normalizeRosterSessionCodename, helpers.resolveRosterCodenamesToLiveUids);

const activityOrderStart = sharedActivitySource.indexOf('function _alloNextSharedActivitySummaryOrder');
const activityOrderEnd = sharedActivitySource.indexOf('const SharedAssignmentActivityPanel', activityOrderStart);
if (activityOrderStart < 0 || activityOrderEnd < 0) throw new Error('Shared activity ordering helper markers are missing');
const nextSharedActivityOrder = new Function(
  sharedActivitySource.slice(activityOrderStart, activityOrderEnd)
    + '\nreturn _alloNextSharedActivitySummaryOrder;'
)();

describe('session evidence report contract', () => {
  it('builds schema-v2 cohorts and per-kind completion from derived participation only', () => {
    const brief = helpers.buildRosterSessionInsightBrief({
      participants: {
        'Quiet Lynx': {
          groupId: 'blue',
          responseCount: 0,
          liveActivityCount: 2,
          liveSubmissionCount: 0,
          liveRevisionCount: 0,
          rawAnswer: 'PRIVATE_STUDENT_ANSWER',
        },
        'Calm Fox': {
          groupId: 'blue',
          responseCount: 1,
          liveActivityCount: 3,
          liveSubmissionCount: 2,
          liveRevisionCount: 0,
        },
        'Brave Otter': {
          groupId: 'green',
          responseCount: 1,
          liveActivityCount: 1,
          liveSubmissionCount: 1,
          liveRevisionCount: 1,
        },
      },
      liveActivities: [{
        kind: 'feedback_response',
        invited: 3,
        submitted: 2,
        revised: 1,
        feedbackSent: 1,
        rawPrompt: 'PRIVATE_TEACHER_PROMPT',
      }],
      absentCodenames: ['Swift Hawk'],
      unmatchedCodenames: [],
    });

    expect(brief).toMatchObject({
      schemaVersion: 2,
      evidenceScope: 'teacher-device-derived-participation',
      participantsWithRecordedResponse: 2,
      followUpCodenames: ['Quiet Lynx', 'Calm Fox'],
    });
    expect(brief.evidenceCohorts).toEqual([
      expect.objectContaining({
        code: 'no-recorded-evidence',
        intent: 'support',
        count: 1,
        codenames: ['Quiet Lynx'],
      }),
      expect.objectContaining({
        code: 'incomplete-participation',
        intent: 'support',
        count: 1,
        codenames: ['Calm Fox'],
      }),
      expect.objectContaining({
        code: 'absent-catch-up',
        intent: 'support',
        count: 1,
        codenames: ['Swift Hawk'],
      }),
      expect.objectContaining({
        code: 'revision-growth',
        intent: 'celebrate',
        count: 1,
        codenames: ['Brave Otter'],
      }),
    ]);
    expect(brief.byKind).toEqual([
      expect.objectContaining({
        kind: 'feedback_response',
        invited: 3,
        submitted: 2,
        completionPercent: 67,
      }),
    ]);
    const serialized = JSON.stringify(brief);
    expect(serialized).not.toContain('PRIVATE_STUDENT_ANSWER');
    expect(serialized).not.toContain('PRIVATE_TEACHER_PROMPT');
    expect(serialized.toLowerCase()).not.toContain('misconception');
  });

  it('counts canonical numeric quiz responses but excludes completion and reflection sentinels', () => {
    const responseMap = {
      0: { itemType: 'mcq', answer: 1 },
      1: { itemType: 'short-answer', answer: { text: 'PRIVATE_RESPONSE' } },
      2: { itemType: 'assessment-complete', answer: { submittedAt: 123 } },
      r0: { itemType: 'reflection', answer: { text: 'PRIVATE_REFLECTION' } },
      '03': { itemType: 'mcq', answer: 0 },
      '-1': { itemType: 'mcq', answer: 0 },
      10000: { itemType: 'mcq', answer: 0 },
      completion: { itemType: 'assessment-complete' },
    };

    expect(helpers.countValidRosterQuizResponses(responseMap)).toBe(2);

    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'COUNT',
      rosterKey: { students: { 'Brave Otter': 'blue' } },
      sessionData: {
        roster: { privateUid: { name: 'Brave Otter' } },
        quizState: { allResponses: { privateUid: responseMap } },
      },
    });
    expect(summary.participants['Brave Otter'].responseCount).toBe(2);
    expect(JSON.stringify(summary)).not.toContain('PRIVATE_RESPONSE');
    expect(JSON.stringify(summary)).not.toContain('PRIVATE_REFLECTION');
    expect(JSON.stringify(summary)).not.toContain('privateUid');
  });

  it('fails closed for ambiguous roster names and ambiguous live connections', () => {
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'AMBIGUOUS',
      rosterKey: {
        students: {
          'Brave-Otter': 'blue',
          'Brave Otter': 'green',
        },
      },
      sessionData: {
        roster: {
          privateUid: { name: ' brave_otter ', groupId: 'blue' },
        },
        quizState: {
          allResponses: {
            privateUid: { 0: { itemType: 'mcq', answer: 1 } },
          },
        },
      },
    });

    expect(summary.participants).toEqual({});
    expect(summary.unmatchedCodenames).toEqual(['brave_otter']);
    expect(summary.absentCodenames).toEqual(['Brave-Otter', 'Brave Otter']);
    expect(JSON.stringify(summary)).not.toContain('privateUid');

    const resolveAmbiguousRoster = makeCohortResolver({
      roster: {
        privateUid: { name: 'brave_otter' },
      },
    }, {
      students: {
        'Brave-Otter': 'blue',
        'Brave Otter': 'green',
      },
    });
    expect(resolveAmbiguousRoster(['Brave-Otter', 'Brave Otter'])).toEqual([]);

    const duplicateLiveSummary = helpers.buildRosterSessionSummary({
      sessionCode: 'DUPLICATE-LIVE',
      rosterKey: {
        students: {
          'Brave Otter': 'blue',
          'Calm Fox': 'green',
        },
      },
      sessionData: {
        roster: {
          firstPrivateUid: { name: 'Brave Otter', groupId: 'blue' },
          secondPrivateUid: { name: ' brave-otter ', groupId: 'blue' },
          uniquePrivateUid: { name: 'Calm Fox', groupId: 'green' },
        },
        quizState: {
          allResponses: {
            firstPrivateUid: { 0: { itemType: 'mcq', answer: 'PRIVATE_DUPLICATE_A' } },
            secondPrivateUid: {
              0: { itemType: 'mcq', answer: 'PRIVATE_DUPLICATE_B' },
              1: { itemType: 'mcq', answer: 'PRIVATE_DUPLICATE_C' },
            },
            uniquePrivateUid: { 0: { itemType: 'mcq', answer: 1 } },
          },
        },
      },
      activitySnapshots: [{
        kind: 'rating',
        phase: 'closed',
        audienceUids: ['firstPrivateUid', 'secondPrivateUid', 'uniquePrivateUid'],
        participantStatus: {
          firstPrivateUid: 'submitted',
          secondPrivateUid: 'revised',
          uniquePrivateUid: 'submitted',
        },
        counts: {},
      }],
    });

    expect(duplicateLiveSummary.participants).toEqual({
      'Calm Fox': expect.objectContaining({
        responseCount: 1,
        liveActivityCount: 1,
        liveSubmissionCount: 1,
        liveRevisionCount: 0,
      }),
    });
    expect(duplicateLiveSummary.unmatchedCodenames).toEqual(['Brave Otter']);
    expect(duplicateLiveSummary.absentCodenames).toEqual(['Brave Otter']);
    expect(duplicateLiveSummary.insightBrief.participantsWithRecordedResponse).toBe(1);
    const duplicateSerialized = JSON.stringify(duplicateLiveSummary);
    expect(duplicateSerialized).not.toContain('firstPrivateUid');
    expect(duplicateSerialized).not.toContain('secondPrivateUid');
    expect(duplicateSerialized).not.toContain('PRIVATE_DUPLICATE');
    const resolveCohortUids = makeCohortResolver({
      roster: {
        firstPrivateUid: { name: 'Brave Otter', lastSeen: 1_000_000 },
        secondPrivateUid: { name: 'brave-otter', lastSeen: 1_000_000 },
        uniquePrivateUid: { name: 'Calm Fox', lastSeen: 1_000_000 },
      },
    }, {
      students: {
        'Brave Otter': 'blue',
        'Calm Fox': 'green',
      },
    });
    expect(resolveCohortUids(['Brave Otter'], 1_000_000)).toEqual([]);
    expect(resolveCohortUids(['Calm Fox'], 1_000_000)).toEqual(['uniquePrivateUid']);
    expect(resolveCohortUids(['Brave Otter', 'Calm Fox'], 1_000_000)).toEqual(['uniquePrivateUid']);
  });

  it('shares one heartbeat classifier across the Live Dock and targeted delivery', () => {
    const now = 1_000_000;
    expect(helpers.classifyLiveRosterPresence({ entry: { lastSeen: now - 1_000 }, now })).toMatchObject({ status: 'connected', isRecentlyActive: true });
    expect(helpers.classifyLiveRosterPresence({ entry: { lastSeen: now - 95_000 }, now })).toMatchObject({ status: 'quiet', isRecentlyActive: true });
    expect(helpers.classifyLiveRosterPresence({ entry: { lastSeen: now - 199_999 }, now })).toMatchObject({ status: 'quiet', isRecentlyActive: true });
    expect(helpers.classifyLiveRosterPresence({ entry: { lastSeen: now - 200_000 }, now })).toMatchObject({ status: 'disconnected', isRecentlyActive: false });
    expect(helpers.classifyLiveRosterPresence({ entry: {}, now })).toMatchObject({ status: 'unknown', isRecentlyActive: false });
    expect(helpers.classifyLiveRosterPresence({ entry: { lastSeen: now + 200_001 }, now })).toMatchObject({ status: 'unknown', isRecentlyActive: false });
  });

  it('builds exact successful-source fingerprints and omits duplicate or trimmed ids', () => {
    const first = helpers.buildPublishedResourceFingerprintMap({
      resources: [{ id: 'kept', rev: 1 }, { id: 'duplicate', rev: 1 }, { id: 'duplicate', rev: 2 }, { id: 'trimmed', rev: 1 }],
      publishedIds: ['kept', 'duplicate'],
      getFingerprint: resource => resource.id + ':' + resource.rev,
    });
    expect(first).toEqual({ kept: 'kept:1' });
    const revised = helpers.buildPublishedResourceFingerprintMap({
      resources: [{ id: 'kept', rev: 2 }],
      publishedIds: ['kept'],
      getFingerprint: resource => resource.id + ':' + resource.rev,
    });
    expect(revised).toEqual({ kept: 'kept:2' });
    const lateResources = Array.from({ length: 301 }, (_, index) => ({ id: index === 300 ? 'late-kept' : 'other-' + index, rev: 1 }));
    expect(helpers.buildPublishedResourceFingerprintMap({
      resources: lateResources, publishedIds: ['late-kept'], getFingerprint: resource => resource.id + ':' + resource.rev,
    })).toEqual({ 'late-kept': 'late-kept:1' });
  });

  it('serializes Firebase resource publishes per session so the newest queued write finishes last', async () => {
    const queues = {};
    const events = [];
    let releaseFirst;
    const first = helpers.enqueueLiveSessionResourcePublish({
      queues, sessionKey: 'firebase|app|LIVE',
      publish: () => new Promise(resolve => {
        events.push('old:start');
        releaseFirst = () => { events.push('old:end'); resolve('old'); };
      }),
    });
    await Promise.resolve();
    const second = helpers.enqueueLiveSessionResourcePublish({
      queues, sessionKey: 'firebase|app|LIVE',
      publish: async () => { events.push('new:start'); events.push('new:end'); return 'new'; },
    });
    await Promise.resolve();
    expect(events).toEqual(['old:start']);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual(['old', 'new']);
    expect(events).toEqual(['old:start', 'old:end', 'new:start', 'new:end']);
    expect(queues).toEqual({});
  });

  it('re-resolves saved follow-up audiences without class fallback and requires published resources', () => {
    const now = 1_000_000;
    const base = {
      sessionId: 'saved-1',
      sessionHistory: [{
        id: 'saved-1',
        followUpPlan: { resourceId: 'support-resource', audience: 'cohort', cohortCode: 'needs-support', status: 'planned', plannedAt: '2026-08-02T12:00:00.000Z' },
        insightBrief: { evidenceCohorts: [{ code: 'needs-support', intent: 'support', label: 'Needs support', codenames: ['Brave Otter', 'Calm Fox'] }] },
      }],
      rosterStudents: { 'Brave Otter': 'blue', 'Calm Fox': 'green' },
      liveRoster: { firstPrivateUid: { name: 'Brave Otter', lastSeen: now - 1_000 }, secondPrivateUid: { name: 'Calm Fox', lastSeen: now - 120_000 } },
      resources: [{ id: 'support-resource', type: 'simplified', title: 'Support' }],
      normalizePlan: value => value,
      getResourceFingerprint: () => 'published-fingerprint',
      isResourcePublished: (_resource, fingerprint) => fingerprint === 'published-fingerprint',
      activeSessionCode: 'LIVE-1',
      activeSessionAppId: 'resumed-host-app',
      sessionMode: 'sync',
      transportKind: 'firebase',
      now,
    };
    const cohort = helpers.resolveSavedFollowUpLivePlanTarget(base);
    expect(cohort).toMatchObject({
      ok: true,
      audience: 'cohort',
      audienceLabel: 'Needs support',
      connectedCount: 2,
      uids: ['firstPrivateUid', 'secondPrivateUid'],
      sessionAppId: 'resumed-host-app',
    });

    const missingCohort = helpers.resolveSavedFollowUpLivePlanTarget({
      ...base,
      sessionHistory: [{ ...base.sessionHistory[0], insightBrief: { evidenceCohorts: [] } }],
    });
    expect(missingCohort).toEqual({ ok: false, reason: 'cohort-unavailable' });
    expect(missingCohort).not.toHaveProperty('audience', 'class');

    expect(helpers.resolveSavedFollowUpLivePlanTarget({ ...base, isResourcePublished: () => false }))
      .toEqual({ ok: false, reason: 'resource-syncing' });
    expect(helpers.resolveSavedFollowUpLivePlanTarget({ ...base, resources: [] }))
      .toEqual({ ok: false, reason: 'resource-unavailable' });
    expect(helpers.resolveSavedFollowUpLivePlanTarget({ ...base, sessionIsActive: false }))
      .toEqual({ ok: false, reason: 'inactive-session' });
    expect(helpers.resolveSavedFollowUpLivePlanTarget({
      ...base,
      liveRoster: { staleUid: { name: 'Brave Otter', lastSeen: now - 200_000 }, unknownUid: { name: 'Calm Fox' } },
    })).toEqual({ ok: false, reason: 'no-live-learners' });
    expect(helpers.resolveSavedFollowUpLivePlanTarget({
      ...base,
      liveRoster: { staleUid: { name: 'Brave Otter', lastSeen: now - 200_000 }, freshUnrelatedUid: { name: 'Other Learner', lastSeen: now - 1_000 } },
    })).toEqual({ ok: false, reason: 'no-cohort-learners' });

    const relabeled = helpers.resolveSavedFollowUpLivePlanTarget({
      ...base,
      sessionHistory: [{ ...base.sessionHistory[0], insightBrief: { evidenceCohorts: [{ ...base.sessionHistory[0].insightBrief.evidenceCohorts[0], label: 'Updated support label' }] } }],
    });
    expect(relabeled.planSignature).not.toBe(cohort.planSignature);

    const classBase = {
      ...base,
      sessionHistory: [{ ...base.sessionHistory[0], followUpPlan: { resourceId: 'support-resource', audience: 'class', status: 'planned' } }],
    };
    expect(helpers.resolveSavedFollowUpLivePlanTarget(classBase)).toMatchObject({ ok: true, audience: 'class', connectedCount: 2, uids: [] });
    expect(helpers.resolveSavedFollowUpLivePlanTarget({ ...classBase, sessionMode: 'async' }))
      .toEqual({ ok: false, reason: 'teacher-paced-required' });
  });

  it('orders async activity summaries by server version, request sequence, and activity scope', () => {
    const current = { scope: 'pack:A', sequence: 2, version: 5 };
    expect(nextSharedActivityOrder(current, { version: 4 }, 1, 'pack:A', 'pack:A')).toBeNull();
    expect(nextSharedActivityOrder(current, { version: 5 }, 1, 'pack:A', 'pack:A')).toBeNull();
    expect(nextSharedActivityOrder(current, { version: 6 }, 1, 'pack:A', 'pack:A')).toEqual({
      scope: 'pack:A',
      sequence: 1,
      version: 6,
    });

    const nextActivity = nextSharedActivityOrder(current, { version: 0 }, 3, 'pack:B', 'pack:B');
    expect(nextActivity).toEqual({ scope: 'pack:B', sequence: 3, version: 0 });
    expect(nextSharedActivityOrder(nextActivity, { version: 7 }, 4, 'pack:A', 'pack:B')).toBeNull();
  });

  it('resolves and sends a 32-learner cohort through bounded canonical patches', async () => {
    const uids = Array.from({ length: 32 }, (_, index) => `uid-${index + 1}`);
    const names = Array.from({ length: 32 }, (_, index) => `Student ${index + 1}`);
    const now = 1_000_000;
    const roster = Object.fromEntries(uids.map((uid, index) => [uid, { name: names[index], lastSeen: now }]));
    const rosterKey = { students: Object.fromEntries(names.map(name => [name, 'blue'])) };
    const resolveCohortUids = makeCohortResolver({ roster }, rosterKey);
    expect(resolveCohortUids(names, now)).toEqual(uids);

    const plan = helpers.buildStudentResourcePatchBatches({
      uids,
      roster,
      resourceId: 'support-resource',
      resourceAt: 12345,
    });
    expect(plan.uids).toEqual(uids);
    expect(plan.batches.map(batch => batch.uids.length)).toEqual([25, 7]);
    expect(plan.batches.map(batch => Object.keys(batch.updates).length)).toEqual([50, 14]);

    const senderStart = app.indexOf('const handleSetStudentsResource = async');
    const senderEnd = app.indexOf('// Release only individual overrides', senderStart);
    const senderSource = app.slice(senderStart, senderEnd);
    const patches = [];
    const toasts = [];
    const docPaths = [];
    const sender = new Function(
      'activeSessionCode', 'sessionData', 'doc', 'db', 'appId', 'activeSessionAppId', 'updateDoc',
      'addToast', 't', 'warnLog', 'buildStudentResourcePatchBatches',
      senderSource + '\nreturn handleSetStudentsResource;'
    )(
      'SESSION', { roster }, (...parts) => { docPaths.push(parts); return { path: 'session' }; }, {}, 'default-app', 'resumed-host-app',
      async (_ref, updates) => {
        patches.push(updates);
        if (patches.length === 2) throw new Error('second batch failed');
      },
      (message, tone) => toasts.push({ message, tone }),
      () => '', () => {}, helpers.buildStudentResourcePatchBatches
    );

    await expect(sender(uids, 'support-resource')).resolves.toEqual({ sent: 25, failed: 7 });
    expect(patches.map(updates => Object.keys(updates).length)).toEqual([50, 14]);
    expect(docPaths[0][2]).toBe('resumed-host-app');
    expect(toasts.at(-1)).toMatchObject({ tone: 'error' });
    expect(toasts.at(-1).message).toContain('assigned to 25 students; 7 could not be assigned');
  });
  it('uses student-safe preview resources and the existing batch-send path for cohorts', () => {
    const previewStart = app.indexOf('const requestEndLiveSession');
    const previewEnd = app.indexOf('const completeLiveSessionEnd', previewStart);
    const previewSource = app.slice(previewStart, previewEnd);

    expect(previewSource).toContain('_alloStudentSafeResources(getFilteredHistory())');
    expect(previewSource).toContain('followUpResources');
    expect(previewSource).toContain(".find(candidate => candidate?.code === cohortCode)");
    expect(previewSource).toContain('resolveEndSessionCohortUids(latestCohort?.codenames)');
    expect(previewSource).toContain('summary: latestSummary');
    expect(previewSource).toContain('const result = await handleSetStudentsResource(uids, resourceId);');
    expect(previewSource).not.toContain('updateDoc(');
    expect(endSessionPreviewSource).toContain('aria-label="Choose the student-safe resource to send to an evidence cohort"');
    expect(endSessionPreviewSource).toContain("aria-label={'Send the selected follow-up resource to ' + connectedCount");
    expect(endSessionPreviewSource).toContain('disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy}');
  });

  it('rebuilds the saved summary from the latest live evidence at completion time', () => {
    const completionStart = app.indexOf('const completeLiveSessionEnd');
    const completionEnd = app.indexOf('// One END regardless', completionStart);
    expect(completionStart).toBeGreaterThan(-1);
    expect(completionEnd).toBeGreaterThan(completionStart);
    const completionSource = app.slice(completionStart, completionEnd);

    expect(completionSource).toContain('const endedAt = new Date().toISOString();');
    expect(completionSource.match(/const endedAt =/g)).toHaveLength(1);
    expect(completionSource).toContain('const latestSessionData = sessionData');
    expect(completionSource).toContain('allResponses: quizMergedAllResponses || {}');
    expect(completionSource).toContain('mode: endingMode');
    expect(completionSource).toContain('activitySnapshots: liveActivitySnapshots');
    expect(completionSource).toContain('endedAt,');
    expect(completionSource).toContain('saveRosterSessionSummary(prev, latestSummary, endSessionNote, 30)');
    expect(completionSource).not.toContain('const summary = endSessionPreview?.summary');
  });
  it('exports derived saved-history evidence as CSV without private activity fields', () => {
    const csv = csvHelpers.buildRosterSessionEvidenceCsv({
      id: 'SESSION-1',
      endedAt: '2026-07-29T15:00:00.000Z',
      durationMinutes: 42,
      mode: 'firebase',
      participants: {
        'Brave "Otter", Jr.': {
          groupId: 'blue',
          responseCount: 2,
          liveActivityCount: 3,
          liveSubmissionCount: 2,
          liveRevisionCount: 1,
          privateUid: 'PRIVATE_EXPORT_SENTINEL',
          rawAnswer: 'PRIVATE_EXPORT_SENTINEL',
        },
      },
      liveActivities: [{
        activityId: 'PRIVATE_EXPORT_SENTINEL',
        kind: 'feedback_response',
        invited: 3,
        submitted: 2,
        revised: 1,
        approved: 1,
        hidden: 1,
        feedbackSent: 1,
        votesCast: 2,
        prompt: 'PRIVATE_EXPORT_SENTINEL',
      }],
      insightBrief: {
        followUpCodenames: ['Brave "Otter", Jr.'],
      },
    });

    expect(csv.split('\r\n')[0]).toBe(
      'record_type,session_id,ended_at,duration_minutes,transport,codename,group_id,quiz_responses,activity_opportunities,activity_submissions,revisions,follow_up,activity_kind,invited,submitted,approved,hidden,feedback_sent,votes_cast'
    );
    expect(csv).toContain('"Brave ""Otter"", Jr."');
    expect(csv).toContain('participant,SESSION-1');
    expect(csv).toContain('activity,SESSION-1');
    expect(csv).toContain('feedback_response,3,2,1,1,1,2');
    expect(csv).not.toContain('PRIVATE_EXPORT_SENTINEL');

    const formulaCsv = csvHelpers.buildRosterSessionEvidenceCsv({
      id: '=SUM(A1:A2)',
      participants: {
        '+cmd': { groupId: '@group' },
      },
    });
    expect(formulaCsv).toContain("'=SUM(A1:A2)");
    expect(formulaCsv).toContain("'+cmd");
    expect(formulaCsv).toContain("'@group");
  });

  it('renders saved cohorts and exposes the CSV builder from the roster-history surface', () => {
    expect(teacher).toContain('aria-label="Download this privacy-safe session evidence report as CSV"');
    expect(teacher).toContain('aria-label="Saved evidence cohorts"');
    expect(teacher).toContain('session.insightBrief.evidenceCohorts.map');
    expect(teacher).toContain('downloadRosterSessionEvidenceCsv(session)');
    expect(teacher).toContain('window.AlloModules.buildRosterSessionEvidenceCsv = buildRosterSessionEvidenceCsv');
  });
});


describe('live-session reliability refinements', () => {
  it('counts targeted resource assignments separately from opened acknowledgements', () => {
    const delivery = helpers.summarizeLiveSessionResourceDelivery({
      roster: {
        opened: { resourceId: 'r1', resourceAt: 100, viewingResourceId: 'r1', viewingAt: 101, viewingResourceAt: 100 },
        pending: { resourceId: 'r1', resourceAt: 100, viewingResourceId: 'r1', viewingAt: 200, viewingResourceAt: 99 },
        groupOpened: { groupId: 'g1', viewingResourceId: 'r2', viewingAt: 201, viewingResourceAt: 200 },
        classPaced: { viewingResourceId: 'class-resource', viewingAt: 300 },
      },
      groups: { g1: { resourceId: 'r2', resourceAt: 200 } },
      currentResourceId: 'class-resource',
      sessionMode: 'sync',
    });
    expect(delivery).toMatchObject({ assigned: 3, opened: 2, pending: 1 });

    expect(helpers.resolveLiveStudentResourceTarget({
      entry: { resourceId: 'individual', resourceAt: 300, groupId: 'g1' },
      groups: { g1: { resourceId: 'group', resourceAt: 200 } },
      currentResourceId: 'class',
      sessionMode: 'sync',
    })).toEqual({ resourceId: 'individual', resourceAt: 300 });
    expect(helpers.resolveLiveStudentResourceTarget({
      entry: { groupId: 'g1' },
      groups: { g1: { resourceId: 'group', resourceAt: 200 } },
      currentResourceId: 'class',
      sessionMode: 'sync',
    })).toEqual({ resourceId: 'group', resourceAt: 200 });
    expect(helpers.resolveLiveStudentResourceTarget({
      entry: {}, groups: {}, currentResourceId: 'class', sessionMode: 'sync',
    })).toEqual({ resourceId: 'class', resourceAt: null });
    expect(app).toContain("const targetAt = target ? Number(target.resourceAt) : NaN;");
    expect(app).toContain("Object.prototype.hasOwnProperty.call(entry, 'viewingResourceAt')");
    expect(delivery.pendingUids).toEqual(['pending']);
    const recovery = helpers.summarizeLiveSessionResourceDelivery({
      roster: {
        loading: { resourceId: 'support', resourceAt: 400, viewingResourceId: 'old', viewingResourceAt: 400, viewingResourceStatus: 'loading' },
        failed: { resourceId: 'support', resourceAt: 400, viewingResourceId: 'old', viewingResourceAt: 400, viewingResourceStatus: 'failed' },
        ready: { resourceId: 'support', resourceAt: 400, viewingResourceId: 'support', viewingResourceAt: 400, viewingResourceStatus: 'ready' },
      },
      groups: {}, currentResourceId: null, sessionMode: 'async',
    });
    expect(recovery).toMatchObject({ assigned: 3, opened: 1, pending: 2, loading: 1, failed: 1 });
    expect(recovery.loadingUids).toEqual(['loading']);
    expect(recovery.failedUids).toEqual(['failed']);
  });

  it('retains only deduplicated, privacy-safe per-question quiz counts', () => {
    let evidence = {};
    evidence = helpers.mergeLiveQuizEvidenceResponse(evidence, 'quiz-a', 'privateUid', 0, { itemType: 'mcq', answer: 'PRIVATE' });
    evidence = helpers.mergeLiveQuizEvidenceResponse(evidence, 'quiz-a', 'privateUid', 0, { itemType: 'mcq', answer: 'PRIVATE-UPDATED' });
    evidence = helpers.mergeLiveQuizEvidenceResponse(evidence, 'quiz-a', 'privateUid', 1, { itemType: 'short-answer', answer: 'PRIVATE-SECOND' });
    evidence = helpers.mergeLiveQuizEvidenceResponse(evidence, 'quiz-a', 'privateUid', 2, { itemType: 'reflection', answer: 'PRIVATE-REFLECTION' });
    evidence = helpers.mergeLiveQuizEvidenceResponse(evidence, 'quiz-b', 'privateUid', 0, { itemType: 'mcq', answer: 'PRIVATE-THIRD' });
    expect(helpers.buildLiveQuizResponseCounts(evidence)).toEqual({ privateUid: 3 });
    expect(JSON.stringify(evidence)).not.toContain('PRIVATE');
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'session-quiz',
      sessionData: {
        createdAt: '2026-08-01T10:00:00.000Z',
        roster: { privateUid: { name: 'Brave Otter', groupId: 'g1' } },
        quizState: { allResponses: {} },
      },
      rosterKey: { students: { 'Brave Otter': 'g1' } },
      mode: 'firebase',
      quizResponseCountsByUid: { privateUid: 3 },
    });
    expect(summary.participants['Brave Otter'].responseCount).toBe(3);
    expect(JSON.stringify(summary)).not.toContain('privateUid');
  });

  it('bounds fallback quiz receipt history and binds it to one activity', () => {
    expect(helpers.normalizeQuizReceiptQuestionIndexes([0, 1, 1, 2], 2)).toEqual([0, 1, 2]);
    const bounded = helpers.normalizeQuizReceiptQuestionIndexes(Array.from({ length: 130 }, (_, index) => index), 129);
    expect(bounded).toHaveLength(128);
    expect(bounded[0]).toBe(2);
    expect(bounded.at(-1)).toBe(129);
    expect(app).toContain('previousReceipt.activityId === activityId');
    expect(app).toContain('questionIndexes,');
    expect(app).toContain("Object.prototype.hasOwnProperty.call(entry, 'viewingResourceAt')");
    expect(mailbox).toContain('questionIndexes.length > 128');
    expect(mailbox).toContain('viewingResourceAt: 1');
  });

  it('requires an explicit end choice while targeted resources remain unconfirmed', () => {
    expect(app).toContain('useFocusTrap(endSessionPreviewRef, Boolean(endSessionPreview)');
    expect(app).toContain('completeLiveSessionEnd = async (saveSummary, allowUnconfirmed = false)');
    const completionStart = app.indexOf('const completeLiveSessionEnd = async');
    const completionSource = app.slice(completionStart);
    expect(completionSource).toContain('deliveryGuard: true');
    expect(completionSource.indexOf('await endMailboxLiveSession')).toBeLessThan(completionSource.indexOf('saveRosterSessionSummary'));
    expect(endSessionPreviewSource).toContain('Save summary & end anyway');
  });
});
