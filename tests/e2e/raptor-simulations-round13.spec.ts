import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 1000, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, apertureStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'senses', apertureStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-aperture-study]')).toBeVisible();
}
async function range(page: Page, name: string, value: number) {
  await page.locator('#rh-aperture-' + name).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-aperture-' + name)).toHaveValue(String(value));
}
// Independent Simpson integration of NIST DLMF 10.9.2. Production uses a
// periodic trapezoidal rule; this oracle also independently locates the zero.
function besselOne(x: number) {
  const n = 512, step = Math.PI / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.cos(x * Math.sin(i * step) - i * step);
  return sum * step / (3 * Math.PI);
}
function firstZero() {
  let lower = 3, upper = 4;
  for (let i = 0; i < 55; i++) { const middle = (lower + upper) / 2; if (besselOne(middle) > 0) lower = middle; else upper = middle; }
  return (lower + upper) / 2;
}
const zero = firstZero();
function optics(diameter: number, focal: number, wavelength: number) {
  const lambdaMetres = wavelength * 1e-9, diameterMetres = diameter * 1e-3, focalMetres = focal * 1e-3;
  return { first: zero * lambdaMetres * focalMetres / (Math.PI * diameterMetres) * 1e6,
    angle: zero * lambdaMetres / (Math.PI * diameterMetres) * 180 / Math.PI * 60,
    area: Math.PI * Math.pow(diameter / 2, 2), fnumber: focal / diameter };
}
function intensity(diameter: number, focal: number, wavelength: number, radius: number) {
  if (radius === 0) return 1;
  const argument = Math.PI * (diameter * 1e-3) * (radius * 1e-6) / ((wavelength * 1e-9) * (focal * 1e-3));
  return Math.pow(2 * besselOne(argument) / argument, 2);
}
async function nativeOptics(page: Page) {
  return page.locator('[data-raptor-aperture-study]').evaluate(root => {
    const circle = root.querySelector<SVGCircleElement>('[data-aperture-pupil]')!;
    const plane = root.querySelector<SVGLineElement>('[data-aperture-image-plane]')!;
    const first = root.querySelector<SVGCircleElement>('[data-aperture-first-ring="current"]');
    const guide = root.querySelector<SVGLineElement>('[data-aperture-first-guide]');
    const inspector = root.querySelector<SVGCircleElement>('[data-aperture-inspector]')!;
    const path = root.querySelector('[data-aperture-curve="current"]')!.getAttribute('d')!;
    return { pupil: circle.r.baseVal.value, plane: plane.x1.baseVal.value, first: first?.r.baseVal.value ?? null,
      guide: guide?.x1.baseVal.value ?? null, inspector: { x: inspector.cx.baseVal.value, y: inspector.cy.baseVal.value },
      curve: Array.from(path.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g), match => ({ x: Number(match[1]), y: Number(match[2]) })),
      bands: [0, 1, 23, 119, 239].map(index => { const band = root.querySelector<SVGCircleElement>('[data-aperture-bands="current"] [data-band-index="' + index + '"]')!;
        return { index, radius: band.r.baseVal.value, opacity: Number(band.getAttribute('opacity')) }; }) };
  });
}

