// Local presentation server: actual Apps Script business logic, simulated Google
// services, fictional records only. Never connects to Google, email, or a printer.
import http from 'node:http';
import { designDemoAsset } from './print_lab_review_page.mjs';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER, STUDENT } from '../tests/helpers/school_rewards_repository.js';

const portal = readFileSync(new URL('../apps_script/school_rewards/Portal.html', import.meta.url), 'utf8');
const identities = { admin: ADMIN, staff: STAFF, cashier: CASHIER, student: STUDENT };
const allowed = new Set([
  'getSchoolRewardsBootstrap', 'getSchoolRewardsPrintBootstrap', 'setSchoolRewardsLanguage',
  'awardSchoolRewardsPoints', 'awardSchoolRewardsPointsBatch', 'reverseSchoolRewardsEntry',
  'checkoutSchoolRewardsOrder', 'refundSchoolRewardsOrder', 'getSchoolRewardsIntegrityReport',
  'getSchoolRewardsReconciliation', 'verifySchoolRewardsAuditChain', 'getSchoolRewardsCapacity',
  'adminUpdateRewardsSettings', 'adminUpsertRewardsWindow', 'adminUpsertRewardsCatalogItem',
  'createSchoolRewardsPrintModel', 'uploadSchoolRewardsPrintAsset', 'getSchoolRewardsPrintAssetForReview',
  'reviewSchoolRewardsPrintAsset', 'submitSchoolRewardsPrintRequest', 'resubmitSchoolRewardsPrintRequest',
  'reviewSchoolRewardsPrintRequest', 'confirmSchoolRewardsPrintQuote', 'advanceSchoolRewardsPrintRequest',
  'cancelSchoolRewardsPrintRequest', 'fulfillSchoolRewardsPrintRequest', 'refundSchoolRewardsPrintRequest',
  'submitSchoolRewardsPrintPublication', 'reviewSchoolRewardsPrintPublication', 'remixSchoolRewardsPrintModel',
  'getSchoolRewardsPrintRemixStatus', 'recoverSchoolRewardsPrintRemix', 'recoverSchoolRewardsOperation',
]);

function seed() {
  const repo = harness(), student = setup(repo), category = seededCategory(repo);
  repo.call('adminUpdateRewardsSettings', { printLabEnabled: true });
  repo.call('awardSchoolRewardsPoints', { studentId: student.id, categoryId: category.id, amount: 60, reason: 'Fictional design-project recognition', idempotencyKey: 'demo_starting_points' });
  repo.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', description: 'Fictional store prize', cost: 10, inventoryLimit: 5, idempotencyKey: 'demo_notebook_catalog' });
  [
    { name: 'Sticker pack', description: 'A colorful collection for your notebook or project folder.', cost: 5, inventoryLimit: 24 },
    { name: 'Sketching set', description: 'Pencils and a sketch pad for your next creative idea.', cost: 30, inventoryLimit: 8 },
    { name: 'Creative studio time', description: 'Choose a supervised creative activity with your teacher.', cost: 45, inventoryLimit: -1 },
    { name: 'Art supply bundle', description: 'A special collection of drawing and making supplies to save toward.', cost: 90, inventoryLimit: 3 },
    { name: 'Puzzle pack', description: 'A small set of hands-on puzzles. Check back for the next restock.', cost: 25, inventoryLimit: 0 }
  ].forEach((item, index) => repo.call('adminUpsertRewardsCatalogItem', { ...item, idempotencyKey: 'demo_catalog_extra_' + index }));
  repo.call('adminUpsertRewardsWindow', { name: 'Admin demo shopping window', status: 'OPEN' });
  return repo;
}

// A closed tetrahedron exercises the real handoff hash, upload and asset review.
const sampleStl = Buffer.from(`solid demo_token
facet normal 0 0 -1
outer loop
vertex 0 0 0
vertex 0 20 0
vertex 20 0 0
endloop
endfacet
facet normal 0 -1 0
outer loop
vertex 0 0 0
vertex 20 0 0
vertex 0 0 20
endloop
endfacet
facet normal -1 0 0
outer loop
vertex 0 0 0
vertex 0 0 20
vertex 0 20 0
endloop
endfacet
facet normal 1 1 1
outer loop
vertex 20 0 0
vertex 0 20 0
vertex 0 0 20
endloop
endfacet
endsolid demo_token
`);

