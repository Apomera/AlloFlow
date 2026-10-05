import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const setRange = async (page: any, selector: string, value: number) => page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function fixture(page: any, fallback = false) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: !fallback });
  const data = await page.evaluate(() => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let world = m.create(21);
    world.settings.migration = .4; world.settings.mutation = .03;
    for (let i = 0; i < 3; i++) world = m.step(world);
    const migrant = world.history[3].round.migrants.find((p: any) => p.species === 'birds' && p.gametes > 0);
    return { world, migrant, islandNames: m.islands.map((i: any) => i.name) };
  });
  expect(data.migrant).toBeTruthy();
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world } }, undefined, { expectCanvas: !fallback });
  await page.locator('[data-arch-island="' + data.migrant.to + '"]').click();
  return data;
}

async function verifyEvidence(panel: any, evidence: any, off = false) {
  await expect(panel).toHaveAttribute('data-partner-evidence', String(evidence.generation));
  await expect(panel).toHaveAttribute('data-partner-island', String(evidence.island));
  await expect(panel).toHaveAttribute('data-partner-rule', off ? 'off' : 'recorded');
  for (const row of evidence.rows) {
    const card = panel.locator('[data-partner-species="' + row.species + '"]');
    expect(Number(await card.locator('[data-partner-expected]').getAttribute('data-partner-expected'))).toBe(off ? row.withoutPartnersExpected : row.expected);
    expect(Number(await card.locator('[data-partner-difference]').getAttribute('data-partner-difference'))).toBe(row.partnerDifference);
    expect(Number(await card.locator('[data-partner-inherited]').getAttribute('data-partner-inherited'))).toBe(row.inheritedMean);
    expect(Number(await card.locator('[data-partner-newborn]').getAttribute('data-partner-newborn'))).toBe(row.offspring.mean);
    const dots = await card.locator('[data-partner-point]').evaluateAll((els: Element[]) => els.map(el => ({
      id: el.getAttribute('data-partner-point'), cx: Number(el.querySelector('circle:last-child')!.getAttribute('cx')),
    })));
    expect(dots).toEqual(row.members.map((member: any) => ({ id: row.species + ':' + member.id, cx: 26 + 348 * member.trait })));
    const id = Number(await card.locator('[data-partner-parent]').getAttribute('data-partner-parent'));
    const selected = row.members.find((p: any) => p.id === id);
    expect(selected).toBeTruthy();
    expect(Number(await card.locator('[data-partner-share]').getAttribute('data-partner-share'))).toBe(off ? selected.withoutPartnersShare : selected.expectedShare);
    await expect(card).toContainText(selected.gametes + '/' + row.offspring.size * 2 + ' copies');
  }
}

async function downloadComparison(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download partner comparison', exact: true }).click();
  const downloaded = await pending;
  return JSON.parse(readFileSync((await downloaded.path())!, 'utf8'));
}

