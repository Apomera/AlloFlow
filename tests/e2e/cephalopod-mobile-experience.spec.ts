import { test, expect, Page, CDPSession } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

// This suite observes the served production runtime. Explicit actor placement
// fixtures establish reachability; production layout CSS, input handlers and
// capability flags remain intact.
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


// Observe the actual visible overlays and projected mantle. The oracle does not
// copy the production grid dimensions, selectors for layout modes, or panel order.
async function viewingSpace(page: Page) {
  return page.evaluate(() => {
    const w = window as any, stage = document.querySelector('.cl-hunt-stage')!, canvas = document.querySelector('canvas[role=application]')!, camera = w.__mobileCamera;
    const rec = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), player = rec.scene.getObjectByName('cl-player'), mantle = player.getObjectByName('cl-mantle');
    if (!mantle?.geometry?.attributes.position || !camera) throw new Error('Actual rendered mantle and camera are required');
    function rect(el: Element) { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; }
    function painted(el: Element) { const b = el.getBoundingClientRect(), style = getComputedStyle(el); return b.width > 0 && b.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && !el.closest('[hidden]'); }
    function intersect(a: any, b: any) { return { left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) }; }
    function area(a: any) { return Math.max(0, a.right - a.left) * Math.max(0, a.bottom - a.top); }
    // Sweep union area, rather than adding overlapping parent/child rectangles.
    function unionArea(rectangles: any[], domain: any) {
      const clipped = rectangles.map(r => intersect(r, domain)).filter(r => area(r) > 0), xs = [...new Set(clipped.flatMap(r => [r.left, r.right]))].sort((a, b) => a - b);
      let total = 0;
      for (let i = 1; i < xs.length; i++) {
        const mid = (xs[i - 1] + xs[i]) / 2, ys = clipped.filter(r => r.left < mid && r.right > mid).map(r => [r.top, r.bottom]).sort((a, b) => a[0] - b[0]);
        let covered = 0, end = -Infinity;
        for (const [top, bottom] of ys) { covered += Math.max(0, bottom - Math.max(top, end)); end = Math.max(end, bottom); }
        total += (xs[i] - xs[i - 1]) * covered;
      }
      return total;
    }
    const c = rect(canvas), bank = rect(stage.querySelector('[aria-label="Dive actions"]')!), promptEl = stage.querySelector('.cl-hunt-action-prompt')!, prompt = rect(promptEl);
    const attr = mantle.geometry.attributes.position, point = new w.THREE.Vector3(), projected = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    let projectedVertices = 0;
    for (let i = 0; i < attr.count; i++) {
      point.fromBufferAttribute(attr, i); mantle.localToWorld(point); point.project(camera);
      if (!Number.isFinite(point.x + point.y + point.z) || point.z < -1 || point.z > 1) continue;
      const x = c.left + (point.x + 1) * c.width / 2, y = c.top + (1 - point.y) * c.height / 2;
      projected.left = Math.min(projected.left, x); projected.right = Math.max(projected.right, x); projected.top = Math.min(projected.top, y); projected.bottom = Math.max(projected.bottom, y); projectedVertices++;
    }
    const buttons = [...stage.querySelectorAll('button')].filter(painted).map(el => ({ name: el.textContent!.trim(), ...rect(el) }));
    const panels = [...stage.querySelectorAll('.cl-hunt-hud,.cl-hunt-mission,.cl-hunt-caption')].filter(painted).map(rect), overlays = [...buttons, ...panels];
    if (painted(promptEl)) overlays.push(prompt);
    const central = { left: c.left + c.width * .25, right: c.right - c.width * .25, top: c.top + c.height * .30, bottom: c.top + c.height * .70 };
    return { canvas: c, bank, prompt, text: promptEl.textContent || '', promptPainted: painted(promptEl), projected, projectedVertices,
      promptMantleOverlap: area(intersect(prompt, projected)), mantleButtonOverlaps: buttons.filter(b => area(intersect(projected, b)) > 1).map(b => b.name), promptButtonOverlaps: buttons.filter(b => area(intersect(prompt, b)) > 1).map(b => b.name),
      buttons, overlays, clearCanvasRatio: 1 - unionArea(overlays, c) / area(c), clearCentralRatio: 1 - unionArea(overlays, central) / area(central),
      promptColors: [promptEl, ...promptEl.querySelectorAll('span')].map(el => getComputedStyle(el).color), promptBackground: getComputedStyle(promptEl).backgroundColor };
  });
}
async function presentReachablePrompt(page: Page, cue: 'touch' | 'desktop' = 'touch') {
  // A layout fixture puts one actual free shelter within real interaction reach.
  // Actor placement is explicit test setup; production prompt logic, canvas,
  // camera, CSS and input handlers remain the served runtime.
  await page.evaluate(() => {
    const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player');
    const shelter = scene.children.find((o: any) => o.userData.shelterType === 'conch' && o.userData.state === 'free');
    if (!shelter) throw new Error('Actual free conch is required for the prompt fixture');
    shelter.position.set(player.position.x + .2, player.position.y - .1, player.position.z + .3);
  });
  await step(page, 3); await frames(page, 4);
  await expect(page.locator('.cl-hunt-action-prompt')).toContainText(cue === 'desktop' ? /\[G\].*pick up/i : /Interact.*pick up/i);
  await expect.poll(() => page.locator('.cl-hunt-action-prompt').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.99);
}
function verifyViewingSpace(probe: any, checkMantle: boolean) {
  expect(probe.text.trim()).not.toBe(''); expect(probe.promptPainted).toBe(true);
  expect(probe.projectedVertices).toBeGreaterThan(0);
  expect(Object.values(probe.projected).every(Number.isFinite)).toBe(true);
  expect(probe.prompt.left, 'The action hint must stay inside the rendered action bank').toBeGreaterThanOrEqual(probe.bank.left - .5);
  expect(probe.prompt.right, 'The action hint must stay inside the rendered action bank').toBeLessThanOrEqual(probe.bank.right + .5);
  expect(probe.prompt.top).toBeGreaterThanOrEqual(probe.canvas.top - .5); expect(probe.prompt.bottom).toBeLessThanOrEqual(probe.canvas.bottom + .5);
  expect(probe.promptButtonOverlaps, 'The hint must not paint over a touch action').toEqual([]);
  // Keep a useful amount of rendered ocean even on the smallest tested phone.
  expect(probe.clearCanvasRatio, 'At least one quarter of the live canvas must remain free of opaque UI').toBeGreaterThan(.25);
  if (checkMantle) {
    expect(probe.promptMantleOverlap, 'The live mantle must remain clear of the context hint').toBeLessThanOrEqual(1);
    expect(probe.mantleButtonOverlaps, 'Touch actions must remain beside the live mantle').toEqual([]);
  }
}

