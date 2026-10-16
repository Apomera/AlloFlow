import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_HEADER_ARTIFACTS || '.codex-artifacts/bee-drone-header-2026-10-15');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Difficulty = 'easy' | 'normal' | 'hard';
const capacity = { easy: 125, normal: 105, hard: 82 };
const field = (page: Page) => page.locator('#beehive-drone-playfield');
const header = (page: Page) => field(page).locator('[data-flight-command-header]');
const warning = (page: Page) => header(page).locator('[data-flight-energy-warning]');
const training = (page: Page) => header(page).locator('[data-flight-training]');
const pause = (page: Page) => header(page).locator('[data-beehive-flight-pause]');
async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function mount(page: Page, options: { difficulty?: Difficulty; pacing?: 'live' | 'steps'; fallback?: boolean } = {}) {
  const difficulty = options.difficulty || 'easy', pacing = options.pacing || 'live', fallback = options.fallback !== false;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ pacing, fallback }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    if (fallback) w.StemLab.ensureThree = () => Promise.reject(new Error('Command header tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing, scenario: 'clear', routePlan: 'balanced',
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
  }, { pacing, fallback });
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing'); await expect(field(page)).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(field(page).locator('[data-flight-start-behavior]')).toContainText(pacing === 'steps' ? 'Time moves only when you advance a maneuver' : 'Starts paused for your reduced-motion preference');
  await settle(page); await keyboard(page, page.locator('[data-flight-launch="' + difficulty + '"]'));
  const canvas = page.locator('[data-beehive-drone-canvas]');
  await expect(canvas).toHaveAttribute('data-flight-renderer', fallback ? 'canvas-2d-fallback' : 'three-webgl');
  if (!fallback) await expect(canvas).toHaveAttribute('data-flight-frame-health', 'verified', { timeout: 45000 });
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused'); await expect(header(page)).toBeVisible(); await settle(page);
  await page.evaluate(() => {
    const w = window as any; w.__headerMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__headerMountedFlightState = w.__testHooks.beehive.droneStateRef.current;
    const context = (w.__headerMountedCanvas as HTMLCanvasElement).getContext('2d')!, original = context.fillText.bind(context);
    w.__headerCanvasTextCalls = 0; w.__headerCanvasWarnings = [];
    context.fillText = function (...args: Parameters<typeof context.fillText>) {
      w.__headerCanvasTextCalls++;
      const text = String(args[0]);
      if (/LOW ENERGY/i.test(text) && !w.__headerCanvasWarnings.includes(text)) w.__headerCanvasWarnings.push(text);
      return original(...args);
    };
  });
}
async function protectedWork(page: Page, omitFlight = false) {
  return page.evaluate(omitFlight => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitFlight) delete result.beehive.drone;
    else {
      // Camera refreshes and HUD selection are the two explicit saved display preferences exercised here.
      delete result.beehive.drone.cameraMode; delete result.beehive.drone.detailedHud;
    }
    return result;
  }, omitFlight);
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, unknown> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer',
      'phase', 'paused', 'pacing', 'difficulty', 'score', 'distance', 'randomState', 'simulationClock',
      'decisionCount', 'decisionLog', 'reachedLaunch', 'reachedDca', 'reachedQueen', 'nectarCollected',
      'routeMarkersPassed', 'telemetry', 'wind', 'windNow', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function sameFlight(page: Page) {
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__headerMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__headerMountedFlightState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function redraw(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, patch), patch);
  const held = await flight(page);
  await keyboard(page, page.locator('[data-flight-camera-toggle]')); await settle(page);
  expect(await flight(page)).toEqual(held); await sameFlight(page); return held;
}
async function geometry(page: Page) {
  const result = await field(page).evaluate(node => {
    const command = node.querySelector('[data-flight-command-header]')!, viewport = node.querySelector('[data-flight-viewport]')!, canvas = node.querySelector('[data-beehive-drone-canvas]')!;
    const top = command.getBoundingClientRect(), scene = viewport.getBoundingClientRect(), image = canvas.getBoundingClientRect(), outer = node.getBoundingClientRect();
    const blocks = Array.from(command.querySelectorAll('button,[data-flight-energy-warning],[data-flight-training]')).filter(el => {
      const box = el.getBoundingClientRect(), css = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && css.display !== 'none' && css.visibility !== 'hidden';
    });
    const overlaps: { first: string; second: string }[] = [];
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].getBoundingClientRect(), b = blocks[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push({ first: blocks[i].textContent || '', second: blocks[j].textContent || '' });
    }
    return {
      headerInField: command.parentElement === node, headerBeforeScene: viewport.previousElementSibling === command,
      headerInsideField: top.left >= outer.left - 1 && top.right <= outer.right + 1 && top.top >= outer.top - 1,
      headerAboveScene: top.bottom <= scene.top + 1,
      blocksAboveScene: blocks.every(el => el.getBoundingClientRect().bottom <= scene.top + 1), overlaps,
      canvasInViewport: canvas.parentElement === viewport, sceneHeight: scene.height,
      canvasWidthDifference: Math.abs(scene.width - image.width), canvasHeightDifference: Math.abs(scene.height - image.height),
      buttons: blocks.filter(el => el.tagName === 'BUTTON').map(el => { const box = el.getBoundingClientRect(); return { text: el.textContent, width: box.width, height: box.height }; }),
    };
  });
  expect(result.headerInField).toBe(true); expect(result.headerBeforeScene).toBe(true); expect(result.headerInsideField).toBe(true);
  expect(result.headerAboveScene).toBe(true); expect(result.blocksAboveScene).toBe(true); expect(result.overlaps).toEqual([]);
  expect(result.canvasInViewport).toBe(true); expect(result.sceneHeight).toBeGreaterThanOrEqual(440); expect(result.sceneHeight).toBeLessThanOrEqual(620);
  expect(result.canvasWidthDifference).toBeLessThanOrEqual(1); expect(result.canvasHeightDifference).toBeLessThanOrEqual(1);
  for (const button of result.buttons) { expect(button.width, button.text || '').toBeGreaterThanOrEqual(44); expect(button.height, button.text || '').toBeGreaterThanOrEqual(44); }
  return result;
}

