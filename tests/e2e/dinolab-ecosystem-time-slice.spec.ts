import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// This is a DOM investigation. No WebGL context is needed or expected.
const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-enhancement';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab',
  width: 1180, height: 920, appStyles: true, layout: 'document',
});
const pageErrors = new WeakMap<Page, string[]>();
test.setTimeout(180000);

test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.addInitScript(() => {
    (window as any).__unhandledRejections = [];
    window.addEventListener('unhandledrejection', event => {
      (window as any).__unhandledRejections.push(String(event.reason));
    });
  });
});
test.afterEach(async ({ page }, info) => {
  const diagnostics = await page.evaluate(() => ({
    errors: (window as any).__events?.errors || [],
    rejections: (window as any).__unhandledRejections || [],
  })).catch(() => ({ errors: [], rejections: [] }));
  const runtime = { pageErrors: pageErrors.get(page) || [], ...diagnostics };
  const name = info.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  fs.writeFileSync(path.join(dir, name + '-runtime.json'), JSON.stringify(runtime, null, 2));
  await harness.destroy(page);
  expect.soft(runtime, 'The investigation should produce no browser runtime errors').toEqual({
    pageErrors: [], errors: [], rejections: [],
  });
});

async function theme(page: Page, name = 'theme-default') {
  await page.evaluate(name => {
    document.body.className = name;
    (window as any).__rerender();
  }, name);
}

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dinoLab: { tab: 'ecosystem', ...state } }, undefined, { expectCanvas: false });
  // Use the same real CSS variable definitions as the existing DinoLab inquiry spec.
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const contrastEnd = styles.indexOf('--allo-stem-button-border:#00ff00', start);
  const end = styles.indexOf('/* ─', contrastEnd);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(contrastEnd).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(contrastEnd);
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await theme(page);
  await expect(page.locator('#dino-eco-time-heading')).toBeVisible();
}

async function selectedState(page: Page) {
  return page.evaluate(() => (window as any).__toolData.dinoLab);
}

async function puzzle(page: Page) {
  await page.getByRole('button', { name: 'Time puzzle: one formation, different chapters', exact: true }).click();
  await expect(page.locator('#dino-eco-time-heading')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Selected age only', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

async function noHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    panel: document.querySelector('#dinopanel')!.getBoundingClientRect().width,
  }));
  expect(size.document, JSON.stringify(size)).toBeLessThanOrEqual(size.viewport);
  expect(size.body, JSON.stringify(size)).toBeLessThanOrEqual(size.viewport);
}

