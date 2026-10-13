import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const names = Object.fromEntries(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name]));
const retainedKeys = ['orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
  'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase', 'orr_cha', 'orr_chh', 'orr_chc',
  'orr_chf', 'orr_chpractice', 'orr_chsolution', 'orr_chlast', 'compare1', 'compare2', 'compareReasoningDrafts',
  'signalTarget', 'signalAngle', 'signalNotebooks', 'signalPrediction', 'signalEvidenceSaved', 'signalLastPing',
  'signalPulseNonce', 'moonPhaseAngle', 'moonNodeOffset', 'moonPrediction', 'moonEvidenceSaved', 'moonSouthernView',
  'gravityPrediction', 'gravityEvidenceSaved', 'quiz'];

test.describe.configure({ mode: 'default', timeout: 180_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountSeasons(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
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
    ctx.awardXP = (...args: unknown[]) => { ((window as any).__seasonsXP ||= []).push(args); };
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    translatedNames: names,
    data: {
      tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showSeasonsLab: true,
      selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true, isDark: dark,
      seasonsWorld: 'Earth', seasonsPhase: 25, seasonsLatitude: 45, seasonsPrediction: null, seasonsEvidenceSaved: false,
      seasonsGuideActive: false, seasonsGuide: {}, seasonsLatitudeExplanation: '', seasonsLatitudeSaved: null,
      journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
      orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
      orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
      missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
      keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
      transferDebriefs: { 'earth-mars': { explanation: 'Keep my transfer explanation.' } },
      orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25, orr_cha: { 0: '11.9' }, orr_chh: { 0: 1 }, orr_chc: { 0: true },
      orr_chf: { 0: { kind: 'correct', text: 'Keep this practice feedback.' } }, orr_chpractice: { 0: true },
      orr_chsolution: { 0: true }, orr_chlast: { 0: { answer: '11.9', correct: true } },
      compare1: 'Earth', compare2: 'Jupiter', compareReasoningDrafts: { 'Earth:Jupiter': 'Keep this comparison.' },
      signalTarget: 'Mars', signalAngle: 90, signalNotebooks: { Mars: { explanation: 'Keep signal reasoning.', observations: [] } },
      signalPrediction: 'increase', signalEvidenceSaved: true, signalLastPing: { target: 'Mars', angle: 90, oneWaySeconds: 500 }, signalPulseNonce: 7,
      moonPhaseAngle: 90.25, moonNodeOffset: 30.75, moonPrediction: { phase: 90.25, node: 30.75, choice: 'none' },
      moonEvidenceSaved: true, moonSouthernView: true, gravityPrediction: 'same', gravityEvidenceSaved: true,
      quiz: { q: 'Which planet is our home?', a: 'Earth', opts: ['Mercury', 'Earth', 'Mars', 'Jupiter'],
        answered: true, chosen: 'Earth', correct: true, tip: 'Earth is our home planet.', score: 3, streak: 2, bestStreak: 4 },
      ...patch,
    },
  });
  await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  const lab = page.locator('#solar-seasons-lab');
  await expect(lab).toBeVisible();
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
async function noXP(page: Page) { expect(await page.evaluate(() => ((window as any).__seasonsXP || []).length)).toBe(0); }
function metrics(latitude: number, phase: number, tilt = 23.44) {
  const radians = Math.PI / 180;
  const declination = Math.asin(Math.sin(tilt * radians) * Math.sin(phase * Math.PI / 50));
  const term = -Math.tan(latitude * radians) * Math.tan(declination);
  const halfDay = term <= -1 ? Math.PI : term >= 1 ? 0 : Math.acos(term);
  return { hours: 24 * halfDay / Math.PI, noon: 90 - Math.abs(latitude - declination / radians) };
}
function guideRecord(phase: number) {
  const north = metrics(45, phase), south = metrics(-45, phase);
  return { world: 'Earth', phase, northHours: north.hours, southHours: south.hours, northNoon: north.noon, southNoon: south.noon };
}
function restoredGuide(explanation = 'My own reasoning stays here.') {
  return { prediction: 'opposite', records: { 25: guideRecord(25), 75: guideRecord(75) }, claim: 'tilt', explanation, step: 3 };
}
async function nativeCalls(locator: Locator, key: 'onClick' | 'onChange', args: unknown[]) {
  await locator.evaluate((element: any, data) => {
    // React's host Fiber can point at the prior alternate after a commit.
    // The event props cache is the callback source used by live DOM events.
    const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
    if (!props) throw new Error('Current React DOM event props missing');
    const callback = element[props][data.key];
    if (typeof callback !== 'function') throw new Error(`Native ${data.key} handler missing`);
    for (const argument of data.args) callback(argument);
  }, { key, args });
}
async function captureSave(locator: Locator) {
  await expect(locator).toBeEnabled();
  await locator.evaluate((element: any) => {
    const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
    if (!props) throw new Error('Current React DOM event props missing');
    const callback = element[props].onClick;
    if (typeof callback !== 'function') throw new Error('Native save handler missing');
    (window as any).__oldSeasonSave = callback;
  });
}
async function savedTwice(locator: Locator) {
  await expect(locator).toBeEnabled();
  await nativeCalls(locator, 'onClick', [{}, {}]);
  await expect(locator).toBeDisabled();
}
function interpretationSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save interpretation \+ evidence to journal|Evidence saved to journal)/ }); }
function latitudeSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save latitude investigation to journal|Latitude evidence saved)/ }); }
function guidedSave(lab: Locator) { return lab.getByRole('button', { name: /(?:Save guided explanation to journal|Guided explanation saved)/ }); }

