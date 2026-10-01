# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-instrument-preparation.spec.ts >> practical keeps preparation shortcuts hidden
- Location: tests\e2e\dissection-instrument-preparation.spec.ts:146:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-preparation-action]')
Expected: 0
Received: 2
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-preparation-action]')
    30 × locator resolved to 2 elements
       - unexpected value "2"

```

# Test source

```ts
  49  |     const before = await evidence(page);
  50  |     const inventory = await tray.getByRole('radio').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label'), disabled: (node as HTMLButtonElement).disabled, checked: node.getAttribute('aria-checked'), next: node.getAttribute('data-next'), readiness: node.getAttribute('data-readiness'), tabIndex: node.getAttribute('tabindex') })));
  51  |     await writeFile(`${out}/${baseline ? 'before' : 'after'}-${name}-inventory.json`, JSON.stringify(inventory, null, 2));
  52  |     if (baseline) {
  53  |       await tray.screenshot({ path: `${out}/before-tray-${name}.png`, style: captureStyle });
  54  |       await panel.locator('.diss-readiness').screenshot({ path: `${out}/before-readiness-${name}.png`, style: captureStyle });
  55  |       await panel.locator('.diss-calibration').screenshot({ path: `${out}/before-calibration-${name}.png`, style: captureStyle });
  56  |       return;
  57  |     }
  58  |     expect(inventory).toEqual(JSON.parse(await readFile(`${out}/before-${name}-inventory.json`, 'utf8')));
  59  |     const preparation = page.locator('[data-instrument-preparation]');
  60  |     await tray.screenshot({ path: `${out}/after-tray-${name}.png`, style: captureStyle });
  61  |     await panel.locator('.diss-readiness').screenshot({ path: `${out}/after-readiness-${name}.png`, style: captureStyle });
  62  |     await panel.locator('.diss-calibration').screenshot({ path: `${out}/after-calibration-${name}.png`, style: captureStyle });
  63  |     await expect(tray.getByRole('radio')).toHaveCount(7);
  64  |     await expect(tray.locator('[aria-checked="true"] [data-tool-marker="selected"]')).toHaveText('Selected');
  65  |     await expect(tray.locator('[data-next="true"] [data-tool-marker="next"]')).toHaveText('Next step');
  66  |     await expect(tray.locator('[aria-checked="true"] .diss-instrument__state')).toHaveText('Ready');
  67  |     const metrics = await preparation.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
  68  |       cards: Array.from(el.querySelectorAll('.diss-instrument')).map(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })),
  69  |       text: Array.from(el.querySelectorAll('.diss-instrument__name, .diss-instrument__state, .diss-instrument__hint, .diss-tool-marker, .diss-active-tool strong, #diss-active-tool-help, .diss-active-tool__badge, .diss-readiness__header strong, .diss-readiness__score, .diss-readiness__check span, .diss-readiness__cue, .diss-calibration__title strong, .diss-calibration__title span, .diss-calibration output, .diss-calibration__status b, .diss-calibration__status span, .diss-instrument-keyboard-help')).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
  70  |     await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
  71  |     expect(metrics.width).toBeLessThanOrEqual(available);
  72  |     expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  73  |     for (const card of metrics.cards) {
  74  |       expect(card.height).toBeGreaterThanOrEqual(103.9);
  75  |       expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
  76  |     }
  77  |     for (const text of metrics.text) {
  78  |       expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
  79  |       expect(text.clipped, text.text || '').toBe(false);
  80  |     }
  81  |     const selected = tray.locator('[aria-checked="true"]');
  82  |     await selected.focus(); await expect(selected).toBeFocused();
  83  |     await selected.screenshot({ path: `${out}/focus-${name}.png` });
  84  |     expect(await evidence(page)).toEqual(before);
  85  |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  86  |     const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-instrument-preparation]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  87  |     expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  88  |     expect(errors).toEqual([]);
  89  |   });
  90  | }
  91  | 
  92  | test('preparation shortcuts focus calibration and the specimen without performing an action', async ({ page }) => {
  93  |   test.skip(baseline, 'Baseline captures only.');
  94  |   await mount(page);
  95  |   const before = await evidence(page);
  96  |   await page.locator('[data-preparation-action="calibrate"]').click();
  97  |   await expect(page.locator('#diss-calibration-range')).toBeFocused();
  98  |   expect(await evidence(page)).toEqual(before);
  99  |   await page.locator('[data-preparation-action="specimen"]').click();
  100 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  101 |   expect(await evidence(page)).toEqual(before);
  102 | });
  103 | 
  104 | test('calibration adjustment remains explicit and changes only the intended setting', async ({ page }) => {
  105 |   test.skip(baseline, 'Baseline captures only.');
  106 |   await mount(page);
  107 |   const before = await evidence(page);
  108 |   const range = page.locator('#diss-calibration-range');
  109 |   const value = Number(await range.inputValue());
  110 |   await page.locator('[data-preparation-action="calibrate"]').click(); await page.keyboard.press('ArrowRight');
  111 |   await expect(range).toHaveValue(String(value + 1));
  112 |   const after = await evidence(page);
  113 |   expect(after.calibration.probePressure).toBe(value + 1);
  114 |   expect({ ...after, calibration: before.calibration }).toEqual(before);
  115 |   await expect(range).toHaveAttribute('aria-valuetext', new RegExp(`^${value + 1}%`));
  116 | });
  117 | 
  118 | test('keyboard instrument selection skips unavailable tools without recording technique progress', async ({ page }) => {
  119 |   test.skip(baseline, 'Baseline captures only.');
  120 |   await mount(page, { procedureScenario: 'restricted-tray' });
  121 |   const before = await evidence(page);
  122 |   await expect(page.locator('#diss-instrument-dropper')).toBeDisabled();
  123 |   await expect(page.locator('#diss-instrument-wick')).toBeDisabled();
  124 |   await page.locator('#diss-instrument-probe').focus(); await page.keyboard.press('End');
  125 |   await expect(page.locator('#diss-instrument-pin')).toBeFocused();
  126 |   await expect(page.locator('#diss-instrument-pin')).toHaveAttribute('aria-checked', 'true');
  127 |   expect(await evidence(page)).toEqual({ ...before, instrument: 'pin' });
  128 |   await page.keyboard.press('ArrowRight'); await expect(page.locator('#diss-instrument-probe')).toBeFocused();
  129 |   expect(await evidence(page)).toEqual(before);
  130 | });
  131 | 
  132 | test('modified and composing keys preserve the selected instrument', async ({ page }) => {
  133 |   test.skip(baseline, 'Baseline captures only.');
  134 |   await mount(page);
  135 |   const before = await evidence(page);
  136 |   const radio = page.locator('#diss-instrument-probe'); await radio.focus();
  137 |   const intercepted = await radio.evaluate(node => [
  138 |     { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }, { key: 'End', shiftKey: true },
  139 |     { key: 'Home', metaKey: true }, { key: 'ArrowRight', isComposing: true }, { key: 'ArrowRight', keyCode: 229 },
  140 |   ].map(options => { const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }));
  141 |   expect(intercepted).toEqual([false, false, false, false, false, false]);
  142 |   await expect(radio).toBeFocused(); expect(await evidence(page)).toEqual(before);
  143 | });
  144 | 
  145 | for (const mode of ['quiz', 'practical']) {
  146 |   test(`${mode} keeps preparation shortcuts hidden`, async ({ page }) => {
  147 |     test.skip(baseline, 'Baseline captures only.');
  148 |     await mount(page, { quizMode: mode === 'quiz', practicalMode: mode === 'practical' });
> 149 |     await expect(page.locator('[data-preparation-action]')).toHaveCount(0);
      |                                                             ^ Error: expect(locator).toHaveCount(expected) failed
  150 |   });
  151 | }
  152 | 
```