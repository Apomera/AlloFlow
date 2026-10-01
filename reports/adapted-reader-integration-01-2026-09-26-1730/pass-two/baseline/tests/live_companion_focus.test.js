import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
let api;
let hookState;
let hookCursor;

function resetHooks() {
  hookState = [];
  hookCursor = 0;
}

function renderPanel(props) {
  hookCursor = 0;
  return api.LiveLessonRunPanel(props);
}

function walk(node, result = []) {
  if (Array.isArray(node)) {
    node.forEach(child => walk(child, result));
    return result;
  }
  if (!node || typeof node !== 'object') return result;
  result.push(node);
  if (node.props && node.props.children !== undefined) {
    walk(node.props.children, result);
  }
  return result;
}

function nodeText(node) {
  const parts = [];
  const collect = value => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      collect(value.props && value.props.children);
    } else if (value !== null && value !== undefined && value !== false) {
      parts.push(String(value));
    }
  };
  collect(node);
  return parts.join('');
}

function enterCompanionMode(tree, props) {
  const toggle = walk(tree).find(node => node.type === 'button' && nodeText(node) === 'Companion');
  expect(toggle).toBeTruthy();
  toggle.props.onClick();
  return renderPanel(props);
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

describe('focused live companion privacy contract', () => {
  it('rebuilds an aggregate-only model and strips raw moderation content', () => {
    const audienceUids = Array.from({ length: 31 }, (_, index) => `uid-${index + 1}`);
    const participantStatus = Object.fromEntries(audienceUids.map(uid => [uid, 'submitted']));
    const model = api.buildLiveCompanionModel({
      activitySnapshots: [{
        activityId: 'qa-1',
        family: 'polling',
        kind: 'session_qa',
        phase: 'review',
        audienceUids,
        participantStatus,
        counts: {
          approved: 8,
          hidden: 3,
          revealed: 2,
          feedbackSent: 4,
          showcased: 5,
          votesCast: 13,
        },
        startedAt: 100,
        updatedAt: 200,
        prompt: 'PRIVATE PROMPT',
        question: 'PRIVATE QUESTION',
        response: 'PRIVATE RESPONSE',
        feedback: 'PRIVATE FEEDBACK',
        codename: 'PRIVATE CODENAME',
        strokes: [{ x: 1, y: 2 }],
        moderationQueue: [{ response: 'PRIVATE QUEUE ITEM' }],
      }],
    });

    expect(Object.keys(model).sort()).toEqual([
      'activity',
      'moderation',
      'schemaVersion',
      'statusCohorts',
    ]);
    expect(Object.keys(model.activity).sort()).toEqual([
      'activityId',
      'family',
      'invited',
      'kind',
      'phase',
      'revised',
      'startedAt',
      'submitted',
      'updatedAt',
      'working',
    ]);
    expect(model.moderation).toEqual({
      approved: 8,
      hidden: 3,
      revealed: 2,
      feedbackSent: 4,
      showcased: 5,
      votesCast: 13,
    });
    expect(model.statusCohorts).toEqual([{
      status: 'submitted',
      label: 'Submitted',
      count: 31, uids: audienceUids,
    }]);

    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain('PRIVATE');
    expect(serialized).not.toContain('prompt');
    expect(serialized).not.toContain('question');
    expect(serialized).not.toContain('response');
    expect(serialized).not.toContain('codename');
    expect(serialized).not.toContain('strokes');
    expect(serialized).not.toContain('moderationQueue');
  });

  it('intersects stale snapshot participants with the current connection set', () => {
    const snapshot = {
      activityId: 'poll-stale-roster',
      family: 'polling',
      kind: 'word_cloud',
      phase: 'review',
      audienceUids: ['u1', 'gone', 'u3'],
      participantStatus: { u1: 'waiting', gone: 'working', u3: 'revised' },
      counts: { approved: 7, hidden: 2, votesCast: 4 },
      startedAt: 10,
      updatedAt: 20,
    };

    const rosterModel = api.buildLiveCompanionModel({
      activitySnapshots: [snapshot],
      roster: { u1: { name: 'Ana' }, u3: { name: 'Cy' } },
    });
    expect(rosterModel.activity).toMatchObject({
      invited: 2,
      working: 0,
      submitted: 1,
      revised: 1,
    });
    expect(rosterModel.statusCohorts).toEqual([
      { status: 'waiting', label: 'Waiting', count: 1, uids: ['u1'] },
      { status: 'revised', label: 'Revised', count: 1, uids: ['u3'] },
    ]);
    expect(rosterModel.moderation).toMatchObject({ approved: 7, hidden: 2, votesCast: 4 });
    expect(JSON.stringify(rosterModel)).not.toContain('gone');

    const explicitModel = api.buildLiveCompanionModel({
      activitySnapshots: [snapshot],
      roster: { u1: {}, gone: {}, u3: {} },
      connectedUids: ['gone'],
    });
    expect(explicitModel.activity).toMatchObject({ invited: 1, working: 1, submitted: 0, revised: 0 });
    expect(explicitModel.statusCohorts).toEqual([
      { status: 'working', label: 'Working', count: 1, uids: ['gone'] },
    ]);
  });
  it('routes response review back to the existing activity owner', () => {
    const onOpenActivity = vi.fn();
    const props = {
      history: [{ id: 'support', type: 'simplified', title: 'Support resource' }],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {
        u1: { name: 'Ana', lastSeen: 199, viewingResourceId: 'support', viewingAt: 199 },
      },
      activitySnapshots: [{
        activityId: 'word-cloud-1',
        family: 'polling',
        kind: 'word_cloud',
        phase: 'review',
        audienceUids: ['u1'],
        participantStatus: { u1: 'submitted' },
        counts: { approved: 1, hidden: 2, revealed: 1 },
        startedAt: 100,
        updatedAt: 200,
        response: 'PRIVATE WORD',
        codename: 'PRIVATE STUDENT',
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents: vi.fn(),
      onOpenActivity,
      now: 200,
      t: () => undefined,
    };

    const tree = enterCompanionMode(renderPanel(props), props);
    const nodes = walk(tree);
    const shell = nodes.find(node => node.props && node.props['data-live-companion-mode'] === 'focused');
    const focus = nodes.find(node => node.props && node.props['data-live-companion-focus'] === 'status-only');
    const openOwner = nodes.find(node => node.type === 'button' && nodeText(node) === 'Open activity dashboard');

    expect(shell).toBeTruthy();
    expect(focus).toBeTruthy();
    expect(nodeText(focus)).toContain('reviewing responses opens the existing activity owner');
    expect(nodeText(shell)).toContain('approved 1');
    expect(nodeText(shell)).toContain('hidden 2');
    expect(nodeText(shell)).not.toContain('PRIVATE WORD');
    expect(nodeText(shell)).not.toContain('PRIVATE STUDENT');
    expect(openOwner).toBeTruthy();

    openOwner.props.onClick();
    expect(onOpenActivity).toHaveBeenCalledTimes(1);
    const routedSnapshot = onOpenActivity.mock.calls[0][0];
    expect(routedSnapshot).toMatchObject({
      activityId: 'word-cloud-1',
      family: 'polling',
      kind: 'word_cloud',
      phase: 'review',
      counts: { approved: 1, hidden: 2, revealed: 1 },
    });
    expect(JSON.stringify(routedSnapshot)).not.toContain('PRIVATE');

    const companionButtons = walk(shell)
      .filter(node => node.type === 'button')
      .map(nodeText);
    expect(companionButtons).not.toContain('Approve');
    expect(companionButtons).not.toContain('Hide');
    expect(companionButtons).not.toContain('Reveal');
  });

  it('sends a full companion cohort through the canonical chunking callback', async () => {
    const audienceUids = Array.from({ length: 32 }, (_, index) => `uid-${String(index + 1).padStart(2, '0')}`);
    const participantStatus = Object.fromEntries(audienceUids.map(uid => [uid, 'waiting']));
    const roster = Object.fromEntries(audienceUids.map((uid, index) => [
      uid,
      {
        name: `Student ${index + 1}`,
        lastSeen: 99_999,
        viewingResourceId: 'support',
        viewingAt: 99_999,
      },
    ]));
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 32, failed: 0 });
    const onSendToStudent = vi.fn();
    const resource = { id: 'support', type: 'simplified', title: 'Support resource' };
    const props = {
      history: [resource],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster,
      activitySnapshots: [{
        activityId: 'quiz-1',
        family: 'quiz',
        kind: 'quiz',
        phase: 'collecting',
        audienceUids,
        participantStatus,
        startedAt: 1,
        updatedAt: 99_999,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent,
      onSendToStudents,
      onOpenActivity: vi.fn(),
      now: 100_000,
      t: () => undefined,
    };

    let tree = enterCompanionMode(renderPanel(props), props);
    let nodes = walk(tree);
    const cohortSection = nodes.find(node => node.props && node.props['data-live-companion-cohorts'] === 'quiz-1');
    const waitingCohort = walk(cohortSection).find(node => node.type === 'button' && nodeText(node) === 'Waiting32');
    expect(waitingCohort).toBeTruthy();
    waitingCohort.props.onClick();

    tree = renderPanel(props);
    nodes = walk(tree);
    const batchSends = nodes.filter(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 32 selected students');
    expect(batchSends).toHaveLength(1);
    const [send] = batchSends;
    await send.props.onClick();

    expect(onSendToStudents).toHaveBeenCalledTimes(1);
    expect(onSendToStudents).toHaveBeenCalledWith(audienceUids, resource);
    expect(onSendToStudent).not.toHaveBeenCalled();
  });


  it('removes a learner from a selected status cohort when that learner submits', async () => {
    const resource = { id: 'support', type: 'simplified', title: 'Support resource' };
    const roster = {
      u1: { name: 'Ana', lastSeen: 100, viewingResourceId: 'support', viewingAt: 100 },
      u2: { name: 'Bo', lastSeen: 100, viewingResourceId: 'support', viewingAt: 100 },
    };
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 1, failed: 0 });
    const makeProps = participantStatus => ({
      history: [resource],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster,
      activitySnapshots: [{
        activityId: 'poll-status-change', family: 'polling', kind: 'word_cloud', phase: 'collecting',
        audienceUids: ['u1', 'u2'], participantStatus, startedAt: 1, updatedAt: 100,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents,
      onOpenActivity: vi.fn(),
      now: 100,
      t: () => undefined,
    });

    let props = makeProps({ u1: 'waiting', u2: 'waiting' });
    let tree = enterCompanionMode(renderPanel(props), props);
    let waiting = walk(tree).find(node => node.type === 'button' && nodeText(node) === 'Waiting2');
    waiting.props.onClick();

    props = makeProps({ u1: 'submitted', u2: 'waiting' });
    tree = renderPanel(props);
    const send = walk(tree).find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 1 selected student');
    expect(send).toBeTruthy();
    await send.props.onClick();
    expect(onSendToStudents).toHaveBeenCalledWith(['u2'], resource);
  });

  it('does not carry a selected cohort into a different live activity', async () => {
    const resource = { id: 'support', type: 'simplified', title: 'Support resource' };
    const roster = {
      u1: { name: 'Ana', lastSeen: 100, viewingResourceId: 'support', viewingAt: 100 },
      u2: { name: 'Bo', lastSeen: 100, viewingResourceId: 'support', viewingAt: 100 },
    };
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 2, failed: 0 });
    const makeProps = activityId => ({
      history: [resource],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster,
      activitySnapshots: [{
        activityId, family: 'polling', kind: 'word_cloud', phase: 'collecting',
        audienceUids: ['u1', 'u2'], participantStatus: { u1: 'waiting', u2: 'waiting' },
        startedAt: 1, updatedAt: 100,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents,
      onOpenActivity: vi.fn(),
      now: 100,
      t: () => undefined,
    });

    let props = makeProps('activity-one');
    let tree = enterCompanionMode(renderPanel(props), props);
    walk(tree).find(node => node.type === 'button' && nodeText(node) === 'Waiting2').props.onClick();

    props = makeProps('activity-two');
    tree = renderPanel(props);
    let nodes = walk(tree);
    const newWaiting = nodes.find(node => node.type === 'button' && nodeText(node) === 'Waiting2');
    expect(newWaiting.props['aria-pressed']).toBe(false);
    expect(nodes.filter(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 0 selected students')
      .every(node => node.props.disabled)).toBe(true);
    expect(onSendToStudents).not.toHaveBeenCalled();

    newWaiting.props.onClick();
    tree = renderPanel(props);
    nodes = walk(tree);
    const send = nodes.find(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 2 selected students');
    expect(send).toBeTruthy();
    await send.props.onClick();
    expect(onSendToStudents).toHaveBeenCalledWith(['u1', 'u2'], resource);
  });
  it('keeps one cohort batch-send action visible when the attention queue is empty', async () => {
    const resource = { id: 'support', type: 'simplified', title: 'Support resource' };
    const onSendToStudents = vi.fn().mockResolvedValue({ sent: 0, failed: 0 });
    const props = {
      history: [resource],
      getStudentSafeResources: items => items,
      currentItemId: 'support',
      currentResourceId: 'support',
      roster: {
        u1: {
          name: 'Ana',
          lastSeen: 100,
          viewingResourceId: 'support',
          viewingAt: 100,
        },
      },
      activitySnapshots: [{
        activityId: 'word-cloud-complete',
        family: 'polling',
        kind: 'word_cloud',
        phase: 'review',
        audienceUids: ['u1'],
        participantStatus: { u1: 'submitted' },
        startedAt: 50,
        updatedAt: 100,
      }],
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents,
      onOpenActivity: vi.fn(),
      now: 100,
      t: () => undefined,
    };

    let tree = enterCompanionMode(renderPanel(props), props);
    let nodes = walk(tree);
    const attention = nodes.find(node => node.props && node.props['aria-label'] === 'Teacher attention queue');
    expect(nodeText(attention)).toContain('No immediate attention signals.');

    const cohortSection = nodes.find(node => node.props
      && node.props['data-live-companion-cohorts'] === 'word-cloud-complete');
    const submittedCohort = walk(cohortSection).find(node => node.type === 'button'
      && nodeText(node) === 'Submitted1');
    expect(submittedCohort).toBeTruthy();
    submittedCohort.props.onClick();

    tree = renderPanel(props);
    nodes = walk(tree);
    const batchSends = nodes.filter(node => node.type === 'button'
      && node.props['aria-label'] === 'Send Support resource to 1 selected student');
    expect(batchSends).toHaveLength(1);
    await batchSends[0].props.onClick();
    expect(onSendToStudents).toHaveBeenCalledWith(['u1'], resource);

    tree = renderPanel(props);
    const status = walk(tree).find(node => node.props
      && node.props.role === 'status'
      && nodeText(node).includes('no longer connected'));
    expect(status).toBeTruthy();
    expect(nodeText(status)).not.toContain('Sent to 0');
  });
  it('keeps the focused shell as a read-only adapter over Activity Pulse', () => {
    const panelSource = source.slice(source.indexOf('function LiveLessonRunPanel'));

    expect(panelSource).toContain('buildLiveCompanionModel({ activitySnapshots, roster })');
    expect(panelSource).toContain('onClick={() => onOpenActivity(activityPulse)}');
    expect(panelSource).not.toMatch(
      /const\s+\[[^\]]*(?:response|question|stroke|moderation)[^\]]*\]\s*=\s*React\.useState/i
    );
  });
});
