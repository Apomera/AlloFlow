import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
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

function inquiry(page: Page) { return panel(page).locator('[data-interior-inquiry]'); }
function notebook(page: Page) { return page.locator('[data-beehive-notebook="beekeeper"]'); }
function field(page: Page, id: string) { return notebook(page).locator('[data-notebook-field="' + id + '"]'); }
function context(page: Page) { return notebook(page).locator('[data-notebook-hive-context]'); }
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page).locator('[data-interior-held-diagram]')).toBeVisible();
}
async function goToWriting(page: Page, id: string) {
  await inquiry(page).locator('[data-interior-inquiry-' + id + ']').focus(); await page.keyboard.press('Enter');
  await expect(notebook(page)).toHaveAttribute('open', '');
  await expect(field(page, id)).toBeFocused();
}
async function returnToHive(page: Page) {
  await context(page).locator('[data-notebook-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
}
async function auditInquiry(page: Page) {
  for (const selector of ['[data-interior-inquiry]', '[data-notebook-hive-context]']) {
    const violations = await page.evaluate(async selector => {
      const audit = await (window as any).axe.run(document.querySelector(selector), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
      });
      return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }, selector);
    expect(violations).toEqual([]);
    const layout = await page.locator(selector).evaluate(node => {
      const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const elements = [node, ...Array.from(node.querySelectorAll('ol,li,p,strong,span,button,h4'))];
      return {
        overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
        text: elements.filter(el => el !== node).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
        controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      };
    });
    expect(layout.overflow).toEqual([]);
    for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
    for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  }
  const overflow = await page.evaluate(() => ({ extra: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    leaks: Array.from(document.querySelectorAll('*')).filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).slice(0, 16).map(el => ({ tag: el.tagName, cls: el.className, text: el.textContent?.slice(0, 55), extra: el.scrollWidth - el.clientWidth })) }));
  expect(overflow.extra, JSON.stringify(overflow.leaks)).toBeLessThanOrEqual(1);
}
async function captureInquiry(page: Page, testInfo: TestInfo, mode: string) {
  await inquiry(page).screenshot({ path: testInfo.outputPath('inquiry-' + mode + '-guide.png'), animations: 'disabled' });
  const position = await context(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10);
    await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await context(page).boundingBox(); expect(box).not.toBeNull();
    const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'inquiry-' + mode + '-context' + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: testInfo.outputPath(file), animations: 'disabled', fullPage: false,
      clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(testInfo.outputPath('inquiry-' + mode + '-context-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('inquiry handoffs preserve the held frame, existing writing and review flags and focus already-open fields', async ({ page }) => {
  await mount(page); await open(page); await frame(page, 2).click(); await role(page, 'honey').click(); await hold(page);
  await expect(inquiry(page).locator('li')).toHaveCount(3);
  const held = await work(page);
  await goToWriting(page, 'prediction');
  const opened = { ...held, beehive: { ...held.beehive, notebookOpen: true } };
  expect(await work(page)).toEqual(opened);
  await expect(field(page, 'prediction')).toHaveValue(held.beehive.notebook.beekeeper.prediction);
  await expect(context(page)).toContainText('Held Day 15 → Current Day 15');
  await expect(context(page)).toContainText('Frame 3/6');
  await expect(context(page).locator('[data-notebook-hive-context-reading="food"]')).toHaveCount(1);
  await expect(context(page).locator('[data-notebook-hive-value="held"]')).toHaveText('40 honey-equivalent lb');
  await expect(context(page).locator('[data-notebook-hive-value="current"]')).toHaveText('40 honey-equivalent lb');
  const prediction = 'After one modeled day, I predict food stores will decrease because bees use food.';
  await field(page, 'prediction').fill(prediction);
  const predicted = JSON.parse(JSON.stringify(opened));
  predicted.beehive.notebook.beekeeper.prediction = prediction;
  predicted.beehive.notebook.beekeeper.review.prediction = false;
  expect(await work(page)).toEqual(predicted);
  await returnToHive(page);
  await expect(frame(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).locator('[data-interior-held-diagram]')).toBeVisible();
  expect(await work(page)).toEqual(predicted);
  await goToWriting(page, 'prediction'); expect(await work(page)).toEqual(predicted);
  await returnToHive(page);
  await fixture(page, { day: 16, honey: 45 });
  const later = await work(page);
  await goToWriting(page, 'explanation'); expect(await work(page)).toEqual(later);
  await expect(context(page)).toContainText('Held Day 15 → Current Day 16');
  await expect(context(page).locator('[data-notebook-hive-context-reading="food"]')).toHaveCount(1);
  await expect(context(page).locator('[data-notebook-hive-value="held"]')).toHaveText('40 honey-equivalent lb');
  await expect(context(page).locator('[data-notebook-hive-value="current"]')).toHaveText('45 honey-equivalent lb');
  await expect(context(page).locator('[data-notebook-hive-value="difference"]')).toHaveText('+5 honey-equivalent lb');
  await expect(context(page).locator('[data-notebook-hive-card="difference"] dt')).toHaveText('Current minus held');
  const explanation = 'Food increased by 5 honey-equivalent lb. My prediction was not supported by these readings; other choices or conditions could matter.';
  await field(page, 'explanation').fill(explanation);
  const explained = JSON.parse(JSON.stringify(later));
  explained.beehive.notebook.beekeeper.explanation = explanation;
  explained.beehive.notebook.beekeeper.review.explanation = false;
  expect(await work(page)).toEqual(explained);
  await returnToHive(page); await goToWriting(page, 'explanation'); expect(await work(page)).toEqual(explained);
  await returnToHive(page);
  await inquiry(page).locator('[data-interior-management]').click();
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused(); expect(await work(page)).toEqual(explained);
  await page.locator('[data-management-return-interior]').click(); expect(await work(page)).toEqual(explained);
  await panel(page).locator('[data-interior-clear]').click();
  await expect(context(page)).toHaveCount(0); expect(await work(page)).toEqual(explained);
});

test('notebook inquiry context reports invalid references honestly and disappears on restore and Undo', async ({ page }) => {
  await mount(page); await open(page);
  await expect(inquiry(page).locator('[data-interior-inquiry-explanation]')).toBeDisabled();
  await frame(page, 4).click(); await role(page, 'pollen').click(); await hold(page);
  await fixture(page, { day: 14 }); await goToWriting(page, 'prediction');
  await expect(context(page)).toContainText('earlier than the held day');
  await expect(context(page).locator('[data-notebook-hive-context-reading]')).toHaveCount(0);
  await expect(inquiry(page).locator('[data-interior-inquiry-explanation]')).toBeDisabled();
  const invalid = await work(page);
  await returnToHive(page); expect(await work(page)).toEqual(invalid);
  await expect(frame(page, 4)).toHaveAttribute('aria-pressed', 'true');
  await fixture(page, { day: 16 }); await goToWriting(page, 'prediction');
  await expect(context(page)).toContainText('earlier than the held day');
  const beforeBackup = await work(page);
  const backup = page.locator('[data-beehive-backup]');
  if (!(await backup.evaluate(node => (node as HTMLDetailsElement).open))) await backup.locator('summary').click();
  const stored = (await work(page)).beehive;
  await page.locator('[data-bee-backup-file]').setInputFiles({ name: 'same-run-inquiry-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, createdAt: '2026-10-10T17:00:00Z', state: stored })) });
  await expect(page.locator('[data-bee-backup-restore]')).toBeVisible(); await page.locator('[data-bee-backup-restore]').click();
  await expect(context(page)).toHaveCount(0);
  expect((await work(page)).beehive.notebook).toEqual(beforeBackup.beehive.notebook);
  await hold(page); await goToWriting(page, 'prediction'); await expect(context(page)).toBeVisible();
  await page.locator('[data-bee-backup-undo]').click(); await expect(context(page)).toHaveCount(0);
  expect((await work(page)).beehive.notebook).toEqual(beforeBackup.beehive.notebook);
  await hold(page); await fixture(page, { colonySurvived: false });
  await expect(inquiry(page).locator('[data-interior-management]')).toBeDisabled();
  await expect(inquiry(page).locator('[data-interior-inquiry-explanation]')).toBeEnabled();
  const ended = await work(page); await goToWriting(page, 'explanation');
  expect(await work(page)).toEqual({ ...ended, beehive: { ...ended.beehive, notebookOpen: true } });
  await expect(context(page)).toContainText('Held Day 16 → Current Day 16');
});

test('inquiry guide and notebook context stay readable in both layouts and accessible display settings', async ({ page }, testInfo) => {
  await mount(page); await open(page); await frame(page, 2).click(); await role(page, 'honey').click(); await hold(page);
  await fixture(page, { day: 16, honey: 45 }); await goToWriting(page, 'prediction');
  const unchanged = await work(page);
  await auditInquiry(page); await captureInquiry(page, testInfo, 'wide');
  const cards = await inquiry(page).locator('li').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, width: node.getBoundingClientRect().width })));
  expect(Math.max(...cards.map(card => card.top)) - Math.min(...cards.map(card => card.top))).toBeLessThanOrEqual(1);
  await fixture(page, { focusLayout: false }); await auditInquiry(page);
  await page.setViewportSize({ width: 320, height: 1800 }); await auditInquiry(page); await captureInquiry(page, testInfo, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await auditInquiry(page); await captureInquiry(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await auditInquiry(page); await captureInquiry(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await auditInquiry(page); await captureInquiry(page, testInfo, 'large-text');
  const splitWords = await page.locator('[data-interior-inquiry] button, [data-notebook-hive-context] h4, [data-notebook-return-interior]').evaluateAll(nodes => nodes.flatMap(node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), split: string[] = [];
    while (walker.nextNode()) {
      const text = walker.currentNode;
      for (const word of (text.textContent || '').matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(text, word.index!); range.setEnd(text, word.index! + word[0].length);
        if (range.getClientRects().length > 1) split.push(word[0]);
      }
    }
    return split;
  }));
  expect(splitWords).toEqual([]);
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
