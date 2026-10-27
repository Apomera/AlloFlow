import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// This file is prepared for tests/migration_flight_challenges.test.js. The
// parent integrates it there; no browser or test runner is launched here.
let tool;
function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}
function mission(seed = {}, overrides = {}) {
  let state = { tab: 'flight3d', ...seed };
  let tree;
  const announce = vi.fn();
  const awardXP = vi.fn();
  const ctx = makeCtx({
    announceToSR: announce, awardXP,
    update: (toolId, key, value) => { expect(toolId).toBe('migration'); state = { ...state, [key]: value }; },
    updateMulti: (toolId, values) => { expect(toolId).toBe('migration'); state = { ...state, ...values }; },
    ...overrides
  });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  function find(predicate) { return walk(tree, predicate)[0]; }
  function action(name) { return find(node => node.props?.['data-flight-challenge-action'] === name); }
  function select(id) { find(node => node.props?.['data-flight-challenge'] === id).props.onClick(); draw(); }
  function edit(label, value) { find(node => node.type === 'textarea' && (node.props?.['data-migration-id'] === label || node.props?.['aria-label'] === label)).props.onChange({ target: { value } }); draw(); }
  function control(label, value) { find(node => (node.props?.['data-migration-id'] === label || node.props?.['aria-label'] === label)).props.onChange({ target: { value } }); draw(); }
  function load(prediction = 'I will change the named control and compare the model measurements.') {
    edit('migration-mission-prediction', prediction); action('load').props.onClick(); draw();
  }
  return {
    draw, find, action, select, edit, control, load, announce, awardXP,
    all: predicate => walk(tree, predicate),
    get state() { return state; },
    set: patch => { state = { ...state, ...patch }; },
    feedback: () => find(node => node.props?.['data-flight-challenge-feedback']).props['data-model-condition']
  };
}
const WIND_LABEL = 'Along-route wind in meters per second. Negative is headwind and positive is tailwind.';
const gooseStart = { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'solo', formation: 'solo', groundSpeed: 40, benefit: 0 };
const windStart = { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 };

beforeEach(() => {
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_LEARNING_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});

