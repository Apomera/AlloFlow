// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
// Host files (ANTI, its mirror, App.jsx) come back with the code moved out of them (host_handlers_source.jsx,
// allo_command_context_source.js, CDN view sources) put back; every other file reads unchanged.
import { readFileSync } from './helpers/host_source.js';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const infraStart = host.indexOf('const _alloCreateDialogStateController');
const infraEnd = host.indexOf('const LENGTH_THRESHOLDS', infraStart);
if (infraStart < 0 || infraEnd < 0) throw new Error('Host async infrastructure markers missing');
const deliverySource = readFileSync(resolve(process.cwd(), 'browser_delivery_policy.js'), 'utf8');
const optionalDeliverySource = readFileSync(resolve(process.cwd(), 'optional_browser_delivery_policy.js'), 'utf8');
const deliveryManifest = {
  schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null, allowDesktopRemoteFallback: false,
  assets: Object.fromEntries(['dependency_module.js', 'retry_module.js', 'allo_device_storage_module.js'].map(name => [name, { integrity: 'sha384-' + 'A'.repeat(64), bytes: 1 }])),
};

const makeInfrastructure = () => new Function(
  'window',
  'document',
  'setTimeout',
  'clearTimeout',
  deliverySource + '\n' + optionalDeliverySource + '\nconst _alloBrowserDeliveryManifest = ' + JSON.stringify(deliveryManifest) + ';\n'
    + 'const _alloOptionalBrowserDeliveryManifest={schemaVersion:1,libraries:{fixture:{asset:"fixture_vendor.js",integrity:"sha384-' + 'A'.repeat(64) + '",bytes:1,mirrors:[]}}};\n'
    + 'window.__alloConfigureTrustedScript=_alloConfigureTrustedBrowserScript;\n' + host.slice(infraStart, infraEnd)
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
    '__alloConfigureTrustedScript',
  ].forEach((key) => {
    try { delete window[key]; } catch (_) { window[key] = null; }
  });
  document.querySelectorAll('script[src*="dependency_module.js"],script[src*="retry_module.js"]').forEach((script) => script.remove());
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
    const first = loadScriptGlobal('https://alloflow-cdn.pages.dev/dependency_module.js', readGlobal, options);
    const second = loadScriptGlobal('https://alloflow-cdn.pages.dev/dependency_module.js', readGlobal, options);
    expect(second).toBe(first);
    const scripts = document.querySelectorAll('script[src*="dependency_module.js"]');
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
    const first = loadScriptGlobal('https://alloflow-cdn.pages.dev/retry_module.js', readGlobal, options);
    const firstOutcome = first.catch((error) => error);
    const firstScript = document.querySelector('script[src*="retry_module.js"]');
    expect(firstScript).toBeTruthy();

    await vi.advanceTimersByTimeAsync(25);
    const timeoutError = await firstOutcome;
    expect(timeoutError.message).toContain('timed out');
    expect(firstScript.parentNode).toBeNull();
    expect(firstScript.onload).toBeNull();
    expect(firstScript.onerror).toBeNull();

    const retry = loadScriptGlobal('https://alloflow-cdn.pages.dev/retry_module.js', readGlobal, options);
    const retryScript = document.querySelector('script[src*="retry_module.js"]');
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
    // The load-start callback now refuses a concurrent saved-work operation and clears waiting
    // homework first; it still invalidates hydration before the project load proceeds.
    const loadStartAt = host.indexOf('onProjectLoadStart: (');
    expect(loadStartAt).toBeGreaterThan(-1);
    const loadStart = host.slice(loadStartAt, host.indexOf('\n        },', loadStartAt));
    expect(loadStart).toContain('invalidateLocalDataHydration();');
    expect(loadStart).toContain('captureImportedResponses(rawData)');
    expect(loadStart.indexOf('captureImportedResponses(rawData)')).toBeLessThan(loadStart.indexOf('invalidateLocalDataHydration();'));
    expect(host).toContain("window.addEventListener('online', retryStorageBootstrap)");
    expect(host).toContain('window.__alloRetryStorageBootstrap = retryStorageBootstrap');
    expect(host.match(/allo_device_storage_module\.js\?v=/g) || []).toHaveLength(1);
    expect(host).not.toContain('allo_device_storage_module.js?v=ds1');
  });
});
