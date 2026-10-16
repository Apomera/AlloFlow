import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_READINGS_ARTIFACTS || '.codex-artifacts/bee-drone-readings-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const panel = (page: Page) => page.locator('[data-flight-decision-panel]');
const readings = (page: Page) => panel(page).locator('[data-flight-current-readings]');
const card = (page: Page, kind: string) => readings(page).locator('[data-planning-reading="' + kind + '"]');
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Planning readings tests exercise the supported graphics fallback'));
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
  await expect(readings(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.__readingsMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__readingsMountedState = w.__testHooks.beehive.droneStateRef.current;
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
    return w.__readingsMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__readingsMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function passiveRoundTrip(page: Page) {
  const held = await flight(page), saved = await savedWork(page);
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="route"]'));
  await expect(panel(page).locator('[data-flight-plan-route]')).toBeFocused();
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]'));
  await expect(panel(page).locator('input[name="bee-flight-decision"]:checked')).toBeFocused();
  const compare = panel(page).locator('[data-flight-plan-jump="compare"]');
  if (await compare.isEnabled()) {
    await keyboard(page, compare); await expect(panel(page).locator('[data-flight-maneuver-evidence]')).toBeFocused();
  }
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="route"]'));
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
}
async function assertReadings(page: Page) {
  const expected = await page.evaluate(() => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhDronePlanningReadings(w.__testHooks.beehive.droneStateRef.current);
  });
  await expect(readings(page)).toHaveAttribute('aria-label', 'Current flight readings');
  await expect(readings(page)).toHaveAttribute('aria-live', 'off');
  await expect(readings(page).getByRole('heading', { name: 'Current flight readings', exact: true })).toHaveCount(1);
  await expect(readings(page).locator('article[data-planning-reading]')).toHaveCount(3);
  for (const kind of ['range', 'altitude', 'energy']) {
    await expect(card(page, kind).locator('[data-planning-value]')).toHaveCount(1);
    await expect(card(page, kind).locator('[data-planning-detail]')).toHaveCount(1);
    const status = kind === 'energy' ? expected.energy.value === null ? 'unknown' : expected.energy.low ? 'low' : 'available' : expected[kind].status;
    await expect(card(page, kind)).toHaveAttribute('data-reading-status', status);
    await expect(card(page, kind).locator('[data-planning-value]')).toHaveText(expected[kind].text);
    await expect(card(page, kind).locator('[data-planning-detail]')).toHaveText(expected[kind].detail);
  }
  await expect(card(page, 'range').locator('[data-planning-reference]')).toHaveCount(1);
  await expect(card(page, 'altitude').locator('[data-planning-reference]')).toHaveCount(1);
  await expect(card(page, 'range').locator('[data-planning-reference]')).toHaveText(expected.range.reference);
  await expect(card(page, 'altitude').locator('[data-planning-reference]')).toHaveText(expected.altitude.reference);
  await expect(readings(page)).toContainText(/round/i);
  await expect(card(page, 'altitude').locator('[data-planning-value]')).not.toContainText('/');
  await expect(card(page, 'altitude').locator('.bee-plan-altitude-ticks span')).toHaveText(['0', '300 model ft']);
  const scale = readings(page).locator('svg[data-planning-altitude-scale]');
  await expect(scale).toHaveAttribute('viewBox', '0 0 300 48');
  await expect(scale).toHaveAttribute('aria-hidden', 'true');
  await expect(scale.locator('text')).toHaveCount(0);
  await expect(scale.locator('[tabindex], a, button')).toHaveCount(0);
  const band = scale.locator('[data-planning-altitude-band]'), cue = scale.locator('[data-planning-cue-height]');
  const pointer = scale.locator('[data-planning-altitude-pointer]');
  await expect(pointer).toHaveCount(expected.altitude.markerPct === null ? 0 : 1);
  if (expected.altitude.markerPct !== null)
    await expect(pointer).toHaveAttribute('transform', 'translate(' + (16 + expected.altitude.markerPct * 2.68) + ' 20)');
  if (expected.altitude.markerPct !== null) await expect(card(page, 'altitude')).toContainText('Triangle: current height');
  if (expected.altitude.kind === 'dca') {
    await expect(band).toHaveCount(1);
    await expect(card(page, 'altitude')).toContainText('outlined band: DCA entry');
    expect(Number(await band.getAttribute('x'))).toBeCloseTo(16 + expected.altitude.bandStartPct * 2.68, 8);
    expect(Number(await band.getAttribute('width'))).toBeCloseTo(expected.altitude.bandWidthPct * 2.68, 8);
  } else await expect(band).toHaveCount(0);
  await expect(cue).toHaveCount(expected.altitude.referencePct === null ? 0 : 1);
  if (expected.altitude.referencePct !== null) {
    await expect(card(page, 'altitude')).toContainText('dashed mark: queen cue height');
    expect(Number(await cue.getAttribute('x1'))).toBeCloseTo(16 + expected.altitude.referencePct * 2.68, 8);
    expect(Number(await cue.getAttribute('x2'))).toBeCloseTo(16 + expected.altitude.referencePct * 2.68, 8);
  }
  const meter = readings(page).locator('[data-planning-energy-meter]');
  if (expected.energy.fillPct !== null) {
    await expect(meter).toHaveAttribute('role', 'meter');
    await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.energy.fillPct, 8);
    await expect(meter).toHaveAccessibleName(/energy/i);
    await expect(meter).toHaveAttribute('aria-valuetext', expected.energy.text + ' of this difficulty’s full reserve');
    expect(await readings(page).locator('[data-planning-energy-fill]').evaluate(node => parseFloat((node as HTMLElement).style.width))).toBeCloseTo(expected.energy.fillPct, 3);
  } else await expect(meter).toHaveCount(0);
  return expected;
}

