# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-layer-review.spec.ts >> beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment
- Location: tests\e2e\dissection-layer-review.spec.ts:157:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Assess understanding/ })

```

# Test source

```ts
  86  |   for (const [key, index] of [['End', 7], ['ArrowDown', 0], ['ArrowRight', 1], ['ArrowUp', 0], ['ArrowLeft', 7], ['Home', 0]] as const) {
  87  |     await page.keyboard.press(key); await expect(entries.nth(index)).toBeFocused();
  88  |     await expect(entries.last()).toHaveAttribute('aria-pressed', 'true'); expect(await evidence(page)).toEqual(before);
  89  |   }
  90  |   await page.keyboard.press('Enter');
  91  |   await expect(entries.first()).toHaveAttribute('aria-pressed', 'true'); await expect(entries.last()).toHaveAttribute('aria-pressed', 'false');
  92  |   await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Orientation check 1');
  93  |   await expect(page.locator('.diss-layer-review__delta').first()).toContainText('70 → 75');
  94  |   await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  95  |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message)).toContain('Selected response replay started');
  96  |   expect(await evidence(page)).toEqual(before);
  97  |   await page.locator('#diss-layer-review').screenshot({ path: `${out}/selected-response.png`, style: captureStyle });
  98  | });
  99  | 
  100 | test('review is requested explicitly before work and never invents missing snapshot values', async ({ page }) => {
  101 |   await mount(page, { techniquePanelOpen: true }, 390, 390, {});
  102 |   await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  103 |   await page.getByRole('button', { name: 'Review layer', exact: true }).click();
  104 |   await expect(page.locator('#diss-layer-review-title')).toBeFocused();
  105 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'In progress');
  106 |   await expect(page.locator('#diss-layer-review')).toContainText('0 of 6 protocol actions complete.');
  107 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  108 |   await expect(page.locator('#diss-layer-review')).not.toContainText('Strength:');
  109 |   await harness.unmount(page);
  110 |   await mount(page, {}, 390, 390, { ...recorded, actionLog: [{ ...actions[0], tissueAfter: { clarity: 75 } }] });
  111 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  112 |   await expect(page.locator('#diss-layer-review')).toContainText('No complete before-and-after tissue data was saved for this action.');
  113 | });
  114 | 
  115 | test('pending explanation takes priority and the shortcut only focuses the checkpoint', async ({ page }) => {
  116 |   await mount(page, { anatomicalView: 'dorsal' }); const before = await evidence(page);
  117 |   await page.getByRole('button', { name: 'Explain the response', exact: true }).click();
  118 |   await expect(page.locator('#diss-learning-check-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  119 | });
  120 | 
  121 | for (const { name, state, procedure, label, target } of [
  122 |   { name: 'view', state: { anatomicalView: 'dorsal' }, procedure: {}, label: 'Check view', target: '#diss-view-cycle' },
  123 |   { name: 'optics', state: { lensFocusDepth: 'deep', lensMagnification: 6 }, procedure: {}, label: 'Adjust optics', target: '#diss-view-tools' },
  124 |   { name: 'dry tissue', state: {}, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review Dropper', target: '#diss-instrument-dropper' },
  125 |   { name: 'restricted recovery', state: { procedureScenario: 'restricted-tray' }, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review tissue condition', target: '#diss-field-monitor-summary' },
  126 |   { name: 'calibration', state: { activeInstrument: 'scalpel', toolCalibration: { bladeAngle: 70 } }, procedure: {}, label: 'Adjust calibration', target: '#diss-calibration-range' },
  127 | ]) {
  128 |   test(`current ${name} guidance focuses a usable control without changing the setup`, async ({ page }) => {
  129 |     await mount(page, { ...state, selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2, ...state }, 390, 390,
  130 |       { ...recorded, ...procedure, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
  131 |     const before = await evidence(page);
  132 |     const shortcut = page.locator('.diss-layer-review__next').getByRole('button', { name: label, exact: true });
  133 |     await expect(shortcut).toBeVisible(); await shortcut.click();
  134 |     await expect(page.locator(target)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  135 |   });
  136 | }
  137 | 
  138 | test('completion still requires the final explanation', async ({ page }) => {
  139 |   const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: action !== 'probe' }]));
  140 |   await mount(page, {}, 390, 390, { ...recorded, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .4, y: .3 }, { x: .6, y: .7 }], probed: true, learningChecks: checks });
  141 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  142 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 protocol actions complete. 5 of 6 actions have verified');
  143 |   await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
  144 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  145 |   const before = await evidence(page); await page.getByRole('button', { name: 'Review next action', exact: true }).click();
  146 |   await expect(page.locator('#diss-next-action-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  147 | });
  148 | 
  149 | for (const practical of [false, true]) {
  150 |   test(`${practical ? 'timed practical' : 'quiz'} conceals reviews and preparation shortcuts`, async ({ page }) => {
  151 |     await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], showProcedureDebrief: true, techniquePanelOpen: true });
  152 |     if (practical) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
  153 |     await expect(page.locator('#diss-layer-review')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer', exact: true })).toHaveCount(0);
  154 |   });
  155 | }
  156 | 
  157 | test('beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment', async ({ page }) => {
  158 |   test.setTimeout(240000);
  159 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  160 |   await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0, workspaceMode: 'essentials' }, 1180, 1180, {});
  161 |   const planChoices = [0, 1, 2, 0, 1, 2]; const reflections = [1, 0, 0, 1, 2, 0];
  162 |   const actionNames = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  163 |   for (let i = 0; i < actionNames.length; i++) {
  164 |     const checkpoint = page.locator('#diss-learning-checkpoint');
  165 |     await expect(checkpoint).toHaveAttribute('data-learning-action', actionNames[i]); await expect(checkpoint).toHaveAttribute('data-phase', 'predict');
  166 |     await checkpoint.locator('.diss-learning-check__option').nth(planChoices[i]).click(); await expect(checkpoint).toHaveAttribute('data-phase', 'perform');
  167 |     await checkpoint.getByRole('button', { name: /^Prepare / }).click();
  168 |     const tool = actionNames[i] === 'inspect' ? 'probe' : actionNames[i];
  169 |     await expect(page.locator(`#diss-instrument-${tool}`)).toBeFocused(); await page.locator(`#diss-instrument-${tool}`).click();
  170 |     const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next');
  171 |     await expect(equivalent).toBeEnabled(); await equivalent.click();
  172 |     if (tool === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await equivalent.click(); }
  173 |     await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
  174 |     await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  175 |     await checkpoint.locator('.diss-learning-check__option').nth(reflections[i]).click();
  176 |   }
  177 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  178 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  179 |   const physical = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin);
  180 |   expect(physical.actionLog.length).toBe(7); expect(physical.actionLog.every((a: any) => a.assistance === 'motor-neutral')).toBe(true);
  181 |   await page.locator('#diss-canvas').focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  182 |   const note = page.locator('.diss-evidence-note'); await expect(note).toBeVisible();
  183 |   await note.fill('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  184 |   await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check();
  185 |   const saved = await evidence(page); expect(Object.values(saved.notes)).toContain('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
> 186 |   await page.getByRole('button', { name: /^Assess understanding/ }).click();
      |                                                                     ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  187 |   await expect(page.locator('#diss-quiz-panel')).toBeVisible(); await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  188 |   await page.locator('#diss-quiz-panel .diss-quiz-option').first().click();
  189 |   const next = page.locator('#diss-quiz-panel').getByRole('button', { name: /^Next Question/ });
  190 |   if (!(await next.isVisible())) await page.locator('#diss-quiz-panel').getByRole('button', { name: /Show answer|Reveal answer/ }).click();
  191 |   await next.click(); await expect(page.locator('#diss-quiz-panel')).toBeFocused();
  192 |   const final = await evidence(page); expect(final.notes).toEqual(saved.notes); expect(final.confidence).toEqual(saved.confidence); expect(final.procedures).toEqual(saved.procedures);
  193 |   await page.locator('#diss-quiz-panel').screenshot({ path: `${out}/journey-assessment.png`, style: captureStyle });
  194 |   await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2)); expect(errors).toEqual([]);
  195 | });
  196 | 
```