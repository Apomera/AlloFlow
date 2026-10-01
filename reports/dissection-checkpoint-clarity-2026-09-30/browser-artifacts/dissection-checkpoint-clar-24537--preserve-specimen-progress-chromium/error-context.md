# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-checkpoint-clarity.spec.ts >> keyboard browsing, coaching and explicit confirmation preserve specimen progress
- Location: tests\e2e\dissection-checkpoint-clarity.spec.ts:109:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 15

@@ -14,11 +14,25 @@
      "incisionStarted": false,
      "inspected": false,
      "pins": Array [],
      "probed": false,
      "retracted": false,
-     "tissue": undefined,
+     "tissue": Object {
+       "clarity": 80,
+       "consequences": Array [],
+       "exposure": 8,
+       "lastAction": "prepared",
+       "lastUpdatedAt": 1790811208120,
+       "moisture": 68,
+       "risk": 12,
+       "salineDrops": 0,
+       "stability": 18,
+       "tension": 54,
+       "trauma": 0,
+       "variantId": "firm",
+       "variantLabel": "Firm preservation",
+     },
    },
    "revealed": Object {},
    "score": 1,
    "total": 2,
    "verified": Object {
```

# Test source

```ts
  34  |   });
  35  | }
  36  | 
  37  | async function checkReadable(page: Page, selector: string, name: string, available: number, large = false) {
  38  |   const panel = page.locator(selector);
  39  |   await panel.screenshot({ path: `${out}/after-${name}.png`, style: captureStyle });
  40  |   const metrics = await panel.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
  41  |     choices: Array.from(el.querySelectorAll('.diss-learning-check__option')).map(node => ({ height: node.getBoundingClientRect().height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })),
  42  |     text: Array.from(el.querySelectorAll('h3, .diss-learning-check__eyebrow, .diss-learning-check__prompt, .diss-learning-check__phase, .diss-learning-check__phase-status, .diss-learning-check__answer, .diss-learning-check__marker, .diss-learning-check__keyboard-help, .diss-learning-check__feedback, .diss-learning-check__perform, .diss-learning-check__action')).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
  43  |   await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
  44  |   expect(metrics.width).toBeLessThanOrEqual(available);
  45  |   expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  46  |   for (const choice of metrics.choices) {
  47  |     expect(choice.height).toBeGreaterThanOrEqual(63.9);
  48  |     expect(choice.scrollWidth).toBeLessThanOrEqual(choice.clientWidth + 1);
  49  |   }
  50  |   for (const text of metrics.text) {
  51  |     expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
  52  |     expect(text.clipped, text.text || '').toBe(false);
  53  |   }
  54  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  55  |   const audit = await page.evaluate(async selector => (window as any).axe.run({ include: [[selector]] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }), selector);
  56  |   await writeFile(`${out}/axe-${name}.json`, JSON.stringify(audit, null, 2));
  57  |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  58  | }
  59  | 
  60  | for (const { name, width, available, large, contrast, forced } of [
  61  |   { name: 'phone', width: 320, available: 320 },
  62  |   { name: 'tablet', width: 768, available: 768 },
  63  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  64  |   { name: 'desktop', width: 1440, available: 1180 },
  65  |   { name: 'forced-colors', width: 390, available: 390, forced: true },
  66  | ]) {
  67  |   test(`checkpoint ${name} keeps readable answers and original names`, async ({ page }) => {
  68  |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  69  |     if (forced) await page.emulateMedia({ forcedColors: 'active' });
  70  |     await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
  71  |     const panel = page.locator('#diss-learning-checkpoint');
  72  |     const choices = panel.locator('.diss-learning-check__option');
  73  |     const names = await choices.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || node.textContent));
  74  |     if (baseline) {
  75  |       await writeFile(`${out}/before-${name}-names.json`, JSON.stringify(names, null, 2));
  76  |       await panel.screenshot({ path: `${out}/before-${name}.png`, style: captureStyle }); return;
  77  |     }
  78  |     const before = await evidence(page);
  79  |     const original = JSON.parse(await readFile(`${out}/before-${name}-names.json`, 'utf8'));
  80  |     await expect(choices).toHaveCount(3);
  81  |     for (let i = 0; i < original.length; i++) await expect(choices.nth(i)).toHaveAccessibleName(original[i]);
  82  |     await expect(panel.locator('[aria-current="step"] .diss-learning-check__phase-status')).toHaveText('Current');
  83  |     await checkReadable(page, '#diss-learning-checkpoint', name, available, !!large);
  84  |     await choices.nth(1).focus(); await expect(choices.nth(1)).toBeFocused();
  85  |     await choices.nth(1).screenshot({ path: `${out}/focus-${name}.png` });
  86  |     expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  87  |   });
  88  | }
  89  | 
  90  | test('reflection is readable and verifies only the explicit explanation', async ({ page }) => {
  91  |   await mount(page, reflecting);
  92  |   const panel = page.locator('#diss-learning-checkpoint');
  93  |   await expect(panel).toHaveAttribute('data-phase', 'reflect');
  94  |   if (baseline) { await panel.screenshot({ path: `${out}/before-reflection.png`, style: captureStyle }); return; }
  95  |   await checkReadable(page, '#diss-learning-checkpoint', 'reflection', 390);
  96  |   const before = await evidence(page);
  97  |   const choices = panel.locator('.diss-learning-check__option');
  98  |   await choices.first().focus(); await page.keyboard.press('ArrowRight');
  99  |   await expect(choices.nth(1)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  100 |   await page.keyboard.press('Enter');
  101 |   await expect(panel).toHaveAttribute('data-phase', 'predict');
  102 |   await expect(panel).toHaveAttribute('data-learning-action', 'scalpel');
  103 |   const after = await evidence(page);
  104 |   expect(after.checks.inspect.reflectionCorrect).toBe(true);
  105 |   expect(after.checks.inspect.reflectionAttempts).toBe(1);
  106 |   expect({ ...after, checks: before.checks }).toEqual(before);
  107 | });
  108 | 
  109 | test('keyboard browsing, coaching and explicit confirmation preserve specimen progress', async ({ page }) => {
  110 |   test.skip(baseline, 'Baseline captures only.');
  111 |   await mount(page);
  112 |   const panel = page.locator('#diss-learning-checkpoint');
  113 |   const choices = panel.locator('.diss-learning-check__option');
  114 |   const before = await evidence(page);
  115 |   await choices.first().focus();
  116 |   const intercepted = await choices.first().evaluate(node => [
  117 |     { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }, { key: 'End', shiftKey: true },
  118 |     { key: 'Home', metaKey: true }, { key: 'ArrowRight', isComposing: true }, { key: 'ArrowRight', keyCode: 229 },
  119 |   ].map(options => { const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }));
  120 |   expect(intercepted).toEqual([false, false, false, false, false, false]);
  121 |   await expect(choices.first()).toBeFocused();
  122 |   for (const [key, index] of [['End', 2], ['ArrowRight', 0], ['ArrowDown', 1], ['ArrowUp', 0], ['ArrowLeft', 2], ['Home', 0]] as const) {
  123 |     await page.keyboard.press(key); await expect(choices.nth(index)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  124 |   }
  125 |   await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  126 |   await expect(panel).toHaveAttribute('data-phase', 'predict');
  127 |   await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
  128 |   await expect(choices.nth(1).locator('.diss-learning-check__marker')).toHaveText('Review choice');
  129 |   await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-learning-check-feedback');
  130 |   await checkReadable(page, '#diss-learning-checkpoint', 'coaching', 390);
  131 |   const coached = await evidence(page);
  132 |   expect(coached.checks.inspect.predictionCorrect).toBe(false);
  133 |   expect(coached.checks.inspect.predictionAttempts).toBe(1);
> 134 |   expect({ ...coached, checks: before.checks }).toEqual(before);
      |                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  135 |   await choices.first().focus(); await page.keyboard.press('Enter');
  136 |   await expect(panel).toHaveAttribute('data-phase', 'perform');
  137 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  138 |   const confirmed = await evidence(page);
  139 |   expect(confirmed.checks.inspect.predictionCorrect).toBe(true);
  140 |   expect(confirmed.checks.inspect.predictionAttempts).toBe(2);
  141 |   expect({ ...confirmed, checks: before.checks }).toEqual(before);
  142 | });
  143 | 
  144 | test('confirmed plan shortcuts focus the required instrument and specimen', async ({ page }) => {
  145 |   test.skip(baseline, 'Baseline captures only.');
  146 |   await mount(page, { procedureByLayer: { skin: { learningChecks: { inspect: { predictionCorrect: true } } } } });
  147 |   const panel = page.locator('#diss-learning-checkpoint');
  148 |   await expect(panel).toHaveAttribute('data-phase', 'perform');
  149 |   await checkReadable(page, '#diss-learning-checkpoint', 'perform', 390);
  150 |   const before = await evidence(page);
  151 |   await panel.getByRole('button', { name: 'Prepare Probe', exact: true }).click();
  152 |   await expect(page.locator('#diss-instrument-probe')).toBeFocused();
  153 |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.techniquePanelOpen)).toBe(true);
  154 |   expect(await evidence(page)).toEqual(before);
  155 |   await panel.getByRole('button', { name: 'Go to specimen', exact: true }).click();
  156 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  157 |   expect(await evidence(page)).toEqual(before);
  158 | });
  159 | 
  160 | test('guided observation browsing and coaching require explicit evidence confirmation', async ({ page }) => {
  161 |   test.skip(baseline, 'Baseline captures only.');
  162 |   await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], guidedObservationPending: 'ventral_skin' });
  163 |   const panel = page.locator('#diss-guided-observation-check');
  164 |   const choices = panel.locator('.diss-learning-check__option');
  165 |   await expect(choices).toHaveCount(3);
  166 |   await checkReadable(page, '#diss-guided-observation-check', 'guided', 390);
  167 |   const before = await evidence(page);
  168 |   await choices.first().focus(); await page.keyboard.press('ArrowRight');
  169 |   await expect(choices.nth(1)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  170 |   await page.keyboard.press('Enter');
  171 |   await expect(choices.nth(1).locator('.diss-learning-check__marker')).toHaveText('Review choice');
  172 |   await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-guided-observation-feedback');
  173 |   expect(await evidence(page)).toEqual(before);
  174 |   await choices.first().focus(); await page.keyboard.press('Enter');
  175 |   await expect(panel).toHaveCount(0);
  176 |   const after = await evidence(page);
  177 |   expect(after.guidedStep).toBe(1); expect(after.pending).toBeNull();
  178 |   expect(after.verified['frog|ventral_skin'].status).toBe('verified');
  179 |   expect({ ...after, verified: before.verified, guidedStep: before.guidedStep, pending: before.pending }).toEqual(before);
  180 | });
  181 | 
  182 | for (const mode of ['quiz', 'practical']) {
  183 |   test(`${mode} keeps planning checkpoints hidden`, async ({ page }) => {
  184 |     test.skip(baseline, 'Baseline captures only.');
  185 |     await mount(page, { quizMode: true, practicalMode: mode === 'practical', practicalTimer: mode === 'practical' ? 300 : 0, practicalEndsAt: mode === 'practical' ? Date.now() + 300000 : 0, practicalTargetIds: mode === 'practical' ? ['ventral_skin', 'tympanum'] : [] });
  186 |     if (mode === 'practical') expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
  187 |     await expect(page.locator('.diss-learning-check')).toHaveCount(0);
  188 |   });
  189 | }
  190 | 
```