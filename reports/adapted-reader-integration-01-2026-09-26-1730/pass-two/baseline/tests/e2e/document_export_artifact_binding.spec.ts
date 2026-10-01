import { test, expect, type TestInfo } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const { runAcceptance, inspectPdf } = require('../../dev-tools/document_export_at_acceptance.cjs');

const original = '<!doctype html><html lang="en"><head><title>Reading check</title></head><body><main><p id="instruction">Read the original instruction.</p></main></body></html>';
const replacement = original.replace('Reading check', 'Changed document').replace('original instruction', 'replacement instruction');
const expected = { title: 'Reading check', language: 'en', headings: [], readingOrder: ['Read the original instruction.'], tables: [] };
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const stability = (artifact: any) => artifact.checks.find((check: any) => check.id === 'artifact.byte-stability');
function setup(testInfo: TestInfo, count = 1, sourceFidelity = false) {
  const artifacts = Array.from({ length: count }, (_, index) => {
    const file = testInfo.outputPath('artifact-' + index + '.html');
    fs.writeFileSync(file, original);
    return { id: 'artifact-' + index, kind: 'html', documentKind: 'reading', path: file, expected } as any;
  });
  if (sourceFidelity) {
    const source = testInfo.outputPath('source.html');
    fs.writeFileSync(source, original);
    artifacts[0].sourceFidelity = { sourcePath: source, checkpoints: [{ id: 'instruction', sourceSelector: '#instruction', properties: ['text', 'visible', 'exposed'] }] };
  }
  const manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts }));
  return { manifest, artifacts };
}
function afterContext(browser: any, action: (count: number) => void) {
  let count = 0;
  return { version: () => browser.version(), newContext: async (options: any) => {
    const context = await browser.newContext(options);
    try { action(++count); } catch (error) { await context.close(); throw error; }
    return context;
  } };
}

test('stable artifacts without source fidelity retain passing acceptance and exact byte identity', async ({ browser }, testInfo) => {
  const { manifest } = setup(testInfo);
  const report = await runAcceptance(manifest, { browser });
  expect(report.automatedStatus).toBe('passed');
  expect(report.artifacts[0].sha256).toBe(digest(original));
  expect(stability(report.artifacts[0])).toMatchObject({ status: 'passed', observed: { reason: 'artifact-unchanged' } });
  expect(report.artifacts[0].renderedFidelity).toBeUndefined();
  expect(report.humanAcceptance.status).toBe('not-run');
});

for (const mutation of ['changed', 'missing']) {
  test('inspects captured HTML and rejects a file that becomes ' + mutation + ' before browser inspection', async ({ browser }, testInfo) => {
    const { manifest, artifacts } = setup(testInfo);
    const controlledBrowser = afterContext(browser, () => {
      if (mutation === 'changed') fs.writeFileSync(artifacts[0].path, replacement);
      else fs.unlinkSync(artifacts[0].path);
    });
    const report = await runAcceptance(manifest, { browser: controlledBrowser });
    const artifact = report.artifacts[0];
    expect(artifact.sha256).toBe(digest(original));
    expect(artifact.checks.find((check: any) => check.id === 'html.document-identity').status).toBe('passed');
    expect(artifact.checks.find((check: any) => check.id === 'html.reading-order').status).toBe('passed');
    expect(stability(artifact)).toMatchObject({ status: 'unavailable', observed: { reason: mutation === 'changed' ? 'artifact-changed' : 'artifact-unreadable' } });
    expect(artifact.automatedStatus).toBe('failed');
    expect(report.automatedStatus).toBe('failed');
    expect(report.humanAcceptance.status).toBe('not-run');
  });
}

test('rechecks earlier artifacts after later inspections', async ({ browser }, testInfo) => {
  const { manifest, artifacts } = setup(testInfo, 2);
  const controlledBrowser = afterContext(browser, count => { if (count === 2) fs.writeFileSync(artifacts[0].path, replacement); });
  const report = await runAcceptance(manifest, { browser: controlledBrowser });
  expect(stability(report.artifacts[0]).status).toBe('unavailable');
  expect(stability(report.artifacts[1]).status).toBe('passed');
  expect(report.automatedStatus).toBe('failed');
});

