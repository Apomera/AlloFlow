import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_RESULTS_ARTIFACTS || '.codex-artifacts/bee-drone-results-2026-10-15');
const fullRecord = { pacing: 'steps', courseSeed: 20260908, difficulty: 'easy', scenario: 'clear',
  flightModelVersion: 'drone-flight-2', success: false, reachedDca: true, maxAlt: 146, distance: 723,
  energyLeft: 63, energyUnits: 'percent-of-difficulty-reserve', score: 125, routeMarkers: 4, routeMarkerGoal: 10,
  facts: 3, obstacleHits: 1, trafficHits: 2, routePlan: 'balanced', decisionLog: [], telemetry: [],
  custom: { retained: 'Recorded flight metadata.' } };

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const field = (page: Page) => page.locator('#beehive-drone-playfield');
const planner = (page: Page) => page.locator('[data-flight-decision-panel]');
const snapshot = (page: Page) => page.locator('[data-flight-recorded-snapshot]');
const metric = (page: Page, kind: string) => snapshot(page).locator('[data-result-metric="' + kind + '"]');
const milestone = (page: Page, kind: string) => snapshot(page).locator('[data-result-milestone="' + kind + '"]');
const more = (page: Page) => snapshot(page).locator('details[data-result-more]');
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Recorded-results tests exercise the supported graphics fallback'));
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
async function savedWork(page: Page, omitFlight = false) {
  return page.evaluate(omitFlight => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitFlight) delete result.beehive.drone;
    return result;
  }, omitFlight);
}
async function openMore(page: Page) {
  if (!(await more(page).evaluate(node => (node as HTMLDetailsElement).open)))
    await keyboard(page, more(page).locator('summary'), 'Space');
  await expect(more(page)).toHaveAttribute('open', '');
}
async function assertSnapshot(page: Page) {
  const expected = await page.evaluate(() => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhDroneRecordedSnapshot(w.__toolData.beehive.drone.lastRun);
  });
  await expect(snapshot(page)).toHaveCount(1); await expect(snapshot(page)).toBeVisible();
  await expect(snapshot(page)).toHaveAttribute('role', 'region');
  await expect(snapshot(page)).toHaveAttribute('aria-label', 'Recorded flight snapshot');
  await expect(snapshot(page)).toHaveAttribute('aria-live', 'off');
  await expect(snapshot(page).locator('h4').first()).toHaveText('Recorded flight snapshot');
  await expect(snapshot(page).locator('article[data-result-metric]')).toHaveCount(3);
  await expect(snapshot(page).locator('[data-result-milestone]')).toHaveCount(2);
  for (const item of expected.metrics) {
    const node = metric(page, item.id);
    await expect(node).toHaveAttribute('data-result-known', String(item.known));
    await expect(node.locator('h5')).toHaveText(item.label);
    await expect(node.locator('[data-result-value]')).toHaveText(item.value);
    await expect(node.locator('[data-result-detail]')).toHaveText(item.detail);
  }
  for (const item of expected.milestones) {
    const node = milestone(page, item.id);
    await expect(node).toHaveAttribute('data-result-status', item.status);
    await expect(node).toContainText(item.label);
    await expect(node.locator('[data-result-milestone-value]')).toHaveText(item.value);
  }
  const energy = expected.metrics.find((item: any) => item.id === 'energy'), meter = metric(page, 'energy').locator('svg[data-result-energy-meter]');
  await expect(meter).toHaveCount(Number.isFinite(energy.meterPct) ? 1 : 0);
  if (Number.isFinite(energy.meterPct)) {
    await expect(meter).toHaveAttribute('viewBox', '0 0 300 28');
    await expect(meter).toHaveAttribute('aria-hidden', 'true'); await expect(meter).toHaveAttribute('focusable', 'false');
    await expect(meter.locator('text, [tabindex], a, button')).toHaveCount(0);
    expect(Number(await meter.locator('[data-result-energy-fill]').getAttribute('width'))).toBeCloseTo(energy.meterPct * 2.84, 8);
  }
  await expect(more(page).locator('summary')).toHaveText('More recorded measurements');
  await openMore(page);
  await expect(more(page).locator('article[data-result-extra]')).toHaveCount(5);
  for (const item of expected.extras) {
    const node = more(page).locator('[data-result-extra="' + item.id + '"]');
    await expect(node).toHaveAttribute('data-result-known', String(item.known));
    await expect(node.locator('h5')).toHaveText(item.label);
    await expect(node.locator('[data-result-value]')).toHaveText(item.value);
    await expect(node.locator('[data-result-detail]')).toHaveText(item.detail);
  }
  return expected;
}
async function passiveDisclosure(page: Page) {
  const held = await flight(page), saved = await savedWork(page);
  await page.evaluate(() => { const w = window as any; w.__recordedHeldState = w.__testHooks.beehive.droneStateRef.current; });
  await openMore(page); const summary = more(page).locator('summary');
  await keyboard(page, summary, 'Enter'); await expect(more(page)).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused(); await keyboard(page, summary, 'Space'); await expect(more(page)).toHaveAttribute('open', '');
  await expect(summary).toBeFocused(); expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved);
  expect(await page.evaluate(() => { const w = window as any; return w.__recordedHeldState === w.__testHooks.beehive.droneStateRef.current; })).toBe(true);
}

