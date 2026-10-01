import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-notebook-clarity-2026-09-29';
const baseline = process.env.DISSECTION_NOTEBOOK_BASELINE === '1';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

const cases = [
  { name: 'phone-320', width: 320, available: 320 },
  { name: 'phone-large', width: 390, available: 390, large: true },
  { name: 'embedded-contrast', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const { name, width, available, large, contrast, forced } of cases) {
  test(`evidence notebook ${name} remains readable and preserves evidence`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    const note = 'I observed a transparent membrane at the eye. Its location supports this identification.';
    const immutable = { exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: { 'frog|nictitating': true }, quizScore: 1, quizTotal: 2 };
    await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', revealedLayers: { skin: true }, workspaceMode: 'advanced', selectedOrgan: 'nictitating', anatomicalView: 'dorsal', organNotes: { 'frog|nictitating': note }, organConfidence: { 'frog|nictitating': 2 }, largeText: !!large, highContrast: !!contrast, reducedMotion: true, soundEnabled: false, sceneDetail: false, ...immutable } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
    const form = page.locator('[data-dissection-evidence]');
    await expect(page.locator('#diss-note-nictitating')).toHaveValue(note);
    const prefix = baseline ? 'before' : 'after';
    await form.screenshot({ path: `${out}/${prefix}-${name}.png` });
    if (baseline) return;
    const metrics = await form.evaluate(el => {
      const box = el.getBoundingClientRect();
      const textSelectors = ['.diss-evidence-starters button', '.diss-confidence-scale__option', '.diss-confidence-scale__label', '.diss-confidence-cue', '.diss-evidence-coach__note', '.diss-evidence-note'];
      return { width: box.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        texts: Array.from(el.querySelectorAll(textSelectors.join(','))).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), width: node.getBoundingClientRect().width, scrollWidth: (node as HTMLElement).scrollWidth, clientWidth: (node as HTMLElement).clientWidth })),
        choicesWidth: el.querySelector('.diss-confidence-scale__choices')!.getBoundingClientRect().width,
        starts: Array.from(el.querySelectorAll('.diss-evidence-starters button')).map(node => node.getBoundingClientRect().width) };
    });
    await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    for (const text of metrics.texts) {
      expect(text.size, `small notebook text: ${text.text}`).toBeGreaterThanOrEqual(13.9);
      expect(text.scrollWidth, `clipped notebook text: ${text.text}`).toBeLessThanOrEqual(text.clientWidth + 1);
      if (text.text?.includes('Somewhat sure') || text.text?.includes('Not sure yet') || text.text?.includes('Confident')) expect(text.width).toBeCloseTo(metrics.choicesWidth, 0);
    }
    expect(Math.max(...metrics.starts) - Math.min(...metrics.starts)).toBeLessThanOrEqual(1);
    const radios = form.getByRole('radio');
    await expect(radios.nth(1)).toBeChecked();
    await radios.nth(1).focus(); await page.keyboard.press('ArrowDown');
    await expect(radios.nth(2)).toBeChecked(); await expect(radios.nth(2)).toBeFocused();
    await expect(form.locator('.diss-confidence-scale__option[data-selected="true"]')).toHaveCount(1);
    if (forced) expect(await form.locator('.diss-confidence-scale__option[data-selected="true"]').evaluate(el => parseFloat(getComputedStyle(el).borderLeftWidth))).toBeGreaterThanOrEqual(2);
    await form.locator('.diss-confidence-scale__option[data-selected="true"]').screenshot({ path: `${out}/focus-${name}.png` });
    await expect(page.locator('#diss-note-nictitating')).toHaveValue(note);
    await form.locator('[data-evidence-review] summary').click();
    await expect(form.locator('.diss-draft-review__steps')).toBeVisible();
    await form.locator('[data-evidence-review]').screenshot({ path: `${out}/review-${name}.png` });
    await form.locator('[data-evidence-starter="location"]').click();
    await expect(page.locator('#diss-note-nictitating')).toBeFocused();
    await expect(page.locator('#diss-note-nictitating')).toHaveValue(note + '\nIt is located ');
    expect(await page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { exploredOrgans: d.exploredOrgans, verifiedIdentifications: d.verifiedIdentifications, quizScore: d.quizScore, quizTotal: d.quizTotal }; })).toEqual(immutable);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-evidence]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}
