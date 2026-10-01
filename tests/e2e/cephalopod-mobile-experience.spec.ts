import { test, expect, Page, CDPSession } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// Integrate under tests/e2e. This suite observes the served production runtime;
// no layout CSS, actor placement, input handlers, or capability flags are replaced.
const harness = new GlHarness({
  toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'),
  toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';
const ui = {
  tools: 'Tools', toolsPanel: '.cl-hunt-mobile-tools', forward: 'Forward', jet: 'Jet',
  hunt: 'Strike / hold', interact: 'Interact', inspect: 'Inspect',
  settings: 'Help / settings', return: 'Return to dive', resume: 'Resume dive',
};
const errors = new WeakMap<Page, string[]>();
const touches = new WeakMap<Page, CDPSession>();

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 1, viewport: { width: 390, height: 844 }, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(async ({ page }) => {
  const failures: string[] = []; errors.set(page, failures);
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  touches.set(page, await page.context().newCDPSession(page));
});
test.afterEach(async ({ page }) => {
  await touches.get(page)?.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
  // Observe the tool's release before the harness is allowed to clean up for it.
  try { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); }
  finally { await harness.destroy(page); await touches.get(page)?.detach(); }
  expect(errors.get(page)).toEqual([]);
});

async function mount(page: Page, species = 'commonOcto', mode = 'observe') {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  // The standalone harness omits the real app's viewport metadata. Supply that
  // standard metadata so a mobile context does not silently lay out at980px.
  await page.evaluate(() => { const meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1'; document.head.appendChild(meta); }); await frames(page);
  await page.evaluate(({ species, mode }) => {
    const w = window as any; document.getElementById('wrap')!.style.width = '100%';
    // A controlled production delta makes input outcomes independent of slow
    // readback/screenshot wall time. The production update/render still runs.
    w.__mobileStep = 0; w.__mobileTicks = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__mobileStep; w.__mobileStep = 0; if (dt) w.__mobileTicks++; return dt; };
    const Original = w.THREE.WebGLRenderer;
    w.THREE.WebGLRenderer = new Proxy(Original, { construct(target, args, newTarget) {
      const renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene: any, camera: any) { if (scene?.isScene) w.__mobileCamera = camera; return render.apply(this, arguments); };
      return renderer;
    } });
    w.__mobileNativePointers = [];
    document.addEventListener('pointerdown', (e: PointerEvent) => w.__mobileNativePointers.push({ type: e.pointerType, trusted: e.isTrusted, name: (e.target as HTMLElement)?.closest('button')?.textContent }), true);
    w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: mode, huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  }, { species, mode });
  await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0), undefined, { timeout: 90000 });
  await step(page, 6);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await frames(page, 3);
  // One scroll to the entire stage is the supported entry workflow. No
  // individual action is scrolled into view to hide a layout failure.
  await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 4);
}

async function frames(page: Page, count = 2) {
  await page.evaluate(async count => { for (let n = 0; n < count; n++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }, count);
}
async function step(page: Page, count: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let n = 0; n < count; n++) {
      const previous = w.__mobileTicks; w.__mobileStep = .05;
      for (let tries = 0; tries < 120 && w.__mobileTicks === previous; tries++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (w.__mobileTicks !== previous + 1) throw new Error('One requested production delta must be consumed once');
    }
  }, count);
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), scene = rec.scene;
    if (!w.__mobileRefs) { w.__mobileRefs = new WeakMap(); w.__mobileRefNext = 0; }
    function identity(object: any) { if (!w.__mobileRefs.has(object)) w.__mobileRefs.set(object, ++w.__mobileRefNext); return w.__mobileRefs.get(object); }
    const resources: number[] = [];
    scene.traverse((o: any) => {
      if (o.geometry) { resources.push(identity(o.geometry)); Object.values(o.geometry.attributes).forEach((a: any) => resources.push(identity(a), identity(a.array))); }
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => resources.push(identity(m)));
    });
    return { scene: scene.uuid, context: rec.id, draws: rec.draws, renders: rec.renders, resources,
      position: scene.getObjectByName('cl-player').position.toArray(),
      time: document.querySelector('[data-hud=time]')?.textContent, energy: document.querySelector('[data-hud=energy]')?.textContent,
      score: document.querySelector('[data-hud=score]')?.textContent, burn: document.querySelector('[data-hud=burn]')?.textContent };
  });
}
function sameOwner(after: any, before: any) {
  expect(after.scene).toBe(before.scene); expect(after.context).toBe(before.context); expect(after.resources).toEqual(before.resources);
  expect(after.draws).toBeGreaterThan(before.draws); expect(after.renders).toBeGreaterThan(before.renders);
}
// Forward input must change actual X/Z, not merely the existing idle Y bob.
function horizontalDistance(a: number[], b: number[]) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
function releasedPose(after: number[], before: number[], verticalBound = .1001) {
  expect([after[0], after[2]]).toEqual([before[0], before[2]]);
  // An unpaused specimen retains its accepted +/- .05 bob. This still rejects
  // continued vertical input; paused/inspection freezes below remain exact XYZ.
  expect(Math.abs(after[1] - before[1])).toBeLessThanOrEqual(verticalBound);
}

