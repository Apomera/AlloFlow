import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_BRIEFING_ARTIFACTS || '.codex-artifacts/bee-drone-briefing-2026-10-15');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'no-preference', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Condition = 'prepared' | 'watch' | 'stressed';
type Difficulty = 'easy' | 'normal' | 'hard';
const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
const maxEnergy = { easy: 125, normal: 105, hard: 82 };
const baseTime = { easy: 150, normal: 110, hard: 75 };
const reserveScale = { prepared: 1, watch: .94, stressed: .86 };
const briefing = (page: Page) => page.locator('#beehive-drone-playfield[data-beehive-stage="drone-briefing"]');
const launch = (page: Page, difficulty: Difficulty) => briefing(page).locator('[data-flight-launch="' + difficulty + '"]');
async function settle(page: Page) { await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); }); }
async function mount(page: Page, options: { condition?: Condition; pacing?: 'steps' | 'live'; scenario?: string; routePlan?: string } = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(options => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Drone briefing tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true, day: 0,
      workers: 30000, honey: 80, queenHealth: 100, morale: 90,
      varroaLevel: options.condition === 'stressed' ? 45 : options.condition === 'watch' ? 25 : 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: options.pacing || 'live', scenario: options.scenario || 'clear',
        routePlan: options.routePlan || 'balanced', courseSeed: 20260908, graphicsMode: 'eco',
        custom: { retained: 'Saved flight metadata.' } },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my colony observation.', explanation: 'Keep my colony explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.', explanation: 'Keep my flight explanation.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      journal: [{ day: 0, text: 'Keep my recorded journal observation.' }],
      custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, options);
  await expect(briefing(page)).toBeVisible(); await settle(page);
}
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function protectedWork(page: Page) {
  const current = await work(page); delete current.beehive.drone; return current;
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current;
    return { x: state.x, y: state.y, z: state.z, vx: state.vx, vy: state.vy, vz: state.vz,
      yaw: state.yaw, pitch: state.pitch, energy: state.energy, timer: state.timer,
      phase: state.phase, paused: state.paused, pacing: state.pacing, difficulty: state.difficulty,
      scenario: state.scenario, routePlan: state.routePlan, courseSeed: state.courseSeed,
      decisions: state.decisionCount || 0, decisionLog: state.decisionLog, simulationClock: state.simulationClock };
  });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function preview(page: Page, difficulty: Difficulty, timer: number, energy: number) {
  const button = launch(page, difficulty), title = difficulty[0].toUpperCase() + difficulty.slice(1);
  await expect(button).toHaveAccessibleName('Launch ' + title + ' flight');
  expect((await button.getAttribute('aria-describedby'))?.split(/\s+/)).toEqual(expect.arrayContaining([
    'bee-flight-launch-description-' + difficulty, 'bee-flight-launch-budget-' + difficulty,
  ]));
  await expect(button).toHaveAccessibleDescription({
    easy: /More time and energy; fewer birds and a closer queen\./,
    normal: /A middle flight budget and balanced challenge\./,
    hard: /Less time and energy; more birds and a farther queen\./,
  }[difficulty]);
  await expect(button).toHaveAccessibleDescription(new RegExp('\\b' + timer + ' model seconds\\b'));
  expect((await button.locator('[data-flight-launch-time]').innerText()).match(/\d+/g)?.map(Number)).toEqual([timer]);
  expect((await button.locator('[data-flight-launch-energy]').innerText()).match(/\d+/g)?.map(Number)).toEqual([energy, maxEnergy[difficulty]]);
}

