import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.ANATOMY_TUTOR_QA_OUT || 'reports/anatomy-tutor-flow-2026-09-29';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js',
  toolId: 'anatomy',
  width: 1280,
  height: 1000,
  layout: 'document',
  appStyles: true
});

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    const runtime = window as any;
    const requests = runtime.__alloAnatomyAiRequests;
    const entries = requests instanceof Map ? [...requests.values()] : Object.values(requests || {});
    for (const request of entries as any[]) if (request?.timer) clearTimeout(request.timer);
    if (runtime.__alloAnatomyAiRequest?.timer) clearTimeout(runtime.__alloAnatomyAiRequest.timer);
    runtime.__alloAnatomyAiRequests = null;
    runtime.__alloAnatomyAiRequest = null;
    runtime.__alloAnatomyAiPending = null;
  });
  await harness.destroy(page);
});

async function mountTutor(page: Page, extra: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, {
    anatomy: {
      _activeTab: 'aiTutor', system: 'organs', view: 'posterior',
      selectedStructure: 'kidneys', complexity: 3, _startHereDismissed: true,
      ...extra
    }
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}' });
  await page.evaluate(() => {
    const runtime = window as any;
    const mock = runtime.__tutorMock = { requests: [] as any[], announcements: [] as string[] };
    runtime.__ctx.callGemini = (prompt: string) => new Promise((resolve, reject) => {
      mock.requests.push({ prompt, resolve, reject });
    });
    runtime.__ctx.announceToSR = (message: string) => mock.announcements.push(message);
    runtime.__ctx.gradeLevel = '9';
    runtime.__ctx.gradeBand = 'g912';
    runtime.__ctx.updateMulti('anatomy', {});
  });
}

async function requestCount(page: Page) {
  return page.evaluate(() => (window as any).__tutorMock.requests.length);
}

async function reply(page: Page, index: number, text: string, reject = false) {
  await page.evaluate(({ index, text, reject }) => {
    const request = (window as any).__tutorMock.requests[index];
    if (!request) throw Error('No mocked Tutor request at index ' + index);
    if (reject) request.reject(Error(text));
    else request.resolve({ text });
  }, { index, text, reject });
}

async function scan(page: Page, width: number, theme: string, locale = 'en') {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(theme => { document.body.className = theme === 'light' ? '' : 'theme-' + theme; }, theme);
  const measurements = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({
      include: [['[data-anatomy-tutor-panel]'], ['[data-anatomy-study-controls]']]
    }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } });
    return result.violations.map((violation: any) => ({
      id: violation.id,
      nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary }))
    }));
  });
  return { width, theme, locale, measurements, violations };
}

