import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'), toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', failures = new WeakMap<Page, string[]>();
const strike = (page: Page) => page.getByRole('button', { name: 'Strike [E]', exact: true });
async function step(page: Page, frames: number) { await page.evaluate(async frames => { const w = window as any; for (let i = 0; i < frames; i++) { w.__feedbackStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__feedbackStep !== 0); } }, frames); }
async function mount(page: Page) {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any; w.__feedbackScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene; w.__feedbackPlayer = w.__feedbackScene.getObjectByName('cl-player');
    const crabs = w.__feedbackScene.children.filter((o: any) => o.userData.alive && o.userData.cfg), clams = w.__feedbackScene.children.filter((o: any) => o.userData.alive && 'drillProgress' in o.userData), rocks = w.__feedbackScene.children.filter((o: any) => o.userData.substrate === 'rock');
    if (!crabs.length || clams.length !== 8 || !rocks.length) throw new Error('The actual seeded prey and rock actors are required'); w.__feedbackCrab = crabs[0]; w.__feedbackClam = clams[0]; w.__feedbackClams = clams; w.__feedbackRock = rocks[0];
    w.__feedbackStep = 0; w.__feedbackTicks = 0; w.THREE.Clock.prototype.getDelta = function () { const dt = w.__feedbackStep; w.__feedbackStep = 0; if (dt) w.__feedbackTicks++; return dt; };
    crabs.forEach((o: any) => { o.position.set(60, .18, 60); o.userData.speed = 0; }); clams.forEach((o: any) => o.position.set(60, .1, 60));
    w.__feedbackScene.children.forEach((o: any) => { if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; if (o.userData.substrate === 'rock') { o.position.x = -45; o.position.z = -45; o.userData.substrateRadius = 0; } });
    w.__feedbackPlayer.position.x = 0; w.__feedbackPlayer.position.z = 0; w.__feedbackCrab.position.set(0, .18, 1.4);
    const previous = w.__feedbackScene.onAfterRender; w.__feedbackScene.onAfterRender = function (renderer: any, scene: any, camera: any) { previous.apply(this, arguments); w.__feedbackCamera = camera; };
    w.__feedbackScene.updateMatrixWorld(true);
  });
  await page.locator(canvas).focus(); await step(page, 4); await page.keyboard.press('KeyT'); await step(page, 4);
  expect(await page.evaluate(() => { const w = window as any, halo = w.__feedbackScene.getObjectByName('cl-target'); return Math.hypot(halo.position.x - w.__feedbackCrab.position.x, halo.position.z - w.__feedbackCrab.position.z); })).toBeLessThan(1e-7);
}
async function place(page: Page, distance: number, clam: boolean) { await page.evaluate(({ distance, clam }) => { const w = window as any, p = w.__feedbackPlayer.position; w.__feedbackCrab.position.set(p.x, .18, p.z + distance); w.__feedbackClam.position.set(clam ? p.x - .5 : 60, .1, clam ? p.z : 60); w.__feedbackScene.updateMatrixWorld(true); }, { distance, clam }); await step(page, 4); }
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const w = window as any, brief = document.querySelector('.cl-mission-brief') as HTMLElement, bounds = brief.getBoundingClientRect(); let visible = !brief.hidden && bounds.width > 0 && bounds.height > 0 && bounds.right > 0 && bounds.bottom > 0 && bounds.left < innerWidth && bounds.top < innerHeight;
    for (let node: HTMLElement | null = brief; node; node = node.parentElement) { const style = getComputedStyle(node); if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) visible = false; }
    const crab = w.__feedbackCrab, clam = w.__feedbackClam, player = w.__feedbackPlayer.position, progress = document.querySelector('progress[aria-label="Foraging progress"]') as HTMLProgressElement;
    return { visible, text: visible ? brief.textContent : '', rawText: brief.textContent, hidden: brief.hidden, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, target: document.querySelector('[data-target=action]')!.textContent,
      crabAlive: crab.userData.alive, clamAlive: clam.userData.alive, clamInScene: clam.parent === w.__feedbackScene, clamAngle: clam.children[1].rotation.x, progress: progress.value, clamDistance: Math.hypot(clam.position.x - player.x, clam.position.z - player.z), clamHeight: Math.abs(clam.position.y - player.y), crabDistance: Math.hypot(crab.position.x - player.x, crab.position.z - player.z), score: Number(document.querySelector('[data-hud=score]')!.textContent), aliveClams: w.__feedbackClams.filter((o: any) => o.userData.alive).length, ticks: w.__feedbackTicks };
  });
}
async function actualCrabClick(page: Page) {
  const location = await page.evaluate(() => {
    const w = window as any, T = w.THREE, target = w.__feedbackCrab, camera = w.__feedbackCamera, rect = document.querySelector('canvas[role=application]')!.getBoundingClientRect(); w.__feedbackScene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const body = target.getObjectByName('cl-crab-body') || target.children[0], candidates = [new T.Box3().setFromObject(body).getCenter(new T.Vector3())];
    const position = body.geometry.attributes.position; for (let i = 0; i < position.count; i += Math.max(1, Math.floor(position.count / 30))) candidates.push(new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(body.matrixWorld));
    const prey = w.__feedbackScene.children.filter((o: any) => o.userData.alive && (o.userData.cfg || o.userData.offset));
    for (const world of candidates) { const ndc = world.clone().project(camera); if (Math.abs(ndc.x) > .9 || Math.abs(ndc.y) > .9 || ndc.z < -1 || ndc.z > 1) continue; const ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(ndc.x, ndc.y), camera); const first = ray.intersectObjects(prey, true)[0]; if (!first) continue; let root = first.object; while (root.parent && !prey.includes(root)) root = root.parent; if (root === target) return { x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2, target: target.uuid, hit: root.uuid }; }
    throw new Error('A real camera ray must hit the selected crab before a direct pointer strike');
  });
  expect(location.hit).toBe(location.target); await page.mouse.click(location.x, location.y); return location;
}

