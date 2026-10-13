import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => {
  if (info.error) console.error(info.error.message);
  await harness.destroy(page);
});

const artifactDir = path.resolve('.codex-artifacts/bee-management-immediate-2026-10-12');
function immediate(page: Page) { return page.locator('[data-management-preview-immediate]'); }
function handoff(page: Page) { return page.locator('[data-management-preview-handoff]'); }
function locate(page: Page) { return page.locator('[data-management-preview-locate]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function actual(page: Page, id: string) { return page.locator('[data-management-choice="' + id + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in this study test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      diseaseRisk: 30, varroaLevel: 7.7, morale: 80, actionPoints: 3,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep my observation <strong>as text</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await page.locator('[data-management-preview] summary').click();
  await expect(choice(page)).toBeVisible();
}
async function expectedAction(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhManagementAction(w.__toolData.beehive, id);
  }, id);
}
function reading(value: unknown, suffix = '') {
  return (typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 3 }) : String(value)) + suffix;
}
async function assertImmediate(page: Page, id: string) {
  const model = await expectedAction(page, id), saved = await work(page);
  expect(model.eligible).toBe(true);
  await expect(immediate(page).getByRole('heading', { name: 'Immediate modeled changes', exact: true })).toBeVisible();
  await expect(immediate(page).locator('[data-preview-immediate-context]')).toContainText(new RegExp('Day ' + saved.beehive.day, 'i'));
  await expect(immediate(page).locator('[data-preview-immediate-context]')).toContainText(/no (?:modeled )?days pass/i);
  const cards = immediate(page).locator('[data-preview-immediate-change]');
  await expect(cards).toHaveCount(model.changes.length);
  for (const change of model.changes) {
    const card = immediate(page).locator('[data-preview-immediate-change="' + change.key + '"]');
    await expect(card.locator('h5')).toHaveText(change.label);
    await expect(card.locator('dt')).toHaveText(['Current', 'If applied now']);
    await expect(card.locator('[data-preview-immediate-value="before"]')).toHaveText(reading(change.before, change.suffix));
    await expect(card.locator('[data-preview-immediate-value="after"]')).toHaveText(reading(change.after, change.suffix));
    const difference = card.locator('[data-preview-immediate-difference]');
    if (typeof change.before === 'number' && typeof change.after === 'number') {
      const delta = Math.round((change.after - change.before) * 1000) / 1000;
      const expected = (delta > 0 ? '+' : '') + reading(delta, change.key === 'queenHealth' ? ' points' : change.suffix);
      expect((await difference.innerText()).replace(/−/g, '-')).toContain(expected);
    } else {
      await expect(difference).toHaveText('Status changes');
    }
  }
  await expect(locate(page)).toHaveCount(1);
  await expect(handoff(page).locator('[data-management-preview-readiness]')).toHaveAttribute('id', 'beehive-management-preview-readiness');
  await expect(handoff(page).locator('[data-management-preview-locate-help]')).toHaveAttribute('id', 'beehive-management-preview-locate-help');
  const description = (await locate(page).getAttribute('aria-describedby') || '').split(/\s+/);
  expect(description).toEqual(expect.arrayContaining(['beehive-management-preview-readiness', 'beehive-management-preview-locate-help']));
  await expect(handoff(page).locator('[data-management-preview-locate-help]')).toContainText(/focus/i);
  await expect(handoff(page).locator('[data-management-preview-locate-help]')).toContainText(/separately/i);
  expect(await handoff(page).evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[data-management-preview-immediate]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
}

test('six management choices show exact current and immediate readings without spending AP or changing saved work', async ({ page }) => {
  await mount(page);
  for (const id of ['feed_bees', 'hive_hygiene', 'add_super', 'requeen', 'split_colony', 'winterize']) {
    await fixture(page, { day: id === 'winterize' ? 65 : 15 });
    const unchanged = await work(page);
    await choice(page).selectOption({ value: id });
    await assertImmediate(page, id);
    if (id === 'split_colony') {
      expect((await immediate(page).locator('[data-preview-immediate-change="varroaLevel"] [data-preview-immediate-difference]').innerText()).replace(/−/g, '-')).toContain('-2.7 pt');
      await expect(immediate(page).locator('[data-preview-immediate-change="queenHealth"] [data-preview-immediate-difference]')).not.toContainText('%');
    }
    if (id === 'requeen' || id === 'split_colony') await expect(immediate(page).locator('[data-preview-immediate-change="queenTransition"]')).toContainText('Paused for');
    if (id === 'winterize') await expect(immediate(page).locator('[data-preview-immediate-change="winterized"]')).toContainText('Wrapped and insulated');
    await horizon(page).selectOption({ value: '30' }); await assertImmediate(page, id);
    await horizon(page).selectOption({ value: '7' });
    await locate(page).focus(); await page.keyboard.press('Enter');
    await expect(actual(page, id)).toBeFocused(); expect(await work(page)).toEqual(unchanged);
  }
  await fixture(page, { day: 15, morale: 100, honey: 40.1, syrup: 5.1 });
  const capped = await work(page);
  for (const id of ['feed_bees', 'add_super', 'hive_hygiene']) {
    await choice(page).selectOption({ value: id }); await assertImmediate(page, id);
    await expect(immediate(page).locator('[data-preview-immediate-change="morale"]')).toHaveCount(0);
    expect(await work(page)).toEqual(capped);
  }
  await choice(page).selectOption({ value: 'feed_bees' });
  await expect(immediate(page).locator('[data-preview-immediate-change="honey"] [data-preview-immediate-value="before"]')).toHaveText('40.1 lb');
  await expect(immediate(page).locator('[data-preview-immediate-change="honey"] [data-preview-immediate-value="after"]')).toHaveText('45.1 lb');
  await expect(immediate(page).locator('[data-preview-immediate-change="honey"] [data-preview-immediate-difference]')).toContainText('+5 lb');
});

test('locating available and blocked controls preserves the colony until a separate available action is activated', async ({ page }) => {
  await mount(page);
  await fixture(page, { actionPoints: 0 });
  const blocked = await work(page);
  for (const id of ['feed_bees', 'hive_hygiene', 'add_super', 'requeen', 'split_colony', 'winterize']) {
    await choice(page).selectOption({ value: id });
    await expect(immediate(page)).toHaveCount(0);
    await expect(handoff(page).locator('[data-management-preview-readiness]')).toContainText('unavailable');
    await expect(handoff(page).locator('[data-management-preview-locate-help]')).toContainText(/unavailable/i);
    await locate(page).focus(); await page.keyboard.press('Enter');
    await expect(actual(page, id)).toBeFocused(); await expect(actual(page, id)).toHaveAttribute('aria-disabled', 'true');
    expect(await work(page)).toEqual(blocked);
    await page.keyboard.press('Enter'); expect(await work(page)).toEqual(blocked);
  }
  await fixture(page, { actionPoints: 3 });
  await choice(page).selectOption({ value: 'winterize' });
  await expect(handoff(page).locator('[data-management-preview-readiness]')).toContainText('Autumn onward');
  const seasonBlocked = await work(page);
  await locate(page).focus(); await page.keyboard.press('Enter'); await expect(actual(page, 'winterize')).toBeFocused();
  await page.keyboard.press('Enter'); expect(await work(page)).toEqual(seasonBlocked);
  await choice(page).selectOption({ value: 'feed_bees' }); await assertImmediate(page, 'feed_bees');
  const unchanged = await work(page), model = await expectedAction(page, 'feed_bees');
  await locate(page).focus(); await page.keyboard.press('Enter');
  await expect(actual(page, 'feed_bees')).toBeFocused(); expect(await work(page)).toEqual(unchanged);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 20000 }).toBeNull();
  const fed = await work(page);
  expect(fed.beehive).toMatchObject(model.patch);
  expect(fed.beehive.actionPoints).toBe(unchanged.beehive.actionPoints - model.cost);
  expect(fed.beehive.day).toBe(unchanged.beehive.day); expect(fed.beehive.notebook).toEqual(unchanged.beehive.notebook);
  expect(fed.beehive.queen).toEqual(unchanged.beehive.queen); expect(fed.beehive.drone).toEqual(unchanged.beehive.drone);
  expect(fed.otherTool).toEqual(unchanged.otherTool);
  await assertImmediate(page, 'feed_bees');
  await expect(immediate(page).locator('[data-preview-immediate-change="honey"] [data-preview-immediate-value="before"]')).toHaveText('45 lb');
  await expect(immediate(page).locator('[data-preview-immediate-change="honey"] [data-preview-immediate-value="after"]')).toHaveText('50 lb');
  await horizon(page).selectOption({ value: '30' });
  await locate(page).focus(); await page.keyboard.press('Enter'); expect(await work(page)).toEqual(fed);
});

