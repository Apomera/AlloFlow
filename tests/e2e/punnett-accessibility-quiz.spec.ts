import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ retries: 0, timeout: 240000 });
const output = resolve(process.env.PUNNETT_QUIZ_REPORT || 'reports/punnett-quiz-wcag-20261024');
const harness = new GlHarness({ toolId: 'punnett', toolFile: 'stem_lab/stem_tool_punnett.js',
  width: 1120, height: 900, appStyles: true, layout: 'document' });
const scopes = { challenge: '[data-punnett-challenge]', battle: '[data-punnett-battle]' };
const headings = { challenge: '#punnett-challenge-question', battle: '#punnett-battle-question' };
const feedback = { challenge: '#punnett-challenge-feedback', battle: '#punnett-battle-feedback' };
const continues = { challenge: '[data-punnett-challenge-continue]', battle: '[data-punnett-battle-continue]' };
type Kind = keyof typeof scopes;
const siblingLearning = { observations: ['Earlier field evidence remains saved.'], complete: false };
const challengeChanges = ['_chalDiff', '_chalIdx', '_chalScore', '_chalStreak', '_chalFeedback', '_selectedOption', '_chalTotalScore'];
const battleChanges = ['_battleActive', '_battleRound', '_battleHP', '_battleEnemyHP', '_battleFeedback', '_battleScore', '_battleResult', '_selectedOption'];

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function setup(page: Page, subtool: Kind, extra: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { punnett: { subtool, parent1: ['A', 'a'], parent2: ['a', 'a'], inheritMode: 'complete',
    researchPoints: 17, _dnaSeq: 'ATGAAATAA', _dnaShowSteps: true,
    learnerNotes: 'Keep the evidence from my earlier crosses.', _visited: { [subtool]: true },
    _chalDiff: 'easy', _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalTotalScore: 7, ...extra },
    ecology: siblingLearning }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((node: HTMLElement) => {
    Object.assign(node.style, { width: '100%', background: '#fff', color: '#0f172a', colorScheme: 'light' });
  });
  await expect(page.locator(scopes[subtool])).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  await page.evaluate(() => {
    (window as any).__punnettQuizXP = [];
    (window as any).__ctx.awardXP = (...args: unknown[]) => (window as any).__punnettQuizXP.push(args);
    (window as any).__rerender();
  });
  return { errors, baseline: await state(page) };
}
async function state(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.punnett))); }
async function xp(page: Page, prefix: string) { return page.evaluate(prefix => (window as any).__punnettQuizXP.filter((entry: any[]) => entry[0].startsWith(prefix)), prefix); }
async function patch(page: Page, values: Record<string, unknown>) {
  await page.evaluate(values => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, punnett: { ...previous.punnett, ...values } })), values);
}
async function preserved(page: Page, baseline: any, changes: string[]) {
  const actual = await state(page), expected = { ...baseline };
  for (const key of changes) { delete actual[key]; delete expected[key]; }
  expect(actual).toEqual(expected);
  expect(await page.evaluate(() => (window as any).__toolData.ecology)).toEqual(siblingLearning);
  expect(await harness.glContexts(page)).toEqual([]);
}
async function activate(page: Page, target: Locator, key = 'Enter') { await target.focus(); await page.keyboard.press(key); }
async function bank(page: Page, kind: Kind, difficulty = 'easy') {
  return page.evaluate(({ kind, difficulty }) => {
    const pure = (window as any).__punnettPure;
    return kind === 'challenge' ? pure.CHALLENGE_QS[difficulty] : pure.BATTLE_QS;
  }, { kind, difficulty });
}
async function question(page: Page, kind: Kind) {
  const current = await state(page), questions = await bank(page, kind, current._chalDiff || 'easy');
  const index = kind === 'challenge' ? current._chalIdx || 0 : current._battleRound || 0;
  const expected = questions[index], heading = page.locator(headings[kind]);
  await expect(heading).toHaveRole('heading'); await expect(heading).toHaveAttribute('tabindex', '-1');
  await expect(heading).toHaveText(expected.q);
  const group = page.locator(scopes[kind]).getByRole('group', { name: expected.q, exact: true });
  await expect(group).toHaveAttribute('aria-labelledby', headings[kind].slice(1));
  await expect(group).toHaveAttribute('aria-describedby', 'punnett-' + kind + '-instructions');
  const status = page.locator(feedback[kind]); await expect(status).toHaveRole('status');
  await expect(status).toHaveAttribute('aria-live', 'polite'); await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toHaveText('');
  const buttons = group.locator('[data-punnett-answer]'); await expect(buttons).toHaveCount(expected.a.length);
  for (let option = 0; option < expected.a.length; option++) {
    const button = group.locator('[data-punnett-answer="' + option + '"]');
    await expect(button).toHaveRole('button'); await expect(button).toHaveAccessibleName(expected.a[option]);
    await expect(button).toHaveAttribute('aria-disabled', 'false');
  }
  return { ...expected, index, questions: questions.length, group };
}
async function answer(page: Page, kind: Kind, correct: boolean, key = 'Enter') {
  const current = await question(page, kind), selected = correct ? current.correct : (current.correct + 1) % current.a.length;
  const target = current.group.locator('[data-punnett-answer="' + selected + '"]');
  await activate(page, target, key);
  const status = page.locator(feedback[kind]); await expect(status).toHaveRole('status');
  await expect(status).toContainText(kind === 'challenge' ? correct ? 'Correct!' : 'Incorrect.' : correct ? 'Hit!' : 'Virus attacks!');
  await expect(target).toBeFocused();
  const locked = current.group.locator('[data-punnett-answer]');
  for (let index = 0; index < await locked.count(); index++) {
    await expect(locked.nth(index)).toHaveAttribute('aria-disabled', 'true');
    await expect(locked.nth(index)).toHaveAttribute('aria-describedby', feedback[kind].slice(1));
    await expect(locked.nth(index)).toHaveAccessibleDescription(await status.textContent() as string);
  }
  await expect(target.getByText('Your answer', { exact: true })).toBeVisible();
  await expect(current.group.locator('[data-punnett-answer="' + current.correct + '"]').getByText('Correct answer', { exact: true })).toBeVisible();
  await expect(page.locator(continues[kind])).toBeVisible();
  return { ...current, selected, target, status };
}
async function next(page: Page, kind: Kind, key = 'Enter') {
  await activate(page, page.locator(continues[kind]), key);
  await expect(page.locator(headings[kind])).toBeFocused(); await expect(page.locator(feedback[kind])).toHaveText('');
  return question(page, kind);
}
async function seedChallenge(page: Page, values: Record<string, unknown> = {}) {
  await patch(page, { subtool: 'challenge', _chalDiff: 'easy', _chalIdx: 0, _chalScore: 0, _chalStreak: 0,
    _chalFeedback: null, _selectedOption: null, ...values });
  await expect(page.locator(scopes.challenge)).toBeVisible();
}
async function seedBattle(page: Page, values: Record<string, unknown> = {}) {
  await patch(page, { subtool: 'battle', _battleActive: true, _battleRound: 0, _battleHP: 100,
    _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null, _selectedOption: null, ...values });
  await expect(page.locator(scopes.battle)).toBeVisible();
}
async function meters(page: Page, cellHP: number, virusHP: number) {
  const values: any[] = [];
  for (const [name, value] of [['Your cell health', cellHP], ['Mutation virus health', virusHP]] as [string, number][]) {
    const meter = page.locator(scopes.battle).getByRole('meter', { name, exact: true });
    await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
    await expect(meter).toHaveAttribute('aria-valuenow', String(value)); await expect(meter).toHaveAttribute('aria-valuetext', new RegExp(String(value) + '.*HP|HP.*' + value, 'i'));
    values.push({ name, value, valueText: await meter.getAttribute('aria-valuetext') });
  }
  return values;
}
async function result(page: Page, kind: Kind, pattern: RegExp) {
  const target = page.locator('[data-punnett-' + kind + '-result]');
  await expect(target).toHaveRole('heading'); await expect(target).toHaveAttribute('tabindex', '-1');
  await expect(target).toContainText(pattern); await expect(target).toBeFocused();
  await expect(page.locator(scopes[kind]).locator('[data-punnett-answer]')).toHaveCount(0);
  return target;
}
function report(name: string, data: unknown) { writeFileSync(resolve(output, name), JSON.stringify(data, null, 2)); }

