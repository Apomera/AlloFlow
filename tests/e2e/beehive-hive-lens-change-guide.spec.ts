import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const artifacts = path.resolve('.codex-artifacts/bee-lens-changes-2026-10-13');
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

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function pair(page: Page) { return lens(page).locator('.bee-interior-lens-pair'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
function caption(page: Page, source: string) { return lens(page).locator('[data-lens-caption="' + source + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function heldReadings(page: Page) { return panel(page).locator('[data-change-held]').allTextContents(); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function position(page: Page) { return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) }; }
async function coordinates(page: Page, r: number, c: number) {
  // Displayed coordinates are one-based, while option values are zero-based.
  // Match values explicitly so a numeric string cannot select an earlier label.
  await row(page).selectOption({ value: String(r) }); await column(page).selectOption({ value: String(c) });
  await expect(row(page)).toHaveValue(String(r)); await expect(column(page)).toHaveValue(String(c));
}
async function mount(page: Page, withHeld = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive lens change guide test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 2, hive3dFramesSeen: [2],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong> & punctuation.',
          explanation: 'Keep my explanation.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  const original = await work(page);
  if (withHeld) await panel(page).locator('[data-interior-hold]').click();
  await panel(page).locator('[data-interior-lens-toggle]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
  await coordinates(page, 4, 10); expect(await work(page)).toEqual(original);
}
type Change = { row: number; col: number; beforeRole: string; role: string; beforeLabel: string; label: string };
function guide(page: Page) { return lens(page).locator('[data-interior-lens-change-guide]'); }
function progress(page: Page) { return guide(page).locator('[data-interior-lens-change-progress]'); }
function changeStep(page: Page, direction: 'previous' | 'next') { return guide(page).locator('[data-interior-lens-change-step="' + direction + '"]'); }
async function expectedChanges(page: Page, held: any, index: number): Promise<Change[]> {
  return page.evaluate(({ held, index }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const before = BH.bhHiveInteriorFrameModel(held, index), current = BH.bhHiveInteriorFrameModel(w.__toolData.beehive, index);
    if (!before.patternKnown || !current.patternKnown) return [];
    const normalize = (id: string) => id === 'foundation' ? 'empty' : id;
    const label = (id: string) => BH.BH_HIVE_INTERIOR_ROLES.find((item: any) => item.id === id).label;
    return current.cells.flatMap((cell: any, i: number) => {
      const beforeRole = normalize(before.cells[i].role), role = normalize(cell.role);
      return beforeRole === role ? [] : [{ row: cell.row, col: cell.col, beforeRole, role, beforeLabel: label(beforeRole), label: label(role) }];
    }).sort((a: Change, b: Change) => a.row * 21 + a.col - b.row * 21 - b.col);
  }, { held, index });
}
async function assertCurrentProgress(page: Page, changes: Change[]) {
  const at = await position(page), index = changes.findIndex(item => item.row === at.row && item.col === at.col);
  await expect(progress(page)).toHaveText(index >= 0 ? 'Changed mark ' + (index + 1) + ' of ' + changes.length + '.' : changes.length ? changes.length + ' changed mark' + (changes.length === 1 ? '' : 's') + ' in this frame.' : 'No changed marks in this frame.');
  for (const direction of ['previous', 'next'] as const) {
    if (changes.length) await expect(changeStep(page, direction)).toBeEnabled();
    else await expect(changeStep(page, direction)).toBeDisabled();
  }
}
async function verifySelected(page: Page, change: Change, index: number, total: number) {
  expect(await position(page)).toEqual({ row: change.row, col: change.col });
  await expect(progress(page)).toHaveText('Changed mark ' + (index + 1) + ' of ' + total + '.');
  await expect(guide(page).locator('[data-interior-lens-change]')).toHaveText('Diagram mark changed: ' + change.beforeLabel + ' → ' + change.label + '.');
  await expect(caption(page, 'held').locator('[data-lens-mark="held"]')).toHaveText('Held mark: ' + change.beforeLabel);
  await expect(caption(page, 'current').locator('[data-lens-mark="current"]')).toHaveText('Current mark: ' + change.label);
  await expect(caption(page, 'held').locator('[data-lens-caption-symbol="held"]')).toHaveAttribute('data-role', change.beforeRole);
  await expect(caption(page, 'current').locator('[data-lens-caption-symbol="current"]')).toHaveAttribute('data-role', change.role);
  await expect(panel(page).locator('[data-interior-role="' + change.role + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).locator('[data-interior-changes-toggle]')).toBeChecked();
}
async function move(page: Page, direction: 'previous' | 'next', key = 'Enter') {
  await changeStep(page, direction).focus(); await page.keyboard.press(key); await expect(changeStep(page, direction)).toBeFocused();
}
async function assertGuideSemantics(page: Page) {
  await expect(guide(page).getByText('Browse changed marks', { exact: true })).toBeVisible();
  await expect(guide(page).getByRole('group', { name: 'Browse changed diagram marks', exact: true })).toHaveClass(/bee-interior-lens-steps/);
  await expect(guide(page).locator('[role="status"],[aria-live]')).toHaveCount(0);
  for (const direction of ['previous', 'next'] as const) {
    const button = changeStep(page, direction);
    await expect(button).toHaveAccessibleName((direction === 'previous' ? 'Previous' : 'Next') + ' changed mark');
    await expect(button).toHaveAttribute('aria-describedby', 'beehive-interior-lens-change-progress beehive-interior-lens-change-help');
    await expect(button.locator('[aria-hidden="true"]')).toHaveCount(1);
  }
  const ordering = await guide(page).evaluate(node => {
    const drawingPair = node.parentElement!.querySelector('.bee-interior-lens-pair')!;
    return !!(node.compareDocumentPosition(drawingPair) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(ordering).toBe(true);
  if (await changeStep(page, 'next').isEnabled()) {
    await expect(guide(page).locator('#beehive-interior-lens-change-help')).toContainText(/row|left/i);
    await expect(guide(page).locator('#beehive-interior-lens-change-help')).toContainText(/wrap/i);
  }
  await expect(guide(page).locator('#beehive-interior-lens-change-help')).toContainText(/physical|measured/i);
}

test('close-up change guide counts and traverses every changed mark with stable keyboard focus and preserved colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(guide(page)).toHaveCount(0);
  await panel(page).locator('[data-interior-hold]').click(); const held = (await work(page)).beehive, values = await heldReadings(page);
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const original = await work(page), changes = await expectedChanges(page, held, 2); expect(changes.length).toBeGreaterThan(1);
  await assertGuideSemantics(page); await coordinates(page, 10, 20); await assertCurrentProgress(page, changes);
  for (let index = 0; index < changes.length; index++) {
    await move(page, 'next', index % 2 ? 'Space' : 'Enter');
    await verifySelected(page, changes[index], index, changes.length);
  }
  await move(page, 'next', 'Space'); await verifySelected(page, changes[0], 0, changes.length);
  await move(page, 'previous'); await verifySelected(page, changes[changes.length - 1], changes.length - 1, changes.length);
  await move(page, 'next'); await verifySelected(page, changes[0], 0, changes.length);
  expect(await work(page)).toEqual(original); expect(await heldReadings(page)).toEqual(values);
  // A manual unchanged position should show the total, and navigation should
  // use illustration order relative to that position instead of a stale index.
  const occupied = new Set(changes.map(item => item.row * 21 + item.col));
  const same = Array.from({ length: 231 }, (_, index) => index).find(index => !occupied.has(index))!;
  await coordinates(page, Math.floor(same / 21), same % 21); await assertCurrentProgress(page, changes);
  await expect(guide(page).locator('[data-interior-lens-change]')).toContainText('Same diagram mark at this position:');
  const nextIndex = changes.findIndex(item => item.row * 21 + item.col > same), after = nextIndex < 0 ? 0 : nextIndex;
  await move(page, 'next'); await verifySelected(page, changes[after], after, changes.length);
  await coordinates(page, Math.floor(same / 21), same % 21);
  const before = changes.reduce((index, item, i) => item.row * 21 + item.col < same ? i : index, -1);
  const previousIndex = before < 0 ? changes.length - 1 : before;
  await move(page, 'previous', 'Space'); await verifySelected(page, changes[previousIndex], previousIndex, changes.length);
  const selected = await position(page);
  for (const topic of ['queen', 'food', 'pollen', 'brood']) {
    await panel(page).locator('[data-interior-topic="' + topic + '"]').click();
    expect(await position(page)).toEqual(selected); await assertCurrentProgress(page, changes); expect(await work(page)).toEqual(original);
  }
  for (let index = 0; index < 6; index++) {
    await panel(page).locator('[data-interior-frame="' + index + '"]').click();
    const frameWork = await work(page), frameChanges = await expectedChanges(page, held, index);
    await assertCurrentProgress(page, frameChanges);
    if (frameChanges.length) {
      await coordinates(page, 10, 20); await move(page, 'next', index % 2 ? 'Space' : 'Enter');
      await verifySelected(page, frameChanges[0], 0, frameChanges.length);
    }
    expect(await work(page)).toEqual(frameWork); expect(await heldReadings(page)).toEqual(values);
  }
  // The existing overview actions still open and focus the close-up heading.
  await panel(page).locator('[data-interior-frame="2"]').click();
  const final = await work(page);
  for (const direction of ['previous', 'next']) {
    const button = panel(page).locator('[data-interior-change-' + direction + ']');
    await button.focus(); await page.keyboard.press('Enter'); await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
    await assertCurrentProgress(page, changes); expect(await work(page)).toEqual(final);
  }
  await lens(page).locator('[data-interior-lens-close]').click(); await expect(guide(page)).toHaveCount(0);
  await panel(page).locator('[data-interior-lens-toggle]').click(); await assertCurrentProgress(page, changes);
  expect(await work(page)).toEqual(final); expect(errors).toEqual([]);
});

async function guardDisabled(page: Page, expected: string) {
  await expect(progress(page)).toHaveText(expected);
  const original = await work(page), at = await position(page), status = await guide(page).locator('[data-interior-lens-change]').textContent();
  for (const direction of ['previous', 'next'] as const) {
    const button = changeStep(page, direction); await expect(button).toBeDisabled();
    expect(await button.evaluate(node => (node as HTMLButtonElement).disabled)).toBe(true);
    await button.evaluate(node => (node as HTMLButtonElement).click());
    expect(await position(page)).toEqual(at); expect(await work(page)).toEqual(original);
    await expect(progress(page)).toHaveText(expected); await expect(guide(page).locator('[data-interior-lens-change]')).toHaveText(status!);
  }
}

test('close-up change guide distinguishes zero and single changes from missing patterns and invalid references', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true); const held = (await work(page)).beehive;
  await assertGuideSemantics(page); await guardDisabled(page, 'No changed marks in this frame.');
  await fixture(page, { honey: held.honey + .001 });
  expect(await expectedChanges(page, held, 2)).toEqual([]);
  await guardDisabled(page, 'No changed marks in this frame.');
  await expect(panel(page).locator('[data-interior-change="food"] [data-change-difference]')).toHaveText('+0.001 honey-equivalent lb');
  // Only the queen score varies; find the first threshold that changes one
  // deterministic schematic mark, independently comparing normalized roles.
  const one = await page.evaluate(held => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const before = BH.bhHiveInteriorFrameModel(held, 2), normalize = (id: string) => id === 'foundation' ? 'empty' : id;
    for (let step = 1; step <= 900; step++) {
      const queenHealth = (900 - step) / 10;
      const after = BH.bhHiveInteriorFrameModel({ ...held, queenHealth }, 2);
      const changes = after.cells.filter((cell: any, i: number) => normalize(cell.role) !== normalize(before.cells[i].role));
      if (changes.length === 1) return queenHealth;
      if (changes.length > 1) break;
    }
    return null;
  }, held);
  expect(one, 'fixture must contain a one-mark queen-score threshold').not.toBeNull();
  await fixture(page, { honey: held.honey, queenHealth: one });
  const single = await expectedChanges(page, held, 2); expect(single).toHaveLength(1);
  const same = single[0].row === 0 && single[0].col === 0 ? { row: 0, col: 1 } : { row: 0, col: 0 };
  await coordinates(page, same.row, same.col); await expect(progress(page)).toHaveText('1 changed mark in this frame.');
  const beforeMoves = await work(page);
  for (const direction of ['next', 'next', 'previous'] as const) {
    await move(page, direction, direction === 'previous' ? 'Space' : 'Enter'); await verifySelected(page, single[0], 0, 1);
    expect(await work(page)).toEqual(beforeMoves);
  }
  await fixture(page, { pollen: null });
  await guardDisabled(page, 'Change count unavailable.');
  await expect(caption(page, 'current').locator('[data-lens-caption-symbol]')).toHaveCount(0);
  await expect(caption(page, 'held').locator('[data-lens-caption-symbol]')).toHaveCount(1);
  const reason = 'Both drawings need recorded food, pollen, brood and queen-health readings to compare their marks. Whole-colony readings may still be available below.';
  await expect(guide(page).locator('[data-interior-lens-change]')).toHaveText(reason);
  await panel(page).locator('[data-interior-hold]').click(); await guardDisabled(page, 'Change count unavailable.');
  await expect(row(page)).toBeDisabled();
  await fixture(page, { pollen: 12 }); await guardDisabled(page, 'Change count unavailable.');
  await expect(caption(page, 'current').locator('[data-lens-caption-symbol]')).toHaveCount(1);
  await expect(caption(page, 'held').locator('[data-lens-caption-symbol]')).toHaveCount(0);
  await expect(row(page)).toBeEnabled();
  await fixture(page, { experimentRunSerial: held.experimentRunSerial + 1 }); const invalid = await work(page);
  await expect(guide(page)).toHaveCount(0); await expect(pair(page)).toHaveAttribute('data-paired', 'false');
  await expect(panel(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await panel(page).locator('[data-interior-clear]').click(); await expect(guide(page)).toHaveCount(0); expect(await work(page)).toEqual(invalid);
  await panel(page).locator('[data-interior-hold]').click(); await guardDisabled(page, 'No changed marks in this frame.');
  await panel(page).locator('[data-interior-clear]').click(); await expect(guide(page)).toHaveCount(0); expect(await work(page)).toEqual(invalid);
  expect(errors).toEqual([]);
});

async function audit(page: Page) {
  const result = await lens(page).evaluate(async node => {
    const sections = [node.querySelector('[data-interior-lens-change-guide]')!, node.querySelector('.bee-interior-lens-pair')!];
    const violations: any[] = [];
    for (const section of sections) {
      const results = await (window as any).axe.run(section, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
      violations.push(...results.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) })));
    }
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = sections.flatMap(section => [section, ...Array.from(section.querySelectorAll('div,p,h5,strong,span,button,figure,figcaption'))]);
    return {
      violations,
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(sections[0].querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  expect(result.controls).toHaveLength(2);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  await changeStep(page, 'previous').focus(); await page.keyboard.press('Tab'); await expect(changeStep(page, 'next')).toBeFocused();
  const focus = await changeStep(page, 'next').evaluate(node => { const css = getComputedStyle(node); return { style: css.outlineStyle, outline: parseFloat(css.outlineWidth) }; });
  expect(focus.style).not.toBe('none'); expect(focus.outline).toBeGreaterThanOrEqual(2);
}
async function bounds(page: Page) {
  return lens(page).evaluate(node => {
    const a = node.querySelector('[data-interior-lens-change-guide]')!.getBoundingClientRect(), b = node.querySelector('.bee-interior-lens-pair')!.getBoundingClientRect();
    return { x: Math.min(a.left, b.left), y: a.top, width: Math.max(a.right, b.right) - Math.min(a.left, b.left), height: b.bottom - a.top, top: a.top + window.scrollY };
  });
}
async function assertWholeControlWords(page: Page) {
  const words = await guide(page).evaluate(node => {
    const result: { word: string; lineTops: number[] }[] = [];
    for (const button of Array.from(node.querySelectorAll('button'))) {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT); let text: Node | null;
      while ((text = walker.nextNode())) {
        for (const match of (text.textContent || '').matchAll(/\b(Previous|Next|changed|mark)\b/g)) {
          const range = document.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
          result.push({ word: match[0], lineTops: Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top) });
        }
      }
    }
    return result;
  });
  expect(words.map(item => item.word)).toEqual(['Previous', 'changed', 'mark', 'Next', 'changed', 'mark']);
  for (const item of words) {
    expect(item.lineTops.length, item.word + ' must remain visible').toBeGreaterThan(0);
    expect(Math.max(...item.lineTops) - Math.min(...item.lineTops), item.word + ' must not split inside the word').toBeLessThanOrEqual(1);
  }
}
async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true }); const initial = await bounds(page);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < initial.height) {
    expect(tiles.length).toBeLessThan(12); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), initial.top + offset);
    const box = await bounds(page), y = box.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, initial.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-lens-changes-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box.x, y, width: box.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-lens-changes-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: initial.height, tiles }, null, 2));
}

test('close-up change navigation and paired drawings remain readable in five accessible display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true); const held = (await work(page)).beehive;
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const changes = await expectedChanges(page, held, 2); expect(changes.length).toBeGreaterThan(1);
  const index = changes.findIndex(item => /brood/.test(item.beforeRole) && /brood/.test(item.role)); expect(index).toBeGreaterThanOrEqual(0);
  const at = changes[index]; await coordinates(page, at.row, at.col);
  const original = await work(page), values = await heldReadings(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await assertGuideSemantics(page); await assertCurrentProgress(page, changes); await audit(page);
    await move(page, 'next', 'Space'); const nextIndex = (index + 1) % changes.length; await verifySelected(page, changes[nextIndex], nextIndex, changes.length);
    await move(page, 'previous'); await verifySelected(page, at, index, changes.length);
    if (mode === 'large') await assertWholeControlWords(page);
    await capture(page, mode);
    expect(await work(page)).toEqual(mode === 'wide' ? original : { ...original, beehive: { ...original.beehive, focusLayout: false } });
    expect(await heldReadings(page)).toEqual(values); expect(await position(page)).toEqual({ row: at.row, col: at.col });
  }
  expect(errors).toEqual([]);
});
