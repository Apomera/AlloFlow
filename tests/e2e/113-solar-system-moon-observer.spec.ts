import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const names = Object.fromEntries(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name]));
const retainedKeys = [
  'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
  'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase',
  'orr_cha', 'orr_chh', 'orr_chc', 'orr_chf', 'orr_chpractice', 'orr_chsolution', 'orr_chlast',
  'compare1', 'compare2', 'compareReasoningDrafts', 'signalTarget', 'signalAngle', 'signalNotebooks',
  'signalPrediction', 'signalEvidenceSaved', 'signalLastPing', 'signalPulseNonce',
  'seasonsPrediction', 'seasonsEvidenceSaved', 'gravityPrediction', 'gravityEvidenceSaved', 'quiz',
];

test.describe.configure({ mode: 'default', timeout: 180_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountMoon(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  await page.evaluate(({ data, translatedNames }) => {
    (window as any).__mount({ solarSystem: data });
    const ctx = (window as any).__ctx;
    ctx.t = (key: string, fallback?: string) => translatedNames[key] || fallback || key;
    ctx.isDark = data.isDark;
    ctx.awardXP = (...args: unknown[]) => { ((window as any).__moonXP ||= []).push(args); };
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    translatedNames: names,
    data: {
      tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showMoonLab: true,
      selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true, isDark: dark,
      moonPhaseAngle: 45, moonNodeOffset: 30, moonSouthernView: false, moonPrediction: null, moonEvidenceSaved: false,
      journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
      orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
      orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
      missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
      keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
      transferDebriefs: { 'earth-mars': { explanation: 'Keep my transfer explanation.' } },
      orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25,
      orr_cha: { 0: '11.9' }, orr_chh: { 0: 1 }, orr_chc: { 0: true },
      orr_chf: { 0: { kind: 'correct', text: 'Keep this practice feedback.' } },
      orr_chpractice: { 0: true }, orr_chsolution: { 0: true }, orr_chlast: { 0: { answer: '11.9', correct: true } },
      compare1: 'Earth', compare2: 'Jupiter', compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this comparison.' },
      signalTarget: 'Mars', signalAngle: 90, signalNotebooks: { Mars: { explanation: 'Keep signal reasoning.', observations: [{ target: 'Mars', angle: 90 }] } },
      signalPrediction: 'increase', signalEvidenceSaved: true, signalLastPing: { target: 'Mars', angle: 90, oneWaySeconds: 500 }, signalPulseNonce: 7,
      seasonsPrediction: 'tilt', seasonsEvidenceSaved: true, gravityPrediction: 'same', gravityEvidenceSaved: true,
      quiz: { q: 'Which planet is our home?', a: 'Earth', opts: ['Mercury', 'Earth', 'Mars', 'Jupiter'],
        answered: true, chosen: 'Earth', correct: true, tip: 'Earth is our home planet.', score: 3, streak: 2, bestStreak: 4 },
      ...patch,
    },
  });
  await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  const lab = page.locator('#solar-moon-lab');
  await expect(lab).toBeVisible();
  await expect(lab.getByRole('heading', { name: 'Why do phases repeat—but eclipses do not happen every month?', exact: true })).toBeVisible();
  return lab;
}
async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
async function protectedState(page: Page) {
  return page.evaluate((keys) => {
    const data = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(Object.fromEntries(keys.map((key) => [key, data[key]]))));
  }, retainedKeys);
}
async function noErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
function saveButton(lab: Locator) { return lab.locator('[data-moon-save]'); }
function expectedReadings(phase: number, node: number) {
  return { fraction: .5 * (1 - Math.cos(phase * Math.PI / 180)), age: phase / 360 * 29.53059,
    latitude: 5.145 * Math.sin((phase - node) * Math.PI / 180) };
}
async function expectReadings(lab: Locator, phase: number, node: number) {
  const expected = expectedReadings(phase, node);
  await expect(lab).toHaveAttribute('data-moon-phase-exact', String(phase));
  await expect(lab).toHaveAttribute('data-moon-node-exact', String(node));
  await expect(lab.locator('[data-moon-illuminated-value]')).toHaveText(`${Math.round(expected.fraction * 100)}%`);
  await expect(lab.locator('[data-moon-age-value]')).toHaveText(`${expected.age.toFixed(1)} d`);
  await expect(lab.locator('[data-moon-latitude-value]')).toHaveText(`${expected.latitude.toFixed(2)}°`);
  for (const [key, value] of [['illuminated', expected.fraction], ['age', expected.age], ['latitude', expected.latitude]] as const) {
    expect(Number(await lab.locator(`[data-moon-${key}-value]`).getAttribute('data-value'))).toBeCloseTo(value, 10);
  }
  const meter = lab.getByRole('meter', { name: 'Visible illuminated fraction', exact: true });
  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '1');
  await expect(meter).toHaveAttribute('aria-valuetext', `${Math.round(expected.fraction * 100)} percent illuminated`);
  expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.fraction, 10);
  const ratio = await meter.evaluate((element) => element.firstElementChild!.getBoundingClientRect().width / element.getBoundingClientRect().width);
  expect(ratio).toBeCloseTo(expected.fraction, 2);
  return expected;
}
async function expectHidden(lab: Locator) {
  await expect(lab.locator('[data-inquiry-stage]')).toHaveAttribute('data-inquiry-stage', 'predict');
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'hidden');
  await expect(lab.locator('[data-moon-prediction]:disabled')).toHaveCount(0);
  await expect(saveButton(lab)).toHaveCount(0);
  const diagram = lab.locator('svg[role="img"]');
  await expect(diagram).toHaveAccessibleName(/Predict an alignment/);
  await expect(diagram).not.toHaveAccessibleName(/Solar-eclipse alignment|Lunar-eclipse alignment|No eclipse alignment/);
}

