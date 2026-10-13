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
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function save(page: Page) { return panel(page).locator('[data-interior-evidence-save]'); }
function notice(page: Page) { return panel(page).locator('[data-interior-evidence-notice]'); }
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
async function evidenceText(page: Page) {
  const preview = panel(page).locator('[data-interior-evidence-preview]');
  await expect(preview).toBeVisible(); await expect(preview.locator('*')).toHaveCount(0);
  expect(await preview.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  const text = (await preview.textContent())!;
  expect(text.trim()).not.toBe(''); return text;
}
async function selectedPosition(page: Page, index: number) {
  const position = panel(page).locator('[data-interior-position]');
  await expect(position).toBeVisible(); await expect(position).toHaveAttribute('role', 'img');
  await expect(position).toHaveAccessibleName(new RegExp('Frame\\s*' + (index + 1) + '\\s*(?:of|/)\\s*6', 'i'));
  await expect(position.locator('[data-interior-slot]')).toHaveCount(6);
  for (let slot = 0; slot < 6; slot++) {
    await expect(position.locator('[data-interior-slot="' + slot + '"]')).toHaveAttribute('data-selected', slot === index ? 'true' : 'false');
    await expect(frame(page, slot)).toHaveAttribute('aria-pressed', slot === index ? 'true' : 'false');
  }
}
async function highlights(page: Page, selectedRole: string) {
  const marked = await panel(page).locator('[data-interior-cell][data-highlighted="true"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
  const expectedRoles = selectedRole === 'empty' ? ['empty', 'foundation'] : [selectedRole];
  for (const id of marked) expect(expectedRoles).toContain(id);
  const present = await panel(page).locator('[data-interior-cell]').evaluateAll((nodes, allowed) => nodes.some(node => allowed.includes(node.getAttribute('data-interior-cell')!)), expectedRoles);
  if (present) expect(marked.length).toBeGreaterThan(0);
  else await expect(panel(page).locator('[data-interior-highlight-note]')).toContainText(/none|no .*shown|not shown|pattern unavailable/i);
}
async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-hive-interior]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}
async function readableLayout(page: Page, checkPageOverflow = true) {
  const slotColors = await panel(page).locator('[data-interior-slot][data-selected="true"]').evaluate(node => {
    const label = node.querySelector('text')!, box = node.querySelector('rect')!;
    function luminance(value: string) {
      const rgb = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      if (rgb.length !== 3) throw new Error('Unresolved SVG color: ' + value);
      const linear = rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4); });
      return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    }
    const ink = getComputedStyle(label).fill, paper = getComputedStyle(box).fill;
    const a = luminance(ink), b = luminance(paper);
    return { ink, paper, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), label: label.textContent };
  });
  expect(slotColors.label).toMatch(/^[1-6]$/);
  expect(slotColors.contrast, JSON.stringify(slotColors)).toBeGreaterThanOrEqual(4.5);
  const result = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('div,p,h3,h4,button,dl,dt,dd,pre,aside,figure,figcaption'))];
    return {
      rootFont,
      controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(node.querySelectorAll('p,dt,dd,button,pre,figcaption')).map(el => {
        const css = getComputedStyle(el);
        return { text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth, text: el.textContent, width: el.clientWidth, display: getComputedStyle(el).display, children: Array.from(el.children).map(child => ({ tag: child.tagName, width: child.getBoundingClientRect().width, min: getComputedStyle(child).minWidth, flex: getComputedStyle(child).flex, wrapping: getComputedStyle(child).overflowWrap })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pageLeaks: Array.from(document.querySelectorAll('button,summary,input,select,h1,h2,h3,h4,p,canvas')).filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 14).map(el => ({ tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className : '', text: el.textContent?.slice(0, 60), right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })),
      pageScrollLeaks: Array.from(document.querySelectorAll('*')).filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !el.closest('[data-hive-interior]')).slice(0, 24).map(el => ({ tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className : '', text: el.textContent?.slice(0, 45), width: el.clientWidth, extra: el.scrollWidth - el.clientWidth, overflow: getComputedStyle(el).overflowX })),
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow, JSON.stringify({ box: result.pageLeaks, scroll: result.pageScrollLeaks })).toBeLessThanOrEqual(1);
  expect(result.controls.length).toBeGreaterThanOrEqual(18);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(text.ellipsis, text.text || '').toBe(false); expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
  }
}
async function preview(page: Page, testInfo: TestInfo, name: string) {
  await panel(page).screenshot({ path: testInfo.outputPath('learning-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page).locator('[data-interior-held-diagram]')).toBeVisible();
}
function comparison(page: Page) { return panel(page).locator('[data-interior-comparison]'); }
function change(page: Page, id: string, field: string) { return comparison(page).locator('[data-interior-change="' + id + '"] [data-change-' + field + ']'); }
async function pairedFrame(page: Page, index: number) {
  await selectedPosition(page, index);
  for (const hook of ['data-interior-held-diagram', 'data-hive-interior-diagram'])
    await expect(panel(page).locator('[' + hook + ']')).toHaveAccessibleName(new RegExp('Frame ' + (index + 1) + ' of 6'));
}
async function openComparisonEvidence(page: Page) {
  const details = comparison(page).locator('[data-interior-comparison-evidence]');
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) await details.locator('summary').click();
  await expect(details.locator('[data-interior-comparison-preview]')).toBeVisible();
  return (await details.locator('[data-interior-comparison-preview]').textContent())!;
}

test('held frames connect actual feeding and later days with exact comparison evidence', async ({ page }) => {
  await mount(page); await open(page);
  const before = await work(page); await hold(page); expect(await work(page)).toEqual(before);
  const heldInitial = await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')));
  expect(heldInitial).toEqual(await panel(page).locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell'))));
  await frame(page, 2).click(); await pairedFrame(page, 2);
  const heldCentre = await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')));
  const heldWork = await work(page);
  await panel(page).locator('[data-interior-management]').click();
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await expect(page.locator('[data-management-preview]')).toHaveAttribute('open', '');
  expect(await work(page)).toEqual(heldWork);
  await page.locator('[data-management-return-interior]').click();
  await expect(page.locator('#beehive-interior-title')).toBeFocused(); await pairedFrame(page, 2);
  expect(await work(page)).toEqual(heldWork);
  await panel(page).locator('[data-interior-management]').click();
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused(); expect(await work(page)).toEqual(heldWork);
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees');
  await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused();
  expect(await work(page)).toEqual(heldWork); await page.keyboard.press('Enter');
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(heldWork.beehive.actionPoints - 1);
  expect(fed.beehive.day).toBe(15); expect(fed.beehive.notebook).toEqual(heldWork.beehive.notebook);
  expect(fed.otherTool).toEqual(heldWork.otherTool);
  expect(fed.beehive.managementTrail.length).toBe((heldWork.beehive.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').click(); await pairedFrame(page, 2);
  await expect(change(page, 'food', 'held')).toHaveText('40 honey-equivalent lb');
  await expect(change(page, 'food', 'current')).toHaveText('45 honey-equivalent lb');
  await expect(change(page, 'food', 'difference')).toHaveText('+5 honey-equivalent lb');
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('Same modeled day');
  expect(await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')))).toEqual(heldCentre);
  await page.locator('#beehive-next-day').click();
  await expect(change(page, 'food', 'current')).not.toHaveText('45 honey-equivalent lb');
  const later = await work(page); expect(later.beehive.day).toBe(16);
  expect(await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')))).toEqual(heldCentre);
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('1 modeled day elapsed');
  const text = await openComparisonEvidence(page);
  expect(text).toContain('Held Day 15 → Current Day 16'); expect(text).toContain('Frame 3/6 in both schematic views');
  await comparison(page).locator('[data-interior-comparison-save]').click();
  const expected = JSON.parse(JSON.stringify(later));
  expected.beehive.notebook.beekeeper.evidence += '\n' + text;
  expected.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(expected);
  await expect(comparison(page).locator('[data-interior-comparison-save]')).toBeDisabled();
  await panel(page).locator('[data-interior-clear]').click();
  await expect(panel(page).locator('[data-interior-hold]')).toBeFocused();
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  expect(await work(page)).toEqual(expected);
});

test('held references reject rewinds and other runs and are cleared on backup restore and Undo', async ({ page }) => {
  await mount(page); await open(page); await hold(page);
  await fixture(page, { day: 14 });
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('earlier than the held day');
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  await fixture(page, { day: 16 });
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  await hold(page); await fixture(page, { experimentRunSerial: 4 });
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await fixture(page, { experimentRunSerial: 3 });
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  await fixture(page, { day: 15, pollen: null }); await hold(page);
  await expect(change(page, 'pollen', 'held')).toHaveText('Not recorded');
  await expect(change(page, 'pollen', 'difference')).toHaveText('Not comparable');
  expect(await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.every(node => node.getAttribute('data-held-cell') === 'unavailable'))).toBe(true);
  await fixture(page, { honey: 0, pollen: 0 }); await hold(page);
  await expect(change(page, 'food', 'difference')).toHaveText('0 honey-equivalent lb');
  await expect(change(page, 'pollen', 'difference')).toHaveText('0 lb');
  await fixture(page, { honey: 0.501 }); await hold(page);
  await fixture(page, { honey: 0.5005 }); await expect(change(page, 'food', 'difference')).toHaveText('0 honey-equivalent lb');
  await fixture(page, { notebookOpen: true });
  const backup = page.locator('[data-beehive-backup]'); await backup.locator('summary').click();
  const stored = (await work(page)).beehive;
  const file = { name: 'same-run-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, createdAt: '2026-10-10T12:00:00Z', state: stored })) };
  await page.locator('[data-bee-backup-file]').setInputFiles(file);
  await expect(page.locator('[data-bee-backup-restore]')).toBeVisible(); await page.locator('[data-bee-backup-restore]').click();
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  await hold(page); await page.locator('[data-bee-backup-undo]').click();
  await expect(panel(page).locator('[data-interior-held-diagram]')).toHaveCount(0);
  await fixture(page, { simulationSeed: null }); await expect(panel(page).locator('[data-interior-hold]')).toBeDisabled();
});

test('paired hive comparisons remain readable in both layouts, mobile and accessible display settings', async ({ page }, testInfo) => {
  await mount(page); await open(page); await frame(page, 2).click(); await role(page, 'open_brood').click(); await hold(page);
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  await openComparisonEvidence(page); const unchanged = await work(page);
  await readableLayout(page); await accessible(page); await pairedFrame(page, 2);
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-wide.png'), animations: 'disabled' });
  await fixture(page, { focusLayout: false }); await readableLayout(page); await accessible(page);
  await page.setViewportSize({ width: 320, height: 1800 }); await readableLayout(page); await accessible(page);
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-mobile.png'), animations: 'disabled' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await readableLayout(page); await accessible(page);
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-dark.png'), animations: 'disabled' });
  await page.emulateMedia({ forcedColors: 'active' }); await readableLayout(page); await accessible(page);
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-forced-colors.png'), animations: 'disabled' });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await readableLayout(page); await accessible(page);
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-large-text.png'), animations: 'disabled' });
  const frameLabels = await panel(page).locator('[data-interior-frame] strong').evaluateAll(nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, line: parseFloat(getComputedStyle(node).lineHeight) })));
  for (const label of frameLabels) expect(label.height).toBeLessThanOrEqual(label.line + 1);
  await panel(page).locator('[data-interior-legend]').screenshot({ path: testInfo.outputPath('comparison-large-key.png'), animations: 'disabled' });
  await comparison(page).locator('[data-interior-change="food"]').screenshot({ path: testInfo.outputPath('comparison-large-reading.png'), animations: 'disabled' });
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
