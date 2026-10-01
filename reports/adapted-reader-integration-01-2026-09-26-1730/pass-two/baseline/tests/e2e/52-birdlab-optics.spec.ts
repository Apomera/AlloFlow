/**
 * Bird Lab — Birding Optics: what "8x42" means, drawn to scale.
 *
 * The guide lists 7x35, 8x42 and 10x42 binoculars in prose. The picture now
 * shows the same round view with the bird that many times bigger, the front
 * lens to scale and the exit pupil (front lens / magnification) to scale.
 * These checks measure those proportions and read the printed values.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'optics' } }));
  await page.waitForSelector('[data-optics-figure]');
}

test('bird size follows magnification; lens and exit pupil are to scale', async ({ page }) => {
  await mount(page);
  const m = await page.evaluate(() => [...document.querySelectorAll('[data-optics-model]')].map((g) => {
    const bird = g.querySelector('[data-optics-bird]') as SVGGraphicsElement;
    const lens = g.querySelector('[data-optics-lens]') as SVGGraphicsElement | null;
    const exit = g.querySelector('[data-optics-exit]') as SVGGraphicsElement | null;
    const bb = bird.getBoundingClientRect();
    return { id: g.getAttribute('data-optics-model'), birdW: bb.width, lens: lens ? lens.getBBox().width : null,
      exit: exit ? exit.getBBox().width : null, text: g.textContent };
  }));
  expect(m.map((x) => x.id)).toEqual(['eye', '7x35', '8x42', '10x42']);
  const by = Object.fromEntries(m.map((x) => [x.id, x]));
  // The bird is 7, 8 and 10 times its unaided size.
  for (const [id, mag] of [['7x35', 7], ['8x42', 8], ['10x42', 10]] as const) expect(by[id].birdW / by.eye.birdW).toBeCloseTo(mag, 0);
  expect(by['10x42'].birdW / by['8x42'].birdW).toBeCloseTo(1.25, 2);
  // Front lens diameters in proportion 35 : 42.
  expect(by['8x42'].lens! / by['7x35'].lens!).toBeCloseTo(42 / 35, 2);
  expect(by['10x42'].lens).toBeCloseTo(by['8x42'].lens!, 3);
  // Exit pupil = front lens / magnification: 5, 5.25 and 4.2 mm.
  expect(by['8x42'].exit! / by['7x35'].exit!).toBeCloseTo(5.25 / 5, 2);
  expect(by['10x42'].exit! / by['8x42'].exit!).toBeCloseTo(4.2 / 5.25, 2);
  expect(by['7x35'].text).toContain('5 mm exit pupil');
  expect(by['8x42'].text).toContain('5.3 mm exit pupil');
  expect(by['10x42'].text).toContain('4.2 mm exit pupil');
  expect(by['8x42'].text).toContain('42 mm front lens');
});
