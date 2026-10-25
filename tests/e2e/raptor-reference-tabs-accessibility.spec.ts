import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ retries: 0, timeout: 240000 });
const output = resolve(process.env.RAPTOR_REFERENCE_REPORT || 'reports/raptor-reference-wcag-20261024');
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1120, height: 900, appStyles: true, layout: 'document' });
const rootSelector = '[data-raptorhunt-root]';
const lists = { rehab: '[data-raptor-reference-tabs="rehab"]', anatomy: '[data-raptor-reference-tabs="anatomy"]' };
const panels = { rehab: '#rh-rehab-content', anatomy: '#rh-anatomy-workbench' };
const rehabIds = ['conditions', 'steps', 'ethics', 'directory'];
const anatomyKinds = ['skeleton', 'wing', 'talon', 'eye', 'ear', 'beak', 'organs'];
const distanceStudy = { version: 1, distance: 120, cycles: 12, contrast: 95, records: [{ version: 1, modelVersion: 1,
  distance: 80, cycles: 8, contrast: 95, widthM: .3, referenceLimit: 60, eagleLimit: 140,
  prediction: 'both', note: 'Earlier distance evidence remains available.' }] };

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function setup(page: Page, section: string, extra: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { raptorHunt: { activeSection: section, selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    xp: 97, huntStats: { attempts: 4, captures: 2 }, distantDetailStudy: distanceStudy, ...extra } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
  await expect(page.locator(rootSelector)).toHaveAttribute('data-raptor-active-section', section);
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, baseline: await state(page) };
}
async function state(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.raptorHunt))); }
async function preserved(page: Page, baseline: any, changed: string[]) {
  const current = await state(page), expected = { ...baseline };
  for (const name of changed) { delete current[name]; delete expected[name]; }
  expect(current).toEqual(expected); expect(current.distantDetailStudy).toEqual(distanceStudy);
  expect(await harness.glContexts(page)).toEqual([]);
}
function tabSelector(kind: 'rehab' | 'anatomy', index: number) {
  return kind === 'rehab' ? '#rh-rehab-tab-' + rehabIds[index] : '#rh-anatomy-tab-' + index;
}
async function tabState(page: Page, kind: 'rehab' | 'anatomy', index: number, focused = true) {
  const list = page.locator(lists[kind]), tabs = list.getByRole('tab'), selected = page.locator(tabSelector(kind, index));
  await expect(list).toHaveAttribute('role', 'tablist'); await expect(list).toHaveAccessibleName(kind === 'rehab' ? /Rehabilitation/ : /anatomy system/);
  await expect(tabs).toHaveCount(kind === 'rehab' ? 4 : 7);
  await expect(list.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
  await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  await expect(selected).toHaveAttribute('aria-selected', 'true'); await expect(selected).toHaveAttribute('tabindex', '0');
  for (let i = 0; i < await tabs.count(); i++) if (i !== index) {
    await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'false'); await expect(tabs.nth(i)).toHaveAttribute('tabindex', '-1');
  }
  const panel = page.locator(panels[kind]);
  await expect(selected).toHaveAttribute('aria-controls', panels[kind].slice(1)); await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute('aria-labelledby', await selected.getAttribute('id') as string);
  await expect(panel).toHaveAttribute('tabindex', '0'); await expect(panel).toBeVisible();
  expect((await panel.innerText()).trim().length).toBeGreaterThan(40);
  if (focused) await expect(selected).toBeFocused();
  if (kind === 'anatomy') await expect(page.locator('[data-raptor-anatomy-atlas]')).toHaveAttribute('data-anatomy-view', anatomyKinds[index]);
  return { index, tab: await selected.innerText(), panelLabel: await panel.getAttribute('aria-labelledby'), text: (await panel.innerText()).slice(0, 160) };
}
async function trackFocus(page: Page, kind: 'rehab' | 'anatomy') {
  await page.locator(lists[kind]).evaluate((list, panelSelector) => {
    (window as any).referenceFocus = [];
    for (const tab of Array.from(list.querySelectorAll('[role="tab"]'))) tab.addEventListener('focus', () => {
      const panel = document.querySelector(panelSelector)!;
      (window as any).referenceFocus.push({ id: tab.id, selected: tab.getAttribute('aria-selected'), tabIndex: tab.getAttribute('tabindex'), panelLabel: panel.getAttribute('aria-labelledby') });
    });
  }, panels[kind]);
}
async function focusChecks(page: Page) {
  const snapshots = await page.evaluate(() => (window as any).referenceFocus);
  expect(snapshots.length).toBeGreaterThan(3);
  for (const sample of snapshots) { expect(sample.selected).toBe('true'); expect(sample.tabIndex).toBe('0'); expect(sample.panelLabel).toBe(sample.id); }
  return snapshots;
}
async function activate(page: Page, selector: string, key = 'Enter') { await page.locator(selector).focus(); await page.keyboard.press(key); }
async function section(page: Page, id: string) {
  await page.locator('[data-raptor-section-switcher]').selectOption(id);
  await expect(page.locator(rootSelector)).toHaveAttribute('data-raptor-active-section', id);
}

