import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_REPLAY_ARTIFACTS || '.codex-artifacts/bee-drone-replay-2026-10-16');
type Sample = { t?: number; altitude?: number; energy?: number; wind?: number; phase?: string; action?: string;
  hazard?: boolean | string; impact?: string; [key: string]: unknown };
const telemetry: Sample[] = [
  { t: 0, altitude: 0, energy: 100, wind: 0, phase: 'launch', action: 'Launch', hazard: false },
  { t: .25, altitude: 18.4, energy: 98.7, wind: .5, phase: 'flight', action: 'Powered climb', hazard: false },
  { t: 2.25, altitude: 120, energy: 70, wind: 1.8, phase: 'flight', action: 'Powered climb', hazard: true, impact: 'Recorded obstacle proximity.' },
  { t: 9, altitude: 110, energy: 68, wind: 2.2, phase: 'congregation', action: 'Follow navigation cue', hazard: false },
  { t: 15, altitude: 90, energy: 64, wind: .7, phase: 'end', action: 'Coast', hazard: false },
];
const fullRecord = { pacing: 'steps', courseSeed: 20260908, difficulty: 'easy', scenario: 'clear',
  flightModelVersion: 'drone-flight-2', success: false, reachedDca: true, maxAlt: 120, distance: 723,
  energyLeft: 64, energyUnits: 'percent-of-difficulty-reserve', score: 125, routeMarkers: 4, routeMarkerGoal: 10,
  facts: 3, obstacleHits: 1, trafficHits: 0, routePlan: 'balanced', decisionLog: [], telemetry,
  custom: { retained: 'Recorded flight metadata.' } };

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const field = (page: Page) => page.locator('#beehive-drone-playfield');
const planner = (page: Page) => page.locator('[data-flight-decision-panel]');
const replay = (page: Page) => page.locator('[data-flight-replay]:visible');
const range = (page: Page) => replay(page).locator('[data-flight-replay-range]');
const lane = (page: Page, id: string) => replay(page).locator('[data-replay-lane="' + id + '"]');
const moment = (page: Page) => replay(page).locator('[data-flight-replay-moment]');
const previous = (page: Page) => replay(page).locator('[data-replay-previous]');
const next = (page: Page) => replay(page).locator('[data-replay-next]');
const bookmark = (page: Page, id: string) => replay(page).locator('[data-flight-replay-bookmark="' + id + '"]');
const rounded = (value: number) => String(Math.round(value * 10) / 10);

