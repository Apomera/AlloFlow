import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js',
  toolId: 'ecosystem',
  width: 1100,
  height: 900,
  appStyles: true,
});
const reportDir = 'reports/ecosystem-investigations';
const predictionReason = 'Removing foxes can change herbivores, which can change grazing on plants.';
const explanation = 'The paired samples show an indirect plant response after the predator disturbance.';
const limitation = 'This model does not include seasonal changes or immigration.';

test.describe.configure({ mode: 'serial', timeout: 150_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'uncaught browser errors').toEqual([]);
});

async function mountFoodWeb(page: Page) {
  await page.setViewportSize({ width: 1140, height: 1000 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  await expect(page.locator('[data-efw-investigations]')).toBeVisible();
}

async function selectCase(page: Page, id: string, forecast = 'higher') {
  await page.locator(`[data-efw-start="${id}"]`).click();
  await expect(page.getByRole('button', { name: 'Run investigation', exact: true })).toBeDisabled();
  await page.getByLabel('Investigation prediction', { exact: true }).selectOption(forecast);
  await expect(page.getByRole('button', { name: 'Run investigation', exact: true })).toBeEnabled();
}

async function runCase(page: Page, id = 'cascade', forecast = 'higher') {
  await selectCase(page, id, forecast);
  const reasons: Record<string, string> = {
    cascade: predictionReason,
    refuge: 'More shelter may change how much herbivore biomass predators can reach.',
    insects: 'With fewer caterpillars, blue tits may have less food and lower biomass later.',
    soil: 'Fewer decomposers may change nutrient recycling and plant growth.',
  };
  await page.getByLabel('Investigation prediction reason', { exact: true }).fill(reasons[id]);
  await page.getByRole('button', { name: 'Run investigation', exact: true }).click();
  await expect(page.locator('[data-efw-investigation-evidence]')).toBeVisible();
}

async function expectedEvidence(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any;
    const api = w.StemLab.ecosystemFoodWeb;
    const config = w.__toolData.ecosystem.foodWeb.run.config;
    const pair = api.compare(config);
    const evidence = api.investigationEvidence(id, pair, config).map((row: any) => ({
      ...row,
      formatted: [api.format(row.baseline), api.format(row.experiment)],
    }));
    return { config, evidence, pair, focus: api.investigation(id).focus };
  }, id);
}

