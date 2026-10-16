import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_PLAN_MAP_ARTIFACTS || '.codex-artifacts/bee-drone-plan-map-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const panel = (page: Page) => page.locator('[data-flight-decision-panel]');
const route = (page: Page) => panel(page).locator('figure[data-flight-plan-route]');
const plot = (page: Page) => route(page).locator('svg[data-flight-plan-map]');
const advance = (page: Page) => panel(page).locator('[data-flight-advance-decision]');
async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); await settle(page);
}
async function choose(page: Page, action: string) {
  await keyboard(page, panel(page).locator('input[name="bee-flight-decision"][value="' + action + '"]'), 'Space');
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Plan map tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Flight metadata.' },
        lastRun: { pacing: 'steps', difficulty: 'easy', success: false, score: 12, custom: { retained: 'Previous run.' } } },
      notebook: { drone: { prediction: 'Keep my prediction.', evidence: 'Keep my evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(route(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.__planMapMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__planMapMountedState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'decisionFeedback',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens', 'obstacles', 'wind', 'windNow']) result[key] = state[key];
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
    return w.__planMapMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__planMapMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function passiveRoundTrip(page: Page) {
  const held = await flight(page), saved = await savedWork(page);
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="route"]'));
  await expect(route(page)).toBeFocused();
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]'));
  await expect(panel(page).locator('input[name="bee-flight-decision"]:checked')).toBeFocused();
  const compare = panel(page).locator('[data-flight-plan-jump="compare"]');
  if (await compare.isEnabled()) {
    await keyboard(page, compare); await expect(panel(page).locator('[data-flight-maneuver-evidence]')).toBeFocused();
  }
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="route"]'));
  await expect(route(page)).toBeFocused();
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
}
async function assertMap(page: Page) {
  const expected = await page.evaluate(() => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhDronePlanMap(w.__testHooks.beehive.droneStateRef.current);
  });
  await expect(route(page)).toHaveAttribute('tabindex', '-1');
  await expect(route(page)).toHaveAttribute('aria-label', 'Top-down flight route');
  await expect(plot(page)).toHaveAttribute('viewBox', '0 0 360 320');
  await expect(plot(page)).toHaveAttribute('role', 'img');
  await expect(plot(page)).toHaveAccessibleName(/Top-down flight route/);
  for (const name of ['player', 'hive', 'dca', 'queen']) {
    const marker = plot(page).locator('[data-plan-map-' + name + ']'), point = expected[name];
    await expect(marker).toHaveCount(point ? 1 : 0);
    if (point) await expect(marker).toHaveAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')' +
      (name === 'player' ? ' rotate(' + expected.heading + ')' : ''));
  }
  const area = plot(page).locator('[data-plan-map-dca-area]');
  await expect(area).toHaveAttribute('cx', String(expected.dca.x)); await expect(area).toHaveAttribute('cy', String(expected.dca.y));
  expect(Number(await area.getAttribute('r'))).toBeCloseTo(expected.dcaRadius, 8);
  expect(expected.dcaRadius).toBeCloseTo(72 * expected.scale, 8);
  expect(Math.hypot(expected.dca.x - expected.hive.x, expected.dca.y - expected.hive.y)).toBeCloseTo(600 * expected.scale, 8);
  const samples = await plot(page).locator('[data-plan-map-sample]').evaluateAll(nodes => nodes.map(node =>
    ({ x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) })));
  expect(samples).toEqual(expected.samples);
  expect(await plot(page).locator('[data-plan-map-segment]').evaluateAll(nodes => nodes.map(node => node.getAttribute('points')))).toEqual(expected.segments);
  expect(await plot(page).locator('[data-plan-map-obstacle]').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))))
    .toEqual(expected.obstacles.map((point: { x: number; y: number }) => 'translate(' + point.x + ' ' + point.y + ')'));
  const bearing = plot(page).locator('[data-plan-map-bearing]');
  await expect(bearing).toHaveCount(expected.player && expected.target ? 1 : 0);
  if (expected.player && expected.target) {
    for (const [attr, value] of [['x1', expected.player.x], ['y1', expected.player.y], ['x2', expected.target.x], ['y2', expected.target.y]] as const)
      expect(Number(await bearing.getAttribute(attr))).toBeCloseTo(value, 8);
    await expect(bearing).toHaveAttribute('stroke-dasharray', '5 5');
  }
  await expect(plot(page).locator('[data-plan-map-scale]')).toHaveAttribute('d', 'M24 304V312M24 308h' + expected.scaleBar.width + 'm0 -4v8');
  expect(expected.scaleBar.width).toBeCloseTo(expected.scaleBar.distance * expected.scale, 8);
  await expect(route(page).locator('[data-plan-map-scale-label]')).toHaveText('Scale bar: ' + expected.scaleBar.label);
  await expect(route(page)).toContainText('orientation stays fixed'); await expect(route(page)).toContainText('Height is not shown');
  await expect(route(page)).toContainText('72 model m'); await expect(route(page)).toContainText('100–130 model ft');
  await expect(route(page).locator('[data-plan-map-key]')).toContainText('Solid links');
  await expect(route(page).locator('[data-plan-map-key]')).toContainText('Dashed line');
  await expect(route(page)).toContainText('does not guarantee a clear route');
  return expected;
}