test('Cedar Mountain puzzle filters dated records and opens the selected comparison', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page);
  await puzzle(page);
  expect((await selectedState(page)).ecoTime).toEqual({ formation: 'Cedar Mountain', age: 132.5, scope: 'slice' });
  await expect(page.locator('#dino-eco-formation')).toHaveValue('Cedar Mountain');
  await expect(page.locator('[data-eco-species="utahraptor"]')).toBeVisible();
  await expect(page.locator('[data-eco-species="eolambia"]')).toHaveCount(0);
  await expect(page.locator('[data-eco-range="utahraptor"]')).toContainText('Intersects chosen age');
  await expect(page.locator('[data-eco-range="eolambia"]')).toContainText('Outside chosen age');
  await expect(page.getByRole('region', { name: 'Test two records from this formation' })).toContainText('30 million years');
  await page.screenshot({ path: path.join(dir, 'ecosystem-puzzle-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: '1 million years older', exact: true }).click();
  expect((await selectedState(page)).ecoTime.age).toBe(133.5);
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuetext', /133\.5 million years ago/);
  await page.getByRole('button', { name: 'Visit Eolambia range midpoint', exact: true }).click();
  expect((await selectedState(page)).ecoTime.age).toBe(98);
  await expect(page.locator('[data-eco-species="eolambia"]')).toBeVisible();
  await expect(page.locator('[data-eco-species="utahraptor"]')).toHaveCount(0);

  await page.getByLabel('Second fossil record', { exact: true }).selectOption('utahraptor');
  await expect(page.getByRole('button', { name: 'Compare these records', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Test two records from this formation' })).toContainText('Choose two different animals.');
  await page.getByLabel('Second fossil record', { exact: true }).selectOption('eolambia');
  await page.getByRole('button', { name: 'Compare these records', exact: true }).click();
  await expect(page.locator('#dinotab-compare')).toHaveAttribute('aria-selected', 'true');
  const state = await selectedState(page);
  expect(state.compareA).toBe('utahraptor');
  expect(state.compareB).toBe('eolambia');
  await expect(page.getByLabel('Choose dinosaur A', { exact: true })).toHaveValue('utahraptor');
  await expect(page.getByLabel('Choose dinosaur B', { exact: true })).toHaveValue('eolambia');
  await expect(page.locator('#dino-compare-heading')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Shared geological time scale' })).toContainText('30');
  await page.screenshot({ path: path.join(dir, 'compare-cedar-records-desktop.png'), fullPage: true });

  await page.locator('#dinotab-ecosystem').click();
  await expect(page.getByLabel('First fossil record', { exact: true })).toHaveValue('utahraptor');
  await expect(page.getByLabel('Second fossil record', { exact: true })).toHaveValue('eolambia');
  expect((await selectedState(page)).ecoTime.age).toBe(98);
});

test('empty ages, inclusive endpoints, and formation changes have honest range results', async ({ page }) => {
  // Hydrate a saved exact age: the slider's rounded physical position need not equal a fossil boundary.
  await mount(page, {
    ecoOpen: 'Cedar Mountain',
    ecoTime: { formation: 'Cedar Mountain', age: 115, scope: 'slice' },
  });
  await expect(page.locator('[data-eco-species]')).toHaveCount(0);
  await expect(page.locator('[data-eco-empty]')).toContainText('the fossil record and this catalog are incomplete');
  await expect(page.getByRole('region', { name: 'Explore a slice of deep time' })).toContainText('0 / 5 catalog ranges');

  await page.getByRole('button', { name: 'Whole formation record', exact: true }).click();
  await expect(page.locator('[data-eco-species]')).toHaveCount(5);
  await expect(page.locator('[data-eco-empty]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Selected age only', exact: true }).click();
  await expect(page.locator('[data-eco-species]')).toHaveCount(0);

  await page.evaluate(() => {
    (window as any).__toolData.dinoLab.ecoTime = { formation: 'Cedar Mountain', age: 130, scope: 'slice' };
    (window as any).__rerender();
  });
  await expect(page.locator('[data-eco-species]')).toHaveCount(2);
  await expect(page.locator('[data-eco-species="utahraptor"]')).toBeVisible();
  await expect(page.locator('[data-eco-species="falcarius"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Explore a slice of deep time' })).toContainText('2 / 5 catalog ranges');

  const otherFormation = await page.locator('#dino-eco-formation option').evaluateAll(options =>
    options.map(option => (option as HTMLOptionElement).value).find(value => value !== 'Cedar Mountain')!);
  expect(otherFormation).toBeTruthy();
  await page.getByLabel('Explore a rock formation', { exact: true }).selectOption(otherFormation);
  await expect(page.getByRole('button', { name: 'Whole formation record', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Selected age only', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-eco-empty]')).toHaveCount(0);
  const ranges = await page.locator('[data-eco-range]').count();
  await expect(page.locator('[data-eco-species]')).toHaveCount(ranges);
  expect(ranges).toBeGreaterThanOrEqual(3);

  await page.getByRole('slider').focus();
  const before = Number(await page.getByRole('slider').inputValue());
  await page.getByRole('slider').press('ArrowRight');
  expect(Number(await page.getByRole('slider').inputValue())).toBeGreaterThan(before);
  await expect(page.getByRole('button', { name: 'Selected age only', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('slider').press('Home');
  await expect(page.getByRole('slider')).toHaveValue('0');
  await expect(page.getByRole('button', { name: '1 million years older', exact: true })).toBeDisabled();
  await page.getByRole('slider').press('End');
  await expect(page.getByRole('slider')).toHaveValue('1000');
  await expect(page.getByRole('button', { name: '1 million years younger', exact: true })).toBeDisabled();
  await page.screenshot({ path: path.join(dir, 'ecosystem-formation-change.png'), fullPage: true });
});

test('ecosystem investigation reflows on phones and passes contrast in each actual theme', async ({ page }) => {
  await mount(page);
  await puzzle(page);
  const reflow: unknown[] = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noHorizontalOverflow(page);
    for (const selector of ['#dino-eco-formation', '#dino-eco-age', '#dino-eco-pair-a', '#dino-eco-pair-b']) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.x, selector).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, selector).toBeLessThanOrEqual(width);
      reflow.push({ width, selector, box });
    }
    await page.screenshot({ path: path.join(dir, 'ecosystem-phone-' + width + '.png'), fullPage: true });
    await page.getByRole('button', { name: 'Compare these records', exact: true }).click();
    await expect(page.locator('#dino-compare-heading')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: path.join(dir, 'compare-phone-' + width + '.png'), fullPage: true });
    await page.locator('#dinotab-ecosystem').click();
  }
  fs.writeFileSync(path.join(dir, 'ecosystem-mobile-reflow.json'), JSON.stringify(reflow, null, 2));

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  const surfaces: string[] = [];
  for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await theme(page, name);
    await expect(page.locator('#dino-eco-time-heading')).toBeVisible();
    surfaces.push(await page.getByRole('region', { name: 'Explore a slice of deep time' }).evaluate(node => getComputedStyle(node).backgroundColor));
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#dinopanel'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      });
      return result.violations.map((violation: any) => ({
        id: violation.id, impact: violation.impact,
        nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })),
      }));
    });
    audits.push({ theme: name, tab: 'ecosystem', violations });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: path.join(dir, 'ecosystem-' + name + '.png'), fullPage: true });
  }
  fs.writeFileSync(path.join(dir, 'ecosystem-accessibility.json'), JSON.stringify(audits, null, 2));
  // Ensure the theme loop really changed the rendered surface before trusting contrast results.
  expect(new Set(surfaces).size).toBe(3);
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
});

