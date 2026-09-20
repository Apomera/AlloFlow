# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_form_values.spec.ts >> native submission preservation: input-dirname-empty-equivalent-missing
- Location: tests\e2e\remediation_form_values.spec.ts:89:42

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 4
+ Received  + 0

  Array [
    Array [
      "answer",
      "مرحبا",
    ],
-   Array [
-     "",
-     "rtl",
-   ],
  ]
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e4]:
    - text: Student response
    - textbox "Student response" [ref=e5]: مرحبا
  - paragraph [ref=e6]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e7]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e8]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e9]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e10]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e11]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e12]: Read the original instructions carefully and record observations in your notebook.
  - paragraph [ref=e13]: Read the original instructions carefully and record observations in your notebook.
```

# Test source

```ts
  15  |     form.addEventListener('submit', event => { event.preventDefault(); submissions++; });
  16  |     const valid = form.checkValidity();
  17  |     form.requestSubmit(form.querySelector('button')!);
  18  |     return { valid, submissions };
  19  |   });
  20  |   const session = await page.context().newCDPSession(page);
  21  |   try {
  22  |     const { nodes } = await session.send('Accessibility.getFullAXTree');
  23  |     const sliders = nodes.filter((n: any) => !n.ignored && n.role?.value === 'slider')
  24  |       .map((n: any) => ({ name: n.name?.value, value: n.value?.value, valueText: n.properties?.find((p: any) => p.name === 'valuetext')?.value?.value }));
  25  |     return { form, sliders };
  26  |   } finally { await session.detach(); }
  27  | }
  28  | 
  29  | for (const entry of cases) test('native validation and value text: ' + entry.id, async ({ browser }, testInfo) => {
  30  |   // Local fixtures have no scripts. Script support is needed for the probe's
  31  |   // submit-event cancellation; all resource requests are blocked as well.
  32  |   const context = await browser.newContext({ serviceWorkers: 'block' });
  33  |   await context.route('**/*', route => route.abort());
  34  |   try {
  35  |     const page = await context.newPage();
  36  |     const result = await page.evaluate(async ({ program, source, candidate }) => {
  37  |       const h = new Function(program + '\nreturn harness;')()(() => candidate);
  38  |       return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source), evidence: h.evidence };
  39  |     }, { program, source: entry.source, candidate: entry.candidate });
  40  |     expect(result.decision.accepted).toBe(entry.expected === 'accept');
  41  |     expect(result.repaired).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
  42  |     const source = await observe(page, entry.source), candidate = await observe(page, entry.candidate), repaired = await observe(page, result.repaired);
  43  |     expect(repaired).toEqual(source);
  44  |     if (entry.expected === 'reject') {
  45  |       expect(result.decision.reason).toBe('form-state-changed');
  46  |       expect(candidate).not.toEqual(source);
  47  |       if (source.form) {
  48  |         expect(source.form).toEqual({ valid: false, submissions: 0 });
  49  |         expect(candidate.form).toEqual({ valid: false, submissions: 1 });
  50  |       } else {
  51  |         expect(source.sliders).toEqual([{ name: 'Temperature', value: 50, valueText: 'Warm' }]);
  52  |         expect(candidate.sliders).toEqual([{ name: 'Temperature', value: 50, valueText: 'Cold' }]);
  53  |       }
  54  |     }
  55  |     fs.writeFileSync(testInfo.outputPath('observations.json'), JSON.stringify({ ...result, source, candidate, repaired }, null, 2));
  56  |   } finally { await context.close(); }
  57  | });
  58  | 
  59  | const optionLabels = require('../fixtures/remediation_option_labels.json');
  60  | for (const entry of optionLabels) test('native option label preservation: ' + entry.id, async ({ page }, testInfo) => {
  61  |   await page.route('**/*', route => route.abort());
  62  |   const wrap = (body: string) => '<!doctype html><html lang="en"><body><main>' + body
  63  |     + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
  64  |   const source = wrap(entry.source), candidate = wrap(entry.candidate);
  65  |   const result = await page.evaluate(async ({ program, source, candidate }) => {
  66  |     const h = new Function(program + '\nreturn harness;')()(() => candidate);
  67  |     return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  68  |   }, { program, source, candidate });
  69  |   expect(result.decision.accepted).toBe(entry.accepted);
  70  |   expect(result.repaired).toBe(entry.accepted ? candidate : source);
  71  |   const session = await page.context().newCDPSession(page);
  72  |   const names = async (html: string) => {
  73  |     await page.setContent(html);
  74  |     const { nodes } = await session.send('Accessibility.getFullAXTree');
  75  |     return nodes.filter((n: any) => !n.ignored && n.role?.value === 'option')
  76  |       .map((n: any) => String(n.name?.value || '').normalize('NFC').replace(/\s+/g, ' ').trim());
  77  |   };
  78  |   try {
  79  |     const before = await names(source), proposed = await names(candidate), repaired = await names(result.repaired);
  80  |     expect(before.length).toBeGreaterThan(0);
  81  |     expect(repaired).toEqual(before);
  82  |     if (entry.accepted) expect(proposed).toEqual(before);
  83  |     else expect(proposed).not.toEqual(before);
  84  |     fs.writeFileSync(testInfo.outputPath('option-labels.json'), JSON.stringify({ before, proposed, repaired, decision: result.decision }, null, 2));
  85  |   } finally { await session.detach(); }
  86  | });
  87  | 
  88  | const submissionState = require('../fixtures/remediation_submission_state.json');
  89  | for (const entry of submissionState) test('native submission preservation: ' + entry.id, async ({ page, browserName }, testInfo) => {
  90  |   await page.route('**/*', route => route.abort());
  91  |   const result = await page.evaluate(async ({ program, source, candidate }) => {
  92  |     const h = new Function(program + '\nreturn harness;')()(() => candidate);
  93  |     return { decision: h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' }), repaired: await h.run(source) };
  94  |   }, { program, source: entry.source, candidate: entry.candidate });
  95  |   expect(result.decision.accepted).toBe(entry.accepted);
  96  |   if (!entry.accepted) expect(result.decision.reason).toBe('form-state-changed');
  97  |   expect(result.repaired).toBe(entry.accepted ? entry.candidate : entry.source);
  98  |   const observe = async (html: string) => {
  99  |     await page.setContent(html);
  100 |     return page.evaluate(() => {
  101 |       const form = document.querySelector('form')!;
  102 |       const submitter = form.querySelector<HTMLInputElement | HTMLButtonElement>('input[type="submit"],button:not([type]),button[type="submit"]');
  103 |       return {
  104 |         payload: Array.from(new FormData(form, submitter).entries()),
  105 |         controls: Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')).map(el => ({
  106 |           value: el.value, dirname: el.dirName, direction: el.matches(':dir(rtl)') ? 'rtl' : 'ltr',
  107 |           wrap: el instanceof HTMLTextAreaElement ? el.wrap : null,
  108 |           cols: el instanceof HTMLTextAreaElement ? el.cols : null,
  109 |         })),
  110 |       };
  111 |     });
  112 |   };
  113 |   const source = await observe(entry.source), candidate = await observe(entry.candidate), repaired = await observe(result.repaired);
  114 |   expect(source.controls.map(el => el.value)).toEqual(candidate.controls.map(el => el.value));
> 115 |   expect(repaired.payload).toEqual(source.payload);
      |                            ^ Error: expect(received).toEqual(expected) // deep equality
  116 |   if (entry.accepted) expect(candidate.payload).toEqual(source.payload);
  117 |   else expect(candidate.payload).not.toEqual(source.payload);
  118 |   fs.writeFileSync(testInfo.outputPath('submission-state.json'), JSON.stringify({ browserName, decision: result.decision, source, candidate, repaired }, null, 2));
  119 | });
  120 | 
```