import { test, expect, Page, Locator, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const lessonTitles = {
  stores: 'Follow the food', pollination: 'A flower connection', waggle: 'Decode the dance',
  thermo: 'The living thermostat', network: 'Many bees, one colony', flight: 'Spend energy wisely',
};
const fieldLabels = {
  prediction: 'Prediction:', observation: 'Captured observation:',
  comparison: 'Before and after:', explanation: 'Explanation:',
};
const emptyText = 'No text was saved for this field.';

async function mount(page: Page, overrides: any = {}, grade = '7th Grade') {
  await page.addInitScript(() => {
    const w = window as any;
    w.__RR_TEST_EXPORTS__ = {};
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { w.__copiedPortfolio = text; },
    } });
  });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({
      beehive: {
        ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
        discoveryLesson: 'pollination', tutorialDone: true, soundOn: false, motionPaused: true,
        autoAdvance: false, focusLayout: true, day: 12, totalFlowerVisits: 3500, ...overrides,
      },
      otherTool: { retained: true, note: 'Another tool keeps its work.' },
    }));
    w.__ctx.gradeLevel = grade; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, { overrides, grade });
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
}

async function openNotebook(page: Page) {
  const notebook = page.locator('[data-beehive-notebook]');
  if (!await notebook.evaluate(node => (node as HTMLDetailsElement).open)) {
    await page.locator('#beehive-notebook-summary').click();
  }
  await expect(notebook).toHaveAttribute('open', '');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.notebookOpen)).toBe(true);
  await expect(page.locator('[data-discovery-notebook-records]')).toBeVisible();
}

async function persistentWork(page: Page) {
  return page.evaluate(() => {
    const w = window as any, state = w.__toolData.beehive;
    const colony: Record<string, unknown> = {};
    for (const key of ['day', 'honey', 'pollen', 'workers', 'brood', 'varroaLevel', 'morale',
      'simulationSeed', 'experimentRunSerial', 'managementTrail', 'thermoParams', 'waggleLab']) {
      colony[key] = state[key];
    }
    return JSON.parse(JSON.stringify({ notebook: state.notebook, records: state.discoveryRecords,
      colony, otherTool: w.__toolData.otherTool }));
  });
}

async function rawState(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}

async function expectSavedCard(card: Locator, id: keyof typeof lessonTitles, record: any) {
  await expect(card).toHaveAttribute('aria-labelledby', 'bee-saved-discovery-' + id + '-title');
  await expect(card.getByRole('heading', { level: 5, name: lessonTitles[id], exact: true }))
    .toHaveAttribute('id', 'bee-saved-discovery-' + id + '-title');
  await expect(card.getByText('Saved copy', { exact: true })).toBeVisible();
  const fields = ['prediction', 'observation', ...(record.comparison ? ['comparison'] : []), 'explanation'];
  expect(await card.locator('[data-saved-discovery-field]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-saved-discovery-field')))).toEqual(fields);
  await expect(card.locator('dl')).toHaveCount(1);
  for (const field of fields) {
    const row = card.locator('[data-saved-discovery-field="' + field + '"]');
    await expect(row.locator('dt strong')).toHaveText(fieldLabels[field as keyof typeof fieldLabels]);
    const saved = record[field] == null ? '' : String(record[field]);
    // textContent intentionally keeps whitespace that toHaveText normally normalizes.
    expect(await row.locator('dd').textContent()).toBe(saved === '' ? emptyText : saved);
    if (saved === '') await expect(row.locator('dd')).toHaveAttribute('data-saved-text-empty', 'true');
    else expect(await row.locator('dd').getAttribute('data-saved-text-empty')).toBeNull();
  }
  await expect(card.locator('[data-saved-discovery-field="prediction"] dt')).toContainText('My thinking');
  await expect(card.locator('[data-saved-discovery-field="observation"] dt')).toContainText('Saved simulation text');
  await expect(card.locator('[data-saved-discovery-field="explanation"] dt')).toContainText('My thinking');
  if (record.comparison) await expect(card.locator('[data-saved-discovery-field="comparison"] dt')).toContainText('Saved comparison text');
  await expect(card.locator('button,input,textarea,select,summary,a')).toHaveCount(0);
}

