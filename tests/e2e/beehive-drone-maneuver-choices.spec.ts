import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_CHOICES_ARTIFACTS || '.codex-artifacts/bee-drone-choices-2026-10-15');
const actions = [
  { id: 'navigate', label: 'Follow navigation cue', seconds: 2,
    detail: 'Assisted heading and altitude corrections toward the DCA, then the queen. Uses the same energy and collision model.',
    topics: [/horizontal range/i, /height/i] },
  { id: 'forward', label: 'Powered forward', seconds: 1,
    detail: 'Add forward thrust for one model second.', topics: [/horizontal range/i, /energy/i] },
  { id: 'climb', label: 'Powered climb', seconds: 1,
    detail: 'Add thrust and upward control for one model second.', topics: [/height/i, /energy/i] },
  { id: 'coast', label: 'Ease thrust', seconds: 1,
    detail: 'Observe momentum and energy use with no extra control input.', topics: [/momentum/i, /energy/i] },
  { id: 'left', label: 'Turn left', seconds: 0.2,
    detail: 'Apply a short left correction.', topics: [/heading/i, /horizontal range/i, /route map/i] },
  { id: 'right', label: 'Turn right', seconds: 0.2,
    detail: 'Apply a short right correction.', topics: [/heading/i, /horizontal range/i, /route map/i] },
  { id: 'descend', label: 'Descend', seconds: 0.5,
    detail: 'Apply downward control for half a model second.', topics: [/height/i, /energy/i] },
];
const help = 'Choose a control input. The icons show controls, not a predicted flight path. Selecting keeps the flight paused.';

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

const panel = (page: Page) => page.locator('[data-flight-decision-panel]');
const choices = (page: Page) => panel(page).locator('fieldset[data-flight-maneuver-choices]');
const option = (page: Page, id: string) => choices(page).locator('label[data-flight-maneuver-option="' + id + '"]');
const radio = (page: Page, id: string) => option(page, id).locator('input[type="radio"][name="bee-flight-decision"][value="' + id + '"]');
const selected = (page: Page) => choices(page).locator('input[name="bee-flight-decision"]:checked');
const ready = (page: Page) => panel(page).locator('[data-flight-maneuver-ready]');
const advance = (page: Page) => panel(page).locator('[data-flight-advance-decision]');
const comparison = (page: Page) => panel(page).locator('[data-flight-maneuver-evidence]');

