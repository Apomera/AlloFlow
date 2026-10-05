# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 102-solar-system-control-deck-visual.spec.ts >> Orrery controls remain readable and actionable at 1060px in dark mode
- Location: tests\e2e\102-solar-system-control-deck-visual.spec.ts:178:9

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.orr-evidence').getByRole('button', { name: /Capture (?:snapshot )?A/i })

```

# Test source

```ts
  130 |         backgrounds = Array.from(new Map(next.map((background) => [background.join(','), background])).values());
  131 |       }
  132 |       const ratios = backgrounds.map((background) => {
  133 |         const foreground = over(parse(getComputedStyle(element).color), background);
  134 |         const a = luminance(foreground), b = luminance(background);
  135 |         return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  136 |       });
  137 |       return { text: element.textContent?.trim().slice(0, 90), ratio: Math.min(...ratios) };
  138 |     });
  139 |   });
  140 |   expect(contrast.length).toBeGreaterThan(15);
  141 |   const unreadable = contrast.filter((sample) => sample.ratio < 4.5);
  142 |   expect(unreadable, 'Control prose, active actions, and mission feedback need readable contrast').toEqual([]);
  143 | }
  144 | 
  145 | async function rememberLiveNodes(page: Page) {
  146 |   return page.evaluate(() => {
  147 |     const known = ['orrery-playback-context', 'orrery-live-timeline-value'];
  148 |     const leaves = Array.from(document.querySelectorAll<HTMLElement>('[id^="orrery-live-"]'));
  149 |     const ids = Array.from(new Set(known.concat(leaves.map((leaf) => leaf.id))));
  150 |     (window as any).__controlLiveNodes = ids.map((id) => ({ id, node: document.getElementById(id) }));
  151 |     return ids;
  152 |   });
  153 | }
  154 | 
  155 | async function assertLiveNodesRetained(page: Page) {
  156 |   expect(await page.evaluate(() => (window as any).__controlLiveNodes.every(
  157 |     (entry: { id: string; node: HTMLElement | null }) => entry.node && document.getElementById(entry.id) === entry.node,
  158 |   )), 'Clock and inspection updates should retain the existing live readout leaves').toBe(true);
  159 | }
  160 | 
  161 | async function assertLandmark(page: Page, index: number) {
  162 |   const jumps = page.locator('[data-orrery-timeline-jump]');
  163 |   await expect(jumps).toHaveCount(5);
  164 |   for (let candidate = 0; candidate < 5; candidate++) {
  165 |     await expect(jumps.nth(candidate)).toHaveAttribute('aria-pressed', String(candidate === index));
  166 |     const mark = page.locator(`#orrery-timeline-mark-${candidate}`);
  167 |     if (candidate === index) await expect(mark).toHaveAttribute('aria-current', 'step');
  168 |     else await expect(mark).not.toHaveAttribute('aria-current', 'step');
  169 |   }
  170 | }
  171 | 
  172 | async function expectFocused(locator: Locator) {
  173 |   await expect(locator).toBeFocused();
  174 | }
  175 | 
  176 | for (const width of [320, 1060]) {
  177 |   for (const dark of [false, true]) {
  178 |     test(`Orrery controls remain readable and actionable at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
  179 |       await mountControls(page, width, dark);
  180 |       await assertControlGeometry(page, width);
  181 |       await assertReadableContrast(page);
  182 |       const liveIds = await rememberLiveNodes(page);
  183 |       expect(liveIds).toContain('orrery-playback-context');
  184 |       expect(liveIds).toContain('orrery-live-timeline-value');
  185 |       expect(liveIds.length).toBeGreaterThanOrEqual(5);
  186 | 
  187 |       const phase = page.locator('#orrery-phase-scrubber');
  188 |       const period = Number(await phase.getAttribute('max'));
  189 |       const phaseStep = Number(await phase.getAttribute('step'));
  190 |       expect(period).toBeGreaterThan(0);
  191 |       await assertLandmark(page, 0);
  192 |       for (const index of [1, 2, 3, 4, 0]) {
  193 |         await page.locator(`#orrery-timeline-jump-${index}`).click();
  194 |         await assertLandmark(page, index);
  195 |         const expectedPhase = period * index / 4;
  196 |         expect(Math.abs(Number(await phase.inputValue()) - expectedPhase)).toBeLessThanOrEqual(phaseStep + 1e-6);
  197 |         expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_time)).toBeCloseTo(expectedPhase, 6);
  198 |       }
  199 |       await expect(page.locator('#orrery-live-timeline-value')).not.toHaveText('');
  200 | 
  201 |       await phase.focus();
  202 |       await phase.press('End');
  203 |       expect(Math.abs(Number(await phase.inputValue()) - period)).toBeLessThanOrEqual(phaseStep + 1e-6);
  204 |       await phase.press('Home');
  205 |       await assertLandmark(page, 0);
  206 |       await phase.press('ArrowRight');
  207 |       expect(Number(await phase.inputValue())).toBeGreaterThan(0);
  208 |       await expect(phase).toHaveAttribute('aria-valuetext', /years into Mercury/);
  209 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_paused)).toBe(true);
  210 |       await expectFocused(phase);
  211 | 
  212 |       const speed = page.locator('#orrery-speed-control');
  213 |       await speed.focus();
  214 |       await speed.press('Home');
  215 |       await speed.press('ArrowRight');
  216 |       const currentSpeed = Number(await speed.inputValue());
  217 |       expect(currentSpeed).toBeGreaterThan(Number(await speed.getAttribute('min')));
  218 |       await expect(speed).toHaveAttribute('aria-valuetext', /Earth years per second/);
  219 |       await expect(page.locator('#orrery-playback-context')).toContainText('Mercury completes one orbit');
  220 |       await expect(page.locator('#orrery-playback-context')).toContainText('Earth yr/s');
  221 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_speed)).toBeCloseTo(currentSpeed, 6);
  222 | 
  223 |       await page.getByRole('button', { name: 'Resume orbital clock', exact: true }).click();
  224 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_paused)).toBe(false);
  225 |       await expect(page.locator('#orrery-live-timeline-value')).toHaveAttribute('aria-live', 'off');
  226 |       await page.getByRole('button', { name: 'Pause orbital clock', exact: true }).click();
  227 |       await expect(page.locator('#orrery-live-timeline-value')).toHaveAttribute('aria-live', 'polite');
  228 |       await assertLiveNodesRetained(page);
  229 | 
