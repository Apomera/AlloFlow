import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const desktopHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 1280,
  height: 1500,
  appStyles: true,
  extraScripts: [
    'vendor/three-r128/OrbitControls.js',
    'vendor/three-r128/GLTFLoader.js',
  ],
});

const mobileHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 390,
  height: 1800,
  appStyles: true,
  extraScripts: [
    'vendor/three-r128/OrbitControls.js',
    'vendor/three-r128/GLTFLoader.js',
  ],
});

const toolState = (extra: Record<string, unknown> = {}) => ({
  anatomy: {
    _activeTab: 'explore',
    system: 'skeletal',
    view: 'anterior',
    complexity: 3,
    selectedStructure: 'femur',
    ...extra,
  },
});

test.describe.configure({ timeout: 150_000 });
test.beforeAll(async () => {
  await desktopHarness.start();
  await mobileHarness.start();
});
test.afterAll(async () => {
  await desktopHarness.stop();
  await mobileHarness.stop();
});

test('model Focus mode enlarges the atlas and restores every surrounding panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await desktopHarness.mount(page, toolState(), undefined, { expectCanvas: false });

  const root = page.locator('[data-anatomy-tool="true"]');
  const frame = page.locator('[data-anatomy-canvas-frame="true"]');
  const sidePanel = page.locator('[data-anatomy-panel="explore"]');
  const focus = page.locator('[data-anatomy-model-focus-toggle="true"]');
  const before = await frame.boundingBox();

  const dashboard = page.locator('[data-anatomy-study-dashboard="true"]');
  await expect(dashboard).not.toHaveAttribute('open', '');
  await dashboard.locator('summary').click();
  await expect(dashboard).toHaveAttribute('open', '');
  await expect(dashboard.locator('.anatomy-metric')).toHaveCount(6);
  await dashboard.locator('summary').click();
  await expect(dashboard).not.toHaveAttribute('open', '');

  const tabStrip = page.locator('[data-anatomy-tab-strip="true"]');
  const tabLayout = await tabStrip.evaluate((node) => ({
    wrap: getComputedStyle(node).flexWrap,
    overflowX: getComputedStyle(node).overflowX,
    scrollWidth: (node as HTMLElement).scrollWidth,
    clientWidth: (node as HTMLElement).clientWidth,
  }));
  expect(tabLayout.wrap).toBe('nowrap');
  expect(tabLayout.overflowX).toBe('auto');
  expect(tabLayout.scrollWidth).toBeGreaterThanOrEqual(tabLayout.clientWidth);
  await page.locator('#anatomy-mode-tab-explore').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#anatomy-mode-tab-homeoHunt')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-anatomy-panel="homeoHunt"]')).toHaveAttribute('aria-labelledby', 'anatomy-mode-tab-homeoHunt');
  const railBounds = await tabStrip.boundingBox();
  const activeBounds = await page.locator('#anatomy-mode-tab-homeoHunt').boundingBox();
  expect(railBounds).not.toBeNull();
  expect(activeBounds).not.toBeNull();
  expect(activeBounds!.x).toBeGreaterThanOrEqual(railBounds!.x - 1);
  expect(activeBounds!.x + activeBounds!.width).toBeLessThanOrEqual(railBounds!.x + railBounds!.width + 1);
  await page.locator('#anatomy-mode-tab-explore').click();

  await focus.click();
  await expect(root).toHaveAttribute('data-anatomy-model-focus', 'true');
  await expect(focus).toHaveText('Exit focus');
  await expect(sidePanel).toBeHidden();

  const after = await frame.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThan(before!.width + 70);
  expect((await page.locator('[data-anatomy-model-shell="true"]').screenshot()).length)
    .toBeGreaterThan(18_000);

  await focus.click();
  await expect(root).toHaveAttribute('data-anatomy-model-focus', 'false');
  await expect(focus).toHaveText('Focus model');
  await expect(sidePanel).toBeVisible();
});