async function point(page: Page, name: string, id: number) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeVisible(); const box = await button.boundingBox();
  if (!box) throw new Error('Missing native touch bounds: ' + name);
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, id, radiusX: 3, radiusY: 3, force: 1 };
}
async function touch(page: Page, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: any[] = []) {
  await touches.get(page)!.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}
async function tap(page: Page, name: string) { await touch(page, 'touchStart', [await point(page, name, 91)]); await touch(page, 'touchEnd'); await frames(page); }
async function showTools(page: Page) {
  const toggle = page.getByRole('button', { name: ui.tools, exact: true });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await tap(page, ui.tools);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(page.locator(ui.toolsPanel)).toBeVisible();
}
async function hideTools(page: Page) {
  const toggle = page.getByRole('button', { name: ui.tools, exact: true });
  if (await toggle.getAttribute('aria-expanded') === 'true') await tap(page, ui.return);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator(ui.toolsPanel)).toBeHidden();
}
async function play(page: Page) {
  if (await page.getByRole('region', { name: 'Specimen inspection', exact: true }).isVisible()) await tap(page, ui.return);
  if (await page.getByRole('dialog', { name: 'Dive help and settings', exact: true }).isVisible()) await tap(page, ui.resume);
  await hideTools(page);
  // The visible HUD updates every125ms of simulation time while live. Closing
  // Tools/settings may already resume, while its last painted burn says Paused.
  // Refresh BEFORE deciding to toggle Pause, otherwise the fixture repauses it.
  await step(page, 3); await frames(page);
  if ((await page.locator('[data-hud=burn]').textContent()) === 'Paused') { await tap(page, 'Pause'); await step(page, 3); await frames(page); }
  await expect(page.locator('[data-hud=burn]')).not.toHaveText('Paused');
}

