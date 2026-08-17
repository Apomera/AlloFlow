// Real-browser end-to-end coverage of the Educator Evaluation tool
// (2026-08-16): framework profiles, the Portland categorical matrix, era
// integrity of historical trends, the educator statement, the formative
// growth snapshot, and the dark-scheme stance — everything the text pins and
// SSR smoke cannot see. Follows the repo's vitest+playwright pattern
// (tests/basic_math_wcag_browser.test.js).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const PAGE = pathToFileURL(path.join(process.cwd(), 'desktop', 'web-app', 'public', 'educator-evaluation.html')).href;

describe('Educator Evaluation — browser e2e', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60000);

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  const openWorkspace = async (options = {}) => {
    const page = await browser.newPage({ colorScheme: options.colorScheme || 'light' });
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(PAGE);
    await page.waitForSelector('.ae-onboarding-overlay, .ae-tabs', { timeout: 15000 });
    const onboarding = page.locator('.ae-onboarding-overlay .ae-onboarding-option');
    if (await onboarding.count()) await onboarding.nth(1).click(); // simulated workspace
    await page.waitForSelector('.ae-tabs');
    return { page, errors };
  };

  const openTab = async (page, label) => {
    await page.locator('.ae-tab', { hasText: label }).click();
    await page.waitForTimeout(200);
  };

  const switchFramework = async (page, optionLabel) => {
    await openTab(page, 'Setup');
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Portland ME' }) }).first();
    await select.selectOption({ label: optionLabel });
    await page.waitForTimeout(250);
  };

  const selectTeacher = async (page, label) => {
    await openTab(page, 'Overview');
    await page.locator('select').first().selectOption({ label });
    await page.waitForTimeout(250);
  };

  it('boots the sample workspace with zero console or page errors', async () => {
    const { page, errors } = await openWorkspace();
    await selectTeacher(page, 'Teacher 03 · T-03');
    expect(await page.locator('.ae-tabs').count()).toBe(1);
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('PA default: numeric score with statewide band in the composer', async () => {
    const { page, errors } = await openWorkspace();
    await selectTeacher(page, 'Teacher 03 · T-03');
    const grid = page.locator('.ae-rating-grid select');
    await grid.nth(0).selectOption('2');
    await grid.nth(1).selectOption('2');
    await grid.nth(2).selectOption('2');
    await grid.nth(3).selectOption('2');
    // PA composition also needs the building/teacher/LEA inputs
    const numberInputs = page.locator('.ae-form-grid input[type="number"]');
    const numberCount = await numberInputs.count();
    for (let i = 0; i < numberCount; i++) await numberInputs.nth(i).fill('2');
    await page.waitForTimeout(250);
    const text = await page.locator('main').innerText();
    expect(text).toMatch(/2\.00\s*·\s*Proficient/);
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('Portland profile: guidebook labels everywhere and the categorical matrix governs', async () => {
    const { page, errors } = await openWorkspace();
    await switchFramework(page, 'Portland ME (PEPG guidebook)');
    await selectTeacher(page, 'Teacher 03 · T-03');
    // all four domain dropdowns speak guidebook language
    const portlandSelects = page.locator('.ae-rating-grid select').filter({ has: page.locator('option', { hasText: 'Novice/Needs Improvement' }) });
    expect(await portlandSelects.count()).toBe(4);
    // any-Unsatisfactory rule beats the 2.25 average
    const grid = page.locator('.ae-rating-grid select');
    await grid.nth(0).selectOption('0');
    await grid.nth(1).selectOption('3');
    await grid.nth(2).selectOption('3');
    await grid.nth(3).selectOption('3');
    await page.waitForTimeout(250);
    const text = await page.locator('main').innerText();
    expect(text).toContain('Unsatisfactory');
    expect(text).toContain('any domain rated Unsatisfactory');
    expect(text).not.toMatch(/2\.25\s*·/);
    expect(text).toContain('Evidence collected this cycle');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('Maine profile: state-model dropdown labels, optional SLG framing, equal-average note', async () => {
    const { page, errors } = await openWorkspace();
    await switchFramework(page, 'Maine PEPG (district plan governs)');
    const setupText = await page.locator('main').innerText();
    expect(setupText).toContain('SLG measures are a district choice under the 2019 amendments');
    await selectTeacher(page, 'Teacher 03 · T-03');
    const maineSelects = page.locator('.ae-rating-grid select').filter({ has: page.locator('option', { hasText: 'Ineffective' }) });
    expect(await maineSelects.count()).toBe(4);
    const text = await page.locator('main').innerText();
    expect(text).toContain('four rubric domains average equally here');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('era integrity: released history keeps its scores when the profile changes', async () => {
    const { page, errors } = await openWorkspace();
    // Teacher 01 has finalized PA-era cycle snapshots in the sample workspace
    await openTab(page, 'Trends');
    await page.locator('select').first().selectOption({ label: 'Teacher 01 · T-01' });
    await page.waitForTimeout(300);
    const releasesBefore = await page.locator('section', { hasText: 'Annual cycle releases' }).first().innerText();
    const chartBefore = await page.locator('table', { has: page.locator('caption', { hasText: 'trend data' }) }).first().innerText().catch(() => '');
    await switchFramework(page, 'Maine PEPG (district plan governs)');
    await openTab(page, 'Trends');
    await page.locator('select').first().selectOption({ label: 'Teacher 01 · T-01' });
    await page.waitForTimeout(300);
    const releasesAfter = await page.locator('section', { hasText: 'Annual cycle releases' }).first().innerText();
    const chartAfter = await page.locator('table', { has: page.locator('caption', { hasText: 'trend data' }) }).first().innerText().catch(() => '');
    const scores = (value) => (String(value).match(/\d\.\d\d/g) || []).join(',');
    expect(releasesAfter).toBe(releasesBefore);
    // metric LABEL follows the active profile (O&P vs PP) — the VALUES may not
    expect(scores(chartAfter)).toBe(scores(chartBefore));
    expect(scores(chartBefore).length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('teacher role: growth-lens composer copy and a savable, owned statement', async () => {
    const { page, errors } = await openWorkspace();
    await selectTeacher(page, 'Teacher 03 · T-03'); // non-finalized: statement stays editable
    await page.locator('button', { hasText: 'Teacher' }).first().click();
    await page.waitForTimeout(400);
    const text = await page.locator('main').innerText();
    expect(text).toContain('How your final rating is calculated');
    expect(text).toContain('Your statement for the record');
    await page.locator('textarea').first().fill('I am proud of my students’ growth in discourse this year.');
    await page.locator('button', { hasText: 'Save statement' }).click();
    await page.waitForTimeout(300);
    const after = await page.locator('main').innerText();
    expect(after).toContain('Last saved');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('growth snapshot downloads formative content with no ratings vocabulary', async () => {
    const { page, errors } = await openWorkspace();
    await selectTeacher(page, 'Teacher 03 · T-03');
    await openTab(page, 'Reports & audit');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button', { hasText: 'Growth snapshot (formative)' }).click(),
    ]);
    const file = path.join(process.cwd(), 'tests', '.tmp_growth_snapshot_e2e.html');
    await download.saveAs(file);
    const html = fs.readFileSync(file, 'utf8');
    fs.unlinkSync(file);
    expect(html).toContain('Growth snapshot — formative');
    expect(html).toContain('contains no ratings');
    expect(html).not.toMatch(/Distinguished|Proficient|Needs Improvement|Failing|Unsatisfactory|Excellent/);
    expect(html).not.toMatch(/out of 3/);
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('dark scheme: the panel paints its own ground (no transparent-body inherit)', async () => {
    const { page, errors } = await openWorkspace({ colorScheme: 'dark' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);
});
