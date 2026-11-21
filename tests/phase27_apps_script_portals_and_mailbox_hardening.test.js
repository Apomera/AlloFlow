import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { makeAppsScriptHarness, DOMAIN as EE_DOMAIN, ADMIN as EE_ADMIN } from './helpers/educator_evaluation_gs_harness.js';
import { harness as createSchoolRewardsHarness, setup as setupSchoolRewards, seededCategory, DOMAIN as SR_DOMAIN, ADMIN as SR_ADMIN } from './helpers/school_rewards_repository.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');

function makeMailboxVm(opts = {}) {
  const propsStore = Object.create(null);
  if (opts.admin) propsStore.admin = opts.admin;
  const cacheStore = Object.create(null);
  let lockLocked = !!opts.lockBusy;
  let driveLookupCount = 0;
  const createdFiles = [];
  const privCalls = [];
  const fakeFolder = {
    getId: () => 'fld-1',
    getFilesByName: () => ({ hasNext: () => false }),
    getFoldersByName: () => ({ hasNext: () => false }),
    createFolder: (name) => ({ ...fakeFolder, name }),
    createFile: (name, content, mime) => {
      const f = {
        id: 'file-' + (createdFiles.length + 1),
        name,
        content,
        mime,
        getId() { return this.id; },
        getUrl() { return 'https://drive.google.com/file/d/' + this.id + '/view'; },
        getBlob: () => ({ getDataAsString: () => content }),
        setSharing: (a, p) => privCalls.push({ name, a, p }),
        setShareableByEditors: (v) => privCalls.push({ name, shareable: v }),
        setTrashed: () => {},
      };
      createdFiles.push(f);
      return f;
    },
  };
  const ctx = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => ({ getContent: () => s, setMimeType() { return this; } }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (Object.prototype.hasOwnProperty.call(propsStore, k) ? propsStore[k] : null),
        setProperty: (k, v) => { propsStore[k] = String(v); },
        deleteProperty: (k) => { delete propsStore[k]; },
        getProperties: () => ({ ...propsStore }),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (Object.prototype.hasOwnProperty.call(cacheStore, k) ? cacheStore[k] : null),
        getAll: (ks) => {
          const out = {};
          ks.forEach((k) => { if (Object.prototype.hasOwnProperty.call(cacheStore, k)) out[k] = cacheStore[k]; });
          return out;
        },
        put: (k, v) => { cacheStore[k] = String(v); },
        remove: (k) => { delete cacheStore[k]; },
        removeAll: (ks) => { ks.forEach((k) => { delete cacheStore[k]; }); },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (lockLocked) return false;
          lockLocked = true;
          return true;
        },
        releaseLock: () => { lockLocked = false; },
      }),
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      Permission: { NONE: 'NONE' },
      getFoldersByName: () => {
        driveLookupCount += 1;
        return { hasNext: () => true, next: () => fakeFolder };
      },
      createFolder: () => fakeFolder,
      getFileById: (id) => ({
        setSharing: (a, p) => privCalls.push({ id, a, p }),
        setShareableByEditors: (v) => privCalls.push({ id, shareable: v }),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_alg, text) => Array.from(crypto.createHash('sha256').update(String(text)).digest()),
      computeHmacSha256Signature: (msg, key) => Array.from(crypto.createHmac('sha256', String(key)).update(String(msg)).digest()),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
      formatDate: () => '20261120-080000',
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => 'owner@school.edu' }),
      getEffectiveUser: () => ({ getEmail: () => 'owner@school.edu' }),
    },
  };
  const src = fs.readFileSync(path.join(ROOT, 'apps_script/session_mailbox/Code.gs'), 'utf8');
  vm.runInNewContext(src, ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).getContent());
  return { ctx, post, propsStore, cacheStore, createdFiles, privCalls, getDriveLookups: () => driveLookupCount, setLockBusy: (v) => { lockLocked = v; } };
}

