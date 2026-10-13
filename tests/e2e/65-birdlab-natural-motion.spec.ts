import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// These checks sample what Chromium actually paints over time. Matching class
// names alone cannot detect SVG transform-box drift or a paused wing that keeps
// moving inside a stationary hit target.
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1280, height: 960,
  appStyles: true, layout: 'document',
});
const phase = process.env.BIRDLAB_QA_PHASE || 'current';
const output = resolve('reports/birdlab-natural-motion-2026-10-11', phase);
const habitats = ['forest', 'marsh', 'backyard', 'coast', 'mountain'];
test.describe.configure({ timeout: 180_000, retries: 0, mode: 'default' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, habitat: string, width = 1280, motion = true, qa: any = null) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab);
  await page.evaluate(({ habitat, width, motion, qa }) => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = '#0f172a'; wrap.style.color = '#e2e8f0';
    (window as any).__mount({ birdLab: { view: 'ispy', activeHabitat: habitat, blSceneMotion: motion } });
    if (qa) (window as any).__ctx.props.birdLabVisualQa = qa;
  }, { habitat, width, motion, qa });
  await expect(page.locator('[data-birdlab-scene-shell]')).toBeVisible();
  await page.locator('[data-birdlab-scene-shell]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  return errors;
}

async function frame(page: Page) {
  return page.evaluate(() => {
    const scene = document.querySelector('[data-birdlab-realistic-scene]') as SVGSVGElement;
    const shell = document.querySelector('[data-birdlab-scene-shell]')!;
    const shellRect = shell.getBoundingClientRect();
    const rect = (node: Element) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const matrix = (node: SVGGraphicsElement | null) => {
      const m = node?.getScreenCTM();
      return m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [];
    };
    const subjects = [...scene.querySelectorAll<SVGGElement>('[data-birdlab-species][data-birdlab-presence]')]
      .filter(node => !!node.querySelector('.birdlab-scene-actor'));
    const targets = [...scene.querySelectorAll<SVGGElement>('[data-birdlab-species][data-birdlab-presence]')]
      .filter(node => !!node.querySelector('button[data-birdlab-kind="bird"]'));
    return {
      now: performance.now(), lens: shell.getAttribute('data-birdlab-scene-lens'),
      viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
      actors: subjects.map(actor => {
        const species = actor.getAttribute('data-birdlab-species');
        // Several habitats contain multiple individuals of the same species.
        const sameSpecies = subjects.filter(node => node.getAttribute('data-birdlab-species') === species);
        const target = targets.filter(node => node.getAttribute('data-birdlab-species') === species)[sameSpecies.indexOf(actor)];
        const actorBox = actor.querySelector('[data-birdlab-motion-box]') as SVGGraphicsElement;
        const targetBox = target?.querySelector('[data-birdlab-motion-box]') as SVGGraphicsElement;
        const actorMatrix = matrix(actorBox), targetMatrix = matrix(targetBox);
        const a = actorBox.getBoundingClientRect();
        const center = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
        const button = target?.querySelector('button') as HTMLButtonElement;
        const anatomy = [...actor.querySelectorAll('.birdlab-anatomy-motion, .birdlab-behavior-motion')].map(node => {
          const css = getComputedStyle(node);
          return { className: node.getAttribute('class'), transform: css.transform, animation: css.animationName, playState: css.animationPlayState };
        });
        return {
          species, presence: actor.getAttribute('data-birdlab-presence'),
          behavior: actor.getAttribute('data-birdlab-behavior'), state: actor.getAttribute('data-birdlab-behavior-state'),
          pose: actor.getAttribute('data-birdlab-behavior-pose'), frozen: actor.getAttribute('data-birdlab-behavior-frozen'),
          targetState: target?.getAttribute('data-birdlab-behavior-state'), targetPose: target?.getAttribute('data-birdlab-behavior-pose'),
          enabled: button ? !button.disabled : false,
          motionTransform: getComputedStyle(actor.querySelector('.birdlab-motion-subject')!).transform,
          actorMatrix, targetMatrix, alignmentError: actorMatrix.length === targetMatrix.length ? Math.max(...actorMatrix.map((value, index) => Math.abs(value - targetMatrix[index]))) : 999,
          center, centerInside: center.x >= shellRect.left && center.x <= shellRect.right && center.y >= shellRect.top && center.y <= shellRect.bottom,
          art: rect(actor.querySelector('.birdlab-scene-actor')!), anatomy,
        };
      }),
      animations: [...shell.querySelectorAll('.birdlab-motion-subject, .birdlab-anatomy-motion, .birdlab-behavior-motion, .birdlab-ambient-motion, .birdlab-leaf-sway')].map(node => {
        const css = getComputedStyle(node);
        return { className: node.getAttribute('class'), transform: css.transform, name: css.animationName, state: css.animationPlayState };
      }),
    };
  });
}

