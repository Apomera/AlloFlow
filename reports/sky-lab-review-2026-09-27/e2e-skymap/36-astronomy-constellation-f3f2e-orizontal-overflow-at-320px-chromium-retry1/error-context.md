# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 36-astronomy-constellations-skymap.spec.ts >> Astronomy constellation and Sky Map visuals - real Chromium >> Sky Map controls and SVG reflow without horizontal overflow at 320px
- Location: tests\e2e\36-astronomy-constellations-skymap.spec.ts:442:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('group', { name: 'Sky map layers' }).getByRole('button')
Expected: 5
Received: 6
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for getByRole('group', { name: 'Sky map layers' }).getByRole('button')
    31 × locator resolved to 6 elements
       - unexpected value "6"

```

# Test source

```ts
  347 |     await expect(darkness).toHaveValue('5');
  348 |     await expect(darkness.locator('option')).toHaveCount(9);
  349 |     await darkness.selectOption('9');
  350 |     await expect(darkness).toHaveValue('9');
  351 |     await expect(darknessStatus).toHaveAttribute('data-bortle-class', '9');
  352 |     await expect(diagram).toHaveAttribute('data-bortle-class', '9');
  353 |     await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
  354 |     const selectedValue = await selectVisibleSkyTarget(page);
  355 |     expect(selectedValue).not.toBe('');
  356 |     await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
  357 | 
  358 |     await page.locator('#astronomy-tab-observe').click();
  359 |     const observeNine = page.getByRole('button', { name: /^Bortle class 9:/ });
  360 |     await expect(observeNine).toHaveAttribute('aria-pressed', 'true');
  361 |     const observeOne = page.getByRole('button', { name: /^Bortle class 1:/ });
  362 |     await observeOne.click();
  363 |     await expect(observeOne).toHaveAttribute('aria-pressed', 'true');
  364 | 
  365 |     await page.locator('#astronomy-tab-skymap').click();
  366 |     await expect(page.locator('#astronomy-sky-darkness')).toHaveValue('1');
  367 |     await expect(page.locator('#astronomy-sky-darkness-status')).toHaveAttribute('data-bortle-class', '1');
  368 |     await expect(page.locator('#astronomy-sky-map-diagram')).toHaveAttribute('data-bortle-class', '1');
  369 |     await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
  370 | 
  371 |     await expectNoDocumentOverflow(page);
  372 |     await expectNoRuntimeIssues(page, issues);
  373 |   });
  374 |   test('Seasons Sun path updates for the shared observer and stays contained at 320px', async ({ page }) => {
  375 |     await page.setViewportSize({ width: 320, height: 1100 });
  376 |     const issues = collectBrowserIssues(page);
  377 |     await mount(page, 'seasons');
  378 | 
  379 |     const observer = page.locator('#astronomy-season-observer');
  380 |     const figure = page.locator('#astronomy-season-sun-path');
  381 |     const status = page.locator('#astronomy-season-sun-status');
  382 |     const conciseStatus = page.locator('#astronomy-season-status');
  383 |     await expect(observer).toHaveValue('portland');
  384 |     await expect(observer.locator('option')).toHaveCount(6);
  385 |     await expect(figure).toHaveAttribute('role', 'img');
  386 |     await expect(figure).toHaveAttribute('viewBox', '0 0 360 190');
  387 |     await expect(figure).toHaveAttribute('data-solar-state', 'normal');
  388 |     await expect(figure).toHaveAttribute('data-date', /^\d{4}-06-15$/);
  389 |     await expect(figure.locator('[data-solar-sample]')).toHaveCount(97);
  390 |     await expect(figure.locator('[data-solar-axis="x"]')).toHaveCount(1);
  391 |     await expect(figure.locator('[data-solar-axis="y"]')).toHaveCount(1);
  392 |     await expect(figure.locator('[data-solar-horizon]')).toHaveCount(1);
  393 |     await expect(figure.locator('[data-solar-altitude-path]')).toHaveCount(1);
  394 |     await expect(figure.locator('[data-solar-daylight-fill]')).toHaveCount(1);
  395 |     await expect(figure.locator('[data-solar-noon]')).toHaveCount(1);
  396 |     await expect(figure.locator('[data-solar-sunrise]')).toHaveCount(1);
  397 |     await expect(figure.locator('[data-solar-sunset]')).toHaveCount(1);
  398 |     await expect(status).toContainText(/local solar time/i);
  399 |     await expect(status).toContainText(/geometric/i);
  400 |     await expect(status).not.toHaveAttribute('role', /.+/);
  401 |     await expect(status).not.toHaveAttribute('aria-live', /.+/);
  402 |     await expect(observer).toHaveAttribute('aria-describedby', /\bastronomy-season-sun-status\b/);
  403 |     await expect(conciseStatus).toHaveAttribute('role', 'status');
  404 |     await expect(conciseStatus).toHaveAttribute('aria-live', 'polite');
  405 |     await expect(conciseStatus).toHaveAttribute('aria-atomic', 'true');
  406 |     await expect(conciseStatus).toContainText(/meteorological/i);
  407 |     await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
  408 | 
  409 |     const portlandDaylight = Number(await figure.getAttribute('data-daylight-hours'));
  410 |     const portlandNoon = Number(await figure.getAttribute('data-noon-altitude'));
  411 |     expect(Number.isFinite(portlandDaylight)).toBe(true);
  412 |     expect(Number.isFinite(portlandNoon)).toBe(true);
  413 | 
  414 |     await observer.selectOption('sydney');
  415 |     await expect(observer).toHaveValue('sydney');
  416 |     await expect(status).toContainText(/Sydney/i);
  417 |     await expect(figure).toHaveAttribute('data-date', /^\d{4}-06-15$/);
  418 |     const sydneyDaylight = Number(await figure.getAttribute('data-daylight-hours'));
  419 |     const sydneyNoon = Number(await figure.getAttribute('data-noon-altitude'));
  420 |     expect(sydneyDaylight).toBeLessThan(portlandDaylight);
  421 |     expect(sydneyNoon).toBeLessThan(portlandNoon);
  422 | 
  423 |     const geometry = await page.evaluate(() => {
  424 |       const bounds = (selector: string) => {
  425 |         const r = document.querySelector(selector)!.getBoundingClientRect();
  426 |         return { left: r.left, right: r.right, width: r.width };
  427 |       };
  428 |       return {
  429 |         observer: bounds('#astronomy-season-observer'),
  430 |         figure: bounds('#astronomy-season-sun-path'),
  431 |         status: bounds('#astronomy-season-sun-status'),
  432 |       };
  433 |     });
  434 |     for (const box of Object.values(geometry)) {
  435 |       expect(box.left).toBeGreaterThanOrEqual(-0.5);
  436 |       expect(box.right).toBeLessThanOrEqual(320.5);
  437 |       expect(box.width).toBeGreaterThan(0);
  438 |     }
  439 |     await expectNoDocumentOverflow(page);
  440 |     await expectNoRuntimeIssues(page, issues);
  441 |   });
  442 |   test('Sky Map controls and SVG reflow without horizontal overflow at 320px', async ({ page }) => {
  443 |     await page.setViewportSize({ width: 320, height: 1100 });
  444 |     const issues = collectBrowserIssues(page);
  445 |     await mount(page, 'skymap');
  446 | 
> 447 |     await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
      |                                                                                           ^ Error: expect(locator).toHaveCount(expected) failed
  448 |     await expect(page.locator('#astronomy-sky-darkness')).toHaveCount(1);
  449 |     await expect(page.locator('#astronomy-sky-darkness-status')).toHaveCount(1);
  450 |     await selectVisibleSkyTarget(page);
  451 |     const observingWindow = page.locator('#astronomy-sky-target-timeline [data-sky-observing-window]');
  452 |     await expect(observingWindow).toHaveCount(1);
  453 |     await expect(observingWindow).toHaveAttribute('data-state', /^(available|none|not-applicable)$/);
  454 |     await expect(observingWindow).toHaveAttribute('data-kind', /^(sun|moon|planet|star)$/);
  455 |     await expect(observingWindow.locator('[data-sky-observing-window-rail]')).toHaveCount(1);
  456 |     await expect(observingWindow.locator('[data-sky-observing-window-summary]')).toBeVisible();
  457 |     await expect(observingWindow.locator('[data-sky-observing-window-criteria]')).toBeVisible();
  458 |     await expect(observingWindow.locator('[data-score], [data-quality-score], [data-sky-quality-score]')).toHaveCount(0);
  459 |     const geometry = await page.evaluate(() => {
  460 |       const bounds = (selector: string) => {
  461 |         const r = document.querySelector(selector)!.getBoundingClientRect();
  462 |         return { left: r.left, right: r.right, width: r.width };
  463 |       };
  464 |       return {
  465 |         controls: bounds('#astronomy-sky-controls'),
  466 |         layout: bounds('#astronomy-sky-layout'),
  467 |         diagram: bounds('#astronomy-sky-map-diagram'),
  468 |         target: bounds('#astronomy-sky-target'),
  469 |         darkness: bounds('#astronomy-sky-darkness'),
  470 |         darknessStatus: bounds('#astronomy-sky-darkness-status'),
  471 |         targetDetail: bounds('#astronomy-sky-target-detail'),
  472 |         targetTimeline: bounds('#astronomy-sky-target-timeline'),
  473 |         targetTimelineFigure: bounds('#astronomy-sky-target-timeline [data-sky-target-timeline]'),
  474 |         targetTrack: bounds('#astronomy-sky-map-diagram [data-sky-target-track]'),
  475 |         observingWindow: bounds('#astronomy-sky-target-timeline [data-sky-observing-window]'),
  476 |         observingWindowRail: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-rail]'),
  477 |         observingWindowSummary: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-summary]'),
  478 |         observingWindowCriteria: bounds('#astronomy-sky-target-timeline [data-sky-observing-window-criteria]'),
  479 |       };
  480 |     });
  481 |     for (const box of Object.values(geometry)) {
  482 |       expect(box.left).toBeGreaterThanOrEqual(-0.5);
  483 |       expect(box.right).toBeLessThanOrEqual(320.5);
  484 |       expect(box.width).toBeGreaterThan(0);
  485 |     }
  486 |     await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
  487 |     await expectNoDocumentOverflow(page);
  488 |     await expectNoRuntimeIssues(page, issues);
  489 |   });
  490 | 
  491 | 
  492 | });
  493 | 
```