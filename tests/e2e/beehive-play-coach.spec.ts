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
// Saved-state validation requires a positive strength; malformed threats are
// correctly discarded before the coach sees them.
const threat = { id: 'test-threat', type: 'wasp', x: .4, y: .5, hp: 10, maxHp: 10, strength: 2, label: 'Test wasp' };

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Play coach test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 1, syrup: 0, morale: 98, varroaLevel: 2,
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
  await expect(page.locator('[data-beehive-play-coach]')).toBeVisible();
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
    for (const key of ['viewMode', 'focusLayout', 'notebookOpen', 'showTreat', 'showInspect']) delete result.beehive[key];
    return result;
  });
}

function action(page: Page, id: string) {
  return page.locator('[data-beehive-coach-action="' + id + '"] button');
}

function reading(page: Page, label: string) {
  return page.locator('[data-coach-reading="' + label + '"] dd');
}

async function keyboardAction(page: Page, id: string) {
  await action(page, id).focus(); await expect(action(page, id)).toBeFocused();
  await page.keyboard.press('Enter');
}

async function semantics(page: Page, role: string, state: string) {
  const coach = page.locator('[data-beehive-play-coach]');
  await expect(coach).toHaveAttribute('role', 'region');
  await expect(coach).toHaveAttribute('data-coach-role', role);
  await expect(coach).toHaveAttribute('data-coach-state', state);
  await expect(coach.locator('h2')).toHaveCount(1);
  await expect(coach.locator('h4')).toHaveCount(0);
  await expect(coach.locator('dl[data-coach-readings]')).toHaveCount(1);
  await expect(coach.locator('[data-coach-reading]')).toHaveCount(3);
  for (const field of await coach.locator('[data-coach-reading]').all()) {
    await expect(field.locator(':scope > dt')).not.toHaveText('');
    await expect(field.locator(':scope > dd')).not.toHaveText('');
  }
  await expect(coach.locator('[data-beehive-quickstart]')).toContainText('Practice focus');
  await expect(coach).not.toContainText(/step\s+\d\s+of\s+3/i);
  const button = coach.locator('[data-beehive-coach-action] button');
  if (await button.count()) {
    const descriptions = await button.evaluate(node => (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
      .map(id => ({ id, text: document.getElementById(id)?.textContent || '', watch: document.getElementById(id)?.hasAttribute('data-beehive-coach-watch'), hint: document.getElementById(id)?.hasAttribute('data-coach-action-hint') })));
    expect(descriptions.some(item => item.watch && item.text.trim())).toBe(true);
    expect(descriptions.some(item => item.hint && item.text.trim())).toBe(true);
    await expect(coach.locator('[data-beehive-coach-watch]')).toHaveAttribute('role', 'note');
  }
}

async function physics(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    return JSON.parse(JSON.stringify({ x: s.x, y: s.y, z: s.z, maxAlt: s.maxAlt, distance: s.distance, energy: s.energy,
      phase: s.phase, reachedDca: s.reachedDca, timer: s.timer, randomState: s.randomState, telemetry: s.telemetry, decisions: s.decisionLog }));
  });
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-play-coach]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('.bee-coach').evaluate(node => {
    const css = getComputedStyle(node), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const contentWidth = node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const blocks = [node, ...Array.from(node.querySelectorAll('.bee-coach-layout,[data-coach-main],[data-beehive-coach-action],[data-beehive-quickstart],dl,dt,dd,p,h2,button'))];
    return {
      rootFont, contentWidth,
      columns: getComputedStyle(node.querySelector('.bee-coach-layout')!).gridTemplateColumns.split(' ').length,
      body: Array.from(node.querySelectorAll('p')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      labels: Array.from(node.querySelectorAll('dt')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.columns).toBe(result.contentWidth >= 48 * result.rootFont ? 2 : 1);
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.body.length).toBeGreaterThan(0);
  for (const font of result.body) expect(font).toBeGreaterThanOrEqual(result.rootFont * .875);
  for (const font of result.labels) expect(font).toBeGreaterThanOrEqual(result.rootFont * .8125);
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-play-coach]').screenshot({ path: testInfo.outputPath('coach-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('play coach offers valid actions for colony, completed matches and paused flights while preserving learner work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await persistentWork(page);
  const coach = page.locator('[data-beehive-play-coach]');
  await semantics(page, 'beekeeper', 'colony');
  await expect(action(page, 'feed-colony')).toBeEnabled();
  await expect(coach.locator('[data-beehive-coach-watch]')).toContainText('+5 lb combined food');
  await expect(coach.locator('[data-beehive-coach-watch]')).toContainText('up to +5');
  await keyboardAction(page, 'feed-colony');
  const fed = await persistentWork(page);
  expect(fed.beehive.actionPoints).toBe(original.beehive.actionPoints - 1);
  expect(fed.beehive.honey).toBe(original.beehive.honey + 5);
  expect(fed.beehive.syrup).toBe(original.beehive.syrup + 5);
  expect(fed.beehive.morale).toBe(100);
  expect(fed.beehive.day).toBe(original.beehive.day);
  expect(fed.beehive.notebook).toEqual(original.beehive.notebook);
  expect(fed.otherTool).toEqual(original.otherTool);
  await fixture(page, { diseaseRisk: 35 });
  await expect(coach.locator('h2')).toContainText(/elevated/i);
  await expect(coach.locator('h2')).not.toContainText(/rising/i);
  await expect(action(page, 'inspect-risk')).toBeEnabled();
  await fixture(page, { varroaLevel: 24, actionPoints: 0 });
  await expect(action(page, 'open-treatment')).toBeEnabled();

  await fixture(page, { viewMode: 'queen', queen: { active: false } });
  await semantics(page, 'queen', 'setup');
  await expect(action(page, 'begin-model')).toBeEnabled();
  await fixture(page, { queen: { ...pausedQueen, threats: [threat], signalUsed: { alarm_signal: 7 } } });
  expect((await persistentWork(page)).beehive.queen.threats).toHaveLength(1);
  await semantics(page, 'queen', 'paused');
  await expect(action(page, 'signal-alarm')).toBeDisabled();
  await expect(action(page, 'signal-alarm')).toHaveAttribute('data-action-ready', 'false');
  await expect(coach.locator('[data-coach-action-hint]')).toContainText('Already spreading this cycle; available next cycle');
  const unavailable = await persistentWork(page);
  await action(page, 'signal-alarm').evaluate(node => (node as HTMLButtonElement).click());
  expect(await persistentWork(page)).toEqual(unavailable);

  // A recorded result takes priority even when the match retains active:true
  // and threat/signal fields that would otherwise recommend another action.
  await fixture(page, { queen: { ...pausedQueen, result: 'defeat', threats: [threat] }, notebookOpen: false });
  await semantics(page, 'queen', 'review');
  await expect(action(page, 'signal-alarm')).toHaveCount(0);
  await expect(action(page, 'resume-rts')).toHaveCount(0);
  await expect(reading(page, 'RTS advantage')).toHaveText('58 / 100');
  const endedQueen = await persistentWork(page);
  await keyboardAction(page, 'review-network');
  await expect(page.locator('[data-notebook-field="explanation"]')).toBeFocused();
  await expect(page.locator('[data-notebook-field="explanation"]')).toHaveValue('Keep my network explanation.');
  expect(await persistentWork(page)).toEqual(endedQueen);
  await fixture(page, { queen: { active: false, result: 'victory' } });
  await semantics(page, 'queen', 'review');
  await expect(reading(page, 'Cycle')).toHaveText('Not recorded');
  await expect(reading(page, 'RTS advantage')).toHaveText('Not recorded');

  await fixture(page, { viewMode: 'drone', drone: droneSetup, notebookOpen: false });
  await semantics(page, 'drone', 'setup');
  await expect(action(page, 'start-easy-flight')).toBeEnabled();
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight } });
  await semantics(page, 'drone', 'review');
  await expect(reading(page, 'Energy left')).toHaveText('0%');
  await expect(reading(page, 'Peak altitude')).toHaveText('125 model ft');
  const savedWork = await persistentWork(page);
  await keyboardAction(page, 'review-flight');
  await expect(page.locator('[data-notebook-field="explanation"]')).toBeFocused();
  await expect(page.locator('[data-notebook-field="explanation"]')).toHaveValue('Keep my route explanation.');
  expect(await persistentWork(page)).toEqual(savedWork);
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false } } });
  await expect(reading(page, 'Energy left')).toHaveText('Not recorded');
  await expect(reading(page, 'Peak altitude')).toHaveText('Not recorded');
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false, energyLeft: 12 } } });
  await expect(reading(page, 'Energy left')).toContainText('12');
  await expect(reading(page, 'Energy left')).toContainText('units not recorded');
  await expect(reading(page, 'Energy left')).not.toContainText('12%');

  // Exercise the actual fallback flight, then inspect it without advancing time.
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight }, notebookOpen: false });
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await page.evaluate(saved => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { phase: 'flight', paused: true, pacing: 'steps', difficulty: 'easy', energy: 62.5,
      routeMarkersPassed: 0, nectarCollected: 4, reachedLaunch: true, reachedDca: false,
      x: 0, y: 80, z: -550, maxAlt: 140, distance: 550 });
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { drone: { ...w.__toolData.beehive.drone, lastRun: saved } }));
  }, savedFlight);
  await semantics(page, 'drone', 'paused');
  await expect(reading(page, 'Flight energy')).toHaveText('50% of reserve');
  await expect(reading(page, 'Route markers')).toHaveText('0 · optional');
  await expect(coach.locator('[data-coach-readings]')).not.toContainText(/nectar|pollen/i);
  await expect(coach).not.toContainText('125 model ft');
  await expect(action(page, 'resume-flight')).toHaveCount(0);
  const currentWork = await persistentWork(page), held = await physics(page);
  await keyboardAction(page, 'plan-maneuver');
  await expect(page.locator('[data-flight-decision-panel] input:checked')).toBeFocused();
  expect(await physics(page)).toEqual(held); expect(await persistentWork(page)).toEqual(currentWork);
  await page.evaluate(() => {
    const w = window as any;
    // This fixture represents an already-recorded end screen. Avoid the
    // renderer's independent, one-time summary write during the focus check.
    Object.assign(w.__testHooks.beehive.droneStateRef.current, { phase: 'end', _summarySaved: true, _xpAwarded: true });
    w.__rerender();
  });
  await semantics(page, 'drone', 'review');
  expect((await persistentWork(page)).beehive.drone.active).toBe(true);
  await expect(reading(page, 'Energy left')).toHaveText('50%');
  await expect(reading(page, 'Peak altitude')).toHaveText('140 model ft');
  await expect(action(page, 'plan-maneuver')).toHaveCount(0);
  await expect(action(page, 'pause-flight')).toHaveCount(0);
  await expect(action(page, 'resume-flight')).toHaveCount(0);
  const endedWork = await persistentWork(page), endedPhysics = await physics(page);
  await keyboardAction(page, 'review-flight');
  await expect(page.locator('[data-notebook-field="explanation"]')).toBeFocused();
  expect(await physics(page)).toEqual(endedPhysics); expect(await persistentWork(page)).toEqual(endedWork);
  expect(endedWork.beehive.notebook).toEqual(original.beehive.notebook);
  expect(errors).toEqual([]);
});

