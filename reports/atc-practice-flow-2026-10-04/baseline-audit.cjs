const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const out = { started: new Date().toISOString(), observations: [], errors: [] };
const source = path.join(repo, 'stem_lab/stem_tool_atctower.js');
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const initialHash = hash();
async function box(locator) { return locator.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height, text: el.textContent }; }); }
async function main() {
  const fixture = await createFixtureServer();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      page.on('pageerror', e => out.errors.push(e.message));
      await page.goto(fixture.url);
      const launch = page.getByRole('button', { name: 'Start Tower Shift', exact: true });
      const pace = page.locator('[data-atctower-training-mode]');
      const tab = page.locator('#stem-atctower-tab-practice');
      out.observations.push({ width, view: 'welcome', launch: await box(launch), pace: await box(pace), practiceTab: await box(tab), selectedPace: await page.locator('input[name="atctower-training-mode"]:checked').inputValue(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      await page.screenshot({ path: path.join(__dirname, 'baseline-welcome-' + width + '.png'), fullPage: true });
      await tab.click();
      out.observations.push({ width, view: 'pathway', recommended: await box(page.locator('[data-atctower-recommended-start]')), firstCard: await box(page.locator('[data-atctower-pathway-card="first_landing"]')), focus: await page.evaluate(() => ({ id: document.activeElement.id, text: document.activeElement.textContent })) });
      await page.screenshot({ path: path.join(__dirname, 'baseline-pathway-' + width + '.png'), fullPage: true });
      await page.locator('[data-atctower-practice-start="first_landing"]').click();
      await page.locator('[data-atctower-playing]').waitFor();
      await page.locator('[data-atctower-command="r"]').click();
      await page.locator('[data-atctower-command="c"]').click();
      await page.locator('[data-atctower-command="end"]').click();
      await page.locator('[data-atctower-debrief]').waitFor();
      out.observations.push({ width, view: 'debrief', actions: await box(page.locator('.atc-debrief-actions')), reflection: await box(page.locator('[data-atctower-reflection-card]')), focus: await page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent.slice(0, 120) })), decisions: await page.locator('[data-atctower-evidence-events]').innerText() });
      await page.screenshot({ path: path.join(__dirname, 'baseline-debrief-' + width + '.png'), fullPage: true });
      await page.locator('[data-atctower-practice-retry="first_landing"]').click();
      await page.locator('[data-atctower-playing]').waitFor();
      out.observations.push({ width, view: 'retry', state: await page.evaluate(() => ({ paused: window.__atcGameRef.current.paused, trainingMode: window.__atcGameRef.current.trainingMode, practice: window.__atcGameRef.current.practice.id, active: document.activeElement.tagName, focusId: document.activeElement.id, scroll: scrollY })) });
      await page.close();
    }
    for (const id of ['first_landing', 'arrival_sequence', 'separation_recovery', 'crossing_priority']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce' });
      await page.goto(fixture.url);
      await page.locator('#stem-atctower-tab-practice').click();
      await page.locator('[data-atctower-practice-start="' + id + '"]').click();
      await page.locator('[data-atctower-playing]').waitFor();
      const coaching = page.locator('[data-atctower-coaching]');
      out.observations.push({ width: 390, view: 'initial-' + id, coaching: await coaching.innerText(), objectives: await page.locator('[data-atctower-exercise]').innerText(), roster: await page.evaluate(() => window.__atcGameRef.current.aircraft.map(a => ({ callsign: a.callsign, altitude: a.altitude, speed: a.speed, heading: a.heading, assignedRunway: a.assignedRunway, state: a.state }))) });
      await page.screenshot({ path: path.join(__dirname, 'baseline-initial-' + id + '-390.png'), fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  out.completed = new Date().toISOString(); out.sourceHash = initialHash; out.sourceStable = initialHash === hash();
  fs.writeFileSync(path.join(__dirname, 'baseline-flow-findings.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
}
main().catch(e => { console.error(e.stack); process.exitCode = 1; });
