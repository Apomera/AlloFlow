# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 36-astronomy-constellations-skymap.spec.ts >> Astronomy constellation and Sky Map visuals - real Chromium >> Sky Map layer controls, target halo, status, and diagram stay synchronized
- Location: tests\e2e\36-astronomy-constellations-skymap.spec.ts:236:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('group', { name: 'Sky map layers' }).getByRole('button')
Expected: 5
Received: 6
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for getByRole('group', { name: 'Sky map layers' }).getByRole('button')
    33 × locator resolved to 6 elements
       - unexpected value "6"

```

# Test source

```ts
  149 |   expect(events.rejections).toEqual([]);
  150 |   expect(issues).toEqual([]);
  151 | }
  152 | 
  153 | async function selectVisibleSkyTarget(page: Pg) {
  154 |   const target = page.getByLabel('Sky map target');
  155 |   const values = await target.locator('option').evaluateAll((options) =>
  156 |     options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  157 |   for (const value of values) {
  158 |     await target.selectOption(value);
  159 |     const status = page.locator('#astronomy-sky-target-status');
  160 |     await expect(status).not.toHaveText('Overview shows all enabled sky layers.');
  161 |     if ((await status.innerText()).includes('highlighted:')) return value;
  162 |   }
  163 |   throw new Error('The target selector did not contain an above-horizon body');
  164 | }
  165 | 
  166 | test.describe.configure({ timeout: 120_000 });
  167 | 
  168 | test.describe('Astronomy constellation and Sky Map visuals - real Chromium', () => {
  169 |   test.afterEach(async ({ page }) => {
  170 |     await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  171 |   });
  172 | 
  173 |   test('constellation gallery has 15 accessible figures and a working selected detail', async ({ page }) => {
  174 |     await page.setViewportSize({ width: 1180, height: 1000 });
  175 |     const issues = collectBrowserIssues(page);
  176 |     await mount(page, 'constellations');
  177 | 
  178 |     const gallery = page.locator('#astronomy-constellation-gallery');
  179 |     const cards = gallery.getByRole('button');
  180 |     const figures = gallery.locator('svg[data-constellation-figure]');
  181 |     await expect(cards).toHaveCount(15);
  182 |     await expect(figures).toHaveCount(15);
  183 | 
  184 |     const labelledBy = await figures.evaluateAll((svgs) => svgs.map((svg) => svg.getAttribute('aria-labelledby') || ''));
  185 |     expect(new Set(labelledBy).size).toBe(15);
  186 |     for (const ids of labelledBy) {
  187 |       const [titleId, descId] = ids.split(/\s+/);
  188 |       expect(titleId).toBeTruthy();
  189 |       expect(descId).toBeTruthy();
  190 |       await expect(page.locator(`#${titleId}`)).toHaveCount(1);
  191 |       await expect(page.locator(`#${descId}`)).toHaveCount(1);
  192 |     }
  193 |     expect(await figures.locator('[data-constellation-line="true"]').count()).toBeGreaterThan(40);
  194 |     expect(await figures.locator('[data-constellation-star="true"]').count()).toBeGreaterThan(70);
  195 | 
  196 |     const orion = gallery.getByRole('button', { name: /^Orion,/ });
  197 |     await orion.click();
  198 |     await expect(orion).toHaveAttribute('aria-pressed', 'true');
  199 |     const detail = page.getByRole('region', { name: 'Orion details' });
  200 |     await expect(detail).toBeVisible();
  201 |     await expect(detail.getByRole('status')).toHaveText('Orion selected');
  202 |     await expect(detail.locator('svg[data-constellation-figure="orion"]')).toHaveCount(1);
  203 |     await expect(detail.getByText('Modern Western recognition guide', { exact: true })).toBeVisible();
  204 | 
  205 |     await expectNoDocumentOverflow(page);
  206 |     await expectNoRuntimeIssues(page, issues);
  207 |   });
  208 | 
  209 |   test('constellation cards and detail reflow without horizontal overflow at 320px', async ({ page }) => {
  210 |     await page.setViewportSize({ width: 320, height: 1100 });
  211 |     const issues = collectBrowserIssues(page);
  212 |     await mount(page, 'constellations');
  213 | 
  214 |     const gallery = page.locator('#astronomy-constellation-gallery');
  215 |     await gallery.getByRole('button', { name: /^Cassiopeia,/ }).click();
  216 |     const detail = page.getByRole('region', { name: 'Cassiopeia details' });
  217 |     await expect(detail).toBeVisible();
  218 |     const geometry = await page.evaluate(() => {
  219 |       const rect = (selector: string) => {
  220 |         const r = document.querySelector(selector)!.getBoundingClientRect();
  221 |         return { left: r.left, right: r.right, width: r.width };
  222 |       };
  223 |       return {
  224 |         gallery: rect('#astronomy-constellation-gallery'),
  225 |         detail: rect('#astronomy-constellation-detail'),
  226 |       };
  227 |     });
  228 |     expect(geometry.gallery.left).toBeGreaterThanOrEqual(-0.5);
  229 |     expect(geometry.gallery.right).toBeLessThanOrEqual(320.5);
  230 |     expect(geometry.detail.left).toBeGreaterThanOrEqual(-0.5);
  231 |     expect(geometry.detail.right).toBeLessThanOrEqual(320.5);
  232 |     await expectNoDocumentOverflow(page);
  233 |     await expectNoRuntimeIssues(page, issues);
  234 |   });
  235 | 
  236 |   test('Sky Map layer controls, target halo, status, and diagram stay synchronized', async ({ page }) => {
  237 |     await page.setViewportSize({ width: 1180, height: 1000 });
  238 |     const issues = collectBrowserIssues(page);
  239 |     await mount(page, 'skymap');
  240 | 
  241 |     const layers = page.getByRole('group', { name: 'Sky map layers' });
  242 |     const contracts = [
  243 |       ['Stars', 'stars'],
  244 |       ['Constellation lines', 'constellation-lines'],
  245 |       ['Planets', 'planets'],
  246 |       ['Sun and Moon', 'sun-moon'],
  247 |       ['Ecliptic', 'ecliptic'],
  248 |     ] as const;
> 249 |     await expect(layers.getByRole('button')).toHaveCount(5);
      |                                              ^ Error: expect(locator).toHaveCount(expected) failed
  250 |     for (const [label, dataLayer] of contracts) {
  251 |       const button = layers.getByRole('button', { name: label, exact: true });
  252 |       await expect(button).toHaveAttribute('aria-pressed', 'true');
  253 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
  254 |       await button.click();
  255 |       await expect(button).toHaveAttribute('aria-pressed', 'false');
  256 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(0);
  257 |       await button.click();
  258 |       await expect(button).toHaveAttribute('aria-pressed', 'true');
  259 |       await expect(page.locator(`[data-sky-layer="${dataLayer}"]`)).toHaveCount(1);
  260 |     }
  261 | 
  262 |     const target = page.getByLabel('Sky map target');
  263 |     const initialControlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
  264 |     expect(initialControlledIds).toContain('astronomy-sky-map-diagram');
  265 |     const selectedValue = await selectVisibleSkyTarget(page);
  266 |     expect(selectedValue).not.toBe('');
  267 |     const controlledIds = ((await target.getAttribute('aria-controls')) || '').split(/\s+/);
  268 |     expect(controlledIds).toEqual(expect.arrayContaining([
  269 |       'astronomy-sky-map-diagram', 'astronomy-sky-target-timeline',
  270 |     ]));
  271 |     await expect(page.locator('[data-sky-layer="target"]')).toHaveCount(1);
  272 |     await expect(page.locator('#astronomy-sky-target-status')).toContainText('highlighted:');
  273 |     await expect(page.locator('#astronomy-sky-map-diagram')).toContainText('TARGET');
  274 |     const targetDetail = page.locator('#astronomy-sky-target-detail');
  275 |     await expect(targetDetail).toBeVisible();
  276 |     await expect(targetDetail).toContainText('Altitude');
  277 |     await expect(targetDetail).toContainText('Next horizon event');
  278 |     await expect(targetDetail).toContainText('Highest in next 12 hours');
  279 |     const timeline = page.locator('#astronomy-sky-target-timeline');
  280 |     await expect(timeline).toBeVisible();
  281 |     await expect(timeline).toHaveAttribute('data-sky-target', selectedValue);
  282 |     const timelineFigure = timeline.locator('svg[data-sky-target-timeline]');
  283 |     await expect(timelineFigure).toHaveAttribute('role', 'img');
  284 |     await expect(timelineFigure).toHaveAttribute('data-duration-hours', '12');
  285 |     await expect(timelineFigure.locator('title')).toHaveCount(1);
  286 |     await expect(timelineFigure.locator('desc')).toHaveCount(1);
  287 |     await expect(timelineFigure.locator('[data-sky-twilight-bands] [data-twilight-band]')).not.toHaveCount(0);
  288 |     await expect(timelineFigure.locator('[data-sky-axis="x"]')).toHaveCount(1);
  289 |     await expect(timelineFigure.locator('[data-sky-axis="y"]')).toHaveCount(1);
  290 |     await expect(timelineFigure.locator('[data-sky-horizon]')).toHaveCount(1);
  291 |     await expect(timelineFigure.locator('[data-sky-altitude-path]')).toHaveCount(1);
  292 |     await expect(timelineFigure.locator('[data-sky-altitude-sample]')).not.toHaveCount(0);
  293 |     const diagram = page.locator('#astronomy-sky-map-diagram');
  294 |     await expect(diagram).toHaveAttribute('role', 'img');
  295 |     await expect(diagram).toHaveAttribute('aria-label', /north at top, east at left/i);
  296 |     await expect(diagram).toHaveAttribute('aria-label', /solid gold motion arc[^.]*next 12 hours/i);
  297 |     const targetTrack = diagram.locator('[data-sky-target-track]');
  298 |     await expect(targetTrack).toHaveCount(1);
  299 |     await expect(targetTrack).toHaveAttribute('data-sky-target', selectedValue);
  300 |     await expect(targetTrack).toHaveAttribute('clip-path', 'url(#astronomy-sky-dome-clip)');
  301 |     await expect(targetTrack.locator('[data-sky-target-track-segment]')).not.toHaveCount(0);
  302 |     const segmentCount = await targetTrack.locator('[data-sky-target-track-segment]').count();
  303 |     await expect(targetTrack).toHaveAttribute('data-segment-count', String(segmentCount));
  304 |     await expect(targetTrack).toHaveAttribute('data-visible-sample-count', /^\d+$/);
  305 |     expect(Number(await targetTrack.getAttribute('data-visible-sample-count'))).toBeGreaterThan(0);
  306 |     const segmentContracts = await targetTrack.locator('[data-sky-target-track-segment]').evaluateAll((segments) =>
  307 |       segments.map((segment) => ({
  308 |         d: segment.getAttribute('d') || '',
  309 |         markerEnd: segment.getAttribute('marker-end'),
  310 |         pointCount: Number(segment.getAttribute('data-point-count')),
  311 |       })));
  312 |     for (const segment of segmentContracts) {
  313 |       expect(segment.d).toMatch(/^M/i);
  314 |       expect(segment.d).not.toMatch(/NaN|Infinity|undefined/i);
  315 |       expect(segment.markerEnd).toBe('url(#astronomy-sky-target-track-arrow)');
  316 |       expect(segment.pointCount).toBeGreaterThan(1);
  317 |     }
  318 |     const waypointContracts = await targetTrack.locator('[data-sky-target-track-sample]').evaluateAll((samples) =>
  319 |       samples.map((sample) => ({
  320 |         hour: Number(sample.getAttribute('data-hour-offset')),
  321 |         altitude: Number(sample.getAttribute('data-altitude')),
  322 |         azimuth: Number(sample.getAttribute('data-azimuth')),
  323 |         x: Number(sample.getAttribute('cx')),
  324 |         y: Number(sample.getAttribute('cy')),
  325 |       })));
  326 |     for (const waypoint of waypointContracts) {
  327 |       expect([4, 8, 12]).toContain(waypoint.hour);
  328 |       expect([waypoint.altitude, waypoint.azimuth, waypoint.x, waypoint.y].every(Number.isFinite)).toBe(true);
  329 |       expect(Math.hypot(waypoint.x - 190, waypoint.y - 190)).toBeLessThanOrEqual(178.01);
  330 |     }
  331 |     await expect(page.locator('#astronomy-sky-map-help')).toContainText(/solid gold arc traces.*next 12 hours/i);
  332 |     await expect(page.locator('#astronomy-sky-focus-legend')).toContainText(/solid gold arc traces its next 12 hours/i);
  333 |     await expect(diagram).toBeVisible();
  334 | 
  335 |     await expectNoDocumentOverflow(page);
  336 |     await expectNoRuntimeIssues(page, issues);
  337 |   });
  338 | 
  339 |   test('Bortle preview stays synchronized between Sky Map and Observing', async ({ page }) => {
  340 |     await page.setViewportSize({ width: 1180, height: 1000 });
  341 |     const issues = collectBrowserIssues(page);
  342 |     await mount(page, 'skymap');
  343 | 
  344 |     const darkness = page.locator('#astronomy-sky-darkness');
  345 |     const darknessStatus = page.locator('#astronomy-sky-darkness-status');
  346 |     const diagram = page.locator('#astronomy-sky-map-diagram');
  347 |     await expect(darkness).toHaveValue('5');
  348 |     await expect(darkness.locator('option')).toHaveCount(9);
  349 |     await darkness.selectOption('9');
```