async function expectLatitude(lab: Locator, latitude: number, phase: number) {
  const explorer = lab.locator('[data-season-latitude-explorer]');
  for (const hemisphere of ['north', 'south'] as const) {
    const expected = metrics(hemisphere === 'north' ? latitude : -latitude, phase);
    const reading = explorer.locator(`[data-latitude-reading="${hemisphere}"]`);
    expect(Number(await reading.getAttribute('data-daylight-hours'))).toBeCloseTo(expected.hours, 10);
    const noon = reading.locator('[data-latitude-noon-value]');
    expect(Number(await noon.getAttribute('data-value'))).toBeCloseTo(expected.noon, 10);
    await expect(noon).toHaveText(`${expected.noon.toFixed(1)}°`);
    const meter = reading.locator('[data-latitude-daylight-meter]');
    await expect(meter).toHaveAttribute('role', 'meter');
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '24');
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(expected.hours, 10);
    expect(await meter.evaluate((element) => element.firstElementChild!.getBoundingClientRect().width / element.getBoundingClientRect().width)).toBeCloseTo(expected.hours / 24, 2);
    const observer = reading.locator('[data-latitude-noon-observer]');
    await expect(observer).toHaveAttribute('role', 'img');
    expect(await observer.evaluate((element) => element.tagName)).toBe('DIV');
    await expect(observer.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(observer.locator('svg')).toHaveAttribute('focusable', 'false');
    const sun = observer.locator('[data-noon-sun]');
    expect(Number(await sun.getAttribute('data-noon-altitude'))).toBeCloseTo(expected.noon, 10);
    expect(Number(await sun.getAttribute('cx'))).toBeCloseTo(110 + 78 * Math.cos(expected.noon * Math.PI / 180), 10);
    expect(Number(await sun.getAttribute('cy'))).toBeCloseTo(120 - 78 * Math.sin(expected.noon * Math.PI / 180), 10);
    await expect(observer).toHaveAccessibleName(new RegExp(`${expected.noon.toFixed(1).replace('.', '\\.')}.*(?:degrees|degree)`));
  }
  return explorer;
}