const toolbar = `<aside class="demo-bar" aria-label="Local admin demo">
<strong>Fictional admin demo</strong><span>Memory only. Email and printing are simulated.</span>
<label>Demo role <select id="demo-role"><option value="staff">Staff</option><option value="student">Student</option><option value="cashier">Cashier</option><option value="admin">Administrator</option></select></label>
<a href="/design">Try design and material planning</a>
<button type="button" id="demo-reset">Reset fictional records</button>
<details id="demo-guide"><summary>Store + Print Lab walkthrough</summary><ol>
<li><strong>Staff:</strong> award Avery 20 points with feedback. The starting balance of 60 becomes 80.</li>
<li><strong>Student:</strong> show the balance and activity. Open Print Lab, choose the downloaded review handoff and matching STL, then submit the private request.</li>
<li><strong>Staff:</strong> open Print Lab, download the uploaded model, inspect it locally, and record asset review evidence. Approve a 15-point quote with a future deadline; use fictional estimates of 2 g and 20 minutes.</li>
<li><strong>Student:</strong> confirm the quote. Balance stays 80; 15 are reserved and 65 are available.</li>
<li><strong>Cashier:</strong> buy one Notebook for Avery for 10 points. Balance is 70, with 15 reserved and 55 available.</li>
<li><strong>Staff:</strong> add the request to the queue, record printing, mark ready, and fulfill. Balance is 55 and the reservation clears. No printer command is sent.</li>
<li><strong>Administrator:</strong> refund the fulfilled print (balance 70), show the 4 notebooks remaining, and run the integrity report.</li>
</ol><p>Prepare the two files in Print Lab using the sample below: import the STL, keep 1 mm per unit, run Preflight, and download a review handoff. For a quicker demo, use the ready-made handoff.</p>
<p><a href="/sample.stl" download="admin-demo-token.stl">Download sample STL</a> · <a href="/sample-handoff.json" download="admin-demo-token.alloflow-print.json">Download matching review handoff</a></p>
<p>The role selector is a simulator. Real Google sign-in, deployment sharing, mail delivery and printer operation require a separate live acceptance check.</p></details></aside>`;

