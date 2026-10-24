import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection',
  width: 1180, height: 900, layout: 'document', appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
});
const out = 'tmp/dissection-review/visual-pass';
const note = 'I observed a transparent membrane beside the eye.\nIts location supports my identification; I will compare it with the reference.';
const layouts = [
  { name: 'phone-320', width: 320, available: 320, reflowWidth: 390, reflowAvailable: 390 },
  { name: 'phone-390', width: 390, available: 390, reflowWidth: 320, reflowAvailable: 320 },
  { name: 'desktop', width: 1440, available: 1180, reflowWidth: 1440, reflowAvailable: 520 },
  { name: 'embedded-large', width: 1440, available: 320, reflowWidth: 1440, reflowAvailable: 520, large: true },
  { name: 'high-contrast', width: 390, available: 390, reflowWidth: 320, reflowAvailable: 320, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, reflowWidth: 320, reflowAvailable: 320, forced: true },
];

test.describe.configure({ retries: 0, timeout: 60000 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await harness.unmount(page).catch(() => {});
  await harness.destroy(page);
});

async function setAvailableWidth(page: Page, width: number) {
  await page.locator('#wrap').evaluate((element, available) => {
    (element as HTMLElement).style.setProperty('--visual-refinement-width', available + 'px');
  }, width);
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, selected: d.selectedOrgan || null,
      workspace: d.workspaceMode, guided: !!d.guidedMode, assessment: !!d.quizMode,
      practical: !!d.practicalMode, notes: d.organNotes || {}, confidence: d.organConfidence || {},
      explored: d.exploredOrgans || {}, verified: d.verifiedIdentifications || {},
      revealed: d.revealedLayers || {}, procedure: d.procedureByLayer || {},
      assessmentEvidence: d.assessmentEvidence || {}, quizScore: Number(d.quizScore) || 0,
      quizTotal: Number(d.quizTotal) || 0,
    };
  });
}

async function currentContext(page: Page) {
  const root = page.locator('[data-dissection-root]');
  await expect(root).toHaveAttribute('data-workspace-mode', 'essentials');
  await expect(page.locator('#diss-specimen-tab-frog')).toHaveAttribute('aria-selected', 'true');
  const currentLayer = page.locator('[data-dissection-layer-stepper] .diss-layer-button[aria-current="step"]');
  await expect(currentLayer).toHaveCount(1);
  await expect(currentLayer.locator('.diss-layer-name')).toContainText('Skin');
  const currentRoute = page.locator('[data-dissection-workspace-mode] .diss-route-button[aria-pressed="true"]');
  await expect(currentRoute).toHaveCount(1);
  await expect(currentRoute).toHaveAccessibleName('Procedure practice');
  await expect(page.locator('#diss-stage-title')).toContainText('Skin');
}

async function visualSafety(page: Page, available: number) {
  const result = await page.locator('[data-dissection-root]').evaluate(root => {
    const visible = (node: Element) => {
      // Closed details can retain layout rectangles for their unpainted contents.
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.hasAttribute('open')) {
          const summary = parent.querySelector(':scope > summary');
          if (!summary?.contains(node)) return false;
        }
        if (parent === root) break;
      }
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const box = root.getBoundingClientRect();
    const panels = [...root.querySelectorAll('.diss-mission, .diss-mode-rail, .diss-picker, [data-dissection-layer-stepper], .diss-workspace, [data-dissection-stage], [data-dissection-selection]')]
      .filter(visible).map(node => ({
        name: node.getAttribute('aria-label') || node.className,
        width: node.getBoundingClientRect().width, scroll: node.scrollWidth, client: node.clientWidth,
      }));
    const controls = [...root.querySelectorAll('button, summary, [role="tab"], [role="radio"]')]
      .filter(visible).map(node => {
        const bounds = node.getBoundingClientRect();
        return { name: node.getAttribute('aria-label') || node.textContent?.trim(), width: bounds.width, height: bounds.height };
      });
    return {
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      rootWidth: box.width, rootClient: root.clientWidth, rootScroll: root.scrollWidth,
      panels, controls, forcedColors: matchMedia('(forced-colors: active)').matches,
    };
  });
  expect(result.documentWidth, 'document should not need horizontal scrolling').toBeLessThanOrEqual(result.viewport + 1);
  expect(result.rootWidth, 'lab should fit its actual host width').toBeLessThanOrEqual(available + 1);
  expect(result.rootScroll, 'lab content should stay inside its host').toBeLessThanOrEqual(result.rootClient + 1);
  expect(result.controls.length, 'the measurement must include real interactive controls').toBeGreaterThan(10);
  for (const panel of result.panels) {
    expect(panel.width, panel.name).toBeLessThanOrEqual(available + 1);
    expect(panel.scroll, `${panel.name} should contain its content`).toBeLessThanOrEqual(panel.client + 1);
  }
  for (const control of result.controls) {
    expect(control.width, `touch target width: ${control.name}`).toBeGreaterThanOrEqual(43.9);
    expect(control.height, `touch target height: ${control.name}`).toBeGreaterThanOrEqual(43.9);
  }
  return result;
}

