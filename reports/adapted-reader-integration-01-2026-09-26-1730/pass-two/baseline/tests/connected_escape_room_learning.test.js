import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../connected_escape_room_engine.js';
import { roomDebrief, supportPatch } from '../connected_escape_room_learning.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), { makeRoom } = require('../dev-tools/fixtures/connected_escape_room.cjs');
const React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const completed = room => ({ ...engine.emptyProgress(), solved: Object.fromEntries(room.nodes.map(n => [n.id, true])) });
const data = () => ({ hostId: 'host', roster: { u: { uid: 'u' } }, escapeRoomState: engine.createSession(makeRoom(), 'host', { u: { uid: 'u' } }) });
const progress = d => d.escapeRoomState.teamProgress.All.connected[d.escapeRoomState.attemptId];
const finish = d => { d.escapeRoomState.teamProgress.All.connected[d.escapeRoomState.attemptId] = completed(d.escapeRoomState.connectedRoom); return d; };

describe('Learning review and bounded teacher support', () => {
  it('keeps the review unavailable until the final exit is open', () => {
    const room = makeRoom(), p = completed(room); delete p.solved.door;
    expect(roomDebrief(room, engine.emptyProgress())).toBeNull(); expect(roomDebrief(room, p)).toBeNull();
  });
  it('connects each solution to the actual prerequisite evidence and lesson', () => {
    const room = makeRoom(), p = completed(room); p.hints.device = { h1: true, h2: true }; p.assisted.sequence = true;
    const recap = roomDebrief(room, p), device = recap.objects.find(n => n.id === 'device');
    expect(recap).toMatchObject({ discoveries: 7, hints: 2, supported: 1 });
    expect(device.evidence.map(e => e.name)).toEqual(['Water-cycle notes', 'Operating diagram']);
    expect(device.sourceQuote).toBe(room.nodes[4].sourceQuote); expect(device.explanation).toBe(room.nodes[4].explanation);
    expect(recap.objects.find(n => n.id === 'door').evidence.map(e => e.name)).toEqual(['Simulator key', 'Cycle key']);
    expect(JSON.stringify(recap)).not.toMatch(/correctIndex|requestId|rescueReasons/);
  });
  it('does not include unknown or uncollected objects from an inconsistent progress snapshot', () => {
    const room = makeRoom(), p = engine.emptyProgress(); p.solved = { door: true, unknown: true }; p.assisted.unknown = true;
    const recap = roomDebrief(room, p); expect(recap.discoveries).toBe(1); expect(recap.supported).toBe(0);
    expect(recap.objects[0].evidence).toEqual([]); expect(JSON.stringify(recap)).not.toContain('Heat Chamber A');
  });
  it('shares only the exact previewed hint without mutating progress', () => {
    const room = makeRoom(), p = engine.emptyProgress(), before = JSON.stringify(p);
    expect(supportPatch(room, p, { kind: 'hint', nodeId: 'notes', level: 1 })).toEqual({ 'hints.notes.h1': true });
    expect(JSON.stringify(p)).toBe(before);
    p.hints.notes = { h1: true };
    expect(supportPatch(room, p, { kind: 'hint', nodeId: 'notes', level: 1 })).toEqual({});
    expect(supportPatch(room, p, { kind: 'hint', nodeId: 'notes', level: 2 })).toEqual({ 'hints.notes.h2': true });
  });
  it.each([0, 2, 4, '1', null])('rejects an invalid or unpreviewable hint level %s', level => {
    expect(supportPatch(makeRoom(), engine.emptyProgress(), { kind: 'hint', nodeId: 'notes', level })).toEqual({});
  });
  it('rejects support for locked, already completed, missing, or finished objects', () => {
    const room = makeRoom(), p = engine.emptyProgress(); p.solved.notes = true;
    for (const nodeId of ['notes', 'device', 'missing']) expect(supportPatch(room, p, { kind: 'rescue', nodeId, reason: 'technical' })).toEqual({});
    p.solved.door = true; expect(supportPatch(room, p, { kind: 'rescue', nodeId: 'lens', reason: 'technical' })).toEqual({});
  });
  it('records a rescue with the existing leaf fields and an allowed reason only', () => {
    const room = makeRoom(), p = engine.emptyProgress();
    expect(supportPatch(room, p, { kind: 'rescue', nodeId: 'lens', reason: 'technical' })).toEqual({ 'solved.lens': true, 'assisted.lens': true, 'rescueReasons.lens': 'technical' });
    expect(supportPatch(room, p, { kind: 'rescue', nodeId: 'lens', reason: 'unrecognized' })).toEqual({});
  });
});

