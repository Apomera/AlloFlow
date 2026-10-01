# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective requires separate effects and preserves the investigation when reviewing an idea
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:396:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-case-reading]')
Expected: "5.3%"
Received: "10.7%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-case-reading]')
    32 × locator resolved to <strong data-ns-case-reading="true">10.7%</strong>
       - unexpected value "10.7%"

```

```yaml
- strong: 10.7%
```

# Test source

```ts
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
  371 | test('a learner writes and revisits an optional takeaway on a small screen', async ({ page }) => {
  372 |   await page.setViewportSize({ width: 320, height: 844 });
  373 |   await mount(page, { nkLargeText: true, nkStudio: { completed: ['decay'], decay: { prediction: 16, step: 2 } } });
  374 |   await page.locator('.ns-recap > summary').focus();
  375 |   await page.keyboard.press('Enter');
  376 |   await page.locator('[data-ns-reflection="decay"] > summary').focus();
  377 |   await page.keyboard.press('Enter');
  378 |   const note = page.getByRole('textbox', { name: 'My takeaway from The disappearing sample', exact: true });
  379 |   await note.fill('A half-life halves the atoms that remain.');
  380 |   await expect(page.locator('[data-ns-reflection="decay"]')).toContainText('Note kept with this discovery.');
  381 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  382 |   await page.screenshot({ path: `${output}/takeaway-mobile-320.png`, fullPage: true });
  383 |   await audit(page);
  384 |   await page.getByRole('button', { name: 'Reset sample', exact: true }).click();
  385 |   await expect(note).toHaveValue('A half-life halves the atoms that remain.');
  386 |   await page.getByRole('button', { name: 'All topics & routes', exact: true }).click();
  387 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  388 |   await page.locator('.ns-recap > summary').click();
  389 |   await page.locator('[data-ns-reflection="decay"] > summary').click();
  390 |   await expect(note).toHaveValue('A half-life halves the atoms that remain.');
  391 |   await page.getByRole('button', { name: 'Clear this note', exact: true }).click();
  392 |   await expect(note).toHaveValue('');
  393 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  394 | });
  395 | 
  396 | test('signal detective requires separate effects and preserves the investigation when reviewing an idea', async ({ page }) => {
  397 |   const errors: string[] = [];
  398 |   page.on('pageerror', error => errors.push(error.message));
  399 |   await page.setViewportSize({ width: 1100, height: 1000 });
  400 |   await mount(page, { nkStudio: { mission: 'distance', completed: ['distance', 'shield'] } });
  401 |   await expect(page.locator('.ns-case-entry')).not.toHaveAttribute('open');
  402 |   await page.locator('.ns-case-entry > summary').focus();
  403 |   await page.keyboard.press('Enter');
  404 |   await page.getByRole('button', { name: 'Start the signal mystery' }).focus();
  405 |   await page.keyboard.press('Enter');
  406 |   await expect(page.getByRole('region', { name: 'Signal detective', exact: true })).toBeFocused();
> 407 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('5.3%');
      |                                                        ^ Error: expect(locator).toHaveText(expected) failed
  408 |   await expect(page.getByRole('button', { name: 'Run this comparison' })).toBeDisabled();
  409 |   await page.getByRole('button', { name: 'Both changes', exact: true }).focus();
  410 |   await page.keyboard.press('Enter');
  411 |   await page.locator('[data-ns-case-setup="both"]').focus();
  412 |   await page.keyboard.press('Enter');
  413 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('5.3%');
  414 |   await page.getByRole('button', { name: 'Run this comparison' }).focus();
  415 |   await page.keyboard.press('Enter');
  416 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  417 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('0 of 2 separate effects checked');
  418 |   await expect(page.locator('.ns-feedback')).toContainText('two things changed together');
  419 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  420 |   await page.keyboard.press('Enter');
  421 |   await expect(page.locator('[data-ns-case-notebook] tbody tr')).toHaveCount(1);
  422 |   await page.locator('[data-ns-case-setup="closer"]').click();
  423 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  424 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  425 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  426 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  427 |   await page.locator('[data-ns-case-setup="unshielded"]').click();
  428 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  429 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  430 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  431 |   await expect(page.locator('[data-ns-case-notebook] tbody td')).toHaveText(['Distance + shield', '100.0%', 'Distance only', '21.4%', 'Shield only', '25.0%']);
  432 |   await page.getByRole('button', { name: 'Only distance mattered' }).click();
  433 |   await expect(page.locator('[data-ns-reflection="investigation"]')).toHaveCount(0);
  434 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  435 |   await expect(page.locator('[data-ns-explain]')).toContainText('Case explained');
  436 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  437 |   await page.locator('.ns-case-tests > summary').focus();
  438 |   await page.keyboard.press('Enter');
  439 |   await expect(page.getByRole('button', { name: 'Run this comparison' })).toBeVisible();
  440 |   await page.keyboard.press('Enter');
  441 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  442 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  443 |   const note = page.getByRole('textbox', { name: 'My takeaway from Signal detective', exact: true });
  444 |   await note.fill('Keep one thing fixed to test the other.');
  445 |   await page.screenshot({ path: output + '/signal-detective-desktop.png', fullPage: true });
  446 |   await audit(page);
  447 |   await page.getByText('Review an idea first', { exact: true }).click();
  448 |   await page.getByRole('button', { name: 'Review distance', exact: true }).click();
  449 |   await expect(page.locator('[data-nk-studio]')).toHaveAttribute('data-nk-studio', 'distance');
  450 |   await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  451 |   await page.locator('.ns-case-entry > summary').click();
  452 |   await page.getByRole('button', { name: 'Revisit the signal mystery' }).click();
  453 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  454 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  455 |   await expect(note).toHaveValue('Keep one thing fixed to test the other.');
  456 |   await page.getByRole('button', { name: 'Restart the investigation', exact: true }).click();
  457 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('5.3%');
  458 |   await expect(note).toHaveValue('Keep one thing fixed to test the other.');
  459 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  460 |   expect(errors).toEqual([]);
  461 | });
  462 | 
  463 | test('signal detective fits at 320px and keeps controls before the comparison notebook', async ({ page }) => {
  464 |   await page.setViewportSize({ width: 320, height: 844 });
  465 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  466 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'unshielded', runs: ['closer'] } } });
  467 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  468 |   const positions = await page.evaluate(() => ({
  469 |     controls: document.querySelector('.ns-controls')!.getBoundingClientRect().bottom,
  470 |     notebook: document.querySelector('[data-ns-case-notebook]')!.getBoundingClientRect().top,
  471 |     fits: document.documentElement.scrollWidth <= innerWidth,
  472 |   }));
  473 |   expect(positions.fits).toBe(true);
  474 |   expect(positions.notebook).toBeGreaterThanOrEqual(positions.controls);
  475 |   await page.getByRole('button', { name: 'Run this comparison' }).focus();
  476 |   await page.keyboard.press('Enter');
  477 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  478 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  479 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  480 |   await page.getByRole('textbox', { name: 'My takeaway from Signal detective' }).fill('Separate the effects.');
  481 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  482 |   await page.screenshot({ path: output + '/signal-detective-mobile-320.png', fullPage: true });
  483 |   await audit(page);
  484 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  485 |   await page.locator('.ns-case-tests > summary').click();
  486 |   await expect(page.locator('[data-ns-case-setup="unshielded"]')).toHaveCSS('outline-style', 'solid');
  487 |   await page.screenshot({ path: output + '/signal-detective-forced-colors.png', fullPage: true });
  488 | });
  489 | 
  490 | test('signal detective keeps readings and evidence readable in the light palette', async ({ page }) => {
  491 |   await page.setViewportSize({ width: 1100, height: 1000 });
  492 |   await mount(page, { nkView: 'investigate', nkStudio: { investigation: { prediction: 'both', runs: ['closer', 'unshielded'], selected: 'unshielded' } } });
  493 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  494 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  495 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  496 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('2 of 2 separate effects checked');
  497 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  498 |   await page.screenshot({ path: output + '/signal-detective-light.png', fullPage: true });
  499 |   await audit(page);
  500 | });
  501 | 
```