async function readableLayout(lab: Locator, width: number) {
  const sample = await lab.evaluate((section) => {
    const bounds = section.getBoundingClientRect();
    const controls = [...section.querySelectorAll<HTMLElement>('button,input,textarea,a')].map((control) => {
      const box = control.getBoundingClientRect(), style = getComputedStyle(control);
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(), width: box.width,
        height: box.height, left: box.left, right: box.right, font: Number.parseFloat(style.fontSize) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: bounds.left, right: bounds.right, document: document.documentElement.scrollWidth, controls };
  });
  expect(sample.left).toBeGreaterThanOrEqual(-1);
  expect(sample.right).toBeLessThanOrEqual(width + 1);
  expect(sample.document).toBeLessThanOrEqual(width + 1);
  expect(sample.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 13 || control.left < -1 || control.right > width + 1), 'native controls and source links retain readable 44px targets').toEqual([]);
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
      return !element.closest('svg,.sr-only,button:disabled,input:disabled') && box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    }).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1], opacity = 1;
      for (const ancestor of chain) { const style = getComputedStyle(ancestor); background = over(parse(style.backgroundColor), background); opacity *= Number(style.opacity); }
      const style = getComputedStyle(element), foreground = parse(style.color); foreground[3] *= opacity;
      const a = luminance(over(foreground, background)), b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter((value) => value.font < 13 || value.ratio < 4.5);
  });
  expect(failures, 'visible readings, explanations and guide controls retain 13px text and 4.5:1 contrast').toEqual([]);
}

test('local noon observers and fixed daylight meters agree at all exact Earth checkpoints', async ({ page }) => {
  const lab = await mountSeasons(page);
  for (const [phase, label] of [[0, 'Northern spring equinox'], [25, 'Northern summer solstice'], [50, 'Northern autumn equinox'], [75, 'Northern winter solstice'], [100, 'Northern spring equinox']] as const) {
    await lab.locator('#solar-season-phase').fill(String(phase));
    await expect(lab).toHaveAttribute('data-season-phase-exact', String(phase));
    await expect(lab.locator('[data-season-phase-label]')).toHaveText(label);
    await expectLatitude(lab, 45, phase);
  }
  await noErrors(page);
});

test('fractional latitude and orbital position retain unrounded readings, chart geometry and immutable raw state', async ({ page }) => {
  const patch = { seasonsPhase: 25.25, seasonsLatitude: 45.25 };
  const lab = await mountSeasons(page, 1060, false, patch), before = await protectedState(page);
  const explorer = await expectLatitude(lab, 45.25, 25.25);
  await expect(lab).toHaveAttribute('data-season-phase-exact', '25.25');
  await expect(lab.locator('[data-season-phase-label]')).not.toHaveText('Northern summer solstice');
  const chart = explorer.getByRole('img', { name: /Fixed scale: 0 to 24 hours/ });
  const selectedX = await chart.locator('[data-season-year-cursor]').getAttribute('x1');
  expect(Number(selectedX)).toBeCloseTo(25.25 * 4.8, 10);
  await expect(explorer.locator('#solar-season-year-phase')).toHaveValue('25.25');
  await expect(lab.locator('#solar-season-phase')).toHaveValue('25.25');
  await expect(explorer.locator('#solar-season-latitude')).toHaveValue('45.25');
  for (const [index, phase] of [0, 25, 50, 75].entries()) {
    const row = explorer.locator('tbody tr').nth(index);
    await expect(row.locator('td').first()).toHaveText(metrics(45.25, phase).hours.toFixed(1));
    await expect(row.locator('td').last()).toHaveText(metrics(-45.25, phase).hours.toFixed(1));
  }
  const current = await state(page);
  expect(current.seasonsPhase).toBe(patch.seasonsPhase);
  expect(current.seasonsLatitude).toBe(patch.seasonsLatitude);
  expect(current.journalEntries).toHaveLength(1);
  expect(await protectedState(page)).toEqual(before);
  await noErrors(page);
});

