# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> paints the observatory catalogue behind the flat sky map
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:226:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 200
Received:   3

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Test source

```ts
  132 | }
  133 | const debug = (sky) => sky.evaluate((el: any) => el.__observatoryDebug());
  134 | // Secondary controls live behind a disclosure so the sky comes first; a user
  135 | // opens it before changing layers, landscape, guides or deep time.
  136 | async function openSettings(page) {
  137 |   const toggle = page.getByRole('button', { name: /Sky settings/ });
  138 |   if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  139 |   await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  140 | }
  141 | test.afterEach(async ({ page }) => {
  142 |   await page.evaluate(() => (window as any).__destroy?.()).catch(() => {});
  143 | });
  144 | 
  145 | test('computes a real catalog sky from local assets for a fixed place and time', async ({ page }) => {
  146 |   const requests: string[] = [];
  147 |   page.on('request', r => requests.push(r.url()));
  148 |   const { sky, errors } = await mountObservatory(page, EVENING);
  149 |   await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  150 |   const info = await debug(sky);
  151 |   expect(info.fallback).toBe(false);
  152 |   expect(info.utc).toBe('2026-07-05T03:30:00.000Z');
  153 |   expect(info.sun.alt).toBeLessThan(-12);
  154 |   expect(info.starsUp).toBeGreaterThan(3000);
  155 |   expect(info.linesDrawn).toBeGreaterThan(20);
  156 |   // The default view faces south from a northern site, so only the S marker is on screen.
  157 |   expect(info.labels).toContain('S');
  158 |   expect(info.labels).not.toContain('N');
  159 |   expect(info.camera.yaw).toBe(180);
  160 |   expect(requests.some(url => url.includes('/stem_lab/assets/astronomy/hyg-v41-naked-eye.json'))).toBe(true);
  161 |   expect(requests.some(url => url.includes('/vendor/three-r128/three.min.js'))).toBe(true);
  162 |   expect(requests.some(url => /cdnjs|jsdelivr|unpkg|noaa\.gov/.test(url))).toBe(false);
  163 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('2026-07-04 23:30 (UTC-04:00)');
  164 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Fully dark sky');
  165 |   await page.screenshot({ path: 'scratch/observatory-lake-evening.png', clip: (await sky.boundingBox())! });
  166 |   expect(errors).toEqual([]);
  167 | });
  168 | 
  169 | test('thins the sky near the horizon by atmospheric extinction', async ({ page }) => {
  170 |   const { sky, errors } = await mountObservatory(page, EVENING);
  171 |   await expect.poll(async () => (await debug(sky)).catalog, { timeout: 60000 }).toBeGreaterThan(8000);
  172 |   const info = await debug(sky);
  173 |   // The magnitudes the shader draws with are the ones the CPU computed, not a
  174 |   // second curve written in GLSL.
  175 |   expect(info.starMagWired).toBe(true);
  176 |   // Some stars stand above the horizon but are lost in the air near it.
  177 |   expect(info.starsVisible).toBeGreaterThan(500);
  178 |   expect(info.starsVisible).toBeLessThan(info.starsUp);
  179 |   await sky.evaluate((el: any) => el.__observatoryLookAt(180, 4));
  180 |   await page.screenshot({ path: 'scratch/observatory-horizon-murk.png', clip: (await sky.boundingBox())! });
  181 | 
  182 |   // The same air reddens a setting Sun. Jump to sunset and face it.
  183 |   await page.getByRole('button', { name: /^Jump to Sunset \d\d:\d\d$/ }).click();
  184 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(-1.5);
  185 |   const low = await debug(sky);
  186 |   expect(low.sunExt).toBeGreaterThan(4);
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
> 232 |   await page.goto(`${base}/__harness`);
      |                                                                                                                    ^ Error: expect(received).toBeGreaterThan(expected)
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
  287 |     await expect(sky.locator('canvas')).toHaveCount(1);
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
```