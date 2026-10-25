import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND11_REPORT || 'reports/raptor-distance-round11-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceAccessibilityNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  nav: '[data-distance-nav]', inspector: '[data-distance-inspector]', signal: '[data-distance-signal]',
  text: '[data-distance-text-comparison]', textCondition: '[data-distance-text-condition]',
  current: '[data-distance-inspector-source="current"]', pinned: '[data-distance-inspector-source="pinned"]',
  note: '[data-distance-note]', reveal: '[data-distance-reveal]', probe: '[data-distance-signal-probe]'
};
const jumpTargets = {
  conditions: '#rh-distance-distance', prediction: '[data-distance-prediction-heading]',
  inspector: '[data-distance-inspector] > summary', signal: '[data-distance-signal] > summary', notebook: '[data-distance-note]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'My earlier saved observation.'
};
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, i) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: i ? 'eagle' : 'both'
})) }, eagle: { version: 1, modelVersion: 1, reference: 'eagle', trials: [200, 201].map((distance, i) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: i ? 'neither' : 'eagle'
})) } };

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).distanceAccessibilityRafs = 0; (window as any).distanceAccessibilityCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).distanceAccessibilityRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).distanceAccessibilityCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceAccessibilityNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true,
    graphicsQuality: 'low', xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}

async function keyboardActivate(page: Page, selector: string) {
  await page.locator(selector).focus(); await page.keyboard.press('Enter');
}

async function open(page: Page) {
  await keyboardActivate(page, ui.launch);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.root + ' h3')).toBeFocused();
}

async function jump(page: Page, name: keyof typeof jumpTargets) {
  await keyboardActivate(page, '[data-distance-jump="' + name + '"]');
  await expect(page.locator(jumpTargets[name])).toBeFocused();
  await expect(page.locator(jumpTargets[name])).toHaveCSS('outline-width', '3px');
  if (name === 'inspector' || name === 'signal') await expect(page.locator(ui[name])).toHaveAttribute('open', '');
}

