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

  test('full screen shows what the tree COSTS, not only what limits it', async ({ page }) => {
    // "What limits a tree, what it costs to stay alive, and how it makes more of
    // itself" is the tool's own subtitle. Full screen showed the first third.
    await mount(page, 70, true);
    const conds = page.locator('[data-tree-fullconds="true"]');
    await expect(conds.getByText(/This year/)).toBeVisible();
    await expect(conds.getByText(/Made/)).toBeVisible();
    await expect(conds.getByText(/Spent staying alive/)).toBeVisible();
    await expect(conds.getByText(/Left to grow with/)).toBeVisible();

    // Every mass in this engine is CARBON. A bare "kg" reads as biomass and is about
    // double; the tool has a guard for exactly this and it must hold here too.
    const text = (await conds.innerText()) || '';
    expect(text).toMatch(/kg C/);
    expect(text, 'a bare kg in the budget reads as biomass').not.toMatch(/(\d)\s*kg(?!\s*C)/);
  });

  test('a tree spending more than it earns says so', async ({ page }) => {
    // The fact behind every carbon-starvation death in this model, and it was invisible
    // in the view a student actually watches. A MATURE tree is required: a small one's
    // respiration is too low to be pushed negative.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    const net = await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 80 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({
        treeLab: {
          view: 'grow', speciesId: 'oak', tree: t, viewerFull: true,
          bandOverride: 'g68', soilWater: 0.02, light: 0.03, co2ppm: 200, tempC: 4,
        },
      });
      return null;
    });
    void net;
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2600);
    const conds = page.locator('[data-tree-fullconds="true"]');
    await expect(conds.getByText(/living off its reserves/)).toBeVisible();
  });

  async function mountAt(page: import('@playwright/test').Page, env: Record<string, number>) {
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate((e) => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 70 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({
        treeLab: {
          view: 'grow', speciesId: 'oak', tree: t, viewerFull: true, bandOverride: 'g68',
          co2ppm: 420, ...e,
        },
      });
    }, env);
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2800);
    return page.evaluate(() => (window as any).__alloTreeLabScene);
  }

  test('ground cover is drawn from the light, not decoration', async ({ page }) => {
    // The empty foreground was a uniform scatter that ignored the tree entirely. Ground
    // cover now thins under a canopy using the SAME Beer-Lambert extinction the engine
    // uses to shade a tree's own leaves — so it illustrates a number the model already
    // computes rather than inventing an ecosystem.
    const bright = await mountAt(page, { light: 0.95, soilWater: 0.65, tempC: 22 });
    expect(bright, 'scene probe missing').toBeTruthy();
    // A canopy must actually intercept light, or there is nothing being illustrated.
    expect(bright.floorLight).toBeLessThan(bright.lightLevel);
    expect(bright.canopyLai).toBeGreaterThan(0);

    const shade = await mountAt(page, { light: 0.18, soilWater: 0.75, tempC: 20 });
    expect(shade.floorLight).toBeLessThan(bright.floorLight);
    expect(shade.groundCover, 'deep shade must thin the understorey')
      .toBeLessThan(bright.groundCover);
    // …but never clear it entirely: bare earth under a dense canopy is the point,
    // an empty frame is the defect this replaced.
    expect(shade.groundCover).toBeGreaterThan(0);
  });

  test('a place writes real conditions, it is not a costume', async ({ page }) => {
    // The engine has no biome term, so a rainforest/desert picker would be scenery the
    // model cannot back — and would owe the same disclaimer the season panel carries.
    // These presets write light/water/temperature the engine already models, so the
    // limiting factor moves with them. That is what makes them honest.
    await mount(page, 70, true);
    const conds = page.locator('[data-tree-fullconds="true"]');
    await conds.getByRole('button', { name: /Deep shade/ }).click();
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const d = (window as any).__toolData?.treeLab || {};
      return { light: d.light, soilWater: d.soilWater, tempC: d.tempC };
    });
    expect(state.light).toBeCloseTo(0.18, 5);
    expect(state.soilWater).toBeCloseTo(0.75, 5);
    expect(state.tempC).toBe(20);

    // And the consequence the student is meant to notice.
    await expect(page.locator('[data-tree-fullhud="true"]').getByText(/Limiting now: Light/)).toBeVisible();
  });

  test('a dead tree reports no income and no limiting factor', async ({ page }) => {
    // live.gross is computed from stored leafArea whether or not the tree is alive, so
    // the panel used to show "This tree has died" and "Left to grow with 47 kg C" in
    // the same column — a corpse with a healthy income, and a limiting-factor line
    // inviting the student to go and fix it. Same claim-audit class as the post-mortem
    // trusting a stale flag: a surface must not report a number its own state could
    // not produce.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 70 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      t.alive = false; t.causeOfDeath = 'carbon_starvation';
      (window as any).__mount({
        treeLab: {
          view: 'grow', speciesId: 'oak', tree: t, viewerFull: true, bandOverride: 'g68',
          soilWater: 0.75, light: 0.85, co2ppm: 420, tempC: 22,
        },
      });
    });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2600);

    const hud = page.locator('[data-tree-fullhud="true"]');
    await expect(hud.getByText(/This tree has died/)).toBeVisible();
    await expect(hud.getByText(/Limiting now/)).toHaveCount(0);

    const conds = page.locator('[data-tree-fullconds="true"]');
    await expect(conds.getByText(/A dead tree makes no sugar/)).toBeVisible();
    await expect(conds.getByText(/Nothing limits a dead tree/)).toBeVisible();
    const text = (await conds.innerText()) || '';
    expect(text, 'no fabricated income for a corpse').not.toMatch(/Left to grow with/);
    expect(text).not.toMatch(/is the limit right now/);
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

  test('the investigation shows the prediction it asks you to compare, and keeps your words', async ({ page }) => {
    // Two defects of the same kind: the Explain step said "compare predicted and
    // observed" while displaying only observed (the prediction was shown in the
    // PREVIOUS phase and vanished exactly when it was needed), and the explanation
    // the student wrote was stored on the trial record and never displayed again.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      // A YOUNG tree on purpose. Every phase change in this flow rebuilds the whole
      // WebGL scene synchronously, and this file runs its tests three-up against a
      // software rasteriser; a mature crown made those rebuilds slow enough that the
      // click handler itself blocked past the default 30s action timeout. The
      // investigation logic under test does not care how big the tree is.
      for (let i = 0; i < 18 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      // Dry soil: water dominates. Predicting water + thrive is half right, which is
      // the state a single matched/not-matched flag could not express.
      (window as any).__mount({ treeLab: { view: 'grow', speciesId: 'oak', tree: t, soilWater: 0.15, light: 0.9 } });
    });
    await page.waitForSelector('canvas', { timeout: 30000 });

    // Each click below drives a phase change; wait for the NEXT phase's own control
    // rather than a fixed delay, and allow for a slow rebuild while doing it.
    const SLOW = { timeout: 90_000 };
    await page.selectOption('#treelab-experiment-years', '10', SLOW);
    await page.getByRole('button', { name: /Start investigation/ }).click(SLOW);
    await expect(page.locator('#treelab-predict-limit')).toBeVisible(SLOW);
    await page.selectOption('#treelab-predict-limit', 'water', SLOW);
    await page.selectOption('#treelab-predict-outcome', 'thrive', SLOW);
    await page.fill('#treelab-predict-reason', 'Oaks are tough so it should cope.', SLOW);
    await page.getByRole('button', { name: /Lock prediction/ }).click(SLOW);
    const runBtn = page.getByRole('button', { name: /Run trial/ });
    await expect(runBtn).toBeVisible(SLOW);
    await runBtn.click(SLOW);
    await expect(page.locator('#treelab-explanation')).toBeVisible(SLOW);

    // Both sides of the comparison are on screen at the same time.
    await expect(page.getByText(/You said/)).toBeVisible();
    await expect(page.getByText(/The trial showed/)).toBeVisible();
    await expect(page.getByText(/You had one of the two right/)).toBeVisible();
    // The pre-run reasoning comes back to be argued with.
    await expect(page.getByText(/Oaks are tough so it should cope/)).toBeVisible();

    const words = 'Water set the limit every year and net carbon went negative.';
    await page.fill('#treelab-explanation', words, SLOW);
    await page.getByRole('button', { name: /A · Save trial/ }).click(SLOW);

    // The notebook keeps the reasoning next to the evidence. Scoped to slot A: the
    // same sentence is legitimately on screen twice, in the live textarea and in the
    // saved slot, and an unscoped match cannot tell which one it found.
    const keptA = page.locator('[data-trial-explanation="A"]');
    await expect(keptA).toBeVisible(SLOW);
    await expect(keptA).toContainText(words);
    await expect(page.getByText(/You predicted:/)).toBeVisible();

    // ...and the year-by-year limiter strip added earlier is still in the slot,
    // which inserting two blocks around it could have quietly displaced.
    const stripCount = await page.evaluate(() =>
      document.querySelectorAll('[aria-label^="Limiting factor, year by year"]').length);
    expect(stripCount, 'saved slot keeps its limiter strip').toBeGreaterThan(0);
  });

  test('the A/B notebook names the changed variable, and refuses to pick one of two', async ({ page }) => {
    // A controlled experiment is same start AND one changed variable. The panel
    // used to check only the starting tree; now it diffs the stored treatments.
    // Both verdicts are pinned: the single-cause claim, and the refusal to make it.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      // Young on purpose — see the note in the prediction test: every phase change
      // rebuilds the WebGL scene synchronously, and a mature crown can block the
      // click handler past the default action timeout when this file runs three-up.
      for (let i = 0; i < 18 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({ treeLab: { view: 'grow', speciesId: 'oak', tree: t, soilWater: 0.15, light: 0.9 } });
    });
    await page.waitForSelector('canvas', { timeout: 30000 });

    const SLOW = { timeout: 90_000 };
    async function runTrial(limiter: string) {
      await expect(page.locator('#treelab-predict-limit')).toBeVisible(SLOW);
      await page.selectOption('#treelab-predict-limit', limiter, SLOW);
      await page.selectOption('#treelab-predict-outcome', 'struggle', SLOW);
      await page.getByRole('button', { name: /Lock prediction/ }).click(SLOW);
      const run = page.getByRole('button', { name: /Run trial/ });
      await expect(run).toBeVisible(SLOW);
      await run.click(SLOW);
      await expect(page.locator('#treelab-explanation')).toBeVisible(SLOW);
    }

    await page.selectOption('#treelab-experiment-years', '10', SLOW);
    await page.getByRole('button', { name: /Start investigation/ }).click(SLOW);
    await runTrial('water');
    await page.getByRole('button', { name: /A · Save trial/ }).click(SLOW);

    // B differs from A by exactly one variable.
    const prepBtn = page.getByRole('button', { name: /Prepare Trial B from A/ });
    await expect(prepBtn).toBeVisible(SLOW);
    await prepBtn.click(SLOW);
    // Prepare drops straight into the predict phase (freshExperiment), so there is no
    // Start button here — the predict controls are the signal that it landed. The
    // conditions are deliberately editable during prediction; that is how B is set.
    await expect(page.locator('#treelab-predict-limit')).toBeVisible(SLOW);
    await page.evaluate(() => {
      (window as any).__ctx.updateMulti('treeLab', { soilWater: 0.7 });
      (window as any).__rerender();
    });
    await runTrial('light');
    await page.getByRole('button', { name: /B · Save trial/ }).click(SLOW);

    const one = page.getByText(/One variable changed/);
    await expect(one).toBeVisible();
    await expect(page.getByText(/Soil water 15% → 70%/)).toBeVisible();
    await expect(page.getByText(/this change caused it/)).toBeVisible();

    // Redo B with TWO changes: the panel must refuse to attribute.
    await page.getByRole('button', { name: /Clear trial/ }).last().click(SLOW);
    const prep2 = page.getByRole('button', { name: /Prepare Trial B from A/ });
    await expect(prep2).toBeVisible(SLOW);
    await prep2.click(SLOW);
    await expect(page.locator('#treelab-predict-limit')).toBeVisible(SLOW);
    await page.evaluate(() => {
      (window as any).__ctx.updateMulti('treeLab', { soilWater: 0.7, light: 0.4 });
      (window as any).__rerender();
    });
    await runTrial('light');
    await page.getByRole('button', { name: /B · Save trial/ }).click(SLOW);

    await expect(page.getByText(/2 things changed/)).toBeVisible();
    await expect(page.getByText(/cannot be pinned on any one of them/)).toBeVisible();
    await expect(page.getByText(/One variable changed/)).toHaveCount(0);
  });

  test('the tool root neither shrink-wraps nor stretch-clips in a flex mount', async ({ page }) => {
    // The harness wrap is display:flex with a fixed height — exactly the two flex
    // behaviours that bit: a block child shrink-wraps to fit-content (the tool was a
    // different width on every tab, as wide as its widest fixed element) and a fixed
    // cross-axis STRETCHES the item to it (content past 820px overflowed the painted
    // background). The quiz view is the probe because it has no wide fixed element to
    // mask the width bug, and the spread view because it is taller than the wrap.
    await page.setViewportSize({ width: 1400, height: 820 });
    await page.goto(`${(harness as any).base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
    await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 40 && t.alive; i++) {
        t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 },
          { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 });
      }
      (window as any).__mount({ treeLab: { view: 'quiz', speciesId: 'oak', tree: t } });
    });
    await page.waitForSelector('.allo-tree-lab', { timeout: 30000 });

    const quiz = await page.evaluate(() => {
      const wrap = document.getElementById('wrap')!.getBoundingClientRect();
      const tool = document.querySelector('.allo-tree-lab')!.getBoundingClientRect();
      return { wrapW: wrap.width, toolW: tool.width };
    });
    expect(Math.abs(quiz.toolW - quiz.wrapW), 'full width on a narrow-content tab').toBeLessThan(2);

    await page.evaluate(() => {
      (window as any).__ctx.updateMulti('treeLab', { view: 'compare' });
      (window as any).__rerender();
    });
    await page.waitForTimeout(400);
    const cmp = await page.evaluate(() => {
      const el = document.querySelector('.allo-tree-lab') as HTMLElement;
      const r = el.getBoundingClientRect();
      return { boxH: r.height, contentH: el.scrollHeight, w: r.width };
    });
    // The painted box must contain the content: a stretched 820px box under a
    // 2000px column of cards is the background falling off mid-page.
    expect(cmp.boxH, 'painted box covers the content').toBeGreaterThanOrEqual(cmp.contentH - 2);
    expect(Math.abs(cmp.w - quiz.wrapW)).toBeLessThan(2);
  });
});