test('Equal-scale plan map follows a real maneuver and unlocks the queen cue only after DCA entry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const colony = await savedWork(page, true), starting = await flight(page);
  const initial = await assertMap(page);
  expect(initial.samples).toHaveLength(0); expect(initial.segments).toHaveLength(0); expect(initial.queen).toBeNull();
  await expect(route(page).locator('[data-plan-map-sample-note]')).toContainText('No maneuver positions recorded yet');
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(starting);
  await choose(page, 'climb'); await keyboard(page, advance(page));
  const climbed = await flight(page), actual = await assertMap(page), entry = climbed.decisionLog.at(-1);
  expect(climbed.decisionCount).toBe(1); expect(climbed.y).toBeGreaterThan(starting.y); expect(climbed.paused).toBe(true);
  expect(entry).toMatchObject({ turn: 1, action: 'Powered climb', seconds: 1 });
  expect(actual.samples).toHaveLength(1); expect(actual.segments).toHaveLength(0);
  expect(actual.samples[0].x - actual.hive.x).toBeCloseTo(entry.x * actual.scale, 6);
  expect(actual.samples[0].y - actual.hive.y).toBeCloseTo(entry.z * actual.scale, 6);
  expect(actual.player.x - actual.hive.x).toBeCloseTo(climbed.x * actual.scale, 6);
  expect(actual.player.y - actual.hive.y).toBeCloseTo(climbed.z * actual.scale, 6);
  await passiveRoundTrip(page);

  // A valid pose outside the DCA still keeps the queen hidden. Only the ordinary
  // navigation maneuver below can advance physics and record the checkpoint.
  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, {
      x: 0, y: 115, z: -527, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: -1,
      speed: 1, phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
      energy: 100, timer: 120, wind: { x: 0, z: 0, phase: 0 }, windNow: { x: 0, z: 0 },
      obstacles: [], birds: [], drones: [], flowers: [], thermals: [], nearestObstacle: null, nearestTraffic: null,
      nearQueens: [{ x: 90, y: 115, z: -800, caught: false }],
    });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  expect((await assertMap(page)).queen).toBeNull(); await passiveRoundTrip(page);
  expect((await flight(page)).reachedDca).toBe(false);
  await choose(page, 'navigate'); await keyboard(page, advance(page));
  const crossed = await flight(page), unlocked = await assertMap(page);
  expect(crossed.reachedDca).toBe(true); expect(crossed.decisionCount).toBe(2); expect(unlocked.queen).not.toBeNull();
  expect(unlocked.targetLabel).toBe('Queen cue'); expect(unlocked.target).toEqual(unlocked.queen);
  await passiveRoundTrip(page); expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'plan-map-actual-flight.json'), JSON.stringify({ starting, climbed, entry, actual, crossed, unlocked }, null, 2));
  expect(errors).toEqual([]);
});

