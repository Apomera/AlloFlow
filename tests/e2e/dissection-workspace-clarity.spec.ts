import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-workspace-clarity-2026-09-29';
const baseline = process.env.DISSECTION_WORKSPACE_BASELINE === '1';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

const cases = [
  { width: 320, available: 320, large: false },
  { width: 390, available: 390, large: true },
  { width: 768, available: 768, large: false },
  { width: 1440, available: 1180, large: false },
  { width: 1440, available: 520, large: false, contact: true },
  { width: 1440, available: 320, large: true, contact: true },
];
for (const { width, available, large, contact } of cases) {
  const name = available < width && available < 1180 ? `embedded-${available}` : String(width);
  test(`workspace clarity at ${name}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    const notes = { 'frog|nictitating': 'Keep the original evidence note.' };
    await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', revealedLayers: contact ? {} : { skin: true }, procedureByLayer: contact ? { skin: { learningChecks: { inspect: { predictionCorrect: true } } } } : {}, workspaceMode: 'advanced', selectedOrgan: 'nictitating', anatomicalView: 'dorsal', largeText: large, highContrast: contact && large, organNotes: notes, techniquePanelOpen: true, reducedMotion: true, soundEnabled: false, sceneDetail: false } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
    const stage = page.locator('[data-dissection-stage]');
    if (baseline) {
      await page.locator('.diss-field-monitor__summary').focus();
      await page.locator('.diss-field-monitor__summary').press('Enter');
    } else await page.locator('.diss-field-monitor__summary').click();
    await expect(page.locator('.diss-field-monitor')).toHaveAttribute('open', '');
    const result = await page.evaluate(() => {
      const selectors = ['.diss-workspace', '.diss-stage', '.diss-stage__telemetry-grid', '.diss-stage__telemetry-head', '.diss-stage__telemetry-foot', '.diss-field-readiness__checks', '.diss-selection-card', '.diss-selection-nav'];
      const root = document.querySelector('[data-dissection-root]') as HTMLElement;
      return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, rootWidth: root.clientWidth, rootScrollWidth: root.scrollWidth, panels: selectors.map(selector => {
        const el = document.querySelector(selector) as HTMLElement;
        if (!el) return { selector, missing: true };
        const style = getComputedStyle(el), box = el.getBoundingClientRect();
        return { selector, columns: style.gridTemplateColumns, x: box.x, right: box.right, width: box.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      }), texts: Array.from(document.querySelectorAll('.diss-stage__telemetry-head strong, .diss-stage__telemetry-metric-head b, .diss-field-monitor__summary small, .diss-protocol dt, .diss-protocol dd')).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1 })) };
    });
    const prefix = baseline ? 'before' : 'after';
    await writeFile(`${out}/${prefix}-${name}.json`, JSON.stringify(result, null, 2));
    await stage.screenshot({ path: `${out}/${prefix}-stage-${name}.png` });
    await page.locator('.diss-field-monitor').screenshot({ path: `${out}/${prefix}-monitor-${name}.png` });
    await page.locator('.diss-protocol').screenshot({ path: `${out}/${prefix}-protocol-${name}.png` });
    await page.locator('[data-dissection-selection]').screenshot({ path: `${out}/${prefix}-selection-${name}.png` });
    if (baseline) return;
    expect(errors).toEqual([]);
    expect(result.documentWidth).toBeLessThanOrEqual(width + 1);
    expect(result.rootScrollWidth, 'lab content escapes its available width').toBeLessThanOrEqual(result.rootWidth + 1);
    for (const panel of result.panels.filter(panel => !panel.missing)) {
      expect(panel.scrollWidth, `${panel.selector} overflows`).toBeLessThanOrEqual(panel.clientWidth! + 1);
      expect(panel.width, `${panel.selector} exceeds the embedded lab`).toBeLessThanOrEqual(available + 1);
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.right).toBeLessThanOrEqual(available + 1);
    }
    expect(result.panels.find(panel => panel.selector === '.diss-workspace')!.columns.split(' ').length).toBe(available <= 980 ? 1 : 2);
    const columns = result.panels.find(panel => panel.selector === '.diss-stage__telemetry-grid')!.columns.split(' ').map(parseFloat).filter(width => width > 0.1);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns.every(width => width >= 127.9), 'visible monitor cards are too narrow').toBe(true);
    for (const text of result.texts) {
      expect(text.clipped, `clipped text: ${text.text}`).toBe(false);
      expect(text.size).toBeGreaterThanOrEqual(large ? 14.3 : 11.9);
    }
    if (contact) await expect(page.locator('.diss-field-readiness')).toBeVisible();
    await expect(page.locator('#diss-note-nictitating')).toHaveValue(notes['frog|nictitating']);
    await expect(page.getByRole('button', { name: 'Next structure', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Previous structure', exact: true }).focus();
    await expect(page.getByRole('button', { name: 'Previous structure', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click();
    await expect(page.locator('[data-dissection-selection]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
  });
}
