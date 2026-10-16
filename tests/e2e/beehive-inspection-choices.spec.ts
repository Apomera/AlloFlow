import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800,
});
const artifacts = path.resolve(process.env.BEE_INSPECTION_CHOICES_ARTIFACTS || '.codex-artifacts/bee-inspection-choices-2026-10-13');
const options = { brood: ['solid', 'spotty'], cells: ['yes', 'no'] };
const names = { brood: ['Solid, mostly continuous', 'Spotty, with gaps'], cells: ['Yes', 'No'] };
type Question = keyof typeof options;

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function section(page: Page) { return page.locator('[data-beehive-guided-inspection]'); }
function controls(page: Page) { return page.locator('[data-inspection-choices="true"]'); }
function review(page: Page) { return page.locator('[data-inspection-feedback="true"]'); }
function choice(page: Page, question: Question, value: string) { return page.locator('[data-inspection-choice="' + question + ':' + value + '"]'); }
function recordButton(page: Page) { return page.locator('[data-inspection-record]'); }
function status(page: Page) { return page.locator('[data-inspection-draft-status="true"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__inspectionChoiceAwards); }
async function patch(page: Page, inspectionDraft: Record<string, unknown>) {
  await page.evaluate(inspectionDraft => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', { inspectionDraft })); }, inspectionDraft);
}

async function mount(page: Page, draft: Record<string, unknown> = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(draft => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported inspection-choice fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the inspection-choice test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: true, hive3dFrame: 2,
      hive3dFramesSeen: [0, 1, 2, 3, 4, 5], hive3dPart: 'brood_frames', hive3dFoundQueen: true,
      inspectionDraft: draft, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 6, queenFound: true, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: false },
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
    w.__inspectionChoiceAwards = []; w.__inspectionChoiceWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__inspectionChoiceAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__inspectionChoiceWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, draft);
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(section(page)).toBeVisible(); await expect(review(page)).toBeVisible();
}

async function checkChoices(page: Page, draft: Record<string, unknown>) {
  let count = 0;
  for (const question of ['brood', 'cells'] as const) {
    const selected = options[question].indexOf(draft[question] as string), group = section(page).getByRole('radiogroup', { name: question === 'brood' ? 'Brood pattern' : 'Queen cells', exact: true });
    if (selected >= 0) count++;
    await expect(group).toHaveAttribute('aria-required', 'true');
    await expect(group).toHaveAttribute('aria-describedby', 'beehive-inspection-choice-help' + (question === 'cells' ? ' beehive-inspection-bottom-bar-help' : ' beehive-inspection-brood-guide-help'));
    await expect(group.getByRole('radio')).toHaveCount(2);
    await expect(group.locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
    for (let i = 0; i < 2; i++) {
      const control = choice(page, question, options[question][i]);
      await expect(control).toHaveAccessibleName(names[question][i]);
      await expect(control).toHaveAttribute('aria-checked', String(selected === i));
      await expect(control).toHaveAttribute('tabindex', i === (selected >= 0 ? selected : 0) ? '0' : '-1');
      const mark = control.locator('.bee-inspection-choice-mark');
      await expect(mark).toHaveCount(1); await expect(mark).toHaveAttribute('aria-hidden', 'true');
      if (selected === i) await expect(mark).toContainText('✓');
    }
  }
  await expect(page.locator('#beehive-inspection-choice-help')).toBeVisible();
  await expect(status(page)).toHaveAttribute('id', 'beehive-inspection-draft-status');
  await expect(status(page)).toContainText('Answers chosen: ' + count + ' of 2.');
  if (count === 2) await expect(status(page)).toContainText('Ready to record.');
  else if (count === 0) await expect(status(page)).toContainText('choose a brood pattern and a queen-cell answer');
  else await expect(status(page)).toContainText(options.brood.includes(draft.brood as string) ? 'Choose a queen-cell answer' : 'Choose a brood pattern');
  expect(await status(page).getAttribute('role')).not.toBe('status');
  expect(await status(page).getAttribute('aria-live')).toBeNull();
  await expect(recordButton(page)).toHaveAttribute('aria-describedby', 'beehive-inspection-draft-status');
  if (count === 2) await expect(recordButton(page)).toBeEnabled(); else await expect(recordButton(page)).toBeDisabled();
}

async function checkFocus(control: Locator) {
  await expect(control).toBeFocused();
  const css = await control.evaluate(node => { const style = getComputedStyle(node); return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }; });
  expect(css.width).toBeGreaterThanOrEqual(2); expect(css.style).not.toBe('none');
}

async function expectOnlyDraft(page: Page, before: any, draft: Record<string, unknown>, previousAwards: any[]) {
  const expected = JSON.parse(JSON.stringify(before)); expected.beehive.inspectionDraft = draft;
  expect(await work(page)).toEqual(expected); expect(await awards(page)).toEqual(previousAwards);
  await checkChoices(page, draft);
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__inspectionChoiceWrites = []; w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__inspectionChoiceWrites)).toEqual([]);
}

