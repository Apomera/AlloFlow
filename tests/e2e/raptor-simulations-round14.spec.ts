import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 240_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Settings = { version: number; matrix: number[][]; weights: number[]; trait: number; topology: number; assignment: number };
const initial: Settings = { version: 1, matrix: [[0, 0, 1, 1], [0, 0, 1, 1], [0, 1, 0, 1], [0, 1, 1, 0], [0, 0, 0, 1], [0, 0, 0, 0]],
  weights: [1, 1, 1, 1, 1, 1], trait: 0, topology: 0, assignment: 0 };
const orders = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]], names = ['A', 'B', 'C', 'D'];
const labels = ['AB | CD', 'AC | BD', 'AD | BC'];
async function mount(page: Page, treeEvidence?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'evolution', treeEvidence, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-tree-study]')).toBeVisible();
}
async function replace(page: Page, settings: Settings) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, treeEvidence: value } })), settings);
  await page.waitForFunction(value => {
    const root = document.querySelector('[data-raptor-tree-study]');
    return root?.querySelector('[data-tree-topology="' + value.topology + '"]')?.getAttribute('aria-pressed') === 'true' &&
      root?.querySelector('[data-tree-trait="' + value.trait + '"]')?.getAttribute('aria-pressed') === 'true' &&
      (root?.querySelector('#rh-tree-weight') as HTMLInputElement)?.value === String(value.weights[value.trait]) &&
      ['A', 'B', 'C', 'D'].every((name, tip) => root?.querySelector('[data-tree-tip-state="current:' + name + '"]')?.textContent === String(value.matrix[value.trait][tip]));
  }, settings, { polling: 30 });
}
async function weight(page: Page, value: number) {
  await page.locator('#rh-tree-weight').evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-tree-weight')).toHaveValue(String(value));
}
// Independent Fitch set intersection/union scoring, unlike production's four
// internal-state assignments. A temporary degree-two root on the central edge
// changes neither the symmetric unit cost nor the unrooted topology score.
function fitch(pattern: number[], topology: number) {
  const order = orders[topology];
  function combine(a: { mask: number; cost: number }, b: { mask: number; cost: number }) {
    const common = a.mask & b.mask;
    return { mask: common || a.mask | b.mask, cost: a.cost + b.cost + (common ? 0 : 1) };
  }
  const leaves = order.map(tip => ({ mask: 1 << pattern[tip], cost: 0 }));
  return combine(combine(leaves[0], leaves[1]), combine(leaves[2], leaves[3])).cost;
}
// Independent conditional-cost dynamic programming retains the optimal states
// at both internal junctions. This is also an oracle for the number of ties.
function alternatives(pattern: number[], topology: number) {
  const order = orders[topology], costAt = (state: number, tips: number[]) => tips.reduce((sum, tip) => sum + Number(pattern[tip] !== state), 0);
  const right = [0, 1].map(u => {
    const choices = [0, 1].map(v => ({ v, cost: costAt(v, order.slice(2)) + Number(u !== v) }));
    const minimum = Math.min(...choices.map(value => value.cost));
    return { cost: minimum, states: choices.filter(value => value.cost === minimum).map(value => value.v) };
  });
  const left = [0, 1].map(u => ({ u, cost: costAt(u, order.slice(0, 2)) + right[u].cost }));
  const minimum = Math.min(...left.map(value => value.cost));
  return left.filter(value => value.cost === minimum).flatMap(value => right[value.u].states.map(v => ({ u: value.u, v })));
}
function totals(settings: Settings) { return orders.map((_, topology) => settings.matrix.reduce((sum, pattern, trait) => sum + settings.weights[trait] * fitch(pattern, topology), 0)); }
async function nativeDrawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-raptor-tree-study]').evaluate((root, key) => {
    const diagram = root.querySelector('[data-tree-diagram="' + key + '"]')!;
    const matrix = root.querySelector('[data-tree-matrix="' + key + '"]')!;
    const text = (selector: string) => diagram.querySelector(selector)!.textContent;
    return { viewBox: diagram.querySelector('svg')!.getAttribute('viewBox'),
      tips: Object.fromEntries(['A', 'B', 'C', 'D'].map(name => { const circle = diagram.querySelector<SVGCircleElement>('[data-tree-tip="' + key + ':' + name + '"]')!;
        return [name, { state: Number(text('[data-tree-tip-state="' + key + ':' + name + '"]')), x: circle.cx.baseVal.value, y: circle.cy.baseVal.value }]; })),
      u: Number(text('[data-tree-internal="' + key + ':U"]')), v: Number(text('[data-tree-internal="' + key + ':V"]')),
      edges: [...diagram.querySelectorAll<SVGLineElement>('[data-tree-edge]')].map(line => ({ name: line.getAttribute('data-tree-edge')!.split(':')[1],
        points: [line.x1.baseVal.value, line.y1.baseVal.value, line.x2.baseVal.value, line.y2.baseVal.value], changed: line.getAttribute('data-changed') === 'true', stroke: getComputedStyle(line).stroke, width: Number(line.getAttribute('stroke-width')) })),
      changeMarks: [...diagram.querySelectorAll('[data-tree-change-mark]')].map(mark => mark.getAttribute('data-tree-change-mark')!.split(':')[1]),
      cells: [...matrix.querySelectorAll<SVGRectElement>('[data-tree-cell]')].map(cell => ({ indices: cell.getAttribute('data-tree-cell')!.split(':').slice(1).map(Number), x: cell.x.baseVal.value,
        y: cell.y.baseVal.value, width: cell.width.baseVal.value, height: cell.height.baseVal.value, state: Number(cell.nextElementSibling!.textContent) })),
      selectedColumn: matrix.querySelector<SVGRectElement>('[data-tree-selected-column]')!.x.baseVal.value,
      bars: [0, 1, 2].map(topology => { const bar = root.querySelector<SVGRectElement>('[data-tree-score-bar="' + key + ':' + topology + '"]')!;
        return { y: bar.y.baseVal.value, height: bar.height.baseVal.value, x: bar.x.baseVal.value, width: bar.width.baseVal.value }; }),
      labels: [...matrix.querySelectorAll('[data-tree-weight-symbol]')].map(label => label.textContent),
      arrows: diagram.querySelectorAll('[marker-end],[marker-start]').length };
  }, key);
}
function errorsInDrawing(drawing: any, settings: Settings) {
  const errors: string[] = [], pattern = settings.matrix[settings.trait], order = orders[settings.topology], minimum = fitch(pattern, settings.topology);
  const alternativesForTree = alternatives(pattern, settings.topology), selected = alternativesForTree[settings.assignment];
  if (drawing.viewBox !== '0 0 640 320' || drawing.arrows) errors.push('unrooted view geometry');
  if (drawing.u !== selected.u || drawing.v !== selected.v) errors.push('minimal internal states');
  if (drawing.edges.length !== 5 || drawing.changeMarks.length !== minimum) errors.push('branch and change counts');
  const tips = [[86, 62], [86, 254], [554, 62], [554, 254]], junctions = [[245, 158], [395, 158]];
  let changes = 0;
  order.forEach((tip, slot) => {
    const actual = drawing.tips[names[tip]], branch = drawing.edges.find((edge: any) => edge.name === names[tip]), junction = junctions[slot < 2 ? 0 : 1];
    const changed = pattern[tip] !== (slot < 2 ? selected.u : selected.v), points = [...tips[slot], ...junction];
    if (actual.state !== pattern[tip] || actual.x !== tips[slot][0] || actual.y !== tips[slot][1]) errors.push('tip ' + tip);
    if (!branch || JSON.stringify(branch.points) !== JSON.stringify(points) || branch.changed !== changed) errors.push('branch ' + tip);
    if (changed) changes++;
  });
  const central = drawing.edges.find((edge: any) => edge.name === 'UV'), centralChanged = selected.u !== selected.v;
  if (!central || JSON.stringify(central.points) !== JSON.stringify([245, 158, 395, 158]) || central.changed !== centralChanged) errors.push('central branch');
  if (centralChanged) changes++;
  if (changes !== minimum) errors.push('native reconstruction cost');
  drawing.edges.forEach((edge: any) => {
    if (edge.stroke !== (edge.changed ? 'rgb(240, 202, 131)' : 'rgb(131, 179, 154)') || edge.width !== (edge.changed ? 6 : 3)) errors.push('native branch styling ' + edge.name);
    if (drawing.changeMarks.includes(edge.name) !== edge.changed) errors.push('native change symbol ' + edge.name);
  });
  if (drawing.cells.length !== 24 || drawing.selectedColumn !== 110 + settings.trait * 78) errors.push('matrix dimensions/selection');
  drawing.cells.forEach((cell: any) => { const [trait, tip] = cell.indices;
    if (cell.state !== settings.matrix[trait][tip] || cell.x !== 122 + trait * 78 || cell.y !== 61 + tip * 41 || cell.width !== 48 || cell.height !== 33) errors.push('native matrix cell ' + trait + ':' + tip); });
  const expectedTotals = totals(settings);
  drawing.bars.forEach((bar: any, topology: number) => {
    const isCurrent = bar.width === 46;
    if (bar.y !== 224 - expectedTotals[topology] * 5 || bar.height !== expectedTotals[topology] * 5 || bar.x !== 108 + topology * 180 + (isCurrent ? 0 : 55) || bar.width !== (isCurrent ? 46 : 27)) errors.push('fixed-axis bar ' + topology);
  });
  if (drawing.labels.some((label: string, trait: number) => label !== '×' + settings.weights[trait])) errors.push('native weight labels');
  return errors;
}

