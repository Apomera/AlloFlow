// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const infraStart = host.indexOf('const _alloCreateDialogStateController');
const infraEnd = host.indexOf('const LENGTH_THRESHOLDS', infraStart);
if (infraStart < 0 || infraEnd < 0) throw new Error('Host async infrastructure markers missing');

const makeInfrastructure = () => new Function(
  'window',
  'document',
  'setTimeout',
  'clearTimeout',
  host.slice(infraStart, infraEnd)
    + '\nreturn {'
    + ' createDialogController: _alloCreateDialogStateController,'
    + ' withWatchdog: _alloWithWatchdog,'
    + ' loadScriptGlobal: _alloLoadScriptGlobal,'
    + ' getDeviceStorage: _alloGetCanvasDeviceStorage,'
    + ' scriptTimeout: ALLO_STORAGE_SCRIPT_TIMEOUT_MS,'
    + ' readyTimeout: ALLO_STORAGE_READY_TIMEOUT_MS'
    + ' };'
)(window, document, setTimeout, clearTimeout);

const clearTestGlobals = () => {
  [
    '__alloStorageDependencyPromises',
    '__alloDeviceStoragePromise',
    '__alloDeviceStorageReadyPromise',
    '__testStorageDependency',
    'alloDeviceStorage',
  ].forEach((key) => {
    try { delete window[key]; } catch (_) { window[key] = null; }
  });
  document.querySelectorAll('script[src*="example.invalid"]').forEach((script) => script.remove());
};

afterEach(() => {
  vi.useRealTimers();
  clearTestGlobals();
});

describe('owned dialog settlement', () => {
  it('settles a displaced promise once and never double-cancels a confirmed successor', async () => {
    const { createDialogController } = makeInfrastructure();
    const commits = [];
    const controller = createDialogController((value) => commits.push(value));
    let firstEntry;
    let secondEntry;
    const firstCancel = vi.fn();
    const secondCancel = vi.fn();
    const firstResult = new Promise((resolveValue) => {
      firstEntry = controller.set({
        message: 'first',
        onConfirm: () => resolveValue(true),
        onCancel: () => { firstCancel(); resolveValue(false); },
      });
    });
    const secondResult = new Promise((resolveValue) => {
      secondEntry = controller.set({
        message: 'second',
        onConfirm: () => resolveValue(true),
        onCancel: () => { secondCancel(); resolveValue(false); },
      });
    });

    await expect(firstResult).resolves.toBe(false);
    expect(firstCancel).toHaveBeenCalledTimes(1);
    firstEntry.onConfirm();
    expect(controller.getCurrent()).toBe(secondEntry);

    secondEntry.onConfirm();
    controller.set(null);
    await expect(secondResult).resolves.toBe(true);
    expect(secondCancel).not.toHaveBeenCalled();
    expect(commits.at(-1)).toBeNull();
  });

  it('cancels on teardown, reactivates after a StrictMode cleanup, and preserves a nested successor', async () => {
    const { createDialogController } = makeInfrastructure();
    const controller = createDialogController(() => {});
    let teardownEntry;
    const teardownResult = new Promise((resolveValue) => {
      teardownEntry = controller.set({ onCancel: () => resolveValue(null) });
    });
    expect(controller.dispose()).toBe(true);
    await expect(teardownResult).resolves.toBeNull();
    teardownEntry.onCancel();

    controller.activate();
    let successor = null;
    const first = controller.set({
      onConfirm: () => {
        successor = controller.set({ message: 'successor', onCancel: vi.fn() });
      },
      onCancel: vi.fn(),
    });
    first.onConfirm();
    expect(controller.getCurrent()).toBe(successor);

    // This is the owner-bound close shape used by the host render wrappers.
    controller.set((current) => current === first ? null : current);
    expect(controller.getCurrent()).toBe(successor);
  });
});

