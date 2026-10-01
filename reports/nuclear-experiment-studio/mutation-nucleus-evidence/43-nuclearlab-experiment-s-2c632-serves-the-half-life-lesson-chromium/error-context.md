# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> nucleus builder introduces isotopes with keyboard comparisons and preserves the half-life lesson
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:538:5

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
    33 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
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
  538 | test('nucleus builder introduces isotopes with keyboard comparisons and preserves the half-life lesson', async ({ page }) => {
  539 |   const errors: string[] = [];
  540 |   page.on('pageerror', error => errors.push(error.message));
  541 |   await page.setViewportSize({ width: 1100, height: 1000 });
  542 |   await mount(page, { nkStudio: { mission: 'shield', completed: ['distance'], decay: { prediction: 32, step: 1 } } });
  543 |   await expect(page.locator('.ns-warmup-entry')).not.toHaveAttribute('open');
  544 |   await page.locator('.ns-warmup-entry > summary').focus();
  545 |   await page.keyboard.press('Enter');
  546 |   await page.getByRole('button', { name: 'Start the nucleus builder' }).focus();
  547 |   await page.keyboard.press('Enter');
  548 |   await expect(page.getByRole('region', { name: 'Nucleus builder', exact: true })).toBeFocused();
  549 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-12');
  550 |   const save = page.getByRole('button', { name: 'Save this nucleus' });
  551 |   await expect(save).toBeDisabled();
  552 |   await page.getByRole('button', { name: 'It becomes another element', exact: true }).click();
  553 |   await save.focus();
  554 |   await page.keyboard.press('Enter');
  555 |   await page.keyboard.press('Enter');
  556 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  557 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  558 |   await page.keyboard.press('Enter');
  559 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  560 |   await page.keyboard.press('Enter');
  561 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-14');
  562 |   await expect(page.locator('[data-ns-nucleus-mass]')).toHaveText('6 + 8 = 14');
  563 |   await expect(page.getByRole('img', { name: 'Carbon-14 nucleus: 6 protons and 8 neutrons. Mass number 14.', exact: true })).toBeVisible();
  564 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  565 |   await save.click();
> 566 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
      |                                                   ^ Error: expect(locator).toHaveCount(expected) failed
  567 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('2 of 3 comparison nuclei saved');
  568 |   await page.getByRole('button', { name: '+ Proton', exact: true }).focus();
  569 |   await page.keyboard.press('Enter');
  570 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  571 |   await save.click();
  572 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody th')).toHaveText(['Carbon-12', 'Carbon-14', 'Nitrogen-15']);
  573 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody td')).toHaveText(['6', '6', '6', '8', '7', '8']);
  574 |   await page.getByRole('button', { name: 'Explain the particle changes', exact: true }).focus();
  575 |   await page.keyboard.press('Enter');
  576 |   await expect(page.getByRole('heading', { name: 'What determines the element?', exact: true })).toBeFocused();
  577 |   await page.screenshot({ path: output + '/nucleus-builder-comparison.png', fullPage: true });
  578 |   await audit(page);
  579 |   await page.getByRole('button', { name: 'Adding neutrons always makes a different element.', exact: true }).click();
  580 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  581 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  582 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  583 |   await page.getByRole('button', { name: 'Continue to the half-life experiment' }).click();
  584 |   await expect(page.getByRole('region', { name: 'Experiment studio', exact: true })).toBeFocused();
  585 |   await expect(page.locator('[data-nk-studio]')).toHaveAttribute('data-nk-studio', 'decay');
  586 |   await expect(page.locator('.ns-readout > strong')).toHaveText('32');
  587 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  588 |   await page.locator('.ns-warmup-entry > summary').click();
  589 |   await page.getByRole('button', { name: 'Revisit the nucleus builder' }).click();
  590 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  591 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(3);
  592 |   expect(errors).toEqual([]);
  593 | });
  594 | 
  595 | test('nucleus builder fits at 320px with larger text and identifiable particles in forced colors', async ({ page }) => {
  596 |   await page.setViewportSize({ width: 320, height: 844 });
  597 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  598 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { nucleus: { prediction: 'same', cards: [{ protons: 6, neutrons: 6 }] } } });
  599 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  600 |   await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  601 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  602 |   await page.getByRole('button', { name: '+ Proton', exact: true }).click();
  603 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  604 |   const positions = await page.evaluate(() => ({
  605 |     controls: document.querySelector('.ns-controls')!.getBoundingClientRect().bottom,
  606 |     notebook: document.querySelector('[data-ns-nucleus-notebook]')!.getBoundingClientRect().top,
  607 |     fits: document.documentElement.scrollWidth <= innerWidth,
  608 |   }));
  609 |   expect(positions.fits).toBe(true);
  610 |   expect(positions.notebook).toBeGreaterThanOrEqual(positions.controls);
  611 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  612 |   await page.locator('[data-ns-reflection="nucleus"] > summary').click();
  613 |   const note = page.getByRole('textbox', { name: 'My takeaway from Nucleus builder', exact: true });
  614 |   await note.fill('The protons tell me the element.');
  615 |   await page.screenshot({ path: output + '/nucleus-builder-mobile-320.png', fullPage: true });
  616 |   await audit(page);
  617 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  618 |   await expect(page.locator('.ns-nucleon[data-particle="proton"]')).toHaveCount(7);
  619 |   await expect(page.locator('.ns-nucleon[data-particle="neutron"]')).toHaveCount(8);
  620 |   await expect(page.locator('.ns-nucleon[data-particle="proton"]').first()).toHaveCSS('border-top-style', 'solid');
  621 |   await expect(page.locator('.ns-nucleon[data-particle="neutron"]').first()).toHaveCSS('border-top-style', 'dashed');
  622 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  623 |   await page.screenshot({ path: output + '/nucleus-builder-forced-colors.png', fullPage: true });
  624 |   await page.getByRole('button', { name: 'Restart the builder', exact: true }).click();
  625 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-12');
  626 |   await expect(note).toHaveValue('The protons tell me the element.');
  627 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).toHaveCount(0);
  628 | });
  629 | 
  630 | test('nucleus builder preparation updates the picture while saved comparisons wait for Save in the light palette', async ({ page }) => {
  631 |   await page.setViewportSize({ width: 1100, height: 1000 });
  632 |   await mount(page, { nkView: 'nucleus', nkStudio: { nucleus: { prediction: 'same', protons: 6, neutrons: 8, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }] } } });
  633 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  634 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  635 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-14');
  636 |   await page.getByRole('button', { name: 'Prepare Nitrogen-15', exact: true }).focus();
  637 |   await page.keyboard.press('Enter');
  638 |   await expect(page.getByRole('button', { name: 'Save this nucleus' })).toBeFocused();
  639 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  640 |   await expect(page.locator('[data-ns-nucleus-mass]')).toHaveText('7 + 8 = 15');
  641 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(2);
  642 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  643 |   await page.keyboard.press('Enter');
  644 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(3);
  645 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  646 |   await page.screenshot({ path: output + '/nucleus-builder-light.png', fullPage: true });
  647 |   await audit(page);
  648 | });
  649 | 
```