test('challenge feedback remains until explicit Continue and difficulty controls expose distinct names and state', async ({ page }) => {
  const initial = await setup(page, 'challenge'); await page.clock.install();
  const difficulty = page.locator(scopes.challenge).getByRole('group', { name: 'Challenge difficulty', exact: true });
  await expect(difficulty.getByRole('button')).toHaveCount(3);
  const records: any[] = [];
  for (let index = 0; index < 3; index++) {
    const response = await answer(page, 'challenge', true, index % 2 ? 'Space' : 'Enter'), submitted = await state(page);
    expect(submitted._chalIdx).toBe(index); expect(submitted._chalScore).toBe(index + 1); expect(submitted._chalStreak).toBe(index + 1);
    await page.clock.runFor(2100); expect(await state(page)).toEqual(submitted); await expect(response.target).toBeFocused();
    const rewards = await xp(page, 'chalQ_');
    await page.keyboard.press('Enter'); await page.keyboard.press('Space');
    expect(await state(page)).toEqual(submitted); expect(await xp(page, 'chalQ_')).toEqual(rewards);
    const following = await next(page, 'challenge', index % 2 ? 'Enter' : 'Space'); expect(following.index).toBe(index + 1);
    records.push({ question: response.q, selected: response.selected, score: submitted._chalScore, streak: submitted._chalStreak,
      feedbackRetainedBeyondOld1500ms: true, repeatedSubmissionIgnored: true, nextQuestionFocused: true });
  }
  expect(await xp(page, 'chalQ_')).toEqual([
    ['chalQ_easy_0', 10, 'Challenge easy'], ['chalQ_easy_1', 10, 'Challenge easy'], ['chalQ_easy_2', 15, 'Challenge easy'],
  ]);
  const levels: any[] = [];
  for (const [key, name] of [['medium', 'Intermediate'], ['hard', 'Advanced'], ['easy', 'Beginner']]) {
    const target = difficulty.getByRole('button', { name: new RegExp('\\b' + name + '\\b') });
    await activate(page, target, key === 'hard' ? 'Space' : 'Enter');
    await expect(target).toHaveAttribute('aria-pressed', 'true'); await expect(difficulty.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator(headings.challenge)).toBeFocused();
    const current = await state(page); expect(current._chalDiff).toBe(key); expect(current._chalIdx).toBe(0);
    expect(current._chalScore).toBe(0); expect(current._chalStreak).toBe(0); expect(current._chalFeedback).toBeNull();
    await question(page, 'challenge'); levels.push({ key, name: await target.textContent(), pressed: true, questionFocused: true });
  }
  await preserved(page, initial.baseline, challengeChanges); expect(initial.errors).toEqual([]);
  report('quiz-challenge-keyboard.json', { records, levels, rewards: await xp(page, 'chalQ_'), unrelatedLearningPreserved: true });
});

