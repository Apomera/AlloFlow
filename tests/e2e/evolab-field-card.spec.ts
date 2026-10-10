import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const traitValue = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;
const cohortMean = (population: any[]) => population.reduce((sum, organism) => sum + traitValue(organism), 0) / population.length;
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });

async function expectOptions(card: Locator, population: any[]) {
  expect(await card.locator('#ea-field-resident option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value)))
    .toEqual(['', ...population.map(organism => String(organism.id))]);
}

async function expectResident(card: Locator, record: any, population: any[] | null, islandNames: string[]) {
  const organism = record.organism, value = traitValue(organism);
  await expect(card).toHaveAttribute('data-arch-field-card', String(organism.id));
  await expect(card).toHaveAttribute('data-field-card-presence', population ? 'displayed' : 'recorded');
  await expect(card.locator('[data-field-card-trait]')).toHaveAttribute('data-field-card-trait', String(value));
  await expect(card.locator('[data-field-card-trait]')).toHaveText((value * 100).toFixed(2) + '/100');
  await expect(card).toContainText('Born G' + record.generation + ' · ' + islandNames[record.island]);
  for (let copy = 0; copy < 2; copy++) {
    await expect(card.locator('[data-field-card-copy="' + copy + '"]')).toHaveText(organism.genes[copy].toFixed(4));
  }
  await expect(card.locator('[data-field-card-marker]')).toHaveText(organism.marker.map((copy: number) => copy ? 'A' : 'a').join('/'));
  await expect(card.getByRole('img')).toHaveAccessibleName(organism.species === 'birds' ? /fictional Seedwing bird/ : /fictional Shellseed plant/);
  if (population) {
    const mean = cohortMean(population), comparison = card.locator('[data-field-card-cohortmean]');
    expect(Number(await comparison.getAttribute('data-field-card-cohortmean'))).toBeCloseTo(mean, 12);
    await expect(comparison).toContainText('Displayed cohort mean: ' + (mean * 100).toFixed(2) + '/100');
    await expect(comparison).toContainText('Individual minus mean: ' + ((value - mean) * 100).toFixed(2));
    await expect(comparison).toContainText('A larger index does not always mean a higher breeding weight.');
  } else {
    await expect(card.locator('[data-field-card-cohortmean]')).toHaveCount(0);
    await expect(card).toContainText('This organism is not in the displayed cohort. Its inherited copies below come from its recorded birth cohort.');
  }
}

async function savedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return {
      world: JSON.stringify(data.archipelago), primer: JSON.stringify(data.island),
      archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'), primerCache: localStorage.getItem('evoLab.island.v1'),
      journal: localStorage.getItem('evoLab.progress.v1')
    };
  });
}

