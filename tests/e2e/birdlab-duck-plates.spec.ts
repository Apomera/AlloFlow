import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Waterfowl plates: each male/female figure is a duck body with a folded wing,
// a shaped head sized for the species, a bill that matches its group (flat
// dabbler bill with nail and nostril unless thin, wedge or goose-type), an eye
// highlight, and ripples on the water.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('every species plate draws two complete duck figures', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'waterfowl' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-waterfowl-plate]');
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-waterfowl-plate]')].length);
  expect(names).toBe(1);
  const picker = page.locator('button.rounded-lg.text-xs');
  const count = await picker.count();
  expect(count).toBeGreaterThanOrEqual(15);
  const rows: any[] = [];
  for (let i = 0; i < count; i++) {
    const label = (await picker.nth(i).textContent())!.trim();
    if (!label || label === '← Menu') continue;
    await picker.nth(i).click();
    rows.push(await page.evaluate(label => {
      const plate = document.querySelector('[data-waterfowl-plate]')!;
      const figs = [...plate.querySelectorAll('[data-duck-figure]')].map(svg => {
        const has = (p: string) => !!svg.querySelector(`[data-duck-part="${p}"]`);
        const head = svg.querySelector('[data-duck-part="head"]') as SVGGraphicsElement;
        const box = head.getBBox(), m = head.getCTM()!;
        return { body: has('body'), wing: has('wing'), ripples: has('ripples'), dabbler: has('dabbler-bill'), fan: has('fan-patch'),
          glint: !!svg.querySelector('circle[fill="#ffffff"]'), headWidth: box.width * m.a,
          clip: svg.querySelector('clipPath')!.id };
      });
      return { label, plate: plate.getAttribute('data-waterfowl-plate'), figs };
    }, label));
  }
  const byName = Object.fromEntries(rows.map(r => [r.label, r]));
  const clips = rows.flatMap(r => r.figs.map((f: any) => f.clip));
  for (const r of rows) {
    expect(r.figs, r.label).toHaveLength(2);
    for (const f of r.figs) {
      expect([f.body, f.wing, f.ripples, f.glint], r.label).toEqual([true, true, true, true]);
      expect(f.clip.startsWith('wfB-'), r.label).toBe(true);
    }
  }
  // Dabblers carry the flat bill with its nail; mergansers, eiders and geese do not.
  expect(byName['Mallard'].figs.every((f: any) => f.dabbler)).toBe(true);
  for (const name of ['Hooded Merganser', 'Common Eider', 'Canada Goose', 'Mute Swan']) expect(byName[name].figs.some((f: any) => f.dabbler), name).toBe(false);
  // The hooded merganser drake shows his white fan.
  expect(byName['Hooded Merganser'].figs[0].fan).toBe(true);
  // Geese and swans have small heads on long necks.
  expect(byName['Canada Goose'].figs[0].headWidth).toBeLessThan(byName['Mallard'].figs[0].headWidth * .85);
  expect(new Set(clips).size, 'clip ids unique across plates').toBe(clips.length);
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-waterfowl-plate]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);
  expect(errors).toEqual([]);
});
