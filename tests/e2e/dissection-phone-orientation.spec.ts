import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { observePhoneHud } from './helpers/dissection_phone_hud_paint.cjs';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const healthy = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
const cases = [
  { name: '390px frog preserves the panned bowel label', specimen: 'frog', id: 'sm_intestine', viewport: 390,
    view: 'internal', targetView: 'ventral', axis: ['ANTERIOR', 'POSTERIOR'], zoom: 2, panX: 0, panY: -108, accessible: false },
  { name: '390px mirrored heart preserves a long selected label', specimen: 'sheepHeart', id: 'septum', viewport: 390,
    view: 'ventral', targetView: 'ventral', axis: ['BASE', 'APEX'], zoom: 3, panX: 0, panY: -54, accessible: false },
  { name: '320px horizontal perch preserves inclusive orientation', specimen: 'perch', id: 'stomach_f', viewport: 320,
    view: 'internal', targetView: 'lateral', axis: ['ANTERIOR', 'POSTERIOR'], zoom: 2, panX: 28, panY: -1.2, accessible: true },
];
test.describe.configure({ retries: 0, timeout: 120000 });
test.use({ video: 'off', hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; failures.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab]')) messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(failures.get(page) || []).toEqual([]); });

function overlaps(a: any, b: any) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > .5 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .5;
}
function inside(box: any, width: number, height: number) {
  expect(box.x).toBeGreaterThanOrEqual(-.5); expect(box.y).toBeGreaterThanOrEqual(-.5);
  expect(box.x + box.width).toBeLessThanOrEqual(width + .5); expect(box.y + box.height).toBeLessThanOrEqual(height + .5);
}

for (const scene of cases) test(scene.name, async ({ page }) => {
  await page.setViewportSize({ width: scene.viewport, height: 844 });
  await harness.mount(page, { dissection: { specimen: scene.specimen, _dissLoadedSpec: scene.specimen,
    activeLayer: 'organs', anatomicalView: scene.view, workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    visualRealism: scene.accessible ? 'accessible' : 'realistic', highContrast: scene.accessible, largeText: true,
    selectedOrgan: scene.id, hoveredOrgan: null, labelMode: 'show', instrumentVisuals: false, sceneDetail: true,
    inspectionLens: false, macroInset: false, tissueRelief: true, focusMode: false, relationshipMode: false,
    depthAtlas: false, parallaxDepth: false, livingFunctionEnabled: false, variationSeed: 1,
    canvasZoom: scene.zoom, canvasPanX: scene.panX, canvasPanY: scene.panY,
    revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: healthy } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100%!important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate(node => node.getBoundingClientRect().width)).toBeLessThan(scene.viewport + 1);
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport)).toBe(true);
  const drawing = await observePhoneHud(canvas, scene.id);
  expect(drawing.card).not.toBeNull(); expect(drawing.reticle).not.toBeNull();
  inside(drawing.card, drawing.width, drawing.height);
  expect(drawing.card.glyphs.length).toBeGreaterThan(0);
  if (scene.id === 'septum') {
    const name = drawing.card.glyphs.map((glyph: any) => glyph.text).join(' ');
    expect(name).toContain('Interventricular'); expect(name).toContain('Septum'); expect(name).not.toContain('…');
  }
  for (const glyph of drawing.card.glyphs) { inside(glyph, drawing.width, drawing.height); expect(glyph.fontCss).toBeGreaterThanOrEqual(12); }
  const orientation = drawing.hud.find((box: any) => box.id === 'orientation');
  expect(orientation).toBeTruthy(); inside(orientation, drawing.width, drawing.height);
  expect(orientation.height).toBeLessThanOrEqual(85);
  expect(overlaps(orientation, drawing.reticle.bounds), 'orientation covers the selected tissue target').toBe(false);
  for (const hud of drawing.hud) expect(overlaps(hud, drawing.card), `${hud.id} covers selected name`).toBe(false);
  const orientationText = drawing.orientationGlyphs.map((glyph: any) => glyph.text).join(' ').toUpperCase();
  expect(orientationText).toContain(scene.view.toUpperCase()); expect(orientationText).toContain(scene.targetView.toUpperCase());
  for (const endpoint of scene.axis) expect(orientationText).toContain(endpoint);
  for (const glyph of drawing.orientationGlyphs) { inside(glyph, drawing.width, drawing.height); expect(glyph.fontCss).toBeGreaterThanOrEqual(11.5); }

  // Selected-card clicks toggle selection. Retain its active hover equivalent to
  // prove that the painted label's current hit box selects the correct structure.
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), { selectedOrgan: null, hoveredOrgan: scene.id });
  await expect.poll(() => canvas.evaluate((node: any, id) => !node._drawD.selectedOrgan && node._drawD.hoveredOrgan === id, scene.id)).toBe(true);
  const active = await observePhoneHud(canvas, scene.id); expect(active.card).not.toBeNull();
  await page.mouse.click(active.pageX + active.card.x + active.card.width / 2, active.pageY + active.card.y + active.card.height / 2);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe(scene.id);
  const evidence = await canvas.evaluate((node: any) => {
    const before = JSON.stringify((window as any).__ctx.toolData.dissection), camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const destination = document.createElement('canvas'); destination.width = 1000; destination.height = 1200;
    const ok = node._captureDissectionEvidence(destination.getContext('2d'), 1000, 1200);
    return { ok, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
      cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]),
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.organs.pins.length };
  });
  expect(evidence).toEqual({ ok: true, preserved: true, cameraPreserved: true, pins: 2 });
  console.log(JSON.stringify({ scene: scene.name, canvas: { width: drawing.width, height: drawing.height },
    selectedCard: drawing.card, reticle: drawing.reticle, hud: drawing.hud,
    orientationText: drawing.orientationGlyphs.map((glyph: any) => ({ text: glyph.text, fontCss: glyph.fontCss })), evidence }));
});
