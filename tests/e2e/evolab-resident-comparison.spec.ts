import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const comparison = (card: Locator) => card.getByRole('region', { name: 'Compare inherited variation', exact: true });
const exampleSearch = (panel: Locator) => panel.getByRole('group', { name: 'Find a comparison example', exact: true });
const pinButton = (card: Locator) => card.getByRole('button', { name: 'Pin this organism for comparison', exact: true });
const trait = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function savedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return {
      world: JSON.stringify(data.archipelago), rng: data.archipelago.rng, primer: JSON.stringify(data.island),
      archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'), primerCache: localStorage.getItem('evoLab.island.v1'),
      study: localStorage.getItem('evoLab.archipelago.study.v1'), journal: localStorage.getItem('evoLab.progress.v1')
    };
  });
}

async function expectMember(panel: Locator, side: 'A' | 'B', record: any, names: string[]) {
  const card = panel.locator('[data-field-comparison-side="' + side + '"]'), organism = record.organism, value = trait(organism);
  await expect(card).toContainText('#' + organism.id + ' · ' + (organism.species === 'birds' ? 'Seedwing birds' : 'Shellseed plants'));
  await expect(card).toContainText('Born G' + record.generation + ' · ' + names[record.island]);
  await expect(card.locator('[data-field-comparison-trait]')).toHaveAttribute('data-field-comparison-trait', String(value));
  await expect(card.locator('[data-field-comparison-trait]')).toHaveText((value * 100).toFixed(2) + '/100');
  for (let copy = 0; copy < 2; copy++) {
    await expect(card.locator('[data-field-comparison-copy="' + copy + '"]')).toHaveText(organism.genes[copy].toFixed(4));
  }
  await expect(card.locator('[data-field-comparison-marker]')).toHaveText(organism.marker.map((copy: number) => copy ? 'A' : 'a').join('/'));
}

async function expectWaiting(panel: Locator, state: 'same' | 'awaiting' | 'species', reference: any, names: string[]) {
  await expect(panel).toHaveAttribute('data-field-reference', String(reference.organism.id));
  await expect(panel).toHaveAttribute('data-field-compare', state);
  await expectMember(panel, 'A', reference, names);
  await expect(panel.locator('[data-field-comparison-side="B"], [data-field-comparison-difference], [data-field-comparison-genes], [data-field-comparison-genotype]')).toHaveCount(0);
}

async function expectPair(panel: Locator, reference: any, selected: any, names: string[]) {
  const a = reference.organism, b = selected.organism, difference = (trait(b) - trait(a)) * 100;
  const sameGenes = a.genes[0] === b.genes[0] && a.genes[1] === b.genes[1] || a.genes[0] === b.genes[1] && a.genes[1] === b.genes[0];
  const sameMarker = a.marker[0] + a.marker[1] === b.marker[0] + b.marker[1];
  await expect(panel).toHaveAttribute('data-field-reference', String(a.id));
  await expect(panel).toHaveAttribute('data-field-compare', 'ready');
  await expectMember(panel, 'A', reference, names); await expectMember(panel, 'B', selected, names);
  await expect(panel.locator('[data-field-comparison-difference]')).toHaveAttribute('data-field-comparison-difference', String(difference));
  await expect(panel.locator('[data-field-comparison-difference]')).toHaveText((difference > 0 ? '+' : '') + difference.toFixed(2) + ' index points');
  await expect(panel.locator('[data-field-comparison-genes]')).toHaveAttribute('data-field-comparison-genes', sameGenes ? 'same' : 'different');
  await expect(panel.locator('[data-field-comparison-genotype]')).toHaveAttribute('data-field-comparison-genotype', sameMarker ? 'same' : 'different');
  await expect(panel).toContainText('Equal trait averages can still come from different trait-copy pairs.');
  await expect(panel).toContainText('One neutral marker does not measure genome-wide diversity.');
}

function markerExamples(population: any[], reference: any, same: boolean) {
  const a = reference.organism, genotype = a.marker[0] + a.marker[1];
  return population.filter(organism => organism.id !== a.id && (organism.marker[0] + organism.marker[1] === genotype) === same);
}

function nextMarkerExample(population: any[], reference: any, selectedId: number | null, same: boolean) {
  const index = population.findIndex(organism => organism.id === selectedId);
  const eligible = markerExamples(population, reference, same).map(organism => organism.id);
  const next = [...population.slice(index + 1), ...population.slice(0, index + 1)].find(organism => eligible.includes(organism.id));
  expect(next).toBeDefined();
  return next;
}