test('Uranus reports signed noon altitude below the horizon and keeps Earth-hour latitude work scoped to Earth', async ({ page }) => {
  const lab = await mountSeasons(page, 1060, true, { seasonsWorld: 'Uranus' });
  await expect(lab.locator('[data-season-latitude-explorer]')).toHaveCount(0);
  for (const [hemisphere, latitude] of [['north', 45], ['south', -45]] as const) {
    const card = lab.locator(`[data-season-hemisphere="${hemisphere}"]`), expected = metrics(latitude, 25, 97.77);
    const noon = card.locator('[data-season-noon-value]');
    expect(Number(await noon.getAttribute('data-value'))).toBeCloseTo(expected.noon, 10);
    await expect(noon).toContainText(`${expected.noon.toFixed(1)}°`);
    await expect(card).toContainText(`${expected.hours.toFixed(1)} h`);
  }
  await expect(lab.locator('[data-season-hemisphere="south"]')).toContainText(/below.*horizon/i);
  await expect(lab).toContainText('not a temperature or climate forecast');
  await expect(lab.locator('svg[role="img"]')).toHaveAccessibleName(/normalized 24-hour rotation scale, not Earth-hour durations/);
  await lab.getByRole('button', { name: '45° N', exact: true }).click();
  await savedTwice(interpretationSave(lab));
  const uranusEntry = (await state(page)).journalEntries.at(-1);
  expect(uranusEntry.observation).toContain('Uranus, selected orbital position: 25%.');
  expect(uranusEntry.observation).toContain('normalized 24-hour rotation scale, not Earth-hour durations');
  await lab.getByRole('button', { name: /mars/i }).click();
  await expect(lab.locator('[data-season-latitude-explorer]')).toHaveCount(0);
  await expect(lab.locator('svg[role="img"]')).toHaveAccessibleName(/normalized 24-hour rotation scale, not Earth-hour durations/);
  await expect(lab.locator('[data-season-hemisphere="north"]')).toContainText('normalized 24-hour rotation scale, not Earth-hour durations');
  await noXP(page);
  await noErrors(page);
});

test('malformed restores use finite fallback geometry and hide stale interpretations without render-time writes', async ({ page }) => {
  const trials: { patch: Record<string, unknown>; phase: number; latitude: number }[] = [
    { patch: { seasonsWorld: 'constructor', seasonsPhase: [75], seasonsLatitude: true, seasonsPrediction: ['north'], seasonsEvidenceSaved: 'true' }, phase: 25, latitude: 45 },
    { patch: { seasonsWorld: ['Mars'], seasonsPhase: true, seasonsLatitude: { value: 70 }, seasonsPrediction: { world: 'Earth', phase: 25, choice: 'constructor' } }, phase: 25, latitude: 45 },
    { patch: { seasonsPhase: 'Infinity', seasonsLatitude: ' ', seasonsPrediction: { world: 'Earth', phase: '25', choice: 'north' } }, phase: 25, latitude: 45 },
    { patch: { seasonsPhase: -20, seasonsLatitude: 90, seasonsPrediction: { world: 'Earth', phase: -20, choice: 'south' } }, phase: 0, latitude: 80 },
    { patch: { seasonsPhase: 25.25, seasonsLatitude: 45.25, seasonsPrediction: { world: 'Earth', phase: 25, choice: 'north' }, seasonsEvidenceSaved: true }, phase: 25.25, latitude: 45.25 },
  ];
  for (const { patch, phase, latitude } of trials) {
    const lab = await mountSeasons(page, 1060, false, patch);
    await expect(lab).toHaveAttribute('data-season-world', 'Earth');
    await expect(lab).toHaveAttribute('data-season-phase-exact', String(phase));
    await expectLatitude(lab, latitude, phase);
    await expect(interpretationSave(lab)).toHaveCount(0);
    const current = await state(page);
    for (const key of Object.keys(patch)) expect(current[key], `render leaves raw ${key} intact`).toEqual(patch[key]);
    expect(current.journalEntries).toHaveLength(1);
    await noErrors(page);
  }
});