test('PDF inspection accepts captured bytes without rereading the source path', async ({}, testInfo) => {
  const bytes = fs.readFileSync(path.resolve(__dirname, '../../test-assets/multi-column-sample.pdf'));
  const report = await inspectPdf(testInfo.outputPath('never-created.pdf'), { title: '', headings: [], readingOrder: [], tables: [] }, bytes);
  expect(report.pages).toBeGreaterThan(0);
  expect(report.checks.some((check: any) => check.id === 'pdf.tagged-reading-order')).toBe(true);
  expect(fs.existsSync(testInfo.outputPath('never-created.pdf'))).toBe(false);
});

test('invalidates a rendered pass when its artifact changes during a later inspection', async ({ browser }, testInfo) => {
  const { manifest, artifacts } = setup(testInfo, 2, true);
  artifacts[0].sourceFidelity.profiles = [{ id: 'screen', media: 'screen' }, { id: 'print', media: 'print' }];
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts }));
  const controlledBrowser = afterContext(browser, count => { if (count === 6) fs.writeFileSync(artifacts[0].path, replacement); });
  const report = await runAcceptance(manifest, { browser: controlledBrowser });
  const artifact = report.artifacts[0];
  expect(stability(artifact).status).toBe('unavailable');
  expect(artifact.renderedFidelity).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
  expect(artifact.renderedFidelity.coverage.reasons).toContain('artifact-changed');
  expect(artifact.renderedFidelity.profiles).toHaveLength(2);
  for (const profile of artifact.renderedFidelity.profiles) {
    expect(profile).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
    expect(profile.coverage.reasons).toContain('artifact-changed');
  }
  expect(artifact.checks.find((check: any) => check.id === 'html.rendered-source-fidelity').status).toBe('unavailable');
  expect(report.automatedStatus).toBe('failed');
});

for (const mutation of ['changed', 'missing']) {
  test('rechecks a rendered source that becomes ' + mutation + ' during a later artifact inspection', async ({ browser }, testInfo) => {
    const { manifest, artifacts } = setup(testInfo, 2, true);
    const controlledBrowser = afterContext(browser, count => {
      if (count !== 4) return;
      if (mutation === 'changed') fs.writeFileSync(artifacts[0].sourceFidelity.sourcePath, replacement);
      else fs.unlinkSync(artifacts[0].sourceFidelity.sourcePath);
    });
    const report = await runAcceptance(manifest, { browser: controlledBrowser });
    const artifact = report.artifacts[0], reason = mutation === 'changed' ? 'source-changed' : 'source-unreadable';
    expect(stability(artifact).status).toBe('passed');
    expect(artifact.checks.find((check: any) => check.id === 'html.rendered-source-byte-stability')).toMatchObject({ status: 'unavailable', observed: { reason } });
    expect(artifact.renderedFidelity).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
    expect(artifact.renderedFidelity.coverage.reasons).toContain(reason);
    expect(report.automatedStatus).toBe('failed');
  });
}

for (const optedIn of [false, true]) {
  test('CLI writes a rendered review only when source fidelity is ' + (optedIn ? 'enabled' : 'absent'), async ({}, testInfo) => {
    testInfo.setTimeout(240000);
    const { manifest } = setup(testInfo, 1, optedIn);
    const output = testInfo.outputPath('acceptance-output');
    execFileSync(process.execPath, [path.resolve(__dirname, '../../dev-tools/document_export_at_acceptance.cjs'), manifest, output], { timeout: 210000, encoding: 'utf8', windowsHide: true });
    const report = JSON.parse(fs.readFileSync(path.join(output, 'automated-results.json'), 'utf8'));
    expect(report.automatedStatus).toBe('passed');
    expect(fs.existsSync(path.join(output, 'rendered-fidelity-review.html'))).toBe(optedIn);
    if (optedIn) expect(fs.readFileSync(path.join(output, 'rendered-fidelity-review.html'), 'utf8')).toContain('artifact-0');
    expect(JSON.parse(fs.readFileSync(path.join(output, 'manual-results.template.json'), 'utf8')).status).toBe('not-run');
  });
}
