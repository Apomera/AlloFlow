# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-entry-guidance.spec.ts >> finite forged v2 evidence and unsupported terminal clocks restart without a completion or reward
- Location: tests\e2e\moon-mission-entry-guidance.spec.ts:264:5

# Error details

```
Error: expect(received).toBeNull()

Received: {"angle": -6.5, "completed": true, "downrange": 2134924.4094417593, "duration": 812.4629482924938, "heatLoad": 157703341.19783926, "modelVersion": 2, "outcome": "nominal", "peakG": 7.2, "peakHeatFlux": 1698721.158181942, "plan": {"bank": 0, "mode": "guided", "version": 2}, "splashSpeed": 9.322531902824112, "terminal": "splash"}
```

# Test source

```ts
  178 |     const b = node.getBoundingClientRect(); return { height: b.height, left: b.left, right: b.right };
  179 |   }));
  180 |   expect(controls.length).toBeGreaterThanOrEqual(4);
  181 |   for (const b of controls) {
  182 |     expect(b.height).toBeGreaterThanOrEqual(44);
  183 |     expect(b.left).toBeGreaterThanOrEqual(0);
  184 |     expect(b.right).toBeLessThanOrEqual(320);
  185 |   }
  186 |   expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  187 |   const flightAxe = await axe(page, '[data-entry-workspace]');
  188 |   expect(flightAxe).toEqual([]);
  189 |   await capture(page, info, 'guidance-flight-phone-320');
  190 |   await writeFile(join(REPORT, 'guidance-phone-axe.json'), JSON.stringify({ planner: plannerAxe, flight: flightAxe }, null, 2));
  191 | });
  192 | 
  193 | test('guided results retain the flown plan through scrub, reload, report and archive with rewards paid once', async ({ page }, info) => {
  194 |   const errors: string[] = [];
  195 |   page.on('pageerror', error => errors.push(error.message));
  196 |   await mount(page);
  197 |   await page.locator('[data-entry-result]').click();
  198 |   await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  199 |   const done = await saved(page);
  200 |   expect(done.entryOutcome).toMatchObject({ modelVersion: 2, plan: guided, completed: true, terminal: 'splash', outcome: 'nominal' });
  201 |   expect(done.entryAttempts).toHaveLength(1);
  202 |   expect(done.missionXP).toBe(25);
  203 |   await page.locator('[data-entry-result]').click();
  204 |   const p = await predicted(page, guided), time = await seek(page, p.summary.peakHeatTime);
  205 |   const reviewed = await saved(page);
  206 |   expect(reviewed.entryOutcome).toEqual(done.entryOutcome);
  207 |   expect(reviewed.missionXP).toBe(25);
  208 |   // Planner settings may change in a saved document; the receipt continues to
  209 |   // identify the controller actually flown, independently of that new selection.
  210 |   reviewed.entryPlan = bank(180);
  211 |   await mount(page, { moonMission: reviewed });
  212 |   await expect.poll(async () => (await telemetry(page)).time).toBeCloseTo(time, 1);
  213 |   await expect(page.locator('[data-entry-run-plan]')).toContainText('Guided lift');
  214 |   await expect(page.locator('[data-entry-trajectory-plan]')).toContainText('Guided lift');
  215 |   const restored = await saved(page);
  216 |   expect(restored.entryPlan).toEqual(bank(180));
  217 |   expect(restored.entryRun.plan).toEqual(guided);
  218 |   expect(restored.entryOutcome).toEqual(done.entryOutcome);
  219 |   expect(restored.entryAttempts).toEqual(done.entryAttempts);
  220 |   expect(restored.missionXP).toBe(25);
  221 |   await page.locator('[data-entry-result]').click();
  222 |   await page.locator('[data-entry-complete]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  223 |   await expect.poll(async () => (await saved(page)).missionPhase).toBe(10);
  224 |   expect((await saved(page)).missionXP).toBe(75);
  225 |   const report = await page.locator('[data-moonmission-report-text]').inputValue();
  226 |   expect(report).toContain('Guided lift');
  227 |   expect(report).not.toContain('Fixed bank 180°');
  228 |   await capture(page, info, 'guidance-flown-plan-debrief');
  229 |   await page.getByRole('button', { name: /Fly Another Mission/ }).click();
  230 |   const archived = await saved(page);
  231 |   expect(archived.flightHistory).toHaveLength(1);
  232 |   expect(archived.flightHistory[0].entry).toEqual(done.entryOutcome);
  233 |   const archiveReport = await page.evaluate(summary => (window as any).MoonMissionPure.flightReport(summary), archived.flightHistory[0]);
  234 |   expect(archiveReport).toContain('Guided lift');
  235 |   expect(archiveReport).not.toContain('Fixed bank 180°');
  236 |   expect(errors).toEqual([]);
  237 | });
  238 | 
  239 | test('bank zero skip-out shows an upward measured path at interface and cannot unlock splashdown', async ({ page }, info) => {
  240 |   await mount(page, seed({ entryPlan: bank(0), entryRun: run(bank(0)) }));
  241 |   const p = await predicted(page, bank(0));
  242 |   expect(p.events.drogue).toBeNull();
  243 |   expect(p.events.main).toBeNull();
  244 |   expect(p.events.splash).toBeNull();
  245 |   await page.locator('[data-entry-result]').click();
  246 |   await expect(page.locator('[data-entry-terminal="skip"]')).toBeVisible();
  247 |   await expect(page.locator('[data-entry-canvas]')).toHaveAttribute('data-entry-stage', 'skip');
  248 |   const live = await telemetry(page);
  249 |   expect(live.altitude).toBeCloseTo(122000, 3);
  250 |   expect(live.gamma).toBeGreaterThan(0);
  251 |   expect(live.verticalSpeed).toBeGreaterThan(0);
  252 |   await expect(page.locator('[data-entry-trajectory-reading]')).toContainText('Skip-out · Ascending');
  253 |   await expect(page.locator('[data-entry-trajectory-event="drogue"], [data-entry-trajectory-event="main"], [data-entry-trajectory-event="splash"]')).toHaveCount(0);
  254 |   await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  255 |   const done = await saved(page);
  256 |   expect(done.entryOutcome).toMatchObject({ modelVersion: 2, plan: bank(0), terminal: 'skip', splashSpeed: null });
  257 |   expect(done.missionXP).toBe(10);
  258 |   await page.locator('[data-entry-result]').click();
  259 |   expect((await saved(page)).missionXP).toBe(10);
  260 |   expect((await saved(page)).entryAttempts).toHaveLength(1);
  261 |   await capture(page, info, 'guidance-bank-zero-skip');
  262 | });
  263 | 
  264 | test('finite forged v2 evidence and unsupported terminal clocks restart without a completion or reward', async ({ page }, info) => {
  265 |   await mount(page);
  266 |   const valid = await page.evaluate(() => {
  267 |     const P = (window as any).MoonMissionPure, profile = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'guided' }) });
  268 |     return { result: P.entryRecordedResult(profile), duration: profile.summary.duration };
  269 |   });
  270 |   for (const patch of [
  271 |     { entryRun: run(guided, { time: valid.duration, recorded: true, recovery: 5 }), entryOutcome: { ...valid.result, duration: valid.duration + 1 } },
  272 |     { entryRun: run(guided, { time: valid.duration, recorded: false, recovery: 5 }), entryOutcome: valid.result },
  273 |     { entryRun: run(guided, { time: valid.duration, recorded: 'true', recovery: 5 }), entryOutcome: valid.result },
  274 |     { entryRun: run(guided, { time: valid.duration + 100, recorded: false, recovery: 5 }), entryOutcome: null },
  275 |   ]) {
  276 |     await mount(page, seed(patch));
  277 |     await expect.poll(async () => (await telemetry(page)).time).toBe(0);
> 278 |     await expect(page.locator('[data-entry-complete]')).toBeDisabled();
      |                                ^ Error: expect(received).toBeNull()
  279 |     const state = await saved(page);
  280 |     expect(state.entryOutcome).toBeNull();
  281 |     expect(state.entryRun).toMatchObject(run(guided));
  282 |     expect(state.missionXP).toBe(0);
  283 |     expect(state.entryAttempts || []).toEqual([]);
  284 |     expect(state.entryCompletionAwarded === true).toBe(false);
  285 |     await expect(page.locator('[data-entry-instruments]')).toContainText('could not be verified');
  286 |   }
  287 |   await capture(page, info, 'guidance-rejected-terminal-clock');
  288 | });
  289 | 
```