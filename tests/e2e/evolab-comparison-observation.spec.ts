import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const comparisonKey = 'archipelagoResidentComparison';
const comparisonTitle = 'Island Connections · captured organism comparison';
const noteLabel = 'What is alike or different, and what can this pair not tell you?';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const comparison = (card: Locator) => card.getByRole('region', { name: 'Compare inherited variation', exact: true });
const observation = (card: Locator) => card.getByRole('region', { name: 'Captured comparison', exact: true });
const captureButton = (card: Locator) => card.getByRole('button', { name: 'Capture this comparison', exact: true });
const pinButton = (card: Locator) => card.getByRole('button', { name: 'Pin this organism for comparison', exact: true });
const trait = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;
const priorNotes = {
  livingIsland: { text: 'My manual Living Island explanation stays here.', at: '2026-10-09T00:00:00Z' },
  archipelagoEvidence: { text: 'My main geographic evidence remains independent.', at: '2026-10-09T01:00:00Z' },
  archipelagoRouteEvidence: { text: 'My earlier sea-route investigation.', at: '2026-10-09T02:00:00Z' },
  archipelagoClimate: { text: 'My changing-weather investigation.', at: '2026-10-09T03:00:00Z' }
};

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function modelState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return {
      world: JSON.stringify(data.archipelago), rng: data.archipelago.rng, settings: JSON.stringify(data.archipelago.settings),
      primer: JSON.stringify(data.island), archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'),
      primerCache: localStorage.getItem('evoLab.island.v1'), study: localStorage.getItem('evoLab.archipelago.study.v1')
    };
  });
}

async function notes(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
}

function expectPriorNotes(saved: any) {
  for (const [key, note] of Object.entries(priorNotes)) expect(saved[key]).toEqual(note);
}

async function expectCaptured(region: Locator, a: any, b: any, generation: number, island: number) {
  await expect(region).toHaveAttribute('data-field-observation', 'ready');
  await expect(region).toHaveAttribute('data-field-observation-a', String(a.organism.id));
  await expect(region).toHaveAttribute('data-field-observation-b', String(b.organism.id));
  await expect(region).toHaveAttribute('data-field-observation-generation', String(generation));
  await expect(region).toHaveAttribute('data-field-observation-island', String(island));
  await expect(region).toContainText('#' + a.organism.id); await expect(region).toContainText('#' + b.organism.id);
  for (const [side, record] of [['A', a], ['B', b]] as const) {
    const member = region.locator('[data-field-observation-side="' + side + '"]');
    await expect(member).toContainText('#' + record.organism.id); await expect(member).toContainText('Born G' + record.generation);
    await expect(member.locator('[data-field-observation-trait]')).toHaveAttribute('data-field-observation-trait', String(trait(record.organism)));
  }
  await expect(region.getByRole('textbox', { name: noteLabel, exact: true })).toHaveAttribute('id', 'ea-field-observation-note');
  await expect(region.getByRole('textbox', { name: noteLabel, exact: true })).toHaveAttribute('maxlength', '2000');
  await expect(region.locator('[aria-live], [role="status"]')).toHaveCount(0);
}

