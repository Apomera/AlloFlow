import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-portfolio-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')() as { q: string; choices: string[]; answer: number; explain: string }[];
const activities = ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'];
let errors: string[];
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { note: 'Keep other work.' }, microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.evaluate(() => {
    const w = window as any; w.__portfolioXP = [];
    w.__ctx.awardXP = (...args: unknown[]) => w.__portfolioXP.push(args);
  });
}
async function open(page: Page) {
  const details = page.locator('#micro-portfolio');
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    await page.locator('#micro-portfolio-summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function select(page: Page, id: string) {
  await page.getByLabel('Activity to review', { exact: true }).selectOption(id);
  await expect(page.locator('#micro-portfolio-preview')).toHaveAttribute('data-portfolio-activity', id);
  return page.locator('#micro-portfolio-preview').innerText();
}
async function reload(page: Page) {
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount(data), saved); return saved;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const selector of ['[data-microbiology-tool]', '.micro-workspace-home', '.micro-portfolio', '#micro-portfolio-preview']) {
    const element = page.locator(selector);
    if (await element.count()) {
      const bounded = await element.evaluate(node => node.scrollWidth <= node.clientWidth + 1);
      if (!bounded) {
        const diagnostic = await element.evaluate(node => [node, ...node.querySelectorAll('*')].filter(item => item.scrollWidth > item.clientWidth + 1).slice(0, 18).map(item => ({ tag: item.tagName, id: item.id, class: item.className, client: item.clientWidth, scroll: item.scrollWidth, rect: item.getBoundingClientRect().toJSON(), whiteSpace: getComputedStyle(item).whiteSpace, overflowX: getComputedStyle(item).overflowX })));
        console.log(JSON.stringify({ selector, diagnostic }));
      }
      expect(bounded, selector).toBe(true);
    }
  }
}
async function download(page: Page, name: string) {
  const button = page.locator('#micro-portfolio-download'); await button.focus();
  const pending = page.waitForEvent('download'); await page.keyboard.press('Enter');
  const file = await pending; const text = readFileSync((await file.path())!, 'utf8');
  await file.saveAs(path.join(out, name)); await expect(button).toBeFocused();
  expect(file.suggestedFilename()).toBe('micro-lab-portfolio.txt'); return text;
}
const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 };
const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
const measured = { value: 2, unit: 'um', context };
const pond = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Recorded pond explanation connects nuclei and cilia.', limitation: 'bounded' };
const gram = { prediction: 'both', interpretation: 'wall', explanation: 'Recorded Gram explanation connects envelopes and retained dye.' };
const run = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original Resistance notes.', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
const trial = { id: 7, control: base, conditions: { ...base, tempC: 25 }, prediction: 'lower', hypothesis: 'Before saved Growth trial.', explanation: 'Saved Growth explanation.' };
function richSeed() {
  const original = bank.map((q, i) => i === 0 ? (q.answer + 1) % q.choices.length : q.answer);
  return {
    mysteryLab: { active: 'pond', cases: { pond: { ...pond, revealed: ['context', 'structure', 'behavior'], record: pond, previousRecord: { ...pond, reasoning: 'Previous pond explanation.' }, reasoning: 'Working pond revision.', reportView: 'recorded', checked: false } } },
    microscopeMeasurements: { ecoli: { result: measured, previousResult: { ...measured, value: 1.8 }, draft: { ...measured, value: '3' } } },
    gramInvestigation: { ...gram, step: 2, maxStep: 4, record: gram, previousRecord: { ...gram, explanation: 'Previous Gram explanation.' }, explanation: 'Working Gram revision.' },
    growthLab: { ...base, tempC: 18, understood: true, stuckRevealed: true, hypothesis: 'Earlier Growth notes.', explanation: 'Earlier Growth explanation.', log: [] },
    growthInvestigation: { control: base, trials: [trial], selectedId: 7, nextId: 20, prediction: 'higher', hypothesis: 'Working Growth reasoning.', explanation: 'Working Growth notes.', sweepVariable: 'pH', sweep: { variable: 'pH', conditions: base }, previousSweep: { variable: 'tempC', conditions: base }, removed: { trial: { ...trial, id: 9, hypothesis: 'Removed Growth reasoning.', explanation: 'Removed Growth explanation.' }, index: 1 } },
    growthReviewHour: 6,
    resistanceInvestigation: { ...run, notes: 'Working Resistance notes.' },
    resistanceNotebook: { selectedId: 4, nextId: 10, records: [{ id: 4, evidence: run, reviewNote: 'Later Resistance reflection.' }], removed: { record: { id: 8, evidence: { ...run, notes: 'Removed Resistance notes.' }, reviewNote: 'Removed Resistance reflection.' }, index: 1 } },
    quizAnswers: original, quizSubmitted: true, quizCorrect: 999,
    quizPractice: { answers: bank.map(q => q.answer), checked: bank.map((_, i) => i === 0), reflections: ['Later quiz correction reflection.'] },
    scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: [], savedSentinel: { keep: 'Raw independent metadata.' }
  };
}