test('prediction, checkpoints, notebook export and reopening retain the original paired evidence', async ({ page }) => {
  await mountFoodWeb(page);
  const studio = page.locator('[data-efw-investigations]');
  const evidence = page.locator('[data-efw-investigation-evidence]');
  const notebook = page.locator('[data-efw-notebook]');
  await expect(studio.locator('[data-efw-start]')).toHaveCount(4);
  await runCase(page);
  const expected = await expectedEvidence(page, 'cascade');
  const steps = [expected.config.eventStep - 1, expected.config.eventStep, 240];
  expect(expected.evidence.map((row: any) => row.id)).toEqual(['before', 'event', 'after']);
  expect(expected.evidence.map((row: any) => row.step)).toEqual(steps);
  await expect(evidence.locator('[data-efw-checkpoint]')).toHaveCount(3);

  // Each checkpoint controls the same data cursor as the comparison and habitat.
  for (const [index, checkpoint] of ['before', 'event', 'after'].entries()) {
    const button = evidence.locator(`[data-efw-checkpoint="${checkpoint}"]`);
    await button.focus();
    await button.press('Enter');
    await expect(page.getByLabel('Food-web comparison time', { exact: true })).toHaveValue(String(steps[index]));
    await expect(page.getByLabel('Chart group', { exact: true })).toHaveValue(expected.focus);
    const state = await page.evaluate(() => {
      const state = (window as any).__toolData.ecosystem.foodWeb;
      return { cursor: state.cursor, focus: state.focus };
    });
    expect(state).toEqual({ cursor: steps[index], focus: expected.focus });
    await expect(button.locator('b')).toHaveText(expected.evidence[index].formatted);
  }

  // Inspecting a checkpoint must stop a running meadow, including a click that
  // selects the already-current sample. Cursor equality alone cannot do that.
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  await expect(meadow.locator('canvas')).toBeVisible();
  await evidence.locator('[data-efw-checkpoint="before"]').click();
  await meadow.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
  await evidence.locator('[data-efw-checkpoint="event"]').click();
  const inspected = await page.evaluate(() => {
    const state = (window as any).__toolData.ecosystem.foodWeb;
    return { cursor: state.cursor, version: state.inspectionVersion };
  });
  expect(inspected.cursor).toBe(expected.config.eventStep);
  await expect(meadow.getByRole('button', { name: 'Play meadow timeline', exact: true })).toBeVisible();
  await evidence.locator('[data-efw-checkpoint="event"]').click();
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.inspectionVersion)).toBeGreaterThan(inspected.version);
  await page.waitForTimeout(350);
  await expect(meadow.getByLabel('Meadow timeline', { exact: true })).toHaveValue(String(expected.config.eventStep));
  await page.getByRole('button', { name: 'Hide 3D meadow', exact: true }).click();

  await page.getByRole('button', { name: 'Compare my prediction', exact: true }).click();
  await expect(page.locator('[data-efw-prediction-feedback]')).toBeVisible();
  await expect(page.locator('[data-efw-prediction-feedback]')).not.toContainText(/score|points awarded|graded/i);
  await page.getByLabel('Investigation explanation', { exact: true }).fill(explanation);
  await page.getByLabel('Investigation model limit', { exact: true }).fill(limitation);
  await page.getByRole('button', { name: 'Save investigation evidence', exact: true }).click();
  await expect(notebook).toContainText('3 of 12 observations saved');
  const saved = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook);
  expect(saved).toHaveLength(3);
  expect(saved.map((note: any) => note.step)).toEqual(steps);
  for (const note of saved) {
    expect(note.config).toEqual(expected.config);
    expect(note.focus).toBe(expected.focus);
    expect(note.baseline).toEqual(expected.pair.baseline[note.step]);
    expect(note.experiment).toEqual(expected.pair.experiment[note.step]);
    expect(note.prediction).toContain(predictionReason);
    expect(note.explanation).toBe(explanation);
    expect(note.investigation).toEqual({ id: 'cascade', forecast: 'higher', limitation });
  }

  await page.getByRole('tab', { name: /Quiz/ }).click();
  await page.getByRole('tab', { name: /Food web/ }).click();
  await expect(page.getByLabel('Investigation explanation', { exact: true })).toHaveValue(explanation);
  await expect(page.getByLabel('Investigation model limit', { exact: true })).toHaveValue(limitation);
  await expect(notebook.locator('[data-efw-note]')).toHaveCount(3);
  const downloadEvent = page.waitForEvent('download');
  await notebook.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const exportPath = `${reportDir}/field-notebook.txt`;
  await (await downloadEvent).saveAs(exportPath);
  const exported = fs.readFileSync(exportPath, 'utf8');
  for (const text of ['OBSERVATION 1', 'OBSERVATION 2', 'OBSERVATION 3', 'Investigation:', predictionReason, explanation, limitation]) expect(exported).toContain(text);

  await selectCase(page, 'refuge', 'unsure');
  await expect(evidence).toHaveCount(0);
  await notebook.getByRole('button', { name: 'Reopen observation 2', exact: true }).click();
  await expect(studio).toContainText('Your recorded prediction: Higher than baseline at time 24.');
  await expect(page.getByLabel('Investigation explanation', { exact: true })).toHaveValue(explanation);
  await expect(page.getByLabel('Investigation model limit', { exact: true })).toHaveValue(limitation);
  await expect(page.getByLabel('Food-web comparison time', { exact: true })).toHaveValue(String(expected.config.eventStep));
  await expect(page.getByLabel('Chart group', { exact: true })).toHaveValue(expected.focus);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook)).toEqual(saved);
});

