# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-layer-review.spec.ts >> layer review embedded-large is readable outside closed technique controls
- Location: tests\e2e\dissection-layer-review.spec.ts:59:7

# Error details

```
Error: 77 → 82

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 15.9
Received:    14.4
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const out = 'reports/dissection-layer-review-2026-10-01';
  7   | const captureStyle = '.diss-next-action { position:static!important; }';
  8   | const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: Date.now(), consequences: [] };
  9   | const actions = Array.from({ length: 8 }, (_, i) => ({ action: 'inspect', label: `Orientation check ${i + 1}`, at: 100 + i, outcome: 'ORIENTATION RECORDED', outcomeDetail: 'The recommended view and protected landmarks were checked before contact.', tone: 'success', point: { x: .5, y: .5 }, tissueBefore: { ...tissue, clarity: 70 + i, risk: 20 }, tissueAfter: { ...tissue, clarity: 75 + i, risk: 17 } }));
  10  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  11  | const recorded = { inspected: true, history: ['inspect'], actionLog: actions, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } };
  12  | test.describe.configure({ retries: 0 });
  13  | test.use({ video: 'off' });
  14  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  15  | test.afterAll(async () => { await harness.stop(); });
  16  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  17  | 
  18  | async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = recorded) {
  19  |   await page.setViewportSize({ width, height: 1000 });
  20  |   await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: { tissueState: tissue, ...procedure } } } }, undefined, { expectCanvas: false });
  21  |   await page.evaluate(() => {
  22  |     const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  23  |     meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  24  |   });
  25  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  26  | }
  27  | async function evidence(page: Page) {
  28  |   return page.evaluate(() => {
  29  |     const d = (window as any).__ctx.toolData.dissection;
  30  |     return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer };
  31  |   });
  32  | }
  33  | async function openHistory(page: Page) {
  34  |   const history = page.locator('.diss-layer-review__history');
  35  |   if (!(await history.evaluate((node: HTMLDetailsElement) => node.open))) await history.locator('summary').click();
  36  | }
  37  | async function readable(page: Page, name: string, available: number, large = false) {
  38  |   await openHistory(page);
  39  |   const panel = page.locator('#diss-layer-review');
  40  |   await panel.screenshot({ path: `${out}/${name}.png`, style: captureStyle });
  41  |   const metrics = await panel.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
  42  |     targets: Array.from(node.querySelectorAll('button, summary')).map(el => ({ height: el.getBoundingClientRect().height, scroll: el.scrollWidth, client: el.clientWidth })),
  43  |     text: Array.from(node.querySelectorAll('h3,h4,p,span,small,strong,b,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  44  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  45  |   expect(metrics.width).toBeLessThanOrEqual(available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  46  |   for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.scroll).toBeLessThanOrEqual(target.client + 1); }
> 47  |   for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
      |                                                                         ^ Error: 77 → 82
  48  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  49  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  50  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2));
  51  |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  52  | }
  53  | 
  54  | for (const { name, width, available, large, contrast, forced } of [
  55  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 },
  56  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  57  |   { name: 'desktop', width: 1440, available: 1180 }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  58  | ]) {
  59  |   test(`layer review ${name} is readable outside closed technique controls`, async ({ page }) => {
  60  |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  61  |     if (forced) await page.emulateMedia({ forcedColors: 'active' });
  62  |     await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
  63  |     const before = await evidence(page);
  64  |     const panel = page.locator('#diss-layer-review');
  65  |     await expect(panel).toBeVisible(); await expect(page.locator('#diss-procedure-panel')).not.toHaveAttribute('open');
  66  |     await expect(panel).toHaveAttribute('data-review-state', 'Explanation needed');
  67  |     await expect(panel).toContainText('1 of 6 protocol actions complete. 0 of 6 actions have verified plans and explanations.');
  68  |     await readable(page, name, available, !!large);
  69  |     await expect(panel.locator('.diss-procedure__timeline-entry')).toHaveCount(8);
  70  |     await panel.locator('.diss-procedure__timeline-entry').first().focus();
  71  |     await panel.locator('.diss-procedure__timeline-entry').first().screenshot({ path: `${out}/${name}-focus.png` });
  72  |     expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  73  |   });
  74  | }
  75  | 
  76  | test('history keyboard browsing is separate from selecting and replaying saved evidence', async ({ page }) => {
  77  |   await mount(page); await openHistory(page);
  78  |   const entries = page.locator('.diss-layer-review .diss-procedure__timeline-entry');
  79  |   const before = await evidence(page);
  80  |   await entries.first().focus();
  81  |   const prevented = await entries.first().evaluate(node => [
  82  |     { key: 'End', shiftKey: true }, { key: 'Home', ctrlKey: true }, { key: 'ArrowRight', altKey: true },
  83  |     { key: 'ArrowLeft', metaKey: true }, { key: 'End', isComposing: true }, { key: 'Home', keyCode: 229 },
  84  |   ].map(options => { const e = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(e); return e.defaultPrevented; }));
  85  |   expect(prevented).toEqual([false, false, false, false, false, false]);
  86  |   for (const [key, index] of [['End', 7], ['ArrowDown', 0], ['ArrowRight', 1], ['ArrowUp', 0], ['ArrowLeft', 7], ['Home', 0]] as const) {
  87  |     await page.keyboard.press(key); await expect(entries.nth(index)).toBeFocused();
  88  |     await expect(entries.last()).toHaveAttribute('aria-pressed', 'true'); expect(await evidence(page)).toEqual(before);
  89  |   }
  90  |   await page.keyboard.press('Enter');
  91  |   await expect(entries.first()).toHaveAttribute('aria-pressed', 'true'); await expect(entries.last()).toHaveAttribute('aria-pressed', 'false');
  92  |   await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Orientation check 1');
  93  |   await expect(page.locator('.diss-layer-review__delta').first()).toContainText('70 → 75');
  94  |   await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  95  |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message)).toContain('Selected response replay started');
  96  |   expect(await evidence(page)).toEqual(before);
  97  |   await page.locator('#diss-layer-review').screenshot({ path: `${out}/selected-response.png`, style: captureStyle });
  98  | });
  99  | 
  100 | test('review is requested explicitly before work and never invents missing snapshot values', async ({ page }) => {
  101 |   await mount(page, { techniquePanelOpen: true }, 390, 390, {});
  102 |   await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  103 |   await page.getByRole('button', { name: 'Review layer', exact: true }).click();
  104 |   await expect(page.locator('#diss-layer-review-title')).toBeFocused();
  105 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'In progress');
  106 |   await expect(page.locator('#diss-layer-review')).toContainText('0 of 6 protocol actions complete.');
  107 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  108 |   await expect(page.locator('#diss-layer-review')).not.toContainText('Strength:');
  109 |   await harness.unmount(page);
  110 |   await mount(page, {}, 390, 390, { ...recorded, actionLog: [{ ...actions[0], tissueAfter: { clarity: 75 } }] });
  111 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  112 |   await expect(page.locator('#diss-layer-review')).toContainText('No complete before-and-after tissue data was saved for this action.');
  113 | });
  114 | 
  115 | test('pending explanation takes priority and the shortcut only focuses the checkpoint', async ({ page }) => {
  116 |   await mount(page, { anatomicalView: 'dorsal' }); const before = await evidence(page);
  117 |   await page.getByRole('button', { name: 'Explain the response', exact: true }).click();
  118 |   await expect(page.locator('#diss-learning-check-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  119 | });
  120 | 
  121 | for (const { name, state, procedure, label, target } of [
  122 |   { name: 'view', state: { anatomicalView: 'dorsal' }, procedure: {}, label: 'Check view', target: '#diss-view-cycle' },
  123 |   { name: 'optics', state: { lensFocusDepth: 'deep', lensMagnification: 6 }, procedure: {}, label: 'Adjust optics', target: '#diss-view-tools' },
  124 |   { name: 'dry tissue', state: {}, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review Dropper', target: '#diss-instrument-dropper' },
  125 |   { name: 'restricted recovery', state: { procedureScenario: 'restricted-tray' }, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review tissue condition', target: '#diss-field-monitor-summary' },
  126 |   { name: 'calibration', state: { activeInstrument: 'scalpel', toolCalibration: { bladeAngle: 70 } }, procedure: {}, label: 'Adjust calibration', target: '#diss-calibration-range' },
  127 | ]) {
  128 |   test(`current ${name} guidance focuses a usable control without changing the setup`, async ({ page }) => {
  129 |     await mount(page, { ...state, selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2, ...state }, 390, 390,
  130 |       { ...recorded, ...procedure, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
  131 |     const before = await evidence(page);
  132 |     const shortcut = page.locator('.diss-layer-review__next').getByRole('button', { name: label, exact: true });
  133 |     await expect(shortcut).toBeVisible(); await shortcut.click();
  134 |     await expect(page.locator(target)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  135 |   });
  136 | }
  137 | 
  138 | test('completion still requires the final explanation', async ({ page }) => {
  139 |   const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: action !== 'probe' }]));
  140 |   await mount(page, {}, 390, 390, { ...recorded, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .4, y: .3 }, { x: .6, y: .7 }], probed: true, learningChecks: checks });
  141 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  142 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 protocol actions complete. 5 of 6 actions have verified');
  143 |   await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
  144 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  145 |   const before = await evidence(page); await page.getByRole('button', { name: 'Review next action', exact: true }).click();
  146 |   await expect(page.locator('#diss-next-action-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  147 | });
```