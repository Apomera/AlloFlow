# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-rounds.spec.ts >> restores an explicit round after JSON reload and resets it when either snapshot changes
- Location: tests\e2e\microbiology-resistance-rounds.spec.ts:148:5

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
    32 × locator resolved to <button disabled type="button" id="micro-resistance-comparison-latest">Return to latest shared round</button>
       - unexpected value "inactive"

```

```yaml
- button "Return to latest shared round" [disabled]
```

# Test source

```ts
  59  | }
  60  | async function mount(page: Page, data = seed()) {
  61  |   await page.setViewportSize({ width: 1280, height: 960 });
  62  |   await harness.mount(page, { unrelatedTool: { note: literal, metadata: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  63  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  64  |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(3);
  65  |   await open(panel(page)); await instrument(page);
  66  | }
  67  | async function choose(page: Page, a = '7', b = '4') {
  68  |   await page.getByLabel('Snapshot A', { exact: true }).selectOption(a);
  69  |   await page.getByLabel('Snapshot B', { exact: true }).selectOption(b);
  70  | }
  71  | async function counters(page: Page) {
  72  |   return page.evaluate(() => ({ xp: (window as any).__roundXP, random: (window as any).__roundRandom }));
  73  | }
  74  | function withPair(before: any, aId: number | null, bId: number | null, selectedRound: number | null) {
  75  |   const expected = clone(before);
  76  |   Object.assign(expected.microbiology.resistanceComparison, { aId, bId, round: selectedRound });
  77  |   return expected;
  78  | }
  79  | async function counts(page: Page, values: Record<string, string[]>) {
  80  |   for (const [metric, cells] of Object.entries(values)) await expect(row(page, metric).locator('td')).toHaveText(cells);
  81  | }
  82  | async function reload(page: Page) {
  83  |   const saved = clone(await state(page)); await harness.unmount(page);
  84  |   await page.evaluate(value => (window as any).__mount(value), saved);
  85  |   await open(panel(page)); await instrument(page); expect(await state(page)).toEqual(saved); return saved;
  86  | }
  87  | async function download(page: Page, format: 'text' | 'csv', name: string) {
  88  |   const pending = page.waitForEvent('download'); await page.locator('#micro-resistance-comparison-download-' + format).click();
  89  |   const file = await pending, text = readFileSync((await file.path())!, 'utf8');
  90  |   await file.saveAs(path.join(out, name)); return { text, filename: file.suggestedFilename() };
  91  | }
  92  | function parseCSV(text: string): Record<string, string>[] {
  93  |   const lines = text.split('\r\n').map(line => Array.from(line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g), match => match[1].replace(/""/g, '"')));
  94  |   const headers = lines.shift()!;
  95  |   return lines.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  96  | }
  97  | async function noOverflow(page: Page) {
  98  |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  99  |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  100 |   for (const node of [page.locator('[data-microbiology-tool]'), panel(page), round(page).locator('..'), page.locator('#micro-resistance-comparison-table')]) {
  101 |     const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  102 |     expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  103 |   }
  104 | }
  105 | 
  106 | test('inspects initial and earlier observed rounds while keeping original endpoints, annotations and the current culture intact', async ({ page }) => {
  107 |   await mount(page); const before = await state(page); await choose(page);
  108 |   await expect(round(page)).toHaveValue('');
  109 |   await expect(round(page).locator('option')).toHaveCount(4);
  110 |   await expect(page.locator('#micro-resistance-comparison-round')).toContainText('2');
  111 |   await counts(page, { sensitive: ['50', '0', '-50'], resistant: ['8', '4', '-4'], totalAlive: ['58', '4', '-54'], sharePct: ['14%', '100%', '+86 percentage points'] });
  112 |   expect(await state(page)).toEqual(withPair(before, 7, 4, null));
  113 |   await round(page).selectOption('0');
  114 |   await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 0');
  115 |   await counts(page, { sensitive: ['72', '72', '0'], resistant: ['8', '8', '0'], totalAlive: ['80', '80', '0'], sharePct: ['10%', '10%', '0 percentage points'] });
  116 |   expect(await state(page)).toEqual(withPair(before, 7, 4, 0));
  117 |   await round(page).selectOption('1');
  118 |   await counts(page, { sensitive: ['60', '2', '-58'], resistant: ['8', '6', '-2'], totalAlive: ['68', '8', '-60'], sharePct: ['12%', '75%', '+63 percentage points'] });
  119 |   expect(await state(page)).toEqual(withPair(before, 7, 4, 1));
  120 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  121 |   await panel(page).screenshot({ path: path.join(out, 'resistance-earlier-round-desktop.png') });
  122 | });
  123 | 
  124 | test('downloads the selected observed round in text and CSV while retaining each original saved endpoint and full history', async ({ page }) => {
  125 |   await mount(page); await choose(page); await round(page).selectOption('1'); const before = await state(page);
  126 |   const text = await download(page, 'text', 'resistance-round-1.txt');
  127 |   expect(text.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt');
  128 |   expect(text.text).toContain('Shared comparison round: 1'); expect(text.text).toContain('Latest shared observed round: 2');
  129 |   expect(text.text).toContain('Sensitive cells\t60\t2\t-58'); expect(text.text).toContain('Resistant cells\t8\t6\t-2');
  130 |   expect(text.text).toContain('Resistant share\t12%\t75%\t+63 percentage points');
  131 |   expect(text.text).toContain('Snapshot A: Evidence 7; saved history ends at round 3');
  132 |   expect(text.text).toContain('Snapshot B: Evidence 4; saved history ends at round 2');
  133 |   expect(text.text).toContain('3\t40\t8\t48\t17%'); expect(text.text).toContain('2\t0\t4\t4\t100%');
  134 |   const csv = await download(page, 'csv', 'resistance-round-1.csv');
  135 |   expect(csv.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.csv'); const parsed = parseCSV(csv.text);
  136 |   expect(parsed).toHaveLength(3);
  137 |   for (const line of parsed) { expect(line.shared_round).toBe('1'); expect(line.comparison_a_id).toBe('7'); expect(line.comparison_b_id).toBe('4'); }
  138 |   expect(parsed[0]).toMatchObject({ row_kind: 'snapshot_a', shared_sensitive_cells: '60', shared_resistant_cells: '8', shared_total_alive: '68',
  139 |     shared_resistant_share_pct_rounded: '12', saved_end_round: '3', saved_end_sensitive_cells: '40', saved_end_resistant_cells: '8', saved_end_total_alive: '48' });
  140 |   expect(parsed[1]).toMatchObject({ row_kind: 'snapshot_b', shared_sensitive_cells: '2', shared_resistant_cells: '6', shared_total_alive: '8',
  141 |     shared_resistant_share_pct_rounded: '75', saved_end_round: '2', saved_end_sensitive_cells: '0', saved_end_resistant_cells: '4', saved_end_total_alive: '4',
  142 |     written_evidence: "'=SUM(A1:A2) is literal imported evidence." });
  143 |   expect(parsed[2]).toMatchObject({ row_kind: 'difference_b_minus_a', shared_sensitive_cells: '-58', shared_resistant_cells: '-2',
  144 |     shared_total_alive: '-60', shared_share_difference_percentage_points: '63', saved_end_round: '' });
  145 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  146 | });
  147 | 
  148 | test('restores an explicit round after JSON reload and resets it when either snapshot changes', async ({ page }) => {
  149 |   await mount(page); await choose(page); await round(page).selectOption('1'); const saved = await reload(page);
  150 |   await expect(round(page)).toHaveValue('1'); await expect(page.locator('#micro-resistance-comparison-table caption')).toContainText('round 1');
  151 |   await page.getByLabel('Snapshot B', { exact: true }).selectOption('9');
  152 |   await expect(round(page)).toHaveValue(''); expect(await state(page)).toEqual(withPair(saved, 7, 9, null));
  153 |   await expect(round(page).locator('option')).toHaveCount(3);
  154 |   await round(page).selectOption('0'); const selected = await state(page);
  155 |   await page.getByLabel('Snapshot A', { exact: true }).selectOption('4');
  156 |   await expect(round(page)).toHaveValue(''); expect(await state(page)).toEqual(withPair(selected, 4, 9, null));
  157 |   const latest = page.locator('#micro-resistance-comparison-latest'); await expect(latest).toBeDisabled();
  158 |   await round(page).selectOption('0'); await expect(latest).toBeEnabled(); await latest.focus(); await latest.press('Enter');
> 159 |   await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
      |                                                                   ^ Error: expect(locator).toBeFocused() failed
  160 |   await expect(page.locator('#micro-resistance-comparison-table caption')).toContainText('round 1');
  161 |   const data = await reload(page); expect(data.microbiology.resistanceComparison).toMatchObject({ aId: 4, bId: 9, round: null });
  162 |   writeFileSync(path.join(out, 'resistance-round-restored-state.json'), JSON.stringify(data, null, 2) + '\n');
  163 |   await harness.unmount(page);
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
```