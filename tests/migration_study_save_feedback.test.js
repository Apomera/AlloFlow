import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
const noteMessage = 'Observation recorded. Your words count as evidence; they are not graded.';
const comparisonMessage = 'Comparison recorded with both source notes and view settings. Your claim is not graded.';
let tool, clicks, urls;
function props(element) { return element[Object.keys(element).find(key => key.startsWith('__reactProps$'))]; }
function record(region, note) {
  return { speciesId: 'canada_goose', region, note, bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 0, paused: true, motionReduced: false };
}
function notebook(saved = false) {
  const first = record('head', 'Recorded bill evidence.'), second = record('tail', 'Recorded tail evidence.');
  return { drafts: { 'canada_goose:head': first.note, 'canada_goose:tail': second.note },
    records: { 'canada_goose:head': first, 'canada_goose:tail': second },
    comparison: { firstKey: 'canada_goose:head', secondKey: 'canada_goose:tail', draft: 'My comparison A.',
      saved: saved ? { firstKey: 'canada_goose:head', secondKey: 'canada_goose:tail', first: clone(first), second: clone(second), claim: 'My comparison A.' } : null,
      feedback: saved ? 'recorded' : '' } };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightStudyObservationOpen: true, flightStudyRegion: 'head', flightFormation: 'natural', flightSeason: 'fall', flightWind: 0,
    flightStudyObservations: notebook(), flightInvestigation: { prediction: 'Keep flight prediction.', evidence: 'Keep flight evidence.' },
    flightChallenges: { work: { wind: { notes: 'Keep challenge notes.' } } }, inquiry: { hypothesis: 'Keep inquiry.' }, ...seed }, refresh;
  const writes = [], refs = [], announce = vi.fn(), toast = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: options.hostAnnouncer ? announce : null, addToast: toast,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); } });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function View() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(View)));
  const ui = { host, root, refs, writes, announce, toast, get state() { return state; },
    status(kind) { return host.querySelector('[data-learning-feedback="study-' + kind + '"]'); },
    visible(kind) { return host.querySelector('[data-study-' + kind + '-status]'); },
    note() { return host.querySelector('[data-study-observation-key]'); },
    claim() { return host.querySelector('[aria-label="My observation comparison"]'); },
    button(label) { return [...host.querySelectorAll('button')].find(button => button.textContent === label); },
    open() { host.querySelectorAll('details').forEach(details => { details.open = true; }); },
    click(label) { const button = ui.button(label); expect(button).toBeTruthy(); expect(button.disabled).toBe(false); button.focus(); act(() => button.click()); return button; },
    edit(field, value) { field.focus(); act(() => props(field).onChange({ currentTarget: field, target: { value } })); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); ui.open(); },
    owner(kind) { return refs.find(ref => ref.current?.node === ui.status(kind)); },
    unmount() { act(() => root.unmount()); roots.delete(root); } };
  ui.open(); return ui;
}
function otherWork(ui) {
  return clone({ investigation: ui.state.flightInvestigation, challenges: ui.state.flightChallenges, inquiry: ui.state.inquiry,
    species: ui.state.flightSpecies, region: ui.state.flightStudyRegion, wind: ui.state.flightWind, camera: ui.state.flightCamera, paused: ui.state.flightPaused });
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  urls = { createObjectURL: vi.fn(() => 'blob:study-feedback'), revokeObjectURL: vi.fn() }; vi.stubGlobal('URL', urls);
  clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  resetStemLab(); tool = loadTool(process.env.MIGRATION_STUDY_SAVE_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { vi.runOnlyPendingTimers(); roots.forEach(root => root.unmount()); roots.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Study save and export confirmations', () => {
  it('starts all owned sinks empty, including with persisted saved feedback', () => {
    const renderErrors = vi.spyOn(console, 'error');
    const book = notebook(true); book.feedback = { key: 'canada_goose:head', action: 'recorded' };
    const ui = fixture({ flightStudyObservations: book });
    for (const kind of ['observation', 'comparison', 'export']) {
      expect(ui.status(kind).textContent).toBe(''); expect(ui.status(kind).getAttribute('role')).toBe('status');
      expect(ui.status(kind).getAttribute('aria-live')).toBe('polite'); expect(ui.status(kind).getAttribute('aria-atomic')).toBe('true');
      expect(ui.visible(kind).getAttribute('aria-live')).toBe('off'); expect(ui.visible(kind).hasAttribute('role')).toBe(false);
    }
    const originalNodes = ['observation', 'comparison', 'export'].map(kind => ui.status(kind));
    ui.set({ flightWind: 1 });
    for (const [index, kind] of ['observation', 'comparison', 'export'].entries()) {
      expect(ui.host.querySelectorAll('[data-learning-feedback="study-' + kind + '"]')).toHaveLength(1);
      expect(ui.status(kind)).toBe(originalNodes[index]);
    }
    expect(renderErrors.mock.calls.some(args => /same key/.test(args.join(' ')))).toBe(false);
    expect(ui.writes).toEqual([]);
  });

  it('saves A, edits B, and confirms B through a new keyed child without changing focus or other work', () => {
    const ui = fixture(), before = otherWork(ui), status = ui.status('observation');
    ui.edit(ui.note(), 'Observation A.'); const save = ui.click('Record observation'), first = status.firstChild;
    expect(status.textContent).toBe(noteMessage); expect(document.activeElement).toBe(save);
    ui.edit(ui.note(), 'Observation B.');
    expect(status.textContent).toBe(''); expect(ui.visible('observation').textContent).toBe('');
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('Observation A.');
    expect(document.activeElement).toBe(ui.note()); ui.note().setSelectionRange(3, 8);
    ui.click('Record observation'); expect(ui.status('observation')).toBe(status); expect(status.textContent).toBe(noteMessage);
    expect(status.firstChild).not.toBe(first); expect(document.activeElement).toBe(save);
    expect(ui.note().selectionStart).toBe(3); expect(ui.note().selectionEnd).toBe(8);
    expect(ui.state.flightStudyObservations.records['canada_goose:head'].note).toBe('Observation B.'); expect(otherWork(ui)).toEqual(before);
    expect(ui.writes.every(patch => Object.keys(patch).join() === 'flightStudyObservations')).toBe(true);
  });

  it('reannounces an unchanged explicit save and keeps its persistent native control', () => {
    const ui = fixture(), status = ui.status('observation'), button = ui.click('Record observation'), child = status.firstChild;
    ui.click('Record observation'); expect(ui.status('observation')).toBe(status); expect(status.firstChild).not.toBe(child);
    expect(status.textContent).toBe(noteMessage); expect(document.activeElement).toBe(button);
  });

  it('clears once and does not mutate the live region for subsequent note keystrokes', async () => {
    const ui = fixture(), status = ui.status('observation'); ui.click('Record observation'); ui.edit(ui.note(), 'First edit');
    const mutations = [], observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(status, { childList: true, subtree: true, characterData: true });
    ui.edit(ui.note(), 'Second edit'); ui.edit(ui.note(), 'Third edit'); await act(async () => { await Promise.resolve(); }); observer.disconnect();
    expect(status.textContent).toBe(''); expect(mutations).toHaveLength(0); expect(document.activeElement).toBe(ui.note());
  });

  it.each(['changed draft', 'missing record'])('withholds persisted recorded text for an unsaved observation: %s', kind => {
    const book = notebook(); book.feedback = { key: 'canada_goose:head', action: 'recorded' };
    if (kind === 'changed draft') book.drafts['canada_goose:head'] = 'An unsaved revision.';
    else delete book.records['canada_goose:head'];
    const ui = fixture({ flightStudyObservations: book }); expect(ui.visible('observation').textContent).toBe('');
    expect(ui.status('observation').textContent).toBe(''); expect(ui.writes).toEqual([]);
  });

  it('confirms comparison A and B separately, clearing stale success while preserving captured notes', () => {
    const ui = fixture(), status = ui.status('comparison'), records = clone(ui.state.flightStudyObservations.records), before = otherWork(ui);
    const button = ui.click('Record comparison'), first = status.firstChild; expect(status.textContent).toBe(comparisonMessage);
    ui.edit(ui.claim(), 'My comparison B.'); expect(status.textContent).toBe(''); expect(ui.visible('comparison').textContent).toBe('');
    expect(ui.state.flightStudyObservations.comparison.saved.claim).toBe('My comparison A.');
    ui.click('Record comparison'); expect(status.textContent).toBe(comparisonMessage); expect(status.firstChild).not.toBe(first);
    expect(ui.state.flightStudyObservations.comparison.saved.claim).toBe('My comparison B.'); expect(document.activeElement).toBe(button);
    expect(ui.state.flightStudyObservations.records).toEqual(records); expect(otherWork(ui)).toEqual(before);
  });

  it('does not mutate comparison live feedback on subsequent draft keystrokes', async () => {
    const ui = fixture(), status = ui.status('comparison'); ui.click('Record comparison'); ui.edit(ui.claim(), 'Comparison B.');
    const mutations = [], observer = new MutationObserver(records => mutations.push(...records)); observer.observe(status, { childList: true, subtree: true, characterData: true });
    ui.edit(ui.claim(), 'Comparison C.'); ui.edit(ui.claim(), 'Comparison D.'); await act(async () => { await Promise.resolve(); }); observer.disconnect();
    expect(mutations).toHaveLength(0); expect(ui.visible('comparison').textContent).toBe('');
  });

  it.each(['draft', 'source'])('withholds stale persisted comparison success after a changed %s', kind => {
    const book = notebook(true); if (kind === 'draft') book.comparison.draft = 'Unsaved comparison.';
    else book.records['canada_goose:head'].note = 'Revised source evidence.';
    const ui = fixture({ flightStudyObservations: book }); expect(ui.visible('comparison').textContent).toBe('');
    expect(ui.status('comparison').textContent).toBe(''); expect(ui.state.flightStudyObservations.comparison.saved.claim).toBe('My comparison A.');
  });

  it('announces repeated successful exports locally and leaves the saved evidence and drafts intact', () => {
    const ui = fixture({}, { hostAnnouncer: true }), before = clone(ui.state.flightStudyObservations), status = ui.status('export');
    const button = ui.click('Download observation notebook (HTML)'), first = status.firstChild;
    ui.click('Download observation notebook (HTML)'); expect(status.textContent).toBe('Observation notebook downloaded.');
    expect(status.firstChild).not.toBe(first); expect(clicks).toHaveBeenCalledTimes(2); expect(document.activeElement).toBe(button);
    expect(document.querySelector('a[download]')).toBeNull(); expect(ui.announce).not.toHaveBeenCalled();
    expect(ui.state.flightStudyObservations.records).toEqual(before.records); expect(ui.state.flightStudyObservations.drafts).toEqual(before.drafts);
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(before.comparison.saved);
  });

  it('announces repeated blocked exports without a host announcer and cleans each temporary link', () => {
    const ui = fixture(), before = clone(ui.state.flightStudyObservations.records), status = ui.status('export');
    clicks.mockImplementation(() => { throw new Error('Download blocked'); });
    const button = ui.click('Download observation notebook (HTML)'), first = status.firstChild; ui.click('Download observation notebook (HTML)');
    expect(status.textContent).toBe('Download was blocked by this browser.'); expect(status.firstChild).not.toBe(first);
    expect(ui.visible('export').textContent).toBe(status.textContent); expect(document.activeElement).toBe(button); expect(ui.toast).toHaveBeenCalledTimes(2);
    expect(document.querySelector('a[download]')).toBeNull(); expect(ui.state.flightStudyObservations.records).toEqual(before);
  });

  it('retains the host-announcer export fallback when no local sink is connected', () => {
    const ui = fixture({}, { hostAnnouncer: true }); ui.status('export').remove(); urls.createObjectURL.mockImplementation(() => { throw new Error('Blocked'); });
    ui.click('Download observation notebook (HTML)'); expect(ui.announce).toHaveBeenCalledExactlyOnceWith('Download was blocked by this browser.');
  });

  it('clears feedback when the observation context changes and rejects the departed writer', () => {
    const ui = fixture(); ui.click('Record observation'); const writer = ui.owner('observation').current, prior = ui.status('observation');
    ui.set({ flightStudyRegion: 'tail' }); expect(ui.status('observation')).not.toBe(prior); expect(ui.status('observation').textContent).toBe('');
    act(() => writer.report('Wrong region.')); expect(ui.status('observation').textContent).toBe('');
    ui.click('Record observation'); expect(ui.status('observation').textContent).toBe(noteMessage); expect(ui.note().value).toBe('Recorded tail evidence.');
  });

  it('clears comparison feedback when a captured source changes without rewriting the saved comparison', () => {
    const ui = fixture(); ui.click('Record comparison'); const saved = clone(ui.state.flightStudyObservations.comparison.saved), before = ui.status('comparison');
    ui.edit(ui.note(), 'Changed source note.'); ui.click('Record observation');
    expect(ui.status('comparison')).not.toBe(before); expect(ui.status('comparison').textContent).toBe(''); expect(ui.visible('comparison').textContent).toBe('');
    expect(ui.state.flightStudyObservations.comparison.saved).toEqual(saved);
  });

  it('keeps observation, comparison, export and another mounted tool independent', () => {
    const first = fixture(), second = fixture(), untouched = clone(second.state);
    first.click('Record observation'); expect(first.status('observation').textContent).toBe(noteMessage);
    expect(first.status('comparison').textContent).toBe(''); expect(first.status('export').textContent).toBe(''); expect(second.state).toEqual(untouched);
    second.click('Record comparison'); expect(second.status('comparison').textContent).toBe(comparisonMessage); expect(second.status('observation').textContent).toBe('');
    expect(first.status('comparison').textContent).toBe(''); expect(first.status('observation').textContent).toBe(noteMessage);
  });

  it('preserves removal feedback and its existing safe focus destination', () => {
    const ui = fixture(); ui.click('Remove recorded observation');
    expect(ui.status('observation').textContent).toBe('Recorded evidence removed. Your draft is still here.');
    expect(ui.note().value).toBe('Recorded bill evidence.'); expect(document.activeElement).toBe(ui.note());
    ui.click('Record observation'); ui.click('Remove recorded observation'); expect(ui.status('observation').textContent).toBe('Recorded evidence removed. Your draft is still here.');
  });

  it('uses one local sink with a host announcer and ignores writers after unmount', () => {
    const ui = fixture({}, { hostAnnouncer: true }); ui.click('Record observation'); ui.click('Record comparison'); expect(ui.announce).not.toHaveBeenCalled();
    const writer = ui.owner('observation').current; ui.unmount(); act(() => { writer.report('Unmounted message.'); writer.clear(); });
    expect(ui.host.querySelector('[data-learning-feedback]')).toBeNull();
  });
});
