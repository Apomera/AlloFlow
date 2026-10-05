# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-rounds.spec.ts >> earlier-round inspection works by keyboard at 320 pixels and 400 percent zoom without clipped controls or counts
- Location: tests\e2e\microbiology-resistance-rounds.spec.ts:256:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#micro-resistance-comparison-latest')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('#micro-resistance-comparison-latest')
    27 × locator resolved to <button disabled type="button" id="micro-resistance-comparison-latest">Return to latest shared round</button>
       - unexpected value "inactive"

```

```yaml
- button "Return to latest shared round" [disabled]
```

# Test source

```ts
  164 |   const imported = seed(); imported.resistanceComparison = { ...imported.resistanceComparison, aId: 7, bId: 4, round: 99 };
  165 |   await mount(page, imported); const importedBefore = await state(page);
  166 |   await expect(round(page)).toHaveValue(''); await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 2');
  167 |   expect(importedBefore.microbiology.resistanceComparison.round).toBe(99); expect(await state(page)).toEqual(importedBefore);
  168 | });
  169 | 
  170 | test('keeps extinction undefined only at the observed extinct round and disables inspection for missing or identical snapshots', async ({ page }) => {
  171 |   await mount(page); await choose(page, '7', '9');
  172 |   await counts(page, { resistant: ['8', '0', '-8'], totalAlive: ['68', '0', '-68'], sharePct: ['12%', 'Undefined', 'Undefined'] });
  173 |   await round(page).selectOption('0');
  174 |   await counts(page, { totalAlive: ['80', '80', '0'], sharePct: ['10%', '0%', '-10 percentage points'] });
  175 |   await page.getByLabel('Snapshot B', { exact: true }).selectOption('7');
  176 |   await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0); await expect(round(page)).toHaveCount(0);
  177 |   await expect(page.locator('#micro-resistance-comparison-download-text')).toBeDisabled();
  178 |   await page.getByLabel('Snapshot B', { exact: true }).selectOption(''); await expect(round(page)).toHaveCount(0);
  179 |   await page.getByLabel('Snapshot B', { exact: true }).selectOption('9'); await round(page).selectOption('0');
  180 |   const before = await state(page); await open(page.locator('.micro-resistance-saved'));
  181 |   await page.locator('#micro-resistance-evidence-9').click(); await page.getByRole('button', { name: 'Remove selected evidence', exact: true }).click();
  182 |   await expect(page.getByLabel('Snapshot B', { exact: true })).toHaveValue('');
  183 |   await expect(round(page)).toHaveCount(0); await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0);
  184 |   expect((await state(page)).microbiology.resistanceInvestigation).toEqual(before.microbiology.resistanceInvestigation);
  185 |   await reload(page); await expect(round(page)).toHaveCount(0);
  186 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  187 | });
  188 | 
  189 | test('explicitly selecting a repaired identifier preserves every raw imported snapshot, long note, recovery and comparison preference', async ({ page }) => {
  190 |   const data = seed(); data.resistanceNotebook.records = [record('broken', snapshotA), record(1, snapshotB), null,
  191 |     { id: 88, evidence: 'Malformed imported evidence stays raw.', metadata: { literal } }, record(9, extinct)];
  192 |   data.resistanceComparison = { ...data.resistanceComparison, aId: null, bId: 1, round: 0 };
  193 |   await mount(page, data); const before = await state(page);
  194 |   await expect(page.getByLabel('Snapshot A', { exact: true }).locator('option[value="2"]')).toHaveCount(1);
  195 |   await page.getByLabel('Snapshot A', { exact: true }).selectOption('2');
  196 |   const expected = withPair(before, 2, 1, null); expected.microbiology.resistanceNotebook.records[0].id = 2;
  197 |   expect(await state(page)).toEqual(expected);
  198 |   expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  199 |   expect((await state(page)).microbiology.resistanceNotebook.records[1].reviewNote).toBe(longNote);
  200 |   await round(page).selectOption('0'); await counts(page, { resistant: ['8', '8', '0'], totalAlive: ['80', '80', '0'] });
  201 |   const saved = await reload(page); expect(saved.microbiology.resistanceNotebook).toEqual(expected.microbiology.resistanceNotebook);
  202 |   expect(saved.microbiology.resistanceComparison).toEqual({ ...expected.microbiology.resistanceComparison, round: 0 });
  203 |   expect(await page.evaluate(() => Boolean((window as any).__roundInjected))).toBe(false);
  204 |   await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  205 | });
  206 | 
  207 | test('round selection retains concurrent unrelated edits and rejects replacement imports, newer pairs and another active tab', async ({ page }) => {
  208 |   for (const mode of ['unrelated', 'import', 'pair', 'tab'] as const) {
  209 |     await mount(page); await choose(page);
  210 |     await page.evaluate(mode => {
  211 |       const w = window as any, original = w.__ctx.setToolData;
  212 |       w.__roundBaseSetter = original; w.__roundRaceConsumed = false;
  213 |       const intercept = (update: any) => {
  214 |         if (typeof update === 'function' && !w.__roundRaceConsumed) {
  215 |           w.__roundRaceConsumed = true;
  216 |           original((previous: any) => {
  217 |             const micro = previous.microbiology;
  218 |             let next: any;
  219 |             if (mode === 'import') { next = JSON.parse(JSON.stringify(previous)); next.microbiology.metadata.imported = true; }
  220 |             else next = { ...previous, unrelatedTool: { ...previous.unrelatedTool, concurrent: true }, microbiology: { ...micro,
  221 |               resistanceNotebook: { ...micro.resistanceNotebook, concurrentNotebookMetadata: ['Keep the newest metadata.'] },
  222 |               resistanceComparison: { ...micro.resistanceComparison, concurrentPreference: true },
  223 |               ...(mode === 'pair' ? { resistanceComparison: { ...micro.resistanceComparison, bId: 9, round: null, concurrentPreference: true } } : {}),
  224 |               ...(mode === 'tab' ? { tab: 'quiz' } : {}) } };
  225 |             w.__roundRaceExpected = JSON.parse(JSON.stringify(next));
  226 |             if (mode === 'unrelated') w.__roundRaceExpected.microbiology.resistanceComparison.round = 0;
  227 |             return next;
  228 |           });
  229 |         }
  230 |         original(update);
  231 |       };
  232 |       w.__ctx.setToolData = intercept; w.__ctx.setLabToolData = intercept; w.__rerender();
  233 |     }, mode);
  234 |     await round(page).selectOption('0');
  235 |     expect(await page.evaluate(() => (window as any).__roundRaceConsumed)).toBe(true);
  236 |     expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__roundRaceExpected));
  237 |     expect(await counters(page)).toEqual({ xp: [], random: 0 });
  238 |     await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__roundBaseSetter; w.__ctx.setLabToolData = w.__roundBaseSetter; w.__rerender(); });
  239 |     await harness.unmount(page);
  240 |   }
  241 | });
  242 | 
  243 | test('a failed download retains the chosen round and retries with that same observed evidence', async ({ page }) => {
  244 |   await mount(page); await choose(page); await round(page).selectOption('1'); const before = await state(page);
  245 |   await page.evaluate(() => { (window as any).__roundObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated comparison download failure'); }; });
  246 |   const button = page.locator('#micro-resistance-comparison-download-text'); await button.focus(); await button.press('Enter');
  247 |   await expect(page.locator('#micro-resistance-comparison-export-status')).toContainText('could not download');
  248 |   await expect(button).toBeFocused(); await expect(round(page)).toHaveValue('1'); expect(await state(page)).toEqual(before);
  249 |   await page.evaluate(() => { URL.createObjectURL = (window as any).__roundObjectURL; delete (window as any).__roundObjectURL; });
  250 |   const file = await download(page, 'text', 'resistance-round-retry.txt');
  251 |   expect(file.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt'); expect(file.text).toContain('Shared comparison round: 1');
  252 |   await expect(page.locator('#micro-resistance-comparison-export-status')).toContainText('download has started');
  253 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  254 | });
  255 | 
  256 | test('earlier-round inspection works by keyboard at 320 pixels and 400 percent zoom without clipped controls or counts', async ({ page }) => {
  257 |   await mount(page); await choose(page); await page.setViewportSize({ width: 320, height: 844 });
  258 |   const before = await state(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  259 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  260 |   expect(await state(page)).toEqual(withPair(before, 7, 4, 0));
  261 |   await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  262 |   await noOverflow(page); await panel(page).screenshot({ path: path.join(out, 'resistance-round-phone.png') });
  263 |   const latest = page.locator('#micro-resistance-comparison-latest'); await latest.focus(); await latest.press('Enter');
> 264 |   await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
      |                                                                   ^ Error: expect(locator).toBeFocused() failed
  265 |   expect(await state(page)).toEqual(withPair(before, 7, 4, null));
  266 |   await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  267 |   await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  268 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused(); await noOverflow(page);
  269 |   await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 0');
  270 |   await panel(page).screenshot({ path: path.join(out, 'resistance-round-400-percent.png') });
  271 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  272 | });
  273 | 
```