import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_CONDITIONS_ARTIFACTS || '.codex-artifacts/bee-drone-conditions-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Difficulty = 'easy' | 'normal' | 'hard';
type Rect = { x: number; y: number; width: number; height: number; marker?: boolean };
type Frame = { serial: number; text: { text: string; width: number }[] };
const capacity = { easy: 125, normal: 105, hard: 82 };
const field = (page: Page) => page.locator('#beehive-drone-playfield');
const header = (page: Page) => field(page).locator('[data-flight-command-header]');
const panel = (page: Page) => header(page).locator('[data-flight-conditions]');
const card = (page: Page, kind: string) => panel(page).locator('[data-flight-condition="' + kind + '"]');
const announcement = (page: Page) => header(page).locator('[data-flight-conditions-announcement]');
const pause = (page: Page) => header(page).locator('[data-beehive-flight-pause]');
const basePose = { x: 0, y: 20, z: -180, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: -1, vz: -2,
  speed: .6, phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
  energy: 20, timer: 120, stallWarning: true, trainingActive: false, trainingComplete: false,
  wind: { x: 0, z: 0, phase: 0 }, windNow: { x: 0, z: 0 }, nearestObstacle: null, nearestTraffic: null,
  obstacles: [], birds: [], drones: [], flowers: [], thermals: [], nearQueens: [] };
const titles = { ground: 'Descending near the ground', climb: 'Slow climb', energy: 'Low energy reserve' };

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
    if (fallback) w.StemLab.ensureThree = () => Promise.reject(new Error('Flight condition tests exercise the supported graphics fallback'));
    const after = w.THREE.Scene.prototype.onAfterRender;
    w.THREE.Scene.prototype.onAfterRender = function (renderer: any, scene: any, camera: any) {
      if (renderer.domElement.hasAttribute('data-beehive-drone-webgl')) { w.__conditionsWorld = scene; w.__conditionsCamera = camera; }
      if (typeof after === 'function') return after.call(this, renderer, scene, camera);
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing, scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Saved flight metadata.' } },
      notebook: { drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep my colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, { pacing, fallback });
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(field(page).locator('[data-flight-start-behavior]')).toContainText(pacing === 'steps' ? 'Time moves only when you advance a maneuver' : 'Starts paused for your reduced-motion preference');
  await settle(page); await keyboard(page, page.locator('[data-flight-launch="' + difficulty + '"]'));
  const canvas = page.locator('[data-beehive-drone-canvas]');
  await expect(canvas).toHaveAttribute('data-flight-renderer', fallback ? 'canvas-2d-fallback' : 'three-webgl');
  if (!fallback) await expect(canvas).toHaveAttribute('data-flight-frame-health', 'verified', { timeout: 45000 });
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused'); await expect(header(page)).toBeVisible(); await settle(page);
  await canvas.evaluate((node: HTMLCanvasElement) => {
    const w = window as any, c = node.getContext('2d')!, clear = c.clearRect.bind(c), fill = c.fillText.bind(c);
    w.__conditionsMountedCanvas = node; w.__conditionsMountedState = w.__testHooks.beehive.droneStateRef.current;
    w.__conditionsMountedWorld = w.__conditionsWorld;
    w.__conditionsFrame = { serial: 0, text: [] }; w.__conditionsLiveWarnings = [];
    c.clearRect = function (...args: Parameters<typeof c.clearRect>) {
      w.__conditionsFrame = { serial: w.__conditionsFrame.serial + 1, text: [] }; return clear(...args);
    };
    c.fillText = function (...args: Parameters<typeof c.fillText>) {
      const text = String(args[0]), width = c.measureText(text).width;
      w.__conditionsFrame.text.push({ text, width });
      if (/PULL UP|SLOW CLIMB/.test(text)) {
        const state = w.__testHooks.beehive.droneStateRef.current;
        w.__conditionsLiveWarnings.push(JSON.parse(JSON.stringify({ text, width, canvasWidth: node.clientWidth, canvasHeight: node.clientHeight,
          paused: state.paused, pacing: state.pacing, layout: w.__testHooks.beehive.droneSceneCueLayout })));
      }
      return fill(...args);
    };
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, unknown> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'nectarCollected', 'routeMarkersPassed', 'stallWarning', 'wind', 'windNow', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omitFlight = false) {
  return page.evaluate(omitFlight => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitFlight) delete result.beehive.drone;
    else { delete result.beehive.drone.cameraMode; delete result.beehive.drone.detailedHud; }
    return result;
  }, omitFlight);
}
async function identity(page: Page, webgl = false) {
  expect(await page.evaluate(webgl => {
    const w = window as any;
    return w.__conditionsMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__conditionsMountedState === w.__testHooks.beehive.droneStateRef.current && (!webgl || w.__conditionsMountedWorld === w.__conditionsWorld);
  }, webgl)).toBe(true);
}
async function redraw(page: Page, patch: Record<string, unknown> = {}) {
  await page.evaluate(patch => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, patch), patch);
  const held = await flight(page), before = await page.evaluate(() => (window as any).__conditionsFrame.serial);
  if (held.pacing === 'steps') {
    // Deliberate pacing omits live camera controls. Resize the held scene through
    // the real observer instead of advancing a maneuver just to refresh a reading.
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.width + 1, height: size.height }); await settle(page);
    await page.setViewportSize(size);
  } else {
    await keyboard(page, page.locator('[data-flight-camera-toggle]')); await keyboard(page, page.locator('[data-flight-camera-toggle]'));
  }
  await expect.poll(() => page.evaluate(() => (window as any).__conditionsFrame.serial)).toBeGreaterThan(before);
  await settle(page); expect(await flight(page)).toEqual(held); await identity(page); return held;
}
async function shown(page: Page, expected: string[]) {
  if (expected.length) await expect(panel(page)).toBeVisible(); else await expect(panel(page)).toBeHidden();
  for (const kind of ['ground', 'climb', 'energy']) {
    await expect(card(page, kind)).toHaveCount(1);
    if (expected.includes(kind)) {
      await expect(card(page, kind)).toBeVisible();
      await expect(card(page, kind).locator('[data-condition-title]')).toHaveText(titles[kind as keyof typeof titles]);
      await expect(card(page, kind).locator('[data-condition-evidence]')).not.toBeEmpty();
      await expect(card(page, kind).locator('[data-condition-advice]')).not.toBeEmpty();
    } else await expect(card(page, kind)).toBeHidden();
  }
}
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, canvas = document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
    return JSON.parse(JSON.stringify({ frame: w.__conditionsFrame as Frame, layout: w.__testHooks.beehive.droneSceneCueLayout,
      width: canvas.clientWidth, height: canvas.clientHeight }));
  });
}
async function noSceneWarnings(page: Page) {
  const current = await scene(page);
  expect(current.frame.serial).toBeGreaterThan(0);
  expect(current.frame.text.filter((text: { text: string }) => /PULL UP|SLOW CLIMB/.test(text.text))).toEqual([]);
  // Clear HUD has only physical marker keep-outs after paused warning regions are released.
  expect(current.layout.reserved.filter((rect: Rect) => !rect.marker)).toEqual([]);
}

