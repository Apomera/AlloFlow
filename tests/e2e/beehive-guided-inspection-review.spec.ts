import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800,
});
const artifacts = path.resolve(process.env.BEE_INSPECTION_REVIEW_ARTIFACTS || '.codex-artifacts/bee-inspection-review-2026-10-13');
const solid = 'Solid, mostly continuous', spotty = 'Spotty, with gaps';
type Result = 'match' | 'review' | 'unknown';

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function section(page: Page) { return page.locator('[data-beehive-guided-inspection]'); }
function feedback(page: Page) { return page.locator('[data-inspection-feedback="true"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__inspectionAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}

async function mount(page: Page, recorded = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(recorded => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    // This pass tests the supported readable inspection workflow. A failed
    // renderer avoids keeping a software WebGL loop alive during layout checks.
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported guided-inspection fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the guided-inspection review test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      // These unrelated achievements were earned before this inspection.
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: true, hive3dFrame: 2,
      hive3dFramesSeen: [0, 1, 2, 3, 4, 5], hive3dPart: 'brood_frames', hive3dFoundQueen: true,
      inspectionDraft: {}, inspectionsDone: 2,
      lastInspection: recorded ? { day: 40, framesRead: 6, queenFound: true, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: false } : null,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
          explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__inspectionAwards = []; w.__inspectionWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__inspectionAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__inspectionWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, recorded);
  // The normal open action installs the viewer status subscription before the
  // forced failure and also exercises the real accessible entry point.
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(section(page)).toBeVisible();
  await expect(section(page).locator('[data-inspection-step="frames"]')).toContainText('Previous frame and Next frame');
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  // Radio groups now use one Tab stop. Start keyboard input after any prior
  // management click, then focus the requested option for native activation.
  // The choices spec covers the actual Tab order independently.
  await page.keyboard.press('Tab');
  await control.focus();
  await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
  await page.keyboard.press(key);
}

async function checkCard(page: Page, id: 'brood' | 'cells', answer: string, expected: string, result: Result) {
  const card = feedback(page).locator('[data-inspection-result="' + id + '"]');
  await expect(card).toHaveCount(1); await expect(card).toHaveAttribute('data-result', result);
  await expect(card.getByRole('heading', { name: id === 'brood' ? 'Brood pattern' : 'Queen cells', exact: true })).toBeVisible();
  await expect(card.locator('[data-inspection-verdict]')).toHaveText(result === 'match' ? 'Matches model' : result === 'review' ? 'Review answer' : 'Comparison not recorded');
  await expect(card.locator('dt')).toHaveText(['Your answer', 'Model answer when recorded']);
  await expect(card.locator('[data-inspection-answer]')).toHaveText(answer);
  await expect(card.locator('[data-inspection-expected]')).toHaveText(expected);
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__inspectionWrites = [];
    w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__inspectionWrites)).toEqual([]);
}

async function record(page: Page, brood: 'solid' | 'spotty', cells: 'yes' | 'no', correct: boolean) {
  const before = await work(page), beforeAwards = await awards(page);
  const broodControl = page.locator('[data-inspection-choice="brood:' + brood + '"]');
  const cellsControl = page.locator('[data-inspection-choice="cells:' + cells + '"]');
  await expect(page.locator('[data-inspection-record]')).toBeDisabled();
  await keyboardActivate(page, broodControl, 'Enter'); await expect(broodControl).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-inspection-record]')).toBeDisabled();
  await keyboardActivate(page, cellsControl, 'Space'); await expect(cellsControl).toHaveAttribute('aria-checked', 'true');
  await expect(cellsControl).toBeFocused(); await expect(page.locator('[data-inspection-record]')).toBeEnabled();
  const draft = JSON.parse(JSON.stringify(before)); draft.beehive.inspectionDraft = { brood, cells };
  expect(await work(page)).toEqual(draft); expect(await awards(page)).toEqual(beforeAwards);
  await keyboardActivate(page, page.locator('[data-inspection-record]'), 'Enter');
  const saved = { day: before.beehive.day, framesRead: before.beehive.hive3dFramesSeen.length,
    queenFound: before.beehive.hive3dFoundQueen, brood, cells, broodCorrect: correct, cellsCorrect: correct };
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { lastInspection: saved, inspectionDraft: {}, inspectionsDone: before.beehive.inspectionsDone + 1 });
  expect(await work(page)).toEqual(expected);
  expect(await awards(page)).toEqual([...beforeAwards, ['beehive', correct ? 14 : 6, 'Guided hive inspection']]);
  await expect(section(page)).toHaveAttribute('data-beehive-guided-inspection', 'recorded');
  await expect(feedback(page)).toHaveAttribute('role', 'status');
  await expect(feedback(page).getByRole('heading', { name: 'Recorded inspection · Day ' + before.beehive.day, exact: true })).toBeVisible();
  await expect(page.locator('[data-inspection-record]')).toBeDisabled();
  return saved;
}

