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

const steps = ['focus', 'play', 'learn', 'explain', 'mastery'] as const;
const labels = ['Focus', 'Play', 'Learn', 'Explain', 'Experience'];
const droneSetup = { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 };
const savedFlight = {
  success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
  energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
  distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' },
};
const pausedQueen = {
  active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
  pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
  rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
  resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
  result: null, threats: [], custom: { retained: 'Match metadata.' },
};
const closed = { missionBriefOpen: false, notebookOpen: false, journeyOpen: false };

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Learning navigation test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false,
      journeyOpen: false, notebookOpen: false, queen: { active: false },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my possible explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('nav[data-beehive-flow-nav]')).toBeVisible();
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
    // These are the only preferences the navigation is authorized to change.
    for (const key of ['focusLayout', 'missionBriefOpen', 'notebookOpen', 'journeyOpen']) delete result.beehive[key];
    return result;
  });
}

function link(page: Page, step: typeof steps[number]) {
  return page.locator('nav[data-beehive-flow-nav] a[data-beehive-flow-step="' + step + '"]');
}

async function semantics(page: Page, playTarget: string) {
  const nav = page.locator('nav[data-beehive-flow-nav]');
  await expect(nav).toHaveClass(/bee-flow/);
  await expect(nav).toBeVisible();
  await expect(nav.locator('h2')).toBeVisible();
  expect(await nav.evaluate(node => !!node.closest('details'))).toBe(false);
  await expect(nav.locator('ol[data-mobile-rail="learning-flow"] > li')).toHaveCount(5);
  await expect(nav.locator('a[data-beehive-flow-step]')).toHaveCount(5);
  const targets = ['beehive-play-focus', playTarget, 'beehive-learning-brief-summary', 'beehive-notebook-summary', 'beehive-journey-summary'];
  for (let index = 0; index < steps.length; index++) {
    await expect(link(page, steps[index])).toHaveAttribute('href', '#' + targets[index]);
    await expect(link(page, steps[index])).toHaveAccessibleName(new RegExp(labels[index]));
    await expect(page.locator('#' + targets[index])).toHaveCount(1);
  }
  await expect(nav.locator('[data-beehive-focus-layout]')).toHaveAccessibleName('Stage-first layout');
}

