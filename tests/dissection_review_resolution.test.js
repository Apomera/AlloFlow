import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const match = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  const start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, source.indexOf(ending, start) + ending.length) + ');')(...Object.values(bindings));
}
const order = productionFunction('dissStableOrder', { dissHash: productionFunction('dissHash') });
const catalogStart = source.indexOf('var SPECIMENS = ') + 'var SPECIMENS = '.length;
const catalogEnd = source.indexOf('// ════════ ACTIVE STATE', catalogStart);
const catalog = new Function('return ' + source.slice(catalogStart, catalogEnd))();

async function mountLab(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), pluginInstanceToken = {}, awardXP = vi.fn();
  let state;
  const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', visualRealism: 'accessible', reducedMotion: true, soundEnabled: false,
    quizMode: true, quizReviewMode: true, quizReviewQueue: ['ventral_skin'], quizSeed: 42, quizIdx: 0,
    quizScore: 0, quizTotal: 0, quizSupportedCount: 2, quizFirstAttemptScore: 3, quizFirstAttemptTotal: 5,
    assessmentCompletedAt: 123, assessmentRecordedScore: 3, assessmentRecordedTotal: 5,
    exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'Lighter surface underneath.' },
    organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: {},
    assessmentEvidence: { 'frog|tympanum': { correct: true, at: 100 } },
    revealedLayers: {}, procedureByLayer: {}, ...patch };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, pluginInstanceToken, awardXP }));
  }
  const f = { host, awardXP, get state() { return state; },
    target() {
      const session = state._quizReviewSession;
      const ids = session && session.scope === 'frog|assessment|' + state.quizSeed ? session.ids : state.quizReviewQueue;
      const pool = Object.values(catalog.frog.organs).flat().filter(organ => ids.includes(organ.id));
      return order(pool, 'frog|assessment|' + state.quizSeed)[state.quizIdx];
    },
    async click(button) {
      expect(button).toBeTruthy(); button.focus();
      await act(async () => { button.click(); }); await act(async () => { await settle(); });
    },
    async answer(kind) {
      const target = this.target();
      const choices = [...host.querySelectorAll('#diss-quiz-panel .diss-quiz-option')];
      if (kind !== 'correct') {
        await this.click(choices.find(button => button.getAttribute('aria-label') !== target.name));
        expect(state.quizRetry.questionId).toBe(target.id);
      }
      if (kind === 'reveal') {
        await this.click([...host.querySelectorAll('#diss-quiz-panel button')].find(button => button.textContent.startsWith('Show answer')));
      } else {
        await this.click([...host.querySelectorAll('#diss-quiz-panel .diss-quiz-option')].find(button => button.getAttribute('aria-label') === target.name));
      }
      await this.click(host.querySelector('#diss-quiz-continue'));
      return target.id;
    },
    async close() { await act(async () => { root.unmount(); }); host.remove(); }
  };
  fixtures.push(f);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return f;
}
function firstAttemptEvidence(state) {
  return structuredClone(Object.fromEntries(['assessmentCompletedAt', 'assessmentRecordedScore', 'assessmentRecordedTotal',
    'assessmentEvidence', 'quizFirstAttemptScore', 'quizFirstAttemptTotal', 'quizSupportedCount',
    'verifiedIdentifications', 'exploredOrgans', 'organNotes', 'organConfidence'].map(key => [key, state[key]])));
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) await f.close(); await settle(); localStorage.clear(); vi.restoreAllMocks(); });

describe('supported review resolution', { timeout: 30000 }, () => {
  it('keeps an answer-revealed structure queued and explains why it needs another attempt', async () => {
    const f = await mountLab(), before = firstAttemptEvidence(f.state);
    await f.answer('reveal');
    expect(f.state.quizComplete).toBe(true); expect(f.state.quizReviewQueue).toEqual(['ventral_skin']);
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('0/1');
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('remain in review');
    expect(f.host.querySelector('#diss-assessment-summary').textContent).toContain('Review remaining structures');
    expect(firstAttemptEvidence(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['correct', 'retry'])('resolves a %s supported response without changing first-attempt mastery', async kind => {
    const f = await mountLab(), before = firstAttemptEvidence(f.state);
    await f.answer(kind);
    expect(f.state.quizReviewQueue).toEqual([]); expect(f.state.quizComplete).toBe(true);
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('1/1');
    expect(firstAttemptEvidence(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('retains revealed and unasked items across five-question batches, then resolves them with correct responses', async () => {
    const ids = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating', 'heart', 'lungs'];
    const f = await mountLab({ quizReviewQueue: ids }), before = firstAttemptEvidence(f.state), resolved = [], revealed = [];
    for (let i = 0; i < 5; i++) {
      const reveal = i === 1 || i === 3;
      const id = await f.answer(reveal ? 'reveal' : 'correct');
      (reveal ? revealed : resolved).push(id);
    }
    expect(f.state.quizComplete).toBe(true);
    expect(f.state.quizReviewQueue).toEqual(ids.filter(id => !resolved.includes(id)));
    expect(f.state.quizReviewQueue).toHaveLength(3);
    for (const id of revealed) expect(f.state.quizReviewQueue).toContain(id);
    expect(f.host.querySelector('[data-review-resolution-summary]').textContent).toContain('3/5');
    await f.click([...f.host.querySelectorAll('#diss-assessment-summary button')].find(button => button.textContent === 'Review remaining structures'));
    expect(f.state._quizReviewResolution).toBeNull(); expect(f.state.quizIdx).toBe(0);
    expect(f.state.quizScore).toBe(0); expect(f.state.quizTotal).toBe(0);
    for (let i = 0; i < 3; i++) await f.answer('correct');
    expect(f.state.quizReviewQueue).toEqual([]); expect(f.state.quizComplete).toBe(true);
    expect(firstAttemptEvidence(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each(['frog|assessment|41', 'sheepEye|assessment|42'])('ignores resolution credit from another session: %s', async scope => {
    const f = await mountLab({ quizTotal: 1, quizFeedback: { correct: false, supported: true, chosen: 'dorsal_skin' },
      _quizReviewResolution: { scope, ids: ['ventral_skin'] } });
    await f.click(f.host.querySelector('#diss-quiz-continue'));
    expect(f.state.quizReviewQueue).toEqual(['ventral_skin']); expect(f.state.quizComplete).toBe(true);
  });
});
