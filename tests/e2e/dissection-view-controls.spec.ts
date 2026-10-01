import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-view-controls-2026-09-29';
const baseline = process.env.DISSECTION_VIEW_BASELINE === '1';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

const cases = [
  { name: 'phone', width: 320, available: 320, mode: 'advanced' },
  { name: 'essentials', width: 390, available: 390, mode: 'essentials' },
  { name: 'embedded-large', width: 1440, available: 320, mode: 'advanced', large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180, mode: 'advanced' },
  { name: 'assessment', width: 390, available: 390, mode: 'advanced', assessment: true },
  { name: 'forced-colors', width: 390, available: 390, mode: 'advanced', forced: true },
];
for (const { name, width, available, mode, large, contrast, assessment, forced } of cases) {
  test(`view controls ${name} retain their controls and readable states`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    const note = { 'frog|ventral_skin': 'Retain this saved observation.' };
    await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', revealedLayers: { skin: true }, workspaceMode: mode, selectedOrgan: 'ventral_skin', toolbarViewOpen: true, largeText: !!large, highContrast: !!contrast, quizMode: !!assessment, reducedMotion: true, soundEnabled: false, sceneDetail: false, organNotes: note } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
    const panel = page.locator('#diss-view-tools');
    const inventory = await panel.evaluate(el => Array.from(el.querySelectorAll('button, input')).map(node => ({ tag: node.tagName, name: node.getAttribute('aria-label') || node.id, disabled: (node as HTMLButtonElement).disabled, pressed: node.getAttribute('aria-pressed'), visible: node.getBoundingClientRect().width > 0 })).sort((a,b) => a.name.localeCompare(b.name)));
    await panel.screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${name}.png`, style: '.diss-next-action { position: static !important; }' });
    if (baseline) { await writeFile(`${out}/before-${name}.json`, JSON.stringify(inventory, null, 2)); return; }
    expect(inventory).toEqual(JSON.parse(await readFile(`${out}/before-${name}.json`, 'utf8')));
    await expect(panel.getByRole('group')).toHaveCount(4);
    const measurements = await panel.evaluate(el => {
      const box = el.getBoundingClientRect();
      return { width: box.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        buttons: Array.from(el.querySelectorAll('button')).filter(node => node.getBoundingClientRect().width > 0).map(node => ({ label: node.getAttribute('aria-label'), font: parseFloat(getComputedStyle(node).fontSize), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })) };
    });
    await writeFile(`${out}/after-${name}.json`, JSON.stringify(measurements, null, 2));
    expect(measurements.width).toBeLessThanOrEqual(available + 1);
    expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.clientWidth + 1);
    for (const button of measurements.buttons) {
      expect(button.font, `small control: ${button.label}`).toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
      expect(button.height).toBeGreaterThanOrEqual(47.9);
      expect(button.scrollWidth, `clipped control: ${button.label}`).toBeLessThanOrEqual(button.clientWidth + 1);
    }
    const sound = panel.getByRole('button', { name: 'Toggle dissection sound effects', exact: true });
    await sound.focus(); await page.keyboard.press('Space');
    await expect(sound).toHaveAttribute('aria-pressed', 'true'); await expect(sound).toBeFocused();
    await sound.screenshot({ path: `${out}/focus-${name}.png` });
    await page.keyboard.press('Space'); await expect(sound).toHaveAttribute('aria-pressed', 'false');
    if (mode === 'advanced' && !assessment) {
      const range = panel.locator('#diss-light-intensity-range');
      const before = Number(await range.inputValue());
      await range.focus(); await page.keyboard.press('ArrowRight');
      expect(Number(await range.inputValue())).toBe(before + 2);
    }
    if (assessment) await expect(panel.getByRole('button', { name: 'Organ name labels hidden during assessment', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(note);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-view-tools']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}