test.describe.configure({ timeout: 150000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const errors: string[] = []; failures.set(page, errors); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(failures.get(page)).toEqual([]); });

test('an explicit far-prey button strike reports its miss beside an untouched clam just as it does without one', async ({ page }, testInfo) => {
  await mount(page); await place(page, 6, false); await strike(page).click(); await step(page, 7); const noClam = await snapshot(page); expect(noClam.visible).toBe(true); expect(noClam.text).toMatch(/Missed\./); expect(noClam.crabAlive).toBe(true); expect(noClam.score).toBe(0);
  await step(page, 40); await place(page, 6, true); const ready = await snapshot(page); expect(ready.clamDistance).toBeLessThan(1.2); expect(ready.clamHeight).toBeLessThan(1); expect(ready.progress).toBe(0); await expect(strike(page)).toBeEnabled();
  await strike(page).click(); await step(page, 7); const nearby = await snapshot(page);
  await testInfo.attach('button-miss-with-and-without-untouched-clam', { body: JSON.stringify({ noClam, ready, nearby }, null, 2), contentType: 'application/json' });
  expect(nearby.crabAlive && nearby.clamAlive && nearby.clamInScene).toBe(true); expect(nearby.progress).toBe(0); expect(nearby.clamAngle).toBe(0); expect(nearby.score).toBe(0); expect.soft(nearby.visible).toBe(true); expect.soft(nearby.text).toMatch(/Missed\. Move closer and match the target depth\./);
  await testInfo.attach('button-feedback-view', { body: await page.locator('.cl-hunt-stage').screenshot(), contentType: 'image/png' });
});

