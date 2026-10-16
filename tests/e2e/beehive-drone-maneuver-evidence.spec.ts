import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_MANEUVER_ARTIFACTS || '.codex-artifacts/bee-drone-maneuver-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const field = (page: Page) => page.locator('#beehive-drone-playfield');
const decision = (page: Page) => page.locator('[data-flight-decision-panel]');
const evidence = (page: Page) => page.locator('[data-flight-maneuver-evidence]:visible');
const advance = (page: Page) => page.locator('[data-flight-advance-decision]');
const metric = (page: Page, key: string) => evidence(page).locator('[data-maneuver-metric="' + key + '"]');
type Entry = { turn?: number; action?: string; seconds?: number; altitudeBefore?: number; altitude?: number;
  energyBefore?: number; energy?: number; rangeBefore?: number; range?: number; targetBefore?: string; target?: string; [key: string]: unknown };

async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function mount(page: Page, savedRun: Record<string, unknown> | null = null) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(savedRun => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Maneuver evidence tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Saved flight metadata.' }, ...(savedRun ? { lastRun: savedRun } : {}) },
      notebook: { drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep my colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, savedRun);
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-reduced-motion', 'true');
  if (savedRun) return;
  await expect(field(page).locator('[data-flight-start-behavior]')).toContainText('Time moves only when you advance a maneuver');
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused'); await expect(decision(page)).toBeVisible(); await settle(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__maneuverMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__maneuverMountedState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omitFlight = false) {
  return page.evaluate(omitFlight => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitFlight) delete result.beehive.drone;
    return result;
  }, omitFlight);
}
async function identity(page: Page) {
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__maneuverMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__maneuverMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function choose(page: Page, id: string) {
  await keyboard(page, page.locator('input[name="bee-flight-decision"][value="' + id + '"]'), 'Space');
}
async function advanceChoice(page: Page, id: string) {
  const before = await flight(page); await choose(page, id); expect(await flight(page)).toEqual(before);
  await keyboard(page, advance(page)); await expect(advance(page)).toBeFocused(); await settle(page);
  const after = await flight(page);
  expect(after.decisionCount).toBe((before.decisionCount || 0) + 1);
  expect(after.simulationClock).toBeGreaterThan(before.simulationClock || 0);
  expect(after.paused).toBe(true);
  return { before, after, entry: after.decisionLog.at(-1) as Entry };
}
async function contents(page: Page) {
  return evidence(page).evaluate(node => ({ heading: node.querySelector('h3,h4,h5')?.textContent,
    title: node.querySelector('[data-maneuver-title]')?.textContent, context: node.querySelector('[data-maneuver-context]')?.textContent,
    metrics: Array.from(node.querySelectorAll('[data-maneuver-metric]')).map(card => ({ id: card.getAttribute('data-maneuver-metric'),
      before: card.querySelector('[data-maneuver-before]')?.textContent, after: card.querySelector('[data-maneuver-after]')?.textContent,
      change: card.querySelector('[data-maneuver-change]')?.textContent, trend: card.getAttribute('data-maneuver-trend') })),
    note: node.querySelector('[data-maneuver-range-note]')?.textContent }));
}
async function assertMeasurements(page: Page, entry: Entry) {
  await expect(evidence(page)).toHaveCount(1); await expect(evidence(page)).toHaveAttribute('role', 'region');
  await expect(evidence(page)).toHaveAttribute('aria-label', 'Last maneuver comparison');
  await expect(evidence(page)).toHaveAttribute('aria-live', 'off');
  await expect(evidence(page)).toContainText(entry.action!);
  await expect(evidence(page)).toContainText('Maneuver ' + entry.turn);
  for (const [key, before, after, unit] of [
    ['altitude', entry.altitudeBefore, entry.altitude, ' model ft'], ['energy', entry.energyBefore, entry.energy, '%'],
    ['range', entry.rangeBefore, entry.range, ' model m'],
  ] as const) {
    await expect(metric(page, key)).toBeVisible();
    await expect(metric(page, key).locator('[data-maneuver-before]')).toHaveText(before + unit + (key === 'range' ? ' to ' + entry.targetBefore : ''));
    await expect(metric(page, key).locator('[data-maneuver-after]')).toHaveText(after + unit + (key === 'range' ? ' to ' + entry.target : ''));
    await expect(metric(page, key)).toContainText(unit);
    if (key === 'range' && entry.targetBefore !== entry.target) {
      await expect(metric(page, key)).toHaveAttribute('data-maneuver-trend', 'unknown');
      continue;
    }
    const change = after! - before!;
    await expect(metric(page, key)).toHaveAttribute('data-maneuver-trend', change > 0 ? 'up' : change < 0 ? 'down' : 'same');
    const amount = Math.abs(change);
    const expectedChange = change === 0 ? 'No rounded change' : key === 'energy'
      ? amount + ' percentage point' + (amount === 1 ? '' : 's') + (change > 0 ? ' higher' : ' lower')
      : amount + unit + (key === 'range' ? (change > 0 ? ' farther' : ' closer') : (change > 0 ? ' higher' : ' lower'));
    await expect(metric(page, key).locator('[data-maneuver-change]')).toHaveText(expectedChange);
  }
}

test('Last maneuver cards show actual before and after readings, explain target changes, and survive completion and saved review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const colony = await savedWork(page, true);
  await expect(evidence(page)).toHaveCount(0);
  await expect(decision(page).locator('[data-flight-decision-feedback]')).toContainText('Predict');
  const climb = await advanceChoice(page, 'climb');
  expect(climb.entry).toMatchObject({ turn: 1, action: 'Powered climb', seconds: 1,
    altitudeBefore: Math.round(climb.before.y), altitude: Math.round(climb.after.y),
    energyBefore: Math.round(climb.before.energy / 125 * 100), energy: Math.round(climb.after.energy / 125 * 100),
    rangeBefore: Math.round(Math.hypot(climb.before.x, climb.before.z + 600)),
    range: Math.round(Math.hypot(climb.after.x, climb.after.z + 600)), targetBefore: 'DCA', target: 'DCA' });
  await assertMeasurements(page, climb.entry);
  await expect(evidence(page).locator('[data-maneuver-context]')).toHaveText('1 model second recorded · Readings rounded to whole units.');
  const first = await contents(page), held = await flight(page);
  expect(await evidence(page).evaluate(node => node.getBoundingClientRect().bottom <= document.querySelector('[data-flight-decision-panel] .bfd-map')!.getBoundingClientRect().top + 1)).toBe(true);
  await choose(page, 'coast'); await choose(page, 'navigate');
  const camera = decision(page).getByRole('button', { name: 'Chase camera', exact: true });
  await keyboard(page, camera); await keyboard(page, camera); await page.waitForTimeout(250);
  expect(await flight(page)).toEqual(held); expect(await contents(page)).toEqual(first);
  expect(await savedWork(page, true)).toEqual(colony); await identity(page);

  // Hold a valid pose immediately outside the real DCA acceptance volume. The
  // next ordinary navigation maneuver must cross the gate through model physics.
  await page.evaluate(() => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, {
    x: 0, y: 115, z: -527, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: -1,
    speed: 1, phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
    energy: 100, timer: 120, wind: { x: 0, z: 0, phase: 0 }, windNow: { x: 0, z: 0 },
    obstacles: [], birds: [], drones: [], flowers: [], thermals: [], nearestObstacle: null, nearestTraffic: null,
    nearQueens: [{ x: 90, y: 115, z: -800, caught: false }],
  }));
  const crossing = await advanceChoice(page, 'navigate');
  expect(crossing.before.reachedDca).toBe(false); expect(crossing.after.reachedDca).toBe(true);
  expect(crossing.entry).toMatchObject({ turn: 2, action: 'Follow navigation cue', targetBefore: 'DCA', target: 'Queen cue', rangeBefore: 73 });
  await assertMeasurements(page, crossing.entry);
  await expect(metric(page, 'range').locator('[data-maneuver-change]')).toContainText(/target|compar/i);
  await expect(evidence(page).locator('[data-maneuver-range-note]')).toBeVisible();
  await expect(evidence(page).locator('[data-maneuver-range-note]')).toContainText('DCA');
  await expect(evidence(page).locator('[data-maneuver-range-note]')).toContainText('Queen cue');
  const crossed = await contents(page), frozen = await flight(page); await page.waitForTimeout(250);
  expect(await flight(page)).toEqual(frozen); expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'maneuver-actual-flight-evidence.json'), JSON.stringify({ climb, crossing, cards: crossed }, null, 2));

  await keyboard(page, decision(page).getByRole('button', { name: 'Record flight and debrief', exact: true }));
  await expect(page.locator('[data-flight-decision-debrief]')).toBeFocused();
  await expect(page.locator('[data-flight-decision-debrief]').locator('[data-flight-maneuver-evidence]')).toBeVisible();
  await assertMeasurements(page, crossing.entry); expect(await contents(page)).toEqual(crossed);
  const recorded = (await savedWork(page)).beehive.drone.lastRun;
  expect(recorded.decisionLog).toEqual(crossing.after.decisionLog);
  expect(await savedWork(page, true)).toEqual(colony);
  await keyboard(page, field(page).locator('[data-flight-command-header]').getByRole('button', { name: 'End flight', exact: true }));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await expect(page.locator('[data-drone-saved-review-panel]').locator('[data-flight-maneuver-evidence]')).toBeVisible();
  await assertMeasurements(page, crossing.entry); expect(await contents(page)).toEqual(crossed);
  expect((await savedWork(page)).beehive.drone.lastRun).toEqual(recorded);
  expect((await savedWork(page)).beehive.drone.custom).toEqual({ retained: 'Saved flight metadata.' });
  expect(await savedWork(page, true)).toEqual(colony); expect(errors).toEqual([]);
});

