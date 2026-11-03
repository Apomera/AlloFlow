import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism', width: 1080, height: 1000, layout: 'document', appStyles: true });
const artifacts = join(process.cwd(), 'tmp', 'magnetism-electromagnet-visual-20261031');
const stage = process.env.MAG_ELECTRO_STAGE || 'after';
test.describe.configure({ mode: 'serial', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const profile of [
  { name: 'desktop', width: 1080, theme: 'dark' },
  { name: 'phone', width: 390, theme: 'dark' },
  { name: 'light', width: 1080, theme: 'light' },
  { name: 'forced-colors', width: 320, theme: 'contrast' },
]) {
  test('electromagnet controls and visual evidence · ' + profile.name, async ({ page }) => {
    if (stage === 'before' && ['light', 'forced-colors'].includes(profile.name)) return;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: profile.width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none' });
    await harness.mount(page, { magnetism: { tab: 'electro', electroView: '2d', turns: 100, current: 2, core: false, currentDir: 1, windingDir: 1,
      electroBaseline: null, labShellPanel: '', notebookTrials: [], notebookOpen: false, learningMode: 'guided' } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((wrap, width) => { (wrap as HTMLElement).style.width = width + 'px'; }, profile.width);
    if (profile.theme !== 'dark') await page.evaluate(theme => {
      const palette = theme === 'light' ? { panel: '#f8fafc', deeper: '#e2e8f0', text: '#0f172a', 'text-soft': '#475569', border: '#cbd5e1' }
        : { panel: '#000000', deeper: '#000000', text: '#ffff00', 'text-soft': '#ffff00', border: '#ffff00' };
      const wrap = document.getElementById('wrap')!;
      wrap.setAttribute('data-stem-tool-shell', 'magnetism');
      document.body.classList.add('theme-' + theme);
      for (const [key, value] of Object.entries(palette)) wrap.style.setProperty('--allo-stem-' + key, value);
    }, profile.theme);
    const card = page.getByRole('region', { name: 'Build an electromagnet', exact: true });
    await expect(card).toBeVisible();
    await card.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80));
    await page.screenshot({ path: join(artifacts, stage + '-' + profile.name + '.png'), fullPage: true });
    if (stage === 'before') return;
    const field = card.locator('[data-electro-readout="field"] b');
    await expect(field).toHaveText('2.51 mT');
    const state = () => page.evaluate(() => (window as any).__toolData.magnetism);
    await card.getByRole('slider', { name: 'Turns of wire (N)', exact: true }).fill('200');
    await expect(field).toHaveText('5.03 mT');
    await expect(card.getByRole('img', { name: /A wire coil with/ })).toHaveAttribute('aria-label', /14 visible loops represent 200 turns/);
    await card.getByRole('button', { name: /Reverse current/, exact: false }).click();
    await expect(card.locator('[data-electro-pole="right"]')).toHaveText('S');
    await expect(field).toHaveText('5.03 mT');
    await card.getByRole('button', { name: /Reverse winding/, exact: false }).click();
    await expect(card.locator('[data-electro-pole="right"]')).toHaveText('N');
    await card.getByRole('checkbox', { name: 'Slide in a soft-iron core', exact: true }).check();
    await expect(field).toHaveText('3016 mT');
    await card.getByRole('slider', { name: 'Current (I, amps)', exact: true }).fill('0');
    await expect(field).toHaveText('0.00 mT');
    await expect(card.locator('[data-electro-pole]')).toHaveCount(0);
    await expect(card.getByRole('img', { name: /A wire coil with/ })).toHaveAttribute('aria-label', /no magnetic field/);
    await card.getByRole('slider', { name: 'Current (I, amps)', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    expect((await state()).current).toBe(0.5);
    await card.getByRole('checkbox', { name: 'Slide in a soft-iron core', exact: true }).uncheck();
    await card.getByRole('slider', { name: 'Turns of wire (N)', exact: true }).fill('100');
    await card.getByRole('slider', { name: 'Current (I, amps)', exact: true }).fill('2');
    if (profile.name === 'desktop') {
      await page.addScriptTag({ path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => {
        const target = document.querySelector('[data-electro-instrument]')!.closest('.mag-card');
        const result = await (window as any).axe.run(target, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return result.violations.map((violation: any) => ({ id: violation.id, impact: violation.impact }));
      });
      expect(violations).toEqual([]);
    }
    await page.screenshot({ path: join(artifacts, 'after-' + profile.name + '-restored.png'), fullPage: true });
    const layout = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.mag-root')!;
      const workbench = document.querySelector<HTMLElement>('.mag-electro-workbench')!;
      const scene = workbench.children[0].getBoundingClientRect();
      const controls = workbench.children[1].getBoundingClientRect();
      const readouts = Array.from(workbench.querySelectorAll('.mag-readout')).map(element => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, width: bounds.width };
      });
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, root: root.clientWidth, rootScroll: root.scrollWidth,
        scene: { left: scene.left, top: scene.top, right: scene.right }, controls: { left: controls.left, top: controls.top }, readouts };
    });
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.rootScroll).toBeLessThanOrEqual(layout.root + 1);
    expect(layout.readouts[0].top).toBeCloseTo(layout.readouts[1].top, 0);
    expect(layout.readouts[1].left).toBeGreaterThan(layout.readouts[0].left);
    if (profile.width > 760) expect(layout.controls.left).toBeGreaterThan(layout.scene.left);
    else expect(layout.controls.top).toBeGreaterThan(layout.scene.top);
    await writeFile(join(artifacts, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));
    if (profile.name === 'desktop') {
      await card.locator('.mag-electro-workbench').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80));
      await card.locator('.mag-electro-workbench').screenshot({ path: join(artifacts, 'electromagnet-workbench.png') });
    }
    expect(errors).toEqual([]);
  });
}
