// Cloudflare Worker PD endpoint tests. These drive the real worker with fake KV
// and WebCrypto keys, including the institutional issuance trust boundary.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import worker from '../catalog/cloudflare-worker/src/index.js';

function post(path, body, env, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return worker.fetch(new Request('https://worker.test' + path, {
    method: 'POST', headers, body: body == null ? undefined : JSON.stringify(body),
  }), env);
}
function postPd(body, env) { return post('/submitPd', body, env); }
function fakeKv() {
  const store = {};
  return {
    store,
    async put(k, v, opts) { store[k] = { v, opts }; },
    async get(k) { return store[k] ? store[k].v : null; },
    async list(o) {
      o = o || {};
      const names = Object.keys(store).filter((k) => !o.prefix || k.indexOf(o.prefix) === 0);
      return { keys: names.map((name) => ({ name })) };
    },
  };
}
function fakeR2() {
  const store = {};
  return {
    store,
    async get(key) {
      if (!store[key]) return null;
      return { async text() { return store[key].value; } };
    },
    async put(key, value, options) {
      if (options && options.onlyIf && options.onlyIf.etagDoesNotMatch === '*' && store[key]) return null;
      store[key] = { value: String(value), options };
      return { key, etag: 'fake-etag-' + Object.keys(store).length };
    },
  };
}

function validPayload() {
  return {
    pd_module: {
      schema_version: 'pd-1.0', kind: 'pd_module',
      metadata: { id: 'test-pd', version: '1.0.0', language: 'en-US', title: 'Test PD', topic: 'UDL' },
      sections: [{ title: 'Start', activities: [{ id: 'read-one', type: 'read', title: 'Read', content: { body: 'Hello.' }, gate: { kind: 'none' } }] }],
    },
    credit: 'Test Author',
    affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true },
  };
}

function loadPdCore() {
  const src = fs.readFileSync('pd_core_module.js', 'utf8');
  const win = {}; const mod = { exports: {} };
  new Function('window', 'module', src)(win, mod); // eslint-disable-line no-new-func
  return mod.exports;
}

async function expectPdRejection(payload, code, path) {
  const env = { PD_SUBMISSIONS: fakeKv() };
  const res = await postPd(payload, env);
  expect(res.status).toBe(422);
  const json = await res.json();
  expect(json).toMatchObject({ ok: false, code, path });
  expect(Object.keys(env.PD_SUBMISSIONS.store)).toHaveLength(0);
}

