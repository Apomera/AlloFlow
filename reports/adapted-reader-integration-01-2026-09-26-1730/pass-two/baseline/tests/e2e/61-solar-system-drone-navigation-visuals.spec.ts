import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const desktop = new GlHarness({ toolFile:'stem_lab/stem_tool_solarsystem.js', toolId:'solarSystem', width:1180, height:900, appStyles:true });
const mobile = new GlHarness({ toolFile:'stem_lab/stem_tool_solarsystem.js', toolId:'solarSystem', width:340, height:820, appStyles:true });
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.describe.configure({ timeout:180000 });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

for (const mode of [
  { planet:'mars', vehicle:'surface-rover', radius:5000, mobile:false },
  { planet:'mars', vehicle:'surface-rover', radius:5000, mobile:true },
  { planet:'earth', vehicle:'deep-sea-submersible', radius:10000, mobile:true },
  { planet:'jupiter', vehicle:'atmospheric-probe', radius:10000, mobile:false },
]) {
  test(mode.vehicle + (mode.mobile ? ' mobile' : ' desktop') + ' has a scaled, readable north-up navigation display', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion:'reduce' });
    await page.setViewportSize(mode.mobile ? {width:340,height:820} : {width:1180,height:900});
    const harness = mode.mobile ? mobile : desktop;
    await harness.mount(page, {solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}}, 'document.querySelector("[data-drone-map-panel]")');
    const canvas = page.locator('canvas[data-drone-vehicle-mode="'+mode.vehicle+'"]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById('descent-status'), null, {timeout:45000});
    const map = page.locator('[data-drone-minimap]');
    await expect(map).toHaveAttribute('data-radius-meters', String(mode.radius));
    await expect(map).toHaveAttribute('aria-label', /North-up local map.*Horizontal distances use the scene model scale/);
    await expect(page.locator('[data-drone-map-scale]')).toHaveText((mode.radius/1000)+' km to edge');
    await expect(map).toHaveAttribute('data-route-points', /^[1-9]\d*$/);
    const resolution = await map.evaluate((el:HTMLCanvasElement) => ({width:el.width,display:el.getBoundingClientRect().width}));
    expect(resolution.width).toBeGreaterThanOrEqual(resolution.display);
    await canvas.focus();
    const initial = Number(await canvas.getAttribute('data-drone-heading'));
    await page.keyboard.down('ArrowRight');
    try {
      await page.waitForFunction((start) => {
        const heading = Number((document.querySelector('[data-drone-canvas]') as HTMLElement)?.dataset.droneHeading);
        const change = (heading - start + 360) % 360;
        return change > 12 && change < 100;
      }, initial, {timeout:20000});
    } finally { await page.keyboard.up('ArrowRight'); }
    await expect.poll(async () => await map.getAttribute('data-heading')).toBe(await canvas.getAttribute('data-drone-heading'));
    await expect(page.locator('[data-compass-degrees]')).toHaveText(/^\d{3}°$/);
    const beforeRoute = Number(await map.getAttribute('data-route-points'));
    await page.keyboard.down('KeyW');
    try {
      await expect.poll(async () => Number(await map.getAttribute('data-route-points')), {timeout:20000}).toBeGreaterThan(beforeRoute);
    } finally { await page.keyboard.up('KeyW'); }
    expect(Number(await map.getAttribute('data-route-points'))).toBeLessThanOrEqual(160);
    await page.locator('[data-drone-command="n"]').click();
    await expect(page.locator('[data-drone-map-panel]')).toBeVisible();
    if (mode.vehicle === 'surface-rover') {
      const separation = await page.evaluate(() => {
        const map = document.querySelector('[data-drone-map-panel]')!.getBoundingClientRect();
        const panel = document.querySelector('#rover-traverse-panel')!.getBoundingClientRect();
        return map.left - panel.right;
      });
      expect(separation).toBeGreaterThanOrEqual(4);
    }
    if (mode.mobile) {
      const boxes = await page.evaluate(() => {
        const map = document.querySelector('[data-drone-map-panel]')!.getBoundingClientRect();
        const dock = document.querySelector('[data-drone-action-dock]')!.getBoundingClientRect();
        const nav = document.querySelector('[data-drone-navigation-card]')!.getBoundingClientRect();
        return { map:{left:map.left,right:map.right,bottom:map.bottom}, dockTop:dock.top, navRight:nav.right, width:innerWidth };
      });
      expect(boxes.map.left).toBeGreaterThanOrEqual(0);
      expect(boxes.map.left - boxes.navRight).toBeGreaterThanOrEqual(4);
      expect(boxes.map.right).toBeLessThanOrEqual(boxes.width);
      expect(boxes.map.bottom).toBeLessThanOrEqual(boxes.dockTop);
    }
    await page.locator('#drone-fullscreen-container').screenshot({path:testInfo.outputPath(mode.planet+'-navigation.png'),timeout:60000});
    expect((await page.evaluate(() => (window as any).__events.errors)).filter((e:string) => !/ResizeObserver loop/.test(e))).toEqual([]);
    await harness.destroy(page);
    await expect(page.locator('[data-drone-map-panel]')).toHaveCount(0);
  });
}
