import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { prob: number; visits: number; seed: number };
const defaults: Model = { prob: 35, visits: 2, seed: 731 };
const root = '[data-birdlab-detection-study]', current = '[data-detect-condition="current"]', pinned = '[data-detect-condition="pinned"]';
const occupied = new Set([0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 14, 15, 17, 19, 20, 21, 22, 23]);
const symbol = (event: string) => event === '1' ? '●' : event === '0' ? '○' : '–';
const eventName = (event: string) => event === '1' ? 'Detected' : event === '0' ? 'Not detected' : 'Unvisited';
const siteName = (index: number) => 'Site ' + String(index + 1).padStart(2, '0');

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'citizenScience', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, prob: number, visits: number) {
  await page.locator('#birdlab-detect-prob').fill(String(prob)); await page.locator('#birdlab-detect-visits').fill(String(visits));
}
// Enumerate every nonempty detection history. This oracle does not use the
// complement-power expression used by the activity's probability curve.
function enumeratedChance(prob: number, visits: number) {
  const p = prob / 100; let chance = 0;
  for (let mask = 1; mask < (1 << visits); mask++) {
    let mass = 1;
    for (let visit = 0; visit < visits; visit++) mass *= mask & (1 << visit) ? p : 1 - p;
    chance += mass;
  }
  return chance;
}
// BigInt modular arithmetic independently checks the published exercise draw
// sequence, without relying on the runtime's Math.imul/unsigned-bit coercion.
function independentDraw(model: Model) {
  let seed = BigInt(model.seed), total = 0;
  const rows = Array.from({ length: 24 }, (_, index) => {
    const uniforms: number[] = [], history: string[] = [];
    for (let visit = 0; visit < 6; visit++) {
      seed = (seed * 1664525n + 1013904223n) & 0xffffffffn;
      const value = Number(seed) / 4294967296; uniforms.push(value);
      history.push(visit >= model.visits ? '-' : occupied.has(index) && value < model.prob / 100 ? '1' : '0');
    }
    const seen = history.includes('1'); if (seen) total++;
    return { index, uniforms, history, seen };
  });
  return { rows, total, expected: 18 * enumeratedChance(model.prob, model.visits) };
}
function near(actual: number, expected: number) {
  // Native SVGAnimatedLength values use Float32 in Chromium; this bound is
  // much smaller than a visible chart pixel at every tested host width.
  expect(Math.abs(actual - expected)).toBeLessThan(1e-4);
}