async function readableLayout(lab: Locator, width: number) {
  const sample = await lab.evaluate((section) => {
    const bounds = section.getBoundingClientRect();
    const controls = [...section.querySelectorAll<HTMLElement>('button,input,a')].map((control) => {
      const box = control.getBoundingClientRect(), style = getComputedStyle(control);
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: box.width, height: box.height, left: box.left, right: box.right, font: Number.parseFloat(style.fontSize) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: bounds.left, right: bounds.right, document: document.documentElement.scrollWidth, controls };
  });
  expect(sample.left).toBeGreaterThanOrEqual(-1);
  expect(sample.right).toBeLessThanOrEqual(width + 1);
  expect(sample.document).toBeLessThanOrEqual(width + 1);
  expect(sample.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 13 ||
    control.left < -1 || control.right > width + 1), 'native controls and source links retain readable 44px targets').toEqual([]);
}
async function readableText(lab: Locator) {
  const failures = await lab.evaluate((section) => {
    type Color = [number, number, number, number];
    const parse = (color: string): Color => {
      if (color === 'transparent') return [0, 0, 0, 0];
      const values = color.match(/[\d.]+/g)?.map(Number) || [];
      if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    const over = (top: Color, bottom: Color): Color => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((index) => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha).concat(alpha) as Color;
    };
    const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...section.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return !element.closest('svg,.sr-only,button:disabled,input:disabled') && box.width > 0 && box.height > 0 &&
        style.visibility !== 'hidden' && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    }).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1], opacity = 1;
      for (const ancestor of chain) {
        const style = getComputedStyle(ancestor); background = over(parse(style.backgroundColor), background); opacity *= Number(style.opacity);
      }
      const style = getComputedStyle(element), foreground = parse(style.color); foreground[3] *= opacity;
      const a = luminance(over(foreground, background)), b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter((value) => value.font < 13 || value.ratio < 4.5);
  });
  expect(failures, 'visible portrait labels, readings and explanations retain 13px text and 4.5:1 contrast').toEqual([]);
}

