import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_BROOD_AREA_ARTIFACTS || '.codex-artifacts/bee-brood-area-guide-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function observation(page: Page) { return page.locator('[data-inspection-brood-guide="true"]'); }
function toggle(page: Page) { return page.locator('[data-inspection-brood-guide-toggle="true"]'); }
function content(page: Page) { return page.locator('[data-inspection-brood-guide-content="true"]'); }
function overlayToggle(page: Page) { return observation(page).locator('[data-inspection-brood-overlay-toggle="true"]'); }
function review(page: Page) { return page.locator('[data-inspection-feedback="true"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__broodGuideAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported brood guide fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the brood guide test'); };
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
    w.__broodGuideAwards = []; w.__broodGuideWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__broodGuideAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__broodGuideWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await expect(observation(page)).toBeVisible();
}

async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  // Establish keyboard modality after any management action used a pointer.
  await page.keyboard.press('Tab'); await control.focus(); await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none'); await page.keyboard.press(key);
}

async function checkGuide(page: Page) {
  await expect(content(page)).toBeVisible();
  await expect(observation(page)).toHaveJSProperty('open', true);
  const scope = page.locator('[data-inspection-brood-guide-scope="true"]');
  await expect(scope).toContainText(/teaching examples/i);
  await expect(scope).toContainText(/colony/i);
  await expect(observation(page).locator('[data-inspection-brood-example]')).toHaveCount(2);
  for (const kind of ['solid', 'spotty']) {
    const figure = page.locator('[data-inspection-brood-example="' + kind + '"]');
    const diagram = figure.locator('[data-inspection-brood-diagram="' + kind + '"]');
    await expect(figure).toHaveJSProperty('tagName', 'FIGURE');
    await expect(figure).toContainText(kind === 'solid' ? 'Solid example' : 'Spotty example');
    await expect(diagram).toHaveAttribute('role', 'img');
    await expect(diagram).toHaveAccessibleName(new RegExp(kind, 'i'));
    await expect(diagram.locator('polygon[data-brood-guide-cell]')).toHaveCount(35);
    await expect(diagram.locator('polygon[data-brood-guide-cell="brood"]')).toHaveCount(kind === 'solid' ? 14 : 10);
    await expect(diagram.locator('polygon[data-brood-guide-cell="blank"]')).toHaveCount(kind === 'solid' ? 21 : 25);
    await expect(diagram.locator('circle.bee-inspection-cue-form')).toHaveCount(kind === 'solid' ? 14 : 10);
    await expect(diagram.locator('path.bee-inspection-brood-cap')).toHaveCount(kind === 'solid' ? 14 : 10);
    const positions = await diagram.locator('polygon[data-brood-guide-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-brood-guide-position')));
    expect(new Set(positions).size).toBe(35);
    for (const position of positions) expect(position).toMatch(/^\d+:\d+$/);
  }
  await expect(page.locator('[data-inspection-brood-inspect="true"]')).toHaveAccessibleName('Inspect current brood');
}

async function examples(page: Page) {
  // Capture only the original marks so the comparison detects an overlay that
  // accidentally changes the teaching pattern or turns a blank cell into brood.
  return observation(page).locator('[data-inspection-brood-diagram]').evaluateAll(nodes => nodes.map(node =>
    Array.from(node.querySelectorAll('[data-brood-guide-cell]')).map(cell => {
      const group = cell.parentElement!.cloneNode(true) as Element;
      group.querySelectorAll('[data-brood-guide-gap]').forEach(ring => ring.remove());
      return group.outerHTML;
    })));
}

