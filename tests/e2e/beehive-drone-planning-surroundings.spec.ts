import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_SURROUNDINGS_ARTIFACTS || '.codex-artifacts/bee-drone-surroundings-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const panel = (page: Page) => page.locator('[data-flight-decision-panel]');
const disclosure = (page: Page) => panel(page).locator('details[data-flight-surroundings]');
const surroundings = (page: Page) => disclosure(page).locator('[data-flight-surroundings-content]');
const card = (page: Page, kind: string) => surroundings(page).locator('[data-surroundings-card="' + kind + '"]');
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Surroundings tests exercise the supported graphics fallback'));
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
  await expect(disclosure(page).locator('summary')).toHaveText('Read direction, wind, and nearby obstacles');
  await page.evaluate(() => {
    const w = window as any;
    w.__surroundingsMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__surroundingsMountedState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'decisionFeedback',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens', 'obstacles', 'drones', 'wind', 'windNow',
      'nearestObstacle', 'nearestTraffic']) result[key] = state[key];
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
    return w.__surroundingsMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__surroundingsMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function openSurroundings(page: Page) {
  if (!(await disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)))
    await keyboard(page, disclosure(page).locator('summary'), 'Space');
  await expect(disclosure(page)).toHaveAttribute('open', '');
}
async function passiveRoundTrip(page: Page) {
  const held = await flight(page), saved = await savedWork(page);
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="route"]'));
  await expect(panel(page).locator('[data-flight-plan-route]')).toBeFocused();
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]'));
  await expect(panel(page).locator('input[name="bee-flight-decision"]:checked')).toBeFocused();
  await expect(disclosure(page)).toHaveAttribute('open', '');
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
}
async function assertSurroundings(page: Page) {
  const expected = await page.evaluate(() => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhDronePlanningSurroundings(w.__testHooks.beehive.droneStateRef.current);
  });
  await expect(surroundings(page)).toBeVisible();
  await expect(surroundings(page)).toHaveAttribute('aria-label', 'Flight surroundings');
  await expect(surroundings(page)).toHaveAttribute('aria-live', 'off');
  await expect(surroundings(page).locator('article[data-surroundings-card]')).toHaveCount(4);
  for (const kind of ['target', 'wind', 'obstacle', 'traffic']) {
    await expect(card(page, kind)).toHaveAttribute('data-reading-status', expected[kind].status);
    await expect(card(page, kind).locator('h4[data-surroundings-title]')).toHaveText(expected[kind].label);
    await expect(card(page, kind).locator('[data-surroundings-value]')).toHaveText(expected[kind].value);
    await expect(card(page, kind).locator('[data-surroundings-detail]')).toHaveText(expected[kind].detail);
    const icon = card(page, kind).locator('h4[data-surroundings-title] svg');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(icon).toHaveAttribute('focusable', 'false');
    await expect(icon.locator('text, [tabindex], a, button')).toHaveCount(0);
  }
  for (const kind of ['target', 'wind']) {
    const dial = card(page, kind).locator('svg[data-surroundings-dial="' + kind + '"]');
    await expect(dial).toHaveCount(expected[kind].degrees === null ? 0 : 1);
    if (expected[kind].degrees === null) continue;
    await expect(dial).toHaveAttribute('viewBox', '0 0 160 160');
    await expect(dial).toHaveAttribute('aria-hidden', 'true');
    await expect(dial).toHaveAttribute('focusable', 'false');
    await expect(dial.locator('[data-surroundings-pointer]')).toHaveAttribute('transform', 'rotate(' + expected[kind].degrees + ' 80 80)');
    await expect(dial.locator('text, [tabindex], a, button')).toHaveCount(0);
  }
  await expect(surroundings(page).locator('[data-surroundings-dial-key]')).toHaveText('On both dials: top = ahead · center = your bee.');
  await expect(surroundings(page).locator('[data-surroundings-note]')).toHaveText(expected.note);
  await expect(surroundings(page).locator('[data-surroundings-weather]')).toContainText('Course conditions');
  return expected;
}