test('mobile Clinical Atlas keeps controls touch-sized and switches kidney to heart cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(
    page,
    toolState({
      system: 'organs',
      view: 'posterior',
      selectedStructure: 'kidneys',
      _bodyView3d: true,
      _body3dStyle: 'clinical',
      _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3',
    }),
    `document.querySelector('[data-anatomy-3d-state="ready-model"]')`,
  );

  const topbarButtons = page.locator('.anatomy-topbar button');
  expect(await topbarButtons.count()).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < await topbarButtons.count(); index += 1) {
    const box = await topbarButtons.nth(index).boundingBox();
    expect(box, `topbar button ${index} has no layout box`).not.toBeNull();
    expect(box!.height, `topbar button ${index} is not touch-sized`).toBeGreaterThanOrEqual(43.5);
  }

  const packSelect = page.locator('[data-anatomy-clinical-pack-switcher="true"] select');
  await expect(packSelect).toBeVisible();
  expect((await packSelect.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

  await packSelect.selectOption('hra-heart-female-v1.3');
  await page.waitForSelector('[data-anatomy-atlas-pack="hra-heart-female-v1.3"][data-anatomy-3d-state="ready-model"]');
  await expect(page.locator('[data-anatomy-clinical-pack="hra-heart-female-v1.3"]')).toBeVisible();

  const conceptSearch = page.locator('[data-anatomy-clinical-concept-search="true"]');
  await expect(conceptSearch).toBeVisible();
  expect((await conceptSearch.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await conceptSearch.fill('valve');
  await expect(page.locator('[data-anatomy-clinical-concept-results="true"]')).toContainText('5 of 17 matches');
  await expect(page.locator('[data-anatomy-clinical-concept-scroll="true"] [data-anatomy-clinical-concept]')).toHaveCount(6);
  await expect(page.locator('[data-anatomy-clinical-visual-key="true"]')).toBeVisible();
  await expect(page.locator('.anatomy-marker-legend')).toHaveCount(0);
  await expect(page.locator('[data-anatomy-circulatory-flow-legend="true"]')).toHaveCount(0);
  await conceptSearch.fill('');
  await expect(page.locator('[data-anatomy-clinical-concept-results="true"]')).toContainText('17 available');

  const concepts = page.locator('.anatomy-clinical-concept-grid');
  const overflow = await concepts.evaluate((node) => ({
    client: (node as HTMLElement).clientHeight,
    scroll: (node as HTMLElement).scrollHeight,
  }));
  expect(overflow.scroll).toBeGreaterThan(overflow.client);

  const horizontalLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll('body *')).map((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return { tag: node.tagName, className: (node as HTMLElement).className || '', left: rect.left, right: rect.right, width: rect.width };
    }).filter((item) => item.right > window.innerWidth + 2 || item.left < -2).slice(0, 12),
  }));
  expect(horizontalLayout.pageWidth, `mobile Anatomy overflow: ${JSON.stringify(horizontalLayout.offenders)}`)
    .toBeLessThanOrEqual(horizontalLayout.viewport + 2);
  expect((await page.locator('[data-anatomy-model-shell="true"]').screenshot()).length)
    .toBeGreaterThan(18_000);
});

test('structure list hands focus to detail and Back restores the same visible option', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await desktopHarness.mount(
    page,
    toolState({ selectedStructure: null }),
    undefined,
    { expectCanvas: false },
  );

  const firstOption = page.locator('[data-anatomy-structure-option]').first();
  await expect(firstOption).toBeVisible();
  const structureId = await firstOption.getAttribute('data-anatomy-structure-option');
  expect(structureId, 'first structure option is missing its stable ID').toBeTruthy();
  if (!structureId) throw new Error('First structure option has no stable ID');

  await firstOption.focus();
  await expect(firstOption).toBeFocused();
  await firstOption.click();

  const detail = page.locator(`[data-anatomy-structure-detail="${structureId}"]`);
  const detailHeading = page.locator('[data-anatomy-structure-detail-heading="true"]');
  await expect(detail).toBeVisible();
  await expect(detailHeading).toBeFocused();

  await detail.getByRole('button', { name: /Back to structures from/i }).click();

  const restoredOption = page.locator(`[data-anatomy-structure-option="${structureId}"]`);
  await expect(restoredOption).toBeFocused();
  await expect(restoredOption).toBeVisible();
  await expect(restoredOption).toBeInViewport();
});