function assertAlignment(sample: Awaited<ReturnType<typeof frame>>) {
  expect(sample.actors.length, 'must paint actual birds').toBeGreaterThan(0);
  expect(sample.documentWidth).toBeLessThanOrEqual(sample.viewport + 1);
  for (const actor of sample.actors) {
    if (actor.presence === 'visible' && actor.enabled) expect(actor.alignmentError, `${actor.species} visible and interactive transforms`).toBeLessThan(0.5);
    expect(actor.targetState).toBe(actor.state);
    expect(actor.targetPose).toBe(actor.pose);
    if (actor.presence === 'visible' && actor.enabled) expect(actor.centerInside, `${actor.species} usable target lies inside scene`).toBe(true);
  }
}

test('habitat styles: illustrated default, photographic assets and reversible switching in every habitat', async ({ page }) => {
  const errors = await mount(page, 'forest', 1280, false);
  const scene = page.locator('[data-birdlab-realistic-scene]');
  await expect(page.getByRole('radio', { name: 'Illustrated', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(scene).toHaveAttribute('data-birdlab-habitat-style', 'illustrated');
  await expect(scene.locator('[data-birdlab-habitat-photo]')).toHaveCount(0);
  for (const habitat of habitats) {
    await page.getByRole('tab', { name: new RegExp(habitat, 'i') }).click();
    await page.getByRole('radio', { name: 'Illustrated', exact: true }).click();
    const speciesBefore = await scene.locator('[data-birdlab-species][data-birdlab-presence]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-birdlab-species')));
    await page.getByRole('radio', { name: 'Photographic', exact: true }).click();
    await expect(scene).toHaveAttribute('data-birdlab-photo-ready', 'true');
    await expect(scene).toHaveAttribute('data-birdlab-habitat-style', 'photographic');
    const photo = scene.locator('[data-birdlab-habitat-photo]');
    expect(await photo.evaluate(node => getComputedStyle(node).visibility)).toBe('visible');
    expect(await scene.locator('.birdlab-illustrated-habitat').first().evaluate(node => getComputedStyle(node).visibility)).toBe('hidden');
    expect(await scene.locator('[data-birdlab-species][data-birdlab-presence]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-birdlab-species')))).toEqual(speciesBefore);
    assertAlignment(await frame(page));
    await page.getByRole('radio', { name: 'Illustrated', exact: true }).click();
    expect(await scene.locator('.birdlab-illustrated-habitat').first().evaluate(node => getComputedStyle(node).visibility)).toBe('visible');
  }
  expect(errors).toEqual([]);
});

