# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective comparison checks give specific hints and keep practice separate from recorded evidence
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:727:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-ns-case-check-feedback]')
Expected: "retry"
Received: "correct"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-ns-case-check-feedback]')
    27 × locator resolved to <p role="status" class="ns-case-check-feedback" data-ns-case-check-feedback="correct">Two changes together cannot show each effect sepa…</p>
       - unexpected value "correct"

```

```yaml
- status: Two changes together cannot show each effect separately. Use the single-change tests.
```

# Test source

```ts
  641 |   await page.keyboard.press('Enter');
  642 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  643 |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveValue('unshielded');
  644 |   await expect(saved).toBeFocused();
  645 |   await expect(page.locator('[data-ns-case-chart]')).toContainText('Distance stayed at 2 m.');
  646 |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
  647 |   await expect(page.locator('[data-ns-case-plan]')).toContainText('Undo both changes');
  648 |   await expect(page.locator('[data-ns-case-notebook] [aria-current="true"] th')).toHaveText('Remove the lead');
  649 |   const reviewed = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  650 |   expect(reviewed).toEqual({ ...retry, nkStudio: { ...retry.nkStudio, investigation: { ...retry.nkStudio.investigation, review: 'unshielded' } } });
  651 |   expect(reviewed.nkStudio.investigation.solved).toBeUndefined();
  652 |   await page.screenshot({ path: output + '/signal-flow-desktop.png', fullPage: true });
  653 |   await audit(page);
  654 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).click();
  655 |   await page.getByRole('button', { name: 'Review the shielding evidence', exact: true }).click();
  656 |   await expect(saved).toBeFocused();
  657 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(reviewed);
  658 |   expect(errors).toEqual([]);
  659 | });
  660 | 
  661 | test('signal detective evidence shortcuts move keyboard learners through the mobile flow without preparing a test', async ({ page }) => {
  662 |   const errors: string[] = [];
  663 |   page.on('pageerror', error => errors.push(error.message));
  664 |   await page.setViewportSize({ width: 320, height: 844 });
  665 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  666 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { completed: ['distance'], counting: { runs: [1, 4] }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'both'], review: 'closer', reflection: 'Keep this note.' } } });
  667 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  668 |   const saved = page.getByRole('heading', { name: 'Your saved evidence', exact: true });
  669 |   const tests = page.locator('[data-ns-case-tests-heading]');
  670 |   const explanation = page.getByRole('heading', { name: 'What explains the lower signal?', exact: true });
  671 |   let state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  672 |   await page.getByRole('button', { name: 'Review saved evidence', exact: true }).focus();
  673 |   await page.keyboard.press('Enter');
  674 |   await expect(saved).toBeFocused();
  675 |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
  676 |   await expect(page.getByRole('button', { name: 'Continue testing', exact: true })).toBeInViewport({ ratio: 1 });
  677 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  678 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  679 |   await page.screenshot({ path: output + '/signal-flow-mobile-evidence-light.png' });
  680 |   await tests.focus(); await page.keyboard.press('Enter');
  681 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  682 |   await page.getByRole('button', { name: 'Continue testing', exact: true }).focus();
  683 |   await page.keyboard.press('Enter');
  684 |   await expect(page.locator('[data-ns-case-plan]')).toHaveText('Planned test: Undo both changes. Run it to record a reading.');
  685 |   await expect(tests).toBeFocused();
  686 |   await expect(page.locator('.ns-case-tests')).toHaveAttribute('open');
  687 |   await expect(page.getByRole('button', { name: 'Prepare Remove the lead', exact: true })).toBeInViewport();
  688 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  689 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  690 |   await page.getByRole('button', { name: 'Prepare Remove the lead', exact: true }).click();
  691 |   const run = page.getByRole('button', { name: 'Run this comparison' });
  692 |   await expect(run).toBeFocused(); await page.keyboard.press('Enter');
  693 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  694 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  695 |   await page.getByRole('button', { name: 'Review saved evidence', exact: true }).focus();
  696 |   await page.keyboard.press('Enter'); await expect(saved).toBeFocused();
  697 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).focus();
  698 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  699 |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
  700 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  701 |   await page.getByRole('button', { name: 'Only distance mattered; the shield did nothing.', exact: true }).click();
  702 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  703 |   await page.getByRole('button', { name: 'Review the shielding evidence', exact: true }).focus();
  704 |   await page.keyboard.press('Enter'); await expect(saved).toBeFocused();
  705 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  706 |   await audit(page);
  707 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  708 |   await expect(saved).toHaveCSS('outline-style', 'solid');
  709 |   await expect(saved).toHaveCSS('color', 'rgb(0, 0, 0)');
  710 |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
  711 |   await page.screenshot({ path: output + '/signal-flow-mobile-evidence-forced.png' });
  712 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).focus();
  713 |   await page.keyboard.press('Enter');
  714 |   await expect(explanation).toBeFocused();
  715 |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
  716 |   await expect(explanation).toHaveCSS('outline-style', 'solid');
  717 |   await page.screenshot({ path: output + '/signal-flow-mobile-explain-forced.png' });
  718 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  719 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  720 |   await page.getByRole('button', { name: 'Review your explanation', exact: true }).focus();
  721 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  722 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  723 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  724 |   expect(errors).toEqual([]);
  725 | });
  726 | 
  727 | test('signal detective comparison checks give specific hints and keep practice separate from recorded evidence', async ({ page }) => {
  728 |   const errors: string[] = [];
  729 |   page.on('pageerror', error => errors.push(error.message));
  730 |   await page.setViewportSize({ width: 1100, height: 1000 });
  731 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['distance'], counting: { runs: [1, 4] }, nucleus: { reflection: 'Keep this too.' }, investigation: { prediction: 'both', selected: 'closer', runs: ['both'], review: 'both', reflection: 'One change at a time.' } } });
  732 |   const check = page.locator('[data-ns-case-check]');
  733 |   const feedback = page.locator('[data-ns-case-check-feedback]');
  734 |   const choices = page.getByRole('group', { name: 'From the mystery setup (2 m, 2 cm lead), what changed?', exact: true });
  735 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  736 |   await expect(check).not.toHaveAttribute('open');
  737 |   await expect(feedback).toBeEmpty();
  738 |   await check.locator('summary').focus(); await page.keyboard.press('Enter');
  739 |   await choices.getByRole('button', { name: 'Distance only', exact: true }).focus();
  740 |   await page.keyboard.press('Enter');
