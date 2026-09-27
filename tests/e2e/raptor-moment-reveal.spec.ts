import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, Pixels } from './helpers/png_pixels';

test.use({ video: 'off' });
const output = 'reports/raptor-moment-reveal-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.revealRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.revealScene=scene;if(window.revealSkipRender)return;window.revealRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor saved-image reveal', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).revealStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, records: any[] = []) {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'highStoop', selectedSpecies: 'peregrine',
      flightSession: { speciesId: 'peregrine', missionId: 'highStoop' }, huntTutorialDismissed: true, graphicsQuality: 'low', flightStudyMoments: records,
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'The wing outline will change during a dive.' } }
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).revealStep(25); });
  }
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  async function records(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments); }
  async function open(page: any) { await page.getByRole('button', { name: 'Compare images with a slider', exact: true }).click(); await expect(page.locator('#rh-moment-reveal-panel')).toBeVisible(); }
  async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  function frozen(a: any, b: any) { for (const key of ['paused', 'motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'cameraPosition', 'cameraQuaternion']) expect(b[key], key).toEqual(a[key]); }
  async function fixtures(page: any) {
    const images = await page.evaluate(() => ['#9a541e', '#377a90'].map((color, i) => { const c = document.createElement('canvas'); c.width = 480; c.height = 320; const ctx = c.getContext('2d')!; ctx.fillStyle = '#102b36'; ctx.fillRect(0, 0, 480, 320); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(240, 160, 180 - i * 40, 65 + i * 20, i * 0.2, 0, Math.PI * 2); ctx.fill(); return c.toDataURL('image/jpeg', 0.8); }));
    return images.map((image, i) => ({ kind: 'flight-study', id: 'fixture-' + i, runId: 'fixture-flight', speciesName: 'Peregrine Falcon', missionName: 'High stoop', elapsedS: i + 1, speedMph: 60 + i * 20, heightM: 600 - i * 30, poseLabel: i ? 'Diving' : 'Flying', viewLabel: 'Above', focusLabel: 'Whole bird', presentationLabel: 'Studio lighting', note: '', image,
      view: { focus: 'whole', presentation: 'studio', lighting: 'soft', preset: 'above', azimuthOffset: Math.PI, elevation: 1.24, distance: 1 } }));
  }
  function pixelDifference(a: Pixels, b: Pixels, from: number, to: number) {
    expect([a.width, a.height]).toEqual([b.width, b.height]); let different = 0, total = 0;
    for (let y = Math.floor(a.height * 0.15); y < a.height * 0.9; y += 2) for (let x = Math.floor(a.width * from); x < a.width * to; x += 2) { const p = a.at(x, y), q = b.at(x, y); if (p.reduce((sum, v, i) => sum + Math.abs(v - q[i]), 0) > 12) different++; total++; }
    return { different, total, fraction: different / total };
  }

  test('reveals real saved flight images without modifying evidence or rerendering the simulation', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page); await page.locator('[data-raptor-study-button]').click(); await page.locator('[data-study-view=above]').click(); await keep(page);
    await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true }); w.revealSkipRender = true; for (let i = 0; i < 60; i++) w.revealStep(50); w.revealSkipRender = false; w.revealStep(25); });
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await keep(page);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    const original = await records(page), paused = await snapshot(page), renderer = await page.evaluate(() => ({ renders: (window as any).revealRenders, head: (window as any).revealScene.getObjectByName('raptor-head-rig').uuid }));
    expect(original[0].image).not.toBe(original[1].image); await open(page);
    const panel = page.locator('#rh-moment-reveal-panel'), stage = panel.locator('.rh-moment-reveal-stage'), range = page.getByRole('slider', { name: 'Reveal moment A', exact: true });
    await expect(range).toHaveValue('50'); await expect(panel.locator('[data-views-match]')).toHaveAttribute('data-views-match', 'true');
    expect(await stage.locator('img').evaluateAll(images => images.map((img: any) => img.src))).toEqual(original.map(m => m.image));
    const middle = readPng(await stage.screenshot({ path: output + '/real-split.png' }));
    await page.getByRole('button', { name: 'Show A', exact: true }).click(); await expect(range).toHaveValue('100'); const first = readPng(await stage.screenshot({ path: output + '/real-a.png' }));
    await page.getByRole('button', { name: 'Show B', exact: true }).click(); await expect(range).toHaveValue('0'); const second = readPng(await stage.screenshot({ path: output + '/real-b.png' }));
    const pixels = { endpoints: pixelDifference(first, second, 0.08, 0.92), left: pixelDifference(first, middle, 0.08, 0.4), right: pixelDifference(second, middle, 0.6, 0.92) };
    expect(pixels.endpoints.different).toBeGreaterThan(500); expect(pixels.left.fraction).toBeLessThan(0.01); expect(pixels.right.fraction).toBeLessThan(0.01);
    await stage.scrollIntoViewIfNeeded(); const bounds = (await stage.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.5); await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.5, { steps: 6 }); await page.mouse.up(); await expect(range).toHaveValue('75'); await expect(range).toBeFocused();
    await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.5); await expect(range).toHaveValue('75'); // Released pointers cannot keep dragging.
    await range.focus(); await page.keyboard.press('End'); await expect(range).toHaveValue('100'); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('1'); await expect(range).toHaveAttribute('aria-valuetext', '1% moment A · 99% moment B');
    await page.getByRole('button', { name: 'Split view', exact: true }).click(); await expect(range).toHaveValue('50'); await panel.screenshot({ path: output + '/comparison-desktop.png' });
    expect(await records(page)).toEqual(original); frozen(paused, await snapshot(page));
    expect(await page.evaluate(() => ({ renders: (window as any).revealRenders, head: (window as any).revealScene.getObjectByName('raptor-head-rig').uuid }))).toEqual(renderer);
    await page.locator('[data-study-moment=A] textarea').fill('The spread wing outline changes as the bird dives.'); await expect(range).toHaveValue('50');
    await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0].reading.image)).toBe(original[0].image);
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click(); const download = await pending; await download.saveAs(output + '/flight-observations.html');
    const html = readFileSync((await download.path())!, 'utf8'); expect((html.match(/<img /g) || []).length).toBe(2); expect(html).not.toContain('rh-moment-reveal-range'); expect(html).toContain(original[0].image); expect(html).toContain(original[1].image);
    await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await panel.screenshot({ path: output + '/real-comparison-phone.png' });
    await page.getByRole('button', { name: 'Close image comparison', exact: true }).click(); await expect(panel).toBeHidden(); await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toBeFocused();
    writeFileSync(output + '/real-reveal-checks.json', JSON.stringify({ pixels, noSimulationRedraws: true, unchangedOriginalImages: true, offlineReportImages: 2 }, null, 2));
    expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps viewing caveats visible, resets for replacement pairs, and handles missing or unreadable images', async ({ page }) => {
    const samples = await fixtures(page); await mount(page, samples); await open(page);
    const panel = page.locator('#rh-moment-reveal-panel'), context = panel.locator('#rh-moment-reveal-context');
    await expect(context).toContainText('does not guarantee identical size or alignment');
    for (const [patch, text] of [
      [{ lighting: 'rim' }, 'different studio lights'], [{ presentation: 'habitat' }, 'different lighting and backgrounds'], [{ focus: 'head' }, 'different regions'], [{ distance: 1.5 }, 'Camera settings differ'], [null, 'not recorded']
    ] as const) {
      await page.evaluate(({ view, patch }) => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].view = patch ? { ...view, ...patch } : null; w.__rerender(); }, { view: samples[1].view, patch });
      await expect(context).toContainText(text); await expect(context).toHaveAttribute('data-views-match', 'false');
    }
    await page.evaluate(() => { const w = window as any; delete w.__toolData.raptorHunt.flightStudyMoments[1].runId; w.__rerender(); }); await expect(context).toContainText('Flight identity was not recorded');
    await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].runId = 'another-flight'; w.__rerender(); }); await expect(context).toContainText('different flights');
    await panel.screenshot({ path: output + '/viewing-caveats.png' });
    await page.getByRole('button', { name: 'Show B', exact: true }).click(); await page.getByRole('button', { name: 'Remove moment A', exact: true }).click(); await expect(page.locator('.rh-moment-reveal-wrap')).toHaveCount(0);
    await page.evaluate(sample => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments.push({ ...sample, id: 'replacement' }); w.__rerender(); }, samples[0]);
    await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toHaveAttribute('aria-expanded', 'false'); await open(page); await expect(page.getByRole('slider', { name: 'Reveal moment A', exact: true })).toHaveValue('50');
    for (const image of [null, 'https://invalid.example/unsafe.jpg', 'data:image/svg+xml;base64,PHN2Zz4=']) {
      await page.evaluate(image => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].image = image; w.__rerender(); }, image); await expect(page.locator('.rh-moment-reveal-wrap')).toHaveCount(0);
    }
    await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].id = 'broken-jpeg'; w.__toolData.raptorHunt.flightStudyMoments[1].image = 'data:image/jpeg;base64,AAAA'; w.__rerender(); });
    await open(page); await expect(panel.getByRole('status')).toContainText('could not be loaded'); await expect(panel.locator('input,img')).toHaveCount(0); await expect(context).toBeVisible();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('supports phone controls, touch-sized targets, keyboard, reduced motion, and forced colors', async ({ page }) => {
    await mount(page, await fixtures(page)); await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
    const panel = page.locator('#rh-moment-reveal-panel'), range = panel.getByRole('slider', { name: 'Reveal moment A', exact: true }); const paused = await snapshot(page);
    await range.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('1');
    await page.getByRole('button', { name: 'Split view', exact: true }).click();
    const stage = panel.locator('.rh-moment-reveal-stage'); await stage.scrollIntoViewIfNeeded(); const bounds = (await stage.boundingBox())!, cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * 0.2, y: bounds.y + bounds.height * 0.5 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * 0.8, y: bounds.y + bounds.height * 0.5 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(range).toHaveValue('80');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.5 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await expect(range).toHaveValue('50');
    } finally { await cdp.detach(); }
    expect(await stage.evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y pinch-zoom');
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await panel.locator('button,input').evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44))).toBe(true);
    await panel.screenshot({ path: output + '/comparison-phone.png' });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-flight-moments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' }); const colors = await panel.getByRole('button', { name: 'Show A', exact: true }).evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]);
    await panel.getByRole('button', { name: 'Show A', exact: true }).click(); await expect(range).toHaveValue('100'); await panel.screenshot({ path: output + '/comparison-forced-colors.png' });
    await page.evaluate(() => (window as any).revealStep(60000)); frozen(paused, await snapshot(page));
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
