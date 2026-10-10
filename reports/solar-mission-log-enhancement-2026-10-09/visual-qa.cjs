const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { buildSync } = require('esbuild'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), bundle = path.join(__dirname, 'harness.cjs'); process.chdir(root);
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const baseTime = Date.parse('2026-10-09T15:16:17.123Z');
const record = (text, kind, world, index) => ({ text, kind, world, timestamp: baseTime - index * 60000, time: 'original clock' });
const history = [
  record('Photo: Layered rocks beside the rover route. Compare the bright outcrop with the darker ground nearby.', 'photo', 'Mars', 0),
  record('Orrery observation: Mercury was slower at B; speed changed -12.4 km/s.', 'observation', 'Mercury', 1),
  record('Exported field journal for Earth', 'export', 'Earth', 2),
  record('Comparative scan completed: Rocks along the canyon rim', 'scan', 'Mars', 3),
  record('Planetary Field Traverse complete on Earth: 120 m, steady traction.', 'traverse', 'Earth', 4),
  record('500 m milestone — Pathfinder rank', 'milestone', 'Mars', 5),
  { text: 'Earlier observation: cloud layers above the horizon.', time: '11:04 PM' },
  { title: 'Saved field note', detail: 'Keep the original wording.\nA second line stays with this observation.', time: 'Earlier' },
  record('Observation of shadow length beside the landing site.', 'observation', 'Mars', 8),
  record('Observation of the route before starting the return journey.', 'observation', 'Mars', 9),
  { text: '=A1+1', kind: 'other', time: 'Legacy time' },
  'Untyped note saved during an earlier visit',
];
const fixtures = { missionLog: history, journalEntries: [{ planet: 'Earth', observation: 'Keep this observation.', timestamp: 1700000000000 }],
  journalDrafts: { Earth: { observation: 'Keep this draft.' } }, journalSynthesis: { claim: 'Keep this claim.' },
  vocabLookedUp: ['regolith'], mc_choice_Earth: false, mc_answered_Earth: true, compare1: 'Earth', compare2: 'Jupiter',
  learningPath: 'tour_guide', learningPathChecks: { tour_guide: [true, false, true, false, false] },
  activeAssignment: 'inner_planets', asn_done_inner_planets: [0, 2], assignmentRewarded: { full_survey: true }, orr_time: 0.7 };
