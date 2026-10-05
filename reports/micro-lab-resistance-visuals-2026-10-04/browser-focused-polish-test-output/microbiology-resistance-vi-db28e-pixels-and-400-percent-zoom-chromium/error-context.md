# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-resistance-visuals.spec.ts >> plots keep readable HTML axes and selected values at 320 pixels and 400 percent zoom
- Location: tests\e2e\microbiology-resistance-visuals.spec.ts:255:5

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 189
Received: 160

Expected precision:    0
Expected difference: < 0.5
Received difference:   29

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
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
  118 | async function assertHistoryTableKeyboardScroll(page: Page) {
  119 |   const table = page.locator('#micro-resistance-history-table');
  120 |   const region = page.getByRole('region', { name: 'Shared Resistance history data', exact: true });
  121 |   await expect(region).toHaveAttribute('tabindex', '0');
  122 |   await expect(region.locator('#micro-resistance-history-table')).toHaveCount(1);
  123 |   const header = table.locator('thead th').first();
  124 |   await expect(header).toHaveText('Round');
  125 |   const headerLines = await header.evaluate(node => {
  126 |     const range = document.createRange(); range.selectNodeContents(node);
  127 |     return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).length;
  128 |   });
  129 |   expect(headerLines).toBe(1);
  130 |   const layout = await region.evaluate(node => {
  131 |     const element = node as HTMLElement, box = element.getBoundingClientRect();
  132 |     const panel = document.querySelector('#micro-resistance-comparison')!.getBoundingClientRect();
  133 |     return { client: element.clientWidth, scroll: element.scrollWidth, overflowX: getComputedStyle(element).overflowX,
  134 |       left: box.left, right: box.right, panelLeft: panel.left, panelRight: panel.right };
  135 |   });
  136 |   expect(layout.client).toBeGreaterThan(0); expect(layout.scroll).toBeGreaterThan(layout.client + 1);
  137 |   expect(layout.overflowX).toBe('auto');
  138 |   expect(layout.left).toBeGreaterThanOrEqual(layout.panelLeft - 1); expect(layout.right).toBeLessThanOrEqual(layout.panelRight + 1);
  139 |   await region.evaluate(node => { node.scrollLeft = 0; }); await region.focus(); await expect(region).toBeFocused();
  140 |   for (let index = 0; index < 16; index++) await region.press('ArrowRight');
