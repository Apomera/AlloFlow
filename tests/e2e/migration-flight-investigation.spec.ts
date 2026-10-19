import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// These checks operate the controls after mount and inspect the scene actually
// submitted to WebGL. A checked DOM toggle above an unchanged scene cannot pass.
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });

const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round2') : join(process.cwd(), 'reports/migration-deep-review-round2-2026-10-18');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  // Install the viewport before mount: mobile emulation otherwise lays the page
  // out at 980px and misses the tool's actual narrow-screen behavior.
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});

test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, seed: Record<string, unknown> = {}, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.emulateMedia({ reducedMotion: motion });
  await harness.mount(page, { migration: { tab: 'flight3d', flightPaused: true, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
}

async function group(page: Page, name: string) {
  return page.evaluate(name => {
    const record = (window as any).__glCanvas()?.rec;
    const root = record?.scene?.getObjectByName(name);
    if (!root) return null;
    let renderables = 0, vertices = 0, finite = true;
    const samples: number[] = [];
    const cues: string[] = [];
    root.traverseVisible((object: any) => {
      if (object.userData?.migrationOverlay) cues.push(object.userData.migrationOverlay);
      const position = object.geometry?.attributes?.position;
      if (position) {
        renderables++;
        vertices += position.count;
        const array = position.array as ArrayLike<number>;
        for (let i = 0; i < array.length; i++) {
          finite = finite && Number.isFinite(array[i]);
          samples.push(Math.round(array[i] * 1e6));
        }
      }
      samples.push(...object.position.toArray().map((v: number) => Math.round(v * 1e6)));
      samples.push(...object.quaternion.toArray().map((v: number) => Math.round(v * 1e6)));
    });
    return { visible: root.visible, renderables, vertices, finite, cues, signature: samples.join(',') };
  }, name);
}

async function frames(page: Page, count = 8) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}

async function wind(page: Page, value: number) {
  const slider = page.getByRole('slider', { name: /Along-route wind in meters per second/ });
  await slider.fill(String(value));
  await expect(slider).toHaveValue(String(value));
}

async function investigation(page: Page) {
  const root = page.locator('[data-migration-flight-investigation]');
  await expect(root).toBeVisible();
  // Support the section being a details element without bypassing any control.
  if (await root.evaluate(el => el.tagName === 'DETAILS' && !(el as HTMLDetailsElement).open)) {
    await root.locator(':scope > summary').click();
  }
  return root;
}

test('study camera and overlay controls reach actual WebGL geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page);
  expect(await group(page, 'migration-route-overlay')).toMatchObject({ visible: true });
  expect(await group(page, 'migration-airflow')).toMatchObject({ visible: false });

  await page.locator('.migration-flight-stage').focus();
  await page.keyboard.press('4');
  await expect(page.getByRole('button', { name: 'Study', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('checkbox', { name: 'Show wingtip airflow', exact: true }).check();
  await expect.poll(async () => (await group(page, 'migration-airflow'))?.visible).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const flock = (window as any).__glCanvas()?.rec?.scene?.getObjectByName('migration-flock');
    return flock?.children.filter((bird: any) => bird.visible).length;
  })).toBe(1);
  const airflow = await group(page, 'migration-airflow');
  expect(airflow?.renderables).toBeGreaterThan(0);
  expect(airflow?.vertices).toBeGreaterThan(20);
  expect(airflow?.finite).toBe(true);
  expect(airflow?.cues).toEqual(expect.arrayContaining(['wingtip-wake', 'upwash-cues']));
  expect((await harness.glScene(page))?.draws).toBeGreaterThan(0);
  await page.screenshot({ path: join(report, 'desktop-study-airflow.png'), fullPage: true });
  await page.getByRole('button', { name: 'Chase', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const flock = (window as any).__glCanvas()?.rec?.scene?.getObjectByName('migration-flock');
    return flock?.children.filter((bird: any) => bird.visible).length;
  })).toBe(11);

  await page.getByRole('checkbox', { name: 'Show route corridor', exact: true }).uncheck();
  await expect.poll(async () => (await group(page, 'migration-route-overlay'))?.visible).toBe(false);
  expect((await group(page, 'migration-route-overlay'))?.renderables).toBe(0);
  await page.getByRole('checkbox', { name: 'Show route corridor', exact: true }).check();
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  await expect.poll(async () => (await group(page, 'migration-airflow'))?.visible).toBe(false);
  expect((await group(page, 'migration-airflow'))?.renderables).toBe(0);
  await expect(page.locator('.migration-monarch-note')).toContainText('multiple generations');
});

