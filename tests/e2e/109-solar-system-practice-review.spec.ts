import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountPractice(page: Page, tab = 6, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__practiceAwards = [];
    (window as any).__ctx.awardXP = (...args: unknown[]) => { (window as any).__practiceAwards.push(args); };
    (window as any).__rerender();
  }, {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: tab,
    orr_chi: 0, orr_tfi: 0, orr_cli: 1, orr_time: 0, orr_paused: true,
    orr_sel: 'mars', orr_compare: 'earth', orr_follow: 'mars',
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Keep my saved evidence.' }],
    journalEntries: [{ id: 'retained', title: 'My earlier explanation', text: 'Keep this writing.' }],
    keplerInquiry: { a: 2, e: 0.2, mass: 1, testVariable: 'a', baseline: { a: 1, e: 0.2, mass: 1 },
      hypothesis: 'Keep my earlier prediction.', explanation: 'Keep my earlier explanation.', log: [] },
    orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25,
    isDark: dark, ...patch,
  });
  const section = page.locator(tab === 6 ? '#orrery-calculation-practice' : '#orrery-misconception-practice');
  await expect(section).toBeVisible();
  return section;
}

async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
async function rewards(page: Page) { return page.evaluate(() => (window as any).__practiceAwards as unknown[][]); }

async function protectedState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(Object.fromEntries([
      'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots',
      'missionLog', 'journalEntries', 'keplerInquiry', 'orr_wsa', 'orr_wse', 'orr_wsphase',
    ].map((key) => [key, data[key]]))));
  });
}

async function expectCalculationProgress(page: Page, solved: number) {
  await expect(page.locator('#orrery-challenge-progress')).toHaveText(`Challenge progress: ${solved} of 10 solved`);
  const progress = page.getByRole('progressbar', { name: 'Challenge completion', exact: true });
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '10');
  await expect(progress).toHaveAttribute('aria-valuenow', String(solved));
  await expect.poll(async () => (await state(page))._chalScore ?? 0).toBe(solved);
}

async function expectStatus(status: Locator, focused = false) {
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  if (focused) await expect(status).toBeFocused();
}

async function calculation(page: Page, question = 0) {
  await expect(page.locator('#orrery-calculation-question')).toHaveAttribute('data-question-index', String(question));
  const input = page.locator('#orrery-calculation-answer');
  await expect(input).toHaveAttribute('type', 'number');
  await expect(input).toBeVisible();
  return input;
}

async function chooseCalculation(page: Page, number: number) {
  const nav = page.getByRole('group', { name: 'Challenge question navigator', exact: true });
  const button = nav.getByRole('button', { name: new RegExp(`^Question ${number}:`) });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#orrery-calculation-question')).toHaveAttribute('data-question-index', String(number - 1));
}

async function chooseIdea(page: Page, number: number) {
  const nav = page.getByRole('group', { name: 'True or false question navigator', exact: true });
  const button = nav.getByRole('button', { name: new RegExp(`^Idea ${number}:`) });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#orrery-misconception-question')).toBeVisible();
  await expect(page.locator('#orrery-misconception-question')).toHaveAttribute('data-question-index', String(number - 1));
}

async function revealAllHints(section: Locator) {
  const hint = section.getByRole('button', { name: /^Reveal hint/i });
  for (let count = 0; count < 10; count++) {
    if (!(await hint.count()) || !(await hint.isEnabled())) break;
    await hint.click();
  }
  await expect(section.getByRole('button', { name: 'Show worked solution', exact: true })).toBeEnabled();
  await expect(section.locator('#orrery-calculation-solution-toggle')).toBeFocused();
}