test('Legacy saved maneuvers keep missing target identities and readings explicit without rewriting recorded evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const legacy = { pacing: 'steps', courseSeed: 20260908, difficulty: 'easy', scenario: 'clear', success: false,
    energyLeft: 80, score: 25, maxAlt: 110, distance: 200, custom: { retained: 'Run metadata.' },
    decisionLog: [{ turn: 1, action: 'Powered climb', seconds: 1, altitudeBefore: 10, altitude: 19, energyBefore: 100,
      energy: 99, rangeBefore: 600, range: 580, target: 'DCA', custom: { retained: 'Earlier entry metadata.' } },
    { turn: 2, action: 'Follow navigation cue', seconds: 2, altitude: 110, energyBefore: 85, energy: 80,
      rangeBefore: 73, range: 200, target: 'Queen cue', custom: { retained: 'Latest entry metadata.' } }], telemetry: [] };
  await mount(page, legacy); const before = await savedWork(page);
  expect(before.beehive.drone.lastRun).toEqual(legacy);
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await expect(evidence(page)).toHaveCount(1);
  await expect(evidence(page)).toContainText('Follow navigation cue');
  await expect(metric(page, 'altitude').locator('[data-maneuver-before]')).toContainText(/not recorded/i);
  await expect(metric(page, 'altitude').locator('[data-maneuver-after]')).toContainText('110');
  await expect(metric(page, 'altitude').locator('[data-maneuver-change]')).toContainText(/not recorded|unavailable|cannot compare/i);
  await expect(metric(page, 'altitude')).toHaveAttribute('data-maneuver-trend', 'unknown');
  await expect(metric(page, 'range').locator('[data-maneuver-before]')).toContainText('73');
  await expect(metric(page, 'range').locator('[data-maneuver-after]')).toContainText('200');
  await expect(metric(page, 'range').locator('[data-maneuver-change]')).not.toContainText('127');
  await expect(metric(page, 'range')).toHaveAttribute('data-maneuver-trend', 'unknown');
  await expect(evidence(page).locator('[data-maneuver-range-note]')).toContainText(/not recorded|unknown/i);
  await expect(page.locator('[data-drone-saved-review-panel] table tbody tr')).toHaveCount(2);
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]')); await settle(page);
  expect(await savedWork(page)).toEqual(before);
  expect((await savedWork(page)).beehive.drone.lastRun.decisionLog[1]).not.toHaveProperty('targetBefore');
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await evidence(page).evaluate(async node => {
    const box = node.getBoundingClientRect(), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cards = Array.from(node.querySelectorAll('[data-maneuver-metric]'));
    const rectangles = cards.map(el => { const rect = el.getBoundingClientRect(); return { id: el.getAttribute('data-maneuver-metric'), x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
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
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let value: Node | null;
    while ((value = walker.nextNode())) {
      if (!value.textContent?.trim() || !value.parentElement || !visible.includes(value.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(value);
      const css = getComputedStyle(value.parentElement), parentCard = value.parentElement.closest('[data-maneuver-metric]'), bound = (parentCard || node).getBoundingClientRect();
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(rect => rect.width > 0 && (rect.left < bound.left - 1 || rect.right > bound.right + 1 || rect.top < bound.top - 1 || rect.bottom > bound.bottom + 1)) });
    }
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { rectangles, text, rootFont,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.writeFileSync(path.join(artifacts, 'maneuver-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.rectangles).toHaveLength(3);
  for (let a = 0; a < result.rectangles.length; a++) for (let b = a + 1; b < result.rectangles.length; b++) {
    const first = result.rectangles[a], second = result.rectangles[b];
    expect(first.x + first.width <= second.x + 1 || second.x + second.width <= first.x + 1 || first.y + first.height <= second.y + 1 || second.y + second.height <= first.y + 1).toBe(true);
  }
  expect(result.text.length).toBeGreaterThanOrEqual(12);
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
  for (const text of result.text) { expect(text.font, text.value).toBeGreaterThanOrEqual(.875); expect(text.clipped, text.value).toBe(false); expect(text.ellipsis, text.value).toBe(false); }
}

test('Maneuver comparisons stay readable and frozen on phones, at 200 percent text, in dark mode and forced colors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const climb = await advanceChoice(page, 'climb'); await assertMeasurements(page, climb.entry);
  const held = await flight(page), saved = await savedWork(page), initial = await contents(page);
  for (const mode of ['wide', 'medium', 'phone', 'dark', '200-percent-text', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await advance(page).focus(); await expect(advance(page)).toBeFocused(); await settle(page);
    await audit(page, mode); await assertMeasurements(page, climb.entry);
    expect(await contents(page)).toEqual(initial);
    await evidence(page).screenshot({ path: path.join(artifacts, 'preview-drone-maneuver-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    await advance(page).focus(); await page.keyboard.press('Tab');
    await expect(decision(page).getByRole('button', { name: 'Chase camera', exact: true })).toBeFocused();
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
