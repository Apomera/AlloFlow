import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = 'reports/dinolab-improvements-2026-09-27';
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
test('prediction to transfer, notes retention, export, theme contrast and mobile reflow', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await mount(page, { notebook: { microraptor: { question: 'How did it glide?' } } });
  await page.screenshot({ path: dir + '/opening-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: dir + '/opening-phone.png' });
  const start = page.getByRole('button', { name: 'Start the investigation', exact: true });
  expect((await start.boundingBox())!.y).toBeLessThan(600);
  await start.click(); await expect(page.locator('#dino-inquiry-heading')).toBeFocused();
  await page.getByRole('button', { name: '○ Yes', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect the dates', exact: true }).click();
  await page.getByRole('button', { name: /Their body sizes differ/ }).click();
  await expect(page.getByRole('button', { name: 'Build my explanation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /Their known age ranges do not overlap/ }).click();
  await page.screenshot({ path: dir + '/evidence-phone.png' });
  await page.getByRole('button', { name: 'Build my explanation', exact: true }).click();
  const explanation = 'I first thought yes. Stegosaurus lived about 155–145 mya, much earlier than T. rex, so they could not meet.';
  await page.getByLabel('My explanation', { exact: true }).fill(explanation);
  await page.locator('#dinotab-notes').click();
  await expect(page.getByRole('region', { name: 'Time investigation record' })).toContainText(explanation);
  await page.getByRole('button', { name: 'Return to my investigation', exact: true }).click();
  await expect(page.getByLabel('My explanation', { exact: true })).toHaveValue(explanation);
  await page.getByRole('button', { name: 'Test the idea on another pair', exact: true }).click();
  await page.getByRole('button', { name: /Overlapping dates prove/ }).click();
  await expect(page.getByRole('button', { name: 'Record my investigation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /An encounter was possible in time/ }).click();
  await page.getByRole('button', { name: 'Record my investigation', exact: true }).click();
  await page.getByRole('button', { name: 'Open my notebook', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.notebook.microraptor.question)).toBe('How did it glide?');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloading; await download.saveAs(dir + '/example-notebook.txt');
  const exported = fs.readFileSync(dir + '/example-notebook.txt', 'utf8');
  expect(exported).toContain(explanation); expect(exported).toContain('How did it glide?'); expect(exported).toContain('Initial prediction: yes');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const tab of ['explore', 'notes', 'birds', 'ecosystem']) {
      await page.locator('#dinotab-' + tab).click();
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('#dinopanel'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, tab, violations });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), theme + ' ' + tab).toBe(true);
    }
  }
  fs.writeFileSync(dir + '/accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('#dinotab-explore').click();
  await page.getByRole('button', { name: 'Revise my explanation', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({ path: dir + '/explanation-desktop.png' });
  await page.locator('#dinotab-birds').click(); await page.screenshot({ path: dir + '/bird-evidence.png', fullPage: true });
  await page.locator('#dinotab-ecosystem').click(); await page.screenshot({ path: dir + '/ecosystem.png', fullPage: true });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('focused 3D view has an opaque theme surface in native fullscreen', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { tab: 'field3d', field3dSelected: 'tyrannosaurus', field3dAutoRotate: false, field3dFocusMode: true });
  await expect.poll(async () => page.evaluate(() => (window as any).__glLive()?.lost), { timeout: 60000 }).toBe(false);
  const results: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    // A real trusted click supplies the activation required by requestFullscreen.
    await page.evaluate(() => {
      const button = document.createElement('button'); button.id = 'test-fullscreen'; button.textContent = 'Enter native fullscreen';
      button.onclick = () => { document.querySelector<HTMLElement>('.dinolab-field-stage')!.requestFullscreen(); button.remove(); };
      document.body.prepend(button);
    });
    await page.locator('#test-fullscreen').click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    const surface = await page.locator('.dinolab-field-stage').evaluate(node => { const s = getComputedStyle(node); return { background: s.backgroundColor, text: s.color }; });
    expect(surface.background).not.toBe('rgba(0, 0, 0, 0)'); expect(surface.background).not.toBe(surface.text);
    results.push({ theme, ...surface });
    await page.screenshot({ path: dir + '/fullscreen-' + theme + '.png' });
    await page.evaluate(() => document.exitFullscreen());
  }
  fs.writeFileSync(dir + '/fullscreen-surfaces.json', JSON.stringify(results, null, 2));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
