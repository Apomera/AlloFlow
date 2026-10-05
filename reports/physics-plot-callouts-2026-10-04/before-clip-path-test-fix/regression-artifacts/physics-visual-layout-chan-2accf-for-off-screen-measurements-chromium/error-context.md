# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-visual-layout.spec.ts >> changing a landed flight previews the next launch and hides annotations for off-screen measurements
- Location: tests\e2e\physics-visual-layout.spec.ts:270:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 4
+ Received  + 4

  Array [
-   40,
-   128,
-   256,
-   226,
+   16.65234375,
+   167.5,
+   16.173828125,
+   12.5,
  ]
```

# Test source

```ts
  227 |     expect(point.x).toBeLessThanOrEqual(descending.layout.width);
  228 |     expect(point.y).toBeGreaterThanOrEqual(descending.layout.plotTop);
  229 |     expect(point.y).toBeLessThanOrEqual(descending.layout.groundY);
  230 |   }
  231 | 
  232 |   await setState(page, { simSpeed: 1 });
  233 |   const result = await page.evaluate(() => {
  234 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  235 |     let ticks = 0;
  236 |     while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
  237 |     const trail = cv._trails.at(-1);
  238 |     return {
  239 |       landed: !cv._launched, vectors: cv._visualVectors,
  240 |       range: cv._ball.mX, time: cv._ball.t, maxH: cv._ball.maxH, energy: cv._ball.E0,
  241 |       parameters: trail.parameters,
  242 |       samples: [...trail] as Array<{ mX: number; mY: number; mVx: number; mVy: number; t: number }>,
  243 |     };
  244 |   });
  245 |   // Independent constant-gravity equations ensure the redraw did not change the data.
  246 |   const vx = 50 * Math.cos(Math.PI / 4), vy = 50 * Math.sin(Math.PI / 4);
  247 |   const time = (vy + Math.sqrt(vy * vy + 2 * 25 * 50)) / 25;
  248 |   expect(result.landed).toBe(true);
  249 |   expect(result.vectors).toBeNull();
  250 |   expect(result.time).toBeCloseTo(time, 9);
  251 |   expect(result.range).toBeCloseTo(vx * time, 9);
  252 |   expect(result.maxH).toBeCloseTo(50 + vy * vy / (2 * 25), 9);
  253 |   expect(result.energy).toBeCloseTo(2500, 9);
  254 |   expect(result.parameters).toMatchObject({ angle: 45, velocity: 50, gravity: 25, launchHeight: 50, mass: 1 });
  255 |   expect(result.samples.length).toBeGreaterThan(50);
  256 |   for (const sample of result.samples) {
  257 |     expect(sample.mX).toBeCloseTo(vx * sample.t, 8);
  258 |     expect(sample.mY).toBeCloseTo(50 + vy * sample.t - 0.5 * 25 * sample.t * sample.t, 8);
  259 |     expect(sample.mVx).toBeCloseTo(vx, 9);
  260 |     expect(sample.mVy).toBeCloseTo(vy - 25 * sample.t, 8);
  261 |   }
  262 |   expect(result.samples.at(-1)?.mY).toBe(0);
  263 |   await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  264 |   const saved = await page.evaluate(() => (window as any).__toolData.physics.runLog[0]);
  265 |   expect(saved).toMatchObject({ angle: 45, vel: 50, grav: 25, launchHeight: 50, mass: 1, modelVersion: 'projectile-v3' });
  266 |   expect(saved.range).toBeCloseTo(result.range, 9);
  267 |   expect(saved.time).toBeCloseTo(result.time, 9);
  268 | });
  269 | 
  270 | test('changing a landed flight previews the next launch and hides annotations for off-screen measurements', async ({ page }) => {
  271 |   await page.setViewportSize({ width: 320, height: 900 });
  272 |   await mount(page);
  273 |   await setState(page, {
  274 |     angle: 45, velocity: 50, gravity: 9.8, launchHeight: 0, mass: 1,
  275 |     airResist: false, simSpeed: 1, showOverlay: false, showFormulas: false,
  276 |   });
  277 |   await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  278 |   await page.evaluate(() => {
  279 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  280 |     let ticks = 0;
  281 |     while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
  282 |     if (cv._launched) throw new Error('Reference flight did not land');
  283 |   });
  284 |   await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  285 |   const before = await page.evaluate(() => {
  286 |     const cv = document.getElementById('physicsCanvas') as any;
  287 |     return { samples: [...cv._trails.at(-1)], records: (window as any).__toolData.physics.runLog };
  288 |   });
  289 |   // Record the actual clipping call without replacing the browser canvas renderer.
  290 |   await page.evaluate(() => {
  291 |     const w = window as any, cv = document.getElementById('physicsCanvas') as HTMLCanvasElement;
  292 |     const ctx = cv.getContext('2d')!;
  293 |     const nativeRect = ctx.rect, nativeClip = ctx.clip;
  294 |     let rect: number[] | null = null;
  295 |     w.__physicsPlotClips = [];
  296 |     ctx.rect = function (x, y, width, height) {
  297 |       const dpr = cv.width / cv.offsetWidth;
  298 |       rect = [x, y, width, height].map(value => value / dpr);
  299 |       nativeRect.call(this, x, y, width, height);
  300 |     };
  301 |     ctx.clip = function (...args: any[]) {
  302 |       w.__physicsPlotClips.push(rect && [...rect]);
  303 |       (nativeClip as any).apply(this, args);
  304 |     };
  305 |   });
  306 |   await setState(page, { angle: 5, velocity: 5, simSpeed: 0 });
  307 |   const next = await readDraw(page);
  308 |   expect(next.launched).toBe(false);
  309 |   expect(next.preview).toMatchObject({ kind: 'preview', angle: 5, velocity: 5, gravity: 9.8, launchHeight: 0 });
  310 |   expect(next.preview.range).toBeCloseTo(25 * Math.sin(10 * Math.PI / 180) / 9.8, 9);
  311 |   expect(next.text.some(item => item.text === 'Vacuum preview')).toBe(true);
  312 |   expect(next.layout.labels.map(box => box.id)).not.toContain('apex');
  313 |   expect(next.layout.labels.map(box => box.id)).not.toContain('landing');
  314 |   expectReadableDraw(next, 'phone preview after a long completed flight');
  315 |   const after = await page.evaluate(() => {
  316 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  317 |     return {
  318 |       samples: [...cv._trails.at(-1)], records: w.__toolData.physics.runLog,
  319 |       oldLandingX: cv._launchView.x + cv._ball.mX * cv._launchView.scale,
  320 |       clips: w.__physicsPlotClips as number[][],
  321 |     };
  322 |   });
  323 |   expect(after.oldLandingX).toBeGreaterThan(next.layout.width);
  324 |   expect({ samples: after.samples, records: after.records }).toEqual(before);
  325 |   expect(after.clips.length).toBeGreaterThan(0);
  326 |   for (const clip of after.clips) {
> 327 |     expect(clip).toEqual([
      |                  ^ Error: expect(received).toEqual(expected) // deep equality
  328 |       next.view.x, next.layout.plotTop,
  329 |       next.layout.width - next.view.x - 20, next.layout.groundY - next.layout.plotTop,
  330 |     ]);
  331 |   }
  332 | });
  333 | 
  334 | test('apex, prediction, and landing leaders attach to their true flight coordinates', async ({ page }) => {
  335 |   await page.setViewportSize({ width: 1100, height: 900 });
  336 |   await mount(page);
  337 |   await setState(page, {
  338 |     angle: 45, velocity: 25, gravity: 9.8, launchHeight: 0, mass: 1,
  339 |     airResist: false, simSpeed: 1, showFormulas: true, showOverlay: false,
  340 |   });
  341 |   await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  342 |   await page.evaluate(() => {
  343 |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  344 |     let ticks = 0;
  345 |     while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
  346 |     if (cv._launched) throw new Error('Reference flight did not land');
  347 |   });
  348 |   await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  349 |   const draw = await readDraw(page);
  350 |   expectReadableDraw(draw, 'completed desktop flight with measured leaders');
  351 |   const range = 25 * 25 / 9.8;
  352 |   const height = Math.pow(25 * Math.sin(Math.PI / 4), 2) / (2 * 9.8);
  353 |   const expected = {
  354 |     apex: { x: draw.view.x + range * draw.view.scale / 2, y: draw.view.groundY - height * draw.view.scale },
  355 |     prediction: { x: draw.view.x + range * draw.view.scale, y: draw.view.groundY - 30 },
  356 |     landing: { x: draw.view.x + range * draw.view.scale, y: draw.view.groundY },
  357 |   };
  358 |   for (const [id, point] of Object.entries(expected)) {
  359 |     const label = draw.layout.labels.find(box => box.id === id);
  360 |     expect(label, id + ' annotation is rendered').toBeTruthy();
  361 |     expect(label!.anchor.x, id + ' true horizontal anchor').toBeCloseTo(point.x, 8);
  362 |     expect(label!.anchor.y, id + ' true vertical anchor').toBeCloseTo(point.y, 8);
  363 |   }
  364 | });
  365 | 
```