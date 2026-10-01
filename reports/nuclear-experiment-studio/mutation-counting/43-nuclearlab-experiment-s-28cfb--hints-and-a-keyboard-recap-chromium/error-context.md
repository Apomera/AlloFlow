# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> three counting observations unlock a discovery, hints, and a keyboard recap
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:169:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-ns-explain]')
Expected: 0
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-ns-explain]')
    25 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
  84  |     await audit(page);
  85  |     await chooseExperiment(page, 'shield');
  86  |     await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  87  |     await page.getByRole('button', { name: 'Test this shield' }).click();
  88  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  89  |     await page.screenshot({ path: `${output}/shield-mobile-${width}.png`, fullPage: true });
  90  |     await audit(page);
  91  |     for (const kind of ['distance', 'counting', 'chain']) {
  92  |       await chooseExperiment(page, kind);
  93  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  94  |       const introControls = await page.locator('.ns-controls').boundingBox();
  95  |       const introNotebook = await page.locator('[data-ns-notebook]').boundingBox();
  96  |       expect(introControls!.y + introControls!.height).toBeLessThanOrEqual(introNotebook!.y);
  97  |       await page.screenshot({ path: `${output}/${kind}-mobile-${width}.png`, fullPage: true });
  98  |       await audit(page);
  99  |     }
  100 |   });
  101 | }
  102 | 
  103 | test('light palette and forced colors preserve readable selected states', async ({ page }) => {
  104 |   await page.setViewportSize({ width: 1100, height: 950 });
  105 |   await mount(page);
  106 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  107 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  108 |   await page.screenshot({ path: `${output}/studio-light.png`, fullPage: true });
  109 |   await audit(page);
  110 |   for (const kind of ['distance', 'counting', 'chain']) {
  111 |     await chooseExperiment(page, kind);
  112 |     await page.screenshot({ path: `${output}/${kind}-light.png`, fullPage: true });
  113 |     await audit(page);
  114 |   }
  115 |   await page.emulateMedia({ forcedColors: 'active' });
  116 |   await expect(page.getByRole('button', { name: 'Experiment studio', exact: true })).toHaveCSS('outline-style', 'solid');
  117 |   await page.screenshot({ path: `${output}/studio-forced-colors.png`, fullPage: true });
  118 | });
  119 | 
  120 | test('distance readings follow the model and a completed discovery leads to shielding', async ({ page }) => {
  121 |   await page.setViewportSize({ width: 1100, height: 1000 });
  122 |   await mount(page, { nkStudio: { mission: 'distance', completed: ['decay'] } });
  123 |   await page.getByRole('button', { name: 'Half as much', exact: true }).click();
  124 |   await page.getByRole('button', { name: 'Take a reading' }).click();
  125 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  126 |   await page.getByRole('button', { name: '2 m', exact: true }).focus();
  127 |   await page.keyboard.press('Enter');
  128 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  129 |   await page.getByRole('button', { name: 'Take a reading' }).click();
  130 |   await expect(page.locator('[data-ns-reading]')).toHaveText('25%');
  131 |   await page.getByRole('button', { name: '4 m', exact: true }).click();
  132 |   await page.getByRole('button', { name: 'Take a reading' }).click();
  133 |   await expect(page.locator('[data-ns-reading]')).toHaveText('6.25%');
  134 |   await page.getByRole('button', { name: 'The same output spreads' }).click();
  135 |   await expect(page.locator('.ns-progress')).toContainText('2 / 5');
  136 |   await page.screenshot({ path: `${output}/distance-discovery.png`, fullPage: true });
  137 |   await audit(page);
  138 |   await page.getByRole('button', { name: 'Continue: The shielding challenge' }).click();
  139 |   await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  140 |   await expect(page.locator('[data-ns-intro]')).toHaveCount(0);
  141 | });
  142 | 
  143 | test('a learner compares chain generations and continues to the reactor with all discoveries saved', async ({ page }) => {
  144 |   await page.setViewportSize({ width: 1100, height: 1000 });
  145 |   await mount(page, { nkStudio: { completed: ['decay', 'distance', 'shield', 'counting'] } });
  146 |   await page.locator('.ns-chooser > summary').focus();
  147 |   await page.keyboard.press('Enter');
  148 |   await page.getByRole('button', { name: /Keep the chain going/ }).click();
  149 |   await expect(page.getByRole('heading', { name: 'Can a chain stay steady?' })).toBeFocused();
  150 |   await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
  151 |   await page.getByRole('button', { name: 'It stays steady', exact: true }).click();
  152 |   for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Advance one generation' }).click();
  153 |   await expect(page.locator('[data-ns-reading]')).toHaveText('20.0');
  154 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  155 |   await page.getByRole('button', { name: '0.8 · Fewer', exact: true }).click();
  156 |   for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Advance one generation' }).click();
  157 |   await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  158 |   await page.getByRole('button', { name: 'A steady chain keeps producing' }).click();
  159 |   await expect(page.locator('.ns-progress')).toContainText('5 / 5');
  160 |   await page.screenshot({ path: `${output}/chain-discovery.png`, fullPage: true });
  161 |   await audit(page);
  162 |   await page.getByRole('button', { name: 'Continue to the reactor' }).click();
  163 |   await expect(page.locator('#rx-rods')).toBeVisible();
  164 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  165 |   await expect(page.locator('.ns-progress')).toContainText('5 / 5');
  166 |   await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  167 | });
  168 | 
  169 | test('three counting observations unlock a discovery, hints, and a keyboard recap', async ({ page }) => {
  170 |   await page.setViewportSize({ width: 1100, height: 1000 });
  171 |   await mount(page, { nkStudio: { mission: 'counting' } });
  172 |   const takeCount = page.getByRole('button', { name: 'Take a 10-second count' });
  173 |   await expect(takeCount).toBeDisabled();
  174 |   const hint = page.locator('.ns-hint');
  175 |   await expect(hint).not.toHaveAttribute('open');
  176 |   await hint.locator('summary').focus();
  177 |   await page.keyboard.press('Enter');
  178 |   await expect(hint).toHaveAttribute('open');
  179 |   await expect(hint).toContainText('Choose the prediction');
  180 |   await page.getByRole('button', { name: 'They can differ', exact: true }).click();
  181 |   await expect(hint).toContainText('at least three readings');
  182 |   await takeCount.click();
  183 |   await takeCount.click();
> 184 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
      |                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  185 |   await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(2);
  186 |   await takeCount.click();
  187 |   await expect(page.locator('[data-ns-reading]')).toHaveText(/^\d+$/);
  188 |   await expect(page.locator('[data-ns-status]')).toContainText('3 readings in your notebook');
  189 |   await expect(page.locator('[data-ns-explain="counting"]')).toHaveCount(1);
  190 |   await hint.locator('summary').click();
  191 |   await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  192 |   await expect(page.locator('.ns-progress')).toContainText('1 / 5');
  193 |   const observations = await page.locator('[data-ns-notebook] tbody').innerText();
  194 |   await page.locator('.ns-recap > summary').focus();
  195 |   await page.keyboard.press('Enter');
  196 |   await expect(page.locator('[data-ns-discovery]')).toHaveCount(1);
  197 |   await page.screenshot({ path: `${output}/counting-discovery.png`, fullPage: true });
  198 |   await audit(page);
  199 |   await page.getByRole('button', { name: 'Continue: Keep the chain going' }).click();
  200 |   await page.getByRole('button', { name: 'Revisit: One count, or a pattern?', exact: true }).focus();
  201 |   await page.keyboard.press('Enter');
  202 |   await expect(page.getByRole('heading', { name: 'Can the same setup give different counts?' })).toBeFocused();
  203 |   expect(await page.locator('[data-ns-notebook] tbody').innerText()).toBe(observations);
  204 | });
  205 | 
  206 | test('matching zero readings remain readable on a small screen', async ({ page }) => {
  207 |   await page.setViewportSize({ width: 320, height: 844 });
  208 |   await mount(page, { nkLargeText: true, nkStudio: { mission: 'counting', counting: { prediction: 'vary', runs: [0, 0, 0] } } });
  209 |   await expect(page.locator('[data-ns-reading]')).toHaveText('0');
  210 |   await expect(page.locator('.ns-feedback')).toContainText('These readings match.');
  211 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  212 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  213 |   await page.screenshot({ path: `${output}/counting-zero-mobile.png`, fullPage: true });
  214 |   await audit(page);
  215 |   await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  216 |   await page.getByRole('button', { name: 'Start again', exact: true }).click();
  217 |   await expect(page.locator('[data-ns-reading]')).toHaveText('—');
  218 |   await expect(page.locator('.ns-progress')).toContainText('1 / 5');
  219 | });
  220 | 
```