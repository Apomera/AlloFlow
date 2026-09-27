import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = 'reports/dinolab-excavation-2026-09-27';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, state = {}) {
  await harness.mount(page, { dinoLab: { tab: 'explore', ...state } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
}

test('grouped navigation, keyboard excavation, uncertainty, notebook export, and responsive accessibility', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, { notebook: { microraptor: { question: 'How did it glide?' } } });
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('dig');
  await expect(page.locator('#dinotab-dig')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#dinotab-classify')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#dinotab-dig')).toBeFocused();
  await expect(page.locator('[data-dig-candidate]')).toHaveCount(6);
  await page.locator('#dino-dig-cell-0').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#dino-dig-cell-0')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#dino-dig-cell-1')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#dino-dig-cell-1')).toHaveAttribute('aria-disabled', 'true');
  await page.screenshot({ path: dir + '/dig-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Use a prepared sample', exact: true }).click();
  await expect(page.locator('[data-dig-clue]')).toHaveCount(6);
  // Solve from the same visible catalog values a learner can compare.
  const clues = await page.locator('[data-dig-clue]').evaluateAll(inputs => inputs.map(input => ({ id: input.getAttribute('data-dig-clue')!, value: input.parentElement!.textContent!.split(': ').slice(1).join(': ') })));
  const candidates = await page.locator('[data-dig-candidate]').evaluateAll(cards => cards.map(card => ({ id: card.getAttribute('data-dig-candidate')!, values: [...card.querySelectorAll('dd')].map(dd => dd.textContent) })));
  const matches = candidates.filter(c => c.values.every((value, i) => value === clues[i].value));
  expect(matches).toHaveLength(1); const correct = matches[0];
  const wrong = candidates.find(c => c.id !== correct.id)!;
  let pair: number[] = [];
  for (let a = 0; a < clues.length && !pair.length; a++) for (let b = a + 1; b < clues.length && !pair.length; b++) {
    if (candidates.filter(c => c.values[a] === clues[a].value && c.values[b] === clues[b].value).length > 1) pair = [a, b];
  }
  expect(pair).toHaveLength(2);
  for (const i of pair) await page.locator('[data-dig-clue=' + clues[i].id + ']').check();
  await page.locator('[data-dig-candidate="' + correct.id + '"] button').click();
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await expect(page.locator('#dino-dig-feedback')).toBeFocused();
  await expect(page.locator('#dino-dig-feedback')).toContainText('still fit several candidates');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.digSolvedFor)).toBeUndefined();
  for (const clue of clues) await page.locator('[data-dig-clue=' + clue.id + ']').check();
  await page.locator('[data-dig-candidate="' + wrong.id + '"] button').click();
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await expect(page.locator('#dino-dig-feedback')).toContainText('conflicts with');
  await page.locator('[data-dig-candidate="' + correct.id + '"] button').click();
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await expect(page.locator('#dino-dig-feedback')).toContainText('identify one catalog candidate');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.digsSolved)).toBe(1);
  await page.screenshot({ path: dir + '/evidence-check.png', fullPage: true });
  await page.getByRole('button', { name: 'Explain in my notebook', exact: true }).click();
  await expect(page.locator('#dino-note-inference')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Excavation exercise context' })).toContainText(clues[0].value);
  await page.locator('#dino-note-inference').fill('The combined clues distinguish this candidate in the catalog. A real fossil would need diagnostic anatomy and its geological context.');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.notebook.microraptor.question)).toBe('How did it glide?');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading; await download.saveAs(dir + '/excavation-notebook.txt');
  const exported = fs.readFileSync(dir + '/excavation-notebook.txt', 'utf8');
  expect(exported).toContain('How did it glide?'); expect(exported).toContain('The combined clues distinguish'); expect(exported).toContain('Cited catalog clues:');
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));
  await mount(page, { ...saved, tab: 'dig' });
  await expect(page.locator('#dino-dig-feedback')).toContainText('identify one catalog candidate');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const tab of ['dig', 'notes', 'explore']) {
      await page.getByLabel('Jump to a lab section', { exact: true }).selectOption(tab);
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, tab, violations });
    }
  }
  fs.writeFileSync(dir + '/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ['dig', 'notes', 'explore']) {
      await page.getByLabel('Jump to a lab section', { exact: true }).selectOption(tab);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' ' + tab).toBe(true);
      if (width === 390) await page.screenshot({ path: dir + '/' + tab + '-phone.png', fullPage: true });
    }
  }
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('dig');
  await page.getByRole('button', { name: 'New dig', exact: true }).click();
  await expect(page.locator('#dino-dig-cell-0')).toBeFocused();
  await expect(page.locator('[data-dig-clue]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.digsSolved)).toBe(1);
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.notebook.microraptor.question)).toBe('How did it glide?');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
