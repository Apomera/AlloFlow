import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
const checkpoints = (properties: string[]) => [{ id: 'p', sourceSelector: '#p', properties }];
async function compare(browser: any, testInfo: any, source: string, candidate: string, properties: string[]) {
  const report = await compareRenderedHtml(browser, source, candidate, { checkpoints: checkpoints(properties) });
  fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  return report;
}

for (const [attribute, expectedProperty] of [
  ['style="display:none"', 'visibleText'],
  ['style="visibility:hidden"', 'visibleText'],
  ['style="opacity:0"', 'visibleText'],
  ['aria-hidden="true"', 'exposedText'],
]) test('instruction checkpoint catches descendant ' + attribute, async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span>not</span> open the container.</p>';
  const report = await compare(browser, testInfo, source, source.replace('<span>', '<span ' + attribute + '>'), ['text', 'visible', 'exposed']);
  expect(report.status).toBe('review-required');
  expect(report.coverage.complete).toBe(true);
  expect(report.checks[0].properties.find((p: any) => p.property === expectedProperty)).toMatchObject({ status: 'failed', source: 'Do not open the container.', candidate: 'Do open the container.' });
});

test('instruction rewrapping preserves visible and exposed words', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, '<p id="p">Do <span>not</span> open.</p>', '<p id="p"><span>Do not </span><strong>open.</strong></p>', ['text', 'visible', 'exposed']);
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties.map((p: any) => p.property)).toContain('exposedText');
});

test('restoring a fully hidden instruction is allowed', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, '<p id="p" style="display:none">Do not open.</p>', '<p id="p">Do not open.</p>', ['text', 'visible', 'exposed']);
  expect(report.status).toBe('passed');
});

test('text-only contracts remain distinct from rendered preservation', async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span>not</span> open.</p>';
  const report = await compare(browser, testInfo, source, source.replace('<span>', '<span hidden>'), ['text']);
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties.map((p: any) => p.property)).toEqual(['text']);
});

test('display contents direct text respects opacity on a real ancestor box', async ({ browser }, testInfo) => {
  const source = '<div><p id="p" style="display:contents">Keep the required instruction.</p></div>';
  const report = await compare(browser, testInfo, source, source.replace('<div>', '<div style="opacity:0">'), ['visible', 'text']);
  expect(report.status).toBe('review-required');
  expect(report.checks[0].properties.find((p: any) => p.property === 'visible')).toMatchObject({ source: true, candidate: false, status: 'failed' });
});

test('display contents retains direct text and visible child overrides', async ({ browser }, testInfo) => {
  const source = '<div style="visibility:hidden"><p id="p" style="visibility:visible">Keep the instruction.</p></div>';
  const report = await compare(browser, testInfo, source, source.replace('style="visibility:visible"', 'style="visibility:visible;display:contents"'), ['visible', 'text']);
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties.find((p: any) => p.property === 'visible')).toMatchObject({ source: true, candidate: true });
});

const select = '<label for="p">Direction</label><select id="p"><option value="direction" selected>North</option><option value="direction">South</option></select>';
test('duplicate submitted values cannot conceal a different selected option', async ({ browser }, testInfo) => {
  const candidate = select.replace(' selected>North', '>North').replace('>South', ' selected>South');
  const report = await compare(browser, testInfo, select, candidate, ['selected', 'value', 'text', 'name', 'role', 'disabled']);
  expect(report.status).toBe('review-required');
  expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({ status: 'failed', source: [{ index: 0, value: 'direction', label: 'North' }], candidate: [{ index: 1, value: 'direction', label: 'South' }] });
});

test('unchanged duplicate option choice survives harmless markup attributes', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, select, select.replace('<option ', '<option id="north" '), ['selected', 'value', 'name']);
  expect(report.status).toBe('passed');
});

