import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pollingSource = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');
const shellSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

let LivePolling;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
  if (!LivePolling) throw new Error('LivePolling failed to register');
});

describe('Word Cloud normalization and aggregation', () => {
  it('normalizes Unicode, whitespace, surrounding punctuation, and length', () => {
    expect(LivePolling.normalizeWordCloudTerm('  “Shared   INSIGHT!”  ')).toBe('Shared INSIGHT');
    expect(LivePolling.normalizeWordCloudTerm('Ｆｌｏｗ')).toBe('Flow');
    expect(LivePolling.normalizeWordCloudTerm('x'.repeat(80))).toHaveLength(LivePolling.WORD_CLOUD_MAX_LENGTH);
    expect(LivePolling.normalizeWordCloudTerm(' ... ')).toBe('');
  });

  it('aggregates case-insensitively and keeps only the latest response per student', () => {
    const items = LivePolling.buildWordCloudItems([
      { uid: 'u1', response: 'First thought', timestamp: 1 },
      { uid: 'u1', response: 'Growth', timestamp: 2 },
      { uid: 'u2', response: ' growth ', timestamp: 1 },
      { uid: 'u3', response: 'Connection', timestamp: 1 },
    ], { growth: 'approved', connection: 'hidden' });

    expect(items).toEqual([
      { value: 'growth', label: 'Growth', count: 2, status: 'approved' },
      { value: 'connection', label: 'Connection', count: 1, status: 'hidden' },
    ]);
    expect(JSON.stringify(items)).not.toContain('First thought');
  });

  it('holds new terms by default', () => {
    expect(LivePolling.buildWordCloudItems([
      { uid: 'u1', response: 'Curiosity' },
    ], {})).toEqual([
      { value: 'curiosity', label: 'Curiosity', count: 1, status: 'pending' },
    ]);
  });

  it('lets the teacher rename and merge synonymous terms without exposing authors', () => {
    const items = LivePolling.buildWordCloudItems([
      { uid: 'u1', codename: 'Blue Fox', response: 'photosynthesis' },
      { uid: 'u2', codename: 'Bright Owl', response: 'plant energy' },
      { uid: 'u3', codename: 'Quiet Star', response: 'cellular respiration' },
    ], { 'energy conversion': 'approved' }, {
      photosynthesis: 'Energy conversion',
      'plant energy': 'Energy conversion',
    });

    expect(items[0]).toMatchObject({
      value: 'energy conversion',
      label: 'Energy conversion',
      count: 2,
      status: 'approved',
      sourceKeys: ['photosynthesis', 'plant energy'],
    });
    expect(JSON.stringify(items)).not.toContain('Blue Fox');
    expect(JSON.stringify(items)).not.toContain('u1');
  });

  it('keeps display color and size stable for the same term and frequency', () => {
    expect(LivePolling.stableWordCloudColor('Energy')).toBe(LivePolling.stableWordCloudColor('energy'));
    expect(LivePolling.stableWordCloudSize(3, 8)).toBe(LivePolling.stableWordCloudSize(3, 8));
    expect(LivePolling.stableWordCloudSize(8, 8)).not.toBe(LivePolling.stableWordCloudSize(1, 8));
  });

  it('filters the moderation queue by status, display label, and grouped source terms', () => {
    const items = [
      { value: 'energy conversion', label: 'Energy conversion', count: 2, status: 'approved', sourceKeys: ['photosynthesis', 'plant energy'] },
      { value: 'mitosis', label: 'Mitosis', count: 1, status: 'pending' },
      { value: 'off topic', label: 'Off topic', count: 1, status: 'hidden' },
    ];

    expect(LivePolling.filterWordCloudModerationItems(items, { status: 'pending' }).map((item) => item.value)).toEqual(['mitosis']);
    expect(LivePolling.filterWordCloudModerationItems(items, { query: 'plant energy' }).map((item) => item.value)).toEqual(['energy conversion']);
    expect(LivePolling.filterWordCloudModerationItems(items, { status: 'approved', query: 'MITOSIS' })).toEqual([]);
    expect(LivePolling.WORD_CLOUD_MODERATION_FILTERS).toEqual(['all', 'pending', 'approved', 'hidden']);
  });
});