test('play coach adapts to its own width with readable actions in both themes, forced colors and enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    await readableLayout(page); await accessible(page);
    if (width === 320) await preview(page, testInfo, 'mobile');
  }
  // The stage layout shares the page with a discovery card. Overview gives
  // this coach enough of the viewport to exercise its own two-column layout.
  await fixture(page, { focusLayout: false });
  const wide = await readableLayout(page);
  expect(wide.contentWidth).toBeGreaterThanOrEqual(48 * wide.rootFont);
  expect(wide.columns).toBe(2);
  await expect(page.locator('[data-beehive-play-coach] [data-beehive-quickstart]')).toBeVisible();
  await accessible(page); await preview(page, testInfo, 'wide');
  await fixture(page, { focusLayout: true });
  expect(await persistentWork(page)).toEqual(frozen);
  await fixture(page, { viewMode: 'queen', queen: { ...pausedQueen, threats: [threat], signalUsed: { alarm_signal: 7 } } });
  expect((await persistentWork(page)).beehive.queen.threats).toHaveLength(1);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await expect(action(page, 'signal-alarm')).toBeDisabled();
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await fixture(page, { queen: { ...pausedQueen, result: 'victory', threats: [threat] } });
  await readableLayout(page); await accessible(page);
  await fixture(page, { viewMode: 'drone', drone: { ...droneSetup, lastRun: savedFlight } });
  const reviewWork = await persistentWork(page);
  await readableLayout(page); await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await action(page, 'review-flight').focus();
  await expect(action(page, 'review-flight')).toBeFocused();
  const colors = await action(page, 'review-flight').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  expect(await persistentWork(page)).toEqual(reviewWork);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await fixture(page, { focusLayout: false });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-play-coach]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await page.locator('[data-beehive-play-coach]').evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false); expect(enlarged.columns).toBe(1);
  await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(reviewWork);
  expect(errors).toEqual([]);
});
