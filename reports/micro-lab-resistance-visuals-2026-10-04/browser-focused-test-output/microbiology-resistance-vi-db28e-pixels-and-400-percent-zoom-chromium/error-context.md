# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-visuals.spec.ts >> plots keep readable HTML axes and selected values at 320 pixels and 400 percent zoom
- Location: tests\e2e\microbiology-resistance-visuals.spec.ts:224:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 200
Received:   177
```

# Test source

```ts
  131 |   expect(countGeometry.points.map(point => point.x)).toEqual(shareGeometry.points.map(point => point.x));
  132 |   for (const metric of ['count', 'share'] as const) {
  133 |     await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2'); await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '2');
  134 |   }
  135 |   await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*4/);
  136 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*14%.*B.*100%/);
  137 |   await open(page.locator('#micro-resistance-history-data'));
  138 |   const table = page.locator('#micro-resistance-history-table'); await expect(table.locator('thead th')).toHaveCount(5);
  139 |   await expect(table.locator('tbody tr')).toHaveCount(3);
  140 |   await expect(table.locator('tr[data-round="0"] td')).toHaveText(['8', '8', '10%', '10%']);
  141 |   await expect(table.locator('tr[data-round="1"] td')).toHaveText(['8', '6', '12%', '75%']);
  142 |   await expect(table.locator('tr[data-round="2"] td')).toHaveText(['8', '4', '14%', '100%']);
  143 |   await round(page).selectOption('1');
  144 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
  145 |   await expect(page.locator('[data-resistance-history-readout="count"]')).toHaveAttribute('data-round', '1');
  146 |   await expect(page.locator('[data-resistance-history-readout="share"]')).toHaveAttribute('data-round', '1');
  147 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*12%.*B.*75%/);
  148 |   expect(await state(page)).toEqual(withRound(before, 1)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  149 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-divergence-desktop.png') });
  150 | });
  151 | 
  152 | test('shows a real zero count at extinction while omitting the undefined share and every unobserved tail', async ({ page }) => {
  153 |   const data = seed(); data.resistanceComparison.bId = 9; await mount(page, data); const before = await state(page);
  154 |   await expect(chart(page, 'count')).toHaveAttribute('data-last-round', '1'); await expect(chart(page, 'share')).toHaveAttribute('data-last-round', '1');
  155 |   await expect(marker(page, 'count', 'a')).toHaveCount(2); await expect(marker(page, 'count', 'b')).toHaveCount(2);
  156 |   await expect(marker(page, 'share', 'a')).toHaveCount(2); await expect(marker(page, 'share', 'b')).toHaveCount(1);
  157 |   await expect(chart(page, 'count').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveAttribute('data-value', '0');
  158 |   await expect(chart(page, 'share').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveCount(0);
  159 |   await expect(selected(page, 'count', 'b')).toHaveAttribute('data-value', '0'); await expect(selected(page, 'share', 'b')).toHaveCount(0);
  160 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText('Undefined');
  161 |   const bSharePath = await chart(page, 'share').locator('[data-resistance-series="b"]').getAttribute('d');
  162 |   expect(bSharePath || '').not.toMatch(/[LlHhVvCcSsQqTtAa]/);
  163 |   for (const metric of ['count', 'share'] as const) {
  164 |     const values = await marker(page, metric, 'a').evaluateAll(points => points.map(point => Number(point.getAttribute('data-round')))); expect(values).toEqual([0, 1]);
  165 |     await expect(chart(page, metric).locator('[data-round="2"], [data-round="3"]')).toHaveCount(0);
  166 |   }
  167 |   await open(page.locator('#micro-resistance-history-data'));
  168 |   await expect(page.locator('#micro-resistance-history-table tbody tr')).toHaveCount(2);
  169 |   await expect(page.locator('#micro-resistance-history-table tr[data-round="1"] td')).toHaveText(['8', '0', '12%', 'Undefined']);
  170 |   await round(page).selectOption('0'); await expect(selected(page, 'share', 'b')).toHaveAttribute('data-value', '0');
  171 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*0%/);
  172 |   expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  173 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-extinction.png') });
  174 | });
  175 | 
  176 | test('keyboard round changes update both plots, restore after JSON reload and agree with the comparison downloads', async ({ page }) => {
  177 |   await mount(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  178 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  179 |   await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  180 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '1');
  181 |   await expect(page.locator('#micro-resistance-history-selected-round')).toContainText('1');
  182 |   const saved = clone(await state(page)); await harness.unmount(page); await page.evaluate(value => (window as any).__mount(value), saved);
  183 |   await open(panel(page)); await instrument(page); await expect(round(page)).toHaveValue('1'); expect(await state(page)).toEqual(saved);
  184 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '1');
  185 |   const text = await download(page, 'text', 'resistance-visual-selected-round.txt');
  186 |   expect(text.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt');
  187 |   expect(text.text).toContain('Shared comparison round: 1'); expect(text.text).toContain('Resistant cells\t8\t6\t-2');
  188 |   expect(text.text).toContain('Resistant share\t12%\t75%\t+63 percentage points');
  189 |   const csv = await download(page, 'csv', 'resistance-visual-selected-round.csv');
  190 |   expect(csv.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.csv'); expect(csv.text).toContain('"shared_round"');
  191 |   const latest = page.locator('#micro-resistance-comparison-latest'); await latest.focus(); await latest.press('Enter');
  192 |   await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
  193 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2');
  194 |   expect(await state(page)).toEqual(withRound(saved, null)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  195 |   writeFileSync(path.join(out, 'resistance-visual-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  196 | });
  197 | 
  198 | test('opening and inspecting charts preserves raw imports without random draws or XP while live playback keeps its own culture', async ({ page }) => {
  199 |   const data = seed(); data.resistanceNotebook.records.splice(1, 0, null, { id: 88, evidence: 'Malformed evidence stays raw.', imported: literal });
  200 |   await mount(page, data); const before = await state(page); await open(page.locator('#micro-resistance-history-data'));
  201 |   await round(page).selectOption('0'); await round(page).selectOption('1'); await round(page).selectOption('');
  202 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  203 |   expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  204 |   expect(await page.evaluate(() => Boolean((window as any).__visualInjected))).toBe(false);
  205 |   await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0); await harness.unmount(page);
  206 |   const live = seed(); live.resistanceInvestigation.history = [{ day: 0, sensitive: 72, resistant: 8 }];
  207 |   live.resistanceInvestigation.runAwarded = false; live.resistanceInvestigation.duration = 30;
  208 |   await mount(page, live); const savedBook = clone((await state(page)).microbiology.resistanceNotebook);
  209 |   const paths = await page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  210 |   await page.getByRole('button', { name: '▶ Play', exact: true }).click();
  211 |   await round(page).selectOption('0'); await expect(round(page)).toHaveValue('0');
  212 |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBeGreaterThan(0);
  213 |   await page.getByRole('button', { name: '⏸ Pause', exact: true }).click();
  214 |   const paused = await state(page), draws = await counters(page);
  215 |   expect(paused.microbiology.resistanceNotebook).toEqual(savedBook);
  216 |   expect(paused.microbiology.resistanceInvestigation.notes).toBe('Independent current culture notes.');
  217 |   expect(paused.microbiology.resistanceInvestigation.history.every((point: any) => point.sensitive === 72 && point.resistant === 8)).toBe(true);
  218 |   expect(draws.random).toBeGreaterThan(0); expect(draws.xp).toEqual([]);
  219 |   expect(await page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(paths);
  220 |   await round(page).selectOption('1'); await open(page.locator('#micro-resistance-history-data'));
  221 |   expect(await counters(page)).toEqual(draws); expect(await state(page)).toEqual(withRound(paused, 1));
  222 | });
  223 | 
  224 | test('plots keep readable HTML axes and selected values at 320 pixels and 400 percent zoom', async ({ page }) => {
  225 |   await mount(page); await open(page.locator('#micro-resistance-history-data')); const before = await state(page);
  226 |   await page.setViewportSize({ width: 320, height: 844 }); await round(page).selectOption('1'); await noOverflow(page);
  227 |   for (const metric of ['count', 'share'] as const) {
  228 |     const readout = page.locator('[data-resistance-history-readout="' + metric + '"]'); await expect(readout).toBeVisible();
  229 |     expect(await readout.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
  230 |     const svg = chart(page, metric); await expect(svg).toBeVisible(); await expect(svg.locator('text')).toHaveCount(0);
> 231 |     const box = await svg.boundingBox(); expect(box!.width).toBeGreaterThan(200);
      |                                                             ^ Error: expect(received).toBeGreaterThan(expected)
  232 |   }
  233 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visuals-phone-320.png') });
  234 |   await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  235 |   await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  236 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused(); await noOverflow(page);
  237 |   await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*8/);
  238 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*10%/);
  239 |   for (const metric of ['count', 'share'] as const) await expect(page.locator('[data-resistance-history-readout="' + metric + '"]')).toBeVisible();
  240 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visuals-400-percent.png') });
  241 |   expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  242 | });
  243 | 
  244 | test('missing, duplicate or malformed snapshot choices show no invented history plots or selected points', async ({ page }) => {
  245 |   const choices = [
  246 |     { aId: 7, bId: null, round: 1 }, { aId: 7, bId: 7, round: 1 },
  247 |     { aId: 99, bId: 4, round: 1 }, { aId: 'broken', bId: 4, round: 1 }
  248 |   ];
  249 |   for (const pair of choices) {
  250 |     const data = seed(); data.resistanceComparison = { ...data.resistanceComparison, ...pair };
  251 |     await mount(page, data); const before = await state(page);
  252 |     await expect(chart(page, 'count')).toHaveCount(0); await expect(chart(page, 'share')).toHaveCount(0);
  253 |     await expect(page.locator('[data-resistance-selected-marker]')).toHaveCount(0);
  254 |     await expect(page.locator('#micro-resistance-history-table')).toHaveCount(0); await expect(round(page)).toHaveCount(0);
  255 |     await expect(page.locator('#micro-resistance-comparison-unavailable')).toBeVisible();
  256 |     await expect(page.locator('#micro-resistance-comparison-download-text')).toBeDisabled();
  257 |     expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  258 |   }
  259 | });
  260 | 
```