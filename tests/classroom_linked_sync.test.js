import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Linked Google Classroom sync (2026-09-25).
//
// A linked class keeps a random key on the teacher's device. The helper derives learner and class
// IDs from Google IDs with that key, so reading the same class again reproduces the same IDs and
// the roster panel's existing safe-update planner can match returning students, add new ones and
// keep departed ones. These tests drive the REAL helper service and the REAL roster panel through
// the same messages the two windows exchange; only the Google API responses are fictional.

const require = createRequire(import.meta.url);
const service = require(resolve('classroom_import_service.js'));
const COURSE = '800000001';
const OTHER_COURSE = '800000002';
const KEY_A = 'A'.repeat(42) + 'A';
const KEY_B = 'B'.repeat(42) + 'A';
const PLANNER_LEARNER = /^LRN-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLANNER_CLASS = /^CLS-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let React, createRoot, act, root, container, internals, liveRoster;

function snapshot(students, courseId = COURSE) {
  return {
    status: 'complete', selectedCourseId: courseId, expectedStudentCount: students.length, consistency: 'PAGINATED_MEMBERSHIP_CAN_CHANGE',
    pages: [{ status: 'success', courseId, requestPageToken: '', response: {
      students: students.map(([userId, fullName]) => ({ courseId, userId, profile: { id: userId, name: { fullName } } })), nextPageToken: '' } }],
  };
}
const AVERY = ['700000001', 'Fictional Avery'], JORDAN = ['700000002', 'Fictional Jordan'], RILEY = ['700000003', 'Fictional Riley'];

describe('keyed deterministic IDs in the helper service', () => {
  it('reproduces the same class and learner IDs for the same key and differs for another key', async () => {
    const first = await service.convertLinkedSnapshot(snapshot([AVERY, JORDAN]), { syncKey: KEY_A, classId: null, existing: {} });
    const again = await service.convertLinkedSnapshot(snapshot([JORDAN, AVERY]), { syncKey: KEY_A, classId: null, existing: {} });
    const other = await service.convertLinkedSnapshot(snapshot([AVERY, JORDAN]), { syncKey: KEY_B, classId: null, existing: {} });
    expect(first.roster.classId).toMatch(PLANNER_CLASS);
    expect(Object.values(first.roster.learnerIds).every(id => PLANNER_LEARNER.test(id))).toBe(true);
    expect(again.roster.classId).toBe(first.roster.classId);
    expect(new Set(Object.values(again.roster.learnerIds))).toEqual(new Set(Object.values(first.roster.learnerIds)));
    expect(other.roster.classId).not.toBe(first.roster.classId);
    expect(Object.values(other.roster.learnerIds).some(id => Object.values(first.roster.learnerIds).includes(id))).toBe(false);
    expect((await service.linkedClassIds(KEY_A, [COURSE]))[COURSE]).toBe(first.roster.classId);
    for (const secret of ['Fictional Avery', 'Fictional Jordan', '700000001', '700000002', COURSE, KEY_A]) expect(first.json).not.toContain(secret);
    expect(first.preview.map(row => row.status)).toEqual(['new', 'new']);
  });

  it('keeps returning codenames, gives newcomers unused codenames and counts departures', async () => {
    const linked = await service.convertLinkedSnapshot(snapshot([AVERY, JORDAN]), { syncKey: KEY_A, classId: null, existing: {} });
    const existing = Object.fromEntries(Object.entries(linked.roster.learnerIds).map(([codename, id]) => [id, codename]));
    const averyId = linked.preview.find(row => row.fullName === 'Fictional Avery').learnerId;
    existing[averyId] = 'Gentle Otter';                     // teacher-visible codenames need not follow the sequence
    const jordanCodename = linked.preview.find(row => row.fullName === 'Fictional Jordan').codename;
    const synced = await service.convertLinkedSnapshot(snapshot([AVERY, RILEY]), { syncKey: KEY_A, classId: linked.roster.classId, existing });
    const byName = Object.fromEntries(synced.preview.map(row => [row.fullName, row]));
    expect(byName['Fictional Avery']).toMatchObject({ codename: 'Gentle Otter', learnerId: averyId, status: 'returning' });
    expect(byName['Fictional Riley'].status).toBe('new');
    expect(['Gentle Otter', jordanCodename]).not.toContain(byName['Fictional Riley'].codename);
    expect(synced).toMatchObject({ returningCount: 1, newCount: 1, absentCount: 1, studentCount: 2 });
  });

  it('refuses the wrong Classroom class, a malformed key and a malformed codename map', async () => {
    const linked = await service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: KEY_A, classId: null, existing: {} });
    await expect(service.convertLinkedSnapshot(snapshot([AVERY], OTHER_COURSE), { syncKey: KEY_A, classId: linked.roster.classId, existing: {} }))
      .rejects.toMatchObject({ code: 'LINKED_CLASS_MISMATCH' });
    await expect(service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: 'short', classId: null, existing: {} })).rejects.toMatchObject({ code: 'INVALID_SYNC_KEY' });
    await expect(service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: 'A'.repeat(42) + 'B', classId: null, existing: {} })).rejects.toMatchObject({ code: 'INVALID_SYNC_KEY' });
    await expect(service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: KEY_A, classId: null, existing: { 'LRN-not-uuid': 'Calm Owl' } })).rejects.toMatchObject({ code: 'MALFORMED_REQUEST' });
    const id = Object.values(linked.roster.learnerIds)[0];
    await expect(service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: KEY_A, classId: linked.roster.classId, existing: { [id]: 'Calm Owl', ['LRN-00000000-0000-4000-8000-000000000000']: 'calm-owl' } }))
      .rejects.toMatchObject({ code: 'MALFORMED_REQUEST' });
    await expect(service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: KEY_A, classId: null, existing: { [id]: 'Calm Owl' } })).rejects.toMatchObject({ code: 'MALFORMED_REQUEST' });
  });
});

