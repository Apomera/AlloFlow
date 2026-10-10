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

const savedFlight = {
  success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
  energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
  distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved flight metadata.' },
};
const pausedQueen = {
  active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
  pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
  rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
  result: null, threats: [], custom: { retained: 'Match metadata.' },
};

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    // The brief is also available with the supported 2D flight fallback.
    w.StemLab.ensureThree = () => Promise.reject(new Error('Learning brief test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 1, varroaLevel: 2, missionBriefOpen: false,
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      notebook: {
        beekeeper: { prediction: 'My colony prediction.', evidence: 'My recorded day.', explanation: 'My possible explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'My network prediction.', evidence: 'My network reading.', explanation: 'My network explanation.' },
        drone: { prediction: 'My flight prediction.', evidence: 'My saved route evidence.', explanation: 'My route explanation.' },
        synthesis: 'Keep my cross-role synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('#beehive-learning-brief-summary')).toBeVisible();
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
    for (const key of ['missionBriefOpen', 'viewMode', 'focusLayout']) delete result.beehive[key];
    return result;
  });
}

async function toggleBrief(page: Page, open: boolean) {
  const brief = page.locator('[data-beehive-learning-brief]');
  if (await brief.evaluate(node => (node as HTMLDetailsElement).open) !== open) {
    await page.locator('#beehive-learning-brief-summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#beehive-learning-brief-summary')).toBeFocused();
  }
  await expect(brief).toHaveJSProperty('open', open);
  await expect(brief.locator('[data-brief-summary-action]')).toHaveText(open ? 'Hide brief' : 'Show brief');
}

