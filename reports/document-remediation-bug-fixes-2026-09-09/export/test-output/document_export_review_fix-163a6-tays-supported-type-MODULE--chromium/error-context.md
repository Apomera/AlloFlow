# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_export_review_fixes.spec.ts >> native inert script data stays supported: type="MODULE"
- Location: tests\e2e\document_export_review_fixes.spec.ts:98:7

# Error details

```
Error: expect(received).toBeUndefined()

Received: true
```

# Test source

```ts
  8   | const status = (report: any, id: string) => report.checks.find((check: any) => check.id === id)?.status;
  9   | const allPassed = (report: any) => report.checks.every((check: any) => check.status === 'passed');
  10  | const inspect = (browser: any, body: string, expected: any = base, head = '') => inspectHtml(browser, 'unused.html', expected, Buffer.from(html(body, head)));
  11  | 
  12  | test('native exposed tables and headers remain accepted', async ({ browser }, testInfo) => {
  13  |   const report = await inspect(browser, table(), tableContract());
  14  |   expect(allPassed(report)).toBe(true);
  15  |   expect(report.checks.find((check: any) => check.id === 'html.table-1').observed.exposure).toEqual({ table: true, columnHeaders: [true, true], rowHeaders: [true] });
  16  |   fs.writeFileSync(testInfo.outputPath('table-control.json'), JSON.stringify(report, null, 2));
  17  | });
  18  | 
  19  | for (const [name, body] of [
  20  |   ['presentational table', table('role="presentation"')],
  21  |   ['ARIA-hidden table', table('aria-hidden="true"')],
  22  |   ['ARIA-hidden ancestor', '<div aria-hidden="true">' + table() + '</div>'],
  23  |   ['downgraded column header', table('', 'Caf\u00e9', 'role="cell"')],
  24  |   ['ARIA-hidden column header', table('', 'Caf\u00e9', 'aria-hidden="true"')],
  25  |   ['ARIA-hidden row header', table('', 'Caf\u00e9', '', 'aria-hidden="true"')],
  26  |   ['unrelated exposed header', table('', 'Caf\u00e9', 'role="cell"') + '<div role="columnheader">Area</div>'],
  27  | ]) {
  28  |   test(name + ' fails the selected table exposure contract', async ({ browser }, testInfo) => {
  29  |     const report = await inspect(browser, body, tableContract());
  30  |     expect(status(report, 'html.table-1')).toBe('failed');
  31  |     expect(report.coverage.complete).toBe(true);
  32  |     fs.writeFileSync(testInfo.outputPath('table-exposure.json'), JSON.stringify(report, null, 2));
  33  |   });
  34  | }
  35  | 
  36  | for (const [actual, expected] of [['Cafe\u0301', 'Cafe\u0301'], ['Cafe\u0301', 'Caf\u00e9'], ['Caf\u00e9', 'Cafe\u0301']]) {
  37  |   test('HTML table canonical equivalents pass ' + actual.length + '-' + expected.length, async ({ browser }) => {
  38  |     const report = await inspect(browser, table('', actual), tableContract(expected));
  39  |     expect(allPassed(report)).toBe(true);
  40  |   });
  41  | }
  42  | 
  43  | test('HTML table normalization retains accents and superscript meaning', async ({ browser }) => {
  44  |   for (const [actual, expected] of [['Cafe', 'Caf\u00e9'], ['x2', 'x²']]) {
  45  |     const report = await inspect(browser, table('', actual), tableContract(expected));
  46  |     expect(status(report, 'html.table-1')).toBe('failed');
  47  |   }
  48  | });
  49  | 
  50  | test('tagged PDF table contracts normalize both sides without compatibility folding', async ({ browser }, testInfo) => {
  51  |   const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  52  |   try {
  53  |     await context.route('**/*', (route: any) => route.abort());
  54  |     const page = await context.newPage();
  55  |     await page.setContent(html(table()));
  56  |     const file = testInfo.outputPath('canonical-table.pdf');
  57  |     await page.pdf({ path: file, tagged: true });
  58  |     const report = await inspectPdf(file, tableContract('Cafe\u0301'));
  59  |     expect(allPassed(report)).toBe(true);
  60  |     fs.writeFileSync(testInfo.outputPath('pdf-canonical-table.json'), JSON.stringify(report, null, 2));
  61  |     for (const changed of ['Cafe', 'x2']) {
  62  |       const expected = tableContract('Cafe\u0301');
  63  |       expected.tables[0].rows[0][changed === 'Cafe' ? 0 : 1] = changed;
  64  |       const altered = await inspectPdf(file, expected);
  65  |       expect(status(altered, 'pdf.table-1')).toBe('failed');
  66  |     }
  67  |   } finally { await context.close(); }
  68  | });
  69  | 
  70  | for (const [name, body, head, active] of [
  71  |   ['relative background', '<div style="height:40px;background-image:url(required-chart.png)"></div>', '', true],
  72  |   ['hidden background', '<div style="display:none;background-image:url(required-chart.png)"></div>', '', false],
  73  |   ['inactive media rule', '<p>Read this.</p>', '<style>@media (min-width:9000px) { p { background:url(required-chart.png); } }</style>', false],
  74  |   ['relative import', '<p>Read this.</p>', '<style>@import "required-chart.css";</style>', true],
  75  |   ['unused font', '<p>Read this.</p>', '<style>@font-face { font-family:Unused; src:url(required.woff2); }</style>', false],
  76  |   ['pseudo-element image', '<p>Read this.</p>', '<style>p::before { content:url(required-chart.png); }</style>', true],
  77  |   ['hidden image-set strings', '<div style="display:none;background-image:image-set(\'required-chart.png\' 1x, \'other-chart.png\' 2x)"></div>', '', false],
  78  | ]) {
  79  |   test(name + ' remains an unresolved CSS dependency', async ({ browser }, testInfo) => {
  80  |     const report = await inspect(browser, body as string, base, head as string);
  81  |     expect(report.coverage.complete).toBe(false);
  82  |     expect(report.coverage.reasons).toContain('unresolved-resource-references');
  83  |     expect(report.resources.unresolved).toBeGreaterThan(0);
  84  |     if (active) expect(report.resources.blocked).toBeGreaterThan(0);
  85  |     fs.writeFileSync(testInfo.outputPath('css-dependency.json'), JSON.stringify(report, null, 2));
  86  |   });
  87  | }
  88  | 
  89  | test('embedded CSS images, local filters, and URL comments remain self-contained', async ({ browser }) => {
  90  |   const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfZkAAAAASUVORK5CYII=';
  91  |   const report = await inspect(browser, '<p>Read this.</p><svg><filter id="local"><feGaussianBlur stdDeviation="0"/></filter></svg>', base,
  92  |     '<style>/* url(required.png) */ p { background-image:url("' + pixel + '"); filter:url(#local); }</style>');
  93  |   expect(allPassed(report)).toBe(true);
  94  |   expect(report.resources).toMatchObject({ blocked: 0, unresolved: 0 });
  95  | });
  96  | 
  97  | for (const attributes of ['type="application/xml"', 'type="text/xml"', 'type="application/example+xml"', 'type="text/template"', 'type="text/javascript; charset=utf-8"', 'type="MODULE"', 'language="unrecognized"']) {
  98  |   test('native inert script data stays supported: ' + attributes, async ({ browser }) => {
  99  |     const markup = html('<p>Read this.</p><script ' + attributes + '>window.__dataExecuted = true;</script>');
  100 |     const report = await inspectHtml(browser, 'unused.html', base, Buffer.from(markup));
  101 |     expect(allPassed(report)).toBe(true);
  102 |     expect(report.resources.scripts).toBe(0);
  103 |     const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: 'block' });
  104 |     try {
  105 |       await context.route('**/*', (route: any) => route.abort());
  106 |       const page = await context.newPage();
  107 |       await page.setContent(markup);
> 108 |       expect(await page.evaluate(() => (window as any).__dataExecuted)).toBeUndefined();
      |                                                                         ^ Error: expect(received).toBeUndefined()
  109 |     } finally { await context.close(); }
  110 |   });
  111 | }
  112 | 
  113 | for (const attributes of ['', 'type=""', 'type="text/javascript"', 'type="application/ecmascript"', 'language="javascript"', 'type="module"', 'type="importmap"', 'type="speculationrules"']) {
  114 |   test('executable or document behavior script remains unavailable: ' + (attributes || 'default'), async ({ browser }) => {
  115 |     const report = await inspect(browser, '<p>Read this.</p><script ' + attributes + '>{}</script>');
  116 |     expect(report.coverage.reasons).toContain('script-dependent-content');
  117 |     expect(report.resources.scripts).toBe(1);
  118 |   });
  119 | }
  120 | 
```