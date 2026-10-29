import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/dissection-flashcard-handoff', { recursive: true }); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
const note = 'Observed a moist surface along the back.';
const draft = 'My recall: the skin protects the body and helps with gas exchange.';
async function mount(page: Page, width: number, patch = {}) {
  await page.setViewportSize({ width, height: 950 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
    flashcardMode: true, reducedMotion: true, soundEnabled: false,
    exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': note }, organConfidence: { 'frog|dorsal_skin': 2 },
    revealedLayers: { skin: true }, quizScore: 1, quizTotal: 2, ...patch,
  } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications,
      layers: d.revealedLayers, scores: [d.quizScore, d.quizTotal], frames: d.visualEvidence };
  });
}

for (const width of [390, 1440]) {
  test(`recall, inspect, and resume without losing practice at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width);
    const before = await evidence(page);
    const cards = page.locator('[data-dissection-flashcards]');
    await cards.getByRole('textbox', { name: 'My recall draft (optional)', exact: true }).fill(draft);
    await cards.getByRole('button', { name: /^Reveal function/ }).click();
    await cards.getByRole('button', { name: 'Review again', exact: true }).click();
    await cards.getByRole('textbox', { name: 'My recall draft (optional)', exact: true }).fill('A second card draft.');
    await cards.getByRole('button', { name: 'Previous flashcard', exact: true }).click();
    const practice = await page.evaluate(() => (window as any).__ctx.toolData.dissection._flashcardPractice);
    await cards.locator('[data-flashcard-handoff="find"]').click();
    await expect(cards).toHaveCount(0);
    const pause = page.locator('[data-flashcard-resume]');
    await expect(pause).toContainText('Dorsal Skin');
    await expect(page.locator('#diss-organ-search')).toBeFocused();
    await expect(page.locator('#diss-organ-search')).toHaveValue('Dorsal Skin');
    expect(await evidence(page)).toEqual(before);
    await pause.screenshot({ path: `reports/dissection-flashcard-handoff/paused-${width}.png` });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-flashcard-resume]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(audit).toEqual([]);
    await page.locator('#diss-organ-dorsal_skin').click();
    await expect(page.locator('#diss-note-dorsal_skin')).toHaveValue(note);
    await pause.locator('[data-flashcard-resume-action]').focus(); await page.keyboard.press('Enter');
    await expect(cards.locator('#diss-flashcard-prompt')).toBeFocused();
    await expect(cards.locator('#diss-flashcard-draft')).toHaveValue(draft);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._flashcardPractice)).toEqual(practice);
    expect(await evidence(page)).toEqual(before);
    await cards.locator('[data-flashcard-handoff="record"]').click();
    await expect(page.locator('#diss-note-dorsal_skin')).toBeFocused();
    await expect(page.locator('#diss-note-dorsal_skin')).toHaveValue(note);
    await page.locator('#diss-note-dorsal_skin').fill(note + ' I compared its position with the reference.');
    await pause.locator('[data-flashcard-resume-action]').click();
    await expect(cards.locator('#diss-flashcard-draft')).toHaveValue(draft);
    expect((await evidence(page)).notes['frog|dorsal_skin']).not.toBe(draft);
    await cards.screenshot({ path: `reports/dissection-flashcard-handoff/resumed-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('uninspected flashcards cannot open an evidence record or grant inspection through navigation', async ({ page }) => {
  await mount(page, 390, { exploredOrgans: {}, organNotes: {}, organConfidence: {} });
  const before = await evidence(page);
  await expect(page.locator('[data-flashcard-handoff="record"]')).toHaveCount(0);
  await page.locator('[data-flashcard-handoff="find"]').click();
  expect(await evidence(page)).toEqual(before);
  await expect(page.locator('[data-dissection-selection]')).toHaveCount(0);
  await page.locator('[data-flashcard-end]').click();
  await expect(page.locator('[data-flashcard-resume]')).toHaveCount(0);
  expect(await evidence(page)).toEqual(before);
});