test('Drone command header warns below the raw quarter-capacity boundary at every difficulty without advancing flight', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
    await mount(page, { difficulty }); const saved = await protectedWork(page);
    await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Paused');
    await expect(pause(page)).toHaveAccessibleName('Resume flight');
    await expect(header(page).getByRole('button', { name: 'End flight', exact: true })).toBeVisible();
    if (difficulty === 'easy') {
      await expect(training(page)).toBeVisible(); await expect(training(page).locator('[data-flight-training-label]')).toHaveText('Build forward speed');
    } else {
      await expect(training(page)).toBeHidden(); await expect(training(page)).toHaveAttribute('data-training-state', 'inactive');
    }
    await redraw(page, { energy: capacity[difficulty] * .25 });
    await expect(warning(page)).toBeHidden();
    const below = await redraw(page, { energy: capacity[difficulty] * .25 - .001 });
    await expect(warning(page)).toBeVisible();
    await expect(warning(page)).toContainText('Low energy reserve');
    await expect(warning(page)).toContainText('Use short thrust bursts and glide when possible. There is no in-flight refueling.');
    // This is still 25% when rounded; the warning must use the underlying energy ratio.
    await expect(page.locator('[data-director-value="energy"]')).toHaveText('25%');
    await geometry(page); await page.waitForTimeout(250); expect(await flight(page)).toEqual(below);
    expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);
    const canvasText = await page.evaluate(() => ({ calls: (window as any).__headerCanvasTextCalls as number, warnings: (window as any).__headerCanvasWarnings as string[] }));
    expect(canvasText.calls).toBeGreaterThan(0); expect(canvasText.warnings).toEqual([]);
    const restored = await redraw(page, { energy: capacity[difficulty] * .25 });
    await expect(warning(page)).toBeHidden(); expect(await flight(page)).toEqual(restored); expect(await protectedWork(page)).toEqual(saved);
    await harness.destroy(page);
  }
  expect(errors).toEqual([]);
});