test('the contextual hint stays beside reachable portrait actions and releases its space when native ascent leaves reach', async ({ page }, testInfo) => {
  test.setTimeout(300000); const evidence = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await mount(page); const owner = await snapshot(page);
    await presentReachablePrompt(page); const filled = await viewingSpace(page); await assertLayout(page); verifyViewingSpace(filled, viewport.width === 390);
    await touch(page, 'touchStart', [await point(page, 'Rise', 61)]); await step(page, 28); await touch(page, 'touchEnd'); await step(page, 3); await frames(page, 4);
    await expect(page.locator('.cl-hunt-action-prompt')).toBeEmpty(); const empty = await viewingSpace(page);
    expect(empty.prompt.width * empty.prompt.height, 'An empty context hint must not reserve a painted row').toBe(0);
    expect(filled.bank.height).toBeGreaterThan(empty.bank.height + 10); await assertLayout(page); sameOwner(await snapshot(page), owner);
    await touch(page, 'touchStart', [await point(page, 'Dive', 62)]); await step(page, 28); await touch(page, 'touchEnd'); await step(page, 3);
    await presentReachablePrompt(page); const returned = await viewingSpace(page); verifyViewingSpace(returned, viewport.width === 390); await assertLayout(page); sameOwner(await snapshot(page), owner);
    evidence.push({ viewport, filled, empty, returned });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  }
  await testInfo.attach('actual-portrait-prompt-viewing-space', { body: JSON.stringify(evidence), contentType: 'application/json' });
});

