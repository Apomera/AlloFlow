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

function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function lensToggle(page: Page) { return panel(page).locator('[data-interior-lens-toggle]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
async function openLens(page: Page) {
  await lensToggle(page).focus(); await page.keyboard.press('Enter');
  await expect(lensToggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page).locator('[data-interior-held-diagram]')).toBeVisible();
}
async function modelLens(page: Page, index: number, r: number, c: number, source?: Record<string, unknown>) {
  return page.evaluate(({ index, r, c, source }) => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhHiveInteriorLens(source || w.__toolData.beehive, index, r, c);
  }, { index, r, c, source });
}
async function position(page: Page) {
  return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) };
}
async function verifyLens(page: Page, index: number, heldData?: Record<string, unknown>) {
  const at = await position(page), current = await modelLens(page, index, at.row, at.col);
  await expect(lens(page).locator('[data-interior-current-lens]')).toHaveAttribute('viewBox', current.viewBox);
  await expect(lens(page).locator('[data-interior-current-lens]')).toHaveAccessibleName(new RegExp('Frame ' + (index + 1) + ' of 6\\. Illustration row ' + (at.row + 1) + ', column ' + (at.col + 1)));
  await expect(lens(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: ' + current.label);
  const actualCurrent = await lens(page).locator('[data-lens-current-cell]').evaluateAll(nodes => nodes.map(node => ({ position: node.getAttribute('data-lens-position'), role: node.getAttribute('data-lens-current-cell') })));
  expect(actualCurrent).toEqual(current.neighbors.map((cell: any) => ({ position: cell.row + ':' + cell.col, role: cell.role })));
  expect(actualCurrent.length).toBeLessThanOrEqual(25);
  const currentRing = panel(page).locator('[data-interior-lens-locator="current"]');
  if (current.available) {
    await expect(currentRing).toHaveAttribute('cx', String(current.x));
    await expect(currentRing).toHaveAttribute('cy', String(current.y));
  } else await expect(currentRing).toHaveCount(0);
  if (heldData) {
    const held = await modelLens(page, index, at.row, at.col, heldData);
    await expect(lens(page).locator('[data-interior-held-lens]')).toHaveAttribute('viewBox', current.viewBox);
    await expect(lens(page).locator('[data-lens-mark="held"]')).toHaveText('Held mark: ' + held.label);
    const actualHeld = await lens(page).locator('[data-lens-held-cell]').evaluateAll(nodes => nodes.map(node => ({ position: node.getAttribute('data-lens-position'), role: node.getAttribute('data-lens-held-cell') })));
    expect(actualHeld).toEqual(held.neighbors.map((cell: any) => ({ position: cell.row + ':' + cell.col, role: cell.role })));
    if (held.available) {
      await expect(panel(page).locator('[data-interior-lens-locator="held"]')).toHaveAttribute('cx', String(current.x));
      await expect(panel(page).locator('[data-interior-lens-locator="held"]')).toHaveAttribute('cy', String(current.y));
    }
    await expect(lens(page).locator('[data-interior-lens-status]')).toContainText('Both close-ups use this same position.');
  }
  return current;
}
async function auditLens(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-interior-cell-lens]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  const layout = await lens(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,label,p,strong,span,button,select,h4,figure,figcaption'))];
    return {
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button,select')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
    };
  });
  expect(layout.overflow).toEqual([]);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  const overflow = await page.evaluate(() => ({ extra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    leaks: Array.from(document.querySelectorAll('*')).filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).slice(0, 16).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 55), extra: el.scrollWidth - el.clientWidth })) }));
  expect(overflow.extra, JSON.stringify(overflow.leaks)).toBeLessThanOrEqual(1);
}
async function captureLens(page: Page, testInfo: TestInfo, mode: string) {
  await lens(page).screenshot({ path: testInfo.outputPath('lens-' + mode + '.png'), animations: 'disabled' });
  await panel(page).locator('.bee-interior-frame-pair').screenshot({ path: testInfo.outputPath('lens-' + mode + '-frames.png'), animations: 'disabled' });
}

