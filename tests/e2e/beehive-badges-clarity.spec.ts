import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_BADGES_ARTIFACTS || '.codex-artifacts/bee-badges-clarity-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const roles = ['beekeeper', 'queen', 'drone'] as const;
const definitions = [
  ['first_day', 'First Dawn', 'Advance your first day'],
  ['survive_30', 'Month One', 'Keep the colony alive through 30 model days'],
  ['survive_120', 'Full Year', 'Keep the colony alive through 120 model days (one model year)'],
  ['honey_harvest', 'Sweet Reward', 'Harvest honey for the first time'],
  ['mite_evidence', 'Mite Evidence', 'Self-review a prediction, evidence, and explanation after an effective treatment at model mite pressure 20 or above. This recognizes reflection, not treatment frequency.'],
  ['conservationist', 'Eco Warrior', 'Complete 5 conservation actions'],
  ['garden_friend', 'Garden Friend', 'Have 3+ pollinator plants in Companion Planting'],
  ['thriving', 'Thriving Colony', 'Reach a colony health score of 80 or above'],
  ['big_colony', 'Mega Hive', 'Grow colony to 25,000+ workers'],
  ['quiz_master', 'Bee Scholar', 'Score 8+ on the Bee Knowledge Quiz'],
  ['inspector', 'Hive Inspector', 'View all 9 inspection layers'],
  ['weather_wise', 'Weather Wise', 'Acknowledge 3 weather events'],
  ['varietal_master', 'Varietal Master', 'Harvest 4 different honey varietals'],
  ['event_handler', 'Crisis Manager', 'Acknowledge 5 colony events'],
] as const;
type BadgeRecords = Record<string, any>;
const partial: BadgeRecords = {
  first_day: true,
  survive_30: { earned: true, day: -1 },
  survive_120: { earned: true, day: 1.5 },
  honey_harvest: { earned: true, day: '8' },
  mite_evidence: { earned: true, day: { note: '<img src=x onerror=alert(1)>' } },
  conservationist: { earned: true, day: 0 },
  garden_friend: { earned: true, day: 30 },
  thriving: false, big_colony: null, quiz_master: 0, inspector: '',
  unknown_saved_badge: { earned: true, day: 44, note: 'Preserve future badge metadata.' },
};
const all: BadgeRecords = Object.fromEntries(definitions.map(([id], index) => [id, { earned: true, day: index + 1, custom: { retained: true } }]));
const panel = (page: Page) => page.locator('#beehive-badges-panel');
const opener = (page: Page) => page.locator('[data-beehive-tool="badges"]');
const close = (page: Page) => panel(page).getByRole('button', { name: 'Close badges', exact: true });
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__badgesAwards); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__badgesWrites = []; }); }
async function settle(page: Page) { await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await settle(page); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__badgesWrites)).toEqual([]);
}
async function activate(page: Page, control: Locator, key: 'Enter' | 'Space' = 'Enter') { await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); }
async function open(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  if (await panel(page).count() === 0) await activate(page, opener(page), key);
  await expect(panel(page)).toBeVisible(); await expect(opener(page)).toHaveAttribute('aria-expanded', 'true');
  // Wait for the panel lifecycle's scheduled initial focus before moving to a control.
  await expect(panel(page)).toBeFocused(); await settle(page);
}
async function expectedPreference(page: Page, before: any, beforeAwards: unknown, showBadges: boolean) {
  await settle(page); expect(await work(page)).toEqual({ ...before, beehive: { ...before.beehive, showBadges } }); expect(await awards(page)).toEqual(beforeAwards);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Badges clarity test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      // This day-zero colony meets no badge criteria: merely reading the panel must not award one.
      day: 0, honey: 10, syrup: 0, workers: 6000, queenHealth: 40, morale: 35, varroaLevel: 50,
      diseaseRisk: 0, actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false, badges: {}, bestQuizScore: 0, totalHarvested: 0,
      conservationsDone: 0, weatherEventsHandled: 0, eventsHandled: 0, varietals: {}, layersViewed: [],
      queen: { active: true, paused: true, day: 7, hiveHealth: 73, territory: 58,
        pheromones: { qmp: 43, alarm: 10, nasonov: 50, brood: 40 },
        rival: { name: 'Test rival', health: 36, pressure: 64, intel: 2 },
        resources: { nectar: 20, pollen: 10, wax: 8, royalJelly: 2 },
        result: null, threats: [], custom: { retained: 'Match metadata.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908,
        lastRun: { success: true, reachedDca: true, difficulty: 'easy', energyLeft: 0,
          energyUnits: 'percent-of-difficulty-reserve', routeMarkers: 0, maxAlt: 125,
          distance: 610, score: 45, courseSeed: 20260908, custom: { retained: 'Saved route metadata.' } } },
      journal: [{ day: 0, text: 'Keep my recorded journal observation.' }],
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'Keep <strong>my observed day</strong>.', explanation: 'Keep my explanation.', review: { prediction: true, evidence: false, explanation: true } },
        queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network reading.', explanation: 'Keep my network explanation.' },
        drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route evidence.', explanation: 'Keep my route explanation.' },
        synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
        custom: { retained: 'Notebook metadata.' },
      }, custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__badgesAwards = []; w.__badgesWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__badgesAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__badgesWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(opener(page)).toBeVisible(); await settle(page);
}
async function verify(page: Page, badges: BadgeRecords) {
  const count = definitions.filter(([id]) => !!badges[id]).length;
  await expect(panel(page)).toHaveAttribute('role', 'region'); await expect(panel(page)).toHaveAccessibleName('Achievement badges');
  await expect(panel(page)).toHaveAttribute('data-beehive-focus-panel', 'badges'); await expect(panel(page)).toHaveClass(/\bbee-badges\b/);
  await expect(panel(page).getByRole('heading', { name: 'Achievement badges', level: 2, exact: true })).toHaveCount(1);
  await expect(opener(page)).toHaveAttribute('aria-controls', 'beehive-badges-panel');
  await expect(opener(page)).toHaveAccessibleName('Achievement badges, ' + count + ' of 14 earned');
  await expect(panel(page).locator('[data-badges-earned-count]')).toHaveText(count + ' of 14 earned');
  await expect(panel(page).locator('[data-badges-remaining-count]')).toHaveText((14 - count) + ' not yet earned');
  await expect(panel(page).locator('[data-badges-scope]')).toContainText(/milestones/i);
  await expect(panel(page).locator('[data-badges-scope]')).toContainText(/not a grade/i);
  await expect(panel(page).locator('[data-badges-scope]')).toContainText(/perspectives/i);
  await expect(panel(page).locator('[data-badges-history]')).toContainText(/start a new colony/i);
  await expect(panel(page).locator('[data-badges-history]')).toContainText(/earlier colony/i);
  const meter = panel(page).locator('[data-badges-progress]');
  await expect(meter).toHaveAttribute('role', 'progressbar'); await expect(meter).toHaveAccessibleName('Badges earned');
  await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '14');
  await expect(meter).toHaveAttribute('aria-valuenow', String(count)); await expect(meter).toHaveAttribute('aria-valuetext', new RegExp('^' + count + ' of 14'));
  const cards = panel(page).locator('ul[data-badges-grid] > li[data-badge-id]'); await expect(cards).toHaveCount(14);
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-badge-id')))).toEqual(definitions.map(([id]) => id));
  for (const [index, [id, label, requirement]] of definitions.entries()) {
    const card = cards.nth(index), earned = !!badges[id], day = badges[id]?.day;
    await expect(card).toHaveAttribute('data-badge-earned', String(earned));
    await expect(card.getByRole('heading', { name: label, level: 3, exact: true })).toBeVisible();
    await expect(card.locator('[data-badge-status]')).toHaveText(earned ? 'Earned' : 'Not yet earned'); await expect(card.locator('[data-badge-status]')).toBeVisible();
    await expect(card.locator('[data-badge-requirement]')).toHaveText(requirement); await expect(card.locator('[data-badge-requirement]')).toBeVisible();
    await expect(card.locator('[aria-hidden="true"]')).not.toHaveCount(0);
    if (earned) {
      const expected = Number.isSafeInteger(day) && day >= 0 && day <= 10000000 ? 'Recorded on model Day ' + day : 'Model day unavailable.';
      await expect(card.locator('[data-badge-earned-day]')).toHaveText(expected); await expect(card.locator('[data-badge-earned-day]')).toBeVisible();
    } else await expect(card.locator('[data-badge-earned-day]')).toHaveCount(0);
  }
  await expect(panel(page).locator('img,script,iframe,input,select,textarea')).toHaveCount(0);
}

