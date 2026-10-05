import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ retries: 0, timeout: 90000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-orion-passage');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer',
  width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: 'const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__passageCamera=c;return render.apply(this,arguments);};return r;}});'
});
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const navigation = (page: Page) => page.getByRole('region', { name: 'Nebula navigation', exact: true });
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
const pose = async (page: Page): Promise<Pose> => JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
const targets = [
  { id: 'trapezium', label: 'Near the Trapezium', eye: [.75, .52, 4.2], aim: [-.144, .336, 3.24] },
  { id: 'cavity', label: 'Inside the cavity', eye: [.05, .6, 5.4], aim: [1.4, -2.3, 1] },
  { id: 'front', label: 'Along the glowing front', eye: [7, -4.5, 3.5], aim: [4.56, -2.76, .84] },
  { id: 'dust', label: 'Beside the dust ridge', eye: [-6.6, 6.6, 6.8], aim: [-3.6, 4.56, 2.64] }
];
function expectTarget(actual: Pose, target: typeof targets[number]) {
  [actual.x, actual.y, actual.z].forEach((v, i) => expect(v).toBeCloseTo(target.eye[i], 8));
  const d = target.aim.map((v, i) => v - target.eye[i]);
  expect(actual.heading).toBeCloseTo((Math.atan2(d[0], -d[2]) * 180 / Math.PI + 360) % 360, 8);
  expect(actual.pitch).toBeCloseTo(Math.atan2(d[1], Math.hypot(d[0], d[2])), 8);
}
async function midPassage(page: Page) {
  try {
    await page.waitForFunction(() => {
      const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
      const progress = Number(c?.dataset.atlasNebulaProgress);
      return c?.dataset.atlasNebulaCourse === 'moving' && progress > .08 && progress < .85;
    }, null, { polling: 100, timeout: 30000 });
  } catch (error) {
    console.log('Passage timeout:', await page.evaluate(() => {
      const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
      const box = c?.getBoundingClientRect();
      return { dataset: { ...c?.dataset }, bounds: box && { top: box.top, bottom: box.bottom, height: box.height },
        focus: document.activeElement?.tagName, hidden: document.hidden,
        resume: !!document.querySelector('.sx-nebula-course button'),
        errors: (window as any).__events.errors };
    }));
    await page.locator('.sx-stage').screenshot({ path: path.join(out, 'orion-passage-timeout.png') });
    throw error;
  }
  return Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
}
async function mount(page: Page, phone = false) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: phone ? 'reduce' : 'no-preference' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  const tools = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await tools.count()) await tools.click();
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('orion-nebula');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'orion-nebula', { timeout: 20000 });
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await canvas(page).scrollIntoViewIfNeeded();
  await canvas(page).focus();
  if (!phone) {
    await expect(page.getByRole('button', { name: 'Resume ambience', exact: true })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Camera travel rate', exact: true })).toHaveValue('0.8');
  }
  return errors;
}
async function visit(page: Page, label: string) {
  await navigation(page).getByRole('button', { name: label, exact: true }).click();
  await expect(canvas(page)).toBeFocused();
}
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any;
    rec.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const model = root.userData.model, nebula = model.userData.nebula;
    return {
      position: model.worldToLocal(w.__passageCamera.position.clone()).multiplyScalar(24).toArray(),
      scale: root.scale.x, stars: Array.from(nebula.stars.geometry.attributes.position.array),
      texture: nebula.cloud.material.uniforms.uVolume.value.uuid, type: rec.type, renders: rec.renders
    };
  });
}
async function assertStill(page: Page, expected: Pose) {
  await page.waitForTimeout(300);
  expect(await pose(page)).toEqual(expected);
}
async function nonblank(page: Page) {
  const pixels = await harness.glPixels(page);
  expect(pixels).not.toBeNull();
  expect(looksBlank(pixels!)).toBe(false);
  // glPixels hides the controls and can blur the interactive canvas.
  await canvas(page).focus();
}

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('a passage moves continuously with ambience paused, brakes, resumes and arrives at an exact viewpoint', async ({ page }) => {
  const errors = await mount(page), initial = await pose(page), before = await scene(page);
  await visit(page, targets[0].label);
  await midPassage(page);
  const intermediate = await pose(page);
  expect(intermediate.z).toBeLessThan(initial.z);
  expect(intermediate.z).toBeGreaterThan(targets[0].eye[2]);
  expect(intermediate.travel).toBe(initial.travel);
  const previousPath = await navigation(page).locator('[data-nebula-course-path]').getAttribute('d');
  await visit(page, targets[2].label);
  await midPassage(page);
  await expect(navigation(page).locator('[data-nebula-stop="front"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(navigation(page).locator('[data-nebula-stop="trapezium"]')).toHaveAttribute('aria-pressed', 'false');
  expect(await navigation(page).locator('[data-nebula-course-path]').getAttribute('d')).not.toBe(previousPath);
  const beforeShift = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  await page.keyboard.down('Shift');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'moving');
  await page.waitForFunction(p => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
    return Number(c?.dataset.atlasNebulaProgress) > p + .02;
  }, beforeShift, { polling: 100, timeout: 15000 });
  await page.keyboard.up('Shift');
  const progress = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  await navigation(page).getByRole('button', { name: 'Brake', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  const paused = await pose(page), pausedProgress = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  expect(pausedProgress).toBeGreaterThanOrEqual(progress);
  await assertStill(page, paused);
  await navigation(page).getByRole('button', { name: 'Resume passage', exact: true }).click();
  await expect(canvas(page)).toBeFocused();
  await page.waitForFunction(p => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
    return Number(c?.dataset.atlasNebulaProgress) > p;
  }, pausedProgress, { polling: 100, timeout: 15000 });
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 40000 });
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-progress', '1');
  const arrived = await pose(page), after = await scene(page);
  expectTarget(arrived, targets[2]);
  expect(arrived.travel).toBe(initial.travel);
  after.position.forEach((v: number, i: number) => expect(v).toBeCloseTo(targets[2].eye[i], 8));
  expect(after.scale).toBe(before.scale);
  expect(after.stars).toEqual(before.stars);
  expect(after.texture).toBe(before.texture);
  await assertStill(page, arrived);
  const idle = await scene(page);
  await page.waitForTimeout(400);
  expect((await scene(page)).renders - idle.renders).toBeLessThanOrEqual(1);
  await nonblank(page);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'orion-passage-arrival.png') });
  expect(errors).toEqual([]);
});