test('native optics use consistent length units, first Bessel zero, and radial intensity at central and extreme inputs', async ({ page }) => {
  await mount(page);
  expect(zero).toBeCloseTo(3.8317059702075125, 13);
  for (const setting of [
    { diameter: 4, focal: 20, wavelength: 550, radius: 10, cursor: 3 },
    { diameter: 1, focal: 40, wavelength: 700, radius: 10, cursor: 0 },
    { diameter: 1, focal: 40, wavelength: 700, radius: 40, cursor: 34.1 },
    { diameter: 8, focal: 20, wavelength: 400, radius: 40, cursor: 40 },
  ]) {
    await range(page, 'diameter', setting.diameter); await range(page, 'focal', setting.focal); await range(page, 'wavelength', setting.wavelength);
    await page.locator('#rh-aperture-radius').selectOption(String(setting.radius)); await range(page, 'cursor', setting.cursor);
    const expected = optics(setting.diameter, setting.focal, setting.wavelength), actual = await nativeOptics(page);
    expect(actual.pupil).toBeCloseTo(setting.diameter * 9.25, 4); expect(actual.plane).toBeCloseTo(280 + 4 * setting.focal, 4);
    for (const [key, value] of Object.entries({ first: expected.first.toFixed(3) + ' μm', angle: expected.angle.toFixed(3) + ' arcmin', area: expected.area.toFixed(3) + ' mm²', fnumber: expected.fnumber.toFixed(2) })) {
      await expect(page.locator('[data-aperture-metric="' + key + '"]')).toHaveText(value);
    }
    // SVGAnimatedLength exposes float32 geometry; parsed path coordinates were
    // intentionally quantized to .001 SVG units. These are separate tolerances.
    if (expected.first <= setting.radius) {
      expect(Math.abs(actual.first! - expected.first / setting.radius * 120)).toBeLessThan(1e-4);
      expect(Math.abs(actual.guide! - (52 + expected.first / setting.radius * 536))).toBeLessThan(1e-4);
    } else {
      expect(actual.first).toBeNull(); expect(actual.guide).toBeNull();
      await expect(page.locator('[data-aperture-spot-reading="current"]')).toContainText('outside this view');
    }
    expect(actual.curve).toHaveLength(241);
    let worstCurveError = 0;
    actual.curve.forEach((point, index) => {
      const expectedY = 220 - 170 * intensity(setting.diameter, setting.focal, setting.wavelength, setting.radius * index / 240);
      worstCurveError = Math.max(worstCurveError, Math.abs(point.x - (52 + index / 240 * 536)), Math.abs(point.y - expectedY));
    });
    expect(worstCurveError).toBeLessThan(.00051);
    expect(actual.curve[0]).toEqual({ x: 52, y: 50 });
    for (const band of actual.bands) {
      expect(Math.abs(band.radius - (band.index + .5) / 2)).toBeLessThan(1e-4);
      expect(band.opacity).toBeCloseTo(Math.sqrt(intensity(setting.diameter, setting.focal, setting.wavelength, setting.radius * (band.index + .5) / 240)), 9);
    }
    const inspected = intensity(setting.diameter, setting.focal, setting.wavelength, setting.cursor);
    expect(Math.abs(actual.inspector.x - (52 + setting.cursor / setting.radius * 536))).toBeLessThan(1e-4);
    expect(Math.abs(actual.inspector.y - (220 - inspected * 170))).toBeLessThan(1e-4);
    await expect(page.locator('[data-aperture-intensity-reading]')).toHaveText('At ' + setting.cursor.toFixed(1) + ' μm: current I/I₀ = ' + (inspected > 0 && inspected < 0.000001 ? 'Below 0.000001' : inspected.toFixed(6)));
    expect(intensity(setting.diameter, setting.focal, setting.wavelength, expected.first)).toBeLessThan(1e-25);
  }
  await page.getByText('Read the ideal model, units, and sources').click();
  const root = page.locator('[data-raptor-aperture-study]');
  await expect(root).toContainText('1.22 is rounded'); await expect(root).toContainText('two equally bright incoherent point sources');
  await expect(root).toContainText('do not compare absolute light throughput'); await expect(root).toContainText('512 periodic samples');
  await page.getByText('Explore the original day and night eye reference').click();
  await expect(page.getByRole('img', { name: 'Spherical raptor eye cross-section', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('frozen optics support exact controlled ratios, shared display changes, limits, bounded state and an honest model interpretation', async ({ page }) => {
  await mount(page);
  await page.locator('[data-aperture-pin]').click();
  const pinned = page.locator('[data-aperture-spot="pinned"]'), frozen = await pinned.innerHTML();
  for (const experiment of [
    { name: 'diameter', diameter: 8, focal: 20, radius: '.500', angle: '.500', area: '4.000' },
    { name: 'focal', diameter: 4, focal: 40, radius: '2.000', angle: '1.000', area: '1.000' },
    { name: 'both', diameter: 8, focal: 40, radius: '1.000', angle: '.500', area: '4.000' },
  ]) {
    await page.locator('[data-aperture-experiment="' + experiment.name + '"]').click();
    await expect(page.locator('#rh-aperture-diameter')).toHaveValue(String(experiment.diameter)); await expect(page.locator('#rh-aperture-focal')).toHaveValue(String(experiment.focal));
    await expect(page.locator('#rh-aperture-wavelength')).toHaveValue('550'); expect(await pinned.innerHTML()).toBe(frozen);
    for (const key of ['radius', 'angle', 'area'] as const) await expect(page.locator('[data-aperture-ratio="' + key + '"]')).toContainText('×' + (experiment[key].startsWith('.') ? '0' : '') + experiment[key]);
  }
  await page.locator('#rh-aperture-radius').selectOption('20'); await page.locator('#rh-aperture-contrast').uncheck();
  await expect(pinned).toContainText('D 4 mm · f 20 mm · λ 550 nm'); await expect(pinned.getByRole('img')).toHaveAccessibleName(/shared radius 20 micrometres/);
  expect(await pinned.innerHTML()).not.toBe(frozen);
  const band = page.locator('[data-aperture-bands="pinned"] [data-band-index="23"]');
  expect(Number(await band.getAttribute('opacity'))).toBeCloseTo(intensity(4, 20, 550, 20 * 23.5 / 240), 10);
  await expect(page.locator('[data-aperture-display-note]')).toContainText('linear normalized intensity');
  await page.locator('[data-aperture-pin]').click();
  for (const name of ['diameter', 'focal', 'both']) await expect(page.locator('[data-aperture-experiment="' + name + '"]')).toBeDisabled();
  await range(page, 'diameter', 1); await range(page, 'focal', 40); await range(page, 'wavelength', 700); await page.locator('[data-aperture-fit]').click();
  await expect(page.locator('#rh-aperture-radius')).toHaveValue('40'); await range(page, 'cursor', 40);
  await page.locator('#rh-aperture-radius').selectOption('10'); await expect(page.locator('#rh-aperture-cursor')).toHaveValue('10');
  await page.locator('[data-aperture-answer="yes"]').click(); await expect(page.locator('.rh-aperture-feedback')).toContainText('cannot establish a bird’s practical acuity');
  await page.locator('[data-aperture-answer="limits"]').click(); await expect(page.locator('.rh-aperture-feedback')).toContainText('retinal sampling');
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.apertureStudy)).toEqual({ version: 1, diameter: 1, focal: 40, wavelength: 700, radius: 10, cursor: 10, contrast: false });
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-aperture-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'senses' } })));
  await expect(page.locator('#rh-aperture-wavelength')).toHaveValue('700'); await expect(page.locator('[data-aperture-spot="pinned"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, apertureStudy: { version: 1, diameter: Infinity, focal: -50, wavelength: 9999, radius: '40', cursor: 999, contrast: 'yes' } } })));
  await expect(page.locator('#rh-aperture-diameter')).toHaveValue('4'); await expect(page.locator('#rh-aperture-focal')).toHaveValue('20');
  await expect(page.locator('#rh-aperture-wavelength')).toHaveValue('700'); await expect(page.locator('#rh-aperture-radius')).toHaveValue('10');
  await expect(page.locator('#rh-aperture-cursor')).toHaveValue('10'); await expect(page.locator('#rh-aperture-contrast')).toBeChecked();
  await page.locator('[data-aperture-reset]').click(); await expect(page.locator('#rh-aperture-wavelength')).toHaveValue('550');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual optics controls retain keyboard focus and readable current/pinned diagrams at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-aperture-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-aperture-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-aperture-spot="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-aperture-diameter').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#rh-aperture-diameter')).toHaveValue('1.5'); await expect(page.locator('#rh-aperture-diameter')).toBeFocused();
    await page.locator('#rh-aperture-focal').focus(); await page.keyboard.press('End'); await expect(page.locator('#rh-aperture-focal')).toHaveValue('40');
    await page.locator('#rh-aperture-wavelength').focus(); await page.keyboard.press('Home'); await expect(page.locator('#rh-aperture-wavelength')).toHaveValue('400');
    await page.locator('#rh-aperture-radius').selectOption('20'); await page.locator('#rh-aperture-cursor').focus(); await page.keyboard.press('End');
    await expect(page.locator('#rh-aperture-cursor')).toHaveValue('20'); await expect(page.locator('#rh-aperture-cursor')).toBeFocused();
    await page.locator('#rh-aperture-contrast').focus(); await page.keyboard.press('Space'); await expect(page.locator('#rh-aperture-contrast')).not.toBeChecked();
    await page.keyboard.press('Space'); await expect(page.locator('#rh-aperture-contrast')).toBeChecked();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-aperture-study]', '[data-aperture-geometry]', '[data-aperture-graph]', '.rh-aperture-controls', '.rh-aperture-compare', '.rh-aperture-evidence', '[data-aperture-spot="current"]', '[data-aperture-spot="pinned"]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-aperture-graph] svg', '[data-aperture-spot="current"] svg', '[data-aperture-spot="pinned"] svg']) {
      expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    }
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-aperture-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