async function expectSearch(panel: Locator, reference: any, population: any[], island: number, generation: number, names: string[]) {
  const search = exampleSearch(panel), same = markerExamples(population, reference, true).length, different = markerExamples(population, reference, false).length;
  await expect(search).toHaveAttribute('data-field-search-island', String(island));
  await expect(search).toHaveAttribute('data-field-search-generation', String(generation));
  await expect(search).toHaveAttribute('data-field-search-species', reference.organism.species);
  await expect(search).toContainText(names[island] + ' · G' + generation + ' · ' + (reference.organism.species === 'birds' ? 'Seedwing birds' : 'Shellseed plants'));
  await expect(search.locator('[data-field-search-same]')).toHaveAttribute('data-field-search-same', String(same));
  await expect(search.locator('[data-field-search-same]')).toHaveText('Same marker genotype: ' + same);
  await expect(search.locator('[data-field-search-different]')).toHaveAttribute('data-field-search-different', String(different));
  await expect(search.locator('[data-field-search-different]')).toHaveText('Different marker genotype: ' + different);
  await expect(search.getByRole('button')).toHaveCount(2);
  for (const [name, count] of [['Find same marker genotype', same], ['Find different marker genotype', different]] as const) {
    const button = search.getByRole('button', { name, exact: true });
    await expect(button).toHaveAttribute('type', 'button');
    if (count) await expect(button).toBeEnabled(); else await expect(button).toBeDisabled();
  }
  expect(await search.locator('button').evaluateAll(buttons => buttons.every(button => button instanceof HTMLButtonElement))).toBe(true);
  await expect(search).toContainText('These controls deliberately find examples in this cohort.');
  await expect(search).toContainText('They do not draw a random sample or explain an evolutionary cause.');
}

async function enter(page: Page, button: Locator) { await button.focus(); await page.keyboard.press('Enter'); }