> 741 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'retry');
      |                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  742 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('0 of 2 separate effects checked');
  743 |   await expect(feedback).toContainText('Count both changes and try again.');
  744 |   await expect(choices.getByRole('button', { name: 'Distance only', exact: true })).toBeFocused();
  745 |   await expect(check).toHaveAttribute('open');
  746 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  747 |   await choices.getByRole('button', { name: 'Distance + shield', exact: true }).focus();
  748 |   await page.keyboard.press('Enter');
  749 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'correct');
  750 |   await expect(feedback).toContainText('cannot show each effect separately');
  751 |   await expect(check).not.toHaveAttribute('open');
  752 |   await expect(check.locator('summary')).toHaveText('✓ Both changed together');
  753 |   await expect(check.locator('summary')).toBeFocused();
  754 |   let current = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  755 |   expect(current).toEqual({ ...original, nkStudio: { ...original.nkStudio, investigation: { ...original.nkStudio.investigation, noticing: { both: 'both' } } } });
  756 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  757 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  758 |   await expect(check).toHaveAttribute('data-ns-case-check', 'closer');
  759 |   await expect(check).not.toHaveAttribute('open');
  760 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'waiting');
  761 |   await check.locator('summary').click();
  762 |   await choices.getByRole('button', { name: 'Shield only', exact: true }).click();
  763 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'retry');
  764 |   await expect(feedback).toContainText('The detector moved from 2 m to 1 m.');
  765 |   await choices.getByRole('button', { name: 'Distance only', exact: true }).click();
  766 |   await expect(check.locator('summary')).toBeFocused();
  767 |   await expect(check.locator('summary')).toHaveText('✓ Distance changed');
  768 |   await expect(feedback).toContainText('separate the distance effect');
  769 |   await page.getByRole('button', { name: 'Prepare Remove the lead', exact: true }).click();
  770 |   await page.keyboard.press('Enter');
  771 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  772 |   await expect(check).toHaveAttribute('data-ns-case-check', 'unshielded');
  773 |   await check.locator('summary').click();
  774 |   await choices.getByRole('button', { name: 'Distance + shield', exact: true }).click();
  775 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'retry');
  776 |   await expect(feedback).toContainText('The detector stayed at 2 m.');
  777 |   await choices.getByRole('button', { name: 'Shield only', exact: true }).click();
  778 |   await expect(check.locator('summary')).toBeFocused();
  779 |   await expect(check.locator('summary')).toHaveText('✓ Shielding changed');
  780 |   await expect(feedback).toContainText('separate the shielding effect');
  781 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('2 of 2 separate effects checked');
  782 |   await expect(page.locator('[data-ns-reflection="investigation"]')).toHaveCount(0);
  783 |   current = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  784 |   expect(current.nkStudio.investigation.noticing).toEqual({ both: 'both', closer: 'distance', unshielded: 'shield' });
  785 |   expect(current.nkStudio.investigation.solved).toBeUndefined();
  786 |   expect(current.nkStudio.investigation.reflection).toBe(original.nkStudio.investigation.reflection);
  787 |   expect(current.nkStudio.completed).toEqual(original.nkStudio.completed);
  788 |   expect(current.nkStudio.counting).toEqual(original.nkStudio.counting);
  789 |   expect(current.nkStudio.nucleus).toEqual(original.nkStudio.nucleus);
  790 |   await page.screenshot({ path: output + '/signal-noticing-desktop.png', fullPage: true });
  791 |   await audit(page);
  792 |   await page.getByRole('combobox', { name: 'Review a saved test', exact: true }).selectOption('both');
  793 |   await expect(check.locator('summary')).toHaveText('✓ Both changed together');
  794 |   await expect(check).not.toHaveAttribute('open');
  795 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  796 |   await page.locator('.ns-case-entry > summary').click();
  797 |   await page.getByRole('button', { name: 'Resume the signal mystery' }).click();
  798 |   await expect(check.locator('summary')).toHaveText('✓ Both changed together');
  799 |   expect((await page.evaluate(() => (window as any).__toolData._nuclearLab)).nkStudio.investigation.noticing).toEqual(current.nkStudio.investigation.noticing);
  800 |   expect(errors).toEqual([]);
  801 | });
  802 | 
  803 | test('signal detective comparison checks fit at 320px and fold back to visible keyboard focus in forced colors', async ({ page }) => {
  804 |   const errors: string[] = [];
  805 |   page.on('pageerror', error => errors.push(error.message));
  806 |   await page.setViewportSize({ width: 320, height: 844 });
  807 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  808 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'both', runs: ['closer'], review: 'closer', reflection: 'Keep this note.' } } });
  809 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  810 |   await page.getByRole('button', { name: 'Review saved evidence', exact: true }).click();
  811 |   const check = page.locator('[data-ns-case-check]');
  812 |   const feedback = page.locator('[data-ns-case-check-feedback]');
  813 |   const choices = page.getByRole('group', { name: 'From the mystery setup (2 m, 2 cm lead), what changed?', exact: true });
  814 |   const summary = check.locator('summary');
  815 |   await expect(check).not.toHaveAttribute('open');
  816 |   await summary.focus(); await page.keyboard.press('Enter');
  817 |   const shield = choices.getByRole('button', { name: 'Shield only', exact: true });
  818 |   const distance = choices.getByRole('button', { name: 'Distance only', exact: true });
  819 |   await shield.focus(); await page.keyboard.press('Enter');
  820 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'retry');
  821 |   await expect(shield).toBeFocused();
  822 |   await expect(shield).toHaveCSS('outline-style', 'solid');
  823 |   for (const button of await choices.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  824 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  825 |   await page.screenshot({ path: output + '/signal-noticing-mobile-retry-light.png' });
  826 |   await audit(page);
  827 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  828 |   await distance.focus(); await page.keyboard.press('Enter');
  829 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'correct');
  830 |   await expect(summary).toBeFocused();
  831 |   await expect(summary).toBeInViewport({ ratio: 1 });
  832 |   await expect(summary).toHaveCSS('outline-style', 'solid');
  833 |   await expect(summary).toHaveCSS('color', 'rgb(0, 0, 0)');
  834 |   await expect(check).not.toHaveAttribute('open');
  835 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('1 of 2 separate effects checked');
  836 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  837 |   await page.screenshot({ path: output + '/signal-noticing-mobile-correct-forced.png' });
  838 |   await page.keyboard.press('Enter');
  839 |   await expect(distance).toHaveAttribute('aria-pressed', 'true');
  840 |   await expect(distance).toHaveCSS('outline-style', 'solid');
  841 |   await distance.focus(); await page.keyboard.press('Enter');
```