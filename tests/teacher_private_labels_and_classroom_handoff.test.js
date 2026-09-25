import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Teacher-private labels + in-app Google Classroom handoff (2026-09-25).
//
// The label is the only place a teacher may keep "who is Brave Otter" inside AlloFlow. It must
// live under its own storage key, render only while the teacher chooses to show it, vanish when
// the panel closes, and never reach rosterKey (and so never reach any export, sync or AI path).
// The handoff must accept a roster only from the helper window this panel opened, on this origin.

const require = createRequire(import.meta.url);
const source = readFileSync('teacher_source.jsx', 'utf8');
const PRIVATE = 'Private Initials ZQ';
let React, createRoot, act, root, container, internals, liveRoster, setterCalls;
const clone = value => JSON.parse(JSON.stringify(value));

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('teacher_module.js');
  internals = window.AlloModules.TeacherPrivateLabelInternals;
});

function roster(classId = 'CLS-fictional-a') {
  return window.AlloModules.RosterIdentityInternals.normalizeRosterImport({
    classId, className: 'Fictional class',
    groups: { blue: { name: 'Blue', color: '#4F46E5', profile: {} } },
    students: { 'Calm Otter': 'blue', 'Quiet Owl': '' },
    learnerIds: { 'Calm Otter': 'LRN-calm', 'Quiet Owl': 'LRN-quiet' },
    learnerPreferences: {}, progressHistory: {}, sessionHistory: [],
  });
}