function html() {
  const bridge = `<script>
  var demoRole=new URL(location.href).searchParams.get('role')||'staff';
  if(!['admin','staff','cashier','student'].includes(demoRole))demoRole='staff';
  document.getElementById('demo-role').value=demoRole;
  document.getElementById('demo-role').onchange=function(){location.href='/?role='+encodeURIComponent(this.value)};
  document.getElementById('demo-reset').onclick=async function(){if(!confirm('Reset only the fictional demo records?'))return;var r=await fetch('/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok){sessionStorage.clear();location.reload()}else alert('Demo reset failed. Please try again.')};
  var script={};Object.defineProperty(script,'run',{get:function(){var success,failure,runner;runner=new Proxy({},{get:function(_,name){if(name==='withSuccessHandler')return function(fn){success=fn;return runner};if(name==='withFailureHandler')return function(fn){failure=fn;return runner};return function(argument){fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:demoRole,name:name,argument:argument})}).then(function(r){return r.json()}).then(function(out){if(!out.ok){var e=new Error(out.error);e.code=out.code;throw e}success(out.result)}).catch(function(e){if(failure)failure(e)})}}});return runner}});window.google={script:script};
  </script>`;
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>School Store + Print Lab — Local Admin Demo</title><style>.demo-bar{font:15px/1.5 system-ui,sans-serif;padding:16px 24px;background:#12344a;color:#fff;display:flex;flex-wrap:wrap;gap:12px;align-items:center}.demo-bar label{color:#fff}.demo-bar select,.demo-bar button{min-height:44px;border-radius:6px;padding:6px 12px;background:#fff;color:#12344a;border:1px solid #bacbd7}.demo-bar details{width:100%}.demo-bar summary{cursor:pointer;font-weight:700;min-height:32px}.demo-bar a{color:#bae6fd;text-decoration:underline}.demo-bar li{margin:6px 0}@media(forced-colors:active){.demo-bar{background:Canvas;color:CanvasText;border:1px solid CanvasText}.demo-bar a{color:LinkText}}</style></head><body>' + toolbar + bridge + portal + '</body></html>';
}

export async function createDemoServer({ port = 0 } = {}) {
  let repo = seed();
  // Use the same serializer and preflight as Print Lab; no hand-written payload.
  const vm = await import('node:vm');
  const { webcrypto } = await import('node:crypto');
  const sandbox = { window: { crypto: webcrypto }, crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, Blob, console };
  vm.runInNewContext(readFileSync(new URL('../printable_model_module.js', import.meta.url), 'utf8'), sandbox);
  const printable = sandbox.window.AlloModules.PrintableModel;
  const report = printable.inspectStl(sampleStl, 1);
  if (report.status !== 'PASS') throw new Error('The demo STL failed Print Lab preflight');
  const handoffJson = printable.serializeSubmission({
    title: 'Admin demo token', sourceFormat: 'STL', originalFilename: 'admin-demo-token.stl',
    contentHash: await printable.sha256Hex(sampleStl), unitDeclaration: '1 source unit = 1 mm',
    preflight: report, aiUse: 'NONE', createdAt: new Date().toISOString()
  });
  if (!/^[a-f0-9]{64}$/.test(JSON.parse(handoffJson).contentHash)) throw new Error('The demo handoff is missing its SHA-256 hash');
  const server = http.createServer(async (req, res) => {
    const host = '127.0.0.1:' + server.address().port;
    if (req.headers.host !== host) { res.writeHead(403); res.end('Local demo host required'); return; }
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    const url = new URL(req.url, 'http://' + host);
    if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    if (req.method === 'GET' && (url.pathname === '/design' || url.pathname.startsWith('/design/'))) {
      try { const asset = designDemoAsset(url.pathname); if (asset) { res.writeHead(200, { 'Content-Type': asset.type + '; charset=utf-8' }); res.end(asset.content); return; } }
      catch { json(503, { ok: false, error: 'Build the local tool-preview stylesheet before opening the design demo.' }); return; }
      json(404, { ok: false, error: 'Not found' }); return;
    }
    if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html()); return; }
    if (req.method === 'GET' && ['/sample.stl', '/sample-handoff.json'].includes(url.pathname)) {
      res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.stl') ? 'model/stl' : 'application/json', 'Content-Disposition': 'attachment' });
      res.end(url.pathname.endsWith('.stl') ? sampleStl : handoffJson); return;
    }
    if (req.method !== 'POST' || !['/rpc', '/reset'].includes(url.pathname)) { json(404, { ok: false, error: 'Not found' }); return; }
    if (req.headers.origin !== 'http://' + host || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) { json(403, { ok: false, error: 'Use the local demo page' }); return; }
    try {
      let size = 0, chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 6 * 1024 * 1024) { json(413, { ok: false, error: 'Demo request is too large' }); return; } chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (url.pathname === '/reset') { repo = seed(); json(200, { ok: true }); return; }
      if (!Object.hasOwn(identities, input.role) || !allowed.has(input.name)) { json(403, { ok: false, error: 'This action is unavailable in the demo' }); return; }
      repo.setActive(identities[input.role]);
      json(200, { ok: true, result: repo.call(input.name, input.argument) });
    } catch (error) { json(400, { ok: false, code: error.code || 'demo_error', error: error.message }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: 'http://127.0.0.1:' + server.address().port };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, url } = await createDemoServer({ port: Number(process.env.SCHOOL_STORE_DEMO_PORT || 8767) });
  console.log('Fictional School Store + Print Lab demo: ' + url);
  console.log('Actual store logic with in-memory Google substitutes. No real mail, records, or printer access. Ctrl+C stops it.');
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}
