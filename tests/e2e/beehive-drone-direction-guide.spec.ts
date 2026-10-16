import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_GUIDE_ARTIFACTS || '.codex-artifacts/bee-drone-guide-2026-10-15');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const field = (page: Page) => page.locator('#beehive-drone-playfield');
const guide = (page: Page) => field(page).locator('[data-flight-director]');
const reading = (page: Page, key: string) => guide(page).locator('[data-director-value="' + key + '"]');
async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function setGuideOpen(page: Page, open: boolean) {
  if (await guide(page).evaluate((node: HTMLDetailsElement) => node.open) !== open) {
    await keyboard(page, guide(page).locator(':scope > summary'));
  }
  await expect(guide(page)).toHaveJSProperty('open', open); await settle(page);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Direction guide tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'live', scenario: 'clear', routePlan: 'balanced',
        courseSeed: 20260908, graphicsMode: 'eco', custom: { retained: 'Saved flight metadata.' } },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my colony observation.', explanation: 'Keep my colony explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.', explanation: 'Keep my flight explanation.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      journal: [{ day: 0, text: 'Keep my recorded journal observation.' }],
      custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  const briefing = field(page);
  await expect(briefing).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await expect(briefing).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(briefing.locator('[data-flight-start-behavior]')).toContainText('Starts paused for your reduced-motion preference');
  await settle(page);
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  const canvas = page.locator('[data-beehive-drone-canvas]');
  await expect(canvas).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await expect(guide(page)).toBeVisible(); await expect(guide(page)).toHaveJSProperty('open', false); await settle(page);
  await page.evaluate(() => {
    const w = window as any; w.__guideMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__guideMountedFlightState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function protectedWork(page: Page) {
  return page.evaluate(() => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    // Camera and HUD are the two intentional saved preferences exercised below.
    delete result.beehive.drone.cameraMode; delete result.beehive.drone.detailedHud;
    return result;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    const result: Record<string, unknown> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed',
      'energy', 'timer', 'phase', 'paused', 'pacing', 'difficulty', 'score', 'randomState',
      'simulationClock', 'decisionCount', 'decisionLog', 'reachedLaunch', 'reachedDca',
      'reachedQueen', 'telemetry', 'wind', 'windNow', 'nearQueens']) result[key] = s[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function sameFlight(page: Page) {
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__guideMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__guideMountedFlightState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function redraw(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { Object.assign((window as any).__testHooks.beehive.droneStateRef.current, patch); }, patch);
  const held = await flight(page);
  await keyboard(page, page.locator('[data-flight-camera-toggle]'));
  await expect(page.locator('[data-flight-camera-toggle]')).toBeFocused();
  await settle(page); expect(await flight(page)).toEqual(held); await sameFlight(page);
  return held;
}
async function geometry(page: Page) {
  const layout = await field(page).evaluate(node => {
    const viewport = node.querySelector('[data-flight-viewport]')!, director = node.querySelector('[data-flight-director]')!, canvas = node.querySelector('[data-beehive-drone-canvas]')!;
    const outer = node.getBoundingClientRect(), scene = viewport.getBoundingClientRect(), info = director.getBoundingClientRect(), image = canvas.getBoundingClientRect();
    return { guideAfterViewport: info.top >= scene.bottom - 1, guideInsideField: info.bottom <= outer.bottom + 1,
      sceneHeight: scene.height, canvasWidthDifference: Math.abs(scene.width - image.width), canvasHeightDifference: Math.abs(scene.height - image.height),
      canvasInViewport: canvas.parentElement === viewport,
      controlsFollowField: node.nextElementSibling?.hasAttribute('data-beehive-touch-controls') };
  });
  expect(layout.guideAfterViewport).toBe(true); expect(layout.guideInsideField).toBe(true);
  expect(layout.sceneHeight).toBeGreaterThanOrEqual(440); expect(layout.sceneHeight).toBeLessThanOrEqual(620);
  expect(layout.canvasWidthDifference).toBeLessThanOrEqual(1); expect(layout.canvasHeightDifference).toBeLessThanOrEqual(1);
  expect(layout.canvasInViewport).toBe(true); expect(layout.controlsFollowField).toBe(true);
  return layout;
}

test('Drone direction guide distinguishes DCA conditions and reserves without advancing a paused flight', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const saved = await protectedWork(page), approach = guide(page).locator('[data-flight-approach]');
  const beforeOpening = await flight(page); await setGuideOpen(page, true);
  expect(await flight(page)).toEqual(beforeOpening); expect(await protectedWork(page)).toEqual(saved);
  await expect(guide(page).getByText('Ahead', { exact: true })).toBeVisible();
  const held = await redraw(page, { phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
    x: 0, y: 80, z: -550, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0, speed: 0,
    energy: 100, timer: 119.2, trainingStep: 5, wind: { x: 0, z: 0, phase: 0 }, windNow: { x: 0, z: 0 },
    nearQueens: [{ x: 80, y: 120, z: -600, caught: false }], obstacles: [], birds: [], drones: [], flowers: [], thermals: [] });
  await expect(reading(page, 'target')).toHaveText('DCA'); await expect(reading(page, 'direction')).toHaveText('Target ahead');
  await expect(reading(page, 'range')).toHaveText('50'); await expect(reading(page, 'altitude')).toHaveText('80 model ft');
  await expect(reading(page, 'seconds')).toHaveText('120 model s');
  await expect(approach.locator('[data-approach-range]')).toHaveAttribute('data-met', 'true');
  await expect(approach.locator('[data-approach-height]')).toHaveAttribute('data-met', 'false');
  await expect(approach.locator('[data-approach-height]')).toContainText('Climb 20 model ft');
  await expect(approach).toHaveAttribute('data-approach-recorded', 'false'); await geometry(page);
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(held);

  const cameraToggle = page.locator('[data-flight-camera-toggle]'), cameraBeforeShortcut = await cameraToggle.getAttribute('aria-pressed');
  await keyboard(page, field(page), 'v');
  await expect(field(page)).toBeFocused();
  await expect(cameraToggle).toHaveAttribute('aria-pressed', cameraBeforeShortcut === 'true' ? 'false' : 'true');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.drone.cameraMode)).toBe(cameraBeforeShortcut === 'true' ? 'cockpit' : 'chase');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await settle(page); expect(await flight(page)).toEqual(held); await sameFlight(page);
  await page.keyboard.press('Escape');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused'); await expect(field(page)).toBeFocused();
  await settle(page); expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);

  for (const y of [100, 115, 130]) {
    await redraw(page, { y, z: -400 });
    await expect(reading(page, 'vertical')).toHaveText('Within DCA height band');
    await expect(approach.locator('[data-approach-height]')).toHaveAttribute('data-met', 'true');
    await expect(approach.locator('[data-approach-range]')).toHaveAttribute('data-met', 'false');
    await expect(approach.locator('[data-approach-range]')).toContainText('128 model m closer');
  }
  const atGate = await redraw(page, { y: 115, z: -600 });
  await expect(approach.locator('[data-approach-status]')).toHaveText('Entry conditions met');
  await expect(approach).toHaveAttribute('data-approach-recorded', 'false');
  await expect(guide(page).locator('[data-director-note]')).toContainText('Advance flight to record entry');
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(atGate);
  expect((await flight(page)).reachedDca).toBe(false);

  await redraw(page, { reachedDca: true, phase: 'congregation' });
  await expect(approach.locator('[data-approach-status]')).toHaveText('DCA recorded');
  await expect(approach.locator('[data-approach-chart]')).toBeHidden();
  await expect(approach.locator('[data-approach-recorded-note]')).toContainText('queen cue');
  await expect(reading(page, 'target')).toHaveText('Queen cue');
  await expect(reading(page, 'direction')).toHaveText('Turn right 90°');
  await expect(reading(page, 'range')).toHaveText('80');
  await expect(guide(page).locator('[data-director-arrow]')).toHaveAttribute('transform', 'rotate(90 32 32)');
  await redraw(page, { energy: 31.25 });
  await expect(reading(page, 'energy')).toHaveText('25%');
  await expect(guide(page)).toHaveAttribute('data-reserve-low', 'false');
  await expect(guide(page).locator('[data-director-reserve]')).toHaveText('Reserve available');
  const energyMeter = guide(page).locator('[data-director-energy-meter]'), energyFill = guide(page).locator('[data-director-energy-fill]');
  await expect(energyMeter).toHaveAttribute('role', 'meter'); await expect(energyMeter).toHaveAttribute('aria-valuenow', '25');
  expect(await energyFill.evaluate((node: HTMLElement) => node.style.width)).toBe('25%');
  const low = await redraw(page, { energy: 30 });
  await expect(reading(page, 'energy')).toHaveText('24%');
  await expect(guide(page)).toHaveAttribute('data-reserve-low', 'true');
  await expect(guide(page).locator('[data-director-reserve]')).toHaveText('Low reserve');
  await expect(energyMeter).toHaveAttribute('aria-valuenow', '24');
  expect(await energyFill.evaluate((node: HTMLElement) => node.style.width)).toBe('24%');

  const viewportBefore = await field(page).locator('[data-flight-viewport]').boundingBox();
  await keyboard(page, page.locator('[data-flight-comfort-details] > summary'));
  await keyboard(page, page.locator('[data-flight-hud-toggle]'));
  await expect(field(page)).toHaveAttribute('data-flight-hud', 'detailed'); await expect(guide(page)).toBeHidden();
  const viewportDetailed = await field(page).locator('[data-flight-viewport]').boundingBox();
  expect(viewportDetailed?.width).toBe(viewportBefore?.width); expect(viewportDetailed?.height).toBe(viewportBefore?.height);
  expect(await flight(page)).toEqual(low); await sameFlight(page);
  await keyboard(page, page.locator('[data-flight-hud-toggle]'));
  await expect(field(page)).toHaveAttribute('data-flight-hud', 'clear'); await expect(guide(page)).toBeVisible();
  await expect(guide(page).locator('[data-director-reserve]')).toHaveText('Low reserve');
  await geometry(page); expect(await flight(page)).toEqual(low); expect(await protectedWork(page)).toEqual(saved);
  await sameFlight(page);

  // This deliberate live interval is the only point in this workflow that may advance physics.
  await setGuideOpen(page, true); await keyboard(page, field(page), 'p');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'live');
  await expect(guide(page)).toHaveJSProperty('open', false);
  await expect(guide(page).locator('[data-director-status]')).toHaveText('Flying');
  await expect.poll(async () => Number((await flight(page)).simulationClock)).toBeGreaterThan(Number(low.simulationClock || 0));
  await keyboard(page, guide(page).locator(':scope > summary'));
  await expect(guide(page)).toHaveJSProperty('open', true);
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await expect(guide(page).locator('[data-director-status]')).toHaveText('Paused');
  await expect(guide(page).locator(':scope > summary')).toBeFocused(); await settle(page);
  const pausedAfterReading = await flight(page), savedAfterReading = await protectedWork(page);
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(pausedAfterReading);
  expect(await protectedWork(page)).toEqual(savedAfterReading); await sameFlight(page); expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string, minimumTextItems = 10) {
  const layout = await geometry(page);
  const result = await guide(page).evaluate(async node => {
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      // Chromium can retain layout boxes inside closed native details content.
      // Only each closed disclosure's direct summary remains visually exposed.
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor) {
        if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
          const summary = Array.from(ancestor.children).find(child => child.tagName === 'SUMMARY');
          if (!summary?.contains(el)) return false;
        }
        if (ancestor === node) break;
        ancestor = ancestor.parentElement;
      }
      return el instanceof HTMLElement && rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden' && css.clip !== 'rect(0px, 0px, 0px, 0px)';
    });
    const text: { value: string; size: number; ellipsis: string; clipped: boolean }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement; if (!parent || !visible.includes(parent)) continue;
      const css = getComputedStyle(parent), range = document.createRange(); range.selectNodeContents(textNode);
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      const clippingAncestors: DOMRect[] = [box]; let ancestor: HTMLElement | null = parent;
      while (ancestor && ancestor !== node) {
        const style = getComputedStyle(ancestor);
        if (['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY)) clippingAncestors.push(ancestor.getBoundingClientRect());
        ancestor = ancestor.parentElement;
      }
      text.push({ value: textNode.textContent.trim(), size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow,
        clipped: rects.some(rect => clippingAncestors.some(bound => rect.left < bound.left - 1 || rect.right > bound.right + 1 || rect.top < bound.top - 1 || rect.bottom > bound.bottom + 1)) });
    }
    return {
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // The decorative height pointer intentionally draws a triangle wider than its narrow stem.
      // Its position still participates in the guide bounds checks below.
      overflow: [node, ...visible].filter(el => !(el.matches('[data-approach-pointer]') && el.closest('[aria-hidden="true"]')) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({
        tag: el.tagName, id: el.id, className: el.className,
        attributes: Array.from(el.attributes).filter(attribute => attribute.name.startsWith('data-') || attribute.name.startsWith('aria-')).map(attribute => [attribute.name, attribute.value]),
        text: el.textContent, extra: el.scrollWidth - el.clientWidth,
      })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }),
      text,
    };
  });
  fs.writeFileSync(path.join(artifacts, 'direction-guide-layout-' + mode + '.json'), JSON.stringify({ layout, ...result }, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.text.length).toBeGreaterThan(minimumTextItems);
  for (const item of result.text) { expect(item.size, item.value).toBeGreaterThanOrEqual(.875); expect(item.ellipsis, item.value).not.toBe('ellipsis'); expect(item.clipped, item.value).toBe(false); }
}
async function capture(page: Page, mode: string) {
  const target = field(page), pad = 6, prefix = 'preview-drone-direction-guide-' + mode;
  const position = await target.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull();
    const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('Drone direction guide remains outside the flight scene and readable in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await redraw(page, { phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
    x: 100, y: 80, z: -420, yaw: .35, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0, speed: 0, energy: 25, timer: 68.7, trainingStep: 5 });
  const saved = await protectedWork(page), held = await flight(page);
  for (const mode of ['wide', 'mobile', 'dark', 'large', 'forced']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark';
      document.documentElement.style.fontSize = mode === 'large' ? '24px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
    await expect(guide(page)).toBeVisible();
    if (mode === 'mobile') {
      await setGuideOpen(page, false);
      const compact = await guide(page).boundingBox(); expect(compact).not.toBeNull();
      expect(compact!.height).toBeLessThanOrEqual(240);
      await expect(guide(page).locator(':scope > summary')).toContainText('Read flight details');
      await audit(page, 'mobile-compact', 5); await capture(page, 'mobile-compact');
      expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved);
    }
    await setGuideOpen(page, true); await expect(guide(page).locator('[data-director-reserve]')).toHaveText('Low reserve');
    await expect(guide(page).getByText('Ahead', { exact: true })).toBeVisible();
    const bearingLabel = await guide(page).getByText('Ahead', { exact: true }).evaluate(el => ({
      height: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight)
    }));
    expect(bearingLabel.height).toBeLessThanOrEqual(bearingLabel.lineHeight + 1);
    await settle(page); await audit(page, mode); await capture(page, mode);
    expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);
  }
  expect(errors).toEqual([]);
});
