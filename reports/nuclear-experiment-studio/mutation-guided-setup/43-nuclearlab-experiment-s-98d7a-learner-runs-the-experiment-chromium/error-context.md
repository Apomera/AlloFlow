# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided setups preserve the last reading until the learner runs the experiment
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:280:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-reading]')
Expected: "6.25%"
Received: "100%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-reading]')
    33 × locator resolved to <strong data-ns-reading="true">100%</strong>
       - unexpected value "100%"

```

```yaml
- strong: 100%
```

# Test source

```ts
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
  259 |   await expect(page.locator('[data-ns-reading]')).toHaveText('Reaches the detector');
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
  280 | test('guided setups preserve the last reading until the learner runs the experiment', async ({ page }) => {
  281 |   await page.setViewportSize({ width: 1100, height: 1000 });
  282 |   await mount(page, { nkStudio: { mission: 'distance', distance: { prediction: 'quarter', setting: 4, runs: [4] } } });
  283 |   await expect(page.locator('[data-ns-guide]')).toContainText('0 of 2 comparison readings');
  284 |   await page.getByRole('button', { name: 'Set distance to 1 m', exact: true }).focus();
  285 |   await page.keyboard.press('Enter');
  286 |   await expect(page.getByRole('button', { name: 'Take a reading' })).toBeFocused();
> 287 |   await expect(page.locator('[data-ns-reading]')).toHaveText('6.25%');
      |                                                   ^ Error: expect(locator).toHaveText(expected) failed
  288 |   await expect(page.locator('[data-ns-notebook] tbody tr')).toHaveCount(1);
  289 |   await page.keyboard.press('Enter');
  290 |   await expect(page.locator('[data-ns-guide]')).toContainText('1 of 2 comparison readings');
  291 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  292 |   await page.screenshot({ path: `${output}/guided-distance.png`, fullPage: true });
  293 |   await audit(page);
  294 |   await page.getByRole('button', { name: 'Set distance to 2 m', exact: true }).click();
  295 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  296 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  297 |   await page.getByRole('button', { name: 'Take a reading' }).click();
  298 |   await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  299 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  300 | 
  301 |   await chooseExperiment(page, 'shield');
  302 |   await page.getByRole('group', { name: 'Predict a shielding material' }).getByRole('button', { name: 'Lead' }).click();
  303 |   await page.getByRole('button', { name: 'Test this shield' }).click();
  304 |   await page.getByRole('group', { name: 'Material to test' }).getByRole('button', { name: 'Lead' }).click();
  305 |   await page.getByRole('slider', { name: 'Thickness' }).focus();
  306 |   for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  307 |   await expect(page.getByRole('slider', { name: 'Thickness' })).toHaveValue('4');
  308 |   await page.screenshot({ path: `${output}/guided-shield.png`, fullPage: true });
  309 |   await audit(page);
  310 |   await page.getByRole('button', { name: 'Prepare Lead at 2 cm', exact: true }).focus();
  311 |   await page.keyboard.press('Enter');
  312 |   await expect(page.getByRole('button', { name: 'Test this shield' })).toBeFocused();
  313 |   await expect(page.getByRole('slider', { name: 'Thickness' })).toHaveValue('2');
  314 |   await expect(page.locator('[data-ns-reading]')).toHaveText('86.8%');
  315 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  316 |   await page.keyboard.press('Enter');
  317 |   await expect(page.locator('[data-ns-reading]')).toHaveText('21.4%');
  318 |   await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  319 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  320 | });
  321 | 
  322 | test('chain guidance finishes the current run and prepares the missing comparison', async ({ page }) => {
  323 |   await page.setViewportSize({ width: 1100, height: 1000 });
  324 |   await mount(page, { nkStudio: { mission: 'chain', chain: { prediction: 'steady', setting: .8, step: 2, runs: [] } } });
  325 |   await expect(page.locator('[data-ns-guide]')).toContainText('2 of 4 generations');
  326 |   await expect(page.locator('[data-ns-prepare]')).toHaveCount(0);
  327 |   await page.getByRole('button', { name: 'Advance one generation' }).click();
  328 |   await page.getByRole('button', { name: 'Advance one generation' }).click();
  329 |   await expect(page.locator('[data-ns-guide]')).toContainText('1 of 2 comparison runs');
  330 |   await page.screenshot({ path: `${output}/guided-chain.png`, fullPage: true });
  331 |   await audit(page);
  332 |   await page.getByRole('button', { name: 'Prepare factor 1', exact: true }).focus();
  333 |   await page.keyboard.press('Enter');
  334 |   await expect(page.getByRole('button', { name: 'Advance one generation' })).toBeFocused();
  335 |   await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['8.2']);
  336 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  337 |   for (let i = 0; i < 4; i++) await page.keyboard.press('Enter');
  338 |   await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['8.2', '20.0']);
  339 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  340 |   await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  341 | });
  342 | 
  343 | test('a narrow experiment chooser resumes unfinished work with saved observations', async ({ page }) => {
  344 |   await page.setViewportSize({ width: 320, height: 844 });
  345 |   await mount(page, { nkLargeText: true, nkStudio: { mission: 'decay', lastWorked: 'counting', completed: ['decay'], distance: { prediction: 'quarter', runs: [1] }, counting: { prediction: 'vary', runs: [1, 4] } } });
  346 |   await page.locator('.ns-chooser > summary').focus();
  347 |   await page.keyboard.press('Enter');
  348 |   await expect(page.locator('[data-ns-mission="decay"] .ns-mission-state')).toHaveText('Discovery recorded');
  349 |   await expect(page.locator('[data-ns-mission="counting"] .ns-mission-state')).toHaveText('In progress');
  350 |   await expect(page.locator('[data-ns-mission="chain"] .ns-mission-state')).toHaveText('Not started');
  351 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  352 |   await page.screenshot({ path: `${output}/resume-mobile-320.png`, fullPage: true });
  353 |   await audit(page);
  354 |   await page.getByRole('button', { name: 'Resume: One count, or a pattern?', exact: true }).focus();
  355 |   await page.keyboard.press('Enter');
  356 |   await expect(page.getByRole('heading', { name: 'Can the same setup give different counts?' })).toBeFocused();
  357 |   await expect(page.locator('.ns-chooser')).not.toHaveAttribute('open');
  358 |   await expect(page.locator('[data-ns-notebook] tbody td')).toHaveText(['1', '4']);
  359 |   await expect(page.locator('[data-ns-guide]')).toContainText('2 of 3 readings');
  360 |   await page.getByRole('button', { name: 'Take a 10-second count' }).click();
  361 |   await page.getByRole('button', { name: 'Random variation can change counts' }).click();
  362 |   await page.locator('.ns-chooser > summary').click();
  363 |   await expect(page.locator('[data-ns-mission="counting"] .ns-mission-state')).toHaveText('Discovery recorded');
  364 |   await page.getByRole('button', { name: 'Resume: Give it some space', exact: true }).click();
  365 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  366 |   await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  367 |   await page.screenshot({ path: `${output}/guided-distance-mobile.png`, fullPage: true });
  368 |   await audit(page);
  369 | });
  370 | 
```