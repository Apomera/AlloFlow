import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function frame(page: Page, index: number) { return panel(page).locator('[data-interior-frame="' + index + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
const roleIds = ['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty'];

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my own observation: <strong>compare frames</strong> & preserve this.', explanation: 'Keep my explanation.',
      review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { evidence: 'Keep my network writing.', review: { evidence: true } },
    drone: { evidence: 'Keep my flight writing.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my discovery writing.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Hive learning test uses the supported fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive learning test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, seededNotebook());
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
}
async function open(page: Page) {
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
}
async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

const metricIds = ['workers', 'brood', 'honey', 'nectarHoney', 'syrup', 'pollen', 'varroaLevel', 'diseaseRisk', 'morale', 'queenHealth'];
function timing(page: Page) { return page.locator('[data-management-timing]'); }
function metric(page: Page) { return timing(page).locator('[data-preview-timeline-metric]'); }
function projectedDay(page: Page) { return timing(page).locator('[data-preview-timeline-day]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function reading(value: number | null, suffix = '', signed = false) {
  return value === null ? 'Not recorded' : (signed && value > 0 ? '+' : '') + (value === 0 ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix;
}
async function openPreview(page: Page) {
  const preview = page.locator('[data-management-preview]');
  await preview.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(preview).toHaveAttribute('open', ''); await expect(timing(page)).toBeVisible();
}
async function expectedTimeline(page: Page) {
  const selectedChoice = await choice(page).inputValue(), days = Number(await horizon(page).inputValue()), id = await metric(page).inputValue();
  return page.evaluate(({ selectedChoice, days, id }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, state = w.__toolData.beehive;
    const cfg = { params: BH.SIMULATION_PARAMS, subMods: { honey: 1.10, spring: 1, winter: .92, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: state.experimentEnvironment.gardenBonus, hiveEvents: [], diseaseEvents: [], rand: () => 1 };
    const preview = BH.bhPreviewManagementChoice(state, cfg, selectedChoice, days);
    const timeline = BH.bhManagementPreviewTimeline(preview, id);
    return { timeline, daysCompared: preview.daysCompared, action: preview.action, immediate: preview.immediate,
      rawBaseline: preview.baseline?.timeline, rawAction: preview.withAction?.timeline, startDay: state.day };
  }, { selectedChoice, days, id });
}
async function verifyTimeline(page: Page) {
  const expected = await expectedTimeline(page), data = expected.timeline;
  expect(data.available).toBe(true); expect(data.points).toHaveLength(expected.daysCompared);
  expect(data.points[0].day).toBe(expected.startDay + 1); expect(data.points[0].offset).toBe(1);
  for (const [index, point] of data.points.entries()) {
    expect(point.day).toBe(expected.rawBaseline[index].day); expect(point.day).toBe(expected.rawAction[index].day);
    expect(point.offset).toBe(index + 1); expect(point.baseline).toBe(expected.rawBaseline[index][data.metric.id]);
    expect(point.withAction).toBe(expected.rawAction[index][data.metric.id]);
  }
  const actualOptions = await projectedDay(page).locator('option').evaluateAll(nodes => nodes.map(node => ({ value: (node as HTMLOptionElement).value, text: node.textContent })));
  expect(actualOptions).toEqual(data.points.map((point: any) => ({ value: String(point.offset), text: 'Day ' + point.day })));
  const offset = Number(await projectedDay(page).inputValue()), selected = data.points[offset - 1];
  expect(selected).toBeTruthy();
  await expect(timing(page).locator('[data-preview-timeline-context]')).toHaveText('Projected Day ' + selected.day + ' · ' + selected.offset + ' of ' + data.points.length + ' days compared. These are model projections, not observed colony readings.');
  await expect(timing(page).locator('[data-preview-timeline-reading="baseline"]')).toHaveText(reading(selected.baseline, data.metric.suffix));
  await expect(timing(page).locator('[data-preview-timeline-reading="action"]')).toHaveText(reading(selected.withAction, data.metric.suffix));
  await expect(timing(page).locator('[data-preview-timeline-reading="difference"]')).toHaveText(reading(selected.delta, data.metric.suffix, true));
  const chart = timing(page).locator('[data-management-preview-chart]');
  await expect(chart).toHaveAttribute('role', 'img'); await expect(chart.locator('[data-preview-timeline-plot]')).toHaveAttribute('viewBox', '0 0 600 240');
  await expect(chart).toHaveAccessibleName(new RegExp(data.metric.label));
  const firstDay = data.points[0].day, lastDay = data.points[data.points.length - 1].day;
  const x = (day: number) => lastDay === firstDay ? 300 : 16 + (day - firstDay) / (lastDay - firstDay) * 568;
  const y = (value: number) => 224 - (value - data.min) / (data.max - data.min) * 208;
  for (const series of ['baseline', 'action']) {
    const path = chart.locator('[data-preview-timeline-series="' + series + '"]');
    await expect(path).toHaveCount(1);
    const numbers = ((await path.getAttribute('d')) || '').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) || [];
    expect(numbers).toHaveLength(data.points.length * 2);
    for (const [index, point] of data.points.entries()) {
      expect(numbers[index * 2]).toBeCloseTo(x(point.day), 1);
      expect(numbers[index * 2 + 1]).toBeCloseTo(y(series === 'baseline' ? point.baseline : point.withAction), 1);
    }
    const dash = await path.evaluate(node => getComputedStyle(node).strokeDasharray);
    if (series === 'baseline') expect(dash).toMatch(/8(?:px)?[, ]+5(?:px)?/); else expect(dash).toBe('none');
    const marker = chart.locator('[data-preview-timeline-point="' + series + '"]');
    await expect(marker).toHaveCount(1);
    expect(await marker.evaluate(node => node.tagName.toLowerCase())).toBe(series === 'baseline' ? 'circle' : 'rect');
  }
  const cursor = (await chart.locator('[data-preview-timeline-cursor]').getAttribute('d'))!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(cursor[0]).toBeCloseTo(x(selected.day), 1); expect(cursor.slice(1)).toEqual([16, 224]);
  return expected;
}
async function auditTiming(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-management-timing]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  const layout = await timing(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,label,p,strong,span,button,select,h4,figure,figcaption,dt,dd'))];
    return {
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button,select')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}
async function captureTiming(page: Page, testInfo: TestInfo, mode: string) {
  await timing(page).screenshot({ path: testInfo.outputPath('landmarks-' + mode + '.png'), animations: 'disabled' });
}

type LandmarkPoint = { day: number; offset: number; baseline: number | null; withAction: number | null; delta: number | null };
function deriveLandmarks(points: LandmarkPoint[]) {
  const displayed = (value: number) => Number(value.toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false }));
  const paired = points.filter(point => Number.isFinite(point.baseline) && Number.isFinite(point.withAction));
  const known = paired.map(point => ({ ...point, delta: Number((displayed(point.withAction!) - displayed(point.baseline!)).toFixed(3)) }));
  const different = known.filter(point => point.delta !== 0);
  const largestMagnitude = different.reduce((largest, point) => Math.max(largest, Math.abs(point.delta)), 0);
  const largest = different.find(point => Math.abs(point.delta) === largestMagnitude) || null;
  return { first: different[0] || null, largest, changedCount: different.length, sameCount: known.length - different.length,
    recordedCount: known.length, missingCount: points.length - known.length,
    largestCount: different.filter(point => Math.abs(point.delta) === largestMagnitude).length };
}
function landmarks(page: Page) { return timing(page).locator('[data-preview-timeline-landmarks]'); }
function landmarkCard(page: Page, kind: 'first' | 'largest') { return landmarks(page).locator('[data-preview-timeline-landmark="' + kind + '"]'); }
function landmarkJump(page: Page, kind: 'first' | 'largest') { return landmarks(page).locator('[data-preview-timeline-jump="' + kind + '"]'); }
async function verifyLandmarks(page: Page, verifyChart = true) {
  const expected = verifyChart ? await verifyTimeline(page) : await expectedTimeline(page);
  const result = deriveLandmarks(expected.timeline.points), scope = landmarks(page);
  await expect(scope).toBeVisible(); await expect(scope).toHaveAccessibleName(/\S/);
  const status = scope.locator('[data-preview-timeline-landmark-status]');
  await expect(status).toContainText(expected.timeline.metric.label);
  for (const [kind, point, title, label] of [
    ['first', result.first, 'First recorded difference', 'Inspect first difference'],
    ['largest', result.largest, 'Largest recorded gap', 'Inspect largest gap'],
  ] as const) {
    const card = landmarkCard(page, kind), button = landmarkJump(page, kind);
    if (!point) { await expect(card).toHaveCount(0); await expect(button).toHaveCount(0); continue; }
    await expect(card).toContainText(title); await expect(card.locator('[data-landmark-day]')).toHaveText('Day ' + point.day);
    await expect(card.locator('[data-landmark-difference]')).toHaveText(reading(point.delta, expected.timeline.metric.suffix, true));
    await expect(button).toHaveAccessibleName(label); await expect(button).toBeEnabled();
    expect(await button.evaluate(node => node.tagName.toLowerCase())).toBe('button');
  }
  if (result.changedCount === 0) await expect(status).toContainText(new RegExp('match on all ' + result.recordedCount + ' compared days'));
  else await expect(status).toContainText('difference on ' + result.changedCount + ' of ' + result.recordedCount + ' paired projected days');
  if (result.largestCount > 1) await expect(landmarkCard(page, 'largest').locator('[data-landmark-ties]')).toHaveText('This gap size occurs on ' + result.largestCount + ' projected days; Day ' + result.largest!.day + ' is the earliest.');
  else await expect(landmarkCard(page, 'largest').locator('[data-landmark-ties]')).toHaveCount(0);
  return { expected, result };
}
async function jumpToLandmark(page: Page, kind: 'first' | 'largest', point: LandmarkPoint, key: 'Enter' | 'Space') {
  const button = landmarkJump(page, kind); await button.focus(); await page.keyboard.press(key);
  await expect(button).toBeFocused(); await expect(projectedDay(page)).toHaveValue(String(point.offset));
  await verifyTimeline(page); await expect(button).toBeFocused();
}
async function auditLandmarks(page: Page) {
  await auditTiming(page);
  const chartMarks = await timing(page).locator('[data-management-preview-chart] [data-preview-timeline-series], [data-management-preview-chart] [data-preview-timeline-cursor], [data-management-preview-chart] [data-preview-timeline-point]').evaluateAll(nodes => nodes.map(node => ({
    hook: node.getAttribute('data-preview-timeline-series') || node.getAttribute('data-preview-timeline-point') || 'cursor',
    vectorEffect: getComputedStyle(node).vectorEffect,
  })));
  expect(chartMarks).toHaveLength(5);
  for (const mark of chartMarks) expect(mark.vectorEffect, mark.hook + ' keeps its chart stroke visible when scaled').toBe('non-scaling-stroke');
  const violations = await landmarks(page).evaluate(async node => {
    const audit = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => entry.target) }));
  });
  expect(violations).toEqual([]);
  for (const kind of ['first', 'largest'] as const) {
    const button = landmarkJump(page, kind); await button.focus(); await expect(button).toBeFocused();
    const style = await button.evaluate(node => {
      const css = getComputedStyle(node), box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, outlineStyle: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
    });
    expect(style.width).toBeGreaterThanOrEqual(44); expect(style.height).toBeGreaterThanOrEqual(44);
    expect(style.outlineStyle).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
  }
}

