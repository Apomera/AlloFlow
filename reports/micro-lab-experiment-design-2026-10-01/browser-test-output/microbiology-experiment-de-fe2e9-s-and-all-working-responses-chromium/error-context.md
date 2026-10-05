# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-experiment-design.spec.ts >> preparing one Growth difference preserves saved evidence, recovery, sweeps and all working responses
- Location: tests\e2e\microbiology-experiment-design.spec.ts:87:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 1

@@ -1,6 +1,7 @@
  Object {
+   "explanation": "",
    "hypothesis": "Independent legacy note.",
    "log": Array [
      Object {
        "note": "Keep this legacy log.",
      },
```

# Test source

```ts
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, readFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ retries: 0, timeout: 90000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-experiment-design-2026-10-01');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | let errors: string[];
  11  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  12  | test.afterAll(async () => { await harness.stop(); });
  13  | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  14  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  15  | const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
  16  | async function mount(page: Page, seed: Record<string, unknown>) {
  17  |   await page.setViewportSize({ width: 1280, height: 960 });
  18  |   await harness.mount(page, { microbiology: seed }, undefined, { expectCanvas: false });
  19  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  20  | }
  21  | async function reload(page: Page) {
  22  |   const saved = JSON.parse(JSON.stringify(await state(page))); await harness.unmount(page);
  23  |   await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
  24  | }
  25  | async function phone(page: Page) {
  26  |   await page.setViewportSize({ width: 320, height: 844 });
  27  |   await noOverflow(page);
  28  | }
  29  | async function open(details: Locator) {
  30  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  31  |   await expect(details).toHaveAttribute('open', '');
  32  | }
  33  | async function download(page: Page, button: Locator, name: string) {
  34  |   await button.focus(); const pending = page.waitForEvent('download'); await page.keyboard.press('Enter');
  35  |   const file = await pending; const text = readFileSync((await file.path())!, 'utf8'); await file.saveAs(path.join(out, name));
  36  |   await expect(button).toBeFocused(); return text;
  37  | }
  38  | 
  39  | const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
  40  | const changed = { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 35 };
  41  | const design = (page: Page) => page.locator('#gl-design-preview');
  42  | async function setRange(control: Locator, value: number) {
  43  |   await control.evaluate((node, next) => {
  44  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
  45  |     node.dispatchEvent(new Event('input', { bubbles: true }));
  46  |   }, value);
  47  |   await expect(control).toHaveValue(String(value));
  48  | }
  49  | async function noOverflow(page: Page) {
  50  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  51  |   for (const selector of ['[data-microbiology-tool]', '[data-micro-resistance-workspace]']) {
  52  |     const panels = page.locator(selector);
  53  |     if (await panels.count()) expect(await panels.evaluate(node => node.scrollWidth <= node.clientWidth + 1), selector).toBe(true);
  54  |   }
  55  | }
  56  | 
  57  | test('planned Growth settings explain missing, same, one and multiple differences without revealing outcomes', async ({ page }) => {
  58  |   await mount(page, { tab: 'growthLab', growthLab: base });
  59  |   const before = await state(page);
  60  |   await expect(design(page)).toHaveAttribute('data-growth-design', 'unavailable');
  61  |   await expect(page.locator('#gl-design-status')).toContainText('Save a control');
  62  |   await expect(page.locator('#gl-design-table tbody tr')).toHaveCount(4);
  63  |   await expect(page.locator('#gl-design-table')).toHaveAccessibleName('Saved control and proposed trial settings');
  64  |   await expect(page.locator('#gl-saved-result')).toHaveCount(0);
  65  |   expect(await state(page)).toEqual(before);
  66  |   await page.getByRole('button', { name: 'Use current conditions as control', exact: true }).click();
  67  |   await expect(design(page)).toHaveAttribute('data-growth-design', 'none');
  68  |   await setRange(page.locator('#gl-oxygen'), 35);
  69  |   await expect(design(page)).toHaveAttribute('data-growth-design', 'single');
  70  |   await expect(page.locator('#gl-design-status')).toContainText('Oxygen availability');
  71  |   await page.locator('#gl-profile').selectOption('thermus');
  72  |   await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
  73  |   await expect(page.locator('#gl-design-guidance')).toContainText('You can still run it');
  74  |   const shape = await page.evaluate(() => (window as any).__MicrobiologyCore.growth.designPreview(
  75  |     (window as any).__toolData.microbiology.growthInvestigation.control, (window as any).__toolData.microbiology.growthLab));
  76  |   expect(Object.keys(shape).sort()).toEqual(['changed', 'control', 'design', 'held', 'trial']);
  77  |   expect(shape.changed).toEqual(['profile', 'oxygen']); expect(shape.held).toEqual(['tempC', 'pH']);
  78  |   await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-live', 'polite');
  79  |   await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-atomic', 'true');
  80  |   expect(await page.locator('#gl-design-status table').count()).toBe(0);
  81  |   await expect(page.locator('#gl-saved-result')).toHaveCount(0);
  82  |   expect((await state(page)).growthInvestigation.trials || []).toHaveLength(0);
  83  |   await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-preview-phone.png') });
  84  |   await reload(page); await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
  85  | });
  86  | 
  87  | test('preparing one Growth difference preserves saved evidence, recovery, sweeps and all working responses', async ({ page }) => {
  88  |   const trial = { id: 7, control: base, conditions: { ...base, oxygen: 50 }, prediction: 'lower', hypothesis: 'Original trial hypothesis.', explanation: 'Original saved explanation.' };
  89  |   const removed = { trial: { ...trial, id: 9, conditions: { ...base, pH: 6 }, hypothesis: 'Recoverable hypothesis.' }, index: 1 };
  90  |   await mount(page, { tab: 'growthLab', growthReviewHour: 6,
  91  |     growthLab: { ...changed, understood: true, stuckRevealed: true, hypothesis: 'Independent legacy note.', log: [{ note: 'Keep this legacy log.' }] },
  92  |     growthInvestigation: { control: base, trials: [trial], removed, selectedId: 7, nextId: 10, prediction: 'unsure', hypothesis: 'My next prediction reasoning.', explanation: 'Independent notebook note.',
  93  |       sweep: { variable: 'oxygen', conditions: base }, previousSweep: { variable: 'pH', conditions: { ...changed, oxygen: 100 } }, sweepVariable: 'pH' },
  94  |     mysteryLab: { active: 'wall' }, quizAnswers: [1, 2] });
  95  |   const before = await state(page), savedView = await page.locator('#gl-saved-result').innerText();
  96  |   await page.locator('#gl-design-variable').selectOption('oxygen');
  97  |   expect(await state(page)).toEqual(before);
  98  |   await page.locator('#gl-design-prepare').press('Enter');
  99  |   await expect(page.locator('#gl-design-heading')).toBeFocused();
  100 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'single');
  101 |   let saved = await state(page);
> 102 |   expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
      |                           ^ Error: expect(received).toEqual(expected) // deep equality
  103 |   expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  104 |   expect(saved.growthReviewHour).toBe(6); expect(saved.mysteryLab).toEqual(before.mysteryLab); expect(saved.quizAnswers).toEqual(before.quizAnswers);
  105 |   expect(await page.locator('#gl-saved-result').innerText()).toBe(savedView);
  106 |   await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeEnabled();
  107 |   await expect(page.locator('#gl-design-prepare')).toHaveCount(0);
  108 |   await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-repair-phone.png') });
  109 |   await reload(page); saved = await state(page);
  110 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'single'); expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  111 |   expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
  112 | });
  113 | 
  114 | test('Growth still permits unchanged and multiple-difference exploration with the original saved prediction', async ({ page }) => {
  115 |   await mount(page, { tab: 'growthLab', growthLab: base, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Explore first.' } });
  116 |   const run = page.getByRole('button', { name: 'Run comparison', exact: true });
  117 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'none'); await expect(run).toBeEnabled(); await run.press('Enter');
  118 |   let saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(1);
  119 |   expect(saved.growthInvestigation.trials[0].conditions).toEqual(base); expect(saved.growthInvestigation.trials[0].prediction).toBe('unsure');
  120 |   await setRange(page.locator('#gl-pH'), 6); await setRange(page.locator('#gl-oxygen'), 50);
  121 |   await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded'); await expect(run).toBeEnabled(); await run.press('Enter');
  122 |   saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(2);
  123 |   expect(saved.growthInvestigation.trials[1].conditions).toEqual({ ...base, pH: 6, oxygen: 50 });
  124 |   expect(saved.growthInvestigation.trials[1].prediction).toBe('unsure');
  125 |   await expect(page.locator('#gl-saved-result [data-design="confounded"]')).toBeVisible();
  126 | });
  127 | 
  128 | test('Growth setup preparation respects a later focus-only move to an activity tab', async ({ page }) => {
  129 |   await mount(page, { tab: 'growthLab', growthLab: { ...changed, understood: true, stuckRevealed: true }, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Keep my reasoning.' } });
  130 |   await page.locator('#gl-design-variable').selectOption('tempC');
  131 |   await page.evaluate(() => {
  132 |     const original = window.setTimeout; (window as any).__originalFocusTimeout = original; (window as any).__pendingDesignFocus = [];
  133 |     window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
  134 |       if (delay === 0) { (window as any).__pendingDesignFocus.push(() => callback(...args)); return 0; }
  135 |       return original(callback, delay, ...args);
  136 |     }) as typeof window.setTimeout;
  137 |   });
  138 |   await page.locator('#gl-design-prepare').click(); const nextFocus = page.locator('#micro-tab-quiz'); await nextFocus.focus(); const before = await state(page);
  139 |   await page.evaluate(() => { window.setTimeout = (window as any).__originalFocusTimeout; for (const callback of (window as any).__pendingDesignFocus) callback(); delete (window as any).__pendingDesignFocus; delete (window as any).__originalFocusTimeout; });
  140 |   await expect(nextFocus).toBeFocused(); expect(await state(page)).toEqual(before); await expect(page.locator('#micro-tab-growthLab')).toHaveAttribute('aria-selected', 'true');
  141 |   expect(before.growthLab).toEqual({ ...base, tempC: 70, understood: true, stuckRevealed: true }); expect(before.growthInvestigation.hypothesis).toBe('Keep my reasoning.');
  142 | });
  143 | 
  144 | test('Resistance phone layout keeps readable help, large controls and shape-based chart descriptions', async ({ page }) => {
  145 |   await mount(page, { tab: 'resistance' }); const panel = page.locator('[data-micro-resistance-workspace]');
  146 |   const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  147 |   await expect(exposure).toHaveAttribute('aria-describedby', /micro-resistance-exposure-help/);
  148 |   await expect(page.getByRole('slider', { name: 'Number of exposure rounds in the teaching model', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-rounds-help/);
  149 |   await expect(page.getByRole('slider', { name: 'Initial resistance', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-initial-help/);
  150 |   await expect(page.locator('#micro-resistance-share-help')).toContainText('With no survivors, the share is undefined.');
  151 |   await expect(page.getByRole('img', { name: /^Resistance trend/ })).toHaveAttribute('aria-describedby', 'micro-resistance-share-help');
  152 |   await expect(page.locator('[data-resistance-shape-legend]')).toContainText('sensitive circles');
  153 |   await expect(page.locator('[data-resistance-shape-legend]')).toContainText('resistant diamonds');
  154 |   const before = await state(page); await phone(page); await noOverflow(page);
  155 |   for (const selector of ['#micro-resistance-share-help', '#micro-resistance-exposure-help', '[data-resistance-shape-legend]'])
  156 |     expect(await page.locator(selector).evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(13);
  157 |   for (const target of [exposure, page.getByRole('button', { name: 'Step round', exact: true }), page.getByRole('button', { name: '▶ Play', exact: true })])
  158 |     expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  159 |   expect(await state(page)).toEqual(before);
  160 |   await panel.screenshot({ path: path.join(out, 'resistance-readable-phone.png') });
  161 | });
  162 | 
  163 | test('Resistance reflows at enlarged text and retains keyboard controls, current run and saved notebook', async ({ page }) => {
  164 |   const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', history: [{ day: 0, sensitive: 72, resistant: 8 }] };
  165 |   const savedEvidence = { ...evidence, notes: 'Original saved notes.', history: [...evidence.history, { day: 1, sensitive: 60, resistant: 8 }] };
  166 |   await mount(page, { tab: 'resistance', resistanceInvestigation: evidence,
  167 |     resistanceNotebook: { records: [{ id: 7, evidence: savedEvidence, reviewNote: 'Later saved reflection.' }], selectedId: 7 } });
  168 |   await open(page.locator('.micro-resistance-saved'));
  169 |   await expect(page.locator('[data-resistance-evidence="7"]')).toBeVisible();
  170 |   await expect(page.locator('[data-resistance-evidence="7"]')).toContainText('Original saved notes.');
  171 |   await expect(page.locator('#micro-resistance-review-note')).toHaveValue('Later saved reflection.');
  172 |   await page.emulateMedia({ reducedMotion: 'reduce' }); const before = await state(page);
  173 |   await page.setViewportSize({ width: 1280, height: 960 });
  174 |   await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await noOverflow(page);
  175 |   await page.locator('[data-micro-resistance-workspace]').screenshot({ path: path.join(out, 'resistance-readable-zoom.png') });
  176 |   await page.evaluate(() => { document.documentElement.style.zoom = '4'; }); await noOverflow(page);
  177 |   expect(await state(page)).toEqual(before);
  178 |   await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  179 |   const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  180 |   await exposure.focus(); await exposure.press('ArrowRight'); await expect(exposure).toHaveValue('35');
  181 |   await page.getByRole('radio', { name: 'Increase', exact: true }).press('Space');
  182 |   await page.getByRole('button', { name: 'Step round', exact: true }).press('Enter');
  183 |   await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(1);
  184 |   const saved = await state(page); expect(saved.resistanceNotebook).toEqual(before.resistanceNotebook);
  185 |   await expect(exposure).toBeDisabled(); await expect(page.getByRole('img', { name: /^Petri dish model/ })).toHaveAccessibleName(/exposure round 1/);
  186 | });
  187 | 
```