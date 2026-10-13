import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = '.codex-artifacts/bee-lens-navigation-2026-10-11';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const moves = [
  { id: 'up', name: 'Row above', dr: -1, dc: 0 },
  { id: 'down', name: 'Row below', dr: 1, dc: 0 },
  { id: 'left', name: 'Column left', dr: 0, dc: -1 },
  { id: 'right', name: 'Column right', dr: 0, dc: 1 },
];

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

async function mount(page: Page, withHeld = true) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Lens navigation uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive lens navigation test'); };
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
  await expect(lens(page)).toBeVisible();
  await row(page).selectOption({ value: '4' }); await column(page).selectOption({ value: '10' });
  expect(await work(page)).toEqual(original);
}

async function position(page: Page) {
  return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) };
}

async function assertCoordinates(page: Page, r: number, c: number, currentAvailable = true, heldAvailable: boolean | null = true) {
  expect(await position(page)).toEqual({ row: r, col: c });
  for (const axis of [{ id: 'row', label: 'Row', index: r, count: 11 }, { id: 'column', label: 'Column', index: c, count: 21 }]) {
    const group = lens(page).locator('[data-interior-lens-axis="' + axis.id + '"]');
    const hint = group.locator('[data-interior-lens-range="' + axis.id + '"]');
    await expect(hint).toHaveText(axis.label + ' ' + (axis.index + 1) + ' of ' + axis.count);
    const id = await hint.getAttribute('id'); expect(id).toBeTruthy();
    for (const control of await group.locator('button,select').all()) await expect(control).toHaveAttribute('aria-describedby', id!);
  }
  // Independently calculate the schematic centre and viewport. One step must
  // change exactly one coordinate; odd rows have the existing half-cell offset.
  const x = 43 + 25 * c + (r % 2 ? 12.5 : 0), y = 47 + 22 * r;
  const viewBox = (x - 55) + ' ' + (y - 48) + ' 110 96';
  const expectedPositions: string[] = [];
  for (let nr = Math.max(0, r - 2); nr <= Math.min(10, r + 2); nr++) {
    for (let nc = Math.max(0, c - 2); nc <= Math.min(20, c + 2); nc++) expectedPositions.push(nr + ':' + nc);
  }
  for (const source of ['current', 'held'] as const) {
    const available = source === 'current' ? currentAvailable : heldAvailable;
    const drawing = lens(page).locator('[data-interior-' + source + '-lens]');
    if (available === null) { await expect(drawing).toHaveCount(0); continue; }
    await expect(drawing).toHaveAttribute('viewBox', viewBox);
    await expect(drawing).toHaveAccessibleName(new RegExp('Frame 3 of 6\\. Illustration row ' + (r + 1) + ', column ' + (c + 1) + '\\.'));
    expect(await drawing.locator('[data-lens-' + source + '-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-lens-position')))).toEqual(expectedPositions);
    const rings = [drawing.locator('[data-lens-ring="' + source + '"]'), panel(page).locator('[data-interior-lens-locator="' + source + '"]')];
    for (const ring of rings) {
      if (available) { await expect(ring).toHaveAttribute('cx', String(x)); await expect(ring).toHaveAttribute('cy', String(y)); }
      else await expect(ring).toHaveCount(0);
    }
    if (!available) {
      await expect(lens(page).locator('[data-lens-mark="' + source + '"]')).toHaveText((source === 'current' ? 'Current' : 'Held') + ' mark: Pattern unavailable');
      expect(await drawing.locator('[data-lens-' + source + '-cell]').evaluateAll(nodes => nodes.every(node => node.getAttribute('data-lens-current-cell') === 'unavailable' || node.getAttribute('data-lens-held-cell') === 'unavailable'))).toBe(true);
    }
  }
  await expect(lens(page).locator('[data-interior-lens-status]')).toContainText('Illustration row ' + (r + 1) + ', column ' + (c + 1) + '.');
  if (heldAvailable !== null) await expect(lens(page).locator('[data-interior-lens-status]')).toContainText('Both close-ups use this same position.');
  await expect(panel(page).locator('[data-interior-frame][aria-pressed="true"]')).toHaveAttribute('data-interior-frame', '2');
}

