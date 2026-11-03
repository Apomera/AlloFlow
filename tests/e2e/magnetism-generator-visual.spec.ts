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
const before = process.env.MAG_GENERATOR_STAGE === 'before';
const dir = join(process.cwd(), 'tmp', 'magnetism-generator-visual-20261102',
  process.env.MAG_GENERATOR_STAGE === 'mutant' ? 'mutant' : '');

test.describe.configure({mode: 'serial', timeout: 150000, retries: 0});
test.beforeAll(async () => { await harness.start(); await mkdir(dir, {recursive: true}); });
test.afterAll(async () => await harness.stop());
test.afterEach(async ({page}) => await harness.destroy(page));

for (const profile of [
  {name: 'desktop', width: 1080, theme: 'dark'},
  {name: 'phone', width: 390, theme: 'dark'},
  {name: 'light', width: 1080, theme: 'light'},
  {name: 'forced-colors', width: 320, theme: 'contrast'},
]) test('rotating generator views follow phase and speed · ' + profile.name, async ({page}) => {
  test.skip(before && profile.theme !== 'dark');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width: profile.width, height: 1000});
  await page.emulateMedia({reducedMotion: 'reduce', forcedColors: profile.theme === 'contrast' ? 'active' : 'none'});
  await harness.mount(page, {magnetism: {
    tab: 'induce', induceMode: 'coil', genAngle: 45, genTurns: 60, genField: 4, genRPM: 60,
    learningMode: 'guided', labShellPanel: '', notebookTrials: [], notebookOpen: false,
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

  const card = page.getByRole('region', {name: 'Rotating-coil generator — see the phase shift', exact: true});
  await expect(card).toBeVisible();
  if (before) {
    await card.screenshot({path: join(dir, 'before-' + profile.name + '.png'),
      style: '.mag-root .mag-passport{visibility:hidden!important}'});
    expect(errors).toEqual([]);
    return;
  }

  const stages = card.locator('.mag-generator-stages');
  const traces = card.locator('.mag-generator-traces');
  await expect(stages.locator('figure')).toHaveCount(2);
  await expect(traces.locator('figure')).toHaveCount(2);
  for (const figure of ['coil', 'phase']) await expect(stages.locator('[data-generator-figure="' + figure + '"]')).toHaveCount(1);
  for (const figure of ['flux', 'voltage']) await expect(traces.locator('[data-generator-figure="' + figure + '"]')).toHaveCount(1);
  const state = () => page.evaluate(() => (window as any).__toolData.magnetism);
  const initial = await state();

  async function correspond() {
    const data = await state();
    const phase = physics.rotatingPhaseState(data.genAngle, data.genTurns, data.genField, data.genRPM);
    const scale = Math.min(1, data.genRPM / 180);
    const cursor = 176 + phase.angle / 360 * 136;
    const radians = phase.angle * Math.PI / 180;
    const fluxPoints: string[] = [], voltagePoints: string[] = [];
    for (let angle = 0; angle <= 360; angle += 6) {
      const x = (176 + angle / 360 * 136).toFixed(1);
      fluxPoints.push(x + ',' + (72 - Math.cos(angle * Math.PI / 180) * 25).toFixed(1));
      voltagePoints.push(x + ',' + (148 - Math.sin(angle * Math.PI / 180) * 25 * scale).toFixed(1));
    }
    await expect(traces.locator('[data-generator-series="flux"]')).toHaveAttribute('points', fluxPoints.join(' '));
    await expect(traces.locator('[data-generator-series="voltage"]')).toHaveAttribute('points', voltagePoints.join(' '));
    await expect(traces.locator('[data-generator-series="voltage"]')).toHaveAttribute('stroke-dasharray', '6 3');
    const cursors = traces.locator('[data-generator-cursor]');
    await expect(cursors).toHaveCount(2);
    for (const line of await cursors.all()) {
      expect(Number(await line.getAttribute('x1'))).toBeCloseTo(cursor, 6);
      expect(Number(await line.getAttribute('x2'))).toBeCloseTo(cursor, 6);
    }
    const fluxPoint = traces.locator('circle[data-generator-point="flux"]');
    const voltagePoint = traces.locator('rect[data-generator-point="voltage"]');
    await expect(fluxPoint).toHaveCount(1);
    await expect(voltagePoint).toHaveCount(1);
    expect(Number(await fluxPoint.getAttribute('cx'))).toBeCloseTo(cursor, 6);
    expect(Number(await fluxPoint.getAttribute('cy'))).toBeCloseTo(72 - phase.fluxNorm * 25, 6);
    expect(Number(await voltagePoint.getAttribute('x'))).toBeCloseTo(cursor - 3.5, 6);
    expect(Number(await voltagePoint.getAttribute('y'))).toBeCloseTo(148 - phase.emfNorm * 25 * scale - 3.5, 6);
    await expect(voltagePoint).toHaveAttribute('transform',
      'rotate(45 ' + cursor + ' ' + (148 - phase.emfNorm * 25 * scale) + ')');
    const ray = stages.locator('[data-generator-phase-ray]');
    await expect(ray).toHaveAttribute('x1', '72');
    await expect(ray).toHaveAttribute('y1', '92');
    expect(Number(await ray.getAttribute('x2'))).toBeCloseTo(72 + Math.cos(radians) * 52, 6);
    expect(Number(await ray.getAttribute('y2'))).toBeCloseTo(92 - Math.sin(radians) * 52, 6);
    const normal = stages.locator('[data-generator-normal]');
    expect(Number(await normal.getAttribute('x2'))).toBeCloseTo(80 + Math.cos(radians) * 44, 6);
    expect(Number(await normal.getAttribute('y2'))).toBeCloseTo(100 + Math.sin(radians) * 44, 6);
    await expect(card.locator('[data-generator-normalized="flux"]')).toHaveText(phase.fluxNorm.toFixed(2));
    await expect(card.locator('[data-generator-normalized="voltage"]')).toHaveText(phase.emfNorm.toFixed(2));
    for (const [label, normalized] of [
      ['Normalized flux Φ', phase.fluxNorm], ['Normalized voltage ε', phase.emfNorm],
    ] as const) {
      const meter = card.getByRole('meter', {name: label, exact: true});
      await expect(meter).toHaveAttribute('aria-valuenow', String(Number(normalized.toFixed(6))));
      expect(await meter.getAttribute('aria-valuenow')).not.toMatch(/[eE]/);
    }
    await expect(card.locator('[data-generator-reading="flux"]')).toHaveText(phase.flux.toFixed(0) + ' Φ units');
    await expect(card.locator('[data-generator-reading="voltage"]')).toHaveText(phase.emf.toFixed(0) + ' ε units');
    if (phase.stopped) {
      expect(phase.emf).toBe(0);
      await expect(card.locator('[data-generator-reading="voltage"]')).toHaveText('0 ε units');
      await expect(card).toContainText('The coil is stopped');
    }
  }

  await correspond();
  for (const [name, grid] of [['stages', stages], ['traces', traces]] as const) {
    await grid.screenshot({path: join(dir, profile.name + '-' + name + '.png'),
      style: '.mag-root .mag-passport{visibility:hidden!important}'});
  }
  const layout = await card.evaluate(element => {
    const groups = [...element.querySelectorAll<HTMLElement>('.mag-generator-stages,.mag-generator-traces')].map(group => ({
      className: group.className,
      figures: [...group.querySelectorAll<HTMLElement>('figure')].map(figure => {
        const box = figure.getBoundingClientRect();
        const caption = figure.querySelector('figcaption');
        return {left: box.left, right: box.right, top: box.top, width: box.width,
          captionFont: caption ? parseFloat(getComputedStyle(caption).fontSize) : 0,
          horizontalOverflow: figure.scrollWidth > figure.clientWidth + 1};
      }),
    }));
    const readings = [...element.querySelectorAll('[data-generator-reading]')]
      .map(reading => parseFloat(getComputedStyle(reading).fontSize));
    return {viewport: innerWidth, document: document.documentElement.scrollWidth, groups, readings};
  });
  expect(layout.document).toBeLessThanOrEqual(profile.width + 1);
  for (const group of layout.groups) {
    expect(group.figures).toHaveLength(2);
    for (const figure of group.figures) {
      expect(figure.left).toBeGreaterThanOrEqual(-1);
      expect(figure.right).toBeLessThanOrEqual(profile.width + 1);
      expect(figure.width).toBeGreaterThan(200);
      expect(figure.captionFont).toBeGreaterThanOrEqual(12);
      expect(figure.horizontalOverflow).toBe(false);
    }
    if (profile.width < 760) expect(group.figures[1].top).toBeGreaterThan(group.figures[0].top);
    else expect(group.figures[1].left).toBeGreaterThan(group.figures[0].left);
  }
  expect(layout.readings).toHaveLength(2);
  for (const fontSize of layout.readings) expect(fontSize).toBeGreaterThanOrEqual(22);
  await writeFile(join(dir, profile.name + '-layout.json'), JSON.stringify(layout, null, 2));
  async function auditCard(filename: string) {
    const violations = await card.evaluate(async element => (await (window as any).axe.run(element, {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']},
    })).violations.map((violation: any) => ({id: violation.id, targets: violation.nodes.map((node: any) => node.target)})));
    await writeFile(join(dir, filename), JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
  }
  if (profile.name === 'desktop') {
    await page.addScriptTag({path: join(process.cwd(), 'desktop/web-app/node_modules/axe-core/axe.min.js')});
    await auditCard('axe.json');
  }

  for (const name of ['Flux maximum · 0°', 'Voltage maximum · 90°', 'Flux minimum · 180°', 'Voltage minimum · 270°']) {
    await card.getByRole('button', {name, exact: true}).click();
    await correspond();
    if (profile.name === 'desktop' && name === 'Voltage maximum · 90°') await auditCard('axe-cardinal-90.json');
  }
  const angle = card.getByRole('slider', {name: 'Coil angle (θ)', exact: true});
  for (const value of [360, 45]) { await angle.fill(String(value)); await correspond(); }
  const speed = card.getByRole('slider', {name: 'Crank speed (RPM)', exact: true});
  for (const value of [0, 60, 180]) { await speed.fill(String(value)); await correspond(); }
  await card.getByRole('slider', {name: 'Turns in rotating coil (N)', exact: true}).fill('200');
  await card.getByRole('slider', {name: 'Generator field strength (B)', exact: true}).fill('8');
  await correspond();
  const step = card.getByRole('button', {name: '↻ Step 30°', exact: true});
  await step.focus();
  await page.keyboard.press('Enter');
  await correspond();
  const final = await state();
  expect(final.genAngle).toBe(75);
  expect(final.tab).toBe('induce');
  expect(final.induceMode).toBe('coil');
  expect(final.notebookTrials).toEqual([]);
  expect(final.notebookOpen).toBe(false);
  for (const key of ['induceX', 'lastEMF', 'emfTrace', 'induceMotion', 'forceLabCurrent', 'forceLabAngle']) {
    expect(final[key]).toEqual(initial[key]);
  }
  expect(errors).toEqual([]);
});
