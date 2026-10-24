import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var r=Reflect.construct(target,args,newTarget),render=r.render;r.render=function(scene,camera){window.__earCamera=camera;return render.apply(this,arguments);};return r;}});`,
});
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-ears-save-readiness';
test.describe.configure({ timeout: 240_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors).toEqual([]);
});

async function choose(page: Page, id: string, step: number, index = 0) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  if (!(await meadow.getByLabel('Representative animal', { exact: true }).count())) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(step));
  const select = meadow.getByLabel('Representative animal', { exact: true });
  if (await select.isEnabled()) await select.selectOption(String(index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-selected-species', id);
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(step));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(index));
}

async function actualRabbit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, scene = w.__glCanvas('[data-efw-meadow]').rec.scene, canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const index = Number(canvas.getAttribute('data-representative-index')), step = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Number(canvas.getAttribute('data-step'));
    const animal = scene.children.filter((g: any) => g.userData.headSurface?.name === 'eco-rabbits-head-surface')[index], d = animal.userData;
    const pose = w.__earFrames[step].rabbits[index], expected = w.StemLab.ecosystemFoodWeb.mammalArticulation('rabbits', pose, matchMedia('(prefers-reduced-motion: reduce)').matches);
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    const ears = d.ears.map((ear: any) => {
      const pinna = ear.children.find((node: any) => node.isMesh), batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(pinna));
      const slot = batch?.userData.parts.filter(shown).indexOf(pinna), matrix = new w.THREE.Matrix4();
      if (batch && slot >= 0) batch.getMatrixAt(slot, matrix);
      return { side: ear.userData.side, position: ear.position.toArray(), rotation: ear.rotation.toArray(), geometry: pinna.geometry.uuid, drawError: !batch || slot < 0 ? null : Math.max(...matrix.elements.map((n: number, k: number) => Math.abs(n - pinna.matrixWorld.elements[k]))) };
    });
    return { expected, applied: d.mammalArticulation, ears, head: d.head.matrix.toArray(), feet: d.paws.map((joint: any, k: number) => ({ x: joint.userData.paw.matrixWorld.elements[12], z: joint.userData.paw.matrixWorld.elements[14], target: pose.footPlants[k] })) };
  });
}

async function projectedAnimal(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, rec = w.__glCanvas('[data-efw-meadow]').rec, canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const index = Number(canvas.getAttribute('data-representative-index')), animal = rec.scene.children.filter((g: any) => g.userData.headSurface?.name === 'eco-' + id + '-head-surface')[index];
    const bounds = { x: 0, y: 0, vertices: 0, behind: 0 };
    animal.traverse((part: any) => {
      if (!part.isMesh) return;
      const positions = part.geometry.getAttribute('position');
      for (let k = 0; k < positions.count; k++) {
        const p = new w.THREE.Vector3().fromBufferAttribute(positions, k).applyMatrix4(part.matrixWorld).project(w.__earCamera);
        bounds.x = Math.max(bounds.x, Math.abs(p.x)); bounds.y = Math.max(bounds.y, Math.abs(p.y)); bounds.vertices++;
        if (p.z < -1 || p.z > 1) bounds.behind++;
      }
    });
    return bounds;
  }, id);
}

test('recorded rabbit ear follow-through reaches actual drawn pinnae and whole-animal controls recover complete mobile rear framing', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await page.waitForFunction(() => { const hit = (window as any).__glCanvas?.('[data-efw-meadow]'); return hit?.rec?.scene && hit.rec.draws > 0 && document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index'); }, undefined, { timeout: 60_000 });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, c = w.__toolData.ecosystem.foodWeb.run.config;
    w.__earFrames = api.behaviorTimeline(c, api.compare(c).baseline);
    let best: any = null;
    w.__earFrames.forEach((frame: any, step: number) => frame.rabbits.forEach((pose: any, index: number) => {
      const applied = api.mammalArticulation('rabbits', pose, false), score = Math.abs(applied.earFollowPitch) + Math.abs(applied.earFollowYaw);
      if (pose.active && pose.state === 'Alert' && score > (best?.score || .04)) best = { step, index, score };
    }));
    return best;
  });
  expect(fixture).toBeTruthy();
  await choose(page, 'rabbits', fixture.step, fixture.index);
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await meadow.getByRole('button', { name: 'Whole animal', exact: true }).click();
  await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
  const rabbit = await actualRabbit(page);
  expect(Math.abs(rabbit.applied.earFollowPitch) + Math.abs(rabbit.applied.earFollowYaw)).toBeGreaterThan(.04);
  expect(rabbit.applied).toEqual(rabbit.expected);
  for (const ear of rabbit.ears) {
    expect(ear.rotation[1]).toBeCloseTo(ear.side < 0 ? rabbit.expected.earLeft : rabbit.expected.earRight, 12);
    expect(ear.rotation[2]).toBeCloseTo(rabbit.expected.earTilt, 12);
    expect(ear.drawError).not.toBeNull(); expect(ear.drawError!).toBeLessThan(2e-6);
  }
  for (const foot of rabbit.feet) { expect(foot.x).toBeCloseTo(foot.target.x, 10); expect(foot.z).toBeCloseTo(foot.target.z, 10); }
  await meadow.locator('.efw-meadow-stage').screenshot({ path: reportDir + '/rabbit-ear-follow-through.jpg', type: 'jpeg', quality: 88 });
  await choose(page, 'rabbits', 0, fixture.index); await choose(page, 'rabbits', fixture.step, fixture.index);
  expect(await actualRabbit(page)).toEqual(rabbit);
  await choose(page, 'rabbits', Math.max(1, fixture.step - 6), fixture.index);
  await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('0.5');
  await page.evaluate(index => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal = scene.children.filter((g: any) => g.userData.headSurface?.name === 'eco-rabbits-head-surface')[index];
    const keys = ['earFollowPitch', 'earFollowYaw', 'earLeft', 'earRight', 'earTilt', 'headPitch', 'headYaw'];
    const raw = w.__earFrames.map((frame: any) => { const art = api.mammalArticulation('rabbits', frame.rabbits[index], false); return keys.map(key => art[key]); });
    w.__earPlayback = []; w.__earSampling = true; let previous: number[] | null = null;
    function sample() {
      if (!w.__earSampling) return;
      const art = animal.userData.mammalArticulation, values = keys.map(key => art[key]);
      const changed = !previous || values.some((n: number, k: number) => Math.abs(n - previous![k]) > 1e-6);
      const fractional = raw.every((point: number[]) => values.some((n: number, k: number) => Math.abs(n - point[k]) > 1e-6));
      if (changed && fractional && Math.abs(art.earFollowPitch) + Math.abs(art.earFollowYaw) > .001) {
        const errors = animal.userData.ears.map((ear: any) => Math.max(Math.abs(ear.rotation.y - (ear.userData.side < 0 ? art.earLeft : art.earRight)), Math.abs(ear.rotation.z - art.earTilt)));
        w.__earPlayback.push({ values, errors }); previous = values;
      }
      if (w.__earPlayback.length < 6) requestAnimationFrame(sample); else w.__earSampling = false;
    }
    requestAnimationFrame(sample);
  }, fixture.index);
  try {
    await meadow.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__earPlayback.length), { timeout: 45_000 }).toBeGreaterThanOrEqual(3);
  } finally {
    await page.evaluate(() => { (window as any).__earSampling = false; });
    const pause = meadow.getByRole('button', { name: 'Pause meadow timeline', exact: true });
    if (await pause.count()) await pause.click();
  }
  const playback = await page.evaluate(() => (window as any).__earPlayback);
  for (const point of playback) for (const error of point.errors) expect(error).toBeLessThan(1e-12);
  await test.info().attach('actual-fractional-ear-playback', { body: JSON.stringify(playback), contentType: 'application/json' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const still = await actualRabbit(page);
  expect(still.applied.earFollowPitch).toBe(0); expect(still.applied.earFollowYaw).toBe(0);
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill('180'); expect(await actualRabbit(page)).toEqual(still);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['foxes', 'rabbits']) {
    await choose(page, id, 0);
    await meadow.getByRole('button', { name: 'Face detail', exact: true }).click();
    await expect(meadow.getByLabel('Meadow camera distance', { exact: true })).toHaveValue('8');
    await meadow.getByRole('button', { name: 'Whole animal', exact: true }).press('Enter');
    await expect(meadow.getByLabel('Meadow camera distance', { exact: true })).toHaveValue('19');
    await expect(canvas).toHaveAttribute('data-specimen-framing', 'whole');
    await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8');
    await meadow.getByRole('button', { name: 'Rear view', exact: true }).press('Enter');
    await expect(meadow.getByLabel('Meadow camera distance', { exact: true })).toHaveValue('19');
    const bounds = await projectedAnimal(page, id);
    expect(bounds.vertices).toBeGreaterThan(5000); expect(bounds.behind).toBe(0);
    expect(bounds.x).toBeLessThan(.96); expect(bounds.y).toBeLessThan(.96);
    await test.info().attach(id + '-actual-rear-projection', { body: JSON.stringify(bounds), contentType: 'application/json' });
    await meadow.locator('.efw-meadow-stage').screenshot({ path: reportDir + '/mobile-' + id + '-whole-rear.jpg', type: 'jpeg', quality: 88 });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
