
import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-enhancement-2026-09-08';
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
const state = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'organs', anatomicalView: 'internal', selectedOrgan: 'heart', compareMode: true, reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|heart': true, 'frog|lungs': true } };
test('comparison and note handoff preserve evidence and focus', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const panel = page.locator('#diss-comparison-panel');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-comparison-panel']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  await expect(panel.locator('article')).toHaveCount(5);
  await panel.screenshot({ path: out + '/comparison-desktop.png' });
  await panel.getByRole('button', { name: 'Write comparison in my evidence note' }).click();
  const note = page.locator('#diss-note-heart');
  await expect(note).toBeFocused();
  await note.fill('I observed a central chambered structure between the lungs. The reference describes two circulation routes.');
  await page.getByRole('radio', { name: /Confidence 2 of 3/ }).check();
  await page.locator('[data-note-handoff] button').click();
  await expect(page.locator('#diss-note-lungs')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|heart'])).toContain('central chambered structure');
  expect(await page.evaluate(() => Object.keys((window as any).__ctx.toolData.dissection.exploredOrgans))).toEqual(['frog|heart', 'frog|lungs']);
  await page.locator('[data-selection-reference] summary').click();
  await expect(page.locator('[data-specimen-reference]')).toBeVisible();
  const referenceAudit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-specimen-reference]'], ['[data-reference-relationships]'], ['[data-note-handoff]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(referenceAudit.violations.map((v: any) => v.id)).toEqual([]);
  await page.locator('[data-dissection-selection]').screenshot({ path: out + '/inspector-desktop.png' });
  // Follow an already inspected relationship with the keyboard.
  const relation = page.locator('[data-reference-relationships] button').filter({ hasText: 'Heart' });
  await relation.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#diss-selection-title')).toHaveText('Heart (3-chamber)');
  await expect(page.locator('#diss-selection-title')).toBeFocused();
  expect(errors).toEqual([]);
});
test('comparison cards reflow at phone width and retain complete text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  const panel = page.locator('#diss-comparison-panel');
  await expect(panel.locator('article')).toHaveCount(5);
  // The shared GL harness intentionally fixes its host width; model a responsive app host here.
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const bounds = await panel.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.right).toBeLessThanOrEqual(390);
  const first = await panel.locator('article').nth(0).boundingBox();
  const second = await panel.locator('article').nth(1).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
  await panel.screenshot({ path: out + '/comparison-mobile.png' });
  await panel.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#diss-note-heart')).toBeFocused();
});



test('cross-layer search respects locks and preserves observation progress', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 900 });
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', reducedMotion: true } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Structures and notes', exact: true }).click();
  const search = page.locator('#diss-organ-search');
  await expect(search).toBeFocused();
  await search.fill('heart');
  const target = page.locator('[data-layer-search-result="heart"]');
  await expect(target).toHaveAttribute('data-layer-access', 'locked');
  await expect(target.locator('button')).toHaveCount(0);
  await expect(target).toContainText('Complete the preceding layer');
  await page.locator('[data-dissection-directory]').screenshot({ path: out + '/discovery-locked.png' });
  // Start a separate saved-progress fixture with the required layers completed.
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', reducedMotion: true, organSearch: 'heart', revealedLayers: { skin: true, muscle: true }, exploredOrgans: {} } }, undefined, { expectCanvas: false });
  await page.locator('[data-layer-search-result="heart"] button').click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Heart (3-chamber)');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).toBe('organs');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.exploredOrgans)).toEqual({});
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBeNull();
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(page.locator('#diss-directory-results > button')).toHaveCount(12);
  await page.getByRole('button', { name: 'Go to specimen', exact: true }).click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
});

