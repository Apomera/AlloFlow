import { test, expect, Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { clickCephalopodControl } from './helpers/cephalopod_controls';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 1000, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>(), canvas = 'canvas[role=application]';
async function step(page: Page, count = 1, dt = .05) {
  await page.evaluate(async ({ count, dt }) => { const w = window as any; for (let i = 0; i < count; i++) { w.__grabStep = dt; let frames = 0; do { await new Promise<void>(r => requestAnimationFrame(() => r())); if (++frames > 120) throw Error('Grab clock was not consumed'); } while (w.__grabStep !== 0); } }, { count, dt });
}
const read = (page: Page) => page.evaluate(() => (window as any).__grabRead());
async function mount(page: Page, phone: boolean) {
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  await page.evaluate(phone => {
    const w = window as any; w.__grabStep = 0; w.__grabFirst = false;
    w.THREE.Clock.prototype.getDelta = function () { if (!w.__grabFirst) { w.__grabFirst = true; document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true })); } const dt = w.__grabStep; w.__grabStep = 0; return dt; };
    if (phone) document.getElementById('wrap')!.style.width = '100%';
    w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: phone ? 'blueRinged' : 'giantPacific', huntMode: 'observe', huntSeed: 2741, huntQuality: phone ? 'low' : 'balanced', _threeLoaded: true } });
  }, phone);
  await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0));
  await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  // A real turn validates that the directed reach is transformed from world space.
  await page.keyboard.down('KeyD'); await step(page, 6); await page.keyboard.up('KeyD');
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, record = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), scene = record.scene, player = scene.getObjectByName('cl-player');
    const scale = player.userData.species === 'blueRinged' ? .72 : 1.4, crabs = scene.children.filter((o: any) => o.userData.alive && o.userData.cfg);
    if (crabs.length < 2) throw Error('Two real seeded crabs are required');
    // Arrange a reproducible encounter using the actual actors and capture path.
    scene.children.forEach((o: any) => { if (o.userData.alive && (o.userData.cfg || o.userData.offset)) { o.position.set(80, .18, 80); if (o.userData.cfg) { o.userData.speed = 0; o.userData.wanderTimer = 100; } } if (o.userData.substrate === 'rock') { o.position.set(-45, o.position.y, -45); o.userData.substrateRadius = 0; } if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
    player.updateWorldMatrix(true, false); crabs[0].position.copy(player.localToWorld(new T.Vector3(.55, -.37, 1.35).multiplyScalar(scale))); crabs[1].position.copy(player.localToWorld(new T.Vector3(-.7, -.37, 1.55).multiplyScalar(scale)));
    const arms = Array.from({ length: 8 }, (_, i) => player.getObjectByName('cl-arm-' + i)), meshes = [...arms, player.getObjectByName('cl-suckers'), player.getObjectByName('cl-webbing')];
    const refs = meshes.map((m: any) => ({ m, g: m.geometry, material: m.material, index: m.geometry.index, attributes: Object.entries(m.geometry.attributes).map(([n, a]: [string, any]) => ({ n, a, array: a.array })), instances: m.instanceMatrix, array: m.instanceMatrix?.array }));
    w.__grabDisposed = []; const owned = new Set<any>();
    for (const m of meshes) for (const resource of [m.geometry, m.material]) if (!owned.has(resource)) { owned.add(resource); let expected = 0; scene.traverse((o: any) => { if (o.geometry === resource) expected++; if (o.material === resource) expected++; if (Array.isArray(o.material)) expected += o.material.filter((m: any) => m === resource).length; }); const row = { uuid: resource.uuid, expected, count: 0 }; w.__grabDisposed.push(row); resource.addEventListener('dispose', () => row.count++); }
    const halo = scene.getObjectByName('cl-target'), copy = halo.position.copy; w.__grabTracked = null;
    halo.position.copy = function (position: any) { w.__grabTracked = crabs.find((c: any) => c.position === position)?.uuid || null; return copy.call(this, position); };
    arms[2].onAfterRender = function (renderer: any) { if (w.__grabProgram) return; const gl = renderer.getContext(), p = gl.getParameter(gl.CURRENT_PROGRAM); w.__grabProgram = { linked: gl.getProgramParameter(p, gl.LINK_STATUS), compiled: gl.getAttachedShaders(p).every((s: any) => gl.getShaderParameter(s, gl.COMPILE_STATUS)) }; };
    w.__grabRead = () => {
      const centers = arms.map((m: any) => Array.from({ length: 21 }, (_, j) => { const p = new T.Vector3(); for (let i = 0; i < 8; i++) p.add(new T.Vector3().fromBufferAttribute(m.geometry.attributes.position, j * 9 + i)); return p.multiplyScalar(1 / 8); }));
      const contacts = [1, 2, 3].map(i => { const p = arms[i].localToWorld(centers[i][14].clone()); return { position: p.toArray(), distance: p.distanceTo(crabs[0].position) }; });
      let gap = Infinity, oralDot = 1; for (let i = 0; i < 8; i++) for (let j = 1; j <= 20; j++) { gap = Math.min(gap, centers[i][j].distanceTo(centers[i][j - 1]) / scale); const n = arms[i].geometry.attributes.normal; oralDot = Math.min(oralDot, new T.Vector3().fromBufferAttribute(n, j * 9).dot(new T.Vector3().fromBufferAttribute(n, (j - 1) * 9))); }
      return { centers: centers.map((a: any[]) => a.map(p => p.toArray())), contacts, gap, oralDot, player: player.position.toArray(), rotation: player.quaternion.toArray(), prey: crabs.slice(0, 2).map((c: any) => ({ uuid: c.uuid, position: c.position.toArray(), alive: c.userData.alive, size: c.userData.cfg.sizeMul, score: c.userData.cfg.score })), tracked: w.__grabTracked, score: Number(document.querySelector('[data-hud=score]')!.textContent), action: document.querySelector('[data-target=action]')!.textContent, program: w.__grabProgram, contextLost: record.ctx.isContextLost(), retained: refs.every((r: any) => r.m.geometry === r.g && r.m.material === r.material && r.g.index === r.index && r.attributes.every((a: any) => r.g.attributes[a.n] === a.a && a.a.array === a.array) && r.m.instanceMatrix === r.instances && r.m.instanceMatrix?.array === r.array), finite: refs.every((r: any) => Array.from(r.g.attributes.position.array).every(Number.isFinite)) };
    };
  });
  await page.locator(canvas).focus(); await page.keyboard.press('KeyT'); await step(page, 3); await page.waitForFunction(() => (window as any).__grabProgram);
}

