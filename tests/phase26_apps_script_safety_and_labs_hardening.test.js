import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const sha256File = (rel) => createHash('sha256').update(readFileSync(path.join(ROOT, rel))).digest('hex');

const imageReview = require('../it_coach/image_review.js');
const textCore = require('../text_inquiry/text_inquiry_core.js');
const textSearch = require('../text_inquiry/text_inquiry_search.js');
const alloWorkspace = require('../allo_sheet/allo_sheet_workspace.js');
const alloCasebook = require('../allo_sheet/allo_sheet_casebook.js');
const bdm = require('../dev-tools/build_browser_delivery_manifest.cjs');

function loadGas(relPath, globals) {
  const ctx = vm.createContext({
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
    isNaN,
    ...globals,
  });
  vm.runInContext(read(relPath), ctx, { filename: relPath });
  return ctx;
}

describe('Phase 26 — Track 1: Google Apps Script Backends Hardening', () => {
  it('leadership_hub_backup avoids nested-lock premature release, atomic-rotates, recreates trashed folders, and bounds POST size', () => {
    const props = new Map([['lhb_token', 'tok-initial-1234567890'], ['lhb_folder_id', 'trashed-folder']]);
    let lockDepth = 0;
    let prematureRelease = false;
    let deletedProps = [];
    const createdFiles = [];
    const ctx = loadGas('apps_script/leadership_hub_backup/Code.gs', {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k) => props.get(k) || null,
          setProperty: (k, v) => props.set(k, v),
          deleteProperty: (k) => { deletedProps.push(k); props.delete(k); },
        }),
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => { lockDepth++; return true; },
          releaseLock: () => { lockDepth--; if (lockDepth < 0) prematureRelease = true; },
        }),
      },
      CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
      Utilities: {
        getUuid: () => '12345678-1234-4123-8123-123456789abc',
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' },
        computeDigest: (_a, s) => [...createHash('sha256').update(String(s), 'utf8').digest()],
        formatDate: () => '2026-11-20-0700',
      },
      Session: { getScriptTimeZone: () => 'UTC' },
      Logger: { log: () => {} },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }),
      },
      DriveApp: {
        getFolderById: (id) => {
          if (id === 'trashed-folder') return { getId: () => id, getName: () => 'Old', isTrashed: () => true };
          throw new Error('not found');
        },
        createFolder: (name) => {
          // Outer lock must still be held when creating folder inside save/setup
          expect(lockDepth).toBe(1);
          return {
            getId: () => 'fresh-folder-1',
            getName: () => name,
            isTrashed: () => false,
            getFilesByName: () => ({ hasNext: () => false }),
            createFile: (n, body) => {
              // Lock MUST still be held here (no premature release by lhbFolder_)
              expect(lockDepth).toBe(1);
              createdFiles.push({ n, body });
            },
            getFiles: () => ({ hasNext: () => false }),
          };
        },
      },
    });

    // rotateToken must not delete lhb_token before locking
    ctx.rotateToken();
    expect(deletedProps).toEqual([]);
    expect(props.get('lhb_folder_id')).toBe('fresh-folder-1');
    expect(prematureRelease).toBe(false);

    // Oversized POST body rejected pre-JSON.parse
    const hugeRes = JSON.parse(ctx.doPost({ postData: { contents: 'x'.repeat(4000000 + 5000) } }).text);
    expect(hugeRes).toEqual({ ok: false, error: 'too-large' });

    // Valid save keeps outer lock held through createFile even when folder is recreated from Trash
    props.set('lhb_folder_id', 'trashed-folder');
    const tok = props.get('lhb_token');
    const saveRes = JSON.parse(ctx.doPost({
      postData: { contents: JSON.stringify({ token: tok, action: 'save', payload: { format: 'alloflow-leadership-hub-backup', keys: {} } }) },
    }).text);
    expect(saveRes.ok).toBe(true);
    expect(createdFiles).toHaveLength(1);
    expect(lockDepth).toBe(0);
    expect(prematureRelease).toBe(false);
  });

  it('walkthrough_records blocks multi-recipient emails, enforces empty-file lock-before-write, and allows revoking out-of-domain shares', () => {
    const props = new Map([
      ['wr_admin_token', 'tok-owner-1234567890'],
      ['wr_folder_id', 'folder-1'],
      ['wr_allowed_domain', 'school.org'],
    ]);
    const events = [];
    const folderState = { access: 'PRIVATE', viewers: [], editors: [] };
    const ctx = loadGas('apps_script/walkthrough_records/Code.gs', {
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) || null, setProperty: (k, v) => props.set(k, v) }) },
      CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' },
        computeDigest: (_a, s) => [...createHash('sha256').update(String(s), 'utf8').digest()],
        formatDate: () => '2026-11-20 07:00',
      },
      Session: { getScriptTimeZone: () => 'UTC', getEffectiveUser: () => ({ getEmail: () => 'principal@school.org' }) },
      MimeType: { PLAIN_TEXT: 'text/plain' },
      MailApp: { sendEmail: () => {}, getRemainingDailyQuota: () => 50 },
      ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
      DriveApp: {
        Access: { PRIVATE: 'PRIVATE', ANYONE: 'ANYONE' },
        Permission: { NONE: 'NONE' },
        getFolderById: () => ({
          getId: () => 'folder-1',
          getName: () => 'AlloFlow Walkthrough Records',
          isTrashed: () => false,
          getSharingAccess: () => folderState.access,
          getViewers: () => folderState.viewers,
          getEditors: () => folderState.editors,
          createFile: (_name, initialContent) => {
            events.push(['createFile', initialContent]);
            return {
              getId: () => 'file-1234567890',
              getUrl: () => 'https://drive.google.com/file/d/file-1234567890/view',
              setSharing: () => events.push(['setSharing']),
              setShareableByEditors: () => events.push(['setShareableByEditors']),
              getViewers: () => [],
              getEditors: () => [],
              setContent: (c) => events.push(['setContent', c.length > 0]),
              addViewer: (e) => events.push(['addViewer', e]),
              setTrashed: (t) => events.push(['setTrashed', t]),
            };
          },
        }),
        getFileById: () => ({
          getParents: () => { let done = false; return { hasNext: () => !done, next: () => { done = true; return { getId: () => 'folder-1' }; } }; },
          removeViewer: (e) => events.push(['removeViewer', e]),
          getViewers: () => [],
        }),
      },
    });

    // Multi-recipient comma injection rejected
    expect(ctx.wrEmailOk_('teacher@school.org,evil@attacker.test')).toBe(false);
    expect(ctx.wrEmailOk_('teacher@school.org')).toBe(true);

    // Non-private folder fails closed before file creation
    folderState.access = 'ANYONE';
    const broadRes = ctx.wrDeliver_({
      token: 'tok-owner-1234567890',
      teacherEmail: 'teacher@school.org',
      disclosure: 'Approved feedback.',
      fields: [{ label: 'Notes', text: 'Clear instruction.' }],
      notify: false,
    });
    expect(broadRes.ok).toBe(false);
    expect(broadRes.code).toBe('acl_failed');
    expect(events).toEqual([]);

    // Private folder creates EMPTY file -> locks sharing -> writes content -> adds single viewer
    folderState.access = 'PRIVATE';
    const okRes = ctx.wrDeliver_({
      token: 'tok-owner-1234567890',
      teacherEmail: 'teacher@school.org',
      disclosure: 'Approved feedback.',
      fields: [{ label: 'Notes', text: 'Clear instruction.' }],
      notify: false,
    });
    expect(okRes.ok).toBe(true);
    expect(events).toEqual([
      ['createFile', ''],
      ['setSharing'],
      ['setShareableByEditors'],
      ['setContent', true],
      ['addViewer', 'teacher@school.org'],
    ]);

    // Revoke succeeds even for an out-of-domain recipient (cleanup of accidental external share)
    const revRes = ctx.wrRevoke_({
      token: 'tok-owner-1234567890',
      fileId: 'file-1234567890',
      teacherEmail: 'accidental@gmail.com',
    });
    expect(revRes.ok).toBe(true);
    expect(events[events.length - 1]).toEqual(['removeViewer', 'accidental@gmail.com']);
  });

  it('educator_evaluation_share blocks invalid/rollover dates, comma emails, and non-owner revocations before mutating Drive', () => {
    let removedCalls = 0;
    const ctx = loadGas('apps_script/educator_evaluation_share/Code.gs', {
      Session: {
        getActiveUser: () => ({ getEmail: () => 'eval@school.org' }),
        getEffectiveUser: () => ({ getEmail: () => 'eval@school.org' }),
      },
      Drive: {
        Permissions: {
          create: () => {},
          list: () => ({ permissions: [{ id: 'p1', type: 'user', emailAddress: 't@school.org', role: 'reader' }] }),
          remove: () => { removedCalls++; },
        },
      },
      DriveApp: {
        getFileById: () => ({
          isTrashed: () => false,
          getOwner: () => ({ getEmail: () => 'someone-else@school.org' }),
          getDescription: () => 'ALLOFLOW_EVALUATION_SHARE_V3:' + JSON.stringify({ fileId: 'file-1234', packetId: 'pkt-1', sharedWith: 't@school.org' }),
        }),
      },
    });

    expect(() => ctx.eeEmail_('t@school.org,other@school.org', 'Email')).toThrow();
    expect(() => ctx.eeExpiryDate_('2026-02-31')).toThrow(/not a real date/i);
    expect(() => ctx.revokeEvaluationAccessLocked_({ fileId: 'file-1234', educatorEmail: 't@school.org' })).toThrow(/not owned/i);
    expect(removedCalls).toBe(0);
    expect(read('apps_script/educator_evaluation_share/Index.html')).toContain('emailParts.length !== 2');
  });
});

