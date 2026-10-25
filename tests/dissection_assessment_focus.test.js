import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 25));
// The fixed seed orders Tympanic Membrane first in the exposed frog skin pool.
const correctName = 'Tympanic Membrane';

async function mountLab(patch = {}, answerName = correctName) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), pluginInstanceToken = {};
  let state;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', selectedOrgan: null, hoveredOrgan: null,
    visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    quizMode: true, quizAnswerMode: 'choices', quizSeed: 1234, quizIdx: 0,
    quizScore: 0, quizTotal: 0, quizFirstAttemptScore: 0, quizFirstAttemptTotal: 0,
    quizSupportedCount: 0, quizReviewQueue: [], quizComplete: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' },
    organConfidence: { 'frog|nictitating': 2 }, procedureByLayer: {},
    ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, awardXP, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    get panel() { return host.querySelector('[data-dissection-quiz]'); },
    get summary() { return host.querySelector('[data-dissection-assessment-summary]'); },
    get continuation() { return host.querySelector('[id="diss-quiz-continue"]'); },
    get feedback() { return document.getElementById(this.continuation.getAttribute('aria-describedby')); },
    get correct() {
      expect(this.panel).not.toBeNull();
      return [...this.panel.querySelectorAll('button')].find(button => button.textContent === answerName);
    },
    get wrong() { return this.panel.querySelector('.diss-quiz-option:not([aria-label="' + correctName + '"])'); },
    button(text, scope = host) { return [...scope.querySelectorAll('button')].find(button => button.textContent === text); },
    async click(node) {
      expect(node).toBeDefined(); expect(node).not.toBeNull();
      await act(async () => { node.click(); });
      await act(async () => { await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); }); host.remove();
      await act(async () => { await settle(); });
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

function observationWork(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes',
    'organConfidence', 'procedureByLayer'].map(key => [key, state[key]])));
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await new Promise(resolve => setTimeout(resolve, 150));
  document.querySelectorAll('[data-assessment-test-outside]').forEach(node => node.remove());
  localStorage.clear(); document.getElementById('allo-live-dissection')?.remove();
  window._dissectionKeyHandler = null; vi.restoreAllMocks();
});

