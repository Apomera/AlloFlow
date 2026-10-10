import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const prediction = 'Weather changes relative reproduction. Actual offspring receive sampled parental alleles, and copied-trait mutation is not directed by need.';
const draftKey = 'evoLab.archipelago.climateWeights.v1';

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function fixture(page: any, noGL = false, selection = true) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !noGL });
  const world = await page.evaluate(enabled => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let w = m.create(21);
    w.settings.migration = .4; w.settings.mutation = .05; w.settings.selection = enabled;
    for (let i = 0; i < 3; i++) w = m.step(w);
    return w;
  }, selection);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: !noGL });
  return world;
}

async function activate(locator: any, keyboard = false) {
  if (keyboard) { await locator.focus(); await locator.press('Enter'); } else await locator.click();
}

async function openWeather(page: any, keyboard = false) {
  await activate(page.getByRole('button', { name: 'Plan a weather expedition', exact: true }), keyboard);
  const summary = page.getByText('Follow evolution through changing weather', { exact: true });
  if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) await activate(summary, keyboard);
  return page.locator('section[data-climate-expedition]');
}

async function setRange(page: any, selector: string, value: number) {
  await page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function runWeather(page: any, panel: any) {
  await panel.locator('#ea-climate-target').selectOption('1');
  for (const [i, rainfall] of [.15, .35, .8, .95].entries()) await setRange(page, '#ea-climate-rain-' + i, rainfall);
  await panel.locator('#ea-climate-prediction').fill(prediction);
  await panel.getByRole('button', { name: 'Run weather expedition', exact: true }).click();
  await expect(panel).toHaveAttribute('data-climate-expedition', 'complete');
  await panel.locator('#ea-climate-island').selectOption('1');
  await panel.locator('#ea-climate-generation').selectOption('1');
}

async function download(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download weather expedition', exact: true }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
}

async function openCopies(lens: any, keyboard = false) {
  const summary = lens.getByText('Follow this parent’s transmitted copies', { exact: true });
  if (!(await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open))) await activate(summary, keyboard);
  return lens.locator('details.ea-climate-transmissions');
}

// Build every child-slot record directly from the authoritative private world.
// This deliberately does not call climateWeightEvidence or read its derived records.
async function verifyTransmissions(page: any, raw: any) {
  const expected = await page.evaluate(({ recipe, view }) => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    const world = m.climateBranch(recipe, view.condition), before = world.history[view.generation - 1], frame = world.history[view.generation];
    const originals = new Map<number, any>();
    before.demes.forEach((deme: any, from: number) => ['birds', 'plants'].forEach(species => deme[species].forEach((organism: any) => originals.set(organism.id, { organism, from }))));
    const children = frame.demes[view.island][view.species];
    const contribution = frame.round.contributions.find((c: any) => c.island === view.island && c.species === view.species);
    const members = contribution.members.map((p: any) => ({ id: p.id, from: p.from, transmissions: [] as any[] }));
    for (const child of children) for (let slot = 0; slot < 2; slot++) {
      const parent = originals.get(child.parents[slot]), inheritance = child.inheritance[slot];
      const member = members.find((p: any) => p.id === child.parents[slot]);
      member.transmissions.push({ child: child.id, slot, parent: parent.organism.id, from: parent.from, traitCopy: inheritance.copy, markerCopy: inheritance.markerCopy, traitBefore: parent.organism.genes[inheritance.copy], traitAfter: child.genes[slot], delta: inheritance.delta, marker: child.marker[slot] });
    }
    return { members, children: children.length, firstChild: children[0] ? children[0].id : null,
      markerCopiesValid: children.every((child: any) => child.parents.every((id: number, slot: number) => child.marker[slot] === originals.get(id).organism.marker[child.inheritance[slot].markerCopy])) };
  }, { recipe: raw.recipe, view: raw.mechanism.view });
  const row = raw.mechanism.evidence.rows.find((r: any) => r.species === raw.mechanism.view.species);
  expect(row.members.map((p: any) => p.id)).toEqual(expected.members.map((p: any) => p.id));
  let copies = 0;
  for (const member of expected.members) {
    const actual = row.members.find((p: any) => p.id === member.id);
    expect(actual.from).toBe(member.from); expect(actual.gametes).toBe(member.transmissions.length);
    expect(actual.transmissions).toEqual(member.transmissions); copies += member.transmissions.length;
    for (const event of member.transmissions) {
      const drawn = event.traitBefore + (event.delta === null ? 0 : event.delta);
      expect(event.traitAfter).toBe(drawn < 0 ? -drawn : drawn > 1 ? 2 - drawn : drawn);
    }
  }
  expect(copies).toBe(expected.children * 2);
  expect(expected.markerCopiesValid).toBe(true);
  const selected = expected.members.find((p: any) => p.id === raw.mechanism.view.member);
  const choice = raw.mechanism.view.transmission;
  expect(raw.mechanism.transmission).toEqual(choice ? selected.transmissions.find((e: any) => e.child === choice.child && e.slot === choice.slot) : null);
  return expected;
}

