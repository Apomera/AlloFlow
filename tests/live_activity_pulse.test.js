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
      counts: { connected: 2, feedbackSent: 1, showcased: 4, votesCast: 7, arbitrary: 99 },
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
      counts: { invited: 2, working: 1, submitted: 1, revised: 1, connected: 2, feedbackSent: 1, showcased: 4, votesCast: 7 },
    });
    expect(JSON.stringify(safe)).not.toContain('private');
    expect(JSON.stringify(safe)).not.toContain('Brave Otter');
    expect(safe.counts).not.toHaveProperty('arbitrary');
    expect(safe.participantStatus).not.toHaveProperty('outsider');
  });

  it('accepts Q&A aggregate snapshots while stripping raw question fields', () => {
    const safe = api.sanitizeLiveActivitySnapshot({
      activityId: 'session-qa-ROOM',
      family: 'polling',
      kind: 'session_qa',
      phase: 'paused',
      audienceUids: ['u1', 'u2'],
      participantStatus: { u1: 'submitted', u2: 'submitted' },
      counts: { approved: 2, hidden: 1, revealed: 1, votesCast: 4 },
      question: 'private question',
      codename: 'Private Codename',
      voterUids: ['private-voter'],
      updatedAt: 500,
    });

    expect(safe).toMatchObject({
      kind: 'session_qa',
      phase: 'paused',
      counts: { invited: 2, submitted: 2, approved: 2, hidden: 1, revealed: 1, votesCast: 4 },
    });
    expect(api.liveActivityKindLabel('session_qa')).toBe('Live Q&A');
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain('private question');
    expect(serialized).not.toContain('Private Codename');
    expect(serialized).not.toContain('private-voter');
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

  it('derives quiz status from the existing merged response view without leaking answers', () => {
    const snapshot = api.buildLiveQuizActivitySnapshot({
      sessionCode: 'AB123',
      now: 5000,
      roster: { u1: {}, u2: {}, u3: {}, u4: {} },
      quizState: {
        isActive: true,
        activityId: 'quiz-attempt-1',
        startedAt: 1000,
        phase: 'answering',
        currentQuestionIndex: 1,
        questionCount: 2,
        allResponses: {
          u1: { 0: { answer: 'private old answer' }, 1: { answer: 'private current answer' } },
          u2: { 0: { answer: 'private work' } },
        },
        responses: { u3: 2 },
      },
    });

    expect(snapshot).toMatchObject({
      activityId: 'quiz-attempt-1',
      family: 'quiz',
      kind: 'quiz',
      phase: 'collecting',
      participantStatus: {
        u1: 'submitted',
        u2: 'working',
        u3: 'submitted',
        u4: 'waiting',
      },
      counts: { invited: 4, working: 1, submitted: 2 },
      startedAt: 1000,
      durationMs: 4000,
    });
    expect(JSON.stringify(snapshot)).not.toContain('private');
    expect(JSON.stringify(snapshot)).not.toContain('answer');
  });

  it('counts only current fixed-shape receipts and never exposes answer content', () => {
    const snapshot = api.buildLiveQuizActivitySnapshot({
      sessionCode: 'AB123',
      now: 5000,
      roster: { u1: {}, u2: {}, u3: {}, u4: {}, u5: {} },
      quizState: {
        isActive: true,
        activityId: 'quiz-attempt-receipts',
        startedAt: 1000,
        phase: 'answering',
        currentQuestionIndex: 1,
        questionCount: 2,
        responseReceipts: {
          u1: { activityId: 'quiz-attempt-receipts', questionIndex: 1, submittedAt: 4000, flow: 'presentation' },
          u2: { activityId: 'quiz-attempt-receipts', questionIndex: 0, submittedAt: 4000, flow: 'presentation' },
          u3: { activityId: 'old-attempt', questionIndex: 1, submittedAt: 4000, flow: 'presentation' },
          u4: { activityId: 'quiz-attempt-receipts', questionIndex: 2, submittedAt: 4000, flow: 'assessment' },
          u5: { activityId: 'quiz-attempt-receipts', questionIndex: 1, submittedAt: 4000, flow: 'presentation', answer: 'private answer' },
        },
      },
    });

    expect(snapshot.participantStatus).toEqual({
      u1: 'submitted',
      u2: 'waiting',
      u3: 'waiting',
      u4: 'submitted',
      u5: 'waiting',
    });
    expect(snapshot.counts.submitted).toBe(2);
    expect(JSON.stringify(snapshot)).not.toContain('private answer');
    expect(JSON.stringify(snapshot)).not.toContain('responseReceipts');
  });

  it('does not create a phantom quiz for the canonical inactive placeholder', () => {
    expect(api.buildLiveQuizActivitySnapshot({
      sessionCode: 'AB123',
      roster: { u1: {} },
      quizState: { isActive: false, phase: 'idle', responses: {} },
      now: 5000,
    })).toBeNull();
  });

  it('closes a launched quiz and recognizes assessment completion markers', () => {
    const snapshot = api.buildLiveQuizActivitySnapshot({
      sessionCode: 'AB123',
      now: 9000,
      roster: { u1: {}, u2: {} },
      quizState: {
        isActive: false,
        activityId: 'quiz-attempt-2',
        startedAt: 1000,
        endedAt: 8500,
        phase: 'closed',
        questionCount: 2,
        allResponses: {
          u1: { 2: { itemType: 'assessment-complete', answer: { attemptId: 'private' } } },
          u2: { 0: { answer: 'partial' } },
        },
      },
    });

    expect(snapshot.phase).toBe('closed');
    expect(snapshot.endedAt).toBe(8500);
    expect(snapshot.participantStatus).toEqual({ u1: 'submitted', u2: 'working' });
  });
});

