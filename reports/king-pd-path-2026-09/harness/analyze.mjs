// Aggregate K4 runs: median + range per (target, net, flow). Every number here is
// read from the in-page timeline (performance.now() since navigation start).
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'C:/tmp/alloflow_dispatch/wave1/K4_scratch/runs';
const OUTJ = process.argv[3] || path.join(DIR, '..', 'summary.json');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('FAIL') && /^(live|local)-/.test(f) && !f.includes('-shots'));
const runs = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

const s = (ms) => (ms == null || Number.isNaN(ms) ? null : Math.round(ms / 100) / 10);
const median = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const range = (a) => { const v = a.filter((x) => x != null); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
const firstHost = (u) => { try { return new URL(u).host; } catch (_) { return '?'; } };
const APP_HOSTS = new Set(['alloflow-cdn.pages.dev', '127.0.0.1:3000']);

function perRun(r) {
  const K = r.K || {}; const m = K.marks || {}; const hits = K.hits || {}; const mods = K.mods || {};
  const clickAt = (step, last = false) => { const e = r.harness.filter((h) => h[0] === step); const x = last ? e[e.length - 1] : e[0]; return x ? x[2] : null; };
  const clicks = r.harness.filter((h) => !/:file-picked$/.test(h[0]));
  const picks = r.harness.filter((h) => /:file-picked$/.test(h[0]));
  const bugSteps = ['retry-open-menu', 'retry-load-same-file', 'retry2-open-menu', 'retry-load-renamed-file', 'station-tool-button', 'pack-link-retry'];
  const extra = clicks.filter((h) => bugSteps.includes(h[0])).length;
  const extraPicks = picks.filter((h) => /^retry/.test(h[0])).length;
  const wsReady = r.flow === 'teacher' ? (hits['history-tab'] || [])[0] : (hits['load-project'] || [])[0];
  const q = K.queue || [];
  const wsAt = m.workspace || 0;
  const drained = (q.find((e) => e[0] > wsAt && e[1] === 0) || [])[0] ?? null;
  const queuePeak = q.reduce((a, e) => Math.max(a, e[1]), 0);
  const lt = K.longtasks || [];
  const ltBetween = (a, b) => lt.filter((x) => x[0] >= a && x[0] < b);
  const fpClick = clickAt('full-platform');
  const afterFP = fpClick != null ? ltBetween(fpClick, (m.role_gate || fpClick) + 1) : [];
  const toolClick = clickAt('station-tool-button');
  const linkClick = clickAt('pack-link', true);
  const load1 = clickAt('load-project');
  const lastChange = (K.changes || []).length ? K.changes[K.changes.length - 1][0] : null;
  const endAt = m.tool_content ?? null;
  const reqs = r.requests || [];
  const before = (t) => reqs; // request wall times are harness-relative; totals are per whole run
  const bytesBy = {};
  for (const q2 of reqs) { const h = firstHost(q2.url); bytesBy[h] = (bytesBy[h] || 0) + (q2.bytes || 0); }
  const totalBytes = reqs.reduce((a, q2) => a + (q2.bytes || 0), 0);
  const htmlAsAsset = reqs.filter((q2) => q2.type !== 'document' && /text\/html/.test(q2.ct || '')).map((q2) => q2.url.replace(/^https?:\/\/[^/]+/, '') + ' [' + q2.type + ', ' + q2.body + ' B]');
  const failedReq = reqs.filter((q2) => !q2.ok || q2.status >= 400).map((q2) => (q2.failure || q2.status) + ' ' + q2.url);
  const thirdParty = reqs.filter((q2) => !APP_HOSTS.has(firstHost(q2.url)) && !/^(data|blob):/.test(q2.url));
  const leaksToLive = r.target === 'local' ? reqs.filter((q2) => firstHost(q2.url) === 'alloflow-cdn.pages.dev') : [];
  const heavy = reqs.filter((q2) => (q2.body || 0) > 150000).map((q2) => ({ path: q2.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0], host: firstHost(q2.url), kb: Math.round(q2.body / 1024), type: q2.type }));
  const res = (r.perf && r.perf.res) || [];
  const miscRes = res.find((e) => /misc_handlers_module/.test(e.name));
  const toolRes = res.find((e) => /sel_tool_crewprotocols/.test(e.name));
  const calib = median(r.calibMs || []);
  // Driver latency: how long after a control became clickable the harness clicked it.
  const overhead = clicks.reduce((a, h) => { const hit = hits[h[0]]; return a + (hit && h[2] >= hit[0] ? h[2] - hit[0] : 0); }, 0);
  const belowFold = Object.entries(hits).filter(([, v]) => v[1] === 'below-fold').map(([k]) => k);
  const packParse = (m.pack_loaded != null && lastChange != null) ? m.pack_loaded - lastChange : null;
  const miscFetch = miscRes ? miscRes.end - miscRes.start : null;
  // Projections (estimates from THIS run's measured durations, labelled as such in the report):
  // A: Load Project waits for / promotes its handler module instead of throwing.
  const packFixed = (load1 != null && miscFetch != null && packParse != null) ? load1 + miscFetch + packParse : null;
  // B: a pack link requests the tool module itself instead of waiting out the 20 s TTL.
  const toolLoad = (toolClick != null && endAt != null) ? endAt - toolClick : null;
  const gotit = clickAt('hub-got-it');
  const toolFixedAfterHub = (toolLoad != null) ? Math.max(0, toolLoad) : null;
  return {
    tag: r.tag, target: r.target, net: r.net, flow: r.flow, run: r.run, failure: r.failure, notes: r.notes,
    whatif: (r.whatif || []).join('+'), stringsAt: K.stringsAt ?? null, launchpadDom: m.launchpad ?? null,
    cpuLoad: r.cpuLoadAtStart, calibMs: calib, harnessOverheadMs: overhead, belowFold,
    toolContentMinusOverhead: m.tool_content != null ? m.tool_content - overhead : null,
    rootChild: m.root_child ?? null, domInteractive: r.perf && r.perf.nav ? r.perf.nav.domInteractive : null,
    // The watchdog tick that first sees #root children hides the loader AND (no return)
    // still injects the button when elapsed > 20 s, so "injected" != "seen".
    clearAllInjected: m.clear_all_data != null,
    clearAllShown: m.clear_all_data != null && (m.loader_hidden == null || m.clear_all_data < m.loader_hidden), clearAllMarginMs: (m.root_child != null && r.perf && r.perf.nav) ? (r.perf.nav.domInteractive + 20000) - m.root_child : null,
    fcp: r.perf && r.perf.paints ? r.perf.paints['first-contentful-paint'] ?? null : null,
    launchpad: (hits['full-platform'] || [])[0] ?? m.launchpad ?? null,
    fullPlatformClick: fpClick, roleGate: m.role_gate ?? null, fullPlatformToRoleGate: (m.role_gate != null && fpClick != null) ? m.role_gate - fpClick : null,
    fullPlatformLongTaskMs: afterFP.reduce((a, x) => a + x[1], 0),
    workspaceReady: wsReady ?? null,
    loadItemReady: (hits['load-project'] || [])[0] ?? null, loadAttempt1: load1,
    loadAttempts: r.outcome && r.outcome.load ? r.outcome.load.attempts : null,
    sameFileRetryWorked: r.outcome && r.outcome.load ? r.outcome.load.sameFileRetryWorked ?? null : null,
    miscReady: mods.MiscHandlers ?? null, selHubReady: mods.SelHub ?? null,
    loadMissingWindowMs: (mods.MiscHandlers != null && m.load_item != null) ? mods.MiscHandlers - (m.load_item || m.codename_modal) : (mods.MiscHandlers != null && m.codename_modal != null ? mods.MiscHandlers - m.codename_modal : null),
    packLoaded: m.pack_loaded ?? null, packParseMs: packParse, miscFetchMs: miscFetch,
    directionsLink: m.directions_link ?? null, linkClick, hubOpen: m.selhub_open ?? null, gotItShown: m.selhub_gotit != null,
    stationStarted: m.station_started ?? null, toastUnavailable: m.toast_tool_unavailable ?? null,
    linkDeadMs: (m.station_started != null && linkClick != null) ? m.station_started - linkClick : null,
    toolLinkOpened: r.outcome && r.outcome.tool ? r.outcome.tool.linkOpenedTool : null,
    linkDeadClicks: r.outcome && r.outcome.tool ? r.outcome.tool.deadClicks : null,
    toolRequestedBeforeFallback: r.outcome && r.outcome.tool ? (r.outcome.tool.toolReqBeforeFallback || []).length > 0 : null,
    toolClick, toolLoadMs: toolLoad, toolContent: endAt,
    clicks: clicks.length, filePicks: picks.length, extraClicks: extra, extraFilePicks: extraPicks,
    queueDrained: drained, queuePeak,
    packLoadedFixedEst: packFixed, packSavingEst: (packFixed != null && m.pack_loaded != null) ? m.pack_loaded - packFixed : null,
    linkSavingEst: (m.station_started != null && gotit != null && toolLoad != null) ? (endAt - ((gotit) + toolLoad)) : null,
    totalBytes, bytesBy, htmlAsAsset, failedReq, heavy,
    thirdParty: thirdParty.map((q2) => ({ host: firstHost(q2.url), path: q2.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 90), status: q2.status, type: q2.type, bytes: q2.body, ok: q2.ok })),
    leaksToLive: leaksToLive.map((q2) => q2.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] + ' ' + Math.round((q2.body || 0) / 1024) + ' KB'),
    pageErrors: (r.pageErrors || []).map((e) => e[1]),
    toolRes: toolRes || null,
  };
}