test('management timing landmarks independently identify the first difference and largest signed gap across all measures choices and horizons without writing tool data', async ({ page }) => {
  await mount(page); const unchanged = await work(page); await openPreview(page);
  for (const action of ['feed_bees', 'requeen', 'split_colony']) {
    await choice(page).selectOption({ value: action });
    for (const days of [7, 30]) {
      await horizon(page).selectOption({ value: String(days) });
      for (const id of metricIds) {
        await metric(page).selectOption({ value: id }); const { result } = await verifyLandmarks(page);
        if (result.first) await jumpToLandmark(page, 'first', result.first, 'Enter');
        if (result.largest) await jumpToLandmark(page, 'largest', result.largest, 'Space');
        expect(await work(page)).toEqual(unchanged);
      }
    }
  }
});

test('management landmarks distinguish matching early worker projections from delayed differences keep shared endpoints and preserve held hive observations during real feeding', async ({ page }) => {
  await mount(page); const initial = await work(page); await openPreview(page);
  await choice(page).selectOption({ value: 'requeen' }); await metric(page).selectOption({ value: 'workers' });
  await horizon(page).selectOption({ value: '7' });
  const early = await verifyLandmarks(page); expect(early.result.changedCount).toBe(0);
  expect(early.result.recordedCount).toBe(7); await expect(landmarks(page).locator('button')).toHaveCount(0);
  await horizon(page).selectOption({ value: '30' }); const delayed = await verifyLandmarks(page);
  expect(delayed.result.first!.day).toBe(37); expect(delayed.result.first!.offset).toBe(22);
  expect(delayed.result.first!.delta).not.toBe(0); await jumpToLandmark(page, 'first', delayed.result.first!, 'Enter');
  await jumpToLandmark(page, 'largest', delayed.result.largest!, 'Space');
  await horizon(page).selectOption({ value: '7' }); await expect(projectedDay(page)).toHaveValue('7'); await verifyLandmarks(page);
  await metric(page).selectOption({ value: 'queenHealth' }); const queen = await verifyLandmarks(page);
  expect(queen.result.first!.day).toBe(16); await jumpToLandmark(page, 'first', queen.result.first!, 'Space');
  await choice(page).selectOption({ value: 'feed_bees' }); await metric(page).selectOption({ value: 'syrup' }); await verifyLandmarks(page);
  expect(await work(page)).toEqual(initial);
  await horizon(page).selectOption({ value: '30' }); await projectedDay(page).focus(); await page.keyboard.press('End');
  await fixture(page, { day: 95, workers: 510, honey: 0, syrup: 0, pollen: 0, brood: 0, broodCohorts: null, actionPoints: 3 });
  const shortenedState = await work(page), shortened = await verifyLandmarks(page);
  expect(shortened.expected.daysCompared).toBeGreaterThan(0); expect(shortened.expected.daysCompared).toBeLessThan(30);
  await expect(projectedDay(page)).toHaveValue(String(shortened.expected.daysCompared));
  for (const point of [shortened.result.first, shortened.result.largest]) if (point) expect(point.day).toBeLessThanOrEqual(95 + shortened.expected.daysCompared);
  await expect(page.locator('[data-management-preview-results]')).toContainText('Both scenarios use Day ' + (95 + shortened.expected.daysCompared));
  expect(await work(page)).toEqual(shortenedState);
  await fixture(page, { actionPoints: 0 }); const unavailable = await work(page);
  await expect(page.locator('[data-management-preview-readiness]')).toContainText('Need 1 AP');
  await expect(timing(page)).toHaveCount(0); await expect(page.locator('[data-preview-timeline-landmarks]')).toHaveCount(0); expect(await work(page)).toEqual(unavailable);
  await fixture(page, initial.beehive); await choice(page).selectOption({ value: 'requeen' });
  await fixture(page, { queenTransition: { kind: 'requeen', daysRemaining: 2, pendingHealth: 100 } });
  const paused = await work(page); await expect(page.locator('[data-management-preview-readiness]')).toContainText('Queen introduction is already in progress.');
  await expect(page.locator('[data-preview-timeline-landmarks]')).toHaveCount(0); expect(await work(page)).toEqual(paused);
  await fixture(page, { day: 65, queenTransition: null }); await choice(page).selectOption({ value: 'split_colony' });
  const late = await work(page); await expect(page.locator('[data-management-preview-readiness]')).toContainText('Too late in the year');
  await expect(page.locator('[data-preview-timeline-landmarks]')).toHaveCount(0); expect(await work(page)).toEqual(late);
  await fixture(page, initial.beehive); await open(page); await frame(page, 2).click();
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter'); const held = await work(page);
  await panel(page).locator('[data-interior-management]').click(); await expect(choice(page)).toBeFocused();
  await choice(page).selectOption({ value: 'feed_bees' }); await metric(page).selectOption({ value: 'syrup' }); const feed = await verifyLandmarks(page);
  await jumpToLandmark(page, 'first', feed.result.first!, 'Enter'); await jumpToLandmark(page, 'largest', feed.result.largest!, 'Space');
  expect(await work(page)).toEqual(held); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); expect(await work(page)).toEqual(held);
  await page.keyboard.press('Enter'); const fed = await work(page);
  expect(fed.beehive.day).toBe(held.beehive.day); expect(fed.beehive.actionPoints).toBe(held.beehive.actionPoints - 1);
  expect(fed.beehive.honey).toBe(held.beehive.honey + 5); expect(fed.beehive.syrup).toBe(held.beehive.syrup + 5);
  expect(fed.beehive.notebook).toEqual(held.beehive.notebook); expect(fed.otherTool).toEqual(held.otherTool);
  expect(fed.beehive.managementTrail).toHaveLength(held.beehive.managementTrail.length + 1);
  await page.locator('[data-management-return-interior]').click(); await expect(panel(page).locator('[data-interior-held-diagram]')).toBeVisible();
  await expect(panel(page).locator('[data-interior-change="food"] [data-change-difference]')).toHaveText('+5 honey-equivalent lb'); expect(await work(page)).toEqual(fed);
});

test('management timing landmarks retain readable focus and layout in wide phone dark forced colors and enlarged text views', async ({ page }, testInfo) => {
  await mount(page); await openPreview(page); await choice(page).selectOption({ value: 'requeen' });
  await horizon(page).selectOption({ value: '30' }); await metric(page).selectOption({ value: 'workers' });
  const unchanged = await work(page), initial = await verifyLandmarks(page); await jumpToLandmark(page, 'first', initial.result.first!, 'Enter');
  await auditLandmarks(page); await captureTiming(page, testInfo, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  await auditLandmarks(page); await captureTiming(page, testInfo, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await auditLandmarks(page); await captureTiming(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await auditLandmarks(page); await captureTiming(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await auditLandmarks(page); await captureTiming(page, testInfo, 'large-text'); const enlarged = await verifyLandmarks(page);
  await expect(metric(page)).toHaveValue('workers'); await expect(projectedDay(page)).toHaveValue(String(initial.result.first!.offset));
  await jumpToLandmark(page, 'largest', enlarged.result.largest!, 'Space');
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
