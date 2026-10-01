import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
const { runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');

test.setTimeout(60000);
const checkpoints = [{ id: 'response-payload', sourceSelector: '#response', properties: ['formData'] }];
const wrap = (body: string) => '<!doctype html><html lang="en"><head><title>Response</title></head><body><main><h1>Response</h1>' + body + '</main></body></html>';
const textarea = '<form id="response"><label>Response<textarea name="answer" wrap="hard" cols="10" style="width:100px;font:16px monospace">abcdefghijklmnopqrstuvwxyz</textarea></label></form>';
const compare = (browser: any, source: string, candidate: string, options = {}) => compareRenderedHtml(browser, wrap(source), wrap(candidate), { checkpoints, ...options });

for (const [name, before, after] of [
  ['width', 'width:100px', 'width:200px'],
  ['font', 'font:16px', 'font:12px'],
]) test('native payload detects hard-wrap ' + name + ' changes despite unchanged DOM value', async ({ browser }, testInfo) => {
  const candidate = textarea.replace(before, after);
  const report = await compare(browser, textarea, candidate, { checkpoints: [...checkpoints, { id: 'dom-value', sourceSelector: 'textarea', properties: ['value'] }] });
  fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  expect(report.status).toBe('review-required');
  expect(report.coverage.complete).toBe(true);
  expect(report.checks[1].status).toBe('passed');
  const payload = report.checks[0].properties[0];
  expect(payload.status).toBe('failed');
  expect(payload.source).toEqual([['answer', 'abcdefghijk\nlmnopqrstuv\nwxyz']]);
  expect(payload.candidate).toEqual([['answer', name === 'width' ? 'abcdefghijklmnopqrstuv\nwxyz' : 'abcdefghijklmno\npqrstuvwxyz']]);
});

test('legacy physical wrap uses the native submission value', async ({ browser }) => {
  const source = textarea.replace('wrap="hard"', 'wrap="physical"');
  const report = await compare(browser, source, source.replace('width:100px', 'width:200px'));
  expect(report.status).toBe('review-required');
});

for (const [name, source, candidate] of [
  ['color repair', textarea, textarea.replace('style="', 'style="color:navy;')],
  ['soft-wrap width repair', textarea.replace('wrap="hard"', 'wrap="soft"'), textarea.replace('wrap="hard"', 'wrap="soft"').replace('width:100px', 'width:200px')],
  ['width repair with unchanged hard-wrap payload', textarea.replace('abcdefghijklmnopqrstuvwxyz', 'abc'), textarea.replace('abcdefghijklmnopqrstuvwxyz', 'abc').replace('width:100px', 'width:200px')],
  ['equivalent CSS width', textarea, textarea.replace('width:100px', 'width:calc(50px + 50px)')],
]) test('native payload allows ' + name, async ({ browser }) => {
  const report = await compare(browser, source, candidate);
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties[0].source).toEqual(report.checks[0].properties[0].candidate);
});

test('serialization retains order, duplicate names, dirname and external ownership', async ({ browser }) => {
  const source = '<input form="response" name="answer" value="before"><form id="response">' +
    '<fieldset disabled><legend><input name="legend" value="included"></legend><input name="omitted" value="disabled"></fieldset>' +
    '<textarea name="answer" dirname="answer.dir" dir="rtl">reply</textarea>' +
    '<input type="checkbox" name="choice" value="unchecked"><input type="checkbox" name="choice" value="checked" checked>' +
    '<input name="answer" value="after"><button name="submitter" value="not-selected">Submit</button></form>';
  const report = await compare(browser, source, source.replace('<form ', '<form class="repair" '));
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties[0].source).toEqual([
    ['answer', 'before'], ['legend', 'included'], ['answer', 'reply'], ['answer.dir', 'rtl'], ['choice', 'checked'], ['answer', 'after'],
  ]);
});

