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
const fixtures = [], settle = () => new Promise(resolve => setTimeout(resolve, 20));
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state, closed = false;
  function Lab() {
    const [data, setter] = React.useState({ dissection: {
      specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced', reducedMotion: true,
      quizMode: true, quizSeed: 1234, quizIdx: 0, quizScore: 0, quizTotal: 0,
      quizFirstAttemptScore: 0, quizFirstAttemptTotal: 0, quizSupportedCount: 0,
      quizReviewQueue: [], assessmentEvidence: {}, _labReportPreviewOpen: true,
      exploredOrgans: {}, organNotes: { 'frog|dorsal_skin': 'Keep my note.' }, organConfidence: {}, ...patch,
    } });
    state = data.dissection;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const f = { host, root, awardXP, get state() { return state; },
    target() {
      const pool = state.quizReviewMode
        ? Object.values(catalog.frog.organs).flat().filter(organ => (state._quizReviewSession?.ids || state.quizReviewQueue).includes(organ.id))
        : catalog.frog.organs.skin;
      return order(pool, 'frog|assessment|' + state.quizSeed)[state.quizIdx || 0];
    },
    button(label) { return [...host.querySelectorAll('button')].find(button => button.textContent === label); },
    async click(button) { expect(button).toBeTruthy(); await act(async () => button.click()); await act(async () => { await settle(); }); },
    async answer(kind = 'correct') {
      const target = this.target(), choices = () => [...host.querySelectorAll('#diss-quiz-panel .diss-quiz-option')];
      if (kind !== 'correct') await this.click(choices().find(button => button.textContent !== target.name));
      if (kind === 'reveal') await this.click(this.button('Show answer · supported practice'));
      else await this.click(choices().find(button => button.textContent === target.name));
      await this.click(host.querySelector('#diss-quiz-continue'));
    },
    async report() {
      if (state.quizMode) await this.click(host.querySelector('#diss-route-explore'));
      if (!state.toolbarToolsOpen) await this.click(host.querySelector('[aria-label="Lab tool options"]'));
      return host.querySelector('#diss-lab-report-preview').value;
    },
    async close() { if (closed) return; closed = true; await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(f); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); });
  return f;
}
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) await f.close(); await settle(); localStorage.clear(); vi.restoreAllMocks(); });

