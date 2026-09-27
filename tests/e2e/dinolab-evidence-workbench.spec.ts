import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = process.env.DINOLAB_EVIDENCE_REPORT_DIR || 'reports/dinolab-evidence-workbench-2026-09-27';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, state = {}) {
  await harness.mount(page, { dinoLab: { tab: 'anatomy', ...state } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
}
async function classify(page, choices: Record<string, string>) {
  for (const [id, kind] of Object.entries(choices)) await page.locator('#dino-bench-sort-' + id).selectOption(kind);
  await page.getByRole('button', { name: 'Check my distinctions', exact: true }).click();
  await expect(page.locator('#dino-bench-feedback')).toBeFocused();
}

test('two fossil cases support evidence distinctions, authored revisions, accessible layouts, and notebook export', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { notebook: { microraptor: { question: 'How did it glide?' } } });
  await expect(page.getByRole('heading', { name: 'Evidence workbench', exact: true })).toBeVisible();
  await page.screenshot({ path: dir + '/workbench-desktop.png', fullPage: true });
  await expect(page.getByRole('button', { name: '2 · Explain and revise', exact: true })).toBeDisabled();
  await classify(page, { marks: 'observation', flight: 'inference', feathers: 'inference' });
  await expect(page.locator('#dino-bench-response-flight')).toContainText('Reconsider: Overreach');
  await expect(page.locator('#dino-bench-response-flight')).toContainText('additional anatomical');
  await page.locator('#dino-bench-sort-flight').selectOption('overreach');
  await page.getByRole('button', { name: 'Check my distinctions', exact: true }).click();
  await expect(page.locator('#dino-bench-response-flight')).toContainText('Fits: Overreach');
  await page.getByRole('button', { name: 'Write my explanation →', exact: true }).click();
  await expect(page.locator('#dino-bench-task')).toBeFocused();
  await page.locator('[data-bench-citation=fossil]').focus(); await page.keyboard.press('Space');
  await page.locator('[data-bench-citation=comparison]').check();
  await page.getByLabel('My claim', { exact: true }).fill('The forearm carried feathers.');
  await page.getByLabel('How the evidence supports it', { exact: true }).fill('The reported knobs resemble attachment sites in living birds.');
  await page.getByLabel('A limit and a next question', { exact: true }).fill('Flight needs more evidence about anatomy and movement.');
  await page.getByText('Sentence starters and a worked example', { exact: true }).click();
  await expect(page.getByText('This is one worked example, not an answer key for your writing.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Record my explanation', exact: true }).click();
  await expect(page.locator('#dino-bench-record-status')).toBeFocused();
  await page.getByLabel('My claim', { exact: true }).fill('The evidence supports large feathers on the forearm, but not flight.');
  await page.getByLabel('I explained how my cited evidence supports the claim.', { exact: true }).check();
  await page.getByRole('button', { name: 'Record my revision', exact: true }).click();
  await page.getByText('Compare with my first recorded explanation', { exact: true }).click();
  await expect(page.getByText('The forearm carried feathers.', { exact: true })).toBeVisible();
  await page.screenshot({ path: dir + '/reasoning-and-revision.png', fullPage: true });
  await page.getByRole('button', { name: 'Try the other case →', exact: true }).click();
  await expect(page.locator('#dino-bench-heading')).toBeFocused();
  await classify(page, { everywhere: 'overreach', regions: 'inference', pattern: 'observation' });
  await page.screenshot({ path: dir + '/scale-evidence.png', fullPage: true });
  await page.getByRole('button', { name: 'Write my explanation →', exact: true }).click();
  await page.locator('[data-bench-citation=coverage]').check();
  await page.getByLabel('My claim', { exact: true }).fill('A partial sample cannot map the whole skin.');
  await page.getByRole('button', { name: 'View in field notebook', exact: true }).click();
  await expect(page.locator('#dino-bench-notebook')).toBeFocused();
  await expect(page.getByText('The evidence supports large feathers on the forearm, but not flight.', { exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading; await download.saveAs(dir + '/evidence-notebook.txt');
  const exported = fs.readFileSync(dir + '/evidence-notebook.txt', 'utf8');
  for (const phrase of ['How did it glide?', 'First classification attempt', 'First recorded explanation', 'Latest recorded explanation', 'The forearm carried feathers.', 'but not flight.', 'Current draft (not yet recorded)', 'A partial sample', 'https://doi.org/10.1126/science.1145076', 'https://doi.org/10.1098/rsbl.2017.0092']) expect(exported).toContain(phrase);
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));
  expect(saved.evidenceWorkbench.cases.quills.firstSort.flight).toBe('inference');
  expect(saved.evidenceWorkbench.cases.quills.record.claim).toContain('but not flight');
  expect(saved.evidenceWorkbench.cases.scales.record).toBeNull();
  await mount(page, { ...saved, tab: 'anatomy' });
  await expect(page.getByLabel('My claim', { exact: true })).toHaveValue('A partial sample cannot map the whole skin.');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const mode of ['writing', 'sorting', 'notebook']) {
      if (mode === 'writing') await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('anatomy');
      if (mode === 'sorting') await page.getByRole('button', { name: '1 · Read and distinguish', exact: true }).click();
      if (mode === 'notebook') await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('notes');
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, mode, violations });
      if (mode === 'sorting' && theme !== 'theme-default') await page.screenshot({ path: dir + '/workbench-' + theme + '.png', fullPage: true });
      if (mode === 'notebook') {
        await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('anatomy');
        await page.getByRole('button', { name: '2 · Explain and revise', exact: true }).click();
      }
    }
  }
  fs.writeFileSync(dir + '/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const step of ['1 · Read and distinguish', '2 · Explain and revise']) {
      await page.getByRole('button', { name: step, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 390) await page.screenshot({ path: dir + (step.startsWith('1') ? '/workbench-mobile.png' : '/writing-mobile.png'), fullPage: true });
    }
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
