import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-3d-view-report-2026-09-26';
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){if(window.reportSkipRender)return;return render(scene,camera);};return r;};})();`;

test.describe('Raptor matched views and visual reports', () => {
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
      (window as any).reportStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, records: any[] = []) {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'highStoop', selectedSpecies: 'peregrine',
      flightSession: { speciesId: 'peregrine', missionId: 'highStoop' }, huntTutorialDismissed: true, graphicsQuality: 'low', flightStudyMoments: records
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).reportStep(25);
    });
  }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  async function keep(page: any) {
    await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
  }
  async function advance(page: any) {
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
      w.reportSkipRender = true; for (let i = 0; i < 60; i++) w.reportStep(50);
      w.reportSkipRender = false; w.reportStep(25);
    });
  }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'calories']) expect(b[key], key).toEqual(a[key]);
  }

  test('matches a custom saved view without advancing flight and downloads an offline illustrated report', async ({ page, browser }) => {
    await mount(page);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-study-match')).toBeHidden();
    await page.locator('[data-study-view=above]').click();
    await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft');
    await page.getByRole('slider', { name: 'View distance' }).press('ArrowRight');
    await keep(page);
    const first = (await state(page)).flightStudyMoments[0];
    expect(first.view.preset).toBe(''); expect(first.view.distance).toBeCloseTo(1.05);
    await expect(page.locator('.rh-study-match')).toHaveText('View matched to A');
    await advance(page);
    const flying = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click();
    const before = await snapshot(page);
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
    await expect(page.getByRole('slider', { name: 'View distance' })).toHaveValue('1.05');
    frozen(before, await snapshot(page));
    expect((await snapshot(page)).cameraPosition).not.toEqual(before.cameraPosition);
    await keep(page);
    const moments = (await state(page)).flightStudyMoments;
    expect(moments[1].view).toEqual(first.view); expect(moments[1].poseLabel).toBe('Diving');
    expect(moments[1].image).toMatch(/^data:image\/jpeg;base64,/);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/matched-study.png' });
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    const returned = await snapshot(page); frozen(flying, returned);
    expect(returned.cameraPosition).toEqual(flying.cameraPosition); expect(returned.cameraQuaternion).toEqual(flying.cameraQuaternion);
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('Camera settings match');
    await page.locator('[data-study-moment=A] textarea').fill('Before the dive, the wings extend out from the body and the tail is spread.');
    await page.locator('[data-study-moment=B] textarea').fill('During the dive, the wings sweep back. Speed increases while height above ground falls.');
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-desktop.png' });
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('raptor-flight-observations.html');
    await download.saveAs(output + '/flight-observations.html');
    const html = readFileSync((await download.path())!, 'utf8');
    expect(html).toContain(first.image); expect(html).toContain('Camera settings match');
    frozen(returned, await snapshot(page));
    // A fresh offline browser context verifies the actual file has no runtime dependency.
    const context = await browser.newContext({ offline: true, viewport: { width: 1100, height: 1100 } });
    const report = await context.newPage();
    try {
      await report.goto(pathToFileURL(resolve(output + '/flight-observations.html')).href);
      await expect(report.getByRole('heading', { name: 'Your flight observations' })).toBeVisible();
      expect(await report.locator('script,link,iframe,form').count()).toBe(0);
      expect(await report.locator('img').evaluateAll(async images => {
        await Promise.all(images.map((image: any) => image.decode())); return images.map((image: any) => [image.naturalWidth, image.naturalHeight]);
      })).toEqual([[480, 320], [480, 320]]);
      await expect(report.locator('.note').nth(1)).toContainText('wings sweep back');
      await expect(report.locator('.comparison')).toContainText('does not establish its cause');
      await report.screenshot({ path: output + '/report-desktop.png', fullPage: true });
      await report.setViewportSize({ width: 390, height: 900 });
      expect(await report.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect(await report.locator('.grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      await report.screenshot({ path: output + '/report-phone.png', fullPage: true });
      await report.setViewportSize({ width: 1100, height: 1100 }); await report.emulateMedia({ media: 'print' });
      await report.screenshot({ path: output + '/report-print.png', fullPage: true });
    } finally { await context.close(); }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('restores the camera reference, updates it on removal, and keeps narrow controls accessible', async ({ page }) => {
    await mount(page);
    await page.locator('[data-raptor-study-button]').click(); await page.locator('[data-study-view=above]').click(); await keep(page);
    await advance(page);
    await page.locator('[data-raptor-study-button]').click(); await keep(page); // Deliberately leave the default side view.
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('Camera settings differ');
    const saved = await page.evaluate(() => (window as any).__toolData);
    await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.locator('[data-study-view=above]')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
    await page.locator('[data-raptor-study-button]').click();
    await page.locator('[data-study-view=above]').click();
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.locator('[data-study-view=side]')).toHaveAttribute('aria-pressed', 'true');
    await page.addStyleTag({ content: '#wrap{width:420px}' }); await page.setViewportSize({ width: 420, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    const layout = await page.locator('.rh-study-match').evaluate(el => ({ height: el.getBoundingClientRect().height, overflow: el.scrollWidth - el.clientWidth }));
    expect(layout.height).toBeGreaterThanOrEqual(44); expect(layout.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/matched-study-phone.png' });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel', '.rh-flight-moments'] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
    })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
    expect(violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    const colors = await page.locator('.rh-study-match').evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(colors[0]).not.toBe(colors[1]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('exports older observations and literal learner text without unsafe markup or invented camera matches', async ({ page, browser }) => {
    const literal = '<script>window.reportExecuted=true</script>\n<img src="https://invalid.example/photo" onerror="alert(1)"> & my observation';
    const legacy = { kind: 'flight-study', id: 'legacy-a', speciesName: 'Peregrine Falcon', missionName: 'High stoop', elapsedS: 2, speedMph: 91, heightM: 720,
      poseLabel: 'Flying', viewLabel: 'Above', image: 'https://invalid.example/unsafe.jpg', note: literal };
    await mount(page, [legacy, { ...legacy, id: 'legacy-b', note: '', view: { azimuthOffset: 0, elevation: 99, distance: 1, preset: 'side' } }]);
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('not recorded');
    await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'unknown-flights');
    await expect(page.locator('[data-study-comparison]')).toContainText('Flight identity was not recorded');
    await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    const before = await snapshot(page), pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const download = await pending, html = readFileSync((await download.path())!, 'utf8');
    frozen(before, await snapshot(page));
    // Bypass CSP only in this isolated audit context to run axe; markup integrity is asserted before injecting axe.
    const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1100, height: 1100 } });
    const report = await context.newPage(); const external: string[] = [];
    await report.route('**/*', route => { external.push(route.request().url()); return route.abort(); });
    try {
      await report.setContent(html);
      expect(await report.locator('script,img,iframe,link').count()).toBe(0);
      await expect(report.locator('.note').first()).toHaveText(literal);
      await expect(report.locator('.note').last()).toHaveText('No written observation yet.');
      await expect(report.locator('.comparison')).toContainText('not recorded');
      expect(external).toEqual([]); expect(await report.evaluate(() => (window as any).reportExecuted)).toBeUndefined();
      await report.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      expect(await report.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    } finally { await context.close(); }
    await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
    await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    const singlePending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const single = await singlePending, singleHtml = readFileSync((await single.path())!, 'utf8');
    expect((singleHtml.match(/<article>/g) || []).length).toBe(1); expect(singleHtml).not.toContain('<section class="comparison">');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
