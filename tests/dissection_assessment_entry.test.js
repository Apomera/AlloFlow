import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 25));
const booleanOverlays = ['traceNervous', 'traceCirculation', 'traceDigestion', 'traceRespiration', 'traceExcretory',
  'showEndocrine', 'livingFunctionEnabled', 'livingFunctionPaused', 'rulerMode', 'annotateMode',
  'compareTechniqueAttempts', 'compareReplayPlaying', 'splitComparison', 'beforeTechniqueView',
  'inspectionLens', 'lensPinned', 'macroInset'];
const nullableOverlays = ['rulerStart', 'rulerEnd', 'lensPinnedPoint', 'lensPinnedOrganId', '_procedureDemo', '_procedureReplay'];
const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function productionFunction(name, bindings) {
  const match = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  const start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, source.indexOf(ending, start) + ending.length) + ');')(...Object.values(bindings));
}

async function mountLab(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), pluginInstanceToken = {}, awardXP = vi.fn();
  let state;
  const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    toolbarStudyOpen: true, labelMode: 'show', quizReviewQueue: ['tympanum'], quizSupportedCount: 1,
    assessmentCompletedAt: 123, assessmentRecordedScore: 2, assessmentRecordedTotal: 3,
    exploredOrgans: { 'frog|tympanum': true }, organNotes: { 'frog|tympanum': 'Round membrane behind the eye.' },
    organConfidence: { 'frog|tympanum': 2 }, verifiedIdentifications: {},
    assessmentEvidence: { 'frog|nictitating': { correct: true, at: 120 } },
    revealedLayers: {}, procedureByLayer: {}, attemptArchive: {}, visualEvidence: [],
    ...Object.fromEntries(booleanOverlays.map(key => [key, true])),
    rulerStart: { x: .2, y: .2 }, rulerEnd: { x: .4, y: .4 }, lensPinnedPoint: { x: .5, y: .5 },
    lensPinnedOrganId: 'tympanum', _procedureDemo: { layer: 'skin', startedAt: Date.now() },
    _procedureReplay: { layer: 'skin', specimen: 'frog', startedAt: Date.now(), actions: [] }, ...patch };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken, awardXP }));
  }
  const fixture = { host, awardXP, get state() { return state; },
    async click(selector) {
      const button = typeof selector === 'string' ? host.querySelector(selector) : selector;
      expect(button).not.toBeNull(); button.focus();
      await act(async () => { button.click(); }); await act(async () => { await settle(); });
    },
    async close() { await act(async () => { root.unmount(); }); host.remove(); }
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

function savedEvidence(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications',
    'assessmentEvidence', 'assessmentCompletedAt', 'assessmentRecordedScore', 'assessmentRecordedTotal',
    'revealedLayers', 'procedureByLayer', 'attemptArchive', 'visualEvidence'].map(key => [key, state[key]])));
}

beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => {
  for (const f of fixtures.splice(0).reverse()) await f.close();
  await settle(); localStorage.clear(); vi.restoreAllMocks();
});

