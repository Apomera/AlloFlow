import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('live_polling_module.js');
  M = window.AlloModules.LivePolling;
});

function response(uid, value, timestamp, codename = 'PRIVATE CODENAME') {
  return { uid, codename, response: value, timestamp };
}

function snapshot(id, type, responses, audienceCount, startedAt, endedAt, extra = {}) {
  return {
    poll: Object.assign({ id, type, prompt: 'PRIVATE PROMPT MUST NOT TRANSFER', options: type === 'mcq' ? ['Agree', 'Disagree'] : null, startedAt }, extra),
    responses,
    audienceCount,
    audienceUids: Array.from({ length: audienceCount }, (_, index) => 'uid-' + index),
    startedAt,
    endedAt,
  };
}

describe('Live Polling -> AlloSheet handoff', () => {
  it('exports bounded aggregate tables without prompts, identities, or response text', () => {
    const responses = Array.from({ length: 6 }, (_, index) => response('uid-' + index, index % 2 === 0 ? 'Agree' : 'Disagree', '2026-08-01T10:0' + index + ':00.000Z'));
    const artifact = M.buildLivePollingAlloSheetEnvelope({
      sessionCode: 'PRIVATE SESSION CODE',
      polls: [snapshot('poll-raw', 'mcq', responses, 6, '2026-08-01T10:00:00.000Z', '2026-08-01T10:05:00.000Z')],
    }, { createdAt: '2026-08-01T12:00:00.000Z' });
    expect(artifact.kind).toBe('alloflow.tabular.v1');
    expect(artifact.source.tool).toBe('live-polling');
    expect(artifact.privacy.transferEnablesAI).toBe(false);
    expect(artifact.capabilities).toEqual({ writeBack: false, aiEnabled: false });
    expect(artifact.tables.map((table) => table.id)).toEqual([
      'lp-session-summary', 'lp-item-summary', 'lp-answer-distribution', 'lp-time-summary'
    ]);
    expect(artifact.tables.find((table) => table.id === 'lp-item-summary').rows[0].values.response_count).toBe(6);
    expect(artifact.tables.find((table) => table.id === 'lp-answer-distribution').rows[0].values.answer_label).toBeNull();
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE PROMPT MUST NOT TRANSFER');
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE CODENAME');
    expect(JSON.stringify(artifact)).not.toContain('uid-0');
  });

  it('keeps teacher-authored labels opt-in and preserves small-group suppression', () => {
    const responses = [response('uid-1', 'Agree', '2026-08-01T10:00:00.000Z'), response('uid-2', 'Disagree', '2026-08-01T10:01:00.000Z'), response('uid-3', 'Agree', '2026-08-01T10:02:00.000Z')];
    const artifact = M.buildLivePollingAlloSheetEnvelope({
      polls: [snapshot('small', 'mcq', responses, 4, '2026-08-01T10:00:00.000Z', '2026-08-01T10:05:00.000Z')],
    }, { includeChoiceLabels: true, createdAt: '2026-08-01T12:00:00.000Z' });
    const item = artifact.tables.find((table) => table.id === 'lp-item-summary').rows[0].values;
    const distribution = artifact.tables.find((table) => table.id === 'lp-answer-distribution').rows[0].values;
    expect(item.audience_count).toBeNull();
    expect(item.response_count).toBeNull();
    expect(item.privacy_status).toContain('suppressed');
    expect(distribution.response_count).toBeNull();
    expect(distribution.answer_label).toBe('Agree');
    expect(artifact.provenance.suppression.minimumGroupSize).toBe(5);
  });

  it('suppresses free-text and word-cloud content while retaining safe item counts', () => {
    const artifact = M.buildLivePollingAlloSheetEnvelope({
      polls: [snapshot('text', 'freetext', [response('uid-1', 'PRIVATE STUDENT RESPONSE', '2026-08-01T10:00:00.000Z')], 6, '2026-08-01T10:00:00.000Z', '2026-08-01T10:05:00.000Z')],
    }, { createdAt: '2026-08-01T12:00:00.000Z' });
    const item = artifact.tables.find((table) => table.id === 'lp-item-summary').rows[0].values;
    expect(item.answer_mode).toBe('text_suppressed');
    expect(artifact.tables.find((table) => table.id === 'lp-answer-distribution').rows).toHaveLength(0);
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE STUDENT RESPONSE');
    expect(artifact.provenance.suppression.freeTextResponsesSuppressed).toBe(true);
  });

  it('filters the review window and records that missing work is not inferred', () => {
    const oldPoll = snapshot('old', 'rating', Array.from({ length: 5 }, (_, index) => response('old-' + index, 3, '2026-07-01T10:00:00.000Z')), 5, '2026-07-01T10:00:00.000Z', '2026-07-01T10:05:00.000Z');
    const recentPoll = snapshot('recent', 'rating', Array.from({ length: 5 }, (_, index) => response('new-' + index, 4, '2026-07-31T10:00:00.000Z')), 5, '2026-07-31T10:00:00.000Z', '2026-07-31T10:05:00.000Z');
    const artifact = M.buildLivePollingAlloSheetEnvelope({ polls: [oldPoll, recentPoll] }, { dateRange: '7d', createdAt: '2026-08-01T12:00:00.000Z' });
    const item = artifact.tables.find((table) => table.id === 'lp-item-summary');
    expect(item.sourceRowCount).toBe(1);
    expect(item.rows).toHaveLength(1);
    expect(artifact.provenance.suppression.missingWorkInferred).toBe(false);
  });
});
