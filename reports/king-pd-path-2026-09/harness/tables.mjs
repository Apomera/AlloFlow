// Markdown tables for the README, generated from summary.json (no hand-copied numbers).
import fs from 'node:fs';
const S = JSON.parse(fs.readFileSync(process.argv[2] || 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/summary.json', 'utf8'));
const sec = (v) => (v == null ? '-' : (Math.round(v / 100) / 10).toFixed(1));
const cell = (o, m, unit = 's') => {
  const x = o[m]; if (!x || x.median == null) return '-';
  if (unit === 'n') return x.range[0] === x.range[1] ? `${x.median}` : `${x.median} (${x.range[0]}-${x.range[1]})`;
  if (unit === 'MB') return `${(x.median / 1048576).toFixed(1)}`;
  return `${sec(x.median)} (${sec(x.range[0])}-${sec(x.range[1])})`;
};
const order = ['wifi|teacher', 'fast3g|teacher', 'wifi|student', 'fast3g|student'];
const label = { 'wifi|teacher': 'Teacher, school Wi-Fi', 'fast3g|teacher': 'Teacher, Fast 3G', 'wifi|student': 'Student, school Wi-Fi', 'fast3g|student': 'Student, Fast 3G' };
let out = '';
for (const target of ['live', 'local']) {
  if (!Object.keys(S.agg).some((k) => k.startsWith(target + '|') && !k.includes('whatif'))) continue;
  out +=`\n#### ${target === 'live' ? 'Live shell (alloflow-cdn.pages.dev/app/)' : 'Working tree (served locally)'}\n\n`;
  out += '| Path and network | n | Launch pad on screen | Strings arrive (3 MB) | Workspace ready | 1st Load attempt | Load handler registered | Pack loaded | SEL Hub open | Station starts (link) | Tool ready | Clicks | File picks | MB moved |\n';
  out += '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for (const k of order) {
    const o = S.agg[`${target}|${k}`]; if (!o) continue;
    out += `| ${label[k]} | ${o.n} | ${cell(o, 'launchpadDom')} | ${cell(o, 'stringsAt')} | ${cell(o, 'workspaceReady')} | ${cell(o, 'loadAttempt1')} | ${cell(o, 'miscReady')} | ${cell(o, 'packLoaded')} | ${cell(o, 'hubOpen')} | ${cell(o, 'stationStarted')} | **${cell(o, 'toolContent')}** | ${cell(o, 'clicks', 'n')} | ${cell(o, 'filePicks', 'n')} | ${cell(o, 'totalBytes', 'MB')} |\n`;
  }
}
out += '\n#### Measured with the proposed fixes emulated (live, what-if runs)\n\n| Path and network | Tool ready now | Tool ready with fixes | Clicks now | Clicks with fixes | File picks now / with fixes | MB now / with fixes | Dead pack-link clicks with fixes | n (what-if) |\n|---|---|---|---|---|---|---|---|---|\n';
for (const k of order) {
  const o = S.agg[`live|${k}`]; const w = S.agg[`live|${k}|whatif`]; if (!o || !w) continue;
  const dead = S.rows.filter((r) => r.target === 'live' && `${r.net}|${r.flow}` === k && r.whatif && !r.failure).map((r) => r.linkDeadClicks);
  out += `| ${label[k]} | ${cell(o, 'toolContent')} | ${cell(w, 'toolContent')} | ${cell(o, 'clicks', 'n')} | ${cell(w, 'clicks', 'n')} | ${cell(o, 'filePicks', 'n')} / ${cell(w, 'filePicks', 'n')} | ${cell(o, 'totalBytes', 'MB')} / ${cell(w, 'totalBytes', 'MB')} | ${dead.join(', ') || '-'} | ${w.n}${w.failures.length ? ' (+' + w.failures.length + ' failed)' : ''} |\n`;
}
out += '\n#### Where the time goes (live, medians)\n\n| Path and network | Load handler missing after the menu item appears | Link click to station (the 20 s wait) | Station button to tool ready | Background queue drained | Driver latency (included in the totals) |\n|---|---|---|---|---|---|\n';
for (const k of order) {
  const o = S.agg[`live|${k}`]; if (!o) continue;
  out += `| ${label[k]} | ${cell(o, 'loadMissingWindowMs')} | ${cell(o, 'linkDeadMs')} | ${cell(o, 'toolLoadMs')} | ${cell(o, 'queueDrained')} | ${cell(o, 'harnessOverheadMs')} |\n`;
}
out += '\n#### Failed (driver timeout) runs, excluded from the medians\n\n';
if (!Object.values(S.agg).some((o) => o.failures.length)) out += 'None in the final runs. The earlier driver generation had 3 driver timeouts on Fast 3G; see data/summary_v2.json.\n';
for (const [k, o] of Object.entries(S.agg)) for (const f of o.failures) out += `- ${f.split('\n')[0].replace(/[^\x20-\x7e]/g, '').replace(/=+.*$/, '').trim()}\n`;
// Watchdog: all runs, failed ones included (boot happens before any failure).
out += '\n#### "Clear All Data & Reload" watchdog, Fast 3G runs, closest first\n\n| Run | #root first child (s) | Watchdog margin (s) | Button injected | Visible |\n|---|---|---|---|---|\n';
for (const r of S.rows.filter((x) => x.net === 'fast3g' && !x.whatif).sort((a, b) => (a.clearAllMarginMs ?? 1e9) - (b.clearAllMarginMs ?? 1e9)).slice(0, 8)) {
  out += `| ${r.tag} | ${sec(r.rootChild)} | ${sec(r.clearAllMarginMs)} | ${r.clearAllInjected ? 'yes, same tick the loader hid' : 'no'} | ${r.clearAllShown ? 'YES' : 'no'} |\n`;
}
const baseRows = S.rows.filter((x) => !x.whatif);
const allMargins = baseRows.map((r) => r.clearAllMarginMs).filter((x) => x != null);
out += `\nAll ${baseRows.length} runs: visible ${baseRows.filter((r) => r.clearAllShown).length}, injected-while-hidden ${baseRows.filter((r) => r.clearAllInjected && !r.clearAllShown).length}, smallest margin ${sec(Math.min(...allMargins))} s.\n`;
out += '\n#### Downloads over 150 KB (live runs)\n\n| Host and path | KB | Runs |\n|---|---|---|\n';
const hv = {};
for (const row of S.rows.filter((x) => x.target === 'live' && !x.whatif)) for (const h of row.heavy) { const k = h.host + h.path; hv[k] = hv[k] || { kbs: [], runs: 0 }; hv[k].kbs.push(h.kb); hv[k].runs++; }
const liveRuns = S.rows.filter((x) => x.target === 'live' && !x.whatif).length;
for (const [k, e] of Object.entries(hv).sort((a, b) => Math.max(...b[1].kbs) - Math.max(...a[1].kbs))) out += `| ${k} | ${Math.min(...e.kbs) === Math.max(...e.kbs) ? e.kbs[0] : Math.min(...e.kbs) + '-' + Math.max(...e.kbs)} | ${e.runs} of ${liveRuns} |\n`;
out += '\n#### Third-party hosts (per target)\n\n| Target and host | Requests | KB | Runs | Paths |\n|---|---|---|---|---|\n';
for (const [h, e] of Object.entries(S.thirdParty)) out += `| ${h} | ${e.requests} | ${e.kb} | ${e.runs} | ${e.paths.join('<br>')} |\n`;
out += '\n#### Requests answered with HTML instead of the asset\n\n| Path | Times seen |\n|---|---|\n';
const html = {};
for (const [k, n] of Object.entries(S.htmlAsAsset)) { const p = k.replace(/ \[.*$/, ''); html[p] = (html[p] || 0) + n; }
for (const [p, n] of Object.entries(html).sort((a, b) => b[1] - a[1])) out += `| \`${p}\` | ${n} |\n`;
process.stdout.write(out);