describe('Migration flight challenges', () => {
  it('starts collapsed and requires prediction before setup or recording, including direct handlers', () => {
    const ui = mission({ flightWind: 7 });
    ui.draw();
    const panel = ui.find(node => node.props?.['data-migration-flight-challenges']);
    expect(panel.type).toBe('details');
    expect(panel.props.open).toBeUndefined();
    expect(ui.action('load').props.disabled).toBe(true);
    expect(ui.action('check').props.disabled).toBe(true);
    ui.action('load').props.onClick();
    ui.action('check').props.onClick();
    expect(ui.state.flightChallenges).toBeUndefined();
    expect(ui.state.flightWind).toBe(7);
    expect(ui.feedback()).toBe('pending');
  });

  it('selects goals without changing controls, investigation, route facts, or per-goal notes', () => {
    const oldStudy = { variable: 'wind', prediction: 'Keep this prediction', baseline: gooseStart, trials: Array.from({ length: 6 }, (_, index) => ({ id: index + 1, variable: 'wind', prediction: 'Earlier trial', baseline: gooseStart, snapshot: { ...gooseStart, wind: 1 } })), evidence: 'Keep six trials', explanation: 'My explanation' };
    const seed = { flightSpecies: 'peregrine', flightWind: 7, flightSeason: 'spring', flightFormation: 'loose', flightCamera: 'side', flightPaused: true, selectedSpecies: 'monarch', aiExplorerText: 'Keep these route facts', inquiry: { hypothesis: 'Keep inquiry' }, flightInvestigation: oldStudy };
    const ui = mission(seed);
    ui.draw();
    ui.edit('migration-mission-prediction', 'Wind prediction');
    ui.edit('migration-mission-notes', 'Wind explanation');
    ui.select('formation');
    expect(ui.state).toMatchObject(seed);
    expect(ui.state.flightInvestigation).toBe(oldStudy);
    expect(ui.state.flightInvestigation.trials).toHaveLength(6);
    ui.edit('migration-mission-prediction', 'Formation prediction');
    ui.select('wind');
    expect(ui.draw()).toContain('Wind explanation');
    expect(ui.state.flightChallenges.work.wind.prediction).toBe('Wind prediction');
    expect(ui.state.flightChallenges.work.formation.prediction).toBe('Formation prediction');
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('loads the explicit Monarch setup and preserves unrelated flight preferences and learning work', () => {
    const oldStudy = { prediction: 'An open experiment', evidence: 'My evidence', trials: [] };
    const ui = mission({ selectedSpecies: 'peregrine', aiExplorerText: 'Peregrine facts', aiExplorerReqId: 19, flightCamera: 'study', flightPaused: true, flightSpeed: 2, flightShowAirflow: true, flightInvestigation: oldStudy, inquiry: { explanation: 'Still here' } });
    ui.draw(); ui.load('Less headwind should allow forward progress.');
    expect(ui.state).toMatchObject({ flightSpecies: 'monarch', flightWind: -15, flightSeason: 'fall', flightFormation: 'natural', selectedSpecies: 'peregrine', aiExplorerText: 'Peregrine facts', aiExplorerReqId: 19, flightCamera: 'study', flightPaused: true, flightSpeed: 2, flightShowAirflow: true, inquiry: { explanation: 'Still here' } });
    expect(ui.state.flightInvestigation).toBe(oldStudy);
    expect(ui.state.flightChallenges.work.wind.setup).toEqual(windStart);
    expect(ui.feedback()).toBe('not-met');
  });

  it('records real headwind recovery metrics without awarding XP or grading the explanation', () => {
    const ui = mission(); ui.draw(); ui.load();
    ui.control(WIND_LABEL, '4');
    ui.edit('migration-mission-notes', '0 mph became 21 mph while the species and swarm were unchanged.');
    expect(ui.feedback()).toBe('met');
    ui.action('check').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.wind.attempts[0]).toMatchObject({ baseline: windStart, snapshot: { speciesId: 'monarch', wind: 4, groundSpeed: 21, benefit: 0 }, notes: '0 mph became 21 mph while the species and swarm were unchanged.' });
    expect(ui.draw()).toContain('data-learning-feedback="challenge"');
    expect(ui.announce).not.toHaveBeenCalled();
    expect(ui.draw()).toContain('this check does not assess your explanation');
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('records unsuccessful attempts and rejects a species confound even when the speed target is exceeded', () => {
    const ui = mission(); ui.draw(); ui.load();
    ui.control(WIND_LABEL, '-10');
    expect(ui.feedback()).toBe('not-met');
    ui.action('check').props.onClick(); ui.draw();
    ui.control('3D migration focus species', 'peregrine');
    expect(ui.draw()).toContain('More than the target condition changed');
    expect(ui.feedback()).toBe('not-met');
    ui.action('check').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(2);
    expect(ui.all(node => node.props?.['data-flight-challenge-attempt'] && node.props['data-model-condition'] === 'met')).toHaveLength(0);
  });

  it('compares drafting credit independently of ground speed and ignores camera, pause, and layer choices', () => {
    const ui = mission(); ui.draw(); ui.select('formation'); ui.load('V formation will raise drafting credit without changing airspeed.');
    expect(ui.state.flightChallenges.work.formation.setup).toEqual(gooseStart);
    ui.control('3D migration flight pattern', 'v');
    ui.set({ flightCamera: 'aerial', flightPaused: true, flightShowAirflow: true }); ui.draw();
    expect(ui.feedback()).toBe('met');
    ui.action('check').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.formation.attempts[0]).toMatchObject({ baseline: { groundSpeed: 40, benefit: 0 }, snapshot: { groundSpeed: 40, benefit: 22, formation: 'v' } });
    ui.control(WIND_LABEL, '1');
    expect(ui.feedback()).toBe('not-met');
  });

  it('checks the actual season control and shows the canonical route endpoints in both directions', () => {
    const ui = mission(); ui.draw(); ui.select('season'); ui.load('Spring should lead back toward the northern breeding range.');
    ui.control('Migration season and direction', 'spring');
    expect(ui.feedback()).toBe('met');
    const html = ui.draw();
    expect(html).toContain('Northern Canada &amp; Alaska → Southern US &amp; Mexico');
    expect(html).toContain('Southern US &amp; Mexico → Northern Canada &amp; Alaska');
    ui.action('check').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.season.attempts[0]).toMatchObject({ baseline: { season: 'fall', wind: 8, groundSpeed: 58, benefit: 22 }, snapshot: { season: 'spring', wind: 8, groundSpeed: 58, benefit: 22 } });
    ui.control('3D migration flight pattern', 'solo');
    expect(ui.feedback()).toBe('not-met');
  });

  it('keeps attempts frozen when predictions, notes, setup, or active goals change and after reloading', () => {
    const ui = mission(); ui.draw(); ui.load('First prediction');
    ui.edit('migration-mission-notes', 'First explanation'); ui.control(WIND_LABEL, '4');
    ui.action('check').props.onClick(); ui.draw();
    ui.edit('migration-mission-prediction', 'Second prediction');
    ui.edit('migration-mission-notes', 'Second explanation');
    ui.action('load').props.onClick(); ui.draw();
    ui.select('season'); ui.select('wind');
    const restored = mission(ui.state); restored.draw();
    expect(restored.state.flightChallenges.work.wind.attempts[0]).toMatchObject({ prediction: 'First prediction', notes: 'First explanation', snapshot: { wind: 4, groundSpeed: 21 } });
    expect(restored.draw()).toContain('Second explanation');
    expect(restored.all(node => node.props?.['data-flight-challenge-attempt'])).toHaveLength(1);
  });

  it('caps each goal at four attempts without evicting work and explicitly removes just one attempt', () => {
    const ui = mission(); ui.draw(); ui.load();
    for (let wind = 1; wind <= 4; wind++) { ui.control(WIND_LABEL, String(wind)); ui.action('check').props.onClick(); ui.draw(); }
    const saved = ui.state.flightChallenges.work.wind.attempts;
    expect(saved).toHaveLength(4);
    expect(ui.action('check').props.disabled).toBe(true);
    ui.action('check').props.onClick();
    expect(ui.state.flightChallenges.work.wind.attempts).toBe(saved);
    ui.find(node => node.props?.['aria-label'] === 'Remove challenge attempt 2').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.wind.attempts.map(row => row.snapshot.wind)).toEqual([1, 3, 4]);
    expect(ui.action('check').props.disabled).toBe(false);
    ui.select('formation'); ui.load();
    expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(3);
    expect(ui.state.flightChallenges.work.formation.attempts).toHaveLength(0);
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('recovers readable attempt snapshots and notes while recomputing stale derived values', () => {
    const ui = mission({ flightChallenges: { selectedId: {}, work: { wind: { prediction: {}, notes: 'Preserved notes', setup: { ...windStart, speciesId: 'canada_goose' }, attempts: [null, {}, { baseline: { ...windStart, groundSpeed: Infinity }, snapshot: { ...windStart, wind: 4, groundSpeed: -999, benefit: 99 }, prediction: 'Readable prediction', notes: 'Saved note' }] } } } });
    const html = ui.draw();
    expect(html).toContain('Some saved challenge data could not be read');
    expect(html).not.toMatch(/NaN|Infinity|\[object Object\]/);
    expect(ui.all(node => node.props?.['data-flight-challenge-attempt'])).toHaveLength(1);
    expect(ui.feedback()).toBe('pending');
    ui.edit('migration-mission-prediction', 'Recovered prediction');
    expect(ui.state.flightChallenges.work.wind).toMatchObject({ notes: 'Preserved notes', setup: null, attempts: [{ baseline: { groundSpeed: 0, benefit: 0 }, snapshot: { groundSpeed: 21, benefit: 0 }, notes: 'Saved note' }] });
  });

  // Removal focus and ownership are exercised with real React DOM in migration_removal_focus.test.js.

  it.each([null, 'old schema', [], { work: [] }, { selectedId: 'unknown', work: { wind: { attempts: 'bad', prediction: {}, notes: [] } } }])('renders malformed challenge state safely: %j', flightChallenges => {
    const ui = mission({ flightChallenges });
    expect(() => ui.draw()).not.toThrow();
    expect(ui.action('load').props.disabled).toBe(true);
    expect(ui.action('check').props.disabled).toBe(true);
  });

  it('translates new challenge strings and keeps canonical formation behavior independent of translated prose', () => {
    const ui = mission({}, { t: (key, fallback) => key.startsWith('stem.migration.mission_') ? 'Translated ' + key : /formation/i.test(key) ? 'Translated formation prose' : fallback || key });
    expect(ui.draw()).toContain('Translated stem.migration.mission_summary');
    ui.select('formation');
    const translatedView = document.createElement('div');
    translatedView.innerHTML = ui.draw();
    const prediction = translatedView.querySelector("[data-migration-id=\"migration-mission-prediction\"]");
    expect(prediction).not.toBeNull();
    expect(prediction.labels).toHaveLength(1);
    expect(prediction.labels[0].textContent.trim()).toBe('Translated stem.migration.mission_prediction_label');
    expect(prediction.hasAttribute('aria-label')).toBe(false);
    ui.edit('migration-mission-prediction', 'My translated prediction');
    ui.action('load').props.onClick(); ui.draw();
    ui.control('3D migration flight pattern', 'natural');
    expect(ui.feedback()).toBe('met');
    ui.action('check').props.onClick(); ui.draw();
    expect(ui.state.flightChallenges.work.formation.attempts[0].snapshot).toMatchObject({ formation: 'v', benefit: 22 });
  });
});
