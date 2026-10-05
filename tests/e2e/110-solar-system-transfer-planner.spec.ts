import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const au = 1.496e11, mu = 6.674e-11 * 1.989e30, tau = 2 * Math.PI;
const worlds = [
  { id: 'mercury', name: 'Mercury', a: 0.387, period: 0.241 },
  { id: 'venus', name: 'Venus', a: 0.723, period: 0.615 },
  { id: 'earth', name: 'Earth', a: 1, period: 1 },
  { id: 'mars', name: 'Mars', a: 1.524, period: 1.881 },
  { id: 'jupiter', name: 'Jupiter', a: 5.203, period: 11.86 },
  { id: 'saturn', name: 'Saturn', a: 9.537, period: 29.46 },
  { id: 'uranus', name: 'Uranus', a: 19.19, period: 84.01 },
  { id: 'neptune', name: 'Neptune', a: 30.07, period: 164.8 },
];
const readingKeys = ['departure-dv', 'arrival-dv', 'total-dv', 'transit-days', 'transfer-axis', 'phase-angle', 'synodic'];

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountPlanner(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 5,
    orr_trf: 'earth', orr_trt: 'mars', orr_trburn: 'departure',
    orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
    journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
    marsMission: { active: false, startedAt: 100, prediction: 'miss', surfacePrediction: 'Keep my prediction.' },
    transferDebriefs: { 'earth-mars': { explanation: 'Keep my earlier explanation exactly.', question: 'Which angle should I test next?' } },
    keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
    orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25, isDark: dark, ...patch,
  });
  const planner = page.locator('#orrery-transfer-planner');
  await expect(planner).toBeVisible();
  await expect(planner).toHaveAttribute('aria-labelledby', 'orrery-transfer-title');
  await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  return planner;
}

async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
async function protectedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(Object.fromEntries([
      'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
      'journalEntries', 'marsMission', 'transferDebriefs', 'keplerInquiry', 'orr_wsa', 'orr_wse', 'orr_wsphase',
    ].map((key) => [key, data[key]]))));
  });
}
async function noErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }

async function chooseWorld(page: Page, role: 'departure' | 'arrival', name: string) {
  const group = page.getByRole('group', { name: role === 'departure' ? 'Transfer departure planet' : 'Transfer arrival planet', exact: true });
  const button = group.getByRole('button', { name: new RegExp(`(?:^|\\s)${name}$`) });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(group.locator('button[aria-pressed="true"]')).toHaveCount(1);
}
async function showCanvas(canvas: Locator) {
  await canvas.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await expect.poll(() => canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
  })).toBe(true);
}
async function inspectFlight(page: Page, progress: number) {
  const slider = page.locator('#orrery-transfer-progress');
  await slider.fill(String(progress * 100));
  await expect(slider).toHaveValue(String(progress * 100));
  const canvas = page.locator('[data-transfer-flight] canvas');
  await showCanvas(canvas);
  await expect.poll(async () => Number(await canvas.getAttribute('data-transfer-progress'))).toBeCloseTo(progress, 5);
  await expect.poll(() => canvas.evaluate((element: any) => Boolean(element._transferInspection))).toBe(true);
  return canvas;
}

