import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const startedAt = new Date('2026-10-26T12:00:00Z').getTime();
const fixtures = [];
const workKeys = ['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer',
  'annotations', 'quizScore', 'quizTotal', 'quizFirstAttemptScore', 'quizFirstAttemptTotal',
  'assessmentRecordedScore', 'assessmentRecordedTotal', 'assessmentEvidence', 'quizReviewQueue'];
const work = state => structuredClone(Object.fromEntries(workKeys.map(key => [key, state[key]])));
const notes = state => structuredClone(Object.fromEntries(workKeys.slice(0, 6).map(key => [key, state[key]])));

async function flush(milliseconds = 20) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); await Promise.resolve(); });
}

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), addToast = vi.fn(), announceToSR = vi.fn();
  const pluginInstanceToken = {};
  let state, update, closed = false;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', toolbarStudyOpen: true, reducedMotion: true, soundEnabled: false,
    selectedOrgan: null, hoveredOrgan: null, visualRealism: 'accessible',
    practicalMode: true, practicalTimer: 5, practicalEndsAt: startedAt + 5000,
    practicalTargetIds: ['nictitating', 'tympanum'], labelMode: 'hidden', _prePracticalLabelMode: 'show',
    quizMode: true, quizAnswerMode: 'choices', quizSeed: 1234, quizIdx: 0, quizComplete: false,
    quizScore: 3, quizTotal: 5, quizFirstAttemptScore: 2, quizFirstAttemptTotal: 4,
    assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentEvidence: {},
    quizReviewQueue: ['tympanum'], quizReviewMode: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: {}, annotations: [{ type: 'dot', x: .4, y: .4 }], ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP, addToast, announceToSR, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, addToast, announceToSR, get state() { return state; },
    get panel() { return host.querySelector('#diss-quiz-panel'); },
    get summary() { return host.querySelector('#diss-practical-summary'); },
    get answer() { return this.panel?.querySelector('.diss-quiz-option'); },
    button(text) { return [...host.querySelectorAll('button')].find(button => button.textContent === text); },
    node(id) { return host.querySelector('#' + id); },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); await Promise.resolve(); });
    },
    async click(node) {
      expect(node).toBeDefined(); expect(node).not.toBeNull();
      await act(async () => { node.click(); await Promise.resolve(); }); await flush();
    },
    async expire(withHandoff = true) {
      const remaining = Math.max(1000, this.state.practicalEndsAt - Date.now());
      await act(async () => { vi.advanceTimersByTime(remaining); await Promise.resolve(); });
      if (withHandoff) await flush();
    },
    async close() {
      if (closed) return; closed = true;
      await act(async () => { root.unmount(); await Promise.resolve(); }); host.remove();
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  await flush(0);
  return fixture;
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(startedAt); localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  document.querySelectorAll('[data-practical-outside]').forEach(node => node.remove());
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
  window.__alloDissectionPracticalInterval = null; window._dissectionKeyHandler = null;
  document.getElementById('allo-live-dissection')?.remove();
});

function outsideButton() {
  const button = document.createElement('button'); button.dataset.practicalOutside = 'true';
  button.textContent = 'Another task'; document.body.appendChild(button); return button;
}