describe('completed assessment result snapshot', () => {
  it('keeps the completed result support count after starting and leaving a fresh assessment', async () => {
    const f = await mount();
    await f.answer('retry'); await f.answer('reveal'); await f.answer(); await f.answer();
    expect(f.state.quizComplete).toBe(true); expect(f.state.assessmentRecordedScore).toBe(2);
    expect(f.state.assessmentRecordedTotal).toBe(4); expect(f.state.quizSupportedCount).toBe(2);
    expect(f.host.querySelector('#diss-assessment-summary').textContent).toContain('2 questions completed with retry or answer support');
    await f.click(f.button('Try a new assessment'));
    expect(f.state.quizSupportedCount).toBe(0);
    expect(await f.report()).toContain('Completed first-attempt assessment: 2/4; supported practice: 2');
    expect(f.state.organNotes['frog|dorsal_skin']).toBe('Keep my note.');
  });

  it('keeps review tied to the completed support count after a different unfinished set', async () => {
    const f = await mount({ assessmentCompletedAt: 123, assessmentRecordedScore: 2, assessmentRecordedTotal: 4,
      assessmentRecordedSupportedCount: 2, quizReviewQueue: ['tympanum'] });
    await f.answer('reveal'); expect(f.state.quizSupportedCount).toBe(1);
    expect(await f.report()).toContain('Completed first-attempt assessment: 2/4; supported practice: 2');
    await f.click(f.host.querySelector('#diss-review-missed-structures'));
    await f.answer();
    expect(f.state.quizComplete).toBe(true); expect(f.state.assessmentRecordedSupportedCount).toBe(2);
    expect(f.state.assessmentRecordedScore).toBe(2); expect(f.state.assessmentRecordedTotal).toBe(4);
    expect(f.host.querySelector('[data-assessment-support-summary]').textContent).toContain('2 questions completed with retry or answer support');
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('replaces the old support snapshot with an explicit zero when a new set is completed without support', async () => {
    const f = await mount({ assessmentCompletedAt: 123, assessmentRecordedScore: 2, assessmentRecordedTotal: 4,
      assessmentRecordedSupportedCount: 2 });
    for (let i = 0; i < 4; i++) await f.answer();
    expect(f.state.assessmentRecordedSupportedCount).toBe(0);
    expect(await f.report()).toContain('Completed first-attempt assessment: 4/4; supported practice: 0');
  });

  it('saves and reloads completed support separately from an unfinished session count', async () => {
    const f = await mount({ assessmentCompletedAt: 123, assessmentRecordedScore: 2, assessmentRecordedTotal: 4,
      assessmentRecordedSupportedCount: 2 });
    await f.answer('reveal'); expect(f.state.quizSupportedCount).toBe(1);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.assessmentRecordedSupportedCount).toBe(2); expect(saved.quizSupportedCount).toBe(1);
    await f.close();
    const restored = await mount({ _dissLoadedSpec: null, quizMode: false });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)); });
    expect(restored.state.assessmentRecordedSupportedCount).toBe(2); expect(restored.state.quizSupportedCount).toBe(1);
    expect(await restored.report()).toContain('Completed first-attempt assessment: 2/4; supported practice: 2');
  });

  it('marks legacy completed support as unrecorded instead of copying a mutable live-session count', async () => {
    const f = await mount({ quizMode: false, assessmentCompletedAt: 123, assessmentRecordedScore: 2,
      assessmentRecordedTotal: 4, quizSupportedCount: 3, quizReviewQueue: ['tympanum'] });
    expect(await f.report()).toContain('Completed first-attempt assessment: 2/4; supported practice: Not recorded');
    await f.click(f.host.querySelector('#diss-review-missed-structures')); await f.answer();
    expect(f.state.assessmentRecordedSupportedCount).toBeNull();
    expect(f.host.querySelector('[data-assessment-support-summary]').textContent).toContain('Support use for the completed assessment was not recorded');
    expect(f.host.querySelector('[data-assessment-support-summary]').textContent).not.toContain('0 questions');
  });

  it('preserves an explicit completed zero even when the live session used support', async () => {
    const f = await mount({ quizMode: false, assessmentCompletedAt: 123, assessmentRecordedScore: 4,
      assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: 0, quizSupportedCount: 3 });
    expect(await f.report()).toContain('Completed first-attempt assessment: 4/4; supported practice: 0');
  });

  it('clears the snapshot only after a confirmed specimen reset', async () => {
    const f = await mount({ quizMode: false, toolbarToolsOpen: true, assessmentCompletedAt: 123,
      assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: 2 });
    await f.click(f.host.querySelector('#diss-reset-specimen'));
    await f.click(f.host.querySelector('#diss-reset-cancel'));
    expect(f.state.assessmentRecordedSupportedCount).toBe(2);
    await f.click(f.host.querySelector('#diss-reset-specimen')); await f.click(f.host.querySelector('#diss-reset-confirm'));
    expect(f.state.assessmentRecordedSupportedCount).toBeNull(); expect(f.state.assessmentCompletedAt).toBe(0);
  });

  it('isolates the completed snapshot when switching specimens and restores it when returning', async () => {
    const f = await mount({ quizMode: false, assessmentCompletedAt: 123, assessmentRecordedScore: 2,
      assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: 2 });
    await f.click(f.host.querySelector('[aria-label="Select specimen: ' + catalog.pig.name + '"]'));
    expect(f.state.specimen).toBe('pig'); expect(f.state.assessmentRecordedSupportedCount).toBeNull();
    await f.click(f.host.querySelector('[aria-label="Select specimen: ' + catalog.frog.name + '"]'));
    expect(f.state.specimen).toBe('frog'); expect(f.state.assessmentRecordedSupportedCount).toBe(2);
  });
});

describe('completed support count validation', () => {
  const completedSupport = productionFunction('dissectionCompletedSupportCount');
  it.each([undefined, null, '2', -1, 1.5, 5, NaN, Infinity])('treats unavailable or invalid count %s as unrecorded', count => {
    expect(completedSupport({ assessmentCompletedAt: 123, assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: count, quizSupportedCount: 2 })).toBeNull();
  });
  it.each([0, 2, 4])('retains a valid completed count %s', count => {
    expect(completedSupport({ assessmentCompletedAt: 123, assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: count })).toBe(count);
  });
  it('does not represent unfinished-session support as a completed result', () => {
    expect(completedSupport({ assessmentRecordedTotal: 4, assessmentRecordedSupportedCount: 2 })).toBeNull();
  });
});
