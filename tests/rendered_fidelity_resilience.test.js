import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compareRenderedHtml, runRenderedManifest } = require('../dev-tools/rendered_document_fidelity.cjs');
const HTML = '<!doctype html><html lang="en"><body><p id="text">Text</p></body></html>';
const checkpoints = [{ id: 'text', sourceSelector: '#text', properties: ['text'] }];
const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    const resolved = path.resolve(directory);
    const prefix = path.join(path.resolve(os.tmpdir()), 'allo-rendered-resilience-');
    if (!resolved.startsWith(prefix)) throw Error('Unexpected test cleanup directory.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

function browserStub(plans = [], onContext = () => {}) {
  const contexts = [];
  let attempt = 0;
  const browser = {
    version: () => 'stub-chromium',
    close: vi.fn(async () => {}),
    newContext: vi.fn(async () => {
      const index = attempt++;
      const plan = plans[index] || {};
      await onContext(index);
      const fail = phase => { if (plan.fail === phase) throw Error('Injected ' + phase + ' failure'); };
      fail('newContext');
      let evaluation = 0;
      const page = {
        setDefaultTimeout: vi.fn(),
        emulateMedia: vi.fn(async () => { fail('media'); }),
        goto: vi.fn(async () => { fail('navigation'); }),
        evaluate: vi.fn(async () => {
          const call = evaluation++;
          if (call >= 2) fail('dependencies');
          return [1, { values: { text: 'Text' }, truncated: false }, { scripts: 0, unresolved: 0, animations: 0 }][call];
        }),
      };
      const session = {
        send: vi.fn(async method => {
          if (method === 'Accessibility.enable') fail('accessibility');
          if (method === 'DOM.getDocument') return { root: { nodeId: 1 } };
          if (method === 'DOM.querySelector') return { nodeId: 2 };
          if (method === 'Accessibility.getPartialAXTree') {
            return { nodes: [{ ignored: false, name: { value: 'Text' }, role: { value: 'paragraph' } }] };
          }
          return {};
        }),
      };
      const context = {
        page, session,
        route: vi.fn(async () => { fail('route'); }),
        newPage: vi.fn(async () => { fail('newPage'); return page; }),
        newCDPSession: vi.fn(async () => { fail('newCDPSession'); return session; }),
        close: vi.fn(async () => { fail('cleanup'); }),
      };
      contexts.push(context);
      return context;
    }),
  };
  return { browser, contexts };
}

function manifestFixture(pairCount = 2) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'allo-rendered-resilience-'));
  temporaryDirectories.push(directory);
  const pairs = Array.from({ length: pairCount }, (_, index) => {
    const id = 'pair-' + (index + 1);
    const sourcePath = id + '-source.html', candidatePath = id + '-candidate.html';
    fs.writeFileSync(path.join(directory, sourcePath), HTML);
    fs.writeFileSync(path.join(directory, candidatePath), HTML);
    return { id, sourcePath, candidatePath, checkpoints };
  });
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = { schemaVersion: 1, pairs };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return { directory, manifest, manifestPath };
}

describe('rendered comparison execution failures', () => {
  it('reports a complete successful checkpoint with both contexts released', async () => {
    const { browser, contexts } = browserStub();
    const report = await compareRenderedHtml(browser, HTML, HTML, { checkpoints });
    expect(report.status).toBe('passed');
    expect(report.execution.complete).toBe(true);
    expect(report.coverage).toMatchObject({ requested: 1, inspected: 1, complete: true });
    expect(contexts).toHaveLength(2);
    for (const context of contexts) expect(context.close).toHaveBeenCalledOnce();
  });

  it.each([
    ['newContext', 'context'],
    ['route', 'setup'],
    ['newPage', 'setup'],
    ['media', 'navigation'],
    ['navigation', 'navigation'],
    ['newCDPSession', 'accessibility'],
    ['accessibility', 'accessibility'],
    ['dependencies', 'dependencies'],
  ])('retains diagnostics and continues after %s fails', async (failure, phase) => {
    const { browser, contexts } = browserStub([{ fail: failure }]);
    const report = await compareRenderedHtml(browser, HTML, HTML, { checkpoints });
    expect(report.status).toBe('unavailable');
    expect(report.execution.complete).toBe(false);
    expect(report.coverage.complete).toBe(false);
    expect(report.coverage.reasons).toContain('source-browser-inspection-failed');
    expect(report.resources.source.failures).toEqual([
      { reason: 'browser-inspection-failed', phase, message: 'Injected ' + failure + ' failure' },
    ]);
    expect(report.resources.candidate.failures).toEqual([]);
    expect(browser.newContext).toHaveBeenCalledTimes(2);
    for (const context of contexts) expect(context.close).toHaveBeenCalledOnce();
    if (failure === 'dependencies') {
      expect(report.checks[0].status).toBe('passed');
      expect(report.resources.source.scripts).toBeNull();
    } else {
      expect(report.checks[0]).toMatchObject({ status: 'unavailable', source: { phase } });
    }
  });

  it('records context cleanup failure without discarding completed observations', async () => {
    const { browser, contexts } = browserStub([{ fail: 'cleanup' }]);
    const report = await compareRenderedHtml(browser, HTML, HTML, { checkpoints });
    expect(report.status).toBe('unavailable');
    expect(report.execution.complete).toBe(false);
    expect(report.checks[0].status).toBe('passed');
    expect(report.coverage.reasons).toContain('source-browser-cleanup-failed');
    expect(report.resources.source.failures).toEqual([
      { reason: 'browser-cleanup-failed', phase: 'cleanup', message: 'Injected cleanup failure' },
    ]);
    for (const context of contexts) expect(context.close).toHaveBeenCalledOnce();
  });

  it('attempts every rendering profile while separating completed from failed execution', async () => {
    const { browser, contexts } = browserStub([{}, {}, { fail: 'navigation' }]);
    const report = await compareRenderedHtml(browser, HTML, HTML, {
      checkpoints,
      profiles: [{ id: 'desktop' }, { id: 'mobile', viewport: { width: 390, height: 800 } }, { id: 'print', media: 'print' }],
    });
    expect(report.status).toBe('unavailable');
    expect(report.coverage).toMatchObject({ profilesRequested: 3, profilesAttempted: 3, profilesCompleted: 2, requested: 3, inspected: 2, complete: false });
    expect(report.profiles.map(profile => [profile.id, profile.status])).toEqual([
      ['desktop', 'passed'], ['mobile', 'unavailable'], ['print', 'passed'],
    ]);
    expect(report.coverage.reasons).toContain('mobile:source-browser-inspection-failed');
    expect(browser.newContext).toHaveBeenCalledTimes(6);
    for (const context of contexts) expect(context.close).toHaveBeenCalledOnce();
  });
});