async function assertAvailability(page: Page, r: number, c: number, canNavigate = true) {
  for (const select of [row(page), column(page)]) {
    if (canNavigate) await expect(select).toBeEnabled(); else await expect(select).toBeDisabled();
  }
  for (const move of moves) {
    const atEdge = r + move.dr < 0 || r + move.dr > 10 || c + move.dc < 0 || c + move.dc > 20;
    await expect(step(page, move.id)).toHaveJSProperty('disabled', !canNavigate);
    if (!canNavigate || atEdge) await expect(step(page, move.id)).toHaveAttribute('aria-disabled', 'true');
    else { await expect(step(page, move.id)).not.toHaveAttribute('aria-disabled', 'true'); await expect(step(page, move.id)).toBeEnabled(); }
  }
}

async function navigate(page: Page, id: string, key = 'Enter', currentAvailable = true, heldAvailable: boolean | null = true) {
  const move = moves.find(move => move.id === id)!;
  const original = await work(page), held = await heldReadings(page), at = await position(page);
  await step(page, id).focus(); await page.keyboard.press(key);
  const next = { row: at.row + move.dr, col: at.col + move.dc };
  await assertCoordinates(page, next.row, next.col, currentAvailable, heldAvailable);
  await assertAvailability(page, next.row, next.col, currentAvailable || heldAvailable === true);
  // Boundary steps remain in the Tab order, with aria-disabled and a guarded
  // no-op, so reaching an edge must not lose the learner's keyboard position.
  await expect(step(page, id)).toBeFocused();
  const source = currentAvailable ? 'current' : 'held';
  const rawRole = await lens(page).locator('[data-lens-' + source + '-cell][data-lens-position="' + next.row + ':' + next.col + '"]').getAttribute('data-lens-' + source + '-cell');
  await expect(panel(page).locator('[data-interior-role="' + (rawRole === 'foundation' ? 'empty' : rawRole) + '"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await work(page)).toEqual(original); expect(await heldReadings(page)).toEqual(held);
}

async function assertDisabledActionsPreservePosition(page: Page) {
  const original = await work(page), held = await heldReadings(page), at = await position(page);
  for (const move of moves) {
    if (await step(page, move.id).evaluate((node: HTMLButtonElement) => node.disabled)) {
      // Native disabled buttons reject activation; never force a Playwright click.
      await step(page, move.id).evaluate((node: HTMLButtonElement) => node.click());
      expect(await position(page)).toEqual(at); expect(await work(page)).toEqual(original);
    } else if (await step(page, move.id).getAttribute('aria-disabled') === 'true') {
      await step(page, move.id).focus();
      for (const key of ['Enter', 'Space', 'Enter']) {
        await page.keyboard.press(key); await expect(step(page, move.id)).toBeFocused();
        expect(await position(page)).toEqual(at); expect(await work(page)).toEqual(original);
      }
    }
  }
  expect(await heldReadings(page)).toEqual(held);
}

test('cell close-up moves one row or column without wrapping and keeps paired coordinates and saved colony work intact', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await expect(row(page).locator('option')).toHaveCount(11); await expect(column(page).locator('option')).toHaveCount(21);
  for (const axis of ['row', 'column']) {
    const group = lens(page).locator('[data-interior-lens-axis="' + axis + '"]');
    await expect(group).toHaveCount(1);
    await expect(group.locator('[data-interior-lens-' + axis + ']')).toHaveCount(1);
    await expect(group.locator('[data-interior-lens-range="' + axis + '"]')).toHaveText(axis === 'row' ? 'Row 5 of 11' : 'Column 11 of 21');
    await expect(group.locator('[data-interior-lens-step]')).toHaveCount(2);
  }
  await expect(lens(page).locator('[data-interior-lens-step]')).toHaveCount(4);
  for (const move of moves) await expect(step(page, move.id)).toHaveAccessibleName(move.name);
  await assertCoordinates(page, 4, 10); await assertAvailability(page, 4, 10);
  await row(page).focus();
  for (const target of [step(page, 'up'), step(page, 'down'), column(page), step(page, 'left'), step(page, 'right')]) {
    await page.keyboard.press('Tab'); await expect(target).toBeFocused();
  }
  for (const move of moves) await navigate(page, move.id, move.id === 'down' || move.id === 'right' ? 'Space' : 'Enter');
  await assertCoordinates(page, 4, 10);
  for (const at of [{ row: 0, col: 0 }, { row: 0, col: 20 }, { row: 10, col: 0 }, { row: 10, col: 20 }]) {
    const original = await work(page);
    await row(page).selectOption({ value: String(at.row) }); await column(page).selectOption({ value: String(at.col) });
    await assertCoordinates(page, at.row, at.col); await assertAvailability(page, at.row, at.col);
    await assertDisabledActionsPreservePosition(page);
    await navigate(page, at.row === 0 ? 'down' : 'up');
    await navigate(page, at.col === 0 ? 'right' : 'left');
    await navigate(page, at.row === 0 ? 'up' : 'down');
    await navigate(page, at.col === 0 ? 'left' : 'right');
    await assertCoordinates(page, at.row, at.col);
    await assertDisabledActionsPreservePosition(page);
    expect(await work(page)).toEqual(original);
  }
  await row(page).selectOption({ value: '0' }); await column(page).selectOption({ value: '0' });
  await row(page).focus();
  for (const target of [step(page, 'up'), step(page, 'down'), column(page), step(page, 'left'), step(page, 'right')]) {
    await page.keyboard.press('Tab'); await expect(target).toBeFocused();
  }
  await row(page).selectOption({ value: '4' }); await column(page).selectOption({ value: '10' });
  await fixture(page, { pollen: null });
  await assertCoordinates(page, 4, 10, false, true); await assertAvailability(page, 4, 10);
  for (const move of moves) await navigate(page, move.id, 'Enter', false, true);
  // A valid held snapshot can itself have a missing pattern input. Holding it
  // must disable all navigation when neither drawing has readable marks.
  const missing = await work(page);
  await panel(page).locator('[data-interior-hold]').click();
  expect(await work(page)).toEqual(missing);
  await assertCoordinates(page, 4, 10, false, false); await assertAvailability(page, 4, 10, false);
  await assertDisabledActionsPreservePosition(page);
  await fixture(page, { pollen: 12 });
  await assertCoordinates(page, 4, 10, true, false); await assertAvailability(page, 4, 10);
  await navigate(page, 'right', 'Enter', true, false);
  // A reference from a different run cannot provide navigation fallback.
  const runSerial = (await work(page)).beehive.experimentRunSerial;
  await fixture(page, { pollen: null, experimentRunSerial: runSerial + 1 });
  await expect(panel(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await assertCoordinates(page, 4, 11, false, null); await assertAvailability(page, 4, 11, false);
  await assertDisabledActionsPreservePosition(page);
  await fixture(page, { pollen: 12, experimentRunSerial: runSerial });
  await assertCoordinates(page, 4, 11, true, null); await assertAvailability(page, 4, 11);
  await navigate(page, 'left', 'Space', true, null);
  expect(errors).toEqual([]);
});

async function audit(scope: Locator) {
  const result = await scope.evaluate(async node => {
    const results = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,label,strong,span,button,select,figure,figcaption'))];
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

async function visual(page: Page, mode: string, heldAvailable: boolean | null = true) {
  const original = await work(page), held = await heldReadings(page);
  await audit(lens(page)); await assertCoordinates(page, 4, 10, true, heldAvailable); await assertAvailability(page, 4, 10);
  await row(page).focus(); await page.keyboard.press('Tab'); await expect(step(page, 'up')).toBeFocused();
  const focus = await step(page, 'up').evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await lens(page).screenshot({ path: artifacts + '/preview-navigation-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  await navigate(page, 'up', 'Enter', true, heldAvailable); await navigate(page, 'down', 'Space', true, heldAvailable);
  expect(await work(page)).toEqual(original); expect(await heldReadings(page)).toEqual(held);
}

test('cell close-up navigation remains readable and keyboard accessible on phones in dark forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, false);
  // With no held reference the lens occupies a narrow half-column even while
  // the overall interior is wide. Inspect that independent layout first.
  await visual(page, 'wide-single', null);
  const beforeHold = await work(page);
  await panel(page).locator('[data-interior-hold]').click();
  expect(await work(page)).toEqual(beforeHold);
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
