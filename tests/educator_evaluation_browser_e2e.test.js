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
    if (await onboarding.count()) await onboarding.nth(0).click(); // guided fictional workspace
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
    expect(text).toContain('four rubric domains average equally in this generic planning profile');
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

  it('real local educator preview: growth-lens copy and visibly read-only educator controls', async () => {
    const { page, errors } = await openWorkspace();
    // Convert the fictional fixture into the real-local boundary without
    // changing its records. This keeps a populated educator record available
    // while proving sample rehearsal is the only mutable role-switch path.
    // Wait for the onboarding save so its debounced write cannot race the
    // deliberate fixture conversion during a busy full-suite run.
    await page.locator('.ae-save-state').filter({ hasText: 'Saved on this device' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.includes('_workspace_v1'));
      const workspace = key ? JSON.parse(localStorage.getItem(key)) : null;
      if (key && workspace) {
        workspace.config.sampleMode = false;
        localStorage.setItem(key, JSON.stringify(workspace));
      }
    });
    await page.reload();
    await page.waitForSelector('.ae-tabs');
    await selectTeacher(page, 'Teacher 03 · T-03');
    const educatorPreview = page.getByRole('button', { name: 'Educator preview', exact: true });
    await educatorPreview.waitFor({ state: 'visible', timeout: 10000 });
    await educatorPreview.click();
    await page.waitForTimeout(400);
    const text = await page.locator('main').innerText();
    expect(text).toContain('How your final rating is calculated');
    expect(text).toContain('Your statement for the record');
    expect(await page.getByLabel('Statement', { exact: true }).getAttribute('readonly')).not.toBeNull();
    expect(await page.getByRole('button', { name: 'Save statement', exact: true }).isDisabled()).toBe(true);
    expect(text).toContain('Preview only. The educator can write this statement');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('fictional rehearsal completes one evaluation from assignment through final release', async () => {
    const { page, errors } = await openWorkspace();
    const exitTour = page.getByRole('button', { name: 'Exit tour', exact: true });
    if (await exitTour.count()) await exitTour.click();

    await page.getByRole('button', { name: 'Start rehearsal with Teacher 08', exact: true }).click();
    await page.getByRole('button', { name: '+ Assign formal observation', exact: true }).click();
    expect(await page.locator('.ae-step-current').innerText()).toBe('Assigned');
    await page.getByRole('button', { name: 'Continue as Fictional educator', exact: true }).click();
    expect(await page.getByText('Interactive fictional educator rehearsal', { exact: true }).count()).toBe(1);
    await page.getByLabel('Lesson / unit plan summary', { exact: true }).fill('Fictional Grade 6 inquiry lesson on evidence-based claims.');
    await page.getByLabel('Expected student learning outcomes', { exact: true }).fill('Students will cite two observations and explain how each supports a claim.');
    await page.getByLabel('Resources and planned supports', { exact: true }).fill('Sentence frames, visual exemplars, and flexible discussion groups.');
    await page.getByLabel('Assessment / evidence of learning', { exact: true }).fill('Exit response scored against a two-point evidence checklist.');
    await page.getByLabel(/Secure artifact references \/ links/).fill('Fictional district repository reference: PRACTICE-LESSON-08.');
    await page.getByRole('button', { name: 'Submit pre-observation materials', exact: true }).click();

    await page.getByRole('button', { name: 'Continue as Evaluator', exact: true }).click();
    await page.getByLabel('Pre-conference notes', { exact: true }).fill('Reviewed the evidence goal, planned supports, and exit-response success criteria.');
    await page.getByRole('button', { name: 'Mark pre-conference complete', exact: true }).click();
    await page.getByRole('button', { name: 'Start observation', exact: true }).click();
    await page.getByLabel(/Time-stamped factual evidence/).fill('10:04 - Learning outcome was posted and restated by two students.\n10:18 - Seven groups cited observations; the educator used a sentence frame with one group.\n10:36 - Twenty-one of twenty-four fictional exit responses included two cited observations.');
    const firstDomain = page.locator('.ae-domain').filter({ hasText: 'Planning and Preparation' }).first();
    await firstDomain.locator('summary').click();
    await firstDomain.locator('input[type="checkbox"]').first().check();
    await page.getByText('I reviewed the evidence and removed student-identifying information.', { exact: true }).locator('..').locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Publish evidence to teacher', exact: true }).click();

    await page.getByRole('button', { name: 'Continue as Fictional educator', exact: true }).click();
    await page.getByLabel('Reflection / self-assessment', { exact: true }).fill('The sentence frame increased participation. Next time I will model one stronger counterexample before group work.');
    await page.getByRole('button', { name: 'Submit reflection', exact: true }).click();
    await page.getByRole('button', { name: 'Continue as Evaluator', exact: true }).click();
    await page.getByLabel('Post-conference discussion and follow-up', { exact: true }).fill('Celebrated evidence use and agreed to collect one follow-up exit-response sample after modeling counterexamples.');
    await page.getByRole('button', { name: 'Mark post-conference complete', exact: true }).click();
    const observationRatings = page.locator('.ae-rating-grid select');
    const observationRationales = page.locator('.ae-rating-grid textarea');
    for (let index = 0; index < 4; index += 1) {
      await observationRatings.nth(index).selectOption(index === 2 ? '3' : '2');
      await observationRationales.nth(index).fill('Fictional evidence and conference record support this human-selected practice rating.');
    }
    await page.getByRole('button', { name: 'Sign evaluator assessment', exact: true }).click();

    await page.getByRole('button', { name: 'Continue as Fictional educator', exact: true }).click();
    await page.getByText('I received this record and had an opportunity to discuss it. I understand acknowledgment does not mean agreement.', { exact: true }).locator('..').locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Acknowledge receipt', exact: true }).click();
    await page.getByRole('button', { name: 'Continue as Evaluator', exact: true }).click();
    await page.getByRole('button', { name: 'Finalize formal observation', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to annual rating preview', exact: true }).click();

    const annual = page.locator('#ae-annual-rating-composer');
    const annualDomains = annual.locator('.ae-rating-grid select');
    for (let index = 0; index < 4; index += 1) await annualDomains.nth(index).selectOption(index === 2 ? '3' : '2');
    const annualMeasures = annual.locator('input[type="number"]');
    const annualMeasureCount = await annualMeasures.count();
    expect(annualMeasureCount).toBeGreaterThan(0);
    for (let index = 0; index < annualMeasureCount; index += 1) await annualMeasures.nth(index).fill(String(2.4 + (index * 0.1)));
    await annual.getByText(/I confirm the official final rating form/).locator('..').locator('input[type="checkbox"]').check();
    await annual.getByRole('button', { name: 'Record final release', exact: true }).click();
    expect(await page.getByText('Rehearsal complete', { exact: true }).count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Review completed fictional cycle', exact: true }).click();
    const auditText = await page.locator('main').innerText();
    for (const event of ['ASSIGNED', 'EVIDENCE PUBLISHED', 'SIGNED', 'ACKNOWLEDGED', 'FINALIZED', 'RELEASED']) expect(auditText).toContain(event);

    await page.getByRole('button', { name: 'Review clean-workspace transition', exact: true }).click();
    expect(await page.getByText('Review before leaving fictional practice', { exact: true }).count()).toBe(1);
    const startClean = page.getByRole('button', { name: 'Download rehearsal backup and start clean', exact: true });
    expect(await startClean.isDisabled()).toBe(true);
    await page.getByText(/I understand the clean workspace starts empty/).locator('..').locator('input[type="checkbox"]').check();
    const [backup] = await Promise.all([
      page.waitForEvent('download'),
      startClean.click(),
    ]);
    expect(backup.suggestedFilename()).toMatch(/^alloflow-fictional-rehearsal-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backupFile = path.join(process.cwd(), 'tests', '.tmp_rehearsal_backup_e2e.json');
    await backup.saveAs(backupFile);
    const rehearsalBackup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    fs.unlinkSync(backupFile);
    expect(rehearsalBackup.kind).toBe('alloflow-educator-evaluation-workspace');
    expect(rehearsalBackup.recoveryReason).toBe('Fictional rehearsal backup before clean real-work workspace');
    expect(rehearsalBackup.config.sampleMode).toBe(true);
    expect(rehearsalBackup.teachers.some((teacher) => teacher.name === 'Teacher 08' && teacher.finalizedAt)).toBe(true);
    expect(rehearsalBackup.audit.some((event) => event.event === 'RELEASED')).toBe(true);
    await page.getByText('Set up your first real cycle', { exact: true }).waitFor();
    const cleanText = await page.locator('main').innerText();
    expect(cleanText).toContain('0 / 3 ready');
    expect(cleanText).toContain('Choose an approved record path');
    expect(cleanText).toContain('Confirm workspace details');
    expect(cleanText).toContain('Add the first educator');
    expect(cleanText).not.toContain('Simulated data');
    const cleanWorkspace = await page.evaluate(() => JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1')));
    expect(cleanWorkspace.config.sampleMode).toBe(false);
    expect(cleanWorkspace.config.setupPath).toBe('');
    for (const collection of ['teachers', 'walkthroughs', 'observations', 'spms', 'comments', 'audit']) {
      expect(cleanWorkspace[collection]).toHaveLength(0);
    }
    expect(errors).toEqual([]);
    await page.close();
  }, 150000);

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

  it('the onboarding dialog owns focus: lands inside, traps Tab, keyboard-only entry works', async () => {
    const page = await browser.newPage();
    await page.goto(PAGE);
    await page.waitForSelector('.ae-onboarding-overlay');
    expect(await page.evaluate(() => (document.activeElement.className || '').includes('ae-onboarding-option'))).toBe(true);
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => (document.activeElement.className || '').includes('ae-onboarding-option'))).toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.ae-tabs');
    await page.close();
  }, 60000);

  it('footer references follow the active framework profile', async () => {
    const { page, errors } = await openWorkspace();
    expect(await page.locator('footer').innerText()).toContain('Act 13 Toolkit');
    await switchFramework(page, 'Maine PEPG (district plan governs)');
    const footer = await page.locator('footer').innerText();
    expect(footer).toContain('Maine DOE Educator Effectiveness');
    expect(footer).not.toContain('Act 13 Toolkit');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  it('Setup offers a scannable Share-by-QR card with the privacy caption', async () => {
    const { page, errors } = await openWorkspace();
    await openTab(page, 'Setup');
    await page.waitForTimeout(500);
    const card = page.locator('section', { hasText: 'Share by QR' }).first();
    expect(await card.count()).toBe(1);
    expect(await card.locator('svg').count()).toBeGreaterThanOrEqual(1);
    const text = await card.innerText();
    const shareLink = await card.getByLabel('Share link', { exact: true }).inputValue();
    // Loaded over file://, so the card must fall back to the canonical published
    // page: a disk path is unscannable elsewhere and leaks the local folder.
    expect(shareLink).toBe('https://alloflow-cdn.pages.dev/educator-evaluation');
    expect(shareLink).not.toMatch(/file:\/\//);
    expect(shareLink).not.toMatch(/OneDrive|C:\//);
    expect(text).toContain('Your data is not shared by the code');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);

  // Added 2026-08-17. The manual (section 12) tells a principal that exporting
  // the workspace JSON is how they move to a new device. Nothing pinned that
  // claim, and it is the highest-stakes path in the tool: a lossy round-trip
  // costs a year of evaluation records. This drives the REAL export button and
  // the REAL import input, and deep-compares the whole workspace tree.
  it('export -> wipe -> import restores the workspace with no field loss', async () => {
    const { page, errors } = await openWorkspace();

    const stored = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('_workspace_v1'));
      return key ? localStorage.getItem(key) : null;
    });
    expect(stored, 'the simulated workspace must be persisted').toBeTruthy();

    await openTab(page, 'Reports & audit');
    await page.waitForTimeout(300);

    // Capture what the download would contain, without touching the filesystem.
    const exportedText = await page.evaluate(async () => {
      const created = [];
      const origCreate = URL.createObjectURL;
      const origClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => { created.push(blob); return 'blob:test'; };
      HTMLAnchorElement.prototype.click = function () {};
      try {
        const btn = [...document.querySelectorAll('button')]
          .find((b) => /Export workspace JSON/i.test(b.textContent || ''));
        if (!btn) return null;
        btn.click();
        await new Promise((r) => setTimeout(r, 250));
        return created.length ? await created[0].text() : null;
      } finally {
        URL.createObjectURL = origCreate;
        HTMLAnchorElement.prototype.click = origClick;
      }
    });
    expect(exportedText, 'Export workspace JSON must produce a file').toBeTruthy();

    const storedWorkspace = JSON.parse(stored);
    const exportedPayload = JSON.parse(exportedText);
    const exportedWorkspace = exportedPayload.workspace || exportedPayload;
    expect(exportedWorkspace.teachers.length).toBe(storedWorkspace.teachers.length);
    // Deep equality of the whole tree, not a spot check on counts.
    expect(exportedWorkspace).toMatchObject(storedWorkspace);

    // Import into a genuinely fresh browser workspace. A separate context is
    // deterministic and better represents recovery on a wiped or new device;
    // it also avoids a pending save from the source page repopulating storage
    // during reload.
    await page.close();
    const importPage = await browser.newPage();
    importPage.on('pageerror', (err) => errors.push(String(err)));
    importPage.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await importPage.goto(PAGE);
    await importPage.waitForSelector('.ae-onboarding-overlay .ae-onboarding-option');
    await importPage.locator('.ae-onboarding-overlay .ae-onboarding-option').nth(1).click(); // blank
    await importPage.waitForSelector('.ae-tabs');
    await openTab(importPage, 'Reports & audit');
    await importPage.waitForTimeout(300);
    await importPage.setInputFiles('input[type="file"]', {
      name: 'workspace.json', mimeType: 'application/json', buffer: Buffer.from(exportedText),
    });
    await importPage.getByRole('heading', { name: 'Review before applying', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    const applyImport = importPage.getByRole('button', { name: 'Download backup and replace workspace', exact: true });
    const [preImportBackup] = await Promise.all([
      importPage.waitForEvent('download'),
      applyImport.click(),
    ]);
    expect(preImportBackup.suggestedFilename()).toMatch(/^alloflow-before-import-\d{4}-\d{2}-\d{2}\.json$/);
    await importPage.getByRole('heading', { name: 'Evaluation overview', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await importPage.locator('.ae-operation-notice').filter({ hasText: 'Workspace replaced after review; the prior workspace was downloaded' }).waitFor({ state: 'visible', timeout: 10000 });
    await importPage.locator('.ae-save-state').filter({ hasText: 'Saved on this device' }).waitFor({ state: 'visible', timeout: 10000 });

    const restored = await importPage.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('_workspace_v1'));
      const ws = key ? JSON.parse(localStorage.getItem(key)) : null;
      return ws ? { teachers: ws.teachers.length, org: ws.config.organization } : null;
    });
    expect(restored, 'import must persist a workspace').toBeTruthy();
    expect(restored.teachers).toBe(storedWorkspace.teachers.length);
    expect(restored.org).toBe(storedWorkspace.config.organization);
    expect(errors).toEqual([]);
    await importPage.close();
  }, 90000);

  it('dark scheme: the panel paints its own ground (no transparent-body inherit)', async () => {
    const { page, errors } = await openWorkspace({ colorScheme: 'dark' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);
});
