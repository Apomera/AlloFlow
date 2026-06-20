// Smoke test for the catalog/translation submission worker. No network: the GitHub-commit
// fetch is mocked. Exercises routing, validation, the /submitTranslation happy path (asserts the
// committed record + target path), PII detection, and a /submit regression check.
//   run: node smoke_test.mjs   (or: npm test)
import worker from './src/index.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
const req = (path, opts = {}) => new Request('https://w.example' + path, opts);
const jsonPost = (path, body) => req(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ENV = { GITHUB_PAT: 'fake-pat', GITHUB_OWNER: 'Apomera', GITHUB_REPO: 'AlloFlow', GITHUB_BRANCH: 'main' };

// Mock global fetch (the worker's GitHub commit). Capture the last call for assertions.
let lastGh = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { lastGh = { url: String(url), init }; return new Response(JSON.stringify({ content: { path: 'ok' } }), { status: 201 }); };

const run = async () => {
  // 1. CORS preflight
  let r = await worker.fetch(req('/submitTranslation', { method: 'OPTIONS' }), ENV);
  ok(r.status === 204, 'OPTIONS → 204 (got ' + r.status + ')');

  // 2. health probe
  r = await worker.fetch(req('/healthz'), ENV);
  ok(r.status === 200, '/healthz → 200');

  // 3. missing PAT → 500
  r = await worker.fetch(jsonPost('/submitTranslation', { language: 'Greek', suggested: 'X' }), {});
  ok(r.status === 500, 'no GITHUB_PAT → 500 (got ' + r.status + ')');

  // 4. wrong content-type → 415
  r = await worker.fetch(req('/submitTranslation', { method: 'POST', body: 'x' }), ENV);
  ok(r.status === 415, 'non-JSON content-type → 415 (got ' + r.status + ')');

  // 5. validation: missing suggested → 400
  r = await worker.fetch(jsonPost('/submitTranslation', { language: 'Greek' }), ENV);
  ok(r.status === 400, 'missing suggested → 400 (got ' + r.status + ')');

  // 6. validation: missing language → 400
  r = await worker.fetch(jsonPost('/submitTranslation', { suggested: 'X' }), ENV);
  ok(r.status === 400, 'missing language → 400 (got ' + r.status + ')');

  // 7. happy path → 201 + correct commit
  lastGh = null;
  r = await worker.fetch(jsonPost('/submitTranslation', {
    language: 'Greek', key: 'common.save', current: 'Save', suggested: 'Αποθήκευση', english: 'Save', note: 'better',
  }), ENV);
  ok(r.status === 201, 'valid submitTranslation → 201 (got ' + r.status + ')');
  const body = await r.json();
  ok(body.ok === true && body.language === 'Greek', 'response ok:true + language echoed');
  ok(lastGh && /\/contents\/translations\/pending\/\d+-greek-common-save\.json$/.test(lastGh.url), 'commits to translations/pending/<ts>-greek-common-save.json');
  const committed = JSON.parse(Buffer.from(JSON.parse(lastGh.init.body).content, 'base64').toString('utf8'));
  ok(committed.kind === 'translation_correction' && committed.suggested === 'Αποθήκευση' && committed.key === 'common.save', 'committed record shape correct');

  // 8. PII detection still flags (mock commit ok) — email in suggestion
  r = await worker.fetch(jsonPost('/submitTranslation', { language: 'Greek', suggested: 'email me at a@b.com' }), ENV);
  const pbody = await r.json();
  ok(r.status === 201 && pbody.pii_findings_count >= 1, 'PII (email) detected → pii_findings_count >= 1');

  // 9. regression: /submit (lessons) still validates — bad body → 400, not 404/405
  r = await worker.fetch(jsonPost('/submit', { nope: true }), ENV);
  ok(r.status === 400, '/submit still reachable + validates → 400 (got ' + r.status + ')');

  // 10. unknown route → 405
  r = await worker.fetch(jsonPost('/nope', {}), ENV);
  ok(r.status === 405, 'unknown route → 405 (got ' + r.status + ')');

  // ── /submitBug → private KV (mock the KV binding) ──
  const kvStore = new Map();
  const KV = {
    put: async (k, v) => { kvStore.set(k, v); },
    get: async (k) => kvStore.get(k) || null,
    list: async () => ({ keys: [...kvStore.keys()].map(name => ({ name })) }),
  };
  const ENVKV = { ...ENV, BUG_REPORTS: KV };

  // 11. missing KV binding → 500
  r = await worker.fetch(jsonPost('/submitBug', { what: 'boom' }), ENV);
  ok(r.status === 500, '/submitBug without KV binding → 500 (got ' + r.status + ')');

  // 12. validation: empty report → 400
  r = await worker.fetch(jsonPost('/submitBug', { type: 'Bug Report' }), ENVKV);
  ok(r.status === 400, '/submitBug with no what/steps → 400 (got ' + r.status + ')');

  // 13. happy path → 201, stored in KV
  r = await worker.fetch(jsonPost('/submitBug', { type: 'Bug Report', what: 'TypeError at line 5', steps: 'clicked export', browser: 'UA', url: 'https://app/x' }), ENVKV);
  ok(r.status === 201, '/submitBug valid → 201 (got ' + r.status + ')');
  const bbody = await r.json();
  ok(bbody.ok === true && /^bug:\d+:/.test(bbody.id), 'returns ok + bug:<ts>:<rand> id');
  ok(kvStore.size === 1, 'report written to KV');
  const stored = JSON.parse([...kvStore.values()][0]);
  ok(stored.kind === 'bug_report' && stored.what === 'TypeError at line 5', 'stored record shape correct');

  // 14. PII flagged (does not block)
  r = await worker.fetch(jsonPost('/submitBug', { what: 'student Jamie, ssn 123-45-6789' }), ENVKV);
  const pb = await r.json();
  ok(r.status === 201 && pb.pii_findings_count >= 1, '/submitBug flags PII (SSN) → count >= 1');

  // 15. GET /bugs disabled without ADMIN_TOKEN → 501
  r = await worker.fetch(req('/bugs'), ENVKV);
  ok(r.status === 501, 'GET /bugs without ADMIN_TOKEN → 501 (got ' + r.status + ')');

  // 16. GET /bugs wrong token → 401; right token → 200 list
  const ENVADMIN = { ...ENVKV, ADMIN_TOKEN: 'sekret' };
  r = await worker.fetch(req('/bugs?token=nope'), ENVADMIN);
  ok(r.status === 401, 'GET /bugs wrong token → 401 (got ' + r.status + ')');
  r = await worker.fetch(req('/bugs?token=sekret'), ENVADMIN);
  const lb = await r.json();
  ok(r.status === 200 && lb.ok === true && lb.count === 2, 'GET /bugs valid token → 200 + lists 2 reports (got ' + r.status + '/' + (lb && lb.count) + ')');

  globalThis.fetch = realFetch;
  console.log((fail === 0 ? '✓' : '✗') + ' worker smoke: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
};
run().catch(e => { console.error(e); process.exit(1); });