test('search exposes every match, scrolls keyboard selection, and keeps dismissal predictable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await desktopHarness.mount(page, toolState(), undefined, { expectCanvas: false });
  const search = page.getByRole('combobox', { name: 'Search anatomical structures across all systems' });
  await search.fill('a');
  const results = page.getByRole('listbox', { name: 'Anatomy search results' });
  await expect(results.getByRole('option')).toHaveCount(12);
  await page.getByRole('button', { name: 'Show all matches', exact: true }).click();
  await expect(search).toBeFocused();
  expect(await results.getByRole('option').count()).toBeGreaterThan(12);
  const pageY = await page.evaluate(() => window.scrollY);
  for (let index = 0; index < 14; index++) await search.press('ArrowDown');
  const activeId = await search.getAttribute('aria-activedescendant');
  const listBox = await results.boundingBox();
  const optionBox = await page.locator('#' + activeId).boundingBox();
  expect(optionBox!.y).toBeGreaterThanOrEqual(listBox!.y - 1);
  expect(optionBox!.y + optionBox!.height).toBeLessThanOrEqual(listBox!.y + listBox!.height + 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  await search.press('Escape');
  await expect(results).toHaveCount(0);
  await expect(search).toHaveValue('a');
  await expect(search).not.toHaveAttribute('aria-activedescendant');
  await search.press('ArrowDown');
  await expect(results).toBeVisible();
  await search.press('Tab');
  await expect(results).toHaveCount(0);
  await search.fill('no-such-anatomy-xyz');
  await expect(page.locator('#anatomy-global-search-status')).toContainText('No matching structures');
  await page.getByRole('button', { name: 'Clear anatomy search' }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await search.fill('collarbone');
  await search.press('Enter');
  await expect(page.locator('[data-anatomy-panel="explore"]')).toContainText('Clavicle');
  await expect(search).toHaveValue('');
});

test('mobile search wraps long clinical results inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(page, toolState(), undefined, { expectCanvas: false });
  const search = page.getByRole('combobox', { name: 'Search anatomical structures across all systems' });
  await search.fill('heart');
  const popup = page.locator('.anatomy-global-search-popup');
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  for (const option of await popup.getByRole('option').all()) {
    const box = await option.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
  }
  await page.screenshot({ path: '.tmp/anatomy-search-mobile.png' });
});

test('Clinical Atlas keyboard navigation keeps order stable and scrolls only the list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await desktopHarness.mount(page, toolState({
    system: 'circulatory', selectedStructure: 'heart', _bodyView3d: true,
    _body3dStyle: 'clinical', _clinicalAtlasPackId: 'hra-heart-female-v1.3',
    _clinicalAtlasConceptId: 'UBERON:0002084',
  }), `document.querySelector('[data-anatomy-3d-state="ready-model"]')`);
  const list = page.locator('[data-anatomy-clinical-concept-scroll]');
  const options = list.locator('[data-anatomy-clinical-concept]');
  const ids = await options.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-anatomy-clinical-concept')));
  const selected = page.locator('[data-anatomy-clinical-selected-concept]');
  await expect(list.locator('[tabindex="0"]')).toHaveCount(1);
  await options.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(options.nth(3)).toBeFocused();
  await expect(selected).toHaveAttribute('data-anatomy-clinical-selected-concept', 'UBERON:0002084');
  const pageY = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('End');
  await expect(options.last()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(selected).toHaveAttribute('data-anatomy-clinical-selected-concept', ids[ids.length - 1]!);
  expect(await options.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-anatomy-clinical-concept')))).toEqual(ids);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  const bounds = await list.boundingBox();
  const lastBounds = await options.last().boundingBox();
  expect(lastBounds!.y).toBeGreaterThanOrEqual(bounds!.y);
  expect(lastBounds!.y + lastBounds!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show selected in list', exact: true })).toBeFocused();
  await list.evaluate((node) => { node.scrollTop = 0; });
  await page.getByRole('button', { name: 'Show selected in list', exact: true }).click();
  await expect(options.last()).toBeFocused();
  expect(await list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Whole organ', exact: true }).click();
  await expect(selected).toHaveAttribute('data-anatomy-clinical-selected-concept', 'UBERON:0000948');
  await expect(list.locator('[data-anatomy-clinical-concept="UBERON:0000948"]')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Whole organ', exact: true })).toBeDisabled();
});

test('phone Clinical Atlas search enters matching results and preserves focus on selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(page, toolState({
    system: 'circulatory', selectedStructure: 'heart', _bodyView3d: true,
    _body3dStyle: 'clinical', _clinicalAtlasPackId: 'hra-heart-female-v1.3',
    _clinicalAtlasConceptId: 'UBERON:0002084',
  }), `document.querySelector('[data-anatomy-3d-state="ready-model"]')`);
  const search = page.getByRole('searchbox', { name: 'Search Clinical Atlas concepts' });
  const list = page.locator('[data-anatomy-clinical-concept-scroll]');
  const options = list.locator('[data-anatomy-clinical-concept]');
  await search.fill('valve');
  await expect(options).toHaveCount(6);
  const firstMatch = options.nth(1);
  const secondMatchId = await options.nth(2).getAttribute('data-anatomy-clinical-concept');
  await search.press('ArrowDown');
  await expect(firstMatch).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(2)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(options).toHaveCount(5);
  const activated = list.locator(`[data-anatomy-clinical-concept="${secondMatchId}"]`);
  await expect(activated).toBeFocused();
  await expect(activated).toHaveAttribute('aria-pressed', 'true');
  await expect(search).toHaveValue('valve');
  await expect(list.locator('[tabindex="0"]')).toHaveCount(1);
  for (const action of await page.locator('.anatomy-clinical-selection-actions button').all()) {
    const box = await action.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('button', { name: 'Whole organ', exact: true }).click();
  await expect(search).toHaveValue('valve');
  await expect(options).toHaveCount(6);
  await expect(options.first()).toHaveAttribute('data-anatomy-clinical-concept', 'UBERON:0000948');
  await expect(options.first()).toBeFocused();
  await page.locator('[data-anatomy-clinical-structure-list]').screenshot({ path: '.tmp/anatomy-clinical-navigation-mobile.png' });
});

