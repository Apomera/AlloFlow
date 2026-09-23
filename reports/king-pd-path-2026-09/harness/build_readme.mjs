// Assemble reports/king-pd-path-2026-09/README.md: placeholders filled from summary.json,
// tables injected from tables.mjs, so no figure in the README is typed by hand.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const K4 = 'C:/tmp/alloflow_dispatch/wave1/K4_scratch';
const REPORT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/king-pd-path-2026-09';
const S = JSON.parse(fs.readFileSync(path.join(K4, 'summary.json'), 'utf8'));
const sec = (v) => (v == null ? '?' : (Math.round(v / 100) / 10).toFixed(1));
const med = (k, m) => (S.agg[k] && S.agg[k][m] ? S.agg[k][m].median : null);
const T = 'live|wifi|teacher', T3 = 'live|fast3g|teacher', St = 'live|wifi|student', S3 = 'live|fast3g|student';
const mb = (v) => (v == null ? '?' : (v / 1048576).toFixed(1));
const base = S.rows.filter((r) => !r.whatif);
const margins = base.map((r) => r.clearAllMarginMs).filter((x) => x != null);
// Boot probe (watchdog) runs.
const bootDir = path.join(K4, 'runs_boot');
const boot = fs.existsSync(bootDir) ? fs.readdirSync(bootDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(bootDir, f), 'utf8'))) : [];
const bootLine = (r) => {
  const m = r.K.marks; const di = r.perf && r.perf.nav ? r.perf.nav.domInteractive : null;
  const vis = m.clear_all_data != null && (m.loader_hidden == null || m.clear_all_data < m.loader_hidden);
  return `${r.net === 'wifi_shared' ? 'shared 10 Mbps Wi-Fi (400 kbps each)' : 'Slow 3G'}: #root first child at ${sec(m.root_child)} s, watchdog started at ${sec(di)} s, button ${vis ? '**VISIBLE at ' + sec(m.clear_all_data) + ' s**' : (m.clear_all_data != null ? 'injected into the hidden loader' : 'not shown')}, launch pad at ${sec(m.launchpad)} s`;
};
const bootShared = boot.find((r) => r.net === 'wifi_shared');
const vals = {
  T_WIFI: sec(med(T, 'toolContent')), T_3G: sec(med(T3, 'toolContent')), S_WIFI: sec(med(St, 'toolContent')), S_3G: sec(med(S3, 'toolContent')),
  T_CLICKS: med(T, 'clicks'), T_PICKS: med(T, 'filePicks'), S_CLICKS: med(St, 'clicks'), S_PICKS: med(St, 'filePicks'),
  LOADMISS_WIFI: sec(med(T, 'loadMissingWindowMs')), LOADMISS_3G: sec(med(T3, 'loadMissingWindowMs')),
  STR_WIFI: sec(med(T, 'stringsAt')), STR_3G: sec(med(T3, 'stringsAt')), LP_3G: sec(med(T3, 'launchpadDom')),
  STR_GAP_3G: sec(med(T3, 'stringsAt') - med(T3, 'launchpadDom')),
  MB_T: mb(med(T, 'totalBytes')), MB_S: mb(med(St, 'totalBytes')),
  MB_CLASS: String(Math.round((med(T, 'totalBytes') + 24 * med(St, 'totalBytes')) / 1048576)) + ' MB for 1 teacher and 24 students',
  SELHUB_WIFI: sec(med(T, 'selHubReady')), SELHUB_3G: sec(med(T3, 'selHubReady')),
  QUEUE_WIFI: sec(med(T, 'queueDrained')), QUEUE_3G: sec(med(T3, 'queueDrained')),
  CLEAR_MIN: sec(Math.min(...margins)),
  BOOT_SHARED: bootShared ? bootLine(bootShared) : 'not measured',
  WHATIF_N: S.rows.filter((r) => r.whatif && !r.failure).length,
  WHATIF_DEAD: S.rows.filter((r) => r.whatif && !r.failure && r.linkDeadClicks > 0).length,
  BOOT_TABLE: boot.length ? '\n' + boot.map((r) => '  - ' + bootLine(r)).join('\n') : ' not measured',
};
let md = fs.readFileSync(path.join(K4, 'README.template.md'), 'utf8');
md = md.replace(/\{\{MB_CLASS\}\} MB/g, '{{MB_CLASS}}');
for (const [k, v] of Object.entries(vals)) md = md.split(`{{${k}}}`).join(String(v));
// Tables, split by heading.
const tables = execFileSync('node', [path.join(K4, 'tables.mjs'), path.join(K4, 'summary.json')]).toString();
const sections = tables.split(/\n(?=#### )/).map((x) => x.trim()).filter(Boolean);
const pick = (re) => sections.filter((x) => re.test(x.split('\n')[0])).join('\n\n');
md = md.replace('<!--TABLES-->', pick(/Live shell|Working tree|Measured with|Where the time|Failed \(driver/) + '\n\n' + pick(/Clear All Data/));
md = md.replace('<!--HOSTS-->', pick(/Downloads over|Third-party|HTML instead/));
md = md.replace('<!--METHOD-->', fs.readFileSync(path.join(K4, 'method_final.md'), 'utf8').trim());
md = md.replace('<!--REPRO-->', fs.readFileSync(path.join(K4, 'repro_final.md'), 'utf8').trim());
// Screenshots: step shots from the separate screenshot runs + the one-off captures.
const shotDir = path.join(REPORT, 'screenshots');
const cap = {
  'teacher-00-nav': 'Teacher: first paint after opening /app/',
  'teacher-01-launchpad-clicked': 'Teacher: after Full Platform, the role gate',
  'teacher-02-workspace': 'Teacher: workspace after closing the wizard',
  'teacher-03b-load-project-failed': 'Teacher: Load Project clicked before the handler loaded; only the red error badge shows',
  'teacher-04-pack-loaded': 'Teacher: pack loaded, opened at its last resource',
  'teacher-05-directions': 'Teacher: the directions with the Crew Protocols link',
  'teacher-06-selhub-open': 'Teacher: the link opens the SEL Hub home and the explainer, not the tool',
  'teacher-07-link-no-tool': 'Teacher: still no tool 8 s after the link',
  'teacher-08-tool': 'Teacher: Crew Protocols with the station, after the 20 s wait and the station button',
  'student-00-nav': 'Student: first paint after opening /app/',
  'student-01-launchpad-clicked': 'Student: after Full Platform, the role gate',
  'student-02-codename': 'Student: codename dialog',
  'student-05-directions': 'Student: the directions with the Crew Protocols link',
  'student-07-link-no-tool': 'Student: still no tool 8 s after the link',
  'student-03b-load-project-failed': 'Student: Load Saved File before the handler loaded',
  'student-04-pack-loaded': 'Student: pack loaded',
  'student-06-selhub-open': 'Student: SEL Hub home after the pack link',
  'student-08-tool': 'Student: Crew Protocols with the station',
  'pre-strings-quickstart-wizard-blank': 'Before ui_strings.js arrives: the Quick Start wizard has no labels (grade buttons, inputs, Skip and close are all blank)',
  'touch-390-game': '390 px: the card deck covers the lower buckets',
  'touch-390-last-bucket-after-scroll-drag': '390 px: after scrolling the last bucket above the deck, the finger drag works',
  'touch-chromebook-game': 'Touch Chromebook: all three buckets side by side',
};
const rank = (f) => (f.startsWith('pre-') ? 0 : f.startsWith('teacher-') ? 1 : f.startsWith('student-') ? 2 : 3);
const files = fs.existsSync(shotDir) ? fs.readdirSync(shotDir).filter((f) => f.endsWith('.png')).sort((a, c) => rank(a) - rank(c) || a.localeCompare(c)) : [];
md = md.replace('<!--SHOTS-->', files.map((f) => { const k = f.replace(/\.png$/, ''); return `**${cap[k] || k}**\n\n![${cap[k] || k}](screenshots/${f})`; }).join('\n\n'));
if (/[\u2013\u2014]/.test(md)) { const bad = md.split('\n').filter((l) => /[\u2013\u2014]/.test(l)); console.error('EN/EM DASH FOUND:\n' + bad.join('\n')); process.exitCode = 1; }
const left = md.match(/\{\{[A-Z_0-9]+\}\}|<!--[A-Z]+-->/g);
if (left) { console.error('UNFILLED:', left); process.exitCode = 1; }
fs.writeFileSync(path.join(REPORT, 'README.md'), md);
console.log('README.md', md.length, 'chars;', files.length, 'screenshots; values', JSON.stringify(vals));
