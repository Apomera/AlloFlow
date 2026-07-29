import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { transformSync } from '@babel/core';
import transformReactJsx from '@babel/plugin-transform-react-jsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
const SECRET_NEXT_CUE = 'SECRET_NEXT_CUE_MUST_NOT_RENDER_IN_PREVIEW';
const SECRET_NEXT_PROMPT = 'SECRET_NEXT_PROMPT_MUST_NOT_RENDER_IN_PREVIEW';
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

function conductorPreview(tree) {
  return walk(tree).find(node => node.props && node.props['data-live-conductor-preview']);
}

function makeProps(overrides = {}) {
  return {
    history: [
      { id: 'first', type: 'simplified', title: 'First lesson step' },
      { id: 'second', type: 'faq', title: 'Second lesson step' },
    ],
    getStudentSafeResources: items => items,
    currentItemId: 'first',
    currentResourceId: 'first',
    presenterCuesByResourceId: {
      second: {
        sayAsk: SECRET_NEXT_CUE,
        checkpoint: {
          kind: 'word_cloud',
          prompt: SECRET_NEXT_PROMPT,
        },
      },
    },
    getTitle: item => item.title,
    getIcon: () => null,
    t: () => undefined,
    ...overrides,
  };
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
  const windowStub = {};
  const compiled = transformSync(
    `${source}\nwindow.__liveLessonConductorTestApi = { LiveLessonRunPanel };`,
    {
      babelrc: false,
      configFile: false,
      plugins: [[transformReactJsx, {
        pragma: 'React.createElement',
        pragmaFrag: 'React.Fragment',
      }]],
    }
  ).code;
  // eslint-disable-next-line no-new-func
  new Function('window', 'React', compiled)(windowStub, React);
  api = windowStub.__liveLessonConductorTestApi;
});

beforeEach(() => {
  resetHooks();
});

describe('live lesson conductor preview', () => {
  it('labels preparation as rehearsal and exposes metadata without raw upcoming content', () => {
    const preview = conductorPreview(renderPanel(makeProps({ preparationOnly: true })));

    expect(preview).toBeTruthy();
    expect(preview.props['data-live-conductor-preview']).toBe('rehearsal');
    expect(preview.props['data-live-conductor-content']).toBe('metadata-only');
    expect(preview.props['aria-label']).toBe('Rehearsal up next, step 2: Second lesson step');
    expect(nodeText(preview)).toContain('Presenter cue ready');
    expect(nodeText(preview)).toContain('Word cloud ready');
    expect(nodeText(preview)).not.toContain(SECRET_NEXT_CUE);
    expect(nodeText(preview)).not.toContain(SECRET_NEXT_PROMPT);
  });

  it('uses an explicit live-run label in the session panel', () => {
    const preview = conductorPreview(renderPanel(makeProps({ preparationOnly: false })));

    expect(preview).toBeTruthy();
    expect(preview.props['data-live-conductor-preview']).toBe('live');
    expect(preview.props['aria-label']).toBe('Live run up next, step 2: Second lesson step');
  });

  it('reviews the next step locally without opening, sending, launching, or editing', () => {
    const callbacks = {
      onOpenResource: vi.fn(),
      onSendToGroup: vi.fn(),
      onSendToStudent: vi.fn(),
      onSendToStudents: vi.fn(),
      onLaunchPreparedInteraction: vi.fn(),
      onChangePresenterCue: vi.fn(),
    };
    const props = makeProps({ preparationOnly: false, ...callbacks });
    const preview = conductorPreview(renderPanel(props));
    const review = walk(preview).find(node => node.type === 'button'
      && node.props['aria-label'] === 'Review next step: Second lesson step');

    review.props.onClick();

    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
    const reviewedTree = renderPanel(props);
    expect(conductorPreview(reviewedTree)).toBeUndefined();
    const reviewedCue = walk(reviewedTree).find(node => node.type === 'textarea'
      && node.props['aria-label'] === 'Say / ask for Second lesson step');
    expect(reviewedCue.props.value).toBe(SECRET_NEXT_CUE);
  });

  it('renders no conductor preview at the final step or for an empty path', () => {
    expect(conductorPreview(renderPanel(makeProps({
      currentItemId: 'second',
      currentResourceId: 'second',
    })))).toBeUndefined();

    resetHooks();
    expect(conductorPreview(renderPanel(makeProps({
      history: [],
      currentItemId: null,
      currentResourceId: null,
    })))).toBeUndefined();
  });

  it('keeps the strip local-only in source and corrects universal polling audience copy', () => {
    const previewStart = source.indexOf('data-live-conductor-preview=');
    const previewEnd = source.indexOf('</aside>', previewStart);
    const previewSource = source.slice(previewStart, previewEnd);

    expect(previewStart).toBeGreaterThan(-1);
    expect(previewEnd).toBeGreaterThan(previewStart);
    expect(previewSource).toContain('onClick={() => selectAt(nextIndex)}');
    expect(previewSource).not.toContain('onOpenResource');
    expect(previewSource).not.toContain('onSendToGroup');
    expect(previewSource).not.toContain('onSendToStudent');
    expect(previewSource).not.toContain('onLaunchPreparedInteraction');
    expect(previewSource).not.toContain('nextPresenterCue.sayAsk');
    expect(previewSource).not.toContain('nextPresenterCue.checkpoint.prompt');
    expect(source).toContain(
      'Quick checks, word clouds, and open responses use the selected class, group, or student when launched.'
    );
    expect(source).not.toContain(
      'Quick checks, word clouds, and open responses run with the class.'
    );
  });
});
