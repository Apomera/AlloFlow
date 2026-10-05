import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.COHESION_OUTPUT || 'reports/dissection-ux-cohesion-2026-10-04';
const baseline = process.env.COHESION_BASELINE === '1';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection',
  width: 1180, height: 900, layout: 'document', appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
});
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = {
  tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true,
  retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true,
  history: order,
  actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })),
  learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])),
};
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
  activeInstrument: 'probe', selectedOrgan: 'nictitating', revealedLayers: { skin: true },
  procedureByLayer: { skin: complete }, canvasZoom: 1.5, canvasPanX: 0, canvasPanY: 0,
  exploredOrgans: { 'frog|nictitating': true },
  organNotes: { 'frog|nictitating': 'A transparent protective membrane.' },
  organConfidence: { 'frog|nictitating': 3 },
  verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  quizScore: 1, quizTotal: 2, workspaceMode: 'advanced',
  reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
});

async function mount(page: Page, state: any = {}, width = 320, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, selected: d.selectedOrgan,
      instrument: d.activeInstrument, notes: d.organNotes, confidence: d.organConfidence,
      explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration,
      scores: [d.quizScore, d.quizTotal], visualEvidence: d.visualEvidence,
      guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending],
      optics: [d.lensFocusDepth, d.lensMagnification, d.inspectionLens],
    };
  });
}
async function camera(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { zoom: d.canvasZoom, x: d.canvasPanX || 0, y: d.canvasPanY || 0 };
  });
}
async function metrics(p: Locator) {
  return p.evaluate(el => ({
    width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    buttons: Array.from(el.querySelectorAll('button')).map(n => {
      const s = getComputedStyle(n), r = n.getBoundingClientRect();
      return { name: n.getAttribute('aria-label'), text: n.textContent, font: parseFloat(s.fontSize), width: r.width, height: r.height, clipped: n.scrollWidth > n.clientWidth + 1 };
    }),
  }));
}
async function readable(page: Page, available: number, large = false) {
  const p = page.locator('.diss-zoom-bar'), m = await metrics(p);
  expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const button of m.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(47.9); expect(button.height).toBeGreaterThanOrEqual(47.9);
    expect(button.font).toBeGreaterThanOrEqual(16); expect(button.clipped).toBe(false);
  }
  const text = await page.locator('.diss-stage__eyebrow, .diss-stage__status, .diss-stage__handoff strong, .diss-stage__handoff span, .diss-camera-controls__heading strong, .diss-camera-controls__heading span, .diss-camera-controls__zoom').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })));
  for (const item of text) { expect(item.font).toBeGreaterThanOrEqual(large ? 16 : 14); expect(item.clipped).toBe(false); }
  return { ...m, text };
}
async function focusStyle(p: Locator) {
  const s = await p.evaluate(el => {
    const style = getComputedStyle(el);
    const luminance = (color: string) => {
      const c = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    const a = luminance(style.outlineColor), b = luminance(style.backgroundColor);
    return { width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), style: style.outlineStyle, shadow: style.boxShadow, color: style.outlineColor, background: style.backgroundColor, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
  expect(s.width).toBeGreaterThanOrEqual(2.9); expect(s.offset).toBe(-5);
  expect(s.style).toBe('solid'); expect(s.shadow).toBe('none'); expect(s.contrast).toBeGreaterThanOrEqual(3);
  return s;
}
async function phaseGuide(page: Page) {
  const phases = await page.locator('.diss-workflow li').evaluateAll(nodes => nodes.map(n => ({ text: n.textContent, state: n.getAttribute('data-state'), current: n.getAttribute('aria-current') })));
  expect(phases).toHaveLength(6);
  expect(phases.filter(p => p.current === 'step')).toHaveLength(1);
  expect(phases.filter(p => p.state === 'current')).toHaveLength(1);
  expect(phases.filter(p => p.state === 'neutral')).toHaveLength(5);
  expect(phases.some(p => ['complete', 'upcoming'].includes(p.state || ''))).toBe(false);
  return phases;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-zoom-bar'], ['.diss-stage__header'], ['.diss-stage__handoff'], ['.diss-workflow']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
  const known = new Set([
    '.diss-stage__handoff-glyph',
    'button[aria-label="Move specimen up"]',
    'button[aria-label="Move specimen left"]',
    'button[aria-label="Move specimen right"]',
    'button[aria-label="Move specimen down"]',
  ]);
  const manual = [];
  for (const issue of result.incomplete) {
    expect(issue.id).toBe('color-contrast');
    for (const node of issue.nodes) {
      expect(node.target).toHaveLength(1);
      const selector = node.target[0]; expect(known.has(selector)).toBe(true);
      expect(node.failureSummary).toContain('Element content contains only non-text characters');
      const review = await page.locator(selector).evaluate(el => {
        const style = getComputedStyle(el);
        let owner: Element | null = el, background = style.backgroundColor;
        while ((background === 'transparent' || /rgba\([^)]*,\s*0\)/.test(background)) && owner?.parentElement) {
          owner = owner.parentElement; background = getComputedStyle(owner).backgroundColor;
        }
        const luminance = (color: string) => {
          const c = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
          return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
        };
        const a = luminance(style.color), b = luminance(background);
        return {
          foreground: style.color, background, opacity: parseFloat(style.opacity),
          backgroundNode: owner?.className || owner?.tagName,
          backgroundImage: owner ? getComputedStyle(owner).backgroundImage : 'none',
          contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05),
        };
      });
      expect(review.opacity).toBe(1); expect(review.background).toMatch(/^rgb\(/);
      expect(review.backgroundImage).toBe('none'); expect(review.contrast).toBeGreaterThanOrEqual(3);
      manual.push({ selector, ...review, minimum: 3, reason: 'Unicode control icon or decorative symbol; axe cannot classify non-text characters.' });
    }
  }
  await writeFile(`${out}/${name}-icon-contrast.json`, JSON.stringify({ audit: `${name}-axe.json`, reviews: manual }, null, 2));

}
const captureStyle = '.diss-next-action {position:static!important;}';
const layouts = [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`specimen view and stage context stay coherent on ${c.name}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  const p = page.locator('.diss-zoom-bar'), before = await proof(page), prefix = baseline ? 'before' : 'after';
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(await metrics(p), null, 2));
  await p.screenshot({ path: `${out}/${prefix}-${c.name}-camera.png`, style: captureStyle });
  await page.locator('.diss-stage__header').screenshot({ path: `${out}/${prefix}-${c.name}-context.png`, style: captureStyle });
  await page.locator('.diss-stage__handoff').screenshot({ path: `${out}/${prefix}-${c.name}-handoff.png`, style: captureStyle });
  if (baseline) return;
  await expect(p).toHaveAttribute('role', 'group'); await expect(p).toHaveAccessibleName('Specimen view');
  await readable(page, c.available, !!c.large); await phaseGuide(page);
  const outButton = p.getByRole('button', { name: 'Zoom out canvas', exact: true });
  const inButton = p.getByRole('button', { name: 'Zoom in canvas', exact: true });
  await outButton.focus(); const focus = await focusStyle(outButton);
  await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: captureStyle });
  await writeFile(`${out}/${c.name}-focus.json`, JSON.stringify(focus, null, 2));
  await page.keyboard.press('Tab'); await expect(inButton).toBeFocused();
  await page.keyboard.press('Enter'); expect((await camera(page)).zoom).toBe(1.75);
  await expect(inButton).toBeFocused(); expect(await proof(page)).toEqual(before);
  const right = p.getByRole('button', { name: 'Move specimen right', exact: true });
  await right.focus(); await focusStyle(right); await page.keyboard.press('Space');
  expect((await camera(page)).x).toBeGreaterThan(0); expect(await proof(page)).toEqual(before);
  await outButton.focus(); await page.keyboard.press('Space'); expect((await camera(page)).zoom).toBe(1.5);
  const reset = p.getByRole('button', { name: 'Reset specimen view to 100%', exact: true });
  await reset.focus(); await page.keyboard.press('Enter');
  expect(await camera(page)).toEqual({ zoom: 1, x: 0, y: 0 });
  await expect(reset).toBeFocused(); await focusStyle(reset); await expect(p.locator('.diss-pan-controls')).toHaveCount(0);
  expect(await proof(page)).toEqual(before);
  const frame = p.locator('button[aria-label^="Frame selected structure "]');
  await frame.focus(); await page.keyboard.press('Space'); expect((await camera(page)).zoom).toBeGreaterThanOrEqual(1.65);
  await expect(frame).toBeFocused(); await focusStyle(frame); expect(await proof(page)).toEqual(before);
  await readable(page, c.available, !!c.large); await audit(page, c.name); expect(errors).toEqual([]);
});

test('default view keeps a named reset control and stable keyboard focus', async ({ page }) => {
  test.skip(baseline); await mount(page, { canvasZoom: 1, selectedOrgan: null }, 390);
  const before = await proof(page), p = page.locator('.diss-zoom-bar');
  const reset = p.getByRole('button', { name: 'Reset specimen view to 100%', exact: true });
  await expect(reset).toBeVisible(); await reset.focus(); await page.keyboard.press('Space');
  await expect(reset).toBeFocused(); await focusStyle(reset); expect(await camera(page)).toEqual({ zoom: 1, x: 0, y: 0 });
  expect(await proof(page)).toEqual(before); await readable(page, 390);
});
test('assessment keeps camera controls usable and teaching handoff hidden', async ({ page }) => {
  test.skip(baseline); await mount(page, { quizMode: true, selectedOrgan: null }, 390);
  const before = await proof(page); await expect(page.locator('.diss-stage__handoff')).toBeHidden();
  const button = page.locator('.diss-zoom-bar').getByRole('button', { name: 'Zoom in canvas', exact: true });
  await button.focus(); await page.keyboard.press('Enter'); expect((await camera(page)).zoom).toBe(1.75);
  expect(await proof(page)).toEqual(before); await phaseGuide(page); await readable(page, 390);
});
test('embedded resizing and text spacing preserve focus and full camera labels', async ({ page }) => {
  test.skip(baseline); await mount(page, { largeText: true }, 1440, 1180);
  const before = await proof(page), p = page.locator('.diss-zoom-bar'), frame = p.locator('button[aria-label^="Frame selected structure "]');
  await frame.focus();
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} .diss-zoom-bar :is(button,span,strong,output), .diss-stage__header *, .diss-stage__handoff * {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  await expect(frame).toBeFocused(); await focusStyle(frame); await readable(page, 320, true);
  expect(await proof(page)).toEqual(before); await p.screenshot({ path: `${out}/camera-text-spacing.png`, style: captureStyle });
});
test('fresh Study does not imply completed learning phases', async ({ page }) => {
  test.skip(baseline); await mount(page, { selectedOrgan: null, revealedLayers: {}, procedureByLayer: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0 });
  const before = await proof(page), initialPhases = await phaseGuide(page);
  await page.locator('#diss-route-study').focus(); await page.keyboard.press('Enter');
  const phases = await phaseGuide(page); expect(phases[5].current).toBe('step');
  const after = await proof(page); expect({ ...after, guided: before.guided }).toEqual(before);
  await page.locator('.diss-workflow').screenshot({ path: `${out}/fresh-study-phases.png`, style: captureStyle });
  await page.locator('#diss-route-explore').focus(); await page.keyboard.press('Enter');
  expect(await phaseGuide(page)).toEqual(initialPhases);
  expect({ ...await proof(page), guided: before.guided }).toEqual(before);
});
test('returning to an earlier phase preserves recorded evidence', async ({ page }) => {
  const ids = ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'];
  test.skip(baseline); await mount(page, {
    selectedOrgan: null, revealedLayers: {}, procedureByLayer: { skin: complete },
    exploredOrgans: Object.fromEntries(ids.map(id => ['frog|' + id, true])),
    organNotes: Object.fromEntries(ids.map(id => ['frog|' + id, 'A preserved surface boundary.'])),
    organConfidence: Object.fromEntries(ids.map(id => ['frog|' + id, 2])),
  });
  const before = await proof(page), initialPhases = await phaseGuide(page);
  expect(initialPhases.find(phase => phase.current === 'step')?.text).toContain('Reveal');
  await page.locator('#diss-route-study').focus(); await page.keyboard.press('Space'); await phaseGuide(page);
  await page.locator('#diss-route-explore').focus(); await page.keyboard.press('Space');
  expect(await phaseGuide(page)).toEqual(initialPhases);
  expect({ ...await proof(page), guided: before.guided }).toEqual(before);
  await page.locator('.diss-workflow').screenshot({ path: `${out}/return-phases.png`, style: captureStyle });
});
for (const guided of [true, false]) test(`${guided ? 'Guided' : 'Identify'} view setup promises a chooser and preserves the current view`, async ({ page }) => {
  test.skip(baseline);
  await mount(page, {
    selectedOrgan: null, anatomicalView: 'ventral',
    exploredOrgans: guided ? initial.exploredOrgans : { 'frog|ventral_skin': true, 'frog|tympanum': true, 'frog|nictitating': true },
    guidedMode: guided, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'],
  });
  const before = await proof(page), card = page.locator('[data-dissection-next-action]');
  await expect(card).toHaveAttribute('data-next-action', 'visibility');
  const choose = card.getByRole('button', { name: 'Choose dorsal view', exact: true });
  await choose.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-view-cycle')).toBeFocused(); await expect(page.locator('#diss-view-tools')).toBeVisible();
  expect(await proof(page)).toEqual(before); await phaseGuide(page);
  await card.screenshot({ path: `${out}/choose-${guided ? 'guided' : 'identify'}-view.png`, style: captureStyle });
});
