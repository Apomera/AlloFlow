import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const worlds = {
  Mercury: { radius: 2440, gravity: 0.38 }, Venus: { radius: 6052, gravity: 0.91 },
  Earth: { radius: 6371, gravity: 1 }, Mars: { radius: 3390, gravity: 0.38 },
  Jupiter: { radius: 69911, gravity: 2.53 }, Saturn: { radius: 58232, gravity: 1.06 },
  Uranus: { radius: 25362, gravity: 0.89 }, Neptune: { radius: 24622, gravity: 1.14 },
  Pluto: { radius: 1188, gravity: 0.06 },
};
type World = keyof typeof worlds;

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountComparison(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  await page.evaluate(({ data, names }) => {
    (window as any).__mount({ solarSystem: data });
    const ctx = (window as any).__ctx;
    ctx.t = (key: string, fallback?: string) => names[key] || fallback || key;
    ctx.isDark = data.isDark;
    ctx.awardXP = (...args: unknown[]) => { ((window as any).__comparisonXP ||= []).push(args); };
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    names: Object.fromEntries(Object.keys(worlds).map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name])),
    data: {
      tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showVisualCompare: true,
      selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true,
      compare1: 'Earth', compare2: 'Jupiter', compareReasoningDrafts: {},
      journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
      orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
      orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
      missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
      keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
      transferDebriefs: { 'earth-mars': { explanation: 'Keep my transfer explanation.' } },
      orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25, isDark: dark, ...patch,
    },
  });
  await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  const bench = page.locator('#solar-visual-comparison');
  if (patch.showVisualCompare !== false) {
    await expect(bench).toBeVisible();
    await expect(bench).toHaveClass(/solar-comparison-workbench/);
    await expect(bench.getByRole('heading', { name: 'How different are two worlds?', exact: true })).toBeVisible();
  }
  return bench;
}

async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
async function protectedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(Object.fromEntries([
      'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
      'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase',
    ].map((key) => [key, data[key]]))));
  });
}
async function noErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
function comparison(page: Page) { return page.locator('[data-solar-planet-comparison]'); }
async function choosePair(bench: Locator, first: World, second: World) {
  // Changing the second world first avoids the currently selected counterpart's disabled option.
  await bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true }).selectOption('');
  await bench.getByRole('combobox', { name: 'First world for visual comparison', exact: true }).selectOption(first);
  await bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true }).selectOption(second);
}
async function expectMeasurements(region: Locator, pair: [World, World]) {
  await expect(region).toHaveAccessibleName(`Scientific comparison of ${pair[0]} and ${pair[1]}`);
  await expect(region).toHaveClass(/solar-compare-inspection/);
  const sample = await region.evaluate((section) => ({
    stageRole: section.querySelector('.solar-compare-stage')?.getAttribute('role'),
    same: section.getAttribute('data-same-world'),
    portraits: [...section.querySelectorAll<HTMLElement>('[data-comparison-world]')].map((world) => {
      const circle = world.querySelector<HTMLElement>('.solar-compare-circle')!;
      const box = circle.getBoundingClientRect();
      return { key: world.dataset.comparisonWorld, diameter: Number(world.getAttribute('data-diameter-km')),
        raw: Number(world.getAttribute('data-raw-diameter')), drawn: Number(world.getAttribute('data-drawn-diameter')),
        exaggerated: world.getAttribute('data-exaggerated'), width: box.width, height: box.height,
        styleWidth: Number.parseFloat(circle.style.width), styleHeight: Number.parseFloat(circle.style.height) };
    }),
    ratios: [...section.querySelectorAll<HTMLElement>('#solar-compare-ratios [data-comparison-ratio]')].map((node) => {
      const value = node.matches('dd') ? node : node.querySelector('dd');
      return { key: node.dataset.comparisonRatio, value: Number(node.getAttribute('data-value')),
        list: Boolean(value?.closest('dl')), term: value?.previousElementSibling?.tagName,
        label: value?.previousElementSibling?.textContent?.trim() };
    }),
    bars: [...section.querySelectorAll<HTMLElement>('#solar-compare-measurements [data-compare-bars]')].map((group) => ({
      key: group.dataset.compareBars,
      values: [...group.querySelectorAll<HTMLElement>('[role="meter"]')].map((meter) => ({
        min: Number(meter.getAttribute('aria-valuemin')), max: Number(meter.getAttribute('aria-valuemax')),
        value: Number(meter.getAttribute('aria-valuenow')), name: meter.getAttribute('aria-label'),
        text: meter.getAttribute('aria-valuetext'),
        fraction: meter.firstElementChild!.getBoundingClientRect().width / meter.getBoundingClientRect().width,
      })),
    })),
  }));
  const radiusMax = Math.max(...pair.map((name) => worlds[name].radius));
  expect(sample.stageRole).toBe('img');
  expect(sample.same).toBe(String(pair[0] === pair[1]));
  expect(sample.portraits.map((portrait) => portrait.key)).toEqual(pair);
  expect(sample.portraits.filter((portrait, index) => {
    const radius = worlds[pair[index]].radius, raw = 128 * radius / radiusMax, drawn = Math.max(3, raw);
    return ![portrait.diameter, portrait.raw, portrait.drawn, portrait.width, portrait.height, portrait.styleWidth, portrait.styleHeight].every(Number.isFinite) ||
      portrait.diameter !== 2 * radius || Math.abs(portrait.raw - raw) > 1e-9 || Math.abs(portrait.drawn - drawn) > 1e-9 ||
      portrait.exaggerated !== String(raw < 3) || Math.abs(portrait.width - drawn) > 0.04 ||
      Math.abs(portrait.height - drawn) > 0.04 || Math.abs(portrait.styleWidth - drawn) > 1e-9 ||
      Math.abs(portrait.styleHeight - drawn) > 1e-9;
  }), 'portrait diameters follow the measured linear scale, with only the disclosed visibility floor').toEqual([]);
  const expectedRatios = {
    diameter: radiusMax / Math.min(...pair.map((name) => worlds[name].radius)),
    gravity: Math.max(...pair.map((name) => worlds[name].gravity)) / Math.min(...pair.map((name) => worlds[name].gravity)),
  };
  expect(sample.ratios.map((ratio) => ratio.key).sort()).toEqual(['diameter', 'gravity']);
  expect(sample.ratios.filter((ratio) => !ratio.list || ratio.term !== 'DT' || !ratio.label ||
    !Number.isFinite(ratio.value) || Math.abs(ratio.value - expectedRatios[ratio.key as keyof typeof expectedRatios]) > 1e-9)).toEqual([]);
  expect(sample.bars.map((bar) => bar.key).sort()).toEqual(['diameter', 'gravity']);
  const barFailures = sample.bars.flatMap((bar) => {
    const values = pair.map((name) => bar.key === 'diameter' ? 2 * worlds[name].radius : worlds[name].gravity);
    const ceiling = Math.max(...values);
    if (bar.values.length !== 2) return [{ key: bar.key, reason: 'requires one meter per world' }];
    return bar.values.flatMap((meter, index) => meter.min !== 0 || meter.max !== ceiling || meter.value !== values[index] ||
      !meter.name?.startsWith(pair[index]) || !meter.text || !Number.isFinite(meter.fraction) ||
      Math.abs(meter.fraction - values[index] / ceiling) > 0.002 ? [{ key: bar.key, index, meter }] : []);
  });
  expect(barFailures, 'each measurement has its own shared zero baseline and proportional rendered bars').toEqual([]);
  return sample;
}

