import {test, expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile: 'stem_lab/stem_tool_cell.js', toolId: 'cell', width: 1200, height: 1000, appStyles: true});
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));
for (const width of [1200, 320]) test('moving specimen keeps label slots at ' + width, async ({page}) => {
 const errors: string[] = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.setViewportSize({width, height: 960});
 await harness.mount(page, {cell: {mode: 'observe', selectedOrganism: 'amoeba', paused: true, zoom: 3}}, undefined, {expectCanvas: false});
 await page.addStyleTag({content: 'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const stage = page.locator('[data-cell-stage]');
 const canvas = page.locator('[data-cell-sim-canvas]');
 await stage.scrollIntoViewIfNeeded();
 await stage.locator('[data-cell-observation-center]').click();
 await expect.poll(() => canvas.evaluate((c: any) => c._cellSimGetAnatomyLabels?.().length || 0)).toBeGreaterThan(2);
 const samples = await canvas.evaluate(async (c: any) => {
  c._cellSimSetFollowSpecimen(true);
  c._cellSimSetSpeed(5);
  c._cellSimSetPaused(false);
  const frames: any[] = [];
  for (let i = 0; i < 120; i++) {
   await new Promise(requestAnimationFrame);
   frames.push(c._cellSimGetAnatomyLabels());
  }
  c._cellSimSetPaused(true);
  return frames;
 });
 const dimensions = await canvas.boundingBox();
 const slots = (labels: any[]) => labels.map(b => ({name: b.name, y: b.y, side: b.x + b.width / 2 < dimensions!.width / 2 ? 'left' : 'right'}));
 for (const labels of samples) {
  expect(labels.length).toBeGreaterThan(2);
  expect(slots(labels)).toEqual(slots(samples[0]));
  labels.forEach((a: any, i: number) => {
   expect(a.x).toBeGreaterThanOrEqual(0);
   expect(a.x + a.width).toBeLessThanOrEqual(dimensions!.width + 1);
   for (const b of labels.slice(i + 1)) expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y).toBe(true);
  });
 }
 const target = samples[samples.length - 1][0];
 await page.mouse.click(dimensions!.x + target.x + target.width / 2, dimensions!.y + target.y + target.height / 2);
 await expect.poll(() => canvas.evaluate((c: any) => c._cellSimGetOrganelleTooltip?.()?.name)).toBe(target.name);
 expect(errors).toEqual([]);
});