describe('Teacher-reviewed Word Cloud grouping', () => {
  const items = [
    { value: 'plant energy', label: 'Plant energy', count: 3, status: 'approved' },
    { value: 'photosynthesis', label: 'Photosynthesis', count: 2, status: 'approved' },
    { value: 'private held', label: 'Private held', count: 1, status: 'pending' },
  ];

  it('sends the AI only approved anonymous aggregate terms', () => {
    const prompt = LivePolling.buildWordCloudClusterPrompt(items);
    expect(prompt).toContain('Plant energy');
    expect(prompt).toContain('Photosynthesis');
    expect(prompt).not.toContain('Private held');
    expect(prompt).not.toContain('uid');
    expect(prompt).not.toContain('codename');
  });

  it('accepts exact approved members, rejects invented terms, and creates a teacher-applied alias patch', () => {
    const suggestions = LivePolling.parseWordCloudClusterSuggestions({ clusters: [
      { label: 'Photosynthesis', members: ['Plant energy', 'Photosynthesis', 'Invented term'] },
      { label: 'Duplicate', members: ['Plant energy', 'Photosynthesis'] },
    ] }, items);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ label: 'Photosynthesis', members: ['Plant energy', 'Photosynthesis'], count: 5 });
    expect(LivePolling.buildWordCloudAliasPatch(items, suggestions[0])).toEqual({
      'plant energy': 'Photosynthesis',
      photosynthesis: 'Photosynthesis',
    });
  });
});

