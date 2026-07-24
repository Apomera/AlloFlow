import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const pollingSource = fs.readFileSync(path.join(ROOT, 'live_polling_module.js'), 'utf8');
const pictionarySource = fs.readFileSync(path.join(ROOT, 'concept_pictionary_source.jsx'), 'utf8');
let api;
let hookState;
let hookCursor;

function resetHooks() {
  hookState = [];
  hookCursor = 0;
}

function walk(node, result = []) {
  if (Array.isArray(node)) {
    node.forEach(child => walk(child, result));
    return result;
  }
  if (!node || typeof node !== 'object') return result;
  result.push(node);
  if (node.props && node.props.children !== undefined) walk(node.props.children, result);
  return result;
}

function nodeText(node) {
  const parts = [];
  const collect = value => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') collect(value.props && value.props.children);
    else if (value !== null && value !== undefined && value !== false) parts.push(String(value));
  };
  collect(node);
  return parts.join('');
}

beforeAll(() => {
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useMemo(factory) {
      return factory();
    },
    useState(initialValue) {
      const index = hookCursor++;
      if (!(index in hookState)) {
        hookState[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      return [
        hookState[index],
        next => {
          hookState[index] = typeof next === 'function' ? next(hookState[index]) : next;
        },
      ];
    },
  };
  const windowStub = { React };
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8'))(windowStub);
  api = windowStub.AlloModules.LiveLessonRun;
});

beforeEach(() => {
  resetHooks();
});

describe('bounded live activity snapshot contract', () => {
  it('rebuilds snapshots from an allowlist and strips student content and identity labels', () => {
    const safe = api.sanitizeLiveActivitySnapshot({
      activityId: 'poll-1',
      family: 'polling',
      kind: 'feedback_response',
      phase: 'collecting',
      audienceUids: ['u1', 'u2', 'u1'],
      participantStatus: { u1: 'drafting', u2: 'revised', outsider: 'submitted' },
      counts: { connected: 2, feedbackSent: 1, arbitrary: 99 },
      startedAt: 10,
      prompt: 'private prompt',
      response: 'private response',
      feedback: 'private feedback',
      codename: 'Brave Otter',
      strokes: [{ x: 1, y: 2 }],
    });

    expect(safe).toMatchObject({
      schemaVersion: 1,
      activityId: 'poll-1',
      family: 'polling',
      kind: 'feedback_response',
      phase: 'collecting',
      audienceUids: ['u1', 'u2'],
      participantStatus: { u1: 'working', u2: 'revised' },
      counts: { invited: 2, working: 1, submitted: 1, revised: 1, connected: 2, feedbackSent: 1 },
    });
    expect(JSON.stringify(safe)).not.toContain('private');
    expect(JSON.stringify(safe)).not.toContain('Brave Otter');
    expect(safe.counts).not.toHaveProperty('arbitrary');
    expect(safe.participantStatus).not.toHaveProperty('outsider');
  });

  it('rejects unknown activity families, kinds, and phases', () => {
    expect(api.sanitizeLiveActivitySnapshot({ activityId: 'x', family: 'chat', kind: 'quiz', phase: 'collecting' })).toBeNull();
    expect(api.sanitizeLiveActivitySnapshot({ activityId: 'x', family: 'quiz', kind: 'chat', phase: 'collecting' })).toBeNull();
    expect(api.sanitizeLiveActivitySnapshot({ activityId: 'x', family: 'quiz', kind: 'quiz', phase: 'streaming' })).toBeNull();
  });

  it('upserts one record per activity and prioritizes an active pulse over a newer completed one', () => {
    let snapshots = api.upsertLiveActivitySnapshot([], {
      activityId: 'active',
      family: 'polling',
      kind: 'rating',
      phase: 'collecting',
      audienceUids: ['u1'],
      participantStatus: { u1: 'waiting' },
      updatedAt: 10,
    });
    snapshots = api.upsertLiveActivitySnapshot(snapshots, {
      activityId: 'done',
      family: 'pictionary',
      kind: 'pictionary',
      phase: 'revealed',
      audienceUids: ['u1'],
      participantStatus: { u1: 'submitted' },
      updatedAt: 20,
    });
    snapshots = api.upsertLiveActivitySnapshot(snapshots, {
      activityId: 'active',
      family: 'polling',
      kind: 'rating',
      phase: 'review',
      audienceUids: ['u1'],
      participantStatus: { u1: 'submitted' },
      updatedAt: 30,
    });

    expect(snapshots).toHaveLength(2);
    expect(api.selectLiveActivityPulse(snapshots).activityId).toBe('active');
    expect(api.selectLiveActivityPulse(snapshots).phase).toBe('review');
  });
});

describe('Activity Pulse presentation and resource action', () => {
  it('shows participation status and reuses the selected-step individual send callback', () => {
    const onSendToStudent = vi.fn();
    const tree = api.LiveLessonRunPanel({
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {
        u1: { name: 'Ana', groupId: 'g1' },
        u2: { name: 'Bo', groupId: 'g1' },
      },
      groups: { g1: { name: 'Explorers' } },
      activitySnapshots: [{
        activityId: 'feedback-1',
        family: 'polling',
        kind: 'feedback_response',
        phase: 'review',
        audienceUids: ['u1', 'u2'],
        participantStatus: { u1: 'working', u2: 'submitted' },
        updatedAt: 10,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToGroup: vi.fn(),
      onSendToStudent,
      t: () => undefined,
    });
    const nodes = walk(tree);
    const pulse = nodes.find(node => node.props && node.props['aria-label'] === 'Activity pulse');
    expect(nodeText(pulse)).toContain('Feedback response');
    expect(nodeText(pulse)).toContain('1 of 2 submitted');
    const send = nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Send selected step to Ana');
    send.props.onClick();
    expect(onSendToStudent).toHaveBeenCalledWith('u1', { id: 'support', type: 'simplified', title: 'Support resource' });
  });
});

describe('existing activity owners emit the shared contract', () => {
  it('wires both existing host panels to the one shell callback', () => {
    expect(appSource).toContain('onActivitySnapshot: recordLiveActivitySnapshot');
    expect(pollingSource).toContain("family: 'polling'");
    expect(pictionarySource).toContain("family: 'pictionary'");
    expect(pollingSource).not.toContain('onActivitySnapshot({ prompt:');
    expect(pictionarySource).not.toContain('onActivitySnapshot({ concept:');
  });
});

describe('device-local roster history refinement', () => {
  const helperStart = appSource.indexOf('const normalizeRosterSessionCodename');
  const helperEnd = appSource.indexOf('const generateSessionCode', helperStart);
  // eslint-disable-next-line no-new-func
  const helpers = new Function(
    appSource.slice(helperStart, helperEnd)
      + '\nreturn { buildRosterSessionSummary, summarizeRosterLiveActivities };'
  )();

  it('persists aggregate activity evidence and codename-matched counts without UIDs or raw work', () => {
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'AB123',
      mode: 'firebase',
      endedAt: '2026-07-23T15:00:00.000Z',
      rosterKey: { students: { 'Brave Otter': 'g1' } },
      sessionData: {
        createdAt: '2026-07-23T14:30:00.000Z',
        roster: { secretUid: { name: 'brave-otter', groupId: 'g1' } },
      },
      activitySnapshots: [{
        activityId: 'private-id',
        family: 'polling',
        kind: 'feedback_response',
        phase: 'review',
        audienceUids: ['secretUid'],
        participantStatus: { secretUid: 'revised' },
        counts: { feedbackSent: 1 },
        response: 'raw student writing',
        feedback: 'raw teacher feedback',
        prompt: 'raw prompt',
        startedAt: 10,
      }],
    });

    expect(summary.schemaVersion).toBe(2);
    expect(summary.liveActivities).toEqual([expect.objectContaining({
      kind: 'feedback_response',
      invited: 1,
      submitted: 1,
      revised: 1,
      feedbackSent: 1,
    })]);
    expect(summary.participants['Brave Otter']).toMatchObject({
      liveActivityCount: 1,
      liveSubmissionCount: 1,
      liveRevisionCount: 1,
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('secretUid');
    expect(serialized).not.toContain('private-id');
    expect(serialized).not.toContain('raw student writing');
    expect(serialized).not.toContain('raw teacher feedback');
    expect(serialized).not.toContain('raw prompt');
  });
});
