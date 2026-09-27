import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1360, height: 900, layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
const out = path.resolve('reports/scale-explorer-realism');
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any) {
  await page.setViewportSize({ width: 1400, height: 1050 });
  await harness.mount(page, {}, '!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select{font-family:inherit}' });
}
async function fly(page: any, id: string) {
  const destination = page.getByRole('combobox', { name: 'Choose a destination', exact: true });
  await destination.selectOption(id);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', new RegExp('(^|,)' + id + '(,|$)'));
  // Wait for arrival, independently of the software renderer's frame rate.
  await expect.poll(async () => page.locator('[data-atlas-ready]').evaluate((el: HTMLElement) => Math.abs(Number(el.dataset.atlasTarget) - Number(el.dataset.atlasExponent)))).toBeLessThan(0.002);
}

test('real 3D models, scale travel, orbit, chart switching and clean teardown', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await mount(page);
  const canvas = page.locator('[data-atlas-ready]');
  await expect(canvas).toHaveAttribute('data-atlas-surface', 'detailed');
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.locator('.sx-explorer').screenshot({ path: path.join(out, 'desktop.png') });
  for (const id of ['elephant', 'blue-whale', 'rbc', 'mitochondrion', 'virus', 'dna', 'carbon', 'earth', 'moon', 'jupiter', 'sun', 'milkyway', 'universe']) {
    await fly(page, id);
    if (['earth','moon','jupiter'].includes(id)) {
      await expect.poll(async () => page.evaluate(id => {
        const record=(window as any).__glRecorder.records.find((r: any)=>!r.ctx.isContextLost());
        let ready=false;record.scene.traverse((o:any)=>{if(o.userData.itemId===id)ready=o.userData.model.userData.imageryReady===true;});return ready;
      },id)).toBe(true);
    }
    await page.locator('.sx-stage').screenshot({ path: path.join(out, `${id}.png`) });
    expect(looksBlank(await harness.glPixels(page)), id).toBe(false);
  }
  await fly(page, 'human');
  await page.getByRole('button', { name: 'Size neighbors', exact: true }).click();
  await expect.poll(async () => (await canvas.getAttribute('data-atlas-objects'))!.split(',').length).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Size neighbors', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-objects', 'human');
  await page.getByRole('button', { name: 'Measurement', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Measurement', exact: true })).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button', { name: 'Measurement', exact: true }).click();
  const before = Number(await canvas.getAttribute('data-atlas-exponent'));
  await page.getByRole('button', { name: 'Explore 10× larger', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(before + 1, 2);
  await canvas.focus(); await page.keyboard.press('Home');
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(1.7), 2);
  await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-0.2, 2);
  await canvas.focus(); await page.keyboard.press('d');
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-0.08, 2);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-yaw', '0.0000');
  for(let i=0;i<8;i++)await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(-1.6,2);
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => Number(await canvas.getAttribute('data-atlas-yaw'))).toBeLessThan(-0.25);
  await page.getByRole('button', { name: 'Scale chart', exact: true }).click();
  await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  await expect.poll(async () => (await harness.glContexts(page)).filter(c => !c.lost).length).toBe(0);
  await page.getByRole('button', { name: 'Immersive 3D', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('phone, reduced motion, all destinations, height, comparisons, and context loss', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toBeDisabled();
  const ids = await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).locator('option').evaluateAll(nodes => nodes.map(n => (n as HTMLOptionElement).value));
  for (const id of ids) {
    await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
    await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', new RegExp('(^|,)' + id + '(,|$)'));
  }
  const cached = await page.evaluate(() => {
    const r = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let count = 0; r.scene.traverse((o: any) => { if (o.userData.itemId) count++; }); return count;
  });
  expect(cached).toBeLessThanOrEqual(10);
  await fly(page, 'earth');
  await expect.poll(async () => page.evaluate(() => {
    const record=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());
    let ready=false;record.scene.traverse((o:any)=>{if(o.userData.itemId==='earth')ready=o.userData.model.userData.imageryReady===true;});return ready;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: path.join(out, 'phone.png') });
  await fly(page, 'human');
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('120');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await page.locator('[data-atlas-ready]').scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await page.locator('[data-atlas-ready]').getAttribute('data-atlas-exponent'))).toBeCloseTo(Math.log10(1.2), 2);
  await page.getByText('Compare two sizes', { exact: true }).click();
  await page.locator('details[open] select').nth(0).selectOption('earth');
  await page.locator('details[open] select').nth(1).selectOption('sun');
  await page.getByRole('button', { name: 'Compare them', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /109 times/ })).toBeVisible();
  // Lose the actual context created by the tool, not a context manufactured by a test.
  await page.evaluate(() => {
    const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    record.ctx.getExtension('WEBGL_lose_context').loseContext();
  });
  await expect(page.getByRole('status').filter({ hasText: 'The 3D view is unavailable.' })).toBeVisible();
  await expect(page.getByRole('application', { name: /^Scale view/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('dna');
  await expect(page.getByRole('combobox', { name: 'Choose a destination', exact: true })).toHaveValue('dna');
});

test('unavailable model and texture assets retain an interactive scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/makehuman-body-surface.glb', route => route.abort());
  await page.route('**/scale-earth-bluemarble-1k.png', route => route.abort());
  await mount(page);
  const canvas=page.locator('[data-atlas-ready]');
  await expect(canvas).toHaveAttribute('data-atlas-surface','procedural');
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await fly(page,'earth');
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-atlas-yaw'))).toBeCloseTo(.2,2);
  await expect(page.getByRole('button',{name:'Immersive 3D',exact:true})).toHaveAttribute('aria-pressed','true');
});
