import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {GlHarness} from './helpers/stem_gl_harness';

const physics = createRequire(join(process.cwd(), 'package.json'))('./stem_lab/stem_tool_magnetism.js');
const harness = new GlHarness({toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism',
  width: 1080, height: 1000, layout: 'document', appStyles: true});
const before = process.env.MAG_ENERGY_CHART_STAGE === 'before';
const dir = join(process.cwd(), 'tmp', 'magnetism-energy-charts-visual-20261102');
const panels = [
  {key: 'rpm', top: 32, floor: 700, unit: 'RPM', targetMin: 500, targetMax: null},
  {key: 'generatedVoltage', top: 107, floor: 20, unit: 'V', targetMin: 14, targetMax: 18},
  {key: 'outputPower', top: 182, floor: 8, unit: 'W', targetMin: 5, targetMax: null},
];
const controls = {current: 3, motorField: 4, loadOhms: 40, friction: 3, turns: 80, generatorField: 4};

test.describe.configure({mode: 'serial', timeout: 150000, retries: 0});
test.beforeAll(async () => { await harness.start(); await mkdir(dir, {recursive: true}); });
test.afterAll(async () => await harness.stop());
test.afterEach(async ({page}) => await harness.destroy(page));

for (const profile of [
  {name: 'desktop', width: 1080, theme: 'dark'},
  {name: 'phone', width: 390, theme: 'dark'},
  {name: 'light', width: 1080, theme: 'light'},
  {name: 'forced-colors', width: 320, theme: 'contrast'},
]) test('energy mission charts retain projected and recorded data · ' + profile.name, async ({page}) => {
  test.skip(before && profile.theme !== 'dark');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width: profile.width, height: 1000});
  await page.emulateMedia({reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none'});
  await harness.mount(page, {magnetism: {
    tab: 'motor', motorMode: 'energy', benchView: 'mission', benchRunning: false,
    motorRunning: false, motorCurrent: 3, motorField: 4, motorAngle: 90,
    benchLoadOhms: 40, benchFriction: 3, benchTurns: 80, benchField: 4,
    benchTrace: [], benchTrials: [], benchCompareTrialId: null,
    benchTime: 0, benchOmega: 0, benchTemperature: 22, benchMissionStatus: 'ready',
    learningMode: 'guided', notebookTrials: [], notebookOpen: false, labShellPanel: '',
  }}, undefined, {expectCanvas: false});
  await page.locator('#wrap').evaluate((element, width) => {
    (element as HTMLElement).style.width = width + 'px';
  }, profile.width);
  if (profile.theme !== 'dark') await page.evaluate(theme => {
    const colors = theme === 'light'
      ? {panel: '#f8fafc', deeper: '#e2e8f0', text: '#0f172a', 'text-soft': '#475569', border: '#cbd5e1'}
      : {panel: '#000000', deeper: '#000000', text: '#ffff00', 'text-soft': '#ffff00', border: '#ffff00'};
    const element = document.getElementById('wrap')!;
    element.setAttribute('data-stem-tool-shell', 'magnetism');
    document.body.classList.add('theme-' + theme);
    for (const [name, value] of Object.entries(colors)) element.style.setProperty('--allo-stem-' + name, value);
  }, profile.theme);

  const card = page.getByRole('region', {name: 'Coupled motor–generator engineering bench', exact: true});
  await expect(card).toBeVisible();
  if (before) {
    await card.locator('svg[aria-label*="ten second motor generator response"]').screenshot({
      path: join(dir, 'before-' + profile.name + '.png'),
      style: '.mag-root .mag-passport{visibility:hidden!important}',
    });
    expect(errors).toEqual([]);
    return;
  }

  const charts = card.locator('.mag-bench-charts');
  await expect(charts.locator('figure[data-bench-chart]')).toHaveCount(3);
  const state = () => page.evaluate(() => (window as any).__toolData.magnetism);
  const initial = await state();
  const projected = physics.motorGeneratorSimulate(controls, 10, 0.2);

  async function correspond(samples: any[], comparison: any[], isProjected: boolean) {
    await expect(charts).toHaveAttribute('data-projected', String(isProjected));
    for (const [index, panel] of panels.entries()) {
      const figure = charts.locator('[data-bench-chart="' + panel.key + '"]');
      await expect(figure).toHaveCount(1);
      const maximum = Math.max(panel.floor, samples.concat(comparison)
        .reduce((value, sample) => Math.max(value, Number(sample[panel.key]) || 0), 0) * 1.12);
      const xAt = (sample: any) => 56 + Math.max(0, Math.min(10, sample.time || 0)) / 10 * 392;
      const yAt = (value: number) => panel.top + 54 - Math.max(0, Math.min(maximum, value)) / maximum * 54;
      const points = (trace: any[]) => trace.map(sample => xAt(sample).toFixed(1) + ','
        + yAt(Number(sample[panel.key]) || 0).toFixed(1)).join(' ');
      const current = figure.locator('[data-bench-series="current"]');
      await expect(current).toHaveAttribute('points', points(samples));
      await expect(current).toHaveAttribute('stroke-dasharray', isProjected ? '6 4' : 'none');
      const target = figure.locator('[data-bench-target]');
      await expect(target).toHaveCount(1);
      expect(Number(await target.getAttribute('y1'))).toBeCloseTo(yAt(panel.targetMin), 6);
      expect(Number(await target.getAttribute('y2'))).toBeCloseTo(yAt(panel.targetMin), 6);
      const band = figure.locator('[data-bench-band]');
      const bandTop = panel.targetMax == null ? panel.top : yAt(panel.targetMax);
      await expect(band).toHaveCount(1);
      await expect(band).toHaveAttribute('x', '56');
      await expect(band).toHaveAttribute('width', '392');
      expect(Number(await band.getAttribute('y'))).toBeCloseTo(bandTop, 6);
      expect(Number(await band.getAttribute('height'))).toBeCloseTo(Math.max(0, yAt(panel.targetMin) - bandTop), 6);
      const previous = figure.locator('[data-bench-series="comparison"]');
      await expect(previous).toHaveCount(comparison.length ? 1 : 0);
      if (comparison.length) {
        await expect(previous).toHaveAttribute('points', points(comparison));
        await expect(previous).toHaveAttribute('stroke-dasharray', '3 4');
      }
      const last = samples.at(-1) || {};
      const x = xAt(last), y = yAt(Number(last[panel.key]) || 0);
      const marker = figure.locator('[data-bench-end]');
      await expect(marker).toHaveCount(1);
      if (index === 0) {
        expect(await marker.evaluate(element => element.tagName.toLowerCase())).toBe('circle');
        expect(Number(await marker.getAttribute('cx'))).toBeCloseTo(x, 6);
        expect(Number(await marker.getAttribute('cy'))).toBeCloseTo(y, 6);
      } else if (index === 1) {
        expect(await marker.evaluate(element => element.tagName.toLowerCase())).toBe('rect');
        expect(Number(await marker.getAttribute('x'))).toBeCloseTo(x - 4, 6);
        expect(Number(await marker.getAttribute('y'))).toBeCloseTo(y - 4, 6);
      } else {
        expect(await marker.evaluate(element => element.tagName.toLowerCase())).toBe('polygon');
        await expect(marker).toHaveAttribute('points', x + ',' + (y - 5) + ' ' + (x + 5) + ',' + y
          + ' ' + x + ',' + (y + 5) + ' ' + (x - 5) + ',' + y);
      }
      const value = index === 0 ? String(Math.round(Number(last[panel.key]) || 0))
        : (Number(last[panel.key]) || 0).toFixed(1);
      await expect(figure.locator('[data-bench-reading]')).toHaveText(value + ' ' + panel.unit);
    }
  }

  await correspond(projected, [], true);
  await charts.screenshot({path: join(dir, profile.name + '.png'),
    style: '.mag-root .mag-passport{visibility:hidden!important}'});
  const layout = await charts.evaluate(element => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    figures: [...element.querySelectorAll<HTMLElement>('figure[data-bench-chart]')].map(figure => {
      const box = figure.getBoundingClientRect();
      const axisLabels = [...figure.querySelectorAll('span')]
        .filter(label => /^(0|5|10) s$/.test(label.textContent?.trim() || ''));
      return {left: box.left, right: box.right, top: box.top, width: box.width,
        horizontalOverflow: figure.scrollWidth > figure.clientWidth + 1,
        readingFont: parseFloat(getComputedStyle(figure.querySelector('[data-bench-reading]')!).fontSize),
        axisCount: axisLabels.length, axisFonts: axisLabels.map(label => parseFloat(getComputedStyle(label).fontSize))};
    }),
  }));
  expect(layout.document).toBeLessThanOrEqual(profile.width + 1);
  expect(layout.figures).toHaveLength(3);
  for (const figure of layout.figures) {
    expect(figure.left).toBeGreaterThanOrEqual(-1);
    expect(figure.right).toBeLessThanOrEqual(profile.width + 1);
    expect(figure.width).toBeGreaterThanOrEqual(200);
    expect(figure.horizontalOverflow).toBe(false);
    expect(figure.readingFont).toBeGreaterThanOrEqual(22);
    expect(figure.axisCount).toBe(3);
    for (const font of figure.axisFonts) expect(font).toBeGreaterThanOrEqual(12);
  }
  if (profile.width < 760) {
    expect(layout.figures[1].top).toBeGreaterThan(layout.figures[0].top);
    expect(layout.figures[2].top).toBeGreaterThan(layout.figures[1].top);
  }
  await writeFile(join(dir, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));

  async function audit(filename: string) {
    if (profile.name !== 'desktop') return;
    const violations = await charts.evaluate(async element => (await (window as any).axe.run(element, {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']},
    })).violations.map((violation: any) => ({id: violation.id, targets: violation.nodes.map((node: any) => node.target)})));
    await writeFile(join(dir, filename), JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  }
  if (profile.name === 'desktop') await page.addScriptTag({path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js')});
  await audit('axe.json');

  const currentTrace = [
    {time: 0, omega: 0, rpm: 0, generatedVoltage: 0, outputPower: 0, temperature: 22},
    {time: 5, omega: 110, rpm: 1100, generatedVoltage: 22, outputPower: 12, temperature: 32},
    {time: 10, omega: 90, rpm: 900, generatedVoltage: 16, outputPower: 8.5, temperature: 35},
  ];
  const previousTrace = [
    {time: 0, rpm: 0, generatedVoltage: 0, outputPower: 0},
    {time: 5, rpm: 800, generatedVoltage: 28, outputPower: 18},
    {time: 10, rpm: 700, generatedVoltage: 15, outputPower: 6},
  ];
  const previousTrial = {id: 1, loadOhms: 40, turns: 80, field: 4, current: 3, motorField: 4,
    friction: 3, rpm: 700, voltage: 15, power: 6, temperature: 35, pass: true, trace: previousTrace};
  await page.evaluate(({trace, trial}) => {
    Object.assign((window as any).__toolData.magnetism, {
      benchTrace: trace, benchTrials: [trial], benchCompareTrialId: 1,
      benchMissionStatus: 'passed', benchTime: 10, benchRunning: false,
    });
    (window as any).__rerender();
  }, {trace: currentTrace, trial: previousTrial});
  await correspond(currentTrace, previousTrace, false);
  await expect(charts).toContainText('trial #1 · dashed');
  await expect(charts).toContainText('current trial · solid');
  await audit('axe-comparison.json');
  if (profile.name === 'desktop') await charts.screenshot({path: join(dir, 'recorded-desktop.png'),
    style: '.mag-root .mag-passport{visibility:hidden!important}'});
  const recorded = await state();
  expect(recorded.benchTrace).toEqual(currentTrace);
  expect(recorded.benchTrials).toEqual([previousTrial]);
  expect(recorded.benchCompareTrialId).toBe(1);
  expect(recorded.benchRunning).toBe(false);
  for (const key of ['motorCurrent', 'motorField', 'motorAngle', 'benchLoadOhms', 'benchFriction',
    'benchTurns', 'benchField', 'notebookTrials', 'notebookOpen']) expect(recorded[key]).toEqual(initial[key]);

  await card.getByRole('table', {name: 'Motor-generator mission trial comparison', exact: true})
    .getByRole('button', {name: 'Hide', exact: true}).click();
  await correspond(currentTrace, [], false);
  const hidden = await state();
  expect(hidden.benchCompareTrialId).toBeNull();
  expect(hidden.benchTrace).toEqual(currentTrace);
  expect(hidden.benchTrials).toEqual([previousTrial]);
  expect(hidden.benchRunning).toBe(false);
  expect(errors).toEqual([]);
});