describe('Phase 26 — Track 2: AlloSheet Casebook & Workspace, Text Inquiry & IT Coach', () => {
  it('it_coach/image_review catches string-typed masks in mapTarget and guards invalid compose sources', () => {
    const blocked = imageReview.mapTarget(
      { x: 0.2, y: 0.2, w: 0.1, h: 0.1 },
      null,
      [{ x: '0.15', y: '0.15', w: '0.2', h: '0.2' }],
    );
    expect(blocked).toBeNull();
    expect(imageReview.mapTarget({ x: 0.5, y: 0.5, w: 0.25, h: 0.25 }, null, 'not-an-array')).toEqual({ x: 0.5, y: 0.5, w: 0.25, h: 0.25 });
    expect(imageReview.compose({ width: 0, height: 100 }, null, [])).toBeNull();
    expect(Object.isFrozen(imageReview)).toBe(true);
  });

  it('text_inquiry_core bounds/sanitizes control chars and handles malformed options cleanly', () => {
    expect(textCore.cleanText('hi\u0000there\u0007', -5)).toBe('hi there');
    const analysis = textCore.analyzeText('Alpha beta alpha gamma.', { stopwords: 'not-an-array', topTermLimit: Infinity });
    expect(analysis.wordCount).toBe(4);
    expect(textCore.concordance({ sentences: [null, 42, 'Alpha beta.'] }, 'alpha', 5)).toHaveLength(1);
    expect(textCore.stableSourceId('not-an-array')).toMatch(/^text-[0-9a-f]{8}$/);
  });

  it('text_inquiry_search allowlists metadata signals, rejects credentialed URLs, and redacts linearly', async () => {
    // ReDoS check on long dot-repeated pseudo-email (offline sandbox so zero network latency)
    const offlineBox = { URL, navigator: { onLine: false }, setTimeout, clearTimeout, AbortController };
    vm.runInNewContext(read('text_inquiry/text_inquiry_search.js'), offlineBox);
    const t0 = Date.now();
    await expect(offlineBox.AlloFlowTextInquirySearch.search('a@' + 'a.'.repeat(4000) + '!')).rejects.toThrow(/offline/i);
    expect(Date.now() - t0).toBeLessThan(150);

    // Embedded credentials rejected
    await expect(textSearch.verifyMetadata('https://user:pass@example.org/page')).rejects.toThrow(/HTTP or HTTPS/i);

    // Verify metadata signals allowlist drops arbitrary/prototype properties
    const fetchMock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        finalUrl: 'https://example.org/doc',
        metadata: {
          title: 'Doc',
          signals: { jsonLd: 1, evilInjected: 'payload', constructor: { polluted: true } },
        },
      }),
    });
    const sandbox = { URL, fetch: fetchMock, setTimeout, clearTimeout, AbortController };
    vm.runInNewContext(read('text_inquiry/text_inquiry_search.js'), sandbox);
    const verified = await sandbox.AlloFlowTextInquirySearch.verifyMetadata('https://example.org/doc');
    expect(verified.metadata.signals).toEqual({
      jsonLd: true,
      citationMeta: false,
      canonical: false,
      doi: false,
      isbn: false,
    });
  });

  it('allo_sheet_workspace rejects __proto__ at JSON parse time and allo_sheet_casebook guards Infinity/slashes/prototypes', () => {
    expect(() => alloWorkspace.decode('{"__proto__":{"polluted":true}}')).toThrow(/blocked property name/i);
    expect(() => alloWorkspace.fromLocalTables({
      workspace: { id: 'w1', title: 'W', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z', modifiedTableIds: [] },
      origin: { kind: 'local-csv', label: 'Local' },
      tables: [{}, {}, {}, {}, {}, {}],
    })).toThrow(/at most/i);

    const parsed = alloCasebook.parseNarrative('score 1e999', [
      { key: 'score', label: 'Score', type: 'number', unit: '', minimum: 0, maximum: 100, aliases: ['score'] },
    ]);
    expect(parsed.values.score).toBeNull();

    const tables = alloCasebook.buildTables({
      title: 'Lab',
      caseLabel: 'Trial/Group',
      description: 'Test',
      privacyMode: 'non-sensitive',
      cases: ['A1'],
      parameters: [{ key: 'rate', label: 'A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z', type: 'number', unit: 'm/s', minimum: 0, maximum: 10, prompt: '', aliases: ['rate'] }],
    });
    const casesTable = tables.find((t) => t.id === 'casebook_cases');
    expect(casesTable.columns.every((c) => !/[\\/]/.test(c))).toBe(true);
    const obsTable = tables.find((t) => t.id === 'casebook_observations');
    expect(obsTable.columns.every((c) => c.length <= 160)).toBe(true);

    // allo_sheet.html removes invalid meta frame-ancestors and drops clipboard-read
    const html = read('allo_sheet/allo_sheet.html');
    expect(html).not.toContain('frame-ancestors');
    expect(html).not.toContain('clipboard-read');
  });
});