test('badge milestones retain saved history, clear earned states and focus across perspectives without changing simulation work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  const cases = [{ unknown_saved_badge: partial.unknown_saved_badge }, partial, all,
    { ...partial, weather_wise: { earned: true, day: 10000001 }, event_handler: { earned: true, day: 10000000 } }];
  for (const badges of cases) for (const focusLayout of [true, false]) for (const viewMode of roles) {
    const prior = await work(page), priorAwards = await awards(page);
    await patch(page, { badges, focusLayout, viewMode, showBadges: false });
    expect(await work(page)).toEqual({ ...prior, beehive: { ...prior.beehive, badges, focusLayout, viewMode, showBadges: false } });
    expect(await awards(page)).toEqual(priorAwards);
    const before = await work(page), beforeAwards = await awards(page);
    await open(page, focusLayout ? 'Enter' : 'Space'); await verify(page, badges);
    await expectedPreference(page, before, beforeAwards, true);
    const opened = await work(page); await resetWrites(page);
    await page.evaluate(() => { const w = window as any; w.ReactDOM.flushSync(() => w.__rerender()); });
    await page.keyboard.press('n'); await unchanged(page, opened, beforeAwards);
    await page.keyboard.press('Tab'); await expect(close(page)).toBeFocused();
    await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0); await expect(opener(page)).toBeFocused();
    await expectedPreference(page, before, beforeAwards, false);
    await open(page); await activate(page, close(page), 'Space'); await expect(panel(page)).toHaveCount(0); await expect(opener(page)).toBeFocused();
    await expectedPreference(page, before, beforeAwards, false);
  }
  const finalState = await work(page);
  for (const key of ['notebook', 'queen', 'drone', 'custom', 'journal', 'actionPoints', 'honey', 'day', 'autoAdvance', 'motionPaused', 'beeView']) expect(finalState.beehive[key]).toEqual(original.beehive[key]);
  expect(finalState.otherTool).toEqual(original.otherTool); expect(await awards(page)).toEqual([]); expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await panel(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => { const rect = el.getBoundingClientRect(), css = getComputedStyle(el); return rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden'; });
    const words: { word: string; bottoms: number[] }[] = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement; if (!parent) continue;
      const rect = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if (rect.width <= 0 || rect.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
      for (const match of (textNode.textContent || '').matchAll(/[^\s\-–]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], bottoms: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => rect.bottom) });
      }
    }
    const button = node.querySelector('button')!, buttonBox = button.getBoundingClientRect(), buttonCss = getComputedStyle(button);
    const progress = node.querySelector('[data-badges-progress]')!, fill = progress.querySelector('[data-badges-progress-fill]')!, progressCss = getComputedStyle(progress), fillCss = getComputedStyle(fill), progressBox = progress.getBoundingClientRect(), fillBox = fill.getBoundingClientRect();
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }), words,
      text: Array.from(node.querySelectorAll('h2,h3,[data-badges-earned-count],[data-badges-remaining-count],[data-badges-scope],[data-badges-history],[data-badge-status],[data-badge-requirement],[data-badge-earned-day]')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      close: { width: buttonBox.width, height: buttonBox.height, outline: buttonCss.outlineStyle, outlineWidth: parseFloat(buttonCss.outlineWidth) },
      cards: Array.from(node.querySelectorAll('[data-badge-id]')).map(el => { const css = getComputedStyle(el); return { id: el.getAttribute('data-badge-id'), earned: el.getAttribute('data-badge-earned'), border: parseFloat(css.borderTopWidth), borderStyle: css.borderTopStyle, ink: css.color, paper: css.backgroundColor }; }),
      progress: { available: progressBox.width - parseFloat(progressCss.borderLeftWidth) - parseFloat(progressCss.borderRightWidth) - parseFloat(progressCss.paddingLeft) - parseFloat(progressCss.paddingRight),
        fill: fillBox.width, paper: progressCss.backgroundColor, ink: fillCss.backgroundColor, border: parseFloat(progressCss.borderTopWidth), borderStyle: progressCss.borderTopStyle },
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'badges-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.close.width).toBeGreaterThanOrEqual(44); expect(result.close.height).toBeGreaterThanOrEqual(44); expect(result.close.outline).not.toBe('none'); expect(result.close.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.cards).toHaveLength(14);
  for (const card of result.cards) { expect(card.border).toBeGreaterThanOrEqual(1); expect(card.borderStyle).not.toBe('none'); expect(card.ink).not.toBe(card.paper); }
  const earned = result.cards.find(card => card.earned === 'true')!, unearned = result.cards.find(card => card.earned === 'false')!;
  expect(earned.borderStyle + '/' + earned.border).not.toBe(unearned.borderStyle + '/' + unearned.border);
  expect(result.progress.available).toBeGreaterThan(0); expect(result.progress.fill).toBeCloseTo(result.progress.available / 2, 0);
  if (mode === 'forced') { expect(result.progress.ink).not.toBe(result.progress.paper); expect(result.progress.border).toBeGreaterThanOrEqual(1); expect(result.progress.borderStyle).not.toBe('none'); }
}
async function capture(page: Page, mode: string) {
  const target = panel(page), pad = 6, prefix = 'preview-badges-clarity-' + mode;
  const position = await target.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(24); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('badge requirements and recorded states remain readable without color cues in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await patch(page, { badges: partial }); await open(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, partial); await close(page).focus(); await page.keyboard.press('Tab'); await close(page).focus();
    await audit(page, mode); await capture(page, mode); await unchanged(page, before, beforeAwards);
  }
  expect(errors).toEqual([]);
});