> 230 |       await page.locator('.orr-evidence').getByRole('button', { name: /Capture (?:snapshot )?A/i }).click();
      |                                                                                                     ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  231 |       const savedSnapshots = await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem.orr_snapshots));
  232 |       expect(savedSnapshots).not.toBe('{}');
  233 |       const display = page.locator('#orrery-display-options');
  234 |       const summary = display.locator(':scope > summary');
  235 |       await expect(display).toHaveAttribute('open', '');
  236 |       await summary.focus();
  237 |       await summary.press('Enter');
  238 |       await expect(display).not.toHaveAttribute('open');
  239 |       await expectFocused(summary);
  240 |       await updateState(page, { orr_sel: 'earth' });
  241 |       await expect(display).not.toHaveAttribute('open');
  242 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(false);
  243 |       await summary.focus();
  244 |       await summary.press('Space');
  245 |       await expect(display).toHaveAttribute('open', '');
  246 |       await expectFocused(summary);
  247 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(true);
  248 | 
  249 |       await page.getByRole('button', { name: 'Reset orbit time, camera view, and selection', exact: true }).click();
  250 |       const reset = await page.evaluate(() => {
  251 |         const data = (window as any).__toolData.solarSystem;
  252 |         return { time: data.orr_time, zoom: data.orr_zoom, selected: data.orr_sel, follow: data.orr_follow,
  253 |           compare: data.orr_compare, snapshots: JSON.stringify(data.orr_snapshots) };
  254 |       });
  255 |       expect(reset).toEqual({ time: 0, zoom: 'full', selected: null, follow: null, compare: null, snapshots: savedSnapshots });
  256 | 
  257 |       const guide = page.locator('#orrery-guided-mission');
  258 |       await expect(guide).toHaveAttribute('aria-labelledby', /\S+/);
  259 |       const guideHeading = page.locator(`#${await guide.getAttribute('aria-labelledby')}`);
  260 |       await expect(guideHeading).toHaveJSProperty('tagName', 'H3');
  261 |       await expect(guideHeading).not.toHaveText('');
  262 |       await expect(guide.getByRole('list', { name: 'Guided mission progress' })).toBeVisible();
  263 |       await guide.getByRole('button', { name: 'Focus Mercury and pause', exact: true }).click();
  264 |       const wrong = guide.getByRole('button', { name: 'Near aphelion for Mercury speed zone', exact: true });
  265 |       const correct = guide.getByRole('button', { name: 'Near perihelion for Mercury speed zone', exact: true });
  266 |       await expect(wrong).toBeEnabled();
  267 |       await expect(correct).toBeEnabled();
  268 |       await wrong.click();
  269 |       await expect(page.locator('#orrery-guided-feedback')).toContainText('Not quite');
  270 |       await expect(wrong).toHaveAttribute('aria-describedby', /orrery-guided-feedback/);
  271 |       await assertReadableContrast(page);
  272 |       await correct.click();
  273 |       await expect(wrong).toHaveCount(0);
  274 |       await expect(correct).toHaveCount(0);
  275 |       const completedProgress = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress);
  276 |       expect(Object.values(completedProgress as Record<string, { correct?: boolean }>).some((entry) => entry.correct)).toBe(true);
  277 |       await assertReadableContrast(page);
  278 |       await guide.getByRole('button', { name: /Next mission/i }).click();
  279 |       await expect(guide.getByRole('button', { name: 'Focus Mars and pause', exact: true })).toBeVisible();
  280 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(2);
  281 |       expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress)).toEqual(completedProgress);
  282 |       await assertControlGeometry(page, width);
  283 |       await assertReadableContrast(page);
  284 |     });
  285 |   }
  286 | }
  287 | 
```