// Independent viewport/hit-test oracle. It does not assert historical panel
// ordering or copy CSS dimensions. Hidden disclosures are absent from hit targets.
async function controlLayout(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.cl-hunt-stage') as HTMLElement, c = document.querySelector('canvas[role=application]')!, rect = c.getBoundingClientRect();
    const buttons = [...stage.querySelectorAll('button')].filter((el: any) => {
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.disabled;
    }).map(el => { const r = el.getBoundingClientRect(); return { el, name: el.textContent!.trim(), x: r.x, y: r.y, width: r.width, height: r.height }; });
    const offenders: string[] = [], overlaps: string[] = [];
    buttons.forEach(b => {
      if (b.width < 44 - .5 || b.height < 44 - .5) offenders.push(b.name + ': hit area below 44px');
      if (b.x < -.5 || b.y < -.5 || b.x + b.width > innerWidth + .5 || b.y + b.height > innerHeight + .5) offenders.push(b.name + ': outside viewport');
      if (b.x < rect.x - .5 || b.y < rect.y - .5 || b.x + b.width > rect.right + .5 || b.y + b.height > rect.bottom + .5) offenders.push(b.name + ': outside stage');
      const top = document.elementsFromPoint(b.x + b.width / 2, b.y + b.height / 2).find(el => getComputedStyle(el).pointerEvents !== 'none');
      if (!top || top.closest('button') !== b.el) offenders.push(b.name + ': center blocked');
      if (b.el.scrollWidth > b.el.clientWidth + 1 || b.el.scrollHeight > b.el.clientHeight + 1) offenders.push(b.name + ': clipped label');
    });
    buttons.forEach((a, i) => buttons.slice(i + 1).forEach(b => {
      if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1) overlaps.push(a.name + ' / ' + b.name);
    }));
    const camera = (window as any).__mobileCamera;
    return { offenders, overlaps, buttons: buttons.map(({ el, ...b }) => b), canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
      cameraAspect: camera?.aspect, cameraFinite: !!camera && [camera.aspect, ...camera.position.toArray(), ...camera.projectionMatrix.elements].every(Number.isFinite),
      sideways: document.documentElement.scrollWidth > innerWidth + 1, scrollY, viewport: { width: innerWidth, height: innerHeight } };
  });
}
async function assertLayout(page: Page) {
  const layout = await controlLayout(page); expect(layout.offenders).toEqual([]); expect(layout.overlaps).toEqual([]); expect(layout.sideways).toBe(false);
  expect(layout.viewport.width).toBe(page.viewportSize()!.width);
  expect(layout.cameraFinite).toBe(true); expect(layout.cameraAspect).toBeCloseTo(layout.canvas.width / layout.canvas.height, 5);
  expect(layout.canvas.y).toBeGreaterThanOrEqual(-1); expect(layout.canvas.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  for (const name of [ui.forward, ui.jet, ui.hunt, ui.interact, ui.tools]) expect(layout.buttons.some(b => b.name === name), 'Initial usable action: ' + name).toBe(true);
  return layout;
}

test('portrait controls fit after one supported whole-stage entry scroll at 320 and 390 without individual action scrolling', async ({ page }, testInfo) => {
  const evidence = [];
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await mount(page); const before = await snapshot(page);
    evidence.push(await assertLayout(page)); await showTools(page); const pausedCapture = await snapshot(page); expect(pausedCapture.position).toEqual(before.position); await step(page, 5);
    const open = await snapshot(page); expect(open.position).toEqual(pausedCapture.position); expect(open.time).toBe(pausedCapture.time); expect(open.energy).toBe(pausedCapture.energy); sameOwner(open, before);
    await hideTools(page); await frames(page, 3); const after = await snapshot(page); sameOwner(after, before); expect(after.score).toBe(before.score); await assertLayout(page); await expect(page.locator(canvas)).toBeFocused();
    await page.keyboard.down('KeyW'); await step(page, 5); await page.keyboard.up('KeyW'); const keyboardMoved = await snapshot(page); expect(horizontalDistance(keyboardMoved.position, after.position)).toBeGreaterThan(.04); await step(page, 5); releasedPose((await snapshot(page)).position, keyboardMoved.position);
    await showTools(page); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: ui.tools, exact: true })).toHaveAttribute('aria-expanded', 'false'); await expect(page.locator(canvas)).toBeFocused();
    await testInfo.attach('portrait-' + viewport.width, { body: await page.screenshot(), contentType: 'image/png' });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  }
  await testInfo.attach('initial-viewport-and-tools', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('touch controls survive landscape rotation and larger text with the same native world', async ({ page }, testInfo) => {
  await mount(page); const initial = await snapshot(page); const evidence = [await assertLayout(page)];
  await showTools(page); await tap(page, ui.settings); await expect(page.getByRole('dialog', { name: 'Dive help and settings', exact: true })).toBeVisible();
  const help = page.getByRole('dialog', { name: 'Dive help and settings', exact: true }).locator('p').first();
  await expect(help).toContainText('Hold Jet together with Forward'); await expect(help).toContainText('Ink spends a finite charge');
  await expect(help).toContainText('Tools pauses the dive and opens View, Inspect, Observe and the minimap');
  await expect(help).not.toContainText(/W\/S|Q\/Z|T selects|Escape pauses/);
  await page.getByLabel('Larger text', { exact: true }).check(); await page.getByLabel('High contrast', { exact: true }).check(); await tap(page, ui.resume); await play(page);
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await frames(page, 4); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 4); evidence.push(await assertLayout(page));
    await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-large-text/); sameOwner(await snapshot(page), initial);
    const position = (await snapshot(page)).position; await touch(page, 'touchStart', [await point(page, ui.forward, 1)]); await step(page, 5); await touch(page, 'touchEnd');
    expect(horizontalDistance((await snapshot(page)).position, position)).toBeGreaterThan(.04); await testInfo.attach('large-touch-' + viewport.width + 'x' + viewport.height, { body: await page.screenshot(), contentType: 'image/png' });
  }
  await testInfo.attach('orientation-layouts', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('native touch release and cancellation stop movement, while two fingers combine Forward and Jet', async ({ page }, testInfo) => {
  await mount(page, 'commonOcto', 'free'); const initial = await snapshot(page);
  const forward = await point(page, ui.forward, 1), jet = await point(page, ui.jet, 2);
  await touch(page, 'touchStart', [forward]); await step(page, 8); await touch(page, 'touchEnd'); const walking = await snapshot(page);
  expect(horizontalDistance(walking.position, initial.position)).toBeGreaterThan(.04); await step(page, 6); releasedPose((await snapshot(page)).position, walking.position);
  await touch(page, 'touchStart', [forward]); await touch(page, 'touchStart', [forward, jet]); await step(page, 8); const jetting = await snapshot(page);
  expect(horizontalDistance(jetting.position, walking.position)).toBeGreaterThan(horizontalDistance(walking.position, initial.position) * 1.1);
  await touch(page, 'touchMove', [{ ...forward, x: 2, y: 2 }, jet]); await touch(page, 'touchCancel'); const cancelled = await snapshot(page); await step(page, 8);
  // Cancelling Jet also removes its accepted .15 pose lift, in addition to bob.
  releasedPose((await snapshot(page)).position, cancelled.position, .2501); expect((await snapshot(page)).score).toBe(cancelled.score);
  const nativePointers = await page.evaluate(() => (window as any).__mobileNativePointers);
  expect(nativePointers.some((e: any) => e.type === 'touch' && e.trusted && e.name === ui.forward)).toBe(true);
  expect(nativePointers.some((e: any) => e.type === 'touch' && e.trusted && e.name === ui.jet)).toBe(true);
  sameOwner(await snapshot(page), initial); await testInfo.attach('native-hold-cancel-multitouch', { body: JSON.stringify({ initial, walking, jetting, cancelled, nativePointers }, null, 2), contentType: 'application/json' });
});

test('Tools, pause, settings, and inspection interrupt an active finger without resuming its old movement', async ({ page }, testInfo) => {
  await mount(page); const owner = await snapshot(page), evidence = [];
  for (const interruption of ['tools', 'pause', 'settings', 'inspection'] as const) {
    await play(page); await touch(page, 'touchStart', [await point(page, ui.forward, 1)]); await step(page, 3);
    // Keep the native finger down while a second input opens another UI surface.
    // Testing only finger-up first would vacuously pass broken transition cleanup.
    if (interruption === 'pause') await page.getByRole('button', { name: 'Pause', exact: true }).click();
    else { await page.getByRole('button', { name: ui.tools, exact: true }).click(); if (interruption === 'settings') await page.getByRole('button', { name: ui.settings, exact: true }).click(); if (interruption === 'inspection') await page.getByRole('button', { name: ui.inspect, exact: true }).click(); }
    const stopped = await snapshot(page); await step(page, 8); const held = await snapshot(page); expect(held.position).toEqual(stopped.position); expect(held.time).toBe(stopped.time); expect(held.energy).toBe(stopped.energy);
    // End the interrupted held finger before Orbit starts its own native tap.
    // Orbit's touchEnd would otherwise end that stream before a later cancel.
    await touch(page, 'touchCancel');
    if (interruption === 'inspection') { await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeVisible(); await tap(page, 'Orbit right'); }
    await play(page); const returned = await snapshot(page); await step(page, 6); releasedPose((await snapshot(page)).position, returned.position); sameOwner(await snapshot(page), owner);
    evidence.push({ interruption, stopped, held, returned });
  }
  // Settings opened from an already paused dive must preserve that choice.
  await tap(page, 'Pause'); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await showTools(page); await tap(page, ui.settings); const pausedSettings = await snapshot(page);
  await tap(page, ui.resume); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await step(page, 6); const pausedReturned = await snapshot(page); expect(pausedReturned.position).toEqual(pausedSettings.position); expect(pausedReturned.time).toBe(pausedSettings.time); expect(pausedReturned.energy).toBe(pausedSettings.energy);
  evidence.push({ interruption: 'settings entered while paused', stopped: pausedSettings, held: pausedReturned, returned: pausedReturned });
  await testInfo.attach('interrupted-native-input', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('the mobile world has actual GL pixels, and ending through Tools releases the page-created context', async ({ page }, testInfo) => {
  await mount(page); const contexts = await harness.glContexts(page); const live = contexts.filter(c => c.createdBy === 'page' && c.connected && !c.lost && c.draws > 0);
  expect(live).toHaveLength(1); const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false); expect(pixels!.significantColors).toBeGreaterThan(3);
  await testInfo.attach('mobile-world-gl-pixels', { body: pixels!.png, contentType: 'image/png' });
  await showTools(page); await tap(page, ui.settings); await tap(page, 'End run'); await expect(page.getByRole('heading', { name: 'Last dive', exact: true })).toBeVisible();
  await expect.poll(async () => (await harness.glContexts(page)).filter(c => c.id === live[0].id && !c.lost).length).toBe(0);
  const summary = await page.evaluate(() => JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!)); expect(summary.reason).toBe('surfaced'); expect(summary.seed).toBe(2741); expect(summary.events.filter((e: any) => e.kind === 'Finish')).toHaveLength(1);
});

test('failed Forage replaces Observe with matching visible and spoken advice, then expires without starting a meal', async ({ page }, testInfo) => {
  test.setTimeout(360000);
  const evidence = [];
  for (const fixture of [
    { species: 'commonOcto', advice: 'Settle beside a clam, then tap Forage.', names: ['cl-prey-clam', 'cl-mission-clam'] },
    { species: 'vampireSquid', advice: 'Move within reach of marine snow, then tap Forage.', names: ['cl-marine-snow'] },
  ]) {
    await mount(page, fixture.species, 'free'); const owner = await snapshot(page);
    const actors = await page.evaluate(names => {
      const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player');
      const food = scene.children.filter((o: any) => names.includes(o.name)); if (!food.length) throw new Error('Actual forage actors required');
      // Relocate food, retaining actual actor ownership and visible state. Snow
      // remains within its existing 16-unit recycling radius but outside pickup
      // reach; moving it arbitrarily far would respawn it beside the player.
      food.forEach((o: any, index: number) => o.position.set(player.position.x + 7 + index * .025, player.position.y + 2, player.position.z));
      return food.map((o: any) => ({ name: o.name, position: o.position.toArray(), visible: o.visible }));
    }, fixture.names);
    await showTools(page); await tap(page, 'Observe'); await hideTools(page);
    const observation = await page.locator('.cl-mission-brief').innerText(); expect(observation).toMatch(/Nearest prey|No prey nearby/);
    await tap(page, 'Forage'); await step(page, 3);
    await expect(page.locator('.cl-mission-brief')).toBeVisible(); await expect(page.locator('.cl-mission-brief')).toContainText(fixture.advice);
    await expect(page.locator('#allo-live-cl')).toHaveText(fixture.advice); await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('progress[aria-label="Foraging progress"]')).toBeHidden(); const failed = await snapshot(page); expect(failed.score).toBe(owner.score);
    expect(await page.locator('.cl-mission-brief').innerText()).not.toBe(observation);
    await step(page, 70); await expect(page.locator('.cl-mission-brief')).not.toContainText(fixture.advice); expect(await page.locator('.cl-mission-brief').innerText()).not.toBe(observation);
    const expired = await snapshot(page); expect(expired.score).toBe(owner.score); sameOwner(expired, owner);
    // A second failure followed by a valid retry must clear its advice before
    // the old 3.5-second deadline, rather than merely waiting for it to expire.
    await tap(page, 'Forage'); await step(page, 3); await expect(page.locator('.cl-mission-brief')).toContainText(fixture.advice);
    await page.evaluate(names => {
      const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player');
      const food = scene.children.find((o: any) => names.includes(o.name)); if (!food) throw new Error('Actual retry food required');
      food.position.set(player.position.x + .3, names.includes('cl-marine-snow') ? player.position.y : .1, player.position.z); scene.updateMatrixWorld(true);
    }, fixture.names);
    await step(page, 3); await tap(page, 'Forage'); await step(page, 3);
    await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('progress[aria-label="Foraging progress"]')).toBeVisible(); expect(await page.locator('progress[aria-label="Foraging progress"]').evaluate((p: HTMLProgressElement) => p.value)).toBeGreaterThan(0);
    await expect(page.locator('.cl-mission-brief')).not.toContainText(fixture.advice); const retry = await snapshot(page); expect(retry.score).toBe(owner.score);
    await touch(page, 'touchStart', [await point(page, ui.forward, 1)]); await step(page, 3); await touch(page, 'touchEnd'); await step(page, 3);
    const stoppedAdvice = 'Foraging stopped. Stay still and within reach to gather food.';
    await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('progress[aria-label="Foraging progress"]')).toBeHidden(); await expect(page.locator('.cl-mission-brief')).toBeVisible();
    await expect(page.locator('.cl-mission-brief')).toContainText(stoppedAdvice); await expect(page.locator('#allo-live-cl')).toHaveText(stoppedAdvice);
    const cancelled = await snapshot(page); expect(cancelled.score).toBe(owner.score);
    await tap(page, 'Pause'); const pausedFeedback = await page.locator('.cl-mission-brief').innerText(); await step(page, 75);
    expect(await page.locator('.cl-mission-brief').innerText()).toBe(pausedFeedback); await tap(page, 'Pause'); await step(page, 70);
    await expect(page.locator('.cl-mission-brief')).not.toContainText(stoppedAdvice); const cancellationExpired = await snapshot(page); expect(cancellationExpired.score).toBe(owner.score); sameOwner(cancellationExpired, owner);
    if (fixture.species === 'vampireSquid') {
      await showTools(page); await tap(page, ui.settings);
      const help = page.getByRole('dialog', { name: 'Dive help and settings', exact: true }).locator('p').first();
      await expect(help).toContainText('Hold Flash for your defensive display'); await expect(help).not.toContainText('Ink spends');
      await tap(page, ui.resume); await play(page);
    }
    evidence.push({ species: fixture.species, actors, observation, advice: fixture.advice, failed, expired, retry, cancelled, cancellationExpired });
    await testInfo.attach('failed-forage-' + fixture.species, { body: await page.screenshot(), contentType: 'image/png' });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  }
  await testInfo.attach('failed-forage-visible-spoken-expiry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('an uncommitted native touch strike names the visible Target action without feeding or changing score', async ({ page }, testInfo) => {
  await mount(page, 'commonOcto', 'observe'); const owner = await snapshot(page);
  const actors = await page.evaluate(() => {
    const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player');
    const prey = scene.children.filter((o: any) => o.userData.alive && (o.userData.cfg || o.userData.offset)); if (!prey.length) throw new Error('Actual seeded prey required');
    // Keep real prey/selection/contact running. Parking at 80m leaves them
    // outside the 28m Target range throughout this bounded contact interval,
    // while retaining the original 120m recycling boundary.
    prey.forEach((o: any) => { o.position.set(player.position.x + 80, o.position.y, player.position.z); if (o.userData.cfg) o.userData.speed=0; }); scene.updateMatrixWorld(true);
    return prey.map((o: any) => ({ name: o.name, uuid: o.uuid }));
  });
  await step(page, 3); await tap(page, 'Target'); await expect(page.locator('#allo-live-cl')).toContainText('No prey nearby');
  await tap(page, ui.hunt); await step(page, 7);
  const advice = 'No prey in reach. Tap Target to select nearby prey.';
  await expect(page.locator('.cl-mission-brief')).toBeVisible(); await expect(page.locator('.cl-mission-brief')).toContainText(advice);
  await expect(page.locator('.cl-mission-brief')).not.toContainText('T selects'); await expect(page.locator('#allo-live-cl')).toHaveText(advice);
  await expect(page.locator('progress[aria-label="Foraging progress"]')).toBeHidden(); const missed = await snapshot(page); expect(missed.score).toBe(owner.score); sameOwner(missed, owner);
  await testInfo.attach('native-uncommitted-strike-feedback', { body: JSON.stringify({ actors, owner, missed, advice }, null, 2), contentType: 'application/json' });
});
