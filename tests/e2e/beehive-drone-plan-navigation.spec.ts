import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_PLAN_ARTIFACTS || '.codex-artifacts/bee-drone-plan-navigation-2026-10-15');
const actions = [
  { id: 'navigate', label: 'Follow navigation cue', seconds: 2 },
  { id: 'forward', label: 'Powered forward', seconds: 1 },
  { id: 'climb', label: 'Powered climb', seconds: 1 },
  { id: 'coast', label: 'Ease thrust', seconds: 1 },
  { id: 'left', label: 'Turn left', seconds: 0.2 },
  { id: 'right', label: 'Turn right', seconds: 0.2 },
  { id: 'descend', label: 'Descend', seconds: 0.5 },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const field = (page: Page) => page.locator('#beehive-drone-playfield');
const panel = (page: Page) => page.locator('[data-flight-decision-panel]');
const navigation = (page: Page) => panel(page).locator('[data-flight-plan-navigation]');
const jump = (page: Page, destination: string) => navigation(page).locator('[data-flight-plan-jump="' + destination + '"]');
const route = (page: Page) => panel(page).locator('figure[data-flight-plan-route]');
const comparison = (page: Page) => panel(page).locator('[data-flight-maneuver-evidence]');
const ready = (page: Page) => panel(page).locator('[data-flight-maneuver-ready]');
const selected = (page: Page) => panel(page).locator('input[name="bee-flight-decision"]:checked');
const advance = (page: Page) => panel(page).locator('[data-flight-advance-decision]');
const review = (page: Page) => panel(page).locator('[data-flight-plan-review]');
const next = (page: Page) => comparison(page).locator('[data-flight-plan-next]');

async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); await settle(page);
}
async function mount(page: Page, checkSavedReview = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Plan navigation tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Flight metadata.' },
        lastRun: { pacing: 'steps', difficulty: 'easy', success: false, score: 12,
          decisionLog: [{ turn: 1, action: 'Turn right', seconds: 0.2 }], custom: { retained: 'Previous run.' } } },
      notebook: { drone: { prediction: 'Keep my prediction.', evidence: 'Keep my evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  if (checkSavedReview) {
    const saved = await savedWork(page), toggle = page.locator('[data-drone-saved-review-toggle]');
    await keyboard(page, toggle);
    const savedPanel = page.locator('[data-drone-saved-review-panel]'), savedComparison = savedPanel.locator('[data-flight-maneuver-evidence]');
    await expect(savedComparison).toBeVisible();
    expect(await savedComparison.getAttribute('tabindex')).toBeNull();
    await expect(savedPanel.locator('[data-flight-plan-navigation], [data-flight-plan-next], [data-flight-plan-review], [data-flight-maneuver-ready]')).toHaveCount(0);
    expect(await savedWork(page)).toEqual(saved);
    await keyboard(page, toggle);
  }
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await expect(panel(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.__planMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__planMountedState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'decisionFeedback',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omitSelection = false) {
  return page.evaluate(omitSelection => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitSelection) delete result.beehive.drone.decision;
    return result;
  }, omitSelection);
}
async function identity(page: Page) {
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__planMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__planMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function focusedInView(target: Locator) {
  await expect(target).toBeFocused();
  const box = await target.evaluate(node => {
    const r = node.getBoundingClientRect(), css = getComputedStyle(node);
    const heading = node.querySelector('h3,h4,h5')?.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, headingTop: heading?.top, headingBottom: heading?.bottom,
      width: innerWidth, viewportHeight: innerHeight, outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth),
      shadow: css.boxShadow, focusVisible: node.matches(':focus-visible') };
  });
  expect(box.left).toBeGreaterThanOrEqual(-1); expect(box.right).toBeLessThanOrEqual(box.width + 1);
  expect(box.top).toBeGreaterThanOrEqual(-1); expect(box.top).toBeLessThan(box.viewportHeight);
  if (box.height <= box.viewportHeight) expect(box.bottom).toBeLessThanOrEqual(box.viewportHeight + 1);
  if (box.headingTop !== undefined) { expect(box.headingTop).toBeGreaterThanOrEqual(-1); expect(box.headingBottom!).toBeLessThanOrEqual(box.viewportHeight + 1); }
  expect(box.focusVisible).toBe(true);
  expect((box.outline !== 'none' && box.outlineWidth > 0) || box.shadow !== 'none').toBe(true);
}
async function choose(page: Page, id: string) {
  const radio = panel(page).locator('input[name="bee-flight-decision"][value="' + id + '"]');
  await keyboard(page, radio, 'Space'); await expect(radio).toBeChecked();
}
async function assertReady(page: Page, action: typeof actions[number]) {
  await expect(ready(page).locator('[data-flight-selected-maneuver]')).toHaveText(action.label);
  await expect(ready(page)).toContainText('Advance up to ' + action.seconds + ' model second' + (action.seconds === 1 ? '' : 's') + ', then pause to compare.');
  await expect(ready(page)).toContainText(/predict/i);
  await expect(advance(page)).toHaveAccessibleName('Advance maneuver · ' + action.seconds + ' s');
}
async function passiveRoundTrip(page: Page) {
  const held = await flight(page), saved = await savedWork(page);
  await keyboard(page, jump(page, 'route')); await focusedInView(route(page));
  await keyboard(page, jump(page, 'choose')); await focusedInView(selected(page));
  await keyboard(page, jump(page, 'compare')); await focusedInView(comparison(page));
  await keyboard(page, next(page)); await focusedInView(selected(page));
  await keyboard(page, review(page)); await focusedInView(comparison(page));
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
}