let el, root, api, write;
const base = { appId: 'app', targetAppId: 'app', activeSessionCode: 'ROOM', user: { uid: 'u' }, t: k => k };
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; write = vi.fn(); window.__alloFirebase = { db: {}, doc: () => ({}), updateDoc: (...args) => write(...args) }; loadAlloModule('connected_escape_room_module.js'); api = window.AlloModules; });
afterEach(async () => { if (root) await act(async () => root.unmount()); el?.remove(); el = root = null; write.mockReset(); localStorage.clear(); sessionStorage.clear(); });
async function render(d, Component = api.ConnectedEscapeRoomTeacher) { if (!el) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); } await act(async () => root.render(React.createElement(Component, { ...base, sessionData: d }))); }
const button = name => [...el.querySelectorAll('button')].find(b => b.textContent.trim() === name);
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function choose(id) { await act(async () => { const n = el.querySelector('[data-support-picker]'); n.value = id; n.dispatchEvent(new Event('change', { bubbles: true })); }); }

describe('Teacher support and completed room UI', () => {
  it('previews a hint privately and requires a new preview after a teammate shares it', async () => {
    const d = data(); await render(d); await choose('notes');
    expect(el.querySelector('[data-hint-preview]').textContent).toContain('Teacher preview'); expect(write).not.toHaveBeenCalled();
    const share = el.querySelector('[data-share-hint]'); share.focus(); const next = structuredClone(d); progress(next).hints.notes = { h1: true }; await render(next);
    expect(document.activeElement).toBe(share); expect(el.querySelector('[data-hint-preview]').textContent).toContain('Hint 1 of 3');
    await click(share); expect(write).not.toHaveBeenCalled(); await click(el.querySelector('[data-preview-next-hint]'));
    expect(el.querySelector('[data-hint-preview]').textContent).toContain('Hint 2 of 3'); await click(el.querySelector('[data-share-hint]'));
    expect(write.mock.calls[0][1]).toEqual({ ['escapeRoomState.teamProgress.All.connected.' + d.escapeRoomState.attemptId + '.hints.notes.h2']: true });
  });
  it('returns keyboard focus to the share button after opening the next hint preview', async () => {
    const d = data(); await render(d); await choose('notes'); const next = structuredClone(d); progress(next).hints.notes = { h1: true }; await render(next);
    const preview = el.querySelector('[data-preview-next-hint]'); preview.focus(); await click(preview);
    expect(document.activeElement).toBe(el.querySelector('[data-share-hint]')); expect(write).not.toHaveBeenCalled(); const hint = document.getElementById(document.activeElement.getAttribute('aria-describedby')); expect(hint.textContent).toContain('Hint 2 of 3'); expect(hint.textContent).toContain('Combine the field notes');
  });
  it('does not refocus an open rescue confirmation when another teacher control finishes saving', async () => {
    let resolve; write.mockImplementationOnce(() => new Promise(done => { resolve = done; })); await render(data()); await choose('lens');
    await click(button('Unlock this object for the team')); await click(button('Pause room'));
    const summary = [...el.querySelectorAll('summary')].find(n => n.textContent === 'Teacher clues and solutions'); summary.focus();
    await act(async () => resolve()); expect(document.activeElement).toBe(summary); expect(el.querySelector('[data-rescue-confirm]')).toBeTruthy();
  });
  it('does not move focus from elsewhere when a teammate makes a pending rescue unnecessary', async () => {
    const d = data(); await render(d); await choose('lens'); await click(button('Unlock this object for the team')); const pause = button('Pause room'); pause.focus();
    const next = structuredClone(d); progress(next).solved.lens = true; await render(next);
    expect(el.querySelector('[data-rescue-confirm]')).toBeNull(); expect(document.activeElement).toBe(pause); expect(write).not.toHaveBeenCalled();
  });
  it('does not skip ahead or add hints after all three have been shared', async () => {
    const d = data(); progress(d).hints.notes = { h1: true, h2: true, h3: true }; await render(d); await choose('notes');
    expect(el.textContent).toContain('All three hints have been shared'); expect(el.querySelector('[data-preview-next-hint]')).toBeNull();
    await click(el.querySelector('[data-share-hint]')); expect(write).not.toHaveBeenCalled();
  });
  it('names the exact discovery, focuses Cancel, and restores focus without writing on cancellation', async () => {
    await render(data()); await choose('lens'); const trigger = button('Unlock this object for the team'); await click(trigger);
    expect(el.querySelector('[data-rescue-confirm]').textContent).toContain('Complete UV lens and share UV lens with everyone');
    expect(document.activeElement).toBe(button('Cancel')); expect(write).not.toHaveBeenCalled();
    await act(async () => button('Cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(el.querySelector('[data-rescue-confirm]')).toBeNull(); expect(document.activeElement).toBe(trigger); expect(write).not.toHaveBeenCalled();
  });
  it('confirms a rescue once and scopes all fields to this attempt', async () => {
    const d = data(); await render(d); await choose('lens'); await click(button('Unlock this object for the team')); await click(button('Confirm rescue unlock'));
    const prefix = 'escapeRoomState.teamProgress.All.connected.' + d.escapeRoomState.attemptId + '.';
    expect(write.mock.calls[0][1]).toEqual({ [prefix + 'solved.lens']: true, [prefix + 'assisted.lens']: true, [prefix + 'rescueReasons.lens']: 'guidance' });
    expect(write).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(el.querySelector('[data-support-picker]'));
  });
  it('withdraws a rescue if another player completes that object and keeps keyboard focus usable', async () => {
    const d = data(); await render(d); await choose('lens'); await click(button('Unlock this object for the team'));
    const next = structuredClone(d); progress(next).solved.lens = true; await render(next);
    expect(el.querySelector('[data-rescue-confirm]')).toBeNull(); expect(document.activeElement).toBe(el.querySelector('[data-support-picker]'));
    expect(el.textContent).toContain('UV lens is already complete'); expect(write).not.toHaveBeenCalled();
  });
  it('clears an unsubmitted rescue on restart and ignores a delayed failure from an old attempt', async () => {
    let reject; write.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    await render(data()); await choose('lens'); await click(button('Unlock this object for the team'));
    await click(button('Confirm rescue unlock')); await render(data());
    expect(el.querySelector('[data-rescue-confirm]')).toBeNull(); expect(el.querySelector('[data-support-picker]').value).toBe('');
    await act(async () => reject(Error('old attempt failed'))); expect(el.querySelector('[role="alert"]')).toBeNull();
  });
  it('retains the concrete rescue for retry if saving fails', async () => {
    write.mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined); await render(data()); await choose('lens');
    await click(button('Unlock this object for the team')); await click(button('Confirm rescue unlock'));
    expect(el.querySelector('[data-rescue-confirm]')).toBeTruthy(); expect(el.textContent).toContain('The control could not be saved');
    await click(button('Confirm rescue unlock')); expect(write.mock.calls[1][1]).toEqual(write.mock.calls[0][1]);
  });
  it('explains when a rescue will open the final exit for everyone', async () => {
    const d = finish(data()); delete progress(d).solved.door; await render(d); await choose('door'); await click(button('Unlock this object for the team'));
    expect(el.querySelector('[data-rescue-confirm]').textContent).toContain('completes the room for everyone'); expect(write).not.toHaveBeenCalled();
  });
  it('keeps lifecycle confirmations keyboard accessible', async () => {
    await render(data()); const trigger = button('Restart this room'); await click(trigger); expect(document.activeElement).toBe(button('Cancel'));
    await click(button('Cancel')); expect(document.activeElement).toBe(trigger); expect(write).not.toHaveBeenCalled();
  });
  it('reveals the review only after completion without moving a teammate keyboard focus', async () => {
    const d = data(); await render(d, api.ConnectedEscapeRoomStudent); expect(el.querySelector('[data-room-debrief]')).toBeNull();
    const selected = el.querySelector('[data-object="notes"]'); selected.focus(); await render(finish(structuredClone(d)), api.ConnectedEscapeRoomStudent);
    expect(document.activeElement).toBe(selected); expect(el.querySelector('[data-debrief-object="device"]').textContent).toContain('Water-cycle notes');
    expect(el.querySelector('[data-room-debrief]').textContent).toContain('Your team connected 7 discoveries'); expect(write).not.toHaveBeenCalled();
    await click(el.querySelector('[data-revisit-object="sequence"]')); expect(el.querySelector('[data-object="sequence"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement.textContent).toBe('Cycle mechanism'); await click(button('Jump to room debrief')); expect(document.activeElement.textContent).toBe('The exit is open!');
  });
  it('gives the teacher the same evidence review and discussion prompts when finished', async () => {
    const d = finish(data()); progress(d).assisted.lens = true; await render(d);
    expect(el.querySelector('[data-debrief-discussion]').textContent).toContain('Discuss the learning together');
    expect(el.querySelector('[data-room-debrief]').textContent).toContain('Objects completed with teacher support: 1'); expect(el.querySelector('[data-revisit-object]')).toBeNull();
    expect(el.querySelector('[data-support-picker]').options.length).toBe(1); expect(write).not.toHaveBeenCalled();
  });
});