describe('linked sync through the real roster panel', () => {
  beforeAll(() => {
    React = require(resolve('desktop/web-app/node_modules/react'));
    ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
    act = React.act;
    globalThis.React = window.React = React;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule('teacher_module.js');
    internals = window.AlloModules.TeacherPrivateLabelInternals;
  });
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

  async function mount(initial = null) {
    function Host() {
      const [current, setCurrent] = React.useState(initial);
      liveRoster = current;
      return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: true, onClose() {}, rosterKey: current, setRosterKey: setCurrent, t: key => key });
    }
    root = createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
  }
  const button = text => [...container.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  async function click(element) { await act(async () => element.click()); }
  async function post(source, data, origin = window.location.origin) {
    const event = new MessageEvent('message', { data, origin });
    Object.defineProperty(event, 'source', { value: source });
    await act(async () => window.dispatchEvent(event));
  }
  function helperWindow() { return { closed: false, postMessage: vi.fn(), focus: vi.fn() }; }
  async function openHelper() {
    const helper = helperWindow();
    vi.spyOn(window, 'open').mockReturnValue(helper);
    const label = button('Sync with Google Classroom') ? 'Sync with Google Classroom' : 'Google Classroom setup';
    await click(button(label));
    window.open.mockRestore();
    await post(helper, { type: internals.helloType });
    const context = helper.postMessage.mock.calls.at(-1)[0];
    expect(helper.postMessage.mock.calls.at(-1)[1]).toBe(window.location.origin);
    return { helper, context };
  }
  const reply = helper => helper.postMessage.mock.calls.at(-1)[0];
  const storedKeys = () => JSON.parse(localStorage.getItem(internals.syncKeysKey) || 'null');

  it('links a class on first send, then syncs it through the reviewed update without losing codenames', async () => {
    await mount();
    // 1. Link: the panel hands the helper a fresh key; the helper derives IDs with it.
    const first = await openHelper();
    expect(first.context).toMatchObject({ type: internals.contextType, mode: 'link', classId: null, existing: {} });
    expect(first.context.syncKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const linked = await service.convertLinkedSnapshot(snapshot([AVERY, JORDAN]), { syncKey: first.context.syncKey, classId: null, existing: {} });
    await post(first.helper, { type: internals.handoffType, json: linked.json, mode: 'link' });
    expect(reply(first.helper)).toMatchObject({ ok: true, pending: true });
    expect(storedKeys()).toBeNull();                              // nothing is linked until the teacher confirms
    expect(container.textContent).toContain('also be linked to Google Classroom on this device');
    await click(button('Replace roster'));
    expect(reply(first.helper)).toMatchObject({ ok: true, pending: false, message: expect.stringContaining('now linked to Google Classroom on this device') });
    expect(liveRoster.classId).toBe(linked.roster.classId);
    expect(storedKeys().byClass[linked.roster.classId].key).toBe(first.context.syncKey);
    expect(JSON.stringify(liveRoster)).not.toContain(first.context.syncKey);
    expect(button('Sync with Google Classroom')).toBeTruthy();
    expect(container.textContent).toContain('Linked to Google Classroom on this device.');
    const averyCodename = linked.preview.find(row => row.fullName === 'Fictional Avery').codename;
    const jordanCodename = linked.preview.find(row => row.fullName === 'Fictional Jordan').codename;

    // 2. Sync: Jordan left, Riley joined. The panel sends the same key and the codename map.
    const second = await openHelper();
    expect(second.context).toMatchObject({ mode: 'sync', syncKey: first.context.syncKey, classId: linked.roster.classId });
    expect(Object.values(second.context.existing).sort()).toEqual([averyCodename, jordanCodename].sort());
    const synced = await service.convertLinkedSnapshot(snapshot([AVERY, RILEY]), { syncKey: second.context.syncKey, classId: second.context.classId, existing: second.context.existing });
    const before = JSON.stringify(liveRoster);
    await post(second.helper, { type: internals.handoffType, json: synced.json, mode: 'sync' });
    expect(reply(second.helper)).toMatchObject({ ok: true, message: expect.stringContaining('Review and confirm the update') });
    expect(JSON.stringify(liveRoster)).toBe(before);           // nothing changes before the teacher confirms
    const preview = container.querySelector('[aria-labelledby="roster-update-preview-title"]');
    expect(preview).toBeTruthy();
    const rileyCodename = synced.preview.find(row => row.fullName === 'Fictional Riley').codename;
    expect(preview.textContent).toContain(rileyCodename);
    expect(preview.textContent).toContain(jordanCodename);     // listed as absent, kept
    const acknowledge = preview.querySelector('input[type="checkbox"]');
    await act(async () => acknowledge.click());
    await click(button('Confirm safe update'));
    expect(Object.keys(liveRoster.students).sort()).toEqual([averyCodename, jordanCodename, rileyCodename].sort());
    expect(liveRoster.learnerIds[averyCodename]).toBe(linked.roster.learnerIds[averyCodename]);
    expect(liveRoster.classId).toBe(linked.roster.classId);
    for (const secret of ['Fictional', '700000001', COURSE, first.context.syncKey]) expect(JSON.stringify(liveRoster)).not.toContain(secret);
  });

  it('refuses a sync for an unlinked class, a link it did not start, and messages from other windows', async () => {
    const unlinked = window.AlloModules.RosterIdentityInternals.normalizeRosterImport({
      classId: 'CLS-11111111-1111-4111-8111-111111111111', className: 'Existing', groups: {},
      students: { 'Calm Owl': '' }, learnerIds: { 'Calm Owl': 'LRN-22222222-2222-4222-8222-222222222222' },
    });
    await mount(unlinked);
    const helper = helperWindow();
    await post(helper, { type: internals.helloType });            // not opened by this panel
    expect(helper.postMessage).not.toHaveBeenCalled();
    const { helper: opened } = await openHelper();
    const stranger = helperWindow();
    await post(stranger, { type: internals.helloType });
    expect(stranger.postMessage).not.toHaveBeenCalled();
    const synced = await service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: KEY_A, classId: null, existing: {} });
    await post(opened, { type: internals.handoffType, json: synced.json, mode: 'sync' });
    expect(reply(opened)).toEqual({ type: internals.handoffReply, ok: false, pending: false, message: 'This AlloFlow class is not linked to Google Classroom on this device. Nothing changed.' });
    expect(liveRoster.classId).toBe(unlinked.classId);
    expect(container.querySelector('[aria-labelledby="roster-update-preview-title"]')).toBeNull();
  });

  it('saves, loads and unlinks the device key only on explicit teacher actions', async () => {
    await mount();
    const { helper, context } = await openHelper();
    const linked = await service.convertLinkedSnapshot(snapshot([AVERY]), { syncKey: context.syncKey, classId: null, existing: {} });
    await post(helper, { type: internals.handoffType, json: linked.json, mode: 'link' });
    await click(button('Replace roster'));
    const blobs = [];
    window.URL.createObjectURL = vi.fn(blob => { blobs.push(blob); return 'blob:fictional'; });
    window.URL.revokeObjectURL = vi.fn();
    window.HTMLAnchorElement.prototype.click = vi.fn();
    // The ordinary roster export never contains the key.
    await click(button('roster.export'));
    expect(await blobs.at(-1).text()).not.toContain(context.syncKey);
    await click(button('Save sync key'));
    const keyFile = JSON.parse(await blobs.at(-1).text());
    expect(keyFile).toEqual({ type: internals.syncKeyFileType, version: 1, classId: linked.roster.classId, key: context.syncKey });
    await click(button('Unlink'));
    expect(storedKeys()).toBeNull();
    expect(button('Google Classroom setup')).toBeTruthy();
    expect(() => internals.parseSyncKeyFile(JSON.stringify(keyFile), 'CLS-other')).toThrow('different AlloFlow class');
    expect(() => internals.parseSyncKeyFile('{"type":"x"}', linked.roster.classId)).toThrow('not an AlloFlow Classroom sync key');
    const input = container.querySelector('input[aria-label="Choose a Google Classroom sync key file"]');
    const text = JSON.stringify(keyFile);
    Object.defineProperty(input, 'files', { configurable: true, value: [new Blob([text], { type: 'application/json' })] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { await new Promise(resolveRead => setTimeout(resolveRead, 20)); });
    expect(storedKeys().byClass[linked.roster.classId].key).toBe(context.syncKey);
    expect(button('Sync with Google Classroom')).toBeTruthy();
  });

  it('keeps the key store out of every export, print, Store and sync handler in the source', () => {
    const source = readFileSync('teacher_source.jsx', 'utf8');
    for (const name of ['const handleExport = ', 'const handleStoreRosterExport = ', 'const handlePrintRosterWorksheet = ', 'const requestOfflineSubmissionSetup']) {
      const at = source.indexOf(name);
      const body = source.slice(at, source.indexOf('\n  const ', at + name.length + 10));
      expect(body).not.toMatch(/SyncKey|syncKey/);
    }
    expect(readFileSync('teacher_module.js', 'utf8')).toBe(readFileSync('desktop/web-app/public/teacher_module.js', 'utf8'));
  });
});