test('directly clicking rock-blocked actual prey reports the obstruction while a nearby clam remains untouched', async ({ page }, testInfo) => {
  await mount(page); await place(page, 2.3, true);
  const cover = await page.evaluate(() => { const w = window as any, T = w.THREE, rock = w.__feedbackRock, p = w.__feedbackPlayer.position; rock.geometry.computeBoundingBox(); const size = rock.geometry.boundingBox.getSize(new T.Vector3()); rock.scale.set(.9 / size.x, 1.2 / size.y, .6 / size.z); rock.userData.substrateRadius = .45; rock.userData.groundOffset = .35; rock.position.set(p.x, .35, p.z + 1.15); w.__feedbackScene.updateMatrixWorld(true); const delta = w.__feedbackCrab.position.clone().sub(p), ray = new T.Raycaster(p, delta.clone().normalize(), 0, delta.length()); const foodDelta = w.__feedbackClam.position.clone().sub(p), foodRay = new T.Raycaster(p, foodDelta.clone().normalize(), 0, foodDelta.length()); return { preyBlocked: ray.intersectObject(rock).length > 0, clamBlocked: foodRay.intersectObject(rock).length > 0 }; });
  expect(cover).toEqual({ preyBlocked: true, clamBlocked: false }); await step(page, 4); await expect(page.locator('[data-target=action]')).toContainText('COVER BLOCKS STRIKE'); const before = await snapshot(page); expect(before.crabDistance).toBeLessThan(2.6); expect(before.clamDistance).toBeLessThan(1.2); expect(before.clamHeight).toBeLessThan(1);
  const click = await actualCrabClick(page); await step(page, 7); const blocked = await snapshot(page);
  await testInfo.attach('direct-blocked-strike-beside-clam', { body: JSON.stringify({ cover, click, before, blocked }, null, 2), contentType: 'application/json' });
  expect(blocked.crabAlive && blocked.clamAlive).toBe(true); expect(blocked.progress).toBe(0); expect(blocked.clamAngle).toBe(0); expect(blocked.score).toBe(0); expect.soft(blocked.visible).toBe(true); expect.soft(blocked.text).toMatch(/Strike blocked\. Move around the rock\./);
  await testInfo.attach('blocked-feedback-view', { body: await page.locator('.cl-hunt-stage').screenshot(), contentType: 'image/png' });
});

test('held E still gathers a clam without a spurious miss and an eligible button strike retains its actual contact timing', async ({ page }, testInfo) => {
  await mount(page); await place(page, 6, true); await page.locator(canvas).focus(); await page.keyboard.down('KeyE'); await step(page, 10); const gathering = await snapshot(page); expect(gathering.progress).toBeGreaterThan(0); expect(gathering.clamAngle).toBeLessThan(0); expect(gathering.clamAlive).toBe(true); expect(gathering.text).not.toMatch(/Missed|Strike blocked|No prey in reach/);
  await step(page, 32); await page.keyboard.up('KeyE'); await step(page, 4); const meal = await snapshot(page); expect(meal.clamAlive).toBe(false); expect(meal.clamInScene).toBe(false); expect(meal.aliveClams).toBe(7); expect(meal.score).toBe(1); expect(meal.crabAlive).toBe(true);
  await page.evaluate(() => { const w = window as any; w.__feedbackClam = w.__feedbackClams.find((o: any) => o.userData.alive); }); await place(page, 1.4, true); await expect(strike(page)).toBeEnabled();
  await page.evaluate(async () => { const w = window as any, button = Array.from(document.querySelectorAll('button')).find(node => node.textContent === 'Strike [E]') as HTMLButtonElement; if (!button || button.disabled) throw new Error('Actual strike control must be enabled'); button.click(); w.__feedbackStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__feedbackStep !== 0); });
  await step(page, 3); const beforeContact = await snapshot(page); expect(beforeContact.crabAlive).toBe(true); expect(beforeContact.progress).toBe(0);
  await step(page, 1); const contact = await snapshot(page); expect(contact.crabAlive).toBe(false); expect(contact.clamAlive).toBe(true); expect(contact.clamAngle).toBe(0); expect(contact.progress).toBe(0);
  await step(page, 4); expect((await snapshot(page)).score).toBeGreaterThan(meal.score); await expect(strike(page)).toBeDisabled(); await step(page, 8); await expect(strike(page)).toBeEnabled();
  await testInfo.attach('gathering-and-eligible-strike-controls', { body: JSON.stringify({ gathering, meal, beforeContact, contact }, null, 2), contentType: 'application/json' });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
