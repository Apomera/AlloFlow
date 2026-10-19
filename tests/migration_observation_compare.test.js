import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, blobs, downloads, revoke;
const NativeURL = globalThis.URL;
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function view(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightStudyObservationOpen: true, ...seed }, tree;
  const announce = vi.fn();
  const ctx = makeCtx({ announceToSR: announce, update: (_, key, value) => { state = { ...state, [key]: value }; }, updateMulti: (_, values) => { state = { ...state, ...values }; } });
  const ui = {
    get state() { return state; }, announce,
    render() { ctx.toolData = { migration: state }; function Component() { tree = tool.render(ctx); return tree; } return ReactDOMServer.renderToStaticMarkup(React.createElement(Component)); },
    node(predicate) { return find(tree, predicate); },
    label(label) { return find(tree, node => node.props?.['aria-label'] === label); },
    button(text) { return find(tree, node => node.type === 'button' && node.props.children === text); },
    set(values) { state = { ...state, ...values }; ui.render(); },
    edit(label, value) { ui.label(label).props.onChange({ target: { value } }); ui.render(); },
    click(text) { ui.button(text).props.onClick(); ui.render(); },
    note(region, note) { ui.set({ flightStudyRegion: region }); ui.edit('Shape and motion observation', note); ui.click('Record observation'); },
    comparison() { return ui.state.flightStudyObservations.comparison; },
    export() { ui.node(node => node.props?.['data-study-action'] === 'export-html').props.onClick(); ui.render(); }
  };
  ui.render(); return ui;
}
function twoNotes(seed = {}) {
  const ui = view(seed);
  ui.note('head', 'A broad bill in profile.');
  ui.set({ flightStudyYaw: 90, flightStudyPitch: 10, flightWingStep: 3, flightPaused: true });
  ui.note('tail', 'The tail stays behind the body.');
  return ui;
}
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); blobs = []; downloads = []; revoke = vi.fn();
  class DownloadURL extends NativeURL {
    static createObjectURL(blob) { blobs.push(blob); return 'blob:study-notebook-' + blobs.length; }
    static revokeObjectURL(url) { revoke(url); }
  }
  vi.stubGlobal('Blob', NodeBlob); vi.stubGlobal('URL', DownloadURL);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloads.push({ filename: this.download, url: this.getAttribute('href'), attached: this.isConnected }); });
  tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; document.documentElement.lang = 'en'; });