test('rehabilitation tabs expose one keyboard stop, wrap with arrow keys and focus their current panel', async ({ page }) => {
  const initial = await setup(page, 'rehab', { rehabTab: 'not-a-saved-tab', rehabStateFilter: 'midwest' });
  const states = [await tabState(page, 'rehab', 0, false)];
  expect((await state(page)).rehabTab).toBe('not-a-saved-tab'); // Rendering fallback must not auto-save a replacement.
  await page.locator(tabSelector('rehab', 0)).focus(); await trackFocus(page, 'rehab');
  for (const [key, index] of [['ArrowRight', 1], ['ArrowRight', 2], ['ArrowRight', 3], ['ArrowRight', 0], ['ArrowLeft', 3], ['Home', 0], ['End', 3]] as [string, number][]) {
    await page.keyboard.press(key); states.push(await tabState(page, 'rehab', index));
    expect((await state(page)).rehabTab).toBe(rehabIds[index]);
  }
  for (const key of ['Control+ArrowRight', 'Shift+ArrowLeft', 'ArrowUp', 'ArrowDown']) {
    const before = await state(page); await page.keyboard.press(key); await tabState(page, 'rehab', 3); expect(await state(page)).toEqual(before);
  }
  const focus = await focusChecks(page);
  await page.keyboard.press('Tab'); await expect(page.locator(panels.rehab)).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator(tabSelector('rehab', 3))).toBeFocused();
  await page.locator(tabSelector('rehab', 1)).click(); await tabState(page, 'rehab', 1);
  await activate(page, tabSelector('rehab', 2), 'Space'); await tabState(page, 'rehab', 2);
  await activate(page, tabSelector('rehab', 3)); await tabState(page, 'rehab', 3);
  await expect(page.locator(panels.rehab).getByRole('button', { name: 'Midwest', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await preserved(page, initial.baseline, ['rehabTab']); expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'reference-rehab-keyboard.json'), JSON.stringify({ states, focus, invalidSavedValueRenderedWithoutRewrite: true,
    oneTabStop: true, nativeActivation: true, modifiedAndVerticalKeysIgnored: true, tabPanelRoundTrip: true, regionFilterAndSavedLearningPreserved: true }, null, 2));
});

test('anatomy tab activation updates plate labels before keyboard focus while retaining other learning state', async ({ page }) => {
  const initial = await setup(page, 'anatomyatlas', { anatomyView: .5, anatomyFocus: 999 });
  const states = [await tabState(page, 'anatomy', 0, false)];
  expect((await state(page)).anatomyView).toBe(.5); expect((await state(page)).anatomyFocus).toBe(999);
  await page.locator(tabSelector('anatomy', 0)).focus(); await trackFocus(page, 'anatomy');
  for (const [key, index] of [['ArrowLeft', 6], ['ArrowRight', 0], ['End', 6], ['Home', 0], ['ArrowRight', 1], ['ArrowRight', 2], ['ArrowRight', 3], ['ArrowRight', 4], ['ArrowRight', 5]] as [string, number][]) {
    await page.keyboard.press(key); states.push(await tabState(page, 'anatomy', index));
    expect((await state(page)).anatomyView).toBe(index); expect((await state(page)).anatomyFocus).toBe(0);
  }
  for (const key of ['Control+ArrowLeft', 'Shift+ArrowRight', 'ArrowUp', 'ArrowDown']) {
    const before = await state(page); await page.keyboard.press(key); await tabState(page, 'anatomy', 5); expect(await state(page)).toEqual(before);
  }
  const focus = await focusChecks(page);
  await page.keyboard.press('Tab'); await expect(page.locator(panels.anatomy)).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator(tabSelector('anatomy', 5))).toBeFocused();
  await page.locator(tabSelector('anatomy', 0)).click(); await tabState(page, 'anatomy', 0);
  const hotspots = page.locator('[data-raptor-anatomy-stage] button'); await hotspots.nth(2).click();
  expect((await state(page)).anatomyFocus).toBe(2);
  await activate(page, tabSelector('anatomy', 1), 'Space'); await tabState(page, 'anatomy', 1); expect((await state(page)).anatomyFocus).toBe(0);
  await preserved(page, initial.baseline, ['anatomyView', 'anatomyFocus']); expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'reference-anatomy-keyboard.json'), JSON.stringify({ anatomy: { states, focus,
    invalidSavedValuesRenderedWithoutRewrite: true, oneTabStop: true, nativeActivation: true, modifiedAndVerticalKeysIgnored: true,
    tabPanelRoundTrip: true, structureSelectionResetsOnNewPlate: true, savedLearningPreserved: true } }, null, 2));
});