const rows = runs.map(perRun).sort((a, b) => a.tag.localeCompare(b.tag));
const groups = {};
for (const row of rows) { const k = `${row.target}|${row.net}|${row.flow}${row.whatif ? '|whatif' : ''}`; (groups[k] = groups[k] || []).push(row); }
const METRICS = ['stringsAt', 'launchpadDom', 'harnessOverheadMs', 'toolContentMinusOverhead', 'launchpad', 'fullPlatformToRoleGate', 'fullPlatformLongTaskMs', 'workspaceReady', 'loadAttempt1', 'miscReady', 'loadMissingWindowMs', 'packLoaded', 'hubOpen', 'stationStarted', 'linkDeadMs', 'toolLoadMs', 'toolContent', 'clicks', 'filePicks', 'extraClicks', 'queueDrained', 'selHubReady', 'rootChild', 'clearAllMarginMs', 'totalBytes', 'calibMs', 'packSavingEst', 'linkSavingEst', 'fcp'];
const agg = {};
for (const [k, all] of Object.entries(groups)) {
  // End-to-end medians use completed runs only; driver timeouts are listed, not averaged.
  const list = all.filter((x) => !x.failure);
  const o = { n: list.length, failures: all.filter((x) => x.failure).map((x) => x.tag + ': ' + x.failure.slice(0, 120)) };
  for (const mtr of METRICS) { const vals = list.map((x) => x[mtr]); o[mtr] = { median: median(vals), range: range(vals) }; }
  o.clearAllShown = list.filter((x) => x.clearAllShown).length;
  o.clearAllInjected = list.filter((x) => x.clearAllInjected).length;
  o.sameFileRetryWorked = list.map((x) => x.sameFileRetryWorked);
  o.toolLinkOpened = list.map((x) => x.toolLinkOpened);
  o.toolRequestedBeforeFallback = list.map((x) => x.toolRequestedBeforeFallback);
  o.loadAttempts = list.map((x) => x.loadAttempts);
  o.cpuLoad = list.map((x) => x.cpuLoad);
  agg[k] = o;
}
// Domain + 404-as-HTML inventory across baseline runs (what-if runs block/serve files on purpose).
const third = {}; const html = {}; const leaks = {}; const heavy = {}; const failed = {};
for (const row of rows.filter((x) => !x.whatif)) {
  for (const t of row.thirdParty) { const e = third[row.target + ' ' + t.host] = third[row.target + ' ' + t.host] || { requests: 0, bytes: 0, paths: new Set(), statuses: new Set(), runs: new Set() }; e.requests++; e.bytes += t.bytes || 0; e.paths.add(t.path.split('?')[0]); e.statuses.add(t.ok ? t.status : 'failed'); e.runs.add(row.tag); }
  for (const h of row.htmlAsAsset) { const key = h.replace(/\?.*? \[/, ' ['); html[key] = (html[key] || 0) + 1; }
  for (const l of row.leaksToLive) leaks[l.split(' ')[0]] = l;
  for (const h of row.heavy) { const key = h.host + h.path; heavy[key] = heavy[key] || { ...h, runs: 0 }; heavy[key].runs++; }
  for (const f of row.failedReq) failed[f.replace(/\?.*$/, '')] = (failed[f.replace(/\?.*$/, '')] || 0) + 1;
}
const thirdOut = Object.fromEntries(Object.entries(third).map(([h, e]) => [h, { requests: e.requests, kb: Math.round(e.bytes / 1024), statuses: [...e.statuses], runs: e.runs.size, paths: [...e.paths].slice(0, 12) }]));
const out = { generatedAt: new Date().toISOString(), runs: rows.length, agg, rows, thirdParty: thirdOut, htmlAsAsset: html, leaksToLive: leaks, heavy: Object.values(heavy).sort((a, b) => b.kb - a.kb), failedRequests: failed };
fs.writeFileSync(OUTJ, JSON.stringify(out, null, 1));

// Console table.
const fmt = (o, mtr, scale = 'ms') => { const v = o[mtr]; if (!v || v.median == null) return '-'; if (scale === 'n') return `${v.median} [${v.range[0]}-${v.range[1]}]`; if (scale === 'kb') return `${Math.round(v.median / 1024)} [${Math.round(v.range[0] / 1024)}-${Math.round(v.range[1] / 1024)}]`; return `${s(v.median)} [${s(v.range[0])}-${s(v.range[1])}]`; };
for (const [k, o] of Object.entries(agg).sort()) {
  console.log(`\n## ${k}  n=${o.n}  failures=${o.failures.length}  cpuLoad=${o.cpuLoad}  clearAllShown=${o.clearAllShown} injected=${o.clearAllInjected}`);
  for (const mtr of METRICS) console.log(`  ${mtr.padEnd(24)} ${fmt(o, mtr, ['clicks', 'filePicks', 'extraClicks'].includes(mtr) ? 'n' : mtr === 'totalBytes' ? 'kb' : 'ms')}`);
  console.log('  sameFileRetryWorked', o.sameFileRetryWorked, ' toolLinkOpened', o.toolLinkOpened, ' toolReqBeforeFallback', o.toolRequestedBeforeFallback, ' loadAttempts', o.loadAttempts);
}
console.log('\nthird-party:', JSON.stringify(thirdOut, null, 1));
console.log('\nhtml-as-asset:', JSON.stringify(html, null, 1));
console.log('\nleaks-to-live (local runs):', Object.keys(leaks));
console.log('\nheavy (>150 KB):', out.heavy.map((h) => `${h.host}${h.path} ${h.kb} KB x${h.runs}`).join('\n  '));
console.log('\nfailed:', JSON.stringify(failed, null, 1));
