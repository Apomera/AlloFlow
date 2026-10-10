import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0, mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const card = (page: Page) => page.getByRole('region', { name: 'Island field card', exact: true });
const story = (page: Page) => page.locator('.ea-story');
const lottery = (page: Page) => story(page).getByRole('region', { name: 'Inspect the parent lottery', exact: true });
const enter = async (page: Page, target: Locator) => { await target.focus(); await page.keyboard.press('Enter'); };
const copyLinks = (page: Page) => lottery(page).locator('[data-story-parent-child]');

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function fixture(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.StemLab.evoArchipelagoModel;
    let world = model.create(2026, true);
    for (let generation = 0; generation < 3; generation++) world = model.step(world);
    if (!model.restore(world)) throw new Error('Parent evidence requires a replay-valid expedition');
    const primer = w.StemLab.evoIslandModel.create(2026);
    localStorage.setItem('evoLab.archipelago.v1', JSON.stringify(world));
    localStorage.setItem('evoLab.island.v1', JSON.stringify(primer));
    return { world, primer, birds: model.story(world, 3, 2, 'birds'), plants: model.story(world, 3, 2, 'plants'), expectedNext: JSON.stringify(model.step(world)) };
  });
}

async function savedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.evoLab;
    return { world: JSON.stringify(data.archipelago), rng: data.archipelago.rng, settings: JSON.stringify(data.archipelago.settings), primer: JSON.stringify(data.island), archipelagoCache: localStorage.getItem('evoLab.archipelago.v1'), primerCache: localStorage.getItem('evoLab.island.v1'), journal: localStorage.getItem('evoLab.progress.v1'), study: localStorage.getItem('evoLab.archipelago.study.v1') };
  });
}

function transmissions(trace: any, parent: any) {
  return trace.newborns.flatMap((child: any) => child.copies.flatMap((copy: any, slot: number) => copy.parent === parent.id ? [{ child, copy, slot }] : []));
}

async function expectParent(page: Page, trace: any, parent: any) {
  const panel = lottery(page), selected = panel.locator('[data-story-parent]'), expected = parent.expectedShare * trace.newborns.length * 2;
  await expect(panel.locator('#ea-story-parent')).toHaveValue(String(parent.id));
  await expect(selected).toHaveAttribute('data-story-parent', String(parent.id));
  await expect(selected).toHaveAttribute('data-parent-recorded', String(parent.gametes));
  expect(Number(await selected.getAttribute('data-parent-expected'))).toBeCloseTo(expected, 12);
  expect(Number(await selected.getAttribute('data-parent-difference'))).toBeCloseTo(parent.gametes - expected, 12);
  const links = transmissions(trace, parent);
  expect(links).toHaveLength(parent.gametes);
  await expect(copyLinks(page)).toHaveCount(links.length);
  for (const link of links) await expect(panel.locator('[data-story-parent-child="' + link.child.id + '"][data-story-parent-slot="' + link.slot + '"]')).toHaveAttribute('type', 'button');
  if (!links.length) await expect(panel).toContainText('That does not mean it died, or that its trait has no breeding advantage.');
  return links;
}

async function expectLinkedCopy(page: Page, link: any) {
  const panel = story(page), row = panel.locator('[data-story-copy="' + link.slot + '"]');
  await expect(panel.locator('[data-story-stage][aria-pressed="true"]')).toHaveAttribute('data-story-stage', 'newborns');
  await expect(panel).toHaveAttribute('data-story-lens', 'trait');
  await expect(panel.locator('.ea-copy-trail')).toHaveJSProperty('open', true);
  await expect(panel.locator('#ea-story-child')).toHaveValue(String(link.child.id));
  await expect(panel.locator('#ea-story-child')).toBeFocused();
  await expect(panel.locator('[data-parent-lottery-link="true"]')).toHaveCount(1);
  await expect(row).toHaveAttribute('data-parent-lottery-link', 'true');
  await expect(row).toContainText('Copy from selected parent');
  expect(await row.evaluate(node => {
    const badge = node.querySelector('.ea-parent-copy-badge')!.getBoundingClientRect();
    const name = node.querySelector('strong')!.getBoundingClientRect();
    return name.top >= badge.bottom;
  })).toBe(true);
  await expect(row).toHaveAttribute('data-copy-parent', String(link.copy.parent));
  await expect(row).toHaveAttribute('data-copy-from', String(link.copy.from));
  await expect(row).toHaveAttribute('data-copy-marker', String(link.copy.marker));
  expect(Number(await row.getAttribute('data-copy-before'))).toBeCloseTo(link.copy.traitBeforeMutation, 12);
  expect(Number(await row.getAttribute('data-copy-after'))).toBeCloseTo(link.copy.traitAfterMutation, 12);
}

