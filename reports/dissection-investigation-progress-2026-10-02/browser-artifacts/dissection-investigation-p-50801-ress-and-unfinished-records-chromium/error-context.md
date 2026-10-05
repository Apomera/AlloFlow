# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-investigation-progress.spec.ts >> investigation phone shows readable progress and unfinished records
- Location: tests\e2e\dissection-investigation-progress.spec.ts:37:8

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 86

- Array []
+ Array [
+   Object {
+     "description": "Ensure all ARIA attributes have valid values",
+     "help": "ARIA attributes must conform to valid values",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/aria-valid-attr-value?application=axeAPI",
+     "id": "aria-valid-attr-value",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-controls=\"diss-confidence-ventral_skin-1\"",
+             ],
+             "id": "aria-valid-attr-value",
+             "impact": "critical",
+             "message": "Invalid ARIA attribute value: aria-controls=\"diss-confidence-ventral_skin-1\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   Invalid ARIA attribute value: aria-controls=\"diss-confidence-ventral_skin-1\"",
+         "html": "<button type=\"button\" class=\"diss-layer-review__action\" aria-label=\"Finish evidence for Ventral Skin\" aria-controls=\"diss-confidence-ventral_skin-1\">Finish record</button>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-controls=\"diss-confidence-ventral_skin-1\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-controls=\"diss-note-tympanum\"",
+             ],
+             "id": "aria-valid-attr-value",
+             "impact": "critical",
+             "message": "Invalid ARIA attribute value: aria-controls=\"diss-note-tympanum\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   Invalid ARIA attribute value: aria-controls=\"diss-note-tympanum\"",
+         "html": "<button type=\"button\" class=\"diss-layer-review__action\" aria-label=\"Finish evidence for Tympanic Membrane\" aria-controls=\"diss-note-tympanum\">Finish record</button>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-controls=\"diss-note-tympanum\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-controls=\"diss-note-nictitating\"",
+             ],
+             "id": "aria-valid-attr-value",
+             "impact": "critical",
+             "message": "Invalid ARIA attribute value: aria-controls=\"diss-note-nictitating\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   Invalid ARIA attribute value: aria-controls=\"diss-note-nictitating\"",
+         "html": "<button type=\"button\" class=\"diss-layer-review__action\" aria-label=\"Finish evidence for Nictitating Membrane\" aria-controls=\"diss-note-nictitating\">Finish record</button>",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-controls=\"diss-note-nictitating\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.aria",
+       "wcag2a",
+       "wcag412",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
+ ]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | const out = 'reports/dissection-investigation-progress-2026-10-02';
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  7   | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  8   | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  9   | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  10  | test.describe.configure({ retries: 0 }); test.use({ video: 'off' });
  11  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); }); test.afterAll(async () => { await harness.stop(); });
  12  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  13  | async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = complete) {
  14  |   await page.setViewportSize({ width, height: 1000 });
  15  |   await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: procedure } } }, undefined, { expectCanvas: false });
  16  |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  17  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  18  | }
  19  | async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent! }))); }
  20  | async function seed(page: Page, options: any = {}, width = 390, available = width) {
  21  |   await mount(page, {}, width, available); const organs = await catalog(page); expect(organs.length).toBeGreaterThanOrEqual(3); await harness.unmount(page);
  22  |   const inspected = options.all ? organs : organs.slice(0, Math.min(4, organs.length));
  23  |   const exploredOrgans = Object.fromEntries(inspected.map(org => ['frog|' + org.id, true]));
  24  |   const organNotes = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 'Observed a surface boundary.']));
  25  |   const organConfidence = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 2]));
  26  |   if (!options.complete) { organConfidence['frog|' + inspected[1].id] = 0; organNotes['frog|' + inspected[2].id] = '   '; if (inspected[3]) { organNotes['frog|' + inspected[3].id] = ''; organConfidence['frog|' + inspected[3].id] = 0; } }
  27  |   await mount(page, { exploredOrgans, organNotes, organConfidence, ...options.state }, width, available, options.procedure || complete);
  28  |   return { organs, inspected };
  29  | }
  30  | async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
  31  | const progress = (page: Page, kind: string) => page.locator(`[data-progress-kind="${kind}"] progress`);
  32  | async function openRecords(page: Page) { const details = page.locator('.diss-layer-records'); if (!(await details.evaluate((node: HTMLDetailsElement) => node.open))) await details.locator('summary').click(); return details; }
  33  | 
  34  | for (const { name, width, available, large, contrast, forced } of [
  35  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  36  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  37  | ]) test(`investigation ${name} shows readable progress and unfinished records`, async ({ page }) => {
  38  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  39  |   const { organs, inspected } = await seed(page, { state: { largeText: !!large, highContrast: !!contrast } }, width, available);
  40  |   const before = await evidence(page), panel = page.locator('#diss-layer-review');
  41  |   await expect(progress(page, 'technique')).toHaveAttribute('value', '6'); await expect(progress(page, 'technique')).toHaveAttribute('max', '6');
  42  |   await expect(progress(page, 'inspected')).toHaveAttribute('value', String(inspected.length)); await expect(progress(page, 'inspected')).toHaveAttribute('max', String(organs.length));
  43  |   await expect(progress(page, 'recorded')).toHaveAttribute('value', '1'); await expect(progress(page, 'recorded')).toHaveAttribute('max', String(organs.length));
  44  |   await expect(page.locator('.diss-layer-records')).not.toHaveAttribute('open'); const records = await openRecords(page); await expect(records.locator('li')).toHaveCount(inspected.length - 1);
  45  |   await expect(records.locator(`[data-record-organ="${inspected[1].id}"]`)).toContainText('Confidence needed'); await expect(records.locator(`[data-record-organ="${inspected[2].id}"]`)).toContainText('Note needed');
  46  |   await records.getByRole('button').first().focus(); await panel.screenshot({ path: `${out}/${name}-review.png`, style: '.diss-next-action {position:static!important;}' });
  47  |   await records.screenshot({ path: `${out}/${name}-queue-focus.png` });
  48  |   const metrics = await panel.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
  49  |     targets: Array.from(node.querySelectorAll('button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
  50  |     text: Array.from(node.querySelectorAll('h3,h4,p,strong,span,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  51  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  52  |   for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  53  |   for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  54  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
> 55  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
      |                                                                                                        ^ Error: expect(received).toEqual(expected) // deep equality
  56  | });
  57  | 
  58  | test('confidence shortcut focuses an unchecked rating and returns without granting evidence', async ({ page }) => {
  59  |   const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  60  |   const button = records.locator(`[data-record-organ="${inspected[1].id}"] button`); await button.focus(); await page.keyboard.press('Enter');
  61  |   const rating = page.locator(`#diss-confidence-${inspected[1].id}-1`); await expect(rating).toBeFocused(); await expect(rating).not.toBeChecked(); expect(await evidence(page)).toEqual(before);
  62  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  63  | });
  64  | 
  65  | test('missing note shortcut preserves the rating and updates progress after an explicit edit', async ({ page }) => {
  66  |   const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  67  |   await records.locator(`[data-record-organ="${inspected[2].id}"] button`).click(); const note = page.locator(`#diss-note-${inspected[2].id}`); await expect(note).toBeFocused(); expect(await evidence(page)).toEqual(before);
  68  |   await note.fill('I observed the boundary and checked its position against a nearby landmark.'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '2');
  69  |   await expect(page.locator(`[data-record-organ="${inspected[2].id}"]`)).toHaveCount(0); const after = await evidence(page);
  70  |   expect(after.confidence).toEqual(before.confidence); expect(after.explored).toEqual(before.explored); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores);
  71  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused();
  72  | });
  73  | 
  74  | test('ratings outside the three-level scale remain unfinished and cannot make a layer ready', async ({ page }) => {
  75  |   for (const confidence of [0, 4, 99, -1, 'invalid']) {
  76  |     const { organs } = await seed(page, { all: true, complete: true }); await harness.unmount(page);
  77  |     const target = organs[0], key = 'frog|' + target.id;
  78  |     await mount(page, { exploredOrgans: Object.fromEntries(organs.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(organs.map(org => ['frog|' + org.id, 'Surface boundary observed.'])), organConfidence: { ...Object.fromEntries(organs.map(org => ['frog|' + org.id, 2])), [key]: confidence } });
  79  |     await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Record evidence'); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length - 1));
  80  |     await expect(page.locator(`#diss-record-${target.id}`)).toHaveText('Add a confidence rating'); await openRecords(page); await page.locator(`[data-record-organ="${target.id}"] button`).click();
  81  |     await expect(page.locator(`#diss-confidence-${target.id}-1`)).toBeFocused(); await expect(page.locator('.diss-confidence-scale input:checked')).toHaveCount(0);
  82  |     await page.getByRole('radio', { name: 'Confidence 1 of 3: Not sure yet', exact: true }).check(); await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  83  |     await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length)); await harness.unmount(page);
  84  |   }
  85  | });
  86  | 
  87  | test('completed technique waits for actual inspection before reporting readiness', async ({ page }) => {
  88  |   await mount(page); const organs = await catalog(page), before = await evidence(page);
  89  |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
  90  |   const visible = page.locator('.diss-directory-item[data-exposure-state="visible"]').first(); await visible.click(); await expect(progress(page, 'inspected')).toHaveAttribute('value', '1'); await expect(page.locator('.diss-layer-records li')).toHaveCount(1);
  91  |   const after = await evidence(page); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores); expect(organs.length).toBeGreaterThan(1);
  92  | });
  93  | 
  94  | test('notes for uninspected and unknown structures do not inflate progress', async ({ page }) => {
  95  |   await mount(page); const organs = await catalog(page); await harness.unmount(page);
  96  |   await mount(page, { organNotes: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 'Draft.']), ['frog|unknown', 'Unknown.'], ['perch|' + organs[0].id, 'Other specimen.']]), organConfidence: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 3]), ['frog|unknown', 3]]), exploredOrgans: { 'frog|unknown': true } });
  97  |   await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
  98  | });
  99  | 
  100 | test('a complete investigation can explicitly reveal the next layer', async ({ page }) => {
  101 |   const { organs } = await seed(page, { all: true, complete: true }, 1180, 1180); const before = await evidence(page);
  102 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal'); await expect(page.locator('.diss-layer-records')).toHaveCount(0); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length));
  103 |   await page.locator('.diss-next-action__primary').click(); await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).not.toBe('skin');
  104 |   const after = await evidence(page); expect(after.revealed.skin).toBe(true); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures.skin).toEqual(before.procedures.skin);
  105 |   await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0');
  106 |   await writeFile(`${out}/revealed-state.json`, JSON.stringify(after, null, 2));
  107 | });
  108 | 
  109 | test('reviewing a prior observation preserves the guided route and hidden-view credit', async ({ page }) => {
  110 |   const { inspected } = await seed(page, { state: { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'dorsal' } }); const before = await evidence(page);
  111 |   await openRecords(page); await page.locator(`[data-record-organ="${inspected[1].id}"] button`).click(); expect(await evidence(page)).toEqual(before);
  112 | });
  113 | 
  114 | for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides the record queue and progress shortcuts`, async ({ page }) => {
  115 |   await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], selectedOrgan: 'ventral_skin', exploredOrgans: { 'frog|ventral_skin': true } });
  116 |   await expect(page.locator('.diss-investigation-progress')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer progress', exact: true })).toHaveCount(0);
  117 | });
  118 | 
```