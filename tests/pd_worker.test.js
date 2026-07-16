// Cloudflare Worker PD endpoint tests. These drive the real worker with fake KV
// and WebCrypto keys, including the institutional issuance trust boundary.
import { describe, it, expect, beforeAll } from 'vitest';
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
    const res = await postPd(validPayload(), env);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, slug: 'test-pd' });
    const keys = Object.keys(env.PD_SUBMISSIONS.store);
    expect(keys).toHaveLength(1);
    const rec = JSON.parse(env.PD_SUBMISSIONS.store[keys[0]].v);
    expect(rec).toMatchObject({ kind: 'pd_submission', title: 'Test PD', structure_check: { ok: true, validator: 'worker-pd-1.0' } });
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
  beforeAll(async () => {
    const kp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const selfKp = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    KEYS = {
      privB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64'),
      pubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp.publicKey)).toString('base64'),
      selfPrivB64: Buffer.from(await globalThis.crypto.subtle.exportKey('pkcs8', selfKp.privateKey)).toString('base64'),
      selfPubB64: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', selfKp.publicKey)).toString('base64'),
    };
  });
  const issuerEnv = (extra = {}) => ({
    PD_ISSUER_PRIVATE_KEY: KEYS.privB64, PD_ISSUER_PUBLIC_KEY: KEYS.pubB64,
    PD_ISSUER_AUTH_TOKEN: AUTH, PD_ISSUER_NAME: 'Test University', PD_ISSUER_ID: 'urn:test:issuer', PD_ISSUER_KEY_ID: 'k1', ...extra,
  });
  const selfPacedEnv = (extra = {}) => ({
    ...issuerEnv(), PD_ALLOW_SELF_PACED_ISSUANCE: 'true',
    PD_SELF_PACED_PRIVATE_KEY: KEYS.selfPrivB64, PD_SELF_PACED_PUBLIC_KEY: KEYS.selfPubB64, PD_SELF_PACED_KEY_ID: 'self-k1', ...extra,
  });
  function validDecision(title = 'Module M') {
    return {
      schema_version: 'pd-reviewed-decision-1.0', decision_id: 'decision-1', status: 'approved', decided_at: '2026-06-20T15:30:00Z',
      reviewer: { id: 'reviewer-1', name: 'Riley Reviewer', authority: 'Microcredential Review Board' },
      provenance: { system: 'AlloFlow Review Queue', review_record_id: 'review-record-1' },
      learner: { id: 'learner-1', name: 'Pat Learner' },
      module: { id: 'module-m', version: '2026.1', content_digest: MODULE_DIGEST, title, topic: 'UDL', required_activity_ids: ['read-one', 'reflect-one'] },
      evidence: {
        schema_version: 'pd-evidence-1.0', evidence_id: 'evidence-1', evidence_digest: EVIDENCE_DIGEST,
        collected_at: '2026-06-20T14:00:00Z', module_id: 'module-m', module_version: '2026.1', content_digest: MODULE_DIGEST,
        activity_results: [
          { activity_id: 'read-one', satisfied: true, evidence_refs: ['artifact-1'] },
          { activity_id: 'reflect-one', satisfied: true, evidence_refs: ['response-1'] },
        ],
      },
      accessibility_verification: {
        schema_version: 'pd-accessibility-verification-1.0', module_id: 'module-m', module_version: '2026.1', content_digest: MODULE_DIGEST,
        standard: 'WCAG 2.2', level: 'AA', status: 'verified', verified_at: '2026-06-19T18:00:00Z',
        automated: { completed: true, tools: ['axe-core', 'IBM Equal Access'], blocking_issues: 0 },
        manual_review: { completed: true, result: 'pass', reviewer_id: 'accessibility-reviewer-1', checklist_version: 'wcag22-manual-1', reviewed_at: '2026-06-19T17:00:00Z' },
      },
    };
  }
  const legacyRecord = () => ({ complete: true, moduleId: 'module-m', moduleVersion: '2026.1', contentDigest: MODULE_DIGEST, moduleTitle: 'Module M', completedAt: '2026-06-20T15:30:00Z', learner: { name: 'Pat' }, perActivity: [{ activityId: 'read-one', passed: true }] });

  it('is disabled without a signing key', async () => {
    expect((await post('/issuePd', { decision: validDecision() }, { PD_ISSUER_AUTH_TOKEN: AUTH }, AUTH)).status).toBe(501);
  });

  it('fails closed on incomplete or mismatched reviewed issuer configuration', async () => {
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUER_PUBLIC_KEY: undefined }), AUTH)).status).toBe(501);
    expect((await post('/issuePd', { decision: validDecision() }, issuerEnv({ PD_ISSUER_ID: undefined }), AUTH)).status).toBe(501);
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
    const res = await post('/issuePd', { decision: validDecision() }, env, AUTH);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.credential.payload).toMatchObject({
      type: 'PdReviewedCompletionCredential', credential_profile: 'reviewed-evidence',
      credentialSubject: { moduleVersion: '2026.1', contentDigest: MODULE_DIGEST, complete: true },
      evidence: { digest: EVIDENCE_DIGEST, requirementsSatisfied: 2, requirementsTotal: 2 },
      accessibilityVerification: { status: 'verified', automatedChecksCompleted: true, manualReviewCompleted: true, contentDigest: MODULE_DIGEST },
    });
    expect(json.credential.payload.accessibilityVerification.note).toMatch(/not an automated-only or perpetual guarantee/i);
    const verified = await (await post('/verifyPd', { credential: json.credential }, env)).json();
    expect(verified).toMatchObject({ valid: true, credential_profile: 'reviewed-evidence', assurance: { institutional: true, reviewed: true } });
    json.credential.payload.credentialSubject.moduleTitle = 'Tampered';
    expect((await (await post('/verifyPd', { credential: json.credential }, env)).json()).valid).toBe(false);
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
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.credential.payload).toMatchObject({ type: 'PdSelfPacedCompletionAttestation', credential_profile: 'self-paced-non-institutional', assurance: { institutional: false, reviewed: false } });
    expect(json.credential.payload.credentialSubject).toMatchObject({ moduleVersion: '2026.1', contentDigest: MODULE_DIGEST });
    expect(json.credential).toMatchObject({ key_id: 'self-k1', public_key_spki_b64: KEYS.selfPubB64 });
    expect(json.credential.payload.attestation_note).toMatch(/must not be represented as an institutional credential/i);
    expect(await (await post('/verifyPd', { credential: json.credential }, env)).json()).toMatchObject({
      valid: true, credential_profile: 'self-paced-non-institutional', assurance: { institutional: false, reviewed: false },
    });
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

  it('resists signature/key swapping and oversized bodies', async () => {
    const env = issuerEnv();
    const a = await (await post('/issuePd', { decision: validDecision('A') }, env, AUTH)).json();
    const b = await (await post('/issuePd', { decision: validDecision('B') }, env, AUTH)).json();
    a.credential.signature = b.credential.signature;
    expect((await (await post('/verifyPd', { credential: a.credential }, env)).json()).valid).toBe(false);

    const clean = await (await post('/issuePd', { decision: validDecision('A') }, env, AUTH)).json();
    clean.credential.public_key_spki_b64 = 'AAAA';
    expect((await (await post('/verifyPd', { credential: clean.credential }, env)).json()).valid).toBe(true);
    const kp2 = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const other = { PD_ISSUER_PUBLIC_KEY: Buffer.from(await globalThis.crypto.subtle.exportKey('spki', kp2.publicKey)).toString('base64') };
    expect((await (await post('/verifyPd', { credential: clean.credential }, other)).json()).valid).toBe(false);

    const big = { decision: { note: 'x'.repeat(1_100_000) } };
    expect((await post('/issuePd', big, env, AUTH)).status).toBe(413);
  });
});