test('Recorded snapshot matches a real maneuver and stays equivalent in active debrief and passive saved review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, fullRecord, true); const colony = await savedWork(page, true), starting = await flight(page);
  await keyboard(page, planner(page).locator('input[name="bee-flight-decision"][value="climb"]'), 'Space');
  await keyboard(page, planner(page).locator('[data-flight-advance-decision]'));
  const climbed = await flight(page); expect(climbed.decisionCount).toBe(1); expect(climbed.y).toBeGreaterThan(starting.y);
  await keyboard(page, planner(page).getByRole('button', { name: 'Record flight and debrief', exact: true }));
  await expect(page.locator('[data-flight-decision-debrief]')).toBeFocused();
  await expect(page.locator('[data-flight-main-debrief]').locator('[data-flight-recorded-snapshot]')).toBeVisible();
  await expect(more(page)).not.toHaveAttribute('open', '');
  const recorded = (await savedWork(page)).beehive.drone.lastRun, active = await assertSnapshot(page);
  expect(recorded.decisionLog).toEqual(climbed.decisionLog);
  expect(recorded.maxAlt).toBe(Math.round(climbed.maxAlt)); expect(recorded.distance).toBe(Math.round(climbed.distance));
  expect(recorded.energyLeft).toBe(Math.round(Math.max(0, climbed.energy) / 125 * 100));
  expect(recorded.energyUnits).toBe('percent-of-difficulty-reserve');
  await expect(metric(page, 'peak').locator('[data-result-value]')).toHaveText(recorded.maxAlt + ' model ft');
  await expect(metric(page, 'distance').locator('[data-result-value]')).toHaveText(recorded.distance + ' model m');
  await expect(metric(page, 'energy').locator('[data-result-value]')).toHaveText(recorded.energyLeft + '%');
  await expect(milestone(page, 'dca').locator('[data-result-milestone-value]')).toHaveText('Not reached');
  await expect(milestone(page, 'queen').locator('[data-result-milestone-value]')).toHaveText('Not intercepted');
  await passiveDisclosure(page); const activeText = await snapshot(page).innerText();
  expect(await savedWork(page, true)).toEqual(colony);
  await keyboard(page, field(page).locator('[data-flight-command-header] [data-flight-end]'));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await expect(page.locator('[data-drone-saved-review-panel]').locator('[data-flight-recorded-snapshot]')).toBeVisible();
  const saved = await assertSnapshot(page); expect(saved).toEqual(active); expect(await snapshot(page).innerText()).toBe(activeText);
  await passiveDisclosure(page); const savedBeforeToggle = await savedWork(page), runtimeBeforeToggle = await flight(page);
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]')); await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await expect(more(page)).toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(savedBeforeToggle);
  expect(await flight(page)).toEqual(runtimeBeforeToggle); expect((await savedWork(page)).beehive.drone.lastRun).toEqual(recorded);
  expect((await savedWork(page)).beehive.drone.custom).toEqual({ retained: 'Flight metadata.' });
  expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'recorded-results-actual-flight.json'), JSON.stringify({ starting, climbed, recorded, active, saved }, null, 2));
  expect(errors).toEqual([]);
});