async function checkOverlay(page: Page, shown: boolean) {
  await expect(overlayToggle(page)).toHaveAccessibleName('Show brood area guide');
  await expect(overlayToggle(page)).toHaveAttribute('type', 'button');
  await expect(overlayToggle(page)).toHaveAttribute('aria-pressed', String(shown));
  await expect(overlayToggle(page)).toHaveAttribute('aria-controls', 'beehive-inspection-brood-examples');
  await expect(page.locator('#beehive-inspection-brood-examples')).toHaveCount(1);
  const help = observation(page).locator('[data-inspection-brood-overlay-help="true"]');
  await expect(help).toBeVisible();
  await expect(help).toHaveText(shown
    ? 'Dashed boundary: example brood area. Ring: unmarked cell inside that area. Blank margins lie outside.'
    : 'Turn on the guide to separate gaps within the patch from blank margins.');
  const helpId = await help.getAttribute('id'); expect(helpId).toBeTruthy();
  await expect(overlayToggle(page)).toHaveAttribute('aria-describedby', helpId!);
  for (const kind of ['solid', 'spotty']) {
    const diagram = observation(page).locator('[data-inspection-brood-diagram="' + kind + '"]');
    await expect(diagram.locator('polygon[data-brood-guide-boundary="true"]')).toHaveCount(shown ? 1 : 0);
    const gaps = kind === 'solid' ? ['2:3'] : ['1:2', '1:4', '2:3', '3:2', '3:4'];
    const rings = diagram.locator('circle[data-brood-guide-gap]');
    await expect(rings).toHaveCount(shown ? gaps.length : 0);
    if (shown) {
      await expect(diagram).toHaveAccessibleName(/dashed boundary/i);
      expect(await rings.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-brood-guide-gap')))).toEqual(gaps);
      const geometry = await diagram.evaluate(node => {
        const boundary = node.querySelector<SVGPolygonElement>('[data-brood-guide-boundary]')!;
        const points = Array.from(boundary.points).map(point => ({ x: point.x, y: point.y }));
        const rings = Array.from(node.querySelectorAll<SVGCircleElement>('[data-brood-guide-gap]')).map(ring => {
          const target = node.querySelector<SVGPolygonElement>('[data-brood-guide-position="' + ring.getAttribute('data-brood-guide-gap') + '"]')!;
          const vertices = Array.from(target.points);
          const center = { x: vertices.reduce((total, point) => total + point.x, 0) / vertices.length,
            y: vertices.reduce((total, point) => total + point.y, 0) / vertices.length };
          return { type: target.getAttribute('data-brood-guide-cell'), cx: ring.cx.baseVal.value,
            cy: ring.cy.baseVal.value, r: ring.r.baseVal.value, center, style: getComputedStyle(ring).stroke };
        });
        return { points, rings, outline: getComputedStyle(boundary).stroke,
          dash: getComputedStyle(boundary).strokeDasharray };
      });
      expect(geometry.points.length).toBeGreaterThanOrEqual(4);
      expect(geometry.outline).not.toBe('none'); expect(geometry.dash).not.toBe('none');
      const minX = Math.min(...geometry.points.map(point => point.x)), maxX = Math.max(...geometry.points.map(point => point.x));
      const minY = Math.min(...geometry.points.map(point => point.y)), maxY = Math.max(...geometry.points.map(point => point.y));
      for (const ring of geometry.rings) {
        expect(ring.type).toBe('blank'); expect(Math.abs(ring.cx - ring.center.x)).toBeLessThan(.1);
        expect(Math.abs(ring.cy - ring.center.y)).toBeLessThan(.1); expect(ring.r).toBeGreaterThan(0);
        expect(ring.style).not.toBe('none'); expect(ring.cx).toBeGreaterThan(minX); expect(ring.cx).toBeLessThan(maxX);
        expect(ring.cy).toBeGreaterThan(minY); expect(ring.cy).toBeLessThan(maxY);
      }
    }
  }
}

async function setOverlay(page: Page, shown: boolean, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page), beforeExamples = await examples(page);
  await page.evaluate(() => { (window as any).__broodGuideWrites = []; });
  await keyboardActivate(page, overlayToggle(page), key);
  await expect(overlayToggle(page)).toBeFocused(); await checkOverlay(page, shown);
  expect(await examples(page)).toEqual(beforeExamples);
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__broodGuideWrites)).toEqual([]);
}

async function inspectCurrentBrood(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(() => { (window as any).__broodGuideWrites = []; });
  await keyboardActivate(page, page.locator('[data-inspection-brood-inspect="true"]'), 'Enter');
  await expect(page.locator('#beehive-interior-detail-title')).toBeFocused();
  await expect(page.locator('[data-interior-detail]')).toHaveAttribute('data-interior-detail', 'brood');
  await expect(page.locator('[data-interior-topic="brood"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('[data-interior-detail] [data-interior-reading]')).toHaveText('6,000 cells');
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__broodGuideWrites)).toEqual([]);
  await keyboardActivate(page, page.locator('[data-interior-inspection-return]'), 'Enter');
  await expect(page.locator('#beehive-guided-inspection-title')).toBeFocused();
  await expect(observation(page)).toHaveJSProperty('open', true);
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__broodGuideWrites)).toEqual([]);
}

