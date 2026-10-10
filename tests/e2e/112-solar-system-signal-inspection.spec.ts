import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const radii = { Mercury: 0.387, Venus: 0.723, Mars: 1.524, Jupiter: 5.203, Saturn: 9.537, Uranus: 19.19, Neptune: 30.07, Pluto: 39.48 };
type Destination = keyof typeof radii;
const secondsPerAU = 499.0047838;
const names = Object.fromEntries(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name]));
const retainedKeys = [
  'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
  'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase',
  'orr_cha', 'orr_chh', 'orr_chc', 'orr_chf', 'orr_chpractice', 'orr_chsolution', 'orr_chlast',
  'compare1', 'compare2', 'compareReasoningDrafts',
];

test.describe.configure({ mode: 'default', timeout: 180_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

function model(target: Destination, angle: number) {
  const distance = Math.sqrt(1 + radii[target] ** 2 - 2 * radii[target] * Math.cos(angle * Math.PI / 180));
  return { distance, oneWay: distance * secondsPerAU, reply: distance * secondsPerAU * 2 };
}
function duration(seconds: number) {
  if (seconds < 120) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
  if (seconds < 7200) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}
async function mountSignal(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
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
    ctx.awardXP = (...args: unknown[]) => { ((window as any).__signalXP ||= []).push(args); };
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    translatedNames: names,
    data: {
      tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showSignalLab: true,
      selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true, isDark: dark,
      signalTarget: 'Mars', signalAngle: 0, signalNotebooks: {}, signalPrediction: null,
      signalEvidenceSaved: false, signalPulseNonce: 0, signalLastPing: null,
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
      ...patch,
    },
  });
  await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  const lab = page.locator('#solar-signal-lab');
  await expect(lab).toBeVisible();
  await expect(lab.getByRole('heading', { name: 'How long until mission control hears back?', exact: true })).toBeVisible();
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
function saveButton(lab: Locator) { return lab.getByRole('button', { name: /Save signal evidence to journal|Signal evidence saved/ }); }
async function angle(lab: Locator, value: number) {
  const name = value === 0 ? 'Near alignment' : value === 90 ? 'Right angle' : value === 180 ? 'Far alignment' : null;
  if (name) await lab.getByRole('button', { name, exact: true }).click();
  else await lab.getByLabel('Earth–target orbital angle', { exact: true }).fill(String(value));
  await expect(lab).toHaveAttribute('data-signal-angle', String(Math.round(value)));
}
async function expectReadings(lab: Locator, target: Destination, degrees: number) {
  const expected = model(target, degrees);
  await expect(lab).toHaveAttribute('data-signal-target', target);
  await expect(lab.locator('[data-signal-one-way]')).toHaveText(duration(expected.oneWay));
  await expect(lab.locator('[data-signal-round-trip]')).toHaveText(duration(expected.reply));
  expect(Number(await lab.locator('[data-signal-distance]').getAttribute('data-value'))).toBeCloseTo(expected.distance, 10);
  expect(Number(await lab.locator('[data-signal-one-way]').getAttribute('data-value'))).toBeCloseTo(expected.oneWay, 8);
  expect(Number(await lab.locator('[data-signal-round-trip]').getAttribute('data-value'))).toBeCloseTo(expected.reply, 8);
  return expected;
}
async function expectNotebookScale(lab: Locator, target: Destination, angles: [number, number]) {
  const notebook = lab.locator('[data-signal-notebook]');
  const chartMax = (radii[target] + 1) * secondsPerAU;
  const samples = await notebook.getByRole('meter').evaluateAll((meters) => meters.map((meter) => ({
    min: Number(meter.getAttribute('aria-valuemin')), max: Number(meter.getAttribute('aria-valuemax')),
    value: Number(meter.getAttribute('aria-valuenow')), name: meter.getAttribute('aria-label'),
    fraction: meter.firstElementChild!.getBoundingClientRect().width / meter.getBoundingClientRect().width,
    pattern: getComputedStyle(meter.firstElementChild!).backgroundImage,
  })));
  expect(samples).toHaveLength(2);
  for (let index = 0; index < 2; index++) {
    const expected = model(target, angles[index]);
    expect(samples[index].min).toBe(0);
    expect(samples[index].max).toBeCloseTo(chartMax, 8);
    expect(samples[index].value).toBeCloseTo(expected.oneWay, 8);
    expect(samples[index].fraction).toBeCloseTo(expected.oneWay / chartMax, 2);
    expect(samples[index].name).toBe(`Observation ${index === 0 ? 'A' : 'B'} one-way delay`);
  }
  expect(samples[1].pattern, 'B uses a visible pattern in addition to its color').not.toBe('none');
}

async function readableLayout(lab: Locator, width: number) {
  const sample = await lab.evaluate((section) => {
    const bounds = section.getBoundingClientRect();
    const controls = [...section.querySelectorAll<HTMLElement>('button,input,textarea,a')].map((control) => {
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
    control.left < -1 || control.right > width + 1), 'all native controls and reference links have readable 44px targets').toEqual([]);
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
      // The journey's visual labels are hidden from accessibility because its
      // parent supplies one complete image name; their visible ink still needs
      // to be readable. Only the decorative pulse track is excluded here.
      return !element.closest('svg,.sr-only,.solar-signal-track,button:disabled,input:disabled,textarea:disabled') &&
        box.width > 0 && box.height > 0 && style.visibility !== 'hidden' &&
        [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
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
  expect(failures, 'visible labels, measurements and explanations retain readable themed contrast').toEqual([]);
}

test('all eight destinations retain law-of-cosines delays and complete world markers at near, right-angle and far geometry', async ({ page }) => {
  const lab = await mountSignal(page);
  await expect(lab.locator('[data-signal-target-option]')).toHaveCount(8);
  for (const target of Object.keys(radii) as Destination[]) {
    await lab.locator(`[data-signal-target-option="${target}"]`).click();
    for (const degrees of [0, 90, 180]) {
      await angle(lab, degrees);
      const expected = await expectReadings(lab, target, degrees);
      const diagram = await lab.locator('.solar-signal-stage svg').evaluate((svg) => {
        const view = (svg as SVGSVGElement).viewBox.baseVal;
        return { view: [view.x, view.y, view.width, view.height], dots: [...svg.querySelectorAll<SVGCircleElement>('[data-signal-world-dot]')].map((dot) => {
          const box = dot.getBBox();
          return { name: dot.getAttribute('data-signal-world-dot'), x: dot.cx.baseVal.value, y: dot.cy.baseVal.value, r: dot.r.baseVal.value,
            bounds: { x: box.x, y: box.y, width: box.width, height: box.height } };
        }), labels: [...svg.querySelectorAll<SVGTextElement>('[data-signal-world-label]')].map((label) => {
          const box = label.getBBox();
          return { name: label.getAttribute('data-signal-world-label'), x: box.x, y: box.y, width: box.width, height: box.height };
        }), circles: [...svg.querySelectorAll<SVGCircleElement>('circle')].map((circle) => ({
          x: circle.cx.baseVal.value, y: circle.cy.baseVal.value, r: circle.r.baseVal.value,
        })), fonts: [...svg.querySelectorAll('text')].map((text) => Number.parseFloat(getComputedStyle(text).fontSize)),
          accessibleName: svg.getAttribute('aria-label') };
      });
      expect(diagram.view).toEqual([0, 0, 660, 500]);
      expect(diagram.dots.map((dot) => dot.name).sort()).toEqual(['Earth', target].sort());
      expect(diagram.dots.filter((dot) => ![dot.x, dot.y, dot.r].every(Number.isFinite) || dot.r <= 0 ||
        dot.x - dot.r < 0 || dot.x + dot.r > 660 || dot.y - dot.r < 0 || dot.y + dot.r > 500)).toEqual([]);
      expect(diagram.circles.filter((circle) => ![circle.x, circle.y, circle.r].every(Number.isFinite) || circle.r <= 0 ||
        circle.x - circle.r < 0 || circle.x + circle.r > 660 || circle.y - circle.r < 0 || circle.y + circle.r > 500),
      'the complete orbit rings and body circles fit inside the scientific frame').toEqual([]);
      expect(diagram.labels.map((label) => label.name).sort()).toEqual(['Earth', target].sort());
      const tolerance = 0.25;
      expect(diagram.labels.filter((label) => ![label.x, label.y, label.width, label.height].every(Number.isFinite) ||
        label.width <= 0 || label.height <= 0 || label.x < -tolerance || label.y < -tolerance ||
        label.x + label.width > 660 + tolerance || label.y + label.height > 500 + tolerance),
      'both world labels fit inside the scientific frame at their rendered font size').toEqual([]);
      const earthLabel = diagram.labels.find((label) => label.name === 'Earth')!;
      expect(diagram.dots.filter((dot) => {
        const box = dot.bounds;
        const overlapX = Math.min(earthLabel.x + earthLabel.width, box.x + box.width) - Math.max(earthLabel.x, box.x);
        const overlapY = Math.min(earthLabel.y + earthLabel.height, box.y + box.height) - Math.max(earthLabel.y, box.y);
        return overlapX > tolerance && overlapY > tolerance;
      }), 'the Earth label does not overlap either world marker').toEqual([]);
      expect(diagram.fonts.length).toBeGreaterThan(0);
      expect(diagram.fonts.filter((font) => font < 13)).toEqual([]);
      expect(diagram.accessibleName).toContain(`Earth and ${target}`);
      expect(diagram.accessibleName).toContain(`${expected.distance.toFixed(3)} AU`);
      expect(diagram.accessibleName).toContain(duration(expected.oneWay));
    }
  }
  await noErrors(page);
});

test('the accessible journey separates equal outbound and return legs on one linear reply-time scale', async ({ page }) => {
  const lab = await mountSignal(page, 1060, false, { signalTarget: 'Jupiter', signalAngle: 90 });
  const expected = await expectReadings(lab, 'Jupiter', 90);
  const journey = lab.locator('#solar-signal-journey');
  await expect(journey).toHaveAttribute('role', 'img');
  await expect(journey).toHaveAccessibleName(/Jupiter/);
  expect(Number(await journey.getAttribute('data-one-way-seconds'))).toBeCloseTo(expected.oneWay, 8);
  expect(Number(await journey.getAttribute('data-reply-seconds'))).toBeCloseTo(expected.reply, 8);
  const legs = await journey.locator('[data-signal-leg]').evaluateAll((nodes) => nodes.map((node) => ({
    leg: node.getAttribute('data-signal-leg'), seconds: Number(node.getAttribute('data-seconds')),
    ratio: node.getBoundingClientRect().width / node.parentElement!.getBoundingClientRect().width,
  })));
  expect(legs.map((leg) => leg.leg)).toEqual(['outbound', 'return']);
  expect(legs.filter((leg) => Math.abs(leg.seconds - expected.oneWay) > 1e-8 || Math.abs(leg.ratio - 0.5) > 0.005)).toEqual([]);
  await expect(lab).toContainText(/immediate|zero processing/i);
  await noErrors(page);
});

test('a sent receipt stays tied to its original target and angle while the live journey changes', async ({ page }) => {
  const lab = await mountSignal(page);
  await lab.getByRole('button', { name: 'Send a light-speed ping', exact: true }).click();
  const receipt = lab.getByText(/^Ping sent[.]/);
  await expect(receipt).toContainText('At 0°');
  await expect(receipt).toContainText(duration(model('Mars', 0).oneWay));
  const sent = (await state(page)).signalLastPing;
  await angle(lab, 180);
  await expectReadings(lab, 'Mars', 180);
  await expect(receipt).toContainText('At 0°');
  await expect(receipt).toContainText(duration(model('Mars', 0).oneWay));
  expect((await state(page)).signalLastPing).toEqual(sent);
  await lab.getByRole('button', { name: 'Send a light-speed ping', exact: true }).click();
  await expect(receipt).toContainText('At 180°');
  await expect(receipt).toContainText(duration(model('Mars', 180).oneWay));
  await lab.locator('[data-signal-target-option="Neptune"]').click();
  await expect(receipt).toHaveCount(0);
  expect((await state(page)).signalLastPing).toBeNull();
  await noErrors(page);
});

test('destination drafts and fixed observations survive visits while recording a third angle replaces only B', async ({ page }) => {
  const lab = await mountSignal(page);
  const notebook = lab.locator('[data-signal-notebook]'), record = notebook.locator('[data-signal-record-observation]');
  await record.focus();
  await page.keyboard.press('Enter');
  await expect(record).toBeDisabled();
  await angle(lab, 180);
  await record.click();
  await expectNotebookScale(lab, 'Mars', [0, 180]);
  await expect(notebook.locator('[data-signal-notebook-status]')).toContainText('16.6 min longer');
  const a = (await state(page)).signalNotebooks.Mars.observations[0];
  await notebook.getByRole('textbox').fill('Mars draft: the longer path produced a longer delay.');
  await lab.locator('[data-signal-target-option="Venus"]').click();
  await expect(notebook.getByRole('textbox')).toHaveValue('');
  await notebook.getByRole('textbox').fill('Venus draft retained separately.');
  await record.click();
  await lab.locator('[data-signal-target-option="Mars"]').click();
  await expect(notebook.getByRole('textbox')).toHaveValue('Mars draft: the longer path produced a longer delay.');
  await expectNotebookScale(lab, 'Mars', [0, 180]);
  await angle(lab, 90);
  await expect(notebook.locator('[data-signal-observation="B"]')).toContainText('180°');
  await expect(record).toHaveText('Update observation B');
  await record.click();
  await expectNotebookScale(lab, 'Mars', [0, 90]);
  expect((await state(page)).signalNotebooks.Mars.observations[0]).toEqual(a);
  expect((await state(page)).signalNotebooks.Mars.observations.map((entry: { angle: number }) => entry.angle)).toEqual([0, 90]);
  expect((await state(page)).signalNotebooks.Venus.explanation).toBe('Venus draft retained separately.');
  await noErrors(page);
});

test('equal restored observations report the same delay and retain equal patterned bars on the shared scale', async ({ page }) => {
  const value = model('Mars', 90);
  const observations = [0, 1].map(() => ({ target: 'Mars', angle: 90, distanceAU: value.distance, oneWaySeconds: value.oneWay }));
  const lab = await mountSignal(page, 1060, true, { signalAngle: 90, signalNotebooks: { Mars: { observations } } });
  await expectNotebookScale(lab, 'Mars', [90, 90]);
  const status = lab.locator('[data-signal-notebook-status]');
  await expect(status).toContainText(/same|equal|unchanged/i);
  await expect(status).not.toContainText(/longer|shorter/i);
  expect((await state(page)).signalNotebooks.Mars.observations).toEqual(observations);
  await noErrors(page);
});

test('invalid destinations, nonscalar angles, notebook maps and receipts render safe fallbacks without rewriting the raw save', async ({ page }) => {
  const patches: Record<string, unknown>[] = [
    { signalTarget: '__proto__', signalAngle: [90], signalNotebooks: ['not a notebook map'], signalLastPing: { target: 'Mars', angle: 0, oneWaySeconds: 9999 }, signalPulseNonce: Infinity },
    { signalTarget: 'constructor', signalAngle: { value: 90 }, signalNotebooks: { Mars: ['not a destination notebook'] }, signalLastPing: { target: 'Mars', angle: '0', oneWaySeconds: model('Mars', 0).oneWay }, signalPulseNonce: [3] },
    { signalTarget: 'toString', signalAngle: true, signalNotebooks: { Mars: { explanation: { draft: 'wrong type' }, observations: [{ target: 'Mars', angle: 0, distanceAU: '0.524', oneWaySeconds: 261 }] } }, signalLastPing: { target: 'Mars', angle: 0, oneWaySeconds: null }, signalPulseNonce: -50 },
    { signalTarget: { key: 'Mars' }, signalAngle: 'Infinity', signalNotebooks: null, signalLastPing: ['invalid receipt'], signalPulseNonce: 2e6 },
  ];
  for (const patch of patches) {
    const lab = await mountSignal(page, 1060, false, patch);
    await expectReadings(lab, 'Mars', 0);
    await expect(lab.locator('[data-signal-notebook]').getByRole('meter')).toHaveCount(0);
    await expect(lab.getByRole('textbox')).toHaveValue('');
    await expect(lab.getByText(/^Ping sent[.]/)).toHaveCount(0);
    const data = await state(page);
    for (const key of Object.keys(patch)) expect(data[key], `render leaves raw ${key} intact`).toEqual(patch[key]);
    await lab.getByRole('button', { name: 'Send a light-speed ping', exact: true }).click();
    const nonce = (await state(page)).signalPulseNonce;
    expect(Number.isFinite(nonce)).toBe(true);
    expect(nonce).toBeGreaterThanOrEqual(0);
    expect(nonce).toBeLessThanOrEqual(1e6);
    await noErrors(page);
  }
  const lab = await mountSignal(page, 1060, false, { signalAngle: '90' });
  await expectReadings(lab, 'Mars', 90);
  expect((await state(page)).signalAngle).toBe('90');
  await noErrors(page);
});

test('accepted observation snapshots derive their distances and delays from geometry while malformed records and inconsistent pings are ignored', async ({ page }) => {
  const raw = { Mars: { explanation: 'Retain this saved explanation.', observations: [
    { target: 'Venus', angle: 0, distanceAU: 0.277, oneWaySeconds: 138 },
    { target: 'Mars', angle: 0, distanceAU: 99, oneWaySeconds: 9999 },
    { target: 'Mars', angle: 90, distanceAU: 98, oneWaySeconds: 9998 },
    { target: 'Mars', angle: -1, distanceAU: 1, oneWaySeconds: 500 },
  ] } };
  const lab = await mountSignal(page, 1060, true, {
    signalNotebooks: raw, signalLastPing: { target: 'Mars', angle: 0, oneWaySeconds: 9999 },
  });
  await expectNotebookScale(lab, 'Mars', [0, 90]);
  await expect(lab.locator('[data-signal-observation="A"]')).toContainText('0.524 AU');
  await expect(lab.locator('[data-signal-observation="A"]')).toContainText('4.4 min');
  await expect(lab.locator('[data-signal-observation="B"]')).toContainText(duration(model('Mars', 90).oneWay));
  await expect(lab.getByRole('textbox')).toHaveValue('Retain this saved explanation.');
  await expect(lab.getByText(/^Ping sent[.]/)).toHaveCount(0);
  expect((await state(page)).signalNotebooks).toEqual(raw);
  await lab.getByRole('button', { name: 'Increases', exact: true }).click();
  await saveButton(lab).click();
  const entry = (await state(page)).journalEntries.at(-1);
  expect(entry.observation).toContain('A: 0°, 0.524 AU, 4.4 min');
  expect(entry.observation).not.toContain('99.000 AU');
  expect(entry.observation).not.toContain('9999');
  await noErrors(page);
});

test('prediction choices and saved flags are validated, and repeated native saving records once while revised evidence remains saveable', async ({ page }) => {
  for (const invalid of ['constructor', 'bogus', ['increase'], { choice: 'increase' }]) {
    const lab = await mountSignal(page, 1060, false, { signalPrediction: invalid, signalEvidenceSaved: 'false' });
    await expect(lab.locator('[data-inquiry-stage]')).toHaveAttribute('data-inquiry-stage', 'predict');
    await expect(saveButton(lab)).toHaveCount(0);
    expect((await state(page)).signalPrediction).toEqual(invalid);
  }
  const lab = await mountSignal(page, 1060, true, { signalPrediction: 'increase', signalEvidenceSaved: 'false' });
  const retained = await protectedState(page);
  await expect(saveButton(lab)).toBeEnabled();
  const explanation = 'The same light speed and a longer path produce a longer wait.';
  await lab.getByRole('textbox').fill(explanation);
  await saveButton(lab).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(saveButton(lab)).toBeDisabled();
  await expect.poll(async () => (await state(page)).journalEntries.length).toBe(2);
  expect((await state(page)).journalEntries.at(-1).surprise).toBe(explanation);
  await lab.getByRole('textbox').fill(`${explanation} I compared two fixed observations.`);
  await expect(saveButton(lab)).toBeEnabled();
  await saveButton(lab).click();
  await expect.poll(async () => (await state(page)).journalEntries.length).toBe(3);
  expect((await state(page)).journalEntries[0]).toEqual({ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 });
  expect(await protectedState(page)).toEqual(retained);
  expect(await page.evaluate(() => ((window as any).__signalXP || []).length)).toBe(0);
  await mountSignal(page, 1060, true, { signalPrediction: 'same', signalEvidenceSaved: true });
  await expect(saveButton(lab)).toBeDisabled();
  await mountSignal(page, 1060, true, { signalPrediction: 'decrease', signalEvidenceSaved: false });
  await expect(saveButton(lab)).toBeEnabled();
  await noErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} inspection preserves readable controls, accessible time legs and locally scrollable geometry`, async ({ page }, testInfo) => {
    const lab = await mountSignal(page, 320, dark);
    await lab.locator('[data-signal-record-observation]').click();
    await angle(lab, 180);
    await lab.locator('[data-signal-record-observation]').click();
    await lab.getByRole('textbox').fill('A shorter path gives a shorter communication delay.');
    await lab.getByRole('button', { name: 'Increases', exact: true }).click();
    await expectNotebookScale(lab, 'Mars', [0, 180]);
    await readableLayout(lab, 320);
    await readableText(lab);
    const stage = lab.getByRole('region', { name: /Scrollable signal-delay geometry diagram/ });
    await expect(stage).toHaveAttribute('tabindex', '0');
    await stage.focus();
    await expect(stage).toBeFocused();
    const original = await stage.evaluate((region) => ({ x: region.scrollLeft, width: region.clientWidth, total: region.scrollWidth,
      svg: region.querySelector('svg')!.getBoundingClientRect().width }));
    expect(original.total).toBeGreaterThan(original.width);
    expect(original.svg).toBeGreaterThanOrEqual(719);
    await stage.press('ArrowRight');
    await expect.poll(() => stage.evaluate((region) => region.scrollLeft)).toBeGreaterThan(original.x);
    const slider = lab.getByLabel('Earth–target orbital angle', { exact: true });
    await slider.focus();
    await slider.press('Home');
    await expectReadings(lab, 'Mars', 0);
    await slider.press('ArrowRight');
    await expectReadings(lab, 'Mars', 1);
    await readableLayout(lab, 320);
    await lab.screenshot({ path: testInfo.outputPath(`signal-inspection-320-${dark ? 'dark' : 'light'}.png`) });
    await noErrors(page);
  });
}
