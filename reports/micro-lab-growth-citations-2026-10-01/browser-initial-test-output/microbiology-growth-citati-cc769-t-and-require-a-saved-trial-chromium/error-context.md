# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-growth-citations.spec.ts >> citation controls reflow on phones and enlarged layouts, keep literal learner text and require a saved trial
- Location: tests\e2e\microbiology-growth-citations.spec.ts:290:5

# Error details

```
Error: [data-micro-growth]

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  39  |     microscopeFocus: 10, microscopeTargetFocus: 50, gramStep: 0, quizIdx: 0, quizAnswers: [0, 1], quizSubmitted: false, quizCorrect: 0,
  40  |     growthReviewHour: 24,
  41  |     growthLab: { ...nextControl, tempC: 65, hypothesis: 'Independent legacy hypothesis.', explanation: 'Independent legacy explanation.',
  42  |       understood: true, stuckRevealed: true, log: [{ profile: 'thermus', t: 65, p: 7.5, o: 100, state: 'Earlier recorded label.' }], legacyExtra: { keep: 2 } },
  43  |     growthInvestigation: { trials: [first,
  44  |       { id: 31, control: otherControl, conditions: otherTrial, prediction: 'higher', hypothesis: 'Original oxygen reasoning.', explanation: 'Trial 31 written evidence.', trialExtra: 'Keep second trial.' },
  45  |       { id: 42, conditions: base, prediction: 'lower', hypothesis: 'No original control was saved.', explanation: 'Trial 42 written evidence.', trialExtra: 'Keep missing-control trial.' }],
  46  |       selectedId: 7, nextId: 60, control: { ...nextControl, controlExtra: 'Keep next-run control.' }, prediction: 'unsure',
  47  |       hypothesis: 'My next-run reasoning stays independent.', explanation: 'Independent notebook draft explanation.', sweepVariable: 'pH',
  48  |       sweep: { variable: 'oxygen', conditions: base }, previousSweep: { variable: 'pH', conditions: nextControl },
  49  |       removed: { trial: { id: 19, control: base, conditions: { ...base, pH: 6 }, prediction: 'lower', hypothesis: 'Recoverable trial reasoning.',
  50  |         explanation: recoveryNote, citedHours: [12], recoveryExtra: { keep: true } }, index: 1 }, notebookExtra: { keep: 'Raw notebook metadata.' } },
  51  |     externalMarker: { keep: 'Unrelated Micro Lab state.' }
  52  |   };
  53  | }
  54  | 
  55  | async function instrumentXP(page: Page) {
  56  |   await page.evaluate(() => {
  57  |     const w = window as any; w.__citationXP = w.__citationXP || [];
  58  |     w.__ctx.awardXP = (...args: any[]) => w.__citationXP.push(args);
  59  |   });
  60  | }
  61  | async function mount(page: Page, data: Record<string, unknown> = seed()) {
  62  |   await page.setViewportSize({ width: 1280, height: 960 });
  63  |   await harness.mount(page, { unrelatedNotebook: { note: 'Preserve another tool.' }, microbiology: data }, undefined, { expectCanvas: false });
  64  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  65  |   await instrumentXP(page);
  66  | }
  67  | async function reload(page: Page) {
  68  |   const saved = clone(await state(page)); await harness.unmount(page);
  69  |   await page.evaluate(data => (window as any).__mount(data), saved); await instrumentXP(page);
  70  |   await expect(page.locator('[data-microbiology-tool]')).toBeVisible(); return saved;
  71  | }
  72  | async function noXP(page: Page) { expect(await page.evaluate(() => (window as any).__citationXP)).toEqual([]); }
  73  | async function press(button: Locator) { await button.focus(); await button.press('Enter'); }
  74  | async function open(details: Locator) {
  75  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await press(details.locator(':scope > summary'));
  76  |   await expect(details).toHaveAttribute('open', '');
  77  | }
  78  | async function hour(page: Page, value: number) {
  79  |   const before = await state(page); await page.locator('#gl-evidence-hour').selectOption(String(value));
  80  |   const expected = clone(before); expected.microbiology.growthReviewHour = value;
  81  |   expect(await state(page)).toEqual(expected); await expect(page.locator('#gl-evidence-preview')).toHaveAttribute('data-evidence-hour', String(value));
  82  | }
  83  | function withHours(before: any, id: number, hours: number[]) {
  84  |   const expected = clone(before), target = expected.microbiology.growthInvestigation.trials.find((trial: any) => trial.id === id);
  85  |   if (hours.length) target.citedHours = hours; else delete target.citedHours;
  86  |   return expected;
  87  | }
  88  | async function expectedEvidence(page: Page, control: Record<string, unknown> | null, settings: Record<string, unknown>, hours: number[]): Promise<Evidence[]> {
  89  |   // Use the established simulator, independently of the new citation helpers.
  90  |   return page.evaluate(({ control, settings, hours }) => {
  91  |     const model = (window as any).__MicrobiologyCore.growth;
  92  |     const trial = model.simulate(settings), savedControl = control ? model.simulate(control) : null;
  93  |     return hours.map(hour => {
  94  |       const trialPopulation = trial.points[hour].population, controlPopulation = savedControl ? savedControl.points[hour].population : null;
  95  |       return { hour, controlPopulation, trialPopulation, difference: controlPopulation === null ? null : trialPopulation - controlPopulation };
  96  |     });
  97  |   }, { control, settings, hours });
  98  | }
  99  | function rounded(rows: Evidence[]) {
  100 |   return rows.map(row => ({ hour: row.hour, controlPopulation: row.controlPopulation === null ? null : Number(row.controlPopulation.toFixed(3)),
  101 |     trialPopulation: Number(row.trialPopulation.toFixed(3)), difference: row.difference === null ? null : Number(row.difference.toFixed(3)) }));
  102 | }
  103 | async function values(container: Locator, row: Evidence) {
  104 |   const value = (number: number | null, signed = false) => number === null ? 'Unavailable' : (signed && number > 0 ? '+' : '') + Number(number.toFixed(3));
  105 |   await expect(container.locator('[data-evidence-value="control"]')).toHaveText(value(row.controlPopulation));
  106 |   await expect(container.locator('[data-evidence-value="trial"]')).toHaveText(value(row.trialPopulation));
  107 |   await expect(container.locator('[data-evidence-value="difference"]')).toHaveText(value(row.difference, true));
  108 | }
  109 | async function download(page: Page, button: Locator, filename: string, saveAs: string) {
  110 |   await button.focus(); const pending = page.waitForEvent('download'); await button.press('Enter');
  111 |   const file = await pending; expect(file.suggestedFilename()).toBe(filename); await file.saveAs(path.join(out, saveAs));
  112 |   await expect(button).toBeFocused(); return readFileSync((await file.path())!, 'utf8');
  113 | }
  114 | function csv(text: string): Record<string, string>[] {
  115 |   const cells = [...text.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  116 |   expect(cells.map(cell => cell[0]).join('')).toBe(text);
  117 |   const records: string[][] = []; let row: string[] = [];
  118 |   for (const cell of cells) { row.push(cell[1].replace(/""/g, '"')); if (cell[2] !== ',') { records.push(row); row = []; } }
  119 |   const [headings, ...data] = records; expect(headings.slice(-2)).toEqual(['cited_model_hours', 'cited_evidence_json']);
  120 |   return data.map(values => { expect(values).toHaveLength(headings.length); return Object.fromEntries(headings.map((heading, index) => [heading, values[index]])); });
  121 | }
  122 | function citedTables(text: string): Evidence[][] {
  123 |   const lines = text.split(/\r?\n/), tables: Evidence[][] = [];
  124 |   for (let index = 0; index < lines.length; index++) {
  125 |     if (lines[index] !== 'Cited model hour\tOriginal control population\tTrial population\tTrial minus control') continue;
  126 |     const table: Evidence[] = [];
  127 |     while (++index < lines.length && /^\d+\t/.test(lines[index])) {
  128 |       const cells = lines[index].split('\t'); expect(cells).toHaveLength(4);
  129 |       table.push({ hour: Number(cells[0]), controlPopulation: cells[1] === 'Unavailable' ? null : Number(cells[1]),
  130 |         trialPopulation: Number(cells[2]), difference: cells[3] === 'Unavailable' ? null : Number(cells[3]) });
  131 |     }
  132 |     tables.push(table);
  133 |   }
  134 |   return tables;
  135 | }
  136 | async function noOverflow(page: Page) {
  137 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  138 |   for (const selector of ['[data-microbiology-tool]', '[data-micro-growth]', '[data-growth-citations]', '#gl-evidence-pins', '.micro-growth-citation-card']) {
> 139 |     for (const panel of await page.locator(selector).all()) expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1), selector).toBe(true);
      |                                                                                                                                                      ^ Error: [data-micro-growth]
  140 |   }
  141 | }
  142 | async function deferFocus(page: Page) {
  143 |   await page.evaluate(() => {
  144 |     const w = window as any; w.__citationOriginalTimeout = window.setTimeout; w.__citationPendingFocus = [];
  145 |     window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
  146 |       if (delay === 0) { w.__citationPendingFocus.push(() => callback(...args)); return 0; }
  147 |       return w.__citationOriginalTimeout(callback, delay, ...args);
  148 |     }) as typeof window.setTimeout;
  149 |   });
  150 | }
  151 | async function flushFocus(page: Page) {
  152 |   await page.evaluate(() => {
  153 |     const w = window as any; window.setTimeout = w.__citationOriginalTimeout;
  154 |     for (const callback of w.__citationPendingFocus) callback(); delete w.__citationPendingFocus; delete w.__citationOriginalTimeout;
  155 |   });
  156 | }
  157 | 
  158 | test('keeps sorted hours zero, six and twenty-four with exact raw-state changes and guards duplicates and capacity', async ({ page }) => {
  159 |   await mount(page); const result = await page.locator('.micro-growth-result-head').innerText();
  160 |   await expect(page.locator('.micro-growth-result-head')).toContainText('Observed result: Similar population');
  161 |   await expect(page.locator('.micro-growth-result-head')).toContainText('Original prediction: Similar population');
  162 |   await expect(page.locator('#gl-evidence-hour')).toHaveAccessibleName('Model hour to cite');
  163 |   await expect(page.locator('#gl-evidence-hour')).toHaveAttribute('aria-controls', 'gl-evidence-preview');
  164 |   await expect(page.locator('#gl-evidence-status')).toHaveAttribute('role', 'status');
  165 |   await expect(page.locator('#gl-evidence-status')).toHaveAttribute('aria-live', 'polite');
  166 |   await expect(page.locator('#gl-evidence-status')).toHaveAttribute('aria-atomic', 'true');
  167 |   const expected = await expectedEvidence(page, base, trialSettings, [0, 6, 24]);
  168 |   expect(expected[0]).toEqual({ hour: 0, controlPopulation: 5, trialPopulation: 5, difference: 0 });
  169 |   expect(Number(expected[1].difference!.toFixed(3))).toBe(-8.361);
  170 |   let kept: number[] = [];
  171 |   for (const value of [24, 0, 6]) {
  172 |     await hour(page, value); await values(page.locator('#gl-evidence-preview'), expected.find(row => row.hour === value)!);
  173 |     const before = await state(page); await expect(page.locator('#gl-evidence-pin')).toHaveAttribute('aria-disabled', 'false');
  174 |     await press(page.locator('#gl-evidence-pin')); kept = [...kept, value].sort((a, b) => a - b);
  175 |     expect(await state(page)).toEqual(withHours(before, 7, kept)); await expect(page.locator('#gl-evidence-pin')).toBeFocused();
  176 |     await expect(page.locator('#gl-evidence-status')).toContainText('Kept model hour ' + value + '.');
  177 |     expect(await page.locator('#gl-evidence-pins [data-cited-hour]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-cited-hour')))).toEqual(kept.map(String));
  178 |     expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
  179 |   }
  180 |   for (const row of expected) await values(card(page, row.hour), row);
  181 |   await expect(page.locator('#gl-evidence-limit')).toContainText('This hour is already kept');
  182 |   let before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(before);
  183 |   await hour(page, 12); await expect(page.locator('#gl-evidence-pin')).toHaveAttribute('aria-disabled', 'true');
  184 |   await expect(page.locator('#gl-evidence-limit')).toContainText('Three hours are kept');
  185 |   before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(before);
  186 |   await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation); await expect(page.locator('#gl-hypothesis')).toHaveValue('My next-run reasoning stays independent.');
  187 |   expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result); await noXP(page);
  188 |   await citations(page).screenshot({ path: path.join(out, 'growth-citations-desktop.png') });
  189 | });
  190 | 
  191 | test('each nonsequential trial uses its original control and missing controls remain unavailable', async ({ page }) => {
  192 |   const data = seed(); data.growthInvestigation.selectedId = 31; data.growthReviewHour = 6;
  193 |   await mount(page, data); const expected = (await expectedEvidence(page, otherControl, otherTrial, [6]))[0];
  194 |   const incorrectCurrentControl = (await expectedEvidence(page, nextControl, otherTrial, [6]))[0];
  195 |   expect(expected.controlPopulation).not.toBe(incorrectCurrentControl.controlPopulation);
  196 |   await expect(citations(page)).toHaveAttribute('data-growth-citations', '31'); await values(page.locator('#gl-evidence-preview'), expected);
  197 |   let before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(withHours(before, 31, [6]));
  198 |   await values(card(page, 6), expected); await page.locator('#gl-trial-42').click();
  199 |   await expect(citations(page)).toHaveAttribute('data-growth-citations', '42');
  200 |   const missing = (await expectedEvidence(page, null, base, [6]))[0]; await values(page.locator('#gl-evidence-preview'), missing);
  201 |   await expect(citations(page)).toContainText('This trial has no saved control');
  202 |   before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(withHours(before, 42, [6]));
  203 |   await values(card(page, 6), missing); await expect(page.locator('#gl-explanation')).toHaveValue('Trial 42 written evidence.');
  204 |   await expect(page.locator('#gl-hypothesis')).toHaveValue('My next-run reasoning stays independent.');
  205 |   await citations(page).screenshot({ path: path.join(out, 'growth-citations-missing-control.png') });
  206 |   await page.locator('#gl-trial-7').click(); await expect(page.locator('#gl-evidence-pins [data-cited-hour]')).toHaveCount(0);
  207 |   expect((await state(page)).microbiology.growthInvestigation.trials.find((trial: any) => trial.id === 31).citedHours).toEqual([6]);
  208 |   expect((await state(page)).microbiology.growthInvestigation.trials.find((trial: any) => trial.id === 42).citedHours).toEqual([6]); await noXP(page);
  209 | });
  210 | 
  211 | test('JSON reload, removal and restoration retain citations and recovery is read only in Growth and the portfolio', async ({ page }) => {
  212 |   await mount(page, seed([0, 6, 24])); const saved = await reload(page); expect(await state(page)).toEqual(saved);
  213 |   await expect(page.locator('#gl-evidence-pins [data-cited-hour]')).toHaveCount(3);
  214 |   await press(page.getByRole('button', { name: 'Remove selected trial', exact: true }));
  215 |   await expect(page.locator('#gl-restore-removed')).toBeFocused();
  216 |   const removed = (await state(page)).microbiology.growthInvestigation.removed.trial;
  217 |   expect(removed).toMatchObject({ id: 7, control: base, conditions: trialSettings, prediction: 'similar', hypothesis: originalHypothesis, explanation: originalExplanation, citedHours: [0, 6, 24] });
  218 |   expect((await state(page)).microbiology.growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([31, 42]);
  219 |   await open(page.locator('#gl-removed-trial details'));
  220 |   await expect(page.locator('#gl-removed-evidence-pins [data-removed-cited-hour]')).toHaveCount(3);
  221 |   await expect(page.locator('#gl-removed-evidence-pins button')).toHaveCount(0);
  222 |   const expected = await expectedEvidence(page, base, trialSettings, [0, 6, 24]);
  223 |   for (const row of expected) await values(page.locator('#gl-removed-evidence-pins [data-removed-cited-hour="' + row.hour + '"]'), row);
  224 |   await page.locator('#micro-tab-home').click(); await open(page.locator('#micro-portfolio'));
  225 |   await page.locator('#micro-portfolio-activity').selectOption('growth');
  226 |   const preview = await page.locator('#micro-portfolio-preview').innerText();
  227 |   expect(preview).toContain('Removed evidence (available to restore; outside the active notebook) — Trial 7');
  228 |   expect(preview).toContain(originalHypothesis); expect(preview).toContain(originalExplanation); expect(citedTables(preview)).toEqual([rounded(expected)]);
  229 |   const homeSaved = await reload(page); expect(await state(page)).toEqual(homeSaved);
  230 |   await page.locator('#micro-tab-growthLab').click(); await press(page.locator('#gl-restore-removed'));
  231 |   await expect(page.locator('#gl-trial-7')).toBeFocused(); await expect(citations(page)).toHaveAttribute('data-growth-citations', '7');
  232 |   expect((await state(page)).microbiology.growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([7, 31, 42]);
  233 |   expect((await state(page)).microbiology.growthInvestigation.trials[0].citedHours).toEqual([0, 6, 24]);
  234 |   await expect(page.locator('#gl-removed-trial')).toHaveCount(0); await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation); await noXP(page);
  235 | });
  236 | 
  237 | test('notebook, both CSV formats and the full portfolio export accurate citations with their existing recovery scope', async ({ page }) => {
  238 |   const data = seed([0, 6, 24]); data.growthInvestigation.trials[2].citedHours = [6];
  239 |   await mount(page, data); const before = await state(page);
```