> 141 |   await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeCloseTo(layout.scroll - layout.client, 0);
      |                                                                     ^ Error: expect(received).toBeCloseTo(expected, precision)
  142 |   const afterRight = await region.evaluate(node => node.scrollLeft); expect(afterRight).toBeGreaterThan(0);
  143 |   for (let index = 0; index < 16; index++) await region.press('ArrowLeft');
  144 |   await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeCloseTo(0, 0);
  145 |   expect(await region.evaluate(node => node.scrollLeft)).toBeLessThan(afterRight); await expect(region).toBeFocused();
  146 | }
  147 | 
  148 | test('plots saved resistant counts and rounded shares on fixed axes so falling counts can accompany a rising share', async ({ page }) => {
  149 |   await mount(page); const before = await state(page);
  150 |   for (const metric of ['count', 'share'] as const) {
  151 |     await expect(chart(page, metric)).toHaveAttribute('role', 'img');
  152 |     const names = [(await chart(page, metric).getAttribute('aria-labelledby'))!, (await chart(page, metric).getAttribute('aria-describedby'))!].join(' ').split(/\s+/);
  153 |     expect(names).toContain('micro-resistance-history-' + metric + '-title');
  154 |     expect(names).toContain('micro-resistance-history-' + metric + '-description');
  155 |     expect(names.length).toBeGreaterThanOrEqual(2);
  156 |     for (const id of names) { await expect(page.locator('[id="' + id + '"]')).toHaveCount(1); expect(await page.locator('[id="' + id + '"]').textContent()).toBeTruthy(); }
  157 |     await expect(chart(page, metric).locator('text')).toHaveCount(0);
  158 |   }
  159 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 2);
  160 |   await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 2);
  161 |   const countGeometry = await geometry(chart(page, 'count')), shareGeometry = await geometry(chart(page, 'share'));
  162 |   expect(countGeometry.points.map(point => point.x)).toEqual(shareGeometry.points.map(point => point.x));
  163 |   for (const metric of ['count', 'share'] as const) {
  164 |     await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2'); await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '2');
  165 |   }
  166 |   await expect(page.locator('#micro-resistance-history-count-value')).toContainText(/A.*8.*B.*4/);
  167 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*14%.*B.*100%/);
  168 |   await open(page.locator('#micro-resistance-history-data'));
  169 |   const table = page.locator('#micro-resistance-history-table'); await expect(table.locator('thead th')).toHaveCount(5);
  170 |   await expect(table.locator('tbody tr')).toHaveCount(3);
  171 |   await expect(table.locator('tr[data-round="0"] td')).toHaveText(['8', '8', '10%', '10%']);
  172 |   await expect(table.locator('tr[data-round="1"] td')).toHaveText(['8', '6', '12%', '75%']);
  173 |   await expect(table.locator('tr[data-round="2"] td')).toHaveText(['8', '4', '14%', '100%']);
  174 |   await round(page).selectOption('1');
  175 |   await assertGeometry(page, 'count', [8, 8, 8], [8, 6, 4], 1); await assertGeometry(page, 'share', [10, 12, 14], [10, 75, 100], 1);
  176 |   await expect(page.locator('[data-resistance-history-readout="count"]')).toHaveAttribute('data-round', '1');
  177 |   await expect(page.locator('[data-resistance-history-readout="share"]')).toHaveAttribute('data-round', '1');
  178 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*12%.*B.*75%/);
  179 |   expect(await state(page)).toEqual(withRound(before, 1)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  180 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-divergence-desktop.png') });
  181 | });
  182 | 
  183 | test('shows a real zero count at extinction while omitting the undefined share and every unobserved tail', async ({ page }) => {
  184 |   const data = seed(); data.resistanceComparison.bId = 9; await mount(page, data); const before = await state(page);
  185 |   await expect(chart(page, 'count')).toHaveAttribute('data-last-round', '1'); await expect(chart(page, 'share')).toHaveAttribute('data-last-round', '1');
  186 |   await expect(marker(page, 'count', 'a')).toHaveCount(2); await expect(marker(page, 'count', 'b')).toHaveCount(2);
  187 |   await expect(marker(page, 'share', 'a')).toHaveCount(2); await expect(marker(page, 'share', 'b')).toHaveCount(1);
  188 |   await expect(chart(page, 'count').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveAttribute('data-value', '0');
  189 |   await expect(chart(page, 'share').locator('[data-resistance-history-marker="b"][data-round="1"]')).toHaveCount(0);
  190 |   await expect(selected(page, 'count', 'b')).toHaveAttribute('data-value', '0'); await expect(selected(page, 'share', 'b')).toHaveCount(0);
  191 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText('Undefined');
  192 |   const bSharePath = await chart(page, 'share').locator('[data-resistance-series="b"]').getAttribute('d');
  193 |   expect(bSharePath || '').not.toMatch(/[LlHhVvCcSsQqTtAa]/);
  194 |   for (const metric of ['count', 'share'] as const) {
  195 |     const values = await marker(page, metric, 'a').evaluateAll(points => points.map(point => Number(point.getAttribute('data-round')))); expect(values).toEqual([0, 1]);
  196 |     await expect(chart(page, metric).locator('[data-round="2"], [data-round="3"]')).toHaveCount(0);
  197 |   }
  198 |   await open(page.locator('#micro-resistance-history-data'));
  199 |   await expect(page.locator('#micro-resistance-history-table tbody tr')).toHaveCount(2);
  200 |   await expect(page.locator('#micro-resistance-history-table tr[data-round="1"] td')).toHaveText(['8', '0', '12%', 'Undefined']);
  201 |   await round(page).selectOption('0'); await expect(selected(page, 'share', 'b')).toHaveAttribute('data-value', '0');
  202 |   await expect(page.locator('#micro-resistance-history-share-value')).toContainText(/A.*10%.*B.*0%/);
  203 |   expect(await state(page)).toEqual(withRound(before, 0)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  204 |   await panel(page).screenshot({ path: path.join(out, 'resistance-visual-extinction.png') });
  205 | });
  206 | 
  207 | test('keyboard round changes update both plots, restore after JSON reload and agree with the comparison downloads', async ({ page }) => {
  208 |   await mount(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  209 |   await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  210 |   await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  211 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '1');
  212 |   await expect(page.locator('#micro-resistance-history-selected-round')).toContainText('1');
  213 |   const saved = clone(await state(page)); await harness.unmount(page); await page.evaluate(value => (window as any).__mount(value), saved);
  214 |   await open(panel(page)); await instrument(page); await expect(round(page)).toHaveValue('1'); expect(await state(page)).toEqual(saved);
  215 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'b')).toHaveAttribute('data-round', '1');
  216 |   const text = await download(page, 'text', 'resistance-visual-selected-round.txt');
  217 |   expect(text.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt');
  218 |   expect(text.text).toContain('Shared comparison round: 1'); expect(text.text).toContain('Resistant cells\t8\t6\t-2');
  219 |   expect(text.text).toContain('Resistant share\t12%\t75%\t+63 percentage points');
  220 |   const csv = await download(page, 'csv', 'resistance-visual-selected-round.csv');
  221 |   expect(csv.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.csv'); expect(csv.text).toContain('"shared_round"');
  222 |   const latest = page.locator('#micro-resistance-comparison-latest'); await latest.focus(); await latest.press('Enter');
  223 |   await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
  224 |   for (const metric of ['count', 'share'] as const) await expect(selected(page, metric, 'a')).toHaveAttribute('data-round', '2');
  225 |   expect(await state(page)).toEqual(withRound(saved, null)); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  226 |   writeFileSync(path.join(out, 'resistance-visual-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  227 | });
  228 | 
  229 | test('opening and inspecting charts preserves raw imports without random draws or XP while live playback keeps its own culture', async ({ page }) => {
  230 |   const data = seed(); data.resistanceNotebook.records.splice(1, 0, null, { id: 88, evidence: 'Malformed evidence stays raw.', imported: literal });
  231 |   await mount(page, data); const before = await state(page); await open(page.locator('#micro-resistance-history-data'));
  232 |   await round(page).selectOption('0'); await round(page).selectOption('1'); await round(page).selectOption('');
  233 |   expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
  234 |   expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  235 |   expect(await page.evaluate(() => Boolean((window as any).__visualInjected))).toBe(false);
  236 |   await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0); await harness.unmount(page);
  237 |   const live = seed(); live.resistanceInvestigation.history = [{ day: 0, sensitive: 72, resistant: 8 }];
  238 |   live.resistanceInvestigation.runAwarded = false; live.resistanceInvestigation.duration = 30;
  239 |   await mount(page, live); const savedBook = clone((await state(page)).microbiology.resistanceNotebook);
  240 |   const paths = await page.locator('[data-resistance-series]').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  241 |   await page.getByRole('button', { name: '▶ Play', exact: true }).click();
```