test('the Earth-view portrait, terminator and fixed illumination meter agree across all eight phases', async ({ page }) => {
  const lab = await mountMoon(page);
  const portrait = lab.locator('[data-moon-observer]');
  await expect(portrait).toHaveAttribute('role', 'img');
  expect(await portrait.evaluate((element) => element.tagName)).toBe('DIV');
  await expect(portrait.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(portrait.locator('svg')).toHaveAttribute('focusable', 'false');
  await expect(lab.locator('svg[role="img"]')).toHaveCount(1);
  const phases = ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Third quarter', 'Waning crescent'];
  for (const [index, phaseName] of phases.entries()) {
    const degrees = index * 45;
    await lab.locator(`[data-moon-phase-preset="${degrees}"]`).click();
    const expected = await expectReadings(lab, degrees, 30);
    await expect(portrait.locator('h5')).toHaveText(phaseName);
    await expect(portrait).toHaveAccessibleName(`${phaseName}. View from Earth. Northern view. ${Math.round(expected.fraction * 100)} percent of the visible disk is illuminated. The portrait shows ordinary phase illumination.`);
    const shape = await portrait.locator('svg').evaluate((svg) => {
      const terminator = svg.querySelector<SVGEllipseElement>('[data-moon-observer-terminator]')!;
      const outline = svg.querySelector<SVGCircleElement>('[data-moon-observer-outline]')!;
      return { rx: terminator.rx.baseVal.value, rawRx: Number(terminator.getAttribute('rx')),
        ry: terminator.ry.baseVal.value, fill: terminator.getAttribute('fill'),
        half: svg.querySelector('mask path')!.getAttribute('d'), mask: svg.querySelector('mask')!.getAttribute('maskUnits'),
        view: (svg as SVGSVGElement).viewBox.baseVal.width, outline: [outline.cx.baseVal.value, outline.cy.baseVal.value, outline.r.baseVal.value] };
    });
    const terminatorRadius = Math.abs(82 * Math.cos(degrees * Math.PI / 180));
    expect(shape.rawRx).toBeCloseTo(terminatorRadius, 10);
    // Native SVGLength stores less precision than the serialized attribute.
    expect(Math.abs(shape.rx - terminatorRadius)).toBeLessThan(.001);
    expect(shape.ry).toBe(82);
    expect(shape.fill).toBe(degrees < 90 || degrees > 270 ? '#000000' : '#ffffff');
    expect(shape.half).toBe(`M 110 28 A 82 82 0 0 ${degrees <= 180 ? 1 : 0} 110 192 Z`);
    expect(shape.mask).toBe('userSpaceOnUse');
    expect(shape.view).toBe(220);
    expect(shape.outline).toEqual([110, 110, 82]);
    await expectHidden(lab);
  }
  await noErrors(page);
});

test('saved evidence survives schematic north–south rotations without changing the phase, measurements or XP', async ({ page }) => {
  const lab = await mountMoon(page, 1060, true, { moonPhaseAngle: 135, moonNodeOffset: 17 });
  await lab.locator('[data-moon-prediction="solar"]').click();
  await expect(lab.locator('[data-inquiry-stage] [role="status"]')).toContainText('Evidence differs from your hypothesis.');
  await saveButton(lab).click();
  const before = await state(page), protectedBefore = await protectedState(page);
  for (const south of [true, false, true]) {
    await lab.locator(`[data-moon-view="${south ? 'south' : 'north'}"]`).click();
    await expectReadings(lab, 135, 17);
    await expect(lab.locator('[data-moon-observer-disk]')).toHaveAttribute('data-moon-observer-view', south ? 'south' : 'north');
    await expect(lab.locator('[data-moon-disk-orientation]')).toHaveAttribute('data-moon-disk-orientation', south ? 'south' : 'north');
    if (south) {
      await expect(lab.locator('[data-moon-observer-disk]')).toHaveAttribute('transform', 'rotate(180 110 110)');
      await expect(lab.locator('[data-moon-disk-orientation]')).toHaveAttribute('transform', 'rotate(180 607 164)');
    } else {
      expect(await lab.locator('[data-moon-observer-disk]').getAttribute('transform')).toBeNull();
      expect(await lab.locator('[data-moon-disk-orientation]').getAttribute('transform')).toBeNull();
    }
    await expect(lab.locator('[data-moon-observer]')).toHaveAccessibleName(new RegExp(`${south ? 'Southern' : 'Northern'} view`));
    await expect(saveButton(lab)).toBeDisabled();
    await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'none');
    const current = await state(page);
    expect(current.moonPrediction).toEqual(before.moonPrediction);
    expect(current.journalEntries).toEqual(before.journalEntries);
    expect(await protectedState(page)).toEqual(protectedBefore);
  }
  expect(await page.evaluate(() => ((window as any).__moonXP || []).length)).toBe(0);
  await noErrors(page);
});

