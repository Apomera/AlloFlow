import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/avian-activities-round4-2026-10-18/final');
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1280, height: 960, appStyles: true, layout: 'document' });
test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90_000 });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, view: string, width = 1280, hostWidth = width) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view, blXp: 23, blBadges: {}, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((el, width) => {
    (el as HTMLElement).style.width = `${width}px`;
    (el as HTMLElement).style.maxWidth = '100%';
    el.setAttribute('data-stem-tool-shell', 'true');
  }, hostWidth);
  return errors;
}
async function rewards(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.birdLab;
    return { xp: d.blXp, badges: d.blBadges, lifeList: d.blLifeList };
  });
}
async function hostRerender(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__toolData.birdLab.qaUnrelatedRender = 1;
    w.__rerender();
  });
}

for (const width of [1280, 390]) {
  test(`paired specimens preserve their identities, reveal, and drawing controls at ${width}px`, async ({ page }) => {
    const errors = await mount(page, 'confusing', width);
    const before = await rewards(page);
    const bench = page.locator('[data-birdlab-pair-workbench]');
    const choice = page.locator('#birdlab-pair-choice');
    await expect(choice.locator('option')).toHaveCount(8);
    for (let index = 0; index < 8; index++) {
      await choice.selectOption(String(index));
      await expect(bench).toHaveAttribute('data-pair-revealed', 'false');
      const specimens = bench.locator('[data-pair-specimen]');
      await expect(specimens).toHaveCount(2);
      const names = await specimens.evaluateAll(elements => elements.map(el => el.getAttribute('data-specimen-name')));
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(2);
      // The drawing order differs from the prose title in these comparisons.
      if (index === 1) { expect(names[0]).toContain('Sharp-shinned'); expect(names[1]).toContain("Cooper's"); }
      if (index === 2) { expect(names[0]).toContain('Lesser'); expect(names[1]).toContain('Greater'); }
      if (index === 7) { expect(names[0]).toContain('Hooded'); expect(names[1]).toContain('Common'); }
      const reveal = bench.getByRole('button', { name: 'Reveal identities', exact: true });
      await reveal.focus();
      await page.keyboard.press('Enter');
      await expect(bench).toHaveAttribute('data-pair-revealed', 'true');
      await expect(bench.getByRole('button', { name: 'Hide identities', exact: true })).toBeFocused();
      for (let specimen = 0; specimen < 2; specimen++) await expect(specimens.nth(specimen)).toContainText(names[specimen]!);
      if (index === 2) {
        await page.locator('#birdlab-pair-zoom').focus();
        await page.keyboard.press('End');
        const geometry = await specimens.evaluateAll(elements => elements.map(element => {
          const head = element.querySelector('[data-pair-head]')!.getBoundingClientRect();
          const bill = element.querySelector('[data-pair-bill]')!.getBoundingClientRect();
          const svg = element.querySelector('svg')!.getBoundingClientRect();
          return { ratio: bill.width / head.width, billRight: bill.right, canvasRight: svg.right };
        }));
        expect(geometry[0].ratio).toBeGreaterThan(1);
        expect(geometry[0].ratio).toBeLessThan(1.3);
        expect(geometry[1].ratio).toBeGreaterThan(1.5);
        for (const specimen of geometry) expect(specimen.billRight).toBeLessThanOrEqual(specimen.canvasRight + 1);
        await bench.screenshot({ path: resolve(output, `bird-confusing-yellowlegs-${width}.png`) });
      }
    }
    const drawing = bench.locator('[data-pair-drawing]').first();
    const transform = await drawing.getAttribute('transform');
    await page.locator('#birdlab-pair-zoom').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#birdlab-pair-zoom')).toHaveValue('125');
    expect(await drawing.getAttribute('transform')).not.toBe(transform);
    await page.locator('#birdlab-pair-guides').check();
    expect(await bench.locator('[data-pair-guide]').count()).toBeGreaterThan(0);
    await page.locator('#birdlab-pair-guides').uncheck();
    await expect(bench.locator('[data-pair-guide]')).toHaveCount(0);
    await hostRerender(page);
    await expect(choice).toHaveValue('7');
    await expect(bench).toHaveAttribute('data-pair-revealed', 'true');
    await expect(page.locator('#birdlab-pair-zoom')).toHaveValue('125');
    await expect(page.locator('#birdlab-pair-guides')).not.toBeChecked();
    await bench.screenshot({ path: resolve(output, `bird-confusing-revealed-${width}.png`) });
    await bench.getByRole('button', { name: 'Hide identities', exact: true }).click();
    await expect(bench).toHaveAttribute('data-pair-revealed', 'false');
    expect(await rewards(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test('heat exchange changes the illustrated gradients and supports keyboard inspection', async ({ page }) => {
  const errors = await mount(page, 'thermo');
  const before = await rewards(page);
  const bench = page.locator('[data-birdlab-thermo-workbench]');
  await expect(bench).toHaveAttribute('data-thermo-mode', 'paired');
  const artery = bench.locator('[data-thermo-study-artery]');
  const vein = bench.locator('[data-thermo-study-vein]');
  expect(await artery.count()).toBeGreaterThan(4);
  expect(await vein.count()).toBe(await artery.count());
  const pairedStrokes = await artery.evaluateAll(elements => elements.map(el => el.getAttribute('stroke')));
  expect(new Set(pairedStrokes).size).toBeGreaterThan(3);
  const returningStrokes = await vein.evaluateAll(elements => elements.map(el => el.getAttribute('stroke')));
  const warmth = (stroke: string | null) => { const [red, , blue] = stroke!.match(/\d+/g)!.map(Number); return red - blue; };
  for (let index = 0; index < pairedStrokes.length; index++) {
    expect(warmth(pairedStrokes[index])).toBeGreaterThan(warmth(returningStrokes[index]));
    if (index) expect(warmth(pairedStrokes[index])).toBeLessThan(warmth(pairedStrokes[index - 1]));
  }
  expect(await bench.locator('[data-thermo-study-heat]').count()).toBeGreaterThan(0);
  await expect(bench.locator('[data-thermo-study-flow=down]')).toHaveCount(1);
  await expect(bench.locator('[data-thermo-study-flow=up]')).toHaveCount(1);
  for (let step = 0; step < 4; step++) {
    const button = bench.locator(`button[data-thermo-step="${step}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();
  }
  await bench.getByRole('button', { name: 'Separated vessels', exact: true }).click();
  await expect(bench).toHaveAttribute('data-thermo-mode', 'separated');
  const separatedStrokes = await artery.evaluateAll(elements => elements.map(el => el.getAttribute('stroke')));
  expect(separatedStrokes).not.toEqual(pairedStrokes);
  await expect(bench.locator('[data-thermo-study-heat]')).toHaveCount(0);
  await expect(bench).toContainText(/qualitative|schematic/i);
  await hostRerender(page);
  await expect(bench).toHaveAttribute('data-thermo-mode', 'separated');
  await expect(bench.locator('button[data-thermo-step="3"]')).toHaveAttribute('aria-pressed', 'true');
  await bench.screenshot({ path: resolve(output, 'bird-thermo-separated-1280.png') });
  await bench.getByRole('button', { name: 'Nearby vessels', exact: true }).click();
  expect(await artery.evaluateAll(elements => elements.map(el => el.getAttribute('stroke')))).toEqual(pairedStrokes);
  expect(await rewards(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('dawn phases change the sky and illustrative singers without automatic progress', async ({ page }) => {
  const errors = await mount(page, 'dawnChorus', 390);
  const before = await rewards(page);
  const bench = page.locator('[data-birdlab-dawn-workbench]');
  const phase = page.locator('#birdlab-dawn-phase');
  const frames: string[] = [];
  await phase.focus();
  await page.keyboard.press('Home');
  for (let index = 0; index < 4; index++) {
    if (index) await page.keyboard.press('ArrowRight');
    await expect(phase).toHaveValue(String(index));
    await expect(bench).toHaveAttribute('data-dawn-phase', String(index));
    frames.push(await bench.evaluate(el => JSON.stringify({
      sky: [...el.querySelectorAll('[data-dawn-sky] stop')].map(stop => stop.getAttribute('stop-color')),
      singers: [...el.querySelectorAll('[data-dawn-singing]')].map(node => node.getAttribute('data-dawn-singing')),
    })));
  }
  expect(new Set(frames).size).toBe(4);
  const singers = bench.locator('button[data-dawn-singer]');
  expect(await singers.count()).toBeGreaterThan(2);
  for (let index = 0; index < await singers.count(); index++) {
    await singers.nth(index).focus();
    await page.keyboard.press('Enter');
    await expect(singers.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(singers.nth(index)).toBeFocused();
    await expect(phase).toHaveValue('3');
  }
  await hostRerender(page);
  await page.waitForTimeout(400);
  await expect(phase).toHaveValue('3');
  await expect(singers.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(bench).toContainText('invented listening sequence');
  await expect(bench).toContainText('not a schedule of which species sings first');
  await bench.screenshot({ path: resolve(output, 'bird-dawnChorus-late-390.png') });
  expect(await rewards(page)).toEqual(before);
  await bench.getByRole('button', { name: 'Explore the Bird Call Trainer', exact: true }).click();
  await expect(bench).toHaveCount(0);
  await expect(page.locator('#wrap h1')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.view)).toBe('calls');
  expect(errors).toEqual([]);
});

for (const [view, selector] of [
  ['confusing', '[data-birdlab-pair-workbench]'],
  ['thermo', '[data-birdlab-thermo-workbench]'],
  ['dawnChorus', '[data-birdlab-dawn-workbench]'],
]) {
  test(`${view} remains readable inside a 500px desktop pane`, async ({ page }) => {
    const errors = await mount(page, view, 1280, 500);
    const bench = page.locator(selector);
    await expect(bench).toBeVisible();
    const host = await page.locator('#wrap').boundingBox();
    const box = await bench.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
    expect(await page.locator('#wrap').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(501);
    expect(await bench.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(Math.ceil(box!.width) + 1);
    expect(errors).toEqual([]);
  });
}
