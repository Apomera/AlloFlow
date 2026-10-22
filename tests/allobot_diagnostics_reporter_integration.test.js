// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const reporterSource = readFileSync(process.env.REPORTER_SOURCE || 'error_reporter_module.js', 'utf8');
function section(start, end) {
  const from = hostSource.indexOf(start), to = hostSource.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Host diagnostic extraction boundary missing');
  return hostSource.slice(from, to);
}
const factory = section('function _alloCreateModuleLoadDiagnostics(', 'function _alloModuleWatchdogShouldWait(');
const ensure = section('    window.__alloEnsureLazyModule = function(', '    // Shared word presentation');
const windows = [];
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T18:00:00Z')); });
afterEach(async () => {
  await Promise.resolve();
  for (const w of windows.splice(0)) w.close();
  vi.clearAllTimers(); vi.useRealTimers();
});
function boot({ reporter = true } = {}) {
  const dom = new JSDOM('<html><body><textarea id="source">PRIVATE_LESSON_CANARY</textarea></body></html>', {
    url: 'https://example.test/app/#allo_pack=PRIVATE_ASSIGNMENT_CANARY',
    runScripts: 'outside-only', virtualConsole: new VirtualConsole(),
  });
  const w = dom.window; windows.push(w);
  Object.defineProperty(w.document, 'hidden', { configurable: true, value: false });
  w.Date = Date; w.setTimeout = setTimeout; w.clearTimeout = clearTimeout;
  w.setInterval = setInterval; w.clearInterval = clearInterval;
  w.console.log = () => {};
  w.fetch = () => { throw new Error('No network allowed in this integration test'); };
  w.AlloModules = {};
  w.__alloBuildStamp = { hash: '4173754e12', surface: 'canvas', hostLoaderRevision: '2026-10-21-stall-v1' };
  w.__alloModuleRegistry = {};
  w.__alloModuleSnapshot = () => {
    const rows = Object.entries(w.__alloModuleRegistry);
    return Object.fromEntries(['pending', 'queued', 'failed'].map(status => [status, rows.filter(([,v]) => v.status === status).map(([name]) => name)]));
  };
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText(text) { w.__copiedReport = text; return Promise.resolve(); } } });
  w.eval(factory + '\nwindow.__alloModuleLoadDiagnostics = _alloCreateModuleLoadDiagnostics(window);');
  w.eval('var __alloLazyEnsurePromises = {};\n' + ensure);
  if (reporter) w.eval(reporterSource);
  return w;
}
function copy(w) {
  w.AlloModules.ErrorReporter.openPanel('errors');
  w.document.getElementById('aer-copy').click();
  return w.__copiedReport;
}
function waitForMatrix(w, parent) {
  w.__alloModuleLoadDiagnostics.register('GenerationMatrix');
  return w.__alloEnsureLazyModule('GenerationMatrix', () => {
    w.__alloModuleRegistry.GenerationMatrix = { status: 'pending' };
  }, 'GenerationMatrix', parent);
}
function deliverMatrix(w) {
  w.__alloModuleRegistry.GenerationMatrix = { status: 'loaded' };
  w.AlloModules.GenerationMatrix = {};
  w.dispatchEvent(new w.Event('alloflow:module-registry-changed'));
}

