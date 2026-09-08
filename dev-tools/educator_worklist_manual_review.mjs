import assert from 'node:assert/strict';
import { readFile, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';
const require = createRequire(import.meta.url), root = process.cwd();
const output = path.join(root, 'reports/educator-evaluation-enhancements-2026-09-08');
await mkdir(output, { recursive: true });
async function write(target, data) { const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data); let f; try { f = await open(target, 'r+'); } catch (e) { if (e.code !== 'ENOENT') throw e; f = await open(target, 'w'); } try { const before = await f.stat(); await f.writeFile(bytes); if (before.size > bytes.length) await f.truncate(bytes.length); } finally { await f.close(); } }
const report = { checks: [], views: {}, images: {}, errors: [] };
const browser = await chromium.launch({ headless: true });
const store = await createDemoServer();
let page;
async function capture(page, folder, name, locator = null) {
  console.log('Capturing ' + folder + '/' + name);
  if (!locator && folder === 'educator-evaluation-manual-assets') locator = page.locator('.ae-workspace');
  const bytes = locator ? await locator.screenshot({ type: 'jpeg', quality: 88 }) : await page.screenshot({ type: 'jpeg', quality: 88 });
  for (const base of [root, path.join(root, 'desktop/web-app/public')]) { const dir = path.join(base, folder); await mkdir(dir, { recursive: true }); await write(path.join(dir, name), bytes); }
  report.images[folder + '/' + name] = bytes.length;
}
async function audit(page, name) {
  console.log('Auditing ' + name);
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const found = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  report.views[name] = found;
  await write(path.join(output, name + (name.includes('manual.html') ? '-viewport.png' : '.png')), await page.screenshot({ fullPage: !name.includes('manual.html') }));
  assert.ok(found.scrollWidth <= found.viewport + 1, name + ': page overflow');
  assert.deepEqual(found.violations, [], name + ': accessibility');
}
try {
  page = await browser.newPage({ viewport: { width: 1180, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root, 'educator-evaluation.html')).href);
  await page.getByRole('button', { name: /Start a guided sample tour/ }).click();
  const exit = page.getByRole('button', { name: 'Exit tour', exact: true }); if (await exit.count()) await exit.click();
  await page.waitForFunction(() => !!localStorage.getItem('allo_educator_evaluation_workspace_v1'));
  // A fictional later completed observation must not steal a shortcut to open work.
  const fixture = await page.evaluate(() => {
    const key = 'allo_educator_evaluation_workspace_v1', w = JSON.parse(localStorage.getItem(key));
    const teacher = w.teachers.find(t => t.code === 'T-05'), current = w.observations.find(o => o.teacherId === teacher.id && !o.finalizedAt);
    w.observations.unshift({ ...current, id: 'manual-later-finalized', createdAt: '2027-06-01T12:00:00Z', observedAt: '2027-06-01T12:00:00Z', finalizedAt: '2027-06-02T12:00:00Z' });
    const educator = w.teachers.find(t => t.code === 'T-04'), spm = w.spms.find(s => s.teacherId === educator.id);
    spm.status = 'returned'; spm.returnReason = 'Clarify the baseline and success measure.';
    localStorage.setItem(key, JSON.stringify(w));
    return { teacherId: teacher.id, observationId: current.id, educatorId: educator.id, spmId: spm.id, workspace: JSON.stringify(w) };
  });
  // Install the fixture before app startup so a pending sample autosave cannot overwrite it.
  await page.addInitScript(value => { if (location.protocol === 'file:' && location.pathname.endsWith('/educator-evaluation.html')) localStorage.setItem('allo_educator_evaluation_workspace_v1', value); }, fixture.workspace);
  await page.reload(); await page.getByLabel('Search educators', { exact: true }).waitFor();
  await capture(page, 'educator-evaluation-manual-assets', '02-overview.jpg');
  await page.getByLabel('Search educators', { exact: true }).fill(' t-05 ');
  assert.equal(await page.locator('#ae-next-actions-list tbody tr').count(), 1);
  assert.equal(await page.locator('#ae-roster-status-list tbody tr').count(), 1);
  assert.equal(await page.locator('#ae-roster-status-list tbody tr td').nth(4).innerText(), 'In progress');
  assert.ok((await page.locator('[aria-labelledby="ae-completion-title"]').innerText()).includes('2 / 8'));
  await page.locator('#ae-worklist-filter-title').evaluate(el => { const main = el.closest('.ae-main'); if (main) main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - 12; window.scrollTo(0, 0); });
  await capture(page, 'educator-evaluation-manual-assets', '20-worklist.jpg');
  await audit(page, 'evaluator-worklist-desktop');
  await page.getByLabel('Search educators', { exact: true }).fill('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#ae-roster-status-list tbody tr').count(), 0);
  assert.ok((await page.locator('#ae-roster-status-list').innerText()).includes('No educators match'));
  await page.getByRole('button', { name: 'Clear filters', exact: true }).focus(); await page.keyboard.press('Enter');
  assert.equal(await page.getByLabel('Search educators', { exact: true }).evaluate(el => el === document.activeElement), true);
  await page.getByLabel('Next step owner', { exact: true }).selectOption('teacher');
  assert.equal(await page.locator('#ae-roster-status-list tbody tr').count(), 1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('Cycle due', { exact: true }).selectOption('overdue');
  assert.equal(await page.locator('#ae-roster-status-list tbody tr').count(), 1);
  assert.ok((await page.locator('#ae-roster-status-list tbody').innerText()).includes('Teacher 06'));
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('Search educators', { exact: true }).fill('T-05');
  await page.locator('#ae-next-actions-list').getByRole('button', { name: 'Record pre-conference', exact: true }).click();
  assert.equal(await page.getByLabel(/^Observation record/).and(page.locator('select')).inputValue(), fixture.observationId);
  assert.equal(await page.getByLabel(/^Educator/).and(page.locator('select')).inputValue(), fixture.teacherId);
  report.checks.push('Search, empty states, owner/due filters, stable completion totals, clear-filter focus, exact formal-record navigation');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByLabel(/^Selected educator/).and(page.locator('select')).selectOption(fixture.educatorId);
  await page.getByRole('button', { name: 'Fictional educator', exact: true }).click();
  await page.getByRole('heading', { name: 'Revise and resubmit your SPM / SLO plan', exact: true }).waitFor();
  await capture(page, 'educator-evaluation-manual-assets', '21-educator-next-step.jpg');
  await audit(page, 'educator-own-next-step');
  await page.getByRole('button', { name: 'Revise and resubmit your SPM / SLO plan', exact: true }).click();
  assert.ok((await page.locator('#ae-panel').innerText()).includes('Clarify the baseline'));
  report.checks.push('Educator-owned returned plan remains actionable alongside evaluator-owned formal work');
  await page.getByRole('button', { name: 'Evaluator', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#ae-worklist-filter-title').evaluate(el => { const main = el.closest('.ae-main'); if (main) main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - 12; window.scrollTo(0, 0); });
  await audit(page, 'evaluator-worklist-mobile');
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload();
  await page.getByLabel('Search educators', { exact: true }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-ae-theme'), 'dark');
  await audit(page, 'evaluator-worklist-dark');
  await page.emulateMedia({ contrast: 'more' }); await page.reload();
  await page.getByLabel('Search educators', { exact: true }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-ae-theme'), 'contrast');
  await audit(page, 'evaluator-worklist-contrast');
  await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
  // Capture actual school portal UI using the isolated in-memory repository.
  await page.setViewportSize({ width: 1180, height: 900 });
  console.log('Opening isolated school store: ' + store.url);
  await page.goto(store.url + '/?role=student');
  await page.waitForFunction(() => document.getElementById('actor-pill').textContent === 'STUDENT');
  await page.addStyleTag({ content: '.demo-bar{display:none!important}' });
  await page.locator('#tab-store').click();
  await page.getByRole('button', { name: 'Save for Art supply bundle', exact: true }).click();
  await capture(page, 'school-rewards-manual-assets', '13-store-browse.jpg', page.locator('#panel-store'));
  await page.locator('#tab-dashboard').click();
  await capture(page, 'school-rewards-manual-assets', '05-student-overview.jpg');
  await page.goto(store.url + '/?role=cashier');
  await page.waitForFunction(() => document.getElementById('actor-pill').textContent === 'CASHIER');
  await page.addStyleTag({ content: '.demo-bar{display:none!important}' });
  await page.locator('#tab-store').click(); await page.locator('#checkout-student').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Add Notebook to cart', exact: true }).click();
  const cashierCard = page.locator('#panel-store [data-checkout]');
  await cashierCard.scrollIntoViewIfNeeded();
  const cardBox = await cashierCard.boundingBox(), formBox = await page.locator('#checkout-form').boundingBox();
  const cashierClip = { x: cardBox.x, y: cardBox.y, width: cardBox.width, height: Math.ceil(formBox.y + formBox.height - cardBox.y + 22) };
  await capture(page, 'school-rewards-manual-assets', '14-cashier-review.jpg', { screenshot: options => page.screenshot({ ...options, clip: cashierClip }) });
  // Verify each manual's links, images, reading controls, and responsive layout.
  for (const name of ['educator-evaluation-manual.html', 'school-rewards-manual.html']) {
    let html = await readFile(path.join(root, name), 'utf8');
    await page.goto(pathToFileURL(path.join(root, name)).href);
    const dimensions = await page.locator('img').evaluateAll(async images => { images.forEach(img => { img.loading = 'eager'; }); await Promise.race([Promise.all(images.map(img => img.decode())), new Promise((_, reject) => setTimeout(() => reject(new Error('Manual image decoding exceeded 20 seconds')), 20000))]); return images.map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight })); });
    for (const { src, width, height } of dimensions) {
      assert.ok(width > 0 && height > 0, src);
      const tag = html.match(new RegExp('<img src="' + src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>'))?.[0];
      if (tag) html = html.replace(tag, tag.replace(/width="\d+"/, 'width="' + width + '"').replace(/height="\d+"/, 'height="' + height + '"'));
    }
    await write(path.join(root, name), html); await write(path.join(root, 'desktop/web-app/public', name), html);
    await page.reload();
    const broken = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(id)));
    assert.deepEqual(broken, []);
    await audit(page, name + '-desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await audit(page, name + '-mobile');
    if (name.startsWith('educator')) { const code = page.locator('pre'); await code.focus(); await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('pre').scrollLeft > 0); }
    await page.locator('#rt-toggle').click();
    await page.locator('#rt-theme').selectOption('dark');
    await page.locator('#rt-size').focus(); await page.keyboard.press('End');
    assert.equal(await page.locator('#rt-size').inputValue(), '1.6');
    assert.equal(await page.locator('html').getAttribute('data-allo-theme'), 'dark');
    await audit(page, name + '-large-dark-mobile');
    await page.locator('#rt-reset').click(); await page.locator('#rt-toggle').click();
    const detailHeading = name.startsWith('educator') ? 'Find the record that needs attention' : 'Find a reward and plan a purchase';
    await page.getByRole('heading', { name: detailHeading, exact: true }).scrollIntoViewIfNeeded();
    await write(path.join(output, name + '-detail-mobile.png'), await page.screenshot());
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.getByRole('heading', { name: detailHeading, exact: true }).scrollIntoViewIfNeeded();
    await write(path.join(output, name + '-detail-desktop.png'), await page.screenshot());
  }
  report.checks.push('Updated manual figures mirrored; image decoding, section anchors, keyboard code scrolling, reading controls, desktop/mobile and 160% text with dark-theme layouts verified');
  assert.deepEqual(report.errors, []); report.ok = true;
} catch (error) { report.failure = error.stack; if (page) { report.lastWorkspace = await page.evaluate(() => { try { const w = JSON.parse(localStorage.getItem('allo_educator_evaluation_workspace_v1')); return w && { spms: w.spms.map(s => ({ id: s.id, teacherId: s.teacherId, status: s.status })) }; } catch { return null; } }); await write(path.join(output, 'failure.txt'), error.stack + '\n\n' + await page.locator('body').innerText()); await write(path.join(output, 'failure.png'), await page.screenshot({ fullPage: true })); } throw error;
} finally { await write(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => store.server.close(resolve)); }
console.log('Educator refinements and illustrated manuals verified.');