async function copyPortfolio(page: Page) {
  await page.evaluate(() => { (window as any).__copiedPortfolio = ''; });
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedPortfolio || '')).not.toBe('');
  return page.evaluate(() => (window as any).__copiedPortfolio as string);
}

async function accessible(page: Page, checkPageOverflow = true) {
  const result = await page.evaluate(async () => {
    const panel = document.querySelector('[data-discovery-notebook-records]')!;
    const audit = await (window as any).axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    const nodes = [panel, ...Array.from(panel.querySelectorAll('article,dl,[data-saved-discovery-field],dt,dd'))];
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflowing: nodes.filter(node => node.scrollWidth - node.clientWidth > 1).map(node => ({
        tag: node.tagName, field: node.getAttribute('data-saved-discovery-field'), overflow: node.scrollWidth - node.clientWidth,
      })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.violations).toEqual([]);
  expect(result.overflowing).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
}

async function expectLayout(card: Locator) {
  const layout = await card.evaluate(node => {
    const css = getComputedStyle(node), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const grid = node.querySelector('dl')!, fields = Array.from(grid.children);
    const rects = fields.map(field => field.getBoundingClientRect());
    return {
      wideEnough: node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) >= 36 * rootFont,
      sameRow: Math.abs(rects[0].top - rects[1].top) < 1,
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      gridWidth: grid.getBoundingClientRect().width,
      laterWidths: rects.slice(2).map(rect => rect.width),
      bodies: Array.from(node.querySelectorAll('dd')).map(body => ({
        ratio: parseFloat(getComputedStyle(body).fontSize) / rootFont,
        whiteSpace: getComputedStyle(body).whiteSpace, wrap: getComputedStyle(body).overflowWrap,
      })),
    };
  });
  expect(layout.sameRow).toBe(layout.wideEnough);
  expect(layout.columns).toBe(layout.wideEnough ? 2 : 1);
  for (const width of layout.laterWidths) expect(width).toBeCloseTo(layout.gridWidth, 0);
  for (const body of layout.bodies) {
    expect(body.ratio).toBeCloseTo(.9375, 3);
    expect(body.whiteSpace).toBe('pre-wrap'); expect(body.wrap).toBe('anywhere');
  }
  return layout;
}

async function expectPaintedPalette(card: Locator) {
  const palette = await card.evaluate(node => {
    const panel = node.closest('[data-discovery-notebook-records]')!;
    return {
      cardPaper: getComputedStyle(node).backgroundColor, panelPaper: getComputedStyle(panel).backgroundColor,
      border: getComputedStyle(node).borderTopColor, borderStyle: getComputedStyle(node).borderTopStyle,
      ink: getComputedStyle(node.querySelector('dd')!).color,
    };
  });
  for (const color of [palette.cardPaper, palette.panelPaper, palette.border]) {
    expect(color).not.toBe('rgba(0, 0, 0, 0)'); expect(color).not.toBe('transparent');
  }
  expect(palette.borderStyle).not.toBe('none'); expect(palette.ink).not.toBe(palette.cardPaper);
}

async function preview(page: Page, testInfo: TestInfo, name: string, target?: Locator) {
  const panel = target || page.locator('[data-discovery-notebook-records]');
  const height = await panel.evaluate(node => Math.ceil(node.getBoundingClientRect().height));
  await page.setViewportSize({ width: page.viewportSize()!.width, height: Math.max(1800, height + 180) });
  await panel.screenshot({ path: testInfo.outputPath('notebook-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

function representativeNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Earlier colony evidence.', explanation: 'Keep my colony explanation.' },
    synthesis: 'Keep my synthesis.',
    discoveries: { pollination: {
      prediction: 'Pollen reaching a receptive stigma',
      observation: 'Starting case: loose pollen present; stigma contact missed.\nPollen transfer was not shown in this saved schematic.',
      comparison: 'Only stigma contact changed.\nThe compared case showed deposition; fertilization was not observed.',
      explanation: 'I changed contact while holding pollen and compatibility fixed.\n\nThis describes the two saved cases. A visit alone does not establish fertilization.',
    } },
  };
}

test('saved discovery preserves an actual flower-case save, its raw writing and portfolio while live controls and roles change', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const notebook = {
    beekeeper: { prediction: 'Earlier colony prediction.', evidence: 'Earlier colony evidence.', explanation: 'Earlier colony explanation.', review: { evidence: true } },
    queen: { prediction: 'Keep network writing.' }, drone: { explanation: 'Keep flight writing.' }, synthesis: 'Keep cross-role synthesis.',
  };
  await mount(page, { notebook, pollinationLab: { pollen: true, contact: false, compatible: true, note: 'Keep flower notes.', teacher: { retained: true } } });
  const colonyBefore = (await persistentWork(page)).colony;
  const discovery = page.locator('[data-beehive-discovery]'), lab = page.locator('[data-pollination-lab]');
  await discovery.getByRole('radio', { name: 'Pollen reaching a receptive stigma', exact: true }).check();
  await discovery.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  await discovery.getByRole('button', { name: 'Capture observation', exact: true }).click();
  const captured = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.discoveryRecords.pollination.snapshot)));
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).focus();
  await page.keyboard.press('Space');
  await discovery.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(discovery.locator('[data-pollination-comparison]')).toHaveAttribute('data-pollination-comparison', 'one-change');
  const explanation = 'Only stigma contact changed. Pollen and compatibility stayed fixed.\n\nThe saved comparison shows deposition in the schematic.\nIt did not observe fertilization.';
  await discovery.getByRole('textbox', { name: 'My flower-case explanation', exact: true }).fill(explanation);
  await discovery.getByRole('button', { name: 'Save discovery', exact: true }).click();
  await openNotebook(page);
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.notebook.discoveries.pollination)));
  expect(saved.prediction).toBe('Pollen reaching a receptive stigma');
  expect(saved.observation).toBe(captured.summary); expect(saved.evidence).toEqual(captured);
  expect(saved.explanation).toBe(explanation); expect(saved.comparison).toContain('1 selected condition changed');
  const panel = page.locator('[data-discovery-notebook-records]'), card = panel.locator('[data-saved-discovery="pollination"]');
  await expect(panel).toContainText('Changing live controls does not change these saved words.');
  await expectSavedCard(card, 'pollination', saved);
  const frozen = await persistentWork(page), displayed = await card.locator('dd').allTextContents();
  expect(frozen.colony).toEqual(colonyBefore);
  for (const role of ['beekeeper', 'queen', 'drone'] as const) expect(frozen.notebook[role]).toEqual(notebook[role]);
  expect(frozen.notebook.synthesis).toBe(notebook.synthesis);
  const exported = await copyPortfolio(page);
  for (const field of ['prediction', 'observation', 'comparison', 'explanation']) expect(exported).toContain(saved[field]);

  await lab.getByRole('checkbox', { name: 'Loose pollen on bee', exact: true }).uncheck();
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).uncheck();
  for (const grade of ['2nd Grade', '11th Grade']) {
    await page.evaluate(grade => { const w = window as any; w.__ctx.gradeLevel = grade; w.__rerender(); }, grade);
    await expectSavedCard(card, 'pollination', saved);
    expect(await persistentWork(page)).toEqual(frozen);
  }
  for (const role of ['queen', 'drone', 'beekeeper']) {
    await page.locator('[data-notebook-role="' + role + '"]').click();
    await expect(page.locator('[data-beehive-notebook]')).toHaveAttribute('data-beehive-notebook', role);
    await expectSavedCard(card, 'pollination', saved);
    expect(await persistentWork(page)).toEqual(frozen);
  }
  expect(await card.locator('dd').allTextContents()).toEqual(displayed);
  expect(await copyPortfolio(page)).toBe(exported);
  await expect(discovery.getByRole('textbox', { name: 'My flower-case explanation', exact: true })).toHaveValue(explanation);
  expect(await page.evaluate(() => { const p = (window as any).__toolData.beehive.pollinationLab; return { note: p.note, teacher: p.teacher }; }))
    .toEqual({ note: 'Keep flower notes.', teacher: { retained: true } });
  await accessible(page); expect(errors).toEqual([]);
});

