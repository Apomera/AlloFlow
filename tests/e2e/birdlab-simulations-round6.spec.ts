import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round6Bird={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
const captures = resolve('reports/avian-simulations-round6-2026-10-18/final');
test.beforeAll(async () => { mkdirSync(captures, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host = viewport) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%'; wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function call(page: Page, method: string, value?: unknown): Promise<any> {
  return page.locator('[data-birdlab-3d-canvas]').evaluate((canvas: any, input) => canvas._birdlab3d[input.method](input.value), { method, value });
}
async function mount3d(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'observatory3d' } }, 'document.querySelector("[data-birdlab-3d-canvas]")?._birdlab3d');
  await sizing(page, 1280, 1100); await call(page, 'seek', 4.2);
}
async function rig(page: Page) {
  return page.evaluate(() => {
    const bird = (window as any).round6Bird.scene.getObjectByName('birdlab-red-tailed-hawk');
    return { position: bird.position.toArray(), orientation: bird.quaternion.toArray(),
      wings: ['left-shoulder', 'right-shoulder'].map(name => {
        const shoulder = bird.getObjectByName(name), wrist = shoulder.getObjectByName('articulated-wrist');
        return { shoulder: shoulder.quaternion.toArray(), wrist: wrist.quaternion.toArray() };
      }) };
  });
}
async function audit(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  const violations = await page.evaluate(async selector => {
    const report = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
    });
    return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
  }, selector);
  expect(violations).toEqual([]);
}
async function contained(page: Page, selector: string) {
  const host = await page.locator('#wrap').boundingBox(), target = page.locator(selector), box = await target.boundingBox();
  const context = `${selector}; viewport ${page.viewportSize()?.width}px, host ${host?.width}px`;
  expect(box, context).not.toBeNull(); expect(box!.width, context).toBeGreaterThan(0);
  expect(box!.x, context).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width, context).toBeLessThanOrEqual(host!.x + host!.width + 1);
  expect(await target.evaluate(element => element.scrollWidth - element.clientWidth), context + '; horizontal content overflow').toBeLessThanOrEqual(1);
}

