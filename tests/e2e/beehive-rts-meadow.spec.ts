import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive', preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1360, height: 1000, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 180000 });
test.use({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
test.beforeAll(async () => { mkdirSync('scratch/beehive-rts', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: any, queen: any = {}) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(queen => {
    const w = window as any;
    const originalAfterRender = w.THREE.Scene.prototype.onAfterRender;
    w.THREE.Scene.prototype.onAfterRender = function(renderer: any, scene: any, camera: any) {
      if (scene.getObjectByName('meadow-landscape')) { w.__rtsScene = scene; w.__rtsCamera = camera; }
      return originalAfterRender.call(this, renderer, scene, camera);
    };
    w.__mount({ beehive: { tutorialDone: true, soundOn: false, motionPaused: true, viewMode: 'queen', queen: { active: true, paused: true, day: 6, territory: 52, hiveHealth: 88, resources: { nectar: 100, pollen: 100, wax: 100, royalJelly: 30 }, ...queen } } });
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, queen);
  await page.locator('[data-beehive-3d-bay="queen"] canvas').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-beehive-3d-bay="queen"]')).toHaveAttribute('data-beehive-3d-status', 'ready');
}
async function shot(page: any, name: string) {
  const canvas = page.locator('[data-beehive-3d-bay="queen"] canvas'); await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(180); const box = await canvas.boundingBox();
  return page.screenshot({ path: 'scratch/beehive-rts/' + name + '.png', clip: box! });
}

async function expectTerrainInFrame(page: any) {
  await expect.poll(async()=>page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-beehive-3d-bay="queen"] canvas') as HTMLCanvasElement;return Math.abs(w.__rtsCamera.aspect-c.clientWidth/c.clientHeight)<.005;})).toBe(true);
  const bounds = await page.evaluate(() => {
    const w = window as any, earth = w.__rtsScene.getObjectByName('meadow-landscape').children[0];
    earth.geometry.computeBoundingBox(); earth.updateWorldMatrix(true, false);
    const box = earth.geometry.boundingBox, projected: number[][] = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new w.THREE.Vector3(x, y, z).applyMatrix4(earth.matrixWorld).project(w.__rtsCamera);
      projected.push([p.x, p.y]);
    }
    return projected;
  });
  for (const point of bounds) for (const coordinate of point) expect(Math.abs(coordinate), 'terrain exceeds the visible frame').toBeLessThan(.97);
}

test('puts a detailed live meadow first and connects objectives to real commands', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  const bay = page.locator('[data-beehive-3d-bay="queen"]');
  await page.evaluate(() => window.scrollTo(0, 0));
  expect((await bay.boundingBox())!.y).toBeLessThan(650);
  expect((await bay.boundingBox())!.y).toBeLessThan((await page.locator('#beehive-queen-playfield').boundingBox())!.y);
  const before = await shot(page, 'meadow-before');
  await expectTerrainInFrame(page);
  await bay.locator('[data-rts-field-command="scout_rival"]').click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.queen.territory)).toBe(54);
  await expect(bay.locator('[data-rts-map-impact]')).toContainText('Scouts report');
  await expect(bay.locator('[data-rts-target="Rival intel"]')).toContainText('45%');
  await bay.getByRole('button', { name: 'Step one cycle', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.queen.day)).toBe(7);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.queen.paused)).toBe(true);
  await expect(bay.locator('[data-rts-map-impact]')).toContainText('Cycle 7');
  const after = await shot(page, 'meadow-after-scouting');
  // Scouting changes the reported game readings, not flower ownership.
  expect(Buffer.compare(before, after)).toBe(0);
  await bay.getByRole('button', { name: 'Show target on map', exact: true }).click();
  const focused = await shot(page, 'meadow-focused'); expect(Buffer.compare(after, focused)).not.toBe(0);
  await bay.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'scratch/beehive-rts/desktop-rts.png' });
  expect(errors).toEqual([]);
});

