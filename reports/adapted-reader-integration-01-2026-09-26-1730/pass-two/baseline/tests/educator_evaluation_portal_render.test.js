// Renders apps_script/educator_evaluation/Portal.html, the exact bundle a district
// pastes into its own Apps Script project, in a real browser with google.script.run
// stubbed by bootstrap payloads from the production Code.gs harness.
//
// Everything else covering the portal is either server-side (the VM harness) or a
// text pin. Until this existed, nothing proved the pasted bundle mounts at all.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { repositoryFixture, ADMIN, EVALUATOR, TEACHER_ONE } from './helpers/educator_evaluation_gs_harness.js';

const PORTAL = fs.readFileSync(path.join(process.cwd(), 'apps_script', 'educator_evaluation', 'Portal.html'), 'utf8');

const bootstrapFor = (email) => {
  const harness = repositoryFixture();
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  expect(boot.ok).toBe(true);
  if (boot.workspace.teachers.some(teacher => teacher.id === 't1')) {
    boot.workspace.observations.push(
      { id: 'history-t1-a', teacherId: 't1', createdAt: '2026-02-01T12:00:00.000Z', observedAt: '2026-02-10T12:00:00.000Z', finalizedAt: '2026-02-20T12:00:00.000Z', frameworkVersion: 'pa-act13-classroom-2021', version: 1, prework: {}, ratings: { d1: 2, d2: 2, d3: 2, d4: 2 }, rationales: {}, componentTags: [] },
      { id: 'history-t1-b', teacherId: 't1', createdAt: '2026-04-01T12:00:00.000Z', observedAt: '2026-04-10T12:00:00.000Z', finalizedAt: '2026-04-20T12:00:00.000Z', frameworkVersion: 'pa-act13-classroom-2021', version: 1, prework: {}, ratings: { d1: 3, d2: 3, d3: 3, d4: 3 }, rationales: {}, componentTags: [] },
    );
  }
  return boot;
};

