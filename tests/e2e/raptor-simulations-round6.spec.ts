import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100, height: 960, appStyles: true, layout: 'document',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Parameters = { mass: number; cd: number; area: number; start: number };
async function sizing(page: Page, viewport: number, host = viewport) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%';
    wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page, parameters: Partial<Parameters> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'stoop', selectedSpecies: 'peregrine',
    stoopSimVars: { mass: parameters.mass ?? .95, cd: parameters.cd ?? .18, area: parameters.area ?? .0065, altitudeM: parameters.start ?? 2000 } } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-raptor-stoop-comparison]')).toBeVisible();
}
async function sample(page: Page) {
  return page.locator('[data-raptor-stoop-comparison]').evaluate(element => {
    const data = (element as HTMLElement).dataset;
    const read = (prefix: string) => ({ mass: Number(data[prefix + 'Mass']), cd: Number(data[prefix + 'Cd']),
      area: Number(data[prefix + 'Area']), start: Number(element.getAttribute('data-' + prefix + '-altitudeM')), speed: Number(data[prefix + 'Speed']), altitude: Number(data[prefix + 'Altitude']) });
    const birds = [...element.querySelectorAll('[data-stoop-compare-bird]')].map(node => ({
      kind: node.getAttribute('data-stoop-compare-bird'), y: (node as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix.f,
    }));
    return { time: Number(data.time), referenceTime: Number(data.referenceTime), currentTime: Number(data.currentTime), index: Number(data.sampleIndex),
      commonEnd: Number(data.commonEnd), altitudeMax: Number(data.altitudeMax), speedMax: Number(data.speedMax),
      reference: read('reference'), current: read('current'), birds };
  });
}
async function plottedModelsAgree(page: Page) {
  const selected = await sample(page);
  const plot = await page.locator('[data-stoop-compare-chart]').evaluate((element, index) => {
    const runs = ['reference', 'current'].map(kind => {
      const marker = element.querySelector(`[data-stoop-compare-marker="${kind}"]`)!;
      const values = element.querySelector(`[data-stoop-compare-curve="${kind}"]`)!.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const x = kind === 'reference' ? Number(marker.getAttribute('cx')) : Number(marker.getAttribute('data-x'));
      const y = kind === 'reference' ? Number(marker.getAttribute('cy')) : Number(marker.getAttribute('data-y'));
      return { kind, x, y, path: values.slice(index * 2, index * 2 + 2), lastX: values[values.length - 2], points: values.length / 2 };
    });
    return { runs, cursorX: Number(element.querySelector('[data-stoop-compare-cursor]')!.getAttribute('x1')) };
  }, selected.index);
  expect(selected.referenceTime).toBe(selected.time); expect(selected.currentTime).toBe(selected.time);
  expect(plot.runs[0].points).toBe(plot.runs[1].points);
  for (const run of plot.runs) {
    const value = run.kind === 'reference' ? selected.reference : selected.current;
    expect(run.x).toBeCloseTo(47 + selected.time / selected.commonEnd * 289, 6);
    expect(run.y).toBeCloseTo(186 - value.speed / selected.speedMax * 150, 6);
    expect(run.lastX).toBeCloseTo(336, 3); expect(plot.cursorX).toBeCloseTo(run.x, 7);
    expect(run.x).toBeCloseTo(run.path[0], 2); expect(run.y).toBeCloseTo(run.path[1], 2);
    const bird = selected.birds.find(bird => bird.kind === run.kind)!;
    expect(bird.y).toBeCloseTo(54 + (1 - value.altitude / selected.altitudeMax) * 228, 4);
  }
}
function model(parameters: Parameters, time: number) {
  const terminal = Math.sqrt(2 * parameters.mass * 9.81 / (1.225 * parameters.cd * parameters.area));
  return { speed: terminal * Math.tanh(9.81 * time / terminal),
    altitude: parameters.start - terminal ** 2 / 9.81 * Math.log(Math.cosh(9.81 * time / terminal)) };
}
function agreesWithIndependentModel(parameters: Parameters & { speed: number; altitude: number }, time: number) {
  const analytic = model(parameters, time);
  // The simulator uses semi-implicit .05-second integration. Compare against the
  // independent continuous solution, with a bounded integration allowance.
  expect(Math.abs(parameters.speed - analytic.speed)).toBeLessThan(.65);
  expect(Math.abs(parameters.altitude - analytic.altitude)).toBeLessThan(3.5);
}
async function setRange(range: Locator, value: number) {
  await range.evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function unrelatedProgress(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries((window as any).__toolData.raptorHunt)
    .filter(([key]) => !/^stoop/.test(key))));
}
async function assertContained(page: Page, element: Locator) {
  const host = await page.locator('#wrap').boundingBox(), box = await element.boundingBox();
  expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThan(0);
  expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1); expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
}
async function audit(page: Page) {
  const violations = await page.evaluate(async () => {
    const report = await (window as any).axe.run(document.querySelector('[data-raptor-stoop-comparison]'), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
    });
    return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
}

test('pinned Stoop comparison keeps a frozen reference and shows both actual models at the same elapsed time', async ({ page }) => {
  await mount(page);
  const panel = page.locator('[data-raptor-stoop-comparison]'), unchanged = await unrelatedProgress(page);
  await panel.getByRole('button', { name: 'Pin current model', exact: true }).click();
  const slider = panel.locator('[data-stoop-compare-time]');
  await setRange(slider, 120);
  const initial = await sample(page);
  expect(initial.time).toBeCloseTo(6, 8); expect(initial.current).toEqual(initial.reference);
  expect(initial.birds).toHaveLength(2); expect(initial.birds[0].y).toBe(initial.birds[1].y);
  const baseline = { ...initial.reference };
  await plottedModelsAgree(page);
  for (const variant of [
    { button: '2× drag coefficient', changed: 'cd', factor: 2, speedSign: -1 },
    { button: '2× frontal area', changed: 'area', factor: 2, speedSign: -1 },
    { button: '2× mass', changed: 'mass', factor: 2, speedSign: 1 },
  ]) {
    await panel.getByRole('button', { name: variant.button, exact: true }).click();
    const value = await sample(page);
    expect(value.time).toBe(initial.time); expect(value.reference).toEqual(baseline);
    for (const key of ['mass', 'cd', 'area', 'start'] as const) {
      expect(value.current[key]).toBeCloseTo(baseline[key] * (key === variant.changed ? variant.factor : 1), 8);
    }
    agreesWithIndependentModel(value.reference, value.time); agreesWithIndependentModel(value.current, value.time);
    expect((value.current.speed - value.reference.speed) * variant.speedSign).toBeGreaterThan(0);
    expect((value.current.altitude - value.reference.altitude) * variant.speedSign).toBeLessThan(0);
    const referenceBird = value.birds.find(bird => bird.kind === 'reference')!, currentBird = value.birds.find(bird => bird.kind === 'current')!;
    expect((currentBird.y - referenceBird.y) * variant.speedSign).toBeGreaterThan(0);
    expect(value.altitudeMax).toBe(2000); expect(value.speedMax).toBeGreaterThanOrEqual(Math.max(value.reference.speed, value.current.speed));
    await plottedModelsAgree(page);
    await expect(panel.locator('[data-stoop-compare-parameter][data-changed="true"]')).toHaveCount(1);
  }
  await panel.getByRole('button', { name: 'Restore reference', exact: true }).click();
  const restored = await sample(page); expect(restored.current).toEqual(restored.reference);
  expect(await unrelatedProgress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('Stoop comparison stops before the first ground contact and replaces or clears its pinned reference deliberately', async ({ page }) => {
  await mount(page, { start: 2000 });
  const panel = page.locator('[data-raptor-stoop-comparison]');
  await panel.getByRole('button', { name: 'Pin current model', exact: true }).click();
  const slider = panel.locator('[data-stoop-compare-time]');
  await slider.press('End');
  const fullWindow = await sample(page);
  expect(fullWindow.time).toBeGreaterThan(11.9); expect(fullWindow.reference.altitude).toBeGreaterThan(0);
  await page.getByRole('slider', { name: 'Altitude m', exact: true }).press('Home');
  await slider.press('End');
  const limited = await sample(page);
  expect(limited.reference.start).toBe(2000); expect(limited.current.start).toBe(100);
  expect(limited.time).toBeLessThan(fullWindow.time); expect(limited.time).toBeCloseTo(limited.commonEnd, 8);
  expect(limited.current.altitude).toBeGreaterThan(0); expect(limited.reference.altitude).toBeGreaterThan(limited.current.altitude);
  agreesWithIndependentModel(limited.reference, limited.time); agreesWithIndependentModel(limited.current, limited.time);
  await plottedModelsAgree(page);
  // The next numerical step crosses ground: do not extend one path with a
  // frozen bird while continuing the other, or imply an impact speed sample.
  const nextSpeed = limited.current.speed + (9.81 - .5 * 1.225 * limited.current.cd * limited.current.area * limited.current.speed ** 2 / limited.current.mass) * .05;
  expect(limited.current.altitude - nextSpeed * .05).toBeLessThanOrEqual(0);
  await expect(panel).toContainText(/before.*ground|ground.*before|before.*contact|contact.*before/i);
  await panel.getByRole('button', { name: 'Replace reference', exact: true }).click();
  const replaced = await sample(page); expect(replaced.reference.start).toBe(100); expect(replaced.reference).toEqual(replaced.current);
  await panel.getByRole('button', { name: 'Clear reference', exact: true }).click();
  await expect(slider).toHaveCount(0); await expect(panel.getByRole('button', { name: 'Pin current model', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Pin current model', exact: true })).toBeFocused();
  await page.getByRole('slider', { name: 'Mass in kilograms', exact: true }).press('End');
  await panel.getByRole('button', { name: 'Pin current model', exact: true }).click();
  await expect(panel.getByRole('button', { name: '2× mass', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('Stoop comparison stays keyboard operable, paused and accessible across desktop, phone and embedded layouts', async ({ page }) => {
  await mount(page);
  const panel = page.locator('[data-raptor-stoop-comparison]');
  const pin = panel.getByRole('button', { name: 'Pin current model', exact: true });
  await pin.focus(); await page.keyboard.press('Enter');
  await panel.getByRole('button', { name: '2× drag coefficient', exact: true }).click();
  const slider = panel.locator('[data-stoop-compare-time]'), unchanged = await unrelatedProgress(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused();
    expect((await sample(page)).time).toBe(0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused(); expect((await sample(page)).time).toBeCloseTo(.05, 9);
    await page.keyboard.press('End'); const still = await sample(page);
    expect(still.time).toBeCloseTo(still.commonEnd, 8);
    for (const target of [panel, slider, panel.locator('[data-stoop-compare-scene]'), panel.locator('[data-stoop-compare-chart]')]) await assertContained(page, target);
    expect(await panel.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page); await page.waitForTimeout(150); expect(await sample(page)).toEqual(still);
    expect(await unrelatedProgress(page)).toEqual(unchanged);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
