import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism', width: 1080, height: 1000, layout: 'document', appStyles: true });
const artifacts = join(process.cwd(), 'tmp', 'magnetism-transformer-visual-20261031');
const stage = process.env.MAG_TRANSFORMER_STAGE || 'after';
test.describe.configure({ mode: 'serial', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const profile of [{ name: 'desktop', width: 1080, theme: 'dark' }, { name: 'phone', width: 390, theme: 'dark' },
  { name: 'light', width: 1080, theme: 'light' }, { name: 'forced-colors', width: 320, theme: 'contrast' }]) {
  test('transformer visual relationships and controls · ' + profile.name, async ({ page }) => {
    if (stage === 'before' && profile.theme !== 'dark') return;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: profile.width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none' });
    await harness.mount(page, { magnetism: { tab: 'transformer', xfmrN1: 100, xfmrN2: 400, xfmrAC: true, xfmrLoad: 120, xfmrEfficiency: 94,
      xfmrMission: 0, labShellPanel: '', notebookOpen: false, notebookTrials: [], learningMode: 'guided' } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((wrap, width) => { (wrap as HTMLElement).style.width = width + 'px'; }, profile.width);
    if (profile.theme !== 'dark') await page.evaluate(theme => {
      const palette = theme === 'light' ? { panel: '#f8fafc', deeper: '#e2e8f0', text: '#0f172a', 'text-soft': '#475569', border: '#cbd5e1' }
        : { panel: '#000000', deeper: '#000000', text: '#ffff00', 'text-soft': '#ffff00', border: '#ffff00' };
      const wrap = document.getElementById('wrap')!; wrap.setAttribute('data-stem-tool-shell', 'magnetism');
      document.body.classList.add('theme-' + theme);
      for (const [key, value] of Object.entries(palette)) wrap.style.setProperty('--allo-stem-' + key, value);
    }, profile.theme);
    const card = page.getByRole('region', { name: 'Turns ratio: voltage and current trade', exact: true });
    await expect(card).toBeVisible();
    await card.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80));
    await card.screenshot({ path: join(artifacts, stage + '-' + profile.name + '.png') });
    if (stage === 'before') return;
    const readout = (key: string) => card.locator('[data-transformer-reading="' + key + '"] b');
    await expect(readout('primary')).toHaveText('120 V');
    await expect(readout('secondary')).toHaveText('480 V');
    await expect(card.locator('[data-transformer-bar="primary"]')).toHaveAttribute('style', /width: 25%/);
    await expect(card.locator('[data-transformer-bar="secondary"]')).toHaveAttribute('style', /width: 100%/);
    await card.getByRole('slider', { name: 'Secondary turns (N2)', exact: true }).fill('25');
    await expect(readout('secondary')).toHaveText('30 V');
    await expect(card.locator('[data-transformer-instrument]')).toContainText('STEP-DOWN');
    await card.getByRole('slider', { name: 'Primary turns (N1)', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(readout('secondary')).toHaveText('24 V');
    await card.getByRole('slider', { name: 'Primary turns (N1)', exact: true }).fill('100');
    await card.getByRole('slider', { name: 'Secondary turns (N2)', exact: true }).fill('100');
    await expect(readout('secondary')).toHaveText('120 V');
    await expect(card.locator('[data-transformer-instrument]')).toContainText('1 : 1');
    await card.getByRole('button', { name: 'AC input', exact: true }).click();
    await expect(readout('primary')).toHaveText('120 V');
    await expect(readout('secondary')).toHaveText('0 V');
    await expect(card.locator('[data-transformer-flux]')).toHaveCount(0);
    await expect(card.locator('[data-transformer-bar="secondary"]')).toHaveAttribute('style', /width: 0%/);
    await expect(card.locator('[data-transformer-instrument]')).toContainText('steady flux · no induction');
    await card.screenshot({ path: join(artifacts, 'dc-' + profile.name + '.png') });
    await card.getByRole('button', { name: 'DC input', exact: true }).click();
    await card.getByRole('slider', { name: 'Secondary turns (N2)', exact: true }).fill('400');
    const layout = await card.evaluate(element => {
      const workbench = element.querySelector('.mag-transformer-workbench')!;
      const scene = workbench.children[0].getBoundingClientRect(), controls = workbench.children[1].getBoundingClientRect();
      const readings = Array.from(element.querySelectorAll('[data-transformer-reading]')).map(e => e.getBoundingClientRect().top);
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, scene: { left: scene.left, top: scene.top }, controls: { left: controls.left, top: controls.top }, readings };
    });
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.readings[0]).toBeCloseTo(layout.readings[1], 0);
    if (profile.width > 760) expect(layout.controls.left).toBeGreaterThan(layout.scene.left);
    else expect(layout.controls.top).toBeGreaterThan(layout.scene.top);
    if (profile.name === 'desktop') {
      await page.addScriptTag({ path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js') });
      const violations = await card.evaluate(async element => (await (window as any).axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
      expect(violations).toEqual([]);
      await card.locator('.mag-transformer-workbench').screenshot({ path: join(artifacts, 'transformer-workbench.png') });
    }
    await card.screenshot({ path: join(artifacts, 'final-' + profile.name + '.png') });
    await writeFile(join(artifacts, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));
    expect(errors).toEqual([]);
  });
}
