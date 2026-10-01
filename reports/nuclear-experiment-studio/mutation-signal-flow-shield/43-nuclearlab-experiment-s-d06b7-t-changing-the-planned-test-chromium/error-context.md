# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective evidence shortcuts revisit the recorded shielding comparison without changing the planned test
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:619:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-case-reading]')
Expected: "25.0%"
Received: "21.4%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-case-reading]')
    27 × locator resolved to <strong data-ns-case-reading="true">21.4%</strong>
       - unexpected value "21.4%"

```

```yaml
- strong: 21.4%
```

# Test source

```ts
  542 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['distance'], counting: { prediction: 'vary', runs: [4, 1] }, nucleus: { reflection: 'Keep my nucleus note.' }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded'], reflection: 'Compare each effect separately.' } } });
  543 |   const review = page.getByRole('combobox', { name: 'Review a saved test', exact: true });
  544 |   const reading = page.locator('[data-ns-case-reading]');
  545 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  546 |   await expect(review).toHaveValue('unshielded');
  547 |   await expect(review.locator('option')).toHaveCount(2);
  548 |   await expect(reading).toHaveText('25.0%');
  549 |   await review.focus(); await page.keyboard.press('ArrowUp');
  550 |   await expect(reading).toHaveText('21.4%');
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
  619 | test('signal detective evidence shortcuts revisit the recorded shielding comparison without changing the planned test', async ({ page }) => {
  620 |   const errors: string[] = [];
  621 |   page.on('pageerror', error => errors.push(error.message));
  622 |   await page.setViewportSize({ width: 1100, height: 1000 });
  623 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['decay'], nucleus: { reflection: 'Keep my nucleus note.' }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded', 'both'], review: 'closer', reflection: 'Compare each effect separately.' } } });
  624 |   const saved = page.getByRole('heading', { name: 'Your saved evidence', exact: true });
  625 |   const explanation = page.getByRole('heading', { name: 'What explains the lower signal?', exact: true });
  626 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  627 |   await page.getByRole('button', { name: 'Review saved evidence', exact: true }).focus();
  628 |   await page.keyboard.press('Enter');
  629 |   await expect(saved).toBeFocused();
  630 |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
  631 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  632 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(original);
  633 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).focus();
  634 |   await page.keyboard.press('Enter');
  635 |   await expect(explanation).toBeFocused();
  636 |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
  637 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(original);
  638 |   await page.getByRole('button', { name: 'Only distance mattered; the shield did nothing.', exact: true }).click();
  639 |   const retry = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  640 |   await page.getByRole('button', { name: 'Review the shielding evidence', exact: true }).focus();
  641 |   await page.keyboard.press('Enter');
> 642 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
      |                                                        ^ Error: expect(locator).toHaveText(expected) failed
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
  727 | test('nucleus builder introduces isotopes with keyboard comparisons and preserves the half-life lesson', async ({ page }) => {
  728 |   const errors: string[] = [];
  729 |   page.on('pageerror', error => errors.push(error.message));
  730 |   await page.setViewportSize({ width: 1100, height: 1000 });
  731 |   await mount(page, { nkStudio: { mission: 'shield', completed: ['distance'], decay: { prediction: 32, step: 1 } } });
  732 |   await expect(page.locator('.ns-warmup-entry')).not.toHaveAttribute('open');
  733 |   await page.locator('.ns-warmup-entry > summary').focus();
  734 |   await page.keyboard.press('Enter');
  735 |   await page.getByRole('button', { name: 'Start the nucleus builder' }).focus();
  736 |   await page.keyboard.press('Enter');
  737 |   await expect(page.getByRole('region', { name: 'Nucleus builder', exact: true })).toBeFocused();
  738 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-12');
  739 |   const save = page.getByRole('button', { name: 'Save this nucleus' });
  740 |   await expect(save).toBeDisabled();
  741 |   await page.getByRole('button', { name: 'It becomes another element', exact: true }).click();
  742 |   await save.focus();
```