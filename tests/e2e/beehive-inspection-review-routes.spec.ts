import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_REVIEW_ROUTES_ARTIFACTS || '.codex-artifacts/bee-inspection-review-routes-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Resource = 'brood' | 'cells';
function root(page: Page) { return page.locator('[data-beehive-root][data-review-routes-test-real="true"]'); }
function nextSteps(page: Page) { return root(page).locator('[data-inspection-review-next="true"]'); }
function disclosure(page: Page, kind: Resource) { return root(page).locator(kind === 'brood' ? '[data-inspection-brood-guide="true"]' : '[data-inspection-bottom-bar="true"]'); }
function toggle(page: Page, kind: Resource) { return disclosure(page, kind).locator('summary'); }
function resource(page: Page, kind: Resource) { return root(page).locator('[data-inspection-review-resource="' + kind + '"]'); }
function returnButton(page: Page, kind: Resource) { return root(page).locator('[data-inspection-review-return="' + kind + '"]'); }
function review(page: Page) { return root(page).locator('[data-inspection-feedback="true"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__reviewRoutesAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported review routes fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the review routes test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: true, hive3dFrame: 2,
      hive3dFramesSeen: [0, 2], hive3dPart: 'brood_frames', hive3dFoundQueen: false,
      inspectionDraft: { brood: 'spotty', cells: 'no' }, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: true },
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__reviewRoutesAwards = []; w.__reviewRoutesWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__reviewRoutesAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__reviewRoutesWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-beehive-root]').evaluate(node => node.setAttribute('data-review-routes-test-real', 'true'));
  await root(page).locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(root(page).locator('#beehive-interior-title')).toBeFocused();
  await expect(root(page).locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await expect(nextSteps(page)).toBeVisible();
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  // Establish keyboard modality after any management action used a pointer.
  await page.keyboard.press('Tab'); await control.focus(); await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none'); await page.keyboard.press(key);
}

async function structure(page: Page) {
  await expect(nextSteps(page)).toHaveJSProperty('tagName', 'SECTION');
  await expect(nextSteps(page).locator('#beehive-inspection-review-next-title')).toHaveText('Review with evidence');
  await expect(nextSteps(page)).toContainText('Saved results stay as recorded. Current observations can change after management actions.');
  await expect(review(page)).toHaveAttribute('role', 'status');
  const heading = review(page).locator('[data-inspection-review-title="true"]');
  await expect(heading).toHaveAttribute('id', 'beehive-inspection-review-title');
  await expect(heading).toHaveAttribute('tabindex', '-1');
  await expect(heading).toHaveAttribute('data-beehive-focus-panel', 'true');
  await expect(resource(page, 'brood')).toHaveAccessibleName('Review brood examples Open the example patterns.');
  await expect(resource(page, 'cells')).toHaveAccessibleName('Observe current bottom bar Open the current model drawing.');
  const placement = await nextSteps(page).evaluate(node => {
    const feedback = node.parentElement!.querySelector('[data-inspection-feedback]')!;
    return { siblings: feedback.parentElement === node.parentElement,
      after: !!(feedback.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
      outsideStatus: !node.closest('[role="status"]'), controls: node.querySelectorAll('[data-inspection-review-resource]').length };
  });
  expect(placement).toEqual({ siblings: true, after: true, outsideStatus: true, controls: 2 });
  await expect(review(page).locator('button')).toHaveCount(0);
  for (const kind of ['brood', 'cells'] as Resource[]) {
    await expect(disclosure(page, kind)).toHaveJSProperty('tagName', 'DETAILS');
    await expect(returnButton(page, kind)).toHaveText('Return to recorded inspection');
    expect(await returnButton(page, kind).evaluate(node => node.closest('[role="status"]') === null)).toBe(true);
  }
}

async function route(page: Page, kind: Resource, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page), savedText = await review(page).innerText();
  await page.evaluate(() => { (window as any).__reviewRoutesWrites = []; });
  await keyboardActivate(page, resource(page, kind), key);
  await expect(disclosure(page, kind)).toHaveJSProperty('open', true); await expect(toggle(page, kind)).toBeFocused();
  await expect(returnButton(page, kind)).toBeVisible();
  await expect(returnButton(page, kind)).toHaveAccessibleName('Return to recorded inspection');
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await review(page).innerText()).toBe(savedText);
  expect(await page.evaluate(() => (window as any).__reviewRoutesWrites)).toEqual([]);
}

async function returnToReview(page: Page, kind: Resource, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page), savedText = await review(page).innerText();
  await page.evaluate(() => { (window as any).__reviewRoutesWrites = []; });
  await keyboardActivate(page, returnButton(page, kind), key);
  const heading = root(page).locator('[data-inspection-review-title="true"]');
  await expect(heading).toBeFocused();
  const headingFocus = await heading.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(headingFocus.width).toBeGreaterThanOrEqual(2); expect(headingFocus.style).toBe('solid');
  await expect(disclosure(page, kind)).toHaveJSProperty('open', true);
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await review(page).innerText()).toBe(savedText);
  expect(await page.evaluate(() => (window as any).__reviewRoutesWrites)).toEqual([]);
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__reviewRoutesWrites = []; w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__reviewRoutesWrites)).toEqual([]);
}