describe('bounded and retryable storage loading', () => {
  it('deduplicates concurrent script loads and shares the registered global', async () => {
    vi.useFakeTimers();
    const { loadScriptGlobal } = makeInfrastructure();
    const readGlobal = () => window.__testStorageDependency;
    const options = {
      cacheKey: 'test-storage-dependency',
      label: 'Test dependency',
      timeoutMs: 50,
      parent: document.head,
    };
    const first = loadScriptGlobal('https://example.invalid/dependency.js', readGlobal, options);
    const second = loadScriptGlobal('https://example.invalid/dependency.js', readGlobal, options);
    expect(second).toBe(first);
    const scripts = document.querySelectorAll('script[src*="example.invalid/dependency.js"]');
    expect(scripts).toHaveLength(1);

    const dependency = { ready: true };
    window.__testStorageDependency = dependency;
    scripts[0].onload();
    await expect(first).resolves.toBe(dependency);
    await expect(second).resolves.toBe(dependency);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes a timed-out script, clears its shared rejection, and allows a fresh retry', async () => {
    vi.useFakeTimers();
    const { loadScriptGlobal } = makeInfrastructure();
    const readGlobal = () => window.__testStorageDependency;
    const options = {
      cacheKey: 'retryable-storage-dependency',
      label: 'Retryable dependency',
      timeoutMs: 25,
      parent: document.head,
    };
    const first = loadScriptGlobal('https://example.invalid/retry.js', readGlobal, options);
    const firstOutcome = first.catch((error) => error);
    const firstScript = document.querySelector('script[src*="example.invalid/retry.js"]');
    expect(firstScript).toBeTruthy();

    await vi.advanceTimersByTimeAsync(25);
    const timeoutError = await firstOutcome;
    expect(timeoutError.message).toContain('timed out');
    expect(firstScript.parentNode).toBeNull();
    expect(firstScript.onload).toBeNull();
    expect(firstScript.onerror).toBeNull();

    const retry = loadScriptGlobal('https://example.invalid/retry.js', readGlobal, options);
    const retryScript = document.querySelector('script[src*="example.invalid/retry.js"]');
    expect(retryScript).toBeTruthy();
    expect(retryScript).not.toBe(firstScript);
    window.__testStorageDependency = { recovered: true };
    retryScript.onload();
    await expect(retry).resolves.toEqual({ recovered: true });
  });

  it('times out pending device readiness, clears both caches, and succeeds on retry', async () => {
    vi.useFakeTimers();
    const { getDeviceStorage, readyTimeout } = makeInfrastructure();
    window.alloDeviceStorage = { ready: vi.fn(() => new Promise(() => {})) };
    const firstOutcome = getDeviceStorage().catch((error) => error);
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(readyTimeout);
    const timeoutError = await firstOutcome;
    expect(timeoutError.message).toMatch(/ready|readiness/i);
    expect(window.__alloDeviceStoragePromise).toBeUndefined();
    expect(window.__alloDeviceStorageReadyPromise).toBeUndefined();

    const recovered = { ready: vi.fn(async () => true) };
    window.alloDeviceStorage = recovered;
    await expect(getDeviceStorage()).resolves.toBe(recovered);
    expect(recovered.ready).toHaveBeenCalledTimes(1);
  });
});

describe('host ownership wiring contracts', () => {
  it('guards hydration and cancels cross-workflow operations at every reset boundary', () => {
    expect(host).toContain('localDataHydrationGenerationRef.current === hydrationGeneration');
    expect(host).toContain('if (!hydrationIsCurrent()) return;');
    expect(host).toContain("cancelActiveFileIntakeOperations('new-pdf-audit')");
    expect(host).toContain("cancelActiveFileIntakeOperations('workspace-clear')");
    expect(host).toContain("cancelActiveFileIntakeOperations('canvas-workspace-clear')");
    expect(host).toContain('onProjectLoadStart: () => {\n            invalidateLocalDataHydration();');
    expect(host).toContain("window.addEventListener('online', retryStorageBootstrap)");
    expect(host).toContain('window.__alloRetryStorageBootstrap = retryStorageBootstrap');
    expect(host.match(/allo_device_storage_module\.js\?v=/g) || []).toHaveLength(1);
    expect(host).not.toContain('allo_device_storage_module.js?v=ds1');
  });
});