async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); await settle(page);
}
async function mount(page: Page, run: Record<string, any> = fullRecord, launch = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(run => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Replay tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Flight metadata.' }, lastRun: run },
      notebook: { drone: { prediction: 'Keep my prediction.', evidence: 'Keep my evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, run);
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  if (launch) {
    await keyboard(page, page.locator('[data-flight-launch="easy"]'));
    await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
    await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  } else await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current || {}, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'maxAlt', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'decisionFeedback',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omit: 'none' | 'replay' | 'flight' = 'none') {
  return page.evaluate(omit => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omit === 'flight') delete result.beehive.drone;
    else if (omit === 'replay') delete result.beehive.drone.replayIndex;
    return result;
  }, omit);
}
async function replaceRun(page: Page, run: Record<string, any>) {
  await page.evaluate(run => { const w = window as any;
    w.__toolData.beehive.drone.lastRun = run; delete w.__toolData.beehive.drone.replayIndex;
    w.ReactDOM.flushSync(() => w.__rerender());
  }, run);
  await settle(page);
}
async function assertSample(page: Page, samples: Sample[], index: number, percent = true) {
  const sample = samples[index];
  await expect(replay(page)).toHaveCount(1); await expect(replay(page)).toHaveClass(/bee-flight-replay/);
  await expect(replay(page).getByRole('heading', { name: 'Recorded flight moments', exact: true })).toBeVisible();
  await expect(range(page)).toHaveAccessibleName('Choose a recorded sample');
  await expect(range(page)).toHaveValue(String(index));
  await expect(replay(page).locator('[data-replay-position]')).toContainText('Sample ' + (index + 1) + ' of ' + samples.length + ' retained');
  await expect(moment(page)).toHaveAttribute('aria-live', 'off');
  await expect(previous(page)).toHaveAccessibleName('Previous sample'); await expect(next(page)).toHaveAccessibleName('Next sample');
  await expect(previous(page)).toHaveAttribute('aria-disabled', String(index === 0));
  await expect(next(page)).toHaveAttribute('aria-disabled', String(index === samples.length - 1));
  const units: Record<string, string> = { altitude: ' model ft', energy: percent ? '%' : ' (units not recorded)', wind: ' m/s' };
  for (const id of ['altitude', 'energy', 'wind']) {
    const value = sample[id];
    await expect(lane(page, id).locator('[data-replay-value]')).toHaveText(Number.isFinite(value) ? rounded(value as number) + units[id] : 'Not recorded');
    await expect(lane(page, id).getByRole('heading')).toBeVisible();
    const chart = lane(page, id).locator('svg[data-replay-chart="' + id + '"]');
    await expect(chart).toHaveAttribute('viewBox', '0 0 640 96');
    await expect(chart.locator('text, [tabindex], a, button')).toHaveCount(0);
    await expect(lane(page, id).locator('[data-replay-scale-min]')).toBeVisible();
    await expect(lane(page, id).locator('[data-replay-scale-max]')).toBeVisible();
  }
  if (!percent && Number.isFinite(sample.energy)) {
    await expect(lane(page, 'energy')).toContainText(/units not recorded/i);
    await expect(lane(page, 'energy')).not.toContainText('%');
    await expect(moment(page)).not.toContainText(/\d\s*%|energy warning|protect the reserve/i);
    await expect(range(page)).not.toHaveAttribute('aria-valuetext', /%|percent/i);
  }
  if (sample.action) await expect(moment(page)).toContainText(sample.action);
  const hazard = sample.hazard === true ? 'Hazard flagged' : sample.hazard === false ? 'No hazard flagged' : 'Hazard status not recorded';
  await expect(moment(page)).toContainText(hazard);
}
async function assertOnlyReplayChanged(page: Page, saved: any, held: any) {
  expect(await savedWork(page, 'replay')).toEqual(saved); expect(await flight(page)).toEqual(held);
}
async function firstAndLast(page: Page, samples: Sample[], percent = true) {
  await keyboard(page, range(page), 'Home'); await assertSample(page, samples, 0, percent);
  await keyboard(page, previous(page)); await assertSample(page, samples, 0, percent); await expect(previous(page)).toBeFocused();
  if (samples.length > 1) {
    await keyboard(page, next(page)); await assertSample(page, samples, 1, percent); await expect(next(page)).toBeFocused();
    await keyboard(page, previous(page)); await assertSample(page, samples, 0, percent); await expect(previous(page)).toBeFocused();
  }
  await keyboard(page, range(page), 'End'); await assertSample(page, samples, samples.length - 1, percent);
  await keyboard(page, next(page)); await assertSample(page, samples, samples.length - 1, percent); await expect(next(page)).toBeFocused();
}

test('Recorded replay navigation matches a real flight in debrief and saved review while only changing the replay position', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, fullRecord, true); const colony = await savedWork(page, 'flight');
  for (const action of ['climb', 'coast', 'navigate']) {
    await keyboard(page, planner(page).locator('input[name="bee-flight-decision"][value="' + action + '"]'), 'Space');
    await keyboard(page, planner(page).locator('[data-flight-advance-decision]'));
  }
  const beforeFinish = await flight(page);
  await keyboard(page, planner(page).getByRole('button', { name: 'Record flight and debrief', exact: true }));
  await expect(page.locator('[data-flight-decision-debrief]')).toBeFocused();
  const recorded = (await savedWork(page)).beehive.drone.lastRun, samples: Sample[] = recorded.telemetry;
  expect(samples.length).toBeGreaterThan(2); expect(samples).toEqual(beforeFinish.telemetry);
  expect(recorded.energyUnits).toBe('percent-of-difficulty-reserve');
  const held = await flight(page), saved = await savedWork(page, 'replay');
  await page.evaluate(() => { const w = window as any; w.__replayHeldState = w.__testHooks.beehive.droneStateRef.current; });
  await firstAndLast(page, samples); await assertOnlyReplayChanged(page, saved, held);
  await keyboard(page, bookmark(page, 'launch')); await assertSample(page, samples, 0); await expect(bookmark(page, 'launch')).toBeFocused();
  await keyboard(page, bookmark(page, 'finish')); await assertSample(page, samples, samples.length - 1);
  expect(await page.evaluate(() => { const w = window as any; return w.__replayHeldState === w.__testHooks.beehive.droneStateRef.current; })).toBe(true);
  const activeText = await replay(page).innerText();
  expect(await savedWork(page, 'flight')).toEqual(colony);
  await keyboard(page, field(page).locator('[data-flight-command-header] [data-flight-end]'));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await assertSample(page, samples, samples.length - 1); expect(await replay(page).innerText()).toBe(activeText);
  const heldSaved = await flight(page), savedReview = await savedWork(page, 'replay');
  await firstAndLast(page, samples); await assertOnlyReplayChanged(page, savedReview, heldSaved);
  await keyboard(page, range(page), 'Home'); await keyboard(page, range(page), 'ArrowRight');
  await assertSample(page, samples, 1); await expect(range(page)).toBeFocused();
  expect((await savedWork(page)).beehive.drone.replayIndex).toBe(1);
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]')); await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await assertSample(page, samples, 1); await assertOnlyReplayChanged(page, savedReview, heldSaved);
  expect((await savedWork(page)).beehive.drone.lastRun).toEqual(recorded); expect(await savedWork(page, 'flight')).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'replay-actual-flight.json'), JSON.stringify({ recorded, held, heldSaved }, null, 2));
  expect(errors).toEqual([]);
});

