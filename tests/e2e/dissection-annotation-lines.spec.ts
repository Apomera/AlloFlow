import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const original = { x: .2, y: .3, type: 'dot' };
const notes = { 'frog|dorsal_skin': 'Saved observation on the specimen surface.' };
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
async function marks(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations); }

for (const width of [390, 1440]) {
  test(`keyboard and pointer can start separate annotation lines at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      annotateMode: true, annotations: [original], reducedMotion: true, soundEnabled: false,
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: notes, organConfidence: { 'frog|dorsal_skin': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const newLine = page.getByRole('button', { name: 'Start new line', exact: true });
    const guide = page.locator('.diss-point-mode');
    const canvas = page.locator('[data-diss-canvas]');
    await newLine.focus(); await page.keyboard.press('Enter');
    await expect(newLine).toHaveAttribute('aria-pressed', 'true');
    await expect(guide).toContainText('Next point starts a separate line');
    await guide.screenshot({ path: `reports/dissection-annotation-lines-2026-10-31/ready-${width}.png` });
    await guide.locator('[data-diss-point-canvas]').click(); await expect(canvas).toBeFocused();
    await page.keyboard.press('Home'); await page.keyboard.press('Enter');
    let points = await marks(page);
    expect(points).toHaveLength(2); expect(points[0]).toEqual(original); expect(points[1]).not.toHaveProperty('prevX');
    const firstNew = points[1];
    await page.keyboard.press('End'); await page.keyboard.press('Enter');
    points = await marks(page); expect(points[2]).toMatchObject({ prevX: firstNew.x, prevY: firstNew.y });
    await guide.locator('[data-diss-point-undo]').click(); expect(await marks(page)).toHaveLength(2);
    await newLine.click(); await newLine.click(); await expect(newLine).toHaveAttribute('aria-pressed', 'false');
    await newLine.click();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width * .43, y: box.height * .45 } });
    points = await marks(page); expect(points).toHaveLength(3); expect(points[2]).not.toHaveProperty('prevX');
    const pointerStart = points[2];
    await canvas.click({ position: { x: box.width * .5, y: box.height * .5 } });
    points = await marks(page); expect(points).toHaveLength(4);
    expect(points[3]).toMatchObject({ prevX: pointerStart.x, prevY: pointerStart.y });
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.exploredOrgans)).toEqual({ 'frog|dorsal_skin': true });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['.diss-point-mode']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