async function verifySelected(lens: any, event: any) {
  const card = lens.locator('[data-climate-transmission-child]');
  const names: Record<string, string> = { child: 'child', slot: 'slot', parent: 'parent', from: 'from', traitCopy: 'trait-copy', markerCopy: 'marker-copy', traitBefore: 'before', traitAfter: 'after', delta: 'delta', marker: 'marker' };
  for (const [key, suffix] of Object.entries(names)) await expect(card).toHaveAttribute('data-climate-transmission-' + suffix, String(event[key]));
  await expect(lens.locator('#ea-climate-weights-transmission')).toHaveValue(event.child + ':' + event.slot);
  await expect(card).toContainText('Trait and marker copy indices are drawn independently in this model.');
  if (event.delta !== null) { await expect(card).toContainText('Recorded mutation draw'); await expect(card).toContainText('Net copied-trait change'); await expect(card).toContainText('reflects back inside'); }
}

async function verifyFamily(panel: any, event: any, keyboard = false) {
  await activate(panel.getByRole('button', { name: 'Open this newborn’s family', exact: true }), keyboard);
  const family = panel.locator('[data-climate-family]');
  await expect(family).toHaveAttribute('data-climate-family', String(event.child));
  await expect(family).toBeFocused(); await expect(family.locator('#ea-climate-resident')).toHaveValue(String(event.child));
  expect(await family.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open)).toBe(true);
  const highlighted = family.locator('[data-climate-parent-highlighted="true"]');
  await expect(highlighted).toHaveCount(1); await expect(highlighted).toHaveAttribute('data-climate-parent', String(event.slot));
  await expect(highlighted).toHaveAttribute('data-climate-parent-id', String(event.parent));
  await expect(highlighted).toHaveAttribute('data-climate-copy-before', String(event.traitBefore));
  await expect(highlighted).toHaveAttribute('data-climate-copy-after', String(event.traitAfter));
  await expect(highlighted).toHaveAttribute('data-climate-copy-marker', String(event.marker));
  await expect(highlighted).toContainText('Trait copy ' + (event.traitCopy + 1) + ': ' + (event.traitBefore * 100).toFixed(3) + ' → ' + (event.traitAfter * 100).toFixed(3) + ' /100');
  await expect(family.locator('[data-climate-parent-highlighted="false"]')).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Play recorded future', exact: true })).toHaveAttribute('aria-pressed', 'false');
  return family;
}