describe('consistent dissection assessment entry', { timeout: 30000 }, () => {
  it.each(['route', 'missed review', 'new assessment', 'timed practical'])('clears teaching state through %s while preserving recorded work', async mode => {
    const f = await mountLab(mode === 'new assessment' ? { quizMode: true, quizComplete: true } : {});
    const before = savedEvidence(f.state), canvas = f.host.querySelector('[data-diss-canvas]');
    const timerCallback = vi.fn();
    canvas._dissTimers = Object.fromEntries(['procedureDemo', 'procedureReplay', 'compareReplay'].map(key => [key, setTimeout(timerCallback, 150)]));
    canvas._isPanning = true; canvas._panPointerId = 12;
    const control = mode === 'route' ? '#diss-route-quiz' : mode === 'missed review' ? '#diss-review-missed-structures'
      : mode === 'timed practical' ? '[aria-label="Start 2-minute timed practical"]'
      : [...f.host.querySelectorAll('button')].find(button => button.textContent === 'Try a new assessment');
    await f.click(control);
    expect(f.state.quizMode).toBe(true);
    for (const key of booleanOverlays) expect(f.state[key], key).toBe(false);
    for (const key of nullableOverlays) expect(f.state[key], key).toBeNull();
    expect(canvas._isPanning).toBe(false); expect(canvas._panPointerId).toBeNull();
    expect(canvas._dissTimers).toBeNull();
    expect(savedEvidence(f.state)).toEqual(before);
    expect(f.awardXP).not.toHaveBeenCalled();
    if (mode === 'missed review') {
      expect(f.state.quizReviewMode).toBe(true); expect(f.state.quizFirstAttemptScore).toBe(2);
      expect(f.state.quizFirstAttemptTotal).toBe(3); expect(f.state.quizSupportedCount).toBe(1);
    } else if (mode !== 'timed practical') {
      expect(f.state.quizFirstAttemptScore).toBe(0); expect(f.state.quizFirstAttemptTotal).toBe(0);
      expect(f.state.quizReviewQueue).toEqual(['tympanum']);
    } else {
      expect(f.state.practicalMode).toBe(true); expect(f.state.labelMode).toBe('hidden');
      expect(f.state.practicalTargetIds.length).toBeGreaterThanOrEqual(2);
    }
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 175)); });
    expect(timerCallback).not.toHaveBeenCalled();
  });

  it.each(['#diss-route-quiz', '#diss-review-missed-structures', '[aria-label="Start 2-minute timed practical"]'])('rejects %s during a pending layer reveal', async control => {
    const f = await mountLab({ _incisionAnim: { active: true, startTick: Date.now(), layerName: 'skin' } });
    const before = savedEvidence(f.state);
    await f.click(control);
    expect(f.state.quizMode).not.toBe(true); expect(f.state.practicalMode).not.toBe(true);
    expect(f.state._incisionAnim.active).toBe(true); expect(f.state.beforeTechniqueView).toBe(true);
    expect(f.state.quizReviewQueue).toEqual(['tympanum']);
    expect(f.state.procedureFeedback.message).toContain('Finish the current layer transition');
    expect(savedEvidence(f.state)).toEqual(before);
  });

  it('keeps a running practical and its responses intact even if restart is invoked directly', () => {
    const d = { practicalMode: true, practicalEndsAt: Date.now() + 60000, quizIdx: 2, quizScore: 1,
      quizTotal: 2, quizReviewQueue: ['tympanum'], quizFeedback: { correct: true } };
    const before = structuredClone(d), feedback = vi.fn(), reset = vi.fn();
    const blocked = productionFunction('assessmentEntryBlocked', { d, setProcedureFeedback: feedback });
    const restart = productionFunction('restartAssessmentSession', { d, assessmentEntryBlocked: blocked, resetAssessmentTeachingState: reset });
    expect(restart(true)).toBe(false); expect(d).toEqual(before); expect(reset).not.toHaveBeenCalled();
    expect(feedback.mock.calls[0][0]).toContain('End the timed practical');
  });

  it('leaves reference tools intact when no supported-review targets are available', async () => {
    const f = await mountLab({ quizMode: true, quizComplete: true, quizReviewQueue: [] });
    expect(f.host.querySelector('#diss-review-missed-structures')).toBeNull();
    const d = { quizReviewQueue: ['retired-id'] }, reset = vi.fn(), feedback = vi.fn();
    const restart = productionFunction('restartAssessmentSession', { d, quizReviewIds: [],
      assessmentEntryBlocked: () => false, resetAssessmentTeachingState: reset,
      upd: (key, value) => { d[key] = value; }, setProcedureFeedback: feedback });
    expect(restart(true)).toBe(false); expect(reset).not.toHaveBeenCalled();
    expect(d.quizReviewQueue).toEqual([]); expect(feedback.mock.calls[0][0]).toContain('No missed structures');
  });
});
