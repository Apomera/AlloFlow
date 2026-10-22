import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Group = { crania: number; left: number; right: number };
type Model = { version: number; groups: Group[]; selected: number };
const kinds = ['crania', 'left', 'right'] as const;
const initial: Model = { version: 1, groups: [{ crania: 1, left: 3, right: 2 }, { crania: 2, left: 1, right: 1 }], selected: 0 };
// Independent finite bin-packing oracle. Each complete element is a token;
// bins represent possible individuals with at most one token of each category.
// Try successively larger bin sets and backtrack over all distinct bin masks.
// This uses neither the production maximum expression nor its row assignment.
function feasible(tokens: number[], bins: number[], index = 0): boolean {
  if (index === tokens.length) return true;
  const token = tokens[index], seen = new Set<number>();
  for (let row = 0; row < bins.length; row++) {
    const mask = bins[row];
    if (seen.has(mask) || (mask & token)) continue;
    seen.add(mask); bins[row] = mask | token;
    if (feasible(tokens, bins, index + 1)) { bins[row] = mask; return true; }
    bins[row] = mask;
  }
  return false;
}
function evidence(group: Group) {
  const tokens = kinds.flatMap((kind, index) => Array(group[kind]).fill(1 << index));
  for (let individuals = 0; individuals <= 8; individuals++) if (feasible(tokens, Array(individuals).fill(0))) return { nisp: tokens.length, mni: individuals };
  throw new Error('Bounded complete-element inventory has no feasible assignment');
}
function totals(groups: Group[]) { return groups.map(evidence).reduce((sum, group) => ({ nisp: sum.nisp + group.nisp, mni: sum.mni + group.mni }), { nisp: 0, mni: 0 }); }
async function mount(page: Page, skeletalStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'pelletkey', skeletalStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-skeletal-study]')).toBeVisible();
}
async function replace(page: Page, model: Model) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, skeletalStudy: value } })), model);
  await expect(page.locator('#rh-skeletal-group')).toHaveValue(String(model.selected));
  for (const kind of kinds) await expect(page.locator('#rh-skeletal-' + kind)).toHaveValue(String(model.groups[model.selected][kind]));
}
async function range(page: Page, kind: string, value: number) {
  await page.locator('#rh-skeletal-' + kind).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-skeletal-' + kind)).toHaveValue(String(value));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-raptor-skeletal-study]').evaluate((root, key) => {
    const inventory = root.querySelector('[data-skeletal-inventory="' + key + '"]')!, packing = root.querySelector('[data-skeletal-packing="' + key + '"]')!;
    function transform(node: SVGGraphicsElement) { const m = node.transform.baseVal.consolidate()?.matrix; return m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [1, 0, 0, 1, 0, 0]; }
    function glyphs(scope: Element, attribute: string) { return Array.from(scope.querySelectorAll<SVGGElement>('[' + attribute + ']')).map(node => {
      const outline = node.querySelector<SVGPathElement>('[data-skeletal-outline]')!, mirror = node.querySelector<SVGGElement>('g')!;
      return { id: node.getAttribute(attribute), matrix: transform(node), mirror: transform(mirror), path: outline.getAttribute('d'), length: outline.getTotalLength(), fill: getComputedStyle(outline).fill, stroke: getComputedStyle(outline).stroke };
    }); }
    return { selected: Number(root.getAttribute('data-skeletal-selected')),
      bars: ['nisp', 'mni'].map(name => { const bar = root.querySelector<SVGRectElement>('[data-skeletal-total-bar="' + key + ':' + name + '"]')!; return { name,
        x: bar.x.baseVal.value, y: bar.y.baseVal.value, width: bar.width.baseVal.value, height: bar.height.baseVal.value, fill: getComputedStyle(bar).fill,
        reading: root.querySelector('[data-skeletal-total-value="' + key + ':' + name + '"]')!.textContent }; }),
      summaries: [0, 1].map(index => root.querySelector('[data-skeletal-group-summary="' + key + ':' + index + '"]')!.textContent),
      inventory: glyphs(inventory, 'data-skeletal-specimen'), packed: glyphs(packing, 'data-skeletal-packed'),
      rows: Array.from(packing.querySelectorAll<SVGGElement>('[data-skeletal-packing-row]')).map(node => { const rect = node.querySelector<SVGRectElement>('rect')!; return { id: node.getAttribute('data-skeletal-packing-row'), rect: [rect.x.baseVal.value, rect.y.baseVal.value, rect.width.baseVal.value, rect.height.baseVal.value] }; }),
      unrecorded: Array.from(packing.querySelectorAll('[data-skeletal-unrecorded]')).map(node => ({ id: node.getAttribute('data-skeletal-unrecorded'), text: node.textContent })),
      inventoryLabel: inventory.querySelector('svg')!.getAttribute('aria-label'), packingLabel: packing.querySelector('svg')!.getAttribute('aria-label'),
      inventoryCaption: inventory.querySelector('figcaption')!.textContent, packingCaption: packing.querySelector('figcaption')!.textContent,
      proof: packing.querySelector('[data-skeletal-proof]')!.textContent, viewHeight: packing.querySelector('svg')!.viewBox.baseVal.height,
      invalid: Array.from(root.querySelectorAll('svg *')).flatMap(node => Array.from(node.attributes).filter(attribute => /NaN|Infinity/.test(attribute.value)).map(attribute => attribute.name)) };
  }, key);
}
function inspect(native: any, groups: Group[], selected: number, key = 'current') {
  const all = totals(groups), group = groups[selected], bound = evidence(group), errors: string[] = [];
  function near(actual: number, expected: number, label: string, tolerance = .0001) { if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) errors.push(label + ': ' + actual + ' vs ' + expected); }
  near(native.selected, selected, 'shared inspected group');
  native.bars.forEach((bar: any, index: number) => { const value = index ? all.mni : all.nisp, maximum = index ? 16 : 48;
    [28, 54 + index * 109, value / maximum * 584, 22].forEach((expected, part) => near([bar.x, bar.y, bar.width, bar.height][part], expected, 'native ' + bar.name + ' bar ' + part));
    near(Number(bar.reading), value, 'native ' + bar.name + ' reading');
  });
  groups.forEach((group, index) => { const expected = evidence(group); if (native.summaries[index] !== 'Group ' + (index ? 'B' : 'A') + 'C ' + group.crania + ' · L ' + group.left + ' · R ' + group.right + 'NISP ' + expected.nisp + ' · MNI ' + expected.mni) errors.push('complete group summary ' + index); });
  if (native.inventory.length !== bound.nisp || native.packed.length !== bound.nisp) errors.push('one native glyph per complete recorded element in each view');
  if (native.rows.length !== bound.mni) errors.push('independently minimal row count');
  near(native.viewHeight, bound.mni ? 88 + bound.mni * 58 : 180, 'bounded native packing height');
  native.rows.forEach((row: any, index: number) => { if (row.id !== key + ':' + index) errors.push('unique packing row ' + index); [76, 63 + index * 58, 526, 50].forEach((value, part) => near(row.rect[part], value, 'packing row ' + index + ':' + part)); });
  for (let column = 0; column < kinds.length; column++) {
    const kind = kinds[column], inventory = native.inventory.filter((glyph: any) => glyph.id.startsWith(key + ':' + kind + ':')), packed = native.packed.filter((glyph: any) => glyph.id.startsWith(key + ':' + kind + ':'));
    if (inventory.length !== group[kind] || packed.length !== group[kind]) errors.push('native complete-element count ' + kind);
    [...inventory, ...packed].forEach((glyph: any) => {
      const mirror = kind === 'right' ? -1 : 1; [mirror, 0, 0, 1, 0, 0].forEach((value, index) => near(glyph.mirror[index], value, 'native side transform ' + kind + ':' + index));
      if (!Number.isFinite(glyph.length) || glyph.length < 80 || !glyph.path) errors.push('rendered native element outline ' + kind);
      if (glyph.fill !== 'rgb(230, 205, 162)' || glyph.stroke !== 'rgb(248, 233, 198)') errors.push('rendered native bone colors');
    });
    inventory.forEach((glyph: any, index: number) => { if (glyph.id !== key + ':' + kind + ':' + index) errors.push('unique recorded specimen ' + kind + ':' + index); [.78, 0, 0, .78, 45 + index * 77, 65 + column * 118].forEach((value, part) => near(glyph.matrix[part], value, 'native tray specimen ' + kind + ':' + index + ':' + part)); });
    packed.forEach((glyph: any, index: number) => { if (glyph.id !== key + ':' + kind + ':' + index) errors.push('one use of each packed specimen ' + kind + ':' + index); [.78, 0, 0, .78, 165 + column * 170, 88 + index * 58].forEach((value, part) => near(glyph.matrix[part], value, 'native packed specimen ' + kind + ':' + index + ':' + part)); });
    const empty = native.unrecorded.filter((slot: any) => slot.id.startsWith(key + ':' + kind + ':'));
    if (empty.length !== bound.mni - group[kind] || empty.some((slot: any) => slot.text !== '—')) errors.push('explicit unrecorded slots ' + kind);
  }
  // Independently recover counts from native glyphs, and prove that no row
  // contains more than one token of a category. This checks the constructed
  // assignment, rather than accepting only its reported minimum.
  const masks = native.rows.map(() => 0);
  for (const glyph of native.packed) { const [, kind, rowText] = glyph.id.split(':'), row = Number(rowText), bit = 1 << kinds.indexOf(kind); if (row >= masks.length || (masks[row] & bit)) errors.push('incompatible or repeated row element'); else masks[row] |= bit; }
  if (!native.packingCaption.includes('not recovered matches') || !native.packingLabel.includes('does not establish')) errors.push('assignment uncertainty label');
  if (!native.inventoryCaption.includes('crania exclude mandibles') || !native.inventoryLabel.includes('Symbols do not identify a real species')) errors.push('complete elements and known-group boundary');
  if (!native.proof.includes('= ' + bound.mni + '.') || !native.proof.includes('not proof that a bone was absent')) errors.push('lower-bound proof and unrecorded-slot meaning');
  if (!bound.mni && !native.proof.includes('does not establish that no prey was eaten')) errors.push('empty inventory boundary');
  if (native.bars[0].fill !== 'rgb(232, 200, 151)' || native.bars[1].fill !== 'rgb(185, 211, 199)') errors.push('rendered native count colors');
  if (native.invalid.length) errors.push('nonfinite native geometry');
  return errors;
}
async function checked(page: Page, groups: Group[], selected: number, key = 'current') {
  let native: any;
  // Shared reduced-motion CSS assigns even SVG fills a short transition. Wait
  // for exact native colors while retaining independent geometry/count checks.
  await expect.poll(async () => { native = await drawing(page, key); return inspect(native, groups, selected, key).filter(error => /rendered native (bone|count) colors/.test(error)); }).toEqual([]);
  return inspect(native, groups, selected, key);
}