test('Plan map fits large excursions and preserves missing-position gaps without inventing a starting path', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const recorded = [
    { turn: 7, action: 'Powered forward', seconds: 1, x: -2400, z: 100 },
    { turn: 8, action: 'Turn right', seconds: .2, x: -1200, z: -800 },
    { turn: 9, action: 'Ease thrust', seconds: 1, z: -20000, custom: { retained: 'Missing x is not zero.' } },
    { turn: 10, action: 'Powered forward', seconds: 1, x: 1200, z: -900 },
    { turn: 11, action: 'Turn left', seconds: .2, x: 3000, z: -1700 },
  ];
  await page.evaluate(recorded => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, { x: 3000, y: 115, z: -1700, yaw: Math.PI / 2,
      reachedLaunch: true, reachedDca: false, reachedQueen: false, decisionCount: 11, decisionLog: recorded,
      nearQueens: [{ x: 12000, y: 115, z: -18000, caught: false }],
      obstacles: [{ x: 100, z: -100, radius: 8, height: 30 }, { x: -90000, z: -90000, radius: 8, height: 30 }] });
    w.ReactDOM.flushSync(() => w.__rerender());
  }, recorded);
  const held = await flight(page), saved = await savedWork(page), map = await assertMap(page);
  expect(map.samples).toHaveLength(4); expect(map.segments).toHaveLength(2); expect(map.gapCount).toBeGreaterThan(0);
  expect(map.queen).toBeNull(); expect(map.heading).toBeCloseTo(90, 8);
  expect(map.scale).toBeGreaterThan(.04); // Neither a hidden queen nor a partial log point expands the bounds.
  const valid = recorded.filter(point => Number.isFinite(point.x));
  for (let i = 0; i < valid.length; i++) {
    expect(map.samples[i].x - map.hive.x).toBeCloseTo(valid[i].x! * map.scale, 6);
    expect(map.samples[i].y - map.hive.y).toBeCloseTo(valid[i].z * map.scale, 6);
    expect(map.samples[i]).not.toEqual(map.hive);
  }
  const segments = map.segments.map((line: string) => line.trim().split(/\s+/).map(point => point.split(',').map(Number)));
  expect(segments.map((line: number[][]) => line.length)).toEqual([2, 2]);
  expect(segments[0][0][0]).toBeCloseTo(map.samples[0].x, 2); expect(segments[0][1][0]).toBeCloseTo(map.samples[1].x, 2);
  expect(segments[1][0][0]).toBeCloseTo(map.samples[2].x, 2); expect(segments[1][1][0]).toBeCloseTo(map.samples[3].x, 2);
  for (const point of [map.player, map.hive, map.dca, ...map.samples]) {
    expect(point.x).toBeGreaterThanOrEqual(24); expect(point.x).toBeLessThanOrEqual(336);
    expect(point.y).toBeGreaterThanOrEqual(24); expect(point.y).toBeLessThanOrEqual(296);
  }
  expect(map.dca.x - map.dcaRadius).toBeGreaterThanOrEqual(24); expect(map.dca.x + map.dcaRadius).toBeLessThanOrEqual(336);
  expect(map.dca.y - map.dcaRadius).toBeGreaterThanOrEqual(24); expect(map.dca.y + map.dcaRadius).toBeLessThanOrEqual(296);
  await expect(route(page).locator('[data-plan-map-sample-note]')).toContainText('Missing positions leave gaps');
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved);
  expect((await flight(page)).decisionLog).toEqual(recorded);
  // An unavailable current position must not turn into a triangle at the hive.
  await page.evaluate(() => {
    const w = window as any; delete w.__testHooks.beehive.droneStateRef.current.x;
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const unknownHeld = await flight(page), unknown = await assertMap(page);
  expect(unknown.player).toBeNull(); await expect(plot(page).locator('[data-plan-map-bearing]')).toHaveCount(0);
  await expect(plot(page).locator('desc')).toContainText('The bearing is unavailable because a position is missing.');
  await expect(plot(page).locator('desc')).not.toContainText('The dashed line points toward');
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(unknownHeld); expect(await savedWork(page)).toEqual(saved);
  fs.writeFileSync(path.join(artifacts, 'plan-map-recording-gaps.json'), JSON.stringify({ recorded, map, unknown }, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await route(page).evaluate(async node => {
    const box = node.getBoundingClientRect(), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = [node, ...Array.from(node.querySelectorAll('*'))].filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
      let ancestor: HTMLElement | null = el;
      while (ancestor && ancestor !== node.parentElement) {
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
      const range = document.createRange(); range.selectNodeContents(value); const css = getComputedStyle(value.parentElement);
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)) });
    }
    const svg = node.querySelector('[data-flight-plan-map]')!, plotBox = svg.getBoundingClientRect();
    const icons = Array.from(node.querySelectorAll('[data-plan-map-key-symbol]')).map(el => {
      const r = el.getBoundingClientRect(), label = el.parentElement!.querySelector('span')!.getBoundingClientRect();
      return { id: el.getAttribute('data-plan-map-key-symbol'), width: r.width, height: r.height, overlap: r.right > label.left + 1 };
    });
    const markers = Array.from(svg.querySelectorAll('[data-plan-map-player], [data-plan-map-hive], [data-plan-map-dca], [data-plan-map-queen], [data-plan-map-dca-area], [data-plan-map-sample], [data-plan-map-scale]')).map(el => {
      const r = el.getBoundingClientRect();
      return { kind: el.getAttributeNames().find(name => name.startsWith('data-plan-map-')), clipped: r.left < plotBox.left - 1 || r.right > plotBox.right + 1 || r.top < plotBox.top - 1 || r.bottom > plotBox.bottom + 1 };
    });
    const header = node.querySelector('.bee-plan-map-header')!.getBoundingClientRect(), caption = node.querySelector('figcaption')!.getBoundingClientRect();
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { text, rootFont, icons, markers, plot: { width: plotBox.width, height: plotBox.height,
        contained: plotBox.left >= box.left - 1 && plotBox.right <= box.right + 1, clearOfText: plotBox.top >= header.bottom - 1 && caption.top >= plotBox.bottom - 1 },
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'plan-map-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.plot.contained).toBe(true); expect(result.plot.clearOfText).toBe(true);
  expect(result.plot.width / result.plot.height).toBeCloseTo(360 / 320, 2);
  expect(result.icons).toHaveLength(8);
  for (const icon of result.icons) { expect(icon.width, icon.id!).toBeCloseTo(24, 1); expect(icon.height, icon.id!).toBeCloseTo(24, 1); expect(icon.overlap, icon.id!).toBe(false); }
  for (const marker of result.markers) expect(marker.clipped, marker.kind).toBe(false);
  expect(result.text.length).toBeGreaterThan(8);
  for (const text of result.text) { expect(text.font, text.value).toBeGreaterThanOrEqual(.875); expect(text.clipped, text.value).toBe(false); expect(text.ellipsis, text.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Map symbols, scale, and explanations stay readable and frozen across responsive and accessible views', async ({ page }) => {
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
    await settle(page); await assertMap(page); await audit(page, mode); await passiveRoundTrip(page);
    await route(page).screenshot({ path: path.join(artifacts, 'preview-drone-plan-map-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