test('desktop follows actual parent lottery contributions for both species and returns to frozen cohort evidence without changing evolution', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const data = await fixture(page);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world, island: data.primer } });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'ready');
  const original = await savedState(page), contexts = (await harness.glContexts(page)).filter(context => context.connected && !context.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].renders).toBeGreaterThan(0);
  const field = card(page), variation = field.getByRole('region', { name: 'Displayed cohort variation', exact: true });
  await page.locator('[data-arch-island="2"]').click();
  await field.getByRole('button', { name: 'Browse Shellseed plants', exact: true }).click();
  await field.locator('summary').filter({ hasText: /^Explore variation in this cohort$/ }).click();
  await field.locator('#ea-field-generation').focus(); await page.keyboard.press('Home');
  await field.getByRole('button', { name: 'Pin displayed cohort as reference', exact: true }).click();
  await field.locator('#ea-field-generation').focus(); await page.keyboard.press('End');
  await field.getByRole('button', { name: 'Capture cohort comparison', exact: true }).click();
  const captured = field.getByRole('region', { name: 'Captured cohort comparison', exact: true }), frozen = (await captured.locator('pre').textContent())!;
  const reflection = 'The parent lottery describes one recorded breeding round. Fractional expectations are averages, while actual contributions are whole copies.';
  await captured.getByRole('textbox').fill(reflection);
  const selected = data.world.history[3].demes[2].plants[11], pinned = data.world.history[3].demes[2].plants[7];
  await field.locator('#ea-field-resident').selectOption(String(pinned.id));
  await field.getByRole('button', { name: 'Pin this organism for comparison', exact: true }).click();
  await field.locator('#ea-field-resident').selectOption(String(selected.id));
  await field.getByRole('button', { name: 'Trace this recorded round', exact: true }).click();
  for (const species of ['birds', 'plants'] as const) {
    const trace = data[species];
    await story(page).locator('#ea-story-species').selectOption(species);
    await story(page).locator('[data-story-stage="parents"]').click();
    await expect(lottery(page).locator('#ea-story-parent')).toHaveValue('');
    expect(await lottery(page).locator('#ea-story-parent option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean))).toEqual(trace.parents.map((parent: any) => String(parent.id)));
    const zero = trace.parents.find((parent: any) => !parent.gametes), positive = trace.parents.find((parent: any) => parent.gametes > 1);
    expect(zero).toBeTruthy(); expect(positive).toBeTruthy();
    await lottery(page).locator('#ea-story-parent').selectOption(String(zero.id)); await expectParent(page, trace, zero);
    await lottery(page).locator('#ea-story-parent').selectOption(String(positive.id));
    const links = await expectParent(page, trace, positive), link = links.find((item: any) => item.slot === 1) || links[links.length - 1];
    if (species === 'plants') await story(page).screenshot({ path: report + '/parent-lottery-desktop.png' });
    await lottery(page).locator('[data-story-parent-child="' + link.child.id + '"][data-story-parent-slot="' + link.slot + '"]').click();
    await expectLinkedCopy(page, link);
    const other = trace.newborns.find((child: any) => child.id !== link.child.id);
    await story(page).locator('#ea-story-child').selectOption(String(other.id));
    await expect(story(page).locator('[data-parent-lottery-link="true"]')).toHaveCount(0);
  }
  await story(page).getByRole('button', { name: 'Return to field card', exact: true }).click();
  await expect(field.getByRole('button', { name: 'Trace this recorded round', exact: true })).toBeFocused();
  await expect(field.locator('#ea-field-generation')).toHaveValue('3');
  await expect(variation).toHaveAttribute('data-field-variation-species', 'plants');
  await expect(variation).toHaveAttribute('data-field-variation-island', '2');
  await expect(field.locator('#ea-field-resident')).toHaveValue(String(selected.id));
  await expect(field.locator('[data-field-reference]')).toHaveAttribute('data-field-reference', String(pinned.id));
  await expect(field.getByRole('region', { name: 'Pinned cohort comparison', exact: true })).toHaveAttribute('data-field-cohort-reference-generation', '0');
  await expect(captured.locator('pre')).toHaveText(frozen); await expect(captured.getByRole('textbox')).toHaveValue(reflection);
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost).map(context => context.id)).toEqual(contexts.map(context => context.id));
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  const advanced = await savedState(page);
  expect(advanced.world).toBe(data.expectedNext); expect(advanced.archipelagoCache).toBe(data.expectedNext);
  expect(advanced.primer).toBe(original.primer); expect(advanced.journal).toBe(original.journal); expect(advanced.study).toBe(original.study);
  expect(errors).toEqual([]);
});

