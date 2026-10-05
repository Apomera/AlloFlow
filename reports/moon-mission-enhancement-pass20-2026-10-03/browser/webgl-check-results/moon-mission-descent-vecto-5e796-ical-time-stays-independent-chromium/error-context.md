# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-vectors.spec.ts >> WebGL flight vectors follow engine and attitude response while physical time stays independent
- Location: tests\e2e\moon-mission-descent-vectors.spec.ts:139:5

# Error details

```
Error: locator.selectOption: Error: strict mode violation: locator('[data-descent-camera]') resolved to 2 elements:
    1) <canvas width="1014" height="420" aria-hidden="true" data-descent-gl="true" data-descent-camera="chase" data-descent-model="apollo-shared"></canvas> aka locator('canvas').nth(1)
    2) <select id="moon-descent-camera" data-descent-camera="true" aria-describedby="moon-descent-camera-help">…</select> aka getByLabel('Flight camera')

Call log:
  - waiting for locator('[data-descent-camera]')

```

# Test source

```ts
  47  |       x: row.x, elapsed: row.t, contact: row.alt <= 0 } : cv._descentState();
  48  |     const g = P.descentVectorGeometry(s), panes: any[] = [];
  49  |     for (const name of ['motion', 'forces']) {
  50  |       if (name === 'forces' && !g.forces) continue;
  51  |       const svg = root.querySelector('[data-descent-vector-diagram="' + name + '"]') as SVGSVGElement, matrix = svg.getScreenCTM()!;
  52  |       const geometry = name === 'motion' ? g.motion : g.forces;
  53  |       const ends = (name === 'motion' ? ['velocity'] : ['engine', 'gravity', 'net']).map(key => {
  54  |         const a = name === 'motion' ? g.motion.arrow : g.forces.arrows[key], n = svg.querySelector('[data-descent-vector-ring="' + key + '"]')!;
  55  |         return { key, x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')), expected: a,
  56  |           visible: getComputedStyle(svg.querySelector('[data-descent-vector-arrow="' + key + '"]')!).display !== 'none' };
  57  |       });
  58  |       panes.push({ name, scaleX: matrix.a, scaleY: matrix.d, range: Number(svg.dataset.vectorRange), expectedRange: geometry.range, ends });
  59  |     }
  60  |     return { state: s, geometry: g, actualThrottle: Number(root.dataset.descentVectorActualThrottle), time, panes };
  61  |   });
  62  |   expect(measured.actualThrottle).toBe(measured.geometry.sample.actualThrottle); expect(measured.time).toBeCloseTo(measured.state.elapsed, 8);
  63  |   for (const pane of measured.panes) {
  64  |     expect(pane.scaleX).toBeCloseTo(pane.scaleY, 8); expect(pane.range).toBe(pane.expectedRange);
  65  |     for (const end of pane.ends) { expect(end.x).toBeCloseTo(end.expected.x, 8); expect(end.y).toBeCloseTo(end.expected.y, 8); expect(end.visible).toBe(end.expected.visible); }
  66  |   }
  67  |   return measured;
  68  | }
  69  | 
  70  | test.describe('fallback flight vector instruments', () => {
  71  |   test.beforeEach(async ({ page }) => page.addInitScript(() => {
  72  |     const original = HTMLCanvasElement.prototype.getContext;
  73  |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  74  |       if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  75  |     };
  76  |   }));
  77  | 
  78  |   test('paused desktop vectors show actual measurements and do not operate the lander', async ({ page }, info) => {
  79  |     await mount(page); const root = page.locator('[data-descent-vectors]'), before = await flight(page), receipt = await evidence(page);
  80  |     await expect(root).not.toHaveAttribute('open', ''); await expect(root).not.toHaveAttribute('data-descent-vector-available', 'true');
  81  |     await open(page); const first = await check(page); expect(first.geometry.forces.range).toBe(10); expect(first.actualThrottle).toBe(0);
  82  |     await page.locator('[data-descent-throttle]').fill('65'); await expect(page.locator('[data-throttle-setting]')).toHaveText('65%');
  83  |     await check(page); await expect(page.locator('[data-descent-vector-value="thrust"]')).toHaveText('0.00 kN');
  84  |     expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  85  |     expect(await page.evaluate(() => Object.keys((window as any).__toolData.moonMission).filter(key => /vector/i.test(key)))).toEqual([]);
  86  |     await capture(page, info, 'desktop-coast'); await capture(page, info, 'coast-vector-diagrams', '[data-descent-vector-content]'); await axe(page, 'desktop');
  87  |   });
  88  | 
  89  |   test('recorded tilted burn and contact preserve receipts and omit missing legacy vectors', async ({ page }, info) => {
  90  |     await mount(page);
  91  |     const result = await page.evaluate(() => {
  92  |       const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
  93  |       const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
  94  |       for (let i = 0; i < 3000 && !s.contact; i++) {
  95  |         P.descentStep(s, s.elapsed >= 2 && s.elapsed < 4 ? { throttle: .65, left: true } : {}, 1 / 60);
  96  |         P.recordDescent(rec, s, !!s.contact);
  97  |       }
  98  |       return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  99  |     });
  100 |     await mount(page, seed({ landingResult: result, landingAttempts: [result] })); const receipt = await evidence(page); await open(page);
  101 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false');
  102 |     const terminal = await check(page); expect(terminal.geometry.forces).toBeNull();
  103 |     await expect(page.locator('[data-descent-vector-plot="forces"]')).toBeHidden(); await capture(page, info, 'contact-velocity');
  104 |     await page.locator('[data-landing-scrub]').fill('6');
  105 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'true');
  106 |     await expect.poll(async () => Number(await page.locator('[data-descent-vectors]').getAttribute('data-descent-vector-time'))).toBeCloseTo(result.recording.samples[6].t, 8);
  107 |     const burn = await check(page); expect(burn.geometry.sample.forces.engine.x).toBeLessThan(0); expect(burn.geometry.sample.velocity.x).toBeGreaterThan(0);
  108 |     await capture(page, info, 'recorded-tilted-burn'); await capture(page, info, 'tilted-vector-diagrams', '[data-descent-vector-content]');
  109 |     await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  110 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false'); await check(page);
  111 |     expect(await evidence(page)).toEqual(receipt);
  112 |     await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: 2, fuel: 70 } }));
  113 |     const legacy = await evidence(page); await page.locator('[data-descent-vectors] > summary').click();
  114 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'false');
  115 |     await expect(page.locator('[data-descent-vector-content]')).toBeHidden(); await expect(page.locator('[data-descent-vector-source-label]')).toContainText('no recorded state');
  116 |     expect(await evidence(page)).toEqual(legacy); await capture(page, info, 'legacy-no-vectors');
  117 |   });
  118 | 
  119 |   test('320 px flight vectors support keyboard, reduced motion and forced colors', async ({ page }, info) => {
  120 |     await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  121 |     const before = await flight(page), receipt = await evidence(page), summary = page.locator('[data-descent-vectors] > summary');
  122 |     await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
  123 |     await check(page); expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  124 |     const fonts = await page.locator('[data-descent-vectors] p, [data-descent-vectors] dl, [data-descent-vectors] figcaption')
  125 |       .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  126 |     expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  127 |     const motion = await page.locator('[data-descent-vector-diagram="motion"]').boundingBox(), forces = await page.locator('[data-descent-vector-diagram="forces"]').boundingBox();
  128 |     expect(forces!.y).toBeGreaterThan(motion!.y + motion!.height); await capture(page, info, 'phone-320'); await axe(page, 'phone');
  129 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await check(page);
  130 |     await expect(page.locator('[data-descent-vector-arrow="gravity"]')).toHaveCSS('stroke-dasharray', '5px, 4px');
  131 |     await expect(page.locator('[data-descent-vector-arrow="net"]')).toHaveCSS('stroke-dasharray', '1px, 4px');
  132 |     await expect(page.locator('[data-descent-vector-arrow="velocity"]')).toHaveCSS('stroke-dasharray', 'none');
  133 |     await capture(page, info, 'phone-forced-colors'); await axe(page, 'phone-forced');
  134 |     await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-vectors]')).not.toHaveAttribute('open', '');
  135 |     expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  136 |   });
  137 | });
  138 | 
  139 | test('WebGL flight vectors follow engine and attitude response while physical time stays independent', async ({ page }, info) => {
  140 |   await mount(page); await open(page); const before = await flight(page), receipt = await evidence(page);
  141 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  142 |   await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))?.draws || 0, { timeout: 30000 }).toBeGreaterThan(0);
  143 |   const contexts = await harness.glContexts(page); expect(contexts.some(c => c.createdBy === 'page' && !c.lost && c.draws > 0)).toBe(true);
  144 |   const pausedScene = await harness.glScene(page, '[data-descent-session]');
  145 |   await page.waitForTimeout(300);
  146 |   expect((await harness.glScene(page, '[data-descent-session]'))!.draws).toBe(pausedScene!.draws);
> 147 |   await page.locator('[data-descent-camera]').selectOption('overhead');
      |                                               ^ Error: locator.selectOption: Error: strict mode violation: locator('[data-descent-camera]') resolved to 2 elements:
  148 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'overhead');
  149 |   const overheadScene = await harness.glScene(page, '[data-descent-session]'); expect(overheadScene!.draws).toBeGreaterThan(pausedScene!.draws);
  150 |   await page.setViewportSize({ width: 1000, height: 900 });
  151 |   await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))!.draws).toBeGreaterThan(overheadScene!.draws);
  152 |   await page.locator('[data-descent-camera]').selectOption('chase');
  153 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'chase');
  154 |   expect(await flight(page)).toEqual(before);
  155 |   await page.locator('[data-descent-throttle]').fill('65'); await page.locator('[data-descent-pause]').click();
  156 |   const cv = page.locator('[data-descent-canvas]'); await cv.focus(); await page.keyboard.down('d');
  157 |   await expect.poll(async () => (await flight(page)).elapsed).toBeGreaterThan(.8);
  158 |   await page.locator('[data-descent-pause]').click(); await page.keyboard.up('d');
  159 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  160 |   const held = await flight(page);
  161 |   await expect.poll(async () => Number(await page.locator('[data-descent-vectors]').getAttribute('data-descent-vector-time'))).toBeCloseTo(held.elapsed, 8);
  162 |   const measured = await check(page); expect(measured.state.fuel).toBeLessThan(before.fuel); expect(measured.state.hVel).toBeGreaterThan(before.hVel);
  163 |   expect(measured.geometry.sample.forces.net.x).toBeGreaterThan(0); expect(measured.actualThrottle).toBeGreaterThan(.6); expect(measured.state.tilt).toBeGreaterThan(.3);
  164 |   const heldScene = await harness.glScene(page, '[data-descent-session]');
  165 |   await page.waitForTimeout(300);
  166 |   expect((await harness.glScene(page, '[data-descent-session]'))!.draws).toBe(heldScene!.draws);
  167 |   expect(await flight(page)).toEqual(held);
  168 |   expect(await evidence(page)).toEqual(receipt); await capture(page, info, 'live-tilted-burn');
  169 |   await capture(page, info, 'flight-view-webgl', '[data-descent-canvas]');
  170 |   await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ contexts, scene: await harness.glScene(page, '[data-descent-session]'),
  171 |     pausedScene, overheadScene, heldScene, unchangedPausedDraws: true, cameraAndResizeRedraw: true, before, held }, null, 2));
  172 | });
  173 | 
```