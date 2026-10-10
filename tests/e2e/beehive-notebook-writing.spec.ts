import { test, expect, Page, TestInfo } from '@playwright/test';
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

const fields = ['prediction', 'evidence', 'explanation'] as const;
const roles = ['beekeeper', 'queen', 'drone'] as const;
const labels = { prediction: '1. Predict', evidence: '2. Observe (evidence)', explanation: '3. Explain' };
const drafts = {
  prediction: 'I predict the food reading may decrease.\nI will compare the same colony on two days.',
  evidence: 'Day 12: food 300, workers 33333.\n\nMy note: <strong>these are model readings</strong> & not a field measurement.',
  explanation: 'A possible explanation is that workers used stored food.\nI am still deciding: these readings alone cannot isolate a cause.',
};

function seededNotebook() {
  return {
    beekeeper: { prediction: '', evidence: 'Earlier colony evidence.', explanation: 'Earlier colony explanation.',
      review: { prediction: false, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network readings.', explanation: 'Keep my network explanation.',
      review: { prediction: true, evidence: false, explanation: true } },
    drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight readings.', explanation: 'Keep my flight explanation.',
      review: { prediction: false, evidence: true, explanation: false } },
    synthesis: 'Keep my cross-role synthesis.\nIt is my own writing.',
    discoveries: { pollination: { prediction: 'Saved flower prediction.', observation: 'Saved stigma contact observation.',
      comparison: 'Only contact changed between the saved cases.', explanation: 'Keep this saved discovery explanation.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page, complete = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  const notebook = seededNotebook();
  if (complete) Object.assign(notebook.beekeeper, drafts);
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({
      beehive: { ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
        discoveryLesson: 'pollination', tutorialDone: true, soundOn: false, motionPaused: true,
        autoAdvance: false, focusLayout: true, day: 12, notebookOpen: false, notebook },
      otherTool: { retained: true, note: 'Another tool keeps its work.' },
    }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    const copy = async (text: string) => { w.__copiedPortfolio = text; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, notebook);
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
  await page.locator('#beehive-notebook-summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-beehive-notebook]')).toHaveAttribute('open', '');
}

async function persistentWork(page: Page) {
  return page.evaluate(() => {
    const w = window as any, state = w.__toolData.beehive;
    const colony: Record<string, unknown> = {};
    for (const key of ['day', 'honey', 'pollen', 'workers', 'brood', 'varroaLevel', 'morale',
      'simulationSeed', 'experimentRunSerial', 'managementTrail', 'thermoParams', 'waggleLab']) colony[key] = state[key];
    return JSON.parse(JSON.stringify({ notebook: state.notebook, records: state.discoveryRecords, colony, otherTool: w.__toolData.otherTool }));
  });
}

async function copyPortfolio(page: Page) {
  await page.evaluate(() => { (window as any).__copiedPortfolio = ''; });
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedPortfolio || '')).not.toBe('');
  return page.evaluate(() => (window as any).__copiedPortfolio as string);
}

function literalPattern(text: string) { return new RegExp(text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); }

async function expectWritingSemantics(page: Page, role: string) {
  const notebook = page.locator('[data-beehive-notebook="' + role + '"]');
  await expect(notebook).toBeVisible();
  for (const field of fields) {
    const card = notebook.locator('[data-notebook-writing-card="' + field + '"]');
    const input = notebook.getByRole('textbox', { name: labels[field], exact: true });
    const prefix = 'beehive-notebook-' + role + '-' + field;
    await expect(input).toHaveAttribute('aria-labelledby', prefix + '-label');
    await expect(input).toHaveAttribute('aria-describedby', prefix + '-prompt');
    const guide = card.locator('strong[data-notebook-writing-guide="' + field + '"]');
    const rolePrompt = card.locator('span[data-notebook-role-prompt="' + field + '"]');
    await expect(guide).toBeVisible(); await expect(rolePrompt).toBeVisible();
    await expect(input).toHaveAccessibleDescription(literalPattern((await guide.textContent())!));
    await expect(input).toHaveAccessibleDescription(literalPattern((await rolePrompt.textContent())!));
    if ((await input.inputValue()).trim()) await expect(card.locator('[data-notebook-written="' + field + '"]')).toHaveText('Written');
    else await expect(card.locator('[data-notebook-written]')).toHaveCount(0);
    await expect(card.locator('[role="img"]')).toHaveCount(0);
  }
  const explanation = notebook.locator('#beehive-notebook-' + role + '-explanation-prompt');
  await expect(explanation).not.toContainText(/caused (?:the )?(?:outcome|change)/i);
  await expect(explanation).toContainText(/\b(?:may|could|possible|propose)\b/i);
  await expect(notebook.locator('[data-beehive-review-criterion="explanation"]')).toContainText('Supported explanation');
  await expect(notebook.locator('[data-beehive-cer-review]')).toContainText('does not grade your ideas');
}

async function expectReadableLayout(page: Page, columns: number, checkPageOverflow = true) {
  const result = await page.locator('[data-beehive-notebook]').evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const grids = Array.from(node.querySelectorAll('[data-notebook-fields],[data-notebook-review-grid],[data-notebook-role-grid]'));
    const cards = Array.from(node.querySelectorAll('[data-notebook-writing-card]'));
    const targets = [...grids, ...cards, ...Array.from(node.querySelectorAll('[data-beehive-cer-review],[data-beehive-review-criterion],[data-notebook-role],textarea[data-notebook-field],[id$="-prompt"]'))];
    return {
      columns: grids.map(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
      fonts: cards.map(card => ({
        label: parseFloat(getComputedStyle(card.querySelector('[id$="-label"]')!).fontSize),
        prompt: parseFloat(getComputedStyle(card.querySelector('[id$="-prompt"]')!).fontSize),
        input: parseFloat(getComputedStyle(card.querySelector('textarea')!).fontSize),
      })),
      rootFont,
      textareaTops: cards.map(card => card.querySelector('textarea')!.getBoundingClientRect().top),
      overflowing: targets.filter(target => target.scrollWidth - target.clientWidth > 1).map(target => ({
        tag: target.tagName, id: target.id, field: target.getAttribute('data-notebook-writing-card'), overflow: target.scrollWidth - target.clientWidth,
      })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.columns).toEqual([columns, columns, columns]);
  expect(result.overflowing).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const font of result.fonts) {
    expect(font.label).toBeGreaterThanOrEqual(result.rootFont * .9375);
    expect(font.prompt).toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(font.input).toBeGreaterThanOrEqual(result.rootFont * .9375);
    expect(font.label).toBeGreaterThan(font.prompt);
  }
  if (columns === 3) expect(Math.max(...result.textareaTops) - Math.min(...result.textareaTops)).toBeLessThanOrEqual(1);
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run({ include: [['[data-notebook-fields]'], ['[data-beehive-cer-review]']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await page.locator('[data-notebook-fields]').screenshot({ path: testInfo.outputPath('writing-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('notebook writing keeps concise keyboard labels, learner-controlled review and saved drafts across grades and roles', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const before = await persistentWork(page), notebook = page.locator('[data-beehive-notebook]');
  await expectWritingSemantics(page, 'beekeeper');
  const prediction = notebook.getByRole('textbox', { name: labels.prediction, exact: true });
  const evidence = notebook.getByRole('textbox', { name: labels.evidence, exact: true });
  const explanation = notebook.getByRole('textbox', { name: labels.explanation, exact: true });
  await expect(notebook.locator('[data-notebook-review="prediction"]')).toBeDisabled();
  await prediction.focus(); await page.keyboard.insertText(drafts.prediction);
  await page.keyboard.press('Tab'); await expect(evidence).toBeFocused();
  await page.keyboard.press('Tab'); await expect(explanation).toBeFocused();
  const predictionReview = notebook.locator('[data-notebook-review="prediction"]');
  await expect(predictionReview).toBeEnabled(); await expect(predictionReview).not.toBeChecked();
  await predictionReview.focus(); await page.keyboard.press('Space'); await expect(predictionReview).toBeChecked();
  await evidence.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.insertText(drafts.evidence);
  await expect(notebook.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(predictionReview).toBeChecked();
  await expect(notebook.locator('[data-notebook-review="explanation"]')).toBeChecked();
  await notebook.locator('[data-notebook-review="evidence"]').focus(); await page.keyboard.press('Space');
  await expect(notebook.locator('[data-beehive-cer-review]')).toHaveAttribute('data-review-complete', 'true');
  await explanation.fill(drafts.explanation);
  await expect(notebook.locator('[data-notebook-review="explanation"]')).not.toBeChecked();
  await expect(notebook.locator('[data-beehive-cer-review]')).toHaveAttribute('data-review-complete', 'false');
  await expect(notebook.locator('[data-beehive-cer-review] [role="progressbar"]')).toHaveAttribute('aria-valuenow', '2');
  await expect(notebook.locator('[data-notebook-written]')).toHaveCount(3);
  await expectWritingSemantics(page, 'beekeeper');
  const explanationReview = notebook.locator('[data-notebook-review="explanation"]');
  await explanationReview.focus(); await page.keyboard.press('Space');
  await expect(explanationReview).toBeChecked();
  await expect(page.locator('#allo-live-beehive')).toContainText('Supported explanation marked ready.');
  await page.keyboard.press('Space');
  await expect(explanationReview).not.toBeChecked();
  await expect(page.locator('#allo-live-beehive')).toContainText('Supported explanation marked for revision.');

  const frozen = await persistentWork(page);
  expect(frozen).toEqual({ ...before, notebook: { ...before.notebook, beekeeper: {
    ...before.notebook.beekeeper, ...drafts, review: { prediction: true, evidence: true, explanation: false },
  } } });
  const exported = await copyPortfolio(page);
  for (const draft of Object.values(drafts)) expect(exported).toContain(draft);
  expect(exported).toContain(frozen.notebook.discoveries.pollination.explanation);
  expect(exported).toContain(frozen.notebook.synthesis);
  const gradeGuides = new Set<string>(), rolePrompts = new Set<string>();
  for (const grade of ['2nd Grade', '4th Grade', '7th Grade', '11th Grade']) {
    await page.evaluate(grade => { const w = window as any; w.__ctx.gradeLevel = grade; w.__rerender(); }, grade);
    for (const role of roles) {
      await notebook.locator('[data-notebook-role="' + role + '"]').click();
      await expectWritingSemantics(page, role);
      for (const field of fields) {
        await expect(notebook.getByRole('textbox', { name: labels[field], exact: true })).toHaveValue(frozen.notebook[role][field]);
        await expect(notebook.locator('[data-notebook-review="' + field + '"]')).toBeChecked({ checked: frozen.notebook[role].review[field] });
      }
      gradeGuides.add((await notebook.locator('[data-notebook-writing-guide="explanation"]').textContent())!);
      rolePrompts.add((await notebook.locator('[data-notebook-role-prompt="explanation"]').textContent())!);
      if (grade === '7th Grade' || grade === '11th Grade') {
        await expect(notebook.locator('[data-notebook-writing-guide="explanation"]')).toContainText(/limit|missing comparison/i);
      }
      expect(await persistentWork(page)).toEqual(frozen);
    }
  }
  expect(gradeGuides.size).toBe(4); expect(rolePrompts.size).toBe(3);
  expect(await copyPortfolio(page)).toBe(exported);
  expect(errors).toEqual([]);
});

test('notebook writing and review stay readable at mobile widths, in both themes, forced colors and doubled text', async ({ page }, testInfo) => {
  await mount(page, true);
  const frozen = await persistentWork(page), notebook = page.locator('[data-beehive-notebook]');
  for (const [width, name, columns] of [[980, 'wide', 3], [320, 'mobile', 1]] as const) {
    await page.setViewportSize({ width, height: 1800 });
    await expectReadableLayout(page, columns); await accessible(page); await preview(page, testInfo, name);
    if (width === 980) {
      await notebook.locator('[data-notebook-review="prediction"]').check();
      await expect(notebook.locator('[data-beehive-cer-review]')).toHaveAttribute('data-review-complete', 'true');
      await accessible(page);
      await notebook.locator('[data-notebook-review="prediction"]').uncheck();
    }
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await expectReadableLayout(page, 1); await accessible(page); await preview(page, testInfo, 'dark');
  await notebook.locator('[data-notebook-review="prediction"]').check();
  await expect(notebook.locator('[data-beehive-cer-review]')).toHaveAttribute('data-review-complete', 'true');
  await accessible(page);
  await notebook.locator('[data-notebook-review="prediction"]').uncheck();
  await page.emulateMedia({ forcedColors: 'active' });
  await notebook.getByRole('textbox', { name: labels.prediction, exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(notebook.getByRole('textbox', { name: labels.evidence, exact: true })).toBeFocused();
  const colors = await notebook.locator('[data-notebook-field="evidence"]').evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth) };
  });
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  await expectReadableLayout(page, 1); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  for (const width of [420, 900]) {
    await notebook.evaluate((node, width) => Object.assign((node as HTMLElement).style, { width: width + 'px', maxWidth: '100%' }), width);
    // A fixed pixel breakpoint would create three cramped columns in the 900px panel.
    await expectReadableLayout(page, 1, false); await accessible(page);
  }
  await preview(page, testInfo, 'large-text');
  expect(await persistentWork(page)).toEqual(frozen);
});
