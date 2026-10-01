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
let React, createRoot, act, root, container, internals, liveRoster, setterCalls, setPanelOpen, extraRoots = [];
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
    const [open, setOpen] = React.useState(props.isOpen ?? true);
    liveRoster = current;
    setPanelOpen = setOpen;
    const setRosterKey = React.useCallback(next => {
      setCurrent(prev => { const value = typeof next === 'function' ? next(prev) : next; setterCalls.push(clone(value)); return value; });
    }, []);
    return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: open, onClose() {}, rosterKey: current, setRosterKey, t: key => key, ...props.panel });
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
  for (const [extraRoot, extraContainer] of extraRoots) { await act(async () => extraRoot.unmount()); extraContainer.remove(); }
  extraRoots = [];
  container.remove();
  vi.restoreAllMocks();
});
const english = () => undefined;                                  // the host's t() for a key it does not have
// A second AlloFlow tab: its own React state, the same browser storage.
async function mountTab(rosterValue, panel = {}) {
  const tab = { container: document.createElement('div') };
  document.body.appendChild(tab.container);
  function Host() {
    const [current, setCurrent] = React.useState(rosterValue);
    tab.roster = current;
    return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: true, onClose() {}, rosterKey: current, setRosterKey: setCurrent, t: english, ...panel });
  }
  const tabRoot = createRoot(tab.container);
  extraRoots.push([tabRoot, tab.container]);
  await act(async () => tabRoot.render(React.createElement(Host)));
  tab.button = text => [...tab.container.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  return tab;
}
async function labelIn(scope, codename, text) {
  await click(scope.querySelector(`button[aria-label="Add private label for ${codename}"]`) || scope.querySelector(`button[aria-label="Edit private label for ${codename}"]`));
  const input = scope.querySelector(`input[aria-label="Private label for ${codename} (this device only)"]`);
  await type(input, text);
  await key(input, 'Enter');
}
function rejectPrivateWrite(method, errorName) {
  const original = Storage.prototype[method];
  return vi.spyOn(Storage.prototype, method).mockImplementation(function(key, ...args) {
    if (key === internals.storageKey) throw new DOMException('Synthetic storage refusal', errorName);
    return original.call(this, key, ...args);
  });
}
function seedLabel() {
  localStorage.setItem(internals.storageKey, JSON.stringify({version:2,byClass:{'CLS-fictional-a':{'LRN-quiet':PRIVATE,'LRN-calm':'Other private label'}},learnerIdClasses:{'CLS-fictional-a':true}}));
}
async function reopen() {
  await act(async () => root.unmount()); root = null;
  await mount({panel:{t:english}});
  await click(button('Show my private labels'));
}
describe('isolated read-only private-label storage failure audit', () => {
  it('control: an ordinary save is durable', async () => {
    await mount({panel:{t:english}});
    await click(button('Show my private labels'));
    await labelIn(container,'Quiet Owl',PRIVATE);
    expect(stored().byClass['CLS-fictional-a']['LRN-quiet']).toBe(PRIVATE);
    await reopen();
    expect(container.textContent).toContain(PRIVATE);
  });
  it('reproduces quota-refused save displayed as saved and lost on reopen', async () => {
    await mount({panel:{t:english}});
    await click(button('Show my private labels'));
    const failure = rejectPrivateWrite('setItem','QuotaExceededError');
    await labelIn(container,'Quiet Owl',PRIVATE);
    expect(failure).toHaveBeenCalled();
    expect(container.textContent).toContain(PRIVATE);
    expect(container.querySelector('input[aria-label="Private label for Quiet Owl (this device only)"]')).toBeNull();
    expect(stored()).toBeNull();
    failure.mockRestore();
    await reopen();
    expect(container.textContent).not.toContain(PRIVATE);
    console.log('REPRODUCED save: label appears saved; edit draft cleared; storage empty; label lost after reopening.');
  });
  it('reproduces denied clear hidden in UI but retained and shown after reopen', async () => {
    seedLabel();
    await mount({panel:{t:english}});
    await click(button('Show my private labels'));
    const failure = rejectPrivateWrite('removeItem','SecurityError');
    await click(button('Clear private labels for this class'));
    expect(failure).toHaveBeenCalled();
    expect(container.textContent).not.toContain(PRIVATE);
    expect(stored().byClass['CLS-fictional-a']['LRN-quiet']).toBe(PRIVATE);
    failure.mockRestore();
    await reopen();
    expect(container.textContent).toContain(PRIVATE);
    console.log('REPRODUCED clear: confirmed deletion hides labels but keeps stored data; labels return after reopening.');
  });
  it('reproduces learner deletion leaving private label stored after denied write', async () => {
    seedLabel();
    await mount({panel:{t:english}});
    await click(button('Show my private labels'));
    const failure = rejectPrivateWrite('setItem','SecurityError');
    await click(container.querySelector('button[aria-label="Delete Quiet Owl from roster"]'));
    expect(failure).toHaveBeenCalled();
    expect(liveRoster.students['Quiet Owl']).toBeUndefined();
    expect(stored().byClass['CLS-fictional-a']['LRN-quiet']).toBe(PRIVATE);
    expect(container.textContent).toContain('deleted from the roster.');
    failure.mockRestore();
    await reopen();
    expect(container.textContent).toContain(PRIVATE);
    console.log('REPRODUCED delete: learner removed but private label stays on disk and returns when original learner ID is restored.');
  });
});
