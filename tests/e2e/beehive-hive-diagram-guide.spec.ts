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

type Change = { row: number; col: number; beforeRole: string; role: string; beforeLabel: string; label: string };
function guide(page: Page) { return panel(page).locator('[data-interior-diagram-guide]'); }
function toggle(page: Page) { return guide(page).locator('[data-interior-changes-toggle]'); }
function previous(page: Page) { return guide(page).locator('[data-interior-change-previous]'); }
function next(page: Page) { return guide(page).locator('[data-interior-change-next]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
function main(page: Page, which: string) {
  return panel(page).locator(which === 'held' ? '[data-interior-held-diagram]' : '[data-hive-interior-diagram]');
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(main(page, 'held')).toBeVisible();
}
async function position(page: Page) {
  return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) };
}
async function expectedChanges(page: Page, held: Record<string, unknown>, index: number): Promise<Change[]> {
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
async function verifyOutlines(page: Page, changes: Change[], outlined: boolean) {
  for (const which of ['held', 'current']) {
    const outlines = main(page, which).locator('[data-diagram-changed="' + which + '"]');
    const actual = await outlines.evaluateAll(nodes => nodes.map(node => ({ position: node.getAttribute('data-diagram-change-position'),
      tag: node.tagName.toLowerCase(), hidden: node.getAttribute('aria-hidden'), paths: node.querySelectorAll('path').length,
      pointer: getComputedStyle(node).pointerEvents })));
    expect(actual.map(item => item.position)).toEqual(outlined ? changes.map(item => item.row + ':' + item.col) : []);
    for (const item of actual) { expect(item.tag).toBe('g'); expect(item.hidden).toBe('true'); expect(item.paths).toBe(2); expect(item.pointer).toBe('none'); }
    await expect(main(page, which).locator(which === 'held' ? '[data-held-cell]' : '[data-interior-cell]')).toHaveCount(231);
  }
}
async function verifySelectedChange(page: Page, change: Change) {
  expect(await position(page)).toEqual({ row: change.row, col: change.col });
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
  await expect(role(page, change.role)).toHaveAttribute('aria-pressed', 'true');
  await expect(lens(page).locator('[data-interior-lens-change]')).toHaveText('Diagram mark changed: ' + change.beforeLabel + ' → ' + change.label + '.');
  await expect(lens(page).locator('[data-lens-mark="held"]')).toHaveText('Held mark: ' + change.beforeLabel);
  await expect(lens(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: ' + change.label);
  await expect(toggle(page)).toBeChecked();
}
async function move(page: Page, direction: string) {
  const button = direction === 'next' ? next(page) : previous(page);
  await button.focus(); await page.keyboard.press('Enter');
}
async function audit(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-hive-interior]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  const layout = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const guide = node.querySelector('[data-interior-diagram-guide]')!, lens = node.querySelector('[data-interior-cell-lens]')!;
    const sections = [guide, lens];
    const blocks = sections.flatMap(section => [section, ...Array.from(section.querySelectorAll('div,label,p,strong,span,button,select,h4,figure,figcaption'))]);
    const controls = sections.flatMap(section => Array.from(section.querySelectorAll('button,select')));
    const checkbox = guide.querySelector('input[type="checkbox"]')! as HTMLInputElement;
    controls.push(checkbox.labels![0]);
    return {
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: blocks.filter(el => !sections.includes(el)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      controls: controls.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}
async function capture(page: Page, testInfo: TestInfo, mode: string) {
  await panel(page).locator('.bee-interior-study').screenshot({ path: testInfo.outputPath('guide-' + mode + '.png'), animations: 'disabled' });
  await panel(page).locator('.bee-interior-frame-pair').screenshot({ path: testInfo.outputPath('guide-' + mode + '-frames.png'), animations: 'disabled' });
  await lens(page).screenshot({ path: testInfo.outputPath('guide-' + mode + '-lens.png'), animations: 'disabled' });
}

test('native diagram change controls outline exact marks and wrap through close-ups without changing colony or notebook state', async ({ page }) => {
  await mount(page); await open(page); await frame(page, 2).click();
  await expect(guide(page)).toHaveCount(0); await hold(page);
  const held = (await work(page)).beehive;
  await expect(toggle(page)).not.toBeChecked(); await expect(previous(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
  await fixture(page, { honey: 45, brood: 4200, queenHealth: 85 });
  const unchanged = await work(page), changes = await expectedChanges(page, held, 2);
  expect(changes.length).toBeGreaterThan(1);
  await expect(toggle(page)).toHaveAccessibleName('Outline changed diagram marks');
  await expect(previous(page)).toHaveAccessibleName('Previous changed mark'); await expect(next(page)).toHaveAccessibleName('Next changed mark');
  await verifyOutlines(page, changes, false);
  await toggle(page).focus(); await page.keyboard.press('Space');
  await expect(toggle(page)).toBeChecked(); await verifyOutlines(page, changes, true); expect(await work(page)).toEqual(unchanged);
  await panel(page).locator('[data-interior-lens-toggle]').focus(); await page.keyboard.press('Enter');
  await row(page).selectOption({ value: '10' }); await column(page).selectOption({ value: '20' });
  await move(page, 'next'); await verifySelectedChange(page, changes[0]); expect(await work(page)).toEqual(unchanged);
  await move(page, 'next'); await verifySelectedChange(page, changes[1]); expect(await work(page)).toEqual(unchanged);
  await move(page, 'previous'); await verifySelectedChange(page, changes[0]);
  await row(page).selectOption({ value: '0' }); await column(page).selectOption({ value: '0' });
  await move(page, 'previous'); await verifySelectedChange(page, changes[changes.length - 1]);
  await move(page, 'next'); await verifySelectedChange(page, changes[0]);
  const selected = await position(page);
  await toggle(page).focus(); await page.keyboard.press('Space'); await expect(toggle(page)).not.toBeChecked();
  await verifyOutlines(page, changes, false); expect(await position(page)).toEqual(selected); expect(await work(page)).toEqual(unchanged);
  const same = await page.evaluate(({ held, index, changes }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, model = BH.bhHiveInteriorFrameModel(w.__toolData.beehive, index);
    const changed = new Set(changes.map((change: Change) => change.row + ':' + change.col));
    const cell = model.cells.find((cell: any) => !changed.has(cell.row + ':' + cell.col));
    const role = cell.role === 'foundation' ? 'empty' : cell.role;
    return { row: cell.row, col: cell.col, label: BH.BH_HIVE_INTERIOR_ROLES.find((item: any) => item.id === role).label };
  }, { held, index: 2, changes });
  await row(page).selectOption({ value: String(same.row) }); await column(page).selectOption({ value: String(same.col) });
  await expect(lens(page).locator('[data-interior-lens-change]')).toHaveText('Same diagram mark at this position: ' + same.label + '.');
  await expect(guide(page)).toContainText('These are schematic categories, not tracked physical cells. Use the whole-colony readings to measure change.');
  expect(await work(page)).toEqual(unchanged);
});

test('diagram guide follows real feeding across frames and handles unchanged readings missing patterns and invalid or restored references', async ({ page }) => {
  await mount(page); await open(page); await frame(page, 2).click(); await fixture(page, { honey: 15, syrup: 5 }); await hold(page);
  const held = (await work(page)).beehive;
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption({ value: 'feed_bees' });
  await page.locator('[data-management-preview-locate]').click(); await page.keyboard.press('Enter');
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(20); expect(fed.beehive.syrup).toBe(10); expect(fed.beehive.actionPoints).toBe(held.actionPoints - 1);
  expect(fed.beehive.day).toBe(15); expect(fed.beehive.notebook).toEqual(held.notebook);
  expect(fed.beehive.managementTrail).toHaveLength((held.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').click();
  let anyChanges = false;
  for (let index = 0; index < 6; index++) {
    await frame(page, index).click(); const state = await work(page), changes = await expectedChanges(page, held, index);
    if (changes.length) {
      anyChanges = true; await move(page, 'next');
      const selected = await position(page), selectedChange = changes.find(item => item.row === selected.row && item.col === selected.col)!;
      expect(selectedChange).toBeTruthy(); await verifySelectedChange(page, selectedChange); await verifyOutlines(page, changes, true);
    } else { await expect(previous(page)).toBeDisabled(); await expect(next(page)).toBeDisabled(); await verifyOutlines(page, changes, false); }
    expect(await work(page)).toEqual(state);
  }
  expect(anyChanges).toBe(true);
  await frame(page, 2).click(); await fixture(page, { honey: held.honey + .001, syrup: held.syrup, brood: held.brood, queenHealth: held.queenHealth });
  const small = await work(page); expect(await expectedChanges(page, held, 2)).toEqual([]);
  await expect(previous(page)).toBeDisabled(); await expect(next(page)).toBeDisabled(); await verifyOutlines(page, [], false);
  await expect(panel(page).locator('[data-interior-change="food"] [data-change-difference]')).toHaveText('+0.001 honey-equivalent lb');
  expect(await work(page)).toEqual(small);
  await fixture(page, { pollen: null }); const missing = await work(page);
  await expect(guide(page)).toBeVisible(); await expect(previous(page)).toBeDisabled(); await expect(next(page)).toBeDisabled();
  const missingReason = 'Both drawings need recorded food, pollen, brood and queen-health readings to compare their marks. Whole-colony readings may still be available below.';
  await expect(guide(page).locator('[data-interior-diagram-status]')).toHaveText(missingReason);
  await expect(lens(page).locator('[data-interior-lens-change]')).toHaveText(missingReason);
  await verifyOutlines(page, [], false); expect(await work(page)).toEqual(missing);
  await hold(page); await fixture(page, { pollen: 12 });
  await expect(guide(page)).toBeVisible(); await expect(previous(page)).toBeDisabled(); await expect(next(page)).toBeDisabled(); await verifyOutlines(page, [], false);
  await fixture(page, { experimentRunSerial: held.experimentRunSerial + 1 }); await expect(guide(page)).toHaveCount(0);
  await fixture(page, { experimentRunSerial: held.experimentRunSerial }); await expect(guide(page)).toHaveCount(0);
  const invalid = await work(page); await panel(page).locator('[data-interior-clear]').click();
  await expect(guide(page)).toHaveCount(0); expect(await work(page)).toEqual(invalid);
  await fixture(page, { honey: 40 }); await hold(page); await fixture(page, { honey: 45, notebookOpen: true });
  await expect(guide(page)).toBeVisible(); const stored = await work(page);
  await page.locator('[data-beehive-backup] summary').click();
  const file = { name: 'diagram-guide-same-run.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, createdAt: '2026-10-10T12:00:00Z', state: stored.beehive })) };
  await page.locator('[data-bee-backup-file]').setInputFiles(file); await expect(page.locator('[data-bee-backup-restore]')).toBeVisible();
  await page.locator('[data-bee-backup-restore]').click(); await expect(guide(page)).toHaveCount(0);
  await hold(page); await expect(guide(page)).toBeVisible(); await page.locator('[data-bee-backup-undo]').click(); await expect(guide(page)).toHaveCount(0);
  const restored = await work(page); expect(restored.otherTool).toEqual(stored.otherTool); expect(restored.beehive.notebook).toEqual(stored.beehive.notebook);
});

test('diagram change guide stays readable in wide and phone layouts dark mode forced colors and enlarged text', async ({ page }, testInfo) => {
  await mount(page); await open(page); await frame(page, 2).click(); await hold(page);
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const unchanged = await work(page); await move(page, 'next');
  const selected = await position(page);
  await audit(page); await capture(page, testInfo, 'wide');
  const pair = await panel(page).locator('.bee-interior-frame-pair > figure').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, width: node.getBoundingClientRect().width })));
  expect(pair).toHaveLength(2); expect(Math.abs(pair[0].top - pair[1].top)).toBeLessThanOrEqual(1);
  await fixture(page, { focusLayout: false }); await audit(page);
  await page.setViewportSize({ width: 320, height: 1800 }); await audit(page); await capture(page, testInfo, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await audit(page); await capture(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await audit(page); await capture(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await audit(page); await capture(page, testInfo, 'large-text');
  expect(await position(page)).toEqual(selected);
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
