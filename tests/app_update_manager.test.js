import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('desktop/web-app/public/alloflow_update.js', 'utf8');
const first = { releaseId: 'release-one', releaseBuiltAt: 1000 };
const second = { releaseId: 'release-two', releaseBuiltAt: 2000 };
const third = { releaseId: 'release-three', releaseBuiltAt: 3000 };

function events(properties = {}) {
  const listeners = new Map();
  return Object.assign(properties, {
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type) { for (const callback of [...(listeners.get(type) || [])]) callback({ type }); },
  });
}

class TestMessageChannel {
  constructor() {
    const port1 = { onmessage: null, close() {} };
    const port2 = { close() {}, postMessage(data) { Promise.resolve().then(() => port1.onmessage?.({ data })); } };
    this.port1 = port1;
    this.port2 = port2;
  }
}

function worker(release, state = 'activated') {
  const instance = events({ state, activate: null });
  instance.postMessage = vi.fn((message, ports) => {
    if (message.type === 'ALLOFLOW_GET_RELEASE' && release) ports[0].postMessage({ type: 'ALLOFLOW_RELEASE', ...release });
    if (message.type === 'ALLOFLOW_ACTIVATE_UPDATE') instance.activate?.();
  });
  return instance;
}

function fixture(options = {}) {
  const current = options.active || worker(first);
  const waiting = options.waiting || null;
  const reg = events({ scope: options.scope || 'https://school.example/app/', active: current, waiting, installing: null, update: vi.fn(async () => {}) });
  const serviceWorker = events({ controller: options.uncontrolled ? null : current, getRegistration: vi.fn(async () => { if (options.denied) throw new Error('SW API denied'); return reg; }) });
  const storage = options.storage || new Map();
  const pageRelease = options.page || first;
  const page = events({
    __alloReleaseId: pageRelease.releaseId,
    __alloReleaseBuiltAt: pageRelease.releaseBuiltAt,
    location: { href: 'https://school.example/app/?join=class', reload: vi.fn() },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  });
  const document = events({ currentScript: { src: 'https://school.example/app/alloflow_update.js' }, visibilityState: 'visible' });
  runInNewContext(source, { window: page, document, navigator: { serviceWorker }, URL, MessageChannel: TestMessageChannel, setTimeout, clearTimeout });
  const manager = page.__alloAppUpdates;
  return { manager, page, reg, serviceWorker, waiting, storage, activate(target = waiting) {
    reg.waiting = null;
    reg.active = target;
    target.state = 'activated';
    serviceWorker.controller = target;
    target.emit('statechange');
    serviceWorker.emit('controllerchange');
  } };
}

