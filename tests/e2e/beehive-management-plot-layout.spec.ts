import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const artifactDir = path.resolve('.codex-artifacts/bee-management-plot-2026-10-13');
const metricIds = ['workers', 'brood', 'honey', 'nectarHoney', 'syrup', 'pollen', 'varroaLevel', 'diseaseRisk', 'morale', 'queenHealth'];
const scaleNote = 'The vertical range fits these projections and may not start at zero. Changing the measure or choice can change the scale. Lines can overlap when readings agree; missing values leave gaps.';
function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function context(page: Page) { return page.locator('[data-management-hive-context]'); }
function timing(page: Page) { return page.locator('[data-management-timing]'); }
function inspector(page: Page) { return timing(page).locator('[data-preview-timeline-inspector]'); }
function navigation(page: Page) { return timing(page).locator('[data-preview-timeline-day-navigation]'); }
function step(page: Page, direction: 'previous' | 'next') { return navigation(page).locator('[data-preview-timeline-step="' + direction + '"]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function metric(page: Page) { return page.locator('[data-preview-timeline-metric]'); }
function dayChoice(page: Page) { return page.locator('[data-preview-timeline-day]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in this study test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep my own observation <strong>as text</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
}
async function openStudy(page: Page) {
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await interior(page).locator('[data-interior-frame="2"]').click();
  await interior(page).locator('[data-interior-topic="pollen"]').click();
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(choice(page)).toBeFocused();
}
async function heldMarks(page: Page) {
  return interior(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
}
function format(value: number | null, suffix = '', signed = false) {
  return value === null ? 'Not recorded' : (signed && value > 0 ? '+' : '') + (value === 0 ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix;
}
async function expectedTimeline(page: Page) {
  const selectedChoice = await choice(page).inputValue(), days = Number(await horizon(page).inputValue()), id = await metric(page).inputValue();
  return page.evaluate(({ selectedChoice, days, id }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, state = w.__toolData.beehive;
    const cfg = { params: BH.SIMULATION_PARAMS, subMods: { honey: 1.1, spring: 1, winter: .92, varroa: 1 },
      siteMods: { forage: 1, disease: 1 }, gardenBonus: state.experimentEnvironment.gardenBonus,
      hiveEvents: [], diseaseEvents: [], rand: () => { throw Error('Live random draw used'); } };
    const preview = BH.bhPreviewManagementChoice(state, cfg, selectedChoice, days);
    return { timeline: BH.bhManagementPreviewTimeline(preview, id), action: preview.action,
      rawBaseline: preview.baseline.timeline, rawAction: preview.withAction.timeline };
  }, { selectedChoice, days, id });
}
async function verifyPlot(page: Page, expected?: Awaited<ReturnType<typeof expectedTimeline>>) {
  const data = expected || await expectedTimeline(page), timeline = data.timeline;
  expect(timeline.available).toBe(true);
  const selected = timeline.points[Number(await dayChoice(page).inputValue()) - 1]; expect(selected).toBeTruthy();
  const figure = timing(page).locator('.bee-management-timing-chart');
  const chart = figure.locator('[data-management-preview-chart]'), plot = chart.locator('[data-preview-timeline-plot]');
  await expect(chart).toHaveCount(1); await expect(chart).toHaveAttribute('role', 'img');
  expect(await chart.getAttribute('viewBox')).toBeNull();
  await expect(figure.locator('[role="img"]')).toHaveCount(1);
  await expect(plot).toHaveCount(1); await expect(plot).toHaveAttribute('viewBox', '0 0 600 240');
  await expect(plot).toHaveAttribute('preserveAspectRatio', 'none'); await expect(plot).toHaveAttribute('focusable', 'false');
  await expect(plot).toHaveAttribute('width', '100%'); await expect(plot).toHaveAttribute('height', '100%');
  expect(await plot.evaluate(node => node.parentElement?.getAttribute('aria-hidden'))).toBe('true');
  await expect(figure.locator('[data-preview-timeline-bound="top"]')).toHaveText('Top: ' + format(timeline.max, timeline.metric.suffix));
  await expect(figure.locator('[data-preview-timeline-bound="bottom"]')).toHaveText('Bottom: ' + format(timeline.min, timeline.metric.suffix));
  await expect(chart).toHaveAccessibleName(new RegExp('Vertical scale from ' + escapeRegex(format(timeline.min, timeline.metric.suffix)) + ' to ' + escapeRegex(format(timeline.max, timeline.metric.suffix)) + '\\.'));
  expect(await figure.evaluate(node => {
    const selectors = ['figcaption', '[data-preview-timeline-bound="top"]', '.bee-management-timing-plot', '[data-preview-timeline-bound="bottom"]', '.bee-management-timing-days'];
    const elements = selectors.map(selector => node.querySelector(selector)!);
    return elements.every((element, index) => !!element && (!index || !!(elements[index - 1].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)));
  })).toBe(true);
  await expect(figure.locator('.bee-management-timing-days')).toHaveText('Day ' + timeline.points[0].day + 'Day ' + timeline.points[timeline.points.length - 1].day);
  const first = timeline.points[0].day, last = timeline.points[timeline.points.length - 1].day;
  const x = (point: any) => last === first ? 300 : 16 + (point.day - first) / (last - first) * 568;
  const y = (value: number) => 224 - (value - timeline.min) / (timeline.max - timeline.min) * 208;
  const expectedPath = (key: string) => {
    let continuous = false, path = '';
    for (const point of timeline.points) {
      if (!Number.isFinite(point[key])) { continuous = false; continue; }
      path += (continuous ? ' L' : ' M') + x(point).toFixed(2) + ' ' + y(point[key]).toFixed(2); continuous = true;
    }
    return path.trim();
  };
  expect(await plot.locator('.bee-timing-grid').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(['M16 16H584', 'M16 120H584', 'M16 224H584']);
  await expect(plot.locator('[data-preview-timeline-cursor]')).toHaveAttribute('d', 'M' + x(selected).toFixed(2) + ' 16V224');
  for (const branch of ['baseline', 'action'] as const) {
    const key = branch === 'baseline' ? 'baseline' : 'withAction';
    const series = plot.locator('[data-preview-timeline-series="' + branch + '"]');
    await expect(series).toHaveAttribute('d', expectedPath(key));
    const marker = chart.locator('[data-preview-timeline-point="' + branch + '"]');
    if (!Number.isFinite(selected[key])) { await expect(marker).toHaveCount(0); continue; }
    await expect(marker).toHaveCount(1);
    expect(await marker.evaluate(node => node.tagName.toLowerCase())).toBe(branch === 'baseline' ? 'circle' : 'rect');
    expect(await marker.evaluate(node => node.parentElement?.getAttribute('aria-hidden'))).toBe('true');
    expect(await marker.evaluate(node => node.closest('[data-preview-timeline-plot]'))).toBeNull();
    await expect(marker).toHaveAttribute(branch === 'baseline' ? 'cx' : 'x', String(x(selected) / 600 * 100) + '%');
    await expect(marker).toHaveAttribute(branch === 'baseline' ? 'cy' : 'y', String(y(selected[key]) / 240 * 100) + '%');
    if (branch === 'baseline') await expect(marker).toHaveAttribute('r', '6');
    else { await expect(marker).toHaveAttribute('width', '10'); await expect(marker).toHaveAttribute('height', '10'); await expect(marker).toHaveAttribute('transform', 'translate(-5 -5)'); }
    const dimensions = await marker.evaluate((node, coords) => {
      const outer = node.closest('[data-management-preview-chart]')!, plot = outer.querySelector('[data-preview-timeline-plot]')! as SVGSVGElement;
      const rect = node.getBoundingClientRect(), frame = outer.parentElement!.getBoundingClientRect();
      const point = new DOMPoint(coords.x, coords.y).matrixTransform(plot.getScreenCTM()!);
      const stroke = parseFloat(getComputedStyle(node).strokeWidth) / 2;
      return { width: rect.width, height: rect.height, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2,
        pointX: point.x, pointY: point.y, contained: rect.left - stroke >= frame.left && rect.right + stroke <= frame.right && rect.top - stroke >= frame.top && rect.bottom + stroke <= frame.bottom };
    }, { x: x(selected), y: y(selected[key]) });
    expect(dimensions.width).toBeCloseTo(branch === 'baseline' ? 12 : 10, 2);
    expect(dimensions.height).toBeCloseTo(branch === 'baseline' ? 12 : 10, 2);
    expect(dimensions.centerX).toBeCloseTo(dimensions.pointX, 1); expect(dimensions.centerY).toBeCloseTo(dimensions.pointY, 1);
    expect(dimensions.contained).toBe(true);
    await expect(inspector(page).locator('[data-preview-timeline-reading="' + branch + '"]')).toHaveText(format(selected[key], timeline.metric.suffix));
  }
  const strokes = await plot.locator('path').evaluateAll(nodes => nodes.map(node => ({ effect: getComputedStyle(node).vectorEffect, width: parseFloat(getComputedStyle(node).strokeWidth) })));
  expect(strokes).toHaveLength(6); strokes.forEach(item => expect(item.effect).toBe('non-scaling-stroke'));
  const dimension = await chart.evaluate(node => ({ height: node.getBoundingClientRect().height, overflow: getComputedStyle(node).overflow }));
  expect(dimension.height).toBeGreaterThanOrEqual(238); expect(dimension.overflow).toBe('visible');
  await expect(figure.locator('[data-preview-timeline-scale-note]')).toHaveText(scaleNote);
  return data;
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
async function pressStep(page: Page, direction: 'previous' | 'next', key: 'Enter' | 'Space') {
  await step(page, direction).focus(); await page.keyboard.press(key); await expect(step(page, direction)).toBeFocused();
}

test('management plot keeps exact shared bounds geometry and full size selected marks across ten measures and both horizons', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); const initial = await work(page), marks = await heldMarks(page);
  await expect(metric(page).locator('option')).toHaveCount(10);
  for (const days of [7, 30]) {
    await horizon(page).selectOption(String(days));
    for (const action of ['feed_bees', 'requeen', 'split_colony']) {
      await choice(page).selectOption(action);
      const measures = action === 'feed_bees' ? metricIds : action === 'requeen' ? ['queenHealth', 'brood'] : ['workers', 'pollen'];
      for (const id of measures) {
        await metric(page).selectOption(id); await dayChoice(page).selectOption('1'); const expected = await verifyPlot(page);
        await dayChoice(page).selectOption(String(expected.timeline.points.length)); await verifyPlot(page, expected);
        expect(await work(page)).toEqual(initial);
      }
    }
  }
  expect(await heldMarks(page)).toEqual(marks); expect(errors).toEqual([]);
});

test('management plot handles constant zero and small ranges plus short projections while keyboard controls retain the selected reading', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); await choice(page).selectOption('feed_bees'); await horizon(page).selectOption('7');
  const initial = await work(page), marks = await heldMarks(page);
  await metric(page).selectOption('queenHealth'); const constant = await verifyPlot(page);
  expect(new Set(constant.timeline.points.flatMap((point: any) => [point.baseline, point.withAction])).size).toBe(1);
  expect(constant.timeline.min).toBeLessThan(constant.timeline.points[0].baseline); expect(constant.timeline.max).toBeGreaterThan(constant.timeline.points[0].baseline);
  await fixture(page, { diseaseRisk: 0 }); await metric(page).selectOption('diseaseRisk'); const zero = await verifyPlot(page);
  expect(zero.timeline.points.every((point: any) => point.baseline === 0 && point.withAction === 0)).toBe(true);
  expect(zero.timeline.min).toBe(0); expect(zero.timeline.max).toBe(1);
  await fixture(page, { day: 95, diseaseRisk: 1 }); const small = await verifyPlot(page);
  expect(small.timeline.max - small.timeline.min).toBeGreaterThan(0); expect(small.timeline.max - small.timeline.min).toBeLessThanOrEqual(1);
  expect(small.timeline.points.some((point: any) => point.baseline === 0)).toBe(true);
  await fixture(page, initial.beehive); await choice(page).selectOption('requeen'); await metric(page).selectOption('workers'); await horizon(page).selectOption('30');
  const expected = await expectedTimeline(page);
  const landmarks = await page.evaluate(timeline => (window as any).__RR_TEST_EXPORTS__.beehive.bhManagementTimelineLandmarks(timeline), expected.timeline);
  for (const [id, point] of [['first', landmarks.firstDifference], ['largest', landmarks.largestDifference]] as const) {
    expect(point).toBeTruthy(); const jump = timing(page).locator('[data-preview-timeline-jump="' + id + '"]');
    await jump.focus(); await page.keyboard.press('Enter'); await expect(jump).toBeFocused(); await expect(dayChoice(page)).toHaveValue(String(point.offset)); await verifyPlot(page, expected);
  }
  await dayChoice(page).selectOption('1'); await pressStep(page, 'previous', 'Space'); await expect(dayChoice(page)).toHaveValue('1');
  await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue('2'); await verifyPlot(page, expected);
  await dayChoice(page).selectOption('30'); await horizon(page).selectOption('7'); await expect(dayChoice(page)).toHaveValue('7'); await verifyPlot(page);
  await pressStep(page, 'next', 'Space'); await expect(dayChoice(page)).toHaveValue('7'); expect(await work(page)).toEqual(initial);
  await choice(page).selectOption('feed_bees'); await horizon(page).selectOption('30'); await dayChoice(page).selectOption('30');
  await fixture(page, { day: 95, workers: 510, honey: 0, syrup: 0, pollen: 0, brood: 0, broodCohorts: null, actionPoints: 3 });
  const shortenedState = await work(page), shortened = await verifyPlot(page), count = shortened.timeline.points.length;
  expect(count).toBeGreaterThan(0); expect(count).toBeLessThan(30); await expect(dayChoice(page)).toHaveValue(String(count));
  await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue(String(count)); expect(await work(page)).toEqual(shortenedState);
  await fixture(page, { workers: 501 }); const oneDayState = await work(page), oneDay = await verifyPlot(page); expect(oneDay.timeline.points).toHaveLength(1);
  for (const direction of ['previous', 'next'] as const) {
    await pressStep(page, direction, 'Space'); await expect(dayChoice(page)).toHaveValue('1'); await verifyPlot(page, oneDay);
  }
  expect(await work(page)).toEqual(oneDayState); expect(await heldMarks(page)).toEqual(marks);
  await fixture(page, { actionPoints: 0 }); const unavailable = await work(page);
  await expect(timing(page)).toHaveCount(0); await expect(page.locator('[data-management-preview-chart]')).toHaveCount(0); expect(await work(page)).toEqual(unavailable);
  await fixture(page, initial.beehive); await verifyPlot(page); expect(await work(page)).toEqual(initial); expect(errors).toEqual([]);
});

async function capture(page: Page, mode: string) {
  const position = await timing(page).locator('.bee-management-timing-chart').evaluate(node => {
    const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height, x: box.x, width: box.width };
  });
  fs.mkdirSync(artifactDir, { recursive: true });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const scroll = await page.evaluate(() => window.scrollY), y = position.top + offset - scroll;
    expect(y).toBeGreaterThanOrEqual(0); const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-management-plot-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifactDir, file), animations: 'disabled', fullPage: false, clip: { x: position.x, y, width: position.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifactDir, 'preview-management-plot-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('management plot scale labels lines and selected symbols stay readable in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); await choice(page).selectOption('requeen'); await horizon(page).selectOption('30');
  await metric(page).selectOption('workers'); await dayChoice(page).selectOption('21'); const initial = await work(page), marks = await heldMarks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') { await page.emulateMedia({ forcedColors: 'none' }); await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; }); }
    const violations = await timing(page).evaluate(async node => {
      const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => entry.target) }));
    }); expect(violations).toEqual([]);
    const layout = await timing(page).evaluate(node => {
      const elements = [node, ...Array.from(node.querySelectorAll('div,label,p,strong,span,button,select,h4,h5,figure,figcaption,dt,dd'))], font = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, excess: el.scrollWidth - el.clientWidth })),
        text: elements.slice(1).map(el => ({ size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
        controls: Array.from(node.querySelectorAll('button,select')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    layout.text.forEach(item => { expect(item.size).toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); });
    layout.controls.forEach(item => { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); });
    for (const direction of ['previous', 'next'] as const) {
      await step(page, direction).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(step(page, direction)).toBeFocused();
      const focus = await step(page, direction).evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
      expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
    }
    await dayChoice(page).selectOption('1'); const expected = await verifyPlot(page);
    await dayChoice(page).selectOption('30'); await verifyPlot(page, expected);
    await dayChoice(page).selectOption('21'); await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue('22');
    await pressStep(page, 'previous', 'Space'); await expect(dayChoice(page)).toHaveValue('21'); await verifyPlot(page, expected);
    await capture(page, mode); expect(await heldMarks(page)).toEqual(marks);
    expect(await work(page)).toEqual(mode === 'wide' ? initial : { ...initial, beehive: { ...initial.beehive, focusLayout: false } });
  }
  expect(errors).toEqual([]);
});