test('Flight plan keyboard shortcuts connect route, chosen maneuver, and real before-and-after evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true);
  await expect(navigation(page)).toHaveAttribute('aria-label', 'Flight plan navigation');
  await expect(jump(page, 'compare')).toBeDisabled();
  await expect(comparison(page)).toHaveCount(0); await expect(review(page)).toHaveCount(0);
  await expect(route(page)).toHaveAttribute('tabindex', '-1');
  await expect(route(page)).toHaveAttribute('aria-label', 'Top-down flight route');
  const starting = await flight(page), original = await savedWork(page);
  await keyboard(page, jump(page, 'route')); await focusedInView(route(page));
  await keyboard(page, jump(page, 'choose')); await focusedInView(selected(page));
  expect(await flight(page)).toEqual(starting); expect(await savedWork(page)).toEqual(original);
  await choose(page, 'climb'); await assertReady(page, actions[2]);
  expect(await flight(page)).toEqual(starting);
  const selectedSave = await savedWork(page);
  const unchanged = JSON.parse(JSON.stringify(original)); unchanged.beehive.drone.decision = 'climb';
  expect(selectedSave).toEqual(unchanged);

  await keyboard(page, advance(page)); await expect(advance(page)).toBeFocused();
  const climbed = await flight(page), entry = climbed.decisionLog.at(-1);
  expect(climbed.decisionCount).toBe(1); expect(climbed.simulationClock - (starting.simulationClock || 0)).toBeCloseTo(1, 8);
  expect(entry).toMatchObject({ turn: 1, action: 'Powered climb', seconds: 1,
    altitudeBefore: Math.round(starting.y), altitude: Math.round(climbed.y) });
  expect(climbed.paused).toBe(true); expect(climbed.y).toBeGreaterThan(starting.y);
  await expect(jump(page, 'compare')).toBeEnabled();
  await expect(review(page)).toHaveAccessibleName('Review last maneuver');
  await keyboard(page, review(page)); await focusedInView(comparison(page));
  await expect(comparison(page)).toHaveAttribute('tabindex', '-1');
  await expect(comparison(page)).toHaveAttribute('aria-live', 'off');
  await expect(comparison(page)).toContainText('Maneuver 1 · Powered climb');
  await expect(next(page)).toHaveAccessibleName('Choose next maneuver');
  await keyboard(page, next(page)); await focusedInView(selected(page));
  await choose(page, 'left'); await assertReady(page, actions[4]);
  expect(await flight(page)).toEqual(climbed);
  await passiveRoundTrip(page);
  const after = await savedWork(page);
  expect(after.beehive.drone.lastRun).toEqual(original.beehive.drone.lastRun);
  expect(after.beehive.notebook).toEqual(original.beehive.notebook);
  const originalColony = JSON.parse(JSON.stringify(original)), afterColony = JSON.parse(JSON.stringify(after));
  delete originalColony.beehive.drone; delete afterColony.beehive.drone;
  expect(afterColony).toEqual(originalColony);
  fs.writeFileSync(path.join(artifacts, 'plan-navigation-keyboard.json'), JSON.stringify({ starting, climbed, entry, selected: 'left' }, null, 2));
  expect(errors).toEqual([]);
});

