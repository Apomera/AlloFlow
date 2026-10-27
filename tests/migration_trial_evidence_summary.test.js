import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
let tool;
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
const snapshot = (values = {}) => ({ speciesId: 'canada_goose', season: 'fall', formationMode: 'natural', wind: -4, ...values });
const trial = (values = {}) => ({ variable: 'wind', prediction: 'My saved prediction.', baseline: snapshot(), snapshot: snapshot({ wind: 10 }), ...values });
const notebook = (trials = [trial()], values = {}) => ({ variable: 'wind', prediction: 'My current prediction.', baseline: snapshot({ wind: 0 }), trials, evidence: 'My unchanged evidence.', explanation: 'My unchanged explanation.', ...values });
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightMotionReduced: true, flightInvestigation: notebook(),
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep Study words.' } }, inquiry: { hypothesis: 'Keep inquiry.' },
    flightChallenges: { work: { wind: { prediction: 'Keep challenge prediction.' } } }, ...seed }, refresh;
  const writes = [], announce = vi.fn(), awardXP = vi.fn();
  const update = patch => { writes.push(clone(patch)); state = { ...state, ...patch }; refresh(n => n + 1); };
  const ctx = makeCtx({ announceToSR: announce, awardXP, t: options.t || ((_key, fallback) => fallback),
    update: (_, key, value) => update({ [key]: value }), updateMulti: (_, patch) => update(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function View() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(View)));
  const ui = { host, writes, announce, awardXP, get state() { return state; },
    summary() { return host.querySelector('[data-trial-evidence-summary]'); },
    field() { return host.querySelector('[data-migration-id="migration-experiment-evidence"]'); },
    metric(name, side) { return ui.summary().querySelector('[data-evidence-metric="' + name + '"] [data-evidence-snapshot="' + side + '"] strong').textContent; },
    select(index = 1) { act(() => host.querySelector('[data-experiment-revisit="' + index + '"]').click()); writes.length = 0; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    close() { act(() => host.querySelector('[data-pair-review="close"]').click()); }
  };
  return ui;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); tool = loadTool(process.env.MIGRATION_EVIDENCE_SUMMARY_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => { act(() => { roots.forEach(root => root.unmount()); roots.clear(); }); window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Saved trial evidence measurements next to writing', () => {
  it('appears only for an explicitly selected saved pair and leaves the note fields mounted', () => {
    const ui = fixture(), field = ui.field(), explanation = ui.host.querySelector('[data-migration-id="migration-experiment-explanation"]');
    expect(ui.summary()).toBeNull(); ui.select();
    expect(ui.summary().closest('[data-trial-evidence-context]')).not.toBeNull();
    expect(ui.summary().getAttribute('data-trial-evidence-summary')).toBe('1');
    expect(ui.summary().getAttribute('aria-label')).toBe('Saved measurements for this trial');
    expect(ui.summary().querySelector('h4').textContent).toBe('Saved measurements for this trial');
    expect(ui.field()).toBe(field); expect(ui.host.querySelector('[data-migration-id="migration-experiment-explanation"]')).toBe(explanation);
    ui.close(); expect(ui.summary()).toBeNull(); expect(ui.field()).toBe(field);
  });
  it('names both saved model values and their signed change with the correct units', () => {
    const ui = fixture(); ui.select();
    expect(ui.metric('ground-speed', 'baseline')).toBe('31 mph'); expect(ui.metric('ground-speed', 'trial')).toBe('62 mph'); expect(ui.metric('ground-speed', 'change')).toBe('+31 mph');
    expect(ui.metric('drafting-credit', 'baseline')).toBe('22%'); expect(ui.metric('drafting-credit', 'trial')).toBe('22%'); expect(ui.metric('drafting-credit', 'change')).toBe('0 percentage points');
    expect([...ui.summary().querySelectorAll('dt')].map(node => node.textContent)).toEqual(['Ground speed', 'Modeled drafting credit']);
    expect([...ui.summary().querySelectorAll('[data-evidence-metric="ground-speed"] small')].map(node => node.textContent)).toEqual(['Saved baseline', 'Saved trial', 'Change']);
    expect(ui.summary().getAttribute('data-comparison')).toBe('controlled');
    expect(ui.summary().querySelector('[data-evidence-summary-scope]').textContent).toBe('Change is saved trial minus saved baseline. Model values come from this recorded pair. The current scene may differ.');
  });
  it('keeps the frozen selected pair separate from changed live settings and a replacement current baseline', () => {
    const ui = fixture(); ui.select(); const before = ui.summary().textContent;
    ui.set({ flightSpecies: 'monarch', flightWind: -15, flightFormation: 'solo', flightSeason: 'spring', flightPaused: false,
      flightInvestigation: { ...ui.state.flightInvestigation, variable: 'formation', baseline: snapshot({ wind: 20 }), prediction: 'A newer prediction.' } });
    expect(ui.summary().textContent).toBe(before); expect(ui.summary().textContent).not.toContain('A newer prediction.');
    expect(ui.summary().textContent).not.toMatch(/Showing saved/); expect(ui.writes).toEqual([]);
  });
  it('updates to the actually selected trial rather than the latest saved trial', () => {
    const ui = fixture({ flightInvestigation: notebook([trial(), trial({ baseline: snapshot({ wind: 0 }), snapshot: snapshot({ wind: 8 }) })]) });
    ui.select(2); expect(ui.summary().getAttribute('data-trial-evidence-summary')).toBe('2'); expect(ui.metric('ground-speed', 'baseline')).toBe('40 mph'); expect(ui.metric('ground-speed', 'trial')).toBe('58 mph');
    ui.select(1); expect(ui.summary().getAttribute('data-trial-evidence-summary')).toBe('1'); expect(ui.metric('ground-speed', 'baseline')).toBe('31 mph'); expect(ui.metric('ground-speed', 'trial')).toBe('62 mph');
  });
  it('removes the summary when the selected saved trial is removed', () => {
    const first = trial(), second = trial({ prediction: 'Second trial', snapshot: snapshot({ wind: 8 }) });
    const ui = fixture({ flightInvestigation: notebook([first, second]) }); ui.select(2);
    const trials = [first];
    ui.set({ flightInvestigation: { ...ui.state.flightInvestigation, trials } });
    expect(ui.summary()).toBeNull(); expect(ui.writes).toEqual([]); expect(ui.field().value).toBe('My unchanged evidence.');
  });
  it('derives legacy model values from saved conditions instead of trusting stale persisted metric fields', () => {
    const row = trial({ baseline: snapshot({ groundSpeed: 999, benefit: 999 }), snapshot: snapshot({ wind: 8, groundSpeed: -999, benefit: -999 }) });
    const work = notebook([row]), ui = fixture({ flightInvestigation: work }); ui.select();
    expect(ui.metric('ground-speed', 'baseline')).toBe('31 mph'); expect(ui.metric('ground-speed', 'trial')).toBe('58 mph'); expect(ui.metric('ground-speed', 'change')).toBe('+27 mph');
    expect(ui.metric('drafting-credit', 'baseline')).toBe('22%'); expect(ui.summary().textContent).not.toContain('999');
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.writes).toEqual([]);
  });
  it('keeps each mounted tool’s selected pair and values local', () => {
    const first = fixture(), second = fixture({ flightInvestigation: notebook([trial({ baseline: snapshot({ wind: 0 }), snapshot: snapshot({ wind: 8 }) })]) });
    first.select(); expect(second.summary()).toBeNull(); second.select();
    expect(first.metric('ground-speed', 'trial')).toBe('62 mph'); expect(second.metric('ground-speed', 'trial')).toBe('58 mph');
    first.close(); expect(first.summary()).toBeNull(); expect(second.metric('ground-speed', 'trial')).toBe('58 mph');
    expect(first.writes).toEqual([]); expect(second.writes).toEqual([]);
  });
  it('preserves writing focus, caret, scroll and unrelated learner work while the summary rerenders', () => {
    const ui = fixture(); ui.select(); const field = ui.field(), work = ui.state.flightInvestigation, other = clone({ study: ui.state.flightStudyObservations, inquiry: ui.state.inquiry, challenges: ui.state.flightChallenges });
    field.focus(); field.setSelectionRange(2, 9, 'backward'); field.scrollTop = 12;
    ui.set({ flightCamera: 'aerial', flightWind: 20 });
    expect(document.activeElement).toBe(field); expect(ui.field()).toBe(field); expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([2, 9, 'backward']); expect(field.scrollTop).toBe(12);
    expect(ui.state.flightInvestigation).toBe(work); expect({ study: ui.state.flightStudyObservations, inquiry: ui.state.inquiry, challenges: ui.state.flightChallenges }).toEqual(other);
    expect(ui.summary().querySelectorAll('button,input,textarea,select,[tabindex],[role="status"],[aria-live]')).toHaveLength(0); expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
  });
  it('identifies confounded pairs without claiming the chosen variable caused the numeric change', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ snapshot: snapshot({ speciesId: 'snow_goose', wind: 10, season: 'spring' }) })]) }); ui.select();
    expect(ui.summary().getAttribute('data-comparison')).toBe('confounded');
    expect(ui.summary().querySelector('[data-evidence-summary-status]').textContent).toBe('Other conditions changed · This pair cannot isolate the tested condition.');
    expect(ui.summary().querySelector('[data-evidence-summary-scope]').textContent).toContain('Model values come from this recorded pair');
  });
  it('reports unchanged and zero-credit pairs faithfully, including wind-limited Monarch speed', () => {
    const row = trial({ baseline: snapshot({ speciesId: 'monarch', wind: -15 }), snapshot: snapshot({ speciesId: 'monarch', wind: -15 }) });
    const ui = fixture({ flightInvestigation: notebook([row]) }); ui.select();
    expect(ui.summary().getAttribute('data-comparison')).toBe('unchanged'); expect(ui.metric('ground-speed', 'baseline')).toBe('0 mph'); expect(ui.metric('ground-speed', 'change')).toBe('0 mph');
    expect(ui.metric('drafting-credit', 'baseline')).toBe('0%'); expect(ui.metric('drafting-credit', 'change')).toBe('0 percentage points');
  });
  it('shows negative drafting changes in percentage points without implying faster flight', () => {
    const ui = fixture({ flightInvestigation: notebook([trial({ variable: 'formation', baseline: snapshot({ wind: 0 }), snapshot: snapshot({ wind: 0, formationMode: 'solo' }) })]) }); ui.select();
    expect(ui.metric('ground-speed', 'change')).toBe('0 mph'); expect(ui.metric('drafting-credit', 'baseline')).toBe('22%'); expect(ui.metric('drafting-credit', 'trial')).toBe('0%'); expect(ui.metric('drafting-credit', 'change')).toBe('-22 percentage points');
  });
  it('uses translated headings, saved-role labels, scope and units', () => {
    const ui = fixture({}, { t: (_key, fallback) => '[translated] ' + fallback }); ui.select();
    expect(ui.summary().getAttribute('aria-label')).toBe('[translated] Saved measurements for this trial');
    expect(ui.summary().querySelector('h4').textContent).toBe('[translated] Saved measurements for this trial');
    expect(ui.summary().querySelector('[data-evidence-snapshot="baseline"] small').textContent).toBe('[translated] Saved baseline');
    expect(ui.metric('ground-speed', 'baseline')).toBe('31 [translated] mph'); expect(ui.summary().querySelector('[data-evidence-summary-scope]').textContent).toContain('[translated] Change is saved trial minus saved baseline');
  });
});
