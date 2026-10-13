import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = '.codex-artifacts/bee-study-controls-2026-10-11';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const topics = [
  { id: 'food', label: 'Food stores', value: '40 honey-equivalent lb', keys: ['honey'] },
  { id: 'pollen', label: 'Pollen stores', value: '12 lb', keys: ['pollen'] },
  { id: 'brood', label: 'Developing brood', value: '6,000 cells', keys: ['open_brood', 'capped_brood', 'drone_brood'] },
  { id: 'queen', label: 'Queen', value: '90 / 100', keys: [] },
];
const roles = [
  { id: 'honey', label: 'Food cells', topic: 'food' },
  { id: 'pollen', label: 'Pollen cells', topic: 'pollen' },
  { id: 'open_brood', label: 'Open brood', topic: 'brood' },
  { id: 'capped_brood', label: 'Capped brood', topic: 'brood' },
  { id: 'drone_brood', label: 'Drone brood', topic: 'brood' },
  { id: 'empty', label: 'Unmarked comb', topic: 'brood' },
];

test.describe.configure({ timeout: 300000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function controls(page: Page) { return panel(page).locator('[data-interior-focus-controls]'); }
function study(page: Page) { return panel(page).locator('[data-interior-position-study]'); }
function key(page: Page) { return study(page).locator('[data-position-study-key]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Study focus uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive study focus test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 2, hive3dFramesSeen: [2],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong> & punctuation.',
          explanation: 'Keep my explanation.', review: { prediction: true, evidence: true, explanation: true },
          custom: { retained: 'Role metadata.' } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await panel(page).locator('[data-interior-hold]').click();
  const before = await work(page);
  const toggle = panel(page).locator('[data-interior-position-study-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(study(page)).toBeVisible(); await expect(toggle).toBeFocused();
  expect(await work(page)).toEqual(before);
}

async function assertStructure(page: Page) {
  await expect(controls(page)).toHaveCount(1);
  await expect(controls(page).getByRole('heading', { name: 'Choose what to study', exact: true })).toBeVisible();
  await expect(controls(page)).toContainText('Colony readings'); await expect(controls(page)).toContainText('Cell marks');
  await expect(controls(page).locator('[data-interior-topic-controls]')).toHaveAttribute('aria-label', 'Explore hive contents');
  await expect(controls(page).locator('[data-interior-topic]')).toHaveCount(4);
  await expect(panel(page).locator('[data-interior-topic]')).toHaveCount(4);
  await expect(controls(page).locator('[data-interior-role]')).toHaveCount(6);
  await expect(panel(page).locator('[data-interior-role]')).toHaveCount(6);
  await expect(controls(page).locator('[data-interior-legend]')).toHaveCount(1);
  await expect(panel(page).locator('#beehive-interior-key-title')).toHaveCount(1);
  const structural = await panel(page).evaluate(node => {
    const focus = node.querySelector('[data-interior-focus-controls]')!;
    const targets = ['[data-interior-locate]', '[data-interior-position]', '[data-position-study-diagram]', '[data-interior-detail]'];
    const ids = Array.from(node.querySelectorAll('[id]')).map(el => el.id);
    return {
      precedes: targets.map(selector => !!(focus.compareDocumentPosition(node.querySelector(selector)!) & Node.DOCUMENT_POSITION_FOLLOWING)),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    };
  });
  expect(structural.precedes).toEqual([true, true, true, true]); expect(structural.duplicateIds).toEqual([]);
}

async function assertSymbol(svg: Locator, id: string) {
  await expect(svg).toHaveAttribute('aria-hidden', 'true'); await expect(svg).toHaveAttribute('focusable', 'false');
  await expect(svg.locator('polygon')).toHaveCount(1);
  const circle = svg.locator('circle'), cap = svg.locator('.bee-interior-cap-mark');
  if (id.includes('brood')) {
    await expect(circle).toHaveCount(1);
    expect(Number(await circle.getAttribute('r'))).toBeCloseTo(id === 'drone_brood' ? 7 : 4.2, 6);
    const fill = await circle.evaluate(node => getComputedStyle(node).fill);
    if (id === 'open_brood') {
      expect(fill).toBe('none'); await expect(cap).toHaveCount(0);
    } else {
      expect(fill).not.toBe('none'); await expect(cap).toHaveCount(1);
      expect(await cap.evaluate(node => getComputedStyle(node).stroke)).not.toBe(fill);
    }
  } else {
    await expect(circle).toHaveCount(0); await expect(cap).toHaveCount(0);
    await expect(svg.locator('path')).toHaveCount(id === 'empty' ? 0 : 1);
    if (id === 'honey') await expect(svg.locator('path')).toHaveAttribute('d', /h.*M.*v/);
    if (id === 'pollen') await expect(svg.locator('path')).toHaveAttribute('d', /l.*-/);
  }
}

async function assertKey(page: Page, label: string, ids: string[]) {
  await expect(key(page)).toHaveCount(1);
  await expect(key(page).locator('[data-position-study-category]')).toHaveText(label);
  expect(await key(page).locator('[data-position-study-key-role]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-position-study-key-role')))).toEqual(ids);
  await expect(key(page).locator('button,input,select,textarea,a[href],[tabindex="0"]')).toHaveCount(0);
  for (const id of ids) {
    const item = key(page).locator('[data-position-study-key-role="' + id + '"]');
    await expect(item).toHaveJSProperty('tagName', 'LI');
    await expect(item).toContainText(roles.find(role => role.id === id)!.label);
    await assertSymbol(item.locator('svg'), id);
    // The local key must show the same drawing grammar as the selectable cell key.
    const shapes = (svg: Locator) => svg.locator('polygon,path,circle').evaluateAll(nodes => nodes.map(node => ({
      tag: node.tagName, attributes: ['points', 'd', 'cx', 'cy', 'r', 'fill', 'class'].map(name => [name, node.getAttribute(name)]),
    })));
    expect(await shapes(item.locator('svg'))).toEqual(await shapes(role(page, id).locator('svg')));
  }
}

test('hive study focus puts keyboard choices before frames and explains each selected mark without changing saved colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await assertStructure(page);
  const original = await work(page), held = await panel(page).locator('[data-change-held]').allTextContents();
  // Start at the existing interior heading: ordinary Tab navigation now reaches
  // all study choices before any frame, without script-driven focus after each choice.
  await panel(page).locator('#beehive-interior-title').focus();
  for (const item of topics) {
    await page.keyboard.press('Tab'); await expect(topic(page, item.id)).toBeFocused();
    await page.keyboard.press('Enter'); await expect(topic(page, item.id)).toBeFocused();
    await expect(topic(page, item.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page).locator('[data-interior-topic][aria-pressed="true"]')).toHaveCount(1);
    await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(0);
    await assertKey(page, item.label, item.keys);
    await expect(study(page).locator('[data-position-study-reading]')).toHaveText(item.value);
    await expect(panel(page).locator('[data-interior-reading]')).toHaveText(item.value);
    if (item.id === 'queen') {
      await expect(key(page)).toContainText(/queen.*location.*not mapped|does not.*queen.*location/i);
      await expect(key(page)).not.toContainText(/queen absent|queen missing|no queen/i);
    }
    expect(await work(page)).toEqual(original);
    expect(await panel(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  }
  for (const item of roles) {
    await page.keyboard.press('Tab'); await expect(role(page, item.id)).toBeFocused();
    await page.keyboard.press('Space'); await expect(role(page, item.id)).toBeFocused();
    await expect(role(page, item.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(1);
    await expect(topic(page, item.topic)).toHaveAttribute('aria-pressed', 'true');
    await assertKey(page, item.label, [item.id]);
    const value = topics.find(topic => topic.id === item.topic)!.value;
    await expect(study(page).locator('[data-position-study-reading]')).toHaveText(value);
    await expect(panel(page).locator('[data-interior-reading]')).toHaveText(value);
    expect(await work(page)).toEqual(original);
    expect(await panel(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  }
  await page.keyboard.press('Tab'); await expect(panel(page).locator('[data-interior-frame="0"]')).toBeFocused();
  await expect(panel(page).locator('[data-interior-frame][aria-pressed="true"]')).toHaveAttribute('data-interior-frame', '2');
  // A missing model input leaves a useful reference key but makes no presence claim.
  await fixture(page, { honey: null }); const incomplete = await work(page);
  await topic(page, 'brood').click(); await assertKey(page, 'Developing brood', ['open_brood', 'capped_brood', 'drone_brood']);
  await expect(key(page)).toContainText('Key symbols only');
  await expect(key(page)).toContainText(/unavailable|not recorded/i);
  await expect(key(page)).not.toContainText(/marks shown|no matching marks/i);
  await expect(study(page).locator('[data-position-study-unavailable]')).toBeVisible();
  await expect(study(page).locator('[data-position-study-diagram]')).toHaveCount(0);
  await expect(study(page).locator('[data-position-study-reading]')).toHaveText('6,000 cells');
  await topic(page, 'queen').click(); await assertKey(page, 'Queen', []);
  await expect(key(page)).toContainText(/queen.*location.*not mapped|does not.*queen.*location/i);
  expect(await work(page)).toEqual(incomplete);
  await fixture(page, { honey: 40 }); const restored = await work(page);
  // The deliberately invalid fixture records a honey repair. Restoring its
  // value keeps that recovery notice; ordinary study controls must retain it.
  expect(restored).toEqual({ ...original, beehive: { ...original.beehive, saveRecovery: { fields: ['honey'] } } });
  await topic(page, 'brood').click();
  await assertKey(page, 'Developing brood', ['open_brood', 'capped_brood', 'drone_brood']);
  await expect(study(page).locator('[data-position-study-diagram]')).toHaveCount(2);
  expect(await work(page)).toEqual(restored);
  expect(await panel(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  expect(errors).toEqual([]);
});

async function auditRegion(scope: Locator) {
  const audit = await scope.evaluate(async node => {
    const results = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return results.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(audit).toEqual([]);
  const layout = await scope.evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,h5,strong,span,button,ul,li'))];
    return {
      overflow: elements.filter(el => el.getClientRects().length > 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node && el.getClientRects().length > 0 && !['DIV', 'UL'].includes(el.tagName)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}
async function visualStudy(page: Page, mode: string) {
  await assertKey(page, 'Developing brood', ['open_brood', 'capped_brood', 'drone_brood']);
  await auditRegion(controls(page)); await auditRegion(key(page));
  await topic(page, 'food').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(topic(page, 'food')).toBeFocused();
  const focus = await topic(page, 'food').evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await controls(page).screenshot({ path: artifacts + '/preview-study-focus-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  if (mode === 'wide' || mode === 'mobile' || mode === 'forced') await key(page).screenshot({ path: artifacts + '/preview-position-key-' + mode + '.png', animations: 'disabled', timeout: 120000 });
}

test('hive study focus and nearby symbol keys stay readable on phones with dark forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await topic(page, 'brood').click();
  const original = await work(page), held = await panel(page).locator('[data-change-held]').allTextContents();
  await visualStudy(page, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  await visualStudy(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await visualStudy(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await visualStudy(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await visualStudy(page, 'large');
  expect(await work(page)).toEqual({ ...original, beehive: { ...original.beehive, focusLayout: false } });
  expect(await panel(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  await expect(panel(page).locator('[data-interior-frame][aria-pressed="true"]')).toHaveAttribute('data-interior-frame', '2');
  expect(errors).toEqual([]);
});
