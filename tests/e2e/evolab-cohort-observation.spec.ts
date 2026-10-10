import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const comparisonKey = 'archipelagoCohortComparison';
const comparisonTitle = 'Island Connections · captured cohort comparison';
const noteLabel = 'What differs between these cohorts? Cite a count or proportion, and describe what this comparison cannot establish.';
const fieldCard = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const reference = (card: Locator) => card.getByRole('region', { name: 'Pinned cohort comparison', exact: true });
const observation = (card: Locator) => card.getByRole('region', { name: 'Captured cohort comparison', exact: true });
const captureButton = (card: Locator) => card.getByRole('button', { name: 'Capture cohort comparison', exact: true });
const pinButton = (card: Locator) => card.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true });
const variationSummary = (card: Locator) => card.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ });
const trait = (organism: any) => (organism.genes[0] + organism.genes[1]) / 2;
const mean = (population: any[]) => population.reduce((sum, organism) => sum + trait(organism), 0) / population.length;
const priorNotes = {
  livingIsland: { text: 'My original Living Island explanation.', at: '2026-10-09T00:00:00Z' },
  archipelagoEvidence: { text: 'My main geographical evidence remains independent.', at: '2026-10-09T01:00:00Z' },
  archipelagoResidentComparison: { text: 'My latest captured organism pair remains independent.', at: '2026-10-09T02:00:00Z' },
  archipelagoRouteEvidence: { text: 'My earlier sea-route investigation.', at: '2026-10-09T03:00:00Z' },
  archipelagoClimate: { text: 'My changing-weather investigation.', at: '2026-10-09T04:00:00Z' }
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

async function makeFixture(page: Page, advance: boolean) {
  return page.evaluate(({ advance, preservedNotes }) => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel;
    const founders = model.create(2026, true), world = advance ? model.step(founders) : founders;
    const primer = w.StemLab.evoIslandModel.create(2026);
    if (!model.restore(world)) throw new Error('Cohort observations must use a replay-valid expedition');
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    localStorage.setItem('evoLab.progress.v1', JSON.stringify({ notes: preservedNotes }));
    return { world, primer, names: model.islands.map((island: any) => island.name) };
  }, { advance, preservedNotes: priorNotes });
}

function expectPriorNotes(saved: any) {
  for (const [key, note] of Object.entries(priorNotes)) expect(saved[key]).toEqual(note);
}

async function expectCaptured(region: Locator, a: any[], b: any[], context: 'time' | 'geography' | 'both') {
  await expect(region).toHaveAttribute('data-field-cohort-observation', 'ready');
  await expect(region).toHaveAttribute('data-field-cohort-observation-context', context);
  for (const [side, population] of [['A', a], ['B', b]] as const) {
    const cohort = region.locator('[data-field-cohort-observation-side="' + side + '"]');
    await expect(cohort.locator('[data-field-cohort-observation-total]')).toHaveAttribute('data-field-cohort-observation-total', String(population.length));
    expect(Number(await cohort.locator('[data-field-cohort-observation-mean]').getAttribute('data-field-cohort-observation-mean'))).toBeCloseTo(mean(population), 12);
  }
  await expect(region.getByRole('textbox', { name: noteLabel, exact: true })).toHaveAttribute('maxlength', '2000');
  expect(Number(await region.locator('[data-field-cohort-observation-difference]').getAttribute('data-field-cohort-observation-difference'))).toBeCloseTo((mean(b) - mean(a)) * 100, 12);
  await expect(region.locator('[aria-live], [role="status"]')).toHaveCount(0);
}

function expectEvidence(text: string, fixture: any, a: any[], b: any[], aGeneration: number, aIsland: number, bGeneration: number, bIsland: number, context: string) {
  expect(text).toContain(comparisonTitle + '\nSeed=' + fixture.world.seed + '; comparison context=' + context + '; species=birds.');
  for (const [side, population, generation, island] of [['A', a, aGeneration, aIsland], ['B', b, bGeneration, bIsland]] as const) {
    expect(text).toContain(side + ': island=' + fixture.names[island] + '; recorded generation=G' + generation + '; census N=' + population.length + '; mean trait (0–1)=' + mean(population) + '; mean trait index (0–100)=' + mean(population) * 100 + '.');
    expect(text).toContain(side + ' census residents (id, trait 0–1)=' + JSON.stringify(population.map(organism => ({ id: organism.id, trait: trait(organism) }))) + '.');
  }
  expect(text).toContain('B minus A mean=' + (mean(b) - mean(a)) * 100 + ' trait index points (0–100 scale).');
  for (let index = 0; index < 5; index++) {
    const inBand = (organism: any) => trait(organism) >= index / 5 && (index === 4 ? trait(organism) <= 1 : trait(organism) < (index + 1) / 5);
    const aCount = a.filter(inBand).length, bCount = b.filter(inBand).length, aShare = aCount / a.length, bShare = bCount / b.length;
    expect(text).toContain('Band [' + index * 20 + ', ' + (index + 1) * 20 + (index === 4 ? ']' : ')') + ': A count=' + aCount + '/' + a.length + '; A share=' + aShare + '; B count=' + bCount + '/' + b.length + '; B share=' + bShare + '; B minus A share=' + (bShare - aShare) * 100 + ' percentage points.');
  }
}

