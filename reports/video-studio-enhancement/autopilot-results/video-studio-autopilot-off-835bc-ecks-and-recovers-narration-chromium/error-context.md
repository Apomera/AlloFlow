# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: video-studio-autopilot.spec.ts >> official tutorial checks readiness, records, quality-checks, and recovers narration
- Location: tests\e2e\video-studio-autopilot.spec.ts:7:5

# Error details

```
Test timeout of 75000ms exceeded.
```

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#demoNarrCancelEditBtn')
    - locator resolved to <button class="quiet" id="demoNarrCancelEditBtn">Cancel automatic narration</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    51 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]: Source fixture
  - button "Text Adaptation" [ref=e3]
```

# Test source

```ts
  460 |   await expect(studio.locator('#demoContinueBtn')).toBeVisible();
  461 |   await expect(studio.locator('#demoContinueBtn')).toBeEnabled();
  462 |   await studio.locator('#demoContinueBtn').click();
  463 |   await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(false);
  464 |   await expect(studio.locator('#demoPlanList > div')).toHaveCount(1);
  465 |   await expect(studio.locator('#demoPlanList')).toContainText('Second custom step');
  466 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  467 |   await studio.locator('#demoStartBtn').click();
  468 |   await expect(studio.locator('#demoStitchBtn')).toBeVisible({ timeout: 15_000 });
  469 |   await expect(studio.locator('#demoStitchBtn')).toHaveText('Stitch 2 continuation takes');
  470 |   await studio.locator('#demoStitchBtn').click();
  471 |   await expect(studio.locator('#sceneList .scene-row')).toHaveCount(2);
  472 |   await expect(studio.locator('#sceneStatus')).toContainText('2 continuation takes stitched in recording order');
  473 |   await expect(studio.locator('#sceneList .scene-row').nth(0)).toContainText('Demo');
  474 |   await expect(studio.locator('#sceneList .scene-row').nth(1)).toContainText('Demo');
  475 |   await studio.locator('#tabRecord').click();
  476 |   await studio.locator('#demoAudioMode').selectOption('auto-Kore');
  477 |   await studio.locator('#demoOfficialTextBtn').click();
  478 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  479 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveText('Loading tutorial...');
  480 |   await expect(studio.locator('#demoPlanCancelBtn')).toHaveText('Cancel tutorial load');
  481 |   await studio.locator('#demoPlanCancelBtn').click();
  482 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  483 |   await expect(studio.locator('#demoOfficialTextBtn')).toBeFocused();
  484 |   await expect(studio.locator('#demoStatus')).toContainText('Official tutorial loading cancelled. Nothing ran');
  485 |   await studio.waitForTimeout(900);
  486 |   await expect(studio.locator('#demoPlanList')).not.toContainText('Text Adaptation');
  487 |   await studio.locator('#demoOfficialTextBtn').click();
  488 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  489 |   await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  490 |   await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  491 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  492 |   await expect(demoPlanButton).toBeEnabled();
  493 |   await expect(demoPlanButton).toHaveText('✨ Replace official plan with Gemini plan');
  494 |   await expect(studio.locator('#startBtn')).toHaveText('▶ Record approved demo');
  495 |   await studio.locator('#demoTemplateSelect').selectOption({ index: 1 });
  496 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  497 |   const validationCountBeforeAtomicCancel = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  498 |   await demoGoal.fill('Slow planning fixture');
  499 |   await demoPlanButton.click();
  500 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsLocked);
  501 |   await expect(studio.locator('#demoPlanCancelBtn')).toBeVisible();
  502 |   await studio.locator('#demoPlanCancelBtn').click();
  503 |   await expect(studio.locator('#demoStatus')).toContainText('Planning cancelled. Nothing ran');
  504 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  505 |   await studio.waitForTimeout(1650);
  506 |   await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  507 |   await studio.locator('#demoPreflightBtn').click();
  508 |   await expect(studio.locator('#demoStatus')).toContainText('Preflight refreshed. The current plan is ready.');
  509 |   expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBe(validationCountBeforeAtomicCancel);
  510 |   const validationCountBeforeIndependentTemplate = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  511 |   await studio.locator('#demoTemplateName').fill('Official tutorial copy');
  512 |   await studio.locator('#demoTemplateSaveBtn').click();
  513 |   await expect(studio.locator('#demoStatus')).toContainText('Saved reusable tutorial template');
  514 |   const savedOfficialTemplate = await studio.evaluate(() => {
  515 |     const selectedId = (document.getElementById('demoTemplateSelect') as HTMLSelectElement).value;
  516 |     const rows = JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]');
  517 |     return rows.find((item: any) => item.id === selectedId) || null;
  518 |   });
  519 |   expect(savedOfficialTemplate?.officialId).toBeNull();
  520 |   await studio.locator('#demoTemplateLoadBtn').click();
  521 |   await expect(studio.locator('#demoStatus')).toContainText('Loaded tutorial template: Official tutorial copy');
  522 |   await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeEnabled();
  523 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  524 |   await expect.poll(() => page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBeGreaterThan(validationCountBeforeIndependentTemplate);
  525 |   await studio.locator('#demoOfficialTextBtn').click();
  526 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  527 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  528 |   await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeDisabled();
  529 |   await demoGoal.fill('Official tutorial: adapt a short science passage for Grade 5 readers');
  530 |   await studio.getByLabel('Step 1 narration').fill('Teacher-approved source walkthrough.');
  531 |   await studio.getByLabel('Step 1 result hold seconds').fill('0.5');
  532 |   await studio.getByLabel('Step 1 result hold seconds').press('Tab');
  533 |   await studio.getByLabel('Step 2 result hold seconds').fill('0.5');
  534 |   await studio.getByLabel('Step 2 result hold seconds').press('Tab');
  535 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  536 |   await expect(studio.getByLabel('Step 1 result hold seconds')).toHaveValue('1');
  537 |   await studio.locator('#demoRehearseBtn').click();
  538 |   await expect(studio.locator('#demoStatus')).toContainText('Readiness check passed. No app actions ran');
  539 |   await expect(demoPlanButton).toBeEnabled();
  540 |   await expect(studio.locator('#demoOfficialTextBtn')).toBeEnabled();
  541 |   await expect(studio.locator('#demoStopBtn')).toBeHidden();
  542 |   expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-official-tutorial-run-request').length)).toBe(0);
  543 |   await expect(studio.locator('#demoPrivacyIndicator')).toContainText('not recording');
  544 |   await expect(studio.locator('#demoPlanResetBtn')).toBeHidden();
  545 |   await expect(studio.locator('#clipList')).toBeEmpty();
  546 |   await studio.locator('#startBtn').click();
  547 |   await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.script)).toBe('Teacher-approved source walkthrough.');
  548 |   await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.pauseAfter)).toBe(1);
  549 | 
  550 |   await expect(studio.locator('#clipList')).toContainText('Regenerate', { timeout: 20000 });
  551 |   await expect(studio.getByLabel('text for caption 1')).toHaveValue('Teacher-approved source walkthrough.');
  552 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  553 |   await expect(studio.locator('#demoQualityCard')).toBeVisible();
  554 |   await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  555 |   await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  556 |   await expect.poll(() => page.evaluate(() => (window as any).cleanupSeen)).toBe(true);
  557 | 
  558 |   await studio.locator('#demoNarrRetryEditBtn').click();
  559 |   await expect(studio.locator('#demoNarrCancelEditBtn')).toBeVisible();
> 560 |   await studio.locator('#demoNarrCancelEditBtn').click();
      |                                                  ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  561 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  562 |   await expect(studio.locator('#demoQualityCard')).toBeVisible();
  563 |   await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  564 |   await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  565 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(3);
  566 | 
  567 |   await studio.locator('#demoNarrRetryEditBtn').click();
  568 |   const regenerate = studio.locator('#clipList').getByRole('button', { name: /Regenerate narration clip/ });
  569 |   await expect(regenerate).toHaveCount(2, { timeout: 10000 });
  570 |   await expect(studio.locator('#clipList')).toContainText('Teacher-approved source walkthrough.');
  571 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeHidden();
  572 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(4);
  573 | 
  574 |   await regenerate.first().click();
  575 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(5);
  576 |   await expect(studio.locator('#aiNarrStatus')).toContainText('Narration line regenerated');
  577 |   await studio.locator('#demoQualityRerunBtn').click();
  578 |   await expect(studio.locator('#demoQualityStatus')).toContainText('0 failed');
  579 | });
  580 | 
```