async function expectReadableLayout(section: Locator, width: number) {
  const geometry = await section.evaluate((region) => {
    const box = region.getBoundingClientRect();
    const controls = [...region.querySelectorAll<HTMLElement>('button, input, select')].map((control) => {
      const bounds = control.getBoundingClientRect();
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height,
        font: Number.parseFloat(getComputedStyle(control).fontSize) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: box.left, right: box.right, clientWidth: region.clientWidth, scrollWidth: region.scrollWidth,
      pageWidth: document.documentElement.scrollWidth, controls };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(width + 1);
  expect(geometry.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 12 ||
    control.left < -1 || control.right > width + 1), 'every visible control is readable, contained, and at least 44px').toEqual([]);
}

async function expectReadableText(section: Locator) {
  const failures = await section.evaluate((region) => {
    type Color = [number, number, number, number];
    const parse = (color: string): Color => {
      if (color === 'transparent') return [0, 0, 0, 0];
      const values = color.match(/[\d.]+/g)?.map(Number) || [];
      if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    const over = (top: Color, bottom: Color): Color => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((index) => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha)
        .concat(alpha) as Color;
    };
    const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...region.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 &&
        style.visibility !== 'hidden' && !element.closest('.sr-only, .orr-practice-sr, button:disabled, input:disabled, select:disabled') &&
        [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    }).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1], opacity = 1;
      for (const ancestor of chain) {
        const style = getComputedStyle(ancestor);
        background = over(parse(style.backgroundColor), background);
        opacity *= Number(style.opacity);
      }
      const style = getComputedStyle(element), foreground = parse(style.color);
      foreground[3] *= opacity;
      const a = luminance(over(foreground, background)), b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter(({ ratio, font }) => ratio < 4.5 || font < 12);
  });
  expect(failures, 'questions, explanations, feedback and choices remain readable').toEqual([]);
}

async function expectNoErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }

test('native Enter and click grading expose persistent feedback and focus the successful result', async ({ page }) => {
  const section = await mountPractice(page), retained = await protectedState(page);
  const feedback = page.locator('#orrery-challenge-feedback');
  await expectStatus(feedback);
  await expectCalculationProgress(page, 0);
  const input = await calculation(page);
  await expect(input).toHaveAttribute('aria-label', /^Jupiter orbits/);
  await expect(input).toHaveAccessibleName(/^Jupiter orbits[\s\S]*Your answer/);
  await input.fill('10');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(feedback).toContainText(/try again/i);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAttribute('aria-describedby', /orrery-challenge-feedback/);
  expect(await rewards(page)).toEqual([]);
  await input.fill('11.86');
  await input.press('Enter');
  await expect(feedback).toContainText(/\bcorrect\b/i);
  await expectStatus(feedback, true);
  await expectCalculationProgress(page, 1);
  expect((await state(page)).orr_chc[0]).toBe(true);
  expect((await state(page)).orr_chlast[0]).toMatchObject({ value: 11.86, correct: true });
  const awarded = await rewards(page);
  expect(awarded).toHaveLength(1);
  expect(awarded[0].filter((value) => typeof value === 'number')).toEqual([10]);
  expect(await protectedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('practice again retains earned score and never awards a calculation twice', async ({ page }) => {
  const section = await mountPractice(page);
  await (await calculation(page)).fill('11.86');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await expectCalculationProgress(page, 1);
  const earned = await rewards(page);
  expect(earned).toHaveLength(1);
  expect(earned[0].filter((value) => typeof value === 'number')).toEqual([10]);
  await section.getByRole('button', { name: 'Practice again', exact: true }).click();
  let input = await calculation(page);
  await input.fill('10');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('#orrery-challenge-feedback')).toContainText(/try again/i);
  await expectCalculationProgress(page, 1);
  expect((await state(page)).orr_chc[0]).toBe(true);
  expect(await rewards(page)).toEqual(earned);
  input = await calculation(page);
  await input.fill('11.86');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await expectStatus(page.locator('#orrery-challenge-feedback'), true);
  await expectCalculationProgress(page, 1);
  expect((await state(page)).orr_chlast[0]).toMatchObject({ value: 11.86, correct: true });
  expect(await rewards(page)).toEqual(earned);
  await expectNoErrors(page);
});

test('hints and worked solutions are usable explanations that do not mark a calculation solved', async ({ page }) => {
  const section = await mountPractice(page), retained = await protectedState(page);
  const input = await calculation(page);
  await input.press('Enter');
  await expect(page.locator('#orrery-challenge-feedback')).toContainText(/number|finite/i);
  await expect(input).toBeFocused();
  await expectCalculationProgress(page, 0);
  await section.getByRole('button', { name: /^Reveal hint/i }).click();
  expect((await state(page)).orr_chh[0]).toBe(1);
  await revealAllHints(section);
  await section.getByRole('button', { name: 'Show worked solution', exact: true }).click();
  const solution = page.locator('#orrery-calculation-solution');
  await expect(solution).toBeVisible();
  await expect(solution).toContainText(/11\.8|period|Kepler/i);
  expect((await state(page)).orr_chsolution[0]).toBe(true);
  await expectCalculationProgress(page, 0);
  await expect(input).toBeVisible();
  expect((await state(page)).orr_chc?.[0]).not.toBe(true);
  expect(await rewards(page)).toEqual([]);
  expect(await protectedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('drafts, hints and feedback remain isolated per question and survive question and tab navigation', async ({ page }) => {
  const section = await mountPractice(page), retained = await protectedState(page);
  await (await calculation(page)).fill('10');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await section.getByRole('button', { name: /^Reveal hint/i }).click();
  const first = await state(page), firstFeedback = await page.locator('#orrery-challenge-feedback').textContent();
  await chooseCalculation(page, 2);
  await (await calculation(page, 1)).fill('999');
  await section.getByRole('button', { name: 'Submit', exact: true }).click();
  await section.getByRole('button', { name: /^Reveal hint/i }).click();
  const second = await state(page);
  expect(second.orr_cha[0]).toBe(first.orr_cha[0]);
  expect(second.orr_chh[0]).toBe(first.orr_chh[0]);
  expect(second.orr_chf[0]).toBe(first.orr_chf[0]);
  expect(second.orr_cha[1]).toBe('999');
  expect(second.orr_chh[1]).toBe(1);
  await chooseCalculation(page, 1);
  await expect(await calculation(page)).toHaveValue('10');
  await expect(page.locator('#orrery-challenge-feedback')).toHaveText(firstFeedback!);
  await page.locator('#orrery-tab-7').click();
  await expect(page.locator('#orrery-misconception-practice')).toBeVisible();
  await page.locator('#orrery-tab-6').click();
  await expect(await calculation(page)).toHaveValue('10');
  await expect(page.locator('#orrery-challenge-feedback')).toHaveText(firstFeedback!);
  const restored = await state(page);
  for (const key of ['orr_cha', 'orr_chh', 'orr_chf']) expect(restored[key]).toEqual(second[key]);
  await expectCalculationProgress(page, 0);
  expect(await protectedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('malformed saved responses cannot inflate scores or hide unanswered ideas', async ({ page }) => {
  await mountPractice(page, 6, 1060, false, {
    orr_chi: 1.5,
    orr_chc: { 0: 'true', 1: { correct: true }, 2: 1, 3: null, 4: false, 5: true, 6: true, 9: true,
      10: true, 99: true, '-1': true, '1.5': true, junk: true },
  });
  await expectCalculationProgress(page, 3);
  const activeIndex = Number(await page.locator('#orrery-calculation-question').getAttribute('data-question-index'));
  expect(Number.isInteger(activeIndex)).toBe(true);
  expect(activeIndex).toBeGreaterThanOrEqual(0);
  expect(activeIndex).toBeLessThan(10);
  await chooseCalculation(page, 1);
  await expect(await calculation(page)).toBeVisible();
  expect(await rewards(page)).toEqual([]);
  await expectNoErrors(page);
  await harness.destroy(page);
  await mountPractice(page, 6, 1060, false, { orr_chc: [true, true, true], _chalScore: 3 });
  await expectCalculationProgress(page, 0);
  const arraySave = await state(page);
  expect(arraySave._chalScore).toBe(0);
  expect(arraySave.orr_chc).toEqual([true, true, true]);
  await expect(await calculation(page)).toBeVisible();
  expect(await rewards(page)).toEqual([]);
  await expectNoErrors(page);
  await harness.destroy(page);
  const known = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index, true]));
  await mountPractice(page, 6, 1060, true, { orr_chi: 999, orr_chc: { ...known, 10: true, 999: true, junk: true } });
  await expectCalculationProgress(page, 10);
  await expectNoErrors(page);
  await harness.destroy(page);
  await mountPractice(page, 7, 1060, false, {
    orr_tfi: Number.POSITIVE_INFINITY,
    orr_tfa: { 0: false, 1: true, 2: 'true', 3: null, 4: 0, 5: { value: false }, 14: true, 15: true, junk: false },
  });
  await expect(page.locator('#orrery-misconception-progress')).toHaveText('Ideas checked: 3 of 15');
  const nav = page.getByRole('group', { name: 'True or false question navigator', exact: true });
  await expect(nav.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await chooseIdea(page, 3);
  await expect(page.getByRole('button', { name: 'True', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'False', exact: true })).toBeVisible();
  await chooseIdea(page, 4);
  await expect(page.getByRole('button', { name: 'True', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'False', exact: true })).toBeVisible();
  expect(await rewards(page)).toEqual([]);
  await expectNoErrors(page);
});

test('True/False review retains the first answer and gives no repeat credit for either review outcome', async ({ page }) => {
  for (const firstAnswer of [false, true]) {
    const section = await mountPractice(page, 7), retained = await protectedState(page);
    await expect(page.locator('#orrery-misconception-progress')).toHaveText('Ideas checked: 0 of 15');
    await section.getByRole('button', { name: firstAnswer ? 'True' : 'False', exact: true }).click();
    const feedback = page.locator('#orrery-misconception-feedback');
    await expectStatus(feedback, true);
    await expect(feedback).toContainText(firstAnswer ? /not quite/i : /\bcorrect\b/i);
    await expect(feedback).toHaveAttribute('data-correct', String(!firstAnswer));
    await expect(page.locator('#orrery-misconception-progress')).toHaveText('Ideas checked: 1 of 15');
    expect((await state(page)).orr_tfa[0]).toBe(firstAnswer);
    const firstAwards = await rewards(page);
    expect(firstAwards).toHaveLength(firstAnswer ? 0 : 1);
    if (!firstAnswer) expect(firstAwards[0].filter((value) => typeof value === 'number')).toEqual([8]);
    await section.getByRole('button', { name: 'Review this idea', exact: true }).click();
    expect((await state(page)).orr_tfreviewing[0]).toBe(true);
    await section.getByRole('button', { name: firstAnswer ? 'False' : 'True', exact: true }).click();
    await expectStatus(feedback, true);
    await expect(feedback).toHaveAttribute('data-correct', String(firstAnswer));
    await expect(feedback).toContainText(`First answer: ${firstAnswer ? 'True' : 'False'}`);
    await expect(feedback).toContainText(`Review answer: ${firstAnswer ? 'False' : 'True'}`);
    const reviewed = await state(page);
    expect(reviewed.orr_tfa[0]).toBe(firstAnswer);
    expect(reviewed.orr_tfreview[0]).toBe(!firstAnswer);
    expect(await rewards(page)).toEqual(firstAwards);
    await expect(page.locator('#orrery-misconception-progress')).toHaveText('Ideas checked: 1 of 15');
    await section.getByRole('button', { name: 'Next unchecked idea', exact: true }).click();
    const nav = page.getByRole('group', { name: 'True or false question navigator', exact: true });
    await expect(nav.getByRole('button', { name: /^Idea 2:/ })).toHaveAttribute('aria-pressed', 'true');
    await chooseIdea(page, 1);
    expect((await state(page)).orr_tfa[0]).toBe(firstAnswer);
    expect((await state(page)).orr_tfreview[0]).toBe(!firstAnswer);
    expect(await rewards(page)).toEqual(firstAwards);
    expect(await protectedState(page)).toEqual(retained);
    await expectNoErrors(page);
    await harness.destroy(page);
  }
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} calculations and idea review keep readable feedback and keyboard-sized controls`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const section = await mountPractice(page, 6, 320, dark);
    const retained = await protectedState(page);
    await expectReadableLayout(section, 320);
    await expectReadableText(section);
    const input = await calculation(page);
    await input.fill('10');
    await input.press('Enter');
    await revealAllHints(section);
    await section.getByRole('button', { name: 'Show worked solution', exact: true }).click();
    await expect(page.locator('#orrery-calculation-solution')).toBeVisible();
    await expectReadableLayout(section, 320);
    await expectReadableText(section);
    await input.fill('11.86');
    await input.press('Enter');
    await expectStatus(page.locator('#orrery-challenge-feedback'), true);
    await expectCalculationProgress(page, 1);
    await expectReadableLayout(section, 320);
    await expectReadableText(section);
    await section.getByRole('button', { name: 'Next unsolved calculation', exact: true }).click();
    await expect(page.locator('#orrery-calculation-question')).toHaveAttribute('data-question-index', '1');
    await expectReadableLayout(section, 320);
    await page.locator('#orrery-tab-7').click();
    const ideas = page.locator('#orrery-misconception-practice');
    await expect(ideas).toBeVisible();
    await expectReadableLayout(ideas, 320);
    await expectReadableText(ideas);
    await ideas.getByRole('button', { name: 'False', exact: true }).focus();
    await ideas.getByRole('button', { name: 'False', exact: true }).press('Enter');
    await expectStatus(page.locator('#orrery-misconception-feedback'), true);
    await expectReadableLayout(ideas, 320);
    await expectReadableText(ideas);
    await ideas.getByRole('button', { name: 'Review this idea', exact: true }).click();
    await ideas.getByRole('button', { name: 'True', exact: true }).click();
    await expectStatus(page.locator('#orrery-misconception-feedback'), true);
    await expectReadableLayout(ideas, 320);
    await expectReadableText(ideas);
    expect(await protectedState(page)).toEqual(retained);
    await expectNoErrors(page);
    expect(pageErrors).toEqual([]);
  });
}
