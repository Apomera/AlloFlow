import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  if (node.props) walk(node.props.children, predicate, found);
  return found;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.props?.children) : String(node);
}
function review(seed = {}, overrides = {}) {
  let state = { tab: 'flight3d', ...seed }, tree;
  const update = vi.fn((_, key, value) => { state = { ...state, [key]: value }; });
  const updateMulti = vi.fn((_, values) => { state = { ...state, ...values }; });
  const awardXP = vi.fn();
  const ctx = makeCtx({ update, updateMulti, awardXP, ...overrides });
  function draw() {
    ctx.toolData = { migration: state };
    function View() { tree = tool.render(ctx); return tree; }
    return ReactDOMServer.renderToStaticMarkup(React.createElement(View));
  }
  function all(predicate) { return walk(tree, predicate); }
  function find(predicate) { return all(predicate)[0]; }
  function control(label, value) { find(node => node.props?.['aria-label'] === label).props.onChange({ target: { value } }); draw(); }
  function action(name) { find(node => node.props?.['data-flight-challenge-action'] === name).props.onClick(); draw(); }
  function select(id) { find(node => node.props?.['data-flight-challenge'] === id).props.onClick(); draw(); }
  function remove(number) { find(node => node.props?.['aria-label'] === 'Remove challenge attempt ' + number).props.onClick(); draw(); }
  function steps() { return Object.fromEntries(all(node => node.props?.['data-mission-progress-step']).map(node => [node.props['data-mission-progress-step'], node.props['data-recorded']])); }
  function rows() { return all(node => node.props?.['data-flight-challenge-review']); }
  function load() { control('Flight challenge prediction', 'Changing the named control should change the model result.'); action('load'); }
  function wind(value) { control('Along-route wind in meters per second. Negative is headwind and positive is tailwind.', String(value)); }
  draw();
  return { draw, all, find, control, action, select, remove, load, wind, steps, rows, update, updateMulti, awardXP, get state() { return state; } };
}
const windStart = { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 };
function savedWind(wind, notes = '', prediction = 'Saved prediction') { return { baseline: windStart, snapshot: { ...windStart, wind }, prediction, notes }; }

beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });

