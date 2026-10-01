# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> nucleus comparison checks give specific hints and retain separate answers when revisiting the builder
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:737:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "retry"
Received: "correct"

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  650 |   await audit(page);
  651 | });
  652 | 
  653 | test('nucleus comparisons show saved pairs and preserve the current draft when switching', async ({ page }) => {
  654 |   const errors: string[] = [];
  655 |   page.on('pageerror', error => errors.push(error.message));
  656 |   await page.setViewportSize({ width: 1100, height: 1000 });
  657 |   await mount(page, { nkView: 'nucleus', nkStudio: { completed: ['distance'] } });
  658 |   await page.getByRole('button', { name: 'It stays carbon', exact: true }).click();
  659 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  660 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveCount(0);
  661 |   await page.getByRole('button', { name: 'Prepare Carbon-14', exact: true }).click();
  662 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveCount(0);
  663 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  664 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  665 |   await expect(page.getByRole('img', { name: 'Carbon-12: 6 protons and 6 neutrons. Carbon-14: 6 protons and 8 neutrons.', exact: true })).toBeVisible();
  666 |   await expect(page.locator('[data-ns-pair-part="protons"] [data-filled="true"]')).toHaveCount(12);
  667 |   await expect(page.locator('[data-ns-pair-part="neutrons"] [data-filled="true"]')).toHaveCount(14);
  668 |   await expect(page.locator('.ns-pair-records')).not.toHaveAttribute('open');
  669 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  670 |   await page.getByRole('button', { name: '+ Proton', exact: true }).click();
  671 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'neutrons');
  672 |   await expect(page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true })).toHaveCount(0);
  673 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  674 |   await page.getByRole('button', { name: '− Proton', exact: true }).click();
  675 |   await page.getByRole('button', { name: '− Neutron', exact: true }).click();
  676 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  677 |   await page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true }).focus();
  678 |   await page.keyboard.press('Enter');
  679 |   await expect(page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true })).toBeFocused();
  680 |   await expect(page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true })).toHaveAttribute('aria-pressed', 'true');
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
  691 |   await page.getByRole('button', { name: 'Carbon-12 → Carbon-14', exact: true }).click();
  692 |   await expect(page.locator('.ns-pair-records')).toHaveAttribute('open');
  693 |   await page.locator('.ns-pair-records > summary').focus();
  694 |   await page.keyboard.press('Enter');
  695 |   await expect(page.locator('[data-ns-nucleus-notebook] table')).not.toBeVisible();
  696 |   await page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true }).click();
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
  720 |   await page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true }).focus();
  721 |   await page.keyboard.press('Enter');
  722 |   await expect(page.locator('[data-ns-pair-part="protons"] .ns-pair-value > strong')).toHaveText(['6', '7']);
  723 |   await expect(page.locator('[data-ns-pair-part="neutrons"] .ns-pair-value > strong')).toHaveText(['8', '8']);
  724 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  725 |   await expect(page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true })).toHaveCSS('outline-style', 'solid');
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
  737 | test('nucleus comparison checks give specific hints and retain separate answers when revisiting the builder', async ({ page }) => {
  738 |   const errors: string[] = [];
  739 |   page.on('pageerror', error => errors.push(error.message));
  740 |   await page.setViewportSize({ width: 1100, height: 1000 });
  741 |   await mount(page, { nkView: 'nucleus', nkStudio: { completed: ['counting'], decay: { prediction: 32, step: 1 }, nucleus: { prediction: 'same', protons: 6, neutrons: 7, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }, { protons: 7, neutrons: 8 }], reflection: 'Keep the draft and my note.' } } });
  742 |   const feedback = page.locator('[data-ns-pair-feedback]');
  743 |   const check = page.locator('[data-ns-pair-check]');
  744 |   const choices = page.getByRole('group', { name: 'Which particle count changed between these saved nuclei?', exact: true });
  745 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  746 |   await expect(check).toHaveAttribute('open');
  747 |   await expect(feedback).toHaveText('');
  748 |   await choices.getByRole('button', { name: 'Proton count', exact: true }).focus();
  749 |   await page.keyboard.press('Enter');
