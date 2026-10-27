import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_organismid.js', 'desktop/web-app/public/stem_lab/stem_tool_organismid.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'organismId');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current;
  function Host() {
    const [data, setData] = React.useState({ organismId: { activeView: 'observe', observationExample: 'bird', ...seed } });
    current = data.organismId;
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current,
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    button: label => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === label) };
}
async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy();
  expect(button.disabled).toBe(false);
  button.focus();
  act(() => button.click());
  await settleFocus();
}
async function edit(control, value) {
  expect(control).toBeTruthy();
  control.focus();
  act(() => { control.value = value; Simulate.change(control); });
  await settleFocus();
}
function expectInvalid(view, field, errorId) {
  const control = view.one(field), error = view.one('#' + errorId);
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(control.getAttribute('aria-describedby')?.split(/\s+/)).toContain(errorId);
  expect(error?.textContent.trim()).toBeTruthy();
  return control;
}
function expectValid(view, field, errorId) {
  const control = view.one(field);
  expect(control.getAttribute('aria-invalid')).not.toBe('true');
  expect(control.getAttribute('aria-describedby')?.split(/\s+/) || []).not.toContain(errorId);
  expect(view.one('#' + errorId)).toBeNull();
  return control;
}
const entry = { id: 'saved-1', date: '2026-10-24T12:00:00Z', exampleId: 'bird', subject: 'Feathered visitor',
  note: 'Feathers and wings were visible.', claim: 'Bird example', context: 'Classroom example',
  nextEvidence: 'Look for a clear view of the wings.', path: [{ question: 'Are feathers described?', answer: 'yes' }] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose());
  await settleFocus();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Taxonomy journal accessibility: %s', path => {
  it('mounts a persistent status outlet and communicates required notes without marking untouched fields invalid', async () => {
    const view = mountTool(path), status = view.one('#oid-observation-notice');
    expect(status).toBeTruthy();
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('');
    expect(view.one('#oid-observation-note').getAttribute('aria-required')).toBe('true');
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    await edit(view.one('#oid-observation-note'), 'A new observation.');
    expect(view.one('#oid-observation-notice')).toBe(status);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it.each(['', '   \n  '])('focuses and describes an invalid note after trying to save %j without losing the draft', async note => {
    const view = mountTool(path, { observationNote: note, observationContext: 'Keep this context', observationNextEvidence: 'Keep this plan' });
    await activate(view.button('Save observation'));
    const control = expectInvalid(view, '#oid-observation-note', 'oid-observation-note-error');
    expect(document.activeElement).toBe(control);
    expect(control.value).toBe(note);
    expect(view.state().observationJournal).toBeUndefined();
    expect(view.state()).toMatchObject({ observationContext: 'Keep this context', observationNextEvidence: 'Keep this plan' });
  });

  it('keeps a note error while it contains whitespace, then removes its error association when corrected', async () => {
    const view = mountTool(path);
    await activate(view.button('Save observation'));
    await edit(view.one('#oid-observation-note'), ' \n ');
    expectInvalid(view, '#oid-observation-note', 'oid-observation-note-error');
    await edit(view.one('#oid-observation-note'), 'Feathers cover the body.');
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    expect(document.activeElement).toBe(view.one('#oid-observation-note'));
  });

  it('exposes both missing revision fields and focuses the first invalid field before the reason', async () => {
    const view = mountTool(path, { observationPreviousId: entry.id, observationJournal: [entry] });
    const reason = view.one('#oid-observation-reason');
    expect(reason).toBeTruthy();
    expect(reason.getAttribute('aria-required')).toBe('true');
    expectValid(view, '#oid-observation-reason', 'oid-observation-reason-error');
    await activate(view.button('Save observation revision'));
    expectInvalid(view, '#oid-observation-note', 'oid-observation-note-error');
    expectInvalid(view, '#oid-observation-reason', 'oid-observation-reason-error');
    expect(document.activeElement).toBe(view.one('#oid-observation-note'));
    await edit(view.one('#oid-observation-note'), 'Revised evidence.');
    await activate(view.button('Save observation revision'));
    expect(document.activeElement).toBe(reason);
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    expectInvalid(view, '#oid-observation-reason', 'oid-observation-reason-error');
    expect(view.state().observationJournal).toEqual([entry]);
  });

  it('retains an invalid revision reason until a meaningful correction, then saves a linked revision beside its original', async () => {
    const view = mountTool(path, { observationPreviousId: entry.id, observationJournal: [entry], observationNote: 'A new wing detail.', observationAnswers: ['yes'] });
    await activate(view.button('Save observation revision'));
    await edit(view.one('#oid-observation-reason'), '   ');
    expectInvalid(view, '#oid-observation-reason', 'oid-observation-reason-error');
    await edit(view.one('#oid-observation-reason'), 'I added the visible wing detail.');
    expectValid(view, '#oid-observation-reason', 'oid-observation-reason-error');
    const status = view.one('#oid-observation-notice');
    await activate(view.button('Save observation revision'));
    const rows = view.state().observationJournal;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject(entry);
    expect(rows[1]).toMatchObject({ note: 'A new wing detail.', previousId: entry.id, reason: 'I added the visible wing detail.', claim: 'Bird example' });
    expect(rows[1].id).not.toBe(entry.id);
    expect(view.state().observationPreviousId).toBe('');
    expect(view.state().observationErrors?.note).not.toBe(true);
    expect(view.state().observationErrors?.reason).not.toBe(true);
    expect(view.one('#oid-observation-reason')).toBeNull();
    expect(view.one('#oid-observation-notice')).toBe(status);
    expect(status.textContent).toMatch(/saved/i);
    expect(view.one('#oid-observation-note').value).toBe('');
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
  });

  it('clears stale errors when selecting a different example while preserving native select focus', async () => {
    const view = mountTool(path, { observationPreviousId: entry.id });
    await activate(view.button('Save observation revision'));
    await edit(view.one('#oid-observation-example'), 'field');
    expect(document.activeElement).toBe(view.one('#oid-observation-example'));
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    expect(view.one('#oid-observation-reason')).toBeNull();
    expect(view.state().observationErrors?.reason).not.toBe(true);
    expect(view.one('[data-key-result]').textContent).toMatch(/Unclassified field observation/);
  });

  it('revisits after render so focus encounters the saved text and clears stale validation from another draft', async () => {
    const view = mountTool(path, { observationJournal: [entry], observationNote: 'Old draft', observationErrors: { note: true, reason: true } });
    const note = view.one('#oid-observation-note'), valuesOnFocus = [];
    note.addEventListener('focus', () => valuesOnFocus.push(note.value));
    await activate(view.button('Revisit Feathered visitor'));
    expect(document.activeElement).toBe(note);
    expect(valuesOnFocus).toEqual([entry.note]);
    expect(view.state()).toMatchObject({ observationPreviousId: entry.id, observationNote: entry.note, observationContext: entry.context, observationNextEvidence: entry.nextEvidence, observationAnswers: ['yes'] });
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    expectValid(view, '#oid-observation-reason', 'oid-observation-reason-error');
  });

  it('retains a full journal and the entire pending revision when capacity prevents saving', async () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ ...entry, id: 'saved-' + index }));
    const view = mountTool(path, { observationJournal: rows, observationPreviousId: rows[0].id, observationNote: 'Unlost draft.', observationReason: 'Unlost revision reason.', observationContext: 'Unlost context.', observationNextEvidence: 'Unlost plan.' });
    await activate(view.button('Save observation revision'));
    expect(view.state()).toMatchObject({ observationJournal: rows, observationPreviousId: rows[0].id, observationNote: 'Unlost draft.', observationReason: 'Unlost revision reason.', observationContext: 'Unlost context.', observationNextEvidence: 'Unlost plan.' });
    expect(view.one('#oid-observation-notice').textContent).toMatch(/60 entries/);
    expectValid(view, '#oid-observation-note', 'oid-observation-note-error');
    expectValid(view, '#oid-observation-reason', 'oid-observation-reason-error');
  });

  it('moves removal and undo focus to a visibly styled heading and restores the original journal order', async () => {
    const second = { ...entry, id: 'saved-2', subject: 'Second observation', note: 'Second entry evidence.' };
    const view = mountTool(path, { observationJournal: [entry, second], observationNote: 'Draft stays here.' });
    const heading = view.one('#oid-journal-heading');
    expect(heading.tabIndex).toBe(-1);
    expect(heading.hasAttribute('data-oid-focus')).toBe(true);
    await activate(view.button('Remove Feathered visitor'));
    expect(document.activeElement).toBe(heading);
    expect(view.state().observationJournal).toHaveLength(1);
    expect(view.state().observationJournal[0]).toMatchObject(second);
    expect(view.state().observationRemoved.row).toMatchObject(entry);
    await activate(view.button('Undo observation removal'));
    expect(document.activeElement).toBe(heading);
    expect(view.state().observationJournal).toHaveLength(2);
    expect(view.state().observationJournal[0]).toMatchObject(entry);
    expect(view.state().observationJournal[1]).toMatchObject(second);
    expect(view.state().observationRemoved).toBeNull();
    expect(view.state().observationNote).toBe('Draft stays here.');
    expect(view.button('Undo observation removal')).toBeUndefined();
    expect(view.one('#oid-observation-notice').textContent).toMatch(/restored/i);
  });

  it('keeps the removed entry available when a full journal prevents undo', async () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ ...entry, id: 'saved-' + index }));
    const removed = { row: { ...entry, id: 'removed-original' }, index: 3 };
    const view = mountTool(path, { observationJournal: rows, observationRemoved: removed });
    await activate(view.button('Undo observation removal'));
    expect(view.state().observationJournal).toEqual(rows);
    expect(view.state().observationRemoved).toEqual(removed);
    expect(view.button('Export removed observation')).toBeTruthy();
    expect(view.one('#oid-observation-notice').textContent).toMatch(/60 entries/);
  });
});
