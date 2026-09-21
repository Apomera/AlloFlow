# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rendered_native_dom_regressions.spec.ts >> export retains native evidence: clobbered text preserved
- Location: tests\e2e\rendered_native_dom_regressions.spec.ts:125:37

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "passed"
Received: "failed"
```

# Test source

```ts
  34  |     expect(report.checks[0].properties[0].source[0][1]).toBe('original');
  35  |   });
  36  | }
  37  | 
  38  | for (const name of ['getAttribute', 'getAttributeNS', 'parentElement', 'matches']) test('language uses native DOM with form control ' + name, async ({ browser }) => {
  39  |   const source = form(name);
  40  |   const preserved = await compare(browser, source, source.replace('<form ', '<form class="reading" '), ['language']);
  41  |   expect(preserved.status).toBe('passed'); expect(preserved.checks[0].properties[0].source).toBe('en');
  42  |   const changed = await compare(browser, source, source.replace('<html lang="en">', '<html lang="fr">'), ['language']);
  43  |   expect(changed.status).toBe('review-required');
  44  | });
  45  | 
  46  | test('metadata language matching cannot be shadowed on forms', async ({ browser }) => {
  47  |   const source = form('matches').replace('<html lang="en">', '<html>').replace('</head>', '<meta http-equiv="content-language" content="fr"></head>');
  48  |   expect((await compare(browser, source, source, ['language'])).status).toBe('passed');
  49  |   expect((await compare(browser, source, source.replace('content="fr"', 'content="de"'), ['language'])).status).toBe('review-required');
  50  | });
  51  | 
  52  | for (const name of ['querySelectorAll', 'checkVisibility', 'childNodes', 'parentNode']) test('display contents and text traversal use native DOM with ' + name, async ({ browser }) => {
  53  |   const source = form(name, 'style="display:contents"');
  54  |   expect((await compare(browser, source, source, ['text', 'visible', 'exposed'])).status).toBe('passed');
  55  |   const candidate = source.replace('<p>', '<p style="display:none">');
  56  |   expect((await compare(browser, source, candidate, ['text', 'visible', 'exposed'])).status).toBe('review-required');
  57  | });
  58  | 
  59  | for (const property of ['value', 'checked']) test('named form control cannot manufacture an applicable ' + property + ' checkpoint', async ({ browser }) => {
  60  |   const report = await compare(browser, form(property), form(property), [property]);
  61  |   expect(report.status).toBe('unavailable'); expect(report.checks[0].properties[0].source).toBe(null);
  62  | });
  63  | 
  64  | for (const name of ['attributes', 'style']) test('named ' + name + ' cannot hide script or CSS dependencies', async ({ browser }) => {
  65  |   const source = form(name);
  66  |   expect((await compare(browser, source, source, ['text'])).status).toBe('passed');
  67  |   const scripted = source.replace('<form ', '<form onsubmit="return false" ');
  68  |   const scriptReport = await compare(browser, scripted, scripted, ['text']);
  69  |   expect(scriptReport.status).toBe('unavailable'); expect(scriptReport.resources.source.scripts).toBe(1);
  70  |   const dependent = source.replace('<form ', '<form style="display:none;background-image:url(https://unavailable.invalid/asset.png)" ');
  71  |   const resourceReport = await compare(browser, dependent, dependent, ['text']);
  72  |   expect(resourceReport.status).toBe('unavailable'); expect(resourceReport.resources.source.unresolved).toBe(1);
  73  | });
  74  | 
  75  | const svgLink = (attributes: string, text = 'Required explanation', id = 'destination', head = '') => documentHtml('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a id="p" ' + attributes + '><text x="10" y="25">Read</text></a></svg><p id="' + id + '">' + text + '</p>', head);
  76  | const targetCases = [
  77  |   { id: 'SVG same target preserved', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination" class="reading"'), expected: 'passed' },
  78  |   { id: 'SVG target text changes', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination"', 'Changed explanation'), expected: 'review-required' },
  79  |   { id: 'SVG xlink target text changes', source: svgLink('xlink:href="#destination"'), candidate: svgLink('xlink:href="#destination"', 'Changed explanation'), expected: 'review-required' },
  80  |   { id: 'SVG xlink migration preserves target', source: svgLink('xlink:href="#destination"'), candidate: svgLink('href="#destination"'), expected: 'passed' },
  81  |   { id: 'SVG encoded fragment text changes', source: svgLink('href="#caf%C3%A9"', 'Required explanation', 'café'), candidate: svgLink('href="#caf%C3%A9"', 'Changed explanation', 'café'), expected: 'review-required' },
  82  |   { id: 'SVG href ignores external xlink fallback', source: svgLink('href="#destination" xlink:href="https://other.invalid/#destination"'), candidate: svgLink('href="#destination"'), expected: 'passed' },
  83  |   { id: 'SVG external URL cannot borrow local target', source: svgLink('href="#destination"'), candidate: svgLink('href="https://other.invalid/#destination"'), expected: 'unavailable' },
  84  |   { id: 'SVG external base cannot borrow local target', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination"', 'Required explanation', 'destination', '<base href="https://other.invalid/">'), expected: 'unavailable' },
  85  |   { id: 'SVG empty href overrides fragment fallback', source: svgLink('xlink:href="#destination"'), candidate: svgLink('href="" xlink:href="#destination"'), expected: 'unavailable' },
  86  |   { id: 'SVG absent target stays unavailable', source: svgLink('href="#missing"'), candidate: svgLink('href="#missing"'), expected: 'unavailable' },
  87  |   { id: 'SVG malformed fragment stays unavailable', source: svgLink('href="#%FF"'), candidate: svgLink('href="#%FF"'), expected: 'unavailable' },
  88  | ];
  89  | for (const item of targetCases) test('native targetText: ' + item.id, async ({ browser }, testInfo) => {
  90  |   const report = await compare(browser, item.source, item.candidate, ['targetText']);
  91  |   fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  92  |   expect(report.status).toBe(item.expected);
  93  |   if (item.expected !== 'unavailable') expect(report.checks[0].properties[0].source).toBe('Required explanation');
  94  | });
  95  | 
  96  | test('SVG target evidence matches native fragment navigation', async ({ browser }) => {
  97  |   const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  98  |   const entry = 'https://rendered-fidelity.invalid/document';
  99  |   let requests = 0;
  100 |   await context.route('**/*', route => {
  101 |     requests++;
  102 |     return route.request().url() === entry ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: svgLink('xlink:href="#caf%C3%A9"', 'Required explanation', 'café') }) : route.abort();
  103 |   });
  104 |   try {
  105 |     const page = await context.newPage(); await page.goto(entry); await page.locator('#p').click();
  106 |     expect(await page.evaluate(() => location.hash)).toBe('#caf%C3%A9');
  107 |     expect(await page.locator(':target').textContent()).toBe('Required explanation');
  108 |     expect(requests).toBe(1);
  109 |   } finally { await context.close(); }
  110 | });
  111 | 
  112 | test('targetText reads native text when fragment target is a form', async ({ browser }) => {
  113 |   const source = form('textContent').replace('<form id="p"', '<a id="p" href="#target">Read</a><form id="target"');
  114 |   const report = await compare(browser, source, source.replace('Required instruction', 'Changed instruction'), ['targetText']);
  115 |   expect(report.status).toBe('review-required'); expect(report.checks[0].properties[0].source).toBe('Required instruction');
  116 | });
  117 | 
  118 | const exportCases = [
  119 |   { id: 'clobbered text change', source: form('textContent'), candidate: form('textContent', '', 'Changed instruction'), property: 'text', expected: 'review-required' },
  120 |   { id: 'clobbered text preserved', source: form('textContent'), candidate: form('textContent', 'class="reading"'), property: 'text', expected: 'passed' },
  121 |   { id: 'clobbered script dependency', source: form('attributes', 'onsubmit="return false"'), candidate: form('attributes', 'onsubmit="return false"'), property: 'text', expected: 'unavailable' },
  122 |   { ...targetCases[1], property: 'targetText' },
  123 |   { ...targetCases[0], property: 'targetText' },
  124 | ];
  125 | for (const item of exportCases) test('export retains native evidence: ' + item.id, async ({ browser }, testInfo) => {
  126 |   const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html'), manifest = testInfo.outputPath('manifest.json');
  127 |   fs.writeFileSync(source, item.source); fs.writeFileSync(candidate, item.candidate);
  128 |   fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'reading', documentKind: 'reading', kind: 'html', path: candidate,
  129 |     expected: { title: 'Reading', language: 'en', headings: [{ level: 1, name: 'Reading' }], tables: [] },
  130 |     sourceFidelity: { sourcePath: source, checkpoints: checkpoint([item.property]) },
  131 |   }] }));
  132 |   const report = await runAcceptance(manifest, { browser });
  133 |   fs.writeFileSync(testInfo.outputPath('acceptance.json'), JSON.stringify(report, null, 2));
> 134 |   expect(report.automatedStatus).toBe(item.expected === 'passed' ? 'passed' : 'failed');
      |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  135 |   expect(report.artifacts[0].renderedFidelity.status).toBe(item.expected);
  136 |   expect(report.humanAcceptance.status).toBe('not-run');
  137 | });
  138 | 
```