test('history era buttons filter the same timeline using pressed state and ordinary button keyboard behavior', async ({ page }) => {
  const initial = await setup(page, 'history', { historyEra: 'not-a-saved-era' });
  const group = page.locator('[data-raptor-history-filter="era"]'), results = page.locator('[data-raptor-history-results]');
  await expect(group).toHaveAttribute('role', 'group'); await expect(group).toHaveAccessibleName(/History of Raptor Science/);
  await expect(group.locator('[role="tab"], [role="tablist"], [aria-selected]')).toHaveCount(0);
  await expect(results).toHaveAttribute('aria-labelledby', /\S+/);
  const heading = await results.getAttribute('aria-labelledby'); await expect(page.locator('#' + heading)).toContainText('History');
  expect((await state(page)).historyEra).toBe('not-a-saved-era');
  const rows = async () => results.locator(':scope > div').evaluateAll(nodes => nodes.map(node => {
    const text = (node as HTMLElement).innerText, match = /^(\d+)\s+(BCE|CE)/.exec(text.trim());
    return { year: match ? Number(match[1]) * (match[2] === 'BCE' ? -1 : 1) : null, text };
  }));
  const all = await rows(); expect(all.length).toBeGreaterThan(20); expect(all.every(row => row.year !== null)).toBe(true);
  const eras = [ ['all', () => true], ['ancient', (year: number) => year < 1500], ['early', (year: number) => year >= 1500 && year < 1900],
    ['crisis', (year: number) => year >= 1900 && year < 2000], ['modern', (year: number) => year >= 2000] ] as const;
  const states: any[] = [];
  for (let index = 0; index < eras.length; index++) {
    const [era, predicate] = eras[index], button = page.locator('[data-raptor-history-era="' + era + '"]');
    await activate(page, '[data-raptor-history-era="' + era + '"]', index % 2 ? 'Space' : 'Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true'); await expect(button).toBeFocused();
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    const expected = all.filter(row => predicate(row.year as number)); expect(await rows()).toEqual(expected);
    const count = /\((\d+)\)$/.exec((await button.innerText()).trim()); expect(Number(count?.[1])).toBe(expected.length);
    const before = await state(page); await page.keyboard.press('ArrowRight'); expect(await state(page)).toEqual(before);
    states.push({ era, count: expected.length, years: expected.map(row => row.year) });
  }
  await preserved(page, initial.baseline, ['historyEra']); expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'reference-history.json'), JSON.stringify({ initialTimeline: all, states, exactTimelineSubsets: true,
    namedButtonGroup: true, noTabSemantics: true, nativeEnterAndSpace: true, arrowsDoNotFilter: true,
    invalidSavedValueRenderedWithoutRewrite: true, savedLearningPreserved: true }, null, 2));
});