test('empty and damaged portfolios stay empty without fabricated progress or enabled downloads', async ({ page }) => {
  for (const seed of [{}, { quizAnswers: Array(15).fill('1'), quizSubmitted: true, quizCorrect: 500, growthInvestigation: { trials: [null] }, resistanceNotebook: { records: [null] }, microscopeMeasurements: { ecoli: { result: { ...measured, value: null } } }, gramInvestigation: { step: 99, maxStep: 'all', record: 'yes' }, mysteryLab: { cases: { pond: { record: { claim: 'anything', reasoning: 'x' } } } } }]) {
    await mount(page, seed); const before = await state(page);
    await expect(page.locator('#micro-portfolio')).not.toHaveAttribute('open', ''); await open(page);
    await expect(page.locator('#micro-portfolio-download')).toBeDisabled();
    expect(await page.locator('#micro-portfolio-activity option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value))).toEqual(activities);
    for (const id of activities) {
      const text = await select(page, id); expect(text).toContain('No evidence or working notes yet.'); expect(text).not.toMatch(/NaN|Infinity|\[object Object\]/);
    }
    expect(await state(page)).toEqual(before); await harness.unmount(page);
  }
});

test('Home reviews all six activity records using keyboard controls without modifying evidence or awarding XP', async ({ page }) => {
  await mount(page, richSeed()); const before = await state(page); await open(page);
  const markers: Record<string, string[]> = {
    mystery: ['Recorded pond explanation', 'Previous pond explanation', 'Working pond revision'],
    microscope: ['E. coli', '1.8', '3'], gram: ['Recorded Gram explanation', 'Previous Gram explanation', 'Working Gram revision'],
    growth: ['Saved Growth explanation', 'Removed Growth explanation', 'Working Growth reasoning', 'Earlier Growth notes'],
    resistance: ['Original Resistance notes', 'Later Resistance reflection', 'Removed Resistance notes', 'Working Resistance notes'],
    quiz: ['Original score: 14/15', 'Later quiz correction reflection']
  };
  for (const id of activities) { const text = await select(page, id); for (const marker of markers[id]) expect(text, id).toContain(marker); }
  await page.locator('#micro-portfolio-activity').focus(); await page.keyboard.press('Home');
  await expect(page.locator('#micro-portfolio-activity')).toHaveValue('mystery');
  await page.keyboard.press('End'); await expect(page.locator('#micro-portfolio-activity')).toHaveValue('quiz');
  await expect(page.locator('#micro-portfolio-activity')).toBeFocused();
  await page.locator('#micro-portfolio-summary').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#micro-portfolio')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Space'); await expect(page.locator('#micro-portfolio')).toHaveAttribute('open', '');
  expect(await state(page)).toEqual(before); expect(await page.evaluate(() => (window as any).__portfolioXP)).toEqual([]);
  await page.locator('#micro-portfolio').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'portfolio-home-desktop.png'), fullPage: true });
});

test('one combined download retains originals, revisions, recovery, tables and separate quiz practice after JSON reload', async ({ page }) => {
  await mount(page, richSeed()); const before = await state(page); await open(page);
  const text = await download(page, 'portfolio-full.txt');
  for (const marker of ['Recorded pond explanation', 'Previous pond explanation', 'Working pond revision', 'Recorded Gram explanation', 'Previous Gram explanation', 'Working Gram revision', 'Saved Growth explanation', 'Removed Growth explanation', 'Working Growth reasoning', 'Original Resistance notes', 'Later Resistance reflection', 'Removed Resistance reflection', 'Working Resistance notes', 'Original score: 14/15', 'Later quiz correction reflection']) expect(text).toContain(marker);
  expect(text).toContain('24'); expect(text).toContain('12%'); expect(text).not.toContain('999');
  expect(await state(page)).toEqual(before); await reload(page); await open(page);
  expect(await download(page, 'portfolio-restored.txt')).toBe(text); expect(await state(page)).toEqual(before);
});