async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); await settle(page);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Maneuver choice tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Flight metadata.' },
        lastRun: { pacing: 'steps', difficulty: 'easy', success: false, score: 12, custom: { retained: 'Previous run.' } } },
      notebook: { drone: { prediction: 'Keep my prediction.', evidence: 'Keep my evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state', 'paused');
  await expect(choices(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.__choicesMountedCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__choicesMountedState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'decisionFeedback',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens', 'obstacles', 'wind', 'windNow']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omitSelection = false) {
  return page.evaluate(omitSelection => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitSelection) delete result.beehive.drone.decision;
    return result;
  }, omitSelection);
}
async function identity(page: Page) {
  expect(await page.evaluate(() => {
    const w = window as any;
    return w.__choicesMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__choicesMountedState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function assertFocus(page: Page, id: string) {
  await expect(radio(page, id)).toBeFocused();
  const focus = await radio(page, id).evaluate(node => {
    const label = node.closest('label')!, css = getComputedStyle(node), labelCss = getComputedStyle(label);
    const rect = node.getBoundingClientRect();
    return { visible: node.matches(':focus-visible'),
      indicated: [css, labelCss].some(style => (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none'),
      inView: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1 };
  });
  expect(focus.visible).toBe(true); expect(focus.indicated).toBe(true); expect(focus.inView).toBe(true);
}
async function assertSelected(page: Page, action: typeof actions[number]) {
  await expect(selected(page)).toHaveCount(1); await expect(radio(page, action.id)).toBeChecked();
  await expect(ready(page)).toHaveAttribute('aria-live', 'off');
  await expect(ready(page).locator('[data-flight-selected-maneuver]')).toHaveText(action.label);
  await expect(ready(page)).toContainText('Advance up to ' + action.seconds + ' model second' + (action.seconds === 1 ? '' : 's') + ', then pause to compare.');
  const prompt = ready(page).locator('#bee-flight-prediction-prompt');
  await expect(prompt).toContainText(/Predict/);
  for (const topic of action.topics) await expect(prompt).toContainText(topic);
  await expect(prompt).not.toContainText(/guarantee|always|will (?:reach|avoid|restore)/i);
  await expect(advance(page)).toHaveAccessibleName('Advance maneuver · ' + action.seconds + ' s');
  for (const candidate of actions) {
    const card = option(page, candidate.id), selectedMark = card.locator('[data-flight-choice-selected]');
    await expect(card).toHaveAttribute('data-selected', String(candidate.id === action.id));
    await expect(selectedMark).toHaveAttribute('aria-hidden', 'true');
    const mark = await selectedMark.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { visibility: getComputedStyle(node).visibility, width: rect.width, height: rect.height };
    });
    expect(mark.visibility).toBe(candidate.id === action.id ? 'visible' : 'hidden');
    expect(mark.width).toBeGreaterThan(0); expect(mark.height).toBeGreaterThan(0);
    if (candidate.id === action.id) await expect(selectedMark).toHaveText('Selected');
  }
}
async function assertChoices(page: Page) {
  await expect(choices(page)).toHaveAccessibleName('Choose your next maneuver');
  await expect(choices(page)).toHaveAttribute('aria-describedby', 'bee-flight-choice-help');
  await expect(choices(page)).toHaveAccessibleDescription(help);
  await expect(panel(page).locator('#bee-flight-choice-help')).toHaveText(help);
  expect(await choices(page).locator('[data-flight-maneuver-option]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-flight-maneuver-option')))).toEqual(actions.map(action => action.id));
  await expect(choices(page).locator('input[type="radio"]')).toHaveCount(actions.length);
  for (const action of actions) {
    const card = option(page, action.id), input = radio(page, action.id);
    const duration = 'Up to ' + action.seconds + ' model second' + (action.seconds === 1 ? '' : 's');
    await expect(input).toHaveAttribute('aria-labelledby', 'bee-flight-choice-title-' + action.id);
    await expect(input).toHaveAttribute('aria-describedby', 'bee-flight-choice-time-' + action.id + ' bee-flight-choice-detail-' + action.id);
    await expect(input).toHaveAccessibleName(action.label);
    await expect(input).toHaveAccessibleDescription(duration + ' ' + action.detail);
    await expect(card.locator('[data-flight-choice-title]')).toHaveText(action.label);
    await expect(card.locator('[data-flight-choice-time]')).toHaveText(duration);
    await expect(card.locator('[data-flight-choice-detail]')).toHaveText(action.detail);
    const icon = card.locator('svg[data-flight-choice-icon]');
    await expect(icon).toHaveCount(1); await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(icon).toHaveAttribute('focusable', 'false');
    await expect(icon.locator('text, title, a, button, [tabindex]')).toHaveCount(0);
  }
  await expect(choices(page).locator('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]')).toHaveCount(0);
}

test('Maneuver cards keep native arrow selection, exact control descriptions, and paused state until a real climb', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await assertChoices(page); await assertSelected(page, actions[0]);
  const starting = await flight(page), original = await savedWork(page), unchanged = await savedWork(page, true);
  const feedback = await panel(page).locator('[data-flight-decision-feedback]').innerText();
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]'));
  await assertFocus(page, 'navigate');
  const selections: string[] = [];
  // Exercise native wrapping in both directions; focusing a radio directly would
  // miss broken group order, unwanted activation, or focus replacement on render.
  for (const direction of ['ArrowRight', 'ArrowLeft']) {
    for (let step = 1; step <= actions.length; step++) {
      await page.keyboard.press(direction); await settle(page);
      const index = direction === 'ArrowRight' ? step % actions.length : (actions.length - step) % actions.length;
      const action = actions[index];
      await assertSelected(page, action); await assertFocus(page, action.id); selections.push(action.id);
      expect((await savedWork(page)).beehive.drone.decision).toBe(action.id);
      expect(await savedWork(page, true)).toEqual(unchanged); expect(await flight(page)).toEqual(starting); await identity(page);
      await expect(panel(page).locator('[data-flight-decision-feedback]')).toHaveText(feedback);
      await expect(comparison(page)).toHaveCount(0);
    }
  }
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await settle(page);
  await assertSelected(page, actions[2]); await assertFocus(page, 'climb');
  expect(await flight(page)).toEqual(starting); expect(await savedWork(page, true)).toEqual(unchanged);
  await keyboard(page, advance(page)); await expect(advance(page)).toBeFocused();
  const climbed = await flight(page), entry = climbed.decisionLog.at(-1);
  expect(climbed.decisionCount).toBe(1); expect(climbed.simulationClock - (starting.simulationClock || 0)).toBeCloseTo(1, 8);
  expect(climbed.y).toBeGreaterThan(starting.y); expect(climbed.paused).toBe(true);
  expect(entry).toMatchObject({ turn: 1, action: 'Powered climb', seconds: 1, altitudeBefore: Math.round(starting.y), altitude: Math.round(climbed.y) });
  await expect(comparison(page)).toContainText('Maneuver 1 · Powered climb');
  await expect(comparison(page).locator('[data-maneuver-context]')).toContainText('1 model second recorded');
  await assertSelected(page, actions[2]); await identity(page);
  const after = await savedWork(page), beforeColony = JSON.parse(JSON.stringify(original)), afterColony = JSON.parse(JSON.stringify(after));
  delete beforeColony.beehive.drone; delete afterColony.beehive.drone;
  expect(afterColony).toEqual(beforeColony); expect(after.beehive.drone.lastRun).toEqual(original.beehive.drone.lastRun);
  fs.writeFileSync(path.join(artifacts, 'maneuver-choices-keyboard.json'), JSON.stringify({ selections, starting, climbed, entry }, null, 2));
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await panel(page).evaluate(async node => {
    const roots = Array.from(node.querySelectorAll('[data-flight-maneuver-choices], [data-flight-maneuver-ready]')) as HTMLElement[];
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const text: { value: string; font: number; clipped: boolean; ellipsis: boolean }[] = [];
    const overflow: { text: string | null; extra: number }[] = [], outside: (string | null)[] = [];
    const rectangles = roots.map(root => {
      const box = root.getBoundingClientRect();
      const visible = [root, ...Array.from(root.querySelectorAll('*'))].filter(el => {
        if (!(el instanceof HTMLElement)) return false;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
        let ancestor: HTMLElement | null = el;
        while (ancestor && ancestor !== root.parentElement) {
          const css = getComputedStyle(ancestor);
          if (css.display === 'none' || css.visibility === 'hidden' || css.clip === 'rect(0px, 0px, 0px, 0px)') return false;
          ancestor = ancestor.parentElement;
        }
        return true;
      });
      for (const el of visible) {
        if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) overflow.push({ text: el.textContent, extra: el.scrollWidth - el.clientWidth });
        const r = el.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) outside.push(el.textContent);
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let value: Node | null;
      while ((value = walker.nextNode())) {
        if (!value.textContent?.trim() || !value.parentElement || !visible.includes(value.parentElement)) continue;
        const range = document.createRange(); range.selectNodeContents(value); const css = getComputedStyle(value.parentElement);
        const owner = value.parentElement.closest('[data-flight-maneuver-option]')?.getBoundingClientRect() || box;
        text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
          clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < owner.left - 1 || r.right > owner.right + 1 || r.top < owner.top - 1 || r.bottom > owner.bottom + 1)) });
      }
      return { kind: root.hasAttribute('data-flight-maneuver-choices') ? 'choices' : 'ready', x: box.x, y: box.y, width: box.width, height: box.height };
    });
    const cards = Array.from(node.querySelectorAll('[data-flight-maneuver-option]'));
    const overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].getAttribute('data-flight-maneuver-option') + '/' + cards[j].getAttribute('data-flight-maneuver-option'));
    }
    const icons = Array.from(node.querySelectorAll('[data-flight-choice-icon]')).map(icon => {
      const r = icon.getBoundingClientRect(), parent = icon.closest('[data-flight-maneuver-option]')!.getBoundingClientRect();
      return { width: r.width, height: r.height, hidden: icon.getAttribute('aria-hidden'), focusable: icon.getAttribute('focusable'),
        interactive: icon.querySelectorAll('a, button, [tabindex]').length, text: icon.querySelectorAll('text, title').length,
        contained: r.left >= parent.left - 1 && r.right <= parent.right + 1 && r.top >= parent.top - 1 && r.bottom <= parent.bottom + 1 };
    });
    const targets = cards.map(card => { const r = card.getBoundingClientRect(); return { id: card.getAttribute('data-flight-maneuver-option'), width: r.width, height: r.height }; });
    const axe = await (window as any).axe.run({ include: ['[data-flight-maneuver-choices]', '[data-flight-maneuver-ready]'] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { rectangles, text, rootFont, targets, overlaps, icons, overflow, outside,
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  fs.writeFileSync(path.join(artifacts, 'maneuver-choices-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.rectangles).toHaveLength(2); expect(result.targets).toHaveLength(7); expect(result.icons).toHaveLength(7);
  for (const target of result.targets) { expect(target.width, target.id || '').toBeGreaterThanOrEqual(44); expect(target.height, target.id || '').toBeGreaterThanOrEqual(44); }
  for (const icon of result.icons) {
    expect(icon.width).toBeCloseTo(32, 5); expect(icon.height).toBeCloseTo(32, 5); expect(icon.contained).toBe(true);
    expect(icon.hidden).toBe('true'); expect(icon.focusable).toBe('false'); expect(icon.interactive).toBe(0); expect(icon.text).toBe(0);
  }
  expect(result.text.length).toBeGreaterThan(24);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
}

async function capture(page: Page, mode: string) {
  await choices(page).screenshot({ path: path.join(artifacts, 'preview-drone-choices-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
  const height = await choices(page).evaluate(node => node.getBoundingClientRect().height);
  if (height > 1600) {
    // Keep tall phone and enlarged-text previews readable without scaling away
    // the detail: each card is a separate tile in addition to the full overview.
    for (const action of actions) await option(page, action.id).screenshot({
      path: path.join(artifacts, 'preview-drone-choices-' + mode + '-' + action.id + '.png'), animations: 'disabled', timeout: 120000,
    });
  }
  await ready(page).screenshot({ path: path.join(artifacts, 'preview-drone-choices-' + mode + '-ready.png'), animations: 'disabled', timeout: 120000 });
}

test('All maneuver cards and prediction prompts stay readable and keyboard clear in seven accessible layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]'));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await settle(page);
  await assertSelected(page, actions[2]);
  const held = await flight(page), saved = await savedWork(page);
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: mode === 'wide' || mode === 'medium' ? 1800 : 900 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => {
      const w = window as any; w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await settle(page); await assertChoices(page);
    await keyboard(page, panel(page).locator('[data-flight-plan-jump="choose"]')); await assertFocus(page, 'climb');
    await page.keyboard.press('ArrowRight'); await settle(page); await assertSelected(page, actions[3]); await assertFocus(page, 'coast');
    await page.keyboard.press('ArrowLeft'); await settle(page); await assertSelected(page, actions[2]); await assertFocus(page, 'climb');
    await audit(page, mode); await capture(page, mode);
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