test('the integrated action bank preserves larger text, contrast, rotation and paused inspection in the same world', async ({ page }, testInfo) => {
  test.setTimeout(300000); await mount(page); const owner = await snapshot(page), evidence = [];
  await showTools(page); await tap(page, ui.settings);
  await page.getByLabel('Larger text', { exact: true }).check(); await page.getByLabel('High contrast', { exact: true }).check(); await page.getByLabel('Reduced motion', { exact: true }).check();
  await tap(page, ui.resume); await play(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await frames(page, 5); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 5);
    await presentReachablePrompt(page); const probe = await viewingSpace(page); verifyViewingSpace(probe, viewport.width !== 320); await assertLayout(page);
    expect(probe.promptColors.every((color: string) => color === 'rgb(255, 255, 255)')).toBe(true); expect(probe.promptBackground).toBe('rgb(0, 0, 0)');
    await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-large-text/); await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-high-contrast/);
    await tap(page, 'Pause'); await step(page, 3); const paused = await snapshot(page);
    await showTools(page); await tap(page, ui.inspect); await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeVisible(); await step(page, 4);
    const frozen = await snapshot(page); expect(frozen.position).toEqual(paused.position); expect(frozen.time).toBe(paused.time); expect(frozen.energy).toBe(paused.energy); expect(frozen.score).toBe(paused.score); sameOwner(frozen, owner);
    await tap(page, ui.return); await step(page, 3); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused'); await expect(page.locator(canvas)).toBeFocused();
    const closed = await snapshot(page); expect(closed.position).toEqual(paused.position); expect(closed.time).toBe(paused.time); sameOwner(closed, owner);
    await play(page); await presentReachablePrompt(page); const restored = await viewingSpace(page); verifyViewingSpace(restored, viewport.width !== 320); await assertLayout(page);
    evidence.push({ viewport, probe, paused, frozen, closed, restored });
  }
  await testInfo.attach('actual-accessible-action-bank-and-inspection', { body: JSON.stringify(evidence), contentType: 'application/json' });
});

