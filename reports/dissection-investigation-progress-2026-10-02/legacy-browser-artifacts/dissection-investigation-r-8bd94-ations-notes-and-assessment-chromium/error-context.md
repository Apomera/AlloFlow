# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-investigation-response-clarity.tmp.spec.ts >> beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment
- Location: tests\e2e\dissection-investigation-response-clarity.tmp.spec.ts:309:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.diss-layer-review__input-badge')
Expected: "Supported technique"
Error: strict mode violation: locator('.diss-layer-review__input-badge') resolved to 2 elements:
    1) <span data-input-kind="supported" class="diss-layer-review__input-badge">Supported technique</span> aka locator('#diss-layer-review-response').getByText('Supported technique')
    2) <span data-input-kind="supported" class="diss-layer-review__input-badge">Supported technique</span> aka getByText('Supported technique').nth(1)

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('.diss-layer-review__input-badge')

```

# Test source

```ts
  233 |     const ctx = (window as any).__ctx, d = ctx.toolData.dissection;
  234 |     ctx.updateMulti('dissection', { activeLayer: 'muscle', revealedLayers: { skin: true }, _procedureReviewSelection: selection, procedureByLayer: { ...d.procedureByLayer, muscle: { ...procedure, actionLog: procedure.actionLog.slice(0, 2) } } });
  235 |   }, { selection: savedSelection, procedure: { tissueState: tissue, ...recorded } });
  236 |   await expect(page.locator('.diss-layer-review__selection')).toHaveText('Latest action: Orientation check 2');
  237 |   await expect(page.locator('#diss-procedure-record-1')).toHaveAttribute('aria-pressed', 'true');
  238 |   await expect(page.locator('.diss-layer-review .diss-procedure__timeline-entry[aria-pressed="true"]')).toHaveCount(1);
  239 | });
  240 | 
  241 | test('high trauma directs review to tissue condition before hydration advice', async ({ page }) => {
  242 |   await mount(page, { selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2 }, 390, 390,
  243 |     { ...recorded, tissueState: { ...tissue, moisture: 30, trauma: 65 }, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
  244 |   const before = await evidence(page);
  245 |   await expect(page.locator('.diss-layer-review__next')).toContainText('Trauma is 65/100.');
  246 |   await page.locator('.diss-layer-review__next').getByRole('button', { name: 'Review tissue condition', exact: true }).click();
  247 |   await expect(page.locator('#diss-field-monitor-summary')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  248 | });
  249 | 
  250 | for (const { name, state, procedure, label, target } of [
  251 |   { name: 'view', state: { anatomicalView: 'dorsal' }, procedure: {}, label: 'Check view', target: '#diss-view-cycle' },
  252 |   { name: 'optics', state: { lensFocusDepth: 'deep', lensMagnification: 6 }, procedure: {}, label: 'Adjust optics', target: '#diss-view-tools' },
  253 |   { name: 'dry tissue', state: {}, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review Dropper', target: '#diss-instrument-dropper' },
  254 |   { name: 'restricted recovery', state: { workspaceMode: 'advanced', procedureScenario: 'restricted-tray' }, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review tissue condition', target: '#diss-field-monitor-summary' },
  255 |   { name: 'calibration', state: { activeInstrument: 'scalpel', toolCalibration: { bladeAngle: 70 } }, procedure: {}, label: 'Adjust calibration', target: '#diss-calibration-range' },
  256 | ]) {
  257 |   test(`current ${name} guidance focuses a usable control without changing the setup`, async ({ page }) => {
  258 |     await mount(page, { ...state, selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2, ...state }, 390, 390,
  259 |       { ...recorded, ...procedure, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
  260 |     const before = await evidence(page);
  261 |     const shortcut = page.locator('.diss-layer-review__next').getByRole('button', { name: label, exact: true });
  262 |     await expect(shortcut).toBeVisible(); await shortcut.click();
  263 |     await expect(page.locator(target)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  264 |   });
  265 | }
  266 | 
  267 | test('completion still requires the final explanation', async ({ page }) => {
  268 |   const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: action !== 'probe' }]));
  269 |   await mount(page, {}, 390, 390, { ...recorded, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .4, y: .3 }, { x: .6, y: .7 }], probed: true, learningChecks: checks });
  270 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  271 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 protocol actions complete. 5 of 6 actions have verified');
  272 |   await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
  273 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures');
  274 |   const before = await evidence(page); await page.getByRole('button', { name: 'Review next action', exact: true }).click();
  275 |   await expect(page.locator('#diss-next-action-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  276 | });
  277 | 
  278 | for (const guided of [false, true]) {
  279 |   test(`${guided ? 'guided observation' : 'study tools'} review directs focus to an available destination`, async ({ page }) => {
  280 |     await mount(page, guided ? { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin'], guidedObservationPending: 'ventral_skin' } : { toolbarStudyOpen: true });
  281 |     const before = await evidence(page);
  282 |     await page.locator('.diss-layer-review__next').getByRole('button').click();
  283 |     await expect(page.locator(guided ? '#diss-guided-observation-check' : '#diss-route-explore')).toBeFocused();
  284 |     expect(await evidence(page)).toEqual(before);
  285 |   });
  286 | }
  287 | 
  288 | test('replaying an older stroke uses its saved contact rather than a later stroke path', async ({ page }) => {
  289 |   await mount(page, { instrumentVisuals: true, showProcedureDebrief: true }, 1180, 1180, {
  290 |     ...recorded, incisionStarted: true, incisionPath: [{ x: .45, y: .3 }, { x: .45, y: .8 }],
  291 |     actionLog: [{ ...actions[0], action: 'scalpel', label: 'Earlier incision', point: { x: .51, y: .6 } }, { ...actions[1], action: 'scalpel', label: 'Later incision', point: { x: .45, y: .8 } }],
  292 |   });
  293 |   const before = await evidence(page);
  294 |   await page.locator('.diss-layer-review .diss-procedure__timeline-entry').first().click();
  295 |   await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  296 |   const pulse = await page.locator('#diss-canvas').evaluate((canvas: any) => canvas._toolContactPulse);
  297 |   expect(pulse.x).toBe(.51); expect(pulse.y).toBe(.6); expect(pulse.tool).toBe('scalpel'); expect(pulse.replayPath).toEqual([]);
  298 |   expect(await evidence(page)).toEqual(before);
  299 | });
  300 | 
  301 | for (const practical of [false, true]) {
  302 |   test(`${practical ? 'timed practical' : 'quiz'} conceals reviews and preparation shortcuts`, async ({ page }) => {
  303 |     await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], showProcedureDebrief: true, techniquePanelOpen: true });
  304 |     if (practical) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
  305 |     await expect(page.locator('#diss-layer-review')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer', exact: true })).toHaveCount(0);
  306 |   });
  307 | }
  308 | 
  309 | test('beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment', async ({ page }) => {
  310 |   test.setTimeout(240000);
  311 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  312 |   await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0, workspaceMode: 'essentials' }, 1180, 1180, {});
  313 |   const planChoices = [0, 1, 2, 0, 1, 2]; const reflections = [1, 0, 0, 1, 2, 0];
  314 |   const actionNames = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  315 |   for (let i = 0; i < actionNames.length; i++) {
  316 |     const checkpoint = page.locator('#diss-learning-checkpoint');
  317 |     await expect(checkpoint).toHaveAttribute('data-learning-action', actionNames[i]); await expect(checkpoint).toHaveAttribute('data-phase', 'predict');
  318 |     await checkpoint.locator('.diss-learning-check__option').nth(planChoices[i]).click(); await expect(checkpoint).toHaveAttribute('data-phase', 'perform');
  319 |     await checkpoint.getByRole('button', { name: /^Prepare / }).click();
  320 |     const tool = actionNames[i] === 'inspect' ? 'probe' : actionNames[i];
  321 |     await expect(page.locator(`#diss-instrument-${tool}`)).toBeFocused(); await page.locator(`#diss-instrument-${tool}`).click();
  322 |     const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next');
  323 |     await expect(equivalent).toBeEnabled(); await equivalent.click();
  324 |     if (tool === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await equivalent.click(); }
  325 |     await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
  326 |     await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  327 |     await checkpoint.locator('.diss-learning-check__option').nth(reflections[i]).click();
  328 |   }
  329 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures');
  330 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  331 |   const physical = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin);
  332 |   expect(physical.actionLog.length).toBe(7); expect(physical.actionLog.every((a: any) => a.assistance === 'motor-neutral')).toBe(true);
> 333 |   await expect(page.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
      |                                                                 ^ Error: expect(locator).toHaveText(expected) failed
  334 |   await expect(page.locator('#diss-layer-review')).toContainText('The motor-neutral control performed this action.');
  335 |   await openHistory(page);
  336 |   await expect(page.locator('.diss-layer-review__history-input')).toHaveCount(7);
  337 |   await expect(page.locator('.diss-layer-review__history-input').last()).toHaveText('Supported technique');
  338 |   await page.locator('#diss-layer-review').screenshot({ path: `${out}/journey-supported-layer.png`, style: captureStyle });
  339 |   await page.locator('#diss-canvas').focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  340 |   const note = page.locator('.diss-evidence-note'); await expect(note).toBeVisible();
  341 |   await note.fill('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  342 |   await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check();
  343 |   const saved = await evidence(page); expect(Object.values(saved.notes)).toContain('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  344 |   await page.getByRole('button', { name: 'Practice assessment', exact: true }).click();
  345 |   await expect(page.locator('#diss-quiz-panel')).toBeVisible(); await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  346 |   await page.locator('#diss-quiz-panel .diss-quiz-option').first().click();
  347 |   const next = page.locator('#diss-quiz-panel').getByRole('button', { name: /^Next Question/ });
  348 |   if (!(await next.isVisible())) await page.locator('#diss-quiz-panel').getByRole('button', { name: /Show answer|Reveal answer/ }).click();
  349 |   await next.click(); await expect(page.locator('#diss-quiz-panel')).toBeFocused();
  350 |   const final = await evidence(page); expect(final.notes).toEqual(saved.notes); expect(final.confidence).toEqual(saved.confidence); expect(final.procedures).toEqual(saved.procedures);
  351 |   await page.locator('#diss-quiz-panel').screenshot({ path: `${out}/journey-assessment.png`, style: captureStyle });
  352 |   await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2)); expect(errors).toEqual([]);
  353 | });
  354 | 
```