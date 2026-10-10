# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-energy-visuals.spec.ts >> 320px default energy readings and keyboard selection remain accessible
- Location: tests\e2e\physics-energy-visuals.spec.ts:202:58

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  117 |   for (const time of result.requiredTimes) expect(result.plottedTimes).toContain(time);
  118 | }
  119 | 
  120 | test('vacuum energy bands use recorded motion and height and preserve full-resolution keyboard selection', async ({ page }) => {
  121 |   await mount(page); await launch(page);
  122 |   const original = await evidence(page);
  123 |   const count = original.trails[0].points.length;
  124 |   await select(page, Math.floor(count * .37));
  125 |   const expected = await assertEnergy(page, 1); await assertBands(page);
  126 |   expect(expected.values.initialEnergy).toBe(821); expect(expected.values.totalEnergy).toBeCloseTo(821, 8); expect(expected.values.dragLoss).toBe(0);
  127 |   const slider = page.locator('[data-physics-graph-time-slider]'); await slider.focus(); await slider.press('ArrowRight');
  128 |   await expect(slider).toBeFocused(); const next = await assertEnergy(page, 1); expect(next.index).toBe(expected.index + 1);
  129 |   await expect(page.locator('[data-physics-energy-cursor]')).toHaveAttribute('data-sample-index', String(next.index));
  130 |   await expect(page.locator('[data-physics-graph-selected="vx"]')).toHaveAttribute('data-sample-index', String(next.index));
  131 |   await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-sample-index', String(next.index));
  132 |   expect(await evidence(page)).toEqual(original);
  133 | });
  134 | 
  135 | test('drag transfers energy and tapping its timeline selects the nearest original observation after controls change', async ({ page }) => {
  136 |   await mount(page); await launch(page, { angle: 45, velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  137 |   const original = await evidence(page), end = await assertEnergy(page, 1); expect(end.values.dragLoss).toBeGreaterThan(0);
  138 |   await expect(page.locator('[data-physics-energy-impact]')).toBeVisible();
  139 |   await patch(page, { angle: 80, velocity: 5, mass: 9, launchHeight: 30, gravity: 1, airResist: false });
  140 |   const svg = page.locator('[data-physics-energy-graph]'), box = (await svg.boundingBox())!;
  141 |   const position = await svg.evaluate(el => { const origin = el.querySelector('[data-physics-energy-origin]')!; return { left: Number(origin.getAttribute('x1')), right: Number(origin.getAttribute('x2')), width: (el as SVGSVGElement).viewBox.baseVal.width }; });
  142 |   const fraction = .367, wanted = original.trails[0].points.at(-1).t * fraction;
  143 |   const nearest = original.trails[0].points.reduce((best: number, pt: any, i: number, list: any[]) => Math.abs(pt.t - wanted) < Math.abs(list[best].t - wanted) ? i : best, 0);
  144 |   await svg.click({ position: { x: box.width * (position.left + (position.right - position.left) * fraction) / position.width, y: box.height * .6 } });
  145 |   const selected = await assertEnergy(page, 1); expect(selected.index).toBe(nearest); expect(selected.parameters.mass).toBe(3); expect(selected.parameters.launchHeight).toBe(20);
  146 |   await expect(page.locator('[data-physics-energy-settings]')).toContainText('m = 3 kg · v₀ = 40 m/s · g = 9.8 m/s² · h₀ = 20 m');
  147 |   await assertBands(page); expect(await evidence(page)).toEqual(original);
  148 | });
  149 | 
  150 | test('selecting an older flight switches the entire energy budget to its captured model', async ({ page }) => {
  151 |   await mount(page); await launch(page, { velocity: 30 }); await launch(page, { velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  152 |   const original = await evidence(page); await page.locator('[data-physics-run-inspect="1"]').click();
  153 |   const old = await assertEnergy(page, 1); expect(old.values.initialEnergy).toBe(1096); expect(old.values.dragLoss).toBe(0);
  154 |   await page.locator('[data-physics-run-inspect="2"]').click(); const recent = await assertEnergy(page, 2); expect(recent.values.initialEnergy).toBe(2988); expect(recent.values.dragLoss).toBeGreaterThan(0);
  155 |   await assertBands(page); expect(await evidence(page)).toEqual(original);
  156 | });
  157 | 
  158 | test('paused launch has a truthful single-sample budget and a short flight keeps its exact impact time', async ({ page }) => {
  159 |   await mount(page); await patch(page, { angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, simSpeed: 0, showGraphs: true, showFlightData: true });
  160 |   await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  161 |   await selectAnalysisView(page, 'energy');
  162 |   await expect(page.locator('[data-physics-energy-single-sample]')).toBeVisible(); await expect(page.locator('[data-physics-energy-graph]')).toHaveCount(0);
  163 |   const current = await page.locator('[data-physics-energy-value="initialEnergy"]').getAttribute('data-value'); expect(Number(current)).toBe(421);
  164 |   await page.getByRole('button', { name: 'Advance 0.035 seconds (available when paused)', exact: true }).click();
  165 |   await page.evaluate(() => (window as any).__energyTick());
  166 |   await expect(page.locator('[data-physics-energy-graph]')).toBeVisible();
  167 |   await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  168 |   await page.evaluate(() => (window as any).__energyTick());
  169 |   await expect(page.locator('[data-physics-energy-panel]')).toHaveCount(0);
  170 |   await launch(page, { angle: 5, velocity: 5, gravity: 25, mass: 1, launchHeight: 0 });
  171 |   const result = await assertEnergy(page, 1); expect(result.t).toBeLessThan(.035); expect(result.values.pe).toBe(0); await assertBands(page);
  172 |   await expect(page.locator('[data-physics-energy-graph]')).toHaveAttribute('data-plotted-count', '3');
  173 | });
  174 | 
  175 | test('unsupported sample metadata does not borrow current controls for an energy timeline', async ({ page }) => {
  176 |   await mount(page); await launch(page);
  177 |   await page.evaluate(() => { (document.getElementById('physicsCanvas') as any)._trails[0].modelVersion = 'unknown-model'; });
  178 |   await patch(page, { mass: 9, gravity: 1, velocity: 5 });
  179 |   await expect(page.locator('[data-physics-energy-unavailable]')).toBeVisible();
  180 |   await expect(page.locator('[data-physics-energy-graph]')).toHaveCount(0); await expect(page.locator('[data-physics-energy-value]')).toHaveCount(0);
  181 |   await page.evaluate(() => { const trail = (document.getElementById('physicsCanvas') as any)._trails[0]; trail.modelVersion = (window as any).StemLab._physics.MODEL_VERSION; trail[0].mY = -1; });
  182 |   await patch(page, { velocity: 6 });
  183 |   await expect(page.locator('[data-physics-energy-unavailable]')).toBeVisible();
  184 |   await expect(page.locator('[data-physics-energy-value]')).toHaveCount(0);
  185 | });
  186 | 
  187 | test('fractional-joule and maximum energy axes fit a phone without clipping labels', async ({ page }) => {
  188 |   await page.setViewportSize({ width: 320, height: 900 }); await mount(page);
  189 |   for (const values of [{ velocity: 40, gravity: 9.81, mass: 1, launchHeight: 19 }, { angle: 85, velocity: 50, gravity: 25, mass: 10, launchHeight: 50 }]) {
  190 |     await launch(page, values);
  191 |     const bounds = await page.locator('[data-physics-energy-graph]').evaluate(el => {
  192 |       const svg = el as SVGSVGElement;
  193 |       return { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, labels: [...svg.querySelectorAll('text')].map(text => { const b = text.getBBox(); return { text: text.textContent, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height }; }) };
  194 |     });
  195 |     for (const label of bounds.labels) { expect(label.left, label.text!).toBeGreaterThanOrEqual(-1); expect(label.top, label.text!).toBeGreaterThanOrEqual(-1); expect(label.right, label.text!).toBeLessThanOrEqual(bounds.width + 1); expect(label.bottom, label.text!).toBeLessThanOrEqual(bounds.height + 1); }
  196 |     await assertBands(page);
  197 |     expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  198 |   }
  199 |   await expect(page.locator('[data-physics-energy-value="initialEnergy"]')).toHaveText('25000.00 J');
  200 | });
  201 | 
  202 | for (const theme of ['default', 'dark', 'contrast']) test(`320px ${theme} energy readings and keyboard selection remain accessible`, async ({ page }) => {
  203 |   await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  204 |   await page.evaluate(t => { const wrap = document.getElementById('wrap')!, main = document.createElement('main'), card = document.createElement('div'); wrap.parentElement!.insertBefore(main, wrap); main.append(card); card.append(wrap); main.className = 'main-content ' + (t === 'default' ? '' : 'theme-' + t); card.className = 'card'; const ctx = (window as any).__ctx; ctx.isDark = t === 'dark'; ctx.isContrast = t === 'contrast'; (window as any).__rerender(); }, theme);
  205 |   await launch(page, { angle: 45, velocity: 40, mass: 3, launchHeight: 20, airResist: true });
  206 |   const original = await evidence(page), slider = page.locator('[data-physics-graph-time-slider]'); await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  207 |   await expect(slider).toBeFocused(); const result = await assertEnergy(page, 1); expect(result.index).toBe(1); await assertBands(page);
  208 |   await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
  209 |   const layout = await page.locator('[data-physics-energy-panel]').evaluate(root => ({ overflow: document.documentElement.scrollWidth - innerWidth, fonts: [...root.querySelectorAll('svg text')].map(el => { const matrix = (el as SVGTextElement).getScreenCTM()!; return parseFloat(getComputedStyle(el).fontSize) * Math.hypot(matrix.a, matrix.b); }), patterns: [...root.querySelectorAll('pattern')].map(el => el.id) }));
  210 |   expect(layout.overflow).toBe(0); expect(layout.fonts.every(v => v >= 11.99)).toBe(true); expect(layout.patterns).toHaveLength(2); expect(await evidence(page)).toEqual(original);
  211 |   const contrast = await page.locator('[data-physics-energy-graph]').evaluate(svg => {
  212 |     const lum = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  213 |     const bands = [svg.querySelector('[data-physics-energy-area="ke"]')!, ...svg.querySelectorAll('pattern rect')].map(el => getComputedStyle(el).fill);
  214 |     const marks = [svg.querySelector('[data-physics-energy-cursor]')!, ...svg.querySelectorAll('[data-physics-energy-boundary]')].map(el => getComputedStyle(el).stroke);
  215 |     return marks.flatMap(mark => bands.map(band => { const a = lum(mark), b = lum(band); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
  216 |   });
> 217 |   expect(contrast.every(value => value >= 3)).toBe(true);
      |                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  218 | });
  219 | 
```