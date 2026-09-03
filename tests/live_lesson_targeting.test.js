import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
// Live Session dock was extracted from ANTI into its own CDN view module; pins follow the code.
const liveDock = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
let api;
let reactStub;
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
  const children = node.props && node.props.children;
  if (children !== undefined) walk(children, result);
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
  reactStub = {
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
  const windowStub = { React: reactStub };
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8'))(windowStub);
  api = windowStub.AlloModules.LiveLessonRun;
});

beforeEach(() => {
  resetHooks();
});

describe('live lesson audiences', () => {
  it('derives class, group, and individual choices from the existing session records', () => {
    const audiences = api.buildLiveLessonAudiences(
      {
        g2: { name: 'Readers' },
        removed: null,
        g1: { name: 'Explorers' },
      },
      {
        s2: { name: 'Zoe', groupId: 'g2' },
        s1: { name: 'Ana', groupId: 'g1' },
        s3: { name: 'Bo', groupId: 'g1' },
      }
    );

    expect(audiences.map(audience => audience.key)).toEqual([
      'class',
      'group:g1',
      'group:g2',
      'student:s1',
      'student:s3',
      'student:s2',
    ]);
    expect(audiences.find(audience => audience.key === 'class').memberCount).toBe(3);
    expect(audiences.find(audience => audience.key === 'group:g1').memberCount).toBe(2);
  });

  it('falls back to the whole-class choice if a selected audience disappears', () => {
    const audiences = api.buildLiveLessonAudiences({}, { s1: { name: 'Ana' } });
    expect(api.resolveLiveLessonAudience(audiences, 'group:removed').key).toBe('class');
  });
});

describe('delivery acknowledgment summaries', () => {
  const roster = {
    s1: { groupId: 'g1', viewingResourceId: 'step-2' },
    s2: { groupId: 'g1', viewingResourceId: 'step-1' },
    s3: { groupId: 'g2', viewingResourceId: 'step-2' },
  };

  it('uses the existing viewingResourceId acknowledgments for each audience scope', () => {
    expect(api.summarizeLiveLessonDelivery('step-2', { kind: 'class' }, roster))
      .toEqual({ viewing: 2, total: 3 });
    expect(api.summarizeLiveLessonDelivery('step-2', { kind: 'group', id: 'g1' }, roster))
      .toEqual({ viewing: 1, total: 2 });
    expect(api.summarizeLiveLessonDelivery('step-2', { kind: 'student', id: 's3' }, roster))
      .toEqual({ viewing: 1, total: 1 });
  });
});

describe('acknowledged individual support overrides', () => {
  it('returns only bounded overrides opened at or after their assignment', () => {
    const roster = {
      opened: {
        resourceId: 'support-1',
        resourceAt: 100,
        viewingResourceId: 'support-1',
        viewingAt: 101,
      },
      exact: {
        resourceId: 'support-2',
        resourceAt: 200,
        viewingResourceId: 'support-2',
        viewingAt: 200,
      },
      unopened: {
        resourceId: 'support-3',
        resourceAt: 300,
        viewingResourceId: 'other',
        viewingAt: 400,
      },
      staleReceipt: {
        resourceId: 'support-4',
        resourceAt: 500,
        viewingResourceId: 'support-4',
        viewingAt: 499,
      },
    };

    expect(api.buildAcknowledgedLiveResourceOverrides(roster, 25)).toEqual(['opened', 'exact']);
    expect(api.buildAcknowledgedLiveResourceOverrides(roster, 1)).toEqual(['opened']);
    expect(api.buildAcknowledgedLiveResourceOverrides(roster, 0)).toEqual([]);
  });
});

describe('selection is separate from delivery', () => {
  it('focuses the next step without class-pushing, then sends it through the existing group callback', () => {
    const onOpenResource = vi.fn();
    const onSendToGroup = vi.fn();
    const onSendToStudent = vi.fn();
    const props = {
      history: [
        { id: 'step-1', type: 'simplified', title: 'Read' },
        { id: 'step-2', type: 'quiz', title: 'Check' },
      ],
      getStudentSafeResources: items => items,
      currentItemId: 'step-1',
      currentResourceId: 'step-1',
      sessionMode: 'sync',
      groups: { g1: { name: 'Explorers' } },
      roster: { s1: { name: 'Ana', groupId: 'g1', viewingResourceId: 'step-2' } },
      getTitle: item => item.title,
      getIcon: () => null,
      onOpenResource,
      onSendToGroup,
      onSendToStudent,
      t: () => undefined,
    };

    let tree = renderPanel(props);
    let nodes = walk(tree);
    const nextButton = nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Select next lesson step');
    nextButton.props.onClick();
    expect(onOpenResource).not.toHaveBeenCalled();
    expect(onSendToGroup).not.toHaveBeenCalled();

    tree = renderPanel(props);
    nodes = walk(tree);
    const audienceSelect = nodes.find(node => node.type === 'select' && node.props['aria-label'] === 'Choose who receives the selected lesson step');
    audienceSelect.props.onChange({ target: { value: 'group:g1' } });

    tree = renderPanel(props);
    nodes = walk(tree);
    const sendButton = nodes.find(node => node.type === 'button' && nodeText(node).includes('Send to group'));
    sendButton.props.onClick();

    expect(onOpenResource).not.toHaveBeenCalled();
    expect(onSendToGroup).toHaveBeenCalledWith('g1', props.history[1]);
    const deliveryStatus = nodes.find(node =>
      node.props && node.props.role === 'status' && nodeText(node).includes('last reported on this step')
    );
    expect(nodeText(deliveryStatus)).toContain('1 of 1 last reported on this step');
  });
});