test('native cell controls and every cell key work with the graphics fallback while preserving colony and notebook state', async ({ page }) => {
  await mount(page); await open(page); await frame(page, 2).click();
  const unchanged = await work(page);
  await expect(lens(page)).toHaveCount(0); await expect(lensToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await openLens(page); expect(await work(page)).toEqual(unchanged);
  await expect(row(page).locator('option')).toHaveCount(11); await expect(column(page).locator('option')).toHaveCount(21);
  await row(page).focus(); await page.keyboard.press('Home'); await column(page).focus(); await page.keyboard.press('Home');
  await expect(row(page)).toHaveValue('0'); await expect(column(page)).toHaveValue('0'); await verifyLens(page, 2);
  await row(page).focus(); await page.keyboard.press('End'); await column(page).focus(); await page.keyboard.press('End');
  await expect(row(page)).toHaveValue('10'); await expect(column(page)).toHaveValue('20'); await verifyLens(page, 2);
  for (const id of roleIds) {
    const previous = await position(page);
    const expected = await page.evaluate(({ id, previous }) => {
      const w = window as any, model = w.__RR_TEST_EXPORTS__.beehive.bhHiveInteriorFrameModel(w.__toolData.beehive, 2);
      const cells = model.cells.filter((cell: any) => cell.role === id || id === 'empty' && cell.role === 'foundation');
      cells.sort((a: any, b: any) => Math.abs(a.row - previous.row) + Math.abs(a.col - previous.col) - Math.abs(b.row - previous.row) - Math.abs(b.col - previous.col) || a.row - b.row || a.col - b.col);
      return cells.length ? { row: cells[0].row, col: cells[0].col } : previous;
    }, { id, previous });
    await role(page, id).focus(); await page.keyboard.press('Enter');
    await expect(role(page, id)).toHaveAttribute('aria-pressed', 'true'); expect(await position(page)).toEqual(expected);
    await verifyLens(page, 2); expect(await work(page)).toEqual(unchanged);
  }
  await lens(page).locator('[data-interior-lens-close]').focus(); await page.keyboard.press('Enter');
  await expect(lens(page)).toHaveCount(0); await expect(lensToggle(page)).toBeFocused();
  const drawn = panel(page).locator('[data-interior-cell][data-interior-cell-position="4:10"]');
  const drawnRole = await drawn.getAttribute('data-interior-cell'); await drawn.click();
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused(); expect(await position(page)).toEqual({ row: 4, col: 10 });
  await expect(role(page, drawnRole === 'foundation' ? 'empty' : drawnRole!)).toHaveAttribute('aria-pressed', 'true');
  await verifyLens(page, 2); expect(await work(page)).toEqual(unchanged);
  await hold(page); expect(await work(page)).toEqual(unchanged);
  await panel(page).locator('[data-interior-inquiry-prediction]').click();
  await expect(page.locator('[data-beehive-notebook="beekeeper"] [data-notebook-field="prediction"]')).toBeFocused();
  const withNotebook = { ...unchanged, beehive: { ...unchanged.beehive, notebookOpen: true } };
  expect(await work(page)).toEqual(withNotebook);
  await page.locator('[data-notebook-return-interior]').click(); await verifyLens(page, 2);
  expect(await position(page)).toEqual({ row: 4, col: 10 }); expect(await work(page)).toEqual(withNotebook);
  await panel(page).locator('[data-interior-management]').click(); await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await page.locator('[data-management-return-interior]').click(); await verifyLens(page, 2);
  expect(await work(page)).toEqual(withNotebook);
  await lensToggle(page).focus(); await page.keyboard.press('Enter');
  await expect(lens(page)).toHaveCount(0); await expect(lensToggle(page)).toBeFocused(); expect(await work(page)).toEqual(withNotebook);
});

test('paired cell views share exact coordinates through frame changes and real feeding and report missing or invalid references honestly', async ({ page }) => {
  await mount(page); await open(page); await frame(page, 2).click(); await hold(page); await openLens(page);
  const heldData = (await work(page)).beehive;
  await row(page).selectOption({ value: '3' }); await column(page).selectOption({ value: '8' }); await verifyLens(page, 2, heldData);
  const beforeSelection = await work(page);
  const heldCell = panel(page).locator('[data-held-cell][data-interior-cell-position="2:9"]');
  const heldRole = await heldCell.getAttribute('data-held-cell'); await heldCell.click();
  expect(await position(page)).toEqual({ row: 2, col: 9 });
  await expect(role(page, heldRole === 'foundation' ? 'empty' : heldRole!)).toHaveAttribute('aria-pressed', 'true');
  await verifyLens(page, 2, heldData); expect(await work(page)).toEqual(beforeSelection);
  await frame(page, 4).click(); const shoulder = await work(page); await verifyLens(page, 4, heldData);
  expect(await position(page)).toEqual({ row: 2, col: 9 });
  const heldMarks = await lens(page).locator('[data-lens-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-lens-held-cell')));
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees'); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10); expect(fed.beehive.actionPoints).toBe(shoulder.beehive.actionPoints - 1);
  expect(fed.beehive.day).toBe(15); expect(fed.beehive.notebook).toEqual(shoulder.beehive.notebook); expect(fed.otherTool).toEqual(shoulder.otherTool);
  await page.locator('[data-management-return-interior]').click(); await verifyLens(page, 4, heldData);
  expect(await lens(page).locator('[data-lens-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-lens-held-cell')))).toEqual(heldMarks);
  expect(await work(page)).toEqual(fed);
  await fixture(page, { pollen: null });
  await expect(row(page)).toBeEnabled(); await expect(column(page)).toBeEnabled();
  await expect(lens(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: Pattern unavailable');
  await expect(lens(page).locator('[data-interior-lens-status]')).toContainText('required colony reading is not recorded');
  expect(await lens(page).locator('[data-lens-current-cell]').evaluateAll(nodes => nodes.every(node => node.getAttribute('data-lens-current-cell') === 'unavailable'))).toBe(true);
  await verifyLens(page, 4, heldData); await expect(panel(page).locator('[data-interior-lens-locator="current"]')).toHaveCount(0);
  const missingCurrent = await work(page);
  await row(page).selectOption({ value: '5' }); await column(page).selectOption({ value: '7' });
  const heldSelected = await modelLens(page, 4, 5, 7, heldData);
  await expect(role(page, heldSelected.roleId)).toHaveAttribute('aria-pressed', 'true');
  await verifyLens(page, 4, heldData); expect(await work(page)).toEqual(missingCurrent);
  await fixture(page, { pollen: 12, experimentRunSerial: heldData.experimentRunSerial + 1 });
  await expect(lens(page).locator('[data-interior-held-lens]')).toHaveCount(0); await expect(lens(page).locator('[data-interior-current-lens]')).toBeVisible();
  await expect(panel(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await fixture(page, { experimentRunSerial: heldData.experimentRunSerial });
  await expect(lens(page).locator('[data-interior-held-lens]')).toHaveCount(0); await verifyLens(page, 4);
  const finalState = await work(page); await panel(page).locator('[data-interior-clear]').click();
  await expect(lens(page)).toBeVisible(); await verifyLens(page, 4); expect(await work(page)).toEqual(finalState);
  await fixture(page, { pollen: null }); const unknownState = await work(page);
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled(); await verifyLens(page, 4);
  expect(await work(page)).toEqual(unknownState);
});

test('cell close-up stays readable in wide and phone layouts, dark mode, forced colors and enlarged text', async ({ page }, testInfo) => {
  await mount(page); await open(page); await frame(page, 2).click(); await hold(page); await openLens(page);
  await row(page).selectOption({ value: '3' }); await column(page).selectOption({ value: '8' });
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const unchanged = await work(page);
  await auditLens(page); await captureLens(page, testInfo, 'wide');
  const pair = await lens(page).locator('.bee-interior-lens-pair > figure').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, width: node.getBoundingClientRect().width })));
  expect(pair).toHaveLength(2); expect(Math.abs(pair[0].top - pair[1].top)).toBeLessThanOrEqual(1);
  await fixture(page, { focusLayout: false }); await auditLens(page);
  await page.setViewportSize({ width: 320, height: 1800 }); await auditLens(page); await captureLens(page, testInfo, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await auditLens(page); await captureLens(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await auditLens(page); await captureLens(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await auditLens(page); await captureLens(page, testInfo, 'large-text');
  expect(await position(page)).toEqual({ row: 3, col: 8 });
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
