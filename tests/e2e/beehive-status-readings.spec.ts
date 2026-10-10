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
const threat = { id: 'test-threat', type: 'wasp', x: .4, y: .5, hp: 10, maxHp: 10, strength: 2, label: 'Test wasp' };

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Status readings test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false,
      focusLayout: true, day: 12, honey: 1, syrup: 0, workers: 45000, morale: 98, varroaLevel: 2,
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
  await expect(page.locator('[data-beehive-pulse]')).toBeVisible();
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

function vital(page: Page, id: string) {
  return page.locator('[data-beehive-pulse] [data-beehive-vital="' + id + '"]');
}

function value(page: Page, id: string) {
  return vital(page, id).locator('[data-beehive-vital-value]');
}

function tab(page: Page, id: string) {
  return page.locator('[data-beehive-mode-tab="' + id + '"]');
}

async function semantics(page: Page, state: string, source: string) {
  const pulse = page.locator('[data-beehive-pulse]');
  await expect(pulse).toHaveClass(/bee-pulse/);
  await expect(pulse).toHaveAttribute('data-pulse-state', state);
  await expect(pulse).toHaveAttribute('data-pulse-source', source);
  await expect(pulse.locator('h2')).toBeVisible();
  await expect(pulse.locator('h4')).toHaveCount(0);
  await expect(pulse.locator('[data-pulse-context]')).toBeVisible();
  await expect(pulse.locator('dl')).toHaveCount(1);
  await expect(pulse.locator('dl [data-beehive-vital]')).toHaveCount(3);
  for (const item of await pulse.locator('[data-beehive-vital]').all()) {
    await expect(item.locator(':scope > dt')).not.toHaveText('');
    await expect(item.locator(':scope > dd [data-beehive-vital-value]')).not.toHaveText('');
    await expect(item.locator('[data-beehive-vital-detail]')).toBeVisible();
  }
  await expect(pulse.locator('[role="progressbar"]')).toHaveCount(0);
  const meters = await pulse.locator('[role="meter"]').evaluateAll(nodes => nodes.map(node => ({
    min: Number(node.getAttribute('aria-valuemin')), max: Number(node.getAttribute('aria-valuemax')),
    value: Number(node.getAttribute('aria-valuenow')), text: node.getAttribute('aria-valuetext') || '',
    name: node.getAttribute('aria-label') || (node.getAttribute('aria-labelledby') || '').split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || '').join(' '),
  })));
  for (const meter of meters) {
    expect(Number.isFinite(meter.min) && Number.isFinite(meter.max) && Number.isFinite(meter.value)).toBe(true);
    expect(meter.max).toBeGreaterThan(meter.min);
    expect(meter.value).toBeGreaterThanOrEqual(meter.min);
    expect(meter.value).toBeLessThanOrEqual(meter.max);
    expect(meter.name.trim()).not.toBe(''); expect(meter.text.trim()).not.toBe('');
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
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-pulse]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await page.locator('.bee-pulse').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const readings = node.querySelector('dl')!, css = getComputedStyle(readings);
    const contentWidth = readings.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    const blocks = [node, ...Array.from(node.querySelectorAll('dl,[data-beehive-vital],dt,dd,p,h2,[data-pulse-context],[data-pulse-record],[data-beehive-vital-value]'))];
    return {
      rootFont, contentWidth,
      columns: css.gridTemplateColumns.split(' ').filter(track => parseFloat(track) > 0).length,
      body: Array.from(node.querySelectorAll('[data-beehive-vital-detail],[data-pulse-context]')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      labels: Array.from(node.querySelectorAll('dt')).map(el => parseFloat(getComputedStyle(el).fontSize)),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.body.length).toBeGreaterThan(0);
  for (const font of result.body) expect(font).toBeGreaterThanOrEqual(result.rootFont * .875);
  for (const font of result.labels) expect(font).toBeGreaterThanOrEqual(result.rootFont * .875);
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-beehive-pulse]').screenshot({ path: testInfo.outputPath('pulse-' + name + '.png'), animations: 'disabled', timeout: 120000 });
}