function expectEvidence(text: string, fixture: any, a: any, b: any, generation: number, island: number, reflection: string) {
  expect(text).toContain(comparisonTitle + '\nSeed=' + fixture.world.seed + '; captured displayed generation=G' + generation + '; displayed island=' + fixture.names[island] + '; species=' + a.organism.species + '.');
  for (const [side, record] of [['A', a], ['B', b]] as const) {
    const organism = record.organism, value = trait(organism);
    expect(text).toContain(side + ': #' + organism.id + '; born G' + record.generation + '; birth island=' + fixture.names[record.island] + '; parents=' + JSON.stringify(organism.parents) + '; trait copies=' + JSON.stringify(organism.genes) + '; trait mean (0–1)=' + value + '; trait index (0–100)=' + value * 100 + '; neutral marker copies=' + JSON.stringify(organism.marker) + '; neutral marker genotype=' + organism.marker.map((copy: number) => copy ? 'A' : 'a').join('/') + '.');
  }
  const sameGenes = a.organism.genes[0] === b.organism.genes[0] && a.organism.genes[1] === b.organism.genes[1] || a.organism.genes[0] === b.organism.genes[1] && a.organism.genes[1] === b.organism.genes[0];
  const sameMarker = a.organism.marker[0] + a.organism.marker[1] === b.organism.marker[0] + b.organism.marker[1];
  expect(text).toContain('B minus A=' + (trait(b.organism) - trait(a.organism)) * 100 + ' inherited trait index points (0–100 scale).');
  expect(text).toContain('Unordered trait-copy pair match=' + sameGenes + '; neutral marker genotype match=' + sameMarker + '.');
  if (reflection) expect(text).toContain('My observation:\n' + reflection);
  expect(text).toContain('This pair is not a random sample; its selection path is not recorded.');
  expect(text).toContain('These are two organisms, not a before-and-after change within one individual.');
  expect(text).toContain('A pair does not establish a population trend or an evolutionary cause.');
  expect(text).toContain('One neutral marker does not measure genome-wide diversity.');
}

async function enter(page: Page, target: Locator) { await target.focus(); await page.keyboard.press('Enter'); }

