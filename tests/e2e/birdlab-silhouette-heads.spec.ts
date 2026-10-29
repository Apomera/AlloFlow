import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Silhouette quiz: birds are seen from below, head up, so a bill shows as a
// short tip above the head rather than a profile beak pointing sideways. Only
// the heron (folded neck, bill only) and the crested woodpecker keep authored
// profile heads.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('every quiz head faces up the way a bird overhead is seen', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'silhouetteQuiz' } }, undefined, { expectCanvas: false });
  const heads = new Map<string, any>();
  for (let i = 0; i < 120 && heads.size < 19; i++) {
    const head = await page.evaluate(() => {
      const el = document.querySelector('[data-sil-head]'); if (!el) return null;
      const d = el.getAttribute('d')!, kind = el.getAttribute('data-sil-head')!;
      const subs = d.split('M').filter(Boolean).map(sp => (sp.match(/-?[\d.]+/g) || []).map(Number));
      return { d, kind, subs };
    });
    if (head) heads.set(head.d, head);
    await page.getByRole('button', { name: /Next silhouette/ }).click().catch(() => {});
  }
  const all = [...heads.values()];
  expect(all.length).toBeGreaterThanOrEqual(15);
  // Authored heads are either bill-less skulls (nothing to turn) or the two
  // deliberate profiles: the heron's bill and the crested woodpecker.
  const profiles = all.filter(h => h.kind === 'authored' && / L/.test(h.d));
  expect(profiles.length).toBe(2);
  for (const h of all.filter(h => h.kind === 'facing-up')) {
    const skull = h.subs[0], bill = h.subs[h.subs.length - 1];
    const sx = skull.filter((_: number, i: number) => i % 2 === 0), sy = skull.filter((_: number, i: number) => i % 2 === 1);
    const [bx1, by1, tipX, tipY, bx2, by2] = bill;
    expect(h.subs.length, h.d).toBe(2);
    // The tip is the highest point and sits on the skull's centreline.
    expect(tipY, h.d).toBeLessThan(Math.min(...sy));
    expect(Math.abs(tipX - (Math.min(...sx) + Math.max(...sx)) / 2), h.d).toBeLessThan(3);
    // The bill base stays within the skull's width: nothing sticks out sideways.
    expect(Math.min(bx1, bx2), h.d).toBeGreaterThan(Math.min(...sx));
    expect(Math.max(bx1, bx2), h.d).toBeLessThan(Math.max(...sx));
    expect(by1, h.d).toBe(by2);
  }
  expect(errors).toEqual([]);
});