describe('attention queue and activity timeline helpers', () => {
  it('ranks existing signals, presence, activity, and delivery metadata without copying response content', () => {
    const queue = api.buildLiveAttentionQueue({
      now: 600000,
      signalFreshMs: 600000,
      currentResourceId: 'class-step',
      sessionMode: 'sync',
      groups: { g1: { resourceId: 'group-step', resourceAt: 500000 } },
      roster: {
        u1: { name: 'Private Name', signal: 'stuck', signalAt: 590000, lastSeen: 595000 },
        u2: { name: 'Quiet Name', lastSeen: 300000 },
        u3: { name: 'Group Name', groupId: 'g1', lastSeen: 595000 },
        u4: { name: 'Ready Name', signal: 'ready', signalAt: 590000, lastSeen: 595000, viewingResourceId: 'class-step' },
      },
      activitySnapshots: [{
        activityId: 'private-activity-id',
        family: 'polling',
        kind: 'free_text',
        phase: 'collecting',
        audienceUids: ['u1', 'u2', 'u3', 'u4'],
        participantStatus: { u1: 'waiting', u2: 'submitted', u3: 'waiting', u4: 'submitted' },
        prompt: 'private prompt',
        response: 'private answer',
        startedAt: 500000,
        updatedAt: 590000,
      }],
    });

    expect(queue.map(item => item.uid)).toEqual(['u1', 'u3', 'u2']);
    expect(queue[0].reasons).toContain('signal_stuck');
    expect(queue.find(item => item.uid === 'u2').reasons).toContain('presence_disconnected');
    expect(queue.find(item => item.uid === 'u3').reasons).toEqual(expect.arrayContaining(['activity_waiting', 'resource_unopened']));
    const serialized = JSON.stringify(queue);
    expect(serialized).not.toContain('Private Name');
    expect(serialized).not.toContain('private prompt');
    expect(serialized).not.toContain('private answer');
  });

  it('clusters only shared instructional signals without copying names or response content', () => {
    const cohorts = api.buildLiveAttentionCohorts([{
      uid: 'u2',
      score: 76,
      reasons: ['activity_waiting', 'presence_quiet'],
      prompt: 'raw private prompt',
    }, {
      uid: 'u1',
      score: 120,
      reasons: ['signal_stuck'],
      response: 'raw private answer',
    }, {
      uid: 'u3',
      score: 94,
      reasons: ['presence_disconnected'],
    }, {
      uid: 'u4',
      score: 68,
      reasons: ['activity_working_long'],
    }, {
      uid: 'u4',
      score: 68,
      reasons: ['activity_working_long'],
    }], {
      u1: { name: 'Private One', groupId: 'g1' },
      u2: { name: 'Private Two', groupId: 'g1' },
      u3: { name: 'Private Three', groupId: 'g1' },
      u4: { name: 'Private Four', groupId: 'g2' },
    }, {
      g1: { name: 'Explorers' },
      g2: { name: 'Builders' },
    });

    expect(cohorts).toEqual([{
      groupId: 'g1',
      uids: ['u2', 'u1'],
      count: 2,
      memberCount: 3,
      allMembersFlagged: false,
      topReasonCodes: ['activity_waiting', 'signal_stuck'],
      score: 196,
    }]);
    const serialized = JSON.stringify(cohorts);
    expect(serialized).not.toContain('Private One');
    expect(serialized).not.toContain('raw private prompt');
    expect(serialized).not.toContain('raw private answer');

    const moduleSource = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
    const helperStart = moduleSource.indexOf('function buildLiveAttentionCohorts');
    const helperEnd = moduleSource.indexOf('function liveAttentionReasonLabel', helperStart);
    const helperSource = moduleSource.slice(helperStart, helperEnd);
    expect(helperSource).not.toContain('updateDoc');
    expect(helperSource).not.toContain('localStorage');
    expect(helperSource).not.toContain('recordLiveActivitySnapshot');
  });

  it('does not turn normal class transitions or acknowledged one-time sends into delivery alerts', () => {
    const queue = api.buildLiveAttentionQueue({
      now: 600000,
      currentResourceId: 'new-class-step',
      sessionMode: 'sync',
      groups: { g1: { resourceId: 'group-step', resourceAt: 500000 } },
      roster: {
        classStudent: {
          lastSeen: 599000,
          viewingResourceId: 'previous-class-step',
          viewingAt: 300000,
        },
        groupStudent: {
          groupId: 'g1',
          lastSeen: 599000,
          viewingResourceId: 'student-choice-after-group-step',
          viewingAt: 500001,
        },
      },
      activitySnapshots: [],
    });

    expect(queue).toEqual([]);
  });

  it('builds a newest-first timeline with counts only and no uid map', () => {
    const timeline = api.buildLiveActivityTimeline([{
      activityId: 'older',
      family: 'polling',
      kind: 'word_cloud',
      phase: 'closed',
      audienceUids: ['secretUid'],
      participantStatus: { secretUid: 'submitted' },
      updatedAt: 100,
    }, {
      activityId: 'newer',
      family: 'quiz',
      kind: 'quiz',
      phase: 'collecting',
      audienceUids: ['secretUid'],
      participantStatus: { secretUid: 'working' },
      updatedAt: 200,
    }]);

    expect(timeline.map(item => item.activityId)).toEqual(['newer', 'older']);
    expect(timeline[0].counts).toMatchObject({ invited: 1, working: 1, submitted: 0 });
    expect(JSON.stringify(timeline)).not.toContain('secretUid');
    expect(timeline[0]).not.toHaveProperty('participantStatus');
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
        phase: 'collecting',
        audienceUids: ['u1', 'u2'],
        participantStatus: { u1: 'waiting', u2: 'submitted' },
        startedAt: 1000,
        updatedAt: 10,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToGroup: vi.fn(),
      onSendToStudent,
      now: 100000,
      t: () => undefined,
    });
    const nodes = walk(tree);
    const pulse = nodes.find(node => node.props && node.props['aria-label'] === 'Activity pulse');
    expect(nodeText(pulse)).toContain('Feedback response');
    expect(nodeText(pulse)).toContain('1 of 2 submitted');
    const send = nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Send Support resource to Ana');
    send.props.onClick();
    expect(onSendToStudent).toHaveBeenCalledWith('u1', { id: 'support', type: 'simplified', title: 'Support resource' });
  });

  it('guards a pending single-student send and announces the result', async () => {
    let resolveSend;
    const onSendToStudent = vi.fn(() => new Promise(resolve => {
      resolveSend = resolve;
    }));
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: { u1: { name: 'Ana', signal: 'stuck', signalAt: 99000, lastSeen: 99000 } },
      activitySnapshots: [],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent,
      now: 100000,
      t: () => undefined,
    };

    let tree = api.LiveLessonRunPanel(props);
    let nodes = walk(tree);
    const send = nodes.find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to Ana');
    const pending = send.props.onClick();

    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    nodes = walk(tree);
    const guarded = nodes.find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to Ana');
    expect(guarded.props.disabled).toBe(true);
    expect(nodeText(guarded)).toContain('Sending...');
    await guarded.props.onClick();
    expect(onSendToStudent).toHaveBeenCalledTimes(1);

    resolveSend({ sent: 1, failed: 0 });
    await pending;
    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    const status = walk(tree).find(node => node.props
      && node.props.role === 'status'
      && nodeText(node).includes('Sent Support resource to Ana.'));
    expect(status).toBeTruthy();
  });

  it('announces a failed single-student send instead of reporting success', async () => {
    const onSendToStudent = vi.fn().mockResolvedValue({ sent: 0, failed: 1 });
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: { u1: { name: 'Ana', signal: 'stuck', signalAt: 99000, lastSeen: 99000 } },
      activitySnapshots: [],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent,
      now: 100000,
      t: () => undefined,
    };

    let tree = api.LiveLessonRunPanel(props);
    const send = walk(tree).find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to Ana');
    await send.props.onClick();

    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    const status = walk(tree).find(node => node.props
      && node.props.role === 'status'
      && nodeText(node).includes('Could not send Support resource to Ana.'));
    expect(status).toBeTruthy();
  });

  it('releases only acknowledged individual supports through the bounded callback', async () => {
    const onReleaseStudentResources = vi.fn().mockResolvedValue({ released: 1, failed: 0 });
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {
        u1: {
          name: 'Ana',
          resourceId: 'support',
          resourceAt: 100,
          viewingResourceId: 'support',
          viewingAt: 101,
        },
        u2: {
          name: 'Bo',
          resourceId: 'support',
          resourceAt: 200,
          viewingResourceId: 'other',
          viewingAt: 300,
        },
      },
      activitySnapshots: [],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onReleaseStudentResources,
      now: 100000,
      t: () => undefined,
    };

    let tree = api.LiveLessonRunPanel(props);
    const release = walk(tree).find(node => node.type === 'button'
      && node.props['aria-label'] === 'Release 1 opened individual support override');
    expect(release).toBeTruthy();
    await release.props.onClick();
    expect(onReleaseStudentResources).toHaveBeenCalledWith(['u1']);

    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    const status = walk(tree).find(node => node.props
      && node.props.role === 'status'
      && nodeText(node).includes('Released 1 opened individual support.'));
    expect(status).toBeTruthy();
  });

  it('does not reopen a revealed snapshot through the current activity owner', () => {
    const tree = api.LiveLessonRunPanel({
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {},
      activitySnapshots: [{
        activityId: 'wordcloud-complete',
        family: 'polling',
        kind: 'word_cloud',
        phase: 'revealed',
        audienceUids: ['u1'],
        participantStatus: { u1: 'submitted' },
        startedAt: 1000,
        updatedAt: 2000,
        endedAt: 2000,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onOpenActivity: vi.fn(),
      now: 3000,
      t: () => undefined,
    });
    const openButtons = walk(tree).filter(node => node.type === 'button'
      && node.props['aria-label'] === 'Open Word cloud dashboard');
    expect(openButtons).toHaveLength(0);
  });
});