const harnessPage = (boot, options = {}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>portal harness</title>
<style>html,body,#educator-evaluation-root{min-height:100%;margin:0}</style></head>
<body><div id="educator-evaluation-root"></div>
<script>
  /* BOOTSTRAP_STUB_START */
  const BOOT = ${JSON.stringify(boot)};
  const FAIL_SAVE = ${Boolean(options.failSave)};
  const SLOW_RELEASE = ${Boolean(options.slowRelease)};
  const FAIL_RELEASE = ${Boolean(options.failRelease)};
  const HOLD_DIRECTORY_REVIEW = ${Boolean(options.holdDirectoryReview)};
  window.__portalCalls = [];
  const chain = (resolve) => {
    const api = {
      withSuccessHandler(fn) { api._ok = fn; return api; },
      withFailureHandler(fn) { api._fail = fn; return api; },
    };
    for (const name of ['getPortalBootstrap','savePortalWorkspace','sendPortalNotification',
      'reviewPortalReleasedEvaluationShare','sharePortalReleasedEvaluation','recordReleasedSummaryOpened','getPortalSetupHealth',
      'getPortalAdminOperations','reviewPortalDirectoryChange','performPortalDirectoryChange',
      'reviewPortalCycleSchedule','performPortalCycleSchedule','reviewPortalDistrictExport','performPortalDistrictExport',
      'reviewPortalWorkspaceConfiguration','performPortalWorkspaceConfiguration',
      'getPortalAnnualArchives','reviewPortalArchiveRestoreRehearsal','performPortalArchiveRestoreRehearsal',
      'reviewPortalAnnualRollover','performPortalAnnualRollover','reconcilePortalAnnualRollover','getPortalCohortStats']) {
      api[name] = function () {
        const args = Array.from(arguments);
        const onSuccess = api._ok;
        const onFailure = api._fail;
        window.__portalCalls.push(name);
        if (name === 'reviewPortalDirectoryChange' && HOLD_DIRECTORY_REVIEW) {
          window.__releaseHeldDirectoryReview = () => {
            delete window.__releaseHeldDirectoryReview;
            if (onSuccess) onSuccess(resolve(name, args));
          };
          return;
        }
        const delay = name === 'sharePortalReleasedEvaluation' && SLOW_RELEASE ? 400 : 5;
        setTimeout(() => {
          if (FAIL_SAVE && name === 'savePortalWorkspace') {
            if (onFailure) onFailure({ message: 'Forced save failure for unavailable-panel regression.' });
            return;
          }
          if (FAIL_RELEASE && name === 'sharePortalReleasedEvaluation') {
            if (onFailure) onFailure({ message: 'Forced release failure for busy-focus regression.' });
            return;
          }
          if (onSuccess) onSuccess(resolve(name, args));
        }, delay);
      };
    }
    return api;
  };
  const replyFor = (name) => {
    if (name === 'getPortalBootstrap') return BOOT;
    if (name === 'getPortalCohortStats') return { ok: true, suppressed: true, minimum: 10,
      metric: 'overall', source: 'finalized_formal_observations', selectedMean: 2.5 };
    if (name === 'reviewPortalReleasedEvaluationShare') return { ok: true, review: {
      token: 'release-review-browser', action: 'create', educatorName: 'Teacher One', recipient: '${TEACHER_ONE}',
      finalizedAt: '2026-06-20T16:00:00.000Z', actorWillReceiveAccess: false,
    } };
    if (name === 'sharePortalReleasedEvaluation') return { ok: true, status: 'completed', recoveryPending: false,
      idempotent: false, releasedDoc: { id: 'released-browser', url: 'https://docs.google.com/document/d/released-browser/edit' } };
    if (name === 'getPortalAdminOperations') return { ok: true, directory: {
      revision: BOOT.revision, academicYear: BOOT.workspace.config.academicYear,
      educators: BOOT.workspace.teachers.map((teacher) => ({ id: teacher.id, code: teacher.code, name: teacher.name, building: teacher.building, assignment: teacher.assignment, active: teacher.active !== false, dueDate: teacher.dueDate || '', finalized: !!teacher.finalizedAt })),
      members: [
        { email: '${ADMIN}', displayName: 'District Admin', role: 'admin', teacherId: '', active: true },
        { email: '${EVALUATOR}', displayName: 'Principal', role: 'evaluator', teacherId: '', active: true },
        { email: '${TEACHER_ONE}', displayName: 'Teacher One', role: 'teacher', teacherId: 't1', active: true },
      ],
      assignments: [{ teacherId: 't1', evaluatorEmail: '${EVALUATOR}', active: true }],
    } };
    if (name === 'reviewPortalDirectoryChange') return { ok: true, review: {
      token: 'directory-review-browser', expiresAt: '2026-08-13T17:25:30.000Z', kind: 'member', action: 'create',
      candidate: { email: 'focus.teacher@example.edu', displayName: 'Focus Teacher', role: 'teacher', teacherId: 't1', active: true },
      current: null, impacts: { removesPortalAccess: false, changesRole: false, activeEvaluatorAssignments: 0, removesEvaluatorAccess: false },
    } };
    if (name === 'reviewPortalCycleSchedule') return { ok: true, review: {
      token: 'schedule-review-browser', expiresAt: '2026-08-13T17:25:30.000Z', affectedEducators: 2,
      skippedFinalized: 1, dueDate: '2027-05-15', sample: [{ name: 'Teacher One', previousDueDate: '' }],
    } };
    if (name === 'reviewPortalWorkspaceConfiguration') return { ok: true, review: {
      token: 'config-review-browser', expiresAt: '2026-08-13T17:25:30.000Z',
      changes: [{ field: 'organization', label: 'Organization / LEA', current: BOOT.workspace.config.organization, candidate: 'Reviewed Browser District' }],
      impacts: { activeEducators: BOOT.workspace.teachers.length, openCycles: BOOT.workspace.teachers.filter((teacher) => !teacher.finalizedAt).length, protectedSnapshots: 2, frameworkOrWeightChange: false, finalizedRecordsRetainSnapshots: true },
    } };
    if (name === 'performPortalWorkspaceConfiguration') return { ok: true, status: 'completed', recoveryPending: false, revision: BOOT.revision + 1,
      changes: [{ field: 'organization', label: 'Organization / LEA', current: BOOT.workspace.config.organization, candidate: 'Reviewed Browser District' }] };
    if (name === 'reviewPortalDistrictExport') return { ok: true, review: {
      token: 'export-review-browser', expiresAt: '2026-08-13T17:25:30.000Z', scope: 'status_csv',
      purpose: 'Annual records handoff', teacherId: '', educatorName: '', activeEducators: BOOT.workspace.teachers.length,
      recordCounts: { walkthroughs: 1, observations: 1, spms: 1, comments: 1, total: 4 },
      destination: "Private Authorized exports folder in the deployment owner's Drive",
      authorizedExportsAcl: { status: 'verified', inspectable: true, manualReviewRequired: false,
        folderDrift: false, fileCount: 0, driftedFileCount: 0, explicitAccessCount: 0 },
    } };
    if (name === 'performPortalDistrictExport') return { ok: true, status: 'completed', export: {
      id: 'export-browser', url: 'https://drive.google.com/file/d/export-browser/view', scope: 'status_csv',
      createdAt: '2026-08-13T17:15:30.000Z', private: true, sha256: 'browser-export-sha256',
    } };
    if (name === 'getPortalAnnualArchives') return { ok: true, archives: [{
      id: 'annual-archive-browser', name: 'Annual archive 2025-26', url: 'https://drive.google.com/file/d/annual-archive-browser/view',
      archivedAt: '2026-06-30T17:00:00.000Z', fromAcademicYear: '2025-26', plannedNextAcademicYear: '2026-27',
      sourceRevision: 12, verified: true,
    }] };
    if (name === 'reviewPortalArchiveRestoreRehearsal') return { ok: true, review: {
      token: 'rehearsal-review-browser', expiresAt: '2026-08-13T17:25:30.000Z', archiveId: 'annual-archive-browser',
      fromAcademicYear: '2025-26', archivedRevision: 12, activeAcademicYear: '2026-27', activeRevision: BOOT.revision,
      archivedCounts: { activeEducators: 2, records: { total: 4 } },
      currentCounts: { activeEducators: BOOT.workspace.teachers.length, records: { total: 4 } },
    } };
    if (name === 'reviewPortalAnnualRollover') return { ok: true, review: {
      token: 'rollover-review-browser', expiresAt: '2026-08-13T17:25:30.000Z',
      currentAcademicYear: '2026-27', nextAcademicYear: '2027-28',
      counts: { activeEducators: 12, inactiveEducators: 0, finalizedCycles: 3, openCycles: 2, notStartedCycles: 7,
        releasedDocuments: 2, retainedCycleSnapshots: 13,
        records: { walkthroughs: 3, observations: 2, spms: 1, comments: 4, total: 10 } },
    } };
    if (name === 'performPortalAnnualRollover') return { ok: true, status: 'completed', recoveryPending: false,
      fromAcademicYear: '2026-27', toAcademicYear: '2027-28',
      archive: { id: 'archive-browser', url: 'https://drive.google.com/file/d/archive-browser/view' } };
    if (name === 'reconcilePortalAnnualRollover') return { ok: true, status: 'none', recoveryPending: false };
    return { ok: true, checks: [] };
  };
  window.google = { script: {
    run: chain(replyFor),
    url: { getLocation(cb) { cb({ parameter: {} }); } },
  } };
  /* BOOTSTRAP_STUB_END */
<\/script>
${PORTAL}
</body></html>`;

describe('district portal bundle renders', () => {
  let browser;
  let dir;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-portal-render-'));
  }, 60000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }, 30000);

  const render = async (email, name, options = {}) => {
    const file = path.join(dir, name + '.html');
    const boot = bootstrapFor(email);
    if (options.finalizeFirstTeacher && boot.workspace.teachers[0]) boot.workspace.teachers[0].finalizedAt = '2026-06-20T16:00:00.000Z';
    fs.writeFileSync(file, harnessPage(boot, options), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(file).href);
    try { await page.waitForSelector('.ae-tabs', { timeout: 20000 }); }
    catch (error) { throw new Error(String(error) + '\nBrowser errors:\n' + errors.join('\n')); }
    await page.waitForTimeout(600);
    return { page, errors };
  };

  it('mounts for an evaluator with the district identity and no role switch', async () => {
    const { page, errors } = await render(EVALUATOR, 'evaluator');
    const tabs = await page.locator('.ae-tab').allInnerTexts();
    expect(tabs).toContain('Staff');
    expect(tabs).toContain('Reports & audit');
    const banner = await page.locator('.ae-local-banner').first().innerText();
    expect(banner).toContain('District Google account');
    expect(banner).toContain('Evaluator access');
    // Whitespace between the label and the sentence, for screen readers.
    expect(banner).toMatch(/District Google account\s+\S/);
    // The portal takes identity from the server; a client-side role switch there
    // would imply a user can choose their own permissions.
    expect(await page.locator('.ae-role').count()).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('keeps evaluator policy read-only, exposes formal history, and uses the district cohort service', async () => {
    const { page, errors } = await render(EVALUATOR, 'evaluator-boundaries');
    await page.getByRole('heading', { name: 'Needs your attention' }).waitFor();
    await page.getByRole('button', { name: 'Assign formal observation' }).first().click();
    expect(await page.getByRole('tab', { name: 'Formal observations' }).getAttribute('aria-selected')).toBe('true');
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.getByText('District configuration is read-only here.').waitFor();
    expect(await page.getByLabel('Organization / LEA').isDisabled()).toBe(true);
    expect(await page.getByText(/Advanced workspace options/).count()).toBe(0);

    await page.getByRole('tab', { name: 'Overview' }).click();
    await page.getByLabel('Selected educator').selectOption('t1');
    await page.getByRole('tab', { name: 'Formal observations' }).click();
    const history = page.getByLabel('Observation record');
    await history.waitFor();
    expect(await history.locator('option').count()).toBeGreaterThan(1);
    expect(await history.locator('option').allInnerTexts()).toEqual(expect.arrayContaining([expect.stringContaining('Finalized')]));

    await page.getByRole('tab', { name: 'Trends' }).click();
    await page.getByText('Suppressed.', { exact: true }).waitFor();
    expect(await page.getByText(/No local approximation is shown/).count()).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('mounts for an educator scoped to their own record only', async () => {
    const { page, errors } = await render(TEACHER_ONE, 'teacher');
    const tabs = await page.locator('.ae-tab').allInnerTexts();
    expect(tabs).toContain('My evaluation');
    expect(tabs).not.toContain('Staff');
    expect(tabs).not.toContain('Reports & audit');
    const banner = await page.locator('.ae-local-banner').first().innerText();
    expect(banner).toContain('Educator access');
    expect(await page.locator('.ae-role').count()).toBe(0);
    // No roster control anywhere in an educator's portal.
    expect(await page.locator('text=Selected educator').count()).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('walks an administrator through review and explicit annual-rollover confirmations', async () => {
    const { page, errors } = await render(ADMIN, 'admin-rollover');
    expect(await page.locator('.ae-local-banner').first().innerText()).toContain('Administrator access');
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.getByText('Administrator-only district configuration.').waitFor();
    expect(await page.getByLabel('Organization / LEA').isEnabled()).toBe(true);
    expect(await page.getByText(/Advanced workspace options/).count()).toBe(0);
    expect(await page.getByText('Approved rubric boundary').count()).toBe(1);
    await page.getByLabel('Organization / LEA').fill('Reviewed Browser District');
    await page.getByRole('button', { name: 'Review district configuration' }).click();
    await page.getByText('Review 1 district-wide change.').waitFor();
    expect(await page.getByText('Reviewed Browser District', { exact: true }).count()).toBeGreaterThan(0);
    const configConfirm = page.getByRole('button', { name: 'Confirm reviewed configuration' });
    expect(await configConfirm.isDisabled()).toBe(true);
    await page.getByText(/I compared every current and proposed value/).click();
    expect(await configConfirm.isEnabled()).toBe(true);
    await configConfirm.click();
    await page.getByText('District configuration updated and audited.').waitFor();
    expect(await page.locator('#ae-rollover-title').innerText()).toMatch(/Annual rollover/);
    expect(await page.getByLabel('Next academic year (YYYY-YY)').inputValue()).toBe('2027-28');
    await page.getByRole('button', { name: 'Review annual rollover' }).click();
    await page.getByText('Review 2026-27 → 2027-28').waitFor();
    const confirm = page.getByRole('button', { name: 'Create archive & start 2027-28' });
    expect(await confirm.isDisabled()).toBe(true);
    const acknowledgments = page.locator('#ae-rollover-title').locator('xpath=ancestor::section').getByRole('checkbox');
    await acknowledgments.nth(0).check();
    expect(await confirm.isDisabled()).toBe(true);
    await acknowledgments.nth(1).check();
    expect(await confirm.isEnabled()).toBe(true);
    await confirm.click();
    await page.getByText('Annual rollover confirmed.').waitFor();
    expect(await page.getByRole('link', { name: 'Open verified private archive' }).getAttribute('href')).toMatch(/drive\.google\.com/);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('gives an administrator a reviewed operations center and private export workflow', async () => {
    const { page, errors } = await render(ADMIN, 'admin-operations');
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.getByText('District operations center').waitFor();
    expect(await page.getByText('District Admin').count()).toBeGreaterThan(0);
    await page.getByText(/Audited private exports and official-record handoff/).click();
    await page.getByLabel('Authorized purpose').fill('Annual records handoff');
    await page.getByRole('button', { name: 'Review private export' }).click();
    await page.getByText('Review status csv.').waitFor();
    await page.getByText(/I confirmed district authorization/).click();
    await page.getByRole('button', { name: 'Create verified private export' }).click();
    await page.getByText('Verified private export created and audited.').waitFor();
    expect(await page.getByRole('link', { name: 'Open export in Drive' }).getAttribute('href')).toMatch(/drive\.google\.com/);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('moves focus once to each newly prepared district-operations review', async () => {
    const { page, errors } = await render(ADMIN, 'admin-operation-review-focus');
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.getByText('District operations center').waitFor();

    const directory = page.locator('details').filter({ hasText: 'Accounts and evaluator assignments' });
    await directory.getByLabel('Managed district email').fill('focus.teacher@example.edu');
    await directory.getByLabel('Display name').fill('Focus Teacher');
    await directory.getByLabel('Linked educator record').selectOption('t1');
    await directory.getByRole('button', { name: 'Review member change' }).click();
    const directoryHeading = directory.locator('.ae-review-heading');
    await directoryHeading.waitFor();
    expect(await directoryHeading.evaluate((element) => element === document.activeElement)).toBe(true);
    const directoryAck = directory.getByRole('checkbox').last();
    await directoryAck.focus();
    await page.waitForTimeout(50);
    expect(await directoryAck.evaluate((element) => element === document.activeElement)).toBe(true);
    await directory.getByRole('button', { name: 'Cancel' }).click();

    const schedule = page.locator('details').filter({ hasText: 'Annual cycle due-date schedule' });
    await schedule.locator('summary').click();
    await schedule.getByLabel('Cycle due date').fill('2027-05-15');
    await schedule.getByRole('button', { name: 'Review schedule impact' }).click();
    const scheduleHeading = schedule.locator('.ae-review-heading');
    await scheduleHeading.waitFor();
    expect(await scheduleHeading.evaluate((element) => element === document.activeElement)).toBe(true);
    await schedule.getByRole('button', { name: 'Cancel' }).click();

    const exports = page.locator('details').filter({ hasText: 'Audited private exports and official-record handoff' });
    await exports.locator('summary').click();
    await exports.getByLabel('Authorized purpose').fill('Annual records handoff');
    await exports.getByRole('button', { name: 'Review private export' }).click();
    const exportHeading = exports.locator('.ae-review-heading');
    await exportHeading.waitFor();
    expect(await exportHeading.evaluate((element) => element === document.activeElement)).toBe(true);
    await exports.getByRole('button', { name: 'Cancel' }).click();

    const rehearsal = page.locator('details').filter({ hasText: 'Annual archive inventory and restore rehearsal' });
    await rehearsal.locator('summary').click();
    await rehearsal.getByRole('button', { name: 'Load and verify annual archives' }).click();
    await rehearsal.getByRole('button', { name: 'Review rehearsal' }).click();
    const rehearsalHeading = rehearsal.locator('.ae-review-heading');
    await rehearsalHeading.waitFor();
    expect(await rehearsalHeading.evaluate((element) => element === document.activeElement)).toBe(true);

    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('serializes district-operation review preparation so late responses cannot steal focus', async () => {
    const { page, errors } = await render(ADMIN, 'admin-operation-review-serialization', {
      holdDirectoryReview: true,
    });
    await page.getByRole('tab', { name: 'Setup' }).click();
    await page.getByText('District operations center').waitFor();

    const directory = page.locator('details').filter({ hasText: 'Accounts and evaluator assignments' });
    const schedule = page.locator('details').filter({ hasText: 'Annual cycle due-date schedule' });
    const exports = page.locator('details').filter({ hasText: 'Audited private exports and official-record handoff' });
    const rehearsal = page.locator('details').filter({ hasText: 'Annual archive inventory and restore rehearsal' });
    await schedule.locator('summary').click();
    await exports.locator('summary').click();
    await rehearsal.locator('summary').click();
    await schedule.getByLabel('Cycle due date').fill('2027-05-15');
    await exports.getByLabel('Authorized purpose').fill('Annual records handoff');
    await rehearsal.getByRole('button', { name: 'Load and verify annual archives' }).click();
    await rehearsal.getByRole('button', { name: 'Review rehearsal' }).waitFor();
    await directory.getByLabel('Managed district email').fill('focus.teacher@example.edu');
    await directory.getByLabel('Display name').fill('Focus Teacher');
    await directory.getByLabel('Linked educator record').selectOption('t1');

    const directoryButton = directory.getByRole('button', { name: 'Review member change' });
    const scheduleButton = schedule.getByRole('button', { name: 'Review schedule impact' });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find((button) => button.textContent.trim() === 'Review member change').click();
      buttons.find((button) => button.textContent.trim() === 'Review schedule impact').click();
    });
    await page.waitForFunction(() => typeof window.__releaseHeldDirectoryReview === 'function');
    const operationsBody = page.getByTestId('ae-operations-body');
    expect(await operationsBody.evaluate((element) => element.disabled)).toBe(true);
    expect(await operationsBody.getAttribute('aria-disabled')).toBe('true');

    const competingButtons = [
      scheduleButton,
      exports.getByRole('button', { name: 'Review private export' }),
      rehearsal.getByRole('button', { name: 'Review rehearsal' }),
    ];
    for (const button of competingButtons) {
      expect(await button.evaluate((element) => element.matches(':disabled'))).toBe(true);
      expect(await button.evaluate((element) => {
        element.focus();
        return element === document.activeElement;
      })).toBe(false);
    }
    expect(await page.evaluate(() => window.__portalCalls.filter((name) => /^reviewPortal/.test(name)))).toEqual([
      'reviewPortalDirectoryChange',
    ]);
    await directory.locator('summary').click();
    expect(await directory.evaluate((element) => element.open)).toBe(false);

    await page.evaluate(() => window.__releaseHeldDirectoryReview());
    const directoryHeading = directory.locator('.ae-review-heading');
    await directoryHeading.waitFor();
    expect(await directory.evaluate((element) => element.open)).toBe(true);
    expect(await directoryHeading.evaluate((element) => element === document.activeElement)).toBe(true);
    await page.waitForFunction(() => !document.querySelector('[data-testid="ae-operations-body"]').disabled);

    await scheduleButton.focus();
    expect(await scheduleButton.evaluate((element) => element === document.activeElement)).toBe(true);
    await scheduleButton.click();
    const scheduleHeading = schedule.locator('.ae-review-heading');
    await scheduleHeading.waitFor();
    expect(await scheduleHeading.evaluate((element) => element === document.activeElement)).toBe(true);
    expect(await page.evaluate(() => window.__portalCalls.filter((name) => /^reviewPortal/.test(name)))).toEqual([
      'reviewPortalDirectoryChange',
      'reviewPortalCycleSchedule',
    ]);

    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('removes an unavailable remote panel from keyboard and click interaction while keeping recovery reachable', async () => {
    const { page, errors } = await render(ADMIN, 'admin-unavailable-panel', { failSave: true });
    await page.getByRole('tab', { name: 'Staff' }).click();
    await page.getByRole('button', { name: '+ Add educator' }).click();
    const addEducator = page.getByRole('region', { name: 'Add an educator' });
    await addEducator.getByLabel('Name', { exact: true }).fill('Unavailable State Test');
    await addEducator.getByLabel('Unique staff code').fill('UST-1');
    await addEducator.getByRole('button', { name: 'Save educator' }).click();
    await page.getByText(/Last change is not confirmed:/).waitFor();

    const panel = page.locator('#ae-panel');
    expect(await panel.getAttribute('aria-disabled')).toBe('true');
    expect(await panel.getAttribute('inert')).not.toBeNull();
    expect(await page.evaluate(() => {
      const root = document.getElementById('ae-panel');
      const target = root && root.querySelector('button,input,select,textarea,a[href]');
      if (!root || !target) return true;
      target.focus();
      return root.contains(document.activeElement);
    })).toBe(false);
    expect(await page.evaluate(() => {
      const root = document.getElementById('ae-panel');
      const target = root && root.querySelector('button');
      if (!target) return true;
      let reachedTarget = false;
      target.addEventListener('click', () => { reachedTarget = true; }, { once: true });
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return reachedTarget;
    })).toBe(false);
    const reload = page.getByRole('button', { name: 'Reload district copy' });
    expect(await reload.isEnabled()).toBe(true);
    await reload.focus();
    expect(await reload.evaluate((element) => element === document.activeElement)).toBe(true);

    expect(errors).toEqual([]);
    await page.close();
  }, 90000);

  it('keeps focus and progress legible while released-summary access is being confirmed', async () => {
    const { page, errors } = await render(ADMIN, 'admin-release-busy-focus', {
      finalizeFirstTeacher: true,
      slowRelease: true,
      failRelease: true,
    });
    await page.getByRole('button', { name: 'Review & share released summary' }).click();
    const dialog = page.getByRole('dialog', { name: 'Confirm released-summary access' });
    await dialog.waitFor();
    const checkbox = dialog.getByRole('checkbox');
    await checkbox.check();
    await dialog.getByRole('button', { name: 'Confirm and grant access' }).click();

    const card = dialog.locator('.ae-release-review');
    await dialog.getByRole('status').waitFor();
    expect(await dialog.getByRole('status').innerText()).toContain('Keep this review open');
    expect(await card.getAttribute('aria-busy')).toBe('true');
    expect(await card.evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press('Tab');
    expect(await card.evaluate((element) => element === document.activeElement)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await card.evaluate((element) => element === document.activeElement)).toBe(true);

    await dialog.getByRole('alert').filter({ hasText: 'Forced release failure' }).waitFor();
    expect(await card.getAttribute('aria-busy')).toBeNull();
    expect(await checkbox.isEnabled()).toBe(true);
    expect(await dialog.getByRole('button', { name: 'Cancel' }).isEnabled()).toBe(true);
    await page.keyboard.press('Tab');
    expect(await checkbox.evaluate((element) => element === document.activeElement)).toBe(true);
    await card.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.getByRole('button', { name: 'Confirm and grant access' }).evaluate((element) => element === document.activeElement)).toBe(true);

    expect(errors).toEqual([]);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await page.close();
  }, 90000);

  const renderRejected = async (reply, name) => {
    const file = path.join(dir, name + '.html');
    const stub = reply === null ? '' : `
      const REPLY = ${JSON.stringify(reply)};
      const chain = () => {
        const api = { withSuccessHandler(fn) { api._ok = fn; return api; }, withFailureHandler(fn) { api._fail = fn; return api; } };
        for (const n of ['getPortalBootstrap','savePortalWorkspace','getPortalSetupHealth']) {
          api[n] = function () { setTimeout(() => api._ok && api._ok(REPLY), 5); };
        }
        return api;
      };
      window.google = { script: { run: chain(), url: { getLocation(cb) { cb({ parameter: {} }); } } } };`;
    const html = harnessPage({}).replace(/\/\* BOOTSTRAP_STUB_START \*\/[\s\S]*?\/\* BOOTSTRAP_STUB_END \*\//, stub);
    fs.writeFileSync(file, html, 'utf8');
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(pathToFileURL(file).href);
    await page.waitForSelector('h2', { timeout: 15000 });
    await page.waitForTimeout(500);
    return { page, errors };
  };

  // "Fails closed" is promised in the user manual and in the IT chapter of the
  // teacher guide. These assert that failing closed is legible, not a blank page.
  const FAILURES = [
    ['a district account that is not a member',
      { ok: false, error: { code: 'denied', message: 'Your district account is not authorized for this evaluation repository.' } },
      'not authorized for this evaluation repository'],
    ['a repository that was never set up',
      { ok: false, error: { code: 'not_configured', message: 'The evaluation repository has not been set up yet.' } },
      'has not been set up yet'],
    ['the page opened outside Apps Script', null,
      'must be opened from the district Apps Script web-app URL'],
  ];

  for (const [label, reply, expectedReason] of FAILURES) {
    it(`refuses ${label} with a readable explanation and a way forward`, async () => {
      const { page, errors } = await renderRejected(reply, 'fail-' + label.replace(/\W+/g, '-'));
      const text = await page.locator('body').innerText();
      expect(text).toContain('The secure workspace could not be opened');
      // Proves this case's stub actually drove the render, rather than the page
      // failing for some unrelated reason and passing the generic assertions.
      expect(text).toContain(expectedReason);
      expect(text).toContain('ask the district administrator');
      expect(text).toContain('Records remain hidden until identity and assignments are verified');
      // No records leak into a refused session, and no raw error tokens surface.
      expect(text).not.toMatch(/undefined|\[object|TypeError/);
      expect(await page.locator('.ae-tabs').count()).toBe(0);
      expect(await page.locator('button', { hasText: 'Try again' }).count()).toBe(1);
      expect(errors).toEqual([]);
      await page.close();
    }, 90000);
  }

  it('offers the user manual from the portal header too', async () => {
    const { page, errors } = await render(EVALUATOR, 'manual-link');
    expect(await page.locator('a[href*="educator-evaluation-manual"]').count()).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.close();
  }, 90000);
});