async function visibleKeyboardFocus(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => {
    const style = getComputedStyle(node);
    return { visible: node.matches(':focus-visible'), width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(appearance.visible, 'keyboard focus should remain visibly distinguishable').toBe(true);
  expect(appearance.width).toBeGreaterThanOrEqual(2);
  expect(appearance.style).not.toBe('none');
}

for (const layout of layouts) {
  test(`visual refinement ${layout.name} preserves first-use and selected-organ work through reflow`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: layout.forced ? 'active' : 'none' });
    await page.setViewportSize({ width: layout.width, height: 1000 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'essentials', selectedOrgan: null, reducedMotion: true, soundEnabled: false,
      largeText: !!layout.large, highContrast: !!layout.contrast,
      organNotes: {}, organConfidence: {}, exploredOrgans: {}, revealedLayers: {}, procedureByLayer: {},
    } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    // Change only the harness host; all lab styles remain the production styles.
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:var(--visual-refinement-width) !important; }' });
    await setAvailableWidth(page, layout.available);

    const root = page.locator('[data-dissection-root]');
    await expect(root).toHaveAttribute('data-text-size', layout.large ? 'large' : 'default');
    await expect(root).toHaveAttribute('data-high-contrast', layout.contrast ? 'true' : 'false');
    await currentContext(page);
    await expect(page.locator('[data-dissection-selection]')).toHaveCount(0);
    const firstUse = await visualSafety(page, layout.available);
    expect(firstUse.forcedColors).toBe(!!layout.forced);
    expect(await evidence(page)).toMatchObject({ selected: null, notes: {}, layer: 'skin', guided: false, assessment: false });
    await page.screenshot({ path: `${out}/${layout.name}-first-use.png`, fullPage: true, animations: 'disabled', caret: 'hide' });

    // Reach the real inspector with keyboard activation, then record a real note.
    const structure = page.locator('#diss-organ-nictitating');
    await structure.focus();
    await page.keyboard.press('Enter');
    const selection = page.locator('[data-dissection-selection]');
    await expect(selection).toBeVisible();
    await expect(page.locator('#diss-selection-title')).toContainText('Nictitating');
    const noteField = page.locator('#diss-note-nictitating');
    await noteField.fill(note);
    await expect(noteField).toHaveValue(note);
    const selectedWork = await evidence(page);
    expect(selectedWork.selected).toBe('nictitating');
    expect(selectedWork.notes).toEqual({ 'frog|nictitating': note });
    await currentContext(page);
    const selectedMetrics = await visualSafety(page, layout.available);
    await page.screenshot({ path: `${out}/${layout.name}-selected.png`, fullPage: true, animations: 'disabled', caret: 'hide' });

    // Container and viewport changes must retain the editing target and learner work.
    await noteField.focus();
    await page.keyboard.press('End');
    await visibleKeyboardFocus(noteField);
    await page.setViewportSize({ width: layout.reflowWidth, height: 1000 });
    await setAvailableWidth(page, layout.reflowAvailable);
    await expect.poll(() => root.evaluate(node => node.clientWidth)).toBeLessThanOrEqual(layout.reflowAvailable + 1);
    await visibleKeyboardFocus(noteField);
    await expect(noteField).toHaveValue(note);
    await currentContext(page);
    const reflowMetrics = await visualSafety(page, layout.reflowAvailable);
    expect(await evidence(page)).toEqual(selectedWork);
    await selection.screenshot({ path: `${out}/${layout.name}-reflow-focus.png`, animations: 'disabled', caret: 'hide' });

    await page.setViewportSize({ width: layout.width, height: 1000 });
    await setAvailableWidth(page, layout.available);
    await visibleKeyboardFocus(noteField);
    await expect(noteField).toHaveValue(note);
    await currentContext(page);
    await visualSafety(page, layout.available);
    expect(await evidence(page)).toEqual(selectedWork);
    expect(errors).toEqual([]);
    await writeFile(`${out}/${layout.name}-metrics.json`, JSON.stringify({ firstUse, selected: selectedMetrics, reflow: reflowMetrics }, null, 2));
  });
}