describe('worker /submitPd deep server validation', () => {
  it('stores a valid submission in private KV and returns 201', async () => {
    const env = { PD_SUBMISSIONS: fakeKv() };
    const payload = validPayload();
    const expectedDigest = loadPdCore().moduleContentDigest(payload.pd_module);
    const res = await postPd(payload, env);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, slug: 'test-pd', module_content_digest: expectedDigest });
    const keys = Object.keys(env.PD_SUBMISSIONS.store);
    expect(keys).toHaveLength(1);
    const rec = JSON.parse(env.PD_SUBMISSIONS.store[keys[0]].v);
    expect(rec).toMatchObject({ kind: 'pd_submission', title: 'Test PD', module_content_digest: expectedDigest, structure_check: { ok: true, validator: 'worker-pd-1.0' } });
    expect(env.PD_SUBMISSIONS.store[keys[0]].opts.metadata.module_content_digest).toBe(expectedDigest);
  });

  it('rejects unknown fields at every submission contract layer without echoing values', async () => {
    const cases = [
      ['unknown_submission_fields', '', (p) => { p.hidden = 'DO_NOT_ECHO'; }],
      ['unknown_module_fields', 'pd_module', (p) => { p.pd_module.hidden = 'DO_NOT_ECHO'; }],
      ['unknown_metadata_fields', 'pd_module.metadata', (p) => { p.pd_module.metadata.hidden = 'DO_NOT_ECHO'; }],
      ['unknown_section_fields', 'pd_module.sections[0]', (p) => { p.pd_module.sections[0].hidden = 'DO_NOT_ECHO'; }],
      ['unknown_activity_fields', 'pd_module.sections[0].activities[0]', (p) => { p.pd_module.sections[0].activities[0].hidden = 'DO_NOT_ECHO'; }],
      ['unknown_content_fields', 'pd_module.sections[0].activities[0].content', (p) => { p.pd_module.sections[0].activities[0].content.hidden = 'DO_NOT_ECHO'; }],
      ['unknown_gate_fields', 'pd_module.sections[0].activities[0].gate', (p) => { p.pd_module.sections[0].activities[0].gate.hidden = 'DO_NOT_ECHO'; }],
      ['unknown_affirmation_fields', 'affirmations', (p) => { p.affirmations.hidden = 'DO_NOT_ECHO'; }],
    ];
    for (const [code, path, mutate] of cases) {
      const payload = validPayload(); mutate(payload);
      const env = { PD_SUBMISSIONS: fakeKv() };
      const res = await postPd(payload, env);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json).toMatchObject({ ok: false, code, path });
      expect(JSON.stringify(json)).not.toContain('DO_NOT_ECHO');
      expect(Object.keys(env.PD_SUBMISSIONS.store)).toHaveLength(0);
    }

    const quiz = validPayload();
    quiz.pd_module.sections[0].activities[0] = {
      id: 'quiz-one', type: 'quiz', title: 'Quiz',
      content: { questions: [{ prompt: 'Choose', options: ['A', 'B'], correctIndex: 0, hidden: 'DO_NOT_ECHO' }] },
      gate: { kind: 'score', threshold: 0.8 },
    };
    await expectPdRejection(quiz, 'unknown_question_fields', 'pd_module.sections[0].activities[0].content.questions[0]');

    const linked = validPayload();
    linked.pd_module.sections[0].activities[0].content.links = [{ label: 'Resource', url: '../resource', hidden: 'DO_NOT_ECHO' }];
    await expectPdRejection(linked, 'unknown_link_fields', 'pd_module.sections[0].activities[0].content.links[0]');
  });

  it('requires exact version and language metadata before review storage', async () => {
    const noVersion = validPayload(); delete noVersion.pd_module.metadata.version;
    await expectPdRejection(noVersion, 'metadata_version_required', 'pd_module.metadata.version');
    const legacyLanguage = validPayload(); delete legacyLanguage.pd_module.metadata.language; legacyLanguage.pd_module.metadata.lang = 'en';
    await expectPdRejection(legacyLanguage, 'unknown_metadata_fields', 'pd_module.metadata');
  });

  it('fails closed when the private KV binding is missing', async () => {
    const res = await postPd(validPayload(), {});
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/PD_SUBMISSIONS/);
  });

  it('rejects unchecked affirmations with a precise path', async () => {
    const p = validPayload(); p.affirmations.no_pii = false;
    await expectPdRejection(p, 'affirmation_required', 'affirmations.no_pii');
  });

  it('requires the exact supported schema and stable module ID', async () => {
    const schema = validPayload(); schema.pd_module.schema_version = 'pd-9.0';
    await expectPdRejection(schema, 'unsupported_schema_version', 'pd_module.schema_version');
    const id = validPayload(); id.pd_module.metadata.id = 'Not a stable ID';
    await expectPdRejection(id, 'invalid_module_id', 'pd_module.metadata.id');
  });

  it('rejects invalid kind, empty sections, and missing typed content', async () => {
    const kind = validPayload(); kind.pd_module.kind = 'lesson';
    await expectPdRejection(kind, 'invalid_module_kind', 'pd_module.kind');
    const sections = validPayload(); sections.pd_module.sections = [];
    await expectPdRejection(sections, 'sections_required', 'pd_module.sections');
    const content = validPayload(); delete content.pd_module.sections[0].activities[0].content.body;
    await expectPdRejection(content, 'read_body_required', 'pd_module.sections[0].activities[0].content.body');
  });

  it('blocks a quiz without an answer key instead of merely annotating it', async () => {
    const p = validPayload();
    p.pd_module.sections[0].activities = [{ id: 'quiz-one', type: 'quiz', title: 'Quiz', content: { questions: [{ prompt: 'Choose', options: ['A', 'B'] }] }, gate: { kind: 'score', threshold: 0.8 } }];
    await expectPdRejection(p, 'invalid_answer_key', 'pd_module.sections[0].activities[0].content.questions[0].correctIndex');
  });

  it('rejects score gates on non-quiz activities and invalid thresholds', async () => {
    const type = validPayload(); type.pd_module.sections[0].activities[0].gate = { kind: 'score', threshold: 0.8 };
    await expectPdRejection(type, 'invalid_score_gate_type', 'pd_module.sections[0].activities[0].gate');
    const threshold = validPayload(); threshold.pd_module.sections[0].activities = [{ id: 'quiz-one', type: 'quiz', title: 'Quiz', content: { questions: [{ prompt: 'Choose', options: ['A', 'B'], correctIndex: 0 }] }, gate: { kind: 'score', threshold: 2 } }];
    await expectPdRejection(threshold, 'invalid_score_threshold', 'pd_module.sections[0].activities[0].gate.threshold');
  });

  it('keeps worker acceptance aligned with PdCore on drift-prone authoring rules', async () => {
    const src = fs.readFileSync('pd_core_module.js', 'utf8');
    const win = {}; const mod = { exports: {} };
    new Function('window', 'module', src)(win, mod); // eslint-disable-line no-new-func
    const Core = mod.exports;
    const clone = (value) => JSON.parse(JSON.stringify(value));

    const namespaced = validPayload();
    namespaced.pd_module.metadata.id = 'ums:module.v1';
    namespaced.pd_module.sections[0].activities[0].id = 'read.one';
    namespaced.pd_module.sections[0].activities[0].content.links = [{ label: 'Relative resource', url: '../resource' }];
    namespaced.pd_module.assessmentPolicy = { paste: { mode: 'restricted', accessibleAlternative: 'Upload a file instead.' } };
    expect(Core.validatePdModule(namespaced.pd_module).ok).toBe(true);
    expect((await postPd(namespaced, { PD_SUBMISSIONS: fakeKv() })).status).toBe(201);

    const unsafeLink = clone(validPayload());
    unsafeLink.pd_module.sections[0].activities[0].content.links = [{ label: 'Unsafe', url: 'javascript:alert(1)' }];
    expect(Core.validatePdModule(unsafeLink.pd_module).ok).toBe(false);
    await expectPdRejection(unsafeLink, 'invalid_read_link', 'pd_module.sections[0].activities[0].content.links[0]');

    const missingRubric = clone(validPayload());
    missingRubric.pd_module.sections[0].activities[0] = {
      id: 'scenario-one', type: 'sim', title: 'Scenario',
      content: { scenario: 'Respond.' }, gate: { kind: 'none' },
    };
    expect(Core.validatePdModule(missingRubric.pd_module).ok).toBe(false);
    await expectPdRejection(missingRubric, 'invalid_sim_rubric', 'pd_module.sections[0].activities[0].content.rubric');

    const badPaste = clone(validPayload());
    badPaste.pd_module.assessmentPolicy = { paste: { mode: 'restricted' } };
    expect(Core.validatePdModule(badPaste.pd_module).ok).toBe(false);
    await expectPdRejection(badPaste, 'paste_alternative_required', 'pd_module.assessmentPolicy.paste');
  });

  it('independently blocks accessibility-authoring gaps at submission', async () => {
    const noLanguage = validPayload();
    delete noLanguage.pd_module.metadata.language;
    await expectPdRejection(noLanguage, 'metadata_language_required', 'pd_module.metadata.language');

    const video = validPayload();
    video.pd_module.sections[0].activities[0] = {
      id: 'video-one', type: 'video', title: 'Video',
      content: { url: '/video', transcript: 'Transcript text.' }, gate: { kind: 'none' },
    };
    await expectPdRejection(video, 'video_captions_required', 'pd_module.sections[0].activities[0].content');

    video.pd_module.sections[0].activities[0].content.captions = true;
    expect((await postPd(video, { PD_SUBMISSIONS: fakeKv() })).status).toBe(201);
  });

  it('keeps every approved pd-1.0 fixture valid', async () => {
    const files = fs.readdirSync('catalog/pd/approved').filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const module = JSON.parse(fs.readFileSync(`catalog/pd/approved/${name}`, 'utf8'));
      const payload = validPayload(); payload.pd_module = module;
      const res = await postPd(payload, { PD_SUBMISSIONS: fakeKv() });
      expect(res.status, name + ': ' + await res.text()).toBe(201);
    }
  });

  it('does not require GITHUB_PAT because PD never touches the public repo', async () => {
    expect((await postPd(validPayload(), { PD_SUBMISSIONS: fakeKv() })).status).toBe(201);
  });
});