describe('attention queue multi-student scaffold action', () => {
  it('reuses the selected Lesson Path step and one batch callback', async () => {
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 1, failed: 0 });
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: { u1: { name: 'Ana', signal: 'stuck', signalAt: 99000, lastSeen: 99000 } },
      activitySnapshots: [],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToGroup: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents,
      now: 100000,
      t: () => undefined,
    };
    let tree = api.LiveLessonRunPanel(props);
    let nodes = walk(tree);
    const checkbox = nodes.find(node => node.type === 'input' && node.props['aria-label'] === 'Select Ana for Support resource');
    checkbox.props.onChange();
    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    nodes = walk(tree);
    const send = nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Send Support resource to 1 selected student');
    await send.props.onClick();
    expect(onSendToStudents).toHaveBeenCalledWith(['u1'], { id: 'support', type: 'simplified', title: 'Support resource' });
  });

  it('selects a same-group instructional pattern and sends only the flagged students', async () => {
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 2, failed: 0 });
    const onSendToGroup = vi.fn();
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {
        u1: { name: 'Ana', groupId: 'g1', signal: 'stuck', signalAt: 99000, lastSeen: 99000 },
        u2: { name: 'Bo', groupId: 'g1', signal: 'slow', signalAt: 99000, lastSeen: 99000 },
        u3: { name: 'Cy', groupId: 'g1', lastSeen: 99000 },
      },
      groups: { g1: { name: 'Explorers' } },
      activitySnapshots: [],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToGroup,
      onSendToStudent: vi.fn(),
      onSendToStudents,
      now: 100000,
      t: () => undefined,
    };

    let tree = api.LiveLessonRunPanel(props);
    let nodes = walk(tree);
    const cohort = nodes.find(node => node.type === 'button'
      && node.props['aria-label'] === 'Select 2 flagged students in Explorers for Support resource');
    expect(cohort).toBeTruthy();
    cohort.props.onClick();

    hookCursor = 0;
    tree = api.LiveLessonRunPanel(props);
    nodes = walk(tree);
    const send = nodes.find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 2 selected students');
    await send.props.onClick();

    expect(onSendToStudents).toHaveBeenCalledWith(['u1', 'u2'], { id: 'support', type: 'simplified', title: 'Support resource' });
    expect(onSendToGroup).not.toHaveBeenCalled();
  });
});

