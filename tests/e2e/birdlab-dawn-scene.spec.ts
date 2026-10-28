import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// The illustrated dawn chorus scene: the sun climbs on an eased transform,
// low light dims the birds before sunrise, mist and stars give way to the
// morning, voice marks pulse only for singing birds, and reduced motion
// keeps everything still.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, reduced: boolean) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.setViewportSize({ width: 1200, height: 1000 });
  await harness.mount(page, { birdLab: { view: 'dawnChorus' } }, undefined, { expectCanvas: false });
  await page.waitForSelector('[data-birdlab-dawn-workbench]');
  return errors;
}
function frame(page: Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as SVGElement;
    const singing = [...document.querySelectorAll('[data-dawn-singing="true"]')].map(n => n.getAttribute('data-dawn-scene-bird'));
    const voices = [...document.querySelectorAll('[data-dawn-voice]')].map(n => n.getAttribute('data-dawn-voice'));
    const veil = q('[data-dawn-veil]'), bird = q('[data-dawn-scene-bird]'), voice = q('[data-dawn-voice]');
    return {
      sunY: Number(/translateY\(([-\d.]+)px\)/.exec(q('[data-dawn-sun]').style.transform)![1]),
      veil: Number(veil.getAttribute('opacity')), stars: Number(q('[data-dawn-stars]').getAttribute('opacity')),
      mist: Number(q('[data-dawn-mist]').getAttribute('opacity')), reflection: Number(q('[data-dawn-reflection]').getAttribute('opacity')),
      singing, voices,
      // The veil sits above every bird and below every voice mark and ring.
      layered: !!(bird.compareDocumentPosition(veil) & Node.DOCUMENT_POSITION_FOLLOWING) && (!voice || !!(veil.compareDocumentPosition(voice) & Node.DOCUMENT_POSITION_FOLLOWING)),
      motion: {
        twinkle: getComputedStyle(q('.birdlab-dawn-twinkle')).animationName, mist: getComputedStyle(q('.birdlab-dawn-mist')).animationName,
        voice: voice ? getComputedStyle(voice).animationName : 'none', sun: getComputedStyle(q('[data-dawn-sun]')).transitionDuration
      }
    };
  });
}
for (const reduced of [false, true]) {
  test(`morning phases light the scene in order (${reduced ? 'reduced motion' : 'motion'})`, async ({ page }) => {
    const errors = await mount(page, reduced), frames = [];
    for (let phase = 0; phase < 4; phase++) {
      await page.locator('#birdlab-dawn-phase').fill(String(phase));
      await expect(page.locator('[data-birdlab-dawn-workbench]')).toHaveAttribute('data-dawn-phase', String(phase));
      frames.push(await frame(page));
    }
    for (let i = 1; i < 4; i++) {
      expect(frames[i].sunY, 'the sun climbs').toBeLessThan(frames[i - 1].sunY);
      expect(frames[i].veil).toBeLessThanOrEqual(frames[i - 1].veil);
      expect(frames[i].stars).toBeLessThanOrEqual(frames[i - 1].stars);
      expect(frames[i].mist).toBeLessThanOrEqual(frames[i - 1].mist);
    }
    expect(frames[0].veil).toBeGreaterThan(.3); expect(frames[3].veil).toBe(0);
    expect(frames[0].stars).toBe(1); expect(frames[3].stars).toBe(0); expect(frames[3].mist).toBe(0);
    expect(frames[0].reflection).toBe(0); expect(Math.max(...frames.map(f => f.reflection))).toBe(frames[2].reflection);
    for (const f of frames) {
      expect(f.voices).toEqual(f.singing);
      expect(f.layered).toBe(true);
      if (reduced) expect(f.motion).toEqual({ twinkle: 'none', mist: 'none', voice: 'none', sun: expect.stringMatching(/^0s$|^1e-05s$/) });
      else {
        expect(f.motion.twinkle).toBe('birdlab-dawn-twinkle'); expect(f.motion.mist).toBe('birdlab-dawn-drift');
        if (f.voices.length) expect(f.motion.voice).toBe('birdlab-dawn-voice');
        expect(f.motion.sun).toBe('1.4s');
      }
    }
    const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-dawn-workbench]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
    expect(axe).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('low light really dims the birds before sunrise', async ({ page }) => {
  await mount(page, true);
  const mean = async () => {
    const png = await page.locator('[data-dawn-scene-bird="robin"]').screenshot({ animations: 'disabled' });
    return page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d')!; g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
      let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]; return sum / (d.length / 4) / 3;
    }, png.toString('base64'));
  };
  await page.locator('#birdlab-dawn-phase').fill('0'); const night = await mean();
  await page.locator('#birdlab-dawn-phase').fill('3'); const day = await mean();
  expect(night).toBeLessThan(day * .8);
});