test('Flight conditions follow raw thresholds and flight phases without changing paused work or repeating numeric announcements', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const saved = await savedWork(page);
  await redraw(page, basePose); await shown(page, ['ground', 'climb', 'energy']);
  await expect(panel(page).locator('[data-flight-conditions-context]')).toHaveText('Paused readings · plan before resuming.');
  await expect(card(page, 'energy')).toHaveAttribute('data-flight-energy-warning', 'true');
  await expect(card(page, 'energy').locator('[data-condition-advice]')).toHaveText('Use short thrust bursts and glide when possible. There is no in-flight refueling.');
  await expect(announcement(page)).toHaveAttribute('aria-live', 'polite'); await expect(announcement(page)).toHaveAttribute('aria-atomic', 'true');
  for (const kind of ['ground', 'climb', 'energy']) await expect(card(page, kind).locator('[data-condition-evidence]')).toHaveAttribute('aria-live', 'off');
  await noSceneWarnings(page);
  const originalAnnouncement = await announcement(page).textContent();
  const beforeEvidence = await panel(page).locator('[data-condition-evidence]').allTextContents();
  await announcement(page).evaluate(node => {
    const w = window as any; w.__conditionAnnouncements = [];
    w.__conditionObserver = new MutationObserver(records => w.__conditionAnnouncements.push(...records.map(record => ({ type: record.type, text: record.target.textContent }))));
    w.__conditionObserver.observe(node, { childList: true, characterData: true, subtree: true });
  });
  const changedNumbers = await redraw(page, { y: 19, vy: -1.3, speed: 1.1, energy: 18 });
  expect(await panel(page).locator('[data-condition-evidence]').allTextContents()).not.toEqual(beforeEvidence);
  await expect(announcement(page)).toHaveText(originalAnnouncement!); await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__conditionAnnouncements)).toEqual([]);
  expect(await flight(page)).toEqual(changedNumbers); expect(await savedWork(page)).toEqual(saved);
  await redraw(page, { y: 30 }); await shown(page, ['climb', 'energy']);
  await expect.poll(() => page.evaluate(() => (window as any).__conditionAnnouncements.length)).toBeGreaterThan(0);
  expect(await announcement(page).textContent()).not.toBe(originalAnnouncement);
  await page.evaluate(() => (window as any).__conditionObserver.disconnect());

  for (const item of [
    { patch: { y: 29.999, vy: -.5 }, expected: ['climb', 'energy'] },
    { patch: { vy: -.5001 }, expected: ['ground', 'climb', 'energy'] },
    { patch: { stallWarning: false }, expected: ['ground', 'energy'] },
    { patch: { energy: 31.25 }, expected: ['ground'] },
    { patch: { energy: 31.249 }, expected: ['ground', 'energy'] },
    { patch: { stallWarning: true, phase: 'launch' }, expected: ['climb', 'energy'] },
    { patch: { phase: 'congregation' }, expected: ['ground', 'climb', 'energy'] },
    { patch: { phase: 'mating' }, expected: [] },
    { patch: { phase: 'flight', y: 50, vy: 0, stallWarning: false, energy: 125 }, expected: [] },
  ]) {
    const held = await redraw(page, item.patch); await shown(page, item.expected); await noSceneWarnings(page);
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  await harness.destroy(page);
  for (const difficulty of ['normal', 'hard'] as Difficulty[]) {
    await mount(page, { difficulty }); const protectedData = await savedWork(page);
    await redraw(page, { ...basePose, y: 50, vy: 0, stallWarning: false, energy: capacity[difficulty] * .25 });
    await shown(page, []);
    const held = await redraw(page, { energy: capacity[difficulty] * .25 - .001 }); await shown(page, ['energy']);
    await expect(page.locator('[data-director-value="energy"]')).toHaveText('25%');
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(protectedData); await harness.destroy(page);
  }
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await header(page).evaluate(async node => {
    const panel = node.querySelector('[data-flight-conditions]')!, scene = document.querySelector('[data-flight-viewport]')!, box = node.getBoundingClientRect();
    const cards = Array.from(panel.querySelectorAll('[data-flight-condition]')).filter(el => !(el as HTMLElement).hidden);
    const rectangles = cards.map(el => { const rect = el.getBoundingClientRect(); return { id: el.getAttribute('data-flight-condition'), x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect(); if (!(el instanceof HTMLElement) || rect.width <= 0 || rect.height <= 0) return false;
      let ancestor: HTMLElement | null = el;
      while (ancestor && ancestor !== node) {
        const css = getComputedStyle(ancestor);
        if (css.display === 'none' || css.visibility === 'hidden' || css.clip === 'rect(0px, 0px, 0px, 0px)') return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
    const text: { value: string; font: number; clipped: boolean; ellipsis: boolean }[] = [];
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT); let value: Node | null;
    while ((value = walker.nextNode())) {
      if (!value.textContent?.trim() || !value.parentElement || !visible.includes(value.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(value);
      const css = getComputedStyle(value.parentElement), parentCard = value.parentElement.closest('[data-flight-condition]'), bound = (parentCard || panel).getBoundingClientRect();
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize), ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(rect => rect.width > 0 && (rect.left < bound.left - 1 || rect.right > bound.right + 1 || rect.top < bound.top - 1 || rect.bottom > bound.bottom + 1)) });
    }
    const actions = Array.from(node.querySelectorAll('.bee-flight-command-actions button')).map(button => {
      const box = button.getBoundingClientRect(), splitWords: string[] = [];
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT); let value: Node | null;
      while ((value = walker.nextNode())) {
        for (const word of (value.textContent || '').matchAll(/[A-Za-z]+/g)) {
          const range = document.createRange(); range.setStart(value, word.index!); range.setEnd(value, word.index! + word[0].length);
          const lines = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
          if (lines.some(rect => Math.abs(rect.top - lines[0].top) > 1)) splitWords.push(word[0]);
        }
      }
      return { text: button.textContent, x: box.x, y: box.y, width: box.width, height: box.height, splitWords };
    });
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { rectangles, text, actions,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      aboveScene: box.bottom <= scene.getBoundingClientRect().top + 1,
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.writeFileSync(path.join(artifacts, 'conditions-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.aboveScene).toBe(true); expect(result.rectangles).toHaveLength(3);
  for (let a = 0; a < result.rectangles.length; a++) for (let b = a + 1; b < result.rectangles.length; b++) {
    const first = result.rectangles[a], second = result.rectangles[b];
    expect(first.x + first.width <= second.x + 1 || second.x + second.width <= first.x + 1 || first.y + first.height <= second.y + 1 || second.y + second.height <= first.y + 1).toBe(true);
  }
  const [first, second, third] = result.rectangles;
  if (mode === 'wide') { expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1); expect(Math.abs(first.y - third.y)).toBeLessThanOrEqual(1); }
  else if (mode === 'medium') {
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
    expect(Math.max(first.y + first.height, second.y + second.height)).toBeLessThanOrEqual(third.y + 1);
    expect(Math.abs(first.x - third.x)).toBeLessThanOrEqual(1);
  }
  else { expect(first.y + first.height).toBeLessThanOrEqual(second.y + 1); expect(second.y + second.height).toBeLessThanOrEqual(third.y + 1); }
  if (mode === '200-percent-text') {
    expect(result.actions).toHaveLength(2);
    const [end, resume] = result.actions;
    expect(end.y + end.height).toBeLessThanOrEqual(resume.y + 1);
    expect(Math.abs(end.x - resume.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(end.width - resume.width)).toBeLessThanOrEqual(1);
    for (const button of result.actions) expect(button.splitWords, button.text || '').toEqual([]);
  }
  expect(result.text.length).toBeGreaterThanOrEqual(10);
  for (const text of result.text) { expect(text.font, text.value).toBeGreaterThanOrEqual(.875); expect(text.clipped, text.value).toBe(false); expect(text.ellipsis, text.value).toBe(false); }
}
async function capture(page: Page, name: string) {
  const target = field(page), pad = 6, prefix = 'preview-drone-conditions-' + name;
  const position = await target.evaluate((node, pad) => {
    const command = node.querySelector('[data-flight-command-header]')!.getBoundingClientRect(), scene = node.querySelector('[data-flight-viewport]')!.getBoundingClientRect();
    return { top: Math.max(0, command.top + window.scrollY - pad), height: scene.bottom - command.top + pad * 2, offsetInField: command.top - node.getBoundingClientRect().top };
  }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(20); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull();
    const y = Math.max(0, box!.y + position.offsetInField - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('Flight conditions keep evidence and advice readable on phones, at 200 percent text, in dark mode and forced colors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const held = await redraw(page, basePose), saved = await savedWork(page);
  for (const mode of ['wide', 'medium', 'phone', 'dark', '200-percent-text', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await shown(page, ['ground', 'climb', 'energy']); await pause(page).focus(); await expect(pause(page)).toBeFocused();
    await settle(page); await audit(page, mode); await capture(page, mode); await noSceneWarnings(page);
    await header(page).locator('[data-flight-end]').focus(); await page.keyboard.press('Tab'); await expect(pause(page)).toBeFocused();
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});

test('Live warning cues retain their protected space while pause and deliberate pacing leave the scene clear and preserve 3D geometry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, { fallback: false });
  const held = await redraw(page, basePose), saved = await savedWork(page), colony = await savedWork(page, true);
  const geometry = () => page.evaluate(() => {
    const w = window as any, scene = w.__conditionsWorld, volume = scene.getObjectByName('drone-dca-entry-volume'), center = new w.THREE.Vector3(); volume.getWorldPosition(center);
    return { dca: { position: center.toArray(), radius: volume.geometry.parameters.radiusTop, height: volume.geometry.parameters.height },
      guides: [1, 2, 3].map(index => { const guide = scene.getObjectByName('drone-approach-guide-' + index); return { position: guide.position.toArray(), scale: guide.scale.toArray() }; }) };
  });
  const worldBefore = await geometry(); expect(worldBefore.dca).toEqual({ position: [0, 115, -600], radius: 72, height: 30 });
  expect(worldBefore.guides.map(item => item.position)).toEqual([[0, 100, -140], [0, 100, -300], [0, 100, -460]]);
  await shown(page, ['ground', 'climb', 'energy']); await noSceneWarnings(page); await capture(page, 'webgl-paused');
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page, true);

  // Resume is the only interval in this workflow that permits continuous physics to advance.
  await keyboard(page, pause(page)); await expect(field(page)).toHaveAttribute('data-flight-state', 'live');
  await page.evaluate(() => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, { y: 20, vy: -1, speed: 2, pitch: 0 }));
  await expect.poll(() => page.evaluate(() => (window as any).__conditionsLiveWarnings.some((item: { text: string }) => item.text.includes('PULL UP')))).toBe(true);
  await expect(panel(page).locator('[data-flight-conditions-context]')).toHaveText('Live readings · pause to plan a correction.');
  await expect(announcement(page)).toContainText('Live readings · pause to plan a correction.');
  await field(page).focus(); await page.keyboard.down('Space');
  await page.evaluate(() => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, { y: 80, vy: 0, speed: .1, controlPitch: .8 }));
  await expect.poll(() => page.evaluate(() => (window as any).__conditionsLiveWarnings.some((item: { text: string }) => item.text.includes('SLOW CLIMB')))).toBe(true);
  await page.keyboard.up('Space'); await keyboard(page, pause(page)); await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await settle(page);
  const liveWarnings = await page.evaluate(() => (window as any).__conditionsLiveWarnings);
  for (const name of ['PULL UP', 'SLOW CLIMB']) {
    const warning = liveWarnings.find((item: { text: string }) => item.text.includes(name)); expect(warning).toBeTruthy();
    expect(warning.paused).toBe(false); expect(warning.pacing).toBe('live');
    const expected = name === 'PULL UP' ? { x: warning.canvasWidth / 2 - (warning.width + 8) / 2, y: warning.canvasHeight / 2 - 48, width: warning.width + 8, height: 24 }
      : { x: warning.canvasWidth / 2 - 113, y: warning.canvasHeight / 2 + 33, width: 226, height: 30 };
    expect(warning.layout.reserved).toContainEqual(expected);
    for (const label of warning.layout.labels.filter((item: { hidden: boolean }) => !item.hidden)) {
      expect(label.x + label.width + 5 <= expected.x + .05 || expected.x + expected.width + 5 <= label.x + .05 || label.y + label.height + 5 <= expected.y + .05 || expected.y + expected.height + 5 <= label.y + .05).toBe(true);
    }
  }
  const pausedAgain = await redraw(page, basePose); await shown(page, ['ground', 'climb', 'energy']); await noSceneWarnings(page);
  await expect(panel(page).locator('[data-flight-conditions-context]')).toHaveText('Paused readings · plan before resuming.');
  await expect(announcement(page)).toContainText('Paused readings · plan before resuming.');
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(pausedAgain);
  // Explicit resume/pause transitions may rebuild the renderer's world. Its geometry,
  // the mounted canvas, and the persistent flight state must still be preserved.
  expect(await geometry()).toEqual(worldBefore); expect(await savedWork(page, true)).toEqual(colony); await identity(page);
  fs.writeFileSync(path.join(artifacts, 'conditions-live-warning-evidence.json'), JSON.stringify(liveWarnings.filter((item: { text: string }, index: number, items: { text: string }[]) => items.findIndex(other => other.text === item.text) === index), null, 2));
  await harness.destroy(page);

  await mount(page, { pacing: 'steps' }); const stepsHeld = await redraw(page, basePose), stepsSaved = await savedWork(page);
  await expect(pause(page)).toHaveCount(0); await shown(page, ['ground', 'climb', 'energy']); await noSceneWarnings(page);
  await expect(panel(page).locator('[data-flight-conditions-context]')).toHaveText('Pause & plan · readings update after a maneuver.');
  await expect(announcement(page)).toContainText('Pause & plan · readings update after a maneuver.');
  await keyboard(page, field(page), 'p'); await page.waitForTimeout(250);
  expect(await flight(page)).toEqual(stepsHeld); expect(await savedWork(page)).toEqual(stepsSaved); await identity(page); await capture(page, 'pause-and-plan');
  // Completion intentionally records the current readings in a saved run. Exercise
  // the real finish action; a flight with no maneuvers has no sampled telemetry.
  const stepsColony = await savedWork(page, true);
  await keyboard(page, page.locator('[data-flight-decision-panel]').getByRole('button', { name: 'Record flight and debrief', exact: true }));
  await expect(page.locator('[data-flight-main-debrief]')).toBeFocused();
  await expect(header(page).locator('[data-flight-command-status]')).toHaveText('Flight complete');
  await shown(page, []); await expect(announcement(page)).toBeEmpty(); await noSceneWarnings(page);
  const recorded = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.drone.lastRun)));
  expect(recorded).toMatchObject({ pacing: 'steps', courseSeed: 20260908, difficulty: 'easy', energyLeft: 16 });
  expect(await page.evaluate(() => (window as any).__toolData.beehive.drone.bestDifficulty)).toBeUndefined();
  expect(recorded.decisionLog).toEqual(stepsHeld.decisionLog); expect(recorded.telemetry).toEqual(stepsHeld.telemetry);
  expect(await savedWork(page, true)).toEqual(stepsColony);
  await keyboard(page, header(page).getByRole('button', { name: 'End flight', exact: true }));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await expect(page.locator('[data-flight-conditions]')).toHaveCount(0); await expect(page.locator('[data-flight-conditions-announcement]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.drone.lastRun)).toEqual(recorded);
  expect(await savedWork(page, true)).toEqual(stepsColony);
  expect(errors).toEqual([]);
});
