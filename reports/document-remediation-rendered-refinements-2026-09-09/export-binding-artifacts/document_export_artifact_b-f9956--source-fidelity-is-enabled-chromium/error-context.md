# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_export_artifact_binding.spec.ts >> CLI writes a rendered review only when source fidelity is enabled
- Location: tests\e2e\document_export_artifact_binding.spec.ts:121:7

# Error details

```
Error: spawnSync C:\Program Files\nodejs\node.exe ETIMEDOUT
```

# Test source

```ts
  25  |   fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts }));
  26  |   return { manifest, artifacts };
  27  | }
  28  | function afterContext(browser: any, action: (count: number) => void) {
  29  |   let count = 0;
  30  |   return { version: () => browser.version(), newContext: async (options: any) => {
  31  |     const context = await browser.newContext(options);
  32  |     try { action(++count); } catch (error) { await context.close(); throw error; }
  33  |     return context;
  34  |   } };
  35  | }
  36  | 
  37  | test('stable artifacts without source fidelity retain passing acceptance and exact byte identity', async ({ browser }, testInfo) => {
  38  |   const { manifest } = setup(testInfo);
  39  |   const report = await runAcceptance(manifest, { browser });
  40  |   expect(report.automatedStatus).toBe('passed');
  41  |   expect(report.artifacts[0].sha256).toBe(digest(original));
  42  |   expect(stability(report.artifacts[0])).toMatchObject({ status: 'passed', observed: { reason: 'artifact-unchanged' } });
  43  |   expect(report.artifacts[0].renderedFidelity).toBeUndefined();
  44  |   expect(report.humanAcceptance.status).toBe('not-run');
  45  | });
  46  | 
  47  | for (const mutation of ['changed', 'missing']) {
  48  |   test('inspects captured HTML and rejects a file that becomes ' + mutation + ' before browser inspection', async ({ browser }, testInfo) => {
  49  |     const { manifest, artifacts } = setup(testInfo);
  50  |     const controlledBrowser = afterContext(browser, () => {
  51  |       if (mutation === 'changed') fs.writeFileSync(artifacts[0].path, replacement);
  52  |       else fs.unlinkSync(artifacts[0].path);
  53  |     });
  54  |     const report = await runAcceptance(manifest, { browser: controlledBrowser });
  55  |     const artifact = report.artifacts[0];
  56  |     expect(artifact.sha256).toBe(digest(original));
  57  |     expect(artifact.checks.find((check: any) => check.id === 'html.document-identity').status).toBe('passed');
  58  |     expect(artifact.checks.find((check: any) => check.id === 'html.reading-order').status).toBe('passed');
  59  |     expect(stability(artifact)).toMatchObject({ status: 'unavailable', observed: { reason: mutation === 'changed' ? 'artifact-changed' : 'artifact-unreadable' } });
  60  |     expect(artifact.automatedStatus).toBe('failed');
  61  |     expect(report.automatedStatus).toBe('failed');
  62  |     expect(report.humanAcceptance.status).toBe('not-run');
  63  |   });
  64  | }
  65  | 
  66  | test('rechecks earlier artifacts after later inspections', async ({ browser }, testInfo) => {
  67  |   const { manifest, artifacts } = setup(testInfo, 2);
  68  |   const controlledBrowser = afterContext(browser, count => { if (count === 2) fs.writeFileSync(artifacts[0].path, replacement); });
  69  |   const report = await runAcceptance(manifest, { browser: controlledBrowser });
  70  |   expect(stability(report.artifacts[0]).status).toBe('unavailable');
  71  |   expect(stability(report.artifacts[1]).status).toBe('passed');
  72  |   expect(report.automatedStatus).toBe('failed');
  73  | });
  74  | 
  75  | test('PDF inspection accepts captured bytes without rereading the source path', async ({}, testInfo) => {
  76  |   const bytes = fs.readFileSync(path.resolve(__dirname, '../../test-assets/multi-column-sample.pdf'));
  77  |   const report = await inspectPdf(testInfo.outputPath('never-created.pdf'), { title: '', headings: [], readingOrder: [], tables: [] }, bytes);
  78  |   expect(report.pages).toBeGreaterThan(0);
  79  |   expect(report.checks.some((check: any) => check.id === 'pdf.tagged-reading-order')).toBe(true);
  80  |   expect(fs.existsSync(testInfo.outputPath('never-created.pdf'))).toBe(false);
  81  | });
  82  | 
  83  | test('invalidates a rendered pass when its artifact changes during a later inspection', async ({ browser }, testInfo) => {
  84  |   const { manifest, artifacts } = setup(testInfo, 2, true);
  85  |   artifacts[0].sourceFidelity.profiles = [{ id: 'screen', media: 'screen' }, { id: 'print', media: 'print' }];
  86  |   fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts }));
  87  |   const controlledBrowser = afterContext(browser, count => { if (count === 6) fs.writeFileSync(artifacts[0].path, replacement); });
  88  |   const report = await runAcceptance(manifest, { browser: controlledBrowser });
  89  |   const artifact = report.artifacts[0];
  90  |   expect(stability(artifact).status).toBe('unavailable');
  91  |   expect(artifact.renderedFidelity).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
  92  |   expect(artifact.renderedFidelity.coverage.reasons).toContain('artifact-changed');
  93  |   expect(artifact.renderedFidelity.profiles).toHaveLength(2);
  94  |   for (const profile of artifact.renderedFidelity.profiles) {
  95  |     expect(profile).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
  96  |     expect(profile.coverage.reasons).toContain('artifact-changed');
  97  |   }
  98  |   expect(artifact.checks.find((check: any) => check.id === 'html.rendered-source-fidelity').status).toBe('unavailable');
  99  |   expect(report.automatedStatus).toBe('failed');
  100 | });
  101 | 
  102 | for (const mutation of ['changed', 'missing']) {
  103 |   test('rechecks a rendered source that becomes ' + mutation + ' during a later artifact inspection', async ({ browser }, testInfo) => {
  104 |     const { manifest, artifacts } = setup(testInfo, 2, true);
  105 |     const controlledBrowser = afterContext(browser, count => {
  106 |       if (count !== 4) return;
  107 |       if (mutation === 'changed') fs.writeFileSync(artifacts[0].sourceFidelity.sourcePath, replacement);
  108 |       else fs.unlinkSync(artifacts[0].sourceFidelity.sourcePath);
  109 |     });
  110 |     const report = await runAcceptance(manifest, { browser: controlledBrowser });
  111 |     const artifact = report.artifacts[0], reason = mutation === 'changed' ? 'source-changed' : 'source-unreadable';
  112 |     expect(stability(artifact).status).toBe('passed');
  113 |     expect(artifact.checks.find((check: any) => check.id === 'html.rendered-source-byte-stability')).toMatchObject({ status: 'unavailable', observed: { reason } });
  114 |     expect(artifact.renderedFidelity).toMatchObject({ status: 'unavailable', artifactChanged: true, coverage: { complete: false } });
  115 |     expect(artifact.renderedFidelity.coverage.reasons).toContain(reason);
  116 |     expect(report.automatedStatus).toBe('failed');
  117 |   });
  118 | }
  119 | 
  120 | for (const optedIn of [false, true]) {
  121 |   test('CLI writes a rendered review only when source fidelity is ' + (optedIn ? 'enabled' : 'absent'), async ({}, testInfo) => {
  122 |     testInfo.setTimeout(120000);
  123 |     const { manifest } = setup(testInfo, 1, optedIn);
  124 |     const output = testInfo.outputPath('acceptance-output');
> 125 |     execFileSync(process.execPath, [path.resolve(__dirname, '../../dev-tools/document_export_at_acceptance.cjs'), manifest, output], { timeout: 90000, encoding: 'utf8', windowsHide: true });
      |                 ^ Error: spawnSync C:\Program Files\nodejs\node.exe ETIMEDOUT
  126 |     const report = JSON.parse(fs.readFileSync(path.join(output, 'automated-results.json'), 'utf8'));
  127 |     expect(report.automatedStatus).toBe('passed');
  128 |     expect(fs.existsSync(path.join(output, 'rendered-fidelity-review.html'))).toBe(optedIn);
  129 |     if (optedIn) expect(fs.readFileSync(path.join(output, 'rendered-fidelity-review.html'), 'utf8')).toContain('artifact-0');
  130 |     expect(JSON.parse(fs.readFileSync(path.join(output, 'manual-results.template.json'), 'utf8')).status).toBe('not-run');
  131 |   });
  132 | }
  133 | 
```