test('phone flashcard review round stays stable, resumes, and refreshes to an empty deck', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(page, toolState({
    _activeTab: 'flashcards', selectedStructure: null,
    _structureConfidence: { ribs: 'practice', skull: 'mastered', femur: 'mastered' },
    _confidenceAt: { ribs: Date.now(), skull: Date.now() - 10 * 86400000, femur: Date.now() },
  }), undefined, { expectCanvas: false });
  const cards = page.locator('[data-anatomy-flashcards]');
  const deck = page.getByRole('group', { name: 'Flashcard deck', exact: true });
  await deck.getByRole('button', { name: 'Due for review (2)', exact: true }).click();
  await expect(cards).toHaveAttribute('data-anatomy-flashcards', 'review');
  await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText('1/2');
  await cards.getByRole('button', { name: 'Reveal function', exact: true }).click();
  await cards.getByRole('button', { name: 'OK Got it', exact: true }).click();
  await expect(cards.locator('[data-anatomy-round-rated]')).toContainText('1 / 2');
  await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText('1/2');
  await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
  await expect(cards.locator('#anatomy-flashcard-content')).toContainText('Skull (Cranium)');
  await page.locator('#anatomy-mode-tab-explore').click();
  await page.locator('#anatomy-mode-tab-flashcards').click();
  await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText('2/2');
  await expect(cards.locator('[data-anatomy-round-rated]')).toContainText('1 / 2');
  await cards.getByRole('button', { name: 'Reveal function', exact: true }).click();
  await cards.getByRole('button', { name: 'OK Got it', exact: true }).click();
  await expect(cards.locator('[data-anatomy-round-rated]')).toContainText('Round complete');
  await deck.getByRole('button', { name: 'Refresh round', exact: true }).click();
  await expect(cards).toContainText('No cards are due for review');
  await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText('0/0');
  await expect(cards.getByRole('button', { name: 'Next flashcard', exact: true })).toHaveCount(0);
  await deck.getByRole('button', { name: 'All structures', exact: true }).click();
  await expect(cards.locator('[data-anatomy-round-rated]')).toContainText('0 / 23');
  for (const button of await page.locator('.anatomy-flashcard-deck-controls button, .anatomy-flashcard-navigation button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
});

test('flashcard keyboard shortcuts preserve focus and skip rated cards', async ({ page }) => {
  await desktopHarness.mount(page, toolState({
    _activeTab: 'flashcards', selectedStructure: null,
    _structureConfidence: { ribs: 'practice', skull: 'mastered', femur: 'mastered' },
    _confidenceAt: { ribs: Date.now(), skull: Date.now() - 10 * 86400000, femur: Date.now() },
  }), undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Due for review (2)', exact: true }).click();
  const card = page.locator('[data-anatomy-recall-card]');
  const rated = page.locator('[data-anatomy-round-rated]');
  await card.focus();
  await page.keyboard.press('3');
  await expect(rated).toHaveAttribute('data-anatomy-round-rated', '0');
  await page.keyboard.press('Space');
  await expect(card.getByRole('button', { name: 'Show structure name', exact: true })).toBeVisible();
  await page.keyboard.press('3');
  await expect(rated).toHaveAttribute('data-anatomy-round-rated', '1');
  await page.keyboard.press('ArrowRight');
  await expect(card).toBeFocused();
  await expect(card).toHaveAttribute('data-anatomy-recall-card', 'skull');
  await expect(card.getByRole('button', { name: 'Reveal function', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(card).toHaveAttribute('data-anatomy-recall-card', 'ribs');
  await page.getByRole('button', { name: 'Next unrated', exact: true }).click();
  await expect(card).toHaveAttribute('data-anatomy-recall-card', 'skull');
  const reveal = card.getByRole('button', { name: 'Reveal function', exact: true });
  await reveal.focus();
  await page.keyboard.press('Space');
  await expect(card.getByRole('button', { name: 'Show structure name', exact: true })).toBeFocused();
  await card.focus();
  await page.keyboard.press('3');
  await expect(rated).toContainText('Round complete');
  await expect(page.getByRole('button', { name: 'Next unrated', exact: true })).toBeDisabled();
});
for (const phone of [false, true]) {
  test(`${phone ? 'phone' : 'desktop'} flashcard context changes keep the diagram aligned`, async ({ page }) => {
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 1000 });
    await (phone ? mobileHarness : desktopHarness).mount(page, toolState({
      _activeTab: 'flashcards', _structureConfidence: { scapula: 'practice' },
    }), undefined, { expectCanvas: false });
    const card = page.locator('[data-anatomy-recall-card]');
    const cards = page.locator('[data-anatomy-flashcards]');
    await page.getByRole('button', { name: 'Due for review (1)', exact: true }).click();
    await expect(card).toHaveAttribute('data-anatomy-recall-card', 'scapula');
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    await cards.getByRole('button', { name: '~ Learning', exact: true }).click();
    // Simulate exploring a different structure without altering the study card.
    await page.evaluate(() => {
      (window as any).__ctx.update('anatomy', 'selectedStructure', 'femur');
      (window as any).__ctx.update('anatomy', 'view', 'anterior');
    });
    const locate = card.getByRole('button', { name: 'Locate this card', exact: true });
    await locate.click();
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.selectedStructure)).toBe('scapula');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.view)).toBe('posterior');
    await expect(card.getByRole('button', { name: 'Show structure name', exact: true })).toBeVisible();
    await expect(cards.locator('[data-anatomy-round-rated]')).toHaveAttribute('data-anatomy-round-rated', '1');
    const box = await locate.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(phone ? 390 : 1280);
    await page.getByRole('button', { name: 'All structures', exact: true }).click();
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    if (phone) await page.getByRole('combobox', { name: 'Learning level', exact: true }).selectOption('1');
    else await page.getByRole('button', { name: 'K–5', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Reveal function', exact: true })).toBeVisible();
    await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText(/^1\//);
    if (phone) await page.getByRole('combobox', { name: 'Body system', exact: true }).selectOption('respiratory');
    else await page.getByRole('group', { name: 'Body system', exact: true }).getByRole('button', { name: /^Respiratory\./ }).click();
    const currentId = await card.getAttribute('data-anatomy-recall-card');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.selectedStructure)).toBe(currentId);
    await expect(cards.locator('[aria-label="Flashcard progress"]')).toHaveText(/^1\//);
    await expect(card.getByRole('button', { name: 'Reveal function', exact: true })).toBeVisible();
  });
}
for (const phone of [false, true]) {
  test(`${phone ? 'phone' : 'desktop'} flashcard notes stay editable and follow the structure`, async ({ page }) => {
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 1000 });
    await (phone ? mobileHarness : desktopHarness).mount(page, toolState({
      _activeTab: 'flashcards', _structureConfidence: { ribs: 'practice', skull: 'mastered' }, _confidenceAt: { skull: Date.now() - 10 * 86400000 },
    }), undefined, { expectCanvas: false });
    await page.getByRole('button', { name: 'Due for review (2)', exact: true }).click();
    const card = page.locator('[data-anatomy-recall-card]');
    const note = page.locator('[data-anatomy-note-context="flashcard"] textarea');
    const noteDisclosure = page.locator('[data-anatomy-flashcard-note]');
    const noteSummary = noteDisclosure.locator('summary');
    const help = page.locator('[data-anatomy-card-help]');
    const helpSummary = help.locator('summary');
    await expect(help).not.toHaveAttribute('open', '');
    await expect(card).toHaveAccessibleDescription(/With the card focused:/);
    await helpSummary.focus(); await helpSummary.press('Enter');
    await expect(help).toHaveAttribute('open', '');
    await expect(help.locator('[data-anatomy-round-help]')).toContainText('Your place is kept');
    await helpSummary.press('Space'); await expect(helpSummary).toBeFocused();
    await expect(help).not.toHaveAttribute('open', '');
    await expect(note).toHaveCount(0);
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    await expect(note).toBeHidden();
    await expect(noteSummary).toContainText('Optional');
    await noteSummary.focus(); await noteSummary.press('Enter');
    await expect(noteDisclosure).toHaveAttribute('open', '');
    expect((await noteSummary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await note.fill('Ribs protect the chest organs.');
    await note.press('End'); await note.pressSequentially(' 123'); await note.press('ArrowLeft');
    await expect(note).toBeFocused();
    await expect(note).toHaveValue('Ribs protect the chest organs. 123');
    await expect(noteSummary).toContainText('Saved note');
    await noteSummary.focus(); await noteSummary.press('Space');
    await expect(note).toBeHidden(); await expect(noteSummary).toBeFocused();
    await noteSummary.press('Enter'); await expect(note).toHaveValue('Ribs protect the chest organs. 123');
    await expect(card).toHaveAttribute('data-anatomy-recall-card', 'ribs');
    await expect(page.locator('[data-anatomy-round-rated]')).toHaveAttribute('data-anatomy-round-rated', '0');
    await expect(page.locator('[data-anatomy-note-context="flashcard"] [role="status"]')).toHaveText('Saved to your study plan');
    const bounds = await note.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(phone ? 390 : 1280);
    await page.locator('#anatomy-mode-tab-explore').click();
    const exploreNote = page.locator('[data-anatomy-note-context="explore"] textarea');
    await expect(exploreNote).toHaveValue('Ribs protect the chest organs. 123');
    await exploreNote.fill('My revised explanation');
    await page.locator('#anatomy-mode-tab-flashcards').click();
    await expect(note).toHaveValue('My revised explanation');
    await page.getByRole('button', { name: '📄 Study sheet', exact: true }).click();
    await expect(page.locator('.anatomy-study-sheet-note')).toContainText('My revised explanation');
    await page.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    await expect(note).toHaveCount(0);
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    await expect(note).toHaveValue('');
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    await expect(note).toHaveValue('My revised explanation');
    await expect(note).toBeHidden();
    await noteSummary.click();
    await note.fill('');
    await expect(page.locator('.anatomy-study-sheet-note')).toHaveCount(0);
    await expect(noteSummary).toContainText('Optional');
    await helpSummary.click();
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-anatomy-tool]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}
test('quiz answer feedback stays on the displayed question through confidence updates and reload', async ({ page }) => {
  await desktopHarness.mount(page, toolState({ _activeTab: 'quiz', selectedStructure: null }), undefined, { expectCanvas: false });
  const panel = page.locator('[data-anatomy-quiz-panel]');
  const prompt = panel.locator('p.bg-slate-50');
  const originalPrompt = await prompt.innerText();
  const optionIds = await panel.locator('[data-anatomy-quiz-option]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-anatomy-quiz-option')));
  await expect.poll(() => page.evaluate(() => !!(window as any).__ctx.toolData.anatomy._quizQuestion)).toBe(true);
  await page.evaluate(() => (window as any).__ctx.update('anatomy', '_structureConfidence', { ribs: 'practice' }));
  await expect(prompt).toHaveText(originalPrompt);
  await panel.locator('[data-anatomy-quiz-option="skull"]').click();
  await expect(prompt).toHaveText(originalPrompt);
  await expect(panel.locator('[role="status"]')).toContainText('Correct! Skull');
  expect(await panel.locator('[data-anatomy-quiz-option]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-anatomy-quiz-option')))).toEqual(optionIds);
  await expect(panel.locator('[data-anatomy-quiz-option]:disabled')).toHaveCount(4);
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.anatomy)));
  expect(saved.quizScore).toBe(1); expect(saved._quizAttempts).toBe(1);
  await desktopHarness.mount(page, { anatomy: saved }, undefined, { expectCanvas: false });
  await expect(prompt).toHaveText(originalPrompt);
  await expect(panel.locator('[role="status"]')).toContainText('Correct! Skull');
  await page.getByRole('button', { name: 'Next Question', exact: true }).click();
  await expect(prompt).not.toHaveText(originalPrompt);
  await expect(panel.locator('[data-anatomy-quiz-option]:disabled')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart quiz', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.quizScore)).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('phone hidden flashcard announcements preserve recall until reveal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mobileHarness.mount(page, toolState({ _activeTab: 'explore', _structureConfidence: { ribs: 'practice' } }), undefined, { expectCanvas: false });
  await page.evaluate(() => {
    (window as any).__anatomyAnnouncements = [];
    (window as any).__ctx.announceToSR = (message: string) => (window as any).__anatomyAnnouncements.push(message);
    (window as any).__rerender();
  });
  await page.locator('#anatomy-mode-tab-flashcards').click();
  const card = page.locator('[data-anatomy-recall-card]');
  const lastAnnouncement = () => page.evaluate(() => (window as any).__anatomyAnnouncements.at(-1));
  await expect.poll(lastAnnouncement).toBe('Flashcard 1 / 23. Ribs (1-12). Answer hidden');
  await card.getByRole('button', { name: 'Locate this card', exact: true }).click();
  await expect.poll(lastAnnouncement).toBe('Flashcard 1 / 23. Ribs (1-12). Answer hidden');
  await page.getByRole('button', { name: 'Next flashcard', exact: true }).click();
  await expect.poll(lastAnnouncement).toBe('Flashcard 2 / 23. Skull (Cranium). Answer hidden');
  await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
  const functionText = await card.locator('#anatomy-flashcard-content p.text-xs').first().innerText();
  await card.getByRole('button', { name: 'Locate this card', exact: true }).click();
  await expect.poll(lastAnnouncement).toContain(functionText);
  await card.getByRole('button', { name: 'Show structure name', exact: true }).click();
  await card.getByRole('button', { name: 'Locate this card', exact: true }).click();
  await expect.poll(lastAnnouncement).toBe('Flashcard 2 / 23. Skull (Cranium). Answer hidden');
});

