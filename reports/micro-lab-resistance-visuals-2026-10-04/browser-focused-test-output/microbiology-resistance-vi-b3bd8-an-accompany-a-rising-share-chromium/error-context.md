# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-visuals.spec.ts >> plots saved resistant counts and rounded shares on fixed axes so falling counts can accompany a rising share
- Location: tests\e2e\microbiology-resistance-visuals.spec.ts:119:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 2
Received:    1
```

# Test source

```ts
  24  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  25  | 
  26  | const snapshotA = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: longNote,
  27  |   history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }, { day: 2, sensitive: 50, resistant: 8 }, { day: 3, sensitive: 40, resistant: 8 }] };
  28  | const snapshotB = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: literal,
  29  |   history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }, { day: 2, sensitive: 0, resistant: 4 }] };
  30  | const extinct = { dose: 100, duration: 3, initRes: 0, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true, notes: 'No survivors at round 1.',
  31  |   history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };
  32  | function record(id: number | string, evidence: any) {
  33  |   return { id, evidence: { ...clone(evidence), importedEvidence: { literal } }, reviewNote: longNote, importedRecord: { literal, original: ['Preserve provenance.'] } };
  34  | }
  35  | function seed(): Record<string, any> {
  36  |   return { tab: 'resistance', showMicroLibrary: false, earnedXP: 53,
  37  |     resistanceInvestigation: { dose: 0, duration: 3, initRes: 10, prediction: 'similar', notes: 'Independent current culture notes.',
  38  |       history: [0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 })), runAwarded: true, explanationAwarded: false },
  39  |     resistanceNotebook: { records: [record(7, snapshotA), record(4, snapshotB), record(9, extinct)], selectedId: 7, nextId: 40,
  40  |       importedNotebook: { literal }, removed: { record: record(30, snapshotB), index: 1, importedRecovery: true } },
  41  |     resistanceComparison: { aId: 7, bId: 4, round: null, rawPreference: { literal, keep: true } },
  42  |     growthLab: { profile: 'ecoli', tempC: 18, pH: 7, oxygen: 100, hypothesis: 'Keep the next Growth hypothesis.' },
  43  |     metadata: { literal, notes: 'Keep unrelated Micro Lab state.' } };
  44  | }
  45  | async function open(details: Locator) {
  46  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
  47  |     await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  48  |   }
  49  |   await expect(details).toHaveAttribute('open', '');
  50  | }
  51  | async function instrument(page: Page) {
  52  |   await page.evaluate(() => {
  53  |     const w = window as any;
  54  |     w.__visualXP = []; w.__visualRandom = 0; w.__ctx.awardXP = (...args: any[]) => w.__visualXP.push(args);
  55  |     if (!w.__visualOriginalRandom) {
  56  |       w.__visualOriginalRandom = Math.random;
  57  |       Math.random = () => { w.__visualRandom++; return w.__visualOriginalRandom(); };
  58  |     }
  59  |     w.__rerender();
  60  |   });
  61  | }
  62  | async function mount(page: Page, data = seed()) {
  63  |   await page.setViewportSize({ width: 1280, height: 960 });
  64  |   await harness.mount(page, { unrelatedTool: { note: literal, metadata: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  65  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  66  |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(data.resistanceInvestigation.history.length - 1);
  67  |   await open(panel(page)); await instrument(page);
  68  | }
  69  | const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__visualXP, random: (window as any).__visualRandom }));
  70  | function withRound(before: any, selectedRound: number | null) {
  71  |   const expected = clone(before); expected.microbiology.resistanceComparison.round = selectedRound; return expected;
  72  | }
  73  | async function geometry(node: Locator) {
  74  |   return node.evaluate(element => {
  75  |     const svg = element as SVGSVGElement, guide = svg.querySelector('[data-resistance-history-guide]')!;
  76  |     const numbers = (name: string) => Number(guide.getAttribute(name));
  77  |     const points = [...svg.querySelectorAll('[data-resistance-history-marker]')].map(point => {
  78  |       const box = (point as SVGGraphicsElement).getBBox();
  79  |       return { series: point.getAttribute('data-resistance-history-marker'), round: Number(point.getAttribute('data-round')),
  80  |         value: Number(point.getAttribute('data-value')), x: box.x + box.width / 2, y: box.y + box.height / 2, tag: point.tagName.toLowerCase() };
  81  |     });
  82  |     return { min: Number(svg.getAttribute('data-min')), max: Number(svg.getAttribute('data-max')), last: Number(svg.getAttribute('data-last-round')),
  83  |       guide: { round: Number(guide.getAttribute('data-resistance-history-guide')), x: numbers('x1'), top: numbers('y1'), bottom: numbers('y2') }, points };
  84  |   });
  85  | }
  86  | async function assertGeometry(page: Page, metric: 'count' | 'share', expectedA: number[], expectedB: number[], selectedRound: number) {
  87  |   const model = await geometry(chart(page, metric));
  88  |   expect(model.min).toBe(0); expect(model.max).toBe(metric === 'count' ? 80 : 100); expect(model.last).toBe(2);
  89  |   expect(model.guide.round).toBe(selectedRound); expect(model.guide.bottom).toBeGreaterThan(model.guide.top);
  90  |   for (const [series, values] of [['a', expectedA], ['b', expectedB]] as const) {
  91  |     const points = model.points.filter(point => point.series === series); expect(points.map(point => point.round)).toEqual([0, 1, 2]);
  92  |     expect(points.map(point => point.value)).toEqual(values);
  93  |     for (const point of points) expect(point.y).toBeCloseTo(model.guide.bottom - point.value / model.max * (model.guide.bottom - model.guide.top), 1);
  94  |     expect(points[1].x).toBeCloseTo((points[0].x + points[2].x) / 2, 1);
  95  |     expect(points[selectedRound].x).toBeCloseTo(model.guide.x, 1);
  96  |   }
  97  |   const aTags = [...new Set(model.points.filter(point => point.series === 'a').map(point => point.tag))];
  98  |   const bTags = [...new Set(model.points.filter(point => point.series === 'b').map(point => point.tag))];
  99  |   expect(aTags).toEqual(['circle']); expect(bTags).not.toEqual(aTags);
  100 |   const a = chart(page, metric).locator('[data-resistance-series="a"]'), b = chart(page, metric).locator('[data-resistance-series="b"]');
  101 |   await expect(a).toHaveCount(1); await expect(b).toHaveCount(1);
  102 |   expect([null, '', 'none']).toContain(await a.getAttribute('stroke-dasharray')); expect(await b.getAttribute('stroke-dasharray')).toMatch(/[1-9]/);
  103 | }
  104 | async function download(page: Page, format: 'text' | 'csv', name: string) {
  105 |   const pending = page.waitForEvent('download'); await page.locator('#micro-resistance-comparison-download-' + format).click();
  106 |   const file = await pending, text = readFileSync((await file.path())!, 'utf8');
  107 |   await file.saveAs(path.join(out, name)); return { text, filename: file.suggestedFilename() };
  108 | }
  109 | async function noOverflow(page: Page) {
  110 |   const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  111 |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  112 |   for (const node of [page.locator('[data-microbiology-tool]'), panel(page), chart(page, 'count').locator('..'), chart(page, 'share').locator('..'),
  113 |     page.locator('#micro-resistance-history-table'), round(page).locator('..')]) {
  114 |     const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
  115 |     expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  116 |   }
  117 | }
  118 | 
  119 | test('plots saved resistant counts and rounded shares on fixed axes so falling counts can accompany a rising share', async ({ page }) => {
  120 |   await mount(page); const before = await state(page);
  121 |   for (const metric of ['count', 'share'] as const) {
  122 |     await expect(chart(page, metric)).toHaveAttribute('role', 'img');
  123 |     const names = (await chart(page, metric).getAttribute('aria-labelledby'))!.split(/\s+/);
> 124 |     expect(names.length).toBeGreaterThanOrEqual(2);
      |                          ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  125 |     for (const id of names) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
  126 |     await expect(chart(page, metric).locator('text')).toHaveCount(0);
  127 |   }
  128 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 2);
  129 |   await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 2);
  130 |   const countGeometry = await geometry(chart(page, 'count')), shareGeometry = await geometry(chart(page, 'share'));
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
```