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
  return boot;
};

const harnessPage = (boot) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>portal harness</title>
<style>html,body,#educator-evaluation-root{min-height:100%;margin:0}</style></head>
<body><div id="educator-evaluation-root"></div>
<script>
  /* BOOTSTRAP_STUB_START */
  const BOOT = ${JSON.stringify(boot)};
  const chain = (resolve) => {
    const api = {
      withSuccessHandler(fn) { api._ok = fn; return api; },
      withFailureHandler(fn) { api._fail = fn; return api; },
    };
    for (const name of ['getPortalBootstrap','savePortalWorkspace','sendPortalNotification',
      'reviewPortalReleasedEvaluationShare','sharePortalReleasedEvaluation','recordReleasedSummaryOpened','getPortalSetupHealth',
      'getPortalAdminOperations','reviewPortalDirectoryChange','performPortalDirectoryChange',
      'reviewPortalCycleSchedule','performPortalCycleSchedule','reviewPortalDistrictExport','performPortalDistrictExport',
      'getPortalAnnualArchives','reviewPortalArchiveRestoreRehearsal','performPortalArchiveRestoreRehearsal',
      'reviewPortalAnnualRollover','performPortalAnnualRollover','reconcilePortalAnnualRollover','getPortalCohortStats']) {
      api[name] = function () { setTimeout(() => api._ok && api._ok(resolve(name)), 5); };
    }
    return api;
  };
  const replyFor = (name) => {
    if (name === 'getPortalBootstrap') return BOOT;
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
    if (name === 'reviewPortalDistrictExport') return { ok: true, review: {
      token: 'export-review-browser', expiresAt: '2026-08-13T17:25:30.000Z', scope: 'status_csv',
      purpose: 'Annual records handoff', teacherId: '', educatorName: '', activeEducators: BOOT.workspace.teachers.length,
      recordCounts: { walkthroughs: 1, observations: 1, spms: 1, comments: 1, total: 4 },
      destination: "Private Authorized exports folder in the deployment owner's Drive",
    } };
    if (name === 'performPortalDistrictExport') return { ok: true, status: 'completed', export: {
      id: 'export-browser', url: 'https://drive.google.com/file/d/export-browser/view', scope: 'status_csv',
      createdAt: '2026-08-13T17:15:30.000Z', private: true, sha256: 'browser-export-sha256',
    } };
    if (name === 'getPortalAnnualArchives') return { ok: true, archives: [] };
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

  const render = async (email, name) => {
    const file = path.join(dir, name + '.html');
    fs.writeFileSync(file, harnessPage(bootstrapFor(email)), 'utf8');
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
    await page.getByRole('tab', { name: 'Setup' }).click();
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