describe('actual host loader diagnostics and reporter integration', () => {
  it('records one 15-second warning and copies its real attempt ID, then records recovery', async () => {
    const w = boot(), pending = waitForMatrix(w);
    await vi.advanceTimersByTimeAsync(14999);
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    const slow = w.__alloModuleLoadTrace.at(-1);
    expect(slow).toMatchObject({ stage: 'module-wait', outcome: 'slow', elapsedMs: 15000 });
    expect(slow.attemptId).toMatch(/^ml-[a-z0-9-]{1,80}$/i);
    expect(w.AlloModules.ErrorReporter.getBuffer().map(e => e.level)).toEqual(['warn']);
    const firstCopy = copy(w);
    expect(firstCopy).toContain('module-wait/slow 15000ms attempt=' + slow.attemptId);
    expect(firstCopy).toContain('GenerationMatrix:pending');
    expect(firstCopy).not.toContain('PRIVATE_LESSON_CANARY');
    expect(firstCopy).not.toContain('PRIVATE_ASSIGNMENT_CANARY');
    deliverMatrix(w); await pending;
    expect(w.__alloModuleLoadTrace.at(-1)).toMatchObject({ attemptId: slow.attemptId, outcome: 'recovered' });
    expect(w.AlloModules.ErrorReporter.getBuffer().map(e => e.level)).toEqual(['warn', 'info']);
    expect(copy(w)).toContain('module-wait/recovered');
    expect(w.document.getElementById('allo-err-badge')?.style.display || 'none').toBe('none');
    await vi.advanceTimersByTimeAsync(70000);
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(2);
  });

  it('preserves one grouped preflight warning with child correlation and readable recovery', async () => {
    const w = boot(), diagnostics = w.__alloModuleLoadDiagnostics;
    diagnostics.register('GenerationMatrix');
    const parent = diagnostics.start('blueprint-preflight', ['GenerationMatrix']);
    const pending = waitForMatrix(w, parent.id);
    await vi.advanceTimersByTimeAsync(15000);
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(1);
    expect(w.__alloModuleLoadTrace.filter(e => e.stage === 'module-wait').every(e => e.correlationId === parent.id)).toBe(true);
    expect(copy(w)).toContain('group=' + parent.id);
    deliverMatrix(w); await pending; parent.finish('ready');
    expect(w.AlloModules.ErrorReporter.getBuffer().map(e => e.level)).toEqual(['warn', 'info']);
    expect(copy(w)).toContain('blueprint-preflight/recovered');
  });

  it('drains a real pre-reporter slow warning and retains trace without source data', async () => {
    const w = boot({ reporter: false }), pending = waitForMatrix(w);
    await vi.advanceTimersByTimeAsync(15000);
    expect(w.__alloPendingErrorReports).toHaveLength(1);
    w.eval(reporterSource);
    expect(w.__alloPendingErrorReports).toBeUndefined();
    expect(w.AlloModules.ErrorReporter.getBuffer()).toHaveLength(1);
    const text = copy(w);
    expect(text).toContain('module-wait/slow');
    expect(text).not.toMatch(/PRIVATE_(?:LESSON|ASSIGNMENT)_CANARY/);
    deliverMatrix(w); await pending;
  });

  it('retains the latest trace within the 8000-character report during broad CDN failure', () => {
    const w = boot(), diagnostics = w.__alloModuleLoadDiagnostics;
    // Real static module IDs from this host, not arbitrary injected strings.
    const names = [...new Set(hostSource.split('loadModule(').slice(1)
      .map(part => part.match(/^'([^']+)'/)?.[1]).filter(name => name && name !== 'ErrorReporter'))];
    for (const name of names) { diagnostics.register(name); w.__alloModuleRegistry[name] = { status: 'failed' }; }
    const attempt = diagnostics.start('blueprint-preflight', ['GenerationMatrix']);
    attempt.finish('failed');
    for (let index = 0; index < 15; index++) w.AlloModules.ErrorReporter.record('error', 'later failure ' + index + 'x'.repeat(2000));
    const text = copy(w), log = text.split('\nLog:\n')[1];
    expect(log.length).toBeLessThanOrEqual(8000);
    expect(log).toContain(names.length + ' module(s) FAILED');
    expect(log).toContain('blueprint-preflight/failed');
    expect(log).toContain('attempt=' + attempt.id);
  });
  it('preserves the newest recovery when eight valid trace rows have eight long module IDs each', () => {
    const w = boot(), diagnostics = w.__alloModuleLoadDiagnostics;
    const names = Array.from({ length: 8 }, (_, index) => 'Module' + index + 'x'.repeat(57));
    for (const name of names) diagnostics.register(name);
    let lastAttempt;
    for (let index = 0; index < 4; index++) {
      for (const name of names) w.__alloModuleRegistry[name] = { status: 'pending' };
      lastAttempt = diagnostics.start('blueprint-preflight', names);
      for (const name of names) w.__alloModuleRegistry[name] = { status: 'loaded' };
      lastAttempt.finish(index === 3 ? 'recovered' : 'ready');
    }
    expect(w.__alloModuleLoadTrace).toHaveLength(8);
    expect(w.__alloModuleLoadTrace.every(event => event.modules.length === 8)).toBe(true);
    const log = copy(w).split('\nLog:\n')[1];
    expect(log.length).toBeLessThanOrEqual(8000);
    expect(log).toContain('blueprint-preflight/recovered');
    expect(log).toContain('attempt=' + lastAttempt.id);
    expect(log).toContain(names.at(-1) + ':loaded]');
  });

});
