import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 1280, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]';
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ timeout: 240000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  try { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); await expect(page.locator('.cl-anatomy-guides')).toHaveCount(0); }
  finally { await harness.destroy(page); }
  expect(failures.get(page)).toEqual([]);
});
async function frames(page: Page, count = 3) {
  await page.evaluate(async count => { for (let i = 0; i < count; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }, count);
}
async function mount(page: Page, species: string) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  await page.evaluate(species => {
    const meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1'; document.head.appendChild(meta);
    // The host mount box follows the actual viewport; production stage/control CSS is untouched.
    document.getElementById('wrap')!.style.width = '100%';
    const w = window as any, Original = w.THREE.WebGLRenderer;
    w.THREE.WebGLRenderer = new Proxy(Original, { construct(target, args, newTarget) {
      const renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene: any, camera: any) { if (scene?.getObjectByName('cl-player')) w.__labelCamera = camera; return render.apply(this, arguments); };
      return renderer;
    } });
    w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  }, species);
  await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.canvas.isConnected && r.draws > 0 && r.scene?.getObjectByName('cl-player')), undefined, { timeout: 90000 });
  await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frames(page, 4);
}
async function frozenPose(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), root = record.scene.getObjectByName('cl-player'), parts: any[] = [];
    root.traverse((object: any) => { parts.push({ name: object.name, position: object.position.toArray(), rotation: object.quaternion.toArray(), scale: object.scale.toArray(), geometry: object.geometry?.uuid, material: object.material?.uuid, vertices: object.geometry?.attributes.position ? Array.from(object.geometry.attributes.position.array) : null }); });
    return { parts, position: root.position.toArray(), time: document.querySelector('[data-hud=time]')?.textContent, energy: document.querySelector('[data-hud=energy]')?.textContent, score: document.querySelector('[data-hud=score]')?.textContent };
  });
}
async function calloutProbe(page: Page, species: string) {
  return page.evaluate(species => {
    const w = window as any, panel = document.querySelector('.cl-inspection')!, title = document.querySelector('.cl-inspection-title')!.getBoundingClientRect(), tools = document.querySelector('.cl-inspection-tools')!.getBoundingClientRect(), c = document.querySelector('canvas[role=application]')!.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const record = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), root = record.scene.getObjectByName('cl-player'), camera = w.__labelCamera;
    const names = species === 'nautilus' ? ['cl-shell', 'cl-arm-2', 'cl-eye-rim'] : species === 'commonOcto' ? ['cl-mantle', 'cl-arm-2', 'cl-eye-rim'] : ['cl-mantle', 'cl-arm-2', 'cl-eye-rim', 'cl-tentacle-0', 'cl-fin-1'];
    const labels = [...panel.querySelectorAll('.cl-anatomy-label')], groups = [...panel.querySelectorAll('.cl-anatomy-guides > g')];
    const rows = labels.map((el: any, index) => {
      const b = el.getBoundingClientRect(), line = groups[index].querySelector('line')!, dot = groups[index].querySelector('circle')!, object = root.getObjectByName(names[index]), point = new w.THREE.Vector3();
      if (object.geometry?.attributes.position && /^cl-(arm|tentacle|fin|web)/.test(object.name)) { const attr = object.geometry.attributes.position; point.fromBufferAttribute(attr, Math.floor(attr.count * .68)); object.localToWorld(point); } else object.getWorldPosition(point);
      point.project(camera);
      return { text: el.textContent, hidden: el.hidden, rect: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }, leader: ['x1', 'y1', 'x2', 'y2'].map(key => Number(line.getAttribute(key))), dot: ['cx', 'cy'].map(key => Number(dot.getAttribute(key))), projected: [c.left + (point.x * .5 + .5) * c.width, c.top + (-point.y * .5 + .5) * c.height, point.z], guideVisible: (groups[index] as SVGElement).style.display !== 'none' };
    });
    return { safe: { left: c.left + 12, right: c.right - 12, top: Math.max(c.top + 12, title.bottom + 12), bottom: Math.min(c.bottom - 12, tools.top - 12) }, canvas: { left: c.left, right: c.right, top: c.top, bottom: c.bottom }, panel: { left: p.left, top: p.top }, rows, viewport: { width: innerWidth, height: innerHeight } };
  }, species);
}
function verifyCallouts(probe: any) {
  const rows = probe.rows.filter((row: any) => !row.hidden); expect(rows.length).toBeGreaterThan(0);
  for (const row of probe.rows) {
    const [x, y, z] = row.projected, c = probe.canvas;
    const eligible = Number.isFinite(x + y + z) && z >= -1 && z <= 1 && x >= c.left && x <= c.right && y >= c.top && y <= c.bottom;
    expect(row.hidden).toBe(!eligible);
    if (row.hidden) expect(row.guideVisible).toBe(false);
  }
  for (const row of rows) {
    const b = row.rect, s = probe.safe;
    expect(b.left).toBeGreaterThanOrEqual(s.left - .5); expect(b.right).toBeLessThanOrEqual(s.right + .5); expect(b.top).toBeGreaterThanOrEqual(s.top - .5); expect(b.bottom).toBeLessThanOrEqual(s.bottom + .5);
    expect([...row.leader, ...row.dot, ...row.projected].every(Number.isFinite)).toBe(true);
    expect(row.leader[0] + probe.panel.left).toBeCloseTo(row.projected[0], 1); expect(row.leader[1] + probe.panel.top).toBeCloseTo(row.projected[1], 1);
    expect(row.dot).toEqual(row.leader.slice(0, 2));
    expect(row.leader[2] + probe.panel.left).toBeGreaterThanOrEqual(b.left - .5); expect(row.leader[2] + probe.panel.left).toBeLessThanOrEqual(b.right + .5);
    expect(row.leader[3] + probe.panel.top).toBeGreaterThanOrEqual(b.top - .5); expect(row.leader[3] + probe.panel.top).toBeLessThanOrEqual(b.bottom + .5);
  }
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i].rect, b = rows[j].rect;
    expect(a.right + 6.5 <= b.left || b.right + 6.5 <= a.left || a.bottom + 6.5 <= b.top || b.bottom + 6.5 <= a.top).toBe(true);
  }
}
async function inspect(page: Page) {
  await page.locator(canvas).focus(); await page.keyboard.press('KeyF');
  await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeVisible(); await frames(page, 4);
}
async function photo(page: Page, testInfo: any, name: string) {
  const path = testInfo.outputPath(name + '.png'); await page.locator(canvas).screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test.describe('native phone anatomy callouts', () => {
  test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 1, viewport: { width: 390, height: 844 } });
  test('measured callouts remain separated after orbit, zoom, larger text and rotation without moving the frozen specimen', async ({ page }, testInfo) => {
    await mount(page, 'humboldtSquid');
    await page.getByRole('button', { name: 'Tools', exact: true }).click(); await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
    await page.getByLabel('Larger text', { exact: true }).check(); await page.getByLabel('High contrast', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
    await inspect(page); const pose = await frozenPose(page), history: any[] = [], initial = await calloutProbe(page, 'humboldtSquid');
    expect(initial.rows.filter((row: any) => ['Mantle', 'Fin'].includes(row.text)).every((row: any) => !row.hidden)).toBe(true);
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport); await frames(page, 6); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();
      for (const action of [null, 'Orbit right', 'Closer', 'Farther']) {
        if (action) await page.getByRole('button', { name: action, exact: true }).click(); await frames(page, 6);
        const probe = await calloutProbe(page, 'humboldtSquid'); verifyCallouts(probe); history.push({ viewport, action, probe }); expect(await frozenPose(page)).toEqual(pose);
      }
      await photo(page, testInfo, 'humboldtSquid-' + viewport.width + '-inspection');
    }
    await page.getByRole('button', { name: 'Anatomy labels', exact: true }).click(); await frames(page); expect((await calloutProbe(page, 'humboldtSquid')).rows.every((row: any) => row.hidden && !row.guideVisible)).toBe(true);
    await page.getByRole('button', { name: 'Anatomy labels', exact: true }).click(); await frames(page); verifyCallouts(await calloutProbe(page, 'humboldtSquid'));
    await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeHidden();
    await testInfo.attach('native-measured-phone-anatomy-callouts', { body: JSON.stringify(history, null, 2), contentType: 'application/json' });
  });
  for (const profile of [{ species: 'commonOcto', width: 390, height: 844 }, { species: 'cuttlefish', width: 320, height: 740 }]) {
    test(`${profile.species} callouts use the same measured phone layout through orbit and zoom`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: profile.width, height: profile.height }); await mount(page, profile.species);
      await page.getByRole('button', { name: 'Tools', exact: true }).click(); await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
      await page.getByLabel('Larger text', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
      await inspect(page); const pose = await frozenPose(page), history: any[] = [], initial = await calloutProbe(page, profile.species);
      expect(initial.rows.every((row: any) => !row.hidden)).toBe(true);
      for (const action of [null, 'Orbit right', 'Closer', 'Farther']) {
        if (action) await page.getByRole('button', { name: action, exact: true }).click(); await frames(page, 6);
        const probe = await calloutProbe(page, profile.species); verifyCallouts(probe); history.push({ action, probe }); expect(await frozenPose(page)).toEqual(pose);
      }
      await photo(page, testInfo, profile.species + '-' + profile.width + '-inspection');
      await page.getByRole('button', { name: 'Anatomy labels', exact: true }).click(); await frames(page); expect((await calloutProbe(page, profile.species)).rows.every((row: any) => row.hidden && !row.guideVisible)).toBe(true);
      await page.getByRole('button', { name: 'Anatomy labels', exact: true }).click(); await frames(page); verifyCallouts(await calloutProbe(page, profile.species));
      await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeHidden();
      await testInfo.attach('native-measured-' + profile.species + '-anatomy-callouts', { body: JSON.stringify(history, null, 2), contentType: 'application/json' });
    });
  }
});
test.describe('native desktop anatomy callouts', () => {
  test.use({ hasTouch: false, isMobile: false, deviceScaleFactor: 1, viewport: { width: 1280, height: 1000 } });
  test('shell, tentacle and eye leaders preserve their actual nautilus anchors while native orbit controls move only the view', async ({ page }, testInfo) => {
    await mount(page, 'nautilus'); await inspect(page); const pose = await frozenPose(page), history: any[] = [];
    for (const action of [null, 'Orbit left', 'Higher', 'Closer', 'Farther']) {
      if (action) await page.getByRole('button', { name: action, exact: true }).click(); await frames(page, 6);
      const probe = await calloutProbe(page, 'nautilus'); verifyCallouts(probe); history.push({ action, probe }); expect(await frozenPose(page)).toEqual(pose);
    }
    await photo(page, testInfo, 'nautilus-1280-inspection');
    await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await expect(page.getByRole('region', { name: 'Specimen inspection', exact: true })).toBeHidden();
    await testInfo.attach('native-measured-desktop-anatomy-callouts', { body: JSON.stringify(history, null, 2), contentType: 'application/json' });
  });
});