test('phone directory filters and clear action are accessible and retain notes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: { ...state, compareMode: false, selectedOrgan: null, organNotes: { 'frog|heart': 'The heart sits between the lungs.' }, organConfidence: { 'frog|heart': 2 } } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const notesFilter = page.locator('[data-directory-filter="needs-record"]');
  await notesFilter.focus();
  await page.keyboard.press('Enter');
  await expect(notesFilter).toBeFocused();
  await expect(notesFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#diss-directory-results > button')).toHaveCount(1);
  await expect(page.locator('#diss-organ-lungs')).toBeVisible();
  const search = page.locator('#diss-organ-search');
  await search.fill('heart');
  await expect(page.locator('.diss-directory-empty')).toContainText('progress filter');
  await page.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
  await expect(search).toBeFocused();
  await expect(page.locator('[data-directory-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|heart'])).toBe('The heart sits between the lungs.');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]'], ['.diss-mission-shortcuts']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => v.id)).toEqual([]);
  const overflow = await page.locator('[data-dissection-directory]').evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('[data-dissection-directory]').screenshot({ path: out + '/discovery-mobile.png' });
  await page.locator('[data-dissection-mission]').screenshot({ path: out + '/workspace-shortcuts-mobile.png' });
});


test('recall practice supports keyboard review rounds without changing evidence or scores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1180, height: 900 });
  const evidence = { 'frog|heart': true };
  const notes = { 'frog|heart': 'Observed between the lungs.' };
  await harness.mount(page, { dissection: { ...state, compareMode: false, toolbarStudyOpen: true, selectedOrgan: 'heart',
    exploredOrgans: evidence, organNotes: notes, organConfidence: { 'frog|heart': 2 },
    verifiedIdentifications: { 'frog|heart': true }, quizScore: 2, quizTotal: 3, quizReviewQueue: ['lungs'] } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Flashcard', exact: true }).click();
  await expect(page.locator('#diss-flashcard-prompt')).toBeFocused();
  await expect(page.locator('[data-dissection-selection]')).toHaveCount(0);
  const panel = page.locator('#diss-flashcard-panel');
  const prompt = panel.locator('#diss-flashcard-prompt');
  const draft = panel.locator('#diss-flashcard-draft');
  await draft.fill('It pumps blood around the body.');
  await panel.locator('.diss-flashcard').focus();
  await page.keyboard.press('Enter');
  await expect(panel.locator('#diss-flashcard-answer')).toBeVisible();
  await panel.getByRole('button', { name: 'Review again', exact: true }).click();
  await expect(prompt).toHaveText('Lungs');
  await expect(prompt).toBeFocused();
  await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  await panel.getByRole('button', { name: 'Previous flashcard' }).click();
  await expect(draft).toHaveValue('It pumps blood around the body.');
  await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  await panel.getByRole('button', { name: 'Next without rating', exact: true }).click();
  await panel.locator('.diss-flashcard').click();
  await panel.getByRole('button', { name: 'Recalled it', exact: true }).click();
  for (let i = 0; i < 9; i++) await panel.getByRole('button', { name: 'Next without rating', exact: true }).click();
  await panel.getByRole('button', { name: 'Finish round without rating', exact: true }).click();
  await expect(panel.locator('#diss-flashcard-summary')).toBeFocused();
  await expect(panel.getByRole('button', { name: 'Review marked cards (1)', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Try unrated cards (10)', exact: true })).toBeVisible();
  await panel.screenshot({ path: out + '/recall-summary-desktop.png' });
  await panel.getByRole('button', { name: 'Review marked cards (1)', exact: true }).click();
  await expect(prompt).toHaveText('Heart (3-chamber)');
  await expect(panel.locator('[data-flashcard-counter]')).toHaveText('1 / 1');
  await expect(draft).toHaveValue('It pumps blood around the body.');
  await panel.locator('.diss-flashcard').click();
  await panel.getByRole('button', { name: 'Recalled it', exact: true }).click();
  await expect(panel.getByRole('button', { name: /Review marked cards/ })).toHaveCount(0);
  await expect(panel.locator('[data-recall-stat="recalled"] dd')).toHaveText('2');
  const actual = await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, queue: d.quizReviewQueue };
  });
  expect(actual).toEqual({ explored: evidence, notes, confidence: { 'frog|heart': 2 }, verified: { 'frog|heart': true }, score: 2, total: 3, queue: ['lungs'] });
  await panel.getByRole('button', { name: 'Return to specimen', exact: true }).click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Flashcard', exact: true }).click();
  await expect(prompt).toBeFocused();
  await expect(draft).toHaveValue('');
  await expect(panel.locator('[data-recall-stat="recalled"] dd')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('phone recall prompt and revealed reference reflow and pass accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: { ...state, compareMode: false, flashcardMode: true, selectedOrgan: null } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const panel = page.locator('#diss-flashcard-panel');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  for (const revealed of [false, true]) {
    if (revealed) await panel.locator('.diss-flashcard').click();
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-flashcard-panel']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    const bounds = await panel.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right }));
    expect(bounds.overflow).toBeLessThanOrEqual(1);
    expect(bounds.right).toBeLessThanOrEqual(390);
    await panel.screenshot({ path: out + (revealed ? '/recall-answer-mobile.png' : '/recall-prompt-mobile.png') });
  }
});

test('changing layers clears recall drafts, self-ratings, and revealed answers', async ({ page }) => {
  await harness.mount(page, { dissection: { ...state, compareMode: false, flashcardMode: true, selectedOrgan: null,
    revealedLayers: { skin: true, muscle: true }, _flashcardPractice: { scope: 'frog|organs', index: 11, revealed: true, drafts: { heart: 'Old draft' }, ratings: { heart: 'again' } } } }, undefined, { expectCanvas: false });
  // Use the ordinary directory route into another available layer.
  await page.getByRole('button', { name: 'Structures and notes', exact: true }).click();
  await page.locator('#diss-organ-search').fill('tympanic');
  await page.locator('[data-layer-search-result="tympanum"] button').click();
  const panel = page.locator('#diss-flashcard-panel');
  await expect(panel.locator('[data-flashcard-counter]')).toContainText('1 /');
  await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  await expect(panel.locator('[data-recall-stat="again"] dd')).toHaveText('0');
  await expect(panel.locator('#diss-flashcard-draft')).toHaveValue('');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._flashcardPractice)).toBeNull();
});