async function audit(page: Page, mode: string, area: Resource | 'review') {
  const selectors = area === 'review' ? ['[data-inspection-feedback]', '[data-inspection-review-next]']
    : [area === 'brood' ? '[data-inspection-brood-guide]' : '[data-inspection-bottom-bar]'];
  const result = await page.evaluate(async selectors => {
    const nodes = selectors.map(selector => document.querySelector(selector)!);
    const checked = await (window as any).axe.run({ include: selectors }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    for (const node of nodes) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
      while ((textNode = walker.nextNode())) {
        if (textNode.parentElement?.closest('svg')) continue;
        const text = textNode.textContent || '';
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
          words.push({ word: match[0], context: textNode.parentElement?.textContent || text,
            rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
        }
      }
    }
    const elements = nodes.flatMap(node => [node, ...Array.from(node.querySelectorAll('*'))]);
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })), words,
      text: elements.filter(el => el.matches('summary,h3,h4,h5,p,strong,span,figcaption,dt,dd,button') && el.textContent?.trim()).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: elements.filter(el => el.matches('summary,button')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? elements.map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, selectors);
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'inspection-review-routes-layout-' + mode + '-' + area + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    for (const rect of item.rects) expect(Math.abs(rect.bottom - item.rects[0].bottom), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  expect(result.targets.length).toBeGreaterThan(0);
  for (const item of result.targets) { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); }
  for (const item of result.forcedAdjustments) expect(item.adjustment, item.text || '').toBe('auto');
}

async function capture(page: Page, mode: string, kind?: Resource) {
  fs.mkdirSync(artifacts, { recursive: true }); const pad = 6;
  // Main tiles show the recorded evidence and the following resource section.
  // Separate compact tiles show focused return controls at disclosure ends.
  const first = kind ? returnButton(page, kind) : review(page), last = kind ? first : nextSteps(page);
  const firstBox = await first.boundingBox(), lastBox = await last.boundingBox();
  expect(firstBox).not.toBeNull(); expect(lastBox).not.toBeNull();
  const scrollY = await page.evaluate(() => window.scrollY);
  const position = { top: firstBox!.y + scrollY - pad, height: lastBox!.y + lastBox!.height - firstBox!.y + pad * 2 };
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  const suffix = mode + (kind ? '-return-' + kind : '');
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(8); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const a = await first.boundingBox(), b = await last.boundingBox(); expect(a).not.toBeNull(); expect(b).not.toBeNull();
    const y = a!.y - pad + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, Math.min(a!.x, b!.x) - pad), right = Math.max(a!.x + a!.width, b!.x + b!.width);
    const width = Math.min(page.viewportSize()!.width - x, right - x + pad);
    const file = 'preview-inspection-review-routes-' + suffix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-inspection-review-routes-' + suffix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

async function focusReturnForPreview(page: Page, kind: Resource) {
  await page.keyboard.press('Tab'); await returnButton(page, kind).focus();
  await expect(returnButton(page, kind)).toBeFocused();
}

