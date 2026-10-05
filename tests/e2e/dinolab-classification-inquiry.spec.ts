import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const dir = process.env.DINO_ENHANCEMENT_REPORT_DIR
  || 'C:/Users/cabba/Documents/Codex/2026-10-02/pleas/outputs/dino-enhancement';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab',
  width: 1180, height: 920, appStyles: true, layout: 'document',
});
const pageErrors = new WeakMap<Page, string[]>();
const cases = {
  bird: { id: 'bird_branch', correct: 'nested_theropod', wrong: 'bird_hipped', relevant: 'bird_membership', distractor: 'feathered_wings' },
  herbivore: { id: 'herbivore_theropod', correct: 'plant_theropod', wrong: 'all_herbivores', relevant: 'therizino_branch', distractor: 'plant_diet' },
};
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
  expect.soft(runtime, 'Classification should produce no browser runtime errors').toEqual({
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
  await harness.mount(page, { dinoLab: { tab: 'classify', ...state } }, undefined, { expectCanvas: false });
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
  await expect(page.locator('#dino-classify-heading')).toBeVisible();
}

async function caseState(page: Page, id: string) {
  return page.evaluate(id => (window as any).__toolData.dinoLab.classificationInquiry.cases[id], id);
}

async function selectCase(page: Page, id: string) {
  await page.locator('[data-classify-case="' + id + '"]').click();
  await expect(page.locator('[data-classify-case="' + id + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#dino-classify-heading')).toBeVisible();
}

function choice(page: Page, id: string) { return page.locator('input[type="radio"][data-classify-choice="' + id + '"]'); }
function citation(page: Page, id: string) { return page.locator('input[type="checkbox"][data-classify-cite="' + id + '"]'); }
function record(page: Page) { return page.getByRole('button', { name: /^Record my (explanation|revision)$/ }); }

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

test('classification uses ancestry evidence, preserves first interpretation, and exports revisions', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, { notebook: { microraptor: { question: 'How did it glide? An independent field note.' } } });
  await page.locator('[data-classify-node="theropoda"]').click();
  await expect(page.locator('[data-classify-node="theropoda"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-classify-node="ornithischia"]').click();
  await expect(page.locator('[data-classify-node="ornithischia"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-classify-node="theropoda"]')).toHaveAttribute('aria-pressed', 'false');

  const task = cases.bird;
  await selectCase(page, task.id);
  await expect(record(page)).toBeDisabled();
  await choice(page, task.wrong).check();
  await citation(page, task.distractor).check();
  const firstExplanation = 'Birds are nested within the theropod branch. The historical bird-hipped name does not place birds in Ornithischia.';
  const firstLimit = 'This simplified tree cannot show every extinct branch or resolve relationships without more fossil evidence.';
  await page.locator('#dino-classify-explanation').fill(firstExplanation);
  await page.locator('#dino-classify-limit').fill(firstLimit);
  await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
  await expect(page.locator('#dinopanel')).toContainText('The hip name is misleading');
  await expect(record(page)).toBeDisabled();
  const firstCheck = (await caseState(page, task.id)).firstCheck;
  expect(firstCheck).toEqual({ choice: task.wrong, citations: [task.distractor] });

  await choice(page, task.correct).check();
  expect((await caseState(page, task.id)).checked).toBe(false);
  expect((await caseState(page, task.id)).firstCheck).toEqual(firstCheck);
  // A checked appearance trait alone is not relevant evidence for this ancestry question.
  await expect(record(page)).toBeDisabled();
  await citation(page, task.relevant).check();
  await citation(page, task.distractor).uncheck();
  await page.locator('#dino-classify-limit').fill('   ');
  await expect(record(page)).toBeDisabled();
  await page.locator('#dino-classify-limit').fill(firstLimit);
  await page.locator('#dino-classify-explanation').fill('   ');
  await expect(record(page)).toBeDisabled();
  // Any nonblank explanation completes the prompt; the tool must not claim to grade prose quality.
  await page.locator('#dino-classify-explanation').fill('One written explanation.');
  await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
  await expect(page.locator('#dinopanel')).toContainText('Birds are nested within Theropoda');
  await expect(record(page)).toBeEnabled();
  await page.locator('#dino-classify-explanation').fill(firstExplanation);
  await record(page).click();
  const firstRecord = (await caseState(page, task.id)).first;
  expect(firstRecord).toEqual({ choice: task.correct, citations: [task.relevant], explanation: firstExplanation, limit: firstLimit });
  expect((await caseState(page, task.id)).record).toEqual(firstRecord);
  expect((await caseState(page, task.id)).firstCheck).toEqual(firstCheck);

  const revision = 'The group names describe historical hip comparisons. Shared ancestry places birds within Theropoda, so hip-name wording alone does not locate the bird branch.';
  const revisedLimit = 'A larger cladogram and independently examined fossil characters would help test where another species belongs.';
  await page.locator('#dino-classify-explanation').fill(revision);
  await page.locator('#dino-classify-limit').fill(revisedLimit);
  await expect(record(page)).toBeEnabled();
  await record(page).click();
  expect((await caseState(page, task.id)).first).toEqual(firstRecord);
  expect((await caseState(page, task.id)).record).toEqual({ choice: task.correct, citations: [task.relevant], explanation: revision, limit: revisedLimit });
  expect((await caseState(page, task.id)).firstCheck).toEqual(firstCheck);
  await page.screenshot({ path: path.join(dir, 'classification-revised-explanation-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'View classification notebook', exact: true }).click();
  await expect(page.locator('#dinotab-notes')).toHaveAttribute('aria-selected', 'true');
  for (const content of [firstExplanation, firstLimit, revision, revisedLimit]) await expect(page.locator('#dinopanel')).toContainText(content);
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.notebook.microraptor.question)).toBe('How did it glide? An independent field note.');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading;
  const exportedPath = path.join(dir, 'classification-notebook-example.txt');
  await download.saveAs(exportedPath);
  const exported = fs.readFileSync(exportedPath, 'utf8');
  for (const content of [firstExplanation, firstLimit, revision, revisedLimit, 'How did it glide? An independent field note.']) expect(exported).toContain(content);
  await page.getByRole('button', { name: 'Resume this classification', exact: true }).click();
  await expect(page.locator('#dinotab-classify')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#dino-classify-explanation')).toHaveValue(revision);
  await expect(page.locator('#dino-classify-limit')).toHaveValue(revisedLimit);
  await expect(choice(page, task.correct)).toBeChecked();
  await expect(citation(page, task.relevant)).toBeChecked();
  expect((await caseState(page, task.id)).firstCheck).toEqual(firstCheck);
  expect((await caseState(page, task.id)).first).toEqual(firstRecord);
});

test('classification case drafts remain independent while diet feedback corrects a misleading rule', async ({ page }) => {
  await mount(page);
  await selectCase(page, cases.bird.id);
  const draft = 'My bird-branch draft should remain available after I inspect another case.';
  await page.locator('#dino-classify-explanation').fill(draft);
  await choice(page, cases.bird.correct).check();
  await citation(page, cases.bird.relevant).check();

  await selectCase(page, cases.herbivore.id);
  await expect(page.locator('#dino-classify-explanation')).toHaveValue('');
  await choice(page, cases.herbivore.wrong).check();
  await citation(page, cases.herbivore.distractor).check();
  await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
  await expect(page.locator('#dinopanel')).toContainText('Diet is not a family-tree branch');
  const firstCheck = (await caseState(page, cases.herbivore.id)).firstCheck;
  await choice(page, cases.herbivore.correct).check();
  await citation(page, cases.herbivore.relevant).check();
  await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
  await expect(page.locator('#dinopanel')).toContainText('A theropod can be a plant-eater');
  const otherDraft = 'Theropod relationships remain informative when a lineage changes its diet.';
  await page.locator('#dino-classify-explanation').fill(otherDraft);
  await selectCase(page, cases.bird.id);
  await expect(page.locator('#dino-classify-explanation')).toHaveValue(draft);
  await expect(choice(page, cases.bird.correct)).toBeChecked();
  await expect(citation(page, cases.bird.relevant)).toBeChecked();
  await selectCase(page, cases.herbivore.id);
  await expect(page.locator('#dino-classify-explanation')).toHaveValue(otherDraft);
  await expect(choice(page, cases.herbivore.correct)).toBeChecked();
  expect((await caseState(page, cases.herbivore.id)).firstCheck).toEqual(firstCheck);
  await page.screenshot({ path: path.join(dir, 'classification-diet-feedback.png'), fullPage: true });
});

test('classification tree and inquiry reflow on phones and pass theme accessibility audits', async ({ page }) => {
  await mount(page);
  await selectCase(page, cases.bird.id);
  await choice(page, cases.bird.correct).check();
  await citation(page, cases.bird.relevant).check();
  await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noHorizontalOverflow(page);
    for (const selector of ['#dino-classify-explanation', '#dino-classify-limit']) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.x, selector).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, selector).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: path.join(dir, 'classification-phone-' + width + '.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  const surfaces: string[] = [];
  for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await theme(page, name);
    await expect(page.locator('#dino-classify-heading')).toBeVisible();
    surfaces.push(await page.locator('#dinopanel').evaluate(node => getComputedStyle(node).color));
    for (const task of [cases.bird, cases.herbivore]) {
      await selectCase(page, task.id);
      await choice(page, task.correct).check();
      await citation(page, task.relevant).check();
      await page.getByRole('button', { name: 'Check my interpretation', exact: true }).click();
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#dinopanel'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((violation: any) => ({
          id: violation.id, impact: violation.impact,
          nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })),
        }));
      });
      audits.push({ theme: name, tab: 'classify', caseId: task.id, violations });
    }
    await noHorizontalOverflow(page);
    await page.screenshot({ path: path.join(dir, 'classification-' + name + '.png'), fullPage: true });
  }
  fs.writeFileSync(path.join(dir, 'classification-accessibility.json'), JSON.stringify(audits, null, 2));
  expect(new Set(surfaces).size).toBe(3);
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
});

