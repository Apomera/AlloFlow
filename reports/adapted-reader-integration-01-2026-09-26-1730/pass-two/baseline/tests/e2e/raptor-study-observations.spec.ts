import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-3d-observations-2026-09-26';
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){if(window.observationSkipRender)return;return render(scene,camera);};return r;};})();`;

test.describe('Raptor saved 3D observations', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => harness.start());
  test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731;
      const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
      window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).observationStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, investigation = true) {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'highStoop', selectedSpecies: 'peregrine',
      flightSession: { speciesId: 'peregrine', missionId: 'highStoop' }, huntTutorialDismissed: true, graphicsQuality: 'low',
      ...(investigation ? { activeInvestigation: 'speed', investigations: { speed: { prediction: 'A dive may reduce height and increase speed.', reviewed: true } } } : {})
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).observationStep(25);
    });
  }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  async function keep(page: any) {
    await page.locator('[data-raptor-study-button]').click();
    await page.locator('[data-study-view=above]').click();
    await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
  }

  test('captures real images, compares a maneuver, and transfers immutable evidence into notebook downloads', async ({ page }) => {
    await mount(page);
    const before = await snapshot(page);
    await keep(page);
    const first = (await state(page)).flightStudyMoments[0];
    // The existing diagnostic snapshot rounds m/s to two decimal places.
    expect(Math.abs(first.speedMph - before.speedMps * 2.237)).toBeLessThan(0.012);
    expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
    expect(first.image.length).toBeLessThan(48000);
    const pixels = await page.evaluate(async image => {
      const img = new Image(); img.src = image; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set(); let lit = 0;
      for (let i = 0; i < rgba.length; i += 4) { if (rgba[i] + rgba[i + 1] + rgba[i + 2] > 30) lit++; colors.add((rgba[i] >> 3) + ',' + (rgba[i + 1] >> 3) + ',' + (rgba[i + 2] >> 3)); }
      return { width: img.width, height: img.height, lit, colors: colors.size };
    }, first.image);
    expect(pixels.width).toBe(480); expect(pixels.height).toBe(320); expect(pixels.lit).toBeGreaterThan(30000); expect(pixels.colors).toBeGreaterThan(80);
    expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/capture-desktop.png' });
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
    const a = page.locator('[data-study-moment=A]');
    await a.getByRole('textbox').fill('The spread wings and tail are visible from above before the dive.');
    await a.getByRole('button', { name: 'Add to notebook', exact: true }).click();
    const copied = (await state(page)).investigations.speed.evidence[0];
    expect(copied.reading.image).toBe(first.image); expect(copied.reading.speedMph).toBe(first.speedMph);
    expect((await state(page)).investigations.speed.reviewed).toBe(false);
    await a.getByRole('textbox').fill('From above, the long wing silhouette is easier to see.');
    expect((await state(page)).investigations.speed.evidence[0]).toEqual(copied);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
    expect((await state(page)).flightStudyMoments).toHaveLength(1);
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
      w.observationSkipRender = true; for (let i = 0; i < 60; i++) w.observationStep(50);
      w.observationSkipRender = false; w.observationStep(25);
    });
    await keep(page);
    const records = (await state(page)).flightStudyMoments;
    expect(records).toHaveLength(2); expect(records[0].image).toBe(first.image);
    expect(records[1].image).not.toBe(first.image); expect(records[1].speedMph).toBeGreaterThan(first.speedMph);
    expect(records[1].viewLabel).toBe('Above'); expect(records[1].poseLabel).toBe('Diving');
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.locator('[data-study-moment=B]').getByRole('textbox').fill('During the dive the wings sweep back, speed increases, and height decreases.');
    await page.locator('[data-study-moment=B]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
    await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'same-flight');
    await expect(page.locator('[data-study-comparison]')).toContainText('does not establish its cause');
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-desktop.png' });
    await page.locator('.rh-flight-moments').getByRole('button', { name: 'Open notebook', exact: true }).click();
    await expect(page.locator('#rh-journal-title')).toBeFocused();
    await expect(page.locator('.rh-journal-note')).toHaveCount(2);
    await expect(page.locator('.rh-journal-note img')).toHaveCount(2);
    await expect(page.locator('[data-inquiry-comparison]')).toHaveCount(0);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download field notes', exact: true }).click();
    const download = await downloadPromise;
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain(copied.text); expect(text).toContain('Simulation snapshot: Peregrine Falcon');
    expect(text).toContain('above ground'); expect(text).toContain('Diving'); expect(text).not.toContain('long wing silhouette');
    await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
    expect((await state(page)).investigations.speed.evidence[0]).toEqual(copied);
    expect((await state(page)).flightStudyMoments).toHaveLength(1);
    await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
    await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
    await expect(page.locator('.rh-flight-moments')).toHaveCount(0);
    await expect(page.locator('[data-raptor-study-button]')).toBeFocused();
    expect(await page.locator('[data-raptor-study-button]').evaluate((button: HTMLButtonElement) => button.tabIndex)).toBe(0);
    expect((await state(page)).investigations.speed.evidence).toHaveLength(2);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('persists across restart and remount, handles capture failure, and fits accessible narrow panels', async ({ page }) => {
    await mount(page, false);
    await keep(page);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.locator('[data-study-moment=A]').getByRole('textbox').fill('An observation from my first flight.');
    await expect(page.getByRole('button', { name: 'Add to notebook', exact: true })).toBeDisabled();
    const first = (await state(page)).flightStudyMoments[0];
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await page.locator('[data-raptor-canvas]').evaluate(() => { for (let i = 0; i < 8; i++) (window as any).observationStep(25); });
    await page.evaluate(() => { HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('Controlled image readback failure'); }; });
    await keep(page);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'different-flights');
    await expect(page.locator('[data-study-moment=B]')).toContainText('Image unavailable');
    expect((await state(page)).flightStudyMoments[0]).toEqual(first);
    expect((await state(page)).flightStudyMoments[1].image).toBeNull();
    await page.addStyleTag({ content: '#wrap{width:420px}' });
    await expect.poll(() => page.locator('.rh-moment-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.setViewportSize({ width: 420, height: 1000 });
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-phone.png' });
    const overflow = await page.locator('.rh-flight-moments,.rh-moment-card').evaluateAll(elements => elements.map(el => el.scrollWidth - el.clientWidth));
    expect(Math.max(...overflow)).toBeLessThanOrEqual(1);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run({ include: ['.rh-flight-moments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
    });
    expect(violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const colors = await page.locator('.rh-moment-actions button').first().evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(colors[0]).not.toBe(colors[1]);
    const saved = await page.evaluate(() => (window as any).__toolData);
    await harness.destroy(page);
    await page.evaluate(data => (window as any).__mount(data), saved);
    await expect(page.locator('.rh-moment-card')).toHaveCount(2);
    await expect(page.locator('[data-study-moment=A]').getByRole('textbox')).toHaveValue(first.note);
    await page.getByRole('button', { name: 'Open dive investigation', exact: true }).click();
    await expect(page.locator('#rh-journal-title')).toBeFocused();
    expect((await state(page)).investigations?.speed?.evidence || []).toHaveLength(0);
    await page.getByLabel('My prediction', { exact: true }).fill('I think the wings will change shape during a dive.');
    await expect(page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps the bird visible in short fullscreen study and pauses safely while writing', async ({ page }) => {
    await mount(page, false);
    await keep(page);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.getByRole('button', { name: 'Resume paused flight', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate(() => (window as any).observationStep(25));
    const before = await snapshot(page);
    await page.locator('[data-study-moment=A]').getByRole('textbox').fill('I paused to look closely at the wing tips.');
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('pauseForNotes'); c._rhCommand('pauseForNotes'); (window as any).observationStep(60000); });
    expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
    await expect(page.getByRole('button', { name: 'Resume paused flight', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 960, height: 560 });
    await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-flight-controls')).toBeHidden();
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((canvas: HTMLCanvasElement) => canvas.clientHeight)).toBeGreaterThan(500);
    const fit = await page.locator('.rh-study-panel').evaluate(panel => {
      const rect = panel.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, headerBottom: header.bottom, height: window.innerHeight };
    });
    expect(fit.top - fit.headerBottom).toBeGreaterThan(100); expect(fit.bottom).toBeLessThanOrEqual(fit.height);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/study-fullscreen-short.png' });
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
    expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