test('manual movement cancels a passage and an observation restores a mid-passage pose without restarting travel', async ({ page }) => {
  const errors = await mount(page);
  await visit(page, targets[1].label);
  await midPassage(page);
  await canvas(page).focus();
  await page.keyboard.down('w');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await expect.poll(async () => (await pose(page)).travel, { timeout: 15000 }).toBeGreaterThan(.03);
  await page.keyboard.press('Space');
  await page.keyboard.up('w');
  await visit(page, targets[2].label);
  await midPassage(page);
  const beforeLook = await pose(page), box = (await canvas(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .57, box.y + box.height * .6, { steps: 4 });
  await page.mouse.up();
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  expect((await pose(page)).heading).not.toBeCloseTo(beforeLook.heading, 3);
  await visit(page, targets[3].label);
  await midPassage(page);
  await page.keyboard.press('Space');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  const saved = await pose(page);
  expect(saved.x).not.toBe(targets[3].eye[0]);
  const book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await book.getByRole('textbox').fill('The dust ridge is still ahead of this paused passage.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const record = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations.find((entry: any) => entry.itemId === 'orion-nebula'));
  expect(record.nebulaInside).toBe(true);
  expect(record.nebulaPose).toEqual(saved);
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('moon');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await book.locator('[data-observation="orion-nebula:"]').getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect.poll(() => pose(page), { timeout: 15000 }).toEqual(saved);
  await canvas(page).scrollIntoViewIfNeeded();
  await canvas(page).focus();
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await expect(navigation(page).getByRole('button', { name: 'Resume passage', exact: true })).toHaveCount(0);
  await assertStill(page, saved);
  await page.keyboard.press('Escape');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside', 'active');
  expect(errors).toEqual([]);
});

test('scrolling away pauses a passage and reset or exit clears its course without idle rendering', async ({ page }) => {
  const errors = await mount(page), initial = await pose(page);
  await visit(page, targets[2].label);
  await midPassage(page);
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'passage-scroll-space';
    spacer.style.height = '1800px';
    document.body.appendChild(spacer);
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => document.querySelector('[data-atlas-ready]')!.getBoundingClientRect().bottom < 0);
  await expect(navigation(page).getByRole('button', { name: 'Resume passage', exact: true })).toHaveCount(1);
  const offscreen = await pose(page), offscreenScene = await scene(page);
  await page.waitForTimeout(350);
  expect(await pose(page)).toEqual(offscreen);
  expect((await scene(page)).renders - offscreenScene.renders).toBeLessThanOrEqual(1);
  await canvas(page).scrollIntoViewIfNeeded();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  await assertStill(page, offscreen);
  const beforeResume = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  await navigation(page).getByRole('button', { name: 'Resume passage', exact: true }).click();
  await expect(canvas(page)).toBeFocused();
  await page.waitForFunction(p => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
    return c?.dataset.atlasNebulaCourse === 'moving' && Number(c.dataset.atlasNebulaProgress) > p + .02;
  }, beforeResume, { polling: 100, timeout: 15000 });
  await page.keyboard.press('r');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-progress', /.+/);
  await expect.poll(() => pose(page)).toEqual(initial);
  await expect(navigation(page).getByRole('button', { name: 'Resume passage', exact: true })).toHaveCount(0);
  await assertStill(page, initial);
  const idle = await scene(page);
  await page.waitForTimeout(350);
  expect((await scene(page)).renders - idle.renders).toBeLessThanOrEqual(1);
  await visit(page, targets[3].label);
  await midPassage(page);
  await page.keyboard.press('Escape');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-progress', /.+/);
  await expect(page.getByRole('button', { name: 'Enter the nebula', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('320px WebGL 1 honors reduced motion with immediate, stable viewpoint changes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
      if (type === 'webgl2') return null;
      return original.apply(this, [type, ...args] as any);
    };
  });
  const errors = await mount(page, true), before = await scene(page), initial = await pose(page);
  expect(before.type).toBe('webgl');
  for (const target of targets) {
    await visit(page, target.label);
    await expect(navigation(page).locator('[data-nebula-stop="' + target.id + '"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await pose(page)).x).toBeCloseTo(target.eye[0], 8);
    const current = await pose(page);
    expectTarget(current, target);
    expect(current.travel).toBe(initial.travel);
    await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived');
    await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-progress', '1');
    await assertStill(page, current);
    if (target.id === 'cavity' || target.id === 'front' || target.id === 'dust') {
      await page.locator('.sx-stage').screenshot({ path: path.join(out, 'orion-passage-' + target.id + '-phone.png') });
    }
  }
  const after = await scene(page);
  expect(after.scale).toBe(before.scale);
  expect(after.stars).toEqual(before.stars);
  expect(after.texture).toBe(before.texture);
  expect((await canvas(page).boundingBox())!.height).toBeGreaterThan(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await nonblank(page);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'orion-passage-phone.png') });
  await navigation(page).getByRole('button', { name: 'Whole nebula', exact: true }).click();
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  expect(errors).toEqual([]);
});
