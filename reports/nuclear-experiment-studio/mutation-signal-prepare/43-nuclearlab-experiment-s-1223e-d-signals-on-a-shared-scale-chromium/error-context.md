# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective guides the next comparison and explains recorded signals on a shared scale
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:463:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-case-reading]')
Expected: "21.4%"
Received: "25.0%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-case-reading]')
    31 × locator resolved to <strong data-ns-case-reading="true">25.0%</strong>
       - unexpected value "25.0%"

```

```yaml
- strong: 25.0%
```

# Test source

```ts
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
  407 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('5.3%');
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
  463 | test('signal detective guides the next comparison and explains recorded signals on a shared scale', async ({ page }) => {
  464 |   await page.setViewportSize({ width: 1100, height: 1000 });
  465 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['distance'], investigation: { prediction: 'both', selected: 'closer', runs: ['closer'] } } });
  466 |   const chart = page.getByRole('img', { name: 'Expected detector signal on a shared 0 to 100% scale. Mystery setup: 5.3%. Move closer: 21.4%.', exact: true });
  467 |   await expect(chart).toBeVisible();
  468 |   await page.getByRole('button', { name: 'Prepare Remove the lead', exact: true }).focus();
  469 |   await page.keyboard.press('Enter');
  470 |   const run = page.getByRole('button', { name: 'Run this comparison' });
  471 |   await expect(run).toBeFocused();
> 472 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
      |                                                        ^ Error: expect(locator).toHaveText(expected) failed
  473 |   await expect(chart).toBeVisible();
  474 |   await expect(page.locator('[data-ns-case-notebook] tbody tr')).toHaveCount(1);
  475 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  476 |   await expect(page.locator('[data-ns-case-setup="unshielded"]')).toHaveAttribute('aria-pressed', 'true');
  477 |   await page.keyboard.press('Enter');
  478 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  479 |   await expect(run).toBeFocused();
  480 |   await expect(page.getByRole('img', { name: 'Expected detector signal on a shared 0 to 100% scale. Mystery setup: 5.3%. Remove the lead: 25.0%.', exact: true })).toBeVisible();
  481 |   await expect(page.locator('[data-ns-case-chart]')).toContainText('Distance stayed at 2 m.');
  482 |   const bars = await page.locator('[data-ns-case-chart]').evaluate(node => [...node.querySelectorAll('.ns-case-track')].map(track => ({ track: track.clientWidth, fill: track.querySelector('.ns-case-fill')!.getBoundingClientRect().width })));
  483 |   expect(bars[0].track).toBe(bars[1].track);
  484 |   expect(bars[0].fill / bars[0].track).toBeCloseTo(Math.exp(-.771 * 2) / 4, 2);
  485 |   expect(bars[1].fill / bars[1].track).toBeCloseTo(.25, 2);
  486 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).focus();
  487 |   await page.keyboard.press('Enter');
  488 |   await expect(page.getByRole('heading', { name: 'What explains the lower signal?', exact: true })).toBeFocused();
  489 |   await expect(page.locator('[data-ns-reflection="investigation"]')).toHaveCount(0);
  490 |   await page.screenshot({ path: output + '/signal-guided-comparison.png', fullPage: true });
  491 |   await audit(page);
  492 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  493 |   await expect(page.locator('[data-ns-guide]')).toHaveCount(0);
  494 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  495 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  496 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  497 | });
  498 | 
  499 | test('signal detective fits at 320px and keeps controls before the comparison notebook', async ({ page }) => {
  500 |   await page.setViewportSize({ width: 320, height: 844 });
  501 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  502 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'unshielded', runs: ['closer'] } } });
  503 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  504 |   const positions = await page.evaluate(() => ({
  505 |     controls: document.querySelector('.ns-controls')!.getBoundingClientRect().bottom,
  506 |     notebook: document.querySelector('[data-ns-case-notebook]')!.getBoundingClientRect().top,
  507 |     fits: document.documentElement.scrollWidth <= innerWidth,
  508 |   }));
  509 |   expect(positions.fits).toBe(true);
  510 |   expect(positions.notebook).toBeGreaterThanOrEqual(positions.controls);
  511 |   await page.getByRole('button', { name: 'Run this comparison' }).focus();
  512 |   await page.keyboard.press('Enter');
  513 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  514 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  515 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  516 |   await page.getByRole('textbox', { name: 'My takeaway from Signal detective' }).fill('Separate the effects.');
  517 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  518 |   await page.screenshot({ path: output + '/signal-detective-mobile-320.png', fullPage: true });
  519 |   await audit(page);
  520 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  521 |   await page.locator('.ns-case-tests > summary').click();
  522 |   await expect(page.locator('[data-ns-case-setup="unshielded"]')).toHaveCSS('outline-style', 'solid');
  523 |   await page.screenshot({ path: output + '/signal-detective-forced-colors.png', fullPage: true });
  524 | });
  525 | 
  526 | test('signal detective keeps readings and evidence readable in the light palette', async ({ page }) => {
  527 |   await page.setViewportSize({ width: 1100, height: 1000 });
  528 |   await mount(page, { nkView: 'investigate', nkStudio: { investigation: { prediction: 'both', runs: ['closer', 'unshielded'], selected: 'unshielded' } } });
  529 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  530 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  531 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  532 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('2 of 2 separate effects checked');
  533 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  534 |   await page.screenshot({ path: output + '/signal-detective-light.png', fullPage: true });
  535 |   await audit(page);
  536 | });
  537 | 
```