test('status readings distinguish current, finished and saved evidence without inventing missing measurements', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await persistentWork(page);
  const pulse = page.locator('[data-beehive-pulse]');
  await semantics(page, 'colony', 'current');
  await expect(value(page, 'honey-stores')).toHaveText('1 lb');
  await expect(vital(page, 'honey-stores')).toContainText(/reserve.*lb.*season/i);
  await expect(vital(page, 'honey-stores')).toContainText(/syrup/i);
  await expect(vital(page, 'worker-force').locator('dt')).toHaveText('Worker force');
  await expect(value(page, 'worker-force')).toHaveText('45,000');
  await expect(vital(page, 'worker-force')).toContainText(/30,000/);
  await expect(vital(page, 'worker-force')).toContainText(/not a population target/i);
  await expect(vital(page, 'worker-force').locator('[role="meter"]')).toHaveAttribute('aria-valuemax', '30000');
  await expect(vital(page, 'worker-force').locator('[role="meter"]')).toHaveAttribute('aria-valuenow', '30000');
  await expect(vital(page, 'worker-force').locator('[role="meter"]')).toHaveAttribute('aria-valuetext', /45,000/);
  await expect(tab(page, 'beekeeper')).toHaveAttribute('aria-label', /food.*reserve/i);
  expect(await persistentWork(page)).toEqual(original);

  await fixture(page, { viewMode: 'queen', queen: { active: false } });
  await semantics(page, 'setup', 'setup');
  await expect(pulse.locator('[role="meter"]')).toHaveCount(0);
  await fixture(page, { queen: pausedQueen });
  await semantics(page, 'paused', 'current');
  await expect(value(page, 'brood-core')).toContainText('73');
  await expect(value(page, 'rts-advantage')).toContainText('58');
  await expect(value(page, 'rival-core')).toContainText('36');
  await expect(tab(page, 'queen')).toHaveAttribute('aria-label', /paused/i);
  await expect(pulse.locator('[data-pulse-context]')).toContainText(/paused/i);
  const pausedWork = await persistentWork(page);
  await accessible(page); expect(await persistentWork(page)).toEqual(pausedWork);
  // Persisted results outrank an active flag, paused flag and surviving threats.
  await fixture(page, { queen: { ...pausedQueen, result: 'defeat', threats: [threat] } });
  await semantics(page, 'review', 'saved');
  await expect(pulse.locator('[data-pulse-context]')).toContainText(/defeat|ended|complete|final/i);
  await expect(tab(page, 'queen')).toHaveAttribute('aria-label', /defeat|ended|complete|review/i);
  await expect(tab(page, 'queen')).not.toHaveAttribute('aria-label', /\bLIVE\b|\bPAUSED\b/);
  await expect(value(page, 'brood-core')).toContainText('73');
  await expect(value(page, 'rts-advantage')).toContainText('58');
  await expect(value(page, 'rival-core')).toContainText('36');
  const finishedQueen = await persistentWork(page);
  await page.evaluate(() => (window as any).__rerender());
  expect(await persistentWork(page)).toEqual(finishedQueen);
  await fixture(page, { queen: { active: true, paused: true, result: 'victory' } });
  await semantics(page, 'review', 'saved');
  for (const id of ['brood-core', 'rts-advantage', 'rival-core']) {
    await expect(value(page, id)).toHaveText('Not recorded');
    await expect(vital(page, id).locator('[role="meter"]')).toHaveCount(0);
  }

  await fixture(page, { viewMode: 'drone', drone: droneSetup });
  await semantics(page, 'setup', 'setup');
  await expect(pulse.locator('[role="meter"]')).toHaveCount(0);
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight, attempts: 2, successes: 1 } });
  await semantics(page, 'review', 'saved');
  await expect(value(page, 'flight-energy')).toHaveText('0%');
  await expect(value(page, 'flight-peak')).toHaveText('125 model ft');
  await expect(pulse.locator('[data-pulse-context]')).toContainText(/saved/i);
  await expect(tab(page, 'drone')).toHaveAttribute('aria-label', /saved|recorded|review/i);
  await expect(pulse.locator('[data-pulse-record]')).toContainText(/2 completed flights/i);
  await expect(pulse.locator('dl [data-pulse-record]')).toHaveCount(0);
  const savedWork = await persistentWork(page);
  await accessible(page); expect(await persistentWork(page)).toEqual(savedWork);
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false } } });
  await semantics(page, 'review', 'saved');
  for (const id of ['flight-energy', 'flight-peak']) {
    await expect(value(page, id)).toHaveText('Not recorded');
    await expect(vital(page, id).locator('[role="meter"]')).toHaveCount(0);
  }
  await fixture(page, { drone: { ...droneSetup, lastRun: { success: false, energyLeft: 12 } } });
  await expect(value(page, 'flight-energy')).toContainText('12');
  await expect(vital(page, 'flight-energy')).toContainText(/units were not recorded/i);
  await expect(value(page, 'flight-energy')).not.toContainText('%');
  await expect(vital(page, 'flight-energy').locator('[role="meter"]')).toHaveCount(0);

  // An actual runtime session is required: a persisted active flag alone does
  // not represent a running route. Steps mode holds the physics steady.
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight } });
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
  await semantics(page, 'paused', 'current');
  await expect(value(page, 'flight-energy')).toContainText('50%');
  await expect(vital(page, 'flight-energy')).toContainText(/reserve/i);
  await expect(value(page, 'flight-altitude')).toHaveText('80 model ft');
  await expect(value(page, 'route-markers')).toHaveText('0');
  await expect(vital(page, 'route-markers')).toContainText(/optional/i);
  expect((await pulse.locator('dt').allTextContents()).join(' ')).not.toMatch(/nectar|pollen/i);
  await expect(pulse).not.toContainText('125 model ft');
  await expect(tab(page, 'drone')).toHaveAttribute('aria-label', /pause|plan/i);
  const currentWork = await persistentWork(page), held = await physics(page);
  await accessible(page); await readableLayout(page);
  expect(await persistentWork(page)).toEqual(currentWork); expect(await physics(page)).toEqual(held);
  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, { phase: 'end', _summarySaved: true, _xpAwarded: true });
    w.__rerender();
  });
  await semantics(page, 'review', 'current');
  expect((await persistentWork(page)).beehive.drone.active).toBe(true);
  await expect(value(page, 'flight-energy')).toHaveText('50%');
  await expect(value(page, 'flight-peak')).toHaveText('140 model ft');
  await expect(pulse.locator('[data-pulse-context]')).toContainText(/final|ended|complete/i);
  await expect(pulse.locator('[data-pulse-context]')).not.toContainText(/saved/i);
  await expect(tab(page, 'drone')).toHaveAttribute('aria-label', /ended|complete|review/i);
  await expect(tab(page, 'drone')).not.toHaveAttribute('aria-label', /In flight|Paused|Pause and plan/i);
  await expect(vital(page, 'flight-altitude')).toHaveCount(0);
  await expect(vital(page, 'route-markers')).toHaveCount(0);
  const endedWork = await persistentWork(page), endedPhysics = await physics(page);
  await page.evaluate(() => (window as any).__rerender());
  expect(await persistentWork(page)).toEqual(endedWork); expect(await physics(page)).toEqual(endedPhysics);
  expect(endedWork.beehive.notebook).toEqual(original.beehive.notebook);
  expect(endedWork.otherTool).toEqual(original.otherTool);
  expect(errors).toEqual([]);
});