test('Saved snapshots preserve missing outcomes, legacy energy units, real zero values, and explicit DCA evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const records = [
    { name: 'missing', run: { custom: { retained: 'Missing readings stay missing.' } }, dca: 'Not recorded', queen: 'Not recorded' },
    { name: 'legacy', run: { success: false, reachedDca: true, maxAlt: 118, distance: 743, energyLeft: 7,
      score: 0, nectar: 0, nectarGoal: 10, trafficHits: 0, routePlan: 'balanced', custom: { retained: 'No energy units.' } }, dca: 'Reached', queen: 'Not intercepted' },
    { name: 'zero', run: { success: false, reachedDca: false, maxAlt: 0, distance: 0, energyLeft: 0,
      energyUnits: 'percent-of-difficulty-reserve', score: 0, routeMarkers: 0, routeMarkerGoal: 0, facts: 0, obstacleHits: 0, trafficHits: 0 }, dca: 'Not reached', queen: 'Not intercepted' },
    { name: 'independent-outcomes', run: { success: true, maxAlt: 160, distance: 1200, energyLeft: 63,
      energyUnits: 'percent-of-difficulty-reserve', score: 90 }, dca: 'Not recorded', queen: 'Intercepted' },
    { name: 'outside-percent-scale', run: { success: false, reachedDca: false, maxAlt: 200, distance: 1800,
      energyLeft: 120, energyUnits: 'percent-of-difficulty-reserve', score: 12 }, dca: 'Not reached', queen: 'Not intercepted' },
  ];
  await mount(page); const evidence: any[] = [];
  for (const fixture of records) {
    await page.evaluate(run => {
      const w = window as any; w.__toolData.beehive.drone.lastRun = run;
      w.ReactDOM.flushSync(() => w.__rerender());
    }, fixture.run);
    const before = await savedWork(page), held = await flight(page), shown = await assertSnapshot(page);
    await expect(milestone(page, 'dca').locator('[data-result-milestone-value]')).toHaveText(fixture.dca);
    await expect(milestone(page, 'queen').locator('[data-result-milestone-value]')).toHaveText(fixture.queen);
    if (fixture.name === 'missing') {
      for (const id of ['peak', 'distance', 'energy']) await expect(metric(page, id).locator('[data-result-value]')).toHaveText('Not recorded');
      await expect(metric(page, 'energy').locator('svg[data-result-energy-meter]')).toHaveCount(0);
    } else if (fixture.name === 'legacy') {
      await expect(metric(page, 'energy').locator('[data-result-value]')).toHaveText('7');
      await expect(metric(page, 'energy').locator('[data-result-detail]')).toContainText(/units.*not recorded/i);
      await expect(metric(page, 'energy').locator('[data-result-value]')).not.toContainText('%');
      await expect(metric(page, 'energy').locator('svg[data-result-energy-meter]')).toHaveCount(0);
      await expect(page.locator('[data-drone-saved-coach]')).not.toHaveAttribute('data-drone-saved-coach', 'energy-budget');
      await expect(page.locator('[data-drone-saved-coach]')).not.toContainText(/7%|7 %|thin margin|too little preflight reserve/);
      await expect(more(page).locator('[data-result-extra="conflicts"] [data-result-value]')).not.toHaveText('0');
    } else if (fixture.name === 'zero') {
      await expect(metric(page, 'peak').locator('[data-result-value]')).toHaveText('0 model ft');
      await expect(metric(page, 'distance').locator('[data-result-value]')).toHaveText('0 model m');
      await expect(metric(page, 'energy').locator('[data-result-value]')).toHaveText('0%');
      await expect(metric(page, 'energy').locator('svg[data-result-energy-meter]')).toHaveCount(1);
      await expect(more(page).locator('[data-result-extra="conflicts"] [data-result-value]')).toHaveText('0');
    } else if (fixture.name === 'outside-percent-scale') {
      await expect(metric(page, 'energy').locator('[data-result-value]')).toHaveText('120%');
      await expect(metric(page, 'energy').locator('svg[data-result-energy-meter]')).toHaveCount(0);
    }
    await passiveDisclosure(page); expect(await savedWork(page)).toEqual(before); expect(await flight(page)).toEqual(held);
    expect((await savedWork(page)).beehive.drone.lastRun).toEqual(fixture.run);
    await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
    evidence.push({ name: fixture.name, run: fixture.run, shown });
  }
  fs.writeFileSync(path.join(artifacts, 'recorded-results-fixtures.json'), JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await snapshot(page).evaluate(async node => {
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
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)) });
    }
    const cards = Array.from(node.querySelectorAll('[data-result-metric], [data-result-milestone], [data-result-extra]'));
    const overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].outerHTML.slice(0, 150) + '/' + cards[j].outerHTML.slice(0, 150));
    }
    const graphs = Array.from(node.querySelectorAll('svg[data-result-energy-meter]')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.closest('[data-result-metric]')!.getBoundingClientRect();
      const marks = Array.from(svg.querySelectorAll('[data-result-energy-fill]')).map(mark => {
        const m = mark.getBoundingClientRect();
        return { clipped: m.left < r.left - 1 || m.right > r.right + 1 || m.top < r.top - 1 || m.bottom > r.bottom + 1 };
      });
      return { width: r.width, height: r.height, hidden: svg.getAttribute('aria-hidden'),
        marks,
        interactive: svg.querySelectorAll('a, button, [tabindex], text').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const icons = Array.from(node.querySelectorAll('svg[data-result-icon]')).map(svg => {
      const r = svg.getBoundingClientRect(), parent = svg.parentElement!.getBoundingClientRect();
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
  fs.writeFileSync(path.join(artifacts, 'recorded-results-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.graphs).toHaveLength(1);
  for (const graph of result.graphs) {
    expect(graph.contained).toBe(true); expect(graph.hidden).toBe('true'); expect(graph.interactive).toBe(0);
    expect(graph.marks).toHaveLength(1); for (const mark of graph.marks) expect(mark.clipped).toBe(false);
  }
  expect(result.icons).toHaveLength(5);
  for (const icon of result.icons) { expect(icon.contained).toBe(true); expect(icon.hidden).toBe('true'); expect(icon.interactive).toBe(0); }
  expect(result.text.length).toBeGreaterThan(20);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

test('Recorded metrics, milestone status, and energy meter remain clear across seven accessible layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await assertSnapshot(page); const held = await flight(page), saved = await savedWork(page);
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: mode === 'wide' || mode === 'medium' ? 1800 : 900 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await settle(page); await expect(more(page)).toHaveAttribute('open', ''); await assertSnapshot(page);
    await audit(page, mode); await passiveDisclosure(page);
    await snapshot(page).screenshot({ path: path.join(artifacts, 'preview-drone-results-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    if (mode === 'phone' || mode === '200-percent-text' || mode === 'forced-dark')
      await metric(page, 'energy').screenshot({ path: path.join(artifacts, 'preview-drone-results-energy-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved);
    await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  }
  expect(errors).toEqual([]);
});
