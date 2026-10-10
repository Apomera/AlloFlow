import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 1100, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const roles = ['beekeeper', 'queen', 'drone'] as const;
type Role = typeof roles[number];
const labels = ['Beekeeper', 'Colony Network', 'Drone Flight'];
const purposes = ['Manage daily colony health and resources', 'Explore decentralized signals and trade-offs', 'Practice energy-aware nuptial flight in 3D'];
const pausedQueen = {
  active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
  pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
  rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
  resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
  result: null, threats: [], custom: { retained: 'Match metadata.' },
};
const savedFlight = {
  success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
  energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
  distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' },
};

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Perspective test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false,
      journeyOpen: false, notebookOpen: false, queen: { active: false },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('section[data-beehive-mode-switcher]')).toBeVisible();
}

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function persistentWork(page: Page) {
  return page.evaluate(() => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    for (const key of ['viewMode', 'focusLayout']) delete result.beehive[key];
    return result;
  });
}

function card(page: Page, role: Role) {
  return page.locator('[data-beehive-mode-tab="' + role + '"]');
}

async function semantics(page: Page, selected: Role) {
  const section = page.locator('section[data-beehive-mode-switcher]');
  const group = section.getByRole('radiogroup', { name: 'Simulation perspective' });
  await expect(section).toHaveAccessibleName('Choose a perspective');
  await expect(section.getByRole('heading', { name: 'Choose a perspective', level: 2 })).toBeVisible();
  await expect(group.locator(':scope > button[role="radio"]')).toHaveCount(3);
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(group.locator('[aria-checked="true"]')).toHaveCount(1);
  await expect(group.locator('[data-perspective-selected]')).toHaveCount(1);
  for (const [index, role] of roles.entries()) {
    const option = card(page, role);
    await expect(option).toHaveAttribute('role', 'radio');
    await expect(option).toHaveAttribute('aria-checked', String(role === selected));
    await expect(option).toHaveAttribute('tabindex', role === selected ? '0' : '-1');
    await expect(option).toHaveAccessibleName(new RegExp(labels[index]));
    await expect(option.locator('[data-perspective-purpose]')).toHaveText(purposes[index]);
    await expect(option.locator('[data-perspective-purpose]')).toBeVisible();
    await expect(option.locator('[data-beehive-mode-eyebrow]')).toBeVisible();
    await expect(option.locator('[data-perspective-status]')).toBeVisible();
    await expect(option.locator('[data-perspective-status]')).toContainText('Status:');
  }
  await expect(card(page, selected).locator('[data-perspective-selected]')).toHaveText('✓ Selected');
  await expect(card(page, selected).locator('[data-perspective-selected]')).not.toContainText('Active');
  await expect(section.locator('#beehive-perspective-help')).toBeVisible();
  await expect(group).toHaveAccessibleDescription(/arrow keys.*Tab continues/i);
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-mode-switcher]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('[data-beehive-mode-switcher]').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const group = node.querySelector('[data-perspective-options]')!;
    const blocks = [node, ...Array.from(node.querySelectorAll('div,button,strong,span,h2,p'))];
    return {
      rootFont,
      columns: getComputedStyle(group).gridTemplateColumns.split(' ').filter(track => parseFloat(track) > 0).length,
      cards: Array.from(group.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(group.querySelectorAll('[data-perspective-purpose],[data-perspective-status],[data-beehive-mode-eyebrow]')).map(el => ({
        font: parseFloat(getComputedStyle(el).fontSize), whiteSpace: getComputedStyle(el).whiteSpace,
        overflow: getComputedStyle(el).overflow, textOverflow: getComputedStyle(el).textOverflow,
      })),
      labels: Array.from(group.querySelectorAll('[data-perspective-label]')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.cards).toHaveLength(3); expect(result.text).toHaveLength(9); expect(result.labels).toHaveLength(3);
  for (const size of result.cards) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
  for (const font of result.labels) expect(font).toBeGreaterThanOrEqual(result.rootFont * 1.125);
  for (const item of result.text) {
    expect(item.font).toBeGreaterThanOrEqual(result.rootFont * .8125);
    expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.textOverflow).not.toBe('ellipsis');
  }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-mode-switcher]').screenshot({ path: testInfo.outputPath('perspective-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('perspective selection preserves written work and model state with keyboard and pointer in either layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await fixture(page, {
    queen: { ...pausedQueen, result: 'victory' },
    drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908, lastRun: savedFlight },
  });
  const original = await persistentWork(page);
  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout, viewMode: 'beekeeper' });
    await semantics(page, 'beekeeper');
    await expect(card(page, 'queen').locator('[data-perspective-status]')).toContainText('Match complete | Victory');
    await expect(card(page, 'drone').locator('[data-perspective-status]')).toContainText('Saved flight | Review recorded readings');
    await card(page, 'beekeeper').focus();
    const moves: [string, Role][] = [['ArrowRight', 'queen'], ['ArrowDown', 'drone'], ['ArrowRight', 'beekeeper'], ['ArrowLeft', 'drone'], ['ArrowUp', 'queen'], ['Home', 'beekeeper'], ['End', 'drone']];
    for (const [key, selected] of moves) {
      await page.keyboard.press(key);
      await expect(card(page, selected)).toBeFocused();
      await semantics(page, selected);
      expect(await persistentWork(page)).toEqual(original);
    }
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-perspective-options]'))).toBe(false);
    await card(page, 'queen').click();
    await expect(card(page, 'queen')).toBeFocused(); await semantics(page, 'queen');
    expect(await persistentWork(page)).toEqual(original);
  }
  await fixture(page, { queen: pausedQueen });
  const pausedWork = await persistentWork(page);
  await card(page, 'beekeeper').click();
  await expect(card(page, 'queen').locator('[data-perspective-status]')).toContainText('PAUSED');
  await expect(card(page, 'queen').locator('[data-perspective-selected]')).toHaveCount(0);
  await card(page, 'queen').click(); await semantics(page, 'queen');
  await expect(page.locator('#beehive-queen-playfield')).toHaveAttribute('data-rts-state', 'paused');
  expect(await persistentWork(page)).toEqual(pausedWork);
  expect(pausedWork.beehive.notebook).toEqual(original.beehive.notebook);
  expect(pausedWork.otherTool).toEqual(original.otherTool);
  await accessible(page); expect(errors).toEqual([]);
});

test('perspective purposes and statuses remain readable on phones, in both themes, forced colors and enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    await semantics(page, 'beekeeper');
    const layout = await readableLayout(page); await accessible(page);
    if (width === 320) { expect(layout.columns).toBe(1); await preview(page, testInfo, 'mobile'); }
    if (width === 1100) { expect(layout.columns).toBe(3); await preview(page, testInfo, 'wide'); }
  }
  await fixture(page, { focusLayout: false });
  await semantics(page, 'beekeeper'); await readableLayout(page); await accessible(page);
  expect(await persistentWork(page)).toEqual(frozen);
  await fixture(page, { focusLayout: true, viewMode: 'queen', queen: pausedQueen });
  const queenWork = await persistentWork(page);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await semantics(page, 'queen'); await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' });
  await card(page, 'queen').focus();
  const colors = await card(page, 'queen').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  expect(await persistentWork(page)).toEqual(queenWork);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await fixture(page, { focusLayout: false });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-mode-switcher]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await page.locator('[data-beehive-mode-switcher]').evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false); expect(enlarged.columns).toBe(1);
  await semantics(page, 'queen'); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(queenWork); expect(errors).toEqual([]);
});