test('Tutor composer, reference, keyboard questions, and saved context stay clear across sizes and themes', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mountTutor(page, { _structureNotes: { kidneys: 'My saved explanation of filtration.' } });
  const panel = page.locator('[data-anatomy-tutor-panel]');
  const input = panel.locator('[data-anatomy-tutor-input]');
  const reference = panel.locator('[data-anatomy-tutor-reference]');
  const starters = panel.locator('.anatomy-tutor-starters');
  const panelTop = await panel.evaluate(element => element.getBoundingClientRect().top + scrollY);
  const composerTop = await input.evaluate(element => element.getBoundingClientRect().top + scrollY);
  expect(panelTop).toBeLessThan(350);
  expect(composerTop).toBeLessThan(600);
  await expect(page.locator('#anatomy-study-system')).toBeVisible();
  await expect(page.locator('#anatomy-study-mission')).toBeHidden();
  expect(await reference.evaluate(element => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(reference.locator('[data-anatomy-tutor-lesson=kidneys]')).toBeHidden();

  // A native summary works with the keyboard, and writing remains attached to the lesson.
  await reference.locator(':scope > summary').focus();
  await reference.locator(':scope > summary').press('Enter');
  await expect(reference.locator('[data-anatomy-tutor-lesson=kidneys]')).toBeVisible();
  await reference.locator('[data-anatomy-tutor-reflection] > summary').click();
  await expect(reference.locator('#anatomy-own-words-kidneys')).toHaveValue('My saved explanation of filtration.');
  await reference.locator(':scope > summary').press('Enter');
  await expect(reference.locator('[data-anatomy-tutor-lesson=kidneys]')).toBeHidden();

  await starters.locator('[data-anatomy-tutor-draft="1"]').click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(/Kidneys/);
  expect(await requestCount(page)).toBe(0);
  await input.fill('Explain filtration.');
  await input.press('End');
  await input.press('Shift+Enter');
  await input.pressSequentially('What returns to the blood?');
  await expect(input).toHaveValue('Explain filtration.\nWhat returns to the blood?');
  expect(await requestCount(page)).toBe(0);
  await input.press('Enter');
  await expect.poll(() => requestCount(page)).toBe(1);
  await expect(input).toHaveValue('');
  await expect(panel.locator('[data-anatomy-tutor-log]')).toHaveAttribute('aria-busy', 'true');
  await expect(panel.locator('[data-anatomy-tutor-send]')).toBeDisabled();
  const submittedPrompt = await page.evaluate(() => (window as any).__tutorMock.requests[0].prompt);
  expect(submittedPrompt).toContain('Student question: Explain filtration.\nWhat returns to the blood?');

  // Change the current study system while the original kidney request is pending.
  await page.locator('#anatomy-study-system').selectOption('circulatory');
  await page.evaluate(() => (window as any).__ctx.updateMulti('anatomy', { view: 'anterior', selectedStructure: 'heart' }));
  await expect(panel.locator('.anatomy-tutor-context')).toContainText('Heart');
  await reply(page, 0, 'The kidneys filter fluid and return most water and useful substances to the blood.');
  await expect(panel.locator('[data-role=ai] [data-anatomy-tutor-message-text]')).toContainText('The kidneys filter fluid');
  await expect(panel.locator('[data-anatomy-tutor-log]')).toHaveAttribute('aria-busy', 'false');
  const contexts = panel.locator('[data-anatomy-tutor-message-context]');
  await expect(contexts).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    await expect(contexts.nth(index)).toContainText('Organ Systems');
    await expect(contexts.nth(index)).toContainText('Kidneys');
    await expect(contexts.nth(index)).not.toContainText('Heart');
  }
  expect(await page.evaluate(() => (window as any).__toolData.anatomy._aiMessages.map((message: any) => [message.systemId, message.structureId])))
    .toEqual([['organs', 'kidneys'], ['organs', 'kidneys']]);
  expect(await page.evaluate(() => (window as any).__toolData.anatomy._structureNotes.kidneys)).toBe('My saved explanation of filtration.');

  await page.locator('#anatomy-study-system').selectOption('organs');
  await page.evaluate(() => (window as any).__ctx.updateMulti('anatomy', { view: 'posterior', selectedStructure: 'kidneys' }));
  await page.addScriptTag({ path: 'axe-core/4.12.1/axe.min.js' });
  const scans: any[] = [];
  for (const width of [320, 390, 768, 1440]) {
    for (const theme of ['light', 'dark', 'contrast']) {
      const result = await scan(page, width, theme);
      scans.push(result);
      expect(result.measurements.scrollWidth).toBeLessThanOrEqual(width + 2);
      if (width === 390 && theme === 'light') await panel.screenshot({ path: out + '/after-phone.png' });
      if (width === 390 && theme === 'dark') await panel.screenshot({ path: out + '/after-dark.png' });
      if (width === 390 && theme === 'contrast') await panel.screenshot({ path: out + '/after-contrast.png' });
      if (width === 1440 && theme === 'light') {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: out + '/after-desktop.png' });
      }
    }
  }

  await page.evaluate(() => { document.body.className = ''; });
  await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await expect(page.locator('.anatomy-tool-shell')).toHaveAttribute('data-reading-mode', 'true');
  const arabic = JSON.parse(await readFile(process.env.ANATOMY_QA_ARABIC || 'lang/arabic.js', 'utf8'));
  await page.evaluate(dict => {
    const runtime = window as any;
    document.documentElement.dir = 'rtl';
    runtime.__ctx.t = (key: string, fallback: string) => key.split('.').reduce((node: any, part: string) => node?.[part], dict) || fallback;
    runtime.__ctx.updateMulti('anatomy', {
      _readingMode: true,
      _aiInput: 'كيف تساعد الكلى الجسم؟',
      _aiConversationBand: 'g912',
      _aiMessages: [
        { role: 'user', text: 'كيف تعمل الكلى؟', systemId: 'organs', structureId: 'kidneys' },
        { role: 'ai', text: 'The kidneys regulate water and salts.', kind: 'answer', systemId: 'organs', structureId: 'kidneys' }
      ]
    });
  }, arabic);
  await expect(input).toHaveAttribute('dir', 'auto');
  await expect(input).toHaveCSS('direction', 'rtl');
  await expect(panel.locator('[data-anatomy-tutor-message-text]').first()).toHaveCSS('direction', 'rtl');
  await expect(panel.locator('[data-anatomy-tutor-message-text]').last()).toHaveCSS('direction', 'ltr');
  await expect(panel.locator('#anatomy-tutor-input-help')).toContainText(arabic.stem.anatomy.tutor_flow_input_help);
  for (const theme of ['light', 'dark', 'contrast']) {
    const result = await scan(page, 320, theme, 'ar-large');
    scans.push(result);
    expect(result.measurements.scrollWidth).toBeLessThanOrEqual(322);
    await panel.screenshot({ path: out + '/arabic-larger-' + theme + '-320.png' });
  }
  await writeFile(out + '/browser-validation.json', JSON.stringify({ panelTop, composerTop, scans, errors }, null, 2));
  expect(scans.flatMap(result => result.violations)).toEqual([]);
  expect(errors).toEqual([]);
});