async function expectEvidenceTable(region: Locator, a: any[], b: any[]) {
  const rows = region.locator('[data-field-cohort-observation-band]');
  await expect(rows).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const inBand = (organism: any) => trait(organism) >= index / 5 && (index === 4 ? trait(organism) <= 1 : trait(organism) < (index + 1) / 5);
    const aCount = a.filter(inBand).length, bCount = b.filter(inBand).length;
    const row = region.locator('tr[data-field-cohort-observation-band="' + index + '"]');
    for (const [side, count, population] of [['A', aCount, a], ['B', bCount, b]] as const) {
      const cell = row.locator('[data-field-cohort-observation-table-side="' + side + '"]');
      await expect(cell).toHaveAttribute('data-field-cohort-observation-count', String(count));
      expect(Number(await cell.getAttribute('data-field-cohort-observation-share'))).toBeCloseTo(count / population.length, 12);
    }
    expect(Number(await row.locator('[data-field-cohort-observation-share-difference]').getAttribute('data-field-cohort-observation-share-difference'))).toBeCloseTo((bCount / b.length - aCount / a.length) * 100, 12);
  }
}

async function enter(page: Page, target: Locator) { await target.focus(); await page.keyboard.press('Enter'); }

test('desktop freezes six founders against 24 offspring, saves full cohort evidence and replaces only its own journal note', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const fixture = await makeFixture(page, true);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer, evoProgress: { notes: priorNotes } } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await modelState(page), originalNotes = await notes(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].createdBy).toBe('page'); expect(contexts[0].renders).toBeGreaterThan(0);
  expectPriorNotes(originalNotes);
  const card = fieldCard(page), captured = observation(card), a = fixture.world.history[0].demes[2].birds, b = fixture.world.history[1].demes[2].birds;
  expect(a).toHaveLength(6); expect(b).toHaveLength(24);
  await expect(captured).toHaveCount(0); await expect(captureButton(card)).toHaveCount(0);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await page.locator('[data-arch-island="2"]').click(); await variationSummary(card).click();
  await pinButton(card).click(); await expect(reference(card)).toHaveAttribute('data-field-cohort-comparison', 'same');
  await expect(captureButton(card)).toHaveCount(0);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('End');
  await expect(reference(card)).toHaveAttribute('data-field-cohort-comparison', 'ready');
  await captureButton(card).click(); await expectCaptured(captured, a, b, 'time');
  await expect(card.locator('#ea-field-cohort-observation-title')).toBeFocused(); await expect(captureButton(card)).toBeDisabled();
  expect(await captured.evaluate(node => !node.closest('details') && !node.closest('[data-field-cohort-comparison]'))).toBe(true);
  await captured.getByText('Show captured cohort evidence', { exact: true }).click();
  await expectEvidenceTable(captured, a, b);
  const exactSummary = captured.getByText('Show exact captured census record', { exact: true });
  await expect(captured.locator('pre')).toBeHidden(); await exactSummary.click();
  const frozenEvidence = await captured.locator('pre').innerText();
  expectEvidence(frozenEvidence, fixture, a, b, 0, 2, 1, 2, 'time');
  await exactSummary.click(); await expect(captured.locator('pre')).toBeHidden();

  // An organism draft and a cohort draft can coexist without sharing a pin or save target.
  await card.locator('#ea-field-resident').selectOption(String(b[0].id));
  await card.getByRole('button', { name: 'Pin this organism for comparison', exact: true }).click();
  await card.locator('#ea-field-resident').selectOption(String(b[1].id));
  await card.getByRole('button', { name: 'Capture this comparison', exact: true }).click();
  const organismCapture = card.getByRole('region', { name: 'Captured comparison', exact: true });
  await expect(organismCapture).toHaveAttribute('data-field-observation-a', String(b[0].id));
  await expect(organismCapture).toHaveAttribute('data-field-observation-b', String(b[1].id));
  await reference(card).getByRole('button', { name: 'Clear cohort reference', exact: true }).click();
  await expect(reference(card)).toHaveCount(0);
  await page.locator('#ea-generation').focus(); await page.keyboard.press('Home');
  await page.locator('[data-arch-island="0"]').click(); await card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await pinButton(card).click(); await page.locator('[data-arch-island="1"]').click();
  await expect(captureButton(card)).toBeDisabled(); await expectCaptured(captured, a, b, 'time');
  await variationSummary(card).click(); await expect(captured).toBeVisible();
  await expect(captured.locator('pre')).toHaveText(frozenEvidence);
  await expectEvidenceTable(captured, a, b);
  const reflection = ('These are whole recorded cohorts with different sizes, so I compare proportions as well as counts. A difference alone does not isolate the evolutionary cause. ').repeat(20).slice(0, 1900) + ' REFLECTION-END-COHORT.';
  await captured.getByRole('textbox', { name: noteLabel, exact: true }).fill(reflection);
  await expect(captured.getByRole('textbox', { name: noteLabel, exact: true })).toHaveValue(reflection);
  await captured.screenshot({ path: report + '/cohort-observation-desktop.png' });
  expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  const previewEvidence = (await captured.locator('pre').textContent())!;
  await captured.getByRole('button', { name: 'Save cohort comparison to field journal', exact: true }).click();
  await expect(captured).toHaveCount(0); await expect(organismCapture).toBeVisible();
  const confirmation = card.locator('[data-field-cohort-observation-saved]');
  await expect(confirmation).toBeFocused(); await expect(confirmation).toHaveJSProperty('tagName', 'P');
  expect(await confirmation.getAttribute('aria-live')).toBeNull(); expect(await confirmation.getAttribute('role')).toBeNull();
  const firstNotes = await notes(page), firstText = firstNotes[comparisonKey].text;
  expect(Object.keys(firstNotes).sort()).toEqual([...Object.keys(priorNotes), comparisonKey].sort()); expectPriorNotes(firstNotes);
  expect(firstText.length).toBeGreaterThan(2000); expect(firstText).toContain(previewEvidence); expect(firstText).toContain(reflection);
  expectEvidence(firstText, fixture, a, b, 0, 2, 1, 2, 'time');
  expect(firstText).toContain('Protocol: Complete censuses of the two selected recorded cohorts, frozen at capture. Every resident is counted once.');
  expect(firstText).toContain('This descriptive comparison does not isolate selection, dispersal, drift or mutation as a cause, establish speciation, or measure genome-wide genetic diversity.');
  expect(await modelState(page)).toEqual(original);
  await card.getByRole('button', { name: 'Open cohort finding in field journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Learning Journal', exact: true }).first()).toBeVisible();
  const firstEntry = page.getByRole('listitem').filter({ has: page.getByText(firstText, { exact: true }) });
  await expect(firstEntry).toBeVisible(); await expect(firstEntry).toContainText(comparisonTitle); await expect(firstEntry.locator('p')).toHaveText(firstText);

  await harness.mount(page, { evoLab: { view: 'journal', archipelago: fixture.world, island: fixture.primer } }, undefined, { expectCanvas: false });
  const reloadedEntry = page.getByRole('listitem').filter({ has: page.getByText(firstText, { exact: true }) });
  await expect(reloadedEntry).toBeVisible(); await expect(reloadedEntry).toContainText(comparisonTitle);
  expect(await notes(page)).toEqual(firstNotes); expect(await modelState(page)).toEqual(original);

  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer } });
  const nextCard = fieldCard(page), nextCapture = observation(nextCard), nextA = fixture.world.history[1].demes[0].birds, nextB = fixture.world.history[1].demes[1].birds;
  await expect(nextCapture).toHaveCount(0); await variationSummary(nextCard).click();
  await pinButton(nextCard).click(); await page.locator('[data-arch-island="1"]').click(); await captureButton(nextCard).click();
  await expectCaptured(nextCapture, nextA, nextB, 'geography');
  const secondReflection = 'This comparison keeps generation fixed and compares two islands. It replaces my latest cohort finding only.';
  await nextCapture.getByRole('textbox', { name: noteLabel, exact: true }).fill(secondReflection);
  await nextCapture.getByText('Show captured cohort evidence', { exact: true }).click();
  await expectEvidenceTable(nextCapture, nextA, nextB);
  await nextCapture.getByText('Show exact captured census record', { exact: true }).click();
  const secondEvidence = await nextCapture.locator('pre').innerText();
  await nextCapture.getByText('Show exact captured census record', { exact: true }).click();
  await nextCapture.getByRole('button', { name: 'Save cohort comparison to field journal', exact: true }).click();
  const secondNotes = await notes(page);
  expect(Object.keys(secondNotes).sort()).toEqual(Object.keys(firstNotes).sort()); expectPriorNotes(secondNotes);
  expect(secondNotes[comparisonKey].text).not.toBe(firstText); expect(secondNotes[comparisonKey].text).not.toContain('REFLECTION-END-COHORT.');
  expect(secondNotes[comparisonKey].text).toContain(secondEvidence); expect(secondNotes[comparisonKey].text).toContain(secondReflection);
  expectEvidence(secondNotes[comparisonKey].text, fixture, nextA, nextB, 1, 0, 1, 1, 'geography');
  expect(await modelState(page)).toEqual(original); expect(errors).toEqual([]);
});

