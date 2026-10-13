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
test.afterEach(async ({ page }, info) => {
  if (info.error) console.error(info.error.message);
  await harness.destroy(page);
});

const artifactDir = path.resolve('.codex-artifacts/bee-study-projection-2026-10-12');
function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function context(page: Page) { return page.locator('[data-management-hive-context]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function metric(page: Page) { return page.locator('[data-preview-timeline-metric]'); }
function topic(page: Page, id: string) { return interior(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return interior(page).locator('[data-interior-role="' + id + '"]'); }
function reading(page: Page, id: string) { return context(page).locator('[data-management-hive-reading="' + id + '"]'); }
function difference(page: Page) { return context(page).locator('[data-management-hive-difference]'); }
function status(page: Page) { return context(page).locator('[data-management-hive-status]'); }
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
async function openHive(page: Page) {
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await interior(page).locator('[data-interior-frame="2"]').click();
}
async function hold(page: Page) {
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(interior(page).locator('[data-interior-clear]')).toBeVisible();
}
async function enterManagement(page: Page) {
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(choice(page)).toBeFocused(); await expect(context(page)).toBeVisible();
}
async function returnToHive(page: Page) {
  await context(page).locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
}
async function heldMarks(page: Page) {
  return interior(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
}
function link(page: Page) { return context(page).locator('[data-management-hive-projection-link]'); }
function project(page: Page) { return link(page).locator('[data-management-hive-project]'); }
function dayChoice(page: Page) { return page.locator('[data-preview-timeline-day]'); }
const mappings = [
  { topic: 'food', metric: 'honey', label: 'Combined food' }, { topic: 'pollen', metric: 'pollen', label: 'Pollen stores' },
  { topic: 'brood', metric: 'brood', label: 'Brood' }, { topic: 'queen', metric: 'queenHealth', label: 'Queen health' },
];
async function activate(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  await project(page).focus(); await page.keyboard.press(key); await expect(metric(page)).toBeFocused();
}

test('hive topics explicitly select their projection without changing the choice day held reference or saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openHive(page); await hold(page); await enterManagement(page);
  await choice(page).selectOption('feed_bees'); await horizon(page).selectOption('30');
  await dayChoice(page).selectOption('5'); await metric(page).selectOption('workers');
  const unchanged = await work(page), marks = await heldMarks(page); let selected = 'workers';
  for (const item of mappings) {
    await returnToHive(page); await topic(page, item.topic).click(); await enterManagement(page);
    await expect(metric(page)).toHaveValue(selected);
    await expect(project(page)).toHaveAttribute('data-management-hive-project', item.metric);
    await expect(project(page)).toHaveAccessibleName('Explore ' + item.label.toLowerCase() + ' over time');
    await expect(project(page)).toHaveAttribute('aria-describedby', 'beehive-management-hive-projection-help');
    await expect(link(page).locator('[data-management-hive-projection-label]')).toHaveText('Projection measure: ' + item.label);
    if (item.topic === 'food') await expect(link(page)).toContainText('including fed syrup');
    if (item.topic === 'queen') await expect(link(page)).toContainText('same model score, not the queen’s location');
    await activate(page); await expect(metric(page)).toHaveValue(item.metric);
    await activate(page, 'Space'); await expect(metric(page)).toHaveValue(item.metric);
    await expect(choice(page)).toHaveValue('feed_bees'); await expect(horizon(page)).toHaveValue('30'); await expect(dayChoice(page)).toHaveValue('5');
    expect(await work(page)).toEqual(unchanged); expect(await heldMarks(page)).toEqual(marks);
    await role(page, 'empty').click(); await expect(project(page)).toHaveAttribute('data-management-hive-project', item.metric);
    await expect(link(page)).toContainText('Unmarked comb has no separate projection.');
    await activate(page); expect(await work(page)).toEqual(unchanged); selected = item.metric;
  }
  for (const [id, target] of [['honey', 'honey'], ['pollen', 'pollen'], ['open_brood', 'brood'], ['capped_brood', 'brood'], ['drone_brood', 'brood'], ['empty', 'brood']]) {
    await role(page, id).click(); await expect(project(page)).toHaveAttribute('data-management-hive-project', target);
    await activate(page); await expect(metric(page)).toHaveValue(target); expect(await work(page)).toEqual(unchanged);
  }
  await topic(page, 'pollen').click(); await fixture(page, { pollen: null }); const missing = await work(page);
  await expect(project(page)).toBeDisabled(); await expect(link(page)).toContainText('this topic’s current reading');
  await choice(page).selectOption('add_super'); expect(await work(page)).toEqual(missing);
  await fixture(page, { pollen: 12, actionPoints: 0 }); const unavailable = await work(page);
  await expect(project(page)).toBeDisabled(); await expect(link(page)).toContainText('Choose an available management action');
  await expect(metric(page)).toHaveCount(0); expect(await work(page)).toEqual(unavailable);
  await fixture(page, { actionPoints: unchanged.beehive.actionPoints, day: null });
  await expect(project(page)).toBeDisabled(); await expect(link(page)).toContainText('A recorded day');
  await fixture(page, { day: 15 }); await hold(page);
  await fixture(page, { experimentRunSerial: 4 }); const currentRun = await work(page);
  await expect(status(page)).toContainText('different run, seed or model'); await expect(project(page)).toBeEnabled();
  await activate(page); await expect(metric(page)).toHaveValue('pollen'); expect(await work(page)).toEqual(currentRun);
  expect(currentRun.beehive.notebook).toEqual(unchanged.beehive.notebook); expect(currentRun.otherTool).toEqual(unchanged.otherTool);
  expect(errors).toEqual([]);
});

test('pollen projection uses exact forecast readings and becomes kept notebook evidence only on explicit capture', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openHive(page); await topic(page, 'pollen').click(); await hold(page); await enterManagement(page);
  await choice(page).selectOption('split_colony'); await horizon(page).selectOption('30'); await dayChoice(page).selectOption('7');
  const initial = await work(page), marks = await heldMarks(page); await activate(page);
  await expect(metric(page)).toHaveValue('pollen'); await expect(page.locator('.bee-management-timing-chart figcaption')).toContainText('Pollen stores');
  const expected = await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, state = w.__toolData.beehive;
    const cfg = { params: BH.SIMULATION_PARAMS, subMods: { honey: 1.1, spring: 1, winter: .92, varroa: 1 }, siteMods: { forage: 1, disease: 1 },
      gardenBonus: state.experimentEnvironment.gardenBonus, hiveEvents: [], diseaseEvents: [], rand: () => { throw Error('Live random draw used'); } };
    const preview = BH.bhPreviewManagementChoice(state, cfg, 'split_colony', 30);
    const baseline = preview.baseline.timeline[6].pollen, action = preview.withAction.timeline[6].pollen;
    const end = preview.daysCompared - 1;
    return { baseline, action, difference: Math.round((action - baseline) * 1000) / 1000,
      endBaseline: preview.baseline.timeline[end].pollen, endAction: preview.withAction.timeline[end].pollen };
  });
  const format = (value: number, signed = false) => (signed && value > 0 ? '+' : '') + (value === 0 ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: 3 }) + ' lb';
  const values = { baseline: format(expected.baseline), action: format(expected.action), difference: format(expected.difference, true) };
  for (const [id, value] of Object.entries(values)) await expect(page.locator('[data-preview-timeline-reading="' + id + '"]')).toHaveText(value);
  await expect(page.locator('[data-preview-baseline="pollen"]')).toHaveText(format(expected.endBaseline));
  await expect(page.locator('[data-preview-with-action="pollen"]')).toHaveText(format(expected.endAction));
  await expect(page.locator('[data-preview-timeline-landmark-status]')).toContainText('Pollen stores');
  const text = (await page.locator('[data-management-projection-text]').textContent())!;
  expect(text).toContain('Pollen stores:'); expect(text).toContain('Projected Day 22');
  for (const value of Object.values(values)) expect(text).toContain(value);
  expect(await work(page)).toEqual(initial);
  const field = (id: string) => page.locator('[data-beehive-notebook="beekeeper"] [data-notebook-field="' + id + '"]');
  await page.locator('[data-management-projection-prediction]').focus(); await page.keyboard.press('Enter'); await expect(field('prediction')).toBeFocused();
  const opened = { ...initial, beehive: { ...initial.beehive, notebookOpen: true } };
  expect(await work(page)).toEqual(opened);
  await expect(page.locator('[data-notebook-projection-text]')).toHaveText(text);
  for (const [id, value] of Object.entries(values)) await expect(page.locator('[data-notebook-projection-reading="' + id + '"]')).toHaveText(value);
  await page.locator('[data-management-projection-save]').focus(); await page.keyboard.press('Space'); await expect(field('evidence')).toBeFocused();
  const saved = JSON.parse(JSON.stringify(opened)); saved.beehive.notebook.beekeeper.evidence += '\n' + text.trim(); saved.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(saved); await expect(page.locator('[data-management-projection-save]')).toBeDisabled();
  await fixture(page, { day: 16, pollen: 1 });
  await expect(page.locator('[data-notebook-projection-text]')).toHaveText(text); await expect(page.locator('[data-notebook-projection-context]')).toHaveAttribute('data-projection-state', 'valid');
  expect((await work(page)).beehive.notebook).toEqual(saved.beehive.notebook); expect(await heldMarks(page)).toEqual(marks); expect(errors).toEqual([]);
});

