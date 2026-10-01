# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective reviews saved readings without changing the next planned test or its evidence
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:538:5

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
    33 × locator resolved to <strong data-ns-case-reading="true">25.0%</strong>
       - unexpected value "25.0%"

```

```yaml
- strong: 25.0%
```

# Test source

```ts
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
  472 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
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
  538 | test('signal detective reviews saved readings without changing the next planned test or its evidence', async ({ page }) => {
  539 |   const errors: string[] = [];
  540 |   page.on('pageerror', error => errors.push(error.message));
  541 |   await page.setViewportSize({ width: 1100, height: 1000 });
  542 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['distance'], counting: { prediction: 'vary', runs: [4, 1] }, nucleus: { reflection: 'Keep my nucleus note.' }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded'], reflection: 'Compare each effect separately.' } } });
  543 |   const review = page.getByRole('combobox', { name: 'Review a saved test', exact: true });
  544 |   const reading = page.locator('[data-ns-case-reading]');
  545 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  546 |   await expect(review).toHaveValue('unshielded');
  547 |   await expect(review.locator('option')).toHaveCount(2);
  548 |   await expect(reading).toHaveText('25.0%');
  549 |   await review.focus(); await page.keyboard.press('ArrowUp');
> 550 |   await expect(reading).toHaveText('21.4%');
      |                         ^ Error: expect(locator).toHaveText(expected) failed
  551 |   await expect(review).toHaveValue('closer');
  552 |   await expect(review).toBeFocused();
  553 |   await expect(page.locator('[data-ns-case-measured]')).toHaveText('Saved test: 1 m · 2 cm lead');
  554 |   await expect(page.locator('[data-ns-case-chart]')).toHaveAttribute('aria-label', 'Expected detector signal on a shared 0 to 100% scale. Mystery setup: 5.3%. Move closer: 21.4%.');
  555 |   await expect(page.locator('[data-ns-case-notebook] [aria-current="true"] th')).toHaveText('Move closer');
  556 |   await expect(page.locator('[data-ns-case-plan]')).toContainText('Undo both changes');
  557 |   await expect(page.locator('[data-ns-case-setup="both"]')).toHaveAttribute('aria-pressed', 'true');
  558 |   await expect(page.locator('[data-ns-case-status]')).toHaveText('Reviewing Move closer: 21.4% of the original signal.');
  559 |   const reviewed = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  560 |   expect(reviewed.investigation).toEqual({ ...original.investigation, review: 'closer' });
  561 |   expect(reviewed.completed).toEqual(original.completed); expect(reviewed.counting).toEqual(original.counting); expect(reviewed.nucleus).toEqual(original.nucleus);
  562 |   await expect(page.locator('[data-ns-case-notebook] tbody tr')).toHaveCount(2);
  563 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  564 |   await expect(reading).toHaveText('100.0%');
  565 |   await expect(review).toHaveValue('both');
  566 |   await expect(review.locator('option')).toHaveCount(3);
  567 |   await expect(page.locator('[data-ns-case-notebook] [aria-current="true"] th')).toHaveText('Undo both changes');
  568 |   await review.focus(); await page.keyboard.press('Home');
  569 |   await expect(review).toHaveValue('closer');
  570 |   await expect(reading).toHaveText('21.4%');
  571 |   await page.screenshot({ path: output + '/signal-review-desktop.png', fullPage: true });
  572 |   await audit(page);
  573 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  574 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  575 |   await page.locator('.ns-case-entry > summary').click();
  576 |   await page.getByRole('button', { name: 'Resume the signal mystery' }).click();
  577 |   await expect(review).toHaveValue('closer');
  578 |   await expect(reading).toHaveText('21.4%');
  579 |   await expect(page.locator('[data-ns-case-setup="both"]')).toHaveAttribute('aria-pressed', 'true');
  580 |   const resumed = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  581 |   expect(resumed.investigation.runs).toEqual(['closer', 'unshielded', 'both']);
  582 |   expect(resumed.investigation.reflection).toBe('Compare each effect separately.');
  583 |   expect(resumed.investigation.solved).toBeUndefined();
  584 |   expect(errors).toEqual([]);
  585 | });
  586 | 
  587 | test('signal detective reviews only recorded tests at 320px with larger text and forced colors', async ({ page }) => {
  588 |   await page.setViewportSize({ width: 320, height: 844 });
  589 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  590 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'unshielded', runs: ['closer', 'both'] } } });
  591 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  592 |   const review = page.getByRole('combobox', { name: 'Review a saved test', exact: true });
  593 |   await expect(review.locator('option')).toHaveText(['Move closer · 21.4%', 'Undo both changes · 100.0%']);
  594 |   await review.focus(); await page.keyboard.press('Home');
  595 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  596 |   await expect(review).toBeFocused();
  597 |   expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  598 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  599 |   await page.locator('[data-ns-scene="investigation"]').scrollIntoViewIfNeeded();
  600 |   await page.screenshot({ path: output + '/signal-review-mobile-light.png' });
  601 |   await audit(page);
  602 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  603 |   await review.focus(); await page.keyboard.press('End');
  604 |   await expect(review).toHaveValue('both');
  605 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  606 |   await expect(review).toHaveCSS('outline-style', 'solid');
  607 |   await expect(page.locator('[data-ns-case-notebook] [aria-current="true"] th')).toHaveText('Undo both changes');
  608 |   await expect(page.locator('[data-ns-case-notebook] [aria-current="true"] th')).toHaveCSS('border-inline-start-style', 'solid');
  609 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('1 of 2 separate effects checked');
  610 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  611 |   await page.screenshot({ path: output + '/signal-review-mobile-forced.png' });
  612 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  613 |   await expect(review).toHaveValue('unshielded');
  614 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  615 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(1);
  616 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  617 | });
  618 | 
  619 | test('nucleus builder introduces isotopes with keyboard comparisons and preserves the half-life lesson', async ({ page }) => {
  620 |   const errors: string[] = [];
  621 |   page.on('pageerror', error => errors.push(error.message));
  622 |   await page.setViewportSize({ width: 1100, height: 1000 });
  623 |   await mount(page, { nkStudio: { mission: 'shield', completed: ['distance'], decay: { prediction: 32, step: 1 } } });
  624 |   await expect(page.locator('.ns-warmup-entry')).not.toHaveAttribute('open');
  625 |   await page.locator('.ns-warmup-entry > summary').focus();
  626 |   await page.keyboard.press('Enter');
  627 |   await page.getByRole('button', { name: 'Start the nucleus builder' }).focus();
  628 |   await page.keyboard.press('Enter');
  629 |   await expect(page.getByRole('region', { name: 'Nucleus builder', exact: true })).toBeFocused();
  630 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-12');
  631 |   const save = page.getByRole('button', { name: 'Save this nucleus' });
  632 |   await expect(save).toBeDisabled();
  633 |   await page.getByRole('button', { name: 'It becomes another element', exact: true }).click();
  634 |   await save.focus();
  635 |   await page.keyboard.press('Enter');
  636 |   await page.keyboard.press('Enter');
  637 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  638 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  639 |   await page.keyboard.press('Enter');
  640 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  641 |   await page.keyboard.press('Enter');
  642 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-14');
  643 |   await expect(page.locator('[data-ns-nucleus-mass]')).toHaveText('6 + 8 = 14');
  644 |   await expect(page.getByRole('img', { name: 'Carbon-14 nucleus: 6 protons and 8 neutrons. Mass number 14.', exact: true })).toBeVisible();
  645 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  646 |   await save.click();
  647 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  648 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('2 of 3 comparison nuclei saved');
  649 |   await page.getByRole('button', { name: '+ Proton', exact: true }).focus();
  650 |   await page.keyboard.press('Enter');
```