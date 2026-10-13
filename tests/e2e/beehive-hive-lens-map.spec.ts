import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = '.codex-artifacts/bee-lens-map-2026-10-12';
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
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function map(page: Page) { return lens(page).locator('[data-interior-lens-map]'); }
function navigation(page: Page) { return lens(page).locator('[data-interior-lens-navigation]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
function step(page: Page, id: string) { return lens(page).locator('[data-interior-lens-step="' + id + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function heldReadings(page: Page) { return panel(page).locator('[data-change-held]').allTextContents(); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function position(page: Page) {
  return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) };
}

async function mount(page: Page, withHeld = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Lens map uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive lens map test'); };
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
  const original = await work(page);
  if (withHeld) await panel(page).locator('[data-interior-hold]').click();
  await panel(page).locator('[data-interior-lens-toggle]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
  await expect(map(page)).toBeVisible();
  await row(page).selectOption({ value: '4' }); await column(page).selectOption({ value: '10' });
  expect(await work(page)).toEqual(original);
}

async function assertMap(page: Page, frame: number, r: number, c: number, paired = false) {
  expect(await position(page)).toEqual({ row: r, col: c });
  await expect(map(page).getByRole('heading', { name: 'Where this close-up sits', level: 5 })).toBeVisible();
  const drawing = map(page).locator('[data-lens-map-diagram]');
  await expect(drawing).toHaveAttribute('role', 'img');
  await expect(drawing).toHaveAccessibleName(new RegExp('Frame ' + (frame + 1) + ' of 6.*Row ' + (r + 1) + ' of 11.*Column ' + (c + 1) + ' of 21', 'i'));
  // The expected geometry is calculated independently of the lens helper.
  // Odd rows keep their existing half-cell offset, including at the edges.
  const x = 43 + 25 * c + (r % 2 ? 12.5 : 0), y = 47 + 22 * r;
  const attributes = await drawing.evaluate(node => {
    const window = node.querySelector('[data-lens-map-window]')!;
    const marker = node.querySelector('[data-lens-map-position]')!;
    return {
      viewBox: node.getAttribute('viewBox'),
      window: ['x', 'y', 'width', 'height'].map(name => Number(window.getAttribute(name))),
      marker: ['cx', 'cy', 'r'].map(name => Number(marker.getAttribute(name))),
      focusable: node.querySelectorAll('button,select,input,a[href],[role="button"],[tabindex]:not([tabindex="-1"])').length,
      ownTabIndex: node.getAttribute('tabindex'),
      cellMarks: node.querySelectorAll('[data-interior-cell],[data-held-cell],[data-lens-current-cell],[data-lens-held-cell],[data-position-study-cell]').length,
    };
  });
  expect(attributes).toEqual({ viewBox: '-20 -10 650 345', window: [x - 55, y - 48, 110, 96], marker: [x, y, 16], focusable: 0, ownTabIndex: null, cellMarks: 0 });
  await expect(drawing.locator('[data-lens-map-crosshair]')).toHaveCount(1);
  await expect(lens(page).locator('[data-interior-current-lens]')).toHaveAttribute('viewBox', (x - 55) + ' ' + (y - 48) + ' 110 96');
  const held = lens(page).locator('[data-interior-held-lens]');
  if (paired) await expect(held).toHaveAttribute('viewBox', (x - 55) + ' ' + (y - 48) + ' 110 96');
  else await expect(held).toHaveCount(0);
  const context = map(page).locator('[data-lens-map-context]');
  await expect(context).toContainText(paired ? 'Both close-ups use this illustration position.' : 'The close-up below uses this illustration position.');
  await expect(context).toContainText('Position guide only; it does not show food, brood or the queen.');
  await expect(map(page)).toContainText('Columns: 1 at left → 21 at right');
  await expect(map(page)).toContainText('Rows: 1 at top → 11 at bottom');
  await expect(panel(page).locator('[data-interior-frame][aria-pressed="true"]')).toHaveAttribute('data-interior-frame', String(frame));
}

test('the orientation map follows native coordinates and one-step navigation on every frame without changing saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const points = [[0, 0], [0, 20], [10, 0], [10, 20], [0, 10], [10, 10], [5, 0], [5, 20], [5, 10]];
  for (let frame = 0; frame < 6; frame++) {
    await panel(page).locator('[data-interior-frame="' + frame + '"]').click();
    // Frame selection records the selected/seen frame. Every inspection after
    // that baseline must preserve the complete persisted state.
    const original = await work(page);
    for (const [r, c] of points) {
      await row(page).selectOption({ value: String(r) }); await column(page).selectOption({ value: String(c) });
      await assertMap(page, frame, r, c); expect(await work(page)).toEqual(original);
    }
    for (const move of [
      { id: 'up', r: 4, c: 10, key: 'Enter' }, { id: 'right', r: 4, c: 11, key: 'Space' },
      { id: 'down', r: 5, c: 11, key: 'Enter' }, { id: 'left', r: 5, c: 10, key: 'Space' },
    ]) {
      await step(page, move.id).focus(); await page.keyboard.press(move.key);
      await expect(step(page, move.id)).toBeFocused(); await assertMap(page, frame, move.r, move.c);
      expect(await work(page)).toEqual(original);
    }
  }
  // The diagram adds no keyboard stop between the existing native controls.
  await row(page).focus();
  for (const target of [step(page, 'up'), step(page, 'down'), column(page), step(page, 'left'), step(page, 'right')]) {
    await page.keyboard.press('Tab'); await expect(target).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('role and changed-mark inspection update the map while missing and invalid references keep honest position guidance', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true);
  const original = await work(page), held = await heldReadings(page);
  for (const id of ['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty']) {
    const previous = await position(page);
    const expected = await page.evaluate(({ id, previous }) => {
      const w = window as any, model = w.__RR_TEST_EXPORTS__.beehive.bhHiveInteriorFrameModel(w.__toolData.beehive, 2);
      const cells = model.cells.filter((cell: any) => cell.role === id || id === 'empty' && cell.role === 'foundation');
      cells.sort((a: any, b: any) => Math.abs(a.row - previous.row) + Math.abs(a.col - previous.col) - Math.abs(b.row - previous.row) - Math.abs(b.col - previous.col) || a.row - b.row || a.col - b.col);
      return cells.length ? { row: cells[0].row, col: cells[0].col } : previous;
    }, { id, previous });
    await panel(page).locator('[data-interior-role="' + id + '"]').focus(); await page.keyboard.press('Enter');
    await assertMap(page, 2, expected.row, expected.col, true);
    expect(await work(page)).toEqual(original); expect(await heldReadings(page)).toEqual(held);
  }
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const changed = await work(page);
  const positions = await panel(page).evaluate(node => {
    const held = new Map(Array.from(node.querySelectorAll('[data-held-cell]')).map(cell => [cell.getAttribute('data-interior-cell-position'), cell.getAttribute('data-held-cell')]));
    return Array.from(node.querySelectorAll('[data-interior-cell]')).filter(cell => held.get(cell.getAttribute('data-interior-cell-position')) !== cell.getAttribute('data-interior-cell')).map(cell => {
      const [row, col] = cell.getAttribute('data-interior-cell-position')!.split(':').map(Number);
      return { row, col };
    }).sort((a, b) => a.row - b.row || a.col - b.col);
  });
  expect(positions.length).toBeGreaterThan(0);
  for (const direction of ['next', 'previous']) {
    const before = await position(page), index = before.row * 21 + before.col;
    const expected = direction === 'next'
      ? positions.find(at => at.row * 21 + at.col > index) || positions[0]
      : [...positions].reverse().find(at => at.row * 21 + at.col < index) || positions[positions.length - 1];
    await panel(page).locator('[data-interior-change-' + direction + ']').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
    await assertMap(page, 2, expected.row, expected.col, true);
    expect(await work(page)).toEqual(changed); expect(await heldReadings(page)).toEqual(held);
  }
  await row(page).selectOption({ value: '3' }); await column(page).selectOption({ value: '8' });
  await fixture(page, { pollen: null });
  const missingCurrent = await work(page);
  await expect(lens(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: Pattern unavailable');
  await assertMap(page, 2, 3, 8, true);
  await step(page, 'right').focus(); await page.keyboard.press('Enter');
  await assertMap(page, 2, 3, 9, true); expect(await work(page)).toEqual(missingCurrent);
  await panel(page).locator('[data-interior-hold]').click();
  const missingHeld = await heldReadings(page);
  await expect(lens(page).locator('[data-lens-mark="held"]')).toHaveText('Held mark: Pattern unavailable');
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled();
  await assertMap(page, 2, 3, 9, true); expect(await work(page)).toEqual(missingCurrent);
  for (const id of ['up', 'down', 'left', 'right']) {
    await expect(step(page, id)).toBeDisabled();
    await step(page, id).evaluate((node: HTMLButtonElement) => node.click());
  }
  await assertMap(page, 2, 3, 9, true); expect(await work(page)).toEqual(missingCurrent); expect(await heldReadings(page)).toEqual(missingHeld);
  await fixture(page, { pollen: 12, experimentRunSerial: original.beehive.experimentRunSerial + 1 });
  const otherRun = await work(page);
  await expect(panel(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await assertMap(page, 2, 3, 9); expect(await work(page)).toEqual(otherRun);
  await panel(page).locator('[data-interior-clear]').click();
  await assertMap(page, 2, 3, 9); expect(await work(page)).toEqual(otherRun);
  await fixture(page, { pollen: null });
  const noPattern = await work(page);
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled();
  await assertMap(page, 2, 3, 9); expect(await work(page)).toEqual(noPattern);
  expect(errors).toEqual([]);
});

async function audit(scope: Locator) {
  const result = await scope.evaluate(async node => {
    const results = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,p,h5,label,strong,span,button,select,figure,figcaption'))];
    return {
      violations: results.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) })),
      overflow: elements.filter(el => el.getClientRects().length > 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node && el.getClientRects().length > 0 && !['DIV', 'FIGURE'].includes(el.tagName)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button,select')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}

async function visual(page: Page, mode: string) {
  const original = await work(page), held = await heldReadings(page);
  await audit(navigation(page)); await assertMap(page, 2, 4, 10, true);
  await row(page).focus(); await page.keyboard.press('Tab'); await expect(step(page, 'up')).toBeFocused();
  const focus = await step(page, 'up').evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await navigation(page).screenshot({ path: artifacts + '/preview-map-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  await page.keyboard.press('Enter'); await expect(step(page, 'up')).toBeFocused(); await assertMap(page, 2, 3, 10, true);
  await step(page, 'down').focus(); await page.keyboard.press('Space'); await expect(step(page, 'down')).toBeFocused();
  await assertMap(page, 2, 4, 10, true);
  expect(await work(page)).toEqual(original); expect(await heldReadings(page)).toEqual(held);
}

test('orientation and navigation stay readable in wide and phone layouts dark mode forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true);
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const original = await work(page), held = await heldReadings(page);
  await visual(page, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  const mobile = await work(page);
  expect(mobile).toEqual({ ...original, beehive: { ...original.beehive, focusLayout: false } });
  await visual(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await visual(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await visual(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await visual(page, 'large');
  expect(await work(page)).toEqual(mobile); expect(await heldReadings(page)).toEqual(held);
  expect(errors).toEqual([]);
});
