# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-observations.spec.ts >> Raptor saved 3D observations >> keeps the bird visible in short fullscreen study and pauses safely while writing
- Location: tests\e2e\raptor-study-observations.spec.ts:165:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#rh-flight-moments-title')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('#rh-flight-moments-title')
    33 × locator resolved to <h3 tabindex="-1" id="rh-flight-moments-title">Your flight observations</h3>
       - unexpected value "inactive"

```

```yaml
- heading "Your flight observations" [level=3]
```

# Test source

```ts
  90  |     expect(records[1].viewLabel).toBe('Above'); expect(records[1].poseLabel).toBe('Diving');
  91  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  92  |     await page.locator('[data-study-moment=B]').getByRole('textbox').fill('During the dive the wings sweep back, speed increases, and height decreases.');
  93  |     await page.locator('[data-study-moment=B]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  94  |     await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'same-flight');
  95  |     await expect(page.locator('[data-study-comparison]')).toContainText('does not establish its cause');
  96  |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-desktop.png' });
  97  |     await page.locator('.rh-flight-moments').getByRole('button', { name: 'Open notebook', exact: true }).click();
  98  |     await expect(page.locator('#rh-journal-title')).toBeFocused();
  99  |     await expect(page.locator('.rh-journal-note')).toHaveCount(2);
  100 |     await expect(page.locator('.rh-journal-note img')).toHaveCount(2);
  101 |     await expect(page.locator('[data-inquiry-comparison]')).toHaveCount(0);
  102 |     const downloadPromise = page.waitForEvent('download');
  103 |     await page.getByRole('button', { name: 'Download field notes', exact: true }).click();
  104 |     const download = await downloadPromise;
  105 |     const text = readFileSync((await download.path())!, 'utf8');
  106 |     expect(text).toContain(copied.text); expect(text).toContain('Simulation snapshot: Peregrine Falcon');
  107 |     expect(text).toContain('above ground'); expect(text).toContain('Diving'); expect(text).not.toContain('long wing silhouette');
  108 |     await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
  109 |     expect((await state(page)).investigations.speed.evidence[0]).toEqual(copied);
  110 |     expect((await state(page)).flightStudyMoments).toHaveLength(1);
  111 |     await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
  112 |     await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
  113 |     await expect(page.locator('.rh-flight-moments')).toHaveCount(0);
  114 |     await expect(page.locator('[data-raptor-study-button]')).toBeFocused();
  115 |     expect(await page.locator('[data-raptor-study-button]').evaluate((button: HTMLButtonElement) => button.tabIndex)).toBe(0);
  116 |     expect((await state(page)).investigations.speed.evidence).toHaveLength(2);
  117 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  118 |   });
  119 | 
  120 |   test('persists across restart and remount, handles capture failure, and fits accessible narrow panels', async ({ page }) => {
  121 |     await mount(page, false);
  122 |     await keep(page);
  123 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  124 |     await page.locator('[data-study-moment=A]').getByRole('textbox').fill('An observation from my first flight.');
  125 |     await expect(page.getByRole('button', { name: 'Add to notebook', exact: true })).toBeDisabled();
  126 |     const first = (await state(page)).flightStudyMoments[0];
  127 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  128 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  129 |     await page.locator('[data-raptor-canvas]').evaluate(() => { for (let i = 0; i < 8; i++) (window as any).observationStep(25); });
  130 |     await page.evaluate(() => { HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('Controlled image readback failure'); }; });
  131 |     await keep(page);
  132 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  133 |     await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'different-flights');
  134 |     await expect(page.locator('[data-study-moment=B]')).toContainText('Image unavailable');
  135 |     expect((await state(page)).flightStudyMoments[0]).toEqual(first);
  136 |     expect((await state(page)).flightStudyMoments[1].image).toBeNull();
  137 |     await page.addStyleTag({ content: '#wrap{width:420px}' });
  138 |     await expect.poll(() => page.locator('.rh-moment-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  139 |     await page.setViewportSize({ width: 420, height: 1000 });
  140 |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-phone.png' });
  141 |     const overflow = await page.locator('.rh-flight-moments,.rh-moment-card').evaluateAll(elements => elements.map(el => el.scrollWidth - el.clientWidth));
  142 |     expect(Math.max(...overflow)).toBeLessThanOrEqual(1);
  143 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  144 |     const violations = await page.evaluate(async () => {
  145 |       const result = await (window as any).axe.run({ include: ['.rh-flight-moments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
  146 |       return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
  147 |     });
  148 |     expect(violations).toEqual([]);
  149 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  150 |     const colors = await page.locator('.rh-moment-actions button').first().evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  151 |     expect(colors[0]).not.toBe(colors[1]);
  152 |     const saved = await page.evaluate(() => (window as any).__toolData);
  153 |     await harness.destroy(page);
  154 |     await page.evaluate(data => (window as any).__mount(data), saved);
  155 |     await expect(page.locator('.rh-moment-card')).toHaveCount(2);
  156 |     await expect(page.locator('[data-study-moment=A]').getByRole('textbox')).toHaveValue(first.note);
  157 |     await page.getByRole('button', { name: 'Open dive investigation', exact: true }).click();
  158 |     await expect(page.locator('#rh-journal-title')).toBeFocused();
  159 |     expect((await state(page)).investigations?.speed?.evidence || []).toHaveLength(0);
  160 |     await page.getByLabel('My prediction', { exact: true }).fill('I think the wings will change shape during a dive.');
  161 |     await expect(page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true })).toBeEnabled();
  162 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  163 |   });
  164 | 
  165 |   test('keeps the bird visible in short fullscreen study and pauses safely while writing', async ({ page }) => {
  166 |     await mount(page, false);
  167 |     await keep(page);
  168 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  169 |     await page.getByRole('button', { name: 'Resume paused flight', exact: true }).click();
  170 |     await page.locator('[data-raptor-canvas]').evaluate(() => (window as any).observationStep(25));
  171 |     const before = await snapshot(page);
  172 |     await page.locator('[data-study-moment=A]').getByRole('textbox').fill('I paused to look closely at the wing tips.');
  173 |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('pauseForNotes'); c._rhCommand('pauseForNotes'); (window as any).observationStep(60000); });
  174 |     expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
  175 |     await expect(page.getByRole('button', { name: 'Resume paused flight', exact: true })).toBeVisible();
  176 |     await page.setViewportSize({ width: 960, height: 560 });
  177 |     await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click();
  178 |     await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  179 |     await page.locator('[data-raptor-study-button]').click();
  180 |     await expect(page.locator('.rh-flight-controls')).toBeHidden();
  181 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((canvas: HTMLCanvasElement) => canvas.clientHeight)).toBeGreaterThan(500);
  182 |     const fit = await page.locator('.rh-study-panel').evaluate(panel => {
  183 |       const rect = panel.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
  184 |       return { top: rect.top, bottom: rect.bottom, headerBottom: header.bottom, height: window.innerHeight };
  185 |     });
  186 |     expect(fit.top - fit.headerBottom).toBeGreaterThan(100); expect(fit.bottom).toBeLessThanOrEqual(fit.height);
  187 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/study-fullscreen-short.png' });
  188 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  189 |     await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
> 190 |     await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
      |                                                            ^ Error: expect(locator).toBeFocused() failed
  191 |     expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
  192 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  193 |   });
  194 | });
  195 | 
```