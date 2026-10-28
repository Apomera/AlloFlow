import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Beak & Feet foot cards: each foot is a scaled tarsus with jointed toes and
// claws, arranged the way its lesson says (2-up/2-down climbers, 2-and-2
// Osprey with spicules, full web vs small web, lobes, a raised hind toe).
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('each foot card draws the arrangement its lesson describes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'beakFeet', blSceneMotion: false } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-foot-icon]');
  const feet = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-foot-icon]')].map(svg => {
    const parts = (name: string) => [...svg.querySelectorAll(`[data-foot-part="${name}"]`)].map(n => { const b = (n as SVGGraphicsElement).getBBox(); return { width: b.width, height: b.height }; });
    // A toe path runs from the ankle outward: its first and last points.
    const toes = [...svg.querySelectorAll('[data-foot-part="toe"]')].map(n => {
      const nums = (n.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g)!.map(Number);
      return { start: [nums[0], nums[1]], end: [nums[nums.length - 2], nums[nums.length - 1]] };
    });
    const area = (b: { width: number, height: number }[]) => b.reduce((sum, r) => sum + r.width * r.height, 0);
    return [svg.getAttribute('data-foot-icon'), { tarsus: parts('tarsus').length, toes, claws: parts('claw'), web: area(parts('web')), lobes: parts('lobe').length, spicules: parts('spicules').length }];
  })));
  expect(Object.keys(feet)).toEqual(['perching', 'raptor', 'climbing', 'webbed', 'wading', 'shorebird', 'lobed', 'gamebird', 'osprey']);
  for (const [id, f] of Object.entries(feet) as any) {
    expect(f.tarsus, id).toBe(1);
    expect(f.toes.length, id).toBeGreaterThanOrEqual(3);
    expect(f.claws.length, id + ' every toe ends in a claw').toBe(f.toes.length);
  }
  // Climber: two toes up the trunk and two down.
  const up = feet.climbing.toes.filter((t: any) => t.end[1] < t.start[1]).length;
  expect([up, feet.climbing.toes.length - up]).toEqual([2, 2]);
  // Osprey: two toes forward, two swung back, with spiny pads.
  const left = feet.osprey.toes.filter((t: any) => t.end[0] < t.start[0]).length;
  expect([left, feet.osprey.toes.length - left]).toEqual([2, 2]);
  expect(feet.osprey.spicules).toBe(1);
  // Full web versus a small web at the toe bases; lobes on each toe.
  expect(feet.webbed.web).toBeGreaterThan(feet.shorebird.web * 4);
  expect(feet.lobed.lobes).toBe(6);
  // Raptor claws dwarf a duck's.
  const size = (c: { width: number, height: number }[]) => Math.max(...c.map(r => Math.max(r.width, r.height)));
  expect(size(feet.raptor.claws)).toBeGreaterThan(size(feet.webbed.claws) * 2);
  // Gamebird: the hind toe is held clear of the ground the front toes stand on.
  const ends = feet.gamebird.toes.map((t: any) => t.end[1]);
  expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(6);
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-foot-icon]')!.closest('.rounded-2xl'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  expect(errors).toEqual([]);
});