test.describe('fine pointer responsive layout transitions', () => {
  test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 1000 } });
  test('compact actions restore their original desktop owners and clear a held key when the viewport widens', async ({ page }, testInfo) => {
    test.setTimeout(240000);
    // Use the default native fine-pointer browser context. Physical touch
    // availability is recorded separately from the advertised pointer type.
    // No navigator properties or pointer media queries are replaced.
    await mount(page); const owner = await snapshot(page);
    const desktop = await page.evaluate(() => {
      const w = window as any, stage = document.querySelector('.cl-hunt-stage')!, controls = stage.querySelector('.cl-hunt-controls')!, prompt = stage.querySelector('.cl-hunt-action-prompt')!, pad = stage.querySelector('.cl-hunt-pad')!;
      w.__mobileDesktopNodes = { stage, controls, prompt, controlOrder: [...controls.children], movementOrder: [...pad.children] };
      return { touch: stage.classList.contains('cl-hunt-touch-enabled'), maxTouchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer: coarse)').matches,
        anyCoarse: matchMedia('(any-pointer: coarse)').matches, fine: matchMedia('(pointer: fine)').matches, anyFine: matchMedia('(any-pointer: fine)').matches,
        controlsAtStage: controls.parentElement === stage, promptAtStage: prompt.parentElement === stage,
        controlNames: [...controls.children].map(el => el.textContent!.trim()), movementNames: [...pad.children].map(el => el.textContent!.trim()) };
    });
    await testInfo.attach('native-desktop-input-profile', { body: JSON.stringify(desktop), contentType: 'application/json' });
    expect(desktop.touch).toBe(false);
    expect(Number.isFinite(desktop.maxTouchPoints) && Number.isInteger(desktop.maxTouchPoints)).toBe(true); expect(desktop.maxTouchPoints).toBeGreaterThanOrEqual(0);
    expect(desktop.coarse).toBe(false); expect(desktop.anyCoarse).toBe(false); expect(desktop.fine || desktop.anyFine, 'The native desktop profile must advertise a fine pointer').toBe(true);
    expect(desktop.controlsAtStage).toBe(true); expect(desktop.promptAtStage).toBe(true);
    await page.setViewportSize({ width: 320, height: 568 }); await frames(page, 5); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 5);
    await presentReachablePrompt(page); await assertLayout(page); const compact = await viewingSpace(page); verifyViewingSpace(compact, false);
    const compactMovement = await page.locator('[aria-label="Movement and depth"] button').allTextContents();
    expect(compactMovement, 'Narrow visual movement pairs must also read in the same DOM order').toEqual(['Forward', 'Back', 'Left', 'Right', 'Rise', 'Dive']);
    await page.locator(canvas).focus(); const beforeMove = await snapshot(page); await page.keyboard.down('KeyW'); await step(page, 4); const moving = await snapshot(page);
    expect(horizontalDistance(moving.position, beforeMove.position)).toBeGreaterThan(.04);
    // Resize through the actual fine-pointer breakpoint while the native key
    // remains down. A stale input must not continue in the restored desktop UI.
    await page.setViewportSize({ width: 1280, height: 1000 }); await frames(page, 6); await step(page, 6); const restored = await snapshot(page); await page.keyboard.up('KeyW');
    releasedPose(restored.position, moving.position); sameOwner(restored, owner); await expect(page.locator(canvas)).toBeFocused();
    const owners = await page.evaluate(() => {
      const w = window as any, prior = w.__mobileDesktopNodes, stage = document.querySelector('.cl-hunt-stage')!, controls = stage.querySelector('.cl-hunt-controls')!, prompt = stage.querySelector('.cl-hunt-action-prompt')!, pad = stage.querySelector('.cl-hunt-pad')!;
      return { touch: stage.classList.contains('cl-hunt-touch-enabled'), controlsSame: controls === prior.controls, promptSame: prompt === prior.prompt,
        controlsAtStage: controls.parentElement === prior.stage, promptAtStage: prompt.parentElement === prior.stage,
        controlOrder: prior.controlOrder.length === controls.children.length && prior.controlOrder.every((el: Element, i: number) => controls.children[i] === el),
        movementOrder: prior.movementOrder.length === pad.children.length && prior.movementOrder.every((el: Element, i: number) => pad.children[i] === el),
        touchStageHeight: (stage as HTMLElement).style.getPropertyValue('--cl-touch-stage-height'), touchDisplay: getComputedStyle(stage.querySelector('.cl-hunt-touch')!).display };
    });
    expect(owners).toEqual({ touch: false, controlsSame: true, promptSame: true, controlsAtStage: true, promptAtStage: true, controlOrder: true, movementOrder: true, touchStageHeight: '', touchDisplay: 'none' });
    for (const name of ['View', 'Inspect [F]', 'Help / settings', 'Next target [T]', 'Strike [E]', 'Explore depths']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    // Both overlays come from ordinary production updates: First Dive is
    // earned at mount, and the existing conch fixture supplies a reachable hint.
    await presentReachablePrompt(page, 'desktop'); await frames(page, 5);
    const desktopFeedback = await page.evaluate(() => {
      const stage = document.querySelector('.cl-hunt-stage')!, prompt = stage.querySelector('.cl-hunt-action-prompt')!;
      const popup = [...stage.children].find(el => el.classList.contains('cl-hunt-feedback') && el.textContent?.includes('Saved to your field notes'));
      if (!popup) throw new Error('Actual earned First Dive feedback is required');
      function bounds(el: Element) { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; }
      return { popup: bounds(popup), prompt: bounds(prompt), stage: bounds(stage), popupText: popup.textContent, promptText: prompt.textContent,
        popupOpacity: Number(getComputedStyle(popup).opacity), promptOpacity: Number(getComputedStyle(prompt).opacity), popupDisplay: getComputedStyle(popup).display };
    });
    expect(desktopFeedback.popupText).toContain('First Dive'); expect(desktopFeedback.promptText).toMatch(/\[G\].*pick up/i);
    expect(desktopFeedback.popupDisplay).not.toBe('none'); expect(desktopFeedback.popupOpacity).toBeGreaterThan(.99); expect(desktopFeedback.promptOpacity).toBeGreaterThan(.99);
    expect(desktopFeedback.popup.height).toBeGreaterThan(0); expect(desktopFeedback.prompt.height).toBeGreaterThan(0);
    expect(desktopFeedback.popup.bottom + 7, 'Earned achievement feedback must remain above the actual contextual hint').toBeLessThanOrEqual(desktopFeedback.prompt.top);
    expect(desktopFeedback.popup.top).toBeGreaterThanOrEqual(desktopFeedback.stage.top); sameOwner(await snapshot(page), owner);
    const focusTransitions = [];
    for (const readout of [{ selector: '.cl-hunt-hud', tabs: 1 }, { selector: '.cl-hunt-mission', tabs: 2 }]) {
      await page.setViewportSize({ width: 320, height: 568 }); await frames(page, 5); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 5);
      await expect(page.locator(readout.selector)).toHaveAttribute('tabindex', '0'); await page.locator(canvas).focus();
      for (let n = 0; n < readout.tabs; n++) await page.keyboard.press('Tab');
      await expect(page.locator(readout.selector), 'Native Tab must reach the touch readout before the responsive transition').toBeFocused();
      const focused = await snapshot(page);
      await page.setViewportSize({ width: 1280, height: 1000 }); await frames(page, 6);
      await expect(page.locator(canvas), 'A readout that loses its touch-only tab stop must return focus to the dive canvas').toBeFocused();
      expect(await page.locator(readout.selector).getAttribute('tabindex')).toBeNull(); const fallback = await snapshot(page); sameOwner(fallback, owner);
      expect(fallback.position).toEqual(focused.position); expect(fallback.time).toBe(focused.time); expect(fallback.energy).toBe(focused.energy); expect(fallback.score).toBe(focused.score);
      focusTransitions.push({ readout: readout.selector, nativeTabs: readout.tabs, focused, fallback });
    }
    const geometry = await controlLayout(page); expect(geometry.cameraFinite).toBe(true); expect(geometry.sideways).toBe(false); expect(geometry.cameraAspect).toBeCloseTo(geometry.canvas.width / geometry.canvas.height, 5);
    await testInfo.attach('actual-fine-pointer-owner-restoration', { body: JSON.stringify({ desktop, compact, compactMovement, beforeMove, moving, restored, owners, desktopFeedback, focusTransitions, geometry }), contentType: 'application/json' });
  });
});

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
    const observation = await page.locator('.cl-mission-brief').innerText();
    expect(observation).toMatch(fixture.species === 'vampireSquid' ? /Nearest marine snow|No marine snow nearby/ : /Nearest prey|No prey nearby/);
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

