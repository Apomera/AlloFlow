import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// One runner owns these checks. Local assets and actual submitted WebGL scene
// records make camera/geometry regressions observable without a remote site.
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
const report = join(process.cwd(), 'reports/migration-deep-review-round3-2026-10-18');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});

test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightPaused: true, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  // The shared recorder stores the submitted scene. Observe the camera passed
  // into that scene's existing render hook without creating our own camera.
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await frames(page, 2);
}

async function frames(page: Page, count = 4) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}

async function view(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const flock = record?.scene?.getObjectByName('migration-flock');
    const camera = record?.camera;
    if (!flock || !camera) return null;
    const visible = flock.children.filter((bird: any) => bird.visible);
    const bird = visible[0];
    const target = new (window as any).THREE.Vector3();
    const direction = new (window as any).THREE.Vector3();
    bird.getWorldPosition(target);
    camera.getWorldDirection(direction);
    const expected = target.clone().sub(camera.position).normalize();
    const anatomy = record.scene.getObjectByName('migration-anatomy-callouts');
    const drawCount = anatomy?.geometry?.drawRange?.count || 0;
    const coordinates = anatomy?.geometry?.attributes?.position?.array;
    let finite = true;
    const drawn: number[] = [];
    if (coordinates && Number.isFinite(drawCount)) for (let i = 0; i < drawCount * 3; i++) {
      finite = finite && Number.isFinite(coordinates[i]);
      drawn.push(Math.round(coordinates[i] * 1e6));
    }
    const transforms: number[] = [];
    bird.traverse((object: any) => {
      transforms.push(...object.position.toArray(), ...object.quaternion.toArray());
    });
    return {
      visible: visible.length, selected: flock.children.indexOf(bird),
      camera: camera.position.toArray(), target: target.toArray(),
      targetAngle: direction.angleTo(expected), distance: target.distanceTo(camera.position),
      wings: transforms.map(v => Math.round(v * 1e6)).join(','),
      anatomy: { visible: anatomy?.visible || false, drawCount, finite, signature: drawn.join(','), cue: anatomy?.userData?.migrationOverlay,
        regions: (bird.userData.anatomyAnchors || []).map((anchor: any) => anchor.id) }
    };
  });
}

async function challenges(page: Page) {
  const root = page.locator('[data-migration-flight-challenges]');
  await expect(root).toBeVisible();
  if (await root.evaluate(el => el.tagName === 'DETAILS' && !(el as HTMLDetailsElement).open)) {
    await root.locator(':scope > summary').click();
  }
  return root;
}

async function completeWindChallenge(page: Page) {
  const root = await challenges(page);
  await root.locator('[data-flight-challenge="wind"]').click();
  await root.getByRole('textbox', { name: 'My prediction: which control will I change, and why?', exact: true }).fill('A tailwind will let this Monarch make forward ground progress.');
  await root.locator('[data-flight-challenge-action="load"]').click();
  await expect(page.getByRole('combobox', { name: '3D migration focus species', exact: true })).toHaveValue('monarch');
  await expect(page.getByRole('slider', { name: /Along-route wind in meters per second/ })).toHaveValue('-15');
  await page.getByRole('slider', { name: /Along-route wind in meters per second/ }).fill('4');
  await expect(root.locator('[data-flight-challenge-feedback]')).toHaveAttribute('data-model-condition', 'met');
  await root.getByRole('textbox', { name: 'My explanation: what numbers or route changes support my claim?', exact: true }).fill('With airspeed fixed, the following wind raises modeled ground speed from zero to 21 mph. Real butterflies also respond to gusts.');
  await root.locator('[data-flight-challenge-action="check"]').click();
  const attempt = root.locator('[data-flight-challenge-attempt="1"]');
  // Saved attempts may be intentionally collapsed, but their actual saved
  // content and model result must be present, with no automatic prose grade.
  await expect(attempt).toHaveAttribute('data-model-condition', 'met');
  return root;
}

test('Study controls orbit the selected real individual and clamp safely after formation changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page);
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  const individual = page.getByRole('combobox', { name: 'Study individual', exact: true });
  await individual.selectOption('6');
  await expect.poll(async () => (await view(page))?.selected).toBe(6);
  const selected = await view(page);
  expect(selected?.visible).toBe(1);
  expect(selected?.targetAngle).toBeLessThan(0.025);
  const stage = page.locator('.migration-flight-stage');
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Study angle in degrees', exact: true })).toHaveValue('45');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('slider', { name: 'Study elevation in degrees', exact: true })).toHaveValue('20');
  await page.keyboard.press('Shift+Equal');
  await expect(page.getByRole('slider', { name: 'Study zoom percent', exact: true })).toHaveValue('110');
  await frames(page);
  expect((await view(page))?.camera).not.toEqual(selected?.camera);
  expect((await view(page))?.targetAngle).toBeLessThan(0.025);
  await page.getByRole('slider', { name: 'Study elevation in degrees', exact: true }).fill('60');
  await stage.focus(); await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('slider', { name: 'Study elevation in degrees', exact: true })).toHaveValue('60');
  await page.getByRole('button', { name: 'Reset study view', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Study angle in degrees', exact: true })).toHaveValue('35');
  await expect(page.getByRole('slider', { name: 'Study elevation in degrees', exact: true })).toHaveValue('15');
  await expect(page.getByRole('slider', { name: 'Study zoom percent', exact: true })).toHaveValue('100');
  await page.getByRole('combobox', { name: '3D migration flight pattern', exact: true }).selectOption('solo');
  await expect(individual).toBeDisabled();
  await expect(individual).toHaveValue('0');
  await expect.poll(async () => (await view(page))?.selected).toBe(0);
  expect((await view(page))?.visible).toBe(1);
  expect((await view(page))?.targetAngle).toBeLessThan(0.025);
});

