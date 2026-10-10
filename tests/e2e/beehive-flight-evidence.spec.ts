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
test.afterEach(async ({ page }) => harness.destroy(page));

const droneSetup = { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 };
const savedFlight = {
  success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
  energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, nectar: 4,
  maxAlt: 125, distance: 610, score: 45, courseSeed: 20260908,
  routePlan: 'direct', scenario: 'calm', pacing: 'steps', custom: { retained: 'Saved route metadata.' },
};

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my possible explanation.', review: { prediction: true, evidence: true, explanation: true } },
    queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.', review: { evidence: true } },
    drone: { prediction: 'Keep my flight prediction.', evidence: 'My own route note: <strong>compare conditions</strong> & keep this text.', explanation: 'Keep my route explanation.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Flight evidence test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 12, honey: 60, workers: 24000, morale: 85, activeEvent: null,
      missionBriefOpen: false, journeyOpen: false, notebookOpen: true, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      discoveryLesson: 'pollination',
      discoveryRecords: { pollination: { prediction: 1, checked: true, note: 'Keep my discovery draft.', saved: false } },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    const copy = async (text: string) => { w.__copiedFlightEvidence = text; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, seededNotebook());
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
}

function panel(page: Page) { return page.locator('[data-flight-notebook-capture="true"]'); }
function reading(page: Page, id: string) { return panel(page).locator('[data-capture-reading="' + id + '"]'); }
function value(page: Page, id: string) { return reading(page, id).locator('[data-capture-value]'); }
function capture(page: Page) { return page.locator('[data-beehive-capture-evidence="drone"]'); }

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}

async function physics(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current;
    return JSON.parse(JSON.stringify({ x: s.x, y: s.y, z: s.z, maxAlt: s.maxAlt, distance: s.distance,
      energy: s.energy, phase: s.phase, pacing: s.pacing, paused: s.paused, reachedDca: s.reachedDca,
      routeMarkersPassed: s.routeMarkersPassed, nectarCollected: s.nectarCollected, nearQueens: s.nearQueens,
      timer: s.timer, randomState: s.randomState, telemetry: s.telemetry, decisions: s.decisionLog }));
  });
}

async function semantics(page: Page, state: string, source: string) {
  const capturePanel = panel(page);
  await expect(capturePanel).toHaveAttribute('data-capture-state', state);
  await expect(capturePanel).toHaveAttribute('data-capture-source', source);
  await expect(capturePanel.locator('h3')).toBeVisible();
  await expect(capturePanel.locator('[data-capture-context]')).toBeVisible();
  await expect(capturePanel.locator('[data-capture-save-hint]')).toBeVisible();
  if (source === 'setup') {
    await expect(capturePanel.locator('[data-capture-reading]')).toHaveCount(0);
    await expect(capture(page)).toBeDisabled();
  } else {
    await expect(capturePanel.locator('dl')).toHaveCount(1);
    expect(await capturePanel.locator('[data-capture-reading]').count()).toBeGreaterThanOrEqual(5);
    for (const item of await capturePanel.locator('[data-capture-reading]').all()) {
      await expect(item.locator(':scope > dt')).not.toHaveText('');
      await expect(item.locator(':scope > dd[data-capture-value]')).not.toHaveText('');
    }
    await expect(capture(page)).toBeEnabled();
    await expect(capture(page)).toHaveAccessibleName(/Add these readings/i);
  }
}