test('saved discovery restores all six text-only and partial records literally without regenerating imported evidence', async ({ page }) => {
  const literal = '<img src="missing" onerror="window.__savedTextExecuted=true"><script>window.__savedTextExecuted=true</script> & <strong>my words</strong>';
  const records = {
    stores: { prediction: '  My legacy prediction.\nSecond line.  ', observation: 'A written observation from an earlier run.', explanation: 'My text-only explanation.', capturedAt: 'unknown legacy date' },
    pollination: {
      prediction: 'My imported flower prediction.', observation: literal,
      comparison: 'Imported starting case → compared case.\nKeep these words even when numerical evidence is incomplete.', explanation: 'A learner explanation\nwith another line.',
      evidence: { version: 999, lesson: 'wrong-lesson', summary: 'malformed-evidence-never-render', metrics: [{ id: 'transfer', value: 999 }] },
      comparisonEvidence: { beforeLabel: 'malformed-evidence-never-render', rows: [{ id: 'possible', before: 1, after: 0, delta: 44 }] },
    },
    waggle: { prediction: undefined, observation: null, explanation: '', comparison: '', comparisonEvidence: { unsupported: true } },
    thermo: { prediction: '   \n  ', observation: 'Partial temperature notes only.', comparison: '  \n ', explanation: 'No numerical snapshot was retained.' },
    network: { prediction: 'My allocation prediction.', observation: 'networkword'.repeat(80), explanation: literal, evidence: { retained: 'legacy network payload' } },
    flight: { title: 'Imported title does not replace the lesson heading.', observation: 'Route evidence was not measured in this notebook entry.', explanation: 'Keep my partial flight explanation.', comparison: 'My earlier route comparison.', capturedAt: 'not a timestamp', comparisonEvidence: { rows: null } },
  };
  const notebook = { discoveries: records, beekeeper: { prediction: 'Keep separate colony work.', evidence: 'Keep earlier evidence.' }, synthesis: 'Keep synthesis.', custom: { retained: true } };
  await mount(page, { notebook }); await openNotebook(page);
  const panel = page.locator('[data-discovery-notebook-records]'), frozen = await persistentWork(page);
  await expect(panel.locator('article[data-saved-discovery]')).toHaveCount(6);
  expect(await panel.locator('article[data-saved-discovery]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-saved-discovery'))))
    .toEqual(Object.keys(lessonTitles));
  for (const id of Object.keys(lessonTitles) as (keyof typeof lessonTitles)[]) {
    await expectSavedCard(panel.locator('[data-saved-discovery="' + id + '"]'), id, records[id]);
  }
  await expect(panel.locator('script,img,iframe,a,button,input,textarea,select,details')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__savedTextExecuted)).toBeUndefined();
  expect(await panel.innerText()).not.toContain('malformed-evidence-never-render');
  expect(await panel.locator('[data-saved-discovery="thermo"] [data-saved-text-empty]').count()).toBe(0);
  await expect(panel.locator('[data-saved-discovery="waggle"] [data-saved-text-empty]')).toHaveCount(3);
  const displayed = await panel.locator('dd').allTextContents();
  await page.locator('[data-pollination-lab]').getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check();
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); });
  expect(await panel.locator('dd').allTextContents()).toEqual(displayed);
  expect(await persistentWork(page)).toEqual(frozen);
  const exported = await copyPortfolio(page);
  for (const record of Object.values(records)) for (const field of ['prediction', 'observation', 'comparison', 'explanation']) {
    const saved = (record as any)[field]; if (saved) expect(exported).toContain(saved);
  }
  expect(exported).not.toContain('malformed-evidence-never-render');
  expect(await persistentWork(page)).toEqual(frozen);
  await accessible(page);
});

