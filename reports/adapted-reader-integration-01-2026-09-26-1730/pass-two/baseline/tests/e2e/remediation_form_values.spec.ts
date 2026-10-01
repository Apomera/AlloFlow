import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const cases = require('../fixtures/remediation_form_values.json');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);

async function observe(page: any, html: string) {
  await page.setContent(html);
  const form = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return null;
    let submissions = 0;
    form.addEventListener('submit', event => { event.preventDefault(); submissions++; });
    const valid = form.checkValidity();
    form.requestSubmit(form.querySelector('button')!);
    return { valid, submissions };
  });
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const sliders = nodes.filter((n: any) => !n.ignored && n.role?.value === 'slider')
      .map((n: any) => ({ name: n.name?.value, value: n.value?.value, valueText: n.properties?.find((p: any) => p.name === 'valuetext')?.value?.value }));
    return { form, sliders };
  } finally { await session.detach(); }
}

for (const entry of cases) test('native validation and value text: ' + entry.id, async ({ browser }, testInfo) => {
  // Local fixtures have no scripts. Script support is needed for the probe's
  // submit-event cancellation; all resource requests are blocked as well.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => route.abort());
  try {
    const page = await context.newPage();
    const result = await page.evaluate(async ({ program, source, candidate }) => {
      const h = new Function(program + '\nreturn harness;')()(() => candidate);
      return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source), evidence: h.evidence };
    }, { program, source: entry.source, candidate: entry.candidate });
    expect(result.decision.accepted).toBe(entry.expected === 'accept');
    expect(result.repaired).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
    const source = await observe(page, entry.source), candidate = await observe(page, entry.candidate), repaired = await observe(page, result.repaired);
    expect(repaired).toEqual(source);
    if (entry.expected === 'reject') {
      expect(result.decision.reason).toBe('form-state-changed');
      expect(candidate).not.toEqual(source);
      if (source.form) {
        expect(source.form).toEqual({ valid: false, submissions: 0 });
        expect(candidate.form).toEqual({ valid: false, submissions: 1 });
      } else {
        expect(source.sliders).toEqual([{ name: 'Temperature', value: 50, valueText: 'Warm' }]);
        expect(candidate.sliders).toEqual([{ name: 'Temperature', value: 50, valueText: 'Cold' }]);
      }
    }
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify({ ...result, source, candidate, repaired }, null, 2));
  } finally { await context.close(); }
});

const optionLabels = require('../fixtures/remediation_option_labels.json');
for (const entry of optionLabels) test('native option label preservation: ' + entry.id, async ({ page }, testInfo) => {
  await page.route('**/*', route => route.abort());
  const wrap = (body: string) => '<!doctype html><html lang="en"><body><main>' + body
    + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
  const source = wrap(entry.source), candidate = wrap(entry.candidate);
  const result = await page.evaluate(async ({ program, source, candidate }) => {
    const h = new Function(program + '\nreturn harness;')()(() => candidate);
    return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  }, { program, source, candidate });
  expect(result.decision.accepted).toBe(entry.accepted);
  expect(result.repaired).toBe(entry.accepted ? candidate : source);
  const session = await page.context().newCDPSession(page);
  const names = async (html: string) => {
    await page.setContent(html);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    return nodes.filter((n: any) => !n.ignored && n.role?.value === 'option')
      .map((n: any) => String(n.name?.value || '').normalize('NFC').replace(/\s+/g, ' ').trim());
  };
  try {
    const before = await names(source), proposed = await names(candidate), repaired = await names(result.repaired);
    expect(before.length).toBeGreaterThan(0);
    expect(repaired).toEqual(before);
    if (entry.accepted) expect(proposed).toEqual(before);
    else expect(proposed).not.toEqual(before);
    fs.writeFileSync(testInfo.outputPath('option-labels.json'), JSON.stringify({ before, proposed, repaired, decision: result.decision }, null, 2));
  } finally { await session.detach(); }
});

