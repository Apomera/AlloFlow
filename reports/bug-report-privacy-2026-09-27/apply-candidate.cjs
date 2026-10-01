const fs=require('fs'),path=require('path');
const root=process.cwd(), candidate=path.join(root,'candidate');
const read=f=>fs.readFileSync(path.join(candidate,f),'utf8').replace(/\r\n/g,'\n');
const write=(f,s)=>fs.writeFileSync(path.join(candidate,f),s);
function once(s,a,b){if(s.split(a).length!==2)throw Error('Expected single anchor: '+a.slice(0,100));return s.replace(a,b);}
let client=read('error_reporter_module.js');
const start=client.indexOf('  // ── Google Form configuration');
const end=client.indexOf('  var STORAGE_KEY',start);
if(start<0||end<0)throw Error('Client configuration anchors missing');
client=client.slice(0,start)+fs.readFileSync(path.join(root,'client-addition.txt'),'utf8')+client.slice(end);
client=once(client,' * In-app error capture + one-click bug report. Solves the problem that',' * In-app error capture + reviewed district bug reporting. Solves the problem that');
client=once(client,' * - "Send to Developers" pre-fills a Google Form with the report and opens it\n *   in a new tab so the user reviews before submitting (privacy-respecting\n *   — no silent fetch).',' * - External reporting is disabled unless a district gateway is configured.\n * - Reports contain only reviewed, manually entered fields; captured logs stay local.\n * - Submission failures never fall back to another destination.');
client=client.replace(/  function buildPrefilledFormUrl\(\) \{[\s\S]*?\n  \}\n/,'');
client=once(client,'  function panelHtml() {','  function panelHtml() {\n    if (reportDraft) return reportDraftHtml();');
client=once(client,"          'The form opens in a new tab pre-filled with this log. You can edit it before submitting.' +","          'Review a separate report for district support. Captured logs are not attached.' +");
client=client.replaceAll('📬 Send to Developers','Review a report');
client=once(client,"'. Send to the developers with one click.'","'. Captured logs remain local unless you copy them.'");
client=once(client,'  function closePanel() {','  function closePanel() {\n    if (reportDraft) { reportDraft.controller.abort(); reportDraft = null; }');
client=once(client,'  function refreshPanelIfOpen() {\n    if (!panel) return;','  function refreshPanelIfOpen() {\n    if (!panel || reportDraft) return;');
client=once(client,'  function wirePanelHandlers() {','  function wirePanelHandlers() {\n    if (reportDraft) { wireReportDraft(); return; }');
const sendStart=client.indexOf("    if ($('aer-send')) $('aer-send').onclick = function () {");
const publicApi=client.indexOf('  // ── Public API',sendStart);
if(sendStart<0||publicApi<0)throw Error('send anchors missing');
client=client.slice(0,sendStart)+"    if ($('aer-send')) $('aer-send').onclick = startReportDraft;\n  }\n\n"+client.slice(publicApi);
client=once(client,'    renderReportDraft();\n    if (!base) return;',"    renderReportDraft();\n    var close = document.getElementById('aer-report-close');\n    if (close) close.focus();\n    if (!base) return;");
write('error_reporter_module.js',client);
write('desktop/web-app/public/error_reporter_module.js',client);