async function reveal(page: Page) {
  await jump(page, 'prediction'); await page.keyboard.press('Tab');
  await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await page.keyboard.press('Enter'); await keyboardActivate(page, ui.reveal);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    diagnostics: root._distanceScene.getDiagnostics(), captures: (window as any).distanceAccessibilityCaptures,
    rafs: (window as any).distanceAccessibilityRafs, persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function textEvidence(page: Page, distance: number, source: 'current' | 'pinned', cycles = 12) {
  await expect(page.locator(ui.text + ' > summary')).toHaveText('Read the detail comparison as text');
  if (await page.locator(ui.text).getAttribute('open') === null) await keyboardActivate(page, ui.text + ' > summary');
  await expect(page.locator(ui.text + ' table')).toBeVisible();
  await expect(page.locator(ui.textCondition)).toContainText(new RegExp(source, 'i'));
  await expect(page.locator(ui.textCondition)).toContainText(distance + ' m');
  const angle = 2 * Math.atan(.3 / (2 * distance)) * 180 / Math.PI, frequency = cycles / angle;
  await expect(page.locator(ui.text)).toContainText(angle.toFixed(3));
  await expect(page.locator(ui.text)).toContainText(frequency.toFixed(1));
  const rows = [];
  for (const [id, limit] of [['human', 60], ['eagle', 140]] as const) {
    const transfer = Math.exp(-Math.log(10) * (frequency / limit) ** 2);
    const row = page.locator('[data-distance-text-reference="' + id + '"]');
    await expect(row.locator('th[scope="row"]')).toContainText(id === 'human' ? 'Human' : 'Eagle');
    await expect(row).toContainText(String(limit));
    const cell = page.locator('[data-distance-text-transfer="' + id + '"]');
    expect(Number(await cell.getAttribute('data-transfer'))).toBeCloseTo(transfer, 10);
    await expect(cell).toContainText((transfer * 100).toFixed(1) + '%');
    rows.push({ id, limit, transfer, text: await row.innerText() });
  }
  return { distance, source, angle, frequency, rows };
}

async function richState(page: Page) {
  await reveal(page); await keyboardActivate(page, '[data-distance-pin]');
  await jump(page, 'inspector'); await keyboardActivate(page, ui.text + ' > summary');
  await keyboardActivate(page, '[data-distance-magnifier] > summary');
  await keyboardActivate(page, '[data-distance-magnifier-zoom="4"]');
  await jump(page, 'signal'); await keyboardActivate(page, '[data-distance-signal-read]');
  await expect(page.locator('[data-distance-signal-evidence]')).toBeVisible();
  await keyboardActivate(page, '[data-distance-signal-keep]');
  await expect(page.locator('[data-distance-signal-kept-heading]')).toBeFocused();
  await jump(page, 'notebook'); await page.keyboard.type('The table and pixel values let me compare the same conditions.');
  await expect(page.locator('[data-distance-save]')).toBeEnabled();
}

async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).distanceAccessibilityClosedScene = root._distanceScene; });
  await keyboardActivate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).distanceAccessibilityClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard shortcuts expose source-synced text evidence without changing learning state and preserve focus', async ({ page }) => {
  const initial = await setup(page); await open(page);
  await expect(page.locator(ui.root + ' h3')).toHaveCSS('outline-width', '3px');
  const initialWork = await work(page);
  await expect(page.getByRole('slider', { name: 'Viewing distance', exact: true })).toHaveAttribute('aria-valuetext', /120.*met/);
  await expect(page.getByRole('slider', { name: 'Light–dark stripe pairs', exact: true })).toHaveAttribute('aria-valuetext', /12.*stripe/);
  await expect(page.getByRole('slider', { name: 'Display contrast', exact: true })).toHaveAttribute('aria-valuetext', /95.*(percent|%)/);
  const navKeys = Object.keys(jumpTargets) as (keyof typeof jumpTargets)[];
  await page.keyboard.press('Tab'); await expect(page.locator(ui.close)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-jump="conditions"]')).toBeFocused();
  for (const name of navKeys.slice(1)) { await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-jump="' + name + '"]')).toBeFocused(); }
  for (const name of navKeys.slice(0, -1).reverse()) { await page.keyboard.press('Shift+Tab'); await expect(page.locator('[data-distance-jump="' + name + '"]')).toBeFocused(); }
  for (const name of navKeys) await jump(page, name);
  expect(await work(page)).toEqual(initialWork);
  await jump(page, 'inspector');
  await expect(page.locator(ui.text)).toHaveCount(0);
  await reveal(page); const evidence = [await textEvidence(page, 120, 'current')];
  await keyboardActivate(page, '[data-distance-pin]');
  await jump(page, 'conditions'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#rh-distance-distance')).toHaveValue('121');
  await expect(page.locator('#rh-distance-distance')).toHaveAttribute('aria-valuetext', /121.*met/);
  await expect(page.locator(ui.text + ' table')).toHaveCount(0);
  await setRange(page, 'distance', 200);
  await keyboardActivate(page, ui.pinned); evidence.push(await textEvidence(page, 120, 'pinned'));
  await keyboardActivate(page, ui.current); await expect(page.locator(ui.text + ' table')).toHaveCount(0);
  await reveal(page); evidence.push(await textEvidence(page, 200, 'current'));
  await jump(page, 'notebook'); await page.keyboard.type('At 200 metres, the table compares two filters under the same conditions.');
  const beforeNavigation = await work(page);
  for (const name of navKeys) await jump(page, name);
  await keyboardActivate(page, ui.pinned); evidence.push(await textEvidence(page, 120, 'pinned'));
  await keyboardActivate(page, ui.current); evidence.push(await textEvidence(page, 200, 'current'));
  expect(await work(page)).toEqual(beforeNavigation);
  await expect(page.locator(ui.note)).toHaveValue('At 200 metres, the table compares two filters under the same conditions.');
  await expect(page.locator('[data-distance-draft-stale]')).toHaveCount(0);
  await keyboardActivate(page, '[data-distance-save]'); await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator('[data-distance-record]')).toHaveCount(2);
  const saved = (await work(page)).persisted;
  expect(saved.records[0]).toEqual(priorRecord); expect(saved.records[1].distance).toBe(200);
  expect(saved.fieldworkResults).toEqual(beforeNavigation.persisted.fieldworkResults);
  writeFileSync(resolve(output, 'a11y-keyboard-evidence.json'), JSON.stringify({ evidence, saved, noNavigationWrites: true, focusReturnsToNote: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('automated WCAG checks cover initial, revealed and expanded evidence states', async ({ page }) => {
  const initial = await setup(page); await open(page);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const options = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } };
      const audit = await (window as any).axe.run(root, options);
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, description: rule.description, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        passedRules: audit.passes.map((rule: any) => rule.id), inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((count: number, rule: any) => count + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result });
    writeFileSync(resolve(output, 'a11y-axe.json'), JSON.stringify({ scope: ui.root, limitation: 'Automated checks are not a full WCAG conformance assessment; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0);
    expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await scan('initial'); await reveal(page); await scan('revealed');
  // Rich state starts from this same reveal; no replacement of the native loader or scene.
  await keyboardActivate(page, '[data-distance-pin]');
  await jump(page, 'inspector'); await keyboardActivate(page, ui.text + ' > summary');
  await keyboardActivate(page, '[data-distance-magnifier] > summary'); await keyboardActivate(page, '[data-distance-magnifier-zoom="4"]');
  await jump(page, 'signal'); await keyboardActivate(page, '[data-distance-signal-read]'); await keyboardActivate(page, '[data-distance-signal-keep]');
  await jump(page, 'notebook'); await page.keyboard.type('Accessible evidence remains available with a pin, magnifier and pixel reading.');
  await scan('expanded text, magnifier, signal, kept reading, pin and note');
  // axe's label-content-name-mismatch rule does not match native ranges;
  // verify their real accessible names directly instead of claiming an empty scan passed.
  for (const name of ['Viewing distance', 'Light–dark stripe pairs', 'Display contrast', 'Human model share of comparison', 'Move crop horizontally', 'Move crop vertically', 'Move the pixel probe']) {
    await expect(page.getByRole('slider', { name, exact: true })).toHaveCount(1);
  }
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('320px reflow and user text spacing retain readable evidence and usable targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page); await richState(page);
  async function layout() {
    return page.locator(ui.root).evaluate((root: HTMLElement) => {
      const bounds = root.getBoundingClientRect();
      const visible = (element: Element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS' && !(parent as HTMLDetailsElement).open && !parent.querySelector(':scope > summary')?.contains(element)) return false;
        }
        return !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
      };
      const targets = Array.from(root.querySelectorAll('button,summary,input[type="range"],textarea')).filter(element => visible(element) && !(element as HTMLInputElement).disabled).map(element => {
        const r = element.getBoundingClientRect(); return { name: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 75) || element.id, width: r.width, height: r.height, left: r.left, right: r.right };
      });
      const overflow = Array.from(root.querySelectorAll('p,h3,h4,h5,label,button,summary,th,td,caption')).filter(visible).filter(element => {
        const node = element as HTMLElement; return node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2;
      }).map(element => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 100), width: element.clientWidth, scrollWidth: element.scrollWidth }));
      const clippedText: any[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, parent = node.parentElement;
        if (!node.textContent?.trim() || !parent || parent.closest('svg,style,script,textarea,canvas') || !visible(parent)) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const textRect of Array.from(range.getClientRects())) {
          let ancestor: HTMLElement | null = parent;
          while (ancestor && root.contains(ancestor)) {
            const css = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
            const x = ['hidden', 'clip'].includes(css.overflowX), y = ['hidden', 'clip'].includes(css.overflowY);
            if ((x && (textRect.left < r.left - 2 || textRect.right > r.right + 2)) || (y && (textRect.top < r.top - 2 || textRect.bottom > r.bottom + 2))) {
              clippedText.push({ text: node.textContent.trim().slice(0, 80), ancestor: ancestor.className }); break;
            }
            ancestor = ancestor.parentElement;
          }
        }
      }
      const paragraph = root.querySelector('p')!, style = getComputedStyle(paragraph);
      return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right,
        targets, overflow, clippedText, spacing: { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
          letterSpacing: parseFloat(style.letterSpacing), wordSpacing: parseFloat(style.wordSpacing), marginBottom: parseFloat(style.marginBottom) } };
    });
  }
  // Exercise disclosed content too; hidden native-details content is not a clipping failure.
  await page.locator(ui.root + ' details').evaluateAll(elements => elements.forEach(element => { (element as HTMLDetailsElement).open = true; }));
  const normal = await layout(), before = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  const spaced = await layout();
  writeFileSync(resolve(output, 'a11y-reflow.json'), JSON.stringify({ normal, spaced }, null, 2));
  for (const result of [normal, spaced]) {
    expect(result.viewport).toBe(320); expect(result.documentWidth).toBeLessThanOrEqual(321);
    expect(result.left).toBeGreaterThanOrEqual(-1); expect(result.right).toBeLessThanOrEqual(321);
    expect(result.targets.length).toBeGreaterThan(25);
    for (const target of result.targets) { expect(target.width, target.name).toBeGreaterThanOrEqual(24); expect(target.height, target.name).toBeGreaterThanOrEqual(24); expect(target.left, target.name).toBeGreaterThanOrEqual(-1); expect(target.right, target.name).toBeLessThanOrEqual(321); }
    expect(result.overflow).toEqual([]); expect(result.clippedText).toEqual([]);
  }
  expect(spaced.spacing.lineHeight).toBeCloseTo(spaced.spacing.fontSize * 1.5, 1);
  expect(spaced.spacing.letterSpacing).toBeCloseTo(spaced.spacing.fontSize * .12, 1);
  expect(spaced.spacing.wordSpacing).toBeCloseTo(spaced.spacing.fontSize * .16, 1);
  expect(spaced.spacing.marginBottom).toBeCloseTo(spaced.spacing.fontSize * 2, 1);
  expect(await work(page)).toEqual(before);
  await page.locator(ui.text).screenshot({ path: resolve(output, 'a11y-mobile-text-spacing.jpg'), type: 'jpeg', quality: 88 });
  await jump(page, 'notebook'); await expect(page.locator('[data-distance-save]')).toBeEnabled();
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('forced colors separate keyboard focus from selection and retain textual chart access', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const initial = await setup(page); await open(page); await richState(page);
  const before = await work(page);
  const selected = page.locator('[data-distance-magnifier-zoom="4"]'), unselected = page.locator('[data-distance-magnifier-zoom="2"]');
  await selected.focus(); await page.keyboard.press('Shift+Tab'); await expect(unselected).toBeFocused();
  const cues = await Promise.all([selected, unselected].map(control => control.evaluate(element => {
    const css = getComputedStyle(element); return { pressed: element.getAttribute('aria-pressed'), focused: element.matches(':focus-visible'),
      border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth),
      outlineOffset: parseFloat(css.outlineOffset), foreground: css.color, background: css.backgroundColor };
  })));
  expect(cues[0]).toMatchObject({ pressed: 'true', focused: false, border: 'double', borderWidth: 3 });
  expect(cues[1]).toMatchObject({ pressed: 'false', focused: true });
  expect(cues[1].border).not.toBe('double'); expect(cues[1].outline).not.toBe('none'); expect(cues[1].outlineWidth).toBeGreaterThanOrEqual(3);
  await jump(page, 'inspector');
  const summaryFocus = await page.locator(jumpTargets.inspector).evaluate(element => {
    const css = getComputedStyle(element); return { visible: element.matches(':focus-visible'), style: css.outlineStyle, width: parseFloat(css.outlineWidth), offset: parseFloat(css.outlineOffset) };
  });
  expect(summaryFocus.visible).toBe(true); expect(summaryFocus.style).not.toBe('none'); expect(summaryFocus.width).toBeGreaterThanOrEqual(3); expect(summaryFocus.offset).toBeLessThanOrEqual(-3);
  await textEvidence(page, 120, 'current');
  await page.locator(ui.inspector).screenshot({ path: resolve(output, 'a11y-forced-colors.jpg'), type: 'jpeg', quality: 88 });
  await jump(page, 'signal');
  await expect(page.getByRole('slider', { name: /^Move the pixel probe/ })).toBeVisible();
  await page.locator(ui.probe).focus(); await page.keyboard.press('Home');
  await expect(page.locator(ui.probe)).toHaveValue('0');
  const start = await page.locator('[data-distance-signal-pixel]').getAttribute('data-x');
  await page.keyboard.press('ArrowRight'); await expect(page.locator(ui.probe)).toHaveValue('1');
  expect(Number(await page.locator('[data-distance-signal-pixel]').getAttribute('data-x'))).toBe(Number(start) + 1);
  for (const id of ['human', 'eagle']) {
    const value = await page.locator('[data-distance-signal-value="' + id + '"]').innerText();
    await expect(page.locator(ui.probe)).toHaveAttribute('aria-valuetext', new RegExp(value.replace('.', '\\.')));
  }
  await expect(page.getByRole('table', { name: /Measured RGB code values/ })).toBeVisible();
  const lines = await page.locator('[data-distance-signal-line]').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-distance-signal-line'), dash: element.getAttribute('stroke-dasharray'), stroke: getComputedStyle(element).stroke })));
  expect(lines.find(line => line.id === 'human')?.dash).toBeTruthy(); expect(lines.find(line => line.id === 'eagle')?.dash).toBeNull();
  expect(lines.every(line => line.stroke !== 'none' && line.stroke !== 'transparent')).toBe(true);
  await keyboardActivate(page, '[data-distance-fieldwork] > summary');
  await expect(page.locator('[data-distance-results-plot]')).toBeVisible();
  const bars = await page.locator('[data-distance-results-range] rect').evaluateAll(elements => elements.map(element => {
    const css = getComputedStyle(element); return { interval: element.hasAttribute('data-distance-results-interval'), fill: css.fill, stroke: css.stroke, strokeWidth: parseFloat(css.strokeWidth), background: getComputedStyle(element.closest('svg')!).backgroundColor };
  }));
  expect(bars).toHaveLength(4);
  for (const bar of bars) { expect(bar.stroke).not.toBe('none'); expect(bar.strokeWidth).toBeGreaterThanOrEqual(1); if (bar.interval) expect(bar.fill).not.toBe(bar.background); }
  expect(bars[0].fill).not.toBe(bars[1].fill);
  expect(await work(page)).toEqual(before);
  await keyboardActivate(page, '[data-distance-match] > summary');
  await keyboardActivate(page, '[data-distance-match-start]'); await reveal(page); await keyboardActivate(page, '[data-distance-pin]');
  const meters = await page.locator('.rh-distance-match-track').evaluateAll(elements => elements.map(element => {
    const fill = element.firstElementChild!, trackStyle = getComputedStyle(element), fillStyle = getComputedStyle(fill);
    return { name: element.getAttribute('aria-label'), value: Number(element.getAttribute('aria-valuenow')), text: element.getAttribute('aria-valuetext'), background: trackStyle.backgroundColor, fill: fillStyle.backgroundColor, fillWidth: fill.getBoundingClientRect().width, forcedAdjustment: trackStyle.forcedColorAdjust };
  }));
  expect(meters).toHaveLength(2);
  for (const meter of meters) { expect(meter.fill).not.toBe(meter.background); expect(meter.fillWidth).toBeGreaterThan(0); expect(meter.value).toBeGreaterThan(0); expect(meter.text).toContain('percent'); expect(meter.forcedAdjustment).toBe('none'); }
  await page.locator('.rh-distance-match-views').screenshot({ path: resolve(output, 'a11y-forced-meter.jpg'), type: 'jpeg', quality: 88 });
  writeFileSync(resolve(output, 'a11y-forced-colors.json'), JSON.stringify({ cues, summaryFocus, lines, bars, meters, textualChartValues: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
