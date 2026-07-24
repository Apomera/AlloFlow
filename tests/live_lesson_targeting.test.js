import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
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
    const deliveryStatus = nodes.find(node => node.props && node.props.role === 'status');
    expect(nodeText(deliveryStatus)).toContain('1 of 1 last reported on this step');
  });
});

describe('shell integration reuses canonical handlers', () => {
  it('passes session groups/roster and maps sends to the existing id-only handlers', () => {
    expect(anti).toContain('groups: (sessionData && sessionData.groups) || {}');
    expect(anti).toContain('roster: rosterEntries');
    expect(anti).toContain('onSendToGroup: (groupId, item) => handleSetGroupResource(groupId, item.id)');
    expect(anti).toContain('onSendToStudent: (uid, item) => handleSetStudentResource(uid, item.id)');
  });

  it('keeps navigation as selection-only and delivery in one explicit action', () => {
    expect(source).toContain('onClick={() => selectAt(previousIndex)}');
    expect(source).toContain('onClick={() => selectAt(nextIndex)}');
    expect(source).toContain('onClick={deliverFocused}');
  });
});