test('valid fractional interpretations restore precisely and string saved flags do not suppress explicit saving', async ({ page }) => {
  const record = { world: 'Earth', phase: 25.25, choice: 'north' };
  const lab = await mountSeasons(page, 1060, true, { seasonsPhase: 25.25, seasonsPrediction: record, seasonsEvidenceSaved: 'false' });
  await expectLatitude(lab, 45, 25.25);
  await expect(lab.locator('[data-solar-season-evidence-check]')).toHaveAttribute('data-inquiry-stage', 'evidence');
  await expect(lab.getByRole('button', { name: '45° N', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(interpretationSave(lab)).toBeEnabled();
  expect((await state(page)).seasonsPrediction).toEqual(record);
  await savedTwice(interpretationSave(lab));
  expect((await state(page)).journalEntries).toHaveLength(2);
  expect((await state(page)).journalEntries.at(-1).observation).toContain('25.25%');
  await noXP(page);
  await noErrors(page);
});

test('physically inconsistent guided observations stay locked until explicit capture repairs the selected record', async ({ page }) => {
  const invalidJune = { ...guideRecord(25), northHours: 1 };
  const guideState = { ...restoredGuide(), records: { 25: invalidJune, 75: guideRecord(75) }, untouched: 'Preserve this guide field.' };
  const lab = await mountSeasons(page, 1060, true, { seasonsGuideActive: true, seasonsGuide: guideState });
  const guide = lab.locator('[data-season-guide]');
  await expect(guide).toHaveAttribute('data-guide-step', '1');
  await expect(guide.locator('[data-guide-observation="25"]')).toHaveCount(0);
  await expect(guide.locator('[data-guide-observation="75"]')).toHaveCount(1);
  await expect(guide.getByRole('button', { name: 'Compare my evidence', exact: true })).toBeDisabled();
  expect((await state(page)).seasonsGuide).toEqual(guideState);
  await guide.getByRole('button', { name: 'Capture current Earth observation', exact: true }).click();
  await expect(guide.locator('[data-guide-observation]')).toHaveCount(2);
  await expect(guide.getByRole('button', { name: 'Compare my evidence', exact: true })).toBeEnabled();
  const current = (await state(page)).seasonsGuide;
  expect(current.records[25]).toMatchObject({ world: 'Earth', phase: 25 });
  for (const key of ['northHours', 'southHours', 'northNoon', 'southNoon'] as const) expect(current.records[25][key]).toBeCloseTo(guideRecord(25)[key], 10);
  expect(current.records[75]).toEqual(guideState.records[75]);
  expect(current.explanation).toBe(guideState.explanation);
  expect(current.untouched).toBe(guideState.untouched);
  await noErrors(page);
  for (const malformedStep of [true, [3]]) {
    const restored = { ...restoredGuide(), step: malformedStep };
    const recoveredLab = await mountSeasons(page, 1060, true, { seasonsGuideActive: true, seasonsGuide: restored });
    const recoveredGuide = recoveredLab.locator('[data-season-guide]');
    await expect(recoveredGuide).toHaveAttribute('data-guide-step', '1');
    await expect(recoveredGuide.locator('[data-guide-observation]')).toHaveCount(2);
    expect((await state(page)).seasonsGuide).toEqual(restored);
    await recoveredGuide.getByRole('button', { name: /Review step 4/ }).click();
    await expect(recoveredGuide).toHaveAttribute('data-guide-step', '3');
    await expect(recoveredGuide.getByLabel('My evidence-based explanation', { exact: true })).toHaveValue(restored.explanation);
    expect((await state(page)).seasonsGuide.records).toEqual(restored.records);
    await noErrors(page);
  }
});

test('same-frame guided predictions preserve the first commitment while interpretation remains editable', async ({ page }) => {
  const lab = await mountSeasons(page, 1060, true, { seasonsGuideActive: true });
  const guide = lab.locator('[data-season-guide]');
  await expect(guide).toHaveAttribute('data-guide-step', '0');
  await expect(lab.locator('.solar-seasons-stage')).toHaveCount(0);
  await expect(lab.locator('[data-season-latitude-explorer]')).toHaveCount(0);
  await guide.evaluate((section) => {
    const handler = (selector: string) => {
      const element = section.querySelector(selector)! as any;
      const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
      if (!props || typeof element[props].onClick !== 'function') throw new Error('Native prediction handler missing');
      return element[props].onClick;
    };
    const first = handler('[data-guide-prediction="together"]'), second = handler('[data-guide-prediction="opposite"]');
    first({}); second({}); first({});
  });
  expect((await state(page)).seasonsGuide.prediction).toBe('together');
  await expect(lab.locator('.solar-seasons-stage')).toBeVisible();
  await lab.getByRole('button', { name: '45° N', exact: true }).click();
  await expect(lab.getByRole('button', { name: '45° N', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await lab.getByRole('button', { name: '45° S', exact: true }).click();
  expect((await state(page)).seasonsPrediction).toEqual({ world: 'Earth', phase: 25, choice: 'south' });
  await expect(lab.getByRole('button', { name: '45° S', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await noXP(page);
  await noErrors(page);
});

test('same-frame world and position updates merge, and captured evidence insertions keep both sentences', async ({ page }) => {
  let lab = await mountSeasons(page), before = await protectedState(page);
  await lab.evaluate((section) => {
    const handler = (element: any, key: string) => {
      const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
      if (!props || typeof element[props][key] !== 'function') throw new Error(`Native ${key} handler missing`);
      return element[props][key];
    };
    const mars = [...section.querySelectorAll('button')].find((button) => button.textContent?.trim().match(/^Mars/))!;
    const world = handler(mars, 'onClick'), phase = handler(section.querySelector('#solar-season-phase'), 'onChange');
    world({}); phase({ target: { value: '75' } });
  });
  await expect(lab).toHaveAttribute('data-season-world', 'Mars');
  await expect(lab).toHaveAttribute('data-season-phase-exact', '75');
  expect(await protectedState(page)).toEqual(before);
  lab = await mountSeasons(page, 1060, true, { seasonsGuideActive: true, seasonsGuide: restoredGuide() });
  before = await protectedState(page);
  const guide = lab.locator('[data-season-guide]');
  await guide.evaluate((section) => {
    const handler = (phase: string) => {
      const element = section.querySelector(`[data-guide-insert-evidence="${phase}"]`)! as any;
      const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
      if (!props || typeof element[props].onClick !== 'function') throw new Error('Native evidence insertion handler missing');
      return element[props].onClick;
    };
    const june = handler('25'), december = handler('75');
    june({}); december({}); june({});
  });
  const writing = guide.getByLabel('My evidence-based explanation', { exact: true });
  await expect(writing).toHaveValue(/My own reasoning stays here\./);
  const draft = await writing.inputValue();
  expect(draft.match(/In June,/g)).toHaveLength(1);
  expect(draft.match(/In December,/g)).toHaveLength(1);
  await expect(guide.locator('[data-guide-insert-evidence]:disabled')).toHaveCount(2);
  expect((await state(page)).seasonsGuide.records).toEqual(restoredGuide().records);
  expect(await protectedState(page)).toEqual(before);
  await noErrors(page);
});

test('all three native save paths append once per frame and leave earlier evidence and unrelated work intact', async ({ page }) => {
  for (const route of ['interpretation', 'latitude', 'guide'] as const) {
    const lab = await mountSeasons(page, 1060, true, route === 'guide' ? { seasonsGuideActive: true, seasonsGuide: restoredGuide() } : {});
    const before = await protectedState(page), earlier = (await state(page)).journalEntries[0];
    if (route === 'interpretation') await lab.getByRole('button', { name: '45° N', exact: true }).click();
    if (route === 'latitude') await lab.getByLabel('Explain the pattern (optional)', { exact: true }).fill('The daylight range grows toward the poles.');
    const save = route === 'interpretation' ? interpretationSave(lab) : route === 'latitude' ? latitudeSave(lab) : guidedSave(lab);
    await savedTwice(save);
    const current = await state(page);
    expect(current.journalEntries).toHaveLength(2);
    expect(current.journalEntries[0]).toEqual(earlier);
    expect(current.journalEntries[1].investigation.id).toBe('seasons');
    expect(await protectedState(page)).toEqual(before);
    await noXP(page);
    await noErrors(page);
  }
});

test('stale native save callbacks cannot publish superseded geometry or drafts, and edited reasoning can be saved anew', async ({ page }) => {
  for (const route of ['interpretation', 'latitude', 'guide'] as const) {
    const lab = await mountSeasons(page, 1060, true, route === 'guide' ? { seasonsGuideActive: true, seasonsGuide: restoredGuide() } : {});
    const before = await protectedState(page);
    if (route === 'interpretation') await lab.getByRole('button', { name: '45° N', exact: true }).click();
    const save = route === 'interpretation' ? interpretationSave(lab) : route === 'latitude' ? latitudeSave(lab) : guidedSave(lab);
    await captureSave(save);
    await page.evaluate(() => (window as any).__rerender());
    await expect.poll(() => save.evaluate((element: any) => {
      const props = Object.keys(element).find((name) => name.startsWith('__reactProps$'));
      if (!props) throw new Error('Current React DOM event props missing');
      return element[props].onClick === (window as any).__oldSeasonSave;
    })).toBe(false);
    await page.evaluate(() => (window as any).__oldSeasonSave({}));
    expect((await state(page)).journalEntries).toHaveLength(1);
    await captureSave(save);
    if (route === 'interpretation') await lab.locator('#solar-season-phase').fill('75');
    else await lab.getByLabel(route === 'latitude' ? 'Explain the pattern (optional)' : 'My evidence-based explanation', { exact: true }).fill('New evidence-based reasoning.');
    await page.evaluate(() => (window as any).__oldSeasonSave({}));
    expect((await state(page)).journalEntries).toHaveLength(1);
    if (route === 'interpretation') await lab.getByRole('button', { name: '45° S', exact: true }).click();
    await savedTwice(save);
    const first = (await state(page)).journalEntries[1];
    if (route === 'interpretation') await lab.getByRole('button', { name: '45° N', exact: true }).click();
    else await lab.getByLabel(route === 'latitude' ? 'Explain the pattern (optional)' : 'My evidence-based explanation', { exact: true }).fill('Revised reasoning that I want to preserve.');
    await savedTwice(save);
    const current = await state(page);
    expect(current.journalEntries).toHaveLength(3);
    expect(current.journalEntries[1]).toEqual(first);
    if (route !== 'interpretation') expect(current.journalEntries[2].surprise).toContain('Revised reasoning that I want to preserve.');
    expect(await protectedState(page)).toEqual(before);
    await noXP(page);
    await noErrors(page);
  }
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} seasons retains readable observers, native keys and locally scrollable scientific diagrams`, async ({ page }, testInfo) => {
    const lab = await mountSeasons(page, 320, dark);
    await readableLayout(lab, 320);
    await readableText(lab);
    const explorer = await expectLatitude(lab, 45, 25);
    for (const observer of await explorer.locator('[data-latitude-noon-observer]').all()) {
      await observer.scrollIntoViewIfNeeded();
      const bounds = await observer.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
      expect((await observer.locator('svg').boundingBox())!.width).toBeGreaterThanOrEqual(150);
    }
    for (const [region, minimumWidth] of [[lab.getByRole('region', { name: /Scrollable seasons geometry diagram/ }), 720]] as const) {
      await region.focus();
      await expect(region).toBeFocused();
      const original = await region.evaluate((element) => ({ x: element.scrollLeft, width: element.clientWidth, total: element.scrollWidth,
        svg: element.querySelector('svg')!.getBoundingClientRect().width, outline: Number.parseFloat(getComputedStyle(element).outlineWidth),
        fonts: [...element.querySelectorAll('svg text')].map((text) => ({ text: text.textContent, font: Number.parseFloat(getComputedStyle(text).fontSize), declaredFont: text.getAttribute('font-size') })) }));
      expect(original.total).toBeGreaterThan(original.width);
      expect(original.svg).toBeGreaterThanOrEqual(minimumWidth - .5);
      expect(original.outline).toBeGreaterThanOrEqual(2);
      expect(original.fonts.filter((reading) => reading.font < 13), 'scientific SVG labels retain 13px text').toEqual([]);
      await region.press('ArrowRight');
      await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(original.x);
    }
    const annualChart = explorer.locator('[data-season-year-chart]');
    const annualBounds = await annualChart.evaluate(element => ({ width: element.clientWidth, total: element.scrollWidth,
      svg: element.querySelector('svg')!.getBoundingClientRect().width }));
    expect(annualBounds.total).toBeLessThanOrEqual(annualBounds.width + 1);
    expect(annualBounds.svg).toBeLessThan(320);
    const annualLabels = await annualChart.locator('.solar-season-year-x span').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent, left: rect.left, right: rect.right, height: rect.height, lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) };
    }));
    for (const [index, label] of annualLabels.entries()) {
      expect(label.height, `${label.text} stays on one line`).toBeLessThanOrEqual(label.lineHeight + 1);
      if (index > 0) expect(label.left, 'Annual axis labels do not overlap').toBeGreaterThanOrEqual(annualLabels[index - 1].right - 1);
    }
    const annualPhase = explorer.locator('#solar-season-year-phase');
    await annualPhase.focus();
    await annualPhase.press('Home');
    await expectLatitude(lab, 45, 0);
    await annualPhase.press('ArrowRight');
    await expectLatitude(lab, 45, 1);
    await expect(lab.locator('#solar-season-phase')).toHaveValue('1');
    const phase = lab.locator('#solar-season-phase');
    await phase.focus();
    await phase.press('Home');
    await expectLatitude(lab, 45, 0);
    await phase.press('ArrowRight');
    await expectLatitude(lab, 45, 1);
    const latitude = explorer.locator('#solar-season-latitude');
    await latitude.focus();
    await latitude.press('Home');
    await expectLatitude(lab, 0, 1);
    await latitude.press('ArrowRight');
    await expectLatitude(lab, 1, 1);
    await readableLayout(lab, 320);
    await readableText(lab);
    await explorer.screenshot({ path: testInfo.outputPath(`seasons-observer-320-${dark ? 'dark' : 'light'}.png`), animations: 'disabled', timeout: 120_000 });
    const guideLab = await mountSeasons(page, 320, dark, { seasonsGuideActive: true });
    await expect(guideLab.locator('.solar-seasons-stage')).toHaveCount(0);
    await readableLayout(guideLab, 320);
    await readableText(guideLab);
    const prediction = guideLab.locator('[data-guide-prediction="opposite"]');
    await prediction.focus();
    await prediction.press('Space');
    await expect(guideLab.locator('[data-season-guide]')).toHaveAttribute('data-guide-step', '1');
    await readableLayout(guideLab, 320);
    await readableText(guideLab);
    await guideLab.locator('[data-season-guide]').screenshot({ path: testInfo.outputPath(`seasons-guide-320-${dark ? 'dark' : 'light'}.png`), animations: 'disabled', timeout: 120_000 });
    await noXP(page);
    await noErrors(page);
  });
}