async function exactTable(region: Locator, pair: [World, World]) {
  const table = region.getByRole('table', { name: `Measured properties for ${pair[0]} and ${pair[1]}`, exact: true });
  await expect(table).toBeVisible();
  await expect(table.locator('caption')).toHaveText('Planet comparison using diameter, temperature, rotation, orbit period, moons, surface gravity, and weight force.');
  await expect(table.getByRole('columnheader')).toHaveText(['Measure', ...pair]);
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(3);
  await expect(table.locator('tbody tr')).toHaveCount(7);
  await expect(table.locator('tbody th[scope="row"]')).toHaveText([
    'Temperature', 'Day', 'Year', 'Diameter', 'Moons', 'Surface gravity', '70 kg mass: weight force',
  ]);
  await expect(table.getByRole('row', { name: /^Diameter / }).getByRole('cell')).toHaveText(
    pair.map((name) => `${(2 * worlds[name].radius).toLocaleString('en-US')} km`));
  const forces = pair.map((name) => `${Math.round(70 * worlds[name].gravity * 9.80665).toLocaleString('en-US')} N`);
  await expect(table.getByRole('row', { name: /70 kg mass: weight force/ }).getByRole('cell')).toHaveText(forces);
  return table;
}

async function readableLayout(bench: Locator, width: number) {
  const layout = await bench.evaluate((section) => {
    const bounds = section.getBoundingClientRect();
    const controls = [...section.querySelectorAll<HTMLElement>('button,select,textarea,a')].map((control) => {
      const box = control.getBoundingClientRect(), style = getComputedStyle(control);
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: box.width, height: box.height, left: box.left, right: box.right, font: Number.parseFloat(style.fontSize) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: bounds.left, right: bounds.right, pageWidth: document.documentElement.scrollWidth, controls };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(width + 1);
  expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 13 ||
    control.left < -1 || control.right > width + 1), 'bench controls and reference link have readable 44px targets').toEqual([]);
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
        !element.closest('.sr-only,[aria-hidden="true"],button:disabled,select:disabled') &&
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
  expect(failures, 'rendered labels, measurements, exact values and explanations retain readable themed contrast').toEqual([]);
}

test('diameter portraits and meters use scientific proportions, including the disclosed Pluto visibility floor', async ({ page }) => {
  const bench = await mountComparison(page);
  await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  await expect(comparison(page).getByRole('img')).toHaveAccessibleName(/10\.97 times wider/);
  await exactTable(comparison(page), ['Earth', 'Jupiter']);
  await choosePair(bench, 'Pluto', 'Jupiter');
  const result = await expectMeasurements(comparison(page), ['Pluto', 'Jupiter']);
  expect(result.portraits[0].raw).toBeLessThan(3);
  expect(result.portraits[0].drawn).toBe(3);
  await expect(comparison(page)).toContainText(/visibility floor/i);
  await noErrors(page);
});

test('equal gravity and a restored same-world pair report equality without claiming a stronger world or permitting a save', async ({ page }) => {
  const bench = await mountComparison(page, 1060, false, { compare1: 'Mercury', compare2: 'Mars' });
  await expectMeasurements(comparison(page), ['Mercury', 'Mars']);
  await expect(comparison(page)).toContainText(/same listed gravity/i);
  expect(worlds.Mercury.radius).not.toBe(worlds.Mars.radius);
  await mountComparison(page, 1060, false, { compare1: 'Earth', compare2: 'earth' });
  await expectMeasurements(comparison(page), ['Earth', 'Earth']);
  await expect(bench).toContainText(/same world|same measurements|equal|two different worlds/i);
  await expect(bench.locator('[data-solarsystem-compare-save]')).toBeDisabled();
  expect((await state(page)).journalEntries).toHaveLength(1);
  await noErrors(page);
});

test('the smaller Neptune counterexample has stronger gravity and weight force on independently scaled meters', async ({ page }) => {
  const bench = await mountComparison(page);
  await bench.locator('[data-compare-challenge="Uranus-Neptune"]').click();
  await expectMeasurements(comparison(page), ['Uranus', 'Neptune']);
  const table = await exactTable(comparison(page), ['Uranus', 'Neptune']);
  await expect(table.getByRole('row', { name: /Surface gravity/ }).getByRole('cell')).toHaveText(['0.89g', '1.14g']);
  await expect(comparison(page)).toContainText('Mass stays constant');
  expect(worlds.Neptune.radius).toBeLessThan(worlds.Uranus.radius);
  expect(worlds.Neptune.gravity).toBeGreaterThan(worlds.Uranus.gravity);
  await noErrors(page);
});

test('pair-specific explanations survive swapping and switching, while repeated saving records once and a revision remains saveable', async ({ page }) => {
  const bench = await mountComparison(page);
  const retained = await protectedState(page), initialXP = await page.evaluate(() => ((window as any).__comparisonXP || []).length);
  const explanation = 'Jupiter is much wider, but its gravity ratio is smaller than its diameter ratio.';
  const input = bench.getByRole('textbox', { name: 'My explanation (optional)', exact: true });
  await input.fill(explanation);
  await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
  await expect(input).toHaveValue(explanation);
  await expectMeasurements(comparison(page), ['Jupiter', 'Earth']);
  await bench.locator('[data-compare-challenge="Uranus-Neptune"]').click();
  await expect(input).toHaveValue('');
  await input.fill('Neptune is smaller but has stronger listed gravity.');
  await bench.locator('[data-compare-challenge="Earth-Jupiter"]').click();
  await expect(input).toHaveValue(explanation);
  const save = bench.locator('[data-solarsystem-compare-save]');
  await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(save).toBeDisabled();
  await expect.poll(async () => (await state(page)).journalEntries.length).toBe(2);
  expect((await state(page)).journalEntries.at(-1).surprise).toBe(explanation);
  expect((await state(page)).compareReasoningDrafts['Earth:Jupiter']).toBe(explanation);
  expect((await state(page)).compareReasoningDrafts['Neptune:Uranus']).toBe('Neptune is smaller but has stronger listed gravity.');
  await input.fill(`  ${explanation}  `);
  await expect(save).toBeDisabled();
  expect((await state(page)).journalEntries).toHaveLength(2);
  await input.fill(`${explanation} I would compare their masses next.`);
  await expect(save).toBeEnabled();
  await save.click();
  await expect.poll(async () => (await state(page)).journalEntries.length).toBe(3);
  expect((await state(page)).journalEntries.at(-1).surprise).toContain('compare their masses next');
  expect((await state(page)).journalEntries[0]).toEqual({ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 });
  expect(await protectedState(page)).toEqual(retained);
  expect(await page.evaluate(() => ((window as any).__comparisonXP || []).length)).toBe(initialXP);
  await noErrors(page);
});

test('canonical keys and legacy translated names resolve without rewriting raw saves, and invalid worlds swap as empty selections', async ({ page }) => {
  const bench = await mountComparison(page, 1060, true, { compare1: 'earth', compare2: 'stem.solar_sys.jupiter' });
  const first = bench.getByRole('combobox', { name: 'First world for visual comparison', exact: true });
  const second = bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true });
  await expect(first).toHaveValue('Earth');
  await expect(second).toHaveValue('Jupiter');
  await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  expect((await state(page)).compare1).toBe('earth');
  expect((await state(page)).compare2).toBe('stem.solar_sys.jupiter');
  await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
  expect([(await state(page)).compare1, (await state(page)).compare2]).toEqual(['Jupiter', 'Earth']);
  for (const invalidWorld of [{ key: 'Jupiter' }, 'not-a-world']) {
    await mountComparison(page, 1060, true, { compare1: invalidWorld, compare2: 'earth' });
    await expect(first).toHaveValue('');
    await expect(second).toHaveValue('Earth');
    await expect(comparison(page)).toHaveCount(0);
    expect((await state(page)).compare1).toEqual(invalidWorld);
    expect((await state(page)).compare2).toBe('earth');
    await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
    expect([(await state(page)).compare1, (await state(page)).compare2]).toEqual(['Earth', '']);
    await expect(first).toHaveValue('Earth');
    await expect(second).toHaveValue('');
    await noErrors(page);
  }
});