// SI constants and independent Cartesian/bisection calculations give the
// expected values; none of the shipped orbit or transfer helpers are called.
function transferModel(a1: number, a2: number) {
  const axis = (a1 + a2) / 2, same = a1 === a2;
  const circular1 = Math.sqrt(mu / (a1 * au)) / 1000;
  const circular2 = Math.sqrt(mu / (a2 * au)) / 1000;
  const transfer1 = Math.sqrt(mu * (2 / (a1 * au) - 1 / (axis * au))) / 1000;
  const transfer2 = Math.sqrt(mu * (2 / (a2 * au) - 1 / (axis * au))) / 1000;
  const seconds = same ? 0 : Math.PI * Math.sqrt((axis * au) ** 3 / mu);
  const rawPhase = Math.PI - Math.sqrt(mu / (a2 * au) ** 3) * seconds;
  return { axis, circular1, circular2, transfer1, transfer2,
    departure: transfer1 - circular1, arrival: circular2 - transfer2,
    total: Math.abs(transfer1 - circular1) + Math.abs(circular2 - transfer2),
    days: seconds / 86400, phase: same ? 0 : Math.atan2(Math.sin(rawPhase), Math.cos(rawPhase)) * 180 / Math.PI };
}
function positionAt(a1: number, a2: number, phase: number) {
  const axis = (a1 + a2) / 2, e = Math.abs(a2 - a1) / (a1 + a2), outward = a2 > a1;
  const mean = (outward ? 0 : Math.PI) + Math.PI * phase;
  let low = 0, high = tau;
  for (let step = 0; step < 90; step++) {
    const middle = (low + high) / 2;
    if (middle - e * Math.sin(middle) < mean) low = middle; else high = middle;
  }
  const E = mean === 0 || mean === Math.PI || mean === tau ? mean : (low + high) / 2;
  const sign = outward ? 1 : -1;
  return { x: sign * axis * (Math.cos(E) - e), y: sign * axis * Math.sqrt(1 - e * e) * Math.sin(E),
    r: axis * (1 - e * Math.cos(E)), e, axis, E, mean };
}
async function readings(page: Page) {
  const entries = await page.locator('#orrery-transfer-readings').evaluate((section) =>
    [...section.querySelectorAll<HTMLElement>('[data-transfer-metric]')].map((value) => ({
      key: value.dataset.transferMetric!, raw: value.getAttribute('data-value'),
      applicable: value.getAttribute('data-applicable') !== 'false', tag: value.querySelector('dd')?.tagName,
      list: Boolean(value.closest('dl')), term: value.querySelector('dd')?.previousElementSibling?.tagName,
      label: value.querySelector('dt')?.textContent?.trim(),
    })));
  expect(entries.map((entry) => entry.key).sort()).toEqual([...readingKeys].sort());
  expect(entries.filter((entry) => entry.tag !== 'DD' || !entry.list || entry.term !== 'DT' || !entry.label ||
    (entry.applicable ? entry.raw === null || entry.raw.trim() === '' || !Number.isFinite(Number(entry.raw)) : entry.raw !== null)),
  'each transfer measurement has a term and a finite value, or explicit inapplicability').toEqual([]);
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.applicable ? Number(entry.raw) : null]));
}
async function burnReadings(page: Page) {
  const result = await page.locator('#orrery-transfer-burn-inspection').evaluate((section) => ({
    max: Number(section.getAttribute('data-max-speed')),
    entries: [...section.querySelectorAll<HTMLElement>('[data-transfer-burn-metric]')].map((value) => ({
      key: value.dataset.transferBurnMetric!, value: Number(value.getAttribute('data-value')),
      term: value.querySelector('dt')?.textContent?.trim(), tag: value.querySelector('dd')?.tagName, list: Boolean(value.closest('dl')),
    })),
    bars: [...section.querySelectorAll<HTMLElement>('[data-transfer-speed]')].map((bar) => ({
      key: bar.dataset.transferSpeed!, value: Number(bar.getAttribute('data-value')), width: Number.parseFloat(bar.style.width),
    })),
  }));
  expect(result.entries.map((entry) => entry.key).sort()).toEqual(['after', 'before', 'delta-v', 'radius']);
  expect(result.entries.filter((entry) => !Number.isFinite(entry.value) || !entry.term || entry.tag !== 'DD' || !entry.list)).toEqual([]);
  expect(result.max).toBeGreaterThan(0);
  expect(result.bars.map((bar) => bar.key).sort()).toEqual(['after', 'before']);
  expect(result.bars.filter((bar) => !Number.isFinite(bar.value) || !Number.isFinite(bar.width) ||
    Math.abs(bar.width - 100 * bar.value / result.max) > 0.001)).toEqual([]);
  return { max: result.max, values: Object.fromEntries(result.entries.map((entry) => [entry.key, entry.value])), bars: result.bars };
}
async function expectFrame(canvas: Locator) {
  const frame = await canvas.evaluate((element: any) => ({
    model: element._transferInspection,
    clientWidth: element.clientWidth, clientHeight: element.clientHeight,
  }));
  const model = frame.model;
  expect(model.width).toBeCloseTo(frame.clientWidth, 0);
  expect(model.height).toBeCloseTo(frame.clientHeight, 0);
  expect(model.fontSize).toBeGreaterThanOrEqual(13);
  const points = ['ship', 'origin', 'destination'].map((name) => ({ name, ...model[name] }));
  expect(points.filter((point) => ![point.x, point.y, point.screenX, point.screenY].every(Number.isFinite) ||
    point.screenX < 0 || point.screenX > model.width || point.screenY < 0 || point.screenY > model.height ||
    Math.abs(point.screenX - (model.center.x + point.x * model.scale)) > 1e-6 ||
    Math.abs(point.screenY - (model.center.y - point.y * model.scale)) > 1e-6)).toEqual([]);
  expect(model.markerLabels.filter((label: any) => ![label.x, label.y, label.width, label.height].every(Number.isFinite) ||
    label.x < 0 || label.y < 0 || label.x + label.width > model.width + 0.1 || label.y + label.height > model.height + 0.1)).toEqual([]);
  return model;
}