async function commit(page: Page, brood: string, cells: string, correctBrood: boolean, correctCells: boolean) {
  const before = await work(page), previousAwards = await awards(page);
  await checkChoices(page, { brood, cells }); await expect(recordButton(page)).toBeFocused();
  await page.keyboard.press('Enter');
  const expected = JSON.parse(JSON.stringify(before));
  Object.assign(expected.beehive, { inspectionDraft: {}, inspectionsDone: before.beehive.inspectionsDone + 1,
    lastInspection: { day: 40, framesRead: 6, queenFound: true, brood, cells, broodCorrect: correctBrood, cellsCorrect: correctCells } });
  expect(await work(page)).toEqual(expected);
  expect(await awards(page)).toEqual([...previousAwards, ['beehive', 6 + (correctBrood ? 4 : 0) + (correctCells ? 4 : 0), 'Guided hive inspection']]);
  await checkChoices(page, {});
  await expect(review(page).locator('[data-inspection-result="brood"]')).toHaveAttribute('data-result', correctBrood ? 'match' : 'review');
  await expect(review(page).locator('[data-inspection-result="cells"]')).toHaveAttribute('data-result', correctCells ? 'match' : 'review');
}

async function audit(page: Page, mode: string) {
  const result = await section(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const forced = window.matchMedia('(forced-colors: active)').matches;
    let systemHighlight: string | null = null;
    if (forced) {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;visibility:hidden;color:Highlight;forced-color-adjust:auto';
      document.body.appendChild(probe);
      try { systemHighlight = getComputedStyle(probe).color; } finally { probe.remove(); }
    }
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // Closed native disclosures intentionally hide their observation text.
      const closed = textNode.parentElement?.closest('details:not([open])');
      if (closed && !closed.querySelector(':scope > summary')?.contains(textNode)) continue;
      const text = textNode.textContent || '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: textNode.parentElement?.textContent || text,
          rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      words,
      text: Array.from(node.querySelectorAll('button,h3,h4,h5,li,p,dt,dd,[data-inspection-verdict],.bee-inspection-question > span')).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('button')).filter(el => !el.closest('details:not([open])')).map(el => { const box = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: box.width, height: box.height, checked: el.getAttribute('aria-checked'), border: css.borderStyle, borderWidth: parseFloat(css.borderWidth), borderColor: css.borderColor }; }),
      groups: Array.from(node.querySelectorAll('[role="radiogroup"]')).map(el => { const box = el.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width }; }),
      forced, systemHighlight,
      forcedAdjustments: forced
        ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, 'inspection-choices-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    const baseline = item.rects[0].bottom;
    for (const rect of item.rects) expect(Math.abs(rect.bottom - baseline), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  for (const item of result.targets) {
    expect(item.width).toBeGreaterThanOrEqual(44); expect(item.height).toBeGreaterThanOrEqual(44);
    if (item.checked === 'true') {
      if (result.forced) { expect(item.border).toBe('solid'); expect(item.borderWidth).toBe(2); expect(item.borderColor).toBe(result.systemHighlight); }
      else expect(item.border).toBe('double');
    }
  }
  for (const item of result.forcedAdjustments) expect(item.adjustment, item.text || '').toBe('auto');
  expect(result.groups).toHaveLength(2);
  if (mode === 'wide' || mode === 'ready') expect(Math.abs(result.groups[0].y - result.groups[1].y)).toBeLessThanOrEqual(1);
  else { expect(Math.abs(result.groups[0].x - result.groups[1].x)).toBeLessThanOrEqual(1); expect(result.groups[1].y).toBeGreaterThan(result.groups[0].y); }
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  // Capture only the newly refined controls. Saved result cards are checked
  // above and have their own bounded screenshots in the previous regression.
  const position = await controls(page).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { top: box.top + window.scrollY - 6, height: box.height + 12 };
  });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(8); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await controls(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y - 6 + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-inspection-choices-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    // Include the outer focus ring instead of cropping it at the control edge.
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x - 6, y, width: box!.width + 12, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-inspection-choices-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('inspection choices support a single tab stop per question and preserve work through keyboard selection and guarded recording', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const initial = await work(page), previousAwards = await awards(page), savedText = await review(page).innerText();
  await checkChoices(page, {});
  await choice(page, 'brood', 'solid').focus(); await page.keyboard.press('Tab'); await checkFocus(choice(page, 'cells', 'yes'));
  // With Record disabled, the saved review's evidence routes are next.
  // Buttons inside closed native disclosures remain outside the Tab order.
  await page.keyboard.press('Tab'); await checkFocus(page.locator('[data-inspection-review-resource="brood"]'));
  await page.keyboard.press('Tab'); await checkFocus(page.locator('[data-inspection-review-resource="cells"]'));
  await page.keyboard.press('Tab');
  expect(await section(page).evaluate(node => node.contains(document.activeElement))).toBe(false);
  await page.keyboard.press('Shift+Tab'); await checkFocus(page.locator('[data-inspection-review-resource="cells"]'));
  await page.keyboard.press('Shift+Tab'); await checkFocus(page.locator('[data-inspection-review-resource="brood"]'));
  await page.keyboard.press('Shift+Tab'); await checkFocus(choice(page, 'cells', 'yes'));
  await page.keyboard.press('Shift+Tab'); await checkFocus(choice(page, 'brood', 'solid'));
  await expectOnlyDraft(page, initial, {}, previousAwards);
  for (const [key, value] of [
    ['ArrowRight', 'spotty'], ['ArrowRight', 'solid'], ['ArrowDown', 'spotty'], ['ArrowDown', 'solid'],
    ['ArrowLeft', 'spotty'], ['ArrowLeft', 'solid'], ['ArrowUp', 'spotty'], ['ArrowUp', 'solid'],
    ['End', 'spotty'], ['Home', 'solid'],
  ]) {
    await page.keyboard.press(key); await checkFocus(choice(page, 'brood', value));
    await expectOnlyDraft(page, initial, { brood: value }, previousAwards);
    expect(await review(page).innerText()).toBe(savedText);
  }
  await page.keyboard.press('Tab'); await checkFocus(choice(page, 'cells', 'yes')); await page.keyboard.press('Space');
  await expectOnlyDraft(page, initial, { brood: 'solid', cells: 'yes' }, previousAwards);
  await page.keyboard.press('Tab'); await checkFocus(recordButton(page));
  await page.keyboard.press('Shift+Tab'); await checkFocus(choice(page, 'cells', 'yes'));
  await page.keyboard.press('End'); await checkFocus(choice(page, 'cells', 'no')); await page.keyboard.press('Enter');
  await expectOnlyDraft(page, initial, { brood: 'solid', cells: 'no' }, previousAwards);
  await choice(page, 'brood', 'spotty').click();
  await page.keyboard.press('Tab'); await checkFocus(choice(page, 'cells', 'no'));
  await expectOnlyDraft(page, initial, { brood: 'spotty', cells: 'no' }, previousAwards);
  await page.keyboard.press('Home'); await checkFocus(choice(page, 'cells', 'yes'));
  await page.keyboard.press('Shift+Tab'); await checkFocus(choice(page, 'brood', 'spotty'));
  await page.keyboard.press('Home'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await checkFocus(recordButton(page));
  await expectOnlyDraft(page, initial, { brood: 'solid', cells: 'yes' }, previousAwards);
  expect(await review(page).innerText()).toBe(savedText);
  await audit(page, 'ready'); await capture(page, 'ready'); await commit(page, 'solid', 'yes', true, true);
  await checkReadOnlyRender(page);

  // Malformed persisted drafts must not count as answers or enable recording.
  await patch(page, { brood: 'SOLID', cells: 'maybe' });
  const invalid = await work(page), invalidAwards = await awards(page), latestReview = await review(page).innerText();
  await checkChoices(page, invalid.beehive.inspectionDraft);
  await recordButton(page).evaluate(node => (node as HTMLButtonElement).click());
  expect(await work(page)).toEqual(invalid); expect(await awards(page)).toEqual(invalidAwards);
  await choice(page, 'brood', 'solid').focus(); await page.keyboard.press('ArrowRight'); await checkFocus(choice(page, 'brood', 'spotty'));
  await expectOnlyDraft(page, invalid, { brood: 'spotty', cells: 'maybe' }, invalidAwards);
  await page.keyboard.press('Tab'); await checkFocus(choice(page, 'cells', 'yes')); await page.keyboard.press('Space');
  await expectOnlyDraft(page, invalid, { brood: 'spotty', cells: 'yes' }, invalidAwards);
  expect(await review(page).innerText()).toBe(latestReview);
  await page.keyboard.press('Tab'); await checkFocus(recordButton(page)); await commit(page, 'spotty', 'yes', false, true);
  expect((await work(page)).beehive).toMatchObject({ day: 40, actionPoints: 3, inspectionsDone: 4, notebook: initial.beehive.notebook });
  await checkReadOnlyRender(page); expect(errors).toEqual([]);
});

test('inspection answer cards and readiness stay clear at phone width, in dark and forced colors, and with large text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, { brood: 'spotty', cells: 'no' });
  const before = await work(page), beforeAwards = await awards(page), savedText = await review(page).innerText();
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await checkChoices(page, { brood: 'spotty', cells: 'no' });
    // Use actual Tab navigation to render a visible keyboard focus ring on a
    // selected answer without altering either the draft or saved comparison.
    await choice(page, 'brood', 'spotty').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    await checkFocus(choice(page, 'brood', 'spotty'));
    await audit(page, mode); await capture(page, mode); await checkReadOnlyRender(page);
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards); expect(await review(page).innerText()).toBe(savedText);
  }
  expect(errors).toEqual([]);
});
