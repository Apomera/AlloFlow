# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: video-studio-autopilot.spec.ts >> official tutorial checks readiness, records, quality-checks, and recovers narration
- Location: tests\e2e\video-studio-autopilot.spec.ts:7:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "Teacher-approved source walkthrough."
Received: undefined

Call Log:
- Test timeout of 75000ms exceeded
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]: Source fixture
  - button "Text Adaptation" [ref=e3]
```

# Test source

```ts
  448 |   await expect(studio.locator('#demoContinuationDismissBtn')).toBeEnabled();
  449 |   await expect(studio.locator('#demoStatus')).toContainText('Restored 1 saved unfinished step');
  450 |   const savedContinuation = await studio.evaluate(() => sessionStorage.getItem('vs_demo_continuation_v1'));
  451 |   expect(savedContinuation).not.toBeNull();
  452 |   await studio.locator('#demoContinuationDismissBtn').click();
  453 |   await expect(studio.locator('#demoContinueBtn')).toBeHidden();
  454 |   await expect(studio.locator('#demoContinuationDismissBtn')).toBeHidden();
  455 |   await expect(studio.locator('#demoStatus')).toContainText('current on-screen plan is unchanged');
  456 |   await expect(studio.locator('#demoPlanList > div')).toHaveCount(2);
  457 |   await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(false);
  458 |   await studio.evaluate((saved) => { if (saved) sessionStorage.setItem('vs_demo_continuation_v1', saved); }, savedContinuation);
  459 |   await studio.reload();
  460 |   await studio.waitForLoadState('domcontentloaded');
  461 |   await expect(studio.locator('#demoContinueBtn')).toBeVisible();
  462 |   await expect(studio.locator('#demoContinueBtn')).toBeEnabled();
  463 |   await studio.locator('#demoContinueBtn').click();
  464 |   await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(false);
  465 |   await expect(studio.locator('#demoPlanList > div')).toHaveCount(1);
  466 |   await expect(studio.locator('#demoPlanList')).toContainText('Second custom step');
  467 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  468 |   await studio.locator('#demoStartBtn').click();
  469 |   await expect(studio.locator('#demoStitchBtn')).toBeVisible({ timeout: 15_000 });
  470 |   await expect(studio.locator('#demoStitchBtn')).toHaveText('Stitch 2 continuation takes');
  471 |   await studio.locator('#demoStitchBtn').click();
  472 |   await expect(studio.locator('#sceneList .scene-row')).toHaveCount(2);
  473 |   await expect(studio.locator('#sceneStatus')).toContainText('2 continuation takes stitched in recording order');
  474 |   await expect(studio.locator('#sceneList .scene-row').nth(0)).toContainText('Demo');
  475 |   await expect(studio.locator('#sceneList .scene-row').nth(1)).toContainText('Demo');
  476 |   await studio.locator('#tabRecord').click();
  477 |   await studio.locator('#demoAudioMode').selectOption('auto-Kore');
  478 |   await studio.locator('#demoOfficialTextBtn').click();
  479 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  480 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveText('Loading tutorial...');
  481 |   await expect(studio.locator('#demoPlanCancelBtn')).toHaveText('Cancel tutorial load');
  482 |   await studio.locator('#demoPlanCancelBtn').click();
  483 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  484 |   await expect(studio.locator('#demoOfficialTextBtn')).toBeFocused();
  485 |   await expect(studio.locator('#demoStatus')).toContainText('Official tutorial loading cancelled. Nothing ran');
  486 |   await studio.waitForTimeout(900);
  487 |   await expect(studio.locator('#demoPlanList')).not.toContainText('Text Adaptation');
  488 |   await studio.locator('#demoOfficialTextBtn').click();
  489 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  490 |   await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  491 |   await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  492 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  493 |   await expect(demoPlanButton).toBeEnabled();
  494 |   await expect(demoPlanButton).toHaveText('✨ Replace official plan with Gemini plan');
  495 |   await expect(studio.locator('#startBtn')).toHaveText('▶ Record approved demo');
  496 |   await studio.locator('#demoTemplateSelect').selectOption({ index: 1 });
  497 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  498 |   const validationCountBeforeAtomicCancel = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  499 |   await demoGoal.fill('Slow planning fixture');
  500 |   await demoPlanButton.click();
  501 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsLocked);
  502 |   await expect(studio.locator('#demoPlanCancelBtn')).toBeVisible();
  503 |   await studio.locator('#demoPlanCancelBtn').click();
  504 |   await expect(studio.locator('#demoStatus')).toContainText('Planning cancelled. Nothing ran');
  505 |   await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  506 |   await studio.waitForTimeout(1650);
  507 |   await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  508 |   await studio.locator('#demoPreflightBtn').click();
  509 |   await expect(studio.locator('#demoStatus')).toContainText('Preflight refreshed. The current plan is ready.');
  510 |   expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBe(validationCountBeforeAtomicCancel);
  511 |   const validationCountBeforeIndependentTemplate = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  512 |   await studio.locator('#demoTemplateName').fill('Official tutorial copy');
  513 |   await studio.locator('#demoTemplateSaveBtn').click();
  514 |   await expect(studio.locator('#demoStatus')).toContainText('Saved reusable tutorial template');
  515 |   const savedOfficialTemplate = await studio.evaluate(() => {
  516 |     const selectedId = (document.getElementById('demoTemplateSelect') as HTMLSelectElement).value;
  517 |     const rows = JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]');
  518 |     return rows.find((item: any) => item.id === selectedId) || null;
  519 |   });
  520 |   expect(savedOfficialTemplate?.officialId).toBeNull();
  521 |   await studio.locator('#demoTemplateLoadBtn').click();
  522 |   await expect(studio.locator('#demoStatus')).toContainText('Loaded tutorial template: Official tutorial copy');
  523 |   await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeEnabled();
  524 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  525 |   await expect.poll(() => page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBeGreaterThan(validationCountBeforeIndependentTemplate);
  526 |   await studio.locator('#demoOfficialTextBtn').click();
  527 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  528 |   await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  529 |   await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeDisabled();
  530 |   await demoGoal.fill('Official tutorial: adapt a short science passage for Grade 5 readers');
  531 |   await studio.getByLabel('Step 1 narration').fill('Teacher-approved source walkthrough.');
  532 |   await studio.getByLabel('Step 1 result hold seconds').fill('0.5');
  533 |   await studio.getByLabel('Step 1 result hold seconds').press('Tab');
  534 |   await studio.getByLabel('Step 2 result hold seconds').fill('0.5');
  535 |   await studio.getByLabel('Step 2 result hold seconds').press('Tab');
  536 |   await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  537 |   await expect(studio.getByLabel('Step 1 result hold seconds')).toHaveValue('1');
  538 |   await studio.locator('#demoRehearseBtn').click();
  539 |   await expect(studio.locator('#demoStatus')).toContainText('Readiness check passed. No app actions ran');
  540 |   await expect(demoPlanButton).toBeEnabled();
  541 |   await expect(studio.locator('#demoOfficialTextBtn')).toBeEnabled();
  542 |   await expect(studio.locator('#demoStopBtn')).toBeHidden();
  543 |   expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-official-tutorial-run-request').length)).toBe(0);
  544 |   await expect(studio.locator('#demoPrivacyIndicator')).toContainText('not recording');
  545 |   await expect(studio.locator('#demoPlanResetBtn')).toBeHidden();
  546 |   await expect(studio.locator('#clipList')).toBeEmpty();
  547 |   await studio.locator('#startBtn').click();
> 548 |   await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.script)).toBe('Teacher-approved source walkthrough.');
      |                                                                                           ^ Error: expect(received).toBe(expected) // Object.is equality
  549 |   await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.pauseAfter)).toBe(1);
  550 | 
  551 |   await expect(studio.locator('#clipList')).toContainText('Regenerate', { timeout: 20000 });
  552 |   await expect(studio.getByLabel('text for caption 1')).toHaveValue('Teacher-approved source walkthrough.');
  553 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  554 |   await expect(studio.locator('#demoQualityCard')).toBeVisible();
  555 |   await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  556 |   await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  557 |   await expect.poll(() => page.evaluate(() => (window as any).cleanupSeen)).toBe(true);
  558 | 
  559 |   await studio.locator('#demoNarrRetryEditBtn').click();
  560 |   await expect(studio.locator('#demoNarrCancelEditBtn')).toBeVisible();
  561 |   await studio.locator('#demoNarrCancelEditBtn').click();
  562 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  563 |   await expect(studio.locator('#demoQualityCard')).toBeVisible();
  564 |   await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  565 |   await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  566 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(3);
  567 | 
  568 |   await studio.locator('#demoNarrRetryEditBtn').click();
  569 |   const regenerate = studio.locator('#clipList').getByRole('button', { name: /Regenerate narration clip/ });
  570 |   await expect(regenerate).toHaveCount(2, { timeout: 10000 });
  571 |   await expect(studio.locator('#clipList')).toContainText('Teacher-approved source walkthrough.');
  572 |   await expect(studio.locator('#demoNarrRetryEditBtn')).toBeHidden();
  573 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(4);
  574 | 
  575 |   await regenerate.first().click();
  576 |   await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(5);
  577 |   await expect(studio.locator('#aiNarrStatus')).toContainText('Narration line regenerated');
  578 |   await studio.locator('#demoQualityRerunBtn').click();
  579 |   await expect(studio.locator('#demoQualityStatus')).toContainText('0 failed');
  580 | });
  581 | 
```