test('saved discovery cards keep their text and field hierarchy readable at 320, 640 and 980 pixels and in the dark stage', async ({ page }, testInfo) => {
  await mount(page, { notebook: representativeNotebook() }); await openNotebook(page);
  const panel = page.locator('[data-discovery-notebook-records]'), card = panel.locator('[data-saved-discovery="pollination"]');
  const frozen = await rawState(page);
  for (const [width, name] of [[980, 'wide'], [640, 'medium'], [320, 'mobile']] as const) {
    await page.setViewportSize({ width, height: 1800 });
    const layout = await expectLayout(card);
    expect(layout.sameRow).toBe(width === 980);
    await expectPaintedPalette(card); await accessible(page); await preview(page, testInfo, name);
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expectLayout(card); await expectPaintedPalette(card); await accessible(page);
  expect(await rawState(page)).toEqual(frozen);
});

test('saved discovery cards preserve the complete state through mobile stage and overview layouts in dark, light and forced colors', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1800 });
  await mount(page, { notebook: representativeNotebook() }); await openNotebook(page);
  const panel = page.locator('[data-discovery-notebook-records]'), card = panel.locator('[data-saved-discovery="pollination"]');
  const frozen = await rawState(page);
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', 'stage-first');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  // The overview notebook lives outside the discovery shell and needs its own palette.
  await page.evaluate(() => { const w = window as any; w.__toolData.beehive.focusLayout = false; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', 'overview-first');
  await expect(page.locator('[data-beehive-discovery-shell]')).toHaveCount(0);
  await expectPaintedPalette(card); await expectLayout(card); await accessible(page, false);
  await preview(page, testInfo, 'dark');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); });
  await expectPaintedPalette(card); await accessible(page, false);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab'); await page.locator('#beehive-notebook-summary').focus();
  await expect(page.locator('#beehive-notebook-summary')).toBeFocused();
  const colors = await card.evaluate(node => ({
    border: getComputedStyle(node).borderTopStyle, borderWidth: parseFloat(getComputedStyle(node).borderTopWidth),
    ink: getComputedStyle(node.querySelector('dd')!).color,
    paper: getComputedStyle(node.querySelector('[data-saved-discovery-field="observation"]')!).backgroundColor,
  }));
  expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0); expect(colors.ink).not.toBe(colors.paper);
  await expect(card.getByText('Saved copy', { exact: true })).toBeVisible();
  await expectLayout(card); await expectPaintedPalette(card); await accessible(page, false); await preview(page, testInfo, 'forced-colors');
  await page.evaluate(() => { const w = window as any; w.__toolData.beehive.focusLayout = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', 'stage-first');
  expect(await rawState(page)).toEqual(frozen);
});