async function semantics(page: Page, role: string, phase: string, suggestedStep?: string) {
  const brief = page.locator('[data-beehive-command="' + role + '"]');
  await expect(brief).toBeVisible();
  await expect(brief.locator('[data-brief-phase]')).toHaveText(phase);
  await expect(brief).toHaveAttribute('data-brief-source', phase === 'Setup guide' ? 'setup' : phase === 'Recorded outcome' ? 'saved' : 'current');
  await expect(brief.locator('dl[data-brief-metrics]')).toHaveCount(1);
  await expect(brief.locator('[data-brief-metric]')).toHaveCount(4);
  for (const metric of await brief.locator('[data-brief-metric]').all()) {
    await expect(metric.locator(':scope > dt')).not.toHaveText('');
    await expect(metric.locator(':scope > dd [data-brief-value]')).not.toHaveText('');
    await expect(metric.locator(':scope > dd p')).not.toHaveText('');
  }
  await expect(brief.locator('[role="progressbar"]')).toHaveCount(0);
  await expect(brief).not.toContainText(/Systems on track|needs attention|\d\s*of\s*4 systems/i);
  const guide = brief.locator('[data-brief-read-guide]');
  await expect(guide).toHaveAttribute('role', 'note');
  await expect(guide).toContainText('Model boundary:');
  const inquiry = brief.getByRole('group', { name: 'Inquiry loop', exact: true });
  await expect(inquiry).toContainText('Suggested inquiry step');
  await expect(inquiry).toContainText('Revisit any step as your evidence changes.');
  await expect(inquiry.locator('ol > li')).toHaveCount(4);
  for (const step of ['observe', 'decide', 'act', 'explain']) {
    const card = inquiry.locator('ol > li[data-inquiry-step="' + step + '"]');
    await expect(card.locator('strong')).toContainText(step[0].toUpperCase() + step.slice(1));
    await expect(card.locator('p[data-inquiry-prompt]')).toBeVisible();
    await expect(card.locator('p[data-inquiry-prompt]')).not.toHaveText('');
  }
  await expect(inquiry.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(inquiry.locator('[data-inquiry-suggestion]')).toHaveText('Suggested');
  await expect(inquiry.locator('[aria-current="step"] [data-inquiry-suggestion]')).toHaveCount(1);
  if (suggestedStep) await expect(inquiry.locator('[aria-current="step"]')).toHaveAttribute('data-inquiry-step', suggestedStep);
}

function reading(page: Page, label: string) {
  return page.locator('[data-beehive-learning-brief] [data-brief-metric="' + label + '"] [data-brief-value]');
}

async function displayPreservesWork(page: Page) {
  const frozen = await persistentWork(page);
  await toggleBrief(page, false); await toggleBrief(page, true);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await page.setViewportSize({ width: 640, height: 1800 });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  expect(await persistentWork(page)).toEqual(frozen);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); });
  await page.setViewportSize({ width: 1100, height: 1800 });
  expect(await persistentWork(page)).toEqual(frozen);
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-learning-brief]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  await readableSummary(page);
  const result = await page.locator('.bee-brief').evaluate(node => {
    const css = getComputedStyle(node), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const contentWidth = node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const blocks = [node, ...Array.from(node.querySelectorAll('dl,[data-brief-metric],dt,dd,p,h2,h3,.bee-brief-layout,aside,ol,li,[data-inquiry-prompt],[data-inquiry-suggestion]'))];
    return {
      rootFont, contentWidth,
      metricColumns: getComputedStyle(node.querySelector('[data-brief-metrics]')!).gridTemplateColumns.split(' ').length,
      layoutColumns: getComputedStyle(node.querySelector('.bee-brief-layout')!).gridTemplateColumns.split(' ').length,
      labels: Array.from(node.querySelectorAll('dt')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      values: Array.from(node.querySelectorAll('[data-brief-value]')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      body: Array.from(node.querySelectorAll('p,li')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.metricColumns).toBe(result.contentWidth >= 56 * result.rootFont ? 4 : result.contentWidth >= 30 * result.rootFont ? 2 : 1);
  expect(result.layoutColumns).toBe(result.contentWidth >= 64 * result.rootFont ? 2 : 1);
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const font of result.labels) expect(font).toBeGreaterThanOrEqual(result.rootFont * .8125);
  for (const font of result.values) expect(font).toBeGreaterThanOrEqual(result.rootFont * 1.25);
  for (const font of result.body) expect(font).toBeGreaterThanOrEqual(result.rootFont * .875);
  return result;
}

async function readableSummary(page: Page) {
  const summary = page.locator('#beehive-learning-brief-summary');
  await expect(summary).toHaveAccessibleDescription(/Read the evidence.*Status:/);
  for (const part of ['title', 'status', 'action', 'hint']) {
    await expect(summary.locator('[data-brief-summary-' + part + ']')).toBeVisible();
    await expect(summary.locator('[data-brief-summary-' + part + ']')).not.toHaveText('');
  }
  const result = await summary.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Array.from(node.querySelectorAll('[data-brief-summary-title],[data-brief-summary-status],[data-brief-summary-action],[data-brief-summary-hint]')).map(el => {
      const css = getComputedStyle(el), range = document.createRange();
      range.selectNodeContents(el);
      return { text: el.textContent, font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        overflow: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
        outside: Array.from(range.getClientRects()).some(rect => rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) };
    });
  });
  for (const part of result) {
    expect(part.ellipsis, part.text || '').toBe(false);
    expect(part.overflow, part.text || '').toBe(false);
    expect(part.outside, part.text || '').toBe(false);
    expect(part.font, part.text || '').toBeGreaterThanOrEqual(.8125);
  }
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-learning-brief]').screenshot({ path: testInfo.outputPath('brief-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('learning brief distinguishes setup, paused readings and saved outcomes without changing learner work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await persistentWork(page);
  await toggleBrief(page, true);
  await semantics(page, 'beekeeper', 'Colony readings', 'act');
  await expect(page.locator('#beehive-command-title')).toHaveText('Food is below the seasonal reserve');
  await expect(page.locator('[data-brief-read-guide]')).toContainText('a low food level alone does not show whether stores are rising or falling');
  expect(await persistentWork(page)).toEqual(original);
  await displayPreservesWork(page);
  await fixture(page, { varroaLevel: 24 });
  await expect(page.locator('#beehive-command-title')).toHaveText('Inspect elevated mite pressure');
  await expect(page.locator('.bee-brief-goals')).toContainText(/combined food/i);
  await expect(page.locator('.bee-brief-goals')).toContainText(/compare/i);
  await fixture(page, { colonySurvived: false });
  await semantics(page, 'beekeeper', 'Final colony readings', 'explain');
  await displayPreservesWork(page);
  await fixture(page, { colonySurvived: true });
  await fixture(page, { viewMode: 'queen', queen: { active: false } });
  await semantics(page, 'queen', 'Setup guide', 'observe'); await displayPreservesWork(page);
  await fixture(page, { queen: { ...pausedQueen, paused: false } });
  await semantics(page, 'queen', 'Live readings');
  await fixture(page, { queen: pausedQueen });
  await semantics(page, 'queen', 'Paused readings', 'act');
  await expect(reading(page, 'Brood core')).toHaveText('73%');
  await expect(reading(page, 'RTS advantage')).toHaveText('58 / 100');
  await expect(reading(page, 'QMP cohesion')).toHaveText('43%');
  await expect(reading(page, 'Raid pressure')).toHaveText('64%');
  await displayPreservesWork(page);
  await fixture(page, { queen: { ...pausedQueen, active: false, result: 'victory' } });
  await semantics(page, 'queen', 'Recorded outcome', 'explain');
  await expect(reading(page, 'Brood core')).toHaveText('73%');
  await expect(page.locator('[data-beehive-command="queen"] [aria-current="step"]')).toContainText('Explain');
  await displayPreservesWork(page);
  await fixture(page, { queen: { active: false, result: 'defeat' } });
  await semantics(page, 'queen', 'Recorded outcome');
  await expect(page.locator('[data-brief-value]')).toHaveText(['Not recorded', 'Not recorded', 'Not recorded', 'Not recorded']);
  await expect(page.locator('.bee-brief-context')).toHaveText('Scenario not recorded · Cycle not recorded');

  await fixture(page, { viewMode: 'drone' });
  await semantics(page, 'drone', 'Setup guide', 'observe');
  await expect(reading(page, 'Route markers')).toHaveText('Optional');
  await displayPreservesWork(page);
  await fixture(page, { drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908, lastRun: savedFlight } });
  await semantics(page, 'drone', 'Recorded outcome');
  await expect(reading(page, 'Energy left')).toHaveText('0%');
  await expect(reading(page, 'Route markers')).toHaveText('0');
  await expect(reading(page, 'Peak altitude')).toHaveText('125 model ft');
  await expect(reading(page, 'Distance')).toHaveText('610 model m');
  await displayPreservesWork(page);
  await fixture(page, { drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908, lastRun: { success: false } } });
  await semantics(page, 'drone', 'Recorded outcome');
  await expect(page.locator('[data-brief-value]')).toHaveText(['Not recorded', 'Not recorded', 'Not recorded', 'Not recorded']);
  await fixture(page, { drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908,
    lastRun: { success: false, energyLeft: 12, nectar: 3, maxAlt: 98, distance: 444 } } });
  await expect(reading(page, 'Energy left')).toHaveText('12');
  await expect(reading(page, 'Route markers')).toHaveText('3');
  await expect(page.locator('[data-brief-metric="Energy left"] dd p')).toHaveText('Saved value; energy units were not recorded.');

  await fixture(page, { drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908, lastRun: savedFlight } });
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await page.evaluate(saved => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { phase: 'flight', reachedLaunch: true, reachedDca: false, x: 0, y: 80, z: -550, maxAlt: 140, distance: 550 });
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { drone: { ...w.__toolData.beehive.drone, lastRun: saved } }));
  }, savedFlight);
  await toggleBrief(page, true);
  await semantics(page, 'drone', 'Paused readings', 'decide');
  await expect(reading(page, 'Current altitude')).toHaveText('80 model ft');
  await expect(page.locator('[data-brief-metric="Peak altitude"]')).toHaveCount(0);
  await expect(page.locator('#beehive-command-title')).toHaveText('Check both DCA entry conditions');
  await expect(page.locator('[data-brief-read-guide]')).toContainText(/climb/i);
  await page.evaluate(() => {
    const w = window as any, s = w.__testHooks.beehive.droneStateRef.current, p = w.__RR_TEST_EXPORTS__.beehive.DRONE_FLIGHT_PARAMS;
    s.y = p.dcaMaxFt + 20; w.__rerender();
  });
  await expect(page.locator('#beehive-command-title')).toHaveText('Check both DCA entry conditions');
  await expect(page.locator('[data-brief-read-guide]')).toContainText(/descend/i);
  await page.evaluate(() => {
    const w = window as any, s = w.__testHooks.beehive.droneStateRef.current, p = w.__RR_TEST_EXPORTS__.beehive.DRONE_FLIGHT_PARAMS;
    s.y = (p.dcaMinFt + p.dcaMaxFt) / 2; s.z = -p.dcaDistanceM; w.__rerender();
  });
  await expect(page.locator('[data-brief-read-guide]')).toContainText('Entry conditions met');
  expect(await page.evaluate(() => (window as any).__testHooks.beehive.droneStateRef.current.reachedDca)).toBe(false);
  await page.evaluate(() => {
    const w = window as any; w.__testHooks.beehive.droneStateRef.current.reachedDca = true; w.__rerender();
  });
  await expect(page.locator('#beehive-command-title')).toHaveText('Follow the queen cue');
  const physics = () => page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    return JSON.parse(JSON.stringify({ x: s.x, y: s.y, z: s.z, maxAlt: s.maxAlt, distance: s.distance, energy: s.energy,
      phase: s.phase, reachedDca: s.reachedDca, timer: s.timer, randomState: s.randomState, telemetry: s.telemetry, decisions: s.decisionLog }));
  });
  const held = await physics(); await displayPreservesWork(page); expect(await physics()).toEqual(held);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { phase: 'end', difficulty: 'easy', energy: 62.5, routeMarkersPassed: 4, nectarCollected: 9,
      y: 28, maxAlt: 173, distance: 702, reachedDca: false, _summarySaved: true, _xpAwarded: true, _telemetryFinalLogged: true });
    w.__rerender();
  });
  const endedWork = await persistentWork(page), endedPhysics = await physics();
  await semantics(page, 'drone', 'Final flight readings', 'explain');
  await expect(page.locator('.bee-brief-context')).toHaveText('easy · Flight just completed');
  await expect(page.locator('#beehive-command-title')).toHaveText('Review this flight');
  await expect(reading(page, 'Energy left')).toHaveText('50%');
  await expect(reading(page, 'Route markers')).toHaveText('4');
  await expect(reading(page, 'Peak altitude')).toHaveText('173 model ft');
  await expect(reading(page, 'Distance')).toHaveText('702 model m');
  await expect(page.locator('[data-brief-read-guide]')).toContainText('DCA entry was not reached in this flight.');
  await expect(page.locator('[data-brief-metric="Current altitude"]')).toHaveCount(0);
  await displayPreservesWork(page);
  expect(await physics()).toEqual(endedPhysics);
  expect(await persistentWork(page)).toEqual(endedWork);
  expect(endedWork.beehive.drone.lastRun).toEqual(savedFlight);
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { energy: 0, routeMarkersPassed: 0, reachedDca: true });
    state.nearQueens.forEach((queen: any) => { queen.caught = true; });
    w.__rerender();
  });
  await expect(page.locator('#beehive-command-title')).toHaveText('Review this flight');
  await expect(reading(page, 'Energy left')).toHaveText('0%');
  await expect(reading(page, 'Route markers')).toHaveText('0');
  await expect(page.locator('[data-brief-read-guide]')).toContainText('DCA entry was recorded in this flight.');
  await page.evaluate(() => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { energy: null, routeMarkersPassed: null, nectarCollected: null, pollenCollected: null, maxAlt: null, distance: null, reachedDca: undefined });
    w.__rerender();
  });
  await semantics(page, 'drone', 'Final flight readings', 'explain');
  await expect(page.locator('[data-brief-value]')).toHaveText(['Not recorded', 'Not recorded', 'Not recorded', 'Not recorded']);
  await expect(page.locator('[data-brief-read-guide]')).toContainText('DCA entry was not recorded in this flight.');
  expect(await persistentWork(page)).toEqual(endedWork);
  expect((await persistentWork(page)).beehive.notebook).toEqual(original.beehive.notebook);
  expect(errors).toEqual([]);
});

