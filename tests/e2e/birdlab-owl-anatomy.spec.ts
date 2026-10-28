import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Maine owl line-up figures: folded wings at the body's sides, lidded eyes
// with a catchlight, feathered toes with talons on the ground line, and pale
// brows only on the horned owls. Scale, tufts and eye colour are covered by
// 43-birdlab-owl-lineup.spec.ts.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], width: 1100, height: 900, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('each owl has folded wings, lidded eyes and taloned toes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'owls' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-owl-lineup] [data-owl]');
  const owls = await page.evaluate(() => [...document.querySelectorAll('[data-owl]')].map(g => {
    const box = (el: Element) => (el as SVGGraphicsElement).getBBox();
    const body = box(g.querySelector('[data-owl-part="body"]')!), wings = [...g.querySelectorAll('[data-owl-part="wing"]')].map(box);
    const fig = box(g.querySelector('[data-owl-figure]')!);
    const eyes = [...g.querySelectorAll('[data-owl-eye]')] as SVGCircleElement[];
    // Each eye is followed by its pupil, catchlight and lid.
    const eyeDetail = eyes.map(e => { const pupil = e.nextElementSibling!, glint = pupil.nextElementSibling!, lid = glint.nextElementSibling!;
      return { glint: glint.getAttribute('fill') === '#ffffff', lid: lid.tagName === 'path' && Number(lid.getAttribute('opacity')) > .5 }; });
    return { name: g.getAttribute('data-owl'), tufts: g.querySelectorAll('[data-owl-part="tuft"]').length,
      wingsInside: wings.length === 2 && wings.every(w => w.x >= body.x - 1 && w.x + w.width <= body.x + body.width + 1),
      wingsBothSides: wings.length === 2 && wings[0].x + wings[0].width / 2 < body.x + body.width / 2 && wings[1].x + wings[1].width / 2 > body.x + body.width / 2,
      eyeDetail, feetOnLine: Math.abs(fig.y + fig.height) < Math.max(2, fig.height * .03),
      // Two sets of talons, each ending at the ground line beneath the body.
      talons: [...g.querySelectorAll('path')].filter(p => p.getAttribute('stroke') === '#1f1a17' && / q /.test(p.getAttribute('d') || '')).map(box).filter(t => Math.abs(t.y + t.height) < Math.max(1.5, fig.height * .03) && t.x > body.x && t.x + t.width < body.x + body.width).length,
      brow: [...g.querySelectorAll('path')].some(p => p.getAttribute('stroke') === '#f3ece0') };
  }));
  expect(owls).toHaveLength(8);
  for (const o of owls) {
    expect(o.wingsInside, o.name!).toBe(true);
    expect(o.wingsBothSides, o.name!).toBe(true);
    expect(o.eyeDetail, o.name!).toEqual([{ glint: true, lid: true }, { glint: true, lid: true }]);
    expect(o.feetOnLine, o.name!).toBe(true);
    expect(o.talons, o.name!).toBe(2);
  }
  const brows = Object.fromEntries(owls.map(o => [o.name, o.brow]));
  expect(brows['Great Horned Owl']).toBe(true); expect(brows['Eastern Screech-Owl']).toBe(true); expect(brows['Long-eared Owl']).toBe(true);
  for (const name of ['Snowy Owl', 'Barred Owl', 'Northern Saw-whet Owl', 'Boreal Owl', 'Short-eared Owl']) expect(brows[name], name).toBe(false);
  expect(errors).toEqual([]);
});
