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
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
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

test('frame orientation and comb roles support honest notebook evidence while preserving the colony and existing writing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await work(page); await open(page);
  const opened = JSON.parse(JSON.stringify(initial));
  Object.assign(opened.beehive, { show3dHive: true, hive3dExploded: true, hive3dPart: 'brood_frames' });
  expect(await work(page)).toEqual(opened); await selectedPosition(page, 0);
  await frame(page, 2).focus(); await page.keyboard.press('Space');
  const explored = JSON.parse(JSON.stringify(opened));
  Object.assign(explored.beehive, { hive3dFrame: 2, hive3dFramesSeen: [2] });
  expect(await work(page)).toEqual(explored); await selectedPosition(page, 2); await expect(frame(page, 2)).toBeFocused();
  await expect(panel(page).locator('[data-interior-legend]')).toBeVisible();
  await expect(panel(page).locator('[data-interior-role]')).toHaveCount(6);

  for (const id of roleIds) {
    const priorTopic = await panel(page).locator('[data-interior-topic][aria-pressed="true"]').getAttribute('data-interior-topic');
    await role(page, id).focus(); await page.keyboard.press('Enter');
    await expect(role(page, id)).toHaveAttribute('aria-pressed', 'true'); await expect(role(page, id)).toBeFocused();
    await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(1);
    const compatibleTopic = id === 'honey' ? 'food' : id === 'pollen' ? 'pollen' : /brood/.test(id) ? 'brood' : priorTopic!;
    await expect(topic(page, compatibleTopic)).toHaveAttribute('aria-pressed', 'true');
    await highlights(page, id); await expect(panel(page).locator('[data-interior-highlight-note]')).not.toHaveText('');
    const cellDetail = panel(page).locator('[data-interior-cell-detail]');
    await expect(cellDetail).toBeVisible();
    if (id === 'open_brood') await expect(cellDetail).toContainText(/hollow|open.*circle/i);
    if (id === 'capped_brood') await expect(cellDetail).toContainText(/filled|solid/i);
    if (id === 'drone_brood') await expect(cellDetail).toContainText(/larger|large.*circle/i);
    if (id === 'empty') await expect(cellDetail).toContainText(/empty|foundation/i);
    expect(await work(page)).toEqual(explored);
  }

  // Topic buttons broaden the highlight without awarding a queen discovery.
  await topic(page, 'brood').focus(); await page.keyboard.press('Space');
  await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(0);
  const broadRoles = await panel(page).locator('[data-interior-cell][data-highlighted="true"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
  expect(broadRoles.length).toBeGreaterThan(0); for (const id of broadRoles) expect(id).toMatch(/brood/);
  await topic(page, 'queen').click();
  await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(0);
  await expect(panel(page).locator('[data-interior-cell][data-highlighted="true"]')).toHaveCount(0);
  await expect(panel(page).locator('[data-interior-detail]')).toContainText(/does not.*locat|not.*location/i);
  expect(await work(page)).toEqual(explored); expect((await work(page)).beehive.hive3dFoundQueen).toBe(false);

  // Pointer selection and the keyboard legend describe the same cell category.
  await panel(page).locator('[data-interior-cell="honey"]').first().click();
  await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  await expect(topic(page, 'food')).toHaveAttribute('aria-pressed', 'true'); await highlights(page, 'honey');
  expect(await work(page)).toEqual(explored);
  const text = await evidenceText(page);
  for (const fragment of [/Day\s*15/i, /Manual days/i, /Frame\s*3\s*\/\s*6/i, /model pattern/i, /honey|food/i, /40\s*honey-equivalent lb/i]) expect(text).toMatch(fragment);
  expect(text).toMatch(/schematic|illustration|not.*(?:census|count|measur)/i);
  await expect(save(page)).toBeEnabled(); await expect(notice(page)).toHaveAttribute('aria-live', 'polite');
  await save(page).focus(); await page.keyboard.press('Enter');
  const saved = JSON.parse(JSON.stringify(explored));
  saved.beehive.notebook.beekeeper.evidence += '\n' + text.trim(); saved.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(saved); expect(await evidenceText(page)).toBe(text);
  await expect(save(page)).toBeDisabled(); await expect(notice(page)).toContainText(/already|added|in.*notebook/i);
  await save(page).evaluate(node => (node as HTMLButtonElement).click()); expect(await work(page)).toEqual(saved);
  const reviewed = JSON.parse(JSON.stringify(saved)); reviewed.beehive.notebook.beekeeper.review.evidence = true;
  await fixture(page, { notebook: reviewed.beehive.notebook }); await expect(save(page)).toBeDisabled();
  await save(page).evaluate(node => (node as HTMLButtonElement).click()); expect(await work(page)).toEqual(reviewed);

  // Missing readings remain missing; a recorded zero is eligible for evidence.
  await fixture(page, { honey: null }); await topic(page, 'food').click();
  const missing = await work(page); await expect(panel(page).locator('[data-interior-reading]')).toHaveText('Not recorded');
  expect(await evidenceText(page)).toMatch(/Not recorded/i); await expect(save(page)).toBeDisabled();
  await expect(notice(page)).toContainText(/recorded|unavailable|missing/i);
  await role(page, 'honey').click(); await highlights(page, 'honey'); expect(await work(page)).toEqual(missing);
  await fixture(page, { honey: 0, syrup: 0 }); await topic(page, 'food').click();
  await expect(panel(page).locator('[data-interior-reading]')).toHaveText('0 honey-equivalent lb');
  expect(await evidenceText(page)).toContain('0 honey-equivalent lb'); await expect(save(page)).toBeEnabled();

  // The full notebook rejects the proposal, then accepts it at the exact limit.
  await fixture(page, { honey: 40, syrup: 5 }); await topic(page, 'food').click();
  const proposal = await evidenceText(page), full = JSON.parse(JSON.stringify((await work(page)).beehive.notebook));
  full.beekeeper.evidence = 'x'.repeat(1200); full.beekeeper.review.evidence = true;
  await fixture(page, { notebook: full }); const fullBefore = await work(page);
  await expect(save(page)).toBeDisabled(); await expect(notice(page)).toContainText(/room|full|1,200|1200/i);
  await save(page).evaluate(node => (node as HTMLButtonElement).click()); expect(await work(page)).toEqual(fullBefore);
  expect(await evidenceText(page)).toBe(proposal);
  const exact = JSON.parse(JSON.stringify(full)); exact.beekeeper.evidence = 'x'.repeat(1200 - proposal.trim().length - 1);
  await fixture(page, { notebook: exact }); const exactBefore = await work(page); await expect(save(page)).toBeEnabled();
  await save(page).click();
  const exactSaved = JSON.parse(JSON.stringify(exactBefore));
  exactSaved.beehive.notebook.beekeeper.evidence += '\n' + proposal.trim(); exactSaved.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(exactSaved); expect(exactSaved.beehive.notebook.beekeeper.evidence.length).toBe(1200);
  await expect(save(page)).toBeDisabled(); await accessible(page);

  await panel(page).locator('[data-interior-notebook]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
  await expect(page.locator('#beehive-notebook-writing-title')).toBeFocused();
  const notebookOpened = JSON.parse(JSON.stringify(exactSaved)); notebookOpened.beehive.notebookOpen = true;
  expect(await work(page)).toEqual(notebookOpened);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue(exactSaved.beehive.notebook.beekeeper.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(page.locator('[data-notebook-review="prediction"]')).toBeChecked();
  await expect(page.locator('[data-notebook-review="explanation"]')).toBeChecked();
  expect(errors).toEqual([]);
});

test('the hive learning legend, orientation and evidence stay readable across mobile and accessible display settings', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await open(page); await frame(page, 2).click(); await role(page, 'open_brood').click();
  const original = await work(page); await selectedPosition(page, 2);
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
  await page.emulateMedia({ forcedColors: 'active' }); await role(page, 'open_brood').focus();
  const colors = await role(page, 'open_brood').evaluate(node => {
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