test('wrong-answer vocabulary returns to its opener and final Continue completes challenge totals exactly once', async ({ page }) => {
  const initial = await setup(page, 'challenge');
  const response = await answer(page, 'challenge', false, 'Space'), beforeModal = await state(page);
  const opener = page.locator(scopes.challenge).locator('[data-punnett-vocab-term="' + response.concept + '"]');
  await activate(page, opener);
  const dialog = page.locator('[data-punnett-vocab-dialog]'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close flashcard', exact: true })).toBeFocused();
  expect(await page.locator('[data-punnett-content]').evaluate((node: HTMLElement) => node.inert)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  expect(await page.locator('[data-punnett-content]').evaluate((node: HTMLElement) => node.inert)).toBe(false);
  await preserved(page, beforeModal, ['_studyConcept']); expect(await xp(page, 'studyVocab_')).toEqual([]);
  await expect(response.status).toContainText('Incorrect.'); expect((await state(page))._chalScore).toBe(0);
  await next(page, 'challenge', 'Space'); expect((await state(page))._chalIdx).toBe(1);
  const questions = await bank(page, 'challenge');
  await seedChallenge(page, { _chalIdx: questions.length - 1, _chalScore: 4, _chalStreak: 2 });
  await answer(page, 'challenge', false); expect((await state(page))._chalScore).toBe(4); expect((await state(page))._chalStreak).toBe(0);
  await activate(page, page.locator(continues.challenge), 'Space'); await result(page, 'challenge', /Challenge Complete/i);
  const completed = await state(page); expect(completed._chalIdx).toBe(questions.length); expect(completed._chalTotalScore).toBe(11);
  await page.keyboard.press('Enter'); await page.keyboard.press('Space'); expect(await state(page)).toEqual(completed);
  await expect(page.locator(continues.challenge)).toHaveCount(0);
  await activate(page, page.locator(scopes.challenge).getByRole('button', { name: /Retry Easy/ }));
  await expect(page.locator(headings.challenge)).toBeFocused(); await question(page, 'challenge');
  expect((await state(page))._chalIdx).toBe(0); expect((await state(page))._chalScore).toBe(0); expect((await state(page))._chalTotalScore).toBe(11);
  await preserved(page, initial.baseline, [...challengeChanges, '_studyConcept']); expect(initial.errors).toEqual([]);
  report('quiz-challenge-completion.json', { vocabularyEscapeRestoresOpener: true, incorrectFeedbackRetained: true,
    explicitContinueFocusesNext: true, finalIndex: completed._chalIdx, finalScore: completed._chalScore,
    previousTotal: initial.baseline._chalTotalScore, newTotal: completed._chalTotalScore, totalAddedOnce: true,
    retryNameIncludesDifficulty: true, retryFocusesFirstQuestion: true, studyRewardsNotGrantedOnOpenClose: true, unrelatedLearningPreserved: true });
});

test('battle retains answer feedback, exposes health meters and resolves victory loss and exhaustion on explicit Continue', async ({ page }) => {
  const initial = await setup(page, 'battle'); await page.clock.install();
  await activate(page, page.locator(scopes.battle).getByRole('button', { name: /Start Battle/ }), 'Space');
  await expect(page.locator(headings.battle)).toBeFocused(); const startMeters = await meters(page, 100, 100);
  const first = await answer(page, 'battle', true), submitted = await state(page);
  expect(submitted._battleEnemyHP).toBe(100 - first.dmg); expect(submitted._battleHP).toBe(100); expect(submitted._battleScore).toBe(1);
  await page.clock.runFor(2100); expect(await state(page)).toEqual(submitted); await expect(first.target).toBeFocused();
  await page.keyboard.press('Space'); expect(await state(page)).toEqual(submitted);
  await next(page, 'battle', 'Space'); expect((await state(page))._battleRound).toBe(1);
  await answer(page, 'battle', false, 'Space'); const wrong = await state(page);
  expect(wrong._battleHP).toBe(85); expect(wrong._battleEnemyHP).toBe(100 - first.dmg); expect(wrong._battleScore).toBe(1);
  const wrongMeters = await meters(page, 85, 100 - first.dmg);
  await next(page, 'battle'); expect((await state(page))._battleRound).toBe(2);

  await seedBattle(page, { _battleEnemyHP: first.dmg, _battleHP: 85, _battleScore: 3 });
  await answer(page, 'battle', true); await meters(page, 85, 0);
  expect((await state(page))._battleResult).toBeNull(); expect(await xp(page, 'battleWin')).toEqual([]);
  await activate(page, page.locator(continues.battle)); await result(page, 'battle', /Victory/i);
  await expect.poll(async () => (await state(page)).researchPoints).toBe(initial.baseline.researchPoints + 30);
  const victory = await state(page), victoryXP = await xp(page, 'battleWin');
  expect(victory._battleResult).toBe('won'); expect(victory._battleActive).toBe(false); expect(victory._battleScore).toBe(4); expect(victory._battleWon).toBe(true);
  expect(victory._completedChallenges.battle_won).toBe(true); expect(victoryXP).toEqual([['battleWin', 30, 'Gene Defense Victory']]);
  await page.keyboard.press('Enter'); await page.keyboard.press('Space'); expect(await xp(page, 'battleWin')).toEqual(victoryXP);
  await activate(page, page.locator(scopes.battle).getByRole('button', { name: /Battle Again/ }), 'Space');
  await expect(page.locator(headings.battle)).toBeFocused(); await meters(page, 100, 100); expect((await state(page))._battleScore).toBe(0);

  await seedBattle(page, { _battleHP: 15, _battleEnemyHP: 70, _battleScore: 2 });
  await answer(page, 'battle', false); await meters(page, 0, 70);
  expect((await state(page))._battleResult).toBeNull();
  await activate(page, page.locator(continues.battle), 'Space'); await result(page, 'battle', /Defeated/i);
  const loss = await state(page); expect(loss._battleResult).toBe('lost'); expect(loss._battleScore).toBe(2);
  const questions = await bank(page, 'battle');
  await seedBattle(page, { _battleRound: questions.length - 1, _battleHP: 60, _battleEnemyHP: 100, _battleScore: 2 });
  const finalAnswer = await answer(page, 'battle', true); await activate(page, page.locator(continues.battle));
  await result(page, 'battle', /All Rounds Completed/i);
  const exhausted = await state(page); expect(exhausted._battleActive).toBe(true); expect(exhausted._battleResult).toBeNull();
  expect(exhausted._battleRound).toBe(questions.length); expect(exhausted._battleScore).toBe(3); expect(exhausted._battleHP).toBe(60);
  expect(exhausted._battleEnemyHP).toBe(100 - finalAnswer.dmg); expect(await xp(page, 'battleWin')).toEqual(victoryXP);
  await activate(page, page.locator(scopes.battle).getByRole('button', { name: /Try Again/ }), 'Space');
  await expect(page.locator(headings.battle)).toBeFocused(); expect((await state(page))._battleRound).toBe(0);
  await meters(page, 100, 100); expect((await state(page))._battleScore).toBe(0);
  await preserved(page, initial.baseline, [...battleChanges, '_battleWon', '_completedChallenges', '_badges', 'researchPoints']); expect(initial.errors).toEqual([]);
  report('quiz-battle-keyboard.json', { feedbackRetainedBeyondOld1500ms: true, startMeters, wrongMeters,
    firstDamage: first.dmg, wrongAnswerDamage: 15, victory: { score: victory._battleScore, HP: victory._battleHP, XP: victoryXP, RP: victory.researchPoints },
    loss: { score: loss._battleScore, HP: loss._battleHP, result: loss._battleResult },
    exhaustion: { rounds: exhausted._battleRound, score: exhausted._battleScore, HP: exhausted._battleHP, virusHP: exhausted._battleEnemyHP },
    allTerminalHeadingsFocused: true, restartRestoresHealthAndFocus: true, unrelatedLearningPreserved: true });
});

test('quiz choices and feedback reflow with 320px text spacing and retain keyboard focus in forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); const initial = await setup(page, 'challenge');
  await page.addStyleTag({ content: '[data-punnett-tool], [data-punnett-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-punnett-tool] p{margin-bottom:2em!important}' });
  await answer(page, 'challenge', false, 'Space');
  const normal = await quizLayout(page, 'challenge'); await page.locator(scopes.challenge).screenshot({ path: resolve(output, 'quiz-challenge-mobile-normal.jpg'), type: 'jpeg', quality: 90 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const snapshots: any[] = [];
  for (const kind of ['challenge', 'battle'] as Kind[]) {
    if (kind === 'battle') {
      await patch(page, { subtool: 'battle' });
      await activate(page, page.locator(scopes.battle).getByRole('button', { name: /Start Battle/ }), 'Space');
      await answer(page, 'battle', false);
    }
    const before = await state(page), controls = page.locator(scopes[kind]).locator('button');
    const healthMeters = kind === 'battle' ? await forcedColorMeters(page) : [];
    const targets: any[] = [];
    for (let index = 0; index < await controls.count(); index++) {
      const button = controls.nth(index); await button.scrollIntoViewIfNeeded(); await button.focus();
      const bounds = await button.evaluate((element: HTMLElement) => {
        const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return { name: element.textContent?.trim(), width: box.width, height: box.height, left: box.left, right: box.right,
          centerHitsControl: !!hit && (hit === element || element.contains(hit)) };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(-1); expect(bounds.right).toBeLessThanOrEqual(321);
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44); expect(bounds.centerHitsControl).toBe(true);
      targets.push(bounds);
    }
    await page.locator(continues[kind]).focus(); await page.keyboard.press('Shift+Tab');
    const geometry = await quizLayout(page, kind); expect(geometry.forcedColors).toBe(true); expect(geometry.focus.visible).toBe(true);
    expect(geometry.focus.outlineWidth).toBeGreaterThanOrEqual(3); expect(geometry.focus.outlineStyle).not.toBe('none');
    expect(geometry.focus.foreground).not.toBe(geometry.focus.background); expect(await state(page)).toEqual(before);
    await page.locator(scopes[kind]).screenshot({ path: resolve(output, 'quiz-' + kind + '-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
    const following = await next(page, kind, 'Space'); expect(following.index).toBe(1);
    snapshots.push({ kind, geometry, targets, healthMeters, explicitNextFocusesQuestion: true });
  }
  expect((await state(page)).learnerNotes).toBe(initial.baseline.learnerNotes);
  expect((await state(page))._dnaSeq).toBe(initial.baseline._dnaSeq); expect((await state(page)).researchPoints).toBe(initial.baseline.researchPoints);
  expect(await page.evaluate(() => (window as any).__toolData.ecology)).toEqual(siblingLearning); expect(initial.errors).toEqual([]);
  report('quiz-mobile-reflow.json', { viewport: 320, spacing: { line: 1.5, letter: '.12em', word: '.16em', paragraph: '2em' }, normal, snapshots,
    minimum44PixelTargets: true, allCentersHitTheirControls: true, feedbackAndSavedLearningPreservedDuringInspection: true });
});

test('normal-palette axe checks cover unanswered answered completed and terminal quiz states', async ({ page }) => {
  const initial = await setup(page, 'challenge'); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(name: string, scope: string) {
    const audit = await page.locator(scope).evaluate(async root => {
      const result = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      type Color = [number, number, number, number];
      const parse = (value: string): Color | null => {
        const values = value.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);
        if (!values || values.length < 3) return null;
        const channel = (value: string) => value.endsWith('%') ? parseFloat(value) * 2.55 : parseFloat(value);
        return [channel(values[0]), channel(values[1]), channel(values[2]), values[3] ? parseFloat(values[3]) / (values[3].endsWith('%') ? 100 : 1) : 1];
      };
      const over = (foreground: Color, background: Color): Color => [
        ...foreground.slice(0, 3).map((value, index) => value * foreground[3] + background[index] * (1 - foreground[3])), 1,
      ] as Color;
      const luminance = (color: Color) => {
        const linear = color.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
      };
      const colorText = (color: Color) => 'rgb(' + color.slice(0, 3).map(value => Math.round(value * 1000) / 1000).join(', ') + ')';
      const contrast = (element: HTMLElement | null, layers: any[]) => {
        const text = element?.textContent?.trim() || '', foreground = element ? parse(getComputedStyle(element).color) : null;
        const limitations: string[] = [];
        let backgrounds: Color[] = [[255, 255, 255, 1]];
        for (const layer of [...layers].reverse()) {
          if (Number(layer.opacity) < 1) limitations.push('Ancestor opacity needs visual review: ' + layer.tag);
          const color = parse(layer.background);
          if (color) backgrounds = backgrounds.map(background => over(color, background));
          if (layer.gradient !== 'none') {
            const stops = layer.gradient.match(/rgba?\([^)]+\)/gi)?.map(parse).filter((color: Color | null): color is Color => !!color) || [];
            if (/^linear-gradient\(/.test(layer.gradient) && stops.length >= 2) backgrounds = backgrounds.flatMap(background => stops.map((stop: Color) => over(stop, background)));
            else limitations.push('Background image is outside the endpoint model: ' + layer.gradient);
          }
        }
        if (!element) limitations.push('Target did not resolve in this scope.');
        if (!foreground) limitations.push('Foreground is outside the RGB model.');
        const unique = [...new Map(backgrounds.map(color => [colorText(color), color])).values()];
        return { found: !!element, text, foreground: element ? getComputedStyle(element).color : null,
          decorativeEmpty: !text && !!element && (element.getAttribute('aria-hidden') === 'true' || element.getAttribute('role') === 'presentation'),
          glyphOnly: !!text && !/[\p{L}\p{N}]/u.test(text),
          backgroundSamples: foreground ? unique.map(background => {
            const effective = over(foreground, background), a = luminance(effective), b = luminance(background);
            return { color: colorText(background), effectiveForeground: colorText(effective), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          }) : [], limitations: [...new Set(limitations)] };
      };
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => {
        let element: HTMLElement | null = null;
        try { if (node.target.length === 1) element = root.matches(node.target[0]) ? root as HTMLElement : root.querySelector(node.target[0]); } catch { /* recorded unresolved */ }
        const computed: any[] = [];
        for (let current = element; current; current = current.parentElement) {
          const css = getComputedStyle(current);
          computed.push({ tag: current.tagName, id: current.id, color: css.color, background: css.backgroundColor, gradient: css.backgroundImage,
            fontSize: css.fontSize, fontWeight: css.fontWeight, opacity: css.opacity });
        }
        return { target: node.target, html: node.html, failureSummary: node.failureSummary, computed, contrast: contrast(element, computed) };
      }) });
      return { version: result.testEngine.version, forcedColors: matchMedia('(forced-colors: active)').matches,
        violations: result.violations.map(compact), incomplete: result.incomplete.map(compact),
        inspectedNodes: [...result.passes, ...result.incomplete, ...result.violations].reduce((sum, rule) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state: name, scope, ...audit });
    const contrastTargets = scans.flatMap(scan => scan.incomplete.flatMap((rule: any) => rule.nodes)).filter(node => !node.contrast.decorativeEmpty);
    const contrastSamples = contrastTargets.flatMap(node => node.contrast.backgroundSamples);
    const totals = { scans: scans.length, violations: scans.reduce((sum, scan) => sum + scan.violations.length, 0),
      violationNodes: scans.reduce((sum, scan) => sum + scan.violations.reduce((count: number, rule: any) => count + rule.nodes.length, 0), 0),
      incompleteRules: scans.reduce((sum, scan) => sum + scan.incomplete.length, 0),
      incompleteNodes: scans.reduce((sum, scan) => sum + scan.incomplete.reduce((count: number, rule: any) => count + rule.nodes.length, 0), 0),
      supplementedContrastTargets: contrastTargets.length, supplementedBackgroundSamples: contrastSamples.length,
      minimumSupplementedContrast: contrastSamples.length ? Math.min(...contrastSamples.map(sample => sample.ratio)) : null };
    report('quiz-axe.json', { scope: 'All three selected Challenge difficulty states, current answers/feedback/completion and Battle intro/current answers/feedback/victory/loss/exhaustion',
      contrastMethod: 'WCAG sRGB relative luminance; computed RGB/alpha foregrounds and ancestor backgrounds; every linear-gradient endpoint composited over its ancestor surface. A conservative 4.5:1 minimum is required for all nondecorative incomplete targets.',
      limitation: 'Scoped normal-palette axe checks do not establish complete WCAG conformance. Endpoint ratios do not clear overlap warnings, assess emoji/glyph meaning, sample intermediate gradient interpolation, images or antialiasing, or model ancestor opacity. Empty decorative nodes remain recorded. Forced-color layout and keyboard checks run separately.', totals, scans });
    expect(audit.forcedColors).toBe(false); expect(audit.inspectedNodes).toBeGreaterThan(0);
    expect(audit.violations, name + ': ' + JSON.stringify(audit.violations)).toEqual([]);
    for (const rule of audit.incomplete) for (const node of rule.nodes) {
      const evidence = node.contrast;
      if (evidence.decorativeEmpty) continue;
      expect(evidence.found, name + ': unresolved target ' + node.target.join(' ')).toBe(true);
      expect(evidence.limitations, name + ': contrast model needs review for ' + evidence.text).toEqual([]);
      expect(evidence.backgroundSamples.length, name + ': no background samples for ' + evidence.text).toBeGreaterThan(0);
      for (const background of evidence.backgroundSamples) {
        expect(background.ratio, name + ': ' + evidence.text + ' against ' + background.color).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
  const difficulty = page.locator(scopes.challenge).getByRole('group', { name: 'Challenge difficulty', exact: true });
  await scan('challenge selected Beginner difficulty', '[data-punnett-difficulty-group]');
  for (const label of ['Intermediate', 'Advanced']) {
    const selected = difficulty.getByRole('button', { name: new RegExp('\\b' + label + '\\b') });
    await activate(page, selected, label === 'Advanced' ? 'Space' : 'Enter');
    await expect(selected).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator(headings.challenge)).toBeFocused();
    await scan('challenge selected ' + label + ' difficulty', '[data-punnett-difficulty-group]');
  }
  await activate(page, difficulty.getByRole('button', { name: /Beginner/ }));
  await expect(difficulty.getByRole('button', { name: /Beginner/ })).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page))._chalDiff).toBe('easy');
  await scan('challenge unanswered', scopes.challenge);
  await answer(page, 'challenge', true); await scan('challenge correct feedback', scopes.challenge);
  await next(page, 'challenge'); await answer(page, 'challenge', false); await scan('challenge wrong feedback', scopes.challenge);
  const challenge = await bank(page, 'challenge');
  await seedChallenge(page, { _chalIdx: challenge.length - 1, _chalScore: 4 });
  await answer(page, 'challenge', true); await activate(page, page.locator(continues.challenge)); await result(page, 'challenge', /Challenge Complete/i);
  await scan('challenge complete', scopes.challenge);
  await page.locator(scopes.challenge).screenshot({ path: resolve(output, 'quiz-challenge-complete-normal.jpg'), type: 'jpeg', quality: 90 });
  await patch(page, { subtool: 'battle', _battleActive: false, _battleResult: null }); await scan('battle intro', scopes.battle);
  await activate(page, page.locator(scopes.battle).getByRole('button', { name: /Start Battle/ })); await scan('battle unanswered', scopes.battle);
  const right = await answer(page, 'battle', true); await scan('battle correct feedback', scopes.battle);
  await next(page, 'battle'); await answer(page, 'battle', false); await scan('battle wrong feedback', scopes.battle);
  await page.locator(scopes.battle).screenshot({ path: resolve(output, 'quiz-battle-feedback-normal.jpg'), type: 'jpeg', quality: 90 });
  await seedBattle(page, { _battleEnemyHP: right.dmg }); await answer(page, 'battle', true); await activate(page, page.locator(continues.battle));
  await result(page, 'battle', /Victory/i); await scan('battle victory', scopes.battle);
  await seedBattle(page, { _battleHP: 15 }); await answer(page, 'battle', false); await activate(page, page.locator(continues.battle));
  await result(page, 'battle', /Defeated/i); await scan('battle loss', scopes.battle);
  const battle = await bank(page, 'battle'); await seedBattle(page, { _battleRound: battle.length - 1, _battleHP: 60, _battleEnemyHP: 100 });
  await answer(page, 'battle', true); await activate(page, page.locator(continues.battle)); await result(page, 'battle', /All Rounds Completed/i);
  await scan('battle all rounds completed', scopes.battle); expect(scans).toHaveLength(14);
  await page.locator(scopes.battle).screenshot({ path: resolve(output, 'quiz-battle-exhausted-normal.jpg'), type: 'jpeg', quality: 90 });
  expect((await state(page)).learnerNotes).toBe(initial.baseline.learnerNotes); expect((await state(page))._dnaSeq).toBe(initial.baseline._dnaSeq);
  expect(await page.evaluate(() => (window as any).__toolData.ecology)).toEqual(siblingLearning); expect(initial.errors).toEqual([]);
});

async function forcedColorMeters(page: Page) {
  await meters(page, 85, 100);
  const presentations: any[] = [];
  for (const [name, expectedValue] of [['Your cell health', 85], ['Mutation virus health', 100]] as [string, number][]) {
    const meter = page.locator(scopes.battle).getByRole('meter', { name, exact: true });
    await meter.scrollIntoViewIfNeeded();
    const presentation = await meter.evaluate((track: HTMLElement) => {
      const fill = track.firstElementChild as HTMLElement, box = track.getBoundingClientRect(), fillBox = fill.getBoundingClientRect();
      const css = getComputedStyle(track), fillCSS = getComputedStyle(fill);
      const border = {
        top: { width: parseFloat(css.borderTopWidth), style: css.borderTopStyle, color: css.borderTopColor },
        right: { width: parseFloat(css.borderRightWidth), style: css.borderRightStyle, color: css.borderRightColor },
        bottom: { width: parseFloat(css.borderBottomWidth), style: css.borderBottomStyle, color: css.borderBottomColor },
        left: { width: parseFloat(css.borderLeftWidth), style: css.borderLeftStyle, color: css.borderLeftColor },
      };
      const contentWidth = box.width - border.left.width - border.right.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      return { forcedColors: matchMedia('(forced-colors: active)').matches, name: track.getAttribute('aria-label'), value: Number(track.getAttribute('aria-valuenow')),
        track: { width: box.width, contentWidth, background: css.backgroundColor, left: box.left, right: box.right, border },
        fill: { width: fillBox.width, left: fillBox.left, right: fillBox.right, background: fillCSS.backgroundColor,
          forcedColorAdjust: fillCSS.forcedColorAdjust, normalizedWidth: fillBox.width / contentWidth } };
    });
    expect(presentation.forcedColors).toBe(true); expect(presentation.value).toBe(expectedValue);
    for (const edge of Object.values(presentation.track.border)) {
      expect(edge.width).toBeGreaterThanOrEqual(1); expect(edge.style).toBe('solid');
      expect(edge.color).not.toBe(presentation.track.background); expect(edge.color).not.toBe('rgba(0, 0, 0, 0)');
    }
    expect(presentation.fill.background).not.toBe(presentation.track.background); expect(presentation.fill.forcedColorAdjust).toBe('none');
    expect(presentation.fill.width).toBeGreaterThan(0); expect(presentation.fill.width).toBeLessThanOrEqual(presentation.track.contentWidth + 1);
    expect(presentation.fill.left).toBeGreaterThanOrEqual(presentation.track.left + presentation.track.border.left.width - 1);
    expect(presentation.fill.right).toBeLessThanOrEqual(presentation.track.right - presentation.track.border.right.width + 1);
    expect(Math.abs(presentation.fill.width - presentation.track.contentWidth * expectedValue / 100)).toBeLessThanOrEqual(1);
    expect(presentation.fill.normalizedWidth).toBeCloseTo(expectedValue / 100, 2);
    presentations.push(presentation);
  }
  expect(presentations[0].fill.normalizedWidth / presentations[1].fill.normalizedWidth).toBeCloseTo(.85, 2);
  return presentations;
}

async function quizLayout(page: Page, kind: Kind) {
  const geometry = await page.locator(scopes[kind]).evaluate((node: HTMLElement) => {
    const box = node.getBoundingClientRect(), focused = document.activeElement as HTMLElement, css = getComputedStyle(focused);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: box.left, right: box.right,
      horizontalOverflow: Array.from(node.querySelectorAll<HTMLElement>('button,p,h3')).filter(element => element.scrollWidth > element.clientWidth + 2).map(element => element.textContent?.trim()),
      forcedColors: matchMedia('(forced-colors: active)').matches,
      focus: { visible: focused.matches(':focus-visible'), outlineColor: css.outlineColor, outlineWidth: parseFloat(css.outlineWidth),
        outlineStyle: css.outlineStyle, foreground: css.color, background: css.backgroundColor,
        font: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), letter: parseFloat(css.letterSpacing), word: parseFloat(css.wordSpacing) } };
  });
  expect(geometry.viewport).toBe(320); expect(geometry.documentWidth).toBeLessThanOrEqual(321);
  expect(geometry.left).toBeGreaterThanOrEqual(-1); expect(geometry.right).toBeLessThanOrEqual(321); expect(geometry.horizontalOverflow).toEqual([]);
  expect(geometry.focus.line).toBeCloseTo(geometry.focus.font * 1.5, 1); expect(geometry.focus.letter).toBeCloseTo(geometry.focus.font * .12, 1);
  expect(geometry.focus.word).toBeCloseTo(geometry.focus.font * .16, 1); return geometry;
}