describe('timed practical completion results and focus', () => {
  it.each(['answer', 'panel'])('hands removed %s focus to a labelled, durable result without changing learner evidence', async target => {
    const f = await mountLab(), before = work(f.state), origin = f[target];
    expect(origin).not.toBeNull(); origin.focus(); await f.expire();
    expect(origin.isConnected).toBe(false); expect(f.panel).toBeNull(); expect(f.summary).not.toBeNull();
    expect(document.activeElement).toBe(f.summary); expect(f.summary.tabIndex).toBe(-1);
    expect(f.host.querySelector('#' + f.summary.getAttribute('aria-labelledby')).textContent).toBe('Timed practical result');
    expect(f.summary.textContent).toContain('Time up! Score: 3/5');
    expect(f.state).toMatchObject({ practicalMode: false, quizMode: false, practicalEndsAt: 0, practicalTimer: 0, labelMode: 'show' });
    expect(work(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    await flush(6000); expect(f.summary.textContent).toContain('Time up! Score: 3/5');
  });

  it('keeps focus elsewhere when the timer finishes', async () => {
    const f = await mountLab(), before = work(f.state), outside = outsideButton(); outside.focus();
    await f.expire(); expect(f.summary).not.toBeNull(); expect(document.activeElement).toBe(outside);
    expect(work(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('abandons a pending handoff when the learner moves before its callback', async () => {
    const f = await mountLab(), outside = outsideButton(); f.answer.focus();
    await f.expire(false); expect(document.activeElement).not.toBe(f.summary); outside.focus(); await flush();
    expect(f.summary).not.toBeNull(); expect(document.activeElement).toBe(outside);
  });

  it('does not focus a detached lab after a pending completion handoff', async () => {
    const f = await mountLab(), outside = outsideButton(); f.answer.focus();
    await f.expire(false); expect(document.activeElement).not.toBe(f.summary); await f.close(); outside.focus(); await flush();
    expect(document.activeElement).toBe(outside); expect(document.querySelector('#diss-practical-summary')).toBeNull();
  });

  it('provides a durable reason and focus handoff for a missing timing record', async () => {
    const f = await mountLab(), before = work(f.state); f.answer.focus();
    await f.patch({ practicalEndsAt: 0 }); await flush();
    expect(f.summary.textContent).toContain('Timed practical ended because its timing record was unavailable.');
    expect(f.summary.textContent).toContain('No additional response was recorded.');
    expect(document.activeElement).toBe(f.summary); expect(work(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled(); expect(f.addToast).toHaveBeenCalledTimes(1);
  });

  it('ends the timer and announces completion exactly once despite later ticks', async () => {
    const f = await mountLab(); f.answer.focus(); await f.expire(); await flush(10000);
    expect(f.addToast).toHaveBeenCalledTimes(1); expect(f.addToast).toHaveBeenCalledWith('Time up! Score: 3/5', 'info');
    expect(f.announceToSR.mock.calls.filter(([message]) => message === 'Practical assessment complete. Score 3 out of 5.')).toHaveLength(1);
    expect(window.__alloDissectionPracticalInterval).toBeNull();
  });

  it('clears the prior result when a new timed practical begins', async () => {
    const f = await mountLab(); await f.expire(); const before = notes(f.state);
    await f.click(f.host.querySelector('[aria-label="Start 2-minute timed practical"]'));
    expect(f.state.practicalMode).toBe(true); expect(f.state._practicalCompletion).toBeNull(); expect(f.summary).toBeNull();
    expect(f.state.quizScore).toBe(0); expect(f.state.quizTotal).toBe(0); expect(notes(f.state)).toEqual(before);
  });

  it('clears the result on specimen change', async () => {
    const f = await mountLab(); await f.expire(); await f.click(f.node('diss-specimen-tab-pig'));
    expect(f.state.specimen).toBe('pig'); expect(f.state._practicalCompletion).toBeNull(); expect(f.summary).toBeNull();
  });

  it('clears the result when a reset is confirmed', async () => {
    const f = await mountLab(); await f.expire(); await f.patch({ toolbarToolsOpen: true });
    await f.click(f.node('diss-reset-specimen')); await f.click(f.node('diss-reset-confirm'));
    expect(f.state._practicalCompletion).toBeNull(); expect(f.summary).toBeNull();
  });

  it('clears the result when an ordinary scored assessment restarts', async () => {
    const f = await mountLab(); await f.expire();
    await f.patch({ quizMode: true, quizComplete: true }); await f.click(f.button('Try a new assessment'));
    expect(f.state.quizMode).toBe(true); expect(f.state.quizComplete).toBe(false);
    expect(f.state._practicalCompletion).toBeNull(); expect(f.summary).toBeNull();
  });

  it.each([
    { specimen: 'pig', quizSeed: 1234, message: 'Old result' },
    { specimen: 'frog', quizSeed: 9999, message: 'Old result' },
    { specimen: 'frog', quizSeed: 1234, message: { invalid: true } },
  ])('does not render a mismatched or malformed private result %#', async completion => {
    const f = await mountLab({ practicalMode: false, quizMode: false, practicalEndsAt: 0, _practicalCompletion: completion });
    expect(f.summary).toBeNull();
  });

  it('does not steal focus from another mounted lab', async () => {
    const first = await mountLab({ practicalMode: false, practicalEndsAt: 0 }), second = await mountLab();
    first.answer.focus(); await second.expire();
    expect(second.summary).not.toBeNull(); expect(document.activeElement).toBe(first.answer);
    expect(first.summary).toBeNull();
  });

  it('does not serialize transient practical completion into saved progress', async () => {
    const f = await mountLab(); await f.expire(); await flush(1000);
    expect(f.state._practicalCompletion).toMatchObject({ specimen: 'frog', quizSeed: 1234, message: 'Time up! Score: 3/5' });
    const raw = localStorage.getItem('dissection_progress_frog'); expect(raw).not.toBeNull();
    expect(JSON.parse(raw)).not.toHaveProperty('_practicalCompletion');
  });
});
