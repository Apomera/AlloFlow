import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const sha256 = (rel) => createHash('sha256').update(readFileSync(resolve(root, rel))).digest('hex');

const ROUND17_MIRRORED_DELIVERABLES = [
  // Wave 57 (11)
  'utils_pure_module.js',
  'concept_map_handlers_module.js',
  'anchor_charts_module.js',
  'math_helpers_module.js',
  'adaptive_controller_module.js',
  'persona_session_artifact_module.js',
  'udl_chat_module.js',
  'annotation_inquiry_bridge.js',
  'annotation_suite_module.js',
  'view_simplified_module.js',
  'lesson_revision_service.js',
  // Wave 58 (5)
  'packets-make.js',
  'packets-pictures.js',
  'packets-read-along.js',
  'packets-vocab.js',
  'word_sounds_packet_builder.js',
  // Wave 59 (9)
  'concept_quest_solo_module.js',
  'connected_escape_room_engine.js',
  'connected_escape_room_module.js',
  'arcade_mode_boss_encounter.js',
  'arcade_mode_concept_atlas.js',
  'arcade_mode_modelun.js',
  'arcade_mode_realm_builder.js',
  'stem_lab/stem_tool_epidemic.js',
  'stem_lab/stem_tool_anatomy.js',
];

const MIRROR_ROOTS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