test('every binary character pattern and unrooted quartet agrees with an independent Fitch score, complete tied assignments and native branch/matrix/bar geometry', async ({ page }) => {
  await mount(page);
  const errors: string[] = [];
  for (let mask = 0; mask < 16; mask++) for (let topology = 0; topology < 3; topology++) {
    const pattern = [0, 1, 2, 3].map(tip => mask >> tip & 1), settings: Settings = { version: 1,
      matrix: [pattern, ...Array.from({ length: 5 }, () => [0, 0, 0, 0])], weights: [mask % 4, 0, 0, 0, 0, 0], trait: 0, topology, assignment: 0 };
    await replace(page, settings);
    const options = alternatives(pattern, topology);
    await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment 1 of ' + options.length);
    for (let assignment = 0; assignment < options.length; assignment++) {
      if (assignment) await page.locator('[data-tree-next-assignment]').click();
      await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment ' + (assignment + 1) + ' of ' + options.length);
      const expected = { ...settings, assignment };
      let drawing: any;
      // The shared reduced-motion rule gives every element a 0.01 ms transition
      // duration, including SVG stroke. Await exact rendered colors after the
      // assignment commits; never sample an intermediate transition or sleep.
      await expect.poll(async () => {
        drawing = await nativeDrawing(page);
        return errorsInDrawing(drawing, expected).filter(error => error.startsWith('native branch styling'));
      }, { message: 'Rendered branch colors settle for ' + mask + '/' + topology + '/' + assignment }).toEqual([]);
      errors.push(...errorsInDrawing(drawing, expected).map(error => mask + '/' + topology + '/' + assignment + ': ' + error));
      await expect(page.locator('[data-tree-contribution="0"]')).toHaveText(fitch(pattern, topology) + ' × ' + settings.weights[0] + ' = ' + fitch(pattern, topology) * settings.weights[0]);
    }
    if (options.length > 1) {
      await page.locator('[data-tree-next-assignment]').click(); await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment 1 of ' + options.length);
    } else await expect(page.locator('[data-tree-next-assignment]')).toBeDisabled();
  }
  expect(errors).toEqual([]);
  await replace(page, initial);
  await expect(page.locator('[data-tree-score-value="current:0"]')).toHaveText('7'); await expect(page.locator('[data-tree-score-value="current:1"]')).toHaveText('8');
  await page.getByText('Read the scoring model and raptor research context').click();
  await expect(page.locator('[data-raptor-tree-study]')).toContainText('0↔1 changes have equal cost');
  await expect(page.locator('[data-raptor-tree-study]')).toContainText('no root, arrows, ancestral direction, time scale, or length interpretation');
  await expect(page.locator('[data-raptor-tree-study]')).toContainText('neither study supplies this authored matrix');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('full frozen evidence and selected tied reconstruction remain isolated while edits, weights, ties, bounded persistence and interpretation stay honest', async ({ page }) => {
  await mount(page);
  await page.locator('[data-tree-preset="grouping"]').click(); await page.locator('[data-tree-topology="1"]').click();
  await page.locator('[data-tree-next-assignment]').click(); await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment 2 of 2');
  await page.locator('[data-tree-pin]').click();
  const frozenTree = await page.locator('[data-tree-diagram="pinned"]').innerHTML(), frozenMatrix = await page.locator('[data-tree-matrix="pinned"]').innerHTML();
  const pinned: Settings = { ...initial, matrix: initial.matrix.map(row => row.slice()), weights: [1, 0, 0, 0, 0, 0], topology: 1, assignment: 1 };
  expect(errorsInDrawing(await nativeDrawing(page, 'pinned'), pinned)).toEqual([]);
  await page.locator('[data-tree-toggle-tip="A"]').click(); await weight(page, 3); await page.locator('[data-tree-trait="2"]').click();
  await page.locator('[data-tree-toggle-tip="D"]').click(); await weight(page, 2); await page.locator('[data-tree-topology="2"]').click();
  expect(await page.locator('[data-tree-diagram="pinned"]').innerHTML()).toBe(frozenTree); expect(await page.locator('[data-tree-matrix="pinned"]').innerHTML()).toBe(frozenMatrix);
  expect(errorsInDrawing(await nativeDrawing(page, 'pinned'), pinned)).toEqual([]);
  const changed: Settings = await page.evaluate(() => (window as any).__toolData.raptorHunt.treeEvidence);
  expect(changed.matrix[0]).toEqual([1, 0, 1, 1]); expect(changed.matrix[2]).toEqual([0, 1, 0, 0]); expect(changed.weights).toEqual([3, 0, 2, 0, 0, 0]);
  expect(changed.topology).toBe(2); expect(changed.trait).toBe(2); expect(errorsInDrawing(await nativeDrawing(page), changed)).toEqual([]);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, evolutionTab: 'convergence' } })));
  expect(await page.locator('[data-tree-diagram="pinned"]').innerHTML()).toBe(frozenTree);
  await page.locator('[data-tree-preset="single"]').click(); await expect(page.locator('[data-tree-tie-summary]')).toContainText('All three topologies tie at 1');
  await page.locator('[data-tree-preset="conflict"]').click(); await expect(page.locator('[data-tree-tie-summary]')).toContainText('Lowest-score tie: AB | CD and AC | BD at 3');
  await weight(page, 3); await expect(page.locator('[data-tree-tie-summary]')).toContainText('Lowest score: AB | CD');
  await replace(page, { ...initial, weights: [0, 0, 0, 0, 0, 0] }); await expect(page.locator('[data-tree-tie-summary]')).toContainText('All characters are excluded');
  await expect(page.locator('[data-tree-reconstruction="current"]')).toContainText('1 unit change × weight 0 = 0 score units');
  await page.locator('[data-tree-answer="yes"]').click(); await expect(page.locator('.rh-tree-feedback')).toContainText('not proof');
  await page.locator('[data-tree-answer="limits"]').click(); await expect(page.locator('.rh-tree-feedback')).toContainText('Arbitrary weights do not provide confidence');
  await page.locator('[data-tree-pin]').click(); expect(await page.locator('[data-tree-diagram="pinned"]').innerHTML()).not.toBe(frozenTree);
  await page.locator('[data-tree-clear-pin]').click(); await expect(page.locator('[data-tree-diagram="pinned"]')).toHaveCount(0);
  await page.locator('[data-tree-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-tree-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'evolution' } })));
  await expect(page.locator('[data-tree-diagram="pinned"]')).toHaveCount(0); await expect(page.locator('#rh-tree-weight')).toHaveValue('0');
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, treeEvidence: {
    version: 1, matrix: [[1, '1', -1, 0], null], weights: [Infinity, -5, 99, '2', 1.7, null], trait: 999, topology: -7, assignment: 999 } } })));
  await expect(page.locator('[data-tree-trait="5"]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-tree-topology="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment 1 of 1'); await expect(page.locator('#rh-tree-weight')).toHaveValue('1');
  await page.locator('[data-tree-pin]').click();
  const malformedExpected: Settings = { version: 1, matrix: [[1, 0, 1, 0], ...initial.matrix.slice(1)], weights: [1, 0, 3, 1, 2, 1], trait: 5, topology: 0, assignment: 0 };
  expect(errorsInDrawing(await nativeDrawing(page), malformedExpected)).toEqual([]); expect(errorsInDrawing(await nativeDrawing(page, 'pinned'), malformedExpected)).toEqual([]);
  await page.locator('[data-tree-reset]').click(); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.treeEvidence)).toEqual(initial);
  await page.getByText('Explore the original evolution and taxonomy reference').click(); await expect(page.getByRole('tab', { name: '🔀 Convergent Evolution' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual evidence controls and current/frozen diagrams are keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-tree-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-tree-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-tree-diagram="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('[data-tree-trait="5"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-tree-trait="5"]')).toHaveAttribute('aria-pressed', 'true');
    const state = await page.locator('[data-tree-toggle-tip="A"]').getAttribute('data-state');
    await page.locator('[data-tree-toggle-tip="A"]').focus(); await page.keyboard.press('Space');
    await expect(page.locator('[data-tree-toggle-tip="A"]')).toHaveAttribute('data-state', state === '0' ? '1' : '0'); await expect(page.locator('[data-tree-toggle-tip="A"]')).toBeFocused();
    await page.locator('#rh-tree-weight').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-tree-weight')).toHaveValue('1'); await expect(page.locator('#rh-tree-weight')).toBeFocused();
    await page.locator('[data-tree-topology="2"]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-tree-topology="2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tree-topology="2"]')).toBeFocused();
    await page.locator('[data-tree-preset="grouping"]').click(); await page.locator('[data-tree-topology="1"]').click();
    await page.locator('[data-tree-next-assignment]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-tree-assignment-count]')).toHaveText('Minimal assignment 2 of 2');
    await expect(page.locator('[data-tree-next-assignment]')).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-tree-study]', '[data-tree-diagram="current"]', '[data-tree-matrix="current"]', '[data-tree-scores]', '.rh-tree-controls', '.rh-tree-compare', '.rh-tree-evidence', '[data-tree-diagram="pinned"]', '[data-tree-matrix="pinned"]']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-tree-diagram="current"] svg', '[data-tree-matrix="current"] svg', '[data-tree-scores] svg', '[data-tree-diagram="pinned"] svg', '[data-tree-matrix="pinned"] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-tree-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