async function recordText(page: Page) {
  const record = panel(page).locator('details[data-capture-record]');
  if (!await record.evaluate(node => (node as HTMLDetailsElement).open)) {
    await record.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(record).toHaveJSProperty('open', true);
  const text = record.locator('pre[data-capture-text]');
  await expect(text).toBeVisible(); await expect(text.locator('*')).toHaveCount(0);
  expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  const content = (await text.textContent())!;
  expect(content.trim()).not.toBe('');
  return content;
}

async function assertAppend(page: Page, text: string) {
  const before = await work(page), held = await physics(page);
  await capture(page).focus(); await page.keyboard.press('Enter');
  const expected = JSON.parse(JSON.stringify(before));
  expected.beehive.notebook.drone.evidence += '\n' + text.trim();
  expected.beehive.notebook.drone.review.evidence = false;
  expect(await work(page)).toEqual(expected); expect(await physics(page)).toEqual(held);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue(expected.beehive.notebook.drone.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(page.locator('[data-notebook-review="prediction"]')).toBeChecked();
  await expect(page.locator('[data-notebook-review="explanation"]')).toBeChecked();
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-flight-notebook-capture="true"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('dl,dt,dd,p,h3,button,summary,details,pre,[data-capture-reading],[data-capture-context],[data-capture-value]'))];
    return {
      rootFont,
      readings: Array.from(node.querySelectorAll('[data-capture-reading]')).map(el => ({ x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width })),
      controls: Array.from(node.querySelectorAll('button,summary')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(node.querySelectorAll('dt,dd,p,pre,[data-capture-context]')).map(el => {
        const css = getComputedStyle(el);
        return { text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.controls.length).toBeGreaterThanOrEqual(2);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  expect(result.text.length).toBeGreaterThan(5);
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(text.ellipsis, text.text || '').toBe(false); expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
  }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await panel(page).screenshot({ path: testInfo.outputPath('capture-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('flight evidence preserves visible source readings, saved writing and full-box boundaries without inventing measurements', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await work(page);
  await semantics(page, 'setup', 'setup');
  await expect(panel(page)).not.toContainText(/100%|80 model ft/);
  expect(await work(page)).toEqual(original);

  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight, attempts: 2, successes: 1 } });
  await semantics(page, 'saved', 'saved');
  await expect(value(page, 'energy')).toHaveText('0% of difficulty reserve');
  await expect(value(page, 'peak')).toHaveText('125 model ft');
  await expect(value(page, 'distance')).toHaveText('610 model m');
  await expect(value(page, 'markers')).toHaveText('0');
  await expect(value(page, 'dca')).toHaveText('Recorded');
  await expect(value(page, 'result')).toHaveText('Intercept recorded');
  await expect(panel(page).locator('[data-capture-context]')).toContainText(/saved/i);
  const savedText = await recordText(page); expect(savedText).toContain('0%'); expect(savedText).toContain('125 model ft');
  const summary = panel(page).locator('details[data-capture-record] > summary');
  await summary.focus(); await page.keyboard.press('Space');
  await expect(panel(page).locator('[data-capture-record]')).toHaveJSProperty('open', false);
  await expect(summary).toBeFocused(); await page.keyboard.press('Enter');
  await assertAppend(page, savedText);
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already|added/i);

  // A repeated record preserves the learner's subsequent self-review.
  const duplicate = await work(page); duplicate.beehive.notebook.drone.review.evidence = true;
  await fixture(page, { notebook: duplicate.beehive.notebook });
  const duplicateBefore = await work(page);
  await capture(page).click(); expect(await work(page)).toEqual(duplicateBefore);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already/i);
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedFlightEvidence || '')).toContain(savedText.trim());
  const exported = await page.evaluate(() => (window as any).__copiedFlightEvidence as string);
  expect(exported).toContain(seededNotebook().drone.evidence);
  expect(exported).toContain(seededNotebook().beekeeper.evidence);

  // A full evidence field cannot silently replace or truncate existing writing.
  const full = seededNotebook(); full.drone.evidence = 'x'.repeat(1200);
  await fixture(page, { notebook: full });
  const fullBefore = await work(page), required = savedText.trim().length + 1;
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(String(required));
  await expect(capture(page)).toBeEnabled(); await capture(page).click();
  expect(await work(page)).toEqual(fullBefore);
  await expect(page.locator('[data-notebook-evidence-notice]')).toContainText(/room|full|1,200/i);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  // An exact fit succeeds, including the separating newline.
  const exact = seededNotebook(); exact.drone.evidence = 'x'.repeat(1200 - required);
  await fixture(page, { notebook: exact }); await assertAppend(page, savedText);
  expect((await work(page)).beehive.notebook.drone.evidence.length).toBe(1200);

  await fixture(page, { notebook: seededNotebook(), drone: { ...droneSetup, lastRun: { success: false, energyLeft: 12 } } });
  await semantics(page, 'saved', 'saved');
  await expect(value(page, 'energy')).toContainText('12');
  await expect(value(page, 'energy')).not.toContainText('%');
  await expect(reading(page, 'energy')).toContainText(/units.*not recorded/i);
  await expect(value(page, 'result')).toHaveText('No intercept');
  for (const id of ['peak', 'distance', 'markers', 'dca']) await expect(value(page, id)).toHaveText('Not recorded');
  const legacyText = await recordText(page);
  expect(legacyText).not.toMatch(/12%|0 model ft|0 model m/);
  expect(legacyText).not.toContain('20260908');
  await fixture(page, { drone: { ...droneSetup, lastRun: {} } });
  for (const id of ['energy', 'peak', 'distance', 'markers', 'dca', 'result']) await expect(value(page, id)).toHaveText('Not recorded');
  const unknownText = await recordText(page); expect(unknownText).toContain('Not recorded');
  expect(unknownText).not.toMatch(/0%|100%|80 model ft|20260908/);
  const unknownWork = await work(page);
  await page.evaluate(() => (window as any).__rerender()); expect(await work(page)).toEqual(unknownWork);
  // A reloaded active flag is not a new runtime: only its last saved flight is available.
  await fixture(page, { drone: { ...droneSetup, active: true, lastRun: savedFlight } });
  await semantics(page, 'saved', 'saved'); await expect(value(page, 'peak')).toHaveText('125 model ft');
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight } });

  // Start through the actual launch control before injecting paused model readings.
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await page.evaluate(saved => {
    const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    Object.assign(state, { phase: 'flight', paused: true, pacing: 'steps', difficulty: 'easy', energy: 62.5,
      routeMarkersPassed: 0, nectarCollected: 4, reachedLaunch: true, reachedDca: false,
      x: 0, y: 80, z: -550, maxAlt: 140, distance: 550, nearQueens: [] });
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { drone: { ...w.__toolData.beehive.drone, lastRun: saved } }));
  }, savedFlight);
  await semantics(page, 'paused', 'current');
  await expect(value(page, 'energy')).toHaveText('50% of difficulty reserve');
  await expect(value(page, 'altitude')).toHaveText('80 model ft');
  await expect(value(page, 'markers')).toHaveText('0');
  await expect(panel(page)).not.toContainText('125 model ft');
  const displayed = await recordText(page);
  expect(displayed).toContain('50%'); expect(displayed).toContain('80 model ft');
  const heldWork = await work(page), heldPhysics = await physics(page);
  await panel(page).locator('[data-capture-refresh]').click();
  expect(await work(page)).toEqual(heldWork); expect(await physics(page)).toEqual(heldPhysics);
  expect(await recordText(page)).toBe(displayed);
  // Mutating the runtime without a render must not replace the readings the learner saw.
  await page.evaluate(() => { (window as any).__testHooks.beehive.droneStateRef.current.energy = 31.25; });
  await expect(value(page, 'energy')).toHaveText('50% of difficulty reserve');
  await assertAppend(page, displayed);
  const beforeRefresh = await work(page), physicsBeforeRefresh = await physics(page);
  await panel(page).locator('[data-capture-refresh]').focus(); await page.keyboard.press('Space');
  await expect(value(page, 'energy')).toHaveText('25% of difficulty reserve');
  expect(await work(page)).toEqual(beforeRefresh); expect(await physics(page)).toEqual(physicsBeforeRefresh);
  const refreshed = await recordText(page); expect(refreshed).toContain('25%'); expect(refreshed).not.toBe(displayed);

  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__testHooks.beehive.droneStateRef.current, { phase: 'end', _summarySaved: true, _xpAwarded: true });
    w.__rerender();
  });
  await semantics(page, 'final', 'current');
  await expect(value(page, 'energy')).toHaveText('25% of difficulty reserve');
  await expect(value(page, 'peak')).toHaveText('140 model ft');
  await expect(value(page, 'result')).toHaveText('No intercept');
  await expect(reading(page, 'altitude')).toHaveCount(0);
  await expect(panel(page).locator('[data-capture-context]')).toContainText(/final|ended|complete/i);
  await expect(panel(page).locator('[data-capture-context]')).not.toContainText(/saved/i);
  const finalText = await recordText(page); expect(finalText).toContain('140 model ft'); expect(finalText).not.toContain('125 model ft');
  await fixture(page, { notebook: seededNotebook() }); await assertAppend(page, finalText);
  const endedWork = await work(page), endedPhysics = await physics(page);
  await accessible(page); expect(await work(page)).toEqual(endedWork); expect(await physics(page)).toEqual(endedPhysics);
  expect(endedWork.beehive.notebook.beekeeper).toEqual(original.beehive.notebook.beekeeper);
  expect(endedWork.beehive.notebook.queen).toEqual(original.beehive.notebook.queen);
  expect(endedWork.otherTool).toEqual(original.otherTool);
  expect(errors).toEqual([]);
});

test('flight evidence and its exact text remain readable on mobile, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await fixture(page, { drone: { ...droneSetup, lastRun: savedFlight, attempts: 2, successes: 1 } });
  const frozen = await work(page), text = await recordText(page);
  for (const [width, name] of [[980, 'wide'], [320, 'mobile']] as const) {
    await page.setViewportSize({ width, height: 1800 });
    const layout = await readableLayout(page);
    if (width === 320) expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBe(1);
    else expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBeGreaterThan(1);
    expect(await recordText(page)).toBe(text); await accessible(page); await preview(page, testInfo, name);
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await capture(page).focus();
  const colors = await capture(page).evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1600, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-notebook]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '1100px', maxWidth: 'none' }));
  await panel(page).evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await panel(page).evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false);
  expect(new Set(enlarged.readings.map(item => Math.round(item.x))).size).toBe(1);
  expect(await recordText(page)).toBe(text); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await work(page)).toEqual(frozen); expect(errors).toEqual([]);
});