describe('Teacher student-activity ledger', () => {
  it('combines the current poll with other live activity receipts and excludes answer content', () => {
    const rows = LivePolling.buildLiveStudentActivityRows({
      roster: { u1: { name: 'Ari', groupId: 'g1' }, u2: { name: 'Bo' }, u3: { name: 'Cy' } },
      guests: [{ uid: 'u1', codename: 'Ari' }, { uid: 'u2', codename: 'Bo' }],
      activePoll: { id: 'wc-2', type: 'wordcloud', startedAt: 100 },
      activeParticipantUids: ['u1', 'u2'],
      responses: [{ uid: 'u1', response: 'private term', timestamp: 110 }],
      responseStatuses: { u2: 'editing' },
      activitySnapshots: [{
        family: 'pictionary', kind: 'sketch_response', updatedAt: 90,
        audienceUids: ['u3'], participantStatus: { u3: 'submitted' },
      }],
    });

    expect(rows).toEqual([
      expect.objectContaining({ uid: 'u1', activity: 'Word cloud', status: 'submitted', connected: true }),
      expect.objectContaining({ uid: 'u2', activity: 'Word cloud', status: 'working', connected: true }),
      expect.objectContaining({ uid: 'u3', activity: 'Sketch response', status: 'submitted', connected: false }),
    ]);
    expect(JSON.stringify(rows)).not.toContain('private term');
  });

  it('shows mailbox-compatible resource delivery and bounded practice completion receipts', () => {
    const rows = LivePolling.buildLiveStudentActivityRows({
      roster: {
        u1: { name: 'Ari', resourceId: 'r1', resourceAt: 100, viewingResourceId: 'r1', viewingResourceAt: 100, viewingResourceStatus: 'ready' },
        u2: { name: 'Bo', groupId: 'g1', viewingResourceId: 'r2', viewingResourceAt: 200, viewingResourceStatus: 'ready', wsProgress: { correct: 7, total: 8, done: true } },
        u3: { name: 'Cy', resourceId: 'r3', resourceAt: 300, viewingResourceId: 'r3', viewingResourceAt: 300, viewingResourceStatus: 'failed' },
      },
      groups: { g1: { resourceId: 'r2', resourceAt: 200 } },
      resources: [
        { id: 'r1', title: 'Evidence Sort' },
        { id: 'r2', title: 'Word Sounds Practice' },
        { id: 'r3', title: 'Map Lab' },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({ uid: 'u1', activity: 'Evidence Sort', status: 'opened' }),
      expect.objectContaining({ uid: 'u2', activity: 'Word Sounds Practice', status: 'complete', progressDetail: '7/8' }),
      expect.objectContaining({ uid: 'u3', activity: 'Map Lab', status: 'failed' }),
    ]);
    expect(JSON.stringify(rows)).not.toContain('viewingResourceAt');
  });

  it('summarizes and filters the privacy-safe roster by progress, connection, activity, and group', () => {
    const rows = [
      { uid: 'u1', name: 'Ari', groupId: 'g1', connected: true, activity: 'Evidence Sort', status: 'working', supportStatus: 'help', progressDetail: '' },
      { uid: 'u2', name: 'Bo', groupId: '', connected: true, activity: 'Word Sounds', status: 'complete', progressDetail: '8/8' },
      { uid: 'u3', name: 'Cy', groupId: '', connected: true, activity: 'Map Lab', status: 'failed', progressDetail: '' },
      { uid: 'u4', name: 'Dee', groupId: '', connected: false, activity: 'Assigned resource', status: 'waiting', progressDetail: '' },
    ];

    expect(LivePolling.summarizeLiveStudentActivityRows(rows)).toEqual({
      all: 4,
      help: 1,
      'in-progress': 1,
      finished: 1,
      attention: 3,
      offline: 1,
    });
    expect(LivePolling.filterLiveStudentActivityRows(rows, { filter: 'help' }).map((row) => row.uid)).toEqual(['u1']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { filter: 'finished' }).map((row) => row.uid)).toEqual(['u2']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { filter: 'attention' }).map((row) => row.uid)).toEqual(['u1', 'u3', 'u4']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { query: 'blue pod', groups: { g1: { name: 'Blue Pod' } } }).map((row) => row.uid)).toEqual(['u1']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { sort: 'attention' }).map((row) => row.uid)).toEqual(['u1', 'u4', 'u3', 'u2']);
    expect(LivePolling.LIVE_STUDENT_ACTIVITY_SORTS).toEqual(['attention', 'name']);
    expect(JSON.stringify(LivePolling.filterLiveStudentActivityRows(rows, { query: 'map lab' }))).not.toContain('response');
  });

  it('prioritizes a privacy-safe teacher action queue and supports local review', () => {
    const rows = [
      { uid: 'u1', name: 'Ari', connected: true, activity: 'Evidence Sort', status: 'working', supportStatus: 'help', supportUpdatedAt: 500 },
      { uid: 'u2', name: 'Bo', connected: true, activity: 'Map Lab', status: 'failed', updatedAt: 400 },
      { uid: 'u3', name: 'Cy', connected: false, activity: 'Word Sounds', status: 'waiting', updatedAt: 300 },
      { uid: 'u4', name: 'Dee', connected: true, activity: 'Word cloud', status: 'withdrawn', updatedAt: 200 },
      { uid: 'u5', name: 'Eli', connected: true, activity: 'Rating poll', status: 'waiting', updatedAt: 100 },
      { uid: 'u6', name: 'Fox', connected: true, activity: 'Rating poll', status: 'submitted', updatedAt: 100, response: 'private answer' },
    ];
    const queue = LivePolling.buildLiveTeacherActionQueue(rows);
    expect(queue.map((item) => item.reason)).toEqual(['help', 'failed', 'offline', 'withdrawn', 'waiting']);
    expect(queue.map((item) => item.uid)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5']);
    expect(JSON.stringify(queue)).not.toContain('private answer');
    expect(LivePolling.buildLiveTeacherActionQueue(rows, { [queue[0].key]: true }).map((item) => item.uid)).toEqual(['u2', 'u3', 'u4', 'u5']);
    expect(LivePolling.LIVE_TEACHER_ACTION_REASONS).toEqual(['help', 'failed', 'offline', 'withdrawn', 'waiting']);
  });

  it('keeps claimed items visible, temporarily hides snoozed items, and removes resolved items', () => {
    const rows = [{ uid: 'u1', name: 'Ari', connected: true, activity: 'Map Lab', status: 'working', supportStatus: 'help', supportUpdatedAt: 1000 }];
    const open = LivePolling.buildLiveTeacherActionQueue(rows, {}, 4000);
    expect(open[0]).toMatchObject({ uid: 'u1', waitMs: 3000, actionStatus: 'open' });
    expect(LivePolling.buildLiveTeacherActionQueue(rows, { [open[0].key]: { status: 'claimed', updatedAt: 2000 } }, 4000)[0]).toMatchObject({ actionStatus: 'claimed' });
    expect(LivePolling.buildLiveTeacherActionQueue(rows, { [open[0].key]: { status: 'snoozed', updatedAt: 2000, snoozedUntil: 5000 } }, 4000)).toEqual([]);
    expect(LivePolling.buildLiveTeacherActionQueue(rows, { [open[0].key]: { status: 'resolved', updatedAt: 2000 } }, 4000)).toEqual([]);
  });
});