test('exact and fractional prediction restores stay locked to their unrounded geometry and boolean saved state', async ({ page }) => {
  for (const trial of [{ phase: 0, node: 0, choice: 'solar', alignment: 'solar' }, { phase: 180, node: 0, choice: 'lunar', alignment: 'lunar' },
    { phase: 90.25, node: 30.75, choice: 'none', alignment: 'none' }]) {
    const record = { phase: trial.phase, node: trial.node, choice: trial.choice };
    const lab = await mountMoon(page, 1060, false, {
      moonPhaseAngle: String(trial.phase), moonNodeOffset: String(trial.node), moonPrediction: record, moonEvidenceSaved: 'false',
    });
    await expectReadings(lab, trial.phase, trial.node);
    await expect(lab.locator('[data-inquiry-stage]')).toHaveAttribute('data-inquiry-stage', 'evidence');
    await expect(lab.locator('[data-moon-prediction]:disabled')).toHaveCount(3);
    await expect(lab.locator(`[data-moon-prediction="${trial.choice}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', trial.alignment);
    await expect(saveButton(lab)).toBeEnabled();
    expect((await state(page)).moonPrediction).toEqual(record);
    expect((await state(page)).moonPhaseAngle).toBe(String(trial.phase));
    expect((await state(page)).moonNodeOffset).toBe(String(trial.node));
    await saveButton(lab).click();
    const entry = (await state(page)).journalEntries.at(-1);
    expect(entry.observation).toContain(`phase angle ${trial.phase}°`);
    expect(entry.observation).toContain(`node offset ${trial.node}°`);
    expect(entry.investigation.id).toBe('moon');
    await noErrors(page);
  }
  const lab = await mountMoon(page, 1060, true, { moonPrediction: { phase: 45, node: 30, choice: 'none' }, moonEvidenceSaved: true });
  await expect(saveButton(lab)).toBeDisabled();
  expect((await state(page)).journalEntries).toHaveLength(1);
  await noErrors(page);
});

test('malformed restores render finite fallback readings and hide stale predictions without rewriting the raw save', async ({ page }) => {
  const patches: { patch: Record<string, unknown>; phase: number; node: number }[] = [
    { patch: { moonPhaseAngle: [90], moonNodeOffset: { value: 0 }, moonPrediction: ['solar'], moonEvidenceSaved: 'true', moonSouthernView: 'true' }, phase: 45, node: 30 },
    { patch: { moonPhaseAngle: true, moonNodeOffset: null, moonPrediction: 'solar', moonEvidenceSaved: 1 }, phase: 45, node: 30 },
    { patch: { moonPhaseAngle: 'Infinity', moonNodeOffset: ' ', moonPrediction: { phase: 45, node: 30, choice: 'constructor' } }, phase: 45, node: 30 },
    { patch: { moonPhaseAngle: -20, moonNodeOffset: 120, moonPrediction: { phase: -20, node: 120, choice: 'solar' } }, phase: 0, node: 90 },
    { patch: { moonPhaseAngle: Infinity, moonNodeOffset: NaN, moonPrediction: { phase: 45, choice: 'none' } }, phase: 45, node: 30 },
    { patch: { moonPhaseAngle: 90.25, moonNodeOffset: 30.75, moonPrediction: { phase: 90.1, node: 30.75, choice: 'none' } }, phase: 90.25, node: 30.75 },
    { patch: { moonPhaseAngle: 90.25, moonNodeOffset: 30.75, moonPrediction: { phase: '90.25', node: '30.75', choice: 'none' } }, phase: 90.25, node: 30.75 },
    { patch: { moonPhaseAngle: 90.25, moonNodeOffset: 30.75, moonPrediction: { phase: 90.25, node: 30.5, choice: 'none' }, moonEvidenceSaved: true }, phase: 90.25, node: 30.75 },
  ];
  for (const { patch, phase, node } of patches) {
    const lab = await mountMoon(page, 1060, false, patch);
    await expectReadings(lab, phase, node);
    await expectHidden(lab);
    const current = await state(page);
    for (const key of Object.keys(patch)) expect(current[key], `render leaves raw ${key} intact`).toEqual(patch[key]);
    if (patch.moonSouthernView === 'true') await expect(lab.locator('[data-moon-observer-disk]')).toHaveAttribute('data-moon-observer-view', 'north');
    expect(current.journalEntries).toHaveLength(1);
    await noErrors(page);
  }
});

test('same-frame native prediction handlers preserve the first commitment and reveal one ungraded comparison', async ({ page }) => {
  const lab = await mountMoon(page, 1060, true, { moonPhaseAngle: 0, moonNodeOffset: 0 });
  await lab.evaluate((section) => {
    const handler = (selector: string) => {
      const element = section.querySelector(selector)! as any;
      const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
      if (!key || typeof element[key].memoizedProps.onClick !== 'function') throw new Error('Native prediction handler missing');
      return element[key].memoizedProps.onClick;
    };
    // Capture both callbacks before either update: disabled DOM alone cannot
    // prevent a second already-queued callback from replacing the hypothesis.
    const first = handler('[data-moon-prediction="lunar"]'), second = handler('[data-moon-prediction="solar"]');
    first({}); second({}); first({});
  });
  expect((await state(page)).moonPrediction).toEqual({ phase: 0, node: 0, choice: 'lunar' });
  await expect(lab.locator('[data-moon-prediction]:disabled')).toHaveCount(3);
  await expect(lab.locator('[data-moon-prediction="lunar"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'solar');
  await expect(lab.locator('[data-inquiry-stage] [role="status"]')).toContainText('Evidence differs from your hypothesis.');
  await expect(lab.locator('[data-inquiry-stage] [role="status"]')).toContainText('Prediction accuracy is not scored.');
  expect(await page.evaluate(() => ((window as any).__moonXP || []).length)).toBe(0);
  await noErrors(page);
});

test('captured native saves append once per trial and returning to an earlier geometry permits new evidence', async ({ page }) => {
  const lab = await mountMoon(page);
  async function saveTwice() {
    await expect(saveButton(lab)).toBeEnabled();
    await saveButton(lab).evaluate((element: any) => {
      const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
      if (!key || typeof element[key].memoizedProps.onClick !== 'function') throw new Error('Native save handler missing');
      const save = element[key].memoizedProps.onClick;
      save({}); save({});
    });
    await expect(saveButton(lab)).toBeDisabled();
  }
  await lab.locator('[data-moon-prediction="none"]').click();
  await saveTwice();
  const first = (await state(page)).journalEntries.at(-1);
  expect((await state(page)).journalEntries).toHaveLength(2);
  await lab.locator('[data-moon-phase-preset="90"]').click();
  await expectHidden(lab);
  await lab.locator('[data-moon-phase-preset="45"]').click();
  await expectReadings(lab, 45, 30);
  await expectHidden(lab);
  await lab.locator('[data-moon-prediction="none"]').click();
  await saveTwice();
  const current = await state(page);
  expect(current.journalEntries).toHaveLength(3);
  expect(current.journalEntries[1]).toEqual(first);
  expect(current.journalEntries[2].observation).toEqual(first.observation);
  expect(current.journalEntries[2].prediction).toEqual(first.prediction);
  expect(current.journalEntries[0]).toEqual({ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 });
  expect(await page.evaluate(() => (window as any).__events.toasts.filter((toast: { message: string }) => toast.message.includes('Field journal entry saved for Moon')).length)).toBe(2);
  expect(await page.evaluate(() => ((window as any).__moonXP || []).length)).toBe(0);
  await noErrors(page);
});

test('same-frame native phase and node callbacks merge both axes and invalidate the committed evidence', async ({ page }) => {
  const lab = await mountMoon(page, 1060, true, { moonPrediction: { phase: 45, node: 30, choice: 'none' }, moonEvidenceSaved: true });
  const before = await protectedState(page), journal = (await state(page)).journalEntries;
  await lab.evaluate((section) => {
    const handler = (selector: string) => {
      const element = section.querySelector(selector)! as any;
      const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
      if (!key || typeof element[key].memoizedProps.onChange !== 'function') throw new Error('Native geometry handler missing');
      return element[key].memoizedProps.onChange;
    };
    const phase = handler('#solar-moon-phase-angle'), node = handler('#solar-moon-node-offset');
    phase({ target: { value: '180' } }); node({ target: { value: '0' } });
  });
  await expectReadings(lab, 180, 0);
  await expectHidden(lab);
  expect((await state(page)).moonPrediction).toBeNull();
  expect((await state(page)).moonEvidenceSaved).toBe(false);
  await lab.locator('[data-moon-prediction="lunar"]').click();
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'lunar');
  await expect(saveButton(lab)).toBeEnabled();
  expect((await state(page)).journalEntries).toEqual(journal);
  expect(await protectedState(page)).toEqual(before);
  await noErrors(page);
});

test('Moon trials, journal saving and reopening preserve orbital, signal, comparison and practice state', async ({ page }) => {
  const lab = await mountMoon(page), before = await protectedState(page);
  await lab.locator('[data-moon-phase-preset="180"]').click();
  await lab.locator('[data-moon-node-preset="aligned"]').click();
  await lab.locator('[data-moon-prediction="lunar"]').click();
  await saveButton(lab).click();
  await lab.locator('[data-moon-view="south"]').click();
  await lab.locator('[data-moon-phase-step="next"]').click();
  await lab.getByLabel('Node offset from new-Moon direction', { exact: true }).fill('72');
  await lab.locator('[data-moon-prediction="none"]').click();
  await saveButton(lab).click();
  await lab.getByRole('button', { name: 'Close Moon phases and eclipses lab', exact: true }).click();
  await expect(lab).toHaveCount(0);
  await page.locator('[data-investigation-id="moon"]').first().click();
  await expect(lab).toBeVisible();
  await expectReadings(lab, 225, 72);
  await expect(saveButton(lab)).toBeDisabled();
  expect(await protectedState(page)).toEqual(before);
  const entries = (await state(page)).journalEntries;
  expect(entries).toHaveLength(3);
  expect(entries[0]).toEqual({ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 });
  expect(entries.slice(1).every((entry: any) => entry.investigation.id === 'moon')).toBe(true);
  expect(await page.evaluate(() => ((window as any).__moonXP || []).length)).toBe(0);
  await noErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} observer retains readable controls, visible portrait and keyboard-scrolled scientific geometry`, async ({ page }, testInfo) => {
    const lab = await mountMoon(page, 320, dark);
    await readableLayout(lab, 320);
    await readableText(lab);
    const portrait = lab.locator('[data-moon-observer]');
    await portrait.scrollIntoViewIfNeeded();
    const portraitBounds = await portrait.boundingBox();
    expect(portraitBounds).not.toBeNull();
    expect(portraitBounds!.x).toBeGreaterThanOrEqual(0);
    expect(portraitBounds!.x + portraitBounds!.width).toBeLessThanOrEqual(321);
    expect(portraitBounds!.y).toBeGreaterThanOrEqual(0);
    expect(portraitBounds!.y + portraitBounds!.height).toBeLessThanOrEqual(1601);
    expect((await portrait.locator('svg').boundingBox())!.width).toBeGreaterThanOrEqual(150);
    await expect(lab.locator('svg[role="img"]')).toHaveCount(1);
    const stage = lab.getByRole('region', { name: /Scrollable Moon geometry diagram/ });
    await expect(stage).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Tab');
    await stage.focus();
    await expect(stage).toBeFocused();
    const original = await stage.evaluate((region) => ({ x: region.scrollLeft, width: region.clientWidth, total: region.scrollWidth,
      svg: region.querySelector('svg')!.getBoundingClientRect().width, outline: Number.parseFloat(getComputedStyle(region).outlineWidth),
      fonts: [...region.querySelectorAll('svg text')].map((text) => Number.parseFloat(getComputedStyle(text).fontSize)) }));
    expect(original.total).toBeGreaterThan(original.width);
    expect(original.svg).toBeGreaterThanOrEqual(719.5);
    expect(original.outline).toBeGreaterThanOrEqual(2);
    expect(original.fonts.length).toBeGreaterThan(0);
    expect(original.fonts.filter((font) => font < 13)).toEqual([]);
    await stage.press('ArrowRight');
    await expect.poll(() => stage.evaluate((region) => region.scrollLeft)).toBeGreaterThan(original.x);
    const phase = lab.getByLabel('Moon phase angle', { exact: true });
    await phase.focus();
    await expect(phase).toBeFocused();
    expect(await phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
    await phase.press('Home');
    await expectReadings(lab, 0, 30);
    await phase.press('ArrowRight');
    await expectReadings(lab, 1, 30);
    const node = lab.getByLabel('Node offset from new-Moon direction', { exact: true });
    await node.focus();
    await node.press('Home');
    await expectReadings(lab, 1, 0);
    const next = lab.getByRole('button', { name: 'Next phase', exact: true });
    await next.focus();
    await next.press('Enter');
    await expectReadings(lab, 45, 0);
    const prediction = lab.locator('[data-moon-prediction="none"]');
    await prediction.focus();
    await prediction.press('Space');
    await expect(saveButton(lab)).toBeEnabled();
    await readableLayout(lab, 320);
    await readableText(lab);
    await saveButton(lab).focus();
    await saveButton(lab).press('Enter');
    await expect(saveButton(lab)).toBeDisabled();
    await readableLayout(lab, 320);
    await lab.screenshot({ path: testInfo.outputPath(`moon-observer-320-${dark ? 'dark' : 'light'}.png`) });
    await noErrors(page);
  });
}
