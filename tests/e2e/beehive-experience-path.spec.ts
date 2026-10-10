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
const roleNames = { beekeeper: 'Open Beekeeper', queen: 'Open Colony Network', drone: 'Open Drone Flight' };
const savedFlight = {
  success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
  energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
  distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' },
};
const droneSetup = { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 };

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Experience path test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 29, honey: 300, varroaLevel: 2, journeyOpen: false,
      missionBriefOpen: false, notebookOpen: false, queen: { active: false, career: { wins: 0 } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my possible explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: '', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('#beehive-journey-summary')).toBeVisible();
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
    for (const key of ['journeyOpen', 'viewMode', 'focusLayout', 'notebookOpen']) delete result.beehive[key];
    return result;
  });
}

async function togglePath(page: Page, open: boolean) {
  const path = page.locator('[data-beehive-journey-disclosure]');
  if (await path.evaluate(node => (node as HTMLDetailsElement).open) !== open) {
    await page.locator('#beehive-journey-summary').focus();
    await page.keyboard.press('Enter');
  }
  await expect(path).toHaveJSProperty('open', open);
}

async function semantics(page: Page, currentRole: string) {
  const path = page.locator('section[data-beehive-journey]');
  await expect(path).toBeVisible();
  await expect(page.locator('[data-beehive-journey-disclosure] [role="progressbar"]')).toHaveCount(0);
  await expect(path.locator('[data-journey-role-grid]')).toHaveCount(1);
  await expect(path.locator('[data-journey-evidence-grid]')).toHaveCount(1);
  await expect(path.locator('[data-journey-role][aria-current="step"]')).toHaveCount(1);
  await expect(path.locator('[data-journey-role="' + currentRole + '"]')).toHaveAttribute('aria-current', 'step');
  for (const role of roles) {
    const button = path.locator('[data-journey-role="' + role + '"]');
    await expect(button).toHaveAccessibleName(roleNames[role]);
    await expect(button).toHaveAttribute('data-journey-milestone', /^(?:reached|not-yet)$/);
  }
  for (const kind of ['field', 'command', 'flight']) {
    const card = path.locator('[data-journey-evidence="' + kind + '"]');
    await expect(card).toBeVisible();
    const status = card.locator('[data-journey-evidence-state]');
    await expect(status).toBeVisible();
    await expect(status).not.toHaveText('');
  }
}