test('inspection review routes preserve saved work and held evidence while current observations follow real management', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await structure(page);
  const initial = await work(page), initialAwards = await awards(page), savedText = await review(page).innerText();
  for (const kind of ['brood', 'cells'] as Resource[]) await expect(disclosure(page, kind)).toHaveJSProperty('open', false);
  await keyboardActivate(page, root(page).locator('[data-interior-hold]'), 'Enter');
  await expect(root(page).locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  // A complete earlier hive has duplicate selectors and IDs. Only the live
  // source hive may open a disclosure or receive focus from these routes.
  await root(page).evaluate(node => {
    const decoy = node.cloneNode(true) as HTMLElement;
    decoy.removeAttribute('data-review-routes-test-real'); decoy.setAttribute('data-review-routes-test-decoy', 'true');
    for (const details of decoy.querySelectorAll<HTMLDetailsElement>('[data-inspection-brood-guide],[data-inspection-bottom-bar]')) details.open = false;
    node.before(decoy); (window as any).__reviewRoutesDecoyHtml = decoy.outerHTML;
  });
  const decoy = page.locator('[data-beehive-root][data-review-routes-test-decoy="true"]');
  await expect(decoy.locator('#beehive-inspection-review-title')).toHaveCount(1);
  await expect(decoy.locator('[data-inspection-review-title="true"]')).toHaveCount(1);
  await expect(decoy.locator('[data-inspection-review-return]')).toHaveCount(2);
  for (const kind of ['brood', 'cells'] as Resource[]) {
    await route(page, kind, 'Enter'); await returnToReview(page, kind, 'Space');
    // An already-open native disclosure still receives focus without closing.
    await route(page, kind, 'Space'); await returnToReview(page, kind, 'Enter');
    const beforeClose = await work(page); await page.evaluate(() => { (window as any).__reviewRoutesWrites = []; });
    await keyboardActivate(page, toggle(page, kind), 'Enter'); await expect(disclosure(page, kind)).toHaveJSProperty('open', false);
    expect(await work(page)).toEqual(beforeClose); expect(await page.evaluate(() => (window as any).__reviewRoutesWrites)).toEqual([]);
    await route(page, kind, 'Enter'); await returnToReview(page, kind, 'Enter');
    expect(await decoy.evaluate(node => node.outerHTML === (window as any).__reviewRoutesDecoyHtml)).toBe(true);
    await expect(decoy.locator('[data-inspection-review-title="true"]')).not.toBeFocused();
    for (const selector of ['[data-inspection-brood-guide]', '[data-inspection-bottom-bar]']) await expect(decoy.locator(selector)).toHaveJSProperty('open', false);
  }
  await decoy.evaluate(node => { node.remove(); delete (window as any).__reviewRoutesDecoyHtml; });
  await expect(root(page).locator('[data-inspection-bottom-bar-diagram]')).toHaveAttribute('data-shown', 'true');
  await expect(root(page).locator('[data-inspection-bottom-bar-description]')).toHaveText('Drawing: hanging forms beneath the bar.');
  await checkReadOnlyRender(page); expect(await work(page)).toEqual(initial); expect(await awards(page)).toEqual(initialAwards);

  await root(page).locator('[data-management-choice="add_super"]').click();
  await expect.poll(async () => (await work(page)).beehive.capacity).toBe(120);
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 10000 }).toBeNull();
  const managed = await work(page);
  expect(managed.beehive).toMatchObject({ day: 40, workers: 12000, capacity: 120, actionPoints: 2,
    inspectionDraft: initial.beehive.inspectionDraft, lastInspection: initial.beehive.lastInspection, inspectionsDone: 2,
    hive3dFrame: 2, hive3dFramesSeen: [0, 2], hive3dFoundQueen: false, notebook: initial.beehive.notebook });
  expect(managed.otherTool).toEqual(initial.otherTool);
  expect(await awards(page)).toEqual([...initialAwards, ['beehive', 5, 'Added super']]);
  await structure(page); await route(page, 'cells', 'Space');
  await expect(root(page).locator('[data-inspection-bottom-bar-diagram]')).toHaveAttribute('data-shown', 'false');
  await expect(root(page).locator('[data-inspection-bottom-bar-description]')).toHaveText('Drawing: bar without hanging forms.');
  expect(await review(page).innerText()).toBe(savedText);
  await expect(review(page).locator('[data-inspection-result="cells"] [data-inspection-expected]')).toHaveText('Yes');
  await returnToReview(page, 'cells', 'Enter'); await route(page, 'brood', 'Enter'); await returnToReview(page, 'brood', 'Space');
  await expect(root(page).locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  await expect(root(page).locator('[data-interior-change="brood"] [data-change-held]')).toHaveText('6,000 cells');
  await checkReadOnlyRender(page); expect(await work(page)).toEqual(managed);

  // Older records may lack grading fields; resource links must not silently
  // reconstruct or replace those saved answers from today's colony values.
  const unknownRecord = { day: 40, brood: 'spotty', cells: 'maybe' };
  await patch(page, { lastInspection: unknownRecord }); const unknownWork = await work(page);
  await structure(page); await expect(review(page).locator('[data-result="unknown"]')).toHaveCount(2);
  for (const kind of ['brood', 'cells'] as Resource[]) { await route(page, kind, 'Enter'); await returnToReview(page, kind, 'Space'); }
  await checkReadOnlyRender(page); expect(await work(page)).toEqual(unknownWork);
  const finalAwards = await awards(page);
  for (const value of [{ day: 41 }, { day: 40, lastInspection: null }, { day: 90, lastInspection: { ...unknownRecord, day: 90 } }]) {
    await patch(page, value); const before = await work(page);
    await expect(nextSteps(page)).toHaveCount(0); await expect(root(page).locator('[data-inspection-review-resource]')).toHaveCount(0);
    await expect(root(page).locator('[data-inspection-review-return]')).toHaveCount(0);
    await checkReadOnlyRender(page); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(finalAwards);
  }
  expect(errors).toEqual([]);
});

test('inspection review routes and return controls stay readable across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const before = await work(page), beforeAwards = await awards(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await structure(page);
    for (const kind of ['brood', 'cells'] as Resource[]) {
      await route(page, kind, 'Enter'); await focusReturnForPreview(page, kind);
      await audit(page, mode, kind); await capture(page, mode, kind); await returnToReview(page, kind, 'Space');
    }
    await audit(page, mode, 'review'); await capture(page, mode); await checkReadOnlyRender(page);
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  expect(errors).toEqual([]);
});