describe('assessment completion focus handoffs', () => {
  it('moves from the completed focused answer to the continuation and preserves first-attempt evidence', async () => {
    const f = await mountLab(), before = observationWork(f.state), answer = f.correct;
    expect(answer).toBeDefined(); answer.focus(); await f.click(answer);
    expect(f.state.quizFeedback).toMatchObject({ correct: true, supported: false });
    expect(f.state.quizFirstAttemptScore).toBe(1); expect(f.state.quizFirstAttemptTotal).toBe(1);
    expect(f.state.quizTotal).toBe(1); expect(answer.disabled).toBe(true);
    expect(document.activeElement).toBe(f.continuation);
    expect(f.continuation.getAttribute('aria-label')).toBe('Next Question');
    const feedback = f.feedback;
    expect(feedback).not.toBeNull(); expect(f.panel.contains(feedback)).toBe(true);
    expect(feedback.textContent).toContain('Correct'); expect(feedback.textContent).toContain(correctName);
    expect(observationWork(f.state)).toEqual(before); expect(f.awardXP).toHaveBeenCalledTimes(1);
    await f.click(f.continuation);
    expect(document.activeElement).toBe(f.panel); expect(f.state.quizIdx).toBe(1);
  });

  it('uses the summary continuation when the final question is completed', async () => {
    const f = await mountLab({ quizTotal: 4 });
    f.correct.focus(); await f.click(f.correct);
    expect(document.activeElement).toBe(f.continuation);
    expect(f.continuation.getAttribute('aria-label')).toBe('View assessment summary');
    await f.click(f.continuation);
    expect(document.activeElement).toBe(f.summary); expect(f.state.quizComplete).toBe(true);
  });

  it('keeps focus on an enabled wrong answer while retry remains available', async () => {
    const f = await mountLab(), answer = f.wrong;
    expect(answer).not.toBeNull(); answer.focus(); await f.click(answer);
    expect(f.state.quizRetry).toMatchObject({ questionId: 'tympanum', attempts: 1 });
    expect(f.state.quizFeedback).toBeFalsy(); expect(f.state.quizTotal).toBe(0);
    expect(f.state.quizFirstAttemptTotal).toBe(1); expect(f.state.quizFirstAttemptScore).toBe(0);
    expect(answer.disabled).toBe(false); expect(document.activeElement).toBe(answer);
    expect(f.continuation).toBeNull(); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('moves from the removed supported-reveal control to the described continuation', async () => {
    const f = await mountLab(), before = observationWork(f.state);
    f.wrong.focus(); await f.click(f.wrong);
    const reveal = f.button('Show answer \u00B7 supported practice', f.panel);
    reveal.focus(); await f.click(reveal);
    expect(reveal.isConnected).toBe(false); expect(document.activeElement).toBe(f.continuation);
    expect(f.state.quizFeedback).toMatchObject({ correct: false, supported: true });
    expect(f.state.quizSupportedCount).toBe(1); expect(f.state.quizFirstAttemptScore).toBe(0);
    expect(f.state.quizFirstAttemptTotal).toBe(1); expect(f.state.quizTotal).toBe(1);
    expect(f.panel.contains(f.feedback)).toBe(true);
    expect(f.feedback.textContent).toContain(correctName);
    expect(observationWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps the continuation description neutral during a timed practical', async () => {
    const f = await mountLab({ practicalMode: true, practicalTimer: 120,
      practicalEndsAt: Date.now() + 120000, practicalTargetIds: ['tympanum'], labelMode: 'hidden' });
    const answer = f.correct; answer.focus(); await f.click(answer);
    expect(document.activeElement).toBe(f.continuation);
    expect(f.continuation.getAttribute('aria-label')).toBe('Next Question');
    expect(f.panel.contains(f.feedback)).toBe(true);
    const text = f.feedback.textContent;
    expect(text).toContain('Response recorded'); expect(text).not.toContain(correctName);
    expect(text).not.toContain('Correct —'); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['Try a new assessment', 'Review missed structures'])('focuses the new question after %s removes its focused summary control', async label => {
    const f = await mountLab({ quizComplete: true, quizTotal: 1, quizScore: 0,
      quizFirstAttemptScore: 0, quizFirstAttemptTotal: 1, quizReviewQueue: ['nictitating'],
      assessmentRecordedScore: 0, assessmentRecordedTotal: 1, assessmentCompletedAt: 123 });
    const before = observationWork(f.state), control = f.button(label, f.summary);
    control.focus(); await f.click(control);
    expect(control.isConnected).toBe(false); expect(f.summary).toBeNull();
    expect(document.activeElement).toBe(f.panel); expect(f.state.quizComplete).toBe(false);
    expect(f.state.quizReviewMode).toBe(label === 'Review missed structures');
    expect(f.state.quizTotal).toBe(0); expect(observationWork(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('preserves canvas focus when an answer is submitted from outside the answer controls', async () => {
    const f = await mountLab(), canvas = f.host.querySelector('[data-diss-canvas]');
    await act(async () => { canvas.focus(); }); await f.click(f.correct);
    expect(f.state.quizFeedback.correct).toBe(true); expect(document.activeElement).toBe(canvas);
  });

  it('preserves a persistent outside control when completion did not begin in the question panel', async () => {
    const f = await mountLab(), outside = f.host.querySelector('button[aria-label="Advanced workspace"]');
    expect(outside).not.toBeNull(); outside.focus(); await f.click(f.correct);
    expect(f.state.quizFeedback.correct).toBe(true); expect(document.activeElement).toBe(outside);
  });

  it('cancels a pending completion handoff when the learner moves elsewhere before it runs', async () => {
    const f = await mountLab(), answer = f.correct;
    const outside = document.createElement('button'); outside.dataset.assessmentTestOutside = 'true';
    outside.textContent = 'Another task'; document.body.appendChild(outside);
    answer.focus();
    act(() => { answer.click(); });
    outside.focus();
    await act(async () => { await settle(); });
    expect(f.state.quizFeedback.correct).toBe(true); expect(document.activeElement).toBe(outside);
  });

  it('focuses the continuation only in the mounted lab whose answer was completed', async () => {
    const first = await mountLab(), second = await mountLab();
    second.correct.focus(); await second.click(second.correct);
    expect(second.state.quizFeedback.correct).toBe(true); expect(first.state.quizFeedback).toBeFalsy();
    expect(document.activeElement).toBe(second.continuation);
    expect(second.continuation).not.toBe(first.continuation);
    expect(first.host.contains(document.activeElement)).toBe(false);
  });

  it('does not steal focus from another mounted lab when completion was triggered programmatically', async () => {
    const first = await mountLab(), second = await mountLab(), outside = first.correct;
    outside.focus(); await second.click(second.correct);
    expect(second.state.quizFeedback.correct).toBe(true); expect(first.state.quizFeedback).toBeFalsy();
    expect(document.activeElement).toBe(outside);
  });

  it('keeps question and feedback descriptions within their own lab including a neutral timed response', async () => {
    const first = await mountLab();
    const second = await mountLab({ practicalMode: true, practicalTimer: 120,
      practicalEndsAt: Date.now() + 120000, practicalTargetIds: ['nictitating'], labelMode: 'hidden' }, 'Nictitating Membrane');
    const firstPromptId = first.panel.getAttribute('aria-describedby');
    const secondPromptId = second.panel.getAttribute('aria-describedby');
    expect(firstPromptId).toBeTruthy(); expect(secondPromptId).toBeTruthy();
    expect(firstPromptId).not.toBe(secondPromptId);
    const firstPrompt = document.getElementById(firstPromptId), secondPrompt = document.getElementById(secondPromptId);
    expect(first.panel.contains(firstPrompt)).toBe(true); expect(second.panel.contains(secondPrompt)).toBe(true);
    expect(firstPrompt.textContent).not.toBe(secondPrompt.textContent);
    first.correct.focus(); await first.click(first.correct);
    second.correct.focus(); await second.click(second.correct);
    expect(first.continuation.getAttribute('aria-describedby')).not.toBe(second.continuation.getAttribute('aria-describedby'));
    expect(first.panel.contains(first.feedback)).toBe(true); expect(second.panel.contains(second.feedback)).toBe(true);
    expect(first.feedback.textContent).toContain('Correct'); expect(first.feedback.textContent).toContain(correctName);
    expect(second.feedback.textContent).toContain('Response recorded');
    expect(second.feedback.textContent).not.toContain(correctName);
    expect(second.feedback.textContent).not.toContain('Nictitating Membrane');
    expect(document.activeElement).toBe(second.continuation);
    expect(second.awardXP).not.toHaveBeenCalled();
  });
});
