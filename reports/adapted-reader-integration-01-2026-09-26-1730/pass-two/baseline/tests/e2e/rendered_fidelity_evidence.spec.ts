import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
const { compareFiles, compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
test.setTimeout(90000);
const checkpoints = [{ id: 'p', sourceSelector: '#p', properties: ['text'] }];

test('unloaded captions and posters remain incomplete independently of media sources', async ({ browser }) => {
  for (const media of ['<video preload="none"><track kind="captions" src="https://media.invalid/captions.vtt"></video>', '<video preload="none" src="data:video/mp4;base64," poster="https://media.invalid/poster.png"></video>']) {
    const html = '<p id="p">Instruction</p>' + media;
    const report = await compareRenderedHtml(browser, html, html, { checkpoints });
    expect(report.status).toBe('unavailable');
    expect(report.resources.source.unresolved).toBeGreaterThan(0);
    expect(report.coverage.reasons).toContain('unresolved-resources');
  }
});

test('every profile binds the original file bytes including UTF-8 BOM', async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html');
  const bytes = Buffer.from('\uFEFF<p id="p">Instruction</p>');
  fs.writeFileSync(source, bytes); fs.writeFileSync(candidate, bytes);
  const report = await compareFiles(browser, source, candidate, { checkpoints, profiles: [{ id: 'screen' }, { id: 'print', media: 'print' }] });
  expect(report.status).toBe('passed');
  const expected = crypto.createHash('sha256').update(bytes).digest('hex');
  for (const item of [report, ...report.profiles]) {
    expect(item.source.sha256).toBe(expected);
    expect(item.candidate.sha256).toBe(expected);
    expect(item.source.path).toBe(source);
  }
});

test('unavailable observations retain both selectors for source review', async ({ browser }) => {
  const report = await compareRenderedHtml(browser, '<p id="p">Text</p>', '<p>Text</p>', { checkpoints: [{ id: 'missing', sourceSelector: '#p', candidateSelector: '#renamed', properties: ['text'] }] });
  expect(report.status).toBe('unavailable');
  expect(report.checks[0]).toMatchObject({ sourceSelector: '#p', candidateSelector: '#renamed' });
});