async function readableLayout(planner: Locator, width: number) {
  const layout = await planner.evaluate((section) => {
    const bounds = section.getBoundingClientRect();
    const controls = [...section.querySelectorAll<HTMLElement>('button,input,select,textarea,summary')].map((control) => {
      const box = control.getBoundingClientRect();
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: box.width, height: box.height, left: box.left, right: box.right, font: Number.parseFloat(getComputedStyle(control).fontSize),
        scrolled: Boolean(control.closest('[role="region"][aria-label="Earth transfer values"]')) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: bounds.left, right: bounds.right, pageWidth: document.documentElement.scrollWidth, controls };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(width + 1);
  expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 12 ||
    (!control.scrolled && (control.left < -1 || control.right > width + 1))), 'visible controls are readable and at least 44px').toEqual([]);
}
async function readableText(region: Locator) {
  const failures = await region.evaluate((section) => {
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
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' &&
        !element.closest('.sr-only,.orr-transfer-sr,button:disabled,input:disabled,select:disabled') &&
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
    }).filter((value) => value.font < 12 || value.ratio < 4.5);
  });
  expect(failures, 'planner labels, numbers, explanations and exact values are readable in the rendered theme').toEqual([]);
}

test('outward and inward burn inspection uses signed changes in one Sun reference frame', async ({ page }) => {
  const planner = await mountPlanner(page), retained = await protectedState(page);
  const inspection = page.locator('#orrery-transfer-burn-inspection');
  for (const [from, to] of [[worlds[2], worlds[3]], [worlds[3], worlds[2]]]) {
    if (from.id === 'mars') await planner.getByRole('button', { name: /Swap/ }).click();
    const expected = transferModel(from.a, to.a), values = await readings(page);
    expect(values['departure-dv']).toBeCloseTo(Math.abs(expected.departure), 8);
    expect(values['arrival-dv']).toBeCloseTo(Math.abs(expected.arrival), 8);
    expect(values['total-dv']).toBeCloseTo(expected.total, 8);
    expect(values['transit-days']).toBeCloseTo(expected.days, 8);
    expect(values['transfer-axis']).toBeCloseTo(expected.axis, 10);
    expect(values['phase-angle']).toBeCloseTo(expected.phase, 8);
    expect(values.synodic).toBeCloseTo(1 / Math.abs(1 / from.period - 1 / to.period), 8);
    await planner.getByRole('button', { name: 'Departure burn', exact: true }).click();
    await expect(inspection).toHaveAttribute('data-burn-stage', 'departure');
    await expect(inspection).toHaveAttribute('data-burn-applicable', 'true');
    const departure = await burnReadings(page);
    expect(departure.values.before).toBeCloseTo(expected.circular1, 8);
    expect(departure.values.after).toBeCloseTo(expected.transfer1, 8);
    expect(departure.values['delta-v']).toBeCloseTo(expected.departure, 8);
    expect(departure.values.radius).toBe(from.a);
    await planner.getByRole('button', { name: 'Arrival burn', exact: true }).click();
    await expect(inspection).toHaveAttribute('data-burn-stage', 'arrival');
    const arrival = await burnReadings(page);
    expect(arrival.values.before).toBeCloseTo(expected.transfer2, 8);
    expect(arrival.values.after).toBeCloseTo(expected.circular2, 8);
    expect(arrival.values['delta-v']).toBeCloseTo(expected.arrival, 8);
    expect(arrival.values.radius).toBe(to.a);
    expect(arrival.max).toBe(departure.max);
    expect(arrival.max).toBeGreaterThanOrEqual(Math.max(expected.circular1, expected.circular2, expected.transfer1, expected.transfer2));
  }
  expect(await protectedState(page)).toEqual(retained);
  await noErrors(page);
});

