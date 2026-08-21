/*
 * Rebuild the Educator Evaluation manual screenshots from the current bundles.
 *
 * The script drives only fictional data. It writes each JPEG to the source
 * manual asset folder and its desktop/web-app mirror so a manual update cannot
 * silently ship stale or mismatched images.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE = pathToFileURL(path.join(ROOT, 'desktop', 'web-app', 'public', 'educator-evaluation.html')).href;
const ASSETS = path.join(ROOT, 'educator-evaluation-manual-assets');
const MIRROR = path.join(ROOT, 'desktop', 'web-app', 'public', 'educator-evaluation-manual-assets');
const STANDALONE_BUNDLE = path.join(ROOT, 'desktop', 'web-app', 'public', 'educator_evaluation_standalone.js');

fs.mkdirSync(ASSETS, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });

function watchPage(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return () => {
    if (errors.length) throw new Error(label + ' emitted browser errors:\n' + errors.join('\n'));
  };
}

async function save(page, name) {
  const target = path.join(ASSETS, name);
  await page.screenshot({ path: target, type: 'jpeg', quality: 88, fullPage: false });
  fs.copyFileSync(target, path.join(MIRROR, name));
  process.stdout.write('captured ' + name + '\n');
}

async function localPage(browser, width, height, start = 'sample') {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const verify = watchPage(page, start + ' local workspace');
  await page.goto(PAGE);
  await page.waitForSelector('.ae-onboarding-overlay .ae-onboarding-option');
  if (start) {
    const index = start === 'sample' ? 0 : (start === 'blank' ? 1 : 2);
    await page.locator('.ae-onboarding-overlay .ae-onboarding-option').nth(index).click();
    await page.waitForSelector('.ae-tabs');
    const exitTour = page.getByRole('button', { name: 'Exit tour', exact: true });
    if (await exitTour.count()) await exitTour.click();
    await page.waitForTimeout(250);
  }
  return { context, page, verify };
}

async function openTab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click();
  await page.waitForTimeout(200);
}

async function selectTeacher(page, label) {
  await openTab(page, 'Overview');
  await page.locator('select').first().selectOption({ label });
  await page.waitForTimeout(200);
}

async function readWorkspace(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.includes('_workspace_v1'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
}

async function completeRehearsal(page) {
  await page.getByRole('button', { name: 'Start rehearsal with Teacher 08', exact: true }).click();
  await page.getByRole('button', { name: '+ Assign formal observation', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as Fictional educator', exact: true }).click();
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
  for (let index = 0, count = await annualMeasures.count(); index < count; index += 1) await annualMeasures.nth(index).fill(String(2.4 + (index * 0.1)));
  await annual.getByText(/I confirm the official final rating form/).locator('..').locator('input[type="checkbox"]').check();
  await annual.getByRole('button', { name: 'Record final release', exact: true }).click();
  await page.getByText('Rehearsal complete', { exact: true }).waitFor();
}

function capturePortalBundle() {
  const bundle = fs.readFileSync(STANDALONE_BUNDLE, 'utf8');
  const marker = '{standalone:!0}';
  const markerIndex = bundle.lastIndexOf(marker);
  if (markerIndex < 0) throw new Error('Could not find the standalone render marker in the educator evaluation bundle. Rebuild the module before capturing the manual.');
  return bundle.slice(0, markerIndex)
    + '{standalone:!0,repository:window.__CAPTURE_REPOSITORY__}'
    + bundle.slice(markerIndex + marker.length);
}

function teacherWorkspace(workspace, teacherId) {
  const copy = JSON.parse(JSON.stringify(workspace));
  copy.config.sampleMode = false;
  copy.teachers = copy.teachers.filter((item) => item.id === teacherId);
  for (const key of ['walkthroughs', 'observations', 'spms', 'comments', 'audit', 'cycleSnapshots']) {
    copy[key] = (copy[key] || []).filter((item) => item.teacherId === teacherId);
  }
  return copy;
}

async function portalCapture(browser, workspace, role, name) {
  const context = await browser.newContext({ viewport: { width: 1770, height: 1200 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const verify = watchPage(page, role + ' portal');
  const teacher = workspace.teachers[2];
  const filtered = role === 'teacher' ? teacherWorkspace(workspace, teacher.id) : JSON.parse(JSON.stringify(workspace));
  filtered.config.sampleMode = false;
  const currentUser = role === 'teacher'
    ? { email: 'teacher03@district.example', displayName: teacher.name, role: 'teacher', teacherId: teacher.id }
    : { email: 'principal@district.example', displayName: 'A. Principal', role: 'evaluator', teacherId: '' };
  const payload = { ok: true, workspace: filtered, revision: 41, currentUser, deployment: { portalUrl: 'https://script.google.com/macros/s/fictional/exec' } };
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><title>Educator Evaluation Portal Capture</title></head><body><div id="educator-evaluation-root"></div></body></html>', { waitUntil: 'load' });
  await page.evaluate((bootstrapPayload) => {
    window.__CAPTURE_REPOSITORY__ = {
      kind: 'apps-script-capture',
      bootstrap: async () => bootstrapPayload,
      saveWorkspace: async ({ workspace }) => ({ ok: true, workspace, revision: bootstrapPayload.revision + 1 }),
      sendNotification: async () => ({ ok: true }),
      reviewReleasedEvaluation: async () => ({ ok: true, review: { token: 'fictional-review-token' } }),
      shareReleasedEvaluation: async () => ({ ok: true }),
      recordReleasedSummaryOpened: async () => ({ ok: true }),
      getInitialRoute: () => null,
    };
  }, payload);
  await page.addScriptTag({ content: capturePortalBundle() });
  try {
    await page.waitForSelector('.ae-tabs', { timeout: 15000 });
  } catch (error) {
    verify();
    throw error;
  }
  await page.waitForTimeout(300);
  await save(page, name);
  verify();
  await context.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    let shot = await localPage(browser, 1280, 720, null);
    await save(shot.page, '01-first-launch.jpg'); shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200);
    await save(shot.page, '02-overview.jpg');
    const sampleWorkspace = await readWorkspace(shot.page);
    shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200); await openTab(shot.page, 'Walkthroughs'); await save(shot.page, '03-walkthroughs.jpg'); shot.verify(); await shot.context.close();
    shot = await localPage(browser, 1770, 1200); await selectTeacher(shot.page, 'Teacher 03 · T-03'); await openTab(shot.page, 'Formal observations'); await save(shot.page, '04-formal-observation.jpg'); shot.verify(); await shot.context.close();
    shot = await localPage(browser, 1770, 1200); await openTab(shot.page, 'Trends'); await shot.page.locator('select').first().selectOption({ label: 'Teacher 03 · T-03' }); await save(shot.page, '05-trends.jpg'); shot.verify(); await shot.context.close();
    shot = await localPage(browser, 1280, 720); await openTab(shot.page, 'Setup'); await save(shot.page, '06-setup.jpg'); shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200); await openTab(shot.page, 'Setup'); await shot.page.locator('section', { hasText: 'Share by QR' }).first().scrollIntoViewIfNeeded(); await shot.page.waitForTimeout(250); await save(shot.page, '07-share-qr.jpg'); shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200); await selectTeacher(shot.page, 'Teacher 03 · T-03');
    await shot.page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.includes('_workspace_v1'));
      const workspace = key ? JSON.parse(localStorage.getItem(key)) : null;
      if (workspace) { workspace.config.sampleMode = false; localStorage.setItem(key, JSON.stringify(workspace)); }
    });
    await shot.page.reload(); await shot.page.waitForSelector('.ae-tabs'); await selectTeacher(shot.page, 'Teacher 03 · T-03'); await shot.page.getByRole('button', { name: 'Educator preview', exact: true }).click(); await shot.page.waitForTimeout(250); await save(shot.page, '08-teacher-view.jpg'); shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200); await selectTeacher(shot.page, 'Teacher 03 · T-03'); await openTab(shot.page, 'Reports & audit'); await save(shot.page, '09-reports-audit.jpg'); shot.verify(); await shot.context.close();
    shot = await localPage(browser, 804, 1600); await openTab(shot.page, 'Walkthroughs'); await save(shot.page, '10-phone.jpg'); shot.verify(); await shot.context.close();

    await portalCapture(browser, sampleWorkspace, 'evaluator', '11-portal-evaluator.jpg');
    await portalCapture(browser, sampleWorkspace, 'teacher', '11-portal-teacher.jpg');

    shot = await localPage(browser, 1280, 720); await openTab(shot.page, 'Setup'); await shot.page.locator('section', { hasText: 'Simulation Studio' }).first().scrollIntoViewIfNeeded(); await shot.page.waitForTimeout(250); await save(shot.page, '12-simulation-studio.jpg'); shot.verify(); await shot.context.close();
    shot = await localPage(browser, 1280, 720); await openTab(shot.page, 'Setup'); await shot.page.getByRole('button', { name: 'Choose principal helper', exact: true }).click(); await shot.page.locator('#ae-principal-share-setup').scrollIntoViewIfNeeded(); await shot.page.waitForTimeout(250); await save(shot.page, '13-principal-helper.jpg'); shot.verify(); await shot.context.close();

    shot = await localPage(browser, 1770, 1200); await completeRehearsal(shot.page); await shot.page.locator('section', { hasText: 'Practice one complete fictional evaluation' }).first().scrollIntoViewIfNeeded(); await shot.page.waitForTimeout(250); await save(shot.page, '14-rehearsal-complete.jpg'); shot.verify(); await shot.context.close();
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
