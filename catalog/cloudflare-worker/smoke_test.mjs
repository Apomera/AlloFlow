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

  // ── /submit (lessons): validation + happy path + GitHub-failure → 502 ──
  const validAff = { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true };
  const validMeta = { title: 'My Lesson', subject: 'Math', grade_level: '5' };
  const validLesson = { lesson_payload: { content: 'hello world' }, metadata: validMeta, affirmations: validAff };

  // 17. missing lesson_payload → 400
  r = await worker.fetch(jsonPost('/submit', { metadata: validMeta, affirmations: validAff }), ENV);
  ok(r.status === 400, '/submit missing lesson_payload → 400 (got ' + r.status + ')');
  // 18. unknown subject → 400
  r = await worker.fetch(jsonPost('/submit', { ...validLesson, metadata: { ...validMeta, subject: 'Underwater Basket Weaving' } }), ENV);
  ok(r.status === 400, '/submit unknown subject → 400 (got ' + r.status + ')');
  // 19. invalid license → 400
  r = await worker.fetch(jsonPost('/submit', { ...validLesson, metadata: { ...validMeta, license: 'MIT' } }), ENV);
  ok(r.status === 400, '/submit invalid license → 400 (got ' + r.status + ')');
  // 20. affirmation not true → 400
  r = await worker.fetch(jsonPost('/submit', { ...validLesson, affirmations: { ...validAff, no_pii: false } }), ENV);
  ok(r.status === 400, '/submit affirmation not true → 400 (got ' + r.status + ')');
  // 21. happy path → 201 + commit to catalog/pending + record defaults
  lastGh = null;
  r = await worker.fetch(jsonPost('/submit', validLesson), ENV);
  ok(r.status === 201, '/submit valid → 201 (got ' + r.status + ')');
  const sbody = await r.json();
  ok(sbody.ok === true && sbody.slug === 'my-lesson', '/submit returns ok + slug "my-lesson"');
  ok(lastGh && /\/contents\/catalog\/pending\/\d+-my-lesson\.json$/.test(lastGh.url), '/submit commits to catalog/pending/<ts>-my-lesson.json');
  const subRec = JSON.parse(Buffer.from(JSON.parse(lastGh.init.body).content, 'base64').toString('utf8'));
  ok(subRec.metadata.license === 'CC-BY-SA-4.0' && subRec.pii_scan.ran_server_side === true, '/submit record defaults license + records server-side PII scan');
  // 22. GitHub commit failure → 502
  globalThis.fetch = async () => new Response('forbidden', { status: 403 });
  r = await worker.fetch(jsonPost('/submit', validLesson), ENV);
  ok(r.status === 502, '/submit GitHub failure → 502 (got ' + r.status + ')');
  // restore the success mock
  globalThis.fetch = async (url, init) => { lastGh = { url: String(url), init }; return new Response(JSON.stringify({ content: { path: 'ok' } }), { status: 201 }); };

  // ── scanForPii pattern matrix (asserted via the committed /submit record) ──
  async function piiTypesFor(text) {
    lastGh = null;
    await worker.fetch(jsonPost('/submit', { lesson_payload: { content: text }, metadata: validMeta, affirmations: validAff }), ENV);
    const rec = JSON.parse(Buffer.from(JSON.parse(lastGh.init.body).content, 'base64').toString('utf8'));
    return rec.pii_scan.findings.map(f => f.type);
  }
  ok((await piiTypesFor('call us at 207-555-0143')).includes('phone (US)'), 'scanForPii detects phone (US)');
  ok((await piiTypesFor('we meet at 123 Main Street tomorrow')).includes('street address'), 'scanForPii detects street address');
  ok((await piiTypesFor('ask Dr. Jane Smith for the form')).includes('titled name'), 'scanForPii detects titled name');
  ok((await piiTypesFor('the student has ADHD and an IEP')).includes('diagnostic acronym'), 'scanForPii detects diagnostic acronym (FERPA-sensitive)');
  ok((await piiTypesFor('the mitochondria is the powerhouse of the cell')).length === 0, 'scanForPii returns no findings on clean text');

  // ── /submitPd → private PD_SUBMISSIONS KV (entirely new route) ──
  const pdKv = new Map();
  const PDKV = {
    put: async (k, v) => { pdKv.set(k, v); },
    get: async (k) => pdKv.get(k) || null,
    list: async () => ({ keys: [...pdKv.keys()].map(name => ({ name })) }),
  };
  const ENVPD = { ...ENV, PD_SUBMISSIONS: PDKV };
  const basePdModule = { kind: 'pd_module', metadata: { title: 'Trauma-Informed Basics' }, sections: [{ activities: [{ id: 'a1', type: 'read', content: { body: 'x' } }] }] };
  const validPdBody = { pd_module: basePdModule, affirmations: validAff };

  // 23. missing PD_SUBMISSIONS binding → 500
  r = await worker.fetch(jsonPost('/submitPd', validPdBody), ENV);
  ok(r.status === 500, '/submitPd without KV binding → 500 (got ' + r.status + ')');
  // 24. wrong content-type → 415
  r = await worker.fetch(req('/submitPd', { method: 'POST', body: 'x' }), ENVPD);
  ok(r.status === 415, '/submitPd non-JSON content-type → 415 (got ' + r.status + ')');
  // 25. validatePd: missing pd_module → 400
  r = await worker.fetch(jsonPost('/submitPd', { affirmations: validAff }), ENVPD);
  ok(r.status === 400, '/submitPd missing pd_module → 400');
  // 26. validatePd: wrong kind → 400
  r = await worker.fetch(jsonPost('/submitPd', { pd_module: { kind: 'x', metadata: { title: 't' }, sections: [{ activities: [] }] }, affirmations: validAff }), ENVPD);
  ok(r.status === 400, '/submitPd wrong kind → 400');
  // 27. validatePd: no sections → 400
  r = await worker.fetch(jsonPost('/submitPd', { pd_module: { kind: 'pd_module', metadata: { title: 't' }, sections: [] }, affirmations: validAff }), ENVPD);
  ok(r.status === 400, '/submitPd no sections → 400');
  // 28. validatePd: affirmation not true → 400
  r = await worker.fetch(jsonPost('/submitPd', { pd_module: basePdModule, affirmations: { ...validAff, no_pii: false } }), ENVPD);
  ok(r.status === 400, '/submitPd affirmation not true → 400');
  // 29. happy path → 201 + KV write + record shape
  r = await worker.fetch(jsonPost('/submitPd', validPdBody), ENVPD);
  ok(r.status === 201, '/submitPd valid → 201 (got ' + r.status + ')');
  const pdbody = await r.json();
  ok(pdbody.ok === true && /^pd:\d+:/.test(pdbody.id) && pdbody.slug === 'trauma-informed-basics', '/submitPd returns ok + pd:<ts>:… id + slug');
  ok(pdKv.size === 1, '/submitPd wrote one record to KV');
  const pdStored = JSON.parse([...pdKv.values()][0]);
  ok(pdStored.kind === 'pd_submission' && pdStored.structure_check.ok === true && pdStored.pd_module.kind === 'pd_module', '/submitPd stored record shape + structure_check.ok');
  // 30. pdStructureIssues annotates a structurally-broken (but schema-valid) module
  r = await worker.fetch(jsonPost('/submitPd', { pd_module: { kind: 'pd_module', metadata: { title: 'Broken' }, sections: [{ activities: [
    { id: 'q1', type: 'quiz', content: { questions: [] } },
    { id: 'v1', type: 'video', content: {} },
    { id: 'u1', type: 'wat' },
  ] }] }, affirmations: validAff }), ENVPD);
  const brokenStored = JSON.parse([...pdKv.values()][pdKv.size - 1]);
  const issues = brokenStored.structure_check.issues;
  ok(brokenStored.structure_check.ok === false
    && issues.includes('q1: quiz has no questions')
    && issues.includes('v1: video needs content.url')
    && issues.includes('u1: unknown type "wat"'), '/submitPd structure_check flags quiz/video/unknown-type issues');
  // 31. PII in a PD module is flagged but does NOT block (201)
  r = await worker.fetch(jsonPost('/submitPd', { pd_module: { kind: 'pd_module', metadata: { title: 'PII PD' }, sections: [{ activities: [{ id: 'a1', type: 'read', content: { body: 'email a@b.com' } }] }] }, affirmations: validAff }), ENVPD);
  const pdpii = await r.json();
  ok(r.status === 201 && pdpii.pii_findings_count >= 1, '/submitPd flags PII (email) but still 201');

  // ── GET /pdSubmissions (token-gated reader) ──
  const pdCount = pdKv.size;
  // 32. no ADMIN_TOKEN → 501
  r = await worker.fetch(req('/pdSubmissions'), ENVPD);
  ok(r.status === 501, 'GET /pdSubmissions without ADMIN_TOKEN → 501 (got ' + r.status + ')');
  // 33. wrong token → 401; right token → 200 + count
  const ENVPDADMIN = { ...ENVPD, ADMIN_TOKEN: 'sekret' };
  r = await worker.fetch(req('/pdSubmissions?token=nope'), ENVPDADMIN);
  ok(r.status === 401, 'GET /pdSubmissions wrong token → 401 (got ' + r.status + ')');
  r = await worker.fetch(req('/pdSubmissions?token=sekret'), ENVPDADMIN);
  const pdList = await r.json();
  ok(r.status === 200 && pdList.ok === true && pdList.count === pdCount, 'GET /pdSubmissions valid token → 200 + lists all stored (got ' + (pdList && pdList.count) + '/' + pdCount + ')');

  globalThis.fetch = realFetch;
  console.log((fail === 0 ? '✓' : '✗') + ' worker smoke: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
};
run().catch(e => { console.error(e); process.exit(1); });