describe('Round 17 — Wave 57: Desktop Managers & Core Helpers Hardening', () => {
  it('local-image-manager.cjs rejects UNC/control-char paths, tolerates missing arg objects, and validates model id', async () => {
    const mgr = require(resolve(root, 'desktop/runtime/local-image-manager.cjs'));
    expect(() => mgr.composePlan('start')).toThrow(/Absolute stack\/config paths are required/);
    expect(() => mgr.composePlan('start', {
      composeFile: '\\\\evil-host\\share\\docker-compose.yml',
      envFile: 'C:\\alloflow\\.env',
      projectName: 'alloflow-img',
    })).toThrow(/Absolute stack\/config paths are required/);
    expect(() => mgr.composePlan('start', {
      composeFile: '//evil-host/share/docker-compose.yml',
      envFile: '/opt/alloflow/.env',
      projectName: 'alloflow-img',
    })).toThrow(/Absolute stack\/config paths are required/);
    expect(() => mgr.composePlan('start', {
      composeFile: 'C:\\alloflow\\compose.yml\n--bad',
      envFile: 'C:\\alloflow\\.env',
      projectName: 'alloflow-img',
    })).toThrow(/Absolute stack\/config paths are required/);

    const emptyPreflight = mgr.preflight();
    expect(emptyPreflight.eligible).toBe(false);
    expect(emptyPreflight.issues.length).toBeGreaterThan(0);

    const instance = mgr.createLocalImageManager({
      run: async () => ({ code: 0 }),
      readSetup: async () => ({
        paths: { composeFile: 'C:\\alloflow\\compose.yml', envFile: 'C:\\alloflow\\.env', projectName: 'alloflow' },
        model: { id: '   ', revision: 'a'.repeat(40) },
      }),
      probe: async () => ({
        status: 'ok',
        backend: 'sana-sprint',
        model: '   ',
        revision: 'a'.repeat(40),
        offline: true,
        device: 'cuda',
        txt2img: true,
      }),
      verifyOwnership: async () => true,
    });
    const refreshed = await instance.refresh();
    expect(refreshed.phase).toBe('needs-restart');
    expect(refreshed.ready).toBe(false);
  });

  it('allosheet-grist-bootstrap.cjs validates asar entrypoint, loopback APP_HOME_URL, and scrubs credentials', () => {
    const src = read('desktop/runtime/allosheet-grist-bootstrap.cjs');
    expect(src).toContain('validateServerEntrypoint');
    expect(src).toContain('validateLoopbackHomeUrl');
    expect(src).toContain('scrubCredentialText');
    expect(src).toContain('app.asar');
    expect(src).toContain('electron_key=[REDACTED]');
    expect(src).toContain('ElectronLoginSystem.instance');
    expect(src).toContain('process.send({');
    expect(src).toContain("process.once('disconnect'");
    expect(src).not.toContain('process.env.ELECTRON_KEY');
  });

  it('UtilsPure hardens unflattenObject, SSRF host checks, SVG diagram bounds, and private storage keys', async () => {
    loadAlloModule('utils_pure_module.js');
    const up = window.AlloModules.UtilsPure;

    const clean = up.unflattenObject({
      '__proto__.polluted': 'yes',
      'constructor.prototype.pwn': 'yes',
      'safe.toString': 'keep-me',
    });
    expect(({}).polluted).toBeUndefined();
    expect(clean.safe.toString).toBe('keep-me');

    const hugeSvg = up._renderDiagramSvg('numberline', { range: { min: 0, max: 1e18 } });
    expect(hugeSvg).toContain('Preview unavailable');

    for (const badUrl of [
      'http://metadata/latest/meta-data/',
      'http://[::ffff:0:127.0.0.1]/secret',
      'http://[64:ff9b:1::1]/secret',
      'http://[2002:7f00:0001::1]/secret',
    ]) {
      await expect(up.fetchAndCleanUrl(badUrl, null)).rejects.toThrow();
    }

    const src = read('utils_pure_source.jsx');
    expect(src).toContain("key === 'alloflow_reading_places_v1'");
    expect(src).toContain('if (geminiCaller && cloudAiOk)');
  });

  it('AnnotationInquiryBridge redacts compact phone numbers, rejects credentialed URLs, and clones/redacts suite payloads', () => {
    const bridge = require(resolve(root, 'annotation_inquiry_bridge.js'));
    const hRes = bridge.createHandoff({
      source: {
        title: 'Call (555)123-4567 today',
        stableUrl: 'https://user:pass@example.org/doc?a="b"',
      },
      excerpts: [{ sentenceIndex: 1, excerpt: 'Reach me at (555)123-4567 for details.' }],
    });
    expect(hRes.ok).toBe(true);
    expect(hRes.handoff.source.title).toContain('[phone omitted]');
    expect(hRes.handoff.source.stableUrl).toBe('');
    expect(hRes.handoff.excerpts[0].excerpt).toContain('[phone omitted]');

    const rawUntrusted = {
      id: 'note-1',
      kind: 'note',
      inquiryStance: 'supports',
      content: 'Email student@school.edu or call (555)123-4567 immediately.',
      authorName: 'alice@school.edu',
      evilInjectedProp: '<script>alert(1)</script>',
      inquiryTarget: {
        handoffId: hRes.handoff.handoffId,
        excerptId: 'excerpt-1',
        excerpt: 'student@school.edu text',
      },
    };
    const payload = bridge.toAnnotationSuitePayload(hRes.handoff, [rawUntrusted]);
    expect(payload.annotations).toHaveLength(1);
    expect(payload.annotations[0].content).toContain('[email omitted]');
    expect(payload.annotations[0].content).toContain('[phone omitted]');
    expect(payload.annotations[0].authorName).toContain('[email omitted]');
    expect(payload.annotations[0].evilInjectedProp).toBeUndefined();
    expect(payload.annotations[0].inquiryTarget.excerpt).toContain('[email omitted]');
  });

  it('reader_place_store.js & reader_support_drafts.js reject invalid patch shapes/indices and clear pending on unregister/throw', async () => {
    const storeSrc = read('reader_place_store.js');
    const createReadingPlaceStore = new Function(`${storeSrc}\nreturn createReadingPlaceStore;`)();
    const store = createReadingPlaceStore({ getStorage: () => window.localStorage });
    const scope = { learner: '', itemId: 'item-1', fingerprint: 'fp-1', text: 'Sample text.' };
    await store.save(scope, {
      paragraph: 2,
      snippet: 'hello',
      injectedKey: 'should-not-land',
      bookmark: { paragraph: -1, snippet: 'bad' },
      responses: {
        __proto__: { mainIdea: 'bad' },
        badKey: { mainIdea: 'bad' },
        0: { mainIdea: 'valid idea' },
      },
    });
    const peeked = store.peek(scope);
    expect(peeked.place.paragraph).toBe(2);
    expect(peeked.place.injectedKey).toBeUndefined();
    expect(peeked.place.bookmark).toBeUndefined();
    expect(Object.keys(peeked.place.responses)).toEqual(['0']);

    const badRec = store.changeRecovery(scope, { scopeKey: '', index: -1, token: '' }, 'remove');
    expect(badRec.reason).toBe('recovery-changed');

    const drafts = require(resolve(root, 'reader_support_drafts.js'));
    const session = drafts.createSession();
    const unregister = session.register({
      hasChanges: () => true,
      defer: () => { throw new Error('defer-boom'); },
    });
    expect(() => session.request(() => {})).toThrow(/defer-boom/);
    unregister();
    let ran = false;
    session.request(() => { ran = true; });
    expect(ran).toBe(true);
  });

  it('LessonRevision & PersonaSessionArtifact enforce AI fail-closed, trimmed appends, safe filenames, and HTML CSP/audio allowlist', async () => {
    const lr = require(resolve(root, 'lesson_revision_service.js'));
    const prevLocked = window.__alloAiSecretsLocked;
    window.__alloAiSecretsLocked = true;
    try {
      const blocked = await lr.prepare(
        [{ id: 'r1', type: 'simplified', title: 'T', data: 'Hello world.' }],
        ['r1'],
        'Make shorter',
        { callGemini: async () => '{}' },
      );
      expect(blocked.ok).toBe(false);
    } finally {
      window.__alloAiSecretsLocked = prevLocked;
    }

    const lrSrc = read('lesson_revision_service.js');
    expect(lrSrc).toContain('_lrFenceJson');
    expect(lrSrc).toContain("value.expectedAnswer.trim()");

    loadAlloModule('read_aloud_artifact_contract_module.js');
    loadAlloModule('persona_session_artifact_module.js');
    const psa = window.AlloModules.PersonaSessionArtifact;
    const built = await psa.buildPrivateSessionArtifact({
      sessionId: 'sess-r17',
      resourceId: 'res-r17',
      language: 'English',
      personaState: {
        mode: 'single',
        selectedCharacter: { id: 'ada', name: 'Ada' },
        chatHistory: [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello' }],
      },
    });
    const htmlOut = psa.buildOwnerHtmlDocument(built.artifact);
    expect(htmlOut.html).toContain('Content-Security-Policy');
    expect(htmlOut.html).toContain("default-src 'none'");
    const dl = psa.downloadOwnerCopy(built.artifact, {
      ownerInitiated: true,
      filename: '...evil..name...',
      document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
      URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
      Blob: class FakeBlob { constructor(parts) { this.size = String(parts[0]).length; } },
    });
    expect(dl.filename.startsWith('.')).toBe(false);
    expect(dl.filename).not.toContain('..');
  });

  it('ConceptMapHandlers, AnchorCharts, MathHelpers, and AdaptiveController contain Wave 57 hardening guards', () => {
    const cmap = read('concept_map_handlers_source.jsx');
    expect(cmap).toContain('_hasUnsafeMarkdownLink');
    expect(cmap).toContain('_batchRosterInFlight');
    expect(cmap).toContain('_cmapIsSafeRasterDataUrl');

    const ac = read('anchor_charts_source.jsx');
    expect(ac).toContain('function _ac_isSafeIconUrl(');
    expect(ac).toContain('isInteractiveStudent || props.studyMasked');
    expect(ac).toContain('{ requireAi: false }');

    const mh = read('math_helpers_source.jsx');
    expect(mh).toContain('_mathOutcomeInFlight');
    expect(mh).toContain("'_verification'");

    const adapt = read('adaptive_controller_source.jsx');
    expect(adapt).toContain('/\\b(?:dictation|mic|microphone)\\b/i');
    expect(adapt).toContain("aria-disabled");
    expect(adapt).toContain("window.addEventListener('blur'");
  });
});

describe('Round 17 — Wave 58: Offline Packets Pages, Zip & Builders Hardening', () => {
  it('packets_zip.js rejects EOCD comment mismatch, STORE size mismatch, Zip-Slip paths, and >65535B filenames', () => {
    const Z = require(resolve(root, 'packets_zip.js'));

    const w = Z.create();
    expect(() => w.add('a'.repeat(70000), new Uint8Array([1]))).toThrow();
    w.add('ok.txt', new Uint8Array([65, 66, 67]));
    const goodBytes = Buffer.concat(w.finish());
    expect(Z.readZip(goodBytes).map((e) => e.name)).toEqual(['ok.txt']);

    // Trailing bytes after EOCD must be rejected (empty list)
    const trailed = new Uint8Array(goodBytes.length + 4);
    trailed.set(goodBytes);
    expect(Z.readZip(trailed)).toEqual([]);

    // Untrusted raw archive containing Zip-Slip entry name in central directory must be filtered by readZip
    const rawZip = Buffer.from(goodBytes);
    const cdSig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    const cdIdx = rawZip.indexOf(cdSig);
    expect(cdIdx).toBeGreaterThan(-1);
    const nameOffset = cdIdx + 46;
    Buffer.from('../x.t').copy(rawZip, nameOffset);
    expect(Z.readZip(rawZip)).toEqual([]);
  });

  it('packets_my_words.js and word_sounds_packet_builder.js svgRefusal both reject entity-smuggled <style>, srcdoc, and image-set', () => {
    const myWords = require(resolve(root, 'packets_my_words.js'));
    const builder = require(resolve(root, 'word_sounds_packet_builder.js'));
    const samples = [
      '<svg xmlns="http://www.w3.org/2000/svg"><style title="&#x22;/>">@import url(https://evil.test/x.css);</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect srcdoc="x"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:image-set(url(#a) 1x)"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><svg:script>alert(1)</svg:script></svg>',
    ];
    for (const s of samples) {
      expect(myWords.svgRefusal(s)).not.toBe('');
      expect(builder.svgRefusal(s)).toBe(myWords.svgRefusal(s));
    }
  });

  it('Wave 58 offline packet pages enforce safe DOM cloning, setText IDs, prototype revivers, and zero https:// leaks', () => {
    expect(read('packets-pictures.js')).toContain("setText('offline-said'");
    expect(read('packets-pictures.js')).not.toContain('setText(saidLine');

    const makeSrc = read('packets-make.js');
    expect(makeSrc).toContain('function fetchBounded(');
    expect(makeSrc).toContain('child.cloneNode(true)');
    expect(makeSrc).not.toContain('node.innerHTML = $(source).innerHTML');

    const raSrc = read('packets-read-along.js');
    expect(raSrc).toContain('AbortController');
    expect(raSrc).not.toContain('https://');
    expect(read('packets_my_words.js')).not.toContain('https://');
    expect(read('packets_handoff.js')).not.toContain('https://');
    expect(read('packets_zip.js')).not.toContain('https://');
  });
});

describe('Round 17 — Wave 59: Arcade Modes, Live STEM Lab, Concept Quest & Escape Room', () => {
  it('Model UN fixes Rules of Hooks order, print/transcript CSP, image validation, unreadCount, and TTS gating', () => {
    const mun = read('arcade_mode_modelun.js');
    expect(mun).toContain('function _isSafeMunImageUrl(');
    expect(mun).toContain("default-src \\'none\\'; style-src \\'unsafe-inline\\'; base-uri \\'none\\'; form-action \\'none\\'");
    expect(mun).toContain('m.to === myUid && (!m.readBy || m.readBy.indexOf(myUid) === -1)');
    expect(mun).toContain("_aiUsable('tts', ctx.callTTS)");
    expect(mun).toContain('ttsReqRef');
    expect(mun).toContain('crisisTimersRef');
    expect(mun).toContain('bcTimersRef');
    expect(mun).toContain('useSessionStore');

    // DelegateNotes & AICoachButton must invoke hooks BEFORE early `if (!myCountry) return null;`
    const dnIdx = mun.indexOf('function DelegateNotes(props)');
    const dnSlice = mun.slice(dnIdx, dnIdx + 3400);
    expect(dnSlice.indexOf('useEffect(')).toBeGreaterThan(-1);
    expect(dnSlice.indexOf('useEffect(')).toBeLessThan(dnSlice.indexOf('if (!myCountry) return null;'));

    const coachIdx = mun.indexOf('function AICoachButton(props)');
    const coachSlice = mun.slice(coachIdx, coachIdx + 1200);
    expect(coachSlice.indexOf('useState(false)')).toBeGreaterThan(-1);
    expect(coachSlice.indexOf('useState(false)')).toBeLessThan(coachSlice.indexOf('if (!myCountry) return null;'));
  });

  it('Boss Encounter, Concept Atlas, and Realm Builder validate card/scene images, sanitize SVG clipPath IDs, and harden voice/map state', () => {
    const boss = read('arcade_mode_boss_encounter.js');
    const atlas = read('arcade_mode_concept_atlas.js');
    const realm = read('arcade_mode_realm_builder.js');
    for (const src of [boss, atlas, realm]) {
      expect(src).toContain('function _isSafeClassImage(');
      expect(src).toContain('voiceMountedRef');
      expect(src).toContain('voiceTokenRef');
      expect(src).toContain('window.__alloQrStudentMode');
    }
    expect(atlas).toContain('function _safeSvgId(');
    expect(atlas).toContain("id: cpId");
    expect(realm).toContain('useRef(Object.create(null))');
    expect(realm).toContain("referrerPolicy: 'no-referrer'");
  });

  it('Live stem_lab Epidemic & Anatomy, Concept Quest Solo, and Connected Escape Room enforce Wave 59 hardening', async () => {
    const epi = read('stem_lab/stem_tool_epidemic.js');
    expect(epi).toContain('_epiAiUsable');
    expect(epi).toContain('_epiCall');
    expect(epi).toContain('_epiExtractText');

    const anat = read('stem_lab/stem_tool_anatomy.js');
    expect(anat).toContain('50 * 1024 * 1024');
    expect(anat).toContain('__alloAnatomyModelRevokeBound');

    const gm = read('concept_quest_solo_gm_source.jsx');
    for (const field of ['correctValue', 'acceptableAlternatives', 'orderingPrinciple', 'correctAnswer', 'correctEvidence']) {
      expect(gm).toContain(field);
    }

    const solo = read('concept_quest_solo_source.jsx');
    expect(solo).toContain('try { ownKey = saves.keyFor(context); } catch (_) { return; }');

    const cerCollab = read('connected_escape_room_collaboration.jsx');
    expect(cerCollab).toContain('loadedKeyRef');

    const cerEngine = await import('../connected_escape_room_engine.js');
    const prevWin = globalThis.window;
    try {
      globalThis.window = { __alloQrStudentMode: true };
      await expect(cerEngine.generateRoom(async () => '{}', 'A'.repeat(60))).rejects.toThrow(/AI provider is not available/);
    } finally {
      if (prevWin === undefined) delete globalThis.window;
      else globalThis.window = prevWin;
    }
  });
});

describe('Round 17 — 4-Way SHA-256 Mirror Parity', () => {
  it('keeps all 25 Round 17 mirrored deliverables byte-identical across root and 3 desktop mirrors', () => {
    for (const rel of ROUND17_MIRRORED_DELIVERABLES) {
      const rootHash = sha256(rel);
      for (const dir of MIRROR_ROOTS) {
        expect(sha256(`${dir}/${rel}`), `${dir}/${rel}`).toBe(rootHash);
      }
    }
  });
});
