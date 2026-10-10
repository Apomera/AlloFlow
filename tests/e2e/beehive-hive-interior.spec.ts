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
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function detail(page: Page) { return panel(page).locator('[data-interior-detail]'); }
function reading(page: Page) { return detail(page).locator('[data-interior-reading]'); }

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Interior test uses the supported fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the interior fallback test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my own observation.', explanation: 'Keep my explanation.',
          review: { prediction: true, evidence: true, explanation: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
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
async function open(page: Page) {
  const entry = page.locator('[data-hive-interior-open]');
  await expect(entry).toHaveAccessibleName(/Look inside the hive/i);
  await entry.focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
}
async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-hive-interior]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}
async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('div,p,h3,h4,button,dl,dt,dd'))];
    return {
      rootFont,
      controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(node.querySelectorAll('p,dt,dd,button')).map(el => {
        const css = getComputedStyle(el);
        return { text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.controls.length).toBeGreaterThanOrEqual(11);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(text.ellipsis, text.text || '').toBe(false); expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
  }
}
async function preview(page: Page, testInfo: TestInfo, name: string) {
  await panel(page).screenshot({ path: testInfo.outputPath('interior-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('the Beekeeper interior works without WebGL and preserves colony state while exploring frames and topics', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const initial = await work(page);
  await open(page);
  const opened = JSON.parse(JSON.stringify(initial));
  Object.assign(opened.beehive, { show3dHive: true, hive3dExploded: true, hive3dPart: 'brood_frames' });
  expect(await work(page)).toEqual(opened);
  await expect(panel(page).getByRole('heading', { name: 'Inside the hive', exact: true })).toBeVisible();
  await expect(panel(page).locator('[data-hive-interior-diagram]')).toHaveAttribute('role', 'img');
  await expect(panel(page).locator('[data-hive-interior-diagram]')).toHaveAccessibleName(/hive|comb|frame/i);
  await expect(panel(page).locator('[data-interior-frame]')).toHaveCount(6);
  await expect(panel(page).locator('[data-interior-frame][aria-pressed="true"]')).toHaveCount(1);
  await expect(frame(page, 0)).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).locator('[data-interior-clock]')).toContainText(/Day\s*15/i);
  await expect(panel(page).locator('[data-interior-clock]')).toContainText(/Manual days/i);
  await expect(panel(page)).toContainText(/model pattern/i);

  for (const [index, kind] of [[3, /cent(er|re)|brood nest/i], [5, /outside|outer/i]] as const) {
    const before = await work(page);
    await frame(page, index).focus(); await page.keyboard.press('Space');
    const expected = JSON.parse(JSON.stringify(before));
    Object.assign(expected.beehive, { hive3dFrame: index, hive3dPart: 'brood_frames', hive3dExploded: true });
    expected.beehive.hive3dFramesSeen.push(index);
    expect(await work(page)).toEqual(expected);
    await expect(frame(page, index)).toHaveAttribute('aria-pressed', 'true');
    await expect(frame(page, index)).toBeFocused();
    await expect(panel(page).locator('[data-interior-frame-note]')).toContainText(kind);
    await expect(panel(page).locator('[data-hive-interior-diagram]')).toHaveAccessibleName(new RegExp('Frame ' + (index + 1) + ' of 6', 'i'));
  }
  expect((await work(page)).beehive.hive3dFramesSeen).toEqual([3, 5]);

  const explored = await work(page);
  await panel(page).locator('[data-interior-cell="honey"]').first().click();
  await expect(topic(page, 'food')).toHaveAttribute('aria-pressed', 'true');
  await expect(reading(page)).toHaveText('40 honey-equivalent lb');
  expect(await work(page)).toEqual(explored);
  for (const [id, value] of [['food', /40\s*honey-equivalent lb/i], ['pollen', /12\s*lb/i], ['brood', /6,000\s*cells/i], ['queen', /90\s*(\/\s*100|points)/i]] as const) {
    await topic(page, id).focus(); await page.keyboard.press('Enter');
    await expect(topic(page, id)).toHaveAttribute('aria-pressed', 'true');
    await expect(topic(page, id)).toBeFocused();
    await expect(panel(page).locator('[data-interior-topic][aria-pressed="true"]')).toHaveCount(1);
    await expect(reading(page)).toHaveText(value);
    expect(await work(page)).toEqual(explored);
  }
  await expect(detail(page)).toContainText(/not.*(live|actual|location)|cannot.*(locat|position)|does not.*(locat|position)/i);
  expect((await work(page)).beehive.hive3dFoundQueen).toBe(false);

  await fixture(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  const zero = await work(page);
  await expect(panel(page).locator('[data-interior-cell="honey"]')).toHaveCount(0);
  for (const id of ['food', 'pollen', 'brood', 'queen']) {
    await topic(page, id).click(); await expect(reading(page)).toHaveText(/^0(?:\s|$)/);
    await expect(reading(page)).not.toHaveText('Not recorded');
    expect(await work(page)).toEqual(zero);
  }
  await fixture(page, { honey: null, syrup: null, pollen: null, brood: null, queenHealth: null });
  const missing = await work(page);
  await expect(panel(page).locator('[data-interior-frame-note]')).toContainText(/Pattern unavailable/i);
  await expect(panel(page).locator('[data-interior-cell="honey"]')).toHaveCount(0);
  for (const id of ['food', 'pollen', 'brood', 'queen']) {
    await topic(page, id).click(); await expect(reading(page)).toHaveText('Not recorded');
    expect(await work(page)).toEqual(missing);
  }

  // Winter uses the same educational schematic without pretending to locate a queen.
  await fixture(page, { day: 105, honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90 });
  await expect(panel(page)).toHaveAttribute('data-interior-season', 'winter');
  await expect(topic(page, 'queen')).toBeEnabled(); await topic(page, 'queen').click();
  const winter = await work(page);
  await frame(page, 5).click(); expect(await work(page)).toEqual(winter);
  await expect(frame(page, 5)).toHaveAttribute('aria-pressed', 'true');

  // Hiding and reopening preserves the selected frame and all written work.
  const bay = page.locator('[data-beehive-3d-bay="hive"]');
  const visibility = bay.locator('button[aria-controls="beehive-3d-hive-content"]');
  await expect(visibility).toHaveAttribute('aria-expanded', 'true'); await visibility.click();
  await expect(panel(page)).not.toBeVisible();
  const hidden = JSON.parse(JSON.stringify(winter)); hidden.beehive.show3dHive = false;
  expect(await work(page)).toEqual(hidden);
  await open(page); expect(await work(page)).toEqual(winter);
  await expect(frame(page, 5)).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { const w = window as any; w.ReactDOM.flushSync(() => w.__mount(JSON.parse(JSON.stringify(w.__toolData)))); });
  await expect(panel(page)).toBeVisible(); await expect(frame(page, 5)).toHaveAttribute('aria-pressed', 'true');
  expect(await work(page)).toEqual(winter);

  const beforeNotebook = await work(page);
  await panel(page).locator('[data-interior-notebook]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
  await expect(page.locator('#beehive-notebook-writing-title')).toBeFocused();
  const notebook = JSON.parse(JSON.stringify(beforeNotebook)); notebook.beehive.notebookOpen = true;
  expect(await work(page)).toEqual(notebook);
  await expect(page.locator('[data-capture-frame]')).toContainText('Frame 6/6');
  await accessible(page); expect(errors).toEqual([]);
});

test('the interior stays readable on mobile, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await open(page); await frame(page, 3).click(); await topic(page, 'brood').click();
  const original = await work(page);
  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout });
    for (const [width, name] of [[980, 'wide'], [320, 'mobile']] as const) {
      await page.setViewportSize({ width, height: 1800 });
      await readableLayout(page); await accessible(page);
      if (focusLayout) await preview(page, testInfo, name);
    }
  }
  await fixture(page, { focusLayout: true }); expect(await work(page)).toEqual(original);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await frame(page, 3).focus();
  const colors = await frame(page, 3).evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1600, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await panel(page).evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  await readableLayout(page, false); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await work(page)).toEqual(original); expect(errors).toEqual([]);
});
