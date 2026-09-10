import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let api, React, createRoot, act, root, container, currentRoster;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('teacher_module.js');
  api = window.AlloModules.RosterIdentityInternals;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function roster() {
  return {
    classId: 'CLS-fictional', className: 'Do not share this class label',
    groups: { blue: { name: 'Blue', color: '#4F46E5', profile: { readingLevel: 'Grade 3' } } },
    students: { 'Calm Otter': 'blue', 'Quiet Owl': '' },
    learnerIds: { 'Calm Otter': 'LRN-calm', 'Quiet Owl': 'LRN-quiet' },
    learnerPreferences: { 'LRN-calm': { readingTheme: 'warm' } },
    progressHistory: { 'Calm Otter': [{ score: 2 }] }, sessionHistory: [],
    displayNames: { 'Calm Otter': 'Fictional private name' },
    accessToken: 'fictional-never-export', submissionKey: { privateJwk: { d: 'fictional-key' } }
  };
}
async function mount(props = {}) {
  container = document.createElement('div'); document.body.appendChild(container);
  function Host() {
    const [value, setValue] = React.useState(() => api.ensureRosterIdentity(roster()));
    currentRoster = value;
    return React.createElement(window.AlloModules.RosterKeyPanel, {
      isOpen: true, onClose() {}, rosterKey: value, setRosterKey: setValue, t: key => key, ...props
    });
  }
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
}
function exportButton() { return [...container.querySelectorAll('button')].find(b => b.textContent.includes('Store review file')); }
function downloadSpies() {
  const blobs = [], downloads = [];
  const create = vi.fn(() => 'blob:fictional-store-review'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends globalThis.URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  vi.stubGlobal('Blob', class { constructor(parts, options) { blobs.push({ parts, options }); } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
  return { blobs, downloads, create, revoke };
}
describe('Store review download in the actual Teacher panel', () => {
  it('requires review and does not download or change records when cancelled', async () => {
    await mount(); const before = JSON.stringify(currentRoster), spies = downloadSpies();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => exportButton().click());
    expect(spies.create).not.toHaveBeenCalled(); expect(spies.downloads).toEqual([]);
    expect(JSON.stringify(currentRoster)).toBe(before);
    expect(container.textContent).toContain('download cancelled');
  });
  it('downloads only the manifest, uses a fixed filename and releases its URL on unmount', async () => {
    await mount(); const before = JSON.stringify(currentRoster), spies = downloadSpies();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await act(async () => exportButton().click());
    expect(confirm.mock.calls[0][0]).toContain('pseudonymous identifiers');
    expect(spies.downloads).toEqual(['class.alloflow-store-roster.json']);
    expect(JSON.parse(spies.blobs[0].parts.join(''))).toEqual(api.buildStoreRosterManifest(currentRoster));
    expect(JSON.stringify(currentRoster)).toBe(before);
    expect(container.textContent).toContain('No records or points changed');
    await act(async () => root.unmount()); root = null;
    expect(spies.revoke).toHaveBeenCalledWith('blob:fictional-store-review');
    expect(document.querySelector('a[download="class.alloflow-store-roster.json"]')).toBeNull();
  });
  it.each([{ isParentMode: true }, { isIndependentMode: true }])('hides the Store export outside teacher mode: %j', async props => {
    await mount(props); expect(exportButton()).toBeUndefined();
  });
});
describe('minimal Store linking manifest', () => {
  it('copies only existing pseudonymous identities without changing the roster', () => {
    const input = roster(), before = JSON.stringify(input);
    expect(api.buildStoreRosterManifest(input)).toEqual({
      format: 'alloflow-store-roster', version: 1, classId: 'CLS-fictional',
      learners: [{ learnerId: 'LRN-calm', codename: 'Calm Otter' }, { learnerId: 'LRN-quiet', codename: 'Quiet Owl' }]
    });
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each([
    ['missing class ID', r => { delete r.classId; }],
    ['missing learner ID', r => { delete r.learnerIds['Calm Otter']; }],
    ['duplicate ID', r => { r.learnerIds['Quiet Owl'] = 'LRN-calm'; }],
    ['extra identity', r => { r.learnerIds.Unused = 'LRN-unused'; }],
    ['reserved identity', r => { r.learnerIds['Quiet Owl'] = '__proto__'; }],
    ['reserved identity variant', r => { r.learnerIds['Quiet Owl'] = 'Constructor'; }],
    ['reserved class variant', r => { r.classId = 'PROTOTYPE'; }],
    ['trimmed identity', r => { r.classId = ' CLS-fictional '; }],
    ['overlong identity', r => { r.classId = 'x'.repeat(161); }],
    ['equivalent codenames', r => { r.students['calm-otter'] = ''; r.learnerIds['calm-otter'] = 'LRN-new'; }],
    ['empty roster', r => { r.students = {}; r.learnerIds = {}; }],
    ['control characters', r => { r.students['Hidden\u0000Otter'] = ''; r.learnerIds['Hidden\u0000Otter'] = 'LRN-hidden'; }]
  ])('refuses %s without silently generating IDs', (_label, mutate) => {
    const input = roster(); mutate(input);
    const before = JSON.stringify(input);
    expect(() => api.buildStoreRosterManifest(input)).toThrow();
    expect(JSON.stringify(input)).toBe(before);
  });
  it('accepts 500 valid identities but rejects a larger class without truncation', () => {
    const input = roster(); input.students = {}; input.learnerIds = {};
    for (let i = 0; i < 500; i++) { input.students['Calm Otter ' + i] = ''; input.learnerIds['Calm Otter ' + i] = 'LRN-' + i; }
    expect(api.buildStoreRosterManifest(input).learners).toHaveLength(500);
    input.students.Extra = ''; input.learnerIds.Extra = 'LRN-extra';
    expect(() => api.buildStoreRosterManifest(input)).toThrow(/class size limits/);
  });
});
