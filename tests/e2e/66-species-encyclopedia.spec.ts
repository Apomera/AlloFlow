/**
 * Species Encyclopedia (Bird Lab + Raptor Lab): the screens a student actually uses.
 *
 * Pinned: the gallery lists and filters species, an entry shows its portrait, size comparison, range map
 * (with a text alternative), seasonal chart and section nav, the Raptor Lab sheet adds the flight numbers,
 * nothing scrolls sideways at phone width, and axe finds no violations in either theme.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const AXE = ['node_modules/axe-core/axe.min.js'];
const bird = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: AXE, width: 1100, height: 900, appStyles: true, layout: 'document' });
const raptor = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', extraScripts: AXE, width: 1100, height: 900, appStyles: true });

test.describe.configure({ timeout: 300_000, mode: 'serial' });
test.beforeAll(async () => { await bird.start(); await raptor.start(); });
test.afterAll(async () => { await bird.stop(); await raptor.stop(); });

async function mountBird(page: Page, data: Record<string, unknown> = {}) {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate((d) => (window as any).__mount({ birdLab: { view: 'encyclopedia', ...d } }), data);
  await page.waitForSelector('.enc-root', { timeout: 30000 });
}
async function mountRaptor(page: Page, data: Record<string, unknown> = {}) {
  await raptor.mount(page, { raptorHunt: { activeSection: 'species20', ...data } }, null, { expectCanvas: false });
  await page.waitForSelector('.enc-root', { timeout: 30000 });
}
const axe = (page: Page) => page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.enc-root'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id + ': ' + v.nodes.length));
// The harness stage is fixed at 1100px, so pin the component to a phone-width column and look for any
// descendant that spills past it (the viewport is 390px wide, so the responsive rules apply).
const overflow = (page: Page) => page.evaluate(() => {
  const root = document.querySelector('.enc-root') as HTMLElement;
  root.style.maxWidth = '390px'; root.style.margin = '0';
  const box = root.getBoundingClientRect();
  let worst = Math.max(0, root.scrollWidth - root.clientWidth);
  // SVG internals are clipped by their own viewport, so only HTML elements and the <svg> roots count.
  root.querySelectorAll('*').forEach((el) => { if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return; const b = (el as HTMLElement).getBoundingClientRect(); if (b.width && b.right - box.right > worst) worst = b.right - box.right; });
  return Math.round(worst);
});

test('bird gallery: lists, filters and searches the species', async ({ page }) => {
  await mountBird(page);
  await expect(page.getByRole('status').filter({ hasText: 'of 177 species' })).toBeVisible();
  expect(await page.locator('.enc-thumb').count()).toBe(24);
  await page.getByRole('button', { name: 'Warblers', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /15 of 15 species/ })).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox').fill('Fratercula');
  await expect(page.locator('.enc-thumb')).toHaveCount(1);
  await expect(page.locator('.enc-thumb')).toContainText('Atlantic Puffin');
  await page.getByRole('searchbox').fill('zzzzzz');
  await expect(page.locator('.enc-empty')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  // Show more reaches every species, and every portrait paints into a real box.
  while (await page.getByRole('button', { name: /Show more/ }).count()) await page.getByRole('button', { name: /Show more/ }).click();
  expect(await page.locator('.enc-thumb').count()).toBe(177);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.enc-thumb svg')].map((s) => { const r = (s as SVGElement).getBoundingClientRect(); return [r.width, r.height]; }));
  for (const [w, h] of boxes) { expect(w).toBeGreaterThan(80); expect(h).toBeGreaterThan(60); }
  expect(await axe(page)).toEqual([]);
});

test('bird entry: portrait, size, range map with a text alternative, seasonal chart, section nav', async ({ page }) => {
  await mountBird(page, { encId: 'cardinal' });
  await expect(page.getByRole('heading', { level: 2, name: 'Northern Cardinal' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Northern Cardinal: stylized field-mark illustration/ })).toBeVisible();
  const map = page.getByRole('img', { name: /Schematic range map for Northern Cardinal/ });
  await expect(map).toBeVisible();
  await expect(page.locator('.enc-zones')).toContainText('Year-round');
  await expect(page.getByRole('list', { name: 'Chance of finding it in Maine, by month' })).toBeVisible();
  expect(await page.locator('.enc-months li').count()).toBe(12);
  await page.getByRole('button', { name: 'Conservation', exact: true }).click();
  await expect(page.locator('#enc-cardinal-status')).toBeFocused();
  expect(await axe(page)).toEqual([]);
  // Previous / next walk the list; All species returns to the gallery.
  await page.getByRole('button', { name: /^Pine Grosbeak/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Pine Grosbeak' })).toBeVisible();
  await page.getByRole('button', { name: '← All species' }).click();
  await expect(page.locator('.enc-thumb').first()).toBeVisible();
});

test('bird spotlight cards show a portrait and link to the entry', async ({ page }) => {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'maineBirds' } }));
  await page.getByRole('button', { name: /Common Loon/ }).click();
  await page.getByRole('button', { name: /Read the full encyclopedia entry/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Common Loon' })).toBeVisible();
});

test('raptor entry: flight numbers, fly button, dark-theme axe', async ({ page }) => {
  await mountRaptor(page, { encId: 'peregrine' });
  await expect(page.getByRole('heading', { level: 2, name: 'Peregrine Falcon' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flight numbers in the simulator' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fly as Peregrine Falcon →' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Schematic range map for Peregrine Falcon/ })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('raptor reference entry says it is not flyable; the gallery covers every group', async ({ page }) => {
  await mountRaptor(page, { encId: 'barnOwl' });
  await expect(page.getByText('Reference entry: this raptor is not one of the flyable species')).toBeVisible();
  await page.getByRole('button', { name: '← All species' }).click();
  while (await page.getByRole('button', { name: /Show more/ }).count()) await page.getByRole('button', { name: /Show more/ }).click();
  expect(await page.locator('.enc-thumb').count()).toBe(41);
  expect(await axe(page)).toEqual([]);
});

test('silhouette quiz: perched profile mode names the bird, reveals the colour portrait and links to the entry', async ({ page }) => {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'silhouetteQuiz' } }));
  await page.getByRole('button', { name: 'Perched profile' }).click();
  await expect(page.getByRole('button', { name: 'Perched profile' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Name the bird from its perched outline/)).toBeVisible();
  await expect(page.getByRole('img', { name: /Silhouette of the bird you are being asked to identify/ })).toBeVisible();
  expect(await page.locator('[data-sil-choice]').count()).toBe(4);
  // Nothing about the answer is on screen before the student chooses.
  await expect(page.getByRole('img', { name: /the same bird with its colours/i })).toHaveCount(0);
  await page.locator('[data-sil-choice]').first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('img', { name: /the same bird with its colours/i })).toBeVisible();
  // The page title is the Bird Lab's existing one (dark text that the host shell lightens), and the harness has no host shell.
  const quizViolations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-sil-mode]'], ['[data-sil-choice]'], ['[role="status"]'], ['svg.bird-plate']] }, { resultTypes: ['violations'] })).violations.map((v: any) => v.id + ': ' + v.nodes.length));
  expect(quizViolations).toEqual([]);
  await page.getByRole('button', { name: /Read the full encyclopedia entry/ }).click();
  await expect(page.locator('.enc-root h2')).toBeVisible();
});

test('silhouette quiz: the in-flight mode is still there and the modes switch both ways', async ({ page }) => {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'silhouetteQuiz' } }));
  await expect(page.getByRole('button', { name: 'In flight' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Perched profile' }).click();
  await page.getByRole('button', { name: 'In flight' }).click();
  await expect(page.getByRole('button', { name: 'Next silhouette →' })).toBeVisible();
  await expect(page.getByText(/20 species\. Score: 0 \/ 0/)).toBeVisible();
});

test('life list: every species shows a portrait and a way into its entry', async ({ page }) => {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'lifeList', blLifeList: { robin: { firstSeen: '2026-10-01T10:00:00Z', lastSeen: '2026-10-02T10:00:00Z', habitats: { forest: 2 } } } } }));
  await expect(page.getByRole('button', { name: /Read the encyclopedia entry for/ })).toHaveCount(20);
  // Every card has a portrait that paints into a real box (it was a 44px icon).
  const boxes = await page.evaluate(() => [...document.querySelectorAll('li svg.bird-plate')].map((s) => { const r = (s as SVGElement).getBoundingClientRect(); return [r.width, r.height]; }));
  expect(boxes.length).toBe(20);
  for (const [w, hh] of boxes) { expect(w).toBeGreaterThan(80); expect(hh).toBeGreaterThan(60); }
  await page.getByRole('button', { name: 'Read the encyclopedia entry for American Robin' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'American Robin' })).toBeVisible();
});

test('raptor field ID: all eight silhouettes at one scale, each jumping to its card', async ({ page }) => {
  await raptor.mount(page, { raptorHunt: { activeSection: 'fieldid' } }, null, { expectCanvas: false });
  await expect(page.getByRole('heading', { name: /Eight shapes, one scale/ })).toBeVisible();
  expect(await page.locator('[data-rh-fid-jump]').count()).toBe(8);
  // 8 in the lineup + 8 on the cards.
  expect(await page.locator('svg[data-rh-sil]').count()).toBe(16);
  const sizes = await page.evaluate(() => [...document.querySelectorAll('[data-rh-fid-jump] svg')].map((s) => (s as SVGElement).getBoundingClientRect().width));
  for (const w of sizes) expect(w).toBeGreaterThan(100);
  await page.locator('[data-rh-fid-jump="osprey"]').click();
  await expect(page.locator('#rh-fid-osprey')).toBeFocused();
});

test('raptor roster: the profile links to the encyclopedia entry', async ({ page }) => {
  await raptor.mount(page, { raptorHunt: { activeSection: 'roster', selectedSpecies: 'peregrine' } }, null, { expectCanvas: false });
  await page.getByRole('button', { name: /Read the encyclopedia entry/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Peregrine Falcon' })).toBeVisible();
});

test('compare: a look-alike in an entry opens the side-by-side with both species, and the pickers drive it', async ({ page }) => {
  await mountBird(page, { encId: 'downyWoodpecker' });
  await page.getByRole('button', { name: 'Compare Downy Woodpecker with Hairy Woodpecker side by side' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Which one is it?' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Downy Woodpecker' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Hairy Woodpecker' })).toBeVisible();
  // The field guide's own words about telling them apart.
  await expect(page.getByText('The Downy Woodpecker entry says about the Hairy Woodpecker:')).toBeVisible();
  await expect(page.locator('#enc-cmp-a')).toHaveValue('downyWoodpecker');
  await expect(page.locator('#enc-cmp-b')).toHaveValue('hairyWoodpecker');
  // The same species cannot sit on both sides.
  await expect(page.locator('#enc-cmp-b option[value="downyWoodpecker"]')).toBeDisabled();
  await page.locator('#enc-cmp-b').selectOption('robin');
  await expect(page.getByRole('heading', { level: 3, name: 'American Robin' })).toBeVisible();
  await expect(page.getByText(/entry says about the American Robin/)).toHaveCount(0);
  await page.getByRole('button', { name: /Swap the two species/ }).click();
  await expect(page.locator('#enc-cmp-a')).toHaveValue('robin');
  // Size bars, both range maps and the seasonal charts are all there.
  expect(await page.locator('.enc-cmp-bars').count()).toBe(3);
  expect(await page.locator('svg.enc-map').count()).toBe(2);
  expect(await page.locator('.enc-months').count()).toBe(2);
  // A classic pair chip loads its pair; the partner chips follow the first species.
  await page.getByRole('button', { name: 'Herring Gull · Ring-billed Gull' }).click();
  await expect(page.locator('#enc-cmp-b')).toHaveValue('ringBilledGull');
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: /Read the full Ring-billed Gull entry/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Ring-billed Gull' })).toBeVisible();
});

test('compare: the old Compare Lab links to it', async ({ page }) => {
  await page.goto(`${(bird as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(() => (window as any).__mount({ birdLab: { view: 'compare' } }));
  await page.getByRole('button', { name: /Compare any of the 177 species/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Which one is it?' })).toBeVisible();
  await expect(page.locator('#enc-cmp-a')).not.toHaveValue('');
});

test('raptor compare: pair chips, simulator flight numbers for two flyable raptors, dark-theme axe', async ({ page }) => {
  await mountRaptor(page);
  await page.getByRole('button', { name: /Compare two raptors/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Which one is it?' })).toBeVisible();
  await page.getByRole('button', { name: 'Peregrine Falcon · Merlin' }).click();
  await expect(page.locator('#enc-cmp-r-a')).toHaveValue('peregrine');
  await expect(page.locator('#enc-cmp-r-b')).toHaveValue('merlin');
  await expect(page.getByRole('heading', { name: 'Flight numbers in the simulator' })).toBeVisible();
  expect(await page.locator('.enc-cmp-bars').count()).toBe(8);
  // A reference-only raptor swaps the numbers for a note.
  await page.locator('#enc-cmp-r-b').selectOption('barnOwl');
  await expect(page.getByText(/Flight numbers appear here when both raptors are flyable/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Flight numbers in the simulator' })).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: '← All species' }).click();
  await expect(page.locator('.enc-thumb').first()).toBeVisible();
});

test('raptor compare: reach it from an entry and from the roster profile path', async ({ page }) => {
  await mountRaptor(page, { encId: 'peregrine' });
  await page.getByRole('button', { name: '⇄ Compare…' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Which one is it?' })).toBeVisible();
  await expect(page.locator('#enc-cmp-r-a')).toHaveValue('peregrine');
  await page.getByRole('button', { name: /Read the full .* entry/ }).first().click();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
});

test('phone width: nothing scrolls sideways, gallery or entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountBird(page);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountBird(page, { encId: 'puffin' });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountRaptor(page, { encId: 'baldEagle' });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountBird(page, { view: 'encCompare', encCmpA: 'downyWoodpecker', encCmpB: 'hairyWoodpecker' });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountRaptor(page, { encCmpA: 'peregrine', encCmpB: 'merlin' });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});

test('bird gallery filters: status, Maine month, sort, clear', async ({ page }) => {
  await mountBird(page);
  const total = page.getByRole('status').filter({ hasText: /of \d+ species/ });
  // Conservation status: only the seven threatened species, each wearing its status badge.
  await page.getByLabel('Conservation status').selectOption('risk');
  await expect(total).toHaveText('7 of 7 species');
  await expect(page.locator('.enc-thumb')).toHaveCount(7);
  await expect(page.locator('.enc-thumb-st')).toHaveCount(7);
  const badges = await page.locator('.enc-thumb-st').allTextContents();
  for (const b of badges) expect(b).toMatch(/Vulnerable|Endangered|Critically Endangered/);
  await page.getByLabel('Conservation status').selectOption('watch');
  await expect(total).toHaveText('17 of 17 species');
  // Maine month: fewer birds are fairly common in January than in July, and each card says how likely it is.
  await page.getByLabel('Conservation status').selectOption('any');
  await page.getByLabel('Likely in Maine in').selectOption({ label: 'Jan' });
  await expect(total).toHaveText('24 of 65 species');
  await page.getByLabel('Likely in Maine in').selectOption({ label: 'Jul' });
  await expect(total).toHaveText('24 of 126 species');
  await expect(page.locator('.enc-thumb').first()).toContainText(/Jul: (common|fairly common)/);
  // "This month" jumps to the current month.
  await page.getByRole('button', { name: 'This month' }).click();
  const nowMonth = await page.evaluate(() => String(new Date().getMonth()));
  await expect(page.locator('#enc-b-f-month')).toHaveValue(nowMonth);
  // Sort: heaviest and lightest come from the data, not the list order.
  await page.getByLabel('Likely in Maine in').selectOption('any');
  await page.getByLabel('Sort by').selectOption('big');
  await expect(page.locator('.enc-thumb').first()).toContainText('Mute Swan');
  await page.getByLabel('Sort by').selectOption('small');
  await expect(page.locator('.enc-thumb').first()).toContainText('Hummingbird'); // two species tie at 3.4 g; list order breaks it
  await page.getByLabel('Sort by').selectOption('az');
  const names = await page.locator('.enc-thumb-name').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  // Filters and the group chips and search all stack; Clear filters puts everything back.
  await page.getByLabel('Conservation status').selectOption('watch');
  await page.getByRole('button', { name: 'Waterfowl', exact: true }).click();
  await expect(page.locator('.enc-thumb').first()).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(total).toHaveText('24 of 177 species');
  await page.getByLabel('Conservation status').selectOption('risk');
  await page.getByRole('searchbox').fill('zzzzzz');
  await expect(page.locator('.enc-empty')).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('bird mystery quiz: clues unlock one at a time, an answer reveals the portrait and the entry', async ({ page }) => {
  await mountBird(page);
  await page.getByRole('button', { name: /Mystery bird quiz/ }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery bird 1' })).toBeVisible();
  expect(await page.locator('.enc-clues li').count()).toBe(1);
  expect(await page.locator('.enc-choice').count()).toBe(4);
  expect(await axe(page)).toEqual([]);
  for (const left of [3, 2, 1]) {
    await page.getByRole('button', { name: `Another clue (${left} left)` }).click();
  }
  expect(await page.locator('.enc-clues li').count()).toBe(4);
  await expect(page.getByRole('button', { name: /Another clue/ })).toHaveCount(0);
  const clueText = (await page.locator('.enc-clues').innerText()).toLowerCase();
  // Answer the first choice, right or wrong; the right one is then marked, and no clue named it.
  await page.locator('.enc-choice').first().click();
  const right = page.locator('.enc-choice.is-right');
  await expect(right).toHaveCount(1);
  const answer = (await right.innerText()).replace('✓ ', '').trim();
  expect(clueText).not.toContain(answer.toLowerCase());
  await expect(page.getByRole('status').filter({ hasText: answer })).toBeVisible();
  await expect(page.getByRole('img', { name: new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': stylized field-mark illustration') })).toBeVisible();
  await expect(page.getByText(/\d of 1 right/)).toBeVisible();
  // Four clues asked for = one point if right.
  const fb = await page.getByRole('status').filter({ hasText: answer }).innerText();
  if (/Correct/.test(fb)) await expect(page.locator('.enc-qz-score')).toContainText('1 of 1 right · 1 points'); else await expect(page.locator('.enc-qz-score')).toContainText('0 of 1 right · 0 points');
  expect(await axe(page)).toEqual([]);
  // A second answer does nothing.
  await page.locator('.enc-choice').nth(1).click({ force: true });
  await expect(page.getByText(/\d of 1 right/)).toBeVisible();
  // Next question: back to one clue, empty feedback.
  await page.getByRole('button', { name: 'Next mystery bird →' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery bird 2' })).toBeFocused();
  expect(await page.locator('.enc-clues li').count()).toBe(1);
  await expect(page.locator('.enc-qz-fb')).toBeEmpty();
  // The entry link opens the full entry and the back button returns to the quiz where it was.
  await page.locator('.enc-choice').first().click();
  const name2 = (await page.locator('.enc-choice.is-right').innerText()).replace('✓ ', '').trim();
  await page.getByRole('button', { name: `Read the ${name2} entry` }).click();
  await expect(page.getByRole('heading', { level: 2, name: name2 })).toBeVisible();
  await page.getByRole('button', { name: '← All species' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery bird 2' })).toBeVisible();
  // Quiz me on one group: every question comes from it.
  await page.getByLabel('Quiz me on').selectOption('Owls');
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery bird 1' })).toBeVisible();
  await page.locator('.enc-choice').first().click();
  expect(await page.locator('.enc-choice.is-right').innerText()).toMatch(/Owl/);
  // Browse mode is one click away and keeps its own state.
  await page.getByRole('button', { name: 'Browse species' }).click();
  await expect(page.locator('.enc-thumb').first()).toBeVisible();
});

test('raptor gallery: flyable toggle, status filter, quiz', async ({ page }) => {
  await mountRaptor(page);
  const total = page.getByRole('status').filter({ hasText: /of \d+ species/ });
  await expect(total).toHaveText('24 of 41 species');
  await expect(page.getByLabel('Likely in Maine in')).toHaveCount(0);
  await page.getByRole('button', { name: 'Flyable in the simulator' }).click();
  await expect(total).toHaveText('20 of 20 species');
  await page.getByLabel('Conservation status').selectOption('risk');
  await expect(page.locator('.enc-thumb-st').first()).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(total).toHaveText('24 of 41 species');
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: /Mystery raptor quiz/ }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery raptor 1' })).toBeVisible();
  await page.getByLabel('Quiz me on').selectOption('Eagles');
  await page.locator('.enc-choice').first().click();
  const name = (await page.locator('.enc-choice.is-right').innerText()).replace('✓ ', '').trim();
  expect(name).toMatch(/Eagle/);
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: 'Next mystery raptor →' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Mystery raptor 2' })).toBeVisible();
});

test('phone width: filters and the quiz do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountBird(page);
  await page.getByLabel('Likely in Maine in').selectOption({ label: 'Jul' });
  await page.getByLabel('Conservation status').selectOption('watch');
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Mystery bird quiz/ }).click();
  await page.getByRole('button', { name: /Another clue/ }).click();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.locator('.enc-choice').first().click();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountRaptor(page);
  await page.getByRole('button', { name: /Mystery raptor quiz/ }).click();
  await page.locator('.enc-choice').first().click();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});

// ---- round 4: size map, species of the day, range-map layers, "close in size" ----
const selCenter = (page: Page) => page.evaluate(() => { const c = document.querySelector('.enc-sz-dot.is-sel') as SVGCircleElement | null; if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, cx: Number(c.getAttribute('cx')), cy: Number(c.getAttribute('cy')) }; });

test('bird size map: quick picks, arrow keys, clicking a dot, highlight, neighbours, entry link', async ({ page }) => {
  await mountBird(page);
  await page.getByRole('button', { name: /Size map/ }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Size map: wingspan against weight' })).toBeVisible();
  await expect(page.locator('.enc-sz-dot')).toHaveCount(177);
  expect(await axe(page)).toEqual([]);
  // Nothing is chosen yet; the quick picks start the tour.
  await expect(page.locator('.enc-sz-dot.is-sel')).toHaveCount(0);
  await page.getByRole('button', { name: 'The heaviest' }).click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText('Mute Swan');
  await expect(page.locator('.enc-sz-card')).toContainText('The heaviest of the 177 species here');
  await expect(page.getByRole('button', { name: '▲ Next heavier' })).toBeDisabled();
  // The plot is one tab stop with a name, driven by the arrow keys; Home and End jump to the extremes.
  const plot = page.getByRole('group', { name: /Size map of 177 species/ });
  await plot.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.enc-sz-card-name')).toContainText('Hummingbird');
  await expect(page.getByRole('button', { name: '▼ Next lighter' })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: /Hummingbird\. Wingspan/ })).toBeAttached();
  const a = await selCenter(page);
  await page.keyboard.press('ArrowRight');
  const b = await selCenter(page);
  expect(b!.cx).toBeGreaterThan(a!.cx);
  await page.keyboard.press('ArrowUp');
  const c = await selCenter(page);
  expect(c!.cy).toBeLessThan(b!.cy);
  await page.keyboard.press('ArrowLeft');
  const d = await selCenter(page);
  expect(d!.cx).toBeLessThan(c!.cx);
  // Clicking a dot picks the nearest species to the pointer.
  const target = page.locator('.enc-sz-dot:not(.is-sel)').nth(60);
  const tb = (await target.boundingBox())!;
  const tx = tb.x + tb.width / 2, ty = tb.y + tb.height / 2;
  await page.mouse.click(tx, ty);
  const e = await selCenter(page);
  expect(Math.abs(e!.x - tx)).toBeLessThan(3);
  expect(Math.abs(e!.y - ty)).toBeLessThan(3);
  // Next heavier / lighter walk the species in weight order.
  const here = await page.locator('.enc-sz-card-name').innerText();
  await page.getByRole('button', { name: '▲ Next heavier' }).click();
  const heavier = await page.locator('.enc-sz-card-name').innerText();
  expect(heavier).not.toBe(here);
  await page.getByRole('button', { name: '▼ Next lighter' }).click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText(here);
  // Highlight a group: its dots stand out, the rest fade, and the totals still add up.
  await page.getByLabel('Highlight a group').selectOption('Owls');
  const hi = await page.locator('.enc-sz-dot.is-hi').count(), dim = await page.locator('.enc-sz-dot.is-dim').count();
  expect(hi).toBeGreaterThan(0);
  expect(hi + dim + 1).toBe(177);
  await page.getByLabel('Highlight a group').selectOption('all');
  await expect(page.locator('.enc-sz-dot.is-hi')).toHaveCount(0);
  // "Close in size" chips move the selection to that species.
  const chip = page.locator('.enc-sz-card .enc-near button').first();
  const chipName = (await chip.innerText()).trim();
  await chip.click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText(chipName);
  expect(await axe(page)).toEqual([]);
  // The entry link opens the entry; coming back, the map still has the same species selected.
  await page.getByRole('button', { name: `Read the ${chipName} entry` }).click();
  await expect(page.getByRole('heading', { level: 2, name: chipName })).toBeVisible();
  await page.getByRole('button', { name: '← All species' }).click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText(chipName);
  // Enter on the focused plot does the same.
  await page.getByRole('group', { name: /Size map of 177 species/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: chipName })).toBeVisible();
});

test('raptor size map: the widest wings and the heaviest are the condor, and the mode toggle returns to the gallery', async ({ page }) => {
  await mountRaptor(page);
  await page.getByRole('button', { name: /Size map/ }).click();
  await expect(page.locator('.enc-sz-dot')).toHaveCount(41);
  await page.getByRole('button', { name: 'The widest wings' }).click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText('California Condor');
  await page.getByRole('button', { name: '▼ Next lighter' }).click();
  await expect(page.locator('.enc-sz-card-name')).toHaveText('Harpy Eagle');
  await page.getByLabel('Highlight a group').selectOption('Eagles');
  expect(await page.locator('.enc-sz-dot.is-hi').count()).toBeGreaterThan(0);
  expect(await axe(page)).toEqual([]);
  await page.getByRole('button', { name: 'Browse species' }).click();
  await expect(page.locator('.enc-thumb').first()).toBeVisible();
});

test('range map layers can be hidden one at a time, and each entry lists species close in size', async ({ page }) => {
  await mountBird(page, { encId: 'commonLoon' });
  const map = page.locator('svg.enc-map');
  const winter = page.getByRole('button', { name: 'Winter (nonbreeding)' });
  await expect(winter).toHaveAttribute('aria-pressed', 'true');
  expect(await map.getAttribute('aria-label')).toContain('Winter (nonbreeding)');
  await winter.click();
  await expect(winter).toHaveAttribute('aria-pressed', 'false');
  expect(await map.getAttribute('aria-label')).not.toContain('Winter (nonbreeding)');
  expect(await map.getAttribute('aria-label')).toContain('Breeding season');
  await winter.click();
  await expect(winter).toHaveAttribute('aria-pressed', 'true');
  expect(await map.getAttribute('aria-label')).toContain('Winter (nonbreeding)');
  expect(await axe(page)).toEqual([]);
  const near = page.locator('.enc-near button');
  await expect(near).toHaveCount(3);
  const nm = (await near.first().innerText()).trim();
  await near.first().click();
  await expect(page.getByRole('heading', { level: 2, name: nm })).toBeVisible();
  // Raptor entries get the same two features.
  await mountRaptor(page, { encId: 'baldEagle' });
  await page.getByRole('button', { name: 'Breeding season' }).click();
  await expect(page.getByRole('button', { name: 'Breeding season' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.enc-near button')).toHaveCount(3);
});

test('bird and raptor of the day: one card, opens its entry, steps aside when you search or filter', async ({ page }) => {
  await mountBird(page);
  const card = page.locator('section.enc-today');
  await expect(card).toBeVisible();
  await expect(card.locator('.enc-kicker')).toHaveText('Bird of the day');
  const name = await card.getByRole('heading', { level: 3 }).innerText();
  const month = await page.evaluate(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date().getMonth()]);
  await expect(card).toContainText(new RegExp('Maine in ' + month + ': (common|fairly common)'));
  expect(await axe(page)).toEqual([]);
  // The same card comes back after a trip through another mode.
  await page.getByRole('button', { name: /Size map/ }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Browse species' }).click();
  await expect(card.getByRole('heading', { level: 3 })).toHaveText(name);
  await page.getByRole('searchbox').fill('owl');
  await expect(card).toHaveCount(0);
  await page.getByRole('searchbox').fill('');
  await expect(card).toBeVisible();
  await page.getByLabel('Conservation status').selectOption('risk');
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await card.getByRole('button', { name: 'Read today’s entry →' }).click();
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  // Raptors: no Maine badge, its own wording.
  await mountRaptor(page);
  const rc = page.locator('section.enc-today');
  await expect(rc.locator('.enc-kicker')).toHaveText('Raptor of the day');
  await expect(rc).not.toContainText('Maine in');
  const rname = await rc.getByRole('heading', { level: 3 }).innerText();
  await rc.getByRole('button', { name: 'Read today’s entry →' }).click();
  await expect(page.getByRole('heading', { level: 2, name: rname })).toBeVisible();
});

test('phone width: the size map and the day card do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountBird(page);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Size map/ }).click();
  await page.getByRole('button', { name: 'The widest wings' }).click();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountBird(page, { encId: 'commonLoon' });
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await mountRaptor(page);
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Size map/ }).click();
  await page.getByRole('button', { name: 'The heaviest' }).click();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
