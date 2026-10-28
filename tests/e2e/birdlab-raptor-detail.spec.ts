import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Raptor underside silhouettes: curved wing outlines that keep sharp primary
// fingers, flight-feather detail and identifying marks clipped inside each
// wing, barring only on the barred groups, tail feathers and a bill tip.
// Scale, shapes, tail ratios and marks are covered by 44-birdlab-raptor-lineup.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('wings carry feather detail and marks inside their own outline', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'raptors' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-raptor-lineup] [data-raptor]');
  const data = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('clipPath')].map(c => c.id);
    const birds = [...document.querySelectorAll('[data-raptor]')].map(g => {
      const wings = [...g.querySelectorAll('[data-raptor-part="wing"]')].map(w => w.getAttribute('d') || '');
      const clippedOk = (el: Element) => { const host = el.closest('[clip-path]'); const m = host && /url\(#([^)]+)\)/.exec(host.getAttribute('clip-path')!); return !!(m && document.getElementById(m[1])?.tagName === 'clipPath' && g.contains(host)); };
      return {
        name: g.getAttribute('data-raptor'), shape: g.getAttribute('data-raptor-shape'),
        curved: wings.every(d => / Q /.test(d)), corners: Math.min(...wings.map(d => (d.match(/ L /g) || []).length)),
        remiges: g.querySelectorAll('[data-raptor-detail="remiges"]').length, barring: g.querySelectorAll('[data-raptor-detail="barring"]').length,
        rectrices: g.querySelectorAll('[data-raptor-detail="rectrices"]').length, bill: g.querySelectorAll('[data-raptor-part="bill"]').length,
        // Wing marks only: the belly band sits on the body, outside any wing.
        detailClipped: [...g.querySelectorAll('[data-raptor-detail], [data-raptor-mark]:not([data-raptor-mark="bellyband"])')].every(clippedOk)
      };
    });
    return { unique: new Set(ids).size === ids.length, ids: ids.length, birds };
  });
  expect(data.unique).toBe(true);
  expect(data.ids).toBe(12 * 3);
  for (const b of data.birds) {
    expect(b.curved, b.name!).toBe(true);
    expect(b.remiges, b.name!).toBe(2);
    expect(b.rectrices, b.name!).toBe(1);
    expect(b.detailClipped, b.name!).toBe(true);
    expect(b.barring, b.name!).toBe(['buteo', 'accipiter', 'falcon', 'harrier'].includes(b.shape!) ? 6 : 0);
    expect(b.bill, b.name!).toBe(b.shape === 'eagle' ? 0 : 1);
    // Slotted primaries stay as sharp finger corners: two per finger plus the root.
    if (['eagle', 'vulture'].includes(b.shape!)) expect(b.corners, b.name!).toBeGreaterThanOrEqual(12);
    if (b.shape === 'buteo') expect(b.corners, b.name!).toBeGreaterThanOrEqual(8);
  }
  expect(errors).toEqual([]);
});