test('renders seasonal terrain and distinct buildings while retaining the WebGL canvas', async ({ page }) => {
  await mount(page, { structures: [] });
  const selector = '[data-beehive-3d-bay="queen"] canvas';
  await page.locator(selector).evaluate((canvas: any) => { canvas.__keptCanvas = true; });
  await page.getByRole('checkbox', { name: 'Game buildings & raids', exact: true }).check();
  const empty = await shot(page, 'meadow-empty');
  await page.evaluate(() => {
    const w = window as any, q = w.__toolData.beehive.queen;
    w.__ctx.updateMulti('beehive', { queen: { ...q, structures: ['brood', 'honey', 'pollen', 'guard', 'nursery', 'fan'].map((type, i) => ({ type, x: .10 + i % 3 * .15, y: .20 + Math.floor(i / 3) * .5, level: 2 })) } });
  });
  const built = await shot(page, 'meadow-buildings'); expect(Buffer.compare(empty, built)).not.toBe(0);
  await expect(page.locator(selector)).toHaveJSProperty('__keptCanvas', true);
  await page.evaluate(() => { const w = window as any, q = w.__toolData.beehive.queen; w.__ctx.updateMulti('beehive', { queen: { ...q, structures: q.structures.concat(Array.from({ length: 7 }, (_, i) => ({ type: 'guard', x: .12 + i % 3 * .12, y: .3 + Math.floor(i / 3) * .14, level: 1 }))) } }); });
  await expect(page.locator('[data-beehive-3d-bay="queen"]')).toContainText('13 structures built');
  await expect(page.locator(selector)).toHaveJSProperty('__keptCanvas', true);
  await page.getByRole('checkbox', { name: 'Signal domes', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Forager routes', exact: true }).uncheck();
  const layers = await shot(page, 'meadow-layers-off'); expect(Buffer.compare(built, layers)).not.toBe(0);
  await page.evaluate(() => { const w = window as any; w.__ctx.updateMulti('beehive', { queen: { ...w.__toolData.beehive.queen, day: 95 } }); });
  const winter = await shot(page, 'meadow-winter'); expect(Buffer.compare(layers, winter)).not.toBe(0);
  await expect(page.locator(selector)).toHaveJSProperty('__keptCanvas', true);
});

test('supports objective choice, construction navigation, and resource-aware responses', async ({ page }) => {
  await mount(page, { resources: { nectar: 0, pollen: 0, wax: 0, royalJelly: 0 } });
  const bay = page.locator('[data-beehive-3d-bay="queen"]');
  await bay.getByRole('combobox', { name: 'Choose an RTS field objective' }).selectOption('defend');
  await expect(bay.locator('[data-rts-field-command]')).toBeEnabled();
  await expect(bay.locator('#bee-rts-field-cost')).toContainText('no resource cost');
  await bay.getByRole('combobox', { name: 'Choose an RTS field objective' }).selectOption('build');
  await expect(bay.locator('[data-rts-field-command]')).toBeDisabled();
  await expect(bay.locator('#bee-rts-field-cost')).toContainText('missing resources');
  await bay.getByRole('button', { name: 'Open construction' }).click();
  await expect(page.locator('#bee-rts-construction')).toBeFocused();
  await page.evaluate(() => { const w = window as any; w.__ctx.updateMulti('beehive', { queen: { ...w.__toolData.beehive.queen, result: 'victory' } }); });
  await expect(bay.getByRole('button', { name: 'Resume RTS', exact: true })).toBeDisabled();
  await expect(bay.getByRole('button', { name: 'Step one cycle', exact: true })).toBeDisabled();
  await expect(bay.locator('[data-rts-field-command]')).toBeDisabled();
});

test('keeps the RTS meadow usable at 320px with dark theme and keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 }); await mount(page);
  const bay = page.locator('[data-beehive-3d-bay="queen"]');
  for (const dark of [false, true]) {
    await page.evaluate(dark => { (window as any).__ctx.isDark = dark; (window as any).__rerender(); }, dark);
    await expect(bay).toHaveAttribute('data-beehive-3d-status', 'ready');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-beehive-3d-bay="queen"]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
    });
    expect(violations).toEqual([]);
  }
  const before = await shot(page, 'mobile-dark-meadow');
  await expectTerrainInFrame(page);
  await bay.getByRole('button', { name: 'Rotate left', exact: true }).focus(); await page.keyboard.press('Space');
  const after = await shot(page, 'mobile-dark-rotated'); expect(Buffer.compare(before, after)).not.toBe(0);
  await page.getByRole('checkbox', { name: 'Map labels', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Map labels', exact: true })).toBeChecked();
});

