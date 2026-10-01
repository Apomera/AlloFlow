# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-observation-review.spec.ts >> clipboard and download failures retain a selectable complete summary
- Location: tests\e2e\dissection-observation-review.spec.ts:109:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Clipboard unavailable"
Received string:    "Observation summary copied to the clipboard."

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  20  |   const panel = page.locator('[data-observation-review]');
  21  |   await panel.locator('#diss-observation-review-title').click();
  22  |   await expect(panel.locator('[data-observation-entry]')).toHaveCount(2);
  23  |   await panel.locator('[data-observation-filter="uncertain"]').focus();
  24  |   await page.keyboard.press('Enter');
  25  |   await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
  26  |   const lens = panel.locator('[data-observation-entry="lens"]');
  27  |   await expect(lens.locator('button')).toHaveCount(0);
  28  |   await expect(lens.locator('[data-observation-locked]')).toBeVisible();
  29  |   await lens.getByText('Read saved note', { exact: true }).click();
  30  |   await expect(lens.locator('.diss-observation-review__note')).toHaveText(state.organNotes['sheepEye|lens']);
  31  |   await panel.locator('[data-observation-filter="unfinished"]').click();
  32  |   await expect(panel.locator('[data-observation-entry="cornea"]')).toBeVisible();
  33  |   expect(await evidence(page)).toEqual(before);
  34  |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('skin');
  35  |   await panel.screenshot({ path: out + '/observation-review-desktop.png' });
  36  |   expect(errors).toEqual([]);
  37  | });
  38  | 
  39  | test('cross-layer note review returns to the list and reflects a deliberate confidence revision', async ({ page }) => {
  40  |   await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  41  |   const before = await evidence(page);
  42  |   const panel = page.locator('[data-observation-review]');
  43  |   await panel.locator('#diss-observation-review-title').click();
  44  |   await panel.locator('[data-observation-filter="uncertain"]').click();
  45  |   await panel.getByRole('button', { name: 'Review note: Crystalline Lens', exact: true }).click();
  46  |   await expect(page.locator('#diss-note-lens')).toBeFocused();
  47  |   await expect(page.locator('#diss-note-lens')).toHaveValue(state.organNotes['sheepEye|lens']);
  48  |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('organs');
  49  |   expect(await evidence(page)).toEqual(before);
  50  |   await page.getByRole('radio', { name: /Confidence 2 of 3/ }).check();
  51  |   await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  52  |   await expect(panel.locator('#diss-observation-review-title')).toBeFocused();
  53  |   await expect(panel.locator('[data-observation-review-empty]')).toContainText('No observations match');
  54  |   await panel.locator('[data-observation-filter="all"]').click();
  55  |   await expect(panel.locator('[data-observation-entry="lens"]')).toContainText('Confidence 2 of 3');
  56  |   expect(await evidence(page)).toEqual({ ...before, confidence: { 'sheepEye|lens': 2 } });
  57  | });
  58  | 
  59  | test('phone review wraps saved notes and passes scoped accessibility checks', async ({ page }) => {
  60  |   await page.setViewportSize({ width: 390, height: 844 });
  61  |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  62  |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  63  |   const panel = page.locator('[data-observation-review]');
  64  |   await panel.locator('#diss-observation-review-title').click();
  65  |   await panel.getByText('Read saved note', { exact: true }).click();
  66  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  67  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  68  |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  69  |   expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  70  |   await panel.screenshot({ path: out + '/observation-review-mobile.png' });
  71  | });
  72  | 
  73  | test('summary preview, clipboard and downloaded text match the current filter without changing evidence', async ({ page }) => {
  74  |   const note = '  Two curved faces.\nUnicode: α & <tag> is literal.  ';
  75  |   await harness.mount(page, { dissection: { ...state, organNotes: { ...state.organNotes, 'sheepEye|lens': note } } }, undefined, { expectCanvas: false });
  76  |   const before = await evidence(page);
  77  |   await page.evaluate(() => {
  78  |     Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__observationCopy = text; } } });
  79  |     const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
  80  |     (window as any).__observationUrls = []; (window as any).__observationRevoked = [];
  81  |     URL.createObjectURL = blob => { const url = originalCreate(blob); (window as any).__observationUrls.push(url); return url; };
  82  |     URL.revokeObjectURL = url => { (window as any).__observationRevoked.push(url); originalRevoke(url); };
  83  |   });
  84  |   const panel = page.locator('[data-observation-review]');
  85  |   await panel.locator('#diss-observation-review-title').click();
  86  |   await panel.locator('[data-observation-export] > summary').click();
  87  |   const preview = panel.locator('#diss-observation-summary');
  88  |   await expect(preview).toHaveValue(/Scope: All inspected · 2 of 2/);
  89  |   await panel.locator('[data-observation-filter="uncertain"]').click();
  90  |   await expect(preview).toBeVisible();
  91  |   await expect(preview).toHaveValue(/Scope: Low confidence · 1 of 2/);
  92  |   const expected = await preview.inputValue();
  93  |   expect(expected).toContain(note);
  94  |   expect(expected).not.toContain('1. Cornea');
  95  |   await panel.getByRole('button', { name: 'Copy summary', exact: true }).click();
  96  |   expect(await page.evaluate(() => (window as any).__observationCopy)).toBe(expected);
  97  |   const downloadPromise = page.waitForEvent('download');
  98  |   await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  99  |   const download = await downloadPromise;
  100 |   expect(download.suggestedFilename()).toBe('sheepEye_observations_uncertain.txt');
  101 |   const stream = await download.createReadStream();
  102 |   const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  103 |   expect(Buffer.concat(chunks).toString('utf8')).toBe(expected);
  104 |   await expect.poll(() => page.evaluate(() => (window as any).__observationRevoked.length)).toBe(1);
  105 |   expect(await page.evaluate(() => (window as any).__observationRevoked[0])).toBe(await page.evaluate(() => (window as any).__observationUrls[0]));
  106 |   expect(await evidence(page)).toEqual(before);
  107 | });
  108 | 
  109 | test('clipboard and download failures retain a selectable complete summary', async ({ page }) => {
  110 |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  111 |   const before = await evidence(page);
  112 |   await page.evaluate(() => {
  113 |     Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Clipboard denied')) } });
  114 |     URL.createObjectURL = () => { throw new Error('Download unavailable'); };
  115 |   });
  116 |   const panel = page.locator('[data-observation-review]');
  117 |   await panel.locator('#diss-observation-review-title').click();
  118 |   await panel.locator('[data-observation-export] > summary').click();
  119 |   await panel.getByRole('button', { name: 'Copy summary', exact: true }).click();
> 120 |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('Clipboard unavailable');
      |                                                                                                                     ^ Error: expect(received).toContain(expected) // indexOf
  121 |   await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  122 |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback.message)).toContain('download could not start');
  123 |   await panel.getByRole('button', { name: 'Select summary', exact: true }).click();
  124 |   const preview = panel.locator('#diss-observation-summary');
  125 |   await expect(preview).toBeFocused();
  126 |   expect(await preview.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd, el.readOnly])).toEqual([0, (await preview.inputValue()).length, true]);
  127 |   expect(await evidence(page)).toEqual(before);
  128 | });
  129 | 
  130 | test('phone summary preview and export actions are accessible and fit the viewport', async ({ page }) => {
  131 |   await page.setViewportSize({ width: 390, height: 844 });
  132 |   await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  133 |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  134 |   const panel = page.locator('[data-observation-review]');
  135 |   await panel.locator('#diss-observation-review-title').click();
  136 |   await panel.locator('[data-observation-export] > summary').click();
  137 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  138 |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  139 |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  140 |   expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  141 |   await panel.locator('[data-observation-export]').screenshot({ path: out + '/observation-summary-mobile.png' });
  142 | });
  143 | 
  144 | test('searching saved notes filters counts and exported contents while preserving locks and evidence', async ({ page }) => {
  145 |   await page.setViewportSize({ width: 390, height: 844 });
  146 |   await harness.mount(page, { dissection: { ...state, organSearch: 'separate directory query' } }, undefined, { expectCanvas: false });
  147 |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  148 |   const before = await evidence(page);
  149 |   const panel = page.locator('[data-observation-review]');
  150 |   await panel.locator('#diss-observation-review-title').click();
  151 |   const search = panel.getByRole('searchbox', { name: 'Search your observations' });
  152 |   await search.fill('INTERNAL curved');
  153 |   await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
  154 |   await expect(panel.locator('[data-observation-filter="all"]')).toHaveText('All inspected (1)');
  155 |   await expect(panel.locator('[data-observation-filter="unfinished"]')).toHaveText('Needs notes (0)');
  156 |   await expect(panel.locator('[data-observation-note-match]')).toHaveText('Search words appear in your saved note.');
  157 |   await expect(panel.locator('[data-observation-locked]')).toBeVisible();
  158 |   await expect(panel.locator('[data-observation-entry] button')).toHaveCount(0);
  159 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  160 |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-observation-review]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  161 |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  162 |   expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  163 |   await panel.screenshot({ path: out + '/observation-search-mobile.png' });
  164 |   await panel.locator('[data-observation-export] > summary').click();
  165 |   const expected = await panel.locator('#diss-observation-summary').inputValue();
  166 |   expect(expected).toContain('Search: "INTERNAL curved"');
  167 |   expect(expected).not.toContain('1. Cornea');
  168 |   const pendingDownload = page.waitForEvent('download');
  169 |   await panel.getByRole('button', { name: 'Download text', exact: true }).click();
  170 |   const download = await pendingDownload;
  171 |   expect(download.suggestedFilename()).toBe('sheepEye_observations_all_search.txt');
  172 |   const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  173 |   for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  174 |   expect(Buffer.concat(chunks).toString('utf8')).toBe(expected);
  175 |   await panel.locator('[data-observation-filter="uncertain"]').click();
  176 |   await search.fill('notpresent');
  177 |   await expect(panel.locator('[data-observation-export]')).toHaveCount(0);
  178 |   await expect(panel.locator('[data-observation-review-empty]')).toContainText('Clear the search');
  179 |   await search.press('Escape');
  180 |   await expect(search).toHaveValue('');
  181 |   await expect(search).toBeFocused();
  182 |   await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAttribute('aria-pressed', 'true');
  183 |   await search.fill('curved');
  184 |   await panel.getByRole('button', { name: 'Clear observation search', exact: true }).click();
  185 |   await expect(search).toHaveValue('');
  186 |   await expect(search).toBeFocused();
  187 |   expect(await evidence(page)).toEqual(before);
  188 |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organSearch)).toBe('separate directory query');
  189 | });
  190 | 
  191 | test('search survives note navigation and refreshes when the original note is revised', async ({ page }) => {
  192 |   await harness.mount(page, { dissection: { ...state, revealedLayers: { skin: true } } }, undefined, { expectCanvas: false });
  193 |   const before = await evidence(page);
  194 |   const panel = page.locator('[data-observation-review]');
  195 |   await panel.locator('#diss-observation-review-title').click();
  196 |   await panel.getByRole('searchbox', { name: 'Search your observations' }).fill('curved');
  197 |   await panel.getByRole('button', { name: 'Review note: Crystalline Lens', exact: true }).click();
  198 |   await expect(page.locator('#diss-note-lens')).toBeFocused();
  199 |   const revised = 'I observed the structure behind the iris.';
  200 |   await page.locator('#diss-note-lens').fill(revised);
  201 |   await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
  202 |   await expect(panel.locator('#diss-observation-review-title')).toBeFocused();
  203 |   await expect(panel.getByRole('searchbox')).toHaveValue('curved');
  204 |   await expect(panel.locator('[data-observation-review-empty]')).toBeVisible();
  205 |   await panel.getByRole('button', { name: 'Clear observation search', exact: true }).click();
  206 |   await panel.locator('[data-observation-export] > summary').click();
  207 |   await expect(panel.locator('#diss-observation-summary')).toHaveValue(new RegExp(revised.replace(/\./g, '\\.')));
  208 |   expect(await evidence(page)).toEqual({ ...before, notes: { ...before.notes, 'sheepEye|lens': revised } });
  209 | });
  210 | 
```