describe('Migration recorded observation comparison', () => {
  it('adds one native review disclosure only when two observations are recorded', () => {
    const ui = view();
    expect(ui.node(node => node.props?.['data-study-comparison'] != null)).toBeNull();
    expect(ui.node(node => node.props?.['data-study-action'] === 'export-html').props.disabled).toBe(true);
    ui.note('head', 'The bill projects forward.');
    expect(ui.node(node => node.props?.['data-study-comparison'] != null)).toBeNull();
    expect(ui.node(node => node.props?.['data-study-action'] === 'export-html').props.disabled).toBe(false);
    ui.note('tail', 'The tail projects backward.');
    expect(ui.node(node => node.props?.['data-study-comparison'] != null).type).toBe('details');
    expect(ui.label('First recorded observation').props.value).toBe('canada_goose:head');
    expect(ui.label('Second recorded observation').props.value).toBe('canada_goose:tail');
    expect(ui.label('Recorded observation comparison').type).toBe('table');
    expect(ui.button('Record comparison').props.disabled).toBe(true);
  });

  it('requires different selected records and preserves all other learning work', () => {
    const notebook = { evidence: 'Flight evidence', trials: [] }, challenges = { selected: 'formation' };
    const ui = twoNotes({ flightInvestigation: notebook, flightChallenges: challenges, flightWind: -9 });
    ui.set({ flightSpecies: 'monarch' }); ui.note('head', 'Four patterned butterfly wings.');
    ui.edit('Second recorded observation', 'monarch:whole-wing');
    ui.edit('First recorded observation', 'monarch:whole-wing');
    expect(ui.comparison().firstKey).toBe('canada_goose:head');
    const choices = ui.label('First recorded observation').props.children;
    expect(choices.find(option => option.props.value === 'monarch:whole-wing').props.disabled).toBe(true);
    ui.edit('My observation comparison', 'The bill note describes a head; the Monarch note describes four wings.');
    expect(ui.comparison().saved).toBeNull();
    ui.click('Record comparison');
    expect(ui.comparison().saved).toMatchObject({ firstKey: 'canada_goose:head', secondKey: 'monarch:whole-wing', first: { note: 'A broad bill in profile.' }, second: { note: 'Four patterned butterfly wings.' } });
    expect(ui.state.flightInvestigation).toBe(notebook); expect(ui.state.flightChallenges).toBe(challenges); expect(ui.state.flightWind).toBe(-9);
    expect(ui.render()).toContain('Your claim is not graded');
  });

  it('captures two independent note and view snapshots and identifies later source edits', () => {
    const ui = twoNotes();
    ui.edit('My observation comparison', 'Both parts project from the body, but I used different angles.'); ui.click('Record comparison');
    const saved = ui.comparison().saved;
    expect(saved.first).toMatchObject({ yaw: 35, pitch: 15, wingStep: 0, paused: false });
    expect(saved.second).toMatchObject({ yaw: 90, pitch: 10, wingStep: 3, paused: true });
    expect(ui.node(node => node.props?.['data-study-comparison-source-state'] != null).props['data-study-comparison-source-state']).toBe('same');
    expect(ui.render()).toContain('The captured views differ');
    ui.note('tail', 'A revised tail observation.');
    expect(ui.comparison().saved).toEqual(saved);
    expect(ui.comparison().saved.second.note).toBe('The tail stays behind the body.');
    expect(ui.node(node => node.props?.['data-study-comparison-source-state'] != null).props['data-study-comparison-source-state']).toBe('changed');
    expect(ui.render()).toContain('keeps the original recorded notes');
  });

  it('retains a saved comparison and its draft after sources are removed below the review threshold', async () => {
    const ui = twoNotes(); ui.edit('My observation comparison', 'My saved comparison.'); ui.click('Record comparison');
    ui.edit('My observation comparison', 'An unfinished revision.');
    ui.click('Remove recorded observation'); ui.set({ flightStudyRegion: 'head' }); ui.click('Remove recorded observation');
    expect(Object.keys(ui.state.flightStudyObservations.records)).toHaveLength(0);
    expect(ui.comparison().saved.claim).toBe('My saved comparison.'); expect(ui.comparison().draft).toBe('An unfinished revision.');
    expect(ui.button('Record comparison').props.disabled).toBe(true);
    expect(ui.label('First recorded observation').props.disabled).toBe(true);
    expect(ui.label('Second recorded observation').props.disabled).toBe(true);
    expect(ui.render()).toContain('Record two observations to make a new comparison');
    expect(ui.node(node => node.props?.['data-study-action'] === 'export-html').props.disabled).toBe(false);
    ui.export();
    const html = await blobs[0].text();
    expect(html).toContain('My saved comparison.'); expect(html).toContain('A broad bill in profile.'); expect(html).toContain('The tail stays behind the body.');
    expect(html).not.toContain('An unfinished revision.');
  });

  it('caps claims without saving a draft implicitly and retains the draft across species changes', () => {
    const ui = twoNotes(); ui.edit('My observation comparison', 'c'.repeat(1800));
    expect(ui.comparison().draft).toHaveLength(1500); expect(ui.comparison().saved).toBeNull();
    ui.set({ flightSpecies: 'monarch' });
    expect(ui.label('My observation comparison').props.maxLength).toBe(1500);
    expect(ui.label('My observation comparison').props.value).toHaveLength(1500);
    ui.click('Record comparison');
    expect(ui.comparison().saved.claim).toHaveLength(1500);
    ui.edit('My observation comparison', ' '); expect(ui.button('Record comparison').props.disabled).toBe(true);
    ui.click('Record comparison'); expect(ui.comparison().saved.claim).toHaveLength(1500);
  });

  it.each([[], 'corrupt', { firstKey: {}, secondKey: [], draft: {}, saved: [] }, { firstKey: ['canada_goose:tail'], secondKey: ['canada_goose:head'], saved: { firstKey: ['canada_goose:head'], secondKey: ['canada_goose:tail'], claim: 'Array keys are invalid', first: {}, second: {} } }, { saved: { firstKey: 'constructor', secondKey: 'toString', claim: 'Invalid catalog records', first: {}, second: {} } }])('normalizes malformed imported comparison state: %j', comparison => {
    const ui = twoNotes({ flightStudyObservations: { comparison } });
    expect(ui.label('First recorded observation').props.value).toBe('canada_goose:head');
    expect(ui.label('Second recorded observation').props.value).toBe('canada_goose:tail');
    expect(ui.comparison().saved).toBeNull(); expect(ui.comparison().draft).toBe('');
    ui.edit('My observation comparison', 'Recovered comparison.'); ui.click('Record comparison');
    expect(ui.comparison().saved.claim).toBe('Recovered comparison.');
  });

  it('downloads escaped standalone HTML with all recorded species, captured views and the saved claim while excluding drafts', async () => {
    const ui = twoNotes();
    ui.note('head', '<script>note()</script>\nBill & body');
    ui.set({ flightSpecies: 'monarch', flightStudyYaw: 0, flightStudyPitch: 60 }); ui.note('head', '<img src=x onerror="bad()">');
    ui.edit('Second recorded observation', 'monarch:whole-wing');
    ui.edit('My observation comparison', '<script>claim()</script> "Patterns" & feathers'); ui.click('Record comparison');
    ui.edit('My observation comparison', 'UNRECORDED COMPARISON DRAFT'); ui.edit('Shape and motion observation', 'UNRECORDED OBSERVATION DRAFT');
    document.documentElement.lang = 'en" onmouseover="bad()';
    const beforeRecords = JSON.stringify(ui.state.flightStudyObservations.records);
    ui.export();
    expect(downloads).toEqual([{ filename: 'migration-shape-motion-notebook.html', url: 'blob:study-notebook-1', attached: true }]);
    expect(blobs[0].type).toBe('text/html;charset=utf-8'); expect(document.querySelector('a[download]')).toBeNull();
    const html = await blobs[0].text(), doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('script,img')).toHaveLength(0); expect(doc.documentElement.getAttribute('onmouseover')).toBeNull();
    expect(doc.documentElement.lang).toBe('en" onmouseover="bad()');
    expect(doc.body.textContent).toContain('<script>note()</script>\nBill & body');
    expect(doc.body.textContent).toContain('<script>claim()</script> "Patterns" & feathers');
    expect(doc.body.textContent).toContain('<img src=x onerror="bad()">');
    expect(doc.body.textContent).toContain('Whole-insect wing motion'); expect(doc.body.textContent).toContain('Study angle 0° / 60°');
    expect(doc.body.textContent).toContain('Unrecorded drafts are excluded'); expect(doc.body.textContent).toContain('not establish a biological cause');
    expect(doc.querySelectorAll('table')).toHaveLength(2); expect(doc.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(html).toContain('@media print'); expect(html).not.toContain('UNRECORDED');
    expect(JSON.stringify(ui.state.flightStudyObservations.records)).toBe(beforeRecords);
    expect(ui.comparison().draft).toBe('UNRECORDED COMPARISON DRAFT');
    expect(revoke).not.toHaveBeenCalled(); vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledWith('blob:study-notebook-1');
    expect(ui.announce).toHaveBeenLastCalledWith('Observation notebook downloaded.');
  });

  it('exports a single recorded note without inventing a comparison or including drafts', async () => {
    const ui = view(); ui.note('head', 'Only one recorded note.'); ui.edit('Shape and motion observation', 'Only a draft now.'); ui.export();
    const html = await blobs[0].text(), doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1); expect(doc.body.textContent).toContain('Only one recorded note.');
    expect(doc.body.textContent).not.toContain('Only a draft now.'); expect(doc.body.textContent).not.toContain('Saved comparison');
  });

  it('reports a blocked download and cleans its anchor and URL without discarding evidence', () => {
    const ui = twoNotes(); const records = ui.state.flightStudyObservations.records;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Download blocked'); });
    ui.export();
    expect(ui.announce).toHaveBeenLastCalledWith('Download was blocked by this browser.');
    expect(ui.node(node => node.props?.['data-study-export-status'] != null).props.children).toBe('Download was blocked by this browser.');
    expect(ui.state.flightStudyObservations.records).toEqual(records); expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(1000); expect(revoke).toHaveBeenCalledWith('blob:study-notebook-1');
  });
});
