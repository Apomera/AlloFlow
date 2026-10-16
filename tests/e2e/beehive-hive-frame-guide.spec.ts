import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = process.env.BEE_FRAME_GUIDE_ARTIFACTS || '.codex-artifacts/bee-frame-guide-2026-10-11';
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
function locate(page: Page) { return panel(page).locator('section[aria-labelledby="beehive-interior-locate-title"]'); }
function frame(page: Page, index: number) { return locate(page).locator('[data-interior-frame="' + index + '"]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function guide(page: Page) { return locate(page).locator('[data-interior-frame-guide]'); }
function next(page: Page) { return guide(page).locator('[data-interior-next-match]'); }
function reading(page: Page) { return panel(page).locator('[data-interior-reading]'); }
function comparison(page: Page) { return panel(page).locator('[data-interior-comparison]'); }

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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Frame guide uses the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive frame guide test'); };
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

// Use the established comb rule directly rather than the new guide helper.
// Each drawn grid position belongs to an illustration, never a measured cell census.
async function expectedPatterns(page: Page, topicId: string, roleId: string | null) {
  return page.evaluate(({ topicId, roleId }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive, raw = w.__toolData.beehive;
    const known = ['honey', 'pollen', 'brood', 'queenHealth'].every(key => Number.isFinite(raw[key]) && raw[key] >= 0 && raw[key] <= (key === 'queenHealth' ? 100 : 1000000));
    const allowed = roleId === 'empty' ? ['empty', 'foundation'] : roleId ? [roleId] :
      topicId === 'food' ? ['honey'] : topicId === 'pollen' ? ['pollen'] : topicId === 'brood' ? ['open_brood', 'capped_brood', 'drone_brood'] : [];
    return Array.from({ length: 6 }, (_, frame) => {
      const cells: string[] = [];
      if (known) for (let row = 0; row < 11; row++) for (let col = 0; col < 21; col++) {
        cells.push(BH.bhCombCellRole((col - 10) / 10, 1 - row / 5, {
          honeyFill: Math.min(.5, raw.honey / 60), broodFill: Math.min(1, raw.brood / 12000),
          pollenLevel: Math.min(1, raw.pollen / 30), layingRate: raw.queenHealth / 100,
          frameDepth: Math.abs(frame - 2.5) / 2.5,
        }));
      }
      const matching = cells.filter(id => allowed.includes(id)).length;
      const pattern = !known ? 'unavailable' : !allowed.length ? 'unmapped' : matching ? 'shown' : 'absent';
      return { frame, pattern, matching, cells, allowed };
    });
  }, { topicId, roleId });
}
async function assertGuide(page: Page, topicId: string, roleId: string | null = null) {
  const expected = await expectedPatterns(page, topicId, roleId);
  const label = roleId ? roles.find(item => item.id === roleId)!.label : topics.find(item => item.id === topicId)!.label;
  await expect(guide(page)).toHaveAccessibleName('Current frame pattern guide');
  await expect(guide(page)).toContainText('Current frame pattern');
  await expect(guide(page).locator('[data-interior-frame-guide-category]')).toHaveText(label);
  await expect(guide(page).locator('[data-interior-frame-guide-status]')).toHaveAttribute('aria-live', 'polite');
  await expect(guide(page).locator('[data-interior-frame-guide-status]')).toContainText(/\S/);
  await expect(next(page)).toHaveText('Next matching frame');
  const current = Number(await panel(page).locator('[data-interior-frame][aria-pressed="true"]').getAttribute('data-interior-frame'));
  const availableNext = expected.some(item => item.frame !== current && item.pattern === 'shown');
  if (availableNext) await expect(next(page)).toBeEnabled(); else await expect(next(page)).toBeDisabled();
  await expect(locate(page).locator('[data-interior-frame]')).toHaveCount(6);
  await expect(locate(page).locator('[data-interior-slot]')).toHaveCount(6);
  for (const item of expected) {
    const button = frame(page, item.frame), slot = locate(page).locator('[data-interior-slot="' + item.frame + '"]');
    await expect(button).toHaveAttribute('data-interior-pattern', item.pattern);
    await expect(slot).toHaveAttribute('data-interior-pattern', item.pattern);
    await expect(button).toHaveAttribute('aria-pressed', item.frame === current ? 'true' : 'false');
    await expect(slot).toHaveAttribute('data-selected', item.frame === current ? 'true' : 'false');
    const presence = button.locator('[data-interior-frame-presence]');
    if (item.pattern === 'unmapped') {
      await expect(presence).toBeHidden(); await expect(slot.locator('[data-interior-slot-presence]')).toHaveCount(0);
    } else {
      await expect(presence).toBeVisible();
      await expect(presence).toHaveText(item.pattern === 'shown' ? /^(?:●\s*)?Marks shown$/ : item.pattern === 'absent' ? /^(?:—\s*)?No matching marks$/ : /^(?:\?\s*)?(?:Pattern )?Unavailable$/i);
      await expect(slot.locator('[data-interior-slot-presence]')).toHaveCount(1);
    }
  }
  return expected;
}
async function assertFrameState(page: Page, before: any, target: number) {
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { hive3dFrame: target, hive3dPart: 'brood_frames', hive3dExploded: true });
  expected.beehive.hive3dFramesSeen = [...new Set([...before.beehive.hive3dFramesSeen, target])];
  expect(await work(page)).toEqual(expected);
  await expect(frame(page, target)).toHaveAttribute('aria-pressed', 'true');
}
async function chooseFrame(page: Page, index: number) {
  const before = await work(page);
  await frame(page, index).focus(); await page.keyboard.press('Space');
  await assertFrameState(page, before, index); await expect(frame(page, index)).toBeFocused();
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(comparison(page)).toBeVisible();
}

test('hive frame guide maps topics and every comb role independently and cycles matching frames with honest readings and keyboard focus', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); const initial = await work(page);
  const heldReadings = await comparison(page).locator('[data-change-held]').allTextContents();
  for (const category of [...topics.map(item => ({ ...item, role: false })), ...roles.map(item => ({ ...item, role: true }))]) {
    const beforeSelection = await work(page);
    await (category.role ? role(page, category.id) : topic(page, category.id)).focus(); await page.keyboard.press('Enter');
    expect(await work(page)).toEqual(beforeSelection);
    const topicId = (await panel(page).locator('[data-interior-topic][aria-pressed="true"]').getAttribute('data-interior-topic'))!;
    const roleId = category.role ? category.id : null;
    const expected = await assertGuide(page, topicId, roleId);
    const wholeColonyReading = await reading(page).textContent();
    for (const item of expected) {
      await chooseFrame(page, item.frame); await assertGuide(page, topicId, roleId);
      const cells = await panel(page).locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
      expect(cells).toEqual(item.cells);
      const highlighted = await panel(page).locator('[data-interior-cell][data-highlighted="true"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-interior-cell')));
      expect(highlighted.length).toBe(item.matching);
      for (const id of highlighted) expect(item.allowed).toContain(id);
      await expect(reading(page)).toHaveText(wholeColonyReading!);
      expect(await comparison(page).locator('[data-change-held]').allTextContents()).toEqual(heldReadings);
    }
    const matching = expected.filter(item => item.pattern === 'shown').map(item => item.frame);
    if (matching.length > 1) {
      await chooseFrame(page, matching[matching.length - 1]);
      for (let step = 0; step < matching.length; step++) {
        const before = await work(page), target = matching[step];
        await next(page).focus(); await page.keyboard.press(step % 2 ? 'Space' : 'Enter');
        await assertFrameState(page, before, target); await expect(frame(page, target)).toBeFocused();
        await assertGuide(page, topicId, roleId); await expect(reading(page)).toHaveText(wholeColonyReading!);
      }
    }
  }
  await expect(panel(page).locator('[data-interior-frame-note]')).toContainText('Changing frames changes the illustration, not the whole-colony reading.');
  const explored = await work(page);
  expect(explored.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(explored.beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect(explored.beehive.day).toBe(initial.beehive.day);
  expect(explored.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('hive frame guide keeps zeros missing readings and queen location honest and updates after actual feeding and modeled days', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); const initial = await work(page);
  await fixture(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  for (const id of ['food', 'pollen', 'brood']) {
    await topic(page, id).click(); const zero = await work(page);
    const patterns = await assertGuide(page, id); expect(patterns.every(item => item.pattern === 'absent')).toBe(true);
    await expect(reading(page)).toHaveText(/^0\s/); await expect(next(page)).toBeDisabled();
    await next(page).evaluate(node => (node as HTMLButtonElement).click()); expect(await work(page)).toEqual(zero);
    await expect(guide(page).locator('[data-interior-frame-guide-status]')).toContainText(/no .*marks|no .*matching|none .*shown/i);
  }
  await role(page, 'empty').click(); const empty = await assertGuide(page, 'brood', 'empty');
  expect(empty.every(item => item.pattern === 'shown')).toBe(true);
  expect(empty.some(item => item.cells.includes('foundation'))).toBe(true);
  await topic(page, 'queen').click(); const queen = await work(page);
  await assertGuide(page, 'queen'); await expect(next(page)).toBeDisabled();
  await expect(guide(page).locator('[data-interior-frame-guide-status]')).toContainText(/queen.*location|locat.*queen/i);
  await expect(guide(page)).not.toContainText(/queen absent|queen missing|no queen/i);
  expect(queen.beehive.hive3dFoundQueen).toBe(false);
  await fixture(page, { honey: null });
  for (const id of ['brood', 'queen']) {
    await topic(page, id).click(); const missing = await work(page);
    const patterns = await assertGuide(page, id); expect(patterns.every(item => item.pattern === 'unavailable')).toBe(true);
    await expect(next(page)).toBeDisabled(); await next(page).evaluate(node => (node as HTMLButtonElement).click());
    expect(await work(page)).toEqual(missing);
    await expect(guide(page).locator('[data-interior-frame-guide-status]')).toContainText(/unavailable|recorded|missing/i);
  }
  await fixture(page, { honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90 });
  await topic(page, 'food').click(); await assertGuide(page, 'food');
  // Keep a formerly enabled DOM reference across a synchronous model update.
  // Its activation must not select a frame after the current pattern is unavailable.
  const guarded = await page.evaluate(() => {
    const w = window as any, button = document.querySelector('[data-interior-next-match]') as HTMLButtonElement;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { honey: null }));
    const before = JSON.parse(JSON.stringify(w.__toolData)); button.click();
    return { before, after: JSON.parse(JSON.stringify(w.__toolData)) };
  });
  expect(guarded.after).toEqual(guarded.before); await assertGuide(page, 'food');
  await fixture(page, { honey: 40 }); await topic(page, 'food').click(); await assertGuide(page, 'food');
  const beforeFeed = await work(page);
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees');
  await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  const fed = await work(page); expect(fed.beehive.honey).toBe(beforeFeed.beehive.honey + 5);
  expect(fed.beehive.syrup).toBe(beforeFeed.beehive.syrup + 5);
  expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1);
  await page.locator('[data-management-return-interior]').click(); await assertGuide(page, 'food');
  await expect(reading(page)).toHaveText('45 honey-equivalent lb');
  await expect(comparison(page).locator('[data-interior-change="food"] [data-change-held]')).toHaveText('40 honey-equivalent lb');
  await page.locator('#beehive-next-day').click(); const later = await work(page);
  expect(later.beehive.day).toBe(beforeFeed.beehive.day + 1); await assertGuide(page, 'food');
  for (const id of ['brood', 'pollen', 'queen']) { await topic(page, id).click(); await assertGuide(page, id); }
  expect(await work(page)).toEqual(later);
  expect(later.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(later.otherTool).toEqual(initial.otherTool); expect(later.beehive.hive3dFoundQueen).toBe(false);
  expect(errors).toEqual([]);
});