async function checkPaint(page: Page, model: Model, selected = 0, truth = false) {
  const expected = independentDraw(model);
  for (const row of expected.rows) for (const uniform of row.uniforms) { expect(uniform).toBeGreaterThanOrEqual(0); expect(uniform).toBeLessThan(1); }
  const actual = await page.locator(current).evaluate(element => {
    const map = element.querySelector('[data-detect-map]')!;
    return {
      sites: [...map.querySelectorAll('[data-detect-site]')].map(node => {
        const disc = node.querySelector('[data-detect-site-disc]') as SVGCircleElement;
        return { index: Number(node.getAttribute('data-detect-site')), observed: node.getAttribute('data-detect-observed'), pattern: node.getAttribute('data-detect-pattern'),
          truth: node.getAttribute('data-detect-site-truth'), center: [disc.cx.baseVal.value, disc.cy.baseVal.value], radius: disc.r.baseVal.value, fill: getComputedStyle(disc).fill };
      }),
      truthMarks: map.querySelectorAll('[data-detect-truth-mark]').length,
      selection: [...map.querySelectorAll('[data-detect-selection]')].map(node => { const circle = node as SVGCircleElement; return [circle.cx.baseVal.value, circle.cy.baseVal.value]; }),
      bars: [...element.querySelectorAll('[data-detect-bar]')].map(node => { const rect = node as SVGRectElement;
        return { name: rect.getAttribute('data-detect-bar'), x: rect.x.baseVal.value, y: rect.y.baseVal.value, width: rect.width.baseVal.value, height: rect.height.baseVal.value }; }),
      histories: [...element.querySelectorAll('[data-detect-history="all"] tbody tr')].map(node => ({ index: Number(node.getAttribute('data-detect-row')),
        cells: [...node.querySelectorAll('td')].map(cell => ({ text: cell.textContent, event: cell.getAttribute('data-detect-event'), label: cell.getAttribute('aria-label') })) })),
      selected: [...element.querySelectorAll('[data-detect-history="selected"] td')].map(node => node.textContent),
      count: Number(element.getAttribute('data-detect-count')), expected: Number(element.getAttribute('data-detect-expected'))
    };
  });
  expect(actual.sites).toHaveLength(24); expect(actual.histories).toHaveLength(24); expect(actual.count).toBe(expected.total); expect(actual.expected).toBeCloseTo(expected.expected, 11);
  for (let index = 0; index < 24; index++) {
    const site = actual.sites[index], history = expected.rows[index].history;
    expect(site.index).toBe(index); expect(site.observed).toBe(String(expected.rows[index].seen)); expect(site.pattern).toBe(history.join(''));
    expect(site.truth).toBe(truth ? occupied.has(index) ? 'present' : 'absent' : 'hidden');
    near(site.center[0], 85 + index % 6 * 110); near(site.center[1], 60 + Math.floor(index / 6) * 85); expect(site.radius).toBe(27);
    expect(site.fill).toBe(expected.rows[index].seen ? 'rgb(114, 213, 188)' : 'rgb(97, 120, 108)');
    expect(actual.histories[index].index).toBe(index); expect(actual.histories[index].cells).toHaveLength(6);
    for (let visit = 0; visit < 6; visit++) {
      const cell = actual.histories[index].cells[visit]; expect(cell.event).toBe(history[visit]); expect(cell.text).toBe(symbol(history[visit]));
      expect(cell.label).toBe(siteName(index) + ', visit ' + (visit + 1) + ': ' + eventName(history[visit]));
    }
  }
  expect(actual.truthMarks).toBe(truth ? 24 : 0); expect(actual.selection).toHaveLength(1);
  near(actual.selection[0][0], 85 + selected % 6 * 110); near(actual.selection[0][1], 60 + Math.floor(selected / 6) * 85);
  expect(actual.selected).toEqual(expected.rows[selected].history.map(symbol));
  const counts = { expected: expected.expected, observed: expected.total };
  for (const bar of actual.bars) {
    near(bar.x, 60); near(bar.width, counts[bar.name as keyof typeof counts] / 24 * 600); near(bar.y, bar.name === 'expected' ? 42 : 113); expect(bar.height).toBe(22);
  }
  expect(actual.bars).toHaveLength(2);
  await expect(page.locator(current + ' [data-detect-reading="observed"]')).toHaveText(expected.total + ' / 24');
  await expect(page.locator(current + ' [data-detect-reading="expected"]')).toHaveText(expected.expected.toFixed(2) + ' / 24');
  const probability = await page.locator('[data-detect-probability-series="current"]').evaluate(element => {
    const path = element.querySelector('path') as SVGPathElement, values = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number), points: number[][] = [];
    for (let index = 0; index < values.length; index += 2) points.push([values[index], values[index + 1]]);
    const selected = element.querySelector('[data-detect-probability-selection]') as SVGCircleElement;
    return { points, length: path.getTotalLength(), onStroke: points.every(point => path.isPointInStroke(new DOMPoint(point[0], point[1]))),
      dots: [...element.querySelectorAll('[data-detect-probability-point]')].map(node => { const circle = node as SVGCircleElement; return [circle.cx.baseVal.value, circle.cy.baseVal.value]; }),
      selected: [selected.cx.baseVal.value, selected.cy.baseVal.value] };
  });
  expect(probability.points).toHaveLength(7); expect(probability.dots).toHaveLength(7); expect(probability.onStroke).toBe(true); expect(probability.length).toBeGreaterThanOrEqual(549.99);
  for (let visits = 0; visits <= 6; visits++) {
    const x = 90 + visits / 6 * 550, y = 255 - enumeratedChance(model.prob, visits) * 200;
    expect(Math.abs(probability.points[visits][0] - x)).toBeLessThan(.00051); expect(Math.abs(probability.points[visits][1] - y)).toBeLessThan(.00051);
    near(probability.dots[visits][0], x); near(probability.dots[visits][1], y);
  }
  near(probability.selected[0], 90 + model.visits / 6 * 550); near(probability.selected[1], 255 - enumeratedChance(model.prob, model.visits) * 200);
  return expected;
}