test('habitat styles: photographic preference persists and remains usable on phone', async ({ page }) => {
  await mount(page, 'coast', 390, false);
  await page.getByRole('radio', { name: 'Photographic', exact: true }).click();
  await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-photo-ready', 'true');
  await mount(page, 'marsh', 390, false);
  await expect(page.getByRole('radio', { name: 'Photographic', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-photo-ready', 'true');
  assertAlignment(await frame(page));
  await page.getByRole('radio', { name: 'Illustrated', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: 'Illustrated', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Photographic', exact: true })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Photographic', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('habitat styles: missing photograph falls back to the complete illustrated scene', async ({ page }) => {
  await page.route('**/assets/birdlab/habitats/*', route => route.fulfill({ status: 404, body: 'missing test asset' }));
  const errors = await mount(page, 'forest', 1280, false);
  await page.getByRole('radio', { name: 'Photographic', exact: true }).click();
  const scene = page.locator('[data-birdlab-realistic-scene]');
  await expect(scene.locator('[data-birdlab-habitat-photo]')).toHaveCount(1);
  await expect(scene).not.toHaveAttribute('data-birdlab-photo-ready', 'true');
  expect(await scene.locator('.birdlab-illustrated-habitat').first().evaluate(node => getComputedStyle(node).visibility)).toBe('visible');
  assertAlignment(await frame(page));
  expect(errors).toEqual([]);
});

for (const habitat of habitats) {
  test(`${habitat}: live habitat frames and moving target alignment`, async ({ page }) => {
    const errors = await mount(page, habitat);
    await page.getByRole('radio', { name: 'Photographic', exact: true }).click();
    await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-photo-ready', 'true');
    const samples = [];
    for (let i = 0; i < 12; i++) {
      samples.push(await frame(page));
      if ([0, 4, 8, 11].includes(i)) await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, `${habitat}-live-${i}.png`) });
      await page.waitForTimeout(750);
    }
    writeFileSync(join(output, `${habitat}-live.json`), JSON.stringify({ errors, samples }, null, 2));
    samples.forEach(assertAlignment);
    expect(samples.some((sample, index) => index > 0 && JSON.stringify(sample.actors.map(a => a.anatomy)) !== JSON.stringify(samples[0].actors.map(a => a.anatomy))), 'live anatomy must visibly change over time').toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const width of [1280, 390]) {
  test(`${width}: pause and reduced motion freeze all anatomy and retain usable birds`, async ({ page }) => {
    const errors = await mount(page, 'marsh', width);
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Pause scene motion', exact: true }).click();
    await page.locator('[data-birdlab-scene-shell]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    const pausedA = await frame(page);
    await page.waitForTimeout(1100);
    const pausedB = await frame(page);
    expect(pausedB.animations).toEqual(pausedA.animations);
    expect(pausedB.actors).toEqual(pausedA.actors);
    expect(pausedB.animations.every(a => a.name === 'none' || a.state === 'paused')).toBe(true);
    await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, `${width}-paused.png`) });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Scene motion disabled by reduced-motion preference', exact: true }).waitFor();
    await page.waitForTimeout(300);
    const reducedA = await frame(page);
    await page.waitForTimeout(750);
    const reducedB = await frame(page);
    expect(reducedB.animations).toEqual(reducedA.animations);
    expect(reducedB.actors).toEqual(reducedA.actors);
    expect(reducedB.actors.some(actor => actor.enabled)).toBe(true);
    assertAlignment(reducedB);
    writeFileSync(join(output, `${width}-stillness.json`), JSON.stringify({ errors, pausedA, pausedB, reducedA, reducedB }, null, 2));
    expect(errors).toEqual([]);
  });
}

test('pause during an arrival stops the outer travel transition immediately', async ({ page }) => {
  const errors = await mount(page, 'marsh');
  const arriving = page.locator('g[data-birdlab-presence="arriving"]').filter({ has: page.locator('.birdlab-scene-actor') });
  await arriving.first().waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Pause scene motion', exact: true }).click();
  await page.waitForTimeout(60);
  const before = await frame(page);
  await page.waitForTimeout(500);
  const after = await frame(page);
  expect(after.actors).toEqual(before.actors);
  expect(after.animations).toEqual(before.animations);
  expect(errors).toEqual([]);
});

test('phone: every habitat remains unclipped with automatic lens selection', async ({ page }) => {
  const errors = await mount(page, 'forest', 390, false);
  const samples = [];
  for (const habitat of habitats) {
    const tab = page.getByRole('tab', { name: new RegExp('^' + habitat, 'i') });
    // The first habitat is already mounted with its automatic crop. Re-selecting
    // that same tab is a scene reset, not a navigation to another habitat.
    if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
    const celebration = page.getByRole('button', { name: 'Dismiss expedition celebration and keep exploring', exact: true });
    if (await celebration.isVisible()) await celebration.click();
    await page.locator('[data-birdlab-scene-shell]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const sample = await frame(page);
    samples.push({ habitat, sample });
    await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, `${habitat}-phone.png`) });
    assertAlignment(sample);
    expect(['left', 'center', 'right']).toContain(sample.lens);
  }
  writeFileSync(join(output, 'phone-habitats.json'), JSON.stringify({ errors, samples }, null, 2));
  expect(errors).toEqual([]);
});

test('new natural behaviors: run, trunk hitch, probe and strike are animated poses', async ({ page }) => {
  const cases = [
    { habitat: 'forest', species: 'robin', script: 'run-watch-probe', state: 'run', ms: 2500, lifecycle: 20000 },
    { habitat: 'forest', species: 'robin', script: 'run-watch-probe', state: 'probe', ms: 4500, lifecycle: 20000 },
    { habitat: 'forest', species: 'nuthatch', script: 'hitch-scan-probe', state: 'hitch', ms: 2500, lifecycle: 13000 },
    { habitat: 'forest', species: 'nuthatch', script: 'hitch-scan-probe', state: 'probe', ms: 4500, lifecycle: 13000 },
    { habitat: 'marsh', species: 'heron', script: 'wait-stalk-strike', state: 'stalk', ms: 3500, lifecycle: 3000 },
    { habitat: 'marsh', species: 'heron', script: 'wait-stalk-strike', state: 'strike', ms: 5500, lifecycle: 3000 },
  ];
  const samples = [];
  for (const check of cases) {
    const errors = await mount(page, check.habitat, 1280, true, { lifecycleMs: check.lifecycle, behaviorMs: check.ms });
    // A short one-shot step may already have finished by the time a loaded
    // review machine answers the first RPC. Sample Chromium's real animation
    // interpolation at fixed points; the habitat tests above cover live time.
    const seek = async (milliseconds: number) => page.evaluate(milliseconds => {
      const shell = document.querySelector('[data-birdlab-scene-shell]')!;
      for (const animation of shell.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = milliseconds;
      }
    }, milliseconds);
    await seek(90);
    const before = await frame(page);
    await seek(370);
    const after = await frame(page);
    const actor = after.actors.find(a => a.behavior === check.script)!;
    expect(actor, `${check.script} should be represented in the habitat`).toBeTruthy();
    expect(actor.state).toBe(check.state);
    const previous = before.actors.find(a => a.behavior === check.script)!;
    expect(JSON.stringify([actor.actorMatrix, actor.anatomy]), `${check.state} must actually move in the browser`).not.toBe(JSON.stringify([previous.actorMatrix, previous.anatomy]));
    assertAlignment(after);
    samples.push({ check, errors, before, after });
    await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, `${check.species}-${check.state}.png`) });
    expect(errors).toEqual([]);
    await harness.destroy(page);
  }
  writeFileSync(join(output, 'natural-behavior-poses.json'), JSON.stringify(samples, null, 2));
});