describe('Provider-neutral live session health and wrap-up', () => {
  it('labels Google Mailbox without requiring Firestore and surfaces only current transport problems', () => {
    expect(LivePolling.buildLiveTransportHealth({
      transportKind: 'mailbox', connectedCount: 2, expectedCount: 3, now: 2000,
      trace: [{ at: 1000, event: 'mailbox:doc-version' }],
    })).toMatchObject({ providerLabel: 'Google Class Mailbox', status: 'healthy', directCount: 2, missingDirectCount: 1, lastSyncAgeMs: 1000 });
    expect(LivePolling.buildLiveTransportHealth({
      transportKind: 'mailbox', connectedCount: 2, expectedCount: 2, now: 3000,
      trace: [{ at: 1000, event: 'mailbox:doc-version' }, { at: 2500, event: 'mailbox:timeout' }],
    })).toMatchObject({ status: 'attention', problemEvent: 'mailbox:timeout' });
  });

  it('builds a content-free cross-activity wrap-up with incomplete and follow-up counts', () => {
    const summary = LivePolling.buildLiveSessionWrapUp({
      completedPolls: [{
        poll: { id: 'p1', type: 'rating', prompt: 'Private prompt', startedAt: 1000 },
        audienceUids: ['u1', 'u2'], audienceCount: 2,
        responses: [{ uid: 'u1', response: 'private answer' }], endedAt: 2000,
      }],
      activePoll: { id: 'p2', type: 'wordcloud', prompt: 'Another prompt', startedAt: 2500 },
      activeParticipantUids: ['u3'],
      activeResponses: [{ uid: 'u3', response: 'private term' }],
      activitySnapshots: [{ activityId: 'sketch-1', kind: 'sketch_response', audienceUids: ['u4'], participantStatus: { u4: 'complete' }, startedAt: 500 }],
      actionQueue: [{ uid: 'u2', reason: 'help' }],
      sessionQaState: { questions: [{ questionId: 'q1', text: 'private question', status: 'pending' }] },
      sessionStartedAt: 0,
      now: 5000,
    });
    expect(summary).toMatchObject({ activityCount: 3, pollCount: 2, invitedCount: 3, responseCount: 2, responseRate: 67, unresolvedCount: 1, helpRequestCount: 1, pendingQuestionCount: 1 });
    expect(summary.incompleteUids).toEqual(['u2']);
    expect(JSON.stringify(summary)).not.toContain('Private prompt');
    expect(JSON.stringify(summary)).not.toContain('private answer');
    expect(JSON.stringify(summary)).not.toContain('private term');
    expect(JSON.stringify(summary)).not.toContain('private question');
  });

  it('rejects responses while the teacher has paused collection', () => {
    const host = LivePolling.createHost({ sessionCode: 'ABCD' });
    host.activePoll = { id: 'wc-paused', type: 'wordcloud', submissionsLocked: true };
    expect(host._acceptsResponse('u1', 'Learner', { pollId: 'wc-paused', response: 'saved draft' })).toBe(false);
    host.activePoll = { id: 'wc-paused', type: 'wordcloud', submissionsLocked: false };
    expect(host._acceptsResponse('u1', 'Learner', { pollId: 'wc-paused', response: 'saved draft' })).toBe(true);
  });

  it('recovers and expires a browser-session-only Q&A draft', () => {
    const values = new Map();
    const storage = { getItem: (key) => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
    expect(LivePolling.writeLiveSessionQaDraft('ABCD', 'u1', '  How does energy move?  ', storage, 1000)).toBe(true);
    expect(LivePolling.readLiveSessionQaDraft('ABCD', 'u1', storage, 2000)).toEqual({ text: 'How does energy move?', savedAt: 1000 });
    expect(LivePolling.readLiveSessionQaDraft('ABCD', 'u1', storage, 1000 + LivePolling.LIVE_QA_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    LivePolling.writeLiveSessionQaDraft('ABCD', 'u1', 'New question', storage, 3000);
    expect(LivePolling.clearLiveSessionQaDraft('ABCD', 'u1', storage)).toBe(true);
    expect(LivePolling.readLiveSessionQaDraft('ABCD', 'u1', storage, 3001)).toBeNull();
  });
});

describe('Live poll composer safety and continuity', () => {
  it('deduplicates and bounds multiple-choice options before broadcast', () => {
    const choices = LivePolling.normalizeLivePollChoices([
      '  Alpha  ',
      'alpha',
      'Beta',
      'x'.repeat(300),
    ]);
    expect(choices).toEqual(['Alpha', 'Beta', 'x'.repeat(LivePolling.LIVE_POLL_CHOICE_MAX_LENGTH)]);
    expect(choices.length).toBeLessThanOrEqual(LivePolling.LIVE_POLL_MAX_CHOICES);
  });

  it('blocks empty, audience-less, invalid-choice, and overlapping polls with explicit reasons', () => {
    expect(LivePolling.validateLivePollComposer({ type: 'mcq', prompt: '', options: 'Only one', audienceCount: 0, activePoll: true })).toMatchObject({
      ready: false,
      reasons: ['active-poll', 'prompt-required', 'audience-required', 'mcq-options'],
    });
    expect(LivePolling.validateLivePollComposer({ type: 'mcq', prompt: 'Choose', options: 'A\na\nB', audienceCount: 4 })).toMatchObject({
      ready: true,
      options: ['A', 'B'],
      audienceCount: 4,
    });
  });

  it('includes safe ending, recent reuse, and mobile connection-aware student controls', () => {
    expect(pollingSource).toContain("setPendingEndAction('poll')");
    expect(pollingSource).toContain("role: 'alertdialog'");
    expect(pollingSource).toContain("tr('Recent polls')");
    expect(pollingSource).toContain("submissionTransportReady = connectionState === 'connected' || connectionState === 'failed'");
    expect(pollingSource).toContain("maxHeight: 'calc(100dvh - 2rem)'");
    expect(pollingSource).toContain("tr('Reconnecting - your draft stays here')");
  });
});

describe('Word Cloud moderation and anonymous reveal', () => {
  const poll = { id: 'wc-1', type: 'wordcloud', prompt: 'One word?' };
  const responses = [
    { uid: 'u1', codename: 'Blue Fox', response: 'Curiosity' },
    { uid: 'u2', codename: 'Quiet Star', response: 'curiosity' },
    { uid: 'u3', codename: 'Daring Sloth', response: 'Private held term' },
    { uid: 'u4', codename: 'Bright Owl', response: 'Hidden term' },
  ];

  it('shares approved aggregate labels and counts only', () => {
    const summary = LivePolling.buildPollResultsSummary(poll, responses, 4, {
      wordCloudModeration: {
        curiosity: 'approved',
        'hidden term': 'hidden',
      },
    });

    expect(summary).toMatchObject({
      wordCloud: true,
      totalResponses: 4,
      approvedResponseCount: 2,
      pendingResponseCount: 1,
      hiddenResponseCount: 1,
      items: [
        { value: 'curiosity', label: 'Curiosity', count: 2, percent: 50 },
      ],
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('Private held term');
    expect(serialized).not.toContain('Hidden term');
    expect(serialized).not.toContain('Blue Fox');
    expect(serialized).not.toContain('u1');
  });

  it('reveals nothing until at least one term is explicitly approved', () => {
    const summary = LivePolling.buildPollResultsSummary(poll, responses, 4, {
      wordCloudModeration: {},
    });
    expect(summary.items).toEqual([]);
    expect(summary.approvedResponseCount).toBe(0);
    expect(summary.pendingResponseCount).toBe(4);
  });
});

describe('Word Cloud reuses the existing live-poll lifecycle', () => {
  it('is a HostPanel poll type with bounded guest input and local moderation', () => {
    expect(pollingSource).toContain("['rating', 'mcq', 'freetext', 'wordcloud']");
    expect(pollingSource).toContain('maxLength: WORD_CLOUD_MAX_LENGTH');
    expect(pollingSource).toContain('? !!normalizeWordCloudTerm(responseValue)');
    expect(pollingSource).toContain("value: 'pending'");
    expect(pollingSource).toContain("value: 'approved'");
    expect(pollingSource).toContain("value: 'hidden'");
    expect(pollingSource).toContain('Reveal approved word cloud');
    expect(pollingSource).toContain("{ withdrawn: true }");
    expect(pollingSource).toContain("tr('Revise term')");
    expect(pollingSource).toContain("tr('Withdraw term')");
    expect(pollingSource).toContain("maxWidth: 1180");
    expect(pollingSource).toContain("tr('Needs attention')");
    expect(pollingSource).toContain("'aria-pressed': selected");
    expect(pollingSource).toContain("tr('Find a student, activity, or group')");
    expect(pollingSource).toContain("tr('Needs attention first')");
    expect(pollingSource).toContain("tr('Find a submitted term')");
    expect(pollingSource).toContain("tr('Approve visible held')");
    expect(pollingSource).toContain("tr('Hide visible held')");
    expect(pollingSource).toContain("'aria-label': tr('Scrollable live student activity table')");
    expect(pollingSource).toContain("tr('Teacher check-in')");
    expect(pollingSource).toContain("tr('Private teacher check-in')");
    expect(pollingSource).toContain('sendTeacherCheckIn(row)');
    expect(pollingSource).toContain("answerTeacherCheckIn('help')");
    expect(pollingSource).toContain("tr('Help requested')");
    expect(pollingSource).toContain("tr('Request help')");
    expect(pollingSource).toContain("tr('Cancel help request')");
    expect(pollingSource).toContain("tr('Teacher action queue')");
    expect(pollingSource).toContain("tr('Session wrap-up')");
    expect(pollingSource).toContain("tr('Relaunch for incomplete')");
    expect(pollingSource).toContain("tr('Pause and review')");
    expect(pollingSource).toContain("tr('Suggest similar approved terms')");
    expect(pollingSource).toContain("tr('Show 50 more students')");
    expect(pollingSource).toContain("tr('Teacher is reviewing - submissions paused')");
    expect(pollingSource).toContain("tr('Continue activity')");
    expect(pollingSource).toContain("tr('Your draft is saved only in this browser session.')");
    expect(pollingSource).toContain('window.sessionStorage');
    expect(pollingSource).toContain('onSendToStudent(item.uid, followUpResourceId)');
    expect(shellSource).toContain('activitySnapshots: liveActivitySnapshots');
    expect(shellSource).toContain('onSendToStudents: (uids, resourceId) => handleSetStudentsResource(uids, resourceId)');
    expect(shellSource).toContain("transportKind: (mbLive || _alloMbBridgeActive()) ? 'mailbox' : 'firebase'");
    expect(shellSource).toContain("width:'min(1180px, calc(100vw - 2rem))'");
    expect(shellSource).toContain('aria-modal="true"');
    expect(shellSource).toContain('useFocusTrap(liveDockPanelRef, showLiveDock');
    expect(shellSource).toContain('if (event.target === event.currentTarget) setShowLiveDock(false)');
  });

  it('does not apply response-routing rules to free-text or Word Cloud polls', () => {
    expect(pollingSource).toContain(
      "routingRules: (pollType === 'rating' || pollType === 'mcq') ? validRules : []",
    );
  });

  it('adds a Live Session Center preset that opens the existing polling panel', () => {
    expect(shellSource).toContain("type: 'wordcloud'");
    expect(shellSource).toContain("t('live_dock.word_cloud') || 'Word Cloud'");
    expect(shellSource).toContain('setShowLivePollingPanel(true); setShowLiveDock(false);');
    expect(shellSource).toContain('initialPoll: livePollPreset');
  });
});
