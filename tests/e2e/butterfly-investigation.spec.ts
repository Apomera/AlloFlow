import {test, expect, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const shots = 'scratch/butterfly-investigation';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_butterfly.js', toolId: 'butterfly',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1280, height: 1000,
});

test.describe.configure({timeout: 180000, retries: 0});
test.use({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce'});
test.beforeAll(async () => { mkdirSync(shots, {recursive: true}); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));

async function mount(page: Page, saved: Record<string, unknown> = {}, fallback = true) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({saved, fallback}) => {
    const w = window as any;
    if (fallback) w.StemLab.ensureThree = () => Promise.reject(new Error('Test map fallback'));
    w.__mount({butterfly: saved});
    Object.assign(document.getElementById('wrap')!.style, {width: '100%', height: 'auto', display: 'block'});
  }, {saved, fallback});
  await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer', fallback ? 'map' : 'three');
}

async function audit(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-butterfly-root]'), {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']},
    });
    return result.violations.map((v: any) => ({id: v.id, nodes: v.nodes.map((n: any) => ({target: n.target, summary: n.failureSummary}))}));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

const comparedGenerations = {
  observations: ['milkweed', 'bergamot', 'lawn'],
  lifecycle: {broods: [
    {patch: 'milkweed', prediction: 'complete', result: 'complete'},
    {patch: 'bergamot', prediction: 'complete', result: 'stalls'},
  ]},
};

test('the guide follows recorded investigations and moves keyboard focus without adding evidence', async ({page}) => {
  await mount(page, comparedGenerations, false);
  const guide = page.getByRole('navigation', {name: 'Investigation guide'});
  await expect(guide.locator('[data-bf-step="explore"]')).toHaveAttribute('data-complete', 'true');
  await expect(guide.locator('[data-bf-step="cycle"]')).toHaveAttribute('data-complete', 'true');
  await expect(guide.locator('[data-bf-step="design"]')).toHaveAttribute('aria-current', 'step');
  await expect(guide.getByRole('button', {name: 'Continue: Redesign', exact: true})).toBeVisible();
  await guide.screenshot({path: shots + '/guide-desktop.png'});

  await page.getByRole('button', {name: 'Take flight', exact: true}).click();
  await guide.getByRole('button', {name: 'Continue: Redesign', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Habitat design activity'})).toBeFocused();
  await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused', 'true');
  await expect(page.locator('.bf-comparison caption')).toContainText('0 of 3 examined');
  await guide.locator('[data-bf-step="notebook"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.bf-notebook')).toBeFocused();
  await expect(page.locator('.bf-notebook [type="checkbox"]:checked')).toHaveCount(0);
  await page.locator('.bf-notebook').getByRole('button', {name: 'Back to investigation guide', exact: true}).click();
  await expect(guide).toBeFocused();
  await audit(page);
});

test('a learner can cite records, keep an explanation after reopening, and copy it with the field report', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, comparedGenerations);
  const notebook = page.getByRole('region', {name: 'Investigation notebook'});
  const question = page.getByRole('region', {name: 'Habitat evidence question'});
  const explanation = 'The milkweed generation reached adulthood, but the bergamot generation stopped. Both had nectar, so the difference was the caterpillar food.';
  const nextQuestion = 'Would changing the mowing date interrupt the same milkweed generation?';

  await question.getByRole('button', {name: 'Monarchs need nectar for adults and milkweed for caterpillars', exact: true}).click();
  await expect(notebook.locator('#bf-notebook-claim')).toHaveValue('needs-both');
  await notebook.locator('#bf-notebook-interpretation').selectOption('supports');
  await notebook.locator('[data-bf-citation="brood:milkweed"]').check();
  await notebook.locator('[data-bf-citation="brood:bergamot"]').check();
  await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready', 'false');
  await notebook.locator('#bf-notebook-reasoning').fill(explanation);
  await notebook.locator('#bf-notebook-question').fill(nextQuestion);
  await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready', 'true');
  await expect(page.locator('[data-bf-step="notebook"]')).toHaveAttribute('data-complete', 'true');
  await notebook.screenshot({path: shots + '/notebook-desktop.png'});

  const saved = await page.evaluate(() => (window as any).__toolData.butterfly);
  expect(saved.version).toBe(5);
  expect(saved.notebook).toEqual({claim: 'needs-both', interpretation: 'supports', evidence: ['brood:milkweed', 'brood:bergamot'], reasoning: explanation, question: nextQuestion});
  await mount(page, saved);
  await expect(notebook.locator('#bf-notebook-reasoning')).toHaveValue(explanation);
  await expect(notebook.locator('#bf-notebook-question')).toHaveValue(nextQuestion);
  await expect(notebook.locator('[type="checkbox"]:checked')).toHaveCount(2);
  await expect(question.getByRole('button', {name: 'Monarchs need nectar for adults and milkweed for caterpillars', exact: true})).toHaveAttribute('aria-pressed', 'true');

  await notebook.getByRole('button', {name: 'Review my field report', exact: true}).click();
  const report = page.getByRole('region', {name: 'Field report', exact: true});
  await expect(report).toBeFocused();
  await expect(report.locator('[data-bf-report]')).toContainText(explanation);
  await expect(report.locator('[data-bf-report]')).toContainText(nextQuestion);
  await page.evaluate(() => { (window as any).alloCopyText = (text: string) => { (window as any).__copiedReport = text; return true; }; });
  await report.getByRole('button', {name: 'Copy my field report', exact: true}).click();
  await expect(report).toHaveAttribute('data-bf-report-copied', 'ok');
  const copied = await page.evaluate(() => (window as any).__copiedReport);
  expect(copied).toContain(explanation);
  expect(copied).toContain(nextQuestion);
  expect(copied).toContain('Common milkweed: the generation you followed reached the adult stage.');
  expect(copied).toContain('Wild bergamot: the generation you followed stopped before becoming an adult.');
  await report.getByRole('button', {name: 'Back to investigation guide', exact: true}).click();
  await expect(page.getByRole('navigation', {name: 'Investigation guide'})).toBeFocused();
  await audit(page);
  expect(errors).toEqual([]);
});

