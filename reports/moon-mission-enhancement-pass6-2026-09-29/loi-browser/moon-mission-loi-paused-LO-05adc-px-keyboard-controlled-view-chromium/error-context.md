# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-loi.spec.ts >> paused LOI and the Moon atlas remain readable on a 320px keyboard-controlled view
- Location: tests\e2e\moon-mission-loi.spec.ts:192:5

# Error details

```
TypeError: Cannot read properties of undefined (reading 'burnDuration')
```

# Test source

```ts
  129 |   expect(end.time).toBeCloseTo(p.summary.duration, 6);
  130 |   expect(end.engine).toBe('off'); expect(end.thrust).toBe(0); expect(end.plume).toBe('off');
  131 |   expect(end.mass).toBeLessThan(live.mass); expect(end.propellant).toBeGreaterThan(0);
  132 |   expect(recorded.missionXP).toBe(0);
  133 |   await capture(page, info, 'loi-captured');
  134 | });
  135 | 
  136 | test('no-burn flyby and overburn cannot unlock descent, and replanning clears the previous outcome', async ({ page }, info) => {
  137 |   await mount(page);
  138 |   await page.locator('[data-loi-result]').click();
  139 |   await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  140 |   for (const preset of ['flyby', 'overburn']) {
  141 |     await page.locator('[data-loi-preset="' + preset + '"]').click();
  142 |     await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  143 |     const changed = await saved(page);
  144 |     expect(changed.loiResult).toBeNull(); expect(changed.loiRun.recorded).toBe(false);
  145 |     expect(changed.loiRun.time).toBe(0); expect(changed.loiPaused).toBe(true);
  146 |     await page.locator('[data-loi-result]').click();
  147 |     await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  148 |     const end = await saved(page), p = await profile(page);
  149 |     expect(end.loiResult.outcome).toBe(p.summary.outcome);
  150 |     expect(end.loiRun.recorded).toBe(true); expect(end.missionXP).toBe(0);
  151 |     expect((await loi(page)).engine).toBe('off');
  152 |     await capture(page, info, 'loi-' + preset);
  153 |   }
  154 |   await page.locator('[data-loi-preset="nominal"]').click();
  155 |   expect((await saved(page)).loiResult).toBeNull();
  156 |   await page.locator('[data-loi-result]').click();
  157 |   await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  158 |   expect((await saved(page)).missionXP).toBe(0);
  159 | });
  160 | 
  161 | test('review and reload preserve capture, then undocking rewards the mission once', async ({ page }) => {
  162 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  163 |   await mount(page);
  164 |   await page.locator('[data-loi-result]').click();
  165 |   const captured = await saved(page);
  166 |   const p = await profile(page);
  167 |   await seek(page, p.firstBurn.time + 10);
  168 |   const reviewing = await saved(page), readings = await loi(page);
  169 |   expect(reviewing.loiResult).toEqual(captured.loiResult); expect(reviewing.loiRun.recorded).toBe(true);
  170 |   await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  171 |   await mount(page, { moonMission: reviewing });
  172 |   expect(await loi(page)).toEqual(readings);
  173 |   await page.locator('[data-loi-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  174 |   await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  175 |   const descended = await saved(page);
  176 |   expect(descended.missionXP).toBe(15); expect(descended.loiAwarded).toBe(true);
  177 |   await mount(page, { moonMission: { ...descended, missionPhase: 4 } });
  178 |   await page.locator('[data-loi-proceed]').click();
  179 |   await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  180 |   expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
  181 | });
  182 | 
  183 | test('legacy ready flags and malformed playback cannot bypass the capture gate', async ({ page }) => {
  184 |   await mount(page, seed({ orbitStatus: 'ready', loiRun: { version: 1, time: 'corrupt', recorded: true }, loiResult: { outcome: 'captured' } }));
  185 |   await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  186 |   expect((await loi(page)).time).toBe(0); expect((await saved(page)).missionXP).toBe(0);
  187 |   await page.locator('[data-loi-result]').click();
  188 |   await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  189 |   expect((await saved(page)).missionXP).toBe(0);
  190 | });
  191 | 
  192 | test('paused LOI and the Moon atlas remain readable on a 320px keyboard-controlled view', async ({ page }, info) => {
  193 |   await page.setViewportSize({ width: 1280, height: 1000 });
  194 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  195 |   await mount(page);
  196 |   const p = await profile(page);
  197 |   await seek(page, p.firstBurn.time + 60);
  198 |   const fixed = await loi(page), pixels = await page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL());
  199 |   await page.waitForTimeout(250);
  200 |   expect(await loi(page)).toEqual(fixed);
  201 |   expect(await page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL())).toBe(pixels);
  202 |   await page.setViewportSize({ width: 320, height: 844 });
  203 |   await expect.poll(async () => page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  204 |   await painted(page);
  205 |   expect(await loi(page)).toEqual(fixed);
  206 |   await mount(page, { moonMission: await saved(page) });
  207 |   expect(await loi(page)).toEqual(fixed);
  208 |   const slider = page.locator('[data-loi-seek]');
  209 |   await slider.focus(); await page.keyboard.press('ArrowRight');
  210 |   await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(fixed.time);
  211 |   const labels = page.locator('[data-moonmission-moon-labels]');
  212 |   await labels.focus(); await page.keyboard.press('Enter');
  213 |   await expect(labels).toHaveAttribute('aria-pressed', 'true');
  214 |   await expect(page.locator('[data-moonmission-moon-sites] li')).toHaveCount(6);
  215 |   await expect(page.locator('[data-lunar-atlas]')).toBeVisible();
  216 |   const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  217 |   expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  218 |   const bounds = await page.locator('[data-loi-workspace] button, [data-loi-workspace] select, [data-loi-workspace] input').evaluateAll(nodes => nodes.map(node => {
  219 |     const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  220 |   }));
  221 |   for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); expect(box.height).toBeGreaterThanOrEqual(32); }
  222 |   await accessible(page, info);
  223 |   await capture(page, info, 'loi-paused-320');
  224 |   await page.locator('[data-loi-result]').focus(); await page.keyboard.press('Enter');
  225 |   await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  226 |   const beforePlan = await saved(page);
  227 |   await page.locator('[data-loi-duration]').focus(); await page.keyboard.press('ArrowRight');
  228 |   const changed = await saved(page);
> 229 |   expect(changed.loiPlan.burnDuration).toBeGreaterThan(beforePlan.loiPlan.burnDuration);
      |                                                                           ^ TypeError: Cannot read properties of undefined (reading 'burnDuration')
  230 |   expect(changed.loiRun.time).toBe(0); expect(changed.loiRun.recorded).toBe(false); expect(changed.loiResult).toBeNull();
  231 |   await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  232 |   expect(changed.missionXP).toBe(0);
  233 | });
  234 | 
  235 | test('LOI playback resets its clock while hidden and resumes without catch-up', async ({ page }) => {
  236 |   await mount(page, seed({ animPaused: false, loiPlaybackRate: 1, loiRun: { version: 1, time: 20, recorded: false } }));
  237 |   const start = (await loi(page)).time;
  238 |   await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(start + 0.2);
  239 |   await page.evaluate(async () => {
  240 |     Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  241 |     document.dispatchEvent(new Event('visibilitychange'));
  242 |     await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  243 |   });
  244 |   const hidden = await loi(page); await page.waitForTimeout(350); expect(await loi(page)).toEqual(hidden);
  245 |   const visible = await page.evaluate(async () => {
  246 |     delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
  247 |     const cv = document.querySelector('[data-loi-canvas]') as HTMLCanvasElement, before = Number(cv.dataset.loiTime);
  248 |     await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  249 |     return { before, after: Number(cv.dataset.loiTime) };
  250 |   });
  251 |   expect(visible.after).toBe(visible.before);
  252 |   await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(hidden.time + 0.1);
  253 |   expect((await saved(page)).missionXP).toBe(0);
  254 | });
  255 | 
  256 | test('radio loss follows the lunar line of sight and stays consistent across display sizes', async ({ page }, info) => {
  257 |   await mount(page);
  258 |   const epochs = await page.evaluate(() => {
  259 |     const p = (window as any).MoonMissionPure.loiProfile();
  260 |     const blocked = p.samples.filter((s: any) => s.engineOn && !s.radioVisible);
  261 |     const visible = p.samples.filter((s: any) => s.time > p.events.cutoff.time && s.radioVisible);
  262 |     return { blocked: blocked[Math.floor(blocked.length / 2)].time, contact: visible[Math.floor(visible.length / 2)].time };
  263 |   });
  264 |   for (const [time, radio, text] of [[epochs.blocked, 'blocked', 'Loss of signal'], [epochs.contact, 'contact', 'Earth in view']] as const) {
  265 |     const reviewed = await seek(page, time), expected = await sample(page, reviewed);
  266 |     expect(expected.radioVisible).toBe(expected.x <= 0 || Math.abs(expected.y) >= 1737400);
  267 |     await expect(page.locator('[data-loi-canvas]')).toHaveAttribute('data-loi-radio', radio);
  268 |     await expect(page.locator('[data-loi-value="radio"]')).toHaveText(text);
  269 |     const before = await loi(page);
  270 |     await page.setViewportSize({ width: radio === 'blocked' ? 390 : 1200, height: 900 });
  271 |     await painted(page); expect(await loi(page)).toEqual(before);
  272 |   }
  273 |   expect((await saved(page)).missionXP).toBe(0);
  274 |   await capture(page, info, 'loi-radio-reacquired');
  275 | });
  276 | 
```