const submissionState = require('../fixtures/remediation_submission_state.json');
for (const entry of submissionState) test('native submission preservation: ' + entry.id, async ({ page, browserName }, testInfo) => {
  await page.route('**/*', route => route.abort());
  const result = await page.evaluate(async ({ program, source, candidate }) => {
    const h = new Function(program + '\nreturn harness;')()(() => candidate);
    return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  }, { program, source: entry.source, candidate: entry.candidate });
  expect(result.decision.accepted).toBe(entry.accepted);
  if (!entry.accepted) expect(result.decision.reason).toBe('form-state-changed');
  expect(result.repaired).toBe(entry.accepted ? entry.candidate : entry.source);
  const observe = async (html: string) => {
    await page.setContent(html);
    return page.evaluate(() => {
      const form = document.querySelector('form')!;
      const submitter = form.querySelector<HTMLInputElement | HTMLButtonElement>('input[type="submit"],button:not([type]),button[type="submit"]');
      return {
        payload: Array.from(new FormData(form, submitter).entries()),
        controls: Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')).map(el => ({
          value: el.value, dirname: el.dirName, direction: el.matches(':dir(rtl)') ? 'rtl' : 'ltr',
          wrap: el instanceof HTMLTextAreaElement ? el.wrap : null,
          cols: el instanceof HTMLTextAreaElement ? el.cols : null,
        })),
      };
    });
  };
  const source = await observe(entry.source), candidate = await observe(entry.candidate), repaired = await observe(result.repaired);
  expect(source.controls.map(el => el.value)).toEqual(candidate.controls.map(el => el.value));
  expect(repaired.payload).toEqual(source.payload);
  if (entry.accepted) expect(candidate.payload).toEqual(source.payload);
  else expect(candidate.payload).not.toEqual(source.payload);
  fs.writeFileSync(testInfo.outputPath('submission-state.json'), JSON.stringify({ browserName, decision: result.decision, source, candidate, repaired }, null, 2));
});

const submissionTargets = require('../fixtures/remediation_submission_targets.json');
for (const entry of submissionTargets) test('native submission destination: ' + entry.id, async ({ browser }, testInfo) => {
  // Observe native navigation requests, but abort every request before network.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => route.abort());
  try {
    const page = await context.newPage();
    const result = await page.evaluate(async ({ program, source, candidate }) => {
      const h = new Function(program + '\nreturn harness;')()(() => candidate);
      return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
    }, { program, source: entry.source, candidate: entry.candidate });
    expect(result.decision.accepted).toBe(entry.accepted);
    if (!entry.accepted) expect(result.decision.reason).toBe('form-state-changed');
    expect(result.repaired).toBe(entry.accepted ? entry.candidate : entry.source);
    const observe = async (html: string) => {
      const observationPage = await context.newPage();
      try {
        await observationPage.setContent(html);
        const requestPromise = observationPage.waitForRequest(request => request.url().startsWith('https://remediation.invalid/result'), { timeout: 10000 });
        await observationPage.evaluate(selector => {
          document.querySelector('form')!.requestSubmit(document.querySelector(selector) as HTMLButtonElement);
        }, entry.submitter);
        const request = await requestPromise;
        return { destination: request.frame() === observationPage.mainFrame() ? 'main' : request.frame().name(), url: request.url(), method: request.method() };
      } finally { await observationPage.close(); }
    };
    const source = await observe(entry.source), candidate = await observe(entry.candidate), repaired = await observe(result.repaired);
    expect(source.destination).toBe(entry.before);
    expect(candidate.destination).toBe(entry.after);
    expect(candidate.url).toBe(source.url);
    expect(repaired).toEqual(source);
    if (entry.accepted) expect(candidate).toEqual(source);
    else expect(candidate).not.toEqual(source);
    fs.writeFileSync(testInfo.outputPath('submission-targets.json'), JSON.stringify({ decision: result.decision, source, candidate, repaired }, null, 2));
  } finally { await context.close(); }
});
