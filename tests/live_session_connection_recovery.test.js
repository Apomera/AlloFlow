import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const mounts = [];
function render(element) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); mounts.push({root,node});
  const rerender = next => act(() => root.render(next)); rerender(element);
  const queryByRole = (role, options = {}) => Array.from(node.querySelectorAll(role === 'button' ? 'button' : '[role="' + role + '"]')).find(el => !options.name || el.textContent === options.name) || null;
  return { node, rerender, queryByRole, getByRole: (role, options) => { const el = queryByRole(role, options); if (!el) throw Error('Missing ' + role); return el; } };
}
const fireEvent = { click: el => act(() => el.click()) };
const cleanup = () => mounts.splice(0).forEach(({root,node}) => { act(() => root.unmount()); node.remove(); });
import { transformSync } from '@babel/core';
import { createConnectionRecovery, makeHydrationHarness } from './helpers/live_hydration_harness.js';

const disposables = [];
afterEach(() => { disposables.splice(0).forEach(item => item.dispose()); cleanup(); vi.useRealTimers(); });
function recovery(stateRef = { current: null }, sessionKey = 'class-a') {
  const states = [], reconnect = vi.fn();
  const controller = createConnectionRecovery({ stateRef, sessionKey, onState: state => states.push(state), reconnect });
  disposables.push(controller);
  return { controller, states, reconnect, stateRef, status: () => states.at(-1) };
}