describe('worker GET /pdSubmissions', () => {
  function getList(env, token) {
    const url = 'https://worker.test/pdSubmissions' + (token ? `?token=${encodeURIComponent(token)}` : '');
    return worker.fetch(new Request(url, { method: 'GET' }), env);
  }
  it('is disabled without ADMIN_TOKEN and rejects a wrong token', async () => {
    expect((await getList({ PD_SUBMISSIONS: fakeKv() })).status).toBe(501);
    expect((await getList({ PD_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' }, 'wrong')).status).toBe(401);
  });
  it('lists submissions with the correct token', async () => {
    const env = { PD_SUBMISSIONS: fakeKv(), ADMIN_TOKEN: 'secret' };
    await postPd(validPayload(), env);
    const json = await (await getList(env, 'secret')).json();
    expect(json).toMatchObject({ ok: true, count: 1 });
    expect(json.submissions[0].kind).toBe('pd_submission');
  });
});

describe('worker reviewed PD credentials', () => {
  let KEYS;
  const AUTH = 'issuer-review-secret';
  const MODULE_DIGEST = 'sha256:' + 'a'.repeat(64);
  const EVIDENCE_DIGEST = 'sha256:' + 'b'.repeat(64);
  const STORE_DIGEST = 'sha256:' + 'c'.repeat(64);
  const NOTICE_DIGEST = 'sha256:' + 'd'.repeat(64);
  const RUNTIME_DIGEST = 'sha256:' + 'e'.repeat(64);
  const RENDERER_DIGEST = 'sha256:' + 'f'.repeat(64);
  const STYLES_DIGEST = 'sha256:' + '1'.repeat(64);
  const STATE_DIGEST = 'sha256:' + '2'.repeat(64);
  const AUTO_REPORT_DIGEST = 'sha256:' + '3'.repeat(64);
  const CHECKLIST_DIGEST = 'sha256:' + '4'.repeat(64);
  const MANUAL_REPORT_DIGEST = 'sha256:' + '5'.repeat(64);
  beforeAll(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T12:00:00Z'));
    const kp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const selfKp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const rotatedKp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    KEYS = {
      privB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64'),
      pubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64'),
      selfPrivB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', selfKp.privateKey)).toString('base64'),
      selfPubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', selfKp.publicKey)).toString('base64'),
      rotatedPrivB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', rotatedKp.privateKey)).toString('base64'),
      rotatedPubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', rotatedKp.publicKey)).toString('base64'),
    };
  });
  afterAll(() => vi.useRealTimers());
  const issuerEnv = (extra = {}) => ({
    PD_ISSUER_PRIVATE_KEY: KEYS.privB64, PD_ISSUER_PUBLIC_KEY: KEYS.pubB64,
    PD_ISSUER_AUTH_TOKEN: AUTH, PD_ISSUER_NAME: 'Test University', PD_ISSUER_ID: 'urn:test:issuer', PD_ISSUER_KEY_ID: 'k1',
    PD_ISSUANCE_LEDGER: fakeR2(), ...extra,
  });
  const selfPacedEnv = (extra = {}) => ({
    PD_ALLOW_SELF_PACED_ISSUANCE: 'true', PD_SELF_PACED_PRIVATE_KEY: KEYS.selfPrivB64,
    PD_SELF_PACED_PUBLIC_KEY: KEYS.selfPubB64, PD_SELF_PACED_KEY_ID: 'self-k1', ...extra,
  });
  function validDecision(title = 'Module M') {
    return {
      schema_version: 'pd-reviewed-decision-1.0', decision_id: 'decision-1', status: 'approved', decided_at: '2026-06-20T15:30:00Z',
      reviewer: { id: 'reviewer-1', name: 'Riley Reviewer', authority: 'Microcredential Review Board' },
      provenance: { system: 'AlloFlow Review Queue', review_record_id: 'review-record-1' },
      learner: { id: 'learner-1' },
      module: { id: 'module-m', version: '2026.1', content_digest: MODULE_DIGEST, title, topic: 'UDL', required_activity_ids: ['read-one', 'reflect-one'] },
      evidence: {
        schema_version: 'pd-evidence-1.0', evidence_id: 'evidence-1', evidence_digest: EVIDENCE_DIGEST,
        collected_at: '2026-06-20T14:00:00Z', learner_id: 'learner-1',
        module_id: 'module-m', module_version: '2026.1', content_digest: MODULE_DIGEST,
        evidence_store: { system: 'Institutional Evidence Vault', record_id: 'evidence-record-1', record_digest: STORE_DIGEST },
        governance: {
          record_id: 'governance-1', notice_version: 'notice-1.0', notice_digest: NOTICE_DIGEST,
          notice_locale: 'en-US', granted_at: '2026-06-20T13:00:00Z',
          scopes: ['credential-review', 'learner-response', 'integrity-monitoring'],
          retention_policy_id: 'retention-7y', legal_basis_record_id: 'legal-basis-1',
        },
        activity_results: [
          { activity_id: 'read-one', satisfied: true, evidence_refs: ['artifact-1'] },
          { activity_id: 'reflect-one', satisfied: true, evidence_refs: ['response-1'] },
        ],
      },
      accessibility_verification: {
        schema_version: 'pd-accessibility-verification-1.0', module_id: 'module-m', module_version: '2026.1', content_digest: MODULE_DIGEST,
        rendered_surface: {
          runtime_build_digest: RUNTIME_DIGEST, renderer_digest: RENDERER_DIGEST, styles_digest: STYLES_DIGEST,
          state_inventory_digest: STATE_DIGEST, component_library_version: 'alloflow-components-1.0',
          process_scope: 'full-process', state_scope: 'all-states',
        },
        environments: [{
          browser: 'Chrome', browser_version: '126', platform: 'Windows', platform_version: '11',
          assistive_technology: 'NVDA', assistive_technology_version: '2026.1',
        }],
        standard: 'WCAG 2.2', level: 'AA', status: 'verified', verified_at: '2026-06-19T18:00:00Z',
        valid_through: '2027-06-19T18:00:00Z',
        reverify_on_change: { runtime_build: true, module_content: true },
        status_url: 'https://credentials.test/accessibility/module-m/2026.1',
        automated: {
          completed: true, tools: [{ name: 'axe-core', version: '4.10.2' }, { name: 'IBM Equal Access', version: '4.0.0' }],
          blocking_issues: 0, report_digest: AUTO_REPORT_DIGEST,
        },
        manual_review: {
          completed: true, result: 'pass', reviewer_id: 'accessibility-reviewer-1',
          checklist_version: 'wcag22-manual-1', checklist_digest: CHECKLIST_DIGEST,
          report_digest: MANUAL_REPORT_DIGEST, reviewed_at: '2026-06-19T17:00:00Z',
        },
      },
    };
  }
  const legacyRecord = () => ({ complete: true, moduleId: 'module-m', moduleVersion: '2026.1', contentDigest: MODULE_DIGEST, moduleTitle: 'Module M', completedAt: '2026-06-20T15:30:00Z', learner: { name: 'Pat' }, perActivity: [{ activityId: 'read-one', passed: true }] });
  async function resignCredential(credential, privateKeyB64 = KEYS.privB64) {
    const src = fs.readFileSync('pd_core_module.js', 'utf8');
    const win = {};
    new Function('window', 'module', src)(win, { exports: {} }); // eslint-disable-line no-new-func
    const privateKey = await globalThis.crypto.subtle.importKey('pkcs8', Buffer.from(privateKeyB64, 'base64'), { name: 'Ed25519' }, false, ['sign']);
    const signature = await globalThis.crypto.subtle.sign(
      { name: 'Ed25519' }, privateKey, new TextEncoder().encode(win.AlloModules.PdCore.canonicalize(credential.payload))
    );
    credential.signature = Buffer.from(signature).toString('base64');
    return credential;
  }

  it('is disabled without a signing key', async () => {
    expect((await post('/issuePd', { decision: validDecision() }, { PD_ISSUER_AUTH_TOKEN: AUTH }, AUTH)).status).toBe(501);
  });

  it('fails closed on incomplete or mismatched reviewed issuer configuration', async () => {
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUER_PUBLIC_KEY: undefined }), AUTH)).status).toBe(501);
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUER_ID: undefined }), AUTH)).status).toBe(501);
    const noLedger = await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUANCE_LEDGER: undefined }), AUTH);
    expect(noLedger.status).toBe(501);
    expect(await noLedger.json()).toMatchObject({ code: 'issuance_ledger_required' });
    const mismatch = await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUER_PUBLIC_KEY: KEYS.selfPubB64 }), AUTH);
    expect(mismatch.status).toBe(500);
    expect((await mismatch.json()).error).toMatch(/key configuration mismatch/i);
  });

  it('rejects arbitrary client complete:true records by secure default', async () => {
    const res = await post('/issuePd', { record: legacyRecord() }, issuerEnv());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'legacy_self_paced_disabled' });
  });

  it('requires the configured bearer token for reviewed issuance', async () => {
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv())).status).toBe(401);
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv(), 'wrong')).status).toBe(401);
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv(), AUTH)).status).toBe(201);
    expect((await post('/issuePd', { decision: validDecision() }, { ...issuerEnv(), PD_ISSUER_AUTH_TOKEN: undefined }, AUTH)).status).toBe(501);
  });

  it('issues a signed, version/evidence/accessibility-bound reviewed credential', async () => {
    const env = issuerEnv();
    const decision = validDecision();
    const res = await post('/issuePd', { decision }, env, AUTH);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.idempotent_replay).toBe(false);
    const identityHash = Buffer.from(await globalThis.crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode('urn:test:issuer\ndecision-1')
    )).toString('hex');
    expect(json.credential.payload).toMatchObject({
      id: 'urn:alloflow:pd:credential:sha256:' + identityHash,
      type: 'PdReviewedCompletionCredential', credential_profile: 'reviewed-evidence',
      issuer: { id: 'urn:test:issuer', keyId: 'k1' },
      review: { decisionId: 'decision-1', decisionDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) },
      credentialSubject: { id: 'learner-1', moduleVersion: '2026.1', contentDigest: MODULE_DIGEST, complete: true },
      evidence: { digest: EVIDENCE_DIGEST, learnerId: 'learner-1', store: { recordDigest: STORE_DIGEST }, requirementsSatisfied: 2, requirementsTotal: 2 },
      governance: { recordId: 'governance-1', scopes: ['credential-review', 'learner-response', 'integrity-monitoring'] },
      accessibilityVerification: { status: 'verified', contentDigest: MODULE_DIGEST, validThrough: '2027-06-19T18:00:00Z', renderedSurface: { runtimeBuildDigest: RUNTIME_DIGEST }, automated: { reportDigest: AUTO_REPORT_DIGEST }, manualReview: { checklistDigest: CHECKLIST_DIGEST, reportDigest: MANUAL_REPORT_DIGEST } },
    });
    expect(json.credential.payload.credentialSubject).not.toHaveProperty('name');
    const ledgerKeys = Object.keys(env.PD_ISSUANCE_LEDGER.store);
    expect(ledgerKeys).toEqual(['reviewed/' + identityHash + '.json']);
    const stored = env.PD_ISSUANCE_LEDGER.store[ledgerKeys[0]];
    expect(stored.options).toEqual({ onlyIf: { etagDoesNotMatch: '*' } });
    expect(JSON.parse(stored.value)).toMatchObject({
      schema_version: 'pd-issuance-ledger-1.0',
      decision_digest: json.credential.payload.review.decisionDigest,
      credential: json.credential,
    });
    expect(json.credential.payload.accessibilityVerification.note).toMatch(/not a perpetual guarantee/i);
    const verified = await (await post('/verifyPd', { credential: json.credential }, env)).json();
    expect(verified).toMatchObject({ valid: true, credential_profile: 'reviewed-evidence', accessibility_current: true, assurance: { institutional: true, reviewed: true } });
    const wrongWrapper = { ...json.credential, key_id: 'other-key' };
    expect(await (await post('/verifyPd', { credential: wrongWrapper }, env)).json()).toMatchObject({ valid: false, reason: 'credential_contract_invalid', assurance: { institutional: false, reviewed: false } });
    json.credential.payload.credentialSubject.moduleTitle = 'Tampered';
    expect((await (await post('/verifyPd', { credential: json.credential }, env)).json()).valid).toBe(false);
  });

  it('makes reviewed issuance create-once and rejects decision ID reuse with changed claims', async () => {
    const env = issuerEnv();
    const decision = validDecision();
    const first = await post('/issuePd', { decision }, env, AUTH);
    expect(first.status).toBe(201);
    const firstJson = await first.json();

    const retry = await post('/issuePd', { decision }, env, AUTH);
    expect(retry.status).toBe(200);
    const retryJson = await retry.json();
    expect(retryJson.idempotent_replay).toBe(true);
    expect(retryJson.credential).toEqual(firstJson.credential);
    expect(Object.keys(env.PD_ISSUANCE_LEDGER.store)).toHaveLength(1);

    const changed = validDecision('Changed title under reused decision ID');
    const conflict = await post('/issuePd', { decision: changed }, env, AUTH);
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: 'decision_id_conflict' });
    expect(Object.keys(env.PD_ISSUANCE_LEDGER.store)).toHaveLength(1);
  });

  it('returns the stored winner when an R2 conditional create loses a race', async () => {
    const winnerEnv = issuerEnv();
    const winner = await (await post('/issuePd', { decision: validDecision() }, winnerEnv, AUTH)).json();
    const winnerKey = Object.keys(winnerEnv.PD_ISSUANCE_LEDGER.store)[0];
    const winnerRecord = winnerEnv.PD_ISSUANCE_LEDGER.store[winnerKey].value;
    let reads = 0;
    const racingLedger = {
      async get() {
        reads += 1;
        if (reads === 1) return null;
        return { async text() { return winnerRecord; } };
      },
      async put(_key, _value, options) {
        expect(options).toEqual({ onlyIf: { etagDoesNotMatch: '*' } });
        return null;
      },
    };

    const response = await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUANCE_LEDGER: racingLedger }), AUTH);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.idempotent_replay).toBe(true);
    expect(json.credential).toEqual(winner.credential);
  });

  it('fails closed when the private issuance ledger is corrupt or unavailable', async () => {
    const corrupt = issuerEnv({
      PD_ISSUANCE_LEDGER: {
        async get() { return { async text() { return '{}'; } }; },
        async put() { throw new Error('must not overwrite'); },
      },
    });
    let res = await post('/issuePd', { decision: validDecision() }, corrupt, AUTH);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'issuance_ledger_corrupt' });

    const unavailableRead = issuerEnv({
      PD_ISSUANCE_LEDGER: {
        async get() { throw new Error('R2 unavailable'); },
        async put() { throw new Error('R2 unavailable'); },
      },
    });
    res = await post('/issuePd', { decision: validDecision() }, unavailableRead, AUTH);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'issuance_ledger_unavailable' });

    const unavailableWrite = fakeR2();
    unavailableWrite.put = async () => { throw new Error('R2 unavailable'); };
    res = await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUANCE_LEDGER: unavailableWrite }), AUTH);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'issuance_ledger_unavailable' });
  });

  it('rejects any future approval decision and enforces evidence/accessibility chronology', async () => {
    const cases = [];

    const future = validDecision();
    future.decided_at = new Date(Date.now() + 60 * 1000).toISOString();
    cases.push([future, 'decision_date_in_future']);

    const lateEvidence = validDecision();
    lateEvidence.evidence.collected_at = '2026-06-20T16:00:00Z';
    cases.push([lateEvidence, 'evidence_after_decision']);

    const lateManualReview = validDecision();
    lateManualReview.accessibility_verification.manual_review.reviewed_at = '2026-06-19T19:00:00Z';
    cases.push([lateManualReview, 'manual_review_after_verification']);

    const lateAccessibility = validDecision();
    lateAccessibility.accessibility_verification.verified_at = '2026-06-20T16:00:00Z';
    cases.push([lateAccessibility, 'accessibility_after_decision']);

    for (const [decision, code] of cases) {
      const res = await post('/issuePd', { decision }, issuerEnv(), AUTH);
      expect(res.status, code).toBe(422);
      expect(await res.json()).toMatchObject({ code });
    }
  });

  it('rejects incomplete or mismatched activity evidence', async () => {
    const incomplete = validDecision(); incomplete.evidence.activity_results[1].satisfied = false;
    let res = await post('/issuePd', { decision: incomplete }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'activity_requirement_not_satisfied' });
    const mismatch = validDecision(); mismatch.evidence.activity_results[1].activity_id = 'other-activity';
    res = await post('/issuePd', { decision: mismatch }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'activity_evidence_mismatch' });
  });

  it('requires accessibility evidence bound to the same version/digest and a manual pass', async () => {
    const binding = validDecision(); binding.accessibility_verification.content_digest = 'sha256:' + 'c'.repeat(64);
    let res = await post('/issuePd', { decision: binding }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'accessibility_module_mismatch' });
    const automatedOnly = validDecision(); automatedOnly.accessibility_verification.manual_review.completed = false;
    res = await post('/issuePd', { decision: automatedOnly }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'manual_accessibility_review_incomplete' });
    const partial = validDecision(); partial.accessibility_verification.status = 'partial';
    res = await post('/issuePd', { decision: partial }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'accessibility_not_credential_eligible' });
  });

  it('retains unmistakably non-institutional legacy issuance only behind its explicit flag', async () => {
    expect((await post('/issuePd', { record: legacyRecord() }, issuerEnv({ PD_ALLOW_SELF_PACED_ISSUANCE: 'true' }))).status).toBe(501);
    const env = selfPacedEnv();
    const response = await post('/issuePd', { record: legacyRecord() }, env);
    expect(env.PD_ISSUANCE_LEDGER).toBeUndefined();
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.credential.payload).toMatchObject({ type: 'PdSelfPacedCompletionAttestation', credential_profile: 'self-paced-non-institutional', issuer: { keyId: 'self-k1' }, assurance: { institutional: false, reviewed: false } });
    expect(json.credential.payload.credentialSubject).toMatchObject({ moduleVersion: '2026.1', contentDigest: MODULE_DIGEST });
    expect(json.credential).toMatchObject({ key_id: 'self-k1', public_key_spki_b64: KEYS.selfPubB64 });
    expect(json.credential.payload.attestation_note).toMatch(/must not be represented as an institutional credential/i);
    expect(await (await post('/verifyPd', { credential: json.credential }, env)).json()).toMatchObject({
      valid: true, credential_profile: 'self-paced-non-institutional', assurance: { institutional: false, reviewed: false },
    });
    const wrongWrapper = { ...json.credential, key_id: 'other-key' };
    expect(await (await post('/verifyPd', { credential: wrongWrapper }, env)).json())
      .toMatchObject({ valid: false, reason: 'credential_contract_invalid' });
  });

  it('requires version and digest binding even for explicit self-paced attestations', async () => {
    const missingDigest = legacyRecord(); delete missingDigest.contentDigest;
    let res = await post('/issuePd', { record: missingDigest }, selfPacedEnv());
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'invalid_content_digest' });
    const missingVersion = legacyRecord(); delete missingVersion.moduleVersion;
    res = await post('/issuePd', { record: missingVersion }, selfPacedEnv());
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'invalid_module_version' });
  });

  it('exposes the issuer public key', async () => {
    const json = await (await worker.fetch(new Request('https://worker.test/pdIssuerKey'), issuerEnv())).json();
    expect(json).toMatchObject({ ok: true, key_id: 'k1', public_key_spki_b64: KEYS.pubB64 });
  });

  it('worker signatures verify client-side with PdCore canonicalization', async () => {
    const json = await (await post('/issuePd', { decision: validDecision() }, issuerEnv(), AUTH)).json();
    const src = fs.readFileSync('pd_core_module.js', 'utf8');
    const win = {}; new Function('window', 'module', src)(win, { exports: {} }); // eslint-disable-line no-new-func
    const pub = await globalThis.crypto.subtle.importKey('spki', Buffer.from(KEYS.pubB64, 'base64'), { name: 'Ed25519' }, false, ['verify']);
    const ok = await globalThis.crypto.subtle.verify({ name: 'Ed25519' }, pub, Buffer.from(json.credential.signature, 'base64'), new TextEncoder().encode(win.AlloModules.PdCore.canonicalize(json.credential.payload)));
    expect(ok).toBe(true);
  });

  it('rejects non-approved decisions', async () => {
    const decision = validDecision(); decision.status = 'needs_changes';
    const res = await post('/issuePd', { decision }, issuerEnv(), AUTH);
    expect(res.status).toBe(422); expect(await res.json()).toMatchObject({ code: 'decision_not_approved' });
  });

  it('reuses main authoring identifiers and minimizes reviewed learner identity', async () => {
    const decision = validDecision();
    decision.module.id = 'ums:pd.module_1';
    decision.module.required_activity_ids = ['ums:activity.read_1', 'ums:activity.reflect_1'];
    decision.evidence.module_id = decision.module.id;
    decision.evidence.activity_results[0].activity_id = decision.module.required_activity_ids[0];
    decision.evidence.activity_results[1].activity_id = decision.module.required_activity_ids[1];
    decision.accessibility_verification.module_id = decision.module.id;
    expect((await post('/issuePd', { decision }, issuerEnv(), AUTH)).status).toBe(201);

    const withName = validDecision();
    withName.learner.name = 'Private learner name';
    const rejected = await post('/issuePd', { decision: withName }, issuerEnv(), AUTH);
    expect(rejected.status).toBe(422);
    expect(await rejected.json()).toMatchObject({ code: 'invalid_learner_shape' });
  });

  it('requires meaningful governed evidence provenance and unique evidence references', async () => {
    const cases = [
      [(decision) => { decision.evidence.learner_id = 'other-learner'; }, 'evidence_learner_mismatch'],
      [(decision) => { decision.evidence.governance.scopes = ['learner-response']; }, 'invalid_governance_scopes'],
      [(decision) => { decision.evidence.governance.scopes.push('unapproved-scope'); }, 'invalid_governance_scopes'],
      [(decision) => { decision.evidence.governance.scopes.push('credential-review'); }, 'invalid_governance_scopes'],
      [(decision) => { decision.evidence.governance.granted_at = '2026-06-20T14:30:00Z'; }, 'governance_after_evidence'],
      [(decision) => { decision.evidence.evidence_store.record_digest = EVIDENCE_DIGEST; }, 'invalid_evidence_store'],
      [(decision) => { decision.evidence.activity_results[0].evidence_refs = ['artifact-1', 'artifact-1']; }, 'activity_evidence_refs_required'],
    ];
    for (const [mutate, code] of cases) {
      const decision = validDecision();
      mutate(decision);
      const response = await post('/issuePd', { decision }, issuerEnv(), AUTH);
      expect(response.status, code).toBe(422);
      expect(await response.json()).toMatchObject({ code });
    }
  });

  it('requires exact rendered-surface, report, environment, and current issuance evidence', async () => {
    const cases = [
      [(decision) => { delete decision.accessibility_verification.rendered_surface.runtime_build_digest; }, 'invalid_rendered_surface_binding'],
      [(decision) => { delete decision.accessibility_verification.automated.report_digest; }, 'invalid_automated_accessibility_report'],
      [(decision) => { delete decision.accessibility_verification.manual_review.report_digest; }, 'invalid_manual_accessibility_report'],
      [(decision) => { delete decision.accessibility_verification.environments[0].assistive_technology_version; }, 'invalid_accessibility_environment'],
      [(decision) => { decision.accessibility_verification.valid_through = '2026-07-01T00:00:00Z'; }, 'accessibility_verification_expired'],
      [(decision) => { decision.accessibility_verification.valid_through = '2027-06-21T18:00:00Z'; }, 'invalid_accessibility_validity_window'],
    ];
    for (const [mutate, code] of cases) {
      const decision = validDecision();
      mutate(decision);
      const response = await post('/issuePd', { decision }, issuerEnv(), AUTH);
      expect(response.status, code).toBe(422);
      expect(await response.json()).toMatchObject({ code });
    }
  });

  it('denies institutional assurance for correctly signed semantic forgeries and malformed credentials', async () => {
    const env = issuerEnv();
    const issued = await (await post('/issuePd', { decision: validDecision() }, env, AUTH)).json();
    const cases = [
      ['wrong wrapper schema', (credential) => { credential.schema_version = 'pd-reviewed-credential-9.9'; }],
      ['wrong payload schema', (credential) => { credential.payload.schema_version = 'pd-reviewed-credential-9.9'; }],
      ['wrong type', (credential) => { credential.payload.type = 'PdReviewedCompletionCredentialButNotReally'; }],
      ['wrong algorithm', (credential) => { credential.alg = 'Ed448'; }],
      ['fake issuer ID/name', (credential) => { credential.payload.issuer.id = 'urn:attacker:issuer'; credential.payload.issuer.name = 'Fake University'; }],
      ['unknown credential profile', (credential) => { credential.payload.credential_profile = 'unknown-institutional'; }],
    ];
    for (const [label, mutate] of cases) {
      const credential = JSON.parse(JSON.stringify(issued.credential));
      mutate(credential);
      await resignCredential(credential);
      const result = await (await post('/verifyPd', { credential }, env)).json();
      expect(result, label).toMatchObject({
        valid: false, assurance: { institutional: false, reviewed: false },
      });
    }

    const malformed = await (await post('/verifyPd', {
      credential: { payload: { credential_profile: 'reviewed-evidence' }, signature: 'not-base64' },
    }, env)).json();
    expect(malformed).toMatchObject({ valid: false, assurance: { institutional: false, reviewed: false } });
    const invalidJsonResponse = await worker.fetch(new Request('https://worker.test/verifyPd', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    }), env);
    expect(invalidJsonResponse.status).toBe(400);
    expect(await invalidJsonResponse.json()).toMatchObject({
      valid: false, assurance: { institutional: false, reviewed: false },
    });
  });

  it('verifies and replays old credentials through a bounded historical keyring', async () => {
    const ledger = fakeR2();
    const oldEnv = issuerEnv({ PD_ISSUANCE_LEDGER: ledger });
    const first = await (await post('/issuePd', { decision: validDecision() }, oldEnv, AUTH)).json();
    const rotatedEnv = issuerEnv({
      PD_ISSUER_PRIVATE_KEY: KEYS.rotatedPrivB64,
      PD_ISSUER_PUBLIC_KEY: KEYS.rotatedPubB64,
      PD_ISSUER_KEY_ID: 'k2',
      PD_ISSUANCE_LEDGER: ledger,
      PD_ISSUER_PUBLIC_KEYS_JSON: JSON.stringify([{ key_id: 'k1', public_key_spki_b64: KEYS.pubB64 }]),
    });

    const replay = await post('/issuePd', { decision: validDecision() }, rotatedEnv, AUTH);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ idempotent_replay: true, credential: first.credential });
    expect(await (await post('/verifyPd', { credential: first.credential }, rotatedEnv)).json()).toMatchObject({
      valid: true, accessibility_current: true, assurance: { institutional: true, reviewed: true },
    });

    const duplicateIds = { ...rotatedEnv, PD_ISSUER_PUBLIC_KEYS_JSON: JSON.stringify([{ key_id: 'k2', public_key_spki_b64: KEYS.pubB64 }]) };
    expect(await (await post('/verifyPd', { credential: first.credential }, duplicateIds)).json()).toMatchObject({
      valid: false, assurance: { institutional: false, reviewed: false }, reason: 'trusted_key_configuration_invalid',
    });
  });

  it('keeps a historical reviewed achievement valid while reporting expired accessibility', async () => {
    const env = issuerEnv();
    const issued = await (await post('/issuePd', { decision: validDecision() }, env, AUTH)).json();
    const historical = JSON.parse(JSON.stringify(issued.credential));
    historical.payload.issuanceDate = '2026-06-20T16:00:00Z';
    historical.payload.accessibilityVerification.validThrough = '2026-07-01T00:00:00Z';
    await resignCredential(historical);
    expect(await (await post('/verifyPd', { credential: historical }, env)).json()).toMatchObject({
      valid: true,
      accessibility_current: false,
      assurance: { institutional: true, reviewed: true },
    });
  });

  it('resists signature/key swapping and oversized bodies', async () => {
    const env = issuerEnv();
    const decisionA = validDecision('A');
    const decisionB = validDecision('B');
    decisionB.decision_id = 'decision-2';
    decisionB.provenance.review_record_id = 'review-record-2';
    const a = await (await post('/issuePd', { decision: decisionA }, env, AUTH)).json();
    const b = await (await post('/issuePd', { decision: decisionB }, env, AUTH)).json();
    a.credential.signature = b.credential.signature;
    expect((await (await post('/verifyPd', { credential: a.credential }, env)).json()).valid).toBe(false);

    const clean = await (await post('/issuePd', { decision: decisionA }, env, AUTH)).json();
    clean.credential.public_key_spki_b64 = 'AAAA';
    expect(await (await post('/verifyPd', { credential: clean.credential }, env)).json()).toMatchObject({ valid: false, assurance: { institutional: false, reviewed: false } });
    const kp2 = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const other = { PD_ISSUER_KEY_ID: 'k1', PD_ISSUER_PUBLIC_KEY: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp2.publicKey)).toString('base64') };
    expect((await (await post('/verifyPd', { credential: clean.credential }, other)).json()).valid).toBe(false);

    const big = { decision: { note: 'x'.repeat(1_100_000) } };
    expect((await post('/issuePd', big, env, AUTH)).status).toBe(413);
  });
});