test('the explanatory flow geometry freezes for pause and reduced motion', async ({ page }) => {
  await mount(page, { flightCamera: 'study', flightShowAirflow: true }, 'no-preference');
  await frames(page);
  const paused = await group(page, 'migration-airflow');
  await frames(page);
  expect((await group(page, 'migration-airflow'))?.signature).toBe(paused?.signature);
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click();
  await frames(page);
  expect((await group(page, 'migration-airflow'))?.signature).not.toBe(paused?.signature);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frames(page, 3);
  const reduced = await group(page, 'migration-airflow');
  await frames(page);
  expect((await group(page, 'migration-airflow'))?.signature).toBe(reduced?.signature);
});

test('a wind investigation records immutable observations and identifies confounds', async ({ page }) => {
  await mount(page, { flightWind: 0 });
  const lab = await investigation(page);
  await lab.locator('[data-experiment-variable="wind"]').click();
  await expect(lab.getByRole('button', { name: 'Capture baseline', exact: true })).toBeDisabled();
  await lab.getByRole('textbox', { name: 'Flight investigation prediction', exact: true }).fill('A tailwind will raise ground speed while drafting credit stays constant.');
  await lab.getByRole('button', { name: 'Capture baseline', exact: true }).click();
  const baseline = await page.evaluate(() => (window as any).__toolData.migration.flightInvestigation.baseline);
  expect(baseline).toMatchObject({ speciesId: 'canada_goose', wind: 0, groundSpeed: 40 });
  await wind(page, 10);
  await expect(lab.locator('[data-experiment-comparison]')).toHaveAttribute('data-comparison', 'controlled');
  await lab.getByRole('button', { name: 'Record trial', exact: true }).click();
  await expect(lab.locator('[data-experiment-trial]')).toHaveCount(1);
  const saved = await page.evaluate(() => (window as any).__toolData.migration.flightInvestigation.trials[0]);
  expect(saved.baseline).toEqual(baseline);
  expect(saved.snapshot.wind).toBe(10);
  expect(saved.snapshot.groundSpeed).toBeGreaterThan(baseline.groundSpeed);
  expect(saved.snapshot.benefit).toBe(baseline.benefit);

  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('snow_goose');
  await expect(lab.locator('[data-experiment-comparison]')).toHaveAttribute('data-comparison', 'confounded');
  await lab.getByRole('button', { name: 'Record trial', exact: true }).click();
  await expect(lab.locator('[data-experiment-trial]')).toHaveCount(2);
  await lab.getByRole('textbox', { name: 'Flight investigation evidence notes', exact: true }).fill('With only wind changed, ground speed increased. The species change confounded the next comparison.');
  await lab.getByRole('textbox', { name: 'Flight investigation explanation', exact: true }).fill('This model keeps airspeed fixed. A tailwind adds to speed over ground.');
  await lab.getByRole('button', { name: 'Restore baseline controls', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '3D migration focus species', exact: true })).toHaveValue('canada_goose');
  await expect(lab.locator('[data-experiment-comparison]')).toHaveAttribute('data-comparison', 'unchanged');
  expect(await page.evaluate(() => (window as any).__toolData.migration.flightInvestigation.trials[0])).toEqual(saved);

  // Use the real tabs so the scene and the investigation remount together.
  await page.locator('#migration-tab-inquiry').click();
  await page.locator('#migration-tab-flight3d').click();
  await expect(page.locator('[data-experiment-trial]')).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Flight investigation evidence notes', exact: true })).toHaveValue(/species change confounded/);
  await expect(page.getByRole('textbox', { name: 'Flight investigation explanation', exact: true })).toHaveValue(/tailwind adds/);
  expect(await page.evaluate(() => (window as any).__toolData.migration.flightInvestigation.trials[0])).toEqual(saved);
});

for (const dark of [false, true]) test.describe(`phone ${dark ? 'dark' : 'light'}`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('expanded study and investigation fit the viewport and pass accessibility checks', async ({ page }) => {
    await mount(page, { flightCamera: 'study', flightShowAirflow: true, flightWind: 0 });
    if (dark) {
      await page.evaluate(() => {
        (window as any).__ctx.isDark = true;
        (window as any).__ctx.theme = 'dark';
        document.documentElement.classList.add('dark');
        document.body.style.background = '#0f172a';
        (window as any).__rerender();
      });
    }
    const lab = await investigation(page);
    await lab.getByRole('textbox', { name: 'Flight investigation prediction', exact: true }).fill('A following wind will increase ground speed.');
    await lab.getByRole('button', { name: 'Capture baseline', exact: true }).click();
    await wind(page, 10);
    await lab.getByRole('button', { name: 'Record trial', exact: true }).click();
    await page.getByText('How to read this model', { exact: true }).click();
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const axe = await (window as any).axe.run(document.querySelector('#wrap'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }
      });
      return {
        viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })),
        errors: (window as any).__events.errors
      };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}-investigation`;
    await writeFile(join(report, name + '.json'), JSON.stringify(result, null, 2));
    await page.screenshot({ path: join(report, name + '.png'), fullPage: true });
    expect(result.viewport).toBe(390);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
    expect(result.violations).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