describe('Migration challenge evidence review', () => {
  it('derives an empty progress record without creating or changing saved work', () => {
    const notebook = { prediction: 'Unrelated retained work', trials: [] };
    const ui = review({ flightInvestigation: notebook, flightWind: 7 });
    expect(ui.steps()).toEqual({ prediction: 'false', attempt: 'false', model: 'false', evidence: 'false' });
    expect(ui.find(node => node.props?.['data-flight-challenge'] === 'wind').props['data-evidence-steps']).toBe(0);
    expect(ui.rows()).toHaveLength(0);
    expect(ui.update).not.toHaveBeenCalled();
    expect(ui.updateMulti).not.toHaveBeenCalled();
    expect(ui.state.flightChallenges).toBeUndefined();
    expect(ui.state.flightInvestigation).toBe(notebook);
    expect(ui.state.flightWind).toBe(7);
  });

  it('advances evidence steps only when model comparisons and explanations are saved', () => {
    const ui = review(); ui.load();
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'false', model: 'false', evidence: 'false' });
    ui.wind(-10); ui.action('check');
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'true', model: 'false', evidence: 'false' });
    ui.wind(4);
    expect(ui.steps().model).toBe('false');
    ui.action('check');
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'true', model: 'true', evidence: 'false' });
    ui.control('Flight challenge explanation', 'The model went from 0 to 21 mph with wind as the only effective change.');
    expect(ui.steps().evidence).toBe('false');
    ui.action('check');
    expect(ui.steps().evidence).toBe('true');
    expect(ui.find(node => node.props?.['data-flight-challenge'] === 'wind').props['data-evidence-steps']).toBe(4);
    expect(ui.draw()).toContain('its quality is not graded');
    expect(ui.awardXP).not.toHaveBeenCalled();
    expect(ui.state.flightChallenges.work.wind.attempts[1].notes).toBe('');
  });

  it('compares real saved outcomes and marks the latest model match rather than the fastest attempt', () => {
    const ui = review(); ui.load();
    ui.wind(8); ui.control('Flight challenge explanation', 'First model evidence'); ui.action('check');
    ui.wind(4); ui.action('check');
    ui.wind(-10); ui.action('check');
    const rows = ui.rows();
    expect(rows).toHaveLength(3);
    expect(rows.map(row => row.props['data-latest-model-match'])).toEqual(['false', 'true', 'false']);
    expect(text(rows[0])).toContain('Wind: -15 → +8 m/s');
    expect(text(rows[0])).toContain('0 → 30');
    expect(text(rows[1])).toContain('Latest model match');
    expect(text(rows[1])).toContain('0 → 21');
    expect(text(rows[1])).toContain('Explanation recorded · ungraded');
    expect(text(rows[2])).toContain('Model condition not met');
  });

  it('separates confounded changes from target evidence even when the recorded speed is high', () => {
    const ui = review(); ui.load();
    ui.wind(4); ui.control('3D migration focus species', 'peregrine');
    ui.control('Flight challenge explanation', 'An explanation is present but two flight conditions changed.');
    ui.action('check');
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'true', model: 'false', evidence: 'false' });
    expect(text(ui.rows()[0])).toContain('Other conditions changed');
    expect(text(ui.rows()[0])).toMatch(/Species: Monarch Butterfly → Peregrine Falcon/);
    expect(text(ui.rows()[0])).toContain('Wind: -15 → +4 m/s');
    expect(ui.rows()[0].props['data-latest-model-match']).toBe('false');
  });

  it('rederives latest match and progress after removal while retaining the other goal and investigation', () => {
    const notebook = { prediction: 'Keep the investigation', trials: [] };
    const ui = review({ flightInvestigation: notebook }); ui.load();
    ui.wind(4); ui.control('Flight challenge explanation', 'First saved reasoning'); ui.action('check');
    ui.control('Flight challenge explanation', ''); ui.wind(5); ui.action('check');
    ui.wind(-10); ui.action('check');
    ui.select('formation'); ui.control('Flight challenge prediction', 'Keep formation prediction'); ui.select('wind');
    ui.remove(2);
    expect(ui.rows().map(row => row.props['data-latest-model-match'])).toEqual(['true', 'false']);
    expect(ui.steps().evidence).toBe('true');
    ui.remove(1);
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'true', model: 'false', evidence: 'false' });
    expect(ui.rows()[0].props['data-latest-model-match']).toBe('false');
    expect(ui.state.flightChallenges.work.formation.prediction).toBe('Keep formation prediction');
    expect(ui.state.flightInvestigation).toBe(notebook);
    expect(ui.state.flightChallenges.work.wind.attempts.map(row => row.snapshot.wind)).toEqual([-10]);
  });

  it('uses retained predictions, recomputes old measurements, and ignores whitespace explanations without mutating saved data', () => {
    const challenges = { selectedId: 'wind', work: { wind: { prediction: '', notes: 'Current notes do not retroactively change attempts', setup: windStart, attempts: [savedWind(4, '   ')] } } };
    challenges.work.wind.attempts[0].snapshot.groundSpeed = 9999;
    challenges.work.wind.attempts[0].snapshot.benefit = 99;
    const ui = review({ flightChallenges: challenges });
    expect(ui.steps()).toEqual({ prediction: 'true', attempt: 'true', model: 'true', evidence: 'false' });
    expect(text(ui.rows()[0])).toContain('0 → 21');
    expect(text(ui.rows()[0])).toContain('0 → 0');
    expect(text(ui.rows()[0])).toContain('Explanation not recorded');
    expect(ui.state.flightChallenges).toBe(challenges);
    expect(challenges.work.wind.attempts[0].snapshot.groundSpeed).toBe(9999);
    expect(ui.update).not.toHaveBeenCalled();
  });

  it('compares season reversal with the same speed and only the season listed as an effective change', () => {
    const ui = review(); ui.select('season'); ui.load();
    ui.control('Migration season and direction', 'spring');
    ui.control('Flight challenge explanation', 'Spring reverses the destination without changing these model speeds.');
    ui.action('check');
    expect(text(ui.rows()[0])).toContain('Season: Fall → Spring');
    expect(text(ui.rows()[0])).toContain('58 → 58');
    expect(text(ui.rows()[0])).not.toContain('Wind:');
    expect(ui.steps().evidence).toBe('true');
  });

  it('describes equivalent effective formation choices as unchanged rather than target evidence', () => {
    const ui = review(); ui.select('season'); ui.load();
    ui.control('3D migration flight pattern', 'v'); ui.action('check');
    expect(text(ui.rows()[0])).toContain('No effective condition changed');
    expect(text(ui.rows()[0])).toContain('Unchanged conditions');
    expect(ui.steps().model).toBe('false');
  });

  it('provides native table semantics and a named keyboard-scroll region for narrow screens', () => {
    const ui = review({ flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Saved', notes: '', setup: windStart, attempts: [savedWind(4)] } } } });
    const region = ui.find(node => node.props?.['aria-label'] === 'Saved challenge attempt comparisons');
    expect(region.props.role).toBe('region');
    expect(region.props.tabIndex).toBe(0);
    expect(walk(region, node => node.type === 'table')).toHaveLength(1);
    expect(text(walk(region, node => node.type === 'caption')[0])).toContain('Saved flight comparisons');
    expect(walk(region, node => node.type === 'th' && node.props.scope === 'col')).toHaveLength(5);
    expect(walk(region, node => node.type === 'th' && node.props.scope === 'row')).toHaveLength(1);
    expect(ui.find(node => node.props?.['data-flight-challenge-progress']).type).toBe('ol');
    expect(ui.all(node => node.props?.['data-mission-progress-step'])).toHaveLength(4);
  });
});