test('status readings retain visible context on mobile, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const frozen = await persistentWork(page);
  for (const width of [320, 640, 1100]) {
    await page.setViewportSize({ width, height: 1800 });
    const layout = await readableLayout(page); await accessible(page);
    if (width === 320) { expect(layout.columns).toBe(1); await preview(page, testInfo, 'mobile'); }
  }
  await fixture(page, { focusLayout: false });
  const wide = await readableLayout(page); expect(wide.columns).toBe(3);
  await accessible(page); await preview(page, testInfo, 'wide');
  await fixture(page, { focusLayout: true });
  expect(await persistentWork(page)).toEqual(frozen);
  await fixture(page, { viewMode: 'queen', queen: pausedQueen });
  const queenWork = await persistentWork(page);
  await page.setViewportSize({ width: 320, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  expect(await persistentWork(page)).toEqual(queenWork);
  await page.emulateMedia({ forcedColors: 'active' });
  const colors = await vital(page, 'brood-core').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  expect(await persistentWork(page)).toEqual(queenWork);
  await page.emulateMedia({ forcedColors: 'none' });
  await fixture(page, { viewMode: 'drone', drone: { ...droneSetup, lastRun: savedFlight, attempts: 2, successes: 1 }, focusLayout: false });
  const reviewWork = await persistentWork(page);
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-pulse]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await page.locator('[data-beehive-pulse]').evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false); expect(enlarged.columns).toBe(1);
  await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(reviewWork);
  expect(errors).toEqual([]);
});