test('Drone briefing explains keyboard setup choices without launching or changing colony and notebook work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const saved = await protectedWork(page), beforeFlight = await flight(page), summary = briefing(page).locator('[data-flight-launch-summary]');
  await expect(summary).toContainText('Continuous flight'); await expect(summary).toContainText('Clear field'); await expect(summary).toContainText('Balanced route');
  const route = briefing(page).locator('[data-beehive-flight-plan]');
  await expect(route).toContainText(/optional/i); await expect(route).toContainText(/DCA/); await expect(route).toContainText(/queen/i);
  const context = briefing(page).locator('[data-flight-colony-context]');
  await expect(context).toHaveJSProperty('open', false);
  await keyboard(page, context.locator(':scope > summary')); await expect(context).toHaveJSProperty('open', true);
  await expect(context.locator('[data-drone-carryover-brief]')).toContainText('Well-fed launch condition');
  await keyboard(page, context.locator(':scope > summary'), 'Space'); await expect(context).toHaveJSProperty('open', false);

  const pace = briefing(page).locator('[data-flight-pace-picker]');
  await keyboard(page, pace.locator('input[value="live"]'), 'ArrowLeft');
  await expect(pace.locator('input[value="steps"]')).toBeChecked(); await expect(pace.locator('input[value="steps"]')).toBeFocused();
  await expect(summary).toContainText('Pause and plan'); await expect(briefing(page).locator('[data-flight-start-behavior]')).toContainText(/maneuver/i);
  await keyboard(page, briefing(page).locator('[data-drone-route-plan="balanced"]'), 'ArrowRight');
  await expect(briefing(page).locator('[data-drone-route-plan="boost-first"]')).toBeFocused();
  await expect(briefing(page).locator('[data-drone-route-plan="boost-first"]')).toHaveAttribute('aria-checked', 'true');
  await expect(summary).toContainText('Marker-first');
  await page.keyboard.press('ArrowRight');
  await expect(briefing(page).locator('[data-drone-route-plan="thermal-first"]')).toBeFocused();
  await expect(summary).toContainText('Updraft-first');
  await keyboard(page, briefing(page).locator('[data-drone-scenario="clear"]'), 'ArrowRight');
  await expect(briefing(page).locator('[data-drone-scenario="crosswind"]')).toBeFocused(); await expect(summary).toContainText('Crosswind drill');
  await page.keyboard.press('ArrowRight');
  await expect(briefing(page).locator('[data-drone-scenario="rescue"]')).toBeFocused();
  await expect(briefing(page).locator('[data-drone-scenario="rescue"]')).toHaveAttribute('aria-checked', 'true'); await expect(summary).toContainText('Low-energy rescue');
  await expect(briefing(page).locator('[data-drone-scenario="rescue"]')).toHaveAttribute('aria-describedby', 'bee-flight-rescue-budget-note');
  await expect(briefing(page).locator('[data-drone-scenario="rescue"]')).toHaveAccessibleDescription('12 fewer model seconds at every difficulty.');
  await expect(briefing(page).locator('#bee-flight-rescue-budget-note')).toHaveText('12 fewer model seconds at every difficulty.');
  for (const difficulty of difficulties) await preview(page, difficulty, baseTime[difficulty] - 12, maxEnergy[difficulty]);
  for (const selector of ['data-drone-route-plan', 'data-drone-scenario']) {
    await expect(briefing(page).locator('[' + selector + '][tabindex="0"]')).toHaveCount(1);
    await expect(briefing(page).locator('[' + selector + '][aria-checked="true"]')).toHaveCount(1);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await keyboard(page, pace.locator('input[value="steps"]'), 'ArrowRight'); await expect(pace.locator('input[value="live"]')).toBeChecked();
  await expect(briefing(page).locator('[data-flight-start-behavior]')).toContainText(/reduced.motion/i);
  await expect(briefing(page).locator('[data-flight-start-behavior]')).toContainText(/paused/i);
  await settle(page); expect(await protectedWork(page)).toEqual(saved); expect(await flight(page)).toEqual(beforeFlight);
  expect((await work(page)).beehive.drone).toMatchObject({ active: false, pacing: 'live', scenario: 'rescue', routePlan: 'thermal-first', courseSeed: 20260908, custom: { retained: 'Saved flight metadata.' } });
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveCount(0); expect(errors).toEqual([]);
});