test('independent feasible-bin enumeration matches complete-element icons, minimal assignments, separate count axes and zero/extreme inventories', async ({ page }) => {
  await mount(page); const errors: string[] = [], cases: Model[] = [initial];
  for (const crania of [0, 8]) for (const left of [0, 8]) for (const right of [0, 8]) cases.push({ version: 1, groups: [{ crania, left, right }, { crania: 0, left: 0, right: 0 }], selected: 0 });
  cases.push({ version: 1, groups: [{ crania: 1, left: 0, right: 0 }, { crania: 1, left: 0, right: 0 }], selected: 1 },
    { version: 1, groups: [{ crania: 2, left: 5, right: 3 }, { crania: 4, left: 2, right: 6 }], selected: 0 },
    { version: 1, groups: [{ crania: 2, left: 5, right: 3 }, { crania: 4, left: 2, right: 6 }], selected: 1 },
    { version: 1, groups: [{ crania: 3, left: 3, right: 3 }, { crania: 8, left: 8, right: 8 }], selected: 1 },
    { version: 1, groups: [{ crania: 8, left: 8, right: 8 }, { crania: 8, left: 8, right: 8 }], selected: 1 });
  for (const model of cases) { await replace(page, model); errors.push(...(await checked(page, model.groups, model.selected)).map(error => JSON.stringify(model) + ': ' + error)); }
  expect(errors).toEqual([]);
  await replace(page, initial); await page.getByText('Read the exact inventory model, boundaries, and research context', { exact: true }).click();
  const root = page.locator('[data-raptor-skeletal-study]');
  for (const boundary of ['already known invented taxon groups', 'complete crania with the mandibles excluded', 'one feasible minimum assignment', 'no repeated records, fragments', 'does not identify a species', 'estimate true prey abundance']) await expect(root).toContainText(boundary);
  await expect(root.locator('a[href="https://link.springer.com/article/10.1186/s13213-024-01759-6"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('full frozen inventories, exact sided additions, shared group inspection and bounded persistence stay isolated without progress awards', async ({ page }) => {
  await mount(page); await page.locator('[data-skeletal-pin]').click();
  const pin = initial.groups, settings = await page.locator('[data-skeletal-pinned-settings]').textContent(), pinnedDrawing = await page.locator('[data-skeletal-packing="pinned"]').innerHTML();
  await page.locator('[data-skeletal-experiment="left"]').click(); const sameSide = [{ crania: 1, left: 4, right: 2 }, initial.groups[1]];
  expect(await checked(page, sameSide, 0)).toEqual([]); expect(await checked(page, pin, 0, 'pinned')).toEqual([]);
  await expect(page.locator('[data-skeletal-comparison]')).toContainText('change +1 elements'); await expect(page.locator('[data-skeletal-comparison]')).toContainText('change +1 minimum individuals');
  expect(await page.locator('[data-skeletal-packing="pinned"]').innerHTML()).toBe(pinnedDrawing);
  await page.locator('#rh-skeletal-group').selectOption('1'); for (const kind of kinds) await range(page, kind, 8);
  await page.locator('#rh-skeletal-group').selectOption('0'); await page.locator('[data-skeletal-experiment="right"]').click();
  const opposite = [{ crania: 1, left: 3, right: 3 }, initial.groups[1]];
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.skeletalStudy)).toEqual({ version: 1, groups: opposite, selected: 0 });
  expect(await checked(page, opposite, 0)).toEqual([]); await expect(page.locator('[data-skeletal-comparison]')).toContainText('change +0 minimum individuals');
  expect(await page.locator('[data-skeletal-pinned-settings]').textContent()).toBe(settings);
  for (const selected of [1, 0]) { await page.locator('#rh-skeletal-group').selectOption(String(selected)); expect(await checked(page, opposite, selected)).toEqual([]); expect(await checked(page, pin, selected, 'pinned')).toEqual([]); }
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, statusSort: 'name' } })));
  expect(await page.locator('[data-skeletal-pinned-settings]').textContent()).toBe(settings);
  await page.locator('#rh-skeletal-group').selectOption('1'); await range(page, 'left', 8); await range(page, 'right', 8); await page.locator('[data-skeletal-pin]').click();
  for (const side of ['left', 'right']) await expect(page.locator('[data-skeletal-experiment="' + side + '"]')).toBeDisabled();
  await range(page, 'left', 0); await expect(page.locator('[data-skeletal-experiment="left"]')).toBeDisabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.skeletalStudy));
  await page.locator('[data-skeletal-experiment="left"]').evaluate((button: HTMLButtonElement) => button.click()); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.raptorHunt.skeletalStudy))).toBe(before);
  await page.locator('#rh-skeletal-group').selectOption('0'); for (const side of ['left', 'right']) await expect(page.locator('[data-skeletal-experiment="' + side + '"]')).toBeEnabled();
  await page.locator('[data-skeletal-answer="matches"]').click(); await expect(page.locator('.rh-skeletal-feedback')).toContainText('no matching evidence');
  await page.locator('[data-skeletal-answer="possible"]').click(); await expect(page.locator('.rh-skeletal-feedback')).toContainText('do not identify which recovered elements belonged together');
  await page.locator('#rh-skeletal-group').selectOption('1'); await page.locator('[data-skeletal-reset]').click(); await expect(page.locator('#rh-skeletal-group')).toHaveValue('1'); await expect(page.locator('#rh-skeletal-left')).toHaveValue('1'); await expect(page.locator('.rh-skeletal-feedback')).toHaveCount(0);
  await page.locator('[data-skeletal-clear-pin]').click(); await expect(page.locator('[data-skeletal-packing="pinned"]')).toHaveCount(0); await page.locator('[data-skeletal-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-skeletal-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'pelletkey' } })));
  await expect(page.locator('#rh-skeletal-group')).toHaveValue('1'); await expect(page.locator('[data-skeletal-packing="pinned"]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, skeletalStudy: { version: 1, groups: [{ crania: '8', left: -3, right: 99 }, { crania: NaN, left: Infinity, right: 2.5 }], selected: 99 } } })));
  for (const [kind, value] of Object.entries({ crania: 2, left: 1, right: 3 })) await expect(page.locator('#rh-skeletal-' + kind)).toHaveValue(String(value));
  await range(page, 'crania', 4); expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.skeletalStudy)).toEqual({ version: 1, groups: [{ crania: 1, left: 0, right: 8 }, { crania: 4, left: 1, right: 3 }], selected: 1 });
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, skeletalStudy: { version: 99, groups: [], selected: 1 } } })));
  await expect(page.locator('#rh-skeletal-group')).toHaveValue('0'); for (const kind of kinds) await expect(page.locator('#rh-skeletal-' + kind)).toHaveValue(String(initial.groups[0][kind]));
  await page.getByText('Explore the original pellet identification reference', { exact: true }).click(); await expect(page.getByText('Materials Needed', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('manual inventories and minimum-arrangement diagrams remain keyboard accessible and readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page); const root = page.locator('[data-raptor-skeletal-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-skeletal-pin]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-skeletal-packing="pinned"]')).toBeVisible();
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-skeletal-group').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await expect(page.locator('#rh-skeletal-group')).toHaveValue('1'); await expect(page.locator('#rh-skeletal-group')).toBeFocused();
    await page.locator('#rh-skeletal-crania').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-skeletal-crania')).toHaveValue('1'); await expect(page.locator('#rh-skeletal-crania')).toBeFocused();
    await expect(page.locator('output[for="rh-skeletal-crania"]')).toHaveText('1 complete element');
    await page.locator('#rh-skeletal-left').focus(); await page.keyboard.press('End'); await expect(page.locator('#rh-skeletal-left')).toHaveValue('8');
    await page.locator('#rh-skeletal-right').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-skeletal-right')).toHaveValue('1');
    await page.locator('[data-skeletal-experiment="right"]').focus(); await page.keyboard.press('Space'); await expect(page.locator('#rh-skeletal-right')).toHaveValue('2'); await expect(page.locator('#rh-skeletal-crania')).toHaveValue('2'); await expect(page.locator('#rh-skeletal-left')).toHaveValue('1'); await expect(page.locator('[data-skeletal-experiment="right"]')).toBeFocused();
    // Inspect the densest tray and eight-row minimum arrangement at every
    // layout, including the phone. The original full pin remains untouched.
    for (const kind of kinds) await range(page, kind, 8);
    await expect(page.locator('output[for="rh-skeletal-crania"]')).toHaveText('8 complete elements');
    expect(await checked(page, [initial.groups[0], { crania: 8, left: 8, right: 8 }], 1)).toEqual([]);
    // Compare the browser's actual outline and font bounds after translating
    // them through their screen CTMs into one SVG frame. This is independent
    // of the authored row stride and catches enlarged phone identifier text
    // colliding with its icon even when both remain inside the viewBox.
    const specimenGaps = await root.locator('[data-skeletal-inventory] svg').evaluateAll(elements => elements.flatMap(svg => {
      const inverse = svg.getScreenCTM()!.inverse();
      function bounds(node: SVGGraphicsElement) {
        const box = node.getBBox(), transform = inverse.multiply(node.getScreenCTM()!);
        const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(transform));
        return { top: Math.min(...points.map(point => point.y)), bottom: Math.max(...points.map(point => point.y)) };
      }
      return Array.from(svg.querySelectorAll<SVGGElement>('[data-skeletal-specimen]')).map(icon => {
        const identifier = icon.parentElement!.querySelector<SVGTextElement>('[data-skeletal-specimen-label]')!;
        return { id: icon.getAttribute('data-skeletal-specimen'), text: identifier.textContent, gap: bounds(identifier).top - bounds(icon).bottom };
      });
    }));
    expect(specimenGaps.length).toBeGreaterThanOrEqual(24);
    for (const specimen of specimenGaps) expect(specimen.gap, specimen.id + ' / ' + specimen.text + ' icon-to-identifier gap').toBeGreaterThan(4);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-skeletal-study]', '[data-skeletal-totals="current"]', '[data-skeletal-inventory="current"]', '[data-skeletal-packing="current"]', '[data-skeletal-totals="pinned"]', '[data-skeletal-inventory="pinned"]', '[data-skeletal-packing="pinned"]', '.rh-skeletal-controls', '.rh-skeletal-compare', '.rh-skeletal-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-skeletal-totals="current"] svg', '[data-skeletal-inventory="current"] svg', '[data-skeletal-packing="current"] svg', '[data-skeletal-inventory="pinned"] svg', '[data-skeletal-packing="pinned"] svg']) expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    expect(await root.locator('svg').evaluateAll(elements => elements.flatMap(svg => Array.from(svg.querySelectorAll('text')).filter(text => { const box = text.getBBox(), view = svg.viewBox.baseVal; return box.x < -1 || box.y < -1 || box.x + box.width > view.width + 1 || box.y + box.height > view.height + 1; }).map(text => text.textContent)))).toEqual([]);
    expect(await root.locator('svg').evaluateAll(elements => elements.flatMap(svg => { const matrix = svg.getScreenCTM()!, scale = Math.hypot(matrix.a, matrix.b); return Array.from(svg.querySelectorAll('text')).filter(text => parseFloat(getComputedStyle(text).fontSize) * scale < 10).map(text => text.textContent); }))).toEqual([]);
    expect(await page.evaluate(async () => { const report = await (window as any).axe.run(document.querySelector('[data-raptor-skeletal-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })); })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