test('Current readings follow real maneuvers and replace DCA entry guidance with a queen height reference', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const colony = await savedWork(page, true), starting = await flight(page);
  const initial = await assertReadings(page);
  await expect(card(page, 'range').locator('[data-planning-value]')).toHaveText('600 model m');
  await expect(card(page, 'altitude').locator('[data-planning-value]')).toHaveText('10 model ft');
  await expect(card(page, 'energy').locator('[data-planning-value]')).toHaveText('100%');
  await expect(card(page, 'altitude').locator('[data-planning-reference]')).toContainText('100–130 model ft');
  await expect(readings(page).locator('[data-planning-cue-height]')).toHaveCount(0);
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(starting);
  await choose(page, 'climb'); await keyboard(page, advance(page));
  const climbed = await flight(page), afterClimb = await assertReadings(page);
  expect(climbed.decisionCount).toBe(1); expect(climbed.y).toBeGreaterThan(starting.y); expect(climbed.paused).toBe(true);
  await expect(card(page, 'altitude').locator('[data-planning-value]')).toHaveText(Math.round(climbed.y) + ' model ft');
  expect(climbed.decisionLog.at(-1)).toMatchObject({ turn: 1, action: 'Powered climb', seconds: 1 });
  await passiveRoundTrip(page);
  // Only an ordinary maneuver below may award the checkpoint; viewing a valid
  // pose or reading a matching height is not itself a recorded DCA entry.
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
  await assertReadings(page); await expect(readings(page).locator('[data-planning-altitude-band]')).toHaveCount(1);
  expect((await flight(page)).reachedDca).toBe(false); await passiveRoundTrip(page);
  await choose(page, 'navigate'); await keyboard(page, advance(page));
  const crossed = await flight(page), afterEntry = await assertReadings(page);
  expect(crossed.reachedDca).toBe(true); expect(crossed.decisionCount).toBe(2);
  await expect(card(page, 'range').locator('[data-planning-reference]')).toContainText(/queen/i);
  await expect(card(page, 'altitude').locator('[data-planning-reference]')).toContainText(/queen/i);
  await expect(readings(page).locator('[data-planning-altitude-band]')).toHaveCount(0);
  await expect(readings(page).locator('[data-planning-cue-height]')).toHaveCount(1);
  await passiveRoundTrip(page); expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'planning-readings-actual-flight.json'), JSON.stringify({ starting, initial, climbed, afterClimb, crossed, afterEntry }, null, 2));
  expect(errors).toEqual([]);
});