describe('Phase 27: Apps Script Portals & Class Mailbox Security/Reliability Hardening', () => {
  it('Track 1 (session_mailbox v32): enforces doPost guards, admin rate-limit, locked rotateadmin, prototype safety, SSRF, and retention cache isolation', () => {
    const admin = 'A'.repeat(40);
    const mb = makeMailboxVm({ admin });

    expect(mb.ctx.VERSION).toBe(32);
    expect(mb.ctx.LIVE_HOST_LEASE_TTL_MS).toBe(90000);

    // Non-object JSON rejected
    expect(mb.post('null')).toEqual({ ok: false, e: 'bad-request' });
    expect(mb.post('[]')).toEqual({ ok: false, e: 'bad-request' });
    expect(mb.post('"hello"')).toEqual({ ok: false, e: 'bad-request' });

    // Oversized token rejected immediately
    expect(mb.ctx.mbTimingSafeEq_('x'.repeat(300), 'x'.repeat(300))).toBe(false);

    // Malformed join code does not spray per-code rate-limit cache keys
    expect(mb.post({ a: 'join', c: 'INVALID-SPRAY-KEY-999' })).toEqual({ ok: false, e: 'no-session' });
    expect(Object.keys(mb.cacheStore).some((k) => k.includes('INVALID-SPRAY'))).toBe(false);

    // Pre-Drive-read packId validation stops unauthenticated Drive lookups
    const beforeLookups = mb.getDriveLookups();
    expect(mb.post({ a: 'joinactivity', id: 'not-a-pack-id' })).toEqual({ ok: false, e: 'bad-request' });
    expect(mb.getDriveLookups()).toBe(beforeLookups);

    // delPack rejects bad pack IDs before Drive
    expect(mb.post({ a: 'delpack', admin, id: '../evil' })).toEqual({ ok: false, e: 'bad-request' });

    // Admin brute-force rate limit applies across admin-gated endpoints (e.g. open)
    const rlMb = makeMailboxVm({ admin });
    for (let i = 0; i < 30; i++) {
      expect(rlMb.post({ a: 'open', admin: 'wrong-token-value', c: 'ABCD', k: 'k_secret_12345' }).e).toBe('not-admin');
    }
    expect(rlMb.post({ a: 'open', admin: 'wrong-token-value', c: 'ABCD', k: 'k_secret_12345' }).e).toBe('rate-limited');

    // rotateadmin runs under ScriptLock and returns busy when contested
    const lockedMb = makeMailboxVm({ admin, lockBusy: true });
    expect(lockedMb.post({ a: 'rotateadmin', admin })).toEqual({ ok: false, e: 'busy' });

    // Survey aggregates ignore prototype-key choice answers without NaN corruption
    const surveyAgg = mb.ctx.computeSurveyAggregates(
      { items: [{ id: 'q1', type: 'choice', options: [{ id: 'optA', label: 'A' }] }] },
      { u1: { answers: { q1: 'toString' } }, u2: { answers: { q1: 'constructor' } }, u3: { answers: { q1: 'optA' } } }
    );
    expect(surveyAgg.items[0].n).toBe(1);
    expect(surveyAgg.items[0].counts.optA).toBe(1);
    expect(surveyAgg.items[0].counts.toString).toBeUndefined();

    // Extended SSRF IPv6 & multi-trailing-dot host blocking + case-insensitive headers
    expect(mb.ctx.fetchPageBlockedHost('localhost..')).toBe(true);
    expect(mb.ctx.fetchPageBlockedHost('::ffff:0:127.0.0.1')).toBe(true);
    expect(mb.ctx.fetchPageBlockedHost('2002:7f00:0001::1')).toBe(true);
    expect(mb.ctx.fetchPageBlockedHost('fec0::1')).toBe(true);
    expect(mb.ctx.fetchPageBlockedHost('2001:0::1')).toBe(true);
    expect(mb.ctx.fetchPageBlockedHost('example.org')).toBe(false);
    expect(mb.ctx.fetchPageHeader_({ LoCaTiOn: 'https://example.org/next', 'CoNtEnT-tYpE': 'text/html' }, 'location')).toBe('https://example.org/next');
    expect(mb.ctx.fetchPageHeader_({ 'CoNtEnT-tYpE': 'text/html; charset=utf-8' }, 'content-type')).toBe('text/html; charset=utf-8');
  });

  it('Track 2 (educator_evaluation): hardens setup re-run, safeId_, sheet formula symmetry, Drive privacy, audit tail hash, and observation ack immutability', () => {
    const DOMAIN = EE_DOMAIN;
    const ADMIN = EE_ADMIN;
    const harness = makeAppsScriptHarness();
    const setup = harness.invoke('setupEvaluationRepository', {
      allowedDomain: DOMAIN,
      bootstrapAdmin: ADMIN,
      organization: 'District',
      academicYear: '2026-27',
    });
    expect(setup.ok).toBe(true);

    // Re-running setupEvaluationRepository cannot change bootstrapAdmin or mutate members/assignments
    expect(harness.invokeError('setupEvaluationRepository', {
      allowedDomain: DOMAIN,
      bootstrapAdmin: `attacker@${DOMAIN}`,
    }).code).toBe('bad_config');

    expect(harness.invokeError('setupEvaluationRepository', {
      allowedDomain: DOMAIN,
      members: [{ email: `other@${DOMAIN}`, role: 'admin', active: true }],
    }).code).toBe('bad_config');

    // Direct VM load for internal helper verification
    const eeVm = {
      console, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, parseFloat, isFinite, isNaN,
      DriveApp: { Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' } },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
        getUuid: () => crypto.randomUUID(),
        computeDigest: (_a, t) => Array.from(crypto.createHash('sha256').update(String(t)).digest()),
        base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'),
      },
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'ss-1' }) },
      SpreadsheetApp: {
        openById: () => ({
          getSheetByName: () => ({
            getLastRow: () => 2,
            getRange: () => ({ getValue: () => '' }),
          }),
        }),
      },
    };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'apps_script/educator_evaluation/Code.gs'), 'utf8'), eeVm);

    // safeId_ rejects Object.prototype names
    for (const bad of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__', 'prototype']) {
      expect(() => eeVm.safeId_(bad, true)).toThrow(/Invalid record identifier/);
    }
    expect(eeVm.safeId_('teacher-1', true)).toBe('teacher-1');

    // sheetSafeCell_ and sheetLogicalCell_ are exact inverses including leading-apostrophe triggers & pipe DDE
    for (const sample of ['=SUM(A1)', "'=note", "'@admin", "'-1", '|cmd', "'|cmd", "'hello", 'plain text']) {
      const stored = eeVm.sheetSafeCell_(sample);
      expect(eeVm.sheetLogicalCell_(stored)).toBe(sample);
    }
    expect(eeVm.sheetSafeCell_('|cmd')).toBe("'|cmd");
    expect(eeVm.sheetSafeCell_("'=note")).toBe("''=note");

    // isDriveItemPrivate_ fails closed on missing methods and trashed items
    expect(eeVm.isDriveItemPrivate_({})).toBe(false);
    expect(eeVm.isDriveItemPrivate_({
      isTrashed: () => true,
      getSharingAccess: () => eeVm.DriveApp.Access.PRIVATE,
      isShareableByEditors: () => false,
      getEditors: () => [],
      getViewers: () => [],
    })).toBe(false);

    // annualArchiveUrl_ validates https://drive.google.com/ origin
    expect(eeVm.annualArchiveUrl_({
      getId: () => 'file-12345678',
      getUrl: () => 'javascript:alert(1)',
    })).toBe('https://drive.google.com/file/d/file-12345678/view');

    // teacherObservationUpdate_ refuses unchecking ackChecked after acknowledgment
    const ackedObs = {
      id: 'obs-1', teacherId: 't1',
      prework: { q1: '', q2: '', q3: '', q4: '' },
      preworkSubmittedAt: '2026-10-01T00:00:00.000Z',
      evidencePublishedAt: '2026-10-02T00:00:00.000Z',
      reflection: 'Done',
      reflectionSubmittedAt: '2026-10-03T00:00:00.000Z',
      evaluatorSignedAt: '2026-10-04T00:00:00.000Z',
      ackChecked: true,
      teacherAcknowledgedAt: '2026-10-05T00:00:00.000Z',
      updatedAt: '2026-10-05T00:00:00.000Z',
    };
    const updatedObs = eeVm.teacherObservationUpdate_(ackedObs, { ...ackedObs, ackChecked: false });
    expect(updatedObs.ackChecked).toBe(true);

    // appendCanonicalAuditRow_ fails closed when the tail Audit row has a blank hash cell
    expect(() => eeVm.appendCanonicalAuditRow_({
      id: 'audit-fail-test', teacherId: '', event: 'TEST', summary: 'test',
      entityType: 'workspace', entityId: '', version: 1, actorEmail: ADMIN, actorRole: 'admin', at: new Date().toISOString(),
    })).toThrow(/Audit chain tail hash is missing/);
  });

  it('Track 3 (school_rewards): redacts v6 MailOutbox without bricking HMAC/bootstrap/integrity, prevents formula re-detonation, and blocks prototype & email bypasses', () => {
    const h = createSchoolRewardsHarness();
    const s1 = setupSchoolRewards(h);
    const cat = seededCategory(h);
    const OTHER_STUDENT = `grace@${SR_DOMAIN}`;
    const s2 = h.call('adminUpsertRewardsStudent', { firstName: 'Grace', lastInitial: 'H', grade: '7', homeroom: '101', email: OTHER_STUDENT }).student;

    // Award points to both students
    h.call('awardSchoolRewardsPoints', { studentId: s1.id, categoryId: cat.id, amount: 10, reason: 'Helped a classmate', idempotencyKey: 'award-s1-0001' });
    h.call('awardSchoolRewardsPoints', { studentId: s2.id, categoryId: cat.id, amount: 5, reason: 'Great teamwork', idempotencyKey: 'award-s2-0001' });

    // Send a v6 student statement mail run so s1 has a signed MailOutbox row
    h.call('configureSchoolRewardsEmailSchedule', { enabled: true, weekday: 'FRIDAY', hour: 15 });
    const runRes = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-W47', maxRecipients: 10 });
    expect(runRes.ok).toBe(true);

    // Redact s1: must NOT brick MailOutbox HMAC, admin bootstrap, or integrity report
    const redaction = h.call('redactSchoolRewardsStudent', { studentId: s1.id, reason: 'District records request #27', confirm: true });
    expect(redaction.ok).toBe(true);
    expect(redaction.cleared.MailOutbox).toBeGreaterThanOrEqual(1);

    // Admin bootstrap still works cleanly after redacting a student with MailOutbox history
    const boot = h.call('getSchoolRewardsBootstrap');
    expect(boot.ok).toBe(true);

    // Integrity report has zero MAIL_DELIVERY_HMAC_INVALID or JOURNAL_LEDGER_INTENT_MISMATCH errors
    const report = h.call('getSchoolRewardsIntegrityReport', {});
    const badCodes = report.issues.filter((i) => i.code === 'MAIL_DELIVERY_HMAC_INVALID' || i.code === 'JOURNAL_LEDGER_INTENT_MISMATCH');
    expect(badCodes).toEqual([]);

    // Simulate real Google Sheets .getValues() stripping the leading apostrophe on an unrelated row's formula-like cell:
    // redactSheetRows_ must re-escape it via safeRow_ when rewriting the column (preventing stored formula re-detonation).
    h.setDataCell('Ledger', 1, 4, '=HYPERLINK("https://evil.invalid","click")');
    h.setDataCell('Ledger', 0, 4, 'Needs re-redaction');
    h.call('redactSchoolRewardsStudent', { studentId: s1.id, reason: 'Second pass check #27', confirm: true });
    const ledgerRows = h.rows('Ledger');
    const s2LedgerRow = ledgerRows.find((r) => r[1] === s2.id);
    expect(String(s2LedgerRow[4]).startsWith("'=HYPERLINK")).toBe(true);

    // Direct VM load for internal School Rewards helper verification
    const srVm = {
      console, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, parseFloat, isFinite, isNaN,
      DriveApp: { Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' } },
    };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'apps_script/school_rewards/Code.gs'), 'utf8'), srVm);

    // Prototype-key bypasses blocked in id_, normalizePrintRecipe_, validatePrintAssetMetadata_
    for (const bad of ['constructor', '__proto__', 'prototype', 'toString']) {
      expect(() => srVm.id_(bad, 'student')).toThrow(/valid student id/);
    }
    expect(() => srVm.normalizePrintRecipe_({ parts: [{ shape: 'constructor', size: [1, 1], position: [0, 0, 0], rotation: [0, 0, 0] }] })).toThrow(/unsupported shape/);
    expect(() => srVm.validatePrintAssetMetadata_({ sourceFormat: 'GLB' }, 'model.glb', 'constructor', 'a'.repeat(64))).toThrow(/MIME type/);

    // Strict email validation rejects comma injection, angle brackets, control chars, and >254 chars
    expect(srVm.normalizeEmail_(`good@${SR_DOMAIN}`)).toBe(`good@${SR_DOMAIN}`);
    expect(srVm.normalizeEmail_(`a@${SR_DOMAIN},b@evil.com`)).toBe('');
    expect(srVm.normalizeEmail_(`a;b@${SR_DOMAIN}`)).toBe('');
    expect(srVm.normalizeEmail_(`<a@${SR_DOMAIN}>`)).toBe('');
    expect(srVm.normalizeEmail_('a'.repeat(250) + `@${SR_DOMAIN}`)).toBe('');

    // safeRow_ escapes pipe DDE and leading tabs
    expect(srVm.safeRow_(['|cmd', '\t123', '=1+1', 'normal'])).toEqual(["'|cmd", "'\t123", "'=1+1", 'normal']);

    // assertPrivateStorage_ rejects trashed items
    expect(() => srVm.assertPrivateStorage_({
      isTrashed: () => true,
      getSharingAccess: () => srVm.DriveApp.Access.PRIVATE,
      isShareableByEditors: () => false,
      getEditors: () => [],
      getViewers: () => [],
    })).toThrow(/Private school storage/);

    // Portal.html and school-rewards-practice.html share the hardened guards
    for (const rel of ['apps_script/school_rewards/Portal.html', 'school-rewards-practice.html']) {
      const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(html).toContain('Object.prototype.hasOwnProperty.call(shapes,shape)');
      expect(html).toContain('emails=Object.create(null)');
      expect(html).toContain('unique=Object.create(null)');
      expect(html).toContain('[=+\\-@|]');
    }
  });

  it('4-way mirror parity and 3-host SRI / mailbox v32 metadata alignment', () => {
    const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostPaths = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
    const hostTexts = hostPaths.map((p) => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    const manifests = hostTexts.map((t) => bdm.readEmbeddedManifest(t));
    expect(manifests[0].releaseId).toBe(manifests[1].releaseId);
    expect(manifests[1].releaseId).toBe(manifests[2].releaseId);

    const mbGs = fs.readFileSync(path.join(ROOT, 'apps_script/session_mailbox/Code.gs'));
    const mbSha = crypto.createHash('sha256').update(mbGs).digest('hex');
    for (const txt of hostTexts) {
      expect(txt).toContain('const ALLO_MB_SCRIPT_VERSION = 32;');
      expect(txt).toContain(`const ALLO_MB_SCRIPT_SHA256 = '${mbSha}';`);
      expect(txt).toContain(`const ALLO_MB_SCRIPT_BYTES = ${mbGs.length};`);
    }

    const mirrored = [
      'mailbox_script_source_module.js',
      'view_share_session_surfaces_module.js',
      'apps_script/session_mailbox/Code.gs',
      'apps_script/school_rewards/Code.gs',
      'apps_script/school_rewards/Portal.html',
      'school-rewards-practice.html',
    ];
    const mirrorRoots = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of mirrored) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const mr of mirrorRoots) {
        const dest = path.join(ROOT, mr, rel);
        if (fs.existsSync(dest)) {
          expect(fs.readFileSync(dest).equals(rootBuf), `${mr}/${rel} mismatch`).toBe(true);
        }
      }
      if (manifests[0].assets[rel]) {
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        for (const m of manifests) {
          expect(m.assets[rel].integrity).toBe(expectedSri);
          expect(m.assets[rel].bytes).toBe(rootBuf.length);
        }
      }
    }
  });
});