test.describe.configure({ timeout: 240000, retries: 0 }); test.use({ trace: 'off', video: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const e: string[] = []; errors.set(page, e); page.on('pageerror', x => e.push(x.message)); page.on('console', m => { if (m.type() === 'error') e.push(m.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
for (const phone of [false, true]) test.describe(phone ? 'Phone blue-ringed grasp' : 'Desktop giant Pacific grasp', () => {
  if (phone) test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('grips committed prey at real contact with pause, target switching, touch and reduced motion intact', async ({ page }, testInfo) => {
    await mount(page, phone); const ready = await read(page); expect(ready.action).toMatch(/^IN RANGE/); expect(ready.tracked).toBe(ready.prey[0].uuid); expect(Math.abs(ready.rotation[1])).toBeGreaterThan(.1);
    const strike = async () => { if (phone) await page.getByRole('button', { name: 'Strike / hold', exact: true }).tap(); else { await page.locator(canvas).focus(); await page.keyboard.press('KeyE'); } };
    await strike(); await step(page); const committed = await read(page); expect(committed.action).toMatch(/^STRIKING/); expect(committed.score).toBe(0);
    await page.locator(canvas).focus(); await page.keyboard.press('KeyT'); await step(page, 2); const reaching = await read(page); expect(reaching.tracked).toBe(ready.prey[0].uuid); expect(reaching.prey[0].alive).toBe(true);
    await page.keyboard.press('Escape'); const frozen = await read(page); await step(page, 4); expect(await read(page)).toEqual(frozen); await page.keyboard.press('Escape');
    await step(page); await step(page, 1, .049); const touching = await read(page); expect(touching.prey[0].alive).toBe(true); expect(touching.score).toBe(0);
    await step(page, 1, .001); const contact = await read(page); expect(contact.prey[0].alive).toBe(false); expect(contact.prey[1].alive).toBe(true); expect(contact.score).toBe(Math.round(ready.prey[0].score * (phone ? 1 : 1.5)));
    const radius = .30 * ready.prey[0].size; for (let i = 0; i < 3; i++) expect(Math.abs(contact.contacts[i].distance - radius * (i === 1 ? .60 : Math.hypot(1, .32)))).toBeLessThan(.0001);
    const pixels = await harness.glPixels(page); expect(pixels && !looksBlank(pixels)).toBeTruthy(); await testInfo.attach('native-grasp-contact', { body: pixels!.png, contentType: 'image/png' });
    await step(page, 9); const recovered = await read(page); expect(recovered.centers).not.toEqual(contact.centers); expect([recovered.player[0], recovered.player[2]]).toEqual([ready.player[0], ready.player[2]]); expect(recovered.rotation).toEqual(ready.rotation);
    await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2); const reduced = await read(page);
    await strike(); await step(page); await step(page, 4); const reducedContact = await read(page); expect(reducedContact.prey[1].alive).toBe(false); expect(reducedContact.score).toBe(ready.prey.reduce((sum: number, p: any) => sum + Math.round(p.score * (phone ? 1 : 1.5)), 0)); expect(reducedContact.centers).toEqual(reduced.centers);
    for (const row of [ready, committed, reaching, frozen, touching, contact, recovered, reduced, reducedContact]) { expect(row.finite && row.retained && row.program.compiled && row.program.linked).toBe(true); expect(row.contextLost).toBe(false); expect(row.gap).toBeGreaterThan(.004); expect(row.oralDot).toBeGreaterThan(.15); }
    await testInfo.attach('native-grasp-states', { body: JSON.stringify({ ready, committed, reaching, frozen, touching, contact, recovered, reduced, reducedContact }), contentType: 'application/json' });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); const disposed = await page.evaluate(() => (window as any).__grabDisposed); expect(disposed.every((r: any) => r.count === r.expected)).toBe(true); await testInfo.attach('native-grasp-disposal', { body: JSON.stringify(disposed), contentType: 'application/json' });
  });
});
