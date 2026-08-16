/**
 * Tree Life Lab: full screen as an actual full screen, and a camera that frames
 * whatever tree it is pointed at.
 *
 * Everything here needs a browser, and every defect it covers passed every static
 * check in the repo before a screenshot found it.
 *
 *  1. THE STAGE WAS NEVER ON TOP. It is `position: fixed` with a high z-index, which
 *     ought to be enough and was not, for two reasons nothing in the markup shows:
 *     `position: sticky` on an ancestor ALWAYS creates a stacking context whatever its
 *     z-index, and `.allo-tree-lab` sets `isolation: isolate` for a second one. So the
 *     tool's own hero header painted straight over the "full screen" scene, and the
 *     hub's toolbar sat above both. Full screen was a big canvas with the page still
 *     on top of it.
 *
 *  2. THE CAMERA FRAMED ONE TREE SIZE. The shell takes a single home distance for the
 *     life of the tool. A 0.4 m seedling was a speck in an empty field and a 20 m oak
 *     had its crown cropped off the top and both sides.
 *
 *  3. …AND FITTING EVERY TREE IS ALSO WRONG. A camera that simply frames its subject
 *     makes every tree the same size on screen, which deletes the one thing this tool
 *     is about. The camera may only ever move OUT from a baseline. That property is
 *     asserted directly, because it is the easiest thing here to "improve" away.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000 });

test.describe('Tree Life Lab immersive stage', () => {
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_treelab.js',
    toolId: 'treeLab',
    preScripts: ['stem_lab/stem_lab_module.js'],
    // The tool's own layout CSS is injected by the tool, but the stage relies on the
    // app bundle for the flex/grid context it stretches into. Without it the canvas
    // never takes the viewport and the framing probe reads a 520px column.
    appStyles: true,
    width: 1400,
    height: 820,
  });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  async function mount(page: import('@playwright/test').Page, years: number, full = false) {
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(([y, f]) => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < (y as number) && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({ treeLab: { view: 'grow', speciesId: 'oak', tree: t, viewerFull: !!f } });
    }, [years, full] as [number, boolean]);
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2600);
  }

  const fsButton = (page: import('@playwright/test').Page) =>
    page.locator('button[aria-label="Full screen"], button[aria-label="Exit full screen"]');

  test('entering full screen hides the page chrome, leaving returns it', async ({ page }) => {
    await mount(page, 40);

    const hero = page.locator('.allo-tree-hero');
    await expect(hero).toBeVisible();
    expect(await page.evaluate(() => document.body.classList.contains('allo-treelab-immersive'))).toBe(false);

    await fsButton(page).click();
    await page.waitForTimeout(700);

    // The tool's own header is gone, not merely painted over.
    await expect(hero).toBeHidden();
    // The hub's toolbar lives in a file this tool must not edit, so it is hidden by a
    // body class instead. The class IS the coupling — pin it.
    expect(await page.evaluate(() => document.body.classList.contains('allo-treelab-immersive'))).toBe(true);
    // And the stage must no longer be trapped in a stacking context it cannot escape.
    const escaped = await page.evaluate(() => {
      const sticky = document.querySelector('.allo-tree-lab.is-full .allo-tree-workbench-sticky');
      const root = document.querySelector('.allo-tree-lab.is-full');
      if (!sticky || !root) return null;
      return {
        stickyPos: getComputedStyle(sticky as Element).position,
        isolation: getComputedStyle(root as Element).isolation,
      };
    });
    expect(escaped).not.toBeNull();
    expect(escaped!.stickyPos).toBe('static');
    expect(escaped!.isolation).toBe('auto');

    // Nothing of the page may be painted over the middle of the scene.
    const atCentre = await page.evaluate(() => {
      const el = document.elementFromPoint(700, 380);
      return el ? el.tagName : null;
    });
    expect(atCentre).toBe('CANVAS');

    await fsButton(page).click();
    await page.waitForTimeout(700);
    await expect(hero).toBeVisible();
    expect(await page.evaluate(() => document.body.classList.contains('allo-treelab-immersive'))).toBe(false);
  });

  test('full screen can run the simulation, not just look at it', async ({ page }) => {
    await mount(page, 40, true);
    // The clock and the drought are the two controls that CHANGE the tree. Before this
    // they were on the page behind the stage, so watching a tree grow at full size
    // meant leaving full size to press play.
    // The page's own playback card stays mounted behind the stage, so scope to the
    // full-screen toolbar explicitly rather than trusting document order.
    const bar = page.locator('[data-tree-fullbar="true"]');
    await expect(bar.getByRole('button', { name: /Play/ })).toBeVisible();
    await expect(bar.getByRole('button', { name: /Drought/ })).toBeVisible();
    await expect(bar.getByRole('button', { name: '1 yr/s' })).toBeVisible();
    // Season names, not four bare emoji at the end of a long bar.
    for (const s of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      await expect(bar.getByRole('button', { name: new RegExp(s) }).first()).toBeVisible();
    }
    // And the read-out the picture is a picture OF.
    await expect(page.locator('[data-tree-fullhud="true"]').getByText(/age \d+ yr/)).toBeVisible();
  });

  test('full screen closes the causal loop: conditions in, limit out', async ({ page }) => {
    // The tool's whole subject is what LIMITS a tree. Full screen could show the tree
    // and trigger a drought, but the three conditions that drive the lesson were on the
    // page behind the stage, so the loop could not be run in the view where the tree is
    // actually legible.
    await mount(page, 60, true);
    const conds = page.locator('[data-tree-fullconds="true"]');
    await expect(conds).toBeVisible();
    await expect(conds.getByLabel(/Light/)).toBeVisible();
    await expect(conds.getByLabel(/Soil water/)).toBeVisible();

    // Slider ids are built from their key, and the page's own Conditions card stays
    // mounted behind the stage. Two elements sharing an id silently breaks every
    // label/htmlFor pairing on screen, so the full-screen copies are prefixed.
    const dupes = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id^="treelab-"]')).map((e) => e.id);
      return ids.filter((v, i) => ids.indexOf(v) !== i);
    });
    expect(dupes, 'duplicate DOM ids between the page and full-screen sliders').toEqual([]);
  });

  test('a drought names WATER as the limit, never CO2', async ({ page }) => {
    // The one claim this tool exists to make, and the easiest to get backwards. Under
    // drought the CO2 term genuinely IS the smallest number; reporting it would send a
    // student off to add CO2, which the tool itself teaches is useless while the
    // stomata are shut. Attribution, not arithmetic.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 60 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({
        treeLab: {
          view: 'grow', speciesId: 'oak', tree: t, viewerFull: true,
          band: 'g68', soilWater: 0.12, light: 0.85, co2ppm: 420, tempC: 22,
        },
      });
    });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2600);

    // Scope to the full-screen HUD: the page header carries the same chip behind the
    // stage, so an unscoped match is ambiguous rather than wrong.
    const hud = page.locator('[data-tree-fullhud="true"]');
    await expect(hud.getByText(/Limiting now: Water/)).toBeVisible();
    await expect(hud.getByText(/stomata closed/)).toBeVisible();
    const why = page.locator('[data-tree-fullconds="true"]');
    await expect(why.getByText(/Water is the limit/)).toBeVisible();
  });

  test('the camera frames the tree it is actually pointed at', async ({ page }) => {
    await mount(page, 90, true);
    const big = await page.evaluate(() => (window as any).__alloTreeLabCam);
    expect(big, 'framing must have run').toBeTruthy();
    expect(big.aspect).toBeGreaterThan(1.4);      // measured from the CANVAS, not the div
    expect(big.extent.radius).toBeGreaterThan(0); // measured crown reach, not nominal crownR

    // A mature crown must fit the frame it is drawn into, with margin.
    const tanHalf = Math.tan((42 * Math.PI) / 360);
    expect(big.extent.halfV).toBeLessThan(big.dist * tanHalf);
    expect(big.extent.radius).toBeLessThan(big.dist * tanHalf * big.aspect);
  });

  test('a seedling does not get zoomed up to the size of a mature tree', async ({ page }) => {
    await mount(page, 3, true);
    const small = await page.evaluate(() => (window as any).__alloTreeLabCam);
    const BASE = await page.evaluate(() => (window as any).__alloTreeLabEngine.BASE_DIST);

    // THE property. Fitting each tree independently would make every tree fill the
    // frame equally and destroy the growth cue, so the camera is pinned AT the baseline
    // for anything small enough not to need more room.
    expect(small.dist).toBe(BASE);

    // Stated as what a viewer sees: a seedling occupies well under half the frame.
    const tanHalf = Math.tan((42 * Math.PI) / 360);
    const share = small.extent.halfV / (small.dist * tanHalf);
    expect(share).toBeLessThan(0.5);
    expect(share, 'but not so small it is a speck in a field').toBeGreaterThan(0.15);
  });
});