test('Replay preserves legacy units, zero and missing readings, irregular timing, strict hazard flags, and overlapping key moments', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); let held = await flight(page), saved = await savedWork(page, 'replay');
  await keyboard(page, range(page), 'Home'); await keyboard(page, next(page)); await assertSample(page, telemetry, 1);
  await expect(moment(page).locator('[data-replay-energy-change]')).toHaveText('Energy change: 1.3 percentage points lower');
  await expect(replay(page).locator('[data-replay-hazard="2"]')).toHaveCount(3);
  await expect(replay(page).locator('[data-replay-selected]')).toHaveCount(3);
  const graph = await lane(page, 'energy').locator('[data-flight-replay-trace="energy"]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('points')));
  expect(graph).toHaveLength(1);
  const points = graph[0]!.trim().split(/\s+/).map(point => point.split(',').map(Number));
  const start = points[0][0], span = points[4][0] - start;
  expect(span).toBeGreaterThan(0); expect((points[1][0] - start) / span).toBeCloseTo(.25 / 15, 3);
  expect((points[3][0] - start) / span).toBeCloseTo(9 / 15, 3);
  await expect(lane(page, 'energy').locator('[data-replay-scale-min]')).toContainText('0');
  await expect(lane(page, 'energy').locator('[data-replay-scale-max]')).toContainText('100');
  await assertOnlyReplayChanged(page, saved, held);

  const legacySamples: Sample[] = [{ t: 0, altitude: 0, energy: 0, wind: 0, phase: 'congregation', action: 'Legacy zero readings', hazard: true }];
  const legacy = { telemetry: legacySamples, energyLeft: 0, custom: { retained: 'Legacy unknown units.' } };
  await replaceRun(page, legacy); held = await flight(page); saved = await savedWork(page, 'replay');
  await assertSample(page, legacySamples, 0, false);
  await expect(replay(page).locator('[data-flight-replay-bookmark]')).toHaveCount(5);
  for (const id of ['launch', 'first-hazard', 'peak-altitude', 'dca', 'finish']) {
    await expect(bookmark(page, id)).toHaveAttribute('aria-pressed', 'true');
    await keyboard(page, bookmark(page, id)); await expect(bookmark(page, id)).toBeFocused();
    await assertSample(page, legacySamples, 0, false);
  }
  await firstAndLast(page, legacySamples, false); await assertOnlyReplayChanged(page, saved, held);

  const missing: Sample[] = [
    { t: 0, altitude: 0, energy: 0, wind: 0, phase: 'launch', action: 'Zero readings', hazard: 'false' },
    { phase: 'flight', action: 'Readings not retained', hazard: 'true' },
    { t: 7, altitude: 30, energy: 4, wind: 1, phase: 'end', action: 'Recorded finish', hazard: false },
  ];
  await replaceRun(page, { telemetry: missing, custom: { retained: 'Missing readings remain missing.' } });
  held = await flight(page); saved = await savedWork(page, 'replay');
  await expect(replay(page)).toContainText(/sample order/i);
  await expect(bookmark(page, 'first-hazard')).toHaveCount(0); await expect(replay(page).locator('[data-replay-hazard]')).toHaveCount(0);
  for (const id of ['altitude', 'energy', 'wind']) {
    await expect(lane(page, id).locator('[data-flight-replay-trace="' + id + '"]')).toHaveCount(2);
    await expect(lane(page, id).locator('polyline[data-flight-replay-trace]')).toHaveCount(0);
  }
  // Saved-state recovery requires finite time and altitude. Check optional gaps
  // with recoverable samples when navigating; malformed rendering was checked above.
  const recoverableMissing: Sample[] = [
    { t: 3, altitude: 0, energy: 0, wind: 0, phase: 'launch', action: 'Zero readings' },
    { t: 2, altitude: 18, phase: 'flight', action: 'Energy and wind not retained' },
    { t: 7, altitude: 30, energy: 4, wind: 1, phase: 'end', action: 'Recorded finish', hazard: false },
  ];
  await replaceRun(page, { telemetry: recoverableMissing, custom: { retained: 'Optional gaps remain missing.' } });
  held = await flight(page); saved = await savedWork(page, 'replay');
  await expect(lane(page, 'altitude').locator('polyline[data-flight-replay-trace]')).toHaveCount(1);
  for (const id of ['energy', 'wind']) {
    await expect(lane(page, id).locator('[data-flight-replay-trace="' + id + '"]')).toHaveCount(2);
    await expect(lane(page, id).locator('polyline[data-flight-replay-trace]')).toHaveCount(0);
  }
  await keyboard(page, range(page), 'Home'); await keyboard(page, next(page)); await assertSample(page, recoverableMissing, 1, false);
  await expect(moment(page)).toContainText(/energy change.*not recorded|energy change.*unavailable|cannot compare/i);
  await keyboard(page, next(page)); await assertSample(page, recoverableMissing, 2, false);
  await expect(moment(page)).toContainText(/energy change.*not recorded|energy change.*unavailable|cannot compare/i);
  await assertOnlyReplayChanged(page, saved, held);

  const unordered = [{ ...telemetry[0], t: 8 }, { ...telemetry[1], t: 2 }, { ...telemetry[4], t: 9 }];
  await replaceRun(page, { ...fullRecord, telemetry: unordered }); held = await flight(page); saved = await savedWork(page, 'replay');
  await expect(replay(page)).toContainText(/sample order/i); await firstAndLast(page, unordered);
  const unorderedPoints = (await lane(page, 'altitude').locator('polyline[data-flight-replay-trace]').getAttribute('points'))!
    .trim().split(/\s+/).map(point => point.split(',').map(Number));
  expect(unorderedPoints[1][0] - unorderedPoints[0][0]).toBeCloseTo(unorderedPoints[2][0] - unorderedPoints[1][0], 1);
  await assertOnlyReplayChanged(page, saved, held);
  await replaceRun(page, { telemetry: [], custom: { retained: 'Empty recordings remain empty.' } });
  held = await flight(page); saved = await savedWork(page, 'replay');
  await expect(replay(page)).toHaveAttribute('data-replay-empty', 'true');
  await expect(replay(page)).toContainText('No telemetry was recorded for this run.');
  await expect(replay(page).locator('input, button, svg')).toHaveCount(0);
  await assertOnlyReplayChanged(page, saved, held); expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await replay(page).evaluate(async node => {
    const box = node.getBoundingClientRect(), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect(); if (!(el instanceof HTMLElement) || rect.width <= 0 || rect.height <= 0) return false;
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
      const bound = (value.parentElement.closest('[data-replay-lane]') || node).getBoundingClientRect();
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < bound.left - 1 || r.right > bound.right + 1 || r.top < bound.top - 1 || r.bottom > bound.bottom + 1)) });
    }
    const cards = Array.from(node.querySelectorAll('[data-replay-lane]')), overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].getAttribute('data-replay-lane') + '/' + cards[j].getAttribute('data-replay-lane'));
    }
    const graphs = Array.from(node.querySelectorAll('svg[data-replay-chart]')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.closest('[data-replay-lane]')!.getBoundingClientRect();
      const labelled = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '');
      return { width: r.width, height: r.height, role: svg.getAttribute('role'), labelled,
        interactive: svg.querySelectorAll('a, button, [tabindex], text').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const axes = Array.from(node.querySelectorAll('.bee-replay-x-axis')).map(axis => {
      const ends = Array.from(axis.children).map(el => el.getBoundingClientRect());
      return { sameRow: Math.abs(ends[0].top - ends[1].top) <= 1, ordered: ends[0].right <= ends[1].left,
        labels: Array.from(axis.children).map(el => el.textContent), caption: axis.nextElementSibling?.textContent };
    });
    const selectedMarks = Array.from(node.querySelectorAll('[data-replay-selected]')).map(el => ({
      selectedWidth: Number(el.getAttribute('stroke-width')), hazardWidth: Number(el.parentElement!.querySelector('[data-replay-hazard]')!.getAttribute('stroke-width')),
      dashed: !!el.getAttribute('stroke-dasharray'),
    }));
    const controls = Array.from(node.querySelectorAll('button, input[type="range"]')).filter(el => visible.includes(el));
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { text, rootFont, overlaps, graphs, axes, selectedMarks,
      controls: controls.map(el => ({ name: el.getAttribute('aria-label') || el.textContent, height: el.getBoundingClientRect().height })),
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'replay-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.graphs).toHaveLength(3);
  expect(result.axes).toHaveLength(3);
  for (const axis of result.axes) {
    expect(axis.sameRow).toBe(true); expect(axis.ordered).toBe(true);
    expect(axis.labels).toEqual(['0', '15']); expect(axis.caption).toBe('Time (model seconds)');
  }
  for (const mark of result.selectedMarks) { expect(mark.dashed).toBe(true); expect(mark.selectedWidth).toBeGreaterThan(mark.hazardWidth); }
  for (const graph of result.graphs) {
    expect(graph.contained).toBe(true); expect(graph.role).toBe('img'); expect(graph.interactive).toBe(0); expect(graph.height).toBeGreaterThanOrEqual(60);
    expect(graph.labelled).toHaveLength(2); for (const label of graph.labelled) expect(label.length).toBeGreaterThan(20);
  }
  expect(result.text.length).toBeGreaterThan(20);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  for (const item of result.controls) expect(item.height, item.name || '').toBeGreaterThanOrEqual(43);
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Replay lanes, clear scales, and keyboard controls stay readable across seven accessible layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await keyboard(page, bookmark(page, 'first-hazard')); await assertSample(page, telemetry, 2);
  const held = await flight(page), saved = await savedWork(page, 'replay');
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any;
      w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await settle(page); await assertSample(page, telemetry, 2);
    await keyboard(page, next(page)); await assertSample(page, telemetry, 3); await expect(next(page)).toBeFocused();
    await keyboard(page, previous(page)); await assertSample(page, telemetry, 2); await expect(previous(page)).toBeFocused();
    await audit(page, mode);
    await replay(page).screenshot({ path: path.join(artifacts, 'preview-drone-replay-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    await assertOnlyReplayChanged(page, saved, held); await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  }
  expect(errors).toEqual([]);
});
