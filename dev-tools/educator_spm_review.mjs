import assert from 'node:assert/strict';
import { readFile, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url), root = process.cwd();
const output = path.join(root, 'reports/educator-spm-refinements-2026-09-08');
await mkdir(output, { recursive: true });
async function write(target, data) { const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data); let file; try { file = await open(target, 'r+'); } catch (e) { if (e.code !== 'ENOENT') throw e; file = await open(target, 'w'); } try { const before = await file.stat(); await file.writeFile(bytes); if (before.size > bytes.length) await file.truncate(bytes.length); } finally { await file.close(); } }
const report = { checks: [], views: {}, errors: [] }, url = pathToFileURL(path.join(root, 'educator-evaluation.html')).href;
const browser = await chromium.launch({ headless: true }); let page;
async function audit(name) {
  console.log('Reviewing ' + name);
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }); return { violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), width: innerWidth, scrollWidth: document.documentElement.scrollWidth }; });
  report.views[name] = result; await write(path.join(output, name + '.png'), await page.screenshot());
  assert.deepEqual(result.violations, [], name + ' accessibility'); assert.ok(result.scrollWidth <= result.width + 1, name + ' overflow');
}
async function openFixture(workspace, options = {}) {
  const next = await browser.newPage({ viewport: { width: 1180, height: 1000 }, reducedMotion: 'reduce', ...options });
  next.setDefaultTimeout(20000); next.setDefaultNavigationTimeout(30000);
  next.on('pageerror', e => report.errors.push(e.message));
  await next.addInitScript(value => { localStorage.setItem('allo_educator_evaluation_workspace_v1', value); }, JSON.stringify(workspace));
  await next.goto(url); await next.getByLabel(/^Selected educator/).and(next.locator('select')).selectOption('sample-t4');
  await next.getByRole('tab', { name: 'SPM / SLO', exact: true }).click(); return next;
}
const stage = () => page.locator('.ae-spm-stepper [aria-current="step"]');
const role = async name => page.getByRole('button', { name, exact: true }).click();
async function review(confirm) { const dialog = page.getByRole('dialog'); await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: confirm, exact: true }).click(); }
try {
  page = await browser.newPage({ viewport: { width: 1180, height: 1000 } }); page.setDefaultTimeout(20000);
  await page.goto(url); await page.getByRole('button', { name: /Start a guided sample tour/ }).click();
  const exit = page.getByRole('button', { name: 'Exit tour', exact: true }); if (await exit.count()) await exit.click();
  await page.locator('.ae-save-state').filter({ hasText: 'Saved on this device' }).waitFor();
  const fixture = await page.evaluate(() => JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1')));
  const teacher = fixture.teachers.find(t => t.code === 'T-04'); assert.ok(teacher); assert.equal(teacher.id, 'sample-t4');
  const current = fixture.spms.find(s => s.teacherId === teacher.id);
  Object.assign(current, { status: 'draft', version: 1, firstOpenedAt: '', submittedAt: '', returnedAt: '', approvedAt: '', approvedBy: '', lockedAt: '', resultsSubmittedAt: '', rating: null, ratingRationale: '', returnReason: '', pendingReturnReason: '', results: '', reflection: '', context: 'Fictional inquiry unit', baseline: 'Initial evidence includes one supported claim.', goal: 'Use two observations to support a claim.', measures: 'Compare a beginning and ending rubric task.', actionPlan: 'Model evidence use, practice, then review progress.', createdAt: '2026-09-08T12:00:00Z' });
  fixture.spms.unshift({ ...current, id: 'manual-locked-history', status: 'locked', goal: 'Earlier completed learning goal', createdAt: '2027-01-01T12:00:00Z', lockedAt: '2027-05-01T12:00:00Z', approvedAt: '2027-02-01T12:00:00Z', results: 'Recorded results', reflection: 'Recorded reflection', rating: 2, ratingRationale: 'Evidence reviewed.' });
  await page.close(); page = await openFixture(fixture);
  const choose = page.getByLabel('SPM / SLO record', { exact: true }); assert.equal(await choose.inputValue(), current.id);
  assert.equal(await choose.locator('option').count(), 2);
  await choose.selectOption('manual-locked-history'); assert.equal(await stage().innerText(), 'Locked record');
  assert.equal(await page.getByLabel('Unit / goal statement and expected outcomes', { exact: true }).isDisabled(), true);
  await choose.selectOption(current.id); await role('Fictional educator');
  await page.getByRole('button', { name: 'Submit plan for approval', exact: true }).click(); assert.equal(await stage().innerText(), 'Review proposal');
  await role('Evaluator'); await page.getByLabel('Reason if returning', { exact: true }).fill('Clarify the baseline and the success measure.');
  await page.getByRole('button', { name: 'Return for revision', exact: true }).click();
  await role('Fictional educator'); assert.equal(await stage().innerText(), 'Prepare proposal');
  assert.ok((await page.locator('[aria-labelledby="ae-spm-progress-title"]').innerText()).includes('resubmits it for approval'));
  await page.locator('.ae-main').evaluate(el => { el.scrollTop = 0; });
  await audit('returned-plan-desktop');
  const illustration = await page.locator('.ae-workspace').screenshot({ type: 'jpeg', quality: 88 });
  for (const base of [root, path.join(root, 'desktop/web-app/public')]) await write(path.join(base, 'educator-evaluation-manual-assets/22-spm-workflow.jpg'), illustration);
  await page.getByLabel('Baseline', { exact: true }).fill('Initial work uses one supported claim; success requires two accurate observations.');
  await page.getByRole('button', { name: 'Submit plan for approval', exact: true }).click(); await role('Evaluator');
  await page.getByRole('button', { name: 'Approve plan', exact: true }).click(); await review('Approve plan version');
  assert.equal(await stage().innerText(), 'Submit results'); await role('Fictional educator');
  await page.getByLabel('Year-end results', { exact: true }).fill('The ending task includes two accurate observations supporting a claim.');
  await page.getByLabel('Teacher reflection', { exact: true }).fill('Modeling and partner practice supported clearer use of evidence.');
  await page.getByRole('button', { name: 'Submit results and reflection', exact: true }).click(); assert.equal(await stage().innerText(), 'Rate and lock');
  await role('Evaluator'); await page.getByLabel(/^Human-selected SPM rating/).and(page.locator('select')).selectOption('2');
  await page.getByLabel('Rating rationale', { exact: true }).fill('The beginning and ending tasks support the selected rating.');
  await page.getByRole('button', { name: 'Review rating & lock', exact: true }).click(); await review('Rate and lock record');
  assert.equal(await stage().innerText(), 'Locked record');
  assert.equal(await page.getByLabel('Unit / goal statement and expected outcomes', { exact: true }).isDisabled(), true);
  report.checks.push('Default unfinished plan, locked history selection, submit, return, revise/resubmit, reviewed approval, results/reflection, reviewed rating/lock');
  await audit('locked-plan-desktop'); await page.close();
  for (const theme of ['light', 'dark', 'contrast']) {
    page = await openFixture(fixture, { viewport: { width: 390, height: 844 }, colorScheme: theme === 'dark' ? 'dark' : 'light', contrast: theme === 'contrast' ? 'more' : 'no-preference' });
    assert.equal(await page.locator('html').getAttribute('data-ae-theme'), theme);
    await role('Fictional educator');
    await page.locator('.ae-spm-stepper').focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.ae-spm-stepper').scrollLeft > 0);
    await audit('spm-phone-' + theme); await page.close();
  }
  report.checks.push('Phone light/dark/high-contrast views and keyboard scrolling of the five-stage guide');
  for (const name of ['educator-evaluation-manual.html', 'school-rewards-manual.html']) {
    page = await browser.newPage({ viewport: { width: 1180, height: 900 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(20000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, name)).href);
    const assets = await page.locator('img').evaluateAll(async images => { images.forEach(img => { img.loading = 'eager'; }); await Promise.race([Promise.all(images.map(img => img.decode())), new Promise((_, reject) => setTimeout(() => reject(new Error('Manual images did not load')), 20000))]); return images.map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight })); });
    assert.ok(assets.every(img => img.width > 0 && img.height > 0));
    for (const item of assets) assert.ok((await readFile(path.join(root, item.src))).equals(await readFile(path.join(root, 'desktop/web-app/public', item.src))), item.src + ' packaged copy');
    assert.equal(await readFile(path.join(root, name), 'utf8'), await readFile(path.join(root, 'desktop/web-app/public', name), 'utf8'));
    const broken = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(id))); assert.deepEqual(broken, []);
    if (name.startsWith('educator')) await page.getByRole('heading', { name: 'SPM / SLO: proposal, results, and lock', exact: true }).scrollIntoViewIfNeeded();
    await audit(name + '-desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await audit(name + '-phone');
    await page.locator('#rt-toggle').click(); await page.locator('#rt-theme').selectOption('dark'); await page.locator('#rt-size').focus(); await page.keyboard.press('End');
    assert.equal(await page.locator('#rt-size').inputValue(), '1.6'); await audit(name + '-large-dark-phone');
    await page.close();
  }
  report.checks.push('Both manuals: all figures decode and match packaged copies, anchors resolve, desktop/phone and dark 160% text layouts pass');
  assert.deepEqual(report.errors, []); report.ok = true;
} catch (error) { report.failure = error.stack; if (page && !page.isClosed()) { await write(path.join(output, 'failure.txt'), error.stack + '\n\n' + await page.locator('body').innerText()); await write(path.join(output, 'failure.png'), await page.screenshot()); } throw error; }
finally { await write(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
console.log('SPM record navigation and full workflow verified.');