describe('existing activity owners emit the shared contract', () => {
  it('wires both existing host panels to the one shell callback', () => {
    expect(appSource).toContain('onActivitySnapshot: recordLiveActivitySnapshot');
    expect(appSource).toContain('buildLiveQuizActivitySnapshot');
    expect(appSource).toContain("snapshot.family === 'quiz'");
    expect(pollingSource).toContain("family: 'polling'");
    expect(pictionarySource).toContain("family: 'pictionary'");
    expect(pollingSource).not.toContain('onActivitySnapshot({ prompt:');
    expect(pictionarySource).not.toContain('onActivitySnapshot({ concept:');
  });

  it('starts each live quiz as a fresh identified attempt and closes it explicitly', () => {
    expect(appSource).toContain('"quizState.allResponses": {}');
    expect(appSource).toContain('"quizState.currentQuestionIndex": 0');
    expect(appSource).toContain('"quizState.activityId": `quiz:${activeSessionCode}:${startedAt.toString(36)}`');
    const teacherSource = fs.readFileSync(path.join(ROOT, 'teacher_source.jsx'), 'utf8');
    expect(teacherSource).toContain('"quizState.phase": "closed"');
    expect(teacherSource).toContain('"quizState.endedAt": Date.now()');
    expect(appSource).toContain('quizClosedActivitySnapshotRef.current === snapshot.activityId');
    const endHandler = teacherSource.slice(
      teacherSource.indexOf('const handleEndQuiz = async () =>'),
      teacherSource.indexOf('const handleModeChange', teacherSource.indexOf('const handleEndQuiz = async () =>'))
    );
    expect(endHandler.indexOf('await updateDoc')).toBeLessThan(endHandler.indexOf("addToast(t('quiz.session_ended_success')"));
    expect(endHandler).toContain('Could not end the live quiz. Please try again.');
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
        counts: { feedbackSent: 1, showcased: 3, votesCast: 5 },
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
      showcased: 3,
      votesCast: 5,
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
