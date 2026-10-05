# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-directed-strike.spec.ts >> the full native strike stays continuous through contact and recovery while turning and jetting
- Location: tests\e2e\cephalopod-directed-strike.spec.ts:217:5

# Error details

```
Test timeout of 150000ms exceeded.
```

```
Error: page.evaluate: Test timeout of 150000ms exceeded.
```

# Test source

```ts
  138 |     w.__fish[0].position.copy(moved);
  139 |     w.__fish[0].userData.offset.copy(moved).sub(w.__schoolCenter);
  140 |   });
  141 |   await untilContact(page);
  142 |   const contact = await pose(page);
  143 |   for (const club of contact) {
  144 |     expect(club.distanceToTarget).toBeLessThan(0.35);
  145 |     expect(club.distanceToTarget + 0.5).toBeLessThan(club.distanceToOther);
  146 |   }
  147 |   expect(Math.max(...contact.map(p => p.distanceToTarget))).toBeLessThan(Math.max(...resting.map(p => p.distanceToTarget)));
  148 |   expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  149 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
  150 | });
  151 | 
  152 | test('inspection freezes a pending reach and its recovery, then resumes the same strike', async ({ page }) => {
  153 |   await mount(page);
  154 |   await arrangeFish(page, [0.6, 0.2, 1.2], [-1, 0, 1.35]);
  155 |   const idleClubs = await pose(page);
  156 |   await page.keyboard.press('KeyT');
  157 |   await page.keyboard.press('KeyE');
  158 |   await advance(page, 2);
  159 |   await page.keyboard.press('KeyF');
  160 |   const windup = await buffers(page);
  161 |   await advance(page, 15);
  162 |   expect(await buffers(page)).toEqual(windup);
  163 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  164 |   await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  165 |   await untilContact(page);
  166 |   await advance(page, 2);
  167 |   await expect(strikeButton(page)).toBeDisabled();
  168 |   await page.keyboard.press('KeyF');
  169 |   const recovery = await buffers(page);
  170 |   await advance(page, 15);
  171 |   expect(await buffers(page)).toEqual(recovery);
  172 |   await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  173 |   await expect(strikeButton(page)).toBeDisabled();
  174 |   // The game draws its HUD at 8 Hz. Continue simulation through the next
  175 |   // refresh instead of freezing the clock between cooldown and HUD updates.
  176 |   let resumedFrames = 0;
  177 |   while (resumedFrames < 12 && !await strikeButton(page).isEnabled()) {
  178 |     await advance(page, 1);
  179 |     resumedFrames++;
  180 |   }
  181 |   await expect(strikeButton(page)).toBeEnabled();
  182 |   const recovered = await pose(page);
  183 |   recovered.forEach((club, i) => {
  184 |     expect(Math.hypot(...club.center.map((value: number, axis: number) => value - idleClubs[i].center[axis]))).toBeLessThan(0.15);
  185 |   });
  186 |   expect(recovered.map(p => p.positions)).not.toEqual(recovery);
  187 |   expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  188 | });
  189 | 
  190 | test('a distant target produces finite bounded reach without capture and reduced motion suppresses the reach', async ({ page }) => {
  191 |   await mount(page);
  192 |   await arrangeFish(page, [12, 6, 8], [-17, 0, 12]);
  193 |   await page.keyboard.press('KeyT');
  194 |   await page.keyboard.press('KeyE');
  195 |   await advance(page, 5);
  196 |   const missed = await pose(page);
  197 |   expect(missed.every(p => p.positions.every(Number.isFinite))).toBe(true);
  198 |   expect(Math.max(...missed.map(p => p.radius))).toBeLessThan(5);
  199 |   expect(Math.min(...missed.map(p => p.distanceToTarget))).toBeGreaterThan(5);
  200 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  201 |   await expect(page.locator('[data-hud=score]')).toHaveText('0');
  202 |   await advance(page, 12);
  203 | 
  204 |   await clickCephalopodControl(page, 'Help / settings');
  205 |   await page.getByLabel('Reduced motion', { exact: true }).check();
  206 |   await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  207 |   await advance(page, 2);
  208 |   const still = await buffers(page);
  209 |   await page.locator(canvas).focus();
  210 |   await page.keyboard.press('KeyE');
  211 |   await advance(page, 5);
  212 |   expect(await buffers(page)).toEqual(still);
  213 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  214 |   await expect(page.locator('[data-hud=score]')).toHaveText('0');
  215 | });
  216 | 
  217 | test('the full native strike stays continuous through contact and recovery while turning and jetting', async ({ page }) => {
  218 |   await mount(page);
  219 |   await arrangeFish(page, [0.55, 0.2, 1.25], [-17, 0, 12]);
  220 |   await page.evaluate(() => {
  221 |     const w = window as any;
  222 |     w.__strikeResources = [];
  223 |     w.__player.traverse((m: any) => {
  224 |       if (m.isMesh) w.__strikeResources.push({ m, geometry: m.geometry, material: m.material,
  225 |         attributes: Object.values(m.geometry.attributes).map((a: any) => ({ a, array: a.array })),
  226 |         matrix: m.instanceMatrix, matrixArray: m.instanceMatrix?.array });
  227 |     });
  228 |   });
  229 |   await page.keyboard.press('KeyT');
  230 |   await page.keyboard.press('KeyE');
  231 |   let previous = await pose(page), largestStep = 0;
  232 |   for (let frame = 1; frame <= 70; frame++) {
  233 |     if (frame === 27) {
  234 |       await page.keyboard.down('KeyD');
  235 |       await page.keyboard.down('KeyW');
  236 |       await page.keyboard.down('Space');
  237 |     }
> 238 |     await page.evaluate(async () => {
      |                ^ Error: page.evaluate: Test timeout of 150000ms exceeded.
  239 |       const w = window as any; w.__testStep = 0.01;
  240 |       do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  241 |       while (w.__testStep !== 0);
  242 |     });
  243 |     const current = await pose(page);
  244 |     for (let limb = 0; limb < current.length; limb++) {
  245 |       const points = current[limb].positions, prior = previous[limb].positions;
  246 |       expect(points.every(Number.isFinite)).toBe(true);
  247 |       for (let i = 0; i < points.length; i += 3) {
  248 |         largestStep = Math.max(largestStep, Math.hypot(points[i] - prior[i], points[i + 1] - prior[i + 1], points[i + 2] - prior[i + 2]));
  249 |       }
  250 |     }
  251 |     if (frame === 19) expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  252 |     if (frame === 20) {
  253 |       expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
  254 |       expect(Math.max(...current.map(p => p.distanceToTarget))).toBeLessThan(0.35);
  255 |     }
  256 |     previous = current;
  257 |   }
  258 |   await page.keyboard.up('Space'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
  259 |   // A discontinuous snap across the bounded reach would exceed this per10ms limit.
  260 |   expect(largestStep).toBeLessThan(0.25);
  261 |   expect(await page.evaluate(() => {
  262 |     const w = window as any;
  263 |     return w.__strikeResources.every((r: any) => r.m.geometry === r.geometry && r.m.material === r.material
  264 |       && r.attributes.every((a: any) => a.a.array === a.array)
  265 |       && r.m.instanceMatrix === r.matrix && r.m.instanceMatrix?.array === r.matrixArray);
  266 |   })).toBe(true);
  267 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
  268 |   expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  269 | });
  270 | 
  271 | test('reduced motion preserves a successful native strike without animating the feeding reach', async ({ page }) => {
  272 |   await mount(page);
  273 |   await arrangeFish(page, [0.45, 0.1, 1.1], [-17, 0, 12]);
  274 |   await clickCephalopodControl(page, 'Help / settings');
  275 |   await page.getByLabel('Reduced motion', { exact: true }).check();
  276 |   await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  277 |   await advance(page, 2);
  278 |   const still = await buffers(page);
  279 |   await page.locator(canvas).focus();
  280 |   await page.keyboard.press('KeyT');
  281 |   await page.keyboard.press('KeyE');
  282 |   await advance(page, 3);
  283 |   expect(await buffers(page)).toEqual(still);
  284 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  285 |   await advance(page, 1);
  286 |   expect(await buffers(page)).toEqual(still);
  287 |   expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
  288 |   await advance(page, 10);
  289 |   expect(await buffers(page)).toEqual(still);
  290 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
  291 | });
  292 | 
```