test('desktop learners trace actual parent copies into exact newborn families and replay canonical saved choices without changing the expedition', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), panel = await openWeather(page); await runWeather(page, panel);
  await panel.getByRole('button', { name: 'Rainfall & parent chances', exact: true }).click();
  const lens = panel.locator('[data-climate-weights]'), raw = await download(page, panel), expected = await verifyTransmissions(page, raw);
  await expect(lens.locator('[data-climate-weight-parent]')).toContainText('Expected copy share · recorded rainfall');
  const zero = expected.members.find((p: any) => p.transmissions.length === 0), first = expected.members.find((p: any) => p.transmissions.length > 0);
  expect(zero, 'seeded fixture includes a potential parent that transmitted no copies').toBeTruthy(); expect(first).toBeTruthy();
  await lens.locator('#ea-climate-weights-parent').selectOption(String(zero.id)); await openCopies(lens);
  await expect(lens.locator('[data-climate-transmission-empty]')).toHaveAttribute('data-climate-transmission-empty', String(zero.id));
  await expect(lens.locator('[data-climate-transmission-empty]')).toContainText('An expected share is not a guarantee. This is not a record of the parent dying.');
  await expect(lens.locator('#ea-climate-weights-transmission')).toHaveCount(0); await expect(lens.getByRole('button', { name: 'Open this newborn’s family', exact: true })).toHaveCount(0);
  const noCopies = await download(page, panel); expect(noCopies.mechanism.transmission).toBeNull(); expect(noCopies.mechanism.view.transmission).toBeNull();
  await lens.getByRole('button', { name: 'Choose a parent that transmitted a copy', exact: true }).click();
  await expect(lens.locator('#ea-climate-weights-parent')).toHaveValue(String(first.id)); await verifySelected(lens, first.transmissions[0]);
  const mutated = expected.members.flatMap((p: any) => p.transmissions).find((event: any) => event.delta !== null);
  expect(mutated, 'seeded round contains a recorded copied-trait mutation').toBeTruthy();
  await lens.locator('#ea-climate-weights-parent').selectOption(String(mutated.parent));
  await lens.locator('#ea-climate-weights-transmission').selectOption(mutated.child + ':' + mutated.slot);
  await verifySelected(lens, mutated);
  await expect(lens.locator('[data-climate-transmission-child]')).toContainText((mutated.delta > 0 ? '+' : '') + (mutated.delta * 100).toFixed(3));
  const multi = expected.members.find((p: any) => p.transmissions.length > 1);
  expect(multi, 'seeded fixture includes multiple transmissions from one parent').toBeTruthy();
  await lens.locator('#ea-climate-weights-parent').selectOption(String(multi.id));
  const selector = lens.locator('#ea-climate-weights-transmission'); await selector.focus(); await selector.press('End');
  const event = multi.transmissions.at(-1); expect(event.child).not.toBe(expected.firstChild); await verifySelected(lens, event);
  await lens.locator('#ea-climate-weights-note').fill('I followed an actual allele copy. A parent mean is not copied intact, and this newborn belongs only to this private condition.');
  await lens.screenshot({ path: report + '/weather-transmissions-desktop.png' });
  const family = await verifyFamily(panel, event); await family.screenshot({ path: report + '/weather-transmission-family.png' });
  const pinned = await download(page, panel); await verifyTransmissions(page, pinned);
  expect(pinned.view.resident).toBe(event.child); expect(pinned.mechanism.transmission).toEqual(event);
  await panel.getByRole('button', { name: 'Save weather expedition to journal', exact: true }).click();
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoClimate.text);
  expect(journal).toContain('Selected recorded transmission=' + JSON.stringify(event));
  expect(journal).toContain('net trait-copy change=' + (event.traitAfter - event.traitBefore));
  await expect.poll(async () => page.evaluate(({ key, scope }) => JSON.parse(localStorage.getItem(key)!).find((d: any) => d.scope === scope).transmission, { key: draftKey, scope: pinned.mechanism.view.scope })).toEqual({ child: event.child, slot: event.slot });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } });
  const replay = await openWeather(page); await replay.getByRole('button', { name: 'Replay saved weather expedition', exact: true }).click();
  const replayLens = replay.locator('[data-climate-weights]'); await openCopies(replayLens); await verifySelected(replayLens, event); await verifyFamily(replay, event);
  const replayed = await download(page, replay); expect(replayed.recipe).toEqual(pinned.recipe); expect(replayed.mechanism).toEqual(pinned.mechanism); expect(replayed.view.resident).toBe(event.child);
  await page.evaluate(({ key, scope }) => { const drafts = JSON.parse(localStorage.getItem(key)!); drafts.find((d: any) => d.scope === scope).transmission = { child: Number.MAX_SAFE_INTEGER, slot: 1 }; localStorage.setItem(key, JSON.stringify(drafts)); }, { key: draftKey, scope: pinned.mechanism.view.scope });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } });
  const recovered = await openWeather(page); await recovered.getByRole('button', { name: 'Replay saved weather expedition', exact: true }).click();
  const recoveredLens = recovered.locator('[data-climate-weights]'); await openCopies(recoveredLens);
  await verifySelected(recoveredLens, multi.transmissions[0]); const canonical = await download(page, recovered);
  expect(canonical.mechanism.transmission).toEqual(multi.transmissions[0]); await verifyTransmissions(page, canonical);
  const other = expected.members.find((p: any) => p.id !== multi.id && p.transmissions.length);
  await recoveredLens.locator('#ea-climate-weights-parent').selectOption(String(other.id)); await verifySelected(recoveredLens, other.transmissions[0]);
  expect((await download(page, recovered)).mechanism.view.transmission).toEqual({ child: other.transmissions[0].child, slot: other.transmissions[0].slot });
  for (const [selector, value] of [['#ea-climate-species', 'plants'], ['#ea-climate-island', '2'], ['#ea-climate-condition', 'steady'], ['#ea-climate-generation', '2']]) {
    await recovered.locator(selector).selectOption(value); const context = await download(page, recovered); const contextExpected = await verifyTransmissions(page, context);
    const member = contextExpected.members.find((p: any) => p.id === context.mechanism.view.member);
    expect(context.mechanism.transmission).toEqual(member.transmissions[0] || null); await expect(recoveredLens.locator('#ea-climate-weights-note')).toHaveValue('');
  }
  await recovered.locator('#ea-climate-generation').selectOption('0'); const source = await download(page, recovered);
  expect(source.mechanism.evidence).toBeNull(); expect(source.mechanism.transmission).toBeNull(); expect(source.mechanism.view.transmission).toBeNull();
  await expect(recoveredLens.locator('[data-climate-transmission-child]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), world);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next); expect(errors).toEqual([]);
});