test('one-wingbeat magnifier maps its dial to the actual powered scene cycle and articulated wings', async ({ page }) => {
  await mount3d(page); await call(page, 'setSpeed', .25);
  const before = await call(page, 'getState');
  await page.getByRole('button', { name: 'Inspect one wingbeat', exact: true }).click();
  const captured = await call(page, 'getState'), window = captured.wingbeatStudy;
  expect(captured.paused).toBe(true); expect(captured.time).toBe(before.time); expect(captured.speed).toBe(before.speed);
  expect(captured.position).toEqual(before.position); expect(captured.pose).toEqual(before.pose); expect(captured.sightings).toEqual(before.sightings);
  expect(window.start).toBeLessThan(captured.time); expect(window.end).toBeGreaterThan(captured.time);
  expect(window.end - window.start).toBeGreaterThan(.1); expect(window.end - window.start).toBeLessThan(1);
  const frames: { time: number; rig: Awaited<ReturnType<typeof rig>> }[] = [];
  for (const fraction of [0, .21, .42, .71, 1]) {
    await call(page, 'seekWingbeat', fraction);
    const state = await call(page, 'getState');
    expect(state.paused).toBe(true); expect(state.wingbeatStudy.start).toBe(window.start); expect(state.wingbeatStudy.end).toBe(window.end);
    expect(state.wingbeatStudy.progress).toBeCloseTo(fraction, 7);
    expect(state.time).toBeGreaterThanOrEqual(window.start - 1e-8); expect(state.time).toBeLessThanOrEqual(window.end + 1e-8);
    const clockPhase = await page.evaluate(time => ((window as any).BirdLab3D.sampleWingPhase(time) / (Math.PI * 2) + .21) % 1, state.time);
    const cyclicError = Math.abs(clockPhase - (fraction % 1));
    expect(Math.min(cyclicError, 1 - cyclicError)).toBeLessThan(1e-7);
    const dial = await page.locator('[data-birdlab-wingbeat-dial]').evaluate((circle: SVGCircleElement) => ({ x: circle.cx.baseVal.value, y: circle.cy.baseVal.value }));
    expect(dial.x).toBeCloseTo(140 + 86 * Math.sin(fraction * Math.PI * 2), 4);
    expect(dial.y).toBeCloseTo(119 - 86 * Math.cos(fraction * Math.PI * 2), 4);
    frames.push({ time: state.time, rig: await rig(page) });
  }
  expect(frames[0].rig.wings).not.toEqual(frames[2].rig.wings);
  expect(frames[1].rig.wings[0].wrist).not.toEqual(frames[3].rig.wings[0].wrist);
  const frozen = await call(page, 'getState'), frozenRig = await rig(page);
  await page.waitForTimeout(200); expect((await call(page, 'getState')).time).toBe(frozen.time); expect(await rig(page)).toEqual(frozenRig);
  await page.getByRole('button', { name: 'Keep this pose and close', exact: true }).click();
  expect((await call(page, 'getState')).wingbeatStudy).toBeNull(); expect(await rig(page)).toEqual(frozenRig);
  await expect(page.getByRole('button', { name: 'Inspect one wingbeat', exact: true })).toBeFocused();
  // A magnified frame is exactly the ordinary animation at that time. It must
  // never replace the bird with a detached teaching pose or a second clock.
  for (const frame of frames) { await call(page, 'seek', frame.time); expect(await rig(page)).toEqual(frame.rig); }
  const render = await page.evaluate(() => {
    const renderer = (window as any).round6Bird.renderer;
    return { ownsCanvas: renderer.domElement === document.querySelector('[data-birdlab-3d-canvas]') && renderer.domElement.isConnected,
      live: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
  expect(render).toMatchObject({ ownsCanvas: true, live: true, shaders: true }); expect(render.calls).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('wingbeat controls exit coherently and remain keyboard operable and accessible at three sizes', async ({ page }) => {
  await mount3d(page);
  const toggle = page.locator('[data-birdlab-wingbeat-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const slider = page.locator('#birdlab-wingbeat-phase');
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused();
    expect((await call(page, 'getState')).wingbeatStudy.progress).toBeCloseTo(0, 7);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    expect((await call(page, 'getState')).wingbeatStudy.progress).toBeCloseTo(.001, 7);
    await page.locator('[data-birdlab-wingbeat-preset="0.42"]').click();
    expect((await call(page, 'getState')).wingbeatStudy.progress).toBeCloseTo(.42, 7);
    await contained(page, '[data-birdlab-wingbeat-study]'); await contained(page, '#birdlab-wingbeat-phase');
    if (layout.host <= 500) {
      const panel = await page.locator('[data-birdlab-wingbeat-study]').boundingBox();
      const stage = await page.locator('.birdlab-3d-stage').boundingBox();
      expect(panel!.width, `${layout.host}px host must give the wingbeat controls a readable full column`).toBeGreaterThan(300);
      expect(stage!.width, `${layout.host}px host must not squeeze the woodland beside its sidebar`).toBeGreaterThan(300);
    }
    await audit(page, '[data-birdlab-wingbeat-study]');
    if (layout.host === 500) await page.locator('.birdlab-3d-layout > section').screenshot({ path: resolve(captures, 'bird-wingbeat-embedded-500.png'), timeout: 90_000 });
  }
  await call(page, 'seek', 14); expect((await call(page, 'getState')).wingbeatStudy).toBeNull(); await expect(toggle).toBeDisabled();
  await call(page, 'seek', 0); await expect(toggle).toBeDisabled();
  await call(page, 'seek', 4.2); await toggle.click(); await call(page, 'setCamera', 'chickadee');
  expect((await call(page, 'getState')).wingbeatStudy).toBeNull(); await expect(toggle).toHaveCount(0);
  await call(page, 'setCamera', 'orbit'); await call(page, 'seek', 4.2); await toggle.click();
  await call(page, 'setMode', 'free'); expect((await call(page, 'getState')).wingbeatStudy).toBeNull();
  await call(page, 'setMode', 'guided'); expect((await call(page, 'getState')).time).toBeCloseTo(4.2, 7);
  await toggle.click(); await call(page, 'restart');
  const restart = await call(page, 'getState'); expect(restart.wingbeatStudy).toBeNull(); expect(restart.time).toBe(0); expect(restart.paused).toBe(true);
  await call(page, 'seek', 4.2); await toggle.click(); await call(page, 'setPaused', false);
  expect((await call(page, 'getState')).wingbeatStudy).toBeNull(); await call(page, 'setPaused', true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

async function mountPatterns(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'flightPatterns', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await page.getByRole('button', { name: 'Compare two styles', exact: true }).click();
}
async function setPatternPhase(page: Page, value: number) {
  await page.locator('#birdlab-flight-phase').evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function patternFrame(page: Page) {
  return page.locator('[data-birdlab-flight-workbench]').evaluate(element => {
    const primary = element.querySelector('[data-flight-body]') as SVGGraphicsElement;
    const comparison = element.querySelector('[data-flight-comparison-body]') as SVGGraphicsElement;
    const a = primary.transform.baseVal.consolidate()!.matrix, b = comparison.transform.baseVal.consolidate()!.matrix;
    return {
      primary: element.getAttribute('data-birdlab-flight-workbench'), comparison: comparison.getAttribute('data-flight-comparison-body'),
      phase: Number(primary.getAttribute('data-flight-phase')), comparisonPhase: Number(comparison.getAttribute('data-flight-comparison-phase')),
      a: { x: a.e, y: a.f, pose: primary.querySelector('[data-flight-wing-pose]')!.getAttribute('data-flight-wing-pose') },
      b: { x: b.e, y: b.f, pose: comparison.querySelector('[data-flight-wing-pose]')!.getAttribute('data-flight-wing-pose') },
      cursors: [...element.querySelectorAll('[data-flight-rhythm-cursor]')].map(line => Number(line.getAttribute('x1'))),
      rhythm: [...element.querySelectorAll('[data-flight-rhythm]')].map(row => ({ kind: row.getAttribute('data-flight-rhythm'),
        states: [...row.querySelectorAll('[data-rhythm-state]')].map(bar => bar.getAttribute('data-rhythm-state')) })),
    };
  });
}

test('paired flight styles share one sequence phase while their actual bird poses and rhythm lanes remain distinct', async ({ page }) => {
  await mountPatterns(page);
  const panel = page.locator('[data-birdlab-flight-workbench]'), select = page.getByRole('combobox', { name: 'Comparison flight style', exact: true });
  const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await setPatternPhase(page, 200);
  const initial = await patternFrame(page);
  expect(initial.primary).toBe('bound'); expect(initial.comparison).toBe('glide');
  expect(initial.phase).toBe(200); expect(initial.comparisonPhase).toBe(200); expect(initial.cursors).toEqual([100, 100]);
  expect(initial.a.x).toBe(164); expect(initial.a.y).toBeCloseTo(170 - 43 * Math.sin(.2 * Math.PI * 6), 2);
  expect(initial.a.pose).toBe('folded'); expect(initial.b.x).toBe(164); expect(initial.b.y).toBeCloseTo(124.8, 3); expect(initial.b.pose).toBe('-14.00');
  expect(initial.rhythm[0].states).toContain('folded'); expect(initial.rhythm[0].states).toContain('beating');
  expect(new Set(initial.rhythm[1].states)).toEqual(new Set(['held']));
  await expect(panel.locator('[data-flight-comparison-reading="glide"]')).toBeVisible();
  await expect(panel.locator('[data-flight-comparison-wing-reading="held"]')).toContainText('Wings held open');
  for (const row of initial.rhythm) expect(row.states).toHaveLength(100);
  await panel.getByRole('button', { name: 'Swap A and B', exact: true }).click();
  const swapped = await patternFrame(page);
  expect(swapped.phase).toBe(initial.phase); expect(swapped.comparisonPhase).toBe(initial.phase);
  expect(swapped.a).toEqual(initial.b); expect(swapped.b).toEqual(initial.a);
  expect(swapped.rhythm[0]).toEqual(initial.rhythm[1]); expect(swapped.rhythm[1]).toEqual(initial.rhythm[0]);
  await select.selectOption('hover');
  const hoverStart = await patternFrame(page); expect(hoverStart.phase).toBe(200);
  await setPatternPhase(page, 730);
  const hoverLater = await patternFrame(page);
  expect(hoverStart.b.x).toBe(320); expect(hoverStart.b.y).toBe(155);
  expect(hoverLater.b.x).toBe(320); expect(hoverLater.b.y).toBe(155); expect(hoverLater.b.pose).not.toBe(hoverStart.b.pose);
  expect(hoverLater.cursors).toEqual([365, 365]); expect(hoverLater.comparisonPhase).toBe(hoverLater.phase);
  await select.selectOption('dive');
  const dive = await patternFrame(page);
  expect(dive.b.pose).toBe('folded'); expect(new Set(dive.rhythm[1].states)).toEqual(new Set(['folded']));
  await expect(panel.locator('[data-flight-comparison-reading="dive"]')).toBeVisible();
  await expect(panel.locator('[data-flight-comparison-wing-reading="folded"]')).toContainText('Wings folded');
  expect(dive.b.x).toBeCloseTo(105 + 430 * .73 ** 2, 2); expect(dive.b.y).toBeCloseTo(73 + 215 * .73, 2);
  await expect(panel.locator('[data-flight-comparison-note]')).toContainText('not a race');
  await page.waitForTimeout(200); expect(await patternFrame(page)).toEqual(dive);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('paired flight controls preserve pause and keyboard focus with readable rhythms at three sizes', async ({ page }) => {
  await mountPatterns(page);
  const panel = page.locator('[data-birdlab-flight-workbench]'), slider = page.locator('#birdlab-flight-phase');
  const select = page.getByRole('combobox', { name: 'Comparison flight style', exact: true });
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused();
    expect((await patternFrame(page)).phase).toBe(0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    let frame = await patternFrame(page); expect(frame.phase).toBe(1); expect(frame.comparisonPhase).toBe(1);
    await page.keyboard.press('End'); frame = await patternFrame(page); expect(frame.cursors).toEqual([500, 500]);
    await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    await expect(select).toBeFocused(); await expect(panel).toHaveAttribute('data-flight-playing', 'false');
    frame = await patternFrame(page); expect(frame.phase).toBe(1000); expect(frame.comparisonPhase).toBe(1000);
    for (const selector of ['[data-birdlab-flight-workbench]', '[data-flight-rhythm-panel]', '[data-flight-compare-select]', '[data-flight-comparison-reading]', '#birdlab-flight-phase']) await contained(page, selector);
    await audit(page, '[data-birdlab-flight-workbench]'); await page.waitForTimeout(150); expect(await patternFrame(page)).toEqual(frame);
  }
  await panel.getByRole('button', { name: 'Play sequence', exact: true }).click();
  await expect(panel).toHaveAttribute('data-flight-playing', 'true');
  await expect.poll(async () => (await patternFrame(page)).phase).toBeGreaterThan(0);
  await panel.getByRole('button', { name: 'Swap A and B', exact: true }).click();
  await expect(panel).toHaveAttribute('data-flight-playing', 'false'); const stopped = await patternFrame(page);
  await page.waitForTimeout(200); expect(await patternFrame(page)).toEqual(stopped);
  await panel.getByRole('button', { name: 'Hide comparison', exact: true }).click();
  await expect(panel.locator('[data-flight-comparison-body]')).toHaveCount(0);
  await expect(panel.locator('[data-flight-rhythm]')).toHaveCount(1);
  expect(Number(await slider.inputValue())).toBeCloseTo(stopped.phase, 0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