async function chooseByKeyboard(page: Page, card: Locator, population: any[], id: number) {
  const index = population.findIndex(organism => organism.id === id);
  expect(index).toBeGreaterThanOrEqual(0);
  const select = card.getByRole('combobox', { name: 'Choose an island resident', exact: true });
  await select.focus(); await page.keyboard.press('Home');
  for (let option = 0; option <= index; option++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue(String(id));
}

test('desktop pins actual inherited copies across islands and generations without changing expedition state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate(() => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, world = model.create(2026), primer = w.StemLab.evoIslandModel.create(2026);
    const a = { organism: world.history[0].demes[1].birds[0], generation: 0, island: 1 };
    const residents = world.history[0].demes[2].birds;
    const lower = residents.find((organism: any) => model.value(organism) < model.value(a.organism));
    const higher = residents.find((organism: any) => model.value(organism) > model.value(a.organism));
    if (!lower || !higher) throw new Error('Seed 2026 must offer both signed trait differences on Mist');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, a, lower: { organism: lower, generation: 0, island: 2 }, higher: { organism: higher, generation: 0, island: 2 }, names: model.islands.map((island: any) => island.name) };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer,
    evoProgress: { notes: { livingIsland: { text: 'My saved primer explanation.', at: '2026-10-09T00:00:00Z' } } } } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].createdBy).toBe('page'); expect(contexts[0].renders).toBeGreaterThan(0);
  const card = fieldCard(page), panel = comparison(card);
  await expect(panel).toHaveCount(0); await expect(pinButton(card)).toHaveCount(0);
  await page.locator('[data-arch-island="1"]').click();
  await card.locator('#ea-field-resident').selectOption(String(fixture.a.organism.id));
  await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  await pinButton(card).click();
  await expectWaiting(panel, 'same', fixture.a, fixture.names); await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'true');
  await expectSearch(panel, fixture.a, fixture.world.history[0].demes[1].birds, 1, 0, fixture.names);
  expect(markerExamples(fixture.world.history[0].demes[1].birds, fixture.a, true).length + markerExamples(fixture.world.history[0].demes[1].birds, fixture.a, false).length).toBe(23);
  expect(await panel.locator('button').evaluateAll(buttons => buttons.every(button => button instanceof HTMLButtonElement))).toBe(true);

  await page.locator('[data-arch-island="2"]').click();
  await expectWaiting(panel, 'awaiting', fixture.a, fixture.names);
  const mistBirds = fixture.world.history[0].demes[2].birds;
  await expectSearch(panel, fixture.a, mistBirds, 2, 0, fixture.names);
  const firstDifferent = nextMarkerExample(mistBirds, fixture.a, null, false);
  await exampleSearch(panel).getByRole('button', { name: 'Find different marker genotype', exact: true }).click();
  await expectPair(panel, fixture.a, { organism: firstDifferent, generation: 0, island: 2 }, fixture.names);
  await card.locator('#ea-field-resident').selectOption(String(fixture.lower.organism.id));
  await expectPair(panel, fixture.a, fixture.lower, fixture.names); await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  await card.locator('#ea-field-resident').selectOption(String(fixture.higher.organism.id));
  await expectPair(panel, fixture.a, fixture.higher, fixture.names);
  // Start outside the matching category, visit every actual matching resident, then wrap.
  const sameExamples = markerExamples(mistBirds, fixture.a, true), visited: number[] = [];
  let selectedId = fixture.higher.organism.id;
  for (let click = 0; click <= sameExamples.length; click++) {
    const expected = nextMarkerExample(mistBirds, fixture.a, selectedId, true);
    await exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }).click();
    await expect(card.locator('#ea-field-resident')).toHaveValue(String(expected.id));
    await expect(panel.locator('[data-field-comparison-genotype]')).toHaveAttribute('data-field-comparison-genotype', 'same');
    visited.push(expected.id); selectedId = expected.id;
  }
  expect(visited.slice(0, sameExamples.length).sort((a, b) => a - b)).toEqual(sameExamples.map(organism => organism.id).sort((a, b) => a - b));
  expect(visited[sameExamples.length]).toBe(visited[0]);
  const followingDifferent = nextMarkerExample(mistBirds, fixture.a, selectedId, false);
  await exampleSearch(panel).getByRole('button', { name: 'Find different marker genotype', exact: true }).click();
  await expectPair(panel, fixture.a, { organism: followingDifferent, generation: 0, island: 2 }, fixture.names);
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0'); await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await savedState(page)).toEqual(original);
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await expectWaiting(panel, 'awaiting', fixture.a, fixture.names);
  await card.getByRole('button', { name: 'Next resident', exact: true }).click();
  await expectWaiting(panel, 'species', fixture.a, fixture.names);
  await expect(panel).toContainText('Beak strength and shell hardness are different traits.');
  await expectSearch(panel, fixture.a, mistBirds, 2, 0, fixture.names);
  const restoredBird = nextMarkerExample(mistBirds, fixture.a, null, true);
  await exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }).click();
  await expectPair(panel, fixture.a, { organism: restoredBird, generation: 0, island: 2 }, fixture.names);
  await expect(card.getByRole('button', { name: 'Browse Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#ea-resident')).toHaveValue(String(restoredBird.id));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0'); await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await card.getByRole('button', { name: 'Browse Seedwing birds', exact: true }).click();
  await card.locator('#ea-field-resident').selectOption(String(fixture.lower.organism.id));
  await card.locator('#ea-field-resident').selectOption('');
  await expectWaiting(panel, 'awaiting', fixture.a, fixture.names);
  await panel.getByRole('button', { name: 'Inspect pinned organism', exact: true }).click();
  await expect(page.locator('.ea-inspector')).toBeFocused(); await expect(card).toHaveAttribute('data-arch-field-card', String(fixture.a.organism.id));
  await expectWaiting(panel, 'same', fixture.a, fixture.names);
  expect(await savedState(page)).toEqual(original);

  // A settings save creates a new world object; the original founding frame and pin remain valid.
  await page.locator('#ea-migration').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => page.evaluate(() => (window as any).__toolData.evoLab.archipelago.settings.migration)).toBe(.13);
  const configured = await savedState(page);
  expect(configured.rng).toBe(original.rng); expect(JSON.parse(configured.world).history).toEqual(fixture.world.history);
  expect(configured.primer).toBe(original.primer); expect(configured.primerCache).toBe(original.primerCache); expect(configured.journal).toBe(original.journal);
  await expectWaiting(panel, 'same', fixture.a, fixture.names);
  const expectedAdvance = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoArchipelagoModel.step((window as any).__toolData.evoLab.archipelago)));
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
  const advanced = await savedState(page);
  expect(advanced.world).toBe(expectedAdvance); expect(advanced.archipelagoCache).toBe(expectedAdvance);
  expect(advanced.primer).toBe(original.primer); expect(advanced.primerCache).toBe(original.primerCache); expect(advanced.journal).toBe(original.journal);
  await expectWaiting(panel, 'awaiting', fixture.a, fixture.names);
  const tideNewborns = JSON.parse(expectedAdvance).history[1].demes[1].birds;
  await expectSearch(panel, fixture.a, tideNewborns, 1, 1, fixture.names);
  const newbornSame = nextMarkerExample(tideNewborns, fixture.a, null, true);
  await exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }).click();
  await expectPair(panel, fixture.a, { organism: newbornSame, generation: 1, island: 1 }, fixture.names);
  const newbornDifferent = nextMarkerExample(tideNewborns, fixture.a, newbornSame.id, false);
  await exampleSearch(panel).getByRole('button', { name: 'Find different marker genotype', exact: true }).click();
  await expectPair(panel, fixture.a, { organism: newbornDifferent, generation: 1, island: 1 }, fixture.names);
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1'); await expect(page.locator('[data-arch-island="1"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await savedState(page)).toEqual(advanced);
  await card.screenshot({ path: report + '/resident-comparison-desktop.png' });

  // Inspecting A must return to its birth island, species and generation and focus its full record.
  await page.locator('[data-arch-island="2"]').click();
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await card.getByRole('button', { name: 'Next resident', exact: true }).click();
  await expectWaiting(panel, 'species', fixture.a, fixture.names);
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await panel.getByRole('button', { name: 'Inspect pinned organism', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0');
  await expect(page.locator('[data-arch-island="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expect(card.getByRole('button', { name: 'Browse Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(fixture.a.organism.id));
  await expect(page.locator('#ea-resident')).toHaveValue(String(fixture.a.organism.id));
  await expect(page.locator('.ea-inspector')).toBeFocused(); await expectWaiting(panel, 'same', fixture.a, fixture.names);
  await pinButton(card).click(); await expect(panel).toHaveCount(0); await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  await pinButton(card).click(); await panel.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  await expect(panel).toHaveCount(0); await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  expect(await savedState(page)).toEqual(advanced);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));

  await pinButton(card).click();
  await page.getByText('Start a different expedition', { exact: true }).click();
  const expectedRestart = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoArchipelagoModel.create(((window as any).__toolData.evoLab.archipelago.seed + 1) >>> 0)));
  await page.getByRole('button', { name: 'New seed · full founding populations', exact: true }).click();
  await expect(panel).toHaveCount(0); await expect(card).toHaveAttribute('data-arch-field-card', '');
  const restarted = await savedState(page);
  expect(restarted.world).toBe(expectedRestart); expect(restarted.archipelagoCache).toBe(expectedRestart);
  expect(restarted.primer).toBe(original.primer); expect(restarted.primerCache).toBe(original.primerCache); expect(restarted.journal).toBe(original.journal);
  expect(errors).toEqual([]);
});