test('Surroundings disclosure stays passive and open while a real flight advances from DCA direction to queen bearing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const starting = await flight(page), saved = await savedWork(page), colony = await savedWork(page, true);
  const summary = disclosure(page).locator('summary');
  await keyboard(page, summary, 'Space'); await expect(disclosure(page)).toHaveAttribute('open', '');
  const initial = await assertSurroundings(page);
  await expect(card(page, 'target').locator('[data-surroundings-title]')).toHaveText('DCA direction');
  await expect(card(page, 'target').locator('[data-surroundings-value]')).toHaveText('Ahead (0°)');
  await keyboard(page, summary, 'Enter'); await expect(disclosure(page)).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused(); await openSurroundings(page);
  expect(await flight(page)).toEqual(starting); expect(await savedWork(page)).toEqual(saved); await identity(page);
  await choose(page, 'climb'); await expect(disclosure(page)).toHaveAttribute('open', '');
  const selectedSave = JSON.parse(JSON.stringify(saved)); selectedSave.beehive.drone.decision = 'climb';
  expect(await flight(page)).toEqual(starting); expect(await savedWork(page)).toEqual(selectedSave);
  await keyboard(page, advance(page));
  const climbed = await flight(page), afterClimb = await assertSurroundings(page);
  expect(climbed.decisionCount).toBe(1); expect(climbed.y).toBeGreaterThan(starting.y); expect(climbed.paused).toBe(true);
  await expect(disclosure(page)).toHaveAttribute('open', ''); await passiveRoundTrip(page);
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
  await assertSurroundings(page); expect((await flight(page)).reachedDca).toBe(false);
  await choose(page, 'navigate'); await keyboard(page, advance(page));
  const crossed = await flight(page), queenRight = await assertSurroundings(page);
  expect(crossed.reachedDca).toBe(true); expect(crossed.decisionCount).toBe(2);
  await expect(card(page, 'target').locator('[data-surroundings-title]')).toContainText(/queen/i);
  expect(queenRight.target.degrees).toBeGreaterThan(0); expect(queenRight.target.degrees).toBeLessThan(90);
  await expect(card(page, 'target').locator('[data-surroundings-value]')).toContainText('right');
  await expect(surroundings(page)).not.toContainText(/hold position|enter the DCA|DCA direction/i);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    // The real maneuver can turn and move the bee. Place this cue relative to
    // its current heading so a left bearing does not depend on world axes.
    const bearing = state.yaw - Math.PI / 4;
    state.nearQueens = [{ x: state.x + 100 * Math.sin(bearing), y: state.y,
      z: state.z - 100 * Math.cos(bearing), caught: false }];
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const queenLeft = await assertSurroundings(page);
  expect(queenLeft.target.degrees).toBeCloseTo(-45, 8);
  await expect(card(page, 'target').locator('[data-surroundings-value]')).toHaveText('45° left of heading');
  await passiveRoundTrip(page); expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'planning-surroundings-actual-flight.json'), JSON.stringify({ starting, initial, climbed, afterClimb, crossed, queenRight, queenLeft }, null, 2));
  expect(errors).toEqual([]);
});

