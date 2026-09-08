# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_preservation_review.spec.ts >> review component: references survive metadata persistence and locate the intended table cell
- Location: tests\e2e\remediation_preservation_review.spec.ts:114:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('iframe').contentFrame().getByRole('cell', { name: '90', exact: true })
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('iframe').contentFrame().getByRole('cell', { name: '90', exact: true })
    29 × locator resolved to <td>90</td>
       - unexpected value "inactive"

```

```yaml
- cell "90"
```

# Test source

```ts
  20  |   await page.addScriptTag({ path: path.join(root, 'remediation_review_helpers.js') });
  21  |   await page.addScriptTag({ content: component });
  22  |   await page.evaluate(source => {
  23  |     const w = window as any;
  24  |     const initial: any = {
  25  |       accessibleHtml: source, verificationState: 'complete', afterScoreVerified: true,
  26  |       candidateRejectionCount: 1,
  27  |       candidateRejections: [{ pass: 1, chunkId: 'all', phase: 'single', reason: 'table-cell-transposition' }],
  28  |     };
  29  |     Object.defineProperties(initial, {
  30  |       _verificationHtmlSnapshot: { value: source, enumerable: false },
  31  |       _verificationHtmlBindingDigest: { value: 'fixture-bound-proof', enumerable: false },
  32  |     });
  33  |     let current = initial, rerender: any, commitCount = 0, workbenchCount = 0, latestWorkbench = '';
  34  |     const protectedFields = (value: any) => ({
  35  |       accessibleHtml: value.accessibleHtml, verificationState: value.verificationState,
  36  |       afterScoreVerified: value.afterScoreVerified,
  37  |       candidateRejectionCount: value.candidateRejectionCount, candidateRejections: value.candidateRejections,
  38  |       snapshot: value._verificationHtmlSnapshot, digest: value._verificationHtmlBindingDigest,
  39  |       snapshotEnumerable: Object.getOwnPropertyDescriptor(value, '_verificationHtmlSnapshot')?.enumerable,
  40  |       digestEnumerable: Object.getOwnPropertyDescriptor(value, '_verificationHtmlBindingDigest')?.enumerable,
  41  |     });
  42  |     const initialProof = JSON.stringify(protectedFields(initial));
  43  |     // Strict test host: production commitPdfFixResultIfCurrent is tested separately.
  44  |     // Only navigation/acknowledgment metadata can be committed, with the live proof descriptors retained.
  45  |     const commitMetadata = (token: any, updater: any) => {
  46  |       if (token !== current.accessibleHtml) return false;
  47  |       const next = updater(current);
  48  |       for (const key of Object.keys(next)) {
  49  |         if (!['sourceStructure', 'preservationAcknowledgments'].includes(key) &&
  50  |             JSON.stringify(next[key]) !== JSON.stringify(current[key])) throw Error('Component tried to change protected field: ' + key);
  51  |       }
  52  |       const retained = Object.create(Object.getPrototypeOf(current), Object.getOwnPropertyDescriptors(current));
  53  |       for (const key of ['sourceStructure', 'preservationAcknowledgments']) {
  54  |         if (Object.prototype.hasOwnProperty.call(next, key)) retained[key] = next[key];
  55  |       }
  56  |       current = retained;
  57  |       if (JSON.stringify(protectedFields(current)) !== initialProof) throw Error('Metadata changed live proof.');
  58  |       commitCount++; rerender(current); return true;
  59  |     };
  60  |     function Host() {
  61  |       const [result, setResult] = w.React.useState(current);
  62  |       const [instruction, setInstruction] = w.React.useState('');
  63  |       rerender = setResult;
  64  |       return w.React.createElement(w.React.Fragment, null,
  65  |         w.React.createElement(w.AlloModules.PdfPreservationReview, {
  66  |           result, captureToken: () => current.accessibleHtml, commitMetadata,
  67  |           onWorkbench: (text: string) => { workbenchCount++; latestWorkbench = text; setInstruction(text); },
  68  |         }),
  69  |         w.React.createElement('label', null, 'Workbench instructions',
  70  |           w.React.createElement('textarea', { value: instruction, readOnly: true })));
  71  |     }
  72  |     w.__reviewTest = {
  73  |       snapshot: () => ({ ...protectedFields(current), commitCount, workbenchCount, latestWorkbench,
  74  |         sourceStructure: current.sourceStructure || null, acknowledgments: current.preservationAcknowledgments || {} }),
  75  |       unchanged: () => JSON.stringify(protectedFields(current)) === initialProof,
  76  |     };
  77  |     w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Host));
  78  |   }, html);
  79  |   await expect(page.getByRole('region', { name: 'Preservation review' })).toBeVisible();
  80  | }
  81  | 
  82  | async function openCell(page: Page) {
  83  |   await page.getByRole('button', { name: 'Inspect document references' }).focus();
  84  |   await page.keyboard.press('Enter');
  85  |   await expect(page.getByRole('combobox', { name: 'Document element' })).toBeVisible();
  86  |   await expect(page.getByRole('status')).toHaveText('Choose a table, cell, or image to inspect.');
  87  |   // The async index is committed through host state, then remains open after that re-render.
  88  |   await expect.poll(() => page.evaluate(() => (window as any).__reviewTest.snapshot().sourceStructure?.references.length)).toBe(7);
  89  |   await page.getByRole('combobox', { name: 'Document element' }).selectOption({ label: 'Table 1, row 2, cell 2' });
  90  |   await expect(page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true })).toBeVisible();
  91  | }
  92  | 
  93  | test('review component: keyboard acknowledgment preserves the strict host proof; Workbench only receives a draft', async ({ page }) => {
  94  |   await mount(page);
  95  |   await page.keyboard.press('Tab');
  96  |   await expect(page.locator('summary')).toBeFocused();
  97  |   await page.keyboard.press('Enter');
  98  |   await page.keyboard.press('Tab');
  99  |   await expect(page.getByRole('button', { name: 'Acknowledge', exact: true })).toBeFocused();
  100 |   await page.keyboard.press('Enter');
  101 |   await expect(page.getByRole('button', { name: 'Acknowledged — undo' })).toHaveAttribute('aria-pressed', 'true');
  102 |   await page.keyboard.press('Tab');
  103 |   await expect(page.getByRole('button', { name: 'Prepare Workbench review' })).toBeFocused();
  104 |   await page.keyboard.press('Enter');
  105 |   await expect(page.getByRole('textbox', { name: 'Workbench instructions' })).toHaveValue(/Table values changed position/);
  106 |   const state = await page.evaluate(() => (window as any).__reviewTest.snapshot());
  107 |   expect(state).toMatchObject({ accessibleHtml: html, verificationState: 'complete', afterScoreVerified: true,
  108 |     commitCount: 1, workbenchCount: 1, snapshotEnumerable: false, digestEnumerable: false });
  109 |   expect(Object.keys(state.acknowledgments)).toHaveLength(1);
  110 |   expect(state.sourceStructure).toBeNull();
  111 |   expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
  112 | });
  113 | 
  114 | test('review component: references survive metadata persistence and locate the intended table cell', async ({ page }) => {
  115 |   await mount(page);
  116 |   await openCell(page);
  117 |   await page.getByRole('button', { name: 'Locate in preview' }).focus();
  118 |   await page.keyboard.press('Enter');
  119 |   await expect(page.getByRole('status')).toHaveText('Located Table 1, row 2, cell 2.');
> 120 |   await expect(page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true })).toBeFocused();
      |                                                                                            ^ Error: expect(locator).toBeFocused() failed
  121 |   expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
  122 | });
  123 | 
  124 | for (const mutation of ['ambiguous', 'changed']) {
  125 |   test('review component: ' + mutation + ' references refuse automatic focus', async ({ page }) => {
  126 |     await mount(page);
  127 |     await openCell(page);
  128 |     if (mutation === 'ambiguous') await page.frameLocator('iframe').locator('table').evaluate(table => table.after(table.cloneNode(true)));
  129 |     else await page.frameLocator('iframe').getByRole('cell', { name: '90', exact: true }).evaluate(cell => { cell.textContent = '99'; });
  130 |     await page.getByRole('button', { name: 'Locate in preview' }).focus();
  131 |     await page.keyboard.press('Enter');
  132 |     await expect(page.getByRole('status')).toHaveText(mutation === 'ambiguous'
  133 |       ? 'This reference has multiple possible matches. Inspect the document manually.'
  134 |       : 'This reference cannot be matched safely to the current document. Inspect the document manually.');
  135 |     await expect(page.getByRole('button', { name: 'Locate in preview' })).toBeFocused();
  136 |     expect(await page.evaluate(() => (window as any).__reviewTest.unchanged())).toBe(true);
  137 |     expect((await page.evaluate(() => (window as any).__reviewTest.snapshot())).commitCount).toBe(1);
  138 |   });
  139 | }
  140 | 
```