test('learning brief keeps native keyboard disclosure and Learn navigation with stable focus', async ({ page }, testInfo) => {
  await mount(page);
  const frozen = await persistentWork(page), brief = page.locator('details[data-beehive-learning-brief]');
  const summary = brief.locator(':scope > summary#beehive-learning-brief-summary');
  await expect(summary).toHaveCount(1);
  await expect(brief).toHaveJSProperty('open', false);
  await page.setViewportSize({ width: 320, height: 1800 });
  await readableSummary(page); await accessible(page);
  await preview(page, testInfo, 'closed-mobile');
  await summary.focus();
  for (const key of ['Enter', 'Space', 'Space', 'Enter']) {
    const wasOpen = await brief.evaluate(node => (node as HTMLDetailsElement).open);
    await page.keyboard.press(key);
    await expect(brief).toHaveJSProperty('open', !wasOpen);
    await expect(summary).toBeFocused();
    await expect(summary.locator('[data-brief-summary-action]')).toHaveText(wasOpen ? 'Show brief' : 'Hide brief');
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.missionBriefOpen)).toBe(!wasOpen);
    expect(await persistentWork(page)).toEqual(frozen);
  }
  const learn = page.locator('[data-beehive-flow-step="learn"]');
  await expect(learn).toHaveAttribute('href', '#beehive-learning-brief-summary');
  await learn.focus(); await page.keyboard.press('Enter');
  await expect(brief).toHaveJSProperty('open', true);
  await expect(summary).toBeFocused();
  await expect(summary.locator('[data-brief-summary-action]')).toHaveText('Hide brief');
  await semantics(page, 'beekeeper', 'Colony readings', 'act');
  expect(await persistentWork(page)).toEqual(frozen);
});