test('Every selected duration stays accurate while plan navigation preserves paused physics and a real short turn', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await choose(page, 'climb'); await keyboard(page, advance(page));
  const held = await flight(page), saved = await savedWork(page, true), cards = await comparison(page).innerText();
  for (const action of actions) {
    await choose(page, action.id); await assertReady(page, action);
    expect((await savedWork(page)).beehive.drone.decision).toBe(action.id);
    expect(await savedWork(page, true)).toEqual(saved); expect(await flight(page)).toEqual(held);
    await passiveRoundTrip(page);
    expect(await comparison(page).innerText()).toBe(cards);
  }
  await choose(page, 'right'); await keyboard(page, advance(page)); await expect(advance(page)).toBeFocused();
  const turned = await flight(page), entry = turned.decisionLog.at(-1);
  expect(turned.decisionCount).toBe(held.decisionCount + 1);
  expect(turned.simulationClock - held.simulationClock).toBeCloseTo(0.2, 8);
  expect(entry).toMatchObject({ turn: 2, action: 'Turn right', seconds: 0.2 });
  expect(turned.yaw).not.toBe(held.yaw); expect(turned.paused).toBe(true);
  await expect(comparison(page).locator('[data-maneuver-context]')).toContainText('0.2 model seconds recorded');
  await assertReady(page, actions[5]); await passiveRoundTrip(page);
  fs.writeFileSync(path.join(artifacts, 'plan-navigation-durations.json'), JSON.stringify({ actions, before: held, after: turned, entry }, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await panel(page).evaluate(async node => {
    const roots = Array.from(node.querySelectorAll('[data-flight-plan-navigation], [data-flight-maneuver-ready], [data-flight-maneuver-evidence]')) as HTMLElement[];
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const text: { value: string; font: number; clipped: boolean; ellipsis: boolean }[] = [];
    const overflow: { text: string | null; extra: number }[] = [], outside: (string | null)[] = [];
    const rectangles = roots.map(root => {
      const box = root.getBoundingClientRect();
      const visible = [root, ...Array.from(root.querySelectorAll('*'))].filter(el => {
        if (!(el instanceof HTMLElement)) return false;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
        let ancestor: HTMLElement | null = el;
        while (ancestor && ancestor !== root.parentElement) {
          const css = getComputedStyle(ancestor);
          if (css.display === 'none' || css.visibility === 'hidden' || css.clip === 'rect(0px, 0px, 0px, 0px)') return false;
          ancestor = ancestor.parentElement;
        }
        return true;
      });
      for (const el of visible) {
        if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) overflow.push({ text: el.textContent, extra: el.scrollWidth - el.clientWidth });
        const r = el.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) outside.push(el.textContent);
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let value: Node | null;
      while ((value = walker.nextNode())) {
        if (!value.textContent?.trim() || !value.parentElement || !visible.includes(value.parentElement)) continue;
        const range = document.createRange(); range.selectNodeContents(value);
        const css = getComputedStyle(value.parentElement);
        text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
          clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)) });
      }
      return { kind: root.hasAttribute('data-flight-plan-navigation') ? 'navigation' : root.hasAttribute('data-flight-maneuver-ready') ? 'ready' : 'comparison',
        x: box.x, y: box.y, width: box.width, height: box.height };
    });
    const targets = Array.from(node.querySelectorAll('[data-flight-plan-jump], [data-flight-plan-next], [data-flight-plan-review]')).map(el => {
      const r = el.getBoundingClientRect(); return { label: el.textContent, width: r.width, height: r.height };
    });
    const axe = await (window as any).axe.run({ include: [
      '[data-flight-decision-panel] [data-flight-plan-navigation]', '[data-flight-decision-panel] [data-flight-maneuver-ready]',
      '[data-flight-decision-panel] [data-flight-maneuver-evidence]', '[data-flight-decision-panel] [data-flight-plan-review]',
    ] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { rectangles, text, targets, rootFont, overflow, outside,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'plan-navigation-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.rectangles).toHaveLength(3); expect(result.targets).toHaveLength(5);
  for (const target of result.targets) { expect(target.width, target.label || '').toBeGreaterThanOrEqual(44); expect(target.height, target.label || '').toBeGreaterThanOrEqual(44); }
  expect(result.text.length).toBeGreaterThan(12);
  for (const text of result.text) { expect(text.font, text.value).toBeGreaterThanOrEqual(.875); expect(text.clipped, text.value).toBe(false); expect(text.ellipsis, text.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Plan shortcuts, selected maneuver summary, and comparisons stay clear across responsive and accessible views', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await choose(page, 'climb'); await keyboard(page, advance(page));
  const held = await flight(page), saved = await savedWork(page);
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: mode === 'wide' || mode === 'medium' ? 1800 : 900 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await settle(page); await assertReady(page, actions[2]); await audit(page, mode);
    await passiveRoundTrip(page);
    for (const [kind, region] of [['navigation', navigation(page)], ['ready', ready(page)], ['comparison', comparison(page)]] as const) {
      await region.screenshot({ path: path.join(artifacts, 'preview-drone-plan-' + mode + '-' + kind + '.png'), animations: 'disabled', timeout: 120000 });
    }
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