test('phone captures geographic evidence by keyboard without WebGL, restores cancel focus and clears drafts for a new expedition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const fixture = await makeFixture(page, false);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: fixture.world, island: fixture.primer, evoProgress: { notes: priorNotes } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await modelState(page), originalNotes = await notes(page), card = fieldCard(page), captured = observation(card);
  const a = fixture.world.history[0].demes[2].birds, b = fixture.world.history[0].demes[0].birds;
  expect(a).toHaveLength(6); expect(b).toHaveLength(24);
  await enter(page, page.locator('[data-arch-island="2"]')); await enter(page, variationSummary(card));
  await enter(page, pinButton(card)); await enter(page, page.locator('[data-arch-island="0"]'));
  await expect(captureButton(card)).toHaveJSProperty('tagName', 'BUTTON'); await expect(captureButton(card)).toHaveAttribute('type', 'button');
  await enter(page, captureButton(card)); await expectCaptured(captured, a, b, 'geography');
  await expect(card.locator('#ea-field-cohort-observation-title')).toBeFocused(); await expect(captureButton(card)).toBeDisabled();
  const textbox = captured.getByRole('textbox', { name: noteLabel, exact: true });
  const reflection = 'The two recorded bird cohorts differ in size. I need proportions and a controlled investigation before attributing differences to a cause.';
  await textbox.focus(); await page.keyboard.insertText(reflection); await expect(textbox).toHaveValue(reflection);
  await enter(page, captured.getByText('Show captured cohort evidence', { exact: true }));
  await expectEvidenceTable(captured, a, b);
  await expect(captured.locator('pre')).toBeHidden();
  await enter(page, captured.getByText('Show exact captured census record', { exact: true }));
  expectEvidence(await captured.locator('pre').innerText(), fixture, a, b, 0, 2, 0, 0, 'geography');
  await enter(page, captured.getByText('Show exact captured census record', { exact: true }));
  await expect(captured.locator('pre')).toBeHidden();
  for (const name of ['Save cohort comparison to field journal', 'Cancel cohort observation']) {
    await expect(captured.getByRole('button', { name, exact: true })).toHaveAttribute('type', 'button');
  }
  expect(await captured.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await captured.screenshot({ path: report + '/cohort-observation-phone.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]); expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);
  await enter(page, captured.getByRole('button', { name: 'Cancel cohort observation', exact: true }));
  await expect(captured).toHaveCount(0); await expect(captureButton(card)).toBeFocused();
  expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);

  // Cancel remains reachable when its original reference has been cleared and details closed.
  await enter(page, captureButton(card)); await expectCaptured(captured, a, b, 'geography');
  await enter(page, reference(card).getByRole('button', { name: 'Clear cohort reference', exact: true }));
  await enter(page, card.getByRole('button', { name: 'Browse Shellseed plants', exact: true }));
  await enter(page, variationSummary(card)); await expect(captured).toBeVisible();
  await expectCaptured(captured, a, b, 'geography');
  await enter(page, captured.getByRole('button', { name: 'Cancel cohort observation', exact: true }));
  await expect(captured).toHaveCount(0); await expect(variationSummary(card)).toBeFocused();
  expect(await modelState(page)).toEqual(original); expect(await notes(page)).toEqual(originalNotes);

  await enter(page, variationSummary(card)); await enter(page, card.getByRole('button', { name: 'Browse Seedwing birds', exact: true }));
  await enter(page, pinButton(card)); await enter(page, page.locator('[data-arch-island="2"]')); await enter(page, captureButton(card));
  await expectCaptured(captured, b, a, 'geography');
  const expectedRestart = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoArchipelagoModel.create(((window as any).__toolData.evoLab.archipelago.seed + 1) >>> 0)));
  await enter(page, page.getByText('Start a different expedition', { exact: true }));
  await enter(page, page.getByRole('button', { name: 'New seed · full founding populations', exact: true }));
  await expect(captured).toHaveCount(0); await expect(reference(card)).toHaveCount(0); await expect(card).toHaveAttribute('data-arch-field-card', '');
  const restarted = await modelState(page);
  expect(restarted.world).toBe(expectedRestart); expect(restarted.archipelagoCache).toBe(expectedRestart);
  expect(restarted.primer).toBe(original.primer); expect(restarted.primerCache).toBe(original.primerCache); expect(await notes(page)).toEqual(originalNotes);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