test('Drone launch previews match runtime reserves and countdowns and preserve deliberate pacing and reduced-motion starts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const cases: { difficulty: Difficulty; condition: Condition; scenario: string; pacing: 'steps' | 'live'; reduced: boolean }[] = [
    { difficulty: 'easy', condition: 'prepared', scenario: 'clear', pacing: 'steps', reduced: false },
    { difficulty: 'normal', condition: 'watch', scenario: 'crosswind', pacing: 'steps', reduced: false },
    { difficulty: 'hard', condition: 'stressed', scenario: 'rescue', pacing: 'steps', reduced: false },
    { difficulty: 'easy', condition: 'prepared', scenario: 'rescue', pacing: 'live', reduced: true },
  ];
  for (const item of cases) {
    await page.emulateMedia({ reducedMotion: item.reduced ? 'reduce' : 'no-preference' });
    await mount(page, { ...item, routePlan: 'thermal-first' }); const saved = await protectedWork(page);
    const timer = baseTime[item.difficulty] + (item.scenario === 'rescue' ? -12 : 0), energy = Math.round(maxEnergy[item.difficulty] * reserveScale[item.condition]);
    await preview(page, item.difficulty, timer, energy);
    if (item.reduced) await expect(briefing(page).locator('[data-flight-start-behavior]')).toContainText(/reduced.motion/i);
    await keyboard(page, launch(page, item.difficulty));
    const canvas = page.locator('[data-beehive-drone-canvas]');
    await expect(canvas).toBeVisible(); await expect(canvas).toBeFocused(); await expect(canvas).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
    await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
    const initial = await flight(page);
    expect(initial).toMatchObject({ x: 0, y: 10, z: 0, energy, timer, phase: 'launch', paused: true,
      pacing: item.pacing, difficulty: item.difficulty, scenario: item.scenario, routePlan: 'thermal-first',
      courseSeed: 20260908, decisions: 0, decisionLog: [], simulationClock: 0 });
    await page.waitForTimeout(300); expect(await flight(page)).toEqual(initial); expect(await protectedWork(page)).toEqual(saved);
    if (item.pacing === 'steps') {
      const decision = page.locator('[data-flight-decision-panel]');
      await keyboard(page, decision.locator('input[value="climb"]'), 'Space');
      await keyboard(page, decision.locator('[data-flight-advance-decision]'));
      await expect(decision.locator('[data-flight-advance-decision]')).toBeFocused();
      const after = await flight(page); expect(after.decisions).toBe(1); expect(after.timer).toBeLessThan(timer); expect(after.decisionLog).toHaveLength(1);
      await page.waitForTimeout(200); expect(await flight(page)).toEqual(after); expect(await protectedWork(page)).toEqual(saved);
    }
    await harness.destroy(page);
  }
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await briefing(page).evaluate(async node => {
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      return el instanceof HTMLElement && rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden' && css.clip !== 'rect(0px, 0px, 0px, 0px)';
    });
    const text: { value: string; size: number; ellipsis: string; clipped: boolean }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (!textNode.textContent?.trim()) continue; const parent = textNode.parentElement; if (!parent || !visible.includes(parent)) continue;
      const css = getComputedStyle(parent); if (parent.closest('[aria-hidden="true"]')) continue;
      const range = document.createRange(); range.selectNodeContents(textNode);
      const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
      text.push({ value: textNode.textContent.trim(), size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow,
        clipped: rects.some(rect => rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) });
    }
    return {
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }),
      text,
      controls: visible.filter(el => el.matches('button,summary,label')).map(el => { const rect = el.getBoundingClientRect(); return { text: el.textContent, width: rect.width, height: rect.height }; }),
    };
  });
  fs.writeFileSync(path.join(artifacts, 'briefing-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.value).toBeGreaterThanOrEqual(.875); expect(item.ellipsis, item.value).not.toBe('ellipsis'); expect(item.clipped, item.value).toBe(false); }
  for (const item of result.controls) { expect(item.width, item.text || '').toBeGreaterThanOrEqual(44); expect(item.height, item.text || '').toBeGreaterThanOrEqual(44); }
}
async function capture(page: Page, mode: string) {
  const target = briefing(page), pad = 6, prefix = 'preview-drone-briefing-' + mode;
  const position = await target.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(24); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('Drone briefing stays readable with complete launch choices in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, { pacing: 'steps', scenario: 'rescue', routePlan: 'thermal-first', condition: 'stressed' });
  const saved = await work(page);
  for (const mode of ['wide', 'mobile', 'dark', 'large', 'forced']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '24px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    const context = briefing(page).locator('[data-flight-colony-context]');
    if (!(await context.evaluate((node: HTMLDetailsElement) => node.open))) await keyboard(page, context.locator(':scope > summary'));
    await expect(context.locator('[data-drone-carryover-brief]')).toBeVisible();
    await expect(context.locator('[data-drone-carryover-brief]')).toContainText('Stressed launch condition');
    for (const difficulty of difficulties) await preview(page, difficulty, baseTime[difficulty] - 12, Math.round(maxEnergy[difficulty] * .86));
    await launch(page, 'normal').focus(); await expect(launch(page, 'normal')).toBeFocused();
    await settle(page); await audit(page, mode); await capture(page, mode); expect(await work(page)).toEqual(saved);
  }
  expect(errors).toEqual([]);
});
