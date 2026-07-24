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
