import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
const fields = [
  ['migration-study-observation-note', 'My observation', 'stem.migration.study_observation_note'],
  ['migration-mission-prediction', 'My prediction: which control will I change, and why?', 'stem.migration.mission_prediction_label'],
  ['migration-mission-notes', 'My explanation: what numbers or route changes support my claim?', 'stem.migration.mission_notes_label'],
  ['migration-experiment-prediction', 'What do you predict, and why?', 'stem.migration.experiment_prediction_label'],
  ['migration-experiment-evidence', 'Evidence I noticed', 'stem.migration.experiment_evidence_label'],
  ['migration-experiment-explanation', 'How does the evidence support or challenge my prediction?', 'stem.migration.experiment_explanation_label']
];
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = walk(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : walk(node.props?.children, predicate);
}
function fixture(seed = {}, translate = (_key, fallback) => fallback) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose',
    flightShowAnatomy: true, flightStudyRegion: 'head', flightStudyObservationOpen: true,
    flightPaused: true, inquiry: { hypothesis: 'Keep the independent inquiry.' }, ...seed }, tree;
  const writes = [];
  const ctx = makeCtx({ t: translate,
    update: (_bucket, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; },
    updateMulti: (_bucket, patch) => { writes.push(patch); state = { ...state, ...patch }; }
  });
  const host = document.createElement('div'); document.body.append(host);
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    host.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(View));
    // Inspect the learning content as an expanded learner view, not hidden disclosure text.
    host.querySelectorAll('details').forEach(node => { node.open = true; });
  }
  draw();
  return {
    host, writes, draw, get state() { return state; },
    field(id) { return host.querySelector('[data-migration-id="' + id + '"]'); },
    edit(id, value) {
      const element = walk(tree, node => node.type === 'textarea' && node.props['data-migration-id'] === id);
      expect(element, id).not.toBeNull(); element.props.onChange({ target: { value } }); draw();
    },
    action(name) {
      const element = walk(tree, node => node.props?.['data-experiment-action'] === name);
      expect(element).not.toBeNull(); expect(element.props.disabled).toBe(false);
      element.props.onClick(); draw();
    },
    progress() { return [...host.querySelectorAll('[data-experiment-progress-status]')].map(node => node.textContent); }
  };
}
function nativePrompt(field) {
  // This unit gate checks native association and visible prompt text. Browser
  // coverage checks the computed accessible name; axe's text utility includes
  // a nested textarea's placeholder here and is not that browser-name oracle.
  expect(field.labels).toHaveLength(1);
  expect(field.labels[0].control).toBe(field);
  expect(field.hasAttribute('aria-label')).toBe(false);
  expect(field.hasAttribute('aria-labelledby')).toBe(false);
  const prompt = field.labels[0].cloneNode(true);
  prompt.querySelectorAll('input, select, textarea, button').forEach(node => node.remove());
  return prompt.textContent.trim();
}
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { document.body.innerHTML = ''; });

describe('Migration learning labels and understandable progress', () => {
  it.each(fields)('associates %s with its visible native prompt', (id, label) => {
    const ui = fixture(), field = ui.field(id);
    expect(field).not.toBeNull(); expect(field.tagName).toBe('TEXTAREA');
    expect(field.labels).toHaveLength(1);
    expect(field.labels[0].textContent.trim()).toBe(label);
    expect(field.hasAttribute('aria-label')).toBe(false);
    expect(nativePrompt(field)).toBe(label);
    expect(ui.writes).toEqual([]);
  });

  it('retains translated visible prompts in every native label', () => {
    const translations = Object.fromEntries(fields.map(([, label, key]) => [key, 'Traduit « ' + label + ' »']));
    const ui = fixture({}, (key, fallback) => translations[key] || fallback);
    for (const [id, , key] of fields) {
      expect(ui.field(id).labels[0].textContent.trim()).toBe(translations[key]);
      expect(nativePrompt(ui.field(id))).toBe(translations[key]);
    }
  });

  it('shows each investigation phase advancing only after its learning work is present', () => {
    const ui = fixture();
    expect(ui.progress()).toEqual(['Not yet complete', 'Not yet complete', 'Not yet complete']);
    ui.edit('migration-experiment-prediction', 'A tailwind will increase forward progress.');
    expect(ui.progress()).toEqual(['Prediction saved', 'Not yet complete', 'Not yet complete']);
    ui.action('baseline');
    expect(ui.progress()).toEqual(['Prediction saved', 'Baseline captured', 'Not yet complete']);
    ui.action('record');
    ui.edit('migration-experiment-evidence', 'I recorded the ground speed for comparison.');
    expect(ui.progress()).toEqual(['Prediction saved', 'Baseline captured', 'Not yet complete']);
    ui.edit('migration-experiment-explanation', 'The saved comparison supports a limited model claim.');
    expect(ui.progress()).toEqual(['Prediction saved', 'Baseline captured', 'Evidence saved']);
    const savedTrials = structuredClone(ui.state.flightInvestigation.trials);
    ui.edit('migration-experiment-explanation', '   ');
    expect(ui.progress()).toEqual(['Prediction saved', 'Baseline captured', 'Not yet complete']);
    expect(ui.state.flightInvestigation.trials).toEqual(savedTrials);
    expect(ui.state.inquiry).toEqual({ hypothesis: 'Keep the independent inquiry.' });
  });

  it('keeps completion words visible and readable without announcing decorative numbers', () => {
    const ui = fixture({}, (key, fallback) => ({
      'stem.migration.experiment_progress_prediction_saved': 'Prédiction enregistrée',
      'stem.migration.experiment_step_incomplete': 'Pas encore terminé'
    })[key] || fallback);
    ui.edit('migration-experiment-prediction', 'My prediction.');
    expect(ui.progress()).toEqual(['Prédiction enregistrée', 'Pas encore terminé', 'Pas encore terminé']);
    const steps = [...ui.host.querySelectorAll('[data-experiment-progress]')];
    expect(steps.map(node => node.getAttribute('data-experiment-progress'))).toEqual(['predict', 'capture', 'explain']);
    for (const step of steps) {
      const number = step.querySelector('b'), status = step.querySelector('[data-experiment-progress-status]');
      expect(number.getAttribute('aria-hidden')).toBe('true');
      expect(status.hidden).toBe(false); expect(status.closest('[aria-hidden="true"]')).toBeNull();
      expect(getComputedStyle(status).display).not.toBe('none');
    }
  });

  it('keeps all six editable fields independent and retains unrelated learner work', () => {
    const ui = fixture();
    fields.forEach(([id], index) => ui.edit(id, 'Evidence draft ' + index));
    fields.forEach(([id, label], index) => {
      expect(ui.field(id).value).toBe('Evidence draft ' + index);
      expect(nativePrompt(ui.field(id))).toBe(label);
    });
    expect(ui.state.flightStudyObservations.drafts['canada_goose:head']).toBe('Evidence draft 0');
    expect(ui.state.flightChallenges.work.wind).toMatchObject({ prediction: 'Evidence draft 1', notes: 'Evidence draft 2' });
    expect(ui.state.flightInvestigation).toMatchObject({ prediction: 'Evidence draft 3', evidence: 'Evidence draft 4', explanation: 'Evidence draft 5' });
    expect(ui.state.inquiry).toEqual({ hypothesis: 'Keep the independent inquiry.' });
    expect(ui.writes.every(patch => Object.keys(patch).every(key => ['flightStudyObservations', 'flightChallenges', 'flightInvestigation'].includes(key)))).toBe(true);
  });
});