test('binocular acquisition freezes the observed behavior and its moving anatomy', async ({ page }) => {
  const samples = [];
  for (const check of [
    { habitat: 'marsh', species: 'greatBlueHeron', lifecycleMs: 3000, behaviorMs: 5500, state: 'strike' },
    { habitat: 'marsh', species: 'kingfisher', lifecycleMs: 6000, behaviorMs: 0, state: 'hover' },
    { habitat: 'backyard', species: 'chickadee', lifecycleMs: 13000, behaviorMs: 4500, state: 'seed-dip' },
  ]) {
    const errors = await mount(page, check.habitat, 1280, true, check);
    const bird = page.locator(`button[data-birdlab-kind="bird"][data-birdlab-species="${check.species}"]`);
    // A moving bird never becomes Playwright-stable; point at its actual hit
    // region and let the real binocular acquisition loop decide the result.
    await bird.hover({ force: true });
    const painted = page.locator(`[data-birdlab-species="${check.species}"][data-birdlab-behavior-frozen="true"]`).filter({ has: page.locator('.birdlab-scene-actor') });
    await expect(painted).toHaveCount(1);
    await page.waitForTimeout(100);
    const before = await frame(page);
    await page.waitForTimeout(500);
    const after = await frame(page);
    const previous = before.actors.find(a => a.species === check.species)!;
    const acquired = after.actors.find(a => a.species === check.species)!;
    expect(acquired.state).toBe(check.state);
    expect(acquired.frozen).toBe('true');
    expect(acquired.anatomy).toEqual(previous.anatomy);
    expect(acquired.actorMatrix).toEqual(previous.actorMatrix);
    expect(acquired.anatomy.every(a => a.animation === 'none' || a.playState === 'paused')).toBe(true);
    assertAlignment(after);
    samples.push({ check, errors, before, after });
    await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, `binocular-${check.species}.png`) });
    expect(errors).toEqual([]);
    await harness.destroy(page);
  }
  writeFileSync(join(output, 'binocular-acquisition.json'), JSON.stringify(samples, null, 2));
});

test('completed ground and trunk steps remain continuous through departure', async ({ page }) => {
  const samples = [];
  for (const check of [
    { habitat: 'forest', species: 'robin', lifecycleMs: 19500, action: 'run', rest: 'scan' },
    { habitat: 'forest', species: 'nuthatch', lifecycleMs: 12500, action: 'hitch', rest: 'scan' },
    { habitat: 'marsh', species: 'greatBlueHeron', lifecycleMs: 2000, action: 'stalk', rest: 'watch' },
  ]) {
    const errors = await mount(page, check.habitat, 1280, true, { lifecycleMs: check.lifecycleMs });
    // Seed only the start time, then let the production one-second lifecycle
    // clock drive every subsequent semantic state and departure naturally.
    await page.evaluate(() => {
      delete (window as any).__ctx.props.birdLabVisualQa;
      (window as any).__rerender();
    });
    const actor = page.locator(`g[data-birdlab-species="${check.species}"][data-birdlab-presence]`).filter({ has: page.locator('.birdlab-scene-actor') });
    await expect(actor).toHaveAttribute('data-birdlab-behavior-state', check.action);
    await expect(actor).toHaveAttribute('data-birdlab-behavior-state', check.rest);
    const settled = await frame(page);
    const settledActor = settled.actors.find(a => a.species === check.species)!;
    expect(settledActor.motionTransform).not.toBe('none');
    await expect(actor).toHaveAttribute('data-birdlab-presence', 'exiting');
    const departing = await frame(page);
    const departingActor = departing.actors.find(a => a.species === check.species)!;
    expect(departingActor.motionTransform, `${check.species} must not snap back to its old anchor before departure`).toBe(settledActor.motionTransform);
    samples.push({ check, errors, settled, departing });
    expect(errors).toEqual([]);
    await harness.destroy(page);
  }
  writeFileSync(join(output, 'departure-continuity.json'), JSON.stringify(samples, null, 2));
});