test('Earth budget bars share one scale and a route selection focuses the planner without changing evidence', async ({ page }) => {
  const planner = await mountPlanner(page, 1060, false), retained = await protectedState(page);
  const budget = page.locator('#orrery-transfer-budget');
  const rows = await budget.evaluate((section) => ({
    max: Number(section.getAttribute('data-max-budget')),
    routes: [...section.querySelectorAll<HTMLElement>('[data-transfer-budget-route]')].map((row) => ({
      id: row.dataset.transferBudgetRoute!, total: Number(row.dataset.totalDv),
      bars: [...row.querySelectorAll<HTMLElement>('[data-budget-burn]')].map((bar) => ({
        key: bar.dataset.budgetBurn!, value: Number(bar.getAttribute('data-value')), width: Number.parseFloat(bar.style.width),
      })),
    })),
  }));
  expect(rows.routes.map((row) => row.id).sort()).toEqual(worlds.filter((world) => world.id !== 'earth').map((world) => world.id).sort());
  const invalid = rows.routes.flatMap((row) => {
    const world = worlds.find((candidate) => candidate.id === row.id)!, model = transferModel(1, world.a);
    const issues = !Number.isFinite(row.total) || Math.abs(row.total - model.total) > 1e-8 ? [`${row.id}: total`] : [];
    if (row.bars.map((bar) => bar.key).sort().join() !== 'arrival,departure') issues.push(`${row.id}: missing burns`);
    for (const bar of row.bars) {
      const expected = Math.abs(bar.key === 'departure' ? model.departure : model.arrival);
      if (!Number.isFinite(bar.value) || !Number.isFinite(bar.width) || Math.abs(bar.value - expected) > 1e-8 ||
        Math.abs(bar.width - 100 * expected / rows.max) > 0.001) issues.push(`${row.id}: ${bar.key} scale`);
    }
    return issues;
  });
  expect(rows.max).toBeGreaterThanOrEqual(Math.max(...rows.routes.map((row) => row.total)));
  expect(invalid).toEqual([]);
  const route = budget.getByRole('button', { name: 'View Earth to Neptune transfer', exact: true });
  await route.focus(); await route.press('Enter');
  await expect(route).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#orrery-transfer-title')).toBeFocused();
  expect((await state(page)).orr_trf).toBe('earth');
  expect((await state(page)).orr_trt).toBe('neptune');
  await expect(planner.getByRole('group', { name: 'Transfer arrival planet', exact: true }).locator('button[aria-pressed="true"]')).toContainText('Neptune');
  expect(await protectedState(page)).toEqual(retained);
  await noErrors(page);
});

test('same-planet selection presents no transfer and honest inapplicable alignment and window readings', async ({ page }) => {
  const planner = await mountPlanner(page, 1060, true, { orr_trf: 'earth', orr_trt: 'earth', orr_trburn: 'arrival' });
  const values = await readings(page);
  expect(values['departure-dv']).toBe(0); expect(values['arrival-dv']).toBe(0); expect(values['total-dv']).toBe(0);
  expect(values['transit-days']).toBe(0); expect(values['phase-angle']).toBeNull(); expect(values.synodic).toBeNull();
  await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-stage', 'arrival');
  await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-applicable', 'false');
  await expect(page.locator('#orrery-transfer-progress')).toBeDisabled();
  await expect(planner.getByRole('button', { name: 'Compare launch alignments', exact: true })).toBeDisabled();
  await expect(page.locator('#orrery-transfer-evidence')).toContainText('No transfer path, transit time, or burn is needed');
  await expect(planner).not.toContainText(/NaN|Infinity/);
  await chooseWorld(page, 'arrival', 'Mars');
  await expect(page.locator('#orrery-transfer-progress')).toBeEnabled();
  await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-applicable', 'true');
  await noErrors(page);
});

