import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {GlHarness} from './helpers/stem_gl_harness';

const physics = createRequire(join(process.cwd(), 'package.json'))('./stem_lab/stem_tool_magnetism.js');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism',
  width: 1080, height: 1000, layout: 'document', appStyles: true,
});
const before = process.env.MAG_POWER_STAGE === 'before';
const dir = join(process.cwd(), 'tmp', 'magnetism-power-bridge-visual-20261102');

test.describe.configure({mode: 'serial', timeout: 150000, retries: 0});
test.beforeAll(async () => { await harness.start(); await mkdir(dir, {recursive: true}); });
test.afterAll(async () => await harness.stop());
test.afterEach(async ({page}) => await harness.destroy(page));

for (const profile of [
  {name: 'desktop', width: 1080, theme: 'dark'},
  {name: 'phone', width: 390, theme: 'dark'},
  {name: 'light', width: 1080, theme: 'light'},
  {name: 'forced-colors', width: 320, theme: 'contrast'},
]) test('magnetic work bridge follows force and shaft motion · ' + profile.name, async ({page}) => {
  test.skip(before && profile.theme !== 'dark');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width: profile.width, height: 1000});
  await page.emulateMedia({reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none'});
  await harness.mount(page, {magnetism: {
    tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false,
    motorCurrent: 3, motorField: 4, motorAngle: 90,
    forceLabCurrent: 3, forceLabField: 4, forceLabAngle: 45, forceLabLength: 5,
    forceLabSpeed: 300, forceLabCurrentDir: 1, forceLabFieldDir: 1,
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

  const bridge = page.getByRole('region', {name: 'Magnetic work and power bridge', exact: true});
  await expect(bridge).toBeVisible();
  if (before) {
    await bridge.screenshot({path: join(dir, 'before-' + profile.name + '.png'),
      style: '.mag-root .mag-passport{visibility:hidden!important}'});
    expect(errors).toEqual([]);
    return;
  }

  const path = bridge.locator('.mag-power-path');
  await expect(path.locator('[data-power-step]')).toHaveCount(3);
  for (const name of ['force', 'torque', 'power']) {
    await expect(path.locator('[data-power-step="' + name + '"]')).toHaveCount(1);
  }
  const state = () => page.evaluate(() => (window as any).__toolData.magnetism);
  const initial = await state();
  async function correspond() {
    const data = await state();
    const model = physics.motorPowerBridgeState(data.forceLabCurrent, data.forceLabField,
      data.forceLabAngle, data.forceLabLength, data.forceLabSpeed,
      data.forceLabCurrentDir, data.forceLabFieldDir);
    for (const [name, value] of [
      ['force', model.magnitude], ['torque', model.torque], ['power', model.mechanicalPower],
      ['speed', model.tangentialSpeed], ['work', model.workPerTurn], ['radius', model.radius],
    ] as const) await expect(bridge.locator('[data-power-reading="' + name + '"]')).toHaveText(value.toFixed(2));
    for (const [name, value, maximum] of [
      ['force', model.magnitude, 40], ['speed', model.tangentialSpeed, 40], ['power', model.mechanicalPower, 160],
    ] as const) {
      const width = await bridge.locator('[data-power-bar="' + name + '"]').evaluate(element => (element as HTMLElement).style.width);
      expect(width).toMatch(/%$/);
      expect(parseFloat(width)).toBeCloseTo(Math.min(100, value / maximum * 100), 4);
    }
    return model;
  }
  const start = await correspond();
  await bridge.screenshot({path: join(dir, profile.name + '.png'),
    style: '.mag-root .mag-passport{visibility:hidden!important}'});
  const layout = await bridge.evaluate(element => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth,
    steps: [...element.querySelectorAll<HTMLElement>('[data-power-step]')].map(step => {
      const box = step.getBoundingClientRect();
      return {left: box.left, right: box.right, top: box.top, width: box.width,
        horizontalOverflow: step.scrollWidth > step.clientWidth + 1};
    }),
    readingFonts: [...element.querySelectorAll('[data-power-reading]')]
      .map(reading => parseFloat(getComputedStyle(reading).fontSize)),
  }));
  expect(layout.document).toBeLessThanOrEqual(profile.width + 1);
  expect(layout.steps).toHaveLength(3);
  for (const step of layout.steps) {
    expect(step.left).toBeGreaterThanOrEqual(-1);
    expect(step.right).toBeLessThanOrEqual(profile.width + 1);
    expect(step.width).toBeGreaterThanOrEqual(180);
    expect(step.horizontalOverflow).toBe(false);
  }
  if (profile.width < 760) {
    expect(layout.steps[1].top).toBeGreaterThan(layout.steps[0].top);
    expect(layout.steps[2].top).toBeGreaterThan(layout.steps[1].top);
  } else {
    expect(layout.steps[1].left).toBeGreaterThan(layout.steps[0].left);
    expect(layout.steps[2].left).toBeGreaterThan(layout.steps[1].left);
  }
  expect(layout.readingFonts).toHaveLength(6);
  for (const fontSize of layout.readingFonts) expect(fontSize).toBeGreaterThanOrEqual(22);
  await writeFile(join(dir, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));
  async function audit(suffix: string) {
    if (profile.name !== 'desktop') return;
    const violations = await bridge.evaluate(async element => (await (window as any).axe.run(element, {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']},
    })).violations.map((violation: any) => ({id: violation.id, targets: violation.nodes.map((node: any) => node.target)})));
    await writeFile(join(dir, 'axe' + suffix + '.json'), JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  }
  if (profile.name === 'desktop') await page.addScriptTag({path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js')});
  await audit('');

  for (const [rpm, name] of [[0, '0 RPM · stop'], [300, '300 RPM · steady'], [600, '600 RPM · fast']] as const) {
    await bridge.getByRole('button', {name, exact: true}).click();
    const model = await correspond();
    expect((await state()).forceLabSpeed).toBe(rpm);
    expect(model.magnitude).toBe(start.magnitude);
    expect(model.torque).toBe(start.torque);
    if (!rpm) await expect(bridge).toContainText(/shaft is stopped/i);
  }
  const speed = bridge.getByRole('slider', {name: 'Shaft speed (RPM)', exact: true});
  await speed.fill('300');
  await speed.focus();
  await page.keyboard.press('ArrowRight');
  expect((await state()).forceLabSpeed).toBe(350);
  await correspond();

  const wire = page.getByRole('region', {name: 'Right-hand-rule wire-force lab', exact: true});
  const current = wire.getByRole('slider', {name: 'Current in wire (I)', exact: true});
  const field = wire.getByRole('slider', {name: 'Magnetic field (B)', exact: true});
  const angle = wire.getByRole('slider', {name: 'Wire angle from field (θ)', exact: true});
  const length = wire.getByRole('slider', {name: 'Wire length (L)', exact: true});
  await current.fill('0');
  await correspond();
  await expect(bridge).toContainText('Current is zero');
  await audit('-zero');
  await current.fill('3');
  await field.fill('0');
  await correspond();
  await expect(bridge).toContainText('Magnetic field is zero');
  await field.fill('4');
  await angle.fill('0');
  await correspond();
  await expect(bridge).toContainText(/wire is parallel/i);

  await current.fill('1');
  await field.fill('1');
  await angle.fill('45');
  await length.fill('1');
  await speed.fill('50');
  await correspond();
  for (const name of ['force', 'speed', 'power']) {
    const width = await bridge.locator('[data-power-bar="' + name + '"]').evaluate(element => parseFloat((element as HTMLElement).style.width));
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(100);
  }

  await angle.fill('90');
  await length.fill('10');
  await correspond();
  await current.fill('8');
  await field.fill('8');
  await speed.fill('600');
  await correspond();

  const final = await state();
  expect(final.notebookTrials).toEqual([]);
  expect(final.notebookOpen).toBe(false);
  expect(final.tab).toBe('motor');
  expect(final.motorMode).toBe('forces');
  expect([final.motorCurrent, final.motorField, final.motorAngle]).toEqual([3, 4, 90]);
  for (const key of ['analyzerMysteryScan', 'induceMotion', 'emfTrace', 'motorLoadSamples']) expect(final[key]).toEqual(initial[key]);
  expect(errors).toEqual([]);
});
