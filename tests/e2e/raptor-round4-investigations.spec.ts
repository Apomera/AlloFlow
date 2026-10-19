import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1280, height: 960, appStyles: true, layout: 'document',
});

test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, section: string, hostWidth = 1280) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { raptorHunt: { activeSection: section } }, undefined, { expectCanvas: false });
  await page.evaluate(width => {
    const host = document.querySelector('#wrap') as HTMLElement;
    host.style.width = width + 'px';
    host.style.maxWidth = '100%';
    host.setAttribute('data-stem-tool-shell', 'true');
  }, hostWidth);
  return errors;
}

async function expectInsideHost(page: Page, content: Locator) {
  await expect(content).toBeVisible();
  const host = await page.locator('#wrap').boundingBox();
  const box = await content.boundingBox();
  expect(host).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
  expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

test('comparison evidence belongs to each pair and retains the selected trait and keyboard focus', async ({ page }) => {
  const errors = await mount(page, 'comparative');
  const studio = page.locator('[data-raptor-comparative-workbench]');
  const pair = studio.getByRole('combobox', { name: 'Choose a comparison pair', exact: true });
  const basket = studio.locator('[data-comparative-evidence]');
  const pin = studio.locator('[data-comparative-pin]');
  const tail = studio.getByRole('button', { name: 'Tail shape', exact: true });

  const ranges = studio.locator('[data-comparative-size-ranges]');
  await expect(ranges).toContainText('0–80 cm');
  await expect(ranges).toContainText('not limits for every age, sex, or individual');
  await expect(ranges.locator('[data-size-range=A]')).toContainText('40-50 cm');
  await expect(ranges.locator('[data-size-range=B]')).toContainText('25-35 cm');
  const larger = await ranges.locator('[data-size-range=A] .rh-compare-size-track > span').boundingBox();
  const smaller = await ranges.locator('[data-size-range=B] .rh-compare-size-track > span').boundingBox();
  expect(larger).not.toBeNull();
  expect(smaller).not.toBeNull();
  // Equal ten-centimeter spans must occupy equal widths on the shared axis.
  expect(Math.abs(larger!.width - smaller!.width)).toBeLessThan(2);
  expect(larger!.x).toBeGreaterThan(smaller!.x + smaller!.width);
  for (const sample of [
    { value: '2', a: '50-65 cm', b: '40-55 cm' },
    { value: '4', a: '36-58 cm', b: '24-32 cm' },
  ]) {
    await pair.selectOption(sample.value);
    await expect(ranges.locator('[data-size-range=A]')).toContainText(sample.a);
    await expect(ranges.locator('[data-size-range=B]')).toContainText(sample.b);
  }
  await pair.selectOption('0');

  await tail.focus();
  await page.keyboard.press('Enter');
  await expect(tail).toBeFocused();
  await expect(tail).toHaveAttribute('aria-pressed', 'true');
  await expect(studio.locator('[data-comparative-side=A]')).toContainText('Often rounded');
  await expect(studio.locator('[data-comparative-side=B]')).toContainText('can look rounded when spread');
  await expect(studio).toContainText('Tail-tip shape changes with posture');
  await pin.focus();
  await page.keyboard.press('Space');
  await expect(pin).toBeFocused();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(basket.getByRole('listitem')).toHaveCount(1);
  await expect(basket).toContainText('Tail shape');

  await pair.selectOption('3');
  await expect(basket.getByRole('listitem')).toHaveCount(0);
  await studio.getByRole('button', { name: 'Size', exact: true }).click();
  await expect(ranges).toContainText('qualitative size comparison');
  await expect(ranges.locator('[data-size-range]')).toHaveCount(0);
  await studio.getByRole('button', { name: 'Belly pattern', exact: true }).click();
  await expect(studio.locator('[data-comparative-side=A]')).toContainText('Horizontal barring');
  await expect(studio.locator('[data-comparative-side=B]')).toContainText('Vertical belly streaks');
  await pin.click();
  await expect(basket).toContainText('Belly pattern');

  await pair.selectOption('0');
  await expect(tail).toHaveAttribute('aria-pressed', 'true');
  await expect(basket.getByRole('listitem')).toHaveCount(1);
  await expect(basket).toContainText('Tail shape');
  await expect(basket).not.toContainText('Belly pattern');
  await pin.click();
  await expect(basket.getByRole('listitem')).toHaveCount(0);
  await expect(basket).toContainText('not an identification score');
  await pair.selectOption('3');
  await expect(studio.getByRole('button', { name: 'Belly pattern', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(basket.getByRole('listitem')).toHaveCount(1);
  await expect(basket).toContainText('Belly pattern');
  await expect(studio).toContainText('not drawn to a shared size scale');
  expect(errors).toEqual([]);
});

test('hunting sequence advances manually, changes the diagram, and remembers each strategy independently', async ({ page }) => {
  const errors = await mount(page, 'hunting');
  const board = page.locator('[data-raptor-hunting-workbench]');
  const strategy = board.getByRole('combobox', { name: 'Choose a hunting or foraging strategy', exact: true });
  const bird = board.locator('[data-hunting-actor=bird]');
  const reading = board.locator('[data-hunting-reading]');
  await expect(board).toHaveAttribute('data-hunting-phase', '0');
  const initialPosition = await bird.getAttribute('transform');
  const initialReading = await reading.innerText();

  const approach = board.getByRole('button', { name: /Trace the approach/ });
  await approach.focus();
  await page.keyboard.press('Enter');
  await expect(approach).toBeFocused();
  await expect(approach).toHaveAttribute('aria-pressed', 'true');
  await expect(board).toHaveAttribute('data-hunting-phase', '1');
  await expect(bird).not.toHaveAttribute('transform', initialPosition!);
  await expect(reading).not.toHaveText(initialReading);
  await expect(reading.getByRole('heading', { name: 'Trace the approach', exact: true })).toBeVisible();

  await strategy.selectOption('4');
  await expect(board).toHaveAttribute('data-hunting-phase', '0');
  await expect(board).toContainText('Osprey');
  const interaction = board.getByRole('button', { name: /Inspect the interaction/ });
  await interaction.focus();
  await page.keyboard.press('Space');
  await expect(interaction).toBeFocused();
  await expect(board).toHaveAttribute('data-hunting-phase', '2');
  await expect(reading).toContainText('does not guarantee a meal');
  await expect(board).toContainText('not measured tracks');

  await strategy.selectOption('0');
  await expect(board).toHaveAttribute('data-hunting-phase', '1');
  await expect(approach).toHaveAttribute('aria-pressed', 'true');
  await strategy.selectOption('4');
  await expect(board).toHaveAttribute('data-hunting-phase', '2');
  await expect(interaction).toHaveAttribute('aria-pressed', 'true');
  await board.getByRole('button', { name: /Locate food/ }).click();
  await expect(board).toHaveAttribute('data-hunting-phase', '0');
  await expect(board.locator('[data-hunting-step][aria-pressed=true]')).toHaveCount(1);

  const methods = await strategy.locator('option').evaluateAll(options => options.map(option => ({
    value: (option as HTMLOptionElement).value,
    label: option.textContent || '',
  })));
  expect(methods).toHaveLength(14);
  const contexts = new Set<string>();
  for (const method of methods) {
    await strategy.selectOption(method.value);
    await expect(board.locator('.rh-hunt-scene-head h4')).toHaveText(method.label);
    const context = await board.locator('.rh-hunt-scene').getAttribute('data-hunting-habitat');
    if (context) contexts.add(context);
    let previousExplanation = '';
    for (const [phase, name] of ['Locate food', 'Trace the approach', 'Inspect the interaction'].entries()) {
      await board.getByRole('button', { name: new RegExp(name) }).click();
      await expect(reading.getByRole('heading', { name, exact: true })).toBeVisible();
      const explanation = reading.locator(':scope > p');
      await expect(explanation).not.toHaveText('');
      if (phase > 0) await expect(explanation).not.toHaveText(previousExplanation);
      previousExplanation = await explanation.innerText();
      await expect(board.locator('[data-hunting-step][aria-pressed=true]')).toHaveCount(1);
      const geometry = await board.locator('.rh-hunt-scene > svg').evaluate(svg => {
        const values = Array.from(svg.querySelectorAll('[d], [points], [transform]')).flatMap(element =>
          ['d', 'points', 'transform'].map(name => element.getAttribute(name)).filter((value): value is string => value !== null));
        const actor = svg.querySelector('[data-hunting-actor=bird]') as SVGGraphicsElement;
        const actorBox = actor.getBBox();
        const routes = Array.from(svg.querySelectorAll<SVGPolylineElement>('[data-hunting-route]')).map(route =>
          Array.from(route.points).map(point => [point.x, point.y]));
        return {
          invalid: values.some(value => /NaN|Infinity|undefined|null/.test(value)),
          actorVisible: [actorBox.x, actorBox.y, actorBox.width, actorBox.height].every(Number.isFinite)
            && actorBox.width > 0 && actorBox.height > 0,
          routesFinite: routes.every(route => route.length >= 2 && route.flat().every(Number.isFinite)),
          routeLengths: routes.map(route => route.length),
        };
      });
      expect(geometry.invalid, `${method.label}, ${name}`).toBe(false);
      expect(geometry.actorVisible, `${method.label}, ${name}`).toBe(true);
      expect(geometry.routesFinite, `${method.label}, ${name}`).toBe(true);
      expect(geometry.routeLengths[0], `${method.label}: complete route`).toBe(3);
      expect(geometry.routeLengths.slice(1), `${method.label}: inspected route`).toEqual(phase === 0 ? [] : [phase + 1]);
    }
  }
  expect(contexts.size).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});

test('climate experiment keeps peak shifts independent, exposes direction and limits, and preserves the evidence lens', async ({ page }) => {
  const errors = await mount(page, 'climate');
  const experiment = page.locator('[data-raptor-climate-workbench]');
  const prey = experiment.getByRole('slider', { name: 'Prey peak shift (days)', exact: true });
  const demand = experiment.getByRole('slider', { name: 'Food-demand peak shift (days)', exact: true });
  const preyCurve = experiment.locator('[data-climate-curve=prey]');
  const demandCurve = experiment.locator('[data-climate-curve=demand]');
  const status = experiment.locator('.rh-climate-gap[role=status]');
  const alignedDemand = await demandCurve.getAttribute('d');
  const alignedPrey = await preyCurve.getAttribute('d');
  await expect(status).toContainText('0 days');
  await expect(status).toContainText('coincide');
  await expect(experiment).toContainText('hypothetical timing experiment');
  await expect(experiment).toContainText('Peak separation alone cannot predict');

  await experiment.getByRole('button', { name: 'Prey shifts first', exact: true }).click();
  await expect(prey).toHaveValue('-14');
  await expect(demand).toHaveValue('0');
  await expect(preyCurve).not.toHaveAttribute('d', alignedPrey!);
  await expect(demandCurve).toHaveAttribute('d', alignedDemand!);
  await expect(status).toContainText('14 days');
  await expect(status).toContainText('Prey availability peaks before food demand');

  const weather = experiment.getByRole('button', { name: 'Weather records', exact: true });
  await weather.focus();
  await page.keyboard.press('Enter');
  await expect(weather).toBeFocused();
  await expect(weather).toHaveAttribute('aria-pressed', 'true');
  await expect(experiment.locator('[data-climate-evidence]')).toContainText('short weather events from longer climate trends');
  await experiment.getByRole('button', { name: 'Both peaks advance', exact: true }).click();
  await expect(prey).toHaveValue('-14');
  await expect(demand).toHaveValue('-10');
  await expect(status).toContainText('4 days');
  await expect(weather).toHaveAttribute('aria-pressed', 'true');

  // Native range keyboard behavior must move only the focused peak, including both bounds.
  await prey.focus();
  await page.keyboard.press('End');
  await expect(prey).toBeFocused();
  await expect(prey).toHaveValue('21');
  await expect(demand).toHaveValue('-10');
  await expect(status).toContainText('31 days');
  await expect(status).toContainText('Food demand peaks before prey availability');
  await demand.focus();
  await page.keyboard.press('Home');
  await expect(demand).toHaveValue('-21');
  await expect(status).toContainText('42 days');
  await page.keyboard.press('ArrowRight');
  await expect(demand).toHaveValue('-20');
  await expect(status).toContainText('41 days');
  await experiment.getByRole('button', { name: 'Aligned reference', exact: true }).click();
  await expect(prey).toHaveValue('0');
  await expect(demand).toHaveValue('0');
  await expect(preyCurve).toHaveAttribute('d', alignedPrey!);
  await expect(demandCurve).toHaveAttribute('d', alignedDemand!);
  await expect(weather).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText('0 days');
  expect(errors).toEqual([]);
});

for (const activity of [
  { section: 'comparative', root: '[data-raptor-comparative-workbench]', first: '[data-comparative-side=A]', second: '[data-comparative-side=B]' },
  { section: 'hunting', root: '[data-raptor-hunting-workbench]', first: '.rh-hunt-scene', second: '.rh-hunt-reading' },
  { section: 'climate', root: '[data-raptor-climate-workbench]', first: '.rh-climate-chart-panel', second: '.rh-climate-controls' },
]) {
  test(`${activity.section} remains usable in a 500px desktop pane with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await mount(page, activity.section, 500);
    const workbench = page.locator(activity.root);
    await expectInsideHost(page, workbench);
    const first = await workbench.locator(activity.first).boundingBox();
    const second = await workbench.locator(activity.second).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.width).toBeGreaterThan(350);
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 1);
    for (const control of await workbench.locator('select:visible, button:visible, input:visible').all()) {
      await expectInsideHost(page, control);
    }
    if (activity.section === 'comparative') {
      await workbench.getByRole('button', { name: 'Tail shape', exact: true }).click();
      await workbench.getByRole('button', { name: 'Save this trait as evidence', exact: true }).click();
      await expect(workbench.locator('[data-comparative-evidence]')).toContainText('Tail shape');
    } else if (activity.section === 'hunting') {
      await workbench.getByRole('button', { name: /Inspect the interaction/ }).click();
      await expect(workbench.locator('[data-hunting-reading]')).toContainText('does not guarantee a meal');
    } else {
      await workbench.getByRole('slider', { name: 'Prey peak shift (days)', exact: true }).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(workbench.locator('.rh-climate-gap[role=status]')).toContainText(/1 day/);
    }
    await expectInsideHost(page, workbench);
    expect(errors).toEqual([]);
  });
}
