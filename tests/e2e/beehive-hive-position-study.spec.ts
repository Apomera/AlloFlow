import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = '.codex-artifacts/bee-position-study-2026-10-11';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const topics = [
  { id: 'food', label: 'Food stores' }, { id: 'pollen', label: 'Pollen stores' },
  { id: 'brood', label: 'Developing brood' }, { id: 'queen', label: 'Queen' },
];
const roles = [
  { id: 'honey', label: 'Food cells' }, { id: 'pollen', label: 'Pollen cells' },
  { id: 'open_brood', label: 'Open brood' }, { id: 'capped_brood', label: 'Capped brood' },
  { id: 'drone_brood', label: 'Drone brood' }, { id: 'empty', label: 'Unmarked comb' },
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
function disclosure(page: Page) { return panel(page).locator('[data-interior-position-study-disclosure]'); }
function toggle(page: Page) { return disclosure(page).locator('[data-interior-position-study-toggle]'); }
function study(page: Page) { return disclosure(page).locator('[data-interior-position-study]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function reading(page: Page) { return panel(page).locator('[data-interior-reading]'); }
function comparison(page: Page) { return panel(page).locator('[data-interior-comparison]'); }
function selectedFrame(page: Page) { return panel(page).locator('[data-interior-frame][aria-pressed="true"]'); }

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my own observation</strong> & punctuation.', explanation: 'Keep my explanation.',
      review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { evidence: 'Keep my network writing.', review: { evidence: true } },
    drone: { evidence: 'Keep my flight writing.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
  };
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Position study uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive position study test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, seededNotebook());
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(disclosure(page)).toHaveCount(1);
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
  await expect(study(page)).toBeHidden();
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
async function changeDisclosure(page: Page, open: boolean, key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page);
  await toggle(page).focus(); await page.keyboard.press(key);
  await expect(toggle(page)).toBeFocused();
  await expect.poll(() => disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(open);
  if (open) await expect(study(page)).toBeVisible(); else await expect(study(page)).toBeHidden();
  expect(await work(page)).toEqual(before);
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(comparison(page)).toBeVisible();
}

// Derive both positions from the established comb rule, without using the new study helper.
// The 231 grid positions are schematic marks, never a census of real cells.
async function expectedPair(page: Page, topicId: string, roleId: string | null) {
  return page.evaluate(({ topicId, roleId }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, raw = w.__toolData.beehive;
    const known = ['honey', 'pollen', 'brood', 'queenHealth'].every(key => Number.isFinite(raw[key]) && raw[key] >= 0 && raw[key] <= (key === 'queenHealth' ? 100 : 1000000));
    const allowed = roleId === 'empty' ? ['empty', 'foundation'] : roleId ? [roleId] :
      topicId === 'food' ? ['honey'] : topicId === 'pollen' ? ['pollen'] : topicId === 'brood' ? ['open_brood', 'capped_brood', 'drone_brood'] : [];
    return [0, 2].map(frame => {
      const cells: Array<{ role: string; position: string; highlighted: string }> = [];
      if (known) for (let row = 0; row < 11; row++) for (let col = 0; col < 21; col++) {
        const id = BH.bhCombCellRole((col - 10) / 10, 1 - row / 5, {
          honeyFill: Math.min(.5, raw.honey / 60), broodFill: Math.min(1, raw.brood / 12000),
          pollenLevel: Math.min(1, raw.pollen / 30), layingRate: raw.queenHealth / 100,
          frameDepth: Math.abs(frame - 2.5) / 2.5,
        });
        cells.push({ role: id, position: row + ':' + col, highlighted: allowed.includes(id) ? 'true' : 'false' });
      }
      const matching = cells.filter(cell => cell.highlighted === 'true').length;
      return { frame, known, cells, matching, presence: !allowed.length ? 'Not mapped' : matching ? 'Marks shown' : 'No matching marks' };
    });
  }, { topicId, roleId });
}
async function assertPair(page: Page, topicId: string, roleId: string | null = null) {
  const expected = await expectedPair(page, topicId, roleId);
  const label = roleId ? roles.find(item => item.id === roleId)!.label : topics.find(item => item.id === topicId)!.label;
  await expect(study(page)).toBeVisible();
  await expect(study(page)).toContainText('Same current readings · two frame positions');
  await expect(toggle(page)).toHaveText('Compare current outside and centre frames');
  await expect(study(page).locator('[data-position-study-category]')).toHaveText(label);
  const currentReading = await reading(page).textContent();
  await expect(study(page).locator('[data-position-study-reading]')).toHaveText(currentReading!);
  const day = (await work(page)).beehive.day;
  await expect(study(page).locator('[data-position-study-day]')).toContainText(Number.isSafeInteger(day) && day >= 0 ? String(day) : /not recorded/i);
  // This comparison is read-only; navigation and the selected-frame lens belong to the existing controls.
  await expect(study(page).locator('button')).toHaveCount(expected[0].known ? 2 : 0);
  await expect(study(page).locator('input,select,textarea,a[href],[tabindex="0"]')).toHaveCount(0);
  await expect(study(page).locator('svg button,svg [tabindex],svg a')).toHaveCount(0);
  await expect(study(page).locator('[data-interior-cell],[data-held-cell],[data-lens-position],[data-diagram-changed],[data-interior-lens-locator],[data-lens-ring]')).toHaveCount(0);
  await expect(panel(page).locator('[data-interior-frame]')).toHaveCount(6);
  if (!expected[0].known) {
    await expect(study(page).locator('[data-position-study-unavailable]')).toBeVisible();
    await expect(study(page).locator('[data-position-study-unavailable]')).toContainText(/unavailable|missing|not recorded/i);
    await expect(study(page).locator('[data-position-study-frame]')).toHaveCount(0);
    await expect(study(page).locator('[data-position-study-diagram]')).toHaveCount(0);
  } else {
    await expect(study(page).locator('[data-position-study-unavailable]')).toHaveCount(0);
    await expect(study(page).locator('[data-position-study-frame]')).toHaveCount(2);
    for (const item of expected) {
      const figure = study(page).locator('[data-position-study-frame="' + item.frame + '"]');
      const svg = figure.locator('[data-position-study-diagram="' + item.frame + '"]');
      await expect(figure).toContainText(item.frame === 0 ? /Frame 1.*Outside/i : /Frame 3.*Centre/i);
      await expect(figure.locator('[data-position-study-presence]')).toHaveText(label + ' · ' + item.presence);
      await expect(svg).toHaveAttribute('role', 'img');
      await expect(svg).toHaveAccessibleName(/current.*frame|frame.*current/i);
      const drawn = await svg.locator('[data-position-study-cell]').evaluateAll(nodes => nodes.map(node => ({
        role: node.getAttribute('data-position-study-cell'), position: node.getAttribute('data-position-study-cell-position'), highlighted: node.getAttribute('data-highlighted'),
      })));
      expect(drawn).toEqual(item.cells);
      await expect(figure.locator('[data-position-study-cell][data-highlighted="true"]')).toHaveCount(item.matching);
    }
  }
  return expected;
}
async function chooseFrame(page: Page, index: number) {
  const before = await work(page), button = panel(page).locator('[data-interior-frame="' + index + '"]');
  await button.focus(); await page.keyboard.press('Space');
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { hive3dFrame: index, hive3dPart: 'brood_frames', hive3dExploded: true });
  expected.beehive.hive3dFramesSeen = [...new Set([...before.beehive.hive3dFramesSeen, index])];
  expect(await work(page)).toEqual(expected);
  await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test('hive position study compares both current positions for every topic and role without changing readings selection or saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); const initial = await work(page);
  const held = await comparison(page).locator('[data-change-held]').allTextContents();
  await changeDisclosure(page, true);
  for (const category of [...topics.map(item => ({ ...item, role: false })), ...roles.map(item => ({ ...item, role: true }))]) {
    const before = await work(page);
    await (category.role ? role(page, category.id) : topic(page, category.id)).focus(); await page.keyboard.press('Enter');
    expect(await work(page)).toEqual(before);
    const topicId = (await panel(page).locator('[data-interior-topic][aria-pressed="true"]').getAttribute('data-interior-topic'))!;
    const roleId = category.role ? category.id : null;
    const expected = await assertPair(page, topicId, roleId);
    const stablePair = await study(page).locator('[data-position-study-diagram]').evaluateAll(nodes => nodes.map(node => node.outerHTML));
    const stableReading = await reading(page).textContent();
    const beforeDiagramClick = await work(page);
    await study(page).locator('[data-position-study-cell]').first().click({ force: true });
    expect(await work(page)).toEqual(beforeDiagramClick); await assertPair(page, topicId, roleId);
    await expect(panel(page).locator('[data-interior-lens-toggle]')).toHaveAttribute('aria-expanded', 'false');
    // Changing the inspected frame uses its ordinary path, while the study keeps fixed outside/centre positions.
    await chooseFrame(page, 5); await assertPair(page, topicId, roleId);
    expect(await study(page).locator('[data-position-study-diagram]').evaluateAll(nodes => nodes.map(node => node.outerHTML))).toEqual(stablePair);
    await chooseFrame(page, 2); await assertPair(page, topicId, roleId);
    await expect(reading(page)).toHaveText(stableReading!);
    expect(await comparison(page).locator('[data-change-held]').allTextContents()).toEqual(held);
    await changeDisclosure(page, false, 'Space'); await changeDisclosure(page, true, 'Enter');
    await assertPair(page, topicId, roleId);
    if (category.id === 'queen') {
      expect(expected.every(item => item.matching === 0)).toBe(true);
      await expect(study(page)).toContainText(/queen.*location.*not mapped|does not.*queen.*location/i);
      await expect(study(page)).not.toContainText(/queen absent|queen missing|no queen/i);
    }
  }
  const final = await work(page);
  expect(final.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(final.beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect(final.beehive.day).toBe(initial.beehive.day);
  expect(final.beehive.hive3dFoundQueen).toBe(false);
  expect(final.otherTool).toEqual(initial.otherTool);
  expect(errors).toEqual([]);
});

test('hive position study uses current readings after feeding and days and handles zero incomplete and recovered patterns honestly', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await changeDisclosure(page, true);
  const initial = await work(page), held = await comparison(page).locator('[data-change-held]').allTextContents();
  await topic(page, 'food').click(); await assertPair(page, 'food');
  const beforeFeed = await work(page);
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees');
  await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(beforeFeed.beehive.honey + 5);
  expect(fed.beehive.syrup).toBe(beforeFeed.beehive.syrup + 5);
  expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1);
  await page.locator('[data-management-return-interior]').click(); await expect(study(page)).toBeVisible();
  await assertPair(page, 'food');
  await expect(study(page).locator('[data-position-study-reading]')).toHaveText('45 honey-equivalent lb');
  await expect(comparison(page).locator('[data-interior-change="food"] [data-change-held]')).toHaveText('40 honey-equivalent lb');
  await expect(study(page)).toContainText(/current/i);
  // Let the existing five-second feeding animation finish before asserting
  // that later view controls leave every tool-data field unchanged.
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 15000 }).toBeNull();
  await page.locator('#beehive-next-day').click(); const later = await work(page);
  expect(later.beehive.day).toBe(beforeFeed.beehive.day + 1);
  for (const id of ['food', 'pollen', 'brood', 'queen']) { await topic(page, id).click(); await assertPair(page, id); }
  expect(await work(page)).toEqual(later);
  expect(await comparison(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  // A deliberately different fixture guarantees changed schematic marks without depending on day rounding.
  await fixture(page, { honey: 10, brood: 1200 }); await topic(page, 'food').click();
  const beforeLocalViews = await work(page);
  await expect(panel(page).locator('[data-interior-changes-toggle]')).toBeEnabled();
  await panel(page).locator('[data-interior-changes-toggle]').check();
  await expect(panel(page).locator('[data-diagram-changed]')).not.toHaveCount(0);
  await panel(page).locator('[data-interior-lens-toggle]').click();
  await expect(panel(page).locator('[data-interior-lens-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(panel(page).locator('[data-interior-lens-locator]')).toHaveCount(2);
  expect(await work(page)).toEqual(beforeLocalViews); await assertPair(page, 'food');
  // The current-position pair must not inherit held/current outlines or the inspected-cell locator.
  await expect(study(page).locator('[data-diagram-changed],[data-interior-lens-locator],[data-lens-ring]')).toHaveCount(0);
  await panel(page).locator('[data-interior-lens-close]').click();
  await fixture(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  for (const id of ['food', 'pollen', 'brood']) {
    await topic(page, id).click(); const zero = await work(page), pair = await assertPair(page, id);
    expect(pair.every(item => item.matching === 0 && item.presence === 'No matching marks')).toBe(true);
    await expect(study(page).locator('[data-position-study-reading]')).toHaveText(/^0\s/);
    await changeDisclosure(page, false); await changeDisclosure(page, true, 'Space'); expect(await work(page)).toEqual(zero);
  }
  await role(page, 'empty').click(); const empty = await assertPair(page, 'brood', 'empty');
  expect(empty.every(item => item.matching === item.cells.length)).toBe(true);
  expect(empty.some(item => item.cells.some(cell => cell.role === 'foundation'))).toBe(true);
  await topic(page, 'queen').click(); const queen = await work(page);
  await assertPair(page, 'queen'); await expect(study(page).locator('[data-position-study-reading]')).toHaveText(/^0\s/);
  expect(queen.beehive.hive3dFoundQueen).toBe(false);
  for (const invalid of [
    { honey: null }, { pollen: -1 }, { brood: Infinity }, { queenHealth: 101 },
  ]) {
    await fixture(page, { honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, ...invalid });
    await topic(page, 'brood').click(); const unchanged = await work(page);
    await assertPair(page, 'brood');
    await changeDisclosure(page, false); await changeDisclosure(page, true); expect(await work(page)).toEqual(unchanged);
  }
  await fixture(page, { honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, day: null });
  // Missing day prevents a trustworthy temporal comparison, but these two current positions share valid pattern inputs.
  await topic(page, 'food').click(); await assertPair(page, 'food');
  await expect(study(page).locator('[data-position-study-day]')).toContainText(/not recorded/i);
  await fixture(page, { day: 16 }); await assertPair(page, 'food');
  const recovered = await work(page);
  expect(recovered.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(recovered.otherTool).toEqual(initial.otherTool);
  expect(recovered.beehive.hive3dFramesSeen).toEqual(initial.beehive.hive3dFramesSeen);
  expect(recovered.beehive.hive3dFrame).toBe(initial.beehive.hive3dFrame);
  expect(recovered.beehive.hive3dFoundQueen).toBe(false);
  expect(errors).toEqual([]);
});

async function auditRegion(scope: Locator) {
  const violations = await scope.evaluate(async node => {
    const audit = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await scope.evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,strong,span,summary,figcaption,figure,dl,dt,dd'))];
    return {
      overflow: elements.filter(el => el.getClientRects().length > 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node && el.getClientRects().length > 0 && !['DIV', 'FIGURE', 'DL'].includes(el.tagName)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow, whiteSpace: getComputedStyle(el).whiteSpace })),
      controls: Array.from(node.querySelectorAll('summary')).filter(el => el.getClientRects().length > 0).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      splitWords: (() => {
        const critical = new Set(['developing', 'matching', 'schematic', 'illustration', 'readings']);
        const split: string[] = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let text: Node | null;
        while ((text = walker.nextNode())) {
          if (!text.parentElement?.getClientRects().length) continue;
          for (const word of (text.textContent || '').matchAll(/[A-Za-z]+/g)) {
            if (!critical.has(word[0].toLowerCase())) continue;
            const range = document.createRange();
            range.setStart(text, word.index!); range.setEnd(text, word.index! + word[0].length);
            if (Array.from(range.getClientRects()).filter(rect => rect.width > 0).length > 1) split.push(word[0]);
          }
        }
        return split;
      })(),
    };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1); expect(layout.splitWords).toEqual([]);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}
async function visualStudy(page: Page, mode: string) {
  await assertPair(page, 'brood', 'open_brood'); await auditRegion(disclosure(page));
  await toggle(page).focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await expect(toggle(page)).toBeFocused();
  const focus = await toggle(page).evaluate(node => {
    const css = getComputedStyle(node); return { style: css.outlineStyle, width: parseFloat(css.outlineWidth), ink: css.color, paper: css.backgroundColor };
  });
  expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  if (mode === 'forced') expect(focus.ink).not.toBe(focus.paper);
  await changeDisclosure(page, false, 'Space'); await auditRegion(disclosure(page)); await changeDisclosure(page, true);
  await disclosure(page).screenshot({ path: artifacts + '/preview-position-study-' + mode + '.png', animations: 'disabled', timeout: 120000 });
}

test('hive position study stays readable with native keyboard disclosure across wide phone dark forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await chooseFrame(page, 2); await role(page, 'open_brood').click(); await changeDisclosure(page, true);
  const original = await work(page), initialReading = await reading(page).textContent();
  const held = await comparison(page).locator('[data-change-held]').allTextContents();
  await visualStudy(page, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  await visualStudy(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await visualStudy(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await visualStudy(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await visualStudy(page, 'large');
  await expect(reading(page)).toHaveText(initialReading!);
  expect(await comparison(page).locator('[data-change-held]').allTextContents()).toEqual(held);
  expect(await work(page)).toEqual({ ...original, beehive: { ...original.beehive, focusLayout: false } });
  await expect(selectedFrame(page)).toHaveAttribute('data-interior-frame', '2');
  expect(errors).toEqual([]);
});
