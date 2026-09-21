import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const cases = require('../fixtures/remediation_form_native_contract.json');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);

async function observe(context: any, html: string, mode: string) {
  const page = await context.newPage();
  try {
    await page.setContent(html);
    if (mode === 'encoding') {
      const promised = page.waitForRequest('https://remediation.invalid/result');
      await page.evaluate(() => HTMLFormElement.prototype.requestSubmit.call(document.querySelector('form')));
      const request = await promised;
      return { method: request.method(), body: request.postData() };
    }
    return await page.evaluate(mode => {
      const form = document.querySelector('form')!;
      if (mode === 'dialog') {
        HTMLFormElement.prototype.requestSubmit.call(form);
        return { open: document.querySelector('dialog')!.open };
      }
      let submissions = 0;
      form.addEventListener('submit', event => { event.preventDefault(); submissions++; });
      HTMLFormElement.prototype.requestSubmit.call(form);
      return {
        submissions,
        valid: HTMLFormElement.prototype.checkValidity.call(form),
        payload: Array.from(new FormData(form).entries()),
      };
    }, mode);
  } finally { await page.close(); }
}

for (const entry of cases) test('native form contract: ' + entry.id, async ({ browser }, testInfo) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // Real navigation serialization is observed, but requests never leave Chromium.
  await context.route('**/*', route => route.abort());
  try {
    const page = await context.newPage();
    const result = await page.evaluate(async ({ program, source, candidate }) => {
      const h = new Function(program + '\nreturn harness;')()(() => candidate);
      return {
        decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }),
        repaired: await h.run(source), evidence: h.evidence,
      };
    }, { program, source: entry.source, candidate: entry.candidate });
    expect(result.decision.accepted).toBe(entry.expected === 'accept');
    expect(result.repaired).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
    if (entry.expected === 'reject') expect(result.decision.reason).toBe('form-state-changed');
    const source = await observe(context, entry.source, entry.mode);
    const candidate = await observe(context, entry.candidate, entry.mode);
    const repaired = await observe(context, result.repaired, entry.mode);
    expect(repaired).toEqual(source);
    if (entry.expected === 'reject') expect(candidate).not.toEqual(source);
    if (entry.mode === 'validation') {
      expect(source).toMatchObject({ valid: false, submissions: 0 });
      expect(candidate).toMatchObject({ valid: false, submissions: entry.expected === 'reject' ? 1 : 0 });
    }
    if (entry.id === 'charset-changed') {
      expect(source).toEqual({ method: 'POST', body: 'answer=caf%C3%A9' });
      expect(candidate).toEqual({ method: 'POST', body: 'answer=caf%E9' });
    }
    fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify({ ...result, source, candidate, repaired }, null, 2));
  } finally { await context.close(); }
});