test('desktop freezes a recorded pair, saves complete evidence to its own journal note and replaces only that note', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await page.evaluate((preservedNotes) => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, world = model.step(model.create(2026)), primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Captured comparisons must use replay-valid organisms');
    const a = model.find(world, world.history[0].demes[1].birds[0].id), b = model.find(world, world.history[1].demes[2].birds[0].id);
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    localStorage.setItem('evoLab.progress.v1', JSON.stringify({ notes: preservedNotes }));
    return { world, primer, a, b, names: model.islands.map((island: any) => island.name) };
  }, priorNotes);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer, evoProgress: { notes: priorNotes } } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await modelState(page), originalNotes = await notes(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].createdBy).toBe('page'); expect(contexts[0].renders).toBeGreaterThan(0);
  expectPriorNotes(originalNotes);
  const card = fieldCard(page), panel = comparison(card), captured = observation(card);
  await expect(captured).toHaveCount(0); await expect(captureButton(card)).toHaveCount(0);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await page.locator('[data-arch-island="1"]').click(); await card.locator('#ea-field-resident').selectOption(String(fixture.a.organism.id));
  await pinButton(card).click(); await expect(panel).toHaveAttribute('data-field-compare', 'same');
  await expect(captureButton(card)).toHaveCount(0);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('End');
  await page.locator('[data-arch-island="2"]').click(); await card.locator('#ea-field-resident').selectOption(String(fixture.b.organism.id));
  await expect(panel).toHaveAttribute('data-field-compare', 'ready'); await expect(captureButton(card)).toBeEnabled();
  await captureButton(card).click(); await expectCaptured(captured, fixture.a, fixture.b, 1, 2);
  await expect(captureButton(card)).toBeDisabled();
  expect(await captured.evaluate(node => !node.closest('[data-field-compare]'))).toBe(true);

  // The form keeps its captured IDs and scope while the live card changes completely.
  await card.locator('#ea-field-resident').selectOption(String(fixture.world.history[1].demes[2].birds[1].id));
  await expectCaptured(captured, fixture.a, fixture.b, 1, 2);
  await panel.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  await expect(panel).toHaveCount(0); await expectCaptured(captured, fixture.a, fixture.b, 1, 2);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await page.locator('[data-arch-island="0"]').click(); await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await card.getByRole('button', { name: 'Next resident', exact: true }).click(); await pinButton(card).click();
  await card.getByRole('button', { name: 'Next resident', exact: true }).click(); await expect(captureButton(card)).toBeDisabled();
  await expectCaptured(captured, fixture.a, fixture.b, 1, 2);
  const reflection = ('These two recorded organisms can share marker information while carrying different trait copies. Their values alone cannot explain how a whole population evolved. ').repeat(20).slice(0, 1900) + ' REFLECTION-END-FROZEN-PAIR.';
  const textbox = captured.getByRole('textbox', { name: noteLabel, exact: true });
  await textbox.fill(reflection); await expect(textbox).toHaveValue(reflection);
  await captured.getByText('Show captured evidence', { exact: true }).click();
  await expect(captured).toContainText(String(fixture.a.organism.genes[0])); await expect(captured).toContainText(String(fixture.b.organism.genes[1]));
  await captured.screenshot({ path: report + '/comparison-observation-desktop.png' });
  expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  await captured.getByRole('button', { name: 'Save captured comparison to field journal', exact: true }).click();
  await expect(captured).toHaveCount(0);
  const confirmation = card.locator('[data-field-observation-saved]');
  await expect(confirmation).toBeFocused(); await expect(confirmation).toContainText('#' + fixture.a.organism.id); await expect(confirmation).toContainText('#' + fixture.b.organism.id);
  await expect(confirmation).toHaveJSProperty('tagName', 'P'); await expect(confirmation).toHaveAttribute('data-field-observation-saved', fixture.a.organism.id + ':' + fixture.b.organism.id);
  expect(await confirmation.getAttribute('aria-live')).toBeNull(); expect(await confirmation.getAttribute('role')).toBeNull();
  const firstNotes = await notes(page), firstText = firstNotes[comparisonKey].text;
  expect(Object.keys(firstNotes).sort()).toEqual([...Object.keys(priorNotes), comparisonKey].sort()); expectPriorNotes(firstNotes);
  expect(firstText.length).toBeGreaterThan(2000); expectEvidence(firstText, fixture, fixture.a, fixture.b, 1, 2, reflection);
  expect(await modelState(page)).toEqual(original);
  await card.getByRole('button', { name: 'Open field journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Learning Journal', exact: true }).first()).toBeVisible();
  const firstEntry = page.getByRole('listitem').filter({ has: page.getByText(firstText, { exact: true }) });
  await expect(firstEntry).toBeVisible(); await expect(firstEntry).toContainText(comparisonTitle); await expect(firstEntry.locator('p')).toHaveText(firstText);

  // A fresh mount reloads the full saved note from storage, including its long reflection.
  await harness.mount(page, { evoLab: { view: 'journal', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  const reloadedEntry = page.getByRole('listitem').filter({ has: page.getByText(firstText, { exact: true }) });
  await expect(reloadedEntry).toBeVisible(); await expect(reloadedEntry).toContainText(comparisonTitle);
  expect(await notes(page)).toEqual(firstNotes); expect(await modelState(page)).toEqual(original);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  await expect(observation(fieldCard(page))).toHaveCount(0);
  const nextA = { organism: fixture.world.history[1].demes[0].birds[0], generation: 1, island: 0 }, nextB = { organism: fixture.world.history[1].demes[0].birds[1], generation: 1, island: 0 };
  await fieldCard(page).getByRole('button', { name: 'Next resident', exact: true }).click(); await pinButton(fieldCard(page)).click();
  await fieldCard(page).getByRole('button', { name: 'Next resident', exact: true }).click(); await captureButton(fieldCard(page)).click();
  await expectCaptured(observation(fieldCard(page)), nextA, nextB, 1, 0);
  const secondReflection = 'A second pair has its own evidence. This replaces my latest captured comparison only.';
  await observation(fieldCard(page)).getByRole('textbox', { name: noteLabel, exact: true }).fill(secondReflection);
  await observation(fieldCard(page)).getByRole('button', { name: 'Save captured comparison to field journal', exact: true }).click();
  const secondNotes = await notes(page);
  expect(Object.keys(secondNotes).sort()).toEqual(Object.keys(firstNotes).sort()); expectPriorNotes(secondNotes);
  expect(secondNotes[comparisonKey].text).not.toBe(firstText); expect(secondNotes[comparisonKey].text).not.toContain('REFLECTION-END-FROZEN-PAIR.');
  expectEvidence(secondNotes[comparisonKey].text, fixture, nextA, nextB, 1, 0, secondReflection);
  expect(await modelState(page)).toEqual(original); expect(errors).toEqual([]);
});

test('phone captures and cancels by keyboard without WebGL, and a new expedition clears the frozen observation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await page.evaluate((preservedNotes) => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel, world = model.create(2026), primer = w.StemLab.evoIslandModel.create(2026);
    const a = model.find(world, world.history[0].demes[0].birds[0].id), b = model.find(world, world.history[0].demes[0].birds[1].id);
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world)); localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    localStorage.setItem('evoLab.progress.v1', JSON.stringify({ notes: preservedNotes }));
    return { world, primer, a, b, names: model.islands.map((island: any) => island.name) };
  }, priorNotes);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer, evoProgress: { notes: priorNotes } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await modelState(page), originalNotes = await notes(page), card = fieldCard(page), captured = observation(card);
  await enter(page, card.getByRole('button', { name: 'Next resident', exact: true })); await enter(page, pinButton(card));
  await enter(page, card.getByRole('button', { name: 'Next resident', exact: true }));
  await enter(page, captureButton(card)); await expectCaptured(captured, fixture.a, fixture.b, 0, 0); await expect(captureButton(card)).toBeDisabled();
  await enter(page, page.locator('[data-arch-island="2"]'));
  await enter(page, card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }));
  await enter(page, card.getByRole('button', { name: 'Next resident', exact: true }));
  await expectCaptured(captured, fixture.a, fixture.b, 0, 0);
  const textbox = captured.getByRole('textbox', { name: noteLabel, exact: true }), reflection = 'I am comparing two recorded organisms. Their marker does not describe all genetic variation.';
  await textbox.focus(); await page.keyboard.insertText(reflection); await expect(textbox).toHaveValue(reflection);
  await enter(page, captured.getByText('Show captured evidence', { exact: true }));
  await expect(captured).toContainText(String(fixture.a.organism.genes[0]));
  for (const name of ['Save captured comparison to field journal', 'Cancel captured observation']) {
    await expect(captured.getByRole('button', { name, exact: true })).toHaveAttribute('type', 'button');
  }
  expect(await captured.locator('button').evaluateAll(buttons => buttons.every(button => button instanceof HTMLButtonElement))).toBe(true);
  expect(await captured.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await captured.screenshot({ path: report + '/comparison-observation-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]); expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);
  await enter(page, captured.getByRole('button', { name: 'Cancel captured observation', exact: true }));
  await expect(captured).toHaveCount(0); await expect(card.getByRole('button', { name: 'Browse Seedwing birds', exact: true })).toBeFocused();
  expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);
  await enter(page, comparison(card).getByRole('group', { name: 'Find a comparison example', exact: true }).getByRole('button', { name: 'Find different marker genotype', exact: true }));
  await expect(captureButton(card)).toBeEnabled();
  const currentId = Number(await card.locator('#ea-field-resident').inputValue()), newB = { organism: fixture.world.history[0].demes[2].birds.find((organism: any) => organism.id === currentId), generation: 0, island: 2 };
  await enter(page, captureButton(card)); await expectCaptured(captured, fixture.a, newB, 0, 2);
  const expectedRestart = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoArchipelagoModel.create(((window as any).__toolData.evoLab.archipelago.seed + 1) >>> 0)));
  await enter(page, page.getByText('Start a different expedition', { exact: true }));
  await enter(page, page.getByRole('button', { name: 'New seed · full founding populations', exact: true }));
  await expect(captured).toHaveCount(0); await expect(comparison(card)).toHaveCount(0); await expect(card).toHaveAttribute('data-arch-field-card', '');
  const restarted = await modelState(page);
  expect(restarted.world).toBe(expectedRestart); expect(restarted.archipelagoCache).toBe(expectedRestart);
  expect(restarted.primer).toBe(original.primer); expect(restarted.primerCache).toBe(original.primerCache); expect(await notes(page)).toEqual(originalNotes);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