async function auditRegion(scope: Locator, checkPage = true) {
  const violations = await scope.evaluate(async node => {
    const audit = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await scope.evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,strong,span,button,label,figcaption'))];
    return {
      overflow: elements.filter(el => el.getClientRects().length > 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.filter(el => el !== node && el.getClientRects().length > 0 && el.tagName !== 'DIV').map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow, whiteSpace: getComputedStyle(el).whiteSpace })),
      controls: Array.from(node.querySelectorAll('button')).filter(el => el.getClientRects().length > 0).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.overflow).toEqual([]);
  if (checkPage) expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
}
async function visualGuide(page: Page, mode: string) {
  await assertGuide(page, 'brood', 'open_brood');
  await auditRegion(locate(page));
  await auditRegion(panel(page).locator('.bee-interior-frame-pair'));
  for (const control of [next(page), frame(page, 2)]) {
    await control.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    await expect(control).toBeFocused();
    const focus = await control.evaluate(node => {
      const css = getComputedStyle(node); return { style: css.outlineStyle, width: parseFloat(css.outlineWidth), ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle };
    });
    expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
    if (mode === 'forced') { expect(focus.ink).not.toBe(focus.paper); expect(focus.border).not.toBe('none'); }
  }
  await locate(page).screenshot({ path: artifacts + '/preview-frame-guide-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  await panel(page).locator('.bee-interior-frame-pair').screenshot({ path: artifacts + '/preview-frame-pattern-' + mode + '.png', animations: 'disabled', timeout: 120000 });
}

test('hive frame guide stays readable with visible keyboard focus across wide phone dark forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await chooseFrame(page, 2); await role(page, 'open_brood').click();
  const original = await work(page), initialReading = await reading(page).textContent();
  const heldReadings = await comparison(page).locator('[data-change-held]').allTextContents();
  await visualGuide(page, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  await visualGuide(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await visualGuide(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await visualGuide(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await visualGuide(page, 'large');
  await expect(reading(page)).toHaveText(initialReading!);
  expect(await comparison(page).locator('[data-change-held]').allTextContents()).toEqual(heldReadings);
  expect(await work(page)).toEqual({ ...original, beehive: { ...original.beehive, focusLayout: false } });
  expect(errors).toEqual([]);
});
