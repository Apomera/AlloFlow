# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> distance readings follow the model and a completed discovery leads to shielding
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:120:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-reading]')
Expected: "25%"
Received: "50%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-reading]')
    32 × locator resolved to <strong data-ns-reading="true">50%</strong>
       - unexpected value "50%"

```

```yaml
- strong: 50%
```

# Test source

```ts
  30  | 
  31  | test('a keyboard learner completes both experiments and retains progress between views', async ({ page }) => {
  32  |   const errors: string[] = [];
  33  |   page.on('pageerror', error => errors.push(error.message));
  34  |   await page.setViewportSize({ width: 1200, height: 1000 });
  35  |   await mount(page);
  36  |   await expect(page.locator('[data-nk-sec]')).toHaveCount(0);
  37  |   await page.screenshot({ path: `${output}/studio-desktop.png`, fullPage: true });
  38  |   await audit(page);
  39  |   await page.getByRole('button', { name: '32', exact: true }).focus();
  40  |   await page.keyboard.press('Enter');
  41  |   const advance = page.getByRole('button', { name: 'Advance one half-life' });
  42  |   await advance.focus();
  43  |   await page.keyboard.press('Enter');
  44  |   await page.keyboard.press('Enter');
  45  |   await expect(page.locator('.ns-result')).toContainText('you predicted 32');
  46  |   await page.getByRole('button', { name: 'Each interval halves' }).click();
  47  |   await chooseExperiment(page, 'shield');
  48  |   await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  49  |   await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  50  |   const slider = page.getByRole('slider', { name: 'Thickness' });
  51  |   await slider.focus();
  52  |   await page.keyboard.press('ArrowRight');
  53  |   await expect(slider).toHaveValue('2.5');
  54  |   await page.getByRole('button', { name: 'Test this shield' }).click();
  55  |   await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  56  |   await page.getByRole('group', { name: 'Material to test' }).getByRole('button', { name: 'Lead' }).click();
  57  |   await expect(page.locator('[data-ns-reading]')).toHaveText('83.8%');
  58  |   await page.getByRole('button', { name: 'Test this shield' }).click();
  59  |   await expect(page.locator('[data-ns-reading]')).toHaveText('14.6%');
  60  |   await page.getByRole('button', { name: 'At the same thickness, different' }).click();
  61  |   await expect(page.locator('.ns-progress')).toContainText('2 / 4');
  62  |   await page.screenshot({ path: `${output}/shield-comparison.png`, fullPage: true });
  63  |   await audit(page);
  64  |   await page.getByRole('button', { name: 'Reactor control room', exact: true }).click();
  65  |   await expect(page.locator('[data-nk-sec]')).toHaveCount(1);
  66  |   await expect(page.locator('#rx-rods')).toBeVisible();
  67  |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  68  |   await expect(page.getByRole('region', { name: 'Experiment studio' })).toBeFocused();
  69  |   await expect(page.locator('.ns-progress')).toContainText('2 / 4');
  70  |   expect(errors).toEqual([]);
  71  | });
  72  | 
  73  | for (const width of [390, 320]) {
  74  |   test(`controls precede the notebook and fit at ${width}px with larger text`, async ({ page }) => {
  75  |     await page.setViewportSize({ width, height: 844 });
  76  |     await page.emulateMedia({ reducedMotion: 'reduce' });
  77  |     await mount(page, { nkLargeText: true, nkReduceMotion: true });
  78  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  79  |     const controls = await page.locator('.ns-controls').boundingBox();
  80  |     const notebook = await page.locator('[data-ns-notebook]').boundingBox();
  81  |     expect(controls!.y + controls!.height).toBeLessThanOrEqual(notebook!.y);
  82  |     expect(await page.locator('.ns-atom').first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  83  |     await page.screenshot({ path: `${output}/studio-mobile-${width}.png`, fullPage: true });
  84  |     await audit(page);
  85  |     await chooseExperiment(page, 'shield');
  86  |     await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  87  |     await page.getByRole('button', { name: 'Test this shield' }).click();
  88  |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  89  |     await page.screenshot({ path: `${output}/shield-mobile-${width}.png`, fullPage: true });
  90  |     await audit(page);
  91  |     for (const kind of ['distance', 'chain']) {
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
  110 |   for (const kind of ['distance', 'chain']) {
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
> 130 |   await expect(page.locator('[data-ns-reading]')).toHaveText('25%');
      |                                                   ^ Error: expect(locator).toHaveText(expected) failed
  131 |   await page.getByRole('button', { name: '4 m', exact: true }).click();
  132 |   await page.getByRole('button', { name: 'Take a reading' }).click();
  133 |   await expect(page.locator('[data-ns-reading]')).toHaveText('6.25%');
  134 |   await page.getByRole('button', { name: 'The same output spreads' }).click();
  135 |   await expect(page.locator('.ns-progress')).toContainText('2 / 4');
  136 |   await page.screenshot({ path: `${output}/distance-discovery.png`, fullPage: true });
  137 |   await audit(page);
  138 |   await page.getByRole('button', { name: 'Continue: The shielding challenge' }).click();
  139 |   await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  140 |   await expect(page.locator('[data-ns-intro]')).toHaveCount(0);
  141 | });
  142 | 
  143 | test('a learner compares chain generations and continues to the reactor with all discoveries saved', async ({ page }) => {
  144 |   await page.setViewportSize({ width: 1100, height: 1000 });
  145 |   await mount(page, { nkStudio: { completed: ['decay', 'distance', 'shield'] } });
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
  159 |   await expect(page.locator('.ns-progress')).toContainText('4 / 4');
  160 |   await page.screenshot({ path: `${output}/chain-discovery.png`, fullPage: true });
  161 |   await audit(page);
  162 |   await page.getByRole('button', { name: 'Continue to the reactor' }).click();
  163 |   await expect(page.locator('#rx-rods')).toBeVisible();
  164 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  165 |   await expect(page.locator('.ns-progress')).toContainText('4 / 4');
  166 |   await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  167 | });
  168 | 
```