async function mount(props = {}) {
  setterCalls = [];
  function Host() {
    const [current, setCurrent] = React.useState(props.roster || roster());
    liveRoster = current;
    const setRosterKey = React.useCallback(next => {
      setCurrent(prev => { const value = typeof next === 'function' ? next(prev) : next; setterCalls.push(clone(value)); return value; });
    }, []);
    return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: props.isOpen ?? true, onClose() {}, rosterKey: current, setRosterKey, t: key => key, ...props.panel });
  }
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
}
function button(text) { return [...container.querySelectorAll('button')].find(item => item.textContent.trim() === text); }
async function click(element) { await act(async () => element.click()); }
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(input, name) { await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))); }
function stored() { return JSON.parse(localStorage.getItem(internals.storageKey) || 'null'); }
async function post(source, data, origin = window.location.origin) {
  const event = new MessageEvent('message', { data, origin });
  Object.defineProperty(event, 'source', { value: source });
  await act(async () => window.dispatchEvent(event));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

describe('private label store', () => {
  it('normalizes, bounds, keys by class and keeps only the most recent classes', () => {
    expect(internals.normalizeLabel('  A.\u0000S.  \n ')).toBe('A. S.');
    expect(internals.normalizeLabel('x'.repeat(200))).toHaveLength(internals.maxLength);
    let store = internals.setLabel(undefined, 'CLS-a', 'Calm Otter', ' AS ');
    expect(store).toEqual({ version: 1, byClass: { 'CLS-a': { 'Calm Otter': 'AS' } } });
    store = internals.setLabel(store, 'CLS-a', 'Calm Otter', '');
    expect(store.byClass).toEqual({});
    for (let index = 0; index < internals.maxClasses + 3; index++) store = internals.setLabel(store, 'CLS-' + index, 'Owl', 'L' + index);
    expect(internals.write(localStorage, store)).toBe(true);
    const kept = Object.keys(internals.read(localStorage).byClass);
    expect(kept).toHaveLength(internals.maxClasses);
    expect(kept.at(-1)).toBe('CLS-' + (internals.maxClasses + 2));
    expect(internals.write(localStorage, internals.clearClass({ byClass: { only: { Owl: 'x' } } }, 'only'))).toBe(true);
    expect(localStorage.getItem(internals.storageKey)).toBeNull();
    localStorage.setItem(internals.storageKey, '{not json');
    expect(internals.read(localStorage)).toEqual({ version: 1, byClass: {} });
    localStorage.setItem(internals.storageKey, JSON.stringify({ byClass: { 'CLS-a': { Owl: 7, Fox: ' Fine ' }, bad: null } }));
    expect(internals.read(localStorage)).toEqual({ version: 1, byClass: { 'CLS-a': { Fox: 'Fine' } } });
  });

  it('never touches rosterKey and is not visible until the teacher shows it', async () => {
    await mount();
    expect(container.textContent).not.toContain('+ label');
    expect(button('roster.hide_private_labels')).toBeUndefined();
    await click(button('roster.show_private_labels'));
    expect(container.textContent).toContain('never exported, printed, shared to a live session');
    const add = container.querySelector('button[aria-label="Add private label for Quiet Owl"]');
    await click(add);
    const input = container.querySelector('input[aria-label="Private label for Quiet Owl (this device only)"]');
    await type(input, PRIVATE);
    await key(input, 'Enter');
    expect(container.textContent).toContain(PRIVATE);
    expect(stored()).toEqual({ version: 1, byClass: { 'CLS-fictional-a': { 'Quiet Owl': PRIVATE } } });
    expect(JSON.stringify(liveRoster)).not.toContain(PRIVATE);
    expect(JSON.stringify(setterCalls)).not.toContain(PRIVATE);
    expect(localStorage.getItem('alloflow_roster_key') || '').not.toContain(PRIVATE);
    // The roster export is the JSON blob the teacher downloads; it must stay codename-only.
    const blobs = [];
    window.URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return 'blob:fictional'; });
    window.URL.revokeObjectURL = vi.fn();
    window.HTMLAnchorElement.prototype.click = vi.fn();
    await click(button('roster.export'));
    expect(blobs).toHaveLength(1);
    expect(await blobs[0].text()).not.toContain(PRIVATE);
    await click(button('roster.hide_private_labels'));
    expect(container.textContent).not.toContain(PRIVATE);
  });

  it('follows the codename through deletion and switches with the class', async () => {
    localStorage.setItem(internals.storageKey, JSON.stringify({ version: 1, byClass: {
      'CLS-fictional-a': { 'Quiet Owl': PRIVATE, 'Calm Otter': 'CO' }, 'CLS-fictional-b': { 'Quiet Owl': 'Other class label' } } }));
    await mount();
    await click(button('roster.show_private_labels'));
    expect(container.textContent).toContain(PRIVATE);
    expect(container.textContent).not.toContain('Other class label');
    await click(container.querySelector('button[aria-label="Delete Quiet Owl from roster"]'));
    expect(liveRoster.students['Quiet Owl']).toBeUndefined();
    expect(stored().byClass['CLS-fictional-a']).toEqual({ 'Calm Otter': 'CO' });
    expect(stored().byClass['CLS-fictional-b']).toEqual({ 'Quiet Owl': 'Other class label' });
    await click(button('Clear private labels for this class'));
    expect(stored().byClass['CLS-fictional-a']).toBeUndefined();
    expect(stored().byClass['CLS-fictional-b']).toEqual({ 'Quiet Owl': 'Other class label' });
  });

  it('hides labels again whenever the panel closes and offers nothing in parent or independent mode', async () => {
    localStorage.setItem(internals.storageKey, JSON.stringify({ version: 1, byClass: { 'CLS-fictional-a': { 'Quiet Owl': PRIVATE } } }));
    await mount({ panel: { isParentMode: true } });
    expect(button('roster.show_private_labels')).toBeUndefined();
    expect(container.textContent).not.toContain(PRIVATE);
    await act(async () => root.unmount());
    root = null;
    await mount({ panel: { isIndependentMode: true } });
    expect(button('roster.show_private_labels')).toBeUndefined();
    await act(async () => root.unmount());
    root = null;
    function Toggle() {
      const [open, setOpen] = React.useState(true);
      window.__closeRoster = () => setOpen(false);
      return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: open, onClose() {}, rosterKey: roster(), setRosterKey() {}, t: key => key });
    }
    root = createRoot(container);
    await act(async () => root.render(React.createElement(Toggle)));
    await click(button('roster.show_private_labels'));
    expect(container.textContent).toContain(PRIVATE);
    await act(async () => window.__closeRoster());
    await act(async () => root.render(React.createElement(Toggle)));
    expect(container.textContent).not.toContain(PRIVATE);
    delete window.__closeRoster;
  });

  it('keeps the label store out of every export, print, Store and sync handler in the source', () => {
    const start = source.indexOf('const handleRosterUpdateFile = ');
    const end = source.indexOf('const handleImport = ', start);
    for (const name of ['const handleExport = ', 'const handleStoreRosterExport = ', 'const handlePrintRosterWorksheet = ', 'const requestOfflineSubmissionSetup']) {
      const at = source.indexOf(name);
      expect(at).toBeGreaterThan(-1);
      const body = source.slice(at, source.indexOf('\n  const ', at + name.length + 10));
      expect(body).not.toMatch(/privateLabel|PrivateLabel/);
    }
    expect(source.slice(start, end)).not.toMatch(/privateLabel|PrivateLabel/);
    expect(source).toContain("const ALLO_TEACHER_PRIVATE_LABELS_KEY = 'alloflow_teacher_private_labels';");
    expect(readFileSync('teacher_module.js', 'utf8')).toBe(readFileSync('desktop/web-app/public/teacher_module.js', 'utf8'));
  });
});

