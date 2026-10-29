import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const match = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  const start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, source.indexOf(ending, start) + ending.length) + ');')(...Object.values(bindings));
}
const order = productionFunction('dissStableOrder', { dissHash: productionFunction('dissHash') });
const catalogStart = source.indexOf('var SPECIMENS = ') + 'var SPECIMENS = '.length;
const catalog = new Function('return ' + source.slice(catalogStart, source.indexOf('// ════════ ACTIVE STATE', catalogStart)))();
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = findNode(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : findNode(node.props?.children, predicate);
}
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, tree, update;
  function Lab() {
    const [data, setter] = React.useState({ dissection: {
      specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', reducedMotion: true, workspaceMode: 'advanced',
      quizMode: true, quizSeed: 42, quizIdx: 0, quizScore: 0, quizTotal: 0,
      quizFirstAttemptScore: 0, quizFirstAttemptTotal: 0, quizSupportedCount: 0,
      quizReviewQueue: [], assessmentEvidence: {}, ...patch,
    } });
    state = data.dissection;
    update = change => setter(previous => ({ ...previous, dissection: { ...previous.dissection, ...change } }));
    tree = config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
    return tree;
  }
  const f = { host, root, awardXP, get state() { return state; },
    target() {
      const ids = state.practicalMode ? state.practicalTargetIds : state.quizReviewMode ? state.quizReviewQueue : null;
      const pool = ids ? Object.values(catalog.frog.organs).flat().filter(organ => ids.includes(organ.id)) : catalog.frog.organs.skin;
      return order(pool, 'frog|assessment|' + state.quizSeed)[state.quizIdx || 0];
    },
    answers() {
      const choices = [...host.querySelectorAll('#diss-quiz-panel .diss-quiz-option')];
      return { correct: choices.find(button => button.textContent === this.target().name), wrong: choices.find(button => button.textContent !== this.target().name) };
    },
    correctHandler() { return findNode(tree, node => node.type === 'button' && node.props['aria-label'] === this.target().name).props.onClick; },
    async update(change) { await act(async () => update(change)); await act(async () => { await settle(); }); },
    async click(...buttons) {
      buttons.forEach(button => expect(button).toBeTruthy());
      await act(async () => { buttons.forEach(button => button.click()); });
      await act(async () => { await settle(); });
    },
  };
  fixtures.push(f);
  await act(async () => { root.render(React.createElement(Lab)); });
  await act(async () => { await settle(); });
  return f;
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) { await act(async () => f.root.unmount()); f.host.remove(); } await settle(); localStorage.clear(); vi.restoreAllMocks(); });