test('phone learners follow independently sampled trait and marker copies with native keyboard controls and accessible no-WebGL layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any; });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); const world = await fixture(page, true, false);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  const panel = await openWeather(page, true); await runWeather(page, panel);
  await activate(panel.getByRole('button', { name: 'Rainfall & parent chances', exact: true }), true);
  const lens = panel.locator('[data-climate-weights]'), raw = await download(page, panel), expected = await verifyTransmissions(page, raw);
  expect(raw.mechanism.evidence.settings.selection).toBe(false);
  const multi = expected.members.find((p: any) => p.transmissions.length > 1); expect(multi).toBeTruthy();
  await lens.locator('#ea-climate-weights-parent').selectOption(String(multi.id)); await openCopies(lens, true);
  const selector = lens.locator('#ea-climate-weights-transmission'); await selector.focus(); await selector.press('End');
  const event = multi.transmissions.at(-1); await verifySelected(lens, event);
  await expect(selector).toHaveAccessibleName('Choose a transmitted copy in a newborn');
  const family = await verifyFamily(panel, event, true);
  for (const control of [selector, lens.locator('#ea-climate-weights-parent'), lens.getByRole('button', { name: 'Open this newborn’s family', exact: true }), family.locator('#ea-climate-resident')]) expect(await control.evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 1);
  await lens.screenshot({ path: report + '/weather-transmissions-phone.png' });
  const final = await download(page, panel); await verifyTransmissions(page, final); expect(final.mechanism.transmission).toEqual(event); expect(final.view.resident).toBe(event.child);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world); expect(errors).toEqual([]);
});
