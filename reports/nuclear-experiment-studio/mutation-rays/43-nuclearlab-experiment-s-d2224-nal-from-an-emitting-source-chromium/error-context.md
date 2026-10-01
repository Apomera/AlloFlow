# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> radiation paths distinguish a blocked signal from an emitting source
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:226:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-reading]')
Expected: "Reaches the detector"
Received: "Stopped by paper"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-reading]')
    33 × locator resolved to <p class="ns-signal" data-ns-reading="true">Stopped by paper</p>
       - unexpected value "Stopped by paper"

```

```yaml
- paragraph: Stopped by paper
```

# Test source

```ts
  159 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  160 |   await page.getByRole('button', { name: '0.8 · Fewer', exact: true }).click();
  161 |   for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Advance one generation' }).click();
  162 |   await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  163 |   await page.getByRole('button', { name: 'A steady chain keeps producing' }).click();
  164 |   await expect(page.locator('.ns-progress')).toContainText('6 / 6');
  165 |   await page.screenshot({ path: `${output}/chain-discovery.png`, fullPage: true });
  166 |   await audit(page);
  167 |   await page.getByRole('button', { name: 'Continue to the reactor' }).click();
  168 |   await expect(page.locator('#rx-rods')).toBeVisible();
  169 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  170 |   await expect(page.locator('.ns-progress')).toContainText('6 / 6');
  171 |   await expect(page.locator('[data-ns-reading]')).toHaveText('8.2');
  172 | });
  173 | 
  174 | test('three counting observations unlock a discovery, hints, and a keyboard recap', async ({ page }) => {
  175 |   await page.setViewportSize({ width: 1100, height: 1000 });
  176 |   await mount(page, { nkStudio: { mission: 'counting' } });
  177 |   const takeCount = page.getByRole('button', { name: 'Take a 10-second count' });
  178 |   await expect(takeCount).toBeDisabled();
  179 |   const hint = page.locator('.ns-hint');
  180 |   await expect(hint).not.toHaveAttribute('open');
  181 |   await hint.locator('summary').focus();
  182 |   await page.keyboard.press('Enter');
  183 |   await expect(hint).toHaveAttribute('open');
  184 |   await expect(hint).toContainText('Choose the prediction');
  185 |   await page.getByRole('button', { name: 'They can differ', exact: true }).click();
  186 |   await expect(hint).toContainText('at least three readings');
  187 |   await takeCount.click();
  188 |   await takeCount.click();
  189 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  190 |   await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(2);
  191 |   await takeCount.click();
  192 |   await expect(page.locator('[data-ns-reading]')).toHaveText(/^\d+$/);
  193 |   await expect(page.locator('[data-ns-status]')).toContainText('3 readings in your notebook');
  194 |   await expect(page.locator('[data-ns-explain="counting"]')).toHaveCount(1);
  195 |   await hint.locator('summary').click();
  196 |   await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  197 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  198 |   const observations = await page.locator('[data-ns-notebook] tbody').innerText();
  199 |   await page.locator('.ns-recap > summary').focus();
  200 |   await page.keyboard.press('Enter');
  201 |   await expect(page.locator('[data-ns-discovery]')).toHaveCount(1);
  202 |   await page.screenshot({ path: `${output}/counting-discovery.png`, fullPage: true });
  203 |   await audit(page);
  204 |   await page.getByRole('button', { name: 'Continue: Keep the chain going' }).click();
  205 |   await page.getByRole('button', { name: 'Revisit: One count, or a pattern?', exact: true }).focus();
  206 |   await page.keyboard.press('Enter');
  207 |   await expect(page.getByRole('heading', { name: 'Can the same setup give different counts?' })).toBeFocused();
  208 |   expect(await page.locator('[data-ns-notebook] tbody').innerText()).toBe(observations);
  209 | });
  210 | 
  211 | test('matching zero readings remain readable on a small screen', async ({ page }) => {
  212 |   await page.setViewportSize({ width: 320, height: 844 });
  213 |   await mount(page, { nkLargeText: true, nkStudio: { mission: 'counting', counting: { prediction: 'vary', runs: [0, 0, 0] } } });
  214 |   await expect(page.locator('[data-ns-reading]')).toHaveText('0');
  215 |   await expect(page.locator('.ns-feedback')).toContainText('These readings match.');
  216 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  217 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  218 |   await page.screenshot({ path: `${output}/counting-zero-mobile.png`, fullPage: true });
  219 |   await audit(page);
  220 |   await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  221 |   await page.getByRole('button', { name: 'Start again', exact: true }).click();
  222 |   await expect(page.locator('[data-ns-reading]')).toHaveText('—');
  223 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  224 | });
  225 | 
  226 | test('radiation paths distinguish a blocked signal from an emitting source', async ({ page }) => {
  227 |   const errors: string[] = [];
  228 |   page.on('pageerror', error => errors.push(error.message));
  229 |   page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  230 |   await page.setViewportSize({ width: 1100, height: 1000 });
  231 |   await mount(page, { nkStudio: { mission: 'rays' } });
  232 |   const alphaOpen = page.locator('[data-ns-setup="alpha-open"]');
  233 |   const alphaPaper = page.locator('[data-ns-setup="alpha-paper"]');
  234 |   const gammaPaper = page.locator('[data-ns-setup="gamma-paper"]');
  235 |   await expect(alphaOpen).toBeDisabled();
  236 |   await page.getByRole('button', { name: 'Both types', exact: true }).click();
  237 |   await alphaOpen.focus();
  238 |   await page.keyboard.press('Enter');
  239 |   await expect(alphaOpen).toBeFocused();
  240 |   await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
  241 |   await expect(page.locator('.ns-prediction')).not.toHaveAttribute('open');
  242 |   await expect(page.locator('.ns-prediction > summary')).toHaveText('Your prediction: Both types');
  243 |   await page.locator('.ns-prediction > summary').focus();
  244 |   await page.keyboard.press('Enter');
  245 |   await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeVisible();
  246 |   await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeDisabled();
  247 |   await alphaPaper.click();
  248 |   await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  249 |   await page.locator('.ns-prediction > summary').click();
  250 |   await expect(page.locator('[data-ns-reading]')).toHaveText('Stopped by paper');
  251 |   await expect(page.locator('[data-ns-scene]')).toContainText('Source: still emitting.');
  252 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  253 |   await alphaPaper.click();
  254 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  255 |   await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(2);
  256 |   await page.screenshot({ path: `${output}/rays-alpha-paper.png`, fullPage: true });
  257 |   await audit(page);
  258 |   await gammaPaper.click();
> 259 |   await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
      |                                                   ^ Error: expect(locator).toHaveText(expected) failed
  260 |   await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['Reaches the detector', 'Stopped by paper', 'Reaches the detector']);
  261 |   await page.getByRole('button', { name: 'Paper switches off' }).click();
  262 |   await expect(page.locator('.ns-progress')).toContainText('0 / 6');
  263 |   await page.getByRole('button', { name: 'Paper blocks the alpha path' }).click();
  264 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  265 |   await page.screenshot({ path: `${output}/rays-discovery.png`, fullPage: true });
  266 |   await audit(page);
  267 |   await page.getByRole('button', { name: 'Continue: The shielding challenge' }).click();
  268 |   await expect(page.getByRole('heading', { name: 'Can you weaken the beam?' })).toBeFocused();
  269 |   await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  270 |   await chooseExperiment(page, 'rays');
  271 |   await expect(page.locator('.ns-prediction')).not.toHaveAttribute('open');
  272 |   await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
  273 |   await page.getByRole('button', { name: 'Start again', exact: true }).click();
  274 |   await expect(page.locator('.ns-prediction')).toHaveAttribute('open');
  275 |   await expect(page.getByRole('button', { name: 'Both types', exact: true })).toBeEnabled();
  276 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  277 |   expect(errors).toEqual([]);
  278 | });
  279 | 
```