test('phone compares replay-valid reversed copies by keyboard without WebGL, and clears its ephemeral pin on remount', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate(() => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, primer = w.StemLab.evoIslandModel.create(2026);
    let world = model.create(2026); world.settings.mutation = 0; world = model.step(model.step(world));
    if (!model.restore(world)) throw new Error('The comparison fixture must pass genealogy replay validation');
    const a = model.find(world, 14), b = model.find(world, 295);
    if (a.organism.genes[0] !== b.organism.genes[1] || a.organism.genes[1] !== b.organism.genes[0] || a.organism.genes[0] === a.organism.genes[1]) throw new Error('Seed 2026 must provide distinct organisms with reversed inherited copies');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, a, b, names: model.islands.map((island: any) => island.name) };
  });
  const toolData = { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } };
  await harness.mount(page, toolData, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), card = fieldCard(page), panel = comparison(card);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0');
  await chooseByKeyboard(page, card, fixture.world.history[0].demes[0].birds, fixture.a.organism.id);
  await enter(page, pinButton(card)); await expectWaiting(panel, 'same', fixture.a, fixture.names);
  await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'true');
  const emberFounders = fixture.world.history[0].demes[0].birds;
  await expectSearch(panel, fixture.a, emberFounders, 0, 0, fixture.names);
  const founderDifferent = nextMarkerExample(emberFounders, fixture.a, fixture.a.organism.id, false);
  await enter(page, exampleSearch(panel).getByRole('button', { name: 'Find different marker genotype', exact: true }));
  await expectPair(panel, fixture.a, { organism: founderDifferent, generation: 0, island: 0 }, fixture.names);
  const founderSame = nextMarkerExample(emberFounders, fixture.a, founderDifferent.id, true);
  await enter(page, exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }));
  await expectPair(panel, fixture.a, { organism: founderSame, generation: 0, island: 0 }, fixture.names);
  expect(await savedState(page)).toEqual(original);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('End');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G2'); await expectWaiting(panel, 'awaiting', fixture.a, fixture.names);
  const emberNewborns = fixture.world.history[2].demes[0].birds;
  await expectSearch(panel, fixture.a, emberNewborns, 0, 2, fixture.names);
  const firstNewbornSame = nextMarkerExample(emberNewborns, fixture.a, null, true);
  await enter(page, exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }));
  await expectPair(panel, fixture.a, { organism: firstNewbornSame, generation: 2, island: 0 }, fixture.names);
  const secondNewbornSame = nextMarkerExample(emberNewborns, fixture.a, firstNewbornSame.id, true);
  expect(secondNewbornSame.id).not.toBe(firstNewbornSame.id);
  await enter(page, exampleSearch(panel).getByRole('button', { name: 'Find same marker genotype', exact: true }));
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(secondNewbornSame.id));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G2'); await expect(page.locator('[data-arch-island="0"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await savedState(page)).toEqual(original);
  await chooseByKeyboard(page, card, fixture.world.history[2].demes[0].birds, fixture.b.organism.id);
  await expectPair(panel, fixture.a, fixture.b, fixture.names);
  await expect(panel.locator('[data-field-comparison-genes]')).toHaveAttribute('data-field-comparison-genes', 'same');
  await expect(panel.locator('[data-field-comparison-genotype]')).toHaveAttribute('data-field-comparison-genotype', 'different');
  await expect(panel.locator('[data-field-comparison-difference]')).toHaveText('0.00 index points');
  await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  expect(await savedState(page)).toEqual(original);
  await card.scrollIntoViewIfNeeded();
  expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await card.screenshot({ path: report + '/resident-comparison-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]);
  await expect(card.locator('[aria-live], [role="status"]')).toHaveCount(0);

  await enter(page, page.locator('[data-arch-island="2"]'));
  await enter(page, card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }));
  await enter(page, card.getByRole('button', { name: 'Next resident', exact: true }));
  await expectWaiting(panel, 'species', fixture.a, fixture.names);
  const mistNewborns = fixture.world.history[2].demes[2].birds;
  await expectSearch(panel, fixture.a, mistNewborns, 2, 2, fixture.names);
  const restoredNewborn = nextMarkerExample(mistNewborns, fixture.a, null, false);
  await enter(page, exampleSearch(panel).getByRole('button', { name: 'Find different marker genotype', exact: true }));
  await expectPair(panel, fixture.a, { organism: restoredNewborn, generation: 2, island: 2 }, fixture.names);
  await expect(card.getByRole('button', { name: 'Browse Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#ea-resident')).toHaveValue(String(restoredNewborn.id));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G2'); await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await savedState(page)).toEqual(original);
  await enter(page, panel.getByRole('button', { name: 'Inspect pinned organism', exact: true }));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G0');
  await expect(page.locator('[data-arch-island="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('button', { name: 'Browse Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(fixture.a.organism.id));
  await expect(page.locator('#ea-resident')).toHaveValue(String(fixture.a.organism.id));
  await expect(page.locator('.ea-inspector')).toBeFocused(); await expectWaiting(panel, 'same', fixture.a, fixture.names);
  await enter(page, pinButton(card)); await expect(panel).toHaveCount(0); await expect(pinButton(card)).toHaveAttribute('aria-pressed', 'false');
  await enter(page, pinButton(card)); await enter(page, panel.getByRole('button', { name: 'Clear comparison', exact: true }));
  await expect(panel).toHaveCount(0); await enter(page, pinButton(card));
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  await harness.mount(page, toolData, undefined, { expectCanvas: false });
  await expect(comparison(fieldCard(page))).toHaveCount(0); await expect(fieldCard(page)).toHaveAttribute('data-arch-field-card', '');
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