test('explains shared foraging, regional evidence and fiction with opt-in game overlays', async ({ page }) => {
  await mount(page);
  const bay=page.locator('[data-beehive-3d-bay="queen"]');
  await expect(bay.getByRole('checkbox',{name:'Game buildings & raids',exact:true})).not.toBeChecked();
  await expect(bay.getByRole('checkbox',{name:'Signal domes',exact:true})).not.toBeChecked();
  await expect(bay).toContainText('no geographic scale');
  await bay.locator('[data-rts-science] summary').click();
  await expect(bay.locator('[data-rts-science]')).toContainText('ground, plant, rock');
  await expect(bay.locator('[data-rts-science]')).toContainText('fictional strategy mechanics');
  await expect(bay.locator('[data-rts-science] a')).toHaveCount(4);
  await expect(bay.locator('[data-rts-science] a').nth(1)).toHaveAttribute('href','https://link.springer.com/article/10.1007/s10841-026-00749-0');
  await page.screenshot({path:'scratch/beehive-rts/science-notes.png',fullPage:false});
  await bay.locator('[data-rts-science] summary').click();
  await shot(page,'shared-foraging-landscape');
  const endpoints=await page.evaluate(()=>{
    const w=window as any, lines=w.__rtsScene.getObjectByName('forage-routes').children;
    return lines.map((line:any)=>Array.from(line.geometry.attributes.position.array));
  });
  await page.evaluate(()=>{const w=window as any;w.__ctx.updateMulti('beehive',{queen:{...w.__toolData.beehive.queen,territory:0}});});
  await expect(bay).toContainText('RTS advantage 0/100');
  expect(await page.evaluate(()=>{const w=window as any;return w.__rtsScene.getObjectByName('forage-routes').children.map((line:any)=>Array.from(line.geometry.attributes.position.array));})).toEqual(endpoints);
  await expect(page.locator('#beehive-queen-playfield')).toContainText('Game score, not land ownership.');
  await expect(page.locator('#beehive-queen-playfield')).not.toContainText('Forage front');
  const canvas=bay.locator('canvas');await canvas.evaluate((c:any)=>c.__sameScienceCanvas=true);
  await bay.getByRole('checkbox',{name:'Game buildings & raids',exact:true}).check();
  await expect(bay.getByRole('button',{name:'Game buildings details',exact:true})).toBeVisible();
  await expect(canvas).toHaveJSProperty('__sameScienceCanvas',true);
  const axe=await page.evaluate(async()=>{const w=window as any;const r=await w.axe.run('[data-rts-science]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});
  expect(axe).toEqual([]);
});

test('expands the larger map, inspects individual patches, and restores keyboard focus',async({page})=>{
  await mount(page);
  const bay=page.locator('[data-beehive-3d-bay="queen"]'),canvas=bay.locator('canvas');
  const before=await page.evaluate(()=>JSON.stringify((window as any).__toolData.beehive.queen));
  await canvas.evaluate((c:any)=>c.__patchCanvas=true);
  expect((await canvas.boundingBox())!.height).toBeGreaterThan(500);
  await bay.getByRole('combobox',{name:'Inspect a flower patch'}).selectOption('patch_c');
  await expect(bay.locator('.bee-rts-inspection-readout')).toContainText('2 diagram routes shown to Patch C');
  await bay.getByRole('button',{name:'Neighbor colony',exact:true}).click();
  await expect(bay.locator('.bee-rts-inspection-readout')).toContainText('1 diagram route shown to Patch C');
  await canvas.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>{const lines=(window as any).__rtsScene.getObjectByName('forage-routes').children;return lines.filter((line:any)=>line.visible).map((line:any)=>line.userData);})).toEqual([{colony:1,patch:2}]);
  await bay.getByRole('button',{name:'Focus patch',exact:true}).click();
  await shot(page,'patch-c-neighbor');
  await bay.getByRole('button',{name:'Whole landscape',exact:true}).click();
  await canvas.scrollIntoViewIfNeeded();await expectTerrainInFrame(page);
  // Click a patch's real projected ground target to verify 3D picking.
  const target=await page.evaluate(()=>{const w=window as any,p=w.__rtsScene.getObjectByName('patch_b').children[1].getWorldPosition(new w.THREE.Vector3());p.project(w.__rtsCamera);return {x:p.x,y:p.y};});
  const box=(await canvas.boundingBox())!;
  await page.mouse.click(box.x+(target.x+1)*box.width/2,box.y+(1-target.y)*box.height/2);
  await expect(bay.getByRole('combobox',{name:'Inspect a flower patch'})).toHaveValue('patch_b');
  await bay.getByRole('button',{name:'Whole landscape',exact:true}).click();
  const normal=(await canvas.boundingBox())!;
  await bay.getByRole('button',{name:'Expand map',exact:true}).click();
  await expect(bay.getByRole('button',{name:'Exit expanded map',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.fullscreenElement?.getAttribute('data-beehive-3d-bay'))).toBe('queen');
  await canvas.scrollIntoViewIfNeeded();expect((await canvas.boundingBox())!.width).toBeGreaterThan(normal.width);
  await shot(page,'expanded-shared-map');await expectTerrainInFrame(page);
  await bay.locator('button').first().focus();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(()=>document.fullscreenElement?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(bay.locator('button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(bay.getByRole('button',{name:'Expand map',exact:true})).toBeFocused();
  await expect(canvas).toHaveJSProperty('__patchCanvas',true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.beehive.queen))).toBe(before);
  await bay.getByRole('checkbox',{name:'Forager routes',exact:true}).uncheck();
  await expect(bay.locator('.bee-rts-inspection-readout')).toContainText('0 diagram routes');
  const axe=await page.evaluate(async()=>{const w=window as any;const r=await w.axe.run('[data-rts-patch-explorer]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});
  expect(axe).toEqual([]);
});
