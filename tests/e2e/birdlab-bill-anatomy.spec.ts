import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Beak & Feet bill cards: every bill is two mandibles meeting at the
// commissure on a rounded head, carries the feature its lesson names, and
// projects from the face by a length that matches its job.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const FEATURES: Record<string, string[]> = {
  cone: ['seed'], hook: ['cere', 'cn'], spear: ['lore', 'slit'], tube: ['tongue'],
  chisel: ['tip', 'bristles'], filter: ['nail', 'lamellae'], parrot: ['plate', 'ridge', 'grooves', 'rosette'], thin: ['rictal', 'wing', 'bug']
};

test('each bill card draws its anatomy and a length that fits its job', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'beakFeet', blSceneMotion: false } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-beak-icon]');
  const bills = await page.evaluate(() => [...document.querySelectorAll('[data-beak-icon]')].map(svg => {
    const art = svg.querySelector('[data-beak-anatomy="mandibles"]');
    const paths = art ? [...art.children] : [];
    const box = (el: Element) => (el as SVGGraphicsElement).getBBox();
    // Children in drawing order: 8 head parts, lower, upper, [shine], gape, [naris], features.
    const lower = paths[8], upper = paths[9], head = paths[0];
    return { id: svg.getAttribute('data-beak-icon'), mandibles: !!art, features: art?.querySelector('[data-bill-features]')?.getAttribute('data-bill-features') || '',
      headRight: head ? box(head).x + box(head).width : 0,
      tip: upper && lower ? Math.max(box(upper).x + box(upper).width, box(lower).x + box(lower).width) : 0,
      depth: upper && lower ? box(lower).y + box(lower).height - box(upper).y : 0 };
  }));
  expect(bills.map(b => b.id)).toEqual(Object.keys(FEATURES));
  for (const bill of bills) {
    expect(bill.mandibles, bill.id).toBe(true);
    for (const feature of FEATURES[bill.id!]) expect(bill.features.split(' '), bill.id!).toContain(feature);
    expect(bill.tip - bill.headRight, bill.id + ' projects from the face').toBeGreaterThan(6);
  }
  const by = Object.fromEntries(bills.map(b => [b.id, b]));
  // Probing and spearing bills are the longest; the seed cone is short and deep;
  // the puffin's is the deepest of all.
  for (const long of ['tube', 'spear']) for (const short of ['cone', 'thin', 'hook', 'parrot']) expect(by[long].tip).toBeGreaterThan(by[short].tip + 5);
  expect(by.cone.depth).toBeGreaterThan(by.thin.depth * 2.5);
  expect(Math.max(...bills.map(b => b.depth))).toBe(by.parrot.depth);

  await page.locator('[data-beak-icon="hook"]').locator('xpath=ancestor::button[1]').click();
  await expect(page.getByRole('img', { name: 'Hook (raptor) diagram' })).toBeVisible();
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-beak-icon]')!.closest('.rounded-2xl'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  expect(errors).toEqual([]);
});