test('saved discovery cards respond to their own panel width and wrap doubled text inside a narrow desktop card', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1800 });
  const storedNotebook = representativeNotebook();
  storedNotebook.discoveries.pollination.explanation += '\nMy imported word: ' + 'pollen'.repeat(24);
  await mount(page, { notebook: storedNotebook }); await openNotebook(page);
  const notebook = page.locator('[data-beehive-notebook]'), card = notebook.locator('[data-saved-discovery="pollination"]');
  const frozen = await rawState(page);
  await notebook.evaluate(node => Object.assign((node as HTMLElement).style, { width: '420px', maxWidth: '100%' }));
  expect((await expectLayout(card)).sameRow).toBe(false);
  await accessible(page, false);
  await notebook.evaluate(node => Object.assign((node as HTMLElement).style, { width: '760px', maxWidth: '100%' }));
  expect((await expectLayout(card)).sameRow).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  // This panel would pass a fixed 576px breakpoint; 36rem follows the student's enlarged text instead.
  expect((await expectLayout(card)).sameRow).toBe(false);
  await card.evaluate(node => Object.assign((node as HTMLElement).style, { width: '260px', maxWidth: '100%', boxSizing: 'border-box' }));
  expect((await card.boundingBox())!.width).toBeCloseTo(260, 0);
  expect((await expectLayout(card)).sameRow).toBe(false);
  for (const body of await card.locator('dd').all()) {
    expect(await body.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeCloseTo(30, 1);
  }
  await accessible(page, false); await preview(page, testInfo, 'large-text', card);
  expect(await rawState(page)).toEqual(frozen);
});