async function readOnlyToggle(page: Page, open: boolean, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(() => { (window as any).__broodGuideWrites = []; });
  await keyboardActivate(page, toggle(page), key);
  await expect(observation(page)).toHaveJSProperty('open', open);
  await expect(toggle(page)).toBeFocused();
  if (open) await expect(content(page)).toBeVisible(); else await expect(content(page)).not.toBeVisible();
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__broodGuideWrites)).toEqual([]);
}

async function checkReadOnlyRender(page: Page) {
  const before = await work(page), beforeAwards = await awards(page);
  await page.evaluate(async () => {
    const w = window as any; w.__broodGuideWrites = []; w.ReactDOM.flushSync(() => w.__rerender());
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__broodGuideWrites)).toEqual([]);
  await expect(observation(page)).toHaveJSProperty('open', true);
}

async function audit(page: Page, mode: string) {
  const result = await observation(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // SVG title/description provide the accessible image name; they are not
      // painted text and therefore have no visual line-box requirement.
      if (textNode.parentElement?.closest('svg') || !textNode.parentElement?.checkVisibility()) continue;
      const text = textNode.textContent || '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: textNode.parentElement?.textContent || text,
          rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })), words,
      text: Array.from(node.querySelectorAll('summary,h3,h4,h5,p,strong,span,figcaption')).filter(el => el.textContent?.trim() && el.checkVisibility()).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('summary,button')).filter(el => el.checkVisibility()).map(el => { const box = el.getBoundingClientRect(); return { width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'brood-area-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
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

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  // Keep the summary focus outline inside the screenshot edge.
  const pad = 6;
  const position = await observation(page).evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY - pad, height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(8); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await observation(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y - pad + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2);
    const file = 'preview-brood-area-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-brood-area-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('brood-area guide uses local keyboard controls and preserves examples, held readings, and saved inspection work through management', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await expect(observation(page)).toHaveJSProperty('tagName', 'DETAILS');
  await expect(toggle(page)).toHaveJSProperty('tagName', 'SUMMARY');
  await expect(toggle(page)).toHaveAccessibleName('Compare brood patterns');
  await expect(observation(page)).toHaveJSProperty('open', false); await expect(content(page)).not.toBeVisible();
  const guideOrder = await observation(page).evaluate(node => {
    const guided = node.closest('[data-beehive-guided-inspection]')!;
    const next = [guided.querySelector('[data-inspection-bottom-bar]'), ...Array.from(guided.querySelectorAll('[role="radiogroup"]'))];
    return { count: next.length, before: next.every(item => item && !!(node.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING)) };
  });
  expect(guideOrder).toEqual({ count: 3, before: true });
  const initial = await work(page), initialAwards = await awards(page), savedText = await review(page).innerText();
  await readOnlyToggle(page, true, 'Enter'); await checkGuide(page); await checkOverlay(page, false);
  await expect(page.locator('[data-inspection-choice="brood:solid"]')).toHaveAccessibleName('Solid, mostly continuous');
  await expect(review(page).locator('[data-inspection-result="brood"]')).toContainText('Solid, mostly continuous');
  const initialExamples = await examples(page);
  await setOverlay(page, true, 'Enter'); await setOverlay(page, false, 'Space'); await setOverlay(page, true, 'Space');
  await readOnlyToggle(page, false, 'Space'); await readOnlyToggle(page, true, 'Space');
  await checkOverlay(page, true); await checkReadOnlyRender(page); await checkOverlay(page, true);
  expect(await work(page)).toEqual(initial); expect(await awards(page)).toEqual(initialAwards);

  // The route must work from another topic and also clear a selected brood
  // cell role when the requested topic is already open. Holding a reference
  // must survive both paths without writing it into the colony record.
  await keyboardActivate(page, page.locator('[data-interior-hold]'), 'Enter');
  await expect(page.locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  await keyboardActivate(page, page.locator('[data-interior-topic="queen"]'), 'Enter');
  await expect(page.locator('[data-interior-detail]')).toHaveAttribute('data-interior-detail', 'queen');
  await inspectCurrentBrood(page);
  await keyboardActivate(page, page.locator('[data-interior-role="capped_brood"]'), 'Space');
  await expect(page.locator('[data-interior-role="capped_brood"]')).toHaveAttribute('aria-pressed', 'true');
  await inspectCurrentBrood(page);
  await expect(page.locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  await expect(page.locator('[data-interior-change="brood"] [data-change-held]')).toHaveText('6,000 cells');
  await checkOverlay(page, true);
  expect(await examples(page)).toEqual(initialExamples);
  expect(await work(page)).toEqual(initial); expect(await awards(page)).toEqual(initialAwards);
  expect(await review(page).innerText()).toBe(savedText);

  await page.locator('[data-management-choice="requeen"]').click();
  await expect.poll(async () => (await work(page)).beehive.queenHealth).toBe(0);
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 10000 }).toBeNull();
  const managed = await work(page);
  expect(managed.beehive).toMatchObject({ day: 40, workers: 12000, capacity: 80, brood: 6000, queenHealth: 0, actionPoints: 1,
    queenTransition: { kind: 'requeen', daysRemaining: 3, pendingHealth: 100 },
    inspectionDraft: initial.beehive.inspectionDraft, lastInspection: initial.beehive.lastInspection, inspectionsDone: 2,
    hive3dFrame: 2, hive3dFramesSeen: [0, 2], hive3dFoundQueen: false, notebook: initial.beehive.notebook });
  expect(managed.otherTool).toEqual(initial.otherTool);
  expect(await awards(page)).toEqual([...initialAwards, ['beehive', 8, 'Requeened colony']]);
  await checkGuide(page); await checkOverlay(page, true); expect(await examples(page)).toEqual(initialExamples);
  expect(await review(page).innerText()).toBe(savedText);
  await expect(review(page).locator('[data-inspection-result="brood"] [data-inspection-verdict]')).toHaveText('Matches model');
  await readOnlyToggle(page, false, 'Enter'); await readOnlyToggle(page, true, 'Enter');
  await inspectCurrentBrood(page); await checkReadOnlyRender(page); expect(await work(page)).toEqual(managed);
  await checkOverlay(page, true); await setOverlay(page, false, 'Enter'); await setOverlay(page, true, 'Space');
  await expect(page.locator('[data-interior-reference]')).toHaveAttribute('data-reference-state', 'held');
  await expect(page.locator('[data-interior-change="queen"] [data-change-held]')).toHaveText('100 / 100');
  await expect(page.locator('[data-interior-change="queen"] [data-change-current]')).toHaveText('0 / 100');
  const finalAwards = await awards(page); await patch(page, { day: 90 });
  await expect(page.locator('[data-beehive-guided-inspection]')).toHaveAttribute('data-beehive-guided-inspection', 'winter');
  await expect(observation(page)).toHaveCount(0); await expect(page.locator('[data-inspection-choice]')).toHaveCount(0);
  expect((await work(page)).beehive.inspectionDraft).toEqual(initial.beehive.inspectionDraft);
  expect((await work(page)).beehive.lastInspection).toEqual(initial.beehive.lastInspection);
  expect(await awards(page)).toEqual(finalAwards); expect(errors).toEqual([]);
});

test('brood-area guide stays legible with guide on and off across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const before = await work(page), beforeAwards = await awards(page); await readOnlyToggle(page, true, 'Enter');
  const initialExamples = await examples(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await checkGuide(page); await checkOverlay(page, false);
    await readOnlyToggle(page, false, 'Space'); await readOnlyToggle(page, true, 'Enter');
    await audit(page, mode + '-off'); await capture(page, mode + '-off');
    const modeExamples = await examples(page);
    await setOverlay(page, true, 'Enter'); await checkReadOnlyRender(page); await checkOverlay(page, true);
    await audit(page, mode + '-on'); await capture(page, mode + '-on');
    expect(await examples(page)).toEqual(modeExamples);
    await setOverlay(page, false, 'Space');
    // Theme changes may alter presentation attributes, so compare the example
    // geometry and labels within a consistent theme in the behavior workflow.
    expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  expect(initialExamples).toHaveLength(2); expect(errors).toEqual([]);
});