describe('Phase 26 — Track 3: SEL Safety, OpenGroove Audio/Scheduler & Standalone Entry', () => {
  it('sel_safety_layer catches curly-apostrophe, zero-width, fullwidth, diacritic, and idiom-prefixed crisis disclosures', () => {
    const win = { console };
    vm.runInNewContext(read('sel_hub/sel_safety_layer.js'), { window: win, globalThis: win, console });
    const scan = win.SelHub.scanForCrisis;

    for (const phrase of [
      'I don\u2019t want to live anymore',
      'I am thinking about s\u200Buicide',
      'I want to k\u200Bill myself',
      'ｓｕｉｃｉｄｅ',
      'su\u0301icide',
      'I want to kill\nmyself',
      'gonna kill this test then kill myself',
      'dying laughing jk I want to die',
    ]) {
      expect(scan(phrase).triggered, `must detect: ${JSON.stringify(phrase)}`).toBe(true);
    }
    expect(scan('gonna kill this homework today').triggered).toBe(false);
    expect(scan('dying laughing at that joke').triggered).toBe(false);

    // Prototype collision guards on _registry
    expect(win.SelHub.isRegistered('toString')).toBe(false);
    expect(win.SelHub.renderTool('constructor', {})).toBeNull();
    win.SelHub.registerTool('__proto__', { render: () => 'bad' });
    expect(win.SelHub.isRegistered('__proto__')).toBe(false);

    // safeRehearseCheck survives throwing checker and null flags
    win.SafetyContentChecker = { check: () => { throw new Error('boom'); } };
    expect(win.SelHub.safeRehearseCheck('hello')).toEqual({ action: 'continue', severity: 'none', flag: null });
    win.SafetyContentChecker = { check: () => [null, { severity: 'critical', match: 'x' }] };
    expect(win.SelHub.safeRehearseCheck('hello').action).toBe('block');
  });

  it('open_groove_scheduler prevents infinite loops/divide-by-zero and open_groove_audio bounds NaN/Infinity & reuses noise buffer', () => {
    const ogRoot = { console, setTimeout: () => 1 };
    vm.runInNewContext(read('music_studio/open_groove_core.js'), { window: ogRoot, globalThis: ogRoot, console });
    vm.runInNewContext(read('music_studio/open_groove_scheduler.js'), { window: ogRoot, globalThis: ogRoot, console });
    vm.runInNewContext(read('music_studio/open_groove_audio.js'), { window: ogRoot, globalThis: ogRoot, console });

    const project = ogRoot.OpenGrooveCore.ogCreateProject();
    expect(ogRoot.OpenGrooveScheduler.ogStepTicks(project, Infinity)).toBeGreaterThanOrEqual(1);

    const t0 = Date.now();
    const loopPlan = ogRoot.OpenGrooveScheduler.ogBuildLoopPlaybackPlan(project, { transportTick: Infinity, lookaheadTicks: Infinity });
    expect(Array.isArray(loopPlan)).toBe(true);
    expect(Date.now() - t0).toBeLessThan(150);

    // Audio engine: invalid enums, NaN sustain, Infinity duration, and noise buffer caching
    let bufferCount = 0;
    const paramCalls = [];
    const mkParam = () => ({
      value: 0,
      setValueAtTime(v, t) {
        if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError('Non-finite audio param');
        paramCalls.push(['set', v, t]);
      },
      exponentialRampToValueAtTime(v, t) {
        if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError('Non-finite audio param');
        paramCalls.push(['exp', v, t]);
      },
      linearRampToValueAtTime(v, t) {
        if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError('Non-finite audio param');
        paramCalls.push(['lin', v, t]);
      },
    });
    const fakeCtx = {
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      createGain: () => ({ gain: mkParam(), connect() {}, disconnect() {} }),
      createWaveShaper: () => ({ curve: null, oversample: '', connect() {}, disconnect() {} }),
      createBiquadFilter: () => ({ type: 'lowpass', frequency: mkParam(), Q: mkParam(), connect() {}, disconnect() {} }),
      createOscillator: () => ({ type: 'sine', frequency: mkParam(), detune: mkParam(), connect() {}, start() {}, stop() {}, disconnect() {} }),
      createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() {}, stop() {}, disconnect() {} }),
      createBuffer: (_ch, frames) => { bufferCount++; return { duration: frames / 44100, getChannelData: () => new Float32Array(frames) }; },
    };
    const engine = ogRoot.OpenGrooveAudio.ogCreateAudioEngine({ context: fakeCtx });
    expect(ogRoot.OpenGrooveAudio.ogPlayNote(engine, {
      midi: 60,
      velocity: 0.8,
      instrument: {
        oscillator: 'bogus_type',
        filter: { type: 'bogus_filter', cutoff: Infinity, q: NaN },
        envelope: { attack: 0.5, decay: 0.5, sustain: NaN, release: 0.1 },
      },
    }, Infinity, 0.05)).toBe(true);

    // Multiple drum hits reuse the single cached noise AudioBuffer for this AudioContext
    ogRoot.OpenGrooveAudio.ogPlayDrum(engine, 'snare', 0, 0.8);
    ogRoot.OpenGrooveAudio.ogPlayDrum(engine, 'clap', 0.1, 0.8);
    expect(bufferCount).toBe(1);
    expect(ogRoot.OpenGrooveAudio.ogClearSessionSamples()).toBe(true);
  });

  it('walkthrough-copilot.html and mirrored deliverables maintain CSP, 4-way mirror parity, and valid SRI manifests', () => {
    const wcHtml = read('walkthrough-copilot.html');
    expect(wcHtml).toContain("frame-src 'none'");
    expect(wcHtml).toContain("base-uri 'none'");
    expect(wcHtml).toContain("form-action 'none'");
    expect(wcHtml).toContain('noindex, nofollow');

    const mirrored = [
      'sel_hub/sel_safety_layer.js',
      'music_studio/open_groove_scheduler.js',
      'music_studio/open_groove_audio.js',
      'classroom_import_app.js',
      'walkthrough_copilot_standalone.js',
      'it_coach/image_review.js',
      'text_inquiry/text_inquiry_core.js',
      'text_inquiry/text_inquiry_search.js',
      'allo_sheet/allo_sheet.html',
      'allo_sheet/allo_sheet_workspace.js',
      'allo_sheet/allo_sheet_casebook.js',
      'allo_sheet/allo_sheet_casebook_ui.js',
      'apps_script/walkthrough_records/Code.gs',
      'apps_script/educator_evaluation_share/Code.gs',
      'apps_script/educator_evaluation_share/Index.html',
      'walkthrough_script_source_module.js',
    ];
    for (const rel of mirrored) {
      const rootHash = sha256File(rel);
      for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        expect(sha256File(`${dir}/${rel}`), `${dir}/${rel} parity`).toBe(rootHash);
      }
    }

    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const manifest = bdm.readEmbeddedManifest(read(host));
      for (const rel of mirrored) {
        if (!Object.prototype.hasOwnProperty.call(manifest.assets, rel)) continue;
        const buf = readFileSync(path.join(ROOT, rel));
        const expectedSri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(manifest.assets[rel], `${host} pin for ${rel}`).toEqual({ bytes: buf.length, integrity: expectedSri });
      }
    }
  });
});
