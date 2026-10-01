# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> nucleus comparisons show saved pairs and preserve the current draft when switching
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:650:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-ns-nucleus-comparison]')
Expected: 0
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-ns-nucleus-comparison]')
    31 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
  557 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  558 |   await page.keyboard.press('Enter');
  559 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  560 |   await page.keyboard.press('Enter');
  561 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-14');
  562 |   await expect(page.locator('[data-ns-nucleus-mass]')).toHaveText('6 + 8 = 14');
  563 |   await expect(page.getByRole('img', { name: 'Carbon-14 nucleus: 6 protons and 8 neutrons. Mass number 14.', exact: true })).toBeVisible();
  564 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  565 |   await save.click();
  566 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
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
  650 | test('nucleus comparisons show saved pairs and preserve the current draft when switching', async ({ page }) => {
  651 |   const errors: string[] = [];
  652 |   page.on('pageerror', error => errors.push(error.message));
  653 |   await page.setViewportSize({ width: 1100, height: 1000 });
  654 |   await mount(page, { nkView: 'nucleus', nkStudio: { completed: ['distance'] } });
  655 |   await page.getByRole('button', { name: 'It stays carbon', exact: true }).click();
  656 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
> 657 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveCount(0);
      |                                                              ^ Error: expect(locator).toHaveCount(expected) failed
  658 |   await page.getByRole('button', { name: 'Prepare Carbon-14', exact: true }).click();
  659 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveCount(0);
  660 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  661 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  662 |   await expect(page.getByRole('img', { name: 'Carbon-12: 6 protons and 6 neutrons. Carbon-14: 6 protons and 8 neutrons.', exact: true })).toBeVisible();
  663 |   await expect(page.locator('[data-ns-pair-part="protons"] [data-filled="true"]')).toHaveCount(12);
  664 |   await expect(page.locator('[data-ns-pair-part="neutrons"] [data-filled="true"]')).toHaveCount(14);
  665 |   await expect(page.locator('.ns-pair-records')).not.toHaveAttribute('open');
  666 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  667 |   await page.getByRole('button', { name: '+ Proton', exact: true }).click();
  668 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  669 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toHaveCount(0);
  670 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  671 |   await page.getByRole('button', { name: '− Proton', exact: true }).click();
  672 |   await page.getByRole('button', { name: '− Neutron', exact: true }).click();
  673 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  674 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).focus();
  675 |   await page.keyboard.press('Enter');
  676 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toBeFocused();
  677 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toHaveAttribute('aria-pressed', 'true');
  678 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  679 |   await expect(page.getByRole('img', { name: 'Carbon-14: 6 protons and 8 neutrons. Nitrogen-15: 7 protons and 8 neutrons.', exact: true })).toBeVisible();
  680 |   await expect(page.locator('[data-ns-pair-part="protons"] [data-filled="true"]')).toHaveCount(13);
  681 |   await expect(page.locator('[data-ns-pair-part="neutrons"] [data-filled="true"]')).toHaveCount(16);
  682 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(3);
  683 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('3 of 3 comparison nuclei saved');
  684 |   await page.locator('.ns-pair-records > summary').focus();
  685 |   await page.keyboard.press('Enter');
  686 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).toBeVisible();
  687 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody th')).toHaveText(['Carbon-12', 'Carbon-14', 'Nitrogen-15']);
  688 |   await page.getByRole('button', { name: 'Neutron comparison', exact: true }).click();
  689 |   await expect(page.locator('.ns-pair-records')).toHaveAttribute('open');
  690 |   await page.locator('.ns-pair-records > summary').focus();
  691 |   await page.keyboard.press('Enter');
  692 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).not.toBeVisible();
  693 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).click();
  694 |   await page.screenshot({ path: output + '/nucleus-comparison-desktop.png', fullPage: true });
  695 |   await audit(page);
  696 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  697 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  698 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  699 |   await page.locator('.ns-warmup-entry > summary').click();
  700 |   await page.getByRole('button', { name: 'Resume the nucleus builder' }).click();
  701 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  702 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  703 |   expect(errors).toEqual([]);
  704 | });
  705 | 
  706 | test('nucleus comparisons fit at 320px with larger text in light and forced colors', async ({ page }) => {
  707 |   await page.setViewportSize({ width: 320, height: 844 });
  708 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  709 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { nucleus: { prediction: 'same', protons: 7, neutrons: 8, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }, { protons: 7, neutrons: 8 }] } } });
  710 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  711 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  712 |   await expect(page.locator('[data-ns-pair-part="protons"] .ns-pair-value > strong')).toHaveText(['6', '6']);
  713 |   await expect(page.locator('[data-ns-pair-part="neutrons"] .ns-pair-value > strong')).toHaveText(['6', '8']);
  714 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  715 |   await page.screenshot({ path: output + '/nucleus-comparison-mobile-light.png', fullPage: true });
  716 |   await audit(page);
  717 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).focus();
  718 |   await page.keyboard.press('Enter');
  719 |   await expect(page.locator('[data-ns-pair-part="protons"] .ns-pair-value > strong')).toHaveText(['6', '7']);
  720 |   await expect(page.locator('[data-ns-pair-part="neutrons"] .ns-pair-value > strong')).toHaveText(['8', '8']);
  721 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  722 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toHaveCSS('outline-style', 'solid');
  723 |   await expect(page.locator('.ns-pair-value[data-changed="true"]')).toHaveCount(1);
  724 |   await expect(page.locator('.ns-pair-value[data-changed="true"]')).toHaveCSS('outline-style', 'solid');
  725 |   await expect(page.locator('[data-ns-nucleus-comparison] [data-filled="true"]')).toHaveCount(29);
  726 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  727 |   await page.screenshot({ path: output + '/nucleus-comparison-mobile-forced.png', fullPage: true });
  728 |   await page.locator('.ns-pair-records > summary').focus();
  729 |   await page.keyboard.press('Enter');
  730 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).toBeVisible();
  731 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  732 | });
  733 | 
```