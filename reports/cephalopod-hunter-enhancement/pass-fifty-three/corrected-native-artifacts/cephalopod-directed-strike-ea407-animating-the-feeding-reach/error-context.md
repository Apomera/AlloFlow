# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-directed-strike.spec.ts >> reduced motion preserves a successful native strike without animating the feeding reach
- Location: tests\e2e\cephalopod-directed-strike.spec.ts:275:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Test source

```ts
  191 |   expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  192 | });
  193 | 
  194 | test('a distant target produces finite bounded reach without capture and reduced motion suppresses the reach', async ({ page }) => {
  195 |   await mount(page);
  196 |   await arrangeFish(page, [12, 6, 8], [-17, 0, 12]);
  197 |   await page.keyboard.press('KeyT');
  198 |   await page.keyboard.press('KeyE');
  199 |   await advance(page, 5);
  200 |   const missed = await pose(page);
  201 |   expect(missed.every(p => p.positions.every(Number.isFinite))).toBe(true);
  202 |   expect(Math.max(...missed.map(p => p.radius))).toBeLessThan(5);
  203 |   expect(Math.min(...missed.map(p => p.distanceToTarget))).toBeGreaterThan(5);
  204 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  205 |   await expect(page.locator('[data-hud=score]')).toHaveText('0');
  206 |   await advance(page, 12);
  207 | 
  208 |   await clickCephalopodControl(page, 'Help / settings');
  209 |   await page.getByLabel('Reduced motion', { exact: true }).check();
  210 |   await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  211 |   await advance(page, 2);
  212 |   const still = await buffers(page);
  213 |   await page.locator(canvas).focus();
  214 |   await page.keyboard.press('KeyE');
  215 |   await advance(page, 5);
  216 |   expect(await buffers(page)).toEqual(still);
  217 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  218 |   await expect(page.locator('[data-hud=score]')).toHaveText('0');
  219 | });
  220 | 
  221 | test('the full native strike stays continuous through contact and recovery while turning and jetting', async ({ page }) => {
  222 |   await mount(page);
  223 |   await arrangeFish(page, [0.55, 0.2, 1.25], [-17, 0, 12]);
  224 |   await page.evaluate(() => {
  225 |     const w = window as any;
  226 |     w.__strikeResources = [];
  227 |     w.__player.traverse((m: any) => {
  228 |       if (m.isMesh) w.__strikeResources.push({ m, geometry: m.geometry, material: m.material,
  229 |         attributes: Object.values(m.geometry.attributes).map((a: any) => ({ a, array: a.array })),
  230 |         matrix: m.instanceMatrix, matrixArray: m.instanceMatrix?.array });
  231 |     });
  232 |   });
  233 |   await page.keyboard.press('KeyT');
  234 |   await page.keyboard.press('KeyE');
  235 |   let previous = await pose(page), largestStep = 0;
  236 |   for (let frame = 1; frame <= 70; frame++) {
  237 |     if (frame === 27) {
  238 |       await page.keyboard.down('KeyD');
  239 |       await page.keyboard.down('KeyW');
  240 |       await page.keyboard.down('Space');
  241 |     }
  242 |     await page.evaluate(async () => {
  243 |       const w = window as any; w.__testStep = 0.01;
  244 |       do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  245 |       while (w.__testStep !== 0);
  246 |     });
  247 |     const current = await pose(page);
  248 |     for (let limb = 0; limb < current.length; limb++) {
  249 |       const points = current[limb].positions, prior = previous[limb].positions;
  250 |       expect(points.every(Number.isFinite)).toBe(true);
  251 |       for (let i = 0; i < points.length; i += 3) {
  252 |         largestStep = Math.max(largestStep, Math.hypot(points[i] - prior[i], points[i + 1] - prior[i + 1], points[i + 2] - prior[i + 2]));
  253 |       }
  254 |     }
  255 |     if (frame === 19) expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  256 |     if (frame === 20) {
  257 |       expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
  258 |       expect(Math.max(...current.map(p => p.distanceToTarget))).toBeLessThan(0.35);
  259 |     }
  260 |     previous = current;
  261 |   }
  262 |   await page.keyboard.up('Space'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
  263 |   // A discontinuous snap across the bounded reach would exceed this per10ms limit.
  264 |   expect(largestStep).toBeLessThan(0.25);
  265 |   expect(await page.evaluate(() => {
  266 |     const w = window as any;
  267 |     return w.__strikeResources.every((r: any) => r.m.geometry === r.geometry && r.m.material === r.material
  268 |       && r.attributes.every((a: any) => a.a.array === a.array)
  269 |       && r.m.instanceMatrix === r.matrix && r.m.instanceMatrix?.array === r.matrixArray);
  270 |   })).toBe(true);
  271 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
  272 |   expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  273 | });
  274 | 
  275 | test('reduced motion preserves a successful native strike without animating the feeding reach', async ({ page }) => {
  276 |   await mount(page);
  277 |   await arrangeFish(page, [0.45, 0.1, 1.1], [-17, 0, 12]);
  278 |   await clickCephalopodControl(page, 'Help / settings');
  279 |   await page.getByLabel('Reduced motion', { exact: true }).check();
  280 |   await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  281 |   await advance(page, 2);
  282 |   const still = await buffers(page);
  283 |   await page.locator(canvas).focus();
  284 |   await page.keyboard.press('KeyT');
  285 |   await page.keyboard.press('KeyE');
  286 |   await advance(page, 3);
  287 |   expect(await buffers(page)).toEqual(still);
  288 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  289 |   await advance(page, 1);
  290 |   expect(await buffers(page)).toEqual(still);
> 291 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
      |                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  292 |   await advance(page, 10);
  293 |   expect(await buffers(page)).toEqual(still);
  294 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
  295 | });
  296 | 
```