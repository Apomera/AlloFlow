# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-directory-actions-previous-0.spec.ts >> the inspection shortcut adds guidance and focusing the result does not inspect it
- Location: tests\e2e\dissection-directory-actions-previous-0.spec.ts:69:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -307,11 +307,11 @@
    },
    "revealed": Object {},
    "scenario": Array [
      undefined,
      undefined,
-     0,
+     undefined,
    ],
    "scores": Array [
      1,
      2,
    ],
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const out = 'reports/dissection-directory-actions-2026-10-03/previous-0';
  6   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  7   | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  8   | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  9   | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  10  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, organSearch: '', directoryFilter: 'all', revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  11  | test.describe.configure({ retries: 0 });
  12  | test.use({ video: 'off' });
  13  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  14  | test.afterAll(async () => { await harness.stop(); });
  15  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  16  | 
  17  | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  18  |   await page.setViewportSize({ width, height: 1000 });
  19  |   await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  20  |   await page.evaluate(() => {
  21  |     const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  22  |     meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  23  |   });
  24  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  25  | }
  26  | async function evidence(page: Page) {
  27  |   return page.evaluate(() => {
  28  |     const d = (window as any).__ctx.toolData.dissection;
  29  |     return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  30  |   });
  31  | }
  32  | const context = (page: Page) => page.locator('[data-directory-context]');
  33  | const result = (page: Page, id = 'dorsal_skin') => page.locator('#diss-organ-' + id);
  34  | 
  35  | for (const { name, width, available, large, contrast, forced } of [
  36  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  37  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  38  | ]) test(`directory guidance ${name} explains a view change and keeps inspection explicit`, async ({ page }) => {
  39  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  40  |   if (forced) await page.emulateMedia({ forcedColors: 'active' });
  41  |   await mount(page, { organSearch: 'Dorsal Skin', largeText: !!large, highContrast: !!contrast }, width, available);
  42  |   const before = await evidence(page), panels: any[] = [], audits: any[] = [];
  43  |   for (const phase of ['occluded', 'visible']) {
  44  |     await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
  45  |     await expect(context(page)).toHaveAttribute('data-context-exposure', phase);
  46  |     await expect(context(page)).toContainText(phase === 'occluded' ? 'Occluded in ventral view' : 'Visible in dorsal view');
  47  |     const button = context(page).getByRole('button'); await button.focus();
  48  |     await context(page).screenshot({ path: `${out}/${name}-${phase}.png`, style: '.diss-next-action {position:static!important;}' });
  49  |     const metrics = await context(page).evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth,
  50  |       targets: Array.from(el.querySelectorAll('button')).map(node => ({ label: node.textContent, height: node.getBoundingClientRect().height, clipped: node.scrollWidth > node.clientWidth + 1 })),
  51  |       text: Array.from(el.querySelectorAll('h4,p,span,button')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
  52  |     panels.push({ phase, ...metrics }); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  53  |     for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  54  |     for (const text of metrics.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped).toBe(false); }
  55  |     if (phase === 'occluded') await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  56  |     const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  57  |     audits.push({ phase, ...audit }); expect(audit.violations).toEqual([]);
  58  |     await button.focus(); await page.keyboard.press(phase === 'occluded' ? 'Space' : 'Enter');
  59  |     await expect(result(page)).toBeFocused(); await expect(result(page)).toHaveAttribute('data-exposure-state', 'visible');
  60  |     await expect(result(page)).toHaveAttribute('aria-describedby', 'diss-record-dorsal_skin diss-directory-context-detail');
  61  |     await expect(page.locator('#diss-organ-search')).toHaveValue('Dorsal Skin');
  62  |     expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' });
  63  |   }
  64  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(panels, null, 2));
  65  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audits, null, 2));
  66  |   expect(errors).toEqual([]);
  67  | });
  68  | 
  69  | test('the inspection shortcut adds guidance and focusing the result does not inspect it', async ({ page }) => {
  70  |   await mount(page); const before = await evidence(page);
  71  |   await page.locator('[data-inspection-directory-action]').click();
  72  |   await expect(context(page)).toHaveAttribute('data-directory-context', 'ventral_skin');
  73  |   await expect(context(page)).toContainText('Activate the directory result below');
  74  |   await context(page).getByRole('button', { name: 'Focus inspection result', exact: true }).click();
  75  |   await expect(result(page, 'ventral_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  76  |   await page.keyboard.press('Enter'); const after = await evidence(page);
> 77  |   expect(after).toEqual({ ...before, selected: 'ventral_skin', explored: { 'frog|ventral_skin': true }, scenario: [before.scenario[0], before.scenario[1], 0] });
      |                 ^ Error: expect(received).toEqual(expected) // deep equality
  78  |   await expect(context(page)).toHaveCount(0); await expect(page.locator('#diss-selection-title')).toBeFocused();
  79  | });
  80  | 
  81  | test('activating an occluded result retains its local guidance and cannot award credit', async ({ page }) => {
  82  |   await mount(page, { organSearch: 'dorsal' }); const before = await evidence(page);
  83  |   await expect(context(page)).toHaveAttribute('data-context-exposure', 'occluded');
  84  |   await result(page).focus(); await page.keyboard.press('Enter');
  85  |   await expect(result(page)).toBeFocused(); await expect(result(page)).toHaveAttribute('aria-disabled', 'true');
  86  |   await expect(context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true })).toBeVisible();
  87  |   expect(await evidence(page)).toEqual(before);
  88  | });
  89  | 
  90  | test('a hidden prior inspection offers record review and preserves existing evidence', async ({ page }) => {
  91  |   await mount(page, { organSearch: 'dorsal', exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Observed a pigmented surface.' }, organConfidence: { 'frog|dorsal_skin': 2 }, scenarioCompletedAt: 123 });
  92  |   const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-tone', 'prior');
  93  |   await expect(context(page)).toContainText('Reviewing this record adds no new inspection credit');
  94  |   await expect(context(page).locator('[data-directory-context-action="view"]')).toHaveCount(0);
  95  |   await context(page).getByRole('button', { name: 'Focus record result', exact: true }).click();
  96  |   await expect(result(page)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  97  |   await page.keyboard.press('Enter'); expect(await evidence(page)).toEqual({ ...before, selected: 'dorsal_skin' });
  98  |   await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true');
  99  | });
  100 | 
  101 | test('a restored hidden draft still requires view recovery and explicit inspection', async ({ page }) => {
  102 |   await mount(page, { organSearch: 'dorsal', organNotes: { 'frog|dorsal_skin': 'Saved draft of a surface observation.' }, organConfidence: { 'frog|dorsal_skin': 1 } });
  103 |   const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-tone', 'caution');
  104 |   await context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true }).click();
  105 |   expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' }); await expect(result(page)).toBeFocused();
  106 |   await page.keyboard.press('Enter'); const after = await evidence(page);
  107 |   expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence);
  108 |   expect(after.explored).toEqual({ 'frog|dorsal_skin': true }); expect(after.scores).toEqual(before.scores);
  109 |   await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true');
  110 | });
  111 | 
  112 | for (const partial of [false, true]) test(`${partial ? 'partly exposed' : 'obscured'} anatomy opens field setup without performing preparation`, async ({ page }) => {
  113 |   const layerProcedure = partial
  114 |     ? { inspected: true, incisionStarted: true, incisionExtended: true, history: ['inspect', 'scalpel', 'scissors'], tissueState: { ...tissue, clarity: 75, stability: 60, exposure: 70, risk: 20 } }
  115 |     : { tissueState: { ...tissue, clarity: 1, stability: 1, exposure: 1, risk: 99 } };
  116 |   await mount(page, { activeLayer: 'organs', anatomicalView: 'internal', organSearch: 'heart', lightIntensity: 68, revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: layerProcedure } });
  117 |   const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-directory-context', 'heart');
  118 |   await expect(context(page)).toHaveAttribute('data-context-exposure', partial ? 'emerging' : 'obscured');
  119 |   await expect(context(page)).toContainText(partial ? 'Partly exposed' : 'Not yet exposed');
  120 |   await context(page).getByRole('button', { name: 'Review field setup', exact: true }).click();
  121 |   await expect(page.locator('#diss-procedure-summary')).toBeFocused(); await expect(page.locator('#diss-procedure-panel')).toHaveAttribute('open', '');
  122 |   await expect(page.locator('#diss-organ-search')).toHaveValue('heart'); expect(await evidence(page)).toEqual(before);
  123 |   await context(page).screenshot({ path: `${out}/${partial ? 'emerging' : 'obscured'}-guidance.png`, style: '.diss-next-action {position:static!important;}' });
  124 | });
  125 | 
  126 | test('guidance follows the current single search result and disappears for broad, empty, or filtered results', async ({ page }) => {
  127 |   await mount(page); const before = await evidence(page), search = page.locator('#diss-organ-search');
  128 |   await expect(context(page)).toHaveCount(0); await search.fill('dorsal'); await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
  129 |   await search.fill('nictitating'); await expect(context(page)).toHaveAttribute('data-directory-context', 'nictitating');
  130 |   await search.fill('surface'); await expect(page.locator('.diss-directory-item')).toHaveCount(2); await expect(context(page)).toHaveCount(0);
  131 |   await search.fill('no such anatomy'); await expect(context(page)).toHaveCount(0);
  132 |   await search.fill('dorsal'); await page.locator('[data-directory-filter="recorded"]').click(); await expect(context(page)).toHaveCount(0);
  133 |   await page.locator('[data-directory-recovery="filter"]').click(); await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
  134 |   await search.press('Escape'); await expect(context(page)).toHaveCount(0); expect(await evidence(page)).toEqual(before);
  135 | });
  136 | 
  137 | test('guided view recovery keeps the fixed target and pauses guidance at the evidence question', async ({ page }) => {
  138 |   await mount(page, { organSearch: 'dorsal', guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] });
  139 |   const before = await evidence(page); await context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true }).click();
  140 |   await expect(result(page)).toBeFocused(); expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' });
  141 |   await page.keyboard.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible();
  142 |   const after = await evidence(page); expect(after.guided[1]).toBe(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]);
  143 |   expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.scores).toEqual(before.scores); expect(after.verified).toEqual(before.verified);
  144 |   await expect(context(page)).toHaveCount(0); await expect(page.locator('[data-directory-context-action]')).toHaveCount(0);
  145 | });
  146 | 
  147 | test('guided guidance does not suggest a structure outside the fixed target', async ({ page }) => {
  148 |   await mount(page, { organSearch: 'nictitating', guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] });
  149 |   const before = await evidence(page); await expect(result(page, 'nictitating')).toBeVisible(); await expect(context(page)).toHaveCount(0); expect(await evidence(page)).toEqual(before);
  150 | });
  151 | 
  152 | for (const [name, state] of [
  153 |   ['quiz', { quizMode: true }], ['timed practical', { practicalMode: true, practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] }],
  154 |   ['flashcards', { flashcardMode: true }], ['comparison', { compareMode: true }], ['eye study', { eyeStudyMode: true }],
  155 | ] as const) test(`${name} keeps directory recovery guidance unavailable`, async ({ page }) => {
  156 |   await mount(page, { organSearch: 'dorsal', ...state });
  157 |   await expect(context(page)).toHaveCount(0); await expect(page.locator('[data-directory-context-action]')).toHaveCount(0);
  158 | });
  159 | 
```