async function keyboardDestination(page: Page, step: typeof steps[number], target: string) {
  await link(page, step).focus(); await expect(link(page, step)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#' + target)).toBeFocused();
  await expect(page.locator('#' + target)).toBeVisible();
  if (step === 'learn' || step === 'explain' || step === 'mastery') {
    expect(await page.locator('#' + target).evaluate(node => (node.closest('details') as HTMLDetailsElement).open)).toBe(true);
  }
}

async function allDestinations(page: Page, playTarget: string) {
  await fixture(page, closed);
  const original = await persistentWork(page);
  const targets = ['beehive-play-focus', playTarget, 'beehive-learning-brief-summary', 'beehive-notebook-summary', 'beehive-journey-summary'];
  for (let index = 0; index < steps.length; index++) {
    await keyboardDestination(page, steps[index], targets[index]);
    expect(await persistentWork(page)).toEqual(original);
  }
}

async function physics(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    return JSON.parse(JSON.stringify({ x: s.x, y: s.y, z: s.z, maxAlt: s.maxAlt, distance: s.distance, energy: s.energy,
      phase: s.phase, paused: s.paused, pacing: s.pacing, reachedDca: s.reachedDca, timer: s.timer,
      randomState: s.randomState, telemetry: s.telemetry, decisions: s.decisionLog }));
  });
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-flow-nav]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('nav[data-beehive-flow-nav]').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const list = node.querySelector('ol')!, css = getComputedStyle(list);
    const blocks = [node, ...Array.from(node.querySelectorAll('ol,li,a,h2,p,button,span'))];
    return {
      rootFont,
      columns: css.gridTemplateColumns.split(' ').filter(track => parseFloat(track) > 0).length,
      links: Array.from(node.querySelectorAll('a')).map(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width })),
      labels: Array.from(node.querySelectorAll('.bee-flow-destination strong')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      hints: Array.from(node.querySelectorAll('.bee-flow-hint')).map(el => ({
        font: parseFloat(getComputedStyle(el).fontSize), whiteSpace: getComputedStyle(el).whiteSpace,
        overflow: getComputedStyle(el).overflow, textOverflow: getComputedStyle(el).textOverflow,
      })),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.labels).toHaveLength(5); expect(result.hints).toHaveLength(5);
  for (const font of result.labels) expect(font).toBeGreaterThanOrEqual(result.rootFont * .9375);
  for (const hint of result.hints) {
    expect(hint.font).toBeGreaterThanOrEqual(result.rootFont * .8125);
    expect(hint.whiteSpace).not.toBe('nowrap'); expect(hint.textOverflow).not.toBe('ellipsis');
    expect(hint.overflow).not.toBe('hidden');
  }
  for (const size of result.links) { expect(size.height).toBeGreaterThanOrEqual(44); expect(size.width).toBeGreaterThanOrEqual(44); }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-flow-nav]').screenshot({ path: testInfo.outputPath('nav-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('learning navigation opens keyboard destinations in either layout without changing colony, match, flight or written work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await persistentWork(page);
  await semantics(page, 'beehive-canvas-wrap');
  await expect(page.locator('[data-discovery-settings]')).toHaveJSProperty('open', false);
  await link(page, 'focus').focus();
  for (const step of steps.slice(1)) { await page.keyboard.press('Tab'); await expect(link(page, step)).toBeFocused(); }
  await allDestinations(page, 'beehive-canvas-wrap');
  expect(await persistentWork(page)).toEqual(original);

  const toggle = page.locator('[data-beehive-focus-layout]');
  for (const enabled of [false, true]) {
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-pressed', String(enabled));
    await expect(page.locator('[data-beehive-flow-nav]')).toHaveAttribute('data-layout-state', enabled ? 'stage-first' : 'overview-first');
    await semantics(page, 'beehive-canvas-wrap');
    await allDestinations(page, 'beehive-canvas-wrap');
    expect(await persistentWork(page)).toEqual(original);
  }

  // Inspect modified and non-primary clicks after React has handled them, then
  // cancel only their browser default to avoid opening extra tabs in the test.
  await fixture(page, closed);
  const modifierResults = await link(page, 'learn').evaluate(node => {
    const variants = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { button: 1 }, { button: 2 }];
    return variants.map(options => {
      let intercepted: boolean | null = null;
      document.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); }, { once: true });
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...options }));
      return intercepted;
    });
  });
  expect(modifierResults).toEqual([false, false, false, false, false, false]);
  expect(await page.locator('#beehive-learning-brief-summary').evaluate(node => (node.closest('details') as HTMLDetailsElement).open)).toBe(false);
  expect(await persistentWork(page)).toEqual(original);

  await fixture(page, { viewMode: 'queen', queen: { active: false }, ...closed });
  await semantics(page, 'beehive-queen-playfield');
  await allDestinations(page, 'beehive-queen-playfield');
  await fixture(page, { queen: pausedQueen, ...closed });
  const queenWork = await persistentWork(page);
  await allDestinations(page, 'beehive-queen-playfield');
  await expect(page.locator('#beehive-queen-playfield')).toHaveAttribute('data-rts-state', 'paused');
  expect(await persistentWork(page)).toEqual(queenWork);

  await fixture(page, { viewMode: 'drone', drone: { ...droneSetup, lastRun: savedFlight }, ...closed });
  await semantics(page, 'beehive-drone-playfield');
  await allDestinations(page, 'beehive-drone-playfield');
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  const flightWork = await persistentWork(page), held = await physics(page);
  await allDestinations(page, 'beehive-drone-playfield');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await allDestinations(page, 'beehive-drone-playfield');
  expect(await physics(page)).toEqual(held); expect(await persistentWork(page)).toEqual(flightWork);
  expect(flightWork.beehive.notebook).toEqual(original.beehive.notebook);
  expect(flightWork.otherTool).toEqual(original.otherTool);
  expect(errors).toEqual([]);
});

test('learning navigation keeps every destination readable on mobile, in both themes, forced colors and enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    await semantics(page, 'beehive-canvas-wrap');
    const layout = await readableLayout(page); await accessible(page);
    if (width === 320) await preview(page, testInfo, 'mobile');
    if (width === 1100) { expect(layout.columns).toBe(5); await preview(page, testInfo, 'wide'); }
  }
  await fixture(page, { focusLayout: false });
  await semantics(page, 'beehive-canvas-wrap'); await readableLayout(page); await accessible(page);
  expect(await persistentWork(page)).toEqual(frozen);
  await fixture(page, { viewMode: 'queen', queen: pausedQueen, focusLayout: true });
  const queenWork = await persistentWork(page);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await semantics(page, 'beehive-queen-playfield'); await readableLayout(page); await accessible(page);
  await preview(page, testInfo, 'dark'); expect(await persistentWork(page)).toEqual(queenWork);
  await fixture(page, { viewMode: 'drone', drone: { ...droneSetup, lastRun: savedFlight } });
  const droneWork = await persistentWork(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await link(page, 'focus').focus();
  const colors = await link(page, 'focus').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await semantics(page, 'beehive-drone-playfield'); await readableLayout(page); await accessible(page);
  await preview(page, testInfo, 'forced-colors'); expect(await persistentWork(page)).toEqual(droneWork);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await fixture(page, { focusLayout: false });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-flow-nav]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  const enlarged = await readableLayout(page, false); expect(enlarged.columns).toBeLessThan(5);
  await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(droneWork); expect(errors).toEqual([]);
});
