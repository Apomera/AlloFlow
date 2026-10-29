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
  // Existing interaction examples use a known queue; order variation is tested
  // separately below, without relying on a particular random run.
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.getElementById('brainatlas-3d-saved-quiz-next')?.remove(); });

describe('Brain Atlas saved study rounds', () => {
  it('varies target positions independently of the stable answer list and preserves a resumed queue', () => {
    const firstPositions = new Set();
    for (const draw of [0, 0.999]) {
      resetStemLab();
      const s = session();
      Math.random.mockReturnValue(draw);
      s.click('Start custom quiz');
      const queue = [...s.state().brain3DSavedQuizQueue];
      const answerOrder = () => flatten(s.tree()).filter(node => node.props?.['data-brainatlas-saved-answer']).map(node => node.props['data-brainatlas-saved-answer']);
      expect(answerOrder()).toEqual(items.map(item => item.key));
      firstPositions.add(answerOrder().indexOf(queue[0]));
      expect([...queue].sort()).toEqual(items.map(item => item.key).sort());
      expect(s.state().brain3DSavedStructures).toEqual(items.map(item => item.key));
      // Rendering and resuming must not regenerate the randomized queue.
      Math.random.mockReturnValue(draw === 0 ? 0.999 : 0);
      s.tree(); s.tree();
      expect(s.state().brain3DSavedQuizQueue).toEqual(queue);
      s.answer(items.findIndex(item => item.key === queue[0]));
      s.click('Next structure');
      const saved = JSON.parse(JSON.stringify(s.state()));
      resetStemLab();
      const resumed = session(saved);
      expect(resumed.state().brain3DSavedQuizQueue).toEqual(queue);
      expect(resumed.state().brain3DSavedQuizIndex).toBe(1);
      resumed.answer(items.findIndex(item => item.key === queue[1]));
      resumed.click('Finish round');
      expect(resumed.state().brain3DSavedQuizResults.map(result => result.key)).toEqual(queue);
    }
    expect([...firstPositions].sort()).toEqual([0, 1]);
  }, 15000);

  it('announces the randomized first target using the same clue as the visible prompt', () => {
    const s = session();
    Math.random.mockReturnValue(0);
    s.click('Start custom quiz');
    expect(s.state().brain3DSavedQuizQueue[0]).toBe(items[1].key);
    const prompt = s.find(node => node.props?.['data-brainatlas-saved-quiz-prompt'] === 'clue');
    const clue = flatten(prompt).find(node => node.type === 'strong').props.children;
    expect(s.announceToSR).toHaveBeenLastCalledWith(expect.stringContaining(clue));
    expect(String(clue)).not.toMatch(/thalam/i);
  });

  it('announces and records locating practice when a new round has no unique clue', () => {
    const saved = ['Allen_thalamus_L', 'Allen_thalamus_R'];
    const s = session({ brain3DStructureIndex: saved.map(key => ({ key, label: key })), brain3DSavedStructures: saved });
    s.click('Start custom quiz');
    expect(s.find(node => node.props?.['data-brainatlas-saved-quiz-prompt'] === 'name')).toBeTruthy();
    expect(s.announceToSR).toHaveBeenLastCalledWith('Saved structure round started. Locating practice. Find Allen_thalamus_L. The name is shown because this set has no unique clue for this structure.');
    s.find(node => node.props?.['data-brainatlas-saved-answer'] === saved[0]).props.onClick();
    expect(s.state().brain3DSavedQuizResults[0].hinted).toBe(true);
  });

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
    expect(s.state().brain3DSavedQuizResults).toEqual([{ key: items[0].key, firstTry: false, hinted: false }]);
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
    // aria-disabled, not disabled: a locked answer must keep keyboard focus
    const locked = s.find(node => node.props?.['data-brainatlas-saved-answer'] === items[0].key);
    expect(locked.props['aria-disabled']).toBe('true');
    expect(locked.props.disabled).toBeUndefined();
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
