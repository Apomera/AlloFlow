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

const artifactDir = path.resolve('.codex-artifacts/bee-day-inspector-2026-10-12');
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
async function verifySelectedDay(page: Page, expected?: Awaited<ReturnType<typeof expectedTimeline>>) {
  const data = expected || await expectedTimeline(page), timeline = data.timeline;
  expect(timeline.available).toBe(true);
  const offset = Number(await dayChoice(page).inputValue()), selected = timeline.points[offset - 1]; expect(selected).toBeTruthy();
  const baseline = data.rawBaseline[offset - 1][timeline.metric.id], action = data.rawAction[offset - 1][timeline.metric.id];
  const displayed = (value: number) => Number(value.toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false }));
  const delta = Math.round((displayed(action) - displayed(baseline)) * 1000) / 1000;
  await expect(navigation(page)).toHaveAttribute('role', 'group'); await expect(navigation(page)).toHaveAccessibleName('Step through projected days');
  await expect(navigation(page).locator('[data-preview-timeline-selected-day]')).toHaveText('Selected: Day ' + selected.day + ' · ' + offset + ' of ' + timeline.points.length);
  await expect(inspector(page).locator('#beehive-management-inspector-title')).toHaveText('Read the selected day');
  await expect(inspector(page).locator('[data-preview-timeline-context]')).toHaveText('Projected Day ' + selected.day + ' · ' + offset + ' of ' + timeline.points.length + ' days compared. These are model projections, not observed colony readings.');
  await expect(inspector(page).locator('[data-preview-timeline-reading="baseline"]')).toHaveText(format(baseline, timeline.metric.suffix));
  await expect(inspector(page).locator('[data-preview-timeline-reading="action"]')).toHaveText(format(action, timeline.metric.suffix));
  await expect(inspector(page).locator('[data-preview-timeline-reading="difference"]')).toHaveText(format(delta, timeline.metric.suffix, true));
  const first = timeline.points[0].day, last = timeline.points[timeline.points.length - 1].day;
  const x = last === first ? 300 : 16 + (selected.day - first) / (last - first) * 568;
  const cursor = (await timing(page).locator('[data-preview-timeline-cursor]').getAttribute('d'))!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(cursor[0]).toBeCloseTo(x, 1); expect(cursor.slice(1)).toEqual([16, 224]);
  for (const direction of ['previous', 'next'] as const) {
    await expect(step(page, direction)).toHaveAccessibleName(direction === 'previous' ? 'Previous projected day' : 'Next projected day');
    await expect(step(page, direction)).toHaveAttribute('aria-disabled', String(direction === 'previous' ? offset === 1 : offset === timeline.points.length));
    await expect(step(page, direction)).toHaveAttribute('aria-describedby', 'beehive-management-selected-day');
    expect(await step(page, direction).evaluate(node => (node as HTMLButtonElement).disabled)).toBe(false);
  }
  for (const branch of ['baseline', 'action']) {
    const sample = inspector(page).locator('dt svg[data-branch="' + branch + '"]');
    await expect(sample).toHaveAttribute('aria-hidden', 'true'); await expect(sample).toHaveAttribute('focusable', 'false');
    await expect(sample.locator(branch === 'baseline' ? 'circle' : 'rect')).toHaveCount(1);
  }
  expect(await timing(page).evaluate(node => {
    const nav = node.querySelector('[data-preview-timeline-day-navigation]')!, chart = node.querySelector('.bee-management-timing-chart')!;
    const selected = node.querySelector('[data-preview-timeline-inspector]')!, landmarks = node.querySelector('[data-preview-timeline-landmarks]')!;
    return !!(nav.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      !!(chart.compareDocumentPosition(selected) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      !!(selected.compareDocumentPosition(landmarks) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(timing(page).locator('[data-preview-timeline-scale-note]')).toHaveText(scaleNote);
  await expect(navigation(page).locator('[aria-live],[role="status"]')).toHaveCount(0);
  await expect(inspector(page).locator('[aria-live]')).toHaveCount(1);
  return data;
}
async function pressStep(page: Page, direction: 'previous' | 'next', key: 'Enter' | 'Space') {
  await step(page, direction).focus(); await page.keyboard.press(key); await expect(step(page, direction)).toBeFocused();
}

test('projected day steps match exact readings across ten measures while preserving held hive study and notebook work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); const initial = await work(page), marks = await heldMarks(page);
  await expect(metric(page).locator('option')).toHaveCount(10);
  for (const days of [7, 30]) {
    await horizon(page).selectOption(String(days));
    for (const action of ['feed_bees', 'requeen', 'split_colony']) {
      await choice(page).selectOption(action);
      const measures = action === 'feed_bees' ? metricIds : action === 'requeen' ? ['queenHealth', 'brood'] : ['workers', 'pollen'];
      for (const id of measures) {
        await metric(page).selectOption(id); await dayChoice(page).selectOption('1'); const expected = await verifySelectedDay(page);
        await pressStep(page, 'previous', 'Enter'); await expect(dayChoice(page)).toHaveValue('1');
        await pressStep(page, 'previous', 'Space'); await expect(dayChoice(page)).toHaveValue('1');
        await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue('2'); await verifySelectedDay(page, expected);
        await pressStep(page, 'previous', 'Space'); await expect(dayChoice(page)).toHaveValue('1');
        const last = expected.timeline.points.length; await dayChoice(page).selectOption(String(last));
        await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue(String(last));
        await pressStep(page, 'next', 'Space'); await expect(dayChoice(page)).toHaveValue(String(last)); await verifySelectedDay(page, expected);
        expect(await work(page)).toEqual(initial);
      }
    }
  }
  await dayChoice(page).selectOption('5'); await metric(page).selectOption('workers');
  const project = context(page).locator('[data-management-hive-project]');
  await project.focus(); await page.keyboard.press('Enter'); await expect(metric(page)).toBeFocused();
  await expect(metric(page)).toHaveValue('pollen'); await expect(dayChoice(page)).toHaveValue('5'); await verifySelectedDay(page);
  await pressStep(page, 'next', 'Space'); await expect(dayChoice(page)).toHaveValue('6'); await verifySelectedDay(page);
  await context(page).locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(interior(page).locator('[data-interior-topic="pollen"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await heldMarks(page)).toEqual(marks); expect(await work(page)).toEqual(initial); expect(errors).toEqual([]);
});

test('projected day steps clamp to shorter horizons and one day comparisons without leaving keyboard focus or changing colony data', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); await choice(page).selectOption('feed_bees'); await metric(page).selectOption('workers');
  const initial = await work(page), marks = await heldMarks(page);
  await horizon(page).selectOption('30'); await dayChoice(page).selectOption('30'); await verifySelectedDay(page);
  await horizon(page).selectOption('7'); await expect(dayChoice(page)).toHaveValue('7'); await verifySelectedDay(page);
  await pressStep(page, 'next', 'Space'); await expect(dayChoice(page)).toHaveValue('7');
  await horizon(page).selectOption('30'); await expect(dayChoice(page)).toHaveValue('7');
  await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue('8'); await verifySelectedDay(page);
  expect(await work(page)).toEqual(initial);
  await dayChoice(page).selectOption('30');
  await fixture(page, { day: 95, workers: 510, honey: 0, syrup: 0, pollen: 0, brood: 0, broodCohorts: null, actionPoints: 3 });
  const shortenedState = await work(page), shortened = await verifySelectedDay(page), count = shortened.timeline.points.length;
  expect(count).toBeGreaterThan(0); expect(count).toBeLessThan(30); await expect(dayChoice(page)).toHaveValue(String(count));
  await pressStep(page, 'next', 'Enter'); await pressStep(page, 'next', 'Space'); await expect(dayChoice(page)).toHaveValue(String(count));
  expect(await work(page)).toEqual(shortenedState);
  await fixture(page, { workers: 501 }); const oneDayState = await work(page), oneDay = await verifySelectedDay(page);
  expect(oneDay.timeline.points).toHaveLength(1); await expect(dayChoice(page)).toHaveValue('1');
  for (const direction of ['previous', 'next'] as const) for (const key of ['Enter', 'Space'] as const) {
    await pressStep(page, direction, key); await expect(dayChoice(page)).toHaveValue('1'); await verifySelectedDay(page, oneDay);
  }
  expect(await work(page)).toEqual(oneDayState); expect(await heldMarks(page)).toEqual(marks);
  await fixture(page, { actionPoints: 0 }); const unavailable = await work(page);
  await expect(timing(page)).toHaveCount(0); await expect(page.locator('[data-preview-timeline-day-navigation]')).toHaveCount(0);
  expect(await work(page)).toEqual(unavailable);
  await fixture(page, initial.beehive); await verifySelectedDay(page);
  expect(await work(page)).toEqual(initial); expect(await heldMarks(page)).toEqual(marks); expect(errors).toEqual([]);
});

async function capture(page: Page, mode: string) {
  const position = await timing(page).evaluate(node => {
    const nav = node.querySelector('[data-preview-timeline-day-navigation]')!.getBoundingClientRect();
    const selected = node.querySelector('[data-preview-timeline-inspector]')!.getBoundingClientRect();
    const box = node.getBoundingClientRect(); return { top: nav.top + window.scrollY, height: selected.bottom - nav.top, x: box.x, width: box.width };
  });
  fs.mkdirSync(artifactDir, { recursive: true });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const scroll = await page.evaluate(() => window.scrollY), y = position.top + offset - scroll;
    expect(y).toBeGreaterThanOrEqual(0); const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-day-inspector-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifactDir, file), animations: 'disabled', fullPage: false, clip: { x: position.x, y, width: position.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifactDir, 'preview-day-inspector-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('selected day navigation chart and exact readings remain clear across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openStudy(page); await choice(page).selectOption('requeen'); await horizon(page).selectOption('30');
  await metric(page).selectOption('workers'); await dayChoice(page).selectOption('21');
  const initial = await work(page), marks = await heldMarks(page);
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
    await expect(timing(page).locator('[data-preview-timeline-scale-note]')).toBeVisible();
    for (const direction of ['previous', 'next'] as const) {
      await step(page, direction).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(step(page, direction)).toBeFocused();
      const focus = await step(page, direction).evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
      expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
    }
    await pressStep(page, 'next', 'Enter'); await expect(dayChoice(page)).toHaveValue('22');
    await pressStep(page, 'previous', 'Space'); await expect(dayChoice(page)).toHaveValue('21'); await verifySelectedDay(page);
    await capture(page, mode); expect(await heldMarks(page)).toEqual(marks);
    expect(await work(page)).toEqual(mode === 'wide' ? initial : { ...initial, beehive: { ...initial.beehive, focusLayout: false } });
  }
  expect(errors).toEqual([]);
});