test('reference navigation supports 320px text spacing, visible forced-color focus and automated accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const initial = await setup(page, 'rehab'); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(name: string, scope: string) {
    const result = await page.locator(scope).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, forcedColors: matchMedia('(forced-colors: active)').matches,
        violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.passes, ...audit.incomplete, ...audit.violations].reduce((sum, rule) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state: name, scope, ...result });
    writeFileSync(resolve(output, 'reference-axe.json'), JSON.stringify({ scope: 'Reference navigation controls and their current content',
      limitation: 'Normal-palette axe scans do not certify complete WCAG conformance. Incomplete checks require review. Forced-color layout and keyboard presentation are checked separately because of axe-core issue 3978.', scans }, null, 2));
    expect(result.forcedColors).toBe(false); expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, name + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  const rehabScope = '.rh-reference-rehab';
  const rehabRoot = await page.locator(lists.rehab).evaluate(node => { const parent = node.parentElement!; parent.classList.add('rh-reference-rehab'); return parent.className; });
  expect(rehabRoot).toContain('rh-reference-rehab');
  await scan('rehabilitation initial', rehabScope); await activate(page, tabSelector('rehab', 0)); await page.keyboard.press('ArrowRight');
  await tabState(page, 'rehab', 1); await scan('rehabilitation selected steps', rehabScope);
  await section(page, 'anatomyatlas'); await scan('anatomy initial', '[data-raptor-anatomy-atlas]');
  const anatomyTargets: any[] = [];
  for (let plate = 0; plate < anatomyKinds.length; plate++) {
    await page.locator(tabSelector('anatomy', plate)).click(); await tabState(page, 'anatomy', plate);
    const diagramGeometry = await page.locator('.rh-anatomy-diagram').evaluate((diagram: HTMLElement) => {
      const svg = diagram.querySelector('svg') as SVGSVGElement, parentBox = diagram.getBoundingClientRect(), svgBox = svg.getBoundingClientRect();
      const parentStyle = getComputedStyle(diagram), svgStyle = getComputedStyle(svg), viewBox = svg.viewBox.baseVal;
      const matrix = svg.getScreenCTM(); if (!matrix) throw new Error('Anatomy diagram has no rendered SVG coordinate matrix');
      const map = (x: number, y: number) => { const point = svg.createSVGPoint(); point.x = x; point.y = y; const result = point.matrixTransform(matrix); return { x: result.x, y: result.y }; };
      const box = (value: DOMRect) => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height });
      const style = (value: CSSStyleDeclaration) => ({ width: value.width, minWidth: value.minWidth, minHeight: value.minHeight });
      return { parent: { ...box(parentBox), computed: style(parentStyle) }, svg: { ...box(svgBox), computed: style(svgStyle),
        viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
        mappedViewBox: { topLeft: map(0, 0), bottomRight: map(640, 420) } } };
    });
    expect(diagramGeometry.svg.viewBox).toEqual({ x: 0, y: 0, width: 640, height: 420 });
    expect(diagramGeometry.svg.left, `${anatomyKinds[plate]} SVG left`).toBeGreaterThanOrEqual(diagramGeometry.parent.left - 1);
    expect(diagramGeometry.svg.right, `${anatomyKinds[plate]} SVG right`).toBeLessThanOrEqual(diagramGeometry.parent.right + 1);
    expect(diagramGeometry.svg.top, `${anatomyKinds[plate]} SVG top`).toBeGreaterThanOrEqual(diagramGeometry.parent.top - 1);
    expect(diagramGeometry.svg.bottom, `${anatomyKinds[plate]} SVG bottom`).toBeLessThanOrEqual(diagramGeometry.parent.bottom + 1);
    for (const [corner, point] of Object.entries(diagramGeometry.svg.mappedViewBox)) {
      expect(point.x, `${anatomyKinds[plate]} ${corner} mapped x`).toBeGreaterThanOrEqual(diagramGeometry.parent.left - 1);
      expect(point.x, `${anatomyKinds[plate]} ${corner} mapped x`).toBeLessThanOrEqual(diagramGeometry.parent.right + 1);
      expect(point.y, `${anatomyKinds[plate]} ${corner} mapped y`).toBeGreaterThanOrEqual(diagramGeometry.parent.top - 1);
      expect(point.y, `${anatomyKinds[plate]} ${corner} mapped y`).toBeLessThanOrEqual(diagramGeometry.parent.bottom + 1);
    }
    const grid = page.locator('.rh-anatomy-hotspot-controls');
    await grid.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    expect(diagramGeometry.parent.left).toBeGreaterThanOrEqual(-1);
    expect(diagramGeometry.parent.right).toBeLessThanOrEqual(321);
    const targets = await grid.evaluate(node => Array.from(node.querySelectorAll('button')).map(button => {
      const box = button.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { label: button.getAttribute('aria-label'), title: button.title, left: box.left, right: box.right,
        top: box.top, bottom: box.bottom, width: box.width, height: box.height,
        center: { x, y }, centerHitsControl: !!hit && (hit === button || button.contains(hit)) };
    }));
    expect(targets.length).toBeGreaterThan(0);
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      expect(target.width, `${anatomyKinds[plate]} ${target.title} width`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${anatomyKinds[plate]} ${target.title} height`).toBeGreaterThanOrEqual(44);
      expect(target.left).toBeGreaterThanOrEqual(-1); expect(target.right).toBeLessThanOrEqual(321);
      expect(target.centerHitsControl, `${anatomyKinds[plate]} ${target.title} center hit`).toBe(true);
      for (let other = index + 1; other < targets.length; other++) {
        const next = targets[other], overlapX = Math.min(target.right, next.right) - Math.max(target.left, next.left);
        const overlapY = Math.min(target.bottom, next.bottom) - Math.max(target.top, next.top);
        expect(overlapX <= .5 || overlapY <= .5, `${target.title} and ${next.title} do not overlap`).toBe(true);
      }
      const button = grid.locator('button').nth(index);
      await button.focus(); await page.keyboard.press('Enter');
      await expect(button).toBeFocused(); await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#rh-anatomy-detail-title')).toHaveText(target.title);
      expect((await state(page)).anatomyFocus).toBe(index);
    }
    anatomyTargets.push({ plate: anatomyKinds[plate], targets, diagramGeometry, minimum44PixelTargets: true, noOverlaps: true,
      allCentersHitTheirControl: true, everyStructureSelectedByKeyboard: true });
  }
  await page.locator(tabSelector('anatomy', 0)).focus(); await page.keyboard.press('ArrowRight'); await tabState(page, 'anatomy', 1);
  await scan('anatomy selected wing', '[data-raptor-anatomy-atlas]');
  await page.locator('[data-raptor-anatomy-atlas]').screenshot({ path: resolve(output, 'reference-anatomy-mobile.jpg'), type: 'jpeg', quality: 90 });
  await section(page, 'history');
  await page.locator('[data-raptor-history-filter="era"]').evaluate(node => node.parentElement!.classList.add('rh-reference-history'));
  await scan('history all eras', '.rh-reference-history'); await activate(page, '[data-raptor-history-era="modern"]', 'Space');
  await scan('history selected modern era', '.rh-reference-history'); expect(scans).toHaveLength(6);
  await section(page, 'rehab'); await page.locator(tabSelector('rehab', 0)).focus(); await page.keyboard.press('ArrowRight'); await tabState(page, 'rehab', 1);
  await page.addStyleTag({ content: '[data-raptorhunt-root], [data-raptorhunt-root] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptorhunt-root] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.locator(tabSelector('rehab', 1)).focus(); await page.keyboard.press('ArrowRight'); await tabState(page, 'rehab', 2);
  const beforePresentation = await state(page);
  const layout = await page.locator(lists.rehab).evaluate((list: HTMLElement) => {
    const r = list.getBoundingClientRect(), selected = list.querySelector('[aria-selected="true"]') as HTMLElement, css = getComputedStyle(selected);
    const targets = Array.from(list.querySelectorAll('button')).map(node => { const box = node.getBoundingClientRect(); return { name: node.textContent?.trim(), left: box.left, right: box.right, width: box.width, height: box.height }; });
    const overflow = Array.from(list.querySelectorAll('button')).filter(node => node.scrollWidth > node.clientWidth + 2).map(node => node.textContent);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: r.left, right: r.right, targets, overflow,
      forcedColors: matchMedia('(forced-colors: active)').matches,
      focus: { visible: selected.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor },
      spacing: { font: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), letter: parseFloat(css.letterSpacing), word: parseFloat(css.wordSpacing) } };
  });
  expect(layout.viewport).toBe(320); expect(layout.documentWidth).toBeLessThanOrEqual(321); expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.forcedColors).toBe(true); expect(layout.overflow).toEqual([]); expect(layout.targets).toHaveLength(4);
  for (const target of layout.targets) { expect(target.left).toBeGreaterThanOrEqual(-1); expect(target.right).toBeLessThanOrEqual(321); expect(target.width).toBeGreaterThanOrEqual(24); expect(target.height).toBeGreaterThanOrEqual(24); }
  expect(layout.focus.visible).toBe(true); expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1); expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1);
  await page.keyboard.press('Tab'); await expect(page.locator(panels.rehab)).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(page.locator(tabSelector('rehab', 2))).toBeFocused();
  expect(await state(page)).toEqual(beforePresentation);
  await page.locator(lists.rehab).evaluate(node => node.parentElement!.classList.add('rh-reference-rehab-final'));
  await page.locator('.rh-reference-rehab-final').screenshot({ path: resolve(output, 'reference-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  expect(initial.errors).toEqual([]); expect(await harness.glContexts(page)).toEqual([]); expect((await state(page)).distantDetailStudy).toEqual(distanceStudy);
  writeFileSync(resolve(output, 'reference-reflow.json'), JSON.stringify({ layout, anatomyTargets, sixNormalPaletteScans: true,
    keyboardPanelRoundTripInForcedColors: true, presentationDoesNotChangeSavedState: true, distanceLearningPreserved: true }, null, 2));
});