test('comparison investigation retains prediction, cited evidence, and explanation through notebook export', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, {
    compareA: 'utahraptor', compareB: 'eolambia',
    notebook: { microraptor: { question: 'How did it glide? An independent field note.' } },
  });
  await page.locator('#dinotab-compare').click();
  const investigation = page.locator('details[aria-label="Pair comparison investigation"]');
  if (!(await investigation.evaluate(node => node.hasAttribute('open')))) {
    await investigation.locator('summary').filter({ hasText: 'Build an evidence-based comparison' }).click();
  }
  await expect(page.locator('#dino-compare-inquiry-heading')).toBeVisible();

  const prediction = 'The same named formation may contain different chapters. I predict that these animals lived at different times.';
  await page.locator('#dino-compare-prediction').fill(prediction);
  await page.getByRole('button', { name: 'Swap specimens', exact: true }).click();
  await expect(page.getByLabel('Choose dinosaur A', { exact: true })).toHaveValue('eolambia');
  await expect(page.getByLabel('Choose dinosaur B', { exact: true })).toHaveValue('utahraptor');
  await expect(page.locator('#dino-compare-prediction')).toHaveValue(prediction);
  await page.getByRole('button', { name: 'Inspect comparison evidence', exact: true }).click();
  const build = page.getByRole('button', { name: 'Build my explanation', exact: true });
  await expect(build).toBeDisabled();
  const dates = page.getByRole('checkbox', { name: /Catalog age ranges on one geological axis/ });
  await dates.check();
  await expect(build).toBeEnabled();
  await build.click();

  const explanation = 'Utahraptor has a catalog range of 135–130 mya; Eolambia has a range of 100–96 mya. Their dated ranges are separated by about 30 million years.';
  const limitation = 'A broad formation name and catalog ranges do not date a local fossil occurrence or establish a shared habitat.';
  await page.locator('#dino-compare-explanation').fill(explanation);
  await page.locator('#dino-compare-limit').fill(limitation);
  await page.screenshot({ path: path.join(dir, 'compare-investigation-explanation.png'), fullPage: true });

  await page.getByRole('button', { name: 'Open comparison notebook', exact: true }).click();
  await expect(page.locator('#dinotab-notes')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#dinopanel')).toContainText(prediction);
  await expect(page.locator('#dinopanel')).toContainText(explanation);
  await expect(page.locator('#dinopanel')).toContainText(limitation);
  await expect(page.locator('#dinopanel')).toContainText('Catalog age ranges on one geological axis');
  await expect(page.locator('#dinopanel')).toContainText('Utahraptor');
  await expect(page.locator('#dinopanel')).toContainText('Eolambia');
  expect((await selectedState(page)).notebook.microraptor.question).toBe('How did it glide? An independent field note.');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading;
  const exportedPath = path.join(dir, 'comparison-notebook-example.txt');
  await download.saveAs(exportedPath);
  const exported = fs.readFileSync(exportedPath, 'utf8');
  for (const content of [prediction, explanation, limitation, 'Catalog age ranges on one geological axis', 'Utahraptor', 'Eolambia', 'How did it glide? An independent field note.']) {
    expect(exported).toContain(content);
  }

  await page.getByRole('button', { name: 'Resume this comparison', exact: true }).click();
  await expect(page.locator('#dinotab-compare')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#dino-compare-explanation')).toHaveValue(explanation);
  await expect(page.locator('#dino-compare-limit')).toHaveValue(limitation);
  await page.getByRole('button', { name: 'Return to evidence', exact: true }).click();
  await expect(dates).toBeChecked();
  await page.getByRole('button', { name: 'Return to prediction', exact: true }).click();
  await expect(page.locator('#dino-compare-prediction')).toHaveValue(prediction);

  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await theme(page, name);
    await expect(page.locator('#dino-compare-prediction')).toBeVisible();
    for (const phase of ['prediction', 'evidence', 'explanation']) {
      if (phase === 'evidence') await page.getByRole('button', { name: 'Inspect comparison evidence', exact: true }).click();
      if (phase === 'explanation') await build.click();
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('details[aria-label="Pair comparison investigation"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((violation: any) => ({
          id: violation.id, impact: violation.impact,
          nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })),
        }));
      });
      audits.push({ theme: name, phase, scope: 'Pair comparison investigation', violations });
    }
    await page.screenshot({ path: path.join(dir, 'compare-investigation-' + name + '.png'), fullPage: true });
    await page.getByRole('button', { name: 'Return to evidence', exact: true }).click();
    await page.getByRole('button', { name: 'Return to prediction', exact: true }).click();
  }
  fs.writeFileSync(path.join(dir, 'comparison-investigation-accessibility.json'), JSON.stringify(audits, null, 2));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
});