let worker=read('catalog/cloudflare-worker/src/index.js');
worker="import { handleBugReports } from './bug-reports.js';\n\n"+worker;
const oldBug=worker.indexOf('// ── Bug reports → Cloudflare KV');
const pd=worker.indexOf('// ── PD module submissions',oldBug);
worker=worker.slice(0,oldBug)+worker.slice(pd);
const handlers=worker.indexOf('async function handleBugSubmit(');
const afterHandlers=worker.indexOf('async function handlePdList(',handlers);
worker=worker.slice(0,handlers)+worker.slice(afterHandlers);
worker=once(worker,'    const url = new URL(request.url);\n\n    if (request.method === \'OPTIONS\')', "    const url = new URL(request.url);\n    if (url.pathname === '/submitBug' || url.pathname === '/bug-report-policy' || url.pathname === '/bugs' || url.pathname.startsWith('/bugs/')) {\n      return handleBugReports(request, env, url);\n    }\n\n    if (request.method === 'OPTIONS')");
worker=worker.replace(/    if \(request.method === 'POST' && url.pathname === '\/submitBug'\) \{\n      return handleBugSubmit\(request, env\);\n    \}\n\n/,'');
worker=worker.replace(/    if \(request.method === 'GET' && url.pathname === '\/bugs'\) \{\n      return handleBugList\(request, env, url\);\n    \}\n\n/,'');
worker=worker.replace(' *   GET  /bugs              token-gated bug-report reader',' *   GET  /bugs              district-scoped report metadata (individual read credential)\n *   GET, DELETE /bugs/:id    audited report read / deletion request\n *   GET /bug-report-policy  current policy for the authenticated district gateway');
write('catalog/cloudflare-worker/src/index.js',worker);

let oldTests=read('tests/error_reporter_stale_entries_and_secrets.test.js');
const helperStart=oldTests.indexOf('function reportOf(w) {');
const helperEnd=oldTests.indexOf("\n}\n",helperStart)+3;
oldTests=oldTests.slice(0,helperStart)+
"function reportOf(w) {\n  // Inspect the explicit local Copy log action. External submission is separately\n  // covered by error_reporter_privacy.test.js and never attaches this payload.\n  let copied = '';\n  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: text => { copied = text; return Promise.resolve(); } } });\n  w.AlloModules.ErrorReporter.openPanel('errors');\n  w.document.getElementById('aer-copy').click();\n  const steps = copied.split('Context:\\n'.replace('\\n', '\\\\n')); // replaced below\n  const context = copied.slice(copied.indexOf('Context:\\\\n') + 9, copied.indexOf('\\\\n\\\\nLog:'));\n  return { what: copied.slice(copied.indexOf('Log:\\\\n') + 5), steps: context, url: context.split('\\\\n')[0].slice(5) };\n}\n".replace("  const steps = copied.split('Context:\\n'.replace('\\n', '\\\\n')); // replaced below\n",'').replaceAll('\\\\n','\\n')+oldTests.slice(helperEnd);
oldTests=oldTests.replace('the live-session join secret never leaves the page','local diagnostic exports redact live-session join secrets').replace('is scrubbed from new entries, the report, and the worker payload','is scrubbed from new entries and explicit local log exports');
write('tests/error_reporter_stale_entries_and_secrets.test.js',oldTests);
let tts=read('tests/error_reporter_tts_tab.test.js').replace('Send-to-Developers payload carries identity + both trace tails','explicit local Copy log retains identity + both trace tails').replace('    // The report body is what reaches the bug form/worker — drive it via the\n    // Copy log button, which renders the same payload.','    // Raw diagnostics remain available through explicit local Copy log;\n    // the district submission flow never attaches them.');
write('tests/error_reporter_tts_tab.test.js',tts);

let smoke=read('catalog/cloudflare-worker/smoke_test.mjs');
const smokeStart=smoke.indexOf('  // 11. missing KV binding');
const smokeEnd=smoke.indexOf('  // ── /submit (lessons)',smokeStart);
smoke=smoke.slice(0,smokeStart)+
"  // Bug reporting now fails closed; full governance paths have focused tests.\n  r = await worker.fetch(jsonPost('/submitBug', { what: 'legacy log' }), ENVKV);\n  ok(r.status === 503, '/submitBug disabled without governance');\n  r = await worker.fetch(req('/bugs?token=legacy'), { ...ENVKV, ADMIN_TOKEN: 'legacy' });\n  ok(r.status === 401, '/bugs rejects query-string credentials');\n  ok(kvStore.size === 0, 'unconfigured bug reporting stores nothing');\n\n"+smoke.slice(smokeEnd);
write('catalog/cloudflare-worker/smoke_test.mjs',smoke);
console.log('Applied privacy changes to isolated candidate only.');