test('failed and repeated downloads announce locally, clean up resources, preserve focus and allow retry', async ({ page }) => {
  await mount(page, richSeed()); const before = await state(page); await open(page);
  await page.evaluate(() => {
    const w = window as any; w.__portfolioOriginalCreate = URL.createObjectURL; w.__portfolioOriginalRevoke = URL.revokeObjectURL;
    w.__portfolioOriginalClick = HTMLAnchorElement.prototype.click; w.__portfolioCreated = []; w.__portfolioRevoked = [];
    URL.createObjectURL = () => { throw new Error('Blocked download for test'); };
    URL.revokeObjectURL = url => { w.__portfolioRevoked.push(url); w.__portfolioOriginalRevoke.call(URL, url); };
  });
  const button = page.locator('#micro-portfolio-download'); const status = page.locator('#micro-portfolio-download-status');
  await button.focus(); await page.keyboard.press('Enter'); await expect(status).toContainText(/could not|couldn't|failed/i);
  await expect(button).toBeFocused(); await expect(status).toHaveAttribute('role', 'status'); await expect(status).toHaveAttribute('aria-live', 'polite');
  await page.evaluate(() => {
    const w = window as any; URL.createObjectURL = blob => { const url = w.__portfolioOriginalCreate.call(URL, blob); w.__portfolioCreated.push(url); return url; };
    HTMLAnchorElement.prototype.click = function() { throw new Error('Blocked anchor click for test'); };
  });
  await page.keyboard.press('Enter'); await expect(status).toContainText(/could not|couldn't|failed/i);
  await expect(page.locator('a[download="micro-lab-portfolio.txt"]')).toHaveCount(0);
  await page.evaluate(() => { HTMLAnchorElement.prototype.click = (window as any).__portfolioOriginalClick; });
  const text = await download(page, 'portfolio-retry.txt'); await expect(status).toContainText(/started/i);
  await page.evaluate(() => { (window as any).__portfolioNoticeNode = document.querySelector('#micro-portfolio-download-status span'); });
  expect(await download(page, 'portfolio-repeated.txt')).toBe(text);
  expect(await page.evaluate(() => (window as any).__portfolioNoticeNode?.isConnected)).toBe(false);
  await expect.poll(() => page.evaluate(() => (window as any).__portfolioRevoked.length)).toBe(3);
  expect(await page.evaluate(() => (window as any).__portfolioCreated)).toEqual(await page.evaluate(() => (window as any).__portfolioRevoked));
  expect(await state(page)).toEqual(before); await expect(button).toBeFocused();
});

test('pending quiz, measurement and Growth drafts export learner work without unrevealed results', async ({ page }) => {
  const seed = { quizAnswers: [0, '1'], quizSubmitted: true, quizCorrect: 500, quizPractice: { answers: bank.map(q => q.answer), checked: Array(15).fill(true), reflections: ['Forged practice reflection.'] },
    microscopeMeasurements: { ecoli: { draft: { value: '3', unit: 'um', context } } },
    growthLab: { ...base, tempC: 18 }, growthInvestigation: { control: base, prediction: 'higher', hypothesis: 'Pending Growth reasoning.' } };
  await mount(page, seed); const before = await state(page); await open(page);
  const quizText = await select(page, 'quiz'); expect(quizText).toContain('Unsubmitted or incomplete attempt');
  for (const marker of ['Original score:', 'Correct answer:', 'Explanation:', 'Practice status:', 'Forged practice reflection.']) expect(quizText).not.toContain(marker);
  expect(quizText).not.toContain(bank[0].explain);
  const measurement = await select(page, 'microscope'); expect(measurement).toContain('3');
  for (const marker of ['Drawing reference (µm):', 'Absolute difference from the drawing reference (%):', 'Within the ±20% practice band:']) expect(measurement).not.toContain(marker);
  const growth = await select(page, 'growth'); expect(growth).toContain('Pending Growth reasoning.');
  for (const marker of ['Model comparison at hour 24', 'Model hour\tOriginal control population\tTrial population', 'Population at hour 24\tModeled lag (hours)']) expect(growth).not.toContain(marker);
  const text = await download(page, 'portfolio-pending.txt'); expect(text).not.toContain('Correct answer:'); expect(text).not.toContain('Forged practice reflection.');
  for (const marker of ['Drawing reference (µm):', 'Absolute difference from the drawing reference (%):', 'Within the ±20% practice band:', 'Model comparison at hour 24', 'Model hour\tOriginal control population\tTrial population', 'Population at hour 24\tModeled lag (hours)']) expect(text).not.toContain(marker);
  expect(await state(page)).toEqual(before);
});

test('portfolio previews reflow on phones and enlarged layouts and render learner markup as text', async ({ page }) => {
  const seed = richSeed(); const literal = '<img src=x onerror="window.portfolioInjected=true">' + 'longnote'.repeat(140);
  seed.mysteryLab.cases.pond.reasoning = literal;
  await mount(page, seed); const before = await state(page); await open(page); await select(page, 'mystery');
  await expect(page.locator('#micro-portfolio-preview')).toContainText('<img src=x');
  await expect(page.locator('#micro-portfolio-preview img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).portfolioInjected)).toBeUndefined();
  await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page);
  for (const id of activities) { await select(page, id); await noOverflow(page); }
  for (const selector of ['#micro-portfolio-summary', '#micro-portfolio-activity', '#micro-portfolio-download']) expect(await page.locator(selector).evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await select(page, 'mystery'); await page.locator('#micro-portfolio').screenshot({ path: path.join(out, 'portfolio-home-phone.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const zoom of [2, 4]) {
    await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
    for (const id of activities) { await select(page, id); await noOverflow(page); }
  }
  await select(page, 'resistance'); await page.locator('#micro-portfolio').screenshot({ path: path.join(out, 'portfolio-preview-zoom.png') });
  expect(await state(page)).toEqual(before);
});