test('phone keyboard users inspect zero and positive contributors and follow an exact copy without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { const getContext = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (getContext as any).call(this, type, ...args); } as any; });
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const data = await fixture(page);
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: data.world, island: data.primer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const original = await savedState(page), trace = data.birds;
  await enter(page, page.locator('[data-arch-island="2"]'));
  await enter(page, story(page).locator('[data-story-stage="parents"]'));
  const selector = lottery(page).getByLabel('Choose a potential parent', { exact: true });
  await expect(selector).toHaveJSProperty('tagName', 'SELECT'); await expect(selector).toHaveValue('');
  await selector.focus(); await page.keyboard.press('End');
  await expectParent(page, trace, trace.parents[trace.parents.length - 1]);
  const zeroButton = lottery(page).getByRole('button', { name: 'Find a parent with no offspring', exact: true });
  const positiveButton = lottery(page).getByRole('button', { name: 'Find a parent with offspring', exact: true });
  const zeroParents = trace.parents.filter((parent: any) => !parent.gametes), positiveParents = trace.parents.filter((parent: any) => parent.gametes > 0);
  expect(zeroParents.length).toBeGreaterThan(0); expect(positiveParents.length).toBeGreaterThan(1);
  await expect(zeroButton).toHaveAttribute('type', 'button'); await expect(positiveButton).toHaveAttribute('type', 'button');
  await expect(zeroButton).toBeEnabled(); await enter(page, zeroButton);
  const zeroId = Number(await selector.inputValue());
  await expectParent(page, trace, zeroParents.find((parent: any) => parent.id === zeroId));
  await enter(page, positiveButton);
  const firstPositiveId = Number(await selector.inputValue());
  await expectParent(page, trace, positiveParents.find((parent: any) => parent.id === firstPositiveId));
  await page.keyboard.press('Enter');
  const nextPositiveId = Number(await selector.inputValue()); expect(nextPositiveId).not.toBe(firstPositiveId);
  const positive = positiveParents.find((parent: any) => parent.id === nextPositiveId), links = await expectParent(page, trace, positive), link = links[links.length - 1];
  expect(await lottery(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await enter(page, lottery(page).locator('[data-story-parent-child="' + link.child.id + '"][data-story-parent-slot="' + link.slot + '"]'));
  await expectLinkedCopy(page, link);
  expect(await story(page).evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await story(page).screenshot({ path: report + '/parent-lottery-phone.png' });
  await enter(page, story(page).locator('[data-story-stage="parents"]'));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-arch-field-card], .ea-story', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((result: any) => result.violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }))));
  expect(violations).toEqual([]);
  await enter(page, zeroButton); await expect(story(page).locator('[data-parent-lottery-link="true"]')).toHaveCount(0);
  await selector.focus(); await page.keyboard.press('Home'); await expect(selector).toHaveValue('');
  await expect(lottery(page).locator('[data-story-parent]')).toHaveCount(0);
  await story(page).locator('#ea-story-species').selectOption('plants');
  await expect(lottery(page).locator('#ea-story-parent')).toHaveValue('');
  expect(await savedState(page)).toEqual(original);
  expect((await harness.glContexts(page)).filter(context => context.connected && !context.lost)).toHaveLength(0);
  expect(errors).toEqual([]);
});
