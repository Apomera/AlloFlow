import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const sha256 = (rel) => createHash('sha256').update(readFileSync(resolve(ROOT, rel))).digest('hex');

describe('Round 12 (Waves 42-44) hardening regressions', () => {
  it('Wave 42: school_rewards/Code.gs protects formula-prefixed hashes, FAILED MailOutbox redaction, PII error hygiene & ID validation', () => {
    const src = read('apps_script/school_rewards/Code.gs');
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
      isFinite,
    };
    vm.runInNewContext(src, ctx);

    // logicalCell_ strips single formula-escape apostrophe consistently across real & mock Sheets
    expect(ctx.logicalCell_("'+12 units delivered")).toBe('+12 units delivered');
    expect(ctx.logicalCell_('+12 units delivered')).toBe('+12 units delivered');
    expect(ctx.logicalCell_("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(ctx.logicalCell_("'|cmd")).toBe('|cmd');
    expect(ctx.logicalCell_('normal')).toBe('normal');

    // mailSafeErrorText_ redacts leaked recipient emails
    expect(ctx.mailSafeErrorText_(new Error('Invalid email: student.one@school.edu failed'))).not.toContain('student.one@school.edu');
    expect(ctx.mailSafeErrorText_(new Error('Invalid email: student.one@school.edu failed'))).toContain('[redacted-email]');

    // normalizeCategory_ and normalizeWindow_ reject prototype/formula custom IDs
    expect(() => ctx.normalizeCategory_({ id: '__proto__', name: 'Test' })).toThrow();
    expect(() => ctx.normalizeCategory_({ id: '=HYPERLINK()', name: 'Test' })).toThrow();
    expect(() => ctx.normalizeWindow_({ id: 'constructor', name: 'Fall' })).toThrow();
    expect(ctx.normalizeCategory_({ id: 'cat_valid_1234', name: 'Kindness' }).id).toBe('cat_valid_1234');
    expect(ctx.normalizeWindow_({ id: 'win_valid_1234', name: 'Fall' }).id).toBe('win_valid_1234');

    // Redaction preserves SR_REDACTED_TEXT on FAILED MailOutbox rows and scrubs Receipts.Error & Preferences
    expect(src).toContain("['Receipts', 'StudentId', { RecipientEmail: '', Error: '' }]");
    expect(src).toContain("var expectedNote = delivery.status === 'FAILED' ? SR_REDACTED_TEXT : '';");
    expect(src).toContain("if (book.getSheetByName('Preferences'))");
    expect(src).toContain('var totals = Object.create(null)');
  });

  it('Wave 42: session_mailbox/Code.gs locks folder creation & retention writes, restricts escapeRoomState.teamProgress, and fixes origin-only relative redirects', () => {
    const src = read('apps_script/session_mailbox/Code.gs');
    const ctx = { console, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error };
    vm.runInNewContext(src, ctx);

    // Non-escape / inactive session must NOT allow participant patch to escapeRoomState.teamProgress
    expect(ctx.participantCanPatchSession({ 'escapeRoomState.teamProgress.hack': { a: 1 } }, 'u1', { roster: { u1: {} } })).toBe(false);
    expect(ctx.participantCanPatchSession({ 'escapeRoomState.teamProgress.hack': { a: 1 } }, 'u1', { escapeRoomState: { isActive: false } })).toBe(false);
    // Active legacy escape room still allows escapeRoomState.teamProgress
    expect(ctx.participantCanPatchSession({ 'escapeRoomState.teamProgress.Red': { step: 2 } }, 'u1', { escapeRoomState: { mode: 'escape-room', isActive: true } })).toBe(true);

    // deliveryFolder fails closed on lock timeout (no unlocked fallback createFolder)
    const deliveryBody = src.slice(src.indexOf('function deliveryFolder()'), src.indexOf('function safeFileName('));
    expect(deliveryBody).toContain('if (!lock.tryLock(5000))');
    expect(deliveryBody).toContain("throw new Error('Delivery folder initialization is busy");
    expect(deliveryBody.match(/createFolder\(/g)?.length).toBe(1);

    // packFolder uses LockService
    const packBody = src.slice(src.indexOf('function packFolder()'), src.indexOf('function saveTokenNote('));
    expect(packBody).toContain('LockService.getScriptLock');
    expect(packBody).toContain('lock.releaseLock()');

    // Origin-only relative redirect resolution preserves host
    expect(src).toContain("var basePath = currentUrl.slice(baseOrigin.length).replace(/[?#].*$/, '');");
    expect(src).toContain("var dirPath = basePath.indexOf('/') === 0 ? basePath.replace(/[^\\/]*$/, '') : '/';");
  });

  it('Wave 42: leadership_hub_backup, educator_evaluation_share & walkthrough_records fix burst pruning, lock safety, bucketed rate limits & editor revocation', () => {
    // leadership_hub_backup: burst pruning keeps newest (-59999.json) over older (.json)
    const lhbSrc = read('apps_script/leadership_hub_backup/Code.gs');
    const lhbCtx = { console, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error };
    vm.runInNewContext(lhbSrc, lhbCtx);

    const trashed = [];
    const makeFile = (name, ts) => ({
      getName: () => name,
      getDateCreated: () => new Date(ts),
      setTrashed: (v) => { if (v) trashed.push(name); },
    });
    const fakeFiles = [];
    for (let i = 0; i < 60; i++) {
      const mm = String(i).padStart(2, '0');
      fakeFiles.push(makeFile(`alloflow-leadership-hub-backup-2026-11-20-10${mm}.json`, 1700000000000 + i * 60000));
    }
    // Same-minute burst on minute 59: older is ...-1059.json, newer is ...-1059-59999.json
    fakeFiles.push(makeFile('alloflow-leadership-hub-backup-2026-11-20-1059-59999.json', 1700000000000 + 59 * 60000 + 59999));
    let idx = 0;
    const pruned = lhbCtx.lhbPrune_({
      getFiles: () => ({ hasNext: () => idx < fakeFiles.length, next: () => fakeFiles[idx++] }),
    });
    expect(pruned).toBe(1);
    expect(trashed).toEqual(['alloflow-leadership-hub-backup-2026-11-20-1059.json']);
    expect(lhbSrc).toContain("var authBucketKey = 'lhb_auth_fail:' + Math.floor(Date.now() / 60000);");

    // educator_evaluation_share: verifyShareHelper acquires eeWithLock_
    const eesSrc = read('apps_script/educator_evaluation_share/Code.gs');
    const verifyBlock = eesSrc.slice(eesSrc.indexOf('function verifyShareHelper()'));
    expect(verifyBlock).toContain('eeWithLock_(function () { return eeRootFolder_(); })');

    // walkthrough_records: fixed bucket rate limit + editor revocation & verification
    const wrSrc = read('apps_script/walkthrough_records/Code.gs');
    expect(wrSrc).toContain("return 'wr:auth_fail:' + Math.floor(Date.now() / 900000);");
    expect(wrSrc).toContain('file.removeEditor(teacherEmail)');
    expect(wrSrc).toContain('file.getEditors()');
  });

  it('Wave 43: nginx blocks real PocketBase pbc_* / _* system collections and /truncate, and PocketBase migration works with v0.23+ typed fields & backtick indexes', () => {
    for (const rel of ['docker/nginx.conf', 'desktop/schoolbox/nginx.conf']) {
      const conf = read(rel);
      const match = conf.match(/location ~\*\s+(\^\/api\/pocketbase\/\(\?:collections\/\?\$\|[^\s]+)\s*\{/);
      expect(match, `${rel} PocketBase collections regex`).toBeTruthy();
      const re = new RegExp(match[1], 'i');
      expect(re.test('/api/pocketbase/collections')).toBe(true);
      expect(re.test('/api/pocketbase/collections/pbc_3142635823/auth-with-password')).toBe(true);
      expect(re.test('/api/pocketbase/collections/_mfas/records')).toBe(true);
      expect(re.test('/api/pocketbase/collections/_otps')).toBe(true);
      expect(re.test('/api/pocketbase/collections/sessions/truncate')).toBe(true);
      expect(re.test('/api/pocketbase/collections/sessions/records')).toBe(false);
    }

    // PocketBase v0.23+ migration with ONLY TextField/JSONField (no generic Field global) + backtick-quoted SQLite indexes
    const migSrc = read('docker/pocketbase/pb_migrations/1731974400_alloflow_collections.js');
    expect(sha256('desktop/schoolbox/pocketbase/pb_migrations/1731974400_alloflow_collections.js')).toBe(
      sha256('docker/pocketbase/pb_migrations/1731974400_alloflow_collections.js')
    );
    const cols = new Map();
    const list = [{ name: 'app_id', type: 'text' }];
    cols.set('sessions', {
      name: 'sessions',
      fields: {
        _list: list,
        getByName: (n) => list.find((f) => f.name === n) || null,
        add: (f) => list.push(f),
      },
      indexes: [
        'CREATE INDEX `idx_sessions_code` ON `sessions` (`code`)',
        'CREATE INDEX `idx_sessions_app` ON `sessions` (`app_id`)',
      ],
    });
    let upFn = null;
    vm.runInNewContext(migSrc, {
      migrate: (up) => { upFn = up; },
      Collection: function Collection(def) { Object.assign(this, def); },
      TextField: function TextField(def) { this._kind = 'TextField'; Object.assign(this, def); },
      JSONField: function JSONField(def) { this._kind = 'JSONField'; Object.assign(this, def); },
      // Deliberately NO Field global (matches real PocketBase v0.23+ JSVM)
    });
    upFn({
      findCollectionByNameOrId: (name) => cols.get(name) || null,
      save: (col) => { cols.set(col.name, col); },
    });
    const sessions = cols.get('sessions');
    expect(sessions.fields.getByName('owner_id')._kind).toBe('TextField');
    expect(sessions.fields.getByName('content')._kind).toBe('JSONField');
    // Backtick-quoted idx_sessions_code and idx_sessions_app must NOT be duplicated
    expect(sessions.indexes.length).toBe(3);
  });

  it('Wave 44: all 6 Life Skills 3D labs harden postMessage origin trust, high-contrast theme, A-Frame text/labels, and ARIA structure', () => {
    const allSix = [
      'life_skills_capstone/life_skills_capstone.html',
      'life_skills_kitchen/life_skills_kitchen.html',
      'life_skills_laundry/life_skills_laundry.html',
      'life_skills_repair/life_skills_repair.html',
      'life_skills_safety/life_skills_safety.html',
      'life_skills_transit/life_skills_transit.html',
    ];
    for (const rel of allSix) {
      const html = read(rel);
      expect(html, `${rel} must never fall back to wildcard targetOrigin`).not.toContain("return '*';");
      expect(html, `${rel} must validate parentOrigin/host query param`).toContain("params.get('parentOrigin') || params.get('host')");
      expect(html, `${rel} must fail closed on null/empty event.origin`).toContain("if (!event.origin || event.origin === 'null' || !isTrustedOpenerOrigin(event.origin)) return;");
      expect(html, `${rel} must pin verifiedOpenerOrigin`).toContain('if (verifiedOpenerOrigin && event.origin !== verifiedOpenerOrigin) return;');
      expect(html, `${rel} must narrow usercontent.goog to scf.usercontent.goog`).not.toContain("host.endsWith('.usercontent.goog')");
      expect(html, `${rel} must define high-contrast theme`).toContain(':root[data-theme="contrast"]');
      expect(html, `${rel} must untab WebGL canvas`).toContain("canvas.setAttribute('tabindex', '-1')");
    }

    // Capstone specific fixes
    const cap = read('life_skills_capstone/life_skills_capstone.html');
    expect(cap).toContain('<a-text id="sceneNote"');
    expect(cap).toContain('<a-text id="label-stove"');
    expect(cap).toContain('textarea:focus-visible');
    expect(cap).toContain('aria-controls="hintText"');
    expect(cap).toContain('function evidenceMetaFor(key)');
    expect(cap).toContain("if (data.type === 'alloflow-theme-change') setTheme(data.theme);");

    // 4 foundation labs reset 3D label text in renderScene()
    for (const rel of [
      'life_skills_kitchen/life_skills_kitchen.html',
      'life_skills_laundry/life_skills_laundry.html',
      'life_skills_repair/life_skills_repair.html',
      'life_skills_transit/life_skills_transit.html',
    ]) {
      expect(read(rel)).toContain("else label.setAttribute('value', task.label);");
    }

    // Repair HTML attributes must not have stray double backslashes
    const rep = read('life_skills_repair/life_skills_repair.html');
    expect(rep).not.toContain('value="Shut water off\\\\nbefore');
    expect(rep).not.toContain('value="GAS SMELL\\\\nSPARKS');

    // Host launcher passes parentOrigin
    expect(read('stem_lab/stem_tool_lifeskills.js')).toContain("extra += '&parentOrigin=' + encodeURIComponent(origin);");
  });

  it('Wave 44: life_skills_outing engine.js & outing.js isolate per-learner storage and guard null arrival / null activeElement', () => {
    const engine = require(resolve(ROOT, 'life_skills_outing/engine.js'));
    const storeMap = new Map();
    const fakeStorage = {
      get length() { return storeMap.size; },
      key: (i) => Array.from(storeMap.keys())[i] ?? null,
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => { storeMap.set(k, String(v)); },
    };

    const runA = engine.createRun({ runId: 'run-a', context: 'work' });
    const runB = engine.createRun({ runId: 'run-b', context: 'community' });
    const runGlobal = engine.createRun({ runId: 'run-g', context: 'community' });

    expect(engine.saveRun(fakeStorage, runA, 'student_a').ok).toBe(true);
    expect(engine.saveRun(fakeStorage, runB, 'student_b').ok).toBe(true);
    expect(engine.saveRun(fakeStorage, runGlobal).ok).toBe(true);

    // Student A only sees Student A; Student B only sees Student B; unscoped only sees unscoped
    expect(engine.listRuns(fakeStorage, 'student_a').map((e) => e.run.runId)).toEqual(['run-a']);
    expect(engine.listRuns(fakeStorage, 'student_b').map((e) => e.run.runId)).toEqual(['run-b']);
    expect(engine.listRuns(fakeStorage).map((e) => e.run.runId)).toEqual(['run-g']);
    expect(() => engine.readRun(fakeStorage, engine.saveKey(runA, 'student_a'), 'student_b')).toThrow();
    expect(() => engine.readRun(fakeStorage, engine.saveKey(runA, 'student_a'))).toThrow();

    const outingSrc = read('life_skills_outing/outing.js');
    expect(outingSrc).toContain("var learnerScope = String(urlParams.get('learner') || '')");
    expect(outingSrc).toContain('focused && focused.isConnected');
  });

  it('Round 12: 4-way SHA-256 mirror parity across all 15 mirrored browser deliverables', () => {
    const deliverables = [
      'mailbox_script_source_module.js',
      'walkthrough_script_source_module.js',
      'apps_script/school_rewards/Code.gs',
      'apps_script/session_mailbox/Code.gs',
      'apps_script/educator_evaluation_share/Code.gs',
      'apps_script/walkthrough_records/Code.gs',
      'life_skills_capstone/life_skills_capstone.html',
      'life_skills_kitchen/life_skills_kitchen.html',
      'life_skills_laundry/life_skills_laundry.html',
      'life_skills_repair/life_skills_repair.html',
      'life_skills_safety/life_skills_safety.html',
      'life_skills_transit/life_skills_transit.html',
      'life_skills_outing/engine.js',
      'life_skills_outing/outing.js',
      'stem_lab/stem_tool_lifeskills.js',
    ];
    const mirrorRoots = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of deliverables) {
      const rootDigest = sha256(rel);
      for (const mr of mirrorRoots) {
        const dest = `${mr}/${rel}`;
        expect(existsSync(resolve(ROOT, dest)), `${dest} exists`).toBe(true);
        expect(sha256(dest), `${dest} SHA-256 parity`).toBe(rootDigest);
      }
    }
  });
});
