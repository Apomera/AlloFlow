import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('host_handlers_source.jsx', 'utf8');
const compiled = readFileSync('host_handlers_module.js', 'utf8');
function extract(text) {
  const start = text.search(/const\s+applyAppUpdate\s*=\s*async\s*\(\s*\)\s*=>\s*\{/);
  const endOffset = text.slice(start).search(/const\s+handleStemArtworkUse\b/);
  const end = endOffset < 0 ? -1 : start + endOffset;
  if (start < 0 || end < 0) throw new Error('Missing update handler source anchors');
  return text.slice(start, end);
}
function events(extra = {}) {
  const listeners = new Map();
  return Object.assign(extra, {
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type) { for (const callback of [...(listeners.get(type) || [])]) callback({ type }); },
    count(type) { return listeners.get(type)?.size || 0; },
  });
}
function fixture(body, { waiting = true, noServiceWorker = false, denied = false } = {}) {
  const active = events({ state: 'activated' });
  const pending = events({ state: 'installed', postMessage: vi.fn() });
  const registration = { active, waiting: waiting ? pending : null };
  const serviceWorker = events({ controller: active, getRegistration: vi.fn(async () => { if (denied) throw new Error('Service workers are unavailable. Please try again.'); return registration; }) });
  const page = { location: { reload: vi.fn() } };
  let applying = false;
  const toast = vi.fn();
  const deps = { get appUpdateApplying() { return applying; }, setAppUpdateApplying: vi.fn(value => { applying = value; }), addToastRef: { current: toast } };
  const apply = new Function('window', 'navigator', '__d', 'setTimeout', 'clearTimeout', body + '\nreturn applyAppUpdate;')(page, noServiceWorker ? {} : { serviceWorker }, deps, setTimeout, clearTimeout);
  return { apply, page, registration, serviceWorker, pending, deps, toast,
    activate() { registration.waiting = null; registration.active = pending; pending.state = 'activated'; serviceWorker.controller = pending; pending.emit('statechange'); serviceWorker.emit('controllerchange'); },
  };
}
async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

for (const [name, body] of [['source', extract(source)], ['compiled CDN module', extract(compiled)]]) {
  describe('legacy shell Refresh compatibility in ' + name, () => {
    it('does nothing until clicked and reloads only once the waiting worker is active and controlling the page', async () => {
      const view = fixture(body);
      expect(view.pending.postMessage).not.toHaveBeenCalled();
      expect(view.page.location.reload).not.toHaveBeenCalled();
      const applied = view.apply();
      await flush();
      expect(view.pending.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ALLOFLOW_ACTIVATE_UPDATE' });
      expect(view.page.__alloReloadForUpdate).toBeUndefined();
      expect(view.page.location.reload).not.toHaveBeenCalled();
      view.registration.active = view.pending;
      view.pending.state = 'activated';
      view.pending.emit('statechange');
      await flush();
      expect(view.page.location.reload).not.toHaveBeenCalled();
      view.serviceWorker.controller = view.pending;
      view.serviceWorker.emit('controllerchange');
      expect(await applied).toBe(true);
      expect(view.page.location.reload).toHaveBeenCalledOnce();
      expect(view.serviceWorker.count('controllerchange')).toBe(0);
      expect(view.pending.count('statechange')).toBe(0);
    });

    it('leaves the page open on activation timeout and permits a successful retry', async () => {
      const view = fixture(body);
      const failed = view.apply();
      await flush();
      expect(await view.apply()).toBe(false);
      expect(view.pending.postMessage).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(10000);
      expect(await failed).toBe(false);
      expect(view.page.location.reload).not.toHaveBeenCalled();
      expect(view.page.__alloLegacyUpdateApplying).toBe(false);
      expect(view.deps.setAppUpdateApplying).toHaveBeenLastCalledWith(false);
      expect(view.toast).toHaveBeenCalledWith(expect.stringMatching(/try again/i), 'warning');
      expect(view.serviceWorker.count('controllerchange')).toBe(0);
      view.pending.postMessage.mockImplementation(() => view.activate());
      expect(await view.apply()).toBe(true);
      expect(view.page.location.reload).toHaveBeenCalledOnce();
    });

    it.each([
      ['no waiting worker', { waiting: false }],
      ['no service-worker support', { noServiceWorker: true }],
    ])('performs an ordinary explicit refresh with %s', async (_label, options) => {
      const view = fixture(body, options);
      expect(view.page.location.reload).not.toHaveBeenCalled();
      expect(view.toast).not.toHaveBeenCalled();
      expect(await view.apply()).toBe(true);
      expect(view.toast).not.toHaveBeenCalled();
      expect(view.page.location.reload).toHaveBeenCalledOnce();
      expect(view.pending.postMessage).not.toHaveBeenCalled();
      expect(view.page.__alloReloadForUpdate).toBeUndefined();
    });

    it('delegates to the new manager without entering the legacy activation path', async () => {
      const view = fixture(body);
      const manager = { getState: () => ({ applying: false, error: null }), apply: vi.fn(async () => true) };
      view.page.__alloAppUpdates = manager;
      expect(await view.apply()).toBe(true);
      expect(manager.apply).toHaveBeenCalledOnce();
      expect(view.serviceWorker.getRegistration).not.toHaveBeenCalled();
      expect(view.pending.postMessage).not.toHaveBeenCalled();
      expect(view.page.location.reload).not.toHaveBeenCalled();
      expect(view.toast).not.toHaveBeenCalled();
    });

    it('reenables the UI if the service-worker API is denied without forcing a reload', async () => {
      const view = fixture(body, { denied: true });
      expect(await view.apply()).toBe(false);
      expect(view.page.location.reload).not.toHaveBeenCalled();
      expect(view.page.__alloLegacyUpdateApplying).toBe(false);
      expect(view.deps.setAppUpdateApplying).toHaveBeenLastCalledWith(false);
      expect(view.toast).toHaveBeenCalledWith(expect.stringMatching(/try again/i), 'warning');
    });

    it('does not reload if another update makes the requested worker redundant', async () => {
      const view = fixture(body);
      const applied = view.apply();
      await flush();
      view.pending.state = 'redundant';
      view.pending.emit('statechange');
      expect(await applied).toBe(false);
      expect(view.page.location.reload).not.toHaveBeenCalled();
      expect(view.serviceWorker.count('controllerchange')).toBe(0);
    });
  });
}