test('selected-only contract preserves option labels as well as submitted value', async ({ browser }, testInfo) => {
  const report = await compare(browser, testInfo, select, select.replace('North', 'West'), ['selected']);
  expect(report.status).toBe('review-required');
});

test('relative href spelling cannot collapse through the synthetic root URL', async ({ browser }, testInfo) => {
  const source = '<a id="p" href="./chapter.pdf">Read the chapter</a>';
  const report = await compare(browser, testInfo, source, source.replace('./chapter.pdf', '../chapter.pdf'), ['href', 'text']);
  expect(report.status).toBe('review-required');
  expect(report.checks[0].properties[0]).toMatchObject({ status: 'failed', source: { relative: './chapter.pdf' }, candidate: { relative: '../chapter.pdf' } });
});

test('unchanged relative href remains comparable', async ({ browser }, testInfo) => {
  const source = '<a id="p" href="../chapter.pdf">Read the chapter</a>';
  const report = await compare(browser, testInfo, source, source.replace('<a ', '<a class="reading" '), ['href', 'text']);
  expect(report.status).toBe('passed');
});

test('absolute hrefs retain equivalent native URL normalization', async ({ browser }, testInfo) => {
  const source = '<a id="p" href="https://example.test:443/chapter.pdf">Read the chapter</a>';
  const report = await compare(browser, testInfo, source, source.replace(':443', ''), ['href']);
  expect(report.status).toBe('passed');
});

test('same relative spelling cannot conceal a changed authored base URL', async ({ browser }, testInfo) => {
  const source = '<base href="https://example.test/one/"><a id="p" href="chapter.pdf">Read the chapter</a>';
  const report = await compare(browser, testInfo, source, source.replace('/one/', '/two/'), ['href']);
  expect(report.status).toBe('review-required');
});

test('unrequested long text and accessible name do not invalidate role and exposure', async ({ browser }, testInfo) => {
  const source = '<main id="p" aria-label="' + 'Long name. '.repeat(900) + '"><p>' + 'Original reading. '.repeat(600) + '</p></main>';
  const report = await compare(browser, testInfo, source, source, ['role', 'exposed']);
  expect(report.status).toBe('passed');
  expect(report.coverage).toMatchObject({ requested: 1, inspected: 1, complete: true });
});

test('requested oversized text remains unavailable', async ({ browser }, testInfo) => {
  const source = '<main id="p">' + 'Original reading. '.repeat(600) + '</main>';
  const report = await compare(browser, testInfo, source, source, ['text']);
  expect(report.status).toBe('unavailable');
  expect(report.checks[0].source.reason).toBe('observation-too-large');
});

test('structured selected observations are bounded', async ({ browser }, testInfo) => {
  const source = '<select id="p" multiple>' + Array.from({ length: 250 }, (_, i) => '<option selected value="' + i + '">Choice ' + i + '</option>').join('') + '</select>';
  const report = await compare(browser, testInfo, source, source, ['selected']);
  expect(report.status).toBe('unavailable');
  expect(report.checks[0].source.reason).toBe('observation-too-large');
});

for (const attribute of ['hidden', 'aria-hidden="true"']) test('restoring a hidden word is allowed: ' + attribute, async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span ' + attribute + '>not </span>open.</p>';
  const report = await compare(browser, testInfo, source, source.replace('<span ' + attribute + '>', '<span>'), ['text', 'visible', 'exposed']);
  expect(report.status).toBe('passed');
});

test('revealing a different word cannot replace a required negation', async ({ browser }, testInfo) => {
  const source = '<p id="p">Do <span>not</span><span hidden>nothing</span> open.</p>';
  const candidate = source.replace('<span>not</span><span hidden>', '<span hidden>not</span><span>');
  const report = await compare(browser, testInfo, source, candidate, ['text', 'visible', 'exposed']);
  expect(report.status).toBe('review-required');
  expect(report.checks[0].properties.find((p: any) => p.property === 'visibleText').status).toBe('failed');
});