test('invalid restored worlds and burn stage resolve safely without rewriting saves until a deliberate action', async ({ page }) => {
  const planner = await mountPlanner(page, 1060, false, { orr_trf: 'pluto', orr_trt: 'halley', orr_trburn: 'coast' });
  const retained = await protectedState(page), initial = await state(page);
  expect(initial.orr_trf).toBe('pluto'); expect(initial.orr_trt).toBe('halley'); expect(initial.orr_trburn).toBe('coast');
  await expect(planner.getByRole('group', { name: 'Transfer departure planet', exact: true }).locator('button[aria-pressed="true"]')).toContainText('Earth');
  await expect(planner.getByRole('group', { name: 'Transfer arrival planet', exact: true }).locator('button[aria-pressed="true"]')).toContainText('Mars');
  await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-stage', 'departure');
  const budget = page.locator('#orrery-transfer-budget');
  await expect(budget.getByRole('button', { name: 'View Earth to Mars transfer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await planner.getByRole('button', { name: /Swap/ }).click();
  expect((await state(page)).orr_trf).toBe('mars'); expect((await state(page)).orr_trt).toBe('earth');
  await planner.getByRole('button', { name: 'Arrival burn', exact: true }).click();
  expect((await state(page)).orr_trburn).toBe('arrival');
  await page.locator('#orrery-tab-4').click(); await page.locator('#orrery-tab-5').click();
  await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-stage', 'arrival');
  await expect(planner.getByRole('button', { name: 'Arrival burn', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await protectedState(page)).toEqual(retained);
  await noErrors(page);
});

test('extreme inward and outward routes follow elapsed time and remain finite inside the real canvas frame', async ({ page }) => {
  await mountPlanner(page, 1060, true, { orr_trf: 'mercury', orr_trt: 'neptune' });
  const retained = await protectedState(page);
  for (const route of [
    { from: 0.387, to: 30.07, phases: [0, 0.063, 0.076, 0.5, 1] },
    { from: 30.07, to: 0.387, phases: [0, 0.5, 0.937, 0.938, 1] },
  ]) {
    if (route.from > route.to) await page.getByRole('button', { name: /Swap/ }).click();
    for (const phase of route.phases) {
      const canvas = await inspectFlight(page, phase), actual = await expectFrame(canvas), expected = positionAt(route.from, route.to, phase);
      expect(actual.ship.x).toBeCloseTo(expected.x, 8); expect(actual.ship.y).toBeCloseTo(expected.y, 8);
      expect(actual.ship.r).toBeCloseTo(expected.r, 8); expect(actual.rawRadius).toBeCloseTo(expected.r, 8);
      expect(Math.hypot(actual.ship.x, actual.ship.y)).toBeCloseTo(actual.ship.r, 8);
      expect(actual.ship.y).toBeGreaterThanOrEqual(-1e-8);
      const x = actual.ship.x * (route.to > route.from ? 1 : -1);
      expect(((x + expected.axis * expected.e) / expected.axis) ** 2 +
        (actual.ship.y / (expected.axis * Math.sqrt(1 - expected.e ** 2))) ** 2).toBeCloseTo(1, 8);
    }
  }
  expect(await protectedState(page)).toEqual(retained);
  await noErrors(page);
});

test('burn inspection during playback retains the mounted flight and continuous local progress', async ({ page }) => {
  const planner = await mountPlanner(page, 1060, true, {}, 'no-preference'), retained = await protectedState(page);
  const canvas = page.locator('[data-transfer-flight] canvas'), flight = page.getByRole('region', { name: 'Transfer rendezvous experiment', exact: true });
  await showCanvas(canvas);
  await page.evaluate(() => { (window as any).__plannerFlightCanvas = document.querySelector('[data-transfer-flight] canvas'); });
  await flight.getByRole('button', { name: 'Play flight', exact: true }).click();
  await showCanvas(canvas);
  await expect.poll(async () => Number(await canvas.getAttribute('data-transfer-progress'))).toBeGreaterThan(0.01);
  const before = Number(await canvas.getAttribute('data-transfer-progress'));
  await planner.getByRole('button', { name: 'Arrival burn', exact: true }).click();
  await showCanvas(canvas);
  await expect(canvas).toHaveAttribute('data-transfer-playing', 'true');
  expect(await page.evaluate(() => (window as any).__plannerFlightCanvas === document.querySelector('[data-transfer-flight] canvas'))).toBe(true);
  await expect.poll(async () => Number(await canvas.getAttribute('data-transfer-progress'))).toBeGreaterThan(before + 0.005);
  await planner.getByRole('button', { name: 'Departure burn', exact: true }).click();
  await showCanvas(canvas);
  await expect(canvas).toHaveAttribute('data-transfer-playing', 'true');
  await flight.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await showCanvas(canvas);
  await expect(canvas).toHaveAttribute('data-transfer-playing', 'false');
  const paused = await canvas.getAttribute('data-transfer-progress');
  await page.waitForTimeout(250);
  await expect(canvas).toHaveAttribute('data-transfer-progress', paused!);
  expect(await page.evaluate(() => (window as any).__plannerFlightCanvas === document.querySelector('[data-transfer-flight] canvas'))).toBe(true);
  expect(await protectedState(page)).toEqual(retained);
  await noErrors(page);
});

test('malformed restored debriefs remain safe and untouched until a real arrival capture', async ({ page }) => {
  const malformed: unknown[] = [[], { 'earth-mars': 'broken record' },
    { 'earth-mars': { changed: 5, explanation: { text: 'invalid writing' }, question: [], snapshot: { route: 'earth-mars', days: '258.9' } } },
    { 'earth-mars': { changed: 'destination', explanation: 'Keep this valid explanation.', question: 'Which angle next?',
      snapshot: { route: 'mars-earth', from: 'Mars', to: 'Earth', planet: 'Earth', offset: 30, days: 258.9, referenceGap: 0, testGap: 0.789, timestamp: 100 } } },
  ];
  for (const notes of malformed) {
    await mountPlanner(page, 1060, false, { transferDebriefs: notes });
    const retained = await protectedState(page), flight = page.getByRole('region', { name: 'Transfer rendezvous experiment', exact: true });
    await flight.getByRole('button', { name: 'Compare launch alignments', exact: true }).click();
    const details = flight.locator('[data-transfer-debrief]');
    await details.locator('summary').click();
    await expect(details.locator('[data-transfer-capture]')).toHaveCount(0);
    await expect(details.getByRole('button', { name: 'Capture this arrival', exact: true })).toBeDisabled();
    expect((await state(page)).transferDebriefs).toEqual(notes);
    expect(await protectedState(page)).toEqual(retained);
    await flight.getByRole('button', { name: 'Show transfer arrival', exact: true }).click();
    await details.getByRole('button', { name: 'Capture this arrival', exact: true }).click();
    await expect(details.locator('[data-transfer-capture]')).toContainText('0.789 AU');
    const reason = details.locator('#transfer-explanation-reason'), question = details.locator('#transfer-explanation-question');
    const note = notes && typeof notes === 'object' && !Array.isArray(notes) ? (notes as Record<string, any>)['earth-mars'] : null;
    const validWriting = note && typeof note === 'object' && typeof note.explanation === 'string';
    await expect(reason).toHaveValue(validWriting ? 'Keep this valid explanation.' : '');
    await expect(question).toHaveValue(validWriting ? 'Which angle next?' : '');
    expect((await state(page)).transferDebriefs['earth-mars'].snapshot.route).toBe('earth-mars');
    await expect(details).not.toContainText(/NaN|Infinity|\[object Object\]/);
    const after = await protectedState(page);
    delete after.transferDebriefs; delete retained.transferDebriefs;
    expect(after).toEqual(retained);
    await noErrors(page);
    await harness.destroy(page);
  }
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} planner keeps readable controls, exact values and pinned destination context`, async ({ page }) => {
    const pageErrors: string[] = []; page.on('pageerror', (error) => pageErrors.push(error.message));
    const planner = await mountPlanner(page, 320, dark), retained = await protectedState(page);
    await readableLayout(planner, 320); await readableText(planner);
    await planner.getByRole('button', { name: 'Arrival burn', exact: true }).focus();
    await planner.getByRole('button', { name: 'Arrival burn', exact: true }).press('Enter');
    await expect(page.locator('#orrery-transfer-burn-inspection')).toHaveAttribute('data-burn-stage', 'arrival');
    await readableText(page.locator('#orrery-transfer-burn-inspection'));
    const canvas = await inspectFlight(page, 0.5); await expectFrame(canvas);
    const progress = page.getByRole('slider', { name: 'Flight progress', exact: true });
    await progress.focus(); await progress.press('End'); await expect(progress).toHaveValue('100');
    await expect(page.locator('#orrery-transfer-flight-reading')).toContainText('Rendezvous: positions meet');
    const summary = planner.locator('summary').filter({ hasText: /^Exact transfer values$/ });
    await summary.focus(); await summary.press('Enter');
    const scroll = planner.getByRole('region', { name: 'Earth transfer values', exact: true });
    await expect(scroll).toBeVisible(); await expect(scroll).toHaveAttribute('tabindex', '0');
    const table = scroll.getByRole('table');
    await expect(table.getByRole('columnheader')).toHaveCount(5);
    await expect(table.getByRole('columnheader', { name: 'Transit time (days / yr)', exact: true })).toBeVisible();
    await expect(table.getByRole('columnheader').filter({ hasText: '(km/s)' })).toHaveCount(3);
    await expect(table).toHaveAccessibleName('Δv Budget: Earth → All Planets (Hohmann)');
    await expect(table.locator('caption')).toHaveText('Δv Budget: Earth → All Planets (Hohmann)');
    const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Mars/ }) });
    await scroll.focus(); await expect(scroll).toBeFocused();
    await scroll.evaluate((region) => { region.scrollLeft = region.scrollWidth; });
    const pinned = await row.evaluate((element) => {
      const viewport = element.closest('[role="region"]')!, box = viewport.getBoundingClientRect();
      const first = element.querySelector('th')!, last = element.querySelector('td:last-child')!;
      const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
      return { left: box.left, right: box.right, first: { left: a.left, right: a.right }, last: { left: b.left, right: b.right },
        rowHeader: first.getAttribute('scope'), opaque: getComputedStyle(first).backgroundColor !== 'rgba(0, 0, 0, 0)',
        client: viewport.clientWidth, scroll: viewport.scrollWidth, offset: viewport.scrollLeft };
    });
    expect(pinned.rowHeader).toBe('row'); expect(pinned.opaque).toBe(true);
    expect(pinned.scroll).toBeGreaterThan(pinned.client); expect(pinned.offset).toBeGreaterThan(0);
    expect(pinned.first.left).toBeGreaterThanOrEqual(pinned.left - 1); expect(pinned.first.right).toBeLessThanOrEqual(pinned.right + 1);
    expect(pinned.last.left).toBeGreaterThanOrEqual(pinned.first.right - 1); expect(pinned.last.right).toBeLessThanOrEqual(pinned.right + 1);
    await readableText(scroll); await readableLayout(planner, 320);
    await summary.press('Enter'); await expect(scroll).not.toBeVisible();
    await planner.getByRole('button', { name: 'View Earth to Venus transfer', exact: true }).click();
    await expect(page.locator('#orrery-transfer-title')).toBeFocused();
    await readableText(planner); await readableLayout(planner, 320);
    expect(await protectedState(page)).toEqual(retained);
    expect(pageErrors).toEqual([]); await noErrors(page);
  });
}