test('vampire touch controls describe actual marine snow and preserve held gathering and one-meal Forage', async ({ page }, testInfo) => {
  await mount(page, 'vampireSquid', 'free'); const owner = await snapshot(page);
  await expect(page.getByRole('button', { name: 'Gather / hold', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Forage', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flash', exact: true })).toBeVisible();
  for (const name of ['Target', 'Next target [T]', 'Strike [E]', 'Strike / hold']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  const layout = await controlLayout(page); expect(layout.offenders).toEqual([]); expect(layout.overlaps).toEqual([]); expect(layout.sideways).toBe(false);
  await expect(page.locator(canvas)).toHaveAttribute('aria-label', /marine-snow meal/);
  await expect(page.locator(canvas)).not.toHaveAttribute('aria-label', /Click hunts|I uses ink/);
  const actors = await page.evaluate(() => {
    const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player');
    const food = scene.children.filter((o: any) => o.name === 'cl-marine-snow'); if (food.length !== 28) throw new Error('The actual 28 marine-snow actors are required');
    food.forEach((o: any, i: number) => o.position.set(player.position.x + 7 + i * .025, player.position.y + 2, player.position.z));
    w.__vampireFood = food; w.__vampirePrey = scene.children.filter((o: any) => o.userData.alive && (o.userData.cfg || o.userData.offset));
    return { food: food.map((o: any) => o.uuid), prey: w.__vampirePrey.map((o: any) => o.uuid) };
  });
  await showTools(page);
  const nearest = await page.evaluate(() => { const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player'); return Math.min(...w.__vampireFood.map((o: any) => o.position.distanceTo(player.position))).toFixed(0); });
  await tap(page, 'Observe'); await hideTools(page);
  const observation = await page.locator('.cl-mission-brief').innerText();
  expect(observation).toContain('Nearest marine snow ' + nearest + ' metres away.'); expect(observation).not.toContain('Nearest prey');
  await expect(page.locator('#allo-live-cl')).toHaveText(observation); expect((await snapshot(page)).score).toBe(owner.score);
  await showTools(page); await tap(page, ui.settings);
  const help = page.getByRole('dialog', { name: 'Dive help and settings', exact: true }).locator('p').first();
  await expect(help).toContainText('Hold Gather / hold within reach of marine snow'); await expect(help).toContainText('Hold Flash for your defensive display');
  await expect(help).not.toContainText(/Target selects prey|Strike \/ hold|clam|I inks/);
  await tap(page, ui.resume); await play(page);
  async function foodInReach() {
    await page.evaluate(() => { const w = window as any, scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene, player = scene.getObjectByName('cl-player'); w.__vampireFood.forEach((o: any, i: number) => o.position.set(player.position.x + 7 + i * .025, player.position.y + 2, player.position.z)); w.__vampireFood[0].position.set(player.position.x, player.position.y, player.position.z + .5); });
    await step(page, 3);
  }
  await foodInReach();
  await touch(page, 'touchStart', [await point(page, 'Gather / hold', 51)]); await step(page, 4);
  expect(await page.evaluate(() => (window as any).__vampireFood[0].userData.gather)).toBeGreaterThan(0);
  await touch(page, 'touchCancel'); await step(page, 3);
  expect(await page.evaluate(() => (window as any).__vampireFood[0].userData.gather)).toBe(0); expect((await snapshot(page)).score).toBe(owner.score);
  await touch(page, 'touchStart', [await point(page, 'Gather / hold', 52)]); await step(page, 15); await touch(page, 'touchEnd'); await step(page, 3);
  const heldMeal = await snapshot(page); expect(Number(heldMeal.score)).toBe(Number(owner.score) + 2);
  await foodInReach(); await tap(page, 'Forage'); await step(page, 3);
  await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await touch(page, 'touchStart', [await point(page, ui.forward, 53)]); await step(page, 3); await touch(page, 'touchEnd'); await step(page, 3);
  await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'false'); expect((await snapshot(page)).score).toBe(heldMeal.score);
  await foodInReach(); await tap(page, 'Forage'); await step(page, 18);
  const latchedMeal = await snapshot(page); expect(Number(latchedMeal.score)).toBe(Number(owner.score) + 4);
  await expect(page.getByRole('button', { name: 'Forage', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await step(page, 18); expect((await snapshot(page)).score).toBe(latchedMeal.score);
  expect(await page.evaluate(() => (window as any).__vampirePrey.every((o: any) => o.userData.alive && o.parent))).toBe(true);
  sameOwner(latchedMeal, owner);
  const pointerProof = await page.evaluate(() => (window as any).__mobileNativePointers.filter((p: any) => p.name === 'Gather / hold'));
  expect(pointerProof.length).toBeGreaterThanOrEqual(2); expect(pointerProof.every((p: any) => p.trusted && p.type === 'touch')).toBe(true);
  await testInfo.attach('vampire-native-feeding-controls', { body: JSON.stringify({ actors, layout, observation, nearest, owner, heldMeal, latchedMeal, pointerProof }, null, 2), contentType: 'application/json' });
});
