const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
function helperSource(file) {
  const source = readFileSync(resolve(root, file), 'utf8');
  const start = source.indexOf('  const handleCopyBlueprintActionDiagnostics = ');
  const end = source.indexOf('  const handleCopyBlueprintDiagnostics = ', start);
  assert.ok(start > 0 && end > start);
  return source.slice(start, end);
}
function harness(entries, copy = async () => true, stamp) {
  const reports = [];
  const window = { __alloModuleLoadTrace: entries, ...(stamp === undefined ? {} : { __alloBuildStamp: stamp }) };
  const context = vm.createContext({ window,
    _copySanitizedDiagnostic: async report => { reports.push(JSON.parse(JSON.stringify(report))); return copy(report); } });
  vm.runInContext(helperSource(hosts[0]) + '\nthis.copy = handleCopyBlueprintActionDiagnostics;', context);
  return { run: id => context.copy(id), reports, window };
}
const entry = (extra = {}) => ({ schemaVersion: 1, at: 1000, attemptId: 'ml-test-2', correlationId: 'ml-test-1',
  stage: 'module-wait', outcome: 'timeout', elapsedMs: 65000,
  modules: [{ name: 'GenerationMatrix', status: 'failed' }], counts: { queued: 1, pending: 0, failed: 1 }, ...extra });

test('action diagnostic copy includes only the exact request trace, without lesson or arbitrary fields', async () => {
  const h = harness([
    entry({ attemptId: 'ml-other-1', correlationId: 'ml-other-1', source: 'PRIVATE SOURCE CANARY' }),
    entry({ stage: 'blueprint-preflight', attemptId: 'ml-test-1', source: 'PRIVATE SOURCE CANARY', blueprint: { title: 'PRIVATE TITLE CANARY' }, modules: [{ name: 'GenerationMatrix', status: 'failed', detail: 'PRIVATE DETAIL CANARY' }] }),
    entry({ stage: 'blueprint-generation', attemptId: 'ml-test-3', outcome: 'failed' }),
  ]);
  assert.equal(await h.run('ml-test-1'), true);
  assert.equal(h.reports.length, 1);
  const report = h.reports[0];
  assert.equal(report.kind, 'blueprint-action-loading');
  assert.equal(report.diagnosticId, 'ml-test-1');
  assert.equal(report.trace.length, 2);
  assert.deepEqual(report.trace[0].modules, [{ name: 'GenerationMatrix', status: 'failed' }]);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE|ml-other|blueprint"|source"|detail"/);
});

test('copy sanitizes statuses, modules, timestamps and counts even if a trace entry is altered', async () => {
  const h = harness([entry({ at: -1, elapsedMs: Infinity, modules: [
    { name: 'PRIVATE SOURCE CANARY', status: 'failed' },
    { name: 'GenerationMatrix', status: 'PRIVATE STATE CANARY' },
    { name: 'AgentCoreContracts', status: 'loaded' },
  ], counts: { pending: -100, queued: 1000000, failed: NaN, source: 'PRIVATE SOURCE CANARY' } })]);
  assert.equal(await h.run('ml-test-1'), true);
  const item = h.reports[0].trace[0];
  assert.equal(item.at, 0);
  assert.equal(item.elapsedMs, 0);
  assert.deepEqual(item.counts, { pending: 0, queued: 10000, failed: 0 });
  assert.deepEqual(item.modules, [{ name: 'AgentCoreContracts', status: 'loaded' }]);
  assert.doesNotMatch(JSON.stringify(h.reports), /PRIVATE/);
});

test('unmatched, malformed or missing request diagnostics never copy an unrelated report', async () => {
  for (const id of ['', 'PRIVATE SOURCE CANARY', 'ml-unmatched-1', 'ml-' + 'x'.repeat(81), null]) {
    const h = harness([entry()]);
    assert.equal(await h.run(id), false);
    assert.equal(h.reports.length, 0);
  }
  const h = harness(null);
  assert.equal(await h.run('ml-test-1'), false);
  assert.equal(h.reports.length, 0);
});

test('an old action cannot collect new unrelated diagnostic attempts and trace output stays bounded', async () => {
  const old = entry({ attemptId: 'ml-old-1', correlationId: 'ml-old-1' });
  const h = harness([old, ...Array.from({ length: 70 }, (_, index) => entry({ attemptId: 'ml-test-' + (index + 2) }))]);
  assert.equal(await h.run('ml-old-1'), false);
  assert.equal(await h.run('ml-test-1'), true);
  assert.equal(h.reports[0].trace.length, 20);
});

test('clipboard failure returns false and is safe to retry explicitly', async () => {
  const h = harness([entry()], async () => { throw new Error('clipboard unavailable'); });
  assert.equal(await h.run('ml-test-1'), false);
  assert.equal(await h.run('ml-test-1'), false);
  assert.equal(h.reports.length, 2);
});

test('all three hosts expose identical diagnostic helpers and command-context dependencies', () => {
  const expected = helperSource(hosts[0]);
  for (const host of hosts) {
    assert.equal(helperSource(host), expected);
    const source = readFileSync(resolve(root, host), 'utf8');
    const start = source.indexOf('  const _alloCmdCtx = () => {');
    const end = source.indexOf('\n  };', start);
    assert.match(source.slice(start, end), /handleCopyBlueprintActionDiagnostics/);
  }
});

