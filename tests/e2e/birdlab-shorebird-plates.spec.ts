import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Shorebird plates teach proportions, so every bird stands on one ground line
// (leg length reads as height), bills taper along their curve (Greater
// Yellowlegs rises, Dunlin droops), plovers get the rounder head and their
// counted breast bands, and the snipe's bill is the longest.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const PLOVERS = ['Piping Plover', 'Semipalmated Plover', 'Killdeer', 'Black-bellied Plover'];

test('every shorebird stands on the line with its own bill shape', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'shorebirds' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-shorebird-figure]');
  const names = ['Piping Plover', 'Semipalmated Plover', 'Killdeer', 'Greater Yellowlegs', 'Lesser Yellowlegs', 'Spotted Sandpiper', 'Solitary Sandpiper', 'Willet',
    'Sanderling', 'Semipalmated Sandpiper', 'Least Sandpiper', 'Dunlin', 'Ruddy Turnstone', 'Black-bellied Plover', "Wilson's Snipe"];
  const rows: Record<string, any> = {};
  for (const name of names) {
    await page.getByRole('button', { name, exact: true }).click();
    rows[name] = await page.evaluate(() => {
      const svg = document.querySelector('[data-shorebird-figure]') as SVGSVGElement;
      const bird = svg.querySelector('[data-shorebird-lift]') as SVGGElement, lift = Number(bird.getAttribute('data-shorebird-lift'));
      const legs = (svg.querySelector('[data-shorebird-part="legs"]') as SVGGraphicsElement).getBBox();
      const bill = svg.querySelector('[data-shorebird-part="bill"]')!;
      const nums = (bill.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g)!.map(Number);
      const [tipX, tipY] = bill.getAttribute('data-bill-tip')!.split(' ').map(Number);
      const bands = svg.querySelector('[data-shorebird-part="breast-bands"]');
      return { feet: legs.y + legs.height + lift, tipX, tipY, rootY: nums[1] + lift, head: svg.querySelector('[data-shorebird-part$="-head"]')!.getAttribute('data-shorebird-part'),
        bands: bands ? bands.querySelectorAll('path').length : 0, filledBill: bill.getAttribute('fill') !== 'none' };
    });
  }
  for (const name of names) {
    const r = rows[name];
    expect(Math.abs(r.feet - 109), name + ' stands on the ground line').toBeLessThan(2.5);
    expect(r.filledBill, name).toBe(true);
    expect(r.head, name).toBe(PLOVERS.includes(name) ? 'plover-head' : 'sandpiper-head');
  }
  expect(rows['Greater Yellowlegs'].tipY, 'upturned').toBeLessThan(rows['Greater Yellowlegs'].rootY - 3);
  expect(rows['Dunlin'].tipY, 'drooping').toBeGreaterThan(rows['Dunlin'].rootY + 3);
  expect(Math.max(...names.map(n => rows[n].tipX))).toBe(rows["Wilson's Snipe"].tipX);
  expect([rows['Killdeer'].bands, rows['Piping Plover'].bands, rows['Dunlin'].bands]).toEqual([2, 1, 0]);
  // Long legs raise the body: a yellowlegs stands well above a Least Sandpiper.
  await page.getByRole('button', { name: 'Greater Yellowlegs', exact: true }).click();
  const tall = Number(await page.locator('[data-shorebird-lift]').getAttribute('data-shorebird-lift'));
  await page.getByRole('button', { name: 'Least Sandpiper', exact: true }).click();
  const short = Number(await page.locator('[data-shorebird-lift]').getAttribute('data-shorebird-lift'));
  expect(short - tall).toBeGreaterThan(15);
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-shorebird-figure]')!.closest('.rounded-lg'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  expect(errors).toEqual([]);
});