describe('assessment submission claims', () => {
  it('keeps a wrong first response when a second answer arrives before the feedback commits', async () => {
    const f = await mount(), target = f.target(), answers = f.answers();
    await f.click(answers.wrong, answers.correct);
    expect(f.state.quizFirstAttemptScore).toBe(0);
    expect(f.state.quizFirstAttemptTotal).toBe(1);
    expect(f.state.assessmentEvidence[target.id]).toBeUndefined();
    expect(f.state.assessmentEvidence['frog|' + target.id]).toBeUndefined();
    expect(f.awardXP).not.toHaveBeenCalled();
    expect(f.state.quizRetry.questionId).toBe(target.id);
    expect(f.state.quizFeedback).toBeFalsy();
    await f.click(f.answers().correct);
    expect(f.state.quizFeedback).toMatchObject({ correct: true, supported: true });
    expect(f.state.quizFirstAttemptScore).toBe(0); expect(f.state.quizFirstAttemptTotal).toBe(1);
    expect(f.state.quizSupportedCount).toBe(1); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('records and rewards one correct response even if the same button is activated twice in one batch', async () => {
    const f = await mount(), correct = f.answers().correct;
    await f.click(correct, correct);
    expect(f.state.quizScore).toBe(1); expect(f.state.quizTotal).toBe(1);
    expect(f.awardXP).toHaveBeenCalledTimes(1);
    expect(f.awardXP).toHaveBeenCalledWith('dissection', 2, 'Correct first-attempt quiz answer');
    await f.click(f.host.querySelector('#diss-quiz-continue'));
    expect(f.state.quizIdx).toBe(1); expect(f.state.quizFeedback).toBeNull();
    await f.click(f.answers().correct);
    expect(f.state.quizScore).toBe(2); expect(f.state.quizTotal).toBe(2);
    expect(f.awardXP).toHaveBeenCalledTimes(2);
  });

  it('permits each deliberate wrong retry after new feedback without counting it as another first attempt', async () => {
    const f = await mount(), wrong = f.answers().wrong;
    await f.click(wrong, wrong); expect(f.state.quizRetry.attempts).toBe(1);
    await f.click(f.answers().wrong); expect(f.state.quizRetry.attempts).toBe(2);
    expect(f.state.quizFirstAttemptTotal).toBe(1);
    await f.click(f.answers().correct);
    expect(f.state.quizFeedback.supported).toBe(true); expect(f.state.quizSupportedCount).toBe(1);
    expect(f.state.quizFirstAttemptScore).toBe(0); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['reveal', 'answer'])('keeps the first %s action when answer and reveal race during supported review', async first => {
    const f = await mount({ quizReviewMode: true, quizReviewQueue: ['dorsal_skin'] });
    await f.click(f.answers().wrong);
    const reveal = [...f.host.querySelectorAll('#diss-quiz-panel button')].find(button => button.textContent.startsWith('Show answer'));
    const correct = f.answers().correct;
    await f.click(...(first === 'reveal' ? [reveal, correct] : [correct, reveal]));
    expect(f.state.quizTotal).toBe(1); expect(f.state.quizFirstAttemptTotal).toBe(0);
    expect(f.state.quizScore).toBe(first === 'answer' ? 1 : 0);
    expect(f.state.quizFeedback.correct).toBe(first === 'answer'); expect(f.awardXP).not.toHaveBeenCalled();
    await f.click(f.host.querySelector('#diss-quiz-continue'));
    expect(f.state.quizReviewQueue).toEqual(first === 'answer' ? [] : ['dorsal_skin']);
  });

  it('preserves the first timed-practical response and accepts the next question normally', async () => {
    const f = await mount({ practicalMode: true, practicalEndsAt: Date.now() + 60000, practicalTimer: 60, practicalTargetIds: ['dorsal_skin', 'tympanum'] });
    const { wrong, correct } = f.answers(); await f.click(wrong, correct);
    expect(f.state.quizScore).toBe(0); expect(f.state.quizTotal).toBe(1);
    expect(f.state.quizFirstAttemptTotal).toBe(0); expect(f.state.assessmentEvidence).toEqual({});
    await f.click(f.host.querySelector('#diss-quiz-continue')); await f.click(f.answers().correct);
    expect(f.state.quizScore).toBe(1); expect(f.state.quizTotal).toBe(2);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('rejects a retained response callback after advancing to another question', async () => {
    const f = await mount(), stale = f.correctHandler(); await f.click(f.answers().correct);
    await f.click(f.host.querySelector('#diss-quiz-continue'));
    const before = structuredClone(f.state);
    await act(async () => stale());
    expect(f.state).toEqual(before); expect(f.awardXP).toHaveBeenCalledTimes(1);
    await f.click(f.answers().correct); expect(f.state.quizTotal).toBe(2);
  });

  it.each([
    ['session', { quizSeed: 43 }], ['layer', { activeLayer: 'muscle' }],
    ['specimen', { specimen: 'pig', _dissLoadedSpec: 'pig' }], ['exit', { quizMode: false }],
  ])('rejects a retained response after the %s changes', async (_label, change) => {
    const f = await mount(), stale = f.correctHandler(); await f.update(change);
    const before = structuredClone(f.state); await act(async () => stale());
    expect(f.state).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps submissions independent for two mounted labs', async () => {
    const a = await mount(), b = await mount();
    await a.click(a.answers().correct); await b.click(b.answers().correct);
    expect(a.state.quizTotal).toBe(1); expect(b.state.quizTotal).toBe(1);
    expect(a.awardXP).toHaveBeenCalledTimes(1); expect(b.awardXP).toHaveBeenCalledTimes(1);
  });
});