test('A bounded Tutor conversation preserves reading position and offers keyboard focus on the latest answer', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const messages = Array.from({ length: 40 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'ai', kind: 'answer', systemId: 'organs', structureId: 'kidneys',
    text: (index % 2 === 0 ? 'Earlier question ' : 'Earlier answer ') + (index + 1) + '. ' +
      'The kidneys filter fluid, recover useful substances, and help regulate water and salts. '
  }));
  await mountTutor(page, { _aiConversationBand: 'g912', _aiMessages: messages });
  const panel = page.locator('[data-anatomy-tutor-panel]');
  const log = panel.locator('[data-anatomy-tutor-log]');
  const input = panel.locator('[data-anatomy-tutor-input]');
  const initial = await log.evaluate(element => ({ height: element.clientHeight, total: element.scrollHeight, scroll: element.scrollTop }));
  expect(initial.height).toBeLessThanOrEqual(425);
  expect(initial.total).toBeGreaterThan(initial.height * 2);
  expect(initial.total - initial.scroll - initial.height).toBeLessThan(48);
  await log.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
  await input.fill('Please explain the job of a nephron.');
  await panel.locator('[data-anatomy-tutor-send]').click();
  await expect.poll(() => requestCount(page)).toBe(1);
  await reply(page, 0, 'Latest answer: a nephron filters fluid and adjusts what returns to the blood.');
  const latest = log.locator('[data-role=ai]').last();
  await expect(latest).toContainText('Latest answer:');
  expect(await log.evaluate(element => element.scrollTop)).toBeLessThan(10);
  const beforeJump = await latest.evaluate(element => {
    const log = element.closest('[data-anatomy-tutor-log]')!;
    return { answerTop: element.getBoundingClientRect().top, logBottom: log.getBoundingClientRect().bottom };
  });
  expect(beforeJump.answerTop).toBeGreaterThan(beforeJump.logBottom);
  const jump = panel.locator('[data-anatomy-tutor-latest]');
  await jump.focus();
  await jump.press('Enter');
  await expect(latest).toBeFocused();
  const afterJump = await latest.evaluate(element => {
    const log = element.closest('[data-anatomy-tutor-log]')!;
    return {
      answerTop: element.getBoundingClientRect().top, answerBottom: element.getBoundingClientRect().bottom,
      logTop: log.getBoundingClientRect().top, logBottom: log.getBoundingClientRect().bottom
    };
  });
  expect(afterJump.answerTop).toBeGreaterThanOrEqual(afterJump.logTop - 2);
  expect(afterJump.answerBottom).toBeLessThanOrEqual(afterJump.logBottom + 2);
  await input.fill('How does the loop of Henle conserve water?');
  await panel.locator('[data-anatomy-tutor-send]').click();
  await expect.poll(() => requestCount(page)).toBe(2);
  await reply(page, 1, 'A newer answer explains the concentration gradient.');
  await expect(log.locator('[data-role=ai]').last()).toContainText('A newer answer');
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(48);
  expect(await page.evaluate(() => (window as any).__toolData.anatomy._aiMessages.length)).toBe(40);
  await panel.screenshot({ path: out + '/latest-answer-phone.png' });
  await writeFile(out + '/conversation-validation.json', JSON.stringify({ initial, beforeJump, afterJump, errors }, null, 2));
  expect(errors).toEqual([]);
});

