import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism', width: 1080, height: 1000, layout: 'document', appStyles: true });
const artifacts = join(process.cwd(), 'tmp', 'magnetism-motor-visual-20261031');
const stage = process.env.MAG_MOTOR_STAGE || 'after';
test.describe.configure({ mode: 'serial', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const profile of [{ name: 'desktop', width: 1080, theme: 'dark' }, { name: 'phone', width: 390, theme: 'dark' },
  { name: 'light', width: 1080, theme: 'light' }, { name: 'forced-colors', width: 320, theme: 'contrast' }]) {
  test('motor visual workbench and control correspondence · ' + profile.name, async ({ page }) => {
    if (stage === 'before' && profile.theme !== 'dark') return;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: profile.width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none' });
    await harness.mount(page, { magnetism: { tab: 'motor', motorMode: 'forces', motorView: '2d', motorAngle: 90, motorCurrent: 3, motorField: 4,
      motorCurrentDir: 1, motorFieldDir: 1, motorLoad: 0, motorRunning: false, labShellPanel: '', notebookOpen: false, notebookTrials: [], learningMode: 'guided' } }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((wrap, width) => { (wrap as HTMLElement).style.width = width + 'px'; }, profile.width);
    if (profile.theme !== 'dark') await page.evaluate(theme => {
      const palette = theme === 'light' ? { panel: '#f8fafc', deeper: '#e2e8f0', text: '#0f172a', 'text-soft': '#475569', border: '#cbd5e1' }
        : { panel: '#000000', deeper: '#000000', text: '#ffff00', 'text-soft': '#ffff00', border: '#ffff00' };
      const wrap = document.getElementById('wrap')!; wrap.setAttribute('data-stem-tool-shell', 'magnetism');
      document.body.classList.add('theme-' + theme);
      for (const [key, value] of Object.entries(palette)) wrap.style.setProperty('--allo-stem-' + key, value);
    }, profile.theme);
    await writeFile(join(artifacts, stage + '-' + profile.name + '-inputs.json'), JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(input => ({ type: input.type, html: input.outerHTML, constructor: input.constructor.name }))), null, 2));
    const card = stage === 'before' ? page.locator('.mag-card[aria-label="How a motor spins"]') : page.getByRole('region', { name: 'How a motor spins', exact: true });
    await expect(card).toBeVisible();
    await card.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80));
    await page.screenshot({ path: join(artifacts, stage + '-' + profile.name + '.png') });
    if (stage === 'before') return;
    const workbench = card.locator('.mag-motor-workbench');
    const liveState = () => page.evaluate(() => (window as any).__toolData.magnetism);
    await expect(workbench).toBeVisible();
    await expect(workbench.locator('[data-motor-stage]')).toContainText('clockwise torque');
    await expect(workbench.locator('[data-motor-pole="left"]')).toHaveText('N');
    await workbench.getByRole('button', { name: /Reverse current/ }).click();
    await expect(workbench.locator('[data-motor-stage]')).toContainText('counter-clockwise torque');
    await workbench.getByRole('button', { name: /Flip field/ }).click();
    await expect(workbench.locator('[data-motor-stage]')).toContainText('clockwise torque');
    await expect(workbench.locator('[data-motor-pole="left"]')).toHaveText('S');
    await workbench.getByRole('button', { name: '0° · dead spot', exact: true }).click();
    await expect(workbench.locator('[data-motor-stage]')).toContainText('Torque dead spot');
    expect((await liveState()).motorAngle).toBe(0);
    await workbench.getByRole('button', { name: '↻ Step by hand', exact: true }).click();
    expect((await liveState()).motorAngle).toBe(30);
    await workbench.getByRole('button', { name: '180° · commutator flip', exact: true }).click();
    await expect(card.getByRole('group', { name: 'Live torque telemetry', exact: true })).toContainText('Half-turn 2');
    await workbench.getByRole('slider', { name: 'Rotor angle (°)', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    expect((await liveState()).motorAngle).toBe(185);
    await workbench.getByRole('slider', { name: 'Current (I)', exact: true }).fill('0');
    await expect(workbench.locator('[data-motor-stage]')).toContainText('No current · no force');
    await expect(workbench.locator('[data-motor-force-pair]')).toHaveCount(0);
    await workbench.getByRole('button', { name: '▶ Run motor', exact: true }).click();
    expect((await liveState()).motorRunning).toBe(false);
    await workbench.getByRole('slider', { name: 'Current (I)', exact: true }).fill('3');
    await workbench.getByRole('button', { name: '90° · maximum torque', exact: true }).click();
    await workbench.getByRole('slider', { name: 'Shaft load (relative torque ×)', exact: true }).fill('1.5');
    await expect(card.getByRole('group', { name: 'Live torque telemetry', exact: true })).toContainText('Stalled');
    await workbench.getByRole('slider', { name: 'Shaft load (relative torque ×)', exact: true }).fill('0');
    const powerBridge = card.getByRole('region', { name: 'Magnetic work and power bridge', exact: true });
    const shaftSpeed = powerBridge.getByRole('slider', { name: 'Shaft speed (RPM)', exact: true });
    expect(await shaftSpeed.evaluate(element => element.namespaceURI)).toBe('http://www.w3.org/1999/xhtml');
    await shaftSpeed.fill('0');
    expect((await liveState()).forceLabSpeed).toBe(0);
    await shaftSpeed.focus();
    await page.keyboard.press('ArrowRight');
    expect((await liveState()).forceLabSpeed).toBe(50);
    const layout = await workbench.evaluate(element => {
      const scene = element.children[0].getBoundingClientRect(), controls = element.children[1].getBoundingClientRect();
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, scene: { left: scene.left, top: scene.top }, controls: { left: controls.left, top: controls.top } };
    });
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    if (profile.width > 760) expect(layout.controls.left).toBeGreaterThan(layout.scene.left);
    else expect(layout.controls.top).toBeGreaterThan(layout.scene.top);
    if (profile.name === 'desktop') {
      await page.addScriptTag({ path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js') });
      const violations = await workbench.evaluate(async element => (await (window as any).axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
      expect(violations).toEqual([]);
      await workbench.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 80));
      await workbench.screenshot({ path: join(artifacts, 'motor-workbench.png') });
    }
    await workbench.screenshot({ path: join(artifacts, 'final-' + profile.name + '.png') });
    await writeFile(join(artifacts, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));
    expect(errors).toEqual([]);
  });
}