test('desktop field card browses actual copies and cohort means, focuses the island and opens the full record', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate(() => {
    const w = window as any, m = w.StemLab.evoArchipelagoModel;
    const world = m.create(2026), primer = w.StemLab.evoIslandModel.create(2026);
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, islandNames: m.islands.map((island: any) => island.name) };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer,
    evoProgress: { notes: { livingIsland: { text: 'My primer explanation.', at: '2026-10-09T00:00:00Z' } } } } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id);
  const card = fieldCard(page), previous = card.getByRole('button', { name: 'Previous resident', exact: true }), next = card.getByRole('button', { name: 'Next resident', exact: true });
  const species = card.getByRole('group', { name: 'Field card species', exact: true });
  await expect(card).toHaveAttribute('data-arch-field-card', '');
  await expect(card).toHaveAttribute('data-field-card-presence', 'empty');
  await expect(card).toContainText('Choose a resident to reveal its inherited copies.');
  await expect(card.getByRole('combobox', { name: 'Choose an island resident', exact: true })).toHaveValue('');
  await expect(previous).toBeDisabled(); await expect(next).toBeEnabled();
  await expectOptions(card, fixture.world.history[0].demes[0].birds);
  expect(await card.evaluate(node => ({ before: node.previousElementSibling?.classList.contains('ea-scene-wrap'), after: node.nextElementSibling?.classList.contains('ea-stage-caption') })))
    .toEqual({ before: true, after: true });
  expect(await card.locator('button').evaluateAll(buttons => buttons.every(button => button instanceof HTMLButtonElement))).toBe(true);
  expect(await card.locator('#ea-field-resident').evaluate(node => node instanceof HTMLSelectElement)).toBe(true);
  await expect(card.locator('[aria-live], [role="status"]')).toHaveCount(0);

  const birds = fixture.world.history[0].demes[0].birds;
  await next.click();
  await expectResident(card, { organism: birds[0], generation: 0, island: 0 }, birds, fixture.islandNames);
  await expect(previous).toBeDisabled();
  await expect(page.locator('#ea-resident')).toHaveValue(String(birds[0].id));
  await next.click(); await expectResident(card, { organism: birds[1], generation: 0, island: 0 }, birds, fixture.islandNames);
  await previous.click(); await expect(card).toHaveAttribute('data-arch-field-card', String(birds[0].id));
  await card.locator('#ea-field-resident').selectOption({ value: String(birds[birds.length - 1].id) });
  await expect(next).toBeDisabled(); await expect(previous).toBeEnabled();
  await expectResident(card, { organism: birds[birds.length - 1], generation: 0, island: 0 }, birds, fixture.islandNames);

  await species.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await expect(species.getByRole('button', { name: 'Browse Shellseed plants', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Shellseed plants', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toHaveAttribute('data-field-card-presence', 'empty');
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', '');
  await expectOptions(card, fixture.world.history[0].demes[0].plants);
  const plant = fixture.world.history[0].demes[0].plants[3];
  await card.locator('#ea-field-resident').selectOption({ value: String(plant.id) });
  await expectResident(card, { organism: plant, generation: 0, island: 0 }, fixture.world.history[0].demes[0].plants, fixture.islandNames);

  await page.locator('[data-arch-island="2"]').click();
  await species.getByRole('button', { name: 'Browse Seedwing birds', exact: true }).click();
  await expectOptions(card, fixture.world.history[0].demes[2].birds);
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'overview');
  const selected = fixture.world.history[0].demes[2].birds[2];
  await card.locator('#ea-field-resident').selectOption({ value: String(selected.id) });
  await expectResident(card, { organism: selected, generation: 0, island: 2 }, fixture.world.history[0].demes[2].birds, fixture.islandNames);
  await expect(page.locator('[data-arch-island="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expect(page.locator('[data-arch-inspector]')).toHaveAttribute('data-arch-inspector', String(selected.id));
  await expect(page.locator('#ea-resident')).toHaveValue(String(selected.id));
  await expect(page.getByRole('group', { name: 'Choose a species', exact: true }).getByRole('button', { name: 'Seedwing birds', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => page.evaluate(id => {
    const w = window as any, record = w.__glRecorder.records.find((row: any) => row.scene && row.canvas.isConnected);
    const groups = record.scene.getObjectByName('Archipelago organisms').children;
    const selected = groups.find((group: any) => group.userData.id === id);
    return { selectedVisible: selected.visible, selectedIsland: selected.userData.island, halo: selected.children.some((mesh: any) => mesh.geometry?.type === 'TorusGeometry'), visibleIslands: Array.from(new Set(groups.filter((group: any) => group.visible).map((group: any) => group.userData.island))) };
  }, selected.id)).toEqual({ selectedVisible: true, selectedIsland: 2, halo: true, visibleIslands: [2] });
  await card.screenshot({ path: report + '/field-card-desktop.png' });
  await card.getByRole('button', { name: 'Open full organism record', exact: true }).click();
  await expect(page.locator('.ea-inspector')).toBeFocused();
  await expect(page.locator('.ea-inspector h2')).toBeInViewport();
  await expect(card.getByRole('button', { name: 'Show this organism’s birth cohort', exact: true })).toHaveCount(0);
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts);
  expect(errors).toEqual([]);
});

test('phone field card works without WebGL and returns an actual parent to its recorded birth cohort by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate(() => {
    const w = window as any, m = w.StemLab.evoArchipelagoModel, start = m.create(2026);
    start.settings.migration = .4;
    const world = m.step(start), mixed = world.history[1].demes.flatMap((deme: any, island: number) => deme.birds.map((organism: any) => ({ organism, island })))
      .find((item: any) => m.find(world, item.organism.parents[0]).island !== m.find(world, item.organism.parents[1]).island);
    if (!mixed) throw new Error('Seed 2026 has no recorded bird with parents born on different islands');
    const child = mixed.organism, parent = m.find(world, child.parents[0]), secondParent = m.find(world, child.parents[1]), primer = w.StemLab.evoIslandModel.create(2026);
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, child, childIsland: mixed.island, parent, secondParent, primer, islandNames: m.islands.map((island: any) => island.name) };
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), card = fieldCard(page), next = card.getByRole('button', { name: 'Next resident', exact: true });
  await expect(card).toHaveAttribute('data-field-card-presence', 'empty');
  await next.focus(); await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-arch-field-card', String(fixture.world.history[1].demes[0].birds[0].id));
  await card.locator('#ea-field-resident').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(fixture.world.history[1].demes[0].birds[1].id));
  await card.getByRole('button', { name: 'Previous resident', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(fixture.world.history[1].demes[0].birds[0].id));
  await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-field-card-presence', 'empty');
  await next.focus(); await page.keyboard.press('Enter');
  await expectResident(card, { organism: fixture.world.history[1].demes[0].plants[0], generation: 1, island: 0 }, fixture.world.history[1].demes[0].plants, fixture.islandNames);
  await page.locator('[data-arch-island="' + fixture.childIsland + '"]').focus(); await page.keyboard.press('Enter');
  await card.getByRole('button', { name: 'Browse Seedwing birds', exact: true }).focus(); await page.keyboard.press('Enter');
  await expectOptions(card, fixture.world.history[1].demes[fixture.childIsland].birds);
  await card.locator('#ea-field-resident').selectOption({ value: String(fixture.child.id) });
  await expectResident(card, { organism: fixture.child, generation: 1, island: fixture.childIsland }, fixture.world.history[1].demes[fixture.childIsland].birds, fixture.islandNames);
  await card.getByRole('button', { name: 'Open full organism record', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.ea-inspector')).toBeFocused();
  const parentButton = page.locator('.ea-inspector').getByRole('button', { name: '#' + fixture.parent.organism.id + ' · ' + fixture.islandNames[fixture.parent.island], exact: true });
  await parentButton.focus(); await page.keyboard.press('Enter');
  await expectResident(card, fixture.parent, null, fixture.islandNames);
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
  await expect(card.locator('#ea-field-resident')).toHaveValue('');
  await expect(card.getByRole('button', { name: 'Previous resident', exact: true })).toBeDisabled();
  await expect(card.getByRole('button', { name: 'Next resident', exact: true })).toBeEnabled();
  await expect(page.locator('.ea-inspector').getByRole('button', { name: 'Visit this individual’s birth generation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View whole archipelago', exact: true }).click();
  const birthButton = card.getByRole('button', { name: 'Show this organism’s birth cohort', exact: true });
  await birthButton.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G' + fixture.parent.generation);
  await expect(page.locator('[data-arch-island="' + fixture.parent.island + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-archipelago-view]')).toHaveAttribute('data-archipelago-view', 'island');
  await expect(page.locator('#ea-resident')).toHaveValue(String(fixture.parent.organism.id));
  await expect(card.locator('#ea-field-resident')).toHaveValue(String(fixture.parent.organism.id));
  await expectResident(card, fixture.parent, fixture.world.history[fixture.parent.generation].demes[fixture.parent.island].birds, fixture.islandNames);
  await expectOptions(card, fixture.world.history[fixture.parent.generation].demes[fixture.parent.island].birds);
  await expect(birthButton).toHaveCount(0);
  await expect(card.getByText('This organism is not in the displayed cohort.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Advance one generation', exact: true })).toBeDisabled();

  // Family links retain the displayed cursor and island. A second founder can
  // therefore have the same birth generation but belong to a different island.
  const childLink = page.locator('.ea-inspector .ea-members').getByRole('button', { name: '#' + fixture.child.id, exact: true });
  await childLink.focus(); await page.keyboard.press('Enter');
  await expectResident(card, { organism: fixture.child, generation: 1, island: fixture.childIsland }, null, fixture.islandNames);
  const secondParentButton = page.locator('.ea-inspector').getByRole('button', { name: '#' + fixture.secondParent.organism.id + ' · ' + fixture.islandNames[fixture.secondParent.island], exact: true });
  await secondParentButton.focus(); await page.keyboard.press('Enter');
  expect(fixture.secondParent.island).not.toBe(fixture.parent.island);
  await expect(page.locator('[data-arch-generation]')).toHaveText('G' + fixture.secondParent.generation);
  await expectResident(card, fixture.secondParent, null, fixture.islandNames);
  await expect(card.locator('#ea-field-resident')).toHaveValue('');
  await expect(birthButton).toBeVisible();
  await birthButton.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G' + fixture.secondParent.generation);
  await expect(page.locator('[data-arch-island="' + fixture.secondParent.island + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#ea-resident')).toHaveValue(String(fixture.secondParent.organism.id));
  await expectResident(card, fixture.secondParent, fixture.world.history[0].demes[fixture.secondParent.island].birds, fixture.islandNames);
  await expectOptions(card, fixture.world.history[0].demes[fixture.secondParent.island].birds);
  await expect(birthButton).toHaveCount(0);
  await card.scrollIntoViewIfNeeded();
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await card.screenshot({ path: report + '/field-card-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]);
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