describe('prepared checkpoint UI', () => {
  const baseProps = {
    history: [{ id: 'step-1', type: 'simplified', title: 'Read' }],
    getStudentSafeResources: items => items,
    currentItemId: 'step-1',
    currentResourceId: 'step-1',
    groups: { g1: { name: 'Readers' } },
    roster: { s1: { name: 'Ana', groupId: 'g1' } },
    getTitle: item => item.title,
    getIcon: () => null,
    presenterCuesByResourceId: {
      'step-1': {
        checkpoint: { kind: 'feedback_response', prompt: 'Explain.', criteria: 'Use evidence.' },
      },
    },
    onChangePresenterCue: vi.fn(),
    t: () => undefined,
  };

  it('keeps preparation contextual and hides live-only delivery controls before class', () => {
    const nodes = walk(renderPanel({ ...baseProps, preparationOnly: true }));
    expect(nodes.some(node => node.props && node.props['data-live-prepared-checkpoint'] === 'ready')).toBe(true);
    expect(nodes.some(node => node.type === 'select' && node.props['aria-label'] === 'Choose who receives the selected lesson step')).toBe(false);
    expect(nodes.some(node => node.props && node.props.role === 'status' && nodeText(node).includes('Saved for live session'))).toBe(true);
  });

  it('loads a prepared checkpoint for final review and carries the selected feedback audience', () => {
    const onLaunchPreparedInteraction = vi.fn();
    const props = { ...baseProps, onLaunchPreparedInteraction };
    let nodes = walk(renderPanel(props));
    const audienceSelect = nodes.find(node => node.type === 'select' && node.props['aria-label'] === 'Choose who receives the selected lesson step');
    audienceSelect.props.onChange({ target: { value: 'group:g1' } });

    nodes = walk(renderPanel(props));
    const launchButton = nodes.find(node => node.type === 'button' && nodeText(node).includes('Review and launch'));
    launchButton.props.onClick();

    expect(onLaunchPreparedInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'feedback_response', prompt: 'Explain.', criteria: 'Use evidence.' }),
      props.history[0],
      expect.objectContaining({ kind: 'group', id: 'g1' })
    );
  });

  it('shows and blocks a stale Live Quiz checkpoint on a non-quiz resource', () => {
    const onLaunchPreparedInteraction = vi.fn();
    const props = {
      ...baseProps,
      presenterCuesByResourceId: {
        'step-1': { checkpoint: { kind: 'live_quiz' } },
      },
      onLaunchPreparedInteraction,
    };
    const nodes = walk(renderPanel(props));
    const checkpoint = nodes.find(node => node.props
      && node.props['data-live-prepared-checkpoint'] === 'invalid');
    const invalidOption = nodes.find(node => node.type === 'option'
      && node.props.value === 'live_quiz');
    const blockedLaunch = nodes.find(node => node.type === 'button'
      && nodeText(node).includes('Choose a quiz resource to launch'));

    expect(checkpoint).toBeTruthy();
    expect(invalidOption).toBeTruthy();
    expect(invalidOption.props.disabled).toBe(true);
    expect(nodeText(invalidOption)).toContain('requires a quiz resource');
    expect(blockedLaunch.props.disabled).toBe(true);

    blockedLaunch.props.onClick();
    expect(onLaunchPreparedInteraction).not.toHaveBeenCalled();
  });
});

describe('shell integration reuses canonical handlers', () => {
  it('passes session groups/roster and maps sends to the existing id-only handlers', () => {
    expect(liveDock).toContain('groups: (sessionData && sessionData.groups) || {}');
    expect(anti).toContain('roster: rosterEntries');
    expect(liveDock).toContain('onSendToGroup: (groupId, item) => handleSetGroupResource(groupId, item.id)');
    expect(liveDock).toContain('onSendToStudent: (uid, item) => handleSetStudentResource(uid, item.id)');
    expect(liveDock).toContain('onSendToStudents: (uids, item) => handleSetStudentsResource(uids, item.id)');
    expect(liveDock).toContain('onReleaseStudentResources: handleReleaseStudentResources');
    expect(anti).toContain('const handleSetStudentsResource = async (uids, resourceId, options = {}) =>');
    expect(anti).toContain('const handleReleaseStudentResources = async (uids) =>');
    expect(anti).toContain('entry.viewingResourceId !== entry.resourceId');
    expect(anti).toContain('const buildStudentResourcePatchBatches =');
    expect(anti).toContain('for (let offset = 0; offset < safeUids.length; offset += 25)');
    expect(anti).toContain('for (const batch of plan.batches)');
    expect(anti).toContain('await updateDoc(sessionRef, batch.updates)');
  });

  it('keeps navigation as selection-only and delivery in one explicit action', () => {
    expect(source).toContain('onClick={() => selectAt(previousIndex)}');
    expect(source).toContain('onClick={() => selectAt(nextIndex)}');
    expect(source).toContain('onClick={deliverFocused}');
  });
});