describe('terminated session listener recovery', () => {
  it('reattaches after temporary errors with a bounded budget across listener lifetimes', async () => {
    vi.useFakeTimers();
    const ref = { current: null };
    for (const [index, delay] of [2000, 5000, 10000, 20000].entries()) {
      const h = recovery(ref);
      h.controller.fail({ code: 'unavailable' });
      expect(h.status().status).toBe(index < 3 ? 'retrying' : 'failed');
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(h.reconnect).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(h.reconnect).toHaveBeenCalledTimes(index < 3 ? 1 : 0);
      h.controller.dispose();
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['permission-denied', 'firestore/permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition'])('requires explicit recovery for %s', async code => {
    vi.useFakeTimers();
    const h = recovery();
    h.controller.fail({ code });
    expect(['access-required', 'failed']).toContain(h.status().status);
    h.controller.retry(true);
    await vi.advanceTimersByTimeAsync(60000);
    expect(h.reconnect).not.toHaveBeenCalled();
    h.controller.retry();
    expect(h.reconnect).toHaveBeenCalledOnce();
    expect(h.status().status).toBe('connecting');
  });

  it('coalesces clicks and cancels the scheduled retry when reconnect is requested', async () => {
    vi.useFakeTimers();
    const h = recovery();
    h.controller.fail({ code: 'unavailable' });
    h.controller.retry(); h.controller.retry(); h.controller.retry(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(h.reconnect).toHaveBeenCalledOnce();
    expect(h.stateRef.current.attempt).toBe(0);
  });

  it('network return gives exhausted temporary failures a fresh attempt', () => {
    const h = recovery({ current: { sessionKey: 'class-a', attempt: 3 } });
    h.controller.fail({ code: 'unavailable' });
    expect(h.status().status).toBe('failed');
    h.controller.retry(true);
    expect(h.reconnect).toHaveBeenCalledOnce();
    expect(h.stateRef.current.attempt).toBe(0);
  });

  it('successful attachment resets the budget and only reports connected once', () => {
    const h = recovery({ current: { sessionKey: 'class-a', attempt: 3, blocked: true } });
    h.controller.connected(); h.controller.connected();
    expect(h.status()).toEqual({ status: 'connected', attempt: 0, code: '' });
    expect(h.states.filter(s => s.status === 'connected')).toHaveLength(1);
    h.controller.fail({ code: 'internal' });
    expect(h.status()).toMatchObject({ status: 'retrying', attempt: 1 });
  });

  it('a different session starts with a fresh budget', () => {
    const h = recovery({ current: { sessionKey: 'old', attempt: 4, blocked: true } });
    expect(h.stateRef.current).toMatchObject({ sessionKey: 'class-a', attempt: 0, blocked: false });
  });

  it('leaving prevents timers, late errors, and clicks from restarting the listener', async () => {
    vi.useFakeTimers();
    const h = recovery(); h.controller.fail({ code: 'unavailable' }); h.controller.dispose();
    const count = h.states.length;
    h.controller.fail({ code: 'permission-denied' }); h.controller.connected(); h.controller.retry(true);
    await vi.advanceTimersByTimeAsync(30000);
    expect(h.reconnect).not.toHaveBeenCalled();
    expect(h.states).toHaveLength(count);
  });

  it('host listener errors invalidate pending resources and expose recovery independently of loading state', async () => {
    vi.useFakeTimers();
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const h = makeHydrationHarness({ hydrate: vi.fn(() => pending) });
    disposables.push({ dispose: h.cleanup });
    const download = h.receive({ resources: [{ id: 'late' }] });
    await Promise.resolve();
    h.onError({ code: 'unavailable' });
    resolve([{ id: 'late' }]); await download;
    expect(h.history).not.toHaveBeenCalled();
    expect(h.connectionStates.at(-1).status).toBe('retrying');
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.epoch).toHaveBeenCalledOnce();
  });

  it('host online handler does not automatically retry denied access', async () => {
    vi.useFakeTimers();
    const h = makeHydrationHarness(); disposables.push({ dispose: h.cleanup });
    h.onError({ code: 'permission-denied' }); h.wake();
    await vi.advanceTimersByTimeAsync(30000);
    expect(h.epoch).not.toHaveBeenCalled();
    expect(h.connectionStates.at(-1).status).toBe('access-required');
  });
});

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const bannerStart = host.indexOf("      {!isTeacherMode && activeSessionCode && ['connecting'");
const bannerEnd = host.indexOf("      {!isTeacherMode && activeSessionCode && liveSessionConnectionState.status === 'connected'", bannerStart);
const jsx = 'function Banner({isTeacherMode=false,activeSessionCode="class",liveSessionConnectionState,retryLiveSessionConnection,t}) {return <>' + host.slice(bannerStart, bannerEnd) + '</>; }';
const Banner = new Function('React', transformSync(jsx, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code + ';return Banner;')(React);
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8')).live_connection;
const t = key => strings[key.split('.')[1]];
describe('persistent learner connection banner', () => {
  it.each(['retrying', 'failed', 'access-required'])('offers an accessible reconnect action for %s', status => {
    const reconnect = vi.fn();
    const ui = render(React.createElement(Banner, { liveSessionConnectionState: { status, code: 'permission-denied' }, retryLiveSessionConnection: reconnect, t }));
    expect(ui.getByRole('status').textContent).toBeTruthy();
    fireEvent.click(ui.getByRole('button', { name: 'Reconnect' }));
    expect(reconnect).toHaveBeenCalledOnce();
  });
  it('keeps progress visible while connecting and removes the banner once connected', () => {
    const ui = render(React.createElement(Banner, { liveSessionConnectionState: { status: 'connecting' }, t }));
    expect(ui.getByRole('status').textContent).toContain('Connecting');
    expect(ui.queryByRole('button')).toBeNull();
    ui.rerender(React.createElement(Banner, { liveSessionConnectionState: { status: 'connected' }, t }));
    expect(ui.queryByRole('status')).toBeNull();
  });
  it('explains sign-in failures and hides session controls after leaving', () => {
    const ui = render(React.createElement(Banner, { liveSessionConnectionState: { status: 'access-required', code: 'unauthenticated' }, t }));
    expect(ui.getByRole('status').textContent).toContain('Sign in again');
    ui.rerender(React.createElement(Banner, { activeSessionCode: null, liveSessionConnectionState: { status: 'failed' }, t }));
    expect(ui.queryByRole('status')).toBeNull();
  });
});

const dock = readFileSync('view_live_session_dock_source.jsx', 'utf8');
const healthStart = dock.indexOf('{(() => {');
const healthEnd = dock.indexOf('})()}', healthStart) + '})()}'.length;
const healthJsx = 'function Health({activeSessionCode="class",activeSessionAppId="app",t}) {const sessionData={roster:{}};const _alloMbBridgeActive=()=>true;return <>' + dock.slice(healthStart, healthEnd) + '</>; }';
const Health = new Function('React', transformSync(healthJsx, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code + ';return Health;')(React);
const healthStrings = JSON.parse(readFileSync('ui_strings.js', 'utf8')).live_dock;
const healthT = key => healthStrings[key.split('.')[1]];
describe('rendered teacher sync indicator', () => {
  afterEach(() => { delete window.__alloSessionSyncTrace; });
  it.each([{trace:[]}, {trace:[{at: Date.now(), event:'sync:write-ok', detail:{sessionPath:'artifacts/app/public/data/sessions/another-class'}}]}])('stays neutral before a delivery in this class: %j', ({trace}) => {
    window.__alloSessionSyncTrace = trace;
    const ui = render(React.createElement(Health, {t:healthT}));
    const indicator = ui.getByRole('button');
    expect(indicator.textContent).toContain(healthStrings.no_sync_yet);
    expect(indicator.textContent).not.toContain('🟢');
    expect(indicator.style.background).toBe('rgb(248, 250, 252)');
  });
  it('shows current-class success, failure, and recovery in order', () => {
    const event = (name, failed=0) => ({at:Date.now(),event:name,detail:{failed,sessionPath:'artifacts/app/public/data/sessions/class'}});
    window.__alloSessionSyncTrace = [event('mailbox:pack-reference-published')];
    const ui = render(React.createElement(Health, {t:healthT}));
    expect(ui.getByRole('button').textContent).toContain('🟢');
    window.__alloSessionSyncTrace.push(event('mailbox:pack-cycle',1));
    ui.rerender(React.createElement(Health, {t:healthT}));
    expect(ui.getByRole('button').textContent).toContain('⚠️');
    window.__alloSessionSyncTrace.push(event('mailbox:pack-reference-published'));
    ui.rerender(React.createElement(Health, {t:healthT}));
    expect(ui.getByRole('button').textContent).toContain('🟢');
  });
});