test('mobile notebooks flag replaced-planting citations and retain writing across accessible themes', async ({page}) => {
  await page.setViewportSize({width: 375, height: 900});
  await mount(page, {
    ...comparedGenerations,
    restoration: {design: 'mixed', trials: [{design: 'mixed', prediction: 'both'}, {design: 'flowers', prediction: 'nectar'}]},
    season: {runs: [
      {patch: 'milkweed', mowing: 'never', prediction: 'complete', result: 'complete'},
      {patch: 'milkweed', mowing: 'early', prediction: 'complete', result: 'stop'},
    ]},
    notebook: {claim: 'needs-both', interpretation: 'supports', evidence: ['patch:restoration:mixed', 'brood:milkweed'], reasoning: 'The mixed planting has milkweed leaves and nectar. My milkweed generation reached the adult stage.', question: 'What happens if I mow earlier?'},
  });
  const guide = page.getByRole('navigation', {name: 'Investigation guide'});
  const notebook = page.getByRole('region', {name: 'Investigation notebook'});
  await expect(guide.locator('[data-complete="true"]')).toHaveCount(5);
  await expect(guide.getByRole('button', {name: 'Review field report', exact: true})).toBeVisible();
  await guide.screenshot({path: shots + '/guide-mobile.png'});
  await notebook.screenshot({path: shots + '/notebook-mobile.png'});
  await audit(page);

  const design = page.getByRole('region', {name: 'Habitat design activity'});
  await design.getByRole('button', {name: /^Plant wild bergamot/}).click();
  await design.getByRole('combobox').selectOption('nectar');
  await design.getByRole('button', {name: 'Apply habitat plan', exact: true}).click();
  await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready', 'false');
  await expect(guide.locator('[data-bf-step="notebook"]')).toHaveAttribute('aria-current', 'step');
  await expect(notebook.locator('.bf-notebook-review')).toContainText('1 cited record(s) no longer describe the current planting');
  await notebook.screenshot({path: shots + '/notebook-mobile-replanted.png'});
  await notebook.getByRole('button', {name: 'Remove unavailable citations', exact: true}).click();
  await expect(notebook.locator('.bf-notebook-review')).toHaveCount(0);
  await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready', 'false');
  await notebook.locator('[data-bf-citation="brood:bergamot"]').check();
  await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready', 'true');
  await expect(notebook.locator('#bf-notebook-reasoning')).toHaveValue(/The mixed planting has milkweed leaves/);
  expect(await page.evaluate(() => (window as any).__toolData.butterfly.notebook.evidence)).toEqual(['brood:milkweed', 'brood:bergamot']);

  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await notebook.screenshot({path: shots + '/notebook-mobile-dark.png'});
  await audit(page);
  await page.evaluate(() => { const w = window as any; w.__ctx.isContrast = true; w.__rerender(); });
  await notebook.screenshot({path: shots + '/notebook-mobile-contrast.png'});
  await audit(page);
  await page.emulateMedia({forcedColors: 'active'});
  await audit(page);
});