test('duplicate-name ordering changes cannot collapse to a map', async ({ browser }) => {
  const source = '<form id="response"><input name="answer" value="one"><input name="answer" value="two"></form>';
  const candidate = source.replace('value="one"', 'value="two"').replace('value="two"></form>', 'value="one"></form>');
  const report = await compare(browser, source, candidate);
  expect(report.status).toBe('review-required');
  expect(report.checks[0].properties[0]).toMatchObject({ source: [['answer', 'one'], ['answer', 'two']], candidate: [['answer', 'two'], ['answer', 'one']] });
});

test('disabled and unchosen submitter values do not enter the payload contract', async ({ browser }) => {
  const source = '<form id="response"><input name="unused" disabled value="before"><button name="send" value="before">Send</button></form>';
  const report = await compare(browser, source, source.replaceAll('value="before"', 'value="after"'));
  expect(report.status).toBe('passed');
  expect(report.checks[0].properties[0].source).toEqual([]);
});

for (const [name, source] of [
  ['non-form checkpoint', '<div id="response">Response</div>'],
  ['file payload', '<form id="response"><input type="file" name="upload" aria-label="Upload"></form>'],
]) test(name + ' reports unavailable instead of claiming equivalent payloads', async ({ browser }) => {
  const report = await compare(browser, source, source);
  expect(report.status).toBe('unavailable');
  expect(report.coverage.complete).toBe(false);
  expect(report.checks[0].properties[0].status).toBe('unavailable');
});

test('large structured payload observations remain bounded', async ({ browser }) => {
  const source = '<form id="response"><textarea name="answer" aria-label="Answer">' + 'a'.repeat(8200) + '</textarea></form>';
  const report = await compare(browser, source, source);
  expect(report.status).toBe('unavailable');
  expect(report.checks[0].source.reason).toBe('observation-too-large');
});

test('responsive hard wrapping is compared independently in every requested profile', async ({ browser }) => {
  const source = '<style>textarea{width:100px;font:16px monospace}</style>' + textarea.replace(' style="width:100px;font:16px monospace"', '');
  const candidate = source.replace('</style>', '@media(max-width:600px){textarea{width:200px}}</style>');
  const report = await compare(browser, source, candidate, { profiles: [
    { id: 'wide', viewport: { width: 1100, height: 800 } }, { id: 'narrow', viewport: { width: 390, height: 800 } },
  ] });
  expect(report.status).toBe('review-required');
  expect(report.profiles.map((profile: any) => [profile.id, profile.status])).toEqual([['wide', 'passed'], ['narrow', 'review-required']]);
});

test('unavailable styles cannot establish a verified form payload', async ({ browser }) => {
  const source = '<link rel="stylesheet" href="https://unavailable.invalid/form.css">' + textarea;
  const report = await compare(browser, source, source);
  expect(report.status).toBe('unavailable');
  expect(report.coverage.complete).toBe(false);
  expect(report.coverage.reasons).toContain('unresolved-resources');
});

test('post-export acceptance requires review for a changed native form payload', async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html');
  fs.writeFileSync(source, wrap(textarea));
  fs.writeFileSync(candidate, wrap(textarea.replace('width:100px', 'width:200px')));
  const manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'response', documentKind: 'reading', kind: 'html', path: candidate,
    expected: { title: 'Response', language: 'en', headings: [{ level: 1, name: 'Response' }], tables: [] },
    sourceFidelity: { sourcePath: source, checkpoints },
  }] }));
  const report = await runAcceptance(manifest, { browser });
  fs.writeFileSync(testInfo.outputPath('export-acceptance.json'), JSON.stringify(report, null, 2));
  expect(report.automatedStatus).toBe('failed');
  expect(report.artifacts[0].renderedFidelity.status).toBe('review-required');
  expect(report.artifacts[0].renderedFidelity.candidate.sha256).toBe(report.artifacts[0].sha256);
  expect(report.humanAcceptance.status).toBe('not-run');
});
