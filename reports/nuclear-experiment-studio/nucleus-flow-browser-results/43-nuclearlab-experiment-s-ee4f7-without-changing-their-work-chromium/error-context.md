# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> nucleus comparison shortcuts move keyboard learners through the mobile flow without changing their work
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:737:5

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  locator('[data-ns-explain]')
Expected: in viewport
Received: viewport ratio 0.8574010729789734
Timeout:  15000ms

Call log:
  - Expect "toBeInViewport" with timeout 15000ms
  - waiting for locator('[data-ns-explain]')
    31 × locator resolved to <div class="ns-explain" data-ns-explain="nucleus">…</div>
       - unexpected value "viewport ratio 0.8574010729789734"

```

```yaml
- paragraph: 3 / Explain
- heading "What determines the element?" [level=5]
- button "Adding neutrons always makes a different element."
- button "Protons identify the element. Neutrons distinguish its isotopes."
```

# Test source

```ts
  678 |   await page.keyboard.press('Enter');
  679 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toBeFocused();
  680 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toHaveAttribute('aria-pressed', 'true');
  681 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  682 |   await expect(page.getByRole('img', { name: 'Carbon-14: 6 protons and 8 neutrons. Nitrogen-15: 7 protons and 8 neutrons.', exact: true })).toBeVisible();
  683 |   await expect(page.locator('[data-ns-pair-part="protons"] [data-filled="true"]')).toHaveCount(13);
  684 |   await expect(page.locator('[data-ns-pair-part="neutrons"] [data-filled="true"]')).toHaveCount(16);
  685 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(3);
  686 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('3 of 3 comparison nuclei saved');
  687 |   await page.locator('.ns-pair-records > summary').focus();
  688 |   await page.keyboard.press('Enter');
  689 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).toBeVisible();
  690 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody th')).toHaveText(['Carbon-12', 'Carbon-14', 'Nitrogen-15']);
  691 |   await page.getByRole('button', { name: 'Neutron comparison', exact: true }).click();
  692 |   await expect(page.locator('.ns-pair-records')).toHaveAttribute('open');
  693 |   await page.locator('.ns-pair-records > summary').focus();
  694 |   await page.keyboard.press('Enter');
  695 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).not.toBeVisible();
  696 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).click();
  697 |   await page.screenshot({ path: output + '/nucleus-comparison-desktop.png', fullPage: true });
  698 |   await audit(page);
  699 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  700 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  701 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  702 |   await page.locator('.ns-warmup-entry > summary').click();
  703 |   await page.getByRole('button', { name: 'Resume the nucleus builder' }).click();
  704 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  705 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  706 |   expect(errors).toEqual([]);
  707 | });
  708 | 
  709 | test('nucleus comparisons fit at 320px with larger text in light and forced colors', async ({ page }) => {
  710 |   await page.setViewportSize({ width: 320, height: 844 });
  711 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  712 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { nucleus: { prediction: 'same', protons: 7, neutrons: 8, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }, { protons: 7, neutrons: 8 }] } } });
  713 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  714 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  715 |   await expect(page.locator('[data-ns-pair-part="protons"] .ns-pair-value > strong')).toHaveText(['6', '6']);
  716 |   await expect(page.locator('[data-ns-pair-part="neutrons"] .ns-pair-value > strong')).toHaveText(['6', '8']);
  717 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  718 |   await page.screenshot({ path: output + '/nucleus-comparison-mobile-light.png', fullPage: true });
  719 |   await audit(page);
  720 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).focus();
  721 |   await page.keyboard.press('Enter');
  722 |   await expect(page.locator('[data-ns-pair-part="protons"] .ns-pair-value > strong')).toHaveText(['6', '7']);
  723 |   await expect(page.locator('[data-ns-pair-part="neutrons"] .ns-pair-value > strong')).toHaveText(['8', '8']);
  724 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  725 |   await expect(page.getByRole('button', { name: 'Proton comparison', exact: true })).toHaveCSS('outline-style', 'solid');
  726 |   await expect(page.locator('.ns-pair-value[data-changed="true"]')).toHaveCount(1);
  727 |   await expect(page.locator('.ns-pair-value[data-changed="true"]')).toHaveCSS('outline-style', 'solid');
  728 |   await expect(page.locator('[data-ns-nucleus-comparison] [data-filled="true"]')).toHaveCount(29);
  729 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  730 |   await page.screenshot({ path: output + '/nucleus-comparison-mobile-forced.png', fullPage: true });
  731 |   await page.locator('.ns-pair-records > summary').focus();
  732 |   await page.keyboard.press('Enter');
  733 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).toBeVisible();
  734 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  735 | });
  736 | 
  737 | test('nucleus comparison shortcuts move keyboard learners through the mobile flow without changing their work', async ({ page }) => {
  738 |   const errors: string[] = [];
  739 |   page.on('pageerror', error => errors.push(error.message));
  740 |   await page.setViewportSize({ width: 320, height: 844 });
  741 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  742 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { completed: ['counting'], decay: { prediction: 32, step: 1 }, nucleus: { prediction: 'same', protons: 6, neutrons: 7, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }], reflection: 'Keep my saved note.' } } });
  743 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  744 |   let state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  745 |   const build = page.locator('[data-ns-build-heading]');
  746 |   const saved = page.getByRole('heading', { name: 'Your saved nuclei', exact: true });
  747 |   await page.getByRole('button', { name: 'Review saved comparisons' }).focus();
  748 |   await page.keyboard.press('Enter');
  749 |   await expect(saved).toBeFocused();
  750 |   await expect(page.locator('.ns-pair-chart')).toBeInViewport({ ratio: 1 });
  751 |   await page.screenshot({ path: output + '/nucleus-flow-mobile-compare.png' });
  752 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  753 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  754 |   // A learner can close the controls while looking at the saved evidence.
  755 |   await build.focus(); await page.keyboard.press('Enter');
  756 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  757 |   await page.getByRole('button', { name: 'Continue building Nitrogen-15' }).focus();
  758 |   await page.keyboard.press('Enter');
  759 |   await expect(build).toBeFocused();
  760 |   await expect(page.locator('.ns-case-tests')).toHaveAttribute('open');
  761 |   await expect(page.getByRole('button', { name: 'Prepare Nitrogen-15' })).toBeInViewport();
  762 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  763 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('2 of 3 comparison nuclei saved');
  764 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  765 |   await page.getByRole('button', { name: 'Prepare Nitrogen-15' }).click();
  766 |   const save = page.getByRole('button', { name: 'Save this nucleus' });
  767 |   await expect(save).toBeFocused(); await page.keyboard.press('Enter');
  768 |   await expect(save).toBeFocused();
  769 |   await page.getByRole('button', { name: 'Review saved comparisons' }).focus();
  770 |   await page.keyboard.press('Enter'); await expect(saved).toBeFocused();
  771 |   await page.getByRole('button', { name: 'Proton comparison', exact: true }).focus();
  772 |   await page.keyboard.press('Enter');
  773 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  774 |   await page.getByRole('button', { name: 'Explain these comparisons' }).focus();
  775 |   await page.keyboard.press('Enter');
  776 |   const explanation = page.getByRole('heading', { name: 'What determines the element?', exact: true });
  777 |   await expect(explanation).toBeFocused();