async function audit(page: Page, mode: string) {
  const result = await section(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const cards = Array.from(node.querySelectorAll('[data-inspection-result]')).map(el => {
      const box = el.getBoundingClientRect(), css = getComputedStyle(el);
      return { x: box.x, y: box.y, width: box.width, right: box.right, border: css.borderStyle };
    });
    // overflow-wrap can fit text inside its box while splitting ordinary words
    // into letters. Measure the rendered glyph fragments for every stock word
    // in this guided section, including headings, verdicts and choice labels.
    const words: { word: string; context: string; rects: { top: number; bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // Closed native disclosures intentionally hide their observation text.
      const closed = textNode.parentElement?.closest('details:not([open])');
      if (closed && !closed.querySelector(':scope > summary')?.contains(textNode)) continue;
      const text = textNode.textContent || '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0)
          .map(rect => ({ top: rect.top, bottom: rect.bottom, width: rect.width }));
        words.push({ word: match[0], context: textNode.parentElement?.textContent || text, rects });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: Array.from(node.querySelectorAll('button,h3,h4,h5,li,p,dt,dd,[data-inspection-verdict],[role="radiogroup"] > span')).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('button')).filter(el => !el.closest('details:not([open])')).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches
        ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, cards, words,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, 'inspection-review-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    const baseline = item.rects[0].bottom;
    for (const rect of item.rects) expect(Math.abs(rect.bottom - baseline), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  for (const item of result.targets) { expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44); }
  for (const item of result.forcedAdjustments) expect(item.adjustment, item.text || '').toBe('auto');
  expect(result.cards).toHaveLength(2);
  if (mode === 'wide' || mode === 'ready') expect(Math.abs(result.cards[0].y - result.cards[1].y)).toBeLessThanOrEqual(1);
  else { expect(Math.abs(result.cards[0].x - result.cards[1].x)).toBeLessThanOrEqual(1); expect(result.cards[1].y).toBeGreaterThan(result.cards[0].y); }
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await section(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(12); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await section(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-inspection-review-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-inspection-review-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('guided inspection keeps recorded answers fixed through real management actions and handles incomplete older records', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await expect(feedback(page)).toHaveCount(0);
  const initial = await work(page), saved = await record(page, 'solid', 'yes', true);
  await checkCard(page, 'brood', solid, solid, 'match'); await checkCard(page, 'cells', 'Yes', 'Yes', 'match');
  const recordedText = await feedback(page).innerText();
  await page.locator('[data-management-choice="add_super"]').click();
  await expect.poll(async () => (await work(page)).beehive.capacity).toBe(120);
  await page.locator('[data-management-choice="requeen"]').click();
  await expect.poll(async () => (await work(page)).beehive.queenHealth).toBe(0);
  const managed = await work(page);
  expect(managed.beehive).toMatchObject({ day: 40, actionPoints: 0, capacity: 120, queenHealth: 0,
    queenTransition: { kind: 'requeen', daysRemaining: 3, pendingHealth: 100 }, lastInspection: saved, inspectionsDone: 3 });
  expect(managed.beehive.notebook).toEqual(initial.beehive.notebook); expect(managed.otherTool).toEqual(initial.otherTool);
  expect(await feedback(page).innerText()).toBe(recordedText);
  await expect.poll(() => awards(page)).toEqual([
    ['beehive', 14, 'Guided hive inspection'], ['beehive', 5, 'Added super'], ['beehive', 8, 'Requeened colony'],
  ]);
  // Let the real management animation finish before taking read-only snapshots.
  // Its timer should clear only the animation, preserving all colony work.
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 10000 }).toBeNull();
  const settled = JSON.parse(JSON.stringify(managed)); settled.beehive.bkAnim = null;
  expect(await work(page)).toEqual(settled);
  await checkReadOnlyRender(page); await audit(page, 'ready'); await capture(page, 'ready');
  // Current truths have both changed, so recording those same answers now
  // produces a different saved comparison without charging any action points.
  await record(page, 'solid', 'yes', false);
  await checkCard(page, 'brood', solid, spotty, 'review'); await checkCard(page, 'cells', 'Yes', 'No', 'review');
  await checkReadOnlyRender(page);
  await patch(page, { lastInspection: { day: 40, framesRead: 2, queenFound: false, brood: 'solid', cells: 'maybe', broodCorrect: 'true', cellsCorrect: false } });
  await checkCard(page, 'brood', solid, 'Not recorded', 'unknown'); await checkCard(page, 'cells', 'Not recorded', 'Not recorded', 'unknown');
  await checkReadOnlyRender(page);
  await patch(page, { lastInspection: { day: 40, brood: 'spotty', cells: 'no' } });
  await checkCard(page, 'brood', spotty, 'Not recorded', 'unknown'); await checkCard(page, 'cells', 'No', 'Not recorded', 'unknown');
  await checkReadOnlyRender(page);
  const finalAwards = await awards(page);
  await patch(page, { day: 41 }); await expect(feedback(page)).toHaveCount(0); await expect(section(page)).toHaveAttribute('data-beehive-guided-inspection', 'open');
  await patch(page, { day: 90 }); await expect(section(page)).toHaveAttribute('data-beehive-guided-inspection', 'winter');
  await expect(section(page)).toContainText('Keep the hive closed'); await expect(page.locator('[data-inspection-record]')).toHaveCount(0);
  expect(await awards(page)).toEqual(finalAwards); expect(errors).toEqual([]);
});

test('guided inspection comparison stays readable at phone width, in dark and forced colors, and with large text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, true);
  const before = await work(page), beforeAwards = await awards(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark';
      document.documentElement.style.fontSize = mode === 'large' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await checkCard(page, 'brood', solid, solid, 'match'); await checkCard(page, 'cells', 'Yes', 'No', 'review');
    await audit(page, mode); await capture(page, mode); await checkReadOnlyRender(page);
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  // Audit the selected answers as well as the saved review; choosing a draft
  // must leave the earlier comparison visible and must not award extra XP.
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.locator('[data-inspection-choice="brood:spotty"]').click();
  await page.locator('[data-inspection-choice="cells:no"]').click();
  await audit(page, 'selected');
  await checkCard(page, 'brood', solid, solid, 'match'); await checkCard(page, 'cells', 'Yes', 'No', 'review');
  const drafted = JSON.parse(JSON.stringify(before)); drafted.beehive.inspectionDraft = { brood: 'spotty', cells: 'no' };
  expect(await work(page)).toEqual(drafted); expect(await awards(page)).toEqual(beforeAwards); expect(errors).toEqual([]);
});
