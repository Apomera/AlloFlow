import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = 'reports/dinolab-extinction-investigation-2026-09-28';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, state = {}) {
  await harness.mount(page, { dinoLab: { tab: 'extinction', ...state } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
}
const steps = ['1 · Inspect the sources', '2 · Connect the effects', '3 · Explain and revise'];

test('learner can inspect, explain, revise, restore, and export an extinction investigation', async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1366, height: 1000 });
  await mount(page, { notebook: { microraptor: { question: 'Could it glide?' } }, evidenceWorkbench: { caseId: 'quills', cases: { quills: { claim: 'My existing feather idea.' } } } });
  for (const source of ['iridium', 'spherules', 'deccan', 'crater', 'soot']) {
    const button = page.locator('[data-kpg-source=' + source + ']');
    await button.focus(); await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dino-kpg-source-heading')).toBeFocused();
    await expect(page.locator('#dino-kpg-source-detail svg[role=img]')).toHaveAttribute('aria-label', /^Schematic/);
    if (source === 'crater' || source === 'soot') await page.locator('[data-kpg-citation=' + source + ']').check();
  }
  await expect(page.locator('.dinolab-kpg-limit')).toContainText('not direct observations');
  await page.mouse.move(0, 0);
  await page.locator('.dinolab-kpg').screenshot({ path: dir + '/sources-desktop.png' });
  await page.getByRole('button', { name: 'Connect cause and consequence →', exact: true }).click();
  await expect(page.locator('#dino-kpg-task')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Check my connections', exact: true })).toBeDisabled();
  for (const [key, value] of Object.entries({ sky: 'local', plants: 'all', web: 'hunters' })) await page.locator('#dino-kpg-link-' + key + '-' + value).check();
  await page.getByRole('button', { name: 'Check my connections', exact: true }).click();
  await expect(page.locator('#dino-kpg-check-status')).toBeFocused();
  await expect(page.locator('#dino-kpg-feedback-web')).toContainText('Predators depend on prey');
  for (const [key, value] of Object.entries({ sky: 'particles', plants: 'production', web: 'connections' })) await page.locator('#dino-kpg-link-' + key + '-' + value).check();
  await expect(page.locator('#dino-kpg-feedback-web')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check my connections', exact: true }).click();
  await page.locator('.dinolab-kpg').screenshot({ path: dir + '/pathway-desktop.png' });
  await page.getByRole('button', { name: 'Write my explanation →', exact: true }).click();
  await page.locator('#dino-kpg-claim').fill('A local impact disrupted distant food webs.');
  await page.locator('#dino-kpg-reasoning').fill('The crater supports an impact. Models connect atmospheric particles to reduced light and food production.');
  await page.locator('#dino-kpg-limit').fill('This does not tell us exactly how long darkness lasted.');
  await page.getByRole('button', { name: 'Record my explanation', exact: true }).click();
  await expect(page.locator('#dino-kpg-record-status')).toBeFocused();
  await page.locator('#dino-kpg-claim').fill('A local impact could cause distant food-web disruption through reduced sunlight.');
  await page.getByRole('button', { name: 'Record my revision', exact: true }).click();
  await page.getByText('Compare with my first explanation', { exact: true }).click();
  await expect(page.getByText('A local impact disrupted distant food webs.', { exact: true })).toBeVisible();
  await page.locator('.dinolab-kpg').screenshot({ path: dir + '/writing-desktop.png' });
  await page.locator('#dino-kpg-limit').fill('I am now asking why some lineages survived.');
  await page.getByRole('button', { name: 'View in my field notebook', exact: true }).click();
  await expect(page.locator('#dino-kpg-notebook')).toBeFocused();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading; await download.saveAs(dir + '/field-notebook.txt');
  const exported = fs.readFileSync(dir + '/field-notebook.txt', 'utf8');
  for (const phrase of ['Could it glide?', 'My existing feather idea.', 'First checked pathway', 'Predators are unaffected', 'Current pathway choices', 'First recorded explanation', 'Latest recorded explanation', 'Current draft (not yet recorded)', 'I am now asking', 'https://doi.org/10.1126/science.1230492', 'https://doi.org/10.1038/s41561-023-01290-4']) expect(exported).toContain(phrase);
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));
  expect(saved.kpgInvestigation.firstLinks.web).toBe('hunters');
  expect(saved.kpgInvestigation.links.web).toBe('connections');
  await harness.destroy(page);
  await mount(page, { ...saved, tab: 'extinction' });
  await expect(page.locator('#dino-kpg-limit')).toHaveValue('I am now asking why some lineages survived.');
  await expect(page.locator('#dino-kpg-record-status')).toContainText('unrecorded revision');
  await page.getByRole('button', { name: 'Explore the surviving dinosaur branch →', exact: true }).click();
  await expect(page.getByLabel('Jump to a lab section', { exact: true })).toHaveValue('birds');
  await expect(page.locator('#dinotab-birds')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  fs.writeFileSync(dir + '/restored-state.json', JSON.stringify(saved, null, 2));
});

test('sources, pathway, and writing are accessible across themes and narrow screens', async ({ page }) => {
  test.setTimeout(300000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 1000 });
  await mount(page, { kpgInvestigation: { source: 'crater', citations: ['crater','soot'], links: { sky: 'particles', plants: 'all', web: 'hunters' }, checked: true } });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [], layouts: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (let step = 0; step < 3; step++) {
      await page.getByRole('button', { name: steps[step], exact: true }).click();
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, step, violations });
      await page.mouse.move(0, 0);
      if (step === 1) await page.locator('.dinolab-kpg').screenshot({ path: dir + '/pathway-' + theme + '.png' });
    }
  }
  fs.writeFileSync(dir + '/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (let step = 0; step < 3; step++) {
      await page.getByRole('button', { name: steps[step], exact: true }).click();
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(fits).toBe(true);
      for (const option of await page.locator('.dinolab-kpg-options label').all()) expect(await option.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      for (const card of await page.locator('.dinolab-kpg-picker button').all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      layouts.push({ width, step, fits });
      if (width === 390) { await page.mouse.move(0, 0); await page.locator('.dinolab-kpg').screenshot({ path: dir + '/step-' + step + '-phone.png' }); }
    }
  }
  fs.writeFileSync(dir + '/layout.json', JSON.stringify(layouts, null, 2));
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('button', { name: steps[1], exact: true }).click();
  await page.locator('.dinolab-kpg').screenshot({ path: dir + '/pathway-forced-colors.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