test('learning brief adapts to its own width, enlarged text, dark roles and forced colors', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await toggleBrief(page, true);
  const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    await readableLayout(page); await accessible(page);
    await preview(page, testInfo, width === 320 ? 'mobile' : width === 640 ? 'medium' : 'wide');
  }
  await page.setViewportSize({ width: 1440, height: 1800 });
  const wide = await readableLayout(page);
  expect(wide.metricColumns).toBe(4); expect(wide.layoutColumns).toBe(2);
  expect(await persistentWork(page)).toEqual(frozen);

  await fixture(page, { viewMode: 'queen' });
  const queenFrozen = await persistentWork(page);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await semantics(page, 'queen', 'Setup guide');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#beehive-learning-brief-summary').focus();
  for (const role of ['queen', 'drone']) {
    await fixture(page, { viewMode: role });
    await readableLayout(page); await accessible(page);
    const colors = await page.locator('.bee-brief').evaluate(node => {
      const value = node.querySelector('[data-brief-value]')!, card = node.querySelector('[data-brief-metric]')!;
      return { ink: getComputedStyle(value).color, paper: getComputedStyle(card).backgroundColor,
        border: getComputedStyle(card).borderTopStyle, borderWidth: parseFloat(getComputedStyle(card).borderTopWidth) };
    });
    expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  }
  await preview(page, testInfo, 'forced-colors');
  expect(await persistentWork(page)).toEqual(queenFrozen);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-learning-brief]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  const enlarged = await readableLayout(page, false);
  expect(enlarged.metricColumns).toBe(1); expect(enlarged.layoutColumns).toBe(1);
  await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(queenFrozen);
  expect(errors).toEqual([]);
});