> 750 |   await expect.poll(() => feedback.getAttribute('data-ns-pair-feedback')).toBe('retry');
      |                                                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  751 |   await expect(feedback).toHaveText('Both nuclei have 6 protons. Look at the neutron counts and try again.');
  752 |   await expect(choices.getByRole('button', { name: 'Proton count', exact: true })).toBeFocused();
  753 |   await expect(check).toHaveAttribute('open');
  754 |   await choices.getByRole('button', { name: 'Neutron count', exact: true }).focus();
  755 |   await page.keyboard.press('Enter');
  756 |   await expect(check).not.toHaveAttribute('open');
  757 |   await expect(check.locator('summary')).toBeFocused();
  758 |   await expect(feedback).toContainText('two isotopes of carbon');
  759 |   await page.keyboard.press('Enter');
  760 |   await expect(choices.getByRole('button', { name: 'Neutron count', exact: true })).toHaveAttribute('aria-pressed', 'true');
  761 |   await page.keyboard.press('Enter');
  762 |   await page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true }).focus();
  763 |   await page.keyboard.press('Enter');
  764 |   await expect(check).toHaveAttribute('data-ns-pair-check', 'protons');
  765 |   await expect(check).toHaveAttribute('open');
  766 |   await expect(feedback).toHaveText('');
  767 |   await choices.getByRole('button', { name: 'Neutron count', exact: true }).focus();
  768 |   await page.keyboard.press('Enter');
  769 |   await expect(feedback).toHaveText('Both nuclei have 8 neutrons. Look at the proton counts and try again.');
  770 |   await choices.getByRole('button', { name: 'Proton count', exact: true }).focus();
  771 |   await page.keyboard.press('Enter');
  772 |   await expect(check.locator('summary')).toBeFocused();
  773 |   await expect(check).not.toHaveAttribute('open');
  774 |   await expect(feedback).toContainText('different elements');
  775 |   const current = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  776 |   expect(current.nucleus.noticing).toEqual({ neutrons: 'neutrons', protons: 'protons' });
  777 |   expect(current.nucleus.cards).toEqual(original.nucleus.cards);
  778 |   expect(current.nucleus.protons).toBe(6); expect(current.nucleus.neutrons).toBe(7);
  779 |   expect(current.nucleus.reflection).toBe(original.nucleus.reflection);
  780 |   expect(current.completed).toEqual(original.completed); expect(current.decay).toEqual(original.decay);
  781 |   expect(current.nucleus.solved).toBeUndefined(); expect(current.nucleus.explanation).toBeUndefined();
  782 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  783 |   await page.screenshot({ path: output + '/nucleus-noticing-desktop.png', fullPage: true });
  784 |   await audit(page);
  785 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  786 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  787 |   await page.locator('.ns-warmup-entry > summary').click();
  788 |   await page.getByRole('button', { name: 'Resume the nucleus builder' }).click();
  789 |   await expect(check).not.toHaveAttribute('open');
  790 |   await expect(feedback).toContainText('different elements');
  791 |   await page.getByRole('button', { name: 'Carbon-12 → Carbon-14', exact: true }).click();
  792 |   await expect(check).not.toHaveAttribute('open');
  793 |   await expect(feedback).toContainText('two isotopes of carbon');
  794 |   expect(errors).toEqual([]);
  795 | });
  796 | 
  797 | test('nucleus comparison checks fit at 320px and keep keyboard focus visible in forced colors', async ({ page }) => {
  798 |   await page.setViewportSize({ width: 320, height: 844 });
  799 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  800 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { nucleus: { prediction: 'same', cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }, { protons: 7, neutrons: 8 }] } } });
  801 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  802 |   await page.getByRole('button', { name: 'Review saved comparisons' }).focus(); await page.keyboard.press('Enter');
  803 |   const choices = page.getByRole('group', { name: 'Which particle count changed between these saved nuclei?', exact: true });
  804 |   const check = page.locator('[data-ns-pair-check]');
  805 |   const neutron = choices.getByRole('button', { name: 'Neutron count', exact: true });
  806 |   await neutron.focus();
  807 |   expect((await neutron.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  808 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  809 |   await page.screenshot({ path: output + '/nucleus-noticing-mobile-light.png' });
  810 |   await audit(page);
  811 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  812 |   await page.keyboard.press('Enter');
  813 |   await expect(check.locator('summary')).toBeFocused();
  814 |   await expect(check.locator('summary')).toBeInViewport();
  815 |   await expect(check.locator('summary')).toHaveCSS('outline-style', 'solid');
  816 |   expect((await check.locator('summary').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  817 |   await expect(check).not.toHaveAttribute('open');
  818 |   await page.keyboard.press('Enter');
  819 |   await expect(neutron).toHaveAttribute('aria-pressed', 'true');
  820 |   await expect(neutron).toHaveCSS('outline-style', 'solid');
  821 |   await page.keyboard.press('Enter');
  822 |   await page.screenshot({ path: output + '/nucleus-noticing-mobile-forced.png' });
  823 |   await page.getByRole('button', { name: 'Carbon-14 → Nitrogen-15', exact: true }).focus();
  824 |   await page.keyboard.press('Enter');
  825 |   await choices.getByRole('button', { name: 'Proton count', exact: true }).focus();
  826 |   await page.keyboard.press('Enter');
  827 |   await expect(check.locator('summary')).toBeFocused();
  828 |   await expect(page.locator('[data-ns-pair-feedback]')).toContainText('different elements');
  829 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  830 | });
  831 | 
  832 | test('nucleus comparison shortcuts move keyboard learners through the mobile flow without changing their work', async ({ page }) => {
  833 |   const errors: string[] = [];
  834 |   page.on('pageerror', error => errors.push(error.message));
  835 |   await page.setViewportSize({ width: 320, height: 844 });
  836 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  837 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { completed: ['counting'], decay: { prediction: 32, step: 1 }, nucleus: { prediction: 'same', protons: 6, neutrons: 7, cards: [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }], reflection: 'Keep my saved note.' } } });
  838 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  839 |   let state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  840 |   const build = page.locator('[data-ns-build-heading]');
  841 |   const saved = page.getByRole('heading', { name: 'Your saved nuclei', exact: true });
  842 |   await page.getByRole('button', { name: 'Review saved comparisons' }).focus();
  843 |   await page.keyboard.press('Enter');
  844 |   await expect(saved).toBeFocused();
  845 |   await expect(page.locator('.ns-pair-chart')).toBeInViewport({ ratio: 1 });
  846 |   await page.screenshot({ path: output + '/nucleus-flow-mobile-compare.png' });
  847 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  848 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  849 |   // A learner can close the controls while looking at the saved evidence.
  850 |   await build.focus(); await page.keyboard.press('Enter');
```