test('Interrupted and unavailable Tutor questions can be drafted again while a newer draft stays safe', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const originalQuestion = 'How do kidneys regulate water?';
  await mountTutor(page, {
    _aiConversationBand: 'g912', _aiLoading: true, _aiRequestToken: 'interrupted-saved-request', _aiInput: '',
    _aiMessages: [{ role: 'user', text: originalQuestion, systemId: 'organs', structureId: 'kidneys' }]
  });
  const panel = page.locator('[data-anatomy-tutor-panel]');
  const input = panel.locator('[data-anatomy-tutor-input]');
  const interrupted = panel.locator('[data-anatomy-tutor-interrupted]');
  const retry = panel.locator('[data-anatomy-tutor-draft-again]');
  await expect(interrupted).toContainText('The previous AI request was interrupted.');
  await expect(panel.locator('[data-anatomy-tutor-log]')).toHaveAttribute('aria-busy', 'false');
  await expect(panel.locator('[data-anatomy-tutor-stop]')).toHaveCount(0);
  await retry.click();
  await expect(input).toHaveValue(originalQuestion);
  await expect(input).toBeFocused();
  expect(await requestCount(page)).toBe(0);
  await input.fill('My newer question about heart valves.');
  await expect(retry).toBeDisabled();
  await expect(panel).toContainText('Your current draft is kept.');
  await expect(input).toHaveValue('My newer question about heart valves.');
  await input.fill('');
  await retry.click();
  await panel.locator('[data-anatomy-tutor-send]').click();
  await expect.poll(() => requestCount(page)).toBe(1);
  await reply(page, 0, 'Offline for this mocked request', true);
  await expect(interrupted).toHaveCount(0);
  await expect(panel.locator('[data-anatomy-tutor-message=lesson]')).toContainText('The tutor is unavailable.');
  await expect(retry).toHaveCount(1);
  await expect(retry).toBeEnabled();
  await input.fill('My next question about nephrons.');
  await expect(retry).toBeDisabled();
  await expect(input).toHaveValue('My next question about nephrons.');
  await input.fill('');
  await retry.click();
  await expect(input).toHaveValue(originalQuestion);
  await expect(input).toBeFocused();
  expect(await requestCount(page)).toBe(1);
  await panel.screenshot({ path: out + '/recovery-phone.png' });
  await writeFile(out + '/recovery-validation.json', JSON.stringify({ requests: await requestCount(page), recoveredQuestion: await input.inputValue(), errors }, null, 2));
  expect(errors).toEqual([]);
});
