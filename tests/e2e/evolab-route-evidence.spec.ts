import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const noteId = '#ea-main-routes-note';
const routeId = '#ea-main-routes-route';
const scalarFields = ['probability', 'expected', 'arrivals', 'parents', 'copies', 'total-copies', 'capital-a', 'lowercase-a'];

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
  return data;
}

function routePanel(page: any) {
  return page.locator('section[data-route-evidence]');
}

async function openRoutes(page: any) {
  await page.getByRole('button', { name: 'Investigate sea routes', exact: true }).click();
  const panel = routePanel(page);
  await expect(panel).toBeVisible();
  await expect(page.locator('#ea-main-routes-title')).toBeFocused();
  return panel;
}

async function scalar(card: any, field: string) {
  return card.evaluate((el: Element, attribute: string) => {
    const target = el.hasAttribute(attribute) ? el : el.querySelector('[' + attribute + ']');
    return target ? target.getAttribute(attribute) : null;
  }, 'data-route-' + field);
}

async function verifyEvidence(panel: any, evidence: any) {
  await expect(panel).toHaveAttribute('data-route-evidence', String(evidence.generation));
  await expect(panel).toHaveAttribute('data-route-from', String(evidence.from));
  await expect(panel).toHaveAttribute('data-route-to', String(evidence.to));
  await expect(panel).toHaveAttribute('data-route-recorded', String(evidence.recorded));
  await expect(panel.locator(routeId)).toHaveValue(evidence.from + ':' + evidence.to);
  for (const row of evidence.rows) {
    const card = panel.locator('[data-route-species="' + row.species + '"]');
    await expect(card).toHaveCount(1);
    const expected: Record<string, number> = {
      probability: row.probability, expected: row.expectedCrossings, arrivals: row.arrivals,
      parents: row.reproducingArrivals, copies: row.incomingCopies, 'total-copies': row.totalCopies,
      'capital-a': row.transmittedA, 'lowercase-a': row.transmitteda,
    };
    for (const field of scalarFields) {
      const raw = await scalar(card, field);
      if (evidence.recorded) {
        expect(raw, row.species + ' ' + field).not.toBeNull();
        expect(Number(raw), row.species + ' ' + field).toBe(expected[field]);
      } else {
        expect(raw === null || raw === 'unavailable', row.species + ' G0 ' + field + ' must be unavailable').toBe(true);
      }
    }
    if (evidence.recorded && row.migrants.length) {
      const id = Number(await card.locator('[data-route-migrant]').getAttribute('data-route-migrant'));
      expect(row.migrants.some((p: any) => p.id === id)).toBe(true);
      await expect(card.locator('#ea-main-routes-' + row.species + '-arrival')).toHaveValue(String(id));
    } else {
      await expect(card.locator('[data-route-migrant]')).toHaveCount(0);
    }
  }
  const selectedRoute = panel.locator('.ea-map [data-route-pair="' + evidence.from + ':' + evidence.to + '"]');
  await expect(selectedRoute).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.ea-map [data-route-pair][role=button]')).toHaveCount(6);
}

async function evidenceAt(page: any, world: any, generation: number, from: number, to: number) {
  return page.evaluate(({ w, g, a, b }) => (window as any).StemLab.evoArchipelagoModel.routeEvidence(w, g, a, b), { w: world, g: generation, a: from, b: to });
}

async function verifyCohorts(card: any, evidence: any) {
  const fold = card.locator('.ea-route-cohorts');
  const summary = fold.getByText('Compare the five actual cohorts', { exact: true });
  await summary.click();
  await expect(fold).toHaveJSProperty('open', true);
  const cohorts = [
    ['Source before dispersal', evidence.source],
    ['Actual selected-route arrivals', evidence.migrantCohort],
    ['Destination before dispersal', evidence.destinationBefore],
    ['Destination after all crossings', evidence.destinationPool],
    ['Destination newborns', evidence.destinationAfter],
  ];
  const rows = fold.locator('tbody tr');
  await expect(rows).toHaveCount(cohorts.length);
  for (let i = 0; i < cohorts.length; i++) {
    const [label, stats] = cohorts[i];
    await expect(rows.nth(i).locator('th[scope=row]')).toHaveText(label);
    await expect(rows.nth(i).locator('td')).toHaveText([
      String(stats.size), stats.mean === null ? '—' : (stats.mean * 100).toFixed(2),
      stats.p === null ? '—' : stats.p.toFixed(4), stats.H === null ? '—' : stats.H.toFixed(4),
    ]);
  }
  await summary.click();
  await expect(fold).toHaveJSProperty('open', false);
}

async function downloadEvidence(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download route evidence', exact: true }).click();
  const downloaded = await pending;
  return JSON.parse(readFileSync((await downloaded.path())!, 'utf8'));
}

