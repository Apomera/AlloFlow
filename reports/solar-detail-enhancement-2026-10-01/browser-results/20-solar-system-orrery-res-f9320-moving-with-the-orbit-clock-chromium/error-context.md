# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 20-solar-system-orrery-responsive.spec.ts >> keeps selected-world DOM readouts moving with the orbit clock
- Location: tests\e2e\20-solar-system-orrery-responsive.spec.ts:1259:5

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "0.00 / 1.00 yr · Earth year 1 · day 1"
```

# Test source

```ts
  1240 |     emit(window, 'pointermove', {
  1241 |       pointerId: 12, pointerType: 'touch',
  1242 |       clientX: centerX + 90, clientY: centerY,
  1243 |     });
  1244 |     emit(window, 'pointerup', {
  1245 |       pointerId: 11, pointerType: 'touch',
  1246 |       clientX: centerX - 30, clientY: centerY,
  1247 |     });
  1248 |     emit(window, 'pointerup', {
  1249 |       pointerId: 12, pointerType: 'touch',
  1250 |       clientX: centerX + 90, clientY: centerY,
  1251 |     });
  1252 |   });
  1253 | 
  1254 |   const after = await canvas.evaluate((element) => (element as any).__canvasPanelState.scale);
  1255 |   expect(after).toBeGreaterThan(before);
  1256 | 
  1257 |   await harness.destroy(page);
  1258 | });
  1259 | test('keeps selected-world DOM readouts moving with the orbit clock', async ({ page }) => {
  1260 |   await page.setViewportSize({ width: 736, height: 1600 });
  1261 |   await harness.mount(page, {
  1262 |     solarSystem: {
  1263 |       tutorialDismissed: true,
  1264 |       orreryMode: true,
  1265 |       orr_tab: 0,
  1266 |       orr_sel: 'earth',
  1267 |       orr_paused: true,
  1268 |     },
  1269 |   }, undefined, { expectCanvas: false });
  1270 | 
  1271 |   const expectStageMetricSync = async () => {
  1272 |     await expect.poll(() => page.evaluate(() => {
  1273 |       const metricIds = ['orrery-stage-distance-value', 'orrery-stage-speed-value', 'orrery-stage-phase-value'];
  1274 |       const metrics = metricIds.map((id) => document.getElementById(id));
  1275 |       if (metrics.some((node) => !node || node.children.length || !node.textContent?.trim())) return false;
  1276 |       const [distance, speed, phase] = metrics.map((node) => node!.textContent!.trim());
  1277 |       const legacy = document.getElementById('orrery-stage-readout-values')?.textContent?.trim();
  1278 |       return legacy === 'Distance ' + distance + ' AU \u00b7 speed ' + speed + ' km/s \u00b7 ' + phase;
  1279 |     })).toBe(true);
  1280 |   };
  1281 | 
  1282 |   await expect(page.locator('#orrery-stage-distance-value')).toBeVisible();
  1283 |   await expect(page.locator('#orrery-stage-speed-value')).toBeVisible();
  1284 |   await expect(page.locator('#orrery-stage-phase-value')).toBeVisible();
  1285 |   await expectStageMetricSync();
  1286 | 
  1287 |   await expect(page.locator('#orrery-live-selected-summary')).toContainText('Earth: distance');
  1288 |   await expect(page.locator('#orrery-stage-readout-body')).toHaveText('Earth');
  1289 |   await expect(page.locator('#orrery-stage-readout-values')).toContainText('Distance');
  1290 |   await expect(page.locator('#orrery-stage-readout')).toHaveAttribute('aria-live', 'polite');
  1291 |   const initialStageReadout = await page.locator('#orrery-stage-readout-values').textContent();
  1292 |   await expect(page.locator('#orrery-live-selected-summary')).toHaveAttribute('aria-live', 'polite');
  1293 |   await expect(page.locator('#orrery-live-orbit-position-meter')).toHaveAttribute('role', 'img');
  1294 |   await expect(page.locator('#orrery-live-orbit-position-meter')).toHaveAttribute('aria-describedby', 'orrery-live-orbit-position');
  1295 |   await expect(page.locator('#orrery-live-orbit-position')).toContainText('Earth');
  1296 |   await expect(page.locator('#orrery-live-kepler-iii')).toContainText('Kepler III check');
  1297 |   const initialOrbitalMarker = await page.locator('#orrery-live-orbit-position-marker').getAttribute('style');
  1298 |   await page.locator('#orrery-timeline-jump-2').click();
  1299 |   await expect(page.locator('#orrery-live-orbit-position')).toContainText('near aphelion');
  1300 |   await expect(page.locator('#orrery-stage-readout-values')).toContainText('Near aphelion');
  1301 |   await expect(page.locator('#orrery-stage-phase-value')).toHaveText('Near aphelion');
  1302 |   await expectStageMetricSync();
  1303 |   expect(await page.locator('#orrery-stage-readout-values').textContent()).not.toBe(initialStageReadout);
  1304 |   const aphelionOrbitalMarker = await page.locator('#orrery-live-orbit-position-marker').getAttribute('style');
  1305 |   expect(aphelionOrbitalMarker).toContain('left: 100%');
  1306 |   expect(initialOrbitalMarker).not.toBe(aphelionOrbitalMarker);
  1307 |   await page.locator('#orrery-timeline-jump-0').click();
  1308 |   await expect(page.locator('#orrery-live-orbit-position')).toContainText('near perihelion');
  1309 |   await expect(page.locator('#orrery-playback-context')).toContainText('Earth completes one orbit in about 1.0 s at 1.0 Earth yr/s.');
  1310 |   expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('true');
  1311 |   expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('step');
  1312 |   expect(await page.locator('#orrery-timeline-mark-4').getAttribute('aria-current')).toBe('false');
  1313 |   expect(await page.locator('#orrery-timeline-jump-4').getAttribute('aria-pressed')).toBe('false');
  1314 |   await page.locator('#orrery-timeline-jump-2').click();
  1315 |   await expect(page.locator('#orrery-live-timeline-phase')).toContainText('Near aphelion');
  1316 |   await page.locator('#orrery-timeline-jump-0').click();
  1317 |   await expect(page.locator('#orrery-live-timeline-phase')).toContainText('Near perihelion');
  1318 |   const activeMarkBorder = await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor);
  1319 | 
  1320 |   expect(await page.locator('#orrery-live-timeline-value').textContent()).toContain('Earth year 1 · day 1');
  1321 |   await page.locator('#orrery-timeline-jump-4').click();  await expect(page.locator('#orrery-live-timeline-value')).toContainText('1.00 / 1.00');
  1322 |   await expect(page.locator('#orrery-phase-scrubber')).toHaveValue('1');
  1323 |   expect(await page.locator('#orrery-timeline-jump-4').getAttribute('aria-pressed')).toBe('true');
  1324 |   expect(await page.locator('#orrery-timeline-mark-4').getAttribute('aria-current')).toBe('step');
  1325 |   expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('false');
  1326 |   await expect(page.locator('#orrery-live-timeline-value')).toContainText('Earth year 2 · day 1');
  1327 |   await page.locator('#orrery-timeline-jump-0').click();
  1328 |   await expect(page.locator('#orrery-live-timeline-value')).toContainText('Earth year 1 · day 1');
  1329 |   const before = await page.locator('#orrery-live-timeline-value').textContent();
  1330 |   const retainedMetricNodes = await page.evaluateHandle(() =>
  1331 |     ['orrery-stage-distance-value', 'orrery-stage-speed-value', 'orrery-stage-phase-value']
  1332 |       .map((id) => document.getElementById(id)));
  1333 |   await page.evaluate(() => {
  1334 |     const ctx = (window as any).__ctx;
  1335 |     ctx.updateMulti('solarSystem', { orr_speed: 1, orr_paused: false });
  1336 |   });
  1337 |   await page.waitForTimeout(350);
  1338 | 
  1339 |   const after = await page.locator('#orrery-live-timeline-value').textContent();
> 1340 |   expect(after).not.toBe(before);
       |                     ^ Error: expect(received).not.toBe(expected) // Object.is equality
  1341 |   await expectStageMetricSync();
  1342 |   expect(await page.evaluate((nodes) => nodes.every((node) =>
  1343 |     !!node && document.getElementById(node.id) === node && node.children.length === 0), retainedMetricNodes)).toBe(true);
  1344 |   expect(Number(await page.locator('#orrery-phase-scrubber').inputValue())).toBeGreaterThan(0);
  1345 |   expect(await page.locator('#orrery-phase-scrubber').getAttribute('aria-valuetext')).toContain('years into Earth');
  1346 |   expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('false');
  1347 |   expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('false');
  1348 |   expect(await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(activeMarkBorder);
  1349 | 
  1350 |   const phaseScrubber = page.locator('#orrery-phase-scrubber');
  1351 |   await phaseScrubber.focus();
  1352 |   await phaseScrubber.press('Home');
  1353 |   await expect(phaseScrubber).toHaveValue('0');
  1354 |   await expect(page.locator('#orrery-stage-readout')).toHaveAttribute('aria-live', 'polite');
  1355 |   await phaseScrubber.press('ArrowRight');
  1356 |   expect(Number(await phaseScrubber.inputValue())).toBeGreaterThan(0);
  1357 |   await expectStageMetricSync();
  1358 |   await retainedMetricNodes.dispose();
  1359 | 
  1360 |   await harness.destroy(page);
  1361 | });
  1362 | test('gates guided predictions until the orbital clock is paused', async ({ page }) => {
  1363 |   await page.setViewportSize({ width: 736, height: 1600 });
  1364 |   await harness.mount(page, {
  1365 |     solarSystem: {
  1366 |       tutorialDismissed: true,
  1367 |       orreryMode: true,
  1368 |       orr_tab: 0,
  1369 |       orr_paused: false,
  1370 |       orr_mission_progress: { earth_distance: { started: true } },
  1371 |     },
  1372 |   }, undefined, { expectCanvas: false });
  1373 | 
  1374 |   const options = page.locator('button[aria-describedby="orrery-guided-objective"]');
  1375 |   await expect(options).toHaveCount(2);
  1376 |   await expect(options.first()).toBeDisabled();
  1377 |   expect(await options.first().getAttribute('aria-label')).toContain('Pause the clock before predicting');
  1378 | 
  1379 |   await page.getByRole('button', { name: 'Pause clock', exact: true }).click();
  1380 |   await expect(options.first()).toBeEnabled();
  1381 | 
  1382 |   await page.evaluate(() => (window as any).__ctx.updateMulti('solarSystem', { orr_time: 0, orr_paused: true }));
  1383 |   await page.getByRole('button', { name: 'Farther than 1 AU for Earth live orbit' }).click();
  1384 |   await expect(page.locator('#orrery-guided-feedback')).toContainText('Not quite');
  1385 |   await expect(page.locator('button[aria-describedby="orrery-guided-objective orrery-guided-feedback"]')).toHaveCount(2);
  1386 |   await page.getByRole('button', { name: 'Closer than 1 AU for Earth live orbit' }).click();
  1387 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress.earth_distance.correct)).toBe(true);
  1388 | 
  1389 |   await harness.destroy(page);
  1390 | });
  1391 | test('keeps comparison distance and speed evidence live', async ({ page }) => {
  1392 |   await page.setViewportSize({ width: 736, height: 1600 });
  1393 |   await harness.mount(page, {
  1394 |     solarSystem: {
  1395 |       tutorialDismissed: true,
  1396 |       orreryMode: true,
  1397 |       orr_tab: 0,
  1398 |       orr_sel: 'earth',
  1399 |       orr_compare: 'mars',
  1400 |       orr_paused: true,
  1401 |     },
  1402 |   }, undefined, { expectCanvas: false });
  1403 | 
  1404 |   await expect(page.locator('table[aria-label*="Earth"][aria-label*="Mars"]')).toBeVisible();
  1405 |   const comparisonRegion = page.getByRole('region', { name: 'Orbital comparison for Earth with Mars', exact: true });
  1406 |   await expect(comparisonRegion).toBeVisible();
  1407 |   const comparisonOrder = await page.evaluate(() => {
  1408 |     const follow = document.querySelector('button[aria-label="Follow Earth with the camera"]');
  1409 |     const comparison = document.querySelector('[role="region"][aria-label="Orbital comparison for Earth with Mars"]');
  1410 |     const evidence = document.querySelector('[role="region"][aria-label="A/B orbital evidence for Earth"]');
  1411 |     if (!follow || !comparison || !evidence) return { followBeforeComparison: false, comparisonBeforeEvidence: false };
  1412 |     return {
  1413 |       followBeforeComparison: !!(follow.compareDocumentPosition(comparison) & Node.DOCUMENT_POSITION_FOLLOWING),
  1414 |       comparisonBeforeEvidence: !!(comparison.compareDocumentPosition(evidence) & Node.DOCUMENT_POSITION_FOLLOWING),
  1415 |     };
  1416 |   });
  1417 |   expect(comparisonOrder.followBeforeComparison).toBe(true);
  1418 |   expect(comparisonOrder.comparisonBeforeEvidence).toBe(true);
  1419 |   await expect(page.locator('#orrery-compare-interpretation')).toContainText('Earth is currently');
  1420 |   await expect(page.locator('#orrery-compare-interpretation')).toContainText('Kepler III: Mars has the larger orbit and the longer period.');
  1421 |   // The canvas intentionally suspends its clock outside the viewport.
  1422 |   await page.locator('canvas[role="application"]').scrollIntoViewIfNeeded();
  1423 |   const beforeDistance = await page.locator('#orrery-live-compare-primary-distance').textContent();
  1424 |   const beforeSpeed = await page.locator('#orrery-live-compare-primary-speed').textContent();
  1425 | 
  1426 |   await page.evaluate(() => {
  1427 |     const ctx = (window as any).__ctx;
  1428 |     ctx.updateMulti('solarSystem', { orr_speed: 1, orr_paused: false });
  1429 |   });
  1430 |   await expect.poll(() => page.locator('#orrery-live-compare-primary-distance').textContent()).not.toBe(beforeDistance);
  1431 |   await expect.poll(() => page.locator('#orrery-live-compare-primary-speed').textContent()).not.toBe(beforeSpeed);
  1432 |   await expect(page.locator('#orrery-live-compare-secondary-distance')).toBeVisible();
  1433 |   await expect(page.locator('#orrery-live-compare-secondary-speed')).toBeVisible();
  1434 | 
  1435 |   await harness.destroy(page);
  1436 | });
  1437 | test('keeps comparison interpretation synchronized as worlds move', async ({ page }) => {
  1438 |   await page.setViewportSize({ width: 736, height: 1600 });
  1439 |   await harness.mount(page, {
  1440 |     solarSystem: {
```