import { test, expect, Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-study-actions-2026-09-29';
const baseline = process.env.DISSECTION_STUDY_BASELINE === '1';
const captureStyle = '.diss-next-action { position: static !important; }';
const note = 'I observed a transparent membrane at the eye.\nI will compare its location with the reference.';
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'nictitating', revealedLayers: { skin: true }, exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': note }, organConfidence: { 'frog|nictitating': 2 }, quizScore: 1, quizTotal: 2, workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, sceneDetail: false };

test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
});

async function mount(page: Page, state = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, layer: d.activeLayer, selected: d.selectedOrgan };
  });
}

const cases = [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
];

for (const { name, width, available, large, contrast, forced } of cases) {
  test(`study guide ${name} connects inspection, writing, and reference without adding credit`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
    const before = await evidence(page);
    const card = page.locator('[data-dissection-selection]');
    await card.screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-selection-${name}.png`, style: captureStyle });
    if (baseline) return;
    const guide = card.locator('[data-diss-study-actions]');
    await expect(guide.getByRole('button')).toHaveCount(3);
    const metrics = await guide.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      buttons: Array.from(el.querySelectorAll('button')).map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
        sizes: Array.from(node.querySelectorAll('strong, .diss-study-actions__cue')).map(text => parseFloat(getComputedStyle(text).fontSize)) })) }));
    await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.width).toBeLessThanOrEqual(available);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    for (const button of metrics.buttons) {
      expect(button.height).toBeGreaterThanOrEqual(63.9);
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.sizes.every(size => size >= 13.9)).toBe(true);
    }
    await guide.screenshot({ path: `${out}/guide-${name}.png`, style: captureStyle });
    const inspect = guide.locator('[data-study-action="inspect"]');
    await inspect.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#diss-canvas')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.canvasZoom)).toBeGreaterThanOrEqual(1.65);
    expect(await evidence(page)).toEqual(before);
    const reference = card.locator('[data-selection-reference]');
    await guide.locator('[data-study-action="reference"]').focus(); await page.keyboard.press('Enter');
    await expect(reference).toHaveAttribute('open', '');
    await expect(reference.locator('summary')).toBeFocused();
    expect(await evidence(page)).toEqual(before);
    await card.locator('[data-study-return-note]').click();
    await expect(page.locator('#diss-note-nictitating')).toBeFocused();
    await expect(page.locator('#diss-note-nictitating')).toHaveValue(note);
    const writing = guide.locator('[data-study-action="write"]');
    await writing.focus(); await writing.screenshot({ path: `${out}/focus-${name}.png`, style: captureStyle });
    await page.keyboard.press('Enter');
    await expect(page.locator('#diss-note-nictitating')).toBeFocused();
    expect(await evidence(page)).toEqual(before);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-diss-study-actions]'], ['[data-study-return-note]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('study shortcuts retain a new draft and follow the selected structure', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { organNotes: {} });
  const before = await evidence(page);
  const guide = page.locator('[data-diss-study-actions]');
  await expect(guide.locator('[data-study-action="write"]')).toHaveAttribute('data-note-state', 'empty');
  await guide.locator('[data-study-action="write"]').click();
  const field = page.locator('#diss-note-nictitating'); await expect(field).toBeFocused();
  const draft = 'A thin membrane beside the eye.\n<observed feature> & location';
  await field.fill(draft);
  await expect(guide.locator('[data-study-action="write"]')).toHaveAttribute('data-note-state', 'draft');
  await expect(guide).toContainText('Continue your existing draft.');
  await guide.locator('[data-study-action="reference"]').click();
  await page.locator('[data-study-return-note]').click();
  await expect(field).toBeFocused(); await expect(field).toHaveValue(draft);
  expect(await evidence(page)).toEqual({ ...before, notes: { 'frog|nictitating': draft } });
  await page.getByRole('button', { name: 'Previous structure', exact: true }).click();
  const selected = await page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan);
  expect(selected).not.toBe('nictitating');
  await expect(guide.locator('[data-study-action="reference"]')).toHaveAttribute('aria-controls', 'diss-reference-' + selected);
  await guide.locator('[data-study-action="reference"]').click();
  await expect(page.locator('#diss-reference-' + selected)).toHaveAttribute('open', '');
  expect((await evidence(page)).notes).toEqual({ 'frog|nictitating': draft });
});

test('previously viewed hidden anatomy returns to the specimen without framing or adding progress', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { selectedOrgan: 'ventral_skin', exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': note }, canvasZoom: 1 });
  const before = await evidence(page);
  const inspect = page.locator('[data-study-action="inspect"]');
  await expect(inspect).toContainText('Return to specimen');
  await inspect.click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.canvasZoom)).toBe(1);
  expect(await evidence(page)).toEqual(before);
  await page.locator('[data-study-action="write"]').click();
  await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  await expect(page.locator('#diss-note-ventral_skin')).toHaveValue(note);
});

for (const practicalMode of [false, true]) {
  test(`study shortcuts remain unavailable during ${practicalMode ? 'a timed practical' : 'assessment'}`, async ({ page }) => {
    test.skip(baseline, 'Baseline captures only.');
    await mount(page, { quizMode: true, practicalMode, practicalTimer: practicalMode ? 120 : 0, practicalEndsAt: practicalMode ? Date.now() + 120000 : 0 });
    const before = await evidence(page);
    await expect(page.locator('[data-dissection-root]')).toHaveAttribute('data-assessment-mode', 'true');
    if (practicalMode) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
    await expect(page.locator('[data-diss-study-actions]')).toHaveCount(0);
    await expect(page.locator('[data-study-return-note]')).toHaveCount(0);
    expect(await evidence(page)).toEqual(before);
  });
}