test('directed sea routes separate expected crossings from actual transmitted copies and preserve recorded evidence while settings are queued', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const data = await fixture(page), from = data.migrant.from, to = data.migrant.to;
  const panel = await openRoutes(page);
  await panel.locator(routeId).selectOption({ value: from + ':' + to });
  const evidence = await evidenceAt(page, data.world, 3, from, to);
  await verifyEvidence(panel, evidence);
  for (const row of evidence.rows) await verifyCohorts(panel.locator('[data-route-species="' + row.species + '"]'), row);
  const round = data.world.history[3].round;
  for (const row of evidence.rows) {
    const realized = round.migrants.filter((p: any) => p.species === row.species && p.from === from && p.to === to);
    expect(row.arrivals).toBe(realized.length);
    expect(row.incomingCopies).toBe(realized.reduce((sum: number, p: any) => sum + p.gametes, 0));
    expect(row.transmittedA + row.transmitteda).toBe(row.incomingCopies);
    expect(row.expectedCrossings).toBe(row.source.size * row.probability);
    expect(row.probability + row.otherProbability + row.stayProbability).toBeCloseTo(1, 14);
  }
  expect(evidence.rows[1].probability).toBeCloseTo(evidence.rows[0].probability * .3, 14);
  const birds = panel.locator('[data-route-species=birds]');
  await birds.locator('#ea-main-routes-birds-arrival').selectOption({ value: String(data.migrant.id) });
  await birds.getByRole('button', { name: 'Meet this migrant and its offspring', exact: true }).click();
  const inspector = page.locator('[data-arch-inspector]');
  await expect(inspector).toHaveAttribute('data-arch-inspector', String(data.migrant.id));
  await expect(inspector).toBeFocused();
  await expect(inspector).toContainText('Born G2 · ' + data.islandNames[from]);
  await expect(inspector).toContainText(data.migrant.gametes + ' gametes passed to actual offspring');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G3');
  await verifyEvidence(panel, evidence);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);

  await page.locator('#ea-explanation').fill('My expedition note remains separate from directed route evidence.');
  await page.getByRole('button', { name: 'Save island evidence to journal', exact: true }).click();
  const existingNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoEvidence.text);
  const explanation = 'Distance changes the chance of crossing; the realized arrivals and their inherited marker copies vary in this recorded round.';
  await panel.locator(noteId).fill(explanation);
  await page.locator('[data-arch-island="' + from + '"]').click();
  await expect(page.locator('[data-arch-island="' + from + '"]')).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'Inspect partner effects at the destination', exact: true }).click();
  await expect(page.locator('[data-arch-island="' + to + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-arch-island="' + from + '"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#ea-main-partners-title')).toBeFocused();
  const partnerFold = page.locator('.ea-partner-microscope:has(#ea-main-partners-title)');
  await expect(partnerFold).toHaveJSProperty('open', true);
  await expect(partnerFold.locator('section[data-partner-evidence]')).toHaveAttribute('data-partner-evidence', '3');
  await expect(partnerFold.locator('section[data-partner-evidence]')).toHaveAttribute('data-partner-island', String(to));
  await expect(page.locator('[data-arch-generation]')).toHaveText('G3');
  await verifyEvidence(panel, evidence);
  await expect(panel.locator(noteId)).toHaveValue(explanation);
  await expect(birds.locator('#ea-main-routes-birds-arrival')).toHaveValue(String(data.migrant.id));
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(data.world);
  await panel.getByRole('button', { name: 'Save route evidence to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.archipelagoEvidence.text).toBe(existingNote);
  expect(notes.archipelagoRouteEvidence.text).toContain(explanation);
  const exported = await downloadEvidence(page, panel);
  expect(exported.format).toBe('evolab-route-evidence');
  expect(exported.generation).toBe(3); expect(exported.from).toBe(from); expect(exported.to).toBe(to);
  expect(exported.evidence).toEqual(evidence); expect(exported.reflection).toBe(explanation);
  expect(exported.view.members.find((p: any) => p.species === 'birds').id).toBe(data.migrant.id);
  expect(exported.protocol).toBeTruthy(); expect(exported.limits).toBeTruthy();
  const replay = await page.evaluate(raw => {
    const m = (window as any).StemLab.evoArchipelagoModel, world = m.restoreCheckpoint(raw.source);
    return { world, evidence: m.routeEvidence(world, raw.generation, raw.from, raw.to) };
  }, exported);
  expect(replay.world).toEqual(data.world); expect(replay.evidence).toEqual(evidence);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/route-evidence-desktop.png' });

  const reverse = await evidenceAt(page, data.world, 3, to, from);
  await panel.getByRole('button', { name: 'Reverse this route', exact: true }).focus(); await page.keyboard.press('Enter');
  await verifyEvidence(panel, reverse); await expect(panel.locator(noteId)).toHaveValue('');
  await panel.locator(noteId).fill('The reverse direction uses a different source cohort and realized migrants.');
  await panel.locator('.ea-map [data-route-pair="' + from + ':' + to + '"]').focus(); await page.keyboard.press('Space');
  await verifyEvidence(panel, evidence); await expect(panel.locator(noteId)).toHaveValue(explanation);
  await expect(birds.locator('#ea-main-routes-birds-arrival')).toHaveValue(String(data.migrant.id));

  await setRange(page, '#ea-migration', 0);
  await setRange(page, '#ea-rain-' + to, .95);
  await verifyEvidence(panel, evidence); await expect(panel.locator(noteId)).toHaveValue(explanation);
  const queuedExport = await downloadEvidence(page, panel);
  expect(queuedExport.evidence).toEqual(evidence); expect(queuedExport.evidence.settings.migration).toBe(.4);
  await setRange(page, '#ea-generation', 1);
  await verifyEvidence(panel, await evidenceAt(page, data.world, 1, from, to));
  await expect(panel.locator(noteId)).toHaveValue('');
  await setRange(page, '#ea-generation', 0);
  await verifyEvidence(panel, await evidenceAt(page, data.world, 0, from, to));
  await panel.getByRole('button', { name: 'Visit the first recorded round', exact: true }).click();
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await verifyEvidence(panel, evidence); await expect(panel.locator(noteId)).toHaveValue(explanation);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(data.world.history); expect(queued.rng).toBe(data.world.rng); expect(queued.settings.migration).toBe(0);
  const expectedNext = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedNext);
  const nextEvidence = await evidenceAt(page, expectedNext, 4, from, to);
  await verifyEvidence(panel, nextEvidence);
  for (const row of nextEvidence.rows) expect([row.probability, row.expectedCrossings, row.arrivals, row.incomingCopies]).toEqual([0, 0, 0, 0]);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners record a first round, explore six directions by keyboard, and retain scoped evidence without WebGL or inaccessible layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const founding = await page.evaluate(() => (window as any).StemLab.evoArchipelagoModel.create(21));
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: founding } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const summary = page.locator('summary').filter({ hasText: /^Explore island geography$/ });
  await summary.focus(); await page.keyboard.press('Enter');
  const panel = routePanel(page);
  await panel.locator(routeId).selectOption({ value: '0:2' });
  await verifyEvidence(panel, await evidenceAt(page, founding, 0, 0, 2));
  const expectedFirst = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), founding);
  await panel.getByRole('button', { name: 'Record the first dispersal round', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-arch-generation]')).toHaveText('G1');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedFirst);
  await verifyEvidence(panel, await evidenceAt(page, expectedFirst, 1, 0, 2));
  for (const pair of ['0:1', '1:0', '1:2', '2:1', '2:0', '0:2']) {
    await panel.locator('.ea-map [data-route-pair="' + pair + '"]').focus(); await page.keyboard.press('Enter');
    const [from, to] = pair.split(':').map(Number);
    await verifyEvidence(panel, await evidenceAt(page, expectedFirst, 1, from, to));
  }
  const explanation = 'A long route can have no arrivals in one round even when the crossing probability is positive.';
  await panel.locator(noteId).fill(explanation);
  await panel.getByRole('button', { name: 'Reverse this route', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(panel.locator(noteId)).toHaveValue('');
  await panel.locator(noteId).fill('This note belongs to Mist to Ember.');
  await panel.locator(routeId).selectOption({ value: '0:2' });
  await expect(panel.locator(noteId)).toHaveValue(explanation);
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(panel).not.toBeVisible();
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(panel.locator(noteId)).toHaveValue(explanation);
  await panel.getByRole('button', { name: 'Save route evidence to journal', exact: true }).focus(); await page.keyboard.press('Enter');
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoRouteEvidence.text);
  expect(note).toContain(explanation);
  for (const button of ['Reverse this route', 'Save route evidence to journal', 'Download route evidence']) {
    expect(await panel.getByRole('button', { name: button, exact: true }).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/route-evidence-phone.png' });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: expectedFirst } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await openRoutes(page);
  await panel.locator(routeId).selectOption({ value: '0:2' });
  await expect(panel.locator(noteId)).toHaveValue(explanation);
  await verifyEvidence(panel, await evidenceAt(page, expectedFirst, 1, 0, 2));
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(expectedFirst);
  expect((await harness.glContexts(page)).filter(c => c.connected && !c.lost)).toHaveLength(0); expect(errors).toEqual([]);
});