describe('rendered manifest evidence survives partial failures', () => {
  it.each(['missing', 'invalid-encoding'])('retains a later pair when the first source is %s', async failure => {
    const fixture = manifestFixture();
    const firstSource = path.join(fixture.directory, fixture.manifest.pairs[0].sourcePath);
    if (failure === 'missing') fs.unlinkSync(firstSource);
    else fs.writeFileSync(firstSource, Buffer.from([0xff]));
    const { browser } = browserStub();
    const result = await runRenderedManifest(fixture.manifestPath, { browser });
    expect(result.reports).toHaveLength(2);
    expect(result.reports[0]).toMatchObject({ id: 'pair-1', status: 'unavailable', reason: 'file-comparison-failed', coverage: { profilesAttempted: 0, profilesCompleted: 0, inspected: 0 } });
    expect(result.reports[0].message).toBeTruthy();
    expect(result.reports[1]).toMatchObject({ id: 'pair-2', status: 'passed', coverage: { complete: true } });
    expect(result.manifest.stable).toBe(true);
    expect(browser.newContext).toHaveBeenCalledTimes(2);
    expect(browser.close).not.toHaveBeenCalled();
  });

  it('invalidates an earlier pair when its source changes during a later pair', async () => {
    const fixture = manifestFixture();
    const firstSource = path.join(fixture.directory, fixture.manifest.pairs[0].sourcePath);
    const { browser } = browserStub([], index => {
      if (index === 2) fs.appendFileSync(firstSource, '<!-- changed after its comparison -->');
    });
    const result = await runRenderedManifest(fixture.manifestPath, { browser });
    expect(result.reports[0]).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
    expect(result.reports[0].coverage.reasons).toContain('source-changed-or-missing');
    expect(result.reports[1].status).toBe('passed');
    expect(result.manifest.stable).toBe(true);
  });

  it('invalidates all pairs when the manifest bytes change during execution', async () => {
    const fixture = manifestFixture();
    const { browser } = browserStub([], index => {
      if (index === 2) fs.appendFileSync(fixture.manifestPath, '\n');
    });
    const result = await runRenderedManifest(fixture.manifestPath, { browser });
    expect(result.manifest.stable).toBe(false);
    expect(result.reports).toHaveLength(2);
    for (const report of result.reports) {
      expect(report).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
      expect(report.coverage.reasons).toContain('manifest-changed-or-missing');
    }
  });

  it.each([
    ['schema', manifest => { manifest.schemaVersion = 2; }],
    ['duplicate pair', manifest => { manifest.pairs[1].id = manifest.pairs[0].id; }],
    ['checkpoint property', manifest => { manifest.pairs[1].checkpoints = [{ id: 'bad', sourceSelector: 'p', properties: ['unsupported'] }]; }],
    ['rendering profile', manifest => { manifest.pairs[1].profiles = [{ id: 'bad', media: 'speech' }]; }],
  ])('rejects invalid %s before using the browser', async (_name, invalidate) => {
    const fixture = manifestFixture();
    invalidate(fixture.manifest);
    fs.writeFileSync(fixture.manifestPath, JSON.stringify(fixture.manifest));
    const { browser } = browserStub();
    await expect(runRenderedManifest(fixture.manifestPath, { browser })).rejects.toThrow();
    expect(browser.newContext).not.toHaveBeenCalled();
    expect(browser.close).not.toHaveBeenCalled();
  });
});