test('classification supports native keyboard controls and exports an unrecorded notebook draft', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, { notebook: { microraptor: { question: 'An independent note survives keyboard-only investigation.' } } });
  const branch = page.locator('[data-classify-node="theropoda"]');
  await branch.focus();
  await branch.press('Space');
  await expect(branch).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#dino-classify-branch-heading')).toBeFocused();
  const alternateCase = page.locator('[data-classify-case="' + cases.herbivore.id + '"]');
  await alternateCase.focus();
  await alternateCase.press('Space');
  await expect(alternateCase).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#dino-classify-heading')).toBeFocused();
  const birdCase = page.locator('[data-classify-case="' + cases.bird.id + '"]');
  await birdCase.focus();
  await birdCase.press('Space');
  await expect(birdCase).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#dino-classify-heading')).toBeFocused();

  // Native radio keys move the checked value and keyboard focus together.
  const wrong = choice(page, cases.bird.wrong);
  const correct = choice(page, cases.bird.correct);
  await wrong.focus();
  await wrong.press('Space');
  await expect(wrong).toBeChecked();
  await wrong.press('ArrowDown');
  await expect(correct).toBeChecked();
  await expect(correct).toBeFocused();
  await correct.press('ArrowUp');
  await expect(wrong).toBeChecked();
  await expect(wrong).toBeFocused();
  await wrong.press('ArrowDown');
  await expect(correct).toBeChecked();

  const evidence = citation(page, cases.bird.relevant);
  await evidence.focus();
  await evidence.press('Space');
  await expect(evidence).toBeChecked();
  await evidence.press('Space');
  await expect(evidence).not.toBeChecked();
  await evidence.press('Space');
  await expect(evidence).toBeChecked();
  const check = page.getByRole('button', { name: 'Check my interpretation', exact: true });
  await check.focus();
  await check.press('Enter');
  await expect(page.locator('#dino-classify-feedback')).toBeFocused();
  await expect(page.locator('#dino-classify-feedback')).toContainText('Birds are nested within Theropoda');
  expect((await caseState(page, cases.bird.id)).firstCheck).toEqual({
    choice: cases.bird.correct, citations: [cases.bird.relevant],
  });

  const draft = 'Keyboard draft: birds retain membership in Theropoda and Dinosauria as descendants within those branches.';
  const limitation = 'This draft asks for more fossil characters before assigning another specimen to a branch.';
  await page.locator('#dino-classify-explanation').fill(draft);
  await page.locator('#dino-classify-limit').fill(limitation);
  expect((await caseState(page, cases.bird.id)).first).toBeNull();
  expect((await caseState(page, cases.bird.id)).record).toBeNull();
  const notebook = page.getByRole('button', { name: 'View classification notebook', exact: true });
  await notebook.focus();
  await notebook.press('Enter');
  await expect(page.locator('#dino-classification-notebook')).toBeFocused();
  const classificationNotes = page.locator('section[aria-labelledby="dino-classification-notebook"]');
  await expect(classificationNotes).toContainText('Current draft');
  await expect(classificationNotes).toContainText(draft);
  await expect(classificationNotes).toContainText(limitation);
  await expect(classificationNotes).not.toContainText('First recorded explanation');
  await expect(classificationNotes).not.toContainText('Latest recorded explanation');

  const downloading = page.waitForEvent('download');
  const downloadButton = page.getByRole('button', { name: 'Download notebook', exact: true });
  await downloadButton.focus();
  await downloadButton.press('Enter');
  const download = await downloading;
  const exportedPath = path.join(dir, 'classification-draft-only-notebook.txt');
  await download.saveAs(exportedPath);
  const exported = fs.readFileSync(exportedPath, 'utf8');
  for (const content of ['Current draft:', draft, limitation, 'An independent note survives keyboard-only investigation.']) {
    expect(exported).toContain(content);
  }
  expect(exported).not.toContain('First recorded explanation:');
  expect(exported).not.toContain('Latest recorded explanation:');

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: path.join(dir, 'classification-notebook-phone-' + width + '.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const name of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await theme(page, name);
    await expect(classificationNotes).toBeVisible();
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('section[aria-labelledby="dino-classification-notebook"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      });
      return result.violations.map((violation: any) => ({
        id: violation.id, impact: violation.impact,
        nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })),
      }));
    });
    audits.push({ theme: name, scope: 'My classification investigations', violations });
  }
  fs.writeFileSync(path.join(dir, 'classification-notebook-accessibility.json'), JSON.stringify(audits, null, 2));
  expect(audits.filter(audit => audit.violations.length)).toEqual([]);
  const resume = page.getByRole('button', { name: 'Resume this classification', exact: true });
  await resume.focus();
  await resume.press('Enter');
  await expect(page.locator('#dino-classify-heading')).toBeFocused();
  await expect(page.locator('#dino-classify-explanation')).toHaveValue(draft);
  await expect(page.locator('#dino-classify-limit')).toHaveValue(limitation);
  await expect(correct).toBeChecked();
  await expect(evidence).toBeChecked();
  expect((await caseState(page, cases.bird.id)).record).toBeNull();
});
