import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
const mounts = [];
const clone = value => JSON.parse(JSON.stringify(value));
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = find(child, predicate); if (hit) return hit; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function record(speciesId, region, patch = {}) {
  return { speciesId, region, note: speciesId + ' recorded detail.', bird: 0, yaw: -35, pitch: 25,
    zoom: 1.2, wingStep: 7, paused: false, motionReduced: false, ...patch };
}
function notebook(samePair = false) {
  const first = record('canada_goose', 'head', { bird: 4, note: 'Historical goose bill detail.' });
  const second = record('arctic_tern', 'tail', { bird: 1, note: 'Historical tern tail detail.' });
  const selectedFirst = record('peregrine', 'primaries', { bird: 1, note: 'Selected falcon feather detail.' });
  const selectedSecond = record('monarch', 'whole-wing', { note: 'Selected butterfly wing detail.' });
  return {
    records: { 'canada_goose:head': clone(first), 'arctic_tern:tail': clone(second),
      'peregrine:primaries': selectedFirst, 'monarch:whole-wing': selectedSecond },
    drafts: { 'peregrine:primaries': 'Unrecorded falcon draft.', 'monarch:whole-wing': 'Unrecorded butterfly draft.' },
    comparison: { firstKey: samePair ? 'canada_goose:head' : 'peregrine:primaries',
      secondKey: samePair ? 'arctic_tern:tail' : 'monarch:whole-wing', draft: 'Unrecorded comparison draft.',
      saved: { firstKey: 'canada_goose:head', secondKey: 'arctic_tern:tail', first, second, claim: 'Historical claim.' } }
  };
}
function fixture(book = notebook(), seed = {}, ctxPatch = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightStudyObservationOpen: true, flightFormation: 'v', flightWind: -9, flightSeason: 'spring',
    flightStudyObservations: book, ...seed }, tree, rerender;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({ announceToSR: announce, ...ctxPatch,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; rerender(); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; rerender(); }
  });
  function Component() {
    const [, force] = React.useState(0);
    rerender = () => force(value => value + 1);
    ctx.toolData = { migration: state };
    tree = tool.render(ctx);
    return tree;
  }
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host);
  React.act(() => root.render(React.createElement(Component)));
  mounts.push({ root, host });
  const ui = {
    host, writes, announce, get state() { return state; },
    node(predicate) { return find(tree, predicate); },
    panel(source = 'selected') { return host.querySelector('[data-study-matched-comparison="' + source + '"]'); },
    disclosure() { return host.querySelector('[data-study-selected-comparison-activity]'); },
    action(source, which) { return ui.panel(source).querySelector('[data-study-matched="' + which + '"]'); },
    click(source, which) { React.act(() => ui.action(source, which).click()); },
    selectView(source, value) { React.act(() => {
      const select = ui.panel(source).querySelector('select'); select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }); },
    selectRecord(which, value) { React.act(() => {
      const select = host.querySelector('[aria-label="' + (which === 'first' ? 'First' : 'Second') + ' recorded observation"]');
      select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
    }); },
    set(values) { React.act(() => { state = { ...state, ...values }; rerender(); }); },
    status() { return host.querySelector('[data-study-revisit-status]')?.textContent || ''; },
    notice() { return host.querySelector('[data-study-selected-source-state]'); }
  };
  return ui;
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) { React.act(() => root.unmount()); host.remove(); }
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration selected observations alongside a historical comparison', () => {
  it('keeps the original selected activity directly available before the first comparison is saved', () => {
    const book = notebook(); book.comparison.saved = null;
    const ui = fixture(book);
    expect(ui.disclosure()).toBeNull(); expect(ui.panel('saved')).toBeNull();
    expect(ui.panel().closest('details').hasAttribute('data-study-comparison')).toBe(true);
    ui.click('selected', 'first'); expect(ui.state.flightSpecies).toBe('peregrine');
    expect(ui.state.flightStudyObservations).toBe(book);
  });

  for (const remaining of [0, 1]) {
    it('keeps historical inspection available with only ' + remaining + ' current records', () => {
      const book = notebook(); book.records = remaining ? { 'monarch:whole-wing': book.records['monarch:whole-wing'] } : {};
      const ui = fixture(book);
      expect(ui.disclosure()).toBeNull(); expect(ui.panel('selected')).toBeNull();
      ui.click('saved', 'second'); expect(ui.state.flightSpecies).toBe('arctic_tern');
      expect(ui.state.flightStudyObservations).toBe(book);
    });
  }

  it('uses a closed native disclosure that can open without changing the view or writing learner work', () => {
    const ui = fixture(), details = ui.disclosure(), before = clone(ui.state);
    expect(details.tagName).toBe('DETAILS'); expect(details.open).toBe(false);
    const summary = details.querySelector(':scope > summary');
    expect(summary.textContent).toBe('Try the selected pair in a matched view');
    expect(summary.hasAttribute('role')).toBe(false); expect(summary.hasAttribute('tabindex')).toBe(false);
    React.act(() => summary.click()); expect(details.open).toBe(true);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(ui.announce).not.toHaveBeenCalled();
    React.act(() => summary.click()); expect(details.open).toBe(false);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });

  it('gives simultaneous activities unique help targets and explicitly named source groups', () => {
    const ui = fixture();
    const ids = [...ui.host.querySelectorAll('[id]')].map(node => node.id);
    expect(ids.length).toBe(new Set(ids).size);
    for (const source of ['selected', 'saved']) {
      const panel = ui.panel(source), id = 'migration-study-matched-help-' + source;
      expect(panel.getAttribute('role')).toBe('group');
      expect(panel.getAttribute('aria-label')).toBe(source === 'saved' ? 'Matched view for saved comparison' : 'Matched view for selected observations');
      expect(panel.querySelector('[data-study-matched-source]').dataset.studyMatchedSource).toBe(source);
      expect(ui.host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
      for (const control of panel.querySelectorAll('select,button')) {
        expect(control.getAttribute('aria-describedby')).toBe(id);
        expect(control.hasAttribute('role')).toBe(false); expect(control.hasAttribute('tabindex')).toBe(false);
        expect(panel.contains(ui.host.querySelector('[id="' + id + '"]'))).toBe(true);
      }
    }
    expect(ui.panel('selected').closest('[data-study-selected-comparison-activity]')).toBe(ui.disclosure());
    expect(ui.panel('saved').closest('[data-study-saved-comparison]')).not.toBeNull();
  });

  it('identifies a newly selected pair without implying that its claim or evidence was already recorded', () => {
    const ui = fixture();
    expect(ui.notice()?.dataset.studySelectedSourceState).toBe('different');
    expect(ui.notice().textContent).toContain('use a detail from each');
    expect(ui.notice().textContent).toContain('until you choose Record comparison');
    expect(ui.panel().textContent).toContain('Peregrine'); expect(ui.panel().textContent).toContain('Monarch');
    expect(ui.panel('saved').textContent).toContain('Canada Goose');
    expect(ui.writes).toEqual([]);
  });

  it('does not label matching selected records as a new source pair', () => {
    const ui = fixture(notebook(true));
    expect(ui.disclosure()).not.toBeNull(); expect(ui.notice()).toBeNull();
    expect(ui.writes).toEqual([]);
  });

  for (const change of [{ note: 'Revised recorded detail.' }, { bird: 2 }, { yaw: 90 }, { wingStep: 3 }, { motionReduced: true }]) {
    it('detects a changed captured source even with unchanged keys: ' + Object.keys(change)[0], () => {
      const book = notebook(true); Object.assign(book.records['canada_goose:head'], change);
      const before = JSON.stringify(book.comparison.saved), ui = fixture(book);
      expect(ui.notice()).not.toBeNull(); expect(ui.notice().dataset.studySelectedSourceState).toBe('different');
      ui.click('selected', 'first');
      expect(JSON.stringify(ui.state.flightStudyObservations.comparison.saved)).toBe(before);
    });
  }

  it('compares normalized records rather than mistaking legacy numeric strings for new observations', () => {
    const book = notebook(true);
    for (const key of ['bird', 'yaw', 'pitch', 'zoom', 'wingStep']) book.records['canada_goose:head'][key] = String(book.records['canada_goose:head'][key]);
    const ui = fixture(book); expect(ui.notice()).toBeNull(); expect(ui.writes).toEqual([]);
  });

  it('does not mistake unrecorded observation or comparison drafts for changed captured sources', () => {
    const book = notebook(true); book.drafts['canada_goose:head'] = 'A newer unsaved guess.';
    book.comparison.draft = 'A newer unsaved explanation.';
    const ui = fixture(book); expect(ui.notice()).toBeNull();
    expect(ui.host.querySelector('[aria-label="My observation comparison"]').value).toBe(book.comparison.draft);
    expect(ui.writes).toEqual([]);
  });

  it('restores the newly selected bird using its own region and individual while preserving all saved work', () => {
    const book = notebook(), before = JSON.stringify(book), inquiry = { prediction: 'Keep my wind claim.', trials: [] };
    const challenge = { selectedId: 'wind', work: {} }, ui = fixture(book, { flightInvestigation: inquiry, flightChallenges: challenge });
    ui.click('selected', 'first');
    expect(ui.writes).toEqual([{ flightSpecies: 'peregrine', flightCamera: 'study', flightPaused: true,
      flightStudyRegion: 'primaries', flightStudyBird: 1, flightStudyYaw: 90, flightStudyPitch: 10,
      flightStudyZoom: 1, flightWingStep: 0, flightShowAnatomy: true, flightStudyObservationOpen: true }]);
    expect(ui.state.flightStudyObservations).toBe(book); expect(JSON.stringify(book)).toBe(before);
    expect(ui.state.flightInvestigation).toBe(inquiry); expect(ui.state.flightChallenges).toBe(challenge);
    expect(ui.state).toMatchObject({ flightWind: -9, flightFormation: 'v', flightSeason: 'spring' });
    expect(document.activeElement.id).toBe('migration-flight-stage');
  });

  it('shares the chosen matched angle across source groups without persisting a new learning state', () => {
    const book = notebook(), ui = fixture(book);
    ui.selectView('selected', 'above'); expect(ui.writes).toEqual([]);
    expect(ui.panel('saved').querySelector('select').value).toBe('above');
    ui.click('selected', 'first');
    expect(ui.state).toMatchObject({ flightSpecies: 'peregrine', flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: 1, flightWingStep: 0 });
    ui.click('selected', 'second');
    expect(ui.state).toMatchObject({ flightSpecies: 'monarch', flightStudyRegion: 'head', flightStudyBird: 0,
      flightShowAnatomy: false, flightStudyYaw: 0, flightStudyPitch: 60, flightWingStep: 0, flightPaused: true });
    expect(ui.state.flightStudyObservations).toBe(book);
    expect(ui.writes.every(patch => !Object.hasOwn(patch, 'flightStudyObservations'))).toBe(true);
  });

  it('can compare the new pair then the historical pair repeatedly without mixing captured sources', () => {
    const book = notebook(), before = JSON.stringify(book), ui = fixture(book);
    for (const [source, which, species, bird] of [
      ['selected', 'first', 'peregrine', 1], ['saved', 'first', 'canada_goose', 4],
      ['selected', 'second', 'monarch', 0], ['saved', 'second', 'arctic_tern', 1], ['selected', 'first', 'peregrine', 1]
    ]) {
      ui.click(source, which);
      expect(ui.state).toMatchObject({ flightSpecies: species, flightStudyBird: bird, flightStudyYaw: 90,
        flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0, flightPaused: true });
      expect(ui.status()).toContain('Matched view'); expect(JSON.stringify(book)).toBe(before);
    }
    expect(ui.writes).toHaveLength(5);
  });

  it('keeps a selected source change separate from the historical snapshots and invalidates its preview feedback', () => {
    const book = notebook(), ui = fixture(book); ui.click('selected', 'first');
    expect(ui.status()).toContain('Matched view');
    const changed = clone(book); changed.records['peregrine:primaries'].note = 'A newly recorded falcon observation.';
    ui.set({ flightStudyObservations: changed }); expect(ui.status()).toBe('');
    ui.click('selected', 'first'); expect(ui.status()).toContain('Matched view');
    expect(changed.comparison.saved).toEqual(book.comparison.saved);
    expect(ui.host.querySelector('[data-study-saved-comparison]').textContent).toContain(book.comparison.saved.first.note);
  });

  it('keeps historical preview feedback valid when learners change their current source selections', () => {
    const book = notebook(), ui = fixture(book); ui.click('saved', 'first');
    const status = ui.status(); expect(status).toContain('Canada Goose');
    ui.selectRecord('first', 'arctic_tern:tail');
    expect(ui.status()).toBe(status); expect(ui.state.flightStudyObservations.comparison.firstKey).toBe('arctic_tern:tail');
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(book.comparison.saved);
    ui.click('selected', 'first'); expect(ui.state.flightSpecies).toBe('arctic_tern');
    expect(ui.state.flightStudyRegion).toBe('tail');
  });

  it('updates the selected activity through native record selectors and clears only a stale selected preview', () => {
    const book = notebook(), ui = fixture(book); ui.click('selected', 'first');
    ui.selectRecord('first', 'canada_goose:head'); expect(ui.status()).toBe('');
    expect(ui.panel().textContent).toContain('Canada Goose');
    ui.click('selected', 'first'); expect(ui.state.flightSpecies).toBe('canada_goose');
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(book.comparison.saved);
    expect(ui.state.flightStudyObservations.comparison.draft).toBe(book.comparison.draft);
  });

  it('removes the selected disclosure when source records disappear while historical comparison remains usable', () => {
    const book = notebook(), ui = fixture(book); ui.click('selected', 'second');
    const changed = { ...book, records: {} }; ui.set({ flightStudyObservations: changed });
    expect(ui.disclosure()).toBeNull(); expect(ui.panel('selected')).toBeNull(); expect(ui.status()).toBe('');
    ui.click('saved', 'first'); expect(ui.state).toMatchObject({ flightSpecies: 'canada_goose', flightStudyBird: 4 });
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(book.comparison.saved);
  });

  it('keeps disclosure and comparison caret through local angle and selected source changes', () => {
    const ui = fixture(), details = ui.disclosure(); React.act(() => details.querySelector('summary').click());
    const field = ui.host.querySelector('[aria-label="My observation comparison"]');
    field.focus(); field.setSelectionRange(3, 14, 'backward');
    ui.selectView('selected', 'above');
    expect(ui.disclosure()).toBe(details); expect(details.open).toBe(true);
    expect(ui.host.querySelector('[aria-label="My observation comparison"]')).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 14, 'backward']);
    expect(field.value).toBe('Unrecorded comparison draft.'); expect(ui.writes).toEqual([]);
    const saved = clone(ui.state.flightStudyObservations.comparison.saved);
    ui.selectRecord('first', 'canada_goose:head');
    expect(ui.disclosure()).toBe(details); expect(details.open).toBe(true);
    expect(ui.host.querySelector('[aria-label="My observation comparison"]')).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 14, 'backward']);
    expect(field.value).toBe('Unrecorded comparison draft.');
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(saved); expect(ui.writes).toHaveLength(1);
  });

  it('does not record or supply a comparison claim when the learner has left it blank', () => {
    const book = notebook(); book.comparison.draft = '';
    const ui = fixture(book); ui.click('selected', 'first'); ui.click('selected', 'second');
    const field = ui.host.querySelector('[aria-label="My observation comparison"]');
    expect(field.value).toBe('');
    const recordAction = [...ui.host.querySelectorAll('button')].find(button => button.textContent === 'Record comparison');
    expect(recordAction.disabled).toBe(true); expect(ui.state.flightStudyObservations).toBe(book);
    expect(ui.writes.every(patch => !Object.hasOwn(patch, 'flightStudyObservations'))).toBe(true);
  });

  it('captures the selected pair only after the learner explicitly records their own comparison', () => {
    const book = notebook(), original = clone(book.comparison.saved), ui = fixture(book);
    ui.click('selected', 'first'); ui.click('selected', 'second');
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(original);
    const button = [...ui.host.querySelectorAll('button')].find(node => node.textContent === 'Record comparison');
    React.act(() => button.click());
    const saved = ui.state.flightStudyObservations.comparison.saved;
    expect(saved).toEqual({ firstKey: 'peregrine:primaries', secondKey: 'monarch:whole-wing',
      first: book.records['peregrine:primaries'], second: book.records['monarch:whole-wing'], claim: book.comparison.draft });
    expect(book.comparison.saved).toEqual(original); expect(ui.notice()).toBeNull();
    expect(ui.writes.filter(patch => Object.hasOwn(patch, 'flightStudyObservations'))).toHaveLength(1);
  });

  it('treats reversing the source order as a distinct comparison context', () => {
    const book = notebook(true); [book.comparison.firstKey, book.comparison.secondKey] = [book.comparison.secondKey, book.comparison.firstKey];
    const ui = fixture(book); expect(ui.notice()).not.toBeNull();
    ui.click('selected', 'first'); expect(ui.state.flightSpecies).toBe('arctic_tern');
    ui.click('saved', 'first'); expect(ui.state.flightSpecies).toBe('canada_goose');
  });

  it('uses translated labels while keeping stable source identities and learner prose out of source attributes', () => {
    const book = notebook(); book.records['peregrine:primaries'].note = '<private learner detail>\nAnother line.';
    const ui = fixture(book, {}, { t: (key, fallback) => 'Translated: ' + fallback });
    expect(ui.disclosure().querySelector('summary').textContent).toBe('Translated: Try the selected pair in a matched view');
    expect(ui.panel().getAttribute('aria-label')).toBe('Translated: Matched view for selected observations');
    expect(ui.notice().textContent).toContain('Translated: These selected records');
    for (const panel of [ui.panel(), ui.panel('saved')]) {
      for (const node of [panel, ...panel.querySelectorAll('*')]) {
        expect([...node.attributes].some(attribute => attribute.value.includes('private learner detail'))).toBe(false);
      }
    }
    ui.click('selected', 'first'); expect(ui.state.flightSpecies).toBe('peregrine');
    expect(ui.state.flightStudyObservations).toBe(book);
  });
});