test('spatial guide changes viewpoint with the keyboard while retaining preparation and evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const evidence = { 'frog|heart': true };
  const notes = { 'frog|heart': 'A structure between the lungs.' };
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin',
    anatomicalView: 'dorsal', reducedMotion: true, exploredOrgans: evidence, organNotes: notes, revealedLayers: {}, soundEnabled: false } }, undefined, { expectCanvas: false });
  const guide = page.locator('[data-spatial-guide]');
  await guide.locator('summary').click();
  const internal = guide.locator('[data-spatial-view="internal"]');
  await internal.focus();
  await page.keyboard.press('Enter');
  await expect(internal).toBeFocused();
  await expect(internal).toHaveAttribute('aria-pressed', 'true');
  const actual = await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { view: d.anatomicalView, layer: d.activeLayer, revealed: d.revealedLayers, explored: d.exploredOrgans, notes: d.organNotes, selected: d.selectedOrgan };
  });
  expect(actual).toEqual({ view: 'internal', layer: 'skin', revealed: {}, explored: evidence, notes, selected: null });
  await expect(page.locator('[data-dissection-layer-stepper] button[disabled]').first()).toBeDisabled();
  const recommended = guide.getByRole('button', { name: /Use preparation view:/ });
  await recommended.click();
  await expect(guide.locator('[data-spatial-view="ventral"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(recommended).toBeDisabled();
  await guide.screenshot({ path: out + '/spatial-guide-desktop.png' });
  expect(errors).toEqual([]);
});

test('phone spatial guide supplies mirrored text, responsive controls, and accessible graphics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: { specimen: 'pig', _dissLoadedSpec: 'pig', activeLayer: 'skin',
    anatomicalView: 'ventral', reducedMotion: true, soundEnabled: false } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  const guide = page.locator('[data-spatial-guide]');
  await guide.locator('summary').click();
  await expect(guide.locator('[data-spatial-axis-text]')).toHaveText('CRANIAL at right; CAUDAL at left.');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-spatial-guide]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  const bounds = await guide.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right }));
  expect(bounds.overflow).toBeLessThanOrEqual(1);
  expect(bounds.right).toBeLessThanOrEqual(390);
  await guide.screenshot({ path: out + '/spatial-guide-mobile.png' });
});