test('Surroundings use current wind and horizontal neighbors with explicit absent, calm, and unavailable readings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openSurroundings(page); const saved = await savedWork(page);
  const courseConditions = await surroundings(page).locator('[data-surroundings-weather]').innerText();
  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, {
      x: 0, y: 115, z: 0, yaw: 0, reachedLaunch: true, reachedDca: false, reachedQueen: false,
      wind: { x: -30, z: -40, phase: 0 }, windNow: { x: 3, z: 4 },
      obstacles: [{ x: 30, y: 0, z: 40, type: 'tree', r: 1, h: 10 }, { x: 3, y: 0, z: 4, type: 'tree', r: 1, h: 10 }],
      drones: [{ x: 60, y: 115, z: 80, vx: 0, vy: 0, vz: 0 }, { x: 6, y: 135, z: 8, vx: 0, vy: 0, vz: 0 }],
      nearestObstacle: { x: 300, y: 0, z: 400, type: 'tree', r: 1, h: 10 },
      nearestTraffic: { x: 600, y: 115, z: 800 },
    });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const measured = await assertSurroundings(page), held = await flight(page);
  await expect(card(page, 'target').locator('[data-surroundings-value]')).toHaveText('Ahead (0°)');
  await expect(card(page, 'wind').locator('[data-surroundings-value]')).toHaveText('Toward 143° right of heading');
  await expect(card(page, 'wind').locator('[data-surroundings-detail]')).toContainText('5.00 model wind units.');
  expect(measured.wind.degrees).toBeCloseTo(143.130102354156, 8);
  await expect(card(page, 'obstacle').locator('[data-surroundings-value]')).toHaveText('5 model m');
  await expect(card(page, 'obstacle').locator('[data-surroundings-detail]')).toContainText('horizontal gap, not surface clearance');
  await expect(card(page, 'traffic').locator('[data-surroundings-value]')).toHaveText('10 model m');
  await expect(card(page, 'traffic').locator('[data-surroundings-detail]')).toContainText('20 model ft above you');
  await expect(surroundings(page).locator('[data-surroundings-weather]')).toHaveText(courseConditions, { useInnerText: true });
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(held);
  await page.evaluate(() => {
    const w = window as any; delete w.__testHooks.beehive.droneStateRef.current.windNow;
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const baseFallback = await assertSurroundings(page);
  await expect(card(page, 'wind').locator('[data-surroundings-value]')).toHaveText('Toward 37° left of heading');
  await expect(card(page, 'wind').locator('[data-surroundings-detail]')).toContainText('50.00 model wind units.');
  expect(baseFallback.wind.degrees).toBeCloseTo(-36.869897645844, 8);
  await page.evaluate(() => {
    const w = window as any; w.__testHooks.beehive.droneStateRef.current.windNow = { x: 'not-recorded', z: 4 };
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const malformedWind = await assertSurroundings(page);
  await expect(card(page, 'wind').locator('[data-surroundings-value]')).toHaveText('Unavailable');
  await expect(card(page, 'wind')).toHaveAttribute('data-reading-status', 'unavailable');
  await expect(card(page, 'wind').locator('[data-surroundings-dial]')).toHaveCount(0);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.x = 0; state.y = 80; state.z = -600; state.windNow = { x: 0, z: 0 }; state.obstacles = []; state.drones = [];
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const absent = await assertSurroundings(page);
  expect(absent.target.degrees).toBeNull(); expect(absent.wind.degrees).toBeNull();
  await expect(card(page, 'target').locator('[data-surroundings-dial]')).toHaveCount(0);
  await expect(card(page, 'wind').locator('[data-surroundings-value]')).toHaveText('Very little modeled wind');
  await expect(card(page, 'wind')).toHaveAttribute('data-reading-status', 'calm');
  for (const kind of ['obstacle', 'traffic']) {
    await expect(card(page, kind)).toHaveAttribute('data-reading-status', 'none');
    await expect(card(page, kind).locator('[data-surroundings-value]')).toContainText(/none|no /i);
  }
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.z = 0; delete state.yaw; state.windNow = { x: 3, z: 4 };
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const unknownHeading = await assertSurroundings(page);
  expect(unknownHeading.target.degrees).toBeNull(); expect(unknownHeading.wind.degrees).toBeNull();
  await expect(card(page, 'target').locator('[data-surroundings-value]')).toContainText(/unavailable/i);
  await expect(card(page, 'wind').locator('[data-surroundings-detail]')).toContainText('5.00 model wind units.');
  await expect(card(page, 'wind')).not.toContainText(/calm/i);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    delete state.x; delete state.windNow; delete state.wind;
    state.obstacles = [{ x: 3, y: 0, z: 4, type: 'tree', r: 1, h: 10 }];
    state.drones = [{ x: 6, y: 135, z: 8, vx: 0, vy: 0, vz: 0 }];
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const unknown = await assertSurroundings(page), unknownHeld = await flight(page);
  for (const kind of ['target', 'wind', 'obstacle', 'traffic']) {
    await expect(card(page, kind)).toHaveAttribute('data-reading-status', 'unavailable');
    await expect(card(page, kind).locator('[data-surroundings-value]')).toContainText(/unavailable/i);
    await expect(card(page, kind).locator('[data-surroundings-value]')).not.toHaveText(/^0(?: model m|°)?$/);
  }
  await expect(surroundings(page).locator('[data-surroundings-dial]')).toHaveCount(0);
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(unknownHeld); expect(await savedWork(page)).toEqual(saved);
  await expect(surroundings(page).locator('[data-surroundings-weather]')).toHaveText(courseConditions, { useInnerText: true });
  fs.writeFileSync(path.join(artifacts, 'planning-surroundings-readings.json'), JSON.stringify({ measured, baseFallback, malformedWind, absent, unknownHeading, unknown, courseConditions }, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await surroundings(page).evaluate(async node => {
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
    const cards = Array.from(node.querySelectorAll('[data-surroundings-card]'));
    const overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].getAttribute('data-surroundings-card') + '/' + cards[j].getAttribute('data-surroundings-card'));
    }
    const graphs = Array.from(node.querySelectorAll('svg[data-surroundings-dial]')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.closest('[data-surroundings-card]')!.getBoundingClientRect();
      const marks = Array.from(svg.querySelectorAll('[data-surroundings-pointer]')).map(mark => {
        const m = mark.getBoundingClientRect();
        return { clipped: m.left < r.left - 1 || m.right > r.right + 1 || m.top < r.top - 1 || m.bottom > r.bottom + 1 };
      });
      return { width: r.width, height: r.height, hidden: svg.getAttribute('aria-hidden'), marks,
        interactive: svg.querySelectorAll('a, button, [tabindex], text').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const icons = Array.from(node.querySelectorAll('h4[data-surroundings-title] svg')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.closest('[data-surroundings-card]')!.getBoundingClientRect();
      return { hidden: svg.getAttribute('aria-hidden'), interactive: svg.querySelectorAll('a, button, [tabindex], text').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { text, rootFont, overlaps, graphs, icons,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'planning-surroundings-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.graphs.length).toBe(2);
  for (const graph of result.graphs) {
    expect(graph.contained).toBe(true); expect(graph.hidden).toBe('true'); expect(graph.interactive).toBe(0);
    for (const mark of graph.marks) expect(mark.clipped).toBe(false);
  }
  expect(result.icons).toHaveLength(4);
  for (const icon of result.icons) { expect(icon.contained).toBe(true); expect(icon.hidden).toBe('true'); expect(icon.interactive).toBe(0); }
  expect(result.text.length).toBeGreaterThan(12);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Surroundings dials, current readings, and course conditions remain readable in seven accessible layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openSurroundings(page); await choose(page, 'climb'); await keyboard(page, advance(page));
  // A nonzero current vector makes both decorative direction dials visible in every layout.
  await page.evaluate(() => {
    const w = window as any; w.__testHooks.beehive.droneStateRef.current.windNow = { x: 3, z: 4 };
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const held = await flight(page), saved = await savedWork(page);
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: mode === 'wide' || mode === 'medium' ? 1800 : 900 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await settle(page); await expect(disclosure(page)).toHaveAttribute('open', '');
    await assertSurroundings(page); await audit(page, mode); await passiveRoundTrip(page);
    await surroundings(page).screenshot({ path: path.join(artifacts, 'preview-drone-surroundings-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    if (mode === 'phone' || mode === '200-percent-text' || mode === 'forced-dark')
      await card(page, 'wind').screenshot({ path: path.join(artifacts, 'preview-drone-surroundings-wind-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