async function flush() { for (let index = 0; index < 25; index++) await Promise.resolve(); }
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('release-aware update manager failure and retry behavior', () => {
  it('keeps the old page and retry available if activation times out, then applies successfully on retry', async () => {
    const waiting = worker(second, 'installed');
    const { manager, page, activate } = fixture({ waiting });
    await manager.check();
    expect(manager.getState().ready).toBe(true);
    const failed = manager.apply();
    await flush();
    expect(manager.getState().applying).toBe(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(await failed).toBe(false);
    expect(page.location.reload).not.toHaveBeenCalled();
    expect(manager.getState()).toMatchObject({ ready: true, applying: false, releaseId: second.releaseId });
    expect(manager.getState().error).toMatch(/try again/i);
    waiting.activate = () => activate();
    expect(await manager.apply()).toBe(true);
    expect(page.location.reload).toHaveBeenCalledOnce();
    expect(manager.getState().error).toBeNull();
  });

  it('quietly withdraws a candidate that disappeared before the person clicks Refresh now', async () => {
    const waiting = worker(second, 'installed');
    const { manager, reg, page } = fixture({ waiting });
    await manager.check();
    expect(manager.getState().ready).toBe(true);
    reg.waiting = null;
    expect(await manager.apply()).toBe(false);
    expect(manager.getState()).toMatchObject({ ready: false, applying: false, releaseId: null, error: null });
    expect(page.location.reload).not.toHaveBeenCalled();
    expect(waiting.postMessage.mock.calls.some(([message]) => message.type === 'ALLOFLOW_ACTIVATE_UPDATE')).toBe(false);
  });

  it('does not turn an unknown legacy worker into an update after its protocol query times out', async () => {
    const { manager, page } = fixture({ waiting: worker(null, 'installed') });
    const checked = manager.check();
    await vi.advanceTimersByTimeAsync(4000);
    await checked;
    expect(manager.getState()).toMatchObject({ ready: false, releaseId: null, error: null });
    expect(page.location.reload).not.toHaveBeenCalled();
  });

  it.each([
    ['missing build timestamp', { releaseId: second.releaseId }],
    ['invalid release ID', { ...second, releaseId: '<script>' }],
    ['older worker', first],
    ['identical release', second],
  ])('does not announce %s as an update to the newer loaded document', async (_name, release) => {
    const { manager, page } = fixture({ page: second, active: worker(release) });
    await manager.check();
    expect(manager.getState().ready).toBe(false);
    expect(page.location.reload).not.toHaveBeenCalled();
  });

  it('stays quiet when the service-worker registration API is denied', async () => {
    const { manager, page } = fixture({ denied: true });
    await manager.check();
    expect(manager.getState()).toMatchObject({ ready: false, error: null, releaseId: null });
    expect(await manager.apply()).toBe(false);
    expect(page.location.reload).not.toHaveBeenCalled();
  });

  it('does not announce the first controller claiming an already-current page', async () => {
    const { manager, page, serviceWorker, reg } = fixture({ uncontrolled: true });
    await manager.check();
    serviceWorker.controller = reg.active;
    serviceWorker.emit('controllerchange');
    await manager.check();
    expect(manager.getState()).toMatchObject({ ready: false, releaseId: null });
    expect(page.location.reload).not.toHaveBeenCalled();
  });

  it('does not use the old root registration as a candidate for the /app/ shell', async () => {
    const { manager } = fixture({ scope: 'https://school.example/', active: worker(second) });
    await manager.check();
    expect(manager.getState().ready).toBe(false);
  });

  it('preserves Later for the dismissed release across checks and page reloads, then announces the next release', async () => {
    const waiting = worker(second, 'installed');
    const initial = fixture({ waiting });
    await initial.manager.check();
    initial.manager.dismiss();
    await initial.manager.check();
    expect(initial.manager.getState().ready).toBe(false);
    const reopened = fixture({ waiting, storage: initial.storage });
    await reopened.manager.check();
    expect(reopened.manager.getState().ready).toBe(false);
    reopened.reg.waiting = worker(third, 'installed');
    reopened.reg.emit('updatefound');
    await reopened.manager.check();
    expect(reopened.manager.getState()).toMatchObject({ ready: true, releaseId: third.releaseId });
  });

  it('applies an update that another tab already activated without requiring a waiting worker', async () => {
    const active = worker(second);
    const { manager, page, reg } = fixture({ active });
    await manager.check();
    expect(reg.waiting).toBeNull();
    expect(manager.getState().ready).toBe(true);
    expect(await manager.apply()).toBe(true);
    expect(page.location.reload).toHaveBeenCalledOnce();
    expect(active.postMessage.mock.calls.some(([message]) => message.type === 'ALLOFLOW_ACTIVATE_UPDATE')).toBe(false);
  });

  it('allows retry if the browser rejects the requested reload', async () => {
    const { manager, page } = fixture({ active: worker(second) });
    await manager.check();
    page.location.reload.mockImplementationOnce(() => { throw new Error('Reload temporarily blocked'); });
    expect(await manager.apply()).toBe(false);
    expect(manager.getState()).toMatchObject({ ready: true, applying: false });
    expect(manager.getState().error).toBeTruthy();
    expect(await manager.apply()).toBe(true);
    expect(page.location.reload).toHaveBeenCalledTimes(2);
  });
});