test('anatomy follows articulated parts and Step wingbeat advances only the paused wing cycle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightCamera: 'study', flightStudyBird: 7, flightShowAirflow: true });
  await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).check();
  await frames(page);
  const before = await view(page);
  expect(before?.selected).toBe(7);
  expect(before?.anatomy).toMatchObject({ visible: true, finite: true, cue: 'anatomy-callouts' });
  expect(before?.anatomy.regions).toEqual(['head', 'inner-wing', 'primaries', 'tail']);
  expect(before?.anatomy.drawCount).toBeGreaterThan(80);
  await frames(page);
  expect((await view(page))?.wings).toBe(before?.wings);
  expect((await view(page))?.anatomy.signature).toBe(before?.anatomy.signature);
  await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click();
  await frames(page);
  const stepped = await view(page);
  expect(stepped?.wings).not.toBe(before?.wings);
  expect(stepped?.anatomy.signature).not.toBe(before?.anatomy.signature);
  expect(stepped?.target).toEqual(before?.target);
  expect(stepped?.camera).toEqual(before?.camera);
  await expect(page.getByRole('button', { name: 'Resume flight', exact: true })).toBeVisible();
  await page.screenshot({ path: join(report, 'desktop-study-anatomy.png'), fullPage: true });
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-study-anatomy-scene.png') });
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  await expect.poll(async () => (await view(page))?.anatomy.visible).toBe(false);
  expect((await view(page))?.anatomy.regions).toEqual([]);
});

test('a flight challenge checks model conditions and preserves its prediction, reasoning, and actual attempt across tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page);
  const root = await challenges(page);
  await expect(root.locator('[data-flight-challenge-action="load"]')).toBeDisabled();
  await completeWindChallenge(page);
  const stored = await page.evaluate(() => (window as any).__toolData.migration.flightChallenges);
  expect(stored.work.wind.attempts).toHaveLength(1);
  await page.locator('[data-migration-tab="inquiry"]').click();
  await page.locator('[data-migration-tab="flight3d"]').click();
  const restored = await challenges(page);
  await expect(restored.getByRole('textbox', { name: 'My prediction: which control will I change, and why?', exact: true })).toHaveValue(/Monarch make forward/);
  await expect(restored.getByRole('textbox', { name: 'My explanation: what numbers or route changes support my claim?', exact: true })).toHaveValue(/from zero to 21 mph/);
  expect(await page.evaluate(() => (window as any).__toolData.migration.flightChallenges)).toEqual(stored);
  await page.screenshot({ path: join(report, 'desktop-flight-challenges.png'), fullPage: true });
});

for (const dark of [false, true]) test.describe(`phone ${dark ? 'dark' : 'light'} pass3`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Study and completed flight challenges fit and pass accessibility checks', async ({ page }) => {
    await mount(page, { flightCamera: 'study', flightShowAirflow: true });
    if (dark) await page.evaluate(() => {
      (window as any).__ctx.isDark = true; (window as any).__ctx.theme = 'dark';
      document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a';
      (window as any).__rerender();
    });
    await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).check();
    await page.getByRole('slider', { name: 'Study angle in degrees', exact: true }).fill('-60');
    await page.getByRole('slider', { name: 'Study zoom percent', exact: true }).fill('125');
    await frames(page);
    expect((await view(page))?.anatomy.visible).toBe(true);
    expect((await view(page))?.targetAngle).toBeLessThan(0.025);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, `mobile-${dark ? 'dark' : 'light'}-study-scene.png`) });
    const challenge = await completeWindChallenge(page);
    const attempts = challenge.locator('details').filter({ has: page.locator('[data-flight-challenge-attempt="1"]') });
    if (await attempts.count() && !(await attempts.first().evaluate(el => (el as HTMLDetailsElement).open))) {
      await attempts.first().locator(':scope > summary').click();
    }
    await page.getByText('How to read this model', { exact: true }).click();
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(async () => {
      const axe = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}-flight-challenges`;
    await writeFile(join(report, name + '.json'), JSON.stringify(results, null, 2));
    await page.screenshot({ path: join(report, name + '.png'), fullPage: true });
    expect(results.viewport).toBe(390);
    expect(results.scrollWidth).toBeLessThanOrEqual(results.viewport);
    expect(results.violations).toEqual([]);
    expect(results.errors).toEqual([]);
  });
});