test('successful quiz recheck removes an overdue item without changing its confidence category', async ({ page }) => {
  const old = Date.now() - 10 * 86400000;
  await desktopHarness.mount(page, toolState({ _activeTab: 'quiz', _structureConfidence: { skull: 'learning' }, _confidenceAt: { skull: old } }), undefined, { expectCanvas: false });
  await page.locator('[data-anatomy-quiz-option="skull"]').click();
  await expect(page.locator('[data-anatomy-quiz-panel] [role="status"]')).toContainText('Correct! Skull');
  const state = await page.evaluate(() => (window as any).__ctx.toolData.anatomy);
  expect(state._structureConfidence.skull).toBe('learning');
  expect(state._confidenceAt.skull).toBeGreaterThan(old + 9 * 86400000);
  await page.locator('#anatomy-mode-tab-flashcards').click();
  await expect(page.getByRole('button', { name: 'Due for review (0)', exact: true })).toBeVisible();
});
for (const mode of ['quiz', 'flashcards']) {
  test(`phone ${mode} compact settings bring the study task forward and preserve controls`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mobileHarness.mount(page, toolState({ _activeTab: mode, selectedStructure: null }), undefined, { expectCanvas: false });
    const controls = page.locator('[data-anatomy-study-controls]');
    const toggle = page.locator('[data-anatomy-study-controls-toggle]');
    const panel = page.locator(mode === 'quiz' ? '[data-anatomy-quiz-panel]' : '[data-anatomy-flashcards]');
    await expect(controls).toBeVisible(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-anatomy-mission]')).toBeHidden();
    await expect(page.locator('[data-anatomy-system-rail]')).toBeHidden();
    await expect(page.locator('[data-anatomy-controls]')).toBeHidden();
    const top = await panel.evaluate(node => node.getBoundingClientRect().top + window.scrollY);
    expect(top).toBeLessThan(600);
    for (const control of await controls.locator('select,button').all()) {
      const box = await control.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await toggle.click(); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-anatomy-mission]')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Search anatomical structures across all systems' })).toBeVisible();
    await toggle.press('Space'); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('combobox', { name: 'Body system', exact: true }).selectOption('respiratory');
    await page.getByRole('combobox', { name: 'Learning level', exact: true }).selectOption('1');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.system)).toBe('respiratory');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.complexity)).toBe(1);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-anatomy-tool]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })));
    expect(violations).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.tmp/anatomy-compact-${mode}-phone.png` });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect(controls).toBeHidden(); await expect(page.locator('[data-anatomy-mission]')).toBeVisible();
    await expect(page.locator('[data-anatomy-controls]')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#anatomy-mode-tab-explore').click();
    await expect(controls).toHaveCount(0); await expect(page.locator('[data-anatomy-mission]')).toBeVisible();
    await expect(page.locator('[data-anatomy-system-rail]')).toBeVisible();
    await expect(page.locator('[data-anatomy-controls]')).toBeVisible();
  });
}

for (const phone of [false, true]) {
  test((phone ? 'phone' : 'desktop') + ' flashcard rounds resume across systems, levels, decks, and saved sessions', async ({ page }) => {
    const harness = phone ? mobileHarness : desktopHarness;
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 1000 });
    await harness.mount(page, toolState({ _activeTab: 'flashcards', _structureConfidence: { ribs: 'practice', skull: 'practice' } }), undefined, { expectCanvas: false });
    const card = page.locator('[data-anatomy-recall-card]');
    const cards = page.locator('[data-anatomy-flashcards]');
    const snapshot = () => page.evaluate(() => {
      const state = (window as any).__ctx.toolData.anatomy;
      return { ids: state._flashcardDeck, index: state._flashcardIdx, rated: state._flashcardRoundRated };
    });
    const system = async (id: string, name: string) => {
      if (phone) await page.getByRole('combobox', { name: 'Body system', exact: true }).selectOption(id);
      else await page.getByRole('group', { name: 'Body system', exact: true }).getByRole('button', { name: new RegExp('^' + name + '\\.') }).click();
    };
    const level = async (value: string, name: string) => {
      if (phone) await page.getByRole('combobox', { name: 'Learning level', exact: true }).selectOption(value);
      else await page.getByRole('button', { name, exact: true }).click();
    };
    await cards.getByRole('button', { name: 'Due for review (2)', exact: true }).click();
    await card.getByRole('button', { name: 'Reveal function', exact: true }).click();
    await cards.getByRole('button', { name: 'OK Got it', exact: true }).click();
    await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    const review = await snapshot();
    await cards.getByRole('button', { name: 'All structures', exact: true }).click();
    await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    const all = await snapshot();
    await level('1', 'K–5');
    await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    await level('3', '9–12+'); expect(await snapshot()).toEqual(all);
    await system('respiratory', 'Respiratory');
    await cards.getByRole('button', { name: 'Next flashcard', exact: true }).click();
    const respiratory = await snapshot();
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.anatomy)));
    await harness.mount(page, { anatomy: saved }, undefined, { expectCanvas: false });
    await system('skeletal', 'Skeletal'); expect(await snapshot()).toEqual(all);
    await cards.getByRole('button', { name: 'Due for review (1)', exact: true }).click();
    expect(await snapshot()).toEqual(review);
    await expect(card.getByRole('button', { name: 'Reveal function', exact: true })).toBeVisible();
    await expect(cards.locator('[data-anatomy-round-rated]')).toHaveAttribute('data-anatomy-round-rated', '1');
    const id = await card.getAttribute('data-anatomy-recall-card');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.anatomy.selectedStructure)).toBe(id);
    await cards.getByRole('button', { name: 'Refresh round', exact: true }).click();
    expect((await snapshot()).ids).toEqual(['ribs']); expect((await snapshot()).rated).toEqual({});
    await cards.getByRole('button', { name: 'All structures', exact: true }).click(); expect(await snapshot()).toEqual(all);
    await system('respiratory', 'Respiratory'); expect(await snapshot()).toEqual(respiratory);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}
