import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-layer-navigation-2026-09-30';
const baseline = process.env.DISSECTION_LAYER_BASELINE === '1';
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'organs', anatomicalView: 'ventral', selectedOrgan: null, revealedLayers: { skin: true, muscle: true }, exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'Keep this original observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|ventral_skin': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, sceneDetail: false };

test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

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
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer };
  });
}

const cases = [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
  { name: 'assessment', width: 390, available: 390, assessment: true },
];

for (const { name, width, available, large, contrast, forced, assessment } of cases) {
  test(`layer navigator ${name} preserves access and explains each state`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast, quizMode: !!assessment }, width, available);
    const nav = page.locator('[data-dissection-layer-stepper]');
    const before = await evidence(page);
    const inventory = await nav.locator('.diss-layer-button').evaluateAll(nodes => nodes.map(node => ({ name: node.getAttribute('aria-label'), state: node.getAttribute('data-state'), disabled: (node as HTMLButtonElement).disabled, current: node.getAttribute('aria-current') })));
    await writeFile(`${out}/${baseline ? 'before' : 'after'}-${name}-inventory.json`, JSON.stringify(inventory, null, 2));
    await nav.screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${name}.png`, style: '.diss-next-action { position: static !important; }' });
    if (baseline) return;
    expect(inventory).toEqual(JSON.parse(await readFile(`${out}/before-${name}-inventory.json`, 'utf8')));
    expect(inventory.map(item => item.disabled)).toEqual(assessment ? [true, true, true, true, true] : [false, false, false, true, true]);
    await expect(nav.locator('.diss-layer-summary')).toHaveText('2 of 5 layers revealed');
    await expect(nav.locator('.diss-layer-button[data-state="current"] .diss-layer-state')).toHaveText('Current');
    await expect(nav.locator('.diss-layer-button[data-state="current"] .diss-layer-detail')).toHaveText(assessment ? 'Locked during assessment' : 'Awaiting reveal');
    if (!assessment) await expect(nav.locator('[data-state="locked"]').first().locator('.diss-layer-detail')).toHaveText('Reveal Organs first');
    const metrics = await nav.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      list: getComputedStyle(el.querySelector('.diss-layer-list')!).display,
      cards: Array.from(el.querySelectorAll('.diss-layer-button')).map(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, opacity: getComputedStyle(node).opacity })),
      text: Array.from(el.querySelectorAll('.diss-layer-name, .diss-layer-state, .diss-layer-detail, .diss-layer-summary, .diss-layer-help')).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
    await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.width).toBeLessThanOrEqual(available + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.list).toBe(available <= 640 ? 'flex' : 'grid');
    for (const card of metrics.cards) {
      expect(card.height).toBeGreaterThanOrEqual(79.9);
      expect(card.width).toBeLessThanOrEqual(available);
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
      expect(card.opacity).toBe('1');
    }
    for (const text of metrics.text) {
      expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
      expect(text.clipped, text.text || '').toBe(false);
    }
    if (!assessment) {
      const buttons = nav.locator('.diss-layer-button:not(:disabled)');
      await buttons.nth(0).focus(); await page.keyboard.press('ArrowRight'); await expect(buttons.nth(1)).toBeFocused();
      await page.keyboard.press('End'); await expect(buttons.nth(2)).toBeFocused();
      await page.keyboard.press('ArrowRight'); await expect(buttons.nth(0)).toBeFocused();
      await page.keyboard.press('ArrowLeft'); await expect(buttons.nth(2)).toBeFocused();
      await page.keyboard.press('Home'); await expect(buttons.nth(0)).toBeFocused();
      await buttons.nth(0).screenshot({ path: `${out}/focus-${name}.png` });
    } else {
      const strip = nav.getByRole('region', { name: 'Anatomical layer access' });
      await strip.focus(); await expect(strip).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => strip.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
      await strip.screenshot({ path: `${out}/focus-assessment.png` });
    }
    expect(await evidence(page)).toEqual(before);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-layer-stepper]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('keyboard activation selects an available layer without revealing it or changing evidence', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { activeLayer: 'skin', revealedLayers: { skin: true } });
  const before = await evidence(page);
  const nav = page.locator('[data-dissection-layer-stepper]');
  await expect(nav.locator('[data-state="available"] .diss-layer-state')).toHaveText('Available');
  await expect(nav.locator('[data-state="available"] .diss-layer-detail')).toHaveText('Select to explore');
  const buttons = nav.locator('.diss-layer-button:not(:disabled)');
  await buttons.first().focus(); await page.keyboard.press('End'); await expect(buttons.last()).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(nav.locator('[aria-current="step"]')).toContainText('Muscle');
  expect(await evidence(page)).toEqual({ ...before, layer: 'muscle' });
  await expect(nav.locator('[data-state="locked"]').first()).toBeDisabled();
});

test('long specimen layer names and prerequisite messages fit a narrow embedded lab', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', activeLayer: 'skin', revealedLayers: { skin: true }, largeText: true }, 1440, 320);
  const nav = page.locator('[data-dissection-layer-stepper]');
  await expect(nav.locator('.diss-layer-name')).toHaveText(['🟤 Integument', '💪 Body Wall', '🫁 Internal Organs', '⚡ Nervous System']);
  const last = nav.locator('.diss-layer-button').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last.locator('.diss-layer-detail')).toHaveText('Reveal Internal Organs first');
  const measurements = await last.evaluate(node => ({ right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width, clipped: Array.from(node.querySelectorAll('span')).some(span => span.scrollWidth > span.clientWidth + 1) }));
  expect(measurements.width).toBeLessThanOrEqual(320);
  expect(measurements.right).toBeLessThanOrEqual(320);
  expect(measurements.clipped).toBe(false);
  await nav.screenshot({ path: `${out}/long-names.png`, style: '.diss-next-action { position: static !important; }' });
});

test('modified navigation keys retain browser behavior', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const buttons = page.locator('.diss-layer-button:not(:disabled)');
  const before = await evidence(page);
  await buttons.nth(0).focus();
  const intercepted = await buttons.nth(0).evaluate(node => [
    { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true },
    { key: 'End', shiftKey: true }, { key: 'Home', metaKey: true }, { key: 'ArrowRight', isComposing: true },
    { key: 'ArrowRight', keyCode: 229 },
  ].map(options => {
    const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true });
    node.dispatchEvent(event); return event.defaultPrevented;
  }));
  expect(intercepted).toEqual([false, false, false, false, false, false]);
  await expect(buttons.nth(0)).toBeFocused();
  expect(await evidence(page)).toEqual(before);
});