test('malformed saved draft values remain untouched until deliberate writing, and the shared builder remains inspectable in the sidebar', async ({ page }) => {
  for (const drafts of [{ 'Earth:Jupiter': 23, keep: 'Earlier pair draft.' }, ['not a draft map']]) {
    const bench = await mountComparison(page, 1060, false, { compareReasoningDrafts: drafts });
    const input = bench.getByRole('textbox', { name: 'My explanation (optional)', exact: true });
    await expect(input).toHaveValue('');
    expect((await state(page)).compareReasoningDrafts).toEqual(drafts);
    await input.fill('A string explanation should replace only the active pair draft.');
    expect((await state(page)).compareReasoningDrafts['Earth:Jupiter']).toBe('A string explanation should replace only the active pair draft.');
    if (!Array.isArray(drafts)) expect((await state(page)).compareReasoningDrafts.keep).toBe('Earlier pair draft.');
    await noErrors(page);
  }
  await mountComparison(page, 1060, false, { showVisualCompare: false });
  await expect(page.locator('#solar-visual-comparison')).toHaveCount(0);
  await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  await exactTable(comparison(page), ['Earth', 'Jupiter']);
  await noErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} comparison keeps readable controls and a pinned measure alongside locally scrolled exact values`, async ({ page }, testInfo) => {
    const bench = await mountComparison(page, 320, dark);
    await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
    const table = await exactTable(comparison(page), ['Earth', 'Jupiter']);
    await readableLayout(bench, 320);
    await readableText(bench);
    const scroll = comparison(page).getByRole('region', { name: 'Exact world comparison values', exact: true });
    await expect(scroll).toHaveAttribute('tabindex', '0');
    await scroll.focus();
    await expect(scroll).toBeFocused();
    const initial = await scroll.evaluate((element) => ({ width: element.clientWidth, total: element.scrollWidth, x: element.scrollLeft }));
    expect(initial.total).toBeGreaterThan(initial.width);
    await scroll.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initial.x);
    await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const row = table.getByRole('row', { name: /70 kg mass: weight force/ });
    await expect(row.getByRole('rowheader', { name: '70 kg mass: weight force', exact: true })).toBeVisible();
    const geometry = await row.evaluate((element) => {
      const scroll = element.closest('[role="region"]')!, viewport = scroll.getBoundingClientRect();
      const heading = element.querySelector('th')!, value = element.querySelectorAll('td')[1];
      const h = heading.getBoundingClientRect(), v = value.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(value);
      const ink = range.getBoundingClientRect();
      return { viewport: { left: viewport.left, right: viewport.right }, heading: { left: h.left, right: h.right },
        value: { left: v.left, right: v.right }, ink: { left: ink.left, right: ink.right },
        headerBackground: getComputedStyle(heading).backgroundColor, scrollLeft: scroll.scrollLeft };
    });
    expect(geometry.scrollLeft).toBeGreaterThan(0);
    expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
    expect(geometry.heading.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(geometry.value.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(geometry.ink.left).toBeGreaterThanOrEqual(geometry.heading.right - 1);
    expect(geometry.ink.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(geometry.headerBackground).not.toMatch(/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\))$/);
    await readableText(table);
    await readableLayout(bench, 320);
    await bench.screenshot({ path: testInfo.outputPath(`comparison-bench-320-${dark ? 'dark' : 'light'}.png`) });
    await noErrors(page);
  });
}
