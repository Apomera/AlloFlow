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
const structures = Object.values(catalog.frog.organs).flat();
const fixtures = [], settle = () => new Promise(resolve => setTimeout(resolve, 20));
function mastery(state) {
  return structuredClone(Object.fromEntries(['quizFirstAttemptScore', 'quizFirstAttemptTotal', 'quizSupportedCount',
    'assessmentRecordedScore', 'assessmentRecordedTotal', 'assessmentCompletedAt', 'assessmentEvidence',
    'verifiedIdentifications', 'exploredOrgans', 'organNotes', 'organConfidence'].map(key => [key, state[key]])));
}
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, closed = false;
  function Lab() {
    const [data, setter] = React.useState({ dissection: {
      specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', reducedMotion: true, workspaceMode: 'advanced',
      quizMode: true, quizReviewMode: true, quizSeed: 1234, quizIdx: 0, quizScore: 0, quizTotal: 0,
      quizFirstAttemptScore: 3, quizFirstAttemptTotal: 5, quizSupportedCount: 2,
      assessmentRecordedScore: 3, assessmentRecordedTotal: 5, assessmentCompletedAt: 123,
      quizReviewQueue: ['tympanum', 'dorsal_skin'], assessmentEvidence: { 'frog|nictitating': { correct: true, at: 42 } },
      exploredOrgans: { 'frog|dorsal_skin': true }, verifiedIdentifications: {},
      organNotes: { 'frog|dorsal_skin': 'Keep this note.' }, organConfidence: { 'frog|dorsal_skin': 2 }, ...patch,
    } });
    state = data.dissection;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const f = { host, root, awardXP, get state() { return state; },
    batch() {
      const session = state._quizReviewSession;
      const ids = session && session.scope === 'frog|assessment|' + state.quizSeed ? session.ids : state.quizReviewQueue;
      return order(structures.filter(organ => ids.includes(organ.id)), 'frog|assessment|' + state.quizSeed).slice(0, 5);
    },
    async click(button) { expect(button).toBeTruthy(); await act(async () => button.click()); await act(async () => { await settle(); }); },
    async answer(kind = 'correct', next = true) {
      const target = this.batch()[state.quizIdx || 0]; expect(target).toBeTruthy();
      const choices = () => [...host.querySelectorAll('#diss-quiz-panel .diss-quiz-option')];
      if (kind !== 'correct') await this.click(choices().find(button => button.textContent !== target.name));
      if (kind === 'reveal') await this.click([...host.querySelectorAll('#diss-quiz-panel button')].find(button => button.textContent.startsWith('Show answer')));
      else await this.click(choices().find(button => button.textContent === target.name));
      if (next) await this.click(host.querySelector('#diss-quiz-continue'));
      return target.id;
    },
    async close() { if (closed) return; closed = true; await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(f); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); });
  return f;
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) await f.close(); await settle(); localStorage.clear(); vi.restoreAllMocks(); });