function csvRows(csv) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (char === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  return rows;
}
(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1060, height: 1400, appStyles: true, layout: 'document' });
  let browser, page; const results = [];
  try {
    await harness.start(); browser = await chromium.launch(); page = await browser.newPage({ deviceScaleFactor: 1, acceptDownloads: true });
    page.setDefaultTimeout(60000); await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, dark] of [[1060, true], [1060, false], [320, true], [320, false]]) {
      const name = `mission-log-${width}-${dark ? 'dark' : 'light'}`; console.log('Starting ' + name);
      await page.setViewportSize({ width, height: 1400 }); await page.goto(harness.url + '/__harness');
      await page.waitForFunction(() => !!window.StemLab?._registry?.solarSystem);
      await page.locator('#wrap').evaluate((node, value) => node.style.width = value + 'px', width);
      await page.evaluate(({ dark, fixtures }) => {
        const worlds = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        window.__mount({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false,
          paused: true, selectedPlanet: 'Earth', viewTab: 'overview', showLog: false, ...fixtures } });
        window.__ctx.isDark = dark; window.__ctx.t = (key, fallback) => worlds.find(world => key === 'stem.solar_sys.' + world.toLowerCase()) || fallback || key;
        document.documentElement.classList.toggle('dark', dark); window.__rerender();
      }, { dark, fixtures });
      const log = page.locator('[data-solar-mission-log]'), toggle = log.locator('[data-log-toggle]'), entries = log.locator('[data-log-entry]');
      const search = log.locator('#solar-mission-log-search'), kind = log.locator('#solar-mission-log-kind'), order = log.locator('#solar-mission-log-order');
      const status = log.locator('[data-log-status]'), more = log.locator('[data-log-more]'), exportButton = log.locator('[data-log-export]');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false'); await toggle.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'solar-mission-log-search');
      assert.equal(await entries.count(), 5); assert.equal(await status.textContent(), 'Showing 5 of 12 matching activities');
      assert.equal(await entries.first().locator('time').getAttribute('datetime'), '2026-10-09T15:16:17.123Z');
      assert.equal(await page.evaluate(() => window.StemLab._registry.solarSystem.questHooks.find(hook => hook.id === 'deploy_rover').check(window.__toolData.solarSystem)), false);
      await log.screenshot({ path: path.join(__dirname, name + '-timeline.png'), animations: 'disabled' });
      const beforeExport = await page.evaluate(() => window.__toolData.solarSystem);
      const downloadPromise = page.waitForEvent('download'); await exportButton.click(); const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^solar_mission_log_.*\.csv$/);
      const csv = fs.readFileSync(await download.path(), 'utf8').replace(/^\uFEFF/, ''), rows = csvRows(csv);
      assert.equal(rows.length, 13); assert.deepEqual(rows[0], ['Time', 'Activity', 'World', 'Details']);
      assert.equal(rows[1][0], '2026-10-09T15:16:17.123Z'); assert.equal(rows[7][0], '11:04 PM'); assert.equal(rows[11][3], "'=A1+1");
      assert.equal(rows[8][3], 'Saved field note\nKeep the original wording.\nA second line stays with this observation.');
      assert.deepEqual(await page.evaluate(() => window.__toolData.solarSystem), beforeExport);
      if (width === 1060 && dark) await download.saveAs(path.join(__dirname, 'mission-log-export.csv'));
      await more.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.dataset.logEntry === '5'); assert.equal(await entries.count(), 10);
      assert.equal(await entries.nth(6).locator('time').getAttribute('datetime'), null);
      assert.equal(await entries.nth(6).locator('time').textContent(), '11:04 PM');
      await more.click(); await page.waitForFunction(() => document.activeElement?.dataset.logEntry === '10');
      assert.equal(await entries.count(), 12); assert.equal(await more.count(), 0);
      await search.fill('  ｍａｒｓ   observation  '); assert.equal(await entries.count(), 2);
      assert.equal(await status.textContent(), 'Showing 2 of 2 matching activities');
      await kind.selectOption('scan'); assert.equal(await entries.count(), 0); assert.equal(await exportButton.isDisabled(), true);
      assert.equal(await log.locator('[data-log-empty]').count(), 1);
      await log.locator('[data-log-clear]').click(); await page.waitForFunction(() => document.activeElement?.id === 'solar-mission-log-results-title');
      assert.equal(await entries.count(), 5); assert.equal(await search.inputValue(), ''); assert.equal(await kind.inputValue(), 'all');
      await order.selectOption('oldest'); assert.equal(await entries.first().locator('[data-log-text]').textContent(), history[11]);
      await search.fill('Mars'); await kind.selectOption('observation');
      assert.deepEqual(await entries.locator('[data-log-text]').allTextContents(), [history[9].text, history[8].text]);
      const filteredDownload = page.waitForEvent('download'); await exportButton.click(); const filtered = await filteredDownload;
      const filteredRows = csvRows(fs.readFileSync(await filtered.path(), 'utf8').replace(/^\uFEFF/, ''));
      assert.deepEqual(filteredRows.slice(1).map(row => row[3]), [history[9].text, history[8].text]);
      await log.screenshot({ path: path.join(__dirname, name + '-filtered.png'), animations: 'disabled' });
      await toggle.click(); assert.equal(await page.locator('#solar-mission-log-content').isHidden(), true);
      await toggle.click(); await page.waitForFunction(() => document.activeElement?.id === 'solar-mission-log-search');
      assert.equal(await search.inputValue(), 'Mars'); assert.equal(await kind.inputValue(), 'observation'); assert.equal(await order.inputValue(), 'oldest');
      await log.locator('[data-log-clear]').click(); assert.equal(await order.inputValue(), 'oldest');
      const final = await page.evaluate(() => window.__toolData.solarSystem);
      for (const key of Object.keys(fixtures)) assert.deepEqual(final[key], fixtures[key]);
      const metrics = await log.evaluate(node => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        errors: window.__events.errors,
        minimumText: Math.min(...[...node.querySelectorAll('p,span,button,label,h4,h5,h6,time')].filter(n => n.getBoundingClientRect().height && [...n.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()) && !n.closest('[aria-hidden="true"]')).map(n => parseFloat(getComputedStyle(n).fontSize))),
        minimumControlHeight: Math.min(...[...node.querySelectorAll('button,input,select')].map(n => n.getBoundingClientRect().height)),
        entryFont: parseFloat(getComputedStyle(node.querySelector('[data-log-text]')).fontSize),
        overflow: [...node.querySelectorAll('p,h4,h5,h6,button,label,time')].filter(n => n.getBoundingClientRect().height && n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
      }));
      assert.ok(metrics.scrollWidth <= width + 1, 'Page overflow ' + name); assert.deepEqual(metrics.errors, []);
      assert.deepEqual(metrics.overflow, []); assert.ok(metrics.minimumText >= 13); assert.ok(metrics.minimumControlHeight >= 43.5); assert.ok(metrics.entryFont >= 16);
      results.push({ name, dark, ...metrics, nativeKeyboardControls: true, committedSearchAndNewEntryFocus: true,
        datedAndLegacyTimes: true, savedOrderPreserved: true, normalizedSearch: true, persistentFilters: true,
        emptyRecovery: true, paginatedTimeline: true, completeFilteredDownload: true, noExportStateChanges: true, noFalseDeploymentCredit: true, preservedOtherLearning: true });
      fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify({ sourceSha256: createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_solarsystem.js')).digest('hex'), completed: results.length === 4, results }, null, 2));
      console.log('Checked ' + name); await harness.destroy(page);
    }
  } catch (error) {
    if (page && !page.isClosed()) console.error(JSON.stringify(await page.evaluate(() => ({ errors: window.__events?.errors, active: document.activeElement?.outerHTML })).catch(() => ({}))));
    throw error;
  } finally { if (page) await page.close(); if (browser) await browser.close(); await harness.stop(); if (fs.existsSync(bundle)) fs.unlinkSync(bundle); }
})().catch(error => { console.error(error); process.exitCode = 1; });