test('Drone command header follows training evidence, inspection, keyboard pause and deliberate pacing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, { fallback: false });
  const saved = await protectedWork(page), colony = await protectedWork(page, true);
  const stages = [
    { patch: { speed: 0, nectarCollected: 0, y: 10, reachedDca: false, reachedQueen: false, phase: 'flight' }, step: '1', label: 'Build forward speed', instruction: 'Hold W or Arrow Up until airspeed reaches 2.0.', hint: 'Release after a short burst; gliding preserves energy.' },
    { patch: { speed: 2 }, step: '2', label: 'Pass one route marker', instruction: 'Stay below 30 ft and steer through a glowing marker near the meadow.', hint: 'The marker records approach control but does not refill energy.' },
    { patch: { nectarCollected: 1, y: 30 }, step: '3', label: 'Climb into the DCA band', instruction: 'Use Space in short pulses until altitude enters 100–130 ft.', hint: 'This game rewards forward speed during a climb. Real bees generate lift with flapping wings and can hover.' },
    { patch: { y: 115 }, step: '4', label: 'Enter the DCA volume', instruction: 'Approach the gold DCA volume; meet its range and altitude conditions together.', hint: 'Use small turns; large corrections waste energy and overshoot.' },
    { patch: { reachedDca: true, phase: 'congregation' }, step: '5', label: 'Acquire the queen signal', instruction: 'Follow the gold signal and pass within 25 m of the queen.', hint: 'Match altitude first, then make one small heading correction.' },
  ];
  for (const stage of stages) {
    const held = await redraw(page, stage.patch);
    await expect(training(page)).toHaveAttribute('data-training-step', stage.step);
    await expect(training(page)).toHaveAttribute('role', 'status'); await expect(training(page)).toHaveAttribute('aria-live', 'polite');
    await expect(training(page).locator('[data-flight-training-label]')).toHaveText(stage.label);
    await expect(training(page).locator('[data-flight-training-instruction]')).toHaveText(stage.instruction);
    await expect(training(page).locator('[data-flight-training-hint]')).toHaveText(stage.hint);
    await expect(training(page).locator('[data-flight-training-hint]')).toBeVisible();
    expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved);
    if (stage.step === '1') {
      await settle(page);
      await training(page).evaluate(node => {
        const w = window as any; w.__headerTrainingChanges = [];
        w.__headerTrainingObserver = new MutationObserver(records => {
          w.__headerTrainingChanges.push(...records.map(record => ({ type: record.type, attribute: record.attributeName, text: record.target.textContent })));
        });
        w.__headerTrainingObserver.observe(node, { attributes: true, childList: true, characterData: true, subtree: true });
      });
      await page.waitForTimeout(750);
      expect(await page.evaluate(() => (window as any).__headerTrainingChanges)).toEqual([]);
      expect(await flight(page)).toEqual(held);
    } else if (stage.step === '2') {
      await expect.poll(() => page.evaluate(() => (window as any).__headerTrainingChanges.length)).toBeGreaterThan(0);
      await page.evaluate(() => (window as any).__headerTrainingObserver.disconnect());
    }
  }
  const beforeInspection = await redraw(page, { phase: 'flight', reachedDca: false, x: 0, y: 30, z: -180, speed: 2, nectarCollected: 1 });
  await keyboard(page, page.locator('[data-flight-inspection-view="height"]'));
  await expect(field(page)).toHaveAttribute('data-flight-inspection-active', 'true'); await expect(training(page)).toBeHidden();
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Paused'); await expect(pause(page)).toBeVisible();
  expect(await flight(page)).toEqual(beforeInspection); expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);
  await keyboard(page, page.locator('[data-flight-inspection-view="flight"]'));
  await expect(field(page)).toHaveAttribute('data-flight-inspection-active', 'false'); await expect(training(page)).toBeVisible();
  await expect(training(page).locator('[data-flight-training-label]')).toHaveText('Climb into the DCA band');
  expect(await flight(page)).toEqual(beforeInspection); expect(await protectedWork(page)).toEqual(saved);

  // Physics may advance only during the two explicit resume intervals below.
  await keyboard(page, pause(page)); await expect(field(page)).toHaveAttribute('data-flight-state', 'live');
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Flying'); await expect(pause(page)).toHaveAccessibleName('Pause flight');
  await expect.poll(async () => Number((await flight(page)).simulationClock)).toBeGreaterThan(Number(beforeInspection.simulationClock || 0));
  await keyboard(page, pause(page)); await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Paused'); await expect(pause(page)).toHaveAccessibleName('Resume flight');
  await expect(pause(page)).toBeFocused(); await settle(page);
  const afterButton = await flight(page); await page.waitForTimeout(250); expect(await flight(page)).toEqual(afterButton);
  await keyboard(page, field(page), 'p'); await expect(field(page)).toHaveAttribute('data-flight-state', 'live');
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Flying');
  await page.keyboard.press('Escape'); await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Paused'); await settle(page);
  const afterKeyboard = await flight(page); await page.waitForTimeout(250); expect(await flight(page)).toEqual(afterKeyboard);
  expect(await protectedWork(page, true)).toEqual(colony); await sameFlight(page); await geometry(page);
  await redraw(page, { energy: 1 }); await expect(warning(page)).toBeVisible();
  await keyboard(page, header(page).getByRole('button', { name: 'End flight', exact: true }));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await expect(page.locator('[data-flight-command-header]')).toHaveCount(0); await expect(page.locator('[data-flight-energy-warning]')).toHaveCount(0);
  await expect(page.locator('[data-flight-launch="easy"]')).toBeVisible(); expect(await protectedWork(page, true)).toEqual(colony);
  await harness.destroy(page);

  await mount(page, { pacing: 'steps' }); const deliberate = await flight(page), deliberateSaved = await protectedWork(page);
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Pause & plan');
  await expect(pause(page)).toHaveCount(0); await expect(training(page)).toBeHidden();
  await keyboard(page, field(page), 'p'); await page.waitForTimeout(250);
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  expect(await flight(page)).toEqual(deliberate); expect(await protectedWork(page)).toEqual(deliberateSaved); await geometry(page);
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const layout = await geometry(page);
  const result = await header(page).evaluate(async node => {
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      let ancestor: HTMLElement | null = el.parentElement;
      while (ancestor && ancestor !== node) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden' || style.clip === 'rect(0px, 0px, 0px, 0px)') return false;
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
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, id: el.id, className: el.className, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, id: el.id, className: el.className, text: el.textContent }] : []; }),
      text,
    };
  });
  fs.writeFileSync(path.join(artifacts, 'command-header-layout-' + mode + '.json'), JSON.stringify({ layout, ...result }, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.text.length).toBeGreaterThan(8);
  for (const item of result.text) { expect(item.size, item.value).toBeGreaterThanOrEqual(.875); expect(item.ellipsis, item.value).not.toBe('ellipsis'); expect(item.clipped, item.value).toBe(false); }
}
async function capture(page: Page, mode: string) {
  const target = field(page), pad = 6, prefix = 'preview-drone-command-header-' + mode;
  const position = await target.evaluate((node, pad) => {
    const command = node.querySelector('[data-flight-command-header]')!.getBoundingClientRect(), scene = node.querySelector('[data-flight-viewport]')!.getBoundingClientRect();
    return { top: Math.max(0, command.top + window.scrollY - pad), height: scene.bottom - command.top + pad * 2, offsetInField: command.top - node.getBoundingClientRect().top };
  }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull();
    const y = Math.max(0, box!.y + position.offsetInField - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('Drone command header keeps instructions, warnings and controls clear above the scene in responsive display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const held = await redraw(page, { phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
    x: 0, y: 30, z: -180, yaw: 0, pitch: 0, speed: 2, nectarCollected: 1, energy: 25, timer: 68.7 });
  const saved = await protectedWork(page);
  for (const mode of ['wide', 'mobile', 'dark', 'large', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === 'large' ? '24px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
    await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Paused');
    await expect(warning(page)).toBeVisible(); await expect(training(page)).toBeVisible();
    await expect(training(page).locator('[data-flight-training-label]')).toHaveText('Climb into the DCA band');
    await expect(training(page).locator('[data-flight-training-hint]')).toBeVisible();
    await expect(training(page).locator('[data-flight-training-hint]')).toContainText('Real bees generate lift with flapping wings and can hover.');
    await pause(page).focus(); await expect(pause(page)).toBeFocused();
    await settle(page); await audit(page, mode); await capture(page, mode);
    if (mode.startsWith('forced')) {
      expect(await header(page).evaluate(node => {
        const stop = getComputedStyle(node.querySelector('[data-flight-end]')!), play = getComputedStyle(node.querySelector('[data-beehive-flight-pause]')!);
        return stop.color === play.color && stop.backgroundColor === play.backgroundColor && stop.borderTopColor === play.borderTopColor;
      })).toBe(true);
    }
    if (mode === 'mobile' || mode === 'forced-dark') {
      const comfort = page.locator('[data-flight-comfort-details]');
      if (!(await comfort.evaluate((node: HTMLDetailsElement) => node.open))) await keyboard(page, comfort.locator(':scope > summary'));
      await keyboard(page, page.locator('[data-flight-hud-toggle]'));
      await expect(field(page)).toHaveAttribute('data-flight-hud', 'detailed');
      await expect(header(page).locator('[data-flight-renderer-badge]')).toBeVisible();
      await expect(header(page).locator('[data-flight-quality-badge]')).toBeVisible();
      await pause(page).focus(); await settle(page); await audit(page, mode + '-detailed'); await capture(page, mode + '-detailed');
      expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);
      await keyboard(page, page.locator('[data-flight-hud-toggle]')); await expect(field(page)).toHaveAttribute('data-flight-hud', 'clear');
    }
    expect(await flight(page)).toEqual(held); expect(await protectedWork(page)).toEqual(saved); await sameFlight(page);
  }
  expect(errors).toEqual([]);
});