> 778 |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
      |                                                   ^ Error: expect(locator).toBeInViewport() failed
  779 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  780 |   await page.getByRole('button', { name: 'Adding neutrons always makes a different element.', exact: true }).click();
  781 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  782 |   await page.getByRole('button', { name: 'Look at the saved comparisons again' }).focus();
  783 |   await page.keyboard.press('Enter'); await expect(saved).toBeFocused();
  784 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  785 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  786 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  787 |   await audit(page);
  788 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  789 |   await page.getByRole('button', { name: 'Explain these comparisons' }).focus();
  790 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  791 |   await expect(explanation).toHaveCSS('outline-style', 'solid');
  792 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  793 |   await page.screenshot({ path: output + '/nucleus-flow-mobile-explain-forced.png' });
  794 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  795 |   await page.getByRole('button', { name: 'Review your explanation' }).focus();
  796 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  797 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  798 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  799 |   await page.locator('.ns-warmup-entry > summary').click();
  800 |   await page.getByRole('button', { name: 'Revisit the nucleus builder' }).click();
  801 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  802 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  803 |   await page.locator('[data-ns-reflection="nucleus"] > summary').click();
  804 |   await expect(page.getByRole('textbox', { name: 'My takeaway from Nucleus builder', exact: true })).toHaveValue('Keep my saved note.');
  805 |   expect(errors).toEqual([]);
  806 | });
  807 | 
```