describe('interrupted supported review', () => {
  it('keeps a correctly answered item resolved after leaving mid-batch and starts the next review with only the remaining item', async () => {
    const f = await mount(), before = mastery(f.state), expected = f.batch().map(organ => organ.id);
    const resolved = await f.answer(); expect(resolved).toBe(expected[0]);
    await f.click(f.host.querySelector('#diss-route-explore'));
    expect(f.state.quizReviewQueue).toEqual(expected.filter(id => id !== resolved));
    const remaining = f.host.querySelector('#diss-review-missed-structures'); expect(remaining.textContent).toContain('1');
    await f.click(remaining);
    expect(f.batch().map(organ => organ.id)).toEqual([expected[1]]);
    await f.answer(); expect(f.state.quizComplete).toBe(true); expect(f.state.quizReviewQueue).toEqual([]);
    expect(mastery(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('commits a correct review response before Continue without shifting its feedback or the next question', async () => {
    const f = await mount(), expected = f.batch().map(organ => organ.id);
    const resolved = await f.answer('correct', false);
    expect(f.state.quizReviewQueue).toEqual(expected.filter(id => id !== resolved));
    expect(f.host.querySelector('#diss-quiz-panel').textContent).toContain('Correct with support — ' + structures.find(organ => organ.id === resolved).name);
    await f.click(f.host.querySelector('#diss-quiz-continue'));
    expect(f.batch()[f.state.quizIdx].id).toBe(expected[1]);
    await f.answer(); expect(f.state.quizComplete).toBe(true);
  });

  it('retains revealed and unasked items in a longer queue while every original batch question stays in order', async () => {
    const ids = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating', 'heart', 'lungs'];
    const f = await mount({ quizReviewQueue: ids }), before = mastery(f.state), batch = f.batch().map(organ => organ.id), resolved = [];
    for (let i = 0; i < 5; i++) {
      const target = await f.answer(i === 1 ? 'reveal' : 'correct', false);
      expect(target).toBe(batch[i]);
      if (i !== 1) resolved.push(target);
      expect(f.state.quizReviewQueue).toEqual(ids.filter(id => !resolved.includes(id)));
      expect(f.state._quizReviewSession.ids).toEqual(batch);
      expect(f.host.querySelector('#diss-quiz-panel')).not.toBeNull();
      await f.click(f.host.querySelector('#diss-quiz-continue'));
    }
    expect(f.state.quizComplete).toBe(true);
    expect(f.state.quizReviewQueue).toHaveLength(2); expect(f.state.quizReviewQueue).toContain(batch[1]);
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('4/5');
    expect(mastery(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
    await f.click([...f.host.querySelectorAll('#diss-assessment-summary button')].find(button => button.textContent === 'Review remaining structures'));
    expect(new Set(f.state._quizReviewSession.ids)).toEqual(new Set(f.state.quizReviewQueue));
    expect(f.state._quizReviewSession.ids).toHaveLength(2);
  });

  it.each(['correct', 'retry'])('saves immediate %s resolution and restores only the remaining queue after closing the lab', async kind => {
    const f = await mount(), before = mastery(f.state);
    const resolved = await f.answer(kind, false);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.quizReviewQueue).not.toContain(resolved); expect(saved.quizReviewQueue).toHaveLength(1);
    expect(saved._quizReviewSession).toBeUndefined();
    await f.close();
    const restored = await mount({ _dissLoadedSpec: null, quizMode: false, quizReviewMode: false, quizReviewQueue: [] });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
    expect(restored.state.quizReviewQueue).toEqual(saved.quizReviewQueue);
    expect(mastery(restored.state)).toEqual(before);
    await restored.click(restored.host.querySelector('#diss-review-missed-structures'));
    expect(restored.state._quizReviewSession.ids).toEqual(saved.quizReviewQueue);
    await restored.answer(); expect(restored.state.quizComplete).toBe(true); expect(restored.state.quizReviewQueue).toEqual([]);
    expect(restored.awardXP).not.toHaveBeenCalled();
  });

  it('keeps a revealed-only response pending when leaving before Continue', async () => {
    const f = await mount(), ids = f.state.quizReviewQueue.slice();
    await f.answer('reveal', false); await f.click(f.host.querySelector('#diss-route-study'));
    expect(f.state.quizReviewQueue).toEqual(ids);
    await f.click(f.host.querySelector('#diss-review-missed-structures'));
    expect(new Set(f.state._quizReviewSession.ids)).toEqual(new Set(ids));
  });

  it('keeps the final answered question on screen after its pending queue becomes empty', async () => {
    const f = await mount({ quizReviewQueue: ['dorsal_skin'] }); await f.answer('correct', false);
    expect(f.state.quizReviewQueue).toEqual([]); expect(f.state.quizComplete).not.toBe(true);
    expect(f.state._quizReviewSession.ids).toEqual(['dorsal_skin']);
    const panel = f.host.querySelector('#diss-quiz-panel');
    expect(panel.textContent).toContain('Correct with support — Dorsal Skin.');
    expect(panel.textContent).toContain('Question 1/1');
    expect(panel.querySelector('#diss-quiz-continue').textContent).toContain('View assessment summary');
    await f.click(panel.querySelector('#diss-quiz-continue'));
    expect(f.state.quizComplete).toBe(true);
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('1/1');
  });

  it.each(['frog|assessment|999', 'pig|assessment|1234'])('ignores a frozen batch belonging to another session: %s', scope => {
    return (async () => {
      const f = await mount({ _quizReviewSession: { scope, ids: ['heart'] } });
      expect(f.batch().map(organ => organ.id)).toEqual(['tympanum', 'dorsal_skin']);
      await f.answer('correct', false);
      expect(f.state._quizReviewSession).toEqual({ scope: 'frog|assessment|1234', ids: ['tympanum', 'dorsal_skin'] });
      expect(f.state.quizReviewQueue).toEqual(['dorsal_skin']);
    })();
  });
});