test('copied diagnostics identify the actual source build without inventing an app version', async () => {
  const h = harness([entry()], undefined, { hash: 'ABCDEF1234567890', surface: 'canvas', hostLoaderRevision: '2026-10-21-stall-v2', at: 1234 });
  assert.equal(await h.run('ml-test-1'), true);
  assert.equal(h.reports[0].reportVersion, 2);
  assert.deepEqual(h.reports[0].build, { sourceHash: 'abcdef1234567890', surface: 'canvas', hostLoaderRevision: '2026-10-21-stall-v2' });
  assert.equal(Object.hasOwn(h.reports[0].build, 'appVersion'), false);
  assert.equal(Object.hasOwn(h.reports[0].build, 'at'), false);
});

test('missing build metadata is reported as unknown rather than inferred', async () => {
  for (const stamp of [undefined, null, {}, 'PRIVATE BUILD CANARY']) {
    const h = harness([entry()], undefined, stamp);
    assert.equal(await h.run('ml-test-1'), true);
    assert.deepEqual(h.reports[0].build, { sourceHash: 'unknown', surface: 'unknown', hostLoaderRevision: 'unknown' });
    assert.doesNotMatch(JSON.stringify(h.reports), /PRIVATE/);
  }
});

test('build identity strictly bounds hashes, surfaces and loader revisions and drops private extras', async () => {
  for (const hash of ['1234567', '1'.repeat(41), 'https://PRIVATE.example/token', 'abcdef12\n', 'abcdef12\r\n', 'v1.2.3', { source: 'PRIVATE HASH CANARY' }]) {
    const h = harness([entry()], undefined, { hash, surface: 'PRIVATE USER AGENT CANARY',
      hostLoaderRevision: '2026-10-21-stall-v2\n', version: 'PRIVATE VERSION CANARY', url: 'https://PRIVATE.example', key: 'PRIVATE KEY CANARY' });
    assert.equal(await h.run('ml-test-1'), true);
    assert.deepEqual(h.reports[0].build, { sourceHash: 'unknown', surface: 'unknown', hostLoaderRevision: 'unknown' });
    assert.doesNotMatch(JSON.stringify(h.reports), /PRIVATE|https:|appVersion|userAgent|"key"/);
  }
  for (const surface of ['canvas', 'deployed', 'desktop', 'development', 'unknown']) {
    const h = harness([entry()], undefined, { hash: '1'.repeat(40), surface, hostLoaderRevision: '2026-10-21-stall-v999' });
    assert.equal(await h.run('ml-test-1'), true);
    assert.equal(h.reports[0].build.sourceHash.length, 40);
    assert.equal(h.reports[0].build.surface, surface);
    assert.equal(h.reports[0].build.hostLoaderRevision, '2026-10-21-stall-v999');
  }
  for (const revision of ['2026-13-32-stall-v2', '2026-00-00-stall-v2', '2026-10-21-stall-v0', '2026-10-21-stall-v1000', 'PRIVATE REVISION CANARY']) {
    const h = harness([entry()], undefined, { hash: 'abcdef12', surface: 'canvas', hostLoaderRevision: revision });
    assert.equal(await h.run('ml-test-1'), true);
    assert.equal(h.reports[0].build.hostLoaderRevision, 'unknown');
    assert.doesNotMatch(JSON.stringify(h.reports), /PRIVATE/);
  }
});

test('failed stage and outcome come from the latest allowed failure in this exact attempt', async () => {
  for (const stage of ['module-wait', 'blueprint-preflight', 'blueprint-generation']) {
    for (const outcome of ['failed', 'timeout']) {
      const h = harness([
        entry({ stage: 'blueprint-preflight', outcome: 'failed' }),
        entry({ stage, outcome }),
        entry({ stage: 'blueprint-generation', outcome: 'failed', attemptId: 'ml-other-1', correlationId: 'ml-other-1' }),
      ]);
      assert.equal(await h.run('ml-test-1'), true);
      assert.equal(h.reports[0].failedStage, stage);
      assert.equal(h.reports[0].failureOutcome, outcome);
    }
  }
});

test('failed stage stays unknown when no correlated allowed failure was recorded', async () => {
  const h = harness([
    entry({ stage: 'blueprint-preflight', outcome: 'ready' }),
    entry({ stage: 'PRIVATE STAGE CANARY', outcome: 'failed' }),
    entry({ stage: 'blueprint-generation', outcome: 'PRIVATE OUTCOME CANARY' }),
    entry({ stage: 'blueprint-generation', outcome: 'failed', attemptId: 'ml-other-1', correlationId: 'ml-other-1' }),
  ]);
  assert.equal(await h.run('ml-test-1'), true);
  assert.equal(h.reports[0].failedStage, 'unknown');
  assert.equal(h.reports[0].failureOutcome, 'unknown');
  assert.doesNotMatch(JSON.stringify(h.reports), /PRIVATE|ml-other/);
});

test('each diagnostic click reads current sanitized build metadata and keeps the request boundary', async () => {
  const h = harness([entry()], undefined, { hash: 'abcdef12', surface: 'desktop', hostLoaderRevision: '2026-10-21-stall-v2' });
  assert.equal(await h.run('ml-test-1'), true);
  h.window.__alloBuildStamp = { hash: '1234abcd', surface: 'development', hostLoaderRevision: '2026-10-24-stall-v3' };
  h.window.__alloModuleLoadTrace.push(entry({ correlationId: 'ml-other-1', attemptId: 'ml-other-2', stage: 'blueprint-generation', outcome: 'failed' }));
  assert.equal(await h.run('ml-test-1'), true);
  assert.equal(h.reports[0].build.sourceHash, 'abcdef12');
  assert.equal(h.reports[1].build.sourceHash, '1234abcd');
  assert.equal(h.reports[1].build.surface, 'development');
  assert.equal(h.reports[1].trace.length, 1);
  assert.equal(h.reports[1].failedStage, 'module-wait');
  assert.equal(h.reports[1].failureOutcome, 'timeout');
});