test('changing cases or the setup clears stale progress, while free exploration keeps the chosen setup', async ({ page }) => {
  await mountFoodWeb(page);
  const evidence = page.locator('[data-efw-investigation-evidence]');
  await runCase(page);
  await page.getByRole('button', { name: 'Compare my prediction', exact: true }).click();
  await page.getByLabel('Investigation explanation', { exact: true }).fill(explanation);
  await page.getByLabel('Investigation model limit', { exact: true }).fill(limitation);
  await page.getByRole('button', { name: 'Save investigation evidence', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook);

  for (const id of ['refuge', 'insects', 'soil']) {
    await page.locator(`[data-efw-start="${id}"]`).click();
    await expect(evidence).toHaveCount(0);
    await expect(page.locator('[data-efw-prediction-feedback]')).toHaveCount(0);
    await expect(page.locator('[data-efw-results]')).toHaveCount(0);
    await expect(page.getByLabel('Investigation prediction', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Investigation prediction reason', { exact: true })).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Run investigation', exact: true })).toBeDisabled();
    await page.getByLabel('Investigation prediction', { exact: true }).selectOption('unsure');
    await page.getByRole('button', { name: 'Run investigation', exact: true }).click();
    await expect(evidence.locator('[data-efw-checkpoint]')).toHaveCount(3);
    await expect(page.getByLabel('Investigation explanation', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Investigation model limit', { exact: true })).toHaveValue('');
    await page.getByRole('button', { name: 'Compare my prediction', exact: true }).click();
    await expect(page.locator('[data-efw-prediction-feedback]')).toBeVisible();
  }
  await expect(page.getByLabel('Enable soil nutrient cycle', { exact: true })).toBeChecked();

  const configBeforeLeaving = await page.evaluate(() => {
    const w = window as any;
    return w.StemLab.ecosystemFoodWeb.normalize(w.__toolData.ecosystem.foodWeb);
  });
  await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  await expect(evidence).toHaveCount(0);
  await expect(page.getByLabel('Investigation prediction', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.StemLab.ecosystemFoodWeb.normalize(w.__toolData.ecosystem.foodWeb);
  })).toEqual(configBeforeLeaving);

  await runCase(page, 'refuge', 'same');
  await page.getByLabel('Starting refuge cover', { exact: true }).fill('80');
  await expect(page.locator('[data-efw-investigations]')).toContainText('The setup has changed.');
  await expect(evidence).toHaveCount(0);
  await expect(page.locator('[data-efw-results]')).toHaveCount(0);
  await expect(page.getByLabel('Investigation prediction', { exact: true })).toHaveCount(0);
  // Cover restoration at the cap is a no-op custom experiment, not evidence from
  // the guided refuge case. The ordinary run must honestly show matching runs.
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  expect(await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    const pair = api.compare(w.__toolData.ecosystem.foodWeb.run.config);
    return JSON.stringify(pair.baseline) === JSON.stringify(pair.experiment);
  })).toBe(true);
  await expect(evidence).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook)).toEqual(saved);
});

test('investigation cards and evidence remain usable on narrow screens and every theme', async ({ page }) => {
  await mountFoodWeb(page);
  const studio = page.locator('[data-efw-investigations]');
  await runCase(page, 'insects', 'lower');
  const expected = await expectedEvidence(page, 'insects');
  for (const row of expected.evidence) {
    const checkpoint = studio.locator(`[data-efw-checkpoint="${row.id}"]`);
    const valuesInName = `Baseline ${row.formatted[0]}, experiment ${row.formatted[1]}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(checkpoint).toHaveAccessibleName(new RegExp(valuesInName));
    await expect(checkpoint.locator('[data-branch="baseline"] i')).toHaveCSS('border-top-style', 'dashed');
    await expect(checkpoint.locator('[data-branch="baseline"] i')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(checkpoint.locator('[data-branch="experiment"] i')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  for (const checkpoint of ['before', 'event', 'after']) await studio.locator(`[data-efw-checkpoint="${checkpoint}"]`).click();
  await expect(studio.getByRole('list', { name: 'Investigation progress', exact: true })).toContainText('3/3 moments inspected');
  await page.getByRole('button', { name: 'Compare my prediction', exact: true }).click();
  await studio.getByText('Trace a possible mechanism', { exact: true }).click();
  await expect(studio.locator('.efw-pathway li')).toHaveCount(3);
  await page.getByLabel('Investigation explanation', { exact: true }).fill('I can compare the bird response with the caterpillar disturbance at each checkpoint.');
  await studio.screenshot({ path: `${reportDir}/desktop.png` });

  for (const theme of ['dark', 'contrast']) {
    await page.evaluate(theme => {
      document.body.className = 'theme-' + theme + (theme === 'dark' ? ' dark' : '');
      const w = window as any;
      w.__ctx.theme = theme;
      w.__ctx.isDark = theme === 'dark';
      w.__ctx.isContrast = theme === 'contrast';
      w.__rerender();
    }, theme);
    const ratios = await studio.evaluate(el => {
      const css = getComputedStyle(el);
      const luminance = (color: string) => {
        let hex = color.trim().replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const channels = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map(n => n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4));
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const background = luminance(css.getPropertyValue('--fw-panel'));
      return ['--fw-ink', '--fw-muted', '--fw-accent'].map(key => {
        const foreground = luminance(css.getPropertyValue(key));
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
    });
    expect(Math.min(...ratios), `${theme} investigation palette contrast`).toBeGreaterThanOrEqual(4.5);
    await studio.screenshot({ path: `${reportDir}/${theme}.png` });
  }

  await page.evaluate(() => {
    document.body.className = 'theme-default';
    const w = window as any;
    w.__ctx.theme = 'default'; w.__ctx.isDark = false; w.__ctx.isContrast = false;
    w.__rerender();
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(studio.locator('[data-efw-checkpoint]')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px document has no horizontal overflow`).toBe(true);
    await studio.screenshot({ path: `${reportDir}/${width === 390 ? 'mobile' : 'mobile-320'}.png` });
    await studio.locator('[data-efw-checkpoint="event"]').click();
    await expect(page.getByLabel('Food-web comparison time', { exact: true })).toHaveValue('80');
  }
});
