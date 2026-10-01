# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 36-astronomy-constellations-skymap.spec.ts >> Astronomy constellation and Sky Map visuals - real Chromium >> Bortle preview stays synchronized between Sky Map and Observing
- Location: tests\e2e\36-astronomy-constellations-skymap.spec.ts:339:7

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
    33 × locator resolved to 6 elements
       - unexpected value "6"

```

# Test source

```ts
  253 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
  254 |       await button.click();
  255 |       await expect(button).toHaveAttribute('aria-pressed', 'false');
  256 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(0);
  257 |       await button.click();
  258 |       await expect(button).toHaveAttribute('aria-pressed', 'true');
  259 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
  260 |     }
  261 | 
  262 |     const target = page.getByLabel('Sky map target');
  263 |     const initialControlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
  264 |     expect(initialControlledIds).toContain('astronomy-sky-map-diagram');
  265 |     const selectedValue = await selectVisibleSkyTarget(page);
  266 |     expect(selectedValue).not.toBe('');
  267 |     const controlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
  268 |     expect(controlledIds).toEqual(expect.arrayContaining([
  269 |       'astronomy-sky-map-diagram', 'astronomy-sky-target-timeline',
  270 |     ]));
  271 |     await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
  272 |     await expect(page.locator('#astronomy-sky-target-status')).toContainText('highlighted:');
  273 |     await expect(page.locator('#astronomy-sky-map-diagram')).toContainText('TARGET');
  274 |     const targetDetail = page.locator('#astronomy-sky-target-detail');
  275 |     await expect(targetDetail).toBeVisible();
  276 |     await expect(targetDetail).toContainText('Altitude');
  277 |     await expect(targetDetail).toContainText('Next horizon event');
  278 |     await expect(targetDetail).toContainText('Highest in next 12 hours');
  279 |     const timeline = page.locator('#astronomy-sky-target-timeline');
  280 |     await expect(timeline).toBeVisible();
  281 |     await expect(timeline).toHaveAttribute('data-sky-target', selectedValue);
  282 |     const timelineFigure = timeline.locator('svg[data-sky-target-timeline]');
  283 |     await expect(timelineFigure).toHaveAttribute('role', 'img');
  284 |     await expect(timelineFigure).toHaveAttribute('data-duration-hours', '12');
  285 |     await expect(timelineFigure.locator('title')).toHaveCount(1);
  286 |     await expect(timelineFigure.locator('desc')).toHaveCount(1);
  287 |     await expect(timelineFigure.locator('[data-sky-twilight-bands] [data-twilight-band]')).not.toHaveCount(0);
  288 |     await expect(timelineFigure.locator('[data-sky-axis="x"]')).toHaveCount(1);
  289 |     await expect(timelineFigure.locator('[data-sky-axis="y"]')).toHaveCount(1);
  290 |     await expect(timelineFigure.locator('[data-sky-horizon]')).toHaveCount(1);
  291 |     await expect(timelineFigure.locator('[data-sky-altitude-path]')).toHaveCount(1);
  292 |     await expect(timelineFigure.locator('[data-sky-altitude-sample]')).not.toHaveCount(0);
  293 |     const diagram = page.locator('#astronomy-sky-map-diagram');
  294 |     await expect(diagram).toHaveAttribute('role', 'img');
  295 |     await expect(diagram).toHaveAttribute('aria-label', /north at top, east at left/i);
  296 |     await expect(diagram).toHaveAttribute('aria-label', /solid gold motion arc[^.]*next 12 hours/i);
  297 |     const targetTrack = diagram.locator('[data-sky-target-track]');
  298 |     await expect(targetTrack).toHaveCount(1);
  299 |     await expect(targetTrack).toHaveAttribute('data-sky-target', selectedValue);
  300 |     await expect(targetTrack).toHaveAttribute('clip-path', 'url(#astronomy-sky-dome-clip)');
  301 |     await expect(targetTrack.locator('[data-sky-target-track-segment]')).not.toHaveCount(0);
  302 |     const segmentCount = await targetTrack.locator('[data-sky-target-track-segment]').count();
  303 |     await expect(targetTrack).toHaveAttribute('data-segment-count', String(segmentCount));
  304 |     await expect(targetTrack).toHaveAttribute('data-visible-sample-count', /^\d+$/);
  305 |     expect(Number(await targetTrack.getAttribute('data-visible-sample-count'))).toBeGreaterThan(0);
  306 |     const segmentContracts = await targetTrack.locator('[data-sky-target-track-segment]').evaluateAll((segments) =>
  307 |       segments.map((segment) => ({
  308 |         d: segment.getAttribute('d') || '',
  309 |         markerEnd: segment.getAttribute('marker-end'),
  310 |         pointCount: Number(segment.getAttribute('data-point-count')),
  311 |       })));
  312 |     for (const segment of segmentContracts) {
  313 |       expect(segment.d).toMatch(/^M/i);
  314 |       expect(segment.d).not.toMatch(/NaN|Infinity|undefined/i);
  315 |       expect(segment.markerEnd).toBe('url(#astronomy-sky-target-track-arrow)');
  316 |       expect(segment.pointCount).toBeGreaterThan(1);
  317 |     }
  318 |     const waypointContracts = await targetTrack.locator('[data-sky-target-track-sample]').evaluateAll((samples) =>
  319 |       samples.map((sample) => ({
  320 |         hour: Number(sample.getAttribute('data-hour-offset')),
  321 |         altitude: Number(sample.getAttribute('data-altitude')),
  322 |         azimuth: Number(sample.getAttribute('data-azimuth')),
  323 |         x: Number(sample.getAttribute('cx')),
  324 |         y: Number(sample.getAttribute('cy')),
  325 |       })));
  326 |     for (const waypoint of waypointContracts) {
  327 |       expect([4, 8, 12]).toContain(waypoint.hour);
  328 |       expect([waypoint.altitude, waypoint.azimuth, waypoint.x, waypoint.y].every(Number.isFinite)).toBe(true);
  329 |       expect(Math.hypot(waypoint.x - 190, waypoint.y - 190)).toBeLessThanOrEqual(178.01);
  330 |     }
  331 |     await expect(page.locator('#astronomy-sky-map-help')).toContainText(/solid gold arc traces.*next 12 hours/i);
  332 |     await expect(page.locator('#astronomy-sky-focus-legend')).toContainText(/solid gold arc traces its next 12 hours/i);
  333 |     await expect(diagram).toBeVisible();
  334 | 
  335 |     await expectNoDocumentOverflow(page);
  336 |     await expectNoRuntimeIssues(page, issues);
  337 |   });
  338 | 
  339 |   test('Bortle preview stays synchronized between Sky Map and Observing', async ({ page }) => {
  340 |     await page.setViewportSize({ width: 1180, height: 1000 });
  341 |     const issues = collectBrowserIssues(page);
  342 |     await mount(page, 'skymap');
  343 | 
  344 |     const darkness = page.locator('#astronomy-sky-darkness');
  345 |     const darknessStatus = page.locator('#astronomy-sky-darkness-status');
  346 |     const diagram = page.locator('#astronomy-sky-map-diagram');
  347 |     await expect(darkness).toHaveValue('5');
  348 |     await expect(darkness.locator('option')).toHaveCount(9);
  349 |     await darkness.selectOption('9');
  350 |     await expect(darkness).toHaveValue('9');
  351 |     await expect(darknessStatus).toHaveAttribute('data-bortle-class', '9');
  352 |     await expect(diagram).toHaveAttribute('data-bortle-class', '9');
> 353 |     await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
      |                                                                                           ^ Error: expect(locator).toHaveCount(expected) failed
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
  447 |     await expect(page.getByRole('group', { name: 'Sky map layers' }).getByRole('button')).toHaveCount(5);
  448 |     await expect(page.locator('#astronomy-sky-darkness')).toHaveCount(1);
  449 |     await expect(page.locator('#astronomy-sky-darkness-status')).toHaveCount(1);
  450 |     await selectVisibleSkyTarget(page);
  451 |     const observingWindow = page.locator('#astronomy-sky-target-timeline [data-sky-observing-window]');
  452 |     await expect(observingWindow).toHaveCount(1);
  453 |     await expect(observingWindow).toHaveAttribute('data-state', /^(available|none|not-applicable)$/);
```