test('recorded partner pools distinguish expected inheritance from newborns, inspect actual migrant parents and export replayable main and private evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const data = await fixture(page);
  const microscope = page.locator('.ea-partner-microscope:has(#ea-main-partners-title)');
  const panel = microscope.locator('section[data-partner-evidence]');
  await microscope.getByText('Inspect how partners shaped this round', { exact: true }).click();
  const evidence = await page.evaluate(({ world, island }) => (window as any).StemLab.evoArchipelagoModel.partnerEvidence(world, 3, island), { world: data.world, island: data.migrant.to });
  await verifyEvidence(panel, evidence);
  await expect(panel).toContainText('two distinct parents');
  await expect(panel).toContainText('Two changing trait means alone do not establish coevolution');
  await expect(panel).toContainText('not survival probabilities');

  const birds = panel.locator('[data-partner-species=birds]');
  await birds.locator('#ea-main-partners-birds-parent').selectOption(String(data.migrant.id));
  await expect(birds.locator('[data-partner-parent]')).toHaveAttribute('data-partner-parent', String(data.migrant.id));
  const fixedOutcomes = await panel.locator('[data-partner-inherited], [data-partner-newborn]').evaluateAll((els: Element[]) => els.map(el => el.textContent));
  await panel.locator('[data-partner-rule-button=off]').click();
  await verifyEvidence(panel, evidence, true);
  expect(await panel.locator('[data-partner-inherited], [data-partner-newborn]').evaluateAll((els: Element[]) => els.map(el => el.textContent))).toEqual(fixedOutcomes);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);

  await birds.getByRole('button', { name: 'Meet this parent and its offspring', exact: true }).click();
  const inspector = page.locator('[data-arch-inspector]');
  await expect(inspector).toHaveAttribute('data-arch-inspector', String(data.migrant.id));
  await expect(inspector).toBeFocused();
  await expect(inspector).toContainText('Born G2 · ' + data.islandNames[data.migrant.from]);
  await expect(inspector).toContainText(data.migrant.gametes + ' gametes passed to actual offspring');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G3');
  await expect(panel).toHaveAttribute('data-partner-island', String(data.migrant.to));

  await page.locator('#ea-explanation').fill('My expedition explanation stays separate from this partner calculation.');
  await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const existingNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  const explanation = 'Partner weighting changes conditional copy shares; the realized newborn mean also contains parent sampling and mutation.';
  await panel.locator('#ea-main-partners-note').fill(explanation);
  await panel.getByRole('button', { name: 'Save partner comparison to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.archipelagoEvidence.text).toBe(existingNote);
  expect(notes.archipelagoPartnerEvidence.text).toContain(explanation);
  expect(notes.archipelagoPartnerEvidence.text).toContain('active calculation=off');
  for (const row of evidence.rows) expect(notes.archipelagoPartnerEvidence.text).toContain('recorded expected trait=' + row.expected);
  const exported = await downloadComparison(page, panel);
  expect(exported.format).toBe('evolab-partner-evidence');
  expect(exported.evidence).toEqual(evidence);
  expect(exported.research).toBeNull();
  expect(exported.reflection).toBe(explanation);
  expect(exported.view.rule).toBe('off');
  expect(exported.view.members.find((m: any) => m.species === 'birds').id).toBe(data.migrant.id);
  const replay = await page.evaluate(raw => {
    const m = (window as any).StemLab.evoArchipelagoModel, world = m.restoreCheckpoint(raw.source);
    return { world, evidence: m.partnerEvidence(world, raw.generation, raw.island) };
  }, exported);
  expect(replay.world).toEqual(data.world); expect(replay.evidence).toEqual(evidence);
  await microscope.screenshot({ path: report + '/partner-microscope-desktop.png' });

  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world } });
  await page.locator('[data-arch-island="' + data.migrant.to + '"]').click();
  await microscope.getByText('Inspect how partners shaped this round', { exact: true }).click();
  await verifyEvidence(panel, evidence, true);
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue(explanation);
  await expect(birds.locator('#ea-main-partners-birds-parent')).toHaveValue(String(data.migrant.id));

  const study = page.locator('[data-arch-research]');
  await study.locator('#ea-research-count').selectOption('8');
  await study.getByRole('button', { name: 'Run study from present generation', exact: true }).click();
  await expect(study).toHaveAttribute('data-arch-research', 'complete');
  await study.locator('#ea-research-trial').selectOption({ value: '2' });
  await study.locator('#ea-research-condition').selectOption('11');
  await setRange(page, '#ea-research-generation', 1);
  const privateMicroscope = study.locator('.ea-partner-microscope:has(#ea-private-partners-title)');
  const privatePanel = privateMicroscope.locator('section[data-partner-evidence]');
  await privateMicroscope.getByText('Inspect how partners shaped this round', { exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.evoLab.archipelagoResearch);
  const privateExpected = await page.evaluate(({ raw, island }) => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(raw.source), plan = m.researchPlan(source, raw.options), branch = m.researchBranch(source, plan, 2, '11');
    return { plan, evidence: m.partnerEvidence(branch, plan.start + 1, island) };
  }, { raw: saved, island: data.migrant.to });
  await verifyEvidence(privatePanel, privateExpected.evidence);
  await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-trial', '2');
  await expect(study.locator('[data-research-trial]')).toHaveAttribute('data-research-condition', '11');
  await expect(privatePanel).toContainText('Private trial 3');
  await privatePanel.locator('[data-partner-rule-button=off]').click();
  await verifyEvidence(privatePanel, privateExpected.evidence, true);
  const privateExport = await downloadComparison(page, privatePanel);
  expect(privateExport.source).toEqual(saved.source);
  expect(privateExport.research).toEqual({ plan: privateExpected.plan, trial: 2, condition: '11' });
  expect(privateExport.evidence).toEqual(privateExpected.evidence);
  const replayedPrivate = await page.evaluate(raw => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(raw.source), r = raw.research, branch = m.researchBranch(source, r.plan, r.trial, r.condition);
    return m.partnerEvidence(branch, raw.generation, raw.island);
  }, privateExport);
  expect(replayedPrivate).toEqual(privateExpected.evidence);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);

  const privateExplanation = 'This note belongs to trial 3 with connections and reciprocal effects at G4.';
  await privatePanel.locator('#ea-private-partners-note').fill(privateExplanation);
  await study.locator('#ea-research-condition').selectOption('10');
  await expect(privatePanel).toHaveAttribute('data-partner-rule', 'recorded');
  await expect(privatePanel.locator('#ea-private-partners-note')).toHaveValue('');
  await privatePanel.locator('#ea-private-partners-note').fill('Connections remain open, but this private condition has partner effects off.');
  await study.locator('#ea-research-condition').selectOption('11');
  await verifyEvidence(privatePanel, privateExpected.evidence, true);
  await expect(privatePanel.locator('#ea-private-partners-note')).toHaveValue(privateExplanation);

  await page.getByLabel('Reciprocal trait selection', { exact: true }).uncheck();
  await page.getByLabel('Trait-dependent breeding weights', { exact: true }).uncheck();
  await setRange(page, '#ea-rain-' + data.migrant.to, .95);
  await verifyEvidence(panel, evidence, true);
  await expect(panel.locator('[data-partner-recorded-settings]')).toContainText('Reciprocal trait selection: on');
  await setRange(page, '#ea-generation', 1);
  const earlier = await page.evaluate(({ world, island }) => (window as any).StemLab.evoArchipelagoModel.partnerEvidence(world, 1, island), { world: data.world, island: data.migrant.to });
  await verifyEvidence(panel, earlier);
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue('');
  await setRange(page, '#ea-generation', 0);
  await expect(panel).toHaveAttribute('data-partner-evidence', 'unavailable');
  await expect(panel).toContainText('No reproduction round is recorded at G0');
  await expect(panel.locator('[data-partner-species]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await verifyEvidence(panel, evidence, true);
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue(explanation);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(data.world.history); expect(queued.rng).toBe(data.world.rng);
  const expectedNext = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedNext);
  await expect(panel).toContainText('All trait selection was off in this recorded round');
  for (const sp of ['birds', 'plants']) expect(Number(await panel.locator('[data-partner-species=' + sp + '] [data-partner-difference]').getAttribute('data-partner-difference'))).toBe(0);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners choose actual partners with keyboard controls and inspect recorded expectations without WebGL or inaccessible layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const data = await fixture(page, true);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const microscope = page.locator('.ea-partner-microscope:has(#ea-main-partners-title)'), panel = microscope.locator('section[data-partner-evidence]');
  await microscope.getByText('Inspect how partners shaped this round', { exact: true }).focus(); await page.keyboard.press('Enter');
  const evidence = await page.evaluate(({ world, island }) => (window as any).StemLab.evoArchipelagoModel.partnerEvidence(world, 3, island), { world: data.world, island: data.migrant.to });
  await verifyEvidence(panel, evidence);
  const birds = panel.locator('[data-partner-species=birds]'), plants = panel.locator('[data-partner-species=plants]');
  const selected = evidence.rows.find((r: any) => r.species === 'birds').members.slice(-1)[0];
  await birds.locator('[data-partner-point="birds:' + selected.id + '"]').focus(); await page.keyboard.press('Space');
  await expect(birds.locator('#ea-main-partners-birds-parent')).toHaveValue(String(selected.id));
  await expect(birds.locator('[data-partner-point="birds:' + selected.id + '"]')).toHaveAttribute('aria-pressed', 'true');
  await plants.locator('#ea-main-partners-plants-parent').focus(); await page.keyboard.press('End');
  const plant = evidence.rows.find((r: any) => r.species === 'plants').members.slice(-1)[0];
  await expect(plants.locator('[data-partner-parent]')).toHaveAttribute('data-partner-parent', String(plant.id));
  await panel.locator('[data-partner-rule-button=off]').focus(); await page.keyboard.press('Enter');
  await verifyEvidence(panel, evidence, true);
  for (const rule of ['off', 'recorded']) expect(await panel.locator('[data-partner-rule-button=' + rule + ']').evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await panel.locator('[data-partner-rule-button=recorded]').focus(); await page.keyboard.press('Space');
  await verifyEvidence(panel, evidence);
  await microscope.getByText('Inspect how partners shaped this round', { exact: true }).click();
  await microscope.getByText('Inspect how partners shaped this round', { exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(birds.locator('#ea-main-partners-birds-parent')).toHaveValue(String(selected.id));
  const explanation = 'Both species can change, but I must compare reciprocal weighting before claiming coevolution.';
  await panel.locator('#ea-main-partners-note').fill(explanation);
  const otherIsland = (data.migrant.to + 1) % 3;
  await page.locator('[data-arch-island="' + otherIsland + '"]').click();
  await expect(panel).toHaveAttribute('data-partner-island', String(otherIsland));
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue('');
  await expect(panel).toHaveAttribute('data-partner-rule', 'recorded');
  await page.locator('[data-arch-island="' + data.migrant.to + '"]').click();
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue(explanation);
  await expect(birds.locator('#ea-main-partners-birds-parent')).toHaveValue(String(selected.id));
  await expect(plants.locator('#ea-main-partners-plants-parent')).toHaveValue(String(plant.id));
  await setRange(page, '#ea-generation', 1);
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue('');
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await expect(panel.locator('#ea-main-partners-note')).toHaveValue(explanation);
  await verifyEvidence(panel, evidence);
  await panel.getByRole('button', { name: 'Save partner comparison to journal', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(panel.getByRole('status')).toContainText('separate Learning Journal entry');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await microscope.screenshot({ path: report + '/partner-microscope-phone.png' });
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world); expect(errors).toEqual([]);
});
