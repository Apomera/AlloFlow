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
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

const pausedQueen = {
  active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
  phase: 'build', difficulty: 'guided', opening: 'balanced', scenario: 'mite_crisis',
  pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
  rival: { name: 'Recorded test rival', health: 36, pressure: 64, intel: 2 },
  resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
  result: null, threats: [], custom: { retained: 'Network match metadata.' },
};
const readingIds = ['brood-core', 'advantage', 'qmp', 'rival-core', 'pressure'];

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep my observed day.', explanation: 'Keep my possible explanation.', review: { prediction: true, evidence: true, explanation: true } },
    queen: { prediction: 'Keep my network prediction.', evidence: 'My own network note: <strong>compare conditions</strong> & keep this text.', explanation: 'Keep my network explanation.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route reading.', explanation: 'Keep my route explanation.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Network evidence test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'queen', beeView: 'pollination',
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
    const copy = async (text: string) => { w.__copiedNetworkEvidence = text; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, seededNotebook());
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
}

function panel(page: Page) { return page.locator('[data-network-notebook-capture="true"]'); }
function reading(page: Page, id: string) { return panel(page).locator('[data-capture-reading="' + id + '"]'); }
function value(page: Page, id: string) { return reading(page, id).locator('[data-capture-value]'); }
function capture(page: Page) { return page.locator('[data-beehive-capture-evidence="queen"]'); }

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
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
    for (const id of readingIds) {
      await expect(reading(page, id).locator(':scope > dt')).not.toHaveText('');
      await expect(reading(page, id).locator(':scope > dd[data-capture-value]')).not.toHaveText('');
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
  const before = await work(page);
  await capture(page).focus(); await page.keyboard.press('Enter');
  const expected = JSON.parse(JSON.stringify(before));
  expected.beehive.notebook.queen.evidence += '\n' + text.trim();
  expected.beehive.notebook.queen.review.evidence = false;
  expect(await work(page)).toEqual(expected);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue(expected.beehive.notebook.queen.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(page.locator('[data-notebook-review="prediction"]')).toBeChecked();
  await expect(page.locator('[data-notebook-review="explanation"]')).toBeChecked();
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-network-notebook-capture="true"]'), {
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
  await panel(page).screenshot({ path: testInfo.outputPath('network-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('network evidence preserves the displayed snapshot, missing readings and saved writing through paused and completed matches', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await work(page);
  await semantics(page, 'setup', 'setup');
  await expect(panel(page)).not.toContainText(/100%|50 \/ 100/);
  expect(await work(page)).toEqual(original);

  // The actual start establishes recorded Cycle 0 readings; rendering setup does not.
  await page.locator('[data-beehive-start-strategy="true"]').click();
  await semantics(page, 'paused', 'current');
  await expect(panel(page).locator('[data-capture-context]')).toContainText(/Cycle\s*0/i);
  await expect(value(page, 'advantage')).toHaveText('50 / 100');
  const started = await work(page);
  expect(started.beehive.queen.active).toBe(true); expect(started.beehive.queen.paused).toBe(true);
  expect(started.beehive.queen.day).toBe(0);
  const withoutQueen = JSON.parse(JSON.stringify(started));
  withoutQueen.beehive.queen = original.beehive.queen;
  // Starting a match clears the legacy null selectedAction through recovery.
  expect(started.beehive.saveRecovery).toEqual({ fields: ['queen'] });
  delete withoutQueen.beehive.saveRecovery;
  expect(withoutQueen).toEqual(original);

  await fixture(page, { queen: pausedQueen });
  await semantics(page, 'paused', 'current');
  for (const [id, text] of [['brood-core', '73%'], ['advantage', '58 / 100'], ['qmp', '43%'], ['rival-core', '36%'], ['pressure', '64%']]) {
    await expect(value(page, id)).toHaveText(text);
  }
  await expect(value(page, 'advantage')).not.toContainText('%');
  const context = panel(page).locator('[data-capture-context]');
  for (const label of [/paused/i, /Cycle\s*7/i, /Build/i, /Guided/i, /Balanced brood/i, /Mite crisis/i, /Recorded test rival/]) {
    await expect(context).toContainText(label);
  }
  const text = await recordText(page), held = await work(page);
  for (const label of ['73%', '58 / 100', '43%', '36%', '64%']) expect(text).toContain(label);
  await panel(page).locator('[data-capture-refresh]').focus(); await page.keyboard.press('Space');
  expect(await work(page)).toEqual(held); expect(await recordText(page)).toBe(text);
  const summary = panel(page).locator('details[data-capture-record] > summary');
  await summary.focus(); await page.keyboard.press('Space');
  await expect(panel(page).locator('[data-capture-record]')).toHaveJSProperty('open', false);
  await expect(summary).toBeFocused(); await page.keyboard.press('Enter');
  await assertAppend(page, text);
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already|added/i);

  // A duplicate must preserve a self-review completed after adding the record.
  const duplicate = await work(page); duplicate.beehive.notebook.queen.review.evidence = true;
  await fixture(page, { notebook: duplicate.beehive.notebook });
  const duplicateBefore = await work(page);
  await capture(page).click(); expect(await work(page)).toEqual(duplicateBefore);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already/i);
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedNetworkEvidence || '')).toContain(text.trim());
  const exported = await page.evaluate(() => (window as any).__copiedNetworkEvidence as string);
  expect(exported).toContain(seededNotebook().queen.evidence); expect(exported).toContain(seededNotebook().drone.evidence);

  const full = seededNotebook(); full.queen.evidence = 'x'.repeat(1200);
  await fixture(page, { notebook: full });
  const fullBefore = await work(page), required = text.trim().length + 1;
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(String(required));
  await expect(capture(page)).toBeEnabled(); await capture(page).click();
  expect(await work(page)).toEqual(fullBefore);
  await expect(page.locator('[data-notebook-evidence-notice]')).toContainText(/room|full|1,200/i);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  const exact = seededNotebook(); exact.queen.evidence = 'x'.repeat(1200 - required);
  await fixture(page, { notebook: exact }); await assertAppend(page, text);
  expect((await work(page)).beehive.notebook.queen.evidence.length).toBe(1200);

  // A completed result outranks active/paused flags and keeps genuine zero values.
  await fixture(page, { notebook: seededNotebook(), queen: {
    ...pausedQueen, result: 'defeat', day: 0, hiveHealth: 0, territory: 0,
    pheromones: { qmp: 0 }, rival: { name: 'Recorded test rival', health: 0, pressure: 0 },
  } });
  await semantics(page, 'saved', 'saved');
  for (const id of ['brood-core', 'qmp', 'rival-core', 'pressure']) await expect(value(page, id)).toHaveText('0%');
  await expect(value(page, 'advantage')).toHaveText('0 / 100');
  await expect(value(page, 'result')).toHaveText(/Defeat/i);
  await expect(context).toContainText(/saved|completed|final|recorded/i);
  await expect(context).toContainText(/Cycle\s*0/i);
  const finalText = await recordText(page); expect(finalText).toContain('0 / 100');
  await assertAppend(page, finalText);
  const completed = await work(page);
  await panel(page).locator('[data-capture-refresh]').click(); expect(await work(page)).toEqual(completed);

  // Planning the next match must not relabel the conditions of the saved match.
  await fixture(page, { queen: { ...completed.beehive.queen, active: false } });
  const savedContext = await context.textContent(), savedRecord = await recordText(page);
  const beforeSetup = await work(page);
  for (const [hook, selection] of [['scenario', 'rival_surge'], ['difficulty', 'expert'], ['opening', 'forage']]) {
    const option = page.locator('[data-queen-' + hook + '="' + selection + '"]');
    await expect(option).toBeVisible(); await option.click();
    await expect(option).toHaveAttribute('aria-checked', 'true');
    await semantics(page, 'saved', 'saved');
    expect(await context.textContent()).toBe(savedContext);
    expect(await recordText(page)).toBe(savedRecord);
    await expect(value(page, 'result')).toHaveText(/Defeat/i);
  }
  const nextSetup = await work(page);
  expect(nextSetup.beehive.queen.notebookMatchConditions).toEqual({
    scenario: pausedQueen.scenario, difficulty: pausedQueen.difficulty, opening: pausedQueen.opening,
  });
  const expectedSetup = JSON.parse(JSON.stringify(beforeSetup));
  Object.assign(expectedSetup.beehive.queen, {
    scenario: 'rival_surge', difficulty: 'expert', opening: 'forage',
    notebookMatchConditions: nextSetup.beehive.queen.notebookMatchConditions,
  });
  expect(nextSetup).toEqual(expectedSetup);
  await page.locator('[data-beehive-start-strategy="true"]').click();
  await semantics(page, 'paused', 'current');
  for (const label of [/Cycle\s*0/i, /Expert/i, /Range Expansion/i, /Rival surge/i, /Nightshade Wing/i]) {
    await expect(context).toContainText(label);
  }
  const restarted = await work(page);
  expect(restarted.beehive.queen).not.toHaveProperty('notebookMatchConditions');
  expect(restarted.beehive.queen).not.toHaveProperty('notebookMatchEvidence');
  expect(restarted.beehive.queen.result).toBeNull();
  expect(restarted.beehive.notebook).toEqual(nextSetup.beehive.notebook);
  const withoutRestart = JSON.parse(JSON.stringify(restarted));
  withoutRestart.beehive.queen = nextSetup.beehive.queen;
  expect(withoutRestart).toEqual(nextSetup);

  // Partial persisted results never inherit current setup defaults as evidence.
  await fixture(page, { queen: { active: true, paused: false, result: 'victory', rival: { name: 'Recovered rival' }, pheromones: {} } });
  await semantics(page, 'saved', 'saved');
  for (const id of readingIds) await expect(value(page, id)).toHaveText('Not recorded');
  await expect(value(page, 'result')).toHaveText(/Victory/i);
  const unknown = await recordText(page);
  expect(unknown).toMatch(/not recorded/i);
  expect(unknown).toContain('Recovered rival');
  expect(unknown).not.toMatch(/100%|50 \/ 100|Cycle\s*0|Standard|Balanced brood|Field report|Thistle Crown/);
  const unknownWork = await work(page);
  expect(unknownWork.beehive.queen.notebookMatchEvidence.result).toBe('victory');
  await page.evaluate(() => (window as any).__rerender()); expect(await work(page)).toEqual(unknownWork);
  await accessible(page);

  // Recovery can make an unrecognized old result safe without inventing evidence.
  await fixture(page, { queen: { active: true, paused: false, result: 'legacy outcome', rival: { name: 'Recovered rival' }, pheromones: {} } });
  await semantics(page, 'saved', 'saved');
  for (const id of [...readingIds, 'result']) await expect(value(page, id)).toHaveText('Not recorded');
  const legacyText = await recordText(page), legacyWork = await work(page);
  expect(legacyText).toContain('Recovered rival');
  expect(legacyText).not.toMatch(/100%|50 \/ 100|Cycle\s*0|Standard|Balanced brood|Field report|Thistle Crown/);
  expect(legacyWork.beehive.queen.result).toBeNull();
  expect(legacyWork.beehive.queen.active).toBe(false); expect(legacyWork.beehive.queen.paused).toBe(false);
  expect(legacyWork.beehive.queen.notebookMatchEvidence.result).toBe('legacy outcome');
  await page.evaluate(() => (window as any).__rerender());
  await panel(page).locator('[data-capture-refresh]').click();
  expect(await work(page)).toEqual(legacyWork); expect(await recordText(page)).toBe(legacyText);
  await semantics(page, 'saved', 'saved');
  await page.locator('[data-beehive-start-strategy="true"]').click();
  await semantics(page, 'paused', 'current');
  const afterRecoveryStart = await work(page);
  expect(afterRecoveryStart.beehive.queen).not.toHaveProperty('notebookMatchEvidence');
  expect(afterRecoveryStart.beehive.queen).not.toHaveProperty('notebookMatchConditions');
  expect(afterRecoveryStart.beehive.queen.day).toBe(0);
  expect(afterRecoveryStart.beehive.notebook).toEqual(legacyWork.beehive.notebook);
  expect(unknownWork.beehive.notebook.beekeeper).toEqual(original.beehive.notebook.beekeeper);
  expect(unknownWork.beehive.notebook.drone).toEqual(original.beehive.notebook.drone);
  expect(unknownWork.beehive.drone).toEqual(original.beehive.drone);
  expect(unknownWork.otherTool).toEqual(original.otherTool);
  expect(errors).toEqual([]);
});

test('network evidence remains readable in both layouts, on mobile, in dark and forced colors, and with enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await fixture(page, { queen: pausedQueen });
  const original = await work(page), text = await recordText(page);
  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout });
    for (const [width, name] of [[980, 'wide'], [320, 'mobile']] as const) {
      await page.setViewportSize({ width, height: 1800 });
      const layout = await readableLayout(page);
      if (width === 320) expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBe(1);
      else expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBeGreaterThan(1);
      expect(await recordText(page)).toBe(text); await accessible(page);
      if (focusLayout) await preview(page, testInfo, name);
    }
  }
  await fixture(page, { focusLayout: true });
  expect(await work(page)).toEqual(original);
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
  expect(await work(page)).toEqual(original); expect(errors).toEqual([]);
});