describe('in-app Google Classroom handoff', () => {
  const rosterJson = (classId = 'CLS-from-classroom') => JSON.stringify({
    className: '', classId, groups: {}, students: { 'Brave Bear': '', 'Brave Dolphin': '' },
    learnerIds: { 'Brave Bear': 'LRN-11111111-1111-4111-8111-111111111111', 'Brave Dolphin': 'LRN-22222222-2222-4222-8222-222222222222' },
    learnerPreferences: {}, readingThemeDefault: 'default', progressHistory: {}, sessionHistory: [], exportVersion: 4,
  });
  function helperWindow() { return { closed: false, postMessage: vi.fn(), focus: vi.fn() }; }

  it('accepts the roster only from the helper window it opened, on its own origin, in the documented shape', async () => {
    const helper = helperWindow();
    const stranger = helperWindow();
    vi.spyOn(window, 'open').mockReturnValue(helper);
    await mount();
    await click(button('Google Classroom setup'));
    expect(window.open).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/classroom-import.html', 'alloflow-classroom-import');
    await post(stranger, { type: internals.handoffType, json: rosterJson() });
    await post(helper, { type: internals.handoffType, json: rosterJson() }, 'https://evil.example.test');
    await post(helper, { type: 'other', json: rosterJson() });
    await post(helper, { type: internals.handoffType, json: JSON.parse(rosterJson()) });
    expect(liveRoster.classId).toBe('CLS-fictional-a');
    expect(helper.postMessage).not.toHaveBeenCalled();
    expect(stranger.postMessage).not.toHaveBeenCalled();
    await post(helper, { type: internals.handoffType, json: rosterJson() });
    // No native dialog: it would open in this (background) tab and stall both windows.
    expect(window.confirm).not.toHaveBeenCalled();
    expect(liveRoster.classId).toBe('CLS-fictional-a');
    expect(helper.postMessage).toHaveBeenCalledTimes(1);
    const [waiting, origin] = helper.postMessage.mock.calls[0];
    expect(origin).toBe(window.location.origin);
    expect(waiting).toEqual({ type: internals.handoffReply, ok: true, pending: true, message: expect.stringContaining('Switch to the AlloFlow tab') });
    const card = container.querySelector('[aria-labelledby="classroom-handoff-title"]');
    expect(card.textContent).toContain('2 codenames from Google Classroom');
    expect(document.activeElement).toBe(card);
    await click(button('Replace roster'));
    expect(liveRoster.classId).toBe('CLS-from-classroom');
    expect(Object.keys(liveRoster.students).sort()).toEqual(['Brave Bear', 'Brave Dolphin']);
    expect(helper.postMessage.mock.calls.at(-1)[0]).toEqual({ type: internals.handoffReply, ok: true, pending: false, message: expect.stringContaining('2 codenames') });
    expect(container.querySelector('[aria-labelledby="classroom-handoff-title"]')).toBeNull();
    expect(container.textContent).toContain('Roster imported: 0 groups and 2 codenames');
  });

  it('reports a declined confirmation, an invalid roster and an oversized payload back to the helper without changing the roster', async () => {
    const helper = helperWindow();
    vi.spyOn(window, 'open').mockReturnValue(helper);
    await mount();
    await click(button('Google Classroom setup'));
    await post(helper, { type: internals.handoffType, json: rosterJson() });
    await click(button('Cancel'));
    expect(liveRoster.classId).toBe('CLS-fictional-a');
    expect(helper.postMessage.mock.calls.at(-1)[0]).toEqual({ type: internals.handoffReply, ok: false, pending: false, message: 'Roster replacement cancelled. Nothing changed.' });
    // A second send while one is waiting replaces it and tells the helper the first was superseded.
    await post(helper, { type: internals.handoffType, json: rosterJson('CLS-first') });
    await post(helper, { type: internals.handoffType, json: rosterJson('CLS-second') });
    expect(helper.postMessage.mock.calls.at(-2)[0]).toMatchObject({ ok: false, message: expect.stringContaining('newer roster') });
    await click(button('Replace roster'));
    expect(liveRoster.classId).toBe('CLS-second');
    await post(helper, { type: internals.handoffType, json: '{"students": "not a roster"' });
    expect(helper.postMessage.mock.calls.at(-1)[0].ok).toBe(false);
    await post(helper, { type: internals.handoffType, json: 'x'.repeat(2 * 1024 * 1024 + 1) });
    expect(helper.postMessage.mock.calls.at(-1)[0]).toEqual({ type: internals.handoffReply, ok: false, pending: false, message: 'That roster is larger than the 2 MB safety limit.' });
    expect(container.querySelector('[aria-labelledby="classroom-handoff-title"]')).toBeNull();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(liveRoster.classId).toBe('CLS-second');                // invalid and oversized sends changed nothing
  });

  it('ignores handoff messages entirely in parent and independent mode and before the helper was opened', async () => {
    const helper = helperWindow();
    vi.spyOn(window, 'open').mockReturnValue(helper);
    await mount();
    await post(helper, { type: internals.handoffType, json: rosterJson() });
    expect(liveRoster.classId).toBe('CLS-fictional-a');
    expect(helper.postMessage).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    root = null;
    await mount({ panel: { isParentMode: true } });
    expect(button('Google Classroom setup')).toBeUndefined();
    await post(helper, { type: internals.handoffType, json: rosterJson() });
    expect(liveRoster.classId).toBe('CLS-fictional-a');
  });

  it('exposes the same acceptance rule the panel uses', () => {
    const helper = {};
    const ok = internals.acceptHandoff({ source: helper, origin: 'https://a.test', data: { type: internals.handoffType, json: '{}' } }, helper, 'https://a.test');
    expect(ok).toEqual({ json: '{}', mode: 'replace' });
    expect(internals.acceptHandoff({ source: helper, origin: 'https://a.test', data: { type: internals.handoffType, json: '{}' } }, {}, 'https://a.test')).toBeNull();
    expect(internals.acceptHandoff({ source: helper, origin: 'https://b.test', data: { type: internals.handoffType, json: '{}' } }, helper, 'https://a.test')).toBeNull();
    expect(internals.acceptHandoff({ source: helper, origin: '', data: { type: internals.handoffType, json: '{}' } }, helper, '')).toBeNull();
    expect(internals.acceptHandoff({ source: helper, origin: 'https://a.test', data: null }, helper, 'https://a.test')).toBeNull();
  });
});
