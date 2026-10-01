# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> landscapes swap without leaking GPU resources and aurora appears only where the model allows
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:272:5

# Error details

```
Error: page.screenshot: Clipped area is either empty or outside the resulting image
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  187 |   await sky.evaluate((el: any, az: number) => el.__observatoryLookAt(az, 3), low.sun.az);
  188 |   await sky.scrollIntoViewIfNeeded();
  189 |   await page.screenshot({ path: 'scratch/observatory-low-sun.png', clip: (await sky.boundingBox())! });
  190 |   expect(errors).toEqual([]);
  191 | });
  192 | 
  193 | test('steps around the sky from the keyboard and identifies what it lands on', async ({ page }) => {
  194 |   const { sky, errors } = await mountObservatory(page, EVENING);
  195 |   await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  196 |   await sky.scrollIntoViewIfNeeded();
  197 |   const spoken = page.locator('#astronomy-observatory-described');
  198 |   const heard: string[] = [];
  199 |   const picks: string[] = [];
  200 |   await sky.focus();
  201 |   for (let i = 0; i < 4; i++) {
  202 |     await page.keyboard.press('n');
  203 |     await expect(spoken).toContainText('named objects up now');
  204 |     const text = (await spoken.textContent())!;
  205 |     if (heard.length) await expect.poll(async () => (await spoken.textContent()) !== heard[heard.length - 1]).toBe(true);
  206 |     heard.push(text);
  207 |     const picked = (await debug(sky)).picked;
  208 |     expect(picked, 'the stepper identifies the object it just centred').toBeTruthy();
  209 |     expect(text.startsWith(picked.name), 'the spoken object matches the selected object').toBe(true);
  210 |     picks.push(picked.name);
  211 |   }
  212 |   // Four presses, four different objects, each with its bearing and altitude spoken.
  213 |   expect(new Set(heard).size).toBe(4);
  214 |   for (const line of heard) expect(line).toMatch(/, -?\d+\u00B0 [NEWS]/);
  215 |   expect(new Set(picks).size).toBe(4);
  216 |   // Going back returns to the object before it.
  217 |   await page.keyboard.press('p');
  218 |   await expect.poll(async () => (await spoken.textContent())).toBe(heard[heard.length - 2]);
  219 |   // The camera actually turned: the stepper aims before it identifies.
  220 |   const before = (await debug(sky)).camera.yaw;
  221 |   await page.getByRole('button', { name: 'Next object', exact: true }).click();
  222 |   await expect.poll(async () => (await debug(sky)).camera.yaw).not.toBe(before);
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
  268 |   await page.screenshot({ path: 'scratch/observatory-daylight.png', clip: (await sky.boundingBox())! });
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
  282 |   await page.screenshot({ path: 'scratch/observatory-arctic-aurora.png', clip: (await sky.boundingBox())! });
  283 |   await openSettings(page);
  284 |   for (const env of ['coast', 'desert', 'forest', 'lake', 'arctic']) {
  285 |     await page.getByLabel('Landscape (representative)', { exact: true }).selectOption(env);
  286 |     await expect.poll(async () => (await debug(sky)).env).toContain(env);
> 287 |     await expect(sky.locator('canvas')).toHaveCount(1);
      |                                                         ^ Error: page.screenshot: Clipped area is either empty or outside the resulting image
  288 |     const info = await debug(sky);
  289 |     expect(info.geometries).toBeLessThanOrEqual(first.geometries + 6);
  290 |     if (env === 'coast' || env === 'desert') await page.screenshot({ path: `scratch/observatory-${env}.png`, clip: (await sky.boundingBox())! });
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
  313 |   await page.screenshot({ path: 'scratch/observatory-perseids.png', clip: (await sky.boundingBox())! });
  314 |   await page.getByLabel('Local time', { exact: true }).fill('14:00');
  315 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  316 |   expect((await debug(sky)).rate).toBe(0);
  317 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Perseids Radiant');
  318 |   expect(errors).toEqual([]);
  319 | });
  320 | 
  321 | test('time-lapse advances inside the renderer and commits the reached time on pause', async ({ page }) => {
  322 |   const { sky, errors } = await mountObservatory(page, { ...EVENING, obsRate: '1h' });
  323 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
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
```