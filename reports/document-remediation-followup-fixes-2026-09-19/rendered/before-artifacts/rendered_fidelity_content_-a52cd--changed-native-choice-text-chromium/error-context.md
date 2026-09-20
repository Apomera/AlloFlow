# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rendered_fidelity_content_regressions.spec.ts >> empty selected option label cannot conceal changed native choice text
- Location: tests\e2e\rendered_fidelity_content_regressions.spec.ts:82:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "review-required"
Received: "passed"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: Temperature
  - listbox "Temperature" [ref=e2]:
    - option "Cold" [selected] [ref=e3]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as fs from 'node:fs';
  3   | const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
  4   | const { runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');
  5   | 
  6   | test.describe.configure({ mode: 'serial' });
  7   | test.setTimeout(60000);
  8   | const checkpoints = (properties: string[]) => [{ id: 'p', sourceSelector: '#p', properties }];
  9   | async function compare(browser: any, testInfo: any, source: string, candidate: string, properties: string[]) {
  10  |   const report = await compareRenderedHtml(browser, source, candidate, { checkpoints: checkpoints(properties) });
  11  |   fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  12  |   return report;
  13  | }
  14  | 
  15  | for (const [attribute, expectedProperty] of [
  16  |   ['style="display:none"', 'visibleText'],
  17  |   ['style="visibility:hidden"', 'visibleText'],
  18  |   ['style="opacity:0"', 'visibleText'],
  19  |   ['aria-hidden="true"', 'exposedText'],
  20  | ]) test('instruction checkpoint catches descendant ' + attribute, async ({ browser }, testInfo) => {
  21  |   const source = '<p id="p">Do <span>not</span> open the container.</p>';
  22  |   const report = await compare(browser, testInfo, source, source.replace('<span>', '<span ' + attribute + '>'), ['text', 'visible', 'exposed']);
  23  |   expect(report.status).toBe('review-required');
  24  |   expect(report.coverage.complete).toBe(true);
  25  |   expect(report.checks[0].properties.find((p: any) => p.property === expectedProperty)).toMatchObject({ status: 'failed', source: 'Do not open the container.', candidate: 'Do open the container.' });
  26  | });
  27  | 
  28  | test('instruction rewrapping preserves visible and exposed words', async ({ browser }, testInfo) => {
  29  |   const report = await compare(browser, testInfo, '<p id="p">Do <span>not</span> open.</p>', '<p id="p"><span>Do not </span><strong>open.</strong></p>', ['text', 'visible', 'exposed']);
  30  |   expect(report.status).toBe('passed');
  31  |   expect(report.checks[0].properties.map((p: any) => p.property)).toContain('exposedText');
  32  | });
  33  | 
  34  | test('restoring a fully hidden instruction is allowed', async ({ browser }, testInfo) => {
  35  |   const report = await compare(browser, testInfo, '<p id="p" style="display:none">Do not open.</p>', '<p id="p">Do not open.</p>', ['text', 'visible', 'exposed']);
  36  |   expect(report.status).toBe('passed');
  37  | });
  38  | 
  39  | test('text-only contracts remain distinct from rendered preservation', async ({ browser }, testInfo) => {
  40  |   const source = '<p id="p">Do <span>not</span> open.</p>';
  41  |   const report = await compare(browser, testInfo, source, source.replace('<span>', '<span hidden>'), ['text']);
  42  |   expect(report.status).toBe('passed');
  43  |   expect(report.checks[0].properties.map((p: any) => p.property)).toEqual(['text']);
  44  | });
  45  | 
  46  | test('display contents direct text respects opacity on a real ancestor box', async ({ browser }, testInfo) => {
  47  |   const source = '<div><p id="p" style="display:contents">Keep the required instruction.</p></div>';
  48  |   const report = await compare(browser, testInfo, source, source.replace('<div>', '<div style="opacity:0">'), ['visible', 'text']);
  49  |   expect(report.status).toBe('review-required');
  50  |   expect(report.checks[0].properties.find((p: any) => p.property === 'visible')).toMatchObject({ source: true, candidate: false, status: 'failed' });
  51  | });
  52  | 
  53  | test('display contents retains direct text and visible child overrides', async ({ browser }, testInfo) => {
  54  |   const source = '<div style="visibility:hidden"><p id="p" style="visibility:visible">Keep the instruction.</p></div>';
  55  |   const report = await compare(browser, testInfo, source, source.replace('style="visibility:visible"', 'style="visibility:visible;display:contents"'), ['visible', 'text']);
  56  |   expect(report.status).toBe('passed');
  57  |   expect(report.checks[0].properties.find((p: any) => p.property === 'visible')).toMatchObject({ source: true, candidate: true });
  58  | });
  59  | 
  60  | const select = '<label for="p">Direction</label><select id="p"><option value="direction" selected>North</option><option value="direction">South</option></select>';
  61  | test('duplicate submitted values cannot conceal a different selected option', async ({ browser }, testInfo) => {
  62  |   const candidate = select.replace(' selected>North', '>North').replace('>South', ' selected>South');
  63  |   const report = await compare(browser, testInfo, select, candidate, ['selected', 'value', 'text', 'name', 'role', 'disabled']);
  64  |   expect(report.status).toBe('review-required');
  65  |   expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({ status: 'failed', source: [{ index: 0, value: 'direction', label: 'North' }], candidate: [{ index: 1, value: 'direction', label: 'South' }] });
  66  | });
  67  | 
  68  | test('unchanged duplicate option choice survives harmless markup attributes', async ({ browser }, testInfo) => {
  69  |   const report = await compare(browser, testInfo, select, select.replace('<option ', '<option id="north" '), ['selected', 'value', 'name']);
  70  |   expect(report.status).toBe('passed');
  71  | });
  72  | 
  73  | test('selected-only contract preserves option labels as well as submitted value', async ({ browser }, testInfo) => {
  74  |   const report = await compare(browser, testInfo, select, select.replace('North', 'West'), ['selected']);
  75  |   expect(report.status).toBe('review-required');
  76  | });
  77  | 
  78  | const temperatureSelect = (option: string) => '<label for="p">Temperature</label><select id="p" size="2">' + option + '</select>';
  79  | const emptyLabelChoice = temperatureSelect('<option value="temperature" label="" selected>Warm</option>');
  80  | const selectedChoiceProperties = ['selected', 'value', 'name', 'role', 'exposed'];
  81  | 
  82  | test('empty selected option label cannot conceal changed native choice text', async ({ browser, page }, testInfo) => {
  83  |   const candidate = emptyLabelChoice.replace('Warm', 'Cold');
  84  |   await page.route('**/*', route => route.abort());
  85  |   const session = await page.context().newCDPSession(page);
  86  |   const nativeNames: string[][] = [];
  87  |   try {
  88  |     for (const html of [emptyLabelChoice, candidate]) {
  89  |       await page.setContent(html);
  90  |       const { nodes } = await session.send('Accessibility.getFullAXTree');
  91  |       nativeNames.push(nodes.filter((node: any) => !node.ignored && node.role?.value === 'option').map((node: any) => node.name?.value));
  92  |     }
  93  |   } finally { await session.detach(); }
  94  |   fs.writeFileSync(testInfo.outputPath('native-option-names.json'), JSON.stringify({ source: nativeNames[0], candidate: nativeNames[1] }, null, 2));
  95  |   expect(nativeNames).toEqual([['Warm'], ['Cold']]);
  96  |   const report = await compare(browser, testInfo, emptyLabelChoice, candidate, selectedChoiceProperties);
> 97  |   expect(report.status).toBe('review-required');
      |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  98  |   expect(report.coverage.complete).toBe(true);
  99  |   expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({
  100 |     status: 'failed', source: [{ index: 0, value: 'temperature', label: 'Warm' }], candidate: [{ index: 0, value: 'temperature', label: 'Cold' }],
  101 |   });
  102 |   expect(report.checks[0].properties.filter((p: any) => p.property !== 'selected').every((p: any) => p.status === 'passed')).toBe(true);
  103 | });
  104 | 
  105 | for (const operation of ['add', 'remove']) test('empty option label ' + operation + ' preserves the effective selected choice', async ({ browser }, testInfo) => {
  106 |   const ordinary = emptyLabelChoice.replace(' label=""', '');
  107 |   const [source, candidate] = operation === 'add' ? [ordinary, emptyLabelChoice] : [emptyLabelChoice, ordinary];
  108 |   const report = await compare(browser, testInfo, source, candidate, selectedChoiceProperties);
  109 |   expect(report.status).toBe('passed');
  110 |   expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({
  111 |     status: 'passed', source: [{ index: 0, value: 'temperature', label: 'Warm' }], candidate: [{ index: 0, value: 'temperature', label: 'Warm' }],
  112 |   });
  113 | });
  114 | 
  115 | test('empty option label fallback retains canonical accent and whitespace normalization', async ({ browser }, testInfo) => {
  116 |   const source = emptyLabelChoice.replace('Warm', 'Caf\u00e9 au lait');
  117 |   const candidate = emptyLabelChoice.replace('Warm', '  Cafe\u0301  au\n lait  ');
  118 |   const report = await compare(browser, testInfo, source, candidate, ['selected']);
  119 |   expect(report.status).toBe('passed');
  120 |   expect(report.checks[0].properties[0]).toMatchObject({
  121 |     source: [{ index: 0, value: 'temperature', label: 'Caf\u00e9 au lait' }], candidate: [{ index: 0, value: 'temperature', label: 'Caf\u00e9 au lait' }],
  122 |   });
  123 | });
  124 | 
  125 | test('empty labels and duplicate values cannot conceal a different selected option', async ({ browser }, testInfo) => {
  126 |   const source = temperatureSelect('<option value="temperature" label="" selected>Warm</option><option value="temperature" label="">Cold</option>');
  127 |   const candidate = source.replace(' selected>Warm', '>Warm').replace('>Cold', ' selected>Cold');
  128 |   const report = await compare(browser, testInfo, source, candidate, selectedChoiceProperties);
  129 |   expect(report.status).toBe('review-required');
  130 |   expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({
  131 |     status: 'failed', source: [{ index: 0, value: 'temperature', label: 'Warm' }], candidate: [{ index: 1, value: 'temperature', label: 'Cold' }],
  132 |   });
  133 | });
  134 | 
  135 | test('nonempty option label remains authoritative over unused option text', async ({ browser }, testInfo) => {
  136 |   const source = emptyLabelChoice.replace('label=""', 'label="Comfortable"');
  137 |   const report = await compare(browser, testInfo, source, source.replace('Warm', 'Cold'), selectedChoiceProperties);
  138 |   expect(report.status).toBe('passed');
  139 |   expect(report.checks[0].properties.find((p: any) => p.property === 'selected')).toMatchObject({
  140 |     source: [{ index: 0, value: 'temperature', label: 'Comfortable' }], candidate: [{ index: 0, value: 'temperature', label: 'Comfortable' }],
  141 |   });
  142 | });
  143 | 
  144 | test('post-export acceptance rejects changed selected text behind an empty option label', async ({ browser }, testInfo) => {
  145 |   const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html');
  146 |   const original = '<!doctype html><html lang="en"><head><title>Temperature</title></head><body><main><h1>Temperature</h1>' + emptyLabelChoice + '</main></body></html>';
  147 |   fs.writeFileSync(source, original);
  148 |   fs.writeFileSync(candidate, original.replace('Warm', 'Cold'));
  149 |   const manifest = testInfo.outputPath('manifest.json');
  150 |   fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'temperature', documentKind: 'reading', kind: 'html', path: candidate,
  151 |     expected: { title: 'Temperature', language: 'en', headings: [{ level: 1, name: 'Temperature' }], tables: [] },
  152 |     sourceFidelity: { sourcePath: source, checkpoints: checkpoints(selectedChoiceProperties) },
  153 |   }] }));
  154 |   const report = await runAcceptance(manifest, { browser });
  155 |   fs.writeFileSync(testInfo.outputPath('export-acceptance.json'), JSON.stringify(report, null, 2));
  156 |   expect(report.automatedStatus).toBe('failed');
  157 |   const artifact = report.artifacts[0];
  158 |   expect(artifact.renderedFidelity.status).toBe('review-required');
  159 |   expect(artifact.renderedFidelity.candidate.sha256).toBe(artifact.sha256);
  160 |   expect(artifact.checks.filter((check: any) => check.status !== 'passed').map((check: any) => check.id)).toEqual(['html.rendered-source-fidelity']);
  161 |   expect(report.humanAcceptance.status).toBe('not-run');
  162 | });
  163 | 
  164 | test('relative href spelling cannot collapse through the synthetic root URL', async ({ browser }, testInfo) => {
  165 |   const source = '<a id="p" href="./chapter.pdf">Read the chapter</a>';
  166 |   const report = await compare(browser, testInfo, source, source.replace('./chapter.pdf', '../chapter.pdf'), ['href', 'text']);
  167 |   expect(report.status).toBe('review-required');
  168 |   expect(report.checks[0].properties[0]).toMatchObject({ status: 'failed', source: { relative: './chapter.pdf' }, candidate: { relative: '../chapter.pdf' } });
  169 | });
  170 | 
  171 | test('unchanged relative href remains comparable', async ({ browser }, testInfo) => {
  172 |   const source = '<a id="p" href="../chapter.pdf">Read the chapter</a>';
  173 |   const report = await compare(browser, testInfo, source, source.replace('<a ', '<a class="reading" '), ['href', 'text']);
  174 |   expect(report.status).toBe('passed');
  175 | });
  176 | 
  177 | test('absolute hrefs retain equivalent native URL normalization', async ({ browser }, testInfo) => {
  178 |   const source = '<a id="p" href="https://example.test:443/chapter.pdf">Read the chapter</a>';
  179 |   const report = await compare(browser, testInfo, source, source.replace(':443', ''), ['href']);
  180 |   expect(report.status).toBe('passed');
  181 | });
  182 | 
  183 | test('same relative spelling cannot conceal a changed authored base URL', async ({ browser }, testInfo) => {
  184 |   const source = '<base href="https://example.test/one/"><a id="p" href="chapter.pdf">Read the chapter</a>';
  185 |   const report = await compare(browser, testInfo, source, source.replace('/one/', '/two/'), ['href']);
  186 |   expect(report.status).toBe('review-required');
  187 | });
  188 | 
  189 | test('unrequested long text and accessible name do not invalidate role and exposure', async ({ browser }, testInfo) => {
  190 |   const source = '<main id="p" aria-label="' + 'Long name. '.repeat(900) + '"><p>' + 'Original reading. '.repeat(600) + '</p></main>';
  191 |   const report = await compare(browser, testInfo, source, source, ['role', 'exposed']);
  192 |   expect(report.status).toBe('passed');
  193 |   expect(report.coverage).toMatchObject({ requested: 1, inspected: 1, complete: true });
  194 | });
  195 | 
  196 | test('requested oversized text remains unavailable', async ({ browser }, testInfo) => {
  197 |   const source = '<main id="p">' + 'Original reading. '.repeat(600) + '</main>';
```