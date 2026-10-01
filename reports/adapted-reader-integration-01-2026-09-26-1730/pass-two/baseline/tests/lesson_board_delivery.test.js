import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import * as engine from '../lesson_board_engine.js';
import { BOARD_DELIVERY_TIMEOUT_MS, waitForBoardDelivery } from '../lesson_board_delivery.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
const React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let root, host, api, write;
const props = { targetAppId: 'recovery-app', activeSessionCode: 'ROOM', user: { uid: 'learner' }, t: key => key };
const session = () => ({ roster: { learner: { name: 'Learner' } }, escapeRoomState: engine.createSession(makeBoard(), 'teacher', { learner: {} }) });
const step = data => engine.stepOf(engine.runOf(data.escapeRoomState));
const installRun = (data, run) => { const copy = structuredClone(data); copy.escapeRoomState.teamProgress.All.boardRuns[copy.escapeRoomState.attemptId] = run; return copy; };
const render = async (data, patch = {}) => { if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root.render(React.createElement(api.LessonBoardStudent, { ...props, sessionData: data, ...patch }))); };
const click = async selector => { const node = host.querySelector(selector); expect(node).toBeTruthy(); await act(async () => node.click()); };
const action = index => Object.values(write.mock.calls[index][1])[0];
const online = async value => { Object.defineProperty(window.navigator, 'onLine', { configurable: true, value }); await act(async () => window.dispatchEvent(new Event(value ? 'online' : 'offline'))); };
const advance = async ms => act(async () => vi.advanceTimersByTimeAsync(ms));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key }); write = vi.fn(); window.__alloFirebase = { db: {}, doc: () => ({}), updateDoc: (...args) => write(...args) }; window.__alloShared = { db: {}, warnLog() {} }; loadAlloModule('lesson_board_module.js'); api = window.AlloModules; });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; write.mockReset(); sessionStorage.clear(); localStorage.clear(); delete window.navigator.onLine; vi.useRealTimers(); });

describe('Board delivery deadlines', () => {
  it('clears the deadline when delivery finishes', async () => { vi.useFakeTimers(); await expect(waitForBoardDelivery(Promise.resolve('sent'))).resolves.toBe('sent'); expect(vi.getTimerCount()).toBe(0); });
  it('times out without leaving a late rejection unhandled', async () => { vi.useFakeTimers(); const held = deferred(), result = waitForBoardDelivery(held.promise).catch(error => error); await advance(BOARD_DELIVERY_TIMEOUT_MS); expect(await result).toMatchObject({ code: 'board-delivery-timeout' }); held.reject(Error('late transport error')); await Promise.resolve(); expect(vi.getTimerCount()).toBe(0); });
});

describe('Learner live recovery', () => {
  it('unlocks retry after a hung send and retries the exact action once per click', async () => {
    vi.useFakeTimers(); const first = deferred(), second = deferred(); write.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const data = session(); await render(data); await click('[data-board-move="heater"]'); const sent = action(0);
    await advance(BOARD_DELIVERY_TIMEOUT_MS - 1); expect(host.querySelector('[data-board-retry-delivery]').getAttribute('aria-disabled')).toBe('true');
    await advance(1); expect(host.querySelector('[data-board-delivery]').textContent).toContain('Delivery has not been confirmed');
    await click('[data-board-retry-delivery]'); await click('[data-board-retry-delivery]'); expect(write).toHaveBeenCalledTimes(2); expect(action(1)).toEqual(sent);
    await act(async () => first.reject(Error('old request failed'))); expect(host.querySelector('[role="alert"]')).toBeNull(); expect(host.textContent).toContain('Sending your action');
    await act(async () => second.resolve()); expect(host.textContent).toContain('Action sent. Waiting for teacher confirmation');
    const confirmed = structuredClone(data); step(confirmed).seen.learner = { requestId: sent.requestId, code: 'vote-recorded' }; step(confirmed).votes.learner = 'heater'; await render(confirmed);
    expect(host.querySelector('[data-board-pending]')).toBeNull(); expect(host.textContent).toContain('Your proposal is confirmed');
  });
  it('keeps an offline response locally and sends only on explicit retry after reconnect', async () => {
    await online(false); write.mockResolvedValue(undefined); const data = session(), run = engine.runOf(data.escapeRoomState), opened = installRun(data, engine.merge(run, engine.begin(data.escapeRoomState.board, run, 'heater')));
    await render(opened); expect(host.querySelector('[data-board-offline]')).toBeTruthy();
    await act(async () => { const input = host.querySelector('[data-board-choice]'); input.value = '1'; input.dispatchEvent(new Event('change', { bubbles: true })); }); await click('[data-board-submit]');
    expect(write).not.toHaveBeenCalled(); expect(host.querySelector('[data-board-pending]').textContent).toContain('Retry when your session connection is available'); expect(host.querySelector('[data-board-choice]').value).toBe('1');
    await click('[data-board-pending-link]'); expect(document.activeElement).toBe(host.querySelector('[data-board-retry-delivery]')); await online(true); expect(write).not.toHaveBeenCalled();
    await click('[data-board-retry-delivery]'); expect(action(0)).toMatchObject({ kind: 'answer', value: '1', targetId: 'heater' });
  });
  it('lets a learner explicitly retry on a reachable session despite an offline browser signal', async () => {
    await online(false); write.mockResolvedValue(undefined); await render(session()); await click('[data-board-move="heater"]'); expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('[data-board-retry-delivery]').getAttribute('aria-disabled')).toBe('false'); await click('[data-board-retry-delivery]'); expect(write).toHaveBeenCalledOnce(); expect(action(0)).toMatchObject({kind:'vote',targetId:'heater'});
  });
  it('restores an offline action after reload without claiming it was sent', async () => {
    await online(false); const data = session(); await render(data); await click('[data-board-move="heater"]');
    await act(async () => root.unmount()); root = null; host.remove(); await online(true); write.mockResolvedValue(undefined); await render(data);
    expect(host.querySelector('[data-board-delivery]').textContent).toContain('unconfirmed action was restored'); expect(write).not.toHaveBeenCalled(); await click('[data-board-retry-delivery]'); expect(write).toHaveBeenCalledOnce();
  });
  it('does not resend a timed-out proposal after the teacher opens an activity', async () => {
    vi.useFakeTimers(); const held = deferred(); write.mockReturnValue(held.promise); const data = session(); await render(data); await click('[data-board-move="heater"]'); await advance(BOARD_DELIVERY_TIMEOUT_MS);
    const run = engine.runOf(data.escapeRoomState); await render(installRun(data, engine.merge(run, engine.begin(data.escapeRoomState.board, run, 'heater'))));
    expect(host.querySelector('[data-board-retry-delivery]')).toBeNull(); await act(async () => held.resolve()); expect(host.querySelector('[data-board-pending]')).toBeNull(); expect(write).toHaveBeenCalledOnce();
  });
  it('preserves a stalled action across pause but blocks retries until resume', async () => {
    vi.useFakeTimers(); write.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(undefined); const data = session(); await render(data); await click('[data-board-move="heater"]'); await advance(BOARD_DELIVERY_TIMEOUT_MS);
    const paused = structuredClone(data); paused.escapeRoomState.isPaused = true; await render(paused); await click('[data-board-retry-delivery]'); expect(write).toHaveBeenCalledOnce(); expect(host.textContent).toContain('retry after the board resumes');
    await render(data); await click('[data-board-retry-delivery]'); expect(write).toHaveBeenCalledTimes(2); expect(action(1)).toEqual(action(0));
  });
  it('clears the pending action when confirmation arrives after a timeout', async () => {
    vi.useFakeTimers(); const held = deferred(); write.mockReturnValue(held.promise); const data = session(); await render(data); await click('[data-board-move="heater"]'); const sent = action(0); await advance(BOARD_DELIVERY_TIMEOUT_MS);
    const confirmed = structuredClone(data); step(confirmed).seen.learner = { requestId: sent.requestId, code: 'vote-recorded' }; await render(confirmed); await act(async () => held.reject(Error('response lost after commit')));
    expect(host.querySelector('[data-board-pending]')).toBeNull(); expect(host.querySelector('[role="alert"]')).toBeNull(); expect(host.textContent).toContain('Your proposal is confirmed');
  });
  it('does not leak an old timeout into another session', async () => {
    vi.useFakeTimers(); write.mockReturnValue(new Promise(() => {})); await render(session()); await click('[data-board-move="heater"]'); await render(session(), { activeSessionCode: 'OTHER' }); await advance(BOARD_DELIVERY_TIMEOUT_MS);
    expect(host.querySelector('[data-board-pending]')).toBeNull(); expect(host.querySelector('[role="alert"]')).toBeNull(); expect(host.textContent).not.toContain('Delivery has not been confirmed');
  });
  it('explains a slow teacher confirmation separately from network delivery', async () => {
    vi.useFakeTimers(); write.mockResolvedValue(undefined); await render(session()); await click('[data-board-move="heater"]'); await advance(10000);
    expect(host.textContent).toContain('Action sent. Waiting for teacher confirmation'); expect(host.textContent).toContain('Ask the teacher to keep the shared board open'); expect(host.textContent).not.toContain('Delivery has not been confirmed');
  });
  it('accepts a confirmed join even when its transport request later times out', async () => {
    vi.useFakeTimers(); const data = session(); delete data.escapeRoomState.teams.learner; write.mockReturnValue(new Promise(() => {})); await render(data);
    const joined = structuredClone(data); joined.escapeRoomState.teams.learner = 'All'; await render(joined); await advance(BOARD_DELIVERY_TIMEOUT_MS);
    expect(host.querySelector('[role="alert"]')).toBeNull(); expect(host.querySelector('[data-board-move="heater"]').disabled).toBe(false); expect(write).toHaveBeenCalledOnce();
  });
  it('allows a stalled join to be retried and waits while offline', async () => {
    vi.useFakeTimers(); await online(false); const data = session(); delete data.escapeRoomState.teams.learner; write.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(undefined); await render(data); expect(write).not.toHaveBeenCalled();
    await online(true); expect(write).toHaveBeenCalledOnce(); await advance(BOARD_DELIVERY_TIMEOUT_MS); const join = [...host.querySelectorAll('button')].find(button => button.textContent === 'Join shared board'); expect(join.disabled).toBe(false); await act(async () => join.click()); expect(write).toHaveBeenCalledTimes(2); expect(write.mock.calls[1][1]).toEqual({ 'escapeRoomState.teams.learner': 'All' });
  });
});
