# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective requires separate effects and preserves the investigation when reviewing an idea
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:396:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByRole('textbox', { name: 'My takeaway from Signal detective', exact: true })
Expected: "Keep one thing fixed to test the other."
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for getByRole('textbox', { name: 'My takeaway from Signal detective', exact: true })

```

```yaml
- navigation "Nuclear Lab views":
  - button "Experiment studio" [pressed]
  - button "All topics & routes"
  - button "Reactor control room"
- region "Signal detective":
  - button "← Back to introductions"
  - paragraph: Signal detective
  - heading "Why did the signal drop?" [level=3]
  - paragraph: The detector moved from 1 m to 2 m, and a lead shield was added. The source stayed the same. Separate the two effects with fair comparisons.
  - text: "Before: 1 m, no shield ·"
  - strong: 100%
  - paragraph: Source output stays fixed · 1 MeV gamma
  - strong: 25.0%
  - text: of the original expected detector signal
  - paragraph: "Last test: Remove the lead"
  - paragraph: "Compare each test with the mystery reading: 5.3%."
  - heading "Your comparisons" [level=5]
  - table "Each test starts from the mystery setup. Repeated tests update their row.":
    - caption: Each test starts from the mystery setup. Repeated tests update their row.
    - rowgroup:
      - row "Test Changed Signal":
        - columnheader "Test"
        - columnheader "Changed"
        - columnheader "Signal"
    - rowgroup:
      - row "Undo both changes Distance + shield 100.0%":
        - rowheader "Undo both changes"
        - cell "Distance + shield"
        - cell "100.0%"
      - row "Move closer Distance only 21.4%":
        - rowheader "Move closer"
        - cell "Distance only"
        - cell "21.4%"
      - row "Remove the lead Shield only 25.0%":
        - rowheader "Remove the lead"
        - cell "Shield only"
        - cell "25.0%"
  - group: "Your prediction: Both changes"
  - paragraph: 2 / Change one thing
  - group "Choose a comparison test":
    - button "Move closer Move to 1 m. Keep the 2 cm lead shield.":
      - strong: Move closer
      - text: Move to 1 m. Keep the 2 cm lead shield.
    - button "Remove the lead Remove the shield. Keep the detector at 2 m." [pressed]:
      - strong: Remove the lead
      - text: Remove the shield. Keep the detector at 2 m.
    - button "Undo both changes Move to 1 m and remove the shield.":
      - strong: Undo both changes
      - text: Move to 1 m and remove the shield.
  - paragraph: "Planned test: Remove the lead. Run it to record a reading."
  - button "Run this comparison →"
  - status
  - paragraph: Undoing both restores the signal, but two things changed together. Use the single changes to separate their effects.
  - paragraph: 2 of 2 separate effects checked
  - list:
    - listitem: "✓ Distance checked: shield kept in place"
    - listitem: "✓ Shield checked: distance kept at 2 m"
  - paragraph: 3 / Explain
  - heading "What explains the lower signal?" [level=5]
  - button "Only distance mattered; the shield did nothing."
  - button "Both distance and shielding reduced what reached the detector." [pressed]
  - strong: ✓ Case explained
  - paragraph: Change one thing at a time to see its effect. A lower detector reading can come from the path, even when the source is unchanged.
  - button "Restart the investigation"
  - group: Need a nudge?
  - group: Your takeaway
  - group: How this model works ·
  - group: Review an idea first
```

# Test source

```ts
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
  436 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  437 |   const note = page.getByRole('textbox', { name: 'My takeaway from Signal detective', exact: true });
  438 |   await note.fill('Keep one thing fixed to test the other.');
  439 |   await page.screenshot({ path: output + '/signal-detective-desktop.png', fullPage: true });
  440 |   await audit(page);
  441 |   await page.getByText('Review an idea first', { exact: true }).click();
  442 |   await page.getByRole('button', { name: 'Review distance', exact: true }).click();
  443 |   await expect(page.locator('[data-nk-studio]')).toHaveAttribute('data-nk-studio', 'distance');
  444 |   await expect(page.locator('.ns-progress')).toContainText('2 / 6');
  445 |   await page.locator('.ns-case-entry > summary').click();
  446 |   await page.getByRole('button', { name: 'Revisit the signal mystery' }).click();
  447 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
> 448 |   await expect(note).toHaveValue('Keep one thing fixed to test the other.');
      |                      ^ Error: expect(locator).toHaveValue(expected) failed
  449 |   await page.getByRole('button', { name: 'Restart the investigation', exact: true }).click();
  450 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('5.3%');
  451 |   await expect(note).toHaveValue('Keep one thing fixed to test the other.');
  452 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  453 |   expect(errors).toEqual([]);
  454 | });
  455 | 
  456 | test('signal detective fits at 320px and keeps controls before the comparison notebook', async ({ page }) => {
  457 |   await page.setViewportSize({ width: 320, height: 844 });
  458 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  459 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'unshielded', runs: ['closer'] } } });
  460 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  461 |   const positions = await page.evaluate(() => ({
  462 |     controls: document.querySelector('.ns-controls')!.getBoundingClientRect().bottom,
  463 |     notebook: document.querySelector('[data-ns-case-notebook]')!.getBoundingClientRect().top,
  464 |     fits: document.documentElement.scrollWidth <= innerWidth,
  465 |   }));
  466 |   expect(positions.fits).toBe(true);
  467 |   expect(positions.notebook).toBeGreaterThanOrEqual(positions.controls);
  468 |   await page.getByRole('button', { name: 'Run this comparison' }).focus();
  469 |   await page.keyboard.press('Enter');
  470 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  471 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  472 |   await page.locator('[data-ns-reflection="investigation"] > summary').click();
  473 |   await page.getByRole('textbox', { name: 'My takeaway from Signal detective' }).fill('Separate the effects.');
  474 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  475 |   await page.screenshot({ path: output + '/signal-detective-mobile-320.png', fullPage: true });
  476 |   await audit(page);
  477 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  478 |   await expect(page.locator('[data-ns-case-setup="unshielded"]')).toHaveCSS('outline-style', 'solid');
  479 |   await page.screenshot({ path: output + '/signal-detective-forced-colors.png', fullPage: true });
  480 | });
  481 | 
  482 | test('signal detective keeps readings and evidence readable in the light palette', async ({ page }) => {
  483 |   await page.setViewportSize({ width: 1100, height: 1000 });
  484 |   await mount(page, { nkView: 'investigate', nkStudio: { investigation: { prediction: 'both', runs: ['closer', 'unshielded'], selected: 'unshielded' } } });
  485 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  486 |   await expect(page.locator('.nk-workspace')).toHaveAttribute('data-theme', 'light');
  487 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  488 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('2 of 2 separate effects checked');
  489 |   await page.getByRole('button', { name: 'Both distance and shielding reduced' }).click();
  490 |   await page.screenshot({ path: output + '/signal-detective-light.png', fullPage: true });
  491 |   await audit(page);
  492 | });
  493 | 
```