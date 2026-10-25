import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function view(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', ...seed }, tree;
  const ctx = makeCtx({ update: (_, key, value) => { state = { ...state, [key]: value }; }, updateMulti: (_, values) => { state = { ...state, ...values }; } });
  const ui = {
    get state() { return state; },
    render() { ctx.toolData = { migration: state }; function Component() { tree = tool.render(ctx); return tree; } return ReactDOMServer.renderToStaticMarkup(React.createElement(Component)); },
    node(predicate) { return find(tree, predicate); },
    label(label) { return find(tree, node => (node.props?.id === label || node.props?.['aria-label'] === label)); },
    button(text) { return find(tree, node => node.type === 'button' && node.props.children === text); },
    region(region) { return find(tree, node => node.props?.['data-study-region'] === region); },
    select(region) { ui.region(region).props.onClick(); ui.render(); },
    draft(text) { ui.label('migration-study-observation-note').props.onChange({ target: { value: text } }); ui.render(); },
    record() { ui.button('Record observation').props.onClick(); ui.render(); },
    species(id) { ui.label('3D migration focus species').props.onChange({ target: { value: id } }); ui.render(); },
    count() { return ui.node(node => node.props?.['data-study-evidence-count'] != null).props['data-study-evidence-count']; }
  };
  ui.render(); return ui;
}
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('Migration shape and motion observations', () => {
  it('activates the chosen region and opens one compact observation disclosure without changing conditions or other work', () => {
    const notebook = { prediction: 'My prediction', trials: [] }, challenges = { selected: 'wind' };
    const ui = view({ flightShowAnatomy: false, flightWind: -5, flightInvestigation: notebook, flightChallenges: challenges });
    ui.select('primaries');
    expect(ui.state).toMatchObject({ flightStudyRegion: 'primaries', flightShowAnatomy: true, flightStudyObservationOpen: true, flightWind: -5 });
    expect(ui.state.flightInvestigation).toBe(notebook);
    expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.region('primaries').props['aria-pressed']).toBe('true');
    expect(ui.label('Shape and motion observations').props.open).toBe(true);
    expect(ui.render()).toContain('Describe the outer feather spacing');
  });

  it('counts only explicitly recorded nonempty notes and keeps typed drafts separate', () => {
    const ui = view();
    expect(ui.count()).toBe(0);
    expect(ui.button('Record observation').props.disabled).toBe(true);
    ui.draft('  '); ui.record();
    expect(ui.count()).toBe(0);
    ui.draft('  The outer feathers spread as the wing turns.  ');
    expect(ui.count()).toBe(0);
    expect(ui.state.flightStudyObservations.records).toEqual({});
    ui.record();
    expect(ui.count()).toBe(1);
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('The outer feathers spread as the wing turns.');
    expect(ui.render()).toContain('they are not graded');
    ui.draft('A newer unfinished idea.');
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('The outer feathers spread as the wing turns.');
    expect(ui.render()).toContain('Current draft has unrecorded changes');
    expect(ui.count()).toBe(1);
    ui.record();
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('A newer unfinished idea.');
    expect(Object.keys(ui.state.flightStudyObservations.records)).toHaveLength(1);
  });

  it('records the selected individual and illustrative view settings without pretending to capture scientific frequency', () => {
    const ui = view({ flightStudyBird: 6, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.35, flightWingStep: 7, flightPaused: true });
    ui.select('inner-wing'); ui.draft('The inner section stays attached to the body.'); ui.record();
    expect(ui.state.flightStudyObservations.records['canada_goose:inner-wing']).toMatchObject({ speciesId: 'canada_goose', region: 'inner-wing', bird: 6, yaw: 90, pitch: 10, zoom: 1.35, wingStep: 7, paused: true, motionReduced: false });
    const html = ui.render();
    expect(html).toContain('Wing steps 7');
    expect(html).toContain('not measured wingbeat frequency');
    expect(html).toContain('Recorded view');
  });

  it('distinguishes motion reduced captures from the explicit pause flag', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const ui = view({ flightPaused: false });
    ui.draft('The model is still until I step.'); ui.record();
    expect(ui.state.flightStudyObservations.records['canada_goose:head']).toMatchObject({ paused: false, motionReduced: true });
    expect(ui.render()).toContain('Still: Reduce motion');
  });

  it('retains notes for each bird region and species while Monarch uses only whole-insect wing motion', () => {
    const ui = view();
    ui.select('head'); ui.draft('Goose bill observation.'); ui.record();
    ui.select('tail'); ui.draft('Goose tail observation.'); ui.record();
    expect(ui.count()).toBe(2);
    ui.species('monarch');
    expect(ui.region('head')).toBeNull();
    expect(ui.node(node => node.props?.className === 'migration-anatomy-key')).toBeNull();
    expect(ui.count()).toBe(0);
    expect(ui.render()).toContain('Whole-insect wing motion');
    expect(ui.render()).toContain('These are butterfly wings');
    expect(ui.label('migration-study-observation-note').props.value).toBe('');
    ui.draft('Both butterfly wing pairs move.'); ui.record();
    expect(ui.state.flightStudyObservations.records['monarch:whole-wing']).toMatchObject({ speciesId: 'monarch', region: 'whole-wing', note: 'Both butterfly wing pairs move.' });
    expect(ui.count()).toBe(1);
    ui.species('canada_goose'); ui.select('head');
    expect(ui.label('migration-study-observation-note').props.value).toBe('Goose bill observation.');
    expect(ui.count()).toBe(2);
    ui.species('arctic_tern');
    expect(ui.label('migration-study-observation-note').props.value).toBe('');
    expect(ui.count()).toBe(0);
    expect(Object.keys(ui.state.flightStudyObservations.records)).toHaveLength(3);
  });

  it('removes one saved observation while retaining the draft and all unrelated evidence', () => {
    const ui = view();
    ui.select('head'); ui.draft('Head note.'); ui.record();
    ui.select('tail'); ui.draft('Tail note.'); ui.record();
    ui.button('Remove recorded observation').props.onClick(); ui.render();
    expect(ui.count()).toBe(1);
    expect(ui.state.flightStudyObservations.records['canada_goose:tail']).toBeUndefined();
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('Head note.');
    expect(ui.label('migration-study-observation-note').props.value).toBe('Tail note.');
    expect(ui.render()).toContain('Your draft is still here');
    ui.record();
    expect(ui.count()).toBe(2);
  });

  // Removal focus and ownership are exercised with real React DOM in migration_removal_focus.test.js.

  it('caps both drafts and saved notes at 1000 characters', () => {
    const ui = view();
    ui.draft('x'.repeat(1500)); ui.record();
    expect(ui.label('migration-study-observation-note').props.maxLength).toBe(1000);
    expect(ui.state.flightStudyObservations.drafts['canada_goose:head']).toHaveLength(1000);
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toHaveLength(1000);
  });

  it.each([null, [], 'invalid', { records: [], drafts: 123 }, { records: { 'unknown:head': { note: 'No' }, 'monarch:head': { speciesId: 'monarch', region: 'head', note: 'No' } }, drafts: { unknown: 'No' } }])('recovers malformed imported observation data: %j', saved => {
    const ui = view({ flightStudyRegion: { corrupt: true }, flightStudyObservations: saved });
    expect(ui.count()).toBe(0);
    expect(ui.region('head').props['aria-pressed']).toBe('true');
    ui.draft('Recovered safely.'); ui.record();
    expect(Object.keys(ui.state.flightStudyObservations.records)).toEqual(['canada_goose:head']);
    expect(ui.count()).toBe(1);
  });

  it('bounds imported view metadata and rejects mismatched saved species or regions', () => {
    const ui = view({ flightStudyObservations: { records: {
      'canada_goose:head': { speciesId: 'canada_goose', region: 'head', note: '<script>author text</script>', bird: 999, yaw: Infinity, pitch: -100, zoom: {}, wingStep: 1e9, paused: 'yes' },
      'canada_goose:tail': { speciesId: 'monarch', region: 'tail', note: 'Wrong provenance' },
      'canada_goose:primaries': { speciesId: 'canada_goose', region: 'tail', note: 'Wrong region' }
    } } });
    expect(ui.count()).toBe(1);
    const html = ui.render();
    expect(html).toContain('&lt;script&gt;author text&lt;/script&gt;');
    expect(html).toContain('Individual 32');
    expect(html).toContain('35° / -60°');
    expect(html).toContain('Wing steps 1000000');
    expect(ui.label('migration-study-observation-note').props.value).toBe('<script>author text</script>');
    ui.record();
    expect(Object.keys(ui.state.flightStudyObservations.records)).toEqual(['canada_goose:head']);
  });

  it('does not count an imported note whose only words fall beyond the storage limit', () => {
    const ui = view({ flightStudyObservations: { records: {
      'canada_goose:head': { speciesId: 'canada_goose', region: 'head', note: ' '.repeat(1000) + 'Outside the retained note' }
    } } });
    expect(ui.count()).toBe(0);
    expect(ui.label('migration-study-observation-note').props.value).toBe('');
    expect(ui.button('Record observation').props.disabled).toBe(true);
  });

  it('offers distinct prompts and only exposes the learning flow in Study view', () => {
    const ui = view();
    const prompts = new Set();
    for (const region of ['head', 'inner-wing', 'primaries', 'tail']) {
      ui.select(region);
      prompts.add(ui.node(node => node.props?.id === 'migration-study-observation-prompt').props.children);
    }
    expect(prompts.size).toBe(4);
    ui.node(node => node.type === 'button' && node.props.children === 'Chase').props.onClick(); ui.render();
    expect(ui.label('Shape and motion observations')).toBeNull();
    expect(ui.region('head')).toBeNull();
  });
});
