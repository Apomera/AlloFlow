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
      { uid: 'u1', name: 'Ari', groupId: 'g1', connected: true, activity: 'Evidence Sort', status: 'working', progressDetail: '' },
      { uid: 'u2', name: 'Bo', groupId: '', connected: true, activity: 'Word Sounds', status: 'complete', progressDetail: '8/8' },
      { uid: 'u3', name: 'Cy', groupId: '', connected: true, activity: 'Map Lab', status: 'failed', progressDetail: '' },
      { uid: 'u4', name: 'Dee', groupId: '', connected: false, activity: 'Assigned resource', status: 'waiting', progressDetail: '' },
    ];

    expect(LivePolling.summarizeLiveStudentActivityRows(rows)).toEqual({
      all: 4,
      'in-progress': 1,
      finished: 1,
      attention: 2,
      offline: 1,
    });
    expect(LivePolling.filterLiveStudentActivityRows(rows, { filter: 'finished' }).map((row) => row.uid)).toEqual(['u2']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { filter: 'attention' }).map((row) => row.uid)).toEqual(['u3', 'u4']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { query: 'blue pod', groups: { g1: { name: 'Blue Pod' } } }).map((row) => row.uid)).toEqual(['u1']);
    expect(LivePolling.filterLiveStudentActivityRows(rows, { sort: 'attention' }).map((row) => row.uid)).toEqual(['u4', 'u3', 'u1', 'u2']);
    expect(LivePolling.LIVE_STUDENT_ACTIVITY_SORTS).toEqual(['attention', 'name']);
    expect(JSON.stringify(LivePolling.filterLiveStudentActivityRows(rows, { query: 'map lab' }))).not.toContain('response');
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
    expect(shellSource).toContain('activitySnapshots: liveActivitySnapshots');
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
