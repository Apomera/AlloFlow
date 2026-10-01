import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_coasterlab.js', toolId: 'coasterLab', width: 1680, height: 1000,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%;height:100vh}.clab-root{width:100%;height:100vh!important}</style>');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('instruments fit the available view and display the existing energy model accurately', async ({ page }, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('coaster_lab_onboarding_v1', 'complete'));
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, {}, "document.querySelector('[aria-label=\"Coaster Lab 3-D designer\"]')._lab");
  const analysis = () => page.evaluate(() => JSON.stringify((document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.analysis()));
  const baseline = await analysis();
  const energyMatches = () => page.evaluate(() => ['KE', 'PE', 'Heat'].every((key, index) => {
    const fill = document.getElementById('clab-e' + key)!;
    const output = document.getElementById(['clab-kePct', 'clab-pePct', 'clab-heatPct'][index])!;
    const pct = parseFloat(fill.style.width);
    return Number.isFinite(pct) && pct >= 0 && pct <= 100 && output.textContent === pct.toFixed(0) + '%';
  }));
  await expect.poll(energyMatches).toBe(true);
  for(const [width, height, label] of [[1680, 1000, 'wide'], [1100, 900, 'medium'], [390, 844, 'phone']] as const){
    await page.setViewportSize({ width, height });
    await page.locator('#clab-btnFitCoaster').click();
    await expect(page.locator('.clab-energy-col')).toBeVisible();
    for(const id of ['clab-hudSpeed', 'clab-hudH', 'clab-gvVal', 'clab-glVal', 'clab-kePct', 'clab-pePct', 'clab-heatPct']){
      const bounds = (await page.locator('#' + id).boundingBox())!;
      const hud = (await page.locator('#clab-hud').boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(hud.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(hud.x + hud.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(hud.y + hud.height);
    }
    const overflow = await page.locator('#clab-hud').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(false);
    const dock = (await page.locator('#clab-viewTools').boundingBox())!, hud = (await page.locator('#clab-hud').boundingBox())!;
    expect(dock.y + dock.height).toBeLessThanOrEqual(hud.y);
    await page.locator('#clab-hud').screenshot({ path: testInfo.outputPath('instruments-' + label + '.png') });
    if(label === 'phone') await page.screenshot({ path: testInfo.outputPath('instruments-phone-scene.png') });
  }
  expect(await analysis()).toBe(baseline);
  await page.evaluate(() => (document.querySelector('[aria-label="Coaster Lab 3-D designer"]') as any)._lab.fastRun(false, false));
  await expect.poll(energyMatches).toBe(true);
  await page.locator('#clab-hud').screenshot({ path: testInfo.outputPath('instruments-after-run.png') });
  await expect(page.locator('#clab-gvTrack')).toHaveAttribute('aria-label', /Vertical seat force: .*Scale from minus 2 to plus 7 g/);
  await page.locator('#clab-btnSceneFocus').click();
  await expect(page.locator('#clab-hud')).toBeHidden();
  await page.locator('#clab-btnSceneFocus').click();
  await expect(page.locator('#clab-hud')).toBeVisible();
  expect(errors).toEqual([]);
});
