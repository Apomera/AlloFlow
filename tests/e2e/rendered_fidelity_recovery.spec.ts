import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
test.setTimeout(120000);
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Recovery test</title></head><body><p id="p">Original text.</p></body></html>';
const checkpoints = [{ id: 'p', sourceSelector: '#p', properties: ['text', 'visible', 'exposed'] }];

test('a failed page setup closes its real context and retains the other side', async ({ browser }) => {
  let count = 0, closed = 0;
  const controlled = { version: () => browser.version(), newContext: async (options: any) => {
    const context = await browser.newContext(options);
    const close = context.close.bind(context);
    context.close = async () => { await close(); closed++; };
    if (++count === 1) context.newPage = async () => { throw Error('Injected page setup failure'); };
    return context;
  } };
  const report = await compareRenderedHtml(controlled, html, html, { checkpoints });
  expect(report.status).toBe('unavailable');
  expect(closed).toBe(2);
  expect(report.resources.source.failures).toEqual([expect.objectContaining({ phase: 'setup', reason: 'browser-inspection-failed' })]);
  expect(report.checks[0].candidate.status).toBe('observed');
  expect(report.checks[0].candidate.values.text).toBe('Original text.');
});

test('later real rendering profiles still run after navigation failure', async ({ browser }) => {
  let count = 0;
  const controlled = { version: () => browser.version(), newContext: async (options: any) => {
    const context = await browser.newContext(options);
    if (++count === 3) {
      const newPage = context.newPage.bind(context);
      context.newPage = async () => {
        const page = await newPage();
        page.goto = async () => { throw Error('Injected navigation failure'); };
        return page;
      };
    }
    return context;
  } };
  const report = await compareRenderedHtml(controlled, html, html, { checkpoints, profiles: [{ id: 'desktop' }, { id: 'mobile', viewport: { width: 390, height: 844 } }, { id: 'print', media: 'print' }] });
  expect(report.profiles.map((profile: any) => profile.status)).toEqual(['passed', 'unavailable', 'passed']);
  expect(report.status).toBe('unavailable');
  expect(report.coverage).toMatchObject({ profilesRequested: 3, profilesAttempted: 3, profilesCompleted: 2, complete: false });
});

test('CLI retains unavailable and successful pairs together in both reports', async ({}, testInfo) => {
  testInfo.setTimeout(240000);
  const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html');
  fs.writeFileSync(source, html); fs.writeFileSync(candidate, html);
  const manifest = testInfo.outputPath('manifest.json'), output = testInfo.outputPath('report');
  fs.writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, pairs: [
    { id: 'unreadable', sourcePath: 'missing.html', candidatePath: candidate, checkpoints },
    { id: 'valid', sourcePath: source, candidatePath: candidate, checkpoints },
  ] }));
  const cli = spawnSync(process.execPath, [path.resolve('dev-tools/rendered_document_fidelity.cjs'), manifest, output], { encoding: 'utf8', timeout: 210000, windowsHide: true });
  expect(cli.status, cli.stderr).toBe(1);
  const report = JSON.parse(fs.readFileSync(path.join(output, 'rendered-fidelity.json'), 'utf8'));
  expect(report.reports.map((pair: any) => pair.status)).toEqual(['unavailable', 'passed']);
  expect(report.manifest.stable).toBe(true);
  expect(report.humanValidation).toBe('not-run');
  const review = fs.readFileSync(path.join(output, 'review.html'), 'utf8');
  expect(review).toContain('unreadable'); expect(review).toContain('valid'); expect(review).toContain('file-comparison-failed');
});
