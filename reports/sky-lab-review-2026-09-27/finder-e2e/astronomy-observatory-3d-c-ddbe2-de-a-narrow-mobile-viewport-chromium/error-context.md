# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> catalog finder explains hidden targets and stays inside a narrow mobile viewport
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:636:5

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Find an object', { exact: true }) resolved to 2 elements:
    1) <section aria-labelledby="astronomy-observatory-search-label">…</section> aka getByRole('region', { name: 'Find an object' })
    2) <input value="" type="search" maxlength="80" class="astr-focus" autocomplete="off" spellcheck="false" id="astronomy-observatory-search" placeholder="Sirius, HIP 32349, Jupiter, or M31" aria-describedby="astronomy-observatory-search-help astronomy-observatory-search-count"/> aka getByRole('searchbox', { name: 'Find an object' })

Call log:
  - waiting for getByLabel('Find an object', { exact: true })

```

# Test source

```ts
  543 | 
  544 | test('star trails draw computed arcs, lengthen with the span, and stay off in daylight', async ({ page }) => {
  545 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  546 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  547 |   expect((await debug(sky)).trails).toBe(false);
  548 |   await openSettings(page);
  549 |   await page.getByRole('button', { name: 'Star trails', exact: true }).click();
  550 |   await expect.poll(async () => (await debug(sky)).trails).toBe(true);
  551 |   const four = await debug(sky);
  552 |   expect(four.trailHours).toBe(4);
  553 |   expect(four.trailStars).toBeGreaterThan(20);
  554 |   // Face the pole: the arcs should be visibly concentric there.
  555 |   await page.getByRole('button', { name: 'Face north', exact: true }).click();
  556 |   await sky.screenshot({ path: 'scratch/observatory-trails-pole.png' });
  557 |   await page.getByLabel('Trail length', { exact: true }).selectOption('8');
  558 |   await expect.poll(async () => (await debug(sky)).trailHours).toBe(8);
  559 |   expect((await debug(sky)).trailStars).toBeGreaterThan(20);
  560 |   await sky.evaluate((el: any) => el.__observatoryLookAt(180, 35));
  561 |   await sky.screenshot({ path: 'scratch/observatory-trails-south.png' });
  562 |   // Daylight washes the trails out along with the stars.
  563 |   await page.getByLabel('Local time', { exact: true }).fill('12:00');
  564 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  565 |   expect((await debug(sky)).trails).toBe(false);
  566 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Star trails');
  567 |   expect(errors).toEqual([]);
  568 | });
  569 | 
  570 | test('a star picked from the sky reaches the printed plan with its times', async ({ page }) => {
  571 |   await page.setViewportSize({ width: 1280, height: 1500 });
  572 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  573 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  574 |   // Identify a real star by clicking it.
  575 |   const info = await debug(sky);
  576 |   await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  577 |   await sky.scrollIntoViewIfNeeded();
  578 |   const spot = (await debug(sky)).spots.star;
  579 |   const box = (await sky.boundingBox())!;
  580 |   await page.mouse.click(box.x + spot.x, box.y + spot.y);
  581 |   const name = info.brightStar.name;
  582 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(name);
  583 |   // Save it, and it appears in the tab's list.
  584 |   await page.getByRole('button', { name: /Add to tonight's list/ }).click();
  585 |   await expect(page.locator('#astronomy-observatory-targets')).toContainText(name);
  586 |   await expect(page.getByRole('button', { name: /On tonight's list/ })).toBeVisible();
  587 |   const saved = await page.evaluate(() => (window as any).__toolData.astronomy.obsTargets);
  588 |   expect(saved).toHaveLength(1);
  589 |   expect(saved[0].name).toBe(name);
  590 |   expect(Number.isFinite(saved[0].ra)).toBe(true);
  591 |   // It survives into the printed kit with a real timetable.
  592 |   await page.getByRole('tab', { name: /Print/ }).click();
  593 |   const table = page.locator('table[aria-label="My targets tonight"]');
  594 |   await expect(table).toContainText(name);
  595 |   await expect(table.locator('tbody tr')).toHaveCount(1);
  596 |   await expect(page.locator('#astro-tonight-plan-heading')).toContainText('Portland, Maine');
  597 |   await page.screenshot({ path: 'scratch/observatory-print-plan.png', fullPage: false });
  598 |   expect(errors).toEqual([]);
  599 | });
  600 | 
  601 | test('reduced motion keeps the scene still and disables time-lapse', async ({ page }) => {
  602 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  603 |   const { sky, errors } = await mountObservatory(page, { ...EVENING, obsShower: 'perseids', obsDate: '2026-08-12' });
  604 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  605 |   await page.waitForTimeout(300);
  606 |   const info = await debug(sky);
  607 |   expect(info.raf).toBe(false);
  608 |   await expect(page.getByRole('button', { name: 'Play time-lapse', exact: true })).toBeDisabled();
  609 |   await expect(page.getByText('Reduced motion is on')).toBeVisible();
  610 |   expect(errors).toEqual([]);
  611 | });
  612 | 
  613 | 
  614 | test('catalog finder selects the exact HIP star with the keyboard and refreshes its details', async ({ page }) => {
  615 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  616 |   const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  617 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  618 |   const search = page.getByLabel('Find an object', { exact: true });
  619 |   await search.fill('HIP 32349');
  620 |   await expect(page.getByRole('button', { name: 'Select Sirius', exact: true })).toBeVisible();
  621 |   await search.press('Enter');
  622 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe('Sirius');
  623 |   await expect(page.locator('#astronomy-observatory-described')).toContainText('Centered and selected');
  624 |   const selected = await page.evaluate(() => (window as any).__toolData.astronomy.obsPicked);
  625 |   expect(selected.hip).toBe(32349);
  626 |   expect((await debug(sky)).camera.yaw).toBeCloseTo(selected.az, 3);
  627 |   const next = { obsTime: '23:00' };
  628 |   await page.evaluate(next => { Object.assign((window as any).__toolData.astronomy, next); (window as any).__bump(); }, next);
  629 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsPicked.alt)).not.toBe(selected.alt);
  630 |   await search.press('Escape');
  631 |   await expect(search).toHaveValue('');
  632 |   await expect(page.getByRole('button', { name: 'Select Sirius', exact: true })).toHaveCount(0);
  633 |   expect(errors).toEqual([]);
  634 | });
  635 | 
  636 | test('catalog finder explains hidden targets and stays inside a narrow mobile viewport', async ({ page }) => {
  637 |   await page.setViewportSize({ width: 320, height: 740 });
  638 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  639 |   const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-12-21', obsTime: '22:00', obsLayers: { stars: false } });
  640 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  641 |   const camera = (await debug(sky)).camera;
  642 |   const search = page.getByLabel('Find an object', { exact: true });
> 643 |   await search.fill('Sirius');
      |                ^ Error: locator.fill: Error: strict mode violation: getByLabel('Find an object', { exact: true }) resolved to 2 elements:
  644 |   const sirius = page.getByRole('button', { name: 'Select Sirius', exact: true });
  645 |   await expect(sirius).toContainText('Layer is turned off');
  646 |   await sirius.click();
  647 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe('Sirius');
  648 |   expect((await debug(sky)).camera).toEqual(camera);
  649 |   await expect(page.locator('#astronomy-observatory-described')).toContainText('camera stayed in place');
  650 |   await search.fill('Canopus');
  651 |   const canopus = page.getByRole('button', { name: 'Select Canopus', exact: true });
  652 |   await expect(canopus).toContainText('Below the horizon');
  653 |   await canopus.click();
  654 |   const selected = await page.evaluate(() => (window as any).__toolData.astronomy.obsPicked);
  655 |   expect(selected.name).toBe('Canopus');
  656 |   expect(selected.alt).toBeLessThan(0);
  657 |   expect((await debug(sky)).camera).toEqual(camera);
  658 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  659 |   const row = await canopus.boundingBox();
  660 |   expect(row!.height).toBeGreaterThanOrEqual(44);
  661 |   expect(errors).toEqual([]);
  662 | });
  663 | 
```