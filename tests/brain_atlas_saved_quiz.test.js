import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const items = [
  { key: 'Allen_body_of_hippocampus_L', label: 'Left hippocampus', family: 'deep' },
  { key: 'Allen_thalamus_L', label: 'Left thalamus', family: 'deep' },
];
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function label(node) {
  if (Array.isArray(node)) return node.map(label).join('');
  if (node && typeof node === 'object') return label(node.props?.children);
  return node == null || typeof node === 'boolean' ? '' : String(node);
}
function session(extra = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DStudySetOpen: true, brain3DStructureIndex: items, brain3DSavedStructures: items.map(item => item.key), ...extra } });
  const announceToSR = vi.fn();
  const tree = () => tool.render(makeCtx({ announceToSR }, store));
  const find = (predicate) => flatten(tree()).find(predicate);
  const button = (text) => find(node => node.type === 'button' && label(node.props.children) === text);
  const click = (text) => { const el = button(text); expect(el, text).toBeTruthy(); expect(el.props.disabled).not.toBe(true); el.props.onClick({}); };
  const answer = (index) => { const el = find(node => node.props?.['data-brainatlas-saved-answer'] === items[index].key); expect(el).toBeTruthy(); el.props.onClick(); };
  return { store, tree, find, button, click, answer, announceToSR, state: () => store.toolData.brainAtlas, html: () => ReactDOMServer.renderToStaticMarkup(tree()) };
}

beforeEach(() => {
  resetStemLab();
  delete window.__alloBrainAtlas3DStructureIndex;
});

afterEach(() => { vi.useRealTimers(); document.getElementById('brainatlas-3d-saved-quiz-next')?.remove(); });

describe('Brain Atlas saved study rounds', () => {
  it('moves keyboard focus to the continue control after a correct answer', () => {
    vi.useFakeTimers();
    const s = session();
    s.click('Start custom quiz');
    s.answer(0);
    const next = document.createElement('button');
    next.id = 'brainatlas-3d-saved-quiz-next';
    document.body.appendChild(next);
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(next);
  });
  it('finishes a finite round and retries only structures that needed practice', () => {
    const s = session({ brain3DChallengeActive: true });
    s.click('Start custom quiz');
    expect(s.state().brain3DChallengeActive).toBe(false);
    s.answer(1);
    s.answer(0);
    expect(s.state().brain3DSavedQuizResults).toEqual([{ key: items[0].key, firstTry: false }]);
    s.answer(1); // A model pick after success cannot replace correct feedback.
    expect(s.state().brain3DSavedQuizFeedback.correct).toBe(true);
    s.click('Next structure');
    s.answer(1);
    s.click('Finish round');
    expect(s.state().brain3DSavedQuizComplete).toBe(true);
    expect(s.html()).toContain('1 of 2 identified on the first try.');
    expect(s.html()).not.toContain('data-brainatlas-saved-answer');
    expect(s.announceToSR).toHaveBeenCalledWith('Study round complete. 1 of 2 identified on the first try.');
    s.click('Retry structures needing practice');
    expect(s.state().brain3DSavedQuizQueue).toEqual([items[0].key]);
    expect(s.state().brain3DSavedQuizResults).toEqual([]);
    expect(s.html()).toContain('Custom quiz · 1 of 1');
    s.answer(0);
    s.click('Finish round');
    expect(s.html()).toContain('1 of 1 identified on the first try.');
    expect(s.button('Retry structures needing practice')).toBeUndefined();
    s.click('Practice whole set again');
    expect(s.state().brain3DSavedQuizQueue).toEqual(items.map(item => item.key));
    expect(s.state().brain3DSavedQuizComplete).toBe(false);
  });

  it('does not advance until correct and prevents duplicate answer credit', () => {
    const s = session();
    s.click('Start custom quiz');
    expect(s.button('Next structure')).toBeUndefined();
    s.answer(1);
    expect(s.button('Next structure')).toBeUndefined();
    s.answer(0);
    s.answer(0);
    expect(s.state().brain3DSavedQuizResults).toHaveLength(1);
    expect(s.find(node => node.props?.['data-brainatlas-saved-answer'] === items[0].key).props.disabled).toBe(true);
  });

  it('ends the current round when a saved structure is removed', () => {
    const s = session();
    s.click('Start custom quiz');
    s.click('Study set (2)');
    s.find(node => node.props?.['aria-label'] === 'Remove Left hippocampus from study set').props.onClick();
    expect(s.state().brain3DSavedQuizActive).toBe(false);
    expect(s.state().brain3DSavedStructures).toEqual([items[1].key]);
  });

  it('supports legacy active rounds and resets progress on restart', () => {
    const s = session({ brain3DSavedQuizActive: true, brain3DSavedQuizResults: null });
    expect(s.html()).toContain('Custom quiz · 1 of 2');
    s.answer(0);
    s.click('Next structure');
    s.answer(1);
    s.click('Finish round');
    expect(s.html()).toContain('2 of 2 identified on the first try.');
    s.click('Back to atlas');
    expect(s.state().brain3DSavedQuizActive).toBe(false);
    s.click('Start custom quiz');
    expect(s.state().brain3DSavedQuizResults).toEqual([]);
    expect(s.state().brain3DSavedQuizIndex).toBe(0);
  });
});