async function capture(page: Page, mode: string) {
  const position = await link(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await link(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset;
    expect(y).toBeGreaterThanOrEqual(0); const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-study-projection-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifactDir, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifactDir, 'preview-study-projection-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('hive projection shortcut stays readable and keyboard accessible across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openHive(page); await topic(page, 'pollen').click(); await hold(page); await enterManagement(page);
  const initial = await work(page), marks = await heldMarks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') { await page.emulateMedia({ forcedColors: 'none' }); await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; }); }
    const violations = await link(page).evaluate(async node => {
      const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => entry.target) }));
    }); expect(violations).toEqual([]);
    const layout = await link(page).evaluate(node => {
      const elements = [node, ...Array.from(node.querySelectorAll('p,button'))], font = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { overflow: elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent),
        text: elements.slice(1).map(el => parseFloat(getComputedStyle(el).fontSize) / font), pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }); expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1); layout.text.forEach(size => expect(size).toBeGreaterThanOrEqual(.875));
    await project(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(project(page)).toBeFocused();
    const control = await project(page).evaluate(node => { const box = node.getBoundingClientRect(), css = getComputedStyle(node); return { width: box.width, height: box.height, outline: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
    expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); expect(control.outline).toBeGreaterThanOrEqual(2); expect(control.style).not.toBe('none');
    await capture(page, mode); await activate(page); await expect(metric(page)).toHaveValue('pollen');
    await activate(page, 'Space'); expect(await heldMarks(page)).toEqual(marks);
    expect(await work(page)).toEqual(mode === 'wide' ? initial : { ...initial, beehive: { ...initial.beehive, focusLayout: false } });
  }
  expect(errors).toEqual([]);
});
