import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_TOOLS_ARTIFACTS || '.codex-artifacts/bee-tools-toolbar-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const roles = ['beekeeper', 'queen', 'drone'] as const;
const tools = ['sound', 'quiz', 'badges', 'report', 'shortcuts', 'guide'] as const;
type Tool = typeof tools[number];
const labels = ['Sound effects', 'Quiz', 'Badges', 'Colony report', 'Keyboard shortcuts', 'Field guide'];
const names = ['Sound effects', 'Bee knowledge quiz', 'Achievement badges, 3 of ', 'Export colony report', 'Keyboard shortcuts', 'Bee field guide'];
// This day-40 colony already meets all three conditions; avoid awarding badges during toolbar actions.
const badges = { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } };
const quizKeys = ['quizOpen', 'quizComplete', 'quizIdx', 'quizScore', 'quizAnswered', 'quizFeedback', 'quizQuestions'];
function hero(page: Page) { return page.locator('[data-beehive-hero]'); }
function toolbar(page: Page) { return hero(page).locator('[data-beehive-tools]'); }
function tool(page: Page, id: Tool) { return toolbar(page).locator('[data-beehive-tool="' + id + '"]'); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__toolsAwards); }
function withoutQuiz(value: any) { const copy = structuredClone(value); for (const key of quizKeys) delete copy.beehive[key]; return copy; }
async function activate(page: Page, control: Locator, key: 'Enter' | 'Space' = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(badges => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Tools toolbar test uses the supported fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 40, honey: 60, syrup: 0, workers: 24000, morale: 85, varroaLevel: 2,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false,
      journeyOpen: false, notebookOpen: false, badges, bestQuizScore: 7,
      queen: { active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
        pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
        rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
        resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
        result: null, threats: [], custom: { retained: 'Match metadata.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908,
        lastRun: { success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
          energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
          distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' } } },
      journal: [{ day: 39, text: 'Keep my recorded journal observation.' }],
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep <strong>my observed day</strong>.', explanation: 'Keep my explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      }, custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__toolsAwards = []; w.__toolsReports = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__toolsAwards.push(args); };
    const copy = async (text: string) => { w.__toolsReports.push(text); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, badges);
  await expect(toolbar(page)).toBeVisible();
}

async function semantics(page: Page, role: typeof roles[number], soundOn = false) {
  await expect(toolbar(page)).toHaveAttribute('role', 'group');
  await expect(toolbar(page)).toHaveAttribute('aria-labelledby', 'beehive-tools-title');
  await expect(toolbar(page)).toHaveAccessibleName('Tools & help');
  await expect(toolbar(page).locator('#beehive-tools-title')).toHaveText('Tools & help');
  await expect(toolbar(page).locator('#beehive-tools-title')).toBeVisible();
  await expect(toolbar(page).locator('[data-beehive-tools-grid] button')).toHaveCount(6);
  expect(await toolbar(page).locator('[data-beehive-tools-grid] button').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-beehive-tool')))).toEqual(tools);
  for (const [index, id] of tools.entries()) {
    const control = tool(page, id), label = control.locator('[data-beehive-tool-label]');
    await expect(control).toHaveAttribute('type', 'button'); await expect(control).toBeVisible();
    await expect(label).toHaveText(labels[index]); await expect(label).toBeVisible();
    const name = await control.getAttribute('aria-label');
    expect(name?.toLowerCase()).toContain(labels[index].toLowerCase());
    if (id === 'badges') await expect(control).toHaveAccessibleName(/^Achievement badges, 3 of \d+ earned$/);
    else await expect(control).toHaveAccessibleName(names[index]);
    expect(await control.evaluate(node => node instanceof HTMLButtonElement && !node.disabled && node.tabIndex === 0)).toBe(true);
    expect(await control.locator(':scope > span[aria-hidden="true"]').count()).toBeGreaterThanOrEqual(1);
  }
  await expect(tool(page, 'sound')).toHaveAttribute('aria-pressed', String(soundOn));
  await expect(tool(page, 'sound').locator('[data-beehive-tool-state]')).toHaveText(soundOn ? '(On)' : '(Off)');
  await expect(tool(page, 'sound').locator('[data-beehive-tool-state]')).toHaveAttribute('aria-hidden', 'true');
  await expect(tool(page, 'badges').locator('[data-beehive-tool-count]')).toHaveText('(3)');
  await expect(tool(page, 'badges').locator('[data-beehive-tool-count]')).toHaveAttribute('aria-hidden', 'true');
  for (const [id, target] of [['quiz', 'beehive-quiz-panel'], ['badges', 'beehive-badges-panel'], ['shortcuts', 'beehive-shortcuts-panel'], ['guide', 'beehive-field-guide']] as const) {
    await expect(tool(page, id)).toHaveAttribute('aria-controls', target);
    await expect(tool(page, id)).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(hero(page).locator('[data-open-honey-lab]')).toHaveCount(role === 'beekeeper' ? 1 : 0);
  await expect(toolbar(page).locator('[data-beehive-tools-grid] [data-open-honey-lab]')).toHaveCount(0);
}

test('labeled global tools retain native keyboard order and existing actions in every perspective and layout without changing saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const initial = await work(page);
  for (const focusLayout of [true, false]) for (const role of roles) {
    await patch(page, { focusLayout, viewMode: role }); await semantics(page, role);
    const original = await work(page), priorAwards = await awards(page);
    await tool(page, 'sound').focus();
    for (const id of tools.slice(1)) { await page.keyboard.press('Tab'); await expect(tool(page, id)).toBeFocused(); }
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-beehive-tools]'))).toBe(false);
    await activate(page, tool(page, 'sound'), 'Space');
    await expect(tool(page, 'sound')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'sound').locator('[data-beehive-tool-state]')).toHaveText('(On)');
    expect(await work(page)).toEqual({ ...original, beehive: { ...original.beehive, soundOn: true } });
    await page.keyboard.press('Enter'); await semantics(page, role); expect(await work(page)).toEqual(original);
    for (const [id, preference] of [['guide', 'showGuide'], ['shortcuts', 'showKeys'], ['badges', 'showBadges']] as const) {
      await activate(page, tool(page, id), 'Space');
      await expect(tool(page, id)).toHaveAttribute('aria-expanded', 'true');
      const region = page.locator('[data-beehive-focus-panel="' + id + '"]');
      await expect(region).toBeVisible(); await expect(region).toBeFocused();
      expect(await work(page)).toEqual({ ...original, beehive: { ...original.beehive, [preference]: true } });
      await page.keyboard.press('Escape'); await expect(region).toHaveCount(0);
      await expect(tool(page, id)).toBeFocused(); expect(await work(page)).toEqual(original);
    }
    await activate(page, tool(page, 'quiz'));
    await expect(tool(page, 'quiz')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#beehive-quiz-question')).toBeFocused();
    const openedQuiz = await work(page);
    expect(openedQuiz.beehive.quizQuestions).toHaveLength(10);
    expect(openedQuiz.beehive).toMatchObject({ quizOpen: true, quizComplete: false, quizIdx: 0, quizScore: 0, quizAnswered: 0, quizFeedback: null, bestQuizScore: 7 });
    expect(withoutQuiz(openedQuiz)).toEqual(withoutQuiz(original));
    await page.keyboard.press('Escape'); await expect(page.locator('#beehive-quiz-panel')).toHaveCount(0);
    await expect(tool(page, 'quiz')).toBeFocused();
    const afterQuiz = await work(page); expect(afterQuiz).toEqual({ ...openedQuiz, beehive: { ...openedQuiz.beehive, quizOpen: false } });
    expect(await awards(page)).toEqual(priorAwards);
    const copyCount = await page.evaluate(() => (window as any).__toolsReports.length);
    await activate(page, tool(page, 'report'), 'Space');
    await expect.poll(() => page.evaluate(() => (window as any).__toolsReports.length)).toBe(copyCount + 1);
    const copied = await page.evaluate(() => (window as any).__toolsReports.at(-1));
    expect(copied).toContain('# 🐝 Beehive Colony Report'); expect(copied).toContain('**Day:** 40');
    expect(copied).toContain('| Workers | 24,000 |'); expect(copied).toContain('Keep my recorded journal observation.');
    expect(await work(page)).toEqual(afterQuiz); await expect(tool(page, 'report')).toBeFocused();
    expect(await awards(page)).toEqual([...priorAwards, ['beehive', 10, 'Exported colony report']]);
    expect(afterQuiz.beehive.notebook).toEqual(initial.beehive.notebook);
    expect(afterQuiz.beehive.queen).toEqual(initial.beehive.queen); expect(afterQuiz.beehive.drone).toEqual(initial.beehive.drone);
    expect(afterQuiz.otherTool).toEqual(initial.otherTool);
  }
  // A new colony's day-zero readings meet none of the badge conditions. Clearing
  // badges alone on the mature fixture would legitimately award them again.
  const beforeNewColonyAwards = await awards(page);
  await patch(page, { badges: {}, day: 0, workers: 10000, honey: 20, queenHealth: 100, varroaLevel: 5, morale: 80 });
  await expect(tool(page, 'badges').locator('[data-beehive-tool-count]')).toHaveCount(0);
  await expect(tool(page, 'badges')).toHaveAccessibleName(/^Achievement badges, 0 of \d+ earned$/);
  await expect(tool(page, 'badges').locator('[data-beehive-tool-label]')).toHaveText('Badges');
  expect(await awards(page)).toEqual(beforeNewColonyAwards);
  expect(errors).toEqual([]);
});

async function audit(page: Page, name: string) {
  const result = await hero(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const group = node.querySelector('[data-beehive-tools]')!, font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const heroBox = node.getBoundingClientRect(), heroStyle = getComputedStyle(node), decor = getComputedStyle(node, '::after');
    const descendants = Array.from(node.querySelectorAll('*'));
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement;
      if (!parent || parent.closest('svg')) continue;
      const box = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if (box.width <= 0 || box.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
      const status = parent.closest('[data-beehive-mode-signal] > span');
      if (status && getComputedStyle(status).textOverflow === 'ellipsis') continue;
      for (const match of (textNode.textContent || '').matchAll(/[^\s-]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: parent.textContent || '', rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      // The existing decorative ::after ring extends rightward inside the clipped hero.
      // Audit its exact clipping separately; every real descendant must still fit.
      rootOverflow: { extra: node.scrollWidth - node.clientWidth, overflowX: heroStyle.overflowX,
        decor: { display: decor.display, content: decor.content, position: decor.position, right: parseFloat(decor.right), pointerEvents: decor.pointerEvents } },
      overflow: descendants.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !(el.matches('[data-beehive-mode-signal] > span') && getComputedStyle(el).textOverflow === 'ellipsis'))
        .map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })), words,
      clippedContent: descendants.flatMap(el => {
        const box = el.getBoundingClientRect(), css = getComputedStyle(el);
        if (box.width <= 0 || box.height <= 0 || css.display === 'none' || css.visibility === 'hidden') return [];
        return box.left < heroBox.left - 1 || box.right > heroBox.right + 1 || box.top < heroBox.top - 1 || box.bottom > heroBox.bottom + 1
          ? [{ tag: el.tagName, text: el.textContent, left: box.left - heroBox.left, right: box.right - heroBox.right, top: box.top - heroBox.top, bottom: box.bottom - heroBox.bottom }] : [];
      }),
      text: Array.from(group.querySelectorAll('#beehive-tools-title,[data-beehive-tool-label],[data-beehive-tool-state],[data-beehive-tool-count]')).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow };
      }),
      targets: Array.from(group.querySelectorAll('[data-beehive-tools-grid] button')).map(el => { const box = el.getBoundingClientRect(); return { text: el.textContent, width: box.width, height: box.height }; }),
      columns: getComputedStyle(group.querySelector('[data-beehive-tools-grid]')!).gridTemplateColumns.split(' ').filter(track => parseFloat(track) > 0).length,
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? [group, ...Array.from(group.querySelectorAll('*'))].map(el => getComputedStyle(el).forcedColorAdjust) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'tools-toolbar-layout-' + name + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.clippedContent).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  if (result.rootOverflow.extra > 1) {
    expect(result.rootOverflow.overflowX).toBe('hidden');
    expect(result.rootOverflow.decor.display).not.toBe('none'); expect(result.rootOverflow.decor.content).not.toBe('none');
    expect(result.rootOverflow.decor.position).toBe('absolute'); expect(result.rootOverflow.decor.pointerEvents).toBe('none');
    expect(result.rootOverflow.decor.right).toBeLessThan(0);
    expect(result.rootOverflow.extra).toBeLessThanOrEqual(-result.rootOverflow.decor.right + 1);
  }
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must be visible in ' + item.context).toBeGreaterThan(0);
    for (const rect of item.rects) expect(Math.abs(rect.bottom - item.rects[0].bottom), item.word + ' must stay intact in ' + item.context).toBeLessThanOrEqual(1);
  }
  expect(result.targets).toHaveLength(6);
  for (const item of result.targets) { expect(item.width, item.text || '').toBeGreaterThanOrEqual(44); expect(item.height, item.text || '').toBeGreaterThanOrEqual(44); }
  for (const adjustment of result.forcedAdjustments) expect(adjustment).toBe('auto');
  return result;
}
async function capture(page: Page, name: string) {
  const region = hero(page), pad = 6;
  const position = await region.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await region.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2);
    const file = 'preview-tools-toolbar-' + name + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-tools-toolbar-' + name + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('global tools and the full heading stay readable in every perspective and five display modes with either layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    const cases = mode === 'wide' ? [
      { role: 'beekeeper' as const, focusLayout: true }, { role: 'beekeeper' as const, focusLayout: false },
      { role: 'queen' as const, focusLayout: true }, { role: 'drone' as const, focusLayout: true },
    ] : [{ role: 'beekeeper' as const, focusLayout: true }, { role: 'beekeeper' as const, focusLayout: false }];
    for (const { role, focusLayout } of cases) {
      const name = mode + '-' + role + '-' + (focusLayout ? 'stage' : 'overview');
      await patch(page, { viewMode: role, focusLayout, soundOn: !focusLayout });
      const before = await work(page), beforeAwards = await awards(page);
      await semantics(page, role, !focusLayout);
      await tool(page, 'sound').focus(); await page.keyboard.press('Tab'); await expect(tool(page, 'quiz')).toBeFocused();
      const focus = await tool(page, 'quiz').evaluate(node => { const css = getComputedStyle(node); return { outline: css.outlineStyle, width: parseFloat(css.outlineWidth), ink: css.color, paper: css.backgroundColor }; });
      expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
      const layout = await audit(page, name);
      if (mode === 'wide') expect(layout.columns).toBe(6);
      if (mode === 'mobile') expect(layout.columns).toBe(2);
      if (mode === 'large') expect(layout.columns).toBe(1);
      if (mode === 'forced') expect(focus.ink).not.toBe(focus.paper);
      await capture(page, name); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
    }
  }
  expect(errors).toEqual([]);
});