test('native maps, history symbols, bars and discrete probability vertices match independent events, exact endpoints and controlled monotone changes', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  let prior = new Set<number>();
  for (let visits = 1; visits <= 6; visits++) {
    await settings(page, 35, visits); const result = await checkPaint(page, { ...defaults, visits });
    const seen = new Set(result.rows.filter(row => row.seen).map(row => row.index));
    for (const index of prior) expect(seen.has(index)).toBe(true); prior = seen;
  }
  let oldHistory: string[][] | null = null;
  for (const prob of [0, 5, 60, 95, 100]) {
    await settings(page, prob, 6); const result = await checkPaint(page, { ...defaults, prob, visits: 6 });
    if (oldHistory) for (let site = 0; site < 24; site++) for (let visit = 0; visit < 6; visit++) if (oldHistory[site][visit] === '1') expect(result.rows[site].history[visit]).toBe('1');
    oldHistory = result.rows.map(row => row.history);
    if (prob === 0) { expect(result.total).toBe(0); expect(result.expected).toBe(0); }
    if (prob === 100) { expect(result.total).toBe(18); expect(result.expected).toBe(18); }
  }
  await settings(page, 100, 1); const certain = await checkPaint(page, { ...defaults, prob: 100, visits: 1 }); expect(certain.total).toBe(18);
  await page.locator('#birdlab-detect-site').selectOption('2'); await page.locator('#birdlab-detect-truth').check();
  await checkPaint(page, { ...defaults, prob: 100, visits: 1 }, 2, true);
  await page.locator('[data-detect-answer="absent"]').click(); await expect(page.locator('.birdlab-detect-feedback')).toContainText('does not establish absence');
  await page.locator('[data-detect-answer="unresolved"]').click(); await expect(page.locator('.birdlab-detect-feedback')).toContainText('neither absence nor a numerical probability');
  await expect(page.locator('[data-detect-probability]')).toContainText('joining lines only guide the eye');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('a pin freezes the full draw, settings and presentation through new draws, reset, project browsing, quiz tabs and unrelated host writes', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await settings(page, 50, 3); await page.locator('#birdlab-detect-site').selectOption('7'); await page.locator('#birdlab-detect-truth').check();
  await page.locator('[data-detect-pin]').click(); await page.locator(pinned + ' summary').click();
  const frozenHTML = await page.locator(pinned).innerHTML(), frozenCurve = await page.locator('[data-detect-probability-series="pinned"]').innerHTML();
  await settings(page, 80, 6); await page.locator('#birdlab-detect-site').selectOption('2'); await page.locator('#birdlab-detect-truth').uncheck();
  await checkPaint(page, { ...defaults, prob: 80, visits: 6 }, 2);
  await page.locator('[data-detect-new]').click(); await expect(page.locator(root)).toHaveAttribute('data-detect-seed', '732');
  await expect(page.locator('#birdlab-detect-prob')).toHaveValue('80'); await expect(page.locator('#birdlab-detect-visits')).toHaveValue('6');
  await checkPaint(page, { prob: 80, visits: 6, seed: 732 }, 2);
  expect(independentDraw({ prob: 80, visits: 6, seed: 732 }).rows.map(row => row.history)).not.toEqual(independentDraw({ prob: 80, visits: 6, seed: 731 }).rows.map(row => row.history));
  expect(await page.locator(pinned).innerHTML()).toBe(frozenHTML); expect(await page.locator('[data-detect-probability-series="pinned"]').innerHTML()).toBe(frozenCurve);
  await page.locator('[data-detect-answer="half"]').click(); await page.locator('[data-detect-reset]').click(); await checkPaint(page, defaults);
  await expect(page.locator('#birdlab-detect-site')).toHaveValue('0'); await expect(page.locator('#birdlab-detect-truth')).not.toBeChecked();
  await expect(page.locator('.birdlab-detect-feedback')).toHaveCount(0); expect(await page.locator(pinned).innerHTML()).toBe(frozenHTML);
  await page.getByRole('button', { name: /Merlin Bird ID/ }).first().click(); await expect(page.getByRole('heading', { name: 'Merlin Bird ID', level: 2, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Match quiz: which project fits you/ }).click(); await expect(page.getByText('How much time can you commit per week?', { exact: true })).toBeVisible();
  expect(await page.locator(pinned).innerHTML()).toBe(frozenHTML); await page.getByRole('tab', { name: /Browse all 8 projects/ }).click();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  const currentHTML = await page.locator(current).innerHTML(); await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17));
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await page.locator(current).innerHTML()).toBe(currentHTML); expect(await page.locator(pinned).innerHTML()).toBe(frozenHTML);
  expect(await page.locator('[data-detect-probability-series="pinned"]').innerHTML()).toBe(frozenCurve);
  await page.locator('[data-detect-pin]').click(); await expect(page.locator(pinned)).toHaveAttribute('data-detect-prob', '35');
  await expect(page.locator(pinned)).toHaveAttribute('data-detect-visits', '2'); await expect(page.locator(pinned)).toHaveAttribute('data-detect-seed', '731');
  await expect(page.locator(pinned)).toHaveAttribute('data-detect-selected', '0'); await expect(page.locator(pinned)).toHaveAttribute('data-detect-truth', 'false');
  await page.locator('[data-detect-clear]').click(); await expect(page.locator(pinned)).toHaveCount(0); await expect(page.locator('[data-detect-probability-series="pinned"]')).toHaveCount(0);
  await expect(page.locator('.birdlab-detect-model')).toContainText('using known synthetic truth'); await expect(page.locator('.birdlab-detect-model')).toContainText('fits no occupancy estimator');
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('sliders, site selection, truth, histories and comparisons remain keyboard usable and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-detect-reset]').click();
    const probability = page.locator('#birdlab-detect-prob'); await probability.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(probability).toHaveValue('0');
    await page.keyboard.press('ArrowRight'); await expect(probability).toHaveValue('5'); await expect(probability).toBeFocused();
    await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(probability).toHaveValue('100');
    const visits = page.locator('#birdlab-detect-visits'); await visits.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(visits).toHaveValue('1');
    await page.keyboard.press('ArrowRight'); await expect(visits).toHaveValue('2'); await expect(visits).toBeFocused();
    await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(visits).toHaveValue('6');
    const select = page.locator('#birdlab-detect-site'); await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(select).toHaveValue('1');
    await page.keyboard.press('End'); await expect(select).toHaveValue('23'); await expect(select).toBeFocused();
    const reveal = page.locator('#birdlab-detect-truth'); await reveal.focus(); await page.keyboard.press('Space'); await expect(reveal).toBeChecked(); await expect(reveal).toBeFocused();
    const pin = page.locator('[data-detect-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    await settings(page, 60, 5); await page.locator('#birdlab-detect-site').selectOption('0'); await page.locator('#birdlab-detect-truth').uncheck();
    const summary = page.locator(current + ' summary');
    if (await page.locator(current + ' details').getAttribute('open') !== null) await summary.click();
    await summary.focus(); await page.keyboard.press('Enter'); await expect(summary).toBeFocused();
    await expect(page.locator(current + ' details')).toHaveAttribute('open', '');
    await page.locator('[data-detect-answer="unresolved"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('.birdlab-detect-feedback')).toContainText('Yes.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, current, pinned, '[data-detect-probability]', '.birdlab-detect-controls', '.birdlab-detect-evidence', '.birdlab-detect-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-detect-map="current"] svg', '[data-detect-map="pinned"] svg', '[data-detect-probability] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    const columns = await page.locator('.birdlab-detect-conditions').evaluate(element => [...element.children].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(columns[1].top).toBeGreaterThan(columns[0].top); expect(columns[1].left).toBeCloseTo(columns[0].left, 1); }
    else expect(columns[1].top).toBeCloseTo(columns[0].top, 1);
    const textBounds = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => {
      const text = node as SVGTextElement, box = text.getBBox(); return { text: text.textContent, x: box.x, right: box.x + box.width, width: text.ownerSVGElement!.viewBox.baseVal.width };
    }));
    for (const text of textBounds) { expect(text.x, text.text || '').toBeGreaterThanOrEqual(0); expect(text.right, text.text || '').toBeLessThanOrEqual(text.width); }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-detection-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
