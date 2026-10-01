import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
function harness(file = hosts[0], withCache = true) {
  const source = readFileSync(file, 'utf8'), start = source.indexOf('async function _alloLessonBoardConditionalUpdate('), end = source.indexOf('function _applyMbSessionAdapter()', start);
  const bridge = { isTeacher: true, code: 'BOARD', ...(withCache ? { docs: new Map([['s', { w: 10, d: { phase: 'answer' } }]]) } : {}) };
  let finishWrite, announceWrite;
  const writeStarted = new Promise(resolve => announceWrite = resolve);
  const call = vi.fn(async request => {
    if (request.a === 'dget') return { docs: [{ p: 's', w: 10, d: { phase: 'answer' } }] };
    announceWrite(); return new Promise(resolve => finishWrite = resolve);
  });
  const store = vi.fn((path, entry) => bridge.docs?.set(path, entry)), nudge = vi.fn();
  const write = new Function('_alloMbBridgeState', '_alloMbDocCall', '_alloMbStoreAndFire', '_alloMbSendNudge', source.slice(start, end) + '; return _alloLessonBoardConditionalUpdate;')(bridge, call, store, nudge);
  return { bridge, call, store, nudge, writeStarted, finish: response => finishWrite(response), start: () => write({ __alloMbRef: 'session', code: 'BOARD', p: 's' }, () => ({ 'escapeRoomState.isPaused': true })) };
}

describe('Board Mailbox cache revision ordering', () => {
  it.each(hosts)('keeps a newer cached snapshot when an older write response arrives: %s', async file => {
    const api = harness(file), pending = api.start(); await api.writeStarted;
    const newer = { w: 12, d: { escapeRoomState: { phase: 'answer', retryRound: 1, response: 'new answer' } } };
    api.bridge.docs.set('s', newer);
    api.finish({ ok: true, w: 11, d: { escapeRoomState: { phase: 'review', retryRound: 0 } } }); await pending;
    expect(api.bridge.docs.get('s')).toBe(newer); expect(api.store).not.toHaveBeenCalled(); expect(api.nudge).toHaveBeenCalledOnce();
  });
  it('publishes a successful write that advances the cached revision', async () => {
    const api = harness(), pending = api.start(); await api.writeStarted;
    const data = { escapeRoomState: { isPaused: true } }; api.finish({ ok: true, w: 11, d: data }); await pending;
    expect(api.store).toHaveBeenCalledWith('s', { w: 11, d: data, missing: false }); expect(api.bridge.docs.get('s').w).toBe(11);
  });
  it('supports helper consumers without a docs cache', async () => {
    const api = harness(hosts[0], false), pending = api.start(); await api.writeStarted;
    api.finish({ ok: true, w: 11, d: { escapeRoomState: { isPaused: true } } }); await pending;
    expect(api.store).toHaveBeenCalledOnce(); expect(api.nudge).toHaveBeenCalledOnce();
  });
});
