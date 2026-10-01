import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
const duplicate = '<main id="p"><p>Do <span>not</span> open the valve.</p><p hidden>Do not open the valve.</p></main>';
async function compare(browser: any, testInfo: any, source: string, candidate: string, properties = ['text', 'visible', 'exposed']) {
  const report = await compareRenderedHtml(browser, source, candidate, { checkpoints: [{ id: 'p', sourceSelector: '#p', properties }] });
  fs.writeFileSync(testInfo.outputPath('source.html'), source);
  fs.writeFileSync(testInfo.outputPath('candidate.html'), candidate);
  fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  return report;
}
const property = (report: any, name: string) => report.checks[0].properties.find((item: any) => item.property === name);

test('revealed duplicate cannot supply the original instruction negation', async ({ browser, page }, testInfo) => {
  const candidate = duplicate.replace('<span>', '<span hidden>').replace('<p hidden>', '<p>');
  await page.setContent(candidate);
  expect(await page.locator('#p').innerText()).toMatch(/Do open the valve\./);
  expect(await page.locator('#p').ariaSnapshot()).toContain('Do open the valve.');
  const report = await compare(browser, testInfo, duplicate, candidate);
  expect(report.status).toBe('review-required');
  expect(report.coverage.complete).toBe(true);
  expect(property(report, 'text').status).toBe('passed');
  for (const name of ['visibleText', 'exposedText']) {
    expect(property(report, name).status).toBe('failed');
    expect(property(report, name).occurrences.basis).toBe('canonical-dom-text-offsets');
  }
});

test('ARIA-only duplicate restoration cannot conceal lost original exposure', async ({ browser }, testInfo) => {
  const source = duplicate.replace('<p hidden>', '<p aria-hidden="true">');
  const candidate = source.replace('<span>', '<span aria-hidden="true">').replace('<p aria-hidden="true">', '<p>');
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('review-required');
  expect(property(report, 'visibleText').status).toBe('passed');
  expect(property(report, 'exposedText').status).toBe('failed');
});

test('revealing an earlier duplicate cannot mask a later lost occurrence', async ({ browser }, testInfo) => {
  const source = '<main id="p"><p hidden>Do not open the valve.</p><p>Do <span>not</span> open the valve.</p></main>';
  const report = await compare(browser, testInfo, source, source.replace('<p hidden>', '<p>').replace('<span>', '<span hidden>'));
  expect(report.status).toBe('review-required');
  expect(property(report, 'visibleText').status).toBe('failed');
  expect(property(report, 'exposedText').status).toBe('failed');
});

test('inline duplicate words retain distinct identities through rewrapping', async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span>not</span><span hidden>not</span> open.</p>';
  const candidate = '<p id="p"><strong>Do </strong><span hidden>not</span><span>not</span> open.</p>';
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('review-required');
  expect(property(report, 'visibleText')).toMatchObject({ source: 'Do not open.', candidate: 'Do not open.', status: 'failed' });
  expect(property(report, 'exposedText').status).toBe('failed');
});

test('revealing duplicate without source loss remains allowed', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, duplicate, duplicate.replace('<p hidden>', '<p>'));
  expect(report.status).toBe('passed');
  expect(report.coverage.complete).toBe(true);
});

test('restoring complete hidden content permits arbitrary equivalent rewrapping', async ({ browser }, testInfo) => {
  const source = '<section id="p" hidden>Do not open. Keep this instruction.</section>';
  const candidate = '<section id="p"><p>Do <strong>not</strong> open. </p><p>Keep this instruction.</p></section>';
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('passed');
});

test('restoring partial content retains visible source positions after rewrapping', async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span hidden>not </span>open. <span aria-hidden="true">Keep this instruction.</span></p>';
  const candidate = '<p id="p"><strong>Do not </strong><span>open. Keep </span>this instruction.</p>';
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('passed');
});

test('canonical accents across markup boundaries preserve occurrence offsets', async ({ browser }, testInfo) => {
  const source = '<p id="p">Café: ne pas ouvrir. لا تفتح.</p>';
  const candidate = '<p id="p"><span>Cafe</span><span>\u0301: ne </span><strong>pas ouvrir.</strong> لا تفتح.</p>';
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('passed');
});

test('whitespace normalization and surrogate pairs survive harmless rewrapping', async ({ browser }, testInfo) => {
  const source = '<p id="p">  Keep\n\t👩‍🔬 scientific instructions.  </p>';
  const candidate = '<p id="p"><strong>Keep </strong><span>👩‍🔬 scientific</span> instructions.</p>';
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('passed');
});

test('Chinese duplicate cannot supply a hidden original negation', async ({ browser }, testInfo) => {
  const source = '<main id="p"><p>请<span>不要</span>打开阀门。</p><p hidden>请不要打开阀门。</p></main>';
  const candidate = source.replace('<span>', '<span hidden>').replace('<p hidden>', '<p>');
  const report = await compare(browser, testInfo, source, candidate);
  expect(report.status).toBe('review-required');
  expect(property(report, 'visibleText').status).toBe('failed');
  expect(property(report, 'exposedText').status).toBe('failed');
});

test('text-only contract does not implicitly require occurrence exposure', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, duplicate, duplicate.replace('<span>', '<span hidden>').replace('<p hidden>', '<p>'), ['text']);
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties.map((item: any) => item.property)).toEqual(['text']);
});