async function audit(page: Page) {
  for (const region of [handoff(page), immediate(page)]) {
    const violations = await region.evaluate(async node => {
      const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
    const layout = await region.evaluate(node => {
      const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,h5,dt,dd,span,strong,button,dl,ul,li'))];
      return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
        text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
        controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
    for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  }
  await locate(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(locate(page)).toBeFocused();
  expect(await locate(page).evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
}
async function screenshot(page: Page, mode: string) {
  await handoff(page).scrollIntoViewIfNeeded();
  const clip = await page.evaluate(() => {
    const a = document.querySelector('[data-management-preview-handoff]')!.getBoundingClientRect();
    const b = document.querySelector('[data-management-preview-immediate]')!.getBoundingClientRect();
    const x = Math.min(a.left, b.left), y = Math.min(a.top, b.top);
    return { x: x + scrollX, y: y + scrollY, width: Math.max(a.right, b.right) - x, height: Math.max(a.bottom, b.bottom) - y };
  });
  await page.screenshot({ path: path.join(artifactDir, 'preview-immediate-' + mode + '.png'), clip, fullPage: true, animations: 'disabled' });
}

test('immediate readings and the action handoff stay readable on phones, dark mode, forced colors and enlarged text', async ({ page }) => {
  await mount(page); await choice(page).selectOption({ value: 'requeen' });
  const unchanged = await work(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await assertImmediate(page, 'requeen'); await audit(page); await screenshot(page, mode);
  }
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