async function keyboardAction(page: Page, selector: string) {
  const action = page.locator(selector);
  await action.focus(); await expect(action).toBeFocused();
  await page.keyboard.press('Enter');
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-journey-disclosure]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('.bee-journey').evaluate(node => {
    const css = getComputedStyle(node), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const contentWidth = node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const blocks = [node, ...Array.from(node.querySelectorAll('[data-journey-role-grid],[data-journey-evidence-grid],[data-journey-role],[data-journey-evidence],p,h2,h3,button'))];
    return {
      rootFont, contentWidth,
      columns: Array.from(node.querySelectorAll('[data-journey-role-grid],[data-journey-evidence-grid]')).map(el => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      headings: Array.from(node.querySelectorAll('h2,h3,h4,.bee-journey-role-title')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      body: Array.from(node.querySelectorAll('.bee-journey-role-criterion,[data-journey-evidence] p')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      text: Array.from(node.querySelectorAll('p,[data-journey-evidence-state]')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const columns = result.contentWidth >= 58 * result.rootFont ? 3 : 1;
  expect(result.columns).toEqual([columns, columns]);
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.headings.length).toBeGreaterThan(0);
  for (const font of result.headings) expect(font).toBeGreaterThanOrEqual(result.rootFont * .9375);
  for (const font of result.body) expect(font).toBeGreaterThanOrEqual(result.rootFont * .875);
  for (const font of result.text) expect(font).toBeGreaterThanOrEqual(result.rootFont * .8125);
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-journey-disclosure]').screenshot({ path: testInfo.outputPath('path-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('experience path distinguishes game milestones and available evidence while keyboard handoffs preserve learner work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await persistentWork(page);
  await togglePath(page, true); await semantics(page, 'beekeeper');
  const path = page.locator('section[data-beehive-journey]');
  await expect(path).toContainText('0 / 3 milestones');
  await expect(path.locator('[data-journey-role="beekeeper"]')).toHaveAttribute('data-journey-milestone', 'not-yet');
  await expect(path).toContainText(/game milestones/i);
  await expect(path).toContainText(/(?:do not|does not).*assess.*explanations/i);
  expect(await persistentWork(page)).toEqual(original);

  await keyboardAction(page, '[data-beehive-handoff-action="beekeeper"]');
  await semantics(page, 'queen');
  await keyboardAction(page, '[data-beehive-handoff-action="queen"]');
  await semantics(page, 'drone');
  await keyboardAction(page, '[data-beehive-handoff-action="drone"]');
  await expect(page.locator('[data-notebook-synthesis]')).toBeFocused();
  await expect(page.locator('[data-notebook-synthesis]')).toHaveValue('');
  expect(await persistentWork(page)).toEqual(original);
  for (const role of roles) {
    await keyboardAction(page, '[data-journey-role="' + role + '"]');
    await semantics(page, role);
    expect(await persistentWork(page)).toEqual(original);
  }

  // Reaching a model date must not be presented as proof the colony survived.
  await fixture(page, { day: 30, colonySurvived: false });
  await expect(path.locator('[data-journey-role="beekeeper"]')).toHaveAttribute('data-journey-milestone', 'reached');
  await expect(path.locator('[data-journey-role="beekeeper"]')).toContainText('Reach day 30 in this colony run.');
  await expect(path.locator('[data-journey-role="beekeeper"]')).toContainText('Current run: day 30 · colony ended.');
  await expect(path.locator('[data-journey-evidence="field"] [data-journey-evidence-state]')).toHaveText('Ended colony · Day 30');
  await expect(path).not.toContainText(/keep the colony alive|colony survived|three perspectives connected/i);
  await fixture(page, { queen: { active: false, career: { wins: 1 } }, drone: { ...droneSetup, successes: 1 } });
  await expect(path).toContainText('3 / 3 milestones');
  await expect(path.locator('[data-journey-milestone="reached"]')).toHaveCount(3);
  await expect(path.locator('[data-journey-synthesis]')).toBeVisible();
  const milestonesOnly = await persistentWork(page);
  await fixture(page, { notebookOpen: false });
  await keyboardAction(page, '[data-journey-synthesis]');
  await expect(page.locator('[data-notebook-synthesis]')).toBeFocused();
  await expect(page.locator('[data-notebook-synthesis]')).toHaveValue('');
  expect(await persistentWork(page)).toEqual(milestonesOnly);

  // A completed match can retain active:true. Past wins and its latest outcome
  // have separate meanings, and the opening was captured when the match began.
  await fixture(page, { queen: { active: true, paused: true, result: 'defeat', day: 7,
    career: { wins: 2 }, territory: 14, hiveHealth: 0,
    rival: { name: 'Test rival', health: 70, pressure: 64, intel: 2 },
    carryover: { label: 'Earlier opening condition' } } });
  const network = path.locator('[data-journey-evidence="command"]');
  await expect(network.locator('[data-journey-evidence-state]')).toHaveText('Recorded match · Defeat');
  await expect(network.locator('[data-journey-reading]')).toHaveText('RTS advantage 14 / 100 · Rival health 70%.');
  await expect(path.locator('[data-journey-role="queen"]')).toHaveAttribute('data-journey-milestone', 'reached');
  await expect(path.locator('[data-journey-role="queen"]')).toContainText('Career record: 2 network wins.');
  await expect(path.locator('[data-journey-evidence="field"]')).toContainText('Recorded network opening: Earlier opening condition.');
  await expect(path.locator('[data-journey-evidence="field"]')).toContainText('captured when that match began');

  // A recorded outcome can independently meet a milestone without career totals.
  await fixture(page, { queen: { active: false, result: 'victory', career: { wins: 0 } },
    drone: { ...droneSetup, successes: 0, lastRun: savedFlight } });
  await expect(path).toContainText('3 / 3 milestones');
  await expect(network.locator('[data-journey-reading]')).toHaveText('RTS advantage Not recorded · Rival health Not recorded.');
  await expect(path.locator('[data-journey-evidence="command"] [data-journey-evidence-state]')).toHaveText('Recorded match · Victory');
  await expect(path.locator('[data-journey-evidence="command"] [data-journey-reading]')).toHaveText('RTS advantage Not recorded · Rival health Not recorded.');
  const flight = path.locator('[data-journey-evidence="flight"]');
  await expect(flight.locator('[data-journey-evidence-state]')).toHaveText('Saved flight · Intercept recorded');
  await expect(flight).toContainText('0%');
  await expect(flight).toContainText('125 model ft'); await expect(flight).toContainText('610 model m');
  await expect(flight).toContainText('Energy is a saved percentage of the difficulty reserve.');
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: 'true' } } });
  await expect(path.locator('[data-journey-role="drone"]')).toHaveAttribute('data-journey-milestone', 'not-yet');
  await expect(flight.locator('[data-journey-evidence-state]')).toHaveText('Saved flight · Outcome not recorded');
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false } } });
  await expect(path.locator('[data-journey-role="drone"]')).toHaveAttribute('data-journey-milestone', 'not-yet');
  await expect(flight.locator('[data-journey-reading]')).toHaveText('Peak altitude Not recorded · Distance Not recorded · Energy left Not recorded.');
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false, energyLeft: 12, maxAlt: 98, distance: 444 } } });
  await expect(flight).toContainText('12'); await expect(flight).not.toContainText('12%');
  await expect(flight).toContainText(/units.*not recorded/i);

  // A paused current attempt takes precedence over an older successful route.
  await fixture(page, { day: 29, colonySurvived: true,
    viewMode: 'drone', drone: { ...droneSetup, lastRun: savedFlight } });
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await page.evaluate(saved => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { phase: 'flight', reachedLaunch: true, reachedDca: false, x: 0, y: 80, z: -550, maxAlt: 140, distance: 550 });
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { drone: { ...w.__toolData.beehive.drone, lastRun: saved } }));
  }, savedFlight);
  await togglePath(page, true);
  await expect(flight.locator('[data-journey-evidence-state]')).toHaveText('Paused flight');
  await expect(flight.locator('[data-journey-reading]')).toContainText('Current altitude 80 model ft');
  await expect(flight).toContainText('550 model m'); await expect(flight).not.toContainText('610 model m');
  await expect(flight).not.toContainText('Saved flight');
  const physics = () => page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    return JSON.parse(JSON.stringify({ x: s.x, y: s.y, z: s.z, maxAlt: s.maxAlt, distance: s.distance, energy: s.energy,
      phase: s.phase, reachedDca: s.reachedDca, timer: s.timer, randomState: s.randomState, telemetry: s.telemetry, decisions: s.decisionLog }));
  });
  const held = await physics(), activeWork = await persistentWork(page);
  await togglePath(page, false); await togglePath(page, true);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await page.setViewportSize({ width: 640, height: 1800 });
  expect(await physics()).toEqual(held); expect(await persistentWork(page)).toEqual(activeWork);
  expect(activeWork.beehive.notebook).toEqual(original.beehive.notebook);
  expect(errors).toEqual([]);
});

test('experience path stays readable at its own width with enlarged text, both themes and forced colors', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await togglePath(page, true);
  const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100, 1440]) {
    await page.setViewportSize({ width, height: 1800 });
    const layout = await readableLayout(page); await accessible(page);
    if (width === 1440) expect(layout.columns).toEqual([3, 3]);
    if (width === 320 || width === 1440) await preview(page, testInfo, width === 320 ? 'mobile' : 'wide');
  }
  expect(await persistentWork(page)).toEqual(frozen);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await fixture(page, { day: 30, queen: { active: false, result: 'victory' }, drone: { ...droneSetup, lastRun: savedFlight } });
  const completeWork = await persistentWork(page);
  await expect(page.locator('section[data-beehive-journey]')).toContainText('3 / 3 milestones');
  await accessible(page);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); });
  await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#beehive-journey-summary').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-journey-role="beekeeper"]')).toBeFocused();
  const colors = await page.locator('[data-journey-role="beekeeper"]').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  expect(await persistentWork(page)).toEqual(completeWork);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-journey-disclosure]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  const enlarged = await readableLayout(page, false);
  expect(enlarged.columns).toEqual([1, 1]);
  await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(completeWork);
  expect(errors).toEqual([]);
});
