# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_form_context.spec.ts >> native form preservation: fieldset-preserving-wrapper-control
- Location: tests\e2e\remediation_form_context.spec.ts:31:32

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "{\"names\":[{\"name\":\"Name\",\"description\":\"\",\"groups\":[\"Student details\"]},{\"name\":\"Name\",\"description\":\"\",\"groups\":[\"Teacher details\"]}],\"typed\":null}"
Received: "{\"names\":[{\"name\":\"Name\",\"description\":\"\",\"groups\":[\"Teacher details\"]},{\"name\":\"Name\",\"description\":\"\",\"groups\":[\"Student details\"]}],\"typed\":null}"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'node:fs';
  3  | import * as path from 'node:path';
  4  | const cases = require('../fixtures/remediation_form_context.json');
  5  | const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
  6  | const harnessProgram = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC ='))
  7  |   + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);
  8  | 
  9  | async function observe(page: any, html: string) {
  10 |   await page.setContent(html);
  11 |   const session = await page.context().newCDPSession(page);
  12 |   try {
  13 |     const { nodes } = await session.send('Accessibility.getFullAXTree');
  14 |     const index = new Map(nodes.map((node: any) => [node.nodeId, node]));
  15 |     const names = nodes.filter((node: any) => !node.ignored && node.role?.value === 'textbox').map((node: any) => {
  16 |       const groups = [];
  17 |       for (let ancestor: any = index.get(node.parentId); ancestor; ancestor = index.get(ancestor.parentId)) {
  18 |         if (!ancestor.ignored && ancestor.role?.value === 'group' && ancestor.name?.value) groups.unshift(ancestor.name.value);
  19 |       }
  20 |       return { name: node.name?.value || '', description: node.description?.value || '', groups };
  21 |     });
  22 |     let typed = null;
  23 |     if (await page.locator('textarea').count()) {
  24 |       await page.locator('textarea').pressSequentially('Blueberries grow well.');
  25 |       typed = await page.locator('textarea').inputValue();
  26 |     }
  27 |     return { names, typed };
  28 |   } finally { await session.detach(); }
  29 | }
  30 | 
  31 | for (const entry of cases) test('native form preservation: ' + entry.id, async ({ browser }, testInfo) => {
  32 |   const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  33 |   await context.route('**/*', route => route.abort());
  34 |   try {
  35 |     const page = await context.newPage();
  36 |     const result = await page.evaluate(async ({ program, source, candidate }) => {
  37 |       const make = new Function(program + '\nreturn harness;')();
  38 |       const h = make(() => candidate);
  39 |       const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
  40 |       const repaired = await h.run(source);
  41 |       return { decision, repaired, evidence: h.evidence };
  42 |     }, { program: harnessProgram, source: entry.source, candidate: entry.candidate });
  43 |     expect(result.decision.accepted).toBe(entry.expected === 'accept');
  44 |     expect(result.repaired).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
  45 |     if (entry.expected === 'reject') expect(result.decision.reason).toBe('form-state-changed');
  46 |     const source = await observe(page, entry.source);
  47 |     const candidate = await observe(page, entry.candidate);
  48 |     const repaired = await observe(page, result.repaired);
> 49 |     expect(JSON.stringify(repaired).normalize('NFC')).toBe(JSON.stringify(source).normalize('NFC'));
     |                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  50 |     if (entry.expected === 'reject') expect(candidate).not.toEqual(source);
  51 |     if (entry.id === 'maxlength-truncates-response') {
  52 |       expect(source.typed).toBe('Blueberries grow well.');
  53 |       expect(candidate.typed).toBe('Blueb');
  54 |     }
  55 |     fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify({ ...result, source, candidate, repaired }, null, 2));
  56 |   } finally { await context.close(); }
  57 | });
  58 | 
  59 | test('minimum lengths retain native user-input validity', async ({ page }) => {
  60 |   const source = '<label>Response<input minlength="2"></label>';
  61 |   const candidate = source.replace('minlength="2"', 'minlength="5"');
  62 |   await page.setContent(source);
  63 |   await page.locator('input').pressSequentially('abc');
  64 |   expect(await page.locator('input').evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(false);
  65 |   await page.setContent(candidate);
  66 |   await page.locator('input').pressSequentially('abc');
  67 |   expect(await page.locator('input').evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  68 |   const decision = await page.evaluate(({ program, source, candidate }) => {
  69 |     const h = new Function(program + '\nreturn harness;')()(() => candidate);
  70 |     return h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
  71 |   }, { program: harnessProgram, source, candidate });
  72 |   expect(decision).toMatchObject({ accepted: false, reason: 'form-state-changed' });
  73 | });
  74 | 
```