test('Rounded readings preserve raw boundaries, off-scale heights, and genuinely missing values', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const saved = await savedWork(page);
  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, { x: 72.01, z: -600, y: 99.99, energy: 125 * .249,
      reachedLaunch: true, reachedDca: false, reachedQueen: false });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const boundaryHeld = await flight(page), boundary = await assertReadings(page);
  await expect(card(page, 'range').locator('[data-planning-value]')).toHaveText('72 model m');
  await expect(card(page, 'range')).toHaveAttribute('data-reading-status', 'outside');
  await expect(card(page, 'altitude').locator('[data-planning-value]')).toHaveText('100 model ft');
  await expect(card(page, 'altitude')).toHaveAttribute('data-reading-status', 'below');
  await expect(card(page, 'energy').locator('[data-planning-value]')).toHaveText('25%');
  await expect(card(page, 'energy')).toHaveAttribute('data-reading-status', 'low');
  await expect(card(page, 'energy').locator('[data-planning-energy-status]')).toHaveText('Low reserve');
  await expect(card(page, 'range').locator('[data-planning-detail]')).toContainText('<1 model m');
  await expect(card(page, 'altitude').locator('[data-planning-detail]')).toContainText('<1 model ft');
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(boundaryHeld); expect((await flight(page)).reachedDca).toBe(false);
  // A valid position while paused does not manufacture a recorded checkpoint.
  await page.evaluate(() => {
    const w = window as any; Object.assign(w.__testHooks.beehive.droneStateRef.current, { x: 0, y: 115 });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const validPose = await assertReadings(page);
  await expect(card(page, 'range')).toHaveAttribute('data-reading-status', 'within');
  await passiveRoundTrip(page); expect((await flight(page)).reachedDca).toBe(false);
  await page.evaluate(() => {
    const w = window as any; w.__testHooks.beehive.droneStateRef.current.y = 420;
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const offScaleHeld = await flight(page), offScale = await assertReadings(page);
  await expect(card(page, 'altitude').locator('[data-planning-value]')).toHaveText('420 model ft');
  await expect(card(page, 'altitude').locator('[data-planning-detail]')).toContainText(/off.scale|outside.*scale|above.*scale/i);
  await expect(readings(page).locator('[data-planning-altitude-pointer]')).toHaveAttribute('transform', 'translate(284 20)');
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(offScaleHeld);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    delete state.x; delete state.y; delete state.energy;
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  const unknownHeld = await flight(page), unknown = await assertReadings(page);
  for (const kind of ['range', 'altitude', 'energy']) {
    await expect(card(page, kind)).toHaveAttribute('data-reading-status', 'unknown');
    await expect(card(page, kind).locator('[data-planning-value]')).toContainText(/unavailable|not recorded/i);
    await expect(card(page, kind).locator('[data-planning-value]')).not.toHaveText(/^0(?:%| model (?:m|ft))$/);
  }
  await expect(readings(page).locator('[data-planning-altitude-pointer]')).toHaveCount(0);
  await passiveRoundTrip(page); expect(await flight(page)).toEqual(unknownHeld); expect(await savedWork(page)).toEqual(saved);
  fs.writeFileSync(path.join(artifacts, 'planning-readings-boundaries.json'), JSON.stringify({ boundaryHeld, boundary, validPose, offScale, unknown }, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await readings(page).evaluate(async node => {
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
    const cards = Array.from(node.querySelectorAll('[data-planning-reading]'));
    const overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].getAttribute('data-planning-reading') + '/' + cards[j].getAttribute('data-planning-reading'));
    }
    const graphs = Array.from(node.querySelectorAll('svg')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.closest('[data-planning-reading]')!.getBoundingClientRect();
      const marks = Array.from(svg.querySelectorAll('[data-planning-altitude-band], [data-planning-cue-height], [data-planning-altitude-pointer]')).map(mark => {
        const m = mark.getBoundingClientRect();
        return { clipped: m.left < r.left - 1 || m.right > r.right + 1 || m.top < r.top - 1 || m.bottom > r.bottom + 1 };
      });
      return { width: r.width, height: r.height, hidden: svg.getAttribute('aria-hidden'), marks,
        interactive: svg.querySelectorAll('a, button, [tabindex]').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { text, rootFont, overlaps, graphs,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'planning-readings-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.graphs.length).toBeGreaterThan(0);
  for (const graph of result.graphs) {
    expect(graph.contained).toBe(true); expect(graph.hidden).toBe('true'); expect(graph.interactive).toBe(0);
    for (const mark of graph.marks) expect(mark.clipped).toBe(false);
  }
  expect(result.text.length).toBeGreaterThan(8);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Current reading values, reference graphics, and reserve meter remain readable in seven accessible layouts', async ({ page }) => {
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
    await settle(page); await assertReadings(page); await audit(page, mode); await passiveRoundTrip(page);
    await readings(page).screenshot({ path: path.join(artifacts, 'preview-drone-readings-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
