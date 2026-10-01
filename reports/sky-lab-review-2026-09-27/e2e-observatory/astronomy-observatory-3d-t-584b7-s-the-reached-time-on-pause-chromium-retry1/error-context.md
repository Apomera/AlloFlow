# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> time-lapse advances inside the renderer and commits the reached time on pause
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:318:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 600000
Received:   0

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Test source

```ts
  223 |   expect(errors).toEqual([]);
  224 | });
  225 | 
  226 | test('paints the observatory catalogue behind the flat sky map', async ({ page }) => {
  227 |   const errors: string[] = [];
  228 |   page.on('pageerror', e => errors.push(e.message));
  229 |   // The +6 h preview must land at night regardless of when this test runs.
  230 |   // Fix only Date; animation frames and asset-loading timers remain live.
  231 |   await page.clock.setFixedTime(new Date('2026-07-04T21:30:00.000Z'));
  232 |   await page.goto(`${base}/__harness`);
  233 |   await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'portland', skyHourOffset: 6, bortleClass: 3 }));
  234 |   const field = page.locator('[data-sky-layer="catalog-stars"]');
  235 |   await expect.poll(async () => Number((await field.getAttribute('data-catalog-stars')) || 0), { timeout: 60000 }).toBeGreaterThan(200);
  236 |   const dark = Number((await field.getAttribute('data-catalog-stars'))!);
  237 |   expect(await field.locator('circle').count()).toBe(dark);
  238 |   // A brighter sky admits fewer stars, on the same limiting magnitude the
  239 |   // Observatory uses.
  240 |   await page.evaluate(() => (window as any).__destroy?.());
  241 |   await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'portland', skyHourOffset: 6, bortleClass: 8 }));
  242 |   await expect.poll(async () => Number((await page.locator('[data-sky-layer="catalog-stars"]').getAttribute('data-catalog-stars')) || 0), { timeout: 60000 }).toBeGreaterThan(0);
  243 |   const town = Number((await page.locator('[data-sky-layer="catalog-stars"]').getAttribute('data-catalog-stars'))!);
  244 |   expect(town).toBeLessThan(dark);
  245 |   // The layer button turns it off.
  246 |   await page.getByRole('button', { name: 'Catalogue star field', exact: true }).click();
  247 |   await expect(page.locator('[data-sky-layer="catalog-stars"]')).toHaveCount(0);
  248 |   await expect(page.locator('[data-sky-layer="stars"]')).toHaveCount(1);
  249 |   expect(errors).toEqual([]);
  250 | });
  251 | 
  252 | test('place, hemisphere, daylight and time steps change the computed sky', async ({ page }) => {
  253 |   const { sky, errors } = await mountObservatory(page, EVENING);
  254 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  255 |   const maine = await debug(sky);
  256 |   await page.getByLabel('Observing site', { exact: true }).selectOption('sydney');
  257 |   await expect.poll(async () => (await debug(sky)).camera.yaw).toBe(0);
  258 |   const sydney = await debug(sky);
  259 |   expect(sydney.utc).not.toBe(maine.utc);
  260 |   expect(Math.abs(sydney.sun.alt - maine.sun.alt)).toBeGreaterThan(5);
  261 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  262 |   await page.getByLabel('Observing site', { exact: true }).selectOption('portland');
  263 |   await page.getByLabel('Local time', { exact: true }).fill('13:00');
  264 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(40);
  265 |   const noon = await debug(sky);
  266 |   expect(noon.limit).toBeLessThanOrEqual(0);
  267 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Daylight');
  268 |   await sky.screenshot({ path: 'scratch/observatory-daylight.png' });
  269 |   await page.getByRole('button', { name: 'Shift time +1 d', exact: true }).click();
  270 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsDate)).toBe('2026-07-05');
  271 |   expect((await debug(sky)).utc).toBe('2026-07-05T17:00:00.000Z');
  272 |   expect(errors).toEqual([]);
  273 | });
  274 | 
  275 | test('landscapes swap without leaking GPU resources and aurora appears only where the model allows', async ({ page }) => {
  276 |   const { sky, errors } = await mountObservatory(page, { ...EVENING, obsSite: 'tromso', obsDate: '2026-12-21', obsTime: '22:00', obsAurora: 5 });
  277 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  278 |   const first = await debug(sky);
  279 |   expect(first.env).toContain('arctic');
  280 |   expect(first.auroraVisible).toBe(true);
  281 |   expect(first.aurora.level).toBe(5);
  282 |   await sky.screenshot({ path: 'scratch/observatory-arctic-aurora.png' });
  283 |   await openSettings(page);
  284 |   for (const env of ['coast', 'desert', 'forest', 'lake', 'arctic']) {
  285 |     await page.getByLabel('Landscape (representative)', { exact: true }).selectOption(env);
  286 |     await expect.poll(async () => (await debug(sky)).env).toContain(env);
  287 |     await expect(sky.locator('canvas')).toHaveCount(1);
  288 |     const info = await debug(sky);
  289 |     expect(info.geometries).toBeLessThanOrEqual(first.geometries + 6);
  290 |     if (env === 'coast' || env === 'desert') await sky.screenshot({ path: `scratch/observatory-${env}.png` });
  291 |   }
  292 |   await page.getByLabel('Observing site', { exact: true }).selectOption('quito');
  293 |   await page.getByLabel(/Simulated aurora activity/).fill('9');
  294 |   await expect.poll(async () => (await debug(sky)).aurora.level).toBe(9);
  295 |   expect((await debug(sky)).auroraVisible).toBe(false);
  296 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('stays below this horizon');
  297 |   expect(errors).toEqual([]);
  298 | });
  299 | 
  300 | test('shower layer places the radiant from real coordinates and only shows meteors when it is up', async ({ page }) => {
  301 |   const { sky, errors } = await mountObservatory(page, { obsLive: false, obsDate: '2026-08-12', obsTime: '23:30', obsShower: 'perseids' });
  302 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  303 |   const info = await debug(sky);
  304 |   expect(info.radiant.alt).toBeGreaterThan(10);
  305 |   expect(info.radiant.az).toBeGreaterThan(0);
  306 |   expect(info.radiant.az).toBeLessThan(90);
  307 |   expect(info.rate).toBeGreaterThan(0);
  308 |   await expect.poll(async () => (await debug(sky)).meteors).toBeGreaterThan(0);
  309 |   await page.getByRole('button', { name: '🔎 Radiant', exact: true }).click();
  310 |   const found = await debug(sky);
  311 |   expect(Math.abs(found.camera.yaw - info.radiant.az)).toBeLessThan(1);
  312 |   expect(found.labels.some(l => /Radiant .* simulated/.test(l))).toBe(true);
  313 |   await sky.screenshot({ path: 'scratch/observatory-perseids.png' });
  314 |   await page.getByLabel('Local time', { exact: true }).fill('14:00');
  315 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  316 |   expect((await debug(sky)).rate).toBe(0);
  317 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Perseids Radiant');
  318 |   expect(errors).toEqual([]);
  319 | });
  320 | 
  321 | test('time-lapse advances inside the renderer and commits the reached time on pause', async ({ page }) => {
  322 |   const { sky, errors } = await mountObservatory(page, { ...EVENING, obsRate: '1h' });
> 323 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
      |                                                            ^ Error: expect(received).toBeGreaterThan(expected)
  324 |   const before = await debug(sky);
  325 |   await page.getByRole('button', { name: 'Play time-lapse', exact: true }).click();
  326 |   await expect.poll(async () => (await debug(sky)).playMs).toBeGreaterThan(600000);
  327 |   expect(await page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).toBe('23:30');
  328 |   const during = await debug(sky);
  329 |   expect(during.playing).toBe(true);
  330 |   expect(during.utc).not.toBe(before.utc);
  331 |   await page.getByRole('button', { name: 'Pause time-lapse', exact: true }).click();
  332 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).not.toBe('23:30');
  333 |   const state = await page.evaluate(() => (window as any).__toolData.astronomy);
  334 |   expect(state.obsLive).toBe(false);
  335 |   expect(state.obsPlaying).toBe(false);
  336 |   const after = await debug(sky);
  337 |   expect(after.playMs).toBe(0);
  338 |   expect(after.playing).toBe(false);
  339 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText(`${state.obsDate} ${state.obsTime}`);
  340 |   expect(errors).toEqual([]);
  341 | });
  342 | 
  343 | test('keyboard, pointer, find and layer controls work at 320px', async ({ page }) => {
  344 |   await page.setViewportSize({ width: 320, height: 1100 });
  345 |   const { sky, errors } = await mountObservatory(page, EVENING);
  346 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  347 |   await sky.focus();
  348 |   await sky.press('ArrowRight');
  349 |   expect((await debug(sky)).camera.yaw).toBe(185);
  350 |   await sky.press('Home');
  351 |   expect((await debug(sky)).camera.yaw).toBe(180);
  352 |   await page.getByRole('button', { name: 'Face north', exact: true }).click();
  353 |   expect((await debug(sky)).camera.yaw).toBe(0);
  354 |   const box = (await sky.boundingBox())!;
  355 |   await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  356 |   await page.mouse.down();
  357 |   await page.mouse.move(box.x + box.width * .8, box.y + box.height * .55, { steps: 4 });
  358 |   await page.mouse.up();
  359 |   expect((await debug(sky)).camera.yaw).not.toBe(0);
  360 |   const info = await debug(sky);
  361 |   if (info.moon.alt > 0) {
  362 |     await page.getByRole('button', { name: '🔎 Moon', exact: true }).click();
  363 |     expect(Math.abs((await debug(sky)).camera.yaw - info.moon.az)).toBeLessThan(1);
  364 |   }
  365 |   await openSettings(page);
  366 |   await page.getByRole('button', { name: 'Constellation lines', exact: true }).click();
  367 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsLayers.lines)).toBe(false);
  368 |   await page.getByRole('button', { name: 'Compass points', exact: true }).click();
  369 |   await expect.poll(async () => (await debug(sky)).labels.includes('N')).toBe(false);
  370 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('cygnus');
  371 |   await page.getByRole('button', { name: '🔎 Cygnus', exact: true }).click();
  372 |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  373 |   expect(overflow).toBeLessThanOrEqual(1);
  374 |   expect(errors).toEqual([]);
  375 | });
  376 | 
  377 | test('falls back to built-in bright stars when the catalog asset is unavailable, and disposes on navigation', async ({ page }) => {
  378 |   await page.route('**/hyg-v41-naked-eye.json', route => route.fulfill({ status: 500, body: 'nope' }));
  379 |   const { sky, errors } = await mountObservatory(page, EVENING);
  380 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(0);
  381 |   const info = await debug(sky);
  382 |   expect(info.fallback).toBe(true);
  383 |   expect(info.catalog).toBeLessThan(100);
  384 |   // Partial patterns would look broken, so lines stay hidden on the fallback even where a few resolve.
  385 |   expect(info.linesVisible).toBe(false);
  386 |   await expect(page.getByText('Built-in bright stars only')).toBeVisible();
  387 |   await page.evaluate(() => { (window as any).__oldSky = document.getElementById('astronomy-observatory-3d'); });
  388 |   await page.getByRole('tab', { name: /Meteors/ }).click();
  389 |   expect(await page.evaluate(() => !!(window as any).__oldSky.__observatoryDebug)).toBe(false);
  390 |   await expect(page.locator('#astronomy-observatory-3d')).toHaveCount(0);
  391 |   // The injected 500 is the only acceptable console error here.
  392 |   expect(errors.filter(e => !/status of 500/.test(e))).toEqual([]);
  393 | });
  394 | 
  395 | test('click-to-identify names a real star, guides and pole appear, deep-sky glows and the Moon surface load', async ({ page }) => {
  396 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  397 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  398 |   await expect.poll(async () => (await debug(sky)).moonFace).toBe(true);
  399 |   const info = await debug(sky);
  400 |   expect(info.deepSky).toEqual(expect.arrayContaining(['m45', 'm42']));
  401 |   await expect(page.getByRole('button', { name: '🔎 Pleiades (M45)', exact: true })).toBeVisible();
  402 |   // Turn toward the brightest named star on screen and click exactly on it.
  403 |   expect(info.brightStar).toBeTruthy();
  404 |   await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  405 |   await sky.scrollIntoViewIfNeeded();
  406 |   const spot = (await debug(sky)).spots.star;
  407 |   expect(spot).toBeTruthy();
  408 |   const box = (await sky.boundingBox())!;
  409 |   await page.mouse.click(box.x + spot.x, box.y + spot.y);
  410 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(info.brightStar.name);
  411 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText(info.brightStar.name);
  412 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText(/HIP \d+/);
  413 |   await page.getByRole('button', { name: 'Clear', exact: true }).click();
  414 |   await expect.poll(async () => (await debug(sky)).picked).toBeNull();
  415 |   // Guides: ecliptic, equator and the celestial pole at the site latitude.
  416 |   await openSettings(page);
  417 |   await page.getByRole('button', { name: 'Ecliptic and equator', exact: true }).click();
  418 |   await expect.poll(async () => (await debug(sky)).guides).toBe(true);
  419 |   await page.getByRole('button', { name: '🔎 Celestial pole', exact: true }).click();
  420 |   const north = await debug(sky);
  421 |   expect(north.poleVisible).toBe(true);
  422 |   expect(Math.abs(north.camera.yaw)).toBeLessThan(1);
  423